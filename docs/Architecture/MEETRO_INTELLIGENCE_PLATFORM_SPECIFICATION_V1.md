# Meetro Community Intelligence Platform Specification v1.0

**Document Identifier:** MC-ARCH-003  
**Status:** Baseline Adopted  
**Version:** 1.0  
**Baseline Date:** 2026-07-11

## 1. Executive Overview

Meetro Community uses a layered intelligence platform rather than a single unrestricted AI prompt. The platform is workflow-aware, contextual, validation-bound, provider-subordinate, advisory, human-controlled, privacy-conscious, extensible, and governed by the [Meetro Community Intelligence Constitution](MEETRO_INTELLIGENCE_CONSTITUTION.md).

Structured engines establish what the platform may know, compare, recommend, and plan before a provider explains the result. The provider does not own product truth, permissions, approvals, evidence, confidence, plans, or governance. Execution does not exist in v1.0.

## 2. Original Product Philosophy

The architecture preserves the original Meetro Community intelligence concept:

- workflow-first, not chatbot-first;
- context-first, not prompt-first;
- Companion intelligence, not autonomous control;
- human approval, not silent action;
- the product workflow remains the hero;
- intelligence surfaces the next useful understanding; and
- members do not need to know the internal engine architecture.

The layered platform strengthens this concept by assigning authority, evidence, privacy, and failure boundaries before provider explanation.

## 3. Platform Scope

The v1.0 baseline includes authentication, authorization, membership, permissions, credits, rate controls, the Intelligence Gateway, the Intelligence Orchestrator, domain engines, Validation, Decision, Recommendation, Planning, Execution Governance, Unified Context, the provider adapter, one AI-provider call boundary, usage recording, metadata-only logging, tests, architecture documentation, and implementation evidence.

No execution adapter, product write layer, action dispatcher, or frontend execution surface is implemented. Current credit and rate defaults remain limited as described in Section 34.

## 4. End-to-End Architecture

```text
Application Feature
        |
        v
Authentication and Authorization
        |
        v
Membership / Permissions / Credits / Rate Controls
        |
        v
Intelligence Gateway
        |
        v
Intelligence Orchestrator
        |
        +-- Workflow Intelligence
        +-- Relationship Intelligence
        +-- Persistent Companion Memory
        +-- Business Intelligence
        +-- Community Intelligence
        +-- Knowledge Intelligence
        +-- Capability Intelligence
        +-- Validation and Confidence
        +-- Decision Intelligence
        +-- Recommendation Intelligence
        +-- Planning Intelligence
        +-- Execution Governance
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

No execution component follows Execution Governance in v1.0.
```

## 5. Authority Hierarchy

```text
Authentication and Authorization
        v
Membership, Permissions, Credits, and Rate Controls
        v
Privacy, Safety, and Policy Constraints
        v
Verified Product and Repository Evidence
        v
Validation and Confidence
        v
Domain Intelligence
        v
Capability Intelligence
        v
Decision Intelligence
        v
Recommendation Intelligence
        v
Planning Intelligence
        v
Execution Governance
        v
Provider Explanation
```

Lower layers cannot overrule higher-authority constraints. Provider output is never authoritative evidence. Planning does not authorize execution. Execution Governance does not perform execution.

## 6. Gateway and Provider Boundary

All provider-bound Companion requests pass through the Intelligence Gateway. Authentication and current membership, usage, credit, and rate controls run before provider access. The Gateway supplies backend-owned governance attestations after those checks pass; client-supplied identity or governance claims are not trusted.

Engines do not call providers. The Orchestrator invokes the provider adapter once after structured context assembly, so one Gateway request produces at most one provider request. The adapter contains provider-specific behavior and keeps provider identity and diagnostics out of normal UI responses.

The provider explains structured intelligence. It cannot create permissions, approvals, evidence, capabilities, authoritative plans, execution eligibility, receipts, or execution claims.

## 7. Intelligence Orchestrator

The Orchestrator selects enabled engines from the registered architecture, runs deterministic dependency stages, isolates engine failures, and collects one structured section per engine. Required engines fail closed. Unified Context rejects duplicate sections and orders accepted sections by engine priority.

The implemented registry order is:

| Priority | Engine | State |
|---:|---|---|
| 10 | Intent | Enabled helper |
| 20 | Context | Enabled |
| 30 | Session Memory | Enabled |
| 40 | Workflow | Enabled |
| 50 | Relationship | Enabled |
| 60 | Persistent Memory | Enabled |
| 70 | Business | Enabled |
| 80 | Community | Enabled |
| 90 | Knowledge | Enabled |
| 100 | Capability | Enabled |
| 110 | Validation | Enabled, required when selected |
| 120 | Decision | Enabled, required when selected |
| 130 | Recommendation | Enabled, required when selected |
| 140 | Planning | Enabled, required when selected |
| 150 | Execution Governance | Enabled, required when selected |

Document and Portfolio remain disabled future metadata at later priorities. The Orchestrator contains the single provider invocation boundary; engines contain none.

## 8. Workflow Intelligence

- **Responsibility:** Interpret verified lifecycle state, blockers, obligations, and the next safe workflow action.
- **Inputs:** Backend-owned workflow context and repository-supported lifecycle rules.
- **Outputs:** Structured stage, status, blockers, prerequisites, completion state, and next-action context.
- **Authority boundary:** Workflow owns lifecycle truth used by downstream engines.
- **Must not:** Change workflow state, satisfy obligations, schedule work, close jobs, or execute actions.
- **Current limitation:** Quality is bounded by available authorized workflow records.

## 9. Relationship Intelligence

- **Responsibility:** Preserve participant identity, relationship continuity, communication context, and bounded follow-up guidance.
- **Inputs:** Authorized relationship and workflow context.
- **Outputs:** Structured relationship type, current engagement, continuity, communication, and next-action context.
- **Authority boundary:** Relationship owns relationship context, not lifecycle or permission truth.
- **Must not:** Modify relationships, infer trust scores, rank people, or expose unrelated participants.
- **Current limitation:** It returns bounded or empty context when stable identity and scope are unavailable.

## 10. Persistent Companion Memory

- **Responsibility:** Provide approved durable continuity, while Session Memory provides short-lived conversation continuity.
- **Inputs:** User-scoped approved memory records, consent, scope, retention, and current request context.
- **Outputs:** Relevant bounded memory context or an empty safe result.
- **Authority boundary:** Current verified product state overrides memory.
- **Must not:** Grant permission, establish identity, preserve revoked data, cross user boundaries, or automatically promote raw conversation history.
- **Current limitation:** Production durability requires reviewed repository adapters and retention operations.

## 11. Business Intelligence

- **Responsibility:** Interpret authorized operational aggregates such as workload, schedule health, pipeline, current financial-workflow signals, and priorities.
- **Inputs:** Business-scoped workflow, schedule, proposal, invoice, payment, and approved memory evidence.
- **Outputs:** Structured business context, status, signals, priorities, and bounded confidence.
- **Authority boundary:** Business owns operational interpretation, not accounting truth or execution.
- **Must not:** Calculate unsupported revenue, guarantee outcomes, set prices, schedule work, or message customers.
- **Current limitation:** It remains empty or qualified without trusted business-scoped repositories.

## 12. Community Intelligence

- **Responsibility:** Interpret authorized community activity, capability networks, Moments, Spotlight, Wonder Pass, and community relevance.
- **Inputs:** Visibility-filtered community records, relationship context, and approved community-scoped memory.
- **Outputs:** Structured aggregate signals, opportunities, participation context, and confidence.
- **Authority boundary:** Community owns authorized aggregate context, not private profile or business truth.
- **Must not:** Rank people, sell leads, expose private activity, infer demand from insufficient evidence, or perform unrestricted profiling.
- **Current limitation:** Safe output depends on stable visibility, scope, and coarse-location evidence.

## 13. Knowledge Intelligence

- **Responsibility:** Retrieve governed, source-aware rules and knowledge relevant to the request.
- **Inputs:** Authorized scope, curated source metadata, domain, freshness, and repository evidence.
- **Outputs:** Bounded knowledge entries, source references, status, disclaimers, conflicts, and confidence.
- **Authority boundary:** Knowledge owns verified guidance but cannot invent live product state.
- **Must not:** Treat stale or unsupported knowledge as authoritative, mutate sources, or use uncontrolled provider claims as evidence.
- **Current limitation:** A reviewed database-backed read-only repository adapter is still required for production source coverage.

## 14. Capability Intelligence

- **Responsibility:** Resolve supported platform capabilities, requirements, authorization status, prerequisites, missing inputs, risk, and safe next steps.
- **Inputs:** Capability registry definitions plus validated domain context.
- **Outputs:** Selected Capability, alternatives, authorization, prerequisites, required inputs, status, and non-execution state.
- **Authority boundary:** The Capability registry defines supported capabilities; provider output cannot add them.
- **Must not:** Grant permission, perform a Capability, bypass Workflow prerequisites, or expose unavailable actions as available.
- **Current limitation:** Unsupported or ambiguous requests fail closed; no execution layer exists.

## 15. Validation and Confidence

- **Responsibility:** Validate evidence, authority, freshness, scope, identity, agreement, contradiction, and response constraints.
- **Inputs:** Structured outputs from selected domain and Capability engines.
- **Outputs:** Validation status, evidence references, conflicts, missing evidence, platform confidence class, and provider response constraints.
- **Authority boundary:** Validation is authoritative over downstream support status and platform confidence. Provider confidence is not platform confidence.
- **Must not:** Average unrelated confidence, erase contradictions, infer missing evidence, or allow blocked claims to become definitive.
- **Current limitation:** Validation quality cannot exceed the completeness and freshness of structured source evidence.

## 16. Decision Intelligence

- **Responsibility:** Compare validated Capability options and preserve constraints and tradeoffs.
- **Inputs:** Validation output and approved Capability options.
- **Outputs:** Deterministic options, selected option where supported, rejected options, constraints, tradeoffs, evidence, confidence, and approval requirement.
- **Authority boundary:** Decision cannot override Validation or create options absent from Capability output.
- **Must not:** Discover external alternatives, rank providers, inflate confidence, authorize action, or execute a decision.
- **Current limitation:** Comparison is restricted to options already present in validated Capability context.

## 17. Recommendation Intelligence

- **Responsibility:** Prioritize validated Decision options without losing blocked, deferred, clarification, no-safe, or no-action states.
- **Inputs:** Decision, Validation, Workflow, and bounded supporting evidence.
- **Outputs:** Ordered recommendations, highest priority, deferred and blocked lists, mode, confidence, warnings, and false execution state.
- **Authority boundary:** Decision and Validation remain authoritative; Recommendation ordering is authoritative for Planning.
- **Must not:** Invent options or evidence, hide blocked results, remove explicit approval, mutate state, or execute.
- **Current limitation:** It cannot discover external opportunities or rank professionals.

## 18. Planning Intelligence

- **Responsibility:** Transform eligible Recommendation output into structured advisory plans.
- **Inputs:** Recommendation, Decision, Validation, Capability, and Workflow context.
- **Outputs:** Stable plans and steps, prerequisites, dependencies, missing information, approvals, constraints, risks, rollback awareness, completion criteria, readiness, mode, and confidence.
- **Authority boundary:** Recommendation order and upstream Validation, Decision, Capability, and Workflow facts remain authoritative.
- **Must not:** Add unsupported steps, reprioritize recommendations, authorize action, mutate state, execute, or mark completion.
- **Current limitation:** Exact effort, cost, and schedule estimates are unavailable unless verified product data exists.

## 19. Execution Governance

**Execution Governance does not execute.**

- **Responsibility:** Evaluate backend-owned authorization attestations, action-specific approvals, prerequisites, idempotency, duplicate state, audit and receipt requirements, retry governance, rollback classification, and denial reasons.
- **Inputs:** Gateway attestations, Validation, Capability, Planning, and backend-owned governance context.
- **Outputs:** Authorization and permission status, approval status, prerequisite and idempotency status, audit and receipt contracts, rollback policy, failure classification, denials, and false execution fields.
- **Authority boundary:** Gateway and current product evidence remain authoritative. Planning, Memory, Recommendation, provider text, silence, and prior approval do not establish authorization.
- **Must not:** Execute actions, mutate state, infer approval, process retries, perform rollback, issue a successful receipt, or permit provider override.
- **Current limitation:** Approval, idempotency, receipt, and audit persistence require future reviewed adapters. Credit and rate checks retain current backend limitations. Execution remains unavailable.

## 20. Unified Context Model

Unified Context accepts structured engine results in deterministic priority order. It permits one section per engine, rejects duplicates and protected-section collisions, clones accepted data, enforces a bounded payload size, and reports dropped or truncated sections.

Principles are structured data over prose, privacy minimization, no hidden mutation, deterministic ordering, and provider subordination. The raw prompt composition is outside this specification and remains non-public.

## 21. Evidence Model

Approved evidence includes verified product state, repository-supported workflow rules, authorized user context, approved persistent memory, validated engine output, the Capability registry, and current Gateway attestations.

Invalid evidence includes provider invention, unsupported assumptions, stale-only evidence, unverified claims where verification is required, Memory treated as permission, and previous approval after material state changes.

## 22. Confidence Model

Platform confidence communicates whether evidence supports a claim. Conceptual classes are high, medium, low, conflicted, and insufficient or withheld. Conflict, stale evidence, missing scope, and insufficient evidence constrain language or block conclusions. Internal thresholds, formulas, and weights are intentionally not documented.

## 23. Determinism

Repository-governed stages use stable IDs and stable ordering. Equal structured inputs produce equal structured outputs where repository rules apply. Random identifiers and timestamp-derived reasoning order are avoided. Timestamps may support freshness or elapsed-time metadata but do not choose authoritative reasoning order. Provider prose cannot reorder authoritative options, recommendations, or plans.

## 24. Privacy Model

Privacy filtering occurs before provider context. The platform minimizes fields by purpose, enforces user, role, business, community, workflow, and relationship scope, and restricts Memory to approved boundaries. Logs contain metadata rather than prompts, raw provider context, private records, Memory values, document contents, credentials, or secrets. Cross-user and cross-scope context leakage is prohibited.

## 25. Security Model

Security is layered through Gateway enforcement, authentication, authorization, current permissions, ownership checks, Capability constraints, explicit approval boundaries, fail-closed policy, idempotency requirements, duplicate prevention contracts, and audit requirements. This specification records responsibilities only and does not disclose operative security controls.

## 26. Approval Model

Approval is explicit, action-specific, current, and separate from reasoning. Silence is not approval. Provider output is not approval. Approval may expire, and material state changes invalidate prior approval. High-impact future actions require approval at their execution boundary. Planning describes checkpoints but creates neither permission nor authorization.

## 27. Fail-Closed Model

Expected safe outcomes include blocked, deferred, clarification required, no safe recommendation, no safe plan, no action, and execution denied. Unknown authority, unsupported Capability, conflicting Validation, privacy uncertainty, stale-only evidence, missing prerequisites, missing approval, and duplicate requests do not become positive authorization.

## 28. No-Mutation and No-Execution Boundary

The v1.0 intelligence platform does not send messages, create quotes, create invoices, record payments, change schedules, close jobs, publish content, modify Memory, mutate workflows, perform rollback, or claim that actions occurred. Planning and Governance describe structured conditions only. There is no product write path after Execution Governance.

## 29. Logging and Observability

Allowed operational metadata includes request IDs, engine names, bounded counts, modes, confidence classes, readiness, denial states, elapsed time, provider-call count, and execution status. Prohibited logging includes prompts, raw provider context, customer data, private records, Memory values, document contents, credentials, secrets, and confidential engine methods.

## 30. Testing Strategy

Required validation layers include focused engine tests, contract tests, registry and ordering tests, Gateway tests, provider-boundary tests, no-execution and no-mutation tests, privacy tests, full regression tests, targeted ESLint, production build, `git diff --check`, documentation-link and path audits, legal-claim audits, and confidentiality audits.

The presence of files does not establish implementation success. Behavior, boundaries, integration, failure handling, regression safety, and build output must be verified.

## 31. Constitutional Governance

The [Meetro Community Intelligence Constitution](MEETRO_INTELLIGENCE_CONSTITUTION.md) governs non-negotiable authority, evidence, privacy, approval, provider, planning, and execution-separation principles. This specification documents the current architecture and cannot override the Constitution.

## 32. IP and Documentation Governance

The [IP Ledger](../IntellectualProperty/IP_LEDGER.md) records implementation evidence. Commit evidence is added only after a verified commit exists. The [AI Roadmap](AI_ROADMAP.md) distinguishes implemented milestones from planned work. Repository-relative paths are required. Confidential formulas, heuristics, thresholds, weights, prompts, and security-sensitive controls remain undisclosed, and legal status must not be overstated.

## 33. Implemented Milestone Timeline

Each reference below was verified in Git history:

```text
0e5d94f  Intelligence Gateway Foundation
63de89c  Provider Integration
7154950  MC-AI-008  Intelligence Orchestrator
fee1c0f  MC-AI-009  Workflow Intelligence
7cda459  MC-AI-010  Relationship Intelligence
b688449  MC-AI-011  Persistent Companion Memory
539d00c  MC-AI-012  Business Intelligence
d92acd7  MC-AI-013  Community Intelligence
4e37db9  MC-AI-014  Knowledge Intelligence
b3412a9  MC-AI-015  Capability Intelligence
02cabbd  MC-AI-016  Validation and Confidence
886169f  MC-AI-017  Decision Intelligence
b95e078  MC-AI-018  Recommendation Intelligence
b0a21fa  MC-AI-019  Planning Intelligence
a1fe0b7  MC-AI-020  Execution Governance
93fb90e  MC-ARCH-002  Intelligence Constitution
```

Separate documentation and IP-evidence commits also exist. They are governed by the centralized ledger and are not repeated here.

## 34. Current Limitations

- No execution contracts, execution adapters, product write actions, or automatic execution exist.
- No frontend Planning or Execution Governance surface exists.
- No external opportunity or alternative discovery exists in Decision, Recommendation, or Planning.
- Exact effort, cost, and schedule estimates are unavailable without verified product data.
- Credit validation and default rate or usage validation retain their current stub limitations.
- Production persistence is still required for approvals, receipts, idempotency records, and execution audits.
- Some domain engines require reviewed production repository adapters for complete evidence coverage.
- The provider remains explanatory and subordinate.

## 35. Extension Points

Safe future extension areas include the Execution Contract Foundation, user-approved execution adapters, approval UI, an execution audit center, intelligence observability, product intelligence integration, Work Center intelligence, Emergency intelligence, Message intelligence, Business Dashboard intelligence, Permit and compliance intelligence, predictive intelligence, and founder intelligence.

These are future possibilities, not implemented capabilities. Every extension must preserve the Constitution, current authority boundaries, privacy minimization, explicit approval, fail-closed behavior, and the separation between reasoning and execution.

## 36. v1.0 Definition

> A complete, tested, constitutionally governed advisory intelligence and execution-governance platform with no execution capability.

Version 1.0 is not autonomous and is not production execution capable. It establishes the stable baseline from which future contract and execution work must proceed deliberately.
