import test from "node:test";
import assert from "node:assert/strict";

import { compareWorkCenterHistory } from "../src/utils/workCenterHistoryShadowAdapter.js";

function reconciledRecord(overrides = {}) {
  return {
    id: "history:completion-1",
    completionId: "completion-1",
    projectId: "project-1",
    status: "completed",
    provenance: {
      quality: "HIGH",
      projectId: { trust: "AUTHORITATIVE", source: "record" },
      completionId: {
        trust: "AUTHORITATIVE",
        source: "completion-identity",
      },
    },
    sourceRecords: [],
    ...overrides,
  };
}

test("reports exact parity for matching history", () => {
  const report = compareWorkCenterHistory({
    legacyHistory: [
      {
        completionId: "completion-1",
        projectId: "project-1",
        status: "Completed",
      },
    ],
    reconciledHistory: [reconciledRecord()],
  });

  assert.equal(report.parity.exact, true);
  assert.equal(report.parity.score, 100);
  assert.equal(report.parity.coveragePercentage, 100);
  assert.deepEqual(report.missingRecords, []);
  assert.deepEqual(report.extraRecords, []);
});

test("reports deterministic ordering differences", () => {
  const report = compareWorkCenterHistory({
    legacyHistory: [
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
    reconciledHistory: [
      reconciledRecord({
        id: "history:completion-2",
        completionId: "completion-2",
        projectId: "project-2",
      }),
      reconciledRecord(),
    ],
  });

  assert.deepEqual(
    report.orderingDifferences.map((difference) => difference.identity),
    ["completion-1", "completion-2"]
  );
  assert.equal(report.parity.score, 85);
});

test("reports legacy records missing from reconciliation", () => {
  const report = compareWorkCenterHistory({
    legacyHistory: [
      { completionId: "completion-1", projectId: "project-1" },
      { completionId: "completion-2", projectId: "project-2" },
    ],
    reconciledHistory: [reconciledRecord()],
  });

  assert.deepEqual(
    report.missingRecords.map((record) => record.identity),
    ["completion-2"]
  );
  assert.equal(report.extraRecords.length, 0);
  assert.equal(report.parity.coveragePercentage, 50);
});

test("reports reconciled records not present in legacy history", () => {
  const report = compareWorkCenterHistory({
    legacyHistory: [
      { completionId: "completion-1", projectId: "project-1" },
    ],
    reconciledHistory: [
      reconciledRecord(),
      reconciledRecord({
        id: "history:completion-2",
        completionId: "completion-2",
        projectId: "project-2",
      }),
    ],
  });

  assert.deepEqual(
    report.extraRecords.map((record) => record.identity),
    ["completion-2"]
  );
  assert.equal(report.missingRecords.length, 0);
});

test("reports duplicate records without treating copies as missing", () => {
  const report = compareWorkCenterHistory({
    legacyHistory: [
      { completionId: "completion-1", projectId: "project-1" },
      { completionId: "completion-1", projectId: "project-1" },
    ],
    reconciledHistory: [reconciledRecord()],
  });

  assert.equal(report.duplicateRecords.length, 1);
  assert.deepEqual(report.duplicateRecords[0], {
    side: "legacy",
    identity: "completion-1",
    count: 2,
    indexes: [0, 1],
  });
  assert.deepEqual(report.missingRecords, []);
  assert.equal(report.parity.exact, false);
});

test("reports normalized status differences", () => {
  const report = compareWorkCenterHistory({
    legacyHistory: [
      {
        completionId: "completion-1",
        projectId: "project-1",
        status: "Completed",
      },
    ],
    reconciledHistory: [
      reconciledRecord({ status: "awaiting_confirmation" }),
    ],
  });

  assert.deepEqual(report.statusDifferences, [
    {
      identity: "completion-1",
      legacyStatus: "completed",
      reconciledStatus: "awaiting_confirmation",
    },
  ]);
  assert.equal(report.parity.score, 90);
});

test("preserves inputs and reports records without identity", () => {
  const input = {
    legacyHistory: [{ projectId: "project-1", nested: { value: 1 } }],
    reconciledHistory: [
      {
        id: "",
        completionId: "",
        projectId: "",
        status: "unknown",
        provenance: { quality: "LOW", warnings: [{ code: "missing-id" }] },
      },
    ],
  };
  const original = structuredClone(input);
  const report = compareWorkCenterHistory(input);

  report.unidentifiedRecords[0].provenance.changed = true;
  assert.equal(report.unidentifiedRecords.length, 2);
  assert.equal(report.parity.exact, false);
  assert.deepEqual(input, original);
});
