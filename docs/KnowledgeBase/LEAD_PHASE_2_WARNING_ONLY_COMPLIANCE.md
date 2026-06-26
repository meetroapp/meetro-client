# Lead Phase 2 Warning-Only Workflow Compliance

## Purpose

`src/utils/leadWorkflowCompliance.js` provides pure, deterministic compliance
reporting for current lead records. It does not read storage, write data,
change statuses, block quotes, or enforce workflow behavior.

The approved standard lead sequence is:

```text
Lead
Contact Customer
Gather Information
Appointment, when required
Quote
Decision
Work
Completion
History
```

The utility reports missing or out-of-order evidence while preserving current
application behavior.

## API

```js
evaluateLeadWorkflowCompliance({
  lead,
  appointments,
  quotes,
  work,
  completions,
  history,
  appointmentRequired,
  appointmentException,
  workflowType,
})
```

It returns:

```js
{
  compliant,
  warnings,
  workflowStage,
  missingStages,
  riskLevel,
  evidence,
  appointmentPolicy,
}
```

The required response fields requested for this phase are present. Additional
evidence and appointment-policy fields make warning results auditable.

## Compliance Rules

1. A safe lead requires explicit project or request identity.
2. Customer contact is not inferred from a later quote or work record.
3. Information gathering is not inferred from a quote.
4. A scheduled appointment is not a completed appointment.
5. When an appointment is explicitly required, a quote needs either:
   - A completed appointment with a recorded outcome, or
   - A fully approved exception.
6. Work requires quote evidence and a recorded quote decision.
7. Completion requires work evidence.
8. History requires completion evidence.
9. Available timestamps must respect workflow order.
10. Missing evidence creates warnings only; it never changes eligibility.

The utility deliberately does not infer workflow evidence from titles,
customer names, locations, or generic source IDs.

## Exception Handling

Appointment exceptions are accepted for characterization only when all three
fields exist:

```js
{
  approved: true,
  reason: "...",
  approvedBy | approvedByRole | authority: "..."
}
```

An incomplete exception produces
`appointment-exception-unapproved`.

This is not an approved production policy. It is a warning-only evidence
contract that makes missing approval visible.

Emergency workflows are marked outside the standard appointment policy.
Standard appointment warnings are not applied to records explicitly identified
as emergency. Emergency workflows retain their separate lifecycle and are not
declared compliant with the standard workflow by this exclusion.

## Appointment Exception Policy Findings

The repository does not yet contain a human-approved exception taxonomy.

Current workflow evidence shows possible exception-like paths:

- Remote estimate
- Start work immediately after a visit outcome
- Emergency dispatch
- Manual scheduling

These paths must not be treated as equivalent:

- Emergency is outside the standard appointment gate.
- A completed visit with `quote_required` is normal workflow evidence.
- `start_work_immediately` bypasses quote decision and remains high risk unless
  a separate approved authority exists.
- Remote or no-visit estimates require explicit reason and approval.
- Manual customer decisions require evidence and actor provenance.

William must approve valid standard appointment-before-quote exceptions before
any enforcement phase.

## Warning Categories

| Category | Warning examples | Risk |
| --- | --- | --- |
| Identity | `missing-lead-identity` | HIGH |
| Contact | `missing-customer-contact` | MEDIUM |
| Information | `missing-information`, `quote-before-information` | MEDIUM |
| Appointment | `appointment-required-missing`, `appointment-not-completed` | HIGH |
| Appointment evidence | `appointment-outcome-missing`, `appointment-exception-unapproved` | MEDIUM |
| Quote decision | `work-before-quote`, `work-before-quote-decision` | HIGH |
| Work and completion | `completion-without-work` | HIGH |
| History | `history-without-completion` | HIGH |
| Ordering | `stage-timestamp-conflict` | MEDIUM |

Warnings are sorted by workflow stage and code for deterministic reports.

## Current Compliance Risks

The audit confirms the following architecture risks:

- `QuoteBuilder` can create or send a quote without checking information or a
  completed appointment.
- Work Center supports a completed visit outcome, but schedule records do not
  consistently share safe lead/project identity.
- A scheduled appointment can be mistaken for appointment evidence by callers
  unless completion is checked explicitly.
- Visit outcomes can start work immediately without a quote decision.
- Lead records can be considered closed from accepted quote copies while
  source statuses still disagree.
- Dashboard and Leads set navigation intent but do not provide authoritative
  workflow evidence.
- Emergency, manual, and standard workflows require different exception rules.

## Readiness Implications

| Area | Status | Reason |
| --- | --- | --- |
| Pure compliance reporting | READY | Deterministic and tested with no writes. |
| Identity evidence | PARTIAL | Explicit request IDs exist on some records but are not shared across every source. |
| Information evidence | BLOCKED | Current writers do not consistently record a canonical information-complete event. |
| Appointment evidence | PARTIAL | Completed status and visit outcome exist in some Work Center records. |
| Exception policy | BLOCKED | Valid exception types and approval authority are not approved. |
| Quote-decision evidence | PARTIAL | Quote copies contain statuses, but authority is fragmented. |
| Runtime warning adoption | BLOCKED | Real-source adapters and bilingual product language are not approved. |
| Workflow enforcement | BLOCKED | Identity, exception, and authority prerequisites remain unresolved. |

## Tests

`tests/leadWorkflowCompliance.test.js` covers:

- Fully evidenced standard workflow
- Quote before information
- Missing required appointment
- Scheduled appointment not treated as completed
- Missing visit outcome
- Approved appointment exception
- Incomplete exception approval
- Emergency exclusion
- Work before quote decision
- Completion without work
- History without completion
- Missing contact and identity
- Deterministic no-mutation behavior

## Recommendation for Lead Phase 3

Do not proceed directly to lead ownership adoption or workflow enforcement.

The next safe phase should be **Lead Phase 2B: Representative Source Evidence
Mapping and Compliance Coverage**.

Scope:

1. Create pure adapters for representative `/posts`,
   `/contractor-quote-requests`, `homeownerRequests`, schedule, quote, and
   active-work shapes.
2. Feed only explicit evidence into `evaluateLeadWorkflowCompliance()`.
3. Report warning coverage by source and identity quality.
4. Measure how often information, completed appointment, visit outcome, quote
   decision, and work evidence are unavailable.
5. Keep standard, emergency, and manual-customer records separate.
6. Do not render warnings or block workflow actions.

Lead Phase 3 should remain blocked until:

- Canonical lead/project identity is shared across required sources.
- Information-complete evidence is defined.
- Appointment exception policy is approved.
- Quote decision authority is identified.
- Warning copy is reviewed through `language.js`.

## Decision

Lead Phase 2 is complete as a warning-only architecture contract.

It can identify workflow violations without changing user-visible behavior.
It is not an enforcement policy and must not be imported into runtime pages
until representative source coverage and product exceptions are approved.
