import test from "node:test";
import assert from "node:assert/strict";

import {
  createEvaluationFindingsRecord,
  createFinding,
  FINDING_CATEGORIES,
  FINDING_IDS,
  FINDING_REGISTRY,
  getFindingDefinition,
  getFindings,
  getFindingsEngineReport,
  getServiceRecommendationDefinition,
  SERVICE_RECOMMENDATION_IDS,
  SERVICE_RECOMMENDATION_REGISTRY,
  validateEvaluationFindingsScope,
} from "../src/utils/findingsEngineRegistry.js";

test("exports the MVP Finding categories", () => {
  assert.deepEqual(Object.values(FINDING_CATEGORIES), [
    "damage",
    "mold",
    "electrical_issue",
    "plumbing_issue",
    "structural_issue",
    "cosmetic_issue",
    "safety_issue",
    "access_issue",
    "measurement",
    "recommendation",
  ]);
});

test("creates a registered water damage Finding linked to Cabinet Replacement", () => {
  const result = createFinding({
    id: "sarah-finding-water-damage",
    findingId: FINDING_IDS.WATER_DAMAGED_SINK_CABINET,
    customerId: "customer-sarah",
    evaluationId: "evaluation-sarah",
  });

  assert.equal(result.ok, true);
  assert.equal(result.finding.id, "sarah-finding-water-damage");
  assert.equal(result.finding.findingType, "finding_water_damaged_sink_cabinet");
  assert.equal(result.finding.category, "damage");
  assert.deepEqual(result.finding.recommendedServices, [
    SERVICE_RECOMMENDATION_IDS.CABINET_REPLACEMENT,
  ]);
  assert.equal(
    getServiceRecommendationDefinition("cabinet_replacement").title,
    "Cabinet Replacement"
  );
});

test("creates multiple kitchen-remodel Findings and service recommendations", () => {
  const record = createEvaluationFindingsRecord({
    evaluationId: "evaluation-kitchen-1",
    customerId: "customer-kitchen",
    requestId: "request-kitchen-remodel",
    findings: [
      { findingId: FINDING_IDS.WATER_DAMAGED_SINK_CABINET },
      { findingId: FINDING_IDS.MOLD_PRESENT },
      { findingId: FINDING_IDS.OUTLET_NOT_FUNCTIONING },
      { findingId: FINDING_IDS.BACKSPLASH_REPLACEMENT_NEEDED },
    ],
  });

  assert.equal(record.ok, true);
  assert.equal(record.findings.length, 4);
  assert.deepEqual(
    record.serviceRecommendations.map((service) => service.id),
    [
      "cabinet_replacement",
      "mold_remediation",
      "electrical_repair",
      "tile_installation",
    ]
  );
  assert.deepEqual(
    record.serviceRecommendations.map((service) => service.title),
    [
      "Cabinet Replacement",
      "Mold Remediation",
      "Electrical Repair",
      "Tile Installation",
    ]
  );
});

test("keeps Sarah and William Findings scoped to their own evaluations", () => {
  const sarah = createEvaluationFindingsRecord({
    evaluationId: "evaluation-sarah",
    customerId: "customer-sarah",
    findings: [
      { findingId: FINDING_IDS.WATER_DAMAGED_SINK_CABINET },
      { findingId: FINDING_IDS.MOLD_PRESENT },
    ],
  });
  const william = createEvaluationFindingsRecord({
    evaluationId: "evaluation-william",
    customerId: "customer-william",
    findings: [
      { findingId: FINDING_IDS.OUTLET_NOT_FUNCTIONING },
      { findingId: FINDING_IDS.BACKSPLASH_REPLACEMENT_NEEDED },
    ],
  });

  assert.equal(sarah.ok, true);
  assert.equal(william.ok, true);
  assert.deepEqual(
    sarah.findings.map((finding) => finding.customerId),
    ["customer-sarah", "customer-sarah"]
  );
  assert.deepEqual(
    william.findings.map((finding) => finding.customerId),
    ["customer-william", "customer-william"]
  );
  assert.equal(
    sarah.findings.some((finding) => finding.customerId === "customer-william"),
    false
  );
  assert.equal(
    william.findings.some((finding) => finding.customerId === "customer-sarah"),
    false
  );
  assert.equal(
    validateEvaluationFindingsScope([sarah, william]).valid,
    true
  );
});

test("scope validation catches cross-customer Finding leakage", () => {
  const sarah = createEvaluationFindingsRecord({
    evaluationId: "evaluation-sarah",
    customerId: "customer-sarah",
    findings: [
      {
        findingId: FINDING_IDS.MOLD_PRESENT,
        customerId: "customer-william",
      },
    ],
  });
  const scope = validateEvaluationFindingsScope([sarah]);

  assert.equal(scope.valid, false);
  assert.deepEqual(scope.errors, [
    {
      code: "finding-customer-scope-mismatch",
      message: "Finding customer scope does not match the evaluation customer.",
      field: "evaluations.0.findings.0.customerId",
    },
  ]);
});

test("unknown Findings fail safely without service recommendations", () => {
  const finding = createFinding({
    findingId: "finding_not_registered",
    customerId: "customer-1",
  });
  const evaluation = createEvaluationFindingsRecord({
    evaluationId: "evaluation-unknown",
    customerId: "customer-1",
    findings: [{ findingId: "finding_not_registered" }],
  });

  assert.equal(finding.ok, false);
  assert.deepEqual(finding.finding, null);
  assert.deepEqual(finding.errors, [
    {
      code: "unknown-finding",
      message: "Finding is not registered in the Findings Engine registry.",
      field: "findingId",
    },
  ]);
  assert.equal(evaluation.ok, false);
  assert.deepEqual(evaluation.findings, []);
  assert.deepEqual(evaluation.serviceRecommendations, []);
});

test("registries are immutable to callers and report foundation counts", () => {
  const definition = getFindingDefinition(FINDING_IDS.MOLD_PRESENT);
  definition.recommendedServices.push("caller_mutation");

  assert.equal(
    getFindingDefinition(FINDING_IDS.MOLD_PRESENT).recommendedServices.includes(
      "caller_mutation"
    ),
    false
  );
  assert.equal(getFindings({ category: "mold" }).length, 1);
  assert.equal(Object.isFrozen(FINDING_REGISTRY), true);
  assert.equal(Object.isFrozen(SERVICE_RECOMMENDATION_REGISTRY), true);
  assert.deepEqual(getFindingsEngineReport(), {
    model: [
      "relationship",
      "request",
      "evaluation",
      "finding",
      "service",
      "proposal",
      "execution",
      "completion",
      "history",
    ],
    findingCategories: Object.values(FINDING_CATEGORIES),
    findingCount: 11,
    serviceRecommendationCount: 11,
  });
});

