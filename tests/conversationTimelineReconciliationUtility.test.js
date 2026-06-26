import test from "node:test";
import assert from "node:assert/strict";

import {
  CONVERSATION_EVENT_TYPES,
  normalizeConversationTimelineEvent,
  reconcileConversationTimelineEvents,
} from "../src/utils/conversationTimelineReconciliation.js";
import { isCanonicalWorkflowEvent } from "../src/utils/workflowEventContract.js";

test("passes canonical events through the canonical read shape", () => {
  const source = {
    id: "canonical-event-1",
    eventType: "WORKFLOW_QUOTE_SENT",
    projectId: "project-1",
    conversationId: "conversation-1",
    actor: "business-1",
    actorRole: "business",
    recordedAt: "2026-06-13T09:00:00.000Z",
    source: "quote-builder",
    payload: { quoteId: "quote-1" },
  };
  const normalized = normalizeConversationTimelineEvent(source);

  assert.equal(isCanonicalWorkflowEvent(normalized), true);
  assert.deepEqual(normalized.payload, source.payload);
  assert.notStrictEqual(normalized.payload, source.payload);
  assert.equal(normalized.legacy.isLegacy, false);
});

test("normalizes a legacy quote event", () => {
  const source = {
    eventId: "quote-event-1",
    type: "workflow_quote_sent",
    quoteId: "quote-1",
    projectId: "project-1",
    conversationId: "conversation-1",
    senderId: "business-1",
    senderRole: "business",
    createdAt: "2026-06-13T10:00:00.000Z",
    quoteNumber: "Q-100",
  };
  const normalized = normalizeConversationTimelineEvent(source, {
    source: "conversation",
  });

  assert.equal(
    normalized.eventType,
    CONVERSATION_EVENT_TYPES.WORKFLOW_QUOTE_SENT
  );
  assert.equal(normalized.id, "quote-event-1");
  assert.equal(normalized.projectId, "project-1");
  assert.equal(normalized.payload.quoteNumber, "Q-100");
  assert.equal(source.eventType, undefined);
  assert.equal(normalized.legacy.isLegacy, true);
  assert.equal(normalized.legacy.originalId, "quote-event-1");
});

test("normalizes an appointment event", () => {
  const normalized = normalizeConversationTimelineEvent(
    {
      eventId: "appointment-event-1",
      type: "appointment.rescheduled",
      appointmentId: "appointment-1",
      recordedAt: "2026-06-13T11:00:00.000Z",
    },
    { source: "job-record" }
  );

  assert.equal(
    normalized.eventType,
    CONVERSATION_EVENT_TYPES.WORKFLOW_APPOINTMENT_UPDATED
  );
});

test("uses a null recordedAt fallback without inventing time", () => {
  const normalized = normalizeConversationTimelineEvent(
    { eventId: "event-1", type: "message" },
    { source: "conversation" }
  );

  assert.equal(normalized.recordedAt, null);
  assert.ok(normalized.legacy.missingFields.includes("recordedAt"));
});

test("uses explicit unknown actor fallbacks", () => {
  const normalized = normalizeConversationTimelineEvent(
    { eventId: "event-2", type: "message" },
    { source: "conversation" }
  );

  assert.equal(normalized.actor, "unknown");
  assert.equal(normalized.actorRole, "unknown");
});

test("sorts valid timestamps stably and leaves undated events last", () => {
  const reconciled = reconcileConversationTimelineEvents([
    {
      source: "legacy",
      event: {
        eventId: "later",
        type: "message",
        recordedAt: "2026-06-13T12:00:00.000Z",
      },
    },
    {
      source: "legacy",
      event: {
        eventId: "undated-1",
        type: "message",
      },
    },
    {
      source: "legacy",
      event: {
        eventId: "earlier",
        type: "message",
        recordedAt: "2026-06-13T10:00:00.000Z",
      },
    },
    {
      source: "legacy",
      event: {
        eventId: "undated-2",
        type: "message",
      },
    },
  ]);

  assert.deepEqual(
    reconciled.map((event) => event.id),
    ["earlier", "later", "undated-1", "undated-2"]
  );
});

test("protects against duplicates using immutable or stable entity identity", () => {
  const reconciled = reconcileConversationTimelineEvents([
    {
      source: "conversation",
      event: {
        eventId: "same-event",
        type: "workflow_quote_sent",
        quoteId: "quote-1",
      },
    },
    {
      source: "backend",
      event: {
        eventId: "same-event",
        type: "workflow_quote_sent",
        quoteId: "quote-1",
      },
    },
    {
      source: "legacy-timeline",
      event: {
        type: "workflow_quote_sent",
        quoteId: "quote-2",
      },
    },
    {
      source: "shadow",
      event: {
        type: "quote.sent",
        quoteId: "quote-2",
      },
    },
  ]);

  assert.equal(reconciled.length, 2);
  assert.deepEqual(reconciled[0].legacy.duplicateSources, ["backend"]);
  assert.deepEqual(reconciled[1].legacy.duplicateSources, ["shadow"]);
});

test("prefers canonical id deduplication without mutating canonical input", () => {
  const first = {
    id: "canonical-same-event",
    eventType: "MESSAGE_CREATED",
    projectId: "project-1",
    conversationId: "conversation-1",
    actor: "user-1",
    actorRole: "homeowner",
    recordedAt: "2026-06-13T12:00:00.000Z",
    source: "conversation-thread",
    payload: { messageId: "message-1" },
  };
  const second = structuredClone(first);
  const originalFirst = structuredClone(first);
  const reconciled = reconcileConversationTimelineEvents([
    { source: "conversation", event: first },
    { source: "backend", event: second },
  ]);

  assert.equal(reconciled.length, 1);
  assert.deepEqual(reconciled[0].legacy.duplicateSources, ["backend"]);
  assert.deepEqual(first, originalFirst);
});

test("preserves unknown workflow events", () => {
  const normalized = normalizeConversationTimelineEvent(
    {
      type: "workflow_future_event",
      customField: "preserved",
    },
    { source: "legacy", index: 4 }
  );

  assert.equal(
    normalized.eventType,
    CONVERSATION_EVENT_TYPES.UNKNOWN_WORKFLOW_EVENT
  );
  assert.equal(normalized.id, "legacy:legacy:4");
  assert.equal(normalized.payload.customField, "preserved");
  assert.equal(normalized.legacy.originalEventType, "workflow_future_event");
});
