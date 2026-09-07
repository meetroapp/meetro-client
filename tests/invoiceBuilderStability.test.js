import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  findBusinessContactDuplicateCandidates,
} from "../src/utils/businessDocumentCustomerParty.js";
import { validateInvoiceWorkspace } from "../src/utils/invoicePaymentApi.js";
import { resolveCompletedJobInvoiceHandoff } from "../src/utils/completedJobInvoiceHandoff.js";
import { t } from "../src/utils/language.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const quoteBuilder = read("src/pages/QuoteBuilder.jsx");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");

const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";
const INVOICE_ID = "93792224-2cfd-44d0-ada7-8efd5e48a5da";

// Execute the actual route effect with controlled canonical reads. These are
// routing/state tests, not assertions about browser layout or physical QA data.
const preparationEffectStart = quoteBuilder.indexOf("  useEffect(() => {", quoteBuilder.indexOf("const requestedCanonicalJobId"));
const preparationEffectEnd = quoteBuilder.indexOf("  useEffect(() => {\n    if (!routeSavedDocumentId", preparationEffectStart);
assert.ok(preparationEffectStart >= 0 && preparationEffectEnd > preparationEffectStart);
const preparationEffect = quoteBuilder.slice(preparationEffectStart, preparationEffectEnd);

function invoiceUnavailable() {
  return Object.assign(new Error("The Invoice is unavailable."), { status: 404, code: "INVOICE_UNAVAILABLE" });
}

function runPreparation({
  invoiceRead = async () => { throw invoiceUnavailable(); },
  workspaceRead = async () => representativeWorkspace(),
  quoteRead = async () => ({ quoteId: "approved-quote", quoteVersion: 2, documentNumber: "Q-000016" }),
  documents = [],
  isInvoice = true,
} = {}) {
  const states = [], routes = [], jobs = [], calls = [];
  const requestRef = { current: null };
  let cleanup;
  const scope = {
    useEffect: (effect) => { cleanup = effect(); },
    isUnifiedInvoiceEntry: isInvoice,
    routeCanonicalJobId: JOB_ID,
    routeSavedDocumentId: "",
    invoicePreparationRequestRef: requestRef,
    setInvoicePreparation: (state) => states.push(state),
    setPageRef: { current: (route) => routes.push(route) },
    setQuickQuoteAttachedJob: (job) => jobs.push(job),
    resolveCompletedJobInvoiceHandoff,
    fetchProfessionalJobInvoice: async (options) => {
      calls.push({ name: "invoice", jobId: options.jobId });
      return invoiceRead(options);
    },
    fetchProfessionalInvoiceWorkspace: async () => {
      calls.push({ name: "workspace" });
      return workspaceRead();
    },
    listBusinessDocumentDrafts: async () => {
      calls.push({ name: "documents" });
      return documents;
    },
    fetchEffectiveApprovedInvoiceQuote: async (options) => {
      calls.push({ name: "quote", jobId: options.jobId, approvedTotalMinor: options.approvedTotalMinor });
      return quoteRead(options);
    },
  };
  const execute = new Function(...Object.keys(scope), preparationEffect);
  const rerun = () => { cleanup?.(); execute(...Object.values(scope)); };
  rerun();
  return {
    states, routes, jobs, calls, rerun,
    dispose: () => cleanup?.(),
    settle: async () => {
      await requestRef.current?.promise.catch(() => {});
      // Allow the effect's rejection handler to publish its fail-closed state.
      await Promise.resolve();
    },
  };
}

for (const status of ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID"]) {
  test(`Job-only entry opens the exact canonical ${status} Invoice without readyJobs membership`, async () => {
    const invoice = Object.freeze({ jobId: JOB_ID, invoiceId: INVOICE_ID, status });
    const run = runPreparation({ invoiceRead: async () => invoice });
    await run.settle();
    assert.equal(run.states.at(-1).invoiceId, INVOICE_ID);
    assert.deepEqual(run.routes, []);
    assert.deepEqual(run.calls, [{ name: "invoice", jobId: JOB_ID }]);
    assert.deepEqual(run.states.map((state) => state.status), ["loading", "existing"]);
    assert.deepEqual(run.jobs, []);
  });
}

test("no Invoice plus canonical completion/readiness enters governed preparation with exact amounts", async () => {
  const document = { id: "saved-draft", documentType: "INVOICE", status: "WORKING_DRAFT", jobId: JOB_ID };
  const run = runPreparation({ documents: [document] });
  await run.settle();
  const state = run.states.at(-1);
  assert.equal(state.status, "ready");
  assert.equal(state.job.jobId, JOB_ID);
  assert.equal(state.job.completionVersion, 1);
  assert.equal(state.job.approvedAmount.totalMinor, 68000);
  assert.equal(state.job.paymentsReceivedMinor, 51000);
  assert.equal(state.job.amountStillDueMinor, 17000);
  assert.equal(state.job.quoteReference, "approved-quote");
  assert.equal(state.resumeDocumentId, document.id);
  assert.deepEqual(run.routes, []);
  assert.deepEqual(run.calls.at(-1), { name: "quote", jobId: JOB_ID, approvedTotalMinor: 68000 });
});

test("a 404 and no canonical completion/readiness remain unavailable", async () => {
  const run = runPreparation({ workspaceRead: async () => ({ invoices: [], readyJobs: [] }) });
  await run.settle();
  assert.equal(run.states.at(-1).status, "unavailable");
  assert.deepEqual(run.routes, []);
  assert.deepEqual(run.jobs, []);
  assert.equal(run.calls.some((call) => call.name === "quote"), false);
});

test("an Invoice created between the exact read and workspace read wins over preparation", async () => {
  const run = runPreparation({ workspaceRead: async () => ({
    ...representativeWorkspace(),
    invoices: [{ jobId: JOB_ID, invoiceId: INVOICE_ID, status: "DRAFT" }],
  }) });
  await run.settle();
  assert.equal(run.states.at(-1).status, "existing");
  assert.equal(run.states.at(-1).invoiceId, INVOICE_ID);
  assert.deepEqual(run.routes, []);
  assert.equal(run.states.some((state) => state.status === "ready"), false);
  assert.equal(run.calls.some((call) => call.name === "quote"), false);
});

for (const [status, code] of [[401, "UNAUTHORIZED"], [404, "ROUTE_NOT_FOUND"], [502, "UNSAFE_PROFESSIONAL_INVOICE_RESPONSE"]]) {
  test(`${code} cannot be interpreted as permission to prepare an Invoice`, async () => {
    const run = runPreparation({ invoiceRead: async () => {
      throw Object.assign(new Error(code), { status, code });
    } });
    await run.settle();
    assert.equal(run.states.at(-1).status, "unavailable");
    assert.equal(run.states.at(-1).error, code);
    assert.deepEqual(run.routes, []);
    assert.deepEqual(run.calls, [{ name: "invoice", jobId: JOB_ID }]);
  });
}

test("a mismatched exact Invoice cannot redirect to another Job or enable preparation", async () => {
  const run = runPreparation({ invoiceRead: async () => ({
    jobId: "11111111-1111-4111-8111-111111111111", invoiceId: INVOICE_ID, status: "DRAFT",
  }) });
  await run.settle();
  assert.equal(run.states.at(-1).status, "unavailable");
  assert.deepEqual(run.routes, []);
});

test("completion readiness still requires the effective approved Quote reference", async () => {
  const run = runPreparation({ quoteRead: async () => {
    throw Object.assign(new Error("Missing Quote"), { code: "INVOICE_QUOTE_REFERENCE_READ_GAP" });
  } });
  await run.settle();
  assert.equal(run.states.at(-1).status, "unavailable");
  assert.match(run.states.at(-1).error, /INVOICE_QUOTE_REFERENCE_READ_GAP/);
  assert.deepEqual(run.routes, []);
});

test("a repeated effect shares the pending exact lookup and opens its result only once", async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  const run = runPreparation({ invoiceRead: () => pending });
  run.rerun();
  resolve({ jobId: JOB_ID, invoiceId: INVOICE_ID, status: "DRAFT" });
  await run.settle();
  assert.deepEqual(run.calls, [{ name: "invoice", jobId: JOB_ID }]);
  assert.equal(run.states.filter((state) => state.status === "existing").length, 1);
  assert.deepEqual(run.routes, []);
});

test("leaving the Job while lookup is pending cannot redirect or hydrate it later", async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  const run = runPreparation({ invoiceRead: () => pending });
  run.dispose();
  resolve({ jobId: JOB_ID, invoiceId: INVOICE_ID, status: "DRAFT" });
  await run.settle();
  assert.deepEqual(run.routes, []);
  assert.deepEqual(run.states.map((state) => state.status), ["loading"]);
});

test("Quote entry never runs the Invoice lookup or preparation effect", async () => {
  const run = runPreparation({ isInvoice: false });
  await run.settle();
  assert.deepEqual(run.calls, []);
  assert.deepEqual(run.states, []);
  assert.deepEqual(run.routes, []);
});

test("verified Job-only entry renders the existing exact-Invoice boundary without a query-only redirect", () => {
  const start = quoteBuilder.indexOf('invoicePreparation.status === "existing"');
  const end = quoteBuilder.indexOf('invoicePreparation.status !== "ready"', start);
  assert.ok(start > 0 && end > start);
  const presentation = quoteBuilder.slice(start, end);
  assert.match(presentation, /<ProfessionalInvoiceWorkspace/);
  assert.match(presentation, /initialInvoiceId=\{invoicePreparation\.invoiceId\}/);
  assert.match(presentation, /expectedJobId=\{routeCanonicalJobId\}/);
  assert.match(presentation, /onBack=\{\(\) => setPage\(`workCenter\?jobId=\$\{encodeURIComponent\(routeCanonicalJobId\)\}`\)\}/);
  assert.doesNotMatch(preparationEffect, /setPageRef\.current\(handoff\.route\)/);
});

function representativeWorkspace() {
  return {
    contractVersion: 1,
    summary: {
      readyToInvoice: 1,
      drafts: 0,
      waitingForPayment: 0,
      paid: 0,
      totalOutstandingMinor: 17000,
      currency: "USD",
    },
    readyJobs: [{
      jobId: JOB_ID,
      requestId: 23,
      relationshipId: 345,
      customerName: "Antony Guzman",
      serviceTitle: "Inspect damaged cabinet door and trim",
      completedAt: "2026-08-29T18:50:15.055Z",
      completionVersion: 1,
      approvedAmount: { currency: "USD", totalMinor: 68000 },
      paymentsReceivedMinor: 51000,
      amountStillDueMinor: 17000,
      paymentTerms: "75% deposit required before scheduling. Remaining balance due upon completion.",
      approvedWork: [{
        description: "Approved cabinet repair",
        quantity: 1,
        unitAmountMinor: 68000,
        lineTotalMinor: 68000,
      }],
    }],
    invoices: [],
    limit: 50,
  };
}

test("completed-Job Invoice preparation has one stable route-scoped request", () => {
  const start = quoteBuilder.indexOf("const requestedCanonicalJobId");
  const end = quoteBuilder.indexOf("useEffect(() => {\n    if (!routeSavedDocumentId", start);
  const preparation = quoteBuilder.slice(start, end);

  assert.match(preparation, /existingRequest\?\.key === requestKey/);
  assert.match(preparation, /invoicePreparationRequestRef\.current = \{ key: requestKey, promise: request \}/);
  assert.match(preparation, /requestKey = `job:\$\{routeCanonicalJobId\}`/);
  assert.match(preparation, /fetchProfessionalInvoiceWorkspace/);
  assert.match(preparation, /listBusinessDocumentDrafts/);
  assert.match(preparation, /\[isUnifiedInvoiceEntry, routeCanonicalJobId, routeSavedDocumentId\]/);
  assert.doesNotMatch(preparation, /routeCanonicalJobId, routeSavedDocumentId, setPage/);
  assert.doesNotMatch(preparation, /createCanonicalInvoice|createReviewedInvoice|createBusinessDocumentDraft/);
});

test("representative server-owned prefill remains exact without creating an Invoice", () => {
  const validated = validateInvoiceWorkspace(representativeWorkspace());
  assert.ok(validated);
  assert.equal(validated.readyJobs.length, 1);
  assert.equal(validated.invoices.length, 0);
  assert.equal(validated.readyJobs[0].customerName, "Antony Guzman");
  assert.equal(validated.readyJobs[0].serviceTitle, "Inspect damaged cabinet door and trim");
  assert.equal(validated.readyJobs[0].approvedAmount.totalMinor, 68000);
  assert.equal(validated.readyJobs[0].paymentsReceivedMinor, 51000);
  assert.equal(validated.readyJobs[0].amountStillDueMinor, 17000);
});

test("Job prefill is applied once per Job and leaves professional-only edits outside its patch", () => {
  const start = workspace.indexOf("const invoicePreparationHydratedRef");
  const end = workspace.indexOf("const [customerControl", start);
  const hydration = workspace.slice(start, end);

  assert.match(hydration, /invoicePreparationHydratedRef\.current === invoicePreparation\.jobId/);
  assert.match(hydration, /invoicePreparationHydratedRef\.current = invoicePreparation\.jobId/);
  assert.match(hydration, /setInvoice\(\(current\) => \(\{[\s\S]*\.\.\.current/);
  assert.doesNotMatch(hydration, /extraWork|customerNotes|dueDate/);
  assert.match(hydration, /paymentTerms: invoicePreparation\.paymentTerms/);
  assert.match(hydration, /existingLookup\?\.key === lookupKey/);
  assert.match(hydration, /savedJobCustomerLookupRef\.current = \{ key: lookupKey, promise: lookup \}/);
});

test("Job-linked saved-customer recognition is bounded, read-only, and suppresses duplicate save prompting", () => {
  const contacts = [{
    id: "11111111-1111-4111-8111-111111111111",
    status: "ACTIVE",
    displayName: "Antony Guzman",
    companyName: null,
    email: "antony@example.test",
    phone: "",
  }];
  assert.equal(
    findBusinessContactDuplicateCandidates(contacts, { customerName: "Antony Guzman" })[0].id,
    contacts[0].id
  );

  const lookupStart = workspace.indexOf("const savedJobCustomerLookupRef");
  const lookupEnd = workspace.indexOf("const [customerControl", lookupStart);
  const lookup = workspace.slice(lookupStart, lookupEnd);
  assert.match(lookup, /listBusinessContacts/);
  assert.match(lookup, /setLinkedCustomerContacts/);
  assert.doesNotMatch(lookup, /createBusinessContact|saveDocument|establishBusinessCustomerRelationship/);
  assert.match(workspace, /!durableContact \? <button[^>]+onClick=\{\(\) => onOpen\("save"\)\}/);
});

test("saved-customer empty states and customer language use the approved plain wording", () => {
  assert.equal(t("businessDocumentCustomerEmptyDirectory", "en"), "No saved customers yet.");
  assert.equal(t("businessDocumentCustomerNoMatches", "en"), "No saved customers match your search.");
  assert.equal(t("businessDocumentCustomerSave", "en"), "Create external customer");
  assert.equal(t("businessDocumentCustomerSaveTitle", "en"), "Create external customer");
  assert.equal(t("businessDocumentCustomerSaveHelp", "en"), "Save this business-owned customer contact for future Quotes, Invoices, and Deposit Requests. No Meetro account is created.");
  assert.equal(t("businessDocumentCustomerPerson", "en"), "Individual");
  assert.equal(t("businessDocumentCustomerOrganization", "en"), "Business");
  assert.equal(t("businessDocumentCustomerSavedContact", "en"), "External customer");
  assert.match(workspace, /control\.contacts\.length && control\.search\.trim\(\)/);
});
