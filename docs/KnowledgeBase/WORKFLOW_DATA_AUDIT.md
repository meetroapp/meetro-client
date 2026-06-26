# Workflow Data Audit

## Purpose

This document maps every major workflow data source currently used by the
client. "Correct owner" describes the intended domain boundary, not a requested
code change in this documentation task.

## Source Inventory

| Domain | Current sources | Principal readers/writers |
| --- | --- | --- |
| Leads | `/posts`, `/contractor-quote-requests`, `homeownerRequests` | `BusinessLeads`, `BusinessDashboard`, `QuoteRequests`, `MessagesInbox` |
| Appointments | `meetro_business_schedule`, schedule messages | `ContractorDashboard`, `ConversationThread`, `BusinessDashboard` |
| Quotes | `workCenterQuoteHistory`, `meetroQuoteHistory`, `quoteHistory`, `quotesReceived` | `QuoteBuilder`, `ContractorDashboard`, `MyRequests`, workflow cards |
| Active work | `activeWork*`, `activeJob*`, `selectedActiveProject`, request statuses | `ContractorDashboard`, `ProjectDetails`, `ConversationThread`, emergency pages |
| Completion | `completedProjects`, completed request statuses, completed schedules, `completedJob*` | `CompletionSheet`, `ProjectDetails`, `ContractorDashboard` |
| History | conversation registry/messages, job records, global timelines, project timelines, completed arrays | `ConversationThread`, `Home`, `MyRequests`, `ContractorDashboard`, `CompletedJobDetails` |

## Findings

### WD-01: Lead sources are not reconciled

- **File name:** `src/pages/BusinessLeads.jsx`,
  `src/pages/BusinessDashboard.jsx`, `src/pages/QuoteRequests.jsx`
- **Current behavior:** Each screen loads or filters a different lead source.
- **Problem:** Status and visibility depend on the viewing surface.
- **Correct owner:** Canonical Leads repository keyed by request ID.
- **Recommended fix:** Normalize backend post and quote-request payloads into a
  single lead model; expose query methods to Dashboard and Messages.
- **Severity:** Critical

### WD-02: Lead closure is inferred locally

- **File name:** `src/pages/BusinessLeads.jsx`,
  `src/utils/workflowTimeline.js`
- **Current behavior:** A lead is considered closed from local request statuses,
  accepted quote fields, or title matching.
- **Problem:** Backend leads and local project state can diverge.
- **Correct owner:** Project workflow state.
- **Recommended fix:** Return workflow state with the canonical lead or resolve
  it through a single project query.
- **Severity:** High

### WD-03: Appointment storage is global and mixed-purpose

- **File name:** `src/utils/workCenter.js`,
  `src/pages/ContractorDashboard.jsx`,
  `src/pages/ConversationThread.jsx`
- **Current behavior:** Manual appointments, chat appointments, emergency
  dispatches, and project visits share `meetro_business_schedule`.
- **Problem:** The schedule is both a calendar and a workflow-state store.
- **Correct owner:** Scheduling module; project workflow should reference
  appointment IDs.
- **Recommended fix:** Define appointment records with project ID, actor,
  purpose, status, outcome, and source.
- **Severity:** High

### WD-04: Appointment status values are inconsistent

- **File name:** `src/pages/ContractorDashboard.jsx`,
  `src/pages/CompletionSheet.jsx`
- **Current behavior:** Statuses use both `scheduled`/`Scheduled` and
  `completed`/`Completed`.
- **Problem:** Filters and transitions rely on exact string comparisons.
- **Correct owner:** Appointment schema.
- **Recommended fix:** Normalize stored status enums and translate only at
  presentation time.
- **Severity:** High

### WD-05: Quote state is triplicated

- **File name:** `src/pages/QuoteBuilder.jsx`,
  `src/components/workflows/WorkflowQuoteSentCard.jsx`,
  `src/pages/ContractorDashboard.jsx`
- **Current behavior:** Most quote changes are copied into three global arrays.
- **Problem:** Any writer that updates only one array creates inconsistent
  status.
- **Correct owner:** Quote repository.
- **Recommended fix:** Select one canonical collection and provide compatibility
  reads only during migration.
- **Severity:** Critical

### WD-06: Request quote copies are another authority

- **File name:** `src/pages/QuoteBuilder.jsx`,
  `src/pages/MyRequests.jsx`
- **Current behavior:** Quotes are also embedded in
  `homeownerRequests[].quotesReceived`.
- **Problem:** Quote decisions must synchronize global history and embedded
  copies.
- **Correct owner:** Quote domain with project references.
- **Recommended fix:** Store quote IDs on the project or query quotes by project
  ID rather than duplicating full quote objects.
- **Severity:** Critical

### WD-07: Active work is represented by overlapping shapes

- **File name:** `src/utils/workCenter.js`,
  `src/pages/ContractorDashboard.jsx`
- **Current behavior:** Active state can come from request status,
  `selectedActiveProject`, `activeWork*`, `activeJob*`, quote-derived snapshots,
  or emergency records.
- **Problem:** There is no deterministic source precedence.
- **Correct owner:** Project-scoped Work/Job aggregate.
- **Recommended fix:** Define a canonical work record and adapters for emergency
  and standard workflows.
- **Severity:** Critical

### WD-08: Completion has multiple independent writers

- **File name:** `src/pages/CompletionSheet.jsx`,
  `src/pages/ProjectDetails.jsx`,
  `src/pages/EmergencyCompletionActions.jsx`
- **Current behavior:** Different pages independently mark work complete and
  produce different side effects.
- **Problem:** Completion records, conversation closeout, request state, and
  metrics are not guaranteed to agree.
- **Correct owner:** Completion command service.
- **Recommended fix:** Route all completion entry points through one operation
  with source-specific payloads.
- **Severity:** Critical

### WD-09: Completion counters are stored rather than derived

- **File name:** `src/pages/CompletionSheet.jsx`,
  `src/pages/ProjectDetails.jsx`,
  `src/pages/BusinessDashboard.jsx`
- **Current behavior:** `completedJobsCount` and `totalJobRevenue` are incremented
  independently.
- **Problem:** Repeated completion or duplicate records permanently inflates
  metrics.
- **Correct owner:** Reporting projection derived from completion records.
- **Recommended fix:** Calculate metrics from canonical completion data or use
  idempotent backend projections.
- **Severity:** High

### WD-10: History is assembled from incompatible stores

- **File name:** `src/pages/ContractorDashboard.jsx`,
  `src/pages/Home.jsx`, `src/pages/MyRequests.jsx`,
  `src/pages/ConversationThread.jsx`
- **Current behavior:** History can mean completed requests, completed schedule
  rows, completion records, archived conversations, job records, or timelines.
- **Problem:** "Permanent history" is not one durable record.
- **Correct owner:** Project event stream plus completion projection.
- **Recommended fix:** Define history as immutable project events and derive
  completed-project summaries from them.
- **Severity:** Critical

### WD-11: Storage is device-local for operational truth

- **File name:** `src/utils/workCenter.js`,
  `src/utils/workflowTimeline.js`
- **Current behavior:** Core workflow truth is stored in `localStorage`.
- **Problem:** State is not inherently shared across users or devices and can be
  lost on cleanup.
- **Correct owner:** Backend domain services; local storage should cache.
- **Recommended fix:** Move authoritative writes server-side in vertical slices,
  retaining local storage as an offline/read cache where needed.
- **Severity:** Critical

### WD-12: Account cleanup reveals broad coupling

- **File name:** `src/utils/accountStorage.js`
- **Current behavior:** One cleanup list knows keys for leads, scheduling,
  quotes, jobs, emergency work, completion, and presentation state.
- **Problem:** Domain ownership and lifecycle boundaries are not encapsulated.
- **Correct owner:** Per-domain repositories coordinated by session cleanup.
- **Recommended fix:** Give each repository a clear-cache operation and have
  account cleanup orchestrate them.
- **Severity:** Medium

## Recommended Canonical Record Links

Every standard workflow record should carry:

- `projectId`
- `requestId`
- `conversationId`
- `appointmentId` when applicable
- `quoteId` when applicable
- `workId` when activated
- `completionId` when completed
- immutable `eventId` for every timeline event
- `actorId`, `actorRole`, `createdAt`, and `source`

Title and description must never be workflow identity.
