# Authority Matrix Code Map

## Legend

- **Owner:** Module that should be allowed to change domain state.
- **Projection:** Module that may read and summarize state.
- **Orchestrator:** Module that may navigate or invoke an owner.
- **Violation:** Current direct write outside the intended owner.

## Proposed Authority Matrix

| Domain | Correct owner | Allowed projections | Current competing writers |
| --- | --- | --- | --- |
| Route access | Route authority policy | Navigation components | `App.jsx`, `session.js`, individual pages |
| Leads | Leads/Requests | Dashboard, Command Center | Business Leads, Dashboard, Quote Requests, Messages |
| Appointments | Scheduling | Work Center, Dashboard, Conversation | Work Center and Conversation |
| Quotes | Quotes | Work Center, Conversation, Homeowner Requests | Quote Builder, quote cards, My Requests, Work Center |
| Active work | Work/Project | Work Center, Conversation, Dashboard | Work Center, Project Details, emergency pages |
| Materials | Materials | Work Center, Conversation | Work Center and workflow cards |
| Completion | Completion/Closeout | History, Work Center, Conversation | Completion Sheet, Project Details, emergency pages |
| Timeline | Project Events | Conversation, Job Record, Work Center | Conversation, Work Center, per-request timelines |
| Metrics | Reporting projection | Dashboard, Analytics | Dashboard, Work Center, completion writers |
| Manual customer conversion | Customer onboarding | Work Center, Quotes | Work Center alerts/invite text |

## Code-Level Findings

### AM-01: Route policy has two definitions

- **File name:** `src/App.jsx`, `src/utils/session.js`
- **Current behavior:** Professional access and business-mode page sets are
  separate and contain different routes.
- **Problem:** Mode selection does not guarantee authorization.
- **Correct owner:** One route authority registry.
- **Recommended fix:** Define route, required role, account mode, and fallback in
  one map.
- **Severity:** Critical

### AM-02: Dashboard writes workflow navigation intent

- **File name:** `src/pages/BusinessDashboard.jsx`
- **Current behavior:** Dashboard sets lead workflow fields, selected entities,
  command tools, and Work Center tabs.
- **Problem:** A projection screen participates in domain workflow setup.
- **Correct owner:** Leads and navigation orchestrator.
- **Recommended fix:** Dashboard should invoke a typed open-lead/open-tool
  action without writing domain state.
- **Severity:** High

### AM-03: Dashboard independently defines lead eligibility

- **File name:** `src/pages/BusinessDashboard.jsx`
- **Current behavior:** It filters `homeownerRequests` by category and status.
- **Problem:** Lead visibility logic is duplicated outside Leads.
- **Correct owner:** Leads module.
- **Recommended fix:** Consume a `getLeadPreview()` projection.
- **Severity:** High

### AM-04: Dashboard independently defines operational metrics

- **File name:** `src/pages/BusinessDashboard.jsx`
- **Current behavior:** It calculates active projects, quotes, and schedule
  counts from local arrays.
- **Problem:** Metric semantics differ from Work Center.
- **Correct owner:** Reporting/query projection.
- **Recommended fix:** Consume named metrics with documented status/date rules.
- **Severity:** High

### AM-05: Command Center aliases capabilities

- **File name:** `src/pages/BusinessCommandCenter.jsx`
- **Current behavior:** Tool cards map directly to Work Center tabs or Leads.
- **Problem:** Command Center appears to own modules it only aliases.
- **Correct owner:** Command Center orchestrator.
- **Recommended fix:** Maintain a capability registry identifying actual owner,
  availability, and destination.
- **Severity:** Medium

### AM-06: Work Center owns appointment commands

- **File name:** `src/pages/ContractorDashboard.jsx`
- **Current behavior:** It creates, edits, completes, deletes, and interprets
  appointments.
- **Problem:** Scheduling cannot be reused or validated independently.
- **Correct owner:** Scheduling module.
- **Recommended fix:** Move transition rules behind Scheduling commands while
  retaining Work Center presentation.
- **Severity:** High

### AM-07: Conversation owns appointment commands

- **File name:** `src/pages/ConversationThread.jsx`
- **Current behavior:** It creates appointments and edits schedule storage.
- **Problem:** Conversation is another Scheduling writer.
- **Correct owner:** Scheduling module.
- **Recommended fix:** Conversation should invoke Scheduling and render the
  emitted event.
- **Severity:** High

### AM-08: Work Center owns quote lifecycle

- **File name:** `src/pages/ContractorDashboard.jsx`
- **Current behavior:** It updates quote decisions, conversion, drafts,
  revision context, and external response states.
- **Problem:** Quote Builder and homeowner workflow are not the only authorities.
- **Correct owner:** Quotes module.
- **Recommended fix:** Replace direct array mutation with quote commands.
- **Severity:** Critical

### AM-09: Workflow cards own quote lifecycle

- **File name:** `src/components/workflows/WorkflowQuoteSentCard.jsx`,
  `src/components/workflows/WorkflowRevisedQuoteCard.jsx`
- **Current behavior:** Presentation components directly update stored quote
  state and message state.
- **Problem:** Renderers are domain writers.
- **Correct owner:** Quotes module.
- **Recommended fix:** Inject command callbacks and keep cards presentational.
- **Severity:** Critical

### AM-10: Project Details owns activation and completion

- **File name:** `src/pages/ProjectDetails.jsx`
- **Current behavior:** The page changes request status to active/completed,
  writes completed records, and increments metrics.
- **Problem:** A detail view bypasses Work and Completion owners.
- **Correct owner:** Work and Completion commands.
- **Recommended fix:** Replace direct writes with explicit activate/complete
  commands.
- **Severity:** Critical

### AM-11: Completion Sheet owns reporting counters

- **File name:** `src/pages/CompletionSheet.jsx`
- **Current behavior:** It increments completed count and revenue.
- **Problem:** Completion both records an event and mutates reporting totals.
- **Correct owner:** Completion command emits an event; Reporting derives totals.
- **Recommended fix:** Remove direct metric authority after a reporting
  projection exists.
- **Severity:** High

### AM-12: Conversation owns archive and history state

- **File name:** `src/pages/ConversationThread.jsx`
- **Current behavior:** Conversation writes archive flags and registry history
  entries.
- **Problem:** Inbox/archive presentation state is treated as project history.
- **Correct owner:** Conversation index and Project Timeline projections.
- **Recommended fix:** Archive through a command and derive registry flags.
- **Severity:** High

### AM-13: Homeowner pages own professional quote state

- **File name:** `src/pages/MyRequests.jsx`
- **Current behavior:** Homeowner quote actions update both request and global
  quote arrays directly.
- **Problem:** Client-side views coordinate a distributed transaction.
- **Correct owner:** Quotes/project command layer.
- **Recommended fix:** Submit one decision command and refresh projections.
- **Severity:** Critical

### AM-14: Workflow schema ownership is split

- **File name:** `src/utils/workflowTypes.js`,
  `src/utils/workflowStatus.js`,
  `src/components/workflows/WorkflowRenderer.jsx`
- **Current behavior:** Types, statuses, titles, icons, and render support are
  defined in separate lists.
- **Problem:** Supported behavior can drift.
- **Correct owner:** Workflow schema registry.
- **Recommended fix:** Consolidate metadata and transition validation.
- **Severity:** High

## Dashboard Ownership Rule

Dashboard may:

- display counts;
- display a short next-up list;
- display alerts;
- navigate to the owning module.

Dashboard must not:

- decide lead eligibility;
- mutate quote status;
- create active work;
- increment metrics;
- own schedule filtering;
- persist selected workflow state.

## Command Center Ownership Rule

Command Center may:

- list available capabilities;
- describe modules;
- navigate with explicit context.

Command Center must not:

- pretend generic records are permits or plans;
- encode Work Center tab names as domain commands;
- own customers through the Leads page;
- define domain statuses or metrics.

## Human Decisions Required

1. Is the canonical lead object a post, quote request, or project request?
2. Is appointment-before-quote absolute, or which exception types are valid?
3. Does quote acceptance create scheduled work or only a required next action?
4. Is emergency work a separate aggregate or a specialized project workflow?
5. Is conversation the source event stream or a projection of project events?
6. Which completion event makes history immutable?
7. How should external customer decisions be authenticated or evidenced?
