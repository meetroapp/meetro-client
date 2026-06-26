# Operational Aggregate Runtime Phase 2 - Backend Authority Readiness Audit

## Status

- Audit only
- No backend or frontend implementation
- No schema creation or migration
- No API, routing, storage, or runtime changes
- No Operational Aggregate adoption

## Evidence Boundary

This audit uses only evidence already preserved inside `meetro-client`:

- `OPERATIONAL_AGGREGATE_RUNTIME_PHASE_1_BACKEND_IDENTITY_STRATEGY.md`
- `OPERATIONAL_AGGREGATE_PHASE_2_AUTHORITY_SPECIFICATION.md`
- `OPERATIONAL_AGGREGATE_PHASE_6_READ_MODEL_AND_LIFECYCLE_ARCHITECTURE.md`
- `OPERATIONAL_AGGREGATE_PHASE_8_FINAL_READINESS_REVIEW.md`
- `BACKEND_SOURCE_INVENTORY.md`
- `BACKEND_MESSAGE_ROUTE_AUTHORITY_AUDIT.md`
- `BACKEND_DATABASE_RELATIONSHIP_AUDIT.md`
- `BACKEND_CANONICAL_MESSAGE_PATCH_PLAN.md`
- `BACKEND_MESSAGE_IDENTITY_AUTHORITY_CONTRACT.md`
- current frontend API usage

The prior backend audits recorded source-level inspection of the public
`metro-server` repository. This phase did not access another local project,
the live database, deployment consoles, or production credentials.

Findings are separated into:

1. **Source-verified capability:** behavior recorded from reviewed backend
   source.
2. **Frontend-observed capability:** behavior required or consumed by the
   current client.
3. **Inferred persistence expectation:** behavior implied by route SQL but not
   proven by a database catalog.
4. **Unknown production reality:** constraints, deployed revision, data shape,
   and operational behavior that cannot be verified from this workspace.

Classification vocabulary:

| Classification | Meaning |
| --- | --- |
| `EXISTS` | Source-level authority exists for the stated legacy capability |
| `PARTIAL` | Some required behavior exists, but identity, provenance, authorization, durability, or scope is incomplete |
| `MISSING` | No reviewed backend authority implements the capability |
| `BLOCKED` | Implementation cannot safely proceed because prerequisite authority, policy, or production evidence is absent |

## 1. Executive Summary

The current backend has a real but narrow persistence foundation:

- Node.js and Express API runtime;
- PostgreSQL access;
- JWT authentication;
- durable user-oriented records;
- durable quote-request intake records;
- authenticated message persistence;
- request-keyed workflow-event persistence;
- backend-issued database row IDs and likely database timestamps.

Those capabilities are not yet an Operational Aggregate backend.

The backend does not currently provide:

- canonical `serviceRequestId`;
- canonical `{ aggregateId, aggregateType }`;
- aggregate creation acknowledgement;
- typed aggregate links;
- aggregate lifecycle command authority;
- canonical Conversation identity or participant registry;
- Schedule authority;
- Completion authority;
- Closure authority;
- Relationship identity or continuity;
- RecurringService parent, cycle, and occurrence identity;
- canonical immutable event identity with idempotency;
- complete actor-role and decision provenance;
- production schema and migration evidence;
- backend regression tests.

The current backend can preserve selected legacy records across sessions and
devices. It cannot preserve a canonical work identity across those records
because no aggregate authority exists.

### Overall Readiness

| Area | Classification | Finding |
| --- | --- | --- |
| Backend runtime and database connectivity | `EXISTS` | Express and PostgreSQL are established in reviewed source |
| Legacy intake persistence | `PARTIAL` | Quote requests and posts exist, but no universal Service Request authority exists |
| Canonical Service Request identity | `MISSING` | No stable `serviceRequestId` contract is present |
| Operational Aggregate identity | `MISSING` | No aggregate entity, type, creation command, or acknowledgement exists |
| Legacy message persistence | `EXISTS` | Authenticated message insert and request-keyed fetch exist |
| Canonical Conversation authority | `MISSING` | Messages are grouped by Quote Request rather than Conversation |
| Legacy workflow-event persistence | `PARTIAL` | A request-keyed event table exists but does not satisfy the canonical envelope |
| Completion authority | `MISSING` | Current Completion behavior is client/local-storage driven |
| Closure authority | `BLOCKED` | Both backend authority and product authorization policy are absent |
| Relationship continuity | `MISSING` | No Relationship identity, participant graph, or continuity authority exists |
| Runtime aggregate adoption | `BLOCKED` | Identity, typed links, authorization, idempotency, schema evidence, and tests are missing |

The backend is ready for a contract and production-evidence phase. It is not
ready for aggregate creation, aggregate reference persistence, lifecycle
commands, or runtime consumers.

## 2. Existing Backend Capabilities

The following capabilities were recorded by earlier source audits:

| Capability | Current evidence | Classification | Limitation |
| --- | --- | --- | --- |
| HTTP API runtime | Express application in a single backend entry point | `EXISTS` | Routes, SQL, auth, and startup are tightly coupled |
| PostgreSQL connectivity | `pg` pool using `DATABASE_URL`; prior Railway database health response | `EXISTS` | Deployed schema and constraints are unknown |
| JWT authentication | Token creation and verification middleware | `EXISTS` | Domain authorization and participant checks are incomplete |
| User persistence | Auth and profile routes depend on `users` | `EXISTS` | Production constraints and role semantics are not verified |
| Business profile persistence | `contractor_profiles` is used by routes | `PARTIAL` | Foreign keys and one-profile-per-user rules are unknown |
| Intake-like persistence | `posts` and `quote_requests` are used | `PARTIAL` | Neither is a universal Service Request authority |
| Message persistence | `POST /messages` inserts and returns a row | `EXISTS` | No canonical Conversation, aggregate, role snapshot, or idempotency |
| Message retrieval | `GET /messages/:quoteRequestId` returns request-keyed rows | `EXISTS` | Participant authorization and Conversation ownership are missing |
| Workflow-event persistence | `/workflow-events` routes and source-defined table | `PARTIAL` | Legacy request-keyed schema, no canonical event envelope |
| Reviews | `reviews` table is referenced | `PARTIAL` | Review presence is not Completion, Closure, History, or Relationship authority |
| Portfolio projects | `contractor_projects` is referenced | `PARTIAL` | Appears presentation/portfolio-oriented, not operational Project authority |
| API documentation | No OpenAPI or equivalent artifact found | `MISSING` | Route contracts are source-discovered rather than formally versioned |
| Migration system | No migrations or migration framework found | `MISSING` | Schema evolution and rollback cannot be audited |
| Backend tests | Test script is an error placeholder | `MISSING` | No regression protection for identity or authority changes |
| Deployment ownership evidence | Multiple deployment references, no manifest tying deployment to revision | `PARTIAL` | Production source parity is unverified |

The existence of a table or route proves only that a legacy record can be
handled. It does not prove canonical domain authority.

## 3. Existing Identity Authorities

| Identity | Current authority | Classification | Aggregate readiness |
| --- | --- | --- | --- |
| Authenticated user ID | JWT principal and `users.id` | `EXISTS` | Suitable actor starting point, subject to authorization checks |
| User role | JWT role claim and user fields | `PARTIAL` | Role values are not proven canonical or snapshotted at decision time |
| Contractor profile ID | `contractor_profiles.id` | `PARTIAL` | Business profile identity only |
| Post ID | Backend post record | `EXISTS` | Source identity only; not canonical Service Request identity |
| Quote Request ID | `quote_requests.id` | `EXISTS` | Durable request identity, not Project, Conversation, or aggregate identity |
| Message ID | Database-returned message row `id` | `PARTIAL` | Durable entity ID likely exists; retry and immutability policies are unknown |
| Workflow-event row ID | Source-defined serial row ID | `PARTIAL` | Database row identity is not canonical event occurrence identity |
| Review ID | Review record identity | `PARTIAL` | Does not establish Completion or Closure |
| Portfolio project ID | `contractor_projects.id` | `PARTIAL` | Must not be promoted to operational aggregate identity |
| Canonical `serviceRequestId` | None found | `MISSING` | Intake identity remains fragmented by source |
| Canonical `conversationId` | None found in backend source | `MISSING` | Current frontend Conversation IDs are local compatibility values |
| Canonical `aggregateId` | None found | `MISSING` | Runtime aggregate adoption cannot begin |
| Canonical `aggregateType` | None found | `MISSING` | Project, WorkOrder, Emergency, and RecurringService cannot be distinguished authoritatively |
| Recurring parent/cycle/occurrence IDs | None found | `MISSING` | Recurring work cannot be represented safely |
| Relationship identity | None found | `MISSING` | Persistent relationship continuity is unavailable |

### Durable Intake Identity

**Can the backend create durable intake identity?**

**PARTIAL.**

The backend can create durable source records such as posts and Quote
Requests. It does not expose one canonical Service Request identity shared
across intake paths. A Quote Request ID may remain durable and useful, but it
cannot be renamed to `serviceRequestId` without an authoritative mapping and
source provenance.

### Cross-Session and Cross-Device Identity

**Can the backend preserve identity across sessions and devices?**

**PARTIAL.**

Backend user, Quote Request, message, and workflow-event row identities can be
read across sessions when persisted successfully. Aggregate, Conversation,
Schedule, Completion, Closure, and Relationship identities are absent or
client-local, so end-to-end workflow identity does not survive reliably.

## 4. Existing Persistence Authorities

| Domain | Current persistence | Classification | Authority gap |
| --- | --- | --- | --- |
| Users | PostgreSQL | `EXISTS` | Authorization semantics and production constraints need verification |
| Contractor profiles | PostgreSQL | `PARTIAL` | Relationship constraints unverified |
| Posts/intake | PostgreSQL | `PARTIAL` | No universal Service Request model |
| Quote Requests | PostgreSQL | `EXISTS` | Intake/request persistence, not full Quote lifecycle authority |
| Messages | PostgreSQL | `EXISTS` | Request-keyed and missing canonical Conversation/aggregate identity |
| Workflow events | PostgreSQL source-defined table | `PARTIAL` | Legacy schema and non-atomic relationship to message writes |
| Reviews | PostgreSQL reference | `PARTIAL` | Not Closure, Completion, or durable History authority |
| Contractor portfolio projects | PostgreSQL reference | `PARTIAL` | Presentation domain, not operational work authority |
| Schedule | Client/local storage in reviewed frontend | `MISSING` | No backend scheduling authority was found |
| Quote proposals/versions | Mixed client workflow and request context | `PARTIAL` | No audited canonical proposal/version authority |
| Completion | Client/local storage in reviewed frontend | `MISSING` | No backend Completion entity or acknowledgement was found |
| Closure | None found | `MISSING` | No Closure aggregate, obligation registry, or decision authority |
| History | Fragmented records only | `PARTIAL` | No canonical History projection or immutable continuity authority |
| Relationship | None found | `MISSING` | No durable Relationship graph or participant history |
| Operational Aggregate | None found | `MISSING` | No aggregate persistence boundary |

Persistence is fragmented by feature. No backend record currently unifies
work identity while preserving the separate authority of Conversation,
Schedule, Quote, Completion, Closure, History, and Relationship.

## 5. Existing Event Authorities

The backend has a legacy `workflow_events` capability with fields recorded as:

- row `id`;
- `quote_request_id`;
- `user_id`;
- workflow type;
- workflow status;
- workflow payload;
- event label;
- `created_at`.

This is useful persistence, but only a partial event authority.

### Capabilities That Exist

- backend database row creation;
- request-scoped event lookup;
- authenticated user reference;
- persistence timestamp field;
- workflow type/status/payload storage.

### Missing Canonical Event Capabilities

- immutable semantic event ID;
- command idempotency and replay result;
- `serviceRequestId`;
- `aggregateId`;
- `aggregateType`;
- `conversationId`;
- authorization-derived actor role;
- explicit source authority;
- occurrence time distinct from recording time;
- backend acknowledgement contract;
- typed entity reference;
- typed recurring scope;
- atomic persistence with the source command;
- correction, supersession, or conflict relationship;
- event registry enforcement;
- backend tests.

**Can the backend persist event history?**

**PARTIAL.** It can persist request-keyed workflow rows, but it cannot yet
preserve a canonical cross-domain aggregate lifecycle history.

**Can the backend support immutable event identity?**

**MISSING.** A serial database row ID identifies a row, but the reviewed
backend does not define event immutability, idempotent replay, stable command
identity, or a semantic event-ID contract.

## 6. Existing Relationship Authorities

The current backend contains limited relationship evidence:

- Quote Requests associate a homeowner and contractor profile in route
  expectations;
- messages contain sender and receiver IDs;
- contractor profiles associate a user with a business profile;
- reviews and portfolio records associate users or business profiles with
  feature records.

These are entity relationships, not a canonical Relationship authority.

Missing capabilities include:

- stable `relationshipId`;
- relationship type and status;
- participant role periods;
- conversation membership;
- tenant/property-manager scope;
- manual-customer identity;
- invitation and account-link history;
- consent history;
- blocked/revoked access history;
- repeat-customer continuity;
- relationship access and visibility policy;
- relationship survival after Completion and Closure.

**Can the backend support relationship continuity?**

**MISSING.** Existing foreign-key-like associations do not provide durable
Relationship identity, access history, or continuity across requests and
aggregates.

## 7. Existing Completion Authorities

No reviewed backend route, table, command, or acknowledgement establishes
canonical Completion authority.

Current frontend behavior records Completion through client and local-storage
flows, including:

- generated completion record IDs;
- completion photos and notes;
- Schedule updates;
- Conversation closeout cards;
- completed-work collections;
- Project Folder or History-shaped records.

Those records can support characterization and read reconciliation. They do
not prove:

- backend-issued `completionId`;
- typed aggregate scope;
- performer identity and role;
- immutable occurrence time;
- backend recording time;
- artifact durability;
- evidence provenance;
- authorized completion submission;
- completion correction or supersession.

### Classification

| Completion capability | Classification |
| --- | --- |
| Local completion capture | `EXISTS` |
| Backend Completion entity | `MISSING` |
| Backend Completion acknowledgement | `MISSING` |
| Typed aggregate reference on Completion | `MISSING` |
| Performer provenance | `MISSING` |
| Durable evidence references | `MISSING` |
| Completion audit trail | `MISSING` |

**Can the backend support completion references?**

**MISSING today.** The database could structurally store references in the
future, but no current backend authority issues or validates canonical
Completion-to-aggregate links.

## 8. Existing Closure Authorities

No Closure backend authority exists in the reviewed evidence.

Missing capabilities include:

- Closure aggregate or decision record;
- obligation registry;
- applicability and resolution state;
- source-owned evidence references;
- Closure reviewer identity and role;
- waiver authority;
- dispute state;
- `closureDecisionRef`;
- backend acknowledgement;
- typed aggregate scope;
- recurring parent/cycle/occurrence Closure scope;
- post-Closure correction and audit history.

Closure is also blocked by unresolved policy:

- mandatory obligations;
- evidence sufficiency;
- payment authority;
- customer and tenant confirmation exceptions;
- waiver authority;
- who may authorize Closure;
- late evidence and disputes;
- recurring parent termination.

**Can the backend support closure references?**

**BLOCKED.** A reference shape can be specified, but no authoritative Closure
record exists and the policy required to create one has not been approved.

Completion, review submission, archive state, History presence, payment text,
and display labels must not be treated as Closure evidence or authority.

## 9. Existing Conversation Authorities

The backend persists messages, not canonical Conversations.

Current source-level behavior:

- `POST /messages` derives `sender_id` from authenticated `req.user.id`;
- client-supplied sender identity is not used by the insert;
- `GET /messages/:quoteRequestId` groups messages by Quote Request;
- no Conversation route, table, or participant model was found;
- no participant authorization check was found;
- no canonical Conversation ID is returned;
- no sender-role snapshot is persisted;
- no message idempotency exists;
- message and workflow-event writes are not atomic.

### Classification

| Conversation capability | Classification |
| --- | --- |
| Authenticated legacy message write | `EXISTS` |
| Backend-issued message row ID | `PARTIAL` |
| Backend-owned message timestamp | `PARTIAL` |
| Canonical Conversation identity | `MISSING` |
| Conversation membership | `MISSING` |
| Participant authorization | `MISSING` |
| Canonical actor role snapshot | `MISSING` |
| Message idempotency | `MISSING` |
| Canonical `MESSAGE_CREATED` event | `MISSING` |
| Atomic message/event persistence | `MISSING` |

Conversation cannot yet carry an authoritative aggregate reference because
Conversation itself lacks backend identity and membership authority.

## 10. Existing Schedule Authorities

No backend Schedule route, Schedule table, appointment authority, or dispatch
authority was identified in the reviewed backend evidence.

Current frontend scheduling uses local records and compatibility links.
Schedule IDs may be stable within one client storage context, but the backend
does not currently prove:

- durable Schedule identity;
- cross-device persistence;
- appointment ownership;
- assignment authority;
- aggregate linkage;
- reschedule/cancel history;
- actor and role provenance;
- occurrence timestamp versus recording timestamp;
- idempotent scheduling commands.

### Classification

| Schedule capability | Classification |
| --- | --- |
| Client-local scheduling behavior | `EXISTS` |
| Backend Schedule identity | `MISSING` |
| Backend appointment persistence | `MISSING` |
| Aggregate-to-Schedule link authority | `MISSING` |
| Schedule audit trail | `MISSING` |

Schedule cannot establish aggregate state. A future Schedule may support an
aggregate transition to `scheduled`, but aggregate authority must accept that
transition separately.

## 11. Existing Quote Authorities

The backend has durable Quote Request intake, not a complete canonical Quote
proposal lifecycle.

Existing evidence supports:

- `quote_requests` records;
- homeowner and contractor-profile associations expected by route code;
- message routing by Quote Request;
- client workflows for quote creation, sending, acceptance, revision, and
  decline.

Missing or unverified backend authority includes:

- canonical Quote entity distinct from Quote Request;
- quote version identity;
- immutable proposal snapshots;
- pricing and scope provenance;
- actor role and authorization;
- acceptance/revision decision identity;
- aggregate reference;
- idempotent quote commands;
- canonical Quote lifecycle events;
- atomic quote/event persistence.

### Classification

| Quote capability | Classification |
| --- | --- |
| Quote Request intake identity | `EXISTS` |
| Quote Request persistence | `EXISTS` |
| Canonical Quote proposal identity | `PARTIAL` |
| Quote version authority | `MISSING` |
| Quote-to-aggregate link authority | `MISSING` |
| Quote lifecycle event authority | `MISSING` |

A Quote Request ID cannot become `aggregateId`. Quote acceptance may support a
future work-authorization policy, but it cannot create or rename aggregate
identity implicitly.

## 12. Existing History Authorities

The backend preserves several durable record streams:

- messages;
- workflow-event rows;
- Quote Requests;
- reviews;
- users and profiles;
- portfolio records.

These streams provide fragments of historical evidence. They do not form a
canonical History authority because:

- entity identities are not consistently linked;
- no aggregate identity exists;
- no canonical event registry exists;
- occurrence and recording timestamps are not consistently separated;
- no correction or supersession model exists;
- no provenance-completeness contract is enforced;
- no recurring parent/cycle/occurrence scope exists;
- local Completion and Schedule history are not backend-owned;
- Relationship continuity is absent.

### Classification

| History capability | Classification |
| --- | --- |
| Durable legacy source records | `EXISTS` |
| Request-keyed workflow history | `PARTIAL` |
| Aggregate lifecycle History | `MISSING` |
| Completion and Closure continuity | `MISSING` |
| Relationship Memory | `MISSING` |
| Recurring continuity | `MISSING` |

History may preserve authoritative events but may not create authority,
authorize Closure, or infer aggregate identity.

## 13. Existing Audit/Provenance Authorities

### Existing Provenance Signals

- JWT-authenticated user ID;
- JWT role claim;
- backend-derived message sender ID;
- database row IDs;
- likely database `created_at` values;
- Quote Request homeowner and contractor associations;
- source-specific IDs;
- request-keyed workflow-event user ID;
- source-level route behavior.

### Missing Provenance Signals

- canonical actor role at authorization time;
- command identity;
- idempotency key and replay result;
- aggregate creation decision;
- classification decision reference;
- typed source links;
- backend acknowledgement envelope;
- occurrence time;
- authorization decision record;
- participant-access decision;
- correction and supersession links;
- aggregate lifecycle prior-state validation;
- Closure decision provenance;
- recurring scope provenance;
- deployed source revision;
- schema version;
- automated audit tests.

### Classification

| Audit capability | Classification |
| --- | --- |
| Authenticated actor ID for message writes | `EXISTS` |
| Persistence timestamps | `PARTIAL` |
| Actor role provenance | `PARTIAL` |
| Entity source provenance | `PARTIAL` |
| Authorization-decision provenance | `MISSING` |
| Idempotency/replay provenance | `MISSING` |
| Canonical event audit trail | `MISSING` |
| Deployment/schema provenance | `MISSING` |
| Backend regression coverage | `MISSING` |

**Can the backend preserve provenance?**

**PARTIAL.** It preserves selected actor and timestamp facts, but not enough
to prove aggregate creation, cross-domain links, lifecycle decisions, or
Closure.

**Can the backend support audit trails?**

**PARTIAL.** Legacy rows provide a record trail. A canonical audit trail
requires immutable event identity, authorization provenance, idempotency,
typed references, acknowledgements, and correction relationships.

## 14. Aggregate Architecture Requirements

Operational Aggregate runtime adoption requires the backend to provide the
following authority boundaries.

### Service Request Authority

- stable canonical `serviceRequestId`;
- source type and source identity;
- requester provenance;
- creation time;
- idempotent creation or explicit duplicate handling;
- ability to remain unclassified and unlinked to an aggregate.

### Aggregate Identity Authority

- backend-issued `aggregateId`;
- explicit `aggregateType`;
- supported types: Project, WorkOrder, Emergency, RecurringService;
- creation acknowledgement;
- creation actor and authorization-derived role;
- persistence-owned timestamps;
- source Service Request references;
- classification decision reference;
- idempotency and conflict handling.

### Typed Link Authority

- explicit source entity type and ID;
- explicit aggregate ID and type;
- link actor, role, time, and authority;
- validation that both records exist;
- rejection of cross-domain identity substitution;
- zero-to-many link support;
- conflict visibility;
- no promotion of compatibility IDs.

### Lifecycle Authority

- authoritative aggregate state;
- validated prior state;
- authorized command actor and role;
- immutable lifecycle event ID;
- idempotent command behavior;
- backend acknowledgement;
- correction and supersession policy;
- no state derivation from Communication or workflow-card display status.

### Continuity Authority

- typed Conversation, Schedule, Quote, Completion, Closure, History, and
  Relationship references;
- stable event identity;
- source-owned timestamps and provenance;
- recurring parent, cycle, and occurrence scope;
- survivability after Completion, Closure, reclassification, replacement, and
  relationship turnover.

### Reliability and Governance

- production schema evidence;
- migration ownership;
- rollback procedure;
- API contract;
- participant authorization;
- concurrency handling;
- backend characterization and regression tests;
- observable deployment revision.

## 15. Capability Gap Analysis

| Requirement | Current capability | Status | Gap before aggregate runtime |
| --- | --- | --- | --- |
| Durable intake identity | Durable posts and Quote Requests | `PARTIAL` | No universal `serviceRequestId` or source mapping |
| Aggregate identity | None | `MISSING` | No `aggregateId`, type, creation command, or acknowledgement |
| Aggregate type | Client concepts only | `MISSING` | No backend registry or type provenance |
| Aggregate references | Compatibility links only | `MISSING` | No authoritative typed link boundary |
| Identity across devices | Some backend entities persist | `PARTIAL` | Workflow identity remains fragmented and client-local |
| Immutable event identity | Database row IDs | `MISSING` | No semantic event ID, idempotency, or replay contract |
| Event history | Request-keyed workflow rows | `PARTIAL` | No aggregate scope, canonical envelope, or atomicity |
| Actor identity | JWT principal | `EXISTS` | Must be applied consistently to all commands |
| Actor role | JWT claim | `PARTIAL` | No canonical role mapping or decision-time snapshot |
| Authorization | Authentication only on key routes | `PARTIAL` | Missing participant and aggregate command authorization |
| Provenance | User IDs and timestamps on some rows | `PARTIAL` | Missing link, decision, acknowledgement, and correction provenance |
| Conversation authority | Messages keyed by Quote Request | `MISSING` | No Conversation identity or membership |
| Schedule authority | Client-local | `MISSING` | No backend Schedule identity or persistence |
| Quote authority | Quote Request persistence | `PARTIAL` | No canonical proposal/version lifecycle |
| Completion authority | Client-local | `MISSING` | No durable Completion identity, evidence, or acknowledgement |
| Closure authority | None | `BLOCKED` | Backend model and product authorization policy absent |
| History authority | Fragmented durable rows | `PARTIAL` | No canonical continuity model in persistence |
| Relationship authority | Feature-specific associations | `MISSING` | No durable Relationship identity or access history |
| Recurring scope | None | `MISSING` | No parent, cycle, or occurrence IDs |
| Audit trail | Legacy row history | `PARTIAL` | No canonical event/provenance chain |
| Production schema evidence | Partial source expectations | `BLOCKED` | No catalog snapshot, migrations, or proven constraints |
| Backend tests | None | `MISSING` | No safety net for additive authority work |

## 16. Backend Readiness Matrix

| Capability | Classification | Evidence | Runtime decision |
| --- | --- | --- | --- |
| Create durable intake records | `EXISTS` | Posts and Quote Requests persist | Keep as source-specific identity |
| Create canonical Service Requests | `MISSING` | No universal identity contract | Do not rename legacy IDs |
| Preserve source records across sessions/devices | `EXISTS` | PostgreSQL-backed legacy entities | Does not establish aggregate continuity |
| Preserve end-to-end workflow identity | `PARTIAL` | Backend and local IDs coexist | Block aggregate adoption |
| Create canonical aggregate identity | `MISSING` | No aggregate authority found | Block aggregate creation |
| Persist aggregate type | `MISSING` | No aggregate model found | Block typed runtime references |
| Persist authoritative aggregate links | `MISSING` | Shadow/compatibility links are client-side | Keep reconciliation read-only |
| Authenticate command actor | `EXISTS` | JWT middleware | Reuse only with command authorization |
| Authorize aggregate actions | `MISSING` | No aggregate commands or permissions | Block lifecycle writes |
| Persist legacy messages | `EXISTS` | Authenticated insert/fetch | Preserve current behavior |
| Own canonical Conversation | `MISSING` | Request-keyed messages only | Block Conversation aggregate links |
| Persist legacy workflow events | `PARTIAL` | Request-keyed table/routes | Do not treat as canonical event store |
| Persist immutable canonical events | `MISSING` | No event ID/idempotency contract | Block lifecycle event authority |
| Preserve actor-role provenance | `PARTIAL` | JWT role exists, not normalized or snapshotted | Block canonical decision claims |
| Support idempotency | `MISSING` | No keys or replay handling | Block create/transition commands |
| Support Completion references | `MISSING` | Completion is client-local | Allow fixtures only |
| Support Closure references | `BLOCKED` | No authority and unresolved policy | Keep Closure non-runtime |
| Support recurring scope references | `MISSING` | No parent/cycle/occurrence model | Block RecurringService runtime |
| Support relationship continuity | `MISSING` | No Relationship entity | Block Relationship Memory runtime |
| Provide aggregate History | `MISSING` | Only fragmented source history | Allow read-only characterization only |
| Provide canonical audit trails | `PARTIAL` | Some actor/timestamp rows exist | Insufficient for aggregate authority |
| Prove production schema | `BLOCKED` | No schema snapshot or migrations | Required before implementation planning |
| Protect changes with tests | `MISSING` | No backend test suite | Required before runtime adoption |

### Required Question Summary

| Question | Answer |
| --- | --- |
| Can the backend create durable intake identity? | `PARTIAL`: durable source records exist, but no canonical Service Request identity |
| Can the backend preserve identity across sessions and devices? | `PARTIAL`: selected backend entities persist; aggregate continuity does not |
| Can the backend persist event history? | `PARTIAL`: request-keyed workflow rows exist, not canonical aggregate history |
| Can the backend support immutable event identity? | `MISSING`: row IDs exist without idempotency or semantic event policy |
| Can the backend support aggregate references? | `MISSING`: no authoritative aggregate exists to reference |
| Can the backend preserve provenance? | `PARTIAL`: selected actor/timestamp facts exist; decision and link provenance do not |
| Can the backend support recurring scope references? | `MISSING` |
| Can the backend support relationship continuity? | `MISSING` |
| Can the backend support completion references? | `MISSING` |
| Can the backend support closure references? | `BLOCKED`: authority and policy are absent |
| Can the backend support audit trails? | `PARTIAL`: legacy records exist, but no canonical auditable event chain |

## 17. Risks Of Runtime Adoption Today

### Critical Risks

1. **False aggregate identity:** request, Quote Request, Conversation,
   Schedule, Emergency, Completion, portfolio Project, or generic IDs could
   be persisted as `aggregateId`.
2. **Unauthorized links:** clients could attach records to work they are not
   authorized to view or modify.
3. **Duplicate aggregates:** retrying a create command could create multiple
   work authorities without idempotency.
4. **Wrong aggregate type:** category or UI context could silently turn work
   into Project instead of WorkOrder, Emergency, or RecurringService.
5. **Production schema conflict:** source assumptions could differ from the
   deployed database.

### High Risks

1. Communication state or workflow-card state could become aggregate state.
2. Quote acceptance could silently create work identity.
3. Schedule creation could silently authorize work.
4. Completion could automatically imply Closure.
5. Local Completion evidence could appear backend-authoritative.
6. Actor role could be inferred from the current viewer instead of command
   authorization.
7. Serial database row IDs could be mistaken for immutable event identity.
8. Message access could expose request conversations without participant
   authorization.
9. Compatibility links could become permanent backend truth.
10. Recurring occurrence Completion could close the parent service.

### Operational Risks

- no migration history;
- no rollback-tested schema process;
- no backend tests;
- no versioned API contract;
- no proven deployment revision;
- no production constraint inventory;
- no concurrency conflict strategy;
- no correction or supersession strategy.

### Runtime Decision

Operational Aggregate runtime adoption is **BLOCKED**.

Contract definition, schema evidence collection, source characterization, and
supplied-data shadow-read planning may continue. Runtime identity creation,
reference persistence, lifecycle commands, UI consumption, and migrations
must not begin.

## 18. Minimum Backend Requirements

The following requirements are the minimum gate before any controlled
aggregate runtime adoption.

### Gate 1: Production Evidence

- authoritative backend repository and deployment revision;
- read-only production schema snapshot or equivalent catalog evidence;
- table constraints, indexes, nullability, defaults, and foreign keys;
- migration ownership and rollback process;
- API inventory;
- data volume and legacy-shape characterization.

### Gate 2: Canonical Intake Identity

- one durable `serviceRequestId`;
- explicit legacy source reference;
- requester and creation provenance;
- stable reads across sessions/devices;
- duplicate handling or idempotency;
- no automatic aggregate creation.

### Gate 3: Aggregate Identity Authority

- backend-issued `aggregateId`;
- explicit `aggregateType`;
- creation actor and authorization-derived role;
- persistence-owned timestamps;
- source Service Request and classification references;
- idempotent create acknowledgement;
- replay and conflict result;
- no legacy-ID promotion.

### Gate 4: Typed Reference Authority

- source entity type and ID;
- aggregate ID and type;
- validation that both identities exist;
- link actor, role, and timestamp;
- participant/access authorization;
- conflict and unlink/supersession rules;
- compatibility references preserved separately.

### Gate 5: Canonical Event and Audit Authority

- immutable event ID;
- command/idempotency identity;
- aggregate identity and type;
- actor and authorization-derived role;
- occurred-at and recorded-at policy;
- backend acknowledgement;
- source and payload contract;
- correction/supersession relationships;
- transactional boundary;
- regression tests.

### Gate 6: Safe Read Authority

- explicit null when no aggregate exists;
- typed references;
- source and freshness provenance;
- access enforcement;
- compatibility warnings;
- no client inference;
- stable behavior across repeated reads.

### Required Before Later Domains

Completion runtime additionally requires:

- canonical `completionId`;
- performer provenance;
- typed aggregate and recurring scope;
- durable evidence references;
- backend acknowledgement.

RecurringService runtime additionally requires:

- stable parent service ID;
- stable cycle ID;
- stable occurrence ID;
- scope-specific Completion and Closure rules.

Closure runtime additionally requires:

- approved obligation and authorization policy;
- Closure decision identity;
- obligation registry;
- evidence-reference validation;
- reviewer and waiver authority;
- dispute and correction behavior.

### Not Yet Required

The following should remain deferred until identity authority is proven:

- aggregate lifecycle UI;
- Work Center aggregate adoption;
- Dashboard or Command Center aggregate state;
- legacy backfill;
- mandatory aggregate references on existing rows;
- Closure implementation;
- Relationship Memory implementation;
- recurring runtime;
- merge, split, replacement, and supersession implementation;
- removal of legacy endpoints or fields.

## 19. Recommended Runtime Phase 3

### Proposed Task

**MEETRO OPERATIONAL AGGREGATE RUNTIME PHASE 3 - BACKEND AGGREGATE IDENTITY
CONTRACT AND SCHEMA EVIDENCE PLAN**

### Mission

Define the minimum additive backend contract for:

- canonical `serviceRequestId`;
- canonical `{ aggregateId, aggregateType }`;
- aggregate creation acknowledgement;
- typed source-to-aggregate references;
- actor and role provenance;
- idempotency, replay, and conflict responses;
- read-only identity projection;
- explicit absence of aggregate identity.

At the same time, define the exact read-only production evidence required
before any schema or route implementation is authorized.

### Required Outputs

1. Backend aggregate identity command contract.
2. Backend aggregate identity read contract.
3. Typed reference contract.
4. Idempotency and acknowledgement contract.
5. Authorization responsibility matrix.
6. Production schema evidence checklist.
7. Legacy compatibility response rules.
8. Stop conditions for schema, policy, authorization, or deployment
   uncertainty.

### Phase 3 Boundaries

Phase 3 should remain planning/specification only:

- no schema;
- no migration;
- no route implementation;
- no aggregate creation;
- no backfill;
- no frontend adoption;
- no local-storage changes;
- no lifecycle commands.

### Final Recommendation

Continue the Operational Aggregate runtime track, but remain in backend
contract and evidence planning.

The next safe objective is not to create aggregate records. It is to prove
that the backend can own canonical intake identity, issue typed aggregate
identity, authorize links, and acknowledge idempotent commands without
promoting legacy compatibility identifiers.
