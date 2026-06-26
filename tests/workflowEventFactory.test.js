import test from "node:test";
import assert from "node:assert/strict";

import {
  createWorkflowEvent,
  WorkflowEventValidationError,
  WORKFLOW_EVENT_ACTOR_ROLES,
  WORKFLOW_EVENT_TYPES,
} from "../src/utils/workflowEventFactory.js";
import {
  isCanonicalWorkflowEvent,
  validateCanonicalWorkflowEvent,
} from "../src/utils/workflowEventContract.js";

function canonicalInput(overrides = {}) {
  return {
    id: "event-quote-1",
    eventType: WORKFLOW_EVENT_TYPES.WORKFLOW_QUOTE_SENT,
    projectId: "project-1",
    conversationId: "conversation-1",
    actor: "business-1",
    actorRole: "business",
    recordedAt: "2026-06-13T12:00:00.000Z",
    source: "quote-builder",
    payload: { quoteId: "quote-1" },
    ...overrides,
  };
}

test("creates an exact canonical quote sent event", () => {
  const event = createWorkflowEvent(canonicalInput());

  assert.deepEqual(event, canonicalInput());
  assert.equal(isCanonicalWorkflowEvent(event), true);
  assert.deepEqual(validateCanonicalWorkflowEvent(event), {
    ok: true,
    errors: [],
  });
});

test("uses shared canonical event and actor role registries", () => {
  assert.equal(
    WORKFLOW_EVENT_TYPES.WORKFLOW_APPOINTMENT_CREATED,
    "WORKFLOW_APPOINTMENT_CREATED"
  );
  assert.deepEqual(WORKFLOW_EVENT_ACTOR_ROLES, [
    "homeowner",
    "business",
    "system",
  ]);
});

test("creates an event with supported optional fields only", () => {
  const event = createWorkflowEvent(
    canonicalInput({
      legacy: {
        originalType: "workflow_quote_sent",
        sourceShape: { type: "workflow_quote_sent" },
      },
      metadata: {
        schemaVersion: 1,
        correlationId: "correlation-1",
      },
      migrationSource: "meetro-conversation-local",
    })
  );

  assert.deepEqual(Object.keys(event), [
    "id",
    "eventType",
    "projectId",
    "conversationId",
    "actor",
    "actorRole",
    "recordedAt",
    "source",
    "payload",
    "legacy",
    "metadata",
    "migrationSource",
  ]);
  assert.equal(isCanonicalWorkflowEvent(event), true);
});

test("preserves payload and optional metadata without sharing references", () => {
  const input = canonicalInput({
    payload: {
      quoteId: "quote-3",
      details: { amount: 125 },
      items: [{ id: "item-1" }],
    },
    legacy: {
      sourceShape: { type: "workflow_quote_sent" },
      warnings: ["legacy-type"],
    },
    metadata: {
      projection: { conversation: true },
    },
  });
  const event = createWorkflowEvent(input);

  assert.deepEqual(event.payload, input.payload);
  assert.notStrictEqual(event.payload, input.payload);
  assert.notStrictEqual(event.payload.details, input.payload.details);
  assert.notStrictEqual(event.payload.items, input.payload.items);
  assert.notStrictEqual(event.legacy, input.legacy);
  assert.notStrictEqual(event.legacy.sourceShape, input.legacy.sourceShape);
  assert.notStrictEqual(event.metadata, input.metadata);
  assert.notStrictEqual(event.metadata.projection, input.metadata.projection);
});

test("requires an explicit canonical id without fallback generation", () => {
  assert.throws(
    () => createWorkflowEvent(canonicalInput({ id: undefined })),
    (error) =>
      error instanceof WorkflowEventValidationError &&
      error.errors.some(
        (validationError) => validationError.code === "missing-id"
      )
  );
});

test("requires explicit recordedAt without payload timestamp fallback", () => {
  assert.throws(
    () =>
      createWorkflowEvent(
        canonicalInput({
          recordedAt: undefined,
          payload: {
            quoteId: "quote-1",
            createdAt: "2026-06-13T14:00:00.000Z",
          },
        })
      ),
    (error) =>
      error instanceof WorkflowEventValidationError &&
      error.errors.some(
        (validationError) => validationError.code === "missing-recordedAt"
      )
  );
});

test("rejects unsupported and unknown event types", () => {
  assert.throws(
    () =>
      createWorkflowEvent(
        canonicalInput({ eventType: "WORKFLOW_FUTURE_EVENT" })
      ),
    (error) =>
      error instanceof WorkflowEventValidationError &&
      error.errors.some(
        (validationError) => validationError.code === "unsupported-event-type"
      )
  );
  assert.throws(
    () =>
      createWorkflowEvent(
        canonicalInput({
          eventType: WORKFLOW_EVENT_TYPES.UNKNOWN_WORKFLOW_EVENT,
        })
      ),
    WorkflowEventValidationError
  );
});

test("rejects unknown actors, invalid roles, sources, and payloads", () => {
  const invalidInputs = [
    canonicalInput({ actor: "unknown" }),
    canonicalInput({ actorRole: "contractor" }),
    canonicalInput({ source: "Quote Builder" }),
    canonicalInput({ payload: [] }),
  ];

  invalidInputs.forEach((input) => {
    assert.throws(
      () => createWorkflowEvent(input),
      WorkflowEventValidationError
    );
  });
});

test("preserves supplied id and recordedAt across retries", () => {
  const input = canonicalInput();
  const first = createWorkflowEvent(input);
  const retry = createWorkflowEvent(input);

  assert.equal(first.id, retry.id);
  assert.equal(first.recordedAt, retry.recordedAt);
  assert.deepEqual(first, retry);
});

test("does not mutate input", () => {
  const input = canonicalInput({
    payload: { completion: { id: "completion-1" } },
    legacy: { warnings: ["legacy"] },
    metadata: { schemaVersion: 1 },
  });
  const original = structuredClone(input);

  createWorkflowEvent(input);

  assert.deepEqual(input, original);
});

test("does not access localStorage or window", () => {
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
    assert.doesNotThrow(() => createWorkflowEvent(canonicalInput()));
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
