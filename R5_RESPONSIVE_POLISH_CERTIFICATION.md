# R5 Work Center responsive polish certification

Work performed only in `/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5`.
The checkout already contained prior release work; the lists below identify only files touched by this polish pass.

## Canonical count and routing contracts

- **New:** `responseSubmissionAvailable === true && hasResponded === false` on the normalized authenticated opportunity collection. The existing normalizer certifies submission availability using the server's no-response fields, absence of a response identity, and available submission flag.
- **Awaiting Response:** `status === "open" && hasResponded === true && responseStatus === "submitted" && relationshipStatus === "pending" && responseSubmissionAvailable === false`. The existing normalizer only grants `hasResponded` after validating the canonical response identity and submitted/pending field combination. Closed, selected, malformed, or contradictory records are excluded.
- **New/Awaiting count source:** the confirmed records from `subscribeProfessionalOpportunities`, backed by authenticated `/professional-request-opportunities`. `updatedAt > 0` is required before presenting a number. An unavailable initial source shows an em dash; confirmed empty data shows zero. Existing confirmed records remain usable during refresh failure.
- **Scheduled count source:** `getProfessionalScheduleCounts(professionalScheduleSource.confirmed).today + .upcoming`. These existing groups contain canonical visits with `semanticState === "SCHEDULED"`, grouped using their scheduled date and time zone.
- **New destination:** `businessLeads?opportunityFilter=new`.
- **Awaiting destination:** `businessLeads?opportunityFilter=awaiting-response`.
- **Scheduled destination:** existing `openWorkTab("schedule")` and `ProfessionalScheduleWorkspace`.
- The unfiltered banner action opens `businessLeads`. Its headline is now “Opportunities,” without the redundant total.
- Unknown or duplicate filter query values fall back to All Opportunities. Filter state is presentation only; no filter is stored as workflow authority.
- `pendingProjectRequests`, browser-stored homeowner requests, and `opportunitiesCount` are absent from the opportunity tile markup and count authority. Legacy uses elsewhere were not expanded or used for these tiles.

## Root causes and changes

The previous tracker divided every lane into seven columns. Phone titles also lost a column to the chevron, while tablet rules imposed width minimums without accounting for the sidebar. Older tablet selectors overrode the initial replacement grid. The header had competing fixed/implicit tracks and wrapping rules. The alert badge was absolutely positioned. The assistant's right edge was constrained, but its saved vertical drag coordinate could still cross content. Completion metrics could wrap three values into a two-column gray grid and leave an empty cell.

The shared tracker now renders the same canonical array in two rows: Evaluation / Quote / Deposit / Schedule, then Work Plan / Complete Job / Invoice. Content-container queries choose card layouts from actual available width. Narrow cards give actions a separate row; identity text retains its width. Job Overview status, next step, and responsibility receive distinct rows. The pending completion next-step caption is “Complete Job”; the canonical status label is preserved.

Work Center scrolls above a reserved bottom dock, sized using the existing visual-viewport bottom-gap and safe-area variables. The universal launcher uses that dock on Work Center; its saved drag positions and existing expansion behavior remain available elsewhere. Entry/back/tab scrolling targets the Work Center scroll surface when needed. No new assistant was added.

Completion metrics show three equal cells when space permits and three full-width rows in narrow lanes. The canonical review component's requests, blockers, confirmation, idempotency, and completion commands were not changed.

## Production files changed (7)

- `src/utils/opportunityPresentationFilters.js` — added bounded predicates, counts, and query routes.
- `src/pages/BusinessLeads.jsx` — canonical filtered list and accessible filter controls.
- `src/pages/ContractorDashboard.jsx` — confirmed count subscription, functional tiles, card action placement, completion caption, and scroll targeting.
- `src/components/WorkCenterLifecycle.jsx` — two rows from the existing seven-stage array.
- `src/components/ProfessionalCompletionReview.jsx` — metrics styling hook only.
- `src/components/MeetroAssistant.jsx` — reserved Work Center dock presentation.
- `src/index.css` — responsive card/header/tracker/banner/metrics/dock sizing.

## Test files changed (6)

- Added `tests/workCenterResponsivePolish.test.js`: 11 tests covering canonical predicates and malformed evidence, confirmed/unavailable counts, bounded routes, actual production tile handlers, rendered tracker rows/states, Job/alert control continuity, layout contracts, dock behavior, and three meaningful review cells.
- Added `tests/helpers/workCenterPolishFixture.js`: extracts and renders production JSX with controlled test data; it does not duplicate production markup.
- Updated `tests/workCenterR5LifecyclePresentation.test.js`: two-row layout contract.
- Updated `tests/workCenterCompanionContainment.test.js`: reserved Work Center dock and content clearance.
- Updated `tests/workCenterResponsiveCapability.test.js`: current dock contract.
- Updated `tests/companionAccountTypeBehavior.test.js`: docked Work Center with account drag persistence elsewhere.

## Validation

- Focused Work Center, responsive, routing, completion, Work Plan, Invoice boundary, canonical opportunities, and response tests: **202/202 passed**.
- Additional account/launcher compatibility group: **5/5 passed**. Combined focused total: **207/207**.
- `npm test`: **4,908/4,908 passed**, zero failures, cancellations, or skips (baseline 4,897; 11 added tests).
- `npm run build:staging`: **passed**. Vite reports its large-chunk advisory.
- `git diff --check`: **passed**.
- No server code, canonical lifecycle resolver, response-submission API, payment logic, or financial authority changed.
- No commit, push, deployment, reset, clean, or stash performed. Protected original repository untouched.

## Automated browser layout results

Headless Chrome rendered production JSX fixtures with the real CSS and a controlled sidebar/navigation shell. This is component layout evidence, not a full authenticated end-to-end session and not physical-device QA.

| Target | Viewport | Result |
| --- | --- | --- |
| Small iPhone | 375 × 812 | No horizontal overflow, word fragments, or overlapping status fields |
| Large iPhone | 430 × 932 | Same checks passed |
| Small iPad portrait, sidebar active | 768 × 1024 | Same checks passed |
| iPad portrait, sidebar active | 820 × 1180 | Same checks passed |
| Small iPad landscape, sidebar active | 1024 × 768 | Same checks passed |
| iPad landscape, sidebar active | 1180 × 820 | Same checks passed |
| Web, sidebar active | 1440 × 1000 | Same checks passed |

The work scroll surface ended 14px above the launcher in all seven fixtures. Metrics rendered without a blank fourth cell. Browser range measurements found no lifecycle words split across lines. All document widths matched their viewports and no inspected content element overflowed its client width.

Browser evidence: `/tmp/meetro-polish-browser-results.json` and `/tmp/meetro-polish-<target>.png` / `-detail.png`. The local runner is `/tmp/meetro-polish-browser.mjs`.

## Physical-QA checklist — pending

### iPhone, small and large

- [ ] Work Center landing: compact Opportunities banner, one count per tile, Search/Filter, Active Jobs.
- [ ] Tap New and Awaiting Response; confirm correct canonical records and matching counts. Refresh/deep-link each filter; invalid filters fall back safely.
- [ ] Tap Scheduled; confirm existing Schedule workspace opens.
- [ ] First and second Job cards: titles wrap naturally; chevron and alert badge open the exact Job.
- [ ] Tracker: first row has four stages, second row three; no fragmented words or clipped indicators.
- [ ] Scroll through cards and detail; Ask Meetro never crosses controls. Open/close keyboard and Ask; preserve context and bottom-nav clearance.
- [ ] Existing bottom navigation works unchanged.

### iPad portrait

- [ ] Sidebar remains separated; Opportunities tiles and Active Jobs fit the content lane.
- [ ] Job Overview shows identity, status, Complete Job next step, and Professional responsibility without overlap or repeated status-as-next-step.
- [ ] Tracker remains two rows and readable.
- [ ] Completion Review shows 1/1 Work Completed, None Outstanding items, and Up to date Customer updates without an empty fourth cell.
- [ ] Marketplace and external-customer review both show the governed owner; Invoice remains locked before JOB_COMPLETED.
- [ ] Ask dock remains clear during scrolling, keyboard use, and split-view resizing.

### iPad landscape

- [ ] Repeat the portrait checks after rotation and at smaller landscape widths.
- [ ] Identity/status columns remain readable; controls and lifecycle words are not clipped or crushed.
- [ ] Job Overview, Complete Job controls, Invoice lock, and assistant dock do not overlap.
- [ ] Rotate back to portrait without losing the selected Job or restarting its interaction.
