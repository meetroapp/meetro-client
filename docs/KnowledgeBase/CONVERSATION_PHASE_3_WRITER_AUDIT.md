# Conversation Phase 3 Canonical Writer and Identity Provenance Audit

**Scope:** Writer inventory and migration-readiness audit only  
**Runtime changes:** None  
**Writer migration:** BLOCKED  
**Phase 4 shadow parity:** PARTIAL, development-only candidates identified

## Executive Summary

No current conversation or workflow writer is safe to become canonical event
authority without additional identity and backend provenance.

The current implementation contains several kinds of historical writers:

- local Conversation messages and workflow cards;
- backend message and `workflow-events` requests;
- schedule records and schedule cards;
- quote records, homeowner timeline entries, and quote cards;
- Work Center timeline mirrors;
- job-record entries;
- completion, archive, history, and reporting writes;
- direct Project status changes.

These writers frequently describe one user action through multiple unrelated
records. Most records have useful entity IDs and client timestamps, but they do
not consistently have:

- an authoritative `projectId`;
- a canonical `conversationId`;
- backend-derived actor identity;
- authorization-derived `actorRole`;
- one immutable event ID shared by all projections;
- separate occurrence and backend-recording timestamps;
- backend acknowledgement or idempotency evidence.

The existing canonical contract is structurally ready:

```text
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

The writers are not ready to satisfy it authoritatively.

## Audit Rules Applied

1. `currentViewerRole`, `activeAccountMode`, visible sender labels, and UI mode
   are presentation context, not actor authority.
2. `conversationId` is never promoted to `projectId`.
3. `requestId`, `quoteRequestId`, `scheduleId`, `jobId`, and generic `id` are
   not canonical Project identity without an approved aggregate link.
4. A client-generated `Date.now()` ID is a source-local correlation value, not
   a backend canonical event ID.
5. A client timestamp is occurrence evidence, not backend `recordedAt`.
6. A storage write succeeding is not backend acknowledgement.
7. A read projection, registry row, or navigation context is not an event
   writer merely because it contains timestamps or status.

## Readiness Classification

| Classification | Meaning |
| --- | --- |
| SHADOW CANDIDATE | May produce a development-only comparison when every required identity is explicit; legacy remains authoritative |
| CONDITIONAL | Useful source structure exists, but one or more required authorities are normally absent |
| BLOCKED | Canonical generation would require guessing identity, actor, event type, finality, or acknowledgement |
| NOT AN EVENT WRITER | Projection, navigation, or presentation state only |

## Writer Inventory

| # | File and location | Events/claims produced | Targets | Readiness |
| --- | --- | --- | --- | --- |
| 1 | `src/pages/ConversationThread.jsx`, `addOutgoingMessage` and `sendMessage` | Text, image, location, scan, update, approval, payment, photo workflow, materials, and other message/card claims | React state, `meetro_conversation_*`, `POST /messages`, optional `POST /workflow-events` | CONDITIONAL |
| 2 | `src/pages/ConversationThread.jsx`, change-request action | `workflow_change_request` | React state, later local Conversation persistence effect | BLOCKED |
| 3 | `src/pages/ConversationThread.jsx`, `saveChatScheduleAppointment` and `saveMessageAsSchedule` | Schedule creation plus Conversation schedule card | `meetro_business_schedule`, `meetro_conversation_*` | CONDITIONAL |
| 4 | `src/pages/ConversationThread.jsx`, automatic and manual job-record saves | Project photo/context and selected message/job-story records | `meetro_job_record_*`, `lastSavedJobRecord` | BLOCKED |
| 5 | `src/pages/QuoteBuilder.jsx`, `saveDraftQuote` | Quote draft created or updated | Three quote-history keys, quote/project link bridge | CONDITIONAL |
| 6 | `src/pages/QuoteBuilder.jsx`, `sendQuote` | Quote created/sent/revised, homeowner quote-received timeline item, Conversation quote card | Three quote-history keys, `homeownerRequests[].projectTimeline`, `meetro_conversation_*`, link bridge | SHADOW CANDIDATE |
| 7 | `src/components/workflows/WorkflowQuoteSentCard.jsx`, quote decisions | Quote accepted, revision requested, or declined | Three quote-history keys, in-memory Conversation card status, link bridge | BLOCKED |
| 8 | `src/pages/ContractorDashboard.jsx`, `saveManualScheduleVisit` | Appointment created/updated and optional schedule card | `meetro_business_schedule`, `meetro_conversation_*`, schedule/project link bridge | CONDITIONAL |
| 9 | `src/pages/ContractorDashboard.jsx`, `appendWorkflowTimelineEvent` callers | Appointment completed, quote required, work/emergency start, materials needed, pending-decision outcomes | `meetroWorkflowTimeline`, `projectTimeline`, `meetroProjectTimelineEvents` | CONDITIONAL |
| 10 | `src/pages/ContractorDashboard.jsx`, `updateQuoteLifecycleStatus` | Quote lifecycle and quote-to-job conversion claims | Three quote-history keys, active job/work snapshots, quote/project link bridge | BLOCKED |
| 11 | `src/pages/CompletionSheet.jsx`, `saveCompletion` | Completion record, schedule completion, closeout card, Conversation archive, emergency archive, metrics | Many local stores and Conversation/history projections | BLOCKED |
| 12 | `src/pages/ProjectDetails.jsx`, activate and mark-completed actions | Work started and Project completed claims | `homeownerRequests`, selected Project, `completedProjects`, counters and revenue | BLOCKED |
| 13 | `src/pages/MessagesInbox.jsx`, registry save/open/delete | Conversation index, unread, archive/display and deletion state | Conversation registry and index keys | NOT AN EVENT WRITER |
| 14 | `src/components/workflows/WorkflowCompletionCloseoutCard.jsx` | No completion transition; share and navigation only | View/navigation keys | NOT AN EVENT WRITER |
| 15 | `src/utils/workflowCommands.js`, bridge commands | Project links, contexts, and append-only shadow timeline command records | `meetroProjectLinks`, `meetroProjectTimelineEvents`, `meetroProjectContexts` | CONDITIONAL bridge only |

## Detailed Writer Findings

### 1. Conversation Message and Workflow-Card Send

**File:** `src/pages/ConversationThread.jsx`  
**Functions:** `sendMessage`, card senders, `addOutgoingMessage`

| Provenance field | Current behavior |
| --- | --- |
| Event types | Text/image cards map conceptually to `MESSAGE_CREATED`; materials maps to `WORKFLOW_MATERIALS_REQUESTED`; several card types have no approved canonical event type |
| Storage/backend target | Added to React state, persisted by Conversation effect, sent to `POST /messages`; workflow cards also trigger a non-blocking `POST /workflow-events` |
| `projectId` | Missing from the outgoing message. Selected request and active work context exist elsewhere but are not authoritative Project identity |
| `conversationId` | Read from `activeConversationId`; may be a quote-request ID, emergency/local ID, synthetic active-job ID, or demo ID |
| Actor ID | Not included in the message request. Backend may derive sender identity from JWT, but the frontend response does not prove that contract here |
| `actorRole` | `currentViewerRole` derives from local `activeAccountMode`; this is UI context and cannot be canonical authority |
| Event ID | Client IDs use prefixes plus `Date.now()`; successful backend messages receive `backendId` afterward |
| Occurrence timestamp | `createdAt` is a client clock value |
| `recordedAt`/acknowledgement | Message response supplies a backend message ID; it does not visibly return canonical `createdAt`, Project, Conversation, sender, role, or canonical event ID. Workflow-event request is fire-and-forget |
| Unsafe fallbacks | `selectedQuoteRequestId || conversationId`; current viewer as actor role; local message ID as event ID; message text used as event label |

**Recommended canonical payload:**

```text
MESSAGE_CREATED {
  messageId,
  messageType,
  channel,
  replyToMessageId?,
  attachmentRefs?,
  clientOccurrenceAt?,
  backendMessageId
}
```

For workflow cards, the payload should reference the stable workflow entity,
such as `quoteId`, `scheduleId`, `completionId`, or `materialsRequestId`, and
must use an approved canonical event type.

**Phase 4:** A backend-acknowledged `MESSAGE_CREATED` comparison is a
conditional candidate only after the response returns authoritative
Conversation, Project, sender, role, timestamp, and event/message identity.
Do not infer those fields in the client.

### 2. Change-Request Card

**File:** `src/pages/ConversationThread.jsx`  
**Location:** homeowner change-request attachment action

The action creates `workflow_change_request` directly in React state. The
general Conversation persistence effect later stores it locally.

| Provenance field | Current behavior |
| --- | --- |
| `projectId` | Missing |
| `conversationId` | Implicit through the storage key only |
| Actor ID | Missing |
| `actorRole` | Local current viewer mode |
| Event ID | Client `workflow-change-${Date.now()}` |
| Occurrence timestamp | Client `Date.now()` |
| `recordedAt`/acknowledgement | None |
| Event type | No approved canonical change-request event exists in the contract |

**Recommended payload:** future approved change-request event containing
`changeRequestId`, requested scope, priority, and related Project. The event
type and ownership require a product decision.

**Phase 4:** BLOCKED.

### 3. Conversation Schedule Writers

**File:** `src/pages/ConversationThread.jsx`  
**Functions:** `saveChatScheduleAppointment`, `saveMessageAsSchedule`

These functions create a schedule record and a separate Conversation card.

| Provenance field | Current behavior |
| --- | --- |
| Event types | Conceptually `WORKFLOW_APPOINTMENT_CREATED` |
| Targets | Business schedule plus local Conversation |
| `projectId` | Missing |
| `conversationId` | Explicit local active Conversation value |
| Actor ID | Missing |
| `actorRole` | Hard-coded business on the card |
| Event ID | Separate client schedule and card IDs; no shared event ID |
| Occurrence timestamp | Client `createdAt` |
| `recordedAt`/acknowledgement | None |
| Unsafe fallbacks | Message text becomes schedule notes; Conversation context may be a quote-request ID; generic schedule/card IDs are treated as durable |

**Recommended canonical payload:**

```text
WORKFLOW_APPOINTMENT_CREATED {
  appointmentId,
  appointmentType,
  scheduledFor,
  locationRef?,
  notesRef?,
  sourceMessageId?
}
```

**Phase 4:** CONDITIONAL only when a canonical Project link, authenticated
actor, authorized business role, canonical Conversation, and shared event
correlation ID are available.

### 4. Job-Record Writers

**File:** `src/pages/ConversationThread.jsx`  
**Functions:** automatic explanation-photo save, `saveToJobRecord`

| Provenance field | Current behavior |
| --- | --- |
| Event types | Photo/context, update, approval, payment, materials, issue, completion-like records; vocabulary is presentation-oriented |
| Target | `meetro_job_record_${conversationId}` |
| `projectId` | Missing |
| `conversationId` | Explicit local key |
| Actor ID / role | Missing |
| Event ID | Client `job-record-${Date.now()}` |
| Occurrence timestamp | Display time and `savedAt` client time |
| `recordedAt`/acknowledgement | None |
| Unsafe fallbacks | `jobId` may fall back to `conversationId`; customer/title/text are stored as context |

**Recommended canonical payload:** job records should reference canonical
workflow event IDs or document/evidence IDs. They should not independently
invent work, completion, or relationship timeline events.

**Phase 4:** BLOCKED until Project Folder/evidence ownership and event-type
policy are approved.

### 5. Quote Draft Writer

**File:** `src/pages/QuoteBuilder.jsx`  
**Function:** `saveDraftQuote`

| Provenance field | Current behavior |
| --- | --- |
| Event type | Conceptually `WORKFLOW_QUOTE_CREATED`, but draft update and initial creation are not distinguished canonically |
| Target | Three mirrored quote-history arrays and a project-link bridge |
| `projectId` | Resolved through compatibility identity, commonly from `requestId` |
| `conversationId` | Not stored on the draft in all paths |
| Actor ID / role | Missing |
| Event ID | Quote ID exists; no event ID |
| Occurrence timestamp | Client `createdAt`/`updatedAt` |
| `recordedAt`/acknowledgement | None |
| Unsafe fallbacks | `requestId` may be generated from `Date.now()`; generic request `id` may become request identity |

**Recommended canonical payload:**

```text
WORKFLOW_QUOTE_CREATED {
  quoteId,
  quoteVersion,
  quoteNumber,
  amount,
  status: "draft"
}
```

**Phase 4:** CONDITIONAL. Draft creation may be compared only when the quote is
already linked to authoritative Project and actor context. Draft updates may
need a separate event policy.

### 6. Quote Sent/Revised Writer

**File:** `src/pages/QuoteBuilder.jsx`  
**Function:** `sendQuote`

One action writes:

1. quote history;
2. homeowner request quote state;
3. homeowner project timeline;
4. local Conversation workflow card;
5. quote/project link bridge;
6. development-only factory comparison.

| Provenance field | Current behavior |
| --- | --- |
| Event type | `WORKFLOW_QUOTE_SENT`; revised quote uses the same canonical type in the current shadow comparison |
| `projectId` | Compatibility resolver uses explicit `projectId` or `requestId`; request-derived identity remains non-authoritative |
| `conversationId` | Selected from several request/revision fields; absent for external quotes |
| Actor ID | Development comparison reads local `userId`; not backend-authenticated proof |
| `actorRole` | Hard-coded `business` |
| Event ID | Workflow-card ID is reused as the shadow event ID, but it remains client-local |
| Occurrence timestamp | Card `createdAt` and quote `sentAt` are client times |
| `recordedAt`/acknowledgement | No backend acknowledgement for the quote event |
| Unsafe fallbacks | Request ID may be generated; Project identity may be request-derived; sender name is display data; three event schemas drift |

**Recommended canonical payload:**

```text
WORKFLOW_QUOTE_SENT {
  quoteId,
  quoteVersion,
  quoteNumber,
  amount,
  labor,
  materials,
  status: "sent",
  isRevision
}
```

**Phase 4:** Best current **development-only shadow candidate**, but only for
records with explicit authoritative Project and Conversation IDs and
authenticated actor context. The existing broad shadow comparison must not be
interpreted as migration approval.

### 7. Quote Decision Writer

**File:** `src/components/workflows/WorkflowQuoteSentCard.jsx`  
**Functions:** `acceptQuote`, `requestRevision`, `declineQuote`

| Provenance field | Current behavior |
| --- | --- |
| Event types | Accepted maps to `WORKFLOW_QUOTE_ACCEPTED`; revision request and decline lack approved canonical types |
| Targets | Three quote-history arrays, in-memory message status, project-link bridge |
| `projectId` | Compatibility resolver may use request identity |
| `conversationId` | Present only through enclosing card/thread, not persisted in decision record |
| Actor ID | Missing |
| `actorRole` | UI gating suggests homeowner, but no authoritative role is persisted |
| Event ID | Missing |
| Occurrence timestamp | Client `decisionAt` and quote lifecycle timestamps |
| `recordedAt`/acknowledgement | None |
| Unsafe fallbacks | `msg.id` may become `quoteId`; current viewer/UI action is treated as customer authority |

**Recommended accepted payload:**

```text
WORKFLOW_QUOTE_ACCEPTED {
  quoteId,
  quoteVersion,
  decisionId,
  decision: "accepted"
}
```

Revision and decline require approved event types and decision ownership.

**Phase 4:** BLOCKED.

### 8. Work Center Schedule Writer

**File:** `src/pages/ContractorDashboard.jsx`  
**Function:** `saveManualScheduleVisit`

| Provenance field | Current behavior |
| --- | --- |
| Event types | Appointment created or updated; local card uses generic `schedule` |
| Targets | Business schedule, optional Conversation card, schedule/project link bridge |
| `projectId` | Existing visit or selected request through compatibility resolver |
| `conversationId` | Read from active-work/active-Conversation local keys |
| Actor ID / role | Missing; card says business |
| Event ID | Schedule ID and separate card ID; no event ID |
| Occurrence timestamp | Client `createdAt`/`updatedAt` |
| `recordedAt`/acknowledgement | None |
| Unsafe fallbacks | Manual schedules may have no Project; active Conversation selection may be stale |

**Recommended payloads:** `WORKFLOW_APPOINTMENT_CREATED` or
`WORKFLOW_APPOINTMENT_UPDATED` with `appointmentId`, type, schedule, location,
and previous/new values for updates.

**Phase 4:** CONDITIONAL shadow candidate only for explicitly linked Projects.

### 9. Work Center Timeline Writer

**File:** `src/pages/ContractorDashboard.jsx`  
**Function:** `appendWorkflowTimelineEvent`

The helper writes the same client event to two legacy arrays and optionally
copies it into the shadow timeline bridge.

| Provenance field | Current behavior |
| --- | --- |
| Event types | `appointment_completed`, `quote_required`, immediate-work/emergency outcomes, `materials_needed`, waiting/follow-up/not-good-fit outcomes |
| Targets | `meetroWorkflowTimeline`, `projectTimeline`, `meetroProjectTimelineEvents` |
| `projectId` | Resolver accepts explicit Project or request identity from the schedule item |
| `conversationId` | Event field may fall back to request identity |
| Actor ID / role | Missing |
| Event ID | Client `timeline-${Date.now()}` or supplied local ID |
| Occurrence timestamp | Helper-generated client `createdAt` |
| `recordedAt`/acknowledgement | Shadow command has a separate client-created command timestamp, not backend acknowledgement |
| Unsafe fallbacks | Request identity accepted as Project; Conversation may equal request; event type vocabulary is not canonical |

**Recommended payload:** each outcome must map to a separately approved
canonical event. Appointment completion likely requires an appointment-updated
or appointment-completed policy. Work start may map to
`WORKFLOW_WORK_STARTED`. Quote-required, follow-up, not-good-fit, and emergency
dispatch require event registry decisions.

**Phase 4:** Existing shadow bridge may continue as diagnostics. Canonical
factory parity is BLOCKED until event types and identity authorities are
approved.

### 10. Work Center Quote Lifecycle Writer

**File:** `src/pages/ContractorDashboard.jsx`  
**Function:** `updateQuoteLifecycleStatus`

| Provenance field | Current behavior |
| --- | --- |
| Event types | Sent, viewed, accepted, revision requested, declined, converted to job, completed |
| Targets | Three quote arrays, active job/work snapshots, quote/project links |
| `projectId` | Compatibility resolver |
| `conversationId` | May be inherited in quote data; not required |
| Actor ID / role | Missing |
| Event ID | Missing |
| Occurrence timestamp | Client lifecycle fields |
| `recordedAt`/acknowledgement | None |
| Unsafe fallbacks | One UI function can assert customer decisions, conversion, work activation, and completion without separate authorities |

**Recommended payload:** separate approved decision, conversion, work-start,
and completion events. Quote status must not stand in for Project workflow
authority.

**Phase 4:** BLOCKED.

### 11. Completion and Archive Writer

**File:** `src/pages/CompletionSheet.jsx`  
**Function:** `saveCompletion`

One action writes completion, schedule, Conversation, archive, emergency,
active-work cleanup, counters, revenue, and navigation state.

| Provenance field | Current behavior |
| --- | --- |
| Event type | Closest approved type is `WORKFLOW_COMPLETION_SUBMITTED`; UI/card language also claims closeout and completed history |
| `projectId` | Missing |
| `conversationId` | Derived from active work, invoice, or active Conversation local state |
| Actor ID | Missing |
| `actorRole` | Card is hard-coded business; no authorization proof |
| Event ID | `completed-${Date.now()}` and a separate numeric card ID |
| Occurrence timestamp | Client `completedAt` |
| `recordedAt`/acknowledgement | None |
| Unsafe fallbacks | `requestId` falls back to `conversationId`; completion submission archives Conversation; completion and closure are conflated; counters increment directly |

**Recommended payload:**

```text
WORKFLOW_COMPLETION_SUBMITTED {
  completionId,
  workEvidenceRefs,
  completionSummaryRef,
  amount,
  materialsCost,
  laborHours,
  paymentState,
  scheduleId?,
  emergencyId?
}
```

`WORKFLOW_COMPLETION_CONFIRMED` and Project Closure must be separate
authoritative actions.

**Phase 4:** BLOCKED. Product decisions are required for completion finality,
customer confirmation, emergency exceptions, archive timing, and Closure.

### 12. Project Activation and Direct Completion

**File:** `src/pages/ProjectDetails.jsx`  
**Location:** activate and mark-completed buttons

| Provenance field | Current behavior |
| --- | --- |
| Event types | Conceptually `WORKFLOW_WORK_STARTED` and completion submitted/confirmed |
| Targets | Homeowner requests, selected Project snapshot, completed Projects, counters, revenue |
| `projectId` | Uses `requestId || post.id`; canonical Project authority is absent |
| `conversationId` | Not part of the transition |
| Actor ID / role | Missing; professional visibility is inferred from return-page context |
| Event ID | Missing |
| Occurrence timestamp | Client `startedAt`/`completedAt` |
| `recordedAt`/acknowledgement | None |
| Unsafe fallbacks | Return page acts as authorization; direct completion bypasses Completion Sheet; status update is treated as history and revenue authority |

**Recommended payloads:** `WORKFLOW_WORK_STARTED` and
`WORKFLOW_COMPLETION_SUBMITTED`, each generated by the owning Project command
with authoritative actor and backend time.

**Phase 4:** BLOCKED.

### 13. Messages Inbox Registry

**File:** `src/pages/MessagesInbox.jsx`

The registry writes Conversation summaries, unread state, archive display
state, selected context, and local deletion markers. It does not create a
workflow event.

Its generic registry `id` must not become canonical Conversation, Project, or
event identity without backend authority. `savedAt` is index-update time, not a
relationship event timestamp.

**Phase 4:** Exclude from canonical writer parity. Audit separately as a
Conversation index projection.

### 14. Completion Closeout Card

**File:** `src/components/workflows/WorkflowCompletionCloseoutCard.jsx`

The component shares records and changes navigation/view keys. It does not
persist confirmation or follow-up transitions. Rendered
`completionStatus === "confirmed"` must not be treated as evidence that this
component wrote `WORKFLOW_COMPLETION_CONFIRMED`.

**Phase 4:** NOT AN EVENT WRITER.

### 15. Workflow Command Bridge

**File:** `src/utils/workflowCommands.js`

The bridge requires a non-empty compatibility Project identity and writes
append-only local commands. It does not validate the canonical event envelope.

| Provenance field | Current behavior |
| --- | --- |
| `projectId` | Required, but callers may have resolved it from request or generic legacy identity |
| Actor / role | Absent |
| Event ID | Embedded legacy event may have local ID; command ID combines type, client timestamp, and randomness |
| `recordedAt` | Command `createdAt` is a client timestamp |
| Backend acknowledgement | None |
| Idempotency | None |

The bridge is appropriate for reconciliation experiments only. It must not be
promoted to canonical workflow authority.

## Canonical Event-Type Gaps

The current contract does not yet approve types for:

- change requested;
- quote revision requested;
- quote declined;
- quote viewed;
- quote converted to job;
- appointment completed;
- quote required after consultation;
- follow-up required;
- not a good fit;
- work ready to start versus work actually started;
- emergency dispatch started;
- issue documented;
- progress update;
- before/progress/completion photo evidence;
- payment requested or paid;
- invoice requested;
- materials approved or changed;
- Project Closure;
- obligation created, fulfilled, overdue, or waived.

These are product and ownership decisions. The audit does not map them to
`UNKNOWN_WORKFLOW_EVENT` for canonical writes because strict canonical writers
must not persist unknown event types.

## Safe Shadow Candidates

No writer is approved for canonical authority.

The following are suitable for **development-only shadow comparison** after a
strict eligibility gate:

| Candidate | Required eligibility |
| --- | --- |
| Quote sent | Explicit authoritative Project and Conversation IDs; authenticated actor and authorized role; stable quote ID/version; one client correlation ID; no external quote |
| Appointment created/updated | Explicit Project link; canonical Conversation where communication is involved; authenticated scheduler; stable appointment ID; clear created versus updated event |
| Backend message acknowledged | Backend response returns message/event ID, Conversation, Project, sender, role, and backend timestamp |
| Work Center timeline event | Event type is in the approved registry; explicit Project; actor provenance; no request/conversation substitution |

Shadow generation must:

- run after the legacy action succeeds;
- never persist into canonical production storage;
- never block the legacy action;
- compare metadata only;
- never log message text, notes, customer details, photos, or payload content;
- preserve the legacy writer as authority.

## Unsafe Writer Candidates

The following must not enter Phase 4 shadow canonical generation yet:

- quote decisions from `WorkflowQuoteSentCard`;
- change-request cards;
- manual and automatic job records;
- ProjectDetails direct activation/completion;
- CompletionSheet completion/closeout;
- quote lifecycle conversion to work/completion;
- emergency completion/closure;
- inbox registry/archive/deletion state;
- any writer whose Project identity is request-, Conversation-, title-, or
  generic-ID-derived;
- any writer whose actor is inferred from current viewer or return-page state.

## Product and Authority Decisions Required

The audit stops before migration because these decisions are required:

1. **Project authority:** Which backend aggregate creates and owns canonical
   `projectId`, and how legacy Requests, Quotes, Schedules, Emergencies, and
   portfolio Projects link to it.
2. **Conversation authority:** Whether Conversations are Project-scoped,
   Relationship-scoped, or both, and which backend creates membership.
3. **Actor authority:** Which authenticated backend context supplies actor ID
   and role for each action.
4. **Event ID authority:** Whether event IDs are backend-generated or accepted
   idempotency IDs, and how retries return the same event.
5. **Timestamp policy:** Separate client occurrence time from backend
   `recordedAt`.
6. **Message acknowledgement:** Required `POST /messages` response fields and
   whether one transaction also persists `MESSAGE_CREATED`.
7. **Workflow-event acknowledgement:** Whether `/workflow-events` is
   transactional, idempotent, and participant-authorized.
8. **Event registry:** Ownership and semantics for the missing event types.
9. **Quote decisions:** Who may accept, revise, or decline, and how version
   identity prevents accepting an obsolete quote.
10. **Completion finality:** Submission versus confirmation, approved
    exceptions, emergency policy, and homeowner/professional separation.
11. **Closure:** Which obligations prevent closure and who may fulfill, waive,
    or reopen them.
12. **Project Folder/job records:** Whether they are evidence projections or
    independent workflow events.

## Recommended Conversation Phase 4

**Conversation Phase 4 - Canonical Writer Eligibility Contract and Shadow
Parity Harness**

Phase 4 should remain pure and non-persisting.

Create a validator that accepts a proposed canonical event and provenance
evidence, then returns:

```text
{
  eligible,
  fieldTrust,
  blockers,
  warnings,
  shadowRisk
}
```

It should require:

- canonical event type;
- explicit canonical Project and Conversation identities;
- authenticated actor identity;
- authorization-derived actor role;
- stable workflow entity identity;
- non-generic event correlation identity;
- valid occurrence timestamp when supplied;
- backend acknowledgement metadata where the event claims backend recording;
- no payload-content logging;
- no mutation or persistence.

The first fixtures should characterize:

1. eligible quote-sent metadata;
2. request-derived Project identity blocked;
3. current-viewer actor role blocked;
4. generic event ID blocked;
5. client-only timestamp marked unacknowledged;
6. conflicting Project/Conversation link blocked;
7. backend-acknowledged message eligible only with all authority fields;
8. completion event blocked by unresolved finality/Closure policy.

Do not wire the validator into runtime writers in Phase 4. Runtime shadow
adoption should be a later phase after the product decisions above are
approved.

## Final Decision

The canonical envelope and read reconciliation layer are ready for writer
eligibility measurement. The current writers are not ready for canonical
authority.

Quote sent is the strongest development-only comparison candidate.
Appointment creation and backend-acknowledged messages may follow when their
identity and acknowledgement contracts are explicit.

Completion, quote decisions, Project activation, job records, emergency
transitions, and archive/index state remain blocked.
