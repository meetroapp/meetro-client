# Backend Database Relationship Audit

**Phase:** Backend Phase 4  
**Status:** Audit only  
**Backend source:** `https://github.com/meetroapp/metro-server`  
**Backend revision reviewed:** `feb94b448e30954d00ff61aedd35f721b0137edd`  
**Live schema inspection:** Unavailable  
**Schema changes:** None

## Executive Summary

The current PostgreSQL database cannot be fully audited from the available
evidence.

Verified facts:

- the Railway backend has a working PostgreSQL connection
- the backend uses PostgreSQL through `pg`
- route code successfully depends on existing application tables
- the source explicitly defines the intended `workflow_events` table shape
- message creation derives `sender_id` from authenticated `req.user.id`

Not verified:

- deployed table definitions
- primary-key types
- foreign keys other than the source-declared `workflow_events.user_id`
- indexes
- unique constraints
- nullability
- timestamp defaults for existing tables
- production row counts
- whether source and deployed schema match

No database credentials, read-only schema endpoint, schema dump, or migration
history are available in `meetro-client` or the public backend repository.
Accordingly, this report does not claim that route expectations are database
facts.

The database is structurally promising for additive canonical message
identity, but additive safety remains **UNVERIFIED / HIGH risk** until a
read-only production schema snapshot is obtained.

## Evidence Boundaries

This audit separates evidence into three categories.

### Verified database facts

Facts directly confirmed by a database response or explicit source-level
definition.

### Inferred route expectations

Columns and relationships that route SQL requires in order to execute. These
show intended usage but do not prove constraints, types, indexes, or production
schema details.

### Unknown production reality

Database properties that cannot be established without catalog access,
schema export, or migration history.

## Inspection Availability

### Available

- Public backend source
- Public backend package metadata
- Railway `/test-db` connectivity check
- Vercel `/test-db` connectivity check
- Source-defined `workflow_events` DDL

### Unavailable

- `DATABASE_URL` or read-only database credentials
- `pg_catalog` or `information_schema` query access
- schema-only SQL dump
- Railway database console output
- migrations
- ORM schema
- database administration metadata

No destructive or schema-changing SQL was executed.

## Deployment Database Evidence

### Railway

```text
GET https://athletic-rebirth-production-0a28.up.railway.app/test-db
HTTP 200
```

The endpoint returned a PostgreSQL `SELECT NOW()` result. This verifies that
the Railway backend could reach a database during the audit.

It does not reveal:

- database name or owner
- table definitions
- schema version
- indexes or constraints
- which commit created the schema

### Vercel

```text
GET https://metro-server-omega.vercel.app/test-db
HTTP 500
```

The response reported connection refusal at local PostgreSQL port 5432. The
Vercel deployment is therefore not a usable source of production database
evidence.

## Relationship Inventory

| Table | Primary Key | Key Columns | Relationships | Gaps | Risk |
| --- | --- | --- | --- | --- | --- |
| `users` | Expected `id`; not schema-verified | `email`, `role`, `account_type`, profile fields, `created_at` | Referenced by route joins and source-defined workflow-event FK | PK type, email uniqueness, nullability, indexes, timestamp default unknown | High |
| `contractor_profiles` | Expected `id`; not schema-verified | `user_id`, business/category fields, `created_at` | Joined to `users`; quote requests use profile `id` as `contractor_id` | FK and uniqueness of one profile per user unknown | High |
| `quote_requests` | Expected `id`; not schema-verified | `contractor_id`, `homeowner_id`, project text/location, `created_at` | Intended link to contractor profile and homeowner user | Actual FKs, delete behavior, uniqueness, canonical Project relationship unknown | High |
| `messages` | Expected `id`; not schema-verified | `quote_request_id`, `sender_id`, `receiver_id`, content/workflow fields, `created_at` | Joined to sender user; request relationship expected | Full DDL, FKs, indexes, nullability, timestamp default, participant constraints unknown | Critical |
| `workflow_events` | Source defines `SERIAL PRIMARY KEY` | `quote_request_id`, `user_id`, workflow fields, `created_at` | Source defines FK only from `user_id` to `users.id` | Live deployed shape unverified; no Project, Conversation, role, idempotency, or canonical ID | High |
| `contractor_projects` | Expected `id`; not schema-verified | `contractor_id`, title/description/images, `created_at` | Filtered by contractor identity | FK unknown; appears to be portfolio data, not canonical workflow Projects | High |
| Conversation table | Not found | None found | None found | No source or schema evidence | Critical |
| Canonical Project table | Not found | None proven | None proven | `contractor_projects` must not be assumed to own workflow Project identity | Critical |
| Conversation participants | Not found | None found | None found | Required for authorization | Critical |
| Idempotency records | Not found | None found | None found | Required for retry authority | High |
| Canonical event store | Not found | None found | None found | Legacy `workflow_events` does not satisfy canonical envelope | High |

## Table-by-Table Findings

## 1. `users`

### Verified database facts

None beyond successful route dependence and the source-defined
`workflow_events.user_id REFERENCES users(id)` intent.

### Inferred route expectations

Routes read or write:

- `id`
- `username`
- `email`
- `password_hash`
- `role`
- `account_type`
- `business_name`
- `business_category`
- `profile_photo_url`
- `created_at`

Authentication embeds `id`, `email`, and `role` in JWTs.

### Unknown production reality

- primary-key type and sequence
- unique constraint on email
- role constraints
- account-type constraints
- nullable fields
- created timestamp type/default
- indexes

### Canonical relevance

`users` can likely supply authenticated actor identity. Canonical actor role
cannot rely on `users.role` without an approved mapping because professional
accounts may store a business category in that field.

## 2. `contractor_profiles`

### Verified database facts

None from live schema.

### Inferred route expectations

Expected columns include:

- `id`
- `user_id`
- business profile fields
- `created_at`

Route joins imply:

```text
contractor_profiles.user_id -> users.id
```

Quote requests store `contractor_id` using a contractor-profile ID.

### Unknown production reality

- whether `user_id` has a foreign key
- whether one profile per user is enforced
- primary-key type
- delete behavior
- indexes
- nullability

### Canonical relevance

This table can help map a professional user to a quote request. That mapping is
not a Conversation participant model and does not itself establish canonical
role or Project identity.

## 3. `quote_requests`

### Verified database facts

None from live schema.

### Inferred route expectations

Expected columns include:

- `id`
- `contractor_id`
- `homeowner_id`
- `project_title`
- `project_description`
- `location`
- `created_at`

Intended relationships:

```text
quote_requests.contractor_id -> contractor_profiles.id
quote_requests.homeowner_id -> users.id
```

### Unknown production reality

- whether either foreign key is enforced
- delete/update behavior
- index coverage
- nullability
- whether duplicate or reassigned requests are possible
- whether any hidden canonical Project or Conversation link exists

### Canonical relevance

If verified, the homeowner and contractor-profile relationships could support
legacy-route participant authorization.

`quote_requests.id` remains request identity. It cannot be reused as
`projectId` or `conversationId`.

## 4. `messages`

### Verified database facts

The Railway deployment accepts message-route SQL in current application use,
but no catalog definition was inspected.

### Inferred route expectations

The insert requires:

- `quote_request_id`
- `sender_id`
- `receiver_id`
- `message_text`
- `image_url`
- `message_type`
- `workflow_type`
- `workflow_status`
- `workflow_payload`

The fetch also expects:

- `id`
- `created_at`

and joins:

```text
messages.sender_id -> users.id
```

### Unknown production reality

- primary-key type/generator
- all foreign keys
- nullability
- JSONB default and validation
- message timestamp type/default
- indexes on quote request or sender
- receiver relationship
- uniqueness constraints
- duplicate-message behavior

### Canonical gaps

No route evidence shows:

- `conversation_id`
- `project_id`
- `sender_role`
- `canonical_event_id`
- `idempotency_key`
- `idempotency_fingerprint`

Their database absence is strongly suggested but not live-schema verified.

## 5. `workflow_events`

### Verified database facts

The source explicitly runs this intended DDL:

```sql
CREATE TABLE IF NOT EXISTS workflow_events (
  id SERIAL PRIMARY KEY,
  quote_request_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL,
  workflow_status TEXT,
  workflow_payload JSONB DEFAULT '{}'::jsonb,
  event_label TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

This verifies source intent, not the deployed catalog. `CREATE TABLE IF NOT
EXISTS` does not reconcile an older or divergent existing table.

### Explicit source-level properties

- serial integer primary key
- non-null quote request ID
- non-null user ID
- user foreign key with cascade delete
- non-null workflow type
- nullable workflow status
- JSONB payload default
- nullable event label
- timestamp default without explicit timezone

### Missing source-level properties

- foreign key from `quote_request_id`
- Project identity
- Conversation identity
- actor role
- canonical source
- canonical event-type constraint
- idempotency
- event UUID/opaque canonical ID
- uniqueness beyond serial primary key
- canonical metadata

### Production unknowns

- whether the deployed table exactly matches this DDL
- indexes
- prior columns or constraints
- row count
- timestamp timezone behavior

## 6. `contractor_projects`

### Verified database facts

None from live schema.

### Inferred route expectations

Expected columns include:

- `id`
- `contractor_id`
- `title`
- `description`
- `image_url`
- `image_urls`
- `created_at`

### Unknown production reality

- contractor foreign key
- key types
- indexes
- nullability
- JSONB defaults

### Canonical relevance

The route purpose and fields indicate portfolio/gallery projects. This table
must not be treated as the canonical workflow Project aggregate without an
explicit product and ownership decision.

## 7. Project/Conversation-Related Tables

No public source reference or schema artifact identifies:

- `conversations`
- `conversation_participants`
- canonical workflow `projects`
- quote-request-to-Project links
- Conversation-to-Project links
- canonical event records
- idempotency records

Their production existence remains unknown because live catalog inspection was
not available.

## Required Schema Questions

## 1. Existing Table Definitions

**Status: PARTIAL**

Only the source-intended `workflow_events` definition is available. Other
table shapes are inferred from SQL usage.

## 2. Primary Keys

**Status: UNKNOWN**

Routes expect `id` columns. Only `workflow_events.id SERIAL PRIMARY KEY` is
source-explicit.

## 3. Foreign Keys

**Status: UNKNOWN / PARTIAL**

Only the intended workflow-event user foreign key is source-explicit. Other
joins do not prove constraints.

## 4. Indexes

**Status: UNKNOWN**

No index definitions are available.

## 5. Unique Constraints

**Status: UNKNOWN**

No unique constraints are available from source.

## 6. Nullable Fields

**Status: UNKNOWN / PARTIAL**

`workflow_events` nullability is source-explicit. Other table nullability is
unknown.

## 7. Timestamp Defaults

**Status: UNKNOWN / PARTIAL**

`workflow_events.created_at` has a source-intended
`CURRENT_TIMESTAMP` default using `TIMESTAMP`. Existing table defaults and
timezone behavior are unknown.

## 8. Existing Message Columns

**Status: INFERRED**

Route-required columns are listed above. The complete deployed row shape is
unknown.

## 9. Existing Workflow Event Columns

**Status: SOURCE-VERIFIED / PRODUCTION-UNVERIFIED**

The request-time DDL defines the expected shape. The deployed table was not
queried.

## Additive Canonical Identity Assessment

## 10. Can `conversationId` Be Added Additively?

**Likely yes at the message-row level, but authority is BLOCKED.**

A nullable `conversation_id` column would usually preserve legacy rows and
inserts. However:

- its target ID type is unknown
- no Conversation table is verified
- participant relationships do not exist in source
- no safe backfill source is proven

The column should not be added until Conversation ownership and key type are
defined from real schema evidence.

## 11. Can `projectId` Be Added Additively?

**Likely yes at the message-row level, but authority is BLOCKED.**

A nullable `project_id` is structurally additive. Its authority cannot be
established because no canonical Project table or link is verified.

`quote_request_id` and `contractor_projects.id` are prohibited substitutes.

## 12. Can `senderRole` Be Added Additively?

**Likely yes, with Medium implementation risk.**

A nullable `sender_role` snapshot can preserve current behavior. Before
implementation:

- inspect existing role/account constraints
- define the canonical homeowner/business mapping
- verify professional membership through backend relationships
- do not backfill from viewer-relative frontend data

## 13. Can Idempotency Keys Be Added Additively?

**Likely yes, with High concurrency and indexing risk.**

Nullable idempotency fields allow old clients to continue working. Safe
enforcement requires:

- verified message PK type
- production row-count and index review
- a unique partial constraint scoped by sender and operation
- request fingerprint policy
- transaction and concurrent-request tests

No such constraints currently appear in source.

## 14. Can Canonical Event IDs Be Added Additively?

**Likely yes, but the event store is unresolved.**

A nullable link from message to a separate canonical event can be additive.
The current serial `workflow_events.id` lacks the required envelope and
idempotency policy.

The canonical event ID type and owning table must be decided before adding the
message link.

## 15. Can Participant Authorization Be Enforced from Current Relationships?

**Potentially for legacy quote-request messaging, but not verified.**

Route SQL suggests a relationship chain:

```text
quote_requests.homeowner_id -> users.id
quote_requests.contractor_id -> contractor_profiles.id
contractor_profiles.user_id -> users.id
```

If these columns and rows are reliable, the backend can determine the two
expected participants for a quote request.

Unknowns that block implementation:

- foreign-key enforcement
- duplicate contractor profiles
- reassignment behavior
- receiver ID validity
- nullable or orphaned records
- whether messages may legitimately include other participants
- whether emergency and non-quote Conversations use different relationships

This relationship may support immediate legacy-route authorization after
schema verification. It does not create canonical Conversation authority.

## Can the Current Database Support Additive Canonical Message Identity?

**Probably, but not yet proven.**

The current relational model appears capable of accepting nullable additive
columns and tables. There is no evidence of a fundamental database technology
blocker.

The safe decision is:

```text
STRUCTURALLY PLAUSIBLE
PRODUCTION SAFETY UNVERIFIED
IMPLEMENTATION BLOCKED
RISK: HIGH
```

No schema patch should be generated from route code alone.

## Missing Columns and Tables

These are required by the canonical contract and absent from public source
evidence. Their production absence remains unverified.

### Message fields

- `conversation_id`
- `project_id`
- `sender_role`
- `canonical_event_id`
- `idempotency_key`
- `idempotency_fingerprint`

### Authority tables or equivalent relationships

- canonical Projects
- canonical Conversations
- Conversation participants
- Project/Conversation links
- canonical workflow events
- idempotency records or equivalent message-scoped enforcement

## Missing Constraints

No public evidence establishes:

- message-to-quote-request foreign key
- message sender/receiver foreign keys
- quote-request homeowner foreign key
- quote-request contractor-profile foreign key
- contractor-profile user foreign key
- participant uniqueness
- one authoritative Project link per Conversation
- idempotency uniqueness
- canonical event uniqueness
- approved actor-role constraint
- canonical event-type constraint

Some may exist in production. They must be catalog-verified before being
classified as absent.

## Safest Additive Schema Sequence

This sequence is conditional on a read-only production schema snapshot.

1. Export catalog metadata for all relevant tables.
2. Reconcile source assumptions with deployed types and constraints.
3. Capture row counts, orphan counts, duplicates, and null rates using
   read-only queries.
4. Decide canonical Project and Conversation ownership.
5. Establish or verify participant relationships.
6. Add nullable authority fields without non-null defaults.
7. Add lookup indexes using production-safe operations.
8. Populate only new writes whose identity is authoritative.
9. Add idempotency uniqueness after collision analysis.
10. Add a separate canonical event store or approved additive canonical
    columns to an existing store.
11. Link messages to canonical events.
12. Backfill only records whose links are provable.
13. Add enforcement constraints only after coverage and compatibility review.

No historical row should be assigned Project or Conversation identity through
title, message content, timestamp, or cross-domain ID substitution.

## Required Read-Only Schema Inspection

The database owner should provide a schema-only export or execute approved
read-only catalog queries for:

- columns and data types
- defaults and generated values
- primary, foreign, unique, and check constraints
- indexes
- table and index sizes
- approximate row counts
- orphaned relationship counts
- duplicate contractor profiles per user
- message senders/receivers outside quote-request participants
- timestamp timezone types

Credential values must not be placed in documentation or logs.

## Phase 5 Recommendation

**Backend Phase 5 - Read-Only Production Schema Snapshot and Legacy
Authorization Characterization**

Phase 5 should not implement canonical columns yet.

Required work:

1. obtain approved read-only database access or a schema-only export
2. capture the exact table/index/constraint definitions
3. run approved non-destructive relationship counts
4. verify whether quote-request participants can authorize existing message
   routes without excluding valid records
5. verify timestamp, key, and role data quality
6. create characterization fixtures for representative legacy rows

Deliver:

```text
docs/KnowledgeBase/BACKEND_PRODUCTION_SCHEMA_SNAPSHOT.md
docs/KnowledgeBase/BACKEND_LEGACY_MESSAGE_AUTHORIZATION_READINESS.md
```

Only after Phase 5 verifies the deployed schema should implementation begin.
The first implementation phase should then add tests and participant
authorization before canonical identity columns.

## Final Answers

| Question | Answer |
| --- | --- |
| Can additive canonical identity be supported? | Structurally plausible, production safety unverified |
| What columns are likely missing? | Conversation, Project, role snapshot, event link, idempotency fields |
| What tables are likely missing? | Canonical Project, Conversation, participants, canonical events, idempotency |
| What constraints are missing? | Unknown in production; no source evidence beyond workflow-event user FK |
| Can current relationships enforce participants? | Potentially for quote requests, pending schema and data validation |
| Should schema changes begin now? | No |
| Overall risk | **HIGH** |

## Audit Conclusion

The route source is sufficient to identify expected relationships and
canonical gaps. It is not sufficient to prove the deployed PostgreSQL schema.

The Railway database is online, but no safe schema inspection path was
available. Production catalog evidence is therefore the required next step,
not schema implementation.
