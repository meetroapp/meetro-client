import test from "node:test";
import assert from "node:assert/strict";

import { reconcileHistory } from "../src/utils/historyReconciliation.js";
import { compareWorkCenterHistory } from "../src/utils/workCenterHistoryShadowAdapter.js";
import { adaptWorkCenterHistorySources } from "../src/utils/workCenterHistorySourceAdapter.js";
import { adaptReconciledHistoryToWorkCenterPresentation } from "../src/utils/workCenterHistoryPresentationAdapter.js";

test("converts a completed schedule record into reconciliation input", () => {
  const adapted = adaptWorkCenterHistorySources({
    scheduleRecords: [
      {
        id: "schedule-1",
        status: "Completed",
        title: "HVAC repair",
        location: "Cape Coral",
        amount: 250,
      },
      { id: "schedule-active", status: "Scheduled" },
    ],
  });

  assert.equal(adapted.reconciliationInput.completions.length, 1);
  assert.equal(
    adapted.reconciliationInput.completions[0].source,
    "meetro_business_schedule"
  );
  assert.equal(
    adapted.reconciliationInput.completions[0].record.customer,
    "Cape Coral"
  );
  assert.equal(adapted.legacyHistory[0].revenue, 250);
});

test("converts a completedProjects record into reconciliation input", () => {
  const adapted = adaptWorkCenterHistorySources({
    completedProjects: [
      {
        id: "completed-1",
        title: "Kitchen repair",
        completedAt: "2026-06-10T12:00:00.000Z",
      },
    ],
  });

  assert.equal(adapted.reconciliationInput.completions.length, 1);
  assert.equal(
    adapted.reconciliationInput.completions[0].source,
    "completedProjects"
  );
  assert.equal(
    adapted.sourceMetadata[0].sourceLocalIdentity,
    "completed-1"
  );
});

test("converts completed homeowner requests and excludes legacy duplicates", () => {
  const adapted = adaptWorkCenterHistorySources({
    completedProjects: [{ id: "request-duplicate" }],
    homeownerRequests: [
      {
        requestId: "request-1",
        status: "completed",
        acceptedQuote: { amount: 400 },
      },
      {
        requestId: "request-duplicate",
        status: "completed",
      },
      {
        requestId: "request-active",
        status: "active",
      },
    ],
  });

  assert.equal(adapted.sourceSummary.homeownerRequestCount, 1);
  assert.equal(adapted.sourceSummary.excludedHomeownerDuplicateCount, 1);
  assert.equal(adapted.legacyHistory[1].requestId, "request-1");
  assert.equal(adapted.legacyHistory[1].revenue, 400);
});

test("preserves source labels and legacy bucket ordering metadata", () => {
  const adapted = adaptWorkCenterHistorySources({
    scheduleRecords: [{ id: "schedule-1", status: "Completed" }],
    completedProjects: [{ id: "completed-1" }],
    homeownerRequests: [
      { requestId: "request-1", status: "completed" },
    ],
  });

  assert.deepEqual(
    adapted.sourceMetadata.map((entry) => entry.source),
    [
      "meetro_business_schedule",
      "completedProjects",
      "homeownerRequests",
    ]
  );
  assert.deepEqual(
    adapted.sourceMetadata.map((entry) => entry.legacyOrder),
    [0, 1, 2]
  );
});

test("presentation adapter produces current Work Center card fields", () => {
  const adapted = adaptWorkCenterHistorySources({
    completedProjects: [
      {
        completionId: "completion-1",
        projectId: "project-1",
        title: "Bathroom repair",
        homeownerName: "Alex",
        category: "Handyman",
        location: "Fort Myers",
        status: "completed",
        completedAt: "2026-06-10T12:00:00.000Z",
      },
    ],
  });
  const reconciled = reconcileHistory(adapted.reconciliationInput);
  const cards =
    adaptReconciledHistoryToWorkCenterPresentation(reconciled);

  assert.equal(cards[0].title, "Bathroom repair");
  assert.equal(cards[0].customer, "Alex");
  assert.equal(cards[0].category, "Handyman");
  assert.equal(cards[0].statusLabel, "Completed");
  assert.equal(cards[0].completedAt, "2026-06-10T12:00:00.000Z");
  assert.equal(cards[0].sourceLabel, "completedProjects");
  assert.equal(
    cards[0].legacyDetailReference.record.title,
    "Bathroom repair"
  );
});

test("presentation precedence favors completedProjects for detail safety", () => {
  const reconciled = reconcileHistory({
    completions: [
      {
        source: "meetro_business_schedule",
        record: {
          completionId: "completion-shared",
          projectId: "project-1",
          title: "Schedule title",
          status: "completed",
        },
      },
      {
        source: "completedProjects",
        record: {
          completionId: "completion-shared",
          projectId: "project-1",
          title: "Completion detail title",
          status: "completed",
        },
      },
    ],
  });
  const [card] =
    adaptReconciledHistoryToWorkCenterPresentation(reconciled);

  assert.equal(card.title, "Completion detail title");
  assert.equal(card.sourceLabel, "completedProjects");
});

test("reports missing customer and project identity instead of hiding them", () => {
  const reconciled = reconcileHistory({
    completions: [
      {
        source: "completedProjects",
        record: {
          completionId: "completion-1",
          title: "Unlinked completion",
          status: "completed",
        },
      },
    ],
  });
  const [card] =
    adaptReconciledHistoryToWorkCenterPresentation(reconciled);

  assert.equal(card.customer, "");
  assert.equal(card.projectId, "");
  assert.equal(card.fieldCoverage.customer, false);
  assert.equal(card.fieldCoverage.projectId, false);
  assert.ok(
    card.warnings.some(
      (warning) => warning.code === "missing-customer-label"
    )
  );
  assert.ok(
    card.warnings.some(
      (warning) => warning.code === "missing-project-identity"
    )
  );
});

test("shadow comparison detects count drift from an extra reconciled record", () => {
  const report = compareWorkCenterHistory({
    legacyHistory: [
      {
        completionId: "completion-1",
        projectId: "project-1",
        status: "completed",
      },
    ],
    reconciledHistory: [
      {
        completionId: "completion-1",
        projectId: "project-1",
        status: "completed",
      },
      {
        completionId: "completion-2",
        projectId: "project-2",
        status: "completed",
      },
    ],
  });

  assert.equal(report.parity.uniqueLegacyCount, 1);
  assert.equal(report.parity.uniqueReconciledCount, 2);
  assert.equal(report.extraRecords.length, 1);
});

test("source harness exposes ordering drift after reconciliation sorting", () => {
  const adapted = adaptWorkCenterHistorySources({
    scheduleRecords: [
      {
        completionId: "schedule-completion",
        projectId: "project-1",
        status: "Completed",
        completedAt: "2026-06-09T12:00:00.000Z",
      },
    ],
    completedProjects: [
      {
        completionId: "saved-completion",
        projectId: "project-2",
        status: "completed",
        completedAt: "2026-06-11T12:00:00.000Z",
      },
    ],
  });
  const reconciled = reconcileHistory(adapted.reconciliationInput);
  const report = compareWorkCenterHistory({
    legacyHistory: adapted.legacyHistory,
    reconciledHistory: reconciled,
  });

  assert.equal(report.orderingDifferences.length, 2);
  assert.deepEqual(
    reconciled.map((record) => record.completionId),
    ["saved-completion", "schedule-completion"]
  );
});

test("source and presentation adapters do not mutate inputs", () => {
  const sourceInput = {
    completedProjects: [
      {
        completionId: "completion-1",
        projectId: "project-1",
        status: "completed",
        nested: { value: 1 },
      },
    ],
  };
  const sourceOriginal = structuredClone(sourceInput);
  const adapted = adaptWorkCenterHistorySources(sourceInput);
  const reconciled = reconcileHistory(adapted.reconciliationInput);
  const reconciledOriginal = structuredClone(reconciled);
  const cards =
    adaptReconciledHistoryToWorkCenterPresentation(reconciled);

  cards[0].legacyDetailReference.record.nested.value = 2;
  assert.deepEqual(sourceInput, sourceOriginal);
  assert.deepEqual(reconciled, reconciledOriginal);
});
