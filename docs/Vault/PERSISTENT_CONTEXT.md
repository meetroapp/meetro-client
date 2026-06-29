Confidential — Meetro Internal Vault

This document contains foundational product philosophy and architectural identity for Meetro.
It is not implementation documentation.
It is not public-facing marketing language.
It is not to be copied into public materials, investor decks, app descriptions, or support docs without founder approval.

This document may only be amended by discovery, never by preference.

# Persistent Context

Persistent context is the durable work memory that remains visible and trustworthy while the active responsibility changes.

Meetro should preserve the person/work relationship even as the next action moves across conversation, schedule, proposal, payment, completion, and history.

## Core Meaning

- The context is not the full project.
- The context is the stable anchor for the current work.
- The context is visible, calm, and never replaced by the next surface.

## Core Elements

- Relationship identity
- Active request/job/project
- Current stage
- Next responsibility
- Last relevant touchpoint (without overloading the screen)

## Continuity Rule

When focus changes, context does not disappear.

If the profession switches from evaluation to proposal, the person and relationship remain the same.

If conversation confirms a next action, tools may open or change but the context remains.

## Current Implementation Reference (for alignment, no behavior change in this task)

- The persistent context direction is documented in execution work and should be interpreted in tandem with:
  - [FOCUS_WORKSPACE_FOUNDATION.md](./../KnowledgeBase/FOCUS_WORKSPACE_FOUNDATION.md)
  - [WORK_CENTER_ATTENTION_HIERARCHY.md](./../KnowledgeBase/WORK_CENTER_ATTENTION_HIERARCHY.md)
  - [WORK_CENTER_FOCUS_AUDIT.md](./../KnowledgeBase/WORK_CENTER_FOCUS_AUDIT.md)

## Design Constraint

Do not design every surface from scratch.

Do not move work out of where it belongs.

Do not fragment ownership by creating multiple competing context definitions.
