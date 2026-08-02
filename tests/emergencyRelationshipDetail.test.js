import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCanonicalConversationRoute,
  parseCanonicalConversationRoute,
} from "../src/utils/canonicalConversationMessaging.js";
import {
  buildEmergencyRequestRoute,
  parseEmergencyRequestRoute,
} from "../src/utils/emergencyRoutes.js";
import {
  normalizeEmergencyRelationshipDetail,
} from "../src/utils/emergencyRelationshipDetail.js";
import {
  getEmergencyAlternateOutcome,
  getEmergencyTimeline,
} from "../src/utils/emergencySummary.js";

const adapterSource = readFileSync(
  new URL(
    "../src/utils/emergencyRelationshipDetail.js",
    import.meta.url
  ),
  "utf8"
);
const componentSource = readFileSync(
  new URL(
    "../src/components/EmergencyRelationshipDetail.jsx",
    import.meta.url
  ),
  "utf8"
);
const emergencyRequestSource = readFileSync(
  new URL(
    "../src/pages/EmergencyRequest.jsx",
    import.meta.url
  ),
  "utf8"
);
const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);

const timestamps = Object.freeze({
  requestedAt: "2026-07-30T13:00:00.000Z",
  assignedAt: "2026-07-30T13:05:00.000Z",
  enRouteAt: "2026-07-30T13:10:00.000Z",
  arrivedAt: "2026-07-30T13:20:00.000Z",
  workStartedAt: "2026-07-30T13:25:00.000Z",
  completedAt: "2026-07-30T14:00:00.000Z",
});

function request(overrides = {}) {
  return {
    id: 42,
    title: "Active pipe leak",
    description: "Water is entering the utility room.",
    serviceSpecialty: "emergency_plumbing",
    serviceDomain: "home_services",
    category: "plumbing",
    status: "ready_for_distribution",
    requestedAt: timestamps.requestedAt,
    locationText: "123 Long Address Avenue, Cape Coral, FL 33990",
    unitNumber: "Unit 200",
    accessNotes: "Use the side entrance and call from the gate.",
    ...overrides,
  };
}

function response(overrides = {}) {
  return {
    id: 91,
    emergencyRequestId: 42,
    status: "active",
    conversationAvailable: true,
    professional: {
      businessName: "Cape Coral Emergency Plumbing",
      category: "Plumbing",
      businessLogoUrl: "https://cdn.example.test/logo.png",
    },
    ...overrides,
  };
}

function normalize(overrides = {}) {
  return normalizeEmergencyRelationshipDetail({
    emergencyRequest: request({
      status: "assigned",
      assignedAt: timestamps.assignedAt,
    }),
    responses: [response()],
    conversationId: 77,
    ...overrides,
  });
}

test("canonical detail route is ID-backed and refresh-safe without navigation state", () => {
  const route = buildEmergencyRequestRoute(42);
  assert.equal(route, "emergencyRequest?requestId=42");
  assert.deepEqual(parseEmergencyRequestRoute(`#${route}`), {
    page: "emergencyRequest",
    hasRequestId: true,
    requestId: 42,
    serviceSpecialty: "",
    valid: true,
  });
  assert.match(
    emergencyRequestSource,
    /getEmergencyRequest\(\s*emergencyRoute\.requestId/
  );
  assert.doesNotMatch(
    emergencyRequestSource,
    /location\.state|navigationState/
  );
});

test("the detail adapter rejects null, incomplete, and unsupported canonical records", () => {
  assert.equal(
    normalizeEmergencyRelationshipDetail(),
    null
  );
  assert.equal(
    normalizeEmergencyRelationshipDetail({
      emergencyRequest: request({ id: null }),
    }),
    null
  );
  assert.equal(
    normalizeEmergencyRelationshipDetail({
      emergencyRequest: request({ title: "" }),
    }),
    null
  );
  assert.equal(
    normalizeEmergencyRelationshipDetail({
      emergencyRequest: request({ status: "invented" }),
    }),
    null
  );
});

test("canonical service context, description, status, and owner detail fields normalize without IDs in presentation", () => {
  const detail = normalize();

  assert.equal(detail.title, "Active pipe leak");
  assert.equal(
    detail.description,
    "Water is entering the utility room."
  );
  assert.equal(
    detail.serviceSpecialtyLabel,
    "Emergency Plumbing"
  );
  assert.equal(detail.serviceDomainLabel, "Home Services");
  assert.equal(detail.categoryLabel, "Plumbing");
  assert.equal(detail.statusLabel, "Professional Selected");
  assert.deepEqual(detail.location, {
    locationText:
      "123 Long Address Avenue, Cape Coral, FL 33990",
    unitNumber: "Unit 200",
    accessNotes:
      "Use the side entrance and call from the gate.",
  });
  assert.doesNotMatch(
    componentSource,
    /detail\.emergencyRequestId/
  );
});

test("all six lifecycle stages remain delegated to the reusable canonical timeline", () => {
  const detail = normalize();
  const timeline = getEmergencyTimeline(
    detail.timelineRequest
  );

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
    componentSource,
    /<EmergencyTimeline[\s\S]*emergencyRequest=\{detail\.timelineRequest\}/
  );
  assert.doesNotMatch(
    componentSource,
    /Requested[\s\S]*Accepted[\s\S]*On the Way/
  );
});

test("canonical status caps every lifecycle progression state", () => {
  const cases = [
    ["draft", -1],
    ["ready_for_distribution", 0],
    ["assigned", 1],
    ["professional_en_route", 2],
    ["professional_arrived", 3],
    ["work_in_progress", 4],
    ["completed", 5],
  ];

  for (const [status, expectedCurrentIndex] of cases) {
    const detail = normalize({
      emergencyRequest: request({
        status,
        ...timestamps,
      }),
    });
    const timeline = getEmergencyTimeline(
      detail.timelineRequest
    );

    assert.equal(timeline.length, 6);
    assert.equal(
      timeline.findIndex((stage) => stage.state === "current"),
      expectedCurrentIndex
    );
    assert.equal(
      timeline
        .slice(expectedCurrentIndex + 1)
        .every((stage) => stage.state === "future"),
      true
    );
  }
});

test("invalid and future canonical timestamps fail closed", () => {
  const detail = normalize({
    emergencyRequest: request({
      status: "assigned",
      requestedAt: timestamps.requestedAt,
      assignedAt: "not-a-time",
      enRouteAt: timestamps.enRouteAt,
      arrivedAt: timestamps.arrivedAt,
      workStartedAt: timestamps.workStartedAt,
      completedAt: timestamps.completedAt,
    }),
  });
  const timeline = getEmergencyTimeline(
    detail.timelineRequest
  );

  assert.equal(timeline[0].reachedAt, timestamps.requestedAt);
  assert.equal(timeline[1].reachedAt, null);
  assert.equal(
    timeline.slice(2).every(
      (stage) =>
        stage.state === "future" && stage.reachedAt === null
    ),
    true
  );
});

test("selected identity is accepted only from an exact active Emergency response", () => {
  const detail = normalize();

  assert.deepEqual(detail.selectedProfessional, {
    displayName: "Cape Coral Emergency Plumbing",
    category: "Plumbing",
    logoUrl: "https://cdn.example.test/logo.png",
    verifiedFromActiveRelationship: true,
  });
  assert.equal(detail.responseCards.length, 1);
  assert.equal(detail.responseCards[0].status, "active");
});

test("selected identity uses a safe generic fallback when the active business name is blank", () => {
  const detail = normalize({
    responses: [
      response({
        professional: {
          businessName: "   ",
          category: "",
          profileImageUrl: "",
        },
      }),
    ],
  });

  assert.equal(
    detail.selectedProfessional.displayName,
    "Selected Professional"
  );
  assert.equal(
    detail.selectedProfessional.verifiedFromActiveRelationship,
    true
  );
});

test("an exact active Emergency relationship overrides stale distribution response awareness", () => {
  const detail = normalize({
    emergencyRequest: request({
      status: "ready_for_distribution",
    }),
    responses: [response()],
    conversationId: 77,
  });

  assert.equal(
    detail.selectedProfessional.displayName,
    "Cape Coral Emergency Plumbing"
  );
  assert.equal(detail.statusLabel, "Professional Selected");
  assert.equal(detail.pendingResponseCount, 0);
  assert.equal(detail.conversation.available, true);
  assert.equal(detail.responseCards.length, 1);
  assert.equal(detail.responseCards[0].status, "active");
});

test("mismatched, declined, withdrawn, and closed responses cannot supply identity", () => {
  for (const candidate of [
    response({ emergencyRequestId: 41 }),
    response({ status: "declined" }),
    response({ status: "withdrawn" }),
    response({ status: "closed" }),
  ]) {
    const detail = normalize({
      responses: [candidate],
      conversationId: 77,
    });

    assert.equal(
      detail.selectedProfessional.displayName,
      "Selected Professional"
    );
    assert.equal(
      detail.selectedProfessional.verifiedFromActiveRelationship,
      false
    );
    assert.equal(detail.conversation.available, false);
    assert.equal(detail.responseCards.length, 0);
  }
});

test("pending exact-request responses remain reviewable without fabricating a relationship", () => {
  const detail = normalize({
    emergencyRequest: request({
      status: "ready_for_distribution",
    }),
    responses: [
      response({
        status: "pending",
        conversationAvailable: false,
      }),
    ],
    conversationId: null,
  });

  assert.equal(detail.selectedProfessional, null);
  assert.equal(detail.responseCards.length, 1);
  assert.equal(detail.responseCards[0].status, "pending");
  assert.equal(detail.pendingResponseCount, 1);
  assert.equal(
    detail.statusLabel,
    "1 Professional Response Available"
  );
  assert.match(
    detail.nextStep,
    /the available professional response/
  );
  assert.equal(detail.conversation.available, false);
});

test("exact response awareness ignores malformed and terminal relationships and deduplicates stable IDs", () => {
  const detail = normalize({
    emergencyRequest: request({
      status: "ready_for_distribution",
    }),
    responses: [
      response({ id: 91, status: "pending" }),
      response({ id: 91, status: "pending" }),
      response({ id: 92, status: "pending" }),
      response({ id: 93, status: "declined" }),
      response({ id: 94, status: "withdrawn" }),
      response({ id: 95, status: "closed" }),
      response({ id: 96, status: "expired" }),
      response({ id: 97, status: "cancelled" }),
      response({ id: 98, status: "rejected" }),
      response({ id: 99, emergencyRequestId: 41, status: "pending" }),
      response({ id: null, status: "pending" }),
      null,
    ],
    conversationId: null,
  });

  assert.equal(detail.pendingResponseCount, 2);
  assert.equal(detail.responseCards.length, 2);
  assert.equal(
    detail.statusLabel,
    "2 Professional Responses Available"
  );
  assert.match(
    detail.nextStep,
    /the 2 available professional responses/
  );
});

test("relationship-detail presentation never combines a waiting label with pending response cards", () => {
  const detail = normalize({
    emergencyRequest: request({
      status: "ready_for_distribution",
    }),
    responses: [
      response({
        status: "pending",
        conversationAvailable: false,
      }),
    ],
    conversationId: null,
  });

  assert.equal(detail.responseCards.length, 1);
  assert.equal(
    detail.statusLabel,
    "1 Professional Response Available"
  );
  assert.notEqual(
    detail.statusLabel,
    "Waiting for Professional Responses"
  );
  assert.match(
    componentSource,
    /\{detail\.statusLabel\}[\s\S]*detail\.responseCards\.map/
  );
});

test("response-aware relationship hydration remains screen-reader readable without a live announcement", () => {
  assert.match(
    componentSource,
    /<strong style=\{statusPill\}>[\s\S]*\{detail\.statusLabel\}/
  );
  assert.match(
    componentSource,
    /<p style=\{sectionText\}>[\s\S]*\{copy\.responsesLoading\}/
  );
  assert.doesNotMatch(componentSource, /aria-live=/);
  assert.doesNotMatch(componentSource, /role="status"/);
  assert.match(componentSource, /copy\.selectProfessional/);
});

test("once selected, only the exact active relationship identity remains visible", () => {
  const detail = normalize({
    responses: [
      response(),
      response({
        id: 92,
        status: "pending",
        conversationAvailable: false,
        professional: {
          businessName: "Unselected Responder",
        },
      }),
    ],
  });

  assert.deepEqual(
    detail.responseCards.map((candidate) => candidate.status),
    ["active"]
  );
  assert.equal(
    detail.responseCards.some(
      (candidate) =>
        candidate.businessName === "Unselected Responder"
    ),
    false
  );
});

test("conversation access requires selected state, exact active availability, and a positive opaque ID", () => {
  assert.deepEqual(normalize().conversation, {
    available: true,
    id: 77,
  });

  for (const overrides of [
    { conversationId: null },
    { conversationId: -1 },
    { responses: [response({ conversationAvailable: false })] },
    { responses: [response({ status: "pending" })] },
  ]) {
    assert.deepEqual(normalize(overrides).conversation, {
      available: false,
      id: null,
    });
  }
});

test("canonical conversation route preserves the exact Emergency detail return context", () => {
  const returnPage = buildEmergencyRequestRoute(42);
  const route = buildCanonicalConversationRoute(77, returnPage);

  assert.equal(
    route,
    "conversationThread?conversationId=77&returnPage=emergencyRequest%3FrequestId%3D42"
  );
  assert.deepEqual(parseCanonicalConversationRoute(route), {
    page: "conversationThread",
    conversationId: 77,
    returnPage,
    shell: "",
    valid: true,
  });
  assert.match(
    emergencyRequestSource,
    /buildCanonicalConversationRoute\(\s*canonicalConversationId,\s*buildEmergencyRequestRoute\(canonicalRequestId\)/
  );
});

test("conversation UI is guarded and contains no messages, preview, unread, or visible conversation ID", () => {
  assert.match(
    componentSource,
    /detail\.conversation\.available[\s\S]*getConversationActionLabel/
  );
  assert.doesNotMatch(
    componentSource,
    /latestMessage|unread|messagePreview|conversation\.id/
  );
  assert.doesNotMatch(
    emergencyRequestSource,
    /fetchCanonicalConversationMessages/
  );
});

test("optional location, unit, and access fields omit cleanly", () => {
  const noLocation = normalize({
    emergencyRequest: request({
      locationText: "",
      unitNumber: "",
      accessNotes: "",
    }),
  });
  const addressOnly = normalize({
    emergencyRequest: request({
      unitNumber: null,
      accessNotes: null,
    }),
  });

  assert.equal(noLocation.location, null);
  assert.deepEqual(addressOnly.location, {
    locationText:
      "123 Long Address Avenue, Cape Coral, FL 33990",
    unitNumber: "",
    accessNotes: "",
  });
});

test("alternate terminal outcomes stay separate without completing future stages", () => {
  for (const status of [
    "safety_blocked",
    "cancelled",
    "expired",
    "unable_to_match",
  ]) {
    const detail = normalize({
      emergencyRequest: request({
        status,
        requestedAt:
          status === "safety_blocked"
            ? null
            : timestamps.requestedAt,
        cancelledAt:
          status === "cancelled"
            ? timestamps.assignedAt
            : null,
        expiredAt:
          status === "expired"
            ? timestamps.assignedAt
            : null,
      }),
      responses: [],
      conversationId: null,
    });
    const outcome = getEmergencyAlternateOutcome(
      detail.timelineRequest
    );
    const timeline = getEmergencyTimeline(
      detail.timelineRequest
    );

    assert.equal(outcome?.status, status);
    assert.equal(
      timeline.every(
        (stage) =>
          stage.state === "future" ||
          (stage.key === "requested" &&
            stage.state === "reached")
      ),
      true
    );
    assert.equal(
      timeline
        .slice(1)
        .every((stage) => stage.state === "future"),
      true
    );
  }
});

test("isolated future timestamps cannot advance an alternate terminal outcome", () => {
  const detail = normalize({
    emergencyRequest: request({
      status: "cancelled",
      requestedAt: timestamps.requestedAt,
      assignedAt: null,
      enRouteAt: null,
      arrivedAt: null,
      workStartedAt: null,
      completedAt: timestamps.completedAt,
      cancelledAt: timestamps.assignedAt,
    }),
    responses: [],
    conversationId: null,
  });
  const timeline = getEmergencyTimeline(
    detail.timelineRequest
  );

  assert.equal(timeline[0].state, "reached");
  assert.equal(
    timeline
      .slice(1)
      .every(
        (stage) =>
          stage.state === "future" &&
          stage.reachedAt === null
      ),
    true
  );
});

test("completion is canonical, timestamped only when valid, and adds no fabricated follow-on actions", () => {
  const completed = normalize({
    emergencyRequest: request({
      status: "completed",
      ...timestamps,
    }),
  });
  const invalidTimestamp = normalize({
    emergencyRequest: request({
      status: "completed",
      completedAt: "invalid",
    }),
  });

  assert.equal(completed.completed, true);
  assert.equal(completed.completedAt, timestamps.completedAt);
  assert.equal(invalidTimestamp.completed, true);
  assert.equal(invalidTimestamp.completedAt, null);
  assert.doesNotMatch(
    componentSource,
    /invoice|payment|warranty|leave review/i
  );
});

test("relationship presentation remains API-free, storage-free, mutation-free, and polling-free", () => {
  assert.doesNotMatch(
    componentSource,
    /fetch\(|axios|localStorage|sessionStorage|setInterval|setTimeout|selectHomeownerEmergencyResponse|create|update|delete/i
  );
  assert.doesNotMatch(
    adapterSource,
    /fetch\(|axios|localStorage|sessionStorage|setInterval|setTimeout|console\./
  );
  assert.doesNotMatch(
    emergencyRequestSource,
    /setInterval/
  );
});

test("loading and safe failure states remain explicit and do not expose raw backend errors", () => {
  assert.match(
    emergencyRequestSource,
    /recoveryState === "loading"[\s\S]*copy\.recoveryLoading/
  );
  assert.match(
    emergencyRequestSource,
    /recoveryFailureKind === "unauthorized"[\s\S]*copy\.recoveryUnauthorized/
  );
  assert.match(
    emergencyRequestSource,
    /recoveryFailureKind === "not_found"[\s\S]*copy\.recoveryNotFound/
  );
  assert.match(
    emergencyRequestSource,
    /recoveryFailureKind === "unavailable"[\s\S]*copy\.recoveryUnavailable/
  );
  assert.match(
    emergencyRequestSource,
    /\[401, 403\]\.includes\(result\.status\)/
  );
  for (const status of [
    "ready_for_distribution",
    "active",
    "selection_pending",
    "assigned",
    "professional_en_route",
    "professional_arrived",
    "in_service",
    "work_in_progress",
    "completed",
    "resolved",
  ]) {
    assert.match(
      emergencyRequestSource,
      new RegExp(`"${status}"`)
    );
  }
});

test("the restored component is mobile-contained with reachable actions and safe wrapping", () => {
  assert.match(
    componentSource,
    /const relationshipShell = \{[\s\S]*width: "100%"[\s\S]*maxWidth: "760px"[\s\S]*minWidth: 0[\s\S]*overflowX: "hidden"/
  );
  assert.match(
    componentSource,
    /const responseAction = \{[\s\S]*minHeight: "48px"/
  );
  assert.match(
    componentSource,
    /overflowWrap: "anywhere"/
  );
  assert.match(
    componentSource,
    /wordBreak: "break-word"/
  );
});

test("existing Work Center actions and canonical card routing remain in place", () => {
  assert.match(
    myRequestsSource,
    /responsePresentation\.reviewActionLabel/
  );
  assert.match(
    myRequestsSource,
    /View Emergency Request/
  );
  assert.match(
    myRequestsSource,
    /buildEmergencyRequestRoute\(\s*emergencyRequest\.emergencyRequestId/
  );
  assert.match(
    myRequestsSource,
    /buildCanonicalConversationRoute\(\s*emergencyRequest\.conversationId,\s*"myRequests"/
  );
  assert.match(
    emergencyRequestSource,
    /cancellationAvailable=\{cancellationAvailable\}[\s\S]*onCancelRequest=\{requestCancellation\}/
  );
  assert.match(
    componentSource,
    /cancellationAvailable[\s\S]*onCancelRequest[\s\S]*copy\.cancelRequest/
  );
});
