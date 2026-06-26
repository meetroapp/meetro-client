import test from "node:test";
import assert from "node:assert/strict";

import { resolveWorkflowIdentity } from "../src/utils/workflowIdentityResolver.js";

function completeInput(overrides = {}) {
  return {
    event: {
      projectId: "project-event-1",
      conversationId: "conversation-event-1",
      actor: "business-1",
      actorRole: "business",
      recordedAt: "2026-06-13T12:00:00.000Z",
      ...(overrides.event || {}),
    },
    project: {
      projectId: "project-event-1",
      ...(overrides.project || {}),
    },
    conversation: {
      conversationId: "conversation-event-1",
      ...(overrides.conversation || {}),
    },
    actorContext: {
      actor: "business-1",
      actorRole: "business",
      ...(overrides.actorContext || {}),
    },
  };
}

test("resolves projectId only from the event or project owner", () => {
  const result = resolveWorkflowIdentity({
    event: {},
    project: { projectId: "project-1" },
    conversation: {
      conversationId: "conversation-1",
      projectId: "wrong-domain-project",
    },
  });

  assert.equal(result.projectId, "project-1");
  assert.equal(result.resolutionSource.projectId, "project");
});

test("resolves conversationId only from the event or conversation owner", () => {
  const result = resolveWorkflowIdentity({
    event: {},
    project: {
      projectId: "project-1",
      conversationId: "wrong-domain-conversation",
    },
    conversation: { conversationId: "conversation-1" },
  });

  assert.equal(result.conversationId, "conversation-1");
  assert.equal(result.resolutionSource.conversationId, "conversation");
});

test("resolves actor from authenticated actor context", () => {
  const result = resolveWorkflowIdentity({
    actorContext: { actor: "homeowner-1" },
  });

  assert.equal(result.actor, "homeowner-1");
  assert.equal(result.resolutionSource.actor, "actorContext");
});

test("resolves actorRole from authorization context", () => {
  const result = resolveWorkflowIdentity({
    actorContext: { actorRole: "homeowner" },
  });

  assert.equal(result.actorRole, "homeowner");
  assert.equal(result.resolutionSource.actorRole, "actorContext");
});

test("preserves persistence-owned recordedAt from the event", () => {
  const result = resolveWorkflowIdentity({
    event: { recordedAt: "2026-06-13T12:00:00.000Z" },
    project: { recordedAt: "2026-06-13T13:00:00.000Z" },
    conversation: { createdAt: "2026-06-13T14:00:00.000Z" },
    actorContext: { recordedAt: "2026-06-13T15:00:00.000Z" },
  });

  assert.equal(result.recordedAt, "2026-06-13T12:00:00.000Z");
  assert.equal(result.resolutionSource.recordedAt, "event");
});

test("reports unresolved identity without cross-domain inference", () => {
  const result = resolveWorkflowIdentity({
    event: {
      requestId: "request-1",
      createdAt: "2026-06-13T12:00:00.000Z",
    },
    project: { id: "generic-project-id" },
    conversation: { projectId: "project-from-conversation" },
    actorContext: { userId: "local-user", role: "business" },
  });

  assert.deepEqual(
    {
      projectId: result.projectId,
      conversationId: result.conversationId,
      actor: result.actor,
      actorRole: result.actorRole,
      recordedAt: result.recordedAt,
    },
    {
      projectId: "",
      conversationId: "",
      actor: "",
      actorRole: "",
      recordedAt: "",
    }
  );
  assert.equal(result.completenessScore, 0);
  assert.deepEqual(
    result.warnings.map((warning) => warning.code),
    [
      "missing-projectId",
      "missing-conversationId",
      "missing-actor",
      "missing-actorRole",
      "missing-recordedAt",
    ]
  );
});

test("scores five complete canonical identity fields at twenty points each", () => {
  const complete = resolveWorkflowIdentity(completeInput());
  const partial = resolveWorkflowIdentity({
    project: { projectId: "project-1" },
    conversation: { conversationId: "conversation-1" },
    actorContext: { actor: "unknown", actorRole: "contractor" },
    event: { recordedAt: "not-a-timestamp" },
  });

  assert.equal(complete.completenessScore, 100);
  assert.equal(partial.completenessScore, 40);
  assert.ok(
    partial.warnings.some((warning) => warning.code === "unknown-actor")
  );
  assert.ok(
    partial.warnings.some(
      (warning) => warning.code === "unsupported-actor-role"
    )
  );
  assert.ok(
    partial.warnings.some(
      (warning) => warning.code === "invalid-recorded-at"
    )
  );
});

test("preserves existing event identity and reports owner conflicts", () => {
  const result = resolveWorkflowIdentity(
    completeInput({
      project: { projectId: "project-owner-2" },
      conversation: { conversationId: "conversation-owner-2" },
      actorContext: { actor: "business-2", actorRole: "homeowner" },
    })
  );

  assert.equal(result.projectId, "project-event-1");
  assert.equal(result.conversationId, "conversation-event-1");
  assert.equal(result.actor, "business-1");
  assert.equal(result.actorRole, "business");
  assert.deepEqual(
    result.warnings.map((warning) => warning.code),
    [
      "projectId-conflict",
      "conversationId-conflict",
      "actor-conflict",
      "actorRole-conflict",
    ]
  );
});

test("produces deterministic output and does not mutate inputs", () => {
  const input = completeInput();
  const original = structuredClone(input);

  const first = resolveWorkflowIdentity(input);
  const second = resolveWorkflowIdentity(input);

  assert.deepEqual(first, second);
  assert.deepEqual(input, original);
});

test("does not access browser storage or globals", () => {
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
    assert.doesNotThrow(() => resolveWorkflowIdentity(completeInput()));
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

