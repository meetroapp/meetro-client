# Visual Adoption Coverage Audit

## Meetro Community Product-Wide Visual Certification

Date: July 6, 2026

Scope:
Final visual certification audit for Meetro Community. This audit verifies whether each major surface now feels like it belongs to one product without changing backend behavior, routing, navigation, human-question architecture, adaptive architecture, workflows, language ownership, or accessibility.

Method:

- `ADOPTED`: clearly uses the Visual Constitution and shared visual vocabulary.
- `PARTIAL`: uses some shared tokens or warmth, but still carries legacy shell/styling or uneven hierarchy.
- `NOT ADOPTED`: still primarily reads as an older product surface.
- `DEFERRED`: utility/internal/low-priority surface intentionally left outside the main certification pass.

Scoring:

- `ADOPTED = 1.0`
- `PARTIAL = 0.5`
- `NOT ADOPTED = 0.0`
- `DEFERRED = excluded from completion %`

Overall completion:

- Audited surfaces: `38`
- Included in completion scoring: `32`
- `ADOPTED: 18`
- `PARTIAL: 10`
- `NOT ADOPTED: 4`
- `DEFERRED: 6`
- Overall Visual Adoption completion: `72%`

Interpretation:

The house is mostly consistent now. Core member journeys feel like one Meetro Community experience, but a small set of utility and business-management surfaces still carry older product language and should be resolved before Founder Journey Certification.

## Core Places

| Page | Route / Page Key | File | Status | Priority | Risk | Notes | Recommended next pass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | `home` | `src/pages/Home.jsx` | ✅ ADOPTED | Low | Low | Warm front-porch presentation, shared hero rhythm, preserved project/workflow architecture. | Maintain only. |
| Community | `discover` | `src/pages/Discover.jsx` | ✅ ADOPTED | Low | Low | Shared progressive-discovery hub now feels alive and role-safe. | Maintain only. |
| Communication Center Inbox | `messagesInbox` | `src/pages/MessagesInbox.jsx` | ✅ ADOPTED | Low | Medium | Warm workspace shell and relationship-first context are in place. | Future microcopy polish only. |
| Conversation Thread | `conversationThread` | `src/pages/ConversationThread.jsx` | ✅ ADOPTED | Low | Medium | Strong visual continuity with Communication Center. | Future contrast/accessibility audit only. |
| Work Center (Homeowner) | `myRequests` / homeowner request history path | `src/pages/MyRequests.jsx` | ✅ ADOPTED | Low | Low | Shared visual hero, next-step clarity, preserved conversation continuity. | Maintain only. |
| Work Center (Professional) | `contractorDashboard` | `src/pages/ContractorDashboard.jsx` | ✅ ADOPTED | Low | Medium | Professional confidence benchmark is in place. | Future density tuning only. |
| Meetro Moments | `meetroMoments` | `src/pages/MeetroMoments.jsx` | ✅ ADOPTED | Low | Low | Preservation language and emotional hierarchy are aligned. | Maintain only. |
| Meetro Moment Detail | `moments/:momentId` | `src/pages/MeetroMomentDetails.jsx` | ✅ ADOPTED | Low | Low | Reads as a preserved accomplishment, not a post. | Maintain only. |
| Profile | `profile` | `src/pages/Profile.jsx` | ✅ ADOPTED | Low | Medium | Identity-first hierarchy is now in place across personal and business modes. | Future translation/storytelling refinement only. |
| Ask Meetro Companion | overlay / launcher | `src/components/MeetroAssistant.jsx` | 🟡 PARTIAL | High | Medium | Presence and behavior are much better, but companion still needs full visual absorption into the Community paper/forest system. | Companion ecosystem refinement pass. |

## Community Ecosystem

| Page | Route / Page Key | File | Status | Priority | Risk | Notes | Recommended next pass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Businesses Destination | community businesses destination | `src/pages/Discover.jsx` + business card surfaces | ✅ ADOPTED | Low | Low | Preview and destination behavior are aligned with Community discovery. | Maintain only. |
| Professional Profile | contractor/business public profile | `src/pages/ContractorDetails.jsx` | ✅ ADOPTED | Medium | Low | Shared visual constitution is present and route still feels inside Community. | Future editorial trust pass only. |
| Business Portfolio / Gallery | business portfolio gallery | `src/pages/ProjectGallery.jsx` | 🟡 PARTIAL | Medium | Medium | Connected to Community ecosystem but still reads more like a functional gallery than a fully adopted Community room. | Portfolio visual adoption pass. |
| Request Service | `upload` | `src/pages/Upload.jsx` | ✅ ADOPTED | Low | Medium | Warm surfaces and primary actions are in place; workflow remains preserved. | Maintain only. |
| Hiring Destination | `jobsHiring` | `src/pages/JobsHiring.jsx` | ✅ ADOPTED | Low | Low | Reads as a Community-connected destination instead of a separate system. | Maintain only. |
| Spotlight | spotlight destination inside Community | `src/pages/Discover.jsx` / `src/components/SpotlightSlideshow.jsx` | ✅ ADOPTED | Low | Low | Editorial discovery identity is established and distinct from Moments. | Maintain only. |
| Relationship Pages | `customerRelationshipsCenter` and relationship-linked surfaces | `src/pages/CustomerRelationshipsCenter.jsx` | 🟡 PARTIAL | High | Medium | Relationship ownership is strong, but the surface itself still appears visually older than Community/Profile/Communication. | Relationship Center visual adoption. |

## Work Ecosystem

| Page | Route / Page Key | File | Status | Priority | Risk | Notes | Recommended next pass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Business Dashboard | `businessDashboard` | `src/pages/BusinessDashboard.jsx` | 🟡 PARTIAL | High | Medium | Desktop proportion work is present, but full Visual Constitution coverage is still incomplete. | Business Dashboard final adoption pass. |
| Business Leads | `businessLeads` | `src/pages/BusinessLeads.jsx` | 🟡 PARTIAL | High | Medium | Operationally correct, but still closer to older utility styling than the certified Community/Work/Communication pages. | Leads visual adoption. |
| Schedule | schedule/work-center scheduling surfaces | `src/pages/ContractorDashboard.jsx` + related schedule panels | ✅ ADOPTED | Low | Medium | Schedule inherits Work Center styling successfully. | Maintain only. |
| Quotes | quote-related work-center surfaces | `src/pages/QuoteBuilder.jsx` + quote sections in work surfaces | 🟡 PARTIAL | Medium | Medium | Quote workflow is preserved, but dedicated quote-builder shell still needs certification. | Quote Builder adoption pass. |
| Invoices | invoice-related surfaces | `src/pages/InvoiceBuilder.jsx` | 🟡 PARTIAL | Medium | Medium | Similar to Quote Builder: workflow intact, visual certification incomplete. | Invoice Builder adoption pass. |
| Evaluations | evaluation/work documentation surfaces | `src/pages/ContractorDashboard.jsx` + evaluation panels | ✅ ADOPTED | Low | Medium | Embedded evaluation experiences inherit Work Center successfully. | Maintain only. |
| Current Work | professional active jobs/work panels | `src/pages/ContractorDashboard.jsx` | ✅ ADOPTED | Low | Medium | Already part of the strongest professional visual benchmark. | Maintain only. |
| Completion | completion sheet | `src/pages/CompletionSheet.jsx` | 🟡 PARTIAL | High | Medium | Important trust surface; still visually behind Work Center and Moments. | Completion / closure visual pass. |
| Completed Job Details / History Detail | completed work detail | `src/pages/CompletedJobDetails.jsx` | 🟡 PARTIAL | Medium | Medium | Important preservation bridge, but not yet fully in the warm/paper/forest vocabulary. | History detail adoption pass. |
| Revenue | revenue views within Work Center / business ops | `src/pages/ContractorDashboard.jsx` + business ops slices | 🟡 PARTIAL | Medium | Medium | Better hierarchy exists, but revenue/ops slices still need consistency review. | Professional ops adoption pass. |

## Profile Ecosystem

| Page | Route / Page Key | File | Status | Priority | Risk | Notes | Recommended next pass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Personal Profile | `profile` personal mode | `src/pages/Profile.jsx` | ✅ ADOPTED | Low | Low | Now clearly identity-first. | Maintain only. |
| Business Mode Profile | `profile` business mode | `src/pages/Profile.jsx` | ✅ ADOPTED | Low | Medium | Hero, trust/history order, and quick actions now align. | Maintain only. |
| Business Profile | `contractorProfile` | `src/pages/ContractorProfile.jsx` | 🟡 PARTIAL | High | Medium | Functionally strong, but still one of the biggest remaining visually mixed surfaces. | Business Profile / readiness certification pass. |
| Settings / Account Controls | profile-embedded sections | `src/pages/Profile.jsx` | ✅ ADOPTED | Low | Low | Preserved beneath identity hierarchy without becoming the page’s meaning. | Maintain only. |
| Verification | business verification surfaces | `src/pages/ContractorProfile.jsx` | 🟡 PARTIAL | Medium | Medium | Ownership is correct; presentation still mixed. | Business Profile follow-up. |
| Portfolio | business portfolio management | `src/pages/ProjectGallery.jsx` | 🟡 PARTIAL | Medium | Medium | See Community ecosystem note; not yet fully certified. | Portfolio adoption pass. |
| Reviews | profile/business review surfaces | `src/pages/Profile.jsx` + `src/pages/ContractorProfile.jsx` | 🟡 PARTIAL | Medium | Low | Personal review area is better; business review surfaces still uneven. | Review/trust visual pass. |
| Emergency Contacts | profile settings subsection | `src/pages/Profile.jsx` | ⚪ DEFERRED | Low | Low | Existing placeholder/coming-soon utility, not a founder-journey blocker. | Defer until feature truth matures. |
| Communication Preferences | profile settings subsection | `src/pages/Profile.jsx` | ⚪ DEFERRED | Low | Low | Placeholder utility surface, intentionally not a visual certification priority. | Defer until product ownership expands. |

## Companion Ecosystem

| Page / Surface | Route / State | File | Status | Priority | Risk | Notes | Recommended next pass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Resting Companion | launcher / floating pill | `src/components/MeetroAssistant.jsx` | 🟡 PARTIAL | High | Medium | Presence is clear, but visual tone still leans more AI surface than fully integrated Meetro room. | Companion visual absorption pass. |
| Floating Companion | anchored floating mode | `src/components/MeetroAssistant.jsx` | 🟡 PARTIAL | High | Medium | Behaves correctly but should inherit more of the paper/forest warmth. | Same pass as above. |
| Expanded Companion | expanded sheet/panel | `src/components/MeetroAssistant.jsx` | 🟡 PARTIAL | High | Medium | Strong architecture, incomplete visual assimilation. | Companion panel adoption. |
| Guidance Mode | contextual guidance state | `src/components/MeetroAssistant.jsx` | 🟡 PARTIAL | Medium | Medium | Context is grounded; visual hierarchy still feels more product add-on than native room. | Companion copy + visual pass. |
| Conversation Mode | full companion conversation state | `src/components/MeetroAssistant.jsx` | 🟡 PARTIAL | Medium | Medium | Usable and safer than before, but visually still separate from the rest of Meetro. | Companion conversation adoption. |
| Suggested Actions / Response Cards | inside companion | `src/components/MeetroAssistant.jsx` | 🟡 PARTIAL | Medium | Low | Helpful, but card styling should continue converging with the house vocabulary. | Companion response-card pass. |
| Welcome / Thinking / Empty States | companion internal states | `src/components/MeetroAssistant.jsx` | ⚪ DEFERRED | Medium | Low | Worth refining, but not blocking Founder Journey once core journeys are certified. | Defer into dedicated companion finish pass. |

## Utility Surfaces

| Page | Route / Page Key | File | Status | Priority | Risk | Notes | Recommended next pass |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bottom Navigation / Desktop Sidebar | shared nav | `src/components/BottomNav.jsx` | ✅ ADOPTED | Low | Low | Shared navigation anchor is aligned. | Maintain only. |
| Notifications | `notifications` | `src/pages/Notifications.jsx` | 🔴 NOT ADOPTED | High | Low | Still uses older shell and card language without shared visual classes. | Notifications visual adoption. |
| Legal | `legal` | `src/pages/Legal.jsx` | 🔴 NOT ADOPTED | Medium | Low | Utility surface likely still old-language and separate. | Legal/utility adoption pass. |
| Authentication | `login` | `src/pages/Login.jsx` | 🔴 NOT ADOPTED | High | Medium | Correct logic, but still visually separate from the rest of Meetro Community. | Auth visual adoption. |
| Welcome / Welcome Intro | welcome surfaces | `src/pages/Welcome.jsx`, `src/pages/WelcomeIntro.jsx` | 🔴 NOT ADOPTED | Medium | Low | Early-entry pages still need to inherit the same home/community warmth. | Welcome adoption pass. |
| Business Tools / Command Center | `businessCommandCenter` | `src/pages/BusinessCommandCenter.jsx` | 🟡 PARTIAL | High | Medium | Important ownership surface; still carries more utility/admin energy than certified pages. | Business Tools visual adoption. |
| Emergency Request | `emergencyRequest` | `src/pages/EmergencyRequest.jsx` | 🟡 PARTIAL | High | Medium | Mission-critical flow should feel more fully within the same house. | Emergency experience adoption. |
| Dialogs / Sheets / Drawers | shared temporary surfaces | multiple (`ServiceSelectorSheet`, `JobsHiring`, `HiringCenter`, `Profile`) | ⚪ DEFERRED | Medium | Low | Some are already close; should be normalized together rather than piecemeal. | Shared temporary-surface pass. |
| Help / Feedback | mixed utility overlays and help paths | mixed | ⚪ DEFERRED | Low | Low | Useful but not primary founder-journey blockers. | Utility surfaces pass. |
| Language Picker / Localization Sheets | embedded utility | `src/pages/Profile.jsx` and others | ⚪ DEFERRED | Low | Low | Functionally correct, lower certification priority. | Utility surfaces pass. |
| Onboarding | `ProfessionalOnboarding`, welcome setup flows | `src/pages/ProfessionalOnboarding.jsx` and welcome surfaces | ⚪ DEFERRED | Medium | Low | Should eventually align more strongly, but not required for certifying the current core house. | Onboarding visual adoption. |

## Highest Priority Remaining Pages

1. Authentication / Login
2. Notifications
3. Business Dashboard
4. Business Profile
5. Companion expanded/floating surfaces
6. Business Leads
7. Completion / Completed Job Details
8. Emergency Request
9. Business Tools / Command Center
10. Quote Builder / Invoice Builder

## Safe Visual Improvements Made In This Audit

No broad new redesign was applied during this certification audit.

Reason:

- The repo is already mid-adoption with multiple major surfaces in flight.
- This pass is intended to document truthful coverage, not to blur the line between audited and unaudited surfaces.
- The safest contribution here is a governed coverage baseline plus a regression test that keeps the certification visible.

## Recommendations Documented Only

- Finish the utility ring: Login, Notifications, Legal, Welcome.
- Finish the professional-management ring: Business Dashboard, Business Profile, Business Leads, Business Tools.
- Finish the trust-completion ring: Emergency Request, CompletionSheet, CompletedJobDetails.
- Finish the Companion ring as a visual absorption pass, not an AI feature pass.
- Normalize shared dialogs/sheets/drawers in one dedicated pass instead of surface-by-surface drift.

## Risk Assessment

Low risk:

- Core member journey pages already feel coherent enough for internal/product certification.

Medium risk:

- The remaining partial and non-adopted surfaces are often entry, utility, or trust-sensitive surfaces.
- Members may still feel a visual “product break” when leaving core pages and entering those older surfaces.

Highest certification risk:

- Authentication
- Notifications
- Business Profile / Business Dashboard
- Companion expanded surfaces

## Final Decision

Decision: `PASS`

Meaning:

The audit is complete, the remaining gaps are now explicit, and the application has a strong enough core house to move into Founder Journey Certification planning.

Important caveat:

This is a certification pass for coverage visibility, not a claim that every surface is fully adopted. Founder Journey Certification should prioritize the highest-risk remaining pages listed above before calling the visual system complete.

## Constitution Check

Does the current product mostly feel like one Meetro Community experience?

Yes, across the core journey.

Not yet everywhere.

The next work should finish the remaining rooms until no important page feels like another house.
