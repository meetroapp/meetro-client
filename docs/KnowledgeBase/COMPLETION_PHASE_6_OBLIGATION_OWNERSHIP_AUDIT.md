# Completion Phase 6 - Obligation Ownership and Adapter Readiness Audit

## Status

- Architecture audit only
- No runtime adoption
- No adapters created
- No persistence or ownership implementation
- No Closure authority selected

## Executive Summary

Meetro has pure contracts that can measure Closure readiness and evidence
provenance, but the application does not yet have authoritative owners for most
Closure obligations.

Current Completion behavior records work performed, photos, notes, totals, and
self-reported payment state. It then moves records into completed/history
presentation and archives related conversations. That behavior does not prove
that every obligation has been fulfilled.

The future ownership rule should be:

> The operational aggregate owns Closure state. Each obligation-owning domain
> owns its evidence and resolution. A Closure coordinator may verify that all
> applicable obligations are resolved, but presentation modules never
> authorize Closure.

`closureReadinessContract.js` can evaluate an already-reviewed obligation set.
It does not decide which obligations apply or who can resolve them.

`obligationEvidenceProvenance.js` can reject weak evidence. It does not turn a
claim, label, document, or review into authority.

## Current Architecture Findings

### Completion

`CompletionSheet.jsx` currently:

- creates a client-generated completed record;
- captures photos, notes, amount, labor, and materials;
- defaults `paymentReceived` to `yes`;
- writes completed records and revenue counters;
- marks a schedule item completed;
- creates a closeout conversation card awaiting confirmation;
- sets `warrantyOffered: true`;
- archives conversation and emergency state;
- moves the Work Center to its completed tab.

Completion is therefore an evidence producer and workflow transition point.
It is not a reliable payment, confirmation, warranty, permit, inspection, or
Closure authority.

### Work Center

`ContractorDashboard.jsx` reads completed work, revenue, records, approvals,
documents, and history from fragmented local sources. Its selectors explicitly
identify Scheduling, Quotes, Work, Completion, and Timeline as external owners.

Work Center may summarize obligations and recommend action. It must not create
obligation policy, verify domain evidence, or authorize Closure.

### Command Center

`BusinessCommandCenter.jsx` is a navigation shell. Its Permit and Follow-Up
tools route to Work Center Records or Schedule. The labels do not establish
Permit or Follow-Up domains.

Command Center may navigate to future obligation owners. It must not own or
resolve obligations.

### Project Gallery

`ProjectGallery.jsx` owns contractor portfolio presentation and image upload.
Portfolio entries are not Project Folder documents, operational evidence, or
Closure records.

Project Gallery must remain outside Closure authority.

### Workflow Commands

`workflowCommands.js` provides compatibility commands for project links,
timeline events, activation, and completion. `completeProject()` only appends a
project/completion link. It does not review obligations or authorize Closure.

No current command establishes a canonical Closure decision.

### Identity

`projectIdentity.js` can fall back through request, job, quote, conversation,
emergency, post, and generic IDs. That compatibility behavior is too broad for
Closure authority.

Future obligation adapters require an explicit canonical operational aggregate
ID and aggregate type. A conversation ID, title, customer name, or generic ID
must not become aggregate identity.

## Ownership Model

Each obligation has four distinct responsibilities:

1. **Applicability owner** determines whether the obligation applies to the
   operational aggregate.
2. **Evidence owner** creates or acknowledges authoritative evidence.
3. **Resolution owner** changes the obligation state to resolved, waived, or
   disputed.
4. **Closure coordinator** verifies the reviewed obligation set without
   replacing the three domain owners above.

The operational aggregate owns the final Closure state:

- Project aggregate for Projects;
- Work Order aggregate for Work Orders;
- Emergency aggregate for Emergencies;
- Recurring Service instance or cycle aggregate for Recurring Services;
- future operational aggregate for future workflow types.

## Obligation Ownership Audit

### 1. Customer Confirmation

| Field | Audit result |
| --- | --- |
| Current owner | None. Completion creates an awaiting-confirmation card; Conversation presents it |
| Implied owner | Completion closeout UI |
| Correct future owner | Participant decision/Completion confirmation authority attached to the operational aggregate |
| Evidence authority | Authenticated customer decision with participant authorization |
| Adapter required? | Yes: confirmation-event to obligation-evidence adapter |
| Closure relevance | Conditional or required according to aggregate policy; policy is not selected here |
| Human review | Required for missing identity, conflicting decisions, proxy decisions, exceptions, or waiver |
| Identity requirements | Aggregate ID/type, customer participant ID, confirmation event ID |
| Provenance requirements | Authenticated actor, authorization-derived role, occurrence time, backend recorded time, decision status |

The current display card can create an open-state signal only. It cannot prove
confirmation.

### 2. Tenant Confirmation

| Field | Audit result |
| --- | --- |
| Current owner | None |
| Implied owner | Conversation or property-management workflow |
| Correct future owner | Tenant participation authority within Maintenance Request, Work Order, Emergency, or Project context |
| Evidence authority | Authenticated tenant decision under role-scoped access |
| Adapter required? | Yes: tenant-participation decision adapter |
| Closure relevance | Conditional; especially relevant to occupied-property workflows |
| Human review | Required for inaccessible tenant, property-manager override, disputed condition, or safety exception |
| Identity requirements | Aggregate ID/type, tenant participant ID, property relationship ID |
| Provenance requirements | Authenticated actor, tenant role, access scope, decision event, occurrence and recorded times |

This requires a missing tenant/property participation domain. Customer identity
or property-manager identity must not be substituted for tenant identity.

### 3. Payment

| Field | Audit result |
| --- | --- |
| Current owner | Completion form stores a self-reported value; completed history displays revenue |
| Implied owner | Completion or Work Center revenue |
| Correct future owner | Invoice/payment settlement domain |
| Evidence authority | Payment processor, ledger, or approved external payment evidence |
| Adapter required? | Yes: payment receipt/settlement adapter; claims adapter may report review-only state |
| Closure relevance | Conditional based on operational and commercial policy |
| Human review | Required for cash, partial payment, refund, chargeback, dispute, offline evidence, or waiver |
| Identity requirements | Aggregate ID/type, invoice ID, payment/transaction ID, payer/payee references |
| Provenance requirements | Settlement authority, amount/currency, status, external reference, occurrence and recorded times |

`paymentReceived: "yes"` is a claim, not settlement authority. Revenue totals
are presentation and must not resolve Payment.

### 4. Permit

| Field | Audit result |
| --- | --- |
| Current owner | None; Command Center exposes a label and Work Center exposes generic records |
| Implied owner | Command Center Permit tool or Project Records |
| Correct future owner | Permit lifecycle domain linked to the operational aggregate |
| Evidence authority | Jurisdictional permit authority or explicit external permit evidence |
| Adapter required? | Yes: permit lifecycle/result adapter |
| Closure relevance | Conditional but blocking when required and still open |
| Human review | Required for jurisdiction mismatch, expired permit, unresolved corrections, missing closeout, or exception |
| Identity requirements | Aggregate ID/type, permit ID, jurisdiction ID, application/reference ID |
| Provenance requirements | Permit authority, status transition, artifact/reference, occurrence and recorded times |

Permit scans in Project Folder may support documentation. They do not establish
permit status.

### 5. Inspection

| Field | Audit result |
| --- | --- |
| Current owner | None |
| Implied owner | Permit/records presentation |
| Correct future owner | Inspection lifecycle domain, optionally related to Permit |
| Evidence authority | Inspection authority or explicit external inspection result |
| Adapter required? | Yes: inspection result adapter |
| Closure relevance | Conditional but blocking when required, failed, or awaiting reinspection |
| Human review | Required for conditional pass, correction notice, reinspection, conflicting results, or missing signed result |
| Identity requirements | Aggregate ID/type, inspection ID, permit ID when applicable, inspector/authority ID |
| Provenance requirements | Result authority, result artifact, occurrence and backend/external recorded times |

The Phase 5 fixture showed that a properly attributed external inspection result
can be authoritative. No current runtime module owns that result.

### 6. Warranty Handoff

| Field | Audit result |
| --- | --- |
| Current owner | None; Completion sets `warrantyOffered: true` |
| Implied owner | Completion closeout card or Project Folder |
| Correct future owner | Warranty/document handoff domain |
| Evidence authority | Warranty issuer/document authority plus recipient acknowledgement |
| Adapter required? | Yes: warranty delivery and acknowledgement adapter |
| Closure relevance | Conditional based on work type and warranty policy |
| Human review | Required for declined acknowledgement, multiple recipients, missing terms, exception, or disputed coverage |
| Identity requirements | Aggregate ID/type, warranty ID/version, issuer ID, recipient participant ID |
| Provenance requirements | Document reference, delivery event, acknowledgement event, actor roles, occurrence and recorded times |

Offering a warranty is not handoff. Document existence without acknowledgement
is incomplete evidence.

### 7. Documentation Delivery

| Field | Audit result |
| --- | --- |
| Current owner | Completion owns captured work artifacts; Project Folder ownership is fragmented; Project Gallery is portfolio-only |
| Implied owner | Completion, Work Center Records, or Project Gallery |
| Correct future owner | Project Folder/document requirements domain; Completion remains owner of completion artifacts it creates |
| Evidence authority | Document service or Project Folder authority with explicit delivery/completeness evidence |
| Adapter required? | Yes: completion-artifact adapter and required-document delivery adapter |
| Closure relevance | Universal review category, with required documents varying by aggregate |
| Human review | Required for missing checklist policy, unreadable files, wrong version, wrong recipient, or waived requirement |
| Identity requirements | Aggregate ID/type, document ID/version, requirement ID, recipient when delivery is claimed |
| Provenance requirements | Creator/deliverer, document authority, artifact reference, delivery/acknowledgement times |

Completion photos are useful supporting evidence. Project Gallery uploads are
not operational documents.

### 8. Follow-Up

| Field | Audit result |
| --- | --- |
| Current owner | Scheduling records visit outcomes; Command Center routes reminders to Schedule; Conversation may show requests |
| Implied owner | Work Center Schedule or Conversation |
| Correct future owner | Task/scheduling obligation domain linked to the operational aggregate |
| Evidence authority | Task owner or Scheduling authority |
| Adapter required? | Yes: follow-up task lifecycle adapter |
| Closure relevance | Universal when an explicit required follow-up remains open |
| Human review | Required for overdue, declined, reassigned, canceled, inaccessible participant, or ambiguous completion |
| Identity requirements | Aggregate ID/type, follow-up task ID, schedule ID when applicable, responsible participant |
| Provenance requirements | Task creation source, assignee, status transition actor, occurrence and recorded times |

A Conversation message can request follow-up. It cannot establish follow-up
completion.

### 9. Utility Approval

| Field | Audit result |
| --- | --- |
| Current owner | None |
| Implied owner | Generic records or external paperwork |
| Correct future owner | Utility approval/integration domain |
| Evidence authority | Utility provider or explicit external utility authority |
| Adapter required? | Yes: utility approval status adapter |
| Closure relevance | Conditional; blocking when required |
| Human review | Required for provider ambiguity, conditional approval, expiration, service delay, or external-only evidence |
| Identity requirements | Aggregate ID/type, utility/provider ID, approval/application ID |
| Provenance requirements | Provider authority, approval artifact/reference, status, occurrence and recorded times |

This is an entirely missing domain in the current client.

### 10. Dispute Resolution

| Field | Audit result |
| --- | --- |
| Current owner | None; Conversation and records may contain issue signals |
| Implied owner | Conversation, invoice display, or project records |
| Correct future owner | Dispute/change-resolution domain appropriate to the dispute type |
| Evidence authority | Authorized settlement, participant decision, change-order, or external resolution authority |
| Adapter required? | Yes: dispute lifecycle and resolution adapter |
| Closure relevance | Universal when a dispute exists; unresolved dispute blocks Closure |
| Human review | Required for all conflicting, legal, payment, scope, safety, or participant-resolution cases |
| Identity requirements | Aggregate ID/type, dispute ID, related invoice/change/order IDs, participant IDs |
| Provenance requirements | Issue classification, owner, decisions, resolution terms, confirmations, occurrence and recorded times |

Issue disappearance, completed status, or conversation archive must never imply
resolution.

### 11. Emergency Review

| Field | Audit result |
| --- | --- |
| Current owner | Emergency completion flags review need; review belongs to relationship presentation |
| Implied owner | Emergency completion or Conversation |
| Correct future owner | Relationship/review domain |
| Evidence authority | Authenticated review/feedback authority |
| Adapter required? | No Closure-resolution adapter. Optional Relationship History adapter only |
| Closure relevance | Not Closure evidence by itself |
| Human review | Required only for review moderation or when review content separately raises a dispute/safety signal |
| Identity requirements | Relationship/conversation ID, review ID, actor ID; aggregate link may provide context |
| Provenance requirements | Authenticated reviewer, review event ID, occurrence and recorded times |

Emergency aggregate Closure must be evaluated independently. Review submission
may create relationship history or a new dispute signal, but cannot close the
Emergency.

## Adapter Readiness

| Future adapter | Source readiness | Adapter readiness | Primary blocker |
| --- | --- | --- | --- |
| Completion artifact | Partial | PARTIAL | Canonical aggregate and backend recording provenance |
| Customer confirmation | Awaiting-state only | BLOCKED | No authoritative participant decision event |
| Tenant confirmation | Missing | BLOCKED | No tenant participation domain |
| Payment settlement | External fixture demonstrates shape | PARTIAL | No client payment settlement owner |
| Permit lifecycle | Presentation only | BLOCKED | No Permit domain |
| Inspection result | External fixture demonstrates shape | PARTIAL | No runtime Inspection domain |
| Warranty handoff | Offer flag only | BLOCKED | No delivery/acknowledgement authority |
| Document delivery | Artifact sources exist | PARTIAL | No required-document checklist/delivery authority |
| Follow-up task | Scheduling signals exist | PARTIAL | No post-completion task obligation owner |
| Utility approval | Missing | BLOCKED | No Utility domain |
| Dispute resolution | Signals only | BLOCKED | No dispute lifecycle/resolution owner |
| Emergency review history | Review state exists | PARTIAL outside Closure | Must remain relationship-only |

`PARTIAL` means a future adapter shape is identifiable. It does not approve
runtime connection.

## Future Ownership Candidates

The following have credible ownership candidates based on current architecture:

- Completion owns work-performed artifacts.
- Project Folder/document authority can own operational document storage and
  delivery evidence.
- Scheduling/task authority can own Follow-Up lifecycle.
- Invoice/payment authority can own payment settlement.
- Participant decision authority can own customer confirmation.
- Tenant participation/maintenance authority can own tenant confirmation.
- Relationship/review authority can own Emergency Review outside Closure.

These are ownership candidates, not current implemented authorities.

## Entirely Missing or Materially Incomplete Domains

The following require explicit future domain ownership:

- Closure coordination and authorization;
- Permit lifecycle;
- Inspection lifecycle;
- utility approval/integration;
- warranty delivery and acknowledgement;
- required-document checklist and recipient delivery;
- tenant/property participant decisions;
- post-completion follow-up obligation lifecycle;
- dispute/change/payment resolution;
- authoritative invoice/payment settlement where backend evidence is absent.

These domains should not be simulated by adding flags to Dashboard, Work
Center, Command Center, Conversation, or History.

## Operational Path Applicability

The table below describes possible applicability only. It does not select
mandatory policy.

| Obligation | Project | Work Order | Emergency | Recurring Service |
| --- | --- | --- | --- | --- |
| Customer Confirmation | Possible | Possible | Possible | Per visit/cycle or exception |
| Tenant Confirmation | Property-dependent | Property-dependent | Property-dependent | Property-dependent |
| Payment | Possible | Possible | Possible | Per invoice/cycle |
| Permit | Common for regulated scope | Possible | Possible after emergency stabilization | Rare but possible |
| Inspection | Common for regulated scope | Possible | Possible after emergency stabilization | Rare but possible |
| Warranty Handoff | Possible | Possible | Possible | Service-plan dependent |
| Documentation Delivery | Universal review category | Universal review category | Universal review category | Per visit/cycle and relationship record |
| Follow-Up | Universal when required | Universal when required | Universal when required | Often part of the service cycle |
| Utility Approval | Scope-dependent | Scope-dependent | Possible | Scope-dependent |
| Dispute Resolution | Universal when disputed | Universal when disputed | Universal when disputed | Universal when disputed |
| Emergency Review | Relationship-only | Relationship-only | Relationship-only | Relationship-only |

### Inside Operational Aggregate Lifecycle

The aggregate should track whether applicable obligations are open, resolved,
waived, disputed, or unknown. This includes:

- customer and tenant confirmation when applicable;
- payment when Closure policy requires it;
- permits and inspections;
- warranty handoff;
- required documentation;
- follow-up tasks;
- utility approval;
- disputes.

The aggregate references authoritative evidence; it does not take ownership
away from each evidence domain.

### Outside Project Lifecycle

The following are not inherently Project-owned:

- Emergency Review, which belongs to Relationship;
- payment settlement, which belongs to Invoice/Payment;
- permits and inspections, which belong to regulatory lifecycle domains;
- tenant participation, which belongs to property/participant authority;
- utility approval, which belongs to the utility domain.

Projects may reference these obligations. Reference does not equal domain
ownership.

## Modules That Must Never Become Closure Authority

- Dashboard
- Work Center tab
- Command Center
- Project Gallery
- Conversation card
- History list
- localStorage key or archive flag
- generic Project Records view
- review submission
- revenue counter

These surfaces may read, summarize, warn, recommend, or navigate. They must not
verify domain evidence or authorize Closure.

## Closure Authority Matrix

Legend:

- **Allowed**: appropriate responsibility.
- **Conditional**: permitted only as a projection of authoritative domain data.
- **Prohibited**: must never be treated as authority.

| Module | Read | Recommend | Verify | Authorize Closure |
| --- | --- | --- | --- | --- |
| Dashboard | Allowed: summary only | Allowed: attention/review recommendation | Prohibited | Prohibited |
| Work Center | Allowed: operational projection | Allowed: next action and blocker recommendation | Prohibited; may display verification state | Prohibited |
| Command Center | Allowed: tool/navigation status | Allowed: route user to owner | Prohibited | Prohibited |
| Project Folder | Allowed: documents and evidence references | Allowed: identify missing required documents | Conditional: verify document integrity/delivery only | Prohibited |
| Completion | Allowed: work evidence and completion state | Allowed: request confirmation or obligation review | Conditional: verify artifacts it created, not external obligations | Prohibited |
| History | Allowed: durable read projection | Prohibited as workflow recommendation authority | Prohibited | Prohibited |
| Future Closure Domain | Allowed: aggregate obligation state | Allowed: readiness/blocker recommendation | Allowed: verify provenance-qualified resolutions from owners | Conditional: only through explicit operational aggregate policy and authorized actor/system decision |

### Allowed Responsibilities

- Dashboard and Work Center may surface open-obligation counts.
- Command Center may navigate to Permit, Inspection, Payment, Task, Document,
  or Dispute owners.
- Project Folder may verify document presence, integrity, version, and delivery
  within its domain.
- Completion may verify that its own artifacts were captured.
- History may retain the final decision and supporting references.
- Future Closure coordination may evaluate the complete obligation set.

### Prohibited Responsibilities

- No presentation module may convert a label into evidence.
- Work Center may not resolve obligations because an item moved to Completed.
- Command Center may not own Permit or Follow-Up because it displays tools with
  those names.
- Project Folder may not interpret a document as regulatory approval.
- Completion may not treat work performed as obligations fulfilled.
- History may not make a record closed because it exists in history.
- Future Closure coordination may not invent evidence or override a domain
  owner silently.

## Identity Requirements for All Future Adapters

Every adapter must require:

- canonical aggregate ID;
- explicit aggregate type;
- stable evidence or decision ID;
- stable obligation or domain entity ID;
- authenticated actor ID where an action or confirmation is claimed;
- authorization-derived actor role;
- source domain and authority;
- occurrence timestamp;
- backend or external recorded timestamp;
- explicit status;
- required artifact or confirmation references.

Adapters must reject or quarantine:

- title matching;
- customer-name matching;
- conversation ID treated as project ID;
- request ID silently promoted to project ID;
- generic `id` with unknown entity type;
- current-viewer actor inference;
- client-only display time;
- display status, archive state, history placement, or review state as evidence.

## Human Review Boundaries

Human review remains required for:

- obligation applicability policy;
- waiver authority;
- customer or tenant exceptions;
- cash/offline payment evidence;
- conflicting participant decisions;
- regulatory exceptions or conditional approvals;
- inspection corrections and reinspection;
- warranty acknowledgement exceptions;
- document completeness disputes;
- overdue or canceled follow-up;
- utility-provider ambiguity;
- disputes, changes, safety issues, and legal escalation;
- any Closure authorization policy.

This audit does not decide who may waive an obligation or authorize Closure.

## Required Conclusions

### 1. Obligations With Future Ownership Candidates

Customer Confirmation, Tenant Confirmation, Payment, Documentation Delivery,
Follow-Up, and Emergency Review have identifiable candidate owners. Inspection
and external payment also have proven authoritative fixture shapes.

### 2. Obligations Requiring New Domains

Permit, Inspection, Utility Approval, Warranty Handoff, Dispute Resolution,
required-document policy, and Closure coordination require new or materially
expanded domains.

### 3. Obligations Inside Project Lifecycle

All applicable operational obligations should be referenced by the Project
aggregate, but their evidence remains owned by their source domains.

### 4. Obligations Outside Project Lifecycle

Emergency Review is relationship-owned. Payment, regulatory approval,
participant identity, and utility approval remain external domains even when a
Project references them.

### 5. Work Order Applicability

Customer/tenant confirmation, payment, documentation, follow-up, disputes,
warranty, and sometimes permit/inspection/utility obligations may apply.

### 6. Emergency Applicability

Documentation, follow-up, disputes, payment, participant confirmation, and
post-stabilization regulatory obligations may apply. Review submission remains
outside Closure.

### 7. Recurring Service Applicability

Documentation, payment, follow-up, disputes, participant confirmation, and
warranty/service-plan obligations may apply per visit, cycle, or relationship.
Closure must distinguish a completed service occurrence from termination of the
recurring relationship.

### 8. Universal Obligations

No obligation is automatically mandatory for every workflow. Universally,
Meetro must review:

- whether required documentation exists;
- whether explicit follow-ups remain;
- whether a dispute remains unresolved;
- whether unknown obligations require human review.

Universal review does not mean universal requirement.

## Ownership Gaps

1. No canonical operational aggregate currently owns Closure.
2. No applicability policy determines which obligations apply.
3. No waiver-authority policy exists.
4. Current project identity compatibility is insufficient for Closure writes.
5. Completion conflates completion, history movement, and archive actions.
6. Payment is self-reported and defaults to received.
7. Confirmation is represented by card state rather than an authoritative
   participant decision.
8. Permit, Inspection, Utility, Warranty, and Dispute domains are absent.
9. Required-document completeness is not owned.
10. Follow-Up has signals but no post-completion obligation lifecycle.

## Recommended Completion Phase 7

Create a documentation-only **Closure Aggregate and Obligation Registry
Specification**.

Phase 7 should define:

- the read-only shape of an obligation registry attached to any operational
  aggregate;
- references to domain-owned evidence without copying authority;
- obligation applicability status separate from resolution status;
- explicit `Project`, `WorkOrder`, `Emergency`, and `RecurringService`
  aggregate types;
- adapter input/output boundaries;
- unknown and disputed obligation handling;
- waiver and Closure authorization fields as unresolved policy placeholders;
- the separation of Completion, Closure, History, and Relationship.

Phase 7 must not:

- choose mandatory obligations;
- choose who may waive obligations;
- choose who may authorize Closure;
- create adapters or storage;
- connect any runtime module;
- create a new major UI module.

Runtime adapter work should remain blocked until aggregate identity,
applicability ownership, evidence-domain ownership, waiver authority, and
Closure authorization policy are explicitly approved.
