import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCanonicalQuoteLineage,
  getCanonicalQuoteJobContext,
  validateCanonicalQuoteProjection,
  validateCanonicalQuotes,
  validateNormalizedCanonicalQuoteProjection,
} from "../src/utils/canonicalQuoteRead.js";
import {
  CanonicalQuoteReadError,
  getCanonicalQuoteDetail,
  listCanonicalQuotesForJob,
} from "../src/utils/quoteReadApi.js";
import {
  loadCanonicalQuoteDetail,
  loadCanonicalQuotesForRecord,
} from "../src/utils/quoteReadController.js";

const ids = Object.freeze({
  job: "11111111-1111-4111-8111-111111111111",
  root: "22222222-2222-4222-8222-222222222222",
  supplemental: "33333333-3333-4333-8333-333333333333",
  revised: "44444444-4444-4444-8444-444444444444",
  participant: "55555555-5555-4555-8555-555555555555",
  rootLabor: "66666666-6666-4666-8666-666666666666",
  excludedMaterial: "77777777-7777-4777-8777-777777777777",
  supplementalLabor: "88888888-8888-4888-8888-888888888888",
  recommendation: "99999999-9999-4999-8999-999999999999",
  rootMaterial: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  customerMaterial: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  separateProposal: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
});

const createdAt = "2026-08-11T18:00:00.000Z";
const issuedAt = "2026-08-11T18:30:00.000Z";
const decidedAt = "2026-08-11T18:45:00.000Z";

function canonicalRecord(overrides = {}) {
  return {
    source: "CANONICAL_BACKEND_READ",
    readOnly: true,
    lifecycleVerified: true,
    lifecycleContractVersion: 2,
    jobId: ids.job,
    ...overrides,
  };
}

function source(overrides = {}) {
  return {
    type: "RECOMMENDATION",
    version: 1,
    findingId: null,
    recommendationId: ids.recommendation,
    workstreamId: null,
    activityId: null,
    obligationId: null,
    ...overrides,
  };
}

function includedLabor(overrides = {}) {
  return {
    scopeItemId: ids.rootLabor,
    scopeItemRevision: 1,
    sequence: 1,
    classification: "LABOR_SERVICE",
    scopeSemantic: "FUTURE_WORK",
    materialResponsibility: "NOT_APPLICABLE",
    description: "Canonical installation labor",
    quantity: 1,
    unitAmountMinor: 68000,
    lineTotalMinor: 68000,
    includedInTotal: true,
    source: source(),
    createdAt,
    ...overrides,
  };
}

function includedMaterial(overrides = {}) {
  return {
    ...includedLabor(),
    scopeItemId: ids.rootMaterial,
    sequence: 2,
    classification: "MATERIAL",
    scopeSemantic: "MATERIAL_INCLUDED",
    materialResponsibility: "PROFESSIONAL_SUPPLIED",
    description: "Canonical cabinet repair materials",
    unitAmountMinor: 24000,
    lineTotalMinor: 24000,
    ...overrides,
  };
}

function customerSuppliedMaterial(overrides = {}) {
  return {
    ...includedMaterial(),
    scopeItemId: ids.customerMaterial,
    sequence: 3,
    scopeSemantic: "CUSTOMER_SUPPLIED_MATERIAL",
    materialResponsibility: "CUSTOMER_SUPPLIED",
    description: "Canonical customer-supplied hardware",
    unitAmountMinor: 0,
    lineTotalMinor: 0,
    includedInTotal: false,
    ...overrides,
  };
}

function excludedMaterial(overrides = {}) {
  return {
    scopeItemId: ids.excludedMaterial,
    scopeItemRevision: 1,
    sequence: 4,
    classification: "MATERIAL",
    scopeSemantic: "MATERIAL_EXCLUDED",
    materialResponsibility: "PENDING_SELECTION",
    description: "Customer selection remains pending",
    quantity: 1,
    unitAmountMinor: 0,
    lineTotalMinor: 0,
    includedInTotal: false,
    source: source(),
    createdAt,
    ...overrides,
  };
}

function separateProposal(overrides = {}) {
  return {
    ...includedLabor(),
    scopeItemId: ids.separateProposal,
    sequence: 5,
    scopeSemantic: "SEPARATE_PROPOSAL",
    description: "Canonical separate proposal",
    unitAmountMinor: 0,
    lineTotalMinor: 0,
    includedInTotal: false,
    ...overrides,
  };
}

function exclusionSnapshot(item = excludedMaterial()) {
  return {
    scopeItemId: item.scopeItemId,
    sequence: item.sequence,
    classification: item.classification,
    scopeSemantic: item.scopeSemantic,
    materialResponsibility: item.materialResponsibility,
    source: {
      source_type: item.source.type,
      source_version: item.source.version,
      source_workstream_version: null,
      source_finding_id: null,
      source_recommendation_id: item.source.recommendationId,
      source_workstream_id: null,
      source_activity_id: null,
      source_obligation_id: null,
    },
  };
}

function version(overrides = {}) {
  return {
    version: 1,
    status: "DRAFT",
    currency: "USD",
    materialsSubtotalMinor: 24000,
    laborServiceSubtotalMinor: 68000,
    totalMinor: 92000,
    scopeItemCount: 5,
    conditions: [],
    exclusions: [
      exclusionSnapshot(customerSuppliedMaterial()),
      exclusionSnapshot(),
      exclusionSnapshot(separateProposal()),
    ],
    issuedAt: null,
    integrityHash: "a".repeat(64),
    createdAt,
    ...overrides,
  };
}

function rootQuote(overrides = {}) {
  const scopeItems = overrides.scopeItems || [
    includedLabor(),
    includedMaterial(),
    customerSuppliedMaterial(),
    excludedMaterial(),
    separateProposal(),
  ];
  const versions = overrides.versions || [
    version(),
    version({
      version: 2,
      status: "ISSUED",
      issuedAt,
      integrityHash: "b".repeat(64),
      createdAt: issuedAt,
    }),
  ];
  return {
    id: ids.root,
    jobId: ids.job,
    requestId: 41,
    relationshipId: 52,
    issuerParticipantId: ids.participant,
    parentQuoteId: null,
    lineageType: null,
    lineageReasonCategory: null,
    status: "ISSUED",
    issuedAt,
    currency: "USD",
    currentVersion: 2,
    materialsSubtotalMinor: 24000,
    laborServiceSubtotalMinor: 68000,
    totalMinor: 92000,
    scopeItemCount: scopeItems.length,
    conditions: [],
    exclusions: [
      exclusionSnapshot(customerSuppliedMaterial()),
      exclusionSnapshot(),
      exclusionSnapshot(separateProposal()),
    ],
    scopeItems,
    versions,
    createdAt,
    updatedAt: issuedAt,
    decisionState: "APPROVED",
    decisionVersion: 2,
    decidedAt,
    ...overrides,
  };
}

function supplementalQuote(overrides = {}) {
  const scopeItems = overrides.scopeItems || [
    includedLabor({
      scopeItemId: ids.supplementalLabor,
      description: "Supplemental alternative work",
      unitAmountMinor: 35000,
      lineTotalMinor: 35000,
    }),
  ];
  const versions = overrides.versions || [
    version({
      materialsSubtotalMinor: 0,
      laborServiceSubtotalMinor: 35000,
      totalMinor: 35000,
      scopeItemCount: 1,
      exclusions: [],
    }),
  ];
  return {
    id: ids.supplemental,
    jobId: ids.job,
    requestId: 41,
    relationshipId: 52,
    issuerParticipantId: ids.participant,
    parentQuoteId: ids.root,
    lineageType: "SUPPLEMENTAL_QUOTE",
    lineageReasonCategory: "SUPPLEMENTAL_WORK",
    status: "DRAFT",
    issuedAt: null,
    currency: "USD",
    currentVersion: 1,
    materialsSubtotalMinor: 0,
    laborServiceSubtotalMinor: 35000,
    totalMinor: 35000,
    scopeItemCount: scopeItems.length,
    conditions: [],
    exclusions: [],
    scopeItems,
    versions,
    createdAt,
    updatedAt: createdAt,
    decisionState: null,
    decisionVersion: null,
    decidedAt: null,
    ...overrides,
  };
}

function governedCustomerTerms() {
  return {
    schemaVersion: 1,
    paymentTerms: "75% deposit",
    estimatedDuration: "",
    customerNotes: "Labor and standard materials included",
    agreement: {
      exclusions: [],
      additionalWorkTerms: "",
      hiddenConditionsTerms: "",
      diagnosticTerms: "",
      customerResponsibilities: "",
      warrantyTerms: "",
      cancellationTerms: "",
      acceptanceTerms: "",
      preauthorizedAdditionalWorkLimit: "",
    },
  };
}

function installBrowser(responses) {
  const calls = [];
  const prior = {
    fetch: globalThis.fetch,
    localStorage: globalThis.localStorage,
    window: globalThis.window,
  };
  globalThis.localStorage = {
    getItem(key) {
      return key === "token" ? "test-token" : null;
    },
    setItem() {
      throw new Error("canonical Quote read attempted browser-local authority");
    },
    removeItem() {},
  };
  globalThis.window = { dispatchEvent() {}, location: { hash: "" } };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const next = responses.shift();
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      async json() {
        return next.body;
      },
    };
  };
  return {
    calls,
    restore() {
      Object.assign(globalThis, prior);
    },
  };
}

test("only a verified ordinary lifecycle-v2 Job opens canonical Quote reads", async () => {
  assert.deepEqual(getCanonicalQuoteJobContext(canonicalRecord()), {
    authoritySource: "CANONICAL_BACKEND_READ",
    lifecycleContractVersion: 2,
    readOnly: true,
    jobId: ids.job,
  });
  const browser = installBrowser([]);
  try {
    for (const record of [
      canonicalRecord({ source: "browser-local", accepted: true, paid: true }),
      canonicalRecord({ jobId: null, quote: { jobId: ids.job } }),
      canonicalRecord({ jobId: null, emergencyRequestId: 41 }),
    ]) {
      assert.equal(await loadCanonicalQuotesForRecord({ record }), null);
    }
    assert.equal(browser.calls.length, 0);
  } finally {
    browser.restore();
  }
});

test("current governed Quote read shape preserves terms, integrity, and saved-document provenance", () => {
  const customerTermsSnapshot = governedCustomerTerms();
  const base = rootQuote({ decisionState: null, decisionVersion: null, decidedAt: null });
  const quote = {
    ...base,
    customerTermsSnapshot,
    integrityVersion: 2,
    versions: base.versions.map((item) => ({
      ...item,
      customerTermsSnapshot,
      integrityVersion: 2,
    })),
    documentNumber: "Q-0000001",
    sourceBusinessDocument: {
      documentId: "ccda1240-b24e-4f10-b06f-3908c6641773",
      documentVersion: 1,
    },
    customerParty: null,
  };
  const normalized = validateCanonicalQuotes([quote], { jobId: ids.job });
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].integrityVersion, 2);
  assert.equal(normalized[0].customerTermsSnapshot.paymentTerms, "75% deposit");
  assert.equal(normalized[0].documentNumber, "Q-0000001");
  assert.equal(
    normalized[0].sourceBusinessDocument.documentId,
    "ccda1240-b24e-4f10-b06f-3908c6641773"
  );
});

test("canonical status, customer decision, server totals, and exclusions are preserved", () => {
  const quote = validateCanonicalQuoteProjection(rootQuote());
  assert.equal(quote.status, "ISSUED");
  assert.equal(quote.decisionState, "APPROVED");
  assert.equal(quote.totalMinor, 92000);
  assert.equal(quote.materialsSubtotalMinor, 24000);
  assert.equal(quote.laborServiceSubtotalMinor, 68000);
  assert.equal(quote.scopeItems[1].materialResponsibility, "PROFESSIONAL_SUPPLIED");
  assert.equal(quote.scopeItems[2].materialResponsibility, "CUSTOMER_SUPPLIED");
  assert.equal(quote.scopeItems[3].includedInTotal, false);
  assert.equal(quote.scopeItems[3].materialResponsibility, "PENDING_SELECTION");
  assert.equal(quote.scopeItems[4].scopeSemantic, "SEPARATE_PROPOSAL");
  assert.equal(Object.hasOwn(quote, "paid"), false);
  assert.equal(Object.hasOwn(quote, "schedulingAuthorized"), false);

  assert.equal(
    validateCanonicalQuoteProjection({ ...rootQuote(), totalMinor: 127000 }),
    null
  );
  assert.equal(
    validateCanonicalQuoteProjection({ ...rootQuote(), accepted: true, paid: true }),
    null
  );
});

test("normalized parent projections revalidate without weakening the wire boundary", () => {
  const wire = rootQuote();
  const normalized = validateCanonicalQuoteProjection(wire);
  assert.ok(normalized);
  assert.equal(validateCanonicalQuoteProjection(normalized), null);
  assert.deepEqual(
    validateNormalizedCanonicalQuoteProjection(normalized),
    normalized
  );
  assert.deepEqual(normalized.exclusions[0].source, source());
  assert.equal(
    validateCanonicalQuoteProjection({
      ...wire,
      exclusions: normalized.exclusions,
    }),
    null
  );
});

test("malformed Quote identity, semantics, provenance, decisions, and totals fail closed", () => {
  const withoutIdentity = rootQuote();
  delete withoutIdentity.id;
  const malformedSource = rootQuote();
  malformedSource.scopeItems[0].source.recommendationId = "invalid";
  const malformedExclusion = rootQuote();
  malformedExclusion.exclusions[0].source.source_recommendation_id = "invalid";
  const malformedMaterial = rootQuote();
  malformedMaterial.scopeItems[1].materialResponsibility = "UNKNOWN";
  for (const quote of [
    withoutIdentity,
    rootQuote({ id: "invalid" }),
    rootQuote({ currentVersion: 0 }),
    rootQuote({ lineageType: "SUPPLEMENTAL_QUOTE" }),
    malformedSource,
    malformedExclusion,
    malformedMaterial,
    rootQuote({ decisionState: "PAID" }),
    rootQuote({ totalMinor: 127000 }),
  ]) {
    assert.equal(validateCanonicalQuoteProjection(quote), null);
  }
});

test("DRAFT and DECLINED remain exact without mutating Recommendation truth", () => {
  const draft = validateCanonicalQuoteProjection(supplementalQuote());
  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.decisionState, null);
  const declined = validateCanonicalQuoteProjection(
    rootQuote({ decisionState: "DECLINED" })
  );
  assert.equal(declined.decisionState, "DECLINED");
  assert.equal(declined.scopeItems[0].source.recommendationId, ids.recommendation);
  assert.equal(Object.hasOwn(declined, "recommendationStatus"), false);
});

test("parent and supplemental totals remain independent in canonical lineage", () => {
  const quotes = validateCanonicalQuotes([supplementalQuote(), rootQuote()], {
    jobId: ids.job,
  });
  assert.equal(quotes.length, 2);
  const lineage = buildCanonicalQuoteLineage(quotes);
  assert.deepEqual(
    lineage.map(({ quote, depth }) => [quote.id, depth, quote.totalMinor]),
    [
      [ids.root, 0, 92000],
      [ids.supplemental, 1, 35000],
    ]
  );
  assert.equal(lineage[0].quote.totalMinor, 92000);
  assert.equal(
    validateCanonicalQuotes(
      [supplementalQuote({ parentQuoteId: ids.revised }), rootQuote()],
      { jobId: ids.job }
    ),
    null
  );
});

test("Quote APIs call only exact professional list and detail GET routes", async () => {
  const root = rootQuote();
  const child = supplementalQuote();
  const browser = installBrowser([
    { status: 200, body: { success: true, quotes: [child, root] } },
    { status: 200, body: { success: true, quote: root } },
    { status: 200, body: { success: true, quote: child } },
  ]);
  try {
    const quotes = await listCanonicalQuotesForJob({ jobId: ids.job });
    const rootDetail = await loadCanonicalQuoteDetail({
      record: canonicalRecord(),
      quote: quotes.find((quote) => quote.id === ids.root),
    });
    const childDetail = await loadCanonicalQuoteDetail({
      record: canonicalRecord(),
      quote: quotes.find((quote) => quote.id === ids.supplemental),
    });
    assert.equal(rootDetail.totalMinor, 92000);
    assert.equal(rootDetail.scopeItems.length, 5);
    assert.equal(rootDetail.exclusions.length, 3);
    assert.equal(rootDetail.decisionState, "APPROVED");
    assert.equal(childDetail.totalMinor, 35000);
    assert.deepEqual(
      browser.calls.map((call) => [call.options.method, call.url]),
      [
        ["GET", `https://athletic-rebirth-staging.up.railway.app/jobs/${ids.job}/quotes`],
        ["GET", `https://athletic-rebirth-staging.up.railway.app/quotes/${ids.root}`],
        ["GET", `https://athletic-rebirth-staging.up.railway.app/quotes/${ids.supplemental}`],
      ]
    );
    assert.ok(browser.calls.every((call) => call.options.body === undefined));
    assert.ok(browser.calls.every((call) => !call.url.endsWith("/customer")));
  } finally {
    browser.restore();
  }
});

test("no Quote is a valid canonical list result", async () => {
  const browser = installBrowser([
    { status: 200, body: { success: true, quotes: [] } },
  ]);
  try {
    assert.deepEqual(
      await loadCanonicalQuotesForRecord({ record: canonicalRecord() }),
      []
    );
  } finally {
    browser.restore();
  }
});

test("401, 403, 404, malformed detail, and child failure all fail closed", async () => {
  for (const status of [401, 403, 404]) {
    const browser = installBrowser([
      {
        status,
        body: {
          success: false,
          code: status === 403 ? "QUOTE_AUTHORITY_REQUIRED" : "QUOTE_UNAVAILABLE",
          message: "Canonical Quote read unavailable.",
        },
      },
    ]);
    try {
      await assert.rejects(
        listCanonicalQuotesForJob({ jobId: ids.job }),
        (error) => error instanceof CanonicalQuoteReadError && error.status === status
      );
    } finally {
      browser.restore();
    }
  }

  const browser = installBrowser([
    {
      status: 503,
      body: { success: false, code: "QUOTE_READ_FAILED", message: "Unavailable." },
    },
    { status: 200, body: { success: true, quote: rootQuote() } },
  ]);
  try {
    await assert.rejects(
      getCanonicalQuoteDetail({ jobId: ids.job, quoteId: ids.supplemental }),
      (error) => error.status === 503
    );
    assert.equal(
      (await getCanonicalQuoteDetail({ jobId: ids.job, quoteId: ids.root }))
        .totalMinor,
      92000
    );
  } finally {
    browser.restore();
  }
});

test("bounded Quote panels expose commercial reads and no command authority", () => {
  const files = [
    "../src/components/CanonicalQuotesPanel.jsx",
    "../src/components/CanonicalQuoteCard.jsx",
    "../src/utils/quoteReadApi.js",
    "../src/utils/quoteReadController.js",
  ];
  const sourceText = files
    .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
    .join("\n");
  const validator = readFileSync(
    new URL("../src/utils/canonicalQuoteRead.js", import.meta.url),
    "utf8"
  );
  const dashboard = readFileSync(
    new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
    "utf8"
  );
  const presentationCopy = readFileSync(
    new URL("../src/utils/workCenterWorkspaceLanguage.js", import.meta.url),
    "utf8"
  );

  assert.match(sourceText, /No quotes issued yet/);
  assert.match(sourceText, /<details/);
  assert.match(sourceText, /detail\.totalMinor/);
  assert.match(sourceText, /detail\.decisionState/);
  assert.match(presentationCopy, /quoteDetails: "View quote details"/);
  assert.match(presentationCopy, /separateProposal: "Additional proposal - not included in this total"/);
  assert.doesNotMatch(
    sourceText,
    /Quote status and customer decision remain separate|Payment and scheduling are handled separately|Quote version|Parent Quote|Lineage:|Source:/
  );
  assert.doesNotMatch(sourceText, /Canonical version|Server total|Server line total/);
  assert.match(dashboard, /CanonicalQuotesPanel/);
  assert.doesNotMatch(validator, /\.reduce\(|materialsSubtotalMinor\s*\+\s*laborServiceSubtotalMinor/);
  assert.doesNotMatch(
    sourceText,
    /localStorage|sessionStorage|method:\s*"(?:POST|PATCH|PUT|DELETE)"|Idempotency-Key|\/customer[`"']|createDraftQuote|addScopeItem|removeScopeItem|issueQuote|approveIssuedQuote|declineIssuedQuote|createDerivedDraftQuote|markPayment|collectDeposit|paymentReceived|depositRequired|scheduleWork|createInvoice|generatePdf|completeJob|Job Update|Change Order|<button/
  );
  assert.doesNotMatch(sourceText, /athletic-rebirth-production/);
});
