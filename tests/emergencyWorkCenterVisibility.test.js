import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACTIVE_EMERGENCY_SUMMARY_STATUSES,
  EMERGENCY_SUMMARY_STATUSES,
  getEmergencySpecialtyDisplayLabel,
  getEmergencyWorkCenterStatusLabel,
  isSupportedEmergencySummaryStatus,
} from "../src/utils/emergencySummary.js";

const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);
const emergencyRequestSource = readFileSync(
  new URL("../src/pages/EmergencyRequest.jsx", import.meta.url),
  "utf8"
);
const contractorDashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

const approvedActiveLabels = new Map([
  ["draft", "Continue Emergency Draft"],
  ["safety_blocked", "Safety Action Required"],
  [
    "ready_for_distribution",
    "Waiting for Professional Responses",
  ],
  ["active", "Emergency Request Active"],
  ["selection_pending", "Professional Selection Pending"],
  ["assigned", "Professional Selected"],
  ["professional_en_route", "Professional En Route"],
  ["professional_arrived", "Professional Arrived"],
  ["in_service", "Work In Progress"],
  ["work_in_progress", "Work In Progress"],
]);

test("every canonical active Emergency status has the approved Work Center label", () => {
  assert.deepEqual(
    ACTIVE_EMERGENCY_SUMMARY_STATUSES,
    [...approvedActiveLabels.keys()]
  );

  for (const [status, label] of approvedActiveLabels) {
    assert.equal(
      getEmergencyWorkCenterStatusLabel(status, "en"),
      label
    );
    assert.equal(isSupportedEmergencySummaryStatus(status), true);
  }

  assert.equal(
    isSupportedEmergencySummaryStatus(
      "professional_selected"
    ),
    false
  );
});

test("history statuses use truthful canonical lifecycle labels without adding a history UI", () => {
  const labels = {
    completed: "Emergency Work Completed",
    resolved: "Emergency Work Completed",
    cancelled: "Emergency Request Cancelled",
    expired: "Emergency Request Expired",
    unable_to_match: "No Compatible Professional Found",
  };

  for (const [status, label] of Object.entries(labels)) {
    assert.equal(
      getEmergencyWorkCenterStatusLabel(status, "en"),
      label
    );
    assert.equal(
      EMERGENCY_SUMMARY_STATUSES.includes(status),
      true
    );
  }
});

test("Emergency specialty presentation uses canonical taxonomy labels with a safe fallback", () => {
  assert.equal(
    getEmergencySpecialtyDisplayLabel(
      "emergency_plumbing",
      "en"
    ),
    "Emergency Plumbing"
  );
  assert.equal(
    getEmergencySpecialtyDisplayLabel(
      "future_emergency_specialty",
      "en"
    ),
    "Future Emergency Specialty"
  );
});

test("homeowner Work Center loads Emergency requests independently and renders them above ordinary requests", () => {
  assert.match(
    myRequestsSource,
    /getEmergencyRequests\(\s*\{\s*view: "active",\s*limit: 25/
  );
  assert.match(
    myRequestsSource,
    /result\.emergencyRequests\.length > 0[\s\S]*REQUEST_COLLECTION_STATUS\.READY[\s\S]*REQUEST_COLLECTION_STATUS\.EMPTY/
  );
  assert.match(
    myRequestsSource,
    /Emergency requests are unavailable\./
  );
  assert.match(
    myRequestsSource,
    /resolveHomeownerRequestCollection\(result\)/
  );

  const emergencySectionIndex =
    myRequestsSource.indexOf(
      "emergencyRequestStatus ==="
    );
  const ordinaryMutationIndex =
    myRequestsSource.indexOf(
      'requestMutationStatus === "pending"'
    );
  assert.ok(emergencySectionIndex >= 0);
  assert.ok(ordinaryMutationIndex > emergencySectionIndex);
});

test("Emergency collection failure and ordinary request failure remain independently represented", () => {
  const emergencyEffectStart =
    myRequestsSource.indexOf(
      "async function loadEmergencyRequests()"
    );
  const emergencyEffectEnd =
    myRequestsSource.indexOf(
      "void recoveryTick",
      emergencyEffectStart
    );
  const emergencyEffect = myRequestsSource.slice(
    emergencyEffectStart,
    emergencyEffectEnd
  );

  assert.match(
    emergencyEffect,
    /if \(!result\.ok\)[\s\S]*REQUEST_COLLECTION_STATUS\.UNAVAILABLE/
  );
  assert.doesNotMatch(
    emergencyEffect,
    /setBackendRequestStatus|setRequests\(/
  );
  assert.match(
    myRequestsSource,
    /backendRequestStatus ===\s*REQUEST_COLLECTION_STATUS\.UNAVAILABLE/
  );
  assert.doesNotMatch(
    myRequestsSource,
    /backendRequestStatus[\s\S]{0,120}setEmergencyRequests/
  );
});

test("Emergency cards expose only bounded presentation fields and canonical navigation", () => {
  assert.match(
    myRequestsSource,
    /buildEmergencyRequestRoute\(\s*emergencyRequest\.emergencyRequestId/
  );
  assert.match(
    myRequestsSource,
    /View Emergency Request/
  );
  assert.match(
    myRequestsSource,
    /emergencyRequest\.availableResponseCount/
  );
  assert.doesNotMatch(
    myRequestsSource,
    /emergencyRequest\.(?:locationText|accessNotes|safetyAssessment|professionalEmail|professionalPhone|relationshipId|conversationId)/
  );
  assert.doesNotMatch(
    myRequestsSource,
    /localStorage\.(?:getItem|setItem)\(\s*["'](?:active)?Emergency/
  );
});

test("submitted Emergency lifecycle exposes Work Center navigation and keeps direct URL recovery", () => {
  assert.match(
    emergencyRequestSource,
    /View My Emergency Requests/
  );
  assert.match(
    emergencyRequestSource,
    /onClick=\{\(\) => setPage\("myRequests"\)\}/
  );
  assert.match(
    emergencyRequestSource,
    /parseEmergencyRequestRoute/
  );
  assert.match(
    emergencyRequestSource,
    /getEmergencyRequest\(\s*initialEmergencyRoute\.requestId/
  );
  assert.match(
    emergencyRequestSource,
    /buildDraftForm\(recoveredRequest, current\)/
  );
});

test("Emergency page title follows deterministic lifecycle state", () => {
  assert.match(
    emergencyRequestSource,
    /canonicalStatus === "cancelled"[\s\S]*copy\.cancelledPageTitle/
  );
  assert.match(
    emergencyRequestSource,
    /\["completed", "resolved"\]\.includes\(canonicalStatus\)[\s\S]*copy\.completedPageTitle/
  );
  assert.match(
    emergencyRequestSource,
    /canonicalStatus === "safety_blocked"[\s\S]*copy\.safetyTitle/
  );
  assert.match(
    emergencyRequestSource,
    /!editableDraft[\s\S]*copy\.requestPageTitle/
  );
  assert.match(
    emergencyRequestSource,
    /\["safety", "complete"\]\.includes\(phase\)[\s\S]*copy\.safetyTitle/
  );
});

test("professional Work Center source is outside the homeowner Emergency integration", () => {
  assert.doesNotMatch(
    contractorDashboardSource,
    /getEmergencyRequests|EmergencyRequestCard|emergencyRequestStatus/
  );
});
