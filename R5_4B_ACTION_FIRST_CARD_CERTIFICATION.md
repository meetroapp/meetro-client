# R5.4B Action-first Active Job Cards

Candidate: `/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5`.

## Presentation

1. **Hierarchy:** customer and Job identity, existing current-status badge, Next step, Next up, then seven-stage progress. There is one existing Job-opening button, not a new action or mini-workspace.
2. **Responsive authority:** the existing `work-center` inline-size container on `.work-center-content-lane`. Transitions remain **560px** and **900px** of usable content width. No device detection, resize state, or alternate component was introduced.
3. **Wide, at least 900px:** avatar, identity, current state/action, and existing chevron share a compact primary row. Identity and state use flexible 1:1.2 columns; state receives enough room to avoid unnecessary status wrapping. Padding is 10px vertically and 14px horizontally; the tracker follows with a 6px gap.
4. **Medium, 560–899px:** identity beside the existing open affordance, then a separate status/Next step/Next up row, then the 4+3 tracker.
5. **Narrow, below 560px:** identity and metadata, state, open affordance, then the 4+3 tracker. Existing typography and natural wrapping remain readable. No fixed card height, hidden-overflow workaround, or transform was added.
6. **Next step:** the existing governed action text now uses 17px, weight 800, line-height 1.25, above the quieter 14px progress labels. It remains informational; no second CTA was added.
7. **Next up:** separate label and supporting value spans use the existing `workCenterActor` formatter. `responsibility.code === 'PROFESSIONAL'` displays localized “You”; `CUSTOMER` displays localized “Customer”; missing or other codes display localized “Unavailable”. This card no longer passes a display-label fallback as responsibility evidence. No authority record or responsibility calculation changed.
8. **Connected progress:** decorative `::after` lines connect adjacent existing stage nodes. A complete stage's outgoing line is green (`#0aa35f`), covering completed → completed and completed → current. Current/future outgoing lines are neutral (`#cbd5e1`). Lines stop before the circles, sit at indicator height, do not cross labels, and ignore pointer events. Existing current rings remain blue; current labels now also use blue and weight 800.
9. **Tracker width:** the card fills its governed region; progress is capped at **980px** and centered within it. Wide mode has seven equal cells with 8px gaps and six connectors. Wrapped mode retains four cells then three, with three and two connectors respectively. The Schedule → Work Plan connector appears only in the single-row layout. No diagonal/vertical wrap connector exists.
10. **Measured natural heights:** representative fixture results below. Long fixture content includes a long customer name/title and truthful unavailable-status text; it is allowed to expand.

| Actual lane | Chromium normal / long | WebKit normal / long |
| --- | --- | --- |
| 375px | 471.77 / 536px | 452.17 / 536px |
| 560px | 360.11 / 423.88px | 360.11 / 423.88px |
| 900px | 165.81 / 208.88px | 165.81 / 208.88px |
| 1024px | 165.81 / 191.38px | 165.81 / 208.88px |
| 1180px | 165.81 / 191.38px | 165.81 / 191.38px |
| 1728px | 165.81 / 191.38px | 165.81 / 191.38px |

11. **Seven stages unchanged:** Evaluation, Quote, Deposit, Schedule, Work Plan, Complete Job, Invoice. No stage determination or authority changed.
12. **Next-action authority unchanged:** existing `jobListPresentation.nextStepLabel` still supplies the text, through the existing language formatter.
13. **Responsibility authority unchanged:** only canonical responsibility codes drive the card's actor wording; no account-type inference or browser-local truth was introduced.
14. **Open Job handler unchanged:** exact existing handler and Job object are preserved, with one button, visible keyboard focus, and a 44px chevron affordance.

## Incremental files and validation

15. **Production files changed, two total:**
    - `src/index.css`: appended scoped R5.4B presentation block, 35 lines.
    - `src/pages/ContractorDashboard.jsx`: one card responsibility-markup line replaced; handler and data flow unchanged.
16. **Tests updated:**
    - `tests/workCenterActiveJobCards.test.js`: two additional tests for governed responsibility wording and action/progress CSS.
    - `tests/browser/workCenterActiveJobCards.mjs`: updated height target; measured connectors, current-ring/label styling, next-action hierarchy, bounded tracker width, and all seven current-stage presentations. Added the 650px lane case.

Existing earlier release modifications are retained in this candidate. Its full Git diff contains more than this incremental R5.4B scope. `WorkCenterLifecycle.jsx` was not changed. This document is the additional report file.

17. **Focused:** 36 passed, 0 failed, 0 skipped, running Active Job cards, responsive polish, physical layout, language/views, and responsive capability tests.
18. **Chromium:** 42 width/content checks plus 14 current-stage/connector checks passed, along with mounted reflow and keyboard opening. A concurrent-run startup timeout was followed by a successful isolated rerun without code changes.
19. **WebKit:** the same 42 + 14 checks, mounted reflow, and keyboard opening passed. Both engines also passed the unchanged physical-layout fixture's eight viewports, covering sidebar containment, scrolling/press stability, Ask Meetro, and BottomNav clearance.

The card matrix covers normal and long content at actual lane widths **375, 430, 559, 560, 561, 600, 650, 700, 768, 820, 899, 900, 901, 1024, 1100, 1180, 1280, 1366, 1440, 1512, 1728px**. It tests both sides of each transition. Separate inputs exercise every current-stage position at 900px and 560px, including completed/current/future connector colors and row boundaries. Wide → medium → narrow → wide preserves the same mounted card, Job ID, current stage, selected Job, query, and filter, with zero fixture fetches and navigation.

The component matrix uses production card JSX, lifecycle component, and CSS in a controlled browser fixture. Only the fixture's shell max-width cap is lifted to exercise lanes through 1728px; production shell sizing remains unchanged. The unchanged shell fixture covers 375, 393, 430, 768, 820, 834, 1024, and 1180px viewports. These results do not claim new physical-device or native iOS testing.

20. **Full client:** `npm test` passed **4,937 / 4,937**, with 0 failed and 0 skipped (4,935 baseline plus two tests).
21. **Staging build:** `npm run build:staging` passed. Vite reports a non-fatal warning for chunks larger than 500kB.
22. **Diff check:** `git diff --check` passed.

## Scope protections

Search, Filter & Views, Job History, Revenue, opportunity predicates, routing, payment logic, and all lifecycle/Visit authority remain unchanged. No changes to Opportunities, the Work Center heading, universal Ask Meetro launcher, sidebar, or navigation. Prior R5.3 and R5.3B work is preserved.

23. No server change.
24. No iOS build.
25. No commit, push, or deploy. Protected client was not modified; no reset, clean, or stash was performed.

Evidence logs use `/private/tmp/meetro-r54b-*.log`. Browser measurements/screenshots are in `/private/tmp/meetro-r54b-layout/`; shell results are in `/private/tmp/meetro-r54b-shell/`. Wide normal and narrow long-content screenshots were visually inspected.
