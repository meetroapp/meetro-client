import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  bootstrapExactSavedQuote,
  buildSavedQuoteRoute,
  parseSavedQuoteRoute,
  replaceSavedQuoteRoute,
  resolveOwnedSavedQuotesForJob,
  validateSavedQuoteRouteDocument,
} from "../src/utils/savedQuoteRoute.js";

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const DRAFT_ID = "ccda1240-b24e-4f10-b06f-3908c6641773";
const OTHER_JOB_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_DRAFT_ID = "22222222-2222-4222-8222-222222222222";

function savedQuote(overrides = {}) {
  return {
    id: DRAFT_ID,
    documentType: "QUOTE",
    status: "WORKING_DRAFT",
    version: 1,
    jobId: JOB_ID,
    documentNumber: "Q-0000001",
    content: {
      customerName: "Antony Guzman",
      projectTitle: "Inspect damaged cabinet door and trim",
      customerPricingMode: "TOTAL_ONLY",
      materialsPresentation: "INCLUDED_IN_TOTAL",
      totalOverride: "680",
      depositMode: "PERCENT",
      depositPercent: "75",
    },
    ...overrides,
  };
}

test("strict route parser distinguishes Job context, exact saved Quote, and invalid identities", () => {
  assert.deepEqual(
    parseSavedQuoteRoute(`#quoteBuilder?jobId=${JOB_ID}`),
    {
      page: "quoteBuilder",
      jobId: JOB_ID,
      draftId: "",
      valid: true,
      invalidJobId: false,
      invalidDraftId: false,
      intent: "JOB_CONTEXT",
    }
  );
  const exact = parseSavedQuoteRoute(
    `#quoteBuilder?jobId=${JOB_ID}&draftId=${DRAFT_ID}`
  );
  assert.equal(exact.jobId, JOB_ID);
  assert.equal(exact.draftId, DRAFT_ID);
  assert.equal(exact.intent, "EXACT_SAVED_QUOTE");
  assert.equal(parseSavedQuoteRoute(`#quoteBuilder?draftId=${DRAFT_ID}`).valid, true);
  assert.equal(parseSavedQuoteRoute("#quoteBuilder?draftId=not-a-uuid").valid, false);
  assert.equal(parseSavedQuoteRoute("#quoteBuilder?jobId=23").valid, false);
});

test("route builder persists only canonical resource identities", () => {
  assert.equal(
    buildSavedQuoteRoute({ jobId: JOB_ID, draftId: DRAFT_ID }),
    `quoteBuilder?jobId=${JOB_ID}&draftId=${DRAFT_ID}`
  );
  assert.equal(
    buildSavedQuoteRoute({ draftId: DRAFT_ID }),
    `quoteBuilder?draftId=${DRAFT_ID}`
  );
  assert.equal(buildSavedQuoteRoute({ jobId: "Antony Guzman" }), "");
});

test("saved Quote navigation replaces the browser route without a business write", () => {
  const calls = [];
  const browser = {
    location: { pathname: "/login", search: "" },
    history: {
      state: { shell: "business" },
      replaceState: (...args) => calls.push(args),
    },
  };
  assert.equal(replaceSavedQuoteRoute({ jobId: JOB_ID, draftId: DRAFT_ID }, browser), true);
  assert.deepEqual(calls, [[
    { shell: "business" },
    "",
    `/login#quoteBuilder?jobId=${JOB_ID}&draftId=${DRAFT_ID}`,
  ]]);
});

test("exact saved Quote bootstrap performs one authenticated read and restores persisted content", async () => {
  const calls = [];
  const route = parseSavedQuoteRoute(
    `#quoteBuilder?jobId=${JOB_ID}&draftId=${DRAFT_ID}`
  );
  const result = await bootstrapExactSavedQuote({
    route,
    getDocument: async (draftId) => {
      calls.push({ method: "GET", draftId });
      return savedQuote();
    },
  });
  assert.equal(result.status, "ready");
  assert.equal(result.documentId, DRAFT_ID);
  assert.equal(result.jobId, JOB_ID);
  assert.deepEqual(calls, [{ method: "GET", draftId: DRAFT_ID }]);
  assert.equal(result.document.content.customerName, "Antony Guzman");
  assert.equal(result.document.content.projectTitle, "Inspect damaged cabinet door and trim");
  assert.equal(result.document.content.totalOverride, "680");
  assert.equal(result.document.content.customerPricingMode, "TOTAL_ONLY");
  assert.equal(result.document.content.materialsPresentation, "INCLUDED_IN_TOTAL");
  assert.equal(result.document.content.depositPercent, "75");
});

test("direct draft-only deep link safely derives its actual Job from the owned document", async () => {
  const result = await bootstrapExactSavedQuote({
    route: parseSavedQuoteRoute(`#quoteBuilder?draftId=${DRAFT_ID}`),
    getDocument: async () => savedQuote(),
  });
  assert.equal(result.status, "ready");
  assert.equal(result.jobId, JOB_ID);
});

test("Job/draft mismatch fails closed without returning the document or customer", async () => {
  const result = await bootstrapExactSavedQuote({
    route: parseSavedQuoteRoute(
      `#quoteBuilder?jobId=${OTHER_JOB_ID}&draftId=${DRAFT_ID}`
    ),
    getDocument: async () => savedQuote(),
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "JOB_DRAFT_MISMATCH");
  assert.equal(Object.hasOwn(result, "document"), false);
  assert.doesNotMatch(JSON.stringify(result), /Antony|cabinet|680/);
});

test("missing or unowned document read fails closed with no existence disclosure", async () => {
  for (const status of [404, 403]) {
    const result = await bootstrapExactSavedQuote({
      route: parseSavedQuoteRoute(`#quoteBuilder?draftId=${DRAFT_ID}`),
      getDocument: async () => {
        const error = new Error("private server detail");
        error.status = status;
        throw error;
      },
    });
    assert.deepEqual(result, {
      status: "unavailable",
      reason: "SAVED_QUOTE_UNAVAILABLE",
    });
  }
});

test("non-Quote, deleted/non-working, and wrong draft identity fail closed", () => {
  const route = { jobId: JOB_ID, draftId: DRAFT_ID };
  for (const document of [
    savedQuote({ documentType: "INVOICE" }),
    savedQuote({ status: "DELETED" }),
    savedQuote({ id: OTHER_DRAFT_ID }),
  ]) {
    const result = validateSavedQuoteRouteDocument(document, route);
    assert.equal(result.status, "unavailable");
    assert.equal(Object.hasOwn(result, "document"), false);
  }
});

test("one owned Job Quote is protected while none continues and multiples fail safe", () => {
  const exact = resolveOwnedSavedQuotesForJob([savedQuote()], JOB_ID);
  assert.equal(exact.status, "exact");
  assert.deepEqual(exact.resume, { jobId: JOB_ID, documentId: DRAFT_ID });
  assert.equal(resolveOwnedSavedQuotesForJob([], JOB_ID).status, "none");
  assert.equal(
    resolveOwnedSavedQuotesForJob([
      savedQuote(),
      savedQuote({ id: OTHER_DRAFT_ID }),
    ], JOB_ID).status,
    "ambiguous"
  );
  assert.equal(
    resolveOwnedSavedQuotesForJob([savedQuote({ jobId: OTHER_JOB_ID })], JOB_ID).status,
    "none"
  );
});

test("exact saved-document bootstrap has precedence over rich Job/Evaluation prefill", () => {
  const source = readFileSync(
    new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
    "utf8"
  );
  const exactEffect = source.slice(
    source.indexOf("void bootstrapExactSavedQuote"),
    source.indexOf("useEffect(() => {", source.indexOf("void bootstrapExactSavedQuote") + 1)
  );
  assert.match(exactEffect, /getBusinessDocumentDraft/);
  assert.doesNotMatch(exactEffect, /buildJobLinkedQuotePrefill|setRecommendedSolution|fetchJobLinkedQuoteContext/);
  const jobEffect = source.slice(
    source.indexOf("fetchJobLinkedQuoteContext({ jobId: routeCanonicalJobId"),
    source.indexOf("function openProtectedJobLinkedQuote")
  );
  assert.match(jobEffect, /routeSavedDocumentId/);
  assert.match(jobEffect, /resolveOwnedSavedQuotesForJob/);
});

test("saved open, protected recovery, Saved Files, and local recovery persist durable route identity", () => {
  const builder = readFileSync(
    new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
    "utf8"
  );
  const workspace = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
    "utf8"
  );
  assert.match(
    builder,
    /replaceSavedQuoteRoute\(\{[\s\S]*jobId: resume\.jobId,[\s\S]*draftId: resume\.documentId/
  );
  assert.match(builder, /onDurableDocumentOpened=\{persistOpenedQuoteRoute\}/);
  assert.match(workspace, /onDurableDocumentOpened\?\.\(document\)/);
  assert.match(workspace, /onOpen=\{\(draftId\) => void openSavedDocument\(draftId\)\}/);
  assert.ok((workspace.match(/onDurableDocumentOpened\?\.\(document\)/g) || []).length >= 3);
});

test("opening another saved Quote or starting new replaces the stale route document identity", () => {
  const calls = [];
  const browser = {
    location: { pathname: "/login", search: "" },
    history: { state: null, replaceState: (...args) => calls.push(args[2]) },
  };
  replaceSavedQuoteRoute({ jobId: JOB_ID, draftId: DRAFT_ID }, browser);
  replaceSavedQuoteRoute({ jobId: OTHER_JOB_ID, draftId: OTHER_DRAFT_ID }, browser);
  assert.equal(calls.at(-1), `/login#quoteBuilder?jobId=${OTHER_JOB_ID}&draftId=${OTHER_DRAFT_ID}`);
  assert.doesNotMatch(calls.at(-1), new RegExp(DRAFT_ID));
});

test("hard-refresh restoration remains read-only until the user explicitly chooses a command", () => {
  const builder = readFileSync(
    new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
    "utf8"
  );
  const bootstrap = builder.slice(
    builder.indexOf("void bootstrapExactSavedQuote"),
    builder.indexOf("useEffect(() => {", builder.indexOf("void bootstrapExactSavedQuote") + 1)
  );
  assert.doesNotMatch(
    bootstrap,
    /createBusinessDocumentDraft|updateBusinessDocumentDraft|issueAndSendWorkingQuote|deliver|bridge|POST|PATCH|DELETE/
  );
  assert.match(builder, /initialSavedDocument=\{savedRouteBootstrap\.document\}/);
  assert.match(builder, /initialSavedDocumentId=\{/);
});
