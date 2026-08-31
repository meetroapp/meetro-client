import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_ALERT_CATEGORIES,
  CANONICAL_ALERT_LIFECYCLES,
  CANONICAL_ALERT_PRIORITIES,
  normalizeAlertCountsResponse,
  normalizeAlertListResponse,
  normalizeAlertMutationResponse,
  normalizeAlertReadAllResponse,
  normalizeCanonicalAlert,
  normalizeCanonicalAlertDestination,
  normalizeCanonicalAlertId,
} from "../src/utils/canonicalAlert.js";
import { getAlertPresentation } from "../src/utils/alertPresentation.js";

const NOW = "2026-08-04T12:00:00.000Z";

export function canonicalAlertFixture(overrides = {}) {
  return {
    id: "101",
    category: "communication",
    priority: "normal",
    titleKey: "alerts.communication.message.title",
    messageKey: "alerts.communication.message.body",
    payload: { preview: "A new reply is available", unreadCount: 1 },
    destination: { type: "conversation", conversationId: 91 },
    state: {
      lifecycle: "active",
      isRead: false,
      isDismissed: false,
      isResolved: false,
      isExpired: false,
      isArchived: false,
    },
    availableAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    readAt: null,
    dismissedAt: null,
    resolvedAt: null,
    expiresAt: null,
    archivedAt: null,
    ...overrides,
  };
}

test("valid canonical alerts preserve backend identity, payload, and independent read truth", () => {
  const fixture = canonicalAlertFixture({
    state: {
      lifecycle: "active",
      isRead: true,
      isDismissed: false,
      isResolved: false,
      isExpired: false,
      isArchived: false,
    },
    readAt: "2026-08-04T12:01:00.000Z",
  });
  const alert = normalizeCanonicalAlert(fixture);

  assert.deepEqual(alert, fixture);
  assert.notEqual(alert.payload, fixture.payload);
  assert.equal(alert.state.lifecycle, "active");
  assert.equal(alert.state.isRead, true);
});

test("canonical alert IDs enforce the backend serialized string type", () => {
  assert.equal(normalizeCanonicalAlertId("1"), "1");
  assert.equal(normalizeCanonicalAlertId(String(Number.MAX_SAFE_INTEGER)), String(Number.MAX_SAFE_INTEGER));
  for (const value of [1, 0, "0", "01", "-1", "1.5", "bad", String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.equal(normalizeCanonicalAlertId(value), null);
    assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({ id: value })), null);
  }
});

test("supported categories, priorities, and lifecycles are exact backend registries", () => {
  assert.deepEqual(CANONICAL_ALERT_CATEGORIES, [
    "communication", "emergency", "request", "evaluation", "proposal",
    "invoice", "payment", "schedule", "work", "completion", "review",
    "business_verification", "system",
  ]);
  assert.deepEqual(CANONICAL_ALERT_PRIORITIES, [
    "critical", "high", "normal", "informational",
  ]);
  assert.deepEqual(CANONICAL_ALERT_LIFECYCLES, [
    "active", "dismissed", "resolved", "expired", "archived",
  ]);

  for (const category of CANONICAL_ALERT_CATEGORIES) {
    const normalized = normalizeCanonicalAlert(canonicalAlertFixture({ category }));
    assert.equal(normalized.category, category);
    assert.deepEqual(normalized.destination, {
      type: "conversation",
      conversationId: 91,
    });
    assert.equal(normalized.state.lifecycle, "active");
    assert.equal(normalized.state.isRead, false);
  }

  for (const priority of CANONICAL_ALERT_PRIORITIES) {
    const normalized = normalizeCanonicalAlert(canonicalAlertFixture({ priority }));
    assert.equal(normalized.priority, priority);
    assert.equal(normalized.state.lifecycle, "active");
    assert.deepEqual(normalized.destination, {
      type: "conversation",
      conversationId: 91,
    });
  }

  const lifecycleFixtures = {
    active: {
      readAt: "2026-08-04T12:01:00.000Z",
      state: { ...canonicalAlertFixture().state, isRead: true },
    },
    dismissed: {
      dismissedAt: "2026-08-04T12:02:00.000Z",
      state: {
        ...canonicalAlertFixture().state,
        lifecycle: "dismissed",
        isDismissed: true,
      },
    },
    resolved: {
      resolvedAt: "2026-08-04T12:03:00.000Z",
      state: {
        ...canonicalAlertFixture().state,
        lifecycle: "resolved",
        isResolved: true,
      },
    },
    expired: {
      expiresAt: "2026-08-04T12:04:00.000Z",
      state: {
        ...canonicalAlertFixture().state,
        lifecycle: "expired",
        isExpired: true,
      },
    },
    archived: {
      archivedAt: "2026-08-04T12:05:00.000Z",
      state: {
        ...canonicalAlertFixture().state,
        lifecycle: "archived",
        isArchived: true,
      },
    },
  };
  for (const lifecycle of CANONICAL_ALERT_LIFECYCLES) {
    const normalized = normalizeCanonicalAlert(canonicalAlertFixture(
      lifecycleFixtures[lifecycle]
    ));
    assert.equal(normalized.state.lifecycle, lifecycle);
    assert.equal(normalized.state.isRead, lifecycle === "active");
    assert.equal(normalized.state.isDismissed, lifecycle === "dismissed");
    assert.equal(normalized.state.isResolved, lifecycle === "resolved");
    assert.equal(normalized.state.isExpired, lifecycle === "expired");
    assert.equal(normalized.state.isArchived, lifecycle === "archived");
  }

  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({ category: "invented" })), null);
  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({ priority: "urgent" })), null);
  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({
    state: { ...canonicalAlertFixture().state, lifecycle: "unknown" },
  })), null);
});

test("state flags and read timestamps must remain consistent without lifecycle inference", () => {
  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({
    readAt: "2026-08-04T12:01:00.000Z",
  })), null);
  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({
    state: { ...canonicalAlertFixture().state, isRead: true },
  })), null);
  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({
    state: {
      ...canonicalAlertFixture().state,
      lifecycle: "resolved",
      isResolved: false,
    },
  })), null);
});

test("typed destinations accept exact canonical identities and reject navigation instructions", () => {
  const destinations = [
    { type: "conversation", conversationId: 91 },
    { type: "emergency_request", emergencyRequestId: 6 },
    { type: "request", requestId: 31 },
    { type: "project", requestId: 32 },
    {
      type: "evaluation",
      evaluationId: "11111111-1111-4111-8111-111111111111",
    },
    { type: "business_profile", businessProfileId: 41 },
    { type: "review", reviewId: 51 },
    { type: "notifications" },
    { type: "job", jobId: "11111111-1111-4111-8111-111111111111" },
    {
      type: "visit",
      jobId: "11111111-1111-4111-8111-111111111111",
      visitId: "22222222-2222-4222-8222-222222222222",
    },
    {
      type: "quote",
      jobId: "11111111-1111-4111-8111-111111111111",
      quoteId: "33333333-3333-4333-8333-333333333333",
    },
    {
      type: "invoice",
      jobId: "11111111-1111-4111-8111-111111111111",
      invoiceId: "44444444-4444-4444-8444-444444444444",
    },
  ];
  assert.deepEqual(destinations.map(({ type }) => type), [
    "conversation",
    "emergency_request",
    "request",
    "project",
    "evaluation",
    "business_profile",
    "review",
    "notifications",
    "job",
    "visit",
    "quote",
    "invoice",
  ]);
  for (const destination of destinations) {
    const before = structuredClone(destination);
    const normalized = normalizeCanonicalAlertDestination(destination);
    assert.deepEqual(normalized, before);
    assert.deepEqual(destination, before);
    assert.equal(Object.hasOwn(normalized, "route"), false);
    assert.equal(Object.hasOwn(normalized, "path"), false);
    assert.equal(Object.hasOwn(normalized, "hash"), false);
  }

  for (const destination of [
    { type: "conversation", conversationId: "91" },
    { type: "conversation", conversationId: 0 },
    { type: "conversation", requestId: 91 },
    { type: "conversation", conversationId: 91, route: "conversationThread" },
    { type: "conversation", conversationId: 91, hash: "#messagesInbox" },
    { type: "conversation", conversationId: 91, url: "https://example.test" },
    { type: "conversation", conversationId: 91, returnPage: "home" },
    { type: "unknown", conversationId: 91 },
    { type: "job", jobId: "bad" },
    {
      type: "visit",
      jobId: "11111111-1111-4111-8111-111111111111",
    },
    {
      type: "invoice",
      jobId: "11111111-1111-4111-8111-111111111111",
      invoiceId: "44444444-4444-4444-8444-444444444444",
      address: "unsafe",
    },
    {
      type: "conversation",
      conversationId: { id: 91, route: "conversationThread" },
    },
  ]) {
    assert.equal(normalizeCanonicalAlertDestination(destination), null);
  }

  const prohibitedFields = [
    "route",
    "path",
    "hash",
    "url",
    "href",
    "query",
    "returnPage",
    "shell",
    "requestId",
    "request_id",
    "projectId",
    "activeJobId",
  ];
  for (const field of prohibitedFields) {
    const destination = {
      type: "conversation",
      conversationId: 91,
      [field]: field === "query" ? { requestId: 31 } : "unsafe",
    };
    assert.equal(
      normalizeCanonicalAlertDestination(destination),
      null,
      `${field} must not be accepted`
    );
  }

  assert.equal(normalizeCanonicalAlertDestination({
    type: "conversation",
    conversationId: 91,
    unexpected: true,
  }), null);
});

test("destination failure is nonfatal while core alert validation remains strict", () => {
  for (const destination of [
    { type: "conversation" },
    { type: "unsupported", requestId: 91 },
    { type: "conversation", conversationId: 91, route: "conversationThread" },
  ]) {
    const normalized = normalizeCanonicalAlert(canonicalAlertFixture({ destination }));
    assert.ok(normalized);
    assert.equal(normalized.destination, null);
    assert.equal(
      getAlertPresentation(normalized, "en").destinationKey,
      "alertCenterDestinationUnavailable"
    );
  }

  for (const overrides of [
    { id: "bad" },
    { category: "invented" },
    { priority: "urgent" },
    { payload: { invalid: Number.POSITIVE_INFINITY } },
    { availableAt: "invalid" },
    {
      state: {
        ...canonicalAlertFixture().state,
        lifecycle: "invented",
      },
    },
  ]) {
    assert.equal(normalizeCanonicalAlert(canonicalAlertFixture(overrides)), null);
  }
});

test("safe payload is copied but never used to infer a destination", () => {
  const payload = { conversationId: 999, nested: { unreadCount: 2 } };
  const normalized = normalizeCanonicalAlert(canonicalAlertFixture({ payload }));
  assert.deepEqual(normalized.payload, payload);
  assert.notEqual(normalized.payload, payload);
  assert.deepEqual(normalized.destination, {
    type: "conversation",
    conversationId: 91,
  });

  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({
    payload: { values: [1, 2, 3] },
  })), null);
  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({
    payload: { invalid: Number.POSITIVE_INFINITY },
  })), null);
  const unsafePayload = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({
    payload: unsafePayload,
  })), null);
});

test("timestamps accept canonical ISO strings and never fabricate invalid values", () => {
  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({ createdAt: null })), null);
  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({ updatedAt: "invalid" })), null);
  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({
    availableAt: "2026-08-04T08:00:00-04:00",
  })), null);
  assert.equal(normalizeCanonicalAlert(canonicalAlertFixture({ expiresAt: undefined })), null);
});

test("list normalization preserves server order, duplicates, and opaque cursor exactly", () => {
  const first = canonicalAlertFixture({ id: "102" });
  const second = canonicalAlertFixture({ id: "101" });
  const cursor = "opaque_CURSOR-value_123";
  const normalized = normalizeAlertListResponse({
    success: true,
    code: "ALERTS_RETRIEVED",
    alerts: [first, second, second],
    pagination: { limit: 3, hasMore: true, nextCursor: cursor },
  });

  assert.deepEqual(normalized.alerts.map(({ id }) => id), ["102", "101", "101"]);
  assert.equal(normalized.pagination.nextCursor, cursor);
});

test("list normalization retains malformed destinations in exact order", () => {
  const first = canonicalAlertFixture({ id: "201" });
  const unavailable = canonicalAlertFixture({
    id: "202",
    destination: {
      type: "conversation",
      conversationId: 91,
      route: "conversationThread",
    },
  });
  const unsupported = canonicalAlertFixture({
    id: "204",
    destination: { type: "future_destination", requestId: 91 },
  });
  const last = canonicalAlertFixture({ id: "203" });
  const normalized = normalizeAlertListResponse({
    success: true,
    code: "ALERTS_RETRIEVED",
    alerts: [first, unavailable, unsupported, last, last],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  });

  assert.deepEqual(normalized.alerts.map(({ id }) => id), [
    "201",
    "202",
    "204",
    "203",
    "203",
  ]);
  assert.deepEqual(normalized.alerts[0].destination, first.destination);
  assert.equal(normalized.alerts[1].destination, null);
  assert.equal(normalized.alerts[2].destination, null);
  assert.deepEqual(normalized.alerts[3].destination, last.destination);
  assert.equal(
    getAlertPresentation(normalized.alerts[1], "en").destinationKey,
    "alertCenterDestinationUnavailable"
  );
});

test("invalid list and pagination responses fail closed", () => {
  const fixture = canonicalAlertFixture();
  for (const pagination of [
    { limit: 0, hasMore: false, nextCursor: null },
    { limit: 51, hasMore: false, nextCursor: null },
    { limit: 25, hasMore: true, nextCursor: null },
    { limit: 25, hasMore: false, nextCursor: "unexpected" },
    { limit: 25, hasMore: "false", nextCursor: null },
  ]) {
    assert.equal(normalizeAlertListResponse({
      success: true,
      code: "ALERTS_RETRIEVED",
      alerts: [fixture],
      pagination,
    }), null);
  }
  assert.equal(normalizeAlertListResponse({
    success: true,
    code: "ALERTS_RETRIEVED",
    alerts: [{ ...fixture, id: "bad" }],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  }), null);
});

test("counts preserve backend totals and returned categories without recalculation", () => {
  const normalized = normalizeAlertCountsResponse({
    success: true,
    code: "ALERT_COUNTS_RETRIEVED",
    counts: {
      active: 9,
      unread: 8,
      byCategory: {
        communication: { active: 2, unread: 1 },
      },
      communication: {
        unread: 3,
        customerUnread: 2,
        teamUnread: 1,
        byJob: [{
          businessId: 7,
          jobId: "072c8736-5d97-4253-ba3e-dd1bce281a20",
          customerUnread: 2,
          teamUnread: 1,
        }],
        byConversation: [{ conversationId: 342, customerUnread: 2 }],
      },
    },
  });
  assert.deepEqual(normalized.counts, {
    active: 9,
    unread: 8,
    byCategory: { communication: { active: 2, unread: 1 } },
    communication: {
      unread: 3,
      customerUnread: 2,
      teamUnread: 1,
      byJob: [{
        businessId: 7,
        jobId: "072c8736-5d97-4253-ba3e-dd1bce281a20",
        customerUnread: 2,
        teamUnread: 1,
      }],
      byConversation: [{ conversationId: 342, customerUnread: 2 }],
    },
  });
  assert.equal(Object.hasOwn(normalized.counts.byCategory, "emergency"), false);

  assert.equal(normalizeAlertCountsResponse({
    success: true,
    code: "ALERT_COUNTS_RETRIEVED",
    counts: { active: 1, unread: -1, byCategory: {} },
  }), null);
  assert.equal(normalizeAlertCountsResponse({
    success: true,
    code: "ALERT_COUNTS_RETRIEVED",
    counts: { active: 1, unread: 1, byCategory: { invented: { active: 1, unread: 1 } } },
  }), null);
});

test("read-all and individual mutations use only returned canonical truth", () => {
  assert.deepEqual(normalizeAlertReadAllResponse({
    success: true,
    code: "ALERTS_MARKED_READ",
    markedReadCount: 4,
    cutoffAt: NOW,
  }), {
    success: true,
    code: "ALERTS_MARKED_READ",
    markedReadCount: 4,
    cutoffAt: NOW,
  });

  const readAlert = canonicalAlertFixture({
    readAt: "2026-08-04T12:01:00.000Z",
    state: { ...canonicalAlertFixture().state, isRead: true },
  });
  assert.deepEqual(normalizeAlertMutationResponse({
    success: true,
    code: "ALERT_MARKED_READ",
    alert: readAlert,
  }, "ALERT_MARKED_READ")?.alert, readAlert);
  assert.equal(normalizeAlertMutationResponse({
    success: true,
    code: "ALERT_MARKED_READ",
    alert: { ...readAlert, id: "bad" },
  }, "ALERT_MARKED_READ"), null);
  assert.equal(normalizeAlertReadAllResponse({
    success: true,
    code: "ALERTS_MARKED_READ",
    markedReadCount: 1,
    cutoffAt: "invalid",
  }), null);
});

test("malformed success envelopes fail closed", () => {
  assert.equal(normalizeAlertListResponse({ success: false }), null);
  assert.equal(normalizeAlertCountsResponse({ success: true, code: "WRONG", counts: {} }), null);
  assert.equal(normalizeAlertReadAllResponse({ success: true, code: "WRONG" }), null);
  assert.equal(normalizeAlertMutationResponse({ success: true, code: "WRONG" }, "ALERT_DISMISSED"), null);
});
