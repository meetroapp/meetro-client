import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildNewBusinessDocumentDraftPayload, restoreBusinessDocumentDraft } from "../src/utils/businessDocumentPersistence.js";
import { normalizeBusinessDocumentTab } from "../src/utils/businessDocumentWorkspace.js";
import { parseInvoiceBuilderRoute } from "../src/utils/completedJobInvoiceHandoff.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const source = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const deposit = read("src/components/DepositRequestWorkspace.jsx");
const builder = read("src/pages/QuoteBuilder.jsx");
const jobId = "11111111-1111-4111-8111-111111111111";
const invoiceId = "22222222-2222-4222-8222-222222222222";
const party = Object.freeze({ businessContactId: "33333333-3333-4333-8333-333333333333", customerRelationshipId: "44444444-4444-4444-8444-444444444444" });
const bob = Object.freeze({ customerName: "Bob Hamel", customerEmail: "bob@example.test", customerPhone: "555-0100", customerAddress: "Customer location", customerLocation: "Customer location", projectTitle: "Estimate visit", totalOverride: "1480", paymentTerms: "75% deposit", canonicalStatus: "APPROVED", confirmedTotal: "1480", quoteNumber: "Q-000019" });

function block(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, startMarker);
  return source.slice(start, end);
}
const switchCode = block("function initializeWorkingInvoice()", "function applyManualDraft(");
const depositCode = block("function openDepositRequest()", "  return (\n    <>\n");

// Execute the production handlers with state setters, without browser storage
// or network grants. Rendering/physical geometry is covered separately.
function harness({ canonicalJobId = null, savedInvoice = null, preparation = null } = {}) {
  const state = {
    activeDocument: "quote", invoice: {}, invoiceBaseline: {},
    invoiceVisitedRef: { current: false },
    savedDocuments: { quote: null, invoice: savedInvoice },
    documentJobIds: { quote: canonicalJobId, invoice: canonicalJobId },
    customerParties: { quote: party, invoice: null },
    linkedCustomerContacts: { quote: { id: party.businessContactId, displayName: "Bob Hamel" }, invoice: null },
    hydratedSavedQuotePresentation: bob, invoicePreparation: preparation,
    quote: bob, job: { id: canonicalJobId, relationshipId: 345, conversationId: 678 },
    depositRequestContext: null, depositRequestOpen: false,
    nearNewestRef: { current: false }, turns: [{ text: "Quote conversation" }],
  };
  function run(action) {
    const set = (field) => (value) => { state[field] = typeof value === "function" ? value(state[field]) : value; };
    const scope = {
      ...state, normalizeBusinessDocumentTab, buildNewBusinessDocumentDraftPayload,
      todayLocalIsoDate: () => "2026-09-07", emptyCustomerControl: () => ({}),
      restoreTentativeManualInvoice: () => {},
      setInvoice: set("invoice"), setInvoiceBaseline: set("invoiceBaseline"),
      setDocumentJobIds: set("documentJobIds"), setCustomerParties: set("customerParties"),
      setLinkedCustomerContacts: set("linkedCustomerContacts"), setActiveDocument: set("activeDocument"),
      setDepositRequestOpen: set("depositRequestOpen"), setDepositRequestContext: set("depositRequestContext"),
      setManualState: set("manualState"), setComposerTrayOpen: set("composerTrayOpen"),
      setCustomerControl: set("customerControl"), setNotice: set("notice"), setMobilePane: set("mobilePane"),
    };
    const handlers = new Function(...Object.keys(scope), `${switchCode}\n${depositCode}\nreturn { switchDocument, openDepositRequest };`)(...Object.values(scope));
    if (action === "deposit") handlers.openDepositRequest();
    else handlers.switchDocument(action);
  }
  return { state, run };
}

test("Deposit Invoice tab calls the shared switch instead of emitting a malformed Job-only route", () => {
  assert.match(deposit, /onClick=\{\(\) => onDocumentChange\("invoice"\)\}/);
  assert.match(deposit, /onClick=\{\(\) => onDocumentChange\("quote"\)\}/);
  assert.doesNotMatch(deposit, /invoiceBuilder\?jobId=|quoteBuilder\?jobId=/);
  assert.equal(parseInvoiceBuilderRoute("invoiceBuilder?jobId=").valid, false);
});

for (const canonicalJobId of [null, jobId]) {
  test(`Quote → Deposit → Invoice uses working-document authority with Job ${canonicalJobId ? "context" : "intentionally absent"}`, () => {
    const { state, run } = harness({ canonicalJobId });
    run("deposit");
    assert.equal(state.depositRequestOpen, true);
    assert.equal(state.depositRequestContext.quote.customerName, "Bob Hamel");
    assert.equal(state.depositRequestContext.job.id, canonicalJobId);
    assert.equal(state.depositRequestContext.job.relationshipId, 345);
    assert.equal(state.depositRequestContext.job.conversationId, 678);
    run("invoice");
    assert.equal(state.depositRequestOpen, false);
    assert.equal(state.activeDocument, "invoice");
    assert.equal(state.documentJobIds.invoice, canonicalJobId);
    assert.deepEqual(state.customerParties.invoice, party);
    assert.equal(state.invoice.customerName, "Bob Hamel");
    assert.equal(state.invoice.customerEmail, bob.customerEmail);
    assert.equal(state.invoice.customerPhone, bob.customerPhone);
    assert.equal(state.invoice.serviceAddress, bob.customerLocation);
    assert.equal(state.invoice.projectTitle, bob.projectTitle);
    assert.equal(state.invoice.totalOverride, "");
    assert.equal(state.invoice.paymentTerms, "");
    assert.equal(state.invoice.quoteReference, "");
    assert.deepEqual(state.invoice.lineItems, []);
    assert.deepEqual(state.turns, [{ text: "Quote conversation" }]);
    assert.equal(state.invoicePreparation, null);
  });
}

test("direct Quote → Invoice seeds the latest selected customer without commercial/payment carryover", () => {
  const { state, run } = harness();
  state.hydratedSavedQuotePresentation = { ...bob, customerName: "Customer chosen after mount" };
  run("invoice");
  assert.equal(state.invoice.customerName, "Customer chosen after mount");
  assert.deepEqual(state.invoiceBaseline, state.invoice);
  assert.equal(state.invoice.totalOverride, "");
  assert.equal(state.linkedCustomerContacts.invoice.id, party.businessContactId);
});

test("Invoice → Quote → Deposit → Invoice preserves unsaved Invoice and stable Deposit identity", () => {
  const { state, run } = harness();
  run("invoice");
  state.invoice = { ...state.invoice, notes: "Unsaved Invoice note", totalOverride: "275" };
  const workingInvoice = state.invoice;
  run("quote");
  run("deposit");
  const depositContext = state.depositRequestContext;
  run("invoice");
  assert.equal(state.invoice, workingInvoice);
  run("deposit");
  assert.equal(state.depositRequestContext, depositContext);
  assert.equal(state.invoice.notes, "Unsaved Invoice note");
});

test("saved Invoice or governed preparation cannot be overwritten by generic initialization", () => {
  for (const options of [{ savedInvoice: { id: invoiceId } }, { preparation: { jobId, completionVersion: 1 } }]) {
    const { state, run } = harness(options);
    state.invoice = { customerName: "Exact existing customer", notes: "Existing Invoice" };
    const invoice = state.invoice;
    run("invoice");
    assert.equal(state.invoice, invoice);
  }
});

test("shared switching never reads readiness, creates a route, or invokes a financial/document mutation", () => {
  assert.doesNotMatch(switchCode + depositCode, /setPage\(|localStorage|fetchProfessional|createCanonicalInvoice|saveDocument\(|createBusinessDocumentDraft|deliverBusinessDocumentDraft|issueCanonicalInvoice|recordCanonicalPayment|closeCanonicalJob/);
  assert.doesNotMatch(switchCode + depositCode, /Invoice review unavailable|completed Job/);
});

test("both workspace instances remain mounted and only visibility changes during tab switching", () => {
  assert.match(source, /hidden=\{depositRequestOpen\} style=\{\{ display: depositRequestOpen \? "none" : "contents" \}\}/);
  assert.match(source, /hidden=\{!depositRequestOpen\} style=\{\{ display: depositRequestOpen \? "contents" : "none" \}\}/);
  assert.match(source, /depositRequestContext \? <div[\s\S]*?<DepositRequestWorkspace/);
  assert.match(source, /onDocumentChange=\{switchDocument\}/);
  assert.match(source, /setPage=\{navigateWorkspace\}/);
  assert.match(source, /navigateWorkspace = useCallback\(\(page\) => workspaceSetPageRef\.current\(page\), \[\]\)/);
});

function savedInvoice() {
  return { id: invoiceId, jobId, documentType: "INVOICE", status: "WORKING_DRAFT", content: { customerName: "Saved customer", notes: "Saved Invoice note" }, workspace: { instructions: [], manualOverrides: {}, privateReminders: [] }, photos: [], customerParty: party };
}

test("exact saved working Invoice hydrates its server-owned identity, content, and customer party", async () => {
  const document = savedInvoice();
  const restored = [];
  const notices = [];
  const scope = {
    getBusinessDocumentDraft: async ({ draftId }) => { assert.equal(draftId, invoiceId); return document; },
    setPage: () => assert.fail("No route mutation"),
    applyRestoredDocument: (value) => restored.push(restoreBusinessDocumentDraft(value)),
    onDurableDocumentOpened: undefined, setNotice: (notice) => notices.push(notice),
  };
  const openCode = block("async function openSavedDocument(", "async function ensureCurrentDocumentSaved(");
  const open = new Function(...Object.keys(scope), `${openCode};return openSavedDocument;`)(...Object.values(scope));
  assert.equal(await open(invoiceId, { expectedJobId: jobId, expectedDocumentType: "INVOICE" }), true);
  assert.equal(restored[0].content.notes, document.content.notes);
  assert.deepEqual(restored[0].customerParty, party);
  assert.equal(restored[0].jobId, jobId);
  document.jobId = invoiceId;
  assert.equal(await open(invoiceId, { expectedJobId: jobId, expectedDocumentType: "INVOICE" }), false);
  assert.match(notices.at(-1), /exact saved working Invoice/);
  assert.equal(restored.length, 1);
});

test("initial saved Invoice bootstrap expects INVOICE while Quote remains QUOTE", () => {
  assert.match(source, /expectedDocumentType: initialDocument === "invoice" \? "INVOICE" : "QUOTE"/);
  assert.match(source, /if \(type === "invoice"\) invoiceVisitedRef\.current = true/);
});

test("completed-Job and exact-Invoice guards remain separate from generic tabs", () => {
  assert.match(builder, /if \(!isUnifiedInvoiceEntry \|\| !routeCanonicalJobId \|\| routeSavedDocumentId\)/);
  assert.match(builder, /fetchProfessionalJobInvoice/);
  assert.match(builder, /fetchProfessionalInvoiceWorkspace/);
  assert.match(builder, /fetchEffectiveApprovedInvoiceQuote/);
  assert.equal(parseInvoiceBuilderRoute("invoiceBuilder").intent, "STANDALONE");
  assert.equal(parseInvoiceBuilderRoute(`invoiceBuilder?jobId=${jobId}`).intent, "JOB_PREPARATION");
  assert.equal(parseInvoiceBuilderRoute(`invoiceBuilder?invoiceId=${invoiceId}`).valid, false);
});
