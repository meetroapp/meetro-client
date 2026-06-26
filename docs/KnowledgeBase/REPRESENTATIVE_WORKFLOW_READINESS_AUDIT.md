# Representative Workflow Readiness Audit

**Phase:** Conversation Phase 3Q  
**Status:** Audit only  
**Runtime changes:** None

## Executive Summary

No reviewed workflow is ready to migrate to canonical writer authority.

**Plain authenticated Message creation is the safest workflow to prepare
first.** It is the only reviewed path that already crosses an authenticated
backend persistence boundary and receives a backend record ID and timestamp.
That makes its future persistence authority more concrete than the local-only
quote, appointment, completion, and emergency paths.

Message is still only **PARTIAL**, not ready. Its current request is keyed by
`quote_request_id`, its Conversation identity comes from active client state,
it has no canonical `projectId`, actor role is partly UI-derived, and the
backend response is not a canonical event envelope.

Quote is the second-best preparation target because its event type, factory,
shadow comparison, and reconciliation tooling already exist. Its actual
writer remains local, multi-projection, and dependent on compatibility
identity.

Appointment, Completion, and Emergency are **BLOCKED**. They lack canonical
project provenance and combine event creation with broad UI, navigation, and
storage behavior.

## Readiness Standard

A workflow is `READY` only when:

1. It can construct the full canonical envelope.
2. All five identity fields are complete.
3. All five identity fields have authoritative provenance.
4. One command boundary owns event creation and idempotency.
5. One persistence boundary owns `recordedAt` and durable event acceptance.
6. Canonical adoption can preserve existing UI projections.
7. Replacement risk is low enough to preserve current workflow behavior.

Classification:

- **READY:** all requirements are satisfied.
- **PARTIAL:** the event boundary exists and some prerequisites are strong,
  but migration blockers remain.
- **BLOCKED:** authority, identity, semantics, or workflow coupling prevents
  a safe migration proposal.

## Summary Table

| Workflow | Readiness | Blockers | Migration Risk | Recommendation |
| --- | --- | --- | --- | --- |
| Message | **PARTIAL** | Missing canonical project link; client-selected Conversation identity; UI-derived role; client ID; backend response is not canonical | **HIGH** | Prepare plain authenticated text messages first by freezing the backend request/response identity contract. |
| Quote | **PARTIAL** | Request-derived project identity; local actor and clock; timestamp ID; several legacy projections; no canonical persistence | **HIGH** | Keep `WORKFLOW_QUOTE_SENT` shadow-only. Revisit after Message authority and shared identity context are proven. |
| Appointment | **BLOCKED** | Manual records lack project/Conversation identity; multiple creation paths; timestamp IDs; local-only persistence; create/update semantics mixed | **HIGH** | Establish project-linked appointment context and separate create/update commands before canonical comparison. |
| Completion | **BLOCKED** | No project ID; missing actor context; local completion time; many coupled history/archive writes; confirmation authority absent | **HIGH** | Define completion aggregate linkage and submitted-versus-confirmed authority before any writer work. |
| Emergency | **BLOCKED** | Emergency identity model unresolved; no canonical event types; local-only status authority; synthetic Conversation IDs; system actor undefined | **HIGH** | Treat as the last migration track after an emergency aggregate and lifecycle contract exist. |

## 1. Quote

### Current boundary

Primary path:

- `src/pages/QuoteBuilder.jsx`
- `sendQuote`

One send currently writes or updates:

- three quote history keys
- homeowner request status and timeline
- a shadow quote/project link
- a Conversation workflow card
- active Conversation navigation state
- success notification state

The development-only factory comparison does not persist canonical events.

### Canonical envelope readiness

**PARTIAL**

Ready elements:

- Approved `WORKFLOW_QUOTE_SENT` event type exists.
- `quote-builder` is a valid canonical source.
- Factory, contract, audit, and reconciliation utilities are aligned.
- The legacy card can be preserved as payload.

Missing or unsafe elements:

- Event ID is `workflow-quote-${Date.now()}`.
- Project identity may be promoted from `requestId`.
- Conversation identity has several precedence aliases.
- Actor comes from localStorage.
- Role is hard-coded to `business`.
- `recordedAt` is the client-created card time.

### Identity completeness

The shadow input can reach 100 structural completeness when every adapted
value exists. The persisted legacy quote card itself omits canonical
`projectId`, `conversationId`, `actor`, `actorRole`, and `recordedAt`.

**Assessment:** structurally adaptable, not canonically complete at the
authoritative writer boundary.

### Identity provenance

| Field | Current provenance | Trust |
| --- | --- | --- |
| `projectId` | Explicit request project when available; otherwise compatibility request identity | `INFERRED` |
| `conversationId` | Revised/request/active Conversation aliases | `INFERRED` or `FALLBACK` |
| `actor` | localStorage user ID | `FALLBACK` |
| `actorRole` | Hard-coded UI writer role | `FALLBACK` |
| `recordedAt` | Client card creation clock | `FALLBACK` |

### Event authority

No single event authority exists. Quote history, homeowner timeline, and
Conversation card independently represent the same transition. They do not
share one approved collision-resistant event ID.

### Persistence authority

Legacy localStorage writes remain authoritative for visible behavior.
`workflowEventFactory` is pure, and no canonical event store is selected.

### UI dependency risk

**High**

`sendQuote` controls validation, status, history, homeowner visibility,
Conversation display, revised-quote cleanup, toast state, and navigation.
Changing event authority risks visible regressions across both homeowner and
professional workflows.

### Migration risk

**HIGH**

### Recommendation

Keep quote-sent shadow-only. Do not replace any quote write until project,
Conversation, actor, role, event ID, and persistence-time provenance are
authoritative.

## 2. Appointment

### Current boundaries

Primary paths include:

- `ConversationThread.saveChatScheduleAppointment`
- `ConversationThread.saveMessageAsSchedule`
- `ContractorDashboard.saveManualScheduleVisit`
- ContractorDashboard schedule completion and visit outcome paths

Each path creates a different combination of schedule record, Conversation
card, project link, active workflow state, and timeline event.

### Canonical envelope readiness

**BLOCKED**

Approved event types exist for appointment created and updated. However:

- Appointment-completed semantics have no approved canonical type.
- Schedule and Conversation cards have different IDs.
- Manual schedule records often lack project and Conversation identity.
- Actor identity is absent.
- Timestamps are client-created occurrence times.
- Create and update use the same UI function in Work Center.

### Identity completeness

Representative raw shapes:

- Chat schedule record: usually only `conversationId`.
- Chat schedule card: canonical identity is absent.
- Manual schedule: often none of the five canonical identity fields.
- Work Center schedule card: explicit Conversation only.

Expected resolver completeness is generally 0–20 without an external adapter.

### Identity provenance

| Field | Current provenance | Trust |
| --- | --- | --- |
| `projectId` | Selected request, request ID, schedule context, or missing | `INFERRED` or `MISSING` |
| `conversationId` | Active thread/local state; sometimes request fallback | `FALLBACK` or `INFERRED` |
| `actor` | Not stored on schedule records | `MISSING` |
| `actorRole` | Legacy card role or omitted | `FALLBACK` or `MISSING` |
| `recordedAt` | `createdAt`/`updatedAt` from client clock | `FALLBACK` |

### Event authority

No unified appointment command exists. Conversation, Work Center, and
request-status paths can each imply scheduling. Some paths create a real
schedule entity; others only mutate workflow status.

### Persistence authority

`meetro_business_schedule` is the current schedule persistence surface.
Conversation and timeline records are separate local projections. No
canonical event acceptance boundary exists.

### UI dependency risk

**High**

Appointment creation is tied to schedule modals, message action sheets, Work
Center forms, visit outcomes, tab navigation, and Conversation rendering.

### Migration risk

**HIGH**

### Recommendation

Before writer migration:

- Require an explicit canonical project link.
- Require an authoritative Conversation link.
- Separate appointment create and update commands.
- Preserve source message identity when scheduling from a message.
- Approve appointment-completed semantics separately.
- Define one event ID shared by schedule and Conversation projections.

## 3. Completion

### Current boundary

Primary path:

- `src/pages/CompletionSheet.jsx`
- `saveCompletion`

One action creates or changes:

- completed project records
- completion photos and scalar summary keys
- counters and revenue totals
- schedule status
- Conversation closeout card
- Conversation registry/history state
- active work state
- emergency archive state
- next-page navigation

### Canonical envelope readiness

**BLOCKED**

`WORKFLOW_COMPLETION_SUBMITTED` and
`WORKFLOW_COMPLETION_CONFIRMED` are approved types, but the current path does
not create canonical events and does not contain a separate authoritative
customer-confirmation command.

The completion record has a completion ID and Conversation ID, but no
canonical project ID, actor, actor role, event ID, or persistence-owned
timestamp.

### Identity completeness

The completion record usually resolves only `conversationId` directly.
The closeout card uses request and role aliases and nests the completion
record. Expected raw resolver completeness is 0–20.

### Identity provenance

| Field | Current provenance | Trust |
| --- | --- | --- |
| `projectId` | Not stored; adjacent schedule/emergency/job IDs are not project identity | `MISSING` |
| `conversationId` | Active work snapshot and several localStorage fallbacks | `FALLBACK` |
| `actor` | Not stored | `MISSING` |
| `actorRole` | Legacy card role only | `FALLBACK` |
| `recordedAt` | Client `completedAt` reused as card time | `FALLBACK` |

### Event authority

The completion form currently acts as completion record creator, history
archiver, workflow closer, and navigation controller. Submission and customer
confirmation are not separated by authoritative commands.

### Persistence authority

Local completion history is authoritative for current UI behavior. Schedule,
Conversation, registry, active work, and emergency records are updated
independently without transactional event persistence.

### UI dependency risk

**Very high**

Failure or reordered writes can affect completed history, active work,
Conversation visibility, emergency cleanup, counters, and destination page.

### Migration risk

**HIGH**

### Recommendation

Define:

- Canonical project linkage before active work is cleared.
- Completion entity-to-project relation.
- Authenticated business actor context.
- Submitted event persistence boundary.
- Separate homeowner confirmation authority.
- One event ID propagated to completion, Conversation, and history
  projections.

## 4. Emergency

### Current boundaries

Primary paths include:

- `EmergencyRequest.submitRequest`
- `emergencyLifecycle.transitionEmergencyStatus`
- Emergency Operations and Dispatch status controls
- CompletionSheet emergency closeout

Emergency creation produces a timestamp-based emergency request ID and a
derived emergency Conversation ID. Status transitions update several local
records and append system messages.

### Canonical envelope readiness

**BLOCKED**

The canonical registry does not include emergency request, accepted, enroute,
arrived, cancelled, or closed event types. `WORKFLOW_WORK_STARTED` and
completion types cover only part of the lifecycle and cannot safely represent
the entire emergency aggregate.

### Identity completeness

Emergency records contain an emergency ID and explicit emergency Conversation
ID, but no canonical project ID, authenticated actor, authorization role, or
canonical recorded time.

System status messages contain a role and client timestamp but still lack
canonical project, Conversation field, registered system actor, and event
identity.

### Identity provenance

| Field | Current provenance | Trust |
| --- | --- | --- |
| `projectId` | Emergency request ID or active job adjacency; project relationship undefined | `MISSING` or `INFERRED` |
| `conversationId` | Client-generated from emergency request identity | `FALLBACK` |
| `actor` | local user identity, business display name, or literal system | `FALLBACK` |
| `actorRole` | Hard-coded homeowner/business/system presentation role | `FALLBACK` |
| `recordedAt` | Client `createdAt`/`updatedAt`/`completedAt` | `FALLBACK` |

### Event authority

Authority is distributed across request, operations, dispatch, Conversation,
status, lifecycle utility, and completion screens. Several screens can invoke
the same local transition helper, but the helper is not a canonical command
or persistence authority.

### Persistence authority

Emergency records, active job snapshots, Conversation arrays, registry
entries, status keys, and completion history are all local and independently
updated.

### UI dependency risk

**Very high**

Emergency status drives live dispatch UI, homeowner status, Conversation
cards, operations controls, active work, history, and completion.

### Migration risk

**HIGH**

### Recommendation

Do not select Emergency as an early writer migration. First define:

- Whether emergency is a project aggregate or a linked domain aggregate.
- Canonical emergency lifecycle event types.
- Backend request and status-transition authority.
- Authoritative Conversation creation.
- Registered system actor identity.
- Idempotent transition and persistence rules.

## 5. Message

### Current boundary

Primary path:

- `src/pages/ConversationThread.jsx`
- `addOutgoingMessage`
- plain `sendMessage` text branch

The UI first appends a local message. When a selected request and receiver
exist, `authFetch("/messages")` sends an authenticated backend request. The
response can provide a backend message ID. Backend reads also provide
`sender_id` and `created_at`.

Workflow cards may additionally be mirrored to `/workflow-events`; that dual
path is explicitly excluded from the safest-first recommendation.

### Canonical envelope readiness

**PARTIAL**

Ready elements:

- `MESSAGE_CREATED` is an approved canonical type.
- A clear plain-text creation boundary exists.
- Backend authentication is required through `authFetch`.
- Backend persistence returns a durable message record ID.
- Backend reads expose sender ID and created timestamp.
- A plain text payload is semantically simpler than workflow cards.

Missing or unsafe elements:

- Client message ID is timestamp-based.
- Request uses `quote_request_id`, not canonical `projectId`.
- Conversation identity is not sent explicitly.
- Active Conversation can be a demo or local fallback.
- Actor role comes from current UI mode.
- The response is mapped into legacy presentation shape.
- Backend message ID is not yet an approved canonical workflow event ID.
- Backend `created_at` has not been declared canonical `recordedAt`.

### Identity completeness

At creation time, the plain message object normally has actor-role-like data
and a client timestamp, but none of the five canonical fields are complete in
their approved names.

After backend acceptance, the system has promising candidates:

- backend message ID
- authenticated sender ID
- backend creation timestamp
- quote/request relation

Canonical project and Conversation identities remain absent.

### Identity provenance

| Field | Current provenance | Trust |
| --- | --- | --- |
| `projectId` | `quote_request_id`; no canonical project relation in client contract | `INFERRED` or `MISSING` |
| `conversationId` | Active local Conversation; not sent as backend relationship identity | `FALLBACK` |
| `actor` | Backend authenticated `sender_id` on read; client local user ID for display comparison | Potentially `AUTHORITATIVE`, but not frozen |
| `actorRole` | Current viewer mode or opposite-viewer inference | `FALLBACK` |
| `recordedAt` | Backend `created_at` on read | Potentially `AUTHORITATIVE`, but not frozen |

### Event authority

The backend message endpoint is the strongest existing domain authority among
the five workflows. However, the local optimistic message is visible before
backend acceptance, and workflow cards can generate a second backend
workflow-event record.

For plain text only, Message has a tractable future authority model:

1. client command creates an idempotent message request
2. backend accepts and owns message identity and recording time
3. canonical `MESSAGE_CREATED` is returned or created from the accepted
   message
4. local Conversation UI remains a projection

### Persistence authority

Backend `/messages` persistence already exists for authenticated,
request-linked conversations. localStorage remains an offline/display cache
and fallback when backend prerequisites are absent.

This is the closest reviewed workflow to an authoritative persistence
boundary.

### UI dependency risk

**Medium to high**

`addOutgoingMessage` controls optimistic rendering, delivery status, backend
posting, workflow-event mirroring, reply state, and composer state. A broad
change would be risky. A future phase must isolate plain authenticated text
messages and leave all cards, attachments, emergency messages, demos, and
offline fallbacks unchanged.

### Migration risk

**HIGH now**, with the shortest path to reducing it.

### Recommendation

Prepare plain authenticated text messages first. Do not migrate
`addOutgoingMessage` generically.

The candidate scope must exclude:

- image and attachment messages
- workflow cards
- appointment cards
- completion cards
- emergency messages
- materials, approval, payment, and update cards
- demo conversations
- local-only sends without receiver and backend request identity

## Safest Workflow To Migrate First

### Decision: Plain authenticated Message creation

Message is the safest workflow to migrate first **after prerequisites are
completed**.

Reasons:

1. It already has an authenticated backend boundary.
2. The backend returns durable message identity.
3. The backend provides sender and creation timestamp candidates.
4. `MESSAGE_CREATED` is already an approved canonical event type.
5. Plain text has a narrow payload and no unresolved workflow-state
   semantics.
6. The Conversation UI can remain a projection if backend authority is
   formalized.

This decision supersedes the earlier quote-first shadow sequence only for
future authority migration. Quote remains the more mature shadow-comparison
implementation, but Message has the stronger real persistence foundation.

## Workflows That Remain Blocked

### Quote

Partial architecture foundation exists, but writer migration is blocked by
identity provenance, event ID, multiple projections, and absent canonical
persistence.

### Appointment

Blocked by missing project identity, distributed creation paths, local
persistence, and mixed appointment lifecycle semantics.

### Completion

Blocked by missing project and actor identity, absent confirmation authority,
and broad completion-to-history coupling.

### Emergency

Blocked by unresolved aggregate ownership, missing canonical event types,
local status authority, synthetic identity, and very high UI dependency.

Message also remains blocked from immediate migration until its prerequisites
are satisfied.

## Prerequisites Before Any Writer Migration

Common requirements:

- Canonical project aggregate or authoritative project link.
- Canonical Conversation relationship ID.
- Authenticated actor context.
- Authorization-owned role snapshot.
- Collision-resistant event ID and idempotency policy.
- Persistence-owned `recordedAt`.
- One event ID shared across all projections.
- Typed payload contract for the selected event.
- Explicit command and persistence authority.
- Shadow evidence showing no visible behavior change.
- Legacy writes retained until canonical authority is proven.

Message-specific requirements:

- Freeze the `/messages` request and response contract.
- Determine whether backend message ID can be canonical event ID or must be
  correlated to a separate event ID.
- Return or explicitly map canonical `projectId` and `conversationId`.
- Treat backend authentication as actor authority.
- Return authorization-owned `actorRole`.
- Declare backend `created_at` as persistence-owned `recordedAt`, or add a
  dedicated event timestamp.
- Add idempotency for optimistic retries.
- Separate plain messages from workflow-card `/workflow-events` mirroring.

## Phase 3R Recommendation

**Task:** Conversation Phase 3R - Plain Message Authority Contract

Phase 3R should remain specification and pure-validation work. It should not
wire the factory into ConversationThread.

Create:

- `docs/KnowledgeBase/PLAIN_MESSAGE_AUTHORITY_CONTRACT.md`
- `src/utils/messageCanonicalReadiness.js`
- `tests/messageCanonicalReadiness.test.js`

Proposed API:

```js
getMessageCanonicalReadiness({
  localMessage,
  backendMessage,
  project,
  conversation,
  actorContext,
})
```

Required output:

```js
{
  ready,
  envelopeReadiness,
  resolvedIdentity,
  provenance,
  idempotencyReadiness,
  persistenceReadiness,
  blockers,
  migrationRisk,
}
```

Phase 3R must:

- Support plain authenticated text messages only.
- Remain pure and read-only.
- Make no localStorage, network, UI, routing, or writer changes.
- Define backend request and response ownership field by field.
- Run the existing resolver and provenance validator without weakening them.
- Reject request ID as project identity.
- Reject active UI state as Conversation authority.
- Require authenticated backend actor evidence.
- Require authorization-owned role evidence.
- Require backend persistence ownership for `recordedAt`.
- Report whether backend message ID satisfies canonical event ID and retry
  requirements.
- Keep workflow cards and `/workflow-events` mirroring out of scope.

Only after Phase 3R demonstrates a fully authoritative representative message
should a later phase consider development-only shadow factory comparison at
the plain-text backend-success boundary.
