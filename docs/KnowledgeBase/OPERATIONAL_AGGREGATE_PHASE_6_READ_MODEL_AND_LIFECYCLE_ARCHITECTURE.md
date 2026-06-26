# Operational Aggregate Phase 6 - Read Model and Lifecycle Architecture

## Status

- Architecture and specification only
- No runtime or UI adoption
- No routing, storage, persistence, migration, or backend schema changes
- No aggregate creation or projection implementation
- No lifecycle command implementation

## 1. Executive Summary

An Operational Aggregate is Meetro's authoritative work context for one
explicitly identified unit of operational responsibility.

Supported aggregate types are:

- `Project`
- `WorkOrder`
- `Emergency`
- `RecurringService`

The aggregate owns:

- stable aggregate identity;
- aggregate type;
- operational scope;
- aggregate lifecycle state;
- work authorization state;
- typed references to related domains;
- lifecycle provenance.

The aggregate does not absorb the authority of Service Request,
Classification, Conversation, Schedule, Quote, Completion, Closure, History,
or Relationship.

This specification defines three related but separate concepts:

1. **Aggregate authority:** the source of work identity and lifecycle truth.
2. **Aggregate read model:** a non-authoritative projection that summarizes
   the aggregate and references related source-owned records.
3. **Aggregate lifecycle:** the authoritative state progression of the work
   context, independent from communication and supporting workflow state.

The governing relationship is:

```text
Intent
  -> Service Request
  -> Information Gathering
  -> Classification
  -> Operational Aggregate
  -> Work
  -> Completion
  -> Closure
  -> History
  -> Relationship
```

This sequence describes conceptual progression, not identity inheritance.
Every domain retains its own identity, state, ownership, and survivability.

## 2. Read Model Principles

An Operational Aggregate read model is a replaceable projection over
authoritative sources.

It may:

- summarize;
- display;
- navigate;
- aggregate counts;
- aggregate typed references;
- expose lifecycle state supplied by aggregate authority;
- expose related domain state supplied by each owning domain;
- expose provenance, uncertainty, and compatibility warnings;
- support filtering and read-only reporting.

It may not:

- create aggregate identity;
- infer aggregate type;
- classify work;
- create or change lifecycle state;
- authorize work;
- authorize Completion;
- authorize Closure;
- verify source-domain evidence;
- grant Conversation access;
- create Schedule, Quote, Completion, Closure, History, or Relationship truth;
- write reconciled values back as authority.

Projection completeness does not create authority. A complete-looking record
remains a read model.

Projection incompleteness must remain visible. Missing or conflicting source
data must produce warnings, blocked fields, or unknown values rather than
guesses.

## 3. Authority Preservation Rules

1. Every projected field has a named source authority.
2. Every cross-domain reference is typed.
3. Aggregate identity is always `{ aggregateId, aggregateType }`.
4. Related entity IDs never substitute for aggregate identity.
5. The projection preserves source IDs unchanged.
6. The projection does not copy a source-owned status into aggregate state.
7. Aggregate lifecycle state is read only from aggregate authority.
8. Communication state remains owned by Conversation.
9. Workflow state remains owned by its workflow domain.
10. Completion remains work-performance evidence.
11. Closure remains obligation-resolution authority.
12. History remains durable memory.
13. Relationship remains persistent relational authority.
14. Compatibility values remain labeled, non-authoritative, and read-only.
15. Unknown, disputed, missing, and conflicting values remain explicit.
16. A projection refresh may change the displayed summary but cannot alter
    source authority.
17. Navigation may locate an owner but cannot execute an owner-only command.
18. Dashboard, Work Center, Command Center, Project Folder, Project Gallery,
    Conversation, and History screens remain consumers.

## 4. Aggregate Read Model

The following is a logical read shape, not a persistence schema or runtime
interface:

```js
{
  aggregateRef: {
    aggregateId,
    aggregateType
  },
  lifecycle: {
    state,
    stateEventRef,
    changedAt,
    changedBy,
    provenance
  },
  scope: {
    summary,
    locationRefs,
    participantRefs,
    recurringScope
  },
  serviceRequestRefs,
  classificationRefs,
  conversationRefs,
  scheduleRefs,
  quoteRefs,
  completionRefs,
  closureRef,
  historyRefs,
  relationshipRefs,
  counts,
  readiness,
  provenance,
  compatibilityWarnings
}
```

### Required Characteristics

- `aggregateRef` comes only from aggregate authority.
- `lifecycle.state` comes only from an accepted aggregate lifecycle event.
- Related references contain source identity, source domain, and source-owned
  status when relevant.
- `counts` are derived summaries and carry no authority.
- `readiness` describes projection quality, not work or Closure readiness.
- `provenance` identifies source versions or acknowledgement state.
- `compatibilityWarnings` remain visible whenever legacy reconciliation is
  involved.

### Copy Versus Reference

The read model may copy:

- stable display labels;
- source-owned status snapshots;
- approved summary text;
- counts;
- timestamps for display;
- participant display projections;
- provenance summaries.

The read model must reference rather than own:

- canonical identities;
- Conversation membership and access;
- Schedule entries;
- Quote terms and decisions;
- Completion artifacts;
- payment, permit, inspection, warranty, utility, dispute, or document
  evidence;
- obligation registry entries;
- Closure decisions;
- canonical History events;
- Relationship identity.

## 5. Projection Boundaries

### Permitted Projection Sources

A future projection may consume sources classified:

- `READY_FOR_READ_PROJECTION`;
- `NEEDS_REVIEW_BEFORE_PROJECTION`, only with visible warnings and without
  authority claims.

Sources classified `BLOCKED_FROM_PROJECTION` must not be projected as
aggregate truth.

Sources classified `NOT_OPERATIONAL_SOURCE` may appear as related references
when authorized, but cannot become aggregate records.

### Permitted Consumers

Potential read-only consumers include:

- Work Center;
- Dashboard;
- Command Center;
- Project Folder;
- Project Gallery;
- Conversation workflow cards;
- History views;
- reporting and business intelligence;
- future aggregate detail views.

### Prohibited Projection Authority

No consumer may use the projection to:

- mint identity;
- select aggregate type;
- execute lifecycle transitions;
- create domain entities;
- resolve conflicts;
- convert warnings to trusted data;
- authorize Completion or Closure;
- reopen or terminate Relationship.

### Refresh and Staleness

A future projection must disclose:

- projection generation time;
- source acknowledgement time where available;
- stale source references;
- source conflicts;
- missing authoritative sources;
- compatibility-only references.

Stale projection state must not be used as command precondition authority.
Commands must revalidate against the owning domain.

## 6. Aggregate Lifecycle Model

The aggregate lifecycle represents the operational responsibility itself.

The baseline lifecycle is:

```text
created
  -> authorized
  -> scheduled
  -> active
  -> paused
  -> active
  -> completed
  -> closure_review
  -> closed
```

Not every aggregate must visit every state. For example:

- an Emergency may move from `authorized` to `active` without `scheduled`;
- a Project may be `authorized` before its first Schedule exists;
- a WorkOrder may have no Quote;
- a RecurringService parent may remain `active` while occurrences complete
  and close.

Separate terminal or diversion outcomes may eventually include:

- `cancelled`;
- `rejected`;
- `expired`;
- `superseded`.

Those outcomes require future policy and are not defined as active runtime
states by this phase.

### Lifecycle Event Rule

Every authoritative state change must eventually have:

- stable lifecycle event identity;
- aggregate identity and type;
- prior state;
- next state;
- authorized actor and role;
- occurrence time;
- persistence acknowledgement time;
- command or decision provenance;
- idempotency protection.

A status label, tab placement, local array membership, message, appointment,
Quote, Completion record, Closure projection, or History entry cannot by
itself establish the state transition.

## 7. Lifecycle State Definitions

| State | Meaning | Entry evidence | State does not mean |
| --- | --- | --- | --- |
| `created` | Aggregate identity and type exist | Accepted aggregate creation authority | Work is authorized |
| `authorized` | Work may proceed under approved authority | Explicit work authorization decision | Appointment exists or work started |
| `scheduled` | Aggregate has an approved future operational appointment or dispatch dependency | Aggregate transition referencing Schedule authority | Appointment completion or work Completion |
| `active` | Operational work is in progress | Authorized start/resume command | Message activity or Quote acceptance |
| `paused` | Work responsibility remains open but execution is temporarily suspended | Authorized pause command and reason | Completion, cancellation, or Closure |
| `completed` | Required work-performance boundary has been recorded | Aggregate transition referencing valid Completion authority | Obligations are resolved or aggregate is closed |
| `closure_review` | Completion exists and applicable obligations are under review | Explicit Closure review transition | Closure is authorized |
| `closed` | Future approved Closure authority has accepted obligation resolution for this aggregate scope | Authoritative Closure decision | Relationship ends or History stops |

### State Invariants

- Identity and type survive all transitions.
- `completed` may coexist with open obligations.
- `closure_review` may contain unknown, disputed, waived, or open obligations.
- `closed` does not delete supporting sources.
- `closed` does not revoke Conversation access automatically.
- `closed` does not terminate Relationship.
- A later dispute or follow-up appends History and may require a future
  obligation workflow; it does not silently rewrite the historical Closure
  event.

## 8. Communication vs Workflow vs Aggregate State Separation

### Communication State

Examples:

- `viewed`
- `unread`
- `messaged`
- `replied`

Owner: Conversation and Message domains.

Communication state describes participant interaction. It must not:

- create an aggregate;
- authorize work;
- move an aggregate to `active`;
- prove Completion;
- authorize Closure;
- reopen a closed aggregate.

### Workflow State

Examples:

- `quote_requested`
- `quote_sent`
- `quote_revised`
- `materials_pending`
- `appointment_requested`

Owner: the relevant workflow domain.

Workflow state describes coordination around the aggregate. It may be a
precondition or evidence for a future aggregate command, but it must not be
copied into aggregate state.

Examples:

- `quote_sent` does not mean `authorized`;
- `appointment_requested` does not mean `scheduled`;
- `materials_pending` does not mean `paused` unless aggregate authority
  accepts a pause transition;
- a workflow card marked complete does not mean aggregate `completed`.

### Aggregate State

Examples:

- `created`
- `authorized`
- `scheduled`
- `active`
- `paused`
- `completed`
- `closure_review`
- `closed`

Owner: Operational Aggregate authority.

The read model may display all three state families together, but each must be
typed and labeled by domain.

## 9. Relationship Mapping

| Related domain | Owner | Reference direction | Lifecycle dependency | Survivability |
| --- | --- | --- | --- | --- |
| Service Request | Intake authority | Aggregate references source request; request may reference created aggregates | May precede creation; does not control later state | Survives aggregate creation and Closure |
| Classification | Decision-support authority | Aggregate references decision used at creation; classification history references request | May recommend type; cannot transition aggregate | Survives reclassification and Closure |
| Conversation | Communication authority | Aggregate references Conversations; Conversation may reference aggregate when explicitly linked | No direct lifecycle authority | May predate and outlive aggregate |
| Schedule | Appointment authority | Aggregate references appointments/dispatches | Can support `scheduled`; cannot set it directly | Records survive cancellation, Completion, and Closure |
| Quote | Pricing/proposal authority | Aggregate references Quotes; Quote references aggregate when explicitly linked | Acceptance may support authorization policy | Quote history survives aggregate lifecycle |
| Completion | Performance evidence authority | Completion must reference aggregate and scope | Required evidence for `completed`; cannot set Closure | Survives Closure as evidence |
| Closure | Obligation-resolution authority | Closure references aggregate and source-owned evidence | Required authority for `closed` | Decision and registry survive in History |
| History | Durable memory authority | History references all domain events | Records transitions; cannot execute them | Begins before creation and continues after Closure |
| Relationship Graph | Persistent relational authority | Aggregate references relationships and participants | No aggregate lifecycle authority | Predates and outlives aggregate |

Relationship mapping is a graph of typed references, not a chain of reused
IDs.

## 10. Service Request Relationship

### Ownership

Service Request owns intent, intake information, urgency, scope evidence, and
information sufficiency.

### Reference Direction

- Aggregate references one or more originating Service Requests.
- Service Request may reference zero, one, or multiple resulting aggregates.

### Lifecycle Dependency

The request may be required before aggregate creation under future workflow
policy. It does not control aggregate lifecycle after creation.

### Survivability

Service Request survives:

- classification;
- aggregate creation;
- aggregate type selection;
- Completion;
- Closure;
- later Relationship activity.

Its identity never becomes aggregate identity.

## 11. Classification Relationship

### Ownership

Classification owns evidence-based recommendation, confidence, review status,
decision provenance, and prior classification history.

### Reference Direction

- Aggregate creation provenance references the classification decision used.
- Classification references its Service Request and may reference a later
  aggregate outcome for audit only.

### Lifecycle Dependency

Classification may recommend aggregate type. It cannot:

- create the aggregate;
- create aggregate identity;
- authorize work;
- change lifecycle state.

### Survivability

Classification history survives later type decisions and Closure. A new
classification does not silently rewrite the historical reason an aggregate
was created.

## 12. Conversation Relationship

### Ownership

Conversation owns identity, participants, audience, access, messages,
communication state, and allowed actions.

### Reference Direction

- Aggregate may reference zero, one, or multiple Conversations.
- Conversation may reference zero, one, or multiple aggregates when explicit
  links exist.
- A Relationship-scoped Conversation may exist without an aggregate.

### Lifecycle Dependency

Conversation has no direct aggregate lifecycle authority. Communication can
request or discuss a transition, but the owning command boundary must perform
it.

### Survivability

- Conversation may begin before aggregate creation.
- Conversation may continue after Completion or Closure.
- Archiving Conversation does not close the aggregate.
- Closing the aggregate does not revoke Conversation access.

## 13. Schedule Relationship

### Ownership

Schedule owns appointment identity, time, location, assignment, visit status,
rescheduling, cancellation, and occurrence timing.

### Reference Direction

- Aggregate references relevant Schedule entries.
- Schedule references aggregate identity when explicitly associated.

### Lifecycle Dependency

An accepted Schedule may support an aggregate transition to `scheduled`.
Schedule cannot perform that transition itself.

A Schedule status of completed means the appointment occurred or ended. It
does not mean operational work is completed.

### Survivability

Schedule records survive aggregate state changes for audit and History.
Rescheduling does not replace aggregate identity.

## 14. Quote Relationship

### Ownership

Quote owns proposal identity, versions, terms, price, scope proposal, status,
and acceptance evidence.

### Reference Direction

- Aggregate may reference zero, one, or multiple Quotes.
- Quote references aggregate identity only through explicit association.

### Lifecycle Dependency

Under future policy, an accepted Quote may be required before work
authorization. It does not:

- create aggregate identity;
- create aggregate type;
- automatically set `authorized`;
- replace aggregate scope authority.

### Survivability

Quote versions and decisions survive Completion and Closure. A revised Quote
does not rewrite prior aggregate lifecycle events.

## 15. Completion Relationship

### Ownership

Completion owns performed-work evidence, Completion identity, occurrence time,
summary, artifacts, performer provenance, and typed aggregate scope.

### Reference Direction

- Completion must reference aggregate identity and type.
- Aggregate references one or multiple Completion records.

### Lifecycle Dependency

Valid Completion evidence is required for an aggregate transition to
`completed`. The transition remains owned by aggregate authority.

Completion cannot:

- change aggregate type;
- resolve obligations;
- authorize `closure_review`;
- authorize `closed`.

### Survivability

Completion survives Closure as immutable performance evidence. Partial,
occurrence, or cycle Completions remain distinct.

## 16. Closure Relationship

### Ownership

Closure owns coordination and future authorization of obligation resolution
for one typed aggregate scope.

### Reference Direction

- Closure references aggregate identity and type.
- Aggregate references the applicable Closure context and decision.
- Closure references, but does not own, source-domain evidence.

### Lifecycle Dependency

- `completed` may permit entry into `closure_review`.
- `closure_review` does not imply `closed`.
- Only future approved Closure authority may support transition to `closed`.

Completion, History, archive state, display labels, review submission, and
Conversation state cannot authorize Closure.

### Survivability

Closure decision, obligation registry, warnings, and source evidence
references survive in History. Closure does not terminate Relationship.

## 17. History Relationship

### Ownership

History owns immutable, provenance-aware memory.

### Reference Direction

History references:

- Service Request;
- classification decisions;
- aggregate lifecycle events;
- Conversation events;
- Schedule events;
- Quote events;
- Completion;
- obligation evidence references;
- Closure decisions;
- later Relationship activity.

### Lifecycle Dependency

History records lifecycle transitions after their owning authorities accept
them. It cannot create or authorize a transition.

### Survivability

History begins before aggregate creation and continues after Closure. It may
record corrections, disputes, follow-ups, and later relationship events
without reopening work automatically.

## 18. Relationship Graph Relationship

### Ownership

The Relationship Graph owns persistent relational context between identities.

### Reference Direction

- Aggregate references participant and relationship identities.
- Relationship references shared requests, aggregates, and Conversations as
  authorized.

### Lifecycle Dependency

Relationship does not authorize aggregate transitions. Participant membership
may be a command authorization input, but Relationship state is not aggregate
state.

### Survivability

- Relationship may predate all Service Requests.
- One Relationship may span many aggregates.
- One aggregate may involve many Relationships.
- Closure does not terminate Relationship.
- New work creates a new aggregate or approved occurrence, not a new customer
  identity by default.

## 19. Recurring Service Relationship Model

RecurringService requires three distinct operational scopes:

```text
Parent Service
  -> Cycle
      -> Occurrence
```

### Parent Service

Owns the ongoing service arrangement.

It may contain:

- agreement or service-plan references;
- participants;
- overall authorization;
- recurrence pattern;
- parent-level pause, renewal, cancellation, or termination;
- cycle and occurrence references.

The parent may remain `active` while occurrences are completed or closed.

### Cycle

Represents an explicit billing, service, or operational period when the
business model requires one.

A cycle has:

- stable cycle identity;
- parent reference;
- cycle-specific Schedule, Quote, Completion, Closure, and History
  references where applicable.

Closing a cycle does not close the parent.

### Occurrence

Represents one visit or bounded delivery of recurring work.

An occurrence has:

- stable occurrence identity;
- parent reference;
- optional cycle reference under future approved scope policy;
- occurrence Schedule;
- occurrence work state;
- occurrence Completion;
- occurrence Closure where obligations apply.

### What Completes

- An occurrence Completion completes that occurrence's work.
- A cycle Completion completes cycle-scoped work only when explicitly
  modeled.
- Parent Completion applies only to an explicit parent-level completion
  boundary, not the latest occurrence.

### What Closes

- Occurrence Closure closes occurrence obligations only.
- Cycle Closure closes cycle obligations only.
- Parent Closure closes the parent service only through future approved parent
  termination authority and parent obligation review.

### What Survives

- Parent identity survives occurrence and cycle Completion.
- Relationship survives occurrence, cycle, and parent Closure.
- History preserves all scopes without merging IDs.
- Conversation may span parent and occurrences when audience and access permit.
- Schedule, Quote, Completion, and Closure records remain scoped to their
  owning parent, cycle, or occurrence.

No occurrence or cycle event may silently change parent lifecycle.

## 20. Aggregate Navigation Model

Navigation locates authoritative domains. It does not confer authority.

### Logical Navigation Targets

A future aggregate read view may navigate to:

- originating Service Request;
- classification review;
- Conversation;
- Schedule;
- Quote;
- work detail;
- Completion evidence;
- Closure review;
- History;
- Relationship;
- recurring parent, cycle, or occurrence.

### Navigation Reference

Every navigation action must carry a typed target:

```js
{
  entityType,
  entityId,
  aggregateRef,
  sourceDomain,
  accessContext
}
```

This is a logical shape only.

### Navigation Rules

1. Route state is not identity authority.
2. Active selection is not identity authority.
3. A generic `id` is insufficient without entity type.
4. Access must be checked by the target domain.
5. Missing target identity disables navigation and shows a warning.
6. Compatibility navigation must remain visibly non-authoritative.
7. Navigating from History does not reopen work.
8. Navigating from Conversation does not create aggregate membership.
9. Navigating to Closure does not authorize Closure.
10. Back navigation must not rely on mutating aggregate lifecycle state.

## 21. Read Projection Risks

### Authority Leakage

A complete projection may be mistaken for an aggregate record and written back
as authority.

### Identity Promotion

Request, Conversation, Quote, Schedule, Completion, Emergency, Relationship,
or generic IDs may be reused as aggregate identity.

### Stale State

A cached lifecycle label may be displayed after authoritative state changes.

### Silent Conflict Resolution

Projection code may choose one source when identities, types, or statuses
conflict.

### Compatibility Permanence

Temporary read-reconciliation values may become permanent backend fields.

### Count Distortion

Duplicate source records may inflate aggregate counts, revenue, Completion, or
History.

### Hidden Unknowns

Missing provenance or unresolved identity may be replaced with polished
display defaults.

## 22. Lifecycle Risks

### Communication-State Promotion

`replied`, `viewed`, or message activity may be interpreted as work progress.

### Workflow-State Promotion

`quote_sent`, `appointment_requested`, or workflow card status may be treated
as aggregate state.

### Completion/Closure Conflation

Completed work may hide open payment, permit, inspection, warranty,
documentation, follow-up, utility, participant, or dispute obligations.

### Screen-Owned Transitions

Dashboard, Work Center, Command Center, Project Folder, Conversation, or
History may become accidental lifecycle authorities.

### Type Mutation

Later workflow records may silently change Project to WorkOrder, Emergency, or
RecurringService, or the reverse.

### Recurring Parent Closure

One occurrence may close an entire ongoing service.

### Non-Idempotent Commands

Repeated actions may produce duplicate lifecycle transitions.

## 23. Relationship Risks

### Relationship Termination

Aggregate Closure may incorrectly remove a valid long-term customer or
professional relationship.

### Conversation Coupling

One Conversation may be treated as the aggregate or Relationship itself.

### Participant Leakage

Participants from one aggregate, property, audience, cycle, or occurrence may
be exposed in another.

### Manual Customer Collapse

Manual Customer identity may be replaced by phone, email, request, or
aggregate identity.

### Tenant and Property Manager Scope Loss

Role-specific visibility may be flattened into one project-wide audience.

### Repeat Work Merge

New work may be merged into a closed aggregate instead of creating an approved
new aggregate or occurrence.

### History as Relationship

Historical co-occurrence may be mistaken for current access or communication
permission.

## 24. Future Runtime Requirements

Runtime adoption remains blocked until the system can provide:

### Identity and Persistence

- stable `serviceRequestId`;
- stable `aggregateId`;
- explicit `aggregateType`;
- typed cross-domain references;
- aggregate creation provenance;
- backend acknowledgement;
- no cross-domain ID substitution.

### Lifecycle Command Authority

- approved aggregate creation command;
- explicit transition commands;
- transition authorization policy;
- prior-state validation;
- idempotency;
- immutable lifecycle events;
- actor and role provenance;
- occurrence and recorded timestamps;
- concurrency conflict handling.

### Read Projection Infrastructure

- source registry and adapters approved for read use;
- source version and freshness metadata;
- field-level provenance;
- conflict and unknown reporting;
- deterministic deduplication;
- compatibility warnings;
- permission-filtered participant and Conversation references;
- no projection writes.

### Completion and Closure

- typed Completion references;
- source-owned evidence references;
- obligation registry ownership;
- Closure authorization policy;
- waiver and dispute policy;
- RecurringService scope-specific Completion and Closure.

### History and Relationship

- immutable lifecycle History;
- durable source event identity;
- Relationship references independent from aggregate lifecycle;
- post-Closure communication policy;
- tenant, property manager, team, vendor, registered user, and Manual Customer
  visibility rules.

### Consumer Guardrails

- Work Center remains an operational shell;
- Dashboard remains summary and navigation;
- Command Center remains business oversight;
- Project Folder remains document and artifact presentation;
- Conversation remains communication;
- History remains memory;
- no presentation module may execute aggregate transitions without an
  authorized aggregate command boundary.

## 25. Recommended Phase 7

Operational Aggregate Phase 7 should be a **Lifecycle Transition and Read
Projection Eligibility Contract**, implemented only as pure, non-persisting
validation utilities and fixtures.

Phase 7 should validate:

- typed aggregate identity;
- prior and proposed aggregate state;
- separation from communication and workflow state;
- required authoritative references for a proposed transition;
- Completion prerequisites for `completed`;
- Closure prerequisites for `closed`;
- recurring parent, cycle, and occurrence scope;
- source readiness classification;
- projection field provenance;
- prohibited consumer authority;
- deterministic transition and projection warnings.

Phase 7 must not:

- create aggregates;
- execute lifecycle transitions;
- persist events;
- build a runtime projection;
- change UI or routing;
- read or write browser storage;
- create migrations or backend schema;
- decide unresolved authorization, mandatory obligation, waiver, cancellation,
  expiration, supersession, or recurring parent termination policy.

The output should measure architecture readiness only. Runtime adoption must
remain blocked until identity, persistence, authorization, and lifecycle
command authority exist.
