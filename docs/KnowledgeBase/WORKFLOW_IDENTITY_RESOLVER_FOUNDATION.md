# Workflow Identity Resolver Foundation

**Phase:** Conversation Phase 3N  
**Status:** Foundation only  
**Runtime adoption:** None

## Purpose

`src/utils/workflowIdentityResolver.js` is the first executable form of the workflow identity ownership specification. It resolves the five identity fields needed by future canonical workflow events without reading storage, changing records, generating identity, or selecting persistence authority.

The resolver is deliberately not connected to `workflowEventFactory`, reconciliation, ConversationThread, or any writer in this phase.

## Ownership Implementation

The resolver accepts:

```js
resolveWorkflowIdentity({
  event,
  project,
  conversation,
  actorContext,
})
```

It returns:

```js
{
  projectId,
  conversationId,
  actor,
  actorRole,
  recordedAt,
  resolutionSource,
  completenessScore,
  warnings,
}
```

Ownership is implemented as follows:

| Field | Existing value | Approved resolution owner |
| --- | --- | --- |
| `projectId` | `event.projectId` | `project.projectId` |
| `conversationId` | `event.conversationId` | `conversation.conversationId` |
| `actor` | `event.actor` | `actorContext.actor` |
| `actorRole` | `event.actorRole` | `actorContext.actorRole` |
| `recordedAt` | `event.recordedAt` | No fallback; persistence must supply it |

An existing event value is preserved because event identity is immutable. When its matching owner supplies a different value, the resolver reports a conflict rather than silently replacing the event value.

The resolver does not read aliases such as `requestId`, generic `id`, `userId`, `role`, `createdAt`, or `timestamp`. It also does not resolve project identity from Conversation data or Conversation identity from project data.

## Completeness Scoring

The score is deterministic and ranges from 0 to 100. Each valid field contributes 20 points:

- `projectId`: non-empty canonical value
- `conversationId`: non-empty canonical value
- `actor`: non-empty and not `unknown`
- `actorRole`: one of `homeowner`, `business`, or `system`
- `recordedAt`: normalized UTC ISO-8601 timestamp

The score measures field completeness only. It does not certify backend provenance or authorize persistence. Future command validation must still verify that each supplied owner is itself authoritative.

## Unresolved Identity Handling

Missing values remain empty and receive structured warnings. The resolver never:

- Generates IDs.
- Invents timestamps.
- Promotes request, quote, appointment, emergency, message, or generic IDs.
- Reads localStorage or browser globals.
- Mutates source objects.
- Persists or emits a result.

Invalid actor, role, or timestamp values are preserved for diagnostics but do not contribute to completeness.

## Future Migration Usage

Future phases may evaluate the resolver for:

1. Preparing identity input for `workflowEventFactory`.
2. Reporting reconciliation gaps consistently.
3. Comparing writer context against immutable event identity.
4. Blocking canonical writer migration when required fields remain unresolved.

Before runtime adoption, a later phase must add explicit provenance validation for the project aggregate, Conversation relationship, authenticated principal, authorized role, and persistence acknowledgement. No existing workflow should consume this resolver until that validation contract is approved and tested.

## Verification Scope

Focused tests cover owner-specific resolution, missing identity, cross-domain isolation, conflict reporting, completeness scoring, deterministic output, input immutability, and absence of browser/storage access.
