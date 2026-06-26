# Operational Aggregate Runtime Phase 1 - Backend Identity Strategy

## Status

- Planning only
- No backend or frontend implementation
- No schema, migration, storage, routing, or runtime changes
- No aggregate creation or identity backfill

## 1. Executive Summary

The minimum backend requirement for future Operational Aggregate identity is
not a complete aggregate lifecycle system.

The first requirement is an authoritative identity boundary that can:

1. preserve canonical Service Request identity;
2. distinguish every existing workflow entity identity;
3. allow Operational Aggregate identity to remain absent;
4. issue aggregate identity only through an explicit future backend
   acknowledgement;
5. return typed, provenance-qualified references without replacing legacy
   fields.

The safe compatibility model is:

```text
Current legacy record
  -> preserve original identity and behavior
  -> optionally receive backend identity metadata
  -> expose read-only typed reference when authoritative
  -> no automatic aggregate creation
  -> no identity backfill from legacy aliases
```

The strategy must not require every request to become an aggregate. A Service
Request may remain:

- unclassified;
- under information gathering;
- Consultation;
- Unknown;
- withdrawn;
- rejected;
- retained for later review.

`aggregateId` should remain absent or explicitly null until backend aggregate
authority exists. Absence is safer than a guessed identifier.

The first runtime planning objective is therefore:

> Define an additive backend identity contract that can preserve intake
> identity now and support authoritative aggregate identity later without
> changing current workflow behavior.

## 2. Current Runtime Identity Inventory

Current Meetro identities are workflow-specific and inconsistently propagated.

| Identity | Current runtime meaning | Legitimate authority | Current aggregate risk |
| --- | --- | --- | --- |
| `requestId` | Lead, homeowner request, quote request context, or active-work context | Current request/intake source | Frequently promoted to `projectId` |
| `projectId` | Explicit Project-like value or compatibility output containing another entity's ID | Unknown or inconsistent in current client | Cannot be trusted without provenance |
| `quoteId` | Quote or proposal lifecycle identity | Quote workflow | Sometimes reused as job or active-work identity |
| `conversationId` | Conversation/thread and local job-record grouping identity | Conversation source, mostly client-side today | Promoted to request or Project compatibility identity |
| `scheduleId` | Appointment, visit, or dispatch identity | Scheduling workflow | Sometimes reused as request identity |
| `completionId` | Completion record identity when present | Completion workflow | Often absent or disconnected from aggregate identity |
| `emergencyId` | Emergency request, dispatch, or workflow identity | Emergency workflow | Promoted into request or Project-shaped identity |

### `requestId`

`requestId` currently represents several intake and workflow source shapes.
It should not automatically become `serviceRequestId` until the backend can
prove which source record owns intake identity.

Where the backend already owns a durable request record, that record is the
best candidate for canonical intake identity. The API may expose:

```js
{
  serviceRequestId,
  legacyRequestRef
}
```

This is a planning shape, not a schema.

### `projectId`

Current `projectId` values fall into at least two groups:

1. potentially explicit Project values;
2. compatibility values derived from request, Quote Request, Conversation,
   Emergency, post, job, or generic IDs.

Without provenance, both must remain compatibility identities.

### `quoteId`

`quoteId` belongs to Quote authority. It may later reference an aggregate, but
cannot create one.

### `conversationId`

`conversationId` belongs to Conversation authority. Existing backend evidence
does not show a canonical Conversation table or authoritative Conversation ID
on messages. Client navigation and local storage cannot establish backend
Conversation authority.

### `scheduleId`

`scheduleId` belongs to Scheduling. It may be linked to a typed aggregate but
cannot become aggregate identity.

### `completionId`

`completionId` belongs to Completion. A Completion record may eventually
require an aggregate reference, but Completion identity remains distinct.

### `emergencyId`

`emergencyId` remains Emergency identity. An Emergency may itself become an
Operational Aggregate only when a backend authority explicitly creates:

```js
{
  aggregateId,
  aggregateType: "Emergency",
  sourceEmergencyRef
}
```

The Emergency ID must not be reused as `aggregateId`.

## 3. Identity Collision Risks

### Known Collision Patterns

| Collision | Current pattern | Consequence |
| --- | --- | --- |
| Request to Project | `requestId` returned or stored as `projectId` | Intake appears to be work authority |
| Quote Request to Project | `quoteRequestId` accepted as Project identity | Quote workflow creates false aggregate context |
| Quote to Job | `quoteId` used as active-work fallback | Pricing identity becomes work identity |
| Conversation to Project | `conversationId` used as request, job record, or Project key | Communication becomes work authority |
| Schedule to Request | `scheduleId` reused after visit outcome | Appointment becomes intake identity |
| Emergency to Project | `emergencyId` promoted through compatibility helpers | Emergency type and scope are lost |
| Completion to Project | Completion record stored as completed Project | Performance evidence becomes aggregate identity |
| Generic ID promotion | `id`, title, customer, or timestamp used for matching | False merge or false split |

### Backend Collision Rule

The backend must never accept an untyped identifier and reinterpret its
entity domain.

Every identity-bearing request or response should eventually include:

```js
{
  entityType,
  entityId,
  authority,
  provenance
}
```

This is a conceptual contract only.

### Collision Handling

When identities conflict:

- preserve each source value;
- return a conflict or warning;
- do not choose one silently;
- do not create an aggregate;
- do not persist a canonical link;
- require review or authoritative resolution.

## 4. Service Request Identity Strategy

### Target

`serviceRequestId` becomes the canonical identity of customer intent and
information gathering.

### Minimum Backend Authority

The backend must be able to:

- create or identify one durable intake record;
- return a stable `serviceRequestId`;
- preserve source type and legacy source identity;
- preserve requester and creation provenance;
- distinguish a Service Request from Quote Request, Schedule, Conversation,
  Emergency dispatch, and aggregate identity;
- return the same ID on repeated reads;
- prevent duplicate creation under retry or explicitly report duplicate
  candidates;
- allow a request to exist with no aggregate.

### Compatibility Mapping

An existing `requestId` may be mapped to `serviceRequestId` only when the
backend proves they identify the same durable intake record.

Acceptable:

```js
{
  serviceRequestId: "sr-123",
  legacyRequestRef: {
    entityType: "homeowner_request",
    entityId: "legacy-42"
  }
}
```

Unacceptable:

```js
{
  serviceRequestId: legacyRecord.requestId
}
```

when the backend has not established ownership and uniqueness.

### Required Answer

**Can `serviceRequestId` become canonical intake identity?**

Yes. It is the safest first canonical identity in this strategy, provided the
backend owns a durable intake record and returns stable provenance.

It must not be created by renaming every current `requestId`.

## 5. Aggregate Identity Strategy

### Target

Operational Aggregate identity is:

```js
{
  aggregateId,
  aggregateType
}
```

### Creation Rule

Only future backend aggregate creation authority may issue `aggregateId`.

The authority must eventually accept:

- one or more Service Request references;
- an approved aggregate type;
- classification decision reference;
- creation actor and role;
- idempotency context;
- source and decision provenance.

It must return:

- stable `aggregateId`;
- explicit `aggregateType`;
- accepted source references;
- creation acknowledgement;
- persistence-owned timestamp;
- replay or conflict status.

### Absence Rule

`aggregateId` may and should remain absent when:

- no aggregate has been created;
- classification is Unknown or Consultation;
- information gathering is incomplete;
- backend authority is unavailable;
- legacy records have only compatibility identity;
- source links conflict;
- aggregate type is unresolved.

An absent aggregate reference is not a failure. It is an accurate
representation of current authority.

### Required Answer

**Can `aggregateId` remain absent until backend authority exists?**

Yes. It should remain absent. A null or omitted aggregate reference is safer
than a request-, Quote-, Conversation-, Schedule-, Completion-, Emergency-, or
generic-derived value.

## 6. Aggregate Type Strategy

Supported types are:

- `Project`;
- `WorkOrder`;
- `Emergency`;
- `RecurringService`.

### Backend Responsibilities

The backend must eventually:

- accept only approved aggregate types;
- preserve type as an explicit field;
- preserve the classification decision used at creation;
- reject category- or screen-derived type inference;
- prevent a related source from silently changing type;
- return type with every aggregate reference;
- record any future authorized type correction or replacement as an auditable
  decision.

### Type Immutability

Whether aggregate type is immutable remains a product decision.

Until that policy exists:

- no client may mutate type;
- no Quote, Schedule, Completion, Conversation, History, or compatibility
  source may overwrite type;
- conflicting type must block authoritative linking;
- read projections must show the conflict.

## 7. Legacy Compatibility Strategy

### Preserve, Do Not Convert

Legacy identifiers remain in their original fields and source records.

Examples:

- existing `projectId`;
- `requestId`;
- `quoteRequestId`;
- `conversationId`;
- `scheduleId`;
- `jobId`;
- `emergencyId`;
- generic `id`.

They may be exposed as:

```js
{
  compatibilityRefs: [
    {
      entityType,
      entityId,
      source,
      provenance,
      warnings
    }
  ]
}
```

### Legacy `projectId`

Current `projectId` must survive for compatibility reads because current pages
and storage may depend on it.

It must not be presumed canonical unless backend provenance proves:

- it was issued by aggregate authority;
- its aggregate type is explicit;
- it does not collide with another entity domain;
- its source-request relation is authoritative.

### Required Answer

**Can legacy `projectId` survive as compatibility identity?**

Yes. It should remain available and unchanged for legacy workflows.

It must be labeled non-authoritative until proven otherwise and must never be
bulk-converted into `aggregateId`.

### No Destructive Backfill

Do not:

- populate aggregate identity from legacy `projectId`;
- overwrite legacy IDs;
- merge records by title, customer, address, text, or display time;
- assign one aggregate to every request;
- infer type from category or page.

## 8. Reference Preservation Strategy

### Principle

Every source record keeps its own identity. Aggregate association is an
additional typed reference, not a replacement.

Conceptual reference:

```js
{
  sourceRef: {
    entityType,
    entityId
  },
  aggregateRef: {
    aggregateId,
    aggregateType
  },
  linkAuthority,
  linkedAt,
  linkedBy,
  provenance,
  warnings
}
```

### Zero, One, or Many

The strategy must preserve:

- Service Request with no aggregate;
- one Service Request linked to one aggregate;
- one Service Request linked to several aggregates;
- several Service Requests linked to one aggregate when future policy permits;
- one aggregate with many Conversations, Schedules, Quotes, Completions, and
  History events.

### Domain Rules

- Conversation reference does not grant access.
- Schedule reference does not create work.
- Quote reference does not authorize work.
- Completion reference does not authorize Closure.
- History reference does not create lifecycle state.
- Relationship reference does not grant aggregate membership.

### Required Answer

**Can aggregate references exist without aggregate creation authority?**

Only as non-authoritative candidates in fixtures, diagnostics, and shadow
reads.

An authoritative aggregate reference cannot exist before an authoritative
aggregate exists. A compatibility link must be labeled and must not be
persisted as canonical truth.

## 9. Backend Authority Requirements

The minimum mandatory backend responsibilities are:

### Service Request Authority

- create or identify durable Service Requests;
- issue stable `serviceRequestId`;
- preserve source references and provenance;
- support idempotent intake creation or duplicate detection;
- allow no aggregate.

### Aggregate Identity Authority

- own aggregate creation acknowledgement;
- issue stable `aggregateId`;
- require explicit `aggregateType`;
- preserve source-request references;
- preserve classification decision reference;
- preserve creation actor and role;
- assign persistence-owned creation time;
- enforce idempotency;
- return replay and conflict outcomes.

### Typed Link Authority

- create links only to existing authoritative aggregate identity;
- preserve source entity type and ID;
- preserve link provenance;
- reject cross-domain substitution;
- support zero-to-many links;
- expose conflicts without silent selection.

### Authentication and Authorization

- derive actor identity from authentication;
- derive actor role and permission from authorization;
- prevent clients from asserting privileged identity;
- authorize aggregate creation and link attachment.

### Read Authority

- return explicit aggregate references;
- return null or omit identity when unavailable;
- preserve compatibility references separately;
- return acknowledgement and freshness metadata;
- enforce participant and tenant/property visibility.

### Audit and Reliability

- stable IDs;
- uniqueness;
- idempotency;
- transaction boundaries;
- immutable creation acknowledgement;
- structured errors;
- backend characterization and regression tests;
- observable source and deployment version.

### Required Answer

**What backend responsibilities are mandatory?**

Canonical intake identity, canonical aggregate creation identity, explicit
type, typed links, authentication and authorization provenance, idempotency,
persistence acknowledgement, conflict handling, read projection, and tests.

## 10. Backend Authority Not Yet Required

Runtime Phase 1 does not require:

- aggregate lifecycle transition endpoints;
- Work Center or Dashboard aggregate reads;
- aggregate UI routes;
- full Timeline persistence;
- History projection service;
- Relationship Memory service;
- Closure authorization;
- obligation registry persistence;
- payment, permit, inspection, warranty, utility, or dispute domains;
- recurring cycle or occurrence creation;
- aggregate replacement, split, merge, or supersession;
- legacy backfill;
- mandatory migration;
- non-null aggregate references on existing tables;
- removal of legacy endpoints or fields.

These responsibilities should remain deferred because identity authority must
be proven before broader workflow behavior depends on it.

### Required Answer

**What backend responsibilities should remain deferred?**

Lifecycle, Closure, History, Relationship Memory, recurring operations,
backfill, enforcement, UI-specific projections, and replacement of current
workflow APIs.

## 11. Shadow Identity Possibilities

Shadow identity is measurement, not authority.

Safe shadow possibilities include:

### Supplied Fixture Identity

Tests may provide explicit:

```js
{
  serviceRequestId,
  aggregateId,
  aggregateType,
  provenance
}
```

to validate contracts and source adapters.

### Backend Optional Metadata

A future existing endpoint may add optional identity metadata without
requiring current clients to use it:

```js
{
  identity: {
    serviceRequestId,
    aggregateRef,
    authorityStatus,
    warnings
  }
}
```

`aggregateRef` remains null when authority is absent.

### Shadow Link Comparison

Read-only diagnostics may compare:

- explicit backend aggregate reference;
- legacy compatibility `projectId`;
- request, Quote, Conversation, Schedule, Completion, and Emergency IDs.

Differences must be reported, not corrected.

### Prohibited Shadow Behavior

Shadow logic must not:

- mint IDs;
- write links;
- change routing;
- change UI;
- alter counts;
- activate work;
- migrate storage;
- infer authority from equality.

## 12. Read-Only Identity Projection Strategy

A future read-only identity projection may expose:

```js
{
  serviceRequestRef,
  aggregateRef,
  sourceRefs,
  compatibilityRefs,
  authorityStatus,
  provenance,
  conflicts,
  warnings
}
```

### Projection Rules

1. `serviceRequestRef` is authoritative only when backend-issued.
2. `aggregateRef` is authoritative only when backend-issued.
3. Missing `aggregateRef` remains null or absent.
4. Compatibility values never populate canonical fields.
5. Every source reference remains typed.
6. Conflicting references remain visible.
7. Projection state is read-only.
8. Projection freshness is explicit.
9. Projection does not grant access or lifecycle authority.
10. Commands revalidate against backend authority.

### Required Answer

**Can aggregate references be projected safely?**

Yes, when explicit references and provenance are supplied by backend
authority, or when compatibility candidates are clearly separated and
warning-labeled.

No, when projection silently promotes legacy IDs or hides conflicts.

## 13. Future Persistence Requirements

Future persistence must eventually support:

- durable Service Request identity;
- durable aggregate identity;
- explicit aggregate type;
- aggregate creation acknowledgement;
- aggregate creation actor and role;
- creation and recorded timestamps;
- idempotency key and replay result;
- immutable source-request links;
- typed Conversation, Schedule, Quote, Completion, Closure, History, and
  Relationship links;
- classification decision reference;
- provenance and conflict status;
- parent, cycle, and occurrence identity for RecurringService;
- correction and supersession links;
- audit events.

### Planning Constraints

This phase does not choose:

- table names;
- column names;
- ID technology;
- relational versus event persistence;
- migration framework;
- indexes;
- constraints;
- API paths.

Those decisions require:

- deployed schema evidence;
- backend ownership confirmation;
- production data characterization;
- rollback planning;
- authorization policy;
- automated tests.

### Production Schema Prerequisite

Existing audits found:

- no standalone schema;
- no migrations;
- no canonical aggregate table proven;
- no canonical Conversation table proven;
- partial workflow-event DDL only;
- unknown production constraints;
- missing backend tests.

No persistence plan should become an implementation task until an approved
read-only production schema snapshot or equivalent authoritative artifact is
available.

## 14. Risks Of Early Adoption

### False Canonical Identity

Legacy `projectId` may be stored as aggregate identity despite originating
from another domain.

### Destructive Backfill

Unknown legacy records may receive guessed aggregate identity that cannot be
reversed safely.

### Workflow Breakage

Making new identity fields required may break current request, Quote,
Conversation, Schedule, Completion, and Emergency workflows.

### Duplicate Aggregates

Missing idempotency may create multiple aggregates for one command.

### Wrong Aggregate Type

Project assumptions may be applied to WorkOrders, Emergencies, and
RecurringServices.

### Authorization Failure

Clients may attach or create aggregate identity without approved authority.

### Incomplete Rollback

Runtime writers may depend on new identity before old deployments can ignore
or survive it.

### Schema Assumption

Implementation based on route code may conflict with the deployed database.

### Compatibility Permanence

Temporary links may become permanent backend truth.

## 15. Risks Of Delayed Adoption

### Continued Identity Collisions

Request, Quote, Conversation, Schedule, Completion, and Emergency identities
will continue to appear as Project identity.

### Increasing Migration Cost

More legacy records will be created without typed aggregate references.

### Fragmented History

Timeline, History, and Completion projections will continue to rely on
compatibility joins.

### Repeated Workflow Assumptions

New features may continue to assume all work is Project-shaped.

### Closure Delay

Completion and Closure cannot become trustworthy without typed aggregate
identity.

### Recurring Service Delay

Parent, cycle, and occurrence identity cannot be introduced safely on top of
more collapsed records.

### Audit Weakness

The system cannot prove which authority created work identity.

### Balanced Response

Delay should not justify premature implementation. The correct response is to
advance backend evidence, contracts, tests, and shadow measurement while
keeping runtime behavior unchanged.

## 16. Recommended Runtime Phase 2

Runtime Phase 2 should be:

**BACKEND IDENTITY CONTRACT AND SCHEMA EVIDENCE AUDIT**

It should remain planning and audit only.

### Required Scope

1. Identify the authoritative backend repository and deployed version.
2. Obtain an approved read-only production schema snapshot or schema-only
   export.
3. Verify current durable request entities and determine whether one can own
   `serviceRequestId`.
4. Verify whether any canonical operational Project or aggregate table exists.
5. Distinguish portfolio/gallery `contractor_projects` from operational work.
6. Inventory primary keys, foreign keys, unique constraints, timestamp
   defaults, and deletion behavior.
7. Verify authentication and role sources.
8. Verify request ownership and participant relationships.
9. Verify whether additive optional identity metadata can be returned without
   changing current frontend behavior.
10. Define a versioned API contract for:
    - canonical Service Request identity;
    - nullable aggregate reference;
    - compatibility references;
    - provenance and conflict warnings;
    - acknowledgement status.
11. Define characterization tests before any schema or route change.
12. Stop if production schema, deployment ownership, or identity authority
    cannot be verified.

### Runtime Phase 2 Must Not

- write schema;
- create migrations;
- create aggregate records;
- backfill identity;
- add required fields;
- change current endpoints;
- change frontend behavior;
- implement lifecycle commands;
- adopt shadow identity into UI.

### Final Planning Answers

| Question | Answer |
| --- | --- |
| Can `serviceRequestId` become canonical intake identity? | Yes, when backed by a durable backend-owned intake record; not by renaming every `requestId` |
| Can `aggregateId` remain absent until backend authority exists? | Yes, and it should |
| Can legacy `projectId` survive as compatibility identity? | Yes, unchanged and non-authoritative unless proven |
| Can aggregate references exist without aggregate creation authority? | Only as warning-labeled candidates in fixtures or shadow reads, not as canonical links |
| Can aggregate references be projected safely? | Yes when explicit and provenance-qualified; compatibility candidates must remain separate |
| What backend responsibilities are mandatory? | Intake identity, aggregate identity creation, type, links, authentication/authorization provenance, idempotency, acknowledgement, conflict handling, and tests |
| What backend responsibilities should remain deferred? | Lifecycle, Closure, History, Relationship Memory, recurring operations, backfill, enforcement, and UI projections |

## Final Recommendation

Proceed to Runtime Phase 2 as an evidence and contract audit.

Do not implement aggregate identity yet.

The safest immediate progress is to prove:

1. which backend record can own `serviceRequestId`;
2. whether any operational aggregate authority already exists;
3. what the deployed schema actually contains;
4. how optional identity metadata can be added without affecting current
   workflows;
5. how legacy identity remains visible without becoming authority.

Until those facts are verified, `aggregateId` remains absent and all existing
`projectId` normalization remains compatibility-only.
