# Completion to History Phase 2 Reconciliation

## Purpose

`src/utils/historyReconciliation.js` provides a pure, read-only history projection over fragmented completion sources. It does not read browser storage, write data, select a new workflow authority, or change any runtime page.

The utility prepares Completion to History for measurement while writer migration remains blocked.

## Reconciliation Strategy

The public API is:

```js
reconcileHistory({
  completions,
  workflowEvents,
  projects,
  conversations,
})
```

It returns history records with this read shape:

```js
{
  id,
  projectId,
  completionId,
  completionDate,
  customer,
  status,
  provenance,
  sourceRecords,
}
```

The projection:

1. Treats supplied completion records as history candidates.
2. Includes workflow events only when they carry a completion event type or completion payload.
3. Reads direct `projectId` values before considering explicit request-to-project or conversation-to-project links.
4. Resolves completion identity from `completionId` or `completionRecordId`, with legacy record `id` retained as a labeled fallback.
5. Merges records only when they share the same resolved completion identity.
6. Does not merge by title, customer, date, status, or conversation ID.
7. Preserves unknown and incomplete completion records as separate history entries.
8. Sorts valid completion dates newest-first and leaves undated records last.
9. Deeply clones source records so callers cannot mutate legacy input through the projection.

## Provenance Reporting

Each history record reports:

- Overall quality: `HIGH`, `MEDIUM`, or `LOW`
- Project identity trust
- Completion identity trust
- Completion date trust
- Resolution source for each field
- Structured warnings
- Number of duplicate source records merged

Field trust values are:

- `AUTHORITATIVE`: the canonical field is directly present.
- `INFERRED`: an explicit legacy relationship supplied the value.
- `FALLBACK`: a legacy alias or generic record field supplied the value.
- `CONFLICTING`: explicit sources disagree.
- `MISSING`: no safe value is available.

This provenance is diagnostic. It does not grant persistence or workflow authority.

## Identity Limitations

Current completion records frequently lack canonical `projectId` and `completionId`.

The reconciler may follow an explicit request-to-project or conversation-to-project relationship supplied in the input. Such a result remains `INFERRED`; it is not promoted to authoritative identity.

The utility deliberately does not:

- Infer projects from titles, customer names, locations, or dates.
- Treat `conversationId` itself as a project ID.
- Treat a saved or archived conversation as proof of confirmed completion.
- Treat a schedule ID, request ID, or emergency ID as a canonical completion ID.
- Merge records that merely look similar.

Records without safe identity remain visible with warnings.

## Provenance Limitations

Legacy `completedAt` and `createdAt` values are client timestamps. They are preserved as fallback completion dates, not treated as persistence-owned `recordedAt`.

Legacy generic record IDs can help identify repeated copies of the same completion record, but they remain fallback identities. A future canonical completion writer must provide an immutable `completionId` and event ID.

The reconciler can identify conflicts but cannot decide which conflicting source is correct. That remains an ownership and product decision.

## Future Adoption Risks

- Work Center and Project Folder currently assemble different history collections.
- Completion submission and customer confirmation are not consistently separated.
- Direct completion writers produce different side effects and record shapes.
- Emergency completion includes archive, dispatch, and review effects.
- Stored reporting counters can disagree with reconciled records.
- Adopting this projection before measuring real source coverage could hide records expected by current pages.
- Treating inferred identity as canonical would make future writer migration unsafe.

No page should consume this utility until source adapters and parity reports demonstrate that current records remain visible and ordered as expected.

## Test Coverage

`tests/historyReconciliation.test.js` verifies:

- Assembly from completion records and completion workflow events
- Preservation of records missing project identity
- Duplicate merging by completion identity only
- Deterministic newest-first ordering
- Inferred and conflicting provenance reporting
- Deep no-mutation behavior

## Phase 3 Recommendation

Phase 3 should remain shadow-only.

Create source adapters that read the existing completion, schedule, homeowner request, conversation closeout, emergency, and Project Folder collections into `reconcileHistory()`. Then produce a reconciliation report comparing:

- Legacy Work Center history count
- Legacy homeowner history count
- Project Folder record count
- Reconciled unique completion count
- Missing project identity
- Missing completion identity
- Submitted versus confirmed status
- Duplicate completion records
- Cross-source project conflicts
- Reporting counter drift

Do not render the reconciled history, change storage, or migrate completion writers in Phase 3.
