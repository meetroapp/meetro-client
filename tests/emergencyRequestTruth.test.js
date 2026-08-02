import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const emergencySource = readFileSync(
  new URL("../src/pages/Emergency.jsx", import.meta.url),
  "utf8"
);

const requestSource = readFileSync(
  new URL("../src/pages/EmergencyRequest.jsx", import.meta.url),
  "utf8"
);

const relationshipDetailSource = readFileSync(
  new URL(
    "../src/components/EmergencyRelationshipDetail.jsx",
    import.meta.url
  ),
  "utf8"
);

const summarySource = readFileSync(
  new URL(
    "../src/utils/emergencySummary.js",
    import.meta.url
  ),
  "utf8"
);

const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8"
);

test("Emergency entry opens the canonical request and matching workflow", () => {
  assert.match(emergencySource, /Emergency requests available/);
  assert.match(
    emergencySource,
    /buildEmergencyDraftRoute\(service\.value\)/
  );
  assert.match(
    emergencySource,
    /connect with a compatible professional/
  );
  assert.match(emergencySource, /call 911/);

  assert.doesNotMatch(emergencySource, /Available now/);
  assert.doesNotMatch(
    emergencySource,
    /setPage\("emergencyBusinessSelection"\)/
  );
  assert.doesNotMatch(emergencySource, /localStorage/);
});

test("Emergency card selection uses bounded URL context without browser authority", () => {
  assert.match(emergencySource, /buildEmergencyDraftRoute/);
  assert.match(
    requestSource,
    /service:\s*emergencyRoute\.serviceSpecialty \|\| ""/
  );
  assert.match(
    requestSource,
    /buildDraftForm\(recoveredRequest, \{/
  );

  for (const forbidden of [
    "localStorage.setItem",
    "sessionStorage.setItem",
  ]) {
    assert.equal(emergencySource.includes(forbidden), false);
    assert.equal(requestSource.includes(forbidden), false);
  }
});

test("top-level navigation preserves query context while rendering the route page", () => {
  assert.match(
    appSource,
    /const routePage = getRoutePage\(newPage\)/
  );
  assert.match(
    appSource,
    /window\.location\.hash = finalPage;[\s\S]*?setPageState\(finalRoutePage\)/
  );
});

test("Emergency Request uses canonical draft, safety, recovery, submission, and cancellation commands", () => {
  assert.match(
    requestSource,
    /createEmergencyDraft/
  );
  assert.match(
    requestSource,
    /updateEmergencyDraft/
  );
  assert.match(
    requestSource,
    /saveEmergencySafetyAssessment/
  );

  assert.match(
    requestSource,
    /prepareEmergencyRequest/
  );
  assert.match(
    requestSource,
    /cancelEmergencyRequest/
  );
  assert.match(
    requestSource,
    /getEmergencyRequest/
  );
  assert.match(
    requestSource,
    /parseEmergencyRequestRoute/
  );
  assert.match(
    requestSource,
    /replaceEmergencyRequestRoute/
  );
});

test("Emergency cancellation requires explicit confirmation and backend success", () => {
  assert.match(
    requestSource,
    /cancelConfirmationOpen/
  );
  assert.match(
    requestSource,
    /requestCancellation/
  );
  assert.match(
    requestSource,
    /confirmCancellation/
  );
  assert.match(
    requestSource,
    /cancelEmergencyRequest/
  );
  assert.match(
    requestSource,
    /Yes, Cancel Request/
  );
  assert.match(
    requestSource,
    /Keep Request/
  );
});

test("Emergency submission requires explicit acknowledgment and backend prepare success", () => {
  assert.match(
    requestSource,
    /submissionConfirmationOpen/
  );
  assert.match(
    requestSource,
    /requestSubmission/
  );
  assert.match(
    requestSource,
    /confirmSubmission/
  );
  assert.match(
    requestSource,
    /prepareEmergencyRequest/
  );
  assert.match(
    requestSource,
    /I understand that submitting this request/
  );
  assert.match(
    requestSource,
    /Yes, Submit Request/
  );
  assert.match(
    requestSource,
    /Keep Editing/
  );
});

test("Emergency submission becomes read-only and available for compatible responses", () => {
  assert.match(
    summarySource,
    /Waiting for Professional Responses/
  );
  assert.match(
    requestSource,
    /available to compatible professionals/
  );
  assert.match(
    requestSource,
    /phase !== "complete"/
  );
  assert.match(
    requestSource,
    /setPhase\("lifecycle"\)/
  );
});


test("Emergency cancellation is limited to governed pre-distribution statuses", () => {
  assert.match(
    requestSource,
    /getRequestStatus\(record\) === "draft"/
  );
  assert.match(
    requestSource,
    /canCancelEmergencyRequest/
  );
  assert.doesNotMatch(requestSource, /\["draft", "safety_blocked"\]/);
});

test("non-draft Emergency records render read-only canonical lifecycle state", () => {
  assert.match(
    requestSource,
    /isEditableEmergencyDraft/
  );
  assert.match(
    requestSource,
    /getRecoveredPhase/
  );
  assert.match(
    requestSource,
    /phase\("lifecycle"\)|setPhase\("lifecycle"\)/
  );
  assert.match(
    requestSource,
    /<EmergencyRelationshipDetail/
  );
  assert.match(
    relationshipDetailSource,
    /<EmergencyTimeline/
  );
  assert.match(
    summarySource,
    /Emergency Request Cancelled/
  );
  assert.match(
    summarySource,
    /Safety Action Required/
  );
  assert.match(
    requestSource,
    /Emergency Request Submitted/
  );
  assert.match(
    requestSource,
    /read-only canonical record/
  );
});

test("Emergency submission and cancellation avoid legacy downstream routes", () => {
  assert.match(
    requestSource,
    /prepareEmergencyRequest/
  );
  assert.doesNotMatch(
    requestSource,
    /setPage\("emergencyStatus"\)/
  );
  assert.doesNotMatch(
    requestSource,
    /setPage\("emergencyDispatch"\)/
  );
  assert.doesNotMatch(
    requestSource,
    /setPage\("emergencyChat"\)/
  );
});

test("Emergency Request resumes only exact backend-owned route identity", () => {
  assert.match(
    requestSource,
    /emergencyRoute\.requestId/
  );
  assert.match(
    requestSource,
    /getEmergencyRequest/
  );
  assert.match(
    requestSource,
    /buildDraftForm\(recoveredRequest/
  );
  assert.match(
    requestSource,
    /buildSafetyForm\(recoveredRequest/
  );
  assert.match(
    requestSource,
    /recoveryState/
  );

  assert.doesNotMatch(
    requestSource,
    /latestEmergency|listEmergency|activeEmergencyRequestId/
  );
});

test("Emergency Request carries the certified backend draft payload", () => {
  for (const field of [
    "category",
    "serviceDomain",
    "serviceSpecialty",
    "title",
    "description",
    "locationText",
    "unitNumber",
    "accessNotes",
  ]) {
    assert.match(requestSource, new RegExp(field));
  }
});

test("Emergency safety review carries all governed safety fields", () => {
  for (const field of [
    "immediateDanger",
    "medicalEmergency",
    "fireOrSmoke",
    "gasOdorOrSuspectedLeak",
    "activeCrimeOrThreat",
    "electricalImmediateHazard",
    "structuralCollapseRisk",
    "floodingOrWaterDamage",
    "occupantsUnableToExit",
    "emergencyServicesContacted",
    "safeToRemainAtLocation",
    "additionalSafetyContext",
  ]) {
    assert.match(requestSource, new RegExp(field));
  }
});

test("Emergency safety review confirms canonical draft progress only after success", () => {
  assert.match(requestSource, /Step 1 complete/);
  assert.match(requestSource, /Emergency draft saved\./);
  assert.match(requestSource, /Step 2/);
  assert.match(
    requestSource,
    /if \(!result\.ok \|\| !result\.emergencyRequest\) \{[\s\S]*?return;[\s\S]*?setOwnedCanonicalRequest\(nextOwnedRequest\);[\s\S]*?setPhase\("safety"\);/
  );
  assert.match(
    requestSource,
    /phase === "safety"[\s\S]*?role="status" aria-live="polite"/
  );
});

test("Emergency safety review permits no listed hazards without inventing authority", () => {
  assert.match(
    requestSource,
    /Select every listed hazard that is currently true/
  );
  assert.match(
    requestSource,
    /If none of the listed hazards apply, leave the hazard boxes unchecked/
  );
  assert.match(requestSource, /Listed hazard conditions/);
  assert.match(requestSource, /Current safety status/);
  assert.doesNotMatch(
    requestSource,
    /noHazardsApply|noneApply|no_hazards_apply|none_apply/
  );
  assert.doesNotMatch(
    requestSource,
    /some\(\(.*safety|required.*hazard/i
  );
});

test("Emergency safety review preserves canonical blocking and truthful action", () => {
  assert.match(requestSource, /Save Safety Review/);
  assert.match(requestSource, /safety_blocked/);
  assert.match(
    requestSource,
    /saveEmergencySafetyAssessment/
  );
  assert.doesNotMatch(
    requestSource,
    /deriveSafetyDisposition|safeToDistribute|isEmergencySafe/
  );
});

test("Emergency safety transition focuses once and failures remain visible", () => {
  assert.match(requestSource, /safetyReviewHeadingRef/);
  assert.match(requestSource, /heading\.focus\(\{ preventScroll: true \}\)/);
  assert.match(requestSource, /heading\.scrollIntoView/);
  assert.match(requestSource, /tabIndex=\{-1\}/);
  assert.match(
    requestSource,
    /errorMessage && \([\s\S]*?inlineErrorNotice/
  );
});

test("Emergency Request creates no browser workflow authority", () => {
  for (const forbidden of [
    "localStorage.setItem",
    "sessionStorage.setItem",
    "activeEmergencyRequestId",
    "activeEmergencyRecord",
    "emergencyDispatchStatus",
    "emergencyConversationId",
    "meetroEmergencyConversationUpdated",
    "Date.now()",
    "Math.random()",
    "crypto.randomUUID",
    "createNotification",
    "meetro_conversation_registry",
    'status: "sent"',
    "setPage(\"emergencyStatus\")",
    "setPage(\"emergencyDispatch\")",
    "setPage(\"emergencyChat\")",
  ]) {
    assert.equal(
      requestSource.includes(forbidden),
      false,
      `Forbidden Emergency browser authority found: ${forbidden}`
    );
  }
});

test("Emergency Request exposes canonical distribution, selection, and conversation entry", () => {
  assert.match(
    requestSource,
    /Saving this draft does not dispatch a professional/
  );
  assert.match(
    requestSource,
    /listHomeownerEmergencyResponses/
  );
  assert.match(
    requestSource,
    /selectHomeownerEmergencyResponse/
  );
  assert.match(
    requestSource,
    /fetchCanonicalConversations/
  );
  assert.match(
    requestSource,
    /buildCanonicalConversationRoute/
  );
  assert.match(
    requestSource,
    /location and access notes remain private until I select a professional/
  );
});

test("Emergency Request preserves safe navigation", () => {
  assert.match(requestSource, /setPage\("emergency"\)/);
  assert.match(requestSource, /setPage\("home"\)/);
  assert.match(
    requestSource,
    /<BottomNav currentPage="emergency" setPage=\{setPage\} \/>/
  );
});
