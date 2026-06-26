import test from "node:test";
import assert from "node:assert/strict";

import {
  getLeadSourceReconciliation,
  normalizeLeadRecord,
} from "../src/utils/leadReconciliation.js";

test("normalizes records without mutating the source", () => {
  const source = { requestId: "request-1", status: "Pending" };
  const normalized = normalizeLeadRecord(source, "posts");

  assert.notStrictEqual(normalized, source);
  assert.deepEqual(source, { requestId: "request-1", status: "Pending" });
  assert.equal(normalized.projectId, "request-1");
  assert.equal(normalized.leadState.status, "pending");
});

test("reconciles exact explicit identity tokens across sources", () => {
  const report = getLeadSourceReconciliation({
    posts: [{ requestId: "request-1", status: "pending" }],
    quoteRequests: [{ requestId: "request-1", status: "viewed" }],
    homeownerRequests: [{ requestId: "request-2", status: "pending" }],
  });

  assert.equal(report.totalRecordCount, 3);
  assert.equal(report.safeCrossSourceGroupCount, 1);
  assert.equal(report.statusConflictCount, 1);
  assert.equal(report.unresolvedRecordCount, 0);
});

test("does not reconcile generic source ids across sources", () => {
  const report = getLeadSourceReconciliation({
    posts: [{ id: "7", title: "Kitchen" }],
    quoteRequests: [{ id: "7", project_title: "Kitchen" }],
  });

  assert.equal(report.safeCrossSourceGroupCount, 0);
  assert.equal(report.unresolvedRecordCount, 2);
  assert.equal(
    report.warningCounts["source-generic-id-not-cross-source-safe"],
    2
  );
});

test("reports title-only records instead of guessing identity", () => {
  const report = getLeadSourceReconciliation({
    homeownerRequests: [{ title: "Same title", status: "pending" }],
  });

  assert.equal(report.unresolvedRecordCount, 1);
  assert.equal(report.normalizedSources.homeownerRequests[0].projectId, "");
  assert.ok(
    report.normalizedSources.homeownerRequests[0].leadIdentity.warnings.some(
      (warning) => warning.code === "title-only-project-identity"
    )
  );
});

test("reports accepted embedded quotes as closed without changing status", () => {
  const normalized = normalizeLeadRecord(
    {
      requestId: "request-3",
      status: "pending",
      quotesReceived: [{ status: "accepted" }],
    },
    "homeownerRequests"
  );

  assert.equal(normalized.leadState.status, "pending");
  assert.equal(normalized.leadState.isClosed, true);
  assert.equal(normalized.leadState.hasAcceptedQuote, true);
});
