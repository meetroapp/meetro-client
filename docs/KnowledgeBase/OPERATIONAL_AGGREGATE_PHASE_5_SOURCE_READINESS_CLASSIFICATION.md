# Operational Aggregate Phase 5 - Source Readiness Classification

## Executive Summary

Phase 5 classifies representative Meetro source shapes by their safety for a future read-only Operational Aggregate projection. It consumes the Phase 4 characterization report, preserves the Phase 3 authority findings, and does not create, infer, persist, or project aggregate records.

Readiness is not workflow approval. It describes whether a source can safely participate in a future read model while its owning domain remains authoritative.

## Readiness Levels

### READY_FOR_READ_PROJECTION

Used only when:

- explicit `aggregateId` exists
- explicit supported `aggregateType` exists
- authority boundaries are clean
- no identity collision exists
- provenance is complete enough for the fixture contract
- Completion and Closure references are correctly scoped
- no compatibility identity participates in authority

This level permits only future read-projection evaluation. It does not permit writes or runtime adoption.

### NEEDS_REVIEW_BEFORE_PROJECTION

Used when the source is operational but has a reviewable gap:

- aggregate identity is incomplete
- classification confidence or continuity is incomplete
- provenance is incomplete
- compatibility references are present for reconciliation
- Completion lacks aggregate scope
- Closure remains review-required
- RecurringService scope is missing or incomplete

Review does not authorize identity inference or automated repair.

### BLOCKED_FROM_PROJECTION

Used when projection would preserve or amplify an authority violation:

- cross-domain identity collision
- compatibility ID used as aggregate authority
- classification used to create aggregate identity
- unresolved aggregate type conflict
- Completion authorizes Closure
- History authorizes Closure
- Relationship ends because an aggregate closes
- recurring occurrence Completion or Closure closes the parent service
- Conversation, Schedule, or Quote claims work authority

The owning domain must resolve these violations before projection.

### NOT_OPERATIONAL_SOURCE

Used when a source does not imply work lifecycle:

- intake-only Service Request
- communication-only Conversation
- relationship-only record
- presentation-only Dashboard or card record
- informational source without operational context

These sources may remain useful to their owning modules but are not aggregate projection inputs.

## Classification Precedence

The classifier applies deterministic precedence:

1. blocking authority violations
2. non-operational source determination
3. reviewable identity, provenance, lifecycle, or compatibility gaps
4. ready for read projection

This ensures a presentation record does not become operational because it contains an identifier, while a colliding source cannot be downgraded to review.

## Inputs

`classifyOperationalAggregateReadiness()` accepts:

- raw fixture arrays, which are characterized in memory
- an existing Phase 4 characterization result

It never reads browser storage or application pages.

## Output

```js
{
  valid,
  summary: {
    totalSources,
    readyForReadProjection,
    needsReviewBeforeProjection,
    blockedFromProjection,
    notOperationalSource
  },
  classifications: [
    {
      sourceKey,
      sourceDomain,
      readiness,
      reasons,
      warnings,
      blockers,
      recommendedAction,
      authorityFindings
    }
  ]
}
```

`sourceDomain` preserves the fixture source type. `authorityFindings` preserves the Phase 3 domain-boundary findings.

## Source Rules

### Service Request

An intake-only Service Request is not operational. A Service Request that already claims work behavior without aggregate identity requires review. Its request ID is never promoted.

### Operational Aggregate

Only a clean, explicitly typed aggregate can be ready. Missing ID or type requires review. Unsupported or conflicting authority remains blocked when it attempts to transfer ownership.

### Conversation, Schedule, and Quote

Communication-only, appointment-only, and pricing-only sources are not aggregate sources. If they claim aggregate creation or lifecycle authority, projection is blocked.

### Completion

Missing aggregate reference requires review. Completion type or identity conflict blocks projection. Completion authorizing Closure blocks projection.

### Closure and History

Completion-only Closure remains review-required. Closure relying on History, archive state, or presentation labels is blocked because those states are not obligation authority. History authorizing Closure is blocked.

### Relationship

Relationship-only sources are non-operational. Any claim that aggregate Closure terminates the Relationship blocks projection.

### RecurringService

Missing parent, cycle, or occurrence scope requires review. Conflicting scopes and occurrence attempts to close the parent service block projection.

### Compatibility

Read-only compatibility references require review and can never make a source ready. Compatibility identity used as aggregate identity blocks projection.

### Provenance

Incomplete provenance requires review for operational sources. It does not convert informational sources into operational ones. Stronger authority is not inferred from client display state or current viewer context.

## Test Coverage

The focused suite covers:

- empty input
- clean ready aggregate
- intake-only and operational Service Requests
- missing Project and WorkOrder identity
- Emergency, Conversation, Schedule, Quote, Completion, and compatibility collisions
- read-only compatibility references
- Completion aggregate gaps and Closure overreach
- Completion-only Closure
- History authority overreach
- Relationship termination
- RecurringService scope and parent-closing violations
- low provenance
- presentation-only records
- existing characterization input
- mixed summary counts
- deterministic, immutable, storage-independent execution

## Readiness Findings

1. Clean aggregate identity is necessary but not sufficient; provenance and authority boundaries also matter.
2. Missing identity is reviewable for future read projection but cannot be auto-repaired.
3. Compatibility references prevent ready classification even when used correctly.
4. Completion and Closure need separate authority checks.
5. Non-operational records should remain outside aggregate projection rather than being forced into a work model.
6. RecurringService remains especially sensitive to scope identity.

## Runtime Status

| Area | Status | Notes |
| --- | --- | --- |
| Audit classifier | READY | Pure and deterministic. |
| Raw fixture support | READY | Uses Phase 4 characterization in memory. |
| Characterization report support | READY | Input is cloned and preserved. |
| Read-projection eligibility measurement | READY | Produces advisory readiness only. |
| Runtime read projection | BLOCKED | No adapter or canonical aggregate read model exists. |
| Aggregate identity creation | BLOCKED | Authority and persistence remain undefined. |
| UI adoption | BLOCKED | Classification is not a presentation feature. |

## Recommended Phase 6

Operational Aggregate Phase 6 should be an audit-only projection boundary report. It should identify:

- which READY sources could participate in a future read projection
- which fields a projection may copy versus reference
- how source authority and provenance must remain visible
- how compatibility references must remain warnings
- which consumer modules may read a projection
- which modules must never create, update, or close aggregates

Phase 6 must not create the projection utility, storage, aggregate IDs, migrations, backend schema, UI adoption, or lifecycle transitions.
