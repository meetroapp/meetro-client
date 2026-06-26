import test from "node:test";
import assert from "node:assert/strict";

import { reconcileHistory } from "../src/utils/historyReconciliation.js";

test("assembles completion records and completion workflow events", () => {
  const history = reconcileHistory({
    completions: [
      {
        completionId: "completion-1",
        projectId: "project-1",
        completedAt: "2026-06-10T14:00:00.000Z",
        customer: "Customer One",
        status: "completed",
      },
    ],
    workflowEvents: [
      {
        id: "event-1",
        eventType: "WORKFLOW_COMPLETION_CONFIRMED",
        projectId: "project-2",
        recordedAt: "2026-06-11T14:00:00.000Z",
        payload: {
          completionId: "completion-2",
          customer: "Customer Two",
        },
      },
    ],
  });

  assert.equal(history.length, 2);
  assert.equal(history[0].completionId, "completion-2");
  assert.equal(history[0].status, "confirmed");
  assert.equal(history[1].customer, "Customer One");
});

test("keeps records with missing project identity visible", () => {
  const history = reconcileHistory({
    completions: [
      {
        completionId: "completion-missing-project",
        completedAt: "2026-06-10T14:00:00.000Z",
      },
    ],
  });

  assert.equal(history.length, 1);
  assert.equal(history[0].projectId, "");
  assert.equal(history[0].provenance.projectId.trust, "MISSING");
  assert.equal(history[0].provenance.quality, "LOW");
  assert.ok(
    history[0].provenance.warnings.some(
      (warning) => warning.code === "missing-project-identity"
    )
  );
});

test("merges duplicate records only by shared completion identity", () => {
  const history = reconcileHistory({
    completions: [
      {
        completionId: "completion-shared",
        projectId: "project-1",
        completedAt: "2026-06-10T14:00:00.000Z",
        status: "completed",
      },
      {
        completionId: "completion-shared",
        projectId: "project-1",
        completedAt: "2026-06-10T14:00:00.000Z",
        status: "awaiting_customer_confirmation",
      },
      {
        projectId: "project-1",
        completedAt: "2026-06-10T14:00:00.000Z",
        customer: "Unknown identity remains separate",
      },
    ],
  });

  assert.equal(history.length, 2);
  const duplicate = history.find(
    (record) => record.completionId === "completion-shared"
  );
  assert.equal(duplicate.sourceRecords.length, 2);
  assert.equal(duplicate.provenance.duplicateCount, 1);
  assert.equal(duplicate.status, "awaiting_confirmation");
});

test("orders dated history newest first and leaves undated records last", () => {
  const history = reconcileHistory({
    completions: [
      { completionId: "older", completedAt: "2026-06-10T12:00:00.000Z" },
      { completionId: "undated" },
      { completionId: "newer", completedAt: "2026-06-12T12:00:00.000Z" },
    ],
  });

  assert.deepEqual(
    history.map((record) => record.completionId),
    ["newer", "older", "undated"]
  );
  assert.equal(history[2].completionDate, "");
});

test("reports inferred and conflicting project provenance", () => {
  const history = reconcileHistory({
    completions: [
      {
        completionId: "completion-linked",
        requestId: "request-1",
        completedAt: "2026-06-10T12:00:00.000Z",
      },
      {
        completionId: "completion-conflict",
        projectId: "project-direct",
        conversationId: "conversation-1",
        completedAt: "2026-06-11T12:00:00.000Z",
      },
    ],
    projects: [{ projectId: "project-linked", requestId: "request-1" }],
    conversations: [
      { conversationId: "conversation-1", projectId: "project-linked" },
    ],
  });

  const linked = history.find(
    (record) => record.completionId === "completion-linked"
  );
  const conflict = history.find(
    (record) => record.completionId === "completion-conflict"
  );

  assert.equal(linked.projectId, "project-linked");
  assert.equal(linked.provenance.projectId.trust, "INFERRED");
  assert.equal(conflict.projectId, "project-direct");
  assert.equal(conflict.provenance.projectId.trust, "CONFLICTING");
});

test("does not mutate input records or source payloads", () => {
  const input = {
    completions: [
      {
        completionId: "completion-1",
        projectId: "project-1",
        completedAt: "2026-06-10T12:00:00.000Z",
        photos: [{ id: "photo-1" }],
      },
    ],
    workflowEvents: [],
    projects: [],
    conversations: [],
  };
  const original = structuredClone(input);
  const history = reconcileHistory(input);

  history[0].sourceRecords[0].record.photos[0].id = "changed";
  assert.deepEqual(input, original);
});
