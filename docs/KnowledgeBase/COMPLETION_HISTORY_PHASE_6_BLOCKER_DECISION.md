# Completion to History Phase 6 Blocker Decision

## Decision

Work Center runtime adoption of reconciled History is **BLOCKED**.

The read-only architecture is mature enough to characterize the problem:

- `historyReconciliation.js` provides a conservative canonical read model.
- `workCenterHistorySourceAdapter.js` reproduces the current source buckets.
- `workCenterHistoryPresentationAdapter.js` characterizes current card fields.
- `workCenterHistoryShadowAdapter.js` measures coverage, identity, ordering,
  status, duplicates, and provenance.
- The Phase 5 harness proves that the pipeline is pure and deterministic.

The remaining blockers are not adapter defects. They are missing workflow
identity, unresolved completion semantics, reporting authority, and legacy
detail-screen dependencies. Further runtime adoption work would require
product or authority decisions that this track is not permitted to make.

## 1. Why Work Center Adoption Is Blocked

Work Center currently treats several incompatible records as completed
history:

- Completed schedule records
- `completedProjects`
- Completed homeowner requests
- Stored completed-job counters and revenue
- Completion workflow cards and events
- Emergency completion records
- Conversation and Project Folder records

These records do not consistently share one `projectId`, `completionId`,
authoritative timestamp, or completion state. The reconciler correctly keeps
unmatched records separate. As a result, direct adoption can change visible
counts, ordering, labels, customer/project display, and detail navigation.

The current UI also displays every completed-list record as `Completed`, while
the canonical model distinguishes `submitted`, `awaiting_confirmation`,
`completed`, and `confirmed`. Choosing which states belong in final History is
a product and workflow-authority decision.

## Blocker Table

| Severity | Category | Blocker | Current evidence | Required resolution | Safe to defer? |
| --- | --- | --- | --- | --- | --- |
| Critical | Identity | No shared completion identity across schedule, saved completion, homeowner request, workflow event, and emergency record. | Source adapter preserves different source-local IDs; reconciliation cannot safely merge them. | Propagate one immutable `completionId` from the owning completion transition to every projection. | No |
| Critical | Identity | Canonical `projectId` is absent, inferred, or conflicting in completion sources. | Phase 5 classifies identity provenance as blocked. | Establish authoritative project identity before completion and preserve it through closeout. | No |
| Critical | Workflow semantics | No approved event makes History final. | Legacy UI says Completed while closeout can remain awaiting customer confirmation. | Approve submitted, follow-up, confirmed, and exception transitions and define History eligibility. | No |
| Critical | Counts | Legacy count semantics and reconciled unique-completion semantics differ. | Legacy suppresses some homeowner requests by `requestId || id`; reconciliation merges only completion identity. | Define one completed-job counting rule and prove parity against representative data. | No |
| Critical | Revenue | Reconciled History has no revenue authority. | Revenue can come from schedule amount, completion record, accepted quote, or stored totals. | Define reporting/revenue recognition separately from History and preserve current totals until approved. | No |
| High | Ordering | Legacy source-bucket order differs from reconciled chronological order. | Phase 5 harness demonstrates deterministic ordering drift. | Approve an ordering contract and address missing authoritative timestamps. | No, if adoption must be visually unchanged |
| High | Detail navigation | `CompletedJobDetails.jsx` expects a rich legacy object and scalar storage fallbacks. | Presentation adapter can preserve a reference, but schedule/event records can be too thin. | Define a stable completed-job detail read contract with complete field coverage. | No |
| High | Presentation | Customer, title, location, and completion date can be absent or disagree. | Presentation adapter reports missing fields rather than inventing current fallbacks. | Approve deterministic presentation precedence and missing-field behavior. | No |
| High | Source coverage | Emergency completion and real workflow-event combinations lack representative parity fixtures. | Phase 5 covers the three main Work Center buckets only. | Add sanitized representative fixtures and prove no records disappear. | No |
| Medium | Presentation | Category and source labels are compatibility values rather than canonical fields. | Adapter can reproduce them from source records. | Keep them in a presentation adapter until a future project display contract exists. | Yes |
| Medium | Provenance UX | Work Center does not display provenance quality or identity warnings. | Shadow reports already expose these findings. | Keep warnings diagnostic until a product-facing recovery experience is designed. | Yes |
| Low | Pagination | Current completed-work pagination copy is static. | Independent of the canonical history read contract. | Correct during a later UI quality phase. | Yes |

## 2. Identity-Related Blockers

### Must Fix

1. Every completion projection must carry the same immutable `completionId`.
2. Every completion must carry an authoritative `projectId`.
3. Schedule, request, conversation, emergency, and completion records must
   preserve their own IDs separately from project and completion identity.
4. Completion workflow events and completion records must reference the same
   completion identity.
5. Identity conflicts must stop adoption rather than be resolved by title,
   customer, location, date, or source order.

### Current Limitation

The adapters can preserve source-local identity and report provenance. They
cannot convert a schedule ID or request ID into a canonical completion ID
without changing identity authority.

## 3. Presentation-Related Blockers

The current Work Center card expects:

- Category
- Title or service
- Customer/homeowner label
- Location
- Completion date and time
- Completed status label
- Revenue

The canonical history read model intentionally owns only completion identity,
project identity, completion date, customer, status, provenance, and source
records.

The presentation adapter can reconstruct representative cards, but it cannot
guarantee:

- A valid project title
- A customer label that is not a location fallback
- A real completion date
- Agreement among source records
- A product-approved mapping from canonical status to visible status

Presentation precedence can remain an adapter concern. Completion eligibility
and missing-field behavior require approval before adoption.

## 4. Revenue and Count-Related Blockers

### Counts

Current count sources include:

- Length of the assembled Work Center list
- `completedJobsCount`
- Completed schedules
- Completed homeowner requests
- Saved completion records

Retries and competing writers can inflate these sources independently. A
reconciled unique-completion count will differ whenever completion identity is
missing or not shared.

### Revenue

Current revenue sources include:

- Schedule `amount`
- Completion `revenue` or `amount`
- Accepted quote amount
- `totalJobRevenue`

History reconciliation must not choose which value controls recognized
revenue. Work Center adoption cannot replace current summaries until a
separate reporting projection and parity decision exist.

## 5. Detail-Navigation-Related Blockers

`CompletedJobDetails.jsx` reads:

- `lastCompletedProject`
- Scalar `completedJob*` keys
- Photos
- Notes
- Material cost
- Payment state
- Accepted quote data
- Professional and review fields

The Phase 5 presentation adapter retains a cloned `legacyDetailReference`,
which is sufficient for characterization but not for runtime adoption.

Before adoption:

1. Every visible history row must resolve a detail-capable record.
2. The detail handoff must use stable project/completion identity.
3. Missing rich fields must not be silently taken from stale scalar keys.
4. Schedule-only and workflow-event-only records need an approved detail
   projection.
5. Homeowner and professional detail views must resolve the same completion
   while preserving role-specific visibility.

## 6. What Can Be Safely Deferred

The following do not need to block identity and workflow design:

- Replacing category/source compatibility labels with canonical display data.
- Product-facing provenance warnings.
- UI extraction of the large Work Center page.
- Pagination and static count-copy cleanup.
- Visual changes to cards or Completed Job Details.
- Removing legacy keys.
- Consolidating Project Folder with completed-work history.
- Historical destructive migration or backfill.

These items must remain unchanged until the required identity and workflow
prerequisites are complete.

## 7. What Must Be Fixed Before Adoption

### Fix-Before-Adoption Checklist

- [ ] One authoritative `projectId` exists before completion begins.
- [ ] One immutable `completionId` is created by the completion owner.
- [ ] The same `completionId` reaches every History projection.
- [ ] Completion event ID and completion entity ID have distinct documented
      roles.
- [ ] An authoritative `recordedAt` exists for ordering.
- [ ] Completion submitted, awaiting confirmation, follow-up, confirmed, and
      exception states are approved.
- [ ] The exact state or event eligible for final History is approved.
- [ ] Standard, emergency, and manual-customer completion exceptions are
      documented.
- [ ] Representative source fixtures show 100% legacy-record coverage.
- [ ] No legacy record disappears without an explained shared completion ID.
- [ ] No conflicting project identity remains.
- [ ] Count differences are understood and approved.
- [ ] Revenue remains on the existing authority or an approved reporting
      projection.
- [ ] Presentation fields have deterministic precedence and missing-value
      behavior.
- [ ] Every row has a safe detail-navigation contract.
- [ ] Homeowner and professional views agree on completion identity and state.
- [ ] Work Center parity is reviewed manually before any render switch.

Passing the checklist permits an adoption review. It does not automatically
authorize runtime adoption.

## 8. Should Completion to History Pause?

### Recommendation: Pause Runtime Adoption

Completion to History should pause at the current read-only foundation.

Continue to preserve and use the Phase 2-5 utilities for tests and future
parity analysis, but do not:

- Import them into Work Center pages
- Read live storage through them
- Add runtime diagnostics
- Switch counts, ordering, labels, or detail handoff
- Change completion writers as part of this track

The track should resume only after two prerequisites exist:

1. A human-approved completion finality state machine.
2. Prospective project/completion identity propagation from the owning writer.

Additional adapter work without those prerequisites would measure the same
known gaps rather than reduce TestFlight risk.

## 9. Recommended Next TestFlight-Safe Track

### Lead Phase 2: Information and Appointment Gate Definition

This is the recommended next track because appointment-before-quote bypass is
a top TestFlight blocker and the phase can remain pure and warning-only.

Safe scope:

1. Define a pure quote-eligibility policy using existing lead, appointment,
   visit-outcome, and exception evidence.
2. Report missing information, missing completed appointment, missing outcome,
   unsafe identity, and emergency exclusion.
3. Add tests for standard, emergency, incomplete, scheduled-only, completed,
   exception, and conflicting-identity scenarios.
4. Do not block quote creation or sending.
5. Do not change UI, storage, routing, or writers.
6. Stop if William must approve an appointment-before-quote exception.

Why this is safer than continuing Completion to History:

- It addresses an active workflow-ordering risk without changing persistence.
- It does not depend on selecting History or revenue authority.
- It can produce a tested contract before enforcement.
- It avoids `ContractorDashboard.jsx` runtime adoption.
- It creates upstream workflow evidence that future completion identity will
  eventually depend on.

Manual Customer Phase 1 remains an appropriate later pure contract track, but
Lead Phase 2 addresses the more immediate TestFlight workflow bypass.

## Pause/Continue Recommendation

| Area | Decision | Reason |
| --- | --- | --- |
| History reconciliation utilities | CONTINUE TO PRESERVE | Tested pure foundation remains useful. |
| Work Center shadow adapters | PAUSE DEVELOPMENT | Known gaps now require authority and identity changes. |
| Work Center runtime adoption | BLOCKED | Would change visible behavior and data semantics. |
| Completion writer migration | BLOCKED | Finality and identity ownership remain unresolved. |
| Lead Phase 2 warning-only policy | CONTINUE NEXT | Highest-value safe contract work without runtime enforcement. |

## Next Roadmap Recommendation

1. Run Lead Phase 2 as a pure warning-only eligibility contract.
2. Hold a product review for completion finality and appointment-before-quote
   exceptions.
3. Define prospective canonical project and completion identity at the owning
   workflow boundary.
4. Resume Completion to History with identity propagation tests, not UI
   adoption.
5. Re-run the Phase 5 harness on representative standard, emergency, and
   manual-customer fixtures.
6. Consider Work Center runtime adoption only after the fix-before-adoption
   checklist passes.

## Final Classification

| Category | Status |
| --- | --- |
| Read-only reconciliation foundation | READY |
| Shadow comparison infrastructure | READY |
| Presentation characterization | PARTIAL |
| Completion identity | BLOCKED |
| Project identity | BLOCKED |
| Count and revenue safety | BLOCKED |
| Detail navigation safety | BLOCKED |
| Work Center runtime adoption | BLOCKED |

Completion to History has completed the safe characterization stage. The
correct decision is to pause adoption, resolve upstream identity and workflow
authority, and redirect immediate TestFlight work to Lead Phase 2.
