import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ASSISTANT_ORB_MARK,
  ASSISTANT_WAKE_DISMISS_MS,
  COMPANION_STATES,
  getCompanionObservationDismissalKey,
  getCompanionObservationScope,
  getCompanionObservationScopeKey,
  getAssistantIntentDisplayLabel,
  getAssistantWakeAnimation,
  getAssistantWakeContent,
  getAssistantWakeGreeting,
  getAssistantWakeSuggestions,
  getAssistantLauncherWakeAction,
  getMeetroCompanionIntentActions,
  getMeetroCompanionSheetContent,
  isCompanionObservationVisible,
  isHighPriorityWakeInsight,
} from "../src/utils/assistantWakeExperience.js";
import {
  getCompanionContext,
  normalizeCompanionContextPage,
} from "../src/utils/companionContext.js";
import { t } from "../src/utils/language.js";

const assistantSource = readFileSync(
  new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("../src/pages/Home.jsx", import.meta.url), "utf8");
const profileSource = readFileSync(new URL("../src/pages/Profile.jsx", import.meta.url), "utf8");

function makeStorage(values = {}) {
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : "";
    },
  };
}

test("assistant wake greeting is time-aware and omits missing name", () => {
  assert.deepEqual(
    getAssistantWakeGreeting({
      name: "William Molina",
      now: "2026-06-27T09:00:00",
      language: "en",
    }),
    {
      greeting: "Good morning, William.",
      prompt: "Review what matters next.",
    }
  );

  assert.equal(
    getAssistantWakeGreeting({
      now: "2026-06-27T19:00:00",
      language: "en",
    }).greeting,
    "Good evening."
  );
});

test("assistant launcher uses two-stage wake before opening", () => {
  assert.equal(getAssistantLauncherWakeAction({ open: false, wakeOpen: false }), "wake");
  assert.equal(getAssistantLauncherWakeAction({ open: false, wakeOpen: true }), "open");
  assert.equal(getAssistantLauncherWakeAction({ open: true, wakeOpen: true }), "none");
  assert.equal(getAssistantLauncherWakeAction({ dragSuppressed: true }), "suppress");
  assert.equal(COMPANION_STATES.presence, "presence");
  assert.equal(COMPANION_STATES.guidance, "guidance");
  assert.equal(COMPANION_STATES.briefing, "guidance");
  assert.equal(COMPANION_STATES.conversation, "conversation");
});

test("orb launcher opens compact Lantern card before expanded workspace", () => {
  assert.match(assistantSource, /if \(launcherAction === "wake"\) \{\s*setWakeOpen\(true\);/);
  assert.match(assistantSource, /wakeOpen && !open && \(/);
  assert.match(assistantSource, /compactCompanionTitle/);
  assert.match(assistantSource, /compactCompanionMessage/);
  assert.doesNotMatch(assistantSource, /<p style=\{assistantWakePrompt\}>\{wakeContent\.prompt\}<\/p>/);
});

test("companion observation scope is account and role aware", () => {
  const businessScope = getCompanionObservationScope({
    storage: makeStorage({
      userEmail: "pro@example.com",
      activeAccountMode: "business",
      activeConversationId: "conversation-1",
      activeEmergencyRequestId: "emergency-1",
    }),
    currentPage: "emergencyOperationsCenter",
  });
  const homeownerScope = getCompanionObservationScope({
    storage: makeStorage({
      userEmail: "home@example.com",
      activeAccountMode: "personal",
      activeEmergencyRequestId: "emergency-home@example.com-1",
    }),
    currentPage: "home",
  });

  assert.equal(businessScope.accountId, "pro@example.com");
  assert.equal(businessScope.role, "business");
  assert.match(getCompanionObservationScopeKey(businessScope), /pro@example\.com:business/);
  assert.equal(homeownerScope.accountId, "home@example.com");
  assert.equal(homeownerScope.role, "personal");
});

test("professional emergency bubble does not appear in homeowner mode", () => {
  const homeownerScope = {
    accountId: "home@example.com",
    role: "personal",
    route: "home",
  };
  const professionalEmergency = {
    id: "wake:emergency:pro",
    type: "emergency",
    active: true,
    priority: "critical",
    role: "business",
    message: "Emergency Plumbing needs attention.",
  };

  assert.equal(isCompanionObservationVisible(professionalEmergency, homeownerScope), false);
});

test("homeowner-safe emergency is role and account scoped", () => {
  const homeownerScope = {
    accountId: "home@example.com",
    role: "personal",
    route: "home",
  };
  const businessScope = {
    accountId: "pro@example.com",
    role: "business",
    route: "businessDashboard",
  };
  const homeownerEmergency = {
    id: "wake:emergency:home",
    type: "emergency",
    active: true,
    priority: "critical",
    role: "personal",
    accountId: "home@example.com",
    homeownerSafe: true,
    message: "Emergency Plumbing needs attention.",
  };

  assert.equal(isCompanionObservationVisible(homeownerEmergency, homeownerScope), true);
  assert.equal(isCompanionObservationVisible(homeownerEmergency, businessScope), false);
});

test("companion dismissal keys are account and role scoped", () => {
  const personalKey = getCompanionObservationDismissalKey(
    { accountId: "william@example.com", role: "personal" },
    "wake:emergency:1"
  );
  const businessKey = getCompanionObservationDismissalKey(
    { accountId: "william@example.com", role: "business" },
    "wake:emergency:1"
  );

  assert.equal(
    personalKey,
    "meetro.companion.dismissed:william@example.com:personal:wake:emergency:1"
  );
  assert.notEqual(personalKey, businessKey);
});

test("account mode changes clear temporary companion state without storage sweeping", () => {
  assert.match(assistantSource, /window\.addEventListener\("accountModeChanged", handleCompanionIdentityChange\)/);
  assert.match(assistantSource, /function resetTemporaryCompanionState\(\)/);
  assert.match(assistantSource, /setWakeOpen\(false\)/);
  assert.match(assistantSource, /setOpen\(false\)/);
  assert.match(assistantSource, /setCompanionMode\(COMPANION_STATES\.idle\)/);
  assert.doesNotMatch(assistantSource, /localStorage\.clear\(/);
});

test("wake bubble informs instead of asking generic questions", () => {
  assert.match(assistantSource, /<p style=\{assistantWakeStatus\}>\{lanternContext\.status\}<\/p>/);
  assert.match(assistantSource, /<p style=\{assistantWakeGreeting\}>\{compactCompanionTitle\}<\/p>/);
  assert.match(assistantSource, /<p style=\{assistantWakePrompt\}>\{compactCompanionMessage\}<\/p>/);
  assert.doesNotMatch(assistantSource, /assistantCompanionContinueToMeetro/);
  assert.doesNotMatch(assistantSource, /handleWakeSuggestion/);
  assert.doesNotMatch(assistantSource, /wakeContent\.suggestions\.map/);
});

test("wake bubble primary action and Ask Meetro use real companion paths", () => {
  assert.match(assistantSource, /function handleWakePrimaryObservation\(\)/);
  assert.match(assistantSource, /function handleWakeReviewInsights\(\)/);
  assert.match(assistantSource, /setVoiceAnswer\(answer\)/);
  assert.match(assistantSource, /setCompanionMode\(COMPANION_STATES\.guidance\)/);
  assert.match(assistantSource, /function handleWakeAskMeetro\(\)/);
  assert.match(assistantSource, /openAssistantFromLauncher\(\{ mode: COMPANION_STATES\.conversation \}\)/);
  assert.match(assistantSource, /onClick=\{handleWakePrimaryObservation\}/);
  assert.match(assistantSource, /onClick=\{handleWakeAskMeetro\}/);
});

test("Ask Meetro launchers open the in-context overlay without route navigation", () => {
  assert.match(assistantSource, /window\.addEventListener\("meetro:assistant:open", handleAssistantOpen\)/);
  assert.match(assistantSource, /openAssistantFromLauncher\(\{ initialQuestion \}\)/);
  assert.match(assistantSource, /setWakeOpen\(true\);/);
  assert.match(homeSource, /window\.dispatchEvent\(new Event\("meetro:assistant:open"\)\)/);
  assert.match(profileSource, /window\.dispatchEvent\(new Event\("meetro:assistant:open"\)\)/);
  assert.doesNotMatch(homeSource, /setPage\("assistant"\)/);
  assert.doesNotMatch(profileSource, /setPage\("assistant"\)/);
  assert.match(appSource, /if \(page === "assistant"\)/);
});

test("Lantern companion context maps routes to work-first guidance", () => {
  assert.equal(normalizeCompanionContextPage("home"), "home");
  assert.equal(normalizeCompanionContextPage("conversationThread"), "conversation");
  assert.equal(normalizeCompanionContextPage("contractorDashboard"), "workCenter");
  assert.equal(normalizeCompanionContextPage("contractorProfile"), "businessProfile");
  assert.equal(normalizeCompanionContextPage("projectDetails"), "project");
  assert.equal(normalizeCompanionContextPage("upload"), "request");
  assert.equal(normalizeCompanionContextPage("unknownThing"), "fallback");

  assert.equal(getCompanionContext({ currentPage: "home" }).title, "Today's Work");
  assert.equal(getCompanionContext({ currentPage: "home" }).status, "Today's focus");
  assert.equal(getCompanionContext({ currentPage: "home" }).secondaryActionLabel, "Ask Meetro");
  assert.match(
    getCompanionContext({ currentPage: "conversationThread" }).message,
    /find schedule or proposal details/
  );
  assert.equal(getCompanionContext({ currentPage: "messagesInbox" }).title, "Communication Center");
  assert.equal(getCompanionContext({ currentPage: "contractorDashboard" }).title, "Current Work");
  assert.equal(getCompanionContext({ currentPage: "upload" }).title, "Preparing Request");
  assert.equal(getCompanionContext({ currentPage: "unknownThing" }).title, "Meetro");
  assert.equal(
    getCompanionContext({ currentPage: "conversationThread", hasObservation: true }).status,
    "Meetro"
  );
  assert.notEqual(
    getCompanionContext({ currentPage: "home" }).primaryActionLabel,
    "Continue to Meetro"
  );
  assert.notEqual(
    getCompanionContext({ currentPage: "home" }).secondaryActionLabel,
    "Continue to Meetro"
  );
});

test("Companion context projection is read-only and Communication Center aware", () => {
  let writeCount = 0;
  const storage = {
    getItem(key) {
      return {
        activeConversationId: "thread-storage",
        activeRelationshipName: "Sarah Johnson",
        activeRelationshipType: "Customer",
      }[key] || "";
    },
    setItem() {
      writeCount += 1;
      throw new Error("Companion context must not write storage");
    },
  };

  const context = getCompanionContext({
    currentPage: "conversationThread",
    roleMode: "business",
    storage,
    conversation: {
      id: "thread-1",
      status: "Waiting for professional follow-up",
      intent: "Schedule change",
    },
    nextAction: "Prepare a reply",
    relatedWorkReferences: [{ id: "visit-1", type: "Schedule" }],
  });

  assert.equal(context.contextType, "conversation");
  assert.equal(context.activeHomeBase, "Messages");
  assert.equal(context.activeParentSurface, "Communication Center");
  assert.equal(context.activeSurfaceType, "Workspace");
  assert.equal(context.activeRoleMode, "business");
  assert.equal(context.relationship.name, "Sarah Johnson");
  assert.equal(context.relationship.type, "Customer");
  assert.equal(context.conversation.id, "thread-1");
  assert.equal(context.conversation.intent, "Schedule change");
  assert.equal(context.currentStatus, "Waiting for professional follow-up");
  assert.equal(context.nextAction.label, "Prepare a reply");
  assert.equal(context.relatedWorkReferences[0].id, "visit-1");
  assert.equal(context.isReadOnly, true);
  assert.equal(context.ownsWorkflow, false);
  assert.match(context.ownershipBoundary, /Companion guides/);
  assert.match(context.message, /Sarah Johnson/);
  assert.equal(writeCount, 0);
});

test("Companion context supports Work Center ownership without owning execution", () => {
  const context = getCompanionContext({
    currentPage: "contractorDashboard",
    work: {
      id: "job-7",
      name: "Johnson Kitchen Project",
      status: "Ready for evaluation notes",
    },
  });

  assert.equal(context.contextType, "workCenter");
  assert.equal(context.activeHomeBase, "Work");
  assert.equal(context.activeParentSurface, "Work Center");
  assert.equal(context.currentOwner, "Work Center");
  assert.equal(context.work.id, "job-7");
  assert.equal(context.ownsWorkflow, false);
  assert.match(context.message, /Work Center owns the next step/);
});

test("Companion context supports Business Profile and request interpretation", () => {
  const businessContext = getCompanionContext({
    currentPage: "contractorProfile",
    business: {
      name: "Bgone Home Renovation",
      status: "Portfolio proof could be stronger",
    },
  });
  const requestContext = getCompanionContext({
    currentPage: "upload",
    request: {
      id: "request-1",
      intent: "Kitchen sink leaking under the cabinet",
    },
  });
  const discoverContext = getCompanionContext({ currentPage: "discover" });

  assert.equal(businessContext.contextType, "businessProfile");
  assert.equal(businessContext.activeHomeBase, "Business");
  assert.equal(businessContext.activeSurfaceType, "Business Management Page");
  assert.equal(businessContext.currentOwner, "Business Profile");
  assert.equal(businessContext.ownsWorkflow, false);
  assert.match(businessContext.message, /Bgone Home Renovation/);
  assert.match(businessContext.message, /Business Profile owns readiness and trust/);

  assert.equal(requestContext.currentOwner, "Request Creation");
  assert.match(requestContext.message, /Kitchen sink leaking/);
  assert.equal(discoverContext.activeParentSurface, "Discover");
  assert.equal(discoverContext.ownsWorkflow, false);
});

test("companion sheet title and intent actions use Meetro language", () => {
  const content = getMeetroCompanionSheetContent({
    language: "en",
    name: "William",
    now: "2026-06-27T09:00:00",
  });

  assert.equal(content.title, "Meetro");
  assert.equal(content.greeting, "Good morning, William.");
  assert.equal(content.noticedLabel, "I noticed");
  assert.deepEqual(content.noticedItems, [
    "No urgent commitments right now.",
    "Today's focus: Review Opportunities.",
  ]);
  assert.equal(content.prompt, "Choose what matters now.");
  assert.deepEqual(getMeetroCompanionIntentActions("en").map((action) => action.label), [
    "Continue Working",
    "Review Insights",
    "Ask Meetro",
  ]);
});

test("default companion language avoids warning labels and AI-first response copy", () => {
  assert.doesNotMatch(assistantSource, /assistantGreetingPrompt:\s*"How can I help/i);
  assert.doesNotMatch(assistantSource, /quickHelpLabel:\s*"Quick help"/);
  assert.doesNotMatch(assistantSource, /assistantDetails:\s*"Details & feedback"/);
  assert.doesNotMatch(assistantSource, /assistantResponseLabel:\s*"Assistant Response"/);
  assert.doesNotMatch(assistantSource, /assistantResponseLabel:\s*"Respuesta del asistente"/);
  assert.doesNotMatch(assistantSource, /voiceTipsTitle:\s*"Try asking Meetro/);
  assert.doesNotMatch(assistantSource, /Generated response|AI answer/);

  assert.match(assistantSource, /assistantGreetingPrompt:\s*"Review what matters next\."/);
  assert.match(assistantSource, /quickHelpLabel:\s*"Next steps"/);
  assert.match(assistantSource, /assistantResponseLabel:\s*"Recommendation"/);
});

test("professional companion actions stay next-step oriented", () => {
  assert.doesNotMatch(
    assistantSource,
    /Open Work Center|Open Opportunities|Open Schedule|Open Quotes|Open Active Work|Open Closure|Open History|Open Business Tools|Open Emergency Center/
  );
  assert.match(assistantSource, /workCenter: "Review Work Center"/);
  assert.match(assistantSource, /leads: "Review Opportunities"/);
  assert.match(assistantSource, /schedule: "Review Schedule"/);
  assert.match(assistantSource, /quotes: "Review Proposals"/);
  assert.match(assistantSource, /activeWork: "Continue Active Work"/);
  assert.match(assistantSource, /closure: "Review Closure"/);
  assert.match(assistantSource, /businessTools: "Review Business Tools"/);
});

test("companion sheet high-priority insight appears in I noticed", () => {
  const content = getMeetroCompanionSheetContent({
    language: "en",
    topInsight: {
      id: "commitment:next-step:proposal:project-1",
      priority: "high",
      messageKey: "commitmentInsightEvaluationProposalNext",
    },
  });

  assert.deepEqual(content.noticedItems, [
    "Evaluation is saved. Proposal is the next step.",
  ]);
});

test("companion sheet source hides old AI-first hero and keeps capabilities reachable", () => {
  assert.doesNotMatch(assistantSource, /<span style=\{assistantEyebrow\}>\{roleLabel\}<\/span>/);
  assert.doesNotMatch(assistantSource, /<strong style=\{voiceTitle\}>\{copy\.tapToTalk\}<\/strong>/);
  assert.match(assistantSource, /COMPANION_STATES\.guidance/);
  assert.match(assistantSource, /COMPANION_STATES\.conversation/);
  assert.match(assistantSource, /handleWakeAskMeetro/);
  assert.match(assistantSource, /handleWakeReviewInsights/);
});

test("workspace guidance is intentional and full conversation stays gated", () => {
  assert.doesNotMatch(assistantSource, /isBriefingMode && \(/);
  assert.doesNotMatch(assistantSource, /<section style=\{companionNoticePanel\}>/);
  assert.doesNotMatch(assistantSource, /<div style=\{companionIntentGrid\}>/);
  assert.match(assistantSource, /isGuidanceMode && \(/);
  assert.match(assistantSource, /companionGuidancePanel/);
  assert.match(assistantSource, /setCompanionMode\(COMPANION_STATES\.conversation\)/);
  assert.doesNotMatch(assistantSource, /style=\{companionInlineAction\}/);
});

test("conversation sheet opens directly without briefing content", () => {
  assert.match(assistantSource, /const isConversationMode = companionMode === COMPANION_STATES\.conversation/);
  assert.match(assistantSource, /isConversationMode && \(\s*<div style=\{voiceCard\}>/);
  assert.doesNotMatch(assistantSource, /companionContent\.greeting/);
  assert.doesNotMatch(assistantSource, /companionContent\.prompt/);
});

test("Review Insights from bubble stays separate from passive insight overlay", () => {
  assert.match(assistantSource, /function handleWakeReviewInsights\(\)/);
  assert.match(assistantSource, /setVoiceTranscript\(t\("assistantCompanionReviewInsights", language\)\)/);
  assert.match(assistantSource, /setVoiceIntent\("review_insights"\)/);
  assert.doesNotMatch(assistantSource, /GlobalInsightLayer[\s\S]{0,240}companion/i);
});

test("companion state styles keep guidance compact and conversation scrollable", () => {
  assert.match(assistantSource, /const companionStateStyles = \{/);
  assert.match(assistantSource, /\[COMPANION_STATES\.guidance\]: \{\s*maxHeight: "min\(72dvh, 520px\)"/);
  assert.match(assistantSource, /\[COMPANION_STATES\.conversation\]: \{\s*maxHeight: "min\(86dvh, 720px\)"/);
  assert.match(assistantSource, /overflowY: "auto"/);
});

test("expanded companion cards stay inside viewport without page scrolling", () => {
  assert.match(assistantSource, /ASSISTANT_EXPANDED_CARD_VIEWPORT_MARGIN/);
  assert.match(assistantSource, /ASSISTANT_EXPANDED_CARD_GAP/);
  assert.match(assistantSource, /calculateExpandedPanelPlacement/);
  assert.match(assistantSource, /function getCompanionAnchorMetrics/);
  assert.match(assistantSource, /visualViewport\?\.offsetLeft/);
  assert.match(assistantSource, /visualViewport\?\.offsetTop/);
  assert.match(assistantSource, /launcherAdjustmentY/);
  assert.match(assistantSource, /positionAdjustmentRequired/);
  assert.match(assistantSource, /function ensureExpandedCompanionViewportSafety/);
  assert.match(assistantSource, /ensureExpandedCompanionViewportSafety\(nextCompanionMode\)/);
  assert.match(assistantSource, /ensureExpandedCompanionViewportSafety\(COMPANION_STATES\.conversation\)/);
  assert.match(assistantSource, /maxHeight: companionAnchorStyle\.maxHeight/);
  assert.doesNotMatch(assistantSource, /function adjustAssistantPositionForMeasuredSheet/);
  assert.match(assistantSource, /transition: "left 160ms ease, top 160ms ease"/);
  assert.doesNotMatch(assistantSource, /window\.scrollTo|document\.documentElement\.scrollTop|document\.body\.scrollTop/);
});

test("assistant response scrolls into view without aggressive reduced-motion behavior", () => {
  assert.match(assistantSource, /voiceAnswerRef = useRef\(null\)/);
  assert.match(assistantSource, /assistantSheetRef = useRef\(null\)/);
  assert.match(assistantSource, /alreadyVisible[\s\S]*return;/);
  assert.match(assistantSource, /scrollIntoView\(\{/);
  assert.match(
    assistantSource,
    /behavior: getAssistantReducedMotion\(\) \? "auto" : "smooth"/
  );
  assert.match(assistantSource, /block: "nearest"/);
});

test("Ask Meetro mode preserves voice while hiding old helper chips by default", () => {
  assert.match(assistantSource, /onClick=\{startVoiceInput\}/);
  assert.doesNotMatch(assistantSource, /fieldPromptChips\.map/);
  assert.doesNotMatch(assistantSource, /voiceTips\.map/);
  assert.doesNotMatch(assistantSource, /quickActions\.map/);
  assert.doesNotMatch(assistantSource, /style=\{advancedToggle\}/);
});

test("assistant intent display labels avoid raw internal keys", () => {
  assert.equal(getAssistantIntentDisplayLabel("suggested_next_step", "en"), "Suggested next step");
  assert.equal(getAssistantIntentDisplayLabel("custom_intent", "en"), "Custom Intent");
});

test("assistant glass orb uses Meetro mark instead of visible AI text", () => {
  assert.equal(ASSISTANT_ORB_MARK, "M");
  assert.doesNotMatch(assistantSource, />\s*AI\s*</);
  assert.match(assistantSource, /ASSISTANT_ORB_MARK/);
});

test("assistant launcher accessible label uses Meetro-first language", () => {
  assert.match(
    assistantSource,
    /aria-label=\{t\("companionLauncherLabel", language\)\}/
  );
});

test("assistant wake idle auto-dismiss is approximately eight seconds", () => {
  assert.equal(ASSISTANT_WAKE_DISMISS_MS, 8000);
  assert.match(assistantSource, /ASSISTANT_WAKE_DISMISS_MS/);
});

test("assistant wake suggestions vary by page and stay capped", () => {
  assert.deepEqual(
    getAssistantWakeSuggestions({ currentPage: "conversationThread", language: "en" }).map(
      (item) => item.label
    ),
    ["Relationship Memory", "Summarize Conversation", "Ask Anything"]
  );
  assert.deepEqual(
    getAssistantWakeSuggestions({ currentPage: "schedule", language: "en" }).map(
      (item) => item.label
    ),
    ["Review Today's Commitments", "Show Today's Schedule", "Ask Anything"]
  );
  assert.deepEqual(
    getAssistantWakeSuggestions({ currentPage: "quoteBuilder", language: "en" }).map(
      (item) => item.label
    ),
    ["Review Proposal", "Missing Documentation", "Ask Anything"]
  );
  assert.equal(
    getAssistantWakeSuggestions({ currentPage: "invoiceBuilder", language: "en" }).length,
    3
  );
});

test("high-priority insight replaces generic assistant wake greeting", () => {
  const content = getAssistantWakeContent({
    currentPage: "conversationThread",
    language: "en",
    name: "William",
    topInsight: {
      id: "commitment:next-step:proposal:project-1",
      priority: "high",
      messageKey: "commitmentInsightEvaluationProposalNext",
    },
  });

  assert.equal(content.mode, "insight");
  assert.equal(content.greeting, "I noticed something...");
  assert.equal(content.prompt, "Evaluation is saved. Proposal is the next step.");
  assert.deepEqual(content.suggestions.map((item) => item.label), ["Continue"]);
});

test("generic assistant wake greeting appears when no high-priority insight exists", () => {
  const content = getAssistantWakeContent({
    currentPage: "home",
    language: "en",
    now: "2026-06-27T13:00:00",
    topInsight: {
      id: "relationship:first-project",
      priority: "low",
      message: "This is your first completed project together.",
    },
  });

  assert.equal(content.mode, "greeting");
  assert.equal(content.greeting, "Good afternoon.");
  assert.deepEqual(content.suggestions.map((item) => item.label), [
    "What deserves attention?",
    "Today's Commitments",
    "Ask Anything",
  ]);
});

test("assistant wake reduced-motion path disables animation", () => {
  assert.equal(getAssistantWakeAnimation(true), "none");
  assert.equal(getAssistantWakeAnimation(false), "meetroAssistantWakeIn 180ms ease-out");
});

test("assistant wake accessibility labels exist in all supported languages", () => {
  ["en", "es", "fr", "pt-BR"].forEach((language) => {
    assert.notEqual(t("assistantWakePrompt", language), "assistantWakePrompt");
    assert.notEqual(t("assistantWakeAriaLabel", language), "assistantWakeAriaLabel");
    assert.notEqual(t("assistantWakeDismiss", language), "assistantWakeDismiss");
    assert.notEqual(t("assistantWakeSuggestionAskAnything", language), "assistantWakeSuggestionAskAnything");
    assert.notEqual(t("assistantCompanionINoticed", language), "assistantCompanionINoticed");
    assert.notEqual(t("assistantCompanionHowCanWeHelp", language), "assistantCompanionHowCanWeHelp");
    assert.notEqual(t("assistantCompanionContinueWorking", language), "assistantCompanionContinueWorking");
    assert.notEqual(t("assistantCompanionReviewInsights", language), "assistantCompanionReviewInsights");
    assert.notEqual(t("assistantCompanionAskMeetro", language), "assistantCompanionAskMeetro");
    assert.notEqual(t("companionContextHomeTitle", language), "companionContextHomeTitle");
    assert.notEqual(t("companionContextHomeMessage", language), "companionContextHomeMessage");
    assert.notEqual(t("companionContextOpenCompanion", language), "companionContextOpenCompanion");
    assert.notEqual(t("companionContextReviewNextStep", language), "companionContextReviewNextStep");
  });
});

test("companion prompt translations are context-first in supported languages", () => {
  assert.equal(t("assistantWakePrompt", "en"), "Review what matters next.");
  assert.equal(t("assistantWakePrompt", "es"), "Revisa lo que sigue.");
  assert.equal(t("assistantWakePrompt", "fr"), "Revoyez ce qui compte ensuite.");
  assert.equal(t("assistantWakePrompt", "pt-BR"), "Revise o que vem a seguir.");

  assert.equal(t("assistantCompanionHowCanWeHelp", "en"), "Choose what matters now.");
  assert.equal(t("assistantCompanionHowCanWeHelp", "es"), "Elige lo que importa ahora.");
  assert.equal(t("assistantCompanionHowCanWeHelp", "fr"), "Choisissez ce qui compte maintenant.");
  assert.equal(t("assistantCompanionHowCanWeHelp", "pt-BR"), "Escolha o que importa agora.");

  assert.equal(t("assistantWakeDismiss", "en"), "Dismiss");
  assert.equal(t("companionContextOpenCompanion", "en"), "Ask Meetro");
  assert.equal(t("companionContextOpenCompanion", "es"), "Preguntar a Meetro");
  assert.equal(t("companionContextOpenCompanion", "fr"), "Demander à Meetro");
  assert.equal(t("companionContextOpenCompanion", "pt-BR"), "Perguntar ao Meetro");
  assert.equal(t("companionContextFallbackTitle", "en"), "Meetro");
});

test("assistant wake insight priority check is deterministic", () => {
  assert.equal(isHighPriorityWakeInsight({ priority: "critical" }), true);
  assert.equal(isHighPriorityWakeInsight({ priority: "high" }), true);
  assert.equal(isHighPriorityWakeInsight({ priority: "medium" }), false);
  assert.equal(isHighPriorityWakeInsight(), false);
});
