# Meetro Community Intellectual Property Ledger

This ledger records preliminary IP classifications and repository evidence. It does not assert patentability, registration, legal ownership, or freedom to operate. Dates and implementation claims are included only when supported by repository evidence.

## MC-IP-0001 — Meetro Intelligence Gateway

**Status:** Implemented  
**Category:** Patent Candidate / Trade Secret / Copyright  
**First Documented:** 2026-07-06  
**Implemented:** 2026-07-06  
**Primary Author / Inventor:** William E. Molina  
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment  
**Product:** Meetro Community  
**Related Milestone:** Intelligence Gateway Foundation  
**Repository Commit:** `0e5d94f87e21ea48c9b138016d8b628bf64ef4d8`  
**Related Files:** `server/intelligence/gateway.js`, `server/intelligence/companionController.js`, `server/intelligence/companionRoutes.js`, `server/intelligence/contextBuilder.js`, `server/intelligence/intentEngine.js`

### Problem Solved

Application intelligence needed one authenticated, governed backend entry point rather than direct feature-to-provider integrations.

### Technical or Creative Solution

A centralized gateway coordinates the authenticated request boundary, validation and policy checks, context preparation, provider mediation, normalized failures, and usage handling. Exact security controls and private routing logic are intentionally omitted.

### Distinguishing Characteristics

Provider-blind application surfaces, centralized policy enforcement, and normalized responses separate Meetro Community intelligence from any single model provider.

### Operational Value

The boundary supports consistent governance, provider replacement, usage controls, and safer expansion of intelligence features.

### Evidence of Implementation

The verified commit introduces the gateway, controller, route, context builder, intent engine, provider abstraction, and tests.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Private prompts, security controls, permission policy details, provider credentials, and internal routing heuristics.

### Recommended Protection

Counsel review for patent candidacy; maintain confidential operational details as trade-secret candidates; preserve source-code copyright evidence.

### Follow-Up Actions

Confirm inventorship, assignment, public-disclosure history, and prior art.

### Notes

No credential or private prompt content is recorded here.

## MC-IP-0002 — Provider Adapter and Usage Metering

**Status:** Implemented  
**Category:** Trade Secret / Copyright / Possible Patent Component  
**First Documented:** 2026-07-06  
**Implemented:** 2026-07-06  
**Primary Author / Inventor:** William E. Molina  
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment  
**Product:** Meetro Community  
**Related Milestone:** OpenAI Provider Connection  
**Repository Commit:** `63de89c79c34b3db4e0f6479913edc7c297ce14b`  
**Related Files:** `server/intelligence/providerAdapter.js`, `server/intelligence/providers/openaiProvider.js`, `server/intelligence/gateway.js`, `server/tests/intelligenceGateway.test.js`

### Problem Solved

Application features required provider-independent reasoning with centralized accounting and no provider exposure to the frontend.

### Technical or Creative Solution

A provider adapter mediates model access and normalizes results while the gateway retains usage and credit safeguards. Token, cost, and credit details remain backend-owned.

### Distinguishing Characteristics

Application features depend on Meetro contracts rather than a provider API, enabling controlled substitution and unified metering.

### Operational Value

Reduces vendor coupling and centralizes operational cost and usage governance.

### Evidence of Implementation

The verified commit connects the provider abstraction through the gateway and adds mocked success and failure coverage.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Provider fallback strategy, pricing assumptions, credit safeguards, private prompts, and credentials.

### Recommended Protection

Trade-secret controls for operational logic and copyright evidence for code; assess as a component of broader patent claims.

### Follow-Up Actions

Document access ownership and confirm accounting implementation evidence at each release.

### Notes

No provider key, model secret, or cost formula is included.

## MC-IP-0003 — Meetro Intelligence Orchestrator

**Status:** Implemented  
**Category:** Patent Candidate / Trade Secret / Copyright  
**First Documented:** 2026-07-11  
**Implemented:** 2026-07-11  
**Primary Author / Inventor:** William E. Molina  
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment  
**Product:** Meetro Community  
**Related Milestone:** MC-AI-008  
**Repository Commit:** `7154950c2d168244506e5d8ac6273e2aef841a3c`  
**Related Files:** `server/intelligence/orchestrator/companionOrchestrator.js`, `server/intelligence/orchestrator/engineRegistry.js`, `server/intelligence/orchestrator/engineSelector.js`, `server/intelligence/orchestrator/unifiedContextBuilder.js`, `server/intelligence/orchestrator/defaultEngines.js`, `server/intelligence/gateway.js`

### Problem Solved

The Gateway needed to remain a secure boundary rather than accumulate engine coordination and domain reasoning.

### Technical or Creative Solution

A backend orchestrator coordinates registered engine selection, unified context construction, provider preparation, one provider execution, normalized output, usage accounting, and isolated failure handling.

### Distinguishing Characteristics

Gateway and orchestration responsibilities are separated; deterministic engine metadata and selection produce one unified provider context and one provider execution.

### Operational Value

Supports modular intelligence growth while preserving policy, accounting, and provider boundaries.

### Evidence of Implementation

Verified commit `7154950` adds the production orchestrator foundation, registry, selector, contracts, logger, unified context builder, and tests.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Selection heuristics, context prioritization, private prompt composition, and failure-routing details.

### Recommended Protection

Patent and prior-art assessment; protect non-public orchestration details as trade secrets; preserve code and documentation copyright.

### Follow-Up Actions

Prepare a restricted invention disclosure and architecture diagram for counsel.

### Notes

The ledger describes responsibilities, not confidential selection logic.

## MC-IP-0004 — Workflow Intelligence Engine

**Status:** Implemented  
**Category:** Patent Candidate / Trade Secret / Copyright  
**First Documented:** 2026-07-11  
**Implemented:** 2026-07-11  
**Primary Author / Inventor:** William E. Molina  
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment  
**Product:** Meetro Community  
**Related Milestone:** MC-AI-009  
**Repository Commit:** `fee1c0f8680a02c594f582d9347f283708b20024`  
**Related Files:** `server/intelligence/workflow/workflowEngine.js`, `server/intelligence/workflow/workflowSourceResolver.js`, `server/intelligence/workflow/workflowNormalizer.js`, `server/intelligence/workflow/workflowStageMap.js`, `server/intelligence/workflow/workflowNextAction.js`, `server/intelligence/workflow/workflowBlockers.js`, `server/intelligence/workflow/workflowObligations.js`, `server/intelligence/workflow/workflowConfidence.js`

### Problem Solved

Fragmented workflow records needed deterministic interpretation without allowing an AI provider to invent lifecycle state.

### Technical or Creative Solution

The engine resolves backend-owned sources, normalizes canonical lifecycle evidence, infers current stage, waiting party, blockers, obligations, next action, history eligibility, and deterministic confidence for standard and emergency work.

### Distinguishing Characteristics

Completion and Closure remain distinct; Job History eligibility follows closure and evidence rules rather than generic completion labels.

### Operational Value

Provides consistent, explainable workflow context to Companion reasoning while preserving Meetro Community as source of truth.

### Evidence of Implementation

Verified commit `fee1c0f` adds the modular engine, orchestrator adapter, tests, and architecture documentation.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Proprietary thresholds, future ranking logic, source-priority details, and internal exception handling.

### Recommended Protection

Patent and prior-art review; trade-secret treatment for non-public inference rules; copyright records for source and documentation.

### Follow-Up Actions

Capture alternative embodiments and verified public-disclosure dates.

### Notes

No proprietary thresholds are disclosed.

## MC-IP-0005 — Relationship Intelligence Engine

**Status:** Implemented  
**Category:** Patent Candidate / Trade Secret  
**First Documented:** 2026-07-11  
**Implemented:** 2026-07-11  
**Primary Author / Inventor:** William E. Molina  
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment  
**Product:** Meetro Community  
**Related Milestone:** MC-AI-010  
**Repository Commit:** `7cda459`  
**Related Files:** `server/intelligence/relationship/relationshipEngine.js`, `server/intelligence/relationship/relationshipSourceResolver.js`, `server/intelligence/relationship/relationshipIdentity.js`, `server/intelligence/relationship/relationshipNormalizer.js`, `server/intelligence/relationship/relationshipActivity.js`, `server/intelligence/relationship/relationshipCommunication.js`, `server/intelligence/relationship/relationshipContinuity.js`, `server/intelligence/relationship/relationshipFollowUps.js`, `server/intelligence/relationship/relationshipNextAction.js`, `server/intelligence/relationship/relationshipConfidence.js`, `server/intelligence/relationship/relationshipContracts.js`, `server/intelligence/orchestrator/defaultEngines.js`, `server/intelligence/orchestrator/engineSelector.js`, `server/tests/relationshipIntelligence.test.js`

### Problem Solved

Companion reasoning needs relationship continuity without unsafe identity inference or unnecessary private-content exposure.

### Technical or Creative Solution

The system uses stable identifiers to interpret customer-professional continuity, prior activity, communication state, and relationship-level next actions from privacy-minimized backend context.

### Distinguishing Characteristics

Identity-safe linkage, explicit-evidence follow-ups, minimized communication metadata, and separation from lifecycle authority.

### Operational Value

Helps preserve continuity and reduce uncertainty across repeated community work.

### Evidence of Implementation

Verified commit `7cda459` adds the modular Relationship Intelligence engine, stable-identity source resolution, continuity and activity interpretation, communication metadata handling, structured next-action guidance, orchestrator integration, and tests.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Resolution precedence, contradiction handling, confidence rules, and future continuity methods.

### Recommended Protection

Maintain confidentiality and prepare for patent review after inventorship and prior-art review are complete.

### Follow-Up Actions

Confirm inventorship, assignment, public-disclosure history, and prior art.

### Notes

No private message content, customer information, or confidential implementation rules are reproduced here.

## MC-IP-0006 — Universal Service Workflow Architecture

**Status:** Implemented  
**Category:** Patent Candidate Component / Copyright / Trade Secret  
**First Documented:** Pending repository verification  
**Implemented:** Pending repository verification  
**Primary Author / Inventor:** William E. Molina  
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment  
**Product:** Meetro Community  
**Related Milestone:** Universal Workflow Architecture  
**Repository Commit:** Pending repository verification  
**Related Files:** `docs/KnowledgeBase/MEETRO_UNIVERSAL_WORKFLOW_ENGINE.md`, `src/utils/workflowTypes.js`, `src/utils/workflowStatus.js`, `src/utils/workflowTimeline.js`, `src/utils/completionClosureValidation.js`

### Problem Solved

Work spanning many product surfaces required a shared lifecycle and consistent ownership of operational truth.

### Technical or Creative Solution

Meetro Community integrates the sequence Relationship -> Communication -> Schedule -> Evaluation -> Quote -> Approval -> Payment -> Work -> Completion -> Closure -> History through normalized workflow evidence and cross-feature projections.

### Distinguishing Characteristics

Completion does not equal Closure. The Meetro-specific implementation separates performed-work evidence from obligation review and historical finality.

### Operational Value

Reduces contradictory states across communication, work management, payment, closure, and history surfaces.

### Evidence of Implementation

Repository documentation and lifecycle utilities provide evidence; the originating implementation commit and dates require further verification.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Normalization rules, dependency reasoning, source authority, and cross-feature conflict handling.

### Recommended Protection

Assess only the specific Meetro implementation and integration as a possible patent component; preserve code and documentation copyright and confidential rules.

### Follow-Up Actions

Trace the originating commits and prepare a specific-claims disclosure without asserting ownership of generic business workflow concepts.

### Notes

Generic workflow stages are not claimed as proprietary by themselves.

## MC-IP-0007 — Emergency Service Lifecycle

**Status:** Implemented  
**Category:** Patent Candidate Component / Copyright / Trade Secret  
**First Documented:** Pending repository verification  
**Implemented:** Pending repository verification  
**Primary Author / Inventor:** William E. Molina  
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment  
**Product:** Meetro Community  
**Related Milestone:** Emergency Workflow Integration  
**Repository Commit:** Pending repository verification  
**Related Files:** `src/utils/emergencyLifecycle.js`, `src/pages/EmergencyRequest.jsx`, `src/pages/EmergencyDispatch.jsx`, `src/pages/EmergencyStatus.jsx`, `src/pages/EmergencyComplete.jsx`, `src/utils/unifiedJobHistory.js`

### Problem Solved

Urgent service work required continuity from request through dispatch, communication, fulfillment, financial evidence, closure, and history.

### Technical or Creative Solution

The Meetro-specific lifecycle coordinates request, dispatch, communication, work, completion, invoice or receipt, Closure, and Job History projections.

### Distinguishing Characteristics

Emergency and standard work share lifecycle truth while retaining emergency-specific source and status handling.

### Operational Value

Supports urgent coordination without losing obligation, closure, or historical continuity.

### Evidence of Implementation

Repository utilities and pages demonstrate the integrated flow; exact originating commit and implementation date remain pending verification.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Dispatch rules, prioritization, abuse controls, and source-reconciliation logic.

### Recommended Protection

Assess as part of broader workflow claims; preserve source copyright and confidential operational logic.

### Follow-Up Actions

Verify chronology and document contributors without including real customer records or addresses.

### Notes

No customer data is included.

## MC-IP-0008 — Ask Meetro Companion

**Status:** Implemented  
**Category:** Trademark Candidate / Copyright / Patent Candidate Component  
**First Documented:** Pending repository verification  
**Implemented:** Pending repository verification  
**Primary Author / Inventor:** William E. Molina  
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment  
**Product:** Meetro Community  
**Related Milestone:** Companion Presence and Intelligence Architecture  
**Repository Commit:** Pending repository verification  
**Related Files:** `src/components/MeetroAssistant.jsx`, `docs/KnowledgeBase/COMPANION_PRESENCE_SYSTEM.md`, `docs/KnowledgeBase/MEETRO_COMMUNITY_INTELLIGENCE_ARCHITECTURE.md`, `server/intelligence/companionController.js`

### Problem Solved

Members need a persistent, contextual entry point for understanding community relationships and work without exposing provider mechanics.

### Technical or Creative Solution

Ask Meetro combines Companion presence with backend orchestration across verified context, knowledge, capability, workflow, relationship, business, and community domains as those modules are enabled.

### Distinguishing Characteristics

It is a provider-blind Companion presence, not merely a chatbot. Repository evidence supports Companion states including Ready, Listening, Thinking, and Speaking or Responding concepts.

### Operational Value

Creates a consistent trust-preserving interface for guidance throughout Meetro Community.

### Evidence of Implementation

Companion UI, presence documentation, controller, and architecture documentation exist; originating dates and commits require further verification.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Private prompts, context prioritization, engine routing, memory relevance, and provider strategy.

### Recommended Protection

Trademark clearance for Ask Meetro; copyright evidence for code, copy, and artwork; evaluate architecture as a component of broader patent claims.

### Follow-Up Actions

Verify first internal and public use, authorship of artwork, and disclosure history.

### Notes

No private prompt is reproduced.

## MC-IP-0009 — Meetro Community Brand Family

**Status:** Active  
**Category:** Trademark Candidate / Copyright  
**First Documented:** Pending repository verification  
**Implemented:** Pending repository verification  
**Primary Author / Inventor:** William E. Molina  
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment  
**Product:** Meetro Community  
**Related Milestone:** Brand Family Governance  
**Repository Commit:** Pending repository verification  
**Related Files:** `src/`, `docs/KnowledgeBase/MEETRO_COMMUNITY_VISUAL_CONSTITUTION.md`, `docs/KnowledgeBase/COMPANION_PRESENCE_SYSTEM.md`

### Problem Solved

A growing product family requires consistent source-identifying names and evidence of creation and use.

### Technical or Creative Solution

The preliminary family includes Meetro Community, Ask Meetro, Wonder Pass, Meetro Moments, Spotlight, and Work Center.

### Distinguishing Characteristics

Each candidate identifies a distinct community, companion, editorial, storytelling, discovery, or operational product expression.

### Operational Value

Consistent naming supports recognition and coherent product navigation.

### Evidence of Implementation

Repository source and documentation contain current usages. First-use dates, public uses, logos, and originating commits require item-level verification.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Unannounced naming plans and unreleased brand assets.

### Recommended Protection

Conduct legal clearance, ownership review, domain review, and evidence collection before filing decisions. Preserve copyright evidence for original graphics and copy.

### Follow-Up Actions

Complete the Trademark Candidate Register and collect dated specimens of actual use.

### Notes

No availability, registration, or enforceability claim is made.

## MC-IP-0010 — Persistent Companion Memory Foundation

**Status:** Implemented
**Category:** Patent Candidate / Trade Secret / Copyright
**First Documented:** 2026-07-11
**Implemented:** 2026-07-11
**Primary Author / Inventor:** William E. Molina
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment
**Product:** Meetro Community
**Related Milestone:** MC-AI-011
**Repository Commit:** `b688449`
**Related Files:** `server/intelligence/memory/persistentMemoryEngine.js`, `server/intelligence/memory/memoryContracts.js`, `server/intelligence/memory/memoryRepositoryContracts.js`, `server/intelligence/memory/memoryService.js`, `server/intelligence/memory/memoryRetrieval.js`, `server/intelligence/orchestrator/defaultEngines.js`, `server/intelligence/orchestrator/engineSelector.js`, `server/tests/persistentMemory.test.js`, `server/tests/intelligenceGateway.test.js`, `docs/KnowledgeBase/MEETRO_COMMUNITY_INTELLIGENCE_ARCHITECTURE.md`

### Problem Solved

Ask Meetro needs durable continuity without treating raw conversations or sensitive profiles as permanent memory.

### Technical or Creative Solution

A consent-controlled, scope-safe memory foundation stores minimal approved operational facts through a replaceable repository contract. It supports proposals, correction, deletion, expiration, deterministic relevance, and minimized provider context while remaining separate from session memory.

### Distinguishing Characteristics

Stable ownership and scope, source traceability, explicit consent, retention-aware lifecycle, versioned correction, immediate retrieval exclusion after deletion, and deterministic scope-first retrieval.

### Operational Value

Preserves approved continuity across sessions while keeping Meetro Community records authoritative and giving users correction and forgetting controls.

### Evidence of Implementation

Verified commit `b688449` adds the persistent-memory domain, repository boundary, orchestration integration, focused tests, and architecture documentation.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Future relevance refinements, retention policies, repository operations, and context-prioritization details.

### Recommended Protection

Evaluate as a patent candidate with counsel, preserve non-public operational details as trade-secret candidates, and retain source and documentation copyright evidence.

### Follow-Up Actions

Complete inventorship, assignment, prior-art, and public-disclosure review.

### Notes

No raw conversation, private customer content, credential, private prompt, or operative trade-secret logic is reproduced here.

## MC-IP-0011 — Business Intelligence Foundation

**Status:** Implemented
**Category:** Patent Candidate / Trade Secret / Copyright
**First Documented:** 2026-07-11
**Implemented:** 2026-07-11
**Primary Author / Inventor:** William E. Molina
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment
**Product:** Meetro Community
**Related Milestone:** MC-AI-012
**Repository Commit:** `539d00c`
**Related Files:** `server/intelligence/business/businessEngine.js`, `server/intelligence/business/businessContracts.js`, `server/intelligence/business/businessSourceResolver.js`, `server/intelligence/business/businessNormalizer.js`, `server/intelligence/business/businessDeduplication.js`, `server/intelligence/business/index.js`, `server/intelligence/orchestrator/defaultEngines.js`, `server/intelligence/orchestrator/engineSelector.js`, `server/intelligence/contracts/intelligenceEngineRegistry.js`, `server/tests/businessIntelligence.test.js`, `server/tests/intelligenceEngineRegistry.test.js`, `docs/KnowledgeBase/MEETRO_COMMUNITY_INTELLIGENCE_ARCHITECTURE.md`

### Problem Solved

Professionals need a trustworthy operational view across fragmented workflow evidence without converting the Companion into accounting or autonomous business software.

### Technical or Creative Solution

A business-scoped, read-only intelligence layer normalizes and deduplicates trusted operational records, interprets workload and schedule capacity, separates financial workflow signals, detects evidence-backed bottlenecks, and returns deterministic priorities and business-health classifications.

### Distinguishing Characteristics

Exact business authorization, stable lifecycle deduplication, workflow-derived responsibility, privacy-minimized aggregation, deterministic health and priority reasoning, and strict separation between proposed, approved, invoiced, and recorded value.

### Operational Value

Helps professionals identify operational pressure and unresolved responsibilities without modifying business, schedule, customer, workflow, or financial records.

### Evidence of Implementation

Verified commit `539d00c` adds the scoped Business Intelligence domain, orchestrator and registry integration, focused tests, and architecture documentation.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Detailed classification thresholds, prioritization policy, future trend methods, and internal operational weighting.

### Recommended Protection

Evaluate as a patent candidate with counsel, preserve non-public operational methods as trade-secret candidates, and retain source and documentation copyright evidence.

### Follow-Up Actions

Complete inventorship, assignment, prior-art, and public-disclosure review.

### Notes

No detailed threshold, ranking formula, private customer information, financial credential, or operative trade-secret logic is reproduced here.

## MC-IP-0012 — Community Intelligence Foundation

**Status:** Implemented
**Category:** Patent Candidate / Trade Secret / Copyright
**First Documented:** 2026-07-11
**Implemented:** 2026-07-11
**Primary Author / Inventor:** William E. Molina
**Owning Entity:** WM FLEX LABS, LLC, pending final confirmation or assignment
**Product:** Meetro Community
**Related Milestone:** MC-AI-013
**Repository Commit:** Pending repository verification
**Related Files:** `server/intelligence/community/`, `server/intelligence/orchestrator/companionOrchestrator.js`, `server/intelligence/orchestrator/defaultEngines.js`, `server/intelligence/orchestrator/engineSelector.js`, `server/tests/communityIntelligence.test.js`, `docs/KnowledgeBase/MEETRO_COMMUNITY_INTELLIGENCE_ARCHITECTURE.md`

### Problem Solved

Community activity spans multiple public and relationship-aware surfaces, but useful interpretation must not expose private participation or turn visibility into social ranking.

### Technical or Creative Solution

An authorized community-scope layer filters visibility, minimizes location, normalizes and deduplicates visible records, interprets Moments, Spotlight, Wonder Pass, service representation, and aggregate engagement, and produces deterministic signals and advisory opportunities.

### Distinguishing Characteristics

Visibility-first aggregation, privacy-safe location minimization, typed cross-surface deduplication, manipulation-resistant factual signals, and strict separation from popularity, endorsement, recommendation, and social-value scoring.

### Operational Value

Provides useful local context while preserving member privacy, relationship authority, community continuity, and existing product recommendation outcomes.

### Evidence of Implementation

Repository modules, orchestrator integration, focused tests, and architecture documentation exist in the working tree. A qualifying implementation commit remains pending repository verification.

### Publicly Disclosed?

Pending repository verification.

### Confidential Elements

Internal thresholds, signal and opportunity policy, future manipulation defenses, and future trend methods.

### Recommended Protection

Evaluate as a patent candidate with counsel, preserve non-public operational methods as trade-secret candidates, and retain source and documentation copyright evidence.

### Follow-Up Actions

Commit the verified implementation, update this entry with the commit hash, and complete inventorship, assignment, prior-art, and public-disclosure review.

### Notes

No ranking formula, recommendation weight, abuse-detection rule, private community data, or operative trade-secret logic is reproduced here.
