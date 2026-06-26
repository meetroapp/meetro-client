# Conversation Phase 2B Read Path Audit

## Summary

`ConversationThread.jsx` does not currently read one relationship timeline. It
maintains two independent event arrays:

1. `messages`, which is the live rendered conversation.
2. `jobRecords`, which is a separately stored and separately rendered saved
   history.

The live read path chooses one source at a time:

- non-empty backend messages replace the current `messages` array;
- otherwise the local `meetro_conversation_<conversationId>` array is loaded;
- otherwise a starter message is used for standard conversations;
- emergency conversations fall back to an empty array.

There is no read-time merge of backend messages, local workflow cards, job
records, legacy project timelines, or shadow timeline events. There is also no
event sorting or event-level deduplication before rendering.

The reconciliation utility must not replace the rendered array in Phase 2C.
Its canonical event types and normalized shape do not match the legacy fields
required by the current renderer. The safest Phase 2C adoption is a shadow
read/comparison immediately after backend and local message mapping, while
continuing to call `setMessages()` with the existing arrays unchanged.

## Scope

Reviewed:

- `src/pages/ConversationThread.jsx`
- `src/utils/conversationTimelineReconciliation.js`
- `src/utils/workflowEventContract.js`
- `tests/conversationTimelineReconciliationUtility.test.js`

No UI or runtime file was modified during this audit.

## Current Read Sources

### 1. Conversation identity and selected context

| Lines | Read | Purpose |
| --- | --- | --- |
| 379-382 | `activeConversationId` | Builds the active conversation ID and local conversation storage key. Falls back to `demo-homeowner-1`. |
| 384-390 | `selectedContractor` | Supplies business identity and profile context. |
| 392-399 | `conversationBusinessName`, `meetroConversationType` | Supplies header identity and standard/emergency thread mode. |
| 403-411 | `activeEmergencyRecord` | Supplies emergency workflow context. |
| 413-420 | `getActiveJobSnapshot()`, `emergencyDispatchStatus`, `activeJobStatus` | Supplies active job and emergency status context. |
| 506-541 | account, active work, active job, emergency, project, and conversation keys | Builds viewer role, project title, and active service fallbacks. |
| 544-550 | `selectedQuoteRequest` | Supplies request, quote, homeowner, and project context. |
| 552-610 | customer, business, emergency, and phone keys | Builds participant identity and call context. |
| 629-653 | account and workflow status keys | Builds role and display-stage context. |
| 700-711 | location and profile photo keys | Builds profile display context. |

These reads are presentation and navigation context. They are not a durable
event source, but several values are later injected into workflow renderer
props.

### 2. Backend message source

**Lines 854-996**

`loadMessages()` reads backend messages from:

```text
/messages/<selectedQuoteRequestId>
```

The request ID is selected from:

- `selectedQuoteRequestId`;
- otherwise `conversationId`.

`mapBackendMessage()` at lines 857-888 maps each backend record into the
legacy message shape.

When the backend returns a non-empty array:

1. every record is mapped;
2. emergency request workflow records are filtered from emergency threads;
3. the mapped array is assigned directly with `setMessages(mapped)`;
4. the mapped array is also written to the local conversation key;
5. local cached events not returned by the backend are not merged.

### 3. Local conversation source

**Lines 926-978**

If no non-empty backend result is used, the file reads:

```text
meetro_conversation_<conversationId>
```

The parsed array is filtered for emergency workflow records and mapped to add
missing `senderRole`. It is then assigned directly with
`setMessages(migrated)`.

The local read path does not:

- merge backend and local events;
- sort by timestamp;
- reconcile backend IDs;
- reconcile workflow entity IDs;
- compare against job records or project timelines.

### 4. Starter-message source

**Lines 815-833**

`starterMessages` is a generated single-message array. It is used when:

- the local conversation key is missing or unreadable;
- no non-empty backend array was accepted;
- the thread is not emergency.

Its ID is constant (`starter-1`) while `createdAt` is recalculated from the
current time when the memo is recreated.

### 5. Job-record source

**Lines 835-852**

`getJobRecord(conversationId)` reads:

```text
meetro_job_record_<conversationId>
```

The records are assigned directly to `jobRecords`. They are not merged into
`messages`.

The Job Record panel renders this array independently at lines 3873-3940.

### 6. Conversation registry and metadata

Direct registry reads occur at:

- lines 998-1029;
- lines 1082-1135;
- lines 1876-1898;
- lines 2498-2543.

The registry is used for unread, archive/history, participant, summary, and
navigation state. It is not merged into the displayed timeline.

Conversation metadata is assembled from the last array item at lines
1031-1080. This assumes array order is already display order.

### 7. Schedule source

`getBusinessSchedule()` reads `meetro_business_schedule` at:

- lines 1826-1831, when deleting a schedule card;
- lines 1940-1970, when creating an appointment;
- lines 2017-2033, when saving a message as an appointment.

Schedule records are not read into the conversation timeline. Schedule cards
are read only when they already exist inside the local/backend message array.

### 8. Workflow and project timeline sources not read

ConversationThread does not currently read:

- `meetroWorkflowTimeline`;
- global `projectTimeline`;
- `homeownerRequests[].projectTimeline` as a timeline source;
- `meetroProjectTimelineEvents`;
- `meetroProjectLinks`;
- Work Center timeline selectors;
- `conversationTimelineReconciliation.js`.

`updateMatchingHomeownerRequests()` and `prependProjectTimeline()` are used by
the materials workflow at lines 1675-1693, but this is a write path, not a
conversation read path.

## Direct Local Storage Reads

The following keys are read directly inside `ConversationThread.jsx`.
Repeated keys are grouped with all relevant read ranges.

| Key | Read lines |
| --- | --- |
| `activeConversationId` | 379-380, 2507 |
| `selectedContractor` | 384-386 |
| `conversationBusinessName` | 392-394, 538-540, 570-573, 607, 1093-1102 |
| `meetroConversationType` | 398-399, 749-752 |
| `activeEmergencyRecord` | 403-407 |
| `emergencyDispatchStatus` | 415-420, 756-761, 788-792 |
| `activeJobStatus` | 415-420, 646-650, 756-761, 788-792, 1066-1069 |
| `activeAccountMode` | 506-507, 629-630 |
| `activeWorkService` | 514-521, 537-542, 1061-1065 |
| `activeJobService` | 514-521, 537-542, 1061-1065, 1093-1108, 2198-2202 |
| `selectedEmergencyService` | 514-521, 576-581, 2198-2202 |
| `activeConversationName` | 523-529, 559-562, 1093-1102 |
| `activeProjectTitle` | 537-542 |
| `selectedQuoteRequest` | 544-546 |
| `activeJobCustomer` | 552-562, 1074-1077 |
| `homeownerName` | 552-562, 583-588 |
| `businessName` | 564-574, 590-595 |
| `companyName` | 564-574 |
| `emergencyCustomerName` | 583-588 |
| `userName` | 583-588 |
| `emergencyBusinessName` | 590-595 |
| `selectedEmergencyBusiness` | 590-595 |
| `emergencyBusinessPhone` | 597-603 |
| `businessEmergencyPhone` | 597-603 |
| `businessPhone` | 597-609 |
| `contractorPhone` | 597-609 |
| `conversationBusinessPhone` | 605-609 |
| `activeWorkStage` | 646-650 |
| `activeWorkStatus` | 646-650 |
| `activeCustomerLocation` | 700-704 |
| `projectLocation` | 700-704 |
| `meetroPersonalProfilePhoto` | 707-708 |
| `meetroBusinessProfilePhoto` | 710-711 |
| `userId` | 857-875 |
| `selectedQuoteRequestId` | 890-892, 1206-1207 |
| `meetro_conversation_<conversationId>` | 926-930, 1998-2001, 2052-2055 |
| `meetro_conversation_owner_role_<conversationId>` | 932-935 |
| `meetro_conversation_registry` | 998-1001, 1082-1084, 1878-1880, 2503 |
| `activeJobId` | 1057-1060, 2194-2197 |
| `activeJobEta` | 1070-1073 |
| `selectedMessageReceiverId` | 1208-1209 |
| `conversationReturnPage` | 2241 |
| `returnPage` | 2242 |

Helper reads used by this file:

- `getActiveJobSnapshot()` reads active job and active work fallback keys.
- `getJobRecord(conversationId)` reads
  `meetro_job_record_<conversationId>`.
- `getBusinessSchedule()` reads `meetro_business_schedule`.

## Current Event Arrays

### `messages`

Declared at line 268.

Possible complete replacements:

- backend mapped array, line 915;
- local migrated array, line 965;
- starter or empty fallback, lines 973 and 977;
- clear-chat starter reset, line 1868.

Incremental additions:

- `addOutgoingMessage()`, line 1196;
- chat appointment creation, line 2008;
- workflow change request, line 3618.

Incremental transformations:

- status updates, lines 1168-1181;
- backend acknowledgement, lines 1272-1282;
- unsend replacement, lines 1791-1809;
- schedule deletion, line 1824.

### `jobRecords`

Declared at line 300.

Read and replaced from `getJobRecord()` at lines 835-840. The records are
stored newest-first by current writers:

- explanation photo auto-save, lines 1390-1415;
- manual save, lines 2186-2217.

The rendered panel does not sort. `speakJobRecords()` reverses a copy at lines
2162-2166 for spoken chronological narration.

### Derived arrays

`galleryImages`, lines 315-325:

- filters `messages` for records with `imageUrl`;
- maps them to gallery metadata;
- preserves `messages` order.

No other read-time timeline array is assembled.

## Current Event Shapes

### Backend mapped message

Created by `mapBackendMessage()` at lines 857-888:

```text
{
  ...workflow_payload,
  id,
  backendId,
  type,
  sender,
  senderRole,
  text,
  imageUrl,
  workflowType,
  status,
  createdAt,
  time
}
```

Notable behavior:

- `id` prefers `workflow_payload.id`, otherwise
  `backend-msg-<backendMessage.id>`;
- `backendId` preserves the backend ID separately;
- `type` falls back to `message_type`, then `text`;
- `senderRole` may be inferred from the current viewer;
- `createdAt` becomes a numeric millisecond value;
- `time` is presentation text.

### Local legacy message

Local records are preserved with spread syntax. The only migration adds
`senderRole`.

Common shapes include:

- text/image messages;
- operational `update`, `approval`, `payment`, `materials`, `materials-list`,
  `location`, and `scan` cards;
- `schedule` cards with nested `schedule`;
- `photoWorkflow` records;
- `workflow_*` cards.

### Job record

Common fields:

```text
{
  id,
  conversationId,
  jobId,
  jobService,
  customer,
  type,
  title,
  subtitle,
  text,
  imageUrl,
  fileName,
  workflowType,
  time,
  savedAt,
  sharedWithHomeowner,
  sharedWithBusiness
}
```

Job records usually have `savedAt`, while live messages usually have
`createdAt`.

### Reconciliation output

`conversationTimelineReconciliation.js` returns:

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
  payload,
  legacy
}
```

This shape is intentionally not render-compatible with the current
`messages.map()` path because rendering currently reads legacy fields directly
from the event root.

## Quote-Related Event Reads

1. `selectedQuoteRequest` is read at lines 544-550.
2. `selectedQuoteRequestId` selects the backend message endpoint at lines
   890-900.
3. The same ID is used for message and workflow-event writes at lines
   1206-1260.
4. Workflow render context falls back from request ID to `conversationId` at
   lines 2982-2988.
5. Quote cards are recognized only when already present in `messages`:
   - `workflow_quote_sent`, lines 3257-3261;
   - `workflow_revised_quote`, lines 3263-3284.

ConversationThread does not independently read quote history collections.

Risk: the render context treats `conversationId` as a request-ID fallback.
This is presentation context, but it is not safe canonical project identity.

## Appointment and Schedule Event Reads

1. Existing appointment cards are read only from `messages`.
2. A card is recognized by `msg.type === "schedule"` at lines 2995-3005.
3. Nested appointment data is read from `msg.schedule` at lines 3098-3133.
4. Schedule deletion resolves identity from:
   - `schedule.id`;
   - `scheduleId`;
   - `appointmentId`;
   at lines 1815-1829.
5. The current business schedule is read only during create/delete actions, not
   during timeline load.
6. Appointment creation directly appends a schedule card to local storage and
   state at lines 1940-2015.
7. Saving a message as a schedule writes a schedule card to local storage at
   lines 2017-2065, but does not call `setMessages()` afterward.

Risk: schedule records and schedule cards can diverge because the read path
does not reconcile them by appointment or schedule ID.

## Emergency and Completion Event Reads

### Emergency

Emergency presentation context is read from:

- `meetroConversationType`;
- `activeEmergencyRecord`;
- `emergencyDispatchStatus`;
- active job snapshot and active job keys.

Backend and local arrays filter records whose `workflowType` is
`emergency_request` at lines 908-914 and 942-959.

Emergency status is displayed through a separate banner/timeline, not through
the `messages` event array. It is derived from current status values rather
than durable timeline events.

### Completion

Completion workflow cards are recognized only if already present in
`messages`. `workflow_completion_closeout` is rendered at lines 3186-3205.

ConversationThread does not read completion records or shadow completion events.
Completion navigation writes context and opens Completion Sheet, but that is not
a timeline read.

## Sorting Logic

### Live messages

There is no explicit sort.

Order is inherited from:

- backend response order;
- local array storage order;
- append order for new local messages.

The last array item is treated as the latest message for metadata at line 1035.

### Job records

There is no display sort. The stored array order is rendered directly.

`speakJobRecords()` reverses a copy at lines 2162-2166. This changes spoken
order only.

### Reconciliation utility

`reconcileConversationTimelineEvents()` sorts valid timestamps ascending and
places undated events last. Equal or missing timestamps retain input order.

Using that output directly would change current ordering whenever backend or
local stored order differs from chronological order.

## Deduplication Logic

### Current read path

There is no message or workflow-event deduplication.

The following operations are not event deduplication:

- registry replacement by conversation ID;
- message update by local `msg.id`;
- schedule deletion by schedule/card ID;
- emergency workflow filtering.

Backend acknowledgement updates an existing local message with `backendId`,
but the next backend poll replaces the whole array. There is no read-time join
between local ID and backend ID.

### Reconciliation utility

Deduplication is limited to:

1. explicit `eventId`, `event_id`, `backendId`, or `backend_id`;
2. stable appointment, schedule, quote, work, job, or completion ID plus
   canonical event type.

It does not deduplicate by:

- generic local ID;
- text;
- title;
- customer;
- display time.

## Fallback Logic

### IDs

- Conversation ID: `activeConversationId`, otherwise `demo-homeowner-1`.
- Backend display ID: workflow payload ID, otherwise
  `backend-msg-<backend ID>`.
- Request ID for backend loading: `selectedQuoteRequestId`, otherwise
  `conversationId`.
- Workflow render request ID: selected request ID, selected request generic ID,
  otherwise `conversationId`.
- New local records use timestamp-derived IDs.
- Job ID can fall back to `conversationId` when saving a job record.

### Dates

- Backend `createdAt`: payload value, otherwise parsed backend timestamp in
  milliseconds.
- Local records use numeric `Date.now()`, ISO strings, or display-only `time`.
- Starter message time is recalculated relative to mount.
- Job records use `savedAt`.
- No common read-time timestamp normalization exists.

### Actors

- Outgoing events default `senderRole` to the current viewer.
- Backend messages infer the opposite role when payload role is absent.
- Local cached records infer role from owner role, sender labels, emergency
  mode, and current viewer role.

The same persisted event can therefore receive different actor-role metadata in
different sessions.

### Project identity

ConversationThread does not load an explicit conversation/project link.
Several paths fall back from request or job identity to `conversationId`.

The reconciliation utility correctly preserves missing `projectId`; it must not
be supplied a guessed project ID during adoption.

## Risks

### Critical

1. A non-empty backend response replaces local workflow cards that are not
   present in that response.
2. Directly rendering reconciled events would break legacy card rendering
   because canonical event fields are not located where renderers expect them.
3. Direct adoption would reorder messages when stored/backend order differs
   from normalized `recordedAt`.

### High

4. Actor roles are inferred from the current viewer.
5. Request and job identity can fall back to conversation ID.
6. Job Record is presented as permanent history but is not reconciled with the
   live conversation.
7. Schedule records and schedule cards have independent storage and update
   paths.
8. Workflow type recognition is incomplete; `workflow_quote_sent` renders but
   is not in the shared workflow type list.

### Medium

9. `lastMessage` metadata assumes the final array item is newest.
10. Mixed numeric, ISO, and display timestamps make deterministic ordering
    impossible for some records.
11. Generic timestamp-derived local IDs are not proven immutable across sources.
12. Starter records can enter storage after fallback and appear as real
    conversation history.

## Safest Phase 2C Insertion Point

The safest insertion point is inside `loadMessages()` after each source has
been mapped but before `setMessages()`.

### Backend shadow point

**Current lines 905-919**

After:

```text
const mapped = backendMessages.map(mapBackendMessage).filter(...)
```

Phase 2C may compute:

```text
reconcileConversationTimelineEvents(
  mapped.map(event => ({ source: "backend-message", event }))
)
```

The result must be used only for development diagnostics or parity reporting.
`setMessages(mapped)` must remain unchanged.

### Local shadow point

**Current lines 942-969**

After the `migrated` local array is created, Phase 2C may compute:

```text
reconcileConversationTimelineEvents(
  migrated.map(event => ({ source: "local-conversation", event }))
)
```

Again, `setMessages(migrated)` must remain unchanged.

### Combined comparison point

A future shadow comparison can retain the local parsed array while backend
messages are available and pass both arrays to reconciliation. This requires a
small read-only helper local to `loadMessages()` or an external diagnostics
function.

It must not:

- call `setMessages()` with normalized events;
- persist normalized output;
- change polling;
- change fallback selection;
- change backend/local precedence.

## Exact Phase 2C Modification Ranges

Line numbers refer to the audited file version.

1. **Imports, lines 1-29**  
   Add a named import for `reconcileConversationTimelineEvents`.

2. **Backend mapper, lines 857-888**  
   Do not change mapping behavior. This function defines the legacy render
   shape and should remain the adapter input.

3. **Backend load branch, lines 905-919**  
   Add shadow-only reconciliation after `mapped` is built and before
   `setMessages(mapped)`.

4. **Local load branch, lines 926-969**  
   Add shadow-only reconciliation after `migrated` is built and before
   `setMessages(migrated)`.

5. **Optional development summary helper, immediately before
   `loadMessages()`, lines 889-890**  
   Add a small `reconcileForDiagnostics(events, source)` wrapper guarded by
   development mode and `try/catch`. Log counts only, never payloads.

Do not modify:

- `messages.map()` rendering, lines 2969-3290;
- workflow renderer props, lines 2972-2993;
- Job Record rendering, lines 3873-3940;
- polling interval, lines 984-995;
- message persistence, lines 1031-1137 and 1190-1292.

## Zero-Behavior Adoption Assessment

### Shadow-only computation: Go

Phase 2C can safely import and invoke reconciliation for diagnostics while
continuing to render and persist the current arrays.

Conditions:

- development-only or returned diagnostics;
- `try/catch`;
- no payload logging;
- no storage writes;
- no changes to `setMessages()` arguments;
- no changes to source precedence or polling.

### Render read adoption: No-go

Replacing `messages` with reconciled events cannot currently guarantee zero
visual or behavioral change.

Reasons:

1. normalized event types differ from legacy renderer types;
2. legacy render fields are nested in `payload`;
3. chronological sorting may change card order;
4. duplicate removal may change visible count;
5. missing actor fallbacks change `mine` calculation;
6. normalized IDs may change React keys and message actions;
7. workflow card components can write through callbacks and expect legacy
   message shape.

## Phase 2C Test Recommendations

### Required unit tests

1. Backend mapped records reconcile without mutation.
2. Local migrated records reconcile without mutation.
3. Reconciliation failure does not prevent `setMessages()` input from being
   produced.
4. Diagnostic output excludes `text`, image URLs, customer names, titles, and
   payloads.
5. Backend/local duplicate reporting uses `backendId` or stable entity/event
   pairs only.
6. Conversation ID is not promoted to project ID.
7. Emergency filtering occurs before diagnostics and remains unchanged.
8. Missing actor and date warnings do not alter legacy records.

### Required regression tests before render adoption

1. Exact rendered item count and order for backend-only data.
2. Exact rendered item count and order for local-only data.
3. Quote sent and revised quote cards render unchanged.
4. Appointment cards retain swipe, detail, and delete behavior.
5. Completion, materials, invoice, and change-request cards render unchanged.
6. Pending local events survive a backend poll.
7. Backend acknowledgement does not duplicate a local event.
8. Standard and emergency conversations remain isolated.
9. Job Record display and spoken order remain unchanged.
10. Homeowner and professional actor alignment is stable after logout/login.

## Go/No-Go Decision

**Phase 2C shadow reconciliation: GO.**

Add read-only, non-blocking reconciliation at the backend and local mapped-array
boundaries. Keep existing arrays as the only render and persistence inputs.

**Phase 2C direct read/render adoption: NO-GO.**

Direct adoption cannot meet the zero visual/behavior change requirement without
first adding a tested normalized-to-legacy presentation adapter and
cross-source parity tests. That adapter must preserve current order, root-level
render fields, IDs, actor behavior, workflow callbacks, and source precedence.
