# Completion Phase 4 - Obligation Evidence Provenance Contract

## Status

- Pure contract only
- Advisory output only
- No persistence
- No runtime adoption
- No Closure authority

## Purpose

`obligationEvidenceProvenance.js` evaluates whether a supplied evidence record
has enough provenance to be considered by a future Closure obligation adapter.

A result of `usable: true` means only:

- the evidence type is known;
- its source and domain authority are appropriate;
- required actor and aggregate provenance are present;
- occurrence and recording times are present;
- required artifact or confirmation references are present;
- no declared provenance conflicts exist.

It does not mean:

- the obligation is resolved;
- the obligation is mandatory;
- the evidence is sufficient under product or legal policy;
- Closure is ready;
- Closure is authorized.

## Evidence vs Claim

An **evidence record** is a provenance-qualified fact supplied by the domain
that owns the underlying event or decision.

Examples:

- a payment-processor receipt with an external transaction reference;
- a municipal inspection result with an external evidence reference;
- an authenticated customer confirmation recorded by the completion
  confirmation authority;
- a completion artifact linked to the operational aggregate.

A **claim** is an assertion that may be useful for review but does not prove the
underlying fact.

Examples:

- a professional selecting "payment received";
- a customer clicking "mark paid";
- a message saying a permit was approved;
- a note saying the inspection passed.

Self-reported claims remain visible and reviewable. They do not become
authoritative merely because they include a status, actor role, or timestamp.

## Display Status vs Evidence

Display status communicates what a screen currently shows. It does not explain:

- who established the status;
- which authority owns it;
- which aggregate it belongs to;
- when the event occurred;
- when it was authoritatively recorded;
- which artifact or confirmation supports it.

The following are presentation, not evidence:

- Paid/Partial/Pending labels;
- confirmed badges;
- completed cards;
- Dashboard counts;
- Work Center tab placement;
- Project Details summaries;
- generated PDFs;
- portfolio records;
- icons, titles, subtitles, and quick replies.

## Review vs Closure

A review is Relationship activity. It may provide feedback after work is
completed, but it does not establish:

- payment settlement;
- customer or tenant confirmation;
- permit closeout;
- inspection approval;
- warranty handoff;
- documentation completeness;
- follow-up completion;
- utility approval;
- dispute resolution.

Emergency review submission is therefore explicitly blocked as Closure
evidence. It may remain in Relationship History.

## Why Provenance Matters

Closure can remove work from operational attention. Weak evidence can therefore
hide unresolved responsibility.

Provenance ensures that a future Closure decision can distinguish:

- domain-owned evidence from a UI label;
- an authenticated decision from current-viewer inference;
- an operational aggregate from a conversation or generic ID;
- occurrence time from client display time;
- backend/external recording from local storage;
- an actual receipt or approval from message text.

## Contract Input

```js
{
  obligationType,
  evidenceType,
  source,
  actorId,
  actorRole,
  authority,
  aggregateId,
  aggregateType,
  timestamp,
  recordedAt,
  attachmentRefs,
  confirmationRefs,
  notes,
  status
}
```

`authority` may be a string or a provenance object:

```js
{
  name,
  actorId,
  actorRole,
  aggregateId,
  aggregateType
}
```

When the authority object declares actor or aggregate values, conflicting
top-level values block usability.

## Contract Output

```js
{
  usable,
  evidenceTrust,
  blockers,
  warnings,
  missingProvenance,
  recommendedOwner,
  requiresHumanReview
}
```

## Evidence Trust Values

| Trust | Meaning |
| --- | --- |
| `AUTHORITATIVE` | Known evidence type from its approved domain authority |
| `SUPPORTED` | Valid supporting artifact, but not a domain resolution decision |
| `SELF_REPORTED` | Claim supplied by a participant or UI context |
| `PRESENTATION_ONLY` | Display, archive, History, Dashboard, Work Center, or portfolio state |
| `CONFLICTING` | Declared actor or aggregate provenance conflicts |
| `MISSING` | Required provenance fields are absent |
| `UNKNOWN` | Unknown evidence type or unapproved authority |

Only `AUTHORITATIVE` and `SUPPORTED` evidence can return `usable: true`.
Supported evidence may prove an artifact exists; it does not prove every
required-document obligation is satisfied.

## Supported Evidence Types

| Evidence type | Recommended owner | Required special references |
| --- | --- | --- |
| `completion_artifact` | Completion evidence owner | Attachment/artifact reference |
| `customer_confirmation` | Completion confirmation authority | Confirmation reference |
| `tenant_confirmation` | Tenant participation authority | Confirmation reference |
| `payment_claim` | Invoice/payment authority | Always self-reported and blocked as resolution evidence |
| `payment_receipt` | Invoice/payment authority | External receipt/transaction reference |
| `permit_status` | Permit authority | Permit artifact/external reference |
| `inspection_status` | Inspection authority | Inspection artifact/external reference |
| `warranty_handoff` | Warranty/document handoff authority | Warranty document and acknowledgement references |
| `document_delivery` | Project Folder/document authority | Document reference |
| `follow_up_completion` | Task/scheduling obligation authority | Domain-owned task completion |
| `dispute_resolution` | Dispute/change resolution authority | Resolution confirmation reference |
| `utility_approval` | Utility approval authority | Utility artifact/external reference |
| `emergency_review` | Relationship/review authority | Never Closure evidence by itself |
| `unknown` | Future obligation domain owner | Human review required |

## Core Rules

1. Evidence must have explicit source provenance.
2. Evidence must have explicit operational aggregate identity and type.
3. Action and confirmation evidence must identify actor and actor role.
4. Evidence must include occurrence `timestamp` and recording `recordedAt`.
5. Evidence must declare its domain authority.
6. Self-reported claims are warnings and cannot establish resolution.
7. Display labels are not evidence.
8. Archive and History state are not evidence.
9. Review submission is not Closure evidence.
10. Payment text or claims are not payment authority.
11. Permit and inspection evidence require their owning domain or explicit
    external authority.
12. Required attachment and confirmation references must be explicit.
13. Unknown evidence remains blocked and review-required.
14. Conflicting actor or aggregate provenance blocks usability.
15. Notes do not increase evidence trust.
16. The contract never creates, resolves, waives, persists, or adopts an
    obligation.

## Why Closure Cannot Be Inferred

Archive means a record was retained or moved from active presentation.

History means a durable event or artifact exists.

Review means relationship feedback was requested or submitted.

A label means a UI rendered a value.

None of these states proves that an owning domain resolved an obligation.
Closure readiness must be based on explicit obligation status plus
provenance-qualified evidence.

## Fixture Coverage

Tests cover:

1. Completion photo with source and aggregate
2. Self-reported payment claim
3. Payment receipt with external reference
4. Customer confirmation with actor provenance
5. Display label pretending to be confirmation
6. Archived conversation state
7. Emergency review submission
8. Permit claim without permit owner
9. Inspection approval with external evidence
10. Warranty handoff missing acknowledgement
11. Unknown evidence type
12. Conflicting actor provenance
13. Deterministic, non-mutating, browser-independent execution

## Evidence Types That Remain Blocked

The following remain blocked unless their future domain owner supplies the
required provenance:

- current Completion Sheet payment claims;
- customer "mark paid" claims;
- current closeout confirmation labels;
- tenant confirmation;
- permit scans without permit authority;
- inspection labels or notes;
- current warranty-offered/acknowledged labels;
- generic Project Folder document presence used as completeness;
- reminder or quick-reply follow-up state;
- message-derived dispute resolution;
- utility approval;
- emergency review used as Closure;
- unknown future evidence types.

## Product Decisions Intentionally Deferred

This contract does not decide:

- mandatory obligations by aggregate type;
- payment authority or settlement policy;
- customer/tenant confirmation exceptions;
- who may waive evidence requirements;
- who may authorize Closure;
- whether a specific external authority is legally sufficient;
- how evidence is persisted or signed.

## Recommended Completion Phase 5

**Completion Phase 5 - Representative Obligation Evidence Characterization
Harness**

Create pure source adapters and sanitized fixtures for the current candidate
sources identified in Phase 3:

- Completion Sheet artifacts and payment claims;
- closeout confirmation states;
- invoice claims/questions;
- Project Folder records;
- follow-up states;
- issue/change records;
- emergency reviews.

Run every adapted candidate through this provenance contract and report:

- usable evidence rate;
- trust distribution;
- missing provenance frequency;
- blocker frequency;
- owner coverage;
- evidence types with no source coverage.

Phase 5 must remain read-only and must not pass evidence into
`closureReadinessContract()`, choose mandatory obligations, or modify runtime
flows.
