import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBusinessDocumentSavePayload,
  businessDocumentSavePresentation,
  businessDocumentSnapshotFingerprint,
  hasMeaningfulBusinessDocumentDraft,
} from "../src/utils/businessDocumentPersistence.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");

const CONTACT_ID = "11111111-1111-4111-8111-111111111111";
const RELATIONSHIP_ID = "22222222-2222-4222-8222-222222222222";

function blankQuotePayload(overrides = {}) {
  return buildBusinessDocumentSavePayload({
    documentType: "quote",
    content: {
      quoteDate: "2026-08-24",
      currency: "USD",
      agreement: {},
      lineItems: [{ id: "quote-line-0", description: "", quantity: "1", unitPrice: "", total: "" }],
      materialItems: [{ id: "material-line-0", name: "", quantity: "", cost: "", total: "", notes: "" }],
      laborItems: [{ id: "labor-line-0", description: "Labor", hours: "", rate: "", total: "" }],
      ...overrides.content,
    },
    turns: overrides.turns || [],
    manualOverrides: overrides.manualOverrides || {},
    customerParty: overrides.customerParty || null,
    photos: overrides.photos || [],
  });
}

function blankInvoicePayload(overrides = {}) {
  return buildBusinessDocumentSavePayload({
    documentType: "invoice",
    content: {
      invoiceDate: "2026-08-24",
      currency: "USD",
      agreement: {},
      lineItems: [],
      ...overrides.content,
    },
    turns: overrides.turns || [],
    manualOverrides: overrides.manualOverrides || {},
    customerParty: overrides.customerParty || null,
  });
}

test("untouched blank Quote and Invoice remain clean despite system initialization", () => {
  const quote = blankQuotePayload();
  const invoice = blankInvoicePayload();
  const spanishQuote = blankQuotePayload({
    content: {
      laborItems: [{ id: "labor-line-0", description: "Mano de obra", hours: "", rate: "", total: "" }],
    },
  });

  assert.equal(hasMeaningfulBusinessDocumentDraft(quote), false);
  assert.equal(hasMeaningfulBusinessDocumentDraft(invoice), false);
  assert.equal(hasMeaningfulBusinessDocumentDraft(spanishQuote), false);
  for (const payload of [quote, invoice, spanishQuote]) {
    const presentation = businessDocumentSavePresentation({
      hasMeaningfulContent: hasMeaningfulBusinessDocumentDraft(payload),
    });
    assert.equal(presentation.dirty, false);
    assert.equal(presentation.label, "Save Draft");
  }
});

test("meaningful document fields and semantic rows trigger the unsaved guard", () => {
  for (const payload of [
    blankQuotePayload({ content: { customerName: "Carlos Rivera" } }),
    blankQuotePayload({ content: { projectDescription: "Repair the damaged section." } }),
    blankQuotePayload({ content: { totalOverride: "100" } }),
    blankQuotePayload({ content: { agreement: { exclusions: ["Painting"] } } }),
    blankQuotePayload({ content: { lineItems: [{ id: "quote-line-0", description: "Repair", quantity: "1", unitPrice: "100", total: "100" }] } }),
    blankInvoicePayload({ content: { paymentTerms: "Due on receipt" } }),
  ]) {
    assert.equal(hasMeaningfulBusinessDocumentDraft(payload), true);
    assert.equal(businessDocumentSavePresentation({
      hasMeaningfulContent: hasMeaningfulBusinessDocumentDraft(payload),
    }).dirty, true);
  }
});

test("unsaved customer linkage is meaningful without creating new identity authority", () => {
  const payload = blankQuotePayload({
    customerParty: {
      businessContactId: CONTACT_ID,
      customerRelationshipId: RELATIONSHIP_ID,
    },
  });
  assert.equal(hasMeaningfulBusinessDocumentDraft(payload), true);
  assert.deepEqual(payload.customerParty, {
    businessContactId: CONTACT_ID,
    customerRelationshipId: RELATIONSHIP_ID,
  });
});

test("applied Prefill/document instructions are meaningful but opening controls is not", () => {
  const payload = blankQuotePayload({
    content: { projectDescription: "Repair the damaged section." },
    turns: [{
      id: "prefill-turn-1",
      documentType: "quote",
      text: "Repair the damaged section.",
      recognized: true,
    }],
  });
  assert.equal(hasMeaningfulBusinessDocumentDraft(payload), true);

  const payloadBlock = workspace.slice(
    workspace.indexOf("const quotePayload = useMemo"),
    workspace.indexOf("const payloads =")
  );
  for (const presentationState of [
    "manualState",
    "howItWorksOpen",
    "savedFilesOpen",
    "customerControl",
    "mobilePane",
  ]) {
    assert.doesNotMatch(payloadBlock, new RegExp(presentationState), presentationState);
  }
});

test("governed save establishes a clean baseline until a genuine change", () => {
  const payload = blankQuotePayload({ content: { customerName: "Carlos Rivera" } });
  const fingerprint = businessDocumentSnapshotFingerprint({ payload, recoveryPhotos: [] });
  const savedDocument = { id: "33333333-3333-4333-8333-333333333333", updatedAt: "2026-08-24T12:00:00.000Z" };
  const clean = businessDocumentSavePresentation({
    savedDocument,
    currentFingerprint: fingerprint,
    savedFingerprint: fingerprint,
    hasMeaningfulContent: true,
  });
  assert.equal(clean.dirty, false);
  assert.equal(clean.label, "Saved ✓");

  const changed = businessDocumentSavePresentation({
    savedDocument,
    currentFingerprint: `${fingerprint}-changed`,
    savedFingerprint: fingerprint,
    hasMeaningfulContent: true,
  });
  assert.equal(changed.dirty, true);
  assert.equal(changed.label, "Save Changes");
});

test("workspace leave behavior remains driven only by meaningful dirty state", () => {
  const requestExit = workspace.slice(
    workspace.indexOf("function requestExit"),
    workspace.indexOf("async function saveAllAndExit")
  );
  assert.match(requestExit, /if \(!dirty\.quote && !dirty\.invoice\)/);
  assert.match(requestExit, /rememberSavedWorkspaceAndExit\(action\)/);
  assert.match(requestExit, /setExitDialogOpen\(true\)/);
  assert.match(workspace, /hasMeaningfulContent: hasMeaningfulBusinessDocumentDraft\(quotePayload\)/);
  assert.match(workspace, /hasMeaningfulContent: hasMeaningfulBusinessDocumentDraft\(invoicePayload\)/);
});
