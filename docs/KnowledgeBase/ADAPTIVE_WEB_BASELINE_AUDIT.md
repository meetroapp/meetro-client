# Adaptive Web Baseline Audit

Date: July 3, 2026

## Purpose

This audit evaluates Meetro Community as one adaptive product across phone, tablet, web, and desktop contexts.

The goal is not to create a separate desktop version. The workflow should remain the same. As screen space increases, Meetro should reveal more useful context only when that context protects continuity and reduces effort.

## Method

This audit used:

- Source review of the authenticated application shell, page-level wrappers, shared navigation, forms, modals, safe-area handling, and high-traffic pages.
- Browser smoke inspection of the standalone public web presence at 390px, 768px, 1024px, 1280px, and 1440px.
- Browser smoke inspection of `/login` at the same widths.
- Source-based review of authenticated routes because the app shell is guarded by session, account mode, business ownership, and onboarding state.

Observed foundation:

- `src/main.jsx` keeps the public website separate from the authenticated app.
- `src/index.css` includes global horizontal overflow guards and shared responsive shells.
- Shared classes already exist for `meetro-responsive-page`, `meetro-wide-page`, `meetro-readable-page`, and `meetro-form-page`.
- Most app pages preserve mobile workflow and safe-area behavior.
- Adaptive Navigation Phase 1 now keeps BottomNav for compact/medium layouts and uses a persistent desktop Sidebar at wide pointer-based widths.

## Overall Adaptive Readiness Score

**68% adaptive-ready**

Meetro Community has a solid compact/mobile foundation and enough shared responsive primitives to evolve safely. The main gap is not basic responsiveness. The gap is adaptive context: wide screens usually become centered mobile pages instead of continuity workspaces.

Breakdown:

- Compact: 88% ready
- Medium: 74% ready
- Expanded: 61% ready
- Wide: 53% ready
- Ultra-wide: 46% ready

## Scoring Table

| Area | Compact | Medium | Expanded | Wide | Ultra-wide | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Public Presence | ✅ | ✅ | ✅ | ✅ | ✅ | Public site is separate, light, and has no BottomNav dependency. |
| Login | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | No horizontal overflow observed; should confirm compact lazy-loading and approved login hierarchy on real devices. |
| Home | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Strong mobile flow with responsive grids; wide layouts still mostly centered rather than contextual. |
| Discover | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Uses wide shell and adaptive grids; search/results could use more side context later. |
| Upload / Request Creation | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Clear mobile flow; form shell remains narrow on desktop by design, but review/context can use more space later. |
| My Requests | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | Request list is responsive, but wide screens should eventually support list/detail/context continuity. |
| Messages Inbox | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Phase 1 introduces Inbox | Conversation | Context on wide screens while preserving mobile Inbox → Conversation. |
| Conversation Thread | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Thread can now render inside the Messages workspace on larger screens; standalone mobile flow remains intact. |
| Profile | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Readable shell works; wide screens can better separate personal, business, legal, and account sections. |
| Settings / Legal | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | Legal pages are readable and constrained; desktop is acceptable with minor typographic polish. |
| Business Dashboard | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Desktop compression pass caps the dashboard lane, adds Quick Access inside Today's Focus, and keeps Business Tools separate. |
| Work Center / Contractor Dashboard | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | Strong current-work foundation; wide screens should reveal Current Jobs | Schedule | Alerts | Job Context. |
| Opportunities / Leads | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | Auto-fit card grid works; wide screens need clearer opportunity triage and selected lead context. |
| Schedule | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | Current schedule behavior is preserved; larger screens should eventually show list plus selected visit details. |
| Current Jobs / Active Work | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | Persistent context is present; wide screens can expose active job, schedule, and next action together. |
| Quote Builder | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | Form shell is safe, but desktop should eventually pair builder with preview and source conversation/request. |
| Invoice Builder | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | Similar to Quote Builder; wide screen should support invoice editor plus preview/relationship context. |
| Business Tools | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Tool grid adapts reasonably; needs clearer desktop grouping, not more features. |
| Portfolio | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Gallery shell has a good web baseline; editor sheets and preview context should remain viewport-owned. |
| Business Profile | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Readable and contained; wide screens can better support customer preview, readiness, and editors. |
| Professional Messages | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Professional Messages now share the adaptive workspace shell; deeper Work Center context remains a later refinement. |
| AI Companion | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Positioning is guarded, but wide screens need contextual placement rules so it does not float like mobile chrome. |
| Adaptive Navigation | ✅ | ✅ | ⚠️ | ✅ | ✅ | BottomNav remains mobile/tablet; desktop Sidebar now uses the same role-aware destinations. |
| Headers / Back Behavior | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Safe-area behavior is strong; desktop back/navigation hierarchy needs standardization. |
| Modals / Temporary Editors | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Viewport-owned editor standard exists; desktop max-width and focus management need consistent adoption. |
| Forms | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | Forms are safe and readable; high-value builders should become editor + preview workspaces. |
| Photo Upload | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Uploads are generally safe; wide screens should support preview/review context without changing workflow. |
| Safe-Area Handling | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Strong on mobile; wide desktop should not rely on mobile safe-area spacing as primary layout structure. |
| Empty States | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | Calm language is present; wide layouts should avoid large empty voids. |
| Loading States | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Loading is serviceable; wide screens need skeleton/context rules so pages do not feel blank. |

## Page-by-Page Findings

### Homeowner Home

Home is compact-first and generally stable. It uses responsive page classes and auto-fit grids. On wider screens, it remains a centered mobile dashboard rather than revealing related current-work context. This is acceptable for baseline web use but not yet a full adaptive workspace.

### Discover

Discover has one of the better web baselines. It uses a wide page shell and responsive grids. The main future refinement is not adding more content, but allowing selected professional/service context to sit beside results on tablet and desktop.

### Upload / Request Creation

Request creation is intentionally focused and should stay that way. The narrow form shell is not automatically wrong on desktop because describing a problem is a focused task. Future improvement should reveal review/prepared-request context beside the form only after the homeowner has described the need.

### My Requests

My Requests needs adaptive layout work. On phone, a list-first model is correct. On desktop, the list should eventually sit beside the selected request, current stage, conversation, and next action so the homeowner stays inside the current work.

### Messages Inbox

Messages was the highest-risk adaptive surface. Phase 1 now keeps the phone-first relationship and conversation flow on compact screens while introducing the first desktop continuity workspace:

Inbox | Conversation | Relationship / Project Context

This preserves the same Contacts vs Conversations distinction and the same conversation path. The right context panel is intentionally quiet and only shows grounded relationship, request, job, schedule, or quote facts when they exist.

### Conversation Thread

Conversation Thread is safe on compact screens. Phase 1 allows it to render embedded inside the Messages workspace on medium and wide screens. Desktop does not replace the thread; it keeps the thread visible while revealing relationship identity, current work, schedule, or quote context beside it when useful.

### Profile

Profile is readable and safe across widths. It benefits from `meetro-readable-page` constraints. Future refinement should group account, personal profile, business profile entry, legal, and settings areas more naturally on wider screens.

### Settings / Legal

Legal pages are web-ready enough for baseline use. Public legal pages remain separate from authenticated navigation, while authenticated legal pages only mount BottomNav when a token exists.

### Business Dashboard

Business Dashboard has responsive grids and a wide shell. Desktop Dashboard Compression Phase 1 keeps the mobile dashboard unchanged, caps the desktop content lane, and uses desktop width for arrangement instead of larger cards. Today's Focus remains the primary orientation card and now includes Quick Access shortcuts to existing destinations: Hiring Center, Quote Builder, Invoice Builder, Schedule, and Customer Relationships. Business Tools remains its own destination.

This improves the dashboard from stretched mobile stack to professional launch platform, while preserving its role as orientation rather than a workspace. Future dashboard work should follow the Law of Proportion: additional screen width should improve composition, not scale components beyond comfortable reading size.

### Work Center / Contractor Dashboard

Work Center already has the strongest continuity foundation because persistent current-work context exists. It should become the first professional multi-pane implementation after Messages:

Current Jobs | Today's Schedule | Alerts | Selected Job Context

The risk is turning it into a generic dashboard. The implementation should organize attention, not metrics.

### Opportunities / Leads

Leads uses auto-fit card grids and is usable on web. It needs small refinement at expanded widths and adaptive work at wide widths so selected lead detail, conversation, schedule handoff, and proposal readiness can remain connected.

### Schedule

Schedule appears mostly as part of Work Center and related flows. It should eventually support list/calendar plus selected visit detail on larger screens. It should not become an independent dashboard that competes with current work.

### Current Jobs / Active Work

Active work is compact-safe. The next adaptive step is persistent context plus dynamic focus: job anchor remains visible while evaluation, proposal, work, completion, invoice, and closure change beneath or beside it.

### Quote Builder

Quote Builder is form-safe but not yet desktop-native. Desktop should eventually show:

Source request/conversation | Quote builder | Customer preview

Do not split this before the builder's workflow truth is stable.

### Invoice Builder

Invoice Builder has the same adaptive shape as Quote Builder. It should eventually pair invoice editing with preview and relationship/payment context.

### Business Tools

Business Tools is relatively ready because a tool grid can naturally expand. Refinement should focus on grouping and hierarchy, not adding more tools.

### Portfolio

Portfolio has a good baseline for web gallery behavior. The temporary editor standard should remain viewport-owned. Larger screens can eventually support gallery plus selected project/customer-preview context.

### Business Profile

Business Profile is readable and mature enough for baseline web use. The profile journey is still best as a vertical story on phone. On desktop, readiness, customer preview, services, trust, and management can be arranged as related sections without changing truth ownership.

### Professional Messages

Professional Messages has the same adaptive need as homeowner Messages, plus business relationship context. Desktop should show the conversation and relationship/work references together without moving ownership into Messages.

## Pages Already Web-Ready

- Public Presence
- Public Privacy / Terms / Contact pages
- Settings / Legal
- Profile baseline
- Business Tools baseline
- Portfolio gallery baseline

These are not perfect desktop experiences, but they open cleanly, preserve readable width, and do not require immediate adaptive architecture work.

## Pages Needing Small Refinement

- Home
- Discover
- Upload / Request Creation
- Business Dashboard
- Business Profile
- Portfolio
- Schedule views
- Business Tools
- Legal inside authenticated app

These pages mostly need spacing, section hierarchy, desktop max-width review, and shared header/back/nav rules.

## Pages Needing Adaptive Layout Work

- Work Center / Contractor Dashboard
- My Requests
- Opportunities / Leads
- Quote Builder
- Invoice Builder

Messages and Conversation Thread have moved into Phase 1 adaptive refinement. The remaining pages either preserve too little context on larger screens or keep important related work hidden behind sequential mobile navigation.

## Future Multi-Pane Workspace Candidates

Multi-pane should be used only where it protects continuity.

- Messages: Inbox | Conversation | Relationship / Project Context
- Work Center: Current Jobs | Schedule / Alerts | Selected Job Context
- My Requests: Requests | Selected Request | Conversation / Next Step
- Quote Builder: Source Context | Builder | Preview
- Invoice Builder: Source Context | Builder | Preview
- Schedule: Schedule List / Calendar | Visit Detail | Related Conversation
- Business Profile: Profile Story | Editor / Customer Preview when actively editing
- Portfolio: Gallery | Selected Project Preview / Editor when active

## Shared Components That Need Improvement

### Bottom Navigation

The current BottomNav is strong on phones and tablets. Adaptive Navigation Phase 1 keeps that behavior intact for compact and medium layouts, then presents the same destinations as a persistent desktop sidebar on wide pointer-based screens. Do not create new destinations.

### Page Shells

The shared page classes are valuable and should become the baseline:

- `meetro-responsive-page`
- `meetro-wide-page`
- `meetro-readable-page`
- `meetro-form-page`

Next step: define when each shell is used and what happens at compact, medium, expanded, wide, and ultra-wide ranges.

### Headers and Back Behavior

Headers are safe-area aware but not yet fully standardized. Desktop should distinguish:

- global navigation
- workspace title
- object back
- relationship back

Back should always return to the previous work context, not merely the previous page name.

### Modals and Temporary Editors

The Unified Editing Experience is a strong foundation. Temporary editors should remain viewport-owned. On desktop, they should avoid becoming giant centered phone sheets; use sensible max-widths, focus traps, and side-by-side preview only when it helps.

### Forms

Forms are mostly safe and narrow. That is fine for focused entry. Builders and review flows should eventually use desktop space for preview/context, not for wider fields.

### AI Companion

The Companion is guarded against covering key mobile controls. Larger screens need a placement rule: the Companion should belong near the current context, not float as a mobile orb over desktop work.

### Empty and Loading States

Empty states are calm. On desktop, avoid full-width blankness by keeping the workspace anchor visible and allowing lower-priority regions to load progressively.

### Horizontal Overflow

Global CSS and recent Messages fixes provide a good overflow baseline. Continue treating horizontal overflow as a release blocker.

## Shared Layout Rules Going Forward

### Compact

Phone width should remain one focused page at a time.

Rules:

- Preserve BottomNav on compact and medium layouts.
- Use the desktop sidebar as the wide-screen navigation anchor.
- Preserve safe-area spacing.
- Avoid split view.
- Use one primary action.
- Keep temporary editors viewport-owned.

### Medium

Large phone and small tablet should reveal modest grouping.

Rules:

- Allow two-column cards only when scanning improves.
- Keep primary workflow linear.
- Avoid dense desktop controls.
- Keep touch targets comfortable.

### Expanded

Tablet should begin showing related areas when continuity improves.

Rules:

- Use two related areas, not three or four.
- Keep the current work as the anchor.
- Avoid making secondary context compete with the primary task.

### Wide

Laptop and desktop should become connected workspaces.

Rules:

- Replace phone-style bottom dock with adaptive navigation using the same destinations.
- Use multi-pane only for continuity surfaces.
- Keep line lengths readable.
- Do not stretch cards endlessly.
- Keep the active work visible while tools change.

### Ultra-wide

Large monitor should not mean more clutter.

Rules:

- Cap readable content.
- Use lanes of related context.
- Keep empty space intentional.
- Do not introduce dashboard noise.

## Recommended First Implementation Sequence

1. Continue formalizing adaptive shell standards in code and documentation.
2. Refine Work Center as the first professional Focus Workspace implementation.
3. Refine Business Dashboard so wide screens clarify attention without adding dashboard noise.
4. Refine My Requests with request list plus selected request context.
5. Refine Quote Builder and Invoice Builder as builder plus preview/context workspaces.
6. Continue tablet verification for Messages and Conversation Thread.
8. Apply smaller spacing and hierarchy refinements to Home, Discover, Business Profile, Portfolio, and Business Tools.

## Risks To Avoid

- Creating a separate desktop product.
- Renaming workflows for desktop.
- Adding dashboard noise just because space exists.
- Showing multiple unrelated responsibilities at once.
- Moving ownership into views that should only interpret work.
- Making Messages own work, invoices, tickets, or schedule.
- Making Work Center own relationship identity.
- Stretching mobile cards until they look like desktop layouts.
- Hiding mobile behavior while trying to improve web.
- Treating ultra-wide monitors as a reason to expose every feature.
- Showing both BottomNav and desktop Sidebar at the same wide-screen breakpoint.

## Final Recommendation

Meetro Community should proceed as one adaptive product.

The current codebase still has the adaptive foundation intact: shared shells exist, global overflow guards are present, public and app experiences are separated, many pages already use auto-fit grids or readable width caps, and Messages now demonstrates the first adaptive workspace pattern.

The next phase should not redesign the product. It should formalize adaptive shells and then improve the next highest-continuity surface: Work Center.

Adaptive success should be measured by one question:

Does the extra space help the user remain inside the same work?

If yes, reveal more context.

If no, preserve focus.

## Phase 1 Implementation Note — Messages Adaptive Workspace

Phase 1 turns Messages into the first adaptive workspace without changing message data models or mobile routing.

What changed:

- Compact/mobile keeps the existing flow: Inbox → Conversation → Back to Inbox.
- Medium/tablet can keep the inbox and selected conversation side-by-side when pointer and width support it.
- Wide/desktop introduces a three-column workspace: Inbox | Conversation | Context.
- The context panel is hidden until wide workspace conditions are met.
- The context panel uses existing relationship and conversation projections only.
- Empty context uses the calm state: “Context will appear here as this relationship develops.”
- Schedule, quote, emergency, and workflow cards remain inside Conversation Thread.

Messages readiness improved from adaptive-risk to first-pass adaptive-ready:

- Compact remains ✅.
- Medium remains ⚠️ because split layout should still be tested on real tablet widths.
- Expanded, Wide, and Ultra-wide move from ❌ to ⚠️ because the workspace exists but deeper context selection, navigation polish, and real-device verification remain future work.

## Adaptive Navigation Phase 1

Adaptive Navigation Phase 1 establishes the first shared navigation rule for Meetro Community:

- Compact and medium layouts keep the existing BottomNav.
- Wide pointer-based desktop layouts hide BottomNav and show a persistent left Sidebar.
- The Sidebar uses the same destinations, labels, active states, unread badges, and role-aware routing as BottomNav.
- Professional navigation remains: Dashboard, Leads, Work Center, Messages, Profile.
- Homeowner navigation remains: Home, Discover, Request, Messages, Profile.
- Business Tools remains reachable from existing dashboard/workflow paths rather than being forced into the Sidebar.

Why BottomNav remains mobile-only:

- It is touch-first.
- It respects mobile safe areas.
- It keeps phone and tablet workflows familiar.
- It should not make desktop feel like a stretched phone.

Why Sidebar becomes the desktop anchor:

- It gives wide screens one stable navigation home.
- It frees the bottom edge for workspace content.
- It supports Messages as a desktop workspace without competing with conversation, relationship, or project context.
- It adapts navigation presentation without changing workflow ownership.

Pages that still need workspace refinement after this:

- Work Center should become the next professional continuity workspace.
- Business Dashboard still needs wider-space hierarchy refinement.
- Request creation and My Requests should eventually reveal review/context side-by-side where useful.
- Quote Builder and Invoice Builder should eventually use source context, editor, and preview panes on desktop.

## Desktop Profile Preservation Card Phase 1

What changed:

- Mobile and tablet still use BottomNav and the full Profile page.
- The existing Profile route remains available and unchanged.
- On wide pointer-based desktop layouts, the Sidebar Profile item opens a floating scrollable Profile card instead of replacing the current workspace.
- The Profile card hosts the existing Profile experience and card stack as closely as possible to the mobile Profile page.
- The current workspace remains fully visible behind the card.
- Closing the card returns to the exact same workspace state because no route change is required to open it.
- Existing Profile actions still open or route through their current owners when selected.

Why this belongs on desktop only:

- On phone, Profile is a primary BottomNav destination and needs the full screen.
- On desktop, Profile supports the user but usually is not the current work.
- A floating Profile card lets the same Profile experience appear without making the user mentally leave Messages, Work Center, Leads, or another active workspace.
- The card does not dim, blur, resize, or push the workspace.

Remaining follow-up:

- Full Profile can later be refined internally, but mobile remains the source experience.
- Legal and settings routes still open as pages because they are intentional destinations.

New desktop standard:

- Profile uses a preservation card: the existing mobile experience hosted inside a floating desktop card.
- Conversation overflow already uses a context card.
- Future Job, Customer, Visit, and object overflow actions should reuse this same temporary interaction pattern before introducing panels or new surfaces.

Law of Familiarity:

When Meetro already has a successful interaction pattern, reuse it. Consistency reduces learning. Familiarity creates calm.

Law of Preservation:

Keep intact what works. Adapt its presentation. Never redesign an experience simply because the screen becomes larger. Desktop should host proven mobile experiences before inventing new desktop-only versions.

## Constitution Check

Does this preserve one Meetro Community experience across every device?

**Answer:** Yes, if Meetro keeps the same workflows, truth ownership, language, and relationship model while allowing larger screens to reveal more helpful context. The current baseline preserves one product identity, but wide and ultra-wide layouts need intentional adaptive work before Meetro fully feels native across web, tablet, desktop, and future large-screen platforms.
