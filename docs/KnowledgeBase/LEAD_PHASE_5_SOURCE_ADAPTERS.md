# Lead Phase 5 Representative Source Adapters

## Purpose

`src/utils/leadWorkflowSourceAdapter.js` converts representative Meetro lead
and workflow records into the input contract used by
`evaluateLeadWorkflowCompliance()`.

The adapter is pure and fixture-oriented. It does not read browser storage,
join live records, change statuses, write workflow evidence, display warnings,
or enforce transitions.

## API

```js
adaptLeadWorkflowSource({
  source,
  record,
  context,
})
```

Supported source names:

```js
LEAD_WORKFLOW_SOURCE_TYPES.BUSINESS_LEADS
LEAD_WORKFLOW_SOURCE_TYPES.CONTRACTOR_DASHBOARD
LEAD_WORKFLOW_SOURCE_TYPES.SCHEDULING
LEAD_WORKFLOW_SOURCE_TYPES.QUOTES
LEAD_WORKFLOW_SOURCE_TYPES.EMERGENCY
LEAD_WORKFLOW_SOURCE_TYPES.LEGACY
```

The result is directly usable as a characterization dataset:

```js
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
  },
  provenance: {
    source,
    sourceRecordId,
    projectId,
    requestId,
    postId,
    identityFields,
    warnings,
    sourceRecord,
  },
}
```

`adaptLeadWorkflowSources(entries)` applies the same contract to a fixture
collection.

## Source Coverage Matrix

| Source | Coverage | Status |
| --- | --- | --- |
| BusinessLeads | Backend/converted post fields, explicit `projectId`, `requestId`, `quoteRequestId`, or `postId`, contact/information flags, embedded workflow evidence | PARTIAL |
| ContractorDashboard | Selected Work Center request, embedded schedule, quotes, active work, completion/history context, appointment policy and exceptions | PARTIAL |
| Scheduling | Manual and linked schedule rows, completed status, completion timestamp, visit outcome, contextual lead/quote evidence | PARTIAL |
| Quotes | Quote Builder and Work Center quote fields, request identity, lifecycle status/timestamps, contextual lead and appointment evidence | PARTIAL |
| Emergency | Emergency request identity, conversation provenance, emergency classification, active/completed/history status evidence | READY |
| Legacy | Generic compatibility fields remain visible with explicit warnings and no title/name joining | BLOCKED |

`READY` means the representative emergency record shape can be normalized
without applying the standard appointment policy. It does not mean emergency
workflow authority or enforcement is ready.

## Adapter Rules

1. Only explicit project, request, quote-request, or post identity is supplied
   to the compliance engine.
2. Generic `id` is retained in provenance but is not promoted for standard
   lead identity.
3. Emergency `id` may be treated as its request identity only inside the
   explicitly selected emergency adapter.
4. Titles, descriptions, customer names, locations, and display timestamps
   never join records or manufacture identity.
5. Scheduled appointments remain scheduled; only completed status or explicit
   completion timestamps count as completion evidence.
6. Missing visit outcomes remain missing and produce source warnings.
7. Quote lifecycle records remain quote evidence. The adapter does not grant
   work authority from quote status alone.
8. Emergency records are separated from standard appointment applicability.
9. Appointment exceptions are cloned and preserved exactly as supplied.
10. Unsupported sources use the legacy adapter and remain visibly warned.

## Provenance Coverage

Every adapted fixture preserves:

- adapter source;
- source-local record ID;
- explicit project, request, and post identity fields;
- the identity fields that were available;
- adapter warnings;
- a deep copy of the original source record.

The preserved source record is diagnostic evidence only. It is not a canonical
lead object and must not be written back to storage.

### Provenance Warnings

| Warning | Meaning |
| --- | --- |
| `missing-explicit-source-identity` | No safe project/request/post identity was supplied. |
| `generic-id-preserved-not-promoted` | A source-local ID exists but is unsafe as cross-source identity. |
| `completed-appointment-outcome-unavailable` | A completed schedule lacks an explicit visit result. |
| `quote-lifecycle-identity-unavailable` | A later quote status cannot be connected safely to a project. |
| `legacy-shape-requires-source-review` | Generic compatibility mapping was used. |
| `unsupported-source-treated-as-legacy` | The supplied source has no registered adapter. |
| `invalid-source-record` | The supplied fixture was not a record object. |

## Fixture Coverage

`tests/leadWorkflowSourceAdapter.test.js` contains eight focused fixtures:

1. BusinessLeads converted post with a generic source ID.
2. ContractorDashboard selected request with appointment, quote, and work
   evidence.
3. Completed schedule missing a visit outcome.
4. Quote lifecycle record with decision evidence.
5. Quote path preserving an approved appointment exception.
6. Emergency work separated from standard appointment policy.
7. Unknown legacy source preserving missing-stage findings.
8. Deterministic output and deep no-mutation guarantees.

The fixtures prove shape compatibility. They are not production samples and do
not establish a production compliance rate.

## Coverage Findings

### BusinessLeads

The current converted post shape primarily carries `id`, title, description,
category, customer fields, and display metadata. The generic `id` is not proven
to be the same request identity used by homeowner requests, schedules, or
quotes. Such a record is adaptable but correctly reports missing canonical
lead identity.

### ContractorDashboard

The selected Work Center request can carry request identity and embedded
schedule, quote, or active-work evidence. Coverage depends on the selected
record retaining explicit IDs. Work Center remains a projection consumer; the
adapter does not make it lead or workflow authority.

### Scheduling

Schedule rows provide appointment type, status, timestamps, and sometimes a
visit outcome. Manually created rows commonly have only a schedule ID. Context
can supply a lead, but the adapter never joins that context by title.

### Quotes

Quote records provide quote IDs, request IDs in some paths, lifecycle status,
and timestamps. Decision status remains duplicated across quote arrays and
homeowner requests. A quote ID alone is not project identity.

### Emergency

Emergency records have a specialized request and conversation lifecycle. The
adapter explicitly classifies them as emergency and excludes them from the
standard appointment gate. Other missing stages are still reported when later
evidence is claimed.

### Legacy

Legacy snapshots can be evaluated only through fields already understood by
the compliance engine. Unknown fields remain in provenance. The adapter does
not guess from display text or silently declare the shape covered.

## Uncovered Lead Sources

The following remain uncovered or only indirectly represented:

- live backend response variations beyond the currently referenced post and
  quote-request fields;
- records assembled through title fallback in `BusinessLeads`;
- global active-work key groups that are not supplied as one record;
- conversation-only workflow cards without project/request linkage;
- manual customers whose contact, information, and decision evidence occurred
  offline;
- external quote decisions without authenticated actor provenance;
- emergency registry and conversation copies that disagree with the active
  emergency record;
- completion/history copies that cannot be joined to the originating lead.

These sources require sanitized fixtures or authoritative identity before they
can contribute to compliance rates.

## Remaining Blockers

1. No canonical identity spans backend leads, homeowner requests, schedules,
   quotes, work, completion, and history.
2. Source adapters normalize supplied records but do not safely reconcile
   separate records into one project.
3. Contact and Information stages still lack authoritative events.
4. Appointment-required policy is missing on many records.
5. Valid appointment exception types and approvers remain unapproved.
6. Quote-decision authority remains fragmented.
7. Manual customer and offline evidence lacks a formal provenance contract.
8. Emergency source copies can disagree.
9. Fixture coverage does not measure production prevalence or false-positive
   rates.
10. Runtime warning copy and placement remain unapproved.

## Readiness Implications

| Category | Status | Notes |
| --- | --- | --- |
| Representative shape normalization | READY | All six requested categories have pure adapters and fixtures. |
| Provenance preservation | READY | Source records, IDs, fields, and warnings are retained without mutation. |
| Cross-source reconciliation | BLOCKED | Adapters deliberately do not join records without explicit shared identity. |
| Compliance characterization | PARTIAL | Safe for sanitized fixture sets, not production claims. |
| Runtime warning adoption | BLOCKED | Source completeness and policy authority remain unresolved. |
| Workflow enforcement | BLOCKED | No transition or exception authority has been established. |

## Recommendation for Lead Phase 6

Lead Phase 6 should be **Cross-Source Fixture Reconciliation and Evidence
Coverage Audit**.

It should:

1. Build a sanitized fixture suite containing linked and intentionally
   unmatched records from every Phase 5 adapter.
2. Reconcile only exact explicit identity tokens using the existing lead
   reconciliation contract.
3. Assemble project-level compliance input without title, customer, or generic
   ID matching.
4. Report unmatched evidence, identity conflicts, source coverage, and warning
   changes before and after safe reconciliation.
5. Keep standard, manual, and emergency workflows separate.
6. Remain pure, read-only, fixture-only, and outside runtime.

Stop if a fixture requires choosing canonical lead, quote, schedule, or
workflow authority. That is a product/backend decision, not an adapter rule.

## Decision

Lead Phase 5 expands representative shape coverage successfully.

The compliance engine can evaluate every requested source category when the
records are explicitly supplied. It still cannot claim source-complete runtime
truth, safely join fragmented records, display warnings, or enforce workflow
order.
