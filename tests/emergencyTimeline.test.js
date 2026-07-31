import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getEmergencyAlternateOutcome,
  getEmergencyTimeline,
} from "../src/utils/emergencySummary.js";

const componentSource = readFileSync(
  new URL(
    "../src/components/EmergencyTimeline.jsx",
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
const myRequestsSource = readFileSync(
  new URL(
    "../src/pages/MyRequests.jsx",
    import.meta.url
  ),
  "utf8"
);
const conversationThreadSource = readFileSync(
  new URL(
    "../src/pages/ConversationThread.jsx",
    import.meta.url
  ),
  "utf8"
);

const timestamps = Object.freeze({
  requestedAt: "2026-07-29T14:00:00.000Z",
  assignedAt: "2026-07-29T14:05:00.000Z",
  enRouteAt: "2026-07-29T14:10:00.000Z",
  arrivedAt: "2026-07-29T14:20:00.000Z",
  workStartedAt: "2026-07-29T14:25:00.000Z",
  completedAt: "2026-07-29T15:00:00.000Z",
});

const expectedLabels = [
  "Requested",
  "Accepted",
  "On the Way",
  "Arrived",
  "Work Started",
  "Completed",
];

function timelineStates(emergencyRequest) {
  return getEmergencyTimeline(
    emergencyRequest
  ).map((stage) => stage.state);
}

test("all six Emergency stages always render in canonical order", () => {
  for (const emergencyRequest of [
    {},
    { status: "draft" },
    {
      status: "professional_arrived",
      ...timestamps,
    },
    { status: "cancelled" },
  ]) {
    const timeline = getEmergencyTimeline(
      emergencyRequest
    );
    assert.equal(timeline.length, 6);
    assert.deepEqual(
      timeline.map((stage) => stage.label),
      expectedLabels
    );
  }
});

test("Requested is the only current stage after canonical submission", () => {
  assert.deepEqual(
    timelineStates({
      status: "ready_for_distribution",
      requestedAt: timestamps.requestedAt,
    }),
    [
      "current",
      "future",
      "future",
      "future",
      "future",
      "future",
    ]
  );
});

test("Requested is reached and Accepted is current after assignment", () => {
  assert.deepEqual(
    timelineStates({
      status: "assigned",
      requestedAt: timestamps.requestedAt,
      assignedAt: timestamps.assignedAt,
    }),
    [
      "reached",
      "current",
      "future",
      "future",
      "future",
      "future",
    ]
  );
});

test("On the Way is current only after canonical en-route progress", () => {
  assert.deepEqual(
    timelineStates({
      status: "professional_en_route",
      requestedAt: timestamps.requestedAt,
      assignedAt: timestamps.assignedAt,
      enRouteAt: timestamps.enRouteAt,
    }),
    [
      "reached",
      "reached",
      "current",
      "future",
      "future",
      "future",
    ]
  );
});

test("Arrived is current without reaching future work stages", () => {
  assert.deepEqual(
    timelineStates({
      status: "professional_arrived",
      requestedAt: timestamps.requestedAt,
      assignedAt: timestamps.assignedAt,
      enRouteAt: timestamps.enRouteAt,
      arrivedAt: timestamps.arrivedAt,
    }),
    [
      "reached",
      "reached",
      "reached",
      "current",
      "future",
      "future",
    ]
  );
});

test("Work Started is current while Completed remains future", () => {
  assert.deepEqual(
    timelineStates({
      status: "work_in_progress",
      ...timestamps,
      completedAt: null,
    }),
    [
      "reached",
      "reached",
      "reached",
      "reached",
      "current",
      "future",
    ]
  );
});

test("Completed is current after canonical completion", () => {
  assert.deepEqual(
    timelineStates({
      status: "completed",
      ...timestamps,
    }),
    [
      "reached",
      "reached",
      "reached",
      "reached",
      "reached",
      "current",
    ]
  );
});

test("current, prior reached, and future stages use distinct presentation states", () => {
  assert.match(
    componentSource,
    /state === "current"[\s\S]*return currentStage/
  );
  assert.match(
    componentSource,
    /state === "reached"[\s\S]*return reachedStage/
  );
  assert.match(
    componentSource,
    /return futureStage/
  );
  assert.match(
    componentSource,
    /aria-current=\{[\s\S]*stage\.state === "current"[\s\S]*"step"/
  );
  assert.match(
    componentSource,
    /const currentStage = \{[\s\S]*border: "2px solid #dc2626"[\s\S]*boxShadow/
  );
  assert.match(
    componentSource,
    /const futureStage = \{[\s\S]*background: "#ffffff"[\s\S]*border: "1px solid #cbd5e1"/
  );
});

test("timestamps render only from valid authoritative stage fields", () => {
  const timeline = getEmergencyTimeline({
    status: "professional_en_route",
    requestedAt: timestamps.requestedAt,
    assignedAt: "",
    enRouteAt: timestamps.enRouteAt,
    arrivedAt: "not-a-timestamp",
    completedAt: timestamps.completedAt,
  });

  assert.deepEqual(
    timeline.map((stage) => stage.reachedAt),
    [
      timestamps.requestedAt,
      null,
      timestamps.enRouteAt,
      null,
      null,
      null,
    ]
  );
  assert.match(
    componentSource,
    /\{stage\.reachedAt && \([\s\S]*<time[\s\S]*dateTime=\{stage\.reachedAt\}/
  );
});

test("canonical status caps inconsistent future timestamps", () => {
  const timeline = getEmergencyTimeline({
    status: "assigned",
    requestedAt: timestamps.requestedAt,
    assignedAt: timestamps.assignedAt,
    completedAt: timestamps.completedAt,
  });

  assert.deepEqual(
    timeline.map((stage) => stage.state),
    [
      "reached",
      "current",
      "future",
      "future",
      "future",
      "future",
    ]
  );
  assert.equal(
    timeline.at(-1).reachedAt,
    null
  );
});

test("draft does not fabricate a Requested stage", () => {
  assert.deepEqual(
    timelineStates({ status: "draft" }),
    Array(6).fill("future")
  );
});

test("safety_blocked renders a truthful alternate outcome", () => {
  assert.deepEqual(
    getEmergencyAlternateOutcome({
      status: "safety_blocked",
    }),
    {
      status: "safety_blocked",
      label: "Safety Action Required",
      occurredAt: null,
    }
  );
  assert.deepEqual(
    timelineStates({ status: "safety_blocked" }),
    Array(6).fill("future")
  );
});

test("cancelled renders separately without fabricating later stages", () => {
  const emergencyRequest = {
    status: "cancelled",
    requestedAt: timestamps.requestedAt,
    cancelledAt: "2026-07-29T14:03:00.000Z",
  };

  assert.deepEqual(
    timelineStates(emergencyRequest),
    [
      "reached",
      "future",
      "future",
      "future",
      "future",
      "future",
    ]
  );
  assert.deepEqual(
    getEmergencyAlternateOutcome(
      emergencyRequest
    ),
    {
      status: "cancelled",
      label: "Emergency Request Cancelled",
      occurredAt:
        "2026-07-29T14:03:00.000Z",
    }
  );
});

test("expired renders separately without claiming completion", () => {
  const emergencyRequest = {
    status: "expired",
    requestedAt: timestamps.requestedAt,
    expiredAt: "2026-07-30T14:00:00.000Z",
  };

  assert.equal(
    getEmergencyTimeline(
      emergencyRequest
    ).at(-1).state,
    "future"
  );
  assert.equal(
    getEmergencyAlternateOutcome(
      emergencyRequest
    ).label,
    "Emergency Request Expired"
  );
});

test("unable_to_match renders separately without claiming acceptance", () => {
  const emergencyRequest = {
    status: "unable_to_match",
    requestedAt: timestamps.requestedAt,
  };

  assert.equal(
    getEmergencyTimeline(
      emergencyRequest
    )[1].state,
    "future"
  );
  assert.equal(
    getEmergencyAlternateOutcome(
      emergencyRequest
    ).label,
    "No Compatible Professional Found"
  );
});

test("timeline code is presentation-only and has no browser or lifecycle authority", () => {
  const timelineSources = `${componentSource}\n${summarySource}`;

  assert.doesNotMatch(
    timelineSources,
    /localStorage|sessionStorage|authFetch|fetch\s*\(|setItem|removeItem|transitionEmergency|dispatchEvent/
  );
  assert.doesNotMatch(
    componentSource,
    /onClick|onSubmit|onChange/
  );
});

test("Work Center timeline layout remains width-bounded on mobile", () => {
  assert.match(
    componentSource,
    /const timelineContainer = \{[\s\S]*width: "100%"[\s\S]*maxWidth: "100%"[\s\S]*minWidth: 0[\s\S]*overflow: "hidden"/
  );
  assert.match(
    componentSource,
    /gridTemplateColumns:[\s\S]*repeat\(auto-fit, minmax\(min\(100%, 112px\), 1fr\)\)/
  );
  assert.match(
    componentSource,
    /overflowWrap: "anywhere"/
  );
});

test("Emergency card actions and canonical conversation routing remain unchanged", () => {
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
    /Open Conversation/
  );
  assert.match(
    myRequestsSource,
    /buildCanonicalConversationRoute\(\s*emergencyRequest\.conversationId,\s*"myRequests"/
  );
});

test("canonical conversation timeline remains untouched when requestedAt is unavailable", () => {
  assert.doesNotMatch(
    conversationThreadSource,
    /EmergencyTimeline/
  );
  assert.match(
    conversationThreadSource,
    /canonicalEmergencyWorkflow\?\.status/
  );
});
