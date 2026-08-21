import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
  buildBusinessDocumentSavePayload,
  businessDocumentSnapshotFingerprint,
  customerVisibleBusinessDocumentPhotoGroups,
  customerVisibleBusinessDocumentPhotos,
  defaultBusinessDocumentPhotoAssignment,
  hasMeaningfulBusinessDocumentDraft,
  normalizeBusinessDocumentPhotoAssignment,
  restoreBusinessDocumentDraft,
} from "../src/utils/businessDocumentPersistence.js";

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

test("dirty fingerprints change for private reminders, edits, photo role, and visibility but are stable for identical snapshots", () => {
  const first = { payload: { content: { notes: "" } }, photos: [{ role: "BEFORE", visibility: "PRIVATE_INTERNAL" }] };
  assert.equal(businessDocumentSnapshotFingerprint(first), businessDocumentSnapshotFingerprint(structuredClone(first)));
  assert.notEqual(businessDocumentSnapshotFingerprint(first), businessDocumentSnapshotFingerprint({ ...first, photos: [{ role: "BEFORE", visibility: "CUSTOMER_VISIBLE" }] }));
  assert.notEqual(businessDocumentSnapshotFingerprint(first), businessDocumentSnapshotFingerprint({ ...first, privateReminder: "ladder" }));
});

test("workspace exposes real save/list/restore/exit/recovery flows without conflating Save and Send", () => {
  assert.match(workspace, /"Save Draft"/);
  assert.match(workspace, /Save Changes/);
  assert.match(workspace, /Saved ✓/);
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
