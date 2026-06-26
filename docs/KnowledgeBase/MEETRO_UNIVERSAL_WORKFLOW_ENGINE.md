# Meetro Universal Workflow Engine

**Status:** Authoritative Knowledge Base workflow model, William-approved  
**Scope:** Industry-independent request lifecycle and operational routing  
**Runtime effect:** None

## Universal Model

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

This model evolves the earlier `Request -> Information -> Decision -> Work`
model by making classification explicit. It does not remove Decision,
Appointment, Consultation, Quote, Commitment, or other workflow stages. Those
stages occur inside the selected operational path when required.

## Stage Definitions

| Stage | Meaning |
| --- | --- |
| Intent | The outcome or help a customer is seeking |
| Service Request | Neutral record of intent before operational classification |
| Information Gathering | Collection of facts needed for responsible routing and decision-making |
| Classification | Evidence-based selection of an operational workflow type |
| Operational Path | The path appropriate to the classified request |
| Work | Authorized execution of the service or commitment |
| Completion | Work performed or submitted as complete |
| Closure | Required obligations fulfilled or explicitly resolved |
| History | Durable record of events, evidence, decisions, and outcomes |
| Relationship | Continuing connection strengthened or informed by shared history |

## Operational Paths

Approved or anticipated classifications include:

- Project;
- Work Order;
- Recurring Service;
- Emergency;
- Consultation;
- Transportation Service;
- Maintenance Request;
- Future Workflow Types.

The operational path may contain conditional stages such as:

```text
Communication
  -> Additional Information
  -> Appointment / Consultation / Inspection, if needed
  -> Quote / Proposal / Authorization, if needed
  -> Decision
  -> Commitment
  -> Scheduling / Dispatch
  -> Work
  -> Completion
  -> Closure
```

Skipping an inapplicable conditional stage is not a workflow violation.
Skipping necessary information, authorization, completion evidence, or closure
obligations is a workflow gap.

## Classification Rules

1. Every interaction begins with intent.
2. Intent initiates a Service Request, not automatically a Project.
3. Information determines classification.
4. Category provides context but does not determine classification.
5. Appointment need is based on information sufficiency, not industry
   category.
6. Quote need depends on pricing and decision authority.
7. Classification must be explicit and supported by evidence.
8. Reclassification is allowed when new information changes the appropriate
   path, but the change must remain visible in History.
9. The customer expresses intent; Meetro classifies the operational path
   internally.
10. Project is one operational path among several.
11. Classification is based on available evidence, information sufficiency,
    urgency, complexity, scope, and operational requirements.
12. Categories inform classification. They do not control it.
13. Classification confidence must not exceed the available evidence.
14. Unknown is a valid result when evidence is insufficient.

See
[MEETRO_REQUEST_CLASSIFICATION_PRINCIPLE.md](./MEETRO_REQUEST_CLASSIFICATION_PRINCIPLE.md)
for the complete principle and examples.

## Examples

| Intent | Information-sensitive classification | Project? |
| --- | --- | --- |
| Airport ride | Transportation Service | No |
| Cleaning | Work Order, Recurring Service, Project, Emergency Cleanup, or Inspection Needed | Sometimes |
| Tenant-reported issue | Maintenance Request, Emergency, Inspection, Work Order, or Project | Sometimes |
| Remodel or repair | Consultation, Work Order, or Project | Sometimes |
| Care support | Consultation, Recurring Service, or Care Visit | Not automatically |

Expanded approved examples:

| Category context | Possible information-driven paths |
| --- | --- |
| Cleaning | Work Order, Recurring Service, Project, Emergency Cleanup, or Inspection Needed |
| Transportation | Transportation Service, not automatically Project |
| Property Management | Maintenance Request, Emergency, Inspection, Project, or Recurring Service |
| Contractor work | Consultation, Work Order, Project, or Emergency |
| Home Health Care | Consultation, Recurring Service, Care Visit, or Review Needed |

## Information Sufficiency Principle

Information gathering comes before commitment.

Information gathering comes before classification confidence.

When information is insufficient:

- Unknown is valid;
- human review is valid;
- Consultation is valid;
- Appointment is valid.

Meetro should never force a classification when evidence is insufficient.

Unknown preserves uncertainty without creating workflow authority.
Consultation or Appointment may be recommended as information-gathering steps,
but neither creates a Project or proves that a quote is required.

High-risk, unclear, conflicting, or unsupported requests require human review.
Review may confirm a path, request more information, or retain Unknown.

## Information Before Appointment or Quote

Information Gathering must answer whether the next responsible step is:

- request clarification;
- appointment;
- consultation;
- inspection;
- known-price authorization;
- quote or proposal;
- emergency dispatch;
- recurring-service activation;
- work order;
- Project creation;
- another approved path.

An industry category alone cannot answer that question.

## Ownership Boundaries

| Module or domain | Responsibility | Must not own |
| --- | --- | --- |
| Service Request intake | Capture intent and request evidence | Assume Project classification |
| Classification authority | Select and record operational path | Create identity or access implicitly |
| Selected workflow owner | Execute path-specific decisions and transitions | Rewrite request provenance |
| Work Center | Present and coordinate active operational work | Own every request, classification, or relationship |
| Dashboard | Summarize and navigate | Become workflow or classification authority |
| Command Center | Surface prioritized actions and intelligence | Become Work Center or workflow authority |
| Conversation | Preserve authorized communication and relationship timeline | Infer classification from message text alone |
| Project Folder | Hold Project-scoped evidence and documents | Treat every Service Request as a Project |
| History | Project durable workflow facts | Hide reclassification or unresolved closure obligations |
| Relationship | Preserve durable connection between parties | Treat completion as relationship termination |

## Lead Compliance Implication

Lead compliance must evaluate:

1. captured intent;
2. information sufficiency;
3. classification evidence;
4. selected operational path;
5. only the stages required by that path.

Lead tooling must not enforce a Project-style appointment-and-quote sequence
for all Service Requests. Until classification evidence is authoritative,
compliance should remain warning-only and report uncertainty rather than
inventing a Project path.

## Why This Matters Before Lead Phase 4

Lead Phase 4 is a readiness audit, not an adoption phase.

It must identify where classification could safely be read, displayed, or
recommended in the future. It must not import classification into UI,
workflow, routing, storage, or operational writers.

Before adoption, William must review:

- classification evidence rules;
- information-sufficiency thresholds;
- human-review triggers;
- classification authority;
- operational aggregate creation;
- Unknown and reclassification policy.

No classification recommendation may become an operational commitment merely
because it has high advisory confidence.
