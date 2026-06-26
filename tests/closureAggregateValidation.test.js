import test from "node:test";
import assert from "node:assert/strict";

import { validateClosureAggregate } from "../src/utils/closureAggregateValidation.js";

function evidenceReference(overrides = {}) {
  return {
    evidenceId: "payment-receipt-1",
    sourceDomain: "Payment",
    sourceEntityId: "transaction-1",
    ownership: "source_domain",
    ...overrides,
  };
}

function registryEntry(overrides = {}) {
  return {
    obligationId: "payment-obligation-1",
    obligationType: "Payment",
    applicabilityStatus: "applicable",
    resolutionStatus: "resolved",
    evidenceReferences: [evidenceReference()],
    sourceDomain: "Payment",
    lastReviewedAt: "2026-06-14T12:00:00.000Z",
    reviewWarnings: [],
    ...overrides,
  };
}

function validProject(overrides = {}) {
  return {
    operationalAggregateRef: {
      aggregateId: "project-1",
      aggregateType: "Project",
    },
    completionRef: {
      completionId: "completion-1",
      status: "completed",
    },
    obligationRegistry: [registryEntry()],
    readiness: { status: "advisory_only" },
    reviewState: { reviewRequired: false },
    closureDecisionRef: null,
    historyRefs: ["history-event-1"],
    warnings: [],
    ...overrides,
  };
}

function recurringFixture(scope, overrides = {}) {
  const aggregateId =
    scope.scopeType === "parent" ? "recurring-1" : scope.scopeId;

  return validProject({
    operationalAggregateRef: {
      aggregateId,
      aggregateType: "RecurringService",
      scope,
    },
    ...overrides,
  });
}

test("validates a structurally valid Project closure aggregate", () => {
  const result = validateClosureAggregate(validProject());

  assert.equal(result.valid, true);
  assert.equal(result.reviewRequired, false);
  assert.equal(result.structuralRisk, "LOW");
  assert.deepEqual(result.blockers, []);
});

test("missing aggregateId is blocked", () => {
  const result = validateClosureAggregate(
    validProject({
      operationalAggregateRef: {
        aggregateId: "",
        aggregateType: "Project",
      },
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(({ code }) => code === "aggregate-id-required")
  );
});

test("unsupported aggregate type is blocked", () => {
  const result = validateClosureAggregate(
    validProject({
      operationalAggregateRef: {
        aggregateId: "maintenance-1",
        aggregateType: "MaintenanceRequest",
      },
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(({ code }) => code === "unsupported-aggregate-type")
  );
});

test("registry entry missing obligationId is blocked", () => {
  const result = validateClosureAggregate(
    validProject({
      obligationRegistry: [registryEntry({ obligationId: "" })],
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(({ code }) => code === "obligation-id-required")
  );
});

test("unknown applicability remains structurally valid and requires review", () => {
  const result = validateClosureAggregate(
    validProject({
      obligationRegistry: [
        registryEntry({
          applicabilityStatus: "unknown",
          resolutionStatus: "unknown",
          evidenceReferences: [],
        }),
      ],
    })
  );

  assert.equal(result.valid, true);
  assert.equal(result.reviewRequired, true);
  assert.equal(result.structuralRisk, "MEDIUM");
  assert.ok(
    result.warnings.some(
      ({ code }) => code === "unknown-applicability-review-required"
    )
  );
});

test("disputed resolution remains structurally valid and requires review", () => {
  const result = validateClosureAggregate(
    validProject({
      obligationRegistry: [
        registryEntry({
          resolutionStatus: "disputed",
          evidenceReferences: [],
        }),
      ],
    })
  );

  assert.equal(result.valid, true);
  assert.equal(result.reviewRequired, true);
  assert.ok(
    result.warnings.some(
      ({ code }) => code === "disputed-resolution-review-required"
    )
  );
});

test("resolved applicable obligation without evidence reference is blocked", () => {
  const result = validateClosureAggregate(
    validProject({
      obligationRegistry: [registryEntry({ evidenceReferences: [] })],
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(
      ({ code }) => code === "resolved-obligation-evidence-required"
    )
  );
});

test("evidence remains source-owned and Closure ownership is blocked", () => {
  const valid = validateClosureAggregate(validProject());
  const invalid = validateClosureAggregate(
    validProject({
      obligationRegistry: [
        registryEntry({
          evidenceReferences: [
            evidenceReference({
              sourceDomain: "Closure",
              ownership: "closure",
            }),
          ],
        }),
      ],
    })
  );

  assert.equal(valid.valid, true);
  assert.equal(
    valid.normalizedRegistry[0].evidenceReferences[0].ownership,
    "source_domain"
  );
  assert.ok(
    invalid.blockers.some(
      ({ code }) => code === "closure-cannot-own-evidence"
    )
  );
});

test("validates RecurringService parent scope", () => {
  const result = validateClosureAggregate(
    recurringFixture({
      scopeType: "parent",
      scopeId: "recurring-1",
      parentAggregateId: "recurring-1",
    })
  );

  assert.equal(result.valid, true);
});

test("validates RecurringService cycle scope", () => {
  const result = validateClosureAggregate(
    recurringFixture({
      scopeType: "cycle",
      scopeId: "cycle-2026-06",
      parentAggregateId: "recurring-1",
      cycleId: "cycle-2026-06",
    })
  );

  assert.equal(result.valid, true);
});

test("validates RecurringService occurrence scope", () => {
  const result = validateClosureAggregate(
    recurringFixture({
      scopeType: "occurrence",
      scopeId: "visit-42",
      parentAggregateId: "recurring-1",
      occurrenceId: "visit-42",
    })
  );

  assert.equal(result.valid, true);
});

test("conflicting RecurringService scopes are blocked", () => {
  const result = validateClosureAggregate(
    recurringFixture({
      scopeType: "cycle",
      scopeId: "cycle-2026-06",
      parentAggregateId: "recurring-1",
      cycleId: "cycle-2026-06",
      occurrenceId: "visit-42",
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.blockers.some(({ code }) => code === "conflicting-recurring-scopes")
  );
});

test("validation is deterministic and does not mutate input", () => {
  const input = validProject({
    obligationRegistry: [
      registryEntry({
        reviewWarnings: [{ code: "fixture-warning", nested: { value: 1 } }],
      }),
    ],
  });
  const original = structuredClone(input);
  const first = validateClosureAggregate(input);
  const second = validateClosureAggregate(input);

  first.normalizedRegistry[0].reviewWarnings[0].nested.value = 2;

  assert.deepEqual(input, original);
  assert.deepEqual(second, validateClosureAggregate(input));
});

test("unknown obligation type is preserved with a warning", () => {
  const result = validateClosureAggregate(
    validProject({
      obligationRegistry: [
        registryEntry({
          obligationId: "future-obligation-1",
          obligationType: "FutureEnvironmentalReview",
          applicabilityStatus: "unknown",
          resolutionStatus: "unknown",
          evidenceReferences: [],
          sourceDomain: "FutureEnvironmentalDomain",
        }),
      ],
    })
  );

  assert.equal(result.valid, true);
  assert.equal(
    result.normalizedRegistry[0].obligationType,
    "FutureEnvironmentalReview"
  );
  assert.ok(
    result.warnings.some(({ code }) => code === "unknown-obligation-type")
  );
});

test("validation does not read browser storage", () => {
  const storage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("storage access is prohibited");
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    get() {
      throw new Error("window access is prohibited");
    },
  });

  try {
    assert.doesNotThrow(() => validateClosureAggregate(validProject()));
  } finally {
    if (storage) Object.defineProperty(globalThis, "localStorage", storage);
    else delete globalThis.localStorage;
    if (windowDescriptor) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else {
      delete globalThis.window;
    }
  }
});
