# Backend Foundation Phase 2 - Test Harness Strategy and Characterization Plan

## Status

- Planning only
- No test framework selected or installed
- No tests created
- No code, dependency, schema, route, API, frontend, or runtime changes
- Canonical identity and runtime adoption remain blocked

## 1. Executive Summary

Current backend behavior lacks repeatable automated characterization.

The backend has a working Express and PostgreSQL foundation, but no test
framework, test suite, integration tests, migration tests, parity tests, or CI
test evidence. The current package test command exits with an error rather
than executing a suite.

Future work involving identity, migrations, authorization, Operational
Aggregates, Completion, Closure, Relationships, or Recurring Services
requires a test foundation before implementation.

This phase defines test governance only:

- what behavior must be characterized;
- what compatibility must be protected;
- what fixtures and isolation are required;
- what ownership and CI controls must exist;
- what conditions stop future implementation.

No test implementation is authorized.

## 2. Current Test Reality

| Capability | Current evidence | Status |
| --- | --- | --- |
| Backend test framework | None present | `MISSING` |
| Backend test suite | None present | `MISSING` |
| Route characterization tests | None present | `MISSING` |
| Database integration tests | None present | `MISSING` |
| Authentication tests | None present | `MISSING` |
| Authorization tests | None present | `MISSING` |
| Migration tests | No migration framework or tests | `MISSING` |
| Deployment parity tests | None present | `MISSING` |
| Compatibility tests | None present | `MISSING` |
| CI test evidence | None supplied | `MISSING` |
| Test database | None identified | `MISSING` |
| Test ownership | Unidentified | `MISSING` |
| Package test script | Exits with an error placeholder | `NON-FUNCTIONAL` |

The absence of tests does not prove that current behavior is wrong. It means
current behavior cannot be changed safely or reproduced automatically.

## 3. Test Foundation Principles

1. Characterize before changing.
2. Preserve compatibility.
3. Current observable behavior is evidence.
4. Tests validate behavior; tests do not define business authority.
5. Unknown behavior must be documented, not invented.
6. Tests must not use production data.
7. Tests must not use production credentials.
8. Tests must not expose secrets, tokens, passwords, or customer content.
9. Identity work requires tests before implementation.
10. Migration work requires forward and recovery tests.
11. Authorization tests require explicit approved policy.
12. A passing test does not grant domain authority.
13. Route characterization must precede route refactoring.
14. Database integration evidence cannot be replaced entirely by mocks.
15. Fixtures must be deterministic and sanitized.
16. Test failures must leave the test environment clean.
17. Production systems must never be a test target.
18. Compatibility assertions must reflect actual current clients.

## 4. Required Characterization Categories

Future test implementation must characterize:

| Category | Required characterization |
| --- | --- |
| Repository startup | Server initialization, required configuration, startup failures, and listening behavior |
| Environment loading | Required and optional environment variables without exposing values |
| Database connection | Successful connection, unavailable database behavior, and route-level error handling |
| Authentication | Signup, login, tokens, authenticated identity, profile behavior, and 2FA placeholders |
| Authorization | Existing authenticated-only and ownership checks, including current gaps |
| Users | Creation, lookup, duplicate email behavior, profile fields, and safe response fields |
| Posts | Create/read/update behavior as present, legacy image fields, ordering, and errors |
| Contractor profiles | Create/read/update behavior, current ownership checks, and list/detail responses |
| Quote requests | Creation, homeowner/contractor views, fields, ordering, and errors |
| Messages | Creation, sender derivation, retrieval, workflow fields, ordering, and failure behavior |
| Workflow-event routes | Runtime DDL, insert/read behavior, repeat calls, and failures |
| Reviews | Creation, contractor lookup, empty results, fields, and errors |
| Contractor projects | Portfolio create/read/delete behavior, image fields, ordering, and errors |
| Error responses | Status codes, response shapes, validation failures, authentication failures, and database failures |
| Compatibility | Routes, fields, IDs, nullability, legacy fields, ordering, and current frontend expectations |

Characterization records current behavior. It does not approve or normalize
that behavior.

## 5. Route Characterization Inventory

Exact HTTP methods and response details must be captured from the reviewed
backend during future test implementation. This plan does not invent them.

| Route or route group | Future characterization requirements |
| --- | --- |
| `/health` | Status code, exact response shape, database independence, startup availability |
| `/test-db` | Success response, database timestamp shape, connection failure response, production-safety restrictions |
| `/auth/signup` | Required fields, success response, created user fields, duplicate-email behavior, hashing boundary, validation errors |
| `/auth/login` | Success response, token shape, invalid email, invalid password, missing fields, safe error behavior |
| `/auth/me` | Token requirement, returned profile fields, missing/invalid token behavior |
| `/auth/profile-photo` | Authentication, accepted field shape, update response, missing user or invalid value behavior |
| `/auth/request-2fa-code` | Current placeholder or implemented response, authentication requirements, repeat behavior |
| `/auth/verify-2fa-code` | Current accepted input and response, invalid-code behavior, placeholder limitations |
| `/auth/security-status` | Current response fields, authentication, default state |
| `/auth/enable-2fa` | Current response and state behavior without defining future security authority |
| `/auth/disable-2fa` | Current response and state behavior without defining future security authority |
| `/posts` | Supported methods, request and response fields, ordering, image fields, authentication, validation, empty results |
| `/posts/:id` | Existing detail/update/delete behavior, missing ID, not-found and ownership behavior |
| `/contractor-profiles` | List/create behavior, fields, ordering, authentication, empty results |
| `/contractor-profiles/:id` | Detail/update behavior, current ownership check, non-owner denial, missing profile |
| `/my-contractor-profile` | Authentication, user-to-profile lookup, no-profile behavior, returned fields |
| `/quote-requests` | Creation fields, authentication, response identity, nullability, validation, errors |
| `/my-quote-requests` | Homeowner-scoped lookup behavior, ordering, empty results, authentication |
| `/contractor-quote-requests` | Contractor-scoped lookup behavior, profile resolution, ordering, empty results |
| `/messages` | Message creation fields, authenticated sender derivation, returned row, workflow fields, validation, database failure |
| `/messages/:quoteRequestId` | Authentication, request-keyed lookup, ordering by `created_at`, sender join fields, empty results, current participant-check gap |
| `/workflow-events` | Runtime table-creation behavior, accepted fields, insertion response, repeated requests, database errors |
| `/workflow-events/:quoteRequestId` | Authentication, request-keyed lookup, ordering, empty results, missing-table behavior |
| `/reviews` | Review creation fields, authentication, returned identity, validation, database errors |
| `/reviews/:contractorId` | Contractor-scoped lookup, ordering, empty results, invalid ID |
| `/contractor-projects` | Portfolio creation/list behavior, fields, image handling, authentication, ordering |
| `/contractor-projects/:id` | Existing detail/delete behavior, not found, current ownership behavior |
| `/contractor-projects/:contractorId` | Contractor-scoped portfolio lookup, ordering, empty results |

Characterization must preserve distinctions between overlapping route
patterns and record route-registration behavior where ambiguity exists.

## 6. Authentication Characterization Requirements

Future authentication tests must cover:

### Signup

- successful signup;
- required and optional fields;
- safe response fields;
- password not returned;
- password stored through hashing boundary;
- duplicate email;
- missing email;
- missing password;
- malformed input;
- database failure.

### Login

- successful login;
- token returned;
- token claims currently present;
- invalid email;
- invalid password;
- missing credentials;
- inactive or missing user behavior if currently represented;
- database failure.

### Token and Middleware

- token creation;
- valid token;
- missing token;
- malformed token;
- invalid signature;
- expired token if expiration exists;
- `req.user.id`;
- `req.user.email`;
- `req.user.role`;
- safe authentication error shape.

### Authenticated Profile

- `/auth/me`;
- profile-photo update;
- missing user;
- invalid profile-photo value;
- returned user fields;
- protected-field exclusion.

### Current 2FA Behavior

- request-code response;
- verify-code response;
- security-status response;
- enable response;
- disable response;
- authentication requirements;
- placeholder or non-persistent behavior exactly as observed.

Tests must characterize current 2FA behavior and must not imply that it
provides stronger security authority than the backend actually implements.

## 7. Authorization Characterization Requirements

No new authorization model is defined in this phase.

Future tests must record:

- which routes require authentication;
- which routes allow unauthenticated access;
- contractor-profile update ownership behavior;
- allowed owner update;
- denied non-owner update;
- missing profile behavior;
- current sender derivation for messages;
- current absence of message participant membership checks;
- current absence of Conversation membership;
- current absence of central authorization;
- current absence of aggregate authorization;
- current absence of Relationship authorization;
- current business/tenant scope behavior, including where none exists.

Tests must distinguish:

- authentication present;
- ownership check present;
- participant authorization present;
- policy absent.

A characterization test may prove that an authorization gap exists. It must
not silently convert the gap into approved behavior.

## 8. Database Integration Characterization Requirements

Future database integration tests must use an isolated PostgreSQL database and
cover:

- successful connection;
- unavailable database;
- query failure;
- inserts;
- reads;
- updates;
- deletes where routes currently support them;
- ordering;
- empty results;
- default timestamps;
- returned IDs;
- JSONB workflow fields;
- nullable fields;
- duplicate `users.email` constraint;
- current absence of foreign keys;
- behavior with relationship IDs that are not database-enforced;
- transaction rollback where transactions currently exist;
- partial-write risk where transactions do not exist;
- route response when database operations fail.

The test schema must reflect the approved baseline. It must not add foreign
keys, indexes, or constraints merely to make tests cleaner.

## 9. Runtime DDL Characterization Requirements

Reviewed source attempts:

```sql
CREATE TABLE IF NOT EXISTS workflow_events
```

inside workflow-event request handling.

Future characterization must test in an isolated database:

1. whether the first route call creates the table;
2. the resulting table shape;
3. whether an event is inserted after creation;
4. exact response shape;
5. repeated-call behavior;
6. behavior when the table already exists;
7. behavior when an incompatible table exists;
8. behavior when schema creation permission is denied;
9. behavior when creation succeeds but insertion fails;
10. behavior when lookup occurs before creation;
11. authentication behavior;
12. request-keyed ordering and empty results;
13. whether failures leave partial schema state.

Compatibility expectations must be recorded from current behavior.

This phase does not remove, modify, endorse, or execute runtime DDL.

## 10. Fixture and Sanitization Requirements

### Prohibited Fixture Sources

- production rows;
- copied customer records;
- real customer or contractor messages;
- real email addresses except reserved test domains;
- real phone numbers;
- real passwords;
- real JWTs;
- production secrets;
- production database snapshots containing personal data.

### Required Fixture Properties

- deterministic where possible;
- isolated per test;
- clearly synthetic;
- minimal;
- readable;
- resettable;
- free of sensitive content;
- compatible with the baseline schema.

### Required Fixture Families

- sanitized users;
- homeowner and contractor roles as currently represented;
- sanitized contractor profiles;
- sanitized posts;
- sanitized Quote Requests;
- sanitized messages;
- sanitized workflow payloads without message content;
- sanitized contractor portfolio projects;
- sanitized reviews;
- duplicate-email case;
- missing and invalid relationship IDs;
- empty-table cases.

### Example Data Rules

- use reserved domains such as `example.test`;
- use non-secret placeholder passwords;
- generate test-only tokens;
- avoid real addresses and phone numbers;
- use neutral message placeholders;
- never write fixture values to production.

## 11. Isolated Test Database Requirements

The test database must:

- be separate from production;
- use separate credentials;
- be unmistakably named as test-only;
- reject production connection strings;
- support local and CI execution;
- use deterministic schema setup;
- support clean setup and teardown;
- support reset between tests or test groups;
- remove data after failure;
- expose no production secrets;
- reproduce the approved legacy baseline;
- permit characterization of runtime DDL safely.

### Setup and Teardown

The future strategy must define:

- database creation responsibility;
- schema initialization source;
- seed process;
- transaction or truncation reset strategy;
- teardown command;
- failure cleanup;
- orphaned-test detection;
- parallel-test isolation.

### Production-Safety Checks

Tests must stop before executing SQL if:

- the database name is not test-designated;
- the host matches a protected production target;
- production credentials are detected;
- required test environment confirmation is absent.

## 12. Compatibility Assertions

Future tests must protect:

- route paths;
- HTTP methods;
- request field names;
- response field names;
- status codes;
- error shapes;
- current IDs;
- ordering;
- empty-result behavior;
- nullable fields;
- optional fields;
- legacy table and column names;
- `posts.mage_url`;
- `posts.image_url`;
- `messages.workflow_type`;
- `messages.workflow_status`;
- `messages.workflow_payload`;
- current `quote_requests` behavior;
- current `contractor_projects` portfolio behavior;
- current message request-keying;
- current frontend-consumed fields.

Compatibility tests must not:

- promote legacy IDs;
- rename fields;
- declare workflow fields aggregate authority;
- delete drift;
- rewrite error behavior without separate approval.

## 13. Future Identity Test Requirements

No identity tests are implemented in this phase.

Before future implementation of `serviceRequestId`, tests must cover:

- stable backend-issued identity;
- exact idempotent replay;
- conflicting replay;
- source-reference preservation;
- no automatic aggregate creation;
- compatibility ID remains separate;
- unauthorized creation denied;
- transaction rollback;
- acknowledgement stability.

Before future implementation of `aggregateId` and `aggregateType`, tests must
cover:

- stable aggregate identity issuance;
- approved explicit type;
- unknown type rejection;
- no legacy ID promotion;
- no category-only type inference;
- unauthorized creation denied;
- concurrent duplicate protection;
- exact replay;
- conflicting replay;
- source-reference validation;
- persistence-owned acknowledgement;
- transaction rollback.

Before typed references, tests must cover:

- valid source and aggregate;
- missing source;
- missing aggregate;
- type mismatch;
- unauthorized link;
- duplicate replay;
- conflicting mapping;
- compatibility references remain separate;
- acknowledgement and audit provenance.

## 14. CI and Execution Requirements

A future test foundation must provide:

- one repeatable local command;
- one repeatable CI command;
- isolated PostgreSQL database;
- deterministic fixtures;
- deterministic setup and teardown;
- clear success and failure exit codes;
- useful failure visibility;
- no secrets in output;
- no customer content in output;
- production-target safety checks;
- timeout handling;
- cleanup after interruption;
- test result retention;
- documented environment requirements.

CI must not:

- connect to production;
- rely on developer-local state;
- require manual data cleanup;
- expose tokens or connection strings;
- silently skip database tests.

## 15. Ownership Requirements

No owner is invented by this plan.

| Ownership category | Current status | Required responsibility |
| --- | --- | --- |
| Test owner | `UNIDENTIFIED` | Approve harness, coverage, and release gate |
| Fixture owner | `UNIDENTIFIED` | Maintain sanitized deterministic fixtures |
| CI owner | `UNIDENTIFIED` | Own CI environment, secrets, and reliability |
| Test database owner | `UNIDENTIFIED` | Own isolation, credentials, lifecycle, and safety |
| Compatibility owner | `UNIDENTIFIED` | Approve API/frontend/legacy compatibility assertions |
| Failure triage owner | `UNIDENTIFIED` | Investigate failures and prevent ignored regressions |

Implementation cannot begin until required owners for that implementation
phase are identified.

## 16. Stop Conditions

Test-foundation planning or future implementation must stop if:

- the test database cannot be isolated;
- tests require production data;
- tests require production credentials;
- secrets would be exposed;
- customer content would be copied;
- compatibility impact is unclear;
- route behavior is unknown and expected behavior would be invented;
- current frontend expectations are unknown;
- the baseline schema cannot be reproduced;
- the test owner is unidentified for implementation;
- the test database owner is unidentified;
- the compatibility owner is unidentified;
- CI cannot safely run database tests;
- CI would silently skip integration tests;
- production-safety checks cannot be enforced;
- fixtures cannot be deterministically cleaned up.

When stopped:

1. document the missing evidence or owner;
2. preserve current behavior;
3. do not invent expected behavior;
4. do not weaken isolation;
5. require explicit resolution before implementation.

## 17. Final Classification

```text
Backend Test Governance Planning: COMPLETE
Backend Test Harness Implementation: NOT AUTHORIZED
Dependency Installation: NOT AUTHORIZED
Tests Created: NONE
Schema Changes: BLOCKED
Canonical Service Request Identity: BLOCKED
Operational Aggregate Identity: BLOCKED
Runtime Adoption: BLOCKED
```

The characterization scope, isolation requirements, compatibility assertions,
fixture rules, ownership categories, CI requirements, and stop conditions are
defined.

Implementation remains unauthorized because no framework has been selected,
required owners remain unidentified, and no isolated test database has been
approved.

## 18. Recommended Next Phase

Proceed to:

**MEETRO BACKEND FOUNDATION IMPLEMENTATION PHASE 3 - MIGRATION GOVERNANCE AND
RECOVERY STRATEGY**

Phase 3 should remain planning-only and define:

- migration lifecycle;
- migration ownership;
- database ownership;
- release and rollback ownership;
- forward migration expectations;
- rollback or forward-recovery expectations;
- baseline and drift handling;
- schema-change classifications;
- production safety;
- compatibility validation;
- stop conditions.

Phase 3 must not:

- select or install a migration framework;
- create migrations;
- alter schema;
- add constraints or indexes;
- create domain tables;
- change routes or APIs;
- implement identity;
- change runtime behavior.
