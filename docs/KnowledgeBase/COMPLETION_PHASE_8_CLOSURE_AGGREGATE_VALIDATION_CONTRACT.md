# Completion Phase 8 - Closure Aggregate Validation Contract

## Status

- Pure structural validation
- Deterministic and non-mutating
- No browser storage
- No persistence
- No adapters
- No runtime adoption
- No Closure authority

## Purpose

`closureAggregateValidation.js` validates whether a future Closure coordination
input follows the structure defined in Completion Phase 7.

It validates structure only. It does not determine:

- which obligations are mandatory;
- whether an obligation applies;
- whether evidence is legally or commercially sufficient;
- who may waive an obligation;
- who may authorize Closure;
- whether the aggregate is ready to close.

`valid: true` means structurally usable for further review. It does not mean
Closure-ready or Closed.

## Validator Input

```js
{
  operationalAggregateRef,
  completionRef,
  obligationRegistry,
  readiness,
  reviewState,
  closureDecisionRef,
  historyRefs,
  warnings
}
```

Only the operational aggregate reference and obligation registry are
structurally interpreted in this phase. Other fields are preserved as caller
context and remain outside authority selection.

## Validator Output

```js
{
  valid,
  blockers,
  warnings,
  reviewRequired,
  normalizedRegistry,
  structuralRisk
}
```

### Output Meaning

- `valid`: no structural blocker exists.
- `blockers`: malformed or authority-conflicting structure.
- `warnings`: preserved uncertainty and review conditions.
- `reviewRequired`: structural uncertainty, dispute, waiver, unknown state, or
  blocker requires review.
- `normalizedRegistry`: cloned, normalized registry projection.
- `structuralRisk`: `LOW`, `MEDIUM`, or `HIGH`.

Structural risk is not Closure risk and does not authorize workflow behavior.

## Supported Operational Aggregates

- `Project`
- `WorkOrder`
- `Emergency`
- `RecurringService`

Each requires a canonical `aggregateId`. The validator does not infer identity
from a request, conversation, quote, schedule, title, customer, or generic ID.

## Applicability Statuses

- `applicable`
- `not_applicable`
- `unknown`

Unknown applicability remains structurally valid because uncertainty is an
approved architecture state. It always requires review.

The validator does not choose applicability.

## Resolution Statuses

- `open`
- `resolved`
- `waived`
- `disputed`
- `unknown`

Disputed and unknown resolution remain structurally valid but review-required.

Waived status also requires review because waiver authority is unresolved.

The validator does not resolve obligations.

## Obligation Registry Rules

Each normalized entry contains:

```js
{
  obligationId,
  obligationType,
  applicabilityStatus,
  resolutionStatus,
  evidenceReferences,
  sourceDomain,
  lastReviewedAt,
  reviewWarnings
}
```

Structural rules:

1. `obligationId` must be explicit, stable, unique, and non-generic.
2. `obligationType` must be present.
3. Unknown obligation types are preserved with a warning.
4. Applicability and resolution statuses must use supported values.
5. `sourceDomain` must be explicit and cannot be Closure.
6. Evidence references must be records rather than embedded evidence.
7. An applicable resolved claim requires at least one source-owned evidence
   reference.
8. Unknown, disputed, and waived states require review.
9. Duplicate obligation IDs are blocked.
10. The normalized registry is a deep clone.

These rules do not imply that every aggregate needs any specific obligation.
An empty registry does not cause the validator to invent obligations.

## Evidence Reference Boundary

The minimum structural reference used by this contract is:

```js
{
  evidenceId,
  sourceDomain,
  sourceEntityId,
  ownership: "source_domain"
}
```

This is a logical reference shape, not a persistence schema.

Evidence references must:

- have stable evidence identity;
- identify the source domain;
- identify the source-domain entity;
- preserve source-domain ownership.

Evidence references must not:

- declare Closure as owner or source domain;
- embed an `evidence`, `payload`, or `content` body;
- convert a snapshot into authority.

The validator confirms reference boundaries only. It does not validate evidence
provenance or sufficiency; those remain separate contract responsibilities.

## Resolved Evidence Rule

When an entry claims:

```text
applicabilityStatus = applicable
resolutionStatus = resolved
```

the structure must include a source-owned evidence reference.

Missing evidence is a structural blocker because the registry would otherwise
claim resolution without a traceable source.

This does not decide how much evidence is sufficient. One structurally valid
reference may still be insufficient under future domain or product policy.

## Recurring Service Scope

Recurring Service Closure must preserve three distinct scopes:

- parent;
- cycle;
- occurrence.

The logical scope shape is:

```js
{
  scopeType,
  scopeId,
  parentAggregateId,
  cycleId,
  occurrenceId
}
```

### Parent

- `scopeType: "parent"`
- stable `scopeId`
- no cycle or occurrence identity

### Cycle

- `scopeType: "cycle"`
- stable `scopeId`
- `parentAggregateId`
- `cycleId`
- no occurrence identity

### Occurrence

- `scopeType: "occurrence"`
- stable `scopeId`
- `parentAggregateId`
- `occurrenceId`
- no cycle identity

Conflicting scope identities are blocked. Obligations must not silently move
between parent, cycle, and occurrence registries.

This structure does not decide how Closure at one scope affects another.

## Structural Risk

| Risk | Meaning |
| --- | --- |
| `LOW` | Structure is valid and no review warning exists |
| `MEDIUM` | Structure is valid, but uncertainty, dispute, waiver, or warning requires review |
| `HIGH` | Structural blocker exists |

## Structural Blockers

The contract blocks:

- missing canonical aggregate ID;
- unsupported aggregate type;
- missing or generic obligation identity;
- duplicate obligation identity;
- missing obligation type;
- unsupported applicability or resolution status;
- missing source domain;
- Closure declared as evidence owner;
- malformed or embedded evidence;
- applicable resolved claims without evidence references;
- missing or conflicting Recurring Service scope identity.

## Review-Required Conditions

The contract requires review for:

- unknown applicability;
- unknown resolution;
- disputed resolution;
- waived resolution;
- unknown future obligation types;
- any supplied warning;
- any structural blocker.

Review does not grant authority to resolve, waive, or close.

## Fixture Coverage

Tests cover:

1. Valid Project Closure aggregate
2. Missing aggregate ID
3. Unsupported aggregate type
4. Missing obligation ID
5. Unknown applicability
6. Disputed resolution
7. Resolved obligation without evidence
8. Source-owned evidence boundary
9. Recurring Service parent scope
10. Recurring Service cycle scope
11. Recurring Service occurrence scope
12. Conflicting recurring scopes
13. Determinism and input immutability
14. Unknown obligation type preservation

An additional guard confirms the validator never reads browser storage.

## Remaining Policy Decisions

Still unresolved:

1. Which obligations are mandatory?
2. Who determines applicability?
3. Who may waive obligations?
4. Who authorizes Closure?
5. What evidence threshold is sufficient?
6. What backend authority model is required?
7. How Closure and registry state are persisted?
8. How decisions are audited?
9. Whether and how Closure may be reopened?
10. How revoked or superseded evidence changes prior decisions?
11. How parent, cycle, and occurrence Closure interact?
12. Which emergency, offline, participant, or external-authority exceptions
    are valid?

## Remaining Runtime Blockers

- canonical backend operational aggregate identity;
- explicit applicability owner;
- domain-owned evidence APIs;
- obligation resolution authority;
- waiver policy;
- Closure authorization policy;
- persistence and audit design;
- adapters for each source domain;
- representative characterization against real sanitized backend shapes.

## Recommended Next Major Track

Pause Closure runtime adoption after Phase 8.

The next major TestFlight-safe track should be **Operational Aggregate Identity
and Classification Alignment**:

- audit whether current Project, Work Order, Emergency, and Recurring Service
  records have distinct canonical identities;
- map Service Request classification outputs to aggregate identity without
  creating records;
- identify where request, schedule, conversation, quote, emergency, or generic
  IDs are incorrectly treated as aggregate identity;
- define backend identity prerequisites;
- remain audit-only and read-only.

Closure cannot safely advance into adapters until operational aggregate
identity and domain ownership are authoritative.
