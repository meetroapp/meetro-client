# Meetro Conversation Phase 3F - Quote Sent Migration Decision

## Decision

**Recommendation: expand shadow audit first.**

`WORKFLOW_QUOTE_SENT` is not ready to move from the legacy
`workflowQuoteCard` writer to canonical `workflowEventFactory` authority.

The current shadow path is non-blocking and preserves the legacy payload well,
but the persisted legacy event does not carry explicit conversation identity,
actor identity is optional, project identity may be a compatibility
`requestId`, and canonical event ID policy is not yet approved. The factory
shape also does not yet implement the complete envelope defined by
`workflowEventContract.js`.

**Overall authority-migration risk: HIGH.**

For an individual quote with safe project identity and a current user ID, the
factory comparison is commonly MEDIUM risk because conversation identity is
still absent from the legacy card. Records without safe project identity are
HIGH risk.

## 1. Current Legacy Quote-Sent Write Behavior

The active writer is `sendQuote` in `src/pages/QuoteBuilder.jsx`.

For an internal quote with an explicit `quoteConversationId`, it:

1. reads `meetro_conversation_<conversationId>`
2. assembles `workflowQuoteCard`
3. appends that card to the same conversation localStorage key
4. updates `activeConversationId`
5. updates `conversationReturnPage`
6. removes `meetroRevisedQuoteContext`

The card remains the only event persisted by this path. Its important fields
are:

- `id`: `workflow-quote-<Date.now()>`
- `type`: `workflow_quote_sent` or `workflow_revised_quote`
- `requestId`
- quote identifiers and quote display data
- `role`, `senderRole`, and display `sender`
- `status` and `quoteStatus`
- `createdAt` and display-only `time`

The same `sendQuote` operation also retains its existing quote history,
homeowner request timeline, quote/project shadow-link, success, and navigation
behavior. Those projections are outside the factory event and must remain
unchanged during any future event migration.

External quotes do not enter this conversation-card or factory-shadow path.

## 2. Canonical Factory Shadow Behavior

Phase 3E added a development-only comparison immediately after
`workflowQuoteCard` is assembled.

The shadow path:

- resolves project identity from `request.projectId` or `requestId`
- creates an in-memory `WORKFLOW_QUOTE_SENT` event
- reuses the legacy card ID for comparison
- supplies the explicit `quoteConversationId`
- uses current `userId` when available
- uses `business` as `actorRole`
- uses the card's `createdAt` as `recordedAt`
- preserves the complete legacy card in `payload`
- records identity and original-type details in `legacy`
- compares both shapes with `compareLegacyToFactoryEvent`
- logs summary diagnostics only in development

The shadow event is not persisted, emitted, rendered, or used to determine
status, storage, navigation, or workflow outcomes. Comparison failure is
isolated by `try/catch`.

## 3. Field-by-Field Comparison

| Field | Legacy writer | Factory shadow | Migration assessment |
| --- | --- | --- | --- |
| `id` | Generic presentation ID: `workflow-quote-<timestamp>` | Explicitly reuses the legacy ID | Correlation is preserved, but canonical uniqueness, idempotency, and retry behavior are not defined. Do not replace authority until the ID policy is approved. |
| `eventType` | `workflow_quote_sent` or `workflow_revised_quote` in `type` | `WORKFLOW_QUOTE_SENT` | The mapping is supported. Revised-send meaning survives only through payload and legacy metadata; it is not a distinct canonical type. |
| `projectId` | No explicit `projectId`; usually has `requestId` | Resolved from explicit `projectId`, otherwise compatibility `requestId` | Not complete enough for authority. A request ID can support shadow comparison, but it is not proof of a backend canonical project ID. Missing identity produces HIGH audit risk. |
| `conversationId` | Used to select the storage key but omitted from the persisted card | Explicit `quoteConversationId` | The factory has better context than the persisted event, so comparison reports `missing-conversation-id`. Migration must preserve storage lookup and give the canonical event explicit conversation identity. |
| `actor` | Display `sender` only; no stable actor ID | Current `userId`, otherwise factory fallback `unknown` | A business display name is not a stable actor identity. Coverage of valid `userId` values has not been measured. |
| `actorRole` | `role` and `senderRole` are `business` | `business` | Adequate for the current internal quote-sent path. |
| `recordedAt` | No `recordedAt`; `createdAt` is present | Normalized from the same `createdAt` | Timestamp value is available, but occurrence time and persistence time are not separately represented. |
| `source` | No persisted source field | `quote-builder` | Canonical source is clear, but it is new metadata rather than a field proven against legacy persistence. |
| `payload` | The card itself is the persisted record | Deep-cloned complete legacy card | Current audit can verify payload preservation. This is one of the strongest migration-ready areas. |
| `legacy` | No explicit legacy metadata object | Preserves original type, identity source, and identity warnings | Useful and non-destructive, but canonical governance for required legacy metadata is not yet frozen. |

### Workflow Event Contract Difference

`workflowEventContract.js` defines a fuller canonical envelope:

- `eventId`
- `payloadVersion`
- `requestId`
- `actorId`
- `occurredAt`
- `recordedAt`
- `sequence`

`workflowEventFactory.js` currently returns the Conversation reconciliation
shape with `id` and `actor`, and does not return all of those contract fields.
The factory is safe as a normalization and comparison foundation, but it
should not become write authority until one canonical persisted envelope is
chosen. Choosing that envelope is an architecture decision, not an automatic
writer substitution.

## 4. Remaining Migration Risks

### HIGH - Canonical identity is incomplete

The quote card does not persist `projectId` or `conversationId`. Project
identity can be derived from `requestId` for compatibility, but that is not
equivalent to an approved canonical project aggregate.

### HIGH - Canonical persisted contract is not frozen

The factory output and `workflowEventContract.js` use different field names
and completeness rules. Replacing the writer now could create a second
partially canonical schema rather than one authoritative event format.

### HIGH - Event ID and idempotency policy is unresolved

Reusing the legacy timestamp-based card ID protects current correlation, but
does not establish how retries, repeated sends, revised sends, or duplicate
submission should behave under canonical authority.

### MEDIUM - Stable actor coverage is unknown

The shadow uses `localStorage.userId` when available and otherwise produces an
actor warning. No aggregate evidence currently demonstrates acceptable actor
coverage across real quote sends.

### MEDIUM - Revised quote semantics depend on legacy metadata

Initial and revised quotes both become `WORKFLOW_QUOTE_SENT`. This can be
correct if revision context is an event attribute, but that rule should be
explicit before migration.

### MEDIUM - No observation summary exists

Phase 3E logs one comparison at a time. There is no structured count of LOW,
MEDIUM, and HIGH results or of common identity gaps. A decision based only on
code-path inspection cannot establish real-data readiness.

### LOW - Payload preservation

The factory deep-clones the legacy card into `payload`, and the comparison
utility verifies preservation without mutating either input.

### LOW - Current workflow isolation

The shadow block is development-only, wrapped in `try/catch`, and does not
participate in production persistence or rendering.

## 5. Decision Rule Evaluation

| Requirement | Result | Reason |
| --- | --- | --- |
| Legacy event ID expectations are preserved | Partial | The shadow reuses the ID, but canonical uniqueness and retry policy are not approved. |
| Quote status behavior remains unchanged | Pass for shadow mode | The legacy writer remains authoritative. Replacement behavior has not been proven. |
| ConversationThread display remains unchanged | Pass for shadow mode | ConversationThread still reads the legacy card. Canonical rendering compatibility is not yet adopted. |
| localStorage keys remain unchanged | Pass for shadow mode | No canonical event is persisted. A replacement storage strategy is intentionally undefined. |
| Actor/project/conversation identity is complete enough | Fail | Actor can be unknown, project can be compatibility-only, and conversation ID is absent from the persisted legacy card. |
| Production behavior remains unchanged | Pass for shadow mode | The audit is guarded by `import.meta.env.DEV`; migration would require a separate proof. |

Because identity completeness fails and ID/contract expectations are only
partially satisfied, the decision rule does not permit migration now.

## 6. Recommendation

**Keep the legacy quote-sent card as write authority and expand the shadow
audit first.**

Do not persist factory events, replace `workflowQuoteCard`, add new storage
keys, or change ConversationThread rendering in the next phase.

The next evidence must answer:

- how often project identity is explicit versus request-derived or missing
- how often stable actor identity is present
- whether explicit conversation identity is available for every internal send
- how initial and revised sends distribute across risk levels
- which schema gaps occur most often
- whether a canonical persisted event uses the factory read shape or the
  complete `workflowEventContract` envelope

## 7. Exact Next Codex Task for Phase 3G

### Conversation Phase 3G - Quote Sent Shadow Readiness Aggregation

Create a pure, read-only quote-sent audit summary utility and focused tests.

Required output:

```js
{
  totalComparisons,
  riskCounts: { LOW, MEDIUM, HIGH },
  schemaGapCounts,
  initialQuoteCount,
  revisedQuoteCount,
  explicitProjectIdentityCount,
  requestDerivedProjectIdentityCount,
  missingProjectIdentityCount,
  explicitConversationIdentityCount,
  stableActorIdentityCount,
  migrationReadyCount
}
```

Rules:

- do not persist audit results
- do not replace or modify the legacy writer
- do not render diagnostics
- do not log payload, prices, notes, customer names, or message text
- keep any optional QuoteBuilder wiring development-only and non-blocking
- use bounded in-memory diagnostic data only if runtime aggregation is added
- add tests for empty input, mixed risks, repeated comparisons, revised quote
  classification, identity coverage, and input immutability
- document whether the factory or `workflowEventContract` envelope is proposed
  for eventual persisted authority; stop if that requires a product or
  architecture decision

Migration should be reconsidered only after Phase 3G demonstrates adequate
identity coverage and a single canonical persisted event envelope is approved.

