import {
  OBLIGATION_EVIDENCE_TRUST,
  OBLIGATION_EVIDENCE_TYPES,
  evaluateObligationEvidenceProvenance,
} from "./obligationEvidenceProvenance.js";
import { evaluateClosureReadiness } from "./closureReadinessContract.js";

const UNSAFE_TRUST = new Set([
  OBLIGATION_EVIDENCE_TRUST.SELF_REPORTED,
  OBLIGATION_EVIDENCE_TRUST.PRESENTATION_ONLY,
  OBLIGATION_EVIDENCE_TRUST.CONFLICTING,
]);

const UNSAFE_BLOCKERS = new Set([
  "claim-not-resolution-authority",
  "evidence-provenance-conflict",
  "payment-authority-required",
  "presentation-source-not-evidence",
  "regulatory-authority-required",
  "review-not-closure-evidence",
  "unapproved-evidence-authority",
]);

const CONFIRMATION_TYPES = new Set([
  OBLIGATION_EVIDENCE_TYPES.CUSTOMER_CONFIRMATION,
  OBLIGATION_EVIDENCE_TYPES.TENANT_CONFIRMATION,
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      cloneValue(nestedValue),
    ])
  );
}

function text(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function countByCode(findings, property) {
  const counts = {};

  findings.forEach((finding) => {
    finding.result[property].forEach(({ code }) => {
      counts[code] = (counts[code] || 0) + 1;
    });
  });

  return Object.fromEntries(
    Object.entries(counts).sort(
      ([leftCode, leftCount], [rightCode, rightCount]) =>
        rightCount - leftCount || leftCode.localeCompare(rightCode)
    )
  );
}

function characterizeFixture(fixture, index) {
  const safeFixture = isRecord(fixture) ? cloneValue(fixture) : {};
  const fixtureId =
    text(safeFixture.fixtureId || safeFixture.id) || `fixture-${index + 1}`;
  const evidence = isRecord(safeFixture.evidence)
    ? safeFixture.evidence
    : safeFixture;
  const result = evaluateObligationEvidenceProvenance(evidence);
  const blockerCodes = result.blockers.map(({ code }) => code);
  const unsafe =
    UNSAFE_TRUST.has(result.evidenceTrust) ||
    blockerCodes.some((code) => UNSAFE_BLOCKERS.has(code));

  return {
    fixtureId,
    family: text(safeFixture.family) || "Unspecified fixture",
    evidenceType:
      text(evidence.evidenceType) || OBLIGATION_EVIDENCE_TYPES.UNKNOWN,
    obligationType: text(evidence.obligationType),
    source: text(evidence.source),
    result,
    unsafe,
  };
}

function createClosureReferences(findings) {
  const evidence = [];
  const confirmations = [];

  findings.forEach((finding) => {
    if (!finding.result.usable) return;

    const reference = {
      id: finding.fixtureId,
      evidenceType: finding.evidenceType,
      evidenceTrust: finding.result.evidenceTrust,
      source: finding.source,
    };

    if (CONFIRMATION_TYPES.has(finding.evidenceType)) {
      confirmations.push(reference);
    } else {
      evidence.push(reference);
    }
  });

  return { evidence, confirmations };
}

// Fixture-only measurement. This utility never reads application data and only
// lets provenance-qualified references reach the advisory Closure evaluator.
export function characterizeObligationEvidence(
  fixtures = [],
  closureInput = null
) {
  const safeFixtures = Array.isArray(fixtures) ? fixtures : [];
  const findings = safeFixtures.map(characterizeFixture);
  const usableAuthoritativeEvidence = findings.filter(
    ({ result }) =>
      result.usable &&
      result.evidenceTrust === OBLIGATION_EVIDENCE_TRUST.AUTHORITATIVE
  );
  const supportingOnlyEvidence = findings.filter(
    ({ result }) =>
      result.usable &&
      result.evidenceTrust === OBLIGATION_EVIDENCE_TRUST.SUPPORTED
  );
  const blockedEvidence = findings.filter(({ result }) => !result.usable);
  const unsafeEvidence = findings.filter(({ unsafe }) => unsafe);
  const missingProvenance = findings
    .filter(({ result }) => result.missingProvenance.length > 0)
    .map(({ fixtureId, family, result }) => ({
      fixtureId,
      family,
      fields: [...result.missingProvenance],
    }));
  const humanReviewTriggers = findings
    .filter(({ result }) => result.requiresHumanReview)
    .map(({ fixtureId, family, result }) => ({
      fixtureId,
      family,
      blockerCodes: result.blockers.map(({ code }) => code).sort(),
      warningCodes: result.warnings.map(({ code }) => code).sort(),
    }));
  const trustDistribution = {};

  findings.forEach(({ result }) => {
    trustDistribution[result.evidenceTrust] =
      (trustDistribution[result.evidenceTrust] || 0) + 1;
  });

  const closureReferences = createClosureReferences(findings);
  const closureReadiness = isRecord(closureInput)
    ? evaluateClosureReadiness({
        ...cloneValue(closureInput),
        evidence: closureReferences.evidence,
        confirmations: closureReferences.confirmations,
      })
    : null;

  return {
    fixtureCount: findings.length,
    usableAuthoritativeEvidence,
    supportingOnlyEvidence,
    unsafeEvidence,
    blockedEvidence,
    missingProvenance,
    humanReviewTriggers,
    trustDistribution: Object.fromEntries(
      Object.entries(trustDistribution).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    ),
    blockerFrequency: countByCode(findings, "blockers"),
    warningFrequency: countByCode(findings, "warnings"),
    closureReferences,
    closureReadiness,
    findings,
  };
}
