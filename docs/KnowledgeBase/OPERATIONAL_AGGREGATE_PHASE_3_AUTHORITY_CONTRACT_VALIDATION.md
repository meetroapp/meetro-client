# Operational Aggregate Phase 3 - Authority Contract and Validation

## Executive Summary

Phase 3 converts the Phase 2 authority specification into a pure validation contract. The contract measures whether a proposed relationship between intake, classification, work, communication, scheduling, pricing, completion, closure, history, and relationship records respects Meetro ownership boundaries.

The validator does not create aggregates, assign identity, select workflow paths, authorize Closure, migrate legacy data, or change application behavior. It accepts an in-memory authority context and returns structured errors, warnings, review requirements, and authority findings.

## Contract Purpose

`validateOperationalAggregateAuthority()` answers one question:

> Does this proposed authority context preserve each domain's identity and responsibility without allowing presentation or compatibility records to become work authority?

It is a structural and authority-boundary validator. Passing validation does not authorize runtime adoption.

## Supported Context Shape

```js
{
  serviceRequestRef,
  classificationRef,
  operationalAggregateRef,
  conversationRefs,
  scheduleRefs,
  quoteRefs,
  completionRefs,
  closureRef,
  historyRefs,
  relationshipRefs,
  compatibilityRefs,
  provenance
}
```

The result is:

```js
{
  valid,
  warnings,
  errors,
  reviewRequired,
  authorityFindings
}
```

All findings are structured. The utility is deterministic, does not mutate input, and performs no browser storage, network, backend, or UI access.

## Authority Rules

### Service Request

- Service Request remains intake authority.
- It may exist without an Operational Aggregate.
- Its identity must be preserved.
- It cannot own or stand in for aggregate identity.
- Consultation, Unknown, and review-required intake states remain valid.

### Classification

- Classification is decision support.
- It may recommend `Project`, `WorkOrder`, `Emergency`, or `RecurringService`.
- `Consultation` and `Unknown` are valid non-aggregate outcomes.
- It cannot create aggregate identity.
- Evidence, confidence, review state, and provenance should remain explicit.
- A mismatch between recommendation and an explicit aggregate is reported for review, not silently corrected.

### Operational Aggregate

When present, an Operational Aggregate requires:

- `aggregateId`
- a supported `aggregateType`

Supported types:

- `Project`
- `WorkOrder`
- `Emergency`
- `RecurringService`

The aggregate owns work identity, type, lifecycle, and scope. Its ID cannot be reused from request, conversation, schedule, quote, quote request, completion, emergency, relationship, or compatibility identities.

### Conversation

Conversation owns communication. It preserves `conversationId` but cannot:

- classify a request
- create aggregate identity
- authorize lifecycle changes
- authorize Completion
- authorize Closure

### Schedule

Schedule owns appointment identity and state. It cannot create aggregate identity, and appointment completion cannot be treated as work Completion.

### Quote

Quote owns pricing and proposal state. Quote and quote-request identities remain distinct from aggregate identity. Acceptance can be evidence for a future transition, but cannot itself create the aggregate. Quote scope may inform work scope but cannot replace aggregate scope authority.

### Completion

Completion owns performance evidence. In aggregate context it requires an explicit aggregate reference. It cannot:

- change aggregate identity
- change aggregate type
- resolve obligations
- authorize Closure

### Closure

Closure owns obligation-resolution review, not source evidence. It must reference an explicit aggregate and may reference evidence owned by source domains. Completion alone, History, archive state, and display labels cannot authorize Closure. Unresolved authorization remains review-required.

### History

History owns durable memory. It may exist before or after aggregate creation, but it cannot create aggregate identity, drive lifecycle, authorize Closure, or overwrite classification continuity.

### Relationship

Relationship identity remains distinct and may span multiple requests and aggregates. Closing an aggregate cannot automatically terminate the Relationship.

### Compatibility Identifiers

Compatibility identifiers are read-reconciliation aids only. They require provenance and warning metadata. They cannot satisfy aggregate identity. Text, title, customer, and display-time matches are never authoritative identity evidence.

## Recurring Service Scope

Recurring Services must explicitly distinguish:

- parent service
- cycle
- occurrence

Each scope has its own stable identity. Cycle and occurrence scopes require explicit parent identity. Occurrence Completion or Closure cannot close the parent service without future authority and policy that do not yet exist.

## Review Versus Failure

The validator separates invalid authority claims from unresolved decisions:

- `errors`: structural collisions or prohibited authority transfer
- `warnings`: incomplete provenance or non-blocking compatibility risk
- `reviewRequired`: valid unresolved states that require policy or human review
- `authorityFindings`: concise statements of preserved authority boundaries

Examples of review-required states:

- `Unknown` classification
- classification recommendation conflicting with an explicit aggregate type
- Closure based only on Completion
- unresolved Closure authorization

## Validation Coverage

The tests cover:

- Service Request without an aggregate
- Unknown and Consultation-compatible intake
- advisory WorkOrder recommendation
- valid Project, WorkOrder, Emergency, and RecurringService contexts
- recurring parent, cycle, and occurrence scope
- aggregate identity collisions across legacy domains
- Completion identity and type violations
- Completion-to-Closure authority violations
- History-to-Closure authority violations
- Relationship termination violations
- classification conflicts
- recurring occurrence attempts to close a parent
- deterministic, no-mutation, no-storage behavior

## Structural Findings

The contract exposes several current compatibility risks:

1. Existing request, quote-request, conversation, schedule, completion, and emergency identifiers cannot safely be promoted to aggregate authority.
2. Classification can recommend a path but cannot provide the stable work identity needed by that path.
3. Completion records are unsafe for aggregate use when they lack explicit aggregate identity.
4. Closure remains review-required until authorization policy and obligation ownership exist.
5. Recurring Service requires explicit parent, cycle, and occurrence identities before lifecycle rules can be adopted.
6. Compatibility matches require warning and provenance metadata and remain unsuitable for future writes.

## Remaining Policy Decisions

This phase intentionally does not decide:

- who creates an Operational Aggregate
- when a recommendation becomes an aggregate
- aggregate ID generation
- mandatory lifecycle transitions
- aggregate type change policy
- Closure authorization
- waiver authority
- recurring parent termination authority
- backend persistence or schema

## Runtime Readiness

| Area | Status | Reason |
| --- | --- | --- |
| Pure authority contract | READY | Rules are executable without persistence or UI dependencies. |
| Identity collision detection | READY | Cross-domain identity reuse is reported. |
| Classification recommendation review | READY | Conflicts remain visible and non-destructive. |
| Completion boundary validation | READY | Completion cannot become Closure authority. |
| Recurring scope validation | PARTIAL | Structure is defined; lifecycle policy is not. |
| Closure authorization | BLOCKED | Future authorization and obligation policy are unresolved. |
| Runtime aggregate creation | BLOCKED | Creation authority, IDs, persistence, and transitions are not defined. |
| Overall runtime adoption | BLOCKED | This remains a validation foundation only. |

## Recommended Next Major Track

Operational Aggregate Phase 4 should be a representative source characterization audit. It should map sanitized current request, quote, schedule, emergency, completion, and compatibility shapes into proposed authority-context fixtures and measure:

- identity collision frequency
- missing aggregate identity
- classification continuity
- aggregate type ambiguity
- Completion reference coverage
- Recurring Service scope readiness
- provenance quality

Phase 4 must remain fixture-based and read-only. It should not create adapters for runtime use, aggregate records, persistence, migrations, or identity generation.
