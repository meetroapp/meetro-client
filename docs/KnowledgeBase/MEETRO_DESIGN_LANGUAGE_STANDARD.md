# Meetro Design Language Standard

Date: July 4, 2026

Status: Official Meetro visual reference

## Purpose

The Meetro Design Language Standard defines how Meetro should look and feel across mobile, desktop, and future platforms.

This is not a redesign.

This is not a new design system.

This document records the visual language already emerging across Meetro so future work can extend it consistently.

Architecture defines how Meetro works.

The Design Language defines how Meetro feels while it works.

If any visual preference conflicts with the Meetro Constitution, the Constitution wins.

## 1. Design Philosophy

Meetro should feel calm, trustworthy, and immediately understandable.

The visual language follows these principles:

- Calm over busy.
- Guidance over decoration.
- Purpose over novelty.
- Context over density.
- Trust over excitement.
- Relationships before transactions.
- Desktop reveals context.
- Mobile leads.
- The interface should disappear behind the work.

Meetro should never look like generic enterprise software, a novelty app, or a feature catalog.

Every surface should make the user feel oriented:

- I know where I am.
- I know what this surface owns.
- I know what deserves attention.
- I know what happens if I tap.

## 2. Typography

Typography should create calm hierarchy before decoration is needed.

### Page Titles

Page titles identify the current surface.

They should be short, confident, and direct.

Examples:

- Messages
- Business Dashboard
- Work Center
- Business Profile
- Portfolio

Page titles should not explain the feature. Supporting copy can clarify purpose.

### Section Titles

Section titles name groups of related information.

They should be smaller than page titles and should avoid software/admin language.

Examples:

- Today's Schedule
- Current Work
- Customer Trust
- Business Readiness
- Services Offered

### Card Titles

Card titles identify the object or action inside the card.

They should be scannable and specific.

Examples:

- Sarah Johnson
- Kitchen Renovation
- Review Schedule
- Meetro Chat

### Body Text

Body text should be short and useful.

Avoid long explanations inside core workflows.

Use one or two lines where possible.

### Supporting Text

Supporting text should reduce uncertainty.

It should answer:

- What is this?
- Why is it here?
- What happens next?

### Status Text

Status text should be grounded in real state.

Examples:

- Currently Available
- Waiting for approval
- In progress
- Saved to Contacts

Never use status text as decoration.

### Labels

Labels should name user-facing meaning, not implementation details.

Preferred:

- Service Area
- Business Hours
- Invite Status
- Meetro Account

Avoid:

- Config
- Object State
- Admin
- Record

### Buttons

Button text should describe the action.

Preferred:

- Save
- Cancel
- Add Project
- Publish Project
- Preview Customer View
- Meetro Chat

Avoid vague or architecture-facing buttons.

### Captions

Captions may explain secondary facts, timing, or source.

Keep captions quiet and readable.

### Error Messages

Error messages should be specific without exposing internals.

They should explain what happened and what the user can do next.

### Empty States

Empty states use calm, useful language.

They should never make the user feel they did something wrong.

## 3. Color Semantics

Color communicates meaning.

It should never exist only to decorate.

| Semantic Role | Meaning | Use |
| --- | --- | --- |
| Primary | Main Meetro action or selected state | Primary CTAs, selected tabs, important active states |
| Secondary | Supportive action | Alternate actions, secondary buttons, supporting links |
| Success | Completed, connected, available, accepted | Availability, linked account, saved state |
| Warning | Needs attention, waiting, pending | Pending confirmation, incomplete readiness |
| Error | Blocked, destructive, urgent failure | Delete, clear, denied, failed action |
| Information | Helpful context | Tips, neutral notices, detail chips |
| Companion | Meetro Companion presence | Ask Meetro pill, Companion panel accents |
| Emergency | Urgent service context | Emergency rows, emergency chips, urgent notices |
| Disabled | Not currently available | Disabled controls, unavailable states |
| Muted | Secondary context | Captions, timestamps, quiet metadata |

Status colors must remain consistent across the product.

Emergency color should communicate urgency without overwhelming the screen.

Companion color should feel present and helpful without competing with the current workspace.

## 4. Card Language

Cards are used for objects, repeated items, temporary surfaces, and framed tools.

They are not used to turn every section into a floating box.

### Shape

Cards should use the established Meetro rounded surface language.

Corners should feel soft and modern without becoming playful or inflated.

### Padding

Cards should have enough interior padding for touch, scanning, and translated text.

Dense information may use tighter spacing, but should never feel cramped.

### Grouping

Group related facts inside one card only when they belong to the same object.

Do not put cards inside cards unless the inner item is a genuine repeated object or temporary tool.

### Elevation

Elevation should be subtle.

Use light shadows and soft borders to create depth.

Avoid heavy outlines, harsh boxes, or stacked panel effects.

### Visual Weight

The most important card should guide attention without dominating the page.

On desktop, extra width should improve composition, not enlarge cards indefinitely.

### Header Spacing

Card headers should keep title, status, and actions close enough to scan as one unit.

### Action Placement

Primary card actions should be predictable:

- Top-right for small contextual actions.
- Bottom or trailing edge for card-level CTAs.
- Inside temporary editors for Save/Cancel.

### Section Spacing

Sections should feel connected to their parent workspace.

Do not create large gaps just to make a section feel important.

### Card Family

Cards across Dashboard, Messages, Work Center, Business Profile, Portfolio, and Companion should feel related.

They may vary by purpose, but they should not look like different products.

## 5. Button Language

Buttons express priority.

Every visible button must complete the promise it makes.

### Primary Buttons

Primary buttons represent the main next action.

Use one primary action per local decision area whenever possible.

### Secondary Buttons

Secondary buttons support alternate paths.

They should be visible but quieter than primary actions.

### Destructive Buttons

Destructive buttons must be visually distinct and clearly labeled.

They should not sit beside primary progression unless the decision requires it.

### Quiet Buttons

Quiet buttons are used for low-risk navigation, review, or secondary actions.

They should not compete with primary workflow actions.

### Icon-Only Buttons

Use icon-only buttons for familiar utilities:

- Back
- Close
- Search
- More
- Compose
- Call
- Message

Provide accessible labels.

### Floating Actions

Floating actions should be rare, stable, and safe-area aware.

They should never cover BottomNav, input fields, primary actions, or active content.

### Companion Actions

Companion actions should feel supportive.

They should invite help without taking over the current surface.

### Button States

Buttons should have clear default, hover, focus, pressed, disabled, and loading states where applicable.

Disabled buttons should explain themselves through context.

## 6. Icons

Icons communicate.

They do not decorate.

### Sizing

Icons should scale with their surface:

- Small icons for metadata and chips.
- Medium icons for row actions.
- Larger icons only for primary empty states or hero-level identity.

### Stroke and Style

Use the existing icon family and stroke weight consistently.

Avoid mixing filled, outlined, and custom icon styles unless the semantic state requires it.

### Functional vs Decorative

Functional icons need accessible names.

Decorative icons should not distract from the work.

### Status Icons

Status icons should reinforce meaning already present in text.

Never rely on color or icon alone.

### Identity Icons

Business, relationship, work, and Companion icons should be recognizable and consistent.

They should help users understand the surface's Home Base.

## 7. Empty States

Empty states should reduce uncertainty.

Every empty state should:

1. Explain where the user is.
2. Explain why nothing is present.
3. Offer the next meaningful action when one exists.

Examples:

- No hiring conversations yet.
- Applicants will appear here after they contact you or you start a conversation from Hiring Center.
- Your first customer reviews will appear after completed jobs.
- Context will appear here as this relationship develops.

Avoid:

- Nothing here.
- No data.
- Empty.
- Setup required.

## 8. Status Language

Status should describe real state, ownership, and next responsibility.

Use badges and chips for:

- Current state
- Progress
- Readiness
- Relationship status
- Business availability
- Completion
- Warning or blocker state

Status labels should be short.

Status descriptions may add context when the status affects user decisions.

Do not create new status language for the same truth in different surfaces.

Examples:

- Available Now is one shared business availability truth.
- Saved Chat History means user-saved only.
- Completion does not equal Closure.
- Emergency rows are conversation rows with emergency metadata.

## 9. Motion

Motion should be subtle, purposeful, fast, and predictable.

Motion may:

- Clarify entry or exit.
- Confirm a successful action.
- Show listening, thinking, or responding state.
- Help a temporary surface feel attached to the viewport.

Motion should not:

- Delay work.
- Distract from reading.
- Make the interface feel playful at the expense of trust.
- Hide state changes.

### Transitions

Use short transitions for hover, focus, expansion, and dismissal.

### Hosted Surfaces

Hosted experiences should appear and dismiss smoothly without pushing the workspace.

### Companion

Companion presence may breathe softly.

Listening, thinking, and responding should feel alive but calm.

### Loading

Loading motion should make waiting understandable.

Never use motion to mask missing state.

## 10. Loading States

Loading states should make the product feel reliable.

Use:

- Skeletons for content that has a known shape.
- Small indicators for short operations.
- Inline progress for focused tasks.
- Calm messages when the wait affects the user's next step.

Avoid indefinite loading when local context already exists.

If content is empty, show the empty state.

If content failed, show a useful error state.

If background loading is happening, keep available actions usable when safe.

## 11. Hosted Experiences

Hosted experiences are temporary desktop surfaces that preserve the current workspace.

Examples:

- Hosted Profile
- Hosted Relationship
- Hosted Business
- Hosted Project
- Hosted Schedule
- Hosted Proposal

Hosted surfaces should:

- Feel temporary.
- Respect the workspace.
- Remain visually connected.
- Never resemble separate applications.
- Never push the layout.
- Never blur the workspace by default.
- Never become a second route unless the user chooses a destination.

Mobile should continue to use the canonical full-page flow.

Desktop hosting is an enhancement, not a replacement.

## 12. Companion

The Companion is a presence, not a destination.

Visual states:

1. Presence
2. Workspace Guidance
3. Conversation

### Presence

The resting pill should be visible enough to be trusted and quiet enough to stay out of the way.

### Workspace Guidance

Guidance should contain:

- Header
- Context-aware greeting
- One observation
- One recommendation
- One primary action
- Optional Ask Meetro entry

It should never duplicate the page.

### Conversation

Conversation opens only after explicit user intent.

It may include voice, typed input, response history, and listening/thinking/responding states.

### Relationship to Workspace

The Companion floats above the workspace.

It does not resize, push, dim, or own the workspace.

It may guide, prepare, summarize, and support.

It does not execute workflow ownership.

## 13. Desktop Design

Desktop should reveal context, not complexity.

Desktop uses the Adaptive Layout Standard for:

- Maximum workspace width
- Sidebar relationship
- Context panels
- Hosted inspectors
- Card rhythm
- Spacing
- Companion placement

Desktop should:

- Use additional width to improve composition.
- Preserve workflow ownership.
- Keep the Sidebar as navigation anchor.
- Show related context only when it reduces effort.
- Avoid making every page a dashboard.

Desktop should not:

- Stretch phone layouts indefinitely.
- Create desktop-only workflows.
- Duplicate mobile experiences.
- Turn support surfaces into workspaces.

## 14. Mobile Design

Phone remains the primary experience.

Mobile should preserve:

- BottomNav behavior.
- Safe-area handling.
- One focused page at a time.
- Clear Back behavior.
- Large touch targets.
- Keyboard-safe forms.
- Minimal interruption.
- One-handed reach where possible.

Mobile screens should answer the current task clearly before offering secondary context.

Desktop may reveal more context.

Mobile should preserve focus.

## 15. Accessibility

Accessibility is part of visual quality.

Standards:

- Text must remain readable against its surface.
- Meaning must not depend on color alone.
- Touch targets should be comfortable.
- Keyboard focus must be visible.
- Icon buttons require accessible labels.
- Status, warning, and error states need text.
- Long labels, names, emails, addresses, and translations must wrap or truncate safely.
- Layouts must support Dynamic Type and translated text where practical.
- Motion should respect reduced-motion preferences where implemented.

VoiceOver readiness should be considered part of completion, not polish.

## 16. Founder Principles

Every future visual decision should follow these principles:

- Every element earns its place.
- Every screen reduces uncertainty.
- Every action builds trust.
- Every interaction strengthens relationships.
- Every temporary surface preserves context.
- Every desktop enhancement protects mobile.
- Every visual choice supports the work.

The interface should never compete with the work.

The Design Language should make Meetro immediately recognizable.

Not because it is flashy.

Because it is calm.

Consistent.

Intentional.

Trustworthy.

## Implementation Rule

Future implementation should use this document as a standard, not as permission to redesign.

Only normalize obvious inconsistencies when a task specifically targets a surface.

Do not introduce new visual trends.

Do not replace Meetro's existing identity.

Do not change workflow ownership to satisfy visual preference.

## Relationship to Other Standards

This document works with:

- Meetro Surface Registry for ownership and naming.
- Adaptive Layout Standard for desktop and responsive layout behavior.
- Companion Presence System for Companion presentation.
- Final Surface Audit for constitutional validation.

When documents conflict, use this order:

1. Meetro Constitution
2. Surface ownership and architecture documents
3. Adaptive Layout Standard
4. Companion Presence System
5. Meetro Design Language Standard

The Design Language expresses the architecture visually.

It does not override the architecture.

## Closing Principle

Meetro should feel like one product everywhere.

Mobile leads.

Desktop reveals context.

The Companion supports.

The work remains central.

The visual language protects calm, trust, and continuity.

