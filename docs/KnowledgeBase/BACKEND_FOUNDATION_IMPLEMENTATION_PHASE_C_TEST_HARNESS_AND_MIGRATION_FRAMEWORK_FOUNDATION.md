# Backend Foundation Implementation Phase C: Test Harness and Migration Framework Foundation

## Status

- Planning and recommendation only
- No dependency installation
- No code, tests, migrations, schema, SQL, routes, APIs, frontend, or runtime changes
- Backend evidence is limited to artifacts preserved inside `meetro-client`
- Canonical identity and Operational Aggregate implementation remain blocked

## 1. Executive Summary

Meetro's backend foundation governance is complete enough to make concrete tool recommendations. Test governance, migration governance, compatibility rules, recovery requirements, and stop conditions are documented.

Controlled foundation execution is authorized as separately scoped work. This report does not perform that work. Deployment parity remains Partial, the authoritative deployed commit remains unidentified, and accountable deployment, database, release, rollback, migration, testing, compatibility, CI, and test-database owners remain unidentified.

The current backend is a small CommonJS Node.js service with:

- Express `5.2.1`;
- PostgreSQL through `pg 8.20.0`;
- one root `index.js` containing startup, routes, authentication, and SQL;
- `package.json` and `package-lock.json`;
- no working backend test suite;
- no migration framework or migration history;
- request-time schema creation for `workflow_events`;
- a Partial production schema baseline.

Recommended foundation stack:

- **Testing:** Node native test runner (`node:test`), with a future HTTP integration helper such as Supertest if separately approved.
- **Migration:** `node-pg-migrate`.
- **Database strategy:** Docker-managed PostgreSQL for local and CI use, with a uniquely named temporary database per test run.
- **Fixture strategy:** deterministic fixture builders plus explicit seed helpers for sanitized legacy-baseline records.

These recommendations fit the backend's existing CommonJS and direct-`pg` model without introducing an ORM or a second application architecture.

Canonical Service Request identity remains blocked. Operational Aggregate identity and runtime adoption remain blocked.

## 2. Current Backend Foundation State

### Evidence Boundary

The backend repository path documented by earlier evidence is outside the currently permitted `meetro-client` workspace. This phase did not access that folder. Package, structure, startup, and database findings below come from the preserved source inventory, schema baseline, and governance reports.

| Foundation area | Current evidence | Classification |
|---|---|---|
| Backend testing | No framework or suite; current `npm test` is an error placeholder. | FAIL |
| Migration governance | Lifecycle, recovery, compatibility, and stop conditions are documented. | PASS |
| Migration implementation | No framework, directory, migration files, durable history, or execution process exists. | FAIL |
| Schema baseline | Tables, row counts, selected constraints, indexes, and drift are recorded; full catalog evidence is incomplete. | PARTIAL |
| Database access model | Direct PostgreSQL access through `pg.Pool`, `DATABASE_URL`, and SSL is documented. | PASS |
| Test database isolation | No isolated test database or responsible owner is identified. | FAIL |
| Startup model | CommonJS service starts from root `index.js`; startup and route definitions are colocated. Exact deployed start command and Node version are not preserved. | PARTIAL |
| Backend structure | Single-file application with no route, service, database, migration, or test directories. | PARTIAL |
| Deployment parity | Reviewed source exists, but deployed commit and authoritative environment remain unresolved. | PARTIAL |
| Ownership readiness | Repository ownership is Partial; operational owners remain unidentified. | FAIL |

### Current Dependency Evidence

Documented runtime dependencies:

- Express `5.2.1`;
- `pg 8.20.0`;
- `jsonwebtoken 9.0.3`;
- `bcrypt 6.0.0`;
- `cors 2.8.6`;
- `dotenv 17.4.2`.

No test or migration framework is documented.

### Startup Testability Finding

Because server creation, route registration, database access, and listening behavior are colocated in `index.js`, route testing may require a future compatibility-preserving separation between:

- creating/configuring the Express application; and
- opening the network listener.

That future separation must be characterized first and must not change route behavior. It is not implemented or authorized by this report.

## 3. Backend Testing Strategy Evaluation

### Evaluation Matrix

| Criterion | Jest | Vitest | Node native test runner |
|---|---|---|---|
| Express compatibility | Strong; commonly paired with HTTP testing libraries. | Strong; can test Node services and HTTP helpers. | Strong; framework-neutral and compatible with CommonJS. |
| PostgreSQL compatibility | Strong; database lifecycle remains custom. | Strong; database lifecycle remains custom. | Strong; database lifecycle remains custom. |
| CI compatibility | Mature reporters and broad CI support. | Strong CI support and fast execution. | Built into supported Node releases; standard exit codes and reporters. |
| CommonJS fit | Good, but configuration and transforms can add surface area. | Usable, but its strongest fit is often Vite/ESM-centered projects. | Direct fit through `require("node:test")` and `node:assert`. |
| Simplicity | Medium. Adds framework, configuration, and conventions. | Medium. Adds framework and configuration. | High. No separate test framework dependency. |
| Maintenance burden | Medium. Requires framework upgrades and configuration ownership. | Medium. Requires framework upgrades and Node-version compatibility. | Low, provided the backend uses a supported Node LTS version. |
| Learning curve | Low to medium; widely familiar. | Low to medium; Jest-like API. | Low for basic tests; fewer third-party conventions. |
| Mocking and ecosystem | Broadest ecosystem. | Strong built-in developer experience and mocking. | Core mocking, hooks, coverage, reporters, and watch support; smaller third-party ecosystem. |
| Suitability for current backend | Capable but heavier than required. | Capable but introduces tooling not otherwise used by the backend. | Best fit for a small direct-Node/CommonJS service. |

### Recommendation

**Recommend: Node native test runner (`node:test`).**

Rationale:

1. It is stable in supported modern Node versions.
2. It supports CommonJS directly.
3. It avoids adopting a large test framework before Meetro has test ownership and CI governance.
4. It supports asynchronous tests, hooks, mocking, reporters, watch mode, and coverage.
5. PostgreSQL integration behavior will depend more on database isolation and fixture quality than on Jest-specific or Vitest-specific features.
6. It reduces framework migration risk if the backend structure changes later.

### Conditions

Before adoption:

- verify and pin a supported Node LTS version locally, in CI, and in deployment;
- characterize the current startup command;
- decide whether an HTTP test helper is needed;
- separately authorize any HTTP-helper dependency;
- make application creation testable without automatically opening a production-style listener;
- preserve every existing route and response shape.

Jest remains a reasonable fallback if the future Test Owner requires its ecosystem or advanced mocking conventions. Vitest is not recommended for this backend because the service does not currently use Vite, TypeScript, or an ESM-first backend toolchain.

Official references:

- [Node.js test runner](https://nodejs.org/api/test.html)
- [Jest documentation](https://jestjs.io/docs/getting-started)
- [Vitest documentation](https://vitest.dev/guide/)

## 4. Test Structure Recommendation

Recommended future structure:

```text
test/
  fixtures/
  helpers/
  integration/
  characterization/
```

No directories are created in this phase.

### `test/`

Owns backend test code and test-only support artifacts. Keeping the suite outside runtime source reduces the risk that test setup is loaded in production.

### `test/fixtures/`

Owns sanitized, deterministic fixture definitions and builders. Fixtures represent current schema shapes without copying production records.

### `test/helpers/`

Owns:

- test environment guards;
- database creation and teardown;
- schema setup;
- fixture insertion;
- authentication token creation;
- HTTP test application setup;
- cleanup and failure diagnostics.

Helpers must refuse production-looking database targets.

### `test/integration/`

Owns database-backed and route-backed tests that verify:

- PostgreSQL behavior;
- authentication;
- route requests and responses;
- ordering;
- constraints;
- failure behavior;
- setup and cleanup.

### `test/characterization/`

Owns compatibility tests for the existing application, including:

- routes and HTTP methods;
- request and response fields;
- status and error shapes;
- legacy identifiers;
- message workflow fields;
- `posts.mage_url` and `posts.image_url`;
- request-time `workflow_events` DDL behavior;
- current authorization gaps.

Characterization tests describe current behavior. They do not approve it as future architecture.

## 5. Isolated Database Strategy

### Options Evaluated

| Strategy | Strengths | Risks and limitations | Assessment |
|---|---|---|---|
| Dedicated local PostgreSQL | Simple for developers who already run PostgreSQL; fast repeated use. | Version drift, machine-specific setup, shared-state contamination, and weaker CI parity. | Acceptable fallback, not primary recommendation. |
| Docker PostgreSQL | Reproducible PostgreSQL version, isolated credentials, repeatable CI/local setup, disposable environment. | Requires Docker availability and explicit ownership of image/version updates. | Recommended host strategy. |
| Temporary database per run | Strong test isolation, deterministic cleanup, supports destructive characterization safely. | Requires database-create permission and robust orphan cleanup. | Recommended execution strategy. |
| Schema reset in one shared database | Faster than database recreation in some suites. | Search-path leakage, connection state, sequence drift, runtime DDL, and parallel-test collision risk. | Not recommended as the primary boundary. |

### Recommendation

Use:

```text
Docker-managed PostgreSQL
        +
unique temporary database per test run
        +
database recreation between isolated suites when required
```

Recommended lifecycle:

1. start a pinned PostgreSQL container;
2. connect only with test-specific credentials;
3. verify the host and database are explicitly test-designated;
4. create a uniquely named run database;
5. reproduce the approved legacy baseline;
6. load only required fixtures;
7. run characterization and integration tests;
8. close all application pools;
9. drop the run database;
10. fail visibly if cleanup is incomplete.

Database recreation is preferred over transaction-only reset because the suite must eventually characterize DDL, connection behavior, defaults, sequences, and failures that cannot always remain inside one transaction.

### Required Safety Gates

- no production `DATABASE_URL`;
- no production credentials;
- no production host allowlist match;
- test-only database naming;
- explicit environment confirmation;
- cleanup after failure or interruption;
- no copied production data;
- pinned PostgreSQL major version;
- CI and local parity;
- identified Test Database Owner before implementation.

## 6. Fixture Strategy

### Fixture Families

| Fixture family | Required representative data |
|---|---|
| Users | Sanitized homeowner and contractor users, role/account variants currently supported, duplicate-email case, authentication-safe passwords. |
| Contractor profiles | Minimal profiles linked according to current behavior, owner and non-owner update cases, missing-profile case. |
| Posts | Minimal records covering `mage_url`, `image_url`, both fields, empty values, ordering, and missing relationships. |
| Quote requests | Homeowner/contractor associations, minimal project text, empty results, invalid IDs, and current request identity behavior. |
| Messages | Request-keyed records, sender and receiver IDs, ordering, workflow fields, nullable content/image cases, and unauthorized-participant characterization. |
| Contractor projects | Portfolio/presentation records, image fields, listing, detail, and delete behavior. |
| Reviews | Empty set, minimal review, reviewer/contractor references, and invalid relationship cases. |

### Fixture Rules

- use only synthetic values;
- use reserved domains such as `example.test`;
- never copy production rows or message content;
- preserve current legacy field names;
- preserve current nullability and missing-constraint behavior;
- generate deterministic IDs where the database allows it;
- keep fixture builders independent from production route code;
- insert only the records required by each test;
- expose provenance describing the fixture purpose;
- reset or destroy fixtures after every isolated run.

### Future Fixture Ownership

The future Fixture Owner should:

- approve sanitized fixture conventions;
- maintain baseline compatibility;
- review new fixture families;
- prevent customer data from entering tests;
- coordinate with the Test Owner and Compatibility Owner;
- document intentional schema-drift fixtures;
- ensure fixtures do not silently define future domain authority.

Fixture ownership remains unidentified and must be resolved before implementation.

## 7. Migration Framework Evaluation

### Evaluation Matrix

| Option | Governance compatibility | Rollback visibility | PostgreSQL fit | Transparency | Operational complexity | Long-term maintainability |
|---|---|---|---|---|---|---|
| `node-pg-migrate` | Strong: ordered migrations and durable migration history align with direct `pg` usage. | Explicit `up`/`down`; forward recovery can also be documented. | PostgreSQL-specific. | High: migration operations and SQL remain inspectable. | Low to medium. | Strong for a PostgreSQL-only service without an ORM. |
| Knex migrations | Strong migration lifecycle support. | Explicit `up`/`down` and migration state. | Strong. | Medium to high. | Medium because it introduces a broader query-builder surface. | Strong if Meetro also intends to adopt Knex for queries; otherwise broader than needed. |
| Prisma migrations | Strong generated migration workflow and schema model. | SQL is inspectable, but operational model is tied to Prisma schema and tooling. | Strong. | Medium. | High for this backend because it introduces an ORM/schema authority not currently present. | Strong for a Prisma application; disruptive for a direct-`pg` service. |
| Drizzle migrations | Strong for schema-as-code and Drizzle-managed applications. | Migration files and SQL are inspectable. | Strong. | High. | Medium to high because it introduces a new ORM/schema model. | Strong if Drizzle becomes the data layer; unnecessary for foundation-only governance. |
| Custom SQL governance | Maximum SQL transparency and minimal package surface. | Entirely dependent on custom conventions and scripts. | Native. | Highest. | High: locking, history, ordering, checksums, status, and recovery must be built and maintained. | Weak unless Meetro commits to maintaining migration infrastructure itself. |

### Recommendation

**Recommend: `node-pg-migrate`.**

Rationale:

1. It is PostgreSQL-first and matches the existing direct-`pg` backend.
2. It does not require Meetro to adopt an ORM.
3. It supports ordered migration files and durable applied-migration tracking.
4. Migration operations remain explicit and reviewable.
5. It offers a lower conceptual and operational burden than adopting Knex, Prisma, or Drizzle solely for migrations.
6. It is safer than building custom migration history and locking from scratch.

Official references:

- [`node-pg-migrate`](https://salsita.github.io/node-pg-migrate/)
- [Knex migrations](https://knexjs.org/guide/migrations.html)
- [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate)
- [Drizzle migrations](https://orm.drizzle.team/docs/migrations)

### Recommendation Conditions

Before selection is finalized:

- verify CommonJS and current Node LTS compatibility;
- verify support for the selected PostgreSQL version;
- evaluate migration locking and migration-table behavior;
- define transactional expectations;
- define `up`, `down`, and forward-recovery policy;
- define production command restrictions;
- identify Migration, Database, Release, Rollback, Recovery, Verification, Test, and Compatibility owners;
- complete deployment parity;
- approve the schema baseline used by the first migration;
- prohibit domain or identity migrations during framework adoption.

## 8. Migration Adoption Readiness

| Stage | Classification | Finding |
|---|---|---|
| Migration framework selection | READY | The evidence supports recommending `node-pg-migrate`; final approval should verify runtime versions and ownership. |
| Migration framework adoption | BLOCKED | Deployment parity, owners, test isolation, complete schema evidence, and recovery execution evidence remain incomplete. |
| Migration execution | BLOCKED | No production migration may run without verified target, owners, tests, compatibility evidence, approval, and recovery readiness. |

Framework adoption must be limited to governance infrastructure. It must not create `service_requests`, `operational_aggregates`, typed references, Completion, Closure, Relationships, or RecurringService authority.

## 9. Combined Foundation Recommendation

| Foundation concern | Recommendation | Rationale |
|---|---|---|
| Testing framework | Node native test runner (`node:test`) | Lowest dependency and configuration burden; direct CommonJS fit; sufficient core testing capabilities. |
| HTTP route testing | Future separately approved HTTP helper, preferably Supertest | Allows Express route testing without depending on a live external deployment. |
| Database strategy | Docker-managed PostgreSQL with a uniquely named temporary database per run | Reproducible, isolated, disposable, suitable for local and CI characterization. |
| Reset strategy | Drop and recreate temporary run databases; use narrower transaction resets only where proven safe | Handles runtime DDL, sequences, connection state, and parallel isolation. |
| Fixture strategy | Deterministic synthetic fixture builders plus explicit seed helpers | Preserves readability, sanitization, and per-test control. |
| Migration framework | `node-pg-migrate` | PostgreSQL-specific, direct-`pg` compatible, transparent, and smaller than adopting an ORM. |

### Required Sequencing

```text
Resolve required owners and deployment parity
        |
Pin supported Node and PostgreSQL versions
        |
Approve isolated database strategy
        |
Adopt test harness foundation
        |
Characterize current routes and runtime DDL
        |
Evaluate migration framework against live constraints
        |
Adopt migration framework without domain migrations
        |
Validate compatibility and recovery
```

## 10. Risks

| Risk | Classification | Reason |
|---|---|---|
| Doing nothing | HIGH | Runtime DDL, undocumented schema evolution, no automated characterization, and unresolved parity continue accumulating risk. |
| Implementing tests with approved isolation | MEDIUM | Startup coupling and legacy behavior require careful characterization, but tests are additive and locally reversible. |
| Implementing tests without isolation or owners | CRITICAL | Production data or credentials could be touched, and failures would lack accountable handling. |
| Selecting a migration framework | LOW | A documented recommendation does not change runtime behavior. |
| Adopting migration tooling before parity and tests | HIGH | The target schema and deployed source may not match the reviewed baseline. |
| Executing migrations before governance gates | CRITICAL | Data integrity, compatibility, rollback, and environment targeting cannot be assured. |
| Introducing an ORM solely for migrations | HIGH | It could create competing schema authority and unnecessary refactoring pressure. |
| Building custom migration infrastructure | HIGH | Meetro would own locking, ordering, checksums, history, status, and recovery behavior. |
| Implementing Service Request identity now | CRITICAL | Backend authority, authorization, idempotency, acknowledgement, tests, and migrations are not ready. |
| Implementing Operational Aggregate identity now | CRITICAL | Identity and type authority remain blocked, with no governed persistence path. |

## 11. Authorization Matrix

### Authorized

- test framework recommendation;
- migration framework recommendation;
- fixture planning;
- isolated database planning;
- future structure planning;
- compatibility characterization planning;
- framework adoption planning.

### Blocked

- dependency installation;
- test creation;
- test database creation;
- migration framework installation;
- migration file creation;
- migration execution;
- schema changes;
- production SQL;
- route or API changes;
- runtime DDL retirement;
- deployment or configuration changes;
- Service Request identity;
- Operational Aggregate identity or type;
- typed aggregate references;
- Completion authority;
- Closure authority;
- Relationship authority;
- RecurringService authority;
- runtime adoption.

## 12. Final Recommendation

```text
Testing: Node native test runner (node:test)

HTTP Testing: Supertest, only through separate dependency approval

Migration: node-pg-migrate

Database Strategy:
Docker-managed PostgreSQL with a uniquely named temporary database per run

Fixture Strategy:
Deterministic, synthetic fixture builders and explicit sanitized seed helpers
organized under test/fixtures
```

This stack should be adopted only after:

- the backend Node version is verified and pinned;
- required owners are identified;
- deployment parity is sufficient;
- the test database is isolated and protected;
- the legacy schema can be reproduced;
- adoption receives a dedicated implementation authorization.

## 13. Final Classification

| Area | Classification |
|---|---|
| Backend Foundation Planning | COMPLETE |
| Test Framework Recommendation | COMPLETE |
| Migration Framework Recommendation | COMPLETE |
| Isolated Database Recommendation | COMPLETE |
| Fixture Strategy Recommendation | COMPLETE |
| Test Harness Implementation | NOT YET AUTHORIZED |
| Migration Framework Adoption | NOT YET AUTHORIZED |
| Migration Execution | BLOCKED |
| Canonical Service Request Identity | BLOCKED |
| Operational Aggregate Identity | BLOCKED |
| Runtime Adoption | BLOCKED |

## 14. Recommended Next Phase

Proceed to:

**MEETRO BACKEND FOUNDATION IMPLEMENTATION PHASE D — TEST HARNESS AND MIGRATION FRAMEWORK ADOPTION PLAN**

Phase D should define exact, reversible implementation steps for:

- verifying and pinning the Node and PostgreSQL versions;
- introducing the Node native test command;
- deciding whether Supertest is required;
- separating Express application construction from listener startup without changing behavior;
- creating production-target safety guards;
- provisioning Docker PostgreSQL for local and CI use;
- creating and cleaning temporary test databases;
- reproducing the approved legacy baseline;
- organizing sanitized fixtures;
- selecting and configuring `node-pg-migrate`;
- creating migration governance infrastructure without domain migrations;
- characterizing runtime `workflow_events` DDL;
- validating compatibility before any later schema work.

Phase D must remain a plan. It must not install dependencies, create tests, create migrations, change schema, modify runtime behavior, or introduce canonical identity.

