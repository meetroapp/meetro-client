import test from "node:test";
import assert from "node:assert/strict";

import { getConversationTimelineAudit } from "../src/utils/conversationTimelineAudit.js";
import { reconcileConversationTimelineEvents } from "../src/utils/conversationTimelineReconciliation.js";

function normalizedEvent(overrides = {}) {
  return {
    id: "event-1",
    eventType: "MESSAGE_CREATED",
    projectId: "",
    conversationId: "conversation-1",
    actor: "user-1",
    actorRole: "homeowner",
    recordedAt: "2026-06-13T12:00:00.000Z",
    source: "test",
    payload: {},
    legacy: {
      isLegacy: false,
      originalEventType: "message",
      missingFields: [],
      warnings: [],
      dedupeKey: "event:event-1",
      duplicateSources: [],
    },
    ...overrides,
  };
}

test("reports matching legacy and shadow counts", () => {
  const audit = getConversationTimelineAudit(
    [{ id: "legacy-1" }, { id: "legacy-2" }],
    [
      normalizedEvent(),
      normalizedEvent({
        id: "event-2",
        legacy: {
          ...normalizedEvent().legacy,
          dedupeKey: "event:event-2",
        },
      }),
    ]
  );

  assert.equal(audit.legacyCount, 2);
  assert.equal(audit.shadowCount, 2);
  assert.equal(audit.duplicateCandidates, 0);
});

test("exposes count mismatches without changing either collection", () => {
  const legacy = [{ id: "legacy-1" }, { id: "legacy-2" }];
  const shadow = [normalizedEvent()];
  const audit = getConversationTimelineAudit(legacy, shadow);

  assert.equal(audit.legacyCount, 2);
  assert.equal(audit.shadowCount, 1);
  assert.equal(legacy.length, 2);
  assert.equal(shadow.length, 1);
});

test("detects duplicate candidates removed by reconciliation", () => {
  const legacy = [
    {
      eventId: "same-event",
      type: "message",
      senderId: "user-1",
      senderRole: "homeowner",
      recordedAt: "2026-06-13T12:00:00.000Z",
    },
    {
      eventId: "same-event",
      type: "message",
      senderId: "user-1",
      senderRole: "homeowner",
      recordedAt: "2026-06-13T12:00:00.000Z",
    },
  ];
  const shadow = reconcileConversationTimelineEvents(
    legacy.map((event) => ({ source: "test", event }))
  );
  const audit = getConversationTimelineAudit(legacy, shadow);

  assert.equal(audit.legacyCount, 2);
  assert.equal(audit.shadowCount, 1);
  assert.equal(audit.duplicateCandidates, 1);
});

test("detects missing actors", () => {
  const audit = getConversationTimelineAudit(
    [{}],
    [
      normalizedEvent({
        actor: "unknown",
        legacy: {
          ...normalizedEvent().legacy,
          missingFields: ["actor"],
        },
      }),
    ]
  );

  assert.equal(audit.missingActorCount, 1);
});

test("detects missing timestamps", () => {
  const audit = getConversationTimelineAudit(
    [{}],
    [
      normalizedEvent({
        recordedAt: null,
        legacy: {
          ...normalizedEvent().legacy,
          missingFields: ["recordedAt"],
        },
      }),
    ]
  );

  assert.equal(audit.missingTimestampCount, 1);
});

test("counts malformed shadow records and supplied normalization failures", () => {
  const audit = getConversationTimelineAudit([{}], [{}], {
    normalizationErrors: 1,
  });

  assert.equal(audit.normalizationErrors, 2);
});

test("accepts canonical required fields with reconciliation metadata", () => {
  const audit = getConversationTimelineAudit(
    [{}],
    [normalizedEvent()]
  );

  assert.equal(audit.normalizationErrors, 0);
});
