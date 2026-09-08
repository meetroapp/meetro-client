# Quote & Invoice mobile flow redesign

Baseline and current HEAD: `c45e26d7a039033ef2d4d6ffe6c0c3d16047d6e7`.
Worktree: `/private/tmp/meetro-home-dashboard-ask-meetro`.

## Implementation

Restyled the New Quote customer sheet, External Customer choice, searchable external customer list, conversation workspace, save-before-leaving dialog, and Saved Quotes & Invoices drawer. The new stylesheet is limited to the existing mobile layout in portrait at widths up to 767px. It reuses the bundled Poppins font, Meetro icons, existing viewport/keyboard variables, and navigation shell.

The only customer-selection wiring addition filters the already-authorized external customer options locally by name, company, email, or phone. Selected contact and relationship objects still reach the existing exact-selection handler unchanged. Example customer names live only in test fixtures.

The save-status presentation now prioritizes the existing dirty flag over a previous saved timestamp or Working draft label, while retaining the existing Job-source exception. No dirty-state computation, save operation, or document authority was changed. The composer gained an accessible label.

All 108 named functions inside the existing Quote/Invoice workspace are byte-identical to HEAD. QuoteBuilder, lifecycle utilities and APIs were not edited. SHA-256 comparison confirms all 31 files from the preceding Home/Ask work remain byte-identical to their pre-continuation state.

## Original redesign validation

| Check | Result |
| --- | --- |
| New mounted mobile-flow integration suite | 11 passed |
| Broad document/mobile focused suite | 913 passed |
| Full `npm test` | 4,645 passed, 0 failed |
| Changed-file ESLint comparison, 28 JavaScript files | 0 added diagnostics; baseline and current: 463 errors, 15 warnings |
| Repository `npm run lint` | Existing failure: 825 errors, 31 warnings |
| `npm run build:staging` | Passed; existing large-chunk warning |
| `git diff --check` | Passed |

The new tests mount the real workspace and mock only authenticated HTTP at the API boundary. They exercise both customer types, Add New entry, search and exact selection, Back/Cancel, actual proposal/apply/edit/revision history, document and preview tabs, all three leave choices, saved search/filters/open, and exact archive confirmation. They verify no document writes from customer selection or proposal Apply, one private-save POST from Save Draft & Exit, and only the existing version-bound DELETE after archive confirmation.

## Final automated mobile-width gate

The approved automated portrait matrix is **375 / 390 / 393 / 428px**, with viewport inputs of 375×812, 390×844, 393×852, and 428×926. A single parameterized test body runs once per width using the existing mounted workspace harness. Each case supplies window and document viewport inputs to the production `getAppLayoutSnapshot` and `applyAppLayoutDiagnostics` helpers, then verifies the selected mobile/portrait mode, width diagnostics, and viewport-height variable.

At every width, actual UI handlers reach and render all six governed states: New Quote, External Customer choice, existing customer list, Quote conversation, save-before-leaving dialog, and Saved Quotes & Invoices. Assertions cover the dialog step/title, customer rows and search, selected Conversation state and composer, unsaved status, leave actions, saved search/filters/rows, and GET-only requests. This is **24 state/width combinations** across four named tests, in addition to the existing 11 flow tests.

These deterministic jsdom assertions prove presentation selection and DOM reachability/renderability. They do not prove CSS media-query application, pixel geometry, overflow, clipping, or native keyboard behavior. The existing automated mobile-fit helpers assert source/layout contracts rather than browser geometry; no jsdom bounding-box assertions were added. The earlier browser review below remains a separate three-width visual check; 428px is now explicit in the automated gate, not newly browser-certified.

Only `tests/quoteInvoiceMobileFlow.test.js` and this report changed for this final gate. Production code, lifecycle handlers, authority behavior, and the pre-existing staged implementation are unchanged. The gate changes are left unstaged for review.

| Final gate command | Result |
| --- | --- |
| `node --test tests/quoteInvoiceMobileFlow.test.js` | 15 passed, 0 failed |
| `node --test tests/homeDashboardRedesign.test.js tests/askMeetroWorkspace.test.js tests/quoteInvoiceMobileFlow.test.js` | 24 passed, 0 failed |
| `node --test tests/*.test.js` | 4,339 passed, 0 failed |
| `git diff --check` | Passed |

The final full-suite command covers client tests only; unlike the original `npm test` count above, it does not include `server/tests/*.test.js`.

## Browser review

The real workspace was mounted in a localhost fixture preview with live network requests blocked. All six states were checked at 375×812, 390×844, and 393×852. The 18 state/size checks found no horizontal document overflow or horizontally clipped visible controls. Sheets and the Saved Files drawer remained inside the viewport. Screenshots of all six states were inspected in the browser review; the conversation composer, scrolling customer list, and stacked modal actions remained usable. Temporary viewport overrides were reset.

Physical iPhone testing and native keyboard, camera, and microphone behavior remain unverified. Browser emulation is not physical-device certification.

## Files changed by this continuation

- `src/components/UnifiedBusinessDocumentWorkspace.jsx`
- `src/components/QuoteInvoiceMobileFlow.css` (new)
- `tests/businessDocumentLeaveGuard.test.js` (dirty-label assertion only)
- `tests/jobLinkedQuoteContext.test.js` (dirty-label precedence assertion only)
- `tests/quoteInvoiceMobileFlow.test.js` (new)
- `tests/fixtures/quoteMobileFlow.js` (new)
- `docs/qa/QUOTE_INVOICE_MOBILE_FLOW.md` (new)

No commit, push, deployment, server, database, numbering, or lifecycle-engine change. The protected `/Users/williammolina/meetro-client` checkout was not edited.
