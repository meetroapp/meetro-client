import assert from "node:assert/strict";
import test from "node:test";

import {
  ALERT_API_ERROR_KINDS,
  AlertApiError,
  dismissAlert,
  fetchAlertCounts,
  fetchAlerts,
  markAlertRead,
  markAllAlertsRead,
} from "../src/utils/alertApi.js";

const NOW = "2026-08-04T12:00:00.000Z";
const GENERIC_ALERT_FAILURE = "The alert operation could not be completed.";

function canonicalAlertFixture(overrides = {}) {
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

function successResponse(body) {
  return { response: { ok: true, status: 200 }, data: body };
}

function listBody() {
  return {
    success: true,
    code: "ALERTS_RETRIEVED",
    alerts: [canonicalAlertFixture()],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  };
}

function createTransport(results) {
  const calls = [];
  return {
    calls,
    async authFetchImpl(endpoint, options, setPage) {
      calls.push({ endpoint, options, setPage });
      const result = results.shift();
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

test("GET alerts uses the exact path and serializes only supported query fields", async () => {
  const transport = createTransport([successResponse({
    ...listBody(),
    pagination: { limit: 10, hasMore: false, nextCursor: null },
  })]);
  const cursor = "opaque+/cursor==_value";
  await fetchAlerts({
    limit: 10,
    cursor,
    category: "communication",
    priority: "high",
    lifecycle: "active",
    unread: true,
    recipientUserId: 999,
    unsupported: "ignored",
  }, { authFetchImpl: transport.authFetchImpl });

  assert.equal(transport.calls.length, 1);
  const [{ endpoint, options }] = transport.calls;
  assert.equal(endpoint.split("?")[0], "/alerts");
  const params = new URLSearchParams(endpoint.split("?")[1]);
  assert.equal(params.get("limit"), "10");
  assert.equal(params.get("cursor"), cursor);
  assert.equal(params.get("category"), "communication");
  assert.equal(params.get("priority"), "high");
  assert.equal(params.get("lifecycle"), "active");
  assert.equal(params.get("unread"), "true");
  assert.equal(params.has("recipientUserId"), false);
  assert.equal(params.has("unsupported"), false);
  assert.deepEqual(options, { method: "GET", cache: "no-store" });
});

test("undefined and null list parameters are omitted and the opaque cursor is not decoded", async () => {
  const cursor = "this_is_not_decoded_or_recreated";
  const transport = createTransport([successResponse(listBody())]);
  await fetchAlerts({
    limit: undefined,
    cursor,
    category: null,
    priority: undefined,
    lifecycle: null,
    unread: undefined,
  }, { authFetchImpl: transport.authFetchImpl });

  const params = new URLSearchParams(transport.calls[0].endpoint.split("?")[1]);
  assert.equal(params.size, 1);
  assert.equal(params.get("cursor"), cursor);
});

test("invalid list query input fails before transport", () => {
  const transport = createTransport([]);
  for (const query of [
    null,
    [],
    { limit: 0 },
    { limit: 51 },
    { cursor: "" },
    { category: "unknown" },
    { priority: "urgent" },
    { lifecycle: "unknown" },
    { unread: "true" },
  ]) {
    assert.throws(
      () => fetchAlerts(query, { authFetchImpl: transport.authFetchImpl }),
      (error) => error instanceof AlertApiError && error.kind === ALERT_API_ERROR_KINDS.VALIDATION
    );
  }
  assert.equal(transport.calls.length, 0);
});

test("GET alert counts sends no body and no query", async () => {
  const transport = createTransport([successResponse({
    success: true,
    code: "ALERT_COUNTS_RETRIEVED",
    counts: { active: 2, unread: 1, byCategory: {} },
  })]);
  await fetchAlertCounts({ authFetchImpl: transport.authFetchImpl });
  assert.deepEqual(transport.calls[0], {
    endpoint: "/alerts/counts",
    options: { method: "GET", cache: "no-store" },
    setPage: undefined,
  });
});

test("read-all sends an exact empty or category-only body", async () => {
  const response = successResponse({
    success: true,
    code: "ALERTS_MARKED_READ",
    markedReadCount: 1,
    cutoffAt: NOW,
  });
  const transport = createTransport([response, response]);
  await markAllAlertsRead({ authFetchImpl: transport.authFetchImpl });
  await markAllAlertsRead({
    category: "communication",
    authFetchImpl: transport.authFetchImpl,
  });

  assert.equal(transport.calls[0].endpoint, "/alerts/read-all");
  assert.deepEqual(JSON.parse(transport.calls[0].options.body), {});
  assert.deepEqual(JSON.parse(transport.calls[1].options.body), {
    category: "communication",
  });
  assert.deepEqual(Object.keys(JSON.parse(transport.calls[1].options.body)), ["category"]);
});

test("individual read and dismiss mutations use exact canonical ID paths and empty bodies", async () => {
  const readAlert = canonicalAlertFixture({
    readAt: "2026-08-04T12:01:00.000Z",
    state: { ...canonicalAlertFixture().state, isRead: true },
  });
  const dismissed = canonicalAlertFixture({
    state: {
      ...canonicalAlertFixture().state,
      lifecycle: "dismissed",
      isDismissed: true,
    },
    dismissedAt: "2026-08-04T12:02:00.000Z",
  });
  const transport = createTransport([
    successResponse({ success: true, code: "ALERT_MARKED_READ", alert: readAlert }),
    successResponse({ success: true, code: "ALERT_DISMISSED", alert: dismissed }),
  ]);

  await markAlertRead("101", { authFetchImpl: transport.authFetchImpl });
  await dismissAlert("101", { authFetchImpl: transport.authFetchImpl });
  assert.equal(transport.calls[0].endpoint, "/alerts/101/read");
  assert.equal(transport.calls[1].endpoint, "/alerts/101/dismiss");
  assert.deepEqual(JSON.parse(transport.calls[0].options.body), {});
  assert.deepEqual(JSON.parse(transport.calls[1].options.body), {});
  assert.doesNotMatch(JSON.stringify(transport.calls), /recipient|conversationId|lifecycle/);
  assert.equal(transport.calls.some(({ endpoint }) => /\/conversations\/.*\/read/.test(endpoint)), false);
});

test("invalid alert IDs fail before transport", () => {
  const transport = createTransport([]);
  for (const id of [101, "0", "01", "-1", "1.5", "bad", String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.throws(
      () => markAlertRead(id, { authFetchImpl: transport.authFetchImpl }),
      (error) => error.code === "INVALID_ALERT_ID" && error.status === 400
    );
    assert.throws(
      () => dismissAlert(id, { authFetchImpl: transport.authFetchImpl }),
      (error) => error.code === "INVALID_ALERT_ID" && error.status === 400
    );
  }
  assert.equal(transport.calls.length, 0);
});

test("HTTP failures preserve status, code, operation, and distinct classifications", async () => {
  const cases = [
    [401, "AUTHENTICATION_REQUIRED", ALERT_API_ERROR_KINDS.AUTHENTICATION, false],
    [404, "ALERT_NOT_FOUND", ALERT_API_ERROR_KINDS.NOT_FOUND, false],
    [409, "ALERT_NOT_DISMISSIBLE", ALERT_API_ERROR_KINDS.CONFLICT, false],
    [500, "ALERT_DISMISS_FAILED", ALERT_API_ERROR_KINDS.SERVER, true],
  ];

  for (const [status, code, kind, retryable] of cases) {
    const transport = createTransport([{
      response: { ok: false, status },
      data: { success: false, code, message: "Safe public failure." },
    }]);
    await assert.rejects(
      dismissAlert("101", { authFetchImpl: transport.authFetchImpl }),
      (error) =>
        error instanceof AlertApiError &&
        error.status === status &&
        error.code === code &&
        error.kind === kind &&
        error.operation === "dismiss_alert" &&
        error.retryable === retryable
    );
  }
});

test("safe backend failure text remains available and surrounding whitespace is trimmed", async () => {
  const transport = createTransport([
    {
      response: { ok: false, status: 500 },
      data: {
        success: false,
        code: "ALERT_DISMISS_FAILED",
        message: "  Alerts are temporarily unavailable. \n",
      },
    },
    {
      response: { ok: false, status: 400 },
      data: {
        success: false,
        code: "INVALID_ALERT_QUERY",
        message: "Value must be > 5 and < 10.",
      },
    },
  ]);

  await assert.rejects(
    dismissAlert("101", { authFetchImpl: transport.authFetchImpl }),
    (error) =>
      error.message === "Alerts are temporarily unavailable." &&
      error.status === 500 &&
      error.code === "ALERT_DISMISS_FAILED" &&
      error.kind === ALERT_API_ERROR_KINDS.SERVER
  );
  await assert.rejects(
    dismissAlert("101", { authFetchImpl: transport.authFetchImpl }),
    (error) =>
      error.message === "Value must be > 5 and < 10." &&
      error.kind === ALERT_API_ERROR_KINDS.VALIDATION
  );
});

test("unsafe backend failure text is discarded across the exported request path", async () => {
  const cases = [
    {
      message: "<img src=x onerror=alert(1)>",
      status: 409,
      kind: ALERT_API_ERROR_KINDS.CONFLICT,
    },
    {
      message: "<script>alert(1)</script>",
      status: 404,
      kind: ALERT_API_ERROR_KINDS.NOT_FOUND,
    },
    {
      message: '<a href="javascript:alert(1)">Open</a>',
      status: 500,
      kind: ALERT_API_ERROR_KINDS.SERVER,
    },
    {
      message: "<unknown>tag</unknown>",
      status: 500,
      kind: ALERT_API_ERROR_KINDS.SERVER,
    },
    {
      message: "Unsafe\u0000message",
      status: 500,
      kind: ALERT_API_ERROR_KINDS.SERVER,
    },
    {
      message: "Unsafe\u0007message",
      status: 500,
      kind: ALERT_API_ERROR_KINDS.SERVER,
    },
    {
      message: "\u001b[31mTerminal control",
      status: 500,
      kind: ALERT_API_ERROR_KINDS.SERVER,
    },
    {
      message: "x".repeat(401),
      status: 500,
      kind: ALERT_API_ERROR_KINDS.SERVER,
    },
  ];

  for (const value of cases) {
    const transport = createTransport([{
      response: { ok: false, status: value.status },
      data: {
        success: false,
        code: "ALERT_PUBLIC_FAILURE",
        message: value.message,
      },
    }]);

    await assert.rejects(
      dismissAlert("101", { authFetchImpl: transport.authFetchImpl }),
      (error) => {
        assert.equal(error.message, GENERIC_ALERT_FAILURE);
        assert.equal(error.status, value.status);
        assert.equal(error.code, "ALERT_PUBLIC_FAILURE");
        assert.equal(error.kind, value.kind);
        assert.equal(error.operation, "dismiss_alert");
        assert.equal(Object.hasOwn(error, "cause"), false);
        assert.doesNotMatch(JSON.stringify(error), /onerror|script|javascript|Terminal control/);
        return true;
      }
    );
  }
});

test("valid canonical backend error codes remain intact across exported request failures", async () => {
  const cases = [
    {
      code: "ALERT_NOT_FOUND",
      status: 404,
      kind: ALERT_API_ERROR_KINDS.NOT_FOUND,
      retryable: false,
    },
    {
      code: "ALERT_NOT_DISMISSIBLE",
      status: 409,
      kind: ALERT_API_ERROR_KINDS.CONFLICT,
      retryable: false,
    },
    {
      code: "ALERT_FAILURE",
      status: 500,
      kind: ALERT_API_ERROR_KINDS.SERVER,
      retryable: true,
    },
  ];

  for (const value of cases) {
    const transport = createTransport([{
      response: { ok: false, status: value.status },
      data: {
        success: false,
        code: value.code,
        message: "Safe public failure.",
      },
    }]);

    await assert.rejects(
      dismissAlert("101", { authFetchImpl: transport.authFetchImpl }),
      (error) =>
        error instanceof AlertApiError &&
        error.code === value.code &&
        error.status === value.status &&
        error.kind === value.kind &&
        error.retryable === value.retryable &&
        error.operation === "dismiss_alert"
    );
  }
});

test("invalid backend error codes fail closed across the exported request path", async () => {
  const invalidCodes = [
    "<img src=x onerror=alert(1)>",
    "<script>alert(1)</script>",
    "alert_failure",
    "Alert_Failure",
    "ALERT-FAILURE",
    "ALERT FAILURE",
    "ALERT.FAILURE",
    "_ALERT_FAILURE",
    "ALERT_FAILURE_",
    "ALERT__FAILURE",
    "ALERT/FAILURE",
    "",
    "   ",
    "ALERT\u0000FAILURE",
    "ALERT\u0007FAILURE",
    "\u001b[31mALERT_FAILURE",
    "A".repeat(129),
    123,
    null,
    { code: "ALERT_FAILURE" },
  ];

  for (const invalidCode of invalidCodes) {
    const transport = createTransport([{
      response: { ok: false, status: 500 },
      data: {
        success: false,
        code: invalidCode,
        message: "Safe public failure.",
      },
    }]);

    await assert.rejects(
      dismissAlert("101", { authFetchImpl: transport.authFetchImpl }),
      (error) => {
        const serialized = JSON.stringify(error);
        const rejectedSerialized = JSON.stringify(invalidCode);
        const rejectedFragment = typeof invalidCode === "string"
          ? rejectedSerialized.slice(1, -1)
          : rejectedSerialized;
        assert.equal(error.code, "ALERT_REQUEST_FAILED");
        assert.equal(error.message, "Safe public failure.");
        assert.equal(error.status, 500);
        assert.equal(error.operation, "dismiss_alert");
        assert.equal(error.kind, ALERT_API_ERROR_KINDS.SERVER);
        assert.equal(error.retryable, true);
        assert.match(serialized, /"code":"ALERT_REQUEST_FAILED"/);
        if (rejectedFragment) {
          assert.equal(serialized.includes(rejectedFragment), false);
        }
        if (typeof invalidCode === "string" && invalidCode) {
          assert.equal(error.message.includes(invalidCode), false);
        }
        assert.equal(Object.hasOwn(error, "cause"), false);
        assert.equal(Object.hasOwn(error, "details"), false);
        assert.equal(Object.hasOwn(error, "metadata"), false);
        return true;
      }
    );
  }
});

test("network failures are normalized and malformed success responses are rejected", async () => {
  const network = createTransport([new Error("private transport detail")]);
  await assert.rejects(
    fetchAlertCounts({ authFetchImpl: network.authFetchImpl }),
    (error) =>
      error.code === "ALERT_NETWORK_FAILURE" &&
      error.kind === ALERT_API_ERROR_KINDS.NETWORK &&
      error.retryable === true &&
      !error.message.includes("private")
  );

  const malformed = createTransport([successResponse({
    success: true,
    code: "ALERTS_RETRIEVED",
    alerts: [{ id: "fabricated" }],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
  })]);
  await assert.rejects(
    fetchAlerts({}, { authFetchImpl: malformed.authFetchImpl }),
    (error) =>
      error.code === "INVALID_ALERT_RESPONSE" &&
      error.kind === ALERT_API_ERROR_KINDS.MALFORMED_RESPONSE
  );
});
