# Backend Foundation Implementation Phase D: Test Harness and Migration Framework Adoption Plan

## Status

- Implementation planning only
- No dependency installation
- No code, tests, migrations, schema, SQL, routes, APIs, frontend, or runtime changes
- No identity or Operational Aggregate work
- Implementation requires a separate Phase E authorization decision

## 1. Executive Summary

Phase C recommended the following backend foundation stack:

- Node native test runner (`node:test`);
- optional Supertest for in-process Express HTTP characterization;
- Docker-managed PostgreSQL;
- a uniquely named temporary database per test run;
- deterministic sanitized fixtures;
- `node-pg-migrate`.

This document defines the exact sequence for adopting that stack without changing backend runtime behavior.

Material blockers remain:

- the authoritative deployed commit is unidentified;
- source-to-deployment parity has not passed;
- the authoritative production surface is not designated;
- deployment, database, release, rollback, migration, test, compatibility, CI, test-database, recovery, and verification owners remain unidentified;
- the production Node and PostgreSQL versions are not preserved;
- the schema baseline is Partial;
- the backend has no isolated test environment;
- server creation, route registration, database access, and listener startup are colocated in `index.js`.

Implementation remains unauthorized. Phase E must decide which test-only foundation steps may execute first and which must remain blocked.

Canonical Service Request identity, Operational Aggregate identity, schema evolution, and runtime adoption remain blocked.

## 2. Adoption Objectives

### Test Harness Introduction

Establish a minimal CommonJS-compatible test harness that:

- runs with `node:test`;
- reports deterministic success and failure;
- can characterize pure behavior before database integration;
- can later test Express routes without using a deployed environment;
- never imports test configuration into production startup;
- preserves all existing routes and responses.

### Isolated Database Introduction

Establish a disposable PostgreSQL environment that:

- is physically and credential-isolated from production;
- uses a pinned PostgreSQL image;
- creates a uniquely named database for each run;
- reproduces only the approved legacy baseline;
- supports runtime-DDL characterization safely;
- cleans up after success, failure, and interruption.

### Fixture Introduction

Establish sanitized fixtures that:

- contain no production records or customer content;
- represent current legacy table and field behavior;
- are deterministic and minimal;
- preserve known drift and missing constraints;
- do not define future identity or domain authority.

### Migration Infrastructure Introduction

Establish `node-pg-migrate` as governed migration infrastructure that:

- records ordered migration history;
- targets only explicitly approved non-production databases during initial adoption;
- supports reviewable forward and recovery operations;
- does not create domain tables or canonical identity;
- does not retire runtime DDL until separately characterized and authorized.

## 3. Node Version Verification Plan

### Evidence Collection

Before any test-harness change, record:

1. the Node version declared or implied by `package.json`;
2. any lockfile version requirements;
3. the local developer Node version;
4. the CI Node version, if CI exists;
5. the Railway runtime Node version;
6. the Vercel runtime Node version;
7. the version used by the authoritative deployment after that environment is identified.

Commands and platform screens used for evidence collection must be read-only. Version evidence should include the collection date and source.

### Selection Rule

Select a supported Node LTS release that:

- supports stable `node:test`;
- supports the current CommonJS backend;
- supports Express `5.2.1`, `pg 8.20.0`, bcrypt, JWT, and the selected migration tooling;
- can be reproduced locally and in CI;
- does not require an application behavior change.

This plan does not select a numeric Node version because production runtime evidence is missing.

### Pinning Strategy

After Phase E authorization, the implementation plan should consider a consistent set of version declarations:

- `package.json` `engines.node`;
- one developer-version file, such as `.nvmrc` or `.node-version`;
- an explicit CI Node version;
- an explicit deployment runtime version where the platform supports it.

Only the minimum required mechanisms should be adopted. Multiple conflicting version files must not be introduced.

### Local Expectations

- developers use the pinned Node version;
- version mismatch produces a clear warning or failure before tests;
- `node:test` behavior is consistent with CI;
- no global test framework is required.

### CI Expectations

- CI uses the same pinned major and minor policy;
- CI records the Node version in test output;
- unsupported versions fail before database setup;
- CI does not silently select the latest Node release.

### Verification Gate

Node pinning cannot be authorized until its effect on the currently deployed startup model is understood. A local/test-only version declaration must not accidentally change deployment behavior.

## 4. PostgreSQL Version Verification Plan

### Production Version Evidence

Obtain a read-only production result equivalent to:

```sql
SHOW server_version;
```

The evidence must record:

- PostgreSQL full version;
- major version;
- collection date;
- environment identifier;
- whether the inspected database is the authoritative production target.

No version query should be run until database access and evidence collection are authorized by the accountable Database Owner.

### Local Version Strategy

The local and CI PostgreSQL major version should match production unless a documented compatibility reason requires otherwise. Patch versions may differ only within an approved support policy.

### Docker Image Pinning

Use an explicit image version, not:

```text
postgres:latest
```

The future image policy should pin:

- PostgreSQL major version at minimum;
- preferably a reviewed minor or patch tag where operationally practical;
- image update ownership and review cadence.

The image must use test-only credentials and must not contain production data.

### Version Drift Gate

Implementation stops if:

- the production PostgreSQL version is unknown;
- local and CI versions cannot be aligned;
- the image architecture is unsupported in CI;
- extensions required by production are unknown;
- baseline behavior differs across selected versions.

## 5. Test Harness Adoption Sequence

No step below is authorized by this document.

### Step 1: Capture Pre-Change Behavior

Before modifying package scripts or startup structure:

- record the current `package.json` scripts;
- record the current startup command;
- record the current health response;
- inventory routes and registration order;
- record environment variables by key only, never values;
- record current database pool creation and listener startup behavior.

### Step 2: Create the Test Structure

Future authorized implementation creates:

```text
test/
  fixtures/
  helpers/
  integration/
  characterization/
```

The initial change should create only the directories and smallest required support files.

### Step 3: Introduce `node:test`

Add a test command using the Node native runner. Requirements:

- CommonJS test files unless a separately approved module change occurs;
- deterministic test discovery;
- non-zero exit on failure;
- no production endpoint calls;
- no database requirement for the first smoke test;
- no changes to the existing start command.

### Step 4: Add Foundation Smoke Characterization

The first tests should characterize low-risk facts:

- test runner starts and exits correctly;
- required test environment guards load;
- production-looking database URLs are rejected;
- fixture sanitization helpers reject prohibited values;
- application health response can be characterized only after safe app construction is available.

These tests must not define new product behavior.

### Step 5: Add Database-Backed Characterization

Only after D2:

- verify test database connectivity;
- verify baseline table creation;
- verify setup and teardown;
- characterize current constraints, defaults, ordering, and errors;
- characterize request-time `workflow_events` DDL in isolation.

### Step 6: Add Compatibility Characterization

Only after Express startup separation and optional HTTP tooling decisions:

- characterize routes;
- preserve request and response shapes;
- preserve status and error behavior;
- record existing authorization gaps without correcting them.

### Verification After Each Step

- test command passes locally;
- no production host was contacted;
- current start command remains intact;
- package-lock changes, if later authorized, are limited to approved dependencies;
- no route or response behavior changes;
- cleanup completes.

## 6. Supertest Evaluation Plan

### `node:test` Alone Is Sufficient For

- pure helper tests;
- environment guard tests;
- fixture validation;
- database lifecycle helpers;
- direct PostgreSQL integration tests;
- migration command wrappers;
- schema comparison helpers;
- deterministic utility behavior.

### Supertest Is Needed When

- Express routes must be characterized in process;
- exact status codes, headers, and response bodies must be asserted;
- authentication middleware must be exercised through HTTP semantics;
- route registration order must be tested;
- tests should avoid binding a public network port.

### Evaluation Criteria

- compatibility with Express `5.2.1`;
- CommonJS support;
- no requirement for a live deployed server;
- ability to test the exported Express app;
- package maintenance and security status;
- CI compatibility;
- effect on dependency and lockfile surface.

### Decision Gate

Recommend Supertest only if route characterization cannot be performed cleanly with Node's HTTP facilities at an acceptable maintenance cost.

Supertest adoption requires:

- separate dependency approval;
- an identified Test Owner;
- successful Express startup separation;
- lockfile review;
- confirmation that production code does not import Supertest.

## 7. Express Startup Separation Plan

### Current Constraint

The documented backend places application construction, routes, database access, and listener startup in `index.js`.

### Future Target Shape

The minimum future separation should conceptually provide:

```text
app construction and route registration
        |
        +--> exported app for in-process tests
        |
        +--> listener startup for normal runtime
```

Possible file boundaries must be selected during implementation review. This plan does not prescribe filenames or create a broader controller/service refactor.

### Required Invariants

- same route paths;
- same registration order;
- same middleware order;
- same request parsing;
- same CORS behavior;
- same authentication behavior;
- same database queries;
- same status codes;
- same response shapes;
- same startup defaults;
- same environment-variable behavior;
- same listener behavior in production.

### Adoption Sequence

1. characterize current startup and health behavior;
2. identify side effects that occur during module import;
3. define an app-construction boundary;
4. keep listener startup in the existing runtime entry path;
5. export the app only for test consumption;
6. verify direct startup remains unchanged;
7. verify route inventory and response parity.

### Stop Condition

Stop if separating app construction changes startup timing, pool creation, middleware order, route behavior, error handling, or deployment startup expectations.

## 8. Isolated Database Adoption Plan

### Container Lifecycle

Future authorized implementation should:

1. verify Docker availability;
2. use an explicitly pinned PostgreSQL image;
3. create a test-only container or CI service;
4. use non-production credentials;
5. expose only the required local/CI port;
6. wait for a verified readiness check;
7. run tests;
8. remove the container and volumes according to the selected lifecycle.

### Temporary Database Naming

Each run should create a database name using a test-only prefix and unique suffix, for example:

```text
meetro_test_<run_identifier>
```

The identifier may include:

- timestamp;
- CI run ID;
- process ID;
- sanitized random suffix.

The name must match an allowlist pattern before any test SQL runs.

### Database Roles

Use separate roles:

- an administrative test role allowed to create and drop temporary test databases;
- an application test role limited to the run database.

Production credentials must never be accepted by test tooling.

### Schema Setup

Initial schema setup must reproduce the approved legacy baseline without improvements:

- preserve `mage_url` and `image_url`;
- preserve message workflow fields;
- preserve current known constraints;
- do not add foreign keys, indexes, checks, or canonical domains;
- document any baseline detail that cannot be reproduced.

### Cleanup

- close all application pools;
- terminate only connections to the uniquely named test database;
- drop that database;
- remove temporary files and secrets;
- report orphaned databases;
- fail CI if cleanup is incomplete.

### Safety Guards

Before any SQL:

- require `NODE_ENV=test`;
- require an explicit test confirmation variable;
- parse the database URL;
- reject known production hosts;
- reject non-test database names;
- reject production usernames or credentials where known;
- require local/CI network scope;
- print only sanitized target metadata;
- never fall back to the normal application `DATABASE_URL`.

## 9. Fixture Adoption Plan

### Proposed Structure

```text
test/fixtures/
  users
  contractorProfiles
  posts
  quoteRequests
  messages
  contractorProjects
  reviews
```

The final file extensions and module boundaries should match the selected CommonJS test style.

### Fixture Layers

1. **Value builders:** produce sanitized deterministic field values.
2. **Record builders:** produce current table-shaped records.
3. **Seed helpers:** insert records through explicit SQL into the isolated test database.
4. **Scenario fixtures:** compose only the records needed for a characterization case.

### Sanitization Rules

- reserved email domains such as `example.test`;
- no real names, phone numbers, addresses, messages, tokens, or passwords;
- neutral message placeholders;
- test-only JWT secrets;
- no production IDs unless represented as obviously synthetic compatibility values;
- no copied production JSON payloads;
- no secrets in snapshots or failure logs.

### Seed Strategy

- seed only after baseline setup;
- seed in dependency order required by current behavior, not inferred future foreign keys;
- return inserted IDs explicitly;
- keep tests independent;
- provide empty-table scenarios;
- avoid a global fixture dataset that hides dependencies;
- clean through database disposal rather than complex reverse deletes.

### Fixture Ownership

Implementation requires an identified Fixture Owner or an explicitly accepted fixture responsibility under the Test Owner. The owner approves sanitization, baseline compatibility, and fixture changes.

## 10. Migration Infrastructure Adoption Plan

### Adoption Boundary

Initial `node-pg-migrate` adoption introduces migration governance infrastructure only. It must not alter application-domain schema.

### Future Introduction Steps

1. verify Node and PostgreSQL compatibility;
2. identify Migration, Database, Release, Rollback, Recovery, Verification, Test, and Compatibility owners;
3. separately approve the dependency and exact version;
4. add `node-pg-migrate` as a development dependency;
5. create a migration configuration that requires an explicit migration database URL;
6. create a dedicated migration directory;
7. define naming and timestamp/order rules;
8. define migration-table name and location;
9. define status, up, down, and dry-review commands;
10. add production-target guards;
11. validate only against an isolated test database;
12. document execution and evidence retention;
13. verify no application runtime imports migration tooling.

### Proposed Directory Intent

```text
migrations/
```

The directory initially remains empty unless a separately authorized governance bootstrap migration is proven necessary. No domain migration should be created merely to demonstrate the tool.

### Migration Ownership

Every future migration must identify:

- author/responsible executor;
- Migration Owner;
- Database Owner;
- Test Owner;
- Compatibility Owner;
- Release Owner;
- Rollback or Recovery Owner;
- Verification Owner.

### Execution Restrictions

- no migration runs through an HTTP route;
- no migration runs automatically during application startup;
- no production migration from a developer laptop without explicit procedure and authorization;
- no ambiguous default database URL;
- no migration against production during framework adoption;
- no creation of Service Request or Operational Aggregate identity;
- no retirement of request-time `workflow_events` DDL during initial adoption;
- no baseline correction disguised as framework setup.

### Baseline Strategy Decision Required

Phase E or a later dedicated planning phase must choose how existing production schema becomes governed without replaying destructive creation logic. Options to evaluate include:

- a documented baseline marker;
- an initial no-op/baseline migration recognized as already represented;
- a carefully verified legacy-schema baseline migration used only for empty test databases.

The production and empty-test-database paths may require different procedures. No option is selected here.

## 11. Safety Guard Requirements

Future implementation must enforce defense in depth.

### Connection Guards

- explicit test or migration environment;
- explicit target URL, never silent fallback;
- parsed host, port, database, and username checks;
- test database naming allowlist;
- protected production host denylist;
- sanitized target logging;
- refusal when target metadata is incomplete.

### Credential Guards

- no production secrets in local files, fixtures, CI logs, or test output;
- separate test credentials;
- separate migration credentials;
- least privilege;
- no credential reuse between test and production.

### Execution Guards

- tests cannot call public production URLs;
- migration commands cannot run as part of `npm start`;
- migration status and execution commands are distinct;
- production execution requires an explicit environment confirmation;
- destructive or down operations require elevated explicit approval;
- lockfile changes require review;
- SQL errors stop execution.

### Schema Guards

- compare the target schema to the approved baseline;
- stop on unexplained drift;
- preserve execution evidence;
- prohibit domain schema during foundation adoption;
- prohibit runtime DDL modification until characterization exists.

### Cleanup Guards

- close pools;
- remove temporary databases;
- report orphaned resources;
- preserve failure diagnostics without secrets;
- never clean a target that fails the test-name allowlist.

## 12. Compatibility Preservation Requirements

The future implementation must preserve:

- all route paths and HTTP methods;
- request field names and accepted shapes;
- response field names and shapes;
- status codes;
- error shapes;
- ordering and empty-result behavior;
- current IDs and nullability;
- authentication behavior;
- current startup behavior;
- `posts.mage_url`;
- `posts.image_url`;
- `messages.workflow_type`;
- `messages.workflow_status`;
- `messages.workflow_payload`;
- `quote_requests` behavior and identity;
- `contractor_projects` portfolio behavior and identity;
- current message request-keying;
- current frontend-consumed fields;
- current runtime `workflow_events` behavior until separately authorized.

Test and migration foundation work must not:

- rename or consolidate legacy fields;
- add constraints to make fixtures cleaner;
- correct authorization gaps;
- promote a compatibility ID to canonical identity;
- infer relationships from matching values;
- alter route registration;
- normalize response errors;
- change localStorage expectations;
- introduce Service Request, aggregate, Completion, Closure, Relationship, or RecurringService authority.

Compatibility evidence should include pre-change and post-change route, schema, startup, and package-script comparisons.

## 13. Implementation Phases

### Phase D1: Test Harness Introduction

**Scope**

- verify Node version;
- create test directory structure;
- introduce `node:test`;
- introduce test scripts;
- add production-target guard tests;
- add no-database smoke characterization.

**Preconditions**

- Phase E authorization;
- Test Owner and Verification Owner identified;
- current package/startup behavior recorded;
- selected Node version approved.

**Exit criteria**

- test command is deterministic;
- production start command is unchanged;
- no production target is contacted;
- no route or schema behavior changes.

### Phase D2: Isolated Database Introduction

**Scope**

- verify PostgreSQL version;
- pin Docker image;
- define container lifecycle;
- create temporary databases;
- implement connection and cleanup guards;
- reproduce the approved legacy baseline.

**Preconditions**

- Test Database Owner and Database Owner identified;
- Docker availability confirmed;
- production version evidence available;
- baseline detail sufficient for test reproduction.

**Exit criteria**

- local test database is disposable;
- CI strategy is documented or demonstrated in an approved environment;
- production URL rejection is proven;
- cleanup is reliable.

### Phase D3: Fixture Introduction

**Scope**

- add sanitized fixture builders;
- add seed helpers;
- add representative legacy scenarios;
- document fixture provenance.

**Preconditions**

- D2 complete;
- Fixture/Test Owner identified;
- sanitization policy approved.

**Exit criteria**

- required fixture families exist;
- no production data is present;
- fixtures are deterministic;
- scenario dependencies are explicit.

### Phase D4: Migration Infrastructure Introduction

**Scope**

- approve and install `node-pg-migrate`;
- add migration configuration and commands;
- create migration directory;
- add target and execution guards;
- verify migration history behavior in a test database.

**Preconditions**

- D1 through D3 complete;
- deployment parity sufficient for adoption planning;
- Migration, Database, Release, Rollback/Recovery, Test, Compatibility, and Verification owners identified;
- baseline strategy approved;
- framework version approved.

**Exit criteria**

- migration status is inspectable in test only;
- no domain migration exists;
- no production schema changes occur;
- recovery behavior is documented and tested in isolation;
- runtime does not execute migrations.

### Phase D5: Compatibility Characterization

**Scope**

- evaluate and optionally adopt Supertest;
- separate app construction from listener startup if authorized;
- characterize routes and responses;
- characterize database behavior;
- characterize runtime `workflow_events` DDL;
- record compatibility baseline.

**Preconditions**

- D1 through D3 complete;
- Supertest decision approved;
- startup separation plan approved;
- Compatibility Owner identified.

**Exit criteria**

- routes, requests, responses, statuses, ordering, errors, legacy fields, and current gaps are characterized;
- production startup behavior is unchanged;
- no runtime DDL retirement occurs;
- foundation readiness can be reviewed before schema work.

### Phase Dependency

```text
D1 Test Harness
        |
D2 Isolated Database
        |
D3 Fixtures
        |
D4 Migration Infrastructure
        |
D5 Compatibility Characterization
```

D5 route-only characterization may begin after D1 if it requires no database and startup separation is independently authorized. Database-backed D5 work requires D2 and D3.

## 14. Stop Conditions

Implementation must stop if:

- the authoritative deployment target is required but unclear;
- a production database could be contacted;
- production credentials are present or reusable;
- test database isolation cannot be proven;
- Node or PostgreSQL version compatibility is unknown for the affected step;
- the schema baseline is insufficient;
- unexplained schema drift appears;
- required owners are unidentified;
- compatibility impact is unknown;
- startup, route, response, status, error, or ordering behavior changes;
- middleware or route order changes;
- test tooling becomes a production dependency without approval;
- migration tooling runs at application startup;
- runtime DDL is changed before characterization;
- cleanup is incomplete;
- customer or production data enters fixtures;
- deployment or configuration changes become necessary;
- a migration would alter schema;
- Service Request identity work begins;
- Operational Aggregate identity or type work begins;
- Completion, Closure, Relationship, or RecurringService authority work begins;
- runtime adoption begins.

When stopped:

1. preserve the current system;
2. record the exact blocker;
3. retain sanitized evidence;
4. do not weaken safety or compatibility rules;
5. return to Phase E or the accountable owner for a new decision.

## 15. Final Classification

| Area | Classification |
|---|---|
| Adoption Planning | COMPLETE |
| Test Harness Adoption | PLANNED |
| Isolated Database Adoption | PLANNED |
| Fixture Adoption | PLANNED |
| Migration Adoption | PLANNED |
| Implementation Authorization | NOT YET GRANTED |
| Schema Changes | BLOCKED |
| Canonical Service Request Identity | BLOCKED |
| Operational Aggregate Identity | BLOCKED |
| Runtime Adoption | BLOCKED |

## 16. Recommended Next Phase

Proceed to:

**MEETRO BACKEND FOUNDATION IMPLEMENTATION PHASE E — FOUNDATION IMPLEMENTATION AUTHORIZATION**

Phase E should:

1. review every D1-D5 precondition;
2. identify required owners;
3. review unresolved deployment parity;
4. confirm Node and PostgreSQL evidence requirements;
5. decide whether D1 may execute before full production parity;
6. decide whether Supertest is authorized;
7. decide whether Docker and dependency changes are authorized;
8. define the exact first implementation scope;
9. authorize only reversible test-foundation changes;
10. keep D4 migration adoption blocked until its stronger preconditions pass.

Recommended first authorization candidate:

```text
Phase D1 subset:
- verify Node version
- create test-only directory structure
- introduce node:test smoke coverage
- add production-target safety guards
- preserve existing startup and runtime behavior
```

This candidate must still receive explicit Phase E authorization. It must not include database creation, Supertest, startup separation, migration tooling, schema changes, or identity work unless separately approved.

