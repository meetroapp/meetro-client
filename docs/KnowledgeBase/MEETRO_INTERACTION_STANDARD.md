# Meetro Interaction Standard

Date: July 4, 2026

Status: Official Meetro behavioral reference

## Purpose

The Meetro Interaction Standard defines how Meetro should behave when a person touches, clicks, types, speaks, hovers, opens, closes, saves, confirms, cancels, retries, or asks for help.

This is not a redesign.

This is not a feature implementation.

This is not a replacement for existing workflows.

Architecture defines how Meetro is organized.

Design defines how Meetro looks.

Interaction defines how Meetro behaves.

Every interaction should feel predictable, calm, helpful, intentional, and respectful.

Users should never be surprised by the interface.

If any interaction preference conflicts with the Meetro Constitution, Adaptive Presence Architecture, Meetro Surface Registry, Companion Presence System, Communication Center Architecture, Adaptive Layout Standard, Meetro Design Language Standard, or Final Surface Audit, those documents win.

## 1. Interaction Philosophy

Meetro should guide before acting.

The interface should reduce uncertainty without adding explanation for its own sake.

Core interaction principles:

- Guide before acting.
- Reduce uncertainty.
- Confirm important actions.
- Never interrupt unnecessarily.
- Respect user focus.
- Respect the current work.
- Keep communication centered in relationships.
- Keep ownership clear.
- Preserve context across temporary surfaces.
- Make failure recoverable.
- Let desktop reveal context.
- Let mobile remain effortless.

The interface should never compete with the work.

The best interaction often feels invisible because the user already understands what will happen next.

## 2. The Law of Guided Interaction

### Law of Guided Interaction

Users should understand what will happen before Meetro invokes a native operating system action.

Desktop especially should never surprise users.

Before opening a native system surface, Meetro should provide visible guidance when expectation is unclear.

Native system surfaces include:

- Finder or file picker
- Camera
- Photo Library
- Microphone
- Downloads
- Print dialog
- Email client
- Maps
- Browser
- Native Share
- Calendar
- Contacts
- Phone
- Clipboard

Guidance should be short and plain.

Examples:

- Choose a logo from your computer.
- A file picker will open.
- The first use may request microphone permission.
- This action opens your system print dialog.
- This opens Maps with the job address.
- This copies the invite link to your clipboard.
- This opens your email app.

Do not silently trigger native dialogs when user expectation is unclear.

Guidance is not required when the action is already obvious from the control itself, such as tapping a phone icon labeled Call.

The goal is trust, not extra steps.

## 3. Hosted Experiences

Hosted experiences are temporary surfaces that preserve the originating workspace.

Examples:

- Hosted Profile
- Relationship Card
- Business Preview
- Project Preview
- Schedule Preview
- Proposal Preview
- Desktop Profile context card
- Conversation overflow context card

Hosted experiences should be:

- Temporary
- Dismissible
- Contextual
- Lightweight
- Anchored to the action that opened them when appropriate
- Reused across desktop where the pattern already exists

Hosted experiences should support:

- Close control
- Outside click closes
- Escape closes
- Return to originating workspace
- No layout shift
- No route ownership unless the selected action intentionally navigates

Hosted experiences should never:

- Replace navigation
- Become drawers by default
- Push workspace content
- Blur or dim the workspace unless the task requires full attention
- Contain full editing workflows when a page already owns that work
- Become a second version of a page

Mobile should continue to use the canonical full-page flow when that is the established mobile behavior.

Desktop may host a temporary card to preserve continuity, but it must not invent a second workflow.

## 4. Navigation

Navigation provides orientation.

Interaction should preserve that orientation.

### Forward Navigation

Forward navigation should happen when the user intentionally opens a destination:

- Business Dashboard
- Work Center
- Messages
- Business Profile
- Portfolio
- Settings
- Legal
- Quote Builder
- Invoice Builder

The destination should make the user feel they arrived somewhere with clear ownership.

### Back Navigation

Back should return the user to the place they came from whenever context exists.

Examples:

- Relationship Identity back to Conversation
- Conversation back to Messages section
- Saved Chat History thread back to Saved Chat History
- Portfolio editor back to Portfolio
- Hosted preview close back to the same workspace

Back should not unexpectedly reset sections, filters, scroll position, or active work.

### Sidebar Behavior

Desktop Sidebar is the wide-screen navigation anchor.

It should:

- Preserve role-based destinations.
- Highlight the active destination.
- Stay stable while workspaces scroll.
- Avoid duplicate navigation.
- Use Profile as a temporary hosted interaction when that is the current desktop standard.

### BottomNav Behavior

BottomNav remains the mobile navigation anchor.

It should:

- Respect safe areas.
- Preserve existing mobile role behavior.
- Stay reachable by thumb.
- Avoid covering primary actions.
- Remain unchanged by desktop-only adaptations.

### Hosted Navigation

Hosted surfaces launch actions.

They do not own navigation.

When a hosted card action opens a page, the card closes and the existing destination opens.

### Context Preservation

Temporary object editors and hosted surfaces should preserve:

- Originating workspace
- Scroll position
- Active section
- Conversation context
- Relationship context
- Selected object when relevant

Navigation should always preserve orientation.

## 5. Confirmations

Confirmations are required when an action is destructive, hard to undo, privacy-sensitive, or changes a meaningful lifecycle state.

Confirm before:

- Delete
- Archive
- Cancel work
- Close project
- Complete work
- Logout
- Remove business logo
- Replace files
- Clear local chat
- Remove a contact
- Remove a participant
- Send a final proposal when it changes commitment
- Submit completion when it advances closure

Routine actions should not require confirmation.

Do not confirm:

- Opening a page
- Searching
- Filtering
- Starting a draft
- Opening a hosted card
- Viewing a preview
- Saving a harmless preference
- Selecting a contact in a picker

Confirmation copy should explain the consequence, not expose internal implementation.

Examples:

- Remove this logo?
- Clear this local chat?
- Cancel this visit?
- Archive this conversation?
- Complete this work?

Destructive actions require confirmation.

Routine actions should feel effortless.

## 6. System Actions

System actions are native operating system actions that leave or interrupt the Meetro surface.

They should feel intentional.

### File Picker

Show guidance before opening when the user may not know a picker is next.

Expected experience:

- User sees what file type is being requested.
- User opens picker intentionally.
- User can cancel without losing context.
- Selected file previews or uploads with progress.

### Camera

Camera access should make purpose clear.

Expected experience:

- User understands why the camera is needed.
- Permission prompt is expected.
- Cancel returns to the same workflow.
- Failure provides recovery guidance.

### Photo Library

Photo selection should preserve the originating workspace.

Expected experience:

- User knows whether one photo or multiple photos are allowed.
- Cancel leaves the workflow unchanged.
- Selected photos remain editable/removable before final submission when appropriate.

### Microphone

Voice interactions should explain first-use permission.

Expected experience:

- User understands recording is about to start.
- Listening state is visible.
- User can stop or cancel.
- Permission denial offers a clear fallback.

### Downloads

Downloads should identify what is being downloaded.

Expected experience:

- User knows the document name or type.
- Success confirms the download started or completed.
- Failure offers retry.

### Printing

Printing opens a system print dialog.

Expected experience:

- User understands a print dialog will open.
- The printable object is clear.
- Cancel returns to the same surface.

### Email

Email actions may open the system email client.

Expected experience:

- User knows an email app may open.
- Recipient and purpose are clear when possible.
- If no email app is available, Meetro offers a copy or retry path.

### Maps

Map actions may leave Meetro.

Expected experience:

- User knows the address or destination.
- Maps opens with the intended location.
- Cancel or back returns to Meetro without losing context.

### Browser

External browser links should be intentional.

Expected experience:

- User knows the link is external when relevant.
- Public/legal links open clearly.
- In-app routing should be preferred for internal destinations.

### Phone

Phone actions should use the visible phone number when available.

Expected experience:

- Call button opens the phone dialer.
- Missing phone number is handled gracefully.

### Native Share

Native Share should not be forced when a linked Meetro conversation already exists.

Expected experience:

- Linked Meetro relationships use Meetro Chat as the communication path.
- External contacts may use native share with clear summary and invite link.
- User chooses sharing when the delivery path is not already known.

### Clipboard

Clipboard actions should confirm what happened.

Expected experience:

- Copy action completes quickly.
- User receives a short success state.
- Failure offers manual fallback.

### Contacts

Contacts access should be guided.

Expected experience:

- User understands contacts are being imported or selected.
- Permission denial explains how to recover.
- Imported contacts remain contacts until communication exists.

System actions should never feel like traps.

## 7. Companion

The Companion is a presence, not a destination.

Companion interactions should support the workspace without owning it.

The Companion remains:

- Helpful
- Read-only unless explicitly asked to prepare an action
- Non-owning
- Context-aware
- Dismissible
- Never interrupting active work

### Presence

The resting state should be visible without blocking the workspace.

It should feel available, not intrusive.

### Workspace Guidance

The Companion should understand the current surface.

Examples:

- Dashboard: orient the user to today's attention.
- Messages: summarize conversation context or prepare a reply.
- Work Center: help prepare next steps, quote, invoice, or completion notes.
- Business Profile: help identify missing readiness items.

### Conversation

Companion conversation should feel like Meetro help, not generic chat.

It should use current workspace context and avoid asking the user to restate what Meetro already knows.

### Expansion

Expanded Companion state should:

- Preserve the workspace behind it.
- Not push layout.
- Not blur the app.
- Provide close/collapse.
- Keep voice and type controls clear when supported.

### Collapse and Dismissal

Collapse returns to resting presence.

Dismissal should not make the Companion impossible to recover.

### Context Updates

The Companion may update context as the user moves through Meetro.

It should not interrupt active work to announce every change.

## 8. Forms

Forms should reduce user anxiety.

They should feel like reviewing prepared information, not completing software taxonomy.

### Validation

Validation should happen close to the field and close to the moment of action.

Errors should be specific and fixable.

### Errors

Errors should explain what needs attention.

Avoid generic failure when a better message is available.

Examples:

- Add a project title before publishing.
- Enter a valid email address.
- Choose a date and time for this visit.
- This code expired. Request a new one.

### Inline Guidance

Guidance should be short and only appear where it reduces uncertainty.

### Save Behavior

Save should update the owning truth.

Save should not only update local state.

After save, users should see a success state or visible updated information.

### Autosave

Autosave is appropriate only when the user understands that changes are being preserved.

Autosave should provide quiet feedback.

### Required Fields

Required fields should be meaningful, not excessive.

If Meetro can responsibly prepare a value, it should prepare it and let the user edit.

### Draft Behavior

Drafts should preserve work when interruption is likely.

Drafts should not create fake completed objects.

### Submission

Submission should make the next state clear.

Examples:

- Request sent.
- Quote sent.
- Schedule updated.
- Project published.
- Message sent.

### Recovery After Failure

Failed submissions should preserve entered content.

Users should never lose work because of a network or validation failure.

## 9. Feedback

Users should always know what happened.

Feedback should be immediate, truthful, and proportional.

### Loading

Loading should appear only while something is actually being resolved.

If local data exists, render it immediately and hydrate extra information afterward.

Do not block primary actions while lower-priority information loads.

### Saving

Saving states should make clear that the action is in progress.

Controls should prevent duplicate submits when appropriate.

### Success

Success should be short.

Examples:

- Saved.
- Sent.
- Updated.
- Copied.
- Added to Contacts.

### Warning

Warnings should identify risk without sounding alarming.

### Failure

Failures should explain the recoverable next step.

Examples:

- Could not save to Contacts. Please try again.
- Contacts access is off. You can enable it in iPhone Settings or import a file instead.
- Network problem. Check your connection and try again.

### Retry

Retry should be available when the user can meaningfully try again.

### Offline

Offline states should preserve local context and avoid implying the user did something wrong.

### Sync

Sync states should distinguish between local save and shared update when that matters.

Feedback should reduce uncertainty, not add noise.

## 10. Empty States

Every empty state should:

- Explain
- Guide
- Offer a next action when one naturally exists
- Preserve calm
- Avoid blaming the user
- Avoid implementation language

Empty states should never leave users stranded.

Examples:

- No hiring conversations yet. Applicants will appear here after they contact you or you start a conversation from Hiring Center.
- Your first customer reviews will appear after completed jobs.
- No work history yet.
- No invoices yet.
- Context will appear here as this relationship develops.

Do not use empty states to advertise unrelated features.

Do not create fake data to make an empty state look full.

## 11. Desktop Interaction

Desktop should communicate capability without clutter.

Desktop interaction should adapt by revealing context, not by changing the workflow.

Desktop interaction expectations:

- Hover may reveal affordances.
- Focus states must be visible.
- Keyboard navigation should reach primary actions.
- Resize should preserve hierarchy.
- Context panels should be quiet and relevant.
- Hosted cards should preserve the workspace.
- Inspectors should support understanding without taking ownership.
- Sidebar should anchor navigation.
- BottomNav should not duplicate Sidebar on wide screens.
- Companion should remain available without blocking work.

Desktop should avoid:

- Mobile-only bottom padding when BottomNav is hidden.
- Full-page takeover for temporary actions.
- Huge stretched cards.
- Surprise native dialogs.
- Dense admin panels.
- Second workflows that do not exist on mobile.

Desktop should feel like the same Meetro with more context available.

## 12. Mobile Interaction

Phone remains the canonical interaction model.

Mobile should feel focused, reachable, and safe.

Mobile interaction expectations:

- Touch targets should be comfortable.
- Gestures should be familiar and optional.
- Bottom navigation should remain stable.
- Keyboard should not cover primary actions.
- Camera and photo flows should preserve context.
- Voice interactions should clearly show listening, thinking, and responding states.
- Scrolling should preserve important controls.
- Safe areas should be respected.
- One-handed interaction should be considered for common actions.
- Temporary editors should belong to the viewport.

Mobile should avoid:

- Hidden forms below the fold after a top action.
- Floating controls covering primary buttons.
- Nested modals.
- Horizontal page shift.
- Tiny tap targets.
- Desktop-only assumptions.

Mobile remains the baseline.

Desktop expands from mobile.

## 13. Accessibility

Accessible interaction is not a separate layer.

It is part of the interaction standard.

Meetro should support:

- Keyboard navigation
- Logical focus order
- Visible focus states
- Screen reader names for interactive controls
- Correct button/link semantics
- No nested interactive elements
- Touch targets large enough for mobile
- Reduced motion support
- Color-independent meaning
- Error messages connected to fields
- Escape behavior for hosted surfaces
- Outside-click behavior paired with keyboard dismissal

Accessibility interactions should preserve the same workflow for every user.

Do not make the accessible path a lesser version of the visual path.

## 14. Error Recovery

Recovery should always be clear.

Meetro should distinguish between different failure types when it can do so safely.

### Network Failures

Explain that the connection failed and preserve user input.

Offer retry when appropriate.

### Permission Denial

Explain what access is off and offer an alternate path.

Examples:

- Contacts access is off. You can enable it in iPhone Settings or import a file instead.
- Microphone access is off. You can type your message instead.

### File Errors

Explain whether the file type, size, or upload failed.

Preserve the workflow.

### Camera Unavailable

Offer photo library or manual upload when available.

### Microphone Unavailable

Offer typing or retry when available.

### Upload Failures

Keep selected files visible if possible.

Let the user retry without choosing everything again.

### Verification Failures

Invalid code should appear only when the backend explicitly reports an incorrect code.

Other states should be specific:

- Code expired.
- Verification timed out.
- Too many attempts.
- Session expired.
- Network problem.
- Verification service unavailable.

Recovery should protect dignity.

The user should never feel blamed for system uncertainty.

## 15. Founder Principles

Meetro interactions should build trust through predictable behavior.

Founder principles:

- Never surprise the user.
- Guide before acting.
- Respect attention.
- Respect relationships.
- Respect trust.
- Preserve the current work.
- Keep ownership clear.
- Make the next step understandable.
- Avoid unnecessary configuration.
- Let Meetro prepare.
- Let people decide.

The best interaction is often the one users never notice.

Users should never fear clicking.

They should always understand what comes next.

## Implementation Rule

This standard should guide future interaction work.

It should not be used as permission to redesign existing surfaces.

When applying this standard:

- Preserve mobile behavior unless explicitly changing a mobile interaction.
- Preserve routing.
- Preserve business truth ownership.
- Preserve workflow ownership.
- Preserve relationship continuity.
- Normalize only obvious inconsistencies.
- Prefer shared interaction patterns already proven in Meetro.

Examples of safe normalization:

- Add guidance before an unclear desktop file picker.
- Add permission guidance before first microphone use.
- Ensure hosted cards close with Escape.
- Ensure destructive actions confirm.
- Ensure failure states preserve entered work.

Do not introduce new workflows to satisfy interaction preference.

## Relationship to Other Standards

The Interaction Standard works with:

- Meetro Constitution
- Adaptive Presence Architecture
- Meetro Surface Registry
- Companion Presence System
- Communication Center Architecture
- Adaptive Layout Standard
- Meetro Design Language Standard
- Final Surface Audit

The Design Language expresses how Meetro feels visually.

The Interaction Standard expresses how Meetro behaves.

The two should reinforce each other.

## Closing Principle

Interfaces build trust through predictable behavior.

Users should never fear clicking.

They should always understand what comes next.

Guide before acting.

Reduce uncertainty.

Strengthen relationships.

Protect the Constitution.

Protect the interaction language.

Protect the Lantern.

The Lantern stays lit.
