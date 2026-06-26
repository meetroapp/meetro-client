import assert from "node:assert/strict";
import test from "node:test";

import {
  characterizeOperationalAggregateSources,
} from "../src/utils/operationalAggregateSourceCharacterization.js";

const provenance = (sourceId = "source-1") => ({
  sourceDomain: "fixture",
  sourceId,
  createdBy: "user-1",
  createdAt: "2026-06-14T10:00:00.000Z",
  updatedBy: "user-1",
  updatedAt: "2026-06-14T11:00:00.000Z",
  decisionProvenance: "fixture-review",
  backendAcknowledgementStatus: "acknowledged",
});

const classification = (value = "Project") => ({
  classification: value,
  recommendedAggregateType: value,
  evidence: [],
  confidence: value === "Unknown" ? "LOW" : "HIGH",
  reviewStatus: value === "Unknown" ? "review_required" : "reviewed",
  provenance: { source: "fixture" },
  priorClassificationHistory: [],
});

const fullyTypedProject = (overrides = {}) => ({
  fixtureId: "project-fixture",
  sourceType: "project",
  provenance: provenance("project-source-1"),
  authorityContext: {
    serviceRequestRef: { serviceRequestId: "request-1" },
    classificationRef: classification(),
    operationalAggregateRef: {
      aggregateId: "project-1",
      aggregateType: "Project",
    },
    conversationRefs: [{ conversationId: "conversation-1" }],
    scheduleRefs: [{ scheduleId: "schedule-1" }],
    quoteRefs: [{ quoteId: "quote-1" }],
    completionRefs: [],
    historyRefs: [{ historyId: "history-1" }],
    relationshipRefs: [{ relationshipId: "relationship-1" }],
    compatibilityRefs: [],
  },
  ...overrides,
});

const findCodes = (entries) => entries.map(({ code }) => code);

test("empty fixture set returns a valid characterization with zero counts", () => {
  const report = characterizeOperationalAggregateSources([]);

  assert.equal(report.valid, true);
  assert.deepEqual(report.summary, {
    totalSources: 0,
    sourcesWithAggregateIdentity: 0,
    sourcesMissingAggregateIdentity: 0,
    collisionCount: 0,
    classificationContinuityIssues: 0,
    completionCoverageIssues: 0,
    closureReadinessIssues: 0,
    recurringScopeIssues: 0,
    provenanceIssues: 0,
    compatibilityWarnings: 0,
  });
});

test("valid fully typed aggregate fixture passes with no collisions", () => {
  const report = characterizeOperationalAggregateSources([
    fullyTypedProject(),
  ]);

  assert.equal(report.valid, true);
  assert.equal(report.summary.sourcesWithAggregateIdentity, 1);
  assert.equal(report.summary.collisionCount, 0);
  assert.equal(report.summary.classificationContinuityIssues, 0);
  assert.equal(report.summary.provenanceIssues, 0);
});

test("Service Request without aggregate is counted only when operational behavior is implied", () => {
  const report = characterizeOperationalAggregateSources([
    {
      fixtureId: "intake-only",
      sourceType: "serviceRequest",
      record: { serviceRequestId: "request-1" },
      provenance: provenance("request-1"),
    },
    {
      fixtureId: "request-work-started",
      sourceType: "serviceRequest",
      operationalBehaviorImplied: true,
      record: { serviceRequestId: "request-2", workStatus: "started" },
      provenance: provenance("request-2"),
    },
  ]);

  assert.equal(report.summary.sourcesMissingAggregateIdentity, 1);
  assert.equal(report.missingAggregateIdentity[0].fixtureId, "request-work-started");
});

test("Unknown classification remains valid", () => {
  const report = characterizeOperationalAggregateSources([
    {
      fixtureId: "unknown-request",
      sourceType: "serviceRequest",
      provenance: provenance("unknown-request"),
      authorityContext: {
        serviceRequestRef: { serviceRequestId: "request-1" },
        classificationRef: classification("Unknown"),
      },
    },
  ]);

  assert.equal(report.valid, true);
  assert.equal(report.summary.classificationContinuityIssues, 0);
  assert.ok(
    report.authorityResults[0].result.reviewRequired.some(
      ({ code }) => code === "classification-review-required",
    ),
  );
});

test("Project-like legacy record missing aggregateId is reported", () => {
  const report = characterizeOperationalAggregateSources([
    {
      fixtureId: "legacy-project",
      sourceType: "project",
      record: { aggregateType: "Project", workStatus: "active" },
      provenance: provenance("legacy-project"),
    },
  ]);

  assert.equal(report.valid, false);
  assert.equal(report.summary.sourcesMissingAggregateIdentity, 1);
});

test("WorkOrder-like legacy record missing aggregateType is reported", () => {
  const report = characterizeOperationalAggregateSources([
    {
      fixtureId: "legacy-work-order",
      sourceType: "aggregate",
      record: { aggregateId: "work-order-1", workStatus: "active" },
      provenance: provenance("legacy-work-order"),
    },
  ]);

  assert.equal(report.valid, false);
  assert.equal(report.summary.sourcesMissingAggregateIdentity, 1);
});

const collisionFixtures = [
  {
    label: "Emergency",
    code: "aggregate-id-collides-emergency",
    mutate(context) {
      context.serviceRequestRef.emergencyId = "project-1";
    },
  },
  {
    label: "Conversation",
    code: "aggregate-id-collides-conversation",
    mutate(context) {
      context.conversationRefs = [{ conversationId: "project-1" }];
    },
  },
  {
    label: "Schedule",
    code: "aggregate-id-collides-schedule",
    mutate(context) {
      context.scheduleRefs = [{ scheduleId: "project-1" }];
    },
  },
  {
    label: "Quote",
    code: "aggregate-id-collides-quote",
    mutate(context) {
      context.quoteRefs = [{ quoteId: "project-1" }];
    },
  },
  {
    label: "Completion",
    code: "aggregate-id-collides-completion",
    mutate(context) {
      context.completionRefs = [
        {
          completionId: "project-1",
          aggregateId: "project-1",
          aggregateType: "Project",
          workPerformedStatus: "performed",
          completedAt: "2026-06-14T12:00:00.000Z",
          performerId: "professional-1",
        },
      ];
    },
  },
];

for (const fixture of collisionFixtures) {
  test(`${fixture.label} ID reused as aggregateId is reported as a collision`, () => {
    const source = fullyTypedProject();
    fixture.mutate(source.authorityContext);

    const report = characterizeOperationalAggregateSources([source]);

    assert.equal(report.valid, false);
    assert.ok(findCodes(report.collisions).includes(fixture.code));
  });
}

test("Compatibility projectId used as aggregateId is reported as compatibility risk", () => {
  const source = fullyTypedProject();
  source.authorityContext.compatibilityRefs = [
    {
      compatibilityId: "project-1",
      provenance: { source: "legacy-projectId" },
      warnings: ["read-only"],
    },
  ];

  const report = characterizeOperationalAggregateSources([source]);

  assert.ok(
    findCodes(report.compatibilityRisks).includes(
      "compatibility-id-used-as-aggregate-id",
    ),
  );
  assert.ok(
    findCodes(report.collisions).includes(
      "aggregate-id-collides-compatibility",
    ),
  );
});

test("Completion record missing aggregate reference is reported", () => {
  const source = fullyTypedProject();
  source.authorityContext.completionRefs = [
    {
      completionId: "completion-1",
      aggregateType: "Project",
      workPerformedStatus: "performed",
      completedAt: "2026-06-14T12:00:00.000Z",
      performerId: "professional-1",
    },
  ];

  const report = characterizeOperationalAggregateSources([source]);

  assert.ok(
    findCodes(report.completionCoverage).includes(
      "completion-aggregate-reference-required",
    ),
  );
});

test("Completion record with aggregateType mismatch is reported", () => {
  const source = fullyTypedProject();
  source.authorityContext.completionRefs = [
    {
      completionId: "completion-1",
      aggregateId: "project-1",
      aggregateType: "WorkOrder",
      workPerformedStatus: "performed",
      completedAt: "2026-06-14T12:00:00.000Z",
      performerId: "professional-1",
    },
  ];

  const report = characterizeOperationalAggregateSources([source]);

  assert.ok(
    findCodes(report.completionCoverage).includes(
      "completion-aggregate-type-mismatch",
    ),
  );
});

test("Closure relying only on Completion is reported as review-required", () => {
  const source = fullyTypedProject();
  source.authorityContext.closureRef = {
    aggregateId: "project-1",
    aggregateType: "Project",
    obligationRegistryRef: "registry-1",
    sourceEvidenceRefs: ["completion-1"],
    unresolvedObligationStatus: "unknown",
    reviewStatus: "review_required",
    authorizationStatus: "review_required",
    authorityBasis: ["Completion"],
  };

  const report = characterizeOperationalAggregateSources([source]);

  assert.equal(report.valid, true);
  assert.ok(
    findCodes(report.closureReadiness).includes(
      "closure-based-only-on-completion",
    ),
  );
});

test("History attempting to authorize Closure is reported", () => {
  const source = fullyTypedProject();
  source.authorityContext.historyRefs = [
    { historyId: "history-1", authorizesClosure: true },
  ];

  const report = characterizeOperationalAggregateSources([source]);

  assert.equal(report.valid, false);
  assert.ok(
    findCodes(report.closureReadiness).includes("history-authority-overreach"),
  );
});

test("RecurringService fixture missing occurrence scope is reported", () => {
  const source = fullyTypedProject({
    fixtureId: "recurring-missing-scope",
    sourceType: "recurringService",
  });
  source.authorityContext.classificationRef =
    classification("RecurringService");
  source.authorityContext.operationalAggregateRef = {
    aggregateId: "recurring-occurrence-1",
    aggregateType: "RecurringService",
  };

  const report = characterizeOperationalAggregateSources([source]);

  assert.equal(report.valid, false);
  assert.ok(
    findCodes(report.recurringScopeReadiness).includes(
      "recurring-scope-required",
    ),
  );
});

test("Recurring occurrence Completion closing parent is reported", () => {
  const source = fullyTypedProject({
    fixtureId: "recurring-parent-close",
    sourceType: "recurringService",
  });
  source.authorityContext.classificationRef =
    classification("RecurringService");
  source.authorityContext.operationalAggregateRef = {
    aggregateId: "recurring-occurrence-1",
    aggregateType: "RecurringService",
    scope: {
      scopeType: "occurrence",
      scopeId: "recurring-occurrence-1",
      parentAggregateId: "recurring-parent-1",
      occurrenceId: "recurring-occurrence-1",
    },
  };
  source.authorityContext.completionRefs = [
    {
      completionId: "completion-1",
      aggregateId: "recurring-occurrence-1",
      aggregateType: "RecurringService",
      workPerformedStatus: "performed",
      completedAt: "2026-06-14T12:00:00.000Z",
      performerId: "professional-1",
      closesParentService: true,
    },
  ];

  const report = characterizeOperationalAggregateSources([source]);

  assert.equal(report.valid, false);
  assert.ok(
    findCodes(report.recurringScopeReadiness).includes(
      "recurring-occurrence-completion-closes-parent",
    ),
  );
});

test("low provenance source is reported field by field", () => {
  const source = fullyTypedProject({ provenance: { sourceDomain: "fixture" } });

  const report = characterizeOperationalAggregateSources([source]);

  assert.equal(report.summary.provenanceIssues, 7);
  assert.ok(
    findCodes(report.provenanceQuality).includes(
      "provenance-backendAcknowledgementStatus-missing",
    ),
  );
});

test("mixed fixture set produces accurate summary counts", () => {
  const collision = fullyTypedProject({
    fixtureId: "collision",
    provenance: provenance("collision"),
  });
  collision.authorityContext.conversationRefs = [
    { conversationId: "project-1" },
  ];

  const report = characterizeOperationalAggregateSources([
    fullyTypedProject(),
    {
      fixtureId: "missing-project",
      sourceType: "project",
      record: { aggregateType: "Project" },
      provenance: provenance("missing-project"),
    },
    collision,
    {
      fixtureId: "low-provenance",
      sourceType: "serviceRequest",
      record: { serviceRequestId: "request-2" },
      provenance: {},
    },
  ]);

  assert.equal(report.summary.totalSources, 4);
  assert.equal(report.summary.sourcesWithAggregateIdentity, 2);
  assert.equal(report.summary.sourcesMissingAggregateIdentity, 1);
  assert.equal(report.summary.collisionCount, 1);
  assert.equal(report.summary.provenanceIssues, 8);
});

test("characterization calls the authority validator without modifying source data", () => {
  const sources = [fullyTypedProject()];
  const before = structuredClone(sources);
  const first = characterizeOperationalAggregateSources(sources);
  const second = characterizeOperationalAggregateSources(sources);

  assert.deepEqual(sources, before);
  assert.deepEqual(first, second);
  assert.equal(first.authorityResults[0].result.valid, true);
  assert.equal(
    first.authorityResults[0].authorityContext.operationalAggregateRef
      .aggregateId,
    "project-1",
  );
});

test("characterization does not read localStorage", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("localStorage must not be read");
    },
  });

  try {
    assert.equal(
      characterizeOperationalAggregateSources([fullyTypedProject()]).valid,
      true,
    );
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "localStorage", descriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});
