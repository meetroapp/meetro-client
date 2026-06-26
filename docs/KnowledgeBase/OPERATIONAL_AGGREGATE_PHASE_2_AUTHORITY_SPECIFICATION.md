# Operational Aggregate Phase 2 - Authority Specification

## Status

- Knowledge Base specification only
- No runtime, UI, routing, or storage adoption
- No persistence schema or migration
- No replacement of legacy identifiers

## 1. Executive Summary

An **Operational Aggregate** is Meetro's authoritative lifecycle context for a
classified unit of work.

It owns:

- stable work identity;
- operational type;
- lifecycle state;
- participant and source-request references;
- references to Quotes, Schedules, Conversations, Completion, Closure, and
  History.

It does not absorb the authority of those related domains.

The governing model is:

```text
Intent
  -> Service Request
  -> Information Gathering
  -> Classification
  -> Operational Aggregate
  -> Work
  -> Completion
  -> Closure
  -> History
  -> Relationship
```

A Service Request may produce zero, one, or multiple Operational Aggregates.
Several Service Requests may also be explicitly consolidated into one
aggregate by future approved authority.

Classification may recommend an aggregate type. It does not create aggregate
identity.

## 2. Authority Definitions

Authority means responsibility for creating, validating, and preserving a
specific kind of domain truth.

| Domain | Authority |
| --- | --- |
| Service Request | Intake authority |
| Classification | Decision-support authority |
| Operational Aggregate | Work lifecycle authority |
| Conversation | Communication authority |
| Schedule | Appointment authority |
| Quote | Pricing and proposal authority |
| Completion | Performance evidence authority |
| Closure | Obligation-resolution coordination authority |
| History | Durable memory authority |
| Relationship | Persistent relational authority |

An authority may reference another domain's identity and state. It may not
silently create, replace, or reinterpret that domain's truth.

## 3. Service Request Authority

The Service Request owns intake.

It captures:

- customer intent;
- requester and participant context;
- submitted information;
- category context;
- urgency and safety information;
- scope evidence;
- recurrence evidence;
- property or location context;
- information gaps;
- intake provenance.

The Service Request has a stable `serviceRequestId`.

It does not own:

- aggregate identity;
- aggregate lifecycle;
- pricing decisions;
- appointment identity;
- Conversation access;
- Completion;
- Closure;
- Relationship identity.

A Service Request remains valid when:

- classification is Unknown;
- more information is required;
- no aggregate is created;
- it leads only to Consultation;
- it leads to several aggregates;
- it is rejected, withdrawn, or retained for future review.

Service Request identity must remain unchanged after aggregate creation.

## 4. Classification Authority

Classification is evidence-based decision support.

It evaluates:

- intent;
- information sufficiency;
- urgency;
- safety;
- complexity;
- scope;
- recurrence;
- participants;
- operational requirements.

Classification may recommend:

- `Project`;
- `WorkOrder`;
- `Emergency`;
- `RecurringService`;
- Consultation or another information-gathering path;
- another future approved operational type;
- Unknown.

Classification does not:

- create `aggregateId`;
- grant work authorization;
- create a Quote, Schedule, or Conversation;
- determine participant access;
- complete or close work.

Classification decisions and reclassification must preserve:

- the source Service Request;
- evidence used;
- confidence;
- review status;
- decision provenance;
- decision time;
- prior classification history.

High confidence does not create authority outside Classification.

## 5. Operational Aggregate Authority

The Operational Aggregate owns the work lifecycle after an approved
operational context is created.

Its minimum authoritative identity is:

```js
{
  aggregateId,
  aggregateType
}
```

The aggregate owns:

- canonical aggregate identity;
- aggregate type;
- lifecycle status;
- scope boundaries;
- participant membership references;
- originating Service Request references;
- work authorization state;
- active, paused, canceled, completed, and closed lifecycle distinctions;
- references to domain-owned workflow entities;
- Completion references;
- Closure state references;
- History continuity.

The aggregate does not own:

- message bodies or Conversation access;
- appointment records;
- Quote terms or decisions;
- payment settlement;
- regulatory evidence;
- Completion artifacts it did not create;
- obligation evidence;
- relationship identity.

Aggregate identity is created only by future approved aggregate creation
authority. It cannot be derived from:

- Service Request ID;
- Quote or Quote Request ID;
- Conversation ID;
- Schedule ID;
- Completion ID;
- Emergency request ID;
- title;
- customer name;
- generic record ID.

## 6. Aggregate Type Definitions

### Project

`Project` is multi-step scoped work with meaningful duration, dependencies,
participants, documents, decisions, or regulatory obligations.

Examples:

- remodel;
- solar installation;
- fence build;
- large cleanup.

A Project commonly spans several operational stages and workflow entities.
Complexity alone does not create identity; approved aggregate creation does.

### WorkOrder

`WorkOrder` is a discrete, bounded task or service occurrence.

Examples:

- appliance repair;
- one-time cleaning;
- minor service visit;
- inspection visit.

A Work Order may still require a Quote, Schedule, payment, documentation,
follow-up, or Closure review. It must not inherit Project terminology merely
because work exists.

### Emergency

`Emergency` is an urgent response workflow for assessment, dispatch,
stabilization, immediate work, and post-emergency responsibility.

Examples:

- water leak;
- lockout;
- storm damage;
- urgent dispatch.

Emergency identity is distinct from the Service Request, dispatch, Schedule,
Conversation, or any later Project or Work Order.

### RecurringService

`RecurringService` is an ongoing service context with repeated work cycles or
occurrences.

Examples:

- weekly cleaning;
- lawn maintenance;
- ongoing care visits;
- service plan.

It must distinguish:

- parent service identity;
- cycle identity;
- occurrence identity.

Completing one occurrence does not close the parent Recurring Service.

## 7. Aggregate Lifecycle Authority

The Operational Aggregate owns lifecycle transitions for its work context.

Representative lifecycle concepts include:

```text
created
  -> authorized
  -> scheduled / dispatched
  -> active
  -> paused
  -> completed
  -> closure review
  -> closed
```

Cancellation, rejection, expiration, and supersession are separate outcomes.

Lifecycle rules:

1. Aggregate creation is explicit.
2. Aggregate type is explicit.
3. Lifecycle state is not inferred from UI placement.
4. Quote acceptance may authorize a transition but does not create identity.
5. Scheduling may coordinate work but does not create identity.
6. Conversation activity does not change lifecycle without an authorized
   operational command.
7. Completion records work performed.
8. Completion does not authorize Closure.
9. Closure state is separate from Completion state.
10. History records lifecycle events but does not own transitions.

Aggregate identity must survive every lifecycle transition unchanged.

## 8. Relationship to Conversation

Conversation owns:

- `conversationId`;
- participants and access;
- audience scope;
- message persistence;
- communication status;
- allowed communication actions.

The Operational Aggregate may reference zero, one, or multiple Conversations.
A Conversation may also be relationship-scoped rather than aggregate-scoped.

Rules:

- Conversation ID is not aggregate ID.
- Aggregate ID is not Conversation ID.
- A message cannot create aggregate identity.
- Conversation text cannot classify work by itself.
- Archiving or closing a Conversation does not close an aggregate.
- Closing an aggregate does not automatically revoke Conversation access.
- Conversation may display workflow events but does not own them.

## 9. Relationship to Schedule

Schedule owns:

- appointment or visit identity;
- scheduled time;
- location;
- participants or assigned resources;
- appointment status;
- rescheduling and cancellation;
- occurrence timing.

The Operational Aggregate references Schedule entries relevant to its work.

Rules:

- Schedule ID is not aggregate ID.
- A scheduled visit does not prove aggregate creation.
- One aggregate may have many appointments.
- One Recurring Service may have many occurrence schedules.
- A visit outcome may recommend reclassification or a new aggregate, but it
  cannot silently create one.
- Schedule completion is not aggregate Completion unless the owning
  operational workflow explicitly records that boundary.

## 10. Relationship to Quote

Quote owns:

- Quote identity;
- proposal version;
- pricing and scope terms;
- sender and recipient;
- Quote status;
- revision history;
- acceptance, decline, or expiration evidence.

The Operational Aggregate may reference zero, one, or multiple Quotes.

Rules:

- Quote ID and Quote Request ID are not aggregate IDs.
- Quote acceptance does not silently create or rename aggregate identity.
- Some aggregates do not require Quotes.
- A Quote may precede aggregate creation only under future approved workflow
  policy.
- Quote terms may inform aggregate scope, but the aggregate must preserve its
  own authoritative scope state.
- Pricing authority remains with Quote and payment/invoice domains.

## 11. Relationship to Completion

Completion owns performance evidence:

- `completionId`;
- work-performed status;
- completion timestamp;
- work summary;
- completion artifacts;
- performer provenance;
- aggregate reference.

Rules:

- Completion ID is not aggregate ID.
- Completion must explicitly reference `aggregateId` and `aggregateType`.
- Completion does not change aggregate type.
- One aggregate may have several partial or occurrence Completions.
- Recurring Service Completion must identify parent, cycle, or occurrence
  scope.
- Completion does not resolve payment, permits, inspections, warranties,
  participant decisions, follow-up, utilities, or disputes.
- Completion does not authorize Closure.

## 12. Relationship to Closure

Closure is obligation-resolution coordination authority.

Closure evaluates the applicable obligation registry for one typed aggregate
scope. It references evidence owned by:

- Payment;
- Permit;
- Inspection;
- Document;
- Participant Decision;
- Warranty;
- Utility;
- Task/Scheduling;
- Dispute;
- future approved domains.

Rules:

- Closure does not own source-domain evidence.
- Aggregate Completion is required context but not sufficient Closure proof.
- Unknown and disputed obligations remain review-required.
- History does not authorize Closure.
- Archive state does not authorize Closure.
- Presentation labels do not authorize Closure.
- Closure does not terminate Relationship.

Who may authorize Closure remains an unresolved product and backend authority
decision.

## 13. Relationship to History

History owns durable memory.

History records:

- Service Request facts;
- classification and reclassification;
- aggregate creation and lifecycle events;
- Conversation references;
- Schedule events;
- Quote events;
- work evidence;
- Completion;
- obligations and evidence references;
- Closure decisions;
- disputes and follow-ups;
- later relationship activity.

History does not:

- create aggregate identity;
- select classification;
- execute work transitions;
- verify source-domain evidence;
- authorize Closure;
- terminate Relationship.

History may begin before aggregate creation and continue after aggregate
Closure.

## 14. Relationship to Relationship Graph

The Relationship Graph owns durable relational context between identities.

It may represent:

- customer and professional relationships;
- Manual Customer links;
- registered-user links;
- tenant and property-manager relationships;
- team and vendor relationships;
- repeat-customer history;
- shared aggregate references;
- Conversation access references.

Rules:

- Relationship identity is not aggregate identity.
- One relationship may span many Service Requests and aggregates.
- One aggregate may involve several relationships.
- Aggregate Closure does not delete or terminate Relationship.
- Relationship does not authorize aggregate lifecycle transitions.
- Relationship history may reference closed aggregates without reopening them.
- Chat and Contacts may project Relationship but do not own it.

## 15. Non-Authority Rules

The following are presentation or coordination surfaces, not aggregate
authority:

- Dashboard;
- Work Center;
- Command Center;
- Project Gallery;
- Conversation cards;
- inbox rows;
- History screens;
- Project Folder views;
- navigation state;
- archive state;
- revenue counters;
- display labels.

They may:

- read;
- summarize;
- recommend;
- navigate;
- display warnings.

They may not:

- create aggregate identity;
- select authoritative aggregate type;
- rewrite Service Request identity;
- infer lifecycle state from placement;
- verify external evidence;
- authorize Completion or Closure;
- terminate Relationship.

## 16. Compatibility Identifier Rules

Compatibility identifiers are allowed for read reconciliation.

Examples include:

- request-derived `projectId`;
- Conversation-derived Project keys;
- Quote-derived job IDs;
- Schedule-derived request IDs;
- Emergency IDs projected as request or Project IDs;
- generic local IDs.

Rules:

1. Compatibility IDs must retain their original entity type.
2. Compatibility IDs must carry warning and provenance metadata.
3. They may group candidate legacy records for review.
4. They may not create canonical links or authority.
5. They may not be written back as canonical `aggregateId`.
6. They may not satisfy Closure identity requirements.
7. They may not silently merge different entity types.
8. Title, customer, text, and display-time matching remain non-authoritative.
9. A future authoritative link must preserve both original identity and
   canonical aggregate reference.
10. Legacy `projectId` fields remain untrusted when their creation provenance
    is unknown.

Compatibility reconciliation is a bridge, not a migration decision.

## 17. Future Persistence Requirements

Future persistence must support the authority model without requiring any
specific database technology or schema in this phase.

Required capabilities:

- globally stable `serviceRequestId`;
- globally stable `aggregateId`;
- explicit `aggregateType`;
- aggregate creation provenance;
- immutable source-request references;
- classification decision and revision history;
- zero-to-many Service Request-to-aggregate links;
- many-to-one consolidation links where explicitly authorized;
- typed workflow references for Conversations, Schedules, Quotes,
  Completions, Emergencies, and future entities;
- explicit Recurring Service parent, cycle, and occurrence scope;
- lifecycle event identity and idempotency;
- participant and membership references;
- Completion references;
- Closure registry and decision references;
- durable History events;
- Relationship references;
- backend acknowledgement timestamps;
- authorization and audit provenance.

Persistence must not:

- reuse one domain's ID for another domain;
- require every Service Request to create an aggregate;
- require every aggregate to be a Project;
- infer type from category or screen;
- overwrite legacy identity during reconciliation;
- treat local cache state as authority.

## 18. Risks If Not Followed

### Identity Collision

Request, Quote, Conversation, Schedule, Emergency, Completion, and aggregate
records may share or reuse IDs and appear to be one entity.

### False Merge

Unrelated records may be grouped into one apparent Project.

### False Split

One aggregate may appear as several jobs, requests, conversations, or
completions.

### Wrong Workflow Authority

Project rules may be applied to Work Orders, Emergencies, or Recurring
Services.

### Classification Loss

Work may proceed without preserving why an operational type was selected.

### Broken Recurring Scope

One completed occurrence may incorrectly close an entire recurring
relationship.

### Completion/Closure Conflation

Work performed may hide unresolved obligations.

### Relationship Loss

Closing work may incorrectly archive or terminate valid long-term
communication.

### Audit Failure

The system may be unable to prove which authority created identity, changed
state, accepted evidence, or authorized a decision.

### Unsafe Migration

Legacy compatibility IDs may become permanent backend authority and preserve
today's collisions.

## 19. Recommended Phase 3

Create a pure, non-persisting **Operational Aggregate Authority Contract and
Validation Harness**.

Phase 3 should define and validate a structural context such as:

```js
{
  serviceRequestRef,
  classificationRef,
  operationalAggregateRef,
  conversationRefs,
  scheduleRefs,
  quoteRefs,
  completionRefs,
  closureRef,
  historyRefs,
  relationshipRefs,
  compatibilityRefs,
  provenance
}
```

Validation should:

- preserve Service Request and aggregate identity separately;
- require supported aggregate type when an aggregate exists;
- allow a Service Request with no aggregate;
- validate zero-to-many aggregate references;
- reject cross-domain ID substitution;
- preserve Conversation, Schedule, Quote, Completion, Closure, History, and
  Relationship authority boundaries;
- require explicit Recurring Service scope;
- mark compatibility references as non-authoritative;
- report classification and aggregate-type conflict;
- remain deterministic, pure, read-only, and non-adopted.

Phase 3 must not:

- create IDs or records;
- choose classification;
- create aggregate lifecycle transitions;
- persist links;
- migrate legacy values;
- modify UI, routing, storage, or backend schema;
- decide Closure authorization.
