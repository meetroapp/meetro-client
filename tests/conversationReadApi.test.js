import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CONVERSATION_READ_API_ERROR_KINDS,
  ConversationReadApiError,
  markCanonicalConversationRead,
  normalizeCanonicalConversationReadResponse,
} from "../src/utils/conversationReadApi.js";

const VALID_TIMESTAMP = "2026-08-03T12:00:00.000Z";

function successBody(overrides = {}) {
  return {
    success: true,
    code: "CONVERSATION_MARKED_READ",
    conversationId: 91,
    readState: {
      lastReadMessageId: 205,
      lastReadAt: VALID_TIMESTAMP,
    },
    ...overrides,
  };
}

function successResponse(body = successBody()) {
  return { response: { ok: true, status: 200 }, data: body };
}

function failureResponse(status, body) {
  return { response: { ok: false, status }, data: body };
}

function createTransport(results = []) {
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

test("canonical conversation read rejects invalid conversation identifiers before transport", async () => {
  const transport = createTransport();
  for (const value of [
    undefined,
    null,
    0,
    -1,
    1.5,
    "91",
    "conversation-91",
    {},
  ]) {
    await assert.rejects(
      markCanonicalConversationRead(value, {
        authFetchImpl: transport.authFetchImpl,
      }),
      (error) =>
        error instanceof ConversationReadApiError &&
        error.status === 400 &&
        error.code === "INVALID_CONVERSATION_ID" &&
        error.kind === CONVERSATION_READ_API_ERROR_KINDS.VALIDATION &&
        error.retryable === false
    );
  }
  assert.equal(transport.calls.length, 0);
});

test("canonical conversation read posts to the exact endpoint without identity body or query metadata", async () => {
  const setPage = () => {};
  const transport = createTransport([successResponse()]);

  const result = await markCanonicalConversationRead(91, {
    setPage,
    authFetchImpl: transport.authFetchImpl,
  });

  assert.deepEqual(result, {
    conversationId: 91,
    readState: {
      lastReadMessageId: 205,
      lastReadAt: VALID_TIMESTAMP,
    },
  });
  assert.equal(transport.calls.length, 1);
  assert.deepEqual(transport.calls[0], {
    endpoint: "/conversations/91/read",
    options: { method: "POST", cache: "no-store" },
    setPage,
  });
  assert.equal(Object.hasOwn(transport.calls[0].options, "body"), false);
  assert.equal(transport.calls[0].endpoint.includes("?"), false);
});

test("canonical conversation read rejects caller-owned identity options before transport", async () => {
  for (const key of [
    "participantId",
    "relationshipId",
    "requestId",
    "emergencyRequestId",
    "workflowId",
    "alertId",
  ]) {
    const transport = createTransport([successResponse()]);
    await assert.rejects(
      markCanonicalConversationRead(91, {
        authFetchImpl: transport.authFetchImpl,
        [key]: "client-owned",
      }),
      (error) =>
        error instanceof ConversationReadApiError &&
        error.status === 400 &&
        error.code === "INVALID_CONVERSATION_READ_OPTIONS" &&
        error.kind === CONVERSATION_READ_API_ERROR_KINDS.VALIDATION
    );
    assert.equal(transport.calls.length, 0);
  }
});

test("canonical conversation read accepts nullable backend read-state values", async () => {
  const nullMessage = createTransport([
    successResponse(successBody({
      readState: {
        lastReadMessageId: null,
        lastReadAt: VALID_TIMESTAMP,
      },
    })),
  ]);
  assert.deepEqual(
    await markCanonicalConversationRead(91, {
      authFetchImpl: nullMessage.authFetchImpl,
    }),
    {
      conversationId: 91,
      readState: {
        lastReadMessageId: null,
        lastReadAt: VALID_TIMESTAMP,
      },
    }
  );

  const nullTimestamp = createTransport([
    successResponse(successBody({
      readState: {
        lastReadMessageId: 205,
        lastReadAt: null,
      },
    })),
  ]);
  assert.deepEqual(
    await markCanonicalConversationRead(91, {
      authFetchImpl: nullTimestamp.authFetchImpl,
    }),
    {
      conversationId: 91,
      readState: {
        lastReadMessageId: 205,
        lastReadAt: null,
      },
    }
  );
});

test("canonical conversation read rejects malformed successful responses", async () => {
  const malformedResponses = [
    null,
    [],
    successBody({ success: undefined }),
    successBody({ success: false }),
    successBody({ code: undefined }),
    successBody({ code: "CONVERSATION_READ" }),
    successBody({ conversationId: undefined }),
    successBody({ conversationId: "91" }),
    successBody({ conversationId: 92 }),
    successBody({ readState: undefined }),
    successBody({ readState: [] }),
    successBody({
      readState: { lastReadMessageId: 0, lastReadAt: VALID_TIMESTAMP },
    }),
    successBody({
      readState: { lastReadMessageId: -1, lastReadAt: VALID_TIMESTAMP },
    }),
    successBody({
      readState: { lastReadMessageId: "205", lastReadAt: VALID_TIMESTAMP },
    }),
    successBody({
      readState: { lastReadMessageId: 205, lastReadAt: "not-a-date" },
    }),
    successBody({
      readState: { lastReadMessageId: 205, lastReadAt: 1722686400000 },
    }),
  ];

  for (const body of malformedResponses) {
    const transport = createTransport([successResponse(body)]);
    await assert.rejects(
      markCanonicalConversationRead(91, {
        authFetchImpl: transport.authFetchImpl,
      }),
      (error) =>
        error instanceof ConversationReadApiError &&
        error.status === 502 &&
        error.code === "INVALID_CONVERSATION_READ_RESPONSE" &&
        error.kind ===
          CONVERSATION_READ_API_ERROR_KINDS.MALFORMED_RESPONSE &&
        error.retryable === true
    );
    assert.equal(transport.calls.length, 1);
  }
});

test("canonical conversation read normalizer does not fabricate read state", () => {
  assert.equal(
    normalizeCanonicalConversationReadResponse({
      success: true,
      code: "CONVERSATION_MARKED_READ",
      conversationId: 91,
    }, 91),
    null
  );
});

test("canonical conversation read preserves normalized backend failures", async () => {
  const failures = [
    [
      400,
      {
        success: false,
        code: "INVALID_CONVERSATION_ID",
        message: "A valid conversation ID is required.",
      },
      CONVERSATION_READ_API_ERROR_KINDS.VALIDATION,
      false,
    ],
    [
      401,
      {
        success: false,
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
      },
      CONVERSATION_READ_API_ERROR_KINDS.AUTHENTICATION,
      false,
    ],
    [
      404,
      {
        success: false,
        code: "CONVERSATION_NOT_FOUND",
        message: "The conversation was not found.",
      },
      CONVERSATION_READ_API_ERROR_KINDS.NOT_FOUND,
      false,
    ],
    [
      500,
      {
        error: "CONVERSATION_MARK_READ_FAILED",
        message: "The conversation read state could not be updated.",
      },
      CONVERSATION_READ_API_ERROR_KINDS.SERVER,
      true,
    ],
  ];

  for (const [status, body, kind, retryable] of failures) {
    const transport = createTransport([failureResponse(status, body)]);
    await assert.rejects(
      markCanonicalConversationRead(91, {
        authFetchImpl: transport.authFetchImpl,
      }),
      (error) => {
        assert.equal(error.status, status);
        assert.equal(error.code, body.code ?? body.error);
        assert.equal(error.message, body.message);
        assert.equal(error.kind, kind);
        assert.equal(error.retryable, retryable);
        assert.equal(error.operation, "mark_canonical_conversation_read");
        return true;
      }
    );
  }
});

test("canonical conversation read normalizes network failure without exposing transport detail", async () => {
  const transport = createTransport([new Error("private bearer token detail")]);
  await assert.rejects(
    markCanonicalConversationRead(91, {
      authFetchImpl: transport.authFetchImpl,
    }),
    (error) => {
      assert.equal(error.status, 0);
      assert.equal(error.code, "CONVERSATION_READ_NETWORK_FAILURE");
      assert.equal(error.kind, CONVERSATION_READ_API_ERROR_KINDS.NETWORK);
      assert.equal(error.retryable, true);
      assert.equal(error.message.includes("private"), false);
      assert.equal(Object.hasOwn(error, "cause"), false);
      return true;
    }
  );
});

test("canonical conversation read source remains authority-contained", () => {
  const source = readFileSync("src/utils/conversationReadApi.js", "utf8");

  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /\/alerts|markAlert|dismissAlert|resolveAlert/i);
  assert.doesNotMatch(source, /dispatchEvent|CustomEvent/);
  assert.doesNotMatch(source, /setInterval|setTimeout|requestAnimationFrame/);
  assert.doesNotMatch(source, /from ["']react["']|useEffect|useState/);
  assert.doesNotMatch(source, /sendMessage|createMessage|reply/i);
  assert.doesNotMatch(
    source,
    /participantId|participantUserId|relationshipId|requestId|emergencyRequestId|workflowId|alertId/
  );
});
