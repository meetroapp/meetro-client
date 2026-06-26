# Conversation Timeline Plan

## Objective

Make the conversation a reliable projection of one durable project event stream
without requiring chat messages and workflow events to be the same domain
object.

## Current Timeline Surfaces

1. Backend messages from `/messages/:quoteRequestId`
2. Local `meetro_conversation_<conversationId>` arrays
3. Local `meetro_conversation_registry`
4. `meetro_job_record_<conversationId>`
5. Global `meetroWorkflowTimeline`
6. Global `projectTimeline`
7. Per-request `projectTimeline`
8. `completedProjects` and archived conversation flags

## Findings

### CT-01: Backend load replaces local workflow events

- **File name:** `src/pages/ConversationThread.jsx`
- **Current behavior:** When backend messages are returned, they replace the
  displayed/local message array.
- **Problem:** Locally appended workflow cards can disappear on the next poll.
- **Correct owner:** Backend timeline synchronization.
- **Recommended fix:** Persist workflow events before display or merge local
  pending events by immutable event ID until acknowledged.
- **Severity:** Critical

### CT-02: Quote Builder bypasses the conversation transport

- **File name:** `src/pages/QuoteBuilder.jsx`
- **Current behavior:** Quote cards are appended directly to the local
  conversation key.
- **Problem:** The event is not guaranteed to exist for the other participant.
- **Correct owner:** Quote command plus timeline event API.
- **Recommended fix:** Send the quote and append its timeline event through the
  backend command path.
- **Severity:** Critical

### CT-03: Completion also appends locally

- **File name:** `src/pages/CompletionSheet.jsx`
- **Current behavior:** Completion cards and archived registry state are written
  directly to local storage.
- **Problem:** Completion history is device-local unless another path
  independently synchronizes it.
- **Correct owner:** Completion command plus timeline event API.
- **Recommended fix:** Persist completion and closeout event atomically on the
  backend, then cache the returned event.
- **Severity:** Critical

### CT-04: Schedule cards have several writers

- **File name:** `src/pages/ConversationThread.jsx`,
  `src/pages/ContractorDashboard.jsx`
- **Current behavior:** Chat-created, message-derived, and Work Center-created
  appointments each append schedule cards differently.
- **Problem:** Appointment and conversation timelines can become unpaired.
- **Correct owner:** Scheduling command emitting an appointment event.
- **Recommended fix:** Every schedule mutation should produce one timeline event
  with the same appointment ID.
- **Severity:** High

### CT-05: Job Record requires manual saving for some events

- **File name:** `src/pages/ConversationThread.jsx`
- **Current behavior:** Some operational messages are saved to the job record
  through an explicit action; other workflow paths auto-save separately.
- **Problem:** "Permanent project history" depends on user interaction and event
  type.
- **Correct owner:** Timeline projection policy.
- **Recommended fix:** Define which event types automatically enter the project
  record and derive that view without copying payloads.
- **Severity:** High

### CT-06: Conversation registry is both index and workflow state

- **File name:** `src/pages/ConversationThread.jsx`,
  `src/pages/MessagesInbox.jsx`, `src/pages/CompletionSheet.jsx`
- **Current behavior:** Registry entries hold unread, project metadata,
  conversation type, archive state, and history state.
- **Problem:** Inbox presentation data is used as workflow truth.
- **Correct owner:** Conversation index projection.
- **Recommended fix:** Keep registry/index data derived from conversation and
  project events.
- **Severity:** High

### CT-07: Event type registry is incomplete

- **File name:** `src/utils/workflowTypes.js`,
  `src/components/workflows/WorkflowRenderer.jsx`
- **Current behavior:** Supported render types and recognized workflow types are
  different.
- **Problem:** An event may render but not participate in workflow utilities.
- **Correct owner:** Shared workflow event schema.
- **Recommended fix:** Use one registry for type, payload version, allowed
  statuses, icon, title, and renderer.
- **Severity:** High

### CT-08: Actor identity is inferred

- **File name:** `src/pages/ConversationThread.jsx`
- **Current behavior:** Missing sender roles are migrated using current viewer
  role and inferred opposites.
- **Problem:** The same cached message can be attributed differently across
  sessions.
- **Correct owner:** Message/event persistence.
- **Recommended fix:** Persist immutable actor ID and actor role with every
  message and workflow event.
- **Severity:** High

### CT-09: Timeline ordering uses mixed timestamp shapes

- **File name:** `src/pages/ConversationThread.jsx`,
  `src/pages/ContractorDashboard.jsx`
- **Current behavior:** Records use numeric times, ISO strings, display strings,
  `savedAt`, and `createdAt`.
- **Problem:** Cross-source ordering is not deterministic.
- **Correct owner:** Event schema.
- **Recommended fix:** Require a server-issued ISO timestamp and sequence
  number; keep display time separate.
- **Severity:** Medium

## Target Event Envelope

Every durable event should include:

```text
eventId
eventType
payloadVersion
projectId
requestId
conversationId
actorId
actorRole
occurredAt
recordedAt
sequence
source
payload
```

Optional entity references:

```text
appointmentId
quoteId
workId
completionId
invoiceId
```

## Recommended Event Families

- `lead.reviewed`
- `conversation.message_sent`
- `appointment.created`
- `appointment.rescheduled`
- `appointment.cancelled`
- `appointment.completed`
- `appointment.outcome_recorded`
- `quote.drafted`
- `quote.sent`
- `quote.accepted`
- `quote.revision_requested`
- `quote.declined`
- `work.activated`
- `work.status_changed`
- `materials.approval_requested`
- `completion.submitted`
- `completion.confirmed`
- `completion.followup_requested`
- `project.archived`

## Safe Migration Sequence

1. Add immutable IDs and event envelopes to newly created events.
2. Persist quote and completion events through the existing backend message
   path.
3. Merge pending local events with server results by event ID.
4. Derive Job Record from event types instead of copying messages.
5. Derive Work Center timeline and inbox registry from the same event feed.
6. Stop writing global timeline arrays.
7. Retire legacy local arrays only after read compatibility and tests exist.

## Required Tests

- Local pending event survives a backend poll.
- Server acknowledgement replaces, rather than duplicates, a pending event.
- Quote sent appears for both participants.
- Quote decision changes project state and timeline once.
- Appointment edit updates the same appointment event chain.
- Completion appears in conversation and homeowner history.
- Actor and ordering remain identical after logout/login.
- Emergency and standard conversations do not overwrite one another.
