import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACTIVE_EMERGENCY_SUMMARY_STATUSES,
  EMERGENCY_SUMMARY_STATUSES,
  getEmergencyTimeline,
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
const emergencyTimelineSource = readFileSync(
  new URL("../src/components/EmergencyTimeline.jsx", import.meta.url),
  "utf8"
);
const emergencyCardSource = myRequestsSource.slice(
  myRequestsSource.indexOf(
    "function EmergencyRequestCard"
  ),
  myRequestsSource.indexOf(
    "function MyRequests"
  )
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
  assert.match(
    emergencyCardSource,
    /selectedProfessionalBusinessName/
  );
  assert.match(
    emergencyCardSource,
    /Selected Professional/
  );
  assert.match(
    emergencyCardSource,
    /Review Responses/
  );
  assert.match(
    emergencyCardSource,
    /conversationAvailable === true[\s\S]*Number\.isSafeInteger\([\s\S]*emergencyRequest\.conversationId/
  );
  assert.match(
    myRequestsSource,
    /buildCanonicalConversationRoute\(\s*emergencyRequest\.conversationId,\s*"myRequests"/
  );
  assert.doesNotMatch(
    emergencyCardSource,
    /emergencyRequest\.(?:locationText|unitNumber|accessNotes|safetyAssessment|professionalEmail|professionalPhone|relationshipId|latestMessage|unreadCount)/
  );
  assert.doesNotMatch(
    emergencyCardSource,
    />\s*\{emergencyRequest\.conversationId\}\s*</
  );
  assert.doesNotMatch(
    myRequestsSource,
    /localStorage\.(?:getItem|setItem)\(\s*["'](?:active)?Emergency/
  );
});

test("Emergency Work Center uses the reusable full canonical timeline", () => {
  const timeline = getEmergencyTimeline({
    status: "completed",
    requestedAt: "2026-07-29T14:00:00.000Z",
    assignedAt: "2026-07-29T14:05:00.000Z",
    enRouteAt: "2026-07-29T14:10:00.000Z",
    arrivedAt: "2026-07-29T14:20:00.000Z",
    workStartedAt: "2026-07-29T14:25:00.000Z",
    completedAt: "2026-07-29T15:00:00.000Z",
  });

  assert.deepEqual(
    timeline.map((stage) => stage.label),
    [
      "Requested",
      "Accepted",
      "On the Way",
      "Arrived",
      "Work Started",
      "Completed",
    ]
  );
  assert.match(
    emergencyCardSource,
    /<EmergencyTimeline[\s\S]*emergencyRequest=\{emergencyRequest\}[\s\S]*language=\{language\}/
  );
  assert.doesNotMatch(
    emergencyCardSource,
    /reachedTimeline|emergencyRequestTimelineStage/
  );
  assert.match(
    emergencyTimelineSource,
    /data-emergency-timeline="canonical"/
  );
});

test("Emergency Work Center adds no conversation-list dependency or polling", () => {
  assert.doesNotMatch(
    myRequestsSource,
    /fetchCanonicalConversations|getRequestCommunicationEndpoint|\/conversations\?/
  );
  assert.doesNotMatch(
    myRequestsSource,
    /setInterval\s*\(/
  );
});

test("Emergency relationship preview retains compact mobile-safe card constraints", () => {
  assert.match(
    myRequestsSource,
    /const emergencyRequestCard = \{[\s\S]*minWidth: 0[\s\S]*display: "grid"/
  );
  assert.match(
    myRequestsSource,
    /const emergencyRequestActions = \{[\s\S]*minWidth: 0[\s\S]*repeat\(auto-fit, minmax\(min\(100%, 150px\), 1fr\)\)/
  );
  assert.match(
    myRequestsSource,
    /const emergencyRequestAction = \{[\s\S]*width: "100%"[\s\S]*minHeight: "44px"/
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
