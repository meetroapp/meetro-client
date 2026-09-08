import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { normalizeSourceQuoteNumber, resolveExactSourceQuote, parseQuoteInvoiceCommand, resolveExactQuoteToInvoice, lookupQuoteInvoiceCommand, parseQuoteInvoiceSourceRoute, loadExactInvoiceSource, projectQuoteToInvoiceWorkingDraft, resolveQuoteInvoiceDepositGate } from "../src/utils/quoteToInvoice.js";
import { buildInvoiceConversationProposal } from "../src/utils/invoiceReviewDraft.js";
import { buildBusinessDocumentSavePayload } from "../src/utils/businessDocumentPersistence.js";

const quote = { id: randomUUID(), documentType: "QUOTE", status: "WORKING_DRAFT", documentNumber: "Q-0000049", version: 3, jobId: randomUUID(), customerDisplayName: "Bob Hamel", content: { customerName: "Bob Hamel", customerEmail: "bob@example.test", projectTitle: "Window repair", recommendedSolution: "Repair the windows", totalOverride: "999", notes: "Private Quote note", paymentTerms: "Unapproved terms", invoiceNumber: "INV-STALE", quoteNumber: "Q-TAMPERED" } };
for (const number of ["Q-0000049", "Q0000049", "q0000049", "Quote Q 0000049"]) test(`R3 exact number normalization: ${number}`, () => {
  assert.equal(normalizeSourceQuoteNumber(number), quote.documentNumber);
  assert.equal(resolveExactSourceQuote({ number, documents: [quote] }).state, "EXACT_QUOTE");
  assert.equal(resolveExactQuoteToInvoice({ number, documents: [quote] }).state, "EXACT_QUOTE_TO_INVOICE");
});
for (const text of ["Create an invoice for Bob Hamel, Quote Q-0000049.", "Create invoice for Bob Hamel job quote number Q0000049.", "Prepare an invoice from Quote Q-0000049.", "Crear una factura para Bob Hamel, cotización Q0000049."]) test(`R3 command exact lookup: ${text}`, async () => {
  const calls = [];
  const command = parseQuoteInvoiceCommand(text);
  const result = await lookupQuoteInvoiceCommand(command, { listDocuments: async (args) => { calls.push(args); return [quote]; } });
  assert.equal(result.state, "EXACT_QUOTE_TO_INVOICE");
  assert.equal(calls[0].search, "Q-0000049"); assert.equal(calls[0].type, "QUOTE");
  const hydrated = await loadExactInvoiceSource(parseQuoteInvoiceSourceRoute(result.route), { getDocument: async ({ draftId }) => { assert.equal(draftId, quote.id); return quote; }, getAuthority: async () => null });
  assert.equal(hydrated.document.id, quote.id);
});
test("R3 lookup fails closed on mismatch, unknown, duplicate, malformed and name-only input", async () => {
  assert.equal(resolveExactQuoteToInvoice({ number: quote.documentNumber, customerName: "Jane Doe", documents: [quote] }).state, "BLOCKED_MISMATCH");
  assert.equal(resolveExactQuoteToInvoice({ number: "Q-0000050", documents: [quote] }).state, "NOT_FOUND");
  assert.equal(resolveExactQuoteToInvoice({ number: quote.documentNumber, documents: [quote, { ...quote, id: randomUUID() }] }).state, "AMBIGUOUS");
  for (const text of ["Create an invoice for Bob Hamel", "Create invoice from Qabc", `Create invoice from ${quote.id}`]) assert.equal((await lookupQuoteInvoiceCommand(parseQuoteInvoiceCommand(text))).state, "INVALID");
  assert.equal(parseQuoteInvoiceCommand("Create invoice Q0000049 and Q0000050").state, "AMBIGUOUS");
});
test("R3 exact route rejects conflicting hints and changed source versions", async () => {
  const route = resolveExactQuoteToInvoice({ number: quote.documentNumber, documents: [quote] }).route;
  assert.equal(parseQuoteInvoiceSourceRoute(`${route}&jobId=${quote.jobId}`).valid, false);
  await assert.rejects(loadExactInvoiceSource(parseQuoteInvoiceSourceRoute(route), { getDocument: async () => ({ ...quote, version: 4 }) }), /changed/);
});
test("R3 projection transfers identity but never tentative or private fields or Invoice authority", () => {
  const result = projectQuoteToInvoiceWorkingDraft({ quoteDocument: quote });
  assert.equal(result.invoiceDraft.customerName, "Bob Hamel");
  assert.equal(result.invoiceDraft.quoteReference, "Q-0000049");
  assert.equal(result.sourceQuote.documentId, quote.id);
  for (const field of ["invoiceNumber", "notes", "paymentTerms", "totalOverride", "workPerformed", "paidAmount"]) assert.equal(result.invoiceDraft[field], "");
  assert.deepEqual(result.invoiceDraft.lineItems, []);
});
test("R3 approved money/scope/payment require an exact matching source snapshot", () => {
  const canonicalQuote = { id: randomUUID(), jobId: quote.jobId, status: "ISSUED", decisionState: "APPROVED", totalMinor: 68000, decisionVersion: 4, sourceBusinessDocument: { documentId: quote.id, documentVersion: 3, currentDocumentVersion: 3, currentSnapshotMatchesSource: true } };
  const args = { quoteDocument: quote, quoteAuthority: { canonicalQuote }, paymentEvidence: { jobId: quote.jobId, quoteId: canonicalQuote.id, quoteVersion: 4, receivedMinor: 51000 } };
  const result = projectQuoteToInvoiceWorkingDraft(args).invoiceDraft;
  assert.equal(result.lineItems[0].unitPrice, "680"); assert.equal(result.paidAmount, "510"); assert.equal(result.workPerformed, "");
  assert.equal(result.lineItems[0].description, "Repair the windows");
  assert.equal(result.lineItems[0].quantity, "1");
  assert.equal(projectQuoteToInvoiceWorkingDraft({ ...args, quoteDocument: { ...quote, version: 5 } }).invoiceDraft.lineItems.length, 0);
  assert.equal(projectQuoteToInvoiceWorkingDraft({ ...args, paymentEvidence: { ...args.paymentEvidence, jobId: randomUUID() } }).invoiceDraft.paidAmount, "");
});
const instruction = "We completed the window repair, replaced damaged trim for an extra $75, payment is due Friday, remind me privately to call him next week.";
test("R3 multi-field proposal keeps private text out of persisted customer content", () => {
  const current = { invoiceNumber: "", lineItems: [] };
  const proposal = buildInvoiceConversationProposal({ instruction, current, now: new Date(2026, 8, 7, 12) });
  assert.equal(proposal.patch.workPerformed, "window repair completed");
  assert.equal(proposal.patch.lineItems[0].description, "replaced damaged trim");
  assert.equal(proposal.patch.lineItems[0].unitPrice, "75");
  assert.equal(proposal.patch.dueDate, "2026-09-11");
  assert.equal(proposal.patch.privateReminder, "call him next week");
  assert.deepEqual(current, { invoiceNumber: "", lineItems: [] });
  const payload = buildBusinessDocumentSavePayload({ documentType: "invoice", content: { ...current, ...proposal.patch }, manualOverrides: proposal.patch });
  assert.doesNotMatch(JSON.stringify(payload.content), /call him|privately/);
  assert.equal(payload.workspace.privateReminders[0].text, "call him next week");
});
for (const text of ["Replace 2 windows", "36 inches", "4 hours labor", "2026", "4135 Residence Drive", "model number 618", "Quote Q-0000049", "add 2 windows for extra work", "charge 4 hours labor"]) test(`R3 number is not money: ${text}`, () => {
  assert.equal(buildInvoiceConversationProposal({ instruction: text }).patch.lineItems, undefined);
});
test("R3 counts measurements and duration cannot become the extra price", () => {
  const proposal = buildInvoiceConversationProposal({ instruction: "Replace 2 windows, 36 inches wide, 4 hours labor, extra charge $75" });
  assert.equal(proposal.patch.lineItems[0].unitPrice, "75");
  assert.equal(proposal.patch.lineItems[0].quantity, "1");
  assert.equal(proposal.patch.lineItems[0].description, "Replace 2 windows, 36 inches wide, 4 hours labor");
  assert.deepEqual(proposal.typedContext.map(({ type, value }) => [type, value]), [["COUNT", 2], ["MEASUREMENT", 36], ["DURATION", 4]]);
});

test("R3 an approved total or deposit is never relabeled as Extra work", () => {
  const proposal = buildInvoiceConversationProposal({ instruction: "We completed the repair, approved total $680, deposit $510, extra charge $75" });
  assert.equal(proposal.patch.lineItems[0].unitPrice, "75");
  assert.equal(proposal.patch.lineItems.length, 1);
});

test("R3 source hydration accepts payments only for the same current effective approved Quote", async () => {
  const canonicalQuote = { id: randomUUID(), jobId: quote.jobId, status: "ISSUED", decisionState: "APPROVED", totalMinor: 68000, currency: "USD", decisionVersion: 4, sourceBusinessDocument: { documentId: quote.id, documentVersion: 3, currentDocumentVersion: 3, currentSnapshotMatchesSource: true } };
  const route = parseQuoteInvoiceSourceRoute(resolveExactQuoteToInvoice({ number: quote.documentNumber, documents: [quote] }).route);
  const ports = { getDocument: async () => quote, getAuthority: async () => ({ canonicalQuote }),
    getDeposit: async () => ({ deposit: { state: "SATISFIED" } }),
    getInvoiceWorkspace: async () => ({ readyJobs: [{ jobId: quote.jobId, approvedAmount: { totalMinor: 68000, currency: "USD" }, paymentsReceivedMinor: 51000 }] }),
    getEffectiveQuote: async () => ({ quoteId: canonicalQuote.id, quoteVersion: 4 }) };
  const result = await loadExactInvoiceSource(route, ports);
  assert.equal(projectQuoteToInvoiceWorkingDraft({ quoteDocument: result.document, quoteAuthority: result.authority, paymentEvidence: result.paymentEvidence }).invoiceDraft.paidAmount, "510");
  const mismatch = await loadExactInvoiceSource(route, { ...ports, getEffectiveQuote: async () => ({ quoteId: randomUUID(), quoteVersion: 4 }) });
  assert.equal(mismatch.paymentEvidence, null);
});

test("R4 Quote to Invoice deposit gate blocks due and partially satisfied authority", () => {
  assert.equal(
    resolveQuoteInvoiceDepositGate({
      deposit: { state: "DUE" },
    }).state,
    "BLOCKED_DEPOSIT"
  );

  assert.equal(
    resolveQuoteInvoiceDepositGate({
      deposit: { state: "PARTIALLY_SATISFIED" },
    }).state,
    "BLOCKED_DEPOSIT"
  );
});

test("R4 Quote to Invoice deposit gate allows not-required and satisfied authority only", () => {
  assert.equal(
    resolveQuoteInvoiceDepositGate({
      deposit: { state: "NOT_REQUIRED" },
    }).state,
    "READY"
  );

  assert.equal(
    resolveQuoteInvoiceDepositGate({
      deposit: { state: "SATISFIED" },
    }).state,
    "READY"
  );

  assert.equal(
    resolveQuoteInvoiceDepositGate({
      deposit: { state: "TERMS_UNVERIFIED" },
    }).state,
    "UNVERIFIED"
  );

  assert.equal(
    resolveQuoteInvoiceDepositGate({
      deposit: null,
    }).state,
    "UNVERIFIED"
  );
});

test("R4 exact approved Quote cannot prepare Invoice while required deposit is due", async () => {
  const canonicalQuote = {
    id: randomUUID(),
    jobId: quote.jobId,
    status: "ISSUED",
    decisionState: "APPROVED",
    totalMinor: 68000,
    currency: "USD",
    decisionVersion: 4,
    sourceBusinessDocument: {
      documentId: quote.id,
      documentVersion: quote.version,
      currentDocumentVersion: quote.version,
      currentSnapshotMatchesSource: true,
    },
  };

  const route = parseQuoteInvoiceSourceRoute(
    resolveExactQuoteToInvoice({
      number: quote.documentNumber,
      documents: [quote],
    }).route
  );

  let workspaceReads = 0;

  await assert.rejects(
    loadExactInvoiceSource(route, {
      getDocument: async () => quote,
      getAuthority: async () => ({ canonicalQuote }),
      getDeposit: async ({ jobId, quoteId }) => {
        assert.equal(jobId, quote.jobId);
        assert.equal(quoteId, canonicalQuote.id);

        return {
          deposit: {
            state: "DUE",
            requiredMinor: 34000,
            appliedMinor: 0,
            remainingMinor: 34000,
          },
        };
      },
      getInvoiceWorkspace: async () => {
        workspaceReads += 1;
        return { readyJobs: [] };
      },
    }),
    (error) =>
      error?.code === "QUOTE_TO_INVOICE_DEPOSIT_REQUIRED" &&
      /required deposit/i.test(error.message)
  );

  assert.equal(workspaceReads, 0);
});

test("R3 an old canonical Create completion cannot attach its number to a new Invoice session", async () => {
  const { readFileSync } = await import("node:fs");
  const { parse } = await import("@babel/parser");
  const source = readFileSync(new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url), "utf8");
  const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
  const component = ast.program.body.find((item) => item.type === "FunctionDeclaration" && item.id.name === "QuoteInvoiceBusinessDocumentWorkspace");
  const method = component.body.body.find((item) => item.type === "FunctionDeclaration" && item.id.name === "createReviewedInvoice");
  let resolve;
  const created = new Promise((done) => { resolve = done; });
  const writes = [], invoiceSessionEpochRef = { current: 1 };
  const scope = { invoicePreparation: {}, onCreateCanonicalInvoice: () => created, invoice: { lineItems: [] }, invoiceCreateState: { busy: false }, invoiceSessionEpochRef, setInvoiceCreateState: (value) => writes.push(value), setNotice() {} };
  const invoke = new Function(...Object.keys(scope), `${source.slice(method.start, method.end)}; return createReviewedInvoice;`)(...Object.values(scope));
  const pending = invoke();
  invoiceSessionEpochRef.current++;
  resolve({ invoiceNumber: "INV-OLD" });
  await pending;
  assert.deepEqual(writes, [{ busy: true, error: "", invoice: null }]);
});

for (const [instruction, customerName, state] of [
  ["Create invoice for Bob Hamel job quote number Q0000049", "Bob Hamel", "EXACT_QUOTE_TO_INVOICE"],
  ["Create invoice for the Bob Hamel job quote number Q0000049", "Bob Hamel", "EXACT_QUOTE_TO_INVOICE"],
  ["Create invoice for Bob Hamel's job quote number Q0000049", "Bob Hamel", "EXACT_QUOTE_TO_INVOICE"],
  ["Create invoice for Bob Hamel’s job quote number Q0000049", "Bob Hamel", "EXACT_QUOTE_TO_INVOICE"],
  ["Create an invoice for Bob Hamel, Quote Q-0000049", "Bob Hamel", "EXACT_QUOTE_TO_INVOICE"],
  ["Create invoice from Quote Q0000049 for Bob Hamel", "Bob Hamel", "EXACT_QUOTE_TO_INVOICE"],
  ["Prepare Invoice from Quote Q-0000049 for Bob Hamel", "Bob Hamel", "EXACT_QUOTE_TO_INVOICE"],
  ["Prepare Invoice from Quote Q-0000049", "", "EXACT_QUOTE_TO_INVOICE"],
  ["Create invoice for Jane Doe, Quote Q0000049", "Jane Doe", "BLOCKED_MISMATCH"],
  ["Create invoice from Quote Q0000049 for Jane Doe", "Jane Doe", "BLOCKED_MISMATCH"],
  ["Create invoice for the Jane Doe job quote number Q0000049", "Jane Doe", "BLOCKED_MISMATCH"],
  ["Crear una factura para Bob Hamel, cotización Q0000049", "Bob Hamel", "EXACT_QUOTE_TO_INVOICE"],
  ["Preparar factura de la cotización Q0000049 para Bob Hamel", "Bob Hamel", "EXACT_QUOTE_TO_INVOICE"],
  ["Crear factura para el trabajo de Bob Hamel, cotización Q0000049", "Bob Hamel", "EXACT_QUOTE_TO_INVOICE"],
  ["Crear factura para Jane Doe, cotización Q0000049", "Jane Doe", "BLOCKED_MISMATCH"],
  ["Preparar factura de la cotización Q0000049 para Jane Doe", "Jane Doe", "BLOCKED_MISMATCH"],
]) test(`R3 natural customer authority: ${instruction}`, () => {
  const command = parseQuoteInvoiceCommand(instruction);
  assert.equal(command.customerName, customerName);
  assert.equal(command.number, "Q-0000049");
  assert.equal(command.state, "LOOKUP");
  const result = resolveExactQuoteToInvoice({ ...command, documents: [quote] });
  assert.equal(result.state, state);
  if (state === "EXACT_QUOTE_TO_INVOICE") assert.equal(result.document.id, quote.id);
  else assert.equal(result.route, undefined);
});
for (const instruction of [
  "Create invoice for The Window Company, Quote Q0000049",
  "Create invoice from Quote Q0000049 for The Window Company",
  "Create invoice for The Window Company's job quote number Q0000049",
  "Create invoice for The Window Company job quote number Q0000049",
]) test(`R3 legitimate leading The customer: ${instruction}`, () => {
  const command = parseQuoteInvoiceCommand(instruction);
  assert.equal(command.customerName, "The Window Company");
  const company = { ...quote, customerDisplayName: "The Window Company", content: { customerName: "The Window Company" } };
  assert.equal(resolveExactQuoteToInvoice({ ...command, documents: [company] }).state, "EXACT_QUOTE_TO_INVOICE");
});
test("R3 conflicting explicit customers on both sides of a Quote never select one silently", async () => {
  const command = parseQuoteInvoiceCommand("Create invoice for Bob Hamel, Quote Q0000049 for Jane Doe");
  assert.equal(command.state, "AMBIGUOUS");
  const result = await lookupQuoteInvoiceCommand(command, { listDocuments: () => assert.fail("Conflicting customers cannot initiate lookup") });
  assert.equal(result.state, "AMBIGUOUS");
  assert.equal(result.route, undefined);
});
