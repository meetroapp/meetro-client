# Canonical Definitions

**Status:** REVISED FREEZE CANDIDATE

**Document freeze:** NOT YET AUTHORIZED

**Ratification:** NOT AUTHORIZED

**Runtime adoption:** NOT AUTHORIZED

These definitions govern the Platform Constitution and its companion documents.
They define engineering meaning, not the human values governed by the Meetro
Constitution.

1. **Administrative authority** — An explicit, attributable, least-privileged,
   and revocable grant to perform operations beyond an ordinary participant's
   capability. Operational access alone does not establish it.
2. **AI authority** — The bounded permission granted to an intelligence system
   to analyze, draft, classify, recommend, validate, or explain. It excludes
   canonical mutation unless a separate authorized persistence command exists.
3. **Attention** — A derived, actor-scoped set and ordering of canonical or
   explicitly uncertain facts that deserve consideration or action. Attention
   may use priority as one ordering input but is not delivery or lifecycle
   authority.
4. **Audit evidence** — Attributable records sufficient to investigate or
   verify an operation, decision, transition, or deployment. Audit evidence is
   not automatically canonical domain truth.
5. **Authentication** — The process and authority by which a principal's
   identity and session validity are established.
6. **Authenticated identity** — The current principal identity established by
   the approved authentication authority, independent of client-supplied owner,
   role, or display fields.
7. **Authoritative** — Accepted by the declared owner of a domain for the stated
   purpose after required identity, authorization, validation, persistence or
   authoritative derivation, and atomicity conditions have been satisfied.
8. **Authorization** — The decision that an authenticated principal may perform
   a specific operation on a specific resource under current canonical rules.
9. **Backend authority** — The trusted service boundary responsible for
   reestablishing identity, authorization, ownership, current state, and command
   validity before protected reads or mutations, independent of the particular
   server technology used.
10. **Cache** — A replaceable copy of data retained to reduce retrieval cost. A
    cache does not become authority and must preserve identity, freshness, and
    invalidation boundaries.
11. **Canonical** — The uniquely governed representation or fact accepted for a
    declared domain and purpose. Canonical does not mean merely persistent,
    newest, most detailed, or most visible.
12. **Canonical owner** — The identifiable authority that defines and accepts
    the canonical state or fact for a domain. Other systems may project it but
    may not compete with it.
13. **Capability grant** — An explicit, scoped, attributable, and revocable
    authorization to perform a class of operations. Possessing an identifier or
    route is not a capability grant.
14. **Certification** — A scoped and reproducible decision that evaluates
    identified evidence against stated criteria for a source revision, artifact,
    environment, behavior, and set of boundaries.
15. **Command** — An explicit request to an authority to validate and, if
    permitted, perform a state-changing operation. A command is not proof that
    the operation succeeded.
16. **Constitutional debt** — A known unresolved deviation, contradiction, or
    missing capability that prevents full constitutional compliance, whether or
    not limited operation is temporarily allowed.
17. **Constitutional exception** — The only recognized form of temporary
    deviation or claimed waiver: a time-bounded, owned, scoped, justified, and
    reviewable authorization to deviate from an identified constitutional
    provision.
18. **Constitutional law** — A durable normative engineering obligation that
    applies across technologies and subsystems and whose change requires
    constitutional amendment.
19. **Constitutional violation** — Implemented or proposed behavior that
    contradicts a constitutional MUST or MUST NOT without a valid exception.
20. **Database authority** — The approved mechanism for enforcing durable
    persistence and integrity within governed schemas and constraints. It does
    not own domain meaning, authorization, or canonical state merely because a
    value is stored.
21. **Delivery** — An attempt or completed act of conveying a notification or
    payload through a channel. Repeated delivery is governed by idempotency and
    does not create or duplicate the underlying domain fact.
22. **Deployment** — An identified built artifact installed or made available in
    an identified environment. Deployment is not certification.
23. **Deployment authority** — The explicit permission to create, promote,
    configure, roll back, or otherwise change a deployment target.
24. **Derived presentation** — User-facing or machine-facing output computed
    from canonical or explicitly uncertain evidence without acquiring authority
    to change the source truth.
25. **Environment** — A named and bounded runtime authority context that
    separates services, data, credentials, targets, and authorization
    expectations. Configuration selects behavior within that context but does
    not establish the context's identity by itself.
26. **Event** — An immutable semantic record that an identified fact was
    accepted by its governing authority. Repeated records must not duplicate one
    semantic occurrence, and a client description is not automatically an event.
27. **Evidence** — Attributable information with an identifiable source, scope,
    freshness, and limitations that may support, challenge, or qualify a fact
    or decision.
28. **External provider authority** — The limited permission assigned to a
    third-party service to deliver a capability. Provider output or storage does
    not automatically establish Meetro identity, permission, or business truth.
29. **Fail closed** — Preserve denial, uncertainty, unavailability, or the last
    confirmed safe state when required authority or evidence is absent, rather
    than granting access or fabricating success.
30. **Feature-specific rule** — A rule whose meaning and validity are confined
    to one governed subsystem or lifecycle. It is not constitutional law unless
    independently generalized and ratified.
31. **Frontend authority** — The presentation and intent boundary permitted to
    collect user intent, manage transient interaction state, issue commands, and
    present projections, independent of client framework or device technology.
    It excludes declaring unconfirmed canonical success.
32. **Governance rule** — A requirement controlling how architecture,
    exceptions, certification, deployment, and constitutional text may evolve.
33. **Historical truth** — Canonical evidence of what occurred at an earlier
    time, including provenance and later correction where required. It is not
    overwritten merely because current state changed.
34. **History** — A durable, authorized representation of accepted past facts,
    outcomes, and corrections intended for long-term evidence and continuity.
35. **Idempotency** — The property that a retry-safe repetition of the same
    governed command or delivery does not duplicate truth, relationships,
    events, or irreversible effects and reconciles to one semantic outcome.
36. **Idempotency key** — A scoped stable identifier used by an authority to
    recognize retries of one intended operation. It is not identity,
    authorization, or proof of success.
37. **Implementation standard** — A reusable, replaceable engineering method
    that satisfies constitutional law but may evolve without constitutional
    amendment.
38. **AI Trust Evaluation** — A governed process or capability that evaluates
    whether AI-derived conclusions have sufficient evidence, consistency,
    authority, freshness, and confidence for the proposed use without granting
    permission or executing action.
39. **Lifecycle** — The governed set of states, transitions, terminal
    conditions, owners, and evidence through which an authoritative entity may
    progress.
40. **Local state** — State held by one client or process for interaction,
    continuity, caching, or development. It is not platform authority unless an
    explicit authorized handoff is confirmed.
41. **Mutation** — An operation intended to change authoritative, external, or
    durable state or to produce an irreversible side effect.
42. **Notification** — A governed communication that conveys an existing fact
    or attention item to an authorized recipient. Notification issuance,
    delivery, and read evidence are distinct, and none creates the source fact.
43. **Optimistic state** — A temporary presentation of an expected result before
    authoritative confirmation. It must remain distinguishable and reversible.
44. **Owner** — The principal or authority responsible for, and permitted to
    govern, an identified state or obligation under a declared contract.
45. **Participant** — A principal granted a defined role in a relationship,
    conversation, request, project, or other shared context. Participation does
    not imply every capability.
46. **Platform invariant** — A testable condition that must remain true across
    all applicable states and transitions of the platform.
47. **Privacy boundary** — The explicit rule describing which principal may
    receive which data, for which purpose, at which lifecycle stage, and through
    which projection.
48. **Projection** — A current or historical read model or derived presentation
    produced from one or more authorities for a bounded purpose. It is
    replaceable, does not erase source history, and does not become a competing
    writer.
49. **Read operation** — An operation whose declared effect is retrieval only.
    If retrieval creates or changes authority, it is a command regardless of its
    transport method or label.
50. **Relationship** — A canonically governed reason and state connecting
    identities or businesses. Contact values, co-occurrence, visibility, or a
    duplicate record do not establish a second authoritative relationship.
51. **Session** — The bounded authenticated context within which a principal's
    identity and current authorization may be evaluated.
52. **Side effect** — A state change outside the primary domain mutation,
    including delivery, analytics, provider calls, or external publication.
53. **State** — The complete authoritative condition of an entity relevant to a
    declared domain at a point in time.
54. **Status** — A named value representing one aspect of state. A status label
    is not the whole state or lifecycle.
55. **Terminal state** — A lifecycle state that permits no further transition
    except those explicitly defined for correction, reversal, restoration, or
    archival.
56. **Timeline** — An authorized explanatory projection of progression and
    relevant events within a context. It is not lifecycle authority.
57. **Transaction** — A governed unit of work whose required mutations commit as
    one authoritative outcome or leave no accepted partial outcome.
58. **Transition** — An accepted change from one canonical lifecycle state to
    another under an authorized command and satisfied preconditions.
59. **Truth** — A fact accepted for a declared purpose by its governing
    authority with sufficient evidence and without unresolved contradiction
    beyond its stated confidence.
60. **Uncertainty** — An explicit state in which available evidence is missing,
    conflicting, stale, or insufficient for an affirmative canonical
    conclusion.
61. **User authority** — The user's power to express intent, provide data, and
    approve actions within their capabilities. It does not supersede
    authentication, authorization, lifecycle, privacy, or legal constraints.
62. **Account switching** — Replacing one authenticated principal context with
    another. It requires isolation or invalidation of the prior principal's
    protected projections and capabilities.
63. **Administrator** — A principal holding an explicit administrative
    capability grant. A role label or provider-console access is insufficient.
64. **AI confidence** — A bounded expression of an AI system's assessed support
    for an output. It is not probability, authority, permission, or truth unless
    the governing evidence contract says so.
65. **AI draft** — AI-generated proposed content that remains unaccepted and
    noncanonical until an authorized actor and persistence path accept it.
66. **AI evidence** — Attributable input or output offered to support an AI
    conclusion, together with its source, scope, freshness, and limitations.
67. **AI inference** — A conclusion derived by an AI system from evidence. It
    remains explicitly uncertain unless a governing authority validates it.
68. **AI recommendation** — An advisory proposed choice or next action produced
    by AI. It does not grant permission or perform the action.
69. **Append-only record** — A record model in which accepted prior entries are
    preserved and corrections are represented by attributable subsequent
    entries rather than silent overwrite.
70. **Architecture decision record** — A durable record of a material
    architecture decision, including context, owner, evidence, alternatives,
    constitutional analysis, approval, and supersession conditions.
71. **Atomic mutation** — A mutation whose required writes are accepted as one
    authoritative outcome or not accepted at all.
72. **Audit log** — An operational record of attributable activity intended for
    investigation and accountability. It is not automatically a domain event or
    historical truth.
73. **Bounded payload** — A purpose-specific allowlisted projection containing
    no data beyond what the authorized recipient and operation require.
74. **Canonical domain event** — An event issued under a domain's authority to
    record one accepted domain fact with deterministic identity and provenance.
75. **Canonical truth** — Truth accepted for a declared purpose by one
    canonical owner, with stable identity, sufficient evidence, and governed
    persistence or authoritative derivation.
76. **Challenge** — A recorded objection, alternative, or request for evidence
    raised during a published review period before the relevant decision closes.
77. **Command validation** — The authoritative evaluation of command input,
    identity, authorization, ownership, current state, preconditions,
    idempotency, and transaction requirements.
78. **Commit provenance** — Evidence linking a source revision to its
    repository, parent history, build input, artifact, and deployment claim.
79. **Concurrency** — The condition in which operations overlap or rely on
    state that may change before completion, requiring deterministic conflict
    handling where canonical truth is affected.
80. **Configuration** — Governed non-code runtime input that selects behavior,
    service bindings, limits, or features within an identified environment under
    a declared owner and scope. Configuration does not prove environment or
    deployment identity.
81. **Credential ownership** — Accountable responsibility for a credential's
    purpose, scope, issuance, storage, access, rotation, revocation, recovery,
    and audit.
82. **Decision owner** — The named accountable role responsible for a decision,
    its evidence, conditions, review, and supersession.
83. **Deployment identity** — The exact artifact, provider target, environment,
    service, deployment instance, and relevant alias relationship used to
    distinguish one deployment from another.
84. **Duplicate architecture** — Two or more models or implementations that
    claim overlapping authority for the same platform concern without an
    explicit compatibility or separation contract.
85. **Effective date** — The recorded point after ratification at which a
    constitutional version governs review. It does not itself deploy software.
86. **Eligible professional** — A professional whose current authoritative
    profile and domain conditions permit a bounded discovery or response
    operation. Eligibility does not establish selection or later access.
87. **Expiration** — A recorded time or condition after which a grant,
    exception, token, delivery intent, or other bounded authority is no longer
    valid without renewal.
88. **Extension point** — An explicitly governed boundary through which a
    capability may be reused or specialized while preserving its invariants.
89. **Feature-specific system** — A subsystem whose authority and rules are
     intentionally bounded to one product domain and are not universal
     platform capability.
90. **Idempotent command** — A command whose governed retries reconcile to one
     semantic canonical outcome without duplicate side effects.
91. **Logging boundary** — The rule defining which data and operations may be
     recorded in logs, at which sensitivity, retention, and access scope.
92. **Login restoration** — Reestablishing an intended destination after
     successful authentication while reauthorizing the destination under the
     new session.
93. **Native destination restoration** — Reopening a native destination from
     saved state, a deep link, or system activity while reestablishing current
     identity, authorization, and canonical context.
94. **Notification payload** — The minimal data delivered through a
     notification channel for one recipient and purpose. It is not a substitute
     for destination reauthorization.
95. **Partial write** — A subset of required mutations accepted without the
     complete authoritative outcome. It is invalid when the missing writes
     create contradiction.
96. **Participant-only data** — Data authorized only to principals holding the
     required current participant relationship and capability.
97. **Precondition** — A canonical fact that must be true immediately before
     an authorized transition or operation may be accepted.
98. **Preselection data** — The bounded information available before an
     authoritative participant or provider has been selected.
99. **Priority** — A comparison value derived from canonical or explicitly
     uncertain facts for use within an attention policy. It does not itself
     create attention, authorization, delivery, or lifecycle state.
100. **Private data** — Data whose disclosure is restricted to identified
     principals and purposes by ownership, relationship, consent, legal, or
     domain rules.
101. **Production boundary** — The explicit separation protecting production
     services, data, credentials, configuration, aliases, and users from
     nonproduction authority.
102. **Proposed amendment** — Exact constitutional text and supporting evidence
     submitted for challenge and ratification but not yet effective.
103. **Public projection** — A deliberately authorized and minimized read model
     intended for unauthenticated or broadly public recipients.
104. **Read state** — Canonical or explicitly local evidence that an authorized
     participant has acknowledged or viewed a defined item under a declared
     reconciliation contract.
105. **Remediation** — Owned work that removes or reduces a verified violation,
     exception, or debt and supplies evidence of the resulting state.
106. **Retry** — A repeated attempt to perform one intended operation after
     uncertain, delayed, or failed completion.
107. **Reversible state** — A state from which a specifically authorized and
     evidenced reversal or restoration transition is defined.
108. **Review** — An attributable evidence-based evaluation that may recommend
     or decide only within the reviewer's explicit authority.
109. **Rollback** — A governed restoration to an identified compatible
     artifact, schema, configuration, or state following authorized criteria.
110. **Selected participant** — A participant granted a later-stage capability
     through an authoritative selection outcome. A candidate or responder is
     not selected by visibility or client labeling.
111. **Sensitive operational data** — Nonpublic data such as access details,
     precise location, safety context, device tokens, infrastructure identity,
     or security metadata whose exposure can create operational harm.
112. **Secret** — Credential or key material whose disclosure can authorize,
     decrypt, sign, impersonate, or otherwise compromise protected capability.
113. **State machine** — The explicit set of lifecycle states, allowed and
     invalid transitions, actors, preconditions, terminal conditions, and
     transition evidence.
114. **Stop condition** — A predetermined boundary requiring work to halt and a
     decision or missing authority to be reported rather than bypassed.
115. **Supersession** — The explicit replacement of a decision or constitutional
     version while preserving the replaced record and the reason for change.
116. **Timeline projection** — A context-specific ordered presentation derived
     from canonical states and events without independent lifecycle authority.
117. **Token invalidation** — Revocation or expiry that causes a token to cease
     authorizing protected use according to its governing contract.
118. **Transition evidence** — Attributable proof of a transition command,
     prior state, actor, authorization, accepted outcome, time, and relevant
     idempotency or rejection result.
119. **Unread state** — The inverse or absence of read evidence within a defined
     participant, item, and reconciliation scope; it is not safely inferred
     from a device-local default when claimed as canonical.
120. **Verification** — A bounded check against stated criteria and evidence.
     Verification is not broader certification or ratification.
121. **Version** — A stable identifier for one exact constitutional or
     interface revision with preserved history and change classification.
122. **Platform capability** — A reusable governed service or contract whose
     authority and invariants are valid across more than one subsystem.
123. **Shared projection** — A bounded read model combining facts from multiple
     authorities without becoming a writer or erasing their ownership.
124. **Alternative** — A materially distinct option evaluated in an
     architecture or constitutional decision, including its authority, risk,
     compatibility, evidence, and no-change comparison.
125. **Ratification** — The recorded acceptance of exact frozen constitutional
     text after its challenge period closes and the independent Human and
     Platform Constitutional Authorities each issue the required decision. It
     does not authorize runtime adoption.
126. **Reversal** — An explicitly authorized operation that returns or corrects
     state through a governed transition without erasing historical truth.
127. **Authoritative timestamp** — Time evidence assigned or accepted by the
     governing authority for a canonical event or transition, independent of
     display formatting and untrusted client clocks.
128. **Constitutionally Governed Subsystem** — A subsystem, capability,
     workflow, service, or architectural change that creates or changes
     canonical truth, lifecycle authority, ownership, authorization, private or
     sensitive data, cross-account relationships, AI persistence authority,
     certification or deployment boundaries, reusable platform capability, or
     material production behavior.

## Revision Disposition

The 153-definition assembly baseline was partitioned as requested: 115 kept,
12 clarified, 10 merged, and 16 moved to the non-normative
[Implementation Glossary](IMPLEMENTATION_GLOSSARY.md). The candidate contains
the 127 retained or clarified constitutional definitions plus the new
Constitutionally Governed Subsystem definition, for 128 definitions total.

- **Merged:** Canonical persistence, Current projection, Duplicate delivery,
  Duplicate event, Duplicate relationship, Production configuration,
  Retry-safe operation, Staging configuration, Temporary deviation, and
  Waiver. Their distinct meanings are covered by canonical truth, projection,
  duplicate effect, relationship, configuration, retry, exception, and
  environment definitions rather than parallel entries.
- **Clarified:** Attention, Priority, Certification, Evidence, Configuration,
  Environment, Challenge, Ratification, Backend authority, Database authority,
  Frontend authority, and AI Trust Evaluation.
- **Moved:** Alias, Badge, Delivery record, Derived stage, Destination,
  Environment variable, Feature flag, Integration event, Local verification,
  Lock, Notification event, Outbox, Physical-device certification, Production
  certification, Regression verification, and Staging certification.
- **Domain mechanism generalized:** the constitutional AI concept is AI Trust
  Evaluation. Intelligence Judge remains only a non-normative domain reference.
- **Added:** Constitutionally Governed Subsystem, to normalize applicability.

## Definition Governance

- A definition change that alters a constitutional obligation is a substantive
  amendment.
- A wording clarification MAY proceed as editorial correction only when it does
  not change normative scope or authority.
- Domain contracts MAY add narrower definitions but MUST NOT contradict these
  definitions without an approved constitutional amendment or exception.
