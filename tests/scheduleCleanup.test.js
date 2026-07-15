import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contractorDashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8"
);

const assistantSource = readFileSync(
  new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
  "utf8"
);

test("schedule form uses customer address as default visit location", () => {
  assert.match(contractorDashboardSource, /function getScheduleVisitLocation/);
  assert.match(contractorDashboardSource, /customerAddress: manualCustomerAddress/);
  assert.match(contractorDashboardSource, /overrideLocation: scheduleForm\.location/);
  assert.match(contractorDashboardSource, /location: visitLocation/);
});

test("schedule form does not mirror customer address into duplicate location field", () => {
  assert.match(contractorDashboardSource, /workCenterDifferentVisitLocationOptional/);
  assert.doesNotMatch(
    contractorDashboardSource,
    /manualCustomerAddress: e\.target\.value,\s*location: e\.target\.value/
  );
});

test("outside customer scheduling still preserves customer contact fields", () => {
  assert.match(contractorDashboardSource, /manualCustomerName/);
  assert.match(contractorDashboardSource, /manualCustomerPhone/);
  assert.match(contractorDashboardSource, /manualCustomerEmail/);
  assert.match(contractorDashboardSource, /manualCustomerAddress/);
  assert.match(contractorDashboardSource, /isManualOutsideCustomer/);
});

test("schedule page is eligible for the Meetro companion orb", () => {
  assert.match(appSource, /assistantEnabledPages = new Set\(\[[\s\S]*"schedule"/);
});

test("companion uses schedule context when Work Center schedule is active", () => {
  assert.match(assistantSource, /const assistantContextPage =/);
  assert.match(assistantSource, /includes\("schedule"\)[\s\S]*\? "schedule"/);
  assert.match(assistantSource, /getScreenGuide\(assistantContextPage, language\)/);
  assert.match(assistantSource, /currentPage: assistantContextPage/);
});

test("orb bubble remains observation-only and emergency-prioritized", () => {
  assert.match(assistantSource, /const wakeEmergencyCandidate = wakeEmergencySummary\.active/);
  assert.match(assistantSource, /isCompanionObservationVisible\(\s*wakeEmergencyCandidate,\s*companionObservationScope\s*\)/);
  assert.match(assistantSource, /const wakeTopInsight = wakeEmergencyInsight \|\|/);
  assert.match(assistantSource, /wakeObservationType === "emergency"/);
  assert.match(assistantSource, /openEmergencyChat/);
  assert.match(assistantSource, /lanternContext\.secondaryActionLabel/);
});
