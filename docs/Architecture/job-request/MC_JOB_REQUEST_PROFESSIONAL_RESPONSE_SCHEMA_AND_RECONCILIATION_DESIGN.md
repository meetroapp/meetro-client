# MC-CONVERSATION-COMMERCIAL-JOB-REQUEST-001B-2A

# Professional Response Schema and Reconciliation Design

**Design version:** 1.0

**Evidence date:** 2026-08-06

**Execution mode:** Cross-repository schema and reconciliation design only. This document is the only authorized change.

**Frontend root (`<frontend>`):** `/Users/williammolina/meetro-client`

**Backend root (`<backend>`):** `/Users/williammolina/meetro-server/meetro-server`

**Governing contract:** `<frontend>/docs/Architecture/job-request/MC_JOB_REQUEST_RELATIONSHIP_CONVERSATION_AUTHORITY_CONTRACT.md`

Repository paths, symbols, and migration names describe inspected source evidence. Table, column, constraint, error-code, and command names introduced below are target design requirements, not claims about an implemented migration or runtime.

## 1. Executive Summary

The current ordinary response path cannot satisfy the ratified authority contract because one `request_relationships` row carries both response and participation meaning. The safe additive design is:

```text
explicit authenticated response command
  -> one database-generated professional_responses.id
  -> one database-generated request_relationships.id in pending state
  -> reciprocal one-to-one foreign-key linkage
  -> one response version and one submission evidence event
  -> commit all records atomically or commit none
```

The canonical duplicate identity is `(posts.id, contractor_profiles.id)`. The professional user is separately retained as the authenticated actor and business owner; it is not a client-selectable substitute for business identity. A response begins in `submitted`; its linked relationship begins in `pending`. No conversation, participant, selection, workflow transition, or commercial authority is created.

Existing ordinary relationships are not silently promoted. An ordinary row without a canonical response link is legacy and fail-closed. Only a later, separately authorized reconciliation may create a response when affirmative evidence proves an explicit historical response. `active`, conversation presence, and similarity are never selection evidence. Ambiguous rows remain quarantined. Emergency-backed relationships and Emergency response authority are excluded.

The design is complete without amending the governing contract, changing the existing conversation schema at response time, deciding homeowner-selection runtime behavior, or introducing a new canonical engine.

## 2. Governing Authority

This design applies the following fixed authority chain:

1. `MC-CONVERSATION-COMMERCIAL-JOB-REQUEST-001` Master Program v2.0.
2. `001A` repository truth investigation.
3. `001B` ratified Relationship and Conversation Authority Contract.
4. `001B-1` Opportunity Read Purity Remediation.
5. The blocked `001B-2` runtime investigation and the supplied 001B-2A authority clarifications.

The governing invariants are unchanged:

- Opportunity discovery is read-only.
- An explicit Professional Response begins participation.
- `ProfessionalResponse` and `RequestRelationship` are distinct Relationship Engine objects.
- They are created and linked one-to-one in one transaction.
- Submission does not activate the relationship and creates no conversation.
- Homeowner selection is a later independent authority action.
- Only a selected relationship can authorize canonical conversation creation under Model B.
- The browser supplies content and an idempotency key, never canonical identity, ownership, status, selection, or conversation authority.

The current repository contract states the same target at `<frontend>/docs/Architecture/job-request/MC_JOB_REQUEST_RELATIONSHIP_CONVERSATION_AUTHORITY_CONTRACT.md:144-185,294-343,646-690`. This document specifies the persistence and reconciliation design needed to implement it; it does not supersede or reinterpret it.

## 3. Current Schema Truth

Repository migration files prove intended schema, not deployed database state. No database was accessed.

### Ordinary and Emergency relationships

`<backend>/migrations/202607200002_create_request_relationships.sql` creates `request_relationships` with:

- database-generated integer `id`;
- `post_id`, `homeowner_id`, `contractor_id`, and `professional_user_id`;
- one mixed `status` constrained to `pending`, `active`, `declined`, `withdrawn`, or `closed`;
- `introduction_text` and response/transition timestamps;
- a uniqueness boundary originally expressed as `(post_id, contractor_id)`.

`<backend>/migrations/202607230002_add_emergency_relationship_source.sql` makes the same table source-polymorphic:

- exactly one of `post_id` or `emergency_request_id` must be present;
- ordinary uniqueness is the partial unique index `(post_id, contractor_id) WHERE post_id IS NOT NULL`;
- Emergency uniqueness is separately `(emergency_request_id, contractor_id) WHERE emergency_request_id IS NOT NULL`.

The shared table is safe only while new ordinary response constraints are source-scoped and do not reinterpret Emergency rows.

### Business ownership

`contractor_profiles.id` is the database-owned business profile identity. `contractor_profiles.user_id` owns it, but the baseline has only a non-unique index on `user_id` (`<backend>/migrations/202607050001_initial_schema_baseline.sql:32-43,101-102`). The current response service selects a profile with `WHERE user_id = $1 LIMIT 1` without deterministic multi-profile resolution (`<backend>/server/relationships/requestRelationshipService.js:55-66`). The new command must therefore derive an exact owned profile deterministically and fail closed when ownership resolution is ambiguous; it may not accept a client business ID.

### Current response and selection behavior

`createProfessionalRequestRelationship` authenticates through its caller, validates a bounded introduction, locks an open non-self `posts` row, rechecks eligibility, and inserts or returns a `pending` relationship (`<backend>/server/relationships/requestRelationshipService.js:13-201`). It creates no distinct response identity, version, durable idempotency record, or History evidence.

The current homeowner accept path changes the same row to `active` and calls `ensureConversationWithClient` in one transaction (`<backend>/server/relationships/requestRelationshipService.js:600-711`). It creates no canonical selection record. That path is evidence of the legacy contradiction, not authority that this design may preserve or extend.

### Conversations

`<backend>/migrations/202607200003_create_conversations.sql` makes `conversations.relationship_id` unique and requires a relationship, while conversation services require active relationship state for creation. The existing schema needs no response-stage conversation column. A later selection milestone must add exact selection linkage before selected-conversation authority is considered complete.

### Reusable repository patterns

The additive commercial migrations use snake_case, explicit ownership, `TIMESTAMPTZ`, bounded checks, `ON DELETE RESTRICT`, UUID command/evidence identity, SHA-256 request fingerprints, scoped idempotency uniqueness, version rows, and append-only evidence (`<backend>/migrations/202608010001_create_commercial_authority_foundation.sql`; `202608010002_create_canonical_evaluations.sql`). Those are structural precedents only. Professional Responses remain Relationship Engine authority and must not be stored in or reinterpreted as Authorization Engine commercial aggregates.

## 4. Root Authority Gap

The schema cannot currently prove these distinct facts at the same time:

```text
response submitted
relationship pending
homeowner has not selected
conversation does not exist
```

The one mixed relationship row lacks:

- independent response identity and lifecycle;
- a one-to-one response/relationship link;
- immutable response versions;
- command idempotency and fingerprint evidence;
- response-specific History;
- exact future selection reference;
- provenance distinguishing canonical response-created rows from legacy rows;
- a safe way to reconcile or quarantine pre-contract rows.

Reusing the relationship ID as a response ID, treating `introduction_text` as response identity, or treating `active` as selected would manufacture authority. A new Relationship Engine response aggregate is therefore definitely required.

## 5. Canonical Object Definitions

| Object | Canonical identity | Owner | Meaning | Explicit non-authority |
|---|---|---|---|---|
| Job Request | `posts.id` | Project/request authority | Exact ordinary work request | Does not identify a responder |
| Professional Response | `professional_responses.id` | Relationship Engine | One business explicitly submitted participation for one Job Request | Not selection, relationship activation, conversation, Quote, or work authorization |
| Pending RequestRelationship | `request_relationships.id` | Relationship Engine | Limited participation link that makes the response eligible for homeowner review | Not selected provider, messaging authority, or commercial authorization |
| Response Version | `(response_id, version)` | Relationship Engine | Immutable response state/content snapshot | Does not execute a transition |
| Response Command Idempotency | UUID | Relationship Engine | Durable retry/result record for a command scope | Does not itself create response authority |
| Response Evidence | UUID and `(response_id, resulting_version)` | History evidence for Relationship authority | Append-only proof of an accepted response transition | Does not cause the transition |
| Request Selection | future backend identity | Relationship/Authorization boundary | Homeowner's exact choice of one response and relationship | Not implemented here |
| Conversation | existing `conversations.id` | Communication Engine | Participant communication after selection | Never created by response submission |

## 6. ProfessionalResponse Identity

The canonical SQL name is `professional_responses`; the API/domain name is `ProfessionalResponse`; the public serialized key follows current camelCase convention as `responseId`.

The required current-row columns are:

| Column | Contract |
|---|---|
| `id BIGSERIAL PRIMARY KEY` | Database-generated canonical response identity; never accepted from the client |
| `post_id INTEGER NOT NULL` | Exact ordinary Job Request; `ON DELETE RESTRICT` |
| `request_relationship_id INTEGER NOT NULL UNIQUE` | Exact pending participation relationship; reciprocal deferred linkage |
| `homeowner_id INTEGER NOT NULL` | Snapshot constrained to `posts.user_id`; server-derived |
| `contractor_id INTEGER NOT NULL` | Canonical business profile; server-derived |
| `professional_user_id INTEGER NOT NULL` | Authenticated professional and business-owner evidence; server-derived |
| `status TEXT NOT NULL` | Response lifecycle only, never relationship state |
| `introduction_text TEXT NOT NULL` | Trimmed, bounded approved response content; not identity |
| `origin TEXT NOT NULL` | `canonical_command` or `legacy_reconciliation`; never client-controlled |
| `current_version INTEGER NOT NULL DEFAULT 1` | Monotonic, at least one |
| `submitted_at TIMESTAMPTZ NOT NULL` | Authoritative submission time |
| `selected_at TIMESTAMPTZ` | Reserved for a later exact selection transition |
| `terminal_at TIMESTAMPTZ` | Required for terminal response states |
| `created_at`, `updated_at TIMESTAMPTZ NOT NULL` | Persistence timestamps |

`post_id`, `homeowner_id`, `contractor_id`, and `professional_user_id` are denormalized identity assertions, not alternate authorities. Composite foreign keys must prove they match the Job Request, business owner, and linked relationship.

The response ID must not be supplied, generated, guessed, cached as authority, or remapped by the browser. `BIGSERIAL` is consistent with the existing database-generated `SERIAL` request and relationship family. A future migration may choose `GENERATED BY DEFAULT AS IDENTITY` while preserving the same backend-generated contract; UUID is not required merely because the Authorization Engine uses UUID aggregates.

## 7. Pending RequestRelationship Definition

For a canonical ordinary response, the linked `request_relationships` row represents participation eligibility only.

Required additive columns are:

| Column | Contract |
|---|---|
| `professional_response_id BIGINT UNIQUE` | Null for unreconciled legacy and all Emergency rows; non-null for canonical ordinary response relationships |
| `ordinary_authority_source TEXT` | Null means legacy/unclassified; `professional_response` means the row was created or reconciled under this contract |
| `current_version INTEGER` | Required for canonical ordinary rows; monotonic relationship state version |
| `closure_reason TEXT` | Required only when a canonical relationship closes; bounded server enum |

A source-scoped check must permit exactly these shapes:

```text
Emergency row:
  emergency_request_id present
  professional_response_id null
  ordinary_authority_source null

Legacy ordinary row:
  post_id present
  professional_response_id null
  ordinary_authority_source null

Canonical ordinary row:
  post_id present
  professional_response_id present
  ordinary_authority_source = professional_response
```

Canonical response submission creates the relationship in `pending`. It grants only the response/opportunity projections approved by the governing contract. Exact location, unit/access details, direct contact, messaging, Evaluation, Quote, scheduling, and work remain unavailable.

A canonical response relationship may never commit without its response, and a response may never commit without its relationship. Null response linkage remains permitted only to preserve source-separated Emergency rows and unresolved legacy ordinary rows. Physical deletion is prohibited; terminal state and evidence preserve history.

## 8. One-to-One Linkage

Both records hold an explicit reciprocal link so neither can be substituted by a same-party or same-request lookup:

- `professional_responses.request_relationship_id` is `NOT NULL UNIQUE`.
- `request_relationships.professional_response_id` is unique where non-null.
- `professional_responses` has `UNIQUE (id, request_relationship_id)`.
- `request_relationships` has `UNIQUE (id, professional_response_id)`.
- A deferred composite foreign key from `(request_relationship_id, id)` references `request_relationships(id, professional_response_id)`.
- A deferred composite foreign key from `(professional_response_id, id)` references `professional_responses(id, request_relationship_id)`.

Both cross-links are `DEFERRABLE INITIALLY DEFERRED` and `ON DELETE RESTRICT`. The transaction may assemble the circular pair, but commit is impossible unless the exact IDs reciprocally match.

Additional composite constraints prove all parties match:

- `(post_id, homeowner_id)` references a unique `(posts.id, posts.user_id)` pair.
- `(contractor_id, professional_user_id)` references a unique `(contractor_profiles.id, contractor_profiles.user_id)` pair.
- `(request_relationship_id, post_id, homeowner_id, contractor_id, professional_user_id)` references the exact unique relationship tuple.

These composite keys are deliberately redundant with primary keys. They turn ownership and linkage assumptions into database invariants instead of relying on serializer or query discipline.

## 9. Creation Transaction

The future response command must use one database transaction and this order:

1. Authenticate and derive `professional_user_id` from the verified session.
2. Normalize and validate the idempotency key and bounded response content before opening authority writes.
3. Begin the transaction and reserve the scoped idempotency row.
4. Resolve exactly one backend-owned business profile. Zero profiles fails `PROFESSIONAL_PROFILE_REQUIRED`; more than one candidate without an already-governed deterministic business rule fails `PROFESSIONAL_PROFILE_AMBIGUOUS`.
5. Lock the exact `posts` row with `FOR UPDATE`; derive its homeowner and verify open, visible, response-permitted, non-self, non-cancelled, non-expired, and eligible state.
6. Check the canonical selection source. Before `RequestSelection` exists, any legacy active or conversation-linked ordinary relationship makes selection state unresolved and the command fails closed. After 001B-3, a non-ended selection deterministically rejects further response creation.
7. Check `(post_id, contractor_id)` canonical uniqueness and idempotency resolution.
8. Reserve database sequence values for both response and relationship IDs.
9. Insert the `professional_responses` row with the reserved relationship ID.
10. Insert the `request_relationships` row with the reserved response ID, `pending`, and `ordinary_authority_source = 'professional_response'`.
11. Insert response version 1 and the submission evidence event.
12. Complete the idempotency result with only approved response/relationship references.
13. Run deferred state/link consistency checks and commit.
14. Serialize the committed canonical response and relationship projection.

Any validation, insert, evidence, idempotency, or deferred-constraint failure rolls back every write. There is no compensating conversation cleanup because the transaction does not create a conversation. A retry after an ambiguous network result resolves through the idempotency and semantic uniqueness records.

## 10. Duplicate Boundary

The canonical participation key is:

```text
canonical posts.id + backend-owned contractor_profiles.id
```

The database constraint is `UNIQUE (post_id, contractor_id)` on `professional_responses`. The existing ordinary partial unique relationship index remains a compatible second barrier.

Rationale:

- the response is an offer by a business for one Job Request;
- `contractor_profiles.id` is the existing business identity used by relationship uniqueness and professional opportunity logic;
- `professional_user_id` proves the authenticated owner/actor but does not replace the business;
- `contractor_profiles.user_id` is not unique, so `(post_id, professional_user_id)` alone could collapse distinct backend-owned businesses without a separately ratified multi-business rule;
- `(post_id, professional_user_id, contractor_id)` is weaker than `(post_id, contractor_id)` and would permit duplicates if actor ownership changed.

Response text, JSON property order, whitespace after normalization, timestamps, retries, route state, client-generated IDs, and client idempotency-key changes do not alter this identity. A changed introduction is not a new response and must not silently edit the stored response.

## 11. Idempotency Contract

Relationship Engine command idempotency must use a dedicated additive table, `professional_response_command_idempotency`. It must not reuse `commercial_command_idempotency`, which is owned by the Authorization Engine and constrained to commercial aggregate commands.

Required fields:

```text
id UUID PRIMARY KEY                         -- server-generated
actor_user_id INTEGER NOT NULL             -- authenticated user
contractor_id INTEGER NOT NULL              -- backend-resolved business
post_id INTEGER NOT NULL                    -- exact Job Request
command_name TEXT NOT NULL                  -- professional_response.submit initially
command_scope TEXT NOT NULL                 -- post:<id>:business:<id>
idempotency_key TEXT NOT NULL               -- bounded 1..200
request_fingerprint TEXT NOT NULL           -- canonical SHA-256 lowercase hex
professional_response_id BIGINT
request_relationship_id INTEGER
result_reference JSONB
completed_at TIMESTAMPTZ
created_at TIMESTAMPTZ NOT NULL
```

The unique key is `(actor_user_id, command_name, command_scope, idempotency_key)`. The semantic unique response key remains independent and authoritative.

Resolution rules are exact:

| Condition | Result |
|---|---|
| Same key, scope, and fingerprint; completed result | Return the same canonical response and relationship; no new evidence event |
| Same key and scope, different fingerprint | Deterministic `409 IDEMPOTENCY_KEY_REUSED` |
| New key but response already exists for `(post_id, contractor_id)` | Return the existing unchanged response with `created: false`; record the new idempotency result, but do not create response History |
| Concurrent same or different keys | Unique constraints select one canonical pair; losing transaction resolves and returns that pair after retry |
| In-progress key after recoverable concurrency | Retry the bounded transaction; never fabricate success or IDs |
| Existing pair belongs to inconsistent actor/business ownership | Fail closed; do not disclose the record |

The canonical fingerprint includes the normalized `post_id`, backend-resolved `contractor_id`, command name, and normalized introduction content. Client-generated identity fields are rejected or ignored before fingerprinting and never participate in the duplicate key.

## 12. Response Lifecycle

The target response states remain the ratified exact set:

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

`superseded` is not added; selection of another response maps to `not_selected`, while replacement of a request belongs to request lifecycle and may close the response with evidence.

| Response state | Meaning | Terminal | Required linked relationship state |
|---|---|---:|---|
| `submitted` | Explicit response exists and awaits homeowner disposition | No | `pending` |
| `withdrawn` | Professional withdrew before selection | Yes | `closed` / `professional_withdrew` |
| `declined` | Homeowner expressly declined this response | Yes | `closed` / `homeowner_declined` |
| `selected` | Future exact `RequestSelection` chose this response | No | `active` |
| `not_selected` | Another exact response was selected | Yes | `closed` / `other_professional_selected` |
| `expired` | Request response window expired | Yes | `closed` / `request_expired` |
| `cancelled` | Request was cancelled before this response completed | Yes | `closed` / `request_cancelled` |
| `closed` | Selected or otherwise retained response reached governed closure | Yes | `closed` with a specific reason |

Creation writes only `submitted`. The initial 001B-2B migration/runtime must not expose any transition command not separately authorized. `selected` becomes writable only when 001B-3 adds and enforces exact `RequestSelection` linkage. `terminal_at` is required for terminal states; `selected_at` is written only by the later selection transaction and retained if a selected response later closes.

Each accepted transition increments `current_version`, inserts one immutable version snapshot, inserts one evidence event, and changes its linked relationship in the same transaction. Browser state cannot advance, reconstruct, or repair a response lifecycle.

## 13. Relationship Lifecycle

The canonical ordinary relationship state is the already-ratified reduced set:

```text
pending
active
closed
```

- `pending` begins only with a canonical submitted response. It represents participation and eligibility for later selection.
- `active` begins only inside the future exact homeowner-selection transaction. An `active` legacy row is not retroactive selection proof.
- `closed` is terminal for the relationship instance and requires a server-owned `closure_reason`.

The existing `declined` and `withdrawn` relationship statuses may remain for Emergency and legacy compatibility. New canonical ordinary commands must express those outcomes on `professional_responses` and close the linked relationship. A later separately reviewed migration may narrow or translate legacy relationship states only after reconciliation evidence exists.

A canonical state-pair constraint trigger, deferred to transaction commit, must enforce the response-to-relationship mapping in section 12. This prevents `submitted + active`, `selected + pending`, or terminal response + pending relationship combinations from committing. The trigger must be ordinary-response scoped and must not evaluate Emergency rows.

The pending relationship establishes no selected provider, work authorization, Evaluation, Quote, schedule, exact-location access, or conversation authority.

## 14. Selection Readiness

The future `RequestSelection` must be a separate backend-owned row, not a response flag or a browser action log. Its minimum schema contract is:

```text
selection_id
post_id
professional_response_id
request_relationship_id
homeowner_id
contractor_id
professional_user_id
selected_at
ended_at / end_reason
version
idempotency and fingerprint reference
selection evidence reference
```

Required future constraints:

- every identity tuple matches the selected response and relationship;
- one non-ended selection per `post_id` through a partial unique index;
- one selection for a response and relationship instance;
- the selecting actor equals the Job Request homeowner;
- the response is `submitted` and the relationship is `pending` at lock time;
- the winning response becomes `selected` and relationship `active` atomically;
- losing submitted responses become `not_selected` and their relationships close atomically;
- exact selection evidence and idempotency complete in the same transaction;
- only after those writes succeed may Communication create or resolve one conversation for the selected relationship.

Before this selection table is present, 001B-2B must not infer selection. A request having an ordinary legacy `active` row or a conversation-linked ordinary row is `selection_state_unresolved` and must reject new response creation without revealing another professional's identity. This is the smallest fail-closed rule for already-selected-like requests and does not invent post-selection response authority.

After 001B-3, only a non-ended canonical selection is authoritative. Closed, cancelled, expired, or otherwise response-prohibited requests reject response submission. Exact codes may follow repository error naming, but their semantic categories must remain stable and privacy-safe.

## 15. Conversation Boundary

Response submission has no conversation dependency and performs no Communication write:

```text
professional_response_id: present
request_relationship_id: present and pending
selection_id: absent
conversation_id: absent
participants: absent
messages: absent
```

No response or pending relationship column may require a conversation, participant, message, or thread ID. No response projection may expose a conversation ID.

The future selection transaction should establish `request_selections.id` first and then invoke Communication for the exact active relationship. The existing `conversations.relationship_id UNIQUE` continues to provide one conversation per relationship. Because it cannot prove that the relationship was selected, 001B-3 must add a nullable `conversations.request_selection_id` (or an equivalently strict bridge table) with a unique, reciprocal consistency constraint. Existing conversations stay legacy/unresolved until governed reconciliation; presence alone is never selection evidence.

That later conversation linkage is not a prerequisite for response persistence and is not created or modified by this milestone.

## 16. Projection and Privacy

All projections are server-derived from authenticated actor, exact canonical links, and current stage.

### Professional self-projection

May contain:

- `responseId`, `responseStatus`, `submittedAt`, `updatedAt`;
- own approved introduction;
- `relationshipId`, `relationshipStatus`;
- later `isSelected` only from canonical selection;
- `conversationId` only after exact selection and participant authorization.

It must not add homeowner identity, precise address, unit, access notes, gate code, contact data, private media, other responses, or pre-selection conversation identity.

### Homeowner projection

May contain the exact response/relationship IDs, introduction, approved public business identity, response status, relationship status, and submission time needed for review. It must not expose internal professional account data, private contact data, internal notes, another business's private response through an unrelated response route, idempotency values, fingerprints, or reconciliation details.

### Opportunity projection

For the authenticated business, repository-consistent fields may be:

```text
hasResponded
responseStatus
relationshipStatus
isSelected
conversationId
```

Rules:

- `hasResponded` is true only for that business's canonical response or an explicitly reconciled response.
- Response and relationship statuses remain separate fields.
- `isSelected` is false/unknown until canonical selection exists; legacy `active` does not set it true.
- `conversationId` is omitted/null unless selected-conversation authorization is canonical and the user is a participant.
- Malformed, ambiguous, cross-owner, legacy-unresolved, or mismatched enrichment fails closed without disclosing the underlying record.

No projection may expose precise address, unit/access information, gate codes, private contact information, private messages, other professionals' response content, raw fingerprints, idempotency keys, evidence payloads, or conversation identity before selection.

## 17. Legacy Relationship Classification

Read-only inventory must classify each `request_relationships` row before any reconciliation. Categories are mutually exclusive and source-aware:

| Classification | Evidence | Authority decision |
|---|---|---|
| `emergency_excluded` | `emergency_request_id IS NOT NULL` | Never create an ordinary Professional Response |
| `ordinary_pending_candidate` | Ordinary `pending`, bounded nonblank introduction, participant tuple consistent, no conversation | Candidate only; not canonical until affirmative response evidence is approved |
| `ordinary_pending_ambiguous` | Ordinary `pending` missing introduction, participant mismatch, duplicate/provenance conflict, or unexpected timestamps | Quarantine and fail closed |
| `ordinary_active_discovery_legacy` | Ordinary `active`, especially empty introduction or evidence of former read-side creation | Preserve legacy; never infer response or selection |
| `ordinary_active_conversation_linked` | Ordinary `active` with conversation | Quarantine; never infer homeowner selection from state or conversation |
| `ordinary_terminal_candidate` | `declined`, `withdrawn`, or `closed` plus affirmative response-origin evidence | Candidate for terminal historical reconciliation only |
| `ordinary_terminal_ambiguous` | Terminal row without affirmative response provenance | Preserve and quarantine |
| `participant_or_owner_mismatch` | Relationship tuple conflicts with `posts` owner or business owner | Quarantine; security review required |
| `duplicate_or_collision` | More than one logical participant row, bridge conflict, or inconsistent uniqueness history | Quarantine; no automated merge |
| `already_reconciled` | Exact reciprocal canonical response link and reconciliation evidence | Validate; do not create another response |

The inventory must count rows without returning response text, addresses, access details, direct contact, or unrelated participant identity to operators who do not require it.

## 18. Reconciliation Policy

Schema installation and legacy reconciliation are separate operations. The additive foundation performs no response backfill and no relationship-status rewrite.

The governing policy is:

1. Existing Emergency relationships are excluded.
2. Existing ordinary rows with null `professional_response_id` remain legacy/unresolved and are ignored by canonical response, selection, and conversation authority.
3. No row is mapped solely because it is `pending`, `active`, has a conversation, has matching parties, or resembles a response.
4. An `ordinary_pending_candidate` may be reconciled only through a separately authorized, idempotent command or governed batch with affirmative provenance that an explicit response command created it. A nonblank introduction is necessary repository evidence but is not sufficient by itself.
5. `active` and conversation-linked rows are never automatically reconciled to `selected`. They remain quarantined until exact homeowner-selection evidence exists outside inference.
6. Terminal rows may be reconciled only when affirmative response provenance and exact terminal transition evidence both exist. Otherwise they remain unresolved.
7. Reconciliation creates one `professional_responses` row with `origin = 'legacy_reconciliation'`, reciprocally links the existing relationship, writes version/evidence records, and never creates selection or conversation.
8. Existing conversation rows are preserved but do not become authorized by response reconciliation.
9. Reconciliation conflicts or insufficient evidence create a non-authoritative reconciliation decision record; they do not create a response, status, or History event pretending that a response existed.
10. Reconciliation is rerunnable by relationship ID and evidence fingerprint. It returns the prior decision or canonical response without duplication.

A dedicated `professional_response_reconciliations` table is required before any reconciliation write. It records `relationship_id`, classification, decision (`reconciled`, `quarantined`, `excluded`, `unresolved`), evidence fingerprint and bounded safe evidence metadata, optional `professional_response_id`, reviewer/command identity, timestamps, and a monotonically versioned decision. It is an audit/control record, not response, selection, or conversation authority.

## 19. Migration Design

No executable migration is created by this milestone. The future migration must be additive, transactional, checksum-governed, staging-first, and ordered after all currently approved migrations.

### Definitely required

1. Add `professional_responses` with current identity, lifecycle, provenance, timestamp, uniqueness, and restricted foreign keys.
2. Add `professional_response_versions` with primary key `(professional_response_id, version)`, immutable response snapshot, actor/transition source, and timestamp.
3. Add `professional_response_command_idempotency` with scoped key/fingerprint/result constraints.
4. Add `professional_response_evidence` with immutable response/version/action evidence and no authority-creating semantics.
5. Add `professional_response_reconciliations` before any legacy reconciliation is performed.
6. Add nullable `professional_response_id`, nullable `ordinary_authority_source`, `current_version`, and `closure_reason` to `request_relationships`.
7. Add redundant unique pairs to `posts` and `contractor_profiles` needed for composite ownership foreign keys.
8. Add reciprocal, party-consistency, source-shape, lifecycle/timestamp, and deferred state-pair constraints.
9. Preserve the existing ordinary `(post_id, contractor_id)` relationship unique index and add the same semantic unique constraint to `professional_responses`.
10. Leave every existing relationship unlinked and unmodified except nullable-column/default metadata needed to install the schema. Do not manufacture response rows.
11. Add read-only pre/post validation queries and migration-ledger verification.

### Likely required

1. A later `request_selections` migration with exact response/relationship linkage and one non-ended selection per Job Request.
2. A later selection bridge on `conversations` so conversation authority can be proven from the exact selection rather than active relationship state alone.
3. A Relationship Engine outbox if delivery of post-commit notices must be durable. An outbox is not needed merely to persist response authority.
4. A governed reconciliation runner and operator-safe summary report after the foundation is deployed and runtime reads fail closed on legacy rows.
5. A deterministic business-profile ownership policy if multiple profiles per user are a supported product capability. Until then, the response command fails closed on ambiguity.

### Not yet justified

1. Changes to `posts` lifecycle or a new Job Request table.
2. Any replacement of `request_relationships` or Emergency relationship tables.
3. A response-stage conversation, participant, message, or notification table change.
4. Quote, Evaluation, Authorization, Invoice, Payment, Project, schedule, or workflow-event schema changes.
5. Automatic legacy backfill, deletion, deduplication, status rewrite, or conversation repair.
6. A client-generated response identity, globally shared idempotency table, or reuse of `commercial_authority_aggregates`.
7. `archived_at` or physical-retention columns before a ratified retention/archive contract; terminal records remain retained with `ON DELETE RESTRICT`.

### Ordering and rollback

Recommended migration sequence:

```text
precheck exact prior migration ledger and schema
  -> add ownership helper unique constraints
  -> create response/idempotency/version/evidence/reconciliation tables
  -> add nullable relationship linkage/provenance columns
  -> add indexes and NOT VALID source/composite constraints where needed
  -> validate empty-new-table constraints
  -> validate legacy-safe relationship shape constraints
  -> record migration exactly once
  -> deploy runtime that writes only canonical pairs
  -> run read-only legacy classification
  -> separately approve any reconciliation
```

Before canonical writes, rollback may drop only the newly added objects after proving zero references. After any response or reconciliation write, rollback is roll-forward: disable new commands, preserve records, and deploy a corrective migration. Dropping response/evidence records or nulling canonical links is prohibited.

Validation queries must prove new-table counts, orphan counts, reciprocal-link mismatches, party tuple mismatches, duplicate semantic keys, illegal state pairs, Emergency links (must be zero), selection/conversation creation (must be zero), and unchanged legacy relationship counts/statuses. Queries return counts and bounded identifiers only, never response content or protected request fields.

## 20. Constraints and Indexes

The future migration must implement at least:

### Professional response

- primary key on `id`;
- unique `(post_id, contractor_id)`;
- unique `request_relationship_id`;
- unique `(id, request_relationship_id)` for reciprocal linkage;
- foreign keys to `posts`, `users`, and `contractor_profiles`, all `ON DELETE RESTRICT`;
- composite Job Request owner and business owner foreign keys;
- composite exact relationship-party foreign key;
- bounded `introduction_text` (current validator contract: trimmed 1..2000 characters);
- state check and state/timestamp consistency checks;
- `origin IN ('canonical_command', 'legacy_reconciliation')`;
- `current_version >= 1`;
- indexes `(professional_user_id, submitted_at DESC, id ASC)`, `(homeowner_id, submitted_at DESC, id ASC)`, and `(post_id, status, submitted_at ASC, id ASC)`.

### Request relationship

- unique partial `professional_response_id WHERE professional_response_id IS NOT NULL`;
- unique `(id, professional_response_id)` for reciprocal linkage;
- deferred reciprocal foreign key to the response;
- ordinary/Emergency/legacy source-shape check;
- `current_version >= 1` when `ordinary_authority_source = 'professional_response'`;
- closure-reason consistency for canonical closed rows;
- deferred source-scoped response/relationship state-pair constraint trigger.

### Idempotency, versions, evidence, and reconciliation

- scoped idempotency unique key and lowercase 64-character SHA-256 check;
- all-or-none completed-result constraint;
- version primary key and continuity enforced by locked current row plus service checks;
- evidence unique `(professional_response_id, resulting_version)` for authority-changing events;
- evidence `previous_version + 1 = resulting_version` except creation `0 -> 1`;
- reconciliation unique relationship identity plus decision/evidence-fingerprint idempotency;
- JSON values constrained to objects and bounded by service validation;
- no index containing introduction text, private request content, address, contact data, or message content.

Constraint names should use repository snake_case and object prefixes. Exact DDL must be reviewed in the separately authorized migration milestone.

## 21. History and Evidence

`professional_response_versions` preserves aggregate snapshots; `professional_response_evidence` preserves why an accepted transition occurred. Both remain Relationship Engine records consumable by History and do not introduce another engine.

Required authoritative evidence types are:

```text
professional_response_submitted
professional_response_withdrawn
professional_response_declined
professional_response_selected
professional_response_not_selected
professional_response_expired
professional_response_cancelled
professional_response_closed
legacy_professional_response_reconciled
```

Each evidence row records the exact response, relationship, Job Request, actor and actor role (or governed system actor), previous/resulting versions, occurred/persisted time, idempotency reference, source command, safe bounded payload, governing contract, and implementation milestone.

`duplicate retry resolved` is not an authority transition and must not create another response version or canonical response History event. The idempotency row records the replay result; operational telemetry may count it without containing PII. `reconciliation failed` or `remained unresolved` likewise belongs in `professional_response_reconciliations` and security-safe operational audit, because no Professional Response authority was created.

Evidence payloads must exclude response text unless a specifically approved immutable snapshot requirement later demands it; the version table already stores authorized response content. They must always exclude addresses, unit/access information, contact data, private messages, idempotency keys, and raw fingerprints from general projections and logs.

## 22. Authorization Contract

The future submit command must prove this chain from backend sources:

```text
authenticated req.user.id
  -> backend-owned professional account capability
  -> exact backend-owned contractor_profiles row
  -> exact posts.id locked for command
  -> request visibility
  -> current service and service-area eligibility
  -> open and response-permitted state
  -> homeowner derived from posts.user_id
  -> homeowner != professional user
  -> not cancelled, expired, closed, or canonically selected
  -> no ambiguous legacy active/conversation-linked state
  -> semantic duplicate and idempotency resolution
  -> atomic response + pending relationship + version + evidence
```

Client fields named `professionalId`, `professionalUserId`, `businessId`, `contractorId`, `responseId`, `relationshipId`, `requesterId`, `homeownerId`, `selectionId`, or `conversationId` are never trusted. The endpoint may reject them as unsupported identity fields or ignore them consistently, but tests must prove they cannot alter ownership or the created tuple.

Closed, cancelled, expired, self-owned, invisible, ineligible, or ambiguous already-selected-like requests fail before authority writes. The response failure contract must not reveal whether another professional responded, was selected, or has a conversation.

## 23. Emergency Separation

Emergency response authority remains separate and unchanged:

- Emergency requests use `emergency_requests.id`, Emergency-specific eligibility/dispatch services, and Emergency relationship transitions.
- `professional_responses.post_id` is non-null and references only `posts`; there is no `emergency_request_id` column in the ordinary response table.
- A linked canonical ordinary relationship must have `post_id IS NOT NULL` and `emergency_request_id IS NULL`.
- An Emergency relationship must have `professional_response_id IS NULL` and `ordinary_authority_source IS NULL`.
- State-pair triggers, reconciliation commands, uniqueness checks, projections, and response APIs explicitly filter to ordinary source.
- Emergency relationship status, selection, dispatch, conversation creation, response counts, and current unique indexes remain untouched.

Shared `request_relationships` storage does not make the authorities interchangeable. Any migration or runtime test that links an Emergency row to `professional_responses` must fail.

## 24. Required Tests for 001B-2B

### Migration and schema

- Migration is additive, ordered, idempotent under the repository migration runner, and contains no destructive SQL or data backfill.
- New tables, columns, checks, foreign keys, unique indexes, deferred reciprocal links, and source-scoped triggers match this design.
- Existing ordinary and Emergency rows remain unchanged and valid.
- Emergency relationships cannot link to ordinary responses.
- Orphan, mismatched-party, nonreciprocal-link, duplicate-business/request, and illegal state-pair inserts fail.
- No package, environment, or unrelated migration behavior changes.

### Creation

- One eligible submit creates exactly one response in `submitted` and one linked relationship in `pending`.
- Both server-generated IDs are returned only after commit and reciprocally match.
- Version 1, one evidence event, and one completed idempotency result exist.
- No conversation, participant, message, selection, workflow advancement, Evaluation, Quote, or other commercial record is created.
- Any insert/evidence/constraint failure rolls back the entire pair.

### Duplicate and concurrency

- Same key/same fingerprint returns the existing pair.
- Same key/different fingerprint returns deterministic conflict.
- New key, changed message text, changed JSON order, timestamps, or client IDs cannot create another pair or modify the original.
- Concurrent same-key and different-key submissions result in exactly one response and one relationship.
- Transaction retry cannot append duplicate version/evidence rows.

### Identity and authorization

- Client-supplied professional, business, response, relationship, requester, homeowner, conversation, and selection IDs cannot affect identity.
- No profile, multiple ambiguous profiles, wrong user/business, self-response, invisible/ineligible request, closed/cancelled/expired request, and missing request fail without writes.
- A legacy `active` or conversation-linked request fails closed as selection state unresolved.
- Existing canonical response returns only to its current authorized business owner.

### Projection and privacy

- Professional self, homeowner review, and opportunity projections keep response/relationship/selection/conversation truth separate.
- No precise address, unit/access data, contact data, private messages, other professional response content, fingerprint, idempotency key, or pre-selection conversation ID leaks.
- Malformed or mismatched links fail closed.

### Legacy and Emergency

- Pending candidate, pending ambiguous, active discovery legacy, conversation-linked, terminal, owner mismatch, duplicate/collision, and Emergency classifications are deterministic and read-only.
- No classification automatically creates a response.
- Governed reconciliation is idempotent, only maps affirmative evidence, and creates no selection or conversation.
- Unresolved/quarantined rows never appear canonical.
- All existing Emergency tests and ordinary opportunity read-purity tests remain green.

## 25. Required Tests for 001B-3

- Exact homeowner selects exact `posts.id`, response, and pending relationship; every tuple is locked and cross-validated.
- Wrong owner, wrong request, mismatched response/relationship, terminal response, non-pending relationship, legacy row, and stale version fail without writes.
- One non-ended selection per Job Request under concurrency.
- Winning response becomes `selected`; winning relationship becomes `active`; exact selection evidence persists.
- Other submitted responses become `not_selected`; their relationships close with `other_professional_selected`.
- Selection, response/relationship transitions, evidence, conversation creation, and participant creation are atomic.
- Exactly one conversation is linked to the exact selection and active relationship.
- No conversation exists before selection; retry returns the same selection/conversation without duplication.
- An already selected request rejects later responses through canonical selection truth.
- Legacy `active` or conversation presence never substitutes for selection evidence.
- Cancellation, expiration, and closure propagation preserve evidence and never delete responses or messages.
- Projections reveal selected identity and conversation only to authorized participants and only after commit.
- Emergency selection and dispatch remain unchanged.

## 26. Unresolved Decisions

No decision blocks the schema foundation or 001B-2B runtime alignment.

The following later-scope decisions are intentionally bounded rather than unresolved here:

1. **Multiple business profiles per user:** the current schema permits them but current runtime does not select deterministically. 001B-2B must fail closed if more than one eligible owned profile exists. A product-level multi-business selector requires separate authority; it does not change `(post_id, contractor_id)` uniqueness.
2. **Legacy reconciliation evidence source:** repository rows alone are insufficient for automatic promotion. A later reconciliation authorization must name the additional signed/log evidence source. Without it, candidates remain unresolved.
3. **Selected conversation bridge representation:** 001B-3 must choose a direct `conversations.request_selection_id` or equivalently strict bridge after reviewing final selection DDL. Response persistence does not depend on that choice.
4. **Retention/archive duration:** physical deletion is prohibited; archival fields are not justified until a retention contract exists.
5. **Post-selection response policy:** 001B-2B rejects canonical selections and legacy selected-like ambiguity. 001B-3 owns any future explicitly authorized policy; none is invented here.

## 27. Recommended Implementation Sequence

1. `MC-CONVERSATION-COMMERCIAL-JOB-REQUEST-001B-2B — Canonical Professional Response Runtime Alignment`: review and create the additive response foundation migration, implement the exact authorized submit command, make projections distinguish response and relationship truth, fail closed on legacy ambiguity, and verify no selection/conversation side effects.
2. Separately review any governed legacy reconciliation after the foundation is deployed and read-only inventory evidence is approved.
3. `001B-3`: implement exact homeowner selection, competing-response disposition, selected relationship activation, and selection-bound conversation authority.
4. Reconcile or retire legacy selection/conversation paths only under separate evidence-backed authority.

Only step 1 is the recommended next milestone. This document does not begin or authorize it.

## 28. Final Determination

**PASS — The canonical Professional Response schema and reconciliation design is complete.**

It provides:

- a backend-generated response identity separate from relationship identity;
- one business/request participation boundary;
- reciprocal one-to-one database linkage;
- atomic creation and rollback;
- durable idempotency and concurrency resolution;
- separate response and relationship lifecycles;
- exact future selection references;
- no conversation before selection;
- stage-specific privacy projections;
- evidence-preserving, fail-closed legacy reconciliation;
- explicit Emergency exclusion;
- additive migration, validation, and rollback governance;
- complete future test contracts for 001B-2B and 001B-3.

No runtime, schema, migration, database, selection, conversation, Emergency, commit, push, deployment, or environment action was performed.
