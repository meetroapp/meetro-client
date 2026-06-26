# Work Center Phase 1 Handoff

## Status

Completed as an ownership and read-contract freeze. No selector was adopted by
UI, and no workflow, storage, route, Dashboard, Command Center, or authority
behavior was changed.

## Files Changed

- `src/utils/workCenterSelectors.js`
- `tests/workCenterReadContracts.test.js`
- `docs/KnowledgeBase/WORK_CENTER_PHASE_1_HANDOFF.md`

## Deliverables

- Five explicit read contracts for Scheduling, Quotes, Work, Completion, and
  Timeline.
- Work Center is identified as the projection consumer, not a domain owner.
- Legacy source lists for each projection.
- Read-only report of record counts, warning codes, shell responsibilities, and
  prohibited domain ownership.
- Every contract is labeled `projection-only` and `not-adopted`.

## Tests Added

- Contract count and future-owner mapping.
- Selector count reporting.
- Proof that report generation performs no storage writes.
- Explicit unadopted/projection-only status.
- Identity warning behavior without title resolution.
- Separation of shell responsibilities from domain ownership.

## Build and Test Result

- `node --test tests/workCenterReadContracts.test.js`: 5 passed, 0 failed.
- `npm run build`: passed.
- Existing Vite large-chunk warning remains; this phase did not change bundling.

## Risks Discovered

1. Current pages do not consume the normalized Work Center selectors.
2. `ContractorDashboard.jsx` continues to read and write every major workflow
   domain directly.
3. Dashboard and Command Center persist Work Center tab/navigation intent in
   storage.
4. Active work still depends on overlapping global snapshots and request state.
5. Completed history and timeline remain assembled from several legacy stores.
6. Choosing selector adoption order is a UI adoption decision and is outside
   this phase.

## Recommended Next Phase

Do not begin UI adoption automatically. The next safe implementation phase is
Lead Phase 2 only after William approves the appointment-before-quote exception
policy. If that product decision is not ready, continue with Conversation
Phase 2 read-only reconciliation.
