# The Meetro Platform Constitution

**Milestone:** MC-PLATFORM-001

**Draft version:** 0.2.0-freeze-candidate

**Status:** REVISED FREEZE CANDIDATE

**Document freeze:** NOT YET AUTHORIZED

**Ratification:** NOT AUTHORIZED

**Runtime adoption:** NOT AUTHORIZED

## Preamble

The Meetro Platform Constitution exists so every Meetro system can answer, with
evidence, when the platform is telling the truth. It is a peer of the Meetro
Constitution: the Meetro Constitution governs purpose, dignity, fairness,
relationships, trust, and stewardship; this Constitution governs engineering
truth, authority, ownership, lifecycle integrity, privacy, certification, and
deployment. Neither Constitution overrides the other. Every Constitutionally
Governed Subsystem is subject to both, and passing one gate cannot compensate
for failing the other.

## Normative Language

The terms **MUST** and **MUST NOT** state requirements whose violation requires
correction, an approved exception, or a finding of noncompliance. **SHOULD** and
**SHOULD NOT** state requirements that may be departed from only with recorded
reasoning and evidence. **MAY** grants permission without creating an
obligation. Descriptive text does not weaken a normative requirement.

Canonical meanings for terms used here are maintained in
[Canonical Definitions](CANONICAL_DEFINITIONS.md).

## Article I — Constitutional Scope and Authority

1. This Constitution governs engineering integrity across every
   Constitutionally Governed Subsystem, including the clients, services,
   datastores, integrations, intelligence capabilities, deployments, and
   operational projections within its boundary.
2. It does not govern Meetro's human purpose, values, dignity, fairness, or
   product philosophy; those remain the independent authority of the Meetro
   Constitution.
3. A Constitutionally Governed Subsystem MUST satisfy both Constitutions. A
   technical success that violates the Meetro Constitution fails, and a humane
   intention that violates platform truth or authority also fails.
4. A constitutional violation occurs when implemented or proposed behavior
   contradicts a MUST or MUST NOT provision without a valid constitutional
   exception.
5. Conflicts between the two Constitutions MUST be disclosed and escalated. No
   team, feature, provider, or automated system MAY resolve such a conflict by
   silently subordinating either Constitution.
6. Constitutional law states durable obligations. Platform invariants state
   conditions that MUST remain true. Governance rules control how architecture
   changes. Implementation standards describe replaceable engineering means.
   Feature-specific rules remain under their feature authorities.
7. An implementation standard MUST NOT be presented as constitutional merely
   because it is current, convenient, or widely used.
8. A subsystem, capability, workflow, service, or architectural change is
   constitutionally governed when it creates or changes canonical truth,
   lifecycle authority, ownership, authorization, private or sensitive data,
   cross-account relationships, AI persistence authority, certification or
   deployment boundaries, reusable platform capability, or material production
   behavior.
9. Minor implementation work that does not alter a constitutional boundary MAY
   use ordinary engineering review, but it remains obligated to comply with
   both Constitutions.

## Article II — Canonical Truth

1. Canonical truth is an accepted platform fact with one identifiable authority,
   defined ownership, stable identity, and evidence sufficient for its declared
   purpose.
2. Every authoritative state MUST have one identifiable canonical owner.
3. A presentation, projection, cache, client state, or optimistic state MAY
   derive from canonical truth but MUST NOT invent, replace, or contradict it.
4. Local state MUST NOT silently become platform authority. A durable handoff
   to authority requires an explicit authorized command and authoritative
   confirmation.
5. Repeated retrieval or hydration MUST NOT create new truth, relationships,
   events, notifications, or lifecycle transitions unless the operation is
   explicitly defined and governed as a command.
6. Contradictory projections MUST fail closed, preserve uncertainty, or expose
   the contradiction. They MUST NOT select the most convenient answer silently.
7. Authoritative state MUST be independent of display copy, localization,
   visual order, route names, and labels.
8. Historical truth MUST identify its source and MUST NOT be rewritten by a
   current presentation merely because the present state changed.
9. Audit evidence MAY support or challenge canonical truth, but a log alone is
   not canonical business truth unless the relevant domain contract declares it
   so.

## Article III — Authority Boundaries

1. Every read, mutation, derivation, and delivery MUST identify the authority
   under which it operates.
2. Backend services MAY accept commands from clients but MUST reestablish
   identity, authorization, current state, and ownership at the authoritative
   boundary.
3. Frontends MAY collect intent, hold transient interaction state, issue
   commands, and present confirmed projections. They MUST NOT declare canonical
   success before authoritative confirmation.
4. Databases own durable persistence and constraints within approved schemas;
   database presence alone does not define domain meaning or authorization.
5. Users own their choices and approvals within authorized capabilities. User
   intent does not bypass lifecycle, ownership, privacy, or legal constraints.
6. External providers MAY deliver bounded capabilities. They MUST NOT become
   canonical owners merely because they produced, transported, or stored data.
7. AI MAY recommend, draft, classify, explain, or judge evidence within its
   declared authority. It MUST NOT silently create identity, permission,
   lifecycle, relationship, financial, or other canonical business truth.
8. Administrative authority MUST be explicit, least-privileged, attributable,
   auditable, and revocable. It MUST NOT be inferred from operational access.
9. Deployment authority is separate from development authority. The ability to
   build or inspect software does not authorize release, configuration, data,
   or production changes.
10. Convenience, availability, route possession, cached identity, or prior
    success MUST NOT be used to infer authority.

## Article IV — Ownership

1. Ownership of records, relationships, conversations, requests, media,
   messages, notifications, devices, events, history, business profiles, and
   professional participation MUST be declared and enforced by the backend
   authority responsible for that domain.
2. An authenticated principal's identity MUST be derived from authenticated
   authority. Clients MUST NOT submit or override authoritative owner identity.
3. Display names, contact values, routes, storage keys, and opaque identifiers
   MUST NOT establish ownership.
4. Ownership boundaries MUST survive reload, refresh, logout/login, device
   change, account switching, and projection reconstruction.
5. A relationship, conversation, or shared record MAY have multiple authorized
   participants while retaining one canonical owning authority.
6. Cross-account disclosure or mutation outside an explicit authorized scope is
   a constitutional violation.
7. Delegated access MUST be explicit, purpose-limited, attributable, revocable,
   and rechecked at authoritative boundaries.
8. Deleting or archiving an owner's relationship projection MUST NOT alter
   another owner's independent relationship or identity unless the governing
   shared-domain contract explicitly authorizes that effect.

## Article V — Lifecycle Integrity

1. Every authoritative lifecycle MUST define its states, permitted transitions,
   terminal states, reversible states, owner, and transition evidence.
2. Lifecycle transitions MUST be explicit commands or authoritative outcomes.
3. Invalid, unauthorized, stale, or unsupported transitions MUST fail closed.
4. Initial hydration, retrieval, rendering, polling, and repeated observation
   are not lifecycle transitions.
5. Terminal states MUST NOT silently reopen, regress, or acquire incompatible
   successor states.
6. Derived stages MAY summarize canonical state but MUST NOT extend or mutate
   lifecycle meaning.
7. Projection state MUST NOT contradict canonical lifecycle state. When
   evidence conflicts, uncertainty MUST be preserved.
8. Presentation-specific pseudo-statuses MUST remain presentation values and
   MUST NOT become canonical states by reuse or persistence.
9. A feature-specific transition sequence MUST remain governed by its feature
   contract unless a reusable law has been independently established.

## Article VI — State Transition Governance

1. A transition command MUST validate input, authenticated identity,
   authorization, ownership, current state, and all domain preconditions at the
   authoritative boundary.
2. A stale client assumption MUST NOT authorize a transition.
3. The authoritative boundary MUST recheck current truth immediately before a
   mutation whose validity depends on that truth.
4. Canonical timestamps MUST be assigned by the authority that accepts or
   persists the transition. Client clocks MAY support presentation but MUST NOT
   establish authoritative occurrence.
5. A transition MUST preserve evidence sufficient to distinguish accepted,
   rejected, repeated, and failed commands.
6. Expected retries MUST NOT duplicate effects or advance the lifecycle twice.
7. Partial success MUST NOT leave records in contradictory authoritative states.
8. Concurrent commands MUST resolve deterministically through an appropriate
   combination of constraints, locks, conditional writes, version checks, or
   equivalent authority-preserving mechanisms.
9. A command's public success response MUST describe only committed canonical
   results.

## Article VII — Privacy and Data Minimization

1. Every read and delivery MUST return only the minimum data required for the
   authorized purpose.
2. Private data, sensitive operational data, participant-only data, and public
   projections MUST have explicit boundaries.
3. Preselection or discovery views MUST NOT expose data reserved for selected,
   accepted, assigned, or otherwise authorized participants.
4. Privacy MUST be enforced by backend authorization and bounded projection,
   not merely by hiding fields in a user interface.
5. Deep links MUST recheck privacy and ownership at the destination.
6. Caches and coordinators MUST isolate authenticated accounts and MUST discard
   or invalidate inaccessible state after account change.
7. Notification and delivery payloads MUST exclude unnecessary private content,
   secrets, tokens, message bodies, and hidden identifiers.
8. Logs, analytics, exceptions, idempotency records, and audit records MUST
   minimize private data and MUST NOT contain credentials or tokens.
9. Public data MUST be explicitly classified for public use; the absence of an
   authentication check does not itself establish a public contract.
10. A privacy failure MUST fail closed without converting missing data into a
    broader disclosure.

## Article VIII — Authentication and Session Integrity

1. Authenticated identity MUST be established by an approved backend
   authentication authority and MUST NOT be client-declared.
2. Sensitive reads and commands MUST require an active valid session or an
   explicitly approved equivalent authority.
3. Verification, recovery, and credential changes MUST be bounded, MUST prevent
   duplicate acceptance and unauthorized replay under a documented token
   contract, and MUST NOT disclose account existence or secret material beyond
   the approved contract.
4. Session invalidation MUST take effect for protected authority according to a
   documented revocation contract.
5. Logout MUST clear or isolate account-specific presentation, caches,
   destinations, and transient data.
6. Account switching MUST reestablish identity and MUST NOT reuse another
   account's authorization or projections.
7. Protected destinations MUST NOT bypass authentication through route state,
   native restoration, browser history, deep links, or cached context.
8. Post-login or native destination restoration MUST reauthorize the destination
   against current identity and state.
9. Expired, malformed, revoked, or unverifiable sessions MUST fail closed.

## Article IX — Authorization

1. Authentication does not imply authorization.
2. Every authoritative read and mutation MUST check the principal's current
   capability for the exact resource and operation.
3. Authorization SHOULD derive from canonical ownership, membership,
   relationship, participant, selection, eligibility, or administrative grants
   as appropriate to the domain.
4. An unselected participant MUST NOT receive selected-participant access.
5. Eligibility to discover or respond MUST NOT imply authority to view private
   post-selection data or mutate later lifecycle stages.
6. Route possession, record identity, a previously viewed page, or a cached
   object MUST NOT confer access.
7. Deep links, reloads, retries, and restored destinations MUST reauthorize.
8. Server responses MUST ignore or reject client-provided owner, participant,
   role, or capability fields when those fields are authoritative.
9. Capability grants MUST be explicit, scoped, attributable, and revocable.
10. Authorization failures SHOULD avoid disclosing whether an inaccessible
    resource exists when such disclosure would cross a privacy boundary.

## Article X — Transactions and Atomicity

1. A mutation spanning records whose consistency defines one authoritative
   outcome MUST be atomic.
2. The transaction boundary MUST include every required write whose divergence
   would create contradictory canonical truth.
3. Relationship activation and competing-participant resolution MUST NOT
   diverge.
4. Conversation creation that is required by an accepted relationship outcome
   MUST align transactionally with that relationship truth or remain explicitly
   pending under a governed recovery contract.
5. When a canonical event is required as authoritative evidence of a domain
   transition, the event and the domain transition MUST be committed through
   one governed atomic boundary or through a transactionally reliable outbox
   mechanism that cannot silently lose or duplicate the event.
6. Not every mutation requires a canonical event. Optional telemetry and logs
   are not canonical events merely because they observe a mutation.
7. Optional delivery effects, including email, push, notification delivery, or
   analytics, SHOULD occur after canonical commit or through a durable delivery
   mechanism and MUST NOT corrupt committed domain truth when they fail.
8. Failed transactions MUST leave no authoritative partial state.
9. Rollback failures and uncertain commits MUST surface an explicit uncertain
   operational condition; they MUST NOT be reported as clean success.

## Article XI — Idempotency and Duplicate Prevention

1. Commands reasonably expected to be retried MUST define an idempotency
   contract.
2. Duplicate delivery, repeated taps, network retries, polling, and worker
   retries MUST NOT duplicate canonical truth or irreversible effects.
3. Critical uniqueness SHOULD be defended by durable constraints in addition to
   application logic.
4. Application guards and schema constraints SHOULD reinforce rather than
   contradict one another.
5. Idempotent repetition MUST return or reconcile to the original authoritative
   result when disclosure remains authorized.
6. Distinct legitimate commands MUST NOT be collapsed merely because their
   payloads resemble one another.
7. Polling and repeated observation MUST NOT produce repeated alerts,
   notifications, relationships, conversations, or events.
8. Idempotency behavior MUST be verified through focused retry and concurrency
   tests.

## Article XII — Canonical Events

1. A canonical domain event records an accepted authoritative fact; it MUST NOT
   create that fact independently or repair missing authority after the fact.
2. Required canonical event production is governed by the single atomic-handoff
   rule in Article X.5. This Constitution does not establish a second or weaker
   event transaction standard.
3. Event identity, semantic type, source, subject, actor, and ordering evidence
   MUST be deterministic enough to prevent duplicate meaning and ambiguous
   attribution.
4. Event recipients and privacy boundaries MUST be explicit.
5. Retries MUST NOT duplicate the meaning of one event occurrence.
6. Client-authored labels, display text, descriptive history, or messages are
   not automatically canonical events.
7. Event consumers MUST NOT independently reinterpret or advance lifecycle
   truth.
8. Audit logs, integration events, notification events, and timeline
   projections MUST remain distinguishable even when they refer to the same
   transition.
9. A transactionally reliable outbox MAY provide the governed atomic handoff;
   the Constitution does not mandate one database, event technology, schema,
   vendor, or transport.

## Article XIII — Notifications and Attention

1. A notification communicates existing truth; it MUST NOT create lifecycle,
   relationship, permission, or business truth.
2. Attention determines priority. Notification determines whether and how a
   communication is delivered. Neither term substitutes for the other.
3. Canonical unread or read state, when represented, MUST have an identifiable
   owner, persistence contract, participant scope, and reconciliation rule.
4. Badge counts MUST define what is counted, for whom, over what scope, and from
   which canonical source.
5. Repeated polling, hydration, or delivery MUST NOT create duplicate
   notifications or inflate attention.
6. Notification destinations MUST be allowlisted, minimally encoded, and
   reauthorized when opened.
7. Device registrations and delivery tokens MUST be owner-scoped, revocable,
   environment-scoped, and protected as sensitive operational data.
8. Native push, email, SMS, and provider delivery receipts are delivery
   channels or evidence; they are not canonical domain truth.
9. A delivery failure MUST NOT rewrite a successfully committed domain outcome.

## Article XIV — Timeline and History

1. Timeline explains progression within an authorized context. History
   preserves authoritative long-term evidence.
2. Timeline and History MUST consume canonical truth and MUST NOT independently
   advance or reinterpret workflow authority.
3. Timeline presentation copy, grouping, and visualization MAY change without
   changing lifecycle meaning.
4. History MUST NOT depend solely on mutable frontend state, transient caches,
   or display records.
5. Historical corrections MUST preserve provenance and the fact of correction
   when the domain requires audit continuity.
6. Messages, events, lifecycle transitions, audit entries, and historical
   records MUST NOT be conflated without an explicit model defining their
   relationships.
7. Repeated projections of one fact MUST preserve one semantic occurrence.

## Article XV — AI Authority and Trust Evaluation

1. AI output is advisory unless an independently authorized persistence command
   accepts it.
2. AI recommendations, drafts, classifications, inferences, and plans MUST
   identify their evidence, scope, confidence, and material uncertainty.
3. AI Trust Evaluation is a governed process or capability that evaluates
   whether AI-derived conclusions have sufficient evidence, consistency,
   authority, freshness, and confidence for the proposed use. It MUST NOT grant
   domain permission or execute a recommendation.
4. Conflicting engines, providers, or evidence sources MUST NOT be silently
   reconciled. The governing authority and unresolved contradiction MUST remain
   visible to the decision process.
5. Provider fluency, provider confidence, and prior generated output are not
   canonical evidence.
6. Human approval is required where constitutional, legal, privacy, or workflow
   rules require it. Prior conversation or a recommendation is not approval.
7. Provider output MUST remain subordinate to Meetro authentication,
   authorization, privacy, validation, and domain authority.
8. AI-generated content becomes canonical only through an explicit authorized
   persistence path that validates current truth and records attribution.
9. AI reasoning MUST NOT perform hidden mutation.
10. A domain MAY implement AI Trust Evaluation through any compliant mechanism.
    The Platform Constitution governs the requirement and authority boundary,
    not a component name or domain-specific architecture.

## Article XVI — Certification

1. Certification is a scoped evidence-backed decision about an identified
   artifact, environment, behavior, and boundary.
2. Passing local tests is not runtime certification.
3. Static deployment evidence is not authenticated lifecycle certification.
4. Certification MUST identify the exact source revision, built artifact or
   deployment, environment, scope, evidence, exclusions, and result.
5. Baseline failures MAY be excluded only when independently reproduced,
   documented by exact identity, and shown not to invalidate the certified
   change.
6. Security, ownership, lifecycle, privacy, concurrency, and environment
   boundaries MUST be supported by evidence proportionate to their risk.
7. A valid stop condition is a governance result, not an engineering failure.
8. Unknown required facts MUST remain unknown and MUST block an unconditional
   certification decision.
9. Certification MUST be reproducible or explain why evidence cannot be
   reproduced.
10. Physical-device certification MUST be required when device-specific runtime
    behavior is materially in scope.

## Article XVII — Deployment Integrity

1. Every certifiable deployment MUST be tied to identifiable source provenance
   and an identifiable target environment.
2. Staging and production MUST remain distinct in identity, configuration,
   data, aliases, and authorization.
3. Production actions require explicit, action-specific authorization.
4. An alias MUST point to a known deployment, and alias changes MUST be governed
   independently from artifact creation.
5. Deployment health SHOULD report non-secret provenance sufficient to identify
   the running revision and environment.
6. An upload or deployment without identifiable provenance MUST NOT be used as
   final certification evidence.
7. Configuration and secret changes require separate authority and MUST NOT be
   hidden inside application deployment.
8. Deployment success proves artifact delivery, not feature correctness,
   authorization, data integrity, or user experience.
9. Rollback authority, candidate, compatibility, verification, and stop
   criteria MUST be defined before high-risk production change.
10. A production database mutation MUST NOT be inferred from application
    deployment authority.

## Article XVIII — Environment and Configuration Governance

1. Every environment variable, secret, feature flag, and service binding MUST
   have a declared purpose, scope, owner, and expected absence behavior.
2. Secrets MUST NOT be printed, committed, embedded in client artifacts, or
   exposed in user-visible diagnostics.
3. Environment changes require explicit authorization and evidence of target
   identity.
4. Staging MUST NOT silently target production services, credentials, data, or
   aliases.
5. Feature flags MUST define their authority, environment scope, default,
   failure behavior, and removal or review condition.
6. Local project or service linkage MUST NOT be changed casually or treated as
   proof of target identity.
7. Credentials MUST have an operational owner and documented issuance,
   rotation, revocation, recovery, and audit procedures.
8. Environment-specific behavior MUST fail closed when target identity is
   ambiguous.
9. Configuration names and values MUST be disclosed only to the minimum
   authorized audience needed for operation and review.

## Article XIX — Extension and Reuse

1. A reusable platform capability SHOULD be extended rather than privately
   rebuilt inside a feature when its authority and privacy model are valid for
   the new use.
2. Reuse MUST NOT weaken ownership, authorization, privacy, lifecycle, or
   failure behavior.
3. Feature-specific rules MUST remain feature-specific and MUST NOT be promoted
   into universal law without independent evidence.
4. Emergency is a reference implementation and source of evidence, not a
   universal implementation template.
5. Existing systems MUST be reused only after their authority model is shown to
   be compatible.
6. Incompatible duplicate models MUST be consolidated under explicit authority
   or kept explicitly separate with documented boundaries.
7. Shared projections MUST preserve each contributing domain's ownership and
   MUST NOT become a competing writer.
8. An extension point MUST state what may be extended, who authorizes it, and
   which invariants remain mandatory.

## Article XX — Exceptions and Constitutional Debt

1. Constitutional exceptions MUST be explicit, recorded, and approved before
   they are relied upon.
2. Every exception MUST identify the affected provision, owner, justification,
   scope, risk, evidence, certification impact, remediation plan, and expiration
   or review date.
3. An exception MUST NOT silently become precedent or broaden its own scope.
4. High-risk exceptions require review by the constitutional authority and the
   affected domain, security, privacy, or operations owners.
5. Constitutional debt is an unresolved known deviation or missing capability
   that prevents full compliance even when a temporary exception permits
   limited operation.
6. Constitutional debt MUST have an owner, severity, evidence, affected
   systems, next review, and disposition.
7. Production certification MUST disclose unresolved constitutional debt and
   applicable exceptions.
8. Expired exceptions MUST fail closed until renewed or remediated.

## Article XXI — Architectural Decisions

1. Major decisions about authority, identity, ownership, lifecycle, privacy,
   transactions, persistence, cross-feature reuse, or deployment MUST be
   recorded in an architecture decision record.
2. A decision record MUST identify its owner, context, evidence, alternatives,
   tradeoffs, constitutional analysis, affected systems, approval, and reversal
   conditions.
3. Superseded decisions MUST remain traceable and identify the decision that
   replaced them.
4. Implementation convenience alone is not sufficient constitutional
   justification.
5. Cross-feature decisions require platform-level review in addition to feature
   ownership review.
6. Emergency correction, incident response, or expedited work MUST NOT silently
   redefine platform law.
7. Documentation of a proposed architecture MUST distinguish approved law,
   current implementation, planned work, and unresolved questions.

## Article XXII — Constitutional Amendment

1. A constitutional amendment requires an explicit proposal, evidence,
   classification, challenge period, ratification decision, version, effective
   date, and affected Constitutionally Governed Subsystem review.
2. Constitutional provisions MUST NOT be changed indirectly through runtime
   implementation, incident response, documentation drift, or feature approval.
3. A clarification that preserves normative meaning MUST be distinguished from
   a substantive amendment that changes obligations or authority.
4. Ratification authority and required reviewers MUST be explicit in the
   Ratification Record before any amendment becomes effective.
5. A proposed amendment MUST identify transition and compatibility effects for
   affected Constitutionally Governed Subsystems.
6. Historical versions, challenge records, ratification evidence, and effective
   dates MUST remain available.
7. Runtime adoption of an amendment MAY require a separately authorized
   transition plan and MUST NOT begin merely because text was ratified.

## Article XXIII — Dual-Constitution Compliance

1. Every Constitutionally Governed Subsystem MUST receive two separately
   recorded decisions:
   - Does this satisfy the Meetro Constitution?
   - Does this satisfy the Meetro Platform Constitution?
2. Each gate MUST record one of PASS, FAIL, CONDITIONAL, or NOT REVIEWED using
   its own authority, evidence, reasoning, and review process.
3. The combined result is APPROVED only when both gates record PASS. If either
   gate records FAIL, the combined result is BLOCKED. If either gate records
   CONDITIONAL or NOT REVIEWED, the combined result is NOT COMPLETE.
4. Passing one Constitution MUST NOT compensate for failing the other. The
   human gate cannot authorize engineering falsehood, and the platform gate
   cannot authorize human harm.
5. Disagreement within one gate MUST be resolved only through that gate's own
   authority and process. The other gate does not adjudicate the disagreement.
6. When remediation for one gate could affect the other, the failing gate
   defines its remediation requirement, the other gate reviews the proposed
   remediation for new risk, and both decisions remain independent.
7. A deadlock MUST NOT be resolved by silent override. The permitted outcomes
   are to revise or narrow the subsystem, defer or reject it, or propose a
   constitutional amendment.
8. Feature urgency MUST NOT defeat either Constitution. A Constitutionally
   Governed Subsystem remains blocked or incomplete until both gates pass.

## Constitutional Status

This document is a revised freeze candidate. It is not frozen or ratified and
has no runtime authority. Candidate role assignments and governance values
marked PENDING RATIFICATION DECISION remain proposals. Challenge, reviewer
designation, ratification, effective date, and subsystem transition decisions
remain governed by the
[Ratification Record](RATIFICATION_RECORD.md).
