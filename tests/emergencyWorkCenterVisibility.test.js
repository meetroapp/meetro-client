import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACTIVE_EMERGENCY_SUMMARY_STATUSES,
  EMERGENCY_SUMMARY_STATUSES,
  countPendingEmergencyResponses,
  getEmergencyRelationshipNextStep,
  getEmergencyResponsePresentation,
  getEmergencyTimeline,
  getEmergencySpecialtyDisplayLabel,
  getEmergencyWorkCenterStatusLabel,
  isSupportedEmergencySummaryStatus,
  normalizeEmergencyPendingResponseCount,
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

test("pending response-count normalization accepts only non-negative safe integers", () => {
  for (const [value, expected] of [
    [0, 0],
    [1, 1],
    [4, 4],
    [null, 0],
    [undefined, 0],
    [Number.NaN, 0],
    [-1, 0],
    [1.5, 0],
    ["2", 0],
    [{ count: 2 }, 0],
    [[2], 0],
  ]) {
    assert.equal(
      normalizeEmergencyPendingResponseCount(value),
      expected
    );
  }
});

test("exact response lists count only unique canonical pending Emergency relationships", () => {
  const responses = [
    { id: 1, emergencyRequestId: 42, status: "pending" },
    { id: 1, emergencyRequestId: 42, status: "pending" },
    { id: 2, emergencyRequestId: 42, status: "pending" },
    { id: 3, emergencyRequestId: 42, status: "active" },
    { id: 4, emergencyRequestId: 42, status: "declined" },
    { id: 5, emergencyRequestId: 42, status: "withdrawn" },
    { id: 6, emergencyRequestId: 42, status: "closed" },
    { id: 7, emergencyRequestId: 42, status: "expired" },
    { id: 8, emergencyRequestId: 42, status: "cancelled" },
    { id: 9, emergencyRequestId: 42, status: "rejected" },
    { id: 10, emergencyRequestId: 41, status: "pending" },
    { id: "11", emergencyRequestId: 42, status: "pending" },
    { emergencyRequestId: 42, status: "pending" },
    null,
    [],
  ];

  assert.equal(
    countPendingEmergencyResponses(responses, 42),
    2
  );
  assert.equal(
    countPendingEmergencyResponses(responses, null),
    0
  );
  assert.equal(
    countPendingEmergencyResponses({}, 42),
    0
  );
});

test("response-aware status and next-step presentation stays truthful across count and lifecycle precedence", () => {
  const zero = getEmergencyResponsePresentation({
    status: "ready_for_distribution",
    availableResponseCount: 0,
  });
  const one = getEmergencyResponsePresentation({
    status: "ready_for_distribution",
    availableResponseCount: 1,
  });
  const multiple = getEmergencyResponsePresentation({
    status: "ready_for_distribution",
    availableResponseCount: 3,
  });

  assert.deepEqual(
    {
      label: zero.statusLabel,
      actionable: zero.hasActionableResponses,
      action: zero.reviewActionLabel,
    },
    {
      label: "Waiting for Professional Responses",
      actionable: false,
      action: "",
    }
  );
  assert.match(zero.nextStep, /Eligible professionals can still respond/);
  assert.equal(one.statusLabel, "1 Professional Response Available");
  assert.match(one.nextStep, /the available professional response/);
  assert.equal(one.reviewActionLabel, "Review Response");
  assert.equal(one.hasActionableResponses, true);
  assert.equal(
    multiple.statusLabel,
    "3 Professional Responses Available"
  );
  assert.match(multiple.nextStep, /the 3 available professional responses/);
  assert.equal(multiple.reviewActionLabel, "Review Responses");

  const selected = getEmergencyResponsePresentation({
    status: "ready_for_distribution",
    availableResponseCount: 3,
    hasSelectedProfessional: true,
  });
  const dispatch = getEmergencyResponsePresentation({
    status: "professional_en_route",
    availableResponseCount: 3,
  });
  const completed = getEmergencyResponsePresentation({
    status: "completed",
    availableResponseCount: 3,
  });

  assert.equal(selected.statusLabel, "Professional Selected");
  assert.match(selected.nextStep, /selected professional is connected/);
  assert.equal(selected.hasActionableResponses, false);
  assert.equal(dispatch.statusLabel, "Professional En Route");
  assert.match(dispatch.nextStep, /on the way/);
  assert.equal(completed.statusLabel, "Emergency Work Completed");
  assert.match(completed.nextStep, /marked complete/);
  assert.equal(completed.hasActionableResponses, false);
});

test("public status and next-step helpers share response-aware singular and plural grammar", () => {
  assert.equal(
    getEmergencyWorkCenterStatusLabel(
      "ready_for_distribution",
      "en",
      { availableResponseCount: 1 }
    ),
    "1 Professional Response Available"
  );
  assert.match(
    getEmergencyRelationshipNextStep(
      "ready_for_distribution",
      "en",
      { availableResponseCount: 2 }
    ),
    /2 available professional responses/
  );
  assert.equal(
    getEmergencyWorkCenterStatusLabel(
      "ready_for_distribution",
      "es",
      { availableResponseCount: 2 }
    ),
    "2 Respuestas Profesionales Disponibles"
  );

  for (const invalidCount of [
    undefined,
    null,
    Number.NaN,
    -1,
    1.5,
  ]) {
    assert.equal(
      getEmergencyWorkCenterStatusLabel(
        "ready_for_distribution",
        "en",
        { availableResponseCount: invalidCount }
      ),
      "Waiting for Professional Responses"
    );
  }
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
    /records\.length > 0[\s\S]*REQUEST_COLLECTION_STATUS\.READY[\s\S]*REQUEST_COLLECTION_STATUS\.EMPTY/
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
      "createEmergencyRefreshCoordinator({"
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
    /if \(!result\.ok\)[\s\S]*throw new Error[\s\S]*onError:[\s\S]*!hasConfirmedData[\s\S]*REQUEST_COLLECTION_STATUS\.UNAVAILABLE/
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
    /responsePresentation\.reviewActionLabel/
  );
  assert.match(
    emergencyCardSource,
    /getEmergencyResponsePresentation\(\{[\s\S]*availableResponseCount:[\s\S]*hasSelectedProfessional:/
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

test("Emergency Work Center adds no conversation-list dependency or direct polling loop", () => {
  assert.doesNotMatch(
    myRequestsSource,
    /fetchCanonicalConversations|getRequestCommunicationEndpoint|\/conversations\?/
  );
  assert.doesNotMatch(
    myRequestsSource,
    /setInterval\s*\(/
  );
  assert.match(
    myRequestsSource,
    /createEmergencyRefreshCoordinator/
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
    /getEmergencyRequest\(\s*emergencyRoute\.requestId/
  );
  assert.match(
    emergencyRequestSource,
    /buildDraftForm\(recoveredRequest, \{/
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
