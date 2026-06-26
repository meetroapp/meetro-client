import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateLeadWorkflowCompliance,
  LEAD_WORKFLOW_WARNING_CODES,
} from "../src/utils/leadWorkflowCompliance.js";

test("reports a compliant standard lead workflow", () => {
  const report = evaluateLeadWorkflowCompliance({
    lead: {
      requestId: "request-1",
      customerContacted: true,
      informationComplete: true,
      appointmentRequired: true,
    },
    appointments: [
      {
        status: "Completed",
        visitOutcome: "quote_required",
        completedAt: "2026-06-10T10:00:00.000Z",
      },
    ],
    quotes: [
      {
        status: "accepted",
        createdAt: "2026-06-10T11:00:00.000Z",
        acceptedAt: "2026-06-10T12:00:00.000Z",
      },
    ],
    work: [{ status: "started", startedAt: "2026-06-11T10:00:00.000Z" }],
  });

  assert.equal(report.compliant, true);
  assert.equal(report.workflowStage, "work");
  assert.deepEqual(report.warnings, []);
});

test("reports quote creation before information gathering", () => {
  const report = evaluateLeadWorkflowCompliance({
    lead: {
      requestId: "request-1",
      customerContacted: true,
      quoteId: "quote-1",
    },
  });

  assert.ok(
    report.warnings.some(
      (warning) =>
        warning.code === LEAD_WORKFLOW_WARNING_CODES.QUOTE_BEFORE_INFORMATION
    )
  );
  assert.ok(report.missingStages.includes("information"));
});

test("reports a quote before a required appointment exists", () => {
  const report = evaluateLeadWorkflowCompliance({
    lead: {
      requestId: "request-1",
      customerContacted: true,
      informationComplete: true,
      appointmentRequired: true,
      quoteId: "quote-1",
    },
  });

  assert.ok(
    report.warnings.some(
      (warning) =>
        warning.code ===
        LEAD_WORKFLOW_WARNING_CODES.APPOINTMENT_REQUIRED_MISSING
    )
  );
  assert.equal(report.riskLevel, "HIGH");
});

test("does not treat a scheduled appointment as completed", () => {
  const report = evaluateLeadWorkflowCompliance({
    lead: {
      requestId: "request-1",
      customerContacted: true,
      informationComplete: true,
      appointmentRequired: true,
    },
    appointments: [{ status: "scheduled" }],
    quotes: [{ quoteId: "quote-1", status: "sent" }],
  });

  assert.ok(
    report.warnings.some(
      (warning) =>
        warning.code ===
        LEAD_WORKFLOW_WARNING_CODES.APPOINTMENT_NOT_COMPLETED
    )
  );
});

test("reports a missing visit outcome after a completed appointment", () => {
  const report = evaluateLeadWorkflowCompliance({
    lead: {
      requestId: "request-1",
      customerContacted: true,
      informationComplete: true,
      appointmentRequired: true,
    },
    appointments: [{ status: "completed" }],
    quotes: [{ quoteId: "quote-1", status: "sent" }],
  });

  assert.ok(
    report.warnings.some(
      (warning) =>
        warning.code ===
        LEAD_WORKFLOW_WARNING_CODES.APPOINTMENT_OUTCOME_MISSING
    )
  );
});

test("supports a fully approved appointment exception", () => {
  const report = evaluateLeadWorkflowCompliance({
    lead: {
      requestId: "request-1",
      customerContacted: true,
      informationComplete: true,
      appointmentRequired: true,
      quoteId: "quote-1",
    },
    appointmentException: {
      approved: true,
      reason: "remote estimate approved",
      approvedByRole: "business",
    },
  });

  assert.equal(report.compliant, true);
  assert.equal(report.appointmentPolicy.exception.approved, true);
  assert.equal(report.missingStages.includes("appointment"), false);
});

test("reports an unapproved appointment exception", () => {
  const report = evaluateLeadWorkflowCompliance({
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
    },
  });

  assert.ok(
    report.warnings.some(
      (warning) =>
        warning.code ===
        LEAD_WORKFLOW_WARNING_CODES.APPOINTMENT_EXCEPTION_UNAPPROVED
    )
  );
});

test("does not apply standard appointment requirements to emergency workflow", () => {
  const report = evaluateLeadWorkflowCompliance({
    lead: {
      emergencyRequestId: "emergency-1",
      workflowType: "emergency",
      customerContacted: true,
      informationComplete: true,
      quoteId: "quote-1",
    },
    appointmentRequired: true,
  });

  assert.equal(report.appointmentPolicy.applicable, false);
  assert.equal(
    report.warnings.some((warning) =>
      warning.code.startsWith("appointment-")
    ),
    false
  );
});

test("reports work before quote decision", () => {
  const report = evaluateLeadWorkflowCompliance({
    lead: {
      requestId: "request-1",
      customerContacted: true,
      informationComplete: true,
      appointmentRequired: false,
      quoteId: "quote-1",
      workStartedAt: "2026-06-11T10:00:00.000Z",
    },
    quotes: [{ status: "sent" }],
  });

  assert.ok(
    report.warnings.some(
      (warning) =>
        warning.code === LEAD_WORKFLOW_WARNING_CODES.WORK_BEFORE_DECISION
    )
  );
  assert.equal(report.riskLevel, "HIGH");
});

test("reports completion without work and history without completion", () => {
  const completionReport = evaluateLeadWorkflowCompliance({
    lead: {
      requestId: "request-1",
      customerContacted: true,
      informationComplete: true,
      completedAt: "2026-06-12T10:00:00.000Z",
    },
  });
  const historyReport = evaluateLeadWorkflowCompliance({
    lead: {
      requestId: "request-2",
      savedToHistory: true,
    },
  });

  assert.ok(
    completionReport.warnings.some(
      (warning) =>
        warning.code === LEAD_WORKFLOW_WARNING_CODES.COMPLETION_WITHOUT_WORK
    )
  );
  assert.ok(
    historyReport.warnings.some(
      (warning) =>
        warning.code === LEAD_WORKFLOW_WARNING_CODES.HISTORY_WITHOUT_COMPLETION
    )
  );
});

test("reports missing contact and identity without guessing", () => {
  const report = evaluateLeadWorkflowCompliance({
    lead: {
      title: "Kitchen repair",
      informationComplete: true,
      quoteId: "quote-1",
    },
  });

  assert.ok(
    report.warnings.some(
      (warning) =>
        warning.code === LEAD_WORKFLOW_WARNING_CODES.MISSING_LEAD_IDENTITY
    )
  );
  assert.ok(
    report.warnings.some(
      (warning) =>
        warning.code === LEAD_WORKFLOW_WARNING_CODES.MISSING_CUSTOMER_CONTACT
    )
  );
});

test("produces deterministic output without mutating inputs", () => {
  const input = {
    lead: {
      requestId: "request-1",
      customerContacted: true,
      informationComplete: true,
      appointmentRequired: true,
    },
    appointments: [{ status: "scheduled", nested: { value: 1 } }],
    quotes: [{ status: "sent" }],
  };
  const original = structuredClone(input);
  const first = evaluateLeadWorkflowCompliance(input);
  const second = evaluateLeadWorkflowCompliance(input);

  assert.deepEqual(first, second);
  assert.deepEqual(input, original);
});
