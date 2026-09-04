import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCanonicalEvaluationRoute,
  buildCanonicalEvaluationContent,
  buildOrdinaryCanonicalEvaluationContent,
  canonicalEvaluationContentToForm,
  getCanonicalEvaluationSourceContext,
  ordinaryCanonicalEvaluationContentToForm,
  parseCanonicalEvaluationRoute,
  validateCanonicalEvaluationProjection,
} from "../src/utils/canonicalEvaluation.js";

export function canonicalEvaluationFixture(overrides = {}) {
  const id = "11111111-1111-4111-8111-111111111111";
  const base = {
    authoritySource: "canonical-commercial-authority",
    confirmed: true,
    aggregate: {
      id,
      type: "evaluation",
      owningEngine: "authorization_engine",
      version: 2,
      sourceContext: {
        type: "emergency_request",
        emergencyRequestId: 91,
        relationshipId: 72,
      },
    },
    evaluation: {
      id,
      status: "draft",
      createdAt: "2026-08-01T12:00:00.000Z",
      updatedAt: "2026-08-01T12:01:00.000Z",
      completedAt: null,
      content: {
        serviceType: "plumbing_repair",
        evaluationContext: "emergency_request",
        templateKey: "plumbing_emergency",
        observations: "Supply connection inspected.",
        measurements: [{ label: "Pressure", value: "62", unit: "psi", notes: "Static" }],
        findings: [{ summary: "Seal failed.", severity: "high", customerShareable: true }],
        diagnosisSummary: "Connection seal failure.",
        limitations: "Wall remained closed.",
        scopeRecommendations: ["Replace seal and pressure test."],
        relevantConditions: ["Supply isolated."],
        supportingMediaReferences: [],
        internalNotes: "Confirm fitting stock.",
      },
      capabilities: {
        canEditDraft: true,
        canComplete: true,
        canRevise: false,
        canShareWithCustomer: false,
        quoteReady: false,
        authorizationAvailable: false,
        startWorkAvailable: false,
      },
      traceability: {
        governingCharterId: "MC-WORKFLOW-001C",
        governingProgramId: "MC-WORKFLOW-001D",
        foundationMilestoneId: "MC-WORKFLOW-002A",
        capabilityMilestoneId: "MC-WORKFLOW-002B",
        certificationTarget: "MC-WORKFLOW-002R",
      },
    },
  };
  return {
    ...base,
    ...overrides,
    aggregate: { ...base.aggregate, ...(overrides.aggregate || {}) },
    evaluation: {
      ...base.evaluation,
      ...(overrides.evaluation || {}),
      content: { ...base.evaluation.content, ...(overrides.evaluation?.content || {}) },
      capabilities: { ...base.evaluation.capabilities, ...(overrides.evaluation?.capabilities || {}) },
      traceability: { ...base.evaluation.traceability, ...(overrides.evaluation?.traceability || {}) },
    },
  };
}

export function ordinaryCanonicalEvaluationFixture(overrides = {}) {
  return canonicalEvaluationFixture({
    ...overrides,
    aggregate: {
      sourceContext: {
        type: "ordinary_job",
        jobId: "66666666-6666-4666-8666-666666666666",
        requestId: 41,
        relationshipId: 72,
        evaluationVisitId: "99999999-9999-4999-8999-999999999999",
      },
      ...(overrides.aggregate || {}),
    },
    evaluation: {
      ...(overrides.evaluation || {}),
      content: {
        evaluationContext: "ordinary_job",
        observations: "Visible water damage is present around the cabinet base.",
        findings: [],
        diagnosisSummary: "Material damage extent requires further evaluation.",
        scopeRecommendations: [],
        ...overrides.evaluation?.content,
      },
    },
  });
}

test("strict Evaluation projection accepts only backend-confirmed Authorization Engine truth", () => {
  const canonical = validateCanonicalEvaluationProjection(canonicalEvaluationFixture());
  assert.equal(canonical.aggregate.type, "evaluation");
  assert.equal(canonical.aggregate.version, 2);
  assert.equal(canonical.evaluation.content.internalNotes, "Confirm fitting stock.");
  assert.equal(canonical.evaluation.capabilities.quoteReady, false);

  const completed = validateCanonicalEvaluationProjection(
    canonicalEvaluationFixture({
      aggregate: { version: 3 },
      evaluation: {
        status: "completed",
        completedAt: "2026-09-04T20:00:00.000Z",
        capabilities: {
          canEditDraft: false,
          canComplete: false,
          canRevise: true,
        },
      },
    })
  );

  assert.equal(completed.evaluation.status, "completed");
  assert.equal(completed.evaluation.capabilities.canEditDraft, false);
  assert.equal(completed.evaluation.capabilities.canRevise, true);
});

test("malformed identity, timestamps, content, status, and capabilities fail closed", () => {
  const mutations = [
    { confirmed: false },
    { evaluation: { id: "browser-evaluation-1" } },
    { evaluation: { updatedAt: "browser-time" } },
    { evaluation: { status: "completed", completedAt: null } },
    { evaluation: { content: { price: 500 } } },
    { evaluation: { content: { supportingMediaReferences: [{ id: "browser-photo" }] } } },
    { evaluation: { capabilities: { quoteReady: true } } },
    { evaluation: { capabilities: { authorizationAvailable: true } } },
    { evaluation: { traceability: { capabilityMilestoneId: "MC-WORKFLOW-999" } } },
  ];
  for (const mutation of mutations) {
    assert.equal(validateCanonicalEvaluationProjection(canonicalEvaluationFixture(mutation)), null);
  }
});

test("source selection preserves Emergency and accepts only confirmed ordinary Job identity", () => {
  assert.deepEqual(
    getCanonicalEvaluationSourceContext({ emergencyRequestId: 91, relationshipId: 72 }),
    { type: "emergency_request", emergencyRequestId: 91, relationshipId: 72 }
  );
  assert.deepEqual(
    getCanonicalEvaluationSourceContext({ emergencyRequestId: 91 }),
    { type: "emergency_request", emergencyRequestId: 91, relationshipId: null }
  );
  assert.deepEqual(
    getCanonicalEvaluationSourceContext({
      source: "CANONICAL_BACKEND_READ",
      readOnly: true,
      lifecycleVerified: true,
      lifecycleContractVersion: 2,
      jobId: "66666666-6666-4666-8666-666666666666",
      postId: 41,
      relationshipId: 72,
    }),
    {
      type: "ordinary_job",
      jobId: "66666666-6666-4666-8666-666666666666",
      requestId: 41,
      relationshipId: 72,
    }
  );
  assert.equal(getCanonicalEvaluationSourceContext({ requestId: 91, relationshipId: 72 }), null);
  assert.equal(
    getCanonicalEvaluationSourceContext({
      source: "CANONICAL_BACKEND_READ",
      readOnly: true,
      lifecycleVerified: true,
      lifecycleContractVersion: 2,
      postId: 41,
    }),
    null
  );
  assert.equal(getCanonicalEvaluationSourceContext({ projectId: "project-browser" }), null);
});

test("ordinary Evaluation content cannot overwrite Customer Concern or activate downstream domains", () => {
  const content = buildOrdinaryCanonicalEvaluationContent({
    observations: "Professional observations.",
    diagnosisSummary: "Professional assessment.",
    limitations: "Cabinet wall remained closed.",
    internalNotes: "Synthetic QA only.",
    customerConcern: "Browser attempt to replace customer truth.",
    findings: [{ summary: "Not authorized." }],
    scopeRecommendations: ["Not authorized."],
  });
  assert.equal(content.observations, "Professional observations.");
  assert.equal(Object.hasOwn(content, "customerConcern"), false);
  assert.deepEqual(content.findings, []);
  assert.deepEqual(content.scopeRecommendations, []);

  const canonical = validateCanonicalEvaluationProjection(
    ordinaryCanonicalEvaluationFixture()
  );
  assert.equal(canonical.aggregate.sourceContext.type, "ordinary_job");
  assert.equal(canonical.aggregate.sourceContext.requestId, 41);
  assert.equal(
    canonical.aggregate.sourceContext.evaluationVisitId,
    "99999999-9999-4999-8999-999999999999"
  );
  assert.equal(
    ordinaryCanonicalEvaluationContentToForm(canonical).observations,
    "Visible water damage is present around the cabinet base."
  );
});

test("ordinary Evaluation Visit provenance is strict, nullable, and required", () => {
  const physical = ordinaryCanonicalEvaluationFixture();
  assert.ok(validateCanonicalEvaluationProjection(physical));

  const preVisit = ordinaryCanonicalEvaluationFixture({
    aggregate: {
      sourceContext: {
        ...physical.aggregate.sourceContext,
        evaluationVisitId: null,
      },
    },
  });
  assert.equal(
    validateCanonicalEvaluationProjection(preVisit).aggregate.sourceContext.evaluationVisitId,
    null
  );

  const missing = ordinaryCanonicalEvaluationFixture({
    aggregate: {
      sourceContext: {
        type: "ordinary_job",
        jobId: physical.aggregate.sourceContext.jobId,
        requestId: 41,
        relationshipId: 72,
      },
    },
  });
  assert.equal(validateCanonicalEvaluationProjection(missing), null);

  const malformed = ordinaryCanonicalEvaluationFixture({
    aggregate: {
      sourceContext: {
        ...physical.aggregate.sourceContext,
        evaluationVisitId: "browser-visit",
      },
    },
  });
  assert.equal(validateCanonicalEvaluationProjection(malformed), null);
});

test("canonical Evaluation routes are refresh-safe and reject malformed source identity", () => {
  assert.equal(
    buildCanonicalEvaluationRoute(91),
    "workCenter?panel=evaluation&emergencyRequestId=91"
  );
  assert.deepEqual(
    parseCanonicalEvaluationRoute(
      "#workCenter?panel=evaluation&emergencyRequestId=91"
    ),
    { emergencyRequestId: 91, relationshipId: null }
  );
  assert.equal(buildCanonicalEvaluationRoute("browser-id"), null);
  assert.equal(parseCanonicalEvaluationRoute("#workCenter?panel=quote&emergencyRequestId=91"), null);
  assert.equal(parseCanonicalEvaluationRoute("#workCenter?panel=evaluation&emergencyRequestId=unsafe"), null);
});

test("existing presentation fields map into bounded canonical content without browser media authority", () => {
  const content = buildCanonicalEvaluationContent({
    serviceType: "plumbing_repair",
    context: "emergency_request",
    evaluationTemplate: "plumbing_emergency",
    notes: "Observed active supply leak.",
    findings: "Failed connection.",
    findingRecords: [],
    safetyNotes: "Supply isolated.",
    materialsNeeded: "Replacement seal",
    workItems: [{
      title: "Replace seal and test",
      measurements: [{ label: "Pressure", value: "62", unit: "psi", quantity: "static" }],
      safetyNotes: "Keep supply isolated.",
    }],
  });
  assert.equal(content.observations, "Observed active supply leak.");
  assert.equal(content.findings.length, 1);
  assert.equal(content.measurements.length, 1);
  assert.deepEqual(content.supportingMediaReferences, []);
  assert.equal(Object.hasOwn(content, "price"), false);
  assert.equal(Object.hasOwn(content, "authorization"), false);
});

test("refresh reconstruction uses canonical content and only presentation-local row keys", () => {
  const form = canonicalEvaluationContentToForm(canonicalEvaluationFixture(), { nextStep: "quote" });
  assert.equal(form.notes, "Supply connection inspected.");
  assert.equal(form.findings, "Connection seal failure.");
  assert.equal(form.workItems[0].title, "Replace seal and pressure test.");
  assert.match(form.workItems[0].id, /^presentation-/);
  assert.equal(Object.hasOwn(form, "evaluationId"), false);
  assert.equal(Object.hasOwn(form, "savedAt"), false);
});
