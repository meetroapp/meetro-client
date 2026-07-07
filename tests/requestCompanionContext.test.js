import test from "node:test";
import assert from "node:assert/strict";

import {
  REQUEST_COMPANION_CONTEXT_KEY,
  buildRequestCompanionContext,
  clearRequestCompanionContext,
  readRequestCompanionContext,
  writeRequestCompanionContext,
} from "../src/utils/requestCompanionContext.js";

function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

test("builds request detail companion context from visible request fields only", () => {
  const context = buildRequestCompanionContext({
    request: {
      requestId: "req-123",
      projectId: "project-456",
      conversationId: "conversation-789",
      title: "Kitchen sink leak",
      status: "scheduled",
      category: "Plumbing",
      acceptedQuote: { status: "accepted", amount: 1200 },
      schedule: { status: "confirmed", privateNotes: "hidden" },
      internalAdminNote: "do not expose",
    },
    rolePerspective: "homeowner",
    nextStep: "Review the confirmed visit.",
  });

  assert.deepEqual(context, {
    pageContext: "request_detail",
    requestId: "req-123",
    projectId: "project-456",
    conversationId: "conversation-789",
    status: "scheduled",
    nextStep: "Review the confirmed visit.",
    serviceType: "Plumbing",
    title: "Kitchen sink leak",
    rolePerspective: "homeowner",
    quoteStatus: "accepted",
    scheduleStatus: "confirmed",
  });
  assert.equal("amount" in context, false);
  assert.equal("privateNotes" in context, false);
  assert.equal("internalAdminNote" in context, false);
});

test("request companion context fails closed when no request identifiers exist", () => {
  assert.equal(
    buildRequestCompanionContext({
      request: {
        status: "scheduled",
        category: "Plumbing",
      },
      nextStep: "Wait for a visit.",
    }),
    null
  );
});

test("request companion context storage accepts only request detail payloads", () => {
  const storage = createMemoryStorage();
  const context = buildRequestCompanionContext({
    request: {
      id: "req-1",
      conversationId: "thread-1",
      service: "Cleaning",
      status: "pending",
    },
    nextStep: "Continue the conversation.",
  });

  assert.deepEqual(writeRequestCompanionContext(context, storage), context);
  assert.deepEqual(readRequestCompanionContext(storage), context);

  storage.setItem(
    REQUEST_COMPANION_CONTEXT_KEY,
    JSON.stringify({ pageContext: "admin_detail", requestId: "hidden" })
  );
  assert.equal(readRequestCompanionContext(storage), null);

  clearRequestCompanionContext(storage);
  assert.equal(readRequestCompanionContext(storage), null);
});
