import { CANONICAL_COMMERCIAL_AUTHORITY_SOURCE } from "./canonicalCommercialAuthority.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[0-9a-f]{64}$/i;

export const FINDING_CONFIRMATION_STATES = Object.freeze([
  "PROPOSED",
  "CONFIRMED",
]);
export const FINDING_RESOLUTION_STATES = Object.freeze([
  "OPEN",
  "PARTIALLY_RESOLVED",
  "RESOLVED",
  "DEFERRED",
]);
export const RECOMMENDATION_KINDS = Object.freeze([
  "PRIMARY",
  "ALTERNATIVE",
]);
export const RECOMMENDATION_STATUSES = Object.freeze([
  "ACTIVE",
  "ACCEPTED",
  "DECLINED",
  "DEFERRED",
  "SUPERSEDED",
  "WITHDRAWN",
  "EXCLUDED_FROM_CURRENT_QUOTE",
  "SEPARATE_PROPOSAL_REQUIRED",
]);

const FINDING_EVIDENCE_TYPES = new Set([
  "PROFESSIONAL_OBSERVATION",
  "PHOTO_MEDIA",
  "SPECIALIST_CONTRIBUTION",
  "MEASUREMENT",
  "COMMUNICATION",
  "AI_PROPOSAL_LINEAGE",
]);
const FINDING_RELATIONSHIPS = new Set([
  "EXPLAINS",
  "RELATED",
  "CONTRADICTS",
]);
const CUSTOMER_CONSTRAINT_TYPES = new Set([
  "BUDGET",
  "AVAILABILITY",
  "ACCESS",
  "CUSTOMER_SUPPLIED_MATERIAL",
  "OTHER",
]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, keys) {
  return (
    isPlainObject(value) &&
    Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key))
  );
}

function canonicalUuid(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function canonicalTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function boundedText(value, maximum, { nullable = false, empty = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || value.length > maximum) return null;
  if (!empty && !value.trim()) return null;
  return value;
}

function normalizeFindingVersion(value) {
  const keys = [
    "version",
    "evaluationVersion",
    "statement",
    "confirmationState",
    "resolutionState",
    "createdByParticipantId",
    "integrity",
    "createdAt",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const version = positiveInteger(value.version);
  const evaluationVersion = positiveInteger(value.evaluationVersion);
  const statement = boundedText(value.statement, 5000);
  const createdByParticipantId = canonicalUuid(value.createdByParticipantId);
  const createdAt = canonicalTimestamp(value.createdAt);
  const integrity = value.integrity;
  if (
    !version ||
    !evaluationVersion ||
    !statement ||
    !FINDING_CONFIRMATION_STATES.includes(value.confirmationState) ||
    !FINDING_RESOLUTION_STATES.includes(value.resolutionState) ||
    !createdByParticipantId ||
    !hasExactKeys(integrity, ["algorithm", "hash", "version"]) ||
    integrity.algorithm !== "sha256" ||
    !HASH_PATTERN.test(integrity.hash) ||
    positiveInteger(integrity.version) !== 1 ||
    !createdAt
  ) {
    return null;
  }
  return {
    version,
    evaluationVersion,
    statement,
    confirmationState: value.confirmationState,
    resolutionState: value.resolutionState,
    createdByParticipantId,
    integrity: {
      algorithm: "sha256",
      hash: integrity.hash.toLowerCase(),
      version: 1,
    },
    createdAt,
  };
}

function normalizeConcernLink(value) {
  const keys = [
    "id",
    "concernId",
    "relationshipType",
    "createdByParticipantId",
    "createdAt",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const id = canonicalUuid(value.id);
  const concernId = canonicalUuid(value.concernId);
  const createdByParticipantId = canonicalUuid(value.createdByParticipantId);
  const createdAt = canonicalTimestamp(value.createdAt);
  if (
    !id ||
    !concernId ||
    !FINDING_RELATIONSHIPS.has(value.relationshipType) ||
    !createdByParticipantId ||
    !createdAt
  ) {
    return null;
  }
  return {
    id,
    concernId,
    relationshipType: value.relationshipType,
    createdByParticipantId,
    createdAt,
  };
}

function normalizeEvidenceReference(value) {
  const keys = [
    "id",
    "findingVersion",
    "evidenceType",
    "referenceNamespace",
    "referenceId",
    "recordedByParticipantId",
    "createdAt",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const id = canonicalUuid(value.id);
  const findingVersion = positiveInteger(value.findingVersion);
  const referenceNamespace = boundedText(value.referenceNamespace, 200);
  const referenceId = boundedText(value.referenceId, 500);
  const recordedByParticipantId = canonicalUuid(value.recordedByParticipantId);
  const createdAt = canonicalTimestamp(value.createdAt);
  if (
    !id ||
    !findingVersion ||
    !FINDING_EVIDENCE_TYPES.has(value.evidenceType) ||
    !referenceNamespace ||
    !referenceId ||
    !recordedByParticipantId ||
    !createdAt
  ) {
    return null;
  }
  return {
    id,
    findingVersion,
    evidenceType: value.evidenceType,
    referenceNamespace,
    referenceId,
    recordedByParticipantId,
    createdAt,
  };
}

export function validateCanonicalFindingProjection(value) {
  const keys = [
    "authoritySource",
    "id",
    "evaluationId",
    "jobId",
    "requestId",
    "relationshipId",
    "authorParticipantId",
    "currentVersion",
    "statement",
    "confirmationState",
    "resolutionState",
    "evaluationVersion",
    "createdAt",
    "versions",
    "concernLinks",
    "evidenceReferences",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const id = canonicalUuid(value.id);
  const evaluationId = canonicalUuid(value.evaluationId);
  const jobId = canonicalUuid(value.jobId);
  const requestId = positiveInteger(value.requestId);
  const relationshipId = positiveInteger(value.relationshipId);
  const authorParticipantId = canonicalUuid(value.authorParticipantId);
  const currentVersion = positiveInteger(value.currentVersion);
  const statement = boundedText(value.statement, 5000);
  const evaluationVersion = positiveInteger(value.evaluationVersion);
  const createdAt = canonicalTimestamp(value.createdAt);
  const versions = Array.isArray(value.versions)
    ? value.versions.map(normalizeFindingVersion)
    : null;
  const concernLinks = Array.isArray(value.concernLinks)
    ? value.concernLinks.map(normalizeConcernLink)
    : null;
  const evidenceReferences = Array.isArray(value.evidenceReferences)
    ? value.evidenceReferences.map(normalizeEvidenceReference)
    : null;
  const current = versions?.at(-1);
  if (
    value.authoritySource !== CANONICAL_COMMERCIAL_AUTHORITY_SOURCE ||
    !id ||
    !evaluationId ||
    !jobId ||
    !requestId ||
    !relationshipId ||
    !authorParticipantId ||
    !currentVersion ||
    !statement ||
    !FINDING_CONFIRMATION_STATES.includes(value.confirmationState) ||
    !FINDING_RESOLUTION_STATES.includes(value.resolutionState) ||
    !evaluationVersion ||
    !createdAt ||
    !versions ||
    versions.length === 0 ||
    versions.length > 100 ||
    versions.some((version) => !version) ||
    versions.some((version, index) => version.version !== index + 1) ||
    !concernLinks ||
    concernLinks.length > 100 ||
    concernLinks.some((link) => !link) ||
    !evidenceReferences ||
    evidenceReferences.length > 200 ||
    evidenceReferences.some((reference) => !reference) ||
    evidenceReferences.some(
      (reference) => reference.findingVersion > currentVersion
    ) ||
    current.version !== currentVersion ||
    current.evaluationVersion !== evaluationVersion ||
    current.statement !== statement ||
    current.confirmationState !== value.confirmationState ||
    current.resolutionState !== value.resolutionState
  ) {
    return null;
  }
  return {
    authoritySource: CANONICAL_COMMERCIAL_AUTHORITY_SOURCE,
    id,
    evaluationId,
    jobId,
    requestId,
    relationshipId,
    authorParticipantId,
    currentVersion,
    statement,
    confirmationState: value.confirmationState,
    resolutionState: value.resolutionState,
    evaluationVersion,
    createdAt,
    versions,
    concernLinks,
    evidenceReferences,
  };
}

function normalizeRecommendationVersion(value) {
  const keys = [
    "version",
    "evaluationVersion",
    "statement",
    "status",
    "createdAt",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const version = positiveInteger(value.version);
  const evaluationVersion = positiveInteger(value.evaluationVersion);
  const statement = boundedText(value.statement, 5000);
  const createdAt = canonicalTimestamp(value.createdAt);
  if (
    !version ||
    !evaluationVersion ||
    !statement ||
    !RECOMMENDATION_STATUSES.includes(value.status) ||
    !createdAt
  ) {
    return null;
  }
  return { version, evaluationVersion, statement, status: value.status, createdAt };
}

function normalizeConstraint(value) {
  const keys = [
    "id",
    "type",
    "statement",
    "evidenceClassification",
    "createdAt",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const id = canonicalUuid(value.id);
  const statement = boundedText(value.statement, 2000);
  const evidenceClassification = boundedText(value.evidenceClassification, 160);
  const createdAt = canonicalTimestamp(value.createdAt);
  if (
    !id ||
    !CUSTOMER_CONSTRAINT_TYPES.has(value.type) ||
    !statement ||
    !evidenceClassification ||
    !createdAt
  ) {
    return null;
  }
  return { id, type: value.type, statement, evidenceClassification, createdAt };
}

function normalizeDisposition(value) {
  const keys = [
    "id",
    "previousVersion",
    "version",
    "previousStatus",
    "disposition",
    "authorityClassification",
    "decisionEvidenceNote",
    "replacementRecommendationId",
    "createdAt",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const id = canonicalUuid(value.id);
  const previousVersion = positiveInteger(value.previousVersion);
  const version = positiveInteger(value.version);
  const authorityClassification = boundedText(value.authorityClassification, 160);
  const decisionEvidenceNote = boundedText(value.decisionEvidenceNote, 2000, {
    nullable: true,
    empty: true,
  });
  const replacementRecommendationId = canonicalUuid(
    value.replacementRecommendationId,
    { nullable: true }
  );
  const createdAt = canonicalTimestamp(value.createdAt);
  if (
    !id ||
    !previousVersion ||
    !version ||
    version !== previousVersion + 1 ||
    !RECOMMENDATION_STATUSES.includes(value.previousStatus) ||
    !RECOMMENDATION_STATUSES.includes(value.disposition) ||
    !authorityClassification ||
    (value.decisionEvidenceNote != null && decisionEvidenceNote == null) ||
    (value.replacementRecommendationId != null && !replacementRecommendationId) ||
    !createdAt
  ) {
    return null;
  }
  return {
    id,
    previousVersion,
    version,
    previousStatus: value.previousStatus,
    disposition: value.disposition,
    authorityClassification,
    decisionEvidenceNote,
    replacementRecommendationId,
    createdAt,
  };
}

export function validateCanonicalRecommendationProjection(value) {
  const keys = [
    "id",
    "jobId",
    "findingId",
    "evaluationId",
    "kind",
    "primaryRecommendationId",
    "currentVersion",
    "evaluationVersion",
    "statement",
    "status",
    "createdAt",
    "versionCreatedAt",
    "versions",
    "constraints",
    "dispositions",
  ];
  if (!hasExactKeys(value, keys)) return null;
  const id = canonicalUuid(value.id);
  const jobId = canonicalUuid(value.jobId);
  const findingId = canonicalUuid(value.findingId);
  const evaluationId = canonicalUuid(value.evaluationId);
  const primaryRecommendationId = canonicalUuid(value.primaryRecommendationId, {
    nullable: true,
  });
  const currentVersion = positiveInteger(value.currentVersion);
  const evaluationVersion = positiveInteger(value.evaluationVersion);
  const statement = boundedText(value.statement, 5000);
  const createdAt = canonicalTimestamp(value.createdAt);
  const versionCreatedAt = canonicalTimestamp(value.versionCreatedAt);
  const versions = Array.isArray(value.versions)
    ? value.versions.map(normalizeRecommendationVersion)
    : null;
  const constraints = Array.isArray(value.constraints)
    ? value.constraints.map(normalizeConstraint)
    : null;
  const dispositions = Array.isArray(value.dispositions)
    ? value.dispositions.map(normalizeDisposition)
    : null;
  const current = versions?.at(-1);
  if (
    !id ||
    !jobId ||
    !findingId ||
    !evaluationId ||
    !RECOMMENDATION_KINDS.includes(value.kind) ||
    (value.kind === "PRIMARY" && value.primaryRecommendationId != null) ||
    (value.kind === "ALTERNATIVE" && !primaryRecommendationId) ||
    !currentVersion ||
    !evaluationVersion ||
    !statement ||
    !RECOMMENDATION_STATUSES.includes(value.status) ||
    !createdAt ||
    !versionCreatedAt ||
    !versions ||
    versions.length === 0 ||
    versions.length > 100 ||
    versions.some((version) => !version) ||
    versions.some((version, index) => version.version !== index + 1) ||
    !constraints ||
    constraints.length > 100 ||
    constraints.some((constraint) => !constraint) ||
    !dispositions ||
    dispositions.length > 100 ||
    dispositions.some((disposition) => !disposition) ||
    dispositions.some(
      (disposition) =>
        disposition.version > currentVersion ||
        versions[disposition.previousVersion - 1]?.status !==
          disposition.previousStatus ||
        versions[disposition.version - 1]?.status !== disposition.disposition
    ) ||
    current.version !== currentVersion ||
    current.evaluationVersion !== evaluationVersion ||
    current.statement !== statement ||
    current.status !== value.status ||
    current.createdAt !== versionCreatedAt
  ) {
    return null;
  }
  return {
    id,
    jobId,
    findingId,
    evaluationId,
    kind: value.kind,
    primaryRecommendationId,
    currentVersion,
    evaluationVersion,
    statement,
    status: value.status,
    createdAt,
    versionCreatedAt,
    versions,
    constraints,
    dispositions,
  };
}

export function validateCanonicalFindings(value, { evaluationId } = {}) {
  const expectedEvaluationId = canonicalUuid(evaluationId);
  if (!expectedEvaluationId || !Array.isArray(value) || value.length > 100) {
    return null;
  }
  const findings = value.map(validateCanonicalFindingProjection);
  if (
    findings.some((finding) => !finding) ||
    findings.some((finding) => finding.evaluationId !== expectedEvaluationId) ||
    new Set(findings.map((finding) => finding.id)).size !== findings.length
  ) {
    return null;
  }
  return findings;
}

export function validateCanonicalRecommendations(value, { finding } = {}) {
  const canonicalFinding = validateCanonicalFindingProjection(finding);
  if (!canonicalFinding || !Array.isArray(value) || value.length > 100) {
    return null;
  }
  const recommendations = value.map(validateCanonicalRecommendationProjection);
  if (
    recommendations.some((recommendation) => !recommendation) ||
    recommendations.some(
      (recommendation) =>
        recommendation.findingId !== canonicalFinding.id ||
        recommendation.evaluationId !== canonicalFinding.evaluationId ||
        recommendation.jobId !== canonicalFinding.jobId
    ) ||
    new Set(recommendations.map((recommendation) => recommendation.id)).size !==
      recommendations.length
  ) {
    return null;
  }
  const primaries = new Set(
    recommendations
      .filter((recommendation) => recommendation.kind === "PRIMARY")
      .map((recommendation) => recommendation.id)
  );
  if (
    recommendations.some(
      (recommendation) =>
        recommendation.kind === "ALTERNATIVE" &&
        !primaries.has(recommendation.primaryRecommendationId)
    )
  ) {
    return null;
  }
  return recommendations;
}
