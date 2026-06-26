# Backend Message Route Authority Audit

**Phase:** Backend Discovery Phase 2  
**Status:** Source-level audit only  
**Backend source:** `https://github.com/meetroapp/metro-server`  
**Backend revision reviewed:** `main` at `feb94b4`  
**Migration decision:** BLOCKED  
**Migration risk:** HIGH  
**Runtime changes:** None

## Executive Summary

The current backend provides real authenticated PostgreSQL persistence for
messages, but it cannot support canonical `MESSAGE_CREATED` authority.

One important requirement is already satisfied:

- `POST /messages` derives `sender_id` from the verified JWT principal through
  `req.user.id`.

The route does not read a client-supplied sender ID, so a request-body
`sender_id` or `senderId` does not control the persisted sender.

The decisive gaps are:

- no persisted `conversationId`
- no canonical `projectId`
- no persisted authorization-time `senderRole`
- no participant or request-membership authorization
- no idempotency
- no canonical event ID or `MESSAGE_CREATED` envelope
- no atomic message/event persistence

The separate `workflow_events` table is a legacy workflow projection keyed by
`quote_request_id`. It does not implement the canonical event envelope.

## Scope and Evidence

Reviewed from the public `meetroapp/metro-server` repository:

- `index.js`
- `package.json`
- `POST /messages`
- `GET /messages/:quoteRequestId`
- `POST /workflow-events`
- `GET /workflow-events/:quoteRequestId`
- JWT creation and `authMiddleware`

Compared against:

- `BACKEND_MESSAGE_IDENTITY_AUTHORITY_CONTRACT.md`
- `BACKEND_SOURCE_INVENTORY.md`

The separate local backend folder named in the task was not accessed because
the active workspace boundary remains `meetro-client`. The authoritative
public source was inspected read-only.

## Route Summary

### JWT authority

JWTs contain:

```js
{
  id: user.id,
  email: user.email,
  role: user.role
}
```

`authMiddleware` verifies the token and assigns its decoded claims to:

```js
req.user
```

### `POST /messages`

The route accepts:

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

It inserts:

```text
quote_request_id
sender_id = req.user.id
receiver_id
message_text
image_url
message_type
workflow_type
workflow_status
workflow_payload
```

It returns the inserted row through `RETURNING *`.

### `GET /messages/:quoteRequestId`

The route selects every message matching the supplied
`quote_request_id`, joins sender email, and orders by `messages.created_at`.

The route requires a valid JWT but does not verify that the requesting user is
the homeowner, contractor, sender, receiver, or other authorized participant.

### Workflow event routes

`POST /workflow-events` and `GET /workflow-events/:quoteRequestId` operate on a
separate `workflow_events` table.

The table is created at request time with:

```text
id
quote_request_id
user_id
workflow_type
workflow_status
workflow_payload
event_label
created_at
```

Message creation does not call or transactionally persist this event. The
frontend decides whether to make a second request for workflow-card messages.
Plain text messages do not produce `MESSAGE_CREATED`.

## Requirement Evaluation

| Requirement | Current Backend Behavior | Status | Risk |
| --- | --- | --- | --- |
| Sender ID comes from authentication | `sender_id` is inserted from `req.user.id` after JWT verification. | **READY** | Low |
| Client sender ID cannot override authority | The route does not destructure or insert `sender_id`/`senderId` from the body. Extra body fields are ignored by the insert. | **READY** | Low |
| Message ID is backend-issued | PostgreSQL returns the inserted message row and its `id`; schema and retry uniqueness are unavailable. | **PARTIAL** | Medium |
| Persist `senderRole` | No message role column is inserted. JWT `role` exists but is not normalized, validated for canonical roles, or snapshotted on the message. | **MISSING** | High |
| Persist `conversationId` | No Conversation field, route, table, or relationship is present. Messages are grouped by `quote_request_id`. | **MISSING** | High |
| Persist `projectId` | No canonical Project field or relation is used. Quote-request identity is not Project identity. | **MISSING** | High |
| Backend/database assigns `createdAt` | The insert omits `created_at`, fetch orders by it, and `RETURNING *` can return it. The absent message schema prevents proof of its default, type, timezone, and immutability. | **PARTIAL** | Medium |
| Creation returns authoritative fields | `RETURNING *` returns the current message row, including likely ID/timestamp, but cannot return absent Conversation, Project, role, event, or idempotency fields. | **PARTIAL** | High |
| Fetch returns authoritative fields | Fetch returns message columns plus sender email. It cannot return absent Conversation, Project, role, event, or provenance fields. | **PARTIAL** | High |
| Participant authorization | JWT validity is checked, but quote-request ownership, Conversation membership, sender/receiver relationship, and receiver validity are not checked. | **MISSING** | Critical |
| Idempotency | No key, uniqueness rule, replay response, request fingerprint, or conflict behavior exists. | **MISSING** | High |
| Canonical `MESSAGE_CREATED` persistence | Message insertion does not persist or emit a canonical event. | **MISSING** | High |
| Atomic message/event persistence | Messages and workflow events use independent HTTP requests and independent inserts with no transaction. | **MISSING** | High |
| Canonical workflow event envelope | `workflow_events` lacks canonical Project, Conversation, actor role, source, payload contract, metadata, migration source, and strict event registry. | **MISSING** | High |

## Required Questions

### 1. Does `POST /messages` derive `senderId` from JWT?

**Yes. READY.**

The insert uses:

```js
req.user.id
```

`req.user` is populated only after JWT verification.

This establishes backend-authenticated sender identity for the current
request, subject to the token's validity and signing configuration.

### 2. Does it accept or ignore client `senderId`?

**It ignores client sender identity. READY.**

Neither `sender_id` nor `senderId` is extracted from `req.body` or included as
a client-controlled SQL parameter.

### 3. Does it persist `senderRole`?

**No. MISSING.**

The JWT contains a `role` claim, but the message insert does not persist it.
The current role values can also represent business categories rather than
the canonical `business` role, so copying the claim without an authorization
mapping would not satisfy the contract.

### 4. Does it persist `conversationId`?

**No. MISSING.**

There is no Conversation entity or Conversation foreign key. The route uses
`quote_request_id`, which cannot become canonical Conversation identity.

### 5. Does it persist `projectId`?

**No. MISSING.**

No canonical project aggregate or project relation appears in the message
path. The separate `contractor_projects` table represents portfolio projects,
not proven workflow Project authority.

### 6. Does it assign `createdAt` through the backend/database?

**Probably, but only PARTIAL evidence exists.**

The route does not send a timestamp into the insert, and the fetch route
depends on `messages.created_at`. This strongly indicates a database default.

The `messages` table definition is absent, so the audit cannot verify:

- the default expression
- timestamp timezone behavior
- immutability
- UTC serialization
- replay stability

### 7. Does creation return all authoritative fields?

**No. PARTIAL.**

`RETURNING *` returns all existing message columns. That is useful for ID and
timestamp acknowledgement, but required fields do not exist:

- `conversationId`
- `projectId`
- `senderRole`
- canonical event ID
- idempotency result
- canonical event envelope

### 8. Does fetch return all authoritative fields?

**No. PARTIAL.**

The fetch returns persisted message columns and sender email. It cannot return
identity that is not stored and does not return an immutable authorization
role snapshot.

### 9. Are participant permissions checked?

**No. MISSING.**

The routes authenticate the caller but do not authorize the requested
relationship.

`POST /messages` does not verify:

- the quote request exists
- the sender owns or is assigned to the quote request
- the receiver participates in the quote request
- sender and receiver form the approved relationship

`GET /messages/:quoteRequestId` does not restrict results to an authorized
homeowner or contractor. Any authenticated user who can supply a quote request
ID reaches the query.

This is the highest-severity current route gap.

### 10. Is idempotency supported?

**No. MISSING.**

Each repeated POST executes a new insert. There is no idempotency key,
uniqueness rule, replay response, or conflicting-retry detection.

### 11. Is a canonical workflow event emitted or persisted?

**No. MISSING.**

`POST /messages` only inserts the message.

The separate `/workflow-events` endpoint is invoked by the frontend for
workflow cards, not atomically by message creation. Plain text messages do not
persist `MESSAGE_CREATED`.

### 12. Does `workflow_events` support the canonical envelope?

**No. MISSING.**

Current-to-canonical comparison:

| Canonical field | Current workflow-event field | Result |
| --- | --- | --- |
| `id` | serial database `id` | Partial entity identity; no idempotency policy |
| `eventType` | client-supplied `workflow_type` | No approved registry or strict canonical naming |
| `projectId` | absent | Missing |
| `conversationId` | absent | Missing |
| `actor` | JWT-derived `user_id` | Structurally promising |
| `actorRole` | absent | Missing |
| `recordedAt` | database `created_at` | Partial; timestamp type lacks timezone declaration |
| `source` | absent | Missing |
| `payload` | `workflow_payload` | Present but untyped and client-controlled |
| `legacy` | absent | Optional |
| `metadata` | absent | Optional |
| `migrationSource` | absent | Optional |

The table is also created inside both POST and GET request handlers rather
than through a versioned schema migration.

## Can the Current Backend Support Canonical `MESSAGE_CREATED`?

**No.**

It can authoritatively persist:

- a backend message row
- an authenticated sender ID
- likely a database-created message ID
- likely a database-created timestamp

It cannot establish the complete canonical identity or provenance required by
the contract.

Current classification:

```text
BLOCKED / HIGH migration risk
```

Participant authorization is a Critical route risk independent of canonical
event migration.

## Exact Backend Changes Required First

The first required changes are the direct gaps in the existing authority
contract:

1. Establish persisted Conversation identity and participant membership.
2. Establish the authoritative Project link for each Conversation.
3. Require and verify the Conversation/Project relationship during message
   creation.
4. Authorize both message creation and fetch against the authenticated
   participant.
5. Persist an authorization-owned canonical sender role snapshot.
6. Define and enforce message-command idempotency.
7. Persist one canonical `MESSAGE_CREATED` event for an accepted plain-text
   message.
8. Make message and event persistence atomic.
9. Return the complete authoritative message, event, and idempotency result.
10. Preserve current legacy fields and response behavior during frontend
    compatibility.

The missing database schema must be captured before these changes are
implemented so current constraints and defaults are not guessed.

## Is a Minimal Backend Patch Possible Without Breaking Frontend?

**Yes, but not as a route-only identity shortcut.**

A backward-compatible implementation is possible because:

- the existing request fields can remain accepted
- `data.id` can remain available at its current response location
- existing snake_case message fields can remain in the returned row
- additional identity/event data can be additive
- `GET /messages/:quoteRequestId` can remain temporarily as a legacy endpoint

However, adding `conversationId` and `projectId` by copying
`quote_request_id`, trusting client values, or synthesizing IDs in the route
would violate the authority contract.

The safe minimum therefore requires real persistence and authorization
prerequisites, not merely extra JSON response properties.

## Backend Phase 3 Recommendation

**Backend Discovery Phase 3 - Database Schema and Relationship Audit**

This must remain audit-only.

Required evidence:

- actual `messages` table definition
- `quote_requests` table definition and foreign keys
- `users` and `contractor_profiles` role relationships
- `workflow_events` deployed definition
- all indexes and uniqueness constraints
- database timestamp types and defaults
- existing Conversation or Project tables not represented in source
- production migration history, if any

Phase 3 should create:

```text
docs/KnowledgeBase/BACKEND_DATABASE_RELATIONSHIP_AUDIT.md
```

It should determine whether the current database can support additive
Conversation, Project-link, role-snapshot, event, and idempotency authority
without destructive migration. It must not change the schema.

## Final Decision

| Question | Answer |
| --- | --- |
| Authenticated sender authority present? | Yes |
| Client sender override possible through current insert? | No |
| Complete canonical identity present? | No |
| Participant authorization present? | No |
| Idempotency present? | No |
| Canonical `MESSAGE_CREATED` persisted? | No |
| Minimal backward-compatible path possible? | Yes, after persistence and authorization prerequisites |
| Current migration readiness | **BLOCKED** |
| Migration risk | **HIGH** |
