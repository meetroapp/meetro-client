# Canonical Workflow Event Envelope

## Status and Authority

This document is the source of truth for Meetro workflow event structure.

Future changes to:

- `workflowEventContract.js`
- `workflowEventFactory.js`
- `conversationTimelineReconciliation.js`
- workflow event audits
- future workflow writers

must align to this specification.

This specification does not inherit field names, fallbacks, or behavior from
the current implementation. Where current code differs, the code is
non-canonical and must be aligned in a later phase.

## Canonical Envelope

An authoritative workflow event has exactly this conceptual shape:

```js
{
  id,
  eventType,
  projectId,
  conversationId,
  actor,
  actorRole,
  recordedAt,
  source,
  payload,
  legacy,
  metadata,
  migrationSource
}
```

Required fields:

```js
{
  id,
  eventType,
  projectId,
  conversationId,
  actor,
  actorRole,
  recordedAt,
  source,
  payload
}
```

Optional fields:

```js
{
  legacy,
  metadata,
  migrationSource
}
```

No other top-level field is canonical unless this specification is revised.
Domain-specific data belongs in `payload`. Cross-cutting diagnostic or
correlation data belongs in `metadata`.

## Core Principles

1. One real workflow transition produces one canonical event.
2. Every projection of that transition carries the same canonical `id`.
3. Required fields are explicit. Canonical writers do not guess them.
4. Read reconciliation may preserve incomplete legacy data, but incomplete
   data is not a valid canonical write.
5. Canonical events are immutable after creation.
6. Payloads preserve business facts without becoming identity authority.
7. Display labels, titles, customer names, and localized text never determine
   event identity or ownership.
8. `UNKNOWN_WORKFLOW_EVENT` preserves readable legacy data; it is not a valid
   type for a new authoritative write.

## Field Ownership

| Field | Owner | Meaning |
| --- | --- | --- |
| `id` | Workflow command boundary | Immutable identity of one event occurrence. |
| `eventType` | Workflow domain contract | Approved semantic name of the transition. |
| `projectId` | Project aggregate authority | Canonical project that owns the workflow transition. |
| `conversationId` | Conversation authority | Relationship timeline receiving or associated with the event. |
| `actor` | Authentication/command context | Stable principal responsible for the transition. |
| `actorRole` | Authorization context at event creation | Actor role when the transition occurred. |
| `recordedAt` | Event persistence boundary | Canonical UTC timestamp assigned when the event is accepted for recording. |
| `source` | Calling workflow module | Stable machine-readable origin of event creation. |
| `payload` | Event-type owner | Immutable facts specific to the event type. |
| `legacy` | Reconciliation layer | Optional preserved legacy source data and warnings. |
| `metadata` | Event infrastructure | Optional non-domain correlation and diagnostic data. |
| `migrationSource` | Migration/reconciliation process | Optional identifier for the legacy source being migrated. |

UI components do not own canonical identity fields. Dashboards, Command
Center, Work Center, and Conversation may project events, but projection does
not grant write authority.

## Required Field Rules

### `id`

Type: non-empty string.

Rules:

- opaque, immutable, and collision-resistant
- generated once before the first event projection is persisted
- reused by retries of the same transition
- different for every distinct transition
- shared by conversation, project timeline, backend, and compatibility
  projections of the same event
- must not be derived only from `Date.now()`, title, customer name, display
  text, or payload content
- must not be replaced by a backend record ID after creation

The canonical field name is `id`.

Legacy `eventId`, `event_id`, backend IDs, and generic source IDs may be read as
compatibility candidates, but they must be validated before becoming canonical
`id`. New canonical output does not use `eventId`.

### `eventType`

Type: non-empty string from the approved canonical event registry.

Rules:

- uppercase `UPPER_SNAKE_CASE`
- describes a completed fact, not a UI component or command label
- stable after publication
- independent of localized language
- cannot be inferred from display text
- cannot be an arbitrary status value
- cannot be `UNKNOWN_WORKFLOW_EVENT` for a new canonical write

### `projectId`

Type: non-empty string.

Rules:

- identifies the canonical project aggregate
- supplied explicitly by project authority
- not substituted with request, quote, job, conversation, emergency, post, or
  generic record identity
- not inferred from title, customer, address, text, or timing
- required for every canonical workflow event under this specification

If a workflow action occurs before a canonical project exists, that writer is
not migration-ready. A future exception requires a specification revision.

### `conversationId`

Type: non-empty string.

Rules:

- identifies the canonical homeowner/professional relationship timeline
- supplied explicitly by Conversation authority or an approved project link
- present inside the event, even when the surrounding storage key or route
  already contains it
- not inferred from `projectId`, `requestId`, route state, active selection, or
  a storage key during canonical creation
- required for every canonical event under this specification

This requirement makes Conversation a first-class relationship timeline. A
writer without an explicit conversation link is not migration-ready.

### `actor`

Type: non-empty string.

Rules:

- identifies a stable user, service, or approved system principal
- is captured from authenticated command context
- is not a display name
- is not `"unknown"` for a canonical write
- is not recalculated relative to the current viewer

The canonical field name is `actor`. Current `actorId`, `senderId`, and similar
fields are compatibility inputs only.

### `actorRole`

Type: approved non-empty string.

Initial approved values:

- `homeowner`
- `business`
- `system`

Rules:

- captured at event creation
- describes authority context, not display orientation
- never inferred as “the opposite of the current viewer”
- `"unknown"` is invalid for a canonical write
- new roles require contract approval before use

### `recordedAt`

Type: UTC ISO-8601 timestamp string.

Rules:

- assigned by the persistence boundary when the event is accepted for
  authoritative recording
- immutable after assignment
- preserved across reads and projections
- not a localized display time
- not silently inferred from `createdAt`, `updatedAt`, `savedAt`, or payload
  content during canonical creation
- retries preserve the original accepted value when reusing the same `id`

This envelope intentionally has one canonical top-level timestamp. If an event
type needs a separate effective, scheduled, sent, completed, or business
occurrence time, that value belongs in its typed `payload`. Diagnostic clock
information may live in `metadata`.

### `source`

Type: non-empty lowercase kebab-case string.

Examples:

- `quote-builder`
- `conversation-thread`
- `completion-sheet`
- `contractor-dashboard`
- `backend-workflow`

Rules:

- identifies the module or service that created the canonical event
- is stable and machine-readable
- is not a route, display label, filename, or localized value
- is not `"unknown"` for canonical writes
- does not determine event ownership by itself

### `payload`

Type: plain object.

Rules:

- contains event-specific immutable facts
- is cloned so source mutation cannot change the event
- must be serializable
- must not contain functions, DOM objects, cyclic references, or transient UI
  state
- must not be used to repair missing required envelope fields
- may contain entity IDs such as `quoteId`, `scheduleId`, or `completionId`
- may preserve legacy presentation data during incremental migration
- sensitive content must be limited to what the workflow event actually needs

Each event type must eventually define its own payload contract.

## Optional Field Rules

### `legacy`

Type: plain object when present.

Purpose:

- preserve original legacy type and source identifiers
- report missing or inferred legacy fields
- retain non-canonical source shape needed for reconciliation

Rules:

- cannot override required canonical fields
- cannot make an invalid canonical event valid
- must not contain mutable references
- should be omitted for native canonical events with no legacy dependency

Recommended keys:

```js
{
  originalType,
  originalId,
  warnings,
  sourceShape
}
```

### `metadata`

Type: plain object when present.

Purpose:

- correlation IDs
- idempotency context
- schema or payload version
- projection diagnostics
- optional business occurrence timestamp when a typed payload contract does
  not yet own it

Rules:

- contains infrastructure context, not primary domain facts
- cannot replace any required field
- must be serializable and immutable
- must not contain message text, customer notes, or full duplicated payloads
  solely for logging

Recommended keys:

```js
{
  schemaVersion,
  correlationId,
  causationId,
  businessOccurredAt
}
```

### `migrationSource`

Type: non-empty string when present.

Purpose:

- identifies the legacy store, API, or projection from which an event was
  migrated or normalized

Examples:

- `meetro-conversation-local`
- `homeowner-request-project-timeline`
- `backend-workflow-event-v1`

Rules:

- used only for migration and reconciliation
- not used as canonical `source`
- not used to determine identity
- omitted for native canonical events

## Validation Policy

Canonical validation is strict.

An event is valid only when:

- it is a plain object
- all required fields are present
- string fields are trimmed and non-empty
- `id` satisfies the approved immutable ID policy
- `eventType` is in the approved registry and is not unknown
- `projectId` and `conversationId` are explicit canonical identities
- `actor` is a stable principal
- `actorRole` is approved
- `recordedAt` is a valid UTC ISO-8601 timestamp
- `source` follows lowercase kebab-case
- `payload` is a serializable plain object
- optional fields, when present, satisfy their object/string contracts

Canonical validation does not:

- invent IDs
- promote compatibility IDs
- infer projects
- infer conversations
- substitute display names for actors
- use `"unknown"` defaults
- map unsupported types to canonical types
- derive timestamps from display data
- mutate the input

A failed canonical validation returns structured errors and produces no
authoritative event.

## Fallback Policy

### Canonical Creation

There are no silent fallbacks for required fields.

When a required field is absent or invalid:

1. canonical creation fails
2. no canonical event is persisted or emitted
3. the existing legacy workflow remains authoritative during migration
4. diagnostics may report field-level errors without customer content

### Read Reconciliation

Read reconciliation may:

- preserve a legacy `id`
- generate a clearly marked temporary reconciliation ID
- map known legacy event names
- use `"unknown"` display fallbacks
- sort using an approved legacy timestamp fallback
- retain events with missing identity
- attach warning metadata

Read reconciliation must not:

- label a fallback record as canonical
- silently persist the fallback
- infer project identity from conversation identity
- deduplicate by text, title, customer name, or display time
- erase incomplete legacy events

## Identity Policy

Canonical identity has four independent dimensions:

1. `id`: event occurrence
2. `projectId`: project aggregate
3. `conversationId`: relationship timeline
4. `actor`: responsible principal

These identities are not interchangeable.

Entity IDs such as `quoteId`, `scheduleId`, `completionId`, `jobId`, and
`requestId` belong in `payload` unless a future envelope revision promotes
them. They may support reconciliation but cannot replace required identity
fields.

## Timestamp Policy

`recordedAt` is the canonical ordering timestamp.

Sorting rules:

1. sort by valid `recordedAt`
2. preserve source order when timestamps are equal
3. incomplete legacy events without a valid timestamp remain visible after
   timestamped events
4. do not use localized display time for ordering

Business timestamps such as appointment time, quote sent time, work start
time, or completion time belong in typed payloads.

## Actor Policy

Actor identity and actor role are immutable event facts.

- authentication context owns `actor`
- authorization context owns `actorRole`
- UI sender labels do not own either field
- system events require an approved system principal
- role must not change when viewed by the opposite party
- homeowner/professional separation must be preserved in both fields and
  payload access

## Conversation Ownership Policy

Conversation is the relationship timeline, not merely a message store.

Conversation authority:

- owns `conversationId`
- projects canonical events into the relationship timeline
- does not own project state transitions merely because it displays them
- does not derive workflow authority from cards or rendering
- preserves canonical event `id` across message and workflow projections

`MESSAGE_CREATED` is owned by Conversation. Workflow transition types are
owned by their domain command and projected into Conversation.

## Project Ownership Policy

Project authority:

- owns `projectId`
- links requests, quotes, schedules, work, completion, and history to one
  project aggregate
- does not accept conversation, title, customer, or generic IDs as canonical
  project identity
- makes project identity available before a workflow writer migrates

Dashboard and Command Center are projections. They do not become project or
workflow authority by reading or displaying project events.

## Event Type Policy

### Naming Rules

Canonical event types:

- use uppercase `UPPER_SNAKE_CASE`
- describe an immutable fact that already occurred
- use domain subject plus past-tense transition
- remain stable after release
- are independent of UI card names and storage keys
- are registered before writers use them

Approved examples:

- `WORKFLOW_QUOTE_SENT`
- `WORKFLOW_APPOINTMENT_CREATED`
- `WORKFLOW_COMPLETION_SUBMITTED`
- `MESSAGE_CREATED`
- `UNKNOWN_WORKFLOW_EVENT`

Additional currently recognized examples:

- `WORKFLOW_REQUEST_CREATED`
- `WORKFLOW_APPOINTMENT_UPDATED`
- `WORKFLOW_QUOTE_CREATED`
- `WORKFLOW_QUOTE_ACCEPTED`
- `WORKFLOW_WORK_STARTED`
- `WORKFLOW_MATERIALS_REQUESTED`
- `WORKFLOW_COMPLETION_CONFIRMED`

### Prefix Rules

- cross-module workflow transitions use `WORKFLOW_`
- relationship messages use `MESSAGE_`
- future domain families may use an approved domain prefix
- UI terms such as `CARD`, `MODAL`, `BUTTON`, or `SCREEN` are prohibited

### Unknown Event Rule

`UNKNOWN_WORKFLOW_EVENT` is reserved for read compatibility.

It:

- preserves unsupported legacy records
- may appear in reconciliation reports
- must retain original type in `legacy`
- cannot be created by a new canonical writer
- cannot trigger workflow behavior
- cannot be used to hide an unapproved event type

### Status Rule

Statuses are not automatically events.

Examples:

- `sent` does not become canonical without an approved quote-send command
- `working` does not automatically mean `WORKFLOW_WORK_STARTED`
- `confirmed` does not automatically mean completion confirmation

Canonical events are created from approved commands and transitions, not
string similarity.

## Canonical Examples

### Quote Sent

```js
{
  id: "wf_evt_01J...",
  eventType: "WORKFLOW_QUOTE_SENT",
  projectId: "project_123",
  conversationId: "conversation_456",
  actor: "user_789",
  actorRole: "business",
  recordedAt: "2026-06-13T15:30:00.000Z",
  source: "quote-builder",
  payload: {
    quoteId: "quote_101",
    requestId: "request_202",
    revision: 0,
    quoteStatus: "sent"
  }
}
```

### Message Created

```js
{
  id: "wf_evt_01K...",
  eventType: "MESSAGE_CREATED",
  projectId: "project_123",
  conversationId: "conversation_456",
  actor: "user_303",
  actorRole: "homeowner",
  recordedAt: "2026-06-13T15:31:00.000Z",
  source: "conversation-thread",
  payload: {
    messageId: "message_404",
    messageType: "text"
  }
}
```

The payload examples intentionally omit message content and quote financial
details because those values are not required to establish the event envelope.

## Migration Readiness Checklist

A writer may migrate only when:

- [ ] it can supply every required field without compatibility guessing
- [ ] it creates one immutable `id` before any projection is written
- [ ] retries reuse the same `id`
- [ ] all projections retain the same `id`
- [ ] canonical `projectId` is explicit
- [ ] canonical `conversationId` is explicit
- [ ] stable `actor` is explicit
- [ ] `actorRole` is approved and captured at creation
- [ ] `recordedAt` is assigned by the persistence boundary
- [ ] `source` is registered and stable
- [ ] `eventType` is approved and not unknown
- [ ] payload contract is defined for the event type
- [ ] validation failure cannot interrupt or partially duplicate legacy flow
- [ ] shadow audit shows no unresolved identity or payload-loss gaps
- [ ] production rendering remains unchanged until separately approved

## Factory Alignment Checklist

`workflowEventFactory.js` is aligned when:

- [ ] output uses the exact canonical required and optional field names
- [ ] output uses `id`, not `eventId`
- [ ] output uses `actor`, not `actorId`
- [ ] required values have no silent fallback
- [ ] unsupported types fail instead of becoming authoritative unknown events
- [ ] `UNKNOWN_WORKFLOW_EVENT` is available only in compatibility mode
- [ ] timestamps are validated without payload inference in canonical mode
- [ ] payload and optional objects are deeply cloned
- [ ] validation errors are structured
- [ ] no storage, browser event, network, or UI access exists
- [ ] input is never mutated

## Contract Alignment Checklist

`workflowEventContract.js` is aligned when:

- [ ] canonical fields exactly match this specification
- [ ] `id` and `actor` are authoritative names
- [ ] required and optional fields are separately declared
- [ ] strict canonical validation is distinct from tolerant legacy reads
- [ ] actor roles and source format are validated
- [ ] project and conversation identity cannot be compatibility-derived in
      canonical mode
- [ ] unknown event type is rejected in canonical mode
- [ ] optional fields cannot override required fields
- [ ] validation reports field-level errors
- [ ] the canonical event registry has one owner

Legacy aliases such as `eventId`, `actorId`, `occurredAt`, `payloadVersion`,
`requestId`, and `sequence` may remain readable. They are not canonical
top-level fields under this specification. Required domain values such as
`requestId` belong in `payload`; schema/version data belongs in `metadata`.

## Reconciliation Alignment Checklist

`conversationTimelineReconciliation.js` is aligned when:

- [ ] canonical input passes through without field renaming
- [ ] legacy records normalize to the canonical read shape
- [ ] incomplete legacy events remain visible
- [ ] fallback IDs are marked in `legacy`
- [ ] actor and identity fallbacks are marked in `legacy`
- [ ] known legacy names map through an explicit registry
- [ ] unknown workflow names remain `UNKNOWN_WORKFLOW_EVENT`
- [ ] deduplication prefers canonical `id`
- [ ] approved stable entity/event pairs are used only for legacy
      reconciliation
- [ ] text, title, customer, and display time are never deduplication keys
- [ ] canonical events are never mutated while merging duplicate sources
- [ ] sorting follows the canonical timestamp policy
- [ ] reconciliation never writes storage or claims write authority

## Exact Next Task for Phase 3I

### Conversation Phase 3I - Pure Contract and Factory Specification Alignment

Mission:

Align pure utilities and tests to this specification without adopting any
writer or changing application behavior.

Allowed files:

- `src/utils/workflowEventContract.js`
- `src/utils/workflowEventFactory.js`
- `src/utils/workflowEventFactoryAudit.js`
- new or existing focused tests
- Phase 3I handoff documentation

Required work:

1. Define shared required and optional canonical field constants.
2. Define one shared canonical event type registry.
3. Add strict, pure canonical validation.
4. Update the factory to return the specified envelope.
5. Preserve a separately named compatibility path for existing shadow tests
   and incomplete legacy input.
6. Treat `eventId`, `actorId`, and other old aliases as read-only compatibility
   inputs.
7. Reject missing required fields, unsupported event types, unknown actor,
   invalid role, invalid timestamp, and non-object payload in canonical mode.
8. Keep `UNKNOWN_WORKFLOW_EVENT` read-only.
9. Add tests for:
   - exact canonical shape
   - required field validation
   - optional field validation
   - immutable input and payload
   - ID retry reuse
   - actor role vocabulary
   - source format
   - unknown event rejection
   - compatibility alias handling
   - no browser, storage, network, or UI access
10. Do not modify QuoteBuilder, ConversationThread, storage, routing,
    rendering, or any workflow writer.

Phase 3I succeeds when contract and factory agree with this document while
current application behavior remains unchanged.

