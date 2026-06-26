# Meetro Conversation Phase 3E - Quote Sent Shadow Audit

## What Was Wired

A development-only diagnostic comparison was added in:

- `src/pages/QuoteBuilder.jsx`
- `sendQuote`
- immediately after the existing `workflowQuoteCard` object is assembled

The diagnostic:

1. resolves project identity from explicit `projectId` or `requestId`
2. creates a pure `WORKFLOW_QUOTE_SENT` event with `createWorkflowEvent`
3. compares the legacy card with the factory event using `compareLegacyToFactoryEvent`
4. logs summary data under `Meetro Quote Sent Factory Audit`

The block is guarded by `import.meta.env.DEV` and wrapped in `try/catch`.

## Why It Is Shadow-Only

The factory event exists only as an in-memory local variable during development diagnostics. It is not:

- written to localStorage
- sent to an API
- dispatched as a browser event
- added to React state
- passed to rendering
- used to change quote status or navigation

The diagnostic can fail without interrupting quote sending.

## Compared Data

The audit compares:

- legacy `workflow_quote_sent` or `workflow_revised_quote` type
- canonical `WORKFLOW_QUOTE_SENT` type
- project identity
- conversation identity
- actor availability
- actor role availability
- recorded timestamp availability
- full legacy card payload preservation
- legacy metadata preservation
- resulting schema gaps and migration risk

The log intentionally excludes full quote payloads, notes, prices, and customer content.

## Why Legacy Remains Authoritative

All existing behavior remains powered by `workflowQuoteCard` and the current writers:

- quote history writes
- homeowner request timeline update
- quote/project shadow link
- conversation localStorage append
- active conversation selection
- success toast
- navigation state

The factory event does not participate in any of these operations.

## Observed Migration Risks

### Conversation identity

`quoteConversationId` is available to the factory, but the persisted legacy card does not contain an explicit `conversationId`. The audit therefore reports a conversation identity gap instead of modifying the legacy card.

### Project identity

The current compatibility layer can resolve `requestId` as project identity. This is usable for shadow measurement but is not equivalent to a backend-issued canonical project ID.

### Actor identity

The shadow event uses the existing `userId` only when available. Missing user identity remains visible as an actor gap. The business display name is not treated as a stable actor ID.

### Event identity

The shadow comparison reuses the legacy card ID for correlation, but the legacy record still uses a generic presentation ID rather than a separately governed canonical event ID.

### Revised quotes

Both initial and revised quote cards map to `WORKFLOW_QUOTE_SENT`. The original card type and full payload are preserved so revision context is not lost.

## Phase 3F Recommendation

Keep quote-sent diagnostics in observation mode and add focused read-only aggregation for:

- number of internal quote-sent comparisons
- risk counts by `LOW`, `MEDIUM`, and `HIGH`
- common schema gaps
- initial versus revised quote coverage
- safe project identity coverage
- explicit conversation identity coverage
- stable actor identity coverage

Do not persist factory events in Phase 3F. Do not change the legacy quote writer until the report demonstrates safe project, conversation, and actor identity coverage and canonical event ID policy is approved.

## Verification Expectations

- all architecture tests pass
- production build passes
- production bundle does not contain the audit log label
- quote sending behavior remains unchanged
- no canonical event is persisted or emitted
