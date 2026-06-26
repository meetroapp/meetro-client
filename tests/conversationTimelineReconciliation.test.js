import test from "node:test";
import assert from "node:assert/strict";

import {
  getConversationTimelineReconciliationReport,
  getConversationTimelineSources,
} from "../src/utils/conversationTimelineSelectors.js";

function createStorage(seed = {}) {
  const data = new Map(
    Object.entries(seed).map(([key, value]) => [key, String(value)])
  );
  let writeCount = 0;

  return {
    get length() {
      return data.size;
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem() {
      writeCount += 1;
    },
    removeItem() {
      writeCount += 1;
    },
    getWriteCount() {
      return writeCount;
    },
  };
}

test("reads all requested source families without storage writes", () => {
  const storage = createStorage({
    meetro_conversation_c1: JSON.stringify([
      { eventId: "message-1", type: "text", conversationId: "c1" },
      {
        eventId: "quote-event-1",
        type: "workflow_quote_sent",
        conversationId: "c1",
        quoteId: "quote-1",
      },
    ]),
    meetro_job_record_c1: JSON.stringify([
      { eventId: "job-event-1", type: "job_note" },
    ]),
    meetroWorkflowTimeline: JSON.stringify([
      { eventId: "legacy-1", type: "work.status_changed" },
    ]),
    meetroProjectTimelineEvents: JSON.stringify([
      {
        projectId: "project-1",
        createdAt: "2026-06-13T12:00:00.000Z",
        event: { eventId: "shadow-1", type: "work.status_changed" },
      },
    ]),
  });

  const sources = getConversationTimelineSources({
    storage,
    backendMessages: [{ id: 41, type: "text", conversationId: "c1" }],
  });

  assert.equal(sources.conversationMessages.length, 1);
  assert.equal(sources.workflowCards.length, 1);
  assert.equal(sources.backendMessages.length, 1);
  assert.equal(sources.legacyTimelineEvents.length, 1);
  assert.equal(sources.jobRecordEvents.length, 1);
  assert.equal(sources.shadowTimelineEvents.length, 1);
  assert.equal(storage.getWriteCount(), 0);
});

test("deduplicates only immutable event ids across sources", () => {
  const storage = createStorage({
    meetro_conversation_c1: JSON.stringify([
      { backendId: 8, type: "text", conversationId: "c1" },
    ]),
  });
  const report = getConversationTimelineReconciliationReport({
    storage,
    backendMessages: [{ id: 8, message_type: "text", conversationId: "c1" }],
  });

  assert.equal(report.duplicateGroupCount, 1);
  assert.equal(report.uniqueReconciliationKeyCount, 1);
  assert.deepEqual(report.duplicateGroups[0].sources, [
    "backend-message",
    "conversation-message",
  ]);
});

test("deduplicates canonical contract ids across sources", () => {
  const canonicalEvent = {
    id: "canonical-event-1",
    eventType: "WORKFLOW_QUOTE_SENT",
    projectId: "project-1",
    conversationId: "conversation-1",
    actor: "user-1",
    actorRole: "business",
    recordedAt: "2026-06-14T12:00:00.000Z",
    source: "quote-builder",
    payload: {},
  };
  const storage = createStorage({
    meetro_conversation_conversation1: JSON.stringify([canonicalEvent]),
    meetroWorkflowTimeline: JSON.stringify([canonicalEvent]),
  });
  const report = getConversationTimelineReconciliationReport({ storage });

  assert.equal(report.duplicateGroupCount, 1);
  assert.equal(
    report.duplicateGroups[0].reconciliationKey,
    "event:canonical-event-1"
  );
});

test("does not treat matching generic legacy ids as immutable event ids", () => {
  const storage = createStorage({
    meetro_conversation_c1: JSON.stringify([
      { id: "generic-1", type: "text", conversationId: "c1" },
    ]),
    projectTimeline: JSON.stringify([
      { id: "generic-1", type: "text", conversationId: "c1" },
    ]),
  });
  const report = getConversationTimelineReconciliationReport({ storage });

  assert.equal(report.duplicateGroupCount, 0);
  assert.equal(report.unsafeEventCount, 2);
});

test("deduplicates an approved stable entity and event pair", () => {
  const storage = createStorage({
    meetro_conversation_c1: JSON.stringify([
      {
        type: "workflow_quote_sent",
        quoteId: "quote-1",
        conversationId: "c1",
      },
    ]),
    projectTimeline: JSON.stringify([
      {
        type: "workflow_quote_sent",
        quoteId: "quote-1",
        requestId: "request-1",
      },
    ]),
  });
  const report = getConversationTimelineReconciliationReport({ storage });

  assert.equal(report.duplicateGroupCount, 1);
  assert.match(report.duplicateGroups[0].reconciliationKey, /^entity:quote:/);
});

test("does not deduplicate by text, title, customer, or display time", () => {
  const storage = createStorage({
    meetro_conversation_c1: JSON.stringify([
      {
        id: "local-1",
        type: "text",
        text: "private content",
        title: "Same",
        customer: "Same",
        time: "9:42 AM",
      },
      {
        id: "local-2",
        type: "text",
        text: "private content",
        title: "Same",
        customer: "Same",
        time: "9:42 AM",
      },
    ]),
  });
  const report = getConversationTimelineReconciliationReport({ storage });

  assert.equal(report.duplicateGroupCount, 0);
  assert.equal(report.unsafeEventCount, 2);
  assert.equal(JSON.stringify(report).includes("private content"), false);
});

test("does not infer project identity from conversation id without a link", () => {
  const unlinkedStorage = createStorage({
    meetro_conversation_c1: JSON.stringify([
      { eventId: "message-1", type: "text", conversationId: "c1" },
    ]),
  });
  const linkedStorage = createStorage({
    meetro_conversation_c1: JSON.stringify([
      { eventId: "message-1", type: "text", conversationId: "c1" },
    ]),
    meetroProjectLinks: JSON.stringify([
      {
        commandId: "link-1",
        commandType: "linkConversationToProject",
        conversationId: "c1",
        projectId: "project-1",
      },
    ]),
  });

  const unlinked = getConversationTimelineSources({
    storage: unlinkedStorage,
  });
  const linked = getConversationTimelineSources({ storage: linkedStorage });

  assert.equal(unlinked.conversationMessages[0].projectId, "");
  assert.equal(linked.conversationMessages[0].projectId, "project-1");
});

test("reports conflicting conversation links without choosing a project", () => {
  const storage = createStorage({
    meetro_conversation_c1: JSON.stringify([
      { eventId: "message-1", type: "text", conversationId: "c1" },
    ]),
    meetroProjectLinks: JSON.stringify([
      {
        commandId: "link-1",
        commandType: "linkConversationToProject",
        conversationId: "c1",
        projectId: "project-1",
      },
      {
        commandId: "link-2",
        commandType: "linkConversationToProject",
        conversationId: "c1",
        projectId: "project-2",
      },
    ]),
  });
  const report = getConversationTimelineReconciliationReport({ storage });

  assert.equal(report.conversationProjectLinkConflictCount, 1);
  assert.equal(report.missingProjectIdentityCount, 1);
  assert.deepEqual(report.conversationProjectLinkConflicts[0].projectIds, [
    "project-1",
    "project-2",
  ]);
});

test("reports shadow coverage without exposing payload content", () => {
  const storage = createStorage({
    projectTimeline: JSON.stringify([
      {
        eventId: "event-1",
        type: "workflow_completion_closeout",
        requestId: "request-1",
        text: "sensitive completion details",
      },
      {
        eventId: "event-2",
        type: "work.status_changed",
        requestId: "request-1",
      },
    ]),
    meetroProjectTimelineEvents: JSON.stringify([
      {
        projectId: "request-1",
        event: {
          eventId: "event-1",
          type: "workflow_completion_closeout",
          text: "sensitive completion details",
        },
      },
    ]),
  });
  const report = getConversationTimelineReconciliationReport({ storage });

  assert.equal(report.reconcilableLegacyEventCount, 2);
  assert.equal(report.shadowedLegacyEventCount, 1);
  assert.equal(report.shadowCoveragePercentage, 50);
  assert.equal(
    JSON.stringify(report).includes("sensitive completion details"),
    false
  );
});
