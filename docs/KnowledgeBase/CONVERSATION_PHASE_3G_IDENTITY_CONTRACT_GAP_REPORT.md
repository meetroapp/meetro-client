# Meetro Conversation Phase 3G - Identity and Contract Gap Report

## Executive Decision

No workflow writer is ready to move to `workflowEventFactory` authority.

The current utilities successfully normalize and compare legacy data, but they
do not yet define one strict canonical write envelope. Read compatibility and
write authority must remain separate:

- read normalization may preserve incomplete records and report warnings
- canonical creation must reject or explicitly fail incomplete authority data
- compatibility IDs must never be silently promoted to canonical IDs

The highest-priority blocker is the disagreement between
`workflowEventFactory.js` and `workflowEventContract.js`. Identity improvements
inside individual writers will not be sufficient until those files describe
the same authoritative event.

## Blocker Classification

### MUST FIX BEFORE MIGRATION

- freeze one canonical event envelope
- require an immutable canonical `eventId`
- define retry and duplicate behavior around that `eventId`
- require an explicit canonical `projectId` for migrated workflow transitions
- require explicit `conversationId` for conversation-projected events
- require stable `actorId` and approved `actorRole`
- define and preserve separate `occurredAt` and `recordedAt` values
- make the factory output align with the contract field names
- add strict canonical-write validation
- keep `UNKNOWN_WORKFLOW_EVENT` and identity fallbacks out of authoritative writes
- ensure all projections of one transition carry the same canonical event ID

### SHOULD FIX BEFORE MIGRATION

- centralize the supported event type registry
- require and validate `payloadVersion`
- retain `requestId` separately from `projectId`
- define source values and legacy metadata shape
- document revised-quote semantics under `WORKFLOW_QUOTE_SENT`
- collect shadow coverage for actor, project, and conversation identity
- define backend uniqueness enforcement for canonical event IDs

### SAFE TO DEFER

- global `sequence` assignment until backend ordering authority exists
- removal of legacy aliases from read normalizers
- removal of legacy localStorage records
- UI adoption of canonical events
- migration of historical records
- richer optional correlation metadata beyond the first supported writers

## 1. Current Event ID Behavior

The repository currently has several event identity models:

- most UI and localStorage records use generic `id`
- many IDs are composed with `Date.now()`
- backend messages have a separate backend message ID
- the workflow-event mirror does not share a declared event ID with its source
  message
- reconciliation prefers explicit `eventId`, then approved entity/event pairs
- `workflowEventContract` accepts generic `id` but warns that uniqueness is not
  proven
- `workflowEventFactory` accepts `id` and otherwise creates a deterministic
  content hash
- the quote-sent shadow comparison deliberately reuses the legacy card ID

The current quote card ID is sufficient for diagnostic correlation, but not
for canonical authority. Timestamp IDs can collide, do not define retry
behavior, and are presentation IDs rather than governed event IDs. A content
hash is also unsafe as authoritative identity because mutable payload changes
can change the ID and unrelated equal payloads can collapse.

## 2. Required Event ID Policy

**Classification: MUST FIX BEFORE MIGRATION**

Canonical policy:

1. Every authoritative event has a non-empty `eventId`.
2. `eventId` is opaque, immutable, and collision-resistant.
3. It is generated once at the workflow command boundary.
4. Retries of the same transition reuse the same `eventId`.
5. A distinct transition, including a later revised quote send, receives a new
   `eventId`.
6. Every projection of the transition carries the same `eventId`, including
   conversation card, project timeline, backend event, and reconciliation
   record.
7. Backend persistence enforces uniqueness or idempotency by `eventId`.
8. Legacy record IDs remain in `payload` or `legacy`; they do not become
   canonical automatically.
9. Factory fallback IDs remain diagnostic-only. An authoritative factory call
   without a supplied or approved generated `eventId` must fail validation.

The approved ID generator may be client- or backend-based, but the choice must
support offline/local projection and retry correlation. `Date.now()`, display
text, customer name, title, and content-only hashes are not approved
authoritative generators.

## 3. Current `projectId` Behavior

`projectIdentity.js` is a compatibility layer. It resolves identity in this
order:

1. `projectId`
2. `requestId`
3. `jobId`
4. `quoteRequestId`
5. `conversationId`
6. `emergencyId`
7. `postId`
8. generic `id`

That ordering is appropriate for read reconciliation, where incomplete legacy
records must remain visible. It is not a canonical write policy.

Current consequences:

- quote sent commonly promotes `requestId` into the factory `projectId`
- ConversationThread often falls back from selected request ID to
  `conversationId`
- generic IDs can represent messages, schedules, quotes, jobs, or emergencies
- title matching still exists in older read paths, although the newer
  compatibility utilities correctly warn instead of guessing

## 4. Required `projectId` Policy

**Classification: MUST FIX BEFORE MIGRATION**

Canonical policy:

1. `projectId` means only the backend-issued canonical project aggregate ID.
2. `requestId`, `jobId`, `quoteRequestId`, `conversationId`, `emergencyId`,
   and generic `id` remain separate identities.
3. A compatibility-resolved ID may be used for shadow comparison but must not
   pass canonical-write validation as `projectId`.
4. No writer may infer project identity from title, customer name,
   conversation ID, display text, or timestamp proximity.
5. A migrated workflow transition without explicit canonical `projectId` must
   skip canonical persistence and report a structured validation error.
6. If some event types legitimately occur before a project aggregate exists,
   the contract must approve an explicit scope exception. No such exception
   exists today.

For quote sent, `requestId` must remain populated as `requestId`. Migration is
blocked until the writer also has an explicit canonical `projectId`, or an
approved contract exception says that quote events are request-scoped.

## 5. Current `conversationId` Behavior

Conversation identity is available inconsistently:

- QuoteBuilder resolves `quoteConversationId` from several request/context
  fields and uses it in the localStorage key.
- The persisted `workflowQuoteCard` does not contain `conversationId`.
- The Phase 3E factory shadow does contain `conversationId`.
- ConversationThread knows its route/context conversation ID, but many message
  payloads omit it.
- `workflowEventContract` reads only explicit `conversationId`.
- reconciliation reports missing conversation identity rather than inferring
  it from another field.

The result is a common mismatch where storage location knows the conversation
but the event record cannot identify its own conversation after extraction.

## 6. Required `conversationId` Policy

**Classification: MUST FIX BEFORE MIGRATION for conversation-projected events**

Canonical policy:

1. `conversationId` is the explicit identity of the relationship timeline.
2. It must be present on `MESSAGE_CREATED` and every event projected into a
   conversation.
3. It must not be inferred from `projectId`, `requestId`, storage key, route
   state, or current selection after creation.
4. It is conditionally optional only for event types that are explicitly
   declared non-conversational by the contract.
5. The factory and write validator must apply the requirement by event type.
6. Conversation projections and backend event mirrors must carry the same
   `conversationId`.

For quote sent, canonical migration requires the explicit
`quoteConversationId` to be included in the authoritative event. The legacy
storage key may remain unchanged during incremental adoption.

## 7. Current Actor and `actorRole` Behavior

Actor data currently mixes identity and presentation:

- legacy cards use `sender`, `role`, and `senderRole`
- QuoteBuilder uses the business display name in `sender`
- the shadow factory uses `localStorage.userId` as `actor`
- missing actor falls back to `"unknown"`
- ConversationThread maps backend actor role relative to the current viewer
- system messages have a role but usually no stable system actor ID
- the contract uses `actorId`, while the factory uses `actor`

Viewer-relative role inference is suitable for display but cannot be immutable
event history.

## 8. Required Actor and `actorRole` Policy

**Classification: MUST FIX BEFORE MIGRATION**

Canonical policy:

1. The identity field is named `actorId`.
2. `actorId` is a stable account, service, or approved system principal ID.
3. Display names remain payload data and never substitute for `actorId`.
4. `actorRole` uses an approved stable vocabulary, initially:
   `homeowner`, `business`, or `system`.
5. `actorRole` is captured at occurrence time and is not recalculated relative
   to the current viewer.
6. System-generated events use an approved stable system actor ID.
7. `"unknown"` is permitted only in read reconciliation. It fails
   authoritative-write validation.
8. A writer without stable actor identity remains legacy-authoritative.

Quote sent requires both the authenticated business user ID and
`actorRole: "business"`. The current shadow role is adequate; user ID coverage
has not yet been proven.

## 9. Current `recordedAt` Behavior

Timestamp behavior is currently tolerant:

- legacy writers commonly use `createdAt`
- the factory accepts `recordedAt`, then falls back through payload
  `recordedAt`, `occurredAt`, or `createdAt`
- the contract treats `occurredAt` and `recordedAt` as separate fields
- reconciliation collapses them into one display/sort `recordedAt`
- missing or invalid values become warnings
- localized `time` strings exist for display and are not safe ordering fields

In Phase 3E, both event occurrence and diagnostic recording are represented by
the quote card's `createdAt`.

## 10. Required `recordedAt` Policy

**Classification: MUST FIX BEFORE MIGRATION**

Canonical policy:

1. `occurredAt` is when the workflow transition happened.
2. `recordedAt` is when the authoritative event was durably accepted by its
   persistence authority.
3. Both use valid UTC ISO-8601 timestamps.
4. `createdAt`, display `time`, and browser-local formatted strings do not
   silently satisfy both fields.
5. The command/factory boundary must receive `occurredAt`.
6. The persistence boundary supplies or confirms `recordedAt`.
7. Read reconciliation may fall back from one timestamp to another for
   ordering, but authoritative validation must not hide the distinction.
8. Clock and retry policy must preserve the original `occurredAt` across
   retries.

If client-only persistence remains temporarily authoritative, it must
explicitly assign both values and document that they can be equal. The equality
must be deliberate, not produced by fallback.

## 11. Current Factory vs Contract Schema Differences

| Concern | `workflowEventFactory.js` | `workflowEventContract.js` | Required resolution |
| --- | --- | --- | --- |
| Event identity | `id` | `eventId` | Use `eventId` for authority; retain `id` only as a read compatibility alias. |
| Actor identity | `actor` | `actorId` | Use `actorId`; presentation actor belongs in payload if needed. |
| Request identity | Not returned | `requestId` | Add separate `requestId`; never store it as `projectId`. |
| Occurrence time | Not returned | `occurredAt` | Add and require it for canonical writes. |
| Persistence time | `recordedAt` with fallbacks | `recordedAt` | Preserve separately and validate explicitly. |
| Payload version | Not returned | `payloadVersion` | Add a validated positive contract version. |
| Sequence | Not returned | `sequence` | Keep nullable until backend ordering exists. |
| Project identity | Any supplied string | Compatibility-normalized identity | Add strict explicit-project validation for writes. |
| Conversation identity | Always marked missing when absent | Present but not conditionally validated | Define requirements by event type. |
| Unsupported type | Normalized to `UNKNOWN_WORKFLOW_EVENT` | Tolerant raw normalization | Unknown types must fail canonical writes but remain readable. |
| Missing values | `"unknown"`, empty values, and legacy warnings | Empty values and warnings | Keep tolerance for reads; add a strict authority result. |
| Legacy metadata | Returned as `legacy` | Not part of returned contract envelope | Define it as optional compatibility metadata or keep it outside the canonical envelope. |
| Event types | Factory owns a type constant set | Contract does not own the same set | Establish one shared supported-type authority. |
| Validation result | Always returns an event | Normalizer always returns an event | Add explicit canonical validity/errors without weakening read normalization. |

The Conversation reconciliation shape is still useful:

```js
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

It should remain a read model. It should not define the persisted write
contract.

## 12. Required `workflowEventFactory` Changes Before Migration

No changes are made in this phase. Before authority migration, the factory
must:

### MUST FIX BEFORE MIGRATION

- output `eventId`, not canonical `id`
- accept and output separate `requestId`
- accept and output `actorId`, not canonical `actor`
- accept and output separate `occurredAt` and `recordedAt`
- output `payloadVersion`
- align all authoritative fields with `WORKFLOW_EVENT_FIELDS`
- require explicit supported `eventType`
- reject `UNKNOWN_WORKFLOW_EVENT` for authoritative creation
- reject missing canonical project identity unless an approved scoped exception
  exists
- apply conversation requirements by event type
- reject `"unknown"` actor identity or role in authority mode
- stop treating deterministic fallback IDs as authoritative
- preserve input immutability and payload cloning
- return structured validity, warnings, and errors, or provide a separate
  strict validator that must pass before persistence

### SHOULD FIX BEFORE MIGRATION

- accept nullable `sequence`
- validate `source`
- define optional `legacy` metadata consistently
- expose identity source only as diagnostics, not as canonical project truth
- use one imported canonical event type registry

### SAFE TO DEFER

- removing the current reconciliation-shape compatibility API
- removing deterministic fallback IDs from shadow/test usage
- historical event conversion

## 13. Required `workflowEventContract` Changes Before Migration

No changes are made in this phase. Before authority migration, the contract
must:

### MUST FIX BEFORE MIGRATION

- explicitly distinguish read normalization from canonical write validation
- define which fields are always required and which are event-type conditional
- define `eventId` immutability and retry/idempotency behavior
- define explicit canonical `projectId` semantics
- define conversation requirements by event type
- define actor ID and role requirements
- define `occurredAt` versus `recordedAt`
- reject unsupported event types for canonical writes
- stop describing every entry in `WORKFLOW_EVENT_FIELDS` as uniformly required
  when `sequence` is currently nullable
- expose a canonical conformance result suitable for tests and persistence
  gates

### SHOULD FIX BEFORE MIGRATION

- own or import the single event type registry
- define the supported `actorRole` vocabulary
- define `payloadVersion` upgrade rules
- define `source` vocabulary
- define optional legacy metadata
- document that generic `id` is a read alias only

### SAFE TO DEFER

- mandatory global sequence values
- deletion of current warning-based normalization
- removal of legacy alias support
- historical migration utilities

## 14. Recommended Migration Blocker Checklist

A writer is blocked until every MUST item is true:

- [ ] One canonical write envelope is approved.
- [ ] Factory and contract use the same authoritative field names.
- [ ] A valid immutable `eventId` is available before projections are written.
- [ ] Retries reuse that `eventId`.
- [ ] Backend/local authority enforces duplicate protection by `eventId`.
- [ ] Explicit canonical `projectId` is present, or an approved scoped
      exception exists.
- [ ] `requestId` remains separate from `projectId`.
- [ ] Required `conversationId` is explicit in the event.
- [ ] Stable `actorId` is present.
- [ ] `actorRole` uses an approved value captured at occurrence time.
- [ ] Supported canonical `eventType` is explicit.
- [ ] `occurredAt` is explicit and valid.
- [ ] `recordedAt` is explicit and valid at persistence.
- [ ] `payloadVersion` is valid.
- [ ] Payload and legacy source data are preserved without mutation.
- [ ] All legacy projections can carry the same `eventId`.
- [ ] Canonical creation failure cannot partially execute the legacy workflow.
- [ ] Shadow comparison demonstrates no unresolved HIGH-risk identity gaps.
- [ ] Tests cover retry, duplicate, missing identity, and timestamp behavior.
- [ ] Production rendering remains legacy-powered until a separate adoption
      decision.

For `WORKFLOW_QUOTE_SENT`, the current answers are:

- canonical type mapping: ready
- payload preservation: ready
- role: ready
- canonical event ID: blocked
- canonical project ID: blocked
- persisted conversation ID: blocked
- stable actor coverage: unproven
- timestamp distinction: blocked
- canonical envelope alignment: blocked

## 15. Exact Next Codex Task for Phase 3H

### Conversation Phase 3H - Pure Canonical Event Envelope Alignment

Mission:

Align the pure factory and contract utilities without adopting any writer.

Files:

- `src/utils/workflowEventContract.js`
- `src/utils/workflowEventFactory.js`
- `src/utils/workflowEventFactoryAudit.js`
- related tests only

Required work:

1. Add strict canonical-write validation alongside the tolerant read
   normalizer.
2. Make the factory capable of producing the full contract envelope:
   `eventId`, `eventType`, `payloadVersion`, `projectId`, `requestId`,
   `conversationId`, `actorId`, `actorRole`, `occurredAt`, `recordedAt`,
   `sequence`, `source`, and `payload`.
3. Preserve the existing reconciliation compatibility shape where tests or
   shadow diagnostics still require it.
4. Require supplied canonical `eventId`, explicit project identity, stable
   actor identity, supported type, and valid timestamps in authority mode.
5. Add event-type-aware conversation validation.
6. Keep all functions pure and non-persisting.
7. Add tests for:
   - valid quote-sent contract event
   - missing/compatibility-only project ID
   - missing conversation ID
   - missing actor ID or invalid role
   - unsupported event type
   - missing event ID
   - retry reuse of event ID
   - separate occurrence and persistence timestamps
   - payload version
   - input immutability
   - no browser or storage access
8. Do not modify QuoteBuilder, ConversationThread, storage, routes, UI, or any
   writer.

Stop condition:

Stop before implementation if the canonical ID generator, project scope
exception, actor role vocabulary, or persisted envelope requires an
unapproved architecture decision.

Phase 3H must end with pure contract/factory parity only. Quote-sent writer
migration remains a later decision.

