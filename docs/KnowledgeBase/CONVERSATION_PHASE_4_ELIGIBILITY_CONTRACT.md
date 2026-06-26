# Conversation Phase 4 Canonical Writer Eligibility Contract

**Scope:** Pure writer-readiness measurement  
**Runtime adoption:** None  
**Persistence:** None  
**Canonical writer migration:** BLOCKED

## Summary

`src/utils/canonicalEventEligibility.js` measures whether metadata from an
existing writer is trustworthy enough for future canonical timeline shadow
parity.

The validator does not:

- create a workflow event;
- write to storage;
- emit browser events;
- call a backend;
- inspect the current viewer;
- resolve Project or Conversation identity;
- approve workflow behavior;
- authorize an actor;
- migrate a writer.

It evaluates evidence supplied by a caller. A field being populated is not
enough. The value must be attributed to its owning authority.

## API

```js
validateCanonicalEventEligibility({
  eventType,
  projectId,
  conversationId,
  actorId,
  actorRole,
  entityId,
  eventId,
  occurredAt,
  recordedAt,
  acknowledgement,
});
```

Return shape:

```js
{
  eligible,
  fieldTrust,
  blockers,
  warnings,
  shadowRisk,
}
```

## Evidence Values

Identity and timestamp fields accept either a plain value or an evidence
object:

```js
projectId: {
  value: "project-1",
  authority: "project-aggregate",
}
```

A plain scalar preserves the requested input shape but has no declared
authority. It is therefore classified as `INFERRED` and cannot satisfy a
required identity field.

An evidence object may contain:

| Field | Purpose |
| --- | --- |
| `value` | Candidate field value |
| `authority` | Source responsible for the value |
| `provenance` | Alias for `authority` |
| `source` | Compatibility alias for `authority` |
| `conflicting` | Explicitly marks conflicting evidence |
| `classification` | May declare `CONFLICTING` |

The validator does not look up, repair, or infer missing evidence.

## Field Trust

| Trust value | Meaning |
| --- | --- |
| `AUTHORITATIVE` | Value is present and attributed to an approved owner |
| `INFERRED` | Value exists but comes from compatibility, request, generic, legacy, or unspecified provenance |
| `FALLBACK` | Value comes from UI, route, local selection, local storage, current viewer, or client clock |
| `CONFLICTING` | Supplied evidence disagrees internally or with acknowledgement |
| `MISSING` | No usable value exists |

`fieldTrust` reports:

- `eventType`;
- `projectId`;
- `conversationId`;
- `actorId`;
- `actorRole`;
- `entityId`;
- `eventId`;
- `occurredAt`;
- `recordedAt`;
- `acknowledgement`.

## Eligibility Rules

`eligible` requires all of the following:

1. `eventType` is in the canonical registry and is not
   `UNKNOWN_WORKFLOW_EVENT`.
2. `projectId` is explicit and supplied by Project authority.
3. `conversationId` is explicit and supplied by Conversation authority.
4. `actorId` is supplied by authentication authority.
5. `actorRole` is supplied by authorization authority.
6. `entityId` identifies the stable domain entity involved in the event.
7. `eventId` is non-generic and supplied by canonical, idempotency, or backend
   event authority.
8. Project and Conversation mappings do not conflict with acknowledgement.
9. Completion events have an explicitly approved completion-finality policy.

These requirements measure eligibility for future shadow parity only. They do
not prove that a writer is safe to migrate.

## Approved Authority Vocabulary

### Project

- `canonical-event`
- `project-aggregate`
- `authoritative-project-link`
- `backend-acknowledgement`

`request-id`, `conversation-id`, `generic-id`, compatibility resolution, and
reconciliation output remain inferred.

### Conversation

- `canonical-event`
- `conversation-authority`
- `authoritative-conversation-link`
- `backend-acknowledgement`

Route state, active selection, quote-request substitution, and local storage
are not Conversation authority.

### Actor

- `authentication-context`
- `backend-acknowledgement`
- `registered-system-principal`

Display names, sender labels, current viewer, and local user values are not
authenticated actor evidence.

### Actor Role

- `authorization-context`
- `backend-acknowledgement`
- `registered-system-principal`

Current account mode, page visibility, sender-role display fields, and return
page are not authorization evidence.

### Entity

- `canonical-event`
- `domain-aggregate`
- `quote-authority`
- `scheduling-authority`
- `message-persistence`
- `project-aggregate`
- `completion-authority`
- `backend-acknowledgement`

The entity ID is separate from Project, Conversation, and event identity. For
example:

- Quote Sent uses `quoteId`;
- Appointment Created uses `appointmentId`;
- Message Created uses backend `messageId`;
- Completion Submitted uses `completionId`.

### Event ID

- `canonical-event`
- `backend-event-store`
- `idempotency-authority`
- `backend-acknowledgement`

Generic `id`, timestamps, UI card IDs, and local random IDs are not canonical
event authority merely because they are unique on one device.

### Timestamps

- `occurredAt` may be authoritative when supplied by the domain owner or
  backend acknowledgement.
- `recordedAt` is authoritative only from event persistence or backend
  acknowledgement.
- `client-clock` is a fallback and produces a warning.

## Acknowledgement Contract

The optional `acknowledgement` object supports:

```js
{
  acknowledged: true,
  authority: "backend-event-store",
  projectId,
  conversationId,
  actorId,
  actorRole,
  entityId,
  eventId,
  recordedAt,
  completionPolicyApproved,
}
```

Acknowledgement may also use `ok: true` or
`status: "acknowledged"`.

Backend acknowledgement is not required for measurement eligibility because
Phase 4 must characterize client-only writers. Missing acknowledgement produces
a warning and raises shadow risk to `MEDIUM`.

When acknowledgement is present:

- its authority must be `backend-event-store` to be authoritative;
- conflicting Project, Conversation, actor, role, entity, event, or timestamp
  values are reported;
- acknowledgement cannot repair an explicitly conflicting field;
- backend-correlated values may establish authority when they match.

## Blockers

The validator blocks eligibility for:

| Blocker | Example code |
| --- | --- |
| Missing or unknown canonical event type | `unknown-event-type` |
| Missing Project identity | `missing-projectId` |
| Request-derived Project identity | `inferred-project` |
| Conflicting Project mapping | `conflicting-projectId` |
| Missing or inferred Conversation identity | `missing-conversationId`, `inferred-conversation` |
| Inferred actor | `inferred-actor` |
| Current-viewer or UI-derived role | `inferred-actor-role` |
| Missing stable entity identity | `missing-entityId` |
| Untrusted entity identity | `unstable-entity-id` |
| Missing event identity | `missing-eventId` |
| Generic or inferred event identity | `generic-event-id` |
| Completion finality not approved | `completion-policy-unresolved` |

Conflicting acknowledgement values are blockers for required identity fields.

## Warnings

Warnings do not make a metadata set ineligible by themselves:

| Warning | Meaning |
| --- | --- |
| `client-only-timestamp` | Occurrence or recording time relies on a client clock |
| `missing-recorded-at` | Backend persistence time is unavailable |
| `conflicting-recorded-at` | Timestamp is invalid or disagrees with acknowledgement |
| `invalid-occurred-at` | Occurrence time is invalid or conflicting |
| `missing-backend-acknowledgement` | No backend acknowledgement is available |
| `untrusted-backend-acknowledgement` | An acknowledgement exists without backend event-store authority |

This distinction allows Phase 4 to measure a structurally trustworthy
client-side candidate while keeping acknowledgement gaps visible.

## Shadow Risk

| Risk | Rule |
| --- | --- |
| `LOW` | Eligible with no warnings |
| `MEDIUM` | Eligible with one or more warnings |
| `HIGH` | One or more blockers |

`shadowRisk` is not writer-migration risk. It measures whether a proposed
metadata-only shadow comparison is trustworthy enough to run in a future
development-only harness.

## Required Fixture Results

| Fixture | Expected result |
| --- | --- |
| Eligible Quote Sent | Eligible, `LOW` |
| Request-derived Project | Blocked, `HIGH` |
| Current Viewer Role | Blocked, `HIGH` |
| Generic Event ID | Blocked, `HIGH` |
| Client Timestamp | Eligible with warning, `MEDIUM` |
| Missing Backend Acknowledgement | Eligible with warning, `MEDIUM` |
| Conflicting Project Mapping | Blocked, `HIGH` |
| Eligible Backend Message | Eligible, `LOW` |
| Completion Event | Blocked until finality policy is approved |
| Unknown Event Type | Blocked, `HIGH` |

Additional tests verify missing `recordedAt`, deterministic output, no input
mutation, and no access to `window` or `localStorage`.

## Eligibility Rules Discovered

1. A canonical-looking value without ownership evidence remains inferred.
2. Request identity cannot satisfy Project identity.
3. Active Conversation selection cannot satisfy Conversation authority.
4. Current-viewer role cannot satisfy authorization provenance.
5. Stable domain entity identity and canonical event identity are separate
   requirements.
6. Backend acknowledgement is valuable but does not replace explicit,
   non-conflicting field provenance.
7. A client occurrence timestamp can support comparison while remaining a
   warning.
8. `recordedAt` must remain visibly missing until backend persistence supplies
   it.
9. Completion cannot be treated like an ordinary approved event type while
   finality and Closure policy are unresolved.
10. Eligibility for shadow comparison is intentionally weaker than eligibility
    for canonical writer authority.

## Current Writer Implications

Based on the Phase 3 audit:

| Writer | Expected eligibility |
| --- | --- |
| Quote Sent with authoritative Project/Conversation/actor/event evidence | Potentially eligible |
| Current QuoteBuilder shadow using local user and request-derived Project | Blocked |
| Backend Message with complete authoritative acknowledgement | Eligible |
| Current backend message response containing only message ID | Blocked or warning-heavy depending on supplied identities |
| Work Center appointment with authoritative Project link and actor | Potentially eligible |
| Current viewer-derived appointment actor | Blocked |
| Quote decisions | Blocked by actor, event type, and acknowledgement gaps |
| Job records | Blocked by Project, actor, entity/event ownership, and type policy |
| Completion | Blocked by identity and finality/Closure policy |
| Inbox registry and archive state | Not workflow event candidates |

## Recommended Conversation Phase 5

**Conversation Phase 5 - Representative Writer Eligibility Characterization**

Phase 5 should remain pure and non-persisting.

It should create sanitized adapters or fixtures for the real writer metadata
identified in Phase 3:

1. QuoteBuilder Quote Sent;
2. ConversationThread backend Message;
3. ConversationThread materials card;
4. ConversationThread schedule creation;
5. ContractorDashboard manual schedule;
6. ContractorDashboard timeline append;
7. WorkflowQuoteSentCard decisions;
8. CompletionSheet completion;
9. ProjectDetails work start and completion;
10. job-record saves.

The characterization report should return:

```text
{
  writerCount,
  eligibleCount,
  warningOnlyCount,
  blockedCount,
  riskDistribution,
  blockerFrequency,
  warningFrequency,
  fieldTrustCoverage,
  findings,
}
```

Phase 5 must not import the validator into runtime files, log payload content,
create shadow events, write storage, or approve product decisions.

## Final Decision

The eligibility contract is ready for pure writer characterization.

It is not approval to add shadow writes. Runtime Phase 5 adoption remains
blocked until representative current writers are measured and the Project,
Conversation, actor, acknowledgement, event-registry, Completion, and Closure
authority decisions are resolved.
