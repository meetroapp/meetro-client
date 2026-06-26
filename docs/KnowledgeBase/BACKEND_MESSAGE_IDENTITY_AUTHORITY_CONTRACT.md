# Backend Message Identity Authority Contract

**Phase:** Conversation Phase 3S  
**Status:** Required architecture contract  
**Scope:** Authenticated plain-text message creation and retrieval  
**Runtime impact:** None  
**Backend implementation reviewed:** Not present in this repository

## Authority

This document defines the backend identity and provenance contract that must
exist before `MESSAGE_CREATED` can move toward canonical writer authority.

It is subordinate to:

- `CANONICAL_WORKFLOW_EVENT_ENVELOPE.md`
- `WORKFLOW_IDENTITY_OWNERSHIP_SPEC.md`

Current frontend behavior does not override this contract. Where the current
`/messages` API differs, that API is not migration-ready.

## Scope

This contract applies first to authenticated plain-text messages.

It does not authorize migration of:

- local or demo messages
- image or attachment messages
- workflow cards
- emergency cards
- appointment, quote, completion, materials, payment, or work events
- the current `/workflow-events` mirror

Those paths require separate payload and authority reviews.

## Current Boundary

`ConversationThread` currently creates an optimistic message with a
timestamp-derived client ID and sends:

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

The client consumes only `data.id` from the accepted response. Reads use:

```text
GET /messages/<quoteRequestId>
```

The reviewed frontend can receive backend message identity, sender identity,
and `created_at`, but the API contract does not establish:

- canonical `projectId`
- canonical `conversationId`
- canonical workflow event `id`
- authorized `senderRole`
- idempotency behavior
- persistence-owned `recordedAt` at message acceptance

No backend route implementation is present in `meetro-client`, so these
requirements cannot be verified against server behavior in this phase.

## 1. Backend Ownership of Message Identity

The backend message boundary owns the durable message record and the
authoritative acceptance result.

For an authenticated message command, the backend must:

1. authenticate the sender
2. authorize the sender for the Conversation
3. resolve the Conversation's authoritative Project link
4. validate the recipient as a Conversation participant
5. create or replay one durable message record
6. create or identify one canonical `MESSAGE_CREATED` event occurrence
7. assign the authoritative persistence timestamp
8. return the complete accepted identity envelope

The frontend may create a temporary optimistic ID. That ID remains presentation
state and must not become canonical message or event identity.

### Separate identities

The following values are distinct:

| Identity | Owner | Purpose |
| --- | --- | --- |
| `messageId` | Backend message store | Durable message entity |
| `eventId` | Canonical event command/persistence boundary | One `MESSAGE_CREATED` occurrence |
| `conversationId` | Conversation authority | Relationship timeline |
| `projectId` | Project aggregate authority | Owning project workflow |
| `idempotencyKey` | Client command plus backend enforcement | Retry identity |

The backend may use the same opaque value for `messageId` and `eventId` only
if that is an explicit, permanent API policy and one-to-one uniqueness is
enforced. Otherwise, they must remain separate.

## 2. Required Backend Message Fields

Every accepted and fetched message must expose these authoritative fields:

| Field | Type | Authority rule |
| --- | --- | --- |
| `id` | Non-empty opaque string | Backend-issued durable message identity |
| `conversationId` | Non-empty opaque string | Read from the persisted Conversation relationship |
| `projectId` | Non-empty opaque string | Read from the persisted Project/Conversation link |
| `senderId` | Non-empty opaque string | Derived from the authenticated principal |
| `senderRole` | `homeowner` or `business` | Snapshot from backend authorization context |
| `createdAt` | UTC ISO-8601 string | Assigned by backend persistence at first acceptance |

The backend must not accept client claims as authority for:

- `senderId`
- `senderRole`
- `createdAt`
- Project ownership
- Conversation membership

`quote_request_id`, route state, message text, customer name, title, and
frontend localStorage are not substitutes for `projectId` or
`conversationId`.

## 3. Mapping to the Canonical Envelope

The accepted message maps to `MESSAGE_CREATED` as follows:

| Backend message value | Canonical field | Rule |
| --- | --- | --- |
| `eventId` | `id` | Immutable canonical event occurrence ID |
| literal `MESSAGE_CREATED` | `eventType` | Backend-approved event type |
| `projectId` | `projectId` | Preserved without conversion |
| `conversationId` | `conversationId` | Preserved without conversion |
| `senderId` | `actor` | Stable authenticated principal, not display name |
| `senderRole` | `actorRole` | Authorization snapshot at acceptance |
| `createdAt` | `recordedAt` | Backend-owned acceptance timestamp |
| registered backend module | `source` | Stable value such as `backend-message` |
| message identity/type | `payload` | Minimal immutable message facts |

`senderName` may be returned as display metadata, but it must not replace
`senderId` as canonical `actor`.

The minimum canonical payload is:

```js
{
  messageId,
  messageType
}
```

Message content is not required in the workflow event payload. Avoiding it
reduces duplication and prevents audit or timeline projections from becoming
an additional content store.

## 4. Message Creation API Contract

### Required request

The future authenticated plain-text request must contain:

```js
{
  conversationId,
  projectId,
  receiverId,
  messageType: "text",
  messageText,
  idempotencyKey
}
```

Rules:

- `conversationId` and `projectId` are explicit command context.
- The backend verifies both against persisted ownership; their presence is not
  sufficient proof.
- `receiverId` must be a participant in the Conversation.
- `senderId` and `senderRole` must not be trusted from request body fields.
- `idempotencyKey` is required for every authenticated creation attempt.
- The backend may temporarily accept `quote_request_id` for legacy routing,
  but it cannot use it as canonical Project or Conversation identity.

### Required success response

The response must return one complete accepted record:

```js
{
  data: {
    message: {
      id,
      conversationId,
      projectId,
      senderId,
      senderName,
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
      source,
      payload
    },
    idempotency: {
      key,
      replayed
    }
  }
}
```

`event.id` is the canonical event ID. `message.id` is the message entity ID.
The event payload must reference `message.id`.

The response must use the same identity and timestamp values that future reads
return. It must not require the frontend to reconstruct actor, role, Project,
Conversation, or recording time.

### Required failure behavior

The backend must reject the command without partial event creation when:

- authentication is absent or invalid
- the sender is not a Conversation participant
- the receiver is not a valid participant
- the Project/Conversation link is missing or conflicting
- `projectId` or `conversationId` is missing
- `idempotencyKey` is missing or invalid
- an idempotency key is reused with a different command body

Errors must identify a machine-readable reason without returning message
content in diagnostic metadata.

## 5. Message Fetch API Contract

The canonical fetch boundary must be Conversation-owned:

```text
GET /conversations/<conversationId>/messages
```

Every returned message must include:

```js
{
  id,
  conversationId,
  projectId,
  senderId,
  senderName,
  senderRole,
  receiverId,
  messageType,
  createdAt
}
```

The API may include message content and attachment fields required by the
message UI. Those fields do not become canonical envelope identity.

Fetch requirements:

- authorize the requesting participant against `conversationId`
- return only messages belonging to that Conversation
- return the persisted `projectId` link explicitly
- return immutable sender role and creation time snapshots
- use a deterministic backend ordering rule
- never require viewer-relative actor or role inference
- preserve IDs and timestamps returned by creation

The current request-keyed endpoint may remain during compatibility work, but
it is not sufficient canonical Conversation authority.

## 6. Idempotency Policy

One user send action must produce at most:

- one message record
- one `MESSAGE_CREATED` event

Rules:

1. The client creates a collision-resistant `idempotencyKey` once per send
   command.
2. Retries reuse the same key.
3. The backend scopes uniqueness to the authenticated sender and operation.
4. The first accepted command stores the request fingerprint and result.
5. An identical retry returns the original message, event, and `createdAt`
   with `replayed: true`.
6. Reuse with conflicting content or identity returns an idempotency conflict.
7. Network failure after acceptance must be recoverable by retrying the same
   key.
8. Message and event IDs must not be regenerated during replay.
9. Text, display time, title, or client timestamp must not deduplicate sends.

The retention period for idempotency records must cover all supported client
retry and offline replay windows.

## 7. Timestamp Authority Policy

The backend persistence boundary owns both accepted timestamps:

- message `createdAt`
- event `recordedAt`

For native `MESSAGE_CREATED`, both may contain the same UTC instant because
the event records acceptance of the message. If backend processing assigns
different instants, both must be returned and preserved with their distinct
meanings.

Rules:

- use UTC ISO-8601 with stable precision
- assign once on first acceptance
- preserve on idempotent replay
- preserve on fetch
- do not replace with client `Date.now()`
- do not use localized display time
- retain client-observed send time only as optional metadata

## 8. Project and Conversation Provenance

### Conversation provenance

`conversationId` is authoritative only when it identifies a persisted
Conversation relationship and the authenticated sender is an authorized
participant.

### Project provenance

`projectId` is authoritative only when it comes from the canonical Project
aggregate or an explicit backend-owned Conversation-to-Project link.

### Required relationship

Before accepting a message, the backend must verify:

```text
conversationId -> persisted Conversation -> projectId
```

If the request also supplies `projectId`, it must exactly match the persisted
link. A mismatch is a conflict, not a value to reconcile.

Forbidden provenance:

- treating `quote_request_id` as `projectId`
- treating `conversationId` as `projectId`
- deriving identity from an active frontend selection
- deriving identity from a storage key
- matching by title, customer name, address, content, or timestamp

## 9. Local Fallback Policy

Offline, demo, and local prototype messages may continue to support the
existing UI, but they remain non-canonical.

They must be classified as:

```text
LOCAL_ONLY
```

Local fallback rules:

- may use temporary client IDs
- may use client timestamps for display
- must not claim authoritative `projectId`, `conversationId`, actor role, or
  `recordedAt`
- must not emit or persist a canonical `MESSAGE_CREATED` event
- must not be included in canonical migration coverage
- must retain an idempotency key if later backend submission is supported
- becomes canonical only after backend acceptance returns the full contract
- failed or abandoned local messages remain legacy presentation records

The frontend must never silently promote a local fallback into canonical
authority.

## 10. Migration Blockers

### Must fix before any message writer shadow migration

- The backend must accept and verify canonical `projectId`.
- The backend must accept and verify canonical `conversationId`.
- The backend must return both identities on creation and fetch.
- The backend must return authenticated `senderId`.
- The backend must return authorization-owned `senderRole`.
- The backend must return persistence-owned UTC `createdAt`.
- The backend must define separate message and canonical event IDs.
- The backend must enforce and return idempotency results.
- The backend must return a canonical `MESSAGE_CREATED` envelope or enough
  authoritative fields to construct one without inference.
- The backend must reject conflicting Project/Conversation provenance.

### Must fix before writer authority migration

- A shadow validator must show authoritative provenance for every required
  field.
- Optimistic rendering must remain keyed independently from canonical event
  authority until UI adoption is separately approved.
- Backend replay must not create duplicate messages or events.
- Polling/fetch must preserve the accepted identities and timestamps.
- Local-only behavior must remain explicitly outside canonical authority.
- Plain text must be isolated from workflow-card and attachment behavior.

## Message Identity Readiness Checklist

- [ ] Backend message route implementation is available for review.
- [ ] Message `id` is opaque, durable, and backend-issued.
- [ ] Canonical event `id` is explicit and immutable.
- [ ] Message ID and event ID relationship is documented.
- [ ] `conversationId` comes from Conversation authority.
- [ ] `projectId` comes from Project authority or an explicit backend link.
- [ ] Project and Conversation linkage is validated at acceptance.
- [ ] `senderId` comes from authentication context.
- [ ] `senderRole` comes from authorization context.
- [ ] `createdAt` comes from backend persistence.
- [ ] Canonical `recordedAt` ownership is explicit.
- [ ] Creation returns the complete authoritative identity result.
- [ ] Fetch returns the same identity values.
- [ ] Idempotency prevents duplicate messages and events.
- [ ] Conflicting idempotency replay is rejected.
- [ ] Local-only messages remain non-canonical.
- [ ] No message content is required in event logs or readiness reports.

## Backend Requirements Before Phase 3T

Phase 3T may validate only a documented or representative API contract. Before
that phase can report migration readiness, backend owners must provide:

1. the actual `/messages` route and persistence implementation, or an approved
   API schema
2. authoritative creation and fetch response examples with content removed
3. the Project-to-Conversation relationship source
4. authentication and role-resolution behavior
5. message ID and event ID generation policy
6. idempotency scope, replay behavior, conflict behavior, and retention
7. timestamp assignment and serialization policy
8. transaction behavior between message and event persistence

Absent those artifacts, Phase 3T can test contract structure only and must
continue to classify runtime migration as blocked.

## Frontend Requirements Before Phase 3T

The frontend must identify, without changing runtime behavior:

1. the source that can supply authoritative `projectId`
2. the source that can supply authoritative `conversationId`
3. the exact authenticated plain-text branch eligible for evaluation
4. temporary optimistic ID ownership
5. idempotency-key lifetime across retries
6. the adapter boundary between backend response and legacy rendered message
7. a strict exclusion list for local, demo, attachment, workflow-card, and
   emergency paths

No frontend field may be treated as authoritative solely because it exists in
localStorage, route state, or the optimistic message.

## Recommended Phase 3T Task

**Conversation Phase 3T - Pure Backend Message Contract Validator**

Create:

- `src/utils/messageCanonicalReadiness.js`
- `tests/messageCanonicalReadiness.test.js`
- `docs/KnowledgeBase/MESSAGE_CANONICAL_CONTRACT_VALIDATION.md`

The utility should accept request, creation response, and fetch response
objects as arguments and return structured field trust, blockers, warnings,
and migration risk.

It must:

- remain pure and read-only
- perform no network, storage, UI, or writer work
- require explicit Project and Conversation identity
- reject cross-domain identity substitution
- require authenticated actor and authorized role evidence
- validate timestamp and idempotency semantics
- distinguish message identity from event identity
- compare creation and fetch identity stability
- classify local-only records as non-canonical
- expose no message content in results or tests

Phase 3T must not add shadow wiring. Shadow comparison can begin only after the
validator reports `trusted: true`, `migrationRisk: "LOW"` against an approved
representative backend contract.

## Final Decision

The backend message boundary is the correct future authority for authenticated
`MESSAGE_CREATED`, but the current repository cannot prove that it satisfies
this contract.

**Current readiness: BLOCKED**

The blocking condition remains authoritative backend ownership and return of
Project identity, Conversation identity, actor role, event identity,
idempotency, and acceptance time.
