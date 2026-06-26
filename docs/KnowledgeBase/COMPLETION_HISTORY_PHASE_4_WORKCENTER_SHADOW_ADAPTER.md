# Completion to History Phase 4 Work Center Shadow Adapter

## Purpose

`src/utils/workCenterHistoryShadowAdapter.js` compares the legacy Work Center completed-work projection with the reconciled Completion to History projection.

It is pure and shadow-only:

- No browser storage access
- No storage writes
- No page or UI imports
- No runtime adoption
- No changes to visible counts, ordering, labels, or navigation
- No completion or history writer changes

Work Center remains fully legacy-driven.

## API

```js
compareWorkCenterHistory({
  legacyHistory,
  reconciledHistory,
})
```

The result contains:

```js
{
  parity,
  missingRecords,
  extraRecords,
  orderingDifferences,
  identityDifferences,
  statusDifferences,
  duplicateRecords,
  unidentifiedRecords,
  provenanceSummary,
}
```

## Shadow Adoption Strategy

The adapter compares supplied arrays without reading their storage sources.

Matching is deliberately conservative:

1. Prefer `completionId` or `completionRecordId`.
2. Retain a legacy record `id` only as fallback completion identity.
3. Match each unique completion identity across the two projections.
4. Report repeated identities as duplicate source records.
5. Keep records without completion identity visible as unidentified.

The adapter never matches records by:

- Title or service
- Customer name
- Location
- Completion date
- Display text
- Conversation ID alone
- Project ID alone

This prevents the shadow report from manufacturing parity.

## Comparison Semantics

### Missing Records

`missingRecords` contains unique completion identities present in legacy Work Center history but absent from reconciled history.

### Extra Records

`extraRecords` contains unique completion identities present in reconciled history but absent from legacy Work Center history. Provenance is retained to explain their origin.

### Duplicate Records

`duplicateRecords` reports repeated completion identities separately for the legacy and reconciled collections. Duplicate copies are not mislabeled as missing records.

### Ordering Differences

Ordering compares the relative positions of matched unique completion identities. It does not compare timestamps or invent dates.

### Identity Differences

Identity findings report:

- Conflicting project IDs
- A missing project ID on either side
- A reconciled completion identity that remains fallback rather than authoritative

Reconciled provenance accompanies the finding.

### Status Differences

Common legacy aliases are normalized before comparison. For example, `Completed`, `complete`, and `closed` compare as `completed`.

The adapter does not decide whether `submitted`, `awaiting_confirmation`, or `confirmed` should be displayed as completed history.

## Parity Scoring

Parity is scored from 0 to 100:

| Dimension | Weight |
| --- | ---: |
| Unique record coverage | 60 |
| Ordering parity | 15 |
| Identity parity | 15 |
| Status parity | 10 |

`coveragePercentage` uses the intersection of matched completion identities divided by the union of identities across both collections.

`parity.exact` is true only when:

- Score is 100
- No duplicate records exist
- No unidentified records exist

The score is diagnostic. It does not grant adoption authority.

## Adoption Thresholds

### Measurement Ready

The adapter is measurement-ready when it returns deterministic structured data without mutations. Phase 4 meets this threshold.

### Candidate for Limited Shadow Runtime Measurement

Recommended minimum:

- Parity score at least 95
- Coverage 100%
- No missing legacy records
- No conflicting project identities
- All duplicate reductions explained by shared completion identity
- Ordering differences documented
- Status differences documented

This threshold permits only development or test diagnostics. It does not permit rendering adoption.

### Candidate for UI Adoption Review

Required before a later product review:

- Parity score 100 across representative fixtures and captured real datasets
- No missing or unidentified legacy records
- No unexplained extra records
- No conflicting identity
- Approved status-finality policy
- Approved presentation-field adapter
- Detail navigation preserves the expected legacy record
- Revenue and count authority remain unchanged or receive separate approval

Meeting the threshold still requires human review. It does not automatically authorize adoption.

## Remaining Blockers

1. Current writers do not propagate one completion identity to every history source.
2. Many records use source-local IDs.
3. Work Center display fields are outside the canonical history envelope.
4. Missing dates are handled differently by legacy and reconciled reads.
5. Reconciled chronological order differs from current source-bucket order.
6. Completion submission and confirmation have no approved display policy.
7. Revenue is not owned by the reconciled history model.
8. Completed Job Details expects the complete legacy record.
9. Real-data source adapters and parity datasets do not yet exist.

## Tests

`tests/workCenterHistoryShadowAdapter.test.js` covers:

- Exact parity
- Ordering differences
- Missing legacy records
- Extra reconciled records
- Duplicate reporting
- Status normalization and differences
- Missing identity
- No mutation

## Phase 5 Recommendation

Phase 5 should create a **pure Work Center history source and presentation adapter test harness**.

It should:

1. Convert representative schedule, `completedProjects`, and completed homeowner-request records into reconciliation input.
2. Preserve source labels and legacy ordering.
3. Produce the current Work Center card fields from reconciled `sourceRecords`.
4. Run `compareWorkCenterHistory()` against the legacy selector result.
5. Report field coverage, source precedence, count drift, and ordering drift.
6. Keep all output structured and read-only.

Phase 5 must not:

- Import the adapter into `ContractorDashboard.jsx`
- Change Work Center rendering
- Change displayed counts or revenue
- Write diagnostics to storage
- Select a completion-finality policy
- Adopt the reconciled model
