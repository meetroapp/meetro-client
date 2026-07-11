# Meetro Community Intelligence Constitution

**Identifier:** MC-ARCH-002  
**Status:** Adopted  
**Adopted:** 2026-07-11

## Purpose

This Constitution establishes the durable governance boundaries for Meetro Community Intelligence. It protects trust, evidence integrity, user authority, privacy, domain ownership, and the separation between reasoning and action as the intelligence architecture evolves.

It governs present intelligence modules and all future engines, planning systems, provider integrations, and execution capabilities. It does not itself implement runtime behavior.

## Scope

This Constitution applies to the Intelligence Gateway, Intelligence Orchestrator, intelligence engines, context and memory systems, provider adapters, validation, decision support, recommendations, future planning, and any future execution boundary.

It does not replace product authorization, privacy policy, security controls, legal review, or operational procedures. Those controls remain independently authoritative within their domains.

## Constitutional Authority

When sources conflict, Meetro Community Intelligence must apply this order of authority:

1. Authentication and authorization.
2. Permissions, membership, credits, and rate limits.
3. Safety, privacy, and policy controls.
4. Validated repository and product evidence.
5. Validation Intelligence.
6. Domain Intelligence engines within their assigned domains.
7. Capability Intelligence.
8. Decision Intelligence.
9. Recommendation Intelligence.
10. Future Planning Intelligence.
11. Provider explanation.

Lower levels may explain higher-authority results but may not override, weaken, fabricate, or silently omit them.

## Article I — Authentication and Authorization

Authenticated backend identity is the source of user identity. Client-supplied identity, role, ownership, permissions, or trusted context is never authoritative. Every protected intelligence request must remain subject to authorization before private context is retrieved or used.

## Article II — Gateway Sovereignty

The Intelligence Gateway is the secure entry point for Companion intelligence. Frontends and product surfaces must not call reasoning providers directly. Provider credentials, models, diagnostics, and raw responses remain behind the backend boundary.

## Article III — Single Responsibility of Engines

Each engine owns one declared domain and must remain within that domain. An engine may contribute structured evidence or guidance but may not overrule another engine's authoritative domain. New engines require an explicit contract, registry metadata, tests, and documented boundaries.

## Article IV — Evidence Integrity

Claims must be grounded in authorized, attributable, sufficiently current evidence. Missing evidence must remain missing. Conflicting evidence must remain visible to Validation. Provider output, model confidence, fluent wording, and prior generated answers are never evidence.

## Article V — Validation Authority

Validation Intelligence is authoritative over support status, contradiction handling, evidence sufficiency, and platform confidence. Downstream engines and providers may not increase confidence, erase uncertainty, bypass restrictions, or convert blocked evidence into an affirmative claim.

## Article VI — Capability Boundaries

Capability Intelligence may identify governed capabilities, prerequisites, risk, ambiguity, and safe next steps. It may not grant permission, satisfy a missing prerequisite, perform a capability, or imply that execution is available.

## Article VII — Decision Integrity

Decision Intelligence may compare only validated options supplied through governed capability output. It must preserve constraints, tradeoffs, uncertainty, and approval requirements. It may not invent alternatives, manipulate users, rank external parties, or execute a decision.

## Article VIII — Recommendation Integrity

Recommendation Intelligence may prioritize only validated Decision options. Recommendations must preserve evidence, blocked and deferred states, no-action outcomes, and user control. A recommendation is advisory and is never authorization.

## Article IX — Planning Boundary

Future Planning Intelligence may organize an approved objective into prerequisites, dependencies, steps, checkpoints, rollback awareness, missing information, and estimated effort. A plan is a proposal. Planning must not mutate product state, satisfy its own prerequisites, approve itself, or perform any step.

## Article X — Separation of Reasoning and Execution

Understanding, Validation, Decision, Recommendation, and Planning are not authorization.

Reasoning describes what is known, uncertain, advisable, or preparatory. Execution changes product or external state. These concerns must remain structurally separate.

Any future execution system must have its own explicit authorization boundary, permission checks, validation of current state, idempotency controls, audit record, failure handling, and rollback or recovery strategy where applicable. No reasoning engine may become an execution path by implication.

## Article XI — Explicit Approval

High-impact actions require clear, informed, action-specific user approval at the time of execution. Prior conversation, silence, a recommendation, a generated plan, a saved preference, or approval of a different action is not approval.

High-impact actions include sending customer communications, changing schedules, approving or issuing proposals, changing prices, recording payments, closing work, publishing content, modifying durable memory, disclosing private information, or making binding business decisions.

## Article XII — Privacy Before Provider Context

Privacy minimization occurs before context reaches a provider. Provider context must contain only the safe, relevant fields needed for the request. Raw database records, unrelated history, secrets, credentials, hidden identifiers, and unauthorized personal or business information must not be forwarded.

## Article XIII — Memory Governance

Session memory is short-lived, backend-owned, user-scoped continuity. Persistent memory contains only approved, authorized, and purpose-limited information. Memory cannot establish identity, grant authorization, override current product truth, or silently become permanent. Retention, correction, expiration, and deletion boundaries must be explicit.

## Article XIV — Provider Subordination

Providers reason within constraints prepared by Meetro Community. Providers do not own identity, evidence, permissions, domain truth, validation, product state, or execution. Provider selection is interchangeable and hidden from normal user-facing responses.

OpenAI reasons. Meetro Community understands. The Companion protects trust.

## Article XV — Determinism and Explainability

Rules that establish authority, eligibility, restrictions, ordering, or safety should be deterministic where practical. Material conclusions must be explainable through bounded evidence references, constraints, and statuses without exposing confidential internal methods.

## Article XVI — No Hidden Mutation

Intelligence evaluation must be read-only unless a separately authorized execution path is explicitly invoked. Engines, providers, validation, recommendations, and future planning must not silently save, send, schedule, approve, publish, delete, charge, close, or otherwise mutate state.

## Article XVII — Logging and Auditability

Intelligence operations must produce bounded operational records sufficient to investigate flow, safety, failures, authorization, and outcomes. Logs must minimize private content and must not contain credentials, full prompts, raw protected records, confidential engine logic, or unnecessary message bodies.

## Article XVIII — Fail-Closed Behavior

Missing identity, authorization, evidence, required prerequisites, or safety certainty must not be converted into permission or fact. Material engine, validation, or provider failures must produce normalized safe outcomes. Failure must not silently bypass required controls.

## Article XIX — Testing Obligations

Every intelligence change must test its contract, authority boundary, failure behavior, privacy constraints, provider boundary, and non-execution guarantees. Changes affecting engine order or orchestration require focused regression coverage. Existing protections must not be weakened to make a new module pass.

## Article XX — Documentation and Intellectual Property Discipline

Architecture, roadmap, and intellectual-property records must distinguish implemented behavior from planned behavior and verified evidence from proposals. Repository references must be relative and verifiable. Public documentation must not disclose confidential formulas, thresholds, rankings, weights, heuristics, credentials, or security-sensitive controls. Unsupported legal claims are prohibited.

## Article XXI — Constitutional Amendment

This Constitution may be amended only through an explicit architecture task that identifies the affected articles, rationale, risks, compatibility impact, and validation evidence. Runtime work must not amend constitutional meaning indirectly. Amendments must preserve the authority hierarchy or clearly document and review any proposed change to it.

## Non-Negotiable Invariants

1. The frontend remains provider-blind.
2. The frontend cannot supply trusted identity, authorization, or intelligence context.
3. The Intelligence Gateway remains the secure intelligence entry point.
4. The Orchestrator coordinates intelligence; it does not replace domain authority.
5. Each engine remains within its declared responsibility.
6. Provider output is never product evidence.
7. Validation remains authoritative over evidence support and confidence.
8. Capability output does not authorize or perform action.
9. Decision output is advisory and limited to validated options.
10. Recommendation output is advisory and cannot authorize execution.
11. Future Planning output cannot mutate state or approve itself.
12. Reasoning and execution remain structurally separate.
13. High-impact execution requires explicit, current, action-specific approval.
14. Privacy minimization occurs before provider context is assembled.
15. Memory cannot grant permission or override current product truth.
16. Required safety and authorization failures fail closed.
17. Intelligence modules do not perform hidden mutation.
18. One provider response cannot overrule authoritative Meetro Community evidence.
19. Logs exclude credentials, unnecessary private content, and confidential logic.
20. Implemented and planned capabilities remain clearly distinguished.
21. Constitutional changes require explicit documented amendment.

## Contributor Rules

- Read this Constitution and the standing intelligence architecture before changing intelligence code or documentation.
- State whether a task is runtime, governance, testing, or documentation work.
- Identify the authoritative engine or control for every new responsibility.
- Preserve the established authority order and provider boundary.
- Keep inputs minimal, backend-owned, authorized, and purpose-limited.
- Add focused tests for authority, privacy, failure, and non-execution boundaries.
- Do not introduce implicit approval, hidden mutation, or provider-as-evidence behavior.
- Do not expose confidential internal methods in tests, logs, documentation, or user responses.
- Mark future work as planned; do not describe it as implemented.
- Require a separate explicit task before changing Orchestrator behavior or adding execution.
