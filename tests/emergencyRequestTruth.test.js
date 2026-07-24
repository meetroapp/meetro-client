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

test("Emergency Request uses only canonical draft and safety commands", () => {
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

  assert.doesNotMatch(
    requestSource,
    /prepareEmergencyRequest/
  );
  assert.doesNotMatch(
    requestSource,
    /cancelEmergencyRequest/
  );
  assert.doesNotMatch(
    requestSource,
    /getEmergencyRequest/
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
});

test("Emergency Request preserves safe navigation", () => {
  assert.match(requestSource, /setPage\("emergency"\)/);
  assert.match(requestSource, /setPage\("home"\)/);
  assert.match(
    requestSource,
    /<BottomNav currentPage="emergency" setPage=\{setPage\} \/>/
  );
});
