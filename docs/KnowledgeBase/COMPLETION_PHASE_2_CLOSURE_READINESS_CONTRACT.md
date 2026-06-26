# Completion Phase 2 - Closure Readiness and Obligation Contract

## Status

- Architecture contract only
- Pure and read-only
- Advisory output only
- No persistence
- No runtime adoption
- No workflow authority

## Purpose

`closureReadinessContract.js` provides a neutral model for evaluating whether a
completed operational aggregate appears ready for future Closure.

It does not:

- decide which obligations apply to an industry or workflow;
- approve payment status;
- approve customer-confirmation exceptions;
- decide who may authorize Closure or a waiver;
- close an aggregate;
- create an event;
- update History;
- write storage;
- change a UI or workflow.

The caller must supply the obligation review. The evaluator only characterizes
that supplied evidence.

## Completion vs Closure

**Completion means work performed.**

Completion records that the operational work was performed or submitted as
complete. It may create evidence, a customer-facing summary, and a historical
event.

**Closure means obligations fulfilled.**

Closure can occur only after every applicable obligation has been reviewed and
is resolved, explicitly waived by an appropriate authority, or documented as
not required.

Completion does not imply Closure.

## Why Closure Exists

Work can be physically complete while responsibility remains open. Examples
include:

- customer or tenant confirmation;
- payment settlement;
- permit closeout;
- inspection approval;
- warranty handoff;
- required documentation;
- scheduled follow-up;
- utility approval;
- dispute resolution.

Without a distinct Closure concept, completed work can disappear from active
responsibility while unresolved obligations remain hidden.

## Why History May Begin Before Closure

History is a durable record of facts and events. A Completion event is a
historical fact even when Closure is not ready.

A future History projection should be able to show:

```text
Work performed
  -> Completion submitted
  -> Obligations reviewed
  -> Open obligations resolved or waived
  -> Closure authorized
  -> Later relationship activity
```

History must preserve unresolved obligations rather than waiting until Closure
or presenting Completion as final Closure.

## Completion, Closure, and Archive Are Separate

| Concept | Meaning | Authority |
| --- | --- | --- |
| Completion | Work was performed or submitted complete | Completion owner for the operational aggregate |
| Closure | Required obligations were fulfilled or explicitly resolved | Future operational aggregate Closure authority |
| Archive | A record or conversation is hidden, indexed, retained, or moved from an active presentation | Owning record/index module |
| History | Durable event and evidence projection | History projection |

Archiving a conversation does not close a project. Moving a Work Center card to
Completed does not prove Closure. Saving a completion record does not resolve
payment, permit, inspection, warranty, follow-up, or dispute obligations.

## Contract Input

```js
{
  aggregateId,
  aggregateType,
  completionStatus,
  obligations,
  evidence,
  confirmations,
  outstandingItems
}
```

### Aggregate fields

- `aggregateId`: Explicit identity of the Project, Work Order, Emergency,
  Recurring Service, or future operational aggregate.
- `aggregateType`: Explicit operational aggregate type.
- `completionStatus`: Explicit evidence that work was performed or submitted
  complete.

The evaluator does not infer aggregate identity from a conversation, quote,
schedule, title, customer, or generic identifier.

### Obligation shape

```js
{
  id,
  category,
  status,
  required,
  evidenceRequired,
  confirmationRequired,
  evidenceRefs,
  confirmationRefs,
  waiverAuthority,
  owner,
  metadata
}
```

The contract preserves additional fields without assigning authority to them.

### Evidence and confirmations

Evidence and confirmation collections may contain records or stable IDs.
Obligation references are checked only when the obligation explicitly declares
that evidence or confirmation is required.

The contract does not decide what constitutes authoritative evidence. That is a
future domain and product policy.

### Outstanding items

Any supplied outstanding item prevents Closure readiness. The evaluator does not
infer whether an item is important enough to block Closure; the caller made that
decision by including it in `outstandingItems`.

## Contract Output

```js
{
  closureReady,
  openObligations,
  resolvedObligations,
  waivedObligations,
  missingEvidence,
  warnings,
  blockers,
  riskLevel,
  requiresHumanReview
}
```

- `closureReady`: Advisory result only. It never changes state.
- `openObligations`: Required, open, disputed, or unknown obligations.
- `resolvedObligations`: Resolved and explicitly not-required obligations.
- `waivedObligations`: Obligations declared waived by the caller.
- `missingEvidence`: Missing required evidence or confirmation references.
- `warnings`: Non-final concerns such as future categories or unverified waiver
  authority.
- `blockers`: Conditions that prevent advisory readiness.
- `riskLevel`: `LOW`, `MEDIUM`, or `HIGH`.
- `requiresHumanReview`: True when the result is unready, contains warnings, or
  includes waivers.

## Obligation Categories

The current registry supports:

- Customer Confirmation
- Tenant Confirmation
- Payment
- Permit
- Inspection
- Warranty Handoff
- Required Documentation
- Follow-Up
- Utility Approval
- Dispute Resolution
- Future Obligation Types

The registry is descriptive, not mandatory. The contract does not decide that
every Project requires payment, that every Maintenance Request requires tenant
confirmation, or that every Emergency requires the same evidence.

Unknown future categories are preserved and require human review.

## Obligation Statuses

| Status | Readiness meaning |
| --- | --- |
| `required` | Applicable but not yet resolved |
| `not_required` | Explicitly reviewed and declared inapplicable |
| `open` | Applicable and unresolved |
| `resolved` | Explicitly resolved |
| `waived` | Explicitly waived; authority remains a review concern |
| `disputed` | Contested and unresolved |
| `unknown` | Insufficient information; unresolved |

Unknown obligations never pass through as satisfied.

## Evaluation Rules

1. Completion does not imply Closure.
2. Closure requires an explicit obligation review.
3. An empty or missing obligation collection is not approval.
4. Required, open, disputed, and unknown obligations remain open.
5. Open obligations prevent Closure readiness.
6. Outstanding items prevent Closure readiness.
7. Explicitly required evidence or confirmation must be available.
8. Unknown future categories are retained and flagged for review.
9. Waivers remain visible and require human review.
10. Different operational paths may provide different obligation sets.
11. The evaluator never invents mandatory categories.
12. The evaluator never authorizes Closure.

## Risk Rules

- `LOW`: Advisory readiness is true with no warnings or blockers.
- `MEDIUM`: No blocker exists, but warning or human review remains.
- `HIGH`: A blocker exists, including unresolved obligations, missing evidence,
  missing aggregate identity, missing completion, or outstanding items.

Risk is a characterization result, not workflow authority.

## Representative Fixture Coverage

Tests cover:

1. Fully resolved Project
2. Open permit
3. Open inspection
4. Missing payment confirmation
5. Missing tenant confirmation
6. Unknown obligations
7. Mixed resolved, waived, and open obligations
8. Emergency completion without obligation review
9. Warranty handoff pending
10. Required follow-up pending
11. Required documentation evidence missing
12. Disputed completion
13. Deterministic, non-mutating, browser-independent execution

## Future Closure Ownership

Closure must not be owned by:

- Dashboard
- Work Center tab
- Command Center
- Project Gallery
- Conversation card

These modules may eventually display Closure readiness, open obligations, or
links to the responsible owner. They cannot authorize Closure.

Future Closure belongs to:

- Project aggregate
- Work Order aggregate
- Emergency aggregate
- Recurring Service aggregate
- Future operational aggregates

Each operational aggregate may have different obligation requirements. The
aggregate should collect status from the actual obligation owners rather than
reimplementing payment, permit, inspection, warranty, document, follow-up, or
relationship authority.

## Product Decisions Intentionally Not Made

This phase does not decide:

- which obligations are mandatory for each operational path;
- whether payment must be received before Closure;
- whether customer or tenant confirmation may be waived;
- which emergency exceptions are permitted;
- who may authorize Closure;
- who may authorize an obligation waiver;
- whether Closure controls revenue recognition;
- when a conversation or record should be archived.

Those decisions are blockers for runtime adoption, not blockers for this pure
measurement contract.

## Remaining Blockers Before Completion Phase 3

1. No approved obligation policy by operational aggregate type.
2. No authoritative aggregate identity shared across completion and obligation
   domains.
3. No stable Completion and future Closure identities.
4. No payment authority or payment-to-Closure policy.
5. No customer/tenant confirmation exception policy.
6. No waiver or Closure authorization policy.
7. No permit, inspection, warranty, documentation, or follow-up adapters.
8. No authoritative evidence provenance contract for Closure.
9. No Closure event envelope or idempotency policy.
10. No approved completed-open versus closed History presentation.
11. No runtime consumer has been approved.

## Recommended Completion Phase 3

**Completion Phase 3 - Closure Obligation Source and Provenance Audit**

Audit the existing completion, payment, permit, inspection, conversation,
Project Folder, warranty, follow-up, and emergency sources against this
contract.

Phase 3 should remain read-only and should:

- identify which obligation categories have real data sources;
- identify the authority and provenance of each source;
- distinguish verified facts from display labels and local fallbacks;
- measure which completed records can produce a complete obligation review;
- document unresolved product decisions;
- avoid selecting mandatory obligations or authorizing Closure.

Do not adopt the evaluator into runtime during Phase 3.
