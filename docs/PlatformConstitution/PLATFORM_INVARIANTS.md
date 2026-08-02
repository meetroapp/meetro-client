# Platform Invariants

**Status:** REVISED FREEZE CANDIDATE

**Document freeze:** NOT YET AUTHORIZED

**Ratification:** NOT AUTHORIZED

**Runtime adoption:** NOT AUTHORIZED

Each invariant is a universal condition that must remain true for every
applicable Constitutionally Governed Subsystem. A compliance record identifies
evidence for each applicable invariant and gives a reason for any
non-applicability classification.

1. **Single canonical owner.** Every authoritative state has one identifiable
   canonical owner.
2. **No frontend lifecycle authority.** A presentation and intent boundary
   cannot create canonical lifecycle truth.
3. **No silent AI authority.** AI cannot silently create canonical business
   truth, permission, identity, or execution.
4. **Authority-derived identity.** Authentication identity is derived by the
   approved authentication authority, never from client-declared ownership.
5. **Boundary reauthorization.** Authorization is rechecked at every
   authoritative read and mutation boundary.
6. **Reads remain reads.** A read does not create an authoritative relationship,
   conversation, event, notification, or transition unless explicitly defined
   and governed as a command.
7. **Observation is side-effect free.** Repeated observation, rendering,
   polling, or refresh does not create duplicate events, alerts, relationships,
   conversations, or notifications.
8. **Transactional mutation.** Canonical multi-record mutations are atomic
   whenever partial success would contradict domain truth.
9. **Retry safety.** Expected retries are idempotent and reconcile to one
   semantic outcome.
10. **Durable uniqueness.** Critical uniqueness is defended by durable
    constraints where the persistence authority can enforce it.
11. **Backend privacy.** Privacy is enforced by authorization and bounded
    projection, not visual hiding.
12. **Account isolation.** Canonical and cached account state does not leak
    across authenticated identities or account modes.
13. **Deep-link reauthorization.** Deep links, reloads, restored routes, and
    native destinations reauthorize their target.
14. **Notification subordination.** Notifications communicate truth but do not
    create truth.
15. **Projection-only chronology.** Timeline and History do not independently
    reinterpret or advance workflow authority.
16. **Environment isolation.** A nonproduction environment does not target
    production services, credentials, data, or aliases without an explicit,
    bounded, independently authorized governance contract.
17. **Deployment provenance.** Every deployment used for certification has
    identifiable source, artifact, target, environment, and compatible-pair
    provenance where multiple artifacts jointly provide the behavior.
18. **Authoritative time.** Canonical transition and event timestamps are
    assigned or accepted by the governing authority, not fabricated by display
    clocks.
19. **Invalid transitions fail closed.** Unsupported, stale, unauthorized, and
    contradictory lifecycle commands cannot advance state.
20. **Terminal integrity.** Terminal states do not silently reopen, regress, or
    transition through obsolete status rules.
21. **Provider subordination.** External provider output, confidence, delivery,
    or storage does not override Meetro identity, authority, privacy, or domain
    truth.
22. **Secret exclusion.** Credentials, tokens, and unnecessary private content
    do not appear in client artifacts, logs, analytics, exception payloads, or
    certification reports.
23. **Unknown remains unknown.** A required fact that has not been verified is
    not assumed, and it blocks unconditional certification when material.
24. **Projection non-escalation.** A cache, projection, local record, display
    label, or imported candidate does not acquire write authority by reuse,
    persistence, completeness, or visibility.

## Derived Compliance Tests

These are evidence tests, not additional constitutional invariants.

1. **CT-001 — Hydration evidence.** Verify that initial hydration cannot create
   a lifecycle transition.
2. **CT-002 — Evidence-type distinction.** Verify that static source, test, or
   deployment evidence is not represented as authenticated runtime
   certification.
3. **CT-003 — Production authorization evidence.** Verify that every production
   change has explicit, action-specific authorization.
4. **CT-004 — Exception-record evidence.** Verify that every exception is
   explicit, owned, justified, scoped, time-bounded, approved, and reviewable.
5. **CT-005 — Dual-gate decision evidence.** Verify that every Constitutionally
   Governed Subsystem has separate Meetro and Platform Constitution decisions
   and the combined result follows Article XXIII.

## Old-to-New Mapping

| Assembly invariant | Freeze-candidate disposition |
| --- | --- |
| 1–6 | Invariants 1–6 |
| 7 | Compliance test CT-001 |
| 8–18 | Invariants 7–17 |
| 19 | Compliance test CT-002 |
| 20 | Compliance test CT-003 |
| 21 | Compliance test CT-004 |
| 22 | Compliance test CT-005 |
| 23–25 | Invariants 18–20 |
| 26 | Relationship-domain example in the Emergency Reference Case |
| 27–30 | Invariants 21–24 |

The old relationship-specific invariant stated that relationship selection,
competing-participant resolution, required conversation identity, and request
state cannot commit as contradictory truths. Article X and Invariant 8 already
govern the universal atomicity rule; the relationship form remains a domain
compliance example rather than duplicate constitutional law.

## Verification Standard

Evidence should include, as applicable, ownership and authorization tests,
schema constraints, transaction and concurrency tests, privacy allowlists,
account isolation, direct-route behavior, deployment provenance, runtime or
device certification, and explicit contradiction or exception records.

Passing one example does not prove an invariant universally. Compliance claims
identify their exact scope, evidence, uncertainty, and limitations.
