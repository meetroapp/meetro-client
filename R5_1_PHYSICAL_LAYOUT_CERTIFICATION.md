# R5.1 Work Center physical-QA layout correction

Checkout: `/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5`

This report covers only the R5.1 delta. The checkout already contained earlier release changes. No protected original repository was modified. No commit, push, deployment, reset, clean, or stash occurred.

## Findings and corrections

| Finding | Source evidence and correction |
| --- | --- |
| iPad sidebar/content overlap | **Exact physical-device cause remains unconfirmed.** The outer `.contractor-dashboard` owned `container: work-center / inline-size` while also containing BottomNav's fixed sidebar. Query containment is now on the existing inner `workCenterPanelRef` wrapper, with `min-width: 0; width: 100%`. The sidebar is outside that containment. BottomNav retains sole ownership of the existing sidebar-width subtraction, maximum width, and margin contract. No second sidebar offset or viewport authority was introduced. |
| Opportunities squeezed | The narrow-container rule forced `40px + flexible content + 112px CTA`. The new rule uses icon/title, copy, a full-width CTA row, then the existing three tiles. It responds to the available content lane. |
| CTA word splitting | The 112px column plus inherited `overflow-wrap: break-word` split “Opportunities” in Poppins. Reproduced in the pre-fix browser fixture. The CTA now explicitly uses normal word wrapping and no hyphenation; its constrained-lane row spans both columns and remains at least 44px tall. |
| iPhone top blank space | The shared safe-area selector applied to both the outer `.app-page`/`.contractor-dashboard` and nested `.work-center-dashboard`. With a simulated 44px top inset, two 56px reservations put the title at 112px. The outer page now reserves safe area once; the nested overview has zero block padding and block margin. The title measures 56px. The same rule also replaces the outer 72px opening at wider widths. |
| Oversized Ask dock | Previous reserve: navigation/viewport clearance + 8px + 76px, plus outer 24px bottom padding, overview padding/margin, and BottomNav's separate invisible content spacer. The spacer duplicated a reservation inside an already-height-bounded scroll surface. The new dock is exactly 62px beyond navigation/viewport clearance. The local spacer is hidden, overview block spacing removed, and scroll-surface bottom padding reduced to 8px. |
| iPhone card shake | **Confirmed interaction defect:** unqualified `.work-center-job-card:hover` changed shadow from `0 8px 24px rgba(17,24,39,.06)` to `0 13px 30px rgba(20,53,31,.11)` and changed border color. WebKit touch input latched this style; mid-page fixtures retained the changed shadow. The hover paint change now requires `(hover: hover) and (pointer: fine)`. Keyboard focus outline remains. This explains a visible touch paint jump; it does **not** establish that every aspect of the physical scrolling shake has been reproduced. |
| Scroll stability | After the hover correction, card left position, width, height, border width, shadow, transform, scale, translate, filter, backdrop filter, animation, and transition remain unchanged through pressed/touched states and five scroll positions. Only the vertical scroll offset changes. No translateZ workaround or global scrolling-effect disable was added. The fixed Work Center launcher also no longer inherits desktop presence animation, keeping it within the bounded dock. |

The sidebar hypothesis is compatible with historically engine-dependent positioning/painting under query containment, but it is not certified as the physical root cause. The original overlap did not reproduce in Chrome, WebKit 26.5, or WebKit 18.2 fixtures. WebKit documents related containment issues ([positioned descendants](https://bugs.webkit.org/show_bug.cgi?id=286237), [painting versus measured layout](https://bugs.webkit.org/show_bug.cgi?id=274144)); these references are diagnostic context, not proof about this device. The affected iPadOS version was requested for follow-up.

## Exact dock calculation

- Phone base: existing `--meetro-visual-viewport-bottom-gap` + existing `--meetro-bottom-nav-height` (which includes bottom safe area).
- Tablet/desktop base: existing viewport bottom gap + bottom safe-area inset.
- Launcher height: 50px. Gap: 6px on each side.
- Scroll-surface height: `100dvh - base - 50px - 2 * 6px`.
- Launcher bottom: `base + 6px`.
- Dock beyond base: **62px**, reduced from 84px; the duplicate internal navigation spacer is also removed.
- No new viewport listener or layout coordinator. Existing visualViewport/keyboard inputs continue to supply the base.

## Production files changed in R5.1 — 3

- `src/index.css`: containment placement, CTA layout, safe-area/dock spacing, pointer-qualified card hover, bounded launcher animation.
- `src/pages/ContractorDashboard.jsx`: class on the existing content wrapper only.
- `src/components/MeetroAssistant.jsx`: Work Center launcher bottom uses the shared dock gap.

No lifecycle, canonical nextAction, completion, payment, Invoice gate, opportunity predicate/count/routing, Schedule authority, server, or Universal Ask authority logic changed. All seven lifecycle labels and the 4+3 presentation remain. Opportunity tile actions and Completion Review behavior are covered by the retained tests.

## Test files changed in R5.1 — 5

- New `tests/workCenterPhysicalLayout.test.js`: four bounded shell, CTA, safe-area/dock, and touch-style regressions.
- New `tests/browser/workCenterPhysicalLayout.mjs`: standalone browser geometry/input fixture.
- Updated `tests/workCenterResponsivePolish.test.js`: shared dock calculation expectation.
- Updated `tests/workCenterCompanionContainment.test.js`: shared dock and launcher calculation expectations.
- Updated `tests/workCenterResponsiveCapability.test.js`: shared dock calculation expectation.

The browser fixture reuses production JSX through the existing helper, actual Poppins fonts, page/sidebar/launcher style objects, and BottomNav's late shell stylesheet. Navigation remains inside the outer page as in production; navigation text is simplified. It is a layout fixture, not an authenticated end-to-end application session. It tests actual shell styles and separately removes pre-existing global horizontal overflow masking to expose width defects. Safe-area inputs are simulated at 44px top / 34px bottom; they are not device measurements.

## Automated results

- Focused command: `node --test tests/workCenter*.test.js tests/companionAccountTypeBehavior.test.js tests/jobCompletionUx.test.js tests/jobCompletionApi.test.js tests/ipadAppLayout.test.js` — **319/319**, no failures/skips.
- Full command: `npm test` — **4912/4912**, no failures/skips (baseline 4908 + four new tests).
- `npm run build:staging` — **passed**. Existing large-chunk advisory remains.
- `git diff --check` — **passed**.
- Browser matrix: **375, 393, 430, 768, 820, 834, 1024, 1180px**. Chrome and WebKit 26.5 pass all eight widths. WebKit 18.2 compatibility run also passes all eight.
- Tablet shell widths after the rail: 548, 598.6, 608.8, 784, and 940px respectively. Banner, CTA, and all lifecycle labels remain inside those lanes.
- No CTA word fragments, hidden lifecycle labels, document overflow, card geometry changes, or launcher/card overlap in the fixtures. Each first-card lifecycle renders four stages then three. Measured scroll-surface-to-launcher gap is 6px.

Logs: `/tmp/meetro-r51-focused.log`, `/tmp/meetro-r51-full.log`, `/tmp/meetro-r51-build.log`.
Screenshots and geometry/input evidence: `/tmp/meetro-r51-layout/`, `/tmp/meetro-r51-legacy-after/`.
Pre-fix diagnostic evidence: `/tmp/meetro-r51-webkit-before/`, `/tmp/meetro-r51-legacy-before/`.

Run the browser fixture with an installed Playwright module:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs BROWSER_ENGINE=webkit node tests/browser/workCenterPhysicalLayout.mjs
```

For system Chrome, use `BROWSER_ENGINE=chromium` and set `BROWSER_EXECUTABLE` to its executable. Browser dependencies were installed outside this repository; no package manifest or lockfile changed.

## Physical-QA status

**No physical-device PASS is claimed.** Repeat QA on the real iPhone and iPad after a new build. Specifically verify the reported sidebar painting/overlap and continuous scroll shake; exact attribution of the physical iPad defect remains open. This task did not generate, install, or deploy a new native build.
