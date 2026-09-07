import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "@babel/parser";
import * as persistence from "../src/utils/businessDocumentPersistence.js";
import * as customers from "../src/utils/businessDocumentCustomerParty.js";
import { buildJobLinkedNewQuoteRoute } from "../src/utils/newQuoteCustomerSetup.js";
import { normalizeBusinessDocumentTab } from "../src/utils/businessDocumentWorkspace.js";

const source = readFileSync(new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url), "utf8");
const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
const component = ast.program.body.find((node) => node.type === "FunctionDeclaration" && node.id.name === "QuoteInvoiceBusinessDocumentWorkspace");
const declarations = [...ast.program.body, ...component.body.body].filter((node) => node.type === "FunctionDeclaration");
const names = ["emptyCustomerControl", "emptyNewQuoteSetup", "displayDocumentNumber", "todayLocalIsoDate", "currentContent", "documentPayload", "durableSaveInput", "saveDocument", "performSaveDocument", "openNumberingSetup", "submitNumberingSetup", "applyRestoredDocument", "resetNewDocumentTransientState", "createAndOpenNewDocument", "startNewDocument", "updateNewQuoteSetup", "completeResolvedNewQuote", "continueResolvedNewQuote", "resolvedExternalQuoteAuthority", "applyCustomerSnapshot", "persistCustomerLink", "workspaceRecoverySnapshot", "rememberSavedWorkspaceAndExit", "requestExit", "saveAllAndExit", "discardAndExit", "keepEditingBeforeExit", "cancelNumberingSetup", "createExternalQuoteCustomer"];
const functions = names.map((name) => {
  const node = declarations.find((item) => item.id.name === name);
  assert.ok(node, `production handler ${name} exists`);
  return source.slice(node.start, node.end);
}).join("\n");
const CONTACT = "11111111-1111-4111-8111-111111111111";
const RELATIONSHIP = "22222222-2222-4222-8222-222222222222";
const JOB = "33333333-3333-4333-8333-333333333333";
const contact = { id: CONTACT, displayName: "Bob", status: "ACTIVE", roles: ["CUSTOMER"] };
const relationship = { id: RELATIONSHIP, businessContactId: CONTACT };
const destination = { kind: "EXTERNAL", contact, relationship,
  customerParty: { businessContactId: CONTACT, customerRelationshipId: RELATIONSHIP },
  customerSnapshot: { customerName: "Bob" } };

// Execute production handlers with React state setters and network/recovery ports.
// This tests lifecycle behavior rather than duplicating it in a model.
function workspace({ initialized = true, failSave = false } = {}) {
  const events = [];
  const documents = new Map();
  const durableCustomers = new Map([[CONTACT, { contact, relationship }]]);
  const scope = {
    ...persistence, ...customers, buildJobLinkedNewQuoteRoute, normalizeBusinessDocumentTab,
    resolveBusinessProfileId: async () => 10,
    createBusinessContactCommandKey: () => "customer-key",
    createDeterministicBusinessContactKey: (key) => key,
    getBusinessContactActiveRoles: (contact) => contact.roles || [],
    async createBusinessContact() {
      events.push(["create-contact"]);
      const created = { ...contact, roles: [] };
      durableCustomers.set(CONTACT, { contact: created });
      return { contact: created };
    },
    async assignBusinessContactRole() {
      events.push(["assign-role"]);
      durableCustomers.get(CONTACT).contact = contact;
      return contact;
    },
    async getBusinessCustomerRelationshipByContact() { return durableCustomers.get(CONTACT)?.relationship || null; },
    async establishBusinessCustomerRelationship() {
      events.push(["establish-relationship"]);
      durableCustomers.get(CONTACT).relationship = relationship;
      return relationship;
    },
    language: "en", t: (key) => key, NUMBERING_SETUP_PENDING: Symbol("setup"),
    activeDocument: "quote", quote: {}, invoice: {}, photos: [], photoAssignments: {}, turns: [],
    customerParties: { quote: null, invoice: null }, manualOverrides: { quote: {}, invoice: {} },
    savedDocuments: { quote: null, invoice: null }, savedFingerprints: { quote: "", invoice: "" },
    documentJobIds: { quote: null, invoice: null }, jobAnalysisSessionIds: { quote: null, invoice: null },
    newQuoteSetup: { open: false, busy: false }, saveState: { busy: false }, startNewState: {},
    lastNumber: 2, initialized, failSave, recovery: { old: true },
    getAuthenticatedIdentitySnapshot: () => ({ userId: 1 }),
    createBusinessDocumentSaveKey: () => `key-${events.length}`,
    setPage: (route) => events.push(["route", route]),
    clearPersistedQuoteAuthority() {}, hydrateLinkedCustomer() {}, restoreJobAnalysisPresentation() {},
    hydratePersistedQuoteAuthority() {}, refreshDeliveryHistory() {},
    createQuickQuoteAnalysisPresentationState: () => ({}),
    onDurableDocumentOpened: (doc) => events.push(["opened", doc.id]),
    onApplyQuotePatch: (patch) => { scope.quote = { ...patch }; },
    onRestorePhotos: (photos) => { scope.photos = photos; },
    onDiscardTransientPhotos: () => { scope.photos = []; },
    onPhotosPersisted() {},
    async deleteBusinessDocumentRecovery() { scope.recovery = null; events.push(["clear-recovery"]); return true; },
    async saveBusinessDocumentRecovery({ snapshot }) { scope.recovery = snapshot; events.push(["recovery"]); return { ok: true }; },
    async createBusinessDocumentDraft({ payload }) {
      events.push(["create", payload]);
      if (!scope.initialized) throw Object.assign(new Error("Setup required"), { code: "BUSINESS_DOCUMENT_NUMBERING_SETUP_REQUIRED" });
      if (scope.failSave) throw new Error("Save failed");
      scope.lastNumber++;
      const document = { ...structuredClone(payload), id: `saved-${scope.lastNumber}`, documentNumber: `${payload.documentType === "INVOICE" ? "INV" : "Q"}-${String(scope.lastNumber).padStart(7, "0")}`, version: 1, updatedAt: "2026-09-07T12:00:00Z" };
      documents.set(document.id, document);
      return document;
    },
    async updateBusinessDocumentDraft({ draftId, expectedVersion, payload }) {
      events.push(["update", draftId]);
      if (scope.failSave) throw new Error("Save failed");
      const existing = documents.get(draftId);
      assert.equal(expectedVersion, existing.version);
      const document = { ...existing, ...structuredClone(payload), version: existing.version + 1 };
      documents.set(draftId, document); return document;
    },
    async getBusinessDocumentNumbering() { events.push(["numbering"]); return { initialized: scope.initialized }; },
    async initializeBusinessDocumentNumbering() { events.push(["initialize"]); scope.initialized = true; return { initialized: true }; },
  };
  for (const [name, current] of Object.entries({
    saveInFlightRef: { quote: null, invoice: null }, saveAttemptKeysRef: { quote: "", invoice: "" },
    newDocumentAttemptKeysRef: { quote: "", invoice: "" }, savedDocumentsRef: scope.savedDocuments,
    pendingExitRef: null, pendingStartNewRef: null, pendingNewQuoteDestinationRef: null,
    newQuoteSetupAuthorityRef: false, initialDocumentBaselinesRef: { quote: {}, invoice: {} },
    turnIdRef: 0, invoiceVisitedRef: false, seenPhotoIdsRef: new Set(),
    quoteIssueAttemptRef: null, quoteIssueInFlightRef: false, relationshipCommandKeysRef: new Map(), nearNewestRef: true,
  })) scope[name] = { current };
  for (const name of new Set(functions.match(/\bset[A-Z]\w+/g))) {
    if (scope[name]) continue;
    const property = name[3].toLowerCase() + name.slice(4);
    scope[name] = (value) => { scope[property] = typeof value === "function" ? value(scope[property] || {}) : value; };
  }
  Object.defineProperties(scope, {
    activeContent: { get: () => scope[scope.activeDocument] },
    payloads: { get: () => ({ quote: handlers.documentPayload("quote"), invoice: handlers.documentPayload("invoice") }) },
    dirty: { get: () => Object.fromEntries(["quote", "invoice"].map((type) => [type, presentation(type).dirty])) },
  });
  // Function constructor keeps the extracted handlers' lexical state in this port scope.
  const handlers = new Function("scope", `with (scope) { ${functions}; return { ${names.join(", ")} }; }`)(scope);
  function presentation(type = "quote") {
    return persistence.businessDocumentSavePresentation({ savedDocument: scope.savedDocuments[type], savedFingerprint: scope.savedFingerprints[type],
      currentFingerprint: persistence.businessDocumentSnapshotFingerprint({ payload: handlers.documentPayload(type), recoveryPhotos: persistence.recoveryPhotoProjection(scope.photos, scope.photoAssignments) }),
      hasMeaningfulContent: persistence.hasMeaningfulBusinessDocumentDraft(handlers.documentPayload(type)) });
  }
  return { scope, events, documents, durableCustomers, handlers, presentation };
}

for (const kind of ["EXTERNAL", "MEETRO_JOB"]) {
  test(`${kind} selection creates no document, consumes no number and never opens numbering setup`, async () => {
    const w = workspace({ initialized: false });
    await w.handlers.continueResolvedNewQuote(kind === "EXTERNAL" ? destination : { kind, job: { jobId: JOB } });
    assert.equal(w.documents.size, 0);
    assert.equal(w.scope.lastNumber, 2);
    assert.equal(w.scope.savedDocuments.quote, null);
    assert.equal(w.presentation().savedAt, "");
    assert.ok(!w.events.some(([event]) => ["create", "numbering", "initialize", "opened"].includes(event)));
    if (kind === "EXTERNAL") assert.deepEqual(w.scope.customerParties.quote, destination.customerParty);
    else assert.deepEqual(w.events.at(-1), ["route", `quoteBuilder?jobId=${JOB}`]);
  });
}

test("Start New guards dirty Quote with Save/Discard intent without saving it", async () => {
  const w = workspace();
  await w.handlers.completeResolvedNewQuote(destination);
  await w.handlers.startNewDocument("quote");
  assert.equal(w.scope.exitDialogOpen, true);
  assert.equal(w.scope.newQuoteSetup.open, false);
  assert.equal(w.documents.size, 0);
  assert.equal(w.scope.lastNumber, 2);
  await w.handlers.discardAndExit();
  assert.equal(w.scope.newQuoteSetup.open, true);
  assert.equal(w.scope.recovery, null);
  assert.equal(w.documents.size, 0);
  assert.equal(w.durableCustomers.get(CONTACT).relationship.id, RELATIONSHIP);
});

test("field, photo and conversation edits remain unnumbered and outside Saved Files", async () => {
  const w = workspace();
  await w.handlers.completeResolvedNewQuote(destination);
  w.scope.quote.projectDescription = "Repair wall";
  w.scope.photos = [{ id: "local-photo", pendingFile: { name: "wall.jpg" } }];
  w.scope.turns = [{ id: "instruction", documentType: "quote", text: "Repair wall", recognized: true }];
  assert.equal(w.presentation().dirty, true);
  assert.equal(w.presentation().savedAt, "");
  assert.equal(w.documents.size, 0);
  assert.equal(w.scope.lastNumber, 2);
  assert.equal(w.scope.quote.quoteNumber, "");
  assert.equal(w.scope.savedDocuments.quote, null);
  assert.ok(!w.events.some(([event]) => event === "create"));
});

test("first deliberate Save creates exact customer Quote, number and confirmed Saved status", async () => {
  const w = workspace();
  await w.handlers.completeResolvedNewQuote(destination);
  const saved = await w.handlers.saveDocument("quote");
  assert.ok(saved, w.scope.saveState.error);
  assert.equal(saved.documentNumber, "Q-0000003");
  assert.deepEqual(saved.customerParty, destination.customerParty);
  assert.equal(saved.content.customerName, "Bob");
  assert.equal(w.documents.size, 1);
  assert.equal(w.presentation().label, "Saved ✓");
  assert.equal(w.presentation().savedAt, "2026-09-07T12:00:00Z");
});

for (const failSave of [false, true]) {
  test(`Save Draft & Exit ${failSave ? "failure stays open and unsaved" : "saves before exiting"}`, async () => {
    const w = workspace({ failSave });
    await w.handlers.completeResolvedNewQuote(destination);
    w.handlers.requestExit(() => w.events.push(["exit"]));
    await w.handlers.saveAllAndExit();
    assert.equal(w.events.some(([event]) => event === "exit"), !failSave);
    assert.equal(w.documents.size, failSave ? 0 : 1);
    assert.equal(w.scope.lastNumber, failSave ? 2 : 3);
    if (failSave) {
      assert.equal(w.scope.saveFailureOpen, true);
      assert.equal(w.presentation().savedAt, "");
      assert.equal(w.scope.quote.customerName, "Bob");
    } else assert.ok(w.events.findIndex(([event]) => event === "create") < w.events.findIndex(([event]) => event === "exit"));
  });
}

test("numbering setup belongs to deliberate Save & Exit and successful setup resumes that exit", async () => {
  const w = workspace({ initialized: false });
  await w.handlers.completeResolvedNewQuote(destination);
  assert.equal(w.scope.numberingSetup, undefined);
  w.handlers.requestExit(() => w.events.push(["exit"]));
  await w.handlers.saveAllAndExit();
  assert.equal(w.documents.size, 0);
  assert.equal(w.events.some(([event]) => event === "exit"), false);
  assert.equal(w.scope.numberingSetup.documentType, "quote");
  w.scope.numberingSetup.mode = "START_NEW";
  await w.handlers.submitNumberingSetup();
  assert.equal(w.documents.size, 1, w.scope.saveState.error);
  assert.equal(w.events.filter(([event]) => event === "exit").length, 1);
  assert.equal(w.scope.lastNumber, 3);
});

test("discard restores exact last saved content and customer without deleting numbered record", async () => {
  const w = workspace();
  await w.handlers.completeResolvedNewQuote(destination);
  const saved = await w.handlers.saveDocument("quote");
  w.scope.quote.projectTitle = "Unsaved edit";
  await w.handlers.persistCustomerLink({ ...contact, id: "44444444-4444-4444-8444-444444444444", displayName: "Alice" }, relationship, { replace: true });
  assert.equal(w.documents.get(saved.id).content.customerName, "Bob");
  assert.equal(w.presentation().dirty, true);
  assert.equal(w.presentation().savedAt, "");
  w.handlers.requestExit(() => w.events.push(["exit"]));
  w.scope.pendingQuoteProposal = { id: "unsaved-proposal" };
  await w.handlers.discardAndExit();
  assert.equal(w.scope.pendingQuoteProposal, null);
  assert.equal(w.scope.quote.customerName, "Bob");
  assert.equal(w.scope.quote.projectTitle, saved.content.projectTitle);
  assert.equal(w.scope.savedDocuments.quote.documentNumber, "Q-0000003");
  assert.equal(w.documents.get(saved.id), saved);
  assert.equal(w.scope.recovery, null);
  assert.equal(w.scope.lastNumber, 3);
});

test("customer linking on new Quote never saves; existing Quote updates retain exact number", async () => {
  const w = workspace();
  await w.handlers.persistCustomerLink(contact, relationship);
  assert.equal(w.documents.size, 0);
  assert.equal(w.presentation().savedAt, "");
  const first = await w.handlers.saveDocument("quote");
  w.scope.quote.projectTitle = "Revised title";
  const updated = await w.handlers.saveDocument("quote");
  assert.equal(updated.id, first.id);
  assert.equal(updated.documentNumber, first.documentNumber);
  assert.equal(updated.version, 2);
  assert.equal(w.scope.lastNumber, 3);
});

test("Invoice new-document helper still performs governed CREATE with a distinct number", async () => {
  const w = workspace();
  const invoice = await w.handlers.createAndOpenNewDocument("invoice", null);
  assert.ok(invoice, w.scope.notice);
  assert.equal(invoice.documentType, "INVOICE");
  assert.equal(invoice.documentNumber, "INV-0000003");
  assert.equal(w.documents.size, 1);
  assert.ok(w.events.some(([event]) => event === "opened"));
});

test("internal Quote reference is never presented as an official number", () => {
  const w = workspace();
  assert.equal(w.handlers.displayDocumentNumber({ documentType: "QUOTE", reference: "WD-SECRET" }), "Unnumbered draft");
  assert.equal(w.handlers.displayDocumentNumber({ documentType: "QUOTE", reference: "WD-SECRET", documentNumber: "Q-0000003" }), "Q-0000003");
});


test("creating External Customer durably establishes role and relationship independently of discarded Quote", async () => {
  const w = workspace({ initialized: false });
  w.durableCustomers.clear();
  w.scope.newQuoteSetup = { ...w.handlers.emptyNewQuoteSetup(), form: { displayName: "Bob", partyType: "PERSON" } };
  await w.handlers.createExternalQuoteCustomer();
  assert.equal(w.scope.newQuoteSetup.open, false, w.scope.newQuoteSetup.error);
  assert.deepEqual(w.events.filter(([event]) => ["create-contact", "assign-role", "establish-relationship"].includes(event)).map(([event]) => event), ["create-contact", "assign-role", "establish-relationship"]);
  assert.equal(w.documents.size, 0);
  assert.equal(w.scope.lastNumber, 2);
  assert.equal(w.scope.numberingSetup, undefined);
  w.handlers.requestExit(() => w.events.push(["exit"]));
  await w.handlers.discardAndExit();
  assert.equal(w.durableCustomers.get(CONTACT).relationship.id, RELATIONSHIP);
  assert.deepEqual(w.durableCustomers.get(CONTACT).contact.roles, ["CUSTOMER"]);
  assert.equal(w.documents.size, 0);
  assert.equal(w.scope.recovery, null);
});

test("Keep Editing clears pending exit so a later Save cannot navigate unexpectedly", async () => {
  const w = workspace({ initialized: false });
  await w.handlers.completeResolvedNewQuote(destination);
  w.handlers.requestExit(() => w.events.push(["exit"]));
  w.handlers.keepEditingBeforeExit();
  assert.equal(w.scope.pendingExitRef.current, null);
  assert.equal(w.scope.exitDialogOpen, false);
  await w.handlers.saveDocument("quote");
  w.scope.numberingSetup.mode = "START_NEW";
  await w.handlers.submitNumberingSetup();
  assert.equal(w.documents.size, 1);
  assert.equal(w.events.some(([event]) => event === "exit"), false);
});

test("cancelling numbering setup cancels Save & Exit without numbering or leaving", async () => {
  const w = workspace({ initialized: false });
  await w.handlers.completeResolvedNewQuote(destination);
  w.handlers.requestExit(() => w.events.push(["exit"]));
  await w.handlers.saveAllAndExit();
  w.handlers.cancelNumberingSetup();
  assert.equal(w.scope.pendingExitRef.current, null);
  assert.equal(w.scope.numberingSetup, null);
  assert.equal(w.documents.size, 0);
  assert.equal(w.scope.lastNumber, 2);
  assert.equal(w.events.some(([event]) => event === "exit"), false);
});

test("failed recovery removal keeps discard open rather than restoring discarded data later", async () => {
  const w = workspace();
  await w.handlers.completeResolvedNewQuote(destination);
  w.handlers.requestExit(() => w.events.push(["exit"]));
  w.scope.deleteBusinessDocumentRecovery = async () => false;
  await w.handlers.discardAndExit();
  assert.equal(w.scope.exitDialogOpen, true);
  assert.equal(w.scope.quote.customerName, "Bob");
  assert.equal(w.events.some(([event]) => event === "exit"), false);
  assert.equal(w.documents.size, 0);
});
