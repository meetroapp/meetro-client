# Implementation Glossary

**Classification:** NON-NORMATIVE IMPLEMENTATION STANDARD

**Constitutional status:** REVISED FREEZE CANDIDATE

**Document freeze:** NOT YET AUTHORIZED

**Ratification:** NOT AUTHORIZED

**Runtime adoption:** NOT AUTHORIZED

These terms help implementation, certification, and operational records apply
the Platform Constitution. They are not constitutional law, may evolve without
constitutional amendment, and must not contradict the Constitution or acquire
authority through use.

1. **Alias** — A mutable human- or machine-friendly reference that resolves to
   an identified deployment or resource. It is not the underlying identity, and
   moving it is a separately governed operation.
2. **Badge** — A compact attention projection whose count or marker has a
   declared source, recipient, scope, freshness, and reconciliation rule.
3. **Delivery record** — Governed evidence of a delivery attempt and outcome for
   one channel and recipient. It does not establish the underlying domain fact
   or human receipt beyond its evidence.
4. **Derived stage** — A presentation category computed from canonical state
   and evidence without adding a lifecycle transition.
5. **Destination** — A route, native screen, endpoint, or external target
   referenced by a communication. Opening it requires current authorization.
6. **Environment variable** — A named configuration input supplied to a runtime
   environment. Its existence, absence, scope, and sensitivity require
   governance.
7. **Feature flag** — Governed configuration that conditionally enables or
   changes behavior with a defined owner, scope, default, failure mode, and
   removal or review condition.
8. **Integration event** — An event projected for another system under an
   explicit recipient, privacy, compatibility, and delivery contract.
9. **Local verification** — Evidence produced in a controlled local environment.
   It does not prove a deployed or authenticated runtime.
10. **Lock** — A concurrency mechanism that temporarily controls competing
    access to protected state. Its scope must align with the invariant it
    protects.
11. **Notification event** — An event indicating that a governed notification
    should be or was processed. It remains distinct from the underlying domain
    event and delivery record.
12. **Outbox** — A durable atomic-handoff pattern that records pending event or
    delivery work with canonical mutation so later processing can retry without
    losing or duplicating semantic intent.
13. **Physical-device certification** — Scoped runtime evidence produced on an
    identified physical device when device-specific behavior is material.
14. **Production certification** — Scoped evidence that an identified
    production artifact and target satisfy an authorized verification plan.
15. **Regression verification** — Evidence that identified previously accepted
    behavior remains valid after a change within a declared scope.
16. **Staging certification** — Scoped runtime evidence for an identified
    staging artifact and environment. It does not establish production truth.

## Domain Reference — Intelligence Judge

The Intelligence Judge is a Meetro Intelligence domain implementation of AI
Trust Evaluation. It is governed by the Meetro Intelligence Constitution and
related domain architecture, including MC-AI-016. It is not a mandatory
universal component and does not possess permission, persistence, or execution
authority merely because it evaluates evidence.
