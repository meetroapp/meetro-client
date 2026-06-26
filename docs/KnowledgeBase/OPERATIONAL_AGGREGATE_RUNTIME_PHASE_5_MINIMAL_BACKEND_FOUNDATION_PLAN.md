# Operational Aggregate Runtime Phase 5 - Minimal Backend Foundation Plan

## Status

- Planning only
- No code or dependency changes
- No migrations or schema changes
- No route or API changes
- No frontend or runtime changes
- No canonical identity implementation
- Implementation authorization remains **BLOCKED**

## 1. Executive Summary

The Operational Aggregate architecture definition is complete.

Production evidence collected in Phase 4 is sufficient to plan the backend
foundation required for future work. It is not sufficient to authorize
canonical identity implementation.

The current backend has:

- an identified repository and production revision;
- a functioning Express and PostgreSQL foundation;
- JWT authentication;
- seven production tables;
- source and production schema evidence;
- small, known production row counts.

The current backend does not have:

- migration governance;
- rollback governance;
- backend tests;
- foreign-key enforcement;
- central authorization;
- idempotency;
- canonical event authority;
- Service Request authority;
- Operational Aggregate authority;
- Completion, Closure, History, Relationship, or RecurringService authority.

Backend governance is therefore insufficient for identity implementation.
Runtime adoption remains blocked.

Phase 5 defines only the minimum foundation that must exist before Meetro may
plan:

- `serviceRequestId`;
- `aggregateId`;
- `aggregateType`;
- typed aggregate references;
- canonical identity routes;
- canonical domain persistence.

This phase does not select tools, introduce dependencies, implement tests,
create migrations, modify schemas, or change behavior.

### Phase 5 Decision

```text
Architecture definition: COMPLETE
Production evidence: SUFFICIENT FOR FOUNDATION PLANNING
Backend governance: INSUFFICIENT FOR IDENTITY IMPLEMENTATION
Canonical identity implementation: BLOCKED
Runtime adoption: BLOCKED
```

## 2. Foundation Principles

1. Schema changes require a named migration owner.
2. Schema changes require an approved migration mechanism.
3. Schema changes require forward and rollback procedures.
4. Schema changes require a verified production baseline.
5. Identity changes require executable backend tests.
6. Identity changes require authorization tests.
7. Identity-creating commands require idempotency tests.
8. Runtime routes must not create or alter schema.
9. Request handling is not migration authority.
10. Existing frontend compatibility must be preserved.
11. Existing table and column names must remain unchanged during foundation
    work.
12. Existing IDs must not be repurposed as canonical identities.
13. Existing routes, request fields, and response fields must remain
    compatible.
14. Existing localStorage workflows remain authoritative only for current
    compatibility behavior.
15. Foundation work must be additive and reversible.
16. Unknown production behavior must be documented rather than guessed.
17. Documentation of a defect does not authorize correction.
18. Small production row counts do not remove governance requirements.
19. A successful manual request does not replace automated tests.
20. A database row does not establish correct domain authority.

## 3. Current Backend Baseline

### Repository Baseline

| Item | Current evidence |
| --- | --- |
| Repository | `/Users/williammolina/meetro-server/meetro-server` |
| Remote | `https://github.com/meetroapp/metro-server.git` |
| Branch | `main` |
| Reviewed commit | `feb94b448e30954d00ff61aedd35f721b0137edd` |
| Main backend file | `index.js` |
| Package manifests | `package.json`, `package-lock.json` |
| Installed dependencies | `node_modules` present |

### Structural Baseline

The backend is a single-file application.

No dedicated folders were found for:

- routes;
- controllers;
- services;
- database access;
- migrations;
- tests.

This is sufficient to describe current behavior but creates concentrated risk
for schema, transaction, authorization, and identity work.

### Dependency Baseline

| Dependency | Version |
| --- | --- |
| Express | `5.2.1` |
| `pg` | `8.20.0` |
| `jsonwebtoken` | `9.0.3` |
| bcrypt | `6.0.0` |
| CORS | `2.8.6` |
| dotenv | `17.4.2` |

Missing:

- test framework;
- migration framework.

### Production Table Baseline

| Table | Row count |
| --- | ---: |
| `contractor_profiles` | 3 |
| `contractor_projects` | 3 |
| `messages` | 12 |
| `posts` | 28 |
| `quote_requests` | 1 |
| `reviews` | 0 |
| `users` | 7 |

### Missing Canonical Domains

No production tables were found for:

- Service Requests;
- Operational Aggregates;
- aggregate references;
- workflow events;
- Schedules;
- Completions;
- Closures;
- History;
- Relationships;
- Recurring Services;
- idempotency;
- audit events.

### Constraint Baseline

Confirmed:

- primary keys;
- unique `users.email`;
- selected not-null constraints.

Not found:

- foreign keys;
- role check constraints;
- status check constraints;
- aggregate constraints;
- participant constraints;
- idempotency constraints.

### Index Baseline

Found:

- primary-key indexes;
- unique index for `users.email`.

No supporting indexes were found for:

- `quote_request_id`;
- `sender_id`;
- `receiver_id`;
- `contractor_id`;
- `homeowner_id`;
- `user_id`;
- `reviewer_id`.

### Known Schema Drift and Authority Risks

- `posts` contains both `mage_url` and `image_url`;
- `messages` contains `workflow_type`, `workflow_status`, and
  `workflow_payload`;
- the `workflow_events` route attempts request-time table creation;
- `workflow_events` does not exist in production;
- `quote_requests` is the nearest request/intake table but is not universal
  Service Request authority;
- `contractor_projects` is portfolio/presentation data, not Operational
  Aggregate authority;
- no migrations exist;
- no backend tests exist.

## 4. Migration Foundation Requirements

No schema change may be planned for implementation until a migration
foundation is approved.

### Required Ownership

- named migration owner;
- named production database owner;
- named release owner;
- named rollback owner;
- named reviewer for data compatibility;
- named approver for production execution.

One person may hold more than one role, but each responsibility must be
explicit.

### Migration Strategy Decision

A later planning or implementation-authorized phase must choose a migration
strategy appropriate to the existing Node.js and PostgreSQL backend.

Phase 5 does not:

- choose a migration tool;
- install a migration package;
- create a migration directory;
- create a baseline migration;
- alter `package.json`.

### Required Future Migration Structure

The approved strategy must define:

- migration directory and ownership;
- deterministic file naming;
- ordering rules;
- immutable applied migrations;
- environment targeting;
- database connection handling;
- forward migration command;
- rollback or recovery command;
- migration status inspection;
- failed-migration behavior;
- transaction behavior;
- production execution location;
- execution audit record.

### Production Baseline Requirement

Before the first migration:

1. record the current production schema;
2. record current row counts;
3. record constraints and indexes;
4. record known drift and legacy fields;
5. compare development, test, staging, and production schemas where those
   environments exist;
6. identify objects created outside migrations;
7. establish the baseline revision and evidence date.

### Validation Path

Every future migration must have:

- isolated test database validation;
- staging or equivalent validation;
- forward execution test;
- rollback or documented recovery test;
- compatibility verification;
- post-migration schema comparison;
- post-migration route smoke tests;
- explicit approval before production.

### Prohibitions

- no request-time schema creation;
- no production-console-only migration;
- no undocumented manual SQL;
- no speculative identity backfill;
- no destructive renaming;
- no inferred foreign-key relationships;
- no migration based only on route SQL;
- no use of production data in unapproved test artifacts.

## 5. Backend Test Foundation Requirements

No canonical identity or schema implementation may begin until a backend test
foundation can run reliably.

Phase 5 does not select or install a test framework.

### Test Harness Requirements

A later implementation-authorized phase must define:

- test runner;
- test command;
- isolated test database;
- deterministic setup and teardown;
- sanitized fixtures;
- environment isolation;
- HTTP route testing;
- database integration testing;
- CI execution;
- failure artifacts;
- test ownership.

### Required Characterization Tests

Before changing behavior, tests must characterize current:

- route paths;
- request shapes;
- response shapes;
- status codes;
- authentication behavior;
- message insertion and retrieval;
- Quote Request behavior;
- post behavior;
- contractor profile behavior;
- contractor portfolio behavior;
- review behavior;
- error responses;
- ordering behavior;
- legacy nullable fields;
- message workflow fields.

### Required Future Test Categories

#### Compatibility

- current route compatibility;
- request-field compatibility;
- response-field compatibility;
- current ID preservation;
- legacy schema compatibility;
- current frontend-consumed behavior;
- unknown response fields safely ignored;
- existing ordering and counts preserved.

#### Authentication

- valid token;
- missing token;
- invalid token;
- expired token;
- authenticated actor ID;
- client actor override ignored or rejected.

#### Authorization

- allowed owner action;
- denied non-owner action;
- participant membership;
- business scope;
- tenant/property-management scope;
- denied-action response;
- denied reads do not leak protected records.

#### Database Integration

- route and database transaction behavior;
- constraints;
- timestamp defaults;
- connection failures;
- duplicate behavior;
- rollback after errors.

#### Migration

- forward migration;
- repeated migration command;
- rollback or recovery;
- legacy-row compatibility;
- schema baseline comparison.

#### Future Identity

- identity issuance;
- idempotency;
- exact replay;
- conflicting replay;
- typed-reference validation;
- acknowledgement stability;
- concurrency;
- transaction rollback.

Identity tests are future requirements, not Phase 5 implementation scope.

## 6. Schema Baseline Artifact Requirements

A future schema baseline artifact must be created before the first migration.

### Required Metadata

- database engine and version;
- environment;
- schema name;
- evidence date;
- source commit;
- deployed revision;
- evidence collector;
- database owner;
- approval status.

### Required Table Details

For every table:

- table name;
- purpose as currently observed;
- columns;
- data types;
- nullability;
- defaults;
- primary key;
- unique constraints;
- foreign keys or explicit absence;
- check constraints or explicit absence;
- indexes;
- sequences;
- triggers;
- row-level security;
- approximate row count;
- known consumers;
- known legacy behavior;
- unresolved questions.

### Required Known Baseline Findings

The baseline must explicitly record:

1. `posts.mage_url` exists;
2. `posts.image_url` exists;
3. both fields must remain preserved until separately reviewed;
4. `messages.workflow_type` exists;
5. `messages.workflow_status` exists;
6. `messages.workflow_payload` exists;
7. message workflow fields are compatibility data, not aggregate lifecycle
   authority;
8. the `workflow_events` route exists;
9. the route attempts `CREATE TABLE IF NOT EXISTS`;
10. the `workflow_events` table is absent in production;
11. no foreign keys exist;
12. no supporting indexes exist beyond primary keys and `users.email`;
13. `quote_requests` is not canonical Service Request authority;
14. `contractor_projects` is not Operational Aggregate authority.

### Baseline Rules

- record defects without fixing them;
- record ambiguity without guessing;
- preserve exact legacy names;
- do not synthesize missing relationships;
- do not declare domain authority from table names;
- version the baseline;
- compare future schema evidence against it.

## 7. Compatibility Protection Rules

Foundation work exists to make future change safer. It must not change current
behavior.

### Required Preservation

Preserve:

- current table names;
- current column names;
- current route paths;
- current HTTP methods;
- current request fields;
- current response fields;
- current status behavior;
- current IDs;
- current frontend behavior;
- current localStorage workflows;
- current message workflow fields;
- current `quote_requests` behavior;
- current `contractor_projects` portfolio behavior;
- current ordering and counts;
- legacy nullability and optional-field behavior unless separately approved.

### Explicit Prohibitions

Do not:

- rename `quote_requests` to `service_requests`;
- treat `quote_requests.id` as `serviceRequestId`;
- treat `posts` as Service Request authority;
- treat `posts.id` as `serviceRequestId`;
- treat `contractor_projects.id` as `aggregateId`;
- treat `messages.workflow_status` as aggregate lifecycle state;
- treat message workflow payload as aggregate authority;
- treat message ID as canonical event ID;
- delete `posts.mage_url`;
- rename `posts.mage_url`;
- merge `mage_url` and `image_url`;
- remove message workflow fields;
- change API response shapes;
- remove or rename existing fields;
- alter localStorage behavior;
- backfill canonical IDs;
- infer relationships from matching IDs or text.

### Compatibility Verification

A future foundation implementation must prove:

- old clients can still call current routes;
- current responses remain consumable;
- current source IDs remain unchanged;
- legacy rows remain readable;
- no new required fields break current writes;
- no count or ordering drift occurs;
- no authority is silently reassigned.

## 8. Runtime Schema Creation Prohibition

The current source includes request-handler behavior that attempts:

```sql
CREATE TABLE IF NOT EXISTS workflow_events
```

### Foundation Rule

Schema authority must not live inside request handling.

Runtime table creation is not migration discipline because it lacks:

- ordered version history;
- explicit ownership;
- deployment review;
- rollback planning;
- environment parity;
- deterministic execution;
- compatibility validation;
- auditable production approval.

### Required Future Treatment

A later implementation-authorized phase must:

1. characterize whether the route is active;
2. characterize its current success and failure behavior;
3. protect current API compatibility;
4. establish migration ownership;
5. determine how schema creation will be removed from runtime safely;
6. validate behavior through backend tests;
7. use an approved migration for future schema creation.

### Phase 5 Boundary

No route changes are authorized.

Phase 5 does not:

- remove the statement;
- create `workflow_events`;
- change route responses;
- add migration code;
- redirect event writes;
- declare the route canonical event authority.

## 9. Deployment and Rollback Foundation Requirements

The source repository is identified, but deployment governance remains
incomplete.

### Required Deployment Evidence

- authoritative deployed commit;
- authoritative production branch;
- deployment platform and service;
- deployment owner;
- production environment owner;
- database owner;
- release owner;
- rollback owner;
- environment-variable owner;
- secret-management owner;
- build command;
- start command;
- release procedure;
- health check;
- logging and monitoring location;
- database target confirmation;
- source-to-deployment parity check;
- evidence-retention location.

### Required Rollback Evidence

- rollback trigger conditions;
- rollback decision owner;
- application rollback procedure;
- database rollback or recovery procedure;
- backup and restore responsibility;
- partial-deployment recovery;
- failed-migration recovery;
- post-rollback verification;
- communication and incident ownership.

### Source-to-Deployment Parity

Before foundation implementation:

- prove which commit is deployed;
- prove which database it uses;
- compare deployed routes to reviewed source;
- compare production schema to the approved baseline;
- record drift;
- stop if parity cannot be established.

## 10. Authorization Foundation Requirements

JWT authentication is a useful foundation. It is not sufficient aggregate
authorization.

### Required Authorization Context

Every future protected command must resolve:

- actor identity;
- actor role;
- permission;
- business or tenant scope;
- target ownership;
- participant membership;
- source-record access;
- aggregate access;
- relationship access;
- denied-action behavior;
- audit provenance.

### Required Policy Areas

- who may create a Service Request;
- who may create each aggregate type;
- who may link source records;
- who may view an aggregate;
- who may schedule;
- who may submit Completion;
- who may review obligations;
- who may authorize Closure;
- how team assignments work;
- how tenant/property-manager visibility works;
- how revoked access works;
- how system actors work.

### Foundation Rules

- JWT role alone is insufficient for aggregate authority.
- Current route authentication is not central authorization.
- A user role or business category is not automatically a command role.
- Authorization must be evaluated at command time.
- Historical actor role must be preserved.
- Participant presence must be explicit.
- Denied reads must not leak protected identity.
- No aggregate command should exist before the authorization foundation.

### Required Authorization Tests

Future tests must cover:

- permitted action;
- denied action;
- non-owner access;
- cross-business access;
- participant membership;
- tenant/property-manager scope;
- revoked role;
- system actor;
- audit record.

## 11. Identity and Idempotency Foundation Requirements

Phase 5 does not implement canonical identity. It defines the foundation that
must exist first.

### Service Request Identity Prerequisites

Before `serviceRequestId`:

- migration governance;
- backend tests;
- canonical intake ownership;
- source-reference rules;
- requester authorization;
- duplicate policy;
- idempotency;
- acknowledgement;
- compatibility mapping;
- explicit no-aggregate state.

### Aggregate Identity Prerequisites

Before `aggregateId`:

- Service Request identity strategy;
- aggregate creation authorization;
- approved aggregate types;
- migration governance;
- backend tests;
- idempotent create command;
- typed source references;
- conflict handling;
- acknowledgement;
- audit provenance.

### Aggregate Type Prerequisites

Before `aggregateType`:

- approved type registry;
- ownership rules;
- unknown-type behavior;
- type conflict behavior;
- correction/replacement policy;
- authorization.

### Typed Reference Prerequisites

Before aggregate references:

- authoritative source identity;
- authoritative aggregate identity;
- source and aggregate existence checks;
- permitted relationship matrix;
- participant and business scope;
- link idempotency;
- link conflict behavior;
- acknowledgement;
- unlink or supersession policy;
- audit provenance.

### Idempotency Prerequisites

Future identity-creating commands require:

- stable idempotency key;
- key scope;
- request fingerprint;
- retention policy;
- exact replay behavior;
- conflicting replay behavior;
- concurrency behavior;
- transaction boundary;
- original acknowledgement preservation.

### Acknowledgement Prerequisites

The backend must eventually return:

- accepted, rejected, or conflict status;
- command identity;
- persistence-owned `recordedAt`;
- replay state;
- accepted identity;
- authority;
- version or freshness information.

These contracts must not be implemented during Phase 5.

## 12. Minimum Backend Foundation Sequence

The safe sequence is:

1. **Approve this foundation plan.**
   Confirm scope, owners, exclusions, and stop conditions.

2. **Select migration and test strategies.**
   Choose tools and ownership in a separate planning phase. Do not install
   them yet.

3. **Create the schema baseline artifact.**
   Preserve exact production structure, drift, row counts, and known legacy
   behavior.

4. **Verify deployment and source parity.**
   Prove the deployed commit, database target, and responsible owners.

5. **Introduce a backend test harness in a later implementation-authorized
   phase.**
   Characterize current behavior before changing it.

6. **Introduce a migration framework in a later
   implementation-authorized phase.**
   Establish forward, rollback, status, and audit behavior.

7. **Validate compatibility.**
   Prove current routes, schemas, IDs, frontend flows, and localStorage
   behavior remain unchanged.

8. **Plan canonical Service Request identity.**
   Only after foundation gates pass.

9. **Plan Operational Aggregate identity.**
   Only after Service Request authority and foundational backend governance
   are ready.

### Dependency Order

```text
Foundation approval
  -> tool and ownership strategy
  -> schema baseline
  -> deployment parity
  -> test harness
  -> migration framework
  -> compatibility validation
  -> Service Request identity planning
  -> Operational Aggregate identity planning
```

Skipping a step invalidates implementation authorization.

## 13. Stop Conditions

Foundation planning or future implementation must stop if:

- migration owner is unknown;
- database owner is unknown;
- rollback owner is unknown;
- production schema baseline is missing;
- production schema evidence is stale or incomplete;
- deployment parity is unknown;
- authoritative deployed commit is unknown;
- backend tests cannot run;
- isolated test database is unavailable;
- compatibility impact is unclear;
- current API consumers are unknown;
- authorization ownership is unresolved;
- actor role semantics are ambiguous;
- participant scope is unresolved;
- implementation would alter current frontend behavior;
- implementation would alter localStorage behavior;
- implementation would repurpose legacy IDs;
- implementation would rename legacy tables or columns;
- implementation would require destructive backfill;
- implementation would create schema from a request handler;
- rollback or recovery cannot be demonstrated;
- production secrets or personal data would be exposed;
- a product decision is required for identity, type, ownership, or access.

When a stop condition is reached:

1. document the blocker;
2. preserve current behavior;
3. do not infer a policy;
4. do not implement a workaround;
5. return to the responsible owner for a decision.

## 14. Explicit Non-Goals

Phase 5 does not authorize:

- migration implementation;
- migration dependency installation;
- test-framework implementation;
- test dependency installation;
- schema changes;
- table creation;
- column creation;
- foreign keys;
- indexes;
- constraints;
- triggers;
- data correction;
- data backfill;
- `service_requests`;
- `operational_aggregates`;
- `aggregate_references`;
- `workflow_events` creation;
- Schedule backend authority;
- Completion backend authority;
- Closure backend authority;
- History backend authority;
- Relationship backend authority;
- RecurringService backend authority;
- idempotency implementation;
- audit-event implementation;
- Service Request identity;
- aggregate identity;
- aggregate type;
- aggregate commands;
- aggregate routes;
- API changes;
- frontend changes;
- localStorage changes;
- runtime adoption;
- renaming or deleting legacy fields;
- broad backend refactoring.

## 15. Recommended Next Phase

### Recommended Task

**MEETRO BACKEND FOUNDATION IMPLEMENTATION STRATEGY**

### Mission

Plan how Meetro may safely introduce the minimum backend governance
foundation, without implementing canonical identity.

### Required Planning Scope

The next phase should plan:

- migration-tooling selection criteria;
- backend-test-harness selection criteria;
- schema baseline verification process;
- migration and rollback ownership;
- test database strategy;
- compatibility characterization;
- source-to-deployment parity verification;
- request-time schema creation retirement strategy;
- implementation sequencing;
- implementation stop conditions.

### Required Exclusions

The next phase must still avoid:

- canonical Service Request identity;
- Operational Aggregate identity;
- aggregate type implementation;
- aggregate reference implementation;
- domain tables;
- canonical events;
- frontend adoption;
- behavior changes.

### Final Conclusion

Minimal backend foundation is required before identity work.

Canonical identity implementation remains blocked.

Runtime adoption remains blocked.

The next safe step is a backend foundation implementation strategy, not
aggregate implementation.

```text
Minimal backend foundation: REQUIRED
Foundation plan: DEFINED
Migration implementation: NOT AUTHORIZED
Test implementation: NOT AUTHORIZED
Canonical identity implementation: BLOCKED
Operational Aggregate implementation: BLOCKED
Runtime adoption: BLOCKED
Next safe phase: BACKEND FOUNDATION IMPLEMENTATION STRATEGY
```
