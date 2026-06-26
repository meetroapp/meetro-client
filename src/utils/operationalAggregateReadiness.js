import {
  characterizeOperationalAggregateSources,
} from "./operationalAggregateSourceCharacterization.js";

const OPERATIONAL_AGGREGATE_READINESS = Object.freeze({
  READY_FOR_READ_PROJECTION: "READY_FOR_READ_PROJECTION",
  NEEDS_REVIEW_BEFORE_PROJECTION: "NEEDS_REVIEW_BEFORE_PROJECTION",
  BLOCKED_FROM_PROJECTION: "BLOCKED_FROM_PROJECTION",
  NOT_OPERATIONAL_SOURCE: "NOT_OPERATIONAL_SOURCE",
});

const REVIEWABLE_ERROR_CODES = new Set([
  "aggregate-id-required",
  "unsupported-aggregate-type",
  "completion-aggregate-reference-required",
  "completion-aggregate-context-unavailable",
  "recurring-scope-required",
  "recurring-scope-id-required",
  "recurring-parent-provenance-missing",
]);

const BLOCKED_CODES = new Set([
  "service-request-cannot-own-aggregate-identity",
  "classification-cannot-create-aggregate-id",
  "classification-aggregate-type-conflict",
  "conversation-authority-overreach",
  "schedule-cannot-create-aggregate",
  "schedule-completion-is-not-work-completion",
  "quote-cannot-create-aggregate",
  "quote-cannot-replace-aggregate-scope",
  "completion-aggregate-id-conflict",
  "completion-cannot-change-aggregate-type",
  "completion-aggregate-type-mismatch",
  "completion-cannot-authorize-closure",
  "closure-aggregate-id-conflict",
  "closure-aggregate-type-conflict",
  "closure-cannot-own-source-evidence",
  "closure-authority-from-non-authoritative-state",
  "history-authority-overreach",
  "aggregate-closure-cannot-terminate-relationship",
  "compatibility-id-cannot-be-authority",
  "compatibility-id-used-as-aggregate-id",
  "display-match-cannot-be-authority",
  "recurring-parent-scope-conflict",
  "recurring-cycle-scope-conflict",
  "recurring-occurrence-scope-conflict",
  "recurring-occurrence-cannot-close-parent",
  "recurring-occurrence-closure-cannot-close-parent",
  "recurring-occurrence-completion-closes-parent",
]);

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const clone = (value) => {
  if (Array.isArray(value)) return value.map(clone);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, clone(nested)]),
  );
};

const isCharacterization = (value) =>
  isRecord(value) &&
  Array.isArray(value.authorityResults) &&
  isRecord(value.summary);

const uniqueFindings = (findings) => {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = [
      finding.code,
      finding.field,
      finding.fixtureId,
      finding.sourceType,
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const findingsFor = (report, section, fixtureId) =>
  (Array.isArray(report[section]) ? report[section] : []).filter(
    (finding) => finding.fixtureId === fixtureId,
  );

const authorityFinding = (
  finding,
  fixtureId,
  sourceType,
  severity,
) => ({
  fixtureId,
  sourceType,
  code: finding.code,
  field: finding.field,
  message: finding.message,
  severity,
});

const collectFixtureFindings = (report, authorityResult) => {
  const fixtureId = authorityResult.fixtureId;
  const sourceType = authorityResult.sourceType;
  const result = authorityResult.result;
  const sections = [
    "collisions",
    "missingAggregateIdentity",
    "classificationContinuity",
    "completionCoverage",
    "closureReadiness",
    "recurringScopeReadiness",
    "provenanceQuality",
    "compatibilityRisks",
  ];
  const characterized = sections.flatMap((section) =>
    findingsFor(report, section, fixtureId),
  );
  const errors = result.errors.map((finding) =>
    authorityFinding(finding, fixtureId, sourceType, "BLOCKER"),
  );
  const warnings = [...result.warnings, ...result.reviewRequired].map(
    (finding) =>
      authorityFinding(finding, fixtureId, sourceType, "REVIEW"),
  );

  return uniqueFindings([...characterized, ...errors, ...warnings]);
};

const isCollision = (finding) =>
  finding.code.startsWith("aggregate-id-collides-");

const isBlockedFinding = (finding) =>
  isCollision(finding) || BLOCKED_CODES.has(finding.code);

const isReviewableFinding = (finding) =>
  REVIEWABLE_ERROR_CODES.has(finding.code) ||
  finding.severity === "REVIEW" ||
  finding.code === "operational-aggregate-identity-incomplete";

const hasReadOnlyCompatibility = (authorityResult) =>
  Array.isArray(authorityResult.authorityContext?.compatibilityRefs) &&
  authorityResult.authorityContext.compatibilityRefs.length > 0;

const compatibilityReviewFinding = (authorityResult) => ({
  fixtureId: authorityResult.fixtureId,
  sourceType: authorityResult.sourceType,
  code: "compatibility-reference-requires-review",
  field: "authorityContext.compatibilityRefs",
  message:
    "Compatibility identity remains read-reconciliation metadata and cannot make a source projection-ready.",
  severity: "REVIEW",
});

const recommendedActionFor = (readiness) => {
  switch (readiness) {
    case OPERATIONAL_AGGREGATE_READINESS.READY_FOR_READ_PROJECTION:
      return "Allow future read-only projection evaluation; preserve source authority and prohibit writes.";
    case OPERATIONAL_AGGREGATE_READINESS.NEEDS_REVIEW_BEFORE_PROJECTION:
      return "Review identity, provenance, scope, and partial lifecycle references before any read projection.";
    case OPERATIONAL_AGGREGATE_READINESS.BLOCKED_FROM_PROJECTION:
      return "Do not project; resolve identity collision or authority violation at the owning domain.";
    default:
      return "Keep as its current informational, communication, presentation, or relationship source.";
  }
};

const classifySource = (report, authorityResult) => {
  const findings = collectFixtureFindings(report, authorityResult);
  if (hasReadOnlyCompatibility(authorityResult)) {
    findings.push(compatibilityReviewFinding(authorityResult));
  }

  const blockers = uniqueFindings(findings.filter(isBlockedFinding));
  const warnings = uniqueFindings(
    findings.filter(
      (finding) =>
        !isBlockedFinding(finding) && isReviewableFinding(finding),
    ),
  );

  let readiness;
  if (blockers.length > 0) {
    readiness =
      OPERATIONAL_AGGREGATE_READINESS.BLOCKED_FROM_PROJECTION;
  } else if (!authorityResult.operationalBehaviorImplied) {
    readiness = OPERATIONAL_AGGREGATE_READINESS.NOT_OPERATIONAL_SOURCE;
  } else if (
    !authorityResult.hasAggregateIdentity ||
    warnings.length > 0
  ) {
    readiness =
      OPERATIONAL_AGGREGATE_READINESS.NEEDS_REVIEW_BEFORE_PROJECTION;
  } else {
    readiness =
      OPERATIONAL_AGGREGATE_READINESS.READY_FOR_READ_PROJECTION;
  }

  return {
    sourceKey: authorityResult.fixtureId,
    sourceDomain: authorityResult.sourceType,
    readiness,
    reasons: uniqueFindings([...blockers, ...warnings]).map(
      ({ code }) => code,
    ),
    warnings: clone(warnings),
    blockers: clone(blockers),
    recommendedAction: recommendedActionFor(readiness),
    authorityFindings: clone(
      authorityResult.result.authorityFindings || [],
    ),
  };
};

// Audit-only classification. Raw fixtures are characterized in memory; no
// aggregate identity is inferred, generated, persisted, or projected.
export function classifyOperationalAggregateReadiness(input = []) {
  const characterization = isCharacterization(input)
    ? clone(input)
    : characterizeOperationalAggregateSources(
        Array.isArray(input) ? input : [],
      );
  const classifications = characterization.authorityResults.map(
    (authorityResult) => classifySource(characterization, authorityResult),
  );
  const count = (readiness) =>
    classifications.filter(
      (classification) => classification.readiness === readiness,
    ).length;

  return {
    valid: classifications.length === characterization.summary.totalSources,
    summary: {
      totalSources: classifications.length,
      readyForReadProjection: count(
        OPERATIONAL_AGGREGATE_READINESS.READY_FOR_READ_PROJECTION,
      ),
      needsReviewBeforeProjection: count(
        OPERATIONAL_AGGREGATE_READINESS.NEEDS_REVIEW_BEFORE_PROJECTION,
      ),
      blockedFromProjection: count(
        OPERATIONAL_AGGREGATE_READINESS.BLOCKED_FROM_PROJECTION,
      ),
      notOperationalSource: count(
        OPERATIONAL_AGGREGATE_READINESS.NOT_OPERATIONAL_SOURCE,
      ),
    },
    classifications,
  };
}

export { OPERATIONAL_AGGREGATE_READINESS };
