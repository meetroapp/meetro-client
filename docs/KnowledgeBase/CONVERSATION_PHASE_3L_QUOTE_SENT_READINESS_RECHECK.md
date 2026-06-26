# Meetro Conversation Phase 3L - Quote Sent Readiness Recheck

## Decision

**Recommendation: fix identity prerequisites first.**

`WORKFLOW_QUOTE_SENT` should remain shadow-only. The canonical contract,
factory, reconciliation, and audit utilities are now aligned, but the active
`QuoteBuilder.sendQuote` boundary cannot yet supply every required canonical
identity without compatibility fallback or unapproved assumptions.

**Current migration risk: HIGH.**

The architecture utility mismatch identified in Phase 3F is resolved. The
remaining blockers are writer-context and identity-authority blockers.

## 1. What Changed Since Phase 3F

Phase 3F found two categories of risk:

1. contract and factory schema disagreement
2. incomplete quote-sent identity

The first category has been resolved.

Since Phase 3F:

- `CANONICAL_WORKFLOW_EVENT_ENVELOPE.md` became the source of truth
- `workflowEventContract.js` now defines the required canonical fields:
  `id`, `eventType`, `projectId`, `conversationId`, `actor`, `actorRole`,
  `recordedAt`, `source`, and `payload`
- optional fields are limited to `legacy`, `metadata`, and
  `migrationSource`
- the contract exports one event type registry and actor-role vocabulary
- strict canonical validation is separate from tolerant legacy normalization
- `workflowEventFactory.js` now produces only the canonical envelope
- the factory no longer generates fallback IDs
- the factory no longer derives `recordedAt` from payload timestamps
- missing or invalid required fields produce structured validation errors
- unknown event types cannot be created as authoritative canonical events
- reconciliation now preserves canonical input shape and marks legacy aliases
- canonical `id` now has deduplication priority
- factory audit now reports canonical contract validity

The existing QuoteBuilder shadow block remains development-only,
non-persisting, and wrapped in `try/catch`.

## 2. Contract, Factory, and Schema Mismatch

**Status: resolved.**

The authoritative names now agree:

| Concern | Canonical decision |
| --- | --- |
| Event identity | `id` |
| Event type | `eventType` |
| Project identity | `projectId` |
| Conversation identity | `conversationId` |
| Actor identity | `actor` |
| Actor role | `actorRole` |
| Canonical timestamp | `recordedAt` |
| Origin | `source` |
| Domain facts | `payload` |

The factory validates against the contract before returning an event.
Reconciliation can still read `eventId`, `actorId`, `occurredAt`, and other
legacy aliases, but those aliases are not canonical output.

This removes the Phase 3F risk of creating a second partially canonical event
schema.

## 3. Remaining Quote-Sent Migration Blockers

### Canonical event ID policy

`workflowQuoteCard.id` remains:

```text
workflow-quote-<Date.now()>
```

The shadow factory reuses this value. That preserves current card correlation,
but it does not meet the canonical policy requiring an opaque,
collision-resistant ID generated once at the workflow command boundary and
reused for retries.

There is no current idempotency rule connecting:

- quote history update
- homeowner project timeline projection
- conversation card
- future canonical event

A retry or repeated send can create a new timestamp ID for the same intended
transition.

**Classification: MUST FIX BEFORE MIGRATION.**

### Canonical project identity

The shadow path calls `getProjectIdentity` with:

- `request.projectId`
- the local `requestId`

The local `requestId` can itself fall back through:

- `request.requestId`
- `request.id`
- `activeQuoteRequestId`
- `String(Date.now())`

The compatibility resolver may therefore return a request ID, generic ID, or
new timestamp token as `projectId`. The canonical specification permits only
an explicit project aggregate ID.

The strict contract currently validates non-empty project identity shape; it
cannot prove that the supplied value came from project authority. QuoteBuilder
must make that provenance explicit before migration.

**Classification: MUST FIX BEFORE MIGRATION.**

### Stable actor identity

The shadow factory receives:

```text
localStorage.getItem("userId") || ""
```

When the value is missing, the strict factory now throws a validation error.
That failure is safely caught by the development-only shadow block, but it
proves the writer is not universally migration-ready.

There is no readiness evidence showing that every internal quote send has a
stable authenticated user ID.

**Classification: MUST FIX BEFORE MIGRATION.**

### Persistence-owned timestamp

The shadow uses `workflowQuoteCard.createdAt` as canonical `recordedAt`.

The value is valid UTC ISO-8601, but it is assigned when the presentation card
is assembled, before the legacy conversation append is completed. The
canonical specification assigns `recordedAt` at the authoritative persistence
boundary.

If local persistence is temporarily selected as authority, the exact point
and retry behavior must be defined. The current value is suitable for shadow
comparison but not yet proven as the authoritative recording timestamp.

**Classification: MUST FIX BEFORE MIGRATION.**

### Canonical ID across all projections

The homeowner timeline event and quote history record do not share the
conversation card ID. A migrated writer must correlate every projection of
the same quote-send transition without changing current visible behavior.

**Classification: MUST FIX BEFORE MIGRATION.**

### Persisted conversation identity

`quoteConversationId` is explicit at the factory boundary and is used in the
localStorage key. This is sufficient input for a future canonical event.

However, the legacy `workflowQuoteCard` still omits `conversationId`. The
current ConversationThread display depends on the storage key and legacy card
shape. Migration must preserve that behavior while ensuring the canonical
event carries its own conversation identity.

**Classification: SHOULD PROVE BEFORE MIGRATION.**

### Revised quote semantics

Both initial and revised sends map to `WORKFLOW_QUOTE_SENT`. The legacy
presentation type distinguishes `workflow_quote_sent` from
`workflow_revised_quote`.

The canonical payload can preserve revision facts, but there is no frozen
quote-sent payload contract defining a revision number or revision flag.

**Classification: SHOULD FIX BEFORE MIGRATION.**

### Production persistence authority

The factory is pure and does not persist. No approved canonical event
persistence location or append order currently exists for quote sent.

Replacing the legacy writer without defining that boundary would either remove
the current ConversationThread projection or introduce an additional write
whose authority is unclear.

**Classification: MUST FIX BEFORE MIGRATION.**

## 4. Required Identity Field Readiness

| Field | Current QuoteBuilder input | Readiness | Reason |
| --- | --- | --- | --- |
| `id` | `workflow-quote-${Date.now()}` | Blocked | Presentation/timestamp ID has no approved collision or retry policy. |
| `projectId` | Explicit project ID when available; otherwise compatibility `requestId` or weaker fallback | Blocked | Canonical project authority and provenance are not guaranteed. |
| `conversationId` | Explicit `quoteConversationId` for the internal conversation-card branch | Conditionally ready | Available at the boundary, but absent from the legacy persisted card and not available for external quotes. |
| `actor` | `localStorage.userId` or empty | Blocked | Stable identity is optional and real-data coverage is unknown. |
| `actorRole` | Explicit `business` | Ready | Approved canonical role and correct for this writer. |
| `recordedAt` | `workflowQuoteCard.createdAt` | Blocked | Valid timestamp, but not assigned by an approved persistence boundary. |

Additional required fields:

| Field | Readiness | Reason |
| --- | --- | --- |
| `eventType` | Ready | `WORKFLOW_QUOTE_SENT` is approved. |
| `source` | Ready | `quote-builder` satisfies the canonical source format. |
| `payload` | Structurally ready | Full legacy card is deeply preserved, but a minimal typed quote-sent payload contract is not frozen. |

## 5. Risk Classification

### Overall: HIGH

Reasons:

- canonical `projectId` provenance is not guaranteed
- canonical event ID and retry policy are unresolved
- stable actor identity is not guaranteed
- recording timestamp ownership is unresolved
- one canonical ID is not shared across existing projections
- canonical persistence authority is undefined

The aligned audit correctly treats an invalid canonical envelope as HIGH risk.
Missing actor or timestamp no longer produces a merely incomplete factory
event; the strict factory rejects it.

## 6. Decision Rule Evaluation

| Decision requirement | Result | Assessment |
| --- | --- | --- |
| Preserve existing quote behavior | Pass only in current shadow mode | Legacy quote history, status, homeowner timeline, toast, and navigation remain authoritative. |
| Preserve ConversationThread display | Pass only in current shadow mode | ConversationThread still receives the unchanged legacy card. Canonical replacement rendering has not been proven. |
| Preserve localStorage keys | Pass only in current shadow mode | The canonical event is not persisted. A migration persistence strategy is not defined. |
| Preserve legacy event expectations | Partial | Payload preservation works, but shared ID and projection correlation are unresolved. |
| Complete enough identity | Fail | `id`, `projectId`, `actor`, and `recordedAt` do not meet canonical authority requirements in every send. |
| No production audit logging | Pass | The audit block remains guarded by `import.meta.env.DEV`. |

The decision rule does not permit migration.

## 7. Recommendation

**Fix identity prerequisites first.**

Keep `WORKFLOW_QUOTE_SENT` shadow-only. Do not replace the legacy conversation
card, quote history writes, homeowner timeline update, localStorage keys, or
ConversationThread rendering.

The next safe work should measure and formalize the identity inputs at the
QuoteBuilder boundary without persisting canonical events.

## 8. Exact Next Codex Task for Phase 3M

### Conversation Phase 3M - Quote Sent Canonical Identity Readiness Utility

Mission:

Create a pure, read-only utility that evaluates whether a quote-send context
can satisfy the canonical envelope before factory creation.

Create:

- `src/utils/quoteSentCanonicalReadiness.js`
- `tests/quoteSentCanonicalReadiness.test.js`
- `docs/KnowledgeBase/CONVERSATION_PHASE_3M_QUOTE_SENT_IDENTITY_HANDOFF.md`

Required API:

```js
getQuoteSentCanonicalReadiness({
  eventId,
  projectId,
  projectIdentitySource,
  requestId,
  conversationId,
  actor,
  actorRole,
  recordedAt,
  source,
  quoteId,
  isRevisedQuote
})
```

Required output:

```js
{
  ready,
  fieldReadiness: {
    id,
    projectId,
    conversationId,
    actor,
    actorRole,
    recordedAt,
    source,
    quoteId
  },
  blockers,
  warnings,
  risk
}
```

Rules:

- pure and non-persisting
- no localStorage, window, network, route, or UI access
- do not generate an ID
- reject timestamp-only or generic ID policy as canonical-ready
- accept `projectId` only when provenance is explicitly `projectId`
- keep `requestId` separate and diagnostic-only
- require explicit conversation and actor identity
- require approved actor role
- require valid canonical timestamp and source
- distinguish initial and revised quote diagnostics
- do not include quote notes, amounts, customer names, or message text
- do not modify QuoteBuilder in Phase 3M unless a separate shadow-only adoption
  task is approved

Tests:

- fully ready context
- request-derived project identity
- generic or timestamp event ID
- missing conversation ID
- missing actor
- invalid actor role
- invalid timestamp
- revised quote readiness
- input immutability
- no browser or storage access

Phase 3M should produce readiness evidence only. It must not generate,
persist, emit, or render a canonical quote-sent event.

