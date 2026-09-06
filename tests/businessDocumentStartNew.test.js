import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildNewBusinessDocumentDraftPayload,
  restoreBusinessDocumentDraft,
  validateNewBusinessDocumentDraft,
} from "../src/utils/businessDocumentPersistence.js";
import { SUPPORTED_LANGUAGES, t } from "../src/utils/language.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const styles = read("src/components/UnifiedBusinessDocumentWorkspace.css");
const quoteBuilder = read("src/pages/QuoteBuilder.jsx");

const QUOTE_ONE = "11111111-1111-4111-8111-111111111111";
const QUOTE_TWO = "22222222-2222-4222-8222-222222222222";
const INVOICE_ONE = "33333333-3333-4333-8333-333333333333";
const INVOICE_TWO = "44444444-4444-4444-8444-444444444444";

function savedDocument({
  id = QUOTE_ONE,
  documentType = "QUOTE",
  documentNumber = "Q-0000001",
  content = {},
  customerParty = null,
  photos = [],
} = {}) {
  return {
    id,
    documentType,
    status: "WORKING_DRAFT",
    reference: `WD-${id.slice(0, 8)}`,
    documentNumber,
    jobId: null,
    customerParty,
    version: 1,
    createdAt: "2026-08-24T12:00:00.000Z",
    updatedAt: "2026-08-24T12:01:00.000Z",
    content,
    workspace: {
      activeDocument: documentType,
      instructions: [],
      manualOverrides: {},
      privateReminders: [],
    },
    photos,
  };
}

test("Quote and Invoice tabs expose persistent localized Start New actions", () => {
  assert.match(workspace, /businessDocumentStartNewQuote/);
  assert.match(workspace, /businessDocumentStartNewInvoice/);
  assert.match(workspace, /className="business-document-start-new"/);
  assert.match(workspace, /onClick=\{\(\) => void startNewDocument\(activeDocument\)\}/);
  assert.match(styles, /\.business-document-header-actions/);
  assert.match(styles, /\.business-document-start-new/);
  for (const { code } of SUPPORTED_LANGUAGES) {
    assert.ok(t("businessDocumentStartNewQuote", code).trim(), `${code}:Quote`);
    assert.ok(t("businessDocumentStartNewInvoice", code).trim(), `${code}:Invoice`);
    assert.ok(t("businessDocumentStartingNewQuote", code).trim(), `${code}:starting Quote`);
    assert.ok(t("businessDocumentStartingNewInvoice", code).trim(), `${code}:starting Invoice`);
  }
});

test("new Quote payload is clean and carries no prior customer or commercial state", () => {
  const payload = buildNewBusinessDocumentDraftPayload({
    documentType: "quote",
    documentDate: "2026-08-24",
  });
  assert.equal(payload.documentType, "QUOTE");
  assert.equal(payload.jobId, null);
  assert.equal(payload.customerParty, null);
  assert.equal(payload.content.customerName, "");
  assert.equal(payload.content.customerEmail, "");
  assert.equal(payload.content.customerLocation, "");
  assert.equal(payload.content.projectTitle, "");
  assert.equal(payload.content.projectDescription, "");
  assert.equal(payload.content.recommendedSolution, "");
  assert.equal(payload.content.totalOverride, "");
  assert.equal(payload.content.terms, "");
  assert.equal(payload.content.notes, "");
  assert.equal(payload.content.quoteDate, "2026-08-24");
  assert.deepEqual(payload.content.lineItems, []);
  assert.deepEqual(payload.content.materialItems, []);
  assert.deepEqual(payload.content.laborItems, []);
  assert.ok(Object.values(payload.content.agreement).every((value) =>
    Array.isArray(value) ? value.length === 0 : value === ""
  ));
  assert.deepEqual(payload.workspace.instructions, []);
  assert.deepEqual(payload.workspace.manualOverrides, {});
  assert.deepEqual(payload.workspace.privateReminders, []);
  assert.equal(payload.workspace.jobAnalysisSessionId, undefined);
  assert.deepEqual(payload.photos, []);
});

test("new Invoice payload is independently clean and unlinked", () => {
  const payload = buildNewBusinessDocumentDraftPayload({
    documentType: "invoice",
    documentDate: "2026-08-24",
  });
  assert.equal(payload.documentType, "INVOICE");
  assert.equal(payload.jobId, null);
  assert.equal(payload.customerParty, null);
  assert.equal(payload.content.invoiceDate, "2026-08-24");
  assert.equal(payload.content.quoteReference, "");
  assert.equal(payload.content.paymentTerms, "");
  assert.equal(payload.content.workPerformed, "");
  assert.equal(payload.content.totalOverride, "");
  assert.deepEqual(payload.content.lineItems, []);
  assert.deepEqual(payload.photos, []);
});

test("server response must provide a different working ID and server-owned number", () => {
  const previous = savedDocument();
  const next = savedDocument({ id: QUOTE_TWO, documentNumber: "Q-0000002" });
  assert.equal(validateNewBusinessDocumentDraft({
    documentType: "quote",
    previousDocument: previous,
    nextDocument: next,
  }).id, QUOTE_TWO);
  assert.throws(
    () => validateNewBusinessDocumentDraft({
      documentType: "quote",
      previousDocument: previous,
      nextDocument: { ...next, id: previous.id },
    }),
    (error) => error.code === "BUSINESS_DOCUMENT_NEW_IDENTITY_INVALID"
  );
  assert.throws(
    () => validateNewBusinessDocumentDraft({
      documentType: "quote",
      previousDocument: previous,
      nextDocument: { ...next, documentNumber: previous.documentNumber },
    }),
    (error) => error.code === "BUSINESS_DOCUMENT_NEW_IDENTITY_INVALID"
  );
});

test("the first customer-resolved Quote can validate without a previous empty server draft", () => {
  const next = savedDocument({ id: QUOTE_TWO, documentNumber: "Q-0000002" });
  assert.equal(validateNewBusinessDocumentDraft({
    documentType: "quote",
    previousDocument: null,
    nextDocument: next,
  }).id, QUOTE_TWO);
});

test("previous Quote remains independently restorable after a distinct new Quote is created", () => {
  const customerParty = {
    businessContactId: "55555555-5555-4555-8555-555555555555",
    customerRelationshipId: "66666666-6666-4666-8666-666666666666",
  };
  const previous = savedDocument({
    customerParty,
    content: {
      customerName: "Maggie Rivera",
      projectTitle: "Fan repair",
      projectDescription: "Replace fan",
      totalOverride: "239.99",
      terms: "50% deposit",
      notes: "Protect the floor",
      agreement: {},
      lineItems: [{ id: "fan", description: "Fan", total: 89.99 }],
      materialItems: [],
      laborItems: [{ id: "install", description: "Installation", total: 150 }],
    },
  });
  const savedFiles = [previous];
  const next = savedDocument({
    id: QUOTE_TWO,
    documentNumber: "Q-0000002",
    content: buildNewBusinessDocumentDraftPayload({ documentType: "quote" }).content,
  });
  savedFiles.push(next);
  const reopened = restoreBusinessDocumentDraft(savedFiles[0]);
  assert.equal(savedFiles.length, 2);
  assert.equal(reopened.content.customerName, "Maggie Rivera");
  assert.equal(reopened.content.projectTitle, "Fan repair");
  assert.equal(reopened.content.totalOverride, "239.99");
  assert.deepEqual(reopened.customerParty, customerParty);
  assert.equal(next.customerParty, null);
  assert.equal(next.content.customerName, "");
});

test("working Invoice receives the same distinct-identity and preservation protections", () => {
  const previous = savedDocument({
    id: INVOICE_ONE,
    documentType: "INVOICE",
    documentNumber: "INV-0000001",
    content: { customerName: "Maggie Rivera", totalOverride: "150" },
  });
  const next = savedDocument({
    id: INVOICE_TWO,
    documentType: "INVOICE",
    documentNumber: "INV-0000002",
    content: buildNewBusinessDocumentDraftPayload({ documentType: "invoice" }).content,
  });
  assert.equal(validateNewBusinessDocumentDraft({
    documentType: "invoice",
    previousDocument: previous,
    nextDocument: next,
  }).documentNumber, "INV-0000002");
  assert.equal(restoreBusinessDocumentDraft(previous).content.customerName, "Maggie Rivera");
  assert.equal(next.content.customerName, "");
});

test("Start New waits for the established save operation before server draft creation", () => {
  const ensureBlock = workspace.slice(
    workspace.indexOf("async function ensureCurrentDocumentSaved"),
    workspace.indexOf("function resetNewDocumentTransientState")
  );
  const startBlock = workspace.slice(
    workspace.indexOf("async function startNewDocument"),
    workspace.indexOf("function updateCustomerControl")
  );
  assert.match(ensureBlock, /saveInFlightRef\.current\[documentType\]/);
  assert.match(ensureBlock, /existing && !dirty\[documentType\]/);
  assert.match(ensureBlock, /saveDocument\(documentType, \{ suppressFailureDialog: true \}\)/);
  assert.ok(startBlock.indexOf("await ensureCurrentDocumentSaved(type)") < startBlock.indexOf("createAndOpenNewDocument(type, currentDocument)"));
  assert.match(workspace, /if \(saveInFlightRef\.current\[documentType\]\)[\s\S]*return saveInFlightRef\.current\[documentType\]/);
});

test("save failure leaves the current document open and cannot create the next draft", () => {
  const startBlock = workspace.slice(
    workspace.indexOf("async function startNewDocument"),
    workspace.indexOf("function updateCustomerControl")
  );
  const failureStart = startBlock.indexOf("if (!currentDocument)");
  const createStart = startBlock.indexOf("createAndOpenNewDocument(type, currentDocument)");
  const failureBlock = startBlock.slice(failureStart, createStart);
  assert.ok(failureStart >= 0 && createStart > failureStart);
  assert.match(failureBlock, /setSaveFailureOpen\(true\)/);
  assert.match(failureBlock, /return false/);
  assert.doesNotMatch(failureBlock, /createBusinessDocumentDraft/);
  assert.match(workspace, /No new document was created\. The current working document remains open\./);
  assert.match(workspace, /pendingStartNewRef\.current[\s\S]*startNewDocument\(pendingStartNewRef\.current\)/);
});

test("numbering setup retry failure stays in the non-abandoning Start New recovery path", () => {
  const setupBlock = workspace.slice(
    workspace.indexOf("async function submitNumberingSetup"),
    workspace.indexOf("async function restoreJobAnalysisPresentation")
  );
  const failureBlock = setupBlock.slice(
    setupBlock.indexOf("saved === false && pendingStartNewRef.current"),
    setupBlock.indexOf("saved === false && setup.suppressFailureDialog")
  );
  assert.match(failureBlock, /businessDocumentStartNewSaveFailed/);
  assert.match(failureBlock, /setSaveFailureOpen\(true\)/);
  assert.match(failureBlock, /return/);
  assert.match(workspace, /startNewSaveFailure \? \[\{ label: "Keep Editing"[\s\S]*\{ label: "Try Again"/);
});

test("Start New creates only through governed draft authority and never creates customer identity", () => {
  const createBlock = workspace.slice(
    workspace.indexOf("async function createAndOpenNewDocument"),
    workspace.indexOf("async function startNewDocument")
  );
  assert.match(createBlock, /buildNewBusinessDocumentDraftPayload/);
  assert.match(createBlock, /createBusinessDocumentDraft\(/);
  assert.match(createBlock, /validateNewBusinessDocumentDraft/);
  assert.match(createBlock, /applyRestoredDocument\(document/);
  assert.doesNotMatch(createBlock, /createBusinessContact|assignBusinessContactRole|establishBusinessCustomerRelationship|resolveOrEstablishCustomerRelationship/);
  assert.doesNotMatch(createBlock, /localStorage|sessionStorage/);
});

test("new-document hydration clears customer, photos, analysis, delivery, and retry presentation state", () => {
  const resetBlock = workspace.slice(
    workspace.indexOf("function resetNewDocumentTransientState"),
    workspace.indexOf("async function createAndOpenNewDocument")
  );
  assert.match(resetBlock, /setCustomerControl\(emptyCustomerControl\(\)\)/);
  assert.match(resetBlock, /setDeliveryState\(null\)/);
  assert.match(resetBlock, /setRecoveryRecord\(null\)/);
  assert.match(resetBlock, /setRecovered\(false\)/);
  assert.match(resetBlock, /setJobAnalysisRequestState/);
  assert.match(resetBlock, /relationshipCommandKeysRef\.current\.clear\(\)/);
  assert.match(resetBlock, /saveAttemptKeysRef\.current\[documentType\] = ""/);
  assert.match(workspace, /onRestorePhotos\?\.\(restored\.photos, \{ documentType: type, persisted: true \}\)/);
  assert.match(workspace, /setLinkedCustomerContacts\(\(current\) => \(\{ \.\.\.current, \[type\]: null \}\)\)/);
  assert.match(workspace, /setDeliveryHistory\(\(current\) => \(\{ \.\.\.current, \[type\]: \[\] \}\)\)/);
});

test("new Quote clears parent-held legacy prices, adjustments, deposit, and optional customer fields", () => {
  const restoreBlock = workspace.slice(
    workspace.indexOf("function applyRestoredDocument"),
    workspace.indexOf("async function refreshDeliveryHistory")
  );
  for (const field of [
    "labor", "materials", "discount", "tax",
    "travelFee", "disposalFee", "depositAmount", "startDate",
  ]) {
    assert.match(restoreBlock, new RegExp(`${field}: ""`), field);
    assert.match(quoteBuilder, new RegExp(`Object\\.hasOwn\\(patch, "${field}"\\)`), field);
  }
  assert.match(restoreBlock, /customerPhone: restored\.customerParty \? restored\.content\.customerPhone : ""/);
  assert.match(restoreBlock, /customerAddress: restored\.customerParty \? restored\.content\.customerAddress : ""/);
  assert.match(restoreBlock, /depositRequired: "No"/);
  assert.match(quoteBuilder, /Object\.hasOwn\(patch, "depositRequired"\)/);
  assert.match(quoteBuilder, /const \[labor, setLabor\] = useState/);
  assert.match(quoteBuilder, /const \[materials, setMaterials\] = useState/);
});

test("Saved Files stays server-backed and previous documents are never deleted by Start New", () => {
  const createBlock = workspace.slice(
    workspace.indexOf("async function createAndOpenNewDocument"),
    workspace.indexOf("async function startNewDocument")
  );
  assert.match(workspace, /listBusinessDocumentDrafts/);
  assert.match(workspace, /getBusinessDocumentDraft/);
  assert.doesNotMatch(createBlock, /deleteBusinessDocumentDraft|handleDeletedDocument/);
  assert.doesNotMatch(createBlock, /setSavedFilesOpen\(true\)/);
});
