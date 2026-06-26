# Lead Phase 4 Compliance Adoption Decision

## Executive Decision

Lead compliance tooling is ready for read-only architecture analysis and
representative fixture characterization. It is not ready for runtime adoption.

`leadWorkflowCompliance.js` deterministically identifies missing and
out-of-order workflow evidence. `leadWorkflowCharacterization.js` aggregates
those findings without changing records. Neither utility, however, proves that
all relevant evidence was supplied or that a missing stage did not occur in a
different legacy source.

Runtime warning display should remain blocked until representative source
adapters, canonical identity, approved workflow policy, and reviewed
`language.js` copy exist. Workflow enforcement must remain blocked.

## Current Lead Compliance Readiness

| Capability | Status | Decision |
| --- | --- | --- |
| Pure warning evaluation | READY | Continue using in tests and architecture analysis. |
| Aggregate characterization | READY | Continue using with explicit, sanitized datasets. |
| Source-complete characterization | BLOCKED | No adapters yet cover all current lead, schedule, quote, work, completion, and history sources. |
| Identity confidence | BLOCKED | Posts, quote requests, homeowner requests, schedules, and quotes do not share one proven project identity. |
| Internal development reporting | PARTIAL | Safe only when findings retain source and evidence limitations. |
| Runtime warning display | BLOCKED | Missing evidence can currently be mistaken for a workflow violation. |
| Workflow enforcement | BLOCKED | Authority, identity, exception, and transition policy remain unresolved. |

The current tools measure supplied evidence. They do not establish canonical
workflow truth, grant eligibility, or identify the authoritative owner of a
transition.

## Blocker Table

| Blocker | Category | Current evidence | Adoption impact | Required resolution |
| --- | --- | --- | --- | --- |
| No shared canonical lead/project ID | Identity | Lead Phase 1 found three sources without a proven shared identity. Generic IDs and titles are unsafe joins. | A warning can be attached to the wrong lead or generated because related evidence was not joined. | Establish and propagate an immutable project/request ID across lead, appointment, quote, work, completion, and history records. |
| Representative source adapters are missing | Identity and coverage | Phase 3 accepts prepared datasets but does not adapt current runtime sources. | Compliance and warning rates cannot be treated as production measurements. | Add pure source adapters and sanitized fixtures; preserve unmatched records and source labels. |
| Contact evidence has no canonical event | Workflow policy | Contact flags and timestamps are optional legacy fields. | `missing-customer-contact` can mean missing data rather than skipped contact. | Define the authoritative contact-complete event and owner. |
| Information-complete evidence has no canonical event | Workflow policy | Information flags and timestamps are not written consistently. | `quote-before-information` can be a false positive and cannot safely gate quotes. | Define required information and an authoritative completion event. |
| Quote-decision authority is fragmented | Identity and authority | Quote decisions exist in copied quote arrays, request records, and workflow cards. | Work-before-decision findings may reflect an unjoined decision copy. | Select quote authority and expose project-scoped decision evidence. |
| Appointment requirement is not consistently stored | Appointment policy | The utility requires an explicit requirement flag; current sources do not consistently provide one. | The engine cannot reliably decide when appointment warnings apply. | Store an authoritative appointment policy on the project or workflow. |
| Exception taxonomy is unapproved | Appointment policy | Phase 2 accepts structurally complete exception evidence but explicitly does not approve exception types. | Displaying approval warnings would imply a policy that does not exist. | William must approve exception reasons, eligible workflows, and approval authority. |
| Emergency classification is fragmented | Appointment policy | Emergency is detected from supplied flags or workflow type. | A misclassified emergency can receive standard warnings or bypass appointment analysis incorrectly. | Provide authoritative workflow classification and retain a separate emergency policy. |
| Manual-customer evidence is incomplete | Workflow policy | Manual schedules and external decisions can lack authenticated project and actor evidence. | Warnings may penalize valid offline steps or accept unauthenticated claims. | Define manual workflow evidence, actor provenance, and decision authority. |
| `start_work_immediately` conflicts with standard sequence | Workflow policy | Work Center can move from visit outcome into work without quote decision. | Enforcement would either break existing behavior or silently approve a workflow exception. | Decide whether this is prohibited or an approved, evidenced exception. |
| Warning language is not product-approved | Presentation | Utilities return engineering-oriented English messages. | Direct display would bypass `language.js` and may imply blame or certainty. | Create bilingual, neutral, actionable copy through `language.js`. |
| Work Center is not the workflow authority | Ownership | Work Center remains a projection consumer while current page code manipulates several domains. | Importing compliance into Work Center could make the page an accidental policy owner. | Place future policy evaluation behind the authoritative Leads/workflow service; Work Center consumes results only. |

## Identity-Related Blockers

1. Lead Phase 1 proves that `/posts`, `/contractor-quote-requests`, and
   `homeownerRequests` cannot yet be joined through one canonical identity.
2. Schedule, quote, active-work, completion, and history records do not
   consistently propagate the same project ID.
3. Missing evidence is indistinguishable from evidence stored under an
   unmatched identity.
4. Generic source IDs, titles, customer names, and descriptions must not be
   used to make compliance decisions.
5. Quote and manual-customer decisions lack consistent actor and authority
   provenance.

These blockers affect both warning accuracy and the ability to navigate from a
warning to the correct project record.

## Workflow-Policy Blockers

1. The required content of the Information stage is not defined as a durable
   contract.
2. Contact and information completion do not have canonical events or owners.
3. Quote decision authority is duplicated across legacy stores.
4. The meaning of quote acceptance remains unresolved: it may create a next
   action, scheduled work, or active work depending on the current path.
5. `start_work_immediately` has no approved relationship to the required quote
   and decision stages.
6. Manual and emergency workflows require policies distinct from the standard
   lead sequence.
7. Work Center, Dashboard, and Command Center must remain consumers and
   navigation surfaces, not compliance authorities.

## Appointment-Exception Blockers

The utility can recognize an exception record containing approval, reason, and
approver evidence. This is a structural check only.

Before runtime adoption, product policy must define:

- which standard workflows require an appointment;
- whether remote estimates or no-visit quotes are valid;
- whether `start_work_immediately` is ever permitted;
- which roles may approve an exception;
- whether approval must occur before quote creation or quote sending;
- how manual customers record equivalent evidence;
- how emergency workflows remain separate from standard exceptions;
- how exception changes are recorded in the relationship timeline.

Until those decisions are approved, `appointment-exception-unapproved` must
remain an internal diagnostic and no exception result may block or authorize a
workflow transition.

## Safe-to-Surface Warning List

No warning is approved for immediate runtime display in this phase.

The following warnings are candidates for later, non-blocking display after
source adapters prove evidence coverage, the record has authoritative identity,
and copy is reviewed through `language.js`:

| Warning | Future presentation rule |
| --- | --- |
| `missing-customer-contact` | Present as a neutral prompt to record contact, not as proof that contact did not occur. |
| `missing-information` | Present as a request to complete required project information after the Information contract is approved. |
| `quote-before-information` | Present only when quote and information events share authoritative project identity and timestamps. |
| `appointment-not-completed` | Present only when appointment-required policy and schedule authority are known. |
| `appointment-outcome-missing` | Present as an actionable request to record the visit outcome. |

Future warnings must be advisory, explain the missing evidence, identify the
authoritative record to update, and never silently prevent navigation or data
entry.

## Internal-Only Warning List

The following warnings must remain in tests, audits, or development reporting
until their underlying authority and policy gaps are resolved:

| Warning | Why it must remain internal |
| --- | --- |
| `missing-lead-identity` | It is an architecture/data-linkage failure, not a user workflow mistake. |
| `appointment-required-missing` | Appointment-required policy is not consistently authoritative. |
| `appointment-exception-unapproved` | Valid exception types and approvers are not approved. |
| `work-before-quote` | Quote evidence may exist in an unmatched legacy source. |
| `work-before-quote-decision` | Decision authority is fragmented and manual decisions may lack provenance. |
| `completion-without-work` | Work and completion identity is not consistently linked. |
| `history-without-completion` | Completion and history ownership remains fragmented. |
| `stage-timestamp-conflict` | Legacy timestamps have different owners and semantics; the warning needs source-level diagnosis. |

These diagnostics can guide cleanup and source coverage work. They should not
be shown as end-user fault or used as enforcement input.

## Runtime Adoption Decision

**Decision: KEEP WARNING-ONLY AND OUT OF RUNTIME.**

Do not import the compliance or characterization utilities into
`BusinessLeads`, `BusinessDashboard`, `ContractorDashboard`, Quote Builder, or
Command Center.

Runtime adoption is blocked until all of the following are true:

- representative adapters cover every required workflow source;
- findings are joined only by authoritative project/request identity;
- false-positive rates are characterized with sanitized fixtures;
- contact and information event ownership is defined;
- appointment requirement and exception policy are approved;
- quote-decision authority is defined;
- emergency and manual workflows have separate policies;
- warning language is supplied through `language.js`;
- the future consumer is a projection of policy results, not the policy owner.

## Enforcement Decision

**Decision: ENFORCEMENT REMAINS BLOCKED.**

The current utilities must not:

- block quote creation or sending;
- block work activation;
- change lead statuses;
- approve appointment exceptions;
- infer missing stages from later stages;
- correct or migrate legacy records;
- select canonical domain authority;
- alter Dashboard, Command Center, or Work Center ownership.

Enforcement requires a canonical workflow command boundary and authoritative
transition evidence. Warning accuracy alone is not sufficient.

## What Can Be Safely Deferred

- Historical cleanup of incomplete legacy leads can be deferred if those
  records remain visible and are excluded from enforcement.
- UI warning placement can be deferred until the data and policy contracts are
  stable.
- Aggregate Dashboard metrics can be deferred; they must not be built from
  partial characterization data.
- Automated remediation can be deferred indefinitely. The first adoption, when
  safe, should remain advisory.

Identity, information ownership, appointment policy, and quote-decision
authority cannot be deferred before runtime adoption.

## Recommended Next TestFlight-Safe Track

Pause lead runtime adoption. The next TestFlight-safe track should be
**Representative Lead Source Adapter and Fixture Coverage**.

That track should:

1. Create pure adapters for backend posts, contractor quote requests,
   homeowner requests, schedules and visit outcomes, quote decisions,
   active-work records, completion/history records, manual customers, and
   emergency records.
2. Join records only through explicit shared project or request identity.
3. Preserve unmatched records as separate findings.
4. Run `characterizeLeadWorkflows()` against sanitized fixtures representing
   current source shapes.
5. Report evidence coverage, unmatched identity rates, and warning frequency
   by source and workflow kind.
6. Define no UI, storage, writer, status, or enforcement adoption.

If representative adapters expose insufficient identity, stop the lead track
and prioritize canonical project identity propagation rather than weakening
join rules.

## Final Roadmap Recommendation

Lead compliance should remain a development and architecture instrument.
Proceed next with source coverage characterization, then request human decisions
for appointment exceptions and workflow authority. Only after those steps
should Meetro consider a separate, warning-only runtime adoption audit.

No enforcement phase should be scheduled until canonical identity and command
ownership are in place.
