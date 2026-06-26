# Workflow Identity Resolver Validation

**Phase:** Conversation Phase 3O  
**Status:** Validation only  
**Runtime adoption:** None  
**Validated utility:** `src/utils/workflowIdentityResolver.js`

## Executive Summary

`workflowIdentityResolver.js` is safe as a pure, read-only identity shape resolver. It is deterministic, does not mutate inputs, does not access storage, does not infer between identity domains, and preserves existing event identity when an owner object conflicts.

It is not yet safe to authorize workflow writer migration.

The resolver answers whether five canonical fields are present and structurally valid. It does not prove that:

- `projectId` came from a canonical project aggregate.
- `conversationId` came from the authoritative Conversation relationship.
- `actor` came from the authenticated principal.
- `actorRole` came from authorization context.
- `recordedAt` came from the persistence boundary.

Current Meetro records often contain values that can be adapted into the resolver's input shape, but many originate from localStorage, active UI selection, compatibility aliases, cross-domain fallbacks, or client time. A caller could supply those values under the approved property names and receive a high completeness score without satisfying the ownership specification.

**Validation decision:** the resolver is ready for read-only gap reporting and controlled shadow diagnostics. It is **not ready** to serve as a writer migration gate until provenance is represented and validated.

## Validation Method

The validation compared the resolver's accepted input contract against current structures created or consumed by:

- `QuoteBuilder.sendQuote`
- ConversationThread appointment and job-record paths
- ContractorDashboard manual appointment and visit-outcome paths
- CompletionSheet completion and closeout paths
- Conversation timeline reconciliation
- The strict canonical event factory

No runtime data was changed and the resolver was not adopted by any workflow.

## Resolver Behavior Confirmed

The resolver currently:

- Preserves `event.projectId`, `event.conversationId`, `event.actor`, `event.actorRole`, and `event.recordedAt`.
- Fills missing `projectId` only from `project.projectId`.
- Fills missing `conversationId` only from `conversation.conversationId`.
- Fills missing actor fields only from `actorContext`.
- Never fills `recordedAt`; it accepts only `event.recordedAt`.
- Reports conflicts between an event value and its matching owner.
- Rejects aliases by omission rather than normalizing them.
- Scores five fields at 20 points each.

These rules correctly prevent direct cross-domain inference. They do not validate whether the supplied `event`, `project`, `conversation`, or `actorContext` objects are authoritative.

## Field Measurements

### `projectId` Resolution

#### High-confidence paths

- An existing canonical event with an immutable `projectId`.
- A project owner object whose `projectId` was loaded from the canonical project aggregate.
- An explicit authoritative project-link record supplied as the project owner.

No currently reviewed client-only writer proves that provenance by itself.

#### Low-confidence paths

- `QuoteBuilder` supplies `request.projectId` when present, but the current record has no ownership marker proving backend project aggregate authority.
- Quote shadow logic uses `getProjectIdentity`, which can promote `requestId` into project identity.
- ContractorDashboard schedule linking can derive identity from a selected request.
- Timeline reconciliation can normalize request, job, quote-request, conversation, emergency, post, or generic IDs through the legacy project compatibility layer.

These values may be useful for reconciliation, but they must not be presented to the resolver as authoritative `project.projectId` without provenance validation.

#### Missing source data

- ConversationThread chat-created schedules do not include `projectId`.
- Manual schedule records commonly lack `projectId`.
- Completion records do not include `projectId`.
- Legacy quote cards do not carry `projectId`.

#### Conflicting source data

- Quote identity can be represented by explicit `projectId`, `requestId`, active quote request ID, or a timestamp fallback.
- Appointment outcomes can use schedule ID as request identity.
- Job records can fall back from `jobId` to `conversationId`.
- Reconciliation may preserve a value that differs from a later explicit project owner.

The resolver will report a conflict only after both values are supplied under canonical field names. It cannot identify that a single non-empty `projectId` was originally derived from the wrong identity domain.

**Assessment:** **BLOCKED**

### `conversationId` Resolution

#### High-confidence paths

- An immutable event carrying a backend-issued Conversation relationship ID.
- A Conversation owner object loaded from an authoritative Conversation registry.

The current internal quote and chat appointment paths often have an explicit conversation token, making this the strongest current field structurally.

#### Low-confidence paths

- `QuoteBuilder` selects the first value from revised quote context, request aliases, project conversation aliases, or active conversation state.
- CompletionSheet selects from active work snapshot and several localStorage keys.
- ContractorDashboard manual scheduling selects active work or active conversation state.
- ConversationThread operates on the active thread token and stores records under a conversation-keyed localStorage namespace.
- Some visit outcomes fall back from conversation identity to `requestId`.

These values can identify the current local thread, but the client does not establish authoritative relationship provenance.

#### Missing source data

- External quotes have no internal Conversation identity.
- Some manual schedules are created without an active conversation.
- Legacy cards may rely on their storage key and omit `conversationId` from the record.

#### Conflicting source data

- A quote can expose several conversation aliases with no conflict report.
- Completion can choose among active work, invoice, and active Conversation IDs.
- Schedule records may contain both `conversationId` and `projectConversationId`.
- Request IDs are used as Conversation fallbacks in some appointment paths.

**Assessment:** **PARTIAL**

### `actor` Resolution

#### High-confidence paths

- `actorContext.actor` supplied from an authenticated session principal.
- An immutable canonical event whose actor was persisted by the event authority.
- A registered stable system principal for automated events.

No reviewed client writer currently demonstrates this complete path.

#### Low-confidence paths

- Quote shadow comparison reads `localStorage.userId`.
- Legacy cards carry display sender values such as `Business` or role-like sender strings.
- Message normalization can derive actor-like data from legacy sender aliases.
- Conversation display can infer sender meaning relative to the current viewer.

#### Missing source data

- Quote, appointment, and completion legacy cards commonly omit a stable actor ID.
- Manual schedules do not store actor identity.
- Completion records do not store actor identity.
- System-generated workflow events do not have a registered system principal.

#### Conflicting source data

- Display sender, sender ID, localStorage user ID, and viewer-relative role may disagree.
- The resolver preserves `event.actor` over `actorContext.actor`, even when the event value has no proven authentication provenance.

**Assessment:** **BLOCKED**

### `actorRole` Resolution

#### High-confidence paths

- `actorContext.actorRole` supplied from the authorization context at command execution.
- A canonical persisted event with the historical authorized role snapshot.

#### Low-confidence paths

- QuoteBuilder hard-codes `business`.
- Appointment and completion cards store `role` or `senderRole` as UI/legacy aliases.
- Reconciliation can normalize legacy role aliases into `actorRole`.
- Conversation sender role may be interpreted relative to the viewer.

The literal value `business` is structurally valid, but current paths do not prove it came from authorization authority.

#### Missing source data

- Some schedule and workflow records omit all role fields.
- Completion records omit actor role.
- Automated events lack an approved system actor/role context.

#### Conflicting source data

- `role`, `senderRole`, user account type, and current UI context may differ.
- The resolver does not distinguish an authorization-sourced `business` value from a hard-coded `business` value.

**Assessment:** **PARTIAL**

### `recordedAt` Resolution

#### High-confidence paths

- A canonical event containing UTC ISO-8601 `recordedAt` assigned by the accepted event persistence boundary.

No reviewed current writer establishes this boundary.

#### Low-confidence paths

- Quote cards use client-created `createdAt`.
- Appointments use local `createdAt` and `updatedAt`.
- Completion uses local `completedAt`, then copies it into closeout `createdAt`.
- Reconciliation accepts legacy timestamp aliases for read compatibility.

These timestamps are useful occurrence times. They are not persistence acknowledgements.

#### Missing source data

- No current writer returns a persistence-owned event timestamp.
- Raw legacy records generally use `createdAt`, `completedAt`, `savedAt`, or `timestamp`, not canonical `recordedAt`.
- The resolver intentionally does not fall back to these aliases.

#### Conflicting source data

- One transition can have quote `sentAt`, quote `createdAt`, card `createdAt`, homeowner timeline `createdAt`, and storage completion time.
- Completion can expose `completedAt`, `archivedAt`, `savedAt`, and `updatedAt`.
- Reconciliation can normalize one legacy value into `recordedAt`, but that conversion does not grant persistence authority.

**Assessment:** **BLOCKED**

## High-Confidence Resolution Paths

The following resolver inputs are safe:

| Resolver input | Required condition |
| --- | --- |
| `event.projectId` | The event is already canonical and immutable. |
| `project.projectId` | The project object came from the canonical aggregate or authoritative project link. |
| `event.conversationId` | The event is already canonical and immutable. |
| `conversation.conversationId` | The Conversation object came from the relationship authority. |
| `event.actor` | The event was persisted with an authenticated principal snapshot. |
| `actorContext.actor` | The context came from the active authenticated principal. |
| `event.actorRole` | The event was persisted with an authorization snapshot. |
| `actorContext.actorRole` | The context came from current command authorization. |
| `event.recordedAt` | The event persistence boundary assigned the timestamp. |

Current client records do not carry enough provenance metadata to prove these conditions consistently.

## Low-Confidence Resolution Paths

The following must remain read-only compatibility inputs:

- Request ID promoted to project ID.
- Generic `id` promoted to project ID.
- Conversation ID promoted to project or job identity.
- Active UI selection used as Conversation authority.
- localStorage user ID used without authenticated-session proof.
- Hard-coded or viewer-derived actor role.
- `createdAt`, `sentAt`, `completedAt`, `savedAt`, or `updatedAt` promoted to persistence-owned `recordedAt`.
- Reconciliation output treated as proof of canonical provenance.

## Completeness Score Ranges

The current score is a structural coverage metric:

| Score | Structural meaning | Migration meaning |
| --- | --- | --- |
| `0` | No canonical fields resolved | Blocked |
| `20` | One field resolved | Blocked |
| `40` | Two fields resolved | Blocked |
| `60` | Three fields resolved | Partial diagnostics only |
| `80` | Four fields resolved | Still blocked by the missing field and provenance |
| `100` | All five values are structurally valid | Not migration-ready unless all five sources are independently proven |

### Expected current raw-record ranges

| Workflow shape | Expected score | Reason |
| --- | --- | --- |
| Legacy quote card | `0` | Uses request ID, role aliases, and `createdAt`; omits canonical identity fields. |
| Quote shadow factory input | Up to `100` | Fields are adapted into canonical names, but project, actor, and timestamp provenance remain unsafe. |
| Chat schedule record | `20` | Explicit `conversationId`; no canonical project, actor, role, or `recordedAt`. |
| Chat schedule message | `0` | Conversation is nested in schedule; role and time are aliases. |
| Work Center schedule message | `20` | Explicit `conversationId`; remaining fields are absent or aliases. |
| Completion record | `20` | Explicit `conversationId`; no project, actor, role, or `recordedAt`. |
| Completion closeout card | `0` | Uses request fallback, role aliases, nested completion, and `createdAt`. |
| Reconciled legacy event | `20–100` | Canonical-shaped output can improve the score, but aliases and compatibility identity do not prove authority. |

This demonstrates why completeness must not be used as a boolean migration gate.

## Identity Readiness Matrix

| Field | Readiness | Notes |
| --- | --- | --- |
| `projectId` | **BLOCKED** | Most current records omit it or derive it from request, schedule, conversation, job, or generic identity. No client path proves canonical project aggregate provenance. |
| `conversationId` | **PARTIAL** | Frequently available in internal conversation workflows, but often sourced from active/local state or aliases rather than a proven Conversation authority. |
| `actor` | **BLOCKED** | Stable authenticated principal identity is absent from most records; localStorage and display sender values are insufficient. |
| `actorRole` | **PARTIAL** | Approved vocabulary is commonly available, but values are hard-coded, aliased, or viewer-derived rather than authorization-sourced. |
| `recordedAt` | **BLOCKED** | Current writers provide client occurrence timestamps, not persistence-owned event timestamps. |

## Conflicting Source Data Summary

| Workflow | Primary conflict |
| --- | --- |
| Quote | Explicit project versus request-derived project; several Conversation aliases; local actor; multiple client timestamps |
| Appointment | Schedule/request identity substitution; active Conversation fallback; role aliases; schedule time versus event recording time |
| Completion | Schedule, emergency, job, request, and Conversation identities are adjacent but not canonically linked; multiple completion/archive timestamps |
| Conversation reconciliation | Canonical-shaped output may contain compatibility-derived identity and timestamp aliases |

## Quote Writer Migration Blockers

`WORKFLOW_QUOTE_SENT` remains **HIGH risk** and shadow-only.

Blocking conditions:

- `projectId` may still be derived from `requestId`, generic ID, or timestamp-backed request identity.
- `conversationId` has several precedence aliases and is absent for external quotes.
- `actor` comes from localStorage rather than authenticated command context.
- `actorRole` is hard-coded rather than authorization-sourced.
- `recordedAt` is the client-created card timestamp, not persistence acknowledgement.
- Canonical event ID generation and idempotency remain unresolved.
- One canonical event ID is not shared across quote history, homeowner timeline, and Conversation projections.
- Canonical persistence authority is still undefined.
- The resolver cannot distinguish safe canonical values from unsafe adapted values.

## Appointment Writer Migration Blockers

Appointment writer migration is blocked by:

- Manual and chat schedules commonly lack `projectId`.
- Schedule ID or request ID can be used as workflow identity.
- Conversation identity can come from active local state or request fallback.
- Appointment records do not preserve authenticated actor identity.
- Role is stored as a display/legacy alias or omitted.
- `createdAt` and `updatedAt` are client occurrence times, not canonical `recordedAt`.
- Schedule record and Conversation card use separate timestamp-based IDs.
- There is no approved command idempotency contract joining schedule and message projections.
- Manual customers have no guaranteed project aggregate before scheduling.

## Completion Writer Migration Blockers

Completion writer migration is blocked by:

- Completion records do not carry canonical `projectId`.
- Conversation identity is selected from multiple local snapshots and keys.
- Request identity can fall back to `conversationId`.
- Completion, schedule, emergency, job, and project identities are not joined by one authoritative link.
- Actor identity and authorization role are absent from the completion record.
- `completedAt` is a client domain timestamp, not persistence-owned `recordedAt`.
- Completion record and closeout card use different timestamp-derived IDs.
- Completion-to-history projections do not share one canonical event ID.
- Emergency completion needs explicit project linkage and a stable system/human actor policy.

## Resolver Migration-Safety Decision

### Safe now

- Read-only field coverage reports.
- Shadow comparison diagnostics.
- Conflict reporting when canonical event and owner values are both supplied.
- Unit-tested structural normalization before factory input.

### Unsafe now

- Treating `completenessScore === 100` as migration readiness.
- Passing reconciliation output directly into canonical writers.
- Treating owner object property names as proof of ownership.
- Filling actor context from localStorage without session provenance.
- Treating a normalized legacy timestamp as persistence-owned `recordedAt`.
- Blocking or allowing production workflow behavior based on resolver output.

## Phase 3P Recommendation

**Task:** Conversation Phase 3P - Workflow Identity Provenance Contract

Phase 3P should remain pure and non-adopted. It should add an explicit provenance validation layer rather than expanding alias resolution.

Create:

- `src/utils/workflowIdentityProvenance.js`
- `tests/workflowIdentityProvenance.test.js`
- `docs/KnowledgeBase/WORKFLOW_IDENTITY_PROVENANCE_CONTRACT.md`

Proposed API:

```js
validateWorkflowIdentityProvenance({
  resolvedIdentity,
  provenance: {
    projectId: { authority, recordId },
    conversationId: { authority, recordId },
    actor: { authority, sessionId },
    actorRole: { authority, authorizationId },
    recordedAt: { authority, persistenceId },
  },
})
```

Required result:

```js
{
  ready,
  fieldReadiness,
  blockers,
  warnings,
}
```

Phase 3P must:

- Define approved authority identifiers for each field.
- Reject localStorage, UI selection, display labels, compatibility aliases, and cross-domain IDs as canonical provenance.
- Keep completeness separate from provenance readiness.
- Require matching project and Conversation authority records.
- Require authenticated actor and authorized role context.
- Require persistence acknowledgement for `recordedAt`.
- Remain pure, read-only, deterministic, and unconnected to runtime writers.

Only after this contract passes should a later phase evaluate resolver plus provenance validation at a shadow writer boundary.
