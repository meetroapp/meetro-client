import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildQuickQuoteConversationPatch,
  mergeQuickQuoteConversationPatch,
} from "../src/utils/quickQuoteConversationDraft.js";
import {
  getQuickQuoteConversationCopy,
  QUICK_QUOTE_CONVERSATION_LANGUAGES,
} from "../src/utils/quickQuoteConversationLanguage.js";
import {
  getQuickQuoteProfessionalContinuation,
  isQuickQuoteSuggestionReviewable,
} from "../src/utils/quickQuoteProfessionalContinuation.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const builder = read("src/pages/QuoteBuilder.jsx");
const conversation = read("src/components/QuickQuoteConversation.jsx");
const analysisThread = read("src/components/QuickQuoteAnalysisThread.jsx");
const microphone = read("src/components/WorkflowMicrophoneInput.jsx");
const quoteDraftMedia = read("src/utils/quoteDraftPhotoMedia.js");
const styles = read("src/index.css");


test("professional input enables continuation without accepting Meetro suggestions", () => {
  const professionalInput = [
    "Purchase materials $40",
    "Labor $260.00",
    "Repair wall inside closet",
    "Move outlet from closet to living room wall.",
    "Install new outlet plate.",
  ].join("\n");

  const continuation = getQuickQuoteProfessionalContinuation({
    professionalInput,
    canonicalJobId: "",
    photoDecisions: {
      repair_1: { action: "REJECTED" },
    },
    ignoredMaterialSuggestionIds: ["material_1"],
    needsVerification: ["Confirm wall type"],
  });

  assert.equal(continuation.canContinue, true);
  assert.equal(continuation.professionalInput, professionalInput);
  assert.equal(continuation.nextStep, "CANONICAL_JOB_REQUIRED");
  assert.equal(continuation.reviewEvents, undefined);
  assert.equal(continuation.pricingInputs, undefined);
  assert.equal(continuation.estimateInput, undefined);
});


test("professional continuation recognizes a canonical Job without promoting pricing", () => {
  const professionalInput = "Materials $40. Labor $260. Repair wall.";
  const canonicalJobId = "4b7f7d0b-99b0-4f45-84c0-86c216fa0d14";
  const continuation = getQuickQuoteProfessionalContinuation({
    professionalInput,
    canonicalJobId,
  });

  assert.equal(continuation.canContinue, true);
  assert.equal(continuation.professionalInput, professionalInput);
  assert.equal(continuation.canonicalJobId, canonicalJobId);
  assert.equal(continuation.nextStep, "INTERNAL_ESTIMATE");
  assert.equal(continuation.pricingInputs, undefined);
});


test("Needs Verification stays advisory while selectable suggestions remain reviewable", () => {
  assert.equal(isQuickQuoteSuggestionReviewable("needsVerification"), false);
  assert.equal(isQuickQuoteSuggestionReviewable("observed"), false);
  assert.equal(isQuickQuoteSuggestionReviewable("repairSuggestions"), true);
  assert.equal(isQuickQuoteSuggestionReviewable("materialSuggestions"), true);
});


test("Job Analysis exposes professional-first continuation and optional collapsed Meetro help", () => {
  assert.match(conversation, /onContinueWithMyDetails/);
  assert.match(conversation, /copy\.yourJobDetails/);
  assert.match(conversation, /copy\.continueWithMyDetails/);
  assert.match(conversation, /copy\.usingMyDetails/);
  assert.match(conversation, /copy\.useMeetroSuggestions/);
  assert.match(conversation, /quick-quote-professional-actions/);
  assert.match(conversation, /quick-quote-suggestion-group/);
  assert.match(conversation, /<details/);
  assert.match(conversation, /isQuickQuoteSuggestionReviewable\(category\)/);

  const continueStart = builder.indexOf(
    "function continueQuickQuoteWithProfessionalDetails"
  );
  const continueEnd = builder.indexOf(
    "async function continueQuickQuoteConversation",
    continueStart
  );

  assert.ok(continueStart >= 0 && continueEnd > continueStart);

  const continueBoundary = builder.slice(continueStart, continueEnd);
  assert.match(continueBoundary, /getQuickQuoteProfessionalContinuation/);
  assert.match(continueBoundary, /quickQuoteAnalysisState\.analyzedPrompt/);
  assert.match(continueBoundary, /setQuickQuoteContinuationNotice/);
  assert.match(
    continueBoundary,
    /quickQuoteJobConnection\.stage\s*!==\s*"idle"[\s\S]*return false/
  );
  assert.doesNotMatch(continueBoundary, /recordWorkflowReview/);
  assert.doesNotMatch(
    continueBoundary,
    /setProblemFound|setRecommendedSolution|setMaterialRows|setLaborRows|setLineItems|setTotalOverride/
  );

  assert.match(
    builder,
    /onContinueWithMyDetails=\{continueQuickQuoteWithProfessionalDetails\}/
  );
});


test("professional continuation copy is complete in every Quick Quote locale", () => {
  const expected = {
    en: ["Continue with My Details", "Using My Details"],
    es: ["Continuar con mis detalles", "Usando mis detalles"],
    fr: ["Continuer avec mes détails", "Utilisation de mes détails"],
    "pt-BR": ["Continuar com meus detalhes", "Usando meus detalhes"],
  };

  for (const language of QUICK_QUOTE_CONVERSATION_LANGUAGES) {
    const copy = getQuickQuoteConversationCopy(language);

    for (const key of [
      "yourJobDetails",
      "continueWithMyDetails",
      "usingMyDetails",
      "useMeetroSuggestions",
      "optionalSuggestionsHelp",
      "canonicalJobRequired",
      "recommendedSolution",
      "thingsToVerify",
    ]) {
      assert.equal(typeof copy[key], "string", `${language}:${key}`);
      assert.ok(copy[key].trim(), `${language}:${key}`);
    }

    assert.deepEqual(
      [copy.continueWithMyDetails, copy.usingMyDetails],
      expected[language]
    );
  }
});

test("Using My Details replaces the continuation button throughout Job connection", () => {
  assert.match(
    conversation,
    /\[\s*"decision",\s*"picker",\s*"costConfirmation",?\s*\]\.includes\(jobConnection\.stage\)/
  );
  assert.match(
    conversation,
    /usingProfessionalDetails\s*\?\s*\([\s\S]*quick-quote-professional-confirmation[\s\S]*role="status"[\s\S]*aria-live="polite"[\s\S]*aria-hidden="true">✓[\s\S]*copy\.usingMyDetails[\s\S]*:\s*\([\s\S]*onClick=\{onContinueWithMyDetails\}/
  );

  const confirmationStart = conversation.indexOf(
    'className="quick-quote-professional-confirmation"'
  );
  const confirmationEnd = conversation.indexOf("</p>", confirmationStart);
  const confirmation = conversation.slice(confirmationStart, confirmationEnd);
  assert.ok(confirmationStart >= 0 && confirmationEnd > confirmationStart);
  assert.doesNotMatch(confirmation, /button|onClick|tabIndex/);
});

test("Using My Details is compact and contained at mobile and desktop widths", () => {
  const rule = styles.match(
    /\.quick-quote-professional-confirmation\s*\{([^}]*)\}/
  );

  assert.ok(rule, "expected professional confirmation styles");
  assert.match(rule[1], /display:\s*inline-flex/);
  assert.match(rule[1], /justify-self:\s*start/);
  assert.match(rule[1], /box-sizing:\s*border-box/);
  assert.match(rule[1], /max-inline-size:\s*100%/);
  assert.match(rule[1], /min-height:\s*36px/);
  assert.match(rule[1], /overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(rule[1], /cursor:\s*pointer/);
});


test("universal Quick Quote opens Job Analysis and keeps the full Quote editor out of the analysis flow", () => {
  assert.match(builder, /isUniversalQuickQuote \? "entry" : "details"/);
  assert.match(builder, /<QuickQuoteConversation/);
  assert.match(builder, /view=\{quickQuoteView\}/);
  assert.match(builder, /\{!isUniversalQuickQuote && \(/);

  assert.doesNotMatch(
    builder,
    /quickQuoteView === "details"/
  );

  assert.doesNotMatch(
    builder,
    /onEditDetails=\{/
  );

  // Preserve the existing real Quote editor for non-universal flows.
  assert.match(builder, /Customer Name/);
  assert.match(builder, /Manual Total Override/);
});

test("Quick Quote seeds customer document dates from the local calendar instead of UTC", () => {
  assert.match(builder, /function todayLocalIsoDate/);
  assert.match(builder, /now\.getFullYear\(\)/);
  assert.match(builder, /now\.getMonth\(\) \+ 1/);
  assert.match(builder, /now\.getDate\(\)/);
  assert.match(builder, /todayLocalIsoDate\(\)/);
  assert.doesNotMatch(
    builder,
    /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/
  );
});


test("entry and analysis copy describe private pre-quote Job Analysis", () => {
  const copy = getQuickQuoteConversationCopy("en");

  assert.equal(copy.createTitle, "Start Job Analysis");
  assert.equal(copy.reviewTitle, "Job Analysis");
  assert.equal(copy.prepare, "Analyze Job");

  assert.equal(
    copy.entryGuidanceTitle,
    "Tell Meetro about the job in your own words."
  );

  assert.match(
    copy.entryGuidanceBody,
    /privately analyze the job details and evidence/i
  );

  assert.match(
    copy.entryGuidanceBody,
    /nothing is turned into a Quote or shared/i
  );

  assert.equal(
    copy.reviewGuidanceTitle,
    "Review Meetro’s private job analysis."
  );

  assert.match(
    copy.reviewGuidanceBody,
    /details are enough to continue/i
  );

  assert.match(
    copy.reviewGuidanceBody,
    /suggestions are optional/i
  );

  assert.match(conversation, /copy\.entryGuidanceTitle/);
  assert.match(conversation, /copy\.reviewGuidanceTitle/);
  assert.match(conversation, /copy\.workingPrivately/);
});


test("Job Analysis provides internal Back and Return controls without exposing full Quote details", () => {
  assert.match(conversation, /onBackToDetails/);
  assert.match(conversation, /onReturnToAnalysis/);
  assert.match(conversation, /copy\.backToJobDetails/);
  assert.match(conversation, /copy\.returnToJobAnalysis/);
  assert.match(conversation, /quick-quote-analysis-back/);
  assert.match(conversation, /quick-quote-return-analysis/);

  assert.match(
    builder,
    /onBackToDetails=\{backToQuickQuoteJobDetails\}/
  );

  assert.match(
    builder,
    /onReturnToAnalysis=\{returnToQuickQuoteAnalysis\}/
  );

  assert.doesNotMatch(conversation, /detailsExpanded/);
  assert.doesNotMatch(conversation, /onToggleDetails/);
  assert.doesNotMatch(conversation, /quick-quote-full-details/);

  assert.match(builder, /\{!isUniversalQuickQuote && \(/);
});


test("Job Analysis does not patch Quote state while real Quote document architecture remains available elsewhere", () => {
  assert.doesNotMatch(
    builder,
    /applyQuickQuoteConversationPatch/
  );

  assert.doesNotMatch(
    builder,
    /buildQuickQuoteConversationPatch/
  );

  // Existing non-universal Quote/document architecture remains intact.
  assert.match(builder, /function buildQuickQuotePdfModel\(\)/);
  assert.match(builder, /async function exportQuickQuotePdf\(\)/);
  assert.match(builder, /async function shareQuickQuotePdf\(\)/);
  assert.match(builder, /buildQuickQuoteDocumentModel/);

  assert.doesNotMatch(
    builder,
    /quickQuoteReviewSummary/
  );
});

test("conversation entry locks Speak Type Add Photos and one governed microphone", () => {
  assert.match(conversation, /idleLabel=\{copy\.speak\}/);
  assert.match(conversation, /\{copy\.type\}/);
  assert.match(conversation, /\{copy\.addPhotos\}/);
  assert.equal((conversation.match(/<WorkflowMicrophoneInput/g) || []).length, 1);
  assert.match(microphone, /idleLabel \|\| copy\.startRecording/);
  assert.match(builder, /meetro-quote-builder-open/);
  assert.match(styles, /\.meetro-quote-builder-open \.meetro-assistant-launcher/);
});

test("Quick Quote uses governed private draft media without claiming canonical Quote attachment authority", () => {
  assert.match(builder, /quickQuoteDraftPhotos/);
  assert.match(builder, /pickNativeJobPhoto/);
  assert.match(builder, /uploadQuoteDraftPhotos/);
  assert.match(builder, /cleanupQuoteDraftPhoto/);
  assert.match(
    builder,
    /canAddPhotos=\{quickQuotePhotoUploadEnabled\}/
  );
  assert.match(
    builder,
    /photoBusy=\{quickQuotePhotoBusy\}/
  );
  assert.match(builder, /pendingFile: file/);
  assert.match(builder, /uploadState: "pending"/);
  assert.match(builder, /URL\.createObjectURL\(file\)/);
  assert.match(builder, /URL\.revokeObjectURL\(photo\.previewUrl\)/);
  assert.match(builder, /quickQuotePersistedPhotoIdsRef/);

  assert.match(
    quoteDraftMedia,
    /QUOTE_DRAFT_PHOTO_PURPOSE = "quote-draft-photo"/
  );
  assert.match(
    quoteDraftMedia,
    /"\/media\/upload-signature"/
  );
  assert.match(
    quoteDraftMedia,
    /"\/media\/quote-draft-photo\/cleanup"/
  );

  assert.match(conversation, /photos\.map/);
  assert.match(
    conversation,
    /quick-quote-photo-review/
  );
  assert.match(
    conversation,
    /copy\.photoDraftNotice/
  );
  assert.match(
    conversation,
    /disabled=\{photoBusy\}/
  );

  assert.doesNotMatch(
    `${builder}\n${conversation}\n${quoteDraftMedia}`,
    /request-photo|localStorage[^\n]*quickQuoteDraftPhotos|sessionStorage[^\n]*quickQuoteDraftPhotos/i
  );
});

test(
  "Quick Quote can start durable Job Analysis from photos without typed text",
  () => {
    assert.match(
      conversation,
      /\(!prompt\.trim\(\) && photoCount === 0\)/
    );

    assert.match(
      conversation,
      /photoBusy \|\|/
    );

    assert.match(
      conversation,
      /copy\.addAnotherPhoto/
    );

    assert.ok(
      (
        conversation.match(
          /quick-quote-photo-grid/g
        ) || []
      ).length >= 2
    );

    const start =
      builder.indexOf(
        "async function prepareQuickQuoteConversation"
      );

    const end =
      builder.indexOf(
        "async function reviewQuickQuotePhotoSuggestion",
        start
      );

    assert.ok(
      start >= 0 &&
      end > start
    );

    const analysisBoundary =
      builder.slice(
        start,
        end
      );

    /*
     * Empty text is allowed when governed photos exist.
     * Only the absence of BOTH text and photos stops analysis.
     */
    assert.match(
      analysisBoundary,
      /if\s*\(\s*!instruction\s*&&\s*photos\.length\s*===\s*0\s*\)\s*\{\s*return;\s*\}/
    );

    assert.match(
      analysisBoundary,
      /const governedPhotos =\s*photos\.map/
    );

    assert.match(
      analysisBoundary,
      /professionalInput,/
    );

    assert.match(
      analysisBoundary,
      /photos:\s*governedPhotos/
    );

    /*
     * R1-04 removes the old browser-only text-vs-photo
     * execution split. Both now use the durable server session.
     */
    assert.doesNotMatch(
      analysisBoundary,
      /if\s*\(\s*photos\.length\s*===\s*0\s*\)/
    );

    assert.match(
      analysisBoundary,
      /createQuickQuoteAnalysisSession/
    );

    assert.match(
      analysisBoundary,
      /analyzeQuickQuoteAnalysisSession/
    );
  }
);

test(
  "Job Analysis preserves exact professional input while using trimmed text only for presence checks",
  () => {
    const start =
      builder.indexOf(
        "async function prepareQuickQuoteConversation"
      );

    const end =
      builder.indexOf(
        "async function continueQuickQuoteConversation",
        start
      );

    assert.ok(
      start >= 0 &&
      end > start
    );

    const analysisBoundary =
      builder.slice(
        start,
        end
      );

    assert.match(
      analysisBoundary,
      /const professionalInput =\s*String\(\s*quickQuotePrompt \?\? ""\s*\)/
    );

    assert.match(
      analysisBoundary,
      /const instruction =\s*cleanText\(\s*professionalInput\s*\)/
    );

    assert.match(
      analysisBoundary,
      /createQuickQuoteAnalysisSession\(\{[\s\S]*professionalInput,[\s\S]*photos:\s*governedPhotos/
    );

    assert.match(
      analysisBoundary,
      /appendQuickQuoteAnalysisEvidence\(\{[\s\S]*professionalInput,[\s\S]*photos:\s*governedPhotos/
    );

    assert.match(
      analysisBoundary,
      /analyzedPrompt:\s*professionalInput/
    );

    assert.doesNotMatch(
      analysisBoundary,
      /professionalInput:\s*instruction/
    );

    /*
     * Trimming is allowed only for the empty-input gate and
     * follow-on presence logic. Durable evidence keeps the
     * professional's exact source text.
     */
    assert.match(
      analysisBoundary,
      /if\s*\(\s*!instruction\s*&&\s*photos\.length\s*===\s*0/
    );
  }
);

test(
  "Job Analysis uses one durable server session for text and governed photos without Quote mutation",
  () => {
    assert.match(
      builder,
      /createQuickQuoteAnalysisSession/
    );

    assert.match(
      builder,
      /appendQuickQuoteAnalysisEvidence/
    );

    assert.match(
      builder,
      /loadQuickQuoteAnalysisSession/
    );

    assert.match(
      builder,
      /analyzeQuickQuoteAnalysisSession/
    );

    assert.match(
      builder,
      /hydrateQuickQuoteAnalysisPresentationState/
    );

    assert.match(
      builder,
      /applyQuickQuoteAnalysisExecutionToPresentationState/
    );

    const start =
      builder.indexOf(
        "async function prepareQuickQuoteConversation"
      );

    const end =
      builder.indexOf(
        "async function requestQuickQuoteInternalEstimate",
        start
      );

    assert.ok(
      start >= 0 &&
      end > start
    );

    const analysisBoundary =
      builder.slice(
        start,
        end
      );

    assert.match(
      analysisBoundary,
      /professionalInput,/
    );

    assert.match(
      analysisBoundary,
      /photos:\s*governedPhotos/
    );

    assert.match(
      analysisBoundary,
      /photos\.map\(\s*\(photo\)\s*=>\s*photo\.media/
    );

    assert.match(
      analysisBoundary,
      /if \(!sessionId\)/
    );

    assert.doesNotMatch(
      analysisBoundary,
      /requestWorkflowIntelligence/
    );

    assert.doesNotMatch(
      analysisBoundary,
      /INTELLIGENCE_OPERATION\.QUICK_QUOTE_PHOTO/
    );

    assert.doesNotMatch(
      analysisBoundary,
      /quickQuoteWorkingTimerRef/
    );

    assert.doesNotMatch(
      analysisBoundary,
      /window\.setTimeout/
    );

    assert.doesNotMatch(
      analysisBoundary,
      /if \(photos\.length === 0\)/
    );

    assert.doesNotMatch(
      analysisBoundary,
      /setCustomerName|setCustomerLocation|setProblemFound|setRecommendedSolution|setMaterialRows|setLaborRows|setTotalOverride/
    );
  }
);

test(
  "full Job Analysis exit discards the server session before governed media cleanup",
  () => {
    const start =
      builder.indexOf(
        "async function exitQuickQuoteAnalysis"
      );

    const cleanup =
      builder.indexOf(
        "const failedPhotoIds",
        start
      );

    assert.ok(
      start >= 0 &&
      cleanup > start
    );

    const discardBoundary =
      builder.slice(
        start,
        cleanup
      );

    assert.match(
      discardBoundary,
      /quickQuoteAnalysisSessionState\.sessionId/
    );

    assert.match(
      discardBoundary,
      /discardQuickQuoteAnalysisSession/
    );

    assert.match(
      discardBoundary,
      /createQuickQuoteAnalysisPresentationState/
    );

    assert.match(
      discardBoundary,
      /setQuickQuoteView\("entry"\)/
    );
  }
);

test("photo intelligence review records governed decisions without mutating Quote fields", () => {
  const start = builder.indexOf(
    "async function reviewQuickQuotePhotoSuggestion"
  );

  const end = builder.indexOf(
    "async function addQuickQuoteDraftPhotoFiles",
    start
  );

  assert.ok(start >= 0 && end > start);

  const reviewBoundary = builder.slice(start, end);

  assert.match(
    reviewBoundary,
    /recordWorkflowReview\(\{/
  );

  assert.match(
    reviewBoundary,
    /action: normalizedAction/
  );

  assert.match(
    reviewBoundary,
    /\[item\.id\]: \{/
  );

  assert.match(
    reviewBoundary,
    /text: reviewedText/
  );

  assert.doesNotMatch(
    reviewBoundary,
    /setProblemFound|setNotes|setRecommendedSolution|setMaterialRows|setLaborRows|setTotalOverride/
  );

  assert.doesNotMatch(
    reviewBoundary,
    /applyReviewedQuickQuotePhotoItem/
  );

  assert.match(conversation, /copy\.useSuggestion/);
  assert.match(conversation, /copy\.editAndUse/);
  assert.match(conversation, /copy\.dismissSuggestion/);
  assert.match(conversation, /copy\.photoEvidenceTitle/);
});

test("photo review language is complete across supported Quick Quote locales", () => {
  for (const language of QUICK_QUOTE_CONVERSATION_LANGUAGES) {
    const copy = getQuickQuoteConversationCopy(language);

    for (const key of [
      "addAnotherPhoto",
      "photoChangedNotice",
      "photoAnalysisFailed",
      "photoReviewFailed",
      "photoEvidenceTitle",
      "photoEvidenceHelp",
      "observed",
      "needsVerification",
      "repairSuggestions",
      "materialSuggestions",
      "useSuggestion",
      "editAndUse",
      "dismissSuggestion",
      "saveAndUse",
      "photoAccepted",
      "photoEdited",
      "photoRejected",
      "photoLimitations",
    ]) {
      assert.equal(typeof copy[key], "string", `${language}:${key}`);
      assert.ok(copy[key].trim(), `${language}:${key}`);
    }

    assert.ok(Array.isArray(copy.photoStages));
    assert.equal(copy.photoStages.length, 5);
  }
});


test("photo review preserves edited wording and evidence changes mark prior analysis stale", () => {
  assert.match(
    conversation,
    /decision\?\.text \|\| item\.text/
  );

  assert.match(
    conversation,
    /quick-quote-photo-suggestion/
  );

  assert.match(
    conversation,
    /quick-quote-photo-edit/
  );

  assert.match(
    conversation,
    /quick-quote-photo-decision/
  );

  assert.match(styles, /\.quick-quote-photo-suggestion-list/);
  assert.match(styles, /\.quick-quote-photo-suggestion/);
  assert.match(styles, /\.quick-quote-photo-edit/);
  assert.match(styles, /width: 100%/);
  assert.match(styles, /box-sizing: border-box/);

  assert.match(
    builder,
    /function markQuickQuoteAnalysisStale\(\)/
  );

  assert.match(
    builder,
    /const analysisWasAvailable =\s*quickQuoteAnalysisState\.available/
  );

  assert.ok(
    (
      builder.match(
        /markQuickQuoteAnalysisStale\(\);/g
      ) || []
    ).length >= 3
  );

  assert.match(
    builder,
    /setQuickQuoteView\("entry"\)/
  );

  assert.doesNotMatch(
    builder,
    /\["review", "details"\]\.includes\(quickQuoteView\)/
  );
});

test(
  "entry surfaces photo workflow failures and edit state is proposal scoped",
  () => {
    assert.ok(
      (
        conversation.match(
          /quick-quote-action-notice/g
        ) || []
      ).length >= 2
    );

    assert.match(
      conversation,
      /editingPhotoItemId ===\s*`\$\{photoProposal\.proposalId\}:\$\{sourceItemId\}`/
    );

    assert.match(
      conversation,
      /setEditingPhotoItemId\(\s*`\$\{photoProposal\.proposalId\}:\$\{item\.id\}`/
    );

    assert.doesNotMatch(
      conversation,
      /editingPhotoItemId === item\.id/
    );
  }
);

test("explicit professional instructions prepare structured fields without invented commercial values", () => {
  const patch = buildQuickQuoteConversationPatch({
    prompt: "Repair cracked knee wall and repaint two-tone. About 3–4 days. Final price $2,650 with 75% deposit.",
    current: {},
  });
  assert.equal(patch.estimatedDuration, "3–4 days");
  assert.equal(patch.totalOverride, "2650");
  assert.equal(patch.depositRequired, "Yes");
  assert.equal(patch.depositTerms, "75% deposit");
  assert.match(patch.projectDescription, /cracked knee wall/);
  assert.equal(patch.materialAmount, undefined);
});

test("final quote authority excludes component totals and subtotals", () => {
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "Final quote is $2,650." }).totalOverride, "2650");
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "Quote total is $2,650." }).totalOverride, "2650");
  for (const prompt of [
    "Materials total is $700.",
    "Material total is $700.",
    "Labor total is $1,950.",
    "Installation total is $1,950.",
    "Subtotal is $2,650.",
    "Tax total is $150.",
  ]) {
    assert.equal(buildQuickQuoteConversationPatch({ prompt }).totalOverride, undefined, prompt);
  }
});

test("postfix component totals are not overall quote authority", () => {
  for (const prompt of [
    "Materials $700 total.",
    "Labor $1,950 total.",
    "Installation $280 total.",
    "Tax $150 total.",
  ]) {
    assert.equal(buildQuickQuoteConversationPatch({ prompt }).totalOverride, undefined, prompt);
  }
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "$2,650 final." }).totalOverride, "2650");
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "$2,650 total." }).totalOverride, "2650");
});

test("component total clauses are removed completely from clean scope", () => {
  const patch = buildQuickQuoteConversationPatch({ prompt: "Replace the wall. Materials total is $700." });
  assert.match(patch.projectDescription, /Replace the wall/);
  assert.doesNotMatch(patch.projectDescription, /Materials/);
  assert.equal(patch.totalOverride, undefined);
});

test("duration number words normalize without inventing timing", () => {
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "Should take two days." }).estimatedDuration, "2 days");
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "About three days." }).estimatedDuration, "3 days");
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "two–three days" }).estimatedDuration, "2–3 days");
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "3–4 days" }).estimatedDuration, "3–4 days");
});

test("explicit labor hours and rate produce a calculable labor row", () => {
  const patch = buildQuickQuoteConversationPatch({ prompt: "Labor is 8 hours at $75 per hour." });
  assert.deepEqual(patch.laborItems[0], { description: "Labor", hours: "8", rate: "75" });
  assert.equal(patch.totalOverride, undefined);
});

test("Quick Quote share presentation does not repeat specific labor and material totals", () => {
  assert.match(builder, /const laborShareBlock = laborLines/);
  assert.match(builder, /const materialShareBlock = materialLines/);
  assert.match(builder, /\$\{laborShareBlock\}/);
  assert.match(builder, /\$\{materialShareBlock\}/);
  assert.doesNotMatch(
    builder,
    /pricing\.laborAmount\.toFixed\(2\)\}\n\$\{laborLines/
  );
  assert.doesNotMatch(
    builder,
    /pricing\.materialsAmount\.toFixed\(2\)\}\n\$\{materialLines/
  );
});

test("flat conversational pricing stays flat while explicit hours and rate keep arithmetic", () => {
  const flat = buildQuickQuoteConversationPatch({
    prompt:
      "Reconstruct the wall. Materials are $700. Labor is $1,950. Final price is $2,650.",
  });

  assert.deepEqual(flat.materialItems[0], {
    name: "Materials",
    total: "700",
  });
  assert.deepEqual(flat.laborItems[0], {
    description: "Labor",
    total: "1950",
  });

  const hourly = buildQuickQuoteConversationPatch({
    prompt: "Labor is 8 hours at $75 per hour.",
  });

  assert.deepEqual(hourly.laborItems[0], {
    description: "Labor",
    hours: "8",
    rate: "75",
  });

  assert.match(builder, /function formatQuickQuoteSharePricingLine/);
  assert.match(builder, /pricingPresentation:/);
  assert.doesNotMatch(builder, /item\.hours \|\| "—"/);
  assert.doesNotMatch(builder, /item\.quantity \|\| "—"/);
});

test("only explicitly identified notes and conditions are extracted", () => {
  const note = buildQuickQuoteConversationPatch({ prompt: "Note: protect the existing landscaping." });
  assert.equal(note.notes, "protect the existing landscaping");
  assert.equal(note.terms, undefined);

  const condition = buildQuickQuoteConversationPatch({ prompt: "Condition: paint colors to be confirmed by customer. 50% deposit." });
  assert.equal(condition.terms, "paint colors to be confirmed by customer");
  assert.equal(condition.depositTerms, "50% deposit");
  assert.equal(Object.values(condition).filter((value) => value === "50% deposit").length, 1);
});

test("customer-only revisions patch only the customer field", () => {
  const patch = buildQuickQuoteConversationPatch({
    prompt: "Customer is Maria Lopez.",
    current: { customerName: "Paul Becker", projectDescription: "Repair the knee wall", totalOverride: "2650" },
    revision: true,
  });
  assert.deepEqual(patch, { customerName: "Maria Lopez" });
});

test("revision changes only explicit targeted fields and professional price wins", () => {
  const current = {
    projectTitle: "Knee wall repair",
    projectDescription: "Repair a 24 inch knee wall and paint two-tone",
    problemFound: "Cracked 24 inch knee wall",
    recommendedSolution: "Repair the 24 inch section and paint two-tone",
    totalOverride: "2200",
    notes: "Protect adjacent finishes",
  };
  const patch = buildQuickQuoteConversationPatch({
    prompt: "Make the duration 3–4 days. Final price is $2,650.",
    current,
    revision: true,
  });
  const revised = mergeQuickQuoteConversationPatch(current, patch);
  assert.equal(revised.estimatedDuration, "3–4 days");
  assert.equal(revised.totalOverride, "2650");
  assert.equal(revised.projectDescription, current.projectDescription);
  assert.equal(revised.notes, current.notes);
  assert.deepEqual(Object.keys(patch).sort(), ["estimatedDuration", "timeline", "totalOverride"]);
});

test("duration revision removes stale timing from the clean review scope", () => {
  const current = {
    projectDescription: "Repair a cracked wall. Duration 3–4 days. Final price $2,650.",
    problemFound: "Cracked wall requiring 3–4 days of work.",
    recommendedSolution: "Repair and repaint in 3–4 days.",
    totalOverride: "2650",
  };
  const patch = buildQuickQuoteConversationPatch({
    prompt: "Make the duration 4–5 days.",
    current,
    revision: true,
  });
  const revised = mergeQuickQuoteConversationPatch(current, patch);
  assert.equal(revised.estimatedDuration, "4–5 days");
  assert.doesNotMatch(revised.projectDescription, /3–4 days/);
  assert.doesNotMatch(revised.problemFound, /3–4 days/);
  assert.doesNotMatch(revised.recommendedSolution, /3–4 days/);
  assert.match(revised.projectDescription, /4–5 days/);
  assert.equal(revised.totalOverride, "2650");
});

test("explicit materials and removal instructions do not alter unrelated commercial truth", () => {
  const current = {
    projectDescription: "Repair the 24 inch section and paint two-tone",
    problemFound: "Cracked 24 inch section",
    recommendedSolution: "Rebuild the 24 inch section and paint two-tone",
    totalOverride: "2650",
  };
  const materialsPatch = buildQuickQuoteConversationPatch({
    prompt: "Use $500 materials.", current, revision: true,
  });
  assert.equal(materialsPatch.materialAmount, "500");
  assert.equal(materialsPatch.totalOverride, undefined);
  const removalPatch = buildQuickQuoteConversationPatch({
    prompt: "Remove 24 inch.", current, revision: true,
  });
  assert.doesNotMatch(removalPatch.projectDescription, /24 inch/);
  assert.equal(removalPatch.totalOverride, undefined);
});


test("natural field-service shorthand parser remains available without granting Job Analysis Quote authority", () => {
  const patch = buildQuickQuoteConversationPatch({
    prompt:
      "customer cristal Tejada ceiling fan installation at 117 se 2nd ave, price for fan 180 dollar, installation 160 dollars",
  });

  assert.equal(patch.customerName, "cristal Tejada");
  assert.equal(patch.customerLocation, "117 se 2nd ave");
  assert.match(
    patch.projectDescription,
    /ceiling fan installation/i
  );

  assert.doesNotMatch(
    patch.projectDescription,
    /cristal Tejada/i
  );

  assert.doesNotMatch(
    patch.projectDescription,
    /117 se 2nd ave/i
  );

  assert.doesNotMatch(
    patch.projectDescription,
    /180|160/
  );

  assert.deepEqual(patch.materialItems, [
    { name: "fan", total: "180" },
  ]);

  assert.deepEqual(patch.laborItems, [
    { description: "installation", total: "160" },
  ]);

  assert.equal(patch.totalOverride, undefined);

  assert.equal(
    Number(patch.materialItems[0].total) +
      Number(patch.laborItems[0].total),
    340
  );

  // Parser capability remains, but universal Job Analysis does not apply it.
  assert.doesNotMatch(
    builder,
    /applyQuickQuoteConversationPatch/
  );
});

test("detailed knee-wall conversation extracts clean structured draft with final price authority", () => {
  const patch = buildQuickQuoteConversationPatch({
    prompt: "Quote for Paul Becker. Reconstruct the damaged front knee wall. Remove the damaged block, expose the footing, install rebar, rebuild with concrete block, apply stucco, prime, and repaint the wall in the existing two-tone finish. Materials are $700. Labor is $1,950. Estimated duration is 3–4 days. 50% deposit required. Final price is $2,650.",
  });
  const scope = patch.recommendedSolution;
  assert.equal(patch.customerName, "Paul Becker");
  assert.match(scope, /Reconstruct the damaged front knee wall/);
  assert.match(scope, /Remove the damaged block, expose the footing, install rebar, rebuild with concrete block, apply stucco, prime, and repaint/);
  assert.equal(patch.materialItems[0].total, "700");
  assert.equal(patch.laborItems[0].total, "1950");
  assert.equal(patch.estimatedDuration, "3–4 days");
  assert.equal(patch.depositTerms, "50% deposit");
  assert.equal(patch.totalOverride, "2650");
  for (const excluded of ["Paul Becker", "$700", "$1,950", "$2,650", "3–4 days", "50% deposit"]) {
    assert.doesNotMatch(scope, new RegExp(excluded.replace(/[.$]/g, "\\$&")));
  }
});

test("structured material and labor totals calculate when no final price is stated", () => {
  const patch = buildQuickQuoteConversationPatch({
    prompt: "Quote for Paul Becker. Reconstruct the damaged front knee wall. Materials are $700. Labor is $1,950. Estimated duration is 3–4 days. 50% deposit required.",
  });
  assert.equal(patch.customerName, "Paul Becker");
  assert.equal(patch.materialItems[0].total, "700");
  assert.equal(patch.laborItems[0].total, "1950");
  assert.equal(patch.estimatedDuration, "3–4 days");
  assert.equal(patch.depositTerms, "50% deposit");
  assert.equal(patch.totalOverride, undefined);
  assert.equal(Number(patch.materialItems[0].total) + Number(patch.laborItems[0].total), 2650);
});

test("duration, generic materials, final price, and targeted material revisions remain governed", () => {
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "About 3–4 days." }).estimatedDuration, "3–4 days");
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "Should take one day." }).estimatedDuration, "1 day");
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "Use $500 materials." }).materialAmount, "500");
  assert.equal(buildQuickQuoteConversationPatch({ prompt: "Reconstruct the knee wall. Materials are $700. Labor is $1,950. Final price is $2,800." }).totalOverride, "2800");

  const current = { materialItems: [{ name: "Materials", quantity: "1", cost: "700" }] };
  const revision = buildQuickQuoteConversationPatch({ prompt: "Change materials to $750.", current, revision: true });
  assert.equal(revision.materialAmount, "750");
  assert.equal(revision.totalOverride, undefined);
});

test("secondary door conversation keeps material and installation rows distinct", () => {
  const patch = buildQuickQuoteConversationPatch({
    prompt: "Quote for Bob Hamel. Replace the front door. Door costs $450 and installation is $280. Should take one day. 50% deposit.",
  });
  assert.equal(patch.customerName, "Bob Hamel");
  assert.equal(patch.recommendedSolution, "Replace the front door.");
  assert.deepEqual(patch.materialItems[0], {
    name: "Door",
    total: "450",
  });
  assert.deepEqual(patch.laborItems[0], { description: "installation", total: "280" });
  assert.equal(patch.estimatedDuration, "1 day");
  assert.equal(patch.depositTerms, "50% deposit");
  assert.equal(patch.totalOverride, undefined);
});


test(
  "R1-04C renders only durable Professional and Meetro conversation turns with explicit follow-up submission",
  () => {
    assert.match(
      conversation,
      /<QuickQuoteAnalysisThread/
    );

    assert.match(
      conversation,
      /turns=\{analysisTurns\}/
    );

    assert.match(
      analysisThread,
      /turn\?\.role === "PROFESSIONAL"/
    );

    assert.match(
      analysisThread,
      /turn\?\.payload\?\.message/
    );

    assert.match(
      analysisThread,
      /turn\?\.payload\?\.assistantMessage/
    );

    assert.match(
      analysisThread,
      /contextLabel="quick-quote-analysis-follow-up"/
    );

    assert.match(
      analysisThread,
      /await onContinue\(message\)/
    );

    assert.match(
      analysisThread,
      /disabled=\{\s*busy \|\|\s*!followUpMessage\.trim\(\)\s*\}/
    );

    assert.doesNotMatch(
      analysisThread,
      /localStorage|sessionStorage|fetch\(|\/turns/
    );
  }
);

test(
  "R1-04C continuation is bound to the current server session and latest proposal without caller authority",
  () => {
    const start =
      builder.indexOf(
        "async function continueQuickQuoteConversation"
      );

    const end =
      builder.indexOf(
        "async function reviewQuickQuotePhotoSuggestion",
        start
      );

    assert.ok(
      start >= 0 &&
      end > start
    );

    const boundary =
      builder.slice(
        start,
        end
      );

    assert.match(
      boundary,
      /continueQuickQuoteAnalysisSession/
    );

    assert.match(
      boundary,
      /sessionId:\s*presentation\.sessionId/
    );

    assert.match(
      boundary,
      /priorProposalId:\s*priorProposal\.proposalId/
    );

    assert.match(
      boundary,
      /message:\s*normalizedMessage/
    );

    assert.match(
      boundary,
      /applyQuickQuoteAnalysisExecutionToPresentationState/
    );

    assert.doesNotMatch(
      boundary,
      /actorUserId|evidenceVersion:|provider:|operation:|turnPayload:|role:/
    );

    assert.doesNotMatch(
      boundary,
      /setCustomerName|setProblemFound|setRecommendedSolution|setMaterialRows|setLaborRows|setTotalOverride/
    );
  }
);

test(
  "R1-04C keeps proposal review bound to the current non-stale server proposal",
  () => {
    const start =
      builder.indexOf(
        "async function reviewQuickQuotePhotoSuggestion"
      );

    const end =
      builder.indexOf(
        "async function addQuickQuoteDraftPhotoFiles",
        start
      );

    assert.ok(
      start >= 0 &&
      end > start
    );

    const boundary =
      builder.slice(
        start,
        end
      );

    assert.match(
      boundary,
      /quickQuoteAnalysisState\.stale/
    );

    assert.match(
      boundary,
      /quickQuoteAnalysisSessionState\.stale/
    );

    assert.match(
      boundary,
      /\.latestProposal[\s\S]*\.proposalId !==[\s\S]*proposal\.proposalId/
    );
  }
);

test(
  "R1-04C surfaces provider questions and preserves four-language conversation parity",
  () => {
    assert.match(
      conversation,
      /photoProposal\.questionsForProfessional/
    );

    assert.match(
      conversation,
      /copy\.questionsForProfessional/
    );

    for (
      const language of
        QUICK_QUOTE_CONVERSATION_LANGUAGES
    ) {
      const copy =
        getQuickQuoteConversationCopy(
          language
        );

      for (const key of [
        "analysisConversationTitle",
        "analysisConversationHelp",
        "professionalTurnLabel",
        "followUpLabel",
        "followUpPlaceholder",
        "sendFollowUp",
        "continuingAnalysis",
        "questionsForProfessional",
      ]) {
        assert.equal(
          typeof copy[key],
          "string",
          `${language}.${key}`
        );

        assert.ok(
          copy[key].trim(),
          `${language}.${key}`
        );
      }
    }
  }
);

test(
  "R1-04C multi-turn conversation stays contained and touch-safe at 390px",
  () => {
    assert.match(
      styles,
      /\.quick-quote-analysis-turn[\s\S]*max-width: min\(88%, 720px\)/
    );

    assert.match(
      styles,
      /\.quick-quote-follow-up-label textarea[\s\S]*width: 100%[\s\S]*box-sizing: border-box/
    );

    assert.match(
      styles,
      /\.quick-quote-follow-up-actions button[\s\S]*min-height: 48px/
    );

    assert.match(
      styles,
      /@media \(max-width: 430px\)[\s\S]*\.quick-quote-follow-up-actions[\s\S]*grid-template-columns: 1fr/
    );
  }
);

test("working and analysis screens expose private analysis stages without premature Quote actions", () => {
  const languageSource = read(
    "src/utils/quickQuoteConversationLanguage.js"
  );

  for (const stage of [
    "Review job details",
    "Separate observations",
    "Flag verification",
    "Consider repair options",
    "Consider material categories",
  ]) {
    assert.match(
      languageSource,
      new RegExp(stage)
    );
  }

  assert.match(conversation, /copy\.sourceInformation/);
  assert.match(conversation, /copy\.photoEvidenceTitle/);
  assert.match(conversation, /copy\.photoLimitations/);
  assert.match(conversation, /copy\.draftTruth/);

  assert.doesNotMatch(conversation, /copy\.customer/);
  assert.doesNotMatch(conversation, /copy\.scope/);
  assert.doesNotMatch(conversation, /copy\.laborDuration/);
  assert.doesNotMatch(conversation, /copy\.paymentTerms/);
  assert.doesNotMatch(conversation, /copy\.total/);
  assert.doesNotMatch(conversation, /copy\.previewPdf/);
  assert.doesNotMatch(conversation, /copy\.sharePdf/);
  assert.doesNotMatch(conversation, /copy\.fullDetailsLabel/);

  assert.doesNotMatch(
    builder,
    /summary=\{quickQuoteReviewSummary\}/
  );

  assert.doesNotMatch(
    builder,
    /onPreviewPdf=\{previewQuickQuotePdf\}/
  );
});

test("Quick Quote conversation copy has exact EN ES FR PT-BR parity", () => {
  assert.deepEqual(QUICK_QUOTE_CONVERSATION_LANGUAGES, ["en", "es", "fr", "pt-BR"]);
  const keys = Object.keys(getQuickQuoteConversationCopy("en")).sort();
  for (const language of QUICK_QUOTE_CONVERSATION_LANGUAGES) {
    const copy = getQuickQuoteConversationCopy(language);
    assert.deepEqual(Object.keys(copy).sort(), keys);
    for (const key of keys) {
      if (Array.isArray(copy[key])) assert.equal(copy[key].length, 5);
      else assert.ok(String(copy[key]).trim(), `${language}.${key}`);
    }
  }
});

test("review and input controls remain contained at exact 390px capability", () => {
  assert.match(styles, /@media \(max-width: 430px\)[\s\S]*\.quick-quote-input-row[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.quick-quote-input-row > :nth-child\(3\)[\s\S]*grid-column: 1 \/ -1/);
  assert.match(styles, /\.quick-quote-input-row button[\s\S]*min-height: 48px/);
  assert.match(styles, /\.quick-quote-details-toggle[\s\S]*min-height: 48px/);
  assert.match(styles, /\.quick-quote-review-grid[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*\.quick-quote-review-grid[\s\S]*grid-template-columns: 1fr/);
  assert.match(conversation, /ref=\{surfaceRef\} tabIndex=\{-1\}/);
});

test("internal Job Analysis Back stays in memory while full exit confirms and cleans governed media before navigation", () => {
  const internalStart = builder.indexOf(
    "function backToQuickQuoteJobDetails()"
  );

  const internalEnd = builder.indexOf(
    "function returnToQuickQuoteAnalysis()",
    internalStart
  );

  assert.ok(
    internalStart >= 0 && internalEnd > internalStart
  );

  const internalBack = builder.slice(
    internalStart,
    internalEnd
  );

  assert.match(
    internalBack,
    /setQuickQuoteView\("entry"\)/
  );

  assert.doesNotMatch(
    internalBack,
    /cleanupQuoteDraftPhoto|setPage|localStorage|sessionStorage/
  );

  const exitStart = builder.indexOf(
    "async function exitQuickQuoteAnalysis()"
  );

  const exitEnd = builder.indexOf(
    "\n\n  return (",
    exitStart
  );

  assert.ok(exitStart >= 0 && exitEnd > exitStart);

  const exitBoundary = builder.slice(
    exitStart,
    exitEnd
  );

  assert.match(exitBoundary, /window\.confirm\(/);
  assert.match(exitBoundary, /quickQuoteCopy\.discardTitle/);
  assert.match(exitBoundary, /quickQuoteCopy\.discardBody/);
  assert.match(exitBoundary, /cleanupQuoteDraftPhoto\(\{/);
  assert.match(exitBoundary, /failedPhotoIds/);
  assert.match(
    exitBoundary,
    /setQuickQuotePhotoNotice\(\s*quickQuoteCopy\.photoCleanupFailed/
  );

  const clearRef = exitBoundary.indexOf(
    "quickQuoteDraftPhotosRef.current = [];"
  );

  const navigate = exitBoundary.indexOf(
    "navigateFromQuoteBuilder();"
  );

  assert.ok(clearRef >= 0);
  assert.ok(navigate > clearRef);
});

test("description changes mark an existing analysis stale without browser persistence authority", () => {
  const start = builder.indexOf(
    "function handleQuickQuotePromptChange(value)"
  );

  const end = builder.indexOf(
    "function backToQuickQuoteJobDetails()",
    start
  );

  assert.ok(start >= 0 && end > start);

  const promptBoundary = builder.slice(start, end);

  assert.match(
    promptBoundary,
    /setQuickQuotePrompt\(value\)/
  );

  assert.match(
    promptBoundary,
    /markQuickQuoteAnalysisStale\(\)/
  );

  assert.doesNotMatch(
    promptBoundary,
    /localStorage|sessionStorage/
  );
});

test(
  "R1-05B hydrates first-class Reviewed Solution and Materials List only from the server projection",
  () => {
    assert.match(
      builder,
      /loadQuickQuoteAnalysisReviewedResult/
    );

    assert.match(
      builder,
      /quickQuoteReviewedResult/
    );

    /*
     * R1-05B hardening:
     * the reviewed result is now passed only when the
     * current browser presentation still matches the same
     * durable session, evidence version, and proposal.
     */
    assert.match(
      builder,
      /reviewedResult=\{[\s\S]*!quickQuoteAnalysisState\.stale[\s\S]*!quickQuoteAnalysisSessionState\.stale[\s\S]*analysisSessionId[\s\S]*evidenceVersion[\s\S]*proposalId[\s\S]*\? quickQuoteReviewedResult[\s\S]*: null/
    );

    assert.match(
      builder,
      /expectedEvidenceVersion:\s*evidenceVersion/
    );

    assert.match(
      builder,
      /expectedProposalId:\s*proposalId/
    );

    const reviewStart =
      builder.indexOf(
        "async function reviewQuickQuotePhotoSuggestion"
      );

    const reviewEnd =
      builder.indexOf(
        "async function addQuickQuoteDraftPhotoFiles",
        reviewStart
      );

    assert.ok(
      reviewStart >= 0 &&
      reviewEnd > reviewStart
    );

    const reviewBoundary =
      builder.slice(
        reviewStart,
        reviewEnd
      );

    const recordIndex =
      reviewBoundary.indexOf(
        "await recordWorkflowReview"
      );

    const refreshIndex =
      reviewBoundary.indexOf(
        "await refreshQuickQuoteReviewedResult"
      );

    assert.ok(
      recordIndex >= 0 &&
      refreshIndex > recordIndex
    );

    assert.doesNotMatch(
      reviewBoundary,
      /setProblemFound|setNotes|setRecommendedSolution|setMaterialRows|setLaborRows|setTotalOverride/
    );

    assert.match(
      conversation,
      /reviewedResult = null/
    );

    assert.match(
      conversation,
      /copy\.reviewedSolution/
    );

    assert.match(
      conversation,
      /copy\.materialsList/
    );

    assert.match(
      conversation,
      /reviewedResult\.needsVerification/
    );

    const reviewedStart =
      conversation.indexOf(
        "const reviewedSections"
      );

    const reviewedEnd =
      conversation.indexOf(
        "function photoDecisionLabel",
        reviewedStart
      );

    assert.ok(
      reviewedStart >= 0 &&
      reviewedEnd > reviewedStart
    );

    const reviewedBoundary =
      conversation.slice(
        reviewedStart,
        reviewedEnd
      );

    assert.doesNotMatch(
      reviewedBoundary,
      /questionsForProfessional/
    );

    assert.doesNotMatch(
      reviewedBoundary,
      /photoDecisions/
    );
  }
);

test(
  "R1-05B hides stale reviewed authority and preserves four-language reviewed-result copy",
  () => {
    const staleStart =
      builder.indexOf(
        "function markQuickQuoteAnalysisStale"
      );

    const staleEnd =
      builder.indexOf(
        "function handleQuickQuotePromptChange",
        staleStart
      );

    assert.ok(
      staleStart >= 0 &&
      staleEnd > staleStart
    );

    const staleBoundary =
      builder.slice(
        staleStart,
        staleEnd
      );

    assert.match(
      staleBoundary,
      /invalidateQuickQuoteReviewedResult\(\)/
    );

    for (
      const language of
        QUICK_QUOTE_CONVERSATION_LANGUAGES
    ) {
      const copy =
        getQuickQuoteConversationCopy(
          language
        );

      for (
        const key of [
          "reviewedResultTitle",
          "reviewedResultHelp",
          "reviewedSolution",
          "materialsList",
          "reviewedResultLoadFailed",
        ]
      ) {
        assert.equal(
          typeof copy[key],
          "string"
        );

        assert.ok(
          copy[key].trim()
        );
      }
    }

    const english =
      getQuickQuoteConversationCopy(
        "en"
      );

    assert.equal(
      english.reviewedSolution,
      "Reviewed Solution"
    );

    assert.equal(
      english.materialsList,
      "Materials List"
    );

    assert.match(
      english.reviewedResultHelp,
      /private/i
    );

    assert.match(
      english.reviewedResultHelp,
      /does not change the Quote/i
    );
  }
);

test(
  "R1-05B reviewed-result surface remains mobile-contained and introduces no R1-06 action",
  () => {
    assert.match(
      styles,
      /\.quick-quote-reviewed-result\s*\{[\s\S]*min-width:\s*0/
    );

    assert.match(
      styles,
      /\.quick-quote-reviewed-result-section li\s*\{[\s\S]*overflow-wrap:\s*anywhere/
    );

    assert.match(
      styles,
      /@media \(max-width: 430px\)[\s\S]*\.quick-quote-reviewed-result/
    );

    assert.doesNotMatch(
      conversation,
      /Solution Ready|Confirm Solution Ready|Create Quote/
    );

    assert.doesNotMatch(
      conversation,
      /setMaterialRows|setLaborRows|setTotalOverride/
    );
  }
);

test(
  "R1-05B prevents superseded reviewed-result requests from reviving stale or older proposal authority",
  () => {
    assert.match(
      builder,
      /quickQuoteReviewedResultRequestRef/
    );

    assert.match(
      builder,
      /function invalidateQuickQuoteReviewedResult/
    );

    assert.match(
      builder,
      /quickQuoteReviewedResultRequestRef\.current \+= 1/
    );

    assert.match(
      builder,
      /const requestGeneration =[\s\S]*quickQuoteReviewedResultRequestRef[\s\S]*\.current \+ 1/
    );

    assert.match(
      builder,
      /quickQuoteReviewedResultRequestRef\.current !==[\s\S]*requestGeneration/
    );

    const staleStart =
      builder.indexOf(
        "function markQuickQuoteAnalysisStale"
      );

    const staleEnd =
      builder.indexOf(
        "function handleQuickQuotePromptChange",
        staleStart
      );

    assert.ok(
      staleStart >= 0 &&
      staleEnd > staleStart
    );

    assert.match(
      builder.slice(
        staleStart,
        staleEnd
      ),
      /invalidateQuickQuoteReviewedResult\(\)/
    );

    assert.match(
      builder,
      /reviewedResult=\{[\s\S]*!quickQuoteAnalysisState\.stale[\s\S]*!quickQuoteAnalysisSessionState\.stale[\s\S]*analysisSessionId[\s\S]*evidenceVersion[\s\S]*proposalId/
    );
  }
);

test(
  "R1-05B serializes review persistence and reviewed-result refresh",
  () => {
    const start =
      builder.indexOf(
        "async function reviewQuickQuotePhotoSuggestion"
      );

    const end =
      builder.indexOf(
        "async function addQuickQuoteDraftPhotoFiles",
        start
      );

    assert.ok(
      start >= 0 &&
      end > start
    );

    const boundary =
      builder.slice(
        start,
        end
      );

    const recordIndex =
      boundary.indexOf(
        "await recordWorkflowReview"
      );

    const refreshIndex =
      boundary.indexOf(
        "await refreshQuickQuoteReviewedResult"
      );

    const busyFalseIndex =
      boundary.indexOf(
        "busy: false",
        refreshIndex
      );

    assert.match(
      boundary,
      /busy: true,[\s\S]*reviewingId: item\.id/
    );

    assert.ok(
      recordIndex >= 0 &&
      refreshIndex > recordIndex &&
      busyFalseIndex > refreshIndex
    );
  }
);
