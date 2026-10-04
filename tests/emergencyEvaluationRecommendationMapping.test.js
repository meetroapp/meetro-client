import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCanonicalEvaluationContent,
} from "../src/utils/canonicalEvaluation.js";

test("Emergency Recommendation is diagnosis documentation and does not fabricate a Finding", () => {
  const content = buildCanonicalEvaluationContent({
    serviceType: "plumbing",
    context: "emergency_request",
    notes: "Cold-water shut-off valve is actively leaking.",
    findings: "Replace the failed shut-off valve and test the connection for leaks.",
    findingRecords: [],
    workItems: [],
    safetyNotes: "",
  });

  assert.equal(
    content.observations,
    "Cold-water shut-off valve is actively leaking."
  );

  assert.equal(
    content.diagnosisSummary,
    "Replace the failed shut-off valve and test the connection for leaks."
  );

  assert.deepEqual(content.findings, []);
});

test("non-Emergency compatibility mapping still preserves narrative Findings", () => {
  const content = buildCanonicalEvaluationContent({
    serviceType: "plumbing",
    context: "legacy_request",
    notes: "Supply connection inspected.",
    findings: "Connection seal failed.",
    findingRecords: [],
    workItems: [],
    safetyNotes: "",
  });

  assert.equal(content.findings.length, 1);
  assert.equal(content.findings[0].summary, "Connection seal failed.");
  assert.equal(content.diagnosisSummary, "Connection seal failed.");
});
