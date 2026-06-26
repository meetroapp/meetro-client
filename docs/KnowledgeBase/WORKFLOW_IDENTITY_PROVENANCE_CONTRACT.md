# Workflow Identity Provenance Contract

**Phase:** Conversation Phase 3P  
**Status:** Pure validation contract  
**Runtime adoption:** None

## Purpose

`workflowIdentityProvenance.js` determines whether resolved identity is trusted enough for a future writer migration. It does not resolve identity, generate values, access storage, persist events, or change workflow behavior.

The resolver and provenance validator answer different questions:

- The resolver asks: “Is a structurally valid value available?”
- The provenance validator asks: “Did that value come from the authority that owns it?”

Both must pass before a future writer can be considered migration-ready.

## Why Completeness Is Not Enough

A resolver score of 100 means five fields are present and structurally valid. It does not prove their origin.

For example, a complete identity can still contain:

- A request ID presented as `projectId`.
- An active local thread token presented as `conversationId`.
- A localStorage user ID presented as `actor`.
- A hard-coded UI role presented as `actorRole`.
- A client `createdAt` timestamp presented as `recordedAt`.

These values satisfy shape requirements but violate ownership. The provenance contract therefore requires field-specific authority evidence.

## Provenance Evidence Shape

Each owning source may declare:

```js
{
  identityProvenance: {
    projectId: {
      authority: "project-aggregate",
      value: "project-1",
    },
  },
}
```

The `value` is optional, but when supplied it must equal the resolved value. A mismatch is `CONFLICTING`.

The validator reads evidence from the source selected by `resolvedIdentity.resolutionSource`:

| Field | Approved source object |
| --- | --- |
| `projectId` | `event` or `project` |
| `conversationId` | `event` or `conversation` |
| `actor` | `event` or `actorContext` |
| `actorRole` | `event` or `actorContext` |
| `recordedAt` | `event` only |

## Field Trust Rules

### `AUTHORITATIVE`

The value exists, does not conflict, and has an approved field-specific authority.

Approved authorities:

| Field | Authorities |
| --- | --- |
| `projectId` | `canonical-event`, `project-aggregate`, `authoritative-project-link` |
| `conversationId` | `canonical-event`, `conversation-authority`, `authoritative-conversation-link` |
| `actor` | `canonical-event`, `authentication-context`, `registered-system-principal` |
| `actorRole` | `canonical-event`, `authorization-context`, `registered-system-principal` |
| `recordedAt` | `canonical-event`, `event-persistence` |

### `INFERRED`

The value exists, but no approved authority proves it. Missing provenance evidence is intentionally classified as inferred rather than authoritative.

Known inferred authorities include:

- `compatibility-layer`
- `request-id`
- `conversation-id`
- `generic-id`
- `legacy-alias`
- `reconciliation`

### `FALLBACK`

The value exists because a convenience or UI source supplied it.

Known fallback authorities include:

- `local-storage`
- `active-selection`
- `route-state`
- `ui-context`
- `display-value`
- `client-clock`
- `timestamp-fallback`

### `CONFLICTING`

The resolved value conflicts with:

- Its owning source object's canonical field.
- The value declared in provenance evidence.
- A conflict already reported by `workflowIdentityResolver`.

Conflict always blocks migration and is never resolved silently.

### `MISSING`

No resolved value exists for the required field.

## Migration Blocker Rules

Writer identity is trusted only when all five fields are `AUTHORITATIVE`.

Every `INFERRED`, `FALLBACK`, `CONFLICTING`, or `MISSING` field appears in `blockers`. `INFERRED` findings also appear in `warnings` because they may be useful for reconciliation, but they still block migration.

Migration risk:

| Risk | Rule |
| --- | --- |
| `LOW` | All fields are authoritative. |
| `MEDIUM` | At least one field is inferred, with no fallback, conflict, or missing field. |
| `HIGH` | At least one field is fallback, conflicting, or missing. |

`MEDIUM` does not permit writer migration. It distinguishes structurally complete but unproven identity from more severe gaps.

## Quote Writer Support

The contract will classify current quote identity accurately:

- Request-derived project identity: `INFERRED`
- Active or aliased Conversation identity: `FALLBACK` or `INFERRED`
- localStorage actor: `FALLBACK`
- Hard-coded business role: `FALLBACK`
- Client card timestamp: `FALLBACK`

This keeps `WORKFLOW_QUOTE_SENT` shadow-only until project, Conversation, authentication, authorization, and persistence authorities are explicit.

## Appointment Writer Support

The contract blocks:

- Schedule or request identity presented as project identity.
- Active Conversation state presented as relationship authority.
- Display sender or UI role presented as actor context.
- Schedule `createdAt` presented as event persistence time.

Manual customers require an authoritative project and Conversation link before appointment writer migration.

## Completion Writer Support

The contract keeps completion identity separate from project identity and blocks:

- Completion, schedule, emergency, job, or Conversation IDs presented as `projectId`.
- Local completion navigation state presented as Conversation authority.
- Missing authenticated actor and authorization context.
- `completedAt` presented as persistence-owned `recordedAt`.

Completion-to-history projections must share authoritative identity before canonical completion events can replace legacy writes.

## Exact Phase 3Q Recommendation

**Task:** Conversation Phase 3Q - Workflow Identity Provenance Scenario Audit

Create read-only scenario fixtures and reporting that run the resolver and provenance validator together against representative quote, appointment, completion, message, and emergency record shapes.

Create:

- `src/utils/workflowIdentityReadinessAudit.js`
- `tests/workflowIdentityReadinessAudit.test.js`
- `docs/KnowledgeBase/WORKFLOW_IDENTITY_READINESS_AUDIT.md`

Phase 3Q should:

- Remain pure and disconnected from runtime writers.
- Accept supplied records only; do not read localStorage.
- Return resolver completeness and provenance trust separately.
- Group blockers by workflow and field.
- Report whether each scenario is `LOW`, `MEDIUM`, or `HIGH` risk.
- Prove that complete-but-untrusted scenarios remain blocked.
- Identify the first workflow boundary capable of producing all-authoritative identity.

Do not add runtime shadow wiring in Phase 3Q. Runtime adoption should be considered only after representative scenarios demonstrate authoritative provenance.
