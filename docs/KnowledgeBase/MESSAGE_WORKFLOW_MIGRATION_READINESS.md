# Message Workflow Migration Readiness

**Phase:** Conversation Phase 3R  
**Status:** Audit only  
**Runtime changes:** None  
**Workflow evaluated:** Authenticated plain-text `MESSAGE_CREATED`

## Decision

**Classification: BLOCKED**

**Migration risk: HIGH**

Authenticated plain-text Message remains the best candidate for the first
canonical writer migration, but it cannot migrate yet.

The specific blocking condition is:

> The authenticated `/messages` persistence boundary does not accept or
> return authoritative canonical `projectId` and `conversationId`.

The current request is keyed by `quote_request_id`, while ConversationThread
selects `conversationId` from local active state. Neither value proves the
project aggregate and Conversation relationship required by the canonical
event envelope.

Backend message identity, sender identity, and creation time are promising,
but they cannot compensate for missing project and Conversation authority.

## Scope

This audit covers only:

- authenticated plain-text messages
- `ConversationThread.sendMessage`
- `ConversationThread.addOutgoingMessage`
- backend `/messages` persistence
- backend message read mapping

It excludes:

- demo and local-only conversations
- image and attachment messages
- workflow cards
- schedule and completion cards
- emergency messages
- materials, approval, update, location, scan, and payment cards
- `/workflow-events` mirroring for workflow cards

## Current Message Flow

### 1. Conversation selection

ConversationThread obtains its active relationship token from:

```text
localStorage.activeConversationId
```

If unavailable, it uses:

```text
demo-homeowner-1
```

The token determines the local cache key:

```text
meetro_conversation_<conversationId>
```

This is navigation and projection state. It is not proof that the token was
created by canonical Conversation authority.

### 2. Optimistic message creation

`sendMessage` creates a local plain-text object:

```js
{
  id: `msg-${Date.now()}`,
  type: "text",
  sender: "me",
  senderRole: currentViewerRole,
  text,
  time,
  status: "sending",
  replyTo,
  createdAt: Date.now(),
}
```

The object is immediately appended to React state through
`addOutgoingMessage`.

This object is a presentation and optimistic-delivery record. It is not a
canonical event:

- `id` is timestamp-derived.
- `eventType` is absent.
- `projectId` is absent.
- `conversationId` is absent from the object.
- `actor` is absent.
- `actorRole` is represented by UI-owned `senderRole`.
- `recordedAt` is absent.
- `source` is absent.

### 3. Backend request

When a request and receiver are available, `addOutgoingMessage` sends:

```text
POST /messages
```

with:

```js
{
  quote_request_id,
  receiver_id,
  message_text,
  image_url,
  message_type,
  workflow_type,
  workflow_status,
  workflow_payload,
}
```

Authentication is supplied by the bearer token in `authFetch`.

For a plain-text message:

- `workflow_type` is normally absent.
- No `/workflow-events` mirror is created.
- The backend message endpoint is the durable persistence candidate.

The request does not explicitly contain:

- canonical `projectId`
- canonical `conversationId`
- canonical event ID or idempotency key
- actor role from authorization authority

### 4. Backend response

On success, the client currently consumes only:

```text
result.data.data.id
```

and adds it to the optimistic record as `backendId`.

The response handling does not consume or verify:

- `projectId`
- `conversationId`
- authenticated actor ID
- authorized actor role
- persistence-owned `recordedAt`
- canonical event ID
- idempotency result

### 5. Backend reads

Message reads use:

```text
GET /messages/<selectedQuoteRequestId>
```

The mapping can access:

- backend message `id`
- `sender_id`
- `created_at`
- `message_type`
- `workflow_payload`

However:

- sender direction is calculated by comparing `sender_id` to localStorage
  `userId`.
- actor role is read from payload or inferred relative to the current viewer.
- `created_at` is converted into legacy `createdAt`.
- canonical project and Conversation identity are still absent.
- payload identity can override the rendered message ID.

### 6. Rendering and cache

The same legacy message object powers:

- immediate chat rendering
- delivery status
- reply behavior
- unsend behavior
- local conversation cache
- polling replacement
- inbox metadata

Canonical adoption must preserve this shape or provide a projection that is
visually and behaviorally identical.

## Canonical Compatibility

| Canonical field | Current source | Compatibility | Authority result |
| --- | --- | --- | --- |
| `id` | Client `msg-${Date.now()}`; backend message ID after acceptance | Partial | Backend ID is durable, but no canonical event-ID or retry policy is declared. |
| `eventType` | Legacy `type: "text"` | Compatible through reconciliation | Can map safely to `MESSAGE_CREATED`. |
| `projectId` | `quote_request_id` relation | Not compatible | Request identity cannot become project identity without an authoritative link. |
| `conversationId` | Active local Conversation token and storage key | Structurally available | Not sent or returned as an authoritative backend relationship ID. |
| `actor` | Backend `sender_id` on reads | Promising | Potentially authoritative, but not returned and frozen at the write boundary. |
| `actorRole` | `currentViewerRole`, payload alias, or opposite-viewer inference | Structurally valid | UI-derived and not authorization-owned. |
| `recordedAt` | Client `createdAt`; backend `created_at` on reads | Promising | Backend time may qualify, but ownership is not declared at write response. |
| `source` | Not present | Easy to supply | `conversation-thread` would be valid but does not repair identity gaps. |
| `payload` | Legacy message object | Compatible | Must be minimized and cloned for canonical output. |

### Contract validation

`workflowEventFactory` could create a structurally valid `MESSAGE_CREATED` only
after an adapter supplies all required fields.

Today, that adapter would need to:

- promote request identity into project identity
- trust active local state as Conversation identity
- trust UI mode as actor role
- choose between client and backend timestamps
- choose between client and backend IDs

Those choices violate the ownership and provenance contracts. A factory event
created this way could be complete but untrusted.

## Identity Trust Matrix

| Field | Current trust | Reason | Required authoritative source |
| --- | --- | --- | --- |
| `projectId` | **MISSING / INFERRED** | Backend contract exposes `quote_request_id`, not canonical project identity. | Project aggregate or authoritative request-to-project link returned at message boundary. |
| `conversationId` | **FALLBACK** | Active local state and storage key identify the rendered thread. | Backend Conversation relationship accepted and returned by `/messages`. |
| `actor` | **PARTIAL** | Authenticated backend can know sender; current write response does not freeze actor evidence. | Authenticated sender principal returned with accepted message. |
| `actorRole` | **FALLBACK** | Current viewer mode and opposite-viewer inference own the value. | Authorization role snapshot returned at acceptance. |
| `recordedAt` | **PARTIAL** | Backend `created_at` exists on reads, but write response handling does not establish ownership. | Backend persistence timestamp returned with the accepted message. |

### Expected provenance result today

Representative current identity would contain at least:

- `projectId`: `MISSING` or `INFERRED`
- `conversationId`: `FALLBACK`
- `actorRole`: `FALLBACK`

Under `workflowIdentityProvenance`, any missing or fallback required field
produces `HIGH` migration risk and `trusted: false`.

## Evaluation

### 1. Event authority

**PARTIAL**

The backend message endpoint is the strongest existing candidate. For plain
text, there is no second `/workflow-events` write.

Authority is not complete because the client creates and renders its own
timestamp ID before backend acceptance, and the backend response does not
return a canonical event envelope or idempotency result.

### 2. Identity completeness

**BLOCKED**

The optimistic message has none of the five canonical identity fields in
approved form. Backend acceptance provides candidates for ID, actor, and
timestamp, but not canonical project or Conversation identity.

### 3. Identity provenance

**BLOCKED**

No reviewed message object contains the `identityProvenance` evidence required
by the provenance validator. More importantly, project and Conversation
authority cannot be proven from the current endpoint contract.

### 4. Actor ownership

**PARTIAL**

Bearer authentication means the backend can authoritatively identify the
sender. Current client behavior does not use the accepted response as actor
authority; it compares backend sender ID with localStorage user ID for display.

### 5. Conversation ownership

**BLOCKED**

Conversation identity is owned by active local UI state. The backend endpoint
is request-keyed and does not explicitly accept or return a canonical
Conversation relationship ID.

### 6. Timestamp ownership

**PARTIAL**

Backend `created_at` is the right kind of persistence timestamp candidate.
The current write response does not expose or consume it, and the optimistic
message remains driven by client `createdAt`.

### 7. Event ID ownership

**BLOCKED**

Client `msg-${Date.now()}` drives rendering and retries. Backend message ID is
added later as `backendId`. There is no approved rule stating:

- which value is canonical event `id`
- whether message entity ID and event ID may be the same
- how retries reuse identity
- how duplicate POSTs are handled

### 8. Persistence authority

**PARTIAL**

Authenticated `/messages` is a real backend persistence boundary for eligible
messages. It is not yet a canonical workflow-event persistence boundary.

Messages without receiver/request prerequisites still become locally
successful, so the current writer has two authority modes:

- backend persisted
- local-only fallback

Only the authenticated backend-persisted subset can ever be considered for
the first migration.

### 9. Rendering dependencies

**HIGH**

ConversationThread rendering and behavior depend on the optimistic legacy
shape and client ID:

- message keys and active selection use `id`
- backend success locates the optimistic message by client ID
- status and unsend behavior use client ID
- polling can replace local state with backend-mapped records
- backend mapping may restore the original payload ID
- role and side placement depend on legacy sender fields

Canonical adoption must not change ordering, side placement, status timing,
reply behavior, or message keys.

### 10. Migration risk

**HIGH**

The risk is driven by missing/fallback identity, unresolved event ID
ownership, dual local/backend authority modes, and rendering dependence on the
optimistic record.

## Migration Blockers

### Primary blocker

The `/messages` contract lacks authoritative canonical project and
Conversation identity.

This alone prevents migration because both fields are required by the
canonical envelope and must not be inferred from `quote_request_id`, active
selection, route state, or local storage.

### Additional blockers

1. No canonical event ID and idempotency contract.
2. Backend write response does not return actor, actor role, and persistence
   timestamp as authoritative evidence.
3. UI-owned `currentViewerRole` supplies actor role.
4. The optimistic message ID remains the rendering and status key.
5. Local-only messages bypass backend authority.
6. Polling and mapping can replace or reinterpret the optimistic record.
7. No frozen minimal `MESSAGE_CREATED` payload contract exists.
8. The backend message entity and canonical event relationship is undefined.

## Migration Risk

**Overall: HIGH**

| Area | Risk |
| --- | --- |
| Event semantics | Low |
| Payload complexity for plain text | Low |
| Project identity | High |
| Conversation identity | High |
| Actor identity | Medium |
| Actor role | High |
| Timestamp ownership | Medium |
| Event ID/idempotency | High |
| Persistence authority | Medium |
| Rendering dependency | High |

## Can `MESSAGE_CREATED` Become the First Canonical Writer Migration?

**Yes as the first candidate, but no under the current contract.**

It should remain first in migration order because:

- the event type is approved
- the semantics are simple
- authenticated backend persistence already exists
- backend actor and timestamp authority are achievable

It must not migrate until the backend message boundary carries authoritative
project and Conversation identity and defines event ID/idempotency ownership.

## Phase 3S Recommendation

Because Message is not ready, Phase 3S must not perform shadow migration in
ConversationThread.

### Exact task

**Conversation Phase 3S - Backend Message Identity and Authority Contract**

Create specification and pure validation only:

- `docs/KnowledgeBase/BACKEND_MESSAGE_IDENTITY_AUTHORITY_CONTRACT.md`
- `src/utils/messageCanonicalReadiness.js`
- `tests/messageCanonicalReadiness.test.js`

Phase 3S should define the required accepted-message response:

```js
{
  messageId,
  eventId,
  projectId,
  conversationId,
  senderId,
  senderRole,
  recordedAt,
  idempotencyKey,
  messageType,
}
```

The pure readiness utility should:

- accept supplied request and response objects only
- perform no network, storage, UI, or writer work
- reject `quote_request_id` as project identity
- reject active local state as Conversation authority
- require backend-authenticated sender evidence
- require backend-authorized role evidence
- require persistence-owned UTC `recordedAt`
- require explicit event ID and idempotency policy
- distinguish message entity ID from workflow event ID
- use the existing resolver and provenance validator without weakening them
- return field trust, blockers, and migration risk

Only after Phase 3S can produce `trusted: true` and `LOW` risk for a
representative accepted plain-text message should a later phase add a
development-only factory comparison after successful `/messages` persistence.

## Final Classification

| Workflow | Classification | Migration Risk | Next action |
| --- | --- | --- | --- |
| Authenticated plain-text `MESSAGE_CREATED` | **BLOCKED** | **HIGH** | Define and validate the backend identity/authority response contract in Phase 3S. |
