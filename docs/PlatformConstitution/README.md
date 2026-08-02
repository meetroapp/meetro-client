# Meetro Platform Constitution

**Milestone:** MC-PLATFORM-001

**Assembly status:** REVISED FREEZE CANDIDATE

**Document freeze:** NOT YET AUTHORIZED

**Ratification status:** NOT AUTHORIZED

**Runtime adoption:** NOT AUTHORIZED

**Draft version:** 0.2.0-freeze-candidate

**Assembly date:** 2026-07-31

## Purpose

This directory assembles a proposed engineering constitution for the Meetro
platform. It defines durable rules for technical truth, authority, ownership,
identity, lifecycle integrity, relationships, transactions, projections,
events, notifications, privacy, certification, deployment, and constitutional
change.

The assembly is documentation only. It does not ratify the proposed text,
change a runtime contract, grant migration or deployment authority, or declare
an existing subsystem compliant.

## The Two-Constitution Boundary

Meetro retains two independent constitutional gates:

1. **The Meetro Constitution** governs human purpose, dignity, relationships,
   fairness, transparency, trust, and stewardship.
2. **The Meetro Platform Constitution** is proposed to govern engineering
   truth, technical authority, ownership, identity, lifecycle, data, privacy,
   certification, and operational integrity.

The Platform Constitution is a peer engineering constitution. It does not
absorb, summarize, reinterpret, supersede, or weaken the Meetro Constitution.
Technical compliance cannot establish human constitutional compliance, and
human constitutional approval cannot substitute for engineering proof. Every
Constitutionally Governed Subsystem must pass both gates separately.

Existing domain constitutions, including the Meetro Intelligence
Constitution, remain subordinate within their domain. They may add stricter
rules but may not weaken either independent constitutional gate.

## Reading Order

1. [Meetro Platform Constitution](MEETRO_PLATFORM_CONSTITUTION.md)
2. [Canonical Definitions](CANONICAL_DEFINITIONS.md)
3. [Platform Invariants](PLATFORM_INVARIANTS.md)
4. [Implementation Glossary](IMPLEMENTATION_GLOSSARY.md)
5. [Governance Processes](GOVERNANCE_PROCESSES.md)
6. [Subsystem Compliance Template](SUBSYSTEM_COMPLIANCE_TEMPLATE.md)
7. [Constitutional Review Checklist](CONSTITUTIONAL_REVIEW_CHECKLIST.md)
8. [Contradiction Register](CONTRADICTION_REGISTER.md)
9. [Emergency Reference Case](EMERGENCY_REFERENCE_CASE.md)
10. [Ratification Record](RATIFICATION_RECORD.md)

## Document Map

| Document | Function | Normative status in this assembly |
| --- | --- | --- |
| `README.md` | Candidate identity, reading order, and constitutional boundary | Non-normative document-set guide |
| `MEETRO_PLATFORM_CONSTITUTION.md` | Proposed preamble and 23 engineering articles | Proposed constitutional text |
| `CANONICAL_DEFINITIONS.md` | 128 terms used by the proposed constitution | Proposed normative definitions |
| `IMPLEMENTATION_GLOSSARY.md` | 16 replaceable implementation and certification terms plus one domain note | Non-normative implementation reference |
| `PLATFORM_INVARIANTS.md` | 24 universal invariants and five derived compliance tests | Proposed normative constraints plus separately classified evidence tests |
| `GOVERNANCE_PROCESSES.md` | Decision, exception, amendment, compliance, and deployment processes | Proposed governance process |
| `SUBSYSTEM_COMPLIANCE_TEMPLATE.md` | Reusable evidence record for subsystem review | Review instrument |
| `CONSTITUTIONAL_REVIEW_CHECKLIST.md` | Independent human and engineering review gates | Review instrument |
| `CONTRADICTION_REGISTER.md` | 16 current implementation conflicts and evidence gaps | Evidence register; not constitutional text |
| `EMERGENCY_REFERENCE_CASE.md` | Emergency workflow evidence mapped to principles | Reference implementation evidence only |
| `RATIFICATION_RECORD.md` | Review state, unresolved questions, and ratification requirements | Governance record |

## Constitutional Classification Method

Material reviewed during assembly is classified as one of the following:

- **Durable principle:** technology-independent rule suitable for an article,
  definition, invariant, or governance process.
- **Normative interpretation:** clarification needed to apply a durable
  principle consistently.
- **Current evidence:** implementation, schema, test, certification, or
  operational proof that illustrates present behavior.
- **Reference implementation:** a bounded subsystem example that demonstrates
  one possible compliant realization without becoming universal law.
- **Contradiction or debt:** current behavior that conflicts with a proposed
  durable principle or lacks evidence needed to prove compliance.
- **Unresolved constitutional question:** a decision requiring constitutional
  review rather than silent authoring.
- **Feature or milestone detail:** useful product or implementation material
  that must remain outside the constitutional text.

Repository paths, endpoint names, provider names, UI labels, test totals, and
current deployment identities are evidence rather than constitutional law
unless a durable principle explicitly requires their category.

## Evidence and Adoption Boundary

The articles, definitions, invariants, and processes were assembled from
repository architecture, authority, workflow, privacy, security, media,
certification, deployment, Emergency, Intelligence, and runtime evidence. The
source set is recorded in the [Ratification Record](RATIFICATION_RECORD.md).

Current code is not presumed compliant. The [Contradiction Register](CONTRADICTION_REGISTER.md)
records known conflicts, and the [Emergency Reference Case](EMERGENCY_REFERENCE_CASE.md)
separates demonstrated strengths from remaining debt.

No subsystem may claim constitutional compliance until:

1. the proposed text is challenged and ratified by a named authority;
2. the applicable human and engineering reviews are independently completed;
3. a subsystem compliance record contains exact evidence;
4. any exception is explicit, bounded, owned, and time-limited; and
5. runtime adoption is separately authorized, implemented, and certified.

## Current Decision

This revised assembly is a freeze candidate, not a frozen or ratified
constitution. A separate read-only review must authorize the document freeze.
Ratification, runtime remediation, adoption, migration, deployment, and
production certification remain unauthorized.
