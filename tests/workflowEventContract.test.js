import test from "node:test";
import assert from "node:assert/strict";

import {
  CANONICAL_WORKFLOW_EVENT_TYPES,
  getWorkflowEventContractReport,
  isCanonicalWorkflowEvent,
  normalizeWorkflowEvent,
  validateCanonicalWorkflowEvent,
  WORKFLOW_EVENT_FIELDS,
  WORKFLOW_EVENT_OPTIONAL_FIELDS,
  WORKFLOW_EVENT_REQUIRED_FIELDS,
  WORKFLOW_EVENT_TYPES,
} from "../src/utils/workflowEventContract.js";

const REQUIRED_FIELDS = [
  "id",
  "eventType",
  "projectId",
  "conversationId",
  "actor",
  "actorRole",
  "recordedAt",
  "source",
  "payload",
];

const OPTIONAL_FIELDS = ["legacy", "metadata", "migrationSource"];

function canonicalEvent(overrides = {}) {
  return {
    id: "event-1",
    eventType: WORKFLOW_EVENT_TYPES.WORKFLOW_QUOTE_SENT,
    projectId: "project-1",
    conversationId: "conversation-1",
    actor: "user-1",
    actorRole: "business",
    recordedAt: "2026-06-13T12:00:00.000Z",
    source: "quote-builder",
    payload: { quoteId: "quote-1" },
    ...overrides,
  };
}

test("exports the canonical required and optional field lists", () => {
  assert.deepEqual(WORKFLOW_EVENT_REQUIRED_FIELDS, REQUIRED_FIELDS);
  assert.deepEqual(WORKFLOW_EVENT_OPTIONAL_FIELDS, OPTIONAL_FIELDS);
  assert.deepEqual(WORKFLOW_EVENT_FIELDS, [
    ...REQUIRED_FIELDS,
    ...OPTIONAL_FIELDS,
  ]);
  assert.ok(!WORKFLOW_EVENT_FIELDS.includes("eventId"));
  assert.ok(!WORKFLOW_EVENT_FIELDS.includes("actorId"));
  assert.ok(!WORKFLOW_EVENT_FIELDS.includes("occurredAt"));
});

test("exports the canonical workflow event type registry", () => {
  assert.deepEqual(CANONICAL_WORKFLOW_EVENT_TYPES, [
    "WORKFLOW_REQUEST_CREATED",
    "WORKFLOW_APPOINTMENT_CREATED",
    "WORKFLOW_APPOINTMENT_UPDATED",
    "WORKFLOW_QUOTE_CREATED",
    "WORKFLOW_QUOTE_SENT",
    "WORKFLOW_QUOTE_ACCEPTED",
    "WORKFLOW_WORK_STARTED",
    "WORKFLOW_MATERIALS_REQUESTED",
    "WORKFLOW_COMPLETION_SUBMITTED",
    "WORKFLOW_COMPLETION_CONFIRMED",
    "MESSAGE_CREATED",
    "UNKNOWN_WORKFLOW_EVENT",
  ]);
});

test("normalizes a canonical envelope without mutating payload", () => {
  const payload = { requestId: "request-1", detail: { value: "kept" } };
  const source = canonicalEvent({ payload });
  const event = normalizeWorkflowEvent(source);

  assert.deepEqual(Object.keys(event), REQUIRED_FIELDS);
  assert.equal(event.id, "event-1");
  assert.equal(event.actor, "user-1");
  assert.equal(event.recordedAt, "2026-06-13T12:00:00.000Z");
  assert.notStrictEqual(event.payload, payload);
  assert.notStrictEqual(event.payload.detail, payload.detail);
  assert.deepEqual(source.payload, payload);
});

test("normalizes supported optional canonical fields", () => {
  const event = normalizeWorkflowEvent(
    canonicalEvent({
      legacy: { originalType: "workflow_quote_sent" },
      metadata: { schemaVersion: 1 },
      migrationSource: "meetro-conversation-local",
    })
  );

  assert.deepEqual(Object.keys(event), [
    ...REQUIRED_FIELDS,
    ...OPTIONAL_FIELDS,
  ]);
  assert.deepEqual(event.metadata, { schemaVersion: 1 });
});

test("handles legacy aliases as non-canonical compatibility aliases", () => {
  const event = normalizeWorkflowEvent(
    {
      eventId: "legacy-event-1",
      workflowType: "workflow_quote_sent",
      projectId: "project-1",
      conversationId: "conversation-1",
      actorId: "legacy-user-1",
      senderRole: "business",
      occurredAt: "2026-06-13T12:00:00.000Z",
      payload: { quoteId: "quote-1" },
    },
    { source: "legacy-source" }
  );

  assert.equal(event.id, "legacy-event-1");
  assert.equal(event.actor, "legacy-user-1");
  assert.equal(event.recordedAt, "2026-06-13T12:00:00.000Z");
  assert.equal(event.eventId, event.id);
  assert.equal(event.actorId, event.actor);
  assert.ok(!Object.keys(event).includes("eventId"));
  assert.ok(!Object.keys(event).includes("actorId"));
  assert.ok(!Object.keys(event).includes("occurredAt"));
  assert.ok(
    event.warnings.some(
      (warning) => warning.code === "legacy-event-id-alias"
    )
  );
  assert.ok(
    event.warnings.some((warning) => warning.code === "legacy-actor-alias")
  );
  assert.ok(
    event.warnings.some(
      (warning) => warning.code === "legacy-recorded-at-alias"
    )
  );
});

test("does not treat actorName or timestamp alone as canonical fields", () => {
  const event = normalizeWorkflowEvent(
    {
      id: "legacy-2",
      type: "text",
      projectId: "project-2",
      conversationId: "conversation-2",
      actorName: "Display Name",
      actorRole: "homeowner",
      timestamp: "2026-06-13T12:00:00.000Z",
      payload: {},
    },
    { source: "legacy-source" }
  );

  assert.equal(event.actor, "");
  assert.equal(event.recordedAt, "2026-06-13T12:00:00.000Z");
  assert.ok(
    event.warnings.some(
      (warning) => warning.code === "missing-event-actor-id"
    )
  );
  assert.ok(
    event.warnings.some(
      (warning) => warning.code === "legacy-recorded-at-alias"
    )
  );
});

test("strict validation accepts the canonical envelope", () => {
  const event = canonicalEvent();

  assert.deepEqual(validateCanonicalWorkflowEvent(event), {
    ok: true,
    errors: [],
  });
  assert.equal(isCanonicalWorkflowEvent(event), true);
});

test("strict validation rejects aliases and unknown canonical writes", () => {
  const aliasOnly = {
    eventId: "event-legacy",
    eventType: "WORKFLOW_QUOTE_SENT",
    projectId: "project-1",
    conversationId: "conversation-1",
    actorId: "user-1",
    actorRole: "business",
    occurredAt: "2026-06-13T12:00:00.000Z",
    source: "quote-builder",
    payload: {},
  };
  const unknown = canonicalEvent({
    eventType: WORKFLOW_EVENT_TYPES.UNKNOWN_WORKFLOW_EVENT,
  });

  assert.equal(validateCanonicalWorkflowEvent(aliasOnly).ok, false);
  assert.equal(validateCanonicalWorkflowEvent(unknown).ok, false);
});

test("reports canonical fields and legacy coverage", () => {
  const report = getWorkflowEventContractReport(
    [
      canonicalEvent(),
      {
        eventId: "legacy-event-2",
        type: "text",
        requestId: "request-2",
        actorId: "user-2",
        senderRole: "homeowner",
        createdAt: "2026-06-13T12:01:00.000Z",
      },
    ],
    {
      source: "mixed",
      declaredTypes: ["workflow_change_request"],
      renderedTypes: ["workflow_change_request", "workflow_quote_sent"],
    }
  );

  assert.deepEqual(report.requiredFields, REQUIRED_FIELDS);
  assert.deepEqual(report.optionalFields, OPTIONAL_FIELDS);
  assert.equal(report.eventCount, 2);
  assert.equal(report.safeProjectIdentityCount, 2);
  assert.equal(report.immutableEventIdCount, 1);
  assert.equal(report.warningCounts["legacy-event-id-alias"], 1);
  assert.deepEqual(report.schemaDifferences.renderedButUndeclared, [
    "workflow_quote_sent",
  ]);
});
