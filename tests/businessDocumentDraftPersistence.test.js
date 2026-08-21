import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { jsPDF } from "jspdf";

import {
  BusinessDocumentDraftError,
  createBusinessDocumentDraft,
  getBusinessDocumentDraft,
  listBusinessDocumentDrafts,
  updateBusinessDocumentDraft,
  validateBusinessDocumentDraft,
} from "../src/utils/businessDocumentDraftApi.js";
import {
  BUSINESS_DOCUMENT_RECOVERY_MAX_BYTES,
  BUSINESS_DOCUMENT_RECOVERY_TTL_MS,
  deleteBusinessDocumentRecovery,
  loadBusinessDocumentRecovery,
  saveBusinessDocumentRecovery,
} from "../src/utils/businessDocumentRecovery.js";
import {
  buildBusinessDocumentConversationTurn,
  buildBusinessDocumentSavePayload,
  businessDocumentPhotoVisibilityNotice,
  businessDocumentRestoredSnapshotFingerprint,
  businessDocumentSavePresentation,
  businessDocumentSnapshotFingerprint,
  businessDocumentTurnResponse,
  customerVisibleBusinessDocumentPhotoGroups,
  customerVisibleBusinessDocumentPhotos,
  defaultBusinessDocumentPhotoAssignment,
  hasMeaningfulBusinessDocumentDraft,
  normalizeBusinessDocumentPhotoAssignment,
  recoveryPhotoProjection,
  restoreBusinessDocumentDraft,
} from "../src/utils/businessDocumentPersistence.js";
import { reconcileBusinessDocumentInstructions } from "../src/utils/businessDocumentWorkspace.js";
import {
  attachCustomerDocumentPhotoEvidence,
  buildQuickQuoteDocumentModel,
} from "../src/utils/customerDocumentModel.js";
import {
  collectCustomerDocumentText,
  prepareCustomerDocumentPdfModel,
  renderCustomerDocumentPdf,
} from "../src/utils/customerDocumentPdf.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const styles = read("src/components/UnifiedBusinessDocumentWorkspace.css");
const quoteBuilder = read("src/pages/QuoteBuilder.jsx");
const recoverySource = read("src/utils/businessDocumentRecovery.js");

const DRAFT_ID = "11111111-1111-4111-8111-111111111111";
const JOB_ID = "22222222-2222-4222-8222-222222222222";
const KEY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function photo(overrides = {}) {
  return {
    id: "meetro/businesses/10/quote-drafts/fan",
    name: "fan.jpg",
    media: {
      public_id: "meetro/businesses/10/quote-drafts/fan",
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/meetro/businesses/10/quote-drafts/fan.jpg",
      resource_type: "image",
      format: "jpg",
      bytes: 1200,
      width: 800,
      height: 600,
      version: 1,
    },
    role: "BEFORE",
    visibility: "PRIVATE_INTERNAL",
    displayOrder: 0,
    version: 1,
    ...overrides,
  };
}

function draft(overrides = {}) {
  return {
    id: DRAFT_ID,
    documentType: "QUOTE",
    status: "WORKING_DRAFT",
    reference: "WQ-11111111",
    jobId: JOB_ID,
    version: 1,
    createdAt: "2026-08-21T12:00:00.000Z",
    updatedAt: "2026-08-21T12:00:00.000Z",
    content: { customerName: "Jack Smith", projectTitle: "Fan replacement", materialItems: [{ name: "Fan", total: "89.99" }], laborItems: [{ description: "Installation", total: "180" }] },
    workspace: { activeDocument: "QUOTE", instructions: [], manualOverrides: {}, privateReminders: [] },
    photos: [photo()],
    ...overrides,
  };
}

function successfulFetch(document = draft(), calls = []) {
  return async (endpoint, options) => {
    calls.push({ endpoint, options });
    return { response: { ok: true, status: options.method === "POST" ? 201 : 200 }, data: { success: true, document, documents: [document] } };
  };
}

test("draft transport creates, updates, lists, and reopens governed server projections", async () => {
  const calls = [];
  const authFetchImpl = successfulFetch(draft(), calls);
  const payload = { documentType: "QUOTE", jobId: JOB_ID, content: {}, workspace: {}, photos: [] };
  assert.equal((await createBusinessDocumentDraft({ payload, idempotencyKey: KEY, authFetchImpl })).id, DRAFT_ID);
  assert.equal((await updateBusinessDocumentDraft({ draftId: DRAFT_ID, expectedVersion: 1, payload, idempotencyKey: KEY, authFetchImpl })).version, 1);
  assert.equal((await getBusinessDocumentDraft({ draftId: DRAFT_ID, authFetchImpl })).reference, "WQ-11111111");
  assert.equal((await listBusinessDocumentDrafts({ search: "Jack Smith", type: "QUOTE", authFetchImpl })).length, 1);
  assert.equal(calls[0].endpoint, "/business-document-drafts");
  assert.equal(calls[0].options.headers["Idempotency-Key"], KEY);
  assert.match(calls[1].endpoint, new RegExp(DRAFT_ID));
  assert.equal(JSON.parse(calls[1].options.body).expectedVersion, 1);
  assert.match(calls[3].endpoint, /search=Jack\+Smith/);
});

test("invalid server projections and governed conflicts fail closed", async () => {
  assert.equal(validateBusinessDocumentDraft({ ...draft(), status: "ISSUED" }), null);
  await assert.rejects(
    createBusinessDocumentDraft({
      payload: {}, idempotencyKey: KEY,
      authFetchImpl: async () => ({ response: { ok: false, status: 409 }, data: { success: false, code: "BUSINESS_DOCUMENT_VERSION_CONFLICT", currentVersion: 3, message: "newer" } }),
    }),
    (error) => error instanceof BusinessDocumentDraftError && error.status === 409 && error.currentVersion === 3
  );
});

test("R2 client opens, edits, reconciles, and expands an R1 saved conversation turn", async () => {
  const legacyText = "fan replacement for Jack Smith. fan cost 89.99 installation cost 180.00";
  const legacyDocument = draft({
    workspace: {
      activeDocument: "QUOTE",
      instructions: [{
        id: "legacy-turn-1",
        documentType: "QUOTE",
        text: legacyText,
        recognized: true,
        revisions: 0,
        revisionHistory: [],
      }],
      manualOverrides: { terms: "Due on acceptance" },
      privateReminders: [],
    },
  });
  const loaded = await getBusinessDocumentDraft({
    draftId: DRAFT_ID,
    authFetchImpl: successfulFetch(legacyDocument),
  });
  const restored = restoreBusinessDocumentDraft(loaded);
  assert.equal(restored.turns[0].text, legacyText);
  assert.equal(restored.turns[0].originalText, legacyText);
  assert.equal(restored.turns[0].responseText, "Quote working draft updated. Review the live document.");
  assert.equal(businessDocumentTurnResponse({ documentType: "invoice", recognized: true }), "Invoice working draft updated. Review the live document.");
  assert.equal(restored.turns[0].privateReminder, false);
  assert.equal(restored.turns[0].photoIntent, null);
  assert.equal(Object.hasOwn(restored.turns[0], "createdAt"), false);
  assert.equal(Object.hasOwn(restored.turns[0], "updatedAt"), false);

  const edited = buildBusinessDocumentConversationTurn({
    id: restored.turns[0].id,
    documentType: "quote",
    instruction: "fan replacement for Jack Smith. fan cost 89.99 installation cost 200.00",
    current: restored.content,
    previousTurn: restored.turns[0],
    now: "2026-08-21T12:05:00.000Z",
  });
  assert.equal(Object.hasOwn(edited.turn, "createdAt"), false);
  assert.equal(edited.turn.updatedAt, "2026-08-21T12:05:00.000Z");
  assert.deepEqual(edited.turn.revisionHistory, [legacyText]);
  const reconciled = reconcileBusinessDocumentInstructions({
    documentType: "quote",
    instructions: [edited.turn],
    manualOverrides: restored.manualOverrides,
  });
  assert.deepEqual(reconciled.draft.laborItems, [{ description: "installation", total: "200" }]);
  assert.doesNotMatch(JSON.stringify(reconciled.draft), /180/);

  const r2Payload = buildBusinessDocumentSavePayload({
    documentType: "quote",
    content: reconciled.draft,
    turns: [edited.turn],
    manualOverrides: restored.manualOverrides,
    photos: restored.photos,
    photoAssignments: restored.photoAssignments,
    jobId: restored.jobId,
  });
  const expanded = r2Payload.workspace.instructions[0];
  assert.equal(expanded.originalText, legacyText);
  assert.equal(expanded.responseText, "Quote working draft updated. Review the live document.");
  assert.equal(expanded.privateReminder, false);
  assert.equal(expanded.photoIntent, null);
  assert.equal(Object.hasOwn(expanded, "createdAt"), false);
  assert.equal(expanded.updatedAt, "2026-08-21T12:05:00.000Z");
});

test("legacy server metadata may be omitted while malformed supplied R2 metadata fails closed", () => {
  const legacyInstruction = {
    id: "legacy-turn-1",
    documentType: "QUOTE",
    text: "Replace the fan.",
    recognized: true,
    revisions: 0,
    revisionHistory: [],
  };
  const legacyDocument = draft({
    workspace: {
      activeDocument: "QUOTE",
      instructions: [legacyInstruction],
      manualOverrides: {},
      privateReminders: [],
    },
  });
  assert.ok(validateBusinessDocumentDraft(legacyDocument));

  const invalidCases = [
    { originalText: 42 },
    { originalText: "" },
    { responseText: {} },
    { privateReminder: "false" },
    { photoIntent: "GENERAL" },
    { createdAt: 0 },
    { updatedAt: "not-a-timestamp" },
  ];
  for (const invalidMetadata of invalidCases) {
    assert.equal(validateBusinessDocumentDraft({
      ...legacyDocument,
      workspace: {
        ...legacyDocument.workspace,
        instructions: [{ ...legacyInstruction, ...invalidMetadata }],
      },
    }), null);
  }
});

function memoryRecoveryRepository() {
  const records = new Map();
  return {
    records,
    async put(record) { records.set(record.identityKey, structuredClone(record)); },
    async get(key) { return records.has(key) ? structuredClone(records.get(key)) : undefined; },
    async delete(key) { records.delete(key); },
  };
}

test("IndexedDB recovery is noncanonical, user-scoped, bounded, expiring, and explicitly removable", async () => {
  const repository = memoryRecoveryRepository();
  const snapshot = { activeDocument: "quote", content: { customerName: "Jack Smith" }, pendingPhoto: new Blob(["photo"]) };
  const saved = await saveBusinessDocumentRecovery({ identityKey: "7", snapshot, now: 1000, repository });
  assert.equal(saved.record.classification, "NONCANONICAL_LOCAL_RECOVERY");
  assert.equal(Date.parse(saved.record.expiresAt) - Date.parse(saved.record.savedAt), BUSINESS_DOCUMENT_RECOVERY_TTL_MS);
  assert.deepEqual((await loadBusinessDocumentRecovery({ identityKey: "7", now: 2000, repository })).snapshot.content, snapshot.content);
  assert.equal(await loadBusinessDocumentRecovery({ identityKey: "8", now: 2000, repository }), null);
  assert.equal(await deleteBusinessDocumentRecovery({ identityKey: "7", repository }), true);
  assert.equal(await loadBusinessDocumentRecovery({ identityKey: "7", repository }), null);
  const tooLarge = await saveBusinessDocumentRecovery({ identityKey: "7", snapshot: { image: new Blob([new Uint8Array(BUSINESS_DOCUMENT_RECOVERY_MAX_BYTES + 1)]) }, repository });
  assert.equal(tooLarge.code, "RECOVERY_TOO_LARGE");
  assert.doesNotMatch(recoverySource, /localStorage|sessionStorage/);
});

test("expired recovery is deleted without becoming a Saved File", async () => {
  const repository = memoryRecoveryRepository();
  await saveBusinessDocumentRecovery({ identityKey: "7", snapshot: { quote: true }, now: 0, repository });
  assert.equal(await loadBusinessDocumentRecovery({ identityKey: "7", now: BUSINESS_DOCUMENT_RECOVERY_TTL_MS + 1, repository }), null);
  assert.equal(repository.records.size, 0);
});

test("save payload preserves instructions, manual overrides, private reminders, Job, and separate photo authority", () => {
  const photos = [{ id: photo().id, name: "fan.jpg", media: photo().media }];
  const payload = buildBusinessDocumentSavePayload({
    documentType: "quote",
    jobId: JOB_ID,
    content: draft().content,
    turns: [{ id: "turn-1", documentType: "quote", text: "Keep this private: bring a ladder", recognized: true, revisions: 1, revisionHistory: ["bring ladder"] }],
    manualOverrides: { terms: "Due on acceptance" },
    photos,
    photoAssignments: { [photo().id]: { role: "BEFORE", visibility: "PRIVATE_INTERNAL" } },
  });
  assert.equal(payload.jobId, JOB_ID);
  assert.equal(payload.workspace.instructions[0].revisions, 1);
  assert.equal(payload.workspace.privateReminders[0].text, "Keep this private: bring a ladder");
  assert.equal(payload.photos[0].role, "BEFORE");
  assert.equal(payload.photos[0].visibility, "PRIVATE_INTERNAL");
  assert.equal(hasMeaningfulBusinessDocumentDraft(payload), true);
});

test("restore resumes exact content, instructions, manual state, and durable photo association", () => {
  const restored = restoreBusinessDocumentDraft(draft());
  assert.equal(restored.documentType, "quote");
  assert.equal(restored.content.customerName, "Jack Smith");
  assert.equal(restored.photos[0].media.public_id, photo().media.public_id);
  assert.deepEqual(restored.photoAssignments[photo().id], { role: "BEFORE", visibility: "PRIVATE_INTERNAL" });
  assert.equal(restored.jobId, JOB_ID);
});

test("governed save and reopen restore the exact working conversation and edited pricing history", () => {
  const originalText = "fan replacement for Jack Smith. fan cost 89.99 installation cost 180.00";
  const original = buildBusinessDocumentConversationTurn({
    id: "professional-instruction-1",
    documentType: "quote",
    instruction: originalText,
    now: "2026-08-21T12:00:00.000Z",
  });
  const initial = reconcileBusinessDocumentInstructions({
    documentType: "quote",
    instructions: [original.turn],
  });
  const firstPayload = buildBusinessDocumentSavePayload({
    documentType: "quote",
    content: initial.draft,
    turns: [original.turn],
  });
  const firstReopen = restoreBusinessDocumentDraft(draft({
    content: firstPayload.content,
    workspace: firstPayload.workspace,
    photos: [],
  }));

  assert.equal(firstReopen.turns[0].documentType, "quote");
  assert.equal(firstReopen.turns[0].text, originalText);
  assert.equal(firstReopen.turns[0].originalText, originalText);
  assert.equal(firstReopen.turns[0].responseText, "Quote working draft updated. Review the live document.");
  assert.equal(businessDocumentTurnResponse(firstReopen.turns[0]), firstReopen.turns[0].responseText);
  assert.equal(firstReopen.content.customerName, "Jack Smith");
  assert.equal(firstReopen.content.projectTitle, "Fan replacement");
  assert.deepEqual(firstReopen.content.materialItems, [{ name: "Fan", total: "89.99" }]);
  assert.deepEqual(firstReopen.content.laborItems, [{ description: "installation", total: "180" }]);
  const customerOutput = collectCustomerDocumentText(buildQuickQuoteDocumentModel({
    ...firstReopen.content,
    lineItems: [
      { description: "Fan", total: "89.99", pricingPresentation: "flat" },
      { description: "Installation", total: "180", pricingPresentation: "flat" },
    ],
    total: "269.99",
  }, { branding: { businessName: "Handyman LLC" } }));
  assert.doesNotMatch(customerOutput, new RegExp(originalText));
  assert.doesNotMatch(customerOutput, /Quote working draft updated\. Review the live document\./);

  const edited = buildBusinessDocumentConversationTurn({
    id: original.turn.id,
    documentType: "quote",
    instruction: "fan replacement for Jack Smith. fan cost 89.99 installation cost 200.00",
    previousTurn: firstReopen.turns[0],
    current: firstReopen.content,
    now: "2026-08-21T12:05:00.000Z",
  });
  const reconciledEdit = reconcileBusinessDocumentInstructions({
    documentType: "quote",
    instructions: [edited.turn],
  });
  assert.deepEqual(reconciledEdit.draft.laborItems, [{ description: "installation", total: "200" }]);
  assert.equal(Number(reconciledEdit.draft.materialItems[0].total) + Number(reconciledEdit.draft.laborItems[0].total), 289.99);
  assert.doesNotMatch(JSON.stringify(reconciledEdit.draft), /180/);

  const secondPayload = buildBusinessDocumentSavePayload({
    documentType: "quote",
    content: reconciledEdit.draft,
    turns: [edited.turn],
  });
  const secondReopen = restoreBusinessDocumentDraft(draft({
    content: secondPayload.content,
    workspace: secondPayload.workspace,
    photos: [],
  }));
  assert.equal(secondReopen.turns[0].text, edited.turn.text);
  assert.equal(secondReopen.turns[0].revisions, 1);
  assert.deepEqual(secondReopen.turns[0].revisionHistory, [originalText]);
  assert.equal(secondReopen.turns[0].originalText, originalText);
  assert.equal(secondReopen.turns[0].createdAt, "2026-08-21T12:00:00.000Z");
  assert.equal(secondReopen.turns[0].updatedAt, "2026-08-21T12:05:00.000Z");
});

test("photo presentation admits only explicit customer-visible General, Before, and After evidence", () => {
  const photos = [
    { id: "general-private" },
    { id: "general-visible" },
    { id: "before-private" },
    { id: "before-visible" },
    { id: "after-private" },
    { id: "after-visible" },
    { id: "unclassified-visible" },
  ];
  const assignments = {
    "general-private": { role: "GENERAL_EVIDENCE", visibility: "PRIVATE_INTERNAL" },
    "general-visible": { role: "GENERAL_EVIDENCE", visibility: "CUSTOMER_VISIBLE" },
    "before-private": { role: "BEFORE", visibility: "PRIVATE_INTERNAL" },
    "before-visible": { role: "BEFORE", visibility: "CUSTOMER_VISIBLE" },
    "after-private": { role: "AFTER", visibility: "PRIVATE_INTERNAL" },
    "after-visible": { role: "AFTER", visibility: "CUSTOMER_VISIBLE" },
    "unclassified-visible": { role: "UNCLASSIFIED", visibility: "CUSTOMER_VISIBLE" },
  };
  assert.deepEqual(customerVisibleBusinessDocumentPhotos(photos, assignments), [
    { id: "general-visible" },
    { id: "before-visible" },
    { id: "after-visible" },
  ]);
  assert.deepEqual(customerVisibleBusinessDocumentPhotoGroups(photos, assignments), {
    general: [{ id: "general-visible" }],
    before: [{ id: "before-visible" }],
    after: [{ id: "after-visible" }],
  });
  assert.deepEqual(defaultBusinessDocumentPhotoAssignment(), { role: "UNCLASSIFIED", visibility: "PRIVATE_INTERNAL" });
});

test("customer visibility normalizes Unclassified to General Evidence without making role selection visible", () => {
  assert.deepEqual(normalizeBusinessDocumentPhotoAssignment({
    role: "UNCLASSIFIED",
    visibility: "CUSTOMER_VISIBLE",
  }), {
    role: "GENERAL_EVIDENCE",
    visibility: "CUSTOMER_VISIBLE",
  });
  assert.deepEqual(normalizeBusinessDocumentPhotoAssignment({
    role: "GENERAL_EVIDENCE",
    visibility: "PRIVATE_INTERNAL",
  }), {
    role: "GENERAL_EVIDENCE",
    visibility: "PRIVATE_INTERNAL",
  });
  assert.deepEqual(normalizeBusinessDocumentPhotoAssignment({
    role: "UNKNOWN",
    visibility: "CUSTOMER_VISIBLE",
  }), {
    role: "UNCLASSIFIED",
    visibility: "PRIVATE_INTERNAL",
  });
});

test("save and reopen preserve normalized General Evidence customer visibility", () => {
  const durablePhoto = { id: photo().id, name: "fan.jpg", media: photo().media };
  const payload = buildBusinessDocumentSavePayload({
    documentType: "quote",
    content: draft().content,
    photos: [durablePhoto],
    photoAssignments: {
      [durablePhoto.id]: { role: "UNCLASSIFIED", visibility: "CUSTOMER_VISIBLE" },
    },
  });
  assert.equal(payload.photos[0].role, "GENERAL_EVIDENCE");
  assert.equal(payload.photos[0].visibility, "CUSTOMER_VISIBLE");
  const restored = restoreBusinessDocumentDraft(draft({ photos: payload.photos }));
  assert.deepEqual(restored.photoAssignments[durablePhoto.id], {
    role: "GENERAL_EVIDENCE",
    visibility: "CUSTOMER_VISIBLE",
  });
});

test("saved customer-visible Quote photo remains attached after reopen and renders in the PDF", async () => {
  const visibleId = "meetro/businesses/10/quote-drafts/customer-visible";
  const privateId = "meetro/businesses/10/quote-drafts/private-after";
  const visiblePhoto = {
    id: visibleId,
    name: "visible.jpg",
    media: {
      ...photo().media,
      public_id: visibleId,
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/meetro/businesses/10/quote-drafts/customer-visible.jpg",
    },
  };
  const privatePhoto = {
    id: privateId,
    name: "private.jpg",
    media: {
      ...photo().media,
      public_id: privateId,
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/meetro/businesses/10/quote-drafts/private-after.jpg",
    },
  };
  const payload = buildBusinessDocumentSavePayload({
    documentType: "quote",
    content: draft().content,
    photos: [visiblePhoto, privatePhoto],
    photoAssignments: {
      [visibleId]: { role: "GENERAL_EVIDENCE", visibility: "CUSTOMER_VISIBLE" },
      [privateId]: { role: "AFTER", visibility: "PRIVATE_INTERNAL" },
    },
  });
  const restored = restoreBusinessDocumentDraft(draft({ photos: payload.photos }));
  const groups = customerVisibleBusinessDocumentPhotoGroups(restored.photos, restored.photoAssignments);
  const attached = attachCustomerDocumentPhotoEvidence(buildQuickQuoteDocumentModel({
    customerName: "Jack Smith",
    projectTitle: "Fan replacement",
    lineItems: [],
    subtotal: 0,
    total: 269,
  }, { branding: { businessName: "Handyman LLC" } }), groups);

  assert.equal(restored.photos.find((item) => item.id === visibleId)?.media.public_id, visibleId);
  assert.equal(restored.photoAssignments[visibleId].visibility, "CUSTOMER_VISIBLE");
  assert.equal(restored.photoAssignments[privateId].visibility, "PRIVATE_INTERNAL");
  assert.equal(attached.photoEvidence.projectPhotos[0].mediaId, visibleId);
  assert.equal(attached.photoEvidence.afterPhotos.length, 0);
  assert.doesNotMatch(collectCustomerDocumentText(attached), new RegExp(privateId));

  const prepared = await prepareCustomerDocumentPdfModel(attached, {
    fetchImpl: async () => ({
      ok: true,
      blob: async () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }),
    }),
  });
  const images = [];
  class RecordingJsPDF extends jsPDF {
    constructor(...args) {
      super(...args);
      this.addImage = (...imageArgs) => {
        images.push(imageArgs);
        return this;
      };
    }
  }
  const pdf = renderCustomerDocumentPdf(prepared, { jsPDFImpl: RecordingJsPDF });
  const commands = pdf.internal.pages.flat().join("\n");
  assert.match(commands, /Project Photos \/ Evidence/);
  assert.equal(images.length, 1);
});

test("dirty fingerprints change for private reminders, edits, photo role, and visibility but are stable for identical snapshots", () => {
  const first = { payload: { content: { notes: "" } }, photos: [{ role: "BEFORE", visibility: "PRIVATE_INTERNAL" }] };
  assert.equal(businessDocumentSnapshotFingerprint(first), businessDocumentSnapshotFingerprint(structuredClone(first)));
  assert.notEqual(businessDocumentSnapshotFingerprint(first), businessDocumentSnapshotFingerprint({ ...first, photos: [{ role: "BEFORE", visibility: "CUSTOMER_VISIBLE" }] }));
  assert.notEqual(businessDocumentSnapshotFingerprint(first), businessDocumentSnapshotFingerprint({ ...first, privateReminder: "ladder" }));
});

test("photo notice distinguishes all-private, mixed, and all-customer-visible collections", () => {
  const photos = [{ id: "one" }, { id: "two" }];
  assert.equal(businessDocumentPhotoVisibilityNotice(photos, {
    one: { role: "BEFORE", visibility: "PRIVATE_INTERNAL" },
    two: { role: "AFTER", visibility: "PRIVATE_INTERNAL" },
  }), "Photos are private and will not appear on customer documents.");
  assert.equal(businessDocumentPhotoVisibilityNotice(photos, {
    one: { role: "UNCLASSIFIED", visibility: "PRIVATE_INTERNAL" },
    two: { role: "GENERAL_EVIDENCE", visibility: "CUSTOMER_VISIBLE" },
  }), "Customer-visible photos will appear on the document. Private photos remain internal.");
  assert.equal(businessDocumentPhotoVisibilityNotice(photos, {
    one: { role: "BEFORE", visibility: "CUSTOMER_VISIBLE" },
    two: { role: "AFTER", visibility: "CUSTOMER_VISIBLE" },
  }), "Customer-visible photos will appear on the document. Private photos remain internal.");
});

test("exact governed reopen is clean until a genuine change and becomes clean after resave", () => {
  const mainTurn = buildBusinessDocumentConversationTurn({
    id: "turn-main",
    documentType: "quote",
    instruction: "fan replacement for Jack Smith. fan cost 89.99 installation cost 180.00",
    now: "2026-08-21T12:00:00.000Z",
  }).turn;
  const privateTurn = buildBusinessDocumentConversationTurn({
    id: "turn-private",
    documentType: "quote",
    instruction: "Keep this private: bring a ladder",
    now: "2026-08-21T12:01:00.000Z",
  }).turn;
  const privatePhoto = photo();
  const visiblePhoto = photo({
    id: "meetro/businesses/10/quote-drafts/after",
    name: "after.jpg",
    media: {
      ...photo().media,
      public_id: "meetro/businesses/10/quote-drafts/after",
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/meetro/businesses/10/quote-drafts/after.jpg",
    },
  });
  const photos = [privatePhoto, visiblePhoto];
  const assignments = {
    [privatePhoto.id]: { role: "BEFORE", visibility: "PRIVATE_INTERNAL" },
    [visiblePhoto.id]: { role: "AFTER", visibility: "CUSTOMER_VISIBLE" },
  };
  const savedPayload = buildBusinessDocumentSavePayload({
    documentType: "quote",
    jobId: JOB_ID,
    content: draft().content,
    turns: [mainTurn, privateTurn],
    manualOverrides: { terms: "Due on acceptance" },
    photos,
    photoAssignments: assignments,
  });
  const savedRecoveryPhotos = recoveryPhotoProjection(photos, assignments);
  const savedFingerprint = businessDocumentSnapshotFingerprint({ payload: savedPayload, recoveryPhotos: savedRecoveryPhotos });
  const savedDocument = draft({
    content: savedPayload.content,
    workspace: savedPayload.workspace,
    photos: savedPayload.photos,
    updatedAt: "2026-08-21T12:02:00.000Z",
  });

  const reopenedFingerprint = businessDocumentRestoredSnapshotFingerprint(savedDocument);
  assert.equal(reopenedFingerprint, savedFingerprint);
  const clean = businessDocumentSavePresentation({
    savedDocument,
    currentFingerprint: reopenedFingerprint,
    savedFingerprint,
    hasMeaningfulContent: true,
  });
  assert.equal(clean.dirty, false);
  assert.equal(clean.label, "Saved ✓");
  assert.equal(clean.savedAt, "2026-08-21T12:02:00.000Z");
  assert.notEqual(clean.label, "Save Changes");

  const changedPayload = {
    ...savedPayload,
    content: { ...savedPayload.content, notes: "Customer requested quiet arrival." },
  };
  const changedFingerprint = businessDocumentSnapshotFingerprint({ payload: changedPayload, recoveryPhotos: savedRecoveryPhotos });
  const changed = businessDocumentSavePresentation({
    savedDocument,
    currentFingerprint: changedFingerprint,
    savedFingerprint,
    hasMeaningfulContent: true,
  });
  assert.equal(changed.dirty, true);
  assert.equal(changed.label, "Save Changes");
  assert.equal(changed.savedAt, "");

  const resavedDocument = draft({
    content: changedPayload.content,
    workspace: changedPayload.workspace,
    photos: changedPayload.photos,
    version: 2,
    updatedAt: "2026-08-21T12:05:00.000Z",
  });
  const resavedFingerprint = businessDocumentRestoredSnapshotFingerprint(resavedDocument);
  assert.equal(resavedFingerprint, changedFingerprint);
  const cleanAgain = businessDocumentSavePresentation({
    savedDocument: resavedDocument,
    currentFingerprint: resavedFingerprint,
    savedFingerprint: changedFingerprint,
    hasMeaningfulContent: true,
  });
  assert.equal(cleanAgain.dirty, false);
  assert.equal(cleanAgain.label, "Saved ✓");
  assert.equal(cleanAgain.savedAt, "2026-08-21T12:05:00.000Z");
});

test("workspace exposes real save/list/restore/exit/recovery flows without conflating Save and Send", () => {
  assert.match(workspace, /businessDocumentSavePresentation/);
  assert.match(workspace, /createBusinessDocumentDraft/);
  assert.match(workspace, /updateBusinessDocumentDraft/);
  assert.match(workspace, /listBusinessDocumentDrafts/);
  assert.match(workspace, /getBusinessDocumentDraft/);
  assert.match(workspace, /setDocumentJobIds\(\(current\) => \(\{ \.\.\.current, \[type\]: document\.jobId \|\| null \}\)\)/);
  assert.match(workspace, /jobId: documentJobIds\[documentType\]/);
  assert.match(workspace, /Save changes before leaving\?/);
  assert.match(workspace, /Save Draft & Exit/);
  assert.match(workspace, /Keep Editing/);
  assert.match(workspace, /Discard Changes/);
  assert.match(workspace, /Exit with Recovery/);
  assert.match(workspace, /function keepEditingAfterSaveFailure\(\)[\s\S]*pendingExitRef\.current = null/);
  assert.match(workspace, /function retryFailedSave\(\)[\s\S]*pendingExitRef\.current\)[\s\S]*saveAllAndExit\(\)/);
  assert.match(workspace, /Recover your last unsaved session\?/);
  assert.match(workspace, /Continue Where I Left Off/);
  assert.match(workspace, /Send Quote/);
  assert.match(workspace, /Save keeps this private working document for your business\. It does not send or issue anything\./);
  assert.match(workspace, /Nothing here issues, sends, approves, pays, or completes a document\./);
});

test("photo upload review supports defaults, apply-to-all, independent edits, persistence, and recovery", () => {
  assert.match(workspace, /Review document photos/);
  assert.match(workspace, /General \/ Unclassified/);
  assert.match(workspace, /PRIVATE_INTERNAL/);
  assert.match(workspace, /CUSTOMER_VISIBLE/);
  assert.match(workspace, /Apply role to all/);
  assert.match(workspace, /Apply visibility to all/);
  assert.match(workspace, /role and customer visibility are separate/i);
  assert.match(workspace, /normalizeBusinessDocumentPhotoAssignment/);
  assert.match(workspace, /Project Photos \/ Evidence/);
  assert.match(quoteBuilder, /pendingFile/);
  assert.match(quoteBuilder, /ensureWorkspacePhotosDurable/);
  assert.match(quoteBuilder, /quickQuotePersistedPhotoIdsRef/);
});

test("message editing has explicit Save/Cancel and conversation auto-follow respects intentional review", () => {
  assert.match(workspace, /aria-label="Edit prior instruction"/);
  assert.match(workspace, />Cancel</);
  assert.match(workspace, />Save</);
  assert.match(workspace, /revisionHistory/);
  assert.match(workspace, /nearNewestRef/);
  assert.match(workspace, /New message ↓/);
  assert.match(workspace, /scrollHeight - element\.scrollTop - element\.clientHeight < 72/);
});

test("recovery/exit/photo dialogs remain accessible and mobile-contained", () => {
  assert.match(workspace, /role="dialog" aria-modal="true" aria-labelledby/);
  assert.match(workspace, /event\.key === "Escape"/);
  assert.match(workspace, /beforeunload/);
  assert.match(styles, /\.business-document-confirm[^}]*max-height:\s*calc\(100dvh - 24px\)/);
  assert.match(styles, /\.business-photo-review-list select[^}]*min-height:\s*44px/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.business-document-confirm/);
  assert.doesNotMatch(styles, /overflow-x:\s*hidden/);
});
