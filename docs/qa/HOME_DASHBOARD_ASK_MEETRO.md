# Home Dashboard + Ask Meetro implementation review

Baseline: `c45e26d7a039033ef2d4d6ffe6c0c3d16047d6e7`.
Worktree: `/private/tmp/meetro-home-dashboard-ask-meetro`.
HEAD remains at the baseline. No commit, push, deployment, server, database, numbering, or lifecycle-engine changes were made. The protected `/Users/williammolina/meetro-client` checkout was not edited.

## Checkpoint A

Completed before Checkpoint B began. Professional navigation destinations, shortcut hierarchy, role separation, and the five mobile tabs are preserved. Desktop/tablet navigation has a separate cream surface, divider, green active state, and approximately 240px sidebar. The existing persistent Ask control now opens the dedicated workspace.

Professional Home order is Header → matching Leads → At a Glance → Quick Access → supporting content. Matching leads use the existing authorized opportunity projection. Quick Access contains Hiring, Quote Builder, Invoice Builder, and Timesheet. Empty metrics retain actionable supporting information. Homeowner Home retains actual My Projects data, functional Active/History controls, existing Spotlight media, service/emergency/Ask entries, and Communication access. Poppins is bundled with its OFL license.

Checkpoint A validation before B: 177 focused tests passed; 4,293 client tests passed with serial test-file execution; staging build passed; changed-file lint introduced zero diagnostics. An earlier concurrent run hit an unchanged Visit History timing assertion; the serial run passed.

## Checkpoint B behavior and boundaries

Ask opens as a dedicated workspace, preserving the original page mount and unsaved form values. Mobile retains the five-tab navigation; tablet/desktop retain the navigation shell. Welcome suggestions are role-specific and collapse after the first message. Text, file/photo controls, and browser/native speech entry are present. VisualViewport updates keep the composer inside the visible viewport. Conversations remain in memory and are reset when identity or exact record context changes.

Context comes from bounded route identities and the currently mounted canonical Job/customer panel. Duplicate, invalid, or conflicting route identities fail closed. Customer labels are presentation data, never authorization. An exact customer detail without a supported deep link is not converted into an invented URL.

Multi-action instructions produce individual review cards, Review all, Change details, and Cancel. Requested payment amount/date/method and visit day/time are shown as reported/requested values; relative dates are not converted into scheduling authority. Negative or uncertain completion/payment statements do not become affirmative proposals.

Quote approval, Quote changes, deposit/payment, Invoice and scheduling proposals open the existing canonical reviewer. They require confirmation there. This implementation does not provide one-click batch application or batch success receipts for these native handoffs. Handoff alone never produces a success receipt. A newly prepared standalone Quote uses the existing explicit-new contract and clears stale Quote hints only when the user proceeds. Exact Quote-to-Invoice commands reuse the existing parser, authenticated lookup and exact customer-matching resolver; a mismatched named customer cannot fall back to the current Job.

Inline Confirm & Apply is implemented for canonical Job completion using the unchanged completion API. It requires explicit review/confirmation, eligible business authority, exact Job identity, a fresh version check, and the existing idempotency key. Actions Completed is shown only after a validated command response and links to the actual Job completion record. Stale, forbidden, malformed, and failed network responses never create success receipts.

Photo/file controls obey the existing Friends & Family media deferral policy. Development previews can hold bounded local files; these are not uploaded or represented as recorded evidence. Production media remains deferred. No automatic photo-to-Project-Folder upload was introduced.

## Final automated validation

| Check | Result |
| --- | --- |
| `npm test` (client and server test files, no server edits) | 4,634 passed; 0 failed |
| New Home + Ask tests | 34 total: 3 Home, 25 Ask authority, 6 Ask workspace |
| Home/Ask/navigation focused suite | 62 passed; 0 failed |
| Existing Assistant/contextual/field-productivity suite | 201 passed; 0 failed |
| New Home/Ask + existing media safety checks | 44 passed; 0 failed |
| Changed JavaScript lint baseline comparison | 23 files; 463 errors/15 warnings both before and after; 0 new diagnostics |
| Repository-wide `npm run lint` | Existing baseline failure: 825 errors, 31 warnings |
| `npm run build:staging` | Passed; existing large-chunk warning |
| `git diff --check` | Passed |

The lint comparison matches rule/severity/message with source-frame line numbers normalized so shifted unchanged code is not counted as a new diagnostic. New source/test files have no lint diagnostics. Existing test changes update assertions tied to the replaced presentation and preserve destination/authority assertions.

## Browser validation

An isolated localhost fixture preview mounted the actual Home, BusinessDashboard, AskMeetroWorkspace, AskMeetroHost, and BottomNav components. No live account requests or mutations were allowed. The preview scripts and fixture data live only in ignored node_modules cache and are not shipped.

Three screens were checked at each size: 375×812, 390×844, 393×852, 428×926, 768×1024, 1024×768, 1280×900, and 1440×1000 (24 checks). No horizontal document overflow was observed. Ask's composer remained within each viewport. Screenshots were inspected for professional desktop/tablet, homeowner mobile, Ask welcome mobile/desktop, and multi-action review mobile. Browser interactions also verified the actual persistent launcher, homeowner role-specific suggestions, typing/sending, welcome collapse, and Review all.

Physical iPhone/iPad testing, native keyboard/microphone/camera behavior, and authenticated end-to-end financial workflows remain unverified. Browser resizing is not physical-device certification. Financial native reviewers and their lifecycle authority remain covered by the existing regression suite.

## Cumulative change inventory

31 files changed; 1127 text lines added, 171 removed; 3 new font binaries. Includes tracked changes and untracked additions; no staging required.

- `docs/qa/HOME_DASHBOARD_ASK_MEETRO.md` (new)
- `public/fonts/poppins/OFL.txt` (new)
- `public/fonts/poppins/Poppins-Bold.ttf` (new)
- `public/fonts/poppins/Poppins-Regular.ttf` (new)
- `public/fonts/poppins/Poppins-SemiBold.ttf` (new)
- `src/App.jsx`
- `src/components/AskMeetroHost.jsx` (new)
- `src/components/AskMeetroWorkspace.css` (new)
- `src/components/AskMeetroWorkspace.jsx` (new)
- `src/components/BottomNav.jsx`
- `src/components/MeetroAssistant.jsx`
- `src/hooks/useAskMeetroContext.js` (new)
- `src/index.css`
- `src/pages/BusinessDashboard.jsx`
- `src/pages/ContractorDashboard.jsx`
- `src/pages/CustomerRelationshipsCenter.jsx`
- `src/pages/Home.jsx`
- `src/styles/homeDashboard.css` (new)
- `src/utils/askMeetro.js` (new)
- `src/utils/askMeetroCompletion.js` (new)
- `src/utils/assistantSpeechRecognition.js` (new)
- `tests/adaptiveLayoutStandard.test.js`
- `tests/adaptiveNavigation.test.js`
- `tests/askMeetroAuthority.test.js` (new)
- `tests/askMeetroWorkspace.test.js` (new)
- `tests/businessDashboardDesktopPresentation.test.js`
- `tests/communityEcosystemVisualAdoption.test.js`
- `tests/desktopWorkspaceMaxWidth.test.js`
- `tests/homeDashboardRedesign.test.js` (new)
- `tests/homeIdentityCleanup.test.js`
- `tests/spotlightHomeCardPresentation.test.js`
