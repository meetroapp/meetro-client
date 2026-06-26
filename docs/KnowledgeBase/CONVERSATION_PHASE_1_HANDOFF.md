# Conversation Phase 1 Handoff

## Status

Completed as a pure event and identity contract. No message persistence,
polling, rendering, archive, workflow, route, or storage behavior was changed.

## Files Changed

- `src/utils/workflowEventContract.js`
- `tests/workflowEventContract.test.js`
- `docs/KnowledgeBase/CONVERSATION_PHASE_1_HANDOFF.md`

## Deliverables

- Versioned workflow event envelope.
- Pure normalization of legacy message and workflow-event shapes.
- Explicit warnings for missing immutable event ID, project identity, actor ID,
  actor role, occurrence timestamp, and persistence timestamp.
- Schema comparison reporting for declared and rendered workflow types.
- No actor, timestamp, or project inference from mutable presentation data.

## Tests Added

- Explicit event-envelope normalization and payload immutability.
- Missing actor warning behavior.
- Generic event ID and missing timestamp warnings.
- Declared-versus-rendered schema reporting.
- Mixed legacy event coverage reporting.

## Build and Test Result

- `node --test tests/workflowEventContract.test.js`: 5 passed, 0 failed.
- `npm run build`: passed.
- Existing Vite large-chunk warning remains; this phase did not change bundling.

## Risks Discovered

1. `workflow_quote_sent` is rendered but absent from the workflow type lists.
2. Backend message mapping can infer sender role from the current viewer.
3. Local events commonly use generic IDs and display-oriented timestamps.
4. `recordedAt` is not consistently persisted.
5. Choosing one workflow schema registry or changing actor fallback behavior
   requires an authority decision and is outside this phase.

## Recommended Next Phase

Work Center Phase 1: freeze and report the existing read contracts, selector
ownership boundaries, warning coverage, and legacy dependencies without
adopting selectors in UI.
