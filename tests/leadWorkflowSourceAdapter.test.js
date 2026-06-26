import test from "node:test";
import assert from "node:assert/strict";

import { evaluateLeadWorkflowCompliance } from "../src/utils/leadWorkflowCompliance.js";
import {
  adaptLeadWorkflowSource,
  adaptLeadWorkflowSources,
  LEAD_WORKFLOW_SOURCE_TYPES,
} from "../src/utils/leadWorkflowSourceAdapter.js";

test("adapts a BusinessLeads post without promoting its generic id", () => {
  const adapted = adaptLeadWorkflowSource({
    source: LEAD_WORKFLOW_SOURCE_TYPES.BUSINESS_LEADS,
    record: {
      id: "post-row-1",
      title: "Kitchen repair",
      customerContacted: true,
      informationComplete: true,
    },
  });
  const report = evaluateLeadWorkflowCompliance(adapted.input);

  assert.equal(adapted.source, "businessLeads");
  assert.equal(adapted.input.lead.requestId, "");
  assert.equal(adapted.provenance.sourceRecordId, "post-row-1");
  assert.ok(
    adapted.provenance.warnings.some(
      (warning) => warning.code === "generic-id-preserved-not-promoted"
    )
  );
  assert.ok(
    report.warnings.some(
      (warning) => warning.code === "missing-lead-identity"
    )
  );
});

test("adapts ContractorDashboard request and embedded workflow evidence", () => {
  const adapted = adaptLeadWorkflowSource({
    source: LEAD_WORKFLOW_SOURCE_TYPES.CONTRACTOR_DASHBOARD,
    record: {
      requestId: "request-dashboard-1",
      customerContacted: true,
      informationComplete: true,
      appointmentRequired: true,
      schedule: {
        status: "Completed",
        visitOutcome: "quote_required",
      },
      quotes: [{ status: "accepted" }],
      activeWork: { status: "started" },
    },
  });
  const report = evaluateLeadWorkflowCompliance(adapted.input);

  assert.equal(adapted.input.lead.requestId, "request-dashboard-1");
  assert.equal(adapted.input.appointments[0].visitOutcome, "quote_required");
  assert.equal(report.compliant, true);
  assert.equal(report.workflowStage, "work");
});

test("adapts scheduling evidence and reports missing visit outcome", () => {
  const adapted = adaptLeadWorkflowSource({
    source: LEAD_WORKFLOW_SOURCE_TYPES.SCHEDULING,
    record: {
      id: "schedule-1",
      requestId: "request-schedule-1",
      status: "Completed",
      completedAt: "2026-06-13T10:00:00.000Z",
    },
    context: {
      lead: {
        requestId: "request-schedule-1",
        customerContacted: true,
        informationComplete: true,
        appointmentRequired: true,
      },
      quotes: [{ status: "sent" }],
    },
  });
  const report = evaluateLeadWorkflowCompliance(adapted.input);

  assert.equal(adapted.input.appointments[0].id, "schedule-1");
  assert.ok(
    adapted.provenance.warnings.some(
      (warning) =>
        warning.code === "completed-appointment-outcome-unavailable"
    )
  );
  assert.ok(
    report.warnings.some(
      (warning) => warning.code === "appointment-outcome-missing"
    )
  );
});

test("adapts quote evidence while preserving lifecycle provenance", () => {
  const adapted = adaptLeadWorkflowSource({
    source: LEAD_WORKFLOW_SOURCE_TYPES.QUOTES,
    record: {
      quoteId: "quote-1",
      requestId: "request-quote-1",
      status: "accepted",
      createdAt: "2026-06-13T10:00:00.000Z",
      acceptedAt: "2026-06-13T11:00:00.000Z",
      source: "external",
    },
    context: {
      lead: {
        requestId: "request-quote-1",
        customerContacted: true,
        informationComplete: true,
      },
    },
  });
  const report = evaluateLeadWorkflowCompliance(adapted.input);

  assert.equal(adapted.input.quotes[0].quoteId, "quote-1");
  assert.equal(adapted.provenance.source, "quotes");
  assert.equal(adapted.provenance.sourceRecord.source, "external");
  assert.equal(report.evidence.quote, true);
  assert.equal(report.evidence.decision, true);
});

test("preserves approved appointment exception evidence", () => {
  const exception = {
    approved: true,
    reason: "remote estimate",
    approvedByRole: "business",
  };
  const adapted = adaptLeadWorkflowSource({
    source: LEAD_WORKFLOW_SOURCE_TYPES.QUOTES,
    record: {
      quoteId: "quote-exception",
      requestId: "request-exception",
      status: "sent",
      appointmentRequired: true,
      appointmentException: exception,
      customerContacted: true,
      informationComplete: true,
    },
  });
  const report = evaluateLeadWorkflowCompliance(adapted.input);

  assert.deepEqual(adapted.input.appointmentException, exception);
  assert.equal(report.appointmentPolicy.exception.approved, true);
  assert.equal(
    report.warnings.some((warning) =>
      warning.code.startsWith("appointment-")
    ),
    false
  );
});

test("separates emergency records from standard appointment policy", () => {
  const adapted = adaptLeadWorkflowSource({
    source: LEAD_WORKFLOW_SOURCE_TYPES.EMERGENCY,
    record: {
      id: "emergency-1",
      conversationId: "emergency-conversation-1",
      type: "emergency",
      status: "started",
      customerContacted: true,
      informationComplete: true,
      appointmentRequired: true,
    },
  });
  const report = evaluateLeadWorkflowCompliance(adapted.input);

  assert.equal(adapted.input.isEmergency, true);
  assert.equal(adapted.input.lead.requestId, "emergency-1");
  assert.equal(report.appointmentPolicy.applicable, false);
  assert.equal(report.evidence.work, true);
  assert.equal(
    report.warnings.some((warning) =>
      warning.code.startsWith("appointment-")
    ),
    false
  );
});

test("keeps unknown legacy shapes visible and reports missing stages", () => {
  const [adapted] = adaptLeadWorkflowSources([
    {
      source: "oldLeadCache",
      record: {
        id: "legacy-1",
        title: "Legacy project",
        quoteId: "legacy-quote",
      },
    },
  ]);
  const report = evaluateLeadWorkflowCompliance(adapted.input);

  assert.equal(adapted.source, "legacy");
  assert.ok(
    adapted.provenance.warnings.some(
      (warning) => warning.code === "unsupported-source-treated-as-legacy"
    )
  );
  assert.ok(report.missingStages.includes("contact"));
  assert.ok(report.missingStages.includes("information"));
});

test("does not mutate records or context and is deterministic", () => {
  const entry = {
    source: LEAD_WORKFLOW_SOURCE_TYPES.SCHEDULING,
    record: {
      id: "schedule-2",
      requestId: "request-2",
      status: "scheduled",
      nested: { value: 1 },
    },
    context: {
      lead: {
        requestId: "request-2",
        appointmentRequired: true,
      },
      appointmentException: {
        approved: false,
        reason: "remote",
      },
    },
  };
  const original = structuredClone(entry);
  const first = adaptLeadWorkflowSource(entry);
  const second = adaptLeadWorkflowSource(entry);

  first.input.appointments[0].nested.value = 2;
  assert.deepEqual(entry, original);
  assert.deepEqual(adaptLeadWorkflowSource(entry), second);
});
