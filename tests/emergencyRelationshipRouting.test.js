import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildEmergencyRequestRoute,
  createEmergencyRouteSessionController,
  ownEmergencyRequest,
  parseEmergencyRequestRoute,
  selectEmergencyRequestForRoute,
} from "../src/utils/emergencyRoutes.js";
import {
  normalizeEmergencyRelationshipDetail,
} from "../src/utils/emergencyRelationshipDetail.js";
import {
  getEmergencyTimeline,
} from "../src/utils/emergencySummary.js";

const requestSource = readFileSync(
  new URL("../src/pages/EmergencyRequest.jsx", import.meta.url),
  "utf8"
);
const detailSource = readFileSync(
  new URL(
    "../src/components/EmergencyRelationshipDetail.jsx",
    import.meta.url
  ),
  "utf8"
);
const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);

function draftRequest(overrides = {}) {
  return {
    id: 41,
    title: "Private Emergency draft",
    description: "Draft details remain private.",
    serviceSpecialty: "emergency_plumbing",
    serviceDomain: "home_services",
    category: "home_repair",
    status: "draft",
    locationText: "123 Example Street",
    unitNumber: "Unit 2",
    accessNotes: "Use the side entrance.",
    ...overrides,
  };
}

test("route-scoped request selection immediately rejects stale and malformed identities", () => {
  const requestA = draftRequest({ id: 41, title: "Request A" });
  const requestB = draftRequest({ id: 42, title: "Request B" });
  const routeA = parseEmergencyRequestRoute(
    `#${buildEmergencyRequestRoute(41)}`
  );
  const routeB = parseEmergencyRequestRoute(
    `#${buildEmergencyRequestRoute(42)}`
  );
  const malformedRoute = parseEmergencyRequestRoute(
    "#emergencyRequest?requestId=not-valid"
  );

  const controller = createEmergencyRouteSessionController(routeA);
  const sessionA = controller.current();
  const ownedA = ownEmergencyRequest(sessionA, requestA);

  assert.equal(
    selectEmergencyRequestForRoute(sessionA, ownedA),
    requestA
  );

  const sessionB = controller.transition(routeB);
  const ownedB = ownEmergencyRequest(sessionB, requestB);

  assert.equal(selectEmergencyRequestForRoute(sessionB, ownedA), null);
  assert.equal(
    selectEmergencyRequestForRoute(sessionB, ownedB),
    requestB
  );

  const malformedSession = controller.transition(malformedRoute);
  assert.equal(
    selectEmergencyRequestForRoute(malformedSession, ownedB),
    null
  );

  const newRequestSession = controller.transition(
    parseEmergencyRequestRoute("#emergencyRequest")
  );
  assert.equal(
    selectEmergencyRequestForRoute(newRequestSession, ownedA),
    null
  );
});

test("malformed request routes fail closed without canonical identity", () => {
  assert.deepEqual(
    parseEmergencyRequestRoute(
      "#emergencyRequest?requestId=not-valid"
    ),
    {
      page: "emergencyRequest",
      hasRequestId: true,
      requestId: null,
      serviceSpecialty: "",
      valid: false,
    }
  );
});

test("draft relationship detail keeps all six stages future and timestamp-free", () => {
  const detail = normalizeEmergencyRelationshipDetail({
    emergencyRequest: draftRequest({
      requestedAt: "2026-07-30T12:00:00.000Z",
      assignedAt: "2026-07-30T12:05:00.000Z",
      enRouteAt: "2026-07-30T12:10:00.000Z",
      arrivedAt: "2026-07-30T12:15:00.000Z",
      workStartedAt: "2026-07-30T12:20:00.000Z",
      completedAt: "2026-07-30T12:30:00.000Z",
    }),
  });
  const timeline = getEmergencyTimeline(detail.timelineRequest);

  assert.equal(detail.status, "draft");
  assert.equal(detail.selectedProfessional, null);
  assert.equal(detail.conversation.available, false);
  assert.equal(timeline.length, 6);
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
  assert.equal(
    timeline.every(
      (stage) =>
        stage.state === "future" && stage.reachedAt === null
    ),
    true
  );
});

test("Work Center View Emergency Request remains canonical and status-independent", () => {
  const emergencyCardMap = myRequestsSource.slice(
    myRequestsSource.indexOf("emergencyRequests.map"),
    myRequestsSource.indexOf(
      "requestMutationStatus === \"pending\""
    )
  );

  assert.match(
    emergencyCardMap,
    /onOpen=\{\(\) =>[\s\S]*buildEmergencyRequestRoute\([\s\S]*emergencyRequest\.emergencyRequestId/
  );
  assert.doesNotMatch(
    emergencyCardMap,
    /emergencyRequest\.status[\s\S]*onOpen=/
  );
});

test("draft workflow, Safety Review, and preparation remain separate actions", () => {
  assert.match(requestSource, /Continue Emergency Draft/);
  assert.match(requestSource, /Complete Safety Review/);
  assert.match(requestSource, /Prepare Request/);
  assert.match(requestSource, /function openDraftWorkflow\(\)/);
  assert.match(requestSource, /phase === "safety"/);
  assert.match(requestSource, /onSubmit=\{submitSafety\}/);
  assert.match(requestSource, /saveEmergencySafetyAssessment/);
  assert.match(requestSource, /prepareEmergencyRequest/);
  assert.match(
    requestSource,
    /workflowAction=\{[\s\S]*label: draftWorkflowActionLabel[\s\S]*onClick: openDraftWorkflow/
  );
});

test("the relationship component only presents the separate workflow callback", () => {
  assert.match(
    detailSource,
    /typeof workflowAction\?\.onClick === "function"/
  );
  assert.match(detailSource, /onClick=\{workflowAction\.onClick\}/);
  assert.doesNotMatch(
    detailSource,
    /createEmergencyDraft|updateEmergencyDraft|saveEmergencySafetyAssessment|prepareEmergencyRequest/
  );
});

test("every request-specific state is cleared before a new canonical load", () => {
  const resetStart = requestSource.indexOf(
    "async function resolveEmergencyRoute()"
  );
  const requestStart = requestSource.indexOf(
    "const operation = await settleEmergencyRouteOperation",
    resetStart
  );
  const resetBlock = requestSource.slice(resetStart, requestStart);

  assert.ok(resetStart >= 0);
  assert.ok(requestStart > resetStart);

  for (const reset of [
    "setOwnedCanonicalRequest(null)",
    'setPhase("details")',
    "setDraftWorkflowOpen(!emergencyRoute.hasRequestId)",
    "setPending(false)",
    'setMessage("")',
    'setErrorMessage("")',
    "setCancelConfirmationOpen(false)",
    "setSubmissionConfirmationOpen(false)",
    'setResponsesPhase("idle")',
    "setResponses([])",
    "setSelectedResponse(null)",
    "setCanonicalConversationId(null)",
    "setSelectionPending(false)",
    'setSelectionError("")',
    'setUnsupportedRecoveredSpecialty("")',
    "setForm({",
    "setSafety({",
  ]) {
    assert.equal(
      resetBlock.includes(reset),
      true,
      `missing route reset: ${reset}`
    );
  }
});

test("malformed routes enter the established safe state before any backend request", () => {
  const invalidGuard = requestSource.indexOf(
    "!emergencyRoute.valid ||"
  );
  const invalidState = requestSource.indexOf(
    'setRecoveryFailureKind("invalid")',
    invalidGuard
  );
  const requestStart = requestSource.indexOf(
    "getEmergencyRequest(emergencyRoute.requestId",
    invalidState
  );

  assert.ok(invalidGuard >= 0);
  assert.ok(invalidState > invalidGuard);
  assert.ok(requestStart > invalidState);
  assert.match(requestSource, /copy\.recoveryInvalid/);
  assert.match(requestSource, /copy\.viewMyEmergencyRequests/);
});

test("canonical and optional enrichment use the shared executable route session", () => {
  assert.match(
    requestSource,
    /createEmergencyRouteSessionController/
  );
  assert.match(
    requestSource,
    /const handleEmergencyRouteChange =[\s\S]*routeSessionController\.transition\([\s\S]*setRouteSession\(nextSession\)/
  );
  assert.match(
    requestSource,
    /settleEmergencyRouteOperation\([\s\S]*getEmergencyRequest/
  );
  assert.match(
    requestSource,
    /settleEmergencyRouteOperation\([\s\S]*listHomeownerEmergencyResponses/
  );
  assert.match(
    requestSource,
    /settleEmergencyRouteOperation\([\s\S]*fetchCanonicalConversations/
  );
});

test("all preserved mutations settle through current route ownership", () => {
  const ownershipCaptures = requestSource.match(
    /const mutationOwnership = controller\.capture\(\)/g
  );

  assert.equal(ownershipCaptures?.length, 5);
  assert.match(requestSource, /updateEmergencyDraft/);
  assert.match(requestSource, /saveEmergencySafetyAssessment/);
  assert.match(requestSource, /prepareEmergencyRequest/);
  assert.match(requestSource, /cancelEmergencyRequest/);
  assert.match(requestSource, /selectHomeownerEmergencyResponse/);
});

test("new creation synchronizes the returned ID before owning workflow data", () => {
  const synchronizationStart = requestSource.indexOf(
    "function synchronizeCreatedEmergencyRequest(requestId)"
  );
  const synchronizationEnd = requestSource.indexOf(
    "function ownCanonicalRequestForSession",
    synchronizationStart
  );
  const synchronizationBlock = requestSource.slice(
    synchronizationStart,
    synchronizationEnd
  );
  const transitionIndex = synchronizationBlock.indexOf(
    "routeSessionController.transition(parsedRoute)"
  );
  const replaceIndex = synchronizationBlock.indexOf(
    "replaceEmergencyRequestRoute(parsedRoute.requestId)"
  );

  assert.ok(synchronizationStart >= 0);
  assert.ok(synchronizationEnd > synchronizationStart);
  assert.ok(transitionIndex >= 0);
  assert.ok(replaceIndex > transitionIndex);
  assert.match(
    requestSource,
    /function synchronizeCreatedEmergencyRequest\(requestId\)[\s\S]*parseEmergencyRequestRoute\(route\)[\s\S]*routeSessionController\.transition\(parsedRoute\)[\s\S]*setRouteSession\(nextSession\)/
  );
  assert.match(
    requestSource,
    /const owningSession = requestId[\s\S]*synchronizeCreatedEmergencyRequest\([\s\S]*canonicalRequestId[\s\S]*ownCanonicalRequestForSession\([\s\S]*result\.emergencyRequest,[\s\S]*owningSession/
  );
});

test("R2 adds no browser authority, polling, or raw recovery errors", () => {
  for (const forbidden of [
    "localStorage",
    "sessionStorage",
    "setInterval",
  ]) {
    assert.equal(requestSource.includes(forbidden), false);
  }

  const recoveryStart = requestSource.indexOf(
    "async function resolveEmergencyRoute()"
  );
  const recoveryEnd = requestSource.indexOf(
    "const canonicalRequestId",
    recoveryStart
  );
  const recoveryBlock = requestSource.slice(
    recoveryStart,
    recoveryEnd
  );

  assert.doesNotMatch(recoveryBlock, /result\.message/);
});
