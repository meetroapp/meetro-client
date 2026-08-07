import assert from "node:assert/strict";
import test from "node:test";

import {
  JOB_REQUEST_DRAFT_KEY,
  JOB_REQUEST_DRAFT_SOURCE,
  JOB_REQUEST_DRAFT_STAGE,
  JOB_REQUEST_DRAFT_UNCERTAINTY,
  addDraftPhotos,
  applyAssistantInference,
  applyAssistantSuggestion,
  applyHomeownerInput,
  buildJobRequestDraftCanonicalPayload,
  buildJobRequestReviewModel,
  clearDraftSubmission,
  confirmDraftField,
  createJobRequestDraft,
  createJobRequestDraftFromAssistantDraft,
  getJobRequestDraftGuidance,
  getJobRequestDraftReadiness,
  readJobRequestDraft,
  serializeJobRequestDraftForRecovery,
  setDraftSubmissionIntent,
  setDraftSubmissionSnapshot,
  setServiceClassification,
} from "../src/utils/jobRequestDraft.js";
import {
  buildAssistantRequestDraft,
  readAssistantRequestDraft,
  saveAssistantRequestDraft,
} from "../src/utils/assistantRequestDraft.js";

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed).map(([key, value]) => [key, String(value)]));

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function readyDraft() {
  let draft = createJobRequestDraft({
    draftId: "draft_local_only",
    createdAt: "2026-08-07T12:00:00.000Z",
    initialLocation: "123 Palm Ave",
  });
  draft = applyHomeownerInput(draft, {
    "job.title": "Paint the lanai",
    "job.description": "Please paint the lanai walls.",
  });
  return setServiceClassification(draft, {
    category: "painting",
    requestCategory: "painting",
    domain: "home_services",
    specialty: "painting",
    selectedServiceOptionId: "service:painting",
    displayLabel: "Painting",
  });
}

test("creates a local non-canonical draft identity with explicit version and empty lifecycle", () => {
  const draft = createJobRequestDraft({
    draftId: "draft_11111111-1111-4111-8111-111111111111",
    createdAt: "2026-08-07T12:00:00.000Z",
  });

  assert.equal(draft.version, 1);
  assert.equal(draft.localDraftId, "draft_11111111-1111-4111-8111-111111111111");
  assert.equal(draft.stage, JOB_REQUEST_DRAFT_STAGE.EMPTY);
  assert.equal(draft.readiness.isReady, false);
  assert.deepEqual(draft.readiness.missingRequiredFields, ["title", "service", "location"]);
  assert.equal(draft.readiness.nextRecommendedPrompt.code, "clarify_service");
  assert.equal(Object.hasOwn(draft, "id"), false);
  assert.equal(Object.hasOwn(draft, "postId"), false);
});

test("assistant suggestions cannot overwrite homeowner-confirmed fields", () => {
  let draft = createJobRequestDraft();
  draft = applyAssistantSuggestion(draft, {
    "job.title": "Leaky faucet",
    "job.description": "Assistant draft.",
  });
  draft = applyHomeownerInput(draft, {
    "job.title": "Kitchen sink leak",
  });
  draft = applyAssistantSuggestion(draft, {
    "job.title": "Bathroom faucet",
    "job.description": "Updated assistant wording.",
  });

  assert.equal(draft.job.title, "Kitchen sink leak");
  assert.equal(draft.job.description, "Assistant draft.");
  assert.equal(draft.fieldMeta.job.title.source, JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER);
  assert.equal(draft.fieldMeta.job.title.confirmed, true);
  assert.equal(draft.fieldMeta.job.description.source, JOB_REQUEST_DRAFT_SOURCE.ASSISTANT);
  assert.equal(draft.fieldMeta.job.description.confirmed, false);
});

test("Ask Meetro save writes the shared draft and stops writing legacy AI schemas", () => {
  const storage = createStorage();
  const assistantDraft = buildAssistantRequestDraft({
    userText: "I need a garage opener installed",
    recommendations: {
      businessType: "Garage Door Service",
      scope: ["Confirm opener model."],
      photos: [],
    },
    createdAt: "2026-08-07T12:00:00.000Z",
  });

  saveAssistantRequestDraft(storage, assistantDraft);

  const recovered = readJobRequestDraft(storage);
  assert.equal(recovered.job.title, "Garage opener installed");
  assert.equal(recovered.service.specialty, "garage_door_opener_installation");
  assert.equal(storage.getItem(JOB_REQUEST_DRAFT_KEY).includes("localDraftId"), true);
  assert.equal(storage.getItem("aiProjectDraft"), null);
  assert.equal(storage.getItem("aiBusinessRecommendation"), null);
  assert.equal(storage.getItem("aiProjectScope"), null);
});

test("legacy AI draft keys can still be read once for migration", () => {
  const storage = createStorage({
    aiProjectDraft: "I need a garage opener installed",
    aiBusinessRecommendation: "Garage Door Service",
    aiProjectScope: "Confirm opener model.",
  });

  const assistantDraft = readAssistantRequestDraft(storage);
  const sharedDraft = createJobRequestDraftFromAssistantDraft(assistantDraft);

  assert.equal(sharedDraft.job.title, "Garage opener installed");
  assert.equal(sharedDraft.service.category, "doorsWindows");
  assert.equal(sharedDraft.provenance.sources.includes(JOB_REQUEST_DRAFT_SOURCE.LEGACY_PREFILL), true);
  assert.equal(sharedDraft.fieldMeta.service.specialty.source, JOB_REQUEST_DRAFT_SOURCE.LEGACY_PREFILL);
});

test("recovery serialization strips raw File references and object URL authority", () => {
  const file = { name: "photo.jpg" };
  const revoke = () => {};
  const draft = addDraftPhotos(readyDraft(), [{
    localPhotoId: "photo-local-1",
    previewUrl: "blob:http://local/photo",
    file,
    revoke,
  }]);

  const serialized = serializeJobRequestDraftForRecovery(draft);

  assert.equal(serialized.media.photos[0].file, undefined);
  assert.equal(serialized.media.photos[0].revoke, undefined);
  assert.equal(serialized.media.photos[0].previewUrl, "");
});

test("readiness and review model remain non-canonical", () => {
  const draft = readyDraft();
  const readiness = getJobRequestDraftReadiness(draft);
  const review = buildJobRequestReviewModel(draft);

  assert.equal(readiness.isReady, true);
  assert.equal(readiness.readyForSubmit, true);
  assert.equal(review.title, "Paint the lanai");
  assert.equal(review.service.specialty, "painting");
  assert.equal(review.guidance.code, "add_timing");
  assert.equal(review.sections.some((section) => section.id === "service"), true);
  assert.equal(Object.hasOwn(review, "post"), false);
  assert.equal(Object.hasOwn(review, "conversation"), false);
});

test("readiness distinguishes missing, uncertain, warnings, and next guidance", () => {
  let draft = createJobRequestDraft();
  let readiness = getJobRequestDraftReadiness(draft);
  assert.equal(readiness.isReady, false);
  assert.deepEqual(readiness.missingRequiredFields, ["title", "service", "location"]);
  assert.equal(readiness.nextRecommendedPrompt.code, "clarify_service");

  draft = readyDraft();
  draft = applyAssistantInference(draft, {
    "location.serviceAddress": "Possible address",
  });
  draft = applyHomeownerInput(draft, {
    "location.serviceAddress": "123 Palm Ave",
  });
  draft = applyAssistantInference(draft, {
    "service.specialty": "maybe_painting",
  });
  draft = updateForUncertainService(draft);
  readiness = getJobRequestDraftReadiness(draft);

  assert.equal(readiness.isReady, false);
  assert.deepEqual(readiness.uncertainRequiredFields, ["service"]);
  assert.equal(getJobRequestDraftGuidance({ draft }).code, "confirm_service");

  const confirmed = confirmDraftField(draft, "service.specialty");
  assert.equal(getJobRequestDraftReadiness(confirmed).isReady, true);
});

function updateForUncertainService(draft) {
  return {
    ...draft,
    fieldMeta: {
      ...draft.fieldMeta,
      service: {
        ...draft.fieldMeta.service,
        specialty: {
          ...draft.fieldMeta.service.specialty,
          uncertainty: JOB_REQUEST_DRAFT_UNCERTAINTY.UNCERTAIN,
        },
      },
    },
  };
}

test("manual and assistant paths converge on equivalent draft meaning", () => {
  const assistantDraft = createJobRequestDraftFromAssistantDraft(
    buildAssistantRequestDraft({
      userText: "I need a garage opener installed",
      recommendations: {
        businessType: "Garage Door Service",
        photos: [],
      },
      createdAt: "2026-08-07T12:00:00.000Z",
    }),
    { initialLocation: "123 Palm Ave" }
  );
  let manualDraft = createJobRequestDraft({ initialLocation: "123 Palm Ave" });
  manualDraft = applyHomeownerInput(manualDraft, {
    "job.title": assistantDraft.job.title,
    "job.description": assistantDraft.job.description,
  });
  manualDraft = setServiceClassification(manualDraft, {
    category: assistantDraft.service.category,
    requestCategory: assistantDraft.service.requestCategory,
    domain: assistantDraft.service.domain,
    specialty: assistantDraft.service.specialty,
    selectedServiceOptionId: assistantDraft.service.selectedServiceOptionId,
    displayLabel: assistantDraft.service.displayLabel,
  });

  assert.deepEqual(
    buildJobRequestDraftCanonicalPayload(manualDraft),
    buildJobRequestDraftCanonicalPayload(assistantDraft)
  );
  assert.equal(manualDraft.fieldMeta.job.title.source, JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER);
  assert.equal(assistantDraft.fieldMeta.job.title.source, JOB_REQUEST_DRAFT_SOURCE.ASSISTANT);
});

test("review edit round trip updates the same draft and recomputes readiness", () => {
  let draft = createJobRequestDraft();
  const before = buildJobRequestReviewModel(draft);
  assert.equal(before.sections[0].items[0].missing, true);

  draft = applyHomeownerInput(draft, {
    "job.title": "Replace ceiling fan",
    "location.serviceAddress": "123 Palm Ave",
  });
  draft = setServiceClassification(draft, {
    category: "electrical",
    requestCategory: "electrical",
    domain: "home_services",
    specialty: "electrical",
    selectedServiceOptionId: "service:electrical",
    displayLabel: "Electrical",
  });

  const after = buildJobRequestReviewModel(draft);
  assert.equal(after.sections[0].items[0].missing, false);
  assert.equal(after.readiness.isReady, true);
});

test("canonical payload transform includes only backend create fields and readable context", () => {
  let draft = readyDraft();
  draft = applyHomeownerInput(draft, {
    "location.affectedArea": "Ceiling",
    "timing.desiredTiming": "before Friday",
    "details.measurements": "two walls",
  });
  const payload = buildJobRequestDraftCanonicalPayload(draft, {
    requestPhotoPayload: [{ purpose: "request-photo", display_order: 0 }],
  });

  assert.deepEqual(Object.keys(payload).sort(), [
    "access_notes",
    "category",
    "description",
    "location",
    "request_category",
    "request_photos",
    "service_domain",
    "service_specialty",
    "title",
    "unit_number",
  ]);
  assert.match(payload.description, /Additional request context:/);
  assert.match(payload.description, /Affected area: Ceiling/);
  assert.equal(Object.hasOwn(payload, "localDraftId"), false);
  assert.equal(Object.hasOwn(payload, "provenance"), false);
  assert.equal(Object.hasOwn(payload, "direct_request"), false);
});

test("submission snapshot stays immutable when draft fields change", () => {
  let draft = readyDraft();
  const payload = buildJobRequestDraftCanonicalPayload(draft);
  draft = setDraftSubmissionSnapshot(
    setDraftSubmissionIntent(draft, "11111111-1111-4111-8111-111111111111"),
    { body: payload, uploadedMedia: [] }
  );
  draft = applyHomeownerInput(draft, {
    "job.title": "Changed after ambiguity",
  });

  assert.equal(draft.job.title, "Changed after ambiguity");
  assert.equal(draft.submission.snapshot.body.title, "Paint the lanai");
  assert.equal(draft.stage, JOB_REQUEST_DRAFT_STAGE.SUBMISSION_PENDING);

  const cleared = clearDraftSubmission(draft);
  assert.equal(cleared.submission.snapshot, null);
});
