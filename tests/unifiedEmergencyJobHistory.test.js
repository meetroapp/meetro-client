import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  isSameUnifiedHistoryJob,
  normalizeEmergencyClosedJob,
  upsertUnifiedClosedJob,
} from "../src/utils/unifiedJobHistory.js";
import {
  getCompletedWorkItems,
  getWorkCenterSummary,
} from "../src/utils/workCenterSelectors.js";

function createStorage(seed = {}) {
  const values = new Map(
    Object.entries(seed).map(([key, value]) => [key, String(value)])
  );

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function emergencyClosedRecord(overrides = {}) {
  const completionRecord = {
    id: "completion-sarah-1",
    completionId: "completion-sarah-1",
    emergencyRequestId: "emergency-sarah-1",
    conversationId: "conversation-sarah",
    completedAt: "2026-07-09T18:00:00.000Z",
    completionNotes: "Leak repaired and tested.",
    completionPhotos: [{ id: "photo-1", dataUrl: "data:image/jpeg;base64,a" }],
    timelineEvents: [{ id: "event-1", label: "Work completed" }],
    ...overrides.completionRecord,
  };

  return normalizeEmergencyClosedJob({
    emergencyRecord: {
      id: "emergency-sarah-1",
      customerId: "customer-sarah",
      customerName: "Sarah",
      service: "Emergency Plumbing",
      location: "101 Palm Ave",
      total: 780,
      paymentStatus: "paid",
      quote: { quoteId: "quote-sarah", amount: 780 },
      invoice: { id: "invoice-sarah", receipt: { status: "sent" } },
      workflowDependencyHistory: [{ id: "dependency-1" }],
      ...overrides.emergencyRecord,
    },
    completionRecord,
    conversationId: completionRecord.conversationId,
    closedAt: "2026-07-09T19:00:00.000Z",
    closureNotes: "Customer confirmed completion.",
  });
}

test("normalizes a closed emergency job into unified read-only history", () => {
  const record = emergencyClosedRecord();

  assert.equal(record.status, "closed");
  assert.equal(record.sourceType, "emergency");
  assert.equal(record.sourceLabel, "Emergency");
  assert.equal(record.readOnlyHistory, true);
  assert.equal(record.readOnly, true);
  assert.equal(record.emergencyRequestId, "emergency-sarah-1");
  assert.equal(record.jobId, "emergency-sarah-1");
  assert.equal(record.customerId, "customer-sarah");
  assert.equal(record.revenue, 780);
  assert.equal(record.amount, 780);
  assert.equal(record.completion.notes, "Leak repaired and tested.");
  assert.equal(record.photos.length, 1);
  assert.equal(record.quote.quoteId, "quote-sarah");
  assert.equal(record.receipt.status, "sent");
  assert.equal(record.workflowDependencyHistory.length, 1);
});

test("closure and refresh hydration replace the emergency completion without duplication", () => {
  const pendingCompletion = {
    id: "completion-sarah-1",
    completionId: "completion-sarah-1",
    emergencyRequestId: "emergency-sarah-1",
    status: "awaiting_customer_confirmation",
    revenue: 780,
  };
  const closedRecord = emergencyClosedRecord();
  const once = upsertUnifiedClosedJob([pendingCompletion], closedRecord);
  const twice = upsertUnifiedClosedJob(once, closedRecord);

  assert.equal(once.length, 1);
  assert.equal(twice.length, 1);
  assert.equal(twice[0].status, "closed");
  assert.equal(twice[0].revenue, 780);
});

test("unified history keeps emergency jobs scoped by stable identity", () => {
  const sarah = emergencyClosedRecord();
  const william = emergencyClosedRecord({
    emergencyRecord: {
      id: "emergency-william-1",
      customerId: "customer-william",
      customerName: "William",
    },
    completionRecord: {
      id: "completion-william-1",
      completionId: "completion-william-1",
      emergencyRequestId: "emergency-william-1",
      conversationId: "conversation-william",
    },
  });
  const jack = emergencyClosedRecord({
    emergencyRecord: {
      id: "emergency-jack-1",
      customerId: "customer-jack",
      customerName: "Jack",
    },
    completionRecord: {
      id: "completion-jack-1",
      completionId: "completion-jack-1",
      emergencyRequestId: "emergency-jack-1",
      conversationId: "conversation-jack",
    },
  });
  const history = [sarah, william, jack].reduce(
    (records, record) => upsertUnifiedClosedJob(records, record),
    []
  );

  assert.equal(history.length, 3);
  assert.equal(isSameUnifiedHistoryJob(sarah, william), false);
  assert.deepEqual(
    new Set(history.map((record) => record.customerId)),
    new Set(["customer-sarah", "customer-william", "customer-jack"])
  );
});

test("standard closed history remains compatible with the unified upsert", () => {
  const standard = {
    id: "standard-history-1",
    jobId: "standard-job-1",
    sourceType: "standard",
    status: "closed",
    readOnlyHistory: true,
  };
  const updated = upsertUnifiedClosedJob([standard], {
    ...standard,
    closureNotes: "Final walkthrough complete.",
  });

  assert.equal(updated.length, 1);
  assert.equal(updated[0].sourceType, "standard");
  assert.equal(updated[0].closureNotes, "Final walkthrough complete.");
});

test("Revenue and Job History resolve the same single emergency record", () => {
  const previousStorage = globalThis.localStorage;
  const closedRecord = emergencyClosedRecord();
  globalThis.localStorage = createStorage({
    completedProjects: JSON.stringify([closedRecord]),
    completedJobsCount: "1",
    totalJobRevenue: "780",
  });

  try {
    const completedItems = getCompletedWorkItems();
    const summary = getWorkCenterSummary();

    assert.equal(completedItems.length, 1);
    assert.equal(completedItems[0].emergencyRequestId, "emergency-sarah-1");
    assert.equal(summary.completedJobsCount, 1);
    assert.equal(summary.totalJobRevenue, 780);
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test("emergency closure action writes through the unified history pipeline", () => {
  const source = fs.readFileSync(
    new URL("../src/pages/EmergencyCompletionActions.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /normalizeEmergencyClosedJob/);
  assert.match(source, /upsertUnifiedClosedJob\(completedProjects, closedHistoryRecord\)/);
  assert.match(source, /localStorage\.setItem\(\s*"completedProjects"/);
});

test("Work Center history is source-aware and remains read-only", () => {
  const source = fs.readFileSync(
    new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /job\.history\?\.sourceType === "emergency"/);
  assert.match(source, />Emergency<\/span>/);
  assert.match(source, /isJobHistoryMode/);
  assert.match(source, /Review Job Report/);
  assert.match(source, /Print Job Report/);
});
