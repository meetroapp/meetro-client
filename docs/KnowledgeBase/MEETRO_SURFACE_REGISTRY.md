# Meetro Surface Registry

## Purpose

This registry is the official architectural reference for every Meetro page, workspace, hosted mobile experience, context card, inspector, companion state, and business management surface.

It exists to prevent future implementation confusion between surfaces that sound similar but have different ownership.

Examples:

- Personal Profile
- Desktop Hosted Profile Card
- Business Profile
- Business Readiness
- Account Settings
- Work Center
- Messages Workspace
- Ask Meetro Companion

Every future Codex task should name the exact target surface before implementation begins.

## Surface Hierarchy

This hierarchy explains ownership, not navigation.

```text
Meetro
├── Dashboard
│   ├── Professional Business Dashboard
│   └── Homeowner Home
│       ├── Discover Services
│       └── Request Creation
│
├── Relationships
│   ├── Messages Inbox
│   ├── Conversation Thread
│   ├── Relationship Inspector
│   ├── Customer Timeline
│   └── Saved Chat History
│
├── Work
│   ├── Project Details
│   ├── Emergency
│   ├── Work Center Landing
│   ├── Current Jobs
│   ├── Schedule
│   ├── Evaluation Notes
│   ├── Quote Builder
│   ├── Invoice Builder
│   ├── Completion
│   ├── Closure Review
│   └── Job History
│
├── Business
│   ├── Business Tools Hub
│   ├── Business Profile
│   │   ├── Business Information
│   │   ├── Business Readiness
│   │   ├── Business Verification
│   │   └── Customer Preview
│   ├── Business Portfolio
│   ├── Business Availability
│   ├── Service Areas
│   ├── Price Book
│   ├── Hiring Center
│   ├── Business Reports
│   ├── Contracts
│   ├── Invoices
│   └── Membership
│
├── Profile / Account
│   ├── Personal Profile
│   ├── Desktop Hosted Profile Card
│   ├── Account Settings
│   ├── Authentication
│   └── Legal / Public Policies
│
└── Companion
    ├── Ask Meetro Resting Pill
    ├── Meetro Workspace Companion
    ├── Meetro Companion Conversation
    ├── Companion Listening State
    ├── Companion Thinking State
    └── Companion Responding State
```

## Architectural Principles

### 🏮 Law of Parentage

Every surface belongs to one parent.

A surface may be referenced by many places.

It belongs to only one.

### 🏮 Ownership vs Presentation

A surface owns information.

Other surfaces may present that information.

Presentation never transfers ownership.

### 🏮 Three Arrival Methods

Every surface should be reached through one of these patterns:

1. Orientation
   Example: Dashboard points the user toward what matters.

2. Navigation
   Example: Sidebar, BottomNav, tabs, intentional menu movement.

3. Context
   Example: Message card, job card, notification, or Meetro Companion suggestion.

Do not introduce additional arrival models unless the Constitution evolves.

## Surface Type Standardization

Use these surface types consistently:

- Dashboard
- Workspace
- Focus Page
- Hosted Mobile Experience
- Context Card
- Inspector
- Business Management Page
- Reference Attention
- Companion State

If an existing entry uses an unclear type, refine the wording without changing behavior.

## Core Navigation

### Professional Business Dashboard

- Official Page / Surface Name: Professional Business Dashboard
- Route / Component: `src/pages/BusinessDashboard.jsx`
- Home Base: Professional navigation
- Parent Surface: Meetro / Dashboard
- Role: Professional
- Surface Type: Dashboard
- Purpose: Orient the business owner around what deserves attention and provide fast access to common destinations.
- Primary Question: What deserves my attention right now?
- Owns: Business dashboard orientation, today's focus presentation, dashboard-level quick access, high-level professional status summary.
- Referenced By: Desktop Sidebar, BottomNav in professional mode, Meetro Companion, Business Tools shortcuts, Work Center entry points.
- What Belongs Here: Today's focus, availability summary, unread messages, active jobs summary, schedule summary, recent activity, leads summary, business tool shortcuts.
- What Does NOT Belong Here: Full Work Center execution, profile editing, full Business Tools management, detailed quote/invoice creation, relationship records.
- Mobile Behavior: Full-page dashboard with BottomNav.
- Desktop Behavior: Compressed command center with Sidebar navigation and proportion-aware cards.
- Known Adaptive Rules: Desktop should improve composition, not enlarge cards. Quick Access shortcuts may reduce navigation but must not duplicate Business Tools.
- Future Evolution: May become a stronger orientation launch platform while Work Center remains the operational workspace.
- Common Task Reference Name: Professional Business Dashboard desktop command center

### Homeowner Home

- Official Page / Surface Name: Homeowner Home
- Route / Component: `src/pages/Home.jsx`
- Home Base: Homeowner navigation
- Parent Surface: Meetro / Dashboard
- Role: Homeowner
- Surface Type: Dashboard
- Purpose: Orient homeowners around active requests, messages, local discovery, and request creation.
- Primary Question: What is happening with my home projects right now?
- Owns: Homeowner orientation, personal request entry, homeowner-facing next-step summary.
- Referenced By: BottomNav in personal mode, Meetro Companion, public/homeowner request flows.
- What Belongs Here: Current requests, next steps, local spotlight, messages summary, emergency/request entry points.
- What Does NOT Belong Here: Professional Work Center, business controls, business availability, hiring, business tools.
- Mobile Behavior: Full-page homeowner landing with BottomNav.
- Desktop Behavior: Should become a calm homeowner orientation workspace only when adaptive work is scheduled.
- Known Adaptive Rules: Preserve homeowner-first language and never expose professional-side controls.
- Future Evolution: May gain adaptive request context on larger screens without becoming a business dashboard.
- Common Task Reference Name: Homeowner Home

### Discover Services

- Official Page / Surface Name: Discover Services
- Route / Component: `src/pages/Discover.jsx`
- Home Base: Homeowner navigation
- Parent Surface: Meetro / Dashboard
- Role: Homeowner
- Surface Type: Focus Page
- Purpose: Help homeowners find and evaluate services or businesses before starting or continuing communication.
- Primary Question: Who can help with what I need?
- Owns: Homeowner service discovery presentation and marketplace search interaction.
- Referenced By: Homeowner Home, request creation, BottomNav, Meetro Companion.
- What Belongs Here: Search, service discovery, professional/business previews, marketplace results.
- What Does NOT Belong Here: Business profile editing, Work Center controls, relationship management, invoice creation.
- Mobile Behavior: Full-page discovery flow with BottomNav.
- Desktop Behavior: May become a wider discovery workspace later, but workflow remains homeowner-first.
- Known Adaptive Rules: Wider screens may reveal more search context, not more unrelated content.
- Future Evolution: May connect discovery, business preview, and request start in a wider adaptive flow.
- Common Task Reference Name: Discover Services

### Request Creation

- Official Page / Surface Name: Request Creation
- Route / Component: `src/pages/Upload.jsx`
- Home Base: Homeowner navigation
- Parent Surface: Homeowner Home
- Role: Homeowner
- Surface Type: Focus Page
- Purpose: Help homeowners describe what they need and review what Meetro prepared before sending.
- Primary Question: What do I need help with?
- Owns: Homeowner request preparation, editable request review, customer decision to send, and request creation handoff.
- Referenced By: Homeowner Home, Discover Services, BottomNav Request action, Meetro Companion, Project Details.
- What Belongs Here: Project description, prepared request details, editable title/details, closest match review, customer-controlled send action.
- What Does NOT Belong Here: Professional lead management, business-side quoting, invoice creation, Work Center execution, or software taxonomy as the first user burden.
- Mobile Behavior: Full focused request preparation flow.
- Desktop Behavior: Focused request preparation page with comfortable reading/editing width; wider screens may reveal review context without adding configuration.
- Known Adaptive Rules: Understanding before prediction. Meetro prepares; people decide.
- Future Evolution: May become an adaptive describe-and-review workspace after request truth remains stable.
- Common Task Reference Name: Upload / Request creation

### Messages Workspace

- Official Page / Surface Name: Messages
- Route / Component: `src/pages/MessagesInbox.jsx`, `src/pages/ConversationThread.jsx`
- Home Base: Relationships
- Parent Surface: Communication Center
- Role: Shared
- Surface Type: Workspace
- Purpose: Relationship Communication.
- Primary Question: What should happen next with this relationship?
- Owns: Conversation context, relationship continuity, intent visibility, conversation status, unread state, and next action awareness.
- Referenced By: Homeowner Home, Professional Business Dashboard, Work Center, Relationship Identity, Meetro Companion.
- What Belongs Here: Conversation lists, communication contexts, contact directory entry, conversation opening, saved chat history, message search, relationship context, intent, current owner, next decision, and desktop relationship/work summaries.
- What Does NOT Belong Here: Creating emergency work, creating tickets, creating invoices, creating schedules, publishing hiring positions, owning active work.
- Mobile Behavior: Focused flow: Inbox → Conversation → Back to Inbox.
- Desktop Behavior: Adaptive Communication Center: Inbox | Conversation | Relationship/Work Context where width allows. Desktop reveals context; it does not create desktop-only messaging logic.
- Known Adaptive Rules: Contacts preserve people. Conversations preserve communication. A conversation row must open ConversationThread. Desktop context is projection-only and may summarize relationship identity, intent, authority, related work, and memory without owning those domains.
- Future Evolution: Relationship Inspector, persistent context, shared timeline, workspace memory, hosted desktop inspectors, and Companion communication awareness.
- Common Task Reference Name: Messages / Communication Center

### Work Center

- Official Page / Surface Name: Work Center Landing
- Route / Component: `src/pages/ContractorDashboard.jsx`
- Home Base: Professional navigation
- Parent Surface: Meetro / Work
- Role: Professional
- Surface Type: Workspace
- Purpose: Organize professional work by current responsibility and lifecycle stage.
- Primary Question: What work needs my attention?
- Owns: Professional operational attention hierarchy and active work entry.
- Referenced By: Professional Business Dashboard, Schedule, Messages cards, Meetro Companion.
- What Belongs Here: Current jobs, today's schedule, opportunities, quotes, revenue review, job history, active work execution.
- What Does NOT Belong Here: Business identity editing, personal account settings, public profile content editing, message-only relationships.
- Mobile Behavior: Focused operational workspace with current work as priority.
- Desktop Behavior: Should eventually become a multi-pane operational workspace where current work, schedule, and context can coexist.
- Known Adaptive Rules: Immediate attention outranks today's attention; reference attention should not compete with active work.
- Future Evolution: First major candidate for Focus Workspace expansion after Messages.
- Common Task Reference Name: Work Center Landing

### Business Leads

- Official Page / Surface Name: Business Leads
- Route / Component: `src/pages/BusinessLeads.jsx`
- Home Base: Professional navigation
- Parent Surface: Meetro / Work
- Role: Professional
- Surface Type: Focus Page
- Purpose: Review eligible homeowner requests and lead opportunities.
- Primary Question: Which new opportunities should I consider?
- Owns: New lead review and opportunity decision surface.
- Referenced By: Professional Business Dashboard, Work Center, Meetro Companion.
- What Belongs Here: Matching request opportunities, lead review, accept/pass decisions, lead details.
- What Does NOT Belong Here: Existing relationship conversations, active work execution, quote builder internals, business identity editing.
- Mobile Behavior: Full-page professional opportunity review.
- Desktop Behavior: May become a focused lead review workspace later.
- Known Adaptive Rules: Leads are for new opportunities; established relationships continue through Messages and Work Center.
- Future Evolution: May reveal opportunity details beside the lead list on wider screens.
- Common Task Reference Name: Business Leads

### Personal Profile

- Official Page / Surface Name: Personal Profile
- Route / Component: `src/pages/Profile.jsx`
- Home Base: Shared navigation
- Parent Surface: Meetro / Profile / Account
- Role: Shared
- Surface Type: Focus Page
- Purpose: Manage personal/account identity and account-level entry points.
- Primary Question: Who am I in Meetro, and how do I manage my account?
- Owns: Personal account identity presentation, personal profile photo, account mode entry points.
- Referenced By: BottomNav, Desktop Hosted Profile Card, Account Settings, Meetro Companion.
- What Belongs Here: Personal identity, account mode entry, support/legal links, settings entry, membership/account actions.
- What Does NOT Belong Here: Business public identity editing, business readiness, business verification, Business Tools workflows.
- Mobile Behavior: Full Profile page opened from BottomNav.
- Desktop Behavior: Hosted inside Desktop Hosted Profile Card when opened from Sidebar Profile.
- Known Adaptive Rules: Profile means personal/account identity. It does not mean Business Profile.
- Future Evolution: Desktop can host the mobile profile experience temporarily without replacing the mobile page.
- Common Task Reference Name: Personal Profile

### Business Tools Hub

- Official Page / Surface Name: Business Tools Hub
- Route / Component: Business Tools registry and route surfaces
- Home Base: Professional navigation
- Parent Surface: Meetro / Business
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Serve as the business management hub for professional tools.
- Primary Question: What business management tool do I need?
- Owns: Business management tool organization and tool destination registry.
- Referenced By: Professional Business Dashboard Quick Access, Business Profile, Desktop Sidebar when supported, Meetro Companion.
- What Belongs Here: Portfolio, pricing, invoices, contracts, reports, hiring center, business support tools, management destinations.
- What Does NOT Belong Here: Today's operational work, conversation threads, personal account settings, homeowner request creation.
- Mobile Behavior: Full-page business tools hub.
- Desktop Behavior: Business management hub; should remain distinct from Dashboard quick access.
- Known Adaptive Rules: Dashboard may link to Business Tools, but Business Tools remains its own home base.
- Future Evolution: May become a more organized management workspace as individual business tools mature.
- Common Task Reference Name: Business Tools Hub

## Profile / Identity

### Account Settings

- Official Page / Surface Name: Account Settings
- Route / Component: Settings route/page where account preferences, security, and legal preferences are handled.
- Home Base: Personal Profile
- Parent Surface: Meetro / Profile / Account
- Role: Shared
- Surface Type: Focus Page
- Purpose: Manage account preferences, language, security, session, notifications, legal preferences, and support settings.
- Primary Question: How do I manage my account preferences and security?
- Owns: Account preferences, security/session controls, language/preferences where implemented.
- Referenced By: Personal Profile, Desktop Hosted Profile Card, legal/support links.
- What Belongs Here: Account preferences, security, session, notification settings, legal acknowledgements.
- What Does NOT Belong Here: Business readiness, customer preview, Work Center execution, conversation threads.
- Mobile Behavior: Full settings page reached from Profile.
- Desktop Behavior: Opens intentionally from hosted profile card or navigation action; not embedded in a temporary card.
- Known Adaptive Rules: Settings is a destination, not a context card.
- Future Evolution: May separate security, preferences, and legal as settings grows.
- Common Task Reference Name: Account Settings

### Authentication

- Official Page / Surface Name: Authentication
- Route / Component: `src/pages/Login.jsx`; app entry routing in `src/main.jsx`; 2FA helper in `src/utils/twoFactorVerification.js`
- Home Base: Profile / Account
- Parent Surface: Meetro / Profile / Account
- Role: Shared
- Surface Type: Focus Page
- Purpose: Confirm the user identity and restore the correct personal/business account context before the app opens.
- Primary Question: Who is entering Meetro, and what account context should load?
- Owns: Login/signup presentation, 2FA verification handoff, session restoration, post-login destination selection.
- Referenced By: Public website `/login` and `/app` entry points, session guards, Personal Profile, account switching.
- What Belongs Here: Credentials, signup fields, Terms/Privacy agreement, 2FA challenge and failure-state messaging, clean login/session recovery.
- What Does NOT Belong Here: Business profile creation truth, Messages data repair, Work Center execution, public marketing content, or fake verification shortcuts.
- Mobile Behavior: Full focused authentication flow before authenticated navigation.
- Desktop Behavior: Focused authentication flow; public website remains separate until the user intentionally enters the app.
- Known Adaptive Rules: Authentication restores account context but does not define business ownership. Business Profile existence, session state, and active role remain separate.
- Future Evolution: May gain account recovery and security settings while preserving backend verification authority.
- Common Task Reference Name: Authentication

### Legal / Public Policies

- Official Page / Surface Name: Legal / Public Policies
- Route / Component: `src/public/PublicSite.jsx`; policy documents in `docs/KnowledgeBase/MEETRO_COMMUNITY_PRIVACY_POLICY.md`, `docs/KnowledgeBase/MEETRO_COMMUNITY_TERMS_OF_USE.md`, `docs/KnowledgeBase/MEETRO_COMMUNITY_GUIDELINES.md`, and disclaimer documents.
- Home Base: Profile / Account
- Parent Surface: Public Presence / Profile / Account
- Role: Shared
- Surface Type: Reference Attention
- Purpose: Provide policy, terms, privacy, guideline, and disclaimer references without entering authenticated workflows.
- Primary Question: What rules, policies, or public information govern Meetro use?
- Owns: Public/legal reference presentation and links to policy materials.
- Referenced By: Public website, Personal Profile, Account Settings, authentication agreement copy, support/legal links.
- What Belongs Here: Privacy Policy, Terms of Service, Community Guidelines, AI assistance disclaimer, emergency disclaimer, contact/legal reference paths.
- What Does NOT Belong Here: Authenticated app shell, BottomNav, Work Center, Messages, business management, pricing claims, launch claims, or workflow state.
- Mobile Behavior: Public/legal pages remain standalone and readable; in-app legal links may open focused reference pages.
- Desktop Behavior: Public/legal pages remain outside the authenticated app shell; authenticated workspace should not mount around public pages.
- Known Adaptive Rules: Public routes stay public. Legal/reference content does not become product navigation or workflow ownership.
- Future Evolution: May expand as public launch policies mature, without merging public presence and authenticated app experiences.
- Common Task Reference Name: Legal / Public Policies

### Desktop Hosted Profile Card

- Official Page / Surface Name: Desktop Hosted Profile Card
- Route / Component: Desktop Profile hosting logic in shared navigation/Profile integration.
- Home Base: Desktop Sidebar
- Parent Surface: Meetro / Profile / Account
- Role: Shared
- Surface Type: Hosted Mobile Experience
- Purpose: Let desktop users access the existing Profile experience without leaving the current workspace.
- Primary Question: How can I quickly access account actions without leaving my workspace?
- Owns: Desktop temporary hosting of the existing mobile Profile experience.
- Referenced By: Desktop Sidebar Profile item.
- What Belongs Here: Hosted Personal Profile essentials and links to existing destinations.
- What Does NOT Belong Here: New settings UI, embedded Settings pages, embedded business editors, duplicate Profile implementation, or desktop-only account workflows.
- Mobile Behavior: Does not apply. Mobile opens the full Personal Profile page.
- Desktop Behavior: Temporary hosted surface from Sidebar Profile; closing with the close button, outside click, or Escape returns to the unchanged workspace.
- Known Adaptive Rules: Desktop enhancement must preserve mobile baseline. The card may host the existing Personal Profile experience, but selected Profile actions must open their existing destinations instead of expanding inside the card.
- Future Evolution: May become a universal hosted mobile pattern for lightweight account surfaces only.
- Common Task Reference Name: Desktop Hosted Profile Card

### Business Profile

- Official Page / Surface Name: Business Profile
- Route / Component: `src/pages/ContractorProfile.jsx`
- Home Base: Professional business management
- Parent Surface: Meetro / Business
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Represent the business identity, readiness, customer preview, services, proof, and verification.
- Primary Question: How is my business represented to customers?
- Owns: Business identity, readiness presentation, verification detail presentation, customer preview, services offered, reviews/proof presentation, public business presence.
- Referenced By: Professional Business Dashboard, Discover Services, Messages, Customer Preview, Meetro Companion.
- What Belongs Here: Logo, business name, category, service area, availability/readiness, customer preview, services offered, reviews, portfolio proof, business information, verification, setup.
- What Does NOT Belong Here: Personal account identity, app settings, Work Center active execution, lead inbox, generic dashboard metrics.
- Mobile Behavior: Full business profile page.
- Desktop Behavior: Business identity management page; may use adaptive spacing but remains a focused business identity destination.
- Known Adaptive Rules: Business Profile is not Personal Profile. Business identity uses shared projections, not page-local truth.
- Future Evolution: May become a richer business identity workspace without becoming Business Tools.
- Common Task Reference Name: Business Profile

### Business Information

- Official Page / Surface Name: Business Information
- Route / Component: `src/pages/ContractorProfile.jsx`
- Home Base: Business Profile
- Parent Surface: Business Profile
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Present and edit owned business identity information.
- Primary Question: What core information describes this business?
- Owns: Editable business information fields shown in Business Profile.
- Referenced By: Business Profile hero, Customer Preview, public business profile projections.
- What Belongs Here: About business, contact, phone, service area, business hours, license information, credentials where supported.
- What Does NOT Belong Here: Verification status duplication, readiness scoring, Work Center status, personal profile details.
- Mobile Behavior: Section inside Business Profile.
- Desktop Behavior: Section inside Business Profile; may use calmer grouping.
- Known Adaptive Rules: Every visible truth needs an owner or action path.
- Future Evolution: May become a structured editor while preserving shared business identity projections.
- Common Task Reference Name: Business Information section

### Business Verification

- Official Page / Surface Name: Business Verification
- Route / Component: `src/pages/ContractorProfile.jsx`; shared projection in `src/utils/businessVerification.js`
- Home Base: Business Profile
- Parent Surface: Business Profile
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Explain and manage business trust/verification details.
- Primary Question: What verification details support customer trust?
- Owns: Business verification detail presentation and action path.
- Referenced By: Business Profile hero, Customer Preview, Discover Services, public business surfaces.
- What Belongs Here: Verification details, review/start verification actions, public-safe trust status.
- What Does NOT Belong Here: Duplicate Business Information rows, fake verified state, external verification claims without existing logic.
- Mobile Behavior: Section inside Business Profile.
- Desktop Behavior: Section inside Business Profile.
- Known Adaptive Rules: Verification status may appear compactly in hero, but detail belongs here.
- Future Evolution: May connect to a richer verification process only when existing verification ownership supports it.
- Common Task Reference Name: Business Verification section

### Business Readiness

- Official Page / Surface Name: Business Readiness
- Route / Component: `src/pages/ContractorProfile.jsx`; helpers in `src/utils/dashboardMetrics.js`
- Home Base: Business Profile
- Parent Surface: Business Profile
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Show business readiness and operational availability.
- Primary Question: Is my business ready to receive customers?
- Owns: Business readiness presentation within Business Profile.
- Referenced By: Professional Business Dashboard, Meetro Companion, Business Profile hero/sections.
- What Belongs Here: Availability status/control, readiness metrics based on existing projections, calm readiness sentence.
- What Does NOT Belong Here: New readiness calculations, duplicate dashboard ownership, unrelated setup prompts.
- Mobile Behavior: Section near top of Business Profile.
- Desktop Behavior: Section near top of Business Profile.
- Known Adaptive Rules: Availability is one shared truth and may be updated from Dashboard or Business Profile.
- Future Evolution: May become a clearer readiness checklist without adding new truth owners.
- Common Task Reference Name: Business Readiness section

### Customer Preview

- Official Page / Surface Name: Customer Preview
- Route / Component: `src/pages/ContractorProfile.jsx`
- Home Base: Business Profile
- Parent Surface: Business Profile
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Show how customers see the business.
- Primary Question: What will customers understand about my business?
- Owns: Business Profile customer preview entry and customer-facing projection presentation.
- Referenced By: Business Profile, Discover Services, Meetro Companion.
- What Belongs Here: Preview customer view action, public profile summary, customer-facing trust/proof context.
- What Does NOT Belong Here: Business-only admin labels, settings language, workflow execution.
- Mobile Behavior: Prominent section after Business Readiness.
- Desktop Behavior: Prominent section near Business Readiness.
- Known Adaptive Rules: Routing behavior stays unchanged; language should use Preview Customer View.
- Future Evolution: May become an adaptive preview pane beside editable business information.
- Common Task Reference Name: Customer Preview section

## Work

### Project Details

- Official Page / Surface Name: Project Details
- Route / Component: `src/pages/ProjectDetails.jsx`
- Home Base: Homeowner work
- Parent Surface: Homeowner Home / My Requests
- Role: Homeowner
- Surface Type: Focus Page
- Purpose: Show one homeowner project or request with its current state and next step.
- Primary Question: What is happening with this project?
- Owns: Homeowner project detail presentation, request status context, and homeowner-facing next-step orientation.
- Referenced By: Homeowner Home, My Requests, Request Creation, Discover Services, Messages, Meetro Companion.
- What Belongs Here: Project/request summary, current stage, related professional/customer communication references, next homeowner action, service history context.
- What Does NOT Belong Here: Professional Work Center execution, invoice ownership, quote builder internals, business profile editing, or unrelated project lists.
- Mobile Behavior: Full focused project detail page.
- Desktop Behavior: Focused detail page; future adaptive work may show request detail beside conversation or history without changing routing.
- Known Adaptive Rules: Project Details represents current work context for the homeowner and should not become a professional dashboard.
- Future Evolution: Candidate for a desktop inspector/detail pane connected to My Requests and Messages.
- Common Task Reference Name: Project Details

### Emergency

- Official Page / Surface Name: Emergency
- Route / Component: `src/pages/Emergency.jsx`, `src/pages/EmergencyRequest.jsx`, `src/pages/EmergencyStatus.jsx`, `src/pages/EmergencyOperationsCenter.jsx`
- Home Base: Work
- Parent Surface: Homeowner Home / Work Center
- Role: Shared
- Surface Type: Focus Page
- Purpose: Guide urgent service request, response, and status handoff without becoming the communication or work owner.
- Primary Question: What urgent help is needed right now?
- Owns: Emergency flow presentation, urgent request/status handoff, and emergency-specific progress orientation.
- Referenced By: Homeowner Home, Work Center, Messages Emergency context, Professional Business Dashboard, Meetro Companion.
- What Belongs Here: Emergency request entry, urgent service status, dispatch/progress presentation, emergency conversation references, owning workspace handoffs.
- What Does NOT Belong Here: General chat ownership, non-emergency work, duplicate Work Center execution, automatic saved history ownership, or unrelated schedule/invoice creation.
- Mobile Behavior: Focused emergency flow/status experience.
- Desktop Behavior: Focused emergency surface with consistent desktop margins; emergency conversations still open through Messages ConversationThread.
- Known Adaptive Rules: Emergency rows in Messages are conversation rows with emergency styling only. Emergency work remains owned by the emergency/work systems.
- Future Evolution: May become a guided urgent-work workspace only if it preserves Messages and Work Center ownership boundaries.
- Common Task Reference Name: Emergency

### Current Jobs

- Official Page / Surface Name: Current Jobs
- Route / Component: `src/pages/ContractorDashboard.jsx`
- Home Base: Work Center
- Parent Surface: Work Center Landing
- Role: Professional
- Surface Type: Workspace
- Purpose: Show active jobs and next responsibilities.
- Primary Question: What job am I actively responsible for now?
- Owns: Active job list presentation and current job entry.
- Referenced By: Professional Business Dashboard, Schedule, Messages, Meetro Companion.
- What Belongs Here: Active job cards, current stage, next action, persistent context prototype where applicable.
- What Does NOT Belong Here: Completed history as primary attention, business setup, unrelated messages.
- Mobile Behavior: Current job focus.
- Desktop Behavior: Should eventually pair job list with active job context.
- Known Adaptive Rules: Current work is the anchor.
- Future Evolution: May become the primary focus pane inside a desktop Work Center workspace.
- Common Task Reference Name: Current Jobs

### Schedule

- Official Page / Surface Name: Schedule
- Route / Component: `src/pages/ContractorDashboard.jsx` and schedule-related components/utilities
- Home Base: Work Center
- Parent Surface: Work Center Landing
- Role: Professional
- Surface Type: Workspace
- Purpose: Manage visits and appointments connected to work and relationships.
- Primary Question: What is scheduled, and what needs to change?
- Owns: Visit schedule presentation and schedule update workflow.
- Referenced By: Messages schedule cards, Professional Business Dashboard, Current Jobs, Meetro Companion.
- What Belongs Here: Visit creation/update, schedule cards, appointment status, linked conversation/relationship handoff.
- What Does NOT Belong Here: Message-only delivery ownership, duplicate visits, unrelated calendar widgets.
- Mobile Behavior: Focused schedule view.
- Desktop Behavior: Planning attention panel candidate beside current jobs.
- Known Adaptive Rules: Schedule updates modify the existing visitId and preserve conversationId/relationshipId.
- Future Evolution: May become a planning pane in Work Center with linked job context.
- Common Task Reference Name: Schedule

### Evaluation Notes

- Official Page / Surface Name: Evaluation Notes
- Route / Component: Evaluation notes components used from Work Center/Current Work
- Home Base: Current Work
- Parent Surface: Current Jobs
- Role: Professional
- Surface Type: Focus Page
- Purpose: Capture evaluation details for a specific job.
- Primary Question: What did I observe, and what should happen next?
- Owns: Evaluation note capture for active work.
- Referenced By: Quote Builder, Work Center, Messages cards, Job History.
- What Belongs Here: Findings, notes, photos, recommendations, customer/job context.
- What Does NOT Belong Here: General business notes, conversation-only messages, unrelated job history.
- Mobile Behavior: Temporary/focused editor or page depending on current implementation.
- Desktop Behavior: Future inspector/editor candidate connected to active work.
- Known Adaptive Rules: Evaluation belongs to the work lifecycle.
- Future Evolution: May become a side-by-side editor with quote preparation.
- Common Task Reference Name: Evaluation Notes

### Quote Builder

- Official Page / Surface Name: Quote Builder
- Route / Component: quote builder components/pages
- Home Base: Work Center / Business Tools
- Parent Surface: Work Center Landing
- Role: Professional
- Surface Type: Focus Page
- Purpose: Prepare proposals/quotes for a specific customer or job.
- Primary Question: How do I prepare the best proposal?
- Owns: Quote/proposal preparation surface.
- Referenced By: Evaluation Notes, Messages quote cards, Professional Business Dashboard Quick Access, Business Tools.
- What Belongs Here: Line items, proposal details, quote status, send/update actions.
- What Does NOT Belong Here: Invoice payment finality, relationship directory, business profile setup.
- Mobile Behavior: Focused quote builder.
- Desktop Behavior: May become a workspace/editor with preview when adaptive work is scheduled.
- Known Adaptive Rules: Quote emerges from evaluation or work context.
- Future Evolution: May add preview and contextual source evidence on wider screens.
- Common Task Reference Name: Quote Builder

### Invoice Builder

- Official Page / Surface Name: Invoice Builder
- Route / Component: invoice builder components/pages
- Home Base: Work Center / Business Tools
- Parent Surface: Work Center Landing
- Role: Professional
- Surface Type: Focus Page
- Purpose: Prepare invoices for completed or billable work.
- Primary Question: How do I bill for this work accurately?
- Owns: Invoice preparation surface.
- Referenced By: Completion, Job History, Messages invoice cards, Business Tools.
- What Belongs Here: Invoice line items, payment details, invoice status, send/update actions.
- What Does NOT Belong Here: Quote-only draft decisions, message-only relationship notes, unrelated revenue summaries.
- Mobile Behavior: Focused invoice builder.
- Desktop Behavior: May become a workspace/editor with preview when adaptive work is scheduled.
- Known Adaptive Rules: Invoice belongs to work/payment ownership, not Messages.
- Future Evolution: May pair invoice editing with work completion evidence.
- Common Task Reference Name: Invoice Builder

### Completion

- Official Page / Surface Name: Completion
- Route / Component: completion flow components/pages
- Home Base: Current Work
- Parent Surface: Current Jobs
- Role: Professional
- Surface Type: Focus Page
- Purpose: Submit completion details for customer review.
- Primary Question: What did I complete for the customer?
- Owns: Professional completion submission surface.
- Referenced By: Closure Review, Job History, Messages completion cards, Work Center.
- What Belongs Here: Completion notes, completion photos, finished work summary.
- What Does NOT Belong Here: Closure finality without customer confirmation, unrelated job history.
- Mobile Behavior: Focused completion flow.
- Desktop Behavior: Future active work focus panel candidate.
- Known Adaptive Rules: Completion does not equal Closure.
- Future Evolution: May pair completion evidence with customer review status.
- Common Task Reference Name: Completion flow

### Closure Review

- Official Page / Surface Name: Closure Review
- Route / Component: closure/review takeover components/pages
- Home Base: Current Work / Homeowner request flow
- Parent Surface: Current Jobs
- Role: Shared
- Surface Type: Focus Page
- Purpose: Let the customer accept completion or raise concerns before closure.
- Primary Question: Is the completed work accepted or does it need resolution?
- Owns: Customer closure confirmation and concern entry.
- Referenced By: Completion, Homeowner Home, My Requests, Work Center.
- What Belongs Here: Customer satisfaction choice, concern flow, closure decision.
- What Does NOT Belong Here: Auto-closing without confirmation, professional-only completion editing.
- Mobile Behavior: Focused customer review/closure flow.
- Desktop Behavior: Focused closure flow.
- Known Adaptive Rules: User confirmation controls closure.
- Future Evolution: May become part of a lifecycle timeline while preserving customer authority.
- Common Task Reference Name: Closure Review

### Job History

- Official Page / Surface Name: Job History
- Route / Component: Work Center history components/pages
- Home Base: Work Center
- Parent Surface: Work Center Landing
- Role: Professional
- Surface Type: Reference Attention
- Purpose: Preserve completed work history.
- Primary Question: What happened before?
- Owns: Completed professional work history presentation.
- Referenced By: Relationship Inspector, Customer Timeline, Reports, Meetro Companion.
- What Belongs Here: Completed jobs, historical reports, completed service records, past documentation.
- What Does NOT Belong Here: Active current jobs, immediate operational CTAs as primary focus.
- Mobile Behavior: Historical reference view.
- Desktop Behavior: Reference panel/page candidate.
- Known Adaptive Rules: History should not compete with current work.
- Future Evolution: May become a reference pane connected to relationships and reports.
- Common Task Reference Name: Job History

## Relationships

### Messages Inbox

- Official Page / Surface Name: Messages Inbox
- Route / Component: `src/pages/MessagesInbox.jsx`
- Home Base: Messages Workspace
- Parent Surface: Messages Workspace
- Role: Shared
- Surface Type: Workspace
- Purpose: Choose which relationship/conversation to continue.
- Primary Question: Which conversation should I continue?
- Owns: Conversation list presentation and communication context selection.
- Referenced By: BottomNav, Desktop Sidebar, Professional Business Dashboard, Homeowner Home, Meetro Companion.
- What Belongs Here: Conversation rows, communication context tabs, search, contacts anchor, saved chat history entry.
- What Does NOT Belong Here: Non-conversation relationship placeholders in Conversations, ticket/work creation ownership, business setup.
- Mobile Behavior: Full inbox page.
- Desktop Behavior: Left panel of adaptive Messages workspace.
- Known Adaptive Rules: Only real threads belong in Conversations.
- Future Evolution: May support richer relationship grouping while preserving conversation-first behavior.
- Common Task Reference Name: Messages Inbox

### Conversation Thread

- Official Page / Surface Name: Conversation Thread
- Route / Component: `src/pages/ConversationThread.jsx`
- Home Base: Messages Workspace
- Parent Surface: Messages Workspace
- Role: Shared
- Surface Type: Workspace
- Purpose: Continue communication inside a relationship.
- Primary Question: What needs to be said or understood in this relationship?
- Owns: Thread communication, composer, message rendering, conversation-level reference card presentation.
- Referenced By: Messages Inbox, Saved Chat History, Relationship Inspector, Work Center, notifications.
- What Belongs Here: Message history, composer, communication cards/references, header identity, overflow menu, schedule/quote/reference cards.
- What Does NOT Belong Here: Creating non-message work ownership directly, relationship list rows, full Work Center.
- Mobile Behavior: Full conversation page; Back returns to Messages.
- Desktop Behavior: Center panel of adaptive Messages workspace.
- Known Adaptive Rules: Conversation remains communication-first.
- Future Evolution: May become the center pane for relationship/work context continuity.
- Common Task Reference Name: Conversation Thread

### Relationship Inspector

- Official Page / Surface Name: Relationship Inspector
- Route / Component: Relationship identity/context components used by Messages/ConversationThread
- Home Base: Communication Center / Relationship Identity
- Parent Surface: Communication Center
- Role: Shared
- Surface Type: Inspector
- Purpose: Show relationship context without replacing communication.
- Primary Question: What should I understand about this relationship while communicating?
- Owns: Relationship context presentation, relationship memory summary, and communication authority projection in the adaptive Messages workspace.
- Referenced By: Conversation Thread, Customer Timeline, Work Center context, Meetro Companion.
- What Belongs Here: Contact summary, current work summary, related request/job/project context, conversation intent, current owner, next decision, relationship memory placeholder.
- What Does NOT Belong Here: Editable Business Profile, full Work Center execution, fake history.
- Mobile Behavior: Relationship Identity opens as its own page, not inline.
- Desktop Behavior: Right panel context in adaptive Messages when width allows.
- Known Adaptive Rules: Relationship details support the conversation; they do not replace it.
- Future Evolution: May include persistent context, shared timeline, and relationship memory.
- Common Task Reference Name: Relationship Inspector

### Customer Timeline

- Official Page / Surface Name: Customer Timeline
- Route / Component: Relationship/customer timeline components where implemented
- Home Base: Relationship Identity
- Parent Surface: Messages Workspace
- Role: Shared
- Surface Type: Inspector
- Purpose: Show historical sequence for a customer or relationship.
- Primary Question: What has happened with this customer or relationship over time?
- Owns: Timeline presentation of relationship history.
- Referenced By: Relationship Inspector, Job History, Invoice History, Documents.
- What Belongs Here: Past jobs, invoices, documents, important relationship events.
- What Does NOT Belong Here: Active message composer, unrelated business metrics.
- Mobile Behavior: Section/page inside Relationship Identity when available.
- Desktop Behavior: Inspector/context area candidate.
- Known Adaptive Rules: Use available data only; do not invent history.
- Future Evolution: May become the history axis of the Relationship Layer.
- Common Task Reference Name: Customer Timeline

### Saved Chat History

- Official Page / Surface Name: Saved Chat History
- Route / Component: `src/pages/MessagesInbox.jsx` saved history subview
- Home Base: Messages Workspace
- Parent Surface: Messages Workspace
- Role: Shared
- Surface Type: Reference Attention
- Purpose: Show conversations the user manually saved to history.
- Primary Question: Which conversations did I intentionally save?
- Owns: User-saved chat history presentation.
- Referenced By: Messages Inbox, Conversation Thread overflow menu.
- What Belongs Here: Manually saved chat threads only.
- What Does NOT Belong Here: Automatically archived, completed, emergency, or system-saved conversations unless the user saved them.
- Mobile Behavior: Messages subview; rows open ConversationThread.
- Desktop Behavior: Messages history surface; should return to Messages context.
- Known Adaptive Rules: Saved Chat History means user-saved only.
- Future Evolution: May become a reference filter inside Messages adaptive workspace.
- Common Task Reference Name: Saved Chat History

## Business Management

### Business Portfolio

- Official Page / Surface Name: Business Portfolio
- Route / Component: `src/pages/Portfolio.jsx`
- Home Base: Business Tools / Business Profile
- Parent Surface: Meetro / Business
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Manage and showcase proof of work.
- Primary Question: What work proves this business is trustworthy?
- Owns: Portfolio project management and portfolio proof presentation.
- Referenced By: Business Profile, Customer Preview, Discover Services, public profile surfaces.
- What Belongs Here: Projects, photos, project details, spotlight/showcase state, portfolio proof.
- What Does NOT Belong Here: Business verification approval, Work Center execution, customer chat composer.
- Mobile Behavior: Portfolio workspace with temporary project editors.
- Desktop Behavior: Portfolio showcase/management page; future adaptive gallery candidate.
- Known Adaptive Rules: Portfolio is proof of work, not another oversized business-name card.
- Future Evolution: May become an adaptive gallery and proof workspace.
- Common Task Reference Name: Business Portfolio

### Business Availability

- Official Page / Surface Name: Business Availability
- Route / Component: Dashboard/Profile availability controls; shared truth key `meetroAvailableNow`
- Home Base: Business Dashboard / Business Profile
- Parent Surface: Meetro / Business
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Control whether the business is available for new customer requests.
- Primary Question: Can customers request this business right now?
- Owns: Availability write path to the shared availability truth.
- Referenced By: Professional Business Dashboard, Business Readiness, Meetro Companion.
- What Belongs Here: Available Now status and shared availability toggle/editor.
- What Does NOT Belong Here: Duplicate local availability state, new storage keys, unrelated readiness metrics.
- Mobile Behavior: Dashboard quick toggle and Business Readiness action.
- Desktop Behavior: Same shared truth surfaced in appropriate business contexts.
- Known Adaptive Rules: One truth, many perspectives.
- Future Evolution: May gain clearer status explanation without adding ownership.
- Common Task Reference Name: Business Availability

### Service Areas

- Official Page / Surface Name: Service Areas
- Route / Component: Business Profile/Professional setup service area surfaces
- Home Base: Business Profile / Business Tools
- Parent Surface: Business Profile
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Define where the business serves customers.
- Primary Question: Where does this business serve customers?
- Owns: Business service area editing path where implemented.
- Referenced By: Business Profile hero, Customer Preview, Discover Services, lead matching, Meetro Companion.
- What Belongs Here: Service area display/editing and projection into public/business surfaces.
- What Does NOT Belong Here: Personal home address as business truth unless explicitly used, marketplace matching hacks.
- Mobile Behavior: Business setup/profile ownership path.
- Desktop Behavior: Business management page/section.
- Known Adaptive Rules: Service area must use shared business identity/projection helpers.
- Future Evolution: May become more structured while preserving projection ownership.
- Common Task Reference Name: Service Areas

### Price Book

- Official Page / Surface Name: Price Book
- Route / Component: Business Tools pricing/price book route when implemented
- Home Base: Business Tools Hub
- Parent Surface: Business Tools Hub
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Manage business pricing references.
- Primary Question: What pricing should my business use as a reference?
- Owns: Reusable pricing references where implemented.
- Referenced By: Quote Builder, Invoice Builder, Business Tools Hub.
- What Belongs Here: Price book, pricing configuration, reusable service pricing where supported.
- What Does NOT Belong Here: Quote-specific customer negotiation or invoice finality.
- Mobile Behavior: Business Tools destination.
- Desktop Behavior: Business management workspace candidate.
- Known Adaptive Rules: Pricing supports quotes but does not replace Quote Builder.
- Future Evolution: May become a structured pricing source for quote preparation.
- Common Task Reference Name: Price Book

### Hiring Center

- Official Page / Surface Name: Hiring Center
- Route / Component: Business Tools hiring center components
- Home Base: Business Tools Hub
- Parent Surface: Business Tools Hub
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Create positions, manage applicants, and coordinate hiring.
- Primary Question: Who do I need to hire or follow up with?
- Owns: Hiring setup, position creation, applicant management.
- Referenced By: Messages Hiring conversations, Professional Business Dashboard Quick Access, Business Tools Hub.
- What Belongs Here: Position creation, publishing, applicant management, hiring setup.
- What Does NOT Belong Here: Messages Hiring tab position creation forms.
- Mobile Behavior: Business Tools destination.
- Desktop Behavior: Business management workspace candidate.
- Known Adaptive Rules: Messages Hiring is for applicant communication only.
- Future Evolution: May split hiring setup from applicant communication more clearly.
- Common Task Reference Name: Hiring Center

### Business Reports

- Official Page / Surface Name: Business Reports
- Route / Component: Business Tools reports components/registry
- Home Base: Business Tools Hub
- Parent Surface: Business Tools Hub
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Review generated business/job reports.
- Primary Question: What records or summaries do I need to review?
- Owns: Business reports registry and report destination presentation.
- Referenced By: Job History, Business Tools Hub, Meetro Companion.
- What Belongs Here: Job reports, future compliance/asset/business summaries, report registry.
- What Does NOT Belong Here: Live Work Center execution, message threads.
- Mobile Behavior: Business Tools report destination.
- Desktop Behavior: Reference workspace candidate.
- Known Adaptive Rules: Reports are reference attention, not immediate attention.
- Future Evolution: May become a broader reporting and evidence workspace.
- Common Task Reference Name: Business Reports

### Contracts

- Official Page / Surface Name: Contracts
- Route / Component: Business Tools contracts route when implemented
- Home Base: Business Tools Hub
- Parent Surface: Business Tools Hub
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Manage business contract artifacts where supported.
- Primary Question: What agreement governs this work?
- Owns: Contract record/tool surface where implemented.
- Referenced By: Business Tools Hub, Work Center, Quote Builder where applicable.
- What Belongs Here: Contract templates, contract records, customer/job contract references.
- What Does NOT Belong Here: Invoices, quotes, message composer.
- Mobile Behavior: Business Tools destination.
- Desktop Behavior: Business management workspace candidate.
- Known Adaptive Rules: Contracts should connect to work/relationships without owning them.
- Future Evolution: May connect contracts to quotes, invoices, and job records.
- Common Task Reference Name: Contracts

### Invoices

- Official Page / Surface Name: Invoices
- Route / Component: Business Tools invoices and invoice builder components
- Home Base: Business Tools / Work Center
- Parent Surface: Business Tools Hub
- Role: Professional
- Surface Type: Business Management Page
- Purpose: Manage invoices and payment-related records.
- Primary Question: What invoices need attention?
- Owns: Invoice list/management presentation where implemented.
- Referenced By: Invoice Builder, Work Center, Relationship Inspector, Messages invoice cards.
- What Belongs Here: Invoice list, invoice builder entry, invoice status, payment references.
- What Does NOT Belong Here: Quote-only drafts, Messages-owned invoice creation, unrelated revenue widgets.
- Mobile Behavior: Business Tools/Work Center destination.
- Desktop Behavior: Business management workspace candidate.
- Known Adaptive Rules: Invoices belong to invoice/payment ownership, not Messages.
- Future Evolution: May become a payment and invoice management workspace.
- Common Task Reference Name: Invoices

### Membership

- Official Page / Surface Name: Membership
- Route / Component: Membership/subscription page or Business Tools membership card
- Home Base: Profile / Business Tools
- Parent Surface: Business Tools Hub
- Role: Shared
- Surface Type: Business Management Page
- Purpose: Manage membership, subscription, or plan status where available.
- Primary Question: What membership or plan status applies to this account or business?
- Owns: Membership/plan status presentation where implemented.
- Referenced By: Personal Profile, Business Tools Hub, Desktop Hosted Profile Card.
- What Belongs Here: Plan status, membership actions, billing entry points.
- What Does NOT Belong Here: Irrelevant subscription upsells, feature clutter unrelated to the current business DNA.
- Mobile Behavior: Full page/destination from Profile or Business Tools.
- Desktop Behavior: Destination from Profile context card or Business Tools.
- Known Adaptive Rules: Subscription availability should follow Business DNA and eligibility.
- Future Evolution: May become scoped by personal/business account context.
- Common Task Reference Name: Membership

## Companion

### Ask Meetro Resting Pill

- Official Page / Surface Name: Ask Meetro Resting Pill
- Route / Component: `src/components/MeetroAssistant.jsx`
- Home Base: Global companion
- Parent Surface: Meetro / Companion
- Role: Shared
- Surface Type: Context Card
- Purpose: Keep the Meetro Companion visibly available without interrupting work.
- Primary Question: How can Meetro remain available without interrupting?
- Owns: Companion resting presence and launcher behavior.
- Referenced By: Every app workspace where the companion is eligible.
- What Belongs Here: Ask Meetro label, companion mark, presence dot, movable resting state, wake card entry.
- What Does NOT Belong Here: Full assistant panel content, route navigation, generic AI branding.
- Mobile Behavior: Floating safe-area-aware companion entry that avoids BottomNav and primary controls.
- Desktop Behavior: Visible floating pill above workspace; movable where supported.
- Known Adaptive Rules: Always present, never intrusive.
- Future Evolution: May gain better context-sensitive resting signals without adding new AI ownership.
- Common Task Reference Name: Ask Meetro Resting Pill

### Meetro Workspace Companion

- Official Page / Surface Name: Meetro Workspace Companion
- Route / Component: `src/components/MeetroAssistant.jsx`
- Home Base: Global companion
- Parent Surface: Meetro / Companion
- Role: Shared
- Surface Type: Context Card
- Purpose: Provide one contextual observation, one recommendation, and one primary action inside the current workspace.
- Primary Question: How can Meetro help the user continue their current work without becoming the work?
- Owns: Workspace guidance presentation, context awareness, recommendation display, and entry into full conversation.
- Referenced By: Ask Meetro Resting Pill, Meetro Companion Conversation, workspace suggestions.
- What Belongs Here: Meetro Companion header, close button, contextual greeting, one observation, one recommendation, one primary action, optional Ask Meetro entry.
- What Does NOT Belong Here: Duplicate AI business logic, a separate chat app, chat history, typed input, voice input, workspace resizing, route changes.
- Mobile Behavior: Existing assistant overlay/panel workflow.
- Desktop Behavior: Floating panel that does not dim, blur, push, or resize the workspace.
- Known Adaptive Rules: Reuse existing assistant state and routing behavior. Guidance complements the workspace; it does not duplicate it.
- Future Evolution: May become the standard companion surface for workspace guidance and preparation.
- Common Task Reference Name: Meetro Workspace Companion

### Meetro Companion Conversation

- Official Page / Surface Name: Meetro Companion Conversation
- Route / Component: `src/components/MeetroAssistant.jsx`
- Home Base: Global companion
- Parent Surface: Meetro / Companion
- Role: Shared
- Surface Type: Companion State
- Purpose: Support explicit user conversation with Meetro after the user chooses Ask Meetro, voice, typing, planning, or a companion reasoning task.
- Primary Question: What does the user want Meetro to help think through now?
- Owns: AI conversation presentation, typed entry, voice entry, listening/thinking/responding states, and response actions.
- Referenced By: Meetro Workspace Companion, Ask Meetro Resting Pill, Companion Listening State, Companion Thinking State, Companion Responding State.
- What Belongs Here: Voice input, typed input, response history, explicit planning/help/reasoning, listening state, thinking state, responding state.
- What Does NOT Belong Here: Automatic opening, workspace duplication, route ownership, workflow ownership, dashboard summaries.
- Mobile Behavior: Existing assistant conversation workflow.
- Desktop Behavior: Floating conversation panel that does not dim, blur, push, or resize the workspace.
- Known Adaptive Rules: Full conversation opens only after explicit user intent.
- Future Evolution: May add richer grounded reasoning while preserving workspace ownership.
- Common Task Reference Name: Meetro Companion Conversation

### Companion Listening State

- Official Page / Surface Name: Companion Listening State
- Route / Component: `src/components/MeetroAssistant.jsx`
- Home Base: Companion
- Parent Surface: Meetro Companion Conversation
- Role: Shared
- Surface Type: Companion State
- Purpose: Show that Meetro is actively listening for voice input.
- Primary Question: Is Meetro listening now?
- Owns: Listening state presentation.
- Referenced By: Meetro Companion Conversation.
- What Belongs Here: Listening status, active voice affordance, tap-to-stop/cancel behavior where supported.
- What Does NOT Belong Here: Final answer, unrelated suggestions, workspace takeover.
- Mobile Behavior: Safe-area-aware assistant state.
- Desktop Behavior: State inside floating companion panel.
- Known Adaptive Rules: State should feel responsive without blocking the workspace.
- Future Evolution: May improve voice feedback while preserving current assistant logic.
- Common Task Reference Name: Companion Listening State

### Companion Thinking State

- Official Page / Surface Name: Companion Thinking State
- Route / Component: `src/components/MeetroAssistant.jsx`
- Home Base: Companion
- Parent Surface: Meetro Companion Conversation
- Role: Shared
- Surface Type: Companion State
- Purpose: Show that Meetro is preparing a response.
- Primary Question: Is Meetro preparing a response?
- Owns: Thinking state presentation.
- Referenced By: Meetro Companion Conversation.
- What Belongs Here: Thinking status and ambient feedback.
- What Does NOT Belong Here: Fake answer content, route navigation, blocking unrelated workspace actions.
- Mobile Behavior: Assistant state inside existing panel.
- Desktop Behavior: State inside floating companion panel.
- Known Adaptive Rules: Thinking should be calm and temporary.
- Future Evolution: May become more expressive without changing capability ownership.
- Common Task Reference Name: Companion Thinking State

### Companion Responding State

- Official Page / Surface Name: Companion Responding State
- Route / Component: `src/components/MeetroAssistant.jsx`
- Home Base: Companion
- Parent Surface: Meetro Companion Conversation
- Role: Shared
- Surface Type: Companion State
- Purpose: Show Meetro's response and available follow-up actions.
- Primary Question: What did Meetro prepare or recommend?
- Owns: Companion response presentation and follow-up action display.
- Referenced By: Meetro Companion Conversation.
- What Belongs Here: Response, response read-aloud control where supported, action buttons tied to existing routes.
- What Does NOT Belong Here: New workflow ownership, duplicate assistant system, hidden route changes.
- Mobile Behavior: Assistant response state inside existing panel.
- Desktop Behavior: Response state inside floating companion panel.
- Known Adaptive Rules: Companion may guide and prepare, but does not own decisions.
- Future Evolution: May add richer grounded responses while preserving user decision authority.
- Common Task Reference Name: Companion Responding State

## Permanent Codex Task Template

Every future Codex task must begin with:

Target Surface:

Official Page / Surface Name:

Route / Component:

Home Base:

Parent Surface:

Role:

Surface Type:

Purpose:

Primary Question:

Owns:

Referenced By:

Mobile Behavior:

Desktop Behavior:

Do Not Change:

Success Definition:

No future task should use vague names like:

- Fix profile
- Clean dashboard
- Update business page
- Improve messages
- Change drawer

Correct examples:

- Refine Desktop Hosted Profile Card
- Refine Business Profile / Business Readiness section
- Refine Professional Business Dashboard desktop command center
- Refine Messages Inbox adaptive workspace
- Refine Meetro Companion Expanded Panel

## Naming Guardrails

Exact surface names protect exact ownership.

Wrong:

“Fix profile.”

Correct:

“Fix Desktop Hosted Profile Card.”

Wrong:

“Clean business page.”

Correct:

“Refine Business Profile / Business Readiness section.”

Wrong:

“Fix dashboard.”

Correct:

“Refine Professional Business Dashboard desktop command center.”

## Closing Principle

Exact names protect exact ownership.

When the surface is named clearly, the correction can stay small, true, and grounded.

Keep intact what works.

Adapt presentation.

Never redesign Meetro.

🏮

The Lantern stays lit.
