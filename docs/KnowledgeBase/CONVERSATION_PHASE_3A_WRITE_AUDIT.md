# Meetro Conversation Phase 3A - Canonical Event Write Audit

## Scope

This is a read-only architecture audit of workflow-related event creation in the current `meetro-client` repository. No writer, storage key, route, workflow, or UI behavior was changed.

The audit covers:

- conversation messages and workflow cards
- homeowner request project timelines
- Work Center timeline mirrors
- backend message and workflow-event requests
- schedule, quote, work, materials, completion, emergency, invoice, and change-order records
- job-record and notification side channels

Files ending in `.bak*` and `MessagesInbox_backup_user_keys.jsx` were found during the repository search but are not executable imports. They duplicate older event-writing logic and should not become migration targets.

The Knowledge Base files named in earlier phases are not present under `docs/KnowledgeBase` in this checkout. The available handoff reports, the current `workflowEventContract.js`, and the Phase 2 reconciliation utilities were therefore used as the local architecture baseline.

## Executive Summary

The application does not have one workflow-event writer. A single business transition can currently produce several independently shaped records:

1. a conversation card in `meetro_conversation_<conversationId>`
2. a project timeline item in `homeownerRequests[].projectTimeline`
3. a domain record in schedule, quote, job, completion, emergency, invoice, or materials storage
4. a global timeline item in `meetroWorkflowTimeline` and `projectTimeline`
5. a backend message and sometimes a second `/workflow-events` mirror
6. a notification record or browser event

None of the active creation paths writes the full `workflowEventContract.js` envelope. The most common missing fields are:

- immutable `eventId` distinct from a generic record `id`
- `actorId`
- `actorRole`
- `recordedAt`
- canonical `projectId`
- explicit `conversationId`
- `payloadVersion`
- canonical `eventType`
- `source`

The highest-risk writers are `ConversationThread.jsx`, `ContractorDashboard.jsx`, `CompletionSheet.jsx`, and the quote decision paths. They combine state changes, local persistence, backend persistence, navigation, and visible card behavior in the same functions.

Canonical event generation is not ready to replace any legacy write. The safe next step is a pure `workflowEventFactory.js`, followed by shadow generation and reconciliation at one low-risk writer at a time.

## Current Contract

`src/utils/workflowEventContract.js` defines this normalized envelope:

```js
{
  eventId,
  eventType,
  payloadVersion,
  projectId,
  requestId,
  conversationId,
  actorId,
  actorRole,
  occurredAt,
  recordedAt,
  sequence,
  source,
  payload
}
```

The Phase 2 conversation reconciliation layer currently recognizes:

- `WORKFLOW_REQUEST_CREATED`
- `WORKFLOW_APPOINTMENT_CREATED`
- `WORKFLOW_APPOINTMENT_UPDATED`
- `WORKFLOW_QUOTE_CREATED`
- `WORKFLOW_QUOTE_SENT`
- `WORKFLOW_QUOTE_ACCEPTED`
- `WORKFLOW_WORK_STARTED`
- `WORKFLOW_MATERIALS_REQUESTED`
- `WORKFLOW_COMPLETION_SUBMITTED`
- `WORKFLOW_COMPLETION_CONFIRMED`
- `MESSAGE_CREATED`
- `UNKNOWN_WORKFLOW_EVENT`

The contract normalizer is tolerant by design. It can read incomplete legacy records, but that does not make those records valid canonical writes.

## Repository-Wide Findings

### 1. Request Creation

| File / function | Current event shape and type | Canonical target | Contract gaps | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- |
| `src/pages/Upload.jsx:142` `handleCreatePost` | Creates a request domain record and embeds `{ type: "created", label, createdAt }` in `projectTimeline`. | `WORKFLOW_REQUEST_CREATED` | Timeline item has no event ID, project/request ID, conversation ID, actor, actor role, recorded time, source, or payload version. | MEDIUM | After backend post identity is known, shadow-create one canonical request event. Keep the request record and legacy timeline unchanged until parity is proven. |

### 2. Conversation Messages and Generic Cards

| File / function | Current event shape and type | Canonical target | Contract gaps | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- |
| `src/pages/ConversationThread.jsx:817` `starterMessages` | In-memory demo `{ id, type: "text", sender, text, time, createdAt }`. | `MESSAGE_CREATED`, demo-only | No project/conversation identity, actor ID/role, recorded time, or source. Timestamp changes on render construction. | LOW | Keep outside canonical persistence or mark explicitly as synthetic demo data. |
| `src/pages/ConversationThread.jsx:859` `mapBackendMessage` | Merges `workflow_payload` with backend message fields and synthesizes `id`, `sender`, `senderRole`, `createdAt`, and `time`. | `MESSAGE_CREATED` or mapped workflow type | No guaranteed project ID, conversation ID, event ID, actor ID, or recorded time. Actor role is inferred from the viewer. | HIGH | Backend response should eventually supply the canonical envelope. Do not make viewer-relative role inference part of canonical creation. |
| `src/pages/ConversationThread.jsx:1231` `addOutgoingMessage` | Adds arbitrary message/card objects to React state, posts them as `workflow_payload`, and may POST a second `/workflow-events` record. | `MESSAGE_CREATED` plus a canonical workflow event when applicable | Generic ID doubles as event ID; project and conversation identity are usually absent from payload; no actor ID or recorded time; dual POST can create duplicates; workflow type is inferred from presentation type. | HIGH | Introduce shadow factory output after identity and actor resolution. Preserve `/messages` and `/workflow-events` until backend idempotency and parity are approved. |
| `src/pages/ConversationThread.jsx:1370-1482` send text/image | `{ id, type: "text"|"image", sender, senderRole, createdAt }`. | `MESSAGE_CREATED` | Missing project ID, explicit conversation ID, actor ID, recorded time, source, and payload version. | MEDIUM | Canonicalize through the shared outgoing-message boundary, not each button. |
| `src/pages/ConversationThread.jsx:1488-1602` location/scan/update/approval/payment cards | Presentation types `location`, `scan`, `update`, `approval`, and `payment`. | `MESSAGE_CREATED` until business-specific event types are approved | Presentation type is being used as event semantics. No stable entity ID or project/conversation identity. | MEDIUM | Preserve as message events with typed payloads. Do not invent workflow transitions from card labels. |
| `src/pages/ConversationThread.jsx:1611-1655` and `1740-1816` photo workflow | `type: "photoWorkflow"` with `workflowType: before|progress|issue|completion`. | `MESSAGE_CREATED`; possible future work-documentation types | `workflowType` values are not canonical transition names; no project ID, conversation ID, actor ID, recorded time, or durable media identity. | MEDIUM | Canonicalize as a message/document event first. A product decision is required before photos imply work-started or completion transitions. |
| `src/pages/ConversationThread.jsx:3631` inline change-request action | Creates an in-memory `workflow_change_request` but does not use `addOutgoingMessage`. | Future change-request type; currently `UNKNOWN_WORKFLOW_EVENT` | Not persisted by this path, no request/project/conversation ID, actor ID, or recorded time. | HIGH | Consolidate only after deciding whether this action is intentionally ephemeral. Do not silently route it through persistence. |

### 3. Appointment and Schedule Events

| File / function | Current event shape and type | Canonical target | Contract gaps | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- |
| `src/pages/ConversationThread.jsx:1981` `saveChatScheduleAppointment` | Writes a schedule domain record and a conversation card `type: "schedule"` with nested `schedule`. | `WORKFLOW_APPOINTMENT_CREATED` | Schedule has conversation ID but no project/request ID or actor. Card has no explicit conversation ID, project ID, actor ID, recorded time, or stable appointment event ID. | HIGH | Generate one shadow canonical appointment event from `newVisit` only when project identity is explicitly linked. Treat the conversation card as a projection. |
| `src/pages/ConversationThread.jsx:2058` `saveMessageAsSchedule` | Creates a schedule from a message and another `type: "schedule"` card. | `WORKFLOW_APPOINTMENT_CREATED` | Uses conversation identity only; no request/project ID, actor metadata, recorded time, or source event linkage to the original message. | HIGH | Require an explicit project link and preserve originating message ID in payload before canonical adoption. |
| `src/pages/ContractorDashboard.jsx:804` `saveManualScheduleVisit` | Writes `meetro_business_schedule`; on creation also writes a `schedule` conversation card. | Created: `WORKFLOW_APPOINTMENT_CREATED`; edit: `WORKFLOW_APPOINTMENT_UPDATED` | Manual schedules commonly have no project/request/conversation ID. Card lacks actor ID/role and recorded time. Existing shadow link is not a canonical event. | HIGH | Shadow factory only when identity is safe. For unlinked manual schedules, report identity warnings and do not guess from title/customer. |
| `src/pages/ContractorDashboard.jsx:1054` `completeScheduleVisit` | Updates schedule status and appends global type `appointment_completed`. | New canonical appointment-completed type required | Current canonical set has created/updated but no completed appointment. Event lacks actor metadata and recorded time; conversation ID can fall back to request ID. | HIGH | Product/architecture approval is required for the canonical type and appointment lifecycle semantics before migration. |
| `src/pages/MyRequests.jsx:1082` scheduling action | Changes request status to `scheduled` without creating a timeline event or schedule entity. | `WORKFLOW_APPOINTMENT_CREATED` only if an appointment actually exists | No appointment ID, date/time, conversation event, actor, or event record. | HIGH | Do not generate an appointment event from status alone. First decide whether this action represents scheduling intent or a real appointment. |

### 4. Quote Events

| File / function | Current event shape and type | Canonical target | Contract gaps | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- |
| `src/pages/QuoteBuilder.jsx:392` `saveDraftQuote` | Quote domain record with `status: "draft"` in three history keys. | `WORKFLOW_QUOTE_CREATED` | No canonical project ID, conversation ID, actor metadata, recorded time, or event ID. Existing shadow link is identity linkage only. | MEDIUM | Shadow-generate `WORKFLOW_QUOTE_CREATED` once per immutable quote ID, not on every draft save. Define update semantics separately. |
| `src/pages/QuoteBuilder.jsx:468` `sendQuote` | Updates quote histories, appends homeowner timeline `quoteReceived`, and creates `workflow_quote_sent` or `workflow_revised_quote` conversation card. | `WORKFLOW_QUOTE_SENT` | Three schemas represent the same transition. Conversation card lacks project ID, conversation ID, actor ID, and recorded time. Timeline lacks event ID and actor metadata. | HIGH | Use one factory event as the correlation source for all shadow projections. Preserve the existing three writes during reconciliation. |
| `src/pages/QuoteBuilder.jsx:325` `shareExternalQuote` | Saves external quote as `sent` without a conversation event. | `WORKFLOW_QUOTE_SENT` with external delivery metadata | Usually no safe project ID or conversation ID; share success does not prove customer receipt. | HIGH | Product decision required: distinguish “generated/shared” from “sent to a Meetro conversation.” |
| `src/components/workflows/WorkflowQuoteSentCard.jsx:22` quote decisions | Mutates quote status and message state for accepted, revision requested, or declined. | Accepted: `WORKFLOW_QUOTE_ACCEPTED`; revision/decline require canonical types | No event record; actor ID/role and timestamps are only partial status fields. Repeated clicks can repeat shadow links. | HIGH | Add idempotent shadow events only after revision and decline event types are approved. Use quote ID plus transition as an idempotency key. |
| `src/components/workflows/WorkflowRevisedQuoteCard.jsx:30` revised quote decisions | Writes `revisedQuoteApproved` or `revisedQuoteChangeRequested` to homeowner timeline and mutates card state. | Approved may map to `WORKFLOW_QUOTE_ACCEPTED`; change request needs a new type | Timeline event lacks ID, identity, actor, recorded time, and source. Matching may use project title. | HIGH | Resolve explicit request/project identity first. Never canonicalize title-matched updates. |
| `src/pages/MyRequests.jsx:894` quote acceptance | Mutates request, quote history, notification, and writes `quoteAccepted` timeline item. | `WORKFLOW_QUOTE_ACCEPTED` | No immutable event ID, actor metadata, recorded time, conversation ID, or canonical project ID. | HIGH | Shadow at the confirmed acceptance boundary using request ID and quote ID. Keep notification and legacy writes unchanged. |
| `src/pages/MyRequests.jsx:1145` revision request | Updates request and quote histories and emits `quote_revision_requested` notification, but no timeline event. | New canonical quote-revision-requested type required | Notification is not a workflow event; missing event identity, actor metadata, project/conversation context, and recorded time. | HIGH | Approve the canonical type first, then shadow from the confirmation handler. |
| `src/pages/ContractorDashboard.jsx:1438` `updateQuoteLifecycleStatus` | Mutates quote status through draft/sent/viewed/accepted/revision/declined/converted/completed and can create active work snapshots. | Several canonical types; only created/sent/accepted/work-started currently exist | A single generic status mutator covers semantically different transitions. No canonical event emitted. | HIGH | Split future event mapping by transition without changing the status writer. Require explicit type approval for viewed, revision, decline, expiry, and quote-completed. |

### 5. Work and Visit Outcome Events

| File / function | Current event shape and type | Canonical target | Contract gaps | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- |
| `src/pages/ContractorDashboard.jsx:970` `appendWorkflowTimelineEvent` | Writes the same object to `meetroWorkflowTimeline`, `projectTimeline`, and the shadow timeline command namespace. | Depends on supplied type | Generates generic ID and created time, but lacks actor metadata, recorded time, payload version, source, and often safe identity. | HIGH | This is the best centralized shadow-factory insertion point after actor resolution. Do not replace any of its three writes in the first adoption phase. |
| `src/pages/ContractorDashboard.jsx:1096` `applyVisitOutcome` | Emits `quote_required`, `start_work_immediately`, `emergency_dispatch`, `materials_needed`, `waiting_customer_decision`, `follow_up_required`, or `not_good_fit`. | Work start maps to `WORKFLOW_WORK_STARTED`; materials to `WORKFLOW_MATERIALS_REQUESTED`; others require types | Mixed commands, statuses, and events use the same generic timeline schema. Actor metadata absent. Some identity derives from schedule ID. | HIGH | Create an approved mapping table before shadow generation. Do not collapse pending/follow-up/archive outcomes into unknown work events. |
| `src/pages/ContractorDashboard.jsx:4160` quote-to-active-work action | Writes active work/job snapshots with `type: "quote_approved"` but no timeline event. | `WORKFLOW_WORK_STARTED` only when work truly starts | Current action may mean project activation, not physical work started. IDs can fall back through quote, request, or conversation IDs. | HIGH | Product decision required to separate project activation from work start. |
| `src/pages/JobUpdate.jsx:24` `saveUpdate` | Writes `{ id, jobName, customer, status, note, createdAt }` to `jobUpdates`. Status includes “Work started” and “Work completed.” | `WORKFLOW_WORK_STARTED` only for explicit start; other types need approval | No project/job/conversation identity, actor metadata, recorded time, or stable event type. Name-based context only. | MEDIUM | Do not canonicalize until the active job supplies a safe project ID. Map explicit status values, never display text. |
| `src/pages/ConversationThread.jsx:1430` and `2227` job-record saves | Copies selected conversation content into per-conversation job records. | Usually `MESSAGE_CREATED` projection, not a second workflow transition | New generic record ID can duplicate the original event; project ID and actor metadata are absent. | MEDIUM | Preserve source message/event ID. Do not emit a second canonical workflow transition when content is merely saved. |

### 6. Materials Events

| File / function | Current event shape and type | Canonical target | Contract gaps | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- |
| `src/pages/ConversationThread.jsx:1661` `sendMaterialsCard` | Sends `workflow_materials_approval` card and writes `materialsApprovalRequested` homeowner timeline item. | `WORKFLOW_MATERIALS_REQUESTED` | Request ID may fall back to conversation ID; no project ID, actor ID, recorded time, source, or event correlation between the two writes. | HIGH | Shadow one event only with safe project identity. Link both legacy records using the same future event ID. |
| `src/components/workflows/WorkflowMaterialsApprovalCard.jsx` actions | Writes `materialsApproved`, `customerWillProvideMaterials`, or `materialsChangeRequested` timeline items and mutates card state. | New canonical material-decision types required | No event IDs, identity fields, actor metadata, recorded time, or conversation ID. Request matching can use title. | HIGH | Stop before migration until material decision types and authority are approved. |
| `src/pages/ContractorDashboard.jsx:1225` visit outcome | Creates `meetroMaterialsWorkflow` record and global `materials_needed` timeline event. | `WORKFLOW_MATERIALS_REQUESTED` if semantics are approved | Domain record and event are separate; no actor metadata or recorded time. | MEDIUM | Shadow from the visit outcome using schedule/request linkage; keep domain storage authoritative for current behavior. |
| `src/pages/ContractorDashboard.jsx:4933` send materials list | Writes `type: "materials-list"` conversation message. | `MESSAGE_CREATED` with materials payload | No project ID, actor ID/role, recorded time, or stable materials-list entity ID. | MEDIUM | Keep as a message event unless it requests approval; approval semantics must be explicit in payload. |

### 7. Completion and History Events

| File / function | Current event shape and type | Canonical target | Contract gaps | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- |
| `src/pages/CompletionSheet.jsx:136` `saveCompletion` | Creates completion domain record, updates schedule, appends `workflow_completion_closeout` conversation card, archives conversation, and clears active work. | `WORKFLOW_COMPLETION_SUBMITTED` | Card has generic ID, request ID may fall back to conversation ID, no project ID, actor ID/role field consistency, or recorded time. Many writes must succeed as one user action. | HIGH | Shadow-create after the completion record is successfully saved, using completion ID as entity identity. Never let canonical generation block current closeout. |
| `src/components/workflows/WorkflowCompletionCloseoutCard.jsx` | Displays completion state and navigation; no active confirmation writer in this component. | `WORKFLOW_COMPLETION_CONFIRMED` only when a real confirmation action exists | Current `completionStatus` can display `confirmed`, but this file does not persist that transition. | MEDIUM | Locate or design an explicit confirmation command before generating confirmed events. Do not infer confirmation from rendering. |
| `src/pages/EmergencyComplete.jsx:123` `submitReview` | Saves review and closes emergency record. | Future review-submitted and emergency-closed types | No conversation timeline event and no canonical completion-confirmed event. Review is not equivalent to completion confirmation. | HIGH | Keep review and completion separate. Product decision required for emergency closure semantics. |

### 8. Emergency Events

| File / function | Current event shape and type | Canonical target | Contract gaps | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- |
| `src/pages/EmergencyRequest.jsx` request submission | Creates emergency domain record, photo conversation messages with `workflowType: "emergency_photo"`, and registry item. | Request needs an emergency-specific canonical type; photos map to `MESSAGE_CREATED` | Uses `emergencyRequestId` rather than project ID; photo records use `emergencyConversationId` instead of contract `conversationId`; no actor ID or recorded time. No request-created conversation event exists when there are no photos. | HIGH | Architecture decision required: whether emergency request IDs are canonical project IDs or linked entities. Do not infer this in the factory. |
| `src/utils/emergencyLifecycle.js` status transition | Appends `type: "system"`, `workflowType: "emergency_status"` message when status changes. | Emergency status types require approval | System actor role exists, but no actor ID, project ID, explicit conversation ID, recorded time, or canonical status event name. | HIGH | Define emergency lifecycle event types and idempotency before shadow generation. Preserve status message as a projection. |
| `src/pages/CompletionSheet.jsx` emergency closeout branch | Archives emergency domain and conversation records as part of completion. | `WORKFLOW_COMPLETION_SUBMITTED` plus future emergency-closed event | Completion, history, and emergency closure are coupled. | HIGH | Generate only the completion-submitted shadow event initially. Defer emergency-closed until authority is approved. |

### 9. Change Order and Invoice Events

| File / function | Current event shape and type | Canonical target | Contract gaps | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- |
| `src/pages/ChangeOrderRequest.jsx:44` `submitChangeOrder` | Creates change-order domain record, `changeOrderRequested` timeline item, `workflow_change_request` conversation card, job record, and notification. | New canonical change-request-created type required | Four schemas for one transition; conversation card omits request/project/conversation IDs despite local availability; no actor ID or recorded time. | HIGH | Approve the canonical type, then shadow one event with change-order ID. Use it to correlate all projections. |
| `src/components/workflows/WorkflowChangeRequestCard.jsx` actions | Mutates in-memory card state and saves revised quote context. | Future change-request-reviewed / revised-quote-required types | No persisted event; state may disappear on reload. | HIGH | Decide whether these are durable transitions before adding canonical writes. |
| `src/pages/InvoiceBuilder.jsx:44` `saveInvoice` | Writes invoice scalar keys, `workflow_invoice_request` conversation card, registry state, and browser events. | New canonical invoice/payment-requested type required | Request ID may fall back to conversation ID; no invoice ID, project ID, actor ID/role consistency, recorded time, or payload version. | HIGH | Create a stable invoice entity ID first. Do not use conversation ID as request identity. |
| `src/components/workflows/WorkflowInvoiceRequestCard.jsx` actions | Writes `invoicePaymentMarkedPaid` or `invoiceQuestionAsked` timeline items and mutates card state. | New canonical payment-marked / invoice-question types required | No immutable event ID, project/conversation identity, actor metadata, or recorded time. “Marked paid” is not verified payment. | HIGH | Product decision required on payment authority and wording before canonical migration. |

### 10. Cancellation and Restoration

| File / function | Current event shape and type | Canonical target | Contract gaps | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- |
| `src/pages/MyRequests.jsx:403` `confirmCancelProject` | Prepends `type: "cancelled"` to project timeline. | New canonical project-cancelled type required | No event ID, identity fields, actor metadata, recorded time, source, or cancellation authority. | MEDIUM | Add only after cancellation semantics and fee authority are approved. |
| `src/pages/MyRequests.jsx:446` `restoreProject` | Prepends `type: "restored"` to project timeline. | New canonical project-restored type required | Same gaps as cancellation. | MEDIUM | Treat restoration as a distinct event; do not encode it as a generic request update. |

## Schema Drift

### Event identity

- Most writers use `id`; the contract requires `eventId`.
- IDs generated with `Date.now()` are locally convenient but are not proven globally immutable.
- Conversation messages that are mirrored to `/workflow-events` do not share a declared canonical event ID with the backend event.
- Job-record copies create new IDs and lose the originating message/event identity.

### Actor metadata

- `sender`, `role`, and `senderRole` are used inconsistently.
- `actorId` is absent from almost all local event writers.
- Backend message mapping derives actor role relative to the current viewer, which is unsuitable for immutable event history.
- System messages use `senderRole: "system"` but no stable system actor ID.

### Timestamps

- Writers use `createdAt`, `updatedAt`, `savedAt`, `completedAt`, `sentAt`, and numeric browser times.
- Almost no writer distinguishes `occurredAt` from `recordedAt`.
- Some presentation-only `time` fields are localized strings and cannot be used for ordering.

### Project and conversation identity

- `requestId`, `projectId`, `jobId`, `quoteId`, `scheduleId`, `emergencyRequestId`, and `conversationId` are sometimes substituted for one another.
- Several paths fall back from request ID to conversation ID.
- `workflowTimeline.js` can match records by project title.
- Manual schedule and job update writers often have no safe project identity.

### Event naming

The repository uses mixed casing and multiple semantic layers:

- presentation names: `schedule`, `photoWorkflow`, `materials-list`, `approval`, `payment`
- workflow card names: `workflow_quote_sent`, `workflow_revised_quote`, `workflow_completion_closeout`
- project timeline names: `quoteReceived`, `quoteAccepted`, `materialsApprovalRequested`
- global timeline names: `appointment_completed`, `quote_required`, `materials_needed`
- notification names: `quote_accepted`, `quote_revision_requested`, `change_order_requested`
- status values that act like events: `accepted`, `working`, `completed`, `revision_requested`

These names must not be normalized by string similarity alone. A mapping must be approved per transition.

## Canonical Mapping Table

| Current name | Canonical target | Decision |
| --- | --- | --- |
| `created` request timeline | `WORKFLOW_REQUEST_CREATED` | Supported |
| `schedule`, `appointment`, `schedule_created` | `WORKFLOW_APPOINTMENT_CREATED` | Supported when a real appointment entity exists |
| schedule edit / reschedule | `WORKFLOW_APPOINTMENT_UPDATED` | Supported |
| `appointment_completed` | New appointment-completed type | Product/architecture decision required |
| quote draft creation | `WORKFLOW_QUOTE_CREATED` | Supported once-per-quote semantics are enforced |
| `quoteReceived`, `workflow_quote_sent`, `workflow_revised_quote` | `WORKFLOW_QUOTE_SENT` | Supported, but revision metadata must be retained |
| `quoteAccepted`, `quote_accepted`, revised quote approved | `WORKFLOW_QUOTE_ACCEPTED` | Supported |
| quote revision requested / declined / viewed / expired | New quote lifecycle types | Decision required |
| `start_work_immediately` | `WORKFLOW_WORK_STARTED` | Supported only if this means actual work start |
| `quote_approved`, active project creation | Not automatically work started | Decision required |
| `workflow_materials_approval`, `materialsApprovalRequested`, `materials_needed` | `WORKFLOW_MATERIALS_REQUESTED` | Supported with semantic review |
| material approved / customer providing / changes requested | New material-decision types | Decision required |
| `workflow_completion_closeout` | `WORKFLOW_COMPLETION_SUBMITTED` | Supported |
| completion status `confirmed` | `WORKFLOW_COMPLETION_CONFIRMED` | Supported only from an explicit persisted confirmation |
| text/image/location/scan/list/photo cards | `MESSAGE_CREATED` | Supported as messages, not inferred transitions |
| emergency request/status | New emergency lifecycle types | Decision required |
| change request | New change-request type | Decision required |
| invoice/payment request and decisions | New invoice/payment types | Decision required |
| cancellation/restoration | New project lifecycle types | Decision required |

## Duplicate Creation Patterns

1. Quote sent:
   - quote history record
   - homeowner timeline `quoteReceived`
   - conversation card `workflow_quote_sent`
   - optional backend message
   - optional backend workflow event
   - shadow quote/project link

2. Materials requested:
   - conversation card `workflow_materials_approval`
   - homeowner timeline `materialsApprovalRequested`
   - possible `meetroMaterialsWorkflow` record
   - possible global timeline `materials_needed`

3. Change requested:
   - change-order domain object
   - homeowner timeline item
   - conversation card
   - job record
   - notification

4. Completion:
   - completion domain record
   - schedule status update
   - conversation closeout card
   - history registry update
   - active-work cleanup
   - emergency archive update when applicable

5. Appointment:
   - schedule domain object
   - conversation schedule card
   - global appointment outcome timeline
   - shadow project link

Deduplication cannot safely use text, title, customer name, display time, or timestamp proximity. Future canonical events need one immutable event ID shared by their projections.

## Migration Risk Classification

### Low Risk

- pure factory and validation tests
- synthetic starter-message classification
- shadow generation for a writer that already has explicit project, conversation, entity, and actor identity
- read-only reconciliation reports

### Medium Risk

- request-created shadow event after backend post success
- quote-created event from a stable draft quote ID
- job update events after safe project/job identity is available
- cancellation/restoration after event types are approved
- materials list as `MESSAGE_CREATED`

### High Risk

- `ConversationThread.addOutgoingMessage`
- backend `/messages` plus `/workflow-events` dual persistence
- schedule creation from chat or message content
- `ContractorDashboard.applyVisitOutcome`
- quote send and all quote decision paths
- completion and emergency closeout
- emergency lifecycle status messages
- change-order submission
- invoice/payment flows
- any migration relying on title matching or substituting conversation ID for project/request ID

## Recommended Canonical Write Helper

Proposed file:

`src/utils/workflowEventFactory.js`

### Proposed API

```js
createWorkflowEvent({
  eventId,
  eventType,
  projectId,
  requestId,
  conversationId,
  actorId,
  actorRole,
  occurredAt,
  recordedAt,
  source,
  sequence,
  payload
})
```

Recommended supporting functions:

```js
validateWorkflowEventInput(input)
createWorkflowEventId({ eventType, entityType, entityId })
getWorkflowEventFactoryWarnings(input)
```

The first implementation should be pure. It must not read or write storage, inspect the current user implicitly, dispatch browser events, call the backend, or mutate the input.

### Required Fields

- `eventId`: immutable and reusable across projections
- `eventType`: approved canonical constant
- `projectId`: canonical project identity for project workflow events
- `actorId`: stable user or system identity
- `actorRole`: homeowner, business/professional, or system
- `occurredAt`: when the business transition happened
- `recordedAt`: when the event was persisted
- `source`: creating command or boundary
- `payload`: cloned structured data

`conversationId` should be required for events intended for the relationship timeline. `requestId` should remain optional compatibility identity after `projectId` is present.

### Optional Fields

- `requestId`
- `conversationId` for non-conversation operational events
- `sequence`
- entity references such as `quoteId`, `scheduleId`, `completionId`, or `changeOrderId` inside `payload`
- legacy correlation fields inside a namespaced payload section

### Return Shape

```js
{
  ok,
  event,
  warnings,
  errors
}
```

The factory should fail closed when required identity or actor fields are missing. It should never invent a project ID from a conversation ID, title, customer name, or display text.

### Migration Strategy

1. Build and test the pure factory against `workflowEventContract.js`.
2. Add a canonical event type registry and require explicit approved constants.
3. Start with shadow generation only; do not write canonical events yet.
4. Compare factory output to the legacy record at one writer boundary.
5. Add append-only canonical persistence only after identity, actor, and idempotency coverage are measurable.
6. Reuse one canonical `eventId` across conversation, timeline, domain, and backend projections.
7. Keep legacy writes until rendering and storage authority changes are separately approved.
8. Migrate high-risk writers only after backend idempotency and failure behavior are defined.

## Recommended First Adoption Order

1. Pure `workflowEventFactory.js` and unit tests.
2. Request-created shadow generation after successful post creation.
3. Quote-created shadow generation for a new immutable quote ID.
4. `ContractorDashboard.appendWorkflowTimelineEvent` shadow factory comparison for events with safe identity.
5. Quote-sent correlation across quote history, project timeline, and conversation card.
6. Appointment-created correlation for records with explicit project links.
7. Materials-requested correlation.
8. Completion-submitted shadow event.
9. Conversation backend dual-write reconciliation.
10. Emergency, payment, change-order, and unsupported lifecycle types only after product review.

## Stop Conditions for Phase 3B

Stop implementation and request a decision if:

- a new canonical event type is required
- project activation must be distinguished from physical work start
- appointment completion semantics are not approved
- emergency request identity must be treated as project identity
- payment “marked paid” authority is unclear
- an external quote share must be classified as sent or merely generated
- a legacy writer only has title, customer name, generic ID, or conversation ID for project identity
- backend idempotency for `/workflow-events` is unknown
- a canonical write would become authoritative or change rendering

## Phase 3A Conclusion

Canonical event generation is architecturally justified but replacement migration is a no-go today.

Phase 3B is a go only for a pure, non-persisting `workflowEventFactory.js` with focused tests. The first runtime adoption must remain shadow-only and should use an event source with explicit project identity, entity identity, actor identity, and conversation identity. No current legacy writer satisfies all of those requirements without additional context being supplied.
