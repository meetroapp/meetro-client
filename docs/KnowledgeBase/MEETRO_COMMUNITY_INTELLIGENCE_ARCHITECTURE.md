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

---

# MC-AI-013 — Community Intelligence Foundation

## Responsibility And Flow

Community Intelligence is a read-only interpretation layer for authorized, visible, privacy-safe community evidence. It aggregates Moments, Spotlight, Wonder Pass, public posts and profiles, local service representation, permitted engagement metadata, and community-linked relationships. It does not rank people, alter recommendations, create content, issue benefits, contact members, or perform community actions.

```text
Community-Scoped Request
  -> Gateway
  -> Orchestrator
  -> Workflow Intelligence when relevant
  -> Relationship Intelligence
  -> Persistent Memory
  -> Business Intelligence when authorized
  -> Community Scope Resolver
  -> Authorization and Visibility Filtering
  -> Location Minimization
  -> Normalize and Deduplicate Community Records
  -> Build Moments, Spotlight, Wonder Pass, Service, and Engagement Signals
  -> Determine Community Opportunities
  -> Return Structured Community Context
  -> Unified Context Builder
  -> Provider
```

One Gateway request continues to produce no more than one provider call and one usage-accounting event.

## Scope And Authorization

Community scope comes from authenticated membership, authorized community IDs, a trusted backend community context, or an explicitly public backend community scope. Client-supplied community IDs and display names are never authority. Ambiguous multi-community scope returns empty context unless the backend provides one trusted active scope.

Every included record must carry the exact resolved community or service-area ID. Separate communities are never combined unless a future explicitly authorized regional aggregate contract is introduced.

## Visibility

Visibility filtering occurs before normalization or aggregation. Public content still requires a valid product scope. Community visibility requires membership. Connections or relationship visibility requires an exact Relationship Intelligence linkage. Private, hidden, blocked, deleted, and archived records are excluded. Blocking overrides other visibility.

Contradictory visibility, such as public and private evidence on the same record, is excluded and lowers confidence. The engine does not change source visibility.

## Location Privacy

Community context may include stable community ID, service-area ID, city, broad region, and an explicitly public neighborhood ID. It excludes street addresses, exact coordinates, private service addresses, customer locations, movement, and inferred routines. Multiple sources are never combined to reconstruct precise location.

## Supported Sources And Deduplication

Trusted repositories may provide Moments, Spotlight, Wonder Pass, community posts, visible profiles, aggregate engagement, service interests, and community-linked relationship records. Source records are projected into stable IDs, visibility-safe categories, timestamps, aggregate counts, and coarse location.

Moments, Spotlights, Wonder Pass offers, posts, profiles, engagement events, relationships, and conversations deduplicate by typed stable IDs. A professional shown in multiple categories counts once globally while remaining represented in each explicit category. Conflicting cross-community identities are excluded.

## Moments, Spotlight, And Wonder Pass

Moments use visible status, expiration, categories, and aggregate interaction counts. Private content, viewer identities, reaction identities, and sentiment are excluded.

Spotlight presence is factual product placement, not endorsement, superiority, quality, trust, or social worth. The engine never changes Spotlight selection or ranking.

Wonder Pass interpretation is limited to visible active offers, categories, availability, expiration, and authorized aggregate redemption counts. It never exposes individual redemption history, infers spending power, issues passes, redeems benefits, or changes eligibility.

## Service Discovery And Engagement

Service discovery counts visible professionals by explicit category and uses only authorized aggregate interest records. One request or interaction never becomes a demand trend. Low visible supply requires explicit aggregate interest evidence and remains an advisory signal; it never creates leads or changes Discover ordering.

Engagement includes permitted aggregate reaction, comment, share, save, redemption, and conversation counts. It excludes private viewers, private saves, identity-level browsing, comment bodies, message bodies, and hidden reactions.

## Relationship, Business, And Memory Boundaries

Relationship Intelligence remains authoritative for current relationship state. Community Intelligence may count an exact community-linked relationship or conversation but does not infer friendship, influence, loyalty, trust, or social value.

Business Intelligence remains authoritative for private operations. Community context never includes workload, revenue, invoices, customers, business health, or internal priorities. Public service-category participation may be supplied only through an explicitly public community record.

Persistent Memory may contribute active, consent-valid, exact-community preferences from approved categories. It never supplies current community facts, and business, workflow, relationship, or unrelated user memories are excluded.

## Signals, Opportunities, And Trends

Community signals are deterministic factual observations about visible categories, recent visible activity, aggregate engagement, and existing authorized connections. Strength and opportunity ordering use centralized implementation policy that is not a popularity or recommendation score.

Opportunities are evidence-derived, deduplicated, capped, and read-only. They may identify visible service interest, limited visible supply, active public content, Wonder Pass participation, or an authorized connection. They do not create leads, contact users, promise demand, or modify recommendation outcomes.

Trends require sufficient timestamped samples and comparable windows. Unsupported trends return `insufficient_data` or `unknown`; the engine never forecasts behavior, seasonality, or future demand.

## Confidence, Privacy, And Logging

Confidence is deterministic. Stable scope, visibility, IDs, and timestamps support higher confidence. Visibility conflicts, active-after-expiration evidence, ambiguous duplicates, unsafe location, and incomplete authorization lower confidence and produce safe warnings.

Provider context excludes names, customer identity, private requests, addresses, coordinates, browsing history, viewer lists, private engagement identities, raw messages or comments, media, payment details, sensitive traits, personality, sentiment, income, popularity, influence, trust, loyalty, and social-value scores.

Logs may contain request and community IDs, source and visible counts, signal and opportunity counts, confidence, truncation, and timing. Logs never contain raw content, names, comments, messages, private reactions, location details, memory values, prompts, or unified provider context.

## Production Repository Requirements

Production adapters must enforce community authorization and visibility before returning records, preserve stable typed IDs, expose only policy-approved aggregate engagement, provide coarse location fields, prevent unrestricted whole-database reads, and return immutable or safely copied records. Supported boundaries include `getCommunityRecords`, `getMomentRecords`, `getSpotlightRecords`, `getWonderPassRecords`, `getVisibleProfileRecords`, `getCommunityEngagementRecords`, and `getCommunityRelationshipRecords`.

Frontend localStorage and UI discovery projections are not backend intelligence authority. Without a trusted community scope and visible records, the engine returns empty context.

## Knowledge Intelligence Foundation

Status: Complete (MC-AI-014)

Knowledge Intelligence is the read-only source-aware evidence layer. It identifies a supported domain, resolves backend-owned authorization scope, discovers records through an injected trusted repository, filters status and confidentiality before retrieval, orders relevant evidence deterministically, and contributes one bounded `knowledge` section to Unified Context. It never writes the final answer, changes product state, calls a provider, or treats provider language, session messages, memory, or client-supplied documents as verified knowledge.

```text
Knowledge-Scoped Request
  -> Gateway
  -> Orchestrator
  -> Knowledge Scope Resolver
  -> Authorization and Confidentiality Filtering
  -> Domain and Intent Resolution
  -> Source Discovery
  -> Freshness, Version, and Status Filtering
  -> Deterministic Retrieval
  -> Conflict Detection
  -> Fact and Guidance Normalization
  -> Citation Construction
  -> Structured Knowledge Context
  -> Unified Context Builder
  -> Provider
```

### Source And Domain Contracts

The centralized domain registry accepts only reviewed product, workflow, relationship, business operations, community, service, evaluation, emergency, lifecycle, documentation, transaction, scheduling, permit, inspection, compliance, policy, safety, onboarding, hiring, Community-program, Companion, and architecture domains. Client-provided arbitrary domain names are not trusted.

A source has a stable typed ID, approved source type, explicit domain and optional subdomains, authority, confidentiality, active status, language, version, effective and update metadata, optional supersession and product-version metadata, a repository-relative reference, and bounded structured facts or guidance. Supported source types include internal and product standards, architecture standards, policies, legal documents, workflow standards, evaluation templates, service, emergency and permit guides, business and system rules, and repository-approved external references. Arbitrary URLs are not sources.

### Authority, Confidentiality, And Scope

Authority is metadata-owned and ordered from authoritative through approved, reference, advisory, and unverified. Only authoritative or approved structured records may produce verified facts. Advisory prose remains attributed guidance. Equal-authority material conflicts are surfaced and block definitive facts and guidance; a weaker disagreement does not silently displace stronger evidence.

Confidentiality supports public, user-visible, internal, restricted, and prohibited records. Internal use requires trusted backend authorization, restricted records require exact source authorization, and prohibited records never enter provider context. Business, relationship, and community scope IDs must match backend-authorized IDs. Restricted titles and paths are minimized. Frontend identity, scope, authority, confidentiality, source IDs, and documents do not grant access.

### Discovery, Indexing, And Retrieval

Production discovery occurs only through an injected read-only repository. The engine does not traverse the filesystem, crawl websites, ingest URLs, or create embeddings. The initial index and relevance boundary is deterministic metadata and lexical matching using source identity, domain, subdomain, feature context, language, product version, authority, status, freshness, tags, headings, and bounded query terms. Exact scoped and higher-authority evidence is preferred. Detailed weighting remains confidential.

Retrieval limits considered and returned sources, facts, guidance, excerpt length, citations, and serialized context. Ordering and tie-breaking are deterministic. Full documents, unrestricted metadata, secrets, credentials, private messages, attachments, and customer records are excluded. The repository contract supports listing/searching sources, exact source reads, structured facts, bounded excerpts, and retrieval-usage recording without mutation.

### Facts, Excerpts, Citations, And Status

Verified facts must be curated structured records and carry supporting source IDs. Arbitrary prose is never promoted into a formal fact; when relevant, a small normalized excerpt becomes attributed guidance. Stable `knowledge:*` source markers preserve traceability for provider context and future citation presentation. Local absolute paths are never included.

Knowledge status is normalized as supported, partially supported, conflicted, insufficient evidence, unauthorized, stale only, or unknown. No authorized repository or no verified match returns `insufficient_evidence`, not generated truth. Confidence is deterministic and decreases for advisory authority, unknown or stale metadata, partial scope, and unresolved conflicts.

### Freshness, Versioning, And Supersession

Freshness uses only recorded effective, updated, expiration, supersession, and version metadata. Current sources outrank aging or stale records. Expired sources are excluded. Superseded sources are excluded unless trusted historical access is explicitly requested. Stale-only evidence is labeled and warned; missing dates lower confidence. Product-version mismatch produces a warning rather than presenting older behavior as current. Review dates are never invented.

### Disclaimers And Safety-Critical Knowledge

Disclaimer codes are domain- and evidence-based, including legal-information boundaries, local permit verification, emergency-condition verification, professional inspection, source conflict, stale evidence, and insufficient verified knowledge. Emergency, safety, electrical, gas, structural, fire, mold, medical, legal, financial, permit, inspection, and compliance guidance requires conservative verified support. Conflicted or unsupported evidence cannot become definitive instructions.

### Engine Boundaries And Provider Packaging

Workflow Intelligence remains authority for live lifecycle state; Knowledge can explain a standard but cannot change that state. Relationship Intelligence owns live relationship context. Persistent Memory owns approved preferences, which cannot override product, policy, workflow, legal, or safety evidence. Business Intelligence owns current operational metrics, and Community Intelligence owns current authorized community activity. Session Memory is conversational continuity only and is never a knowledge source.

Knowledge runs after Community and Contracts in the executable orchestration sequence and contributes one structured section before the existing single provider execution. Provider packaging separates query, sources, facts, guidance, conflicts, freshness, confidence, disclaimers, and warnings. The provider may explain evidence but may not invent citations or convert unsupported content into verified knowledge. Gateway response, usage metering, model selection, credits, and provider count are unchanged.

### Repository, Ingestion, And Logging Boundaries

Production requires a database-backed or equivalent immutable read-only adapter that performs authorization before returning records and preserves reviewed metadata. Until that adapter exists, production behavior is safely empty. The in-memory adapter exists for deterministic tests only.

Future ingestion must separately validate source type, file safety, confidentiality, domain, authority, version, review approval, indexing, and publication. This foundation adds no upload UI, automatic crawling, arbitrary URL ingestion, or mutable source-controlled runtime store.

Safe logs contain request and domain identifiers, source counts, status, confidence, conflicts, truncation, and timing only. They exclude messages, prompts, source text, excerpts, facts, guidance, private titles, confidential paths, credentials, customer information, and provider context.

## Capability Intelligence Foundation

Status: Complete (MC-AI-015)

Capability Intelligence is the read-only reasoning and routing layer that identifies what a member is trying to accomplish, resolves an approved Meetro Community capability, evaluates whether its role, scope, permission, input, and prerequisite requirements are satisfied, classifies risk and availability, and proposes one safe next step. It does not execute the capability.

```text
Capability-Scoped Request
  -> Gateway
  -> Orchestrator
  -> Existing Intelligence Context
  -> Capability Intent Resolver
  -> Capability Registry
  -> Role, Scope, Permission, Input, and Prerequisite Evaluation
  -> Capability Selection
  -> Risk and Availability Classification
  -> Safe Next-Step Proposal
  -> Structured Capability Context
  -> Unified Context Builder
  -> Provider
```

### Registry And Contracts

The server-owned registry defines stable capability IDs, names, domains, categories, supported roles, required scopes and permissions, required and optional inputs, prerequisites, execution mode, risk, supported features, supporting engines, version, lifecycle status, and replacement metadata. Definitions are schema-validated, duplicate IDs are rejected, and lookup order is deterministic. Clients cannot register capabilities.

Registered domains cover evidenced product guidance, workflow, emergency, relationship and communication, business operations, Community, verified knowledge, documents, hiring, onboarding, and settings. Categories distinguish informational, diagnostic, navigational, preparatory, review, communication, workflow, business, Community, document, administrative, restricted, and unsupported work.

### Intent And Selection

Intent resolution is deterministic. It evaluates a validated capability ID, supported product feature or surface, existing workflow evidence, approved structured metadata, and bounded product-language mappings. Unsupported IDs are rejected. Vague language does not become mutation authority, and requests to send, publish, approve, record, close, or silently change product state return an execution-unavailable result. Safer review or preparation is distinct from execution.

The output identifies the intent, requested outcome, selected capability, alternatives, authorization, prerequisites, inputs, supporting engines, next step, execution boundary, status, confidence, evidence, and warnings. Missing or unsupported intent returns structured unsupported context rather than invented capability availability.

### Authorization, Scope, And Permissions

Role and account type come from the authenticated server user. Client role and permission fields are ignored. Supported normalized roles are standard and professional, with business-owner and business-member representations treated as professional only when provided by authenticated server context.

Scope evaluation uses stable backend evidence for user, business, relationship, workflow, conversation, community, document, and system scope. Display names never establish scope. Permission evidence comes only from trusted backend or authenticated user context. Capability Intelligence interprets apparent availability; Gateway and any future execution layer remain final enforcement authorities. Memory, Business, Community, and Knowledge output cannot grant permission.

### Inputs, Prerequisites, Modes, And Status

Required and optional inputs are declared centrally. Present, missing, invalid, and unauthorized references are reported without inventing values or copying private records. Lifecycle prerequisites use Workflow Intelligence outputs rather than a second state machine. Relationship, Community, Business, Knowledge, Memory, and Contracts evidence retain their established authority boundaries.

Modes are read-only, draft-only, preparatory, user-approved, restricted, or unavailable. Status is available, available with missing inputs, blocked, restricted, unsupported, ambiguous, or unavailable. Planned and disabled definitions are unavailable; deprecated definitions provide replacement guidance when configured.

Risk is informational, standard, sensitive, high impact, or prohibited. High-impact and user-approved capabilities always state that separate explicit approval is required, while `execution.performed` and `execution.executableNow` remain false. MC-AI-015 contains no execution function.

### Safe Next Steps And Ambiguity

The engine returns one deterministic next step: explain, collect input, resolve scope, resolve permission, complete a prerequisite, review a draft, request confirmation, identify a surface, take no action, or reject an unsupported request. Alternatives are bounded and deduplicated. Ambiguity never selects the higher-impact interpretation automatically.

### Cross-Engine And Provider Boundaries

Workflow owns live lifecycle state and blockers. Relationship owns relationship and communication context. Persistent Memory owns approved preferences but cannot satisfy authorization. Business owns current operational metrics. Community owns authorized community evidence. Knowledge owns verified rules and may block knowledge-dependent capability claims when evidence is insufficient. Contracts may support explanations but Capability Intelligence cannot alter contractual obligations.

The executable stage runs after Knowledge and contributes one `capabilities` section through Unified Context before the existing single provider call. Provider context marks capability output as advisory, records that execution did not occur, preserves missing and restricted states, and requires a separate approval boundary for future high-impact work. Gateway response and usage accounting remain unchanged.

### Logging And Production Limitation

Logs contain request, intent and capability IDs, status, category, risk, bounded counts, confidence, and timing only. They exclude message bodies, drafts, customer names, private inputs, document content, memory values, prompts, credentials, and provider context.

This milestone has no execution layer. It cannot send messages, create or save documents, change schedules, approve proposals, record payments, close jobs, publish Community content, modify memory, or mutate product state.

## Intelligence Validation And Confidence Foundation

Status: Complete (MC-AI-016)

Validation is the required final intelligence stage after Capability and before Unified Context provider execution. It consumes immutable copies of selected engine outputs, preserves every domain engine's authority, derives bounded claims and evidence references, surfaces agreements and contradictions, normalizes platform confidence, and creates deterministic response constraints. It does not generate answers or execute actions.

```text
Collected Engine Context
  -> Claim Adaptation
  -> Authority Resolution
  -> Evidence and Freshness Validation
  -> Identity and Scope Validation
  -> Agreement Detection
  -> Contradiction Detection
  -> Confidence Normalization
  -> Response Constraint Policy
  -> Validated Intelligence Context
  -> Unified Context Builder
  -> Provider
```

The authority matrix preserves Workflow for lifecycle and next action, Relationship for continuity and engagement, Persistent Memory for approved preferences, Business for operational aggregates, Community for authorized activity, Knowledge for verified guidance, Capability for approved capability definitions, and Contracts for contract context. Supporting engines cannot overwrite the authoritative domain.

Adapters derive minimal validation evidence from existing engine contracts without broad engine rewrites. Evidence uses stable engine and source or record IDs when available, never raw messages, source excerpts, private records, names, addresses, payment details, or provider output. Agreement and contradiction ordering is deterministic and deduplicated. Contradictions retain severity, authoritative engine, safe resolution boundary, and response impact; they are never silently discarded.

Freshness, scope, identity, authorization, Knowledge support, Capability readiness, Memory precedence, Business aggregate consistency, and Community privacy are validated only from available structured evidence. Display-name identity is not accepted. Memory cannot grant permission, Knowledge cannot invent live state, Capability cannot override Workflow prerequisites, and Community cannot expose private business or social-scoring fields.

Validation status is supported, partially supported, conflicted, insufficient evidence, unauthorized, stale only, blocked, or unknown. Overall confidence is high, medium, low, or withheld; numerical engine confidence is not averaged. Response modes are definitive, qualified, clarification required, insufficient evidence, conflict warning, escalation required, or blocked. Definitive language requires consistent current evidence and no material conflict. Safety, emergency, legal, permit, privacy, authorization, and unexpected execution conflicts constrain or block the provider and preserve applicable disclaimers.

Validation is a required executable engine so failure cannot silently bypass quality control. The provider receives original minimized domain context plus a separate `validation` section and must preserve uncertainty, contradictions, blocked topics, disclaimers, escalation, and the no-execution boundary. One provider call and existing usage accounting remain unchanged.

Safe logs contain request ID, statuses, response mode, counts, flags, and timing only. Validation never mutates Workflow, Relationship, Memory, Business, Community, Knowledge, Capability, or product state.
