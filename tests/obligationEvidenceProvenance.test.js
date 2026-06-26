import test from "node:test";
import assert from "node:assert/strict";

import {
  OBLIGATION_EVIDENCE_TRUST,
  OBLIGATION_EVIDENCE_TYPES,
  evaluateObligationEvidenceProvenance,
} from "../src/utils/obligationEvidenceProvenance.js";

function baseEvidence(overrides = {}) {
  return {
    obligationType: "RequiredDocumentation",
    evidenceType: OBLIGATION_EVIDENCE_TYPES.COMPLETION_ARTIFACT,
    source: "completion-record",
    actorId: "professional-1",
    actorRole: "professional",
    authority: "completion-authority",
    aggregateId: "project-1",
    aggregateType: "Project",
    timestamp: "2026-06-14T12:00:00.000Z",
    recordedAt: "2026-06-14T12:00:01.000Z",
    attachmentRefs: ["completion-photo-1"],
    confirmationRefs: [],
    notes: "",
    status: "captured",
    ...overrides,
  };
}

test("completion photo with source and aggregate is supported evidence", () => {
  const result = evaluateObligationEvidenceProvenance(baseEvidence());

  assert.equal(result.usable, true);
  assert.equal(result.evidenceTrust, OBLIGATION_EVIDENCE_TRUST.SUPPORTED);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.recommendedOwner, "Completion evidence owner");
});

test("self-reported payment claim is a warning, not authority", () => {
  const result = evaluateObligationEvidenceProvenance(
    baseEvidence({
      obligationType: "Payment",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.PAYMENT_CLAIM,
      source: "completion-form",
      authority: "professional-claim",
      attachmentRefs: [],
      status: "paid",
    })
  );

  assert.equal(result.usable, false);
  assert.equal(result.evidenceTrust, OBLIGATION_EVIDENCE_TRUST.SELF_REPORTED);
  assert.ok(
    result.warnings.some((warning) => warning.code === "self-reported-claim")
  );
});

test("payment receipt with external reference is authoritative", () => {
  const result = evaluateObligationEvidenceProvenance(
    baseEvidence({
      obligationType: "Payment",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.PAYMENT_RECEIPT,
      source: "payment-processor-webhook",
      actorId: "payment-processor",
      actorRole: "system",
      authority: "payment-processor",
      attachmentRefs: ["transaction-external-1"],
      status: "settled",
    })
  );

  assert.equal(result.usable, true);
  assert.equal(
    result.evidenceTrust,
    OBLIGATION_EVIDENCE_TRUST.AUTHORITATIVE
  );
});

test("customer confirmation with actor provenance is authoritative", () => {
  const result = evaluateObligationEvidenceProvenance(
    baseEvidence({
      obligationType: "CustomerConfirmation",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.CUSTOMER_CONFIRMATION,
      source: "completion-confirmation-event",
      actorId: "customer-1",
      actorRole: "customer",
      authority: "completion-confirmation-authority",
      attachmentRefs: [],
      confirmationRefs: ["confirmation-1"],
      status: "confirmed",
    })
  );

  assert.equal(result.usable, true);
  assert.equal(result.requiresHumanReview, false);
});

test("display label pretending to be confirmation is blocked", () => {
  const result = evaluateObligationEvidenceProvenance(
    baseEvidence({
      obligationType: "CustomerConfirmation",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.CUSTOMER_CONFIRMATION,
      source: "display-label",
      authority: "completion-confirmation-authority",
      attachmentRefs: [],
      confirmationRefs: ["label-confirmed"],
      status: "confirmed",
    })
  );

  assert.equal(result.usable, false);
  assert.equal(
    result.evidenceTrust,
    OBLIGATION_EVIDENCE_TRUST.PRESENTATION_ONLY
  );
});

test("archived conversation state is not evidence", () => {
  const result = evaluateObligationEvidenceProvenance(
    baseEvidence({
      obligationType: "CustomerConfirmation",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.UNKNOWN,
      source: "conversation-archive",
      authority: "conversation-authority",
      attachmentRefs: [],
      status: "archived",
    })
  );

  assert.equal(result.usable, false);
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "presentation-source-not-evidence"
    )
  );
});

test("emergency review submission is not Closure evidence", () => {
  const result = evaluateObligationEvidenceProvenance(
    baseEvidence({
      obligationType: "EmergencyReview",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.EMERGENCY_REVIEW,
      source: "relationship-review",
      actorId: "customer-1",
      actorRole: "customer",
      authority: "relationship-review-authority",
      aggregateId: "emergency-1",
      aggregateType: "Emergency",
      attachmentRefs: [],
      status: "submitted",
    })
  );

  assert.equal(result.usable, false);
  assert.equal(result.recommendedOwner, "Relationship/review authority");
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "review-not-closure-evidence"
    )
  );
});

test("permit claim without permit owner is blocked", () => {
  const result = evaluateObligationEvidenceProvenance(
    baseEvidence({
      obligationType: "Permit",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.PERMIT_STATUS,
      source: "project-folder-scan",
      authority: "document-authority",
      attachmentRefs: ["permit-scan-1"],
      status: "approved",
    })
  );

  assert.equal(result.usable, false);
  assert.equal(result.recommendedOwner, "Permit authority");
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "regulatory-authority-required"
    )
  );
});

test("inspection approval with explicit external evidence is authoritative", () => {
  const result = evaluateObligationEvidenceProvenance(
    baseEvidence({
      obligationType: "Inspection",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.INSPECTION_STATUS,
      source: "municipal-inspection-result",
      actorId: "inspector-42",
      actorRole: "inspector",
      authority: "external-inspection-authority",
      attachmentRefs: ["inspection-result-42"],
      status: "passed",
    })
  );

  assert.equal(result.usable, true);
  assert.equal(
    result.evidenceTrust,
    OBLIGATION_EVIDENCE_TRUST.AUTHORITATIVE
  );
});

test("warranty handoff missing acknowledgement is blocked", () => {
  const result = evaluateObligationEvidenceProvenance(
    baseEvidence({
      obligationType: "WarrantyHandoff",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.WARRANTY_HANDOFF,
      source: "warranty-document-service",
      authority: "warranty-authority",
      attachmentRefs: ["warranty-document-1"],
      confirmationRefs: [],
      status: "delivered",
    })
  );

  assert.equal(result.usable, false);
  assert.ok(result.missingProvenance.includes("confirmationRefs"));
});

test("unknown evidence type remains review-required", () => {
  const result = evaluateObligationEvidenceProvenance(
    baseEvidence({
      obligationType: "FutureObligation",
      evidenceType: "future_approval_signal",
      source: "future-domain",
      authority: "future-authority",
      attachmentRefs: [],
      status: "approved",
    })
  );

  assert.equal(result.usable, false);
  assert.equal(result.evidenceTrust, OBLIGATION_EVIDENCE_TRUST.UNKNOWN);
  assert.equal(result.requiresHumanReview, true);
});

test("conflicting actor provenance is blocked", () => {
  const result = evaluateObligationEvidenceProvenance(
    baseEvidence({
      obligationType: "CustomerConfirmation",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.CUSTOMER_CONFIRMATION,
      source: "completion-confirmation-event",
      actorId: "customer-1",
      actorRole: "customer",
      authority: {
        name: "completion-confirmation-authority",
        actorId: "customer-2",
        actorRole: "customer",
        aggregateId: "project-1",
        aggregateType: "Project",
      },
      attachmentRefs: [],
      confirmationRefs: ["confirmation-1"],
      status: "confirmed",
    })
  );

  assert.equal(result.usable, false);
  assert.equal(result.evidenceTrust, OBLIGATION_EVIDENCE_TRUST.CONFLICTING);
  assert.ok(
    result.blockers.some(
      (blocker) => blocker.code === "evidence-provenance-conflict"
    )
  );
});

test("validator is deterministic, non-mutating, and browser-independent", () => {
  const input = baseEvidence();
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
    const first = evaluateObligationEvidenceProvenance(input);
    const second = evaluateObligationEvidenceProvenance(input);

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
