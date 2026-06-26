import test from "node:test";
import assert from "node:assert/strict";

import {
  OBLIGATION_EVIDENCE_TRUST,
  OBLIGATION_EVIDENCE_TYPES,
} from "../src/utils/obligationEvidenceProvenance.js";
import { characterizeObligationEvidence } from "../src/utils/obligationEvidenceCharacterization.js";

function evidence(overrides = {}) {
  return {
    obligationType: "RequiredDocumentation",
    evidenceType: OBLIGATION_EVIDENCE_TYPES.COMPLETION_ARTIFACT,
    source: "completion-sheet",
    actorId: "professional-1",
    actorRole: "professional",
    authority: "completion-authority",
    aggregateId: "project-1",
    aggregateType: "Project",
    timestamp: "2026-06-14T12:00:00.000Z",
    recordedAt: "2026-06-14T12:00:01.000Z",
    attachmentRefs: ["artifact-1"],
    confirmationRefs: [],
    notes: "Sanitized fixture note",
    status: "captured",
    ...overrides,
  };
}

const representativeFixtures = [
  {
    fixtureId: "completion-sheet-artifact",
    family: "Completion Sheet record with photos and notes",
    evidence: evidence(),
  },
  {
    fixtureId: "closeout-awaiting-confirmation",
    family: "Completion closeout card awaiting customer confirmation",
    evidence: evidence({
      obligationType: "CustomerConfirmation",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.CUSTOMER_CONFIRMATION,
      source: "completion-closeout-card",
      authority: "completion-authority",
      attachmentRefs: [],
      status: "awaiting_customer_confirmation",
    }),
  },
  {
    fixtureId: "closeout-display-confirmed",
    family: "Completion closeout card confirmed by display status only",
    evidence: evidence({
      obligationType: "CustomerConfirmation",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.CUSTOMER_CONFIRMATION,
      source: "display-label",
      authority: "completion-confirmation-authority",
      attachmentRefs: [],
      confirmationRefs: ["display-status-confirmed"],
      status: "confirmed",
    }),
  },
  {
    fixtureId: "self-reported-payment",
    family: "Self-reported payment received",
    evidence: evidence({
      obligationType: "Payment",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.PAYMENT_CLAIM,
      source: "completion-sheet",
      authority: "professional-claim",
      attachmentRefs: [],
      status: "received",
    }),
  },
  {
    fixtureId: "external-payment-receipt",
    family: "Payment receipt with external reference",
    evidence: evidence({
      obligationType: "Payment",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.PAYMENT_RECEIPT,
      source: "payment-processor-webhook",
      actorId: "payment-processor",
      actorRole: "system",
      authority: "payment-processor",
      attachmentRefs: ["transaction-external-1"],
      status: "settled",
    }),
  },
  {
    fixtureId: "project-folder-document",
    family: "Project Folder document artifact",
    evidence: evidence({
      evidenceType: OBLIGATION_EVIDENCE_TYPES.DOCUMENT_DELIVERY,
      source: "project-folder",
      authority: "project-folder-authority",
      attachmentRefs: ["project-document-1"],
      status: "delivered",
    }),
  },
  {
    fixtureId: "conversation-follow-up",
    family: "Conversation follow-up message or card",
    evidence: evidence({
      obligationType: "FollowUp",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.FOLLOW_UP_COMPLETION,
      source: "conversation-workflow-card",
      authority: "current-viewer",
      attachmentRefs: [],
      status: "completed",
    }),
  },
  {
    fixtureId: "emergency-review-submitted",
    family: "Emergency completed with review submitted",
    evidence: evidence({
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
    }),
  },
  {
    fixtureId: "permit-record-mention",
    family: "Permit mentioned without permit owner",
    evidence: evidence({
      obligationType: "Permit",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.PERMIT_STATUS,
      source: "project-folder-record",
      authority: "document-authority",
      attachmentRefs: ["permit-mention-1"],
      status: "approved",
    }),
  },
  {
    fixtureId: "external-inspection-result",
    family: "Inspection evidence with external reference",
    evidence: evidence({
      obligationType: "Inspection",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.INSPECTION_STATUS,
      source: "municipal-inspection-result",
      actorId: "inspector-42",
      actorRole: "inspector",
      authority: "external-inspection-authority",
      attachmentRefs: ["inspection-result-42"],
      status: "passed",
    }),
  },
  {
    fixtureId: "warranty-no-acknowledgement",
    family: "Warranty offered without acknowledgement",
    evidence: evidence({
      obligationType: "WarrantyHandoff",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.WARRANTY_HANDOFF,
      source: "warranty-document-service",
      authority: "warranty-authority",
      attachmentRefs: ["warranty-document-1"],
      confirmationRefs: [],
      status: "offered",
    }),
  },
  {
    fixtureId: "dispute-follow-up-requested",
    family: "Dispute or follow-up requested",
    evidence: evidence({
      obligationType: "DisputeResolution",
      evidenceType: OBLIGATION_EVIDENCE_TYPES.DISPUTE_RESOLUTION,
      source: "conversation-workflow-card",
      authority: "current-viewer",
      attachmentRefs: [],
      confirmationRefs: [],
      status: "requested",
    }),
  },
];

const mixedCompletedProject = {
  aggregateId: "project-1",
  aggregateType: "Project",
  completionStatus: "completed",
  obligations: [
    {
      id: "documentation",
      category: "RequiredDocumentation",
      status: "resolved",
      required: true,
      evidenceRequired: true,
      evidenceRefs: ["completion-sheet-artifact", "project-folder-document"],
    },
    {
      id: "payment",
      category: "Payment",
      status: "resolved",
      required: true,
      evidenceRequired: true,
      evidenceRefs: ["external-payment-receipt"],
    },
    {
      id: "inspection",
      category: "Inspection",
      status: "resolved",
      required: true,
      evidenceRequired: true,
      evidenceRefs: ["external-inspection-result"],
    },
    {
      id: "customer-confirmation",
      category: "CustomerConfirmation",
      status: "open",
      required: true,
      confirmationRequired: true,
      confirmationRefs: ["closeout-display-confirmed"],
    },
    {
      id: "permit",
      category: "Permit",
      status: "open",
      required: true,
      evidenceRequired: true,
      evidenceRefs: ["permit-record-mention"],
    },
    {
      id: "warranty",
      category: "WarrantyHandoff",
      status: "open",
      required: true,
      evidenceRequired: true,
      confirmationRequired: true,
      evidenceRefs: ["warranty-no-acknowledgement"],
      confirmationRefs: ["warranty-no-acknowledgement"],
    },
    {
      id: "follow-up",
      category: "FollowUp",
      status: "open",
      required: true,
      evidenceRequired: true,
      evidenceRefs: ["conversation-follow-up"],
    },
    {
      id: "dispute",
      category: "DisputeResolution",
      status: "disputed",
      required: true,
      confirmationRequired: true,
      confirmationRefs: ["dispute-follow-up-requested"],
    },
  ],
  outstandingItems: [{ id: "follow-up-visit" }],
};

test("characterizes all representative fixture families without runtime data", () => {
  const report = characterizeObligationEvidence(
    representativeFixtures,
    mixedCompletedProject
  );

  assert.equal(report.fixtureCount, 12);
  assert.equal(report.findings.length, 12);
  assert.deepEqual(
    report.findings.map(({ family }) => family),
    representativeFixtures.map(({ family }) => family)
  );
});

test("completion artifacts and Project Folder documents are supporting only", () => {
  const report = characterizeObligationEvidence(representativeFixtures);

  assert.deepEqual(
    report.supportingOnlyEvidence.map(({ fixtureId }) => fixtureId),
    ["completion-sheet-artifact", "project-folder-document"]
  );
  assert.ok(
    report.supportingOnlyEvidence.every(
      ({ result }) =>
        result.evidenceTrust === OBLIGATION_EVIDENCE_TRUST.SUPPORTED
    )
  );
});

test("external payment and inspection evidence are authoritative and usable", () => {
  const report = characterizeObligationEvidence(representativeFixtures);

  assert.deepEqual(
    report.usableAuthoritativeEvidence.map(({ fixtureId }) => fixtureId),
    ["external-payment-receipt", "external-inspection-result"]
  );
});

test("display confirmation, payment claim, and emergency review stay unsafe", () => {
  const report = characterizeObligationEvidence(representativeFixtures);
  const unsafeIds = report.unsafeEvidence.map(({ fixtureId }) => fixtureId);

  assert.ok(unsafeIds.includes("closeout-display-confirmed"));
  assert.ok(unsafeIds.includes("self-reported-payment"));
  assert.ok(unsafeIds.includes("emergency-review-submitted"));
});

test("warranty and dispute fixtures report missing acknowledgement provenance", () => {
  const report = characterizeObligationEvidence(representativeFixtures);

  assert.deepEqual(report.missingProvenance, [
    {
      fixtureId: "closeout-awaiting-confirmation",
      family: "Completion closeout card awaiting customer confirmation",
      fields: ["confirmationRefs"],
    },
    {
      fixtureId: "warranty-no-acknowledgement",
      family: "Warranty offered without acknowledgement",
      fields: ["confirmationRefs"],
    },
    {
      fixtureId: "dispute-follow-up-requested",
      family: "Dispute or follow-up requested",
      fields: ["confirmationRefs"],
    },
  ]);
});

test("only usable evidence references reach Closure readiness", () => {
  const report = characterizeObligationEvidence(
    representativeFixtures,
    mixedCompletedProject
  );

  assert.deepEqual(
    report.closureReferences.evidence.map(({ id }) => id),
    [
      "completion-sheet-artifact",
      "external-payment-receipt",
      "project-folder-document",
      "external-inspection-result",
    ]
  );
  assert.deepEqual(report.closureReferences.confirmations, []);
});

test("mixed completed project remains blocked from Closure", () => {
  const report = characterizeObligationEvidence(
    representativeFixtures,
    mixedCompletedProject
  );
  const blockerCodes = report.closureReadiness.blockers.map(({ code }) => code);

  assert.equal(report.closureReadiness.closureReady, false);
  assert.equal(report.closureReadiness.riskLevel, "HIGH");
  assert.ok(blockerCodes.includes("open-obligation"));
  assert.ok(blockerCodes.includes("disputed-obligation"));
  assert.ok(blockerCodes.includes("required-confirmation-missing"));
  assert.ok(blockerCodes.includes("required-evidence-missing"));
  assert.ok(blockerCodes.includes("outstanding-items-remain"));
});

test("human review triggers preserve blocker and warning codes", () => {
  const report = characterizeObligationEvidence(representativeFixtures);
  const paymentClaim = report.humanReviewTriggers.find(
    ({ fixtureId }) => fixtureId === "self-reported-payment"
  );

  assert.ok(paymentClaim.blockerCodes.includes("claim-not-resolution-authority"));
  assert.deepEqual(paymentClaim.warningCodes, ["self-reported-claim"]);
  assert.equal(report.blockerFrequency["claim-not-resolution-authority"], 3);
});

test("characterization is deterministic and does not mutate fixtures or input", () => {
  const fixtures = structuredClone(representativeFixtures);
  const closureInput = structuredClone(mixedCompletedProject);
  const fixturesBefore = structuredClone(fixtures);
  const closureBefore = structuredClone(closureInput);

  const first = characterizeObligationEvidence(fixtures, closureInput);
  first.findings[0].result.blockers.push({ code: "mutation-attempt" });
  const second = characterizeObligationEvidence(fixtures, closureInput);

  assert.deepEqual(fixtures, fixturesBefore);
  assert.deepEqual(closureInput, closureBefore);
  assert.deepEqual(
    second,
    characterizeObligationEvidence(fixtures, closureInput)
  );
});
