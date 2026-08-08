# MC-PLATFORM-UX-001 — Guided Workspace Card System

## Purpose

Guided Workspace Cards are Meetro's reference pattern for complex workflows that benefit from one meaningful decision at a time. Cards organize presentation only. They do not create persistence authority, backend authority, lifecycle authority, or a second draft model.

The first reference implementation is ordinary Job Request creation.

## When To Use

Use this pattern when a workflow has several related decisions, reviewable intermediate details, and one final action. Good candidates include request intake, professional response preparation, evaluation findings, quote preparation, invoice preparation, onboarding, business profile setup, Work Center milestone interactions, and future property, insurance, warranty, commercial, or property-management flows.

## When Not To Use

Do not force simple screens into cards. A single setting, a compact profile field, a direct confirmation, or a read-only status page should remain simpler.

## States

Each card has one of three presentation states:

- Active: expanded, emphasized, and editable.
- Complete: collapsed into a compact human-readable summary with Edit.
- Upcoming: collapsed and visually quiet, but still visible.

State is interface state. It must not become backend truth.

## Progress Rules

Progress is expressed as workflow state, not an arbitrary percentage. Labels should name the current workflow steps, such as Work, Location, Photos, Timing, and Review. Progress derives from existing draft/readiness truth and optional section presence; it must not create a new canonical lifecycle.

## Summary And Edit

Completed cards summarize the user's entered or inferred data. Edit reopens the same card and must preserve the shared draft. Cards must never permanently hide user-entered data.

## Shared Draft And Authority Separation

Cards operate over the existing workflow draft or backend-owned truth. They must not introduce parallel objects such as workDetailsDraft, locationDraft, photoDraft, or timingDraft. Submission authority remains wherever the existing canonical create/update path already lives.

For Job Request, `meetroJobRequestDraft` remains the single non-canonical creation state and `/posts` remains the canonical create path.

## AI And Manual Convergence

AI-assisted and manual interfaces should feel like two views over the same request. AI can populate draft fields only within the approved authority boundary. Homeowner edits retain provenance protection.

For Job Request, exact street address, unit, access notes, photo URLs/content, canonical IDs, and submission authority are excluded from AI context. Generalized affected-area context can remain in the bounded interpret request.

## Responsive Rules

Desktop card width should stay visually bounded. Active cards get clear emphasis. Completed and upcoming cards stay compact.

Tablet layouts must avoid clipping, preserve readable summaries, and keep Edit actions reachable.

Mobile layouts should be one column, fit card headers/actions at 390px width, avoid horizontal scrolling, keep native radios usable, and leave bottom controls reachable above navigation.

## Accessibility Rules

Use semantic headings, native buttons, native radio controls, proper labels, `aria-expanded` where relevant, visible focus, and text or symbols in addition to color. Do not use clickable divs for card navigation.

## Platform Adoption Guidance

Future implementations should reuse the lightweight card primitive and keep workflow-specific readiness logic local to the workflow surface. Avoid creating a broad workflow engine until multiple implemented surfaces prove the need.

## Reference Implementation: Job Request

The Job Request Builder uses five cards:

- Tell us about the work
- Service Location
- Add Photos
- When do you need help?
- Review & Submit

The final card is the only place that exposes Submit Job Request. Review remains explicit. Canonical success is still required before draft clearing.

## Future Adoption Targets

Planned future adoption targets include Emergency, Professional Response, Evaluation, Findings, Quote, Invoice, Professional Onboarding, Business Profile, Work Center, and future property, insurance, warranty, commercial, and property-management workflows.

## Anti-Patterns

Avoid giant forms showing every field at once, multiple competing drafts, card state becoming backend authority, percentages implying false lifecycle progress, automatic submission, nested cards everywhere, collapsing while the user is typing, giant decorative cards, excessive vertical scanning, forcing every simple page into the pattern, creating new workflow sections when information belongs inside an existing card, and broad platform refactors solely to adopt the card component.
