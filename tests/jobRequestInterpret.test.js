import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ASSISTANT_REQUEST_DRAFT_AUTHORITY,
} from "../src/utils/assistantRequestDraft.js";
import {
  JOB_REQUEST_DRAFT_SOURCE,
  JOB_REQUEST_DRAFT_UNCERTAINTY,
  applyHomeownerInput,
  createJobRequestDraft,
  setBroadRequestCategory,
  setDraftSubmissionIntent,
  setDraftSubmissionSnapshot,
  setServiceClassification,
  updateDraftField,
} from "../src/utils/jobRequestDraft.js";
import {
  JOB_REQUEST_INTERPRET_INTENT_STATUS,
  JOB_REQUEST_INTERPRET_ROUTE,
  JobRequestInterpretError,
  applyJobRequestInterpretationPatch,
  buildJobRequestInterpretRequest,
  createJobRequestInterpretIntent,
  markJobRequestInterpretIntentAmbiguous,
  requestJobRequestInterpretation,
} from "../src/utils/jobRequestInterpret.js";
import {
  JOB_REQUEST_INTERPRETATION_FAILURE,
  applyHomeownerConversationText,
  classifyInterpretationFailure,
} from "../src/utils/jobRequestConversation.js";

const KEY_ONE = "11111111-1111-4111-8111-111111111111";
const KEY_TWO = "22222222-2222-4222-8222-222222222222";
const SUBMISSION_KEY = "33333333-3333-4333-8333-333333333333";

function proposal(overrides = {}) {
  return {
    path: "job.title",
    value: "Repair water-damaged sink cabinet",
    provenance: "assistant_suggested",
    confidence: 0.86,
    uncertainty: "assistant_suggested",
    requiresConfirmation: true,
    rationale: "The request describes cabinet damage near a leak.",
    ...overrides,
  };
}

function interpretation(fields = [proposal()]) {
  return {
    schemaVersion: 1,
    summary: "The request may involve a leak and cabinet damage.",
    draftPatch: { fields },
    clarifications: [],
    warnings: [],
    validation: {
      status: "accepted",
      taxonomy: "validated",
      patchCount: fields.length,
      clarificationCount: 0,
      warningCount: 0,
    },
  };
}

function sequenceCrypto(values) {
  let index = 0;
  return { randomUUID: () => values[index++] };
}

test("request builder sends only bounded text and minimized non-canonical draft context", () => {
  let draft = createJobRequestDraft({
    draftId: "draft-private-id",
    initialLocation: "101 Private Street, Cape Coral, FL",
    initialCity: "Cape Coral",
    initialRegion: "FL",
    initialPostalCode: "33904",
  });
  draft = applyHomeownerInput(draft, {
    "job.description": "The cabinet is swollen after a leak.",
    "location.affectedArea": "kitchen",
    "location.unitNumber": "Unit 4B",
    "location.accessNotes": "Gate code 1234",
  });
  draft.media.photos = [{
    localPhotoId: "photo-private-id",
    previewUrl: "https://example.test/private.jpg",
    file: { name: "private.jpg" },
  }];
  draft.submission = {
    intentKey: SUBMISSION_KEY,
    snapshot: { canonical: "private" },
    status: "pending",
  };

  const request = buildJobRequestInterpretRequest({
    text: "  The cabinet under my sink is swollen.  ",
    draft,
  });
  const serialized = JSON.stringify(request);

  assert.equal(request.operation, "job_request.interpret");
  assert.equal(request.capability, "job_request.interpret");
  assert.equal(request.input.text, "The cabinet under my sink is swollen.");
  assert.equal(request.context.draft.location.affectedArea, "kitchen");
  assert.deepEqual(request.context.draft.location, {
    affectedArea: "kitchen",
    city: "Cape Coral",
    region: "FL",
    postalCode: "33904",
  });
  assert.equal(request.context.draft.photosAttached, true);
  assert.equal(request.context.draft.fieldState.length, 16);
  for (const privateValue of [
    "draft-private-id",
    "101 Private Street",
    "Unit 4B",
    "Gate code 1234",
    "photo-private-id",
    "private.jpg",
    SUBMISSION_KEY,
    "canonical",
  ]) {
    assert.equal(serialized.includes(privateValue), false, privateValue);
  }
});

test("one homeowner message produces a reviewable multi-field request proposal without submission authority", () => {
  const homeownerText =
    "I need someone to repair a cracked section of the wall by my front entry in Cape Coral. It is separating and temporarily braced. I would like someone to inspect it and repair or rebuild the damaged area. I am available this week and I can add photos.";
  const homeownerDraft = applyHomeownerConversationText(
    createJobRequestDraft(),
    homeownerText
  );
  const fields = [
    proposal({ path: "job.title", value: "Repair cracked wall by front entry" }),
    proposal({
      path: "service.category",
      value: "handyman",
      taxonomy: { validated: true, vocabulary: "request_service" },
    }),
    proposal({
      path: "service.requestCategory",
      value: "handyman",
      taxonomy: { validated: true, vocabulary: "request_service" },
    }),
    proposal({
      path: "service.domain",
      value: "home_services",
      taxonomy: { validated: true, vocabulary: "request_domain" },
    }),
    proposal({
      path: "service.specialty",
      value: "handyman",
      taxonomy: { validated: true, vocabulary: "request_service" },
    }),
    proposal({ path: "location.affectedArea", value: "front entry wall" }),
    proposal({ path: "location.city", value: "Cape Coral" }),
    proposal({ path: "timing.availability", value: "Available this week" }),
    proposal({
      path: "details.additionalNotes",
      value: "The section is separating and temporarily braced. The homeowner can add photos.",
    }),
  ];

  const result = applyJobRequestInterpretationPatch(
    homeownerDraft,
    interpretation(fields)
  );

  assert.equal(result.draft.job.description, homeownerText);
  assert.equal(result.draft.job.title, "Repair cracked wall by front entry");
  assert.equal(result.draft.location.city, "Cape Coral");
  assert.equal(result.draft.timing.availability, "Available this week");
  assert.equal(result.draft.media.photos.length, 0);
  assert.equal(result.draft.submission.status, "idle");
  assert.equal(result.draft.submission.snapshot, null);
  assert.equal(
    fields.some(({ path }) => /price|diagnosis|materials|repairMethod/i.test(path)),
    false
  );

  const corrected = applyHomeownerInput(result.draft, {
    "location.city": "Fort Myers",
  });
  const replay = applyJobRequestInterpretationPatch(
    corrected,
    interpretation([proposal({ path: "location.city", value: "Cape Coral" })])
  );
  assert.equal(replay.draft.location.city, "Fort Myers");
  assert.equal(replay.rejectedFields[0].reason, "homeowner_value_protected");
});

test("request builder rejects unsupported versions and non-text draft values", () => {
  const unsupported = createJobRequestDraft();
  unsupported.version = 1;
  assert.throws(
    () => buildJobRequestInterpretRequest({ text: "Leak", draft: unsupported }),
    /version is not supported/
  );
  const invalid = createJobRequestDraft();
  invalid.job.title = { unsafe: true };
  assert.throws(
    () => buildJobRequestInterpretRequest({ text: "Leak", draft: invalid }),
    /values must be text/
  );
});

test("interpretation intent reuses one key only for an exact pending or ambiguous retry", () => {
  const draft = setDraftSubmissionIntent(createJobRequestDraft(), SUBMISSION_KEY);
  const cryptoImpl = sequenceCrypto([KEY_ONE, KEY_TWO]);
  const first = createJobRequestInterpretIntent({
    text: "Leaking faucet",
    draft,
    cryptoImpl,
  });
  const ambiguous = markJobRequestInterpretIntentAmbiguous(first);
  const retry = createJobRequestInterpretIntent({
    text: "Leaking faucet",
    draft,
    previousIntent: ambiguous,
    cryptoImpl,
  });
  const changed = createJobRequestInterpretIntent({
    text: "Leaking faucet and wet cabinet",
    draft,
    previousIntent: retry,
    cryptoImpl,
  });

  assert.equal(first.idempotencyKey, KEY_ONE);
  assert.equal(ambiguous.status, JOB_REQUEST_INTERPRET_INTENT_STATUS.AMBIGUOUS);
  assert.equal(retry.idempotencyKey, KEY_ONE);
  assert.equal(changed.idempotencyKey, KEY_TWO);
  assert.notEqual(first.idempotencyKey, draft.submission.intentKey);
  assert.equal(JSON.stringify(first.request).includes(SUBMISSION_KEY), false);
});

test("meaningful draft context change creates a new interpretation intent", () => {
  const cryptoImpl = sequenceCrypto([KEY_ONE, KEY_TWO]);
  const firstDraft = createJobRequestDraft();
  const first = createJobRequestInterpretIntent({
    text: "Leaking faucet",
    draft: firstDraft,
    cryptoImpl,
  });
  const changedDraft = applyHomeownerInput(firstDraft, {
    "location.affectedArea": "kitchen",
  });
  const changed = createJobRequestInterpretIntent({
    text: "Leaking faucet",
    draft: changedDraft,
    previousIntent: first,
    cryptoImpl,
  });
  assert.equal(changed.idempotencyKey, KEY_TWO);
});

test("problem interpretation carries homeowner-selected broad category context", () => {
  const draft = setBroadRequestCategory(createJobRequestDraft(), "plumbing");
  const request = buildJobRequestInterpretRequest({
    text: "My kitchen sink is leaking underneath.",
    draft,
  });
  const categoryState = request.context.draft.fieldState.find(
    ({ path }) => path === "service.requestCategory"
  );

  assert.equal(request.context.draft.service.category, "plumbing");
  assert.equal(request.context.draft.service.requestCategory, "plumbing");
  assert.equal(request.context.draft.service.specialty, "");
  assert.equal(categoryState.provenance, JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER);
  assert.equal(categoryState.confirmed, true);
});

test("request helper calls only the canonical Gateway and validates its operation result", async () => {
  const intent = createJobRequestInterpretIntent({
    text: "Leaking faucet",
    draft: createJobRequestDraft(),
    cryptoImpl: { randomUUID: () => KEY_ONE },
  });
  const calls = [];
  const result = await requestJobRequestInterpretation({
    intent,
    authFetchImpl: async (...args) => {
      calls.push(args);
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "INTELLIGENCE_OPERATION_COMPLETED",
          operation: "job_request.interpret",
          operationId: "operation-1",
          correlationId: "correlation-1",
          result: interpretation(),
          usage: { state: "not_configured", classification: "stub" },
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], JOB_REQUEST_INTERPRET_ROUTE);
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].headers["Idempotency-Key"], KEY_ONE);
  assert.equal(calls[0][1].body.includes("/posts"), false);
  assert.equal(result.interpretation.summary, interpretation().summary);
  assert.equal(result.replayed, false);
});

test("Cape Coral intake survives the governed request path while failures and retry remain explicit", async () => {
  const homeownerText =
    "I need someone to repair a cracked section of the wall by my front entry in Cape Coral. It is separating and temporarily braced. I would like someone to inspect it and repair or rebuild the damaged area. I am available this week and I can add photos.";
  const draft = applyHomeownerConversationText(createJobRequestDraft(), homeownerText);
  const intent = createJobRequestInterpretIntent({
    text: homeownerText,
    draft,
    cryptoImpl: { randomUUID: () => KEY_ONE },
  });
  const fields = [
    proposal({ path: "job.title", value: "Repair cracked wall by front entry" }),
    proposal({ path: "location.affectedArea", value: "front entry wall" }),
    proposal({ path: "location.city", value: "Cape Coral" }),
    proposal({ path: "timing.availability", value: "Available this week" }),
  ];
  const calls = [];

  const result = await requestJobRequestInterpretation({
    intent,
    authFetchImpl: async (route, options) => {
      calls.push({ route, options });
      const body = JSON.parse(options.body);
      assert.equal(body.input.text, homeownerText);
      assert.deepEqual(Object.keys(body.context.draft.location).sort(), [
        "affectedArea",
        "city",
        "postalCode",
        "region",
      ]);
      assert.equal(JSON.stringify(body).includes("serviceAddress"), false);
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "INTELLIGENCE_OPERATION_COMPLETED",
          operation: "job_request.interpret",
          operationId: "operation-cape-coral",
          correlationId: "correlation-cape-coral",
          result: interpretation(fields),
        },
      };
    },
  });
  const reviewed = applyJobRequestInterpretationPatch(draft, result.interpretation);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].route, JOB_REQUEST_INTERPRET_ROUTE);
  assert.equal(reviewed.draft.location.city, "Cape Coral");
  assert.equal(reviewed.draft.timing.availability, "Available this week");
  assert.equal(reviewed.draft.submission.status, "idle");
  assert.equal(reviewed.draft.submission.snapshot, null);

  let failure;
  try {
    await requestJobRequestInterpretation({
      intent,
      authFetchImpl: async () => ({
        response: { ok: false, status: 403 },
        data: {
          success: false,
          code: "INTELLIGENCE_CAPABILITY_FORBIDDEN",
        },
      }),
    });
  } catch (error) {
    failure = error;
  }
  assert.equal(
    classifyInterpretationFailure(failure),
    JOB_REQUEST_INTERPRETATION_FAILURE.DEFINITIVE
  );

  const retry = createJobRequestInterpretIntent({
    text: homeownerText,
    draft,
    previousIntent: markJobRequestInterpretIntentAmbiguous(intent),
    cryptoImpl: { randomUUID: () => KEY_TWO },
  });
  assert.equal(retry.idempotencyKey, KEY_ONE);
  assert.deepEqual(retry.request, intent.request);
});

test("network ambiguity and Gateway conflict return governed failures without a draft patch", async () => {
  const draft = createJobRequestDraft();
  const intent = createJobRequestInterpretIntent({
    text: "Leaking faucet",
    draft,
    cryptoImpl: { randomUUID: () => KEY_ONE },
  });
  await assert.rejects(
    requestJobRequestInterpretation({
      intent,
      authFetchImpl: async () => { throw new Error("response lost"); },
    }),
    (error) => error instanceof JobRequestInterpretError && error.classification === "ambiguous"
  );
  await assert.rejects(
    requestJobRequestInterpretation({
      intent,
      authFetchImpl: async () => ({
        response: { ok: false, status: 409 },
        data: { success: false, code: "INTELLIGENCE_OPERATION_CONFLICT" },
      }),
    }),
    (error) => error instanceof JobRequestInterpretError && error.classification === "conflict"
  );
  assert.equal(draft.job.title, "");
  assert.equal(draft.submission.status, "idle");
});

test("valid assistant proposal fills an empty field with unconfirmed assistant metadata", () => {
  const snapshot = Object.freeze({ title: "immutable submission snapshot" });
  let draft = createJobRequestDraft();
  draft = setDraftSubmissionSnapshot(draft, snapshot);
  draft = setDraftSubmissionIntent(draft, SUBMISSION_KEY);
  const originalSubmission = draft.submission;
  const result = applyJobRequestInterpretationPatch(draft, interpretation());

  assert.equal(result.draft.job.title, "Repair water-damaged sink cabinet");
  assert.deepEqual(result.appliedFields, ["job.title"]);
  assert.equal(result.rejectedFields.length, 0);
  assert.equal(result.draft.fieldMeta.job.title.provenance, "assistant_suggested");
  assert.equal(result.draft.fieldMeta.job.title.confirmed, false);
  assert.equal(
    result.draft.fieldMeta.job.title.uncertainty,
    JOB_REQUEST_DRAFT_UNCERTAINTY.ASSISTANT_SUGGESTED
  );
  assert.equal(result.draft.submission, originalSubmission);
  assert.equal(result.draft.submission.intentKey, SUBMISSION_KEY);
  assert.deepEqual(result.draft.submission.snapshot, snapshot);
});

test("homeowner-confirmed and homeowner-provenance values cannot be overwritten", () => {
  const confirmed = applyHomeownerInput(createJobRequestDraft(), {
    "job.title": "Repair cabinet only",
  });
  const confirmedResult = applyJobRequestInterpretationPatch(confirmed, interpretation());
  assert.equal(confirmedResult.draft.job.title, "Repair cabinet only");
  assert.equal(confirmedResult.rejectedFields[0].reason, "homeowner_value_protected");

  const unconfirmedHomeowner = structuredClone(confirmed);
  unconfirmedHomeowner.fieldMeta.job.title.confirmed = false;
  const provenanceResult = applyJobRequestInterpretationPatch(
    unconfirmedHomeowner,
    interpretation()
  );
  assert.equal(provenanceResult.draft.job.title, "Repair cabinet only");
  assert.equal(provenanceResult.rejectedFields[0].reason, "homeowner_value_protected");
});

test("a confirmed homeowner Service Type cannot be overwritten by later AI output", () => {
  const confirmed = setServiceClassification(createJobRequestDraft(), {
    category: "plumbing",
    requestCategory: "plumbing",
    domain: "home_services",
    specialty: "plumbing_repairs",
    selectedServiceOptionId: "service:plumbing_repairs",
    displayLabel: "Plumbing Repairs",
  });
  const result = applyJobRequestInterpretationPatch(
    confirmed,
    interpretation([
      proposal({
        path: "service.specialty",
        value: "drain_cleaning",
        taxonomy: { validated: true, vocabulary: "request_service" },
      }),
    ])
  );

  assert.equal(result.draft.service.specialty, "plumbing_repairs");
  assert.equal(result.draft.fieldMeta.service.specialty.confirmed, true);
  assert.equal(result.rejectedFields[0].reason, "homeowner_value_protected");
});

test("an existing assistant proposal may be refined without becoming confirmed", () => {
  const draft = updateDraftField(createJobRequestDraft(), "job.title", "Inspect sink area", {
    source: JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_SUGGESTED,
    confirmed: false,
    uncertainty: JOB_REQUEST_DRAFT_UNCERTAINTY.ASSISTANT_SUGGESTED,
  });
  const result = applyJobRequestInterpretationPatch(
    draft,
    interpretation([proposal({ provenance: "assistant_inferred", uncertainty: "approximate" })])
  );

  assert.equal(result.draft.job.title, "Repair water-damaged sink cabinet");
  assert.equal(result.draft.fieldMeta.job.title.provenance, "assistant_inferred");
  assert.equal(result.draft.fieldMeta.job.title.confirmed, false);
});

test("duplicate proposal paths are applied once and rejected deterministically", () => {
  const result = applyJobRequestInterpretationPatch(
    createJobRequestDraft(),
    interpretation([
      proposal(),
      proposal({ value: "A second title must not win" }),
    ])
  );
  assert.equal(result.draft.job.title, "Repair water-damaged sink cabinet");
  assert.deepEqual(result.appliedFields, ["job.title"]);
  assert.equal(result.rejectedFields[0].reason, "duplicate_path");
});

test("adapter rejects invalid authority, unknown paths, submission targets, and unvalidated taxonomy", () => {
  const draft = createJobRequestDraft();
  const fields = [
    proposal({ provenance: "user_entered" }),
    proposal({ path: "unknown.field" }),
    proposal({ path: "submission.status", value: "submitted" }),
    proposal({ path: "service.specialty", value: "plumbing_repairs" }),
  ];
  const result = applyJobRequestInterpretationPatch(draft, interpretation(fields));

  assert.deepEqual(result.appliedFields, []);
  assert.deepEqual(result.rejectedFields.map(({ reason }) => reason), [
    "invalid_provenance",
    "unsupported_path",
    "unsupported_path",
    "taxonomy_not_validated",
  ]);
  assert.equal(result.draft, draft);
  assert.equal(result.draft.submission.status, "idle");
});

test("backend-validated service proposals apply only as assistant suggestions", () => {
  const draft = createJobRequestDraft();
  const result = applyJobRequestInterpretationPatch(
    draft,
    interpretation([
      proposal({
        path: "service.domain",
        value: "home_services",
        taxonomy: { validated: true, vocabulary: "request_domain" },
      }),
      proposal({
        path: "service.specialty",
        value: "plumbing_repairs",
        taxonomy: { validated: true, vocabulary: "request_service" },
      }),
    ])
  );

  assert.deepEqual(result.appliedFields, ["service.domain", "service.specialty"]);
  assert.equal(result.draft.service.domain, "home_services");
  assert.equal(result.draft.service.specialty, "plumbing_repairs");
  assert.equal(result.draft.fieldMeta.service.specialty.confirmed, false);
});

test("legacy deterministic assistant is compatibility-only and utility source has no submit authority", () => {
  assert.deepEqual(ASSISTANT_REQUEST_DRAFT_AUTHORITY, {
    status: "legacy_compatibility",
    canonicalInterpretationOperation: "job_request.interpret",
  });
  const source = readFileSync(
    fileURLToPath(new URL("../src/utils/jobRequestInterpret.js", import.meta.url)),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /\/posts|jobRequestSubmissionIntent|selectedHomeownerRequestId|localStorage/
  );
  assert.doesNotMatch(source, /\bcreateJobRequest\s*\(/);
});
