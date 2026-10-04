# Global visual polish — presentation audit

Baseline: `e402834063749f68bf25ff7260d646569abb39b2` (certified build 904562).
Worktree: `/private/tmp/meetro-home-dashboard-ask-meetro`.

## Findings and corrections

- Legacy shared forest/sage/cream/ink tokens disagreed with the approved Home palette. Existing token names now resolve to the requested primary `#0B5D3B`, dark `#063D26`, light `#E8F5EE`, cream `#F7F6F2`, paper `#FFFFFF`, ink `#111827`, secondary `#6B7280`, border `#E5E7EB`, and background `#FAFAFC`. Semantic accent, danger, warning, info, and purple tokens are defined separately. Decorative wood/coffee accents remain; status-specific warning/danger styling is not flattened into green.
- A legacy `prefers-color-scheme: dark` rule assigned `--text-h: #f3f4f6` while the client continued to render light surfaces. Ask's header inherited this nearly white heading color. Shared heading tokens now agree with the light surface policy, and Ask's title/welcome heading explicitly use dark ink.
- Ask voice-unavailable and recognition fallback strings shared the action-error presentation. The rendered notice now uses a polite status role and dark green on light green. Actual action errors keep alert semantics/red styling. The recording principle retains its exact text, with readable 12px secondary text. No speech, permission, parser, action, review, apply, or navigation handlers changed.
- Poppins's existing local font files now load from the shared stylesheet, rather than waiting for lazy Home CSS. Shared font tokens replace the starter heading/body stack. This is not global scaling: body size and certified Home size rules remain; the excessive fallback h1 is reduced from 56 to 40px (36 to 32px at smaller widths).
- Targeted large headings were reduced in MessagesInbox, Profile, ProfessionalOnboarding, ProjectGallery, and shared Notifications/Hiring headers. Icons and amount/count displays are not treated as titles. The Relationships wrapper now uses the shared font/background instead of opting out.
- Login retains its existing markup, artwork, four languages, copy, legal links, modes, and auth handlers. Its surrounding surface is lighter; the hero remains dark green. Language controls remain 2x2, now 44px high with 15px labels, 18px icons and 8px gaps; the container is bounded at 440px. Hero type is 36–46px; sign-in 30–34px; inputs 54px/16px; Continue 52px; Join 46px; legal 13px. The relationship card uses 18–22px heading/15px copy and 18px padding. Negative hero overlap and forced minimum height were removed locally.

## Coverage decisions

| Surface | Decision |
| --- | --- |
| Professional/Homeowner Home | Keep section trees, dimensions, responsive CSS, role separation and routes. Shared font/color tokens only; font-face declarations moved without changing assets. |
| Work Center (ContractorDashboard/MyRequests), ProjectDetails, completed Jobs | Existing token consumers receive the palette; preserve cards, status language, all action handlers and record ownership. Large numeric/icon styles were not blindly reduced. |
| Communication / MessagesInbox / ConversationThread | Existing token consumers receive the palette; reduce only the hub title. Thread flows untouched. |
| Moments / Discover / Community / Journey / Story | Existing light/green surfaces and media hierarchy retained; shared token and heading corrections apply where consumed. No media or content changes. |
| Properties (Profile), Profile/account, customer Relationships | Preserve record sections and routes; smaller Profile title; explicit shared font/background on Relationships. |
| Leads | Already compact 30px page heading, 21px card heading, 14–16px copy. Retain local dimensions and authoritative records; existing tokens inherit palette. |
| Quote / Invoice / Deposit / Saved Files / customer review | Preserve specialized document presentation and all lifecycle code. Existing shared surface/color tokens apply; six governed mobile states remain covered at 375/390/393/428. |
| Professional onboarding | Reduce the excessive responsive title only. Signup, verification and subscription gates unchanged. |
| Notifications | Shared alert page/background/header/button presentation aligned; leave lifecycle-specific urgency styling and delivery/read state logic unchanged. |
| Emergency | Preserve warning/error emphasis, responder state and recovery affordances; inherited shared primary action tokens only. |
| Shared sheets/dialogs | Existing shared paper/border/shadow and heading tokens align; no new universal overflow or containment rules. |
| Sidebar / mobile nav | No destination, label, order, layout calculation or component edits. Existing token consumers inherit palette. |
| Login / Ask Meetro | Targeted corrections described above. |
| Remaining routed utility/team/business pages | Source inventory below; shared token/heading inheritance where used. Existing readable body copy, local form dimensions and status accents retained. No blanket replacement of every color or font-size literal. |

## Routed source inventory

All page imports in `src/App.jsx` were scanned for shared palette usage, inline heading/control styles and explicit font overrides. Counts below describe source declarations, not runtime rendering coverage. Backups and unrouted prototypes are excluded. A page with zero direct token references can consume shared classes/components.

| Page module | Direct Meetro token references | Inline font-size declarations inspected |
| --- | ---: | ---: |
| `AssetCenter.jsx` | 3 | 3 |
| `Assistant.jsx` | 5 | 15 |
| `BookkeeperProfile.jsx` | 0 | 0 |
| `BusinessAnalytics.jsx` | 6 | 15 |
| `BusinessAvailability.jsx` | 18 | 2 |
| `BusinessCommandCenter.jsx` | 54 | 19 |
| `BusinessDashboard.jsx` | 28 | 37 |
| `BusinessIntelligence.jsx` | 8 | 15 |
| `BusinessLeads.jsx` | 12 | 8 |
| `ChangeOrderRequest.jsx` | 5 | 4 |
| `Chat.jsx` | 4 | 7 |
| `CompletedJobDetails.jsx` | 5 | 3 |
| `CompletionSheet.jsx` | 4 | 2 |
| `ComplianceCenter.jsx` | 7 | 16 |
| `ContractTemplates.jsx` | 0 | 10 |
| `ContractorDashboard.jsx` | 211 | 350 |
| `ContractorDetails.jsx` | 64 | 21 |
| `ContractorJobAccepted.jsx` | 3 | 7 |
| `ContractorProfile.jsx` | 36 | 42 |
| `Conversation.jsx` | 7 | 1 |
| `ConversationThread.jsx` | 75 | 110 |
| `CustomerInvoiceReviewRoute.jsx` | 1 | 0 |
| `CustomerQuoteReviewRoute.jsx` | 1 | 0 |
| `CustomerRelationshipsCenter.jsx` | 7 | 25 |
| `Discover.jsx` | 77 | 29 |
| `Emergency.jsx` | 1 | 9 |
| `EmergencyRequest.jsx` | 2 | 25 |
| `EmployeeJobs.jsx` | 0 | 0 |
| `EmployeePortal.jsx` | 0 | 0 |
| `Favorites.jsx` | 1 | 3 |
| `HiringCenter.jsx` | 0 | 0 |
| `Home.jsx` | 184 | 104 |
| `InvoiceBuilder.jsx` | 18 | 20 |
| `JobUpdate.jsx` | 4 | 3 |
| `JobsHiring.jsx` | 0 | 0 |
| `Legal.jsx` | 4 | 7 |
| `Login.jsx` | 54 | 31 |
| `MaterialsLibrary.jsx` | 0 | 11 |
| `MeetroJourney.jsx` | 21 | 18 |
| `MeetroMomentDetails.jsx` | 5 | 16 |
| `MeetroMoments.jsx` | 2 | 24 |
| `MeetroStory.jsx` | 20 | 4 |
| `MessagesInbox.jsx` | 64 | 73 |
| `MyRequests.jsx` | 68 | 34 |
| `Notifications.jsx` | 0 | 0 |
| `PermitCenter.jsx` | 0 | 15 |
| `PricingLibrary.jsx` | 14 | 11 |
| `ProfessionalOnboarding.jsx` | 7 | 9 |
| `ProfessionalSubscription.jsx` | 0 | 1 |
| `Profile.jsx` | 84 | 58 |
| `ProjectDetails.jsx` | 24 | 44 |
| `ProjectGallery.jsx` | 17 | 21 |
| `QuoteBuilder.jsx` | 20 | 22 |
| `QuoteRequests.jsx` | 4 | 9 |
| `ReportsCenter.jsx` | 14 | 10 |
| `ServiceTypesEvaluations.jsx` | 3 | 16 |
| `TeamMembers.jsx` | 0 | 0 |
| `TeamOperations.jsx` | 0 | 0 |
| `Upload.jsx` | 125 | 54 |
| `Welcome.jsx` | 2 | 5 |
| `WelcomeIntro.jsx` | 4 | 6 |

Total: 61 routed page modules, plus shared navigation, Ask workspace, dashboard CSS, and document presentation styles.

## Verification scope

Real-component tests cover Login in all four languages, compact style contracts, Ask voice fallback with no mutation/navigation, existing Review → Confirm & Apply authority, palette contrast, Home role/structure, adaptive layout, and all six Quote/Invoice mobile states. jsdom assertions prove rendered state and declared styles, not pixel geometry.

Isolated Chrome browser QA uses actual components/CSS with live requests blocked. Login, Ask, and Homeowner Home are checked at 375x812, 390x844, 393x852, 428x926, 844x390, 1024x1366, 1366x1024, 1280x900 and 1440x900, including dark device appearance. Professional Home additionally covers 812x375, 852x393 and 926x428, plus phone/iPad portrait–landscape–portrait and reverse rotations. Assertions cover document width, visible control bounds, ordered/shared Home sections, sidebar/dock continuity, and unclipped Quick Access text. Browser results do not replace physical iOS safe-area/keyboard QA, and source auditing every route does not claim every authenticated record state was visited in a browser.

QA scripts, logs and screenshots live outside the repository in `/tmp`. No dependencies, build artifacts, cache files or mock data are added to tracked source. No lifecycle, API, server, database, numbering, authorization, route or navigation behavior changes are included.

Validation results: Home 6/6; layout recalculation 4/4; other focused suites 66/66; full client suite 4,347/4,347 (four new tests). Staging build: 690 modules, passed with the existing large-chunk advisory. Changed JS/JSX ESLint: baseline/current 65 errors and 3 warnings, zero added diagnostics. CSS is outside this repository's ESLint configuration. `git diff --check`: passed. Chrome: 27 Login/Ask/Homeowner states and 24 Professional Home/rotation snapshots passed; no document horizontal overflow. All nine Ask checks rendered the exact unavailable-browser-voice fallback. Physical iPhone/iPad certification remains a separate device check.
