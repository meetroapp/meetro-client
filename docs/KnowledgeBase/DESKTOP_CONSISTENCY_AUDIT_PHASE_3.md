# Desktop Consistency Audit Phase 3

Date: July 4, 2026

Status: Phase 3 Task 007 audit and documentation pass

## Purpose

This audit verifies that Meetro desktop surfaces belong to one coherent product architecture.

This is not a redesign. Phone remains the source of truth. Desktop adapts presentation, spacing, context, and navigation anchors without changing workflows, ownership, routing, backend contracts, or business logic.

The audit follows:

- Meetro Surface Registry
- Adaptive Web Baseline Audit
- Desktop Workspace Behavior Study
- Communication Center Architecture Audit
- Companion Presence System

## Desktop Principle

Desktop should reveal context.

It should not reveal complexity.

Every surface should communicate:

- Home Base
- Parent Surface
- Surface Type
- Purpose
- Primary Question
- Ownership
- Referenced By
- Mobile Behavior
- Desktop Behavior

No desktop surface should feel isolated from Meetro's home structure.

## Surfaces Audited

| Surface | Home Base | Parent Surface | Surface Type | Desktop Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Professional Business Dashboard | Professional navigation | Meetro / Dashboard | Dashboard | Compliant with refinement | Desktop compression and Quick Access support orientation without duplicating Business Tools. |
| Homeowner Home | Homeowner navigation | Meetro / Dashboard | Dashboard | Needs future refinement | Mobile is strong; desktop can eventually reveal active request context without becoming a business dashboard. |
| Discover Services | Homeowner navigation | Meetro / Dashboard | Focus Page | Needs future refinement | Search/results are readable; wider screens should eventually show selected service context. |
| Request Creation | Homeowner navigation | Homeowner Home | Focus Page | Registry correction made | The surface now has explicit registry ownership as the prepared request flow. |
| Project Details | Homeowner work | Homeowner Home / My Requests | Focus Page | Registry correction made | The surface now has explicit registry ownership as homeowner project context. |
| Messages / Communication Center | Relationships | Communication Center | Workspace | Compliant reference surface | Current desktop reference: Inbox, Conversation, Relationship/Work Context. |
| Messages Inbox | Messages Workspace | Messages Workspace | Workspace | Compliant | Rows and sections belong to communication contexts; Contacts remains the relationship directory anchor. |
| Conversation Thread | Messages Workspace | Messages Workspace | Workspace | Compliant | Conversation stays communication-first while desktop context supports it. |
| Relationship Inspector | Communication Center | Communication Center | Inspector | Compliant | Projection-only context; does not own work, schedules, invoices, or identity truth. |
| Saved Chat History | Messages Workspace | Messages Workspace | Reference Attention | Compliant | User-saved only, and rows remain conversations. |
| Work Center Landing | Professional navigation | Meetro / Work | Workspace | Future adaptive candidate | Should become the next major multi-pane workspace after Messages. |
| Current Jobs | Work Center | Work Center Landing | Workspace | Future adaptive candidate | Current work should anchor desktop execution. |
| Schedule | Work Center | Work Center Landing | Workspace | Future adaptive candidate | Should support planning attention without competing with current work. |
| Emergency | Work | Homeowner Home / Work Center | Focus Page | Registry correction made | Emergency flow now has explicit registry ownership and Messages boundary language. |
| Business Leads | Professional navigation | Meetro / Work | Focus Page | Needs future refinement | Leads need selected opportunity context on desktop, not extra dashboard metrics. |
| Quote Builder | Work Center / Business Tools | Work Center Landing | Focus Page | Future adaptive candidate | Eventually needs source context, builder, and preview. |
| Invoice Builder | Work Center / Business Tools | Work Center Landing | Focus Page | Future adaptive candidate | Eventually needs completion evidence, editor, and preview. |
| Completion | Current Work | Current Jobs | Focus Page | Compliant baseline | Ownership is correctly separate from Closure Review. |
| Closure Review | Current Work / Homeowner request flow | Current Jobs | Focus Page | Compliant baseline | Customer confirmation remains the owner of closure acceptance. |
| Job History | Work Center | Work Center Landing | Reference Attention | Compliant baseline | History remains reference attention, not active work. |
| Business Tools Hub | Professional navigation | Meetro / Business | Business Management Page | Compliant baseline | Remains the business management home; Dashboard quick access does not replace it. |
| Business Profile | Professional business management | Meetro / Business | Business Management Page | Compliant baseline | Business identity remains distinct from Personal Profile and Settings. |
| Business Information | Business Profile | Business Profile | Business Management Page | Compliant baseline | Visible truths have owner/action paths. |
| Business Readiness | Business Profile | Business Profile | Business Management Page | Compliant baseline | Availability remains one shared truth. |
| Business Verification | Business Profile | Business Profile | Business Management Page | Compliant baseline | Verification is actionable without fake verification. |
| Customer Preview | Business Profile | Business Profile | Business Management Page | Compliant baseline | Customer-facing projection remains routed from Business Profile. |
| Business Portfolio | Business Tools / Business Profile | Meetro / Business | Business Management Page | Compliant baseline | Proof-of-work page; temporary editors remain viewport-owned. |
| Hiring Center | Business Tools Hub | Business Tools Hub | Business Management Page | Compliant baseline | Hiring setup belongs here, not Messages Hiring. |
| Invoices | Business Tools / Work Center | Business Tools Hub | Business Management Page | Compliant baseline | Invoice/payment ownership stays outside Messages. |
| Membership | Profile / Business Tools | Business Tools Hub | Business Management Page | Compliant baseline | Destination from profile/business contexts; not embedded in temporary cards. |
| Personal Profile | Shared navigation | Meetro / Profile / Account | Focus Page | Mobile baseline preserved | Mobile remains full page. Desktop uses hosted behavior. |
| Desktop Hosted Profile Card | Desktop Sidebar | Meetro / Profile / Account | Hosted Mobile Experience | Compliant | Temporary, dismissible, workspace-preserving hosted surface. |
| Account Settings | Personal Profile | Meetro / Profile / Account | Focus Page | Compliant baseline | Settings remains a destination, not a context card. |
| Ask Meetro Resting Pill | Global companion | Meetro / Companion | Context Card | Compliant baseline | Present, movable where supported, and not layout-owning. |
| Meetro Workspace Companion | Global companion | Meetro / Companion | Context Card | Compliant baseline | Provides observation/recommendation/action without replacing work. |
| Meetro Companion Conversation | Global companion | Meetro / Companion | Companion State | Compliant baseline | Explicit user conversation only; not automatic workspace ownership. |
| Companion Listening / Thinking / Responding States | Companion | Meetro Companion Conversation | Companion State | Compliant baseline | States support the Companion conversation without owning workflows. |

## Architectural Drift Found

### Registry Gaps

The audit found that several desktop-enabled surfaces were referenced by tasks and routes but did not yet have explicit Surface Registry entries:

- Request Creation
- Project Details
- Emergency

These were not runtime bugs. They were naming and ownership gaps. Without registry entries, future tasks could refer to "upload," "request page," "project page," or "emergency" vaguely and risk changing the wrong surface.

### Desktop Maturity Varies by Surface

Messages is currently the clearest adaptive desktop reference. Many other surfaces are responsive and safe, but still behave like centered mobile focus pages on large screens.

This is acceptable for the current phase. It becomes drift only if future tasks add desktop-only workflows instead of adaptive presentation.

### Work Ownership Boundaries Need Ongoing Protection

The audit confirms the current boundary:

- Dashboard owns orientation.
- Communication Center owns communication context.
- Work Center owns execution.
- Business Profile owns business identity.
- Business Tools owns business management destinations.
- Companion owns guidance.

Messages should continue to show references to schedules, quotes, invoices, emergency work, and current work without owning those systems.

### Hosted Experiences Need One Interaction Language

The Desktop Hosted Profile Card now aligns with the hosted mobile experience rule: temporary, dismissible, non-drawer, and workspace-preserving.

Future hosted previews should reuse the same principle rather than creating new desktop-only drawers or replacement pages.

## Implemented Corrections

This pass implemented documentation and registry corrections only:

1. Added `Request Creation` to `docs/KnowledgeBase/MEETRO_SURFACE_REGISTRY.md`.
2. Added `Project Details` to `docs/KnowledgeBase/MEETRO_SURFACE_REGISTRY.md`.
3. Added `Emergency` to `docs/KnowledgeBase/MEETRO_SURFACE_REGISTRY.md`.
4. Updated the registry hierarchy so those surfaces have visible homes.
5. Created this audit document as the Phase 3 desktop consistency record.

No runtime UI, routing, storage, backend, projection, or workflow logic was changed.

## Surfaces Already Compliant

These surfaces already follow the current desktop consistency rules closely enough for this phase:

- Messages / Communication Center
- Conversation Thread
- Relationship Inspector
- Saved Chat History
- Professional Business Dashboard
- Business Profile
- Business Readiness
- Business Portfolio
- Business Tools Hub
- Desktop Hosted Profile Card
- Ask Meetro Resting Pill
- Meetro Workspace Companion

They still may receive future adaptive refinement, but their ownership and behavior are coherent.

## Surfaces Needing Small Desktop Refinement

These surfaces are safe but would benefit from proportion, spacing, or section hierarchy refinement:

- Homeowner Home
- Discover Services
- Request Creation
- Project Details
- Business Leads
- Business Tools Hub
- Business Profile
- Portfolio
- Account Settings

These should stay focused. Refinement should improve reading comfort and context, not add unrelated panels.

## Surfaces That Should Eventually Become Desktop Workspaces

These should be considered for multi-pane or inspector-style adaptive work only after their mobile truth is stable:

- Work Center Landing
- Current Jobs
- Schedule
- My Requests / Project Details
- Quote Builder
- Invoice Builder
- Business Leads

Recommended future shape:

- Work Center: Current Jobs | Schedule / Alerts | Selected Job Context
- My Requests: Request List | Selected Project | Conversation / Next Step
- Quote Builder: Source Context | Builder | Preview
- Invoice Builder: Source Context | Builder | Preview
- Schedule: Visit List / Calendar | Visit Detail | Related Conversation

## Hosted Mobile Experience Audit

Hosted experiences should behave consistently:

- Temporary
- Dismissible
- Not drawers
- Not replacement pages
- Not duplicated workflows
- No workspace blur or layout shift
- Return to originating workspace

Current compliant hosted/reference candidates:

- Desktop Hosted Profile Card
- Relationship Inspector context
- Future project, schedule, proposal, and customer preview cards

Future hosted surfaces should be launchers or inspectors, not hidden editors that duplicate the owning destination.

## Companion Consistency

Companion state should remain:

Presence -> Workspace Guidance -> Conversation

The Companion may:

- Observe the current workspace.
- Offer one grounded recommendation.
- Prepare the next action.
- Route to an existing destination.
- Enter conversation when the user explicitly asks.

The Companion may not:

- Replace a page.
- Duplicate a dashboard.
- Own decisions.
- Own workflow state.
- Hide or compete with primary workspace actions.

This preserves the Law of Companion Presence: always present, never intrusive.

## Future Architectural Ideas

These ideas are recommendations only. They were not implemented in this pass.

1. Make Work Center the next full adaptive workspace after Messages.
2. Convert Quote Builder and Invoice Builder into editor plus preview layouts on desktop.
3. Let Project Details become a homeowner current-work detail connected to conversation and next action.
4. Standardize desktop page headers after route ownership is fully documented.
5. Create a reusable hosted preview contract for project, schedule, proposal, and customer preview surfaces.
6. Add a desktop spacing/proportion token set so cards stop growing once readable.
7. Continue using Messages as the reference for relationship context without moving work ownership into Messages.

## Risk To Avoid

- Do not create desktop-only workflows.
- Do not turn dashboards into dense control centers.
- Do not make every wide page multi-pane.
- Do not let Messages create or own work.
- Do not use Profile, Business Profile, Settings, and Business Tools interchangeably.
- Do not let hosted experiences become drawers, hidden full pages, or duplicated editors.
- Do not treat extra width as permission to add extra features.

## Recommended First Implementation Sequence

1. Stabilize and preserve Messages as the adaptive reference.
2. Continue small proportion passes on Professional Business Dashboard and Business Profile.
3. Implement Work Center adaptive workspace only when the current-work model is stable.
4. Refine My Requests / Project Details as the homeowner continuity equivalent.
5. Adapt Quote Builder and Invoice Builder after source context and preview contracts are clear.
6. Create shared desktop header and hosted-preview patterns once at least two surfaces need them.

## Final Recommendation

Meetro's desktop foundation is intact.

The product now has a clearer registry-backed map for desktop surfaces, and the highest-risk ambiguity is not visual. It is ownership drift. The next desktop work should continue to make each surface feel like one room inside the same Meetro home:

- Dashboard orients.
- Communication Center preserves relationships.
- Work Center executes.
- Business Profile represents identity.
- Business Tools manages business systems.
- Companion guides.

## Constitution Check

Does this preserve one Meetro desktop home?

Yes. Based on the audit, the current architecture can preserve one Meetro Community experience across devices as long as desktop reveals context without changing ownership, duplicating workflows, or departing from the mobile source of truth.
