import test from "node:test";
import assert from "node:assert/strict";

import {
  getReportType,
  getReportTypes,
  getReportsCenterReport,
  REPORT_STATUS,
  REPORTS_CENTER_REGISTRY,
} from "../src/utils/reportsCenterRegistry.js";

test("exports read-only MVP report types", () => {
  const report = getReportsCenterReport();

  assert.equal(report.readOnly, true);
  assert.deepEqual(report.reports, [
    "job_report",
    "evaluation_report",
    "completion_report",
    "customer_history_report",
    "quote_proposal_report",
    "invoice_receipt_report",
    "permit_compliance_report",
    "asset_history_report",
    "business_summary_report",
  ]);
  assert.equal(report.reportCount, 9);
  assert.equal(report.availableCount, 1);
  assert.equal(report.plannedCount, 8);
  assert.ok(report.includeCount > report.reportCount);
});

test("marks Job Report as available from Job History with complete job contents", () => {
  const jobReport = getReportType("job_report");

  assert.equal(jobReport.name, "Job Report");
  assert.equal(jobReport.status, REPORT_STATUS.AVAILABLE_FROM_JOB_HISTORY);
  assert.deepEqual(jobReport.includes, [
    "Customer",
    "Evaluation",
    "Findings",
    "Recommended Services",
    "Proposal",
    "Payment",
    "Completion",
    "Closure",
    "Timeline",
  ]);
});

test("lists future compliance, asset, and business summary reports", () => {
  assert.equal(
    getReportType("permit_compliance_report").status,
    REPORT_STATUS.PLANNED
  );
  assert.ok(getReportType("asset_history_report").includes.includes("Asset"));
  assert.ok(
    getReportType("business_summary_report").includes.includes("Revenue Signals")
  );
});

test("normalizes report lookups and fails safely for unknown reports", () => {
  assert.equal(getReportType("Quote / Proposal Report").id, "quote_proposal_report");
  assert.equal(getReportType("unknown_report"), null);
  assert.deepEqual(getReportTypes({ id: "unknown_report" }), []);
});

test("registry definitions and read helpers are protected from caller mutation", () => {
  assert.throws(
    () => {
      REPORTS_CENTER_REGISTRY.job_report.includes.push("mutated");
    },
    {
      name: "TypeError",
    }
  );

  const jobReport = getReportType("job_report");
  jobReport.includes.push("caller mutation");

  assert.ok(!getReportType("job_report").includes.includes("caller mutation"));
});
