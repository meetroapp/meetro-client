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

test("Emergency entry opens canonical drafting without promising response", () => {
  assert.match(emergencySource, /Drafting available/);
  assert.match(emergencySource, /setPage\("emergencyRequest"\)/);
  assert.match(
    emergencySource,
    /does not yet distribute Emergency requests/
  );
  assert.match(emergencySource, /call 911/);

  assert.doesNotMatch(emergencySource, /Available now/);
  assert.doesNotMatch(
    emergencySource,
    /setPage\("emergencyBusinessSelection"\)/
  );
  assert.doesNotMatch(emergencySource, /localStorage/);
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
    /await cancelEmergencyRequest/
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
    /await prepareEmergencyRequest/
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

test("Emergency submission becomes read-only and awaiting future distribution only", () => {
  assert.match(
    requestSource,
    /Submitted — Awaiting Future Distribution/
  );
  assert.match(
    requestSource,
    /No professional has been notified, matched, assigned, or dispatched/
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
    /\["draft", "safety_blocked"\]/
  );
  assert.match(
    requestSource,
    /canCancelEmergencyRequest/
  );
  assert.doesNotMatch(
    requestSource,
    /\["ready_for_distribution".*"cancel/
  );
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
    /Emergency Request Cancelled/
  );
  assert.match(
    requestSource,
    /Emergency Workflow Blocked/
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

test("Emergency submission and cancellation preserve disabled downstream workflow", () => {
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
    /initialEmergencyRoute\.requestId/
  );
  assert.match(
    requestSource,
    /await getEmergencyRequest/
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

test("Emergency Request truthfully preserves unavailable downstream workflow", () => {
  assert.match(
    requestSource,
    /Saving this draft does not dispatch a professional/
  );
  assert.match(
    requestSource,
    /Your draft has not been distributed/
  );
  assert.match(
    requestSource,
    /Meetro has not distributed it/
  );
  assert.match(
    requestSource,
    /Distribution unavailable/
  );
  assert.match(
    requestSource,
    /awaiting future distribution/
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
