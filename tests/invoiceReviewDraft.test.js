import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildInvoiceConversationProposal,
  invoiceReviewFinancials,
  invoiceReviewFingerprint,
  selectEffectiveApprovedInvoiceQuote,
} from "../src/utils/invoiceReviewDraft.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspaceSource = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const builderSource = read("src/pages/QuoteBuilder.jsx");

const PARENT_ID = "b79d07e0-91ec-46ca-8a7e-88e4fb1a22c0";
const EFFECTIVE_ID = "f1858dc5-0c68-4296-af12-2e714ee8a42a";
const preparation = {
  approvedAmount: { currency: "USD", totalMinor: 68000 },
  paymentsReceivedMinor: 51000,
};
const workingInvoice = {
  customerName: "Antony Guzman",
  projectTitle: "Inspect damaged cabinet door and trim",
  notes: "",
  paymentTerms: "",
  dueDate: "",
  lineItems: [],
};

test("completed Job Invoice defaults to Meetro-assisted review with an optional separate manual editor", () => {
  assert.match(workspaceSource, /Tell Meetro what you want to add or change before creating the invoice\./);
  assert.match(workspaceSource, /Ask Meetro about this invoice…/);
  assert.match(workspaceSource, /props\.activeDocument === "invoice" && props\.invoicePreparation/);
  assert.match(workspaceSource, /return <CompletedJobInvoiceManualEditor/);
  assert.doesNotMatch(workspaceSource, /<CompletedInvoicePreparationEditor/);
  assert.match(workspaceSource, /business-document-invoice-manual/);
});

test("thank-you instruction produces a reviewable Customer notes proposal without changing money", () => {
  const proposal = buildInvoiceConversationProposal({
    instruction: "Add a thank-you note to the customer.",
    current: workingInvoice,
  });
  assert.equal(proposal.category, "CUSTOMER_NOTE");
  assert.match(proposal.patch.notes, /Thank you for your business/);
  assert.deepEqual(workingInvoice.lineItems, []);
  assert.deepEqual(invoiceReviewFinancials({ preparation, invoice: { ...workingInvoice, ...proposal.patch } }), {
    approvedMinor: 68000,
    extraWorkMinor: 0,
    totalMinor: 68000,
    paymentsReceivedMinor: 51000,
    amountStillDueMinor: 17000,
  });
});

test("bill-separately instruction proposes wording and never creates Extra work", () => {
  const proposal = buildInvoiceConversationProposal({
    instruction: "The additional work we discussed will be billed separately.",
    current: workingInvoice,
  });
  assert.equal(proposal.category, "CUSTOMER_NOTE");
  assert.match(proposal.patch.notes, /billed separately/);
  assert.equal(Object.hasOwn(proposal.patch, "lineItems"), false);
  assert.equal(invoiceReviewFinancials({ preparation, invoice: { ...workingInvoice, ...proposal.patch } }).totalMinor, 68000);
});

test("$75 additional repair remains proposed until Apply and then produces 755/510/245", () => {
  const before = structuredClone(workingInvoice);
  const proposal = buildInvoiceConversationProposal({
    instruction: "Add $75 for the additional cabinet repair.",
    current: workingInvoice,
  });
  assert.equal(proposal.category, "EXTRA_WORK");
  assert.equal(proposal.patch.lineItems.at(-1).description, "Additional cabinet repair");
  assert.equal(proposal.patch.lineItems.at(-1).quantity, "1");
  assert.equal(proposal.patch.lineItems.at(-1).unitPrice, "75");
  assert.deepEqual(workingInvoice, before, "building a proposal must not mutate the working Invoice");
  const applied = { ...workingInvoice, ...proposal.patch };
  assert.deepEqual(invoiceReviewFinancials({ preparation, invoice: applied }), {
    approvedMinor: 68000,
    extraWorkMinor: 7500,
    totalMinor: 75500,
    paymentsReceivedMinor: 51000,
    amountStillDueMinor: 24500,
  });
});

test("due weekday and Net 15 are bounded Invoice proposals", () => {
  const due = buildInvoiceConversationProposal({
    instruction: "Make this due Friday.",
    current: workingInvoice,
    now: new Date(2026, 7, 29),
  });
  const terms = buildInvoiceConversationProposal({
    instruction: "Make the payment terms Net 15.",
    current: workingInvoice,
  });
  assert.equal(due.patch.dueDate, "2026-09-04");
  assert.equal(terms.patch.paymentTerms, "Net 15");
});

test("proposal fingerprint detects stale working-Invoice changes", () => {
  const proposal = buildInvoiceConversationProposal({
    instruction: "Add a thank-you note to the customer.",
    current: workingInvoice,
  });
  assert.equal(proposal.baselineFingerprint, invoiceReviewFingerprint(workingInvoice));
  assert.notEqual(proposal.baselineFingerprint, invoiceReviewFingerprint({ ...workingInvoice, dueDate: "2026-09-04" }));
});

test("effective approved Quote selection chooses the approved leaf revision, never its parent", () => {
  const quotes = [
    { id: PARENT_ID, parentQuoteId: null, status: "ISSUED", decisionState: "APPROVED", totalMinor: 68000 },
    { id: EFFECTIVE_ID, parentQuoteId: PARENT_ID, status: "ISSUED", decisionState: "APPROVED", totalMinor: 68000 },
  ];
  const effective = selectEffectiveApprovedInvoiceQuote(quotes, { approvedTotalMinor: 68000 });
  assert.equal(effective.id, EFFECTIVE_ID);
  assert.notEqual(effective.id, PARENT_ID);
});

test("effective Quote selection fails closed for ambiguous or missing lineage", () => {
  const ambiguous = [
    { id: PARENT_ID, parentQuoteId: null, status: "ISSUED", decisionState: "APPROVED", totalMinor: 68000 },
    { id: EFFECTIVE_ID, parentQuoteId: PARENT_ID, status: "ISSUED", decisionState: "APPROVED", totalMinor: 68000 },
    { id: "6a38e4ce-4c5c-45d6-bdaf-c39de6309fa0", parentQuoteId: PARENT_ID, status: "ISSUED", decisionState: "APPROVED", totalMinor: 68000 },
  ];
  assert.equal(selectEffectiveApprovedInvoiceQuote(ambiguous, { approvedTotalMinor: 68000 }), null);
  assert.equal(selectEffectiveApprovedInvoiceQuote([], { approvedTotalMinor: 68000 }), null);
});

test("Job-backed Invoice reads and hydrates the exact effective Quote reference", () => {
  assert.match(builderSource, /fetchEffectiveApprovedInvoiceQuote/);
  assert.match(builderSource, /approvedTotalMinor: prepared\.approvedAmount\?\.totalMinor/);
  assert.match(builderSource, /quoteReference: quoteReference\.quoteId/);
  assert.match(builderSource, /INVOICE_QUOTE_REFERENCE_READ_GAP/);
  assert.match(workspaceSource, /quoteReference: invoicePreparation\.quoteReference/);
  assert.match(workspaceSource, /<dd>\{invoice\.quoteReference \|\| "Not linked"\}<\/dd>/);
});

test("manual mode previews tentative values, supports Apply/Cancel, and protects approved work", () => {
  const start = workspaceSource.indexOf("function CompletedJobInvoiceManualEditor");
  const end = workspaceSource.indexOf("function PhotoStrip", start);
  const manual = workspaceSource.slice(start, end);
  assert.match(manual, /Customer.*readOnly/s);
  assert.match(manual, /Job.*readOnly/s);
  assert.match(manual, /Approved work.*readOnly/s);
  assert.match(manual, /Extra work/);
  assert.match(manual, /Payment terms/);
  assert.match(manual, /Due date/);
  assert.match(manual, /Customer notes/);
  assert.match(manual, /onPreview\(next\)/);
  assert.match(manual, /onApply\(draft, originalRef\.current\)/);
  assert.match(manual, /onCancel\(originalRef\.current\)/);
});

test("proposal and manual Apply update only one unsaved working Invoice", () => {
  assert.match(workspaceSource, /setManualOverrides\(\(current\) => \(\{ \.\.\.current, invoice: overrides \}\)\)/);
  assert.match(workspaceSource, /setInvoice\(nextInvoice\)/);
  assert.match(workspaceSource, /The Invoice remains unsaved and has not been created/);
  const proposalApply = workspaceSource.slice(
    workspaceSource.indexOf("function applyInvoiceProposal"),
    workspaceSource.indexOf("function applyQuoteProposal")
  );
  assert.doesNotMatch(proposalApply, /onCreateCanonicalInvoice|createCanonicalInvoice|saveDocument/);
});

test("manual mode continuity preserves applied values and Cancel restores its opening snapshot", () => {
  assert.match(workspaceSource, /originalInvoice: structuredClone\(invoice\)/);
  assert.match(workspaceSource, /setInvoice\(structuredClone\(original\)\)/);
  assert.match(workspaceSource, /if \(activeDocument === "invoice" && invoicePreparation\) setInvoice\(draft\)/);
  assert.match(workspaceSource, /invoicePreparationHydratedRef\.current === invoicePreparation\.jobId/);
  assert.match(builderSource, /existingRequest\?\.key === requestKey/);
});
