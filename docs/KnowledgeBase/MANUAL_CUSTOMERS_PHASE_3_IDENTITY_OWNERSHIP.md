# Manual Customers Phase 3 Identity and Data Ownership Audit

## Scope

This audit defines required ownership and readiness for Manual Customer
identity, communication, history, documents, duplicates, merges, and future
account conversion.

It does not create an identity contract in code, choose backend schema, change
storage, implement invitations, or adopt Manual Customers into runtime.

## Executive Finding

The proposed identity and ownership boundaries are clear enough to specify.
The current implementation does not satisfy them.

Manual Customer identity must be separate from:

- registered Meetro user identity;
- project identity;
- schedule, quote, invoice, completion, and Conversation identity;
- contact values and display labels.

Customer onboarding is the creation authority. A backend customer/project
store must become persistence authority before runtime adoption. Existing
client storage and compatibility utilities can report candidates but cannot
create trusted identity.

Overall identity readiness is **BLOCKED**.

## Identity Principles

1. One external person or organization has one immutable
   `manualCustomerId` within the owning business/customer authority.
2. One job has one immutable `projectId`.
3. One Manual Customer can participate in multiple projects.
4. One project may later link a registered Meetro user without deleting the
   original external participant.
5. Email, phone, name, address, title, schedule ID, quote ID, Conversation ID,
   and generic record ID are attributes or entity IDs, not customer identity.
6. Missing or conflicting identity remains visible and blocks automatic merge.
7. Account conversion is an explicit link, not a customer-record replacement.
8. Professional-recorded decisions remain labeled unauthenticated after an
   account is linked.

## Identity Matrix

| Field | Required | Owner | Purpose | Current readiness |
| --- | --- | --- | --- | --- |
| `manualCustomerId` | Yes | Customer onboarding identity authority | Immutable external customer identity | BLOCKED |
| `customerType` | Yes | Customer onboarding | Explicit `manual`/`external` classification | BLOCKED |
| `displayName` | Yes | Customer onboarding, supplied by professional/contact | Presentation only | PARTIAL |
| `createdByUserId` | Yes | Authentication plus customer onboarding | Professional creator/provenance | PARTIAL |
| `owningBusinessId` | Yes | Business membership/customer authority | Scopes the external customer record | BLOCKED |
| `createdAt` | Yes | Customer persistence boundary | Authoritative creation time | BLOCKED |
| `source` | Yes | Customer onboarding | Entry provenance | PARTIAL |
| `contactChannel` | Yes for actionable contact | Customer onboarding/contact policy | Declared phone/email/text/in-person channel | BLOCKED |
| `contactValue` | Yes for actionable contact | Customer onboarding/contact policy | Protected channel destination | BLOCKED |
| `contactConsentStatus` | Yes | Consent/onboarding authority | Permission state for stored contact/use | BLOCKED |
| `contactConsentRecordedAt` | Yes | Consent persistence boundary | Consent evidence time | BLOCKED |
| `contactConsentSource` | Yes | Consent/onboarding authority | How and by whom consent was recorded | BLOCKED |
| `projectId` | Yes for workflow participation | Project aggregate authority | Canonical workflow aggregate | BLOCKED |
| `professionalUserId` | Yes | Authentication/project membership | Business participant | PARTIAL |
| `participantRole` | Yes | Project membership authority | External customer role in project | BLOCKED |
| `workflowType` | Yes | Project/workflow authority | Standard manual, emergency, or approved type | BLOCKED |
| `projectSource` | Yes | Project aggregate authority | Manual project provenance | BLOCKED |
| `accountLinkStatus` | Yes | Account-link authority | Unlinked/invited/linked/revoked state | BLOCKED |
| `linkedUserId` | Conditional | Authentication/account-link authority | Registered account after accepted link | BLOCKED |
| `linkedAt` | Conditional | Account-link persistence authority | Accepted link time | BLOCKED |
| `invitationId` | Conditional | Invitation authority | Project-scoped invitation identity | BLOCKED |
| `preferredLanguage` | No | Customer preference | External communication language | PARTIAL |
| `phone` | No | Customer onboarding/contact policy | Contact attribute, never identity | PARTIAL |
| `email` | No | Customer onboarding/contact policy | Contact attribute, never identity | PARTIAL |
| `organizationName` | No | Customer onboarding | Business/customer display attribute | BLOCKED |
| `serviceAddress` | No | Project owner | Project location, not customer identity | PARTIAL |
| `billingAddress` | No | Invoice/customer billing authority | Billing document data | BLOCKED |
| `timezone` | No | Customer/project preference | Scheduling/display behavior | BLOCKED |
| `externalReference` | No | Import/integration owner | Source-system correlation only | BLOCKED |
| `notes` | No | Project/customer notes owner | Professional-only notes with visibility | PARTIAL |

`PARTIAL` indicates a similarly named field exists in current records. It does
not establish authority or consistent propagation.

## Required Customer Fields

The minimum first-class Manual Customer record requires:

- `manualCustomerId`;
- `customerType`;
- `displayName`;
- `createdByUserId`;
- `owningBusinessId`;
- `createdAt`;
- `source`;
- at least one declared contact channel/value when communication is expected;
- consent status, timestamp, and source.

The minimum project participation record requires:

- `projectId`;
- `manualCustomerId`;
- `professionalUserId`;
- `participantRole`;
- `workflowType`;
- `projectSource`;
- project creation timestamp;
- `accountLinkStatus`.

No workflow entity ID may replace either identity.

## Optional Customer Fields

Optional attributes include:

- phone and email beyond the primary contact channel;
- preferred language and contact time;
- organization name;
- service and billing addresses;
- unit/access notes;
- timezone;
- referral source;
- tax/billing attributes;
- customer-provided measurements;
- photos and attachments;
- external CRM reference;
- communication preferences;
- professional-only notes;
- future linked user and invitation metadata.

Optional attributes need field-level privacy, retention, and visibility rules.

## Ownership Matrix

| Capability | Owner | Allowed consumers | Current reality | Status |
| --- | --- | --- | --- | --- |
| External customer identity creation | Customer onboarding backend authority | Leads, Work Center, Project Folder | No durable customer entity exists | BLOCKED |
| Manual project creation | Project aggregate authority invoked by onboarding | All workflow domains | Schedules/quotes mint local IDs and fallbacks | BLOCKED |
| Contact data | Customer onboarding/contact policy | Scheduling, Quotes, Invoice, authorized Project Folder views | Stored ad hoc in record labels and page state | BLOCKED |
| Consent | Consent/onboarding authority | Customer onboarding, account-link review | No consent record | BLOCKED |
| Registered user identity | Authentication authority | Profile, project membership, Conversation | Session supports users but not Manual Customer links | READY |
| Customer/project membership | Project membership authority | Workflow domains and projections | No external participant membership record | BLOCKED |
| External communication facts | Project Events / relationship timeline | Conversation, Project Folder, Work Center | No approved event vocabulary; local messages imply chat | BLOCKED |
| Authenticated messages | Backend message/Conversation authority | Conversation and project timeline | Requires registered receiver and quote request context | PARTIAL |
| Customer history | Project Events plus History projection | Project Folder, Work Center, Dashboard | Fragmented conversation, job, completion, and schedule stores | BLOCKED |
| Documents | Quote/Invoice/Completion/Materials owners; Project Folder projection | Authorized project participants | Files and records are copied across local stores | PARTIAL |
| Duplicate detection | Customer onboarding reconciliation | Human review tooling | No customer entity or candidate report | BLOCKED |
| Customer merge | Backend customer authority with human approval | Audit/history projections | Not implemented | BLOCKED |
| Invitation | Backend invitation/account-link authority | Leads, Work Center, Profile | Only copied/shared text exists | BLOCKED |
| Account link acceptance | Authentication plus project membership authority | Profile and onboarding | Not implemented | BLOCKED |
| Dashboard metrics | Reporting projection | Dashboard | Dashboard counts legacy arrays directly | BLOCKED |

## Identity Authority

### Creation Authority

Customer onboarding creates `manualCustomerId`. Project aggregate authority
creates `projectId`. Neither may be created by Dashboard, Work Center,
Conversation, Quote Builder, Invoice Builder, Completion Sheet, Project Folder,
or Profile.

### Persistence Authority

A backend customer/project store must own:

- identity uniqueness;
- owning business;
- creator;
- contact and consent provenance;
- project participation;
- duplicate candidates;
- merge/link audit events;
- invitation and account-link states.

Client localStorage is a legacy compatibility surface, not identity authority.

### Propagation

All Scheduling, Quote, Work, Invoice, Completion, History, Timeline, and
Document records must receive both their own entity ID and canonical
`projectId`. Customer-facing projections may additionally receive
`manualCustomerId`.

## Communication Authority

| Communication type | Authority | Required evidence |
| --- | --- | --- |
| Authenticated Meetro message | Backend Message/Conversation | Message ID, Conversation, project link, sender identity/role, persistence time |
| Phone call | External channel plus professional-recorded project event | Channel, direction, actor, occurrence time, result, evidence/source |
| SMS/email outside Meetro | External delivery provider or professional-recorded event | Destination reference, delivery state when available, actor, time, source |
| In-person decision | Professional-recorded project event | Recorder, customer attribution, time, decision, evidence note/attachment |
| Internal note | Project Events with professional-only visibility | Actor, time, source, visibility |

Professional-recorded events must never be rendered as customer-authored
messages.

## History Authority

Project Events owns immutable relationship facts. Completion/History owns
history eligibility and finality. The Project Folder and Work Center consume
history projections.

A customer-level history is a projection across projects linked by
`manualCustomerId`; it is not a mutable customer diary. Account linking must
not rewrite historical actors or provenance.

Current status: **BLOCKED**.

## Document Authority

| Document | Creation owner | Projection owner |
| --- | --- | --- |
| Appointment confirmation/outcome | Scheduling | Project Folder, Timeline |
| Quote and revision | Quotes | Project Folder, Conversation when visible |
| Materials list/approval | Materials | Project Folder, Conversation when visible |
| Invoice/payment record | Invoice/Payments | Project Folder, Conversation when visible |
| Completion/closeout | Completion | Project Folder, History |
| Photos/attachments | Creating workflow domain | Project Folder |

Every document needs:

- document ID;
- project ID;
- creating domain/source;
- author/actor;
- created/recorded time;
- version or revision relationship;
- visibility;
- file/reference integrity;
- optional customer/account link.

Current status: **PARTIAL** for creation and display, **BLOCKED** for canonical
ownership.

## Duplicate Customer Policy

Duplicate detection may create candidates when records share normalized contact
attributes, but it must not merge automatically.

Rules:

1. Duplicate names alone are not a match.
2. Shared phone/email may represent households, offices, reused numbers, or
   data-entry mistakes.
3. Every candidate retains both immutable customer IDs.
4. A candidate report shows owning business, source, projects, contact
   provenance, and conflicts.
5. Human review chooses keep separate, link as related, or request merge.
6. Until reviewed, workflows remain attached to their original customer and
   project identities.

Current status: **BLOCKED** because no Manual Customer IDs exist.

## Customer Merge Policy

Merge must be rare, backend-controlled, idempotent, reversible through audit,
and human-approved.

Required rules:

- designate a surviving customer ID;
- preserve retired IDs as aliases/tombstones;
- never merge projects merely because contacts match;
- preserve every original source and actor;
- reject merges with conflicting linked user accounts;
- re-evaluate consent and visibility;
- emit an immutable merge event;
- provide conflict and rollback review;
- never rewrite historical event actors or document authors.

Relationship/household association should be available separately from merge.

Current status: **BLOCKED**.

## Future Account-Conversion Policy

“Conversion” means linking a registered account as a participant. It does not
replace or delete the Manual Customer.

Prerequisites:

- canonical Manual Customer and project;
- invitation ID and signed token;
- intended role;
- expiry and revocation;
- authenticated accepting user;
- explicit project-link consent;
- duplicate/wrong-account checks;
- approved historical visibility;
- backend-enforced membership.

Current status: **BLOCKED**.

## Customer-to-User Conversion Flow

```text
1. Professional selects a canonical Manual Customer project.
2. Onboarding authority creates a project-scoped invitation.
3. Invitation is delivered through a declared channel.
4. Recipient authenticates or creates a homeowner account.
5. Backend validates token, expiry, recipient intent, and project.
6. Recipient reviews and accepts participant role and history visibility.
7. Backend creates project membership and links linkedUserId.
8. Manual customer identity remains preserved.
9. Invitation acceptance and account-link events are recorded.
10. Conversation authority may create/link authenticated relationship.
11. Approved prior events/documents become visible; internal records remain hidden.
12. Revocation or wrong-account handling remains auditable.
```

Email or phone can help deliver or review an invitation. Neither can authorize
the link by itself.

## Manual Customer Readiness Matrix

| Area | Status | Reason |
| --- | --- | --- |
| Identity | BLOCKED | No Manual Customer entity, project creation authority, business scope, or provenance. |
| Workflow | BLOCKED | Downstream records lack shared project/customer identity and external-decision authority. |
| Communication | BLOCKED | Authenticated chat and recorded external contact are not separated by contract. |
| History | BLOCKED | History is fragmented and completion finality is unresolved. |
| Documents | PARTIAL | Quotes, invoices, photos, and completion records exist, but lack canonical project/document ownership. |
| Conversion | BLOCKED | No invitation, identity proof, consent, membership, visibility, or revocation authority. |
| Overall | BLOCKED | Runtime implementation would create unsafe identity and ownership assumptions. |

## Should Manual Customers Continue?

**Yes, as an architecture track. No, as runtime feature adoption.**

Manual Customers represent real professional work and should remain a
first-class roadmap requirement. Continuing directly into UI, storage, or
workflow implementation would be unsafe.

The track should continue only through pure specification, validation, and
fixture work until the backend identity and consent decisions are approved.

## Phase 4 Recommendation

Manual Customers Phase 4 should be **Pure Manual Customer Context Contract and
Validation Harness**.

Allowed scope:

1. Define pure, non-persisting manual customer and manual project shapes.
2. Validate required fields, contact/consent evidence, business ownership, and
   account-link state.
3. Keep customer, user, project, Conversation, and workflow entity IDs distinct.
4. Classify identity provenance as authoritative, inferred, fallback,
   conflicting, or missing.
5. Produce duplicate candidates without merging.
6. Model invitation/link states without creating invitations.
7. Add sanitized fixtures for duplicate names, shared phone/email, multiple
   projects, missing consent, wrong-account candidates, and linked accounts.
8. Produce structured reports only.

Phase 4 must not:

- access storage;
- create IDs for production;
- choose backend schema;
- auto-link or merge;
- import into UI;
- change scheduling, quote, Conversation, completion, invoice, or history
  behavior.

Stop if consent policy, backend creation authority, merge approval, or
historical visibility must be chosen.

## Final Decision

Ownership is now defined at audit level:

- Customer onboarding owns Manual Customer identity and conversion.
- Project aggregate owns project identity and membership.
- Communication and Project Events own relationship evidence.
- Scheduling, Quotes, Work, Invoice, and Completion own their domain records.
- History owns final historical projection.
- Project Folder owns project document/history presentation.
- Dashboard and Work Center consume projections.
- Profile participates only in registered-user consent and link controls.

The implementation remains blocked until these authorities have executable
contracts and backend support.
