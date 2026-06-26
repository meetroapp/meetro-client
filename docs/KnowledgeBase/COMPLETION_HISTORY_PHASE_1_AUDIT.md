# Completion to History Phase 1 Audit

## Executive Summary

Meetro does not currently have one authoritative Completion to History transition. A completed job is represented by several independently written records: `completedProjects`, completed schedule rows, completed homeowner requests, archived conversation entries, emergency completion records, job records, timeline cards, and reporting counters.

`CompletionSheet.jsx` is the broadest closeout writer, but `ProjectDetails.jsx` can mark work complete through a separate path. These paths do not produce the same record shape or side effects. Neither path establishes a canonical project identity, completion identity, actor identity, authoritative timestamp, or immutable completion event shared by every history projection.

History also has no single canonical owner. Contractor Work Center, homeowner history, conversation saved history, Project Folder/job records, and dashboard metrics each reconstruct a different meaning of history. Work Center should consume completion history as a projection; it should not own completion persistence or independently define history.

The safest next step is read-only reconciliation and an idempotent completion contract. Writer replacement, storage migration, and UI adoption should wait until the product defines the event that makes completion final, including homeowner confirmation and emergency exceptions.

## Scope and Evidence

This audit reviewed:

- `src/pages/CompletionSheet.jsx`
- `src/pages/ProjectDetails.jsx`
- `src/pages/ContractorDashboard.jsx`
- `src/pages/CompletedJobDetails.jsx`
- `src/pages/BusinessDashboard.jsx`
- `src/utils/workCenterSelectors.js`
- `src/utils/workCenter.js`
- `src/utils/workflowCommands.js`
- Completion, conversation, emergency, project, and history references across `src`
- Available Knowledge Base authority, workflow, identity, and stabilization documents

The repository does not contain every historical Knowledge Base filename referenced by earlier planning prompts. Target behavior below is based on the available canonical envelope, authority map, workflow data audit, identity specifications, and stabilization plan.

## Direct Answers

### 1. What currently defines a completed job?

There is no single definition. A job is treated as completed when one or more of these conditions is true:

- A record exists in `completedProjects`.
- A `meetro_business_schedule` row has status `Completed`.
- A `homeownerRequests` row has status `completed`.
- An emergency record has status `completed` and may also have `savedToHistory`.
- A conversation registry entry has `saved_to_history: true`.
- A `meetro_job_record_*` record exists.
- Stored counters such as `completedJobsCount` were incremented.

`CompletionSheet.saveCompletion()` produces the largest set of these effects. `ProjectDetails` also creates a completion directly, with fewer fields and fewer linked effects.

### 2. Where is completion stored?

Completion is distributed across:

- `completedProjects`
- `lastCompletedProject`
- `completedJobPhotos`
- Scalar `completedJob*` display keys
- `meetro_business_schedule`
- `homeownerRequests`
- `meetro_emergency_requests`
- `meetro_conversation_cards_*`
- `meetro_conversations_registry`
- Active-work and emergency status keys
- `completedJobsCount`
- `totalJobRevenue`

The broad storage surface makes completion non-atomic and retry-sensitive.

### 3. Where is history stored?

History is not one store. It is reconstructed from:

- Completed project records
- Completed schedules
- Completed homeowner requests
- Saved or archived conversations
- Emergency archive fields
- `meetro_job_record_*` Project Folder records
- Workflow and project timeline stores
- Dashboard counters

These sources represent different concepts: completed work, conversation archive state, operating records, event history, and reporting.

### 4. Does history have canonical ownership?

No. Current code has multiple writers and multiple readers, with no shared immutable completion event or project aggregate tying them together.

The target owner should be the canonical project workflow/event stream. Completion owns the closeout transition. History, Work Center, Conversation, Project Folder, and Dashboard consume projections from that transition.

### 5. Does Work Center own history?

No. The Knowledge Base explicitly positions Work Center as a workflow shell and projection consumer. Its prohibited responsibilities include completion and timeline persistence.

Current implementation partially violates that boundary because `ContractorDashboard.jsx` assembles its own completed-work collection and presents a separate records tab as permanent operating history. This makes the dashboard implementation a competing history definition even when it does not directly perform the main completion write.

### 6. Does Project Folder duplicate history?

Yes, conceptually and structurally. Project Folder/job records preserve operating details by conversation, while completed-project records preserve closeout details by inconsistent request, schedule, or generated IDs. Both are presented as durable history, but they are not guaranteed to identify the same project or completion.

Project Folder should retain project documentation and operating records while projecting the same canonical project timeline and completion outcome. It should not create an independent definition of whether work is historically complete.

### 7. What is required for Completion to History alignment?

Alignment requires:

1. One stable `projectId` propagated through request, conversation, schedule, work, completion, and history.
2. One stable `completionId` and one canonical completion event ID.
3. Explicit `actor`, `actorRole`, and authoritative `recordedAt`.
4. A documented distinction between completion submitted and completion confirmed.
5. One idempotent completion command or aggregate transition.
6. Projection updates for Work Center, Conversation, Project Folder, homeowner history, and reporting.
7. Derived counts and revenue instead of independently incremented counters.
8. Explicit adapters for emergency and manual-customer workflows.
9. Reconciliation coverage before any legacy writer is removed.

## Current Flow

### Primary Completion Sheet Path

`CompletionSheet.saveCompletion()`:

1. Builds a new record with a timestamp-derived ID.
2. Prepends it to `completedProjects`.
3. Writes `lastCompletedProject`, photos, and scalar display keys.
4. Increments completed-job and revenue counters.
5. Marks a schedule row completed when a schedule ID is available.
6. Appends a `workflow_completion_closeout` conversation card.
7. Marks the conversation saved to history.
8. Clears active-work state.
9. Applies additional emergency completion/archive effects when applicable.
10. Opens the Work Center completed tab.

The closeout card begins at `awaiting_customer_confirmation`, but the surrounding records and counters already treat the job as completed history.

### Project Details Path

`ProjectDetails.jsx` can directly mark a homeowner project completed:

1. Updates `homeownerRequests`.
2. Creates a smaller `completedProjects` record.
3. Increments reporting counters.
4. Updates selected-project state.
5. Sets review and last-completed-project keys.

This path bypasses the Completion Sheet closeout payload, conversation card, schedule handling, emergency handling, and active-work cleanup.

### History Read Paths

`getCompletedWorkItems()` and `ContractorDashboard.jsx` combine completed schedules, `completedProjects`, and completed homeowner requests. Their normalization is not backed by a canonical aggregate.

`CompletedJobDetails.jsx` reads `lastCompletedProject` plus scalar fallback keys, so the displayed report can combine stale values from different completion attempts.

`BusinessDashboard.jsx` reads stored counters rather than deriving metrics from authoritative completion records.

Conversation history uses `saved_to_history`, which represents archive/index state and is not proof of confirmed completion.

Project Folder records use `meetro_job_record_*` and are described as permanent operating history, but are keyed around conversation identity and are not canonically linked to completion records.

## Target Flow

The Universal Workflow Engine target should be:

1. Active project has authoritative project, conversation, schedule, work, and participant identity.
2. Completion submits a closeout through one idempotent transition.
3. The transition persists one canonical `WORKFLOW_COMPLETION_SUBMITTED` event.
4. The project enters an explicit awaiting-confirmation or follow-up state.
5. Customer confirmation, an approved exception, or another documented authority produces `WORKFLOW_COMPLETION_CONFIRMED`.
6. History becomes an immutable projection of the project event stream.
7. Work Center shows completed work from that projection.
8. Conversation shows the relationship timeline from the same events.
9. Project Folder shows documentation and operating records linked to the same project and completion.
10. Homeowner history and Dashboard reporting derive from the same confirmed outcome.

This flow must preserve professional and homeowner views while preventing either view from becoming an independent source of truth.

## Ownership Gaps

| Severity | File | Current behavior | Knowledge Base conflict | Correct owner | Recommended correction |
| --- | --- | --- | --- | --- | --- |
| Critical | `src/pages/CompletionSheet.jsx` | Performs completion, schedule, conversation archive, emergency archive, reporting, and navigation effects in one sequential browser-storage flow. | Completion should own one transition; projections should not be independently persisted without shared identity and idempotency. | Completion command/project aggregate | Specify one idempotent closeout contract and reconcile every existing side effect before adoption. |
| Critical | `src/pages/ProjectDetails.jsx` | Directly marks work completed and increments history/reporting state through a second writer. | Competing completion authority creates schema and behavior drift. | Completion command/project aggregate | Route future completion through the same contract after parity is proven; retain the legacy path until then. |
| Critical | `src/pages/CompletionSheet.jsx` | Creates completion without canonical `projectId`, actor, actor role, authoritative `recordedAt`, or shared event ID. | Canonical envelope and identity policy require authoritative identity and provenance. | Project and workflow event authority | Require safe project/completion identity before canonical migration; never infer from title or customer. |
| High | `src/pages/CompletionSheet.jsx`, `src/pages/ProjectDetails.jsx` | Increment counters and revenue directly. | Reporting must be derived; retries can inflate totals. | Reporting projection | Reconcile records against counters, then derive metrics from canonical confirmed completions. |
| High | `src/pages/ContractorDashboard.jsx` | Rebuilds completed history inline from three stores and invents a current timestamp when one is absent. | Work Center is a consumer, and missing historical timestamps must not be silently fabricated. | History projection consumed by Work Center | Use one read contract; expose missing timestamp warnings instead of generating dates. |
| High | `src/utils/workCenterSelectors.js` | Combines incompatible completed records with partial request-ID deduplication. | Cross-source reconciliation requires stable project/event identity and must not collapse unrelated records. | History reconciliation selector | Add a completion/history reconciliation report grouped by authoritative identity, with conflicts and unresolved records. |
| High | `src/pages/CompletionSheet.jsx` | Marks conversation saved to history during submission while the closeout card awaits customer confirmation. | Conversation archive state and confirmed project history are distinct workflow states. | Conversation index plus project timeline projection | Separate archive/saved state from completion-submitted and completion-confirmed state. |
| High | `src/pages/ContractorDashboard.jsx` | Presents completed work and job records as separate forms of permanent history. | Dashboard/Work Center cannot establish competing workflow authority. | Project history projection and Project Folder projection | Define each projection's purpose and link both to the same project aggregate. |
| Medium | `src/pages/CompletedJobDetails.jsx` | Uses `lastCompletedProject` and scalar fallbacks as the detail source. | A durable Project Folder/history view should resolve one canonical project/completion record. | Project history projection | Resolve by stable project/completion ID and treat scalar keys as labeled legacy fallbacks only. |
| Medium | `src/pages/BusinessDashboard.jsx` | Reads stored counts and revenue, including a nonzero default count. | Dashboard is a projection and must not imply authoritative completion totals. | Reporting projection | Derive metrics from reconciled confirmed completion data; remove legacy fallback only after parity. |
| High | Emergency completion paths | Couple completion, archive, review, dispatch, active-state cleanup, and history flags. | Emergency is a workflow adapter, not a separate uncontrolled history authority. | Emergency adapter into Completion | Define explicit emergency completion prerequisites and exception states before writer consolidation. |

## Ownership Model

| Concern | Target owner | Consumers |
| --- | --- | --- |
| Completion submission | Completion workflow/project aggregate | Conversation, Work Center, Project Folder, homeowner history |
| Completion confirmation | Approved customer or exception workflow authority | History and reporting projections |
| Relationship timeline | Canonical project/conversation event stream | Conversation |
| Completed-work list | History projection | Work Center |
| Operating documents and job records | Project Folder | Work Center and project details |
| Conversation archive state | Conversation index | Inbox and Conversation |
| Counts and revenue | Reporting projection | Dashboard |

## Migration Risks

### Critical Risks

- Retrying completion can create duplicate records, cards, revenue, and counters.
- Multiple writers can complete the same project with incompatible effects.
- Records cannot be reliably joined without canonical project and completion IDs.
- Browser-storage writes are sequential and can leave partial completion state.

### High Risks

- Completion submission is currently treated as both awaiting confirmation and historical completion.
- Conversation archive flags can be mistaken for completed-project authority.
- Emergency completion has extra side effects that a generic migration could lose.
- Homeowner and professional records can disagree about project status.
- Client timestamps and timestamp-based IDs do not provide authoritative event provenance.

### Medium Risks

- Completed-job details can display stale scalar fallback data.
- Inline dashboard assembly differs from selector-based assembly.
- Missing dates are silently replaced with the current date in some reads.
- Index-based rendering and hard-coded pagination can hide reconciliation defects during manual review.

## Required Alignment Work

### Safe Read-Only Foundation

1. Inventory every completion writer and side effect as a machine-readable contract.
2. Add completion-to-history reconciliation selectors without changing rendering.
3. Compare completed projects, schedules, homeowner requests, conversations, emergency records, job records, timeline events, and counters.
4. Report identity gaps, duplicate candidates, state conflicts, and reporting drift.
5. Add tests for retries, cross-role disagreement, missing identity, and emergency records.

### Product Decisions Required Before Writer Migration

- What exact event makes a job final history: submission, customer confirmation, payment, or an approved exception?
- Who may confirm completion for manual customers and emergency work?
- Can a conversation be archived before completion is confirmed?
- Which record controls revenue recognition?
- Which Project Folder artifacts are mandatory before final history?

### Unsafe Work to Avoid

- Replacing either completion writer before side-effect parity is demonstrated.
- Deleting legacy keys or migrating records destructively.
- Treating `saved_to_history` as confirmed completion.
- Deduplicating by title, customer, display date, or generated current time.
- Auto-confirming homeowner completion.
- Consolidating emergency completion without an explicit adapter.

## Phase 1 Conclusion

Completion to History is **BLOCKED for writer migration** but **READY for read-only reconciliation**.

The next phase should create a pure completion/history reconciliation layer and focused tests. It should measure which legacy records represent the same project, distinguish submitted from confirmed completion, expose projection disagreement, and quantify counter drift. It must not select a new authority, update UI reads, or alter existing storage.
