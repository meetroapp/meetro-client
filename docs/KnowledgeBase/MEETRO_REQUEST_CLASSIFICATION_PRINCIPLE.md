# Meetro Request Classification Principle

**Status:** Authoritative Knowledge Base principle, William-approved  
**Scope:** Request intake, information gathering, operational classification,
and workflow routing  
**Runtime effect:** None

## Meetro Classification Principle

Intent initiates the **Service Request**.

Information determines classification.

Category provides context but does not determine classification.

A Service Request is not automatically a Project. Meetro gathers enough
information to identify the supported operational path or preserve uncertainty
when the evidence is insufficient.

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

The customer expresses what they need. Meetro uses available evidence,
information sufficiency, urgency, complexity, scope, and operational
requirements to support classification.

Categories inform classification. They do not control it.

## Why Service Request Is the Intake Concept

`Service Request` is the neutral intake concept for customer intent. It does
not assume:

- project scope;
- a required appointment;
- a quote;
- a particular industry;
- a one-time engagement;
- an emergency;
- a specific execution model.

Calling every request a Project forces Project concepts onto work that may be
transactional, recurring, consultative, urgent, or operationally simple.

## Classification Is Information-Driven

Categories do not determine workflow. Information determines classification.

Industry or service category may help Meetro ask relevant questions, but it
must not dictate the operational path by itself. Classification depends on
facts such as:

- requested outcome;
- scope and complexity;
- urgency and safety;
- location;
- timing;
- recurrence;
- dependencies;
- known and unknown conditions;
- required participants;
- pricing sufficiency;
- inspection or consultation need;
- authorization and access;
- applicable commitments and closure obligations.

The same category may produce different operational paths.

Classification confidence must reflect the quality and completeness of the
available evidence. A plausible category match is not sufficient evidence for
a confident classification.

## Possible Operational Classifications

A Service Request may be classified as:

- Project;
- Work Order;
- Recurring Service;
- Emergency;
- Consultation;
- Transportation Service;
- Maintenance Request;
- Future Workflow Types.

Classification types are operational paths, not customer identities, industry
labels, or display categories. Future types may be added without changing the
principle that information precedes classification.

## Meetro Information Sufficiency Principle

Information gathering comes before commitment.

Information gathering comes before classification confidence.

When information is insufficient:

- Unknown is valid;
- human review is valid;
- Consultation is valid;
- Appointment is valid.

Meetro should never force a classification when evidence is insufficient.

Unknown is not a failed workflow state. It is an honest representation that
the current evidence does not yet support a responsible operational decision.

Consultation and Appointment are valid next information-gathering steps. They
must not be treated as mandatory stages for every category or as proof that a
Project already exists.

Human review is required when the request is high-risk, unclear, conflicting,
or outside approved classification policy. Review may confirm a candidate,
request more information, or preserve Unknown.

## Appointment and Quote Rules

Appointment need is based on information sufficiency, not industry category.

An appointment, consultation, inspection, or site visit is needed when the
available information is insufficient for the next responsible decision. It
must not be required merely because a request belongs to a particular trade or
category.

A quote or proposal is also conditional. Some requests may proceed through:

- known pricing;
- an approved rate;
- a recurring-service agreement;
- a dispatch or work-order authority;
- an emergency authorization;
- another approved decision mechanism.

Information Gathering is required even when Appointment or Quote is skipped.

## Classification Examples

### 1. Airport Ride

**Intent:** Need transportation  
**Classification:** Transportation Service  
**Operational meaning:** The request may require pickup, destination, passenger,
vehicle, accessibility, timing, and price information.  
**Project status:** Not a Project.

### 2. Cleaning

**Intent:** Need cleaning

Depending on condition, scope, urgency, recurrence, and information
sufficiency, classification may be:

- Work Order;
- Recurring Service;
- Project;
- Emergency Cleanup;
- Inspection Needed.

A routine cleaning category does not prove that the work is simple. A complex
restoration or hazardous cleanup category does not prove that every request
requires the same inspection path.

### 3. Property Management

**Intent:** Tenant reports an issue

Depending on urgency, responsibility, condition, access, and scope,
classification may be:

- Maintenance Request;
- Emergency;
- Inspection;
- Project;
- Recurring Service.

A tenant leak may become an Emergency, Maintenance Request, Work Order, or
Project. The report itself does not establish the path.

### 4. Contractor

**Intent:** Need remodel or repair

Depending on scope and information sufficiency, classification may be:

- Consultation;
- Work Order;
- Project;
- Emergency.

A remodel will commonly become a Project. A defined minor repair may remain a
Work Order.

### 5. Home Health Care

**Intent:** Need care support

Depending on needs, recurrence, authorization, assessment, and participant
requirements, classification may be:

- Consultation;
- Recurring Service;
- Care Visit;
- Review Needed.

The request must not be forced into Project terminology merely because it
contains scheduled work and ongoing commitments.

## Classification Boundaries

1. Intent is customer-provided or responsibly captured on the customer's
   behalf.
2. A Service Request records the need before an operational path is known.
3. Information Gathering resolves material unknowns.
4. Classification must preserve the evidence used to choose the path.
5. Classification must not create a Project unless Project criteria are met.
6. A category may guide questions but cannot select the workflow.
7. Appointment need follows information sufficiency.
8. Quote need follows pricing and decision requirements.
9. Emergency handling may accelerate the path but does not eliminate identity,
   authorization, evidence, completion, closure, or history requirements.
10. Reclassification must be explicit and historically visible when new
    information changes the operational path.
11. Classification does not itself grant Conversation access, create customer
    identity, or establish relationship authority.
12. Dashboard, Command Center, Chat, and Work Center may display
    classification but do not own it.
13. Classification confidence must not exceed the available evidence.
14. Unknown must remain available when information is insufficient.
15. Consultation, Appointment, and human review may gather missing information
    without creating a Project or other operational aggregate.

## Operational Ownership

| Concern | Authority |
| --- | --- |
| Customer intent | Service Request intake authority |
| Request information | Service Request / Information authority |
| Classification decision | Approved operational classification authority |
| Operational execution | The selected workflow owner |
| Completion | Selected workflow completion authority |
| Closure | Obligation and closure authority |
| History | Canonical event and history projection authority |
| Relationship continuity | Relationship authority |

The eventual backend aggregate and authority model remain product and
architecture decisions. This principle defines the required separation; it
does not create a schema.

## Why This Matters Before Lead Phase 2

Lead Phase 2 should not enforce Project-style workflow on every request.

Before recommending an appointment, quote, work order, Project, or Emergency
path, Lead Phase 2 must evaluate:

- intent;
- information sufficiency;
- classification;
- operational path.

Warning-only compliance must distinguish between:

- a genuinely missing workflow stage; and
- a stage that does not apply to the classified path.

For example, the absence of a Project appointment is not a violation for an
airport ride with sufficient pickup, destination, timing, passenger, and
pricing information. Likewise, a quote must not be required when an approved
recurring-service agreement or emergency authorization already governs the
decision.

Until classification policy and evidence are available, Lead Phase 2 may
report uncertainty but must not label every non-Project path noncompliant.

## Why This Matters Before Lead Phase 4

Lead Phase 4 must not adopt classification into UI or workflow until William
reviews the model, its evidence rules, and its operational consequences.

Lead Phase 4 should only audit readiness and identify where classification
could safely be:

- read from authoritative evidence in the future;
- displayed as advisory information in the future;
- recommended for human review in the future.

Lead Phase 4 must not:

- make classification authoritative;
- create a Project, Work Order, quote, appointment, or other workflow record;
- change routing, storage, status, or workflow behavior;
- infer confidence from category alone;
- replace Unknown with a forced operational path.

The approved principles define how classification must eventually behave.
They do not approve runtime adoption.
