# Lead Phase 2 Request Classification Audit

**Status:** Audit only  
**Scope:** Lead intake, lead presentation, identity reconciliation, and
downstream lead processing  
**Runtime effect:** None  
**Authority:** `MEETRO_REQUEST_CLASSIFICATION_PRINCIPLE.md`

## Executive Summary

The reviewed implementation does not currently model:

```text
Intent
  -> Service Request
  -> Information Gathering
  -> Classification
  -> Operational Path
```

The dominant standard path is:

```text
Customer chooses an industry category
  -> quote_request post
  -> homeownerRequests project-shaped record
  -> Lead
  -> Project Details / Quote / Schedule
  -> Active Project or Job
```

This path assumes a Project and quote-oriented lifecycle before information
sufficiency or operational classification is established.

Emergency has a separate intake and execution lane, and Work Center scheduling
supports walkthrough, estimate visit, consultation, emergency dispatch, and
virtual meeting types. These are useful path capabilities, but they are not an
authoritative classification layer. No reviewed record contains an explicit,
evidence-backed Service Request classification.

## Audit Standard

The approved model is:

```text
Intent
  -> Service Request
  -> Information Gathering
  -> Classification
  -> Operational Path
  -> Work
  -> Completion
  -> Closure
  -> History
  -> Relationship
```

Possible classification outputs include:

- Project;
- Work Order;
- Recurring Service;
- Emergency;
- Consultation;
- Transportation Service;
- Maintenance Request;
- future approved workflow types.

Industry category may guide information gathering. It must not determine the
workflow.

## Intake and Processing Inventory

### 1. Home Standard Request Entry

**File:** `src/pages/Home.jsx:205-225`

| Audit question | Current behavior |
| --- | --- |
| Assumed request type | Project |
| Assumed project creation | The primary action is `postAProject` and routes directly to `Upload`. |
| Information gathered | None at this entry point beyond the customer's implicit choice to request help. |
| Missing information | Outcome, scope, urgency, recurrence, timing, access, dependencies, pricing sufficiency, inspection need, authorization, and participant requirements. |
| Classification capability | None. The entry point skips neutral Service Request framing. |
| Appointment assumptions | Deferred, but the user is already inside a Project path. |
| Quote assumptions | Strong. The destination creates `post_type: "quote_request"`. |
| Emergency assumptions | Emergency is a separate button and route, requiring the customer to classify urgency before standard intake gathers information. |
| Work Order suitability | Not represented. |
| Project suitability | Supported by labels and downstream storage, but not proven by intake evidence. |
| Recurring Service suitability | Not represented. |
| Consultation suitability | Not represented at intake. |

**Finding:** The standard home entry assumes `Intent -> Project` before
information gathering.

### 2. Home Emergency Entry

**File:** `src/pages/Home.jsx:227-240`

| Audit question | Current behavior |
| --- | --- |
| Assumed request type | Emergency |
| Assumed project creation | No immediate standard Project creation is visible in this entry point. |
| Information gathered | None before entering the dedicated Emergency route. |
| Missing information | Severity, safety condition, affected asset/person, access, exact location, authorization, and whether the condition is actually emergent. |
| Classification capability | Partial. It offers a distinct operational lane, but classification is customer-selected rather than information-derived. |
| Appointment assumptions | Emergency dispatch is handled separately from normal appointment flow. |
| Quote assumptions | No quote is required at this entry point. |
| Emergency assumptions | Explicit and immediate. |
| Work Order suitability | A non-emergency urgent repair cannot be classified here. |
| Project suitability | A large emergency may later require a Project, but reclassification is not represented by this entry. |
| Recurring Service suitability | Not applicable to this entry. |
| Consultation suitability | Not represented. |

**Finding:** This is the strongest evidence that Meetro can support multiple
operational lanes. It is not yet classification because the system does not
first evaluate information sufficiency.

### 3. Upload Standard Intake

**File:** `src/pages/Upload.jsx:73-81`, `142-252`, `295-458`

| Audit question | Current behavior |
| --- | --- |
| Assumed request type | Project and quote request |
| Assumed project creation | The screen is titled `newProject`; fields use Project terminology; the local record receives `projectTimeline`; success copy says the Project was posted. |
| Information gathered | Title, free-text description, industry category, location, optional unit, property-management access notes, and photos. |
| Missing information | Requested outcome, urgency/safety, desired timing, recurrence, scope dimensions, known pricing, budget authority, inspection need, participant roles, dependencies, access authorization, closure obligations, and classification evidence. |
| Classification capability | None. `category` is stored, but no `classification`, `workflowType`, information-sufficiency result, or classification evidence exists. |
| Appointment assumptions | No sufficiency evaluation determines whether an appointment, inspection, consultation, or no visit is appropriate. |
| Quote assumptions | Explicit. Every post is sent as `post_type: "quote_request"` and initializes `quotesReceived`. |
| Emergency assumptions | Emergency is outside this intake; urgent facts in description do not classify the record. |
| Work Order suitability | A simple defined task is still stored as a Project-shaped quote request. |
| Project suitability | Remodel/complex work can fit, but Project criteria are never evaluated. |
| Recurring Service suitability | Category values such as lawn care, pool service, cleaning, and home health care exist, but recurrence details and recurring authority do not. |
| Consultation suitability | No top-level classification; only later scheduling can choose a consultation appointment type. |

**Critical assumptions:**

- `categoryGuidance` uses Project-specific guidance for multiple industries.
- `post_type` is always `quote_request`.
- `requestId` and generic `id` initialize a Project-shaped local record.
- `projectTimeline` begins immediately with a Project request event.
- No neutral Service Request state exists before these decisions.

### 4. Discover Business Directory

**File:** `src/pages/Discover.jsx:252-350`, `357-377`, `426-545`

| Audit question | Current behavior |
| --- | --- |
| Assumed request type | Relationship/business discovery rather than a lead |
| Assumed project creation | Messaging a business does not create a standard Project record. |
| Information gathered | Selected business identity, category, location, and the later conversation content. |
| Missing information | No structured customer intent or Service Request information is captured before conversation. |
| Classification capability | Partial future opportunity. Conversation can begin before a lead or Project, but no classification handoff exists. |
| Appointment assumptions | None. |
| Quote assumptions | None at contact creation. |
| Emergency assumptions | None. |
| Work Order suitability | Could later support one, but no request record exists to classify. |
| Project suitability | Could later support one, but conversation is not evidence of Project status. |
| Recurring Service suitability | Could later support one, but no recurrence evidence exists. |
| Consultation suitability | Could later support one, but no classification exists. |

**Risk:** The conversation registry still stores business relationship rows in
legacy Project-named fields such as `project_title` and
`project_description`. This does not create a Project, but it preserves
Project-first schema language around a relationship-first path.

### 5. Discover Open Request Feed

**File:** `src/pages/Discover.jsx:206-250`, `546-617`

| Audit question | Current behavior |
| --- | --- |
| Assumed request type | Open Project/quote opportunity |
| Assumed project creation | Posts are counted as Projects available and open into Project Details. |
| Information gathered | Existing post category, title, description, location, status, and optional image. |
| Missing information | The same sufficiency and classification fields missing from Upload. |
| Classification capability | None. Filtering is category-based, not classification-based. |
| Appointment assumptions | Not evaluated. |
| Quote assumptions | The primary professional action is `messageQuote`. |
| Emergency assumptions | No standard-feed classification; emergency is managed elsewhere. |
| Work Order suitability | Not represented. |
| Project suitability | Assumed from display and navigation. |
| Recurring Service suitability | Category may imply it, but recurrence cannot be represented. |
| Consultation suitability | Not represented. |

### 6. Business Leads

**File:** `src/pages/BusinessLeads.jsx:77-256`, `400-450`

| Audit question | Current behavior |
| --- | --- |
| Assumed request type | Category-matched homeowner lead |
| Assumed project creation | Opening a lead sets `leadWorkflowStage: "project_review"` and routes to `projectDetails`. |
| Information gathered | Reuses post title, description, category, location, unit/access notes, photos, customer fields, and a fabricated display value/urgency. |
| Missing information | No information-sufficiency result, operational classification, recurrence, consultation need, authorization path, inspection need, or path-specific requirements. |
| Classification capability | None. Business category groups decide visibility, not workflow. |
| Appointment assumptions | `leadWorkflowIntent: "review_contact_schedule"` presumes scheduling is part of the next path without a recorded sufficiency decision. |
| Quote assumptions | The selected record is stored as `selectedQuoteRequest`; accepted quote evidence closes the lead. |
| Emergency assumptions | Urgency sorting reads labels, but converted posts default urgency to `New`; emergency classification is not performed. |
| Work Order suitability | Not represented. |
| Project suitability | Assumed by navigation rather than established by evidence. |
| Recurring Service suitability | Cleaning category grouping exists, but recurring terms do not. |
| Consultation suitability | Not represented until a later schedule is manually created. |

**Additional risk:** Closed-lead detection uses exact ID or title matching and
Project/quote lifecycle statuses. This can hide a request as though its
operational path were resolved without canonical classification identity.

### 7. Quote Requests

**File:** `src/pages/QuoteRequests.jsx:29-219`, `244-380`

| Audit question | Current behavior |
| --- | --- |
| Assumed request type | Quote request presented as a lead |
| Assumed project creation | Records use `project_title` and `project_description`; Project identity is implied by backend shape. |
| Information gathered | Backend quote request title, description, location, homeowner identity, status, and messages. |
| Missing information | No classification evidence, information sufficiency, appointment requirement, recurrence, urgency policy, alternate authorization, or operational path. |
| Classification capability | None. The endpoint itself is `/contractor-quote-requests`. |
| Appointment assumptions | None are evaluated before the quote-oriented lead exists. |
| Quote assumptions | Absolute. All listed leads are quote requests. |
| Emergency assumptions | Not represented. |
| Work Order suitability | Cannot be represented without a quote request. |
| Project suitability | Assumed through field names, not classified. |
| Recurring Service suitability | Not represented. |
| Consultation suitability | Not represented. |

**Additional risk:** Quote requests are matched to homeowner requests by title
or description when marking viewed and messaged state. This is unsafe identity
reconciliation and cannot establish that two records share the same
classification.

### 8. Business Dashboard Lead Projection

**File:** `src/pages/BusinessDashboard.jsx:34-77`, `563-591`, `662-708`

| Audit question | Current behavior |
| --- | --- |
| Assumed request type | Homeowner lead matched to business category |
| Assumed project creation | Opening a lead stores `selectedQuoteRequest`, sets `project_review`, and routes to Project Details. |
| Information gathered | Existing request title, description, category, location, status, urgency, and display metadata. |
| Missing information | No classification or information-sufficiency evidence. |
| Classification capability | None. `canBusinessSeeCategory` is discovery routing only. |
| Appointment assumptions | Workflow intent is `review_contact_schedule`, regardless of classified path. |
| Quote assumptions | Selected record is stored as a quote request. Dashboard separately counts pending quotes. |
| Emergency assumptions | Emergency is displayed through a separate banner/lifecycle. |
| Work Order suitability | Not represented as a lead path. |
| Project suitability | Assumed. Active request counts are named `activeProjectsCount`. |
| Recurring Service suitability | Not represented. |
| Consultation suitability | Not represented at lead projection. |

### 9. Contractor Dashboard / Work Center Processing

**File:** `src/pages/ContractorDashboard.jsx:52-72`, `766-955`,
`2990-3024`, `3105-3180`, `3573-3767`

| Audit question | Current behavior |
| --- | --- |
| Assumed request type | Pending request, homeowner Project, emergency dispatch, scheduled job, or quote-approved work |
| Assumed project creation | Homeowner requests with accepted/scheduled/active status are converted into `homeownerProject` active jobs and opened through Project Details. |
| Information gathered | Downstream title/service, description/notes, date/time, location, appointment type, status, conversation ID, request ID, and selected workflow artifacts. |
| Missing information | No upstream Service Request classification decision or classification provenance. |
| Classification capability | Partial execution capability only. Schedule types distinguish walkthrough, estimate visit, consultation, emergency dispatch, and virtual meeting. |
| Appointment assumptions | Flexible appointment types exist, but the form defaults to walkthrough and no sufficiency evaluator selects or waives an appointment. |
| Quote assumptions | Quote-approved records can become active jobs; no universal classification gate precedes this. |
| Emergency assumptions | Dedicated emergency request and dispatch handling exists. |
| Work Order suitability | Active jobs can operationally resemble work orders, but no Work Order classification or identity exists. |
| Project suitability | Strongly supported and assumed for homeowner request records. |
| Recurring Service suitability | Not represented as a durable recurring agreement or occurrence series. |
| Consultation suitability | Supported as an appointment type, not as a top-level operational classification. |

**Finding:** Work Center can execute several path-shaped activities, but it
cannot prove why a request entered that path. It must remain a consumer of
classification, not become classification authority.

### 10. Lead Reconciliation

**File:** `src/utils/leadReconciliation.js:1-233`

| Audit question | Current behavior |
| --- | --- |
| Assumed request type | Post, quote request, or homeowner request normalized as a lead |
| Assumed project creation | Every normalized record calls `getProjectIdentity()` and exposes the result as `projectId`. |
| Information gathered | Source, explicit identity tokens, status, accepted-quote evidence, and reconciliation warnings. |
| Missing information | Service Request identity, intent, information sufficiency, classification, classification evidence, operational path, and reclassification history. |
| Classification capability | None. The utility reconciles source identity and status only. |
| Appointment assumptions | None directly. |
| Quote assumptions | Quote requests are a primary source and accepted quotes define lead closure. |
| Emergency assumptions | Emergency IDs are accepted as lead identity tokens but do not establish classification. |
| Work Order suitability | No Work Order identity or type. |
| Project suitability | Project identity is the normalization target for every source. |
| Recurring Service suitability | Not represented. |
| Consultation suitability | Not represented. |

**Finding:** This pure utility is safe as legacy reconciliation, but its output
contract encodes `Lead -> Project identity`. It cannot become the future
Service Request classification contract unchanged.

### 11. Project Identity Compatibility Layer

**File:** `src/utils/projectIdentity.js:1-138`

| Audit question | Current behavior |
| --- | --- |
| Assumed request type | Any compatible workflow record that may identify a Project |
| Assumed project creation | `requestId`, `jobId`, `quoteRequestId`, `conversationId`, `emergencyId`, `postId`, or generic `id` can become the returned `projectId`. |
| Information gathered | Identifier candidates and warning metadata. |
| Missing information | Entity type, Service Request identity, classification, explicit Project creation evidence, and authoritative request-to-Project link. |
| Classification capability | None. |
| Appointment assumptions | None. |
| Quote assumptions | A quote request ID may stand in as Project identity. |
| Emergency assumptions | Emergency ID may stand in as Project identity. |
| Work Order suitability | No separate Work Order identity. |
| Project suitability | Over-broad: compatibility identity is returned as Project identity even when the source may not be a Project. |
| Recurring Service suitability | No separate identity. |
| Consultation suitability | No separate identity. |

**Critical finding:** The compatibility layer correctly warns about generic
IDs, but it still collapses multiple entity types into `projectId`. Under the
new principle, a Service Request ID, Conversation ID, Quote Request ID,
Emergency ID, and Project ID must remain distinct unless an explicit
authoritative link exists.

## Required Findings

### 1. Paths That Assume Every Lead Becomes a Project

| Location | Project assumption |
| --- | --- |
| `Home.jsx` | Standard intent begins with `postAProject`; all active requests render under `myActiveProjects`. |
| `Upload.jsx` | Intake is titled as a Project, creates `projectTimeline`, and posts success as a Project. |
| `Discover.jsx` open feed | Counts Projects available and routes details to Project Details. |
| `BusinessLeads.jsx` | Lead review is explicitly `project_review`; selected lead opens Project Details. |
| `BusinessDashboard.jsx` | Lead projection sets `project_review` and opens Project Details. |
| `ContractorDashboard.jsx` | Accepted/scheduled/active homeowner requests become `homeownerProject` jobs. |
| `leadReconciliation.js` | All lead source records normalize through Project identity. |
| `projectIdentity.js` | Multiple non-Project identifiers are promoted to a `projectId` compatibility result. |

### 2. Paths That Assume Every Lead Becomes a Quote

| Location | Quote assumption |
| --- | --- |
| `Upload.jsx` | Every standard post is created with `post_type: "quote_request"` and `quotesReceived`. |
| `QuoteRequests.jsx` | The lead source is exclusively `/contractor-quote-requests`. |
| `Discover.jsx` open feed | Professional action is labeled `messageQuote`. |
| `BusinessLeads.jsx` | Selected lead is stored as `selectedQuoteRequest`; accepted quote closes the lead. |
| `BusinessDashboard.jsx` | Selected lead is stored as `selectedQuoteRequest`. |
| `Home.jsx` | Standard status language begins with `Awaiting quotes`, and every request card displays quote count. |
| `leadReconciliation.js` | Accepted quote evidence is a universal lead-closure signal. |

### 3. Paths That Lack Classification

All reviewed intake and processing paths lack an explicit classification
decision with provenance.

No reviewed record reliably stores:

- neutral Service Request identity;
- customer intent as a distinct field;
- information-sufficiency result;
- classification type;
- classification evidence;
- classification actor/authority;
- classification timestamp;
- selected operational path;
- reclassification history.

### 4. Paths That Already Support Classification

No reviewed path supports authoritative classification.

The following are **partial capabilities**, not classification:

| Capability | Evidence | Limitation |
| --- | --- | --- |
| Industry category capture | `Upload.jsx`, `Discover.jsx`, `BusinessLeads.jsx` | Category is used for filtering/routing and is treated as workflow-adjacent. |
| Dedicated Emergency lane | `Home.jsx`, `BusinessDashboard.jsx`, `ContractorDashboard.jsx` | Customer or route selection precedes structured information-based classification. |
| Appointment type choices | `ContractorDashboard.jsx` | Types are manually selected downstream and default to walkthrough. |
| Consultation schedule type | `ContractorDashboard.jsx` | Consultation is an appointment type, not a request classification. |
| Relationship-first messaging | `Discover.jsx` business directory | Conversation can precede a lead/Project, but no Service Request or classification handoff exists. |
| Identity warning metadata | `leadReconciliation.js`, `projectIdentity.js` | Warns about unsafe identity but still uses Project-centric output. |

### 5. Information Sufficiency Gaps

Across standard intake, the system cannot reliably answer:

- What outcome does the customer need?
- Is the condition urgent or unsafe?
- Is the request one-time or recurring?
- Is the scope sufficiently defined to authorize work?
- Is an inspection, consultation, or appointment required?
- Is pricing already known or governed by an agreement?
- Is a quote necessary?
- Who may authorize the work?
- Who requires access or visibility?
- Is dispatch appropriate?
- Is this maintenance under an existing responsibility?
- What completion evidence is required?
- What obligations define Closure?

Because these answers are absent, the implementation cannot distinguish a
missing required appointment from an appointment that does not apply.

### 6. Request Types That Cannot Currently Be Represented

| Request type | Current representation gap |
| --- | --- |
| Unclassified Service Request | No neutral pre-classification record or status |
| Work Order | Can resemble an active job, but has no classification, authority, or identity |
| Recurring Service | Categories exist, but no recurrence terms, agreement, series, or occurrence identity |
| Transportation Service | `privateTransportation` category exists, but intake still creates a Project quote request |
| Maintenance Request | Property-management category exists, but responsibility, asset/unit context, authorization, and maintenance classification do not |
| Consultation | Exists only as a schedule appointment type |
| Inspection Needed | No classification or information-sufficiency outcome |
| Care Visit | Home health category exists, but a visit is forced into Project/quote terminology |
| Emergency Cleanup | Cleaning category and emergency lane exist separately; no evidence-based bridge between them |
| Reclassified Request | No explicit transition from Service Request to a different operational path |
| Known-price service | Standard intake still assumes quote collection |
| Agreement-authorized service | No path for recurring or contract authority to replace a quote |

## Classification Gap Summary

| Gap | Impact | Severity |
| --- | --- | --- |
| No neutral Service Request entity/read shape | Project and quote assumptions begin at intake | Critical |
| No classification field or evidence | Operational path cannot be audited | Critical |
| Category used as primary routing signal | Industry labels can be mistaken for workflow | High |
| Quote request is the universal standard post type | Non-quote paths cannot enter standard lead flow | Critical |
| Project Details is the universal lead review destination | Classification is bypassed before downstream action | High |
| Appointment need is not derived from sufficiency | Appointments can be over-required, skipped, or defaulted | High |
| Identity utilities collapse entities into `projectId` | Non-Project requests can acquire false Project identity | Critical |
| Emergency classification is customer/route selected | Urgency is not consistently evidence-based | High |
| No recurrence or agreement evidence | Recurring services cannot be modeled safely | High |
| No Work Order or Maintenance Request identity | Simple/managed work is forced into Project/job shapes | High |
| No reclassification history | New information cannot change paths audibly | High |
| Title/description fallback joins | Source records may be associated incorrectly | High |

## Recommended Future Classification Model

```text
Service Request
  -> Information Gathering
  -> Classification
```

Possible outputs:

```text
Classification
  -> Project
  -> Work Order
  -> Recurring Service
  -> Emergency
  -> Consultation
  -> Transportation Service
  -> Maintenance Request
  -> Future approved workflow type
```

### Minimum Future Read Contract

This audit does not approve a schema. A future pure read/validation contract
should nevertheless distinguish:

| Concern | Required meaning |
| --- | --- |
| `serviceRequestId` | Stable identity of intent/request before classification |
| `intent` | Customer-stated outcome or need |
| `information` | Structured and source-preserving facts gathered |
| `informationSufficiency` | What is known, unknown, and sufficient for the next decision |
| `classification` | Selected operational path |
| `classificationEvidence` | Facts and policy supporting the decision |
| `classificationAuthority` | Human/system authority responsible for the decision |
| `classifiedAt` | Occurrence time of classification |
| `operationalRef` | Explicit link to Project, Work Order, Emergency, or other aggregate after creation |
| `warnings` | Missing, conflicting, inferred, or legacy evidence |

The Service Request must remain distinct from the operational aggregate it may
later create.

## Product Decisions Required Before Enforcement

The following cannot be inferred safely from current code:

1. Which information is sufficient for each classification?
2. Who has authority to classify or reclassify?
3. When may automation recommend versus apply a classification?
4. Which operational paths require quotes?
5. Which paths permit known-price or agreement-based authorization?
6. Which conditions require inspection, consultation, or appointment?
7. How Emergency classification is confirmed or downgraded.
8. Whether a Lead exists before classification, after classification, or only
   when a professional relationship opportunity is created.
9. How a Service Request links to one or more operational aggregates.
10. How legacy `homeownerRequests`, posts, and quote requests are displayed
    without pretending they are already Projects.

No runtime enforcement should proceed until these decisions are approved.

## Recommended Lead Phase 3

**Lead Phase 3 - Pure Service Request Classification Read Contract and Legacy
Characterization**

Safe scope:

1. Create a pure, non-persisting Service Request read contract.
2. Create a pure classification-readiness validator.
3. Adapt representative legacy shapes from:
   - posts;
   - contractor quote requests;
   - homeowner requests;
   - emergency requests;
   - relationship-first business conversations;
   - schedule-derived records.
4. Report:
   - available intent evidence;
   - missing information;
   - information-sufficiency status;
   - possible classifications;
   - unsafe category-derived assumptions;
   - Project/quote assumptions;
   - identity and provenance warnings.
5. Preserve all records as `UNCLASSIFIED` when evidence is insufficient.
6. Do not select an operational path automatically.
7. Do not import the contract into runtime pages.
8. Do not modify `leadReconciliation.js` or `projectIdentity.js` until the new
   entity and identity boundaries are approved.

Suggested result shape:

```js
{
  serviceRequestId,
  intent,
  informationSufficiency,
  classificationStatus,
  classificationCandidates,
  currentLegacyAssumptions,
  blockers,
  warnings,
  provenance
}
```

## Decision

Lead Phase 2 confirms that current standard intake is Project-first and
quote-first.

The system has useful downstream capabilities for emergency, consultation,
scheduling, and active work, but it does not yet have a Request
Classification layer.

Lead workflow compliance must remain warning-only. It must not enforce
Project-style appointment, quote, or Project creation rules across every
request type.

