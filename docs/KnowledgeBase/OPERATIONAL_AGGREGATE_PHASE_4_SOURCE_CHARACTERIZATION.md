# Operational Aggregate Phase 4 - Fixture-Based Source Characterization

## Executive Summary

Phase 4 adds a fixture-only harness that measures representative Meetro source shapes against the Phase 3 Operational Aggregate authority contract. It does not read runtime data, create aggregates, generate identity, alter lifecycle state, or recommend automatic fixes.

The harness preserves each sanitized fixture, builds only an in-memory authority context, calls `validateOperationalAggregateAuthority()`, and returns structured characterization findings.

## Purpose

The harness answers:

> How much of the future Operational Aggregate authority model can current source shapes represent without identity promotion, inference, or ownership conflict?

It measures eight areas:

1. identity collisions
2. missing aggregate identity
3. classification continuity
4. Completion coverage
5. Closure readiness
6. RecurringService scope readiness
7. compatibility identifier risk
8. provenance quality

## Fixture Model

Representative fixture families include:

- homeowner and Service Request records
- lead and request records
- Conversation metadata
- schedule records
- quote records
- Emergency records
- Completion records
- Closure records
- History and timeline records
- Relationship and contact records
- compatibility references

A fixture may provide a complete `authorityContext` or a single sanitized `record` with a `sourceType`. Single-record normalization preserves only explicit values. It never creates an aggregate ID or promotes a legacy ID.

## Output Model

```js
{
  valid,
  summary: {
    totalSources,
    sourcesWithAggregateIdentity,
    sourcesMissingAggregateIdentity,
    collisionCount,
    classificationContinuityIssues,
    completionCoverageIssues,
    closureReadinessIssues,
    recurringScopeIssues,
    provenanceIssues,
    compatibilityWarnings
  },
  collisions,
  missingAggregateIdentity,
  classificationContinuity,
  completionCoverage,
  closureReadiness,
  recurringScopeReadiness,
  provenanceQuality,
  compatibilityRisks,
  authorityResults
}
```

Every authority result preserves:

- fixture identity
- source type
- whether operational behavior is implied
- whether canonical aggregate identity is present
- the in-memory authority context
- the complete Phase 3 validator result

## Identity Collision Characterization

The harness reports aggregate identity collisions with:

- Service Request identity
- Conversation identity
- schedule identity
- quote and quote-request identity
- Completion identity
- Emergency identity
- Relationship identity
- compatibility identity

Collisions are blockers. The harness does not rename either side.

## Missing Aggregate Identity

A Service Request without an aggregate is valid when it remains intake-only.

Missing aggregate identity is reported only when the fixture explicitly or structurally implies operational behavior, including:

- Project, WorkOrder, Emergency, RecurringService, Completion, or Closure source type
- work-started or completed state
- embedded Completion or Closure context
- an explicit `operationalBehaviorImplied` fixture marker

Both `aggregateId` and a supported `aggregateType` are required for complete work authority.

## Classification Continuity

Characterization measures preservation of:

- classification
- evidence
- confidence
- review status
- provenance
- prior classification history

`Unknown` remains a valid classification and may remain review-required. A recommendation that conflicts with an explicit aggregate type is reported without changing either value.

## Completion Coverage

Completion-like fixtures are measured for:

- `completionId`
- `aggregateId`
- `aggregateType`
- work-performed status
- Completion timestamp
- performer identity

Completion type mismatch, missing aggregate references, and attempts to authorize Closure are reported. Completion remains performance evidence only.

## Closure Readiness

Closure-like fixtures are measured for:

- aggregate reference
- obligation registry reference
- source-owned evidence references
- unresolved obligation status
- review status

The harness reports Closure that relies on Completion alone, History, archive state, or display labels. It does not decide obligation applicability or Closure authorization.

## RecurringService Scope

RecurringService characterization preserves the distinction between:

- parent
- cycle
- occurrence

Missing or conflicting scope identity is reported. An occurrence Completion or Closure that attempts to close the parent service is a blocker.

## Compatibility Risks

The following remain non-authoritative:

- request-derived project IDs
- Conversation-derived project keys
- quote-derived job IDs
- schedule-derived request IDs
- Emergency IDs projected as request or project IDs
- generic local IDs

Compatibility identity may support read reconciliation when provenance and warnings remain explicit. It cannot satisfy aggregate identity.

## Provenance Quality

Each source is measured for:

- source domain
- source ID
- created by
- created at
- updated by
- updated at
- decision provenance
- backend acknowledgement status

Missing provenance is reported field by field. Characterization does not invent provenance from the current viewer, display state, or local timestamps.

## Test Coverage

The focused suite covers:

- empty and fully typed fixture sets
- intake-only Service Requests
- `Unknown` classification
- Project and WorkOrder identity gaps
- Emergency, Conversation, schedule, quote, Completion, and compatibility collisions
- Completion reference and type gaps
- Completion-only Closure
- History authority overreach
- RecurringService scope gaps
- occurrence-to-parent closure attempts
- low provenance
- mixed summary counts
- deterministic, immutable, storage-independent execution

## Characterization Findings

The representative fixtures establish:

1. Intake can remain valid without an aggregate until operational behavior is claimed.
2. Legacy domain identifiers cannot safely become aggregate identity.
3. Aggregate type alone is insufficient without stable aggregate identity.
4. Classification continuity requires more than the latest label.
5. Current-style Completion records need explicit aggregate, timestamp, and performer provenance.
6. Closure remains review-oriented because obligation and authorization sources are not yet authoritative.
7. RecurringService cannot be represented safely without explicit parent, cycle, and occurrence scope.
8. Backend acknowledgement remains a distinct provenance gap even when client-side source metadata is complete.

## Runtime Readiness

| Area | Status | Notes |
| --- | --- | --- |
| Fixture characterization | READY | Pure and deterministic. |
| Authority validator integration | READY | Every fixture retains the Phase 3 result. |
| Identity collision reporting | READY | Legacy identities are never promoted. |
| Missing aggregate identity reporting | READY | Intake-only records are not falsely treated as work. |
| Classification continuity | PARTIAL | Current sources do not consistently preserve history and provenance. |
| Completion coverage | PARTIAL | Aggregate and performer provenance remain uneven. |
| Closure readiness | BLOCKED | Obligation and authorization authority remain unresolved. |
| RecurringService scope | BLOCKED | Parent, cycle, and occurrence identity are not established at runtime. |
| Runtime adoption | BLOCKED | This phase is measurement only. |

## Recommended Phase 5

Operational Aggregate Phase 5 should be an audit-only source readiness decision report. It should use the Phase 4 categories to classify current source families as:

- safe for future read projection
- requires a compatibility adapter
- blocked pending identity ownership
- blocked pending product or lifecycle policy

Phase 5 should define the minimum prerequisites for a future read-only aggregate projection. It must not create adapters, storage, aggregate records, IDs, migrations, backend schema, or UI adoption.
