import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ASSISTANT_REQUEST_DRAFT_KEY,
  buildAssistantRequestDraft,
  classifyAssistantRequestIntent,
  clearAssistantRequestDraft,
  readAssistantRequestDraft,
  saveAssistantRequestDraft,
} from "../src/utils/assistantRequestDraft.js";
import { t } from "../src/utils/language.js";
import { buildRequestMatchingFields } from "../src/utils/requestMatchingFields.js";

const assistantSource = readFileSync(new URL("../src/pages/Assistant.jsx", import.meta.url), "utf8");
const uploadSource = readFileSync(new URL("../src/pages/Upload.jsx", import.meta.url), "utf8");

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

test("Ask Meetro generated project draft carries title details and category", () => {
  const draft = buildAssistantRequestDraft({
    userText: "I need a garage opener installed",
    recommendations: {
      businessType: "Garage Door Service",
      heading: "Suggested project scope",
      scope: [
        "Describe the problem clearly.",
        "Mention if materials are already purchased.",
      ],
      photos: ["Wide photo of the full area."],
    },
    mode: "scope",
    createdAt: "2026-06-27T12:00:00.000Z",
  });

  assert.equal(draft.title, "Garage opener installed");
  assert.equal(draft.category, "doorsWindows");
  assert.equal(draft.service_specialty, "garage_door_opener_installation");
  assert.equal(draft.requestMatchingFields.service_specialty, "garage_door_opener_installation");
  assert.equal(draft.suggestedProjectType, "Garage Door Service");
  assert.match(draft.description, /Project Summary:\nI need a garage opener installed/);
  assert.match(draft.description, /Details:\nI need a garage door opener installed/);
  assert.match(draft.description, /Helpful Details:/);
  assert.match(draft.description, /Mention if materials are already purchased/);
  assert.match(draft.description, /Photos to Include:\n• Wide photo of the full area/);
  assert.doesNotMatch(draft.description, /Requested help:|Suggested project type:/);
});

test("Ask Meetro intent classification does not force automotive requests into handyman", () => {
  const intent = classifyAssistantRequestIntent("Car won't start need help");

  assert.equal(intent.serviceDomain, "transportation");
  assert.equal(intent.category, "mechanic");
  assert.equal(intent.categoryLabel, "Mechanic / Mobile Mechanic");
  assert.equal(intent.suggestedServiceLabel, "Vehicle won't start");
  assert.equal(intent.confidence, "high");
  assert.notEqual(intent.category, "handyman");
});

test("Ask Meetro intent classification maps common project examples", () => {
  assert.deepEqual(
    {
      category: classifyAssistantRequestIntent("garage door opener installed").category,
      label: classifyAssistantRequestIntent("garage door opener installed").suggestedServiceLabel,
    },
    {
      category: "doorsWindows",
      label: "Garage Door Opener Installation",
    }
  );

  assert.deepEqual(
    {
      category: classifyAssistantRequestIntent("kitchen faucet leaking").category,
      label: classifyAssistantRequestIntent("kitchen faucet leaking").suggestedServiceLabel,
    },
    {
      category: "plumbing",
      label: "Plumbing Repairs",
    }
  );
});

test("unknown unsupported requests do not silently become handyman", () => {
  const intent = classifyAssistantRequestIntent("My violin sounds strange");

  assert.equal(intent.category, "");
  assert.equal(intent.confidence, "low");
  assert.equal(intent.supported, false);
});

test("broad home requests can safely fall back to general service", () => {
  const intent = classifyAssistantRequestIntent("I need help with a home repair");

  assert.equal(intent.category, "handyman");
  assert.equal(intent.categoryLabel, "General Service");
  assert.equal(intent.reason, "broad_home_service");
});

test("automotive prepared request carries mechanic category and clean wording", () => {
  const intent = classifyAssistantRequestIntent("Car won't start need help");
  const draft = buildAssistantRequestDraft({
    userText: "Car won't start need help",
    recommendations: {
      businessType: "Mechanic / Mobile Mechanic",
      intent,
      heading: "Helpful Details",
      scope: [
        "Vehicle year, make, and model",
        "Dashboard warning lights",
      ],
      photos: ["Dashboard or warning lights"],
    },
    createdAt: "2026-06-27T12:00:00.000Z",
  });

  assert.equal(draft.category, "mechanic");
  assert.equal(draft.serviceDomain, "transportation");
  assert.equal(draft.suggestedServiceLabel, "Vehicle won't start");
  assert.match(draft.description, /Project Summary:\nCar won't start need help/);
  assert.match(draft.description, /Details:\nMy vehicle will not start/);
  assert.match(draft.description, /Helpful Details:\n• Vehicle year, make, and model/);
  assert.match(draft.description, /• Whether roadside help is needed/);
  assert.doesNotMatch(draft.description, /Please review|Confirm the work|Suggested project type/);

  const matchingFields = buildRequestMatchingFields({
    title: draft.title,
    description: draft.description,
    category: draft.category,
  });
  assert.equal(matchingFields.serviceDomain, "transportation");
  assert.equal(matchingFields.serviceSpecialty, "mechanic");
});

test("assistant request draft saves, loads, and clears without auto-posting", () => {
  const storage = createStorage();
  const draft = buildAssistantRequestDraft({
    userText: "I need a garage opener installed",
    recommendations: {
      businessType: "Garage Door Service",
      heading: "Suggested project scope",
      scope: ["Confirm opener model."],
      photos: [],
    },
    createdAt: "2026-06-27T12:00:00.000Z",
  });

  saveAssistantRequestDraft(storage, draft);

  const loaded = readAssistantRequestDraft(storage);
  assert.equal(loaded.title, "Garage opener installed");
  assert.equal(loaded.category, "doorsWindows");
  assert.equal(storage.getItem("homeownerRequests"), null);
  assert.notEqual(storage.getItem("meetroJobRequestDraft"), null);
  assert.equal(storage.getItem("aiProjectDraft"), null);

  clearAssistantRequestDraft(storage);
  assert.equal(storage.getItem(ASSISTANT_REQUEST_DRAFT_KEY), null);
  assert.equal(storage.getItem("meetroJobRequestDraft"), null);
  assert.equal(storage.getItem("aiProjectDraft"), null);
});

test("assistant request draft still reads legacy Meetro draft keys", () => {
  const storage = createStorage({
    aiProjectDraft: "I need a garage opener installed",
    aiBusinessRecommendation: "Garage Door Service",
    aiProjectScope: "Confirm opener model.\nAdd photos.",
  });

  const loaded = readAssistantRequestDraft(storage);

  assert.equal(loaded.title, "Garage opener installed");
  assert.equal(loaded.category, "doorsWindows");
  assert.match(loaded.description, /Confirm opener model/);
});

test("Upload consumes Ask Meetro draft and keeps request form editable before sending", () => {
  assert.match(assistantSource, /saveAssistantRequestDraft\(localStorage, draft\)/);
  assert.match(assistantSource, /t\("assistantUseThisToPostProject"\)/);
  assert.match(uploadSource, /readAssistantRequestDraft\(localStorage\)/);
  assert.match(uploadSource, /createJobRequestDraftFromAssistantDraft\(initialAssistantDraft/);
  assert.match(uploadSource, /const \[draft, setDraft\] = useState\(\(\) => \{/);
  assert.match(uploadSource, /clearAssistantRequestDraftHandoff\(localStorage\)/);
  assert.doesNotMatch(uploadSource, /readAssistantRequestDraft[\s\S]{0,260}handleCreatePost\(/);
});

test("created request submits reviewed canonical fields without legacy local draft metadata", () => {
  assert.match(uploadSource, /buildJobRequestDraftCanonicalPayload\(draft/);
  assert.doesNotMatch(uploadSource, /assistantDraft: assistantDraftMetadata/);
  assert.doesNotMatch(uploadSource, /assistantSuggestedProjectType:/);
  assert.doesNotMatch(uploadSource, /assistantOriginalPrompt:/);
  assert.doesNotMatch(uploadSource, /assistantRecommendationText:/);
  assert.doesNotMatch(uploadSource, /direct_request:/);
  assert.doesNotMatch(uploadSource, /direct_conversation_id:/);
});

test("request form has mobile containment for generated Meetro draft content", () => {
  assert.match(uploadSource, /overflowX: "hidden"/);
  assert.match(uploadSource, /overflowWrap: "anywhere"/);
  assert.match(uploadSource, /minWidth: 0/);
  assert.match(uploadSource, /maxWidth: "100%"/);
  assert.match(uploadSource, /boxSizing: "border-box"/);
  assert.match(uploadSource, /contain: "layout paint"/);
  assert.match(uploadSource, /wordBreak: "break-word"/);
});

test("Request Details textarea expands for prepared request review", () => {
  assert.match(uploadSource, /const descriptionInputRef = useRef\(null\)/);
  assert.match(uploadSource, /ref=\{descriptionInputRef\}/);
  assert.match(uploadSource, /Math\.max\(textarea\.scrollHeight, assistantDraftMetadata \? 320 : 140\)/);
  assert.match(uploadSource, /minHeight: assistantDraftMetadata \? "320px"/);
  assert.match(uploadSource, /maxHeight: "70dvh"/);
  assert.match(uploadSource, /whiteSpace: "pre-wrap"/);
});

test("prepared request description is customer-facing request language", () => {
  const draft = buildAssistantRequestDraft({
    userText: "I need a garage door opener installed",
    recommendations: {
      businessType: "Garage Door Service",
      heading: "Suggested project scope",
      scope: [
        "Describe the problem clearly.",
        "Include where the work is located.",
        "Add any measurements, brand names, or model numbers.",
      ],
      photos: [
        "Garage door",
        "Existing opener or mounting area",
        "Power outlet",
        "Safety sensor area",
      ],
    },
    createdAt: "2026-06-27T12:00:00.000Z",
  });

  assert.match(draft.description, /^Project Summary:\nI need a garage door opener installed/);
  assert.match(draft.description, /Details:\nI need a garage door opener installed/);
  assert.match(draft.description, /mounting location, power source, and safety sensors/);
  assert.match(draft.description, /Photos to Include:\n• Garage door/);
  assert.equal(draft.requestMatchingFields.service_specialty, "garage_door_opener_installation");
  assert.doesNotMatch(draft.description, /Assistant|Generated|Suggested project type|Requested help/);
});

test("prepared request matching fields survive the handoff when available", () => {
  const draft = buildAssistantRequestDraft({
    userText: "My kitchen faucet is leaking",
    recommendations: {
      businessType: "Plumbing",
      scope: ["Include where the leak is located."],
      photos: ["Leak area"],
    },
    createdAt: "2026-06-27T12:00:00.000Z",
  });

  assert.equal(draft.category, "plumbing");
  assert.equal(draft.service_domain, "home_services");
  assert.equal(draft.service_specialty, "plumbing_repairs");
  assert.deepEqual(draft.requestMatchingFields, {
    serviceDomain: "home_services",
    service_domain: "home_services",
    requestCategory: "plumbing",
    request_category: "plumbing",
    category: "plumbing",
    serviceSpecialty: "plumbing_repairs",
    service_specialty: "plumbing_repairs",
  });
});

test("Ask Meetro page uses workflow copy and prepared request sections", () => {
  assert.equal(t("assistantRequestHeroLine1", "en"), "Describe your project once.");
  assert.equal(t("assistantRequestHeroLine2", "en"), "Meetro prepares your request.");
  assert.equal(t("assistantRequestHeroLine3", "en"), "You review it.");
  assert.equal(t("assistantRequestHeroLine4", "en"), "You send it.");
  assert.equal(t("assistantRequestDescriptionTitle", "en"), "Project description");
  assert.equal(t("assistantRequestPlaceholder", "en"), "Describe what you need done...");
  assert.equal(t("assistantPrepareRequestAction", "en"), "Prepare Request");
  assert.equal(t("assistantPreparedRequest", "en"), "Prepared Request");
  assert.equal(t("assistantPreparedService", "en"), "Service");
  assert.equal(t("assistantPreparedProjectSummary", "en"), "Project Summary");
  assert.equal(t("assistantPreparedRecommendedDetails", "en"), "Helpful Details");
  assert.equal(t("assistantPreparedPhotosToInclude", "en"), "Photos to Include");
  assert.equal(t("assistantPreparedRecommendation", "en"), "Recommendation");
  assert.equal(t("assistantEditDescription", "en"), "Edit Description");
  assert.match(assistantSource, /t\("assistantRequestHeroLine1"\)/);
  assert.match(assistantSource, /t\("assistantPreparedRequest"\)/);
  assert.match(assistantSource, /t\("assistantEditDescription"\)/);
  assert.match(assistantSource, /t\("assistantPrepareRequestAction"\)/);
  assert.doesNotMatch(assistantSource, /t\("aiHelp"\)/);
});

test("Ask Meetro page avoids visible AI-first presentation language", () => {
  assert.doesNotMatch(
    assistantSource,
    /Meetro AI|AI Help|AI Recommendation|AI Response|Assistant Response|Generated Content|Generated response|AI answers|Use This To Post Project|Post Project|Auto-create|Let AI do it/
  );
});

test("request form shows an understanding-to-review transition without submission ambiguity", () => {
  assert.match(uploadSource, /requestReviewIntroTitle/);
  assert.match(uploadSource, /requestReviewIntroText/);
  assert.match(uploadSource, /assistantDraftMetadata && \(/);
  assert.match(uploadSource, /preparedRequestOrb/);
  assert.match(uploadSource, /jobRequestDraftGuidanceTitle/);
  assert.match(uploadSource, /buildJobRequestReviewModel\(draft\)/);
  assert.match(uploadSource, /handleReviewEdit\(item\.editTarget\)/);
  assert.equal(t("requestReviewIntroTitle", "en"), "Here's what Meetro understood.");
  assert.equal(t("requestReviewIntroText", "en"), "Review or edit anything before sending.");
  assert.doesNotMatch(uploadSource, /assistantPreparedRequestBannerTitle/);
  assert.doesNotMatch(uploadSource, /assistantPreparedRequestBannerText/);
});

test("Request Details page uses one page introduction without duplicate onboarding blocks", () => {
  assert.doesNotMatch(uploadSource, /t\("requestHelp"\)/);
  assert.equal(uploadSource.match(/t\("newProject"\)/g)?.length, 1);
  assert.equal(uploadSource.match(/t\("newProjectSubtitle"\)/g)?.length, 1);
  assert.doesNotMatch(uploadSource, /t\("uploadTipTitle"\)/);
  assert.doesNotMatch(uploadSource, /t\("uploadTipText"\)/);
  assert.doesNotMatch(uploadSource, /t\("requestGuidanceWhatToInclude"\)/);
  assert.doesNotMatch(uploadSource, /t\("requestDetailsHeading"\)/);
});

test("Request Details form remains the primary editable surface", () => {
  assert.match(uploadSource, /<label htmlFor="request-service-search" style=\{fieldLabel\}>/);
  assert.match(uploadSource, /\{t\("requestIntelligencePrompt"\)\} \(\{requestHelpCopy\.required\}\)/);
  assert.match(uploadSource, /selectedServiceCard/);
  assert.match(uploadSource, /ServiceSelectorSheet/);
  assert.doesNotMatch(uploadSource, /<select\s*\n\s*value=\{category\}/);
  assert.match(uploadSource, /<label htmlFor="request-title" style=\{fieldLabel\}>/);
  assert.match(uploadSource, /<label htmlFor="request-description" style=\{fieldLabel\}>/);
  assert.match(uploadSource, /<label htmlFor="request-location" style=\{fieldLabel\}>/);
  assert.match(uploadSource, /\{t\("projectTitle"\)\} \(\{requestHelpCopy\.required\}\)/);
  assert.match(uploadSource, /\{t\("projectDescription"\)\} \(\{requestHelpCopy\.optional\}\)/);
  assert.match(uploadSource, /\{t\("fullServiceAddress"\)\} \(\{requestHelpCopy\.required\}\)/);
  assert.match(uploadSource, /applyHomeownerInput\(current, \{\s*"job\.title": e\.target\.value/);
  assert.match(uploadSource, /applyHomeownerInput\(current, \{\s*"job\.description": e\.target\.value/);
});

test("request page keeps matching language problem-first and avoids category-first validation", () => {
  assert.equal(t("requestIntelligencePrompt", "en"), "What do you need help with?");
  assert.equal(t("requestMatchLabel", "en"), "Closest match");
  assert.equal(t("chooseClosestMatch", "en"), "Choose closest match");
  assert.match(t("requestMatchRequired", "en"), /closest match/);
  assert.match(uploadSource, /t\("requestMatchLabel"\)/);
  assert.match(uploadSource, /t\("chooseClosestMatch"\)/);
  assert.match(uploadSource, /fieldErrors\.category/);
  assert.match(uploadSource, /\{requestHelpCopy\.matchRequired\}/);
  assert.match(uploadSource, /validateRequestHelpSubmission\(\{/);
  assert.doesNotMatch(uploadSource, /alert\(t\("selectServiceCategory"\)\)/);
});

test("request page prepares editable title and details from what the homeowner describes", () => {
  assert.match(uploadSource, /function buildSuggestedRequestTitle/);
  assert.match(uploadSource, /const titleEdited = draft\.fieldMeta\?\.job\?\.title\?\.confirmed === true/);
  assert.match(uploadSource, /const descriptionEdited = draft\.fieldMeta\?\.job\?\.description\?\.confirmed === true/);
  assert.match(uploadSource, /if \(!titleEdited\) \{\s*setDraft\(\(current\) =>\s*applyAssistantSuggestion/);
  assert.match(uploadSource, /if \(!descriptionEdited\) \{\s*setDraft\(\(current\) =>\s*applyAssistantSuggestion/);
  assert.match(uploadSource, /applyHomeownerInput\(current, \{\s*"job\.title": e\.target\.value/);
  assert.match(uploadSource, /applyHomeownerInput\(current, \{\s*"job\.description": e\.target\.value/);
});

test("Submit Job Request remains primary and Cancel Request is visually secondary", () => {
  assert.equal(t("createPost", "en"), "Submit Job Request");
  assert.equal(t("cancelRequest", "en"), "Cancel Request");
  assert.equal(t("fullServiceAddress", "en"), "Service Address");
  assert.match(uploadSource, /style=\{\{\s*\.\.\.primaryButton/);
  assert.match(uploadSource, /style=\{cancelRequestButton\}/);
  assert.match(uploadSource, /const requestActionBar = \{/);
  assert.match(uploadSource, /bottom: "calc\(78px \+ env\(safe-area-inset-bottom, 0px\)\)"/);
  assert.match(uploadSource, /backdropFilter: "blur\(14px\)"/);
  assert.match(uploadSource, /const cancelRequestButton = \{[\s\S]*background: "var\(--meetro-surface-paper\)"/);
  assert.match(uploadSource, /const cancelRequestButton = \{[\s\S]*color: "var\(--meetro-color-muted\)"/);
  assert.equal(
    t("projectPostedSuccess", "en"),
    "Your request was sent. You can follow what happens next from Home."
  );
});

test("Continue to Request and continuity labels exist in supported languages", () => {
  const keys = [
    "assistantUseThisToPostProject",
    "assistantPreparedRequestBannerTitle",
    "assistantPreparedRequestBannerText",
    "assistantRequestHeroLine1",
    "assistantRequestPlaceholder",
    "assistantPrepareRequestAction",
    "assistantPreparedRequest",
    "assistantPreparedRecommendedDetails",
    "assistantPreparedPhotosToInclude",
    "assistantEditDescription",
    "assistantRequestPhotoWide",
    "requestMatchLabel",
    "chooseClosestMatch",
    "requestMatchRequired",
    "requestReviewIntroTitle",
    "requestReviewIntroText",
    "jobRequestDraftGuidanceTitle",
    "jobRequestDraftReadyTitle",
    "jobRequestDraftGuidanceService",
    "jobRequestDraftGuidanceJobTitle",
    "jobRequestDraftGuidanceLocation",
    "jobRequestDraftGuidanceReady",
    "jobRequestDraftWarningServiceUnconfirmed",
    "jobRequestDraftReviewWork",
    "jobRequestDraftStatusNeedsReview",
    "jobRequestDraftEdit",
    "projectPostedSuccess",
  ];

  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) {
      assert.notEqual(t(key, language), key);
    }
  }

  assert.equal(t("assistantUseThisToPostProject", "en"), "Continue to Request");
  assert.equal(t("assistantPrepareRequestAction", "es"), "Preparar solicitud");
  assert.equal(t("assistantPrepareRequestAction", "fr"), "Préparer la demande");
  assert.equal(t("assistantPrepareRequestAction", "pt-BR"), "Preparar solicitação");
});
