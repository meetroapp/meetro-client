import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyOperationalAggregateReadiness,
  OPERATIONAL_AGGREGATE_READINESS,
} from "../src/utils/operationalAggregateReadiness.js";
import {
  characterizeOperationalAggregateSources,
} from "../src/utils/operationalAggregateSourceCharacterization.js";

const LEVELS = OPERATIONAL_AGGREGATE_READINESS;

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
  confidence: "HIGH",
  reviewStatus: "reviewed",
  provenance: { source: "fixture" },
  priorClassificationHistory: [],
});

const projectFixture = (fixtureId = "project-1") => ({
  fixtureId,
  sourceType: "project",
  provenance: provenance(fixtureId),
  authorityContext: {
    serviceRequestRef: { serviceRequestId: `${fixtureId}-request` },
    classificationRef: classification(),
    operationalAggregateRef: {
      aggregateId: `${fixtureId}-aggregate`,
      aggregateType: "Project",
    },
    conversationRefs: [{ conversationId: `${fixtureId}-conversation` }],
    scheduleRefs: [{ scheduleId: `${fixtureId}-schedule` }],
    quoteRefs: [{ quoteId: `${fixtureId}-quote` }],
    completionRefs: [],
    historyRefs: [{ historyId: `${fixtureId}-history` }],
    relationshipRefs: [{ relationshipId: `${fixtureId}-relationship` }],
    compatibilityRefs: [],
  },
});

const classifyOne = (fixture) =>
  classifyOperationalAggregateReadiness([fixture]).classifications[0];

test("empty input returns zero counts", () => {
  const report = classifyOperationalAggregateReadiness([]);

  assert.equal(report.valid, true);
  assert.deepEqual(report.summary, {
    totalSources: 0,
    readyForReadProjection: 0,
    needsReviewBeforeProjection: 0,
    blockedFromProjection: 0,
    notOperationalSource: 0,
  });
});

test("fully valid aggregate source is READY_FOR_READ_PROJECTION", () => {
  const result = classifyOne(projectFixture());

  assert.equal(result.readiness, LEVELS.READY_FOR_READ_PROJECTION);
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.warnings, []);
});

test("intake-only Service Request is NOT_OPERATIONAL_SOURCE", () => {
  const result = classifyOne({
    fixtureId: "request-only",
    sourceType: "serviceRequest",
    record: { serviceRequestId: "request-1" },
    provenance: provenance("request-1"),
  });

  assert.equal(result.readiness, LEVELS.NOT_OPERATIONAL_SOURCE);
});

test("Service Request with explicit operational intent needs review", () => {
  const result = classifyOne({
    fixtureId: "request-work",
    sourceType: "serviceRequest",
    operationalBehaviorImplied: true,
    record: { serviceRequestId: "request-1", workStatus: "started" },
    provenance: provenance("request-1"),
  });

  assert.equal(result.readiness, LEVELS.NEEDS_REVIEW_BEFORE_PROJECTION);
});

test("legacy Project-like record missing aggregateId needs review", () => {
  const result = classifyOne({
    fixtureId: "legacy-project",
    sourceType: "project",
    record: { aggregateType: "Project", workStatus: "active" },
    provenance: provenance("legacy-project"),
  });

  assert.equal(result.readiness, LEVELS.NEEDS_REVIEW_BEFORE_PROJECTION);
});

test("WorkOrder-like record missing aggregateType needs review", () => {
  const result = classifyOne({
    fixtureId: "legacy-work-order",
    sourceType: "aggregate",
    record: { aggregateId: "work-order-1", workStatus: "active" },
    provenance: provenance("work-order-1"),
  });

  assert.equal(result.readiness, LEVELS.NEEDS_REVIEW_BEFORE_PROJECTION);
});

const collisionCases = [
  {
    label: "Emergency",
    code: "aggregate-id-collides-emergency",
    apply(context) {
      context.serviceRequestRef.emergencyId =
        context.operationalAggregateRef.aggregateId;
    },
  },
  {
    label: "Conversation",
    code: "aggregate-id-collides-conversation",
    apply(context) {
      context.conversationRefs = [
        { conversationId: context.operationalAggregateRef.aggregateId },
      ];
    },
  },
  {
    label: "Schedule",
    code: "aggregate-id-collides-schedule",
    apply(context) {
      context.scheduleRefs = [
        { scheduleId: context.operationalAggregateRef.aggregateId },
      ];
    },
  },
  {
    label: "Quote",
    code: "aggregate-id-collides-quote",
    apply(context) {
      context.quoteRefs = [
        { quoteId: context.operationalAggregateRef.aggregateId },
      ];
    },
  },
  {
    label: "Completion",
    code: "aggregate-id-collides-completion",
    apply(context) {
      context.completionRefs = [
        {
          completionId: context.operationalAggregateRef.aggregateId,
          aggregateId: context.operationalAggregateRef.aggregateId,
          aggregateType: "Project",
          workPerformedStatus: "performed",
          completedAt: "2026-06-14T12:00:00.000Z",
          performerId: "professional-1",
        },
      ];
    },
  },
];

for (const fixtureCase of collisionCases) {
  test(`${fixtureCase.label} identity reused as aggregateId is blocked`, () => {
    const fixture = projectFixture(`collision-${fixtureCase.label}`);
    fixtureCase.apply(fixture.authorityContext);

    const result = classifyOne(fixture);

    assert.equal(result.readiness, LEVELS.BLOCKED_FROM_PROJECTION);
    assert.ok(result.blockers.some(({ code }) => code === fixtureCase.code));
  });
}

test("Compatibility ID used as aggregateId is blocked", () => {
  const fixture = projectFixture("compatibility-authority");
  fixture.authorityContext.compatibilityRefs = [
    {
      compatibilityId:
        fixture.authorityContext.operationalAggregateRef.aggregateId,
      provenance: { source: "legacy" },
      warnings: ["read-only"],
    },
  ];

  const result = classifyOne(fixture);

  assert.equal(result.readiness, LEVELS.BLOCKED_FROM_PROJECTION);
  assert.ok(
    result.blockers.some(
      ({ code }) => code === "compatibility-id-used-as-aggregate-id",
    ),
  );
});

test("Compatibility ID used only for read reconciliation needs review", () => {
  const fixture = projectFixture("compatibility-read");
  fixture.authorityContext.compatibilityRefs = [
    {
      compatibilityId: "legacy-project-1",
      provenance: { source: "legacy" },
      warnings: ["read reconciliation only"],
    },
  ];

  const result = classifyOne(fixture);

  assert.equal(result.readiness, LEVELS.NEEDS_REVIEW_BEFORE_PROJECTION);
  assert.ok(
    result.warnings.some(
      ({ code }) => code === "compatibility-reference-requires-review",
    ),
  );
});

test("Completion missing aggregate reference needs review", () => {
  const fixture = projectFixture("completion-reference");
  fixture.authorityContext.completionRefs = [
    {
      completionId: "completion-1",
      aggregateType: "Project",
      workPerformedStatus: "performed",
      completedAt: "2026-06-14T12:00:00.000Z",
      performerId: "professional-1",
    },
  ];

  const result = classifyOne(fixture);

  assert.equal(result.readiness, LEVELS.NEEDS_REVIEW_BEFORE_PROJECTION);
});

test("Completion authorizing Closure is blocked", () => {
  const fixture = projectFixture("completion-authority");
  fixture.authorityContext.completionRefs = [
    {
      completionId: "completion-1",
      aggregateId: "completion-authority-aggregate",
      aggregateType: "Project",
      workPerformedStatus: "performed",
      completedAt: "2026-06-14T12:00:00.000Z",
      performerId: "professional-1",
      authorizesClosure: true,
    },
  ];

  const result = classifyOne(fixture);

  assert.equal(result.readiness, LEVELS.BLOCKED_FROM_PROJECTION);
  assert.ok(
    result.blockers.some(
      ({ code }) => code === "completion-cannot-authorize-closure",
    ),
  );
});

test("Closure relying only on Completion needs review", () => {
  const fixture = projectFixture("closure-completion-only");
  fixture.authorityContext.closureRef = {
    aggregateId: "closure-completion-only-aggregate",
    aggregateType: "Project",
    obligationRegistryRef: "registry-1",
    sourceEvidenceRefs: ["completion-1"],
    unresolvedObligationStatus: "unknown",
    reviewStatus: "review_required",
    authorizationStatus: "review_required",
    authorityBasis: ["Completion"],
  };

  const result = classifyOne(fixture);

  assert.equal(result.readiness, LEVELS.NEEDS_REVIEW_BEFORE_PROJECTION);
});

test("History authorizing Closure is blocked", () => {
  const fixture = projectFixture("history-authority");
  fixture.authorityContext.historyRefs = [
    { historyId: "history-1", authorizesClosure: true },
  ];

  const result = classifyOne(fixture);

  assert.equal(result.readiness, LEVELS.BLOCKED_FROM_PROJECTION);
});

test("Relationship terminated by aggregate Closure is blocked", () => {
  const fixture = projectFixture("relationship-termination");
  fixture.authorityContext.relationshipRefs = [
    {
      relationshipId: "relationship-1",
      terminatedByAggregateClosure: true,
    },
  ];

  const result = classifyOne(fixture);

  assert.equal(result.readiness, LEVELS.BLOCKED_FROM_PROJECTION);
  assert.ok(
    result.blockers.some(
      ({ code }) =>
        code === "aggregate-closure-cannot-terminate-relationship",
    ),
  );
});

test("RecurringService missing occurrence scope needs review", () => {
  const fixture = projectFixture("recurring-scope");
  fixture.sourceType = "recurringService";
  fixture.authorityContext.classificationRef =
    classification("RecurringService");
  fixture.authorityContext.operationalAggregateRef = {
    aggregateId: "recurring-1",
    aggregateType: "RecurringService",
  };

  const result = classifyOne(fixture);

  assert.equal(result.readiness, LEVELS.NEEDS_REVIEW_BEFORE_PROJECTION);
});

test("Recurring occurrence Completion closing parent is blocked", () => {
  const fixture = projectFixture("recurring-close-parent");
  fixture.sourceType = "recurringService";
  fixture.authorityContext.classificationRef =
    classification("RecurringService");
  fixture.authorityContext.operationalAggregateRef = {
    aggregateId: "recurring-occurrence-1",
    aggregateType: "RecurringService",
    scope: {
      scopeType: "occurrence",
      scopeId: "recurring-occurrence-1",
      parentAggregateId: "recurring-parent-1",
      occurrenceId: "recurring-occurrence-1",
    },
  };
  fixture.authorityContext.completionRefs = [
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

  const result = classifyOne(fixture);

  assert.equal(result.readiness, LEVELS.BLOCKED_FROM_PROJECTION);
});

test("low provenance operational record needs review", () => {
  const fixture = projectFixture("low-provenance");
  fixture.provenance = { sourceDomain: "fixture" };

  const result = classifyOne(fixture);

  assert.equal(result.readiness, LEVELS.NEEDS_REVIEW_BEFORE_PROJECTION);
  assert.ok(
    result.warnings.some(({ code }) => code.startsWith("provenance-")),
  );
});

test("pure presentation record is NOT_OPERATIONAL_SOURCE", () => {
  const result = classifyOne({
    fixtureId: "dashboard-card",
    sourceType: "presentation",
    record: { title: "Display-only fixture", statusLabel: "Active" },
    provenance: provenance("dashboard-card"),
  });

  assert.equal(result.readiness, LEVELS.NOT_OPERATIONAL_SOURCE);
});

test("accepts existing characterization output without changing it", () => {
  const characterization = characterizeOperationalAggregateSources([
    projectFixture("precharacterized"),
  ]);
  const before = structuredClone(characterization);
  const report = classifyOperationalAggregateReadiness(characterization);

  assert.equal(
    report.classifications[0].readiness,
    LEVELS.READY_FOR_READ_PROJECTION,
  );
  assert.deepEqual(characterization, before);
});

test("mixed fixture set produces accurate summary counts", () => {
  const blocked = projectFixture("blocked");
  blocked.authorityContext.conversationRefs = [
    { conversationId: "blocked-aggregate" },
  ];
  const review = {
    fixtureId: "review",
    sourceType: "project",
    record: { aggregateType: "Project" },
    provenance: provenance("review"),
  };
  const nonOperational = {
    fixtureId: "presentation",
    sourceType: "presentation",
    record: { title: "Display only" },
    provenance: provenance("presentation"),
  };

  const report = classifyOperationalAggregateReadiness([
    projectFixture("ready"),
    review,
    blocked,
    nonOperational,
  ]);

  assert.deepEqual(report.summary, {
    totalSources: 4,
    readyForReadProjection: 1,
    needsReviewBeforeProjection: 1,
    blockedFromProjection: 1,
    notOperationalSource: 1,
  });
});

test("classifier is deterministic, non-mutating, and storage-independent", () => {
  const fixtures = [projectFixture("pure")];
  const before = structuredClone(fixtures);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("localStorage must not be read");
    },
  });

  try {
    const first = classifyOperationalAggregateReadiness(fixtures);
    const second = classifyOperationalAggregateReadiness(fixtures);
    assert.deepEqual(first, second);
    assert.deepEqual(fixtures, before);
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "localStorage", descriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});
