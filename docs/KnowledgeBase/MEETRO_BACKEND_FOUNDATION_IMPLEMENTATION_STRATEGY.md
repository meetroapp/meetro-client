# Meetro Backend Foundation Implementation Strategy

## Status

- Planning only
- No code or dependency changes
- No migrations or schema changes
- No route, API, frontend, or runtime changes
- No Service Request or Operational Aggregate implementation
- Foundation implementation authorization remains pending

## 1. Executive Summary

Meetro has completed:

- Operational Aggregate architecture definition;
- backend and production evidence collection;
- canonical identity contract planning;
- minimal backend foundation planning.

The evidence is sufficient to define how backend governance should be
introduced. It is not sufficient to authorize implementation.

The current backend has a working Express, PostgreSQL, JWT, and legacy API
foundation. It lacks:

- migration governance;
- backend test governance;
- versioned schema baselines;
- verified deployment parity;
- owned rollback procedures;
- central authorization;
- canonical identity and idempotency authority.

This document is the final planning gate before any separately authorized
backend foundation implementation work.

Its purpose is to define evaluation criteria, ownership, sequence, evidence,
and stop conditions. It does not select tools or authorize installation,
migrations, schema changes, route changes, or identity work.

```text
Architecture: COMPLETE
Evidence collection: COMPLETE
Foundation plan: COMPLETE
Foundation implementation strategy: DEFINED HERE
Foundation implementation: NOT AUTHORIZED
Canonical identity: BLOCKED
Operational Aggregate implementation: BLOCKED
Runtime adoption: BLOCKED
```

## 2. Foundation Implementation Objectives

### Migration Governance

Establish a repeatable, reviewable, reversible process for every future
database change.

Required outcomes:

- named migration owner;
- approved tool-selection process;
- versioned migration location;
- deterministic ordering;
- forward procedure;
- rollback or recovery procedure;
- production execution controls;
- execution audit record.

### Backend Test Governance

Establish automated characterization and regression protection before
behavior or identity changes.

Required outcomes:

- named test owner;
- approved framework-selection process;
- repeatable test command;
- isolated test database;
- deterministic fixtures;
- route and database integration coverage;
- CI execution;
- failure ownership.

### Schema Baseline Governance

Create a versioned, evidence-backed description of production reality.

Required outcomes:

- exact tables and columns;
- constraints and indexes;
- row counts;
- known drift and legacy fields;
- evidence date;
- source and deployment revision;
- comparison process for future changes.

### Deployment Governance

Prove what source is running, where it is running, and who owns release
decisions.

Required outcomes:

- authoritative deployed commit;
- deployment and environment owners;
- database target verification;
- release procedure;
- source-to-deployment parity check;
- monitoring and health checks.

### Rollback Governance

Ensure every future implementation can be stopped or recovered without
guesswork.

Required outcomes:

- rollback owner;
- rollback trigger criteria;
- application rollback procedure;
- database rollback or recovery procedure;
- backup responsibility;
- post-rollback verification;
- incident communication ownership.

## 3. Migration Strategy Evaluation Framework

Phase 5 established that a migration foundation is mandatory. This strategy
does not select a tool.

### Evaluation Criteria

| Criterion | Required evaluation |
| --- | --- |
| Repeatability | Same unapplied migrations produce the same schema from the same baseline |
| Rollback support | Supports explicit rollback or a documented forward-recovery model |
| PostgreSQL compatibility | Correctly handles PostgreSQL transactions, constraints, indexes, and SQL |
| CI compatibility | Can run non-interactively in isolated CI databases |
| Developer usability | Commands and failure states are understandable and reproducible |
| Auditability | Applied migrations, versions, timestamps, and failures can be inspected |
| Existing stack compatibility | Works with the current Node.js, CommonJS, `pg`, and deployment environment |
| Transaction control | Makes transactional and non-transactional operations explicit |
| Environment safety | Clearly identifies target database and prevents accidental production use |
| Drift detection | Can compare expected migration state with actual schema state |
| Failure recovery | Defines behavior for partial or failed execution |
| Dependency stability | Has maintained documentation and predictable versioning |

### Evaluation Process

1. Identify at least two viable strategies.
2. Score each against the same criteria.
3. Run no installation during evaluation.
4. Document operational tradeoffs.
5. Identify migration, database, release, and rollback owners.
6. Select only after ownership and recovery expectations are approved.
7. Authorize installation in a separate implementation phase.

### Required Decision Artifact

The future decision must record:

- selected strategy and version policy;
- rejected alternatives and reasons;
- migration commands;
- production execution boundary;
- rollback model;
- ownership;
- test evidence;
- compatibility constraints.

## 4. Backend Test Harness Evaluation Framework

This strategy does not select or install a test framework.

### Evaluation Criteria

| Criterion | Required evaluation |
| --- | --- |
| Route testing | Can exercise Express routes without requiring a production server |
| Integration testing | Can validate route, authentication, authorization, and database behavior together |
| Database testing | Supports isolated PostgreSQL setup, teardown, and transactions |
| Compatibility characterization | Can preserve current request, response, status, ordering, and error behavior |
| CI support | Runs deterministically and non-interactively |
| Fixture management | Supports sanitized, stable, readable fixtures |
| Async reliability | Handles asynchronous route and database failures correctly |
| Mocking boundaries | Permits focused mocks without replacing database integration evidence |
| Failure diagnostics | Produces useful output without exposing secrets or message content |
| Migration testing | Can validate forward and rollback/recovery behavior |
| Concurrency testing | Can test duplicate commands and transaction races |
| Maintainability | Fits the current JavaScript/CommonJS backend and team workflow |

### Minimum Harness Capabilities

The future harness must support:

- current route characterization;
- JWT authentication cases;
- allowed and denied authorization cases;
- PostgreSQL integration;
- deterministic fixture lifecycle;
- transaction rollback testing;
- migration verification;
- compatibility snapshots or equivalent assertions;
- CI execution.

### Evaluation Sequence

1. Define current routes and behaviors to characterize.
2. Define isolated database requirements.
3. Evaluate candidate harnesses against the same fixtures.
4. Confirm CI and developer execution.
5. Confirm migration-test compatibility.
6. Approve ownership and failure triage.
7. Install only in a separately authorized phase.

## 5. Schema Baseline Implementation Strategy

### Capture Method

The future baseline process should collect read-only production metadata for:

- database and schema version;
- tables and columns;
- data types;
- nullability and defaults;
- primary and unique constraints;
- foreign keys or their absence;
- check constraints or their absence;
- indexes;
- sequences;
- triggers;
- row-level security;
- row counts;
- views;
- known route consumers.

The collection method must avoid copying production record content.

### Baseline Artifacts

The baseline should include:

1. machine-readable schema evidence;
2. human-readable summary;
3. row-count snapshot;
4. known-drift register;
5. route-to-table map;
6. source and deployed revision;
7. evidence date and owner;
8. approval status.

### Known Drift Register

The first baseline must explicitly preserve:

- `posts.mage_url`;
- `posts.image_url`;
- `messages.workflow_type`;
- `messages.workflow_status`;
- `messages.workflow_payload`;
- absence of foreign keys;
- absence of supporting indexes beyond primary keys and `users.email`;
- source-level `workflow_events` table creation;
- production absence of `workflow_events`;
- current `quote_requests` behavior;
- current portfolio role of `contractor_projects`.

### Version Tracking

Each approved baseline version must identify:

- baseline version;
- production environment;
- source commit;
- deployed commit;
- collection timestamp;
- schema checksum or equivalent comparison marker;
- change summary;
- approving owner.

### Future Change Comparison

Every future schema proposal must produce:

- before baseline;
- expected after state;
- migration diff;
- compatibility impact;
- lock and rewrite risk;
- data validation plan;
- rollback/recovery plan;
- post-deployment actual-versus-expected comparison.

Documentation of drift does not authorize correction.

## 6. Deployment Governance Strategy

### Ownership Model

Before foundation implementation, assign:

| Responsibility | Required owner |
| --- | --- |
| Backend source | Repository owner |
| Production environment | Deployment owner |
| Database | Database owner |
| Release approval | Release owner |
| Rollback decision | Rollback owner |
| Migration execution | Migration owner |
| Test sign-off | Test owner |
| Compatibility sign-off | Frontend/API compatibility owner |
| Incident response | Operational owner |

### Release Governance

The future release process must define:

- approved branch and commit;
- build and start commands;
- environment-variable ownership;
- secret handling;
- pre-release test gate;
- migration ordering;
- deployment approval;
- health verification;
- monitoring period;
- rollback trigger.

### Parity Verification

Before any implementation:

1. identify the deployed commit;
2. identify the production database;
3. verify deployed routes against source;
4. compare production schema with baseline;
5. record manual or external drift;
6. stop if parity is unresolved.

### Rollback Governance

Every authorized foundation change must include:

- application rollback path;
- database rollback or forward-recovery path;
- named decision maker;
- backup/restore responsibility;
- partial-deployment recovery;
- post-rollback verification;
- incident record.

## 7. Compatibility Protection Strategy

### API Compatibility

Preserve:

- route paths;
- HTTP methods;
- request field names;
- response field names;
- status-code behavior;
- error shapes;
- IDs;
- ordering and count behavior.

New response fields, if ever authorized, must be additive and safely ignored
by current clients.

### Frontend Compatibility

Foundation work must not change:

- navigation;
- rendering;
- workflow behavior;
- current API expectations;
- current optimistic behavior;
- current message and Quote Request flows.

Compatibility tests must be written before changing backend foundations.

### localStorage Compatibility

Foundation work must not:

- rename keys;
- migrate records;
- alter shapes;
- change read/write ownership;
- replace client-local workflows.

Backend governance work does not grant authority over existing localStorage
behavior.

### Legacy Schema Compatibility

Preserve:

- all current table names;
- all current column names;
- `posts.mage_url`;
- `posts.image_url`;
- message workflow fields;
- current nullability;
- current source IDs;
- `quote_requests` semantics;
- `contractor_projects` portfolio semantics.

### Prohibited Promotions

- `quote_requests.id` to `serviceRequestId`;
- `posts.id` to `serviceRequestId`;
- `contractor_projects.id` to `aggregateId`;
- `messages.workflow_status` to aggregate state;
- message ID to canonical event ID;
- matching generic IDs to typed relationships.

## 8. Runtime Schema Creation Retirement Strategy

The workflow-event route contains request-time:

```sql
CREATE TABLE IF NOT EXISTS workflow_events
```

Schema authority must not remain in request handling.

### Planning Approach

1. Characterize the current route with backend tests.
2. Determine whether production clients call it.
3. Record current success and failure responses.
4. Confirm that `workflow_events` is absent in production.
5. Establish migration and rollback governance.
6. Decide whether the existing table shape remains needed.
7. Plan schema creation through an approved migration only if separately
   authorized.
8. Plan removal of runtime DDL without changing route compatibility.
9. Verify behavior in isolated and staging environments.
10. Define rollback and deployment sequencing.

### Restrictions

This strategy does not:

- modify the route;
- remove runtime DDL;
- create `workflow_events`;
- choose the future event schema;
- declare the route canonical;
- authorize event migration.

## 9. Authorization Foundation Strategy

Authentication identifies a principal. Authorization determines whether that
principal may perform an action in a particular scope.

JWT role alone is insufficient for aggregate authority.

### Required Authorization Model

Every protected future command must resolve:

- **actor:** authenticated identity;
- **role:** authorization-derived role for the action;
- **permission:** permitted operation;
- **scope:** business, tenant, property, relationship, or aggregate boundary;
- **membership:** explicit participant association;
- **ownership:** authoritative owner or assignment relationship.

### Planning Work

1. Inventory current ownership checks.
2. Define canonical actor-role vocabulary.
3. Define permissions by command.
4. Define business and tenant scopes.
5. Define participant membership evidence.
6. Define ownership and assignment evidence.
7. Define denied-action behavior.
8. Define historical role provenance.
9. Define system actor policy.
10. Define audit requirements.

### Authorization Matrix Requirement

The future matrix must address:

- Service Request creation/read;
- aggregate creation/read;
- typed reference attachment;
- scheduling;
- Quote actions;
- Completion submission;
- Closure review and authorization;
- History visibility;
- Relationship visibility;
- recurring parent/cycle/occurrence actions.

No aggregate command may be planned for implementation until this foundation
has an approved owner and test strategy.

## 10. Identity Foundation Readiness Gates

### Before `serviceRequestId`

Required:

- migration governance;
- test governance;
- schema baseline;
- deployment parity;
- canonical intake owner;
- source-reference rules;
- requester authorization;
- duplicate policy;
- idempotency;
- acknowledgement;
- compatibility strategy.

### Before `aggregateId`

Required:

- all Service Request gates;
- approved aggregate creation owner;
- approved aggregate types;
- creation authorization matrix;
- idempotent command contract;
- typed source references;
- conflict behavior;
- audit provenance;
- rollback-tested persistence plan.

### Before `aggregateType`

Required:

- approved type registry;
- type ownership;
- unknown-type behavior;
- conflict behavior;
- correction/replacement policy;
- authorization;
- compatibility impact assessment.

### Before Typed References

Required:

- authoritative source identity;
- authoritative aggregate identity;
- source and aggregate existence validation;
- permitted relationship matrix;
- participant and business scope;
- link idempotency;
- conflict handling;
- acknowledgement;
- supersession/unlink policy;
- audit trail.

### Gate Rule

Failure of any prerequisite blocks the corresponding identity capability.
Readiness in one area does not waive another gate.

## 11. Foundation Implementation Sequence

```text
Foundation governance
  -> Schema baseline
  -> Deployment parity
  -> Backend test harness
  -> Migration framework
  -> Compatibility validation
  -> Service Request planning
  -> Operational Aggregate planning
```

### Step 1: Foundation Governance

Assign owners and approve:

- tool evaluation;
- testing;
- migrations;
- deployment;
- rollback;
- compatibility;
- authorization.

### Step 2: Schema Baseline

Capture and approve production reality without changing it.

### Step 3: Deployment Parity

Prove the deployed source, environment, and database.

### Step 4: Backend Test Harness

In a later implementation-authorized phase, add characterization and
integration testing before modifying behavior.

### Step 5: Migration Framework

In a later implementation-authorized phase, introduce repeatable forward and
recovery governance without domain schema changes.

### Step 6: Compatibility Validation

Prove current routes, schemas, IDs, frontend behavior, and localStorage
workflows remain unchanged.

### Step 7: Service Request Planning

Only after every foundation gate passes.

### Step 8: Operational Aggregate Planning

Only after the Service Request strategy and foundation are approved.

No step may be skipped because later steps depend on evidence produced by
earlier ones.

## 12. Stop Conditions

Foundation implementation remains blocked if:

- migration governance is unresolved;
- migration ownership is unresolved;
- test governance is unresolved;
- backend tests cannot run;
- isolated test database ownership is unresolved;
- deployment parity is unresolved;
- authoritative deployed commit is unknown;
- production database target is unknown;
- rollback ownership is unresolved;
- rollback or recovery cannot be demonstrated;
- schema baseline is missing or stale;
- compatibility impact is unclear;
- API consumers are unknown;
- authorization ownership is unresolved;
- implementation would change current frontend behavior;
- implementation would alter localStorage;
- implementation would rename or delete legacy schema;
- implementation would repurpose legacy IDs;
- implementation would require destructive backfill;
- runtime schema creation would remain ungoverned;
- production data or secrets would be exposed.

When a condition is triggered:

1. stop implementation planning for the affected area;
2. document the unresolved evidence or owner;
3. preserve current behavior;
4. do not infer a workaround;
5. require explicit resolution before proceeding.

## 13. Final Recommendation

This Backend Foundation Implementation Strategy is the final planning gate
before separately authorized foundation implementation work.

The strategy defines:

- governance objectives;
- migration and test evaluation criteria;
- schema baseline process;
- deployment and rollback ownership;
- compatibility protections;
- runtime schema creation retirement planning;
- authorization foundations;
- identity readiness gates;
- implementation sequence;
- stop conditions.

It does not authorize implementation.

The next decision should be whether to authorize a narrowly scoped backend
foundation implementation phase for:

- test harness introduction;
- migration governance introduction;
- schema baseline verification;
- deployment parity verification;
- rollback-process validation;
- compatibility characterization.

That future phase must still exclude canonical identity and domain
implementation.

### Final Status

```text
Backend foundation implementation strategy: COMPLETE
Foundation implementation authorization: PENDING
Canonical Service Request identity: BLOCKED
Operational Aggregate identity: BLOCKED
Operational Aggregate implementation: BLOCKED
Runtime adoption: BLOCKED
```

Canonical identity remains blocked.

Operational Aggregate implementation remains blocked.

Runtime adoption remains blocked.
