# Backend Foundation Phase 3 - Migration Governance and Recovery Strategy

## Status

- Planning only
- No migration framework selected or installed
- No migration files or SQL execution
- No schema, route, API, frontend, or runtime changes
- Canonical identity and aggregate implementation remain blocked

## 1. Executive Summary

Meetro has a functioning production PostgreSQL schema and a documented
`SCHEMA_BASELINE_V1.md`.

Current governance evidence remains incomplete:

- deployment parity is partial;
- ownership verification is partial;
- no migration framework exists;
- no migration directory exists;
- no migration history exists;
- no rollback history or procedure exists;
- no migration, database, release, or rollback owner is identified.

The current backend also contains request-time schema behavior for
`workflow_events`, while the inspected production database does not contain
that table.

Migration governance must exist before any schema evolution, identity
implementation, Operational Aggregate implementation, Completion authority,
Closure authority, Relationship authority, RecurringService authority, or
runtime adoption.

This phase defines governance, review levels, lifecycle, ownership,
compatibility protection, production safety, and recovery requirements.

It does not authorize migration tooling or schema work.

## 2. Current Migration Reality

| Evidence area | Current reality |
| --- | --- |
| Migration framework | None found |
| Migration directory | None found |
| Migration files | None found |
| Migration history | None found |
| Rollback history | None found |
| Forward procedure | Not documented |
| Rollback procedure | Not documented |
| Recovery procedure | Not documented |
| Migration owner | Unidentified |
| Database owner | Unidentified |
| Release owner | Unidentified |
| Rollback owner | Unidentified |
| Authoritative deployed commit | Unknown |
| Schema baseline | `SCHEMA_BASELINE_V1.md`, classified Partial |
| Runtime DDL | `workflow_events` route attempts `CREATE TABLE IF NOT EXISTS` |

The collected evidence indicates schema is currently managed without a
versioned migration framework. The exact history of manual or runtime schema
changes is not available.

No assumptions are made about who performed prior changes or which procedures
were used.

## 3. Migration Governance Principles

1. Schema changes require explicit ownership.
2. Schema changes require documented review.
3. Schema changes require approval before execution.
4. Schema changes require a verified baseline.
5. Schema changes require compatibility review.
6. Schema changes require test evidence.
7. Schema changes require execution evidence.
8. Schema changes require post-execution verification.
9. Schema changes require rollback or forward-recovery planning.
10. Schema changes require target-environment identification.
11. Schema authority must not live in request handling.
12. Production SQL must not be improvised.
13. Applied migration history must be durable and inspectable.
14. Unknown drift must stop implementation.
15. Legacy IDs and fields must not be repurposed through migration.
16. Documentation of a defect does not authorize correction.
17. Additive does not automatically mean low risk.
18. Small row counts do not remove recovery requirements.
19. Identity changes are High Risk even when structurally additive.
20. Recovery ownership must exist before production execution.

## 4. Migration Lifecycle

Future governed schema work must follow:

```text
Proposal
  -> Review
  -> Approval
  -> Preparation
  -> Execution
  -> Verification
  -> Monitoring
  -> Recovery, if required
```

### Proposal

Record:

- purpose;
- current baseline;
- proposed outcome;
- affected tables, routes, clients, and data;
- migration classification;
- compatibility impact;
- risk;
- owner;
- evidence.

### Review

Review:

- schema accuracy;
- deployment parity;
- route and frontend compatibility;
- data volume;
- locks and table rewrites;
- authorization and identity impact;
- rollback or recovery feasibility;
- test evidence.

### Approval

Required approvals depend on migration classification. Approval must identify:

- authorized change;
- target environment;
- execution owner;
- release owner;
- rollback/recovery owner;
- maintenance constraints;
- stop conditions.

### Preparation

Prepare:

- reviewed migration artifact;
- test and staging evidence;
- backup or recovery readiness;
- deployment sequence;
- verification queries;
- monitoring;
- rollback or forward-recovery artifact;
- communication plan.

### Execution

Execution must:

- target the verified environment;
- use approved tooling and artifact;
- record start and completion;
- prevent concurrent unowned changes;
- stop on unexpected drift or failure;
- preserve execution logs without secrets.

### Verification

Verify:

- migration status;
- expected schema;
- constraints and indexes;
- row counts and data invariants;
- route compatibility;
- frontend compatibility;
- health checks;
- absence of unexpected drift.

### Monitoring

Monitor:

- route errors;
- database errors;
- latency;
- lock behavior;
- connection behavior;
- compatibility failures;
- data integrity signals.

### Recovery

If required:

- invoke the approved rollback or forward-recovery plan;
- preserve evidence;
- verify restored or corrected state;
- record the incident;
- update governance artifacts.

This lifecycle is a future requirement only.

## 5. Migration Classification

### Governance Changes

Examples:

- schema baseline updates;
- migration documentation;
- ownership records;
- evidence and parity updates.

Required review:

- document owner;
- affected governance owner;
- evidence verification.

No production schema execution is involved.

### Compatibility Changes

Examples:

- additive nullable fields;
- additive response-supporting schema;
- non-authoritative metadata storage;
- changes intended to preserve old clients.

Required review:

- migration owner;
- database owner;
- compatibility owner;
- test owner;
- release owner;
- rollback/recovery owner;
- baseline and parity verification;
- integration and compatibility evidence.

Additive changes must still be reviewed for lock, default, index, and client
behavior.

### Structural Changes

Examples:

- new tables;
- new columns;
- indexes;
- foreign keys;
- check constraints;
- unique constraints;
- triggers;
- sequences.

Required review:

- all Compatibility reviewers;
- architecture/domain owner;
- data-integrity review;
- performance and lock review;
- staging evidence;
- recovery evidence;
- explicit production approval.

### High-Risk Changes

Examples:

- renames;
- drops;
- type changes;
- data movement;
- backfills;
- identity changes;
- authority changes;
- consolidation of legacy fields;
- repurposing tables or IDs;
- destructive constraint enforcement.

Required review:

- all Structural reviewers;
- product and architecture approval;
- explicit data migration plan;
- compatibility-window plan;
- rehearsal;
- backup/restore proof;
- incident and rollback plan;
- elevated production approval.

High-Risk changes remain blocked until separately authorized.

## 6. Schema Baseline Dependency

No migration planning may proceed without:

- an approved schema baseline;
- documented drift;
- known production inventory;
- known compatibility surface;
- evidence date;
- reviewed source revision;
- verified target environment.

Phase 1 artifacts provide the current starting point:

- `RuntimeEvidence/SCHEMA_BASELINE_V1.md`;
- `RuntimeEvidence/DEPLOYMENT_PARITY_REPORT_V1.md`;
- `RuntimeEvidence/OWNERSHIP_MATRIX_V1.md`;
- `BACKEND_FOUNDATION_PHASE_1_SUMMARY.md`.

### Current Baseline Limits

`SCHEMA_BASELINE_V1.md` is Partial because a complete machine-readable catalog
was not preserved.

Before migration implementation, the baseline must be sufficient to compare:

- every affected column;
- data type;
- nullability;
- default;
- constraint;
- index;
- sequence;
- trigger;
- view;
- row-security policy;
- row count and compatibility assumption.

If affected schema detail is unavailable, planning stops.

## 7. Compatibility Protection Requirements

Future migrations must preserve:

- route paths;
- HTTP methods;
- request fields;
- response fields;
- status codes;
- error shapes;
- current IDs;
- current frontend expectations;
- current localStorage expectations;
- current ordering and empty-result behavior;
- `quote_requests` behavior;
- `contractor_projects` portfolio behavior;
- message workflow fields;
- `posts.mage_url`;
- `posts.image_url`;
- nullable and optional legacy behavior.

### Explicit Prohibitions

Future migration activity must not:

- rename `quote_requests` to `service_requests`;
- promote `quote_requests.id` into `serviceRequestId`;
- promote `posts.id` into `serviceRequestId`;
- promote `contractor_projects.id` into `aggregateId`;
- treat `messages.workflow_status` as aggregate lifecycle state;
- delete or rename `posts.mage_url`;
- merge `mage_url` and `image_url` without separate approval;
- remove message workflow fields;
- change API response shapes through schema activity;
- backfill canonical identity from legacy IDs;
- infer foreign-key relationships from matching values;
- redefine domain authority through table naming.

Compatibility must be tested before and after every future schema change.

## 8. Recovery and Rollback Requirements

### Rollback

Rollback returns the system toward the prior application or schema state using
an approved reverse operation or restoration procedure.

Rollback may be appropriate when:

- the reverse operation is safe;
- no irreversible data transformation occurred;
- prior clients remain compatible;
- the rollback is tested;
- ownership and verification are clear.

### Forward Recovery

Forward recovery restores safe operation through a new corrective change
without reversing an already-applied migration.

Forward recovery may be appropriate when:

- reversal would lose data;
- a migration is not transactionally reversible;
- old schema and new writes cannot safely coexist;
- restoration from backup is riskier;
- a corrective additive change is safer.

This strategy does not choose rollback or forward recovery globally.

### Required Ownership

Every migration proposal must identify:

- rollback owner;
- recovery owner;
- verification owner;
- release owner;
- migration execution owner.

### Required Evidence

- rollback or recovery artifact;
- test execution evidence;
- staging evidence;
- expected duration;
- data-loss assessment;
- compatibility impact;
- stop trigger;
- approval record;
- post-recovery verification.

### Approval

Production execution is blocked until rollback or forward-recovery approval is
documented.

## 9. Production Safety Requirements

Every future schema change must define:

- exact target environment;
- exact database identity;
- execution location;
- execution command;
- approved artifact version;
- migration owner;
- database owner;
- release owner;
- rollback/recovery owner;
- release approval;
- maintenance or timing constraints;
- pre-execution backup/recovery readiness;
- verification procedure;
- monitoring procedure;
- recovery procedure;
- source-to-deployment parity evidence.

### Required Safety Checks

- confirm the target is not ambiguous;
- confirm the production database matches the baseline;
- stop on unapproved drift;
- confirm current deployed commit;
- confirm approved client compatibility;
- prevent test tooling from targeting production;
- preserve secrets;
- preserve execution logs;
- prevent concurrent untracked schema changes.

No production schema work may depend on manual memory or undocumented console
commands.

## 10. Ownership Requirements

No people are assigned by this strategy. Unknown remains unknown.

| Role | Current status | Required responsibility |
| --- | --- | --- |
| Migration owner | `UNIDENTIFIED` | Own proposal, artifact, lifecycle, execution record, and migration history |
| Database owner | `UNIDENTIFIED` | Approve target, integrity, performance, backup, and recovery readiness |
| Release owner | `UNIDENTIFIED` | Approve deployment sequence and production release |
| Rollback owner | `UNIDENTIFIED` | Decide and coordinate rollback |
| Recovery owner | `UNIDENTIFIED` | Own forward recovery when rollback is unsafe |
| Verification owner | `UNIDENTIFIED` | Validate schema, compatibility, health, and completion |
| Compatibility owner | `UNIDENTIFIED` | Approve API, frontend, localStorage, and legacy behavior protection |
| Test owner | `UNIDENTIFIED` | Approve required characterization and migration evidence |

Migration implementation cannot begin until the required owners for the
specific change are identified.

## 11. Runtime Schema Creation Governance

Reviewed backend source attempts:

```sql
CREATE TABLE IF NOT EXISTS workflow_events
```

inside workflow-event request handling.

### Governance Findings

- Request handling is not schema governance.
- Runtime DDL is not migration governance.
- Runtime DDL has no version history in the collected evidence.
- Runtime DDL has no identified migration or rollback owner.
- The production table inventory does not contain `workflow_events`.
- Current behavior has not yet been characterized by automated tests.

### Future Governance Requirement

Future schema authority must be migration-owned.

Before any later change:

- characterize the current route;
- verify whether it is called;
- record response and failure behavior;
- establish test coverage;
- establish migration and recovery ownership;
- preserve route compatibility;
- obtain separate implementation authorization.

No code changes, route changes, table creation, or retirement plan
implementation are authorized in Phase 3.

## 12. Migration Readiness Gates

Before any future schema change:

- schema baseline is approved and sufficiently detailed;
- production drift is documented;
- deployment parity is verified;
- target database is identified;
- test governance is approved;
- required tests can run;
- migration owner is identified;
- database owner is identified;
- release owner is identified;
- rollback/recovery owner is identified;
- compatibility owner is identified;
- recovery path is defined and evidenced;
- compatibility impact is understood;
- migration classification and review level are approved;
- production verification is defined;
- monitoring is defined.

Every gate is mandatory for the affected change.

## 13. Stop Conditions

Migration planning or implementation must stop if:

- schema baseline is missing or insufficient;
- deployment parity is unknown;
- target database is unclear;
- database owner is unidentified;
- migration owner is unidentified;
- release owner is unidentified;
- rollback or recovery owner is unidentified;
- verification owner is unidentified;
- compatibility impact is unknown;
- recovery path is undefined;
- expected behavior would be invented;
- route or frontend expectations are unknown;
- test evidence cannot be produced;
- production drift is unexplained;
- execution would require unreviewed manual SQL;
- production secrets or customer data would be exposed;
- legacy IDs would be repurposed;
- destructive backfill would be required without separate approval.

When stopped:

1. record the blocker;
2. preserve the current schema and behavior;
3. do not improvise SQL or ownership;
4. do not weaken compatibility requirements;
5. require explicit resolution.

## 14. Explicit Non-Goals

Phase 3 does not:

- select migration tooling;
- install migration tooling;
- add dependencies;
- create a migration directory;
- create migrations;
- create SQL files;
- execute SQL;
- alter schema;
- create tables;
- create columns;
- create indexes;
- create constraints;
- add foreign keys;
- backfill data;
- correct drift;
- remove runtime DDL;
- modify routes;
- modify APIs;
- modify frontend behavior;
- modify localStorage;
- implement Service Request identity;
- implement Operational Aggregate identity;
- implement typed references;
- implement Completion, Closure, History, Relationship, or RecurringService
  authority;
- change runtime behavior.

## 15. Final Classification

```text
Migration Governance Planning: COMPLETE
Migration Framework Selection: NOT AUTHORIZED
Migration Implementation: NOT AUTHORIZED
SQL Execution: NONE
Schema Changes: BLOCKED
Canonical Service Request Identity: BLOCKED
Operational Aggregate Identity: BLOCKED
Runtime Adoption: BLOCKED
```

Migration lifecycle, classifications, review levels, baseline dependencies,
compatibility protections, recovery requirements, ownership, production
safety, readiness gates, and stop conditions are defined.

Implementation remains unauthorized because deployment parity and ownership
are partial, no migration framework exists, and the test harness has not been
implemented.

## 16. Recommended Next Phase

Proceed to:

**MEETRO BACKEND FOUNDATION IMPLEMENTATION PHASE 4 - COMPATIBILITY VALIDATION
AND CHANGE SAFETY STRATEGY**

Phase 4 should remain planning-only and define how future backend evolution
preserves:

- API compatibility;
- frontend compatibility;
- localStorage compatibility;
- legacy schema compatibility;
- identity compatibility;
- route and response behavior;
- rollback-sensitive behavior.

Phase 4 must not:

- install tools or dependencies;
- create tests;
- create migrations;
- modify schema;
- modify routes or APIs;
- change frontend or localStorage behavior;
- implement identity or aggregate authority;
- change runtime behavior.
