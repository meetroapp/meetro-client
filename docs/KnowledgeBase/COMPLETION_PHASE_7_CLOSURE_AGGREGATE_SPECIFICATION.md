# Completion Phase 7 - Closure Aggregate and Obligation Registry Specification

## Status

- Knowledge Base specification only
- No runtime behavior
- No persistence or storage design
- No adapters
- No Closure adoption
- No mandatory obligation policy
- No waiver or Closure authorization policy

## Purpose

This document defines the future structural relationship between:

- operational aggregates;
- Completion;
- a Closure coordination layer;
- domain-owned obligations and evidence;
- History;
- Relationship.

It does not define runtime implementation or product policy.

## Foundational Definitions

### Completion

**Completion means work performed.**

Completion records that the operational work was performed or submitted as
complete. It may produce artifacts, notes, participant-facing summaries, and
historical events.

Completion does not prove that all obligations are fulfilled.

### Closure

**Closure means all applicable obligations have been reviewed and resolved,
waived, disputed, or explicitly marked unknown and routed for review.**

A disputed or unknown obligation is not satisfied. It remains visible and
requires review. Closure readiness and Closure authorization are separate
concepts.

Closure is not a feature, screen, tab, card, or archive action.

**Closure is a domain.**

### History

**History is the durable record of work, obligations, Closure decisions, and
relationship activity.**

History may begin before Completion or Closure. It records facts and decisions;
it does not authorize them.

### Relationship

**Relationship is the long-term connection between participants that persists
beyond individual operational aggregates.**

A Project or Work Order may close while the customer, professional, tenant,
property manager, team member, or vendor relationship continues.

## Universal Lifecycle

```text
Intent
  -> Service Request
  -> Information Gathering
  -> Classification
  -> Operational Aggregate
  -> Work
  -> Completion
  -> Obligation Review
  -> Closure Decision
  -> History
  -> Relationship
```

History records events throughout this lifecycle. The sequence above describes
responsibility, not a rule that History begins only after Closure.

## Core Separation Rules

1. Completion does not imply Closure.
2. Closure does not imply Relationship termination.
3. History may begin before Closure.
4. History does not authorize Closure.
5. The Closure domain does not own obligation evidence.
6. Operational aggregates reference obligations without absorbing the source
   domains that own those obligations.
7. Unknown and disputed states remain explicit.
8. Presentation state never becomes domain authority.

## Operational Aggregate Types

An operational aggregate is the authoritative lifecycle context for a
classified unit of work.

Every supported aggregate requires:

- an explicit aggregate type;
- a canonical aggregate ID;
- explicit participant relationships;
- lifecycle status separate from display status;
- Completion state;
- Closure state separate from Completion;
- an attached logical obligation registry;
- durable History references;
- Relationship references that survive aggregate Closure.

Conversation, quote, schedule, title, customer name, and generic record IDs are
not substitutes for canonical aggregate identity.

## Project Aggregate

### Definition

A `Project` coordinates work with substantial scope, duration, dependencies,
participants, documents, decisions, or regulatory obligations.

Examples:

- remodel;
- solar installation;
- fence build;
- large cleanup.

### Aggregate Identity Requirements

- canonical `aggregateId`;
- aggregate type `Project`;
- stable participant references;
- originating Service Request reference;
- professional or business owner reference;
- explicit relationship and conversation references where applicable.

Request, quote, schedule, conversation, permit, or customer IDs must remain
separate references.

### Lifecycle Boundaries

The Project lifecycle begins when classification and approved creation
authority establish a Project aggregate. It includes planning, decisions,
work, changes, Completion, obligation review, and Closure.

Project cancellation and rejection are separate lifecycle outcomes and must not
be represented as completed work.

### Completion Boundary

Project Completion records that the defined work was performed or submitted as
complete.

Completion may occur while permits, inspections, payment, warranty handoff,
documentation, follow-up, utility approval, or disputes remain open.

### Closure Boundary

Project Closure occurs only after the Project's applicable obligation registry
has been reviewed under future approved policy and an authorized Closure
decision has been recorded.

This specification does not define that policy or authority.

### History Relationship

Project History records:

- classification and creation;
- participant and scope changes;
- work events;
- Completion;
- obligation applicability and resolution events;
- disputes and reviews;
- Closure decisions;
- later corrections or relationship activity.

History is a projection, not Project or Closure authority.

### Relationship Relationship

Closing a Project does not remove the relationship between its participants.
The relationship may support repeat work, warranty communication, future
projects, follow-up, or ordinary communication.

### Obligation Registry Attachment

The Project references a registry scoped by its canonical aggregate ID and
type. Registry entries reference domain-owned evidence and decisions. The
Project does not copy or redefine Payment, Permit, Inspection, Participant,
Warranty, Utility, or Dispute authority.

## WorkOrder Aggregate

### Definition

A `WorkOrder` coordinates a bounded operational task or service visit with
defined execution scope.

Examples:

- appliance repair;
- one-time cleaning;
- minor service visit;
- inspection visit.

### Aggregate Identity Requirements

- canonical `aggregateId`;
- aggregate type `WorkOrder`;
- originating Service Request reference;
- service recipient and professional participant references;
- explicit schedule, conversation, and invoice references when present.

A schedule record is not the Work Order identity.

### Lifecycle Boundaries

The Work Order lifecycle begins when authorized classification and creation
establish a bounded unit of work. It ends at Closure, cancellation, or another
explicit terminal decision.

### Completion Boundary

Work Order Completion records that the defined visit or task was performed.

### Closure Boundary

Work Order Closure remains distinct from Completion. Payment, customer or
tenant confirmation, documentation, follow-up, warranty, regulatory, or
dispute obligations may remain.

### History Relationship

History retains the Work Order's request, scheduling, work, Completion,
obligations, decisions, and Closure.

### Relationship Relationship

A closed Work Order may become one event in a repeat-customer or service
relationship. Closure must not archive or terminate that relationship.

### Obligation Registry Attachment

The Work Order receives its own registry. It must not inherit a Project-style
mandatory obligation set. Applicability remains explicit and
information-driven.

## Emergency Aggregate

### Definition

An `Emergency` coordinates urgent assessment, dispatch, stabilization, work,
and post-emergency responsibility.

Examples:

- water leak;
- lockout;
- storm damage;
- urgent dispatch.

### Aggregate Identity Requirements

- canonical `aggregateId`;
- aggregate type `Emergency`;
- originating emergency Service Request reference;
- participant and responder references;
- explicit dispatch and conversation references;
- links to any later Project, Work Order, or Maintenance Request without
  replacing Emergency identity.

### Lifecycle Boundaries

The Emergency lifecycle begins when emergency classification and creation
authority establish the aggregate. Stabilization, immediate work, Completion,
post-emergency follow-up, and Closure remain part of the lifecycle.

An Emergency may create a separate downstream Project or Work Order. That new
aggregate must receive its own identity and obligation registry.

### Completion Boundary

Emergency Completion records that the immediate emergency work or
stabilization was performed.

### Closure Boundary

Emergency Closure requires review of applicable post-emergency obligations.
Possible open items include follow-up work, documentation, participant
confirmation, payment, inspection, permit, utility, safety, or dispute
resolution.

Submitting a review does not close the Emergency.

### History Relationship

History retains dispatch, status changes, work evidence, Completion,
post-emergency obligations, Closure decisions, and later relationship events.

### Relationship Relationship

Emergency Closure does not end participant communication or the customer
relationship. Review and feedback belong to Relationship History, not Closure
authority.

### Obligation Registry Attachment

The Emergency registry is scoped to the Emergency aggregate. Relationship
reviews may be referenced for context but cannot satisfy Closure obligations
unless a separate authoritative domain event establishes a relevant
obligation outcome.

## RecurringService Aggregate

### Definition

A `RecurringService` coordinates an ongoing service relationship with repeated
visits, cycles, or care occurrences.

Examples:

- weekly cleaning;
- lawn maintenance;
- ongoing care visit;
- service plan.

### Aggregate Identity Requirements

- canonical recurring-service aggregate ID;
- aggregate type `RecurringService`;
- service-plan or agreement reference when applicable;
- participant references;
- stable occurrence or cycle IDs separate from the parent aggregate;
- explicit invoice, schedule, conversation, and document references.

### Lifecycle Boundaries

The Recurring Service lifecycle begins when an authorized recurring
arrangement is established. Individual visits or cycles may complete and close
without ending the parent relationship.

The future model must distinguish:

- parent recurring-service lifecycle;
- individual service occurrence or cycle;
- pause, renewal, cancellation, and termination.

### Completion Boundary

Completion may apply to an individual visit or cycle. A completed visit does
not mean the recurring service is closed.

### Closure Boundary

Closure may apply to:

- an individual occurrence;
- a billing or service cycle;
- the parent recurring-service aggregate.

Those scopes must have explicit identities. This specification does not select
which obligations apply at each scope.

### History Relationship

History records parent and occurrence events without merging their identities.
It may show completed visits, open obligations, cycle Closure, relationship
changes, and eventual service termination.

### Relationship Relationship

The ongoing participant relationship may predate and outlive the recurring
service agreement. Closing a cycle or terminating a service plan does not
delete relationship history.

### Obligation Registry Attachment

The registry must declare its scope: parent service, cycle, or occurrence.
Obligations must never be silently copied from one scope to another.

## Closure Aggregate Specification

### Definition

A future Closure Aggregate is:

> A coordination layer that evaluates obligation status for one explicitly
> identified operational aggregate.

It represents a Closure review context, not a replacement for the Project,
Work Order, Emergency, or Recurring Service aggregate.

### Logical Responsibilities

The Closure Aggregate may:

- identify its operational aggregate by canonical ID and type;
- read the aggregate's Completion state;
- read the logical obligation registry;
- reference domain-owned evidence;
- characterize open, resolved, waived, disputed, and unknown obligations;
- report missing evidence and provenance conflicts;
- require human review;
- record or reference a future authorized Closure decision;
- expose an auditable readiness projection.

### Explicit Non-Ownership

The Closure Aggregate does not own:

- evidence;
- permits;
- inspections;
- payments;
- participant decisions;
- warranties;
- utility approvals;
- documents;
- follow-up task execution;
- dispute resolution;
- relationship reviews.

It must not mutate source-domain facts to make Closure ready.

### Conceptual Shape

The following is a logical specification, not a persistence schema:

```js
{
  closureAggregateId,
  operationalAggregateRef: {
    aggregateId,
    aggregateType
  },
  completionRef,
  obligationRegistry,
  readiness,
  reviewState,
  closureDecisionRef,
  historyRefs,
  warnings
}
```

This shape intentionally leaves authorization, persistence, audit storage, and
mandatory policy unresolved.

### Coordination Rule

The Closure Aggregate may coordinate obligation status only through references
to authoritative source-domain decisions and evidence.

It cannot convert:

- a claim into evidence;
- a display label into status authority;
- a document into regulatory approval;
- a message into task completion;
- archive state into Closure;
- History presence into Closure;
- review submission into Closure.

## Obligation Registry Specification

### Definition

The Obligation Registry is a read-only logical projection of obligations
associated with one operational aggregate.

It answers:

- What obligation is being reviewed?
- Is it applicable?
- What is its resolution state?
- Which source domain owns the evidence and resolution?
- Which evidence references are available?
- When was the entry last reviewed?
- What warnings remain?

It does not answer who may authorize Closure.

### Registry Entry Shape

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

This is a read model, not a database schema.

### Field Definitions

| Field | Meaning | Authority boundary |
| --- | --- | --- |
| `obligationId` | Stable identity of the obligation review item | Must not be a generic UI or array index |
| `obligationType` | Registered or preserved future obligation type | Type does not determine applicability by itself |
| `applicabilityStatus` | Whether the obligation applies to this aggregate | Requires future applicability authority or human review |
| `resolutionStatus` | Current resolution state | Must originate from or be verified against the owning domain |
| `evidenceReferences` | Stable references to domain-owned evidence | Registry references evidence; it does not copy authority |
| `sourceDomain` | Domain responsible for evidence and resolution | Must be explicit |
| `lastReviewedAt` | Time of the latest registry review | Not evidence occurrence time or source recording time |
| `reviewWarnings` | Identity, provenance, conflict, or policy warnings | Warnings remain visible and do not silently resolve |

### Registry Attachment Model

Each registry is scoped to exactly one:

- Project;
- Work Order;
- Emergency;
- Recurring Service parent;
- Recurring Service cycle or occurrence;
- future approved operational aggregate.

An obligation may reference related domain entities, but registry scope remains
the operational aggregate.

The registry must not be keyed solely by:

- conversation ID;
- quote ID;
- schedule ID;
- title;
- customer name;
- display card ID;
- generic source record ID.

### Representative Obligation Types

- Customer Confirmation
- Tenant Confirmation
- Payment
- Permit
- Inspection
- Warranty Handoff
- Documentation Delivery
- Follow-Up
- Utility Approval
- Dispute Resolution
- Future Obligation Types

This list is representative. It does not declare that any obligation is
mandatory for every operational aggregate.

## Applicability Status

| Status | Meaning |
| --- | --- |
| `applicable` | An approved authority or review determined that the obligation applies |
| `not_applicable` | An approved authority or review determined that the obligation does not apply |
| `unknown` | Available information cannot establish applicability |

Applicability is separate from resolution.

An obligation cannot be treated as resolved merely because it is
`not_applicable`. The registry must preserve the applicability decision and its
authority once future policy defines it.

## Resolution Status

| Status | Meaning |
| --- | --- |
| `open` | Applicable and unresolved |
| `resolved` | Owning domain reports resolution with sufficient evidence |
| `waived` | A future approved authority explicitly waived the obligation |
| `disputed` | Resolution is contested or conflicting |
| `unknown` | Available information cannot establish resolution |

Resolution status does not replace source-domain state.

## Applicability and Resolution Interaction

| Applicability | Resolution | Structural interpretation |
| --- | --- | --- |
| `applicable` | `open` | Unresolved obligation |
| `applicable` | `resolved` | Candidate resolved obligation, subject to evidence and provenance review |
| `applicable` | `waived` | Requires visible waiver authority and review |
| `applicable` | `disputed` | Unresolved and review-required |
| `applicable` | `unknown` | Unresolved and review-required |
| `not_applicable` | any | Preserve applicability decision; resolution should not be invented |
| `unknown` | any | Applicability review required before final readiness |

This specification does not define the final Closure-readiness algorithm.

## Evidence Boundaries

### Core Rule

**Closure references evidence. Closure never owns evidence.**

Evidence remains owned by:

- Payment Domain;
- Permit Domain;
- Inspection Domain;
- Document Domain;
- Participant Decision Domain;
- Utility Domain;
- Warranty Domain;
- Task/Scheduling Domain;
- Dispute/Change Resolution Domain;
- future approved domains.

### Evidence Reference Requirements

A future evidence reference should be able to identify:

- evidence ID;
- source domain;
- source entity ID;
- aggregate association;
- evidence type;
- actor and role when an action or decision is claimed;
- occurrence time;
- source-domain recorded time;
- provenance or conflict warnings.

This document does not define the final evidence-reference schema.

### Evidence Must Not Be Copied Into Authority

The registry may retain a snapshot or summary for reading only if future audit
policy permits it. The authoritative evidence remains in its source domain.

If a source changes, is revoked, conflicts, or becomes unavailable, the
registry must not silently preserve a false resolved state.

## Unknown Obligation Policy

Unknown is a valid architectural state.

### Unknown Applicability

Unknown applicability means available information cannot responsibly determine
whether the obligation applies.

It must:

- remain visible;
- require review;
- preserve source and warning information;
- avoid forced classification.

### Unknown Resolution

Unknown resolution means the obligation outcome cannot be established.

It must:

- remain unresolved;
- require review;
- avoid fallback to resolved, waived, or not applicable.

### Evolution Rule

Unknown must never automatically resolve.

Unknown must also never automatically block future architecture evolution.
Future obligation types and owners may be added while preserving old unknown
records for review and migration.

## Disputed Obligation Policy

A disputed obligation remains unresolved.

Disputed obligations:

- require review;
- retain conflicting evidence and provenance references;
- remain attached to the operational aggregate;
- must not disappear when work is completed or archived;
- must not be inferred merely from UI state.

Dispute resolution remains owned by its appropriate source domain. Conversation
may show the dispute but does not resolve it.

## Human Review Policy

Human review is valid and expected.

Human review is required when:

- evidence conflicts;
- provenance conflicts;
- aggregate or participant identity conflicts;
- applicability is unknown;
- resolution is disputed or unknown;
- external authority is unavailable;
- evidence has been revoked or cannot be verified;
- a waiver or exception is claimed;
- source-domain policy does not cover the case.

Human review does not automatically authorize:

- evidence verification outside the reviewer's domain;
- obligation waiver;
- obligation resolution;
- Closure.

Those permissions remain unresolved policy decisions.

## Authority Boundaries

Closure authority is explicitly prohibited in:

- Dashboard;
- Work Center;
- Command Center;
- Project Folder;
- Project Gallery;
- History;
- Conversation;
- Review Submission;
- Revenue Counters;
- Archive State;
- Display Labels.

### Allowed Responsibilities

Those modules may:

- read;
- summarize;
- recommend;
- navigate.

They may show:

- obligation counts;
- open or unknown warnings;
- missing-evidence indicators;
- source-domain status;
- links to the responsible domain;
- read-only Closure readiness.

### Prohibited Responsibilities

They may not:

- verify evidence;
- resolve obligations;
- waive obligations;
- authorize Closure;
- infer Closure from display placement;
- convert archive or history state into lifecycle authority.

### Domain-Specific Clarification

Project Folder may verify document identity, integrity, version, and delivery
only within a future Document Domain. It may not interpret a permit scan as
permit approval or a receipt image as payment settlement.

Completion may verify artifacts it creates. It may not verify external
obligations or authorize Closure.

The future Closure domain may verify that referenced source-domain evidence and
decisions meet approved policy. It may not replace the source domain.

## Completion vs Closure

### Completion

Work performed.

### Closure

Applicable obligations fulfilled or handled under future approved policy.

### Example

```text
Solar installed
  = Completed

Permit open
Inspection open
Utility approval open
  = Not Closed
```

The solar installation belongs in History as completed work while the
operational aggregate remains open for Closure responsibility.

## Closure vs History

History records events.

History does not authorize Closure.

History may contain:

- request and classification events;
- work events;
- Completion;
- obligation applicability reviews;
- evidence references;
- resolution events;
- waivers;
- disputes;
- follow-ups;
- Closure readiness;
- Closure decisions;
- later relationship activity.

An item appearing in completed history, project history, or conversation
history does not prove Closure.

## Closure vs Relationship

Projects end.

Relationships persist.

Closure ends an operational aggregate lifecycle under future approved policy.
It does not:

- delete contacts;
- revoke relationship history;
- prevent future communication where access remains valid;
- prevent repeat work;
- end warranty communication;
- erase disputes or follow-ups;
- terminate a recurring relationship unless a separate relationship or service
  decision does so.

Conversation access and relationship status remain governed by their own
domains.

## Closure Decision Reference

A future Closure Aggregate may reference a Closure decision, but this
specification does not define its implementation.

A future decision reference would need to preserve, at minimum:

- operational aggregate identity;
- reviewed registry version or state;
- unresolved warnings;
- decision outcome;
- decision authority;
- decision time;
- backend or external recording acknowledgement;
- audit references.

These are structural considerations only. They do not select who can decide,
what outcome values exist, or how the decision is stored.

## Structural Invariants

1. One Closure coordination context belongs to one explicit operational
   aggregate scope.
2. Completion and Closure remain separate states.
3. Applicability and resolution remain separate states.
4. Obligation identity remains stable.
5. Evidence identity remains owned by the source domain.
6. Registry entries reference evidence rather than becoming evidence.
7. Unknown and disputed states remain visible.
8. Human review remains available.
9. History remains a read projection.
10. Relationship survives aggregate Closure.
11. Presentation modules never authorize Closure.
12. No generic ID or title matching may establish Closure identity.

## Unresolved Policy Decisions

This specification documents but does not answer:

1. Which obligations are mandatory?
2. Who may determine applicability?
3. Who may waive obligations?
4. Who authorizes Closure?
5. What evidence threshold is sufficient?
6. What backend authority model is required?
7. How Closure is persisted?
8. How Closure is audited?
9. Whether Closure can be reopened and by whom?
10. How revoked or superseded evidence affects a prior decision?
11. Which obligations apply by aggregate type, jurisdiction, agreement, or
    workflow?
12. How Recurring Service parent, cycle, and occurrence Closure interact?
13. Which exceptions are allowed for emergencies, inaccessible participants,
    offline payment, or unavailable external authorities?

No runtime implementation should silently answer these questions.

## Specification Readiness

| Area | Status | Notes |
| --- | --- | --- |
| Completion separation | READY | Work performed is distinct from obligations fulfilled |
| Operational aggregate types | READY for specification | Project, WorkOrder, Emergency, and RecurringService boundaries are defined |
| Closure coordination role | READY for specification | Coordination and non-ownership are explicit |
| Obligation registry read shape | READY for validation | Logical fields and status sets are defined |
| Evidence ownership | READY for specification | References remain domain-owned |
| Unknown/disputed handling | READY for validation | Both remain visible and review-required |
| Human review | PARTIAL | Valid structurally; authority remains unresolved |
| Mandatory obligation policy | BLOCKED | Product decision required |
| Waiver authority | BLOCKED | Product and authorization decision required |
| Closure authorization | BLOCKED | Product and backend authority decision required |
| Persistence and audit | BLOCKED | Backend and compliance design required |
| Runtime adoption | BLOCKED | Policy, authority, identity, adapters, and persistence are unresolved |

## Recommended Completion Phase 8

Create a pure, non-persisting **Closure Aggregate and Obligation Registry
Validation Contract**.

Phase 8 may validate structural rules only:

- canonical aggregate ID and supported aggregate type are present;
- registry entries have stable obligation IDs;
- applicability and resolution statuses are supported;
- source domains and evidence references are explicit;
- unknown and disputed states remain review-required;
- evidence references are not treated as owned evidence;
- parent, cycle, and occurrence scopes remain distinct;
- input is deterministic and not mutated.

Phase 8 must not:

- decide mandatory obligations;
- decide applicability;
- decide waiver authority;
- decide Closure authorization;
- create adapters;
- read runtime storage;
- persist registry or Closure state;
- connect to UI or workflow;
- migrate existing records.

After structural validation, a later audit should measure representative
fixtures without adopting Closure.
