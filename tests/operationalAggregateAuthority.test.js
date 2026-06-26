import assert from "node:assert/strict";
import test from "node:test";

import {
  validateOperationalAggregateAuthority,
} from "../src/utils/operationalAggregateAuthority.js";

const classification = (value, recommendedAggregateType = value) => ({
  classification: value,
  recommendedAggregateType,
  evidence: [],
  confidence: value === "Unknown" ? "LOW" : "HIGH",
  reviewStatus: value === "Unknown" ? "review_required" : "reviewed",
  provenance: { source: "fixture" },
});

const aggregate = (aggregateType, aggregateId = `${aggregateType}-1`) => ({
  aggregateId,
  aggregateType,
});

const contextFor = (aggregateType, aggregateId = `${aggregateType}-1`) => ({
  serviceRequestRef: { serviceRequestId: "service-request-1" },
  classificationRef: classification(aggregateType),
  operationalAggregateRef: aggregate(aggregateType, aggregateId),
  conversationRefs: [{ conversationId: "conversation-1" }],
  scheduleRefs: [{ scheduleId: "schedule-1" }],
  quoteRefs: [{ quoteId: "quote-1", quoteRequestId: "quote-request-1" }],
  completionRefs: [],
  historyRefs: [{ historyId: "history-1" }],
  relationshipRefs: [{ relationshipId: "relationship-1" }],
  compatibilityRefs: [],
});

const errorCodes = (result) => result.errors.map(({ code }) => code);
const reviewCodes = (result) =>
  result.reviewRequired.map(({ code }) => code);

test("allows a Service Request without an Operational Aggregate", () => {
  const result = validateOperationalAggregateAuthority({
    serviceRequestRef: { serviceRequestId: "service-request-1" },
    classificationRef: classification("Consultation"),
  });

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test("preserves Unknown classification as valid and review-required", () => {
  const result = validateOperationalAggregateAuthority({
    serviceRequestRef: { serviceRequestId: "service-request-1" },
    classificationRef: classification("Unknown"),
  });

  assert.equal(result.valid, true);
  assert.ok(reviewCodes(result).includes("classification-review-required"));
});

test("allows a WorkOrder recommendation without creating an aggregate", () => {
  const result = validateOperationalAggregateAuthority({
    serviceRequestRef: { serviceRequestId: "service-request-1" },
    classificationRef: classification("WorkOrder"),
  });

  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

for (const aggregateType of ["Project", "WorkOrder", "Emergency"]) {
  test(`accepts a valid ${aggregateType} authority context`, () => {
    const result = validateOperationalAggregateAuthority(
      contextFor(aggregateType),
    );

    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });
}

for (const scope of [
  {
    scopeType: "parent",
    scopeId: "recurring-parent-1",
  },
  {
    scopeType: "cycle",
    scopeId: "recurring-cycle-1",
    parentAggregateId: "recurring-parent-1",
    cycleId: "recurring-cycle-1",
  },
  {
    scopeType: "occurrence",
    scopeId: "recurring-occurrence-1",
    parentAggregateId: "recurring-parent-1",
    occurrenceId: "recurring-occurrence-1",
  },
]) {
  test(`accepts a valid RecurringService ${scope.scopeType} scope`, () => {
    const input = contextFor("RecurringService", scope.scopeId);
    input.operationalAggregateRef.scope = scope;

    const result = validateOperationalAggregateAuthority(input);

    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });
}

const collisionCases = [
  {
    label: "request",
    field: "serviceRequestRef",
    value: { serviceRequestId: "aggregate-1" },
    code: "aggregate-id-collides-service-request",
  },
  {
    label: "conversation",
    field: "conversationRefs",
    value: [{ conversationId: "aggregate-1" }],
    code: "aggregate-id-collides-conversation",
  },
  {
    label: "schedule",
    field: "scheduleRefs",
    value: [{ scheduleId: "aggregate-1" }],
    code: "aggregate-id-collides-schedule",
  },
  {
    label: "quote",
    field: "quoteRefs",
    value: [{ quoteId: "aggregate-1" }],
    code: "aggregate-id-collides-quote",
  },
  {
    label: "completion",
    field: "completionRefs",
    value: [{ completionId: "aggregate-1", aggregateId: "aggregate-1" }],
    code: "aggregate-id-collides-completion",
  },
  {
    label: "emergency",
    field: "serviceRequestRef",
    value: {
      serviceRequestId: "service-request-1",
      emergencyId: "aggregate-1",
    },
    code: "aggregate-id-collides-emergency",
  },
  {
    label: "compatibility",
    field: "compatibilityRefs",
    value: [
      {
        compatibilityId: "aggregate-1",
        provenance: { source: "legacy" },
        warnings: ["read-only"],
      },
    ],
    code: "aggregate-id-collides-compatibility",
  },
];

for (const collision of collisionCases) {
  test(`blocks aggregate identity collision with ${collision.label} identity`, () => {
    const input = contextFor("Project", "aggregate-1");
    input[collision.field] = collision.value;

    const result = validateOperationalAggregateAuthority(input);

    assert.equal(result.valid, false);
    assert.ok(errorCodes(result).includes(collision.code));
  });
}

test("flags Completion without an explicit aggregate reference", () => {
  const input = contextFor("Project");
  input.completionRefs = [{ completionId: "completion-1" }];

  const result = validateOperationalAggregateAuthority(input);

  assert.equal(result.valid, false);
  assert.ok(
    errorCodes(result).includes("completion-aggregate-reference-required"),
  );
});

test("blocks Completion from changing aggregate type", () => {
  const input = contextFor("Project");
  input.completionRefs = [
    {
      completionId: "completion-1",
      aggregateId: "Project-1",
      aggregateType: "WorkOrder",
    },
  ];

  const result = validateOperationalAggregateAuthority(input);

  assert.equal(result.valid, false);
  assert.ok(
    errorCodes(result).includes("completion-cannot-change-aggregate-type"),
  );
});

test("blocks Completion from authorizing Closure", () => {
  const input = contextFor("Project");
  input.completionRefs = [
    {
      completionId: "completion-1",
      aggregateId: "Project-1",
      aggregateType: "Project",
      authorizesClosure: true,
    },
  ];

  const result = validateOperationalAggregateAuthority(input);

  assert.equal(result.valid, false);
  assert.ok(
    errorCodes(result).includes("completion-cannot-authorize-closure"),
  );
});

test("requires review when Closure relies only on Completion", () => {
  const input = contextFor("Project");
  input.closureRef = {
    aggregateId: "Project-1",
    aggregateType: "Project",
    authorizationStatus: "review_required",
    authorityBasis: ["Completion"],
  };

  const result = validateOperationalAggregateAuthority(input);

  assert.equal(result.valid, true);
  assert.ok(reviewCodes(result).includes("closure-based-only-on-completion"));
  assert.ok(reviewCodes(result).includes("closure-authorization-unresolved"));
});

test("blocks History from authorizing Closure", () => {
  const input = contextFor("Project");
  input.historyRefs = [{ historyId: "history-1", authorizesClosure: true }];

  const result = validateOperationalAggregateAuthority(input);

  assert.equal(result.valid, false);
  assert.ok(errorCodes(result).includes("history-authority-overreach"));
});

test("blocks aggregate Closure from terminating Relationship", () => {
  const input = contextFor("Project");
  input.relationshipRefs = [
    {
      relationshipId: "relationship-1",
      terminatedByAggregateClosure: true,
    },
  ];

  const result = validateOperationalAggregateAuthority(input);

  assert.equal(result.valid, false);
  assert.ok(
    errorCodes(result).includes(
      "aggregate-closure-cannot-terminate-relationship",
    ),
  );
});

test("reports classification and aggregate type conflict without rewriting either", () => {
  const input = contextFor("Project");
  input.classificationRef = classification("WorkOrder");

  const result = validateOperationalAggregateAuthority(input);

  assert.equal(result.valid, true);
  assert.ok(
    reviewCodes(result).includes("classification-aggregate-type-conflict"),
  );
  assert.equal(input.classificationRef.classification, "WorkOrder");
  assert.equal(input.operationalAggregateRef.aggregateType, "Project");
});

test("blocks RecurringService occurrence Completion from closing parent service", () => {
  const input = contextFor(
    "RecurringService",
    "recurring-occurrence-1",
  );
  input.operationalAggregateRef.scope = {
    scopeType: "occurrence",
    scopeId: "recurring-occurrence-1",
    parentAggregateId: "recurring-parent-1",
    occurrenceId: "recurring-occurrence-1",
  };
  input.completionRefs = [
    {
      completionId: "completion-1",
      aggregateId: "recurring-occurrence-1",
      aggregateType: "RecurringService",
      closesParentService: true,
    },
  ];

  const result = validateOperationalAggregateAuthority(input);

  assert.equal(result.valid, false);
  assert.ok(
    errorCodes(result).includes(
      "recurring-occurrence-cannot-close-parent",
    ),
  );
});

test("does not mutate input and returns deterministic output", () => {
  const input = contextFor("Project");
  const before = structuredClone(input);

  const first = validateOperationalAggregateAuthority(input);
  const second = validateOperationalAggregateAuthority(input);

  assert.deepEqual(input, before);
  assert.deepEqual(first, second);
});

test("does not read browser storage or require browser globals", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("localStorage must not be read");
    },
  });

  try {
    const result = validateOperationalAggregateAuthority(
      contextFor("Project"),
    );
    assert.equal(result.valid, true);
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "localStorage", descriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});
