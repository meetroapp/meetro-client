# MC-CONVERSATION-COMMERCIAL-JOB-REQUEST-001B

# Ordinary Request Identity, Opportunity, Relationship, and Conversation Authority Contract

**Contract version:** 1.0

**Evidence date:** 2026-08-06

**Execution mode:** Cross-repository architecture contract and remediation planning only. This document is the only authorized change.

**Frontend root (`<frontend>`):** `/Users/williammolina/meetro-client`

**Backend root (`<backend>`):** `/Users/williammolina/meetro-server/meetro-server`

**Governing evidence:** `<frontend>/docs/Architecture/job-request/MC_JOB_REQUEST_COMMERCIAL_TRUTH_MAP.md`

Repository paths, route names, and symbols below describe current evidence. Names introduced as target contracts are architectural requirements, not implemented schema or runtime claims.

## 1. Executive Decision

The canonical ordinary Job Request entrance is:

```text
authenticated customer submission
  -> posts.id (the sole new ordinary Job Request identity)
  -> read-only, server-authorized opportunity projection
  -> explicit Professional Response
  -> pending response relationship
  -> exact homeowner selection
  -> one selected/active relationship
  -> one canonical participant conversation
```

The following decisions are final for this contract:

1. `posts.id` is the sole identity for all newly created ordinary Job Requests. `quote_requests` is a frozen compatibility object, not a Quote and not a second Job Request authority.
2. Opportunity discovery is a pure read. It creates no response, relationship, participant, conversation, status change, selection, or commercial History.
3. A professional participates only through an explicit response command. The command creates a canonical Professional Response and a limited pending relationship; it creates no conversation and discloses no protected customer identity, exact location, or access data.
4. A separate canonical Request Selection record is the homeowner's exact-object consent evidence. Selection, relationship activation, disposition of competing responses, conversation creation, participant creation, and History writes are one atomic transaction.
5. At most one non-ended selection and one active ordinary relationship may exist for a Job Request. Database constraints and transaction locking must both enforce that invariant.
6. Conversation model **B — after homeowner selection** is selected. No pre-selection messaging is authorized.
7. Privacy is a server-derived, stage-specific projection. The browser never decides or broadens the stage.
8. Cancellation, expiration, closure, and supersession transition dependent records; they never erase authoritative records or messages.
9. Ordinary selection does not complete Evaluation, issue or accept a Quote, authorize work, satisfy payment, schedule work, or start work.
10. The first safe runtime remediation is `001B-1 — Opportunity Read Purity Remediation`; it requires no migration and must only stop new read-side authority creation.

Current evidence for the identity and contradiction is `<backend>/index.js:1412-1703`, `<backend>/server/requests/professionalOpportunityService.js:26-223`, `<backend>/server/relationships/requestRelationshipService.js:13-201,562-725`, `<backend>/server/conversations/conversationService.js:23-130`, and `<backend>/index.js:2419-2747`.

## 2. Governance Derivation

The target assigns authority as follows:

| Engine | Exclusive authority in this contract | Explicit non-authority |
|---|---|---|
| Project | Canonical Job Request identity and requested body of work | Viewing an opportunity does not create participation |
| Relationship | Professional Response participation, pending relationship, selected relationship, closure reasons, business isolation | It does not issue Quotes or authorize work |
| Communication | Conversation, participants, messages, notices | It does not select a professional or create a service relationship |
| Authorization | Eligibility to discover/respond/select/read protected fields/create a conversation | The client cannot grant authority with IDs or browser state |
| Workflow | Request lifecycle projection and allowed next actions | It does not own participant identity |
| History | Append-only evidence after accepted commands | It does not cause transitions |

This derivation applies the governing program supplied for 001B and the repository's single-owner/read-purity principles. The current repository-local Platform Constitution ratification mismatch remains documented by 001A and is not reinterpreted here (`<frontend>/docs/PlatformConstitution/PLATFORM_INVARIANTS.md:16-27`; `<frontend>/docs/PlatformConstitution/README.md:5-25`; truth map sections 2 and 34).

## 3. 001A Findings Accepted as Evidence

The complete 001A truth map was reviewed without modification. This contract accepts these verified findings:

- Authenticated `POST /posts` derives the owner from `req.user.id`, stores a database-generated ID, validates canonical service metadata and governed media, and requires backend-confirmed success (`<backend>/index.js:1412-1478`; `<backend>/server/requests/requestLifecycle.js:43-114`; `<frontend>/src/pages/Upload.jsx:489-655`).
- Owner reads and narrow edits are backend-scoped; cancellation currently updates only `posts` (`<backend>/index.js:1481-1678`).
- `GET /professional-request-opportunities` starts a transaction, locks requests, inserts/promotes `active` relationships, creates conversations, and returns only records with conversation IDs (`<backend>/server/requests/professionalOpportunityService.js:43-211`).
- Explicit response separately inserts a `pending` relationship and acceptance separately transitions it to `active` and ensures a conversation (`<backend>/server/relationships/requestRelationshipService.js:80-187,610-711`).
- Current schema permits one response per request/business but does not permit only one active ordinary relationship (`<backend>/migrations/202607200002_create_request_relationships.sql:1-56`; `<backend>/migrations/202607230002_add_emergency_relationship_source.sql:39-47`). The Emergency-only partial unique index expressly does not alter ordinary behavior (`<backend>/migrations/202607240001_add_single_active_emergency_relationship.sql:1-13`).
- Canonical conversations are unique per relationship, participant-derived, and require an active relationship, but ordinary list/detail queries do not require an open request and do not consistently require an active relationship (`<backend>/migrations/202607200003_create_conversations.sql:1-52`; `<backend>/server/conversations/conversationService.js:23-130,256-455`).
- `quote_requests`, its legacy messages, and `workflow_events` form an active unlinked workflow (`<backend>/migrations/202607050001_initial_schema_baseline.sql:44-77`; `<backend>/index.js:2419-2747`; `<frontend>/src/pages/ContractorDetails.jsx:398-441`).
- Ordinary Evaluation fails closed; Quote readiness remains false (`<backend>/server/authorization/evaluationService.js:350-390,511-539`; `<backend>/test/canonicalEvaluationService.test.js:371-377,485`).
- Browser-local commercial projections remain compatibility or presentation state and may not become authority (truth map sections 24-25).

No database, staging, production, deployed migration ledger, or runtime data was inspected. Migration files prove intended schema only.

## 4. Canonical Ordinary Request Identity Decision

### Target contract

`posts.id` is the sole canonical identity for every newly submitted ordinary Job Request.

- The identity begins only after successful backend insertion. Unsaved forms, assistant drafts, media uploads, route state, timestamps, and local-storage records are not Job Request identity.
- Relationships, responses, selections, conversations, Evaluation, future Quotes, future Projects, and History must reference the same `posts.id` through explicit foreign keys or server-resolved links.
- Client-provided request ownership is forbidden; the owner remains `req.user.id`.
- Dual write from one submission into `posts` and `quote_requests` is prohibited.
- No ID may be inferred by matching title, service, address, participants, timestamp, or legacy message content.
- The contract does not authorize backend drafts. A canonical ordinary Job Request begins in submitted `open` state; local preparation remains non-authoritative.

### Current truth and remediation

`POST /posts` already supplies the correct identity base (`<backend>/index.js:1412-1459`). The generic commercial foundation already names `posts(id)` as `ordinary_request_id` (`<backend>/migrations/202608010001_create_commercial_authority_foundation.sql:26-44`). Runtime remediation must remove the parallel new-record authority rather than replace `posts` or add another request table.

## 5. Legacy `/quote-requests` Decision

`quote_requests` is **compatibility-only**. It is a historical direct-to-profile request-for-quote object, not a canonical Job Request and not a canonical Quote.

| Policy | Final decision |
|---|---|
| Creation | New production creation must stop. `POST /quote-requests` must fail with a stable retired-capability contract after the frontend entry point is removed or redirected. |
| Read | Existing owner/target-participant records may remain readable during a bounded retirement window through a namespaced legacy DTO, never a canonical Job Request projection. |
| Mutation | New legacy messages and `workflow_events` must become read-only when containment is implemented; they may not advance Workflow, Quote, selection, or payment truth. |
| Identity bridge | None by default. Existing legacy IDs remain namespaced as `legacy_quote_request_id` and never substitute for `posts.id`. |
| UI bridge | `ContractorDetails` may route a user to standard Request Help with ordinary form prefill only; it may not preselect the viewed professional or claim a direct request. |
| Relationship/conversation bridge | None automatically. Legacy participants/messages remain historical compatibility records and do not create canonical relationships/conversations. |
| Evaluation/Quote bridge | None. A request-for-quote is neither an Evaluation nor a Quote. |
| Migration | No silent migration. A later, separately approved migration may convert a record only with exact participant verification, provenance, idempotency, user-visible consent where required, and permanent bridge History. |
| Retirement | Creation and mutation callers removed; legacy reads exported/retained under policy; no active runtime reference treats the legacy ID as canonical. |

Current active creation and mutation evidence is `<backend>/index.js:2419-2747` and `<frontend>/src/pages/ContractorDetails.jsx:398-441`. The schema has no link from `quote_requests` to `posts` or canonical relationships (`<backend>/migrations/202607050001_initial_schema_baseline.sql:44-77`).

## 6. Opportunity Discovery Contract

Opportunity discovery is a read-only Authorization projection over open Job Requests.

It may:

- authenticate the professional and derive the owned business profile;
- evaluate canonical service and service-area eligibility;
- return privacy-filtered request summaries;
- return a server-derived response state for that exact business where the state is unambiguous;
- return `respondAllowed` and a stable denial reason;
- emit non-authoritative operational telemetry that is physically and semantically separate from commercial History.

It must not:

- insert, update, promote, close, or lock-for-mutation a relationship;
- create a response, selection, conversation, participant, message, or History event;
- change request or Workflow state;
- disclose customer identity, exact address, unit/access information, direct contact information, or protected media;
- return a conversation ID before selection.

Repeated GETs must be observationally pure. Any telemetry is best-effort analytics, carries no relationship/commercial semantics, cannot gate eligibility, and cannot be interpreted as an opportunity read receipt or participation event.

The current matching predicate may be preserved while mutation is removed: it derives the professional profile and checks request state, canonical service compatibility, and service area (`<backend>/server/requests/requestLifecycle.js:128-166`). The current mutating CTE at `<backend>/server/requests/professionalOpportunityService.js:108-208` must not survive as compatibility behavior.

## 7. Professional Response Contract

### Canonical object

An explicit eligible response creates a canonical `ProfessionalResponse` object and a linked pending `RequestRelationship` in one transaction. The response is not the conversation and is not homeowner selection.

Conceptual required fields:

```text
responseId
requestId -> posts.id
relationshipId -> pending RequestRelationship
professionalUserId (server-derived)
businessProfileId (server-derived)
responseState
introductionText
version
idempotencyKey + requestFingerprint
submittedAt / updatedAt / terminalAt
```

`responseState` is exactly one of:

```text
submitted
withdrawn
declined
selected
not_selected
expired
cancelled
closed
```

The response command:

- requires authentication, an owned business profile, an open non-self request, current eligibility, and exact `posts.id`;
- ignores or rejects client-supplied professional, business, homeowner, relationship, selection, and conversation identity;
- accepts only bounded response content and an idempotency key;
- prevents more than one live response per `(requestId, businessProfileId)`;
- creates no work authorization, Evaluation completion, Quote, schedule, payment state, Project, or conversation;
- returns the authoritative response and pending relationship.

On response submission, the requester may see the professional's approved public business identity/profile projection and introduction. The professional receives no new customer information beyond the discovery projection.

Current evidence shows the correct explicit boundary but stores response and relationship semantics in one `request_relationships` row (`<backend>/server/relationships/requestRelationshipService.js:13-201`). The target therefore requires a distinct `professional_responses` record linked one-to-one to its `request_relationships` participation record. Both remain within the Relationship Engine, but response disposition and relationship access no longer share one state column.

## 8. Pending Relationship Contract

Every accepted Professional Response command creates one limited pending relationship linking the requester, exact Job Request, exact response, professional user, and business profile.

Purpose: represent that a specific business has explicitly offered to participate and that the requester may evaluate that response.

`relationshipState` is exactly one of:

```text
pending
active
closed
```

Rules:

- `pending` permits the professional to read only the authorized response/opportunity projection and permits the homeowner to review/decline/select the response.
- `pending` does not permit messaging, exact location, unit/access data, customer direct contact, Evaluation, Quote, scheduling, or work.
- `active` exists only after a valid selection transaction.
- `closed` is terminal for this relationship instance and carries a server-owned closure reason such as `professional_withdrew`, `homeowner_declined`, `other_professional_selected`, `request_cancelled`, `request_expired`, `request_closed`, or `request_superseded`.
- Withdrawal, decline, selection of another response, cancellation, expiration, closure, or supersession closes the pending relationship atomically with the response outcome.
- A closed pending relationship is retained and readable to its participants under the privacy stage applicable when it closed; it cannot send messages because no conversation was created.

The current `pending` row and participant isolation are useful foundations (`<backend>/migrations/202607200002_create_request_relationships.sql:1-47`; `<backend>/server/relationships/requestRelationshipService.js:131-187,741-890`). The existing single `status` column is insufficient for both response outcome and relationship access.

## 9. Homeowner Selection Contract

Selection is an exact-object Authorization command and a separate canonical `RequestSelection` record. It is not merely a response flag or a browser choice.

Required selection evidence:

```text
selectionId
requestId
responseId
relationshipId
selectedByUserId
professionalUserId
businessProfileId
requestVersion
responseVersion
idempotencyKey + requestFingerprint
selectedAt
endedAt / endReason (nullable)
```

The authenticated actor must own the exact Job Request or hold a separately governed representative grant. The service must resolve the response, professional, and business from backend records; client-supplied participant identity is not trusted.

Selection atomically:

1. records one active selection;
2. changes the chosen response from `submitted` to `selected`;
3. changes its relationship from `pending` to `active`;
4. changes all competing `submitted` responses to `not_selected` and closes their pending relationships;
5. creates/resolves exactly one canonical conversation and its participants;
6. records the required History events;
7. returns the authoritative request, selection, response, relationship, conversation, and capability projection.

Authority created: selected relationship, stage-3 privacy projection, and post-selection conversation access. Authority not created: completed Evaluation, Quote issuance/acceptance, Commercial Authorization, payment satisfaction, schedule, work start, Project, Invoice, review, or warranty.

The current owner/pending checks and conversation transaction are a partial base (`<backend>/server/relationships/requestRelationshipService.js:610-711`), but current code does not lock request selectability, enforce sole ordinary selection, disposition competing responses, or create selection/History evidence.

## 10. Sole-Selected-Professional Invariant

For each `posts.id`, at most one selection may have `endedAt IS NULL`, and at most one linked ordinary relationship may be `active`.

Required enforcement is layered:

- a partial unique index or equivalent unique constraint on the active selection for `requestId`;
- a partial unique index on active ordinary relationships for `post_id`;
- row locking of the Job Request and candidate response/relationship during selection;
- conditional state/version updates;
- command idempotency key plus request fingerprint;
- foreign-key and participant-consistency constraints between request, response, relationship, selection, and conversation.

For simultaneous selections, the database chooses exactly one committed winner. An identical retry for the winner returns the same selection/conversation without new writes. A competing request for another response receives deterministic `409 REQUEST_SELECTION_ALREADY_EXISTS` with no partial writes and no protected information about the winner beyond the caller's authorized projection.

The ordinary constraint is absent; only Emergency currently has an equivalent active-relationship guard (`<backend>/migrations/202607240001_add_single_active_emergency_relationship.sql:1-13`). Emergency SQL may inform constraint mechanics, not ordinary authority semantics.

## 11. Conversation Creation Decision

**Selected model: Model B — after homeowner selection.**

| Question | Contract decision |
|---|---|
| Creation event | Successful exact homeowner selection transaction |
| Participants | Request owner/authorized representative and the selected professional user/business only |
| Relationship prerequisite | Exact linked relationship is active in the same transaction |
| Authorization prerequisite | Selection actor owns the request; response/business identities are server-resolved |
| Privacy | Stage 3 only; Stage 4 fields remain unavailable until separate Commercial Authorization |
| Stable identity | One canonical `conversations.id` remains stable for the selected relationship |
| Pre-selection inquiry | Not authorized; the introduction is the only response communication |
| Declined/unselected response | No conversation exists |
| Post-close access | Conversation and messages remain participant-readable but conversation is closed/read-only |
| Communication Center | Projects only canonical participant conversations; no opportunity card appears as a conversation |
| Duplicate prevention | Unique relationship/selection link plus idempotent create inside selection transaction |

This decision preserves the current one-conversation-per-relationship constraint (`<backend>/migrations/202607200003_create_conversations.sql:35-36`) but removes the unsafe creation event in `<backend>/server/requests/professionalOpportunityService.js:164-192`.

## 12. Conversation Lifecycle Contract

Canonical conversation state is independent of request, response, relationship, and Workflow state:

```text
active -> closed
```

Participant archival remains a per-user presentation state and does not close or delete the conversation.

- `active` permits canonical messages only while the exact selected relationship remains active and governing request/commercial permissions allow communication.
- `closed` preserves participant reads, messages, timestamps, read evidence, and History; new sends fail deterministically.
- Decline, withdrawal, or `not_selected` cannot close a conversation because none exists.
- Request cancellation/expiration/closure/supersession closes any existing conversation in the same transaction as dependent relationship closure.
- Conversation creation and participant creation are Communication Engine effects authorized by the selection command; they never create selection or relationship authority themselves.
- The opaque conversation ID may be cached for navigation, but every read/send is reauthorized against exact participants and current send capability.

Current participant derivation and uniqueness are preserved (`<backend>/server/conversations/conversationService.js:38-129`; `<backend>/migrations/202607200003_create_conversations.sql:1-40`). Current ordinary detail/list behavior must add the target relationship/request send/read rules rather than rely only on participant membership (`<backend>/server/conversations/conversationService.js:256-455`).

## 13. Privacy Projection Contract

Privacy is determined by the backend from canonical request/response/relationship/selection/authorization state. The client receives a prefiltered projection and may only reduce visibility.

| Stage | Actor-visible information | Protected information |
|---|---|---|
| 1 — Opportunity discovery | Service domain/specialty; public summary; generalized service area; requested timing if canonical; privacy-reviewed media | Owner ID/name; exact address; unit; access notes/codes; phone/email; sensitive documents; conversation ID |
| 2 — Response submitted | Professional retains Stage 1 plus own response state. Homeowner receives approved public business identity/profile and introduction | Professional still receives no customer identity, exact location, unit/access, contact, or messaging; homeowner receives no private professional contact data |
| 3 — Professional selected | Both receive canonical display identity and conversation. Selected professional receives exact service location and unit plus non-secret coordination fields required for Evaluation/service planning | Direct contact remains unnecessary; access/gate codes, lockbox data, sensitive documents, and commercially gated operational data remain protected |
| 4 — Commercially authorized work | Only server-authorized operational fields required to perform the authorized work, including separately governed access instructions where necessary | Unrelated PII, payment secrets, identity documents, and data outside exact authorized work remain protected |

Additional rules:

- `location` may be used server-side for eligibility without being returned during discovery, as current matching already does (`<backend>/server/requests/requestLifecycle.js:144-165,191-213`).
- Generalized area must be server-derived; returning a client-masked exact address is not sufficient.
- Access notes must be classified; free text is not automatically safe for Stage 3.
- Unselected, declined, withdrawn, expired, cancelled, or closed pending participants never receive Stage 3 or Stage 4 fields.
- Closed selected participants retain only the fields required for permanent-record review; operational secrets must be redacted or separately revoked by policy.
- No API response, log, alert payload, error, idempotency record, or History payload may include unnecessary raw PII.

Current opportunity serialization already omits location/owner identity, but current discovery-created conversations expose a homeowner display name through professional conversation projection (`<backend>/server/requests/requestLifecycle.js:191-213`; `<backend>/server/conversations/conversationService.js:319-375`). The read-side creation must be removed before that projection can be trusted.

## 14. Request Status Boundary

The canonical Job Request state describes availability/retention of the requested work, not professional response or commercial progress.

Target states:

```text
open
cancelled
expired
closed
superseded
```

- `open` means the request exists and has not reached a terminal request outcome. Opportunity eligibility additionally requires no active selection and current publication rules.
- Selection does not change request state; it closes opportunity visibility through the selection projection.
- `cancelled` is an authorized requester/administrator termination before Commercial Authorization.
- `expired` is a server-owned deadline transition available only when no active selection exists.
- `closed` is an authoritative terminal outcome.
- `superseded` means a separately governed replacement request has assumed future work; authority is not copied to the replacement.
- `draft` is not part of this contract because there is no authoritative draft route. Adding backend drafts requires a separate contract.

Current schema/runtime recognizes only `open` and `cancelled` (`<backend>/server/requests/requestLifecycle.js:3`; `<backend>/index.js:1644-1668`). Expansion requires schema and lifecycle work; the first read-purity remediation must not expand statuses.

## 15. Response Status Boundary

The Professional Response disposition is owned by the Relationship Engine and does not authorize work:

| State | Meaning | Allowed transition |
|---|---|---|
| `submitted` | Explicit eligible response awaiting homeowner decision | `withdrawn`, `declined`, `selected`, `not_selected`, `expired`, `cancelled` |
| `withdrawn` | Professional ended the response before selection | terminal |
| `declined` | Homeowner rejected this exact response | terminal |
| `selected` | Homeowner selected this exact response | `cancelled`, `closed` through request/relationship terminal command |
| `not_selected` | Another response was selected or request closed without this response | terminal |
| `expired` | Request deadline ended before selection | terminal |
| `cancelled` | Request was cancelled and invalidated the response | terminal |
| `closed` | Selected participation reached governed closure without cancellation | terminal |

The current `request_relationships.status` combines response disposition and relationship access (`pending`, `active`, `declined`, `withdrawn`, `closed`) and is therefore a migration input, not the target state model (`<backend>/migrations/202607200002_create_request_relationships.sql:20-37`).

## 16. Relationship Status Boundary

Relationship state answers only what participation relationship exists:

- `pending`: explicit response participation; review/decision only.
- `active`: one selected professional; Stage 3 and active conversation capabilities.
- `closed`: no further relationship action; closure reason preserves why.

`declined`, `withdrawn`, `not_selected`, `expired`, and `cancelled` are response outcomes/relationship closure reasons, not active relationship states. `active` does not mean Evaluation complete, Quote accepted, paid, scheduled, or working.

The target preserves the current exactly-one-source relationship rule (`post_id` xor `emergency_request_id`) while keeping ordinary and Emergency semantics separate (`<backend>/migrations/202607230002_add_emergency_relationship_source.sql:15-47`).

## 17. Conversation Status Boundary

Conversation state is only:

- `active`: selected participants may communicate under current authorization.
- `closed`: retained participant-readable record; no new messages.

Per-participant `archived_at` values are view preferences, not conversation state. Message read state is participant evidence, not conversation lifecycle. Current schema already supports `active|closed`, participant archives, and a unique relationship (`<backend>/migrations/202607200003_create_conversations.sql:20-39`).

## 18. Workflow Projection Boundary

Workflow projects allowed next actions from authoritative objects; it does not copy their identities or states.

A minimum ordinary projection may report:

```text
accepting_responses
awaiting_homeowner_selection
selected_professional
terminal
```

These are derived views, not additional canonical state columns unless a later Workflow contract proves persistence is required. They cannot be written from browser events or legacy `workflow_events`. Current legacy `POST /workflow-events` accepts client-authored workflow type/status/payload (`<backend>/index.js:2650-2713`) and is explicitly excluded from canonical Workflow and History.

## 19. Cancellation, Expiration, and Closure Contract

Canonical records transition; they do not disappear.

| Request event | Opportunity | Responses | Relationships | Conversations/messages | Commercial capabilities | History/read retention |
|---|---|---|---|---|---|---|
| Requester cancellation | Removed immediately | `submitted/selected -> cancelled` | All pending/active -> closed (`request_cancelled`) | Existing conversation -> closed/read-only; messages retained | Evaluation/Quote/readiness fail closed; no new work authorization | Cancellation and dependent transitions recorded; participant reads retained by policy |
| Administrative cancellation | Same as requester cancellation, with administrator grant and reason | Same | Same | Same | Same | Administrative actor/reason recorded |
| Expiration | Removed | `submitted -> expired` | Pending -> closed (`request_expired`) | None should exist; any anomalous conversation is closed/quarantined | All downstream eligibility closed | Expiration event and exact affected objects retained |
| Close without selection | Removed | `submitted -> not_selected` | Pending -> closed (`request_closed`) | None | Closed | Closure and dispositions retained |
| Close after selection | Removed | `selected -> closed`; competitors remain terminal | Active -> closed (`request_closed`) | Closed/read-only; messages retained | Later commercial records remain their own immutable evidence | Closure chain retained |
| Superseded revision | Old request removed; replacement independently evaluated | Pending -> `not_selected`; selected -> `closed` unless separately terminated first | Close old relationships | Close old conversation; no participant/ID transfer | No Evaluation/Quote/authorization transfer | Bridge event references both request IDs without promoting old authority |

Cancellation is authorized only before Commercial Authorization. Once work is commercially authorized, a separately governed termination/change-order command is required; ordinary `cancel` must return deterministic conflict rather than erase obligations.

Current `POST /posts/:id/cancel` updates only the post and is idempotent (`<backend>/index.js:1644-1668`). It must eventually become the atomic boundary in section 25.

## 20. History Contract

History is append-only evidence written after each authoritative transition within the same transaction or transactional outbox boundary. Required event types are:

```text
job_request.submitted
job_request.opportunity_published
professional_response.submitted
request_relationship.pending_created
professional_response.withdrawn
professional_response.declined
request_selection.created
professional_response.selected
request_relationship.activated
professional_response.not_selected
conversation.created
job_request.cancelled
job_request.expired
job_request.closed
job_request.superseded
request_relationship.closed
conversation.closed
legacy_quote_request.bridge_used
```

Each event must contain or reference:

- immutable event ID and event type;
- actor user ID and authorized role/grant;
- primary object type/ID and object version;
- prior state and new state;
- authoritative occurrence timestamp and persistence timestamp;
- causation ID, correlation ID, command/idempotency ID;
- related request, response, relationship, selection, conversation, and business IDs where applicable;
- reason code and privacy-safe payload.

Events must have a uniqueness rule such as `(causationId, eventType, objectType, objectId, resultingVersion)` so a retry cannot duplicate History. History observes completed state; it may not make a response selected or create a conversation. Current commercial evidence covers its own aggregate commands only, and legacy workflow events are not a substitute (`<backend>/migrations/202608010001_create_commercial_authority_foundation.sql:172-238`; `<backend>/index.js:2650-2747`).

## 21. Emergency Separation

- Ordinary requests continue to use `posts`; Emergency continues to use `emergency_requests`.
- Ordinary request status, response disposition, selection, privacy, cancellation, and conversation timing do not inherit Emergency dispatch states.
- Ordinary opportunity discovery may not reuse any Emergency mutation-on-read behavior.
- Emergency response/selection/dispatch/Evaluation behavior remains governed by its own milestones and is unchanged by this contract.
- Shared validators, transaction utilities, idempotency helpers, and exactly-one-source relationship/conversation primitives may be reused only where authority semantics are identical.
- The Emergency one-active index is evidence for a database mechanism, not permission to copy Emergency lifecycle semantics (`<backend>/migrations/202607240001_add_single_active_emergency_relationship.sql:1-13`).

## 22. Current-to-Target Route Matrix

| Current route/surface | Current mutation/owner | Contradiction | Target behavior / required owner | Runtime/schema/compatibility work | Required tests | Milestone |
|---|---|---|---|---|---|---|
| `Upload.jsx` -> `POST /posts` | Inserts owner-scoped `posts`; route-local request authority | No submission History/version | Keep as sole new Job Request identity; Project + Authorization | Runtime History integration; schema History/version later; preserve payload compatibility | owner, ID, retry, validation, no dual write | 001B-2 foundation / later request History milestone |
| `GET /posts`, `GET /posts/:id` | Owner-only read | None in identity; projection limited | Preserve owner read; add canonical response/selection projections only when authorized | Runtime projection only; no legacy IDs | owner/cross-user/privacy | 001B-7 |
| `GET /professional-request-opportunities` | Creates/promotes active relationships and conversations (`materializeProfessionalOpportunities`) | A read creates Relationship/Communication authority | SELECT-only eligibility and privacy projection; Authorization | Backend service/test rewrite; frontend must not expect conversation ID; no migration | repeated GET zero writes; privacy; response-state read | **001B-1** |
| `POST /professional-request-opportunities/:postId/respond` | Creates/returns current `request_relationships` row | One column conflates response/relationship; may resolve read-created active row | Create explicit response + pending relationship; Relationship + Authorization | Runtime + definite response/state/idempotency schema; reconcile ambiguous rows separately | eligibility, exact business, duplicate retry, no conversation | 001B-3 |
| `GET /my-request-relationships` | Lists homeowner response-like rows | Relationship rows serve as response projection | List exact Professional Responses with public business projection | Runtime adapter; compatibility field aliases bounded | owner, privacy, dispositions, ordering | 001B-3 |
| `POST /request-relationships/:id/accept` | Pending -> active and conversation | No request lock, sole selection, loser disposition, selection/History evidence | Exact selection transaction; Relationship/Authorization/Communication/History | Runtime rewrite + selection/unique/History schema | concurrency, idempotency, rollback, exact conversation | 001B-4 |
| `POST /request-relationships/:id/decline` | Pending -> declined | Response/relationship state conflated; no History | Decline response + close pending relationship atomically | Runtime/state/History changes | owner, wrong request, retry, no conversation | 001B-3 |
| Professional relationship list/withdraw | Participant-scoped; pending -> withdrawn | State conflation; request terminal state not reconciled | Withdraw response + close pending relationship | Runtime/state/History changes | business isolation, retry, terminal request | 001B-3 |
| Canonical conversation ensure/list/detail/send | One conversation per active relationship; participant-scoped | Created during discovery; ordinary send not closed on request terminal state | Create only from selection; exact participant/privacy/send capability | Runtime selection integration; likely selection FK/link; preserve message identity | no pre-selection conversation; close/read-only; exact participants | 001B-4/001B-5 |
| `POST /posts/:id/cancel` | Updates only `posts` | Leaves responses/relationships/conversations active | Atomic propagation with History | Runtime transaction + response/selection/History state schema | before/after selection, retry, rollback, no writes on conflict | 001B-5 |
| `ContractorDetails` -> `POST /quote-requests` | Creates unlinked legacy request from client target | Silent second request identity | Stop new creation; route to ordinary Request Help without preselection | Frontend/backend containment; no automatic schema migration | stable retirement response; no dual write; legacy reads remain | 001B-6 |
| Legacy direct-request messages/workflow | Writes `/messages` and `/workflow-events` by quote-request ID | Separate client-authored Communication/Workflow authority | Existing history read-only, clearly namespaced | Runtime disable mutation; preserve scoped reads | no new legacy write; participant read; no canonical promotion | 001B-6 |
| Evaluation entry | Ordinary request returns unavailable | No selected ordinary handoff yet | Remain fail-closed until later separately authorized Evaluation milestone | No 001B runtime enablement or schema change | ordinary unavailable before prerequisites | Later ordinary Evaluation milestone |
| Frontend Business Leads card | Opens discovery-created conversation | UI depends on unsafe side effect | Show read-only opportunity and explicit response capability only after 001B-3; never generic conversation fallback | Frontend adapter/UI in relevant remediation; browser route cache remains hint only | no conversation CTA without canonical ID; routing unchanged for selected convos | 001B-1/001B-3 |

Evidence: `<frontend>/src/pages/BusinessLeads.jsx:440-485`, `<frontend>/src/utils/professionalOpportunityCoordinator.js:267-300`, `<frontend>/src/pages/ContractorDetails.jsx:398-441`, and the backend paths cited in sections 3-12.

## 23. Canonical Data Contracts

These are conceptual contracts, not SQL authorization.

### Canonical Job Request

```text
requestId: posts.id
ownerUserId
requestState
serviceDomain / serviceSpecialty
currentVersion
submittedAt / updatedAt / terminalAt
```

Narrative, location, and media remain the Project/request body defined by existing request governance. All dependent objects use `requestId`; none use a legacy quote-request ID.

### Professional Response

```text
responseId: professional_responses.id
requestId
relationshipId
professionalUserId
businessProfileId
responseState
introductionText
version
submittedAt / updatedAt / terminalAt
idempotency identity/fingerprint
```

### Request Selection

Selection is a **separate canonical record plus a coordinated transaction across response, relationship, conversation, and History**. It is append-preserving: an ended selection retains `endedAt/endReason`; a future governed reselection would create a new record rather than overwrite consent.

### Request Relationship

```text
relationshipId: request_relationships.id
requestId
responseId
homeownerUserId
professionalUserId
businessProfileId
relationshipState: pending | active | closed
closureReason
version
createdAt / activatedAt / closedAt
```

### Request Conversation Link

Exactly one canonical conversation links to the exact active relationship and selection. For an ordinary conversation, `conversations.selection_id` is required and references the active `request_selections` record; Emergency conversations keep that field null under their separate source contract. The persisted FK chain and source-specific constraints must prove:

```text
conversationId -> relationshipId -> responseId -> requestId
                         -> selectionId -> same response/relationship/request
```

Participant IDs must equal the server-resolved relationship participants. No request ID, response ID, legacy quote-request ID, or browser ID substitutes for `conversationId`.

### Privacy Projection

The server returns `privacyStage`, allowed fields, and capabilities derived from canonical state. It does not return protected fields merely for the client to hide.

### History Event

History uses the event envelope in section 20 and references exact objects without embedding unnecessary PII or mutable display values.

## 24. Selection Transaction Boundary

The authoritative transaction is:

1. Begin; acquire/resolve the idempotency record and fingerprint.
2. Lock the exact `posts` row and validate that the request owner equals the authenticated actor (or verified representative grant).
3. Confirm request state is selectable and no Commercial Authorization/terminal condition forbids selection.
4. Lock the exact Professional Response and pending relationship; verify both reference the locked request.
5. Verify response is `submitted`, relationship is `pending`, professional/business ownership is current, and response version matches.
6. Lock/query any active selection and active ordinary relationship for the request.
7. Insert the Request Selection under the unique active-selection constraint.
8. Update chosen response to `selected` and chosen relationship to `active` using conditional version predicates.
9. Update all other `submitted` responses to `not_selected` and close their pending relationships with `other_professional_selected`.
10. Create or resolve one canonical conversation linked to the selection/relationship; create exact participants and read-state rows.
11. Append `request_selection.created`, `professional_response.selected`, `request_relationship.activated`, each loser transition, and `conversation.created` History/outbox evidence with one correlation/causation chain.
12. Persist idempotent result references; commit.
13. Return only the authoritative committed projection.

Any failed validation, unique conflict, conversation/participant failure, or History/outbox failure rolls back all writes. No selected response may exist without its active relationship and selection; no active conversation may exist without all three. The current acceptance rollback behavior on conversation failure is a useful base but incomplete (`<backend>/server/relationships/requestRelationshipService.js:687-724`; `<backend>/test/requestRelationshipService.test.js:884-951`).

## 25. Cancellation Transaction Boundary

The authoritative cancellation transaction is:

1. Begin; resolve command idempotency.
2. Lock the exact Job Request and verify requester ownership or administrator grant.
3. If already cancelled, return the original authoritative result without new events.
4. Reject cancellation if a Commercial Authorization requires a separately governed termination command.
5. Lock all Professional Responses, relationships, active selection, and conversation links for the request.
6. Set request state to `cancelled` and authoritative timestamp/reason.
7. Set submitted/selected responses to `cancelled`; close all pending/active relationships with `request_cancelled`; end any active selection.
8. Close any canonical conversation; preserve messages and participant read access under retention policy; revoke send capability.
9. Invalidate future Evaluation/Quote/Workflow readiness through authoritative state projection, not deletion.
10. Append request and every dependent transition to History/outbox with one causation/correlation chain.
11. Persist idempotent result; commit and return the complete authorized projection.

Any failure rolls back. No dependent object may remain active after a committed cancellation. Current cancellation performs only step 6 against `posts` and therefore cannot be certified as the target (`<backend>/index.js:1644-1668`).

## 26. Authorization Matrix

All rejection responses are deterministic, privacy-safe, and disclose no cross-user/cross-business object details. `404` is used where existence disclosure is unsafe; `403` for authenticated role/capability denial; `409` for a visible exact object's invalid state/version; `400` for malformed input.

| Action | Actor/authentication | Role/ownership/relationship/business/exact-object requirement | Privacy projection | Mutation / History |
|---|---|---|---|---|
| Create request | Authenticated customer | Actor becomes owner; no client owner/business identity | Owner Stage 0/full draft-submission fields | Create `posts`; `job_request.submitted` |
| Edit draft | Authenticated owner/authorized representative | Unavailable in this contract because no canonical backend draft exists | None | None; a future draft contract must define this separately |
| Edit submitted open request | Authenticated owner/authorized representative | Exact request + expected version; no active constraints violated | Owner projection | New version; revision History (defined by later request-version milestone) |
| Submit/publish request | Authenticated owner | Exact draft if future drafts exist; current contract creates submitted request directly | Owner + Stage 1 opportunity projection | Request open/published; submitted/published History |
| Discover opportunity | Authenticated professional | Owned business profile + service/area eligibility; non-self open request | Stage 1 | None; optional non-authoritative telemetry only |
| Read opportunity | Same as discover | Exact currently eligible request | Stage 1 plus own unambiguous response capability/state | None |
| Respond | Authenticated professional | Owned business; exact open eligible request; no duplicate live response | Stage 2 for own response; homeowner receives public professional projection | Response + pending relationship; two History events |
| Withdraw response | Responding professional | Exact owned business/response; response `submitted`; relationship `pending` | Stage 2 retained | Response `withdrawn`; relationship closed; History |
| List homeowner responses | Authenticated request owner/representative | Exact owned request | Public business profile, introduction, response state; no private professional contact | None |
| Decline response | Authenticated request owner/representative | Exact response belongs to exact owned request and is `submitted` | Homeowner Stage 2 | Response `declined`; relationship closed; History |
| Select response | Authenticated request owner/representative | Exact request, response, business, pending relationship, versions, no active selection | Stage 3 after commit | Atomic selection transaction and History |
| Create conversation | No independent public client authority | Internal Communication effect authorized only by committed selection transaction | Stage 3 | Conversation/participants; `conversation.created` |
| Send pre-selection message | Nobody | Prohibited; pending relationship has no conversation | None | None; deterministic unavailable response |
| Send post-selection message | Exact selected homeowner/professional participant | Active conversation + active exact relationship + non-terminal governing capability | Stage 3/4 as independently authorized | Canonical message/alert/read evidence; no lifecycle mutation |
| Cancel request | Request owner/representative or governed administrator | Exact request; pre-Commercial Authorization; idempotency | Actor projection; participant terminal projections after commit | Atomic cancellation boundary and History |
| Close request | Authorized Workflow command actor | Exact request and satisfied separately governed closure prerequisites | Participant retained-read projection | Atomic close/dependent transitions and History |
| Read closed records | Original authorized participants/administrator under retention policy | Exact historical participation/ownership; business isolation | Minimum retained stage; operational secrets revoked | None |

Current JWT actor derivation loads the current user and does not trust request bodies for actor identity (`<backend>/index.js:695-750`). Existing response and conversation services already derive the owned profile/participants server-side (`<backend>/server/relationships/requestRelationshipService.js:57-129`; `<backend>/server/conversations/conversationService.js:38-108`).

## 27. Idempotency and Concurrency Contract

| Operation | Required behavior |
|---|---|
| Repeated opportunity GET | Same authorized projection; zero authoritative writes every time |
| Professional response | Required idempotency key/fingerprint plus unique `(requestId, businessProfileId)`; same key/payload returns same result; same key/different payload conflicts; a second live response from same business is deterministic |
| Multiple tabs/network retry | Server, not UI lock, resolves to one result; browser duplicate-tap prevention is supplementary only |
| Withdraw/decline | Same exact terminal retry returns prior result; conflicting transition returns `409` |
| Homeowner selection | Required idempotency and versions; same exact retry returns same selection/conversation; concurrent different response gets one winner |
| Conversation creation | Unique exact relationship/selection link; repeated internal ensure returns same conversation |
| Cancellation/closure | Idempotent exact terminal command; repeated command creates no new dependent transitions/events |
| History | Unique causation/event/object/resulting-version identity; retries never duplicate events |

No idempotency key may contain raw PII. Request fingerprints hash canonical command fields and exact object/version references. Stale version responses cannot overwrite newer authority. Existing `ON CONFLICT` response/conversation behavior is not sufficient by itself because it currently permits read-side promotion and lacks payload fingerprinting (`<backend>/server/relationships/requestRelationshipService.js:131-167`; `<backend>/server/conversations/conversationService.js:77-109`).

## 28. Compatibility Contract

1. `quote_requests`, legacy quote-request messages, and legacy `workflow_events` remain explicitly namespaced and are never treated as `posts`, canonical conversations, Workflow, Quote, or History.
2. Existing legacy records are participant-readable only during a bounded retention window; new creation and mutation retire under 001B-6.
3. Existing opportunity-created ordinary `active` relationships/conversations are **ambiguous legacy contamination**. They must not be silently classified as homeowner-selected. A read-only data inventory and separately authorized reconciliation policy must precede any migration; ambiguous rows fail closed for new commercial capabilities.
4. First-slice opportunity remediation stops new contamination but does not delete, downgrade, or rewrite existing records.
5. Browser-stored request/conversation IDs are navigation hints only. Every route reauthorizes the exact canonical object; request/legacy IDs never substitute for conversation IDs.
6. Assistant/local form data promotes only through explicit successful `POST /posts`.
7. Current response/relationship fields may remain temporary API aliases during an explicit versioned transition, but a client cannot infer separated state from legacy values.
8. Compatibility projections must include provenance (`canonical` or named legacy source) and fail closed if provenance or exact identity is missing.
9. No automatic conversation, selection, Evaluation, Quote, Project, or History creation is permitted while bridging.

The current dual paths and browser routing sources are catalogued in 001A sections 24-25. Active frontend dependency on discovery-created conversation identity appears in `<frontend>/src/pages/BusinessLeads.jsx:457-481` and `<frontend>/src/utils/businessLeadConversationEntry.js:13-93`; those callers must fail closed when 001B-1 removes that unsafe field.

## 29. Required Schema Changes

No schema change is authorized in this milestone. The categories below are migration requirements for later review.

### Definitely required

1. **`professional_responses` identity and state.** Create a distinct response table with exact request/business uniqueness, one-to-one pending relationship linkage, version, state, timestamps, and idempotency/fingerprint. Do not reuse `request_relationships.status` as response disposition.
2. **`request_selections` evidence.** Create an append-preserving selection table with exact request/response/relationship/actor/business references and a partial unique active selection per request.
3. **Relationship separation and sole activity.** Link `request_relationships` one-to-one to `professional_responses`, make its state only `pending|active|closed`, persist closure reason/version/timestamps, and enforce a unique active post-backed relationship.
4. **Conversation-to-selection proof.** Add a source-specific `selection_id` link for ordinary conversations, unique per selection and constrained to the same request/response/relationship; Emergency conversations remain governed separately.
5. **Request/response/relationship versions and terminal reasons.** Conditional commands and precise state separation require version/concurrency values and reason/timestamp fields.
6. **Ordinary request terminal states.** Additive constraint/state support for `expired`, `closed`, and `superseded` before those commands exist.
7. **History/outbox persistence.** Append-only event/correlation/causation/object-version evidence for the events in section 20.
8. **Command idempotency.** Durable response/selection/cancellation command keys, fingerprints, and result references; generic commercial command idempotency does not cover Relationship/Project commands (`<backend>/migrations/202608010001_create_commercial_authority_foundation.sql:106-166`).

### Likely required

- A server-owned publication/expiration deadline if automatic expiration is approved.
- A normalized privacy classification for access notes/sensitive request fields if free-text field-level policy cannot safely derive Stage 3/4.
- Compatibility provenance/quarantine fields for objectively identified read-created relationship/conversation rows, but only after read-only data analysis proves a safe discriminator.
- A request revision table if the later revision/supersession contract requires immutable body versions.

### Not yet justified

- Migration or automatic promotion of `quote_requests`, legacy messages, `workflow_events`, or browser records.
- Reuse of Emergency status or selection data.
- Provider/payment, Quote, Invoice, operational Project, or AI-specific tables in this request-entry remediation.
- A pre-selection conversation table or shared competing-professional room.
- Database drafts absent a separately approved save/resume product contract.

## 30. Required Runtime Changes

In contract order:

1. Replace `materializeProfessionalOpportunities` with a read-only listing service; remove transaction/locks/relationship/conversation CTEs and conversation fields from opportunity output.
2. Make Business Leads treat opportunities as review/response objects, never canonical conversations, and fail closed on absent canonical response capability.
3. Implement explicit Professional Response + pending relationship command against approved schema, with business-derived identity and idempotency.
4. Replace homeowner accept semantics with the atomic selection transaction and exact authoritative response payload.
5. Bind canonical conversation creation to selection only; enforce request/relationship send capability and terminal read-only behavior.
6. Implement server-side Stage 1-4 privacy projections and remove client authority over disclosure.
7. Replace post-only cancellation with atomic propagation; add expiration/closure only after schema/contracts exist.
8. Retire new legacy quote-request creation and mutation while preserving scoped reads; route profile-origin requests to ordinary Request Help without preselection.
9. Integrate History/outbox events for every accepted transition.
10. Keep ordinary Evaluation, Quote, Authorization, payment, scheduling, Project, and Invoice unavailable throughout these slices.

No implementation may use browser storage to repair missing identity, promote legacy state, or compensate for an unavailable backend contract.

## 31. Required Tests

Minimum certification contract:

### Read purity

- Repeated opportunity GET creates no relationship, conversation, response, participant, History, or request status change.
- GET is SQL read-only and does not use mutation-capable helpers.
- Unauthorized/ineligible reads reveal no protected fields or existence.
- Response state is returned only for the authenticated professional's exact business and ambiguous legacy state fails closed.

### Response and pending relationship

- Eligible professional can respond; ineligible/self/cross-business professional cannot.
- Client professional/business/homeowner/relationship/conversation IDs are ignored or rejected.
- Same idempotency key/payload is one result; changed payload conflicts; multiple tabs create one response/pending relationship.
- Response creates only `submitted` response + `pending` relationship; no conversation, selection, Evaluation, Quote, or work authority.
- Withdraw/decline are owner-exact, idempotent, and close the pending relationship.

### Selection

- Exact request owner can select an eligible exact response; non-owner and wrong-request response receive nondisclosing rejection.
- Two concurrent different selections yield one winner; only one active selection/relationship remains.
- Same selection retry returns the same selection and conversation with no duplicate History.
- All other submitted responses become `not_selected`; relationships close exactly.
- Conversation participants/links are exact; any persistence/History failure rolls back everything.
- Selection does not complete Evaluation, issue/accept Quote, authorize work, satisfy payment, schedule, or start work.

### Privacy

- Exact address, unit/access, contact, and owner identity remain absent at Stages 1-2.
- Homeowner receives only approved public professional fields on response.
- Only selected professional receives Stage 3; unselected/closed actors cannot.
- Stage 4 fields remain unavailable before Commercial Authorization.
- Browser-supplied privacy state cannot broaden output.

### Cancellation/closure

- Cancellation removes discovery, transitions every response/relationship/selection/conversation exactly, preserves messages/read access, and records History.
- Repeated cancellation is idempotent; injected failure rolls back; post-Authorization cancellation conflicts.
- Expiration, close without selection, close after selection, and supersession follow section 19 without record deletion or authority transfer.

### Compatibility and separation

- Legacy records remain readable only as defined; new legacy creation/mutation is unavailable after containment.
- No legacy ID can be used as request/response/relationship/conversation ID.
- Compatibility projection never fabricates selection/conversation authority.
- Existing ambiguous read-created rows are not auto-selected or auto-migrated.
- Emergency lifecycle/routes/tests remain unchanged.
- Frontend creates no local/session-storage lifecycle, response, selection, or conversation authority.

Current suites that assert mutation on GET must be replaced, not treated as passing target evidence (`<backend>/test/requestLifecycle.test.js:378-444`). Existing response isolation/conversation rollback suites should be preserved and expanded (`<backend>/test/requestRelationshipService.test.js:516-951`; `<backend>/test/requestRelationshipRoutes.test.js:807-1311`).

## 32. Safe Implementation Sequence

The sequence is refined to keep schema/data reconciliation separate from the immediate no-migration containment and to keep selection/conversation atomic.

| Milestone | Codex task | GPT-5.3 Codex Spark suitable | Recommended model/reasoning | Repositories | Migration | Runtime scope and tests | Stop conditions |
|---|---|---|---|---|---|---|---|
| **001B-1 — Opportunity Read Purity Remediation** | Yes | No | Codex 5.6, high | Backend + frontend | **No** | Remove GET writes/conversation projection; frontend fail-closed review surface; read-purity, privacy, no-conversation-routing tests; focused + affected regression/build | Any need to rewrite existing records, create response authority, change schema, or expose protected data |
| **001B-2 — Response/Selection/History Schema and Reconciliation Design** | Yes | No | Codex 5.6, extra high | Backend (frontend contract review only) | **Yes** | Exact additive migration plan, current-row read-only audit plan, constraints, rollback, ledger tests; no runtime enablement until approved | Existing rows cannot be classified without policy; destructive/backfill choice; database evidence unavailable |
| **001B-3 — Professional Response Contract Alignment** | Yes | No | Codex 5.6, high | Backend + frontend | **Yes** | Explicit response/pending relationship/idempotency; homeowner response list; withdraw/decline; exact isolation and no-conversation tests | Schema not migrated/certified; ambiguous row would be promoted; identity must come from client |
| **001B-4 — Selection, Sole-Selection, Conversation, and Privacy Transaction** | Yes | No | Codex 5.6, extra high | Backend + frontend | **Yes** | Atomic selection + loser disposition + canonical conversation/participants + Stage 3 projection + History; concurrency/rollback/privacy/full conversation regression | Cannot atomically enforce selection and conversation; History unavailable; cross-business ambiguity |
| **001B-5 — Cancellation, Expiration, and Closure Propagation** | Yes | No | Codex 5.6, extra high | Backend + frontend | **Undetermined** | Atomic terminal transitions, closed/read-only conversation, preserved evidence; idempotency/failure injection/retention tests; migration need depends on what 001B-2 has already delivered | Commercial Authorization termination semantics required; destructive deletion; incomplete dependent-object lock |
| **001B-6 — Legacy `/quote-requests` Containment** | Yes | No | Codex 5.6, high | Backend + frontend | **No** | Stop new creation/mutation, preserve scoped reads, redirect/hide UI; route inventory/bundle/storage/identity tests; any later bridge is a different milestone | Existing users require mutation without a retirement decision; any automatic migration or identity inference |
| **001B-7 — Local Cross-Repository Integration Verification** | Yes | Yes | Codex 5.6, high | Backend + frontend | **No** | Full focused/auth/privacy/concurrency/regression/build/static review; no external runtime | Any failing authority/privacy regression or unexplained baseline exception |
| **001B-8 — Staging Migration and Authenticated Certification** | Yes | No | Codex 5.6, extra high | Backend + frontend + authorized staging only | **Yes** | Execute approved migrations only; governed migration, exact deployment identity, multi-account read/response/selection/cancel/privacy certification | Ambiguous target, production risk, ledger mismatch, data conflict, identity/privacy defect |

Selection and canonical conversation runtime are deliberately combined in 001B-4 because the contract requires one atomic boundary. Legacy containment follows canonical response/selection capability so it does not strand users, but unsafe new legacy marketing/entry points may be disabled earlier under a separate emergency authorization.

## 33. Certification Requirements

A runtime slice is certifiable only when:

- repository baseline and exact diff are proven;
- approved migration order/checksum/ledger are proven where applicable;
- route/service/schema/API contracts match this document;
- read-purity, ownership, exact-object, cross-business, privacy, idempotency, concurrency, rollback, and History tests pass;
- full affected backend/frontend regression and production build pass;
- no browser or compatibility fallback creates authority;
- no ordinary capability activates Evaluation, Quote, Authorization, payment, scheduling, Project, or Invoice;
- Emergency behavior is unchanged;
- deployment identity is exact for the authorized environment;
- authenticated multi-account staging verifies the expected positive and negative paths without using fabricated data or mutating production;
- data reconciliation is separately approved and no ambiguous legacy row is silently promoted.

Production remains a separately authorized decision after staging evidence and rollback governance.

## 34. Blocking Decisions

### Contract decisions resolved here

Canonical identity, discovery purity, response/pending semantics, exact selection, one-selected invariant, conversation timing, privacy stages, terminal propagation, state separation, History requirements, legacy containment, and first remediation order are resolved.

### Runtime blockers that remain

- Current opportunity GET still mutates relationships/conversations.
- Current schema conflates response disposition and relationship access and lacks selection/History/idempotency/ordinary sole-active enforcement.
- Existing read-created active relationships/conversations are ambiguous and require an approved reconciliation policy; source alone cannot prove homeowner consent.
- Cancellation does not propagate.
- Frontend Business Leads depends on discovery-created conversation identity.
- Active legacy `/quote-requests`, messages, and workflow-event mutations remain reachable.
- Governance artifacts noted by 001A remain absent/unratified in repository evidence; this contract relies on the task-supplied governing program and does not cure that repository-document status.

These are implementation/data-governance stop conditions, not unresolved alternatives in this authority contract. They prevent broad runtime implementation but do not prevent the bounded 001B-1 read-purity remediation from being prepared.

## 35. Final Contract Determination

**PASS — The authority contract is complete and the first bounded remediation milestone may be prepared.**

The target has one request identity, one explicit participation boundary, one homeowner selection authority, one selected relationship, one post-selection conversation, stage-specific server privacy, deterministic terminal propagation, and explicit legacy containment. No repository evidence needed to choose among those authority models remains unresolved.

This PASS approves planning of the named first slice only. It does not authorize runtime code, tests, schema, migrations, data reconciliation, deployment, or environments.

## 36. Recommended Next Milestone

**MC-CONVERSATION-COMMERCIAL-JOB-REQUEST-001B-1 — Opportunity Read Purity Remediation**

Prepare one bounded cross-repository implementation task that:

1. changes `GET /professional-request-opportunities` to SELECT-only eligibility/projection;
2. removes all relationship promotion, conversation/participant creation, request locks used for mutation, and conversation ID output from that GET;
3. prevents the frontend opportunity surface from treating discovery as a conversation;
4. preserves service/area matching, authentication, privacy filtering, request ordering, bounded caching/retry behavior, and last-confirmed frontend data;
5. adds tests proving repeated GET creates no authoritative state and reveals no protected fields;
6. does not modify or classify existing relationships/conversations;
7. does not create a migration, enable response/selection/Conversation, change Emergency behavior, or touch legacy `/quote-requests` yet.

Stop after preparing that milestone for separate implementation approval.
