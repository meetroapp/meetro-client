# Lead Phase 3 Workflow Compliance Characterization

## Purpose

`src/utils/leadWorkflowCharacterization.js` runs the warning-only Lead Phase 2
compliance engine across supplied representative workflow datasets.

It measures readiness without reading storage, changing records, rendering
warnings, or enforcing workflow order.

## API

```js
characterizeLeadWorkflows([
  {
    id,
    source,
    input: {
      lead,
      appointments,
      quotes,
      work,
      completions,
      history,
      appointmentRequired,
      appointmentException,
      workflowType,
    },
  },
])
```

The result includes:

```js
{
  complianceRate,
  riskDistribution,
  warningFrequency,
  stageCoverage,
  exceptionUsage,
  workflowDistribution,
  findings,
  summary,
}
```

Each finding preserves the complete warning-only compliance report so aggregate
numbers remain explainable.

## Compliance Distribution

The utility calculates:

- Overall compliant and noncompliant dataset counts
- Overall compliance percentage
- Separate standard, manual, and emergency distribution
- Compliance rate within each workflow kind
- LOW, MEDIUM, and HIGH risk counts and percentages

An empty dataset returns zero rates. It is not treated as evidence of
compliance.

This phase does not include live application data or storage-backed fixtures,
so it does not claim a production compliance percentage. It establishes the
pure measurement contract required to calculate one later.

## Stage Coverage

Coverage is calculated independently for:

- Lead
- Contact
- Information
- Appointment
- Quote
- Decision
- Work
- Completion
- History

Each stage reports:

- `evidencedCount`
- `missingCount`
- `applicableCount`
- `coveragePercentage`

Emergency records are excluded from standard appointment applicability.
Their other explicit workflow evidence remains measurable.

Stage coverage does not infer missing earlier stages from later evidence. A
quote does not prove information gathering, and work does not prove quote
acceptance.

## Warning Categories

Warnings are aggregated by:

- Warning code
- Count
- Risk-level distribution
- Workflow-stage distribution

Expected high-value warning groups include:

- Missing lead identity
- Missing customer contact
- Quote before information
- Missing or incomplete required appointment
- Missing visit outcome
- Unapproved appointment exception
- Work before quote or decision
- Completion without work
- History without completion
- Timestamp order conflicts

Frequency output is sorted by descending count and then warning code for
deterministic reports.

## Exception Usage

The report separates:

- Appointment-policy applicable records
- Appointment-required records
- Exception requested
- Exception approved
- Exception invalid or incomplete
- Emergency records excluded from standard appointment policy
- Approved reasons and their frequency

Approved appointment exceptions are preserved exactly as supplied. The
characterizer does not create, normalize into approval, or recommend an
exception.

Emergency exclusion is not an appointment exception. It is a separate
workflow classification.

## Representative Workflow Findings

Current repository shapes indicate the following likely characterization:

### Standard Leads

- Identity is inconsistent across posts, quote requests, homeowner requests,
  schedules, and quotes.
- Customer contact and information completion are rarely recorded as explicit
  workflow evidence.
- Completed Work Center appointments can carry a visit outcome.
- QuoteBuilder does not require completed appointment evidence.
- Work can begin directly from `start_work_immediately`.

### Manual Workflows

- Manual schedules often lack project identity.
- External quotes can be created without an authenticated conversation.
- Appointment and decision exceptions need separate evidence and authority.

### Emergency Workflows

- Emergency records must remain separate from the standard appointment gate.
- Emergency exclusion must not hide missing quote, decision, work, or
  completion evidence when those stages are claimed.
- Emergency lifecycle authority remains local and fragmented.

These are architecture findings, not measured production rates.

## Readiness Matrix

| Category | Status | Notes |
| --- | --- | --- |
| Workflow Coverage | PARTIAL | Standard, manual, and emergency segments are supported; representative source adapters are not yet built. |
| Stage Coverage | READY | Explicit evidence and missing stages aggregate deterministically. |
| Exception Handling | PARTIAL | Approved, invalid, and emergency-excluded usage is measurable; valid exception policy is not approved. |
| Risk Reporting | READY | Warning and LOW/MEDIUM/HIGH distributions are deterministic and explainable. |
| Readiness | BLOCKED | No live/source characterization, canonical identity, information event, or approved exception policy exists. |

## Readiness Implications

The characterization layer is ready for fixture-based architecture analysis.
It is not ready for:

- Runtime warning display
- Quote gating
- Workflow enforcement
- Dashboard compliance metrics
- Lead ownership adoption

Aggregate compliance can be misleading when source adapters omit evidence.
Every later dataset must declare its source and preserve missing evidence
rather than manufacturing earlier stages.

## Remaining Workflow Gaps

1. No canonical lead/project identity shared by lead, appointment, quote, and
   work records.
2. No authoritative customer-contact event.
3. No authoritative information-complete event.
4. Appointment requirement is not consistently stored.
5. Valid appointment exception types and approvers are not approved.
6. Appointment completion and visit outcome are not available on every path.
7. Quote decisions are duplicated across several sources.
8. `start_work_immediately` can bypass quote decision.
9. Emergency and manual workflow evidence require dedicated source adapters.
10. No sanitized representative dataset suite covers current source shapes.

## Recommendation for Lead Phase 4

Lead Phase 4 should be **Representative Source Adapter and Fixture Coverage**,
not runtime adoption.

Scope:

1. Create pure adapters for representative:
   - `/posts`
   - `/contractor-quote-requests`
   - `homeownerRequests`
   - Work Center schedules and visit outcomes
   - Quote history and embedded quote decisions
   - Active-work snapshots
   - Emergency workflow records
2. Join evidence only through explicit shared identity.
3. Keep unmatched source records visible as separate findings.
4. Run the characterization utility over sanitized fixtures.
5. Report evidence coverage and warning frequency by source.
6. Preserve standard, manual, and emergency segmentation.

Lead Phase 4 must not:

- Read live browser storage
- Import into runtime pages
- Display warnings
- Block quotes or work
- Change statuses or transitions
- Select exception or workflow authority

## Decision

Lead Phase 3 is complete as a pure characterization contract.

Risk and stage aggregation are ready. Overall workflow compliance remains
`BLOCKED` for adoption until representative source coverage, identity, and
exception policy are resolved.
