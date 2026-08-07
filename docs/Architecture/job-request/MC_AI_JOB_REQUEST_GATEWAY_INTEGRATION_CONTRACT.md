# MC-AI-JOB-REQUEST-001

# AI Gateway x Job Request Integration Contract

**Status:** Authoritative integration contract
**Evidence date:** 2026-08-07
**Execution mode:** Repository investigation plus this architecture document only

**Frontend root:** `/Users/williammolina/meetro-client`
**Backend root:** `/Users/williammolina/meetro-server/meetro-server`

**Final determination:** **PASS -- The AI Gateway x Job Request contract is complete and one bounded interpret operation may be implemented.**

## 1. Executive Decision

The first AI integration for governed Job Request creation must be a bounded Gateway operation named `job_request.interpret`.

The operation may interpret homeowner drafting context and return a structured, non-canonical proposed patch. It must not submit a Job Request, create a canonical ID, select a professional, create a relationship, create a conversation, create Evaluation/Quote/Invoice/Payment state, or alter `/posts`.

The runtime shape is:

```text
Ask Meetro / Job Request drafting UI
  -> Intelligence Gateway
  -> job_request.interpret
  -> one provider execution maximum
  -> structured validated interpretation result
  -> deterministic proposed draft patch
  -> jobRequestDraft
  -> mandatory homeowner review/correction
  -> existing keyed POST /posts
```

The forbidden shape is:

```text
jobRequestDraft
  -> AI Gateway
  -> POST /posts
```

## 2. Governing Authority

The permanent authority order for this integration is:

```text
INTELLIGENCE understands
  -> DRAFT organizes
  -> USER reviews and authorizes
  -> CANONICAL ENGINE persists authority
  -> WORKFLOW controls progression
  -> HISTORY records what actually happened
```

Conversation may be the interface. Conversation is never canonical authority.

Repository-aligned authority:

- The Intelligence platform is advisory and no-execution in `docs/Architecture/MEETRO_INTELLIGENCE_PLATFORM_SPECIFICATION_V1.md`.
- The one-provider-call law is recorded in `docs/Architecture/AI_ROADMAP.md`.
- The current Job Request draft foundation is committed in `b1f4d462162597afba263b0f2f57be5cc216a441`.
- Canonical ordinary Job Request creation remains the backend `/posts` path, with the frontend accepting only canonical create/replay success codes.

## 3. Current Intelligence Repository Truth

Existing Gateway flow in `/Users/williammolina/meetro-client`:

```text
server/intelligence/companionRoutes.js
  -> POST /api/companion/ask
  -> server/intelligence/companionController.js:handleCompanionAsk
  -> server/intelligence/gateway.js:askCompanionGateway
  -> validatePermissions
  -> validateUsageLimit
  -> validateMembership
  -> validateCredits
  -> orchestrateCompanionAsk
  -> selected engines
  -> buildUnifiedContext
  -> providerAdapter.invokeProvider
  -> providers/openaiProvider.createOpenAIProvider
  -> recordUsage
```

Repository facts:

- `server/intelligence/gateway.js` has authentication/permission, membership, usage-limit, credit-check, normalized error, and usage-recording boundaries.
- `validateCredits`, `validateUsageLimit`, and `recordCompanionUsage` are current stubs by default, but dependency overrides exist.
- `server/intelligence/orchestrator/companionOrchestrator.js` collects selected engine context and invokes `invokeProvider` once.
- Engines are deterministic context collectors. They do not call providers.
- `server/intelligence/providerAdapter.js` creates a provider registry and mediates a single provider completion.
- `server/intelligence/providers/openaiProvider.js` is the concrete OpenAI adapter, using server-side `OPENAI_API_KEY` and `OPENAI_MODEL`.
- Public Gateway responses omit provider identity, raw response, internal context, memory, knowledge, capabilities, workflow, relationship, decision, recommendation, planning, and execution-governance sections.
- Tests in `server/tests/intelligenceGateway.test.js`, `server/tests/decisionIntelligence.test.js`, and `server/tests/recommendationIntelligence.test.js` verify provider-blind UI response and one provider call for existing Companion requests.

Important limitation:

- There is no current `job_request.interpret` operation, capability, engine-selection rule, structured provider-output parser, or Job Request Gateway route.
- Current feature-based selection for broad `ask_meetro` can include many engines and then append Validation, Decision, Recommendation, Planning, and Execution Governance. `job_request.interpret` must define a thinner path instead of inheriting broad Companion behavior blindly.

## 4. Current Job Request Repository Truth

Frontend Job Request truth in `/Users/williammolina/meetro-client`:

- `src/utils/jobRequestDraft.js` owns non-canonical `meetroJobRequestDraft`, versioning, values, provenance, uncertainty, readiness, guidance, review, recovery, media draft state, and submission intent/snapshot state.
- `JOB_REQUEST_DRAFT_SOURCE` supports `user_entered`, `assistant_suggested`, `assistant_inferred`, `system_derived`, and `legacy_migrated`.
- `JOB_REQUEST_DRAFT_UNCERTAINTY` supports `known`, `approximate`, `uncertain`, and `assistant_suggested`.
- `applyHomeownerInput` marks fields as `user_entered`, confirmed, and known.
- `applyAssistantSuggestion` fills only missing fields and never overwrites existing or confirmed values.
- `applyAssistantInference` avoids confirmed fields and marks approximate assistant inference.
- `buildJobRequestReviewModel` produces non-canonical review data.
- `buildJobRequestDraftCanonicalPayload` transforms reviewed draft fields into the canonical `/posts` payload shape.
- `src/utils/jobRequestSubmissionIntent.js` creates UUID submission intent keys, accepts only `JOB_REQUEST_CREATED` or `JOB_REQUEST_REPLAYED` with a backend post ID, and classifies create failures.
- `src/pages/Assistant.jsx` currently uses deterministic local classification and `saveAssistantRequestDraft`; it does not call the Intelligence Gateway.
- `src/utils/assistantRequestDraft.js` persists the shared Job Request draft and treats legacy AI local-storage keys as migration inputs only.
- `src/pages/Upload.jsx` reads or creates the shared draft, saves recovery state, displays guidance/review, lets the user edit, creates an idempotency key, snapshots the reviewed payload, and submits only to `POST /posts`.

Backend canonical truth in `/Users/williammolina/meetro-server/meetro-server`:

- `index.js` routes `POST /posts` through `authMiddleware` and `createJobRequest`.
- `server/requests/jobRequestCreateService.js` requires authenticated homeowner authority, validates a UUID idempotency key, fingerprints semantic create input, reserves idempotency, inserts `posts`, completes idempotency, and replays exact retries.
- `server/requests/requestLifecycle.js` validates supported request service taxonomy and serializes owned requests.
- The backend working tree contains uncommitted 002E-I/II Job Request create idempotency files. This contract treats them as available repository evidence but does not modify them.

## 5. Integration Boundary

`job_request.interpret` connects at the drafting boundary only:

- It may be invoked by Ask Meetro or a deliberate Job Request drafting UI action.
- It receives minimized, non-canonical draft context.
- It returns structured interpretation and proposed patch data.
- The frontend applies that patch through deterministic draft-engine rules.
- Existing local readiness and review recompute after patch application.
- Existing keyed `/posts` submission remains the only canonical create path.

The Gateway does not own `meetroJobRequestDraft`; the draft engine does. The Gateway does not own `/posts`; the canonical backend does.

## 6. First Operation

Operation name: `job_request.interpret`.

Purpose:

- Interpret free-text Job Request scope.
- Suggest a concise title.
- Suggest normalized homeowner-facing description.
- Suggest service taxonomy fields.
- Identify uncertainty.
- Identify missing required information.
- Propose one useful clarification.
- Identify contradictions and warnings.

Not allowed:

- Submit, create, edit, cancel, or replay `/posts`.
- Create canonical IDs.
- Select professionals.
- Create or activate relationships.
- Create conversations.
- Create Evaluation, Quote, Invoice, Payment, Project, or History records.
- Make commercial decisions or promises.

If repository naming conventions force capability-first naming, the capability should be `job_request.interpret` or a semantically equivalent `job_request.interpret_draft`. The operation name exposed to callers should remain `job_request.interpret`.

## 7. Request Context Contract

Minimum request:

```json
{
  "operation": "job_request.interpret",
  "locale": "en",
  "draftVersion": 1,
  "localDraftId": "draft_local_only",
  "userInput": "I need a garage opener installed",
  "requestedCapability": "interpret_draft",
  "currentDraft": {
    "job": {
      "title": "",
      "description": ""
    },
    "service": {
      "category": "",
      "requestCategory": "",
      "domain": "",
      "specialty": "",
      "displayLabel": ""
    },
    "timing": {},
    "locationContext": {
      "generalArea": "Cape Coral, FL",
      "exactAddressIncluded": false
    },
    "fieldMeta": {},
    "readiness": {
      "missingRequiredFields": ["title", "service", "location"],
      "uncertainRequiredFields": [],
      "warnings": []
    }
  }
}
```

Allowed context when needed:

- Title.
- Description.
- Current user-provided free text.
- Service meaning and service tokens.
- Category, request category, service domain, service specialty.
- Timing and availability text.
- General location context where it improves interpretation.
- Unit/access notes only when strictly relevant to interpretation.
- Existing field provenance, uncertainty, missing fields, readiness, and current warnings.

Excluded by default:

- Canonical backend Job Request IDs.
- `/posts` idempotency key or submission snapshot internals.
- Other professional responses.
- Unrelated conversation messages.
- Relationship or conversation identity.
- Payment data.
- Commercial records.
- Raw application state.
- Auth tokens.
- History evidence.
- Broad unrelated Memory.

## 8. Context Minimization

The frontend request builder must construct a purpose-specific `job_request.interpret` context. It must not serialize the entire draft, whole component state, local storage, auth state, browser environment, or unrelated pages.

Exact address should not be sent unless the interpretation specifically requires it. General location such as city/region is preferred. Access codes, gate codes, contact details, payment details, and private notes are excluded.

## 9. Media Decision

First milestone: text and structured context only.

Photos remain part of the Job Request draft and canonical `/posts` payload, but image understanding is not part of `job_request.interpret`. A later operation may add media understanding only after a governed image-input path, privacy contract, and media-specific provider evidence model exist.

## 10. Output Contract

The Gateway returns structured JSON suitable for a proposed non-canonical draft patch:

```json
{
  "operation": "job_request.interpret",
  "requestId": "intelligence-operation-id",
  "status": "success",
  "suggestions": {
    "title": "Garage opener installation",
    "description": "I need a garage door opener installed..."
  },
  "inferences": {
    "service": {
      "category": "doorsWindows",
      "requestCategory": "garage_door_opener_installation",
      "domain": "home_services",
      "specialty": "garage_door_opener_installation",
      "displayLabel": "Garage Door Service"
    }
  },
  "clarifications": [
    {
      "code": "confirm_opener_model",
      "field": "details.additionalNotes",
      "prompt": "Do you know the opener brand or model?"
    }
  ],
  "warnings": [],
  "confidence": {
    "platform": "medium",
    "provider": "medium",
    "field": {
      "service.specialty": "medium"
    }
  },
  "draftPatch": {
    "fields": []
  },
  "usage": {
    "operationType": "job_request.interpret",
    "providerExecutionCount": 1,
    "recorded": true
  }
}
```

Exact names may be adjusted to fit existing Gateway conventions, but the semantic fields above are required.

## 11. Draft Patch Contract

`draftPatch.fields[]` is the only structure the frontend patch helper applies.

```json
{
  "path": "service.specialty",
  "value": "garage_door_opener_installation",
  "source": "assistant_inferred",
  "confidence": "medium",
  "uncertainty": "approximate",
  "confirmation": "required",
  "rationale": "The request mentions installing a garage opener.",
  "taxonomy": {
    "validated": true,
    "vocabulary": "request_service"
  }
}
```

Every field proposal must include:

- Field path.
- Proposed value.
- Source: `assistant_suggested` or `assistant_inferred`.
- Confidence.
- Draft uncertainty.
- Confirmation recommendation or requirement.
- Optional rationale.
- Validation metadata for taxonomy fields.

The Gateway must not emit `user_entered`, `confirmed: true`, canonical post identity, relationship identity, conversation identity, or submission intent fields in the patch.

## 12. Provenance Rules

AI-produced title/description wording maps to `assistant_suggested`.

AI-produced taxonomy, inferred timing, inferred affected area, or inferred missing-info claims map to `assistant_inferred`.

Legacy local-storage AI keys remain migration inputs only and map to `legacy_migrated` when read through `assistantRequestDraft`.

Only direct homeowner field edits map to `user_entered`.

No Gateway or provider output can mark a field as user-confirmed.

## 13. Patch Application Rules

Patch application must be deterministic and preferably live in `src/utils/jobRequestDraft.js` as a helper in the next runtime milestone.

Rules:

1. AI proposals may fill missing fields.
2. AI proposals may refine existing assistant-derived fields.
3. AI proposals may not silently overwrite confirmed `user_entered` fields.
4. A conflicting AI proposal becomes a warning or clarification.
5. Proposed taxonomy must pass deterministic Meetro taxonomy validation before entering structured draft service fields.
6. Unknown taxonomy values must not enter structured draft vocabulary as valid canonical values.
7. Applying a patch recomputes readiness and review locally.
8. Applying a patch never creates or mutates a submission snapshot.
9. Applying a patch never triggers upload or submit.
10. Rejected fields remain available as warnings/clarifications but do not alter draft values.

## 14. User Review Boundary

User review remains mandatory. UI copy may say "I understood this as..." or "I think this may be...". It must retain accept, reject, correct, and manual-edit paths.

The user-authorized action remains pressing Send Request after reviewing the draft. Provider output is not approval.

## 15. Confidence / Uncertainty Mapping

Do not collapse confidence into one number.

- Provider confidence describes the provider's own structured-output confidence when available.
- Validation/platform confidence describes whether repository-governed evidence supports the result and how assertively Meetro may speak.
- Field uncertainty describes how the draft treats an individual proposed value.

Mapping:

| Platform/provider state | Draft field uncertainty | User confirmation |
|---|---|---|
| High and taxonomy validated | `assistant_suggested` or `approximate` | Recommended or required by field type |
| Medium or inferred from ambiguous text | `approximate` | Required for service/taxonomy |
| Low, contradiction, insufficient evidence | `uncertain` or warning only | Required before readiness can pass |
| User manually edits | `known` | Confirmed |

A high-confidence AI result still does not become `user_entered`.

## 16. Validation Integration

`job_request.interpret` must pass through Intelligence Validation.

Validation should constrain:

- Unsupported taxonomy.
- Contradictory inference.
- Insufficient evidence.
- Clarification requirement.
- Unsafe definitive language.
- Claims outside the drafting scope.

Implementation may need a Job Request-specific validation collector or Validation evidence adapter because current Validation only assesses selected engine sections. Validation must run before provider output becomes frontend-applicable patch data.

## 17. Capability Integration

Capability Intelligence should participate narrowly by recognizing `job_request.interpret` as an available read-only/preparatory capability and confirming role, permission, and input readiness.

It must not expose `/posts` execution, create IDs, or mark submission as available. The required new capability definition should be active only for supported roles and should have execution mode `preparatory` or `read_only`, risk level no higher than standard, and no write permission.

## 18. Domain Engine Participation

First operation should use a thin orchestration path:

- Context: yes, only minimized account/session surface needed by Gateway.
- Capability: yes, to resolve `job_request.interpret`.
- Job Request interpretation engine or operation adapter: yes, to build input/output contract and parse structured result.
- Validation: yes.
- Knowledge: no by default.
- Persistent Memory: no by default.
- Workflow: no by default.
- Relationship: no.
- Business: no.
- Community: no.
- Decision: no.
- Recommendation: no.
- Planning: no.
- Execution Governance: no.

Current broad `ask_meetro` engine selection is too large for this first operation. The next milestone must add explicit selection rules for `feature: "job_request"` or `capability: "job_request.interpret"` so unnecessary engines do not run.

## 19. Persistent Memory Boundary

No broad memory injection in the first operation.

Scoped memory may be considered later only if existing production memory governance can prove:

- User consent.
- Relevance to the current drafting request.
- Privacy minimization.
- No relationship/conversation authority.
- No full remembered history sent to the provider.

For MC-AI-JOB-REQUEST-002, default memory participation should be disabled.

## 20. Knowledge Boundary

Knowledge Intelligence is not required for general drafting interpretation.

It may become relevant later for permit rules, service definitions, technical safety, regulated work, or jurisdiction-specific guidance. Without verified Knowledge evidence, the provider must not manufacture factual certainty. General service taxonomy must be deterministic repository vocabulary, not provider-created knowledge.

## 21. Provider Execution Rule

One `job_request.interpret` Gateway request may cause no more than one provider execution.

No hidden second provider call may occur for:

- Classification.
- Clarification generation.
- Summarization.
- Confidence.
- Taxonomy normalization.
- Review generation.

Deterministic taxonomy validation, readiness, review, and patch application must happen without provider calls.

The first implementation must prove `providerExecutionCount <= 1` in tests.

## 22. Credit / Usage Boundary

Do not charge for deterministic frontend operations:

- Typing.
- Field edits.
- Local draft save/recovery.
- Readiness computation.
- Review generation.
- Taxonomy validation.
- Local guidance.
- Navigation.
- `/posts` submission.
- Viewing a cached/replayed interpretation.

Potential charge event:

```text
one successfully authorized job_request.interpret Gateway intelligence operation
```

Repository truth:

- Current Gateway has `validateUsageLimit`, `validateCredits`, and `recordUsage` extension points.
- Current defaults are stubs.
- Current tests show usage records are written for successful, blocked, provider-failure, and context-failure Companion flows.
- No verified pricing or credit ledger exists in the inspected repos for Job Request interpretation.

Contract:

- Reservation/check happens before provider execution through Gateway usage/credit checks.
- Final usage recording happens after success or normalized failure according to existing Gateway behavior.
- Provider failures should record failed usage metadata but must not finalize a normal successful credit charge unless a future credit policy explicitly says failed provider calls are billable.
- Validation-blocked-before-provider requests should not execute the provider and should not consume a normal successful intelligence credit.
- Pricing must not be defined in this milestone.

## 23. Credit Idempotency

`job_request.interpret` requires a frontend-generated intelligence-operation idempotency key distinct from `/posts` submission idempotency.

Semantics:

- Same user, same operation, same idempotency key, same semantic input: replay existing structured result without duplicate provider execution or duplicate successful charge.
- Same user, same idempotency key, materially different input: return conflict.
- Provider failure: do not replay as successful; retry may attempt again under policy.
- Validation-blocked result: may replay as the same blocked result without provider execution.
- Deterministic local readiness/review never creates usage or credit events.

Current Gateway does not implement durable intelligence idempotency. This is a blocking implementation requirement for the runtime milestone, not a blocker for this contract.

## 24. Error Contract

Frontend receives bounded actionable states:

| Class | Meaning | Provider called |
|---|---|---|
| `unauthenticated` | User must sign in | No |
| `feature_unavailable` | Operation/capability is not active | No |
| `permission_denied` | Role/account cannot use operation | No |
| `membership_inactive` | Membership blocks use | No |
| `insufficient_credits` | Credit check blocks use | No |
| `rate_limited` | Usage/rate check blocks use | No |
| `invalid_input` | Required text/context missing or malformed | No |
| `context_too_large` | Minimized context still exceeds bounds | No |
| `validation_clarification_required` | Validation requires clarification before provider or before patch | Usually no |
| `insufficient_evidence` | Structured evidence cannot support proposal | Maybe no |
| `provider_unavailable` | Provider could not respond | Yes or attempted |
| `malformed_provider_result` | Provider output failed parser/schema | Yes |
| `operation_replayed` | Idempotent replay returned prior result | No |
| `operation_conflict` | Same key with materially different input | No |

Raw provider errors must remain internal.

## 25. Privacy / Logging

Default logs may include:

- Operation type.
- Authenticated user/account ID.
- Correlation/request ID.
- Engine names.
- Provider name/model.
- Latency.
- Provider execution count.
- Usage outcome.
- Validation outcome.
- Failure class.

Default logs must not include:

- Full raw prompt.
- Full raw provider context.
- Full exact address unless explicitly required and governed.
- Access codes.
- Contact information.
- Payment information.
- Auth tokens.
- Unrelated conversations.
- Raw local storage.
- Provider secrets.

## 26. Observability

Minimum telemetry:

- `operationType: "job_request.interpret"`.
- `requestId` and idempotency identity.
- Authenticated user/account.
- Selected engines.
- Provider execution count.
- Provider/model.
- Latency.
- Validation status and confidence.
- Usage/credit outcome.
- Result status.
- Replay/conflict state.
- Parse/schema validation result.

Telemetry must remain metadata-first.

## 27. Caching / Replay

Safe replay is allowed for identical idempotent retries.

Materially changed draft context requires a new interpretation request. The UI must not automatically call the Gateway on every keystroke. Cached/replayed structured results may be viewed without new credit usage. Deterministic local readiness/review must never call the Gateway.

## 28. Frontend UX Trigger

First UX trigger:

```text
User enters meaningful free-form request text
  -> user deliberately asks Meetro to help interpret/refine it
  -> Gateway call
  -> proposed patch appears for review
```

Avoid:

- AI call per keystroke.
- AI call after every local field edit.
- AI call during `/posts` submit.
- AI call when merely navigating to Upload.

This preserves user intent, credit clarity, auditability, and provider-cost control.

## 29. Canonical Submission Isolation

Canonical submission remains:

```text
reviewed draft
  -> buildJobRequestDraftCanonicalPayload
  -> POST /posts with Idempotency-Key
  -> backend createJobRequest
  -> posts.id
```

`job_request.interpret` may never:

- Build `/posts` submission body directly for transport.
- Create or reuse `/posts` idempotency keys.
- Call `authFetch("/posts")`.
- Treat a local draft ID as a canonical request ID.
- Create selected-homeowner-request browser projection.
- Bypass `getCanonicalJobRequestPost`.

## 30. Prohibited Authority

This contract prohibits the first operation from owning or mutating:

- Backend work.
- AI Gateway runtime changes in this milestone.
- Provider/model calls in this milestone.
- Canonical browser identity.
- Relationship/conversation authority.
- Evaluation.
- Quote.
- Invoice.
- Payment.
- Migration in this milestone.
- Environment configuration.
- `/posts` behavior.
- Auto-submit.
- Professional selection or ranking.

## 31. Test Contract

Next runtime milestone must add focused tests proving:

- `job_request.interpret` is registered as an explicit capability/operation.
- Unsupported roles/features fail closed.
- Invalid or oversized context fails before provider execution.
- One request causes no more than one provider execution.
- Validation participates and can block or require clarification.
- Provider output must pass schema parsing before use.
- Unknown taxonomy values do not enter structured draft fields.
- AI patch cannot overwrite confirmed `user_entered` fields.
- Patch application recomputes readiness/review locally.
- Patch application never submits.
- `/posts` code path remains unchanged and still requires user review and keyed submission.
- Usage/credit record semantics cover success, blocked, provider failure, replay, and conflict.
- Privacy tests prove exact address/access/contact/payment data are excluded by default.

## 32. Safe Runtime Sequence

Recommended MC-AI-JOB-REQUEST-002 sequence:

1. Add operation/capability definition for `job_request.interpret`.
2. Add explicit thin engine-selection rule for Job Request interpretation.
3. Add a minimized frontend request-context builder.
4. Add backend input schema and context size limits.
5. Add intelligence-operation idempotency contract or adapter.
6. Add structured provider-output schema and parser.
7. Integrate Validation before frontend-applicable patch output.
8. Add deterministic draft patch helper in `jobRequestDraft.js`.
9. Add deliberate Ask Meetro/Upload UX trigger.
10. Add tests for provider count, usage, privacy, patch rules, taxonomy, and canonical isolation.
11. Do not modify `/posts` except to prove it remains isolated.

## 33. Blocking Findings

No blocker prevents defining the contract.

Runtime implementation blockers to resolve before MC-AI-JOB-REQUEST-002 completion:

- No existing `job_request.interpret` capability or route.
- Current broad `ask_meetro` engine selection is too wide for this operation.
- No durable intelligence-operation idempotency exists.
- Current credit/usage implementations are stubs unless dependency adapters are configured.
- No structured provider-output parser exists for Job Request patches.
- No deterministic patch helper exists yet for applying full Gateway patch proposals.

## 34. Final Determination

**PASS -- The AI Gateway x Job Request contract is complete and one bounded interpret operation may be implemented.**

This is a pass for architecture and sequencing only. It is not a runtime certification.

## 35. Recommended Next Milestone

**MC-AI-JOB-REQUEST-002 -- Gateway Job Request Interpret Foundation**

Scope:

- One authenticated Gateway operation.
- One existing provider path.
- One provider execution maximum.
- Text/structured context only.
- Structured validated output.
- No canonical writes.
- No credit-pricing redesign.
- Deterministic frontend patch application.
- Focused tests.
- No auto-submit.

## Cross-Layer Authority Matrix

| Concern | Job Request Draft | Gateway | Intelligence Engine | Provider | Canonical Backend | Status |
| ------- | ----------------- | ------- | ------------------- | -------- | ----------------- | ------ |
| Identity | Owns `localDraftId` only | Owns intelligence request/correlation identity | May reference operation identity | No identity authority | Owns `posts.id` | Clear separation |
| Context | Holds minimized draft state | Accepts bounded request context | Builds structured context | Receives minimized context | Not involved until submit | Allowed |
| Interpretation | Receives proposed patch | Routes operation | Owns extraction/validation flow | Explains/structures within prompt | No role | New operation needed |
| Provenance | Stores field source | Attests operation source | Labels assistant outputs | No provenance authority | No draft provenance | Defined |
| Uncertainty | Stores field uncertainty | Returns validation confidence | Maps evidence confidence | May provide provider confidence | No draft uncertainty | Defined |
| Readiness | Computes locally | No readiness authority | May identify missing info | No readiness authority | Validates create payload only | Local-only |
| Review | Builds non-canonical review | No review authority | May suggest review warnings | No review authority | No role before submit | User mandatory |
| Provider execution | Never calls provider | Enforces one call boundary | No hidden calls | Executes once maximum | No provider calls | Must test |
| Credits | No charge for local actions | Owns checks/recording | Supplies metadata | Supplies cost metadata when available | No role | Needs adapter/idempotency |
| Submit | User-triggered only | No submit route | No submit action | No submit action | Owns `POST /posts` | Isolated |
| Canonical request ID | Must not create | Must not create | Must not create | Must not create | Creates/returns `posts.id` | Isolated |
| Relationships | No authority | No authority | No authority | No authority | Relationship services only | Prohibited |
| Conversations | No authority | No authority | No authority | No authority | Communication backend only | Prohibited |
| Downstream commercial authority | No Evaluation/Quote/Invoice/Payment authority | No authority | Advisory only | No authority | Existing/future canonical engines | Prohibited |
