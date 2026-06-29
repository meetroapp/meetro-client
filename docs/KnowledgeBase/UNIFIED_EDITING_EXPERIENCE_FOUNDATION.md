# Unified Editing Experience Foundation

Execution: 015.0

## Purpose

Temporary object editors in Meetro should behave consistently. A user should be able to open an editor, make a focused change, save or cancel, and return to the exact workspace context they came from.

This is an interaction contract, not a new truth owner.

## Constitutional Rule

Workspaces own navigation.

Objects open temporary editors.

Editors preserve context.

Saving returns the user to where they came from.

## Reference Interaction

Business Profile -> Services Offered is the current reference pattern.

Flow:

1. User remains in the originating workspace.
2. User taps the object they want to edit.
3. Editor opens as a viewport-owned temporary workspace.
4. Editor preserves page scroll position.
5. User edits the object.
6. User chooses Cancel or Save.
7. Editor closes.
8. User returns to the same workspace and scroll position.

## Required Editor Behavior

Temporary editors should:

- Render from the viewport, not from the triggering card.
- Avoid route changes unless the user is opening a permanent workspace.
- Preserve the originating workspace and scroll position.
- Use a consistent header: title, optional subtitle, and Cancel.
- Keep primary completion action in a predictable footer position.
- Use Save for completed edits unless the workflow requires a more specific action.
- Support optional search only when the edited object benefits from it.
- Keep internal content scrollable instead of scrolling the page behind the editor.
- Respect safe-area insets and keyboard changes.
- Return the user to the exact context they came from.

## Reference Implementation Notes

`ServiceSelectorSheet` currently provides the reference behavior:

- It portals to `document.body`.
- It uses fixed viewport positioning.
- It supports centered placement for Business Profile object editing.
- It preserves and restores scroll position.
- It keeps Cancel and Save/Done actions predictable.
- It keeps selector content scrollable inside the editor.

## Current Adoption

Adopted:

- Business Profile -> Services Offered

Candidates for future adoption:

- Portfolio item editor
- Business Hours editor
- License Information editor
- Verification Details editor
- Business Description editor
- Service Area editor
- Work Center object editors

These should adopt the contract when they become temporary object editors. They should not create new routing, storage, projection, lifecycle, or workflow ownership.

## Non-Goals

This foundation does not:

- Change storage.
- Change projections.
- Change routing.
- Change lifecycle.
- Add new business truth.
- Require every editor to migrate before TestFlight.
- Create reuse for reuse's sake.

## Implementation Guidance

If a future editor is structurally similar to Services Offered, reuse or extend the viewport-owned sheet pattern.

If a future editor needs different content, preserve the contract first. Component reuse is secondary to consistent behavior.

Permanent workspaces can still own routes. Temporary editors should not.
