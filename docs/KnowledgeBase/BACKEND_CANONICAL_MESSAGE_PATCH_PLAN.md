# Backend Canonical Message Patch Plan

**Phase:** Backend Phase 3  
**Status:** Planning only  
**Backend source:** `https://github.com/meetroapp/metro-server`  
**Backend revision reviewed:** `feb94b448e30954d00ff61aedd35f721b0137edd`  
**Implementation posture:** Additive and backward-compatible  
**Runtime changes:** None

## Executive Summary

The current message API can be extended toward canonical
`MESSAGE_CREATED` authority without breaking the existing frontend, provided
the work is split into additive stages.

Existing behavior must remain available throughout migration:

- `POST /messages` continues accepting current snake_case fields.
- The accepted message row remains available as `response.data`.
- `response.data.id` remains the message ID expected by the frontend.
- `GET /messages/:quoteRequestId` remains available.
- Existing message row fields retain their names and meanings.
- Workflow-card `/workflow-events` behavior remains unchanged until a
  separately approved migration.

New canonical fields should first be nullable and returned only when they have
authoritative backend provenance. They must not be populated by copying
`quote_request_id` into `projectId` or `conversationId`.

The plan has one hard prerequisite: inspect the deployed PostgreSQL schema
before writing any migration. The repository does not contain the current
`messages`, `quote_requests`, or related table definitions.

## Governing Constraints

1. Prefer additive columns, tables, response properties, and routes.
2. Do not remove or rename existing request or response fields.
3. Do not make new fields required until old clients remain functional.
4. Do not infer cross-domain identity.
5. Do not claim canonical authority for partially populated records.
6. Establish participant authorization before canonical writer migration.
7. Keep legacy and canonical writes in one backend transaction once event
   persistence begins.
8. Deploy observability and rollback controls before enforcement.

## 1. Current `POST /messages` Behavior

The route:

1. verifies a bearer JWT
2. reads current request fields
3. sets `sender_id` from `req.user.id`
4. inserts one row into `messages`
5. returns the inserted row as:

```js
{
  message: "Message sent",
  data: insertedMessage
}
```

Current accepted fields:

```js
{
  quote_request_id,
  receiver_id,
  message_text,
  image_url,
  message_type,
  workflow_type,
  workflow_status,
  workflow_payload
}
```

Current strengths:

- authenticated backend sender ID
- client sender identity is ignored
- durable PostgreSQL message insert
- backend-generated message ID
- likely database-generated `created_at`

Current gaps:

- no relationship authorization
- no Conversation or Project identity
- no sender role snapshot
- no idempotency
- no canonical event
- no transaction joining message and event persistence

## 2. Current `GET /messages/:quoteRequestId` Behavior

The route:

1. verifies a bearer JWT
2. selects every message matching the route's quote-request ID
3. joins sender email
4. orders by `messages.created_at`
5. returns:

```js
{
  messages: rows
}
```

Current gaps:

- no participant authorization
- no canonical Conversation boundary
- no Project identity
- no sender role snapshot
- no canonical event identity

The existing endpoint must remain temporarily for frontend compatibility, but
authorization should be added before expanding canonical use.

## 3. Minimal Non-Breaking Response Additions

### Creation response

Preserve the existing shape:

```js
{
  message: "Message sent",
  data: insertedMessage
}
```

Add optional siblings:

```js
{
  message: "Message sent",
  data: insertedMessage,
  canonical: {
    message: {
      id,
      conversationId,
      projectId,
      senderId,
      senderRole,
      receiverId,
      messageType,
      createdAt
    },
    event: {
      id,
      eventType: "MESSAGE_CREATED",
      projectId,
      conversationId,
      actor,
      actorRole,
      recordedAt,
      source: "backend-message",
      payload: {
        messageId,
        messageType
      }
    },
    idempotency: {
      key,
      replayed
    }
  }
}
```

During transition, `canonical` should be omitted or explicitly marked
unavailable when authority is incomplete. It must never contain guessed
identity.

### Fetch response

Preserve:

```js
{
  messages: rows
}
```

Add authoritative snake_case columns to each row when present and an optional
canonical projection:

```js
{
  messages: rows,
  canonical_messages: canonicalMessages
}
```

The existing frontend ignores unknown response properties and unknown row
fields. This makes additive response expansion low risk.

### Compatibility rule

`data.id` must continue to identify the persisted message record. Do not
replace it with the canonical event ID.

## 4. Required Database Columns

The exact migration must wait for deployed-schema inspection. If these fields
are absent, the minimum additive message columns are:

| Column | Initial state | Purpose |
| --- | --- | --- |
| `conversation_id` | Nullable | Authoritative Conversation relationship |
| `project_id` | Nullable | Authoritative Project aggregate |
| `sender_role` | Nullable | Authorization-time role snapshot |
| `canonical_event_id` | Nullable | Linked `MESSAGE_CREATED` event |
| `idempotency_key` | Nullable | Client command retry identity |
| `idempotency_fingerprint` | Nullable | Detect conflicting key reuse |

Potential indexes after data-type and volume review:

- lookup index on `conversation_id`
- lookup index on `project_id`
- unique partial index on `(sender_id, idempotency_key)` where the key is not
  null
- unique partial index on `canonical_event_id` where it is not null

### Required relationship persistence

Columns alone cannot create authority. Backend-owned records are also needed
for:

- canonical Projects or authoritative quote-request-to-Project links
- canonical Conversations
- Conversation participants and their authorized roles
- canonical workflow events

Whether suitable production tables already exist must be determined before
new tables are planned.

## 5. Nullable Addition Safety

The message columns can usually be introduced safely as nullable additions
because:

- existing inserts need not supply them
- existing rows remain readable
- current frontend ignores them
- legacy messages can remain non-canonical
- backfill can be selective rather than speculative

Safety conditions:

1. inspect actual production types, constraints, indexes, and row counts
2. use the database's existing ID type where authority tables already exist
3. avoid table rewrites caused by non-null defaults
4. add indexes separately and safely for production scale
5. do not add `NOT NULL` until canonical coverage and legacy policy are
   approved
6. do not backfill from titles, content, timestamps, or generic IDs

Existing records that cannot be linked authoritatively should retain null
canonical fields.

## 6. Frontend Compatibility

The current frontend can safely ignore additive fields because it:

- checks `result.data.data.id` after creation
- maps known message row properties during fetch
- tolerates additional object properties
- does not validate an exact response schema

Compatibility would be broken by:

- moving the message row from `data`
- changing `data.id` to the event ID
- renaming existing snake_case fields
- requiring new request fields immediately
- removing `GET /messages/:quoteRequestId`
- changing existing message ordering

The patch sequence must avoid all six.

## 7. Sender Role Strategy

### Authority

`senderRole` must be derived from backend authorization context at message
acceptance and persisted as an immutable snapshot.

### Current complication

The JWT `role` can contain business-category values rather than the canonical
role `business`. It must not be copied blindly.

### Minimal strategy

1. Resolve the current user from backend-owned account data.
2. Map `account_type === "professional"` to canonical `business`.
3. Map homeowner accounts to canonical `homeowner`.
4. Confirm the resolved role is authorized for the Conversation participant.
5. Persist the canonical value in `messages.sender_role`.
6. Return it without recalculating it relative to the viewer.

Existing frontend role inference remains untouched until a separate adoption
phase.

## 8. Conversation ID Strategy

`conversationId` must represent a persisted relationship, not the current
frontend storage key.

### Minimal strategy

1. Determine whether a Conversation table already exists in production.
2. If it exists, use its immutable ID and participant records.
3. If absent, define an additive Conversation record linked to:
   - the authoritative Project
   - the homeowner participant
   - the professional participant
   - the legacy quote request when applicable
4. Add an authoritative link from the message to that Conversation.
5. During compatibility, resolve legacy `quote_request_id` to a Conversation
   through a backend-owned unique link.
6. Reject ambiguous or unauthorized links.

Do not set `conversation_id = quote_request_id`. A compatibility link may
reference the quote request, but the identity domains remain separate.

## 9. Project ID Strategy

`projectId` must come from the workflow Project aggregate.

### Minimal strategy

1. Determine whether a canonical Project table exists in production.
2. Distinguish it from `contractor_projects`, which currently appears to own
   portfolio/gallery projects.
3. Establish an explicit backend-owned quote-request-to-Project link.
4. Require each canonical Conversation to reference one Project.
5. Copy the verified Project ID onto new message and event records as an
   immutable snapshot/reference.
6. Leave the field null for legacy records whose Project cannot be proven.

Do not promote `quote_request_id`, `contractor_project.id`, or
`conversation_id` into Project identity.

## 10. Canonical Event ID Strategy

Message identity and workflow event identity must remain distinct.

### Recommended policy

- Keep the existing message ID as `data.id`.
- Generate a separate collision-resistant event ID at the backend command
  boundary.
- Persist it once with the canonical `MESSAGE_CREATED` event.
- Link the message through `canonical_event_id`.
- Reuse the same event ID on idempotent replay.
- Return both IDs.

The generator should use the backend/database's approved UUID mechanism or
another collision-resistant opaque ID. Serial legacy `workflow_events.id` can
remain for legacy rows but should not silently become the canonical policy.

## 11. Idempotency Strategy

### Request compatibility

Initially accept an optional:

```text
Idempotency-Key
```

header or an additive `idempotency_key` request field. Prefer one documented
transport before implementation.

Do not require it from old clients during the compatibility period.

### Backend behavior

For requests with a key:

1. scope uniqueness to authenticated sender plus message-create operation
2. compute a stable request fingerprint from identity and message command
   fields
3. begin a database transaction
4. lock or claim the idempotency key
5. return the original accepted message/event for an identical replay
6. reject reuse with a different fingerprint
7. persist message, canonical event, and idempotency result atomically
8. preserve original IDs and timestamps on replay

Requests without a key continue legacy behavior until frontend adoption.
They must be reported as non-idempotent and not declared fully canonical.

## 12. Recommended Minimal Patch Sequence

### Step 0: Production schema audit

- capture table definitions, constraints, indexes, timestamp types, and row
  counts
- identify any existing Conversation, Project, or idempotency records
- confirm production source/deployment alignment

Stop if the production schema conflicts with repository assumptions.

### Step 1: Backend characterization tests

Before code changes, add tests that freeze:

- current POST request acceptance
- JWT-derived sender ID
- ignored client sender ID
- current response shape and `data.id`
- current GET response shape and ordering
- current lack of authorization as an explicit failing security test

No schema behavior should be changed in this step.

### Step 2: Participant authorization

- authorize POST and GET through existing quote-request ownership relations
- validate receiver participation
- preserve endpoint paths and successful response shapes

This security correction should precede canonical event adoption.

### Step 3: Nullable schema foundation

- add nullable canonical columns
- add or link authoritative Conversation/Project records only after schema
  ownership is approved
- add non-blocking indexes
- make no historical guesses

### Step 4: Additive identity resolution

- resolve Conversation and Project through backend-owned relationships
- resolve canonical sender role from account/authorization data
- populate canonical columns only on safe new writes
- preserve legacy writes when authority is unavailable during controlled
  rollout

### Step 5: Additive response projection

- retain `data` and all existing fields
- add optional `canonical` creation result
- add optional canonical fetch projection
- instrument missing identity without logging message content

### Step 6: Optional idempotency

- accept idempotency key from upgraded clients
- enforce replay/conflict behavior for keyed requests
- keep unkeyed legacy requests working

### Step 7: Atomic canonical event shadow persistence

- for fully authoritative keyed plain-text messages only, persist
  `MESSAGE_CREATED` in the same transaction
- do not change frontend rendering or legacy workflow-card behavior
- return the event in the additive canonical response

### Step 8: Read reconciliation and coverage

- compare creation and fetch identity
- report canonical coverage, legacy-only rows, conflicts, and replay behavior
- exclude message content from diagnostics

### Step 9: Enforcement decision

Only after measured compatibility:

- decide when upgraded clients must send an idempotency key
- decide when Conversation/Project identity becomes required
- decide whether a canonical Conversation endpoint can supersede the legacy
  quote-request endpoint

Those decisions are outside the minimal compatibility patch.

## 13. Rollback Strategy

Each stage must be independently reversible.

### Application rollback

- keep a feature flag around canonical identity resolution and event writes
- disable additive canonical projection without changing legacy responses
- disable canonical event insertion while retaining message persistence
- preserve old endpoint paths and request parsing

### Database rollback

- initially leave added columns nullable
- do not drop columns during emergency rollback
- stop writing new fields rather than deleting collected data
- avoid destructive down migrations
- keep canonical event and idempotency records append-only

### Failure behavior

Before canonical authority is enabled:

- failure in optional canonical enrichment may fall back to legacy message
  persistence only if explicitly configured and reported

After a path is declared canonical:

- message and canonical event must commit or roll back together
- never acknowledge a canonical message with a missing event

### Deployment rollback

- retain the previous deployable backend revision
- verify old code tolerates nullable added columns and additive tables
- test rollback against the migrated schema before production rollout

## 14. Test Strategy

The backend currently has no test suite; its `npm test` script is a failing
placeholder. Tests must be established before implementation.

### Test harness

Use the existing Node/Express stack with:

- an isolated PostgreSQL test database
- HTTP-level route tests
- transaction reset between tests
- JWT fixtures for homeowner, professional, unrelated user, and invalid user

Package selection is an implementation decision for Phase 4. No package
should be added until the test approach is approved.

### Required compatibility tests

- old POST body still succeeds
- `data.id` remains present
- extra client sender ID cannot override JWT sender
- old GET path and `messages` array remain present
- existing snake_case fields remain unchanged
- ordering remains ascending by persisted creation time
- unknown additive response fields do not affect frontend contract fixtures

### Required authorization tests

- homeowner participant can post and fetch
- assigned professional participant can post and fetch
- unrelated authenticated user is denied
- invalid receiver is denied
- mismatched Project/Conversation link is denied

### Required identity tests

- sender role is backend-derived
- Project and Conversation IDs come from persisted relationships
- no cross-domain ID substitution occurs
- creation and fetch return identical authority fields
- server timestamp is valid and stable

### Required idempotency tests

- first keyed request creates one message and event
- identical retry returns the same IDs and timestamp
- conflicting replay is rejected
- concurrent identical requests create one result
- unkeyed legacy request retains old behavior during compatibility

### Required transaction tests

- event failure rolls back canonical message creation
- message failure produces no event
- retry after transport failure returns the original result

### Required migration tests

- migration applies to a representative production-schema clone
- legacy rows remain readable
- nullable additions do not rewrite or reject old rows
- indexes and constraints do not fail on legacy nulls
- previous backend revision can run against the additive schema

## Risk Table

| Area | Risk | Control |
| --- | --- | --- |
| Unknown production schema | Critical | Inspect and capture schema before writing migrations |
| Participant authorization change | High | Add route tests and stage before canonical writes |
| Conversation identity ownership | High | Require persisted relationship; prohibit request-ID substitution |
| Project identity ownership | High | Require explicit aggregate link; distinguish portfolio projects |
| Sender role normalization | Medium | Resolve from backend account/authorization records and snapshot |
| Frontend response compatibility | Low | Preserve `data`, `data.id`, existing rows, and endpoint paths |
| Nullable column additions | Low to Medium | Inspect types/volume; avoid defaults and premature constraints |
| Idempotency concurrency | High | Database uniqueness, transaction, locking, and concurrent tests |
| Message/event atomicity | High | One database transaction |
| Historical backfill | High | Backfill only proven links; leave unknown identity null |
| Rollback after schema addition | Medium | Additive schema, nullable fields, feature flags, no destructive down migration |
| Legacy workflow-card behavior | Medium | Keep `/workflow-events` unchanged during Message migration |

## Decisions Required Before Implementation

The implementation must stop for human review if:

- no canonical Project owner can be identified
- no canonical Conversation owner can be identified
- deployed schema differs materially from source assumptions
- professional role normalization is ambiguous
- the authoritative deployment/database cannot be identified
- message/event transaction ownership cannot be established

These are ownership decisions, not values that code should infer.

## Exact Backend Phase 4 Task

**Backend Phase 4 - Production Schema and Compatibility Test Foundation**

Mission:

1. capture the deployed PostgreSQL definitions for:
   - `messages`
   - `quote_requests`
   - `users`
   - `contractor_profiles`
   - `workflow_events`
   - any Project, Conversation, participant, or idempotency tables
2. document columns, types, defaults, constraints, foreign keys, indexes, row
   counts, and timestamp behavior
3. verify which deployment and database are authoritative
4. add a backend test harness only after the schema evidence is captured
5. write characterization tests for current message routes without changing
   behavior

Deliver:

```text
docs/KnowledgeBase/BACKEND_DATABASE_RELATIONSHIP_AUDIT.md
docs/KnowledgeBase/BACKEND_MESSAGE_COMPATIBILITY_TEST_PLAN.md
```

Phase 4 must not add canonical columns or change route behavior. The first
schema patch should begin only after Phase 4 proves the exact additive
migration is safe.

## Final Recommendation

Use a staged additive migration.

The safest first implementation work is not adding response fields. It is:

1. inspect the real schema
2. freeze current route behavior with tests
3. close participant authorization gaps
4. establish authoritative Conversation and Project relationships
5. add nullable identity/idempotency fields
6. add canonical response data
7. shadow-persist canonical `MESSAGE_CREATED` atomically

This order preserves the existing frontend while preventing apparently
complete but untrusted identity from becoming canonical.
