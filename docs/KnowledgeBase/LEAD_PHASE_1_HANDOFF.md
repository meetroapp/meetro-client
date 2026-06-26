# Lead Phase 1 Handoff

## Status

Completed as read-only source and identity reconciliation. No UI, route,
workflow, storage, or authority behavior was changed.

## Files Changed

- `src/utils/leadReconciliation.js`
- `tests/leadReconciliation.test.js`
- `docs/KnowledgeBase/LEAD_PHASE_1_HANDOFF.md`

## Deliverables

- Pure normalization for `/posts`, `/contractor-quote-requests`, and
  `homeownerRequests` records.
- Exact-token cross-source reconciliation for explicit workflow identity.
- Source counts, unresolved counts, status conflicts, warning counts, and
  normalized source collections.
- Generic source IDs are retained for reporting but never used alone to join
  sources.
- Title-only records are reported as unresolved.

## Tests Added

- Source record immutability.
- Exact explicit-ID reconciliation.
- Generic-ID collision isolation.
- Title-only warning behavior.
- Embedded accepted-quote closure reporting.

## Build and Test Result

- `node --test tests/leadReconciliation.test.js`: 5 passed, 0 failed.
- `npm run build`: passed.
- Existing Vite large-chunk warning remains; this phase did not change bundling.

## Risks Discovered

1. `BusinessLeads.jsx` currently closes leads using ID or title matching.
2. `QuoteRequests.jsx` associates records by title or description and writes
   viewed state.
3. The three sources do not expose a proven shared canonical identity.
4. Status conflicts are expected because each source can represent a different
   workflow moment.
5. Choosing one source as canonical requires a product and backend decision and
   is outside this phase.

## Recommended Next Phase

Conversation Phase 1: define a pure event and identity contract without
changing message persistence or rendering.
