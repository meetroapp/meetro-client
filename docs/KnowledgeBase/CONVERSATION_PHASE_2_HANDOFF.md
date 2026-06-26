# Conversation Phase 2 Handoff

## Status

Completed as read-only timeline reconciliation. No UI, rendering, persistence,
polling, archive behavior, route, workflow command, or storage key was changed.

## Files Changed

- `src/utils/conversationTimelineSelectors.js`
- `tests/conversationTimelineReconciliation.test.js`
- `docs/KnowledgeBase/CONVERSATION_PHASE_2_HANDOFF.md`

## Selectors and Reports Added

- Read local conversation-message records.
- Read local workflow-card records as a separate source family.
- Normalize caller-supplied backend-message snapshots.
- Read global and per-request legacy timeline events.
- Read per-conversation job records.
- Read append-only shadow timeline events.
- Apply explicit, non-conflicting conversation/project links.
- Report source counts, duplicate groups, unsafe events, identity warnings,
  project coverage, link conflicts, and shadow coverage.

## Reconciliation Rules

- A validated canonical `id` is the preferred reconciliation key.
- Legacy `eventId` remains an accepted immutable compatibility key.
- Persisted backend message IDs are namespaced as immutable backend event IDs.
- A stable entity ID plus event type is the only approved fallback pair.
- Generic local `id`, text, title, customer name, and display time are never
  used for deduplication.
- `conversationId` never becomes `projectId` unless an explicit
  `linkConversationToProject` record exists.
- Conflicting conversation links are reported without choosing a project.
- Output contains metadata only and excludes message or workflow-card content.

## Tests Added

- All six source families and read-only storage behavior.
- Immutable backend event-ID reconciliation.
- Validated canonical event-ID reconciliation.
- Rejection of matching generic legacy IDs as immutable identities.
- Stable entity/event-pair reconciliation.
- Prohibition on text/title/customer/time deduplication.
- Explicit conversation-link requirement for project identity.
- Conflicting conversation-link reporting.
- Shadow coverage and content-redaction behavior.

## Build and Test Result

- `node --test tests/conversationTimelineReconciliation.test.js`: 9 passed,
  0 failed.
- `npm run build`: passed.
- Existing Vite large-chunk warning remains; this phase did not change bundling.

## Main Reconciliation Findings

1. Backend messages are not held in a separate client repository; current
   backend snapshots must be supplied to the selector by diagnostics or tests.
2. Local conversation arrays mix ordinary messages and workflow cards.
3. Cached backend messages can be reconciled safely when `backendId` survives.
4. Legacy timelines, job records, and shadow events overlap only when they
   preserve an immutable event ID or stable entity/event pair.
5. Many legacy records remain unreconcilable because they have only generic
   IDs, display timestamps, or no stable entity reference.
6. Explicit conversation/project links can safely add project context, but
   conflicting links must remain unresolved.
7. Canonical events now reconcile by canonical `id`; legacy records with only
   a generic local `id` remain intentionally unreconcilable.

## Unsupported and Unsafe Cases

- Deduplication by message text, title, customer, location, or display time.
- Promotion of conversation ID to project ID without an explicit link.
- Selection between conflicting project links.
- Treating a generic local ID as globally immutable.
- Treating source-local workflow type labels as equivalent without an approved
  canonical event-type mapping.
- Reconstructing missing actor identity.
- Determining backend/local acknowledgement when `backendId` was not retained.
- Reordering events that lack valid occurrence timestamps or server sequence.

## Recommended Conversation Phase 3

Define and audit canonical event writers one event family at a time, beginning
with events that already carry authoritative project, Conversation, actor,
timestamp, and immutable event identity. Keep all current rendering and writes
authoritative until shadow comparison proves parity. MESSAGE_CREATED,
WORKFLOW_QUOTE_SENT, appointment, and completion writers must each be evaluated
against the canonical event contract and identity provenance rules before any
writer migration.
