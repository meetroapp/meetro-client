# Backend Identity Readiness Audit

**Phase:** Conversation Phase 3T  
**Status:** Audit only  
**Migration decision:** BLOCKED  
**Migration risk:** HIGH  
**Runtime changes:** None

## Executive Summary

The current `meetro-client` repository does not contain the Meetro backend.
There is no:

- `server/index.js`
- backend message route
- backend Conversation route
- database model
- schema or migration
- message persistence implementation
- Conversation persistence implementation

The frontend calls an external Railway API:

```text
https://athletic-rebirth-production-0a28.up.railway.app
```

This audit can measure only the API fields that the current frontend sends or
consumes. It cannot verify database constraints, authorization, transaction
behavior, identity generation, idempotency, or persistence provenance.

The client-observable API suggests that backend message persistence exists,
because message creation can return an `id` and message reads can expose
`sender_id` and `created_at`. That evidence is insufficient for canonical
`MESSAGE_CREATED` authority.

## Evidence Reviewed

- `docs/KnowledgeBase/BACKEND_MESSAGE_IDENTITY_AUTHORITY_CONTRACT.md`
- `src/api.js`
- `src/utils/authFetch.js`
- `src/pages/ConversationThread.jsx`
- `src/pages/QuoteRequests.jsx`
- repository file inventory
- backend/framework/model/schema dependency search

No request was made for files outside `meetro-client`.

## Current Observable Message API

### Authentication

`authFetch` sends:

```text
Authorization: Bearer <token>
```

This shows that the endpoint receives an authentication credential. It does
not prove how the backend validates the token, resolves the principal, or
authorizes Conversation membership.

### Creation

The current client sends:

```js
POST /messages

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

The client considers the operation successful when:

```js
result.response.ok && result.data.data.id
```

Only the returned `id` is consumed. It is stored as `backendId` on the
optimistic frontend record.

### Fetch

The current client fetches:

```text
GET /messages/<selectedQuoteRequestId>
```

The mapping expects or tolerates:

- `id`
- `sender_id`
- `created_at`
- `message_type`
- `message_text`
- `image_url`
- workflow fields and payload

The fetch is keyed by quote-request identity, not canonical Conversation
identity.

## Requirement Status

| Requirement | Status | Gap | Risk |
| --- | --- | --- | --- |
| `messageId` | **PARTIAL** | Creation can return `data.id`, and fetch mapping expects `message.id`. The generator, uniqueness constraint, immutability, and retry behavior are not available for review. | Medium |
| `conversationId` | **MISSING** | Creation does not send it, fetch is request-keyed, and returned messages are not shown to carry an authoritative Conversation ID. | High |
| `projectId` | **MISSING** | Creation uses `quote_request_id`; no returned Project ID or authoritative request-to-Project relation is visible. | High |
| `senderId` | **PARTIAL** | Fetch mapping reads `sender_id`, and bearer authentication could supply authority. The backend derivation and creation response are unavailable. | Medium |
| `senderRole` | **MISSING** | The frontend uses workflow payload data or viewer-relative inference. No authorization-owned backend role snapshot is visible. | High |
| `createdAt` | **PARTIAL** | Fetch mapping reads `created_at`. Assignment, UTC format, immutability, and creation-response behavior cannot be verified. | Medium |
| idempotency | **MISSING** | No idempotency key is sent or consumed, and no replay/conflict contract is visible. | High |
| canonical event ID | **MISSING** | The message ID is returned, but no distinct or explicitly shared canonical event ID policy is visible. | High |
| canonical event envelope | **MISSING** | Message creation does not return `MESSAGE_CREATED` with canonical identity and provenance fields. | High |

## Authority Findings

### Message ID Authority

**Status: PARTIAL**

The external API returns a message-like `id`, which is stronger than the
frontend's temporary `msg-${Date.now()}` identifier.

Not verifiable:

- where the ID is generated
- whether it is collision-resistant
- whether the database enforces uniqueness
- whether retries return the same ID
- whether it is a message ID, event ID, or both
- whether fetch preserves it unchanged

The value may be a durable message entity ID, but it is not proven canonical
workflow event identity.

### Conversation ID Authority

**Status: MISSING**

The backend boundary visible to this client is keyed by `quote_request_id`.
The active `conversationId` comes from local frontend state and is not sent in
message creation.

No evidence shows:

- a persisted Conversation entity
- backend Conversation membership
- a Conversation-owned message fetch route
- `conversationId` returned with accepted or fetched messages

The current API cannot establish canonical Conversation provenance from the
observable contract.

### Project ID Authority

**Status: MISSING**

No canonical `projectId` is sent or returned. `quote_request_id` is a separate
entity identity and cannot be promoted into Project identity.

No backend Project model, Project/Conversation link, or validation logic is
available in this repository.

### Sender Identity Authority

**Status: PARTIAL**

Bearer authentication allows the backend to derive an authenticated sender,
and fetched messages expose `sender_id`.

The implementation is unavailable, so this audit cannot prove that:

- `sender_id` is always derived from the token
- a client-supplied sender cannot override it
- the sender is authorized for the message relationship
- creation returns the accepted sender identity

The frontend compares `sender_id` against a localStorage user ID for display.
That display comparison does not establish backend provenance.

### Sender Role Authority

**Status: MISSING**

The frontend derives `senderRole` from:

- persisted workflow payload, or
- the current viewer role, or
- the opposite of the current viewer role

No backend response field demonstrates an authorization-owned role snapshot.
Viewer-relative inference is incompatible with the canonical contract.

### Timestamp Authority

**Status: PARTIAL**

Fetched backend messages can expose `created_at`, which is a plausible
persistence timestamp.

Not verifiable:

- whether the backend or client assigns it
- whether it is UTC ISO-8601
- whether it is immutable
- whether creation returns it
- whether idempotent retries preserve it
- whether it is also canonical `recordedAt`

The frontend allows workflow payload `createdAt` to override backend
`created_at`, so the current read projection does not consistently preserve
backend timestamp authority.

### Message Persistence Authority

**Status: PARTIAL**

The external `/messages` endpoint appears to persist eligible messages.
Success produces a backend ID, and a later fetch can return message records.

Persistence implementation is not present, so this audit cannot verify:

- transaction boundaries
- write durability
- duplicate handling
- participant authorization
- deletion or mutation policy
- consistency between creation and fetch
- message/event atomicity

Messages that lack request/receiver prerequisites are marked sent locally,
which confirms that the current frontend has both backend and local-only
authority modes.

### Conversation Persistence Authority

**Status: MISSING**

No backend Conversation route, model, or persistence logic is present.
Frontend localStorage registries and active Conversation keys are compatibility
and navigation state, not backend Conversation authority.

The request-keyed message endpoint is not evidence of a persisted canonical
Conversation relationship.

## Readiness Matrix

| Identity area | Status | Evidence quality |
| --- | --- | --- |
| Message record identity | PARTIAL | Client-observed API field only |
| Conversation identity | MISSING | No API or backend evidence |
| Project identity | MISSING | No API or backend evidence |
| Authenticated sender | PARTIAL | Bearer request plus fetched sender field |
| Authorized sender role | MISSING | Frontend inference only |
| Persistence timestamp | PARTIAL | Fetched field without implementation |
| Message persistence | PARTIAL | External endpoint behavior inferred by client |
| Conversation persistence | MISSING | No backend artifact |
| Event identity | MISSING | No observable event contract |
| Idempotency | MISSING | No observable request or response support |

## Can the Backend Support Canonical `MESSAGE_CREATED` Migration?

**Not based on the current verifiable evidence.**

The external backend may contain capabilities that are not represented in this
repository, but those capabilities cannot be treated as present until the
actual routes, models, persistence logic, and API responses are reviewed.

The currently observable contract fails required canonical identity in four
decisive areas:

1. no authoritative `conversationId`
2. no authoritative `projectId`
3. no authorization-owned `senderRole`
4. no event ID and idempotency contract

Any one of these gaps blocks canonical writer migration.

## Exact Backend Changes Required

These are direct compliance gaps from
`BACKEND_MESSAGE_IDENTITY_AUTHORITY_CONTRACT.md`, not a new architecture
proposal.

### Required before shadow migration

1. Accept explicit `conversationId` and `projectId` for authenticated plain
   text creation.
2. Verify both values against persisted backend relationships.
3. Derive `senderId` from the authenticated principal.
4. derive and persist `senderRole` from backend authorization context.
5. Assign and return backend-owned UTC `createdAt`.
6. Return durable message ID and canonical event ID with a documented
   relationship.
7. Accept and enforce a collision-resistant idempotency key.
8. Return replay/conflict status for repeated idempotency keys.
9. Return the accepted `MESSAGE_CREATED` canonical envelope or every
   authoritative field needed to validate it without inference.
10. Return the same Project, Conversation, sender, role, ID, and timestamp
    values on message fetch.

### Required persistence evidence

1. Provide the actual message route implementation.
2. Provide the actual Conversation route and persistence implementation.
3. Provide the message, Conversation, Project-link, event, and idempotency
   model definitions.
4. Show uniqueness and relationship constraints.
5. Show transaction behavior between message and event persistence.
6. Show participant authorization checks.
7. Show timestamp assignment and serialization.

Until that evidence exists, these requirements remain **MISSING**, even if the
deployed service happens to implement some of them.

## Migration Risk

**HIGH**

| Risk area | Rating | Reason |
| --- | --- | --- |
| Message persistence | Medium | Observable external endpoint, implementation unavailable |
| Message identity | Medium | Returned ID exists, generation and replay unknown |
| Conversation identity | High | Absent from observable contract |
| Project identity | High | Absent; request ID cannot substitute |
| Sender identity | Medium | Plausible backend source, not proven |
| Sender role | High | Frontend-derived |
| Timestamp authority | Medium | Read field exists, ownership unknown |
| Event identity | High | No contract evidence |
| Idempotency | High | No contract evidence |
| Conversation persistence | High | No backend evidence |

## Final Classification

| Question | Result |
| --- | --- |
| Can current backend reality be fully audited from `meetro-client`? | **No** |
| Is message persistence observable? | **PARTIAL** |
| Is Conversation persistence verifiable? | **MISSING** |
| Does the observable API satisfy the canonical identity contract? | **No** |
| Can `MESSAGE_CREATED` migrate now? | **No** |
| Migration risk | **HIGH** |

The next valid action is to review the backend implementation or an approved
backend API/schema artifact. No canonical shadow writer should be added until
that review can verify all required identity authorities.
