# Workflow Identity Ownership Specification

**Phase:** Conversation Phase 3M  
**Status:** Architecture specification  
**Scope:** Canonical workflow identity ownership and provenance  
**Runtime impact:** None

## Executive Summary

No workflow writer is ready to become canonical merely because it can populate every field in the canonical event envelope. A canonical writer must receive each identity field from its designated authority and preserve that provenance through every projection.

The current application frequently has usable values for `projectId`, `conversationId`, actor data, and timestamps, but those values often come from active UI selections, localStorage, compatibility fallbacks, or entity IDs promoted into another identity domain. Those are read-time compatibility mechanisms, not creation or persistence authorities.

Before writer migration:

- `projectId` must come from a canonical project aggregate.
- `conversationId` must come from a canonical Conversation relationship.
- Event `id` must be generated once at the workflow command boundary and reused across retries and projections.
- `actor` and `actorRole` must come from authenticated and authorized command context.
- `recordedAt` must be assigned by the authoritative event persistence boundary.

The canonical event envelope must carry these values unchanged. Quotes, messages, appointments, emergency records, UI state, and localStorage may reference canonical identity, but they must not create or silently infer it.

## Governing Principles

1. Identity is created by the owning domain, not by the screen currently handling the workflow.
2. Entity IDs are not interchangeable. A request, quote, conversation, appointment, emergency, message, and project each have separate identity.
3. UI selection state may locate a record but may not establish canonical provenance.
4. localStorage is a compatibility cache and legacy persistence surface, not canonical identity authority.
5. A canonical workflow event must preserve the same identity across persistence, timeline, message, and Work Center projections.
6. Missing canonical identity must block writer migration. It must not trigger title matching, timestamp IDs, or cross-domain ID substitution.
7. Read reconciliation may preserve incomplete legacy events with warnings. Canonical writers may not create new incomplete events.

## Ownership Model

### 1. `projectId`

**Source of truth**

The canonical project aggregate record. This record represents the durable workflow that connects request, information gathering, appointment, quote, active work, completion, and history.

**Creation authority**

The backend project aggregate authority creates `projectId` when a request becomes a durable Meetro project context. A client screen, quote, message, appointment, or emergency record must not mint a project ID independently.

**Persistence authority**

The backend project aggregate store. Client storage may cache or project the ID but cannot validate ownership or replace the aggregate record.

**Propagation rules**

- Propagate the exact `projectId` from the project aggregate into workflow commands and events.
- Carry it explicitly on request, quote, conversation link, schedule, job, completion, and emergency project-link records.
- Preserve it unchanged through message, timeline, Dashboard, Command Center, and Work Center projections.
- Do not replace it with `requestId`, `jobId`, `quoteRequestId`, `conversationId`, `emergencyId`, `postId`, a generic `id`, title, or customer name.
- A legacy entity may be linked to a project only through an explicit project-link record or authoritative backend relation.
- Once assigned, `projectId` is immutable for the life of the workflow event.

**Current implementation conflicts**

- `QuoteBuilder` can derive compatibility project identity from `requestId`.
- Legacy reconciliation accepts several entity IDs as project identity candidates.
- Some event and schedule paths carry a conversation or request ID but no independently proven project ID.
- localStorage records can expose project-like values without provenance.

**Classification:** **MUST FIX BEFORE WRITER MIGRATION**

### 2. `conversationId`

**Source of truth**

The canonical Conversation relationship record linking the participating homeowner and professional within the relevant workflow context.

**Creation authority**

The backend Conversation authority creates the relationship and its ID. Emergency initiation may request a new Conversation relationship, but the emergency record itself does not become the conversation authority.

**Persistence authority**

The backend Conversation registry and message relationship store. `activeConversationId` and conversation-keyed localStorage are navigation/cache projections only.

**Propagation rules**

- Pass `conversationId` explicitly into message and workflow commands.
- Preserve it on quote, appointment, emergency, completion, and project-link records when those records participate in the relationship.
- Do not infer it from `projectId`, `requestId`, quote request identity, message text, route state, or the currently active conversation.
- Do not promote `conversationId` into `projectId`.
- A workflow can have an explicitly linked conversation; the link must be persisted by the owning backend authority.
- Once an event is created, its `conversationId` is immutable.

**Current implementation conflicts**

- `ConversationThread` falls back to `activeConversationId` and a demo identifier.
- Quote flows can source conversation identity from several local or request-level aliases.
- Selected quote request identity can fall back to the conversation ID.
- Some schedule and message projections carry a conversation ID without proof of the related project.

**Classification:** **MUST FIX BEFORE WRITER MIGRATION**

### 3. Event `id`

**Generation authority**

The canonical workflow command boundary generates or obtains one opaque, globally unique event ID before the event is projected. The backend event persistence authority enforces uniqueness.

An approved generator must be collision-resistant, such as a backend-issued ID or a cryptographic UUID. `Date.now()`, array position, display text, title, and content hashes are not canonical event ID generators.

**Idempotency policy**

- One accepted workflow transition has one event ID.
- A retry of the same command must reuse the original event ID or idempotency key and resolve to the same persisted event.
- A distinct workflow transition receives a new event ID, even when its type and payload match an earlier event.
- All projections of one event must preserve the same event ID.
- The command boundary must not regenerate an ID after a partial failure.

**Deduplication policy**

- Canonical deduplication uses exact event ID.
- An approved stable entity/event pair may be used only for legacy read reconciliation when no immutable event ID exists.
- Text, title, customer name, display time, or array position must never be deduplication keys.
- Duplicate canonical IDs with conflicting payload or ownership fields are integrity errors, not records to merge silently.

**Current implementation conflicts**

- Quote workflow cards use timestamp-derived IDs.
- Messages and cards may generate separate timestamp IDs for related projections.
- Reconciliation must currently synthesize fallback IDs for incomplete legacy events.

**Classification:** **MUST FIX BEFORE WRITER MIGRATION**

### 4. `actor`

**Source of truth**

The authenticated principal executing the workflow command. For automated events, the source is a registered, stable system principal.

**Creation authority**

The authentication authority creates human principal identity. The workflow command context resolves the authenticated principal for the event. UI labels and message sender display names do not create actor identity.

**Persistence authority**

The canonical event store persists an immutable actor snapshot or stable principal reference with the event.

**Fallback policy**

- A canonical human event has no anonymous actor fallback.
- A localStorage `userId` is acceptable only when it is demonstrably bound to the active authenticated session; its presence alone is insufficient provenance.
- Viewer-relative sender inference is suitable for display compatibility, not canonical actor ownership.
- Automated events use a documented stable system actor ID.
- Missing actor identity blocks canonical writer migration for that path.
- Legacy reads may expose `null` or a compatibility label and must report the identity warning.

**Current implementation conflicts**

- Quote shadow events read actor identity from localStorage.
- Conversation messages may infer sender information relative to the current viewer.
- Legacy workflow cards often omit actor identity or retain only a role/display label.

**Classification:** **MUST FIX BEFORE WRITER MIGRATION**

### 5. `actorRole`

**Source of truth**

The authorization context for the authenticated principal at command execution time.

**Creation authority**

The backend authorization/membership authority assigns the role. The workflow command boundary snapshots the approved role into the event.

**Persistence authority**

The canonical event store preserves the role snapshot used to authorize the command.

**Fallback policy**

- Canonical roles are `homeowner`, `business`, and `system`.
- The current page, route, selected dashboard, display side, or opposite participant must not determine canonical role.
- Missing or unsupported role blocks canonical writer migration.
- A legacy alias may be normalized for read compatibility only when its mapping is unambiguous.
- Historical events retain the role at event time even if the account role changes later.

**Current implementation conflicts**

- Quote workflow cards hard-code the business role.
- Message role can be inferred from viewer-relative sender logic.
- localStorage and UI context can influence the role without an authorization provenance record.

**Classification:** **MUST FIX BEFORE WRITER MIGRATION**

### 6. `recordedAt`

**Ownership**

The authoritative event persistence boundary owns `recordedAt`. It represents when the canonical event was accepted into the event record, not when a screen rendered it or when a local object happened to be assembled.

**Creation time policy**

- Persist UTC ISO-8601 timestamps.
- Assign `recordedAt` once when the event is accepted by the canonical persistence boundary.
- Preserve it unchanged through all projections.
- Client-observed, domain-occurrence, scheduled, sent, and completed times belong in explicit payload or metadata fields when they differ from persistence time.
- Local command creation time may be transmitted as metadata but must not silently become authoritative `recordedAt`.

**Migration policy**

- A trustworthy legacy timestamp may be preserved as the historical occurrence time in payload or metadata.
- A migrated canonical event receives persistence-owned `recordedAt` and records migration provenance through `migrationSource` and metadata.
- Legacy `createdAt`, `timestamp`, or display time may be normalized for reads, with warning metadata, but does not automatically acquire canonical authority.
- Missing legacy time must remain explicitly unknown; migration must not invent historical precision.

**Current implementation conflicts**

- Quote, card, message, and schedule paths commonly use client time at object assembly.
- Several IDs are derived from the same client timestamp.
- Reconciliation supplies safe read fallbacks for missing timestamps, which must not be mistaken for canonical persistence time.

**Classification:** **MUST FIX BEFORE WRITER MIGRATION**

## Current Identity Sources

| Current source | Identity currently available | Legitimate ownership | Current limitation |
| --- | --- | --- | --- |
| localStorage | Active conversation, selected request, user ID, quote history, schedules, emergency registries | Navigation state and compatibility cache only | No authoritative creation, authentication, uniqueness, or relationship provenance |
| Workflow events | Event-like IDs, event type, timestamps, occasional project/conversation fields | Projection of already-authoritative identity only | Existing events are schema-divergent and frequently incomplete |
| Messages | Message ID, request relation, sender fields, timestamps | Message entity identity; authenticated backend sender when supplied | Message ID is not workflow event ID; request relation is not project identity |
| Quotes | Quote ID, quote request ID, request context, local creation time | Quote and quote-request entity identity | Quote/request IDs are not project IDs; local timestamp IDs are not canonical event IDs |
| Appointments and schedules | Schedule/appointment ID, conversation aliases, customer/job context | Appointment entity identity | Schedule ID, title, and customer identity cannot establish project ownership |
| Emergency workflow | Emergency request ID, emergency conversation ID, participant data | Emergency entity identity and explicitly created Conversation relation | Emergency ID is not project ID; system actor and project link require explicit authority |

## Provenance Requirements

Every future canonical writer must receive an immutable identity context that states both the value and its provenance. At minimum, the command boundary must be able to demonstrate:

| Field | Required provenance |
| --- | --- |
| `projectId` | Canonical project aggregate or explicit authoritative project link |
| `conversationId` | Canonical Conversation relationship record |
| `id` | Approved command/event ID generator plus idempotency context |
| `actor` | Active authenticated principal or registered system principal |
| `actorRole` | Authorized role snapshot for the command |
| `recordedAt` | Canonical event persistence acknowledgement |

A non-empty value without provenance does not satisfy migration readiness.

## Migration Classification

### MUST FIX BEFORE WRITER MIGRATION

- Establish a canonical project aggregate creation and lookup authority.
- Establish a canonical Conversation relationship creation and lookup authority.
- Remove cross-domain ID substitution from every writer selected for migration.
- Supply explicit `projectId` and `conversationId` to the command boundary.
- Establish an approved event ID generator and retry/idempotency contract.
- Ensure one event ID is reused across all projections of the same transition.
- Source actor identity from authenticated command context.
- Source actor role from authorized command context.
- Assign `recordedAt` at the canonical persistence boundary.
- Reject canonical writer execution when required identity provenance is absent.
- Preserve immutable identity fields after event acceptance.

### SHOULD FIX BEFORE WRITER MIGRATION

- Add explicit project links to legacy requests, quotes, conversations, schedules, jobs, completions, and emergency records.
- Define stable system actor identities for automated workflow events.
- Record identity provenance in command metadata for diagnostics and migration audits.
- Add backend uniqueness and conflict reporting for event IDs.
- Separate occurrence time from persistence time in event payload schemas.
- Add reconciliation coverage reports for each migrated writer.
- Define domain payload schemas for quote, appointment, completion, and message events.

### SAFE TO DEFER

- Removing legacy localStorage keys.
- Rewriting historical legacy records in place.
- Switching ConversationThread rendering to the canonical timeline.
- Removing reconciliation aliases used only for legacy reads.
- Redesigning Dashboard, Command Center, Work Center, or Conversation UI.
- Backfilling historical events whose identity cannot be proven.
- Adding global sequence numbers beyond the canonical timestamp and event ID policy.

## Writer-Specific Readiness

### `WORKFLOW_QUOTE_SENT`

Not ready. The current path can assemble all envelope fields, but project identity may be derived from request identity, conversation identity has multiple local fallbacks, actor comes from localStorage, actor role is UI-defined, event ID is timestamp-based, and `recordedAt` is client-assigned.

### `MESSAGE_CREATED`

Not ready. Backend message identity and sender data are promising inputs, but message ID and workflow event ID remain separate concerns. Project linkage, authoritative conversation provenance, actor authorization snapshot, and canonical event persistence ownership must be explicit.

### Appointment Events

Not ready. Appointment and schedule records own their entity identity only. Project and Conversation links require authoritative propagation, and manual scheduling paths must not infer ownership from title or customer data.

### Completion Events

Not ready. Completion identity and project identity must remain distinct, and completion-to-history projection must preserve the project, Conversation, actor, event, and timestamp provenance established by the command.

### Emergency and Work Events

Not ready. Emergency/request/conversation identity domains must remain separate, system actor ownership must be registered, and an explicit project link is required before canonical workflow events can be written.

## Identity Migration Readiness Checklist

A writer may be proposed for migration only when every item below is true:

- [ ] `projectId` is supplied by a canonical project aggregate or authoritative link.
- [ ] `conversationId` is supplied by a canonical Conversation relationship.
- [ ] Neither identity is inferred from the other or from a domain entity ID.
- [ ] The event ID comes from the approved generator.
- [ ] Retry behavior reuses the same event ID or idempotency key.
- [ ] The authenticated principal supplies `actor`.
- [ ] The authorization context supplies `actorRole`.
- [ ] Automated events use a registered system principal and role.
- [ ] The persistence boundary assigns `recordedAt`.
- [ ] Occurrence time is represented separately when necessary.
- [ ] All projections preserve the same canonical identity fields.
- [ ] Missing provenance prevents canonical persistence.
- [ ] Legacy writes remain authoritative until shadow comparison proves parity.
- [ ] Reconciliation reports no conflicting project or Conversation links.
- [ ] Production behavior contains no diagnostic-only logging or shadow persistence.

## Phase 3N: Exact Next Codex Task

**Task:** Conversation Phase 3N - Pure Workflow Identity Context Contract

Create a pure, non-persisting utility and focused tests that represent the ownership rules in this specification without connecting it to any writer.

**Create**

- `src/utils/workflowIdentityContext.js`
- `tests/workflowIdentityContext.test.js`
- `docs/KnowledgeBase/CONVERSATION_PHASE_3N_IDENTITY_CONTEXT_HANDOFF.md`

**Proposed API**

```js
validateWorkflowIdentityContext({
  projectId,
  projectIdentitySource,
  conversationId,
  conversationIdentitySource,
  eventId,
  eventIdSource,
  idempotencyKey,
  actor,
  actorIdentitySource,
  actorRole,
  actorRoleSource,
  recordedAt,
  recordedAtSource,
})
```

**Return**

```js
{
  ready,
  identity,
  provenance,
  blockers,
  warnings,
}
```

**Phase 3N constraints**

- Pure validation only.
- No ID or timestamp generation.
- No localStorage, network, UI, routing, persistence, or writer integration.
- No inference between identity domains.
- Treat non-empty values with unapproved provenance as blockers.
- Add tests for valid ownership, cross-domain substitution, localStorage-only provenance, missing actor authorization, invalid timestamp ownership, and input immutability.

Phase 3N should prove that ownership rules can be expressed and tested before any runtime writer is allowed to consume them.
