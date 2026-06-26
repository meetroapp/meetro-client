# Meetro Alignment Audit Report

## Scope and Evidence

This is a read-only architecture audit of the `meetro-client` project. It maps
the current implementation against the workflow and ownership expectations
identified in the prior alignment audit.

The governing Meetro Knowledge Base documents named in the original audit are
not present in this repository. Findings therefore use the requested workflow
principles as the alignment baseline:

- one authoritative owner for each workflow state;
- appointment before quote for standard lead workflows;
- conversation as a durable project timeline;
- Work Center as an operational projection, not the source of every domain;
- completion flowing into shared history;
- Dashboard and Command Center acting as summaries and navigation.

## Executive Finding

The product contains most intended workflow surfaces, but the workflow is not
held by one project aggregate. State is split among backend endpoints,
`homeownerRequests`, schedule records, three quote arrays, global active-work
keys, completed-project arrays, conversation messages, job records, and global
timeline arrays. The largest TestFlight risk is not missing UI. It is that the
same project can have different statuses depending on which screen reads it.

## Findings

### A-01: Professional route authority is incomplete

- **File name:** `src/App.jsx`, `src/utils/session.js`
- **Current behavior:** `professionalOnlyPages` omits Work Center, analytics,
  emergency operations, dispatch, and completion routes. Hash changes and
  native page-change events assign pages without applying the same role check.
- **Problem:** Professional module authority is enforced inconsistently and can
  be bypassed through direct navigation.
- **Correct owner:** Central route registry and authorization policy.
- **Recommended fix:** Define route metadata once and apply authentication,
  account mode, and role checks to initial load, hash changes, native events,
  and `setPage`.
- **Severity:** Critical

### A-02: Lead authority is split

- **File name:** `src/pages/BusinessLeads.jsx`,
  `src/pages/BusinessDashboard.jsx`, `src/pages/QuoteRequests.jsx`
- **Current behavior:** Leads are independently sourced from `/posts`,
  `/contractor-quote-requests`, and local `homeownerRequests`.
- **Problem:** A lead can appear, disappear, or carry a different status
  depending on the surface.
- **Correct owner:** Leads module backed by a canonical request/lead record.
- **Recommended fix:** Normalize all lead sources behind one repository keyed
  by an immutable request ID. Dashboard should consume a lead projection.
- **Severity:** Critical

### A-03: Lead identity falls back to mutable text

- **File name:** `src/pages/BusinessLeads.jsx`,
  `src/pages/QuoteRequests.jsx`, `src/utils/workflowTimeline.js`
- **Current behavior:** Requests are matched by title, description, or fallback
  title when IDs are unavailable.
- **Problem:** Similar jobs can be merged and edited titles can sever workflow
  connections.
- **Correct owner:** Project/request identity service.
- **Recommended fix:** Require the same request ID across posts, conversations,
  appointments, quotes, jobs, completion records, and history.
- **Severity:** High

### A-04: Appointment-before-quote is advisory

- **File name:** `src/pages/ContractorDashboard.jsx`,
  `src/pages/QuoteBuilder.jsx`
- **Current behavior:** Work Center exposes direct quote creation and
  `sendQuote()` validates price but not appointment completion.
- **Problem:** A standard lead can bypass contact, appointment, and visit
  outcome.
- **Correct owner:** Workflow transition policy.
- **Recommended fix:** Require a completed appointment or a recorded exception
  before a standard quote can be sent.
- **Severity:** Critical

### A-05: Accepted quotes can bypass scheduling

- **File name:** `src/pages/ContractorDashboard.jsx`
- **Current behavior:** An accepted quote can be moved directly to active work.
- **Problem:** Quote acceptance and work activation are collapsed into a UI
  action without a required schedule/job-start transition.
- **Correct owner:** Project workflow command layer.
- **Recommended fix:** Make acceptance create a next-action requirement. Only a
  schedule/start command should activate work.
- **Severity:** Critical

### A-06: Quote decisions do not update the complete project

- **File name:** `src/components/workflows/WorkflowQuoteSentCard.jsx`,
  `src/pages/MyRequests.jsx`
- **Current behavior:** Quote decisions update quote arrays and local message
  state through separate paths.
- **Problem:** The quote, homeowner request, conversation event, professional
  notification, and Work Center can disagree.
- **Correct owner:** Quote domain command service.
- **Recommended fix:** Execute accept, revise, and decline as atomic project
  commands that emit one durable timeline event.
- **Severity:** Critical

### A-07: Work Center uses global active-project slots

- **File name:** `src/utils/workCenter.js`,
  `src/pages/ContractorDashboard.jsx`
- **Current behavior:** `activeWork*`, `activeJob*`, and selected-item keys hold
  the current operational state globally.
- **Problem:** Opening another project can overwrite or contaminate the first
  project's context.
- **Correct owner:** Project-scoped work repository.
- **Recommended fix:** Store work by project ID. Keep current tab and selected
  project as UI state only.
- **Severity:** Critical

### A-08: Partial snapshot writes preserve stale data

- **File name:** `src/utils/workCenter.js`
- **Current behavior:** Snapshot helpers write only truthy fields, leaving old
  schedule, quote, location, pause, or conversation values in storage.
- **Problem:** A new job can inherit details from a prior job.
- **Correct owner:** Project-scoped work repository.
- **Recommended fix:** Replace complete records atomically and support explicit
  clearing of nullable fields.
- **Severity:** High

### A-09: Conversation is not the durable timeline

- **File name:** `src/pages/ConversationThread.jsx`,
  `src/pages/QuoteBuilder.jsx`, `src/pages/CompletionSheet.jsx`
- **Current behavior:** Some workflow cards are appended locally while message
  polling replaces local messages with backend results when any exist.
- **Problem:** Locally created quote, schedule, or completion cards can be lost
  or differ between devices.
- **Correct owner:** Backend project event stream exposed through conversation.
- **Recommended fix:** Persist all workflow events to one backend timeline and
  merge by immutable event ID.
- **Severity:** Critical

### A-10: Three timeline models compete

- **File name:** `src/pages/ConversationThread.jsx`,
  `src/pages/ContractorDashboard.jsx`, `src/utils/workCenter.js`
- **Current behavior:** Conversation messages, `meetroWorkflowTimeline` plus
  `projectTimeline`, and `meetro_job_record_*` are separate histories.
- **Problem:** No view can guarantee complete ordering or provenance.
- **Correct owner:** Project timeline/event repository.
- **Recommended fix:** Use one append-only event model and derive conversation,
  job record, Work Center timeline, and history views from it.
- **Severity:** Critical

### A-11: Standard completion does not reliably update the homeowner request

- **File name:** `src/pages/CompletionSheet.jsx`
- **Current behavior:** Completion writes `completedProjects`, counters,
  schedules, conversation history, and active-state cleanup, but does not update
  the matching `homeownerRequests` record for a standard project.
- **Problem:** The professional can see completion while the homeowner still
  sees an active request.
- **Correct owner:** Project completion command.
- **Recommended fix:** Mark the canonical project complete first, then derive
  completion record, shared history, conversation card, metrics, and cleanup.
- **Severity:** Critical

### A-12: Direct completion bypasses closeout

- **File name:** `src/pages/ProjectDetails.jsx`
- **Current behavior:** Project Details directly marks a request complete and
  updates counters without using the Completion Sheet workflow.
- **Problem:** Multiple completion authorities create different records.
- **Correct owner:** Project completion command.
- **Recommended fix:** Route all standard completion actions through one
  closeout operation.
- **Severity:** Critical

### A-13: Closeout status has no complete customer transition

- **File name:** `src/components/workflows/WorkflowCompletionCloseoutCard.jsx`,
  `src/pages/CompletionSheet.jsx`
- **Current behavior:** The event starts at
  `awaiting_customer_confirmation`, but the homeowner card primarily offers
  review and sharing actions.
- **Problem:** Confirmation and follow-up statuses exist but are not connected
  to durable commands.
- **Correct owner:** Completion/closeout workflow.
- **Recommended fix:** Add confirm and follow-up commands that update the
  completion record and append timeline events.
- **Severity:** High

### A-14: Dashboard owns domain filtering and metric definitions

- **File name:** `src/pages/BusinessDashboard.jsx`
- **Current behavior:** Dashboard filters leads, defines active-project states,
  calculates pending quotes, and counts all schedule entries as today's work.
- **Problem:** Dashboard duplicates Leads and Work Center business rules.
- **Correct owner:** Leads, Scheduling, Quotes, and Work Center query modules.
- **Recommended fix:** Dashboard should consume precomputed read models only.
- **Severity:** High

### A-15: Dashboard metrics are not trustworthy

- **File name:** `src/pages/BusinessDashboard.jsx`
- **Current behavior:** Completed jobs defaults to `1`, schedule count is not
  date-filtered, and accepted requests count as active projects.
- **Problem:** Operational numbers can be wrong before any user action.
- **Correct owner:** Reporting/query projection.
- **Recommended fix:** Define explicit metric queries and remove placeholder
  defaults.
- **Severity:** High

### A-16: Command Center presents aliases as modules

- **File name:** `src/pages/BusinessCommandCenter.jsx`
- **Current behavior:** Permits and plans route to generic records, reminders
  route to schedule, and customers route to Leads.
- **Problem:** Capability names imply independent domain ownership that does not
  exist.
- **Correct owner:** Command Center as navigation/orchestration only.
- **Recommended fix:** Hide unavailable modules or label them as views of their
  actual owner.
- **Severity:** Medium

### A-17: Manual customer conversion is not implemented

- **File name:** `src/pages/ContractorDashboard.jsx`
- **Current behavior:** Manual schedule entries warn that chat and full workflow
  are unavailable. The connect action only stores a selection and displays
  instructions.
- **Problem:** External customers cannot become project-scoped Meetro
  participants.
- **Correct owner:** Customer/project onboarding.
- **Recommended fix:** Create an invitation/conversion record that binds the
  external contact to a project and later reconciles the accepted identity.
- **Severity:** High

### A-18: External quote decisions are self-reported

- **File name:** `src/pages/ContractorDashboard.jsx`
- **Current behavior:** The professional manually marks an external quote
  accepted, revised, or declined.
- **Problem:** There is no authenticated customer action or evidence trail.
- **Correct owner:** Quote decision workflow.
- **Recommended fix:** Use signed response links or record actor, source,
  timestamp, and evidence for manual decisions.
- **Severity:** High

### A-19: Workflow type definitions disagree

- **File name:** `src/utils/workflowTypes.js`,
  `src/components/workflows/WorkflowRenderer.jsx`
- **Current behavior:** The renderer supports `workflow_quote_sent`, but the
  canonical type list does not include it.
- **Problem:** Classification, persistence, and rendering can disagree.
- **Correct owner:** Workflow schema registry.
- **Recommended fix:** Define event names, payloads, statuses, and transitions
  in one shared schema.
- **Severity:** High

### A-20: Routed legacy Leads surface can fail

- **File name:** `src/pages/QuoteRequests.jsx`
- **Current behavior:** The `pageText` object references itself while it is
  being initialized.
- **Problem:** A routed professional screen can throw before rendering.
- **Correct owner:** Leads presentation module.
- **Recommended fix:** Retire the duplicate page or correct initialization and
  route all lead access through the chosen Leads module.
- **Severity:** High

### A-21: There are no automated workflow tests

- **File name:** Project-wide
- **Current behavior:** No test or specification files are present.
- **Problem:** High-risk lifecycle changes have no regression protection.
- **Correct owner:** Test architecture and release process.
- **Recommended fix:** Add integration tests for route authority and the
  lead-to-history critical path before broad refactoring.
- **Severity:** Critical

### A-22: Project source boundaries are unclear

- **File name:** `src/`
- **Current behavior:** Numerous backup files and parallel implementations are
  stored beside active source.
- **Problem:** Reviewers and tools can select obsolete behavior accidentally.
- **Correct owner:** Repository structure and engineering guardrails.
- **Recommended fix:** Identify the active implementation, archive historical
  copies outside runtime source, and document generated/native artifacts.
- **Severity:** Medium

## Top 10 TestFlight Blockers

1. Professional route authority can be bypassed.
2. Standard completion can fail to reach homeowner history.
3. Backend polling can replace locally created workflow events.
4. Quotes can bypass the required appointment transition.
5. Quote decisions do not atomically advance the project.
6. Global active-work keys can mix project context.
7. Multiple lead sources create inconsistent visibility.
8. Multiple completion paths create divergent history and metrics.
9. The legacy Quote Requests route can fail at render time.
10. No automated critical-path workflow tests exist.

## Fastest Safe Implementation Order

1. Freeze and document canonical IDs and state transitions.
2. Centralize route authority without changing screen design.
3. Add a project command boundary around appointment, quote decision, start,
   and completion.
4. Make standard completion update the canonical homeowner request.
5. Persist workflow cards through the backend conversation event path.
6. Consolidate quote writes behind one quote repository.
7. Replace global active-work fields with project-scoped records.
8. Convert Dashboard to read-only projections.
9. Convert Command Center to honest navigation.
10. Add manual-customer invitation and reconciliation.

## Files That Should Be Fixed First

1. `src/App.jsx`
2. `src/utils/session.js`
3. `src/utils/workflowTimeline.js`
4. `src/utils/workCenter.js`
5. `src/pages/CompletionSheet.jsx`
6. `src/pages/QuoteBuilder.jsx`
7. `src/components/workflows/WorkflowQuoteSentCard.jsx`
8. `src/pages/ConversationThread.jsx`
9. `src/pages/ContractorDashboard.jsx`
10. `src/pages/BusinessDashboard.jsx`

## Risky Files That Need Human Review

- `src/pages/ContractorDashboard.jsx`: very large, owns several domains, and has
  many state mutation paths.
- `src/pages/ConversationThread.jsx`: combines transport, local cache, workflow
  rendering, scheduling, completion, and job records.
- `src/pages/MyRequests.jsx`: homeowner decisions directly mutate quote and
  project state.
- `src/pages/ProjectDetails.jsx`: supports lead review, active work, and direct
  completion in one screen.
- `src/pages/CompletionSheet.jsx`: clears broad global state after completion.
- `src/utils/accountStorage.js`: account cleanup spans nearly every workflow.
- Emergency workflow pages: share active-job and conversation keys with standard
  workflows and require regression review before storage changes.

## Tomorrow Morning Recommendation

Hold a short architecture lock session before editing code. Agree on:

1. the canonical project/request ID;
2. the valid standard workflow states;
3. who owns appointment, quote, active work, completion, and timeline writes;
4. the exact appointment-before-quote exception policy;
5. the one completion path that must update both homeowner and professional
   views.

Then implement only the first vertical correction: route authority plus a
tested standard completion command. This produces immediate TestFlight risk
reduction without beginning the larger Work Center extraction prematurely.
