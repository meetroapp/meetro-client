# Completion to History Phase 5 Adapter Harness

## Purpose

Phase 5 adds pure characterization infrastructure for measuring whether reconciled Completion to History data can reproduce the current Work Center completed-job presentation.

Created:

- `src/utils/workCenterHistorySourceAdapter.js`
- `src/utils/workCenterHistoryPresentationAdapter.js`
- `tests/workCenterHistoryAdapterHarness.test.js`

Nothing is imported into `ContractorDashboard.jsx`. Work Center remains fully legacy-driven.

## Source Adapter Strategy

`adaptWorkCenterHistorySources()` accepts supplied collections:

```js
adaptWorkCenterHistorySources({
  scheduleRecords,
  completedProjects,
  homeownerRequests,
  workflowEvents,
  projects,
  conversations,
})
```

It returns:

```js
{
  legacyHistory,
  reconciliationInput,
  sourceMetadata,
  sourceSummary,
}
```

The adapter mirrors current Work Center characterization:

1. Include schedule rows with a completed status.
2. Include every `completedProjects` record.
3. Include completed homeowner requests not already represented by a saved completion with the same `requestId || id`.
4. Preserve current bucket order: schedule, saved completion, homeowner request.
5. Preserve source-local identity without promoting it to canonical identity.
6. Attach source label, source index, and legacy order metadata.

The adapter is pure. It does not read or write storage.

## Presentation Adapter Strategy

`adaptReconciledHistoryToWorkCenterPresentation()` projects reconciled records into characterization fields used by the current completed-work cards:

- `category`
- `title`
- `customer`
- `status`
- `statusLabel`
- `completedAt`
- `completionDateLabel`
- `location`
- `sourceLabel`
- `legacyDetailReference`
- Field coverage and warnings

The current visible Work Center status label is preserved as `Completed` for parity characterization. The reconciled canonical status remains available separately. This does not decide which canonical statuses should qualify as final history.

Missing labels and identity are left empty and reported. The adapter does not invent `Homeowner`, `Completed Project`, a location, or the current date.

## Source Precedence Findings

Current list order and safe detail precedence are different concerns.

Legacy list order:

1. `meetro_business_schedule`
2. `completedProjects`
3. `homeownerRequests`

Presentation/detail richness precedence:

1. `completedProjects`
2. `homeownerRequests`
3. `meetro_business_schedule`
4. Generic completion source
5. Workflow event

The saved completion record is preferred for characterization because it is most likely to contain photos, notes, payment fields, and closeout details needed by `CompletedJobDetails.jsx`.

This precedence is diagnostic only. It does not establish persistence authority.

## Field Coverage Findings

| Field | Schedule | completedProjects | Homeowner request | Readiness |
| --- | --- | --- | --- | --- |
| Title/project label | Usually | Usually | Usually | PARTIAL |
| Customer label | Often location fallback only | Inconsistent | Usually homeowner identity | PARTIAL |
| Status label | Completed bucket | Often implicit | Explicit completed status | PARTIAL |
| Completion date | Optional | Usually present | Optional | PARTIAL |
| Source label | Adapter-supplied | Adapter-supplied | Adapter-supplied | READY |
| Project identity | Rare | Inconsistent | Request identity more common than project identity | BLOCKED |
| Legacy detail reference | Thin | Richest | Rich project/request shape | PARTIAL |
| Revenue | Amount available | Often available | Quote-derived | BLOCKED for authority |

The adapter can reproduce card structure for representative records. It cannot guarantee semantic parity across real records with missing or conflicting fields.

## Count Drift Risks

Count drift remains likely because:

- The legacy Work Center suppresses homeowner requests by `requestId || id`.
- Reconciliation merges only shared completion identity.
- Source-local schedule, request, and completion IDs usually differ.
- Completion workflow events can create extra reconciled records.
- Records without identity remain visible but cannot be matched.
- Stored completed-job counters are outside this harness.

The harness can expose drift through `compareWorkCenterHistory()`. It does not resolve drift.

## Ordering Drift Risks

Legacy Work Center uses source-bucket order. Reconciled history uses newest valid completion date first and places undated records last.

Ordering changes are expected whenever:

- A saved completion is newer than a completed schedule.
- Records in `completedProjects` are not already chronological.
- A record lacks `completedAt`.
- Legacy code currently invents a date for missing schedule timestamps.

Phase 5 intentionally preserves both orderings so drift is measurable.

## Detail Navigation Findings

`CompletedJobDetails.jsx` expects a complete legacy object through `lastCompletedProject`.

The presentation adapter preserves a cloned `legacyDetailReference` from the richest available source. This proves that a future adapter could retain the legacy detail payload without mutating reconciliation data.

Detail navigation remains unsafe for adoption because:

- Some reconciled records contain only workflow events.
- Schedule records are too thin.
- Source records can disagree.
- Scalar fallback storage is still part of the detail screen.
- No runtime handoff contract exists.

## Readiness Matrix

| Category | Status | Notes |
| --- | --- | --- |
| Source Coverage | PARTIAL | Three primary Work Center buckets are supported; emergency and workflow-event coverage needs representative datasets. |
| Presentation Field Coverage | PARTIAL | Card fields can be characterized, but customer, date, location, and title can be absent. |
| Count Parity | BLOCKED | Cross-source completion identity is not propagated consistently. |
| Ordering Parity | BLOCKED | Legacy bucket order and reconciled chronological order are intentionally different. |
| Identity Provenance | BLOCKED | Project and completion identity frequently remain fallback, inferred, or missing. |
| Detail Navigation Safety | PARTIAL | A cloned legacy reference can be retained, but not every source provides a sufficient detail record. |
| Revenue Safety | BLOCKED | Revenue authority is outside the canonical history model and cannot be selected here. |
| Overall Work Center Adoption | BLOCKED | Harness infrastructure is ready; runtime adoption is not. |

## Remaining Blockers

1. No shared completion identity across schedule, saved completion, homeowner request, and workflow event records.
2. No consistent canonical project identity.
3. Real Work Center datasets have not been captured as test fixtures.
4. Status finality remains undecided.
5. Revenue and completed-job counts remain separate reporting concerns.
6. Missing timestamps would visibly alter ordering.
7. Customer and project display fallback policy is not canonical.
8. Completed Job Details remains storage- and legacy-shape-dependent.
9. Emergency completion coverage is not characterized by this phase.

## Exact Phase 6 Recommendation

Phase 6 should be **Work Center History Fixture Characterization and Parity Report**, not runtime adoption.

Scope:

1. Add sanitized representative fixtures for schedule, saved completion, homeowner request, emergency completion, and completion workflow event shapes already present in the repository.
2. Run the source adapter, reconciler, presentation adapter, and shadow comparator as one pure pipeline.
3. Produce structured aggregate findings for:
   - Source coverage
   - Field coverage
   - Count drift
   - Ordering drift
   - Identity quality
   - Duplicate reduction
   - Detail-reference availability
   - Revenue-field presence without choosing authority
4. Establish stop conditions for any later development-only runtime shadow measurement.

Phase 6 must not:

- Import adapters into Work Center pages
- Read live browser storage
- Change UI or routing
- Change counts, revenue, or status labels
- Adopt reconciled history
- Change any writer
