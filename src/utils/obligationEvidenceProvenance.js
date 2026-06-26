export const OBLIGATION_EVIDENCE_TYPES = Object.freeze({
  COMPLETION_ARTIFACT: "completion_artifact",
  CUSTOMER_CONFIRMATION: "customer_confirmation",
  TENANT_CONFIRMATION: "tenant_confirmation",
  PAYMENT_CLAIM: "payment_claim",
  PAYMENT_RECEIPT: "payment_receipt",
  PERMIT_STATUS: "permit_status",
  INSPECTION_STATUS: "inspection_status",
  WARRANTY_HANDOFF: "warranty_handoff",
  DOCUMENT_DELIVERY: "document_delivery",
  FOLLOW_UP_COMPLETION: "follow_up_completion",
  DISPUTE_RESOLUTION: "dispute_resolution",
  UTILITY_APPROVAL: "utility_approval",
  EMERGENCY_REVIEW: "emergency_review",
  UNKNOWN: "unknown",
});

export const OBLIGATION_EVIDENCE_TRUST = Object.freeze({
  AUTHORITATIVE: "AUTHORITATIVE",
  SUPPORTED: "SUPPORTED",
  SELF_REPORTED: "SELF_REPORTED",
  PRESENTATION_ONLY: "PRESENTATION_ONLY",
  CONFLICTING: "CONFLICTING",
  MISSING: "MISSING",
  UNKNOWN: "UNKNOWN",
});

const EVIDENCE_POLICIES = Object.freeze({
  [OBLIGATION_EVIDENCE_TYPES.COMPLETION_ARTIFACT]: {
    owner: "Completion evidence owner",
    authorities: new Set([
      "completion_authority",
      "document_authority",
      "project_folder_authority",
    ]),
    actorRequired: true,
    attachmentRequired: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.CUSTOMER_CONFIRMATION]: {
    owner: "Completion confirmation authority",
    authorities: new Set([
      "completion_confirmation_authority",
      "participant_decision_authority",
    ]),
    actorRequired: true,
    confirmationRequired: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.TENANT_CONFIRMATION]: {
    owner: "Tenant participation authority",
    authorities: new Set([
      "tenant_participation_authority",
      "maintenance_authority",
    ]),
    actorRequired: true,
    confirmationRequired: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.PAYMENT_CLAIM]: {
    owner: "Invoice/payment authority",
    authorities: new Set(),
    actorRequired: true,
    selfReported: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.PAYMENT_RECEIPT]: {
    owner: "Invoice/payment authority",
    authorities: new Set([
      "payment_authority",
      "payment_processor",
      "external_payment_evidence",
    ]),
    actorRequired: true,
    attachmentRequired: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.PERMIT_STATUS]: {
    owner: "Permit authority",
    authorities: new Set([
      "permit_authority",
      "external_permit_authority",
    ]),
    actorRequired: true,
    attachmentRequired: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.INSPECTION_STATUS]: {
    owner: "Inspection authority",
    authorities: new Set([
      "inspection_authority",
      "external_inspection_authority",
    ]),
    actorRequired: true,
    attachmentRequired: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.WARRANTY_HANDOFF]: {
    owner: "Warranty/document handoff authority",
    authorities: new Set([
      "warranty_authority",
      "document_authority",
    ]),
    actorRequired: true,
    attachmentRequired: true,
    confirmationRequired: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.DOCUMENT_DELIVERY]: {
    owner: "Project Folder/document authority",
    authorities: new Set([
      "document_authority",
      "project_folder_authority",
    ]),
    actorRequired: true,
    attachmentRequired: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.FOLLOW_UP_COMPLETION]: {
    owner: "Task/scheduling obligation authority",
    authorities: new Set([
      "task_authority",
      "scheduling_authority",
    ]),
    actorRequired: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.DISPUTE_RESOLUTION]: {
    owner: "Dispute/change resolution authority",
    authorities: new Set([
      "dispute_authority",
      "change_order_authority",
    ]),
    actorRequired: true,
    confirmationRequired: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.UTILITY_APPROVAL]: {
    owner: "Utility approval authority",
    authorities: new Set([
      "utility_authority",
      "external_utility_authority",
    ]),
    actorRequired: true,
    attachmentRequired: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.EMERGENCY_REVIEW]: {
    owner: "Relationship/review authority",
    authorities: new Set(["relationship_review_authority"]),
    actorRequired: true,
    neverClosureEvidence: true,
  },
  [OBLIGATION_EVIDENCE_TYPES.UNKNOWN]: {
    owner: "Future obligation domain owner",
    authorities: new Set(),
    actorRequired: false,
    unknown: true,
  },
});

const PRESENTATION_SOURCES = new Set([
  "archive",
  "archived_conversation",
  "completed_history",
  "conversation_archive",
  "dashboard",
  "display_label",
  "history",
  "project_gallery",
  "ui_label",
  "work_center_card",
]);

const SELF_REPORTED_AUTHORITIES = new Set([
  "customer_claim",
  "current_viewer",
  "professional_claim",
  "self_reported",
  "ui_context",
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function stringValue(value) {
  return hasValue(value) ? String(value).trim() : "";
}

function normalizeToken(value) {
  return stringValue(value).toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function normalizeAuthority(authority) {
  if (typeof authority === "string") {
    return { name: normalizeToken(authority) };
  }

  if (!isRecord(authority)) return { name: "" };

  return {
    ...authority,
    name: normalizeToken(
      authority.name || authority.authority || authority.type
    ),
  };
}

function normalizeRefs(value) {
  if (!Array.isArray(value)) return [];
  return value.map(stringValue).filter(Boolean);
}

function createFinding(code, message, field = "") {
  return { code, message, field };
}

function addMissing(missingProvenance, blockers, field, code, message) {
  if (!missingProvenance.includes(field)) missingProvenance.push(field);
  blockers.push(createFinding(code, message, field));
}

function hasAuthorityConflict(input, authority) {
  return Boolean(
    (hasValue(authority.actorId) &&
      stringValue(authority.actorId) !== stringValue(input.actorId)) ||
      (hasValue(authority.actorRole) &&
        normalizeToken(authority.actorRole) !== normalizeToken(input.actorRole)) ||
      (hasValue(authority.aggregateId) &&
        stringValue(authority.aggregateId) !== stringValue(input.aggregateId)) ||
      (hasValue(authority.aggregateType) &&
        normalizeToken(authority.aggregateType) !==
          normalizeToken(input.aggregateType))
  );
}

// Pure provenance measurement only. A usable result means the evidence may be
// passed to a future adapter; it never resolves an obligation or authorizes
// Closure.
export function evaluateObligationEvidenceProvenance(input = {}) {
  const evidence = isRecord(input) ? input : {};
  const evidenceType = normalizeToken(evidence.evidenceType);
  const policy =
    EVIDENCE_POLICIES[evidenceType] ||
    EVIDENCE_POLICIES[OBLIGATION_EVIDENCE_TYPES.UNKNOWN];
  const source = normalizeToken(evidence.source);
  const authority = normalizeAuthority(evidence.authority);
  const attachmentRefs = normalizeRefs(evidence.attachmentRefs);
  const confirmationRefs = normalizeRefs(evidence.confirmationRefs);
  const blockers = [];
  const warnings = [];
  const missingProvenance = [];
  let evidenceTrust = OBLIGATION_EVIDENCE_TRUST.AUTHORITATIVE;

  if (!hasValue(evidence.obligationType)) {
    addMissing(
      missingProvenance,
      blockers,
      "obligationType",
      "obligation-type-required",
      "An explicit obligation type is required."
    );
  }

  if (!source) {
    addMissing(
      missingProvenance,
      blockers,
      "source",
      "source-provenance-required",
      "Evidence source provenance is required."
    );
  }

  if (!hasValue(evidence.aggregateId)) {
    addMissing(
      missingProvenance,
      blockers,
      "aggregateId",
      "aggregate-id-required",
      "Authoritative operational aggregate identity is required."
    );
  }

  if (!hasValue(evidence.aggregateType)) {
    addMissing(
      missingProvenance,
      blockers,
      "aggregateType",
      "aggregate-type-required",
      "Operational aggregate type is required."
    );
  }

  if (!hasValue(evidence.timestamp)) {
    addMissing(
      missingProvenance,
      blockers,
      "timestamp",
      "occurrence-timestamp-required",
      "Evidence occurrence time is required."
    );
  }

  if (!hasValue(evidence.recordedAt)) {
    addMissing(
      missingProvenance,
      blockers,
      "recordedAt",
      "recorded-at-required",
      "Evidence recording acknowledgement time is required."
    );
  }

  if (!hasValue(evidence.status)) {
    addMissing(
      missingProvenance,
      blockers,
      "status",
      "evidence-status-required",
      "Explicit evidence status is required."
    );
  }

  if (policy.actorRequired && !hasValue(evidence.actorId)) {
    addMissing(
      missingProvenance,
      blockers,
      "actorId",
      "actor-id-required",
      "Actor identity is required for action or confirmation evidence."
    );
  }

  if (policy.actorRequired && !hasValue(evidence.actorRole)) {
    addMissing(
      missingProvenance,
      blockers,
      "actorRole",
      "actor-role-required",
      "Authorization-derived actor role is required."
    );
  }

  if (!authority.name) {
    addMissing(
      missingProvenance,
      blockers,
      "authority",
      "evidence-authority-required",
      "Evidence authority provenance is required."
    );
  }

  if (PRESENTATION_SOURCES.has(source)) {
    evidenceTrust = OBLIGATION_EVIDENCE_TRUST.PRESENTATION_ONLY;
    blockers.push(
      createFinding(
        "presentation-source-not-evidence",
        "Display, archive, History, Dashboard, Work Center, or portfolio state is not obligation evidence.",
        "source"
      )
    );
  }

  if (policy.unknown) {
    evidenceTrust = OBLIGATION_EVIDENCE_TRUST.UNKNOWN;
    blockers.push(
      createFinding(
        "unknown-evidence-type",
        "Unknown evidence remains untrusted and requires human review.",
        "evidenceType"
      )
    );
  }

  if (policy.selfReported || SELF_REPORTED_AUTHORITIES.has(authority.name)) {
    evidenceTrust = OBLIGATION_EVIDENCE_TRUST.SELF_REPORTED;
    warnings.push(
      createFinding(
        "self-reported-claim",
        "Self-reported evidence is a claim for review, not domain authority.",
        "authority"
      )
    );
    blockers.push(
      createFinding(
        "claim-not-resolution-authority",
        "A self-reported claim cannot establish obligation resolution.",
        "evidenceType"
      )
    );
  }

  if (policy.neverClosureEvidence) {
    blockers.push(
      createFinding(
        "review-not-closure-evidence",
        "Review submission may support Relationship History but is not Closure evidence.",
        "evidenceType"
      )
    );
  }

  if (
    authority.name &&
    !policy.selfReported &&
    !policy.unknown &&
    !policy.neverClosureEvidence &&
    !policy.authorities.has(authority.name)
  ) {
    evidenceTrust = OBLIGATION_EVIDENCE_TRUST.UNKNOWN;
    blockers.push(
      createFinding(
        "unapproved-evidence-authority",
        "The declared authority is not approved for this evidence type.",
        "authority"
      )
    );
  }

  if (policy.attachmentRequired && attachmentRefs.length === 0) {
    addMissing(
      missingProvenance,
      blockers,
      "attachmentRefs",
      "attachment-reference-required",
      "This evidence type requires an explicit artifact or external evidence reference."
    );
  }

  if (policy.confirmationRequired && confirmationRefs.length === 0) {
    addMissing(
      missingProvenance,
      blockers,
      "confirmationRefs",
      "confirmation-reference-required",
      "This evidence type requires an explicit confirmation or acknowledgement reference."
    );
  }

  if (hasAuthorityConflict(evidence, authority)) {
    evidenceTrust = OBLIGATION_EVIDENCE_TRUST.CONFLICTING;
    blockers.push(
      createFinding(
        "evidence-provenance-conflict",
        "Declared authority provenance conflicts with actor or aggregate identity.",
        "authority"
      )
    );
  }

  if (
    evidenceType === OBLIGATION_EVIDENCE_TYPES.PAYMENT_RECEIPT &&
    !["payment_authority", "payment_processor", "external_payment_evidence"].includes(
      authority.name
    )
  ) {
    blockers.push(
      createFinding(
        "payment-authority-required",
        "Payment text or a payment claim is not payment receipt authority.",
        "authority"
      )
    );
  }

  if (
    [OBLIGATION_EVIDENCE_TYPES.PERMIT_STATUS,
      OBLIGATION_EVIDENCE_TYPES.INSPECTION_STATUS].includes(evidenceType) &&
    !policy.authorities.has(authority.name)
  ) {
    blockers.push(
      createFinding(
        "regulatory-authority-required",
        "Permit and inspection claims require their domain owner or explicit external authority.",
        "authority"
      )
    );
  }

  if (
    blockers.length > 0 &&
    evidenceTrust === OBLIGATION_EVIDENCE_TRUST.AUTHORITATIVE
  ) {
    evidenceTrust =
      missingProvenance.length > 0
        ? OBLIGATION_EVIDENCE_TRUST.MISSING
        : OBLIGATION_EVIDENCE_TRUST.UNKNOWN;
  }

  if (
    blockers.length === 0 &&
    [OBLIGATION_EVIDENCE_TYPES.COMPLETION_ARTIFACT,
      OBLIGATION_EVIDENCE_TYPES.DOCUMENT_DELIVERY].includes(evidenceType)
  ) {
    evidenceTrust = OBLIGATION_EVIDENCE_TRUST.SUPPORTED;
  }

  const usable =
    blockers.length === 0 &&
    [
      OBLIGATION_EVIDENCE_TRUST.AUTHORITATIVE,
      OBLIGATION_EVIDENCE_TRUST.SUPPORTED,
    ].includes(evidenceTrust);

  return {
    usable,
    evidenceTrust,
    blockers,
    warnings,
    missingProvenance: [...missingProvenance].sort(),
    recommendedOwner: policy.owner,
    requiresHumanReview: !usable || warnings.length > 0,
  };
}
