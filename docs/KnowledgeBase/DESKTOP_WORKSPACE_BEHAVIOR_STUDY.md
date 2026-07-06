# Desktop Workspace Behavior Study

## Purpose

This study defines the intended desktop behavior for major Meetro Community screens after Adaptive Navigation Phase 1.

No UI changes are specified for immediate implementation here. The purpose is to decide which screens should become desktop workspaces, overlays, context cards, inspectors, focused pages, or remain simple pages before further implementation begins.

Messages is the current reference screen because it is the first area that behaves like a desktop-native Meetro workspace:

Inbox | Conversation | Relationship / Project Context

The lesson from Messages is not “make every page three columns.”

The lesson is:

Desktop should reveal more context only when that context helps the user remain inside the same work.

## Classification Definitions

| Classification | Meaning |
| --- | --- |
| Workspace | A primary destination where multiple related areas can remain visible together. |
| Overlay | A temporary surface that appears above the current workspace without becoming a destination. |
| Context Card | A small anchored temporary surface that preserves the current workspace and does not resize, dim, or push content. It may host a proven mobile experience when preservation is better than reinvention. |
| Inspector | A contextual side panel that explains or edits the selected object while the list/workspace remains visible. |
| Focus Page | A task that deserves full attention and should avoid competing panels until review or preview context becomes useful. |
| Keep as Page | A screen that should stay a simple page because added desktop complexity would not reduce burden. |

## Desktop Behavior Matrix

| Screen | Current Behavior | Recommended Desktop Behavior | Recommended Mobile Behavior | Classification | Priority | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| Messages | Adaptive workspace exists: inbox, thread, and context can remain visible on wide screens. | Keep as the reference workspace. Refine context quality and tablet behavior later. | Keep Inbox → Conversation → Back. | Workspace | 1 | Medium |
| Dashboard | Business Dashboard uses responsive grids but still reads like stacked mobile sections. | Become an operational overview workspace with Today’s Attention, Business Readiness, and quiet shortcuts. Avoid detailed work execution here. | Keep current dashboard page. | Workspace | 3 | Medium |
| Work Center | Current-work responsibility already exists, with persistent job context foundations. | Become the next full desktop workspace: Current Jobs | Today’s Schedule / Alerts | Selected Job Context. | Keep focused responsibility cards and current flow. | Workspace | 1 | High |
| Business Tools | Tool grid expands reasonably and routes to owning tools. | Stay mostly as a page with grouped tool sections. Selected tool descriptions may become an inspector later. | Keep as a simple tool list/grid. | Keep as Page | 4 | Low |
| Business Profile | Readable vertical profile story with editors and customer-preview/trust sections. | Become a profile workspace only when editing or previewing: Profile Story | Customer Preview / Editor Inspector. Default can remain readable page. | Keep current vertical profile story and viewport-owned editors. | Inspector | 4 | Medium |
| Portfolio | Gallery and temporary editor patterns already work; larger screens can show more proof. | Gallery workspace with selected project preview/inspector. Add/Edit project remains viewport-owned temporary editor. | Keep gallery list and temporary editor flow. | Workspace | 4 | Medium |
| Schedule | Mostly appears through Work Center and schedule cards rather than a mature standalone surface. | Treat as an inspector inside Work Center first: Schedule List/Calendar | Selected Visit | Related Conversation. Avoid standalone dashboard until ownership is clearer. | Keep schedule actions inside current workflow. | Inspector | 2 | High |
| Leads | Responsive card grid opens project details and conversation handoffs. | Become an opportunity triage workspace: Lead List | Selected Lead | Relationship / Proposal Readiness. | Keep list-first lead cards. | Workspace | 3 | Medium |
| Quote Builder | Focused form page with context pulled from conversation/work. | Become a builder workspace: Source Context | Quote Builder | Customer Preview. | Keep focused full-page builder. | Focus Page | 3 | High |
| Invoice Builder | Focused form page with invoice preview sections. | Become a builder workspace: Source Context | Invoice Builder | Preview / Payment Context. | Keep focused full-page builder. | Focus Page | 3 | High |
| Homeowner Home | Responsive home dashboard with current work and messages entry points. | Keep simple and centered, with optional current-work inspector only when a request is selected. Home should not become a dashboard wall. | Keep current attention-first home page. | Keep as Page | 5 | Low |
| Discover | Wide shell and adaptive grids exist; selected professionals route away. | Search/results workspace: Results | Selected Professional Inspector. Keep request action clear. | Keep search/results flow and simple selection. | Inspector | 4 | Medium |
| Request Creation | Focused request-preparation flow. | Remain a Focus Page. After description, desktop may reveal Review Prepared Request beside editable details. | Keep one clear step at a time. | Focus Page | 2 | Medium |
| My Requests | List of requests and rich request cards currently live in one page. | Become homeowner current-work workspace: Request List | Selected Request | Conversation / Next Step. | Keep list-first request flow. | Workspace | 2 | High |
| Profile | Full readable account page with personal/business/legal/settings sections. | Host the existing Profile experience inside a small Sidebar-anchored floating card. Existing Profile remains a full page on mobile. | Keep full Profile page from BottomNav. | Context Card | 2 | Low |

## Key Decisions

### Screens That Should Become Full Desktop Workspaces

- Messages
- Work Center
- Business Dashboard
- Leads
- Portfolio
- My Requests

These screens represent ongoing work or ongoing relationships. Desktop space should help keep the selected object, its communication, and its next responsibility visible together.

### Screens That Should Become Cards, Overlays, Context Cards, Or Inspectors

- Profile should use a Context Card on desktop.
- Business Profile should use an Inspector for customer preview or active editors.
- Discover should use an Inspector for selected professional/service context.
- Schedule should first become an Inspector inside Work Center.
- Portfolio project detail should use an Inspector, while add/edit remains a temporary editor.

These are supporting contexts. They should not always replace the active workspace.

### Screens That Should Remain Focused Full Pages

- Request Creation
- Quote Builder
- Invoice Builder

These are high-attention authoring flows. Desktop can add source context and preview, but only after the primary task remains stable. Wider fields alone are not useful.

### Screens That Should Stay Simple And Centered

- Homeowner Home
- Business Tools
- Settings / Legal

These screens do not gain enough from multi-pane layout to justify added cognitive weight.

## Back Button Reduction

Desktop should reduce Back button usage where stable workspace context can remain visible.

| Area | Back Button Direction |
| --- | --- |
| Messages | Reduce. Selecting a conversation should update the center pane, not navigate away on desktop. |
| Work Center | Reduce. Selecting a job should update selected context/focus panes. |
| Leads | Reduce. Selecting a lead should open detail/context beside the lead list. |
| My Requests | Reduce. Selecting a request should update request detail/context beside the list. |
| Profile | Reduce. Open as a context card and dismiss back to current workspace. |
| Quote / Invoice Builder | Preserve meaningful return. Builders still need explicit return to source/work context. |
| Request Creation | Preserve. Request preparation is a focused flow. |
| Discover | Reduce when showing selected professional inspector; preserve when entering full profile if needed. |

## Multi-Pane Recommendations

Use multi-pane layout only where continuity improves.

| Screen | Recommended Desktop Pane Model |
| --- | --- |
| Messages | Inbox | Conversation | Relationship / Project Context |
| Work Center | Responsibility List | Dynamic Focus | Selected Job Context |
| Leads | Opportunity List | Selected Lead | Relationship / Proposal Readiness |
| My Requests | Request List | Selected Request | Conversation / Next Step |
| Portfolio | Gallery | Selected Project Preview / Inspector |
| Quote Builder | Source Context | Builder | Preview |
| Invoice Builder | Source Context | Builder | Preview / Payment Context |
| Discover | Results | Selected Professional Inspector |

Do not use multi-pane layout for Profile, Legal, Business Tools, or generic dashboards unless a specific selected object exists.

## Profile Rule

On desktop, Profile should become a small scrollable Profile card anchored to the Sidebar Profile icon.

Reasoning:

- Profile supports identity and settings.
- It is not usually the current work.
- Opening Profile as a full desktop page causes the user to mentally leave the workspace.
- The Profile card preserves current work while hosting the same Profile sections and interactions users already know from mobile.

Mobile should keep Profile as a full page because BottomNav treats it as a primary mobile destination and the screen size does not support a context card without crowding.

Recommended desktop shape:

Workspace
→ Profile action
→ Floating Profile Card
→ Existing Profile actions remain available inside the card
→ Dismiss returns to same workspace state

Phase 1 implementation status:

- Implemented as a desktop-only Sidebar Profile preservation card.
- Mobile Profile remains a full page.
- The existing Profile route and layout remain available and unchanged.
- Context card opening does not change the current route, so the workspace behind it is preserved.
- The card hosts the existing Profile content instead of replacing it with desktop-only shortcuts.

Law of Preservation:

Keep intact what works. Adapt its presentation. Never redesign an experience simply because the screen becomes larger. Desktop should host proven mobile experiences before inventing new desktop-only versions.

## Priority Scores

Priority uses a 1 to 5 scale.

- 1 = next implementation candidate
- 2 = near-term foundation
- 3 = medium-term workspace refinement
- 4 = later refinement
- 5 = preserve simple behavior unless a specific pain appears

| Priority | Screens |
| --- | --- |
| 1 | Work Center, Messages refinement |
| 2 | My Requests, Request Creation review context, Schedule inspector, Profile context card |
| 3 | Business Dashboard, Leads, Quote Builder, Invoice Builder |
| 4 | Business Profile, Portfolio, Discover, Business Tools grouping |
| 5 | Homeowner Home, Legal / Settings |

## Risk Levels

| Risk | Screens | Reason |
| --- | --- | --- |
| High | Work Center, My Requests, Quote Builder, Invoice Builder, Schedule | These surfaces touch lifecycle, schedule, proposal, invoice, completion, or ownership-sensitive flows. |
| Medium | Messages, Dashboard, Leads, Business Profile, Portfolio, Discover, Profile | These need continuity improvements but can preserve current data ownership if implemented carefully. |
| Low | Business Tools, Homeowner Home, Legal / Settings | These can remain page-based with smaller hierarchy refinements. |

## First Implementation Sequence

1. Stabilize shared adaptive shell rules.
   - Keep desktop Sidebar.
   - Keep mobile BottomNav.
   - Define workspace, context card, inspector, and focus-page layout primitives.

2. Implement Work Center desktop workspace.
   - Current responsibility list remains visible.
   - Selected job focus changes in place.
   - Schedule/alerts appear as support, not competition.

3. Implement Profile desktop context card.
   - Completed in Phase 1 as a desktop-only Sidebar-anchored preservation card.
   - Preserve full mobile Profile page.
   - Do not change identity ownership.

4. Implement My Requests desktop workspace.
   - Request list remains visible.
   - Selected request, current stage, conversation, and next action appear together.

5. Implement Request Creation desktop review context.
   - Description remains primary.
   - Prepared request review can sit beside editable details after understanding exists.

6. Implement Leads desktop workspace.
   - Opportunity list remains visible.
   - Selected lead detail and handoff readiness appear beside it.

7. Implement Quote Builder and Invoice Builder workspace models.
   - Source context remains visible.
   - Builder stays primary.
   - Preview becomes a right-side pane.

8. Refine Business Profile, Portfolio, Discover, and Business Tools.
   - Use inspectors only when a selected object exists.
   - Keep default pages calm.

## Implementation Guardrails

- Do not create desktop-only workflows.
- Do not rename workflows for desktop.
- Do not move ownership into views.
- Do not make Profile compete with current work on desktop.
- Do not make every page multi-pane.
- Do not expose more data just because the screen is wider.
- Do not remove mobile BottomNav behavior.
- Do not route around existing lifecycle authorities.

## Success Criteria For Future Implementation

The next implementation phase should be able to answer:

- Is this screen current work, supporting context, or account/settings?
- Should selecting an object replace the page, open an inspector, or update a workspace pane?
- Does the user remain mentally inside the same relationship, request, job, or business task?
- Does desktop reduce Back button dependency without creating hidden state?
- Does mobile remain the same focused flow?

## Closing Recommendation

Meetro should not become a desktop dashboard product.

It should become one adaptive product where desktop space protects continuity.

Messages proves the direction.

Work Center should be next.

Profile should become a desktop preservation card rather than a full-screen destination.

Builders should become source-context + editor + preview workspaces only when their ownership and save paths remain unchanged.

The right question before every desktop change is:

Does this keep the user inside the same work with less effort?

If yes, reveal context.

If no, preserve focus.
