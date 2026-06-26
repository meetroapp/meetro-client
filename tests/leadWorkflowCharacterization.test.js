import test from "node:test";
import assert from "node:assert/strict";

import { characterizeLeadWorkflows } from "../src/utils/leadWorkflowCharacterization.js";

function compliantStandard(id = "standard-1") {
  return {
    id,
    source: "homeownerRequests",
    input: {
      lead: {
        requestId: id,
        customerContacted: true,
        informationComplete: true,
        appointmentRequired: true,
      },
      appointments: [
        {
          status: "completed",
          visitOutcome: "quote_required",
        },
      ],
      quotes: [{ status: "accepted" }],
      work: [{ status: "started" }],
    },
  };
}

test("classifies a compliant representative workflow", () => {
  const report = characterizeLeadWorkflows([compliantStandard()]);

  assert.equal(report.complianceRate, 100);
  assert.equal(report.summary.compliantCount, 1);
  assert.equal(report.findings[0].compliant, true);
  assert.equal(report.findings[0].workflowStage, "work");
});

test("aggregates missing stages from noncompliant workflows", () => {
  const report = characterizeLeadWorkflows([
    {
      id: "missing-information",
      input: {
        lead: {
          requestId: "request-1",
          customerContacted: true,
          quoteId: "quote-1",
        },
      },
    },
  ]);

  assert.equal(report.stageCoverage.information.missingCount, 1);
  assert.equal(report.stageCoverage.information.coveragePercentage, 0);
  assert.deepEqual(report.findings[0].missingStages, ["information"]);
});

test("reports approved and invalid appointment exception usage", () => {
  const report = characterizeLeadWorkflows([
    {
      id: "approved-exception",
      input: {
        lead: {
          requestId: "request-1",
          customerContacted: true,
          informationComplete: true,
          appointmentRequired: true,
          quoteId: "quote-1",
        },
        appointmentException: {
          approved: true,
          reason: "remote estimate",
          approvedByRole: "business",
        },
      },
    },
    {
      id: "invalid-exception",
      input: {
        lead: {
          requestId: "request-2",
          customerContacted: true,
          informationComplete: true,
          appointmentRequired: true,
          quoteId: "quote-2",
        },
        appointmentException: {
          approved: true,
          reason: "remote estimate",
        },
      },
    },
  ]);

  assert.equal(report.exceptionUsage.requestedCount, 2);
  assert.equal(report.exceptionUsage.approvedCount, 1);
  assert.equal(report.exceptionUsage.invalidCount, 1);
  assert.deepEqual(report.exceptionUsage.approvedReasons, {
    "remote estimate": 1,
  });
});

test("separates emergency workflows from standard appointment coverage", () => {
  const report = characterizeLeadWorkflows([
    {
      id: "emergency-1",
      source: "emergency",
      input: {
        lead: {
          emergencyRequestId: "emergency-1",
          workflowType: "emergency",
          customerContacted: true,
          informationComplete: true,
          quoteId: "quote-1",
        },
        appointmentRequired: true,
      },
    },
  ]);

  assert.equal(report.workflowDistribution.emergency.total, 1);
  assert.equal(report.workflowDistribution.standard.total, 0);
  assert.equal(report.exceptionUsage.emergencyExcludedCount, 1);
  assert.equal(report.stageCoverage.appointment.applicableCount, 0);
});

test("calculates deterministic risk distribution percentages", () => {
  const report = characterizeLeadWorkflows([
    compliantStandard("low-risk"),
    {
      id: "medium-risk",
      input: {
        lead: {
          requestId: "medium-risk",
          customerContacted: true,
          quoteId: "quote-1",
        },
      },
    },
    {
      id: "high-risk",
      input: {
        lead: {
          requestId: "high-risk",
          customerContacted: true,
          informationComplete: true,
          appointmentRequired: true,
          quoteId: "quote-2",
        },
      },
    },
  ]);

  assert.deepEqual(report.riskDistribution, {
    LOW: { count: 1, percentage: 33.33 },
    MEDIUM: { count: 1, percentage: 33.33 },
    HIGH: { count: 1, percentage: 33.33 },
  });
  assert.equal(report.complianceRate, 33.33);
});

test("aggregates warning frequency by code, risk, and stage", () => {
  const report = characterizeLeadWorkflows([
    {
      id: "quote-before-info-1",
      input: {
        lead: {
          requestId: "request-1",
          customerContacted: true,
          quoteId: "quote-1",
        },
      },
    },
    {
      id: "quote-before-info-2",
      input: {
        lead: {
          requestId: "request-2",
          customerContacted: true,
          quoteId: "quote-2",
        },
      },
    },
  ]);
  const warning = report.warningFrequency.find(
    (entry) => entry.code === "quote-before-information"
  );

  assert.equal(warning.count, 2);
  assert.deepEqual(warning.riskLevels, { MEDIUM: 2 });
  assert.deepEqual(warning.stages, { information: 2 });
});

test("preserves individual findings and does not mutate datasets", () => {
  const datasets = [
    {
      id: "dataset-1",
      source: "posts",
      input: {
        lead: {
          requestId: "request-1",
          customerContacted: true,
          informationComplete: true,
        },
        appointments: [{ status: "scheduled", nested: { value: 1 } }],
      },
    },
  ];
  const original = structuredClone(datasets);
  const first = characterizeLeadWorkflows(datasets);
  const second = characterizeLeadWorkflows(datasets);

  first.findings[0].report.evidence.lead = false;
  assert.deepEqual(datasets, original);
  assert.deepEqual(
    characterizeLeadWorkflows(datasets),
    second
  );
});
