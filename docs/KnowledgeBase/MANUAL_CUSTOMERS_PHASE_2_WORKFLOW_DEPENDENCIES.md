# Manual Customers Phase 2 Workflow Dependency Audit

## Scope

This audit maps the dependencies required for a Manual Customer to participate
in existing Meetro workflows. It introduces no runtime adoption, writes,
routes, UI changes, or workflow decisions.

Phase 1 established that:

- a Manual Customer is an external project participant, not a registered
  homeowner;
- customer/project onboarding owns identity;
- Work Center is an operational consumer;
- every downstream record must use canonical project identity;
- external communication and decisions require explicit source and evidence.

## Executive Finding

All reviewed workflows contain some Manual Customer-compatible presentation or
legacy behavior. None has the identity and authority required for complete
workflow participation.

Scheduling and external quotes are the most developed entry points, but both
currently create source-local records before a durable customer/project
context exists. Conversation, completion, invoice, history, documents, and
Dashboard therefore cannot safely reconcile the same relationship.

Overall workflow readiness is **BLOCKED**.

## Workflow Dependency Matrix

| Workflow | Dependency | Ownership | Current evidence | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| Scheduling | `manualCustomerId`, canonical `projectId`, professional owner, appointment ID, purpose, status, timestamps, contact-confirmation source, outcome | Customer onboarding creates context; Scheduling owns appointment lifecycle | Work Center creates `source: "manual"` schedule rows with schedule ID, display fields, and status. Project linking is skipped when identity is unsafe. | A schedule row becomes the customer record; duplicate names and unrelated jobs cannot be distinguished. | PARTIAL |
| Quotes | Project identity, quote identity, appointment/information eligibility, delivery channel, delivery evidence, external decision actor/source/time/evidence | Quotes owns quote lifecycle; Lead/workflow policy owns eligibility; onboarding supplies customer/project context | Quote Builder creates external quotes and native shares them. Work Center lets the professional mark accepted/revised/declined. | “Shared” is treated as sent; self-reported decisions appear customer-authenticated; acceptance can create active work. | BLOCKED |
| Conversation | Authoritative project relationship, communication mode, actor, channel, visibility, authenticated-account link when available | Project Events owns relationship facts; Conversation projects shared timeline; transport owns delivery | Conversation requires a conversation/request context and persists messages/cards by conversation ID. | Creating a synthetic thread or customer message would misrepresent actor, delivery, and visibility. | BLOCKED |
| Work Center | Supplied manual customer/project read model plus domain-owned schedule, quote, work, completion, history, and document projections | Work Center shell owns selection/orchestration only | Work Center currently creates manual schedules, quote decisions, invitations, active work, materials messages, records, and history views. | It becomes accidental owner of every Manual Customer domain and relies on global state. | PARTIAL |
| Completion | Canonical project and completion IDs, work evidence, finality policy, external/customer confirmation evidence, actor, authoritative time | Completion/Closeout owns transition; History projects accepted final state | Completion Sheet can close schedule-derived work and create generic customer records and counters. | Completion cannot be tied safely to customer/project; confirmation and final history eligibility are ambiguous. | BLOCKED |
| Invoice | Project/customer identity, invoice ID, delivery channel/evidence, payment authority, payment evidence, visibility | Invoice/Payments owns invoice lifecycle; Project Folder projects documents; Timeline records facts | Invoice Builder keys invoice state and workflow card to active Conversation and uses a timestamp ID. | Manual customer without Conversation cannot safely receive or acknowledge an invoice; “sent” and “paid” lack authority. | BLOCKED |
| Project Folder | Canonical project ID, document IDs/types, domain source, visibility, immutable relationship/history events | Domain owners create documents; Project Folder owns project-scoped read projection | Project Details and Work Center Records display photos, quotes, workflow memory, and completion-like data. Records are often conversation-keyed. | Conversation ID can be promoted to request/project context; customer documents fragment across stores. | PARTIAL |
| Dashboard | Authoritative read projections for customer/project count, next action, schedule, quotes, work, and history | Reporting projection; Dashboard only summarizes and navigates | Dashboard counts homeowner requests, schedules, and quote arrays independently. | Partial Manual Customer records could inflate metrics or cause Dashboard to define identity/status. | BLOCKED |

## Scheduling Dependencies

### Required

- canonical `projectId`;
- `manualCustomerId`;
- immutable appointment/schedule ID;
- authenticated professional owner;
- appointment type and purpose;
- scheduled time and location;
- status and outcome;
- creation/update authority;
- external confirmation channel and evidence, when claimed.

### Current Gap

`saveManualScheduleVisit()` creates a schedule ID and source-local fields but
does not require customer or project identity. The shadow project link is
correctly skipped when no safe identity exists.

Schedule ID, title, location, notes, customer name, email, and phone must not
be promoted to project identity.

### Classification

**PARTIAL** for source-local scheduling; **BLOCKED** for project workflow
parity.

## Quote Dependencies

### Required

- canonical project and customer participation;
- information/appointment policy evidence;
- quote ID and revision lineage;
- generation, share, delivery, receipt, and decision as distinct facts;
- external delivery channel;
- decision actor, source, recorded time, and evidence;
- an approved next-action rule after acceptance.

### Current Gap

An external quote is classified partly by missing Conversation identity. Native
share success does not prove delivery or receipt. Professional buttons update
the quote as if the customer accepted, revised, or declined it, without a
separate evidence record.

### Classification

**BLOCKED**.

## Conversation Dependencies

### Required

- project-scoped relationship timeline;
- explicit distinction between authenticated chat and recorded external
  contact;
- actor and actor role;
- communication channel and direction;
- occurrence and persistence timestamps;
- internal/customer-visible visibility;
- evidence reference;
- account-link state.

### Current Gap

Conversation is keyed by a Conversation ID and can send to backend message
routes only when a quote request and receiver exist. Manual customers have
neither guaranteed relationship authority nor authenticated receiver.

Professional-recorded contact must be a project event, not a fabricated
customer message.

### Classification

**BLOCKED**.

## Work Center Dependencies

### Required

- one supplied project context;
- customer display projection;
- identity warnings;
- domain-owned commands and read models;
- no customer conversion or policy authority.

### Current Gap

Work Center is currently the only surface exposing the manual schedule,
external quote, self-reported response, copied invitation, and project-record
paths. This demonstrates product demand but violates ownership boundaries.

### Classification

**PARTIAL** as an operational surface; **BLOCKED** as an owner.

## Completion Dependencies

### Required

- authoritative project/work relationship;
- completion ID distinct from schedule/project IDs;
- completed-by actor;
- submitted/completed/confirmed/follow-up state model;
- external confirmation evidence;
- history finality rule;
- consistent customer and professional visibility.

### Current Gap

Schedule completion can feed Completion Sheet, but completion records may use
generic customer labels and global counters. A Manual Customer cannot provide
authenticated confirmation, and no approved external confirmation standard
exists.

### Classification

**BLOCKED**.

## Invoice Dependencies

### Required

- project and manual customer identity;
- invoice ID and immutable revision/version;
- delivery channel and evidence;
- payment request, viewed, questioned, paid, and disputed state authority;
- professional and customer actors;
- payment evidence and timestamps;
- project document link.

### Current Gap

Invoice Builder reads active Conversation/job state, saves global scalar
fields, and inserts a workflow message under a Conversation key. It cannot
safely support a customer without a Conversation, and it uses Conversation ID
as fallback request identity.

### Classification

**BLOCKED**.

## Project Folder Dependencies

### Required

- canonical project;
- domain-generated document identity;
- document type, source, version, timestamps, and visibility;
- relationship events;
- account-link provenance;
- detail-safe read contracts.

### Current Gap

Project Details and Work Center Records can display much of the desired
information, but records are assembled by request, active selection, or
Conversation keys. Project Details also writes active and completed state,
which conflicts with projection ownership.

### Classification

**PARTIAL** for presentation; **BLOCKED** for authoritative aggregation.

## Dashboard Dependencies

### Required

- reporting-owned customer/project metrics;
- source-complete read projections;
- stable next-action semantics;
- explicit manual/registered classification;
- navigation context only.

### Current Gap

Dashboard has no Manual Customer source. It independently counts current
legacy sources and writes navigation intent. Adding Manual Customer arrays
directly would create another authority.

### Classification

**BLOCKED**.

## Cross-Workflow Critical Path

The minimum dependency order is:

```text
Manual Customer Identity
-> Manual Project Identity
-> Information and Contact Evidence
-> Scheduling
-> Quote Delivery and External Decision Evidence
-> Work
-> Invoice
-> Completion
-> History and Project Folder
-> Optional Account Link
```

Conversation/relationship events span the sequence but must not imply
authenticated chat until an account is linked.

## Blockers

| Blocker | Affected workflows | Severity |
| --- | --- | --- |
| No `manualCustomerId` authority | All | Critical |
| No canonical manual `projectId` authority | All | Critical |
| No approved contact/consent contract | Scheduling, quotes, invoice, conversion | Critical |
| No external communication event vocabulary | Conversation, scheduling, quotes, invoice | High |
| No external decision evidence policy | Quotes, work, materials, completion | Critical |
| No completion finality policy | Completion, history, Dashboard | Critical |
| No document identity/visibility contract | Invoice, completion, Project Folder | High |
| No reporting projection | Dashboard | High |
| Conversation and request IDs used as cross-domain fallbacks | Conversation, invoice, Project Folder, Work Center | Critical |

## Phase 2 Decision

Manual Customer workflow dependencies are **BLOCKED** for runtime adoption.

The current application can retain existing manual schedule and external quote
behavior, but those records must not be characterized as first-class Manual
Customer workflow parity.

The next dependency work must begin with identity and data ownership, not with
new UI or additional workflow writes.
