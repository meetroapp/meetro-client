import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  JOB_REQUEST_DRAFT_SOURCE,
  createJobRequestDraft,
  updateDraftField,
} from "../src/utils/jobRequestDraft.js";
import {
  JOB_REQUEST_CREATION_CONVERSATION_AUTHORITY,
  JOB_REQUEST_INTERPRETATION_FAILURE,
  applyHomeownerConversationText,
  classifyInterpretationFailure,
  createInterpretationSuccessMessages,
  createPhotoFirstPrompt,
  getHighestValueClarification,
  getInterpretationFailureMessage,
  getJobRequestInterpretLocale,
  hasMeaningfulCreationText,
  isAssistantSuggestedField,
} from "../src/utils/jobRequestConversation.js";
import { buildJobRequestInterpretRequest } from "../src/utils/jobRequestInterpret.js";
import { t } from "../src/utils/language.js";

const uploadSource = readFileSync(
  new URL("../src/pages/Upload.jsx", import.meta.url),
  "utf8"
);
const assistantSource = readFileSync(
  new URL("../src/pages/Assistant.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

function interpretation() {
  return {
    schemaVersion: 1,
    summary: "Got it. The sink cabinet may need repair after a leak.",
    draftPatch: { fields: [] },
    clarifications: [
      { question: "Has the leak already been repaired?", fieldPath: "timing.urgency" },
      { question: "Which cabinet is affected?", fieldPath: "location.affectedArea" },
    ],
    warnings: [{ code: "inspection", message: "A professional may need to inspect it." }],
    validation: {
      status: "accepted",
      taxonomy: "validated",
      patchCount: 0,
      clarificationCount: 2,
      warningCount: 1,
    },
  };
}

test("creation conversation is explicitly non-canonical UI state", () => {
  assert.deepEqual(JOB_REQUEST_CREATION_CONVERSATION_AUTHORITY, {
    status: "non_canonical_ui_state",
    canonicalSubmission: "explicit_submit_job_request",
    intelligenceOperation: "job_request.interpret",
  });
  assert.doesNotMatch(
    readFileSync(new URL("../src/utils/jobRequestConversation.js", import.meta.url), "utf8"),
    /\/posts|ConversationParticipant|professional response|createRelationship/i
  );
});

test("homeowner conversation text updates the shared draft with homeowner provenance", () => {
  let draft = applyHomeownerConversationText(
    createJobRequestDraft(),
    "The cabinet under my sink is swollen."
  );
  assert.equal(draft.job.description, "The cabinet under my sink is swollen.");
  assert.equal(draft.fieldMeta.job.description.provenance, JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER);
  assert.equal(draft.fieldMeta.job.description.confirmed, true);

  draft = applyHomeownerConversationText(draft, "No, the leak is still active.");
  assert.match(draft.details.additionalNotes, /leak is still active/);
  assert.equal(
    draft.fieldMeta.details.additionalNotes.provenance,
    JOB_REQUEST_DRAFT_SOURCE.HOMEOWNER
  );
});

test("success rendering shows one clarification and keeps additional candidates out of the log", () => {
  const messages = createInterpretationSuccessMessages({
    interpretation: interpretation(),
    language: "en",
    photosAttached: true,
  });
  assert.equal(getHighestValueClarification(interpretation()).question, "Has the leak already been repaired?");
  assert.equal(messages.some((message) => /Got it/.test(message.text)), true);
  assert.equal(messages.some((message) => /Has the leak already been repaired/.test(message.text)), true);
  assert.equal(messages.some((message) => /Which cabinet/.test(message.text)), false);
  assert.equal(messages.some((message) => /included with your request/.test(message.text)), true);
});

test("failure classification preserves retry and manual fallback language", () => {
  assert.equal(
    classifyInterpretationFailure({ classification: "ambiguous" }),
    JOB_REQUEST_INTERPRETATION_FAILURE.AMBIGUOUS
  );
  assert.equal(
    classifyInterpretationFailure({ classification: "conflict" }),
    JOB_REQUEST_INTERPRETATION_FAILURE.CONFLICT
  );
  assert.equal(
    classifyInterpretationFailure({ code: "INTELLIGENCE_PROVIDER_NOT_CONFIGURED", status: 503 }),
    JOB_REQUEST_INTERPRETATION_FAILURE.UNAVAILABLE
  );
  assert.match(getInterpretationFailureMessage("ambiguous", "en"), /retry/i);
  assert.match(getInterpretationFailureMessage("unavailable", "en"), /continue entering/i);
});

test("photo-first state prompts for text and provider context receives only photosAttached", () => {
  const prompt = createPhotoFirstPrompt("en");
  assert.equal(prompt.text, "Tell me what you'd like a professional to look at in these photos.");

  const draft = createJobRequestDraft();
  draft.media.photos = [
    {
      localPhotoId: "photo-private-id",
      previewUrl: "https://example.test/private-photo.jpg",
      file: { name: "private-photo.jpg" },
    },
  ];
  const request = buildJobRequestInterpretRequest({
    text: "Please look at the cabinet.",
    draft,
  });
  const serialized = JSON.stringify(request);
  assert.equal(request.context.draft.photosAttached, true);
  assert.equal(serialized.includes("private-photo"), false);
  assert.equal(serialized.includes("example.test"), false);
});

test("locale and assistant-suggested field helpers preserve authority semantics", () => {
  assert.equal(getJobRequestInterpretLocale("en"), "en-US");
  assert.equal(getJobRequestInterpretLocale("es"), "es-US");
  assert.equal(getJobRequestInterpretLocale("fr"), "fr-FR");
  assert.equal(getJobRequestInterpretLocale("pt-BR"), "pt-BR");
  assert.equal(hasMeaningfulCreationText("ok"), false);
  assert.equal(hasMeaningfulCreationText("leak"), true);

  const draft = updateDraftField(createJobRequestDraft(), "service.specialty", "plumbing_repairs", {
    source: JOB_REQUEST_DRAFT_SOURCE.ASSISTANT_SUGGESTED,
    confirmed: false,
  });
  assert.equal(isAssistantSuggestedField(draft, "service.specialty"), true);
});

test("Upload is the single ordinary Job Request creation workspace", () => {
  assert.match(appSource, /page === "upload"/);
  assert.match(assistantSource, /setPage\("upload"\)/);
  assert.match(uploadSource, /job-request-conversation-workspace/);
  assert.match(uploadSource, /requestJobRequestInterpretation/);
  assert.match(uploadSource, /applyJobRequestInterpretationPatch/);
  assert.match(uploadSource, /handleConversationSubmit/);
  assert.match(uploadSource, /handleCreatePost/);
  assert.match(uploadSource, /authFetch\(\s*"\/posts"/);
  assert.match(uploadSource, /type="button"[\s\S]*jobRequestReviewRequest/);
  assert.doesNotMatch(uploadSource, /createRelationship|Professional Response|conversationParticipants/);
});

test("Add records exact reviews, applies one patch, confirms it, and never submits", () => {
  const start = uploadSource.indexOf("async function reviewPendingInterpretation(action)");
  const end = uploadSource.indexOf("function handleConversationSubmit", start);
  const boundary = uploadSource.slice(start, end);

  assert.match(boundary, /recordJobRequestInterpretationReviews\(\{/);
  assert.match(boundary, /reviewKeys: pendingInterpretation\.reviewKeys/);
  assert.match(boundary, /recordReview: recordWorkflowReview/);
  assert.match(boundary, /await recordJobRequestInterpretationReviews[\s\S]*applyJobRequestInterpretationPatch/);
  assert.match(boundary, /applyJobRequestInterpretationPatch\(/);
  assert.match(boundary, /alignAssistantServiceSelection\(patched\.draft\)/);
  assert.match(
    boundary,
    /confirmAppliedJobRequestInterpretationFields\([\s\S]*aligned,[\s\S]*patched\.appliedFields/
  );
  assert.match(boundary, /setPendingInterpretation\(null\)/);
  assert.doesNotMatch(boundary, /handleCreatePost|\/posts|setSubmittedRequest/);
});

test("new conversational labels exist in supported languages", () => {
  const keys = [
    "jobRequestConversationQuestion",
    "jobRequestWhoCanHelp",
    "jobRequestWhoCanHelpHelp",
    "jobRequestCategoryNotSure",
    "jobRequestBroadCategory",
    "jobRequestMeetroSuggests",
    "jobRequestTechnicalServiceType",
    "jobRequestConversationPlaceholder",
    "jobRequestConversationProcessing",
    "jobRequestConversationUnavailable",
    "jobRequestRetryInterpretation",
    "jobRequestContinueManually",
    "jobRequestEnterDetailsManually",
    "jobRequestBackToConversation",
    "jobRequestEnterRequestDetails",
    "jobRequestBrowseAllServices",
    "jobRequestSearchServices",
    "jobRequestProgress",
    "jobRequestProgressWork",
    "jobRequestProgressLocation",
    "jobRequestProgressPhotosShort",
    "jobRequestProgressTiming",
    "jobRequestProgressReview",
    "jobRequestCardWork",
    "jobRequestCardLocation",
    "jobRequestCardPhotos",
    "jobRequestCardTiming",
    "jobRequestCardReview",
    "jobRequestContinue",
    "jobRequestPrevious",
    "jobRequestReadyToSubmit",
    "jobRequestNoPhotosAdded",
    "jobRequestPhotoCount",
    "jobRequestExactAddressNotAdded",
    "jobRequestTimingFlexible",
    "jobRequestTimingHelp",
    "jobRequestTimingUrgency",
    "jobRequestDesiredTiming",
    "jobRequestAvailabilityNotes",
    "jobRequestLocationPrivacyPromise",
    "jobRequestWhereIsWork",
    "jobRequestLocationSharingChoice",
    "jobRequestLocationSharingHelp",
    "jobRequestFullAddressNow",
    "jobRequestFullAddressPrivacy",
    "jobRequestGeneralAreaForNow",
    "jobRequestGeneralAreaPrivacy",
    "jobRequestReviewServiceLocation",
    "jobRequestReviewServiceArea",
    "jobRequestReviewAddressAfterSelection",
    "jobRequestPhotosOptional",
    "jobRequestTimingOptional",
    "jobRequestRequestDetails",
    "jobRequestSuggestedService",
    "jobRequestReviewRequest",
    "jobRequestAddMoreDetails",
    "jobRequestSubmittedTitle",
    "jobRequestViewMyRequest",
    "jobRequestReturnHome",
  ];
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) {
      assert.notEqual(t(key, language), key);
    }
  }
  assert.equal(t("newProject", "en"), "Request Help");
  assert.equal(t("createPost", "en"), "Submit Job Request");
});

test("responsive and accessibility hooks are present for mobile, tablet, and desktop", () => {
  assert.match(uploadSource, /@media \(max-width: 820px\)/);
  assert.match(uploadSource, /@media \(max-width: 430px\)/);
  assert.match(uploadSource, /role="log"/);
  assert.match(uploadSource, /aria-live="polite"/);
  assert.match(uploadSource, /requestMode === "conversation"/);
  assert.match(uploadSource, /requestMode === "manual"/);
  assert.match(uploadSource, /activeGuidedCard/);
  assert.match(uploadSource, /GuidedWorkspaceCard/);
  assert.match(uploadSource, /aria-current=\{state === "active" \? "step" : undefined\}/);
  assert.match(uploadSource, /jobRequestBackToConversation/);
  assert.match(uploadSource, /id="request-details-manual-form"/);
  assert.match(uploadSource, /title=\{t\("jobRequestChooseService", language\)\}/);
  assert.match(uploadSource, /searchPlaceholder=\{t\("searchServices"\)\}/);
  assert.match(uploadSource, /id="job-request-conversation-input"/);
  assert.match(uploadSource, /htmlFor="job-request-category"/);
  assert.match(uploadSource, /id="job-request-category"/);
  assert.match(uploadSource, /type="radio"/);
  assert.match(uploadSource, /name="request-location-intake-mode"/);
  assert.match(uploadSource, /jobRequestLocationSharingChoice/);
  assert.match(uploadSource, /id="request-country-code"/);
  assert.match(uploadSource, /BottomNav/);
});

test("guided request builder uses card state without creating new draft authority", () => {
  assert.match(uploadSource, /const \[activeGuidedCard, setActiveGuidedCard\] = useState\("work"\)/);
  assert.match(uploadSource, /const firstIncompleteRequiredCard = !workComplete[\s\S]*\? "work"[\s\S]*: !locationComplete[\s\S]*\? "location"[\s\S]*: "review"/);
  assert.match(uploadSource, /getGuidedCardState\("work", workComplete\)/);
  assert.match(uploadSource, /getGuidedCardState\("location", locationComplete\)/);
  assert.match(uploadSource, /getGuidedCardState\("photos", photosComplete\)/);
  assert.match(uploadSource, /getGuidedCardState\("timing", timingComplete\)/);
  assert.match(uploadSource, /getGuidedCardState\("review", reviewComplete\)/);
  assert.match(uploadSource, /continueToCard\("location"\)/);
  assert.match(uploadSource, /continueToCard\("photos"\)/);
  assert.match(uploadSource, /continueToCard\("timing"\)/);
  assert.match(uploadSource, /continueToCard\("review"\)/);
  assert.match(uploadSource, /handleReviewEdit\(section\.target\)/);
  assert.doesNotMatch(uploadSource, /workDetailsDraft|locationDraft|photoDraft|timingDraft/);
});

test("review card is the only final execution surface", () => {
  const createPostPosition = uploadSource.indexOf("{creating ? t(\"creating\") : t(\"createPost\")}");
  const reviewCardPosition = uploadSource.indexOf('id="job-request-review-card"');
  const postFormPosition = uploadSource.indexOf("onSubmit={handleCreatePost}");

  assert.notEqual(createPostPosition, -1);
  assert.notEqual(reviewCardPosition, -1);
  assert.notEqual(postFormPosition, -1);
  assert.ok(reviewCardPosition < postFormPosition);
  assert.ok(postFormPosition < createPostPosition);
  assert.equal((uploadSource.match(/onSubmit=\{handleCreatePost\}/g) || []).length, 1);
  assert.equal((uploadSource.match(/t\("createPost"\)/g) || []).length, 1);
  assert.doesNotMatch(uploadSource, /handleCreatePost\(\)/);
});

test("customer-first intake keeps technical Service Type selection behind suggestion or override", () => {
  const categoryPosition = uploadSource.indexOf('id="job-request-category"');
  const problemPosition = uploadSource.indexOf('id="job-request-conversation-input"');
  const technicalSearchPosition = uploadSource.indexOf('id="request-service-search"');

  assert.notEqual(categoryPosition, -1);
  assert.ok(categoryPosition < problemPosition);
  assert.ok(problemPosition < technicalSearchPosition);
  assert.match(uploadSource, /setBroadRequestCategory\(current, value\)/);
  assert.match(uploadSource, /jobRequestMeetroSuggests/);
  assert.match(uploadSource, /jobRequestAcceptSuggestion/);
  assert.match(uploadSource, /jobRequestChangeSuggestion/);
  assert.match(uploadSource, /setServiceSelectorOpen\(true\)/);
  assert.match(uploadSource, /field\.path === "service\.specialty"/);
  assert.match(uploadSource, /serviceOption\?\.label \|\| field\.value/);
  assert.match(uploadSource, /value=\{option\.serviceSpecialty\}/);
  assert.match(uploadSource, /updatePendingInterpretationField\([\s\S]*field\.path,[\s\S]*event\.target\.value/);
  assert.match(uploadSource, /if \(action !== "REJECTED"\)/);
  assert.match(uploadSource, /alignAssistantServiceSelection\(patched\.draft\)/);
  const manualSelectionSource = uploadSource.slice(
    uploadSource.indexOf("function selectServiceOption"),
    uploadSource.indexOf("function acceptAssistantServiceSuggestion")
  );
  assert.match(manualSelectionSource, /setServiceClassification/);
  assert.match(manualSelectionSource, /specialty: option\.serviceSpecialty/);
});

test("manual mode is reversible and preserves one shared draft boundary", () => {
  assert.match(uploadSource, /function handleBackToConversation\(\)/);
  assert.match(uploadSource, /setRequestMode\("conversation"\)/);
  assert.match(uploadSource, /function handleReviewRequest\(event\)/);
  assert.match(uploadSource, /setActiveGuidedCard\(firstIncompleteRequiredCard\)/);
  assert.match(uploadSource, /className="meetro-visual-surface guided-request-builder request-help-manual-form"/);
  assert.match(uploadSource, /onSubmit=\{handleCreatePost\}/);
  assert.doesNotMatch(uploadSource, /setManualDraft|manualDraft|draftCopy/);
});

test("incomplete canonical location cannot present an actionable submission", () => {
  assert.match(
    uploadSource,
    /disabled=\{!draftReadiness\.isReady \|\| creating \|\| uploading\}/
  );
  assert.match(uploadSource, /id="job-request-submit-guidance"/);
  assert.match(
    uploadSource,
    /continueToCard\(requestValidation\.errors\.location \? "location" : "work"\)/
  );
  assert.match(
    uploadSource,
    /aria-describedby=\{!draftReadiness\.isReady \? "job-request-submit-guidance" : undefined\}/
  );
});

test("new Request Help drafts do not inherit prior workflow address state", () => {
  assert.match(uploadSource, /readJobRequestDraft\(sessionStorage, \{ initialLocation: "" \}\)/);
  assert.match(uploadSource, /resetJobRequestDraft\(\{\s*initialLocation: "",\s*\}\)/);
  assert.doesNotMatch(uploadSource, /getInitialRequestLocation|resolveWorkflowAddress|requestLocationDraft/);
  assert.doesNotMatch(uploadSource, /readStoredRecord\("selectedProperty"\)|readStoredRecord\("selectedProject"\)|readStoredRecord\("selectedHomeownerRequest"\)/);
});

test("manual editor removes pseudo-review and keeps full catalog behind Browse All", () => {
  assert.doesNotMatch(uploadSource, /requestHelpCopy\.reviewTitle/);
  assert.match(uploadSource, /jobRequestProgress/);
  assert.match(uploadSource, /jobRequestProgressWork/);
  assert.match(uploadSource, /jobRequestProgressLocation/);
  assert.match(uploadSource, /jobRequestProgressReview/);
  assert.match(uploadSource, /setJobRequestLocationIntakeMode/);
  assert.match(uploadSource, /JOB_REQUEST_LOCATION_INTAKE_MODE\.ADDRESS_AFTER_SELECTION/);
  assert.doesNotMatch(uploadSource, /Choose closest match/);
  assert.doesNotMatch(uploadSource, /optional\) : ""/);
  assert.match(uploadSource, /serviceSuggestions\.map/);
  assert.match(uploadSource, /jobRequestBrowseAllServices/);
  assert.match(uploadSource, /ServiceSelectorSheet/);
});
