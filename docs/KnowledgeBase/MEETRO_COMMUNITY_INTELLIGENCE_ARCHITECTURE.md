# 🏮 MASTER HANDOFF — MEETRO COMMUNITY INTELLIGENCE ARCHITECTURE

## Version 1.0

Status:
Foundation Established

Purpose:
Define the permanent architecture for Meetro Community’s intelligence system so every future AI feature protects the product’s character, trust boundaries, and long-term purpose.

This document must travel with all future Companion, AI, automation, memory, knowledge, capability, workflow, relationship, community, and business intelligence work.

---

# THE CORE PROMISE

Meetro Community is not building ChatGPT inside an app.

Meetro Community is building a trusted local intelligence system.

OpenAI reasons.
Meetro Community understands.
The Companion protects trust.

The Companion must never become a generic chatbot, a marketplace assistant, a sales bot, or an uncontrolled automation layer.

It exists to reduce uncertainty, preserve continuity, strengthen relationships, and guide users toward the next safe action.

---

# FOUNDATIONAL PRINCIPLE

Meetro Community owns intelligence.

AI providers supply reasoning.

The frontend supplies interaction.

The backend owns truth.

No provider key, model decision, usage rule, trusted context, private memory, knowledge packet, capability reasoning, workflow guidance, relationship guidance, or internal diagnostic belongs in the UI.

---

# CURRENT INTELLIGENCE PIPELINE

The current backend intelligence flow is:

```txt
POST /api/companion/ask
        ↓
Controller
        ↓
Intelligence Gateway
        ↓
Companion Orchestrator
        ↓
Usage Limit Check
        ↓
Intent Engine
        ↓
Companion Context Engine
        ↓
Session Memory
        ↓
Knowledge Engine
        ↓
Capability Engine
        ↓
Workflow Intelligence Engine
        ↓
Relationship Intelligence Engine
        ↓
Provider Adapter
        ↓
OpenAI Provider
        ↓
Normalized Response
        ↓
Usage Record
        ↓
Session Memory Write
        ↓
Safe UI Response
```

The Gateway is the door.
The Orchestrator is the conductor.
The engines provide understanding.
The provider reasons.
Meetro Community remains the source of truth.

---

# PRODUCTION ORCHESTRATION FOUNDATION (MC-AI-008)

The production request boundary is:

```txt
Feature Request
        ↓
Gateway Validation
        ↓
Companion Orchestrator
        ↓
Central Engine Selection
        ↓
Isolated Context Collection
        ↓
Unified Structured Context
        ↓
Provider Adapter
        ↓
Gateway Usage Recording
        ↓
Safe Response
```

## Responsibility Boundaries

The Gateway owns request validation, authenticated identity, membership and permission checks, usage and credit checks, rate-limit integration, usage recording, and the public response contract. It must not select engines, collect domain context, compose provider messages, or call a provider directly.

The Orchestrator owns internal request normalization, centralized engine selection, safe engine execution, unified context construction, provider-adapter coordination, memory continuity, internal diagnostics, and orchestration error propagation. It must not repeat authentication, membership, credit, rate-limit, or feature-permission checks.

The Provider Adapter owns provider lookup, timeout behavior, provider invocation, and provider result normalization. Provider credentials and provider-specific response details remain behind this boundary.

## Executable Engine Interface

An executable engine has a stable `id`, deterministic `priority`, `supports(request)`, and `collectContext(request, collectedContext)`. Context results contain a unique `section`, numeric `priority`, structured `data`, and optional safe `metadata`. Required engines are explicitly marked; all others are optional.

The existing metadata registry remains the architectural inventory. The executable orchestration registry validates callable engines, rejects duplicate IDs, and provides deterministic ordering. Adding an engine requires an adapter, registry registration, and a centralized selection rule. Gateway changes are not required.

## Engine Selection

Selection is feature-, capability-, and source-aware. Ask Meetro selects capability, context, knowledge, workflow, relationship, and memory. Emergency, quote, conversation, community, and business surfaces select only their relevant domains. Unknown features fall back to capability, context, and knowledge. Selection deduplicates IDs, applies engine `supports()` checks, and preserves registry priority.

## Unified Context

Engine results remain structured until the provider boundary. Empty sections are excluded, ordering is deterministic, duplicate sections cannot overwrite earlier higher-priority context, and engine-provided `system` context is rejected. A bounded byte budget prevents uncontrolled context growth; dropped or truncated sections are recorded only as safe internal metadata.

The provider payload retains legacy Companion fields for backward compatibility and also receives the unified context packet. The UI receives neither form.

## Failure And Logging Rules

Independent engines execute with settled-promise isolation where dependency order permits. An optional engine failure is logged with engine ID, status, and timing, then orchestration continues. A required engine failure stops before provider invocation and returns through Gateway error normalization. Provider failures retain existing timeout and failure normalization, failed usage recording, and safe session-memory status.

Orchestration logs may include request ID, feature, capability, selected/successful/failed engine IDs, provider ID, status, error code, counts, and elapsed time. Logs must never contain user message bodies, prompts, API keys, private context, relationship history, memory content, or provider credentials.

## Future Engines

Analytics, compliance, portfolio, learning, permits, safety, document intelligence, business intelligence, and persistent memory may be added through adapters and centralized selection rules. Domain intelligence belongs inside engines, never inside the Gateway or Orchestrator.

---

# WORKFLOW INTELLIGENCE FOUNDATION (MC-AI-009)

Workflow Intelligence interprets existing Meetro Community records. It does not create, approve, schedule, pay, complete, close, archive, or mutate work.

```txt
Ask Meetro Request
        ↓
Gateway
        ↓
Orchestrator
        ↓
Workflow Engine
        ↓
Resolve Workflow Record
        ↓
Normalize Lifecycle
        ↓
Determine Current Stage
        ↓
Determine Next Action
        ↓
Evaluate Obligations and Blockers
        ↓
Return Structured Workflow Context
        ↓
Unified Context Builder
        ↓
Provider
```

## Supported Workflow Types

The foundation recognizes standard jobs, emergency jobs, service requests, scheduled visits, evaluations, quotes and proposals, active work, completion, closure, Job History, and conversations linked to work. Future workflow types register source adapters and status mappings; they do not add branching logic to the Gateway or Orchestrator.

## Canonical Lifecycle

```txt
Relationship
→ Communication
→ Evaluation Visit
→ Evaluation
→ Quote / Proposal
→ Customer Approval
→ Payment / Deposit
→ Schedule Work
→ Perform Work
→ Completion
→ Invoice / Receipt
→ Closure
→ Job History
```

Emergency work follows Emergency Request or Alert, Status and Communication, Professional Response or Dispatch, Work, Completion, Invoice / Payment / Receipt, Closure, and Job History. Emergency completion remains open until Closure is recorded and history requirements are satisfied.

## Resolution And Normalization

Workflow resolution uses stable typed identifiers in this order: project, job, emergency request, standard request, completion, then conversation. Customer-name-only matching is forbidden. Related records are combined only through matching typed identifiers, preserving customer and job isolation.

Persisted status aliases are centralized into canonical stages. Explicit persisted status and supporting records take precedence. Derived inference is used only when explicit state is incomplete. Workflow evidence returned to the provider is minimized to safe status, proposal, completion, closure, and history indicators.

## Actions, Waiting, And Blockers

The engine returns a structured next action and identifies whether responsibility belongs to the professional, customer, system, third party, none, or remains unknown. Normal waiting states remain distinct from blockers. Blockers represent unmet prerequisites such as approval, required deposits or payments, permits, inspections, documents, invoices, receipts, confirmations, identifier conflicts, or missing history normalization.

## Obligations

Payment, deposit, invoice, receipt, permits, inspection, documents, customer approval, customer confirmation, completion record, closure record, and history normalization use normalized states: `not_required`, `not_due`, `pending`, `satisfied`, `missing`, `blocked`, or `unknown`. Missing evidence never becomes satisfied implicitly.

## Completion And Closure

Completion records that work was performed. Completion is not Closure. Closure requires supported financial, operational, document, permit, inspection, and customer obligations to be resolved. A closed source record is not normalized Job History until a closed read-only history record exists. The engine may recommend reconciliation but never writes history itself.

## Contradictions And Confidence

Confidence is deterministic. Strong identifiers with agreeing explicit records produce high confidence. Consistent inferred state produces medium confidence. Conflicting identifiers or statuses, missing completion behind Closure, active work alongside Job History, missing proposals behind approval, or unresolved permits behind Closure produce warnings and low confidence. Contradictions never crash orchestration.

## Privacy Boundary

Workflow Intelligence excludes full conversations, private notes, addresses, payment credentials, media, invoices, receipts, secrets, and unrestricted metadata. The UI never receives the internal workflow packet. The provider receives it only through the Unified Context Builder in the existing single-call orchestration path.

---

# RELATIONSHIP INTELLIGENCE FOUNDATION (MC-AI-010)

Relationship Intelligence describes factual operational continuity between scoped parties. It is not a personality profile, trust score, loyalty score, sentiment model, customer-value score, or private conversation summary. It never creates contacts, merges identities, sends messages, follows up, marks messages read, or changes workflow state.

```txt
Ask Meetro Request
        ↓
Gateway
        ↓
Orchestrator
        ↓
Workflow Intelligence
        ↓
Relationship Intelligence
        ↓
Resolve Scoped Parties and Records
        ↓
Classify Continuity
        ↓
Summarize Operational Activity
        ↓
Determine Communication State
        ↓
Determine Relationship-Level Next Action
        ↓
Return Privacy-Minimized Structured Context
        ↓
Unified Context Builder
        ↓
Provider
```

## Relationship Types And Identity

Supported evidence may identify professional/customer, homeowner/professional, business/customer, emergency service, standard service, hiring, community connection, referral, and conversation-only relationships. Resolution uses relationship ID, conversation ID, project or job ID, request or emergency ID, then customer plus business scope. Name-only and broad email-only matching are prohibited.

Normalized parties contain only the professional, customer, and business IDs needed for orchestration. Authenticated professional and business scope or authenticated homeowner identity is applied before resolution. Relationships cannot cross businesses, professionals, customers, or active account scopes. Hiring and Community records remain separate unless a stable explicit relationship link exists.

## Continuity And State

Continuity classifications are deterministic: first-time customer, new relationship, returning customer, active customer, past customer, inactive relationship, conversation-only, or unknown. Returning requires prior completed or closed work plus current activity. Repeated work is operational continuity, not evidence of loyalty, satisfaction, character, or trustworthiness.

Relationship state may be new, active, waiting, follow-up due, completed, inactive, closed, or unknown. Active Workflow Intelligence remains the lifecycle authority. Relationship Intelligence uses its structured output for current engagement and next-action ownership rather than maintaining a second workflow status map.

## Activity And Engagement

Safe activity counts include requests, active requests, completed and closed jobs, emergency work, proposals, unpaid invoices, conversations, explicit follow-ups, hiring conversations, and Community interactions. Typed stable IDs deduplicate completion records against Job History and emergency requests against their corresponding emergency jobs. Revenue and subjective customer value are never calculated.

Current engagement prioritizes active emergencies, active work, scheduled work or visits, proposals awaiting decisions, evaluations, new requests, unresolved financial documents, closed history, then conversation-only relationships. Workflow Intelligence output takes precedence unless a higher-priority active emergency exists.

## Communication And Follow-Up

Communication continuity uses channel, conversation ID, timestamps, sender direction, persisted response state, unread count, and closed/archive state. Full messages, attachments, photos, voice transcripts, and message-by-message summaries are forbidden. Direction alone does not create a pending-response state without unread or explicit pending evidence.

Follow-ups require explicit evidence such as an unread incoming message, persisted follow-up flag, proposal revision request, completion follow-up, or financial-document delivery state. No due date or overdue state is invented. Relationship next actions complement Workflow Intelligence and are never executed automatically.

## Contradictions And Confidence

Conflicting customer, professional, business, relationship, or conversation identifiers produce warnings, exclude disputed records, and lower confidence. Stable agreeing IDs produce high confidence; scoped consistent inference without an explicit relationship ID produces medium confidence; conflicts or incomplete party identity produce low confidence. Contradictions never trigger automatic merges.

## Privacy Boundary

Relationship context excludes message bodies, private notes, addresses, phone numbers, email addresses, payment credentials, financial accounts, media, medical or sensitive traits, inferred income, personality, sentiment, politics, religion, race, disability, family status, and unrestricted metadata. The UI never receives the internal relationship packet.

## Production Data Contract

Trusted data may be supplied through scoped `backendContext.relationships`, `backendContext.conversations`, scoped workflow/history collections, `repositories.getRelationshipRecords()`, `repositories.getConversationRecords()`, and `repositories.getWorkflowRecords()`. Repository calls receive authenticated user and stable selector IDs. Unrestricted frontend arrays and browser storage are not data sources.

Future relationship adapters register trusted collections and stable identity fields at the resolver boundary. They must preserve authenticated scope, privacy minimization, Workflow Intelligence ownership, and the single-provider-call contract.

---

# COMPLETED FOUNDATION

## 1. Intelligence Gateway

Status: Complete

Purpose:
Ensure all Companion requests flow through the backend.

Rules:

* No direct frontend AI calls.
* No provider exposure to UI.
* No frontend-owned intelligence flow.
* Safe top-level error handling only.

---

## 2. OpenAI Provider Path

Status: Complete

Purpose:
Connect real OpenAI reasoning through a provider adapter.

Rules:

* `OPENAI_API_KEY` lives server-side only.
* Provider errors are normalized.
* Raw provider output is not exposed to UI.
* Provider can be swapped later without changing frontend behavior.

---

## 3. Usage Metering Foundation

Status: Complete

Purpose:
Record and control Ask Meetro usage.

Rules:

* Usage limits are backend-owned.
* Limits block before provider invocation.
* Successes and failures are recorded.
* Billing is not implemented yet.
* UI does not calculate credits or limits.

---

## 4. Companion Context Engine

Status: Complete

Purpose:
Build safe backend-owned context for the authenticated user.

Context may include:

* user identity
* account type
* current role
* source page/surface
* active request/job if backend-owned
* workflow state if backend-owned
* business profile context for professionals

Rules:

* Frontend cannot inject trusted context.
* Fake userId, role, accountType, jobId, requestId, business data, or workflow status must be ignored.
* Only backend-owned data is trusted.

---

## 5. Session Memory

Status: Complete

Purpose:
Give the Companion short-term conversation continuity.

Rules:

* Session memory is user-scoped.
* Forged session IDs are ignored.
* Expired sessions are not reused.
* Memory window is limited.
* UI receives only an opaque `companionSessionId`.
* Internal memory is not exposed to UI.

---

## 6. Companion Orchestrator

Status: Complete

Purpose:
Coordinate intelligence engines without overloading the Gateway.

Rules:

* Gateway delegates.
* Orchestrator owns the intelligence sequence.
* Future engines plug into the orchestrator.
* Diagnostics are internal only.

---

## 7. Knowledge Engine

Status: Complete

Purpose:
Give the Companion Meetro Community’s internal truth.

Knowledge includes:

* Meetro Community purpose
* trust principles
* universal lifecycle
* Completion vs Closure
* quote/proposal/approval boundaries
* emergency safety boundaries
* provider-blind AI rules

Rules:

* Curated backend-owned knowledge only.
* Frontend cannot inject trusted knowledge.
* Provider receives selected knowledge, not the full knowledge base.
* UI never receives the internal knowledge packet.

---

## 8. Capability Engine

Status: Complete

Purpose:
Teach the Companion to reason from problems to capabilities.

Meetro Community does not think:

```txt
problem → category → listing
```

It thinks:

```txt
problem → capabilities needed → possible professional fit → relationship → decision
```

Rules:

* No ranking.
* No matching.
* No professional recommendation yet.
* No marketplace logic.
* Provider receives selected capability context only.
* UI does not receive capability internals.

---

## 9. Workflow Intelligence Engine

Status: Complete

Purpose:
Teach the Companion where the user is in the lifecycle and what the next safe action is.

Lifecycle:

```txt
Relationship
→ Communication
→ Schedule
→ Evaluation
→ Quote
→ Approval
→ Work
→ Completion
→ Closure
→ History
```

Rules:

* AI cannot change workflow state.
* AI cannot approve quotes.
* AI cannot close jobs.
* AI cannot auto-create invoices, proposals, or schedules.
* Completion is not Closure.
* Provider receives safe workflow guidance only.

---

## 10. Relationship Intelligence Engine

Status: Complete

Purpose:
Teach the Companion that work happens inside human relationships.

Relationship chain:

```txt
Relationships create communication.
Communication creates understanding.
Understanding creates decisions.
Decisions create work.
Work creates history.
History strengthens relationships.
```

Rules:

* No auto-messaging.
* No trust scoring.
* No ranking people or businesses.
* No relationship mutation.
* Provider receives safe relationship guidance only.
* UI does not receive relationship internals.

---

## 11. Intelligence Engine Contract

Status: Complete

Purpose:
Define the shared result shape future intelligence engines should use as they are incrementally adapted.

The contract standardizes:

* success results
* failure results
* engine name
* contract version
* safe data payload
* internal diagnostics
* recoverability for failures
* warnings when needed

Rules:

* The contract is a backend engine pattern.
* Existing engines may be adapted incrementally.
* Do not refactor all engines simply because the contract exists.
* Contract internals do not belong in the UI.
* Gateway and Orchestrator behavior must not change unless explicitly tasked.

---

## 12. Intelligence Engine Registry

Status: Complete

Purpose:
Define the backend metadata registry for intelligence engines so current and future engines have one source of truth for engine identity and order.

Registry metadata includes:

* name
* version
* execution order
* enabled flag

Current enabled engines:

```txt
Intent
→ Context
→ Session Memory
→ Knowledge
→ Capability
→ Workflow
→ Relationship
```

Disabled future extension points:

```txt
Community Intelligence
Business Intelligence
Document Intelligence
Portfolio Intelligence
Persistent Companion Memory
```

Rules:

* The registry is metadata-only for now.
* The registry must not execute engines yet.
* The registry must preserve current orchestration order.
* Orchestrator behavior must not change unless explicitly tasked.
* Gateway behavior must not change because the registry exists.
* Future engines should be registered before they are wired into execution.

---

# SAFE UI RESPONSE CONTRACT

The UI may receive only:

```txt
answer
requestId
intent
companionSessionId
errorCode when needed
```

The UI must never receive:

```txt
provider
model
token details
raw provider response
internal context payload
internal memory payload
internal knowledge packet
internal capability reasoning
internal workflow intelligence
internal relationship intelligence
internal diagnostics
billing internals
usage internals
```

---

# ENGINE RESPONSIBILITIES

## Intent Engine

Determines what the user is asking.

It should answer:

```txt
What kind of help is this?
```

It must not:

* perform workflow actions
* select providers
* mutate data
* own business rules

---

## Context Engine

Determines where the user is.

It should answer:

```txt
Who is asking, from what role, on what surface, with what backend-owned context?
```

It must not:

* trust frontend identity
* over-fetch unrelated records
* expose raw data

---

## Session Memory

Determines what just happened in this conversation.

It should answer:

```txt
What recent exchange matters for this session?
```

It must not:

* become permanent memory
* mix users
* expose raw memory
* store unnecessary sensitive data

---

## Knowledge Engine

Determines what Meetro Community believes.

It should answer:

```txt
What platform truth should guide this response?
```

It must not:

* send the full knowledge base
* allow frontend knowledge injection
* let AI invent rules when Meetro rules exist

---

## Capability Engine

Determines what capabilities the problem requires.

It should answer:

```txt
What skills or capability families may be needed?
```

It must not:

* rank professionals
* route leads
* recommend businesses
* behave like a marketplace search

---

## Workflow Engine

Determines where the work is in the lifecycle.

It should answer:

```txt
What stage is this, what is missing, and what is the next safe action?
```

It must not:

* mutate workflow state
* approve quotes
* close jobs
* create schedules
* create invoices
* create proposals

---

## Relationship Engine

Determines how guidance should protect trust.

It should answer:

```txt
What relationship is involved, and how should communication preserve clarity and trust?
```

It must not:

* score trust
* rank people
* auto-message
* mutate relationships

---

## Provider Adapter

Translates Meetro intelligence into provider-safe reasoning input.

It should answer:

```txt
What selected context should the AI reason from?
```

It must not:

* expose provider details to UI
* send raw unrelated data
* bypass orchestration rules

---

# PERMANENT TRUST BOUNDARIES

## Frontend Boundary

The frontend may send:

* user message
* optional source/page metadata
* opaque session ID

The frontend may not send trusted:

* userId
* account type
* role
* business identity
* request/job ownership
* workflow state
* knowledge
* capabilities
* relationship context
* billing status
* provider choice

---

## Backend Boundary

The backend owns:

* authentication truth
* role/account truth
* usage truth
* context truth
* memory truth
* knowledge truth
* capability truth
* workflow truth
* relationship truth
* provider routing
* safe response normalization

---

## Provider Boundary

The provider may receive:

* selected safe context
* selected memory
* selected knowledge
* selected capability context
* selected workflow guidance
* selected relationship guidance

The provider must not receive:

* raw database dumps
* unrelated records
* hidden permissions
* provider/billing internals
* trust scores
* rankings
* frontend-injected trusted data
* private records from other users

---

# NEXT INTELLIGENCE PHASES

## Phase 11 — Community Intelligence

Purpose:
Understand the community as a living capability network.

Questions it should help answer:

* What can this community collectively accomplish?
* What capabilities are missing locally?
* What kinds of help are common in this area?
* Where can relationships be strengthened?

Hard rules:

* No lead selling.
* No marketplace ranking.
* No exploiting community data.
* Community intelligence must strengthen local trust.

---

## Phase 12 — Business Intelligence

Purpose:
Help professionals understand and improve their business.

Examples:

* workload clarity
* revenue summaries
* quote follow-up awareness
* customer communication guidance
* service capability gaps
* scheduling pressure
* operational health

Hard rules:

* Do not give financial/legal/tax certainty.
* Do not mutate business data without explicit user action.
* Do not expose private business analytics to customers.

---

## Phase 13 — Persistent Companion Memory

Purpose:
Allow the Companion to remember across days and weeks with user control.

Examples:

* user preferences
* active long-term projects
* known business capabilities
* recurring customer relationships
* prior decisions
* ongoing unresolved obligations

Hard rules:

* Must be user-controlled.
* Must be inspectable.
* Must be erasable.
* Must avoid unnecessary sensitive storage.
* Must never replace backend system-of-record truth.

---

## Phase 14 — Document Intelligence

Purpose:
Understand platform documents and user-provided documents.

Examples:

* proposals
* invoices
* contracts
* warranties
* permits
* inspections
* manuals
* receipts
* reports

Hard rules:

* Document access must respect ownership.
* Do not expose private documents across users.
* Do not treat extracted text as verified truth without context.
* Legal/financial/medical documents require disclaimers and boundaries.

---

## Phase 15 — Portfolio Intelligence

Purpose:
Infer professional capabilities from completed work and portfolio media.

This is critical to the Meetro Community vision because professionals should not have to spend hours listing every capability manually.

Hard rules:

* Portfolio inference should assist, not falsely certify.
* Professionals should confirm inferred capabilities.
* Do not overstate skill.
* Do not rank businesses from portfolio alone.

---

## Phase 16 — Companion Specialization

Purpose:
One intelligence platform, role-specific behavior.

Possible modes:

* Homeowner Companion
* Professional Companion
* Business Companion
* Community Companion
* Admin Companion

Hard rules:

* Same backend trust boundaries.
* Same provider-blind UI contract.
* Different guidance, not different truth.

---

## Phase 17 — Proactive Companion

Purpose:
Help before the user asks, only when appropriate.

Examples:

* unresolved quote follow-up
* schedule conflict warning
* completion missing closure
* permit or inspection reminder
* customer communication nudge
* business opportunity awareness

Hard rules:

* No spam.
* No manipulation.
* No automatic action without permission.
* Must be dismissible.
* Must be relationship-safe.

---

## Phase 18 — AI Membership & Credits

Purpose:
Connect AI usage to sustainable business tiers.

Examples:

* free monthly Ask Meetro limit
* professional usage allowance
* business tier usage
* credit packs
* team quotas
* abuse protection
* admin monitoring

Hard rules:

* Billing must never live in frontend logic.
* Credits must be backend-owned.
* Provider cost must be abstracted.
* AI cannot be fully unlimited without business guardrails.

---

# WHAT MUST NEVER HAPPEN

Meetro Community must never become:

```txt
a generic chatbot wrapper
a lead-selling platform
a pay-to-rank marketplace
an uncontrolled automation bot
a trust score machine
a hidden surveillance system
a provider-dependent AI product
a UI-owned AI system
a feature pile without architecture
```

---

# THE LANTER PROMISE

Every intelligence feature must answer:

```txt
Does this strengthen relationships?
Does this reduce uncertainty?
Does this preserve continuity?
Does this protect trust?
Does this keep Meetro Community as the source of truth?
```

If the answer is unclear, do not build it yet.

Let the discovery mature.

---

# FINAL ARCHITECTURAL STATEMENT

Meetro Community Intelligence is not artificial intelligence pasted onto a product.

It is the product learning how to understand its own purpose.

The Companion does not replace people.

It helps people move through work, trust, responsibility, and community with less confusion.

OpenAI reasons.

Meetro Community understands.

The Companion protects the relationship.

The lantern stays lit.

---

# MC-AI-011 — Persistent Companion Memory Foundation

## Responsibility

Persistent Companion Memory preserves compact, approved operational facts across sessions. It is not a conversation archive and does not replace workflow, relationship, business, or product records. The engine consumes only a trusted backend repository and contributes minimized context through the existing Unified Context Builder.

The production sequence is:

```text
Workflow Intelligence
  -> Relationship Intelligence
  -> Persistent Companion Memory
  -> Unified Context Builder
  -> Provider Adapter
```

One Gateway request still produces one provider call and one usage-accounting flow.

## Session Memory Separation

Session memory remains a short-lived conversation-continuity buffer. Persistent memory is a separate domain with explicit ownership, scope, source, consent, lifecycle, sensitivity, correction, deletion, retention, and versioning. Session exchanges are never automatically promoted.

The only approved future promotion path is:

```text
Session fact
  -> Memory proposal
  -> User confirmation
  -> Persistent repository
```

## Record And Scope Contract

Every durable record has a stable typed memory ID, owner type and ID, one explicit scope, centralized category, minimal structured value, human-readable summary, traceable source, consent record, lifecycle, sensitivity, confidence, tags, and version.

Supported scopes are user, business, relationship, workflow, conversation, community, and approved system context. User and business identities come from authenticated backend context. Relationship, workflow, and conversation retrieval require exact stable IDs. Display-name matching is forbidden.

Supported categories are centralized in `server/intelligence/memory/memoryContracts.js`. Clients cannot create arbitrary categories.

## Consent And Write Policy

User and business preferences require explicit or user-confirmed consent. Minimal workflow-continuity references may use `system_required` when the product relationship already authorizes that continuity. Unknown or withdrawn consent cannot be persisted or retrieved.

The write policy rejects speculative, transient, unscoped, unsupported, sensitive, credential-bearing, raw-message, private-note, and unrestricted customer content. User statements are not automatically remembered.

```text
User or System Fact
  -> Memory Write Policy
  -> Consent and Scope Validation
  -> Memory Proposal
  -> Confirmation
  -> Persistent Repository
  -> Scoped Retrieval
  -> Persistent Memory Engine
  -> Unified Context Builder
  -> Provider
```

Proposals remain pending until explicitly confirmed. Rejection creates no active memory.

## Repository Contract

Persistent memory is database-agnostic. The repository boundary supports create, read, scoped list, update, correction, deletion, scope deletion, expiration, usage recording, proposal confirmation or rejection, and privacy-driven purge. The deterministic in-memory adapter is test-only and must not be used as production persistence.

Production must inject a trusted adapter through `persistentMemoryRepository`, `backendContext.memoryRepository`, or `repositories.memory`. No suitable database-backed repository exists in the current codebase, so deployment must provide this adapter before durable writes are enabled. The engine fails empty when no repository is present; it never falls back to frontend storage, static files, or global process memory.

## Lifecycle, Correction, And Deletion

Lifecycle states are proposed, active, superseded, expired, deleted, and rejected. Correction creates a new stable record and version linked through `previousMemoryId`; the prior version becomes superseded. Deleted, expired, superseded, rejected, and withdrawn-consent records are immediately excluded from retrieval.

Deletion affects Companion memory only. It never deletes jobs, workflows, relationships, conversations, customers, messages, invoices, or history. The repository boundary supports minimal audit retention and an authorized purge operation where privacy requirements require permanent erasure.

Retention dates are never inferred. Preferences remain until changed or deleted; scoped operational references require explicit expiration or an approved product policy.

## Sensitivity And Retrieval

Sensitivity levels are standard, restricted, and prohibited. Prohibited records are rejected without a bypass. The prohibited boundary includes credentials, payment information, medical and sensitive personal attributes, precise personal location, private messages and notes, photos, and prompt contents.

Retrieval is deterministic and scope-first:

```text
exact workflow
  -> exact relationship
  -> exact business
  -> exact user preference
  -> approved system rule
```

Exact category, key, feature, capability, and unfinished-work signals refine ordering. No provider call, semantic vector search, psychological inference, sentiment, or personality analysis ranks memory. Context limits and deterministic tie-breaking prevent uncontrolled provider payloads.

## Authority Boundaries

Workflow Intelligence remains the authority for current lifecycle state. Memory may reference unfinished work but cannot duplicate or override live workflow evidence. Relationship Intelligence remains the authority for current relationship state. Memory may preserve an approved continuity preference but cannot store narratives, sentiment, personality, loyalty, or trust conclusions.

## Authorization And Logging

All write, correction, deletion, and retrieval operations use authenticated server identity and trusted authorization context. Cross-user and cross-business records are excluded. Exact relationship, workflow, and conversation authorization is required.

Memory logs may include request IDs, owner IDs, business IDs, memory IDs, category, scope type, counts, statuses, truncation, and timing. They must never include values, summaries, source content, customer names, private notes, addresses, credentials, prompts, or provider context.

## Production Data Contract

The backend adapter must provide scoped persistence equivalent to:

- `repositories.memory`
- `backendContext.memoryRepository`
- authenticated user identity
- authorized business IDs
- exact authorized relationship, workflow, and conversation IDs

The adapter must enforce durable storage, transactional correction, immediate deletion exclusion, index cleanup, retention, access control, and privacy-driven purge. Until that adapter exists, persistent retrieval is safely empty and no production durable write is claimed.

---

# MC-AI-012 — Business Intelligence Foundation

## Responsibility And Flow

Business Intelligence is a read-only interpretation layer for authorized operational evidence. It aggregates workload, pipeline, responsibility, scheduling, lifecycle backlogs, financial workflow signals, bottlenecks, priorities, trends, confidence, and business-health classification. It does not operate the business or replace accounting, scheduling, workflow, relationship, or memory authority.

```text
Business-Scoped Request
  -> Gateway
  -> Orchestrator
  -> Workflow Intelligence
  -> Relationship Intelligence
  -> Persistent Memory
  -> Business Scope Resolver
  -> Normalize and Deduplicate Operational Records
  -> Build Workload, Pipeline, Schedule, and Financial Signals
  -> Detect Bottlenecks
  -> Determine Priorities
  -> Classify Business Health
  -> Return Structured Business Context
  -> Unified Context Builder
  -> Provider
```

One Gateway request continues to produce no more than one provider execution and one usage-accounting event.

## Business Scope Resolution

Business scope comes from authenticated backend identity, authorized business IDs, or a trusted backend business profile. Client-supplied business IDs and business names are never authority. Where more than one authorized business exists and no trusted active business is supplied, the engine returns empty context rather than combining businesses.

Every source record must carry the exact resolved business ID. Out-of-scope and unscoped records are excluded. The engine never combines metrics across businesses or personal and professional accounts.

## Supported Sources

The trusted adapter may provide scoped service requests, workflows, visits, evaluations, proposals or quotes, approvals, deposits, payments, schedules, active work, emergency records, completion records, Closure records, Job History, invoices, receipts, and operational relationship metadata. Repository methods receive authenticated user and resolved business ID.

Frontend localStorage selectors are not backend intelligence sources. Production integrations must provide trusted records through `backendContext` or scoped repository methods such as `getBusinessRecords`, `getWorkflowRecords`, `getScheduleRecords`, `getProposalRecords`, `getFinancialWorkflowRecords`, and `getRelationshipRecords`.

## Normalization And Deduplication

The normalizer projects stable IDs, lifecycle statuses, responsibility, blockers, explicit schedule timestamps, Completion, Closure, history, proposal, invoice, receipt, and aggregate-value evidence. It excludes names, addresses, messages, private notes, attachments, and payment credentials.

Lifecycle records deduplicate by stable job, project, emergency request, or request ID. Proposals, invoices, receipts, evaluations, and schedules use their own typed IDs. Completion and Job History representations do not create additional jobs. Conflicting cross-business identities are excluded rather than merged.

## Workload And Pipeline

Workload distinguishes open workflows, active work, emergency work, scheduled-today and upcoming work, explicit overdue items, completed-but-not-closed work, and closed work. Business dates use the authenticated business timezone; UTC is only the documented fallback when no timezone is supplied.

Overdue classification requires an explicit overdue state, due timestamp, schedule timestamp with qualifying workflow evidence, or product SLA. Record age alone is never overdue evidence.

Pipeline metrics distinguish new requests, unfinished evaluations, proposal drafts, sent proposals, customer approval waiting, and approved work without a linked schedule.

## Responsibility, Bottlenecks, And Priorities

Waiting-on counts aggregate Workflow Intelligence responsibility values for customer, professional, system, and third party. Normal customer waiting is not automatically overdue or a bottleneck.

Bottlenecks require deterministic evidence and minimum backlog conditions. Supported classes include emergency or active-work pressure, explicit overdue work, evaluation and proposal backlogs, professional response backlog, completion and Closure backlog, invoice or receipt workflow backlog, history reconciliation, and explicit schedule conflicts.

Priorities are read-only, evidence-derived, deduplicated, capped, and deterministically ordered. Emergency and safety-related issues precede normal operational review; professional-owned due work precedes ordinary customer waiting. The engine never sends, schedules, approves, closes, changes, or resolves anything.

## Scheduling Capacity

Capacity is normalized as available, medium, busy, full, or unknown. It uses explicit scheduled work, overlaps with complete start and end timestamps, emergency pressure, approved-unscheduled work, and approved business-scoped Persistent Memory defaults. Missing duration or capacity evidence produces conservative or unknown results. No employee capacity is invented.

## Financial Workflow Signals

Financial signals keep proposed value, approved value, invoiced value, and recorded or collected revenue separate. Proposal value is never earned revenue. Unpaid invoice value is never collected revenue. Recorded revenue is included only when trusted source records provide it and payment or receipt evidence supports it.

The engine does not calculate taxes, profit, cash balance, cash flow, bank reconciliation, or financial statements. Mixed currencies generate a warning and suppress a single aggregate currency claim.

## Business Health, Trends, And Confidence

Health classifications are healthy, busy, overloaded, underutilized, blocked, and unknown. Classification combines multiple operational signals and centralized conservative defaults; it does not use an AI call or a single universal count in isolation. Detailed thresholds remain internal implementation policy.

Trends require comparable timestamped windows and sufficient evidence. Insufficient evidence returns `insufficient_data` or `unknown`; no seasonality or revenue forecast is inferred.

Confidence is deterministic. Stable scoped records and complete timestamps support higher confidence. Missing timestamps, mixed currency, contradictory identities, unresolved duplicates, or disputed states reduce confidence and produce safe warnings.

## Authority Boundaries

Workflow Intelligence remains authoritative for lifecycle stage, next action, waiting actor, blockers, obligations, Completion versus Closure, and Job History eligibility. Relationship Intelligence remains authoritative for customer continuity and communication response state. Persistent Memory may contribute only active, consent-valid, exact-business preferences; it never overrides current operational records.

## Privacy And Logging

Provider context contains aggregates, classifications, safe evidence counts, warnings, and stable business ID only. It excludes customer names, private notes, message bodies, addresses, phone numbers, email addresses, attachments, photos, invoice or receipt contents, payment or banking details, tax data, prompts, and unrelated memory values.

Logs may contain request and business IDs, workflow, bottleneck, and priority counts, classification, confidence, truncation, and elapsed time. Logs never include raw records, names, notes, messages, addresses, financial details, memory values, prompts, or unified provider context.

## Production Adapter Requirements

Production repositories must enforce authenticated business scope before returning records, preserve stable typed IDs, provide business timezone where available, prevent unrestricted whole-database reads, and return immutable or safely copied records. The engine is read-only and safely returns empty context when an authorized business or trusted evidence cannot be established.
