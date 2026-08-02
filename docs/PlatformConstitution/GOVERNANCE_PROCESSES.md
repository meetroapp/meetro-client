# Governance Processes

**Status:** REVISED FREEZE CANDIDATE

**Document freeze:** NOT YET AUTHORIZED

**Ratification:** NOT AUTHORIZED

**Runtime adoption:** NOT AUTHORIZED

## Candidate Governance Model

The appointments, periods, thresholds, and exception limits in this section are
**PENDING RATIFICATION DECISION**. They are complete enough to challenge and
freeze as a candidate, but they have no current governance or runtime force.

### Independent Constitutional Authorities

- **Initial Human Constitutional Authority:** the Meetro Founder, acting only
  under the Meetro Constitution.
- **Initial Platform Constitutional Authority:** the Platform Constitutional
  Steward, acting only under the Platform Constitution and subject to the
  ratification, evidence, challenge, and recusal requirements below.

Ratification requires a separately recorded decision from each authority. If
one person initially holds both roles, that person must still create two
separate records with separate evidence and reasoning. Neither record may
substitute for the other, and conflict must remain visible.

### Platform Constitutional Steward

The Steward is the administrative and custodial role for the Platform
Constitution. The Steward may:

- administer review and challenge;
- preserve constitutional records and evidence custody;
- verify process completion;
- maintain versions and reviewed hashes;
- record decisions without merging the two constitutional gates;
- identify unresolved violations; and
- initiate review when an amendment, exception, conflict, or material drift
  requires it.

The Steward does not automatically possess authority to override either
Constitution, ratify both gates, waive requirements indefinitely, authorize
runtime work, or decide a conflict from which the Steward has not recused.

### Appointment, Succession, and Removal

1. The Meetro Founder appoints the initial Platform Constitutional Steward
   through a recorded constitutional decision.
2. A Steward may resign through a dated record that identifies the transfer of
   custody and effective vacancy date.
3. Incapacity or a temporary vacancy must be recorded by the Human
   Constitutional Authority and Platform Engineering Steward. They may appoint
   an interim custodian whose powers are limited to record preservation,
   scheduling review, and urgent evidence protection.
4. A successor is appointed through a recorded decision by the Human
   Constitutional Authority after an open Platform review and recommendation
   from the Platform Engineering Steward.
5. Removal requires stated cause or governance rationale, an attributable
   decision, a record-transfer plan, and a successor or limited interim
   appointment.
6. No undocumented hereditary, automatic, repository-derived, provider-derived,
   or operational authority is recognized.

### Mandatory Recusal

A Steward, authority, reviewer, or decision owner must recuse when personally
responsible for the disputed exception or violation, reviewing their own work
where independent review is required, materially conflicted, subject to an
undisclosed financial or operational conflict, or deciding an appointment or
removal affecting themselves. The recusal and replacement reviewer must be
recorded.

### Supporting Roles

- **Platform Engineering Steward:** reviews engineering integrity,
  cross-subsystem authority, and evidence sufficiency.
- **Domain Steward:** owns the affected domain and its remediation obligations.
- **Security and Privacy Steward:** reviews identity, authorization, privacy,
  credentials, secrets, and sensitive data.
- **Release Steward:** owns release sequencing, environment identity,
  deployment evidence, rollback readiness, and operational closure.

One person may hold multiple supporting roles only when each decision remains
separate and no mandatory recusal applies.

## Shared Review Rules

### Freeze-Candidate Challenge Period

The candidate minimum challenge period is **7 calendar days**, PENDING
RATIFICATION DECISION. It begins only after the exact candidate documents,
hash, reviewers, authorities, objection channel, and closing time are published.
It may be extended for unresolved blockers. It may not be shortened except to
contain a documented constitutional emergency, and any shortening requires
retrospective review.

### Ratification Threshold

Ratification requires all of the following:

- no unresolved constitutional blocker;
- separately recorded human and platform gate decisions;
- named, non-conflicted authorities and reviewers;
- a completed review record;
- all objections closed or formally dispositioned; and
- the exact final frozen filename-and-content hash.

### Appeal

An attributable reviewer, steward, or materially affected domain owner may
appeal process failure, undisclosed conflict, missing material evidence,
inconsistent application, or an unauthorized exception. An appeal must identify
the record and requested correction; it cannot merely restate a rejected
preference. The authority for the affected gate assigns a non-conflicted appeal
reviewer. An appeal does not grant implementation or runtime authority.

### Evidence Custody

- Canonical public documents live in a version-controlled repository.
- Reviewed filename-and-content hashes are preserved in the Ratification
  Record.
- Decisions and objections are immutable or append-only after closure.
- Superseded versions remain available with their replacement record.
- Certification evidence is linked by milestone, repository, commit, artifact,
  deployment, and environment as applicable.
- Private evidence is retained in a governed restricted location and is cited
  without copying private content into public constitutional records.
- Every record identifies custodian, access boundary, retention rule, and
  supersession status.

## 1. Architectural Decision Process

### Trigger and Requestor

A Domain, Platform Engineering, Security/Privacy, or Release Steward may open an
architecture decision when work changes or establishes canonical ownership,
identity, lifecycle, authorization, privacy, transactions, persistence, events,
shared capability, duplicate architecture, environment, migration, rollback,
AI execution, provider authority, or constitutional interpretation.

### Required Process

1. Assign an identifier, requestor, decision owner, status, affected systems,
   reviewers, and review deadline.
2. State current truth, problem, known contradiction, and material unknowns.
3. Collect source, schema, test, runtime, security, privacy, certification,
   deployment, and prior-decision evidence proportional to risk.
4. Compare bounded alternatives, including no change, with authority,
   compatibility, rollback, and dual-Constitution effects.
5. Record the human and platform constitutional analyses independently.
6. Publish material cross-platform decisions for attributable challenge.
7. Require Domain and Platform Engineering approval; require Security/Privacy
   or Release approval when their boundaries are affected.
8. Resolve objections or preserve dissent and escalation in the record.
9. Hand implementation to a separately authorized milestone.
10. Link adoption and certification evidence if implementation later occurs.
11. Supersede explicitly and preserve the prior decision.

Appeals follow the Shared Review Rules. A decision may be reversed or narrowed
through a new attributable decision; history is not erased.

## 2. Constitutional Exception Process

### Request and Record

A Domain, Platform Engineering, Security/Privacy, or Release Steward may request
an exception. The record must include requestor, owner, affected provision,
exact scope, evidence, justification, current and residual risk, dual-gate
effects, compensating controls, remediation milestone, effective date,
expiration, rollback condition, certification impact, and required reviewers.

### Candidate Severity and Maximum Periods

The following limits are PENDING RATIFICATION DECISION:

| Level | Meaning | Maximum period | Required approval |
| --- | --- | ---: | --- |
| 1 | Low-risk temporary deviation | 90 days | Domain and Platform Engineering Stewards |
| 2 | Material constitutional deviation | 30 days | Platform Constitutional Authority plus affected Domain and Security/Privacy or Release Steward |
| 3 | High-risk or production constitutional violation | 7 days | Separate Human and Platform Constitutional Authorities plus Security/Privacy and Release Stewards |
| 4 | Emergency constitutional suspension | Shortest operationally necessary period; review within 24 hours | Designated non-conflicted emergency authority, followed by both constitutional authorities |

Exceptions do not renew automatically. Renewal requires current evidence,
residual-risk review, new expiration, remediation status, and the same or higher
approval threshold. Expiration without approved renewal causes the affected
capability to fail closed.

### Emergency Authority

Emergency action may suspend ordinary process only to prevent imminent harm,
contain a security incident, stop data exposure, disable a dangerous production
capability, or preserve canonical evidence. It may not ratify, permanently
amend, erase evidence, expand product scope, or bypass retrospective review.

Certification must disclose active exceptions. Closure records remediation,
residual debt, or a ratified superseding decision. Appeals and recusals follow
the Shared Review Rules.

## 3. Constitutional Amendment Process

1. A proposal identifies exact text, author, purpose, evidence, affected
   articles, definitions, invariants, Constitutionally Governed Subsystems, and
   transition effects.
2. Classify it as editorial clarification or substantive amendment. Any change
   to authority, obligation, permission, scope, or exception is substantive.
3. Confirm it does not absorb the Meetro Constitution or promote
   feature-specific implementation into universal law.
4. Freeze and hash the candidate; name authorities, reviewers, recusals,
   objection channel, and evidence custody.
5. Complete at least the candidate 7-calendar-day challenge period unless a
   governed emergency shortening applies.
6. Record every objection as resolved, accepted, rejected with reasoning,
   deferred, or blocking.
7. Require separate Human and Platform Constitutional Authority decisions and
   the Ratification Threshold.
8. Record version, effective date, superseded record, evidence location, and
   affected-subsystem impact.
9. Preserve the prior version and every challenge, appeal, and decision record.
10. Hand runtime transition to separately authorized adoption milestones.

## 4. Constitutionally Governed Subsystem Compliance Process

1. Confirm the work meets the Constitutionally Governed Subsystem definition;
   minor work still complies but need not invoke the full record unless a
   constitutional boundary changes.
2. Identify canonical, lifecycle, data, authorization, privacy, transaction,
   event, notification, certification, and deployment owners.
3. Perform the Meetro Constitution gate and record PASS, FAIL, CONDITIONAL, or
   NOT REVIEWED.
4. Perform the Platform Constitution gate and record PASS, FAIL, CONDITIONAL,
   or NOT REVIEWED.
5. Review source, schema, migration, route, test, runtime, configuration,
   exception, and contradiction evidence.
6. Classify each applicable article and compliance test as satisfied,
   noncompliant, excepted, debt, not applicable with reason, or unknown.
7. Combine results only under Article XXIII: both PASS is APPROVED; either FAIL
   is BLOCKED; any CONDITIONAL or NOT REVIEWED is NOT COMPLETE.
8. Resolve disagreement within its own gate. For cross-gate remediation, the
   failing gate defines the requirement and the other gate reviews new risk.
9. Preserve deadlock without override; revise, narrow, defer, reject, or propose
   an amendment.
10. Certify an exact artifact, environment, scope, evidence, exclusions, stop
    conditions, and both gate results.

Appeals, recusals, evidence custody, and supersession follow the Shared Review
Rules.

## 5. Deployment Authorization Process

Deployment proceeds through separately recorded gates:

1. **Commit approval:** the Domain and Platform Engineering Stewards verify the
   reviewed diff, repository state, tests, provenance, exceptions, and debt.
2. **Push approval:** the Release Steward authorizes the exact repository,
   branch, commit, and remote action.
3. **Staging approval:** the Release Steward names project, environment,
   service, artifact, aliases, configuration boundary, migration boundary, and
   rollback candidate.
4. **Staging certification:** designated reviewers verify the deployed commit,
   health, authority, lifecycle, privacy, regression, device, and recovery scope.
5. **Production-readiness review:** the Release, Platform Engineering, and
   affected Security/Privacy and Domain Stewards verify candidate identity,
   schema prerequisites, configuration scopes, artifact-pair compatibility,
   rollback, and unresolved debt.
6. **Production approval:** the explicitly named Production Authority records
   action-specific approval for each artifact, migration, alias, configuration,
   authenticated verification, and monitoring action. Appointment of that
   authority remains environment governance, not a constitutional appointment.
7. **Production execution:** operators stop on target ambiguity, drift,
   unexpected files, schema mismatch, failed health, missing provenance, or
   unauthorized scope.
8. **Production certification:** controlled authenticated evidence is collected
   only when separately authorized.
9. **Rollback:** the Release Steward records the decision owner, exact candidate,
   compatibility, execution authority, and verification checks before high-risk
   change.
10. **Closure:** preserve deployment IDs, commits, artifact pairs, schema state,
    evidence, incidents, exceptions, monitoring window, final decision,
    effective date, and superseded record.

Approval at one gate does not authorize a later gate. Deployment does not
authorize database mutation, configuration change, authenticated testing,
alias movement, or runtime adoption unless explicitly included. Appeals and
recusals follow the Shared Review Rules.
