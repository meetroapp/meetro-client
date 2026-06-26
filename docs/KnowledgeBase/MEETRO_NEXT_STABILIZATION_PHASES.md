# Meetro Next Stabilization Phases

## Purpose

This report defines the next architecture stabilization tracks for
`meetro-client`. It is a planning document only. It does not authorize code
changes, storage migration, UI refactoring, legacy-key removal, or creation of
new major modules.

The plan builds on the compatibility foundation already present in:

- `src/utils/projectIdentity.js`
- `src/utils/workflowCommands.js`
- `src/utils/workCenterSelectors.js`
- `src/utils/workCenter.js`

## Governing Rules

Every phase must preserve these Knowledge Base rules:

1. Workflow before features.
2. Collect project information and complete the required appointment before a
   standard quote is sent.
3. Dashboard is a read-only summary and navigation surface, not Work Center.
4. Command Center is an orchestrator, not Work Center or a domain owner.
5. Conversation is the relationship timeline for both participants.
6. Manual customers are first-class project participants.
7. All new or changed user-facing text must come through
   `src/utils/language.js`.
8. Homeowner and professional responsibilities, navigation, and visibility
   must remain separate.
9. Do not create new major modules. Stabilize through current utilities,
   pages, components, and narrow interfaces.
10. Do not retire a legacy read or write until identity, parity, tests, and
    human review are complete.

## Universal Phase Gates

These gates apply to every implementation phase described below:

- Use canonical `projectId` or a safely normalized legacy identity.
- Do not use title, customer name, location, or description as primary
  identity.
- Preserve existing writes until a separately approved authority migration.
- Add no new storage key unless it is an approved append-only compatibility
  namespace.
- Keep shadow or diagnostic work non-blocking.
- Keep Dashboard and Command Center free of new domain decisions.
- Run `npm run build` after every implementation phase.
- Add focused tests before changing workflow authority or user-visible reads.
- Manually test both homeowner and professional paths for shared workflows.
- Stop immediately if standard and emergency records cannot be distinguished.
- Stop immediately if a change could overwrite another project's state.

---

## Track 1: Lead Alignment

### Lead Phase 1: Source and Identity Reconciliation

**Goal**

Create a read-only definition of a lead that reconciles `/posts`,
`/contractor-quote-requests`, and `homeownerRequests` without changing which
screen currently writes or displays them.

**Files to inspect**

- `src/pages/BusinessLeads.jsx`
- `src/pages/QuoteRequests.jsx`
- `src/pages/BusinessDashboard.jsx`
- `src/pages/MessagesInbox.jsx`
- `src/pages/ProjectDetails.jsx`
- `src/utils/projectIdentity.js`
- `src/utils/workCenterSelectors.js`
- `src/utils/workflowTimeline.js`
- `src/utils/language.js`

**Safe changes allowed**

- Add read-only lead normalization and reconciliation selectors to an existing
  utility.
- Report source, canonical identity, status source, duplicates, conflicts, and
  identity warnings.
- Mark records with title-only identity as unresolved instead of joining them.
- Add focused pure-function tests for normalization and deduplication.

**Unsafe changes to avoid**

- Replacing backend or local lead sources.
- Merging records by title or description.
- Changing lead eligibility, filtering, routing, or visible status.
- Making Dashboard the lead repository.
- Retiring `QuoteRequests.jsx` before route and data ownership are approved.

**Stop conditions**

- Two sources claim different stable IDs for the same apparent request.
- Lead closure can only be inferred from mutable text.
- A selector would need to choose a canonical source without a product decision.
- Emergency requests are mixed into standard lead results.

**Build/test requirements**

- `npm run build`
- Pure tests for ID precedence, unresolved identity, duplicate IDs, conflicting
  status, and empty sources.
- Manual comparison of lead counts on Business Leads, Dashboard, and Quote
  Requests with no display changes.

**Expected deliverable**

A structured lead reconciliation report and a proposed canonical lead read
contract, with no UI adoption and no writes changed.

### Lead Phase 2: Information and Appointment Gate Definition

**Goal**

Define the standard lead transition rules from review to contact, appointment,
visit outcome, and quote eligibility before any enforcement is introduced.

**Files to inspect**

- `src/pages/BusinessLeads.jsx`
- `src/pages/ProjectDetails.jsx`
- `src/pages/ContractorDashboard.jsx`
- `src/pages/ConversationThread.jsx`
- `src/pages/QuoteBuilder.jsx`
- `src/utils/workflowStatus.js`
- `src/utils/workflowTypes.js`
- `src/utils/workflowCommands.js`
- `src/utils/language.js`

**Safe changes allowed**

- Document and test a pure quote-eligibility policy using existing statuses.
- Produce warning-only results for missing information, appointment, outcome,
  or safe project identity.
- Define explicit exception metadata for later human approval.
- Reuse existing identity and command utilities; do not add a major module.

**Unsafe changes to avoid**

- Blocking quote creation or sending before the exception policy is approved.
- Treating a scheduled appointment as a completed appointment.
- Automatically converting accepted quotes to active work.
- Applying standard appointment rules to emergency work without review.
- Adding hard-coded warning text outside `language.js`.

**Stop conditions**

- William has not approved appointment-before-quote exceptions.
- Appointment statuses cannot be normalized without changing stored values.
- A lead lacks a stable ID shared with its schedule or quote.
- Current paths disagree on whether contact, visit, or outcome is required.

**Build/test requirements**

- `npm run build`
- Policy tests for incomplete information, scheduled appointment, completed
  appointment, recorded outcome, approved exception, and emergency exclusion.
- Manual review of English and Spanish terminology.

**Expected deliverable**

An approved transition table and tested warning-only eligibility interface,
ready for later enforcement.

### Lead Phase 3: Lead Handoff and Ownership Adoption

**Goal**

Make Leads the single read authority for lead visibility and hand off safe
project context to Conversation, Scheduling, and Work Center without Dashboard
or Command Center defining workflow state.

**Files to inspect**

- `src/pages/BusinessLeads.jsx`
- `src/pages/BusinessDashboard.jsx`
- `src/pages/BusinessCommandCenter.jsx`
- `src/pages/ProjectDetails.jsx`
- `src/pages/MessagesInbox.jsx`
- `src/utils/projectIdentity.js`
- `src/utils/workflowCommands.js`
- `src/utils/workCenterSelectors.js`
- `src/App.jsx`
- `src/utils/session.js`

**Safe changes allowed**

- Switch summary reads to an approved lead projection after parity tests pass.
- Pass explicit `projectId`/`requestId` navigation context.
- Use existing project-context and project-link commands as non-blocking
  compatibility writes.
- Keep Dashboard and Command Center limited to counts, alerts, and navigation.

**Unsafe changes to avoid**

- Persisting selected tabs as domain commands.
- Moving lead workflow logic into Dashboard or Command Center.
- Removing existing lead sources or routes in the same phase.
- Changing role access or homeowner navigation incidentally.

**Stop conditions**

- Projection counts do not match accepted baseline scenarios.
- Navigation loses project identity.
- Direct URL, hash, or native navigation bypasses the same role policy.
- The change requires simultaneous lead, route, and UI redesign.

**Build/test requirements**

- `npm run build`
- Integration tests for lead-to-project, lead-to-conversation, and
  lead-to-schedule navigation.
- Role tests for homeowner and professional direct navigation.
- Manual verification that Dashboard and Command Center do not mutate workflow
  state.

**Expected deliverable**

One approved lead projection consumed by summary surfaces, with explicit
handoff context and no legacy-source retirement.

---

## Track 2: Conversation Timeline

### Conversation Phase 1: Event and Identity Contract

**Goal**

Freeze the event envelope and identity rules used to represent messages,
appointments, quotes, work changes, completion, and archive events in one
relationship timeline.

**Files to inspect**

- `src/pages/ConversationThread.jsx`
- `src/pages/MessagesInbox.jsx`
- `src/utils/workflowTypes.js`
- `src/utils/workflowStatus.js`
- `src/components/workflows/WorkflowRenderer.jsx`
- `src/utils/projectIdentity.js`
- `src/utils/workflowCommands.js`
- `src/utils/workCenterSelectors.js`

**Safe changes allowed**

- Define and test a versioned read-only event normalization contract.
- Require event, project, conversation, actor, role, source, and timestamp
  metadata when safely available.
- Report incomplete or conflicting workflow type definitions.
- Keep existing backend messages and local event arrays unchanged.

**Unsafe changes to avoid**

- Reinterpreting actor roles from the current viewer.
- Assigning `conversationId` as `projectId` without explicit linkage.
- Rewriting old events or changing render behavior.
- Consolidating workflow schemas and renderers in the same phase.

**Stop conditions**

- Actor or project identity can only be guessed.
- Timestamp forms cannot be ordered deterministically.
- An event type has incompatible payload meanings across writers.
- Standard and emergency conversations use conflicting semantics.

**Build/test requirements**

- `npm run build`
- Pure normalization tests for old messages, workflow cards, malformed events,
  actor metadata, timestamp variants, and unknown event types.

**Expected deliverable**

A reviewed event-envelope specification and compatibility test matrix.

### Conversation Phase 2: Relationship Timeline Reconciliation

**Goal**

Compare backend messages, local conversation arrays, registry entries, job
records, legacy timelines, and the canonical shadow timeline without changing
what is rendered.

**Files to inspect**

- `src/pages/ConversationThread.jsx`
- `src/pages/MessagesInbox.jsx`
- `src/utils/workCenterSelectors.js`
- `src/utils/workflowTimeline.js`
- `src/utils/workCenter.js`
- `src/pages/QuoteBuilder.jsx`
- `src/pages/CompletionSheet.jsx`

**Safe changes allowed**

- Extend existing read-only reconciliation selectors.
- Deduplicate only by immutable event ID or an approved stable entity/event
  pair.
- Report local-only, backend-only, orphaned, conflicting, and unordered events.
- Add development-only summary logging after already-safe shadow writes.

**Unsafe changes to avoid**

- Rendering reconciled data.
- Replacing local arrays with backend results or vice versa.
- Deduplicating by text and display time.
- Treating inbox archive flags as project completion.

**Stop conditions**

- Event IDs are absent and deduplication would be heuristic.
- Backend polling currently drops a tested workflow event.
- Counts cannot distinguish messages from workflow events.
- Reconciliation logging exposes message content or customer information.

**Build/test requirements**

- `npm run build`
- Tests for local-only, server-only, acknowledged shadow, duplicate lifecycle,
  orphan, and conflicting events.
- Manual inspection of summary-only development logs.

**Expected deliverable**

A structured timeline coverage report by project and conversation, with common
identity and persistence failure reasons.

### Conversation Phase 3: Non-Blocking Event Parity

**Goal**

Plan narrow shadow adoption for the remaining safe workflow events so quote,
schedule, work, and completion actions can be compared against the canonical
timeline.

**Files to inspect**

- `src/pages/ConversationThread.jsx`
- `src/pages/QuoteBuilder.jsx`
- `src/pages/CompletionSheet.jsx`
- `src/pages/ContractorDashboard.jsx`
- `src/components/workflows/WorkflowQuoteSentCard.jsx`
- `src/components/workflows/WorkflowCompletionCloseoutCard.jsx`
- `src/utils/workflowCommands.js`
- `src/utils/projectIdentity.js`

**Safe changes allowed**

- Add append-only shadow events only after a successful existing action and only
  with safe identity.
- Keep calls in `try/catch` and never block the existing workflow.
- Record compact warning metadata when identity is unsafe.
- Add one event family at a time with focused tests.

**Unsafe changes to avoid**

- Removing legacy timeline or conversation writes.
- Changing visible order, cards, polling, notifications, or archive behavior.
- Creating shadow events before the existing action succeeds.
- Recording a customer decision as authenticated when it was professional
  self-reporting.

**Stop conditions**

- The event cannot be linked to a safe project ID.
- One user action produces ambiguous or conflicting event types.
- A shadow write can throw through the existing action.
- Completion or quote parity depends on an unapproved status transition.

**Build/test requirements**

- `npm run build`
- Per-event tests proving append-only behavior, one project identity, no
  existing-key mutation, and failure isolation.
- Manual homeowner/professional workflow pass with no visible differences.

**Expected deliverable**

An approved event-by-event shadow adoption checklist and reconciliation
baseline. Implementation must remain separately phased.

### Conversation Phase 4: Read Adoption and Persistence Decision

**Goal**

Prepare a controlled move toward Conversation as the relationship timeline,
using reconciled events only after persistence and cross-role parity are proven.

**Files to inspect**

- `src/pages/ConversationThread.jsx`
- `src/pages/MessagesInbox.jsx`
- `src/components/workflows/WorkflowRenderer.jsx`
- `src/components/workflows/presentations/CompletionWorkflowPresentation.jsx`
- `src/pages/Home.jsx`
- `src/pages/MyRequests.jsx`
- `src/utils/workCenterSelectors.js`
- `src/utils/language.js`

**Safe changes allowed**

- Adopt a tested read projection behind a development flag or narrow event
  family.
- Keep legacy fallback reads.
- Add untranslated-copy checks and role-specific visibility tests.
- Document the backend persistence contract required before legacy retirement.

**Unsafe changes to avoid**

- Rendering the shadow timeline as authoritative without cross-device proof.
- Removing local pending events during polling.
- Showing professional-only controls to homeowners or the reverse.
- Auto-archiving conversations from inbox presentation state.
- Deleting conversation, registry, job-record, or timeline keys.

**Stop conditions**

- A quote or completion event is missing for either participant.
- Server acknowledgement duplicates or replaces a pending event incorrectly.
- Actor, ordering, or archive state changes after logout/login.
- The backend cannot preserve immutable event IDs.

**Build/test requirements**

- `npm run build`
- Integration tests for pending-event merge, acknowledgement, ordering,
  cross-role visibility, archive, logout/login, and emergency isolation.
- Manual two-account and two-device review before any default read switch.

**Expected deliverable**

A go/no-go report for each event family, plus the exact backend and manual
acceptance gates required for Conversation to become the default timeline read.

---

## Track 3: Work Center Consolidation

### Work Center Phase 1: Ownership and Read Contract Freeze

**Goal**

Freeze the Work Center shell boundary and document which existing selector or
domain owns each tab's data before additional adoption.

**Files to inspect**

- `src/pages/ContractorDashboard.jsx`
- `src/utils/workCenterSelectors.js`
- `src/utils/workCenter.js`
- `src/utils/projectIdentity.js`
- `src/utils/workflowCommands.js`
- `src/pages/BusinessDashboard.jsx`
- `src/pages/BusinessCommandCenter.jsx`

**Safe changes allowed**

- Characterize selector precedence, warnings, and coverage.
- Add read-only parity tests around existing selectors.
- Document Work Center shell state separately from domain state.
- Identify Dashboard and Command Center reads that can consume projections.

**Unsafe changes to avoid**

- Moving tabs or extracting components.
- Replacing writes.
- Treating `workCenter.js` as the final owner of every domain.
- Adding new Dashboard or Command Center workflow logic.

**Stop conditions**

- A selector silently resolves title-only identity.
- Active-work precedence changes existing output.
- Existing selector coverage cannot be measured.

**Build/test requirements**

- `npm run build`
- Selector tests for empty, legacy, conflicting, multi-project, and emergency
  data.
- Snapshot current tab counts and selected-project behavior.

**Expected deliverable**

An approved Work Center ownership table and frozen read contracts.

### Work Center Phase 2: Schedule Read Adoption

**Goal**

Plan a low-risk switch of schedule rendering to existing normalized schedule
selectors while keeping all schedule writes unchanged.

**Files to inspect**

- `src/pages/ContractorDashboard.jsx`
- `src/utils/workCenterSelectors.js`
- `src/utils/workCenter.js`
- `src/pages/ConversationThread.jsx`
- `src/pages/BusinessDashboard.jsx`

**Safe changes allowed**

- Adopt read-only schedule selectors after count and ordering parity.
- Surface development warnings for missing project links.
- Preserve manual, chat, project, and emergency source labels.

**Unsafe changes to avoid**

- Normalizing stored status strings in place.
- Removing `meetro_business_schedule`.
- Changing appointment commands or date interpretation.
- Hiding manual appointments because they lack conversation IDs.

**Stop conditions**

- Visible schedule count/order differs.
- Manual or emergency schedule records disappear.
- Date or timezone conversion changes today's schedule.

**Build/test requirements**

- `npm run build`
- Tests for status casing, date boundaries, source types, project links, and
  unlinked manual appointments.
- Manual comparison of schedule tab and Dashboard summary.

**Expected deliverable**

A schedule-read adoption decision with parity evidence and unresolved identity
counts.

### Work Center Phase 3: Quote Read Adoption

**Goal**

Plan a low-risk switch of quote rendering to normalized quote selectors while
preserving all quote lifecycle writes and embedded request copies.

**Files to inspect**

- `src/pages/ContractorDashboard.jsx`
- `src/pages/QuoteBuilder.jsx`
- `src/components/workflows/WorkflowQuoteSentCard.jsx`
- `src/pages/MyRequests.jsx`
- `src/utils/workCenterSelectors.js`
- `src/utils/workflowCommands.js`

**Safe changes allowed**

- Adopt a deduplicated quote read projection after lifecycle-link parity.
- Report orphan and conflicting project links.
- Preserve source and evidence metadata for external quotes.

**Unsafe changes to avoid**

- Choosing one quote array as write authority.
- Removing embedded `quotesReceived`.
- Collapsing repeated lifecycle updates into a new status.
- Treating manual external decisions as authenticated customer decisions.

**Stop conditions**

- Deduplication requires title/customer matching.
- One quote ID links to multiple project IDs.
- Homeowner and professional quote status differs.

**Build/test requirements**

- `npm run build`
- Tests for triplicated arrays, repeated lifecycle links, embedded copies,
  orphan links, conflicting links, and external quotes.
- Manual quote send/revise/accept/decline review with both roles.

**Expected deliverable**

A quote-read adoption decision and a documented list of unsafe quote records.

### Work Center Phase 4: Active Work Read Adoption

**Goal**

Normalize active-work reads by project without changing global snapshot writes
or activation behavior.

**Files to inspect**

- `src/pages/ContractorDashboard.jsx`
- `src/pages/ProjectDetails.jsx`
- `src/utils/workCenterSelectors.js`
- `src/utils/workCenter.js`
- `src/utils/workflowCommands.js`
- Standard and emergency active-work pages

**Safe changes allowed**

- Compare request status, selected project, active snapshots, quote-derived
  work, and emergency records through a read-only projection.
- Add warnings for overlapping project records and global-slot contamination.
- Test project-scoped selection without changing persistence.

**Unsafe changes to avoid**

- Replacing or clearing global active keys.
- Changing quote-acceptance activation behavior in this phase.
- Merging standard and emergency status semantics.
- Moving active-work UI.

**Stop conditions**

- Two projects resolve to one global snapshot.
- Selected-project state changes the domain record.
- Safe project identity is unavailable.
- Cleanup could erase unrelated work.

**Build/test requirements**

- `npm run build`
- Multi-project, stale-snapshot, quote-derived, direct-activation, and emergency
  isolation tests.

**Expected deliverable**

An active-work precedence report and a safe read-adoption plan by project.

### Work Center Phase 5: Completion, History, and Timeline Read Adoption

**Goal**

Replace render-time guesswork with tested completion and timeline projections,
without changing completion writes or declaring legacy history retired.

**Files to inspect**

- `src/pages/ContractorDashboard.jsx`
- `src/pages/CompletionSheet.jsx`
- `src/pages/CompletedJobDetails.jsx`
- `src/pages/Home.jsx`
- `src/pages/MyRequests.jsx`
- `src/utils/workCenterSelectors.js`
- `src/utils/completionShare.js`

**Safe changes allowed**

- Compare completed requests, schedules, completion records, job records, and
  timelines by stable identity.
- Detect duplicate completion and revenue candidates.
- Adopt read-only history only after parity tests.

**Unsafe changes to avoid**

- Deduplicating by customer/title.
- Recalculating stored revenue or counters in this phase.
- Removing completed arrays or registry history.
- Treating archived conversation as completed work.

**Stop conditions**

- Completion records cannot be tied to one project.
- Professional and homeowner history disagree.
- Revenue changes under the new projection.

**Build/test requirements**

- `npm run build`
- Tests for duplicate completion, completed schedule only, request only,
  completion only, archive only, and cross-role history.

**Expected deliverable**

A completion/history parity report and a go/no-go decision for Work Center
history read adoption.

### Work Center Phase 6: Shell Consolidation and Legacy Exit Criteria

**Goal**

Define the final criteria for reducing Work Center to a shell after all domain
reads and commands have independent ownership and proven parity.

**Files to inspect**

- `src/pages/ContractorDashboard.jsx`
- `src/pages/BusinessDashboard.jsx`
- `src/pages/BusinessCommandCenter.jsx`
- `src/utils/workCenter.js`
- `src/utils/workCenterSelectors.js`
- `src/utils/workflowCommands.js`
- `src/utils/accountStorage.js`

**Safe changes allowed**

- Document extraction boundaries and component candidates.
- Define telemetry, test, and fallback requirements for legacy retirement.
- Remove duplicated summary reads only after the owning projection is adopted.
- Plan UI extraction after behavior is centralized.

**Unsafe changes to avoid**

- A broad rewrite of `ContractorDashboard.jsx`.
- Moving tabs before write authority is centralized.
- Deleting legacy keys, fallbacks, backups, or adapters.
- Making Dashboard or Command Center the replacement owner.

**Stop conditions**

- Any domain still depends on page-local workflow rules.
- Compatibility adapters have become the only untested authority.
- Account cleanup ownership remains ambiguous.
- Test coverage does not include the lead-to-history path.

**Build/test requirements**

- `npm run build`
- Full critical-path integration suite.
- Manual TestFlight regression matrix for both roles, multiple projects,
  manual customers, standard work, and emergency work.

**Expected deliverable**

A human-approved extraction map, legacy exit checklist, and bounded future UI
refactor plan. No refactor is included in this phase plan.

---

## Track 4: Completion to History

### Completion Phase 1: Completion Propagation Contract

**Goal**

Define one idempotent completion result that reaches the project, homeowner
request, professional history, conversation timeline, completion record,
schedule, and reporting projection.

**Files to inspect**

- `src/pages/CompletionSheet.jsx`
- `src/pages/ProjectDetails.jsx`
- `src/pages/EmergencyCompletionActions.jsx`
- `src/components/workflows/WorkflowCompletionCloseoutCard.jsx`
- `src/pages/MyRequests.jsx`
- `src/pages/Home.jsx`
- `src/utils/workflowCommands.js`
- `src/utils/workCenterSelectors.js`
- `src/utils/projectIdentity.js`

**Safe changes allowed**

- Document side effects and identify missing propagation by project.
- Add read-only reconciliation and idempotency tests.
- Define a completion command contract using the existing command layer.
- Keep standard and emergency payload adapters explicit.

**Unsafe changes to avoid**

- Replacing current completion writes before parity tests.
- Incrementing stored counters in the new contract.
- Clearing broad active state without project scoping.
- Automatically confirming completion for the homeowner.

**Stop conditions**

- The matching homeowner request lacks safe identity.
- Multiple completion entry points produce incompatible required data.
- A retry would duplicate history, revenue, or timeline events.
- Emergency closeout cannot satisfy the standard contract without losing data.

**Build/test requirements**

- `npm run build`
- Idempotency tests and propagation matrix tests for every completion entry
  point.
- Manual professional completion followed by homeowner visibility review.

**Expected deliverable**

An approved completion propagation matrix, command payload, and rollback-free
adoption sequence.

### Completion Phase 2: Confirmation and Immutable History

**Goal**

Define the customer confirmation, follow-up, review, and final-history states so
completion becomes durable and visible to both roles.

**Files to inspect**

- `src/components/workflows/WorkflowCompletionCloseoutCard.jsx`
- `src/components/workflows/presentations/CompletionWorkflowPresentation.jsx`
- `src/pages/CompletedJobDetails.jsx`
- `src/pages/ConversationThread.jsx`
- `src/pages/MyRequests.jsx`
- `src/pages/Home.jsx`
- `src/utils/completionShare.js`
- `src/utils/language.js`

**Safe changes allowed**

- Define tested transitions from submitted to confirmed or follow-up requested.
- Require actor, timestamp, project, and completion identity.
- Derive review/share availability from the approved closeout state.
- Route all changed text through `language.js`.

**Unsafe changes to avoid**

- Treating review or share as confirmation.
- Allowing the professional to impersonate customer confirmation.
- Editing immutable completion history in place.
- Archiving or deleting the conversation automatically without product review.

**Stop conditions**

- William has not approved which event makes history final.
- Actor authentication is unavailable for customer confirmation.
- Homeowner and professional status labels do not describe the same state.

**Build/test requirements**

- `npm run build`
- Transition, authorization, duplicate-action, cross-role visibility, and
  immutable-history tests.
- Manual bilingual closeout review.

**Expected deliverable**

A signed-off closeout state machine and acceptance criteria for permanent
history.

---

## Track 5: Manual Customers

### Manual Customer Phase 1: First-Class Identity and Context

**Goal**

Define a manual customer and manual project context that can participate in
workflow records without pretending to be a registered homeowner.

**Files to inspect**

- `src/pages/ContractorDashboard.jsx`
- `src/pages/QuoteBuilder.jsx`
- `src/pages/CompletionSheet.jsx`
- `src/utils/projectIdentity.js`
- `src/utils/workflowCommands.js`
- `src/utils/workCenterSelectors.js`
- `src/utils/language.js`

**Safe changes allowed**

- Define required manual contact, source, project, consent, and identity
  metadata.
- Use existing project context/link namespaces for compatibility planning.
- Keep registered account identity separate from external contact identity.
- Add warning-only validation and pure tests.

**Unsafe changes to avoid**

- Using customer name, phone, email, title, or schedule ID as project identity.
- Creating a fake homeowner account.
- Auto-merging a later Meetro account with an external contact.
- Introducing a new major customer module.

**Stop conditions**

- Manual project identity cannot be created without mutating legacy records.
- Consent and contact requirements are undecided.
- Duplicate external contacts cannot be distinguished safely.

**Build/test requirements**

- `npm run build`
- Tests for manual context creation, duplicate names, reused contact details,
  missing consent, and later account-link candidates.

**Expected deliverable**

A human-approved manual customer/project identity contract and reconciliation
rules.

### Manual Customer Phase 2: Scheduling Parity

**Goal**

Ensure a manual customer appointment has a stable project relationship,
purpose, status, and outcome while remaining visible in current scheduling.

**Files to inspect**

- `src/pages/ContractorDashboard.jsx`
- `src/utils/workCenterSelectors.js`
- `src/utils/workflowCommands.js`
- `src/utils/workCenter.js`
- `src/pages/BusinessDashboard.jsx`

**Safe changes allowed**

- Shadow-link new manual schedules when explicit manual project identity exists.
- Report old unlinked schedules without guessing.
- Preserve all current schedule writes and visible records.

**Unsafe changes to avoid**

- Hiding unlinked manual appointments.
- Linking by customer or title.
- Converting manual schedules into homeowner requests.
- Changing stored schedule status values.

**Stop conditions**

- Manual project ID is absent.
- Schedule count or order changes.
- Existing manual records would require destructive backfill.

**Build/test requirements**

- `npm run build`
- Schedule-link, missing-identity, duplicate-contact, status, and date-boundary
  tests.

**Expected deliverable**

A schedule-link coverage report for manual customers and safe prospective
linking criteria.

### Manual Customer Phase 3: Relationship Timeline

**Goal**

Give manual projects a durable relationship timeline without claiming that an
external customer has an authenticated Meetro conversation.

**Files to inspect**

- `src/pages/ContractorDashboard.jsx`
- `src/pages/ConversationThread.jsx`
- `src/pages/MessagesInbox.jsx`
- `src/utils/workflowCommands.js`
- `src/utils/workCenterSelectors.js`
- `src/utils/language.js`

**Safe changes allowed**

- Append project events with actor/source evidence for professional-recorded
  interactions.
- Distinguish internal project timeline from authenticated two-party chat.
- Plan invitation and account-link events without implementing account merging.

**Unsafe changes to avoid**

- Creating synthetic customer messages.
- Marking professional-recorded decisions as customer-authenticated.
- Exposing internal notes to a later customer account automatically.
- Adding a parallel conversation system.

**Stop conditions**

- Product language does not clearly distinguish chat from recorded contact.
- Actor/source evidence is unavailable.
- Internal and customer-visible events cannot be separated.

**Build/test requirements**

- `npm run build`
- Visibility, actor/source, invitation, account-link candidate, and internal
  note tests.
- Manual copy review in both languages.

**Expected deliverable**

A manual-project timeline visibility matrix and approved event vocabulary.

### Manual Customer Phase 4: Quote, Work, and Completion Parity

**Goal**

Make manual projects eligible for the same controlled appointment, quote,
active-work, completion, and history lifecycle, with explicit evidence for
external decisions.

**Files to inspect**

- `src/pages/QuoteBuilder.jsx`
- `src/pages/ContractorDashboard.jsx`
- `src/pages/CompletionSheet.jsx`
- `src/pages/CompletedJobDetails.jsx`
- `src/utils/workflowCommands.js`
- `src/utils/workCenterSelectors.js`
- `src/utils/projectIdentity.js`

**Safe changes allowed**

- Use existing shadow project links for quote, schedule, work, timeline, and
  completion planning.
- Require source, actor, timestamp, and evidence for manual quote decisions.
- Apply the approved appointment-before-quote policy to manual standard work.
- Reconcile completion and history by manual project ID.

**Unsafe changes to avoid**

- Treating copied invite text as account connection.
- Converting acceptance directly to active work.
- Recording unauthenticated decisions without an evidence label.
- Bypassing closeout because the customer is external.

**Stop conditions**

- There is no approved evidence standard for external decisions.
- A manual project cannot be traced across appointment, quote, and completion.
- The workflow would create a different definition of completion.

**Build/test requirements**

- `npm run build`
- End-to-end manual project tests from appointment through immutable history,
  including revise, decline, no response, duplicate completion, and later
  account-link candidate.

**Expected deliverable**

A parity report proving where manual customers match the standard workflow and
where authenticated-account capabilities remain intentionally unavailable.

### Manual Customer Phase 5: Invitation, Account Link, and Acceptance

**Goal**

Define the safe, human-reviewed conversion of an external contact into a
registered participant without merging the wrong person or exposing prior
history improperly.

**Files to inspect**

- `src/pages/ContractorDashboard.jsx`
- `src/pages/MessagesInbox.jsx`
- `src/pages/ConversationThread.jsx`
- `src/pages/Profile.jsx`
- `src/utils/session.js`
- `src/utils/projectIdentity.js`
- `src/utils/workflowCommands.js`
- `src/utils/language.js`

**Safe changes allowed**

- Define invitation state, signed acceptance requirements, and explicit project
  link confirmation.
- Preserve the external-contact record after linking for audit provenance.
- Define which prior events become visible after acceptance.
- Add role, consent, duplicate-account, and revocation tests.

**Unsafe changes to avoid**

- Auto-linking by email or phone alone.
- Auto-importing all professional notes into homeowner conversation.
- Changing account role or mode during project linking.
- Deleting the manual identity after conversion.

**Stop conditions**

- Identity proof and consent are not backend-enforced.
- More than one account could match.
- William has not approved historical visibility rules.
- Linking would violate homeowner/professional separation.

**Build/test requirements**

- `npm run build`
- Invitation expiry, wrong-account, duplicate-account, acceptance, revocation,
  role separation, and history-visibility tests.
- Manual security and privacy review.

**Expected deliverable**

A backend-ready invitation and account-link specification. No automatic
conversion should ship from client-only state.

---

## Ordered Phase Plan

The safest global order is:

1. Lead Phase 1: Source and Identity Reconciliation
2. Conversation Phase 1: Event and Identity Contract
3. Work Center Phase 1: Ownership and Read Contract Freeze
4. Manual Customer Phase 1: First-Class Identity and Context
5. Completion Phase 1: Completion Propagation Contract
6. Lead Phase 2: Information and Appointment Gate Definition
7. Conversation Phase 2: Relationship Timeline Reconciliation
8. Work Center Phase 2: Schedule Read Adoption
9. Work Center Phase 3: Quote Read Adoption
10. Manual Customer Phase 2: Scheduling Parity
11. Conversation Phase 3: Non-Blocking Event Parity
12. Work Center Phase 4: Active Work Read Adoption
13. Completion Phase 2: Confirmation and Immutable History
14. Manual Customer Phase 3: Relationship Timeline
15. Lead Phase 3: Lead Handoff and Ownership Adoption
16. Work Center Phase 5: Completion, History, and Timeline Read Adoption
17. Manual Customer Phase 4: Quote, Work, and Completion Parity
18. Conversation Phase 4: Read Adoption and Persistence Decision
19. Manual Customer Phase 5: Invitation, Account Link, and Acceptance
20. Work Center Phase 6: Shell Consolidation and Legacy Exit Criteria

This order keeps identity and read reconciliation ahead of authority changes.
It also keeps manual customers in the same workflow architecture instead of
adding them as an afterthought.

## Highest-Risk Files

1. `src/pages/ContractorDashboard.jsx`  
   It owns schedule, quote, active work, completion navigation, history,
   materials, manual customers, and cross-module state.

2. `src/pages/ConversationThread.jsx`  
   It combines transport, polling, local persistence, actor inference,
   scheduling, workflow rendering, archive, and job records.

3. `src/pages/CompletionSheet.jsx`  
   It updates several histories, counters, schedules, conversation records, and
   active-state keys during one closeout.

4. `src/pages/ProjectDetails.jsx`  
   It participates in lead handoff, activation, request status, and direct
   completion.

5. `src/pages/MyRequests.jsx`  
   Homeowner quote decisions coordinate multiple client-side stores.

6. `src/pages/QuoteBuilder.jsx`  
   It writes quote copies and local conversation events and now participates in
   shadow project linking.

7. `src/pages/MessagesInbox.jsx`  
   It reconstructs conversations from registry, storage scans, and emergency
   records.

8. `src/pages/BusinessDashboard.jsx`  
   It independently defines lead eligibility and operational metrics and writes
   navigation intent through storage.

9. `src/pages/BusinessCommandCenter.jsx`  
   It presents aliases as capabilities and can blur module ownership.

10. `src/utils/workCenter.js` and `src/utils/accountStorage.js`  
    They expose broad legacy storage coupling and cleanup risk.

## First Safe Phase to Run Tomorrow

Run **Lead Phase 1: Source and Identity Reconciliation** first.

It is the safest next phase because it can be implemented as read-only
normalization and reporting, uses the existing identity foundation, changes no
workflow behavior, and answers the unresolved product question of what a lead
actually is before appointment or quote enforcement begins.

The phase should stop after producing:

- source counts;
- safely matched records;
- unresolved records;
- conflicting statuses;
- duplicate identities;
- proposed canonical lead fields;
- tests for the reconciliation rules.

Do not adopt the selector in UI during the same phase.

## What William Must Manually Review

1. Which record is the canonical standard lead: post, quote request, project
   request, or a normalized combination.
2. Which appointment-before-quote exceptions are valid, including remote
   estimates, repeat work, emergency work, and customer-supplied measurements.
3. Whether quote acceptance means scheduled next action or allows immediate
   work activation.
4. Which completion event makes history final and whether homeowner
   confirmation is mandatory.
5. Which manual decision evidence is acceptable for an external customer.
6. Which manual project events become visible after a customer joins Meetro.
7. Whether Conversation is the source event stream or a projection of project
   events.
8. Exact Dashboard and Command Center capability labels and destinations.
9. Standard versus emergency status semantics.
10. The point at which legacy reads and writes may be retired.

## What Should Not Be Automated

- Destructive migration or deletion of legacy storage.
- Project matching by title, customer name, location, description, email, or
  phone.
- Merging external contacts with registered accounts.
- Marking external quote decisions as authenticated.
- Customer completion confirmation.
- Conversion of accepted quotes directly into active work.
- Archiving or finalizing history based only on UI state.
- Moving Work Center tabs or splitting the large page before behavior is
  centralized.
- Product decisions about workflow exceptions, actor authority, or historical
  visibility.
- Translation approval for workflow, legal, consent, or customer-facing status
  language.

## Final Recommendation

Tomorrow's work should remain narrow: reconcile lead sources and identities,
write tests for that read model, and stop before UI adoption. In parallel,
William should approve the canonical lead definition and appointment exception
policy. Those decisions unlock the later phases without forcing Meetro into
another client-side source of truth.
