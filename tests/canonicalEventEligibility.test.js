import test from "node:test";
import assert from "node:assert/strict";

import {
  CANONICAL_EVENT_FIELD_TRUST,
  CANONICAL_EVENT_SHADOW_RISK,
  validateCanonicalEventEligibility,
} from "../src/utils/canonicalEventEligibility.js";
import { WORKFLOW_EVENT_TYPES } from "../src/utils/workflowEventContract.js";

function evidence(value, authority) {
  return { value, authority };
}

function eligibleQuote(overrides = {}) {
  return {
    eventType: WORKFLOW_EVENT_TYPES.WORKFLOW_QUOTE_SENT,
    projectId: evidence("project-1", "project-aggregate"),
    conversationId: evidence(
      "conversation-1",
      "conversation-authority"
    ),
    actorId: evidence("user-1", "authentication-context"),
    actorRole: evidence("business", "authorization-context"),
    entityId: evidence("quote-1", "quote-authority"),
    eventId: evidence("event-quote-1", "backend-event-store"),
    occurredAt: evidence(
      "2026-06-14T12:00:00.000Z",
      "domain-authority"
    ),
    recordedAt: evidence(
      "2026-06-14T12:00:01.000Z",
      "event-persistence"
    ),
    acknowledgement: {
      acknowledged: true,
      authority: "backend-event-store",
      projectId: "project-1",
      conversationId: "conversation-1",
      actorId: "user-1",
      actorRole: "business",
      entityId: "quote-1",
      eventId: "event-quote-1",
      recordedAt: "2026-06-14T12:00:01.000Z",
    },
    ...overrides,
  };
}

test("eligible Quote Sent returns LOW shadow risk", () => {
  const result = validateCanonicalEventEligibility(eligibleQuote());

  assert.equal(result.eligible, true);
  assert.equal(result.shadowRisk, CANONICAL_EVENT_SHADOW_RISK.LOW);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.warnings, []);
});

test("request-derived Project identity is blocked", () => {
  const result = validateCanonicalEventEligibility(
    eligibleQuote({
      projectId: evidence("request-1", "request-id"),
      acknowledgement: {
        acknowledged: false,
      },
    })
  );

  assert.equal(result.eligible, false);
  assert.equal(
    result.fieldTrust.projectId,
    CANONICAL_EVENT_FIELD_TRUST.INFERRED
  );
  assert.ok(result.blockers.some((item) => item.code === "inferred-project"));
});

test("current Viewer role is blocked", () => {
  const result = validateCanonicalEventEligibility(
    eligibleQuote({
      actorRole: evidence("business", "current-viewer"),
      acknowledgement: {
        acknowledged: false,
      },
    })
  );

  assert.equal(result.eligible, false);
  assert.equal(
    result.fieldTrust.actorRole,
    CANONICAL_EVENT_FIELD_TRUST.FALLBACK
  );
  assert.ok(
    result.blockers.some((item) => item.code === "inferred-actor-role")
  );
});

test("generic Event ID is blocked", () => {
  const result = validateCanonicalEventEligibility(
    eligibleQuote({
      eventId: evidence("id", "generic-id"),
      acknowledgement: {
        acknowledged: false,
      },
    })
  );

  assert.equal(result.eligible, false);
  assert.ok(result.blockers.some((item) => item.code === "generic-event-id"));
});

test("client timestamp produces a warning without blocking eligibility", () => {
  const result = validateCanonicalEventEligibility(
    eligibleQuote({
      occurredAt: evidence(
        "2026-06-14T12:00:00.000Z",
        "client-clock"
      ),
    })
  );

  assert.equal(result.eligible, true);
  assert.equal(result.shadowRisk, CANONICAL_EVENT_SHADOW_RISK.MEDIUM);
  assert.ok(
    result.warnings.some((item) => item.code === "client-only-timestamp")
  );
});

test("missing backend acknowledgement produces a warning", () => {
  const result = validateCanonicalEventEligibility(
    eligibleQuote({
      acknowledgement: null,
    })
  );

  assert.equal(result.eligible, true);
  assert.equal(result.shadowRisk, CANONICAL_EVENT_SHADOW_RISK.MEDIUM);
  assert.ok(
    result.warnings.some(
      (item) => item.code === "missing-backend-acknowledgement"
    )
  );
});

test("conflicting Project mapping is blocked", () => {
  const result = validateCanonicalEventEligibility(
    eligibleQuote({
      acknowledgement: {
        acknowledged: true,
        authority: "backend-event-store",
        projectId: "project-2",
        conversationId: "conversation-1",
        actorId: "user-1",
        actorRole: "business",
        entityId: "quote-1",
        eventId: "event-quote-1",
        recordedAt: "2026-06-14T12:00:01.000Z",
      },
    })
  );

  assert.equal(result.eligible, false);
  assert.equal(
    result.fieldTrust.projectId,
    CANONICAL_EVENT_FIELD_TRUST.CONFLICTING
  );
  assert.ok(
    result.blockers.some((item) => item.code === "conflicting-projectId")
  );
});

test("eligible backend Message returns LOW shadow risk", () => {
  const result = validateCanonicalEventEligibility({
    eventType: WORKFLOW_EVENT_TYPES.MESSAGE_CREATED,
    projectId: evidence("project-1", "backend-acknowledgement"),
    conversationId: evidence(
      "conversation-1",
      "backend-acknowledgement"
    ),
    actorId: evidence("user-1", "backend-acknowledgement"),
    actorRole: evidence("homeowner", "backend-acknowledgement"),
    entityId: evidence("message-41", "message-persistence"),
    eventId: evidence("event-message-41", "backend-event-store"),
    occurredAt: evidence(
      "2026-06-14T12:00:00.000Z",
      "backend-acknowledgement"
    ),
    recordedAt: evidence(
      "2026-06-14T12:00:01.000Z",
      "backend-acknowledgement"
    ),
    acknowledgement: {
      acknowledged: true,
      authority: "backend-event-store",
      projectId: "project-1",
      conversationId: "conversation-1",
      actorId: "user-1",
      actorRole: "homeowner",
      entityId: "message-41",
      eventId: "event-message-41",
      recordedAt: "2026-06-14T12:00:01.000Z",
    },
  });

  assert.equal(result.eligible, true);
  assert.equal(result.shadowRisk, CANONICAL_EVENT_SHADOW_RISK.LOW);
});

test("Completion event is blocked while finality policy is unresolved", () => {
  const result = validateCanonicalEventEligibility(
    eligibleQuote({
      eventType: WORKFLOW_EVENT_TYPES.WORKFLOW_COMPLETION_SUBMITTED,
      entityId: evidence("completion-1", "completion-authority"),
      eventId: evidence("event-completion-1", "backend-event-store"),
      acknowledgement: {
        acknowledged: true,
        authority: "backend-event-store",
        projectId: "project-1",
        conversationId: "conversation-1",
        actorId: "user-1",
        actorRole: "business",
        entityId: "completion-1",
        eventId: "event-completion-1",
        recordedAt: "2026-06-14T12:00:01.000Z",
      },
    })
  );

  assert.equal(result.eligible, false);
  assert.ok(
    result.blockers.some(
      (item) => item.code === "completion-policy-unresolved"
    )
  );
});

test("unknown Event Type is blocked", () => {
  const result = validateCanonicalEventEligibility(
    eligibleQuote({
      eventType: "WORKFLOW_CHANGE_REQUESTED",
    })
  );

  assert.equal(result.eligible, false);
  assert.equal(
    result.fieldTrust.eventType,
    CANONICAL_EVENT_FIELD_TRUST.INFERRED
  );
  assert.ok(
    result.blockers.some((item) => item.code === "unknown-event-type")
  );
});

test("missing recordedAt is warning-only for shadow measurement", () => {
  const result = validateCanonicalEventEligibility(
    eligibleQuote({
      recordedAt: "",
      acknowledgement: null,
    })
  );

  assert.equal(result.eligible, true);
  assert.equal(
    result.fieldTrust.recordedAt,
    CANONICAL_EVENT_FIELD_TRUST.MISSING
  );
  assert.ok(
    result.warnings.some((item) => item.code === "missing-recorded-at")
  );
});

test("validator is deterministic, non-mutating, and browser-independent", () => {
  const input = eligibleQuote();
  const original = structuredClone(input);
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage"
  );
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("localStorage access is not allowed");
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    get() {
      throw new Error("window access is not allowed");
    },
  });

  try {
    const first = validateCanonicalEventEligibility(input);
    const second = validateCanonicalEventEligibility(input);

    assert.deepEqual(first, second);
    assert.deepEqual(input, original);
  } finally {
    if (localStorageDescriptor) {
      Object.defineProperty(globalThis, "localStorage", localStorageDescriptor);
    } else {
      delete globalThis.localStorage;
    }

    if (windowDescriptor) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else {
      delete globalThis.window;
    }
  }
});
