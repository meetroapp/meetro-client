import test from "node:test";
import assert from "node:assert/strict";

import { normalizeConversationTimelineEvent } from "../src/utils/conversationTimelineReconciliation.js";
import { createWorkflowEvent } from "../src/utils/workflowEventFactory.js";
import {
  compareLegacyToFactoryEvent,
  WORKFLOW_EVENT_MIGRATION_RISK,
} from "../src/utils/workflowEventFactoryAudit.js";

function legacyQuote(overrides = {}) {
  return {
    eventId: "legacy-quote-event-1",
    type: "workflow_quote_sent",
    projectId: "project-1",
    conversationId: "conversation-1",
    senderId: "business-1",
    senderRole: "business",
    recordedAt: "2026-06-13T12:00:00.000Z",
    quoteId: "quote-1",
    amount: 250,
    ...overrides,
  };
}

function factoryFromLegacy(legacy, overrides = {}) {
  const normalized = normalizeConversationTimelineEvent(legacy, {
    source: "test",
  });

  const validFactoryEvent = createWorkflowEvent({
    id: normalized.id,
    eventType:
      normalized.eventType === "UNKNOWN_WORKFLOW_EVENT"
        ? "WORKFLOW_QUOTE_SENT"
        : normalized.eventType,
    projectId: normalized.projectId || "audit-project",
    conversationId: normalized.conversationId || "audit-conversation",
    actor:
      normalized.actor && normalized.actor !== "unknown"
        ? normalized.actor
        : "audit-actor",
    actorRole:
      normalized.actorRole && normalized.actorRole !== "unknown"
        ? normalized.actorRole
        : "business",
    recordedAt: normalized.recordedAt || "2026-06-13T12:00:00.000Z",
    source: "factory-audit",
    payload: normalized.payload,
    legacy: normalized.legacy,
  });

  return {
    ...validFactoryEvent,
    ...overrides,
  };
}

test("clean legacy quote event maps to LOW risk", () => {
  const legacy = legacyQuote();
  const audit = compareLegacyToFactoryEvent(
    legacy,
    factoryFromLegacy(legacy)
  );

  assert.equal(audit.migrationRisk, WORKFLOW_EVENT_MIGRATION_RISK.LOW);
  assert.deepEqual(audit.schemaGaps, []);
  assert.equal(audit.matchesEventType, true);
  assert.equal(audit.matchesId, true);
  assert.equal(audit.matchesProjectId, true);
  assert.equal(audit.matchesConversationId, true);
  assert.equal(audit.factoryContractValid, true);
  assert.deepEqual(audit.factoryValidationErrors, []);
});

test("missing actor invalidates the canonical envelope", () => {
  const legacy = legacyQuote({ senderId: undefined });
  const audit = compareLegacyToFactoryEvent(
    legacy,
    factoryFromLegacy(legacy, { actor: "" })
  );

  assert.equal(audit.hasActor, false);
  assert.ok(audit.schemaGaps.includes("missing-actor"));
  assert.equal(audit.factoryContractValid, false);
  assert.ok(audit.schemaGaps.includes("invalid-canonical-envelope"));
  assert.equal(audit.migrationRisk, WORKFLOW_EVENT_MIGRATION_RISK.HIGH);
});

test("missing recordedAt invalidates the canonical envelope", () => {
  const legacy = legacyQuote({ recordedAt: undefined });
  const audit = compareLegacyToFactoryEvent(
    legacy,
    factoryFromLegacy(legacy, { recordedAt: null })
  );

  assert.equal(audit.hasRecordedAt, false);
  assert.ok(audit.schemaGaps.includes("missing-recorded-at"));
  assert.equal(audit.migrationRisk, WORKFLOW_EVENT_MIGRATION_RISK.HIGH);
});

test("missing projectId maps to HIGH risk", () => {
  const legacy = legacyQuote({ projectId: undefined });
  const audit = compareLegacyToFactoryEvent(
    legacy,
    factoryFromLegacy(legacy, { projectId: "" })
  );

  assert.equal(audit.matchesProjectId, false);
  assert.ok(audit.schemaGaps.includes("missing-project-id"));
  assert.equal(audit.migrationRisk, WORKFLOW_EVENT_MIGRATION_RISK.HIGH);
});

test("unsupported eventType maps to HIGH risk", () => {
  const legacy = legacyQuote({ type: "workflow_future_event" });
  const audit = compareLegacyToFactoryEvent(
    legacy,
    factoryFromLegacy(legacy, {
      eventType: "UNKNOWN_WORKFLOW_EVENT",
      legacy: {
        unsupportedEventType: true,
      },
    })
  );

  assert.ok(audit.schemaGaps.includes("unsupported-event-type"));
  assert.equal(audit.migrationRisk, WORKFLOW_EVENT_MIGRATION_RISK.HIGH);
});

test("payload preservation check detects drift", () => {
  const legacy = legacyQuote();
  const audit = compareLegacyToFactoryEvent(
    legacy,
    factoryFromLegacy(legacy, {
      payload: { quoteId: "quote-1" },
    })
  );

  assert.equal(audit.payloadPreserved, false);
  assert.ok(audit.schemaGaps.includes("payload-not-preserved"));
  assert.equal(audit.migrationRisk, WORKFLOW_EVENT_MIGRATION_RISK.MEDIUM);
});

test("legacy preservation check detects missing metadata", () => {
  const legacy = legacyQuote({
    legacy: {
      sourceKey: "meetro_conversation_conversation-1",
      sourceIndex: 3,
    },
  });
  const factory = factoryFromLegacy(legacy);
  const audit = compareLegacyToFactoryEvent(legacy, {
    ...factory,
    legacy: {
      ...factory.legacy,
      sourceKey: undefined,
    },
  });

  assert.equal(audit.legacyPreserved, false);
  assert.ok(audit.schemaGaps.includes("legacy-not-preserved"));
  assert.equal(audit.migrationRisk, WORKFLOW_EVENT_MIGRATION_RISK.MEDIUM);
});

test("input objects are not mutated", () => {
  const legacy = legacyQuote();
  const factory = factoryFromLegacy(legacy);
  const originalLegacy = structuredClone(legacy);
  const originalFactory = structuredClone(factory);

  compareLegacyToFactoryEvent(legacy, factory);

  assert.deepEqual(legacy, originalLegacy);
  assert.deepEqual(factory, originalFactory);
});
