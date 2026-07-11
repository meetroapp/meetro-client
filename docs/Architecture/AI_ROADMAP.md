# Meetro Community Intelligence Architecture Roadmap

**Status:** Authoritative planning and historical overview  
**Last verified:** 2026-07-11  
**Product:** Meetro Community

This roadmap explains why the Meetro Community Intelligence architecture evolved in its current sequence, how its components depend on one another, what repository evidence verifies, and what remains planned. It supports founder continuity, engineering onboarding, architecture review, diligence, IP chronology, dependency planning, milestone verification, and prevention of architectural drift.

Three records serve different purposes:

- Git history records what changed.
- The [Intellectual Property Ledger](../IntellectualProperty/IP_LEDGER.md) records what was created and its preliminary protection classification.
- This roadmap records why the architecture evolved in this sequence, how responsibilities depend on one another, and what comes next.

Legal and IP classifications remain preliminary. This document is architecture governance, not a patentability, ownership, registration, or freedom-to-operate determination.

## Documentation Map

- [Meetro Community Intelligence Architecture](../KnowledgeBase/MEETRO_COMMUNITY_INTELLIGENCE_ARCHITECTURE.md)
- [Intellectual Property Ledger](../IntellectualProperty/IP_LEDGER.md)
- [IP Governance Standard](../IntellectualProperty/IP_GOVERNANCE_STANDARD.md)
- [Trade Secret Register](../IntellectualProperty/TRADE_SECRET_REGISTER.md)
- [Invention Disclosure Template](../IntellectualProperty/INVENTION_DISCLOSURE_TEMPLATE.md)
- [Executable Intelligence Modules](../../server/intelligence/)
- [Gateway](../../server/intelligence/gateway.js)
- [Orchestrator](../../server/intelligence/orchestrator/)

## Current Architecture

```text
Application Feature
        |
        v
Authentication and Authorization
        |
        v
Membership, Permission, Rate, and Credit Validation
        |
        v
Intelligence Gateway
        |
        v
Intelligence Orchestrator
        |
        |-- Context and short-lived Session Memory
        |-- Knowledge helper                 [Implemented foundation]
        |-- Capability helper                [Implemented foundation]
        |-- Workflow Intelligence            [Implemented]
        |-- Relationship Intelligence        [Implemented]
        |-- Persistent Companion Memory      [Implemented]
        |-- Business Intelligence            [Implemented]
        |-- Community Intelligence           [Implemented]
        |-- Knowledge Intelligence           [MC-AI-014 Implemented]
        |-- Capability Intelligence          [MC-AI-015 Implemented]
        `-- Future Intelligence Engines
        |
        v
Unified Context Builder
        |
        v
Provider Adapter
        |
        v
AI Provider
        |
        v
Usage Recording
```

The verified staged execution sequence in `server/intelligence/orchestrator/companionOrchestrator.js` is:

```text
Context and Session Memory
  -> Knowledge
  -> Capability
  -> Workflow
  -> Relationship
  -> Persistent Memory
  -> Business
  -> Community and Contracts
  -> Unified Context
  -> One Provider Execution
```

Engine selection is feature-aware; not every engine executes for every request. The sequence establishes dependency order when selected.

The Orchestrator must remain thin. Domain logic belongs in engines. Adding an engine should require:

1. A domain engine.
2. Registration.
3. Selection rules.
4. Tests.
5. Architecture documentation.
6. IP review where appropriate.

It should not require a Gateway redesign.

## Verified Milestone Chronology

### Intelligence Gateway Foundation

**Status:** Implemented  
**Completed:** 2026-07-06  
**Commit:** `0e5d94f87e21ea48c9b138016d8b628bf64ef4d8`

Established the centralized backend AI request path, authentication and validation boundary, membership and permission checks, credit and usage-limit extension points, provider mediation, normalized public responses, and usage recording boundary. Current credit and default usage implementations include stubs or adapters; this roadmap does not claim completed billing or unrestricted production rate infrastructure.

Evidence: `server/intelligence/gateway.js`, `server/intelligence/companionController.js`, and `server/intelligence/companionRoutes.js`. See the Gateway entry in the [IP Ledger](../IntellectualProperty/IP_LEDGER.md#mc-ip-0001--meetro-intelligence-gateway).

### Provider Integration

**Status:** Implemented  
**Completed:** 2026-07-06  
**Commit:** `63de89c79c34b3db4e0f6479913edc7c297ce14b`

Added the provider adapter, server-side provider configuration, official provider integration, model invocation boundary, normalized provider failures, and separation between application features and the provider. Product features remain provider-blind.

Evidence: `server/intelligence/providerAdapter.js` and `server/intelligence/providers/openaiProvider.js`. See the provider and metering entry in the [IP Ledger](../IntellectualProperty/IP_LEDGER.md#mc-ip-0002--provider-adapter-and-usage-metering).

### Early Context, Session Continuity, And Usage Accounting

**Status:** Implemented foundation  
**Completed:** 2026-07-11  
**Commit evidence:** `7154950c2d168244506e5d8ac6273e2aef841a3c`

The production Orchestrator milestone verifies backend context construction, user-scoped short-lived session memory, normalized operational diagnostics, and one usage-accounting flow around provider execution. Session memory is not persistent memory. Token, cost, billing, and credit capabilities must be described only to the extent supported by their configured production adapters; no separate milestone number is assigned because repository history does not establish one.

### MC-AI-008 — Intelligence Orchestrator Foundation

**Status:** Implemented  
**Completed:** 2026-07-11  
**Commit:** `7154950c2d168244506e5d8ac6273e2aef841a3c`  
**Dependencies:** Gateway, provider abstraction, usage-accounting boundary  
**Successor:** MC-AI-009

Separated the secure Gateway from intelligence coordination. Added the executable engine registry, deterministic selection, staged collection, Unified Context construction, optional-engine failure isolation, provider coordination, and one provider execution per Gateway request.

Evidence: [Orchestrator modules](../../server/intelligence/orchestrator/). See [MC-IP-0003](../IntellectualProperty/IP_LEDGER.md#mc-ip-0003--meetro-intelligence-orchestrator).

### MC-AI-009 — Workflow Intelligence Foundation

**Status:** Implemented  
**Completed:** 2026-07-11  
**Commit:** `fee1c0f8680a02c594f582d9347f283708b20024`  
**Dependencies:** MC-AI-008  
**Successor:** MC-AI-010

Added stable workflow source resolution, lifecycle normalization, current-stage and next-action inference, waiting-on classification, blocker and obligation evaluation, Completion versus Closure, Job History eligibility, and standard and emergency workflow support.

Evidence: [Workflow Intelligence](../../server/intelligence/workflow/). See [MC-IP-0004](../IntellectualProperty/IP_LEDGER.md#mc-ip-0004--workflow-intelligence-engine).

### MC-AI-010 — Relationship Intelligence Foundation

**Status:** Implemented  
**Completed:** 2026-07-11  
**Commit:** `7cda459d21bcfe7aec781bdcc023cfee9f91dcde`  
**Dependencies:** MC-AI-008, MC-AI-009  
**Successor:** MC-AI-011

Added stable-ID relationship resolution, professional-customer continuity, deterministic first-time and returning classification, communication continuity metadata, current engagement, privacy-minimized follow-up reasoning, contradiction handling, and confidence. It does not create trust, loyalty, personality, sentiment, or customer-value scores.

Evidence: [Relationship Intelligence](../../server/intelligence/relationship/). See [MC-IP-0005](../IntellectualProperty/IP_LEDGER.md#mc-ip-0005--relationship-intelligence-engine).

### MC-IP-001 — Intellectual Property Ledger Foundation

**Status:** Implemented governance milestone  
**Completed:** 2026-07-11  
**Commit:** `eda45ca7cde6c3a72b59a60f6209d38f8310e0bb`  
**Dependencies:** Verified architecture evidence  
**Ongoing role:** Review after major architecture and product inventions

Established invention chronology, preliminary patent-candidate records, a trade-secret register, copyright register, trademark-candidate register, invention-disclosure template, and governance standard.

Evidence: [Intellectual Property documentation](../IntellectualProperty/).

### MC-AI-011 — Persistent Companion Memory Foundation

**Status:** Implemented  
**Completed:** 2026-07-11  
**Commit:** `b688449fef2c36b484dcb0948a15d4c183d56fb6`  
**Dependencies:** MC-AI-008, MC-AI-009, MC-AI-010  
**Successor:** MC-AI-012

Added structured durable-memory contracts, explicit ownership and scope, consent, proposal and confirmation flow, correction and versioning, deletion, retention, expiration, sensitivity controls, deterministic retrieval, and strict separation from session memory. It does not store raw conversation archives or automatically promote session history.

**Production limitation:** Durable production behavior requires an injected database-backed repository adapter. Without one, retrieval safely returns empty and no process-memory persistence is presented as production durability.

Evidence: [Persistent Memory](../../server/intelligence/memory/). See [MC-IP-0010](../IntellectualProperty/IP_LEDGER.md#mc-ip-0010--persistent-companion-memory-foundation).

### MC-AI-012 — Business Intelligence Foundation

**Status:** Implemented  
**Completed:** 2026-07-11  
**Commit:** `539d00c4b96a165eafffcfb18114763a8e6622a6`  
**Dependencies:** Workflow, Relationship, Persistent Memory, Orchestrator  
**Successor:** MC-AI-013

Added authorized business scope, stable operational aggregation, workload and pipeline reasoning, waiting-on counts, bottlenecks, deterministic priorities, schedule-capacity interpretation, and privacy-minimized financial workflow signals. Proposed, approved, invoiced, and recorded revenue remain distinct. The engine does not perform accounting or mutations.

**Production limitation:** Useful results require immutable, business-scoped backend operational repositories. Without authorized records, the engine safely returns empty context.

Evidence: [Business Intelligence](../../server/intelligence/business/). See [MC-IP-0011](../IntellectualProperty/IP_LEDGER.md#mc-ip-0011--business-intelligence-foundation).

### MC-AI-013 — Community Intelligence Foundation

**Status:** Implemented  
**Completed:** 2026-07-11  
**Commit:** `d92acd73367ff320830292a0d7c3385f52fcba53`  
**Dependencies:** Relationship, Persistent Memory, Business, Orchestrator  
**Successor:** MC-AI-014

Added authorized community scope, visibility-first filtering, coarse location minimization, typed deduplication, Moments, Spotlight and Wonder Pass interpretation, service discovery, aggregate engagement, deterministic signals, and advisory opportunities. It does not create popularity, influence, trust, loyalty, endorsement, or social-value scores.

**Production limitation:** Useful results require immutable, visibility-filtered, community-scoped backend repositories. Without trusted scope and visible evidence, the engine safely returns empty context.

Evidence: [Community Intelligence](../../server/intelligence/community/). See [MC-IP-0012](../IntellectualProperty/IP_LEDGER.md#mc-ip-0012--community-intelligence-foundation).

### Orchestration Sequencing Refinement

**Status:** Implemented refinement  
**Completed:** 2026-07-11  
**Commit:** `9908f9fc83e51e057b76abf405c4f55886f8c980`

Moved Business execution into the stage before Community. Community and Contract Intelligence execute after Business when selected. No domain responsibility moved into the Orchestrator; the change only established dependency order.

## Permanent Intelligence Architecture Laws

1. No product feature calls an AI provider directly.
2. Validated intelligence requests pass through the Intelligence Gateway.
3. The Gateway owns request validation, permissions, membership, credit and usage-limit checks, usage recording, and public response contracts.
4. The Orchestrator coordinates selected engines, Unified Context construction, and provider execution.
5. The Orchestrator does not own domain intelligence.
6. Engines return structured, minimized context.
7. One Gateway request produces no more than one provider execution unless a future reviewed architecture explicitly changes this law.
8. Workflow Intelligence owns live lifecycle interpretation.
9. Relationship Intelligence owns current relationship continuity.
10. Persistent Memory stores approved durable facts, not raw chat history.
11. Business Intelligence interprets operations but does not perform accounting or mutations.
12. Community Intelligence interprets authorized aggregate community evidence without social scoring.
13. Completion does not equal Closure.
14. Job History requires closed, normalized, read-only records under the governing lifecycle contracts.
15. Client-provided identity and scope are not authoritative.
16. Engines minimize private data and exclude unrelated scope.
17. Weak, missing, or conflicting evidence lowers confidence or returns unknown.
18. Intelligence outputs do not automatically execute product actions.
19. New autonomous capabilities require explicit user approval, authorization, auditability, and separate safety review.
20. Major architecture milestones require IP Ledger review.

## Roadmap Phases

### Phase 0 — Gateway And Provider Foundation

**Status:** Implemented

Includes the Gateway, provider adapter, backend Context Engine, short-lived Session Memory, normalized provider failures, and usage-accounting extension points. Billing, complete token-cost accounting, and production rate/credit infrastructure must not be inferred beyond configured adapters and verified deployment evidence.

### Phase 1 — Core Intelligence Foundation

**Status:** Implemented

Includes MC-AI-008 through MC-AI-013. This phase taught Meetro Community to interpret:

- what is happening;
- who is involved;
- what approved continuity should persist;
- how an authorized business is operating; and
- what visible, authorized activity exists in a community.

### Phase 2 — Trusted Knowledge And Capability

**Status:** Complete

#### MC-AI-014 — Knowledge Intelligence Foundation

**Status:** Implemented 2026-07-11

Provides trusted, source-aware, domain-scoped knowledge retrieval for product guidance, service knowledge, emergency procedures, evaluations, documentation, permits, inspections, policies, disclaimers, business operations, legal-information boundaries, and governed knowledge-base records.

Required principles include verified sources, source traceability, freshness, scope controls, conflict handling, unsupported-claim prevention, controlled retrieval, and proprietary-source minimization.

Dependencies: Orchestrator, Unified Context Builder, engine registration, privacy controls, and safe logging.

The production engine adds typed source contracts, centralized domains, backend-owned scope authorization, confidentiality and authority controls, deterministic metadata retrieval, bounded facts and excerpts, freshness and supersession handling, conflict detection, stable source references, domain-based disclaimers, safe logging, and structured Unified Context integration. The earlier curated `companionKnowledgeEngine.js` remains a compatibility helper and is not production retrieval authority.

**Production limitation:** No database-backed production knowledge repository is configured by default. Without an injected trusted read-only adapter, the engine returns `insufficient_evidence`; it does not scan the repository or browse the public web at request time.

Evidence: [Knowledge Intelligence](../../server/intelligence/knowledge/). See [MC-IP-0013](../IntellectualProperty/IP_LEDGER.md#mc-ip-0013--knowledge-intelligence-foundation).

#### MC-AI-015 — Capability Intelligence Foundation

**Status:** Implemented 2026-07-11

Determines the approved Meetro Community capability relevant to a user goal, such as explaining workflow, preparing documents, reviewing schedules, interpreting business or community state, retrieving verified knowledge, or identifying required next steps.

Capability Intelligence uses a server-owned typed registry, deterministic intent resolution, role, scope, permission, input and prerequisite evaluation, risk classification, and one safe next-step proposal. It consumes existing engine evidence and does not automatically execute capabilities.

Dependencies: Knowledge, Workflow, Relationship, Persistent Memory, Business, and Community Intelligence.

The earlier `companionCapabilityEngine.js` remains a compatibility helper for service-skill signals. Governed product-capability selection is owned by the MC-AI-015 engine.

**Production limitation:** MC-AI-015 proposes capabilities only. Meetro Community has no capability execution layer in this milestone; saving, sending, scheduling, approving, recording, closing, publishing, or other mutation requires a separate future user-approved and authorized architecture.

Evidence: [Capability Intelligence](../../server/intelligence/capability/). See [MC-IP-0014](../IntellectualProperty/IP_LEDGER.md#mc-ip-0014--capability-intelligence-foundation).

### Phase 3 — Intelligence Quality And Decision Support

**Status:** In progress; MC-AI-016 through MC-AI-018 implemented

#### MC-AI-016 — Intelligence Validation and Confidence Foundation

**Status:** Implemented 2026-07-11

Adds a required post-engine validation stage with deterministic authority resolution, bounded evidence traceability, agreement and contradiction detection, freshness and scope checks, platform-confidence normalization, and provider response constraints. It preserves domain authority and performs no execution or mutation.

**Production limitation:** Validation quality is bounded by the structured evidence supplied by selected engines. Missing timestamps, identifiers, or adapters result in qualified or withheld confidence rather than inferred certainty.

#### MC-AI-017 — Decision Intelligence Foundation

**Status:** Implemented 2026-07-11

Adds deterministic validated-option construction, constraint evaluation, bounded tradeoff comparison, evidence-backed recommendation modes, explicit approval propagation, and safe no-recommendation outcomes. It remains advisory and contains no execution layer.

**Production limitation:** Decision quality is limited to validated Capability options and evidence. The engine does not discover external alternatives, rank providers, or execute recommendations.

#### MC-AI-018 — Recommendation Intelligence Foundation

**Status:** Implemented 2026-07-11

Adds evidence-backed recommendation construction, deterministic priority and ordering, deferred and blocked recommendation handling, no-safe-recommendation and no-action outcomes, and explicit approval propagation. It remains advisory and preserves Decision and Validation authority.

**Production limitation:** Recommendations are limited to validated Decision options in current context. The engine does not discover external opportunities, rank professionals, or execute recommendations.

#### MC-ARCH-002 — Intelligence Constitution

**Status:** Adopted 2026-07-11

Establishes the authority hierarchy, evidence and privacy rules, engine boundaries, provider subordination, explicit-approval requirements, and permanent separation between reasoning, future planning, and any future execution. This is governance documentation and introduces no runtime behavior.

See [Meetro Community Intelligence Constitution](MEETRO_INTELLIGENCE_CONSTITUTION.md).

#### MC-AI-019 — Planning Intelligence Foundation

**Status:** Implemented 2026-07-11

Adds deterministic advisory plan assembly from validated Recommendation output, including stable steps, prerequisites, dependencies, missing information, approval checkpoints, readiness, risk and rollback awareness, and future completion criteria. Planning remains non-mutating and cannot authorize or execute any action.

**Production limitation:** Plans are limited to current validated Recommendation, Decision, Capability, and Workflow evidence. Effort remains unknown without validated product data. No execution capability or frontend planning surface is implemented.

- **Intelligence Validation and Confidence:** reconcile permitted engine outputs, normalize confidence, preserve evidence, and prevent weak conclusions from appearing as facts.
- **Decision Intelligence:** compare permitted options, identify constraints, and surface tradeoffs while remaining advisory.
- **Recommendation Intelligence:** provide traceable evidence-backed recommendations without manipulation and with user control.
- **Operational Intelligence:** identify unresolved patterns and summarize priorities without mutation unless separately authorized.

No MC-AI numbers are assigned to these concepts.

### Phase 4 — Guided Planning

**Status:** Foundation implemented

The implemented foundation provides advisory multi-step plans, prerequisite and dependency visibility, missing-information handling, approval checkpoints, and completion criteria. Draft preparation and every form of execution remain future capabilities.

**Safety law:** Planning does not equal execution. Every material action remains reviewable.

#### MC-AI-020 — Execution Governance Foundation

**Status:** Implemented 2026-07-11

Adds the required non-executing governance stage after Planning. It defines backend-owned authorization attestations, explicit and expiring approval checks, prerequisite status, idempotency and duplicate policy, metadata-only audit and receipt contracts, rollback classifications, retry governance, failure classes, and fail-closed denial reasons.

**Production limitation:** Execution Governance evaluates policy only. Execution eligibility and performed state remain false, receipts remain `not_executed`, and no product action, rollback behavior, or execution API exists.

#### MC-ARCH-003 — Intelligence Platform Specification v1.0

**Status:** Baseline Adopted 2026-07-11

Establishes the verified v1.0 technical baseline from the Intelligence Gateway through Execution Governance, including authority, engine responsibilities, evidence, provider, privacy, approval, testing, current limitations, and safe extension boundaries. This documentation milestone adds no runtime or execution behavior.

See [Meetro Community Intelligence Platform Specification v1.0](MEETRO_INTELLIGENCE_PLATFORM_SPECIFICATION_V1.md).

### Phase 5 — User-Approved Companion Execution

**Status:** Future / Restricted

Potential capabilities include preparing follow-up messages, schedules, documents, quotes, unresolved-work organization, and proposed next actions.

Rules:

- ask first;
- show the proposed action;
- require explicit approval;
- preserve audit history;
- enforce permissions;
- allow cancellation; and
- never silently mutate business, workflow, relationship, payment, or community state.

No capability in this phase is claimed as currently implemented.

## Master Milestone Table

| Milestone | Name | Status | Primary Purpose | Dependencies | Commit | Completed | IP Ledger |
|---|---|---|---|---|---|---|---|
| Foundation | Intelligence Gateway | Implemented | Secure validated intelligence entry point | Authentication and backend routing | `0e5d94f87e21ea48c9b138016d8b628bf64ef4d8` | 2026-07-06 | [MC-IP-0001](../IntellectualProperty/IP_LEDGER.md#mc-ip-0001--meetro-intelligence-gateway) |
| Foundation | Provider Integration | Implemented | Provider-independent model boundary | Gateway | `63de89c79c34b3db4e0f6479913edc7c297ce14b` | 2026-07-06 | [MC-IP-0002](../IntellectualProperty/IP_LEDGER.md#mc-ip-0002--provider-adapter-and-usage-metering) |
| MC-AI-008 | Intelligence Orchestrator | Implemented | Engine coordination and one provider execution | Gateway and provider adapter | `7154950c2d168244506e5d8ac6273e2aef841a3c` | 2026-07-11 | [MC-IP-0003](../IntellectualProperty/IP_LEDGER.md#mc-ip-0003--meetro-intelligence-orchestrator) |
| MC-AI-009 | Workflow Intelligence | Implemented | Live lifecycle interpretation | MC-AI-008 | `fee1c0f8680a02c594f582d9347f283708b20024` | 2026-07-11 | [MC-IP-0004](../IntellectualProperty/IP_LEDGER.md#mc-ip-0004--workflow-intelligence-engine) |
| MC-AI-010 | Relationship Intelligence | Implemented | Stable relationship continuity | MC-AI-008, MC-AI-009 | `7cda459d21bcfe7aec781bdcc023cfee9f91dcde` | 2026-07-11 | [MC-IP-0005](../IntellectualProperty/IP_LEDGER.md#mc-ip-0005--relationship-intelligence-engine) |
| MC-IP-001 | IP Ledger Foundation | Implemented | Architecture and invention governance | Verified repository evidence | `eda45ca7cde6c3a72b59a60f6209d38f8310e0bb` | 2026-07-11 | [IP Ledger](../IntellectualProperty/IP_LEDGER.md) |
| MC-AI-011 | Persistent Companion Memory | Implemented | Approved durable continuity | Workflow, Relationship, Orchestrator | `b688449fef2c36b484dcb0948a15d4c183d56fb6` | 2026-07-11 | [MC-IP-0010](../IntellectualProperty/IP_LEDGER.md#mc-ip-0010--persistent-companion-memory-foundation) |
| MC-AI-012 | Business Intelligence | Implemented | Read-only business operations interpretation | Workflow, Relationship, Memory | `539d00c4b96a165eafffcfb18114763a8e6622a6` | 2026-07-11 | [MC-IP-0011](../IntellectualProperty/IP_LEDGER.md#mc-ip-0011--business-intelligence-foundation) |
| MC-AI-013 | Community Intelligence | Implemented | Authorized aggregate community interpretation | Relationship, Memory, Business | `d92acd73367ff320830292a0d7c3385f52fcba53` | 2026-07-11 | [MC-IP-0012](../IntellectualProperty/IP_LEDGER.md#mc-ip-0012--community-intelligence-foundation) |
| Refinement | Business-before-Community sequencing | Implemented | Preserve intended engine dependency order | MC-AI-012, MC-AI-013 | `9908f9fc83e51e057b76abf405c4f55886f8c980` | 2026-07-11 | Review with related entries |
| MC-AI-014 | Knowledge Intelligence | Implemented | Source-aware governed knowledge retrieval | Core intelligence foundation | `4e37db9bf8ac01b91c3d91f523a915ae524830ce` | 2026-07-11 | [MC-IP-0013](../IntellectualProperty/IP_LEDGER.md#mc-ip-0013--knowledge-intelligence-foundation) |
| MC-AI-015 | Capability Intelligence | Implemented | Governed task and capability routing without execution | MC-AI-014 and core engines | Pending qualifying commit | 2026-07-11 | [MC-IP-0014](../IntellectualProperty/IP_LEDGER.md#mc-ip-0014--capability-intelligence-foundation) |
| MC-AI-016 | Intelligence Validation and Confidence | Implemented | Cross-engine validation and response constraints | MC-AI-015 and core engines | Pending qualifying commit | 2026-07-11 | [MC-IP-0015](../IntellectualProperty/IP_LEDGER.md#mc-ip-0015--intelligence-validation-and-confidence-foundation) |
| MC-AI-017 | Decision Intelligence | Implemented | Validated option comparison without execution | MC-AI-016 and Capability | Pending qualifying commit | 2026-07-11 | [MC-IP-0016](../IntellectualProperty/IP_LEDGER.md#mc-ip-0016--decision-intelligence-foundation) |
| MC-AI-018 | Recommendation Intelligence | Implemented | Evidence-backed priority without execution | MC-AI-017, MC-AI-016 | Pending qualifying commit | 2026-07-11 | [MC-IP-0017](../IntellectualProperty/IP_LEDGER.md#mc-ip-0017--recommendation-intelligence-foundation) |
| MC-ARCH-002 | Intelligence Constitution | Adopted | Permanent intelligence governance and reasoning/execution separation | Implemented reasoning stack | Not applicable; documentation adoption | 2026-07-11 | [MC-ARCH-002](../IntellectualProperty/IP_LEDGER.md#mc-arch-002--intelligence-constitution) |
| MC-AI-019 | Planning Intelligence | Implemented | Structured advisory planning without mutation or execution | MC-ARCH-002, MC-AI-018 | Pending qualifying commit | 2026-07-11 | [MC-IP-0018](../IntellectualProperty/IP_LEDGER.md#mc-ip-0018--planning-intelligence-foundation) |
| MC-AI-020 | Execution Governance | Implemented | Authorization, approval, idempotency, audit, rollback, and failure policy without execution | MC-ARCH-002, MC-AI-019 | Pending qualifying commit | 2026-07-11 | [MC-IP-0019](../IntellectualProperty/IP_LEDGER.md#mc-ip-0019--execution-governance-foundation) |
| MC-ARCH-003 | Intelligence Platform Specification v1.0 | Baseline Adopted | Stable technical baseline through non-executing Governance | MC-ARCH-002, MC-AI-020 | Pending qualifying commit | 2026-07-11 | [MC-ARCH-003](../IntellectualProperty/IP_LEDGER.md#mc-arch-003--intelligence-platform-specification-v10) |

## Engine Responsibility Matrix

| Engine | Status | Authoritative Responsibility | Must Not Own |
|---|---|---|---|
| Intent | Implemented helper | Coarse request-intent classification | Domain truth or execution |
| Context | Implemented | Verified backend request context | Frontend-injected identity or unrestricted records |
| Session Memory | Implemented | Short-lived conversation continuity | Durable approved memory or cross-user history |
| Knowledge Intelligence | Implemented | Authorized source-aware knowledge evidence and traceability | Final answers, live state, source mutation, or unsupported facts |
| Capability Intelligence | Implemented | Governed intent-to-capability proposals and safe next steps | Product execution, permission grants, or autonomous actions |
| Workflow | Implemented | Live lifecycle state and next workflow action | Relationship profiling or business accounting |
| Relationship | Implemented | Current relationship continuity | Personality, sentiment, trust, loyalty, or customer-value scoring |
| Persistent Memory | Implemented | Approved durable continuity | Raw conversation archives or automatic promotion |
| Business | Implemented | Read-only operational business reasoning | Accounting mutation or financial execution |
| Community | Implemented | Authorized aggregate community context | Popularity, influence, endorsement, or social scoring |
| Planning Intelligence | Implemented | Deterministic advisory plans derived from validated recommendations | Authorization, product mutation, provider-generated steps, or execution |
| Execution Governance | Implemented | Policy eligibility, denials, approval, idempotency, audit, receipt, rollback, and failure contracts | Product actions, approval inference, provider authorization, or execution |
| Contracts | Placeholder extension | Future contract-scoped context | Unreviewed legal conclusions or execution |
| Document | Disabled future metadata | Future governed document intelligence | Unauthorized document access |
| Portfolio | Disabled future metadata | Future capability evidence from portfolio records | False certification or ranking |
| Knowledge Intelligence | Planned | Verified source-aware knowledge | Unsupported facts or uncontrolled web claims |
| Capability Intelligence | Planned | Approved task and capability routing | Autonomous execution |

## Dependency Map

```text
Gateway and Provider Foundation
        |
        v
Intelligence Orchestrator
        |
        v
Workflow Intelligence
        |
        v
Relationship Intelligence
        |
        v
Persistent Companion Memory
        |
        v
Business Intelligence
        |
        v
Community Intelligence
        |
        v
Knowledge Intelligence
        |
        v
Capability Intelligence
        |
        v
Decision and Recommendation Intelligence
        |
        v
Guided Planning
        |
        v
User-Approved Execution
```

This is a roadmap dependency model, not a requirement that every engine execute on every request or that all future engines always run serially.

## Production Readiness Matrix

| Domain | Current Safe Behavior | Production Requirement | Risk If Omitted | Recommended Follow-Up |
|---|---|---|---|---|
| Persistent Memory | Empty durable context without a trusted adapter; test adapter is not production storage | Database-backed scoped repository with consent, correction, deletion, retention, and purge | Continuity is not durable across production processes | Production Persistent Memory Repository Adapter |
| Business Intelligence | Empty context without one authorized business and trusted scoped records | Immutable business-scoped workflow, schedule, proposal, and financial-workflow repositories | Business guidance remains unavailable or incomplete | Business Repository Adapter and evidence certification |
| Community Intelligence | Empty context without trusted scope and visible records | Immutable visibility-filtered repositories with stable IDs and coarse location | Community guidance remains unavailable; unsafe adapters could create privacy risk | Community Repository Adapter and visibility certification |
| Usage and credits | Central checks and recording extension points fail safely under current contracts | Verified production metering, entitlement, rate, and credit adapters where required | Cost and entitlement governance may remain incomplete | Dedicated production usage and credit readiness review |
| Knowledge | Governed engine returns bounded structured evidence or `insufficient_evidence` | Database-backed read-only repository with reviewed source metadata and authorization | Knowledge remains unavailable rather than inferred when no trusted adapter exists | Production Knowledge Repository Adapter |

## Governance

Update this roadmap after:

- a new intelligence engine;
- a provider architecture change;
- a new memory model;
- an engine-order change;
- a new autonomous capability;
- a new intelligence data source;
- a new privacy boundary;
- a new business or community scoring model;
- a major public disclosure;
- a patent-related filing; or
- an external contributor implementation.

Required process:

```text
Design
  -> Implement
  -> Test
  -> Commit
  -> Update Architecture Documentation
  -> Update AI Roadmap
  -> Update IP Ledger
  -> Record Risks and Production Dependencies
```

Implementation and planning claims must remain separate. Every implemented milestone needs repository evidence. Every ordering change requires dependency review. Every new autonomous capability requires explicit approval and a separate safety review.

## Confidentiality Boundary

This roadmap records responsibilities, chronology, dependencies, and production limitations. It must not contain API keys, credentials, full prompts, private customer information, private messages, precise addresses, internal ranking formulas, proprietary weighting, detailed manipulation defenses, exploitable security details, unreleased investor terms, private financial records, or operative trade-secret logic.

Detailed confidential evidence belongs only in approved restricted systems governed by the [Trade Secret Register](../IntellectualProperty/TRADE_SECRET_REGISTER.md) and [IP Governance Standard](../IntellectualProperty/IP_GOVERNANCE_STANDARD.md).

## Next Verified Planning Step

The next architecture milestone is **MC-AI-021 — User-Approved Execution Contract Foundation**. It may define contracts for future explicitly approved actions, but must not implement execution. No execution capability is currently implemented.
