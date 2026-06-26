# Manual Customers Phase 1 Architecture and Ownership Audit

## Scope

This is an audit-only review of Manual Customer ownership in
`meetro-client`. No runtime, UI, routing, storage, writer, or workflow behavior
was changed.

The requested files `MEETRO_WORKFLOWS.md`,
`MEETRO_UNIVERSAL_WORKFLOW_ENGINE.md`, `MEETRO_WORK_CENTER_SPEC.md`, and
`MEETRO_WORKFLOW_OWNERSHIP_MAP.md` are not present in this repository under
those names.

The available Knowledge Base evidence used for this audit is:

- `MEETRO_NEXT_STABILIZATION_PHASES.md`
- `MEETRO_ALIGNMENT_AUDIT_REPORT.md`
- `AUTHORITY_MATRIX_CODE_MAP.md`
- `WORK_CENTER_EXTRACTION_PLAN.md`
- lead, conversation, identity, and completion audit documents

The governing rules preserved by those documents are:

1. Manual customers are first-class project participants.
2. A manual customer must not be represented as a registered homeowner.
3. Customer name, phone, email, title, location, and schedule ID are not
   project identity.
4. Dashboard is a projection and navigation surface.
5. Command Center is an orchestrator.
6. Work Center is an operational projection, not the owner of customer,
   scheduling, quote, completion, or history domains.
7. Conversation is the relationship timeline, but authenticated chat must
   remain distinct from professional-recorded external communication.
8. Project Folder owns the project-scoped record and document view.
9. Account linking requires explicit identity proof and consent.

## Executive Finding

Manual Customers are conceptually present but architecturally unowned.

Current code supports:

- manually created schedule rows;
- external quotes shared outside a Meetro conversation;
- professional-recorded external quote decisions;
- copied invitation text;
- warnings that manual customers lack chat and complete workflow support.

Current code does not support:

- a durable manual customer identity;
- a durable manual project identity;
- a customer record independent of a schedule or quote;
- authenticated external-customer decisions;
- an internal relationship timeline with visibility rules;
- project-scoped document ownership;
- safe invitation acceptance and account linking;
- reconciliation of a later registered Meetro account.

Overall Manual Customer readiness is **BLOCKED**. Existing behavior is a set of
manual workflow entry points, not a first-class customer architecture.

## 1. What Is a Manual Customer?

A Manual Customer is an external person or organization entered by a
professional for real work that did not originate from an authenticated Meetro
homeowner request.

A Manual Customer:

- is an external contact, not a Meetro account;
- may participate in one or more manual projects;
- may be contacted outside Meetro by phone, email, text, or in person;
- may receive schedules, quotes, invoices, and completion documents;
- may have professional-recorded decisions and interactions;
- must retain source and evidence labels for unauthenticated actions;
- may later be invited to link a registered Meetro account;
- must remain distinct from the linked account for audit provenance.

A schedule row, quote, customer name, email address, or phone number is not by
itself a Manual Customer record.

## Current Runtime Reality

### Manual Scheduling

`ContractorDashboard.jsx` creates schedule records with:

- generated schedule `id`;
- appointment type;
- title;
- date and time;
- location;
- notes;
- `status: "scheduled"`;
- `source: "manual"`;
- creation and update timestamps.

The record does not require a customer ID, project ID, request ID,
conversation ID, contact method, consent record, or created-by identity.

The UI detects missing `conversationId`, `requestId`, and
`projectConversationId`, labels the record as a manual customer, stores the
selected schedule row, and displays conversion instructions. No conversion or
invitation record is created.

### External Quotes

`QuoteBuilder.jsx` classifies a quote as external when it originates from a
manual/schedule path or lacks conversation identity. It creates a quote record
and relies on native sharing or a downloaded document.

The external quote has quote and request fields, project/customer labels,
price, notes, status, source, and timestamps. It does not prove delivery,
receipt, customer identity, or customer decision.

`ContractorDashboard.jsx` allows the professional to mark the external quote
accepted, revision requested, or declined. Those actions are self-reported and
do not record an authenticated customer actor or evidence attachment.

### Invitations

Manual schedule help displays instructions. External quote cards can share or
copy invitation text.

There is no:

- invitation ID;
- intended recipient identity;
- project link;
- expiry;
- acceptance state;
- signed token;
- consent record;
- account match;
- revocation;
- visibility decision.

Copied text is not customer conversion.

### Completion and History

`CompletionSheet.jsx` can complete schedule-derived work, but its completion
record commonly uses a generic customer label and schedule/conversation
context. It updates several global histories and counters.

Manual projects therefore can produce completion-like records without a
durable customer or project relationship. Customer confirmation cannot be
authenticated when no Meetro participant exists.

## 2. Customer Record Ownership

**Correct owner: Customer/project onboarding authority, exposed through the
Leads/Requests boundary.**

The Knowledge Base authority map assigns Manual Customer conversion to
Customer onboarding. The existing architecture does not contain a dedicated
customer onboarding implementation, and this phase does not recommend creating
a new major module.

Within the current module boundaries:

- Leads should initiate and resolve the external customer context.
- Customer onboarding should create the durable external-contact identity and
  project participation record.
- Work Center may request or consume that context.
- Dashboard and Command Center may navigate to it.
- Profile must not own business customer records.

Current status: **BLOCKED**. `BusinessLeads.jsx` lists backend/homeowner leads
and has no manual customer collection or onboarding contract.

## 3. Customer Communication Ownership

**Correct owner: Relationship Timeline / Conversation projection, with the
actual transport owned by the communication channel.**

Two communication classes must remain separate:

1. **Authenticated Meetro communication**
   - Both participants are registered and authorized.
   - Backend message identity is authoritative.
   - Conversation may render the shared relationship timeline.

2. **Professional-recorded external communication**
   - Phone, email, text, or in-person contact occurred outside Meetro.
   - The professional records an event with actor, channel, timestamp, source,
     and evidence.
   - It is not rendered as a customer-authored message.

`ConversationThread.jsx` currently expects a conversation/customer context and
contains message, schedule, workflow, and archive behavior. A manual customer
without an authenticated account must not receive a synthetic conversation or
synthetic customer messages.

Current status: **BLOCKED** pending an approved manual timeline visibility and
event vocabulary contract.

## 4. Customer History Ownership

**Correct owner: Project Events and History projections scoped by project ID.**

Customer history should be derived from the projects in which the external
contact participated. It includes:

- contact and information evidence;
- appointments and outcomes;
- quotes and external decision evidence;
- work status;
- materials and approvals;
- completion and confirmation evidence;
- invitation and account-link events.

Work Center may display operational and completed projections. It must not own
the customer history record. Conversation may display relationship events. It
must not equate inbox archive state with project history.

Current status: **BLOCKED** because current manual records do not share a
canonical project identity and completion/history authority remains fragmented.

## 5. Customer Document Ownership

**Correct owner: Project Folder, scoped by project ID and document ID.**

Manual-customer documents include:

- project information and photos;
- appointment notes and visit outcomes;
- quote documents and revisions;
- materials lists;
- invoices and payment evidence;
- completion photos and closeout documents;
- warranties and follow-up records.

`ProjectDetails.jsx` already presents project information, photos, quotes, and
saved workflow memory, but it reconstructs identity through legacy request,
conversation, and job values and can directly change project state.

The Project Folder should be the document projection. Quote, Scheduling,
Materials, Invoice, and Completion owners create their documents and events.
The Project Folder reads them; it does not become their writer.

Current status: **PARTIAL** for presentation and **BLOCKED** for manual-project
identity and ownership.

## 6. Can a Manual Customer Become a Meetro User Later?

Yes, but only through explicit invitation, authenticated acceptance, and
human-reviewable project linking.

The safe sequence is:

1. Preserve the external customer identity.
2. Create a project-scoped invitation with a unique ID and expiry.
3. Deliver it through a declared external channel.
4. Require the recipient to authenticate or create a Meetro homeowner account.
5. Confirm the intended project and participant role.
6. Record consent to link the account to the external project participant.
7. Link the account ID without deleting the external identity.
8. Apply approved historical visibility rules.
9. Record invitation, acceptance, link, and revocation events.

The system must not:

- auto-link by email or phone;
- create a fake homeowner account;
- merge duplicate contacts automatically;
- expose professional-only notes automatically;
- change account role or mode;
- treat copied invitation text as acceptance.

Current status: **BLOCKED**. The client does not implement invitation authority,
identity proof, consent, or backend account linking.

## 7. Required Identity Fields

The following fields are required before a Manual Customer can safely
participate in workflow records.

### External Customer Identity

| Field | Requirement |
| --- | --- |
| `manualCustomerId` | Immutable external-contact ID generated by customer onboarding authority. |
| `customerType` | Explicit value such as `manual` or `external`; never inferred from missing conversation data alone. |
| `createdByUserId` | Authenticated professional who created the contact. |
| `createdAt` | Persistence-owned creation timestamp. |
| `source` | How the customer entered Meetro, such as manual schedule, external quote, import, or professional entry. |
| `displayName` | Human-readable contact label; not identity. |
| `contactChannel` | Declared external communication channel. |
| `contactValue` | Channel-specific destination, protected as personal data. |
| `contactConsentStatus` | Whether Meetro may store and use the contact information for the declared purpose. |
| `contactConsentRecordedAt` | Timestamp for consent evidence. |
| `contactConsentSource` | Who recorded or supplied consent and by what process. |

At least one contact channel/value pair is required for an actionable external
customer. Name, email, and phone must never serve as IDs.

### Manual Project Identity

| Field | Requirement |
| --- | --- |
| `projectId` | Immutable canonical project ID. |
| `manualCustomerId` | External participant linked to the project. |
| `professionalUserId` | Authenticated business participant. |
| `workflowType` | Standard manual, emergency, or another approved workflow classification. |
| `projectSource` | Manual-customer project provenance. |
| `createdAt` | Persistence-owned project creation timestamp. |
| `participantRole` | External participant role, normally customer/homeowner participant without account authority. |
| `accountLinkStatus` | `unlinked`, `invited`, `linked`, `revoked`, or another approved state. |

Every appointment, quote, work item, completion, history event, and document
must use the project ID. Schedule ID, quote ID, conversation ID, title, or
customer contact details are not substitutes.

## 8. Optional Fields

Optional fields depend on the project and contact channel:

- phone;
- email;
- preferred contact channel;
- preferred language;
- organization/business name;
- service address;
- unit number;
- access notes;
- contact notes;
- timezone;
- customer-supplied measurements;
- photos and attachments;
- referral/source campaign;
- tax or billing details;
- emergency contact preference;
- external CRM reference;
- invitation ID and status before an invitation exists;
- linked Meetro user ID after explicit acceptance;
- account-linked timestamp;
- customer-visible display preferences.

Sensitive personal data and professional-only notes require separate visibility
and retention policies. Optional fields must not be used as implicit identity.

## 9. Dependent Workflows

Manual Customers affect:

1. **Lead and onboarding**
   - Create external contact and project context.
   - Record source, consent, and professional ownership.

2. **Information gathering**
   - Record scope, location, photos, access, urgency, and requirements.

3. **Scheduling**
   - Link every appointment to the manual project.
   - Preserve purpose, status, outcome, and external confirmation evidence.

4. **Quotes**
   - Link quote and revisions to the project.
   - Distinguish generated/shared/delivered/received.
   - Record external decisions with actor, source, timestamp, and evidence.

5. **Conversation and relationship timeline**
   - Record professional contact without fabricating customer messages.
   - Separate internal notes from future customer-visible events.

6. **Active work**
   - Require quote/decision evidence under the approved standard workflow.
   - Keep work project-scoped.

7. **Materials and change orders**
   - Record who supplied, requested, or approved materials and changes.
   - Label unauthenticated external decisions.

8. **Invoices and payments**
   - Preserve delivery channel, payment evidence, actor, and timestamp.

9. **Completion and history**
   - Use the same closeout definition as registered-customer projects.
   - Distinguish professional-recorded external confirmation from authenticated
     homeowner confirmation.

10. **Invitation and account linking**
    - Link a later account without deleting provenance or exposing unauthorized
      history.

## Ownership Matrix

| Module | Responsibility | Current behavior | Readiness |
| --- | --- | --- | --- |
| Dashboard | Read-only counts, alerts, and next actions from an authoritative manual-customer/project projection; navigate to owner. | Reads homeowner requests, schedule, and quote arrays; independently calculates metrics and writes navigation intent. It has no manual-customer projection. | BLOCKED |
| Leads | Entry and onboarding surface for external contacts; invoke customer/project onboarding; show source and link status. | Reads backend posts and homeowner requests. It does not create or list durable manual customers. | BLOCKED |
| Conversation | Render authenticated chat and project relationship events; distinguish professional-recorded external contact from customer-authenticated messages. | Requires conversation-like context and owns many message/workflow writes. Manual customers have no safe authenticated conversation. | BLOCKED |
| Work Center | Consume manual project context for schedule, quote, work, completion, and history operations; show identity/link warnings. | Creates manual schedules, external quotes, decisions, invitations, active work, and records. It is currently the accidental Manual Customer owner. | PARTIAL |
| Command Center | Advertise and navigate to the actual customer owner using explicit context. | “Customers” routes to Business Leads and implies a customer module that does not exist. | BLOCKED |
| Project Folder | Project-scoped projection for documents, relationship history, photos, quotes, invoices, completion, and link provenance. | Project Details and Work Center records display fragmented records but lack a manual project aggregate. | PARTIAL |
| Profile | Own registered user/business account identity, preferences, privacy, and link consent surfaces; never own the professional’s customer list. | Manages homeowner/professional account and business profile. It has no invitation acceptance, account-link, or historical visibility controls. | BLOCKED |

## Ownership Gaps and Risks

| Gap | Current owner in code | Correct owner | Risk | Severity |
| --- | --- | --- | --- | --- |
| Manual customer identity | None; inferred from unlinked schedule/quote data | Customer/project onboarding | Duplicate people and disconnected projects cannot be distinguished safely. | Critical |
| Manual project identity | Work Center fallbacks and generated schedule/quote IDs | Project/customer onboarding | Schedule, quote, work, completion, and history cannot be reconciled. | Critical |
| Manual schedule creation | Work Center page | Scheduling | A schedule row becomes the de facto customer record. | High |
| External quote delivery | Quote Builder/native share | Quotes plus delivery evidence | “Shared” can be mislabeled “sent” without proof of receipt. | High |
| External quote decision | Work Center professional buttons | Quote decision workflow | Professional-recorded state appears to be a customer decision. | Critical |
| External communication history | None or implied conversation | Project Events / relationship timeline | Synthetic messages could misrepresent actor and visibility. | Critical |
| Customer history | Work Center records, completion arrays, conversation archive | Project Events and History projections | History fragments and can be duplicated or lost. | Critical |
| Customer documents | Quote, Work Center, completion, and Project Details copies | Domain owners projected in Project Folder | Documents lack one project scope and visibility policy. | High |
| Invitation | Copied/shared text | Customer onboarding/backend identity authority | No recipient proof, expiry, consent, acceptance, or revocation. | Critical |
| Account linking | Not implemented | Backend customer onboarding with Profile consent | Auto-linking could expose the wrong customer’s project history. | Critical |

## Module Conclusions

### Dashboard: BLOCKED

Dashboard must remain a summary. It cannot define Manual Customer eligibility,
identity, status, or conversion. It needs an authoritative read projection
before showing counts or alerts.

### Leads: BLOCKED

Leads is the correct entry surface under current module boundaries, but it
lacks manual contact creation and customer/project onboarding commands.

### Conversation: BLOCKED

Conversation cannot be adopted for Manual Customers until authenticated chat,
professional-recorded contact, internal notes, and future customer-visible
events have explicit visibility and actor rules.

### Work Center: PARTIAL

Work Center demonstrates demand and contains manual scheduling and quote paths.
It must stop being treated as the owner. Future adoption requires a supplied
manual customer ID and project ID.

### Command Center: BLOCKED

Command Center’s Customers capability is currently an alias to Leads. It should
remain navigation only and must not imply a complete customer module.

### Project Folder: PARTIAL

The current project detail and records surfaces can display many required
artifacts. They need a canonical manual project aggregate, document IDs,
visibility rules, and read adapters.

### Profile: BLOCKED

Profile should participate only in registered-account invitation acceptance,
consent, privacy, and link management. It must not become a CRM or own external
contacts.

## Phase 2 Recommendation

Manual Customers Phase 2 should be **Pure Manual Customer and Project Identity
Contract**.

It should create no runtime adoption. Its scope should be:

1. Define a pure manual customer context shape.
2. Define a pure manual project context shape.
3. Validate required identity, source, contact, consent, professional owner,
   and account-link fields.
4. Distinguish external contact identity from registered Meetro account
   identity.
5. Report duplicate-name and reused-contact candidates without merging them.
6. Define invitation/link candidate states without implementing invitations.
7. Add tests for missing identity, duplicate names, shared household contact
   details, missing consent, multiple projects, and later account-link
   candidates.
8. Produce no storage writes, routes, UI, fake accounts, or automatic matches.

Phase 2 must stop if:

- consent requirements are not approved;
- project ID creation authority must be chosen;
- duplicate external contacts cannot be distinguished;
- account linking would depend on email or phone alone;
- visibility of prior history requires a product decision.

## Final Decision

Manual Customers must become first-class external project participants, not
special schedule rows and not fake homeowners.

Customer/project onboarding owns identity and conversion. Leads is the current
entry surface. Scheduling, Quotes, Work, Completion, and Project Events own
their workflow records. Project Folder owns the combined document/history
projection. Conversation owns relationship presentation, with strict actor and
visibility distinctions. Dashboard and Command Center remain read-only
navigation surfaces. Profile owns registered-account consent and linking
controls only.

Runtime implementation remains blocked until the identity and consent contract
is approved.
