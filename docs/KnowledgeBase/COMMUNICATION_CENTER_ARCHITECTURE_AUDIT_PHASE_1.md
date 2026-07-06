# Communication Center Architecture Audit Phase 1

Date: July 4, 2026

Status: Audit plus Phase 3 Task 006 refinement note

## Purpose

This audit reviews Meetro's existing Messages experience as a relationship and
workflow system, not as a chat UI.

No runtime behavior was changed for this phase. The purpose is to understand
what should be preserved, what is drifting, and what architectural direction
future Communication Center work should follow.

Primary audit question:

Does each communication screen strengthen a relationship and move real work
forward, or is it simply another place to exchange messages?

## Source Surfaces Reviewed

- `src/pages/MessagesInbox.jsx`
- `src/pages/ConversationThread.jsx`
- `docs/KnowledgeBase/MEETRO_SURFACE_REGISTRY.md`
- `docs/KnowledgeBase/ADAPTIVE_WEB_BASELINE_AUDIT.md`
- `docs/KnowledgeBase/CANONICAL_WORKFLOW_EVENT_ENVELOPE.md`
- `docs/KnowledgeBase/OPERATIONAL_AGGREGATE_PHASE_6_READ_MODEL_AND_LIFECYCLE_ARCHITECTURE.md`
- `docs/foundation/RELATIONSHIP_LAYER.md`

## Communication Philosophy

Meetro's communication path should be:

Relationship -> Intent -> Conversation -> Understanding -> Decision -> Work -> History

The current Messages architecture already contains the beginning of this model:

- Contacts preserve people.
- Conversations preserve communication.
- Conversation Thread is treated as the relationship timeline, not merely a
  message store.
- Workflow cards may appear in conversations, but workflow authority belongs to
  the owning domain.

The largest current gap is that intent is not yet first-class. Communication
usually begins from a relationship or thread, but the reason for the
communication is often inferred after the conversation starts instead of being
explicitly carried from the beginning.

## Executive Summary

Messages has moved beyond a simple chat surface. It now behaves like a
relationship communication workspace in several important ways:

- The Messages Workspace has an explicit surface registry definition.
- Messages Inbox separates Contacts from Conversations.
- Conversations are filtered toward real threads rather than imported contact
  placeholders.
- Conversation rows share a common opening path into ConversationThread.
- ConversationThread carries relationship identity, current work signals,
  schedule cards, quote cards, invoice cards, photo/document cards, and saved
  history references.
- Desktop has a documented adaptive direction: Inbox | Conversation | Context.

However, the experience is not yet a fully coherent Communication Center.

The current architecture still has three tensions:

1. Messages sometimes hosts workflow entry points that should clearly hand off
   to owning systems instead of appearing to create or own work.
2. Relationship context exists, but it is not always visible at the moment of
   decision.
3. Intent is implied through tabs, cards, labels, or message content rather than
   being a stable part of the communication model.

The right next evolution is not a redesign. It is a responsibility cleanup and
context strengthening pass: keep the communication center, make every thread
relationship-aware, make every work card authority-aware, and make intent
visible before the user has to hunt for it.

## Phase 3 Task 006 Refinement Note

Task 006 begins that evolution without replacing Messages.

The runtime refinement keeps mobile behavior intact and strengthens only the
existing adaptive desktop context panel. The Communication Center now projects
four kinds of context beside the conversation when width allows:

- Relationship identity: who the conversation belongs to.
- Intent hierarchy: why the conversation exists, using existing conversation,
  project, emergency, hiring, quote, schedule, invoice, or maintenance signals.
- Conversation authority: current status, current owner, and next decision.
- Workspace awareness and relationship memory: related work, schedule/proposal
  references, relationship age, recent activity, active work, completed work,
  invoices, and documents when those facts already exist.

This is projection only. Messages still does not own emergency work, tickets,
schedules, invoices, quotes, hiring setup, or active work execution. The panel
summarizes the relationship around the conversation and hands users to the
owning workspace when they choose to open details.

Companion awareness was updated in the same spirit. In Messages and
ConversationThread, the Companion frames help around summarizing the
conversation, finding schedule or proposal details, and preparing a reply. It
supports communication context; it does not replace communication or make
decisions.

Hosted desktop inspectors remain allowed only as temporary context surfaces.
They may reveal relationship, project, schedule, proposal, or business preview
information, but they must not become replacement pages or duplicate workflow
owners.

## Surface Audit

### 1. Messages Inbox

What works and should be preserved:

- Messages Inbox is correctly defined as the surface for choosing which
  relationship or conversation to continue.
- The separation between Contacts and communication sections is architecturally
  important and should stay.
- Conversations are filtered toward real initialized threads.
- Saved Chat History is explicitly user-saved, not automatically archived.
- Search and section selection support the user's question: "Who do I need to
  communicate with?"

What feels disconnected from relationship context:

- The inbox can still read as a list of message containers instead of a list of
  living relationships when current status, next action, or related work is not
  visible.
- Relationship categories and communication contexts can compete if their
  purpose is not visually clear.

What creates friction or duplicate responsibility:

- Any action in Messages Inbox that starts work creation, hiring setup,
  emergency work, tickets, schedules, or invoices creates ownership drift.
- Imported contacts and saved relationships must never leak into Conversations
  unless they have a real thread.

What breaks workflow continuity:

- Rows that represent relationship placeholders instead of real conversations
  break the expectation that tapping a conversation opens communication.
- Saved history only works constitutionally if it returns to the same thread
  timeline and does not become a separate archive product.

What should become relationship-aware:

- Every row should resolve identity from the relationship or participant, not
  from generic conversation labels.
- Contacts should remain the relationship directory anchor.

What should become intent-aware:

- Conversations should communicate why the relationship is active: schedule,
  quote, emergency, hiring, follow-up, invoice, or general communication.
- Intent should be presented as context, not as a second filter model.

Desktop adaptation:

- Preserve the documented desktop workspace direction: Inbox | Conversation |
  Context.
- The inbox should become the left relationship/communication list, not a wide
  phone screen.

### 2. Conversation Thread

What works and should be preserved:

- ConversationThread is communication-first.
- It preserves message sending, message history, relationship header identity,
  schedule cards, quote cards, invoice cards, emergency state cards, and media
  references.
- The existing documentation correctly states that Conversation owns
  communication state and `MESSAGE_CREATED`, while workflow transitions belong
  to workflow domains.
- Relationship Identity is reachable from the thread without replacing the
  conversation.

What feels disconnected from relationship context:

- The thread sometimes has to assemble relationship identity from many local
  sources, registry records, selected request context, emergency records, and
  storage fallbacks. That makes the visible relationship feel less canonical
  than it should.
- Current status and next responsibility are present in places, but not always
  stable enough to feel like persistent context.

What creates friction or duplicate responsibility:

- ConversationThread has historically contained actions for schedule, invoice,
  tenant ticket, materials, payment, and emergency progression. These are useful
  only when they behave as handoffs or projections.
- If these actions create or transition workflow truth directly inside Messages,
  Conversation becomes a workflow owner, which violates the ownership boundary.

What breaks workflow continuity:

- A schedule, quote, or invoice card that opens a separate workflow without
  preserving `conversationId`, `relationshipId`, and return context breaks the
  relationship timeline.
- A workflow card with stale status breaks trust because the conversation no
  longer reflects current work.

What should become relationship-aware:

- The header, thread menu, composer actions, and reference cards should all use
  the same relationship identity and current-work projection.
- Relationship Identity should remain one tap away and should support the
  conversation, not replace it.

What should become intent-aware:

- The thread should know whether the current communication is general,
  emergency, hiring, schedule, quote, invoice, completion, closure, or follow-up.
- Intent should guide available actions without turning the thread into Work
  Center.

Desktop adaptation:

- ConversationThread should remain the center pane.
- Relationship and project context should move into the right panel where width
  allows, reducing card overload inside the message timeline.

### 3. New Conversation Flow

What works and should be preserved:

- The current direction is contact-first, which is correct.
- New Chat and New Group Chat begin from selecting a relationship/contact rather
  than from an empty form.
- Group conversation behavior should continue to feel like selecting people
  first, then optionally naming the group.

What feels disconnected from relationship context:

- A new conversation should make it clear whether the selected person is an
  external contact, linked Meetro member, customer, tenant, vendor, employee, or
  property manager.

What creates friction or duplicate responsibility:

- Asking for name, phone, or email before contact selection reintroduces a form
  mindset and duplicates Contacts.
- Import Contacts belongs in Contacts, not as part of starting a chat unless the
  user explicitly needs a new relationship to message.

What breaks workflow continuity:

- Starting a chat with an imported inactive contact must not create fake
  messages or fake work.
- A new thread should be initialized once and reused, not duplicated on repeated
  starts.

What should become relationship-aware:

- The picker should distinguish linked Meetro relationships from saved external
  contacts.

What should become intent-aware:

- Before opening a new conversation, Meetro should eventually understand the
  user's intent: general message, schedule, emergency, quote, hiring,
  maintenance, or follow-up.

Desktop adaptation:

- On desktop, contact selection can be a focused panel or overlay without
  leaving the Messages workspace.
- The relationship list should remain visible if it helps orientation, but the
  picker should not feel like a database table.

### 4. Customer Conversations

What works and should be preserved:

- Customer conversations can carry schedule, quote, invoice, photos, and
  completion references.
- Save to Contacts and Relationship Identity patterns strengthen continuity when
  scoped correctly.

What feels disconnected from relationship context:

- Customer status can be split across conversation preview, relationship
  identity, Work Center, schedule, and quote/invoice surfaces.

What creates friction or duplicate responsibility:

- Messages should not create the customer record and manage work state as if it
  were a CRM. It should display and continue communication around those truths.

What breaks workflow continuity:

- If schedule or quote actions lose the customer relationship and create a new
  visit or duplicate conversation, the relationship timeline fractures.

What should become relationship-aware:

- Customer threads should show relationship identity, active work status, and
  latest meaningful next action.

What should become intent-aware:

- The thread should distinguish follow-up, schedule change, quote review,
  invoice question, closure review, and general message.

Desktop adaptation:

- Customer conversation desktop context should show customer identity, active
  request/job, latest schedule, quote/invoice status, and next action.

### 5. Professional Conversations

What works and should be preserved:

- Professional/business identity can appear in conversation rows, headers, and
  Relationship Identity.
- Homeowners can preserve ongoing communication with a professional.

What feels disconnected from relationship context:

- Professional identity has been historically vulnerable to avatar/source
  mismatches and must keep using canonical user/business identity.

What creates friction or duplicate responsibility:

- Saving a professional to Contacts must write to the active profile scope and
  must not create a new conversation.

What breaks workflow continuity:

- If a homeowner sees a professional as a chat participant in one place and a
  different contact/profile in another, the relationship feels split.

What should become relationship-aware:

- Professional/business threads should carry business name, logo, role, service
  area, and linked status consistently.

What should become intent-aware:

- Intent should distinguish inquiry, active service, emergency, quote review,
  schedule, invoice, and history.

Desktop adaptation:

- Professional context should appear in the right panel without turning the
  conversation into a public profile page.

### 6. Emergency Conversations

What works and should be preserved:

- Emergency has a dedicated communication context.
- Emergency rows should use the same ConversationRow -> ConversationThread path
  as standard chats, with only metadata and styling differing.
- Emergency threads can display urgent status and lifecycle references.

What feels disconnected from relationship context:

- Emergency can feel like a case/work item rather than a relationship if the
  professional/customer identity and current emergency state are not stable.

What creates friction or duplicate responsibility:

- Messages must not create emergency work. Emergency/request flow owns emergency
  creation, and Work Center/aggregate authority owns work execution.

What breaks workflow continuity:

- Emergency previews that describe stale state, such as active after completion,
  weaken the timeline.
- Emergency rows that do not open the same conversation path break trust.

What should become relationship-aware:

- Emergency threads should always connect the urgent work to the customer,
  business/professional, service, location, and conversation.

What should become intent-aware:

- Emergency intent is explicit and should drive prominence, response cues, and
  next action without becoming a separate navigation system.

Desktop adaptation:

- Emergency should remain visible as urgent communication in the inbox.
- Context panel should show emergency state, next responsibility, and related
  work reference.

### 7. Hiring Conversations

What works and should be preserved:

- Hiring is recognized as a communication context.
- Recent corrections point creation/publishing work back to Hiring Center.

What feels disconnected from relationship context:

- Applicant identity and role context must be clear enough that Hiring does not
  feel like generic chat.

What creates friction or duplicate responsibility:

- Messages must not create job positions, publish roles, or manage hiring setup.
- Hiring Center owns open roles and applicant management.

What breaks workflow continuity:

- A hiring thread that opens setup forms inside Messages breaks the
  communication-only responsibility of the surface.

What should become relationship-aware:

- Hiring conversations should connect applicant, position, business, and
  conversation without turning into applicant management.

What should become intent-aware:

- Intent should distinguish applicant follow-up, interview scheduling, document
  request, decision, and general message.

Desktop adaptation:

- Hiring context panel can show applicant summary and related position, with a
  link to Hiring Center.

### 8. Tenant Communication

What works and should be preserved:

- The Relationship Layer philosophy correctly treats tenants, property
  managers, and vendors/professionals as durable relationships.
- Tenant communication can project maintenance ticket context into a
  conversation.

What feels disconnected from relationship context:

- Tenant, property, unit, property manager, and assigned professional can become
  fragmented unless the same relationship graph is visible.

What creates friction or duplicate responsibility:

- Messages must not own ticket creation or assignment authority. It may show
  the ticket and route to the owning property/work system.

What breaks workflow continuity:

- Recreating a ticket when assigning a vendor breaks the rule that the ticket is
  forwarded, not duplicated.

What should become relationship-aware:

- Tenant communication should always show tenant, property/unit, manager, and
  assigned professional context when available.

What should become intent-aware:

- Tenant communication should distinguish maintenance issue, access/schedule,
  status update, approval, and completion.

Desktop adaptation:

- The right panel should eventually show property/unit, current ticket, assigned
  professional, and status.

### 9. Employee Communication

What works and should be preserved:

- Employees belong in the business relationship network and can be reached from
  Messages when communication exists.

What feels disconnected from relationship context:

- Employee communication has less visible distinction from customer/vendor chat
  unless the role and work context are explicit.

What creates friction or duplicate responsibility:

- Messages should not become employee management, scheduling authority, or HR
  setup.

What breaks workflow continuity:

- If employee communication is mixed with homeowner/personal contacts, account
  scope becomes unclear.

What should become relationship-aware:

- Employee rows and threads should clearly show business relationship scope.

What should become intent-aware:

- Intent should distinguish internal coordination, job assignment, schedule
  update, follow-up, and general note.

Desktop adaptation:

- Employee threads can benefit from context showing assigned work or team role,
  but only as a projection.

### 10. Attachments and Media

What works and should be preserved:

- ConversationThread supports photo/image messages, document-like cards, voice
  notes, video cards, location cards, and project explanation photos.
- Project explanation photos can be saved into job record context.

What feels disconnected from relationship context:

- Media can appear as generic attachments if not tied to why it was shared:
  explain project, before photo, progress photo, issue documentation,
  completion evidence, receipt, or document.

What creates friction or duplicate responsibility:

- Messages should not become the full document management system.
- Photos/documents can be projected into history, but document/history authority
  should remain explicit.

What breaks workflow continuity:

- Attachments that stay only in chat and do not reach the related work/history
  context can be lost as evidence.

What should become relationship-aware:

- Attachments should connect to relationship, conversation, and related work
  when those links exist.

What should become intent-aware:

- Media actions should ask or infer purpose lightly: explain, document issue,
  before, progress, completion, receipt, or general share.

Desktop adaptation:

- Desktop context panel can show recent shared documents/photos while the
  conversation remains centered.

### 11. Schedule Cards

What works and should be preserved:

- Schedule cards appear inside conversation and can preserve visit context.
- Recent schedule handoff work points toward preserving `visitId`,
  `conversationId`, and `relationshipId`.
- Linked Meetro customers should receive updates through the same chat.

What feels disconnected from relationship context:

- Schedule context can be split between the card, Work Center schedule, local
  storage handoff, and conversation preview.

What creates friction or duplicate responsibility:

- Messages should not be schedule authority. It may display cards and hand off
  to schedule/work authority.

What breaks workflow continuity:

- Creating duplicate visits during schedule changes breaks the relationship
  timeline.
- Old schedule cards must be marked updated/replaced when a newer schedule is
  active.

What should become relationship-aware:

- Schedule cards should clearly show who the visit is with and which
  relationship/work item it belongs to.

What should become intent-aware:

- A schedule card should distinguish proposed, updated, accepted, declined,
  replaced, and completed states.

Desktop adaptation:

- Context panel should show current active visit and schedule status while the
  thread shows the card history.

### 12. Quote Sharing

What works and should be preserved:

- Quote cards can appear in ConversationThread.
- Quotes are part of the relationship decision path.

What feels disconnected from relationship context:

- Quote status must remain tied to the related request/job/customer instead of
  looking like a free-floating chat card.

What creates friction or duplicate responsibility:

- Conversation must not own quote approval or revision authority just because it
  displays the card.

What breaks workflow continuity:

- If quote revision or approval does not update related work and history, the
  conversation becomes stale.

What should become relationship-aware:

- Quote cards should show relationship, project/request, amount/status, and next
  decision.

What should become intent-aware:

- Quote communication should distinguish review, revision request, approval,
  decline, and follow-up.

Desktop adaptation:

- Right context can show current quote/proposal status and link to Quote Builder
  or customer review.

### 13. Invoice Sharing

What works and should be preserved:

- Invoice/payment cards can appear in the conversation timeline.
- Invoice handoff can route to Invoice Builder.

What feels disconnected from relationship context:

- Invoice context must show payer, related job, status, and relationship.

What creates friction or duplicate responsibility:

- Messages must not become invoice/payment authority.
- Payment status should come from invoice/payment systems, not chat rendering.

What breaks workflow continuity:

- Invoice cards that remain unpaid/paid incorrectly or are disconnected from the
  related work create history problems.

What should become relationship-aware:

- Invoice cards should tie payment request to the relationship and job/work
  history.

What should become intent-aware:

- Invoice communication should distinguish request payment, question, paid,
  receipt, follow-up, and dispute/concern.

Desktop adaptation:

- Context panel can show invoice status and link to invoices while keeping the
  thread communication-first.

### 14. Ask Meetro Interactions

What works and should be preserved:

- Ask Meetro is now intended as a Companion presence, not a disconnected AI
  button.
- The Companion should understand the current workspace and assist inside the
  user's communication context.

What feels disconnected from relationship context:

- If Ask Meetro opens as a generic assistant without relationship, thread,
  status, or next action, it becomes a separate feature.

What creates friction or duplicate responsibility:

- Companion guidance must never own decisions, messages, schedule changes,
  quotes, invoices, or work transitions.

What breaks workflow continuity:

- A generic assistant flow that ignores the active conversation forces the user
  to restate context Meetro already has.

What should become relationship-aware:

- Inside Messages, Ask Meetro should know the active relationship, conversation,
  visible cards, current work, and recent decision points.

What should become intent-aware:

- Suggested actions should be communication-specific: summarize, prepare reply,
  find schedule details, clarify next action, draft update, or identify what
  needs a decision.

Desktop adaptation:

- Companion should assist the Messages workspace without covering the primary
  thread or replacing the right context panel.

### 15. Desktop Adaptations

What works and should be preserved:

- The documented Phase 1 adaptive workspace is correct: Inbox | Conversation |
  Context.
- Mobile remains Inbox -> Conversation -> Back, which preserves focus.
- Desktop reveals more context without creating a separate product.

What feels disconnected from relationship context:

- The right context panel is still early. It must become the natural home for
  relationship and project context, otherwise desktop will become a stretched
  phone view.

What creates friction or duplicate responsibility:

- Desktop space should not invite extra controls, duplicated summaries, or
  dashboard-like noise.

What breaks workflow continuity:

- If desktop context opens separate pages for every workflow reference, it loses
  the benefit of continuity.

What should become relationship-aware:

- Desktop should keep relationship identity, current work, schedule/quote status,
  and next action visible while the conversation remains centered.

What should become intent-aware:

- The context panel should adapt to conversation intent: emergency, hiring,
  schedule, quote, invoice, tenant ticket, or general relationship.

Desktop adaptation:

- This is the adaptation. The next phase should refine context, not rebuild
  conversation.

## Cross-Surface Findings

### Preserve

- Contacts vs Conversations distinction.
- Contact-first New Chat and New Group Chat.
- One conversation opening path for standard, emergency, hiring, and saved
  conversations.
- ConversationThread as the relationship communication timeline.
- Relationship Identity as supporting context, not inline list expansion.
- User-saved Saved Chat History.
- Schedule, quote, invoice, photo, and workflow cards as timeline projections.
- Mobile focused flow.
- Desktop adaptive workspace direction.

### Correct Later

- Make intent first-class before or at conversation start.
- Make relationship identity resolution canonical across inbox, header, thread,
  Relationship Identity, and Companion.
- Make every workflow card authority-aware and status-fresh.
- Move remaining work creation actions into owning systems while preserving
  handoffs back to the same conversation.
- Strengthen desktop context panel as the place for relationship/project context.

### Avoid

- Treating Messages as CRM, Work Center, Hiring Center, Schedule, Invoice, or
  Ticket authority.
- Letting imported contacts appear as conversations.
- Creating fake threads or fake messages for inactive contacts.
- Duplicating visits, quotes, invoices, tickets, or emergency work from a chat
  action.
- Turning Ask Meetro into a generic chatbot detached from the active
  relationship.
- Using wide screens to add noise rather than context.

## First-Principles Answer

If Meetro were designed today from first principles, would this communication
experience still look and behave the same?

Partly.

The current experience contains the right foundation and should not be thrown
away. The relationship directory, real conversation filtering, contact-first
starting flow, conversation timeline, saved chat history, workflow cards, and
desktop workspace direction all belong in a first-principles Meetro.

But the experience would not be designed exactly the same.

From first principles, Meetro communication would begin with relationship and
intent together. The user would not simply open a chat; they would continue a
relationship with a visible reason, current status, and next responsibility.
The conversation would remain central, but the surrounding architecture would
make clear what the conversation is about and which system owns the next step.

The architectural reason is this:

Messages currently has relationship and workflow references, but intent,
authority, and current context are not yet consistently first-class at every
entry point. The system often reveals context after the user enters a thread.
A first-principles Communication Center would carry that context into the
thread from the beginning and keep ownership boundaries visible.

## Phase 2 Direction

The next safe phase should not redesign Messages. It should define the
Communication Center contract:

- What is a communication row?
- What is a relationship row?
- What is conversation intent?
- What context must every thread carry?
- Which workflow cards are projections only?
- Which actions hand off to owning systems?
- What belongs in the desktop context panel?
- What should Ask Meetro know inside a conversation?

Only after that contract is written should UI refinement continue.

## Closing Principle

Communication is not the work.

Communication carries the relationship through the work.

The relationship remains.

The conversation preserves understanding.

The owning workflow makes decisions real.

History remembers what happened.

The Lantern stays lit.
