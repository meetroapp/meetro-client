# Companion Presence System

## Purpose

The Companion Presence System defines how Ask Meetro should remain available inside every workspace without competing for attention.

This is not a new assistant capability.

It is the presentation standard for the existing Meetro Companion.

## Principle

Ask Meetro is not just a button.

It is the Meetro Companion.

The Companion should feel present, calm, helpful, movable, always available, and never in the way.

## Resting State

The resting state should be visible enough to be trusted without feeling like a callout.

It may appear as a small floating pill with:

- Ask Meetro label
- Meetro companion mark
- subtle presence dot
- soft breathing glow
- safe-area-aware placement

## Launcher-Anchored Panel

The launcher is the anchor.

When the Companion opens, the panel should appear from the launcher position on
desktop and mobile.

Moving Ask Meetro moves the Companion's opening point.

The launcher and panel should feel like one adaptive component, not two separate
surfaces.

The panel should remain clamped inside the viewport and respect safe areas.

## Workspace Guidance State

The workspace guidance state should open as a floating companion panel.

It should not resize the workspace.

It should not push content.

It should not blur or dim the workspace on desktop.

The guidance panel should contain:

- Meetro Companion header
- close control
- context-aware greeting
- one observation
- one recommendation
- one primary action
- optional Ask Meetro entry

This state is not the full assistant conversation. It extends the current
workspace without duplicating it.

## Companion Context Model

The Companion may use a lightweight, read-only context projection to understand
where the user is inside Meetro.

The model may include:

- active route
- active Home Base
- active parent surface
- active surface type
- active relationship, when available
- active project, when available
- active request, when available
- active conversation, when available
- current status, when available
- next action, when available
- current owner, when available
- related work references, when available

This model exists so the Companion can guide the current workspace. It does not
move ownership into the Companion.

## Read-Only Context Rule

Companion context is a projection.

It may read available workspace facts.

It may not write workflow state.

It may not create messages, quotes, invoices, visits, tickets, emergency work,
portfolio proof, business identity, or relationship records.

The owning surface remains responsible for the work. The Companion can observe,
summarize, prepare, and guide.

## Surface-Aware Guidance

The Companion should adjust guidance to the active surface without becoming the
surface.

Dashboard guidance should help the user see what deserves attention.

Communication Center guidance should understand the relationship, conversation
intent, current owner, next decision, and related work references when those
facts exist.

Work Center guidance should understand job status, schedule status, evaluation,
proposal, payment, completion, and closure when those facts exist. Work Center
owns execution.

Business guidance should understand readiness, profile completeness, portfolio
proof, service area, availability, public presence, and customer trust when
those facts exist. Business surfaces own identity and readiness.

Request Creation and Discover guidance should preserve the Law of
Interpretation: customers describe problems, and Meetro interprets them.

Profile guidance should help the user find account or business settings without
turning Profile into the Companion.

## Home Base Awareness

Every Companion context should know the Home Base it is supporting.

Examples:

- Messages supports Communication Center.
- Work Center supports Current Work.
- Business Profile supports business identity and readiness.
- Request Creation supports the beginning of Current Work.
- Discover supports finding the right professional.

Home Base awareness helps the Companion speak from the correct point of view.
It does not give the Companion ownership of that Home Base.

## Ownership Boundaries

The Companion has three states:

Presence -> Workspace Guidance -> Conversation

Presence is quiet availability.

Workspace Guidance is surface-aware help.

Conversation is full user-directed assistance.

The Companion must never collapse these states into one always-on chatbot.
It supports the workspace, but the workspace remains the source of action.

## Full Conversation State

Full conversation opens only after explicit user intent, such as Ask Meetro,
voice, typing, planning, reasoning, summarizing a conversation, preparing a
quote, or reviewing a job.

Full conversation may contain:

- voice entry
- typed entry
- response history
- listening, thinking, and responding states
- suggested actions based on the current request

## Mobile

Mobile keeps the existing assistant workflow.

The resting state must remain clear and safe-area friendly.

It must not cover BottomNav or primary actions.

## Desktop

Desktop uses a visible resting pill and a floating expanded panel.

The panel belongs above the workspace, not inside the layout.

The workspace remains visible and unchanged while the Companion is open.

## Wonder Pass Visual Identity

The Companion should feel like part of Meetro Community, not a separate AI
product.

Its visual language should feel like:

- a lantern beside the workspace
- a notebook opened to the current page
- a trusted guide who already knows where the member left off

Prefer:

- warm paper surfaces
- forest and deep forest emphasis
- sage support surfaces
- coffee-toned labels and warm borders
- soft shadows and quiet lighting

Avoid:

- neon effects
- sci-fi gradients
- chatbot-demo styling
- loud glowing assistant treatments

The Companion should feel calm, contextual, and human.

## Law of Companion Presence

The assistant should not feel like a hidden feature or a separate chat app.

It should feel like a companion inside the workspace.

Always present.

Never intrusive.

Context-aware.

Ready when needed.

## Law of Complement

The Companion complements the workspace.

It never duplicates it.

Dashboard should not show Today's Focus and then make the Companion repeat
Today's Focus. Messages should not show a conversation and then make the
Companion repeat the conversation.

The Companion adds intelligence, context, and the next useful prompt. It should
never become another copy of the workspace.

## Presence And Identity

The Companion should answer one question:

How can I help without making you start over?

It stays close to the member's journey through Home, Community, Communication
Center, Work Center, Meetro Moments, and Profile.

It should feel like a continuing presence inside Meetro Community, not another
application the member has to enter.

## Guardrails

- Do not duplicate assistant business logic.
- Do not create a second AI system.
- Reuse the existing assistant state and routing behavior.
- Keep Workspace Guidance separate from Full Conversation.
- Keep Companion context read-only.
- Keep workflow ownership with Dashboard, Communication Center, Work Center, Business, Request Creation, Discover, and Profile.
- Keep Companion behavior scoped to presentation unless a later task explicitly changes capability.

🏮

The Lantern stays lit.
