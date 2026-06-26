import test from "node:test";
import assert from "node:assert/strict";

import {
  CLOSURE_OBLIGATION_CATEGORIES,
  CLOSURE_OBLIGATION_STATUSES,
  evaluateClosureReadiness,
} from "../src/utils/closureReadinessContract.js";

function baseInput(overrides = {}) {
  return {
    aggregateId: "project-1",
    aggregateType: "Project",
    completionStatus: "completed",
    obligations: [
      {
        id: "customer-confirmation-1",
        category: CLOSURE_OBLIGATION_CATEGORIES.CUSTOMER_CONFIRMATION,
        status: CLOSURE_OBLIGATION_STATUSES.RESOLVED,
        confirmationRequired: true,
        confirmationRefs: ["confirmation-1"],
      },
      {
        id: "payment-1",
        category: CLOSURE_OBLIGATION_CATEGORIES.PAYMENT,
        status: CLOSURE_OBLIGATION_STATUSES.RESOLVED,
        evidenceRequired: true,
        evidenceRefs: ["payment-receipt-1"],
      },
    ],
    evidence: [{ id: "payment-receipt-1", type: "paymentReceipt" }],
    confirmations: [{ id: "confirmation-1", type: "customerConfirmation" }],
    outstandingItems: [],
    ...overrides,
  };
}

test("fully resolved project is closure ready", () => {
  const result = evaluateClosureReadiness(baseInput());

  assert.equal(result.closureReady, true);
  assert.equal(result.riskLevel, "LOW");
  assert.equal(result.requiresHumanReview, false);
  assert.equal(result.resolvedObligations.length, 2);
  assert.deepEqual(result.blockers, []);
});

test("open permit prevents closure readiness", () => {
  const result = evaluateClosureReadiness(
    baseInput({
      obligations: [
        {
          id: "permit-1",
          category: CLOSURE_OBLIGATION_CATEGORIES.PERMIT,
          status: CLOSURE_OBLIGATION_STATUSES.OPEN,
        },
      ],
    })
  );

  assert.equal(result.closureReady, false);
  assert.equal(result.openObligations[0].category, "Permit");
  assert.equal(result.riskLevel, "HIGH");
});

test("open inspection prevents closure readiness", () => {
  const result = evaluateClosureReadiness(
    baseInput({
      obligations: [
        {
          id: "inspection-1",
          category: CLOSURE_OBLIGATION_CATEGORIES.INSPECTION,
          status: CLOSURE_OBLIGATION_STATUSES.REQUIRED,
        },
      ],
    })
  );

  assert.equal(result.closureReady, false);
  assert.equal(result.openObligations[0].status, "required");
});

test("missing payment confirmation is reported as missing evidence", () => {
  const result = evaluateClosureReadiness(
    baseInput({
      obligations: [
        {
          id: "payment-1",
          category: CLOSURE_OBLIGATION_CATEGORIES.PAYMENT,
          status: CLOSURE_OBLIGATION_STATUSES.RESOLVED,
          confirmationRequired: true,
          confirmationRefs: ["payment-confirmation-1"],
        },
      ],
      confirmations: [],
    })
  );

  assert.equal(result.closureReady, false);
  assert.ok(
    result.missingEvidence.some(
      (finding) => finding.code === "required-confirmation-missing"
    )
  );
});

test("missing tenant confirmation prevents closure readiness", () => {
  const result = evaluateClosureReadiness(
    baseInput({
      aggregateType: "MaintenanceRequest",
      obligations: [
        {
          id: "tenant-confirmation-1",
          category: CLOSURE_OBLIGATION_CATEGORIES.TENANT_CONFIRMATION,
          status: CLOSURE_OBLIGATION_STATUSES.OPEN,
          confirmationRequired: true,
        },
      ],
      confirmations: [],
    })
  );

  assert.equal(result.closureReady, false);
  assert.equal(result.openObligations[0].category, "TenantConfirmation");
});

test("unknown obligations remain unresolved", () => {
  const result = evaluateClosureReadiness(
    baseInput({
      obligations: [
        {
          id: "unknown-1",
          category: "FutureRegulatoryReview",
          status: CLOSURE_OBLIGATION_STATUSES.UNKNOWN,
        },
      ],
    })
  );

  assert.equal(result.closureReady, false);
  assert.equal(result.requiresHumanReview, true);
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "unknown-obligation"
    )
  );
  assert.ok(
    result.warnings.some(
      (warning) => warning.code === "future-obligation-category"
    )
  );
});

test("mixed obligations separate resolved, waived, and open records", () => {
  const result = evaluateClosureReadiness(
    baseInput({
      obligations: [
        {
          id: "documentation-1",
          category: CLOSURE_OBLIGATION_CATEGORIES.REQUIRED_DOCUMENTATION,
          status: CLOSURE_OBLIGATION_STATUSES.RESOLVED,
        },
        {
          id: "utility-1",
          category: CLOSURE_OBLIGATION_CATEGORIES.UTILITY_APPROVAL,
          status: CLOSURE_OBLIGATION_STATUSES.WAIVED,
          waiverAuthority: "utility-owner-record",
        },
        {
          id: "follow-up-1",
          category: CLOSURE_OBLIGATION_CATEGORIES.FOLLOW_UP,
          status: CLOSURE_OBLIGATION_STATUSES.OPEN,
        },
      ],
    })
  );

  assert.equal(result.closureReady, false);
  assert.equal(result.resolvedObligations.length, 1);
  assert.equal(result.waivedObligations.length, 1);
  assert.equal(result.openObligations.length, 1);
});

test("emergency completion without obligation review is not closure ready", () => {
  const result = evaluateClosureReadiness({
    aggregateId: "emergency-1",
    aggregateType: "Emergency",
    completionStatus: "completed",
    obligations: [],
    evidence: [],
    confirmations: [],
    outstandingItems: [],
  });

  assert.equal(result.closureReady, false);
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "obligation-review-required"
    )
  );
});

test("pending warranty handoff prevents closure readiness", () => {
  const result = evaluateClosureReadiness(
    baseInput({
      obligations: [
        {
          id: "warranty-1",
          category: CLOSURE_OBLIGATION_CATEGORIES.WARRANTY_HANDOFF,
          status: CLOSURE_OBLIGATION_STATUSES.OPEN,
        },
      ],
    })
  );

  assert.equal(result.closureReady, false);
  assert.equal(result.openObligations[0].category, "WarrantyHandoff");
});

test("required follow-up remains open", () => {
  const result = evaluateClosureReadiness(
    baseInput({
      obligations: [
        {
          id: "follow-up-1",
          category: CLOSURE_OBLIGATION_CATEGORIES.FOLLOW_UP,
          status: CLOSURE_OBLIGATION_STATUSES.REQUIRED,
        },
      ],
    })
  );

  assert.equal(result.closureReady, false);
  assert.equal(result.openObligations[0].status, "required");
});

test("missing required documentation evidence prevents closure readiness", () => {
  const result = evaluateClosureReadiness(
    baseInput({
      obligations: [
        {
          id: "documentation-1",
          category: CLOSURE_OBLIGATION_CATEGORIES.REQUIRED_DOCUMENTATION,
          status: CLOSURE_OBLIGATION_STATUSES.RESOLVED,
          evidenceRequired: true,
          evidenceRefs: ["completion-document-1"],
        },
      ],
      evidence: [],
    })
  );

  assert.equal(result.closureReady, false);
  assert.ok(
    result.missingEvidence.some(
      (finding) => finding.code === "required-evidence-missing"
    )
  );
});

test("disputed completion prevents closure readiness", () => {
  const result = evaluateClosureReadiness(
    baseInput({
      obligations: [
        {
          id: "dispute-1",
          category: CLOSURE_OBLIGATION_CATEGORIES.DISPUTE_RESOLUTION,
          status: CLOSURE_OBLIGATION_STATUSES.DISPUTED,
        },
      ],
      outstandingItems: [{ id: "issue-1", type: "customer-dispute" }],
    })
  );

  assert.equal(result.closureReady, false);
  assert.equal(result.riskLevel, "HIGH");
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "disputed-obligation"
    )
  );
});

test("evaluation is deterministic, non-mutating, and browser-independent", () => {
  const input = baseInput();
  const original = structuredClone(input);
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage"
  );
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("localStorage access is not allowed");
    },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    get() {
      throw new Error("window access is not allowed");
    },
  });

  try {
    const first = evaluateClosureReadiness(input);
    const second = evaluateClosureReadiness(input);

    assert.deepEqual(first, second);
    assert.deepEqual(input, original);
  } finally {
    if (localStorageDescriptor) {
      Object.defineProperty(globalThis, "localStorage", localStorageDescriptor);
    } else {
      delete globalThis.localStorage;
    }

    if (windowDescriptor) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else {
      delete globalThis.window;
    }
  }
});
