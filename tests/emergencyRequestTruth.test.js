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
  assert.match(emergencySource, /setPage\("emergencyRequest"\)/);
  assert.doesNotMatch(emergencySource, /EMERGENCY_SERVICE_OPTIONS/);
  assert.doesNotMatch(emergencySource, /Start Emergency Draft/);
  assert.doesNotMatch(emergencySource, /localStorage/);
});

test("Emergency service selection stays inside the canonical request without browser authority", () => {
  assert.match(requestSource, /EMERGENCY_SERVICE_OPTIONS\.map/);
  assert.doesNotMatch(requestSource, /HOMEOWNER_EMERGENCY_SERVICE_(?:VALUES|OPTIONS)/);
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

test("Safety Continue prepares only after backend-authorized safety success", () => {
  const handler = requestSource.slice(
    requestSource.indexOf("async function submitSafety"),
    requestSource.indexOf("function editDetails")
  );
  assert.ok(handler.indexOf("saveEmergencySafetyAssessment(") >= 0);
  assert.ok(
    handler.indexOf("prepareEmergencyRequest(") >
      handler.indexOf("hasBackendSafetyPermissionToPrepare")
  );
  assert.doesNotMatch(requestSource, /submissionConfirmationOpen/);
});

test("Emergency preparation requires ready-for-distribution before Find Help", () => {
  assert.match(
    summarySource,
    /Waiting for Professional Responses/
  );
  assert.match(
    requestSource,
    /ready_for_distribution/
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

test("Emergency details advance to Safety Check only after canonical save success", () => {
  assert.match(requestSource, /Continue to Safety Check/);
  assert.match(
    requestSource,
    /if \(!result\.ok \|\| !result\.emergencyRequest\) \{[\s\S]*?return;[\s\S]*?setOwnedCanonicalRequest\(nextOwnedRequest\);[\s\S]*?setPhase\("safety"\);/
  );
  assert.match(
    requestSource,
    /phase === "safety"[\s\S]*?onSubmit=\{submitSafety\}/
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

test("Emergency Safety Check preserves canonical blocking and truthful action", () => {
  assert.match(requestSource, /Continue to Find Help/);
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
    /Meetro helps you connect with an available professional/
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
  assert.match(requestSource, /unitNumber: ""/);
  assert.match(requestSource, /accessNotes: ""/);
});

test("Emergency Request preserves safe navigation", () => {
  assert.match(requestSource, /setPage\("home"\)/);
  assert.match(
    requestSource,
    /<BottomNav currentPage="emergency" setPage=\{setPage\} \/>/
  );
});
