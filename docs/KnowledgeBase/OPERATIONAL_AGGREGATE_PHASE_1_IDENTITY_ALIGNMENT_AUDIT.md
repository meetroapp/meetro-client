# Operational Aggregate Phase 1 - Identity and Classification Alignment Audit

## Status

- Architecture audit only
- No runtime adoption
- No storage or persistence changes
- No aggregate records
- No adapters or migrations

## Executive Summary

The current Meetro client does not maintain a reliable separation between:

- Service Request identity;
- workflow entity identity;
- operational aggregate identity.

The most consequential compatibility behavior is in
`src/utils/projectIdentity.js`. It returns a field named `projectId` from the
first available value in this order:

```text
projectId
requestId
jobId
quoteRequestId
conversationId
emergencyId
postId
generic id
```

Only the generic `id` fallback produces a warning. Request, job, quote-request,
conversation, emergency, and post identities can therefore be promoted into
`projectId` without warning that the entity type changed.

That behavior predates the approved model:

```text
Intent
  -> Service Request
  -> Information Gathering
  -> Classification
  -> Operational Aggregate
```

The current system can reconcile legacy records for presentation, but it
cannot prove that a Service Request became a `Project`, `WorkOrder`,
`Emergency`, or `RecurringService`.

## Required Conclusions

### Service Request Is Not an Operational Aggregate

A Service Request expresses intent and gathers information. It may remain
unclassified, require review, or later create an operational aggregate.

`serviceRequestId` must remain stable even if classification changes or more
than one operational aggregate is later created from the request.

### Classification Is Not Aggregate Identity

Classification recommends or establishes an operational path. It does not
create identity.

For example:

```text
serviceRequestId = request-42
classification = WorkOrder
```

does not mean:

```text
aggregateId = request-42
```

A creation authority must establish a separate aggregate identity and preserve
the source request reference.

### Operational Aggregates Need Stable Typed Identity

The following must eventually have explicit, stable identity:

- `Project`;
- `WorkOrder`;
- `Emergency`;
- `RecurringService`.

Every future operational reference requires both:

```js
{
  aggregateId,
  aggregateType
}
```

Neither field can be inferred from a title, category, conversation, quote,
schedule, completion, or generic record ID.

## Identity Definitions

### Current Identities

| Identity | Current meaning | Current risk |
| --- | --- | --- |
| `requestId` | Request, lead, homeowner request, or sometimes active-work identity | Frequently promoted to project identity |
| `quoteId` | Quote lifecycle identity | Sometimes promoted to job identity or active-work fallback |
| `conversationId` | Conversation/thread identity | Used as request, job-record group, and project compatibility identity |
| `scheduleId` | Appointment/visit identity | Sometimes reused as request identity after a visit |
| `projectId` | Explicit Project ID or compatibility output containing another entity's ID | Entity type cannot be trusted without provenance |
| `completionId` | Completion record identity | Often disconnected from a canonical aggregate |
| `emergencyId` | Emergency request/dispatch identity | Promoted through `requestId` or project compatibility paths |

### Future Identities

| Identity | Required meaning |
| --- | --- |
| `serviceRequestId` | Stable identity of customer intent and information gathering |
| `aggregateId` | Stable identity created by the operational aggregate authority |
| `aggregateType` | Explicit `Project`, `WorkOrder`, `Emergency`, or `RecurringService` |

### Required Reference Model

```js
{
  serviceRequestId,
  classification: {
    candidates,
    selectedClassification,
    confidence,
    reviewedAt,
    provenance
  },
  operationalAggregateRef: {
    aggregateId,
    aggregateType
  },
  workflowRefs: {
    quoteIds,
    conversationIds,
    scheduleIds,
    completionIds,
    emergencyIds
  }
}
```

This is an audit model, not a proposed storage schema.

## Utility Audit

## 1. `projectIdentity.js`

### Current Behavior

`getProjectIdentity()` searches explicit and nested records for:

1. `projectId`;
2. `requestId`;
3. `jobId`;
4. `quoteRequestId`;
5. `conversationId`;
6. `emergencyId` or `emergencyRequestId`;
7. `postId`;
8. generic `id`.

The result always uses the property name `projectId`.

`attachProjectIdentity()` then overwrites or adds:

```js
projectId: identity.projectId
```

### Alignment Conflict

The function collapses multiple entity types into Project identity before
classification proves that a Project exists.

### Identity Collisions

- Request identity becomes Project identity.
- Job identity becomes Project identity.
- Quote Request identity becomes Project identity.
- Conversation identity becomes Project identity.
- Emergency identity becomes Project identity.
- Post identity becomes Project identity.
- Generic identity becomes Project identity with only a warning.

### Classification Loss

The utility receives no classification, aggregate type, creation authority, or
service-request provenance. A `WorkOrder`, `Emergency`, or
`RecurringService` record can emerge labeled as a Project.

### Risk

**Critical compatibility risk.**

This utility remains useful for legacy read reconciliation, but its output
cannot be accepted as canonical aggregate identity.

## 2. `serviceRequestClassification.js`

### Current Behavior

`classifyServiceRequest()` produces advisory candidates:

- `Project`;
- `WorkOrder`;
- `RecurringService`;
- `Emergency`;
- `Consultation`;
- `TransportationService`;
- `MaintenanceRequest`;
- `Unknown`.

It correctly:

- treats category as context rather than classification authority;
- supports multiple candidates;
- preserves Unknown;
- requires review for ambiguity, hazards, emergencies, and insufficient
  information;
- creates no workflow entity.

### Alignment Strength

This utility preserves the required principle that classification is
information-driven and advisory.

### Alignment Gap

Its output contains no:

- `serviceRequestId`;
- selected classification decision identity;
- aggregate creation decision;
- `aggregateId`;
- `aggregateType`;
- link to later workflow entities.

The output is not currently persisted or propagated through Leads, Quotes,
Work Center, or Completion.

### Risk

**Medium architectural gap.**

The classifier is correctly non-authoritative, but current workflows lose its
result before operational work begins.

## 3. `leadReconciliation.js`

### Current Behavior

Lead reconciliation groups records using explicit tokens for:

- project;
- request;
- job;
- quote request;
- conversation;
- emergency;
- post.

`normalizeLeadRecord()` also calls `getProjectIdentity()` and writes its output
to:

```js
projectId
leadIdentity.primaryId
```

### Alignment Strength

Cross-source grouping preserves typed token prefixes such as
`requestId:value` and `conversationId:value`. Generic IDs are not treated as
cross-source-safe by themselves.

### Alignment Conflict

The normalized record simultaneously preserves typed tokens and exposes one
collapsed `projectId`. Consumers can ignore the safer token model and treat a
request, conversation, emergency, or post as a Project.

### Classification Loss

Lead records do not retain Service Request classification candidates,
information sufficiency, selected operational path, or aggregate creation
status.

### Risk

**High.**

The reconciliation report can characterize source overlap, but it cannot
distinguish:

- one Service Request represented in several sources;
- a classified request with no aggregate;
- an aggregate created from a request;
- multiple aggregates created from one request.

## 4. `workCenterSelectors.js`

### Current Behavior

Work Center selectors normalize Scheduling, Quotes, Work, Completion, and
Timeline sources into `projectId` through `getProjectIdentity()`.

Examples:

- schedules use `projectId` or `requestId`;
- quotes use `projectId` or `requestId`;
- active-work snapshots use request, quote, conversation, job, and generic
  values;
- active Emergency records are assigned a `requestId` from emergency request
  or generic emergency identity;
- request timelines inherit `projectId` from request compatibility identity;
- selected Project context groups all records by normalized `projectId`.

### Partial Protection

Active job normalization adds a warning when a job ID is not promoted to
Project identity in one path. This protection is not consistently applied to
requests, quotes, conversations, Emergencies, schedules, or generic records.

### Alignment Conflict

Work Center is an operational consumer, but its grouping key does not preserve:

- Service Request identity;
- aggregate type;
- classification result;
- aggregate creation provenance;
- operational scope.

A matched string can group unrelated entity types into one apparent Project
context.

### Scope Ambiguity

The selectors cannot distinguish:

- Project from Work Order;
- Emergency from Project;
- Recurring Service parent from occurrence;
- request-level timeline from aggregate timeline;
- schedule visit from aggregate;
- completed work from closed aggregate.

### Risk

**Critical for future canonical adoption.**

The selectors are acceptable as warning-bearing legacy projections only.

## 5. `workflowCommands.js`

### Current Behavior

The compatibility command layer is Project-only:

- `createProjectContext`;
- `linkQuoteToProject`;
- `linkConversationToProject`;
- `linkScheduleToProject`;
- `activateProjectWork`;
- `appendProjectTimelineEvent`;
- `completeProject`.

Commands require a non-empty `projectId`, but validation proves only that the
value was supplied as a `projectId` argument. It does not prove:

- Project aggregate creation;
- aggregate type;
- source authority;
- relationship to Service Request classification.

### Alignment Conflict

The command names and storage namespaces presume Project ownership for work
that may be:

- Work Order;
- Emergency;
- Recurring Service;
- still a Service Request;
- unclassified.

### Compatibility Risk

A caller can pass a request-derived compatibility `projectId` and create a
Project link record without establishing a Project aggregate.

### Risk

**Critical for any future write authority.**

The layer must remain compatibility-only. It cannot become the canonical
operational aggregate command layer.

## 6. `closureAggregateValidation.js`

### Current Behavior

The Phase 8 validator requires:

- explicit canonical `aggregateId`;
- supported `aggregateType`;
- distinct Recurring Service parent, cycle, or occurrence scope.

It does not infer aggregate identity.

### Alignment Strength

This is the first reviewed utility that structurally enforces the future typed
aggregate model.

### Adoption Gap

Current runtime records generally cannot satisfy it because they lack:

- canonical aggregate ID;
- aggregate type;
- recurring scope;
- source-authority provenance.

### Risk

**Low internal risk, high adoption gap.**

The validator should remain non-adopted until identity authority exists.

## 7. `closureReadinessContract.js`

### Current Behavior

The contract accepts `aggregateId` and `aggregateType`, but supports any
non-empty aggregate type. It does not validate the Phase 8 supported type
registry.

### Alignment Strength

It explicitly refuses to infer aggregate identity from conversations, quotes,
schedules, titles, customers, or generic identifiers.

### Alignment Gap

Callers can supply a legacy compatibility identity and arbitrary aggregate
type. Structural validation and readiness evaluation are currently separate.

### Risk

**Medium.**

Future composition must validate typed aggregate structure before readiness
evaluation. This audit does not connect the two utilities.

## Representative Page Audit

## 1. `BusinessLeads.jsx`

### Current Identity Behavior

Business Leads loads backend posts and compares them with homeowner requests
using:

- `post.id`;
- `request.id`;
- `request.requestId`;
- title fallback matching.

The converted lead retains only `id: post.id`; it does not retain an explicit
`serviceRequestId`, classification result, or aggregate reference.

### Project Assumption

Post fields and UI language use project-oriented values even though Business
Leads is still at request/lead review.

### Classification Gap

Category matching determines professional visibility, but no structured
information-driven classification is retained or evaluated.

### Identity Risk

Title matching can close or associate a lead without stable identity.

### Severity

**High.**

## 2. `QuoteRequests.jsx`

### Current Identity Behavior

Backend quote requests use `quote.id` as:

- `quote_request_id` for messaging;
- `selectedQuoteRequestId`;
- card identity.

Homeowner requests are updated through title or description matching.

### Quote-to-Project Assumption

The page presents incoming records as homeowner quote requests and uses fields
named `project_title` and `project_description`. It does not establish whether
the Service Request should become a Project, Work Order, Emergency, Recurring
Service, Consultation, or another operational path.

### Classification Loss

The existence of a quote request effectively selects a quote-oriented workflow
without preserving classification evidence or an aggregate creation decision.

### Identity Risk

Quote Request identity can become the de facto request and conversation
context, while title/description matching updates a separate request record.

### Severity

**High.**

## 3. `ContractorDashboard.jsx`

### Request-to-Project Promotion

Schedule shadow linking calls `getProjectIdentity()` with `projectId` and
`requestId`. A request ID is accepted as the Project link target without a
warning that no Project was created.

Timeline shadow writes repeat the same behavior.

### Schedule-to-Request Promotion

Visit outcome handling creates:

```js
id: item.requestId || item.id
requestId: item.requestId || item.id
scheduleId: item.id
```

When no request ID exists, schedule identity becomes request identity.

### Conversation-to-Request Promotion

Project Record groups are keyed by the conversation suffix of
`meetro_job_record_*`. Opening a record writes:

```js
requestId: group.conversationId
conversationId: group.conversationId
```

The same conversation identity therefore represents a request and the Project
Records group.

### Quote-to-Project and Quote-to-Job Promotion

When an accepted quote moves to active work:

```text
activeQuoteProjectId =
  requestId
  OR projectId
  OR generic id
  OR quoteId
  OR conversationId
```

The active job identity is then:

```text
quoteId
OR generic id
OR requestId
OR conversationId
```

No aggregate type or creation authority accompanies these values.

### Job and Conversation Synthesis

`saveActiveJobContext()` selects job ID from `job.id` or `job.requestId`, then
creates a conversation ID from that value. The selected active Project embeds
the same job ID as nested Project `id`.

### Emergency Ambiguity

Emergency dispatch can emerge from a visit outcome within the standard
schedule/request flow. The resulting active snapshots do not preserve an
explicit `aggregateType: Emergency`.

### Classification Loss

Visit outcomes such as:

- quote required;
- start work immediately;
- emergency dispatch;
- materials needed;
- follow-up required;

change workflow state but do not persist a reviewed classification or typed
aggregate reference.

### Severity

**Critical.**

## 4. `CompletionSheet.jsx`

### Completion Identity

Completion creates:

```js
id: completed-<client time>
```

The record may also contain:

- `emergencyRequestId`;
- `scheduleId`;
- `conversationId`.

It contains no canonical:

- `serviceRequestId`;
- `aggregateId`;
- `aggregateType`.

### Conversation-to-Request Fallback

The completion closeout message assigns:

```js
requestId = activeRequestId || conversationId
```

Conversation identity can therefore become request identity.

### Project Assumption

Every completion is stored in `completedProjects`, including scheduled Service
and Emergency completion records.

The message title and copy use Project Closeout even when the completed
operational path may not be a Project.

### Emergency Identity

Emergency completion preserves the active Emergency record's generic `id` as
`emergencyRequestId`, then saves and archives it separately. No explicit
Emergency aggregate reference is attached to the completion record.

### Scope Ambiguity

Completion cannot determine whether it closes:

- a Project;
- Work Order;
- Emergency;
- Recurring Service occurrence;
- Recurring Service cycle;
- generic scheduled visit.

### Severity

**Critical.**

## Required Finding 1: Request Identity Becomes Project Identity

| Location | Current behavior | Conflict | Risk |
| --- | --- | --- | --- |
| `projectIdentity.js` | `requestId` is returned as `projectId` | Service Request is not Project | Critical |
| `leadReconciliation.js` | normalized lead gets request-derived `projectId` | Lead/request state appears Project-owned | High |
| `workCenterSelectors.js` | schedule, quote, active, completed, and timeline records group by request-derived `projectId` | Work Center cannot know aggregate type | Critical |
| `ContractorDashboard.jsx` schedule linking | request ID feeds `linkScheduleToProject()` | Link implies Project without creation decision | Critical |
| `ContractorDashboard.jsx` timeline linking | request ID feeds Project timeline command | Request timeline becomes Project timeline | Critical |
| `ContractorDashboard.jsx` accepted quote | request ID is preferred as `activeQuoteProjectId` | Quote acceptance silently promotes request | Critical |
| `CompletionSheet.jsx` | conversation may become request ID; record stored in `completedProjects` | Completion lacks typed aggregate | Critical |

## Required Finding 2: Quote Identity Becomes Project Identity

| Location | Current behavior | Conflict | Risk |
| --- | --- | --- | --- |
| `projectIdentity.js` | `quoteRequestId` is accepted as Project identity | Quote Request is a workflow entity, not aggregate | Critical |
| `ContractorDashboard.jsx` accepted quote | generic quote or `quoteId` can become active Project/job fallback | Accepted quote does not establish aggregate identity | Critical |
| `workflowCommands.js` | quote links require caller-supplied Project identity but cannot verify provenance | Request-derived or quote-derived ID can be accepted | High |
| `QuoteRequests.jsx` | quote request drives messaging and lead state without classification | Quote workflow precedes aggregate decision | High |

## Required Finding 3: Emergency Identity Becomes Project Identity

| Location | Current behavior | Conflict | Risk |
| --- | --- | --- | --- |
| `projectIdentity.js` | `emergencyId`/`emergencyRequestId` are Project fallbacks | Emergency is a distinct aggregate type | Critical |
| `workCenterSelectors.js` | active Emergency is assigned request identity, then normalized to Project context | Emergency type is lost | Critical |
| `ContractorDashboard.jsx` | emergency dispatch can reuse schedule/request/work identity | Emergency creation boundary is absent | Critical |
| `CompletionSheet.jsx` | Emergency completion is stored in `completedProjects` | Completion projection implies Project ownership | High |

## Required Finding 4: Aggregate Identity Is Missing

Aggregate identity is missing from:

- Business Lead records;
- Quote Request records;
- many schedules;
- active-work snapshots;
- active-job snapshots;
- Project Record groups;
- Completion records;
- Emergency completion records;
- homeowner-request timelines;
- workflow command metadata;
- classification results.

An existing `projectId` field is not sufficient when its source is request,
job, conversation, emergency, post, quote request, or generic ID.

## Required Finding 5: Classification Cannot Be Preserved

Classification cannot currently be preserved because:

1. `classifyServiceRequest()` accepts no stable `serviceRequestId`.
2. Its advisory result is not attached to Lead records.
3. Business Leads filters by category rather than classification evidence.
4. Quote Requests begins from quote-oriented backend records.
5. Work Center stores workflow stage and source but not classification.
6. Visit outcomes change operational state without selected aggregate type.
7. Completion has no aggregate classification reference.
8. Workflow commands are Project-specific.

## Required Finding 6: Aggregate Type Is Unknown

Most current records have no `aggregateType`.

Fields such as:

- `type`;
- `source`;
- `workflowType`;
- `appointmentType`;
- `conversation_type`;
- `completedJobType`;

are not reliable aggregate types. They describe UI, source, appointment,
conversation, or workflow state.

The Phase 8 validator supports only:

- `Project`;
- `WorkOrder`;
- `Emergency`;
- `RecurringService`.

Current runtime shapes rarely satisfy this requirement.

## Required Finding 7: Operational Scope Is Ambiguous

### Project vs Work Order

Minor visits, one-time cleaning, and repair workflows use Project terminology
and storage even when they may be Work Orders.

### Emergency vs Standard Work

Emergency dispatch may be selected as a visit outcome without creating a
distinct Emergency aggregate boundary.

### Recurring Service

No reviewed runtime shape distinguishes:

- recurring parent;
- billing/service cycle;
- occurrence/visit.

A schedule visit cannot safely stand in for any of these scopes.

### Completion Scope

Completion may describe one visit, one job, one Emergency, a Project, or a
Recurring Service occurrence. The record does not say which.

### Timeline Scope

Request, conversation, job-record, and Project timelines are merged through
compatibility identity. Event scope is not authoritative.

## Required Finding 8: Compatibility Risks

### Collision

Two entity types can share the same string value and appear to be one Project.

### False Merge

Request, quote, schedule, conversation, and completion sources may be grouped
because one compatibility fallback produced a matching `projectId`.

### False Split

One real operational aggregate may appear under different request, quote,
conversation, schedule, job, emergency, or completion IDs.

### Wrong Aggregate Type

Work Order, Emergency, and Recurring Service data are presented or linked as
Projects.

### Classification Drift

A request may be classified differently after more information, but current
workflow records do not retain classification version or review provenance.

### One Request to Multiple Aggregates

The current identity model assumes one collapsed Project identity. It cannot
represent a Service Request that produces:

- an Emergency plus a later Project;
- a Consultation plus a Work Order;
- a Project with separate follow-up Work Orders;
- a Recurring Service plus individual occurrences.

### Multiple Requests to One Aggregate

The model also cannot safely represent several requests consolidated into one
approved operational aggregate.

### Closure Contamination

Compatibility `projectId` values cannot safely feed Closure validation because
the Phase 8 contract requires canonical typed aggregate identity.

## Identity Collision Inventory

| Source identity | Promoted or reused as | Evidence |
| --- | --- | --- |
| `requestId` | `projectId` | `projectIdentity.js`, selectors, shadow links |
| `requestId` | active-work ID | Work Center quote and visit outcomes |
| `scheduleId` | `requestId` | Visit outcome base request |
| `quoteRequestId` | `projectId` | `projectIdentity.js` |
| `quoteId` | job ID / active fallback | Accepted quote activation |
| `conversationId` | `projectId` | `projectIdentity.js` |
| `conversationId` | `requestId` | Project Records and Completion closeout |
| `conversationId` | Project Records identity | `meetro_job_record_*` grouping |
| `emergencyId` | `projectId` | `projectIdentity.js` |
| Emergency generic `id` | `requestId` | Active Emergency selector |
| `postId` | `projectId` | `projectIdentity.js` |
| generic `id` | `projectId`, request, job, or completion context | Multiple compatibility paths |
| `completionId` | completed Project record ID | `completedProjects` collection |

## Aggregate Gap Matrix

| Area | Service Request identity | Classification preserved | Aggregate ID | Aggregate type | Scope |
| --- | --- | --- | --- | --- | --- |
| Business Leads | Partial/generic post ID | No | No | No | Request only, but named as Project |
| Quote Requests | Quote Request ID | No | No | No | Quote/request ambiguous |
| Scheduling | Request sometimes present | No | Usually compatibility-derived | No | Visit only |
| Active Work | Request/quote/conversation/job mix | No | No canonical ID | No | Job/work ambiguous |
| Emergency | Emergency/request/generic ID | Emergency implied | No separate canonical ID | Usually absent | Dispatch vs aggregate ambiguous |
| Completion | Completion, schedule, conversation, Emergency refs | No | Missing | Missing | Visit/job/aggregate ambiguous |
| Work Center | Many legacy IDs | No | Compatibility `projectId` | Missing | All paths collapsed |
| Closure foundation | Not accepted as aggregate identity | N/A | Required | Required | Recurring scope required |

## Safe Existing Foundations

The following foundations are aligned and should remain:

- `serviceRequestClassification.js` is advisory, information-driven, and
  preserves Unknown.
- `leadReconciliation.js` typed identity tokens are safer than collapsed
  `projectId`.
- Work Center selectors preserve source metadata and warnings.
- `closureAggregateValidation.js` requires explicit typed aggregate identity.
- `closureReadinessContract.js` refuses to infer aggregate identity.

These foundations do not solve runtime identity authority.

## Unsafe Assumptions to Avoid

Future work must not assume:

- every Service Request becomes a Project;
- accepted quote creates a Project identity;
- schedule ID is request or aggregate identity;
- conversation ID is aggregate identity;
- Emergency request ID is Project identity;
- completion record ID is aggregate identity;
- category selects aggregate type;
- workflow status proves classification;
- one Service Request produces exactly one aggregate;
- one aggregate originates from exactly one Service Request.

## Recommended Operational Aggregate Phase 2

Create a pure, read-only **Operational Aggregate Identity Contract and
Compatibility Validator**.

Phase 2 should define a neutral input:

```js
{
  serviceRequestRef: {
    serviceRequestId,
    provenance
  },
  classificationRef: {
    classification,
    confidence,
    reviewStatus,
    provenance
  },
  operationalAggregateRef: {
    aggregateId,
    aggregateType,
    scope,
    provenance
  },
  workflowRefs: {
    quoteIds,
    conversationIds,
    scheduleIds,
    completionIds,
    emergencyIds
  }
}
```

The validator should:

- require canonical aggregate ID and supported type when an aggregate exists;
- preserve Service Request identity separately;
- allow a request with no aggregate;
- reject request, quote, conversation, schedule, completion, Emergency, or
  generic IDs silently reused as aggregate identity;
- preserve one-to-many and many-to-one references without merging them;
- require explicit Recurring Service scope;
- report classification/aggregate mismatches;
- remain pure, deterministic, non-persisting, and non-adopted.

Phase 2 must not:

- create aggregate IDs;
- select classification;
- create aggregate records;
- migrate legacy identities;
- modify `projectIdentity.js`;
- replace Work Center selectors or commands;
- connect to UI or storage;
- choose backend persistence.

## Final Assessment

Current Meetro identity is workflow-centric and compatibility-oriented.

The future model must become explicitly relational:

```text
Service Request
  -> Classification Decision
  -> zero, one, or multiple Operational Aggregates

Operational Aggregate
  -> Project | WorkOrder | Emergency | RecurringService
  -> workflow entity references
  -> Completion
  -> Closure
```

Until canonical `serviceRequestId`, `aggregateId`, and `aggregateType`
provenance exist, all current Project normalization must remain a legacy read
compatibility layer and must not become aggregate, Completion, or Closure
authority.
