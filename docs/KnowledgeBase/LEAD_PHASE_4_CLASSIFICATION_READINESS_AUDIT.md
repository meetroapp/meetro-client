# Lead Phase 4 - Classification Readiness Audit

## Audit Scope

This audit evaluates where the advisory Service Request classification contract may
eventually be read, displayed, or used to recommend an operational path. It does
not approve runtime adoption, workflow enforcement, storage changes, or creation
of operational records.

Reviewed implementation:

- `src/pages/Upload.jsx`
- `src/pages/Home.jsx`
- `src/pages/Discover.jsx`
- `src/pages/BusinessLeads.jsx`
- `src/pages/QuoteRequests.jsx`
- `src/pages/ContractorDashboard.jsx`
- `src/pages/BusinessDashboard.jsx`
- `src/pages/BusinessCommandCenter.jsx`
- `src/pages/ProjectGallery.jsx`
- `src/pages/CompletionSheet.jsx`
- `src/utils/serviceRequestClassification.js`
- `src/utils/leadReconciliation.js`
- `src/utils/projectIdentity.js`

Governing principles:

- Intent initiates a Service Request.
- Information determines classification.
- Category provides context but does not determine classification.
- Unknown, human review, consultation, and an information-gathering appointment
  are valid outcomes when information is insufficient.
- Classification recommends an operational path. It does not own that path.

## Executive Finding

The classification utility is ready for pure characterization and reporting, but
the application is not ready for runtime adoption.

The safest eventual consumer is Lead Review, where an advisory result could help
a professional identify missing information and decide what to investigate next.
Even there, adoption remains blocked until the result is tied to an explicit
Service Request identity and the intake data is adapted into a documented
classification input.

Scheduling, Quotes, Work Center, Completion, Dashboard, Command Center, and
Project Gallery must not become classification authorities. They may eventually
display classification context or recommendations supplied by the Service
Request/lead review domain, but their existing operational authority must remain
unchanged.

## Readiness Summary

| Area | Readiness | Future role | Primary blocker |
| --- | --- | --- | --- |
| Intake | PARTIAL | Gather evidence and show advisory information gaps | Intake is project/quote shaped and lacks structured classification evidence |
| Lead Review | PARTIAL | Safest future place to review candidates and missing information | No canonical Service Request identity or source adapter |
| Scheduling | BLOCKED | Display context; recommend information-gathering visit | Appointment writes and transitions are operational authority |
| Quote | BLOCKED | Warn when quote readiness is uncertain | Quote existence is currently treated as workflow evidence |
| Work Center | BLOCKED | Read classification context beside owned work records | Compatibility identity collapses requests, projects, quotes, and conversations |
| Completion | BLOCKED | Historical context only | Completion cannot retroactively classify or alter closure/history |
| Dashboard | PARTIAL | Read-only summaries after canonical adoption elsewhere | Dashboard counts and cards are tied to legacy project assumptions |
| Business Intelligence | PARTIAL | Aggregate verified classifications and review needs | No canonical historical classification dataset or provenance |

## File-Level Adoption Map

| File | Current responsibility and assumptions | Safe future read | Unsafe adoption |
| --- | --- | --- | --- |
| `src/pages/Upload.jsx` | Collects a category, title, description, location, access details, and media; creates a `quote_request` and a project-shaped local request | Advisory missing-information prompts and candidate preview before submission, without gating or changing submission | Selecting `post_type`, creating a project, scheduling, quoting, or routing from a candidate |
| `src/pages/Home.jsx` | Starts project intake, provides a separate Emergency entry, and presents homeowner requests as active projects | Read-only request classification or review-needed label after authoritative classification exists | Automatically routing, relabeling, dispatching, or converting requests based on classification |
| `src/pages/Discover.jsx` | Displays businesses and open posts using category filters; permits relationship/contact activity outside a project | Read-only classification filter or badge when an explicit Service Request link exists | Treating category, a post, or conversation text as classification authority |
| `src/pages/BusinessLeads.jsx` | Reviews posts as leads, category-matches them, and opens project-review workflow | Advisory candidates, missing-information warnings, and suggested investigation steps | Changing lead status, closure, navigation, schedule, quote, or project creation |
| `src/pages/QuoteRequests.jsx` | Presents quote-ready records and performs quote/message/status actions | Quote-readiness warning and classification context from a linked Service Request | Inferring classification from quote existence or using it to create/send/cancel quotes |
| `src/pages/ContractorDashboard.jsx` | Owns Work Center schedule, quote, active-work, completion, timeline, and operational transitions | Read-only context in a selected request/job header; non-binding recommendation beside an owned decision | Auto-selecting appointments, moving tabs/statuses, creating jobs, starting work, or completing work |
| `src/pages/BusinessDashboard.jsx` | Summarizes leads, quotes, schedules, and active projects and routes users to owner modules | Aggregate advisory counts after canonical classification is stored by its owner | Changing dashboard counts, cards, navigation, or workflow state |
| `src/pages/BusinessCommandCenter.jsx` | Launches operational tools and routes into Work Center/lead modules | Future recommendation or attention indicator linked to the responsible module | Creating records, choosing workflow transitions, or becoming classification authority |
| `src/pages/ProjectGallery.jsx` | Manages professional portfolio records called projects | No direct Service Request classification consumption with the current data model | Classifying portfolio records or treating portfolio IDs as operational project/request IDs |
| `src/pages/CompletionSheet.jsx` | Captures completion, updates revenue/counts, closes schedules/conversations, and contributes to history | Historical classification label only when inherited through an explicit aggregate link | Classifying during completion or changing closure, history, revenue, or status from a candidate |
| `src/utils/serviceRequestClassification.js` | Pure advisory candidate generation from supplied evidence | Characterization, fixture analysis, and future read-only recommendation | Being treated as workflow, identity, persistence, or authorization authority |
| `src/utils/leadReconciliation.js` | Reconciles posts, quote requests, and homeowner requests around compatibility project identity | Source coverage inventory for a future classification input adapter | Passing reconciled `projectId` directly as canonical Service Request identity |
| `src/utils/projectIdentity.js` | Resolves legacy records to a compatibility `projectId` from several unrelated identifier types | Warning/provenance input only | Treating request, job, quote, conversation, emergency, post, or generic IDs as interchangeable authority |

## 1. Intake Readiness

### Current responsibility

`Upload.jsx` gathers customer intent through a project-oriented form and persists
the result as a quote request. `Home.jsx` routes the standard entry point toward
that form and offers Emergency as a separate path. `Discover.jsx` exposes open
posts and business discovery after intake.

### Current assumptions

- Standard customer intent is described as a project.
- A submitted intake record is a `quote_request`.
- Category is selected before sufficient operational information is known.
- Local request records already contain project, quote, invoice, and completion
  concepts before classification has occurred.
- Emergency is treated as a separate entry path rather than one possible
  information-driven classification.

### Classification visibility

Classification is not currently visible. Category and project terminology act as
proxies, but neither is a valid classification result.

### Safe future read locations

- Below or beside the intake information fields, show missing-information prompts.
- Before submission, show a non-binding "possible operational paths" preview.
- On Home request cards, show a classification or "review needed" label only
  after it has authoritative provenance.
- On Discover request rows, show classification as filter/display metadata only
  when the row has an explicit Service Request link.

### Unsafe adoption locations

- Do not let a candidate change `post_type`.
- Do not create a Project, Work Order, appointment, quote, or emergency dispatch.
- Do not block submission solely because confidence is low.
- Do not use category as a classification shortcut.
- Do not infer classification from a business selected in Discover.

### Dependencies and risk

Required identity dependencies:

- An explicit `serviceRequestId`.
- Explicit links from the Service Request to any later post, quote request,
  conversation, appointment, or operational aggregate.

Required information sufficiency dependencies:

- Urgency and active-hazard evidence.
- Scope, complexity, and expected duration.
- One-time versus recurring need and recurrence details.
- Pickup, destination, and timing for transportation.
- Property/tenant/responsibility context for maintenance.
- Whether the customer is requesting advice, assessment, or execution.

Premature adoption would make a sparse, category-led intake form appear more
authoritative than the available evidence permits.

## 2. Lead Review Readiness

### Current responsibility

`BusinessLeads.jsx` is the closest current location to professional information
review. It assembles posts into lead cards, performs category matching, marks
closed/accepted records, and routes selected leads into project review.
`leadReconciliation.js` reconciles several lead-like sources.

### Current assumptions

- Lead review is project review.
- Accepted quote state can define whether a lead is closed.
- Category matching is a major source-selection rule.
- Some local records are matched by title when explicit identity is unavailable.
- Display urgency/value may be synthesized rather than derived from authoritative
  request evidence.

### Classification visibility

There is no explicit classification. The lead shape already implies project and
quote readiness.

### Safe future read locations

- A read-only candidate list in lead detail.
- Missing-information and low-confidence warnings.
- A recommendation such as "gather more information," "consider consultation,"
  or "review emergency evidence."
- Internal characterization reports measuring how many records are Unknown,
  review-required, or missing required evidence.

Lead Review is the safest eventual first UI consumer because it is already where a
professional evaluates customer intent. The result must remain advisory.

### Unsafe adoption locations

- Do not change lead status or closure.
- Do not automatically open Project Details.
- Do not select an appointment type.
- Do not create or send a quote.
- Do not create a project or work record.
- Do not rank or hide leads solely by candidate classification.
- Do not use title matching as classification identity.

### Dependencies and risk

Required identity dependencies:

- A canonical Service Request ID carried through all lead source adapters.
- Source provenance that distinguishes posts, quote requests, homeowner requests,
  emergency requests, and legacy records.
- Explicit links to operational records rather than compatibility ID promotion.

Required information sufficiency dependencies:

- A source adapter that maps each lead shape to the classification contract.
- A clear distinction between absent evidence and negative evidence.
- Human-review policy for contradictory or high-risk evidence.

Premature adoption could make recommendation output appear to approve a quote or
project even though the lead record contains only display-level information.

## 3. Scheduling Readiness

### Current responsibility

Scheduling is owned by the Work Center in `ContractorDashboard.jsx`. It creates
and updates appointments, supports appointment types such as walkthrough,
estimate visit, consultation, emergency dispatch, and virtual meeting, and may
advance workflow state based on visit outcomes.

### Current assumptions

- The selected Work Center record is already a project-like operational context.
- Request, project, quote, job, conversation, and generic identifiers may be used
  through compatibility fallbacks.
- A visit outcome can directly choose the next project step.

### Safe future read locations

- Display an inherited classification and its provenance in the selected request
  context.
- Recommend an information-gathering appointment when the classification
  contract reports missing evidence.
- Warn that classification remains uncertain after a visit until evidence is
  reviewed.

### Unsafe adoption locations

- Do not auto-select appointment type or time.
- Do not create, update, cancel, or complete an appointment.
- Do not convert Consultation into Project or Work Order.
- Do not dispatch Emergency work.
- Do not use classification to trigger quote creation or start work.

### Dependencies and risk

Scheduling needs an explicit Service Request-to-schedule link and authoritative
schedule ownership. It also needs a product-approved definition of which missing
information can be gathered remotely versus through an appointment.

Appointment need is based on information sufficiency, not category or candidate
classification. Scheduling adoption is therefore BLOCKED beyond read-only context.

## 4. Quote Readiness

### Current responsibility

`QuoteRequests.jsx` and quote flows in `ContractorDashboard.jsx` own quote review,
creation, communication, decision, and workflow transitions.

### Current assumptions

- A quote request is already suitable for a quote.
- Project-shaped fields and status are available.
- Some records are associated through title/description or broad identifier
  fallbacks.
- Quote acceptance may move a record toward schedule or active work.

### Safe future read locations

- Show the authoritative classification as context beside a quote request.
- Show a warning that information may be insufficient for quoting.
- Recommend returning to Lead Review for more information.
- Measure, outside runtime, how many quote records lack classification evidence.

### Unsafe adoption locations

- Do not infer classification from the existence of a quote request.
- Do not create, send, revise, accept, decline, or cancel a quote.
- Do not change quote status or pricing.
- Do not treat a classification candidate as quote authorization.
- Do not move accepted quotes into scheduling or work based on classification.

### Dependencies and risk

Quote readiness requires an explicit Service Request-to-quote link, authoritative
scope evidence, and a separately owned quote decision. Current title/description
matching and compatibility IDs cannot establish that provenance.

Quote adoption remains BLOCKED except for future advisory display.

## 5. Work Center Readiness

### Current responsibility

`ContractorDashboard.jsx` combines schedule, quotes, active work, completion,
timeline, revenue, and operational records. It owns actions within those domains,
not Service Request classification.

### Current assumptions

- Homeowner requests can be treated as projects/jobs.
- Accepted quotes can become scheduled or active work.
- Compatibility identity is sufficient to connect operational records.
- Work Center tabs represent workflow state.

### Classification visibility

Classification is not explicitly visible. Existing source, status, category, and
tab placement can look like classification but are operational/display fields.

### Safe future read locations

- Read-only classification context in a selected work record header.
- A provenance warning when the classification is Unknown or review-required.
- A recommendation link back to the owner of Service Request review.
- Internal coverage reporting that does not affect tabs, counts, or actions.

### Unsafe adoption locations

- Do not let classification own Work Center tab placement.
- Do not create or activate jobs.
- Do not create schedules or quotes.
- Do not update status, selected project, timeline, revenue, or completion.
- Do not use classification to manufacture a `projectId`.
- Do not make Work Center the owner of classification.

### Dependencies and risk

`projectIdentity.js` is a compatibility layer, not an authority layer. It may
promote `requestId`, `jobId`, `quoteRequestId`, `conversationId`, `emergencyId`,
`postId`, or generic `id` into a value named `projectId`. That behavior preserves
legacy reads but is unsafe as classification identity.

Work Center adoption requires:

- Canonical Service Request identity.
- Explicit Service Request-to-operational aggregate links.
- Classification provenance and review status.
- A presentation adapter that cannot change current counts, ordering, or status.

## 6. Completion Readiness

### Current responsibility

`CompletionSheet.jsx` owns completion capture and participates in schedule closure,
conversation closeout, history/archive creation, revenue, and completed-work
counts.

### Current assumptions

- Completion records may be connected through schedule, emergency, conversation,
  active-request, service, or generated identifiers.
- Completion source and service labels are sufficient for presentation.
- Closing a completion can update multiple legacy stores and workflow surfaces.

### Safe future read locations

- Display the inherited classification as historical context after an explicit
  Service Request-to-completed aggregate link is available.
- Use verified classification in read-only history analytics.
- Report missing classification provenance without blocking completion.

### Unsafe adoption locations

- Do not classify a request at completion.
- Do not infer classification from service name, title, source, or completion
  status.
- Do not change completion, closeout, conversation, history, revenue, or count
  behavior.
- Do not reopen or re-route completed work from a classification candidate.

### Dependencies and risk

Completion needs canonical completion/project/request relationships and immutable
historical classification provenance. Current completion identity is not complete
enough for adoption.

Completion is an operational authority for closing work. It is never
classification authority.

## 7. Dashboard Readiness

### Current responsibility

`BusinessDashboard.jsx` summarizes lead, quote, schedule, and active-project data.
`Home.jsx` similarly summarizes homeowner requests as projects.

### Current assumptions

- Existing statuses can determine active-project and quote counts.
- Homeowner requests can be displayed as projects.
- Dashboard cards may route directly into operational review.

### Safe future read locations

- Read-only distribution of verified classifications.
- Count of Unknown or review-required Service Requests.
- Advisory attention indicators that route to Lead Review.
- Homeowner-facing classification labels only after language and visibility rules
  are approved.

### Unsafe adoption locations

- Do not let classification alter existing counts or revenue.
- Do not change card membership, ordering, status, or route.
- Do not create projects or operational records.
- Do not let Dashboard resolve identity or classification conflicts.
- Do not present candidates as confirmed outcomes.

### Dependencies and risk

Dashboard adoption requires a canonical classification read model with stable
identity, reviewed versus candidate state, visibility policy, and count semantics.
Without those controls, a classification summary would disagree with current
project/lead counts and imply authority the Dashboard does not own.

## 8. Business Intelligence Readiness

### Current responsibility

`BusinessCommandCenter.jsx` routes users toward quotes, jobs, materials, customers,
permits, reminders, plans, and Work Center tools. `BusinessDashboard.jsx` and
Work Center summaries provide current operational intelligence.
`ProjectGallery.jsx` owns professional portfolio presentation, not customer
request intelligence.

### Current assumptions

- Operational tabs and tools are sufficient to describe work.
- Existing project, quote, schedule, and status records can drive summaries.
- Portfolio projects are independent professional showcase records.

### Safe future read locations

- Classification distribution by reviewed Service Request.
- Unknown/review-required volume.
- Information-sufficiency trends.
- Recommendations that link users to Lead Review or the proper operational owner.
- Historical analysis only from reviewed classifications with explicit aggregate
  links.

### Unsafe adoption locations

- Command Center must not choose an operational path or execute an action.
- Dashboard/Command Center must not become classification owner.
- Classification must not change revenue, pipeline, active-work, or completion
  metrics.
- Project Gallery must not classify portfolio entries.
- Portfolio project IDs must not be reused as Service Request or operational
  project identity.

### Dependencies and risk

Business intelligence requires a reviewed classification dataset, documented
metric definitions, immutable provenance, and explicit separation between:

- candidate and confirmed classification;
- Service Request and operational aggregate;
- active workflow and historical analytics;
- professional portfolio and customer work.

Until those exist, business intelligence adoption is limited to offline
characterization.

## Safe Future Adoption Points

The following locations are future-safe only after identity and information
dependencies are resolved:

1. Lead detail: display candidates, confidence, missing information, and review
   requirement.
2. Intake review: display non-binding information gaps and possible paths without
   changing submission.
3. Quote request detail: display a quote-readiness warning inherited from the
   Service Request.
4. Schedule detail: display classification context and recommend information
   gathering without selecting an appointment.
5. Work Center selected record: display inherited, provenance-qualified context.
6. Completion/history detail: display immutable historical classification.
7. Dashboard/Command Center: aggregate reviewed classifications and unresolved
   review needs.

The first safe implementation remains a pure characterization layer, not a UI
consumer.

## Unsafe Adoption Points

Classification must not:

- create a Project, Work Order, recurring plan, appointment, quote, job,
  conversation, emergency dispatch, completion, or history record;
- change status, route, tab, count, revenue, ordering, visibility, or access;
- close a lead or approve a quote;
- trigger work or completion;
- use category as workflow authority;
- use the current viewer as identity or authorization provenance;
- infer Service Request identity from conversation, quote, schedule, emergency,
  portfolio, title, customer name, or generic IDs;
- become owned by Dashboard, Command Center, Work Center, Completion, or Project
  Gallery.

## Identity Blockers

1. No canonical `serviceRequestId` is carried across all reviewed intake and lead
   sources.
2. `projectIdentity.js` intentionally normalizes unrelated legacy identifiers
   into a compatibility `projectId`.
3. `leadReconciliation.js` therefore produces project-oriented identity rather
   than a distinct Service Request identity.
4. Some records are associated by title or description.
5. Quote, schedule, conversation, emergency, job, post, portfolio, and completion
   identities are not consistently linked to a Service Request through explicit
   relationship records.
6. Candidate classification has no persisted review/approval provenance, and
   this phase does not approve adding it.

## Information Sufficiency Blockers

1. Intake sources do not share one structured Service Request shape.
2. Category is often present while scope, complexity, urgency, recurrence, and
   operational constraints are absent.
3. Display labels and synthesized urgency/value cannot be treated as evidence.
4. Transportation evidence is not represented consistently.
5. Tenant/property/responsibility evidence is incomplete.
6. Recurrence and frequency evidence is incomplete.
7. Consultation intent is not consistently distinguished from a request to
   perform work.
8. Active hazard and emergency evidence lacks a single reviewed provenance model.
9. No application-level policy distinguishes candidate, reviewed, confirmed, and
   superseded classifications.
10. No approved rule defines which missing information should lead to remote
    follow-up, consultation, appointment, or human review.

## Authority Boundaries

| Capability | Correct authority | Classification role |
| --- | --- | --- |
| Service Request review | Lead/intake review domain | Advisory candidates and information gaps |
| Appointment creation and updates | Scheduling | Context and non-binding recommendation |
| Quote creation and decision | Quotes | Context and readiness warning |
| Work activation and status | Work Center work owner | Context only |
| Completion and closure | Completion | Historical context only |
| History | Canonical history projection/owner | Reviewed classification dimension only |
| Dashboard summaries | Dashboard read model | Aggregate display only |
| Command Center actions | Owning operational module | Recommendation/link only |
| Portfolio | Project Gallery/portfolio owner | No Service Request classification authority |

## Recommended Lead Phase 5

**Lead Phase 5 - Service Request Classification Source Adapter and
Characterization Audit**

Create a pure, non-persisting adapter that converts representative records from
Upload/posts, BusinessLeads, QuoteRequests, homeowner requests, emergency
requests, and legacy lead sources into the Phase 3 Service Request classification
input.

The phase should:

- preserve source provenance and original identity fields;
- keep `serviceRequestId` separate from compatibility `projectId`;
- report missing identity rather than guessing;
- distinguish absent evidence from negative evidence;
- run the classifier only for characterization;
- report candidate, Unknown, review-required, and missing-information rates by
  source;
- test that category alone never establishes classification;
- make no UI, storage, routing, status, or workflow changes.

Phase 5 should stop if it requires choosing a persistence authority, approving a
classification, defining user-visible language, or selecting an operational path.

## Required Conclusion

Classification is decision support.

Classification is not workflow authority.

Classification should recommend operational paths.

Operational modules retain authority.
