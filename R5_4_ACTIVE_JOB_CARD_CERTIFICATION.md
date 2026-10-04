# R5.4 Active Job Card Certification

Completed September 12, 2026, in `/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5`.

## Implementation and scope

The previous card styles retained a two-row lifecycle and generous spacing at wide usable widths. Overlapping viewport and earlier container rules also controlled card composition. The R5.4 change adds one scoped CSS block with sufficient specificity to make the existing Work Center content lane the authority for Active Job card composition.

1. **Architecture:** one existing card and one existing set of stage nodes reflow through CSS Grid. No JSX replacement, resize listener, conditional component, or new state was introduced.
2. **Container:** the existing `.work-center-content-lane`, named `work-center` with `inline-size` containment. Decisions use its actual width after the sidebar.
3. **Transitions:** below **560px**, narrow; **560–899px**, medium; **900px and above**, wide. At 560px there is room for identity beside the existing 44px action and a separate three-column state row. At 900px there is room for two useful summary columns and seven approximately 110px stage cells. Both boundaries were checked immediately below, at, and above the transition.
4. **Wide structure:** 80px avatar, flexible identity, flexible current state, intrinsic action column; lifecycle below. Padding is 14px, vertical gap 8px. The card fills its governed content region without adding a max-width or fixed height.
5. **Medium structure:** 72px avatar and identity beside the action; status, Next step, and Next up occupy a separate row; lifecycle below.
6. **Narrow structure:** avatar/identity, then state, action, and lifecycle. Names and titles wrap at normal word boundaries. Supporting text and lifecycle labels remain at least 14px.
7. **Wide lifecycle:** seven equal grid columns. Existing row wrappers use `display: contents`; stage nodes and lifecycle attributes remain mounted.
8. **Medium/narrow lifecycle:** existing four-stage first row and three-stage second row.
9. **Natural wide height:** both Chromium and WebKit measured normal cards at **200.56–218.75px** and long-content cards at **215.95–239.34px**. Long text can increase height naturally.
10. **Seven stages unchanged:** Evaluation, Quote, Deposit, Schedule, Work Plan, Complete Job, Invoice. Calculation, order, current/completed/future/locked truth, and the literal “Current status unavailable” presentation remain unchanged.
11. **Job authority unchanged:** existing Job data, exact Job object, and existing opening handler remain intact. One keyboard-accessible button remains, with visible focus and a 44px action affordance.
12. **Evaluation/Visit authority unchanged:** R5.3 scheduling work and prior R5.3B server changes were not edited.
13. **Search/Filter unchanged:** predicates, selected filter, query, and Filter & Views behavior remain intact. No opportunity predicate or count source changed.
14. **Job History/Revenue unchanged:** routing, ownership, calculations, and views were not edited. Quote, Deposit, Schedule, Work Plan, Complete Job, Invoice, and payment authority were not edited. Ask Meetro, sidebar, navigation, heading, and Opportunities presentation were not edited.

## Exact R5.4 files

15. **Production file changed:** `src/index.css` — only the appended block between the R5.4 markers. The candidate already contains earlier release changes; the full Git diff is not the incremental R5.4 file list.
16. **Tests added:**
    - `tests/workCenterActiveJobCards.test.js` — five tests for container architecture, wide layout, existing 4 + 3 nodes and stage order, exact opening handler/Job identity, and long/unavailable content.
    - `tests/browser/workCenterActiveJobCards.mjs` — browser geometry, wrapping, overflow, containment, action, mounted reflow, and keyboard regression fixture.

The existing browser and focused test files were run unchanged. This certification document is the only additional report file.

## Validation

17. **Focused tests: 34 passed, 0 failed, 0 skipped.**

    `node --test tests/workCenterActiveJobCards.test.js tests/workCenterResponsivePolish.test.js tests/workCenterPhysicalLayout.test.js tests/workCenterLanguageViews.test.js tests/workCenterResponsiveCapability.test.js`

18. **Browser responsive tests: passed in Chromium and WebKit.** Each engine passed 40 width/content checks: normal and long/unavailable content at actual lane widths **375, 430, 559, 560, 561, 600, 700, 768, 820, 899, 900, 901, 1024, 1100, 1180, 1280, 1366, 1440, 1512, 1728px**.

    Each engine also passed wide → medium → narrow → wide on the same mounted card, preserving Job ID, current stage, selected Job, query, and filter, with zero fixture fetches or navigation. Keyboard focus and Enter invoke the unchanged handler with the exact Job object. Checks cover all stages/order, tracker rows, readable words, state visibility, natural height, 44px target, sidebar containment, and Ask clearance. Additional overflow checks remove the shell's horizontal overflow masking at 375, 700, and 1100px.

    **Production-shell regression:** unchanged `tests/browser/workCenterPhysicalLayout.mjs` passed **8 viewport fixtures per engine** (375, 393, 430, 768, 820, 834, 1024, 1180px), including scroll/press stability, sidebar containment, Ask Meetro, and BottomNav clearance.

    **Fixture boundary:** the card matrix uses actual production card JSX and CSS inside a controlled React fixture. It lifts only the fixture's shell max-width cap to exercise requested lane widths through 1728px; the production shell normally caps the lane near 1328px. The separate production-shell fixture keeps that cap unchanged. These are browser fixture results, not a claim of physical-device or native iOS QA.

19. **Full client: 4,935 passed, 0 failed, 0 skipped** (`npm test`; baseline 4,930 plus five new tests).
20. **Staging build: passed** (`npm run build:staging`). Vite reports a non-fatal warning for chunks larger than 500kB.
21. **`git diff --check`: passed.**
22. **No server change.**
23. **No iOS build.**
24. **No commit.**
25. **No push.**
26. **No deployment.** Protected client was not modified. No reset, clean, or stash was performed.

## Evidence

- Focused tests: `/private/tmp/meetro-r54-focused.log`
- Full suite: `/private/tmp/meetro-r54-full.log`
- Staging build: `/private/tmp/meetro-r54-build.log`
- Card browser logs: `/private/tmp/meetro-r54-chromium.log`, `/private/tmp/meetro-r54-webkit.log`
- Card measurements and screenshots: `/private/tmp/meetro-r54-layout/`
- Shell browser logs: `/private/tmp/meetro-r54-shell-chromium.log`, `/private/tmp/meetro-r54-shell-webkit.log`
- Shell measurements and screenshots: `/private/tmp/meetro-r54-shell/`

Representative screenshots were visually reviewed at wide normal content (`chromium-1100.png`) and narrow long content (`webkit-375-long.png`).
