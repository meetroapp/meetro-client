# Operational Aggregate Runtime Phase 3 - Canonical Identity Contract and Production Evidence Plan

## Status

- Planning and specification only
- No implementation
- No schema or migrations
- No routes or API changes
- No frontend or backend changes
- No runtime adoption

## Purpose

This document is the implementation gate for future Operational Aggregate
backend work.

It defines:

1. the minimum canonical identity contract the backend must eventually own;
2. the evidence that must be collected from production before implementation
   is authorized;
3. the conditions that immediately stop implementation planning.

The conceptual shapes in this document define authority and response
semantics. They are not database schemas, migration instructions, route
designs, or implementation approval.

## 1. Executive Summary

Meetro cannot safely introduce Operational Aggregate runtime identity by
renaming existing IDs or adding an unverified `projectId` field.

The minimum safe backend boundary must distinguish:

- Service Request identity from Operational Aggregate identity;
- aggregate identity from aggregate type;
- source records from typed aggregate references;
- authenticated actor identity from authorization-derived actor role;
- a new command from an idempotent replay;
- successful persistence from client-side optimism;
- explicit absence from unresolved or inferred identity;
- authoritative conflicts from display warnings.

The governing identity path is:

```text
Intent
  -> backend-owned Service Request identity
  -> information and classification evidence
  -> authorized aggregate creation command
  -> backend-issued aggregate identity and type
  -> typed, authorized references
  -> acknowledged read projection
```

This path is not automatic. A Service Request may remain without an
Operational Aggregate.

The minimum future contract must establish:

- stable `serviceRequestId`;
- stable `aggregateId`;
- explicit `aggregateType`;
- backend-owned creation authority;
- typed source references;
- actor and role provenance;
- idempotency and replay behavior;
- persistence acknowledgement;
- conflict behavior;
- explicit null or absent aggregate behavior;
- read projections that never promote compatibility IDs.

Before implementation, Meetro must obtain authoritative evidence for:

- the deployed database schema;
- constraints and indexes;
- migration history and ownership;
- deployment ownership and revision;
- existing API contracts and consumers;
- authorization policy;
- test and rollback capability.

### Gate Decision

Implementation remains **BLOCKED** until every mandatory evidence item and
contract decision in this document is satisfied.

## 2. Identity Contract Principles

1. Identity is issued by the domain that owns the entity.
2. Service Request identity and Operational Aggregate identity are distinct.
3. Classification may recommend aggregate type but does not issue identity.
4. Aggregate type is explicit and never inferred from category, page, title,
   route, or legacy field name.
5. Every reference is typed.
6. Every authoritative link is backend-validated and authorization-checked.
7. Missing identity remains missing.
8. Compatibility identity never becomes canonical through equality alone.
9. Authentication supplies actor identity.
10. Authorization supplies actor role and permission.
11. The backend owns persistence acknowledgement and recording time.
12. Commands that can create identity require idempotency.
13. Replays return the original accepted identity.
14. Conflicts are returned explicitly and never silently resolved.
15. Read projections expose authority, provenance, freshness, and warnings.
16. Clients may request work; they may not assert canonical identity.
17. Presentation layers may display identity; they may not create it.
18. Aggregate identity survives related Quote, Schedule, Conversation,
    Completion, Closure, and History activity.
19. Completion does not authorize Closure.
20. Closure does not terminate History or Relationship.

## 3. Canonical Service Request Contract

### Definition

A Service Request is the durable intake authority for customer intent,
information gathering, and classification context.

It is not:

- a Project;
- a WorkOrder;
- an Emergency aggregate;
- a RecurringService;
- a Quote;
- a Conversation;
- an appointment;
- a Completion record.

### Minimum Conceptual Identity

```js
{
  serviceRequestId,
  sourceRef: {
    entityType,
    entityId
  },
  requesterRef,
  createdAt,
  recordedAt,
  authority,
  provenance
}
```

This is a contract shape, not a database schema.

### Creation Authority

**What creates `serviceRequestId`?**

Only a backend intake authority that:

- accepts or identifies customer intent;
- validates the authenticated or approved requester context;
- persists one durable intake record;
- preserves the legacy source reference;
- assigns or acknowledges a stable ID;
- applies idempotency or explicit duplicate handling;
- returns persistence-owned timestamps;
- allows no aggregate to exist.

The client, Lead page, Upload page, Quote Request, Conversation, Schedule,
category, or generic `requestId` may not create canonical
`serviceRequestId`.

### Required Properties

- stable across reads, sessions, and devices;
- unique within the Service Request identity domain;
- opaque to clients;
- immutable after acceptance;
- distinct from all related entity IDs;
- accompanied by source provenance;
- returned identically on idempotent replay;
- retained if classification changes;
- retained if one or more aggregates are later created;
- retained if the request is withdrawn, rejected, or never operationalized.

### Legacy Mapping Rule

A legacy source may map to a Service Request only when backend evidence proves
the relationship.

Valid mapping:

```js
{
  serviceRequestId: "authoritative-service-request-id",
  sourceRef: {
    entityType: "quote_request",
    entityId: "legacy-quote-request-id"
  },
  authority: "backend-service-request",
  provenance: {
    status: "authoritative"
  }
}
```

Invalid mapping:

```js
{
  serviceRequestId: legacy.requestId
}
```

when ownership and uniqueness have not been established.

## 4. Canonical Aggregate Identity Contract

### Definition

An Operational Aggregate is the backend-owned identity and lifecycle boundary
for authorized work.

Its minimum identity is:

```js
{
  aggregateId,
  aggregateType
}
```

Both fields are required for an authoritative aggregate reference.

### Creation Authority

**What creates `aggregateId`?**

Only a future backend aggregate creation authority acting on an authorized,
idempotent command.

The creation authority must:

- authenticate the actor;
- derive the actor role and permission from authorization;
- validate the Service Request references;
- accept an explicit approved aggregate type;
- preserve the classification decision reference when one exists;
- reject conflicting or untrusted source identity;
- prevent duplicate creation under replay;
- persist creation provenance;
- assign `aggregateId`;
- acknowledge the accepted identity and type;
- return conflicts without creating partial authority.

### Minimum Creation Input Semantics

A future creation command must conceptually identify:

- command identity;
- idempotency key;
- requested aggregate type;
- one or more authoritative Service Request references;
- classification decision reference, if applicable;
- authorized business or operational context;
- source metadata that is not identity authority.

Actor identity and role must not be trusted from client-supplied claims.

### Minimum Accepted Result

```js
{
  aggregateRef: {
    aggregateId,
    aggregateType
  },
  serviceRequestRefs,
  acknowledgement: {
    status,
    recordedAt,
    replayed,
    commandId
  },
  actor: {
    actorId,
    actorRole
  },
  provenance,
  conflicts,
  warnings
}
```

### Identity Invariants

- `aggregateId` never equals another domain ID by assumption.
- `aggregateId` remains stable through the aggregate lifecycle.
- `aggregateId` remains stable when Quotes are revised.
- `aggregateId` remains stable when appointments are rescheduled.
- `aggregateId` remains stable when Conversations change.
- `aggregateId` remains stable through Completion and Closure.
- `aggregateId` remains visible in History after Closure.
- replacement or supersession creates explicit predecessor/successor
  references rather than rewriting identity.

## 5. Aggregate Type Contract

### Supported Types

- `Project`
- `WorkOrder`
- `Emergency`
- `RecurringService`

### Ownership

**Who owns `aggregateType`?**

Operational Aggregate authority owns the persisted type.

Classification may recommend a type. An authorized aggregate creation command
may request a type. Only the backend aggregate authority may accept and
persist it as the aggregate's authoritative type.

### Type Rules

1. Type must be explicit.
2. Type must come from the approved registry.
3. Category cannot determine type.
4. Service Request source cannot determine type automatically.
5. UI page, route, tab, or card cannot determine type.
6. Quote, Schedule, Conversation, Completion, Closure, or History cannot
   overwrite type.
7. Unknown or unresolved type blocks aggregate creation.
8. A type conflict blocks authoritative link creation.
9. Type must accompany every authoritative aggregate reference.
10. Type correction, replacement, or conversion policy remains a product
    decision and must be auditable.

### Type Meanings

| Type | Meaning |
| --- | --- |
| `Project` | Multi-step, scoped work managed as one work lifecycle |
| `WorkOrder` | Discrete, bounded operational task |
| `Emergency` | Urgent response workflow with emergency-specific authority |
| `RecurringService` | Ongoing parent service with repeated cycles and occurrences |

## 6. Typed Reference Contract

### Definition

A typed reference links one authoritative source entity to one authoritative
aggregate without replacing either identity.

### Conceptual Shape

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
  linkType,
  authority,
  linkedAt,
  linkedBy: {
    actorId,
    actorRole
  },
  acknowledgement,
  provenance,
  warnings
}
```

### Valid Aggregate Reference

**What constitutes a valid aggregate reference?**

A reference is valid only when:

- `aggregateId` is non-empty and backend-issued;
- `aggregateType` is explicit and supported;
- the aggregate exists;
- the source identity is typed and exists;
- the source-to-aggregate relationship is permitted;
- the actor is authenticated;
- the actor role and permission are authorization-derived;
- the backend validates the link;
- the backend records link provenance;
- an acknowledgement is returned;
- no unresolved identity conflict exists.

String equality is not proof of a valid reference.

### Domains That May Reference Aggregate Identity

**What may reference aggregate identity?**

After their own identity authority exists, the following domains may hold
typed aggregate references:

- Service Request;
- Classification decision;
- Conversation;
- Schedule;
- Quote;
- Completion;
- Closure;
- History event;
- Relationship record;
- recurring parent, cycle, and occurrence records;
- authorized audit events.

These domains reference the aggregate. They do not own it.

### Domains and Values That May Not Become Aggregate Identity

**What may not reference aggregate identity as authority?**

The following may not create, infer, replace, or authorize aggregate identity:

- Dashboard;
- Work Center;
- Command Center;
- Project Gallery;
- Conversation card;
- active tab or route state;
- localStorage;
- title;
- customer name;
- address;
- category;
- display text;
- timestamp;
- generic `id`;
- `requestId`;
- `quoteRequestId`;
- `quoteId`;
- `conversationId`;
- `scheduleId`;
- `completionId`;
- `emergencyId`;
- `postId`;
- portfolio-project ID;
- History presence;
- archive state.

An authoritative domain may reference an aggregate only through the validated
typed-reference contract.

## 7. Identity Ownership Rules

| Identity | Owner | Creation authority | Mutation rule |
| --- | --- | --- | --- |
| `serviceRequestId` | Service Request | Backend intake authority | Immutable |
| `aggregateId` | Operational Aggregate | Backend aggregate creation authority | Immutable |
| `aggregateType` | Operational Aggregate | Accepted by aggregate creation authority | No client mutation |
| `conversationId` | Conversation | Future backend Conversation authority | Distinct from aggregate |
| `scheduleId` | Schedule | Future backend Schedule authority | Distinct from aggregate |
| `quoteId` | Quote | Quote authority | Distinct from aggregate |
| `completionId` | Completion | Future Completion authority | Distinct from aggregate |
| `closureDecisionId` | Closure | Future Closure authority | Distinct from aggregate |
| `relationshipId` | Relationship | Future Relationship authority | Distinct from aggregate |
| recurring parent ID | RecurringService parent authority | Future backend recurring authority | Survives cycles/occurrences |
| recurring cycle ID | RecurringService cycle authority | Future backend recurring authority | Distinct from parent |
| recurring occurrence ID | RecurringService occurrence authority | Future backend recurring authority | Distinct from cycle |
| event ID | Event-recording authority | Backend acceptance boundary | Immutable |
| command ID | Command boundary | Client or backend per approved contract | Stable across retries |

No domain may borrow another domain's ID to avoid creating its own authority.

## 8. Compatibility Identity Rules

Compatibility identities preserve current behavior while canonical authority
is absent.

### Allowed Compatibility Use

- read reconciliation;
- diagnostics;
- display continuity;
- legacy route parameters;
- parity measurement;
- source record lookup;
- warning generation.

### Prohibited Compatibility Use

- aggregate creation;
- lifecycle transition;
- typed-link persistence;
- access grant;
- Completion authorization;
- Closure authorization;
- deduplication authority;
- merge authority;
- recurring-scope creation;
- canonical backfill.

### Required Compatibility Shape

```js
{
  entityType,
  entityId,
  source,
  authorityStatus: "compatibility",
  provenance,
  warnings
}
```

### Preservation Rules

1. Preserve the original field and value.
2. Preserve the source entity type.
3. Do not move it into `aggregateId`.
4. Do not relabel it as `serviceRequestId` without backend proof.
5. Keep conflicts visible.
6. Do not merge by title, name, address, text, timestamp, or display order.
7. Do not destructively backfill legacy records.
8. A later authoritative mapping must retain the compatibility reference.

## 9. Actor Identity Contract

### Ownership

Authentication authority owns actor identity for protected commands.

### Rules

- actor identity must be derived from the verified authentication context;
- client-supplied `actorId`, `userId`, or sender fields are claims, not
  authority;
- the accepted result must return the actor identity used;
- service/system actors require registered identities and explicit authority;
- manual or external participants require an approved identity and consent
  model before acting as canonical actors;
- actor identity must be recorded with aggregate creation and link commands;
- actor identity must survive later reads and audit projections;
- anonymous intake, if supported, requires a separate approved authority
  contract.

### Prohibited Fallbacks

- current viewer;
- selected profile;
- localStorage user;
- message orientation;
- opposite participant;
- display name;
- email or phone alone;
- UI role label.

## 10. Actor Role Contract

### Ownership

Authorization authority owns the role used for a command.

Authentication may identify the user. It does not by itself prove permission
or the role under which a particular action is authorized.

### Rules

1. Role must be derived at command time.
2. Role must be valid for the target business, relationship, and aggregate.
3. The accepted result must return the role used.
4. The role snapshot must be preserved for audit.
5. Current account type or business category may inform authorization but
   cannot substitute for a canonical action role.
6. Revoked or changed roles do not rewrite historical role provenance.
7. System actions require an explicit system actor role.
8. Unknown or conflicting role blocks privileged identity creation.

### Minimum Role Semantics

The final registry remains an authorization design decision. At minimum it
must distinguish:

- customer/requester authority;
- business/professional authority;
- assigned team authority;
- system authority;
- administrative authority, if supported.

## 11. Authorization Responsibility Matrix

| Action | Authentication responsibility | Authorization responsibility | Domain authority | Client responsibility |
| --- | --- | --- | --- | --- |
| Create Service Request | Identify requester when authenticated | Verify requester/business context | Service Request | Submit intent and source data |
| Read Service Request | Identify caller | Verify participant/access scope | Service Request | Request authorized record |
| Create aggregate | Identify actor | Verify creation permission and requested type | Operational Aggregate | Submit command and idempotency key |
| Read aggregate | Identify caller | Verify aggregate visibility | Operational Aggregate | Render returned projection |
| Attach source reference | Identify actor | Verify access to source and aggregate | Typed-link authority | Submit typed source reference |
| Detach/supersede reference | Identify actor | Verify modification authority | Typed-link authority | Submit explicit command |
| Reference aggregate from Conversation | Identify actor | Verify Conversation membership and aggregate visibility | Conversation plus typed-link authority | Never infer from active thread |
| Reference aggregate from Schedule | Identify actor | Verify scheduling and aggregate permission | Schedule plus typed-link authority | Never use Schedule ID as aggregate ID |
| Reference aggregate from Quote | Identify actor | Verify Quote and aggregate permission | Quote plus typed-link authority | Never create aggregate through Quote ID |
| Reference aggregate from Completion | Identify performer | Verify completion permission and scope | Completion plus typed-link authority | Submit evidence, not Closure |
| Enter Closure review | Identify reviewer | Verify Closure-review permission | Aggregate and Closure authorities | Do not infer from Completion |
| Authorize Closure | Identify decision maker | Verify explicit Closure authority | Closure | No presentation-layer authority |
| Record lifecycle event | Identify command actor | Verify transition permission | Aggregate event authority | Preserve command identity |
| Read History | Identify caller | Enforce source and participant visibility | History | Do not treat History as authority |
| Read Relationship Memory | Identify caller | Enforce relationship, privacy, and retention policy | Relationship | Do not infer access from inbox presence |

### Authorization Evidence Required

Before implementation:

- approved actor-role registry;
- permission matrix for aggregate creation;
- permission matrix for typed links;
- participant/access rules;
- business and tenant scope rules;
- system actor policy;
- role-revocation behavior;
- audit requirements;
- test fixtures for allowed and denied cases.

## 12. Idempotency Requirements

Identity-creating commands must be idempotent.

### Required Commands

At minimum:

- Service Request creation;
- aggregate creation;
- typed-link creation;
- future lifecycle transitions;
- future Completion submission;
- future Closure decisions.

### Requirements

1. A stable idempotency key represents one logical command.
2. Key scope must include the authenticated actor or approved command owner.
3. The backend stores a request fingerprint.
4. Exact replay returns the original accepted result.
5. Replay does not create a new identity or event.
6. Reuse with conflicting input returns an explicit conflict.
7. Concurrent duplicate commands resolve to one accepted result.
8. Replay preserves original IDs and recorded timestamps.
9. Retention duration is documented.
10. Logging must not expose sensitive payloads.

### Replay Representation

**How is replay represented?**

```js
{
  acknowledgement: {
    status: "accepted",
    replayed: true,
    commandId,
    recordedAt
  },
  aggregateRef
}
```

The exact transport shape is future API work. The required semantic is that
the caller can distinguish original acceptance from replay while receiving
the same authoritative identity.

### Undefined Idempotency

If key generation, scope, fingerprinting, retention, conflict behavior, or
transaction boundaries are undefined, implementation remains blocked.

## 13. Acknowledgement Requirements

Acknowledgement proves that the backend accepted and persisted an identity or
reference under its authority.

### Required Semantics

```js
{
  acknowledgement: {
    status,
    commandId,
    recordedAt,
    replayed,
    authority,
    version
  }
}
```

### Status Requirements

The contract must distinguish at least:

- accepted;
- replayed accepted result;
- rejected;
- conflict;
- unavailable or not authoritative.

### Acknowledgement Rules

1. `recordedAt` comes from backend persistence.
2. Accepted identity is returned in the same result.
3. Replay returns the original acknowledgement facts.
4. Partial persistence must not be reported as accepted.
5. Rejection returns no newly authoritative identity.
6. Conflict returns the conflicting references without silent selection.
7. Acknowledgement authority is named.
8. Read responses expose enough version/freshness information to identify
   stale projections.
9. Client optimistic state is never acknowledgement.

### Required Answer

**How is acknowledgement represented?**

As a structured backend result that names status, command identity,
persistence-owned recording time, replay state, authority, and the accepted
canonical identity or reference.

If this contract is undefined, implementation remains blocked.

## 14. Conflict Handling Requirements

### Conflict Categories

- legacy identity collision;
- source entity type mismatch;
- aggregate type mismatch;
- Service Request already linked under incompatible policy;
- idempotency-key fingerprint conflict;
- stale version;
- unauthorized actor or role;
- missing source entity;
- missing aggregate;
- duplicate canonical mapping;
- recurring scope conflict;
- cross-tenant or cross-business relationship conflict.

### Conflict Representation

**How are conflicts represented?**

```js
{
  status: "conflict",
  conflictType,
  submittedRefs,
  authoritativeRefs,
  warnings,
  reviewRequired: true,
  acknowledgement: {
    recordedAt,
    authority
  }
}
```

The backend must not return an accepted aggregate reference when the command
was rejected or only partially evaluated.

### Rules

1. Preserve submitted and authoritative references separately.
2. Never choose by title, customer, address, timestamp, or generic ID.
3. Do not create a new aggregate to hide a conflict.
4. Do not overwrite the existing authoritative link.
5. Do not mutate aggregate type silently.
6. Return a stable machine-readable conflict type.
7. Record conflict audit provenance when policy requires.
8. Require review for unresolved identity or scope conflicts.

## 15. Read Projection Contract

### Purpose

The read projection exposes canonical identity and compatibility context
without transferring authority to the consumer.

### Conceptual Shape

```js
{
  serviceRequestRef: {
    serviceRequestId,
    authority,
    provenance
  },
  aggregateRef: {
    aggregateId,
    aggregateType,
    authority,
    provenance
  } || null,
  sourceRefs,
  compatibilityRefs,
  authorityStatus,
  acknowledgement,
  freshness,
  conflicts,
  warnings
}
```

### Projection Rules

- canonical and compatibility fields remain separate;
- `aggregateRef` is populated only from backend aggregate authority;
- type accompanies ID;
- absence remains explicit;
- source references remain typed;
- conflicts remain visible;
- freshness and acknowledgement remain visible;
- access is enforced before projection;
- client caches do not become authority;
- read models may summarize and navigate but cannot create identity or change
  lifecycle;
- repeated reads return stable canonical identity;
- stale projections cannot authorize commands.

### Consumers

Future consumers may include:

- Conversation;
- Schedule;
- Quote;
- Completion;
- Timeline;
- History;
- Work Center read models;
- Project Folder read models;
- relationship projections.

Consumer readiness does not grant writer authority.

## 16. Explicit Null/Absent Aggregate Rules

### Required Answer

**How is absence represented?**

Canonical absence is represented by:

```js
{
  aggregateRef: null,
  authorityStatus: "no_authoritative_aggregate"
}
```

or by an omitted `aggregateRef` with an explicit authority-status field.

The final API style may choose null or omission, but it must be consistent and
must distinguish absence from unavailable data.

### Valid Absence Reasons

- no aggregate has been created;
- information gathering is incomplete;
- classification remains Unknown;
- Consultation does not yet require work authority;
- the request was withdrawn or rejected;
- aggregate creation was not authorized;
- source identity conflicts;
- aggregate type is unresolved;
- the caller lacks visibility;
- the projection source is unavailable.

Access denial, unavailable data, and genuine no-aggregate state must not share
an ambiguous response.

### Prohibited Absence Handling

- filling `aggregateId` from legacy `projectId`;
- copying `requestId`;
- copying Quote, Conversation, Schedule, Completion, Emergency, post, job, or
  generic ID;
- synthesizing an ID on the client;
- using an empty string as authority;
- inferring Project because the UI expects one.

Absence is a valid authoritative outcome.

## 17. Production Evidence Requirements

No backend implementation may be authorized from route source alone.

### Required Evidence Categories

1. database schema;
2. constraints and indexes;
3. migration history and ownership;
4. deployment ownership and source revision;
5. API contracts and active consumers;
6. authentication and authorization behavior;
7. production data shapes and volumes;
8. rollback capability;
9. observability;
10. backend test capability.

### Evidence Quality

Evidence must be:

- read-only;
- tied to the active production environment;
- dated;
- attributable to an owner;
- reproducible;
- stored as an approved artifact or report;
- clear about unknowns;
- free of production secrets.

### Required Evidence Questions

**What schema evidence is required?**

A schema-only snapshot or equivalent catalog report covering relevant tables,
columns, data types, nullability, defaults, primary keys, foreign keys,
indexes, unique constraints, triggers, sequences, and row-level security.

**What migration evidence is required?**

The migration mechanism, complete migration history or current baseline,
deployment procedure, owner, rollback procedure, compatibility policy, and
evidence that production schema matches the claimed revision.

**What deployment evidence is required?**

The authoritative repository, commit, service, environment, deployment
pipeline, database target, configuration ownership, release owner, rollback
owner, and health/observability path.

**What authorization evidence is required?**

JWT validation behavior, role semantics, participant checks, business/tenant
scope, command permission matrix, system actor policy, denied-action behavior,
and authorization tests.

**What testing evidence is required?**

A runnable backend test command and automated coverage for identity,
idempotency, authorization, conflict handling, transaction behavior,
compatibility responses, and rollback-sensitive paths.

## 18. Schema Evidence Checklist

The following must be collected without changing production:

- [ ] Database engine and version.
- [ ] Database/schema names used by the active deployment.
- [ ] Schema-only catalog export or equivalent read-only report.
- [ ] Definitions for `users`.
- [ ] Definitions for `posts`.
- [ ] Definitions for `quote_requests`.
- [ ] Definitions for `messages`.
- [ ] Definitions for `workflow_events`.
- [ ] Definitions for `reviews`.
- [ ] Definitions for `contractor_profiles`.
- [ ] Definitions for `contractor_projects`.
- [ ] Any existing Service Request table.
- [ ] Any existing operational Project or aggregate table.
- [ ] Any existing Conversation table.
- [ ] Any participant/membership table.
- [ ] Any Schedule or appointment table.
- [ ] Any Quote/proposal/version table.
- [ ] Any Completion table.
- [ ] Any Closure or obligation table.
- [ ] Any Relationship table.
- [ ] Any idempotency table.
- [ ] Any audit/event table.
- [ ] Any recurring service, cycle, or occurrence table.
- [ ] Column names and data types.
- [ ] Primary keys.
- [ ] Foreign keys and delete/update behavior.
- [ ] Nullability.
- [ ] Default expressions.
- [ ] Timestamp types and timezone behavior.
- [ ] Sequences or identity generators.
- [ ] Triggers and generated columns.
- [ ] Views and materialized views.
- [ ] Row-level security policies.
- [ ] Approximate row counts and table sizes.
- [ ] Evidence date and production owner.

Unknown or unavailable items must be marked explicitly. They must not be
inferred from route SQL.

## 19. Constraint Evidence Checklist

- [ ] Uniqueness of user identity fields.
- [ ] Uniqueness of current request IDs.
- [ ] Message ID uniqueness.
- [ ] Workflow-event row ID uniqueness.
- [ ] Foreign-key enforcement for Quote Request participants.
- [ ] Foreign-key enforcement for message sender/receiver.
- [ ] Foreign-key enforcement for message request context.
- [ ] Participant-access enforcement location.
- [ ] Check constraints for roles and statuses.
- [ ] Timestamp defaults.
- [ ] Timestamp update behavior.
- [ ] Immutability protections, if any.
- [ ] Existing idempotency constraints.
- [ ] Existing duplicate prevention.
- [ ] Existing soft-delete behavior.
- [ ] Existing archival behavior.
- [ ] Existing concurrency/version columns.
- [ ] Existing tenant/business scoping constraints.
- [ ] Existing event ordering guarantees.
- [ ] Existing trigger side effects.
- [ ] Existing cascading-delete risks.

The evidence must show whether additive identity work can preserve existing
records and whether constraints can be introduced without falsely validating
legacy data.

## 20. Migration Evidence Checklist

- [ ] Named migration owner.
- [ ] Named database owner.
- [ ] Existing migration tool or approved replacement.
- [ ] Current production baseline.
- [ ] Complete migration history or documented gap.
- [ ] Schema drift comparison across environments.
- [ ] Forward deployment procedure.
- [ ] Rollback procedure.
- [ ] Backup and restore responsibility.
- [ ] Expand/contract compatibility policy.
- [ ] Nullable-addition policy.
- [ ] Index-creation policy for production volume.
- [ ] Lock and table-rewrite assessment process.
- [ ] Data backfill approval process.
- [ ] Prohibition on speculative identity backfill.
- [ ] Legacy-client compatibility window.
- [ ] Deployment sequencing owner.
- [ ] Post-deployment verification procedure.
- [ ] Failure and partial-deployment recovery procedure.
- [ ] Audit record for migration execution.

No migration may be designed until the current schema baseline is proven.

## 21. Deployment Evidence Checklist

- [ ] Authoritative backend repository.
- [ ] Authoritative production branch.
- [ ] Production commit or artifact revision.
- [ ] Deployment platform and service name.
- [ ] Production environment owner.
- [ ] Database environment and owner.
- [ ] Evidence that the service points to the intended database.
- [ ] Environment-variable ownership.
- [ ] Secret-management owner.
- [ ] Build command.
- [ ] Start command.
- [ ] Release process.
- [ ] Rollback process.
- [ ] Release approval owner.
- [ ] Health checks.
- [ ] Error monitoring.
- [ ] Structured logs.
- [ ] Database migration execution location.
- [ ] Staging or equivalent validation environment.
- [ ] Source-to-deployment parity check.
- [ ] Evidence retention location.

If multiple deployments exist, one must be designated authoritative before
implementation.

## 22. API Contract Evidence Checklist

- [ ] Complete active route inventory.
- [ ] Authentication requirements per route.
- [ ] Authorization requirements per route.
- [ ] Request shapes.
- [ ] Success response shapes.
- [ ] Error response shapes.
- [ ] Status code behavior.
- [ ] ID generation behavior.
- [ ] Timestamp behavior.
- [ ] Pagination and ordering behavior.
- [ ] Retry behavior.
- [ ] Idempotency behavior.
- [ ] Transaction boundaries.
- [ ] Participant checks.
- [ ] Tenant/business scoping.
- [ ] Current frontend consumers.
- [ ] Other consumers or integrations.
- [ ] Compatibility guarantees.
- [ ] Versioning policy.
- [ ] Deprecation policy.
- [ ] Source revision for each contract.
- [ ] Production behavior verification.

Required aggregate contract evidence must eventually cover:

- Service Request creation/read;
- aggregate creation/read;
- typed reference creation/read;
- conflict results;
- replay results;
- acknowledgement results;
- explicit absence;
- access-denied behavior.

## 23. Backend Test Requirements

No identity implementation may ship without an executable backend test suite.

### Required Test Categories

#### Service Request Identity

- stable creation identity;
- idempotent replay;
- conflicting replay;
- source-reference preservation;
- request with no aggregate;
- duplicate-candidate behavior.

#### Aggregate Identity

- backend-issued ID;
- explicit supported type;
- unknown type rejection;
- unauthorized creation rejection;
- conflicting source rejection;
- same-command replay returns same ID;
- concurrent duplicate protection;
- no legacy-ID promotion.

#### Typed References

- valid source and aggregate;
- missing source;
- missing aggregate;
- type mismatch;
- unauthorized link;
- cross-business/tenant rejection;
- duplicate link replay;
- link conflict;
- compatibility reference remains separate.

#### Actor and Authorization

- actor derived from authentication;
- client actor override rejected or ignored;
- role derived from authorization;
- revoked role denied;
- system actor behavior;
- participant visibility;
- denied reads do not leak existence.

#### Acknowledgement and Events

- persistence-owned timestamp;
- stable acknowledgement on replay;
- immutable event identity;
- atomic identity/event persistence;
- transaction rollback on failure;
- correction and supersession behavior.

#### Compatibility

- current response fields remain unchanged;
- new optional fields are safely ignored by old clients;
- legacy records remain readable;
- null aggregate remains valid;
- no count or ordering changes without explicit adoption.

#### Operational

- production-like PostgreSQL integration tests;
- migration forward test;
- migration rollback or recovery test;
- concurrency test;
- deployment smoke test;
- observability assertion for failures without sensitive payloads.

### Testing Evidence Required

- runnable test command;
- deterministic fixtures;
- isolated test database;
- CI execution;
- pass/fail artifact;
- coverage ownership;
- regression owner;
- documented known gaps.

## 24. Runtime Stop Conditions

Implementation must stop immediately when any condition below is true.

### Mandatory Stop Conditions

- aggregate identity is not backend-owned;
- Service Request identity ownership is unresolved;
- schema evidence is unavailable;
- production schema does not match the assumed source;
- deployment ownership is unclear;
- authoritative production revision is unknown;
- migration ownership is unclear;
- rollback ownership or procedure is absent;
- authorization policy is unresolved;
- actor role cannot be derived from authorization;
- participant or tenant scope is unresolved;
- idempotency is undefined;
- replay conflict behavior is undefined;
- acknowledgement contract is undefined;
- aggregate type ownership is unresolved;
- typed reference validation is undefined;
- legacy compatibility IDs would populate canonical fields;
- a product decision is required for type change, merge, split, replacement,
  or recurring scope;
- backend tests cannot run;
- implementation would require destructive backfill;
- implementation would make existing clients fail;
- partial persistence could be reported as success.

### Evidence Stop Conditions

- schema facts are inferred only from route code;
- production credentials would be required without approved read-only access;
- multiple deployments exist without an authoritative designation;
- migration history is incomplete and no baseline is approved;
- API consumers are unknown;
- data volume is unknown where a change may lock or rewrite a table;
- constraints cannot be verified;
- role values have ambiguous semantics;
- sensitive production data would need to be copied into planning artifacts.

### Runtime Adoption Stop Conditions

Even after a future backend contract exists, runtime adoption remains blocked
if:

- identity parity is not measured;
- aggregate references are inferred;
- UI consumers would change behavior;
- lifecycle authority is still screen-owned;
- Completion would imply Closure;
- History would become authority;
- Relationship access is inferred from inbox or request presence;
- recurring scope is collapsed;
- compatibility fields would be removed or renamed.

## 25. Final Recommendation

### Contract Decision

The minimum canonical identity model is ready to serve as a planning gate:

- Service Request authority creates `serviceRequestId`;
- Operational Aggregate authority creates `aggregateId`;
- Operational Aggregate authority owns accepted `aggregateType`;
- related domains use typed, authorized references;
- compatibility IDs remain non-authoritative;
- authentication supplies actor identity;
- authorization supplies actor role and permission;
- idempotency protects identity creation;
- acknowledgement proves backend acceptance;
- conflicts remain explicit;
- absence remains explicit;
- read projections preserve authority and provenance.

### Evidence Decision

Implementation is not authorized.

The required production evidence is currently incomplete:

- deployed schema;
- constraints and indexes;
- migration history and ownership;
- authoritative deployment revision;
- API contract inventory;
- authorization policy;
- backend test capability.

### Recommended Runtime Phase 4

The next phase should be:

**MEETRO OPERATIONAL AGGREGATE RUNTIME PHASE 4 - PRODUCTION EVIDENCE
COLLECTION AND IMPLEMENTATION AUTHORIZATION REVIEW**

That phase should:

1. collect the evidence defined in Sections 17 through 23;
2. separate verified facts from unknown production reality;
3. mark each mandatory gate pass, fail, or unavailable;
4. identify the authoritative backend, database, migration, deployment,
   authorization, and test owners;
5. determine whether a minimal additive implementation plan may be drafted.

Phase 4 must remain read-only and must not create schemas, migrations, routes,
or code.

### Final Gate

Proceed to implementation planning only when:

- canonical identity ownership is approved;
- every mandatory evidence category is available;
- authorization responsibilities are approved;
- idempotency and acknowledgement semantics are approved;
- compatibility behavior is protected;
- backend tests and rollback capability exist.

Until then:

```text
Architecture contract: READY
Production evidence: INCOMPLETE
Implementation authorization: BLOCKED
Runtime adoption: BLOCKED
```
