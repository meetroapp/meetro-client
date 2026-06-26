# Relationship Communication Phase 2 Contact and Access Contract

## Status

**Phase:** Relationship Communication Phase 2  
**Type:** Architecture specification only  
**Runtime adoption:** BLOCKED  
**UI, routing, storage, backend, and writer changes:** None

## Purpose

This document defines:

1. a read-only `relationshipContact` projection;
2. a read-only `conversationAccess` contract;
3. communication capability vocabulary;
4. relationship reason and lifecycle vocabulary;
5. ownership and evidence requirements for supported contact types.

These contracts may eventually support a Contacts list inside Chat. Chat may
display the projections, but Chat does not own identity, relationships,
Conversation access, communication consent, or relationship history.

## Governing Rules

1. Identity remains owned by Authentication, Customer onboarding, or Business
   identity.
2. Project identity remains owned by the Project aggregate.
3. Project participation remains owned by Project membership.
4. Conversation identity and participant access remain owned by Conversation
   authority.
5. Contact methods and external-channel consent remain owned by
   Customer/contact and Consent authorities.
6. Relationship history is projected from canonical events, projects,
   Conversations, and authorized external contact records.
7. Chat is a read and interaction surface over approved capabilities.
8. An inbox row, message, lead, quote, schedule, address, phone, or email is
   not a contact identity.
9. A visible contact does not imply authenticated Chat access.
10. A completed project does not automatically close, reopen, preserve, or
    revoke a Conversation.

## Ownership Summary

| Concern | Authority | Relationship Communication role |
| --- | --- | --- |
| Registered user identity | Authentication/User authority | Read identity reference and display projection |
| Manual Customer identity | Customer onboarding | Read identity reference and account-link state |
| Business/professional identity | Business identity plus Authentication | Read identity and business display projection |
| Project identity | Project aggregate | Read shared project references |
| Project participant role | Project membership | Read relationship reason and visibility scope |
| Contact methods | Customer/contact authority | Read capability result, not raw authority |
| External communication consent | Consent authority | Respect approved capability and evidence |
| Conversation identity | Conversation authority | Read Conversation reference |
| Conversation participation/access | Conversation authority | Render allowed actions only |
| Message persistence | Backend Message authority | Send/read when allowed |
| Workflow events | Owning workflow domain and event persistence | Project authorized events into timeline/history |
| Relationship history | Relationship/Project History projection | Display summary and navigation |
| Duplicate/merge decisions | Identity/customer reconciliation | Consume reviewed identity result |

## Contract Boundary

The contracts are read models. They:

- contain references to authoritative identities;
- report capabilities and access already decided by their owners;
- preserve provenance and warnings;
- may represent incomplete legacy evidence as blocked or uncertain;
- do not create identity, membership, access, consent, Conversations, or
  history.

A projection must not be persisted as a new authority merely because it has a
complete shape.

## 1. `relationshipContact` Projection

### Shape

```js
{
  relationshipContactId,
  identityRef,
  contactType,
  displayName,
  relationshipReasons,
  relationshipStatus,
  sharedProjectRefs,
  conversationRefs,
  communicationCapabilities,
  lastInteractionAt,
  provenance,
  warnings
}
```

### Field Contract

| Field | Required | Meaning | Owner/source |
| --- | --- | --- | --- |
| `relationshipContactId` | Yes | Opaque identity of this read projection, not person identity | Relationship projection authority |
| `identityRef` | Yes | Typed reference to the authoritative identity | Owning identity authority |
| `contactType` | Yes | Projection classification for display and policy | Relationship projection from identity/membership evidence |
| `displayName` | Yes | Display-only label | Identity/profile projection |
| `relationshipReasons` | Yes | One or more authoritative reasons the contact is visible | Lead, Project membership, Relationship, Business, Emergency, or Team authority |
| `relationshipStatus` | Yes | Current relationship projection status | Relationship authority |
| `sharedProjectRefs` | Yes | Authorized project references shared with current principal | Project aggregate/membership |
| `conversationRefs` | Yes | Authorized or pending Conversation references | Conversation authority |
| `communicationCapabilities` | Yes | Allowed communication modes already evaluated by owners | Conversation, Consent, Contact, and Relationship authorities |
| `lastInteractionAt` | No | Latest authoritative relationship interaction time | Message/event/history projection |
| `provenance` | Yes | Field/source trust and evidence summary | Projection/reconciliation layer |
| `warnings` | Yes | Structured gaps, conflicts, or legacy limitations | Projection/reconciliation layer |

Arrays are present even when empty. Missing evidence must produce an empty
reference/capability list and a warning rather than inferred access.

### `relationshipContactId`

`relationshipContactId` identifies the projection row, not the person,
business, customer, project, Conversation, or relationship itself.

Rules:

- opaque and stable for the same projection record;
- issued by the future relationship projection authority;
- not derived from display name, phone, email, project title, or inbox row;
- not reused as `identityRef.id`;
- not used to grant access;
- not treated as a backend identity until an owning persistence contract
  exists.

Legacy read reconciliation may expose a clearly marked temporary projection
key. Such a key is not runtime-ready and cannot enable communication.

### `identityRef`

Suggested shape:

```js
{
  identityType,
  id,
  authority,
  linkedIdentityRefs
}
```

Initial `identityType` values:

- `registeredUser`;
- `manualCustomer`;
- `business`;
- `externalOrganization`;
- `unknownLegacyIdentity`.

Rules:

1. `id` comes from the named identity authority.
2. Roles such as tenant, property manager, vendor, or team member do not
   replace identity type.
3. `linkedIdentityRefs` reports approved links without merging identities.
4. A linked registered user does not erase the Manual Customer reference.
5. Contact values and cross-domain IDs are not accepted identity references.
6. `unknownLegacyIdentity` is read-only and has no actionable capabilities.

### `contactType`

Initial projection values:

- `registeredCustomer`;
- `manualCustomer`;
- `businessProfessional`;
- `tenant`;
- `propertyManager`;
- `projectParticipant`;
- `repeatCustomer`;
- `externalContact`;
- `teamMember`;
- `vendor`.

`contactType` describes why and how the identity is presented. It does not
create identity or membership.

One identity can produce different contact projections under different
business or relationship scopes. For example, one registered user may be a
tenant on one project and a property manager on another.

### `displayName`

Rules:

- display only;
- localized or formatted without changing identity;
- may be masked according to privacy policy;
- never used for deduplication, lookup authority, access, or merge;
- missing names use an explicit generic display warning, not identity
  inference.

### `sharedProjectRefs`

Suggested entry:

```js
{
  projectId,
  participantRole,
  membershipStatus,
  visibilityScope,
  projectStatus
}
```

Rules:

- supplied by Project aggregate and membership authority;
- one contact may have zero, one, or many shared projects;
- completed projects remain separate from active projects;
- a repeat customer gets a new project for new work;
- project references do not automatically create Conversations;
- only projects visible to the current principal are included.

### `conversationRefs`

Suggested entry:

```js
{
  conversationId,
  accessStatus,
  audienceScope,
  projectId
}
```

Rules:

- supplied by Conversation authority;
- may be project-scoped or relationship-scoped;
- must not be synthesized from quote request, project, message, or inbox IDs;
- one contact may have multiple Conversations;
- a visible contact may have no Conversation;
- blocked, revoked, pending, closed, and archived references remain explicit.

### `lastInteractionAt`

Rules:

- valid authoritative UTC timestamp when present;
- derived from visible message, workflow event, or external-contact event
  projections;
- not a localized display time;
- not generated merely because the Contacts list was viewed;
- does not grant or preserve access;
- ambiguous legacy timestamps produce warnings.

### Projection Validity

A contact projection is structurally valid only when:

- `relationshipContactId` is present;
- `identityRef` identifies an authoritative or explicitly unknown legacy
  source;
- `contactType` is approved;
- at least one authoritative `relationshipReason` exists;
- `relationshipStatus` is approved;
- all project and Conversation references are typed;
- capabilities are approved values;
- provenance and warnings are present.

An `unknownLegacyIdentity` projection may be retained for audit visibility,
but its capabilities must be `none` and it must not be shown as a trusted
contact.

## 2. `conversationAccess` Contract

### Shape

```js
{
  conversationId,
  relationshipId,
  projectId,
  accessStatus,
  audienceScope,
  participantRefs,
  allowedActions,
  visibilityRules,
  provenance,
  warnings
}
```

### Field Contract

| Field | Required | Meaning | Owner/source |
| --- | --- | --- | --- |
| `conversationId` | Yes | Canonical Conversation identity | Conversation authority |
| `relationshipId` | Yes | Authoritative relationship/membership context | Relationship or Conversation authority |
| `projectId` | Conditional | Canonical Project for project-scoped Conversations | Project aggregate/Conversation link |
| `accessStatus` | Yes | Current access state | Conversation authority |
| `audienceScope` | Yes | Intended participant audience | Conversation authority |
| `participantRefs` | Yes | Authorized participants and role snapshots | Conversation/Project membership |
| `allowedActions` | Yes | Explicit operations allowed for current principal | Conversation authorization |
| `visibilityRules` | Yes | Content/event visibility policy | Conversation plus domain owners |
| `provenance` | Yes | Authority and trust of access fields | Access projection |
| `warnings` | Yes | Missing, conflicting, or legacy access evidence | Access/reconciliation layer |

### Access Is Explicit

The contract represents an access decision already made by Conversation
authority.

It does not:

- create a Conversation;
- infer membership from a message;
- grant access from project visibility alone;
- grant access because a contact is visible;
- grant access from a lead, quote, schedule, or inbox row;
- reactivate access because a user opens Chat;
- use local archive/read state as authorization.

### `relationshipId`

`relationshipId` identifies the authoritative relationship supporting the
Conversation.

Possible owners include:

- project membership relationship;
- direct registered relationship;
- team membership;
- business/vendor relationship;
- emergency relationship;
- accepted invitation/account-link relationship.

It must not be a display-only contact projection ID.

### `projectId`

`projectId` is required when the Conversation contains project workflow,
documents, approvals, payments, completion, or project events.

A project-independent Conversation may omit it only when:

- a separate authoritative relationship exists;
- allowed actions exclude project workflow actions;
- no project history or documents are exposed through that Conversation;
- the relationship reason and audience are explicit.

`quoteRequestId`, `conversationId`, message ID, address, or active selection
cannot substitute for `projectId`.

### `participantRefs`

Suggested entry:

```js
{
  identityRef,
  participantRole,
  membershipStatus,
  joinedAt,
  revokedAt
}
```

Rules:

- every participant uses authoritative identity;
- role is captured from membership/authorization, not inferred by viewer;
- membership is independently revocable;
- Manual Customer identity alone is not an authenticated participant;
- a linked registered user requires accepted Conversation/project membership;
- removed participants remain auditable but lose allowed actions;
- team members and vendors receive only their approved audience and project
  scope.

### `audienceScope`

Initial values:

- `oneToOne`;
- `projectParticipants`;
- `professionalTeam`;
- `professionalAndCustomer`;
- `professionalAndTenant`;
- `professionalAndPropertyManager`;
- `vendorCoordination`;
- `emergencyParticipants`;
- `internalOnly`.

Rules:

1. Audience scope is explicit and stable for each Conversation.
2. `internalOnly` content never becomes customer, tenant, manager, or vendor
   visible through contact linking.
3. Tenant and property manager access must be independently scoped.
4. Project-wide scope includes only active authorized participants.
5. Adding a participant is an authority action outside Chat rendering.
6. A Conversation must not silently widen scope after account linking.

### `allowedActions`

Initial action values:

- `readMessages`;
- `sendMessage`;
- `readSharedWorkflowEvents`;
- `readSharedDocuments`;
- `recordExternalContact`;
- `addInternalNote`;
- `requestNewProject`;
- `viewCompletedProjectSummary`;
- `none`.

Rules:

- actions are explicit; absence means not allowed;
- `sendMessage` requires authenticated Conversation membership;
- `recordExternalContact` is not authenticated chat;
- `addInternalNote` requires internal audience and professional authority;
- project actions require canonical `projectId` and domain authorization;
- Contacts UI may display or invoke allowed actions but cannot add them;
- blocked or revoked access has `none`;
- closed or archived access may permit limited reads under retention policy.

### `visibilityRules`

Suggested shape:

```js
{
  messageVisibility,
  workflowEventVisibility,
  documentVisibility,
  historyVisibility,
  internalNoteVisibility
}
```

Initial rule values may include:

- `participants`;
- `projectParticipants`;
- `roleScoped`;
- `professionalOnly`;
- `customerVisible`;
- `tenantVisible`;
- `propertyManagerVisible`;
- `vendorVisible`;
- `none`.

Domain owners determine whether an event or document is shareable.
Conversation authority applies the audience decision. Chat does not convert
internal records into shared content.

## 3. Communication Capabilities

`communicationCapabilities` reports available channels for the current
principal/contact relationship.

Approved values:

- `authenticatedChat`;
- `externalPhone`;
- `externalSms`;
- `externalEmail`;
- `internalNote`;
- `projectOnly`;
- `none`.

### Capability Rules

| Capability | Required authority/evidence | Prohibited inference |
| --- | --- | --- |
| `authenticatedChat` | Registered authenticated identity, active Conversation membership, allowed send/read action | Existing message, inbox row, linked email/phone, project label |
| `externalPhone` | Authoritative contact method, granted channel/purpose consent, current relationship authority | Phone value alone |
| `externalSms` | Authoritative contact method, granted channel/purpose consent, current relationship authority | Mobile-looking value alone |
| `externalEmail` | Authoritative contact method, granted channel/purpose consent, current relationship authority | Email match or invitation text alone |
| `internalNote` | Professional/team authorization and internal visibility | Any customer-visible Conversation |
| `projectOnly` | Shared project relationship with no approved communication channel | Project membership automatically granting chat |
| `none` | Missing, blocked, revoked, conflicting, or insufficient authority | Hiding warnings or inventing fallback capability |

Capabilities may be combined when independently authorized. For example, a
linked registered customer may have `authenticatedChat` and `externalPhone`.

`projectOnly` means the contact is visible because of project participation,
but no direct communication capability is approved.

### Manual Customer Rule

An unlinked Manual Customer can never receive `authenticatedChat`.

External capabilities require:

- authoritative Manual Customer identity;
- business-scoped relationship;
- structured contact method;
- granted consent for the relevant purpose/channel;
- provenance and visibility evidence.

After account linking, `authenticatedChat` still requires accepted
Conversation membership. Link status alone is insufficient.

## 4. Relationship Reasons

Approved initial values:

- `lead`;
- `project`;
- `repeatCustomer`;
- `manualCustomer`;
- `tenant`;
- `propertyManager`;
- `businessRelationship`;
- `teamMember`;
- `vendor`;
- `emergency`.

### Reason Rules

| Reason | Authority | Minimum evidence |
| --- | --- | --- |
| `lead` | Leads/Requests | Authoritative lead/request link to identity |
| `project` | Project membership | Shared canonical project and participant membership |
| `repeatCustomer` | Relationship projection | Stable identity plus at least one prior project and approved current relationship |
| `manualCustomer` | Customer onboarding | Authoritative Manual Customer identity and business scope |
| `tenant` | Project/property membership | Identity plus tenant role on a project/property relationship |
| `propertyManager` | Project/property membership or business relationship | Identity plus manager role and managed scope |
| `businessRelationship` | Business relationship authority | Both business/identity references and relationship status |
| `teamMember` | Business/team membership | Authenticated user plus active team membership |
| `vendor` | Vendor/business relationship or project membership | Vendor identity/business plus approved scope |
| `emergency` | Emergency relationship authority | Emergency relationship and participant evidence |

Rules:

1. A contact may have multiple reasons.
2. Reasons are provenance-bearing facts, not display tags.
3. A closed lead may disappear as a current reason while project or repeat
   relationship reasons remain.
4. `repeatCustomer` does not merge projects or reopen completed work.
5. Tenant, manager, team, and vendor reasons do not change core identity.
6. Missing evidence cannot be repaired from display text.

## 5. Relationship Status

Approved values:

- `known`;
- `invited`;
- `active`;
- `inactive`;
- `completedProject`;
- `blocked`;
- `revoked`;
- `archived`.

### Status Meanings

| Status | Meaning | Communication implication |
| --- | --- | --- |
| `known` | Authoritative identity/relationship is known; active communication not established | Capabilities may be `projectOnly` or `none` |
| `invited` | An authoritative invitation is pending | No authenticated chat until acceptance/membership |
| `active` | Current relationship authority exists | Capabilities still require channel/access evidence |
| `inactive` | Relationship retained without current activity | Reads/follow-up depend on policy |
| `completedProject` | Relationship includes completed work | Does not reopen work or guarantee Chat |
| `blocked` | Current principal or policy prohibits communication | Capabilities `none`; access blocked |
| `revoked` | Prior authority or membership was withdrawn | Capabilities `none`; access revoked |
| `archived` | Projection is hidden/de-emphasized for organization | Does not itself revoke access or delete history |

Status priority is authority-driven. A local archive action cannot override a
backend blocked/revoked state.

## 6. Conversation Access Status

Approved values:

- `active`;
- `closed`;
- `archived`;
- `blocked`;
- `revoked`;
- `pendingInvite`.

### Access Semantics

| Access status | Read | Send | Meaning |
| --- | --- | --- | --- |
| `active` | As authorized | As authorized | Conversation membership is current |
| `closed` | Retention/visibility policy | Normally no; explicit follow-up policy may allow a new Conversation | Conversation intentionally ended |
| `archived` | Usually retained | Depends on underlying active/closed state, not archive alone | Presentation state only |
| `blocked` | Policy-dependent | No | Communication blocked |
| `revoked` | Historical audit/retention only | No | Membership/access withdrawn |
| `pendingInvite` | Invitation-safe metadata only | No | No accepted participant membership |

`archived` must not be used as a substitute for `closed`, `blocked`, or
`revoked`.

## 7. Contact Type Audit

| Contact Type | Identity Owner | Access Requirements | Capabilities | Status | Risk |
| --- | --- | --- | --- | --- | --- |
| Registered customer | Authentication/User authority | Stable user identity; authoritative relationship reason; Conversation membership; role/audience; project link for workflow content | `authenticatedChat`; optional consented external channels; `projectOnly` | PARTIAL | Backend user/message identity exists, but canonical Conversation and participant authorization do not |
| Manual customer | Customer onboarding | Authoritative Manual Customer/business scope; consent for external channel; accepted account link plus Conversation membership for Chat | External phone/SMS/email, `projectOnly`, or `none`; no Chat before link/membership | BLOCKED | No backend customer, consent, project participant, invitation, or Conversation authority |
| Business/professional | Business identity plus Authentication | Authenticated user/business membership; authorized relationship or project; Conversation membership | `authenticatedChat`, `internalNote`, consented external channels, `projectOnly` | PARTIAL | Business identity is fragmented and Conversation role/membership is not authoritative |
| Tenant | Registered-user or Manual Customer identity; tenant role from Project/property membership | Explicit tenant membership; tenant audience scope; independent consent/access; canonical project when workflow content is shared | Chat only when registered/membership exists; external channels with consent; `projectOnly` | BLOCKED | No tenant membership, property relationship, or role-scoped visibility authority |
| Property manager | Registered-user, Manual Customer, or business identity; manager role from Project/property membership | Explicit managed-property scope; manager audience; independent consent/access; project/business relationship | Chat when authorized; external channels with consent; `internalNote` only under professional authority; `projectOnly` | BLOCKED | No manager participant model or multi-party access policy |
| Project participant | Owning identity authority plus Project membership | Canonical project, participant role/status, Conversation membership, audience and visibility rules | Chat when membership permits; `projectOnly`; role-approved external channels | BLOCKED | No canonical Project participant registry |
| Repeat customer | Original registered or Manual Customer identity; Relationship projection owns repeat classification | Stable identity, prior project evidence, approved current relationship; new project for new work; Conversation status checked independently | Existing authorized Chat, consented external channels, `projectOnly`, or `none` | BLOCKED | Current inbox cannot group identity safely; contact-value matching would merge people |
| External contact | Customer/contact onboarding authority | Stable external identity and business scope; contact method; consent/evidence; no synthetic Conversation membership | External phone/SMS/email or `none`; `projectOnly` when a project exists | BLOCKED | Contact data and consent remain ad hoc; external events could be misrendered as chat |
| Team member | Authentication plus Business/team membership | Authenticated user; active team membership; assigned relationship/project scope; internal audience; Conversation membership where needed | `internalNote`, team Chat if authorized, `projectOnly` | BLOCKED | No canonical team membership, assignment, or internal Conversation authority is evidenced |
| Vendor | Business/vendor identity plus Vendor relationship or Project membership | Stable vendor identity; approved business/project relationship; scope, consent, audience, and revocation | Vendor coordination Chat when authorized; external channels with consent; `projectOnly` | BLOCKED | No vendor identity/relationship model or vendor-scoped visibility rules |

## 8. Contact-Type Evidence Detail

### Registered Customer

Required:

- registered user ID;
- authoritative relationship reason;
- Conversation membership and access state;
- role snapshot;
- block/revocation state;
- canonical Project link for project events/documents.

Authentication alone makes a user identifiable, not contact-visible or
message-authorized.

### Manual Customer

Required:

- `manualCustomerId`;
- owning business;
- relationship reason;
- structured contact and consent for external channels;
- project membership where project context exists;
- explicit account-link and Conversation membership for authenticated Chat.

No identity or access may be derived from phone, email, schedule, quote, or
inbox data.

### Business/Professional

Required:

- authenticated user;
- business identity/membership;
- relationship or project evidence;
- Conversation role and access;
- audience scope.

A profile listing or prior quote does not grant perpetual communication.

### Tenant

Required:

- stable registered or Manual Customer identity;
- tenant role on the specific project/property relationship;
- tenant-visible audience rules;
- independent consent/access;
- revocation and move-out/end-of-tenancy handling.

Tenant access must not expose property-manager-only or owner-only records.

### Property Manager

Required:

- stable identity;
- authoritative property/business management relationship;
- project-specific manager role where applicable;
- manager audience rules;
- separation from tenant and owner identity;
- independent access and revocation.

Manager contact values do not establish authority over every tenant or
property.

### Project Participant

Required:

- authoritative identity;
- canonical project;
- participant role/status;
- Conversation membership;
- event/document visibility.

Project membership may justify contact visibility, but only Conversation
authority grants Chat actions.

### Repeat Customer

Required:

- stable existing identity;
- prior project relationship;
- approved ongoing or new relationship reason;
- distinct new project for new work;
- explicit current Conversation/access state.

Repeat status is a projection, not a duplicate merge decision.

### External Contact

Required:

- authoritative external identity;
- owning business;
- contact method and consent;
- relationship purpose;
- project link when project-scoped;
- external event provenance.

Professional-recorded communication must never appear customer-authored.

### Team Member

Required:

- authenticated user;
- active business/team membership;
- assignment or relationship scope;
- internal audience;
- role and revocation.

Team membership must not expose customer Conversations or projects globally.

### Vendor

Required:

- stable vendor/business identity;
- vendor relationship or project assignment;
- scope of work;
- audience and document visibility;
- communication channel authority;
- end/revocation state.

Vendor access must not expose customer financial, internal, tenant, or
unrelated project history by default.

## 9. Cross-Cutting Rules

### Lead Independence

A contact may exist without a lead.

Lead closure does not delete identity or relationship history. Lead evidence
may be one current or historical `relationshipReason`, but it is not permanent
contact authority.

### Project Independence

A contact may exist without an active project only when an authoritative
relationship exists.

Examples:

- accepted direct registered relationship;
- active business/team relationship;
- customer onboarding relationship;
- prior completed-project relationship retained under policy;
- vendor/business relationship;
- pending invitation.

Without relationship authority, the projection is blocked or absent.

### Manual Customer Chat

Manual Customers cannot use authenticated Chat until:

1. a registered account is explicitly linked;
2. accepted membership exists;
3. Conversation authority grants access;
4. audience and visibility are approved.

### External Communication

External phone, SMS, and email require:

- authoritative contact method;
- consent for the channel and purpose;
- current relationship authority;
- actor/source/time evidence for recorded interactions;
- visibility classification.

External transport events are not messages unless the actual channel and
participant authority support that classification.

### Tenant and Property Manager Visibility

Visibility is role-scoped and project/property-scoped.

Tenant, manager, owner, professional, team, and vendor audiences must not be
collapsed into one broad project Conversation without approved scope.

### Post-Completion Communication

Project completion:

- does not reopen work through a new message;
- does not automatically close all communication;
- does not guarantee indefinite access;
- does not change project history finality;
- does not convert follow-up into active work.

Warranty/follow-up communication uses an approved Conversation state or a new
relationship Conversation. New work requires a new project or approved
reactivation command owned outside Chat.

### Chat Prohibitions

Chat cannot:

- create or merge identity;
- create a relationship;
- grant Conversation access;
- add participants;
- approve contact consent;
- convert Manual Customers;
- infer roles from display labels;
- treat inbox rows as contacts;
- treat an archived row as access authority;
- treat messages as the complete relationship history.

## 10. Provenance and Warning Contract

Both projections must report provenance at field or group level.

Initial trust classifications:

- `AUTHORITATIVE`;
- `INFERRED`;
- `FALLBACK`;
- `CONFLICTING`;
- `MISSING`.

Minimum provenance groups:

```js
{
  identity,
  relationship,
  projects,
  conversations,
  capabilities,
  lastInteraction
}
```

Rules:

1. Actionable capabilities require authoritative evidence.
2. Inferred or fallback identity cannot receive communication capabilities.
3. Conflicting access produces `none` and a blocker warning.
4. Legacy inbox rows may be represented for reconciliation only.
5. Warnings contain no message content or sensitive contact value.
6. Warnings are structured and machine-readable.

Suggested warning codes:

- `missing-authoritative-identity`;
- `missing-relationship-authority`;
- `legacy-inbox-row-not-contact`;
- `missing-conversation-membership`;
- `missing-project-link`;
- `manual-customer-chat-unavailable`;
- `missing-external-consent`;
- `conflicting-participant-role`;
- `audience-scope-unresolved`;
- `post-completion-access-policy-unresolved`;
- `blocked-or-revoked`;
- `contact-capability-unavailable`.

## 11. Relationship and Access State Separation

Relationship status and Conversation access status must remain separate.

Examples:

| Relationship | Conversation access | Valid interpretation |
| --- | --- | --- |
| `active` | `active` | Current relationship and active Conversation |
| `active` | `closed` | Relationship remains; this Conversation ended |
| `completedProject` | `active` | Approved follow-up Conversation without reopening work |
| `completedProject` | `closed` | Project and Conversation both concluded |
| `archived` | `active` | Contact hidden/de-emphasized, access still governed independently |
| `blocked` | `blocked` | Communication prohibited |
| `revoked` | `revoked` | Prior membership/access withdrawn |
| `invited` | `pendingInvite` | No authenticated participant access yet |

Chat must not infer one state from the other.

## 12. Legacy Inbox Reconciliation Policy

Current inbox rows may contain:

- request/conversation-like IDs;
- customer labels or email;
- project titles;
- unread/archive state;
- emergency/local registry provenance.

They may support a future warning-only reconciliation report. They cannot:

- create `relationshipContactId`;
- establish `identityRef`;
- establish duplicate identity;
- establish project membership;
- establish Conversation membership;
- grant a capability;
- become a Contacts list source without authoritative joins.

The safest legacy output is:

```text
unresolved relationship candidate
+ source references
+ no capabilities
+ warnings
```

## 13. Readiness Matrix

| Area | Status | Notes |
| --- | --- | --- |
| Contact Projection | READY | Read-only shape, ownership, references, status, capability, provenance, and warning rules are defined |
| Conversation Access | READY | Read-only access shape, audience, participants, actions, visibility, and state semantics are defined |
| Manual Customers | BLOCKED | Runtime identity, consent, project participation, invitation, link, and Conversation authority are absent |
| Registered Users | PARTIAL | Authentication and backend sender identity exist; canonical relationship and Conversation membership do not |
| Tenants | BLOCKED | No tenant membership, property relationship, audience, or revocation authority |
| Property Managers | BLOCKED | No manager relationship, multi-project scope, or audience authority |
| Post-Completion Communication | BLOCKED | Follow-up, retention, closed/open, revocation, and new-work policy are unresolved |
| Repeat Customers | BLOCKED | No stable relationship projection or safe identity grouping across projects |
| Overall Runtime Adoption | BLOCKED | Backend relationship, participant, access, consent, and projection authorities do not exist |

`READY` means the specification is complete enough for pure contract and
fixture work. It does not authorize runtime use.

## 14. Can Contacts List UI Be Designed Yet?

### Production or data-connected UI

**No. BLOCKED.**

A production/data-connected Contacts list would force unresolved choices about:

- authoritative row identity;
- duplicate grouping;
- who appears;
- why they appear;
- access and capability badges;
- blocked/revoked handling;
- tenant/manager audience;
- Manual Customer linking;
- post-completion behavior;
- privacy and consent.

Using current inbox rows would encode the wrong architecture.

### Non-functional concept design

**Limited low-fidelity concept work may proceed only as disposable
exploration.**

It must:

- use synthetic data;
- label identity and access uncertainty;
- avoid implying that every contact can Chat;
- show `none`, external-only, project-only, pending, blocked, and revoked
  states;
- include multi-project and multi-role contacts;
- not establish route, storage, API, or data-shape commitments.

No UI implementation should enter runtime until Phase 3 contract
characterization and backend-readiness evidence are complete.

## 15. What Remains Blocked

- Runtime contact creation or persistence.
- Deriving contacts from inbox rows.
- Contact grouping by name, email, phone, address, title, or message history.
- Canonical relationship identity.
- Project-independent relationship persistence.
- Canonical Conversation creation and participant authorization.
- Manual Customer authenticated Chat before accepted link and membership.
- External communication without channel-specific consent/evidence.
- Tenant/property-manager multi-party visibility.
- Team and vendor scope/authorization.
- Post-completion retention, follow-up, and access policy.
- Repeat-customer grouping and cross-project history projection.
- Blocking, revocation, and archive authority.
- Contact merge, account link, or participant management inside Chat.
- Production Contacts List UI.

## Phase 3 Recommendation

**Relationship Communication Phase 3 - Pure Contact and Access Validation
Harness**

Allowed scope:

1. Create pure, non-persisting contract constants and constructors for
   `relationshipContact` and `conversationAccess`.
2. Create pure validators for required fields, identity separation,
   relationship evidence, participant membership, audience scope,
   capabilities, access status, and provenance.
3. Add sanitized fixtures for all ten contact types.
4. Validate:
   - visible contact with no communication capability;
   - lead-independent relationship;
   - project-independent relationship with explicit authority;
   - Manual Customer external-only capability;
   - linked Manual Customer still missing Conversation membership;
   - tenant and property-manager audience separation;
   - post-completion active relationship with closed Conversation;
   - repeat customer with multiple projects;
   - blocked/revoked access;
   - legacy inbox row retained as unresolved with `none`.
5. Produce structured readiness and warning reports.

Phase 3 must not:

- access localStorage or network;
- create identities, relationships, projects, or Conversations;
- generate production IDs;
- grant capabilities or access;
- import into Chat or other UI;
- create routes, backend models, or persistence;
- reconcile people by contact values;
- continue automatically into runtime adoption.

Stop if a relationship authority, consent policy, participant role, audience
rule, follow-up policy, or backend schema must be chosen.

## Final Decision

The read-only Contact Projection and Conversation Access specifications are
**READY** for pure validation and fixture characterization.

Runtime Contacts remain **BLOCKED**.

Contacts are lead-independent and may be project-independent only when an
authoritative relationship exists. Chat may eventually render these
projections and invoke allowed actions, but it must never own or infer the
identity, relationship, access, capability, or history behind them.

