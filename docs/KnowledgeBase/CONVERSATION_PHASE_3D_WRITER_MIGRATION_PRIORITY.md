# Meetro Conversation Phase 3D - Writer Migration Priority

## Scope

This report ranks the active workflow event writers for future canonical event adoption. It is audit-only. No writer, runtime file, UI, route, storage key, or workflow behavior was changed.

The ranking uses:

- the Phase 3A writer inventory
- the pure factory in `src/utils/workflowEventFactory.js`
- the comparison rules in `src/utils/workflowEventFactoryAudit.js`
- current identity, timestamp, actor, storage, backend, and UI coupling

“Migration” in this report means the first safe shadow comparison. It does not mean replacing, persisting, rendering, or emitting canonical events.

## 1. Executive Summary

The proposed type order is directionally useful but is not the safest executable writer order.

1. `MESSAGE_CREATED` is the simplest canonical event type, but the main writer in `ConversationThread.addOutgoingMessage` is not the safest first code location. It mixes React state, read-state storage, backend message persistence, optional `/workflow-events` mirroring, delivery status, and scrolling. It also lacks reliable project identity for many messages.
2. `WORKFLOW_QUOTE_SENT` has the best first concrete writer boundary. `QuoteBuilder.sendQuote` already has a stable quote ID, request identity, a business actor role, a timestamp, and often an explicit conversation ID at the point where `workflowQuoteCard` is assembled.
3. `WORKFLOW_APPOINTMENT_CREATED` should follow quote-sent, but only for schedule records with an explicit project/request link. Manual and chat-created schedules frequently lack safe project identity.
4. `WORKFLOW_COMPLETION_SUBMITTED` has a stable completion ID and timestamp, but its writer also performs schedule completion, history archival, active-work cleanup, emergency closure, and conversation writes. It requires stronger failure isolation.
5. Emergency and work events remain last because canonical identity and lifecycle semantics are unresolved.

### Validated Priority

| Priority | Canonical type / writer | Decision |
| --- | --- | --- |
| 1 | `WORKFLOW_QUOTE_SENT` at internal `QuoteBuilder.sendQuote` card assembly | Safest first concrete shadow-comparison writer |
| 2 | `MESSAGE_CREATED` for plain outgoing text/image messages | Second, after a safe project/conversation context resolver exists |
| 3 | `WORKFLOW_APPOINTMENT_CREATED` for explicitly linked schedules | Third, with skip-on-unsafe-identity behavior |
| 4 | `WORKFLOW_COMPLETION_SUBMITTED` after completion record save | Fourth, with strict non-blocking isolation |
| 5 | Emergency and work lifecycle events | Last; canonical semantics and identity authority are unresolved |

The expected order therefore needs one adjustment: quote-sent should precede generic message migration in actual code, even though `MESSAGE_CREATED` remains the least complex event concept.

## 2. Safest First Writer

### Selected Writer

- **File:** `src/pages/QuoteBuilder.jsx`
- **Function/location:** `sendQuote`, internal `workflowQuoteCard` construction around lines 571-627
- **Current type:** `workflow_quote_sent` or `workflow_revised_quote`
- **Canonical target:** `WORKFLOW_QUOTE_SENT`
- **Phase 3E action:** development-only, non-persisting factory creation and audit comparison

### Why This Boundary Wins

At this location the writer already has:

- `quote.quoteId`
- `requestId`
- `quoteConversationId` when the card is written
- `senderRole: "business"`
- business display identity
- `createdAt`
- the complete legacy payload
- an approved canonical mapping for both initial and revised quote sends

The comparison can run after `workflowQuoteCard` is assembled and before or after the unchanged legacy `localStorage.setItem`. It does not need to alter the card, storage array, navigation, quote history, homeowner timeline, or shadow project links.

### Remaining Gaps

- `requestId` is a compatibility project identity, not a backend canonical `projectId`.
- Business display name is not guaranteed to be a stable actor ID.
- The legacy card uses a generic `id`, not a separate immutable canonical event ID.
- Initial and revised quote sends share one canonical type and must preserve revision metadata.
- The quote transition is also projected into quote history and `homeownerRequests[].projectTimeline`.

### Phase 3E Safety Rules

- Run only when `import.meta.env.DEV`.
- Use `createWorkflowEvent` without persistence.
- Use `compareLegacyToFactoryEvent` without persistence.
- Use `requestId` as compatibility project identity only if `getProjectIdentity` resolves it safely.
- Use `quoteConversationId` only when explicitly present.
- Use a stable current-user ID only when already available; otherwise retain `unknown` and report MEDIUM risk.
- Log summary fields only. Do not log quote notes, prices, customer text, or full payloads.
- Never modify `workflowQuoteCard`.
- Never modify existing quote, timeline, conversation, or shadow-link writes.
- Wrap the entire comparison in `try/catch`.

## 3. Writer Classification

### A. Message Writers

| File | Function/location | Current event type | Canonical target | Missing fields | Storage dependency | UI dependency | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/pages/ConversationThread.jsx` | `sendMessage` -> `addOutgoingMessage` | `text`, `image` | `MESSAGE_CREATED` | Safe project ID; stable actor ID; explicit recorded time; canonical ID | Conversation read flag; backend `/messages`; optional `/workflow-events` | Immediate state append, delivery status, reply state, scrolling | HIGH | Do not start here. First add a pure context builder or pass explicit project and actor identity into the comparison boundary. |
| `src/pages/ConversationThread.jsx` | location/scan/update/approval/payment card senders | Presentation card types | `MESSAGE_CREATED` until types are approved | Project ID, actor ID, recorded time, stable entity identity | Same `addOutgoingMessage` backend path | Card rendering and composer actions | HIGH | Migrate after plain messages. Preserve card type only in payload. |
| `src/pages/ConversationThread.jsx` | photo workflow send/upload | `photoWorkflow`, `before`, `progress`, `issue`, `completion` | `MESSAGE_CREATED` initially | Project ID, actor ID, recorded time, durable media identity | Backend message persistence; object URL lifecycle | Photo rendering and attachment state | HIGH | Do not infer work or completion transitions from photo labels. |
| `src/pages/ContractorDashboard.jsx` | send materials list | `materials-list` | `MESSAGE_CREATED` | Project ID, actor ID/role field, recorded time, list entity ID | Direct conversation storage write | Work Center materials action and alerts | MEDIUM | Shadow only after active work exposes safe project identity. |
| `src/pages/EmergencyRequest.jsx` | emergency photo message map | `image`, `emergency_photo` | `MESSAGE_CREATED` | Canonical project ID, contract conversation field, actor ID, recorded time | Replaces emergency conversation array during request creation | Emergency request submission and photo display | HIGH | Wait for emergency identity authority. |
| `src/utils/emergencyLifecycle.js` | status message append | `system`, `emergency_status` | New emergency type or `MESSAGE_CREATED` projection | Canonical project ID, system actor ID, recorded time, approved event type | Emergency record, active job, conversation, registry writes | Emergency status display | HIGH | Do not treat the projection message as the authoritative emergency transition. |

### B. Request and Quote Writers

| File | Function/location | Current event type | Canonical target | Missing fields | Storage dependency | UI dependency | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/pages/Upload.jsx` | `handleCreatePost` | project timeline `created` | `WORKFLOW_REQUEST_CREATED` | Conversation ID, stable actor ID, canonical event ID, recorded time | Backend post plus homeowner request and backup storage | Submission state, alerts, navigation | MEDIUM | Good later candidate. Run shadow comparison only after successful backend post and request ID creation. |
| `src/pages/QuoteBuilder.jsx` | `saveDraftQuote` | quote record `draft` | `WORKFLOW_QUOTE_CREATED` | Conversation ID, stable actor ID, once-only creation semantics | Three quote-history keys | Draft alerts and Work Center navigation | MEDIUM | Add only after distinguishing first creation from later draft updates. |
| `src/pages/QuoteBuilder.jsx` | `sendQuote`, `workflowQuoteCard` | `workflow_quote_sent`, `workflow_revised_quote` | `WORKFLOW_QUOTE_SENT` | Canonical project ID and stable actor ID | Three quote histories, homeowner request timeline, conversation storage, quote shadow link | Success state and navigation | MEDIUM for shadow comparison; HIGH for replacement | **Phase 3E starting point.** Compare only the assembled card and pure factory event. |
| `src/pages/QuoteBuilder.jsx` | `shareExternalQuote` | external quote status `sent` | Undecided external quote event | Project/conversation identity and delivery semantics | Quote history plus browser share/download | Native share UI | HIGH | Stop until “shared,” “generated,” and “sent” are distinguished. |
| `src/components/workflows/WorkflowQuoteSentCard.jsx` | accept/revise/decline | quote status mutation | Accepted: `WORKFLOW_QUOTE_ACCEPTED`; others need types | Stable actor ID; canonical event ID; conversation ID in decision boundary | Three quote-history keys and shadow links | Interactive decision card state | HIGH | Wait for idempotency and canonical revision/decline types. |
| `src/components/workflows/WorkflowRevisedQuoteCard.jsx` | approve/request changes | `revisedQuoteApproved`, `revisedQuoteChangeRequested` | Accepted or new revision type | Safe project ID, actor ID, conversation ID, recorded time | Homeowner request timeline | Interactive card and composer text | HIGH | Remove title-based identity from the future path before shadow comparison. |
| `src/pages/MyRequests.jsx` | confirmed quote acceptance | `quoteAccepted` plus notification `quote_accepted` | `WORKFLOW_QUOTE_ACCEPTED` | Canonical project ID, conversation ID, actor ID, canonical event ID | Homeowner requests, quote history, notifications | Confirmation modal and reload | HIGH | Shadow after acceptance persistence only; never let audit failure prevent acceptance. |
| `src/pages/MyRequests.jsx` | quote revision request | notification `quote_revision_requested` | New quote-revision-requested type | Approved type plus all canonical metadata | Homeowner requests, quote history, notifications | Revision form and reload | HIGH | Blocked on canonical type approval. |
| `src/pages/ContractorDashboard.jsx` | `updateQuoteLifecycleStatus` | generic quote status transitions | Multiple quote/work types | Approved mapping, actor identity, conversation identity, idempotency | Three quote histories and active work snapshots | Work Center quote controls | HIGH | Split future comparisons by explicit transition; do not audit all statuses as one event. |

### C. Appointment Writers

| File | Function/location | Current event type | Canonical target | Missing fields | Storage dependency | UI dependency | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/pages/ConversationThread.jsx` | `saveChatScheduleAppointment` | schedule record and `schedule` card | `WORKFLOW_APPOINTMENT_CREATED` | Project/request ID, actor ID, canonical event ID, recorded time | Schedule and conversation storage | Schedule modal and message state | HIGH | Require an explicit project link before comparison; skip rather than infer. |
| `src/pages/ConversationThread.jsx` | `saveMessageAsSchedule` | schedule record and `schedule` card | `WORKFLOW_APPOINTMENT_CREATED` | Project ID, actor metadata, source message event ID | Schedule and conversation storage | Message action sheet | HIGH | Preserve source message ID and require explicit project context first. |
| `src/pages/ContractorDashboard.jsx` | `saveManualScheduleVisit` create | manual schedule and optional `schedule` card | `WORKFLOW_APPOINTMENT_CREATED` | Many manual records lack project/request/conversation identity; actor ID | Schedule, project links, conversation storage | Work Center schedule form | HIGH overall; MEDIUM for safely linked subset | Shadow-compare only when `getProjectIdentity` succeeds and conversation ID is explicit. |
| `src/pages/ContractorDashboard.jsx` | `saveManualScheduleVisit` edit | updated schedule | `WORKFLOW_APPOINTMENT_UPDATED` | Same identity/actor gaps | Schedule and project links | Work Center schedule form | HIGH overall | Treat create and update as separate comparisons. |
| `src/pages/ContractorDashboard.jsx` | `completeScheduleVisit` | `appointment_completed` | New appointment-completed type | Supported canonical type, actor metadata, recorded time | Schedule plus two global timelines and shadow timeline | Visit-outcome modal | HIGH | Blocked on event type approval. |
| `src/pages/MyRequests.jsx` | scheduling status action | request status `scheduled` | Not proven to be appointment-created | Appointment entity ID, date/time, conversation, actor | Homeowner requests | Next-steps UI and reload | HIGH | Do not generate an appointment event from status alone. |

### D. Work and Materials Writers

| File | Function/location | Current event type | Canonical target | Missing fields | Storage dependency | UI dependency | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/pages/ContractorDashboard.jsx` | `appendWorkflowTimelineEvent` | caller-defined legacy type | Type-specific | Actor identity, recorded time, supported mappings; identity sometimes absent | `meetroWorkflowTimeline`, `projectTimeline`, canonical shadow timeline namespace | Feeds Work Center timeline views | HIGH | Useful later centralized boundary, but only after callers have approved mappings. |
| `src/pages/ContractorDashboard.jsx` | `applyVisitOutcome` | `quote_required`, `start_work_immediately`, `emergency_dispatch`, `materials_needed`, pending outcomes | Some map to work/material types; others unsupported | Approved event map, actor, project authority, recorded time | Numerous active/pending/material/timeline keys | Navigation between Work Center stages | HIGH | Do not migrate as one generic function. Audit each outcome separately. |
| `src/pages/ContractorDashboard.jsx` | quote-to-active-work action | `quote_approved` active snapshots | Not necessarily `WORKFLOW_WORK_STARTED` | Meaning of activation versus physical start; stable IDs | Active work/job snapshots and scalar keys | Work Center active-work transition | HIGH | Product decision required. |
| `src/pages/JobUpdate.jsx` | `saveUpdate` | display status such as `Work started` | `WORKFLOW_WORK_STARTED` only for one status | Project/job/conversation identity, actor, canonical type, recorded time | `jobUpdates`, `lastJobUpdate` | Job update form | HIGH until identity is supplied | Map explicit status constants only after active job has safe project identity. |
| `src/pages/ConversationThread.jsx` | `sendMaterialsCard` | `workflow_materials_approval` plus timeline `materialsApprovalRequested` | `WORKFLOW_MATERIALS_REQUESTED` | Safe project ID, actor ID, recorded time, shared event ID | Backend message path and homeowner request timeline | Workflow card and composer | HIGH | Correlate both projections with one shadow event only after identity is explicit. |
| `src/components/workflows/WorkflowMaterialsApprovalCard.jsx` | approval decisions | materials decision timeline types | New decision types | Approved type, all canonical identity/actor fields | Homeowner request timeline | Interactive workflow card | HIGH | Blocked on event type and authority decisions. |

### E. Completion, Change, Invoice, and Emergency Writers

| File | Function/location | Current event type | Canonical target | Missing fields | Storage dependency | UI dependency | Risk | Recommended strategy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/pages/CompletionSheet.jsx` | `saveCompletion`, closeout card | `workflow_completion_closeout` | `WORKFLOW_COMPLETION_SUBMITTED` | Canonical project ID, stable actor ID, canonical event ID, recorded time distinction | Completion history, photos, schedule, conversation, registry, active work, emergency archive | Completion form, alerts, navigation | HIGH | Shadow only after successful completion-record save and before cleanup; isolate in `try/catch`. |
| `src/components/workflows/WorkflowCompletionCloseoutCard.jsx` | confirmation display | existing status display, no writer | `WORKFLOW_COMPLETION_CONFIRMED` | No explicit persisted confirmation command | None for confirmation event | Display and navigation only | HIGH / not a writer | Do not migrate rendering into a writer. First locate or define confirmation authority. |
| `src/pages/ChangeOrderRequest.jsx` | `submitChangeOrder` | change-order domain, timeline, card, job record, notification | New change-request-created type | Approved type, project ID, actor ID, canonical event ID, recorded time | Multiple project, conversation, job, notification stores | Submission and navigation | HIGH | Blocked on canonical type; later use change-order ID as entity identity. |
| `src/pages/InvoiceBuilder.jsx` | `saveInvoice` | `workflow_invoice_request` | New invoice/payment-requested type | Stable invoice ID, project ID, actor ID, recorded time, approved payment semantics | Many invoice scalar keys, conversation, registry, unread count | Invoice form and completion navigation | HIGH | Blocked on invoice entity and payment authority. |
| `src/utils/emergencyLifecycle.js` | `transitionEmergencyStatus` | `emergency_status` system message | New emergency lifecycle types | Canonical project identity, approved types, stable system actor ID | Emergency, active job, conversation, registry, metadata | Drives emergency status UI | HIGH | Last migration track. Define emergency aggregate and status authority first. |
| `src/pages/EmergencyRequest.jsx` | emergency request creation | emergency record and photo messages | New emergency request type plus `MESSAGE_CREATED` projections | Whether emergency ID is project ID; actor ID; contract conversation field | Emergency records, conversation, registry, active state | Request submission and navigation | HIGH | Blocked on emergency identity model. |
| `src/pages/EmergencyComplete.jsx` | review/close action | review and emergency closed state | New review/closure types | Approved types and separation from completion confirmation | Review, request, emergency status stores | Review completion UI | HIGH | Do not equate review submission with completion confirmation. |

## 4. Unsafe Writers

The following writers must not be selected for Phase 3E:

### `ConversationThread.addOutgoingMessage`

Why unsafe:

- controls immediate UI state
- controls backend message persistence
- conditionally mirrors workflow events
- updates delivery status
- lacks safe project identity for ordinary messages
- infers workflow type from presentation type

### `ContractorDashboard.applyVisitOutcome`

Why unsafe:

- one function represents multiple unrelated transitions
- several current event names have no canonical type
- changes navigation and active/pending/material state
- identity can fall back to schedule or request IDs

### `CompletionSheet.saveCompletion`

Why unsafe as a first migration:

- completion creation and history archival are coupled
- updates schedule, counters, conversation, registry, active work, and emergency state
- failures have a large workflow blast radius

### Emergency Lifecycle Writers

Why unsafe:

- emergency IDs are not yet approved as project IDs
- status transition authority is distributed
- no canonical emergency event types exist
- system actor identity is not stable

### Payment, Invoice, and Change-Order Writers

Why unsafe:

- canonical event types are not approved
- payment state authority is unclear
- change requests and invoices create several side-channel records per action

## 5. Required Prerequisites

### Required Before Phase 3E

- Use only supported canonical event constants.
- Keep factory and audit utilities pure.
- Resolve project identity with `getProjectIdentity`; never use title/customer matching.
- Define a development-only summary log shape.
- Ensure comparison failure cannot block the legacy writer.
- Do not log full payloads or customer message content.

### Required Before Message Shadow Comparison

- A read-only context resolver must provide:
  - safe project ID or an explicit “missing” result
  - conversation ID
  - stable actor ID when available
  - actor role
- The message comparison must distinguish ordinary messages from workflow cards.
- `/messages` and `/workflow-events` correlation behavior must be documented.

### Required Before Appointment Shadow Comparison

- Schedule records must retain explicit project/request identity.
- Conversation ID must not be substituted for project ID.
- Creation and update paths must be compared separately.
- Appointment completion needs a new approved canonical type.

### Required Before Completion Shadow Comparison

- Completion record ID must be the entity correlation ID.
- Project identity must be resolved before active work is cleared.
- Comparison must occur after completion record persistence succeeds.
- Customer confirmation must remain a separate event.

### Required Before Emergency/Work Migration

- Decide whether emergency requests are projects or linked entities.
- Define emergency lifecycle canonical types.
- Define stable system actor identity.
- Separate project activation, ready-to-start, and physical work-started semantics.
- Approve unsupported visit-outcome event types.

## 6. Recommended Migration Order

### Stage 1: Internal Quote Sent

- `QuoteBuilder.sendQuote`
- Compare `workflowQuoteCard` with a factory-created `WORKFLOW_QUOTE_SENT`.
- Development-only summary logging.
- No persistence or writer replacement.

### Stage 2: Plain Message Created

- Start with text and image messages only.
- Add a read-only context resolver before touching `addOutgoingMessage`.
- Exclude workflow cards, emergency messages, schedule cards, and payment cards.

### Stage 3: Request and Quote Creation

- Request created after successful backend post.
- Quote created only on first immutable quote creation, not each draft update.

### Stage 4: Appointment Created and Updated

- Begin with Work Center schedules that already pass safe project-link validation.
- Skip manual records without project identity.

### Stage 5: Materials Requested

- Correlate conversation card and project timeline projection.
- Do not migrate material decision actions yet.

### Stage 6: Completion Submitted

- Compare after completion record save.
- Keep completion confirmation separate.

### Stage 7: Quote Acceptance

- Add idempotent comparison at confirmed homeowner acceptance.
- Revision and decline remain blocked pending canonical types.

### Stage 8: Work and Emergency

- Proceed only after identity and lifecycle decisions.

## 7. Exact Phase 3E Codex Task

```text
MEETRO COMMUNITY - CODEX TASK

TASK:
Conversation Phase 3E - Development-Only Quote Sent Factory Comparison

MISSION:
Add a non-persisting, development-only canonical factory comparison at the
internal quote-sent conversation-card assembly point.

DO NOT:
- replace or modify existing quote writers
- change quote history writes
- change homeowner request timeline writes
- change conversation storage
- change shadow project links
- change UI, rendering, routing, or navigation
- persist or emit canonical events
- log full payloads, notes, prices, or customer content

FILES TO REVIEW:
- src/pages/QuoteBuilder.jsx
- src/utils/projectIdentity.js
- src/utils/workflowEventFactory.js
- src/utils/workflowEventFactoryAudit.js

IMPLEMENTATION:
1. Immediately after workflowQuoteCard is assembled in sendQuote, resolve
   project identity from explicit projectId/requestId only.
2. In development mode only, create a pure WORKFLOW_QUOTE_SENT factory event.
3. Preserve the full legacy card as factory payload and legacy metadata.
4. Compare workflowQuoteCard to the factory event with
   compareLegacyToFactoryEvent().
5. Log summary only:
   - currentType
   - canonicalType
   - matchesEventType
   - matchesProjectId
   - matchesConversationId
   - hasActor
   - hasActorRole
   - hasRecordedAt
   - payloadPreserved
   - legacyPreserved
   - schemaGaps
   - migrationRisk
6. Wrap comparison and logging in try/catch.
7. If project identity or conversation identity is unsafe, report HIGH risk
   without guessing and without affecting quote send.
8. Keep workflowQuoteCard and every existing write byte-for-byte behaviorally
   unchanged.

ADD TESTS:
- a pure helper test for building the quote-sent factory input, if a helper is
  introduced
- safe request/project identity case
- missing conversation identity case
- missing actor identity case
- revised quote remains WORKFLOW_QUOTE_SENT with revision metadata preserved
- no storage or browser access from any new helper

VERIFICATION:
npm test
npm run build

SUCCESS:
- development-only comparison runs for internal quote sends
- no canonical persistence
- no production logging
- no UI or workflow behavior change
- all existing tests plus new tests pass
- build passes
```

## Decision

**GO for Phase 3E at `QuoteBuilder.sendQuote` in shadow-comparison mode only.**

**NO-GO for writer replacement, canonical persistence, generic message adoption, appointment adoption, completion adoption, or emergency/work adoption in Phase 3E.**
