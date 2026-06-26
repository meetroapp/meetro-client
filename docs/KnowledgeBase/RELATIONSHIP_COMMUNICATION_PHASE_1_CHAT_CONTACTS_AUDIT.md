# Relationship Communication Phase 1 Chat Contacts Architecture Audit

## Scope

This audit defines the ownership boundary for future Chat Contacts without
creating contacts UI, contact storage, routes, writers, or workflow behavior.

It reviews the current inbox, Conversation thread, message backend evidence,
Manual Customer contracts, project identity rules, and relationship timeline
architecture.

## Executive Finding

Chat Contacts belong to **Relationship Communication**, not Chat alone and not
Identity alone.

Identity authorities own people, organizations, accounts, Manual Customers,
and business identities. Project and relationship membership authorities own
who is related and why. Conversation authority owns communication access.
Relationship History owns the durable record of that relationship.

Chat may later display a contact projection and initiate an authorized
Conversation. It must not:

- create identity from an inbox row;
- merge contacts by name, phone, or email;
- grant Conversation access;
- invent project membership;
- treat message history as the complete relationship history;
- own customer history or account conversion.

The current application has a conversation inbox, not a contact architecture.
Overall Chat Contact readiness is **BLOCKED**.

## Current Implementation Reality

`MessagesInbox.jsx` assembles conversation rows from:

- backend contractor quote requests;
- `meetro_conversation_registry`;
- active emergency records;
- locally discovered business conversation keys;
- demo fallback records.

Rows use fields such as:

- conversation/request-like `id`;
- project title and description;
- homeowner email or display label;
- location;
- unread state;
- conversation type;
- saved/history state.

Rows are deduplicated by their conversation-like ID. They are not deduplicated
or grouped by person, account, Manual Customer, business, or relationship.

`ConversationThread.jsx` resolves names, roles, phone numbers, project labels,
receiver IDs, and conversation IDs from a large set of local and request
fallbacks. Backend messages are keyed by quote request. Missing sender role can
be inferred relative to the viewer.

The backend evidence establishes authenticated message persistence but does
not establish:

- canonical Conversations;
- Conversation participants;
- canonical Projects;
- project participants;
- participant authorization on message reads/writes;
- relationship contacts.

Therefore, an inbox row cannot become a trusted Chat Contact.

## 1. What Is a Chat Contact?

A Chat Contact is a read projection representing an identity or project
participant with whom the current authenticated principal has an authorized
communication relationship.

A future projection may include:

```text
contactIdentityRef
contactType
displayName
relationshipTypes
sharedProjectRefs
conversationRefs
communicationCapabilities
lastInteractionAt
relationshipStatus
identityProvenance
```

This is not a new identity record. Every identity reference must come from its
own authority:

- registered user from Authentication/User authority;
- Manual Customer from Customer onboarding;
- business/professional from Business identity;
- tenant/property manager from their identity authority plus project role;
- project participant from Project membership.

## 2. Can a Contact Exist Without a Lead?

**Yes. Contacts should be lead-independent.**

Examples:

- an existing or repeat customer after the lead is resolved;
- a business/professional relationship;
- a tenant or property manager invited directly to a project;
- a project participant added after work begins;
- an authenticated relationship continuing after project completion;
- an external Manual Customer entered through customer onboarding.

A lead is one acquisition/workflow context. It is not person identity or a
permanent relationship.

Lead-independent does not mean authority-free. A contact still needs an
identity source and an authorized relationship reason.

Classification: **READY as an architecture rule; BLOCKED in runtime**.

## 3. Can a Contact Exist Without a Project?

**Yes, but communication capabilities depend on relationship authority.**

A project-independent contact may exist because of:

- a direct registered-user/business relationship;
- a previously completed relationship;
- an invitation or onboarding relationship;
- a verified business-to-business relationship;
- a Manual Customer record before a project is created.

However:

- appearing in a contact projection does not automatically grant chat;
- an unlinked Manual Customer may allow recorded external contact but not
  authenticated Meetro messaging;
- workflow cards, documents, approvals, and completion actions remain
  project-scoped;
- participant visibility cannot be inferred from prior messages.

Classification: **PARTIAL** pending relationship and Conversation authority.

## 4. Can Communication Continue After Project Completion?

**Potentially yes. Completion and communication lifecycle must be separate.**

Project completion should:

- stop active workflow transitions that require open work;
- preserve the project timeline and documents;
- preserve participant and actor provenance;
- move operational project presentation to History under the approved finality
  policy.

Completion should not automatically:

- delete messages;
- remove a legitimate relationship;
- turn archive state into access revocation;
- grant indefinite communication access.

Post-completion communication requires an explicit policy covering:

- Conversation open/closed state;
- participant access and revocation;
- retention;
- follow-up and warranty communication;
- customer blocking/reporting;
- whether new work creates a new project;
- visibility of prior project history.

The current app's `saved_to_history` and archived registry fields mix inbox
presentation with history state and do not provide this authority.

Classification: **BLOCKED** pending lifecycle and access policy.

## 5. How Do Manual Customers Appear?

An unlinked Manual Customer may appear in a future Relationship Contact
projection as an external contact with:

- authoritative `manualCustomerId`;
- owning business;
- consented communication methods;
- shared Manual Project memberships;
- external communication capability;
- account-link status;
- explicit indication that authenticated Meetro chat is unavailable.

It must not appear as:

- a registered homeowner;
- a synthetic message sender;
- a Conversation participant without authorization;
- a contact whose identity is its email, phone, schedule, quote, or project ID.

After an account is linked:

- the Manual Customer identity remains;
- the linked registered user becomes an authorized participant only through
  accepted membership;
- historical external events retain their original source;
- duplicate contacts are reconciled through projection, not destructive merge.

Classification: **BLOCKED** because backend identity, membership, consent, and
account-link authority do not exist.

## 6. How Do Registered Users Appear?

A registered user appears through Authentication/User identity plus an
authorized communication relationship.

Required evidence:

- stable user ID;
- display/profile projection;
- current relationship or participant membership;
- Conversation access;
- block/revocation state;
- role for the relevant Conversation or project.

User ID and authentication are partially available. Canonical Conversation
membership and participant authorization are not.

Classification: **PARTIAL**.

## 7. How Do Tenants and Property Managers Appear?

Tenant and property manager are project/relationship roles, not substitutes
for identity.

Each must have:

- a separate registered or Manual Customer identity;
- explicit role on the relevant property/project;
- scoped Conversation access;
- contact consent where external channels are used;
- visibility rules for documents, internal notes, approvals, invoices, and
  completion;
- independent revocation.

One person may hold different roles across projects. A shared address, phone,
email, employer, or property does not merge identities.

Property workflows may require multiple Conversations or audience scopes:

- professional and property manager;
- professional and tenant;
- project-wide participant channel;
- internal business notes.

The current code has only incidental tenant/property-manager text references
and no participant model.

Classification: **BLOCKED**.

## 8. What Owns Contact Identity?

Identity ownership remains domain-specific:

| Identity | Owner |
| --- | --- |
| Registered customer/user | Authentication/User authority |
| Manual Customer/external person | Customer onboarding |
| Business/professional | Business identity plus authenticated user authority |
| Tenant | Registered-user or Manual Customer identity authority |
| Property manager | Registered-user, Manual Customer, or business identity authority |
| Project participant role | Project membership authority |
| Repeat-customer relationship | Relationship projection over stable identity and projects |

Relationship Communication consumes these identities. It does not create or
merge them.

## 9. What Owns Conversation Access?

Conversation authority owns access, backed by:

- authenticated principal;
- Conversation identity;
- participant membership;
- role and audience scope;
- project/relationship link;
- open, closed, blocked, revoked, or archived state;
- channel capability.

Project membership may justify creating or joining a project Conversation,
but Chat UI must not grant membership itself.

The current backend authenticates message requests but does not verify
quote-request or Conversation participation. Current local inbox and registry
state are not access authority.

Classification: **BLOCKED**.

## 10. What Owns Relationship History?

Project Events and Relationship History projections own durable relationship
facts.

History may aggregate:

- shared projects;
- authorized Conversations;
- external contact events;
- appointments;
- quotes and decisions;
- work;
- invoices and payments;
- completion and follow-up;
- invitations and account links;
- access or relationship state changes.

Chat owns message presentation and message-specific interaction. A message
list is one relationship source, not the entire relationship history.

Conversation archive state is also not project or customer History authority.

Classification: **BLOCKED** because canonical project/relationship identity
and history finality remain fragmented.

## Contact Type Audit

| Contact Type | Identity Owner | Chat Access | Relationship History | Risk | Status |
| --- | --- | --- | --- | --- | --- |
| Registered customer | Authentication/User authority | Authorized Conversation membership; project membership where workflow context is used | Projects, canonical events, Conversations, and customer relationship projection | Backend sender identity exists, but Conversation/project membership is absent | PARTIAL |
| Manual customer | Customer onboarding | No authenticated chat until accepted account link; external contact only with consent/evidence | Manual projects plus external relationship events | No backend customer, consent, project participant, or link authority | BLOCKED |
| Business/professional | Business identity plus Authentication | Authorized Conversation or verified direct relationship | Business/customer projects and relationship events | Business identity exists partially; Conversation membership and role snapshots are incomplete | PARTIAL |
| Tenant | Registered-user or Manual Customer identity; project role from Project membership | Explicit tenant membership and audience scope | Property projects and tenant-visible relationship events | No tenant identity/role/access model | BLOCKED |
| Property manager | Registered-user, Manual Customer, or business identity; role from Project membership | Explicit manager membership and audience scope | Managed-property relationships and authorized project histories | No manager participant or multi-party access model | BLOCKED |
| Project participant | Owning identity authority plus Project membership | Conversation membership derived or granted by authority, never by Chat UI | Project events and participant-visible documents/messages | No canonical participant registry | BLOCKED |
| Repeat customer | Original stable customer/user identity plus relationship projection | Existing authorized relationship or a new approved Conversation | Cross-project history projection; each project remains separate | Current inbox duplicates by conversation, not identity; unsafe contact matching | BLOCKED |
| External contact | Customer/contact onboarding authority | External channel only unless converted through authenticated link | Professional-recorded external events with source/evidence | Contact values and consent are ad hoc; synthetic chat risk | BLOCKED |

## Contact Lifecycle

A contact projection may move through relationship states such as:

```text
known identity
-> authorized relationship
-> active communication
-> project participant
-> completed-project relationship
-> repeat relationship or inactive relationship
```

These are relationship states, not identity mutations.

Rules:

1. Closing a lead does not delete identity.
2. Completing a project does not rewrite identity.
3. Archiving an inbox row does not revoke access.
4. Deleting a local conversation cache does not delete the relationship.
5. Blocking or revocation must be authoritative and auditable.
6. New work should use a new project even for a repeat customer.
7. A contact can have multiple Conversations and projects.
8. One Conversation can have multiple participants only under explicit
   audience rules.

## Chat Contacts Ownership Matrix

| Capability | Correct owner | Chat role | Current status |
| --- | --- | --- | --- |
| Identity creation | User, Customer onboarding, or Business identity | Display projection only | BLOCKED/PARTIAL by type |
| Contact methods | Customer/contact authority | Invoke allowed channel capability | BLOCKED |
| Consent | Consent authority | Respect capability result | BLOCKED |
| Relationship creation | Relationship/onboarding authority | Navigate or request | BLOCKED |
| Project participation | Project membership | Display project relationship | BLOCKED |
| Conversation membership | Conversation authority | Render authorized threads | BLOCKED |
| Message persistence | Backend Message authority | Send/render messages | PARTIAL |
| External contact events | Project Events/Relationship Timeline | Render with source label | BLOCKED |
| Relationship history | Relationship/Project History projection | Display summary/link | BLOCKED |
| Duplicate reconciliation | Identity/customer reconciliation | Display reviewed projection only | BLOCKED |
| Account linking | Invitation/Auth/Project membership | Reflect accepted link | BLOCKED |

## Key Architecture Decisions

### Are Chat Contacts part of Chat, Identity, or Relationship Communication?

**Relationship Communication.**

Identity authorities supply stable identities. Conversation authority supplies
access. Project and relationship authorities supply context. Chat is a
presentation and interaction surface over those owned capabilities.

### Should Contacts Be Lead-Independent?

**Yes.**

A lead is neither identity nor a permanent relationship. Contacts must support
repeat work, direct relationships, project participants, post-completion
follow-up, and Manual Customers that did not originate as leads.

Lead independence must not become contact-value matching. Stable identity and
relationship authority remain required.

## Readiness Matrix

| Area | Status | Notes |
| --- | --- | --- |
| Contact concept | READY | A relationship projection over owned identity and communication authority is defined |
| Registered identity | PARTIAL | Authenticated users exist; relationship membership is incomplete |
| Manual Customer identity | BLOCKED | No runtime/backend customer authority |
| Project-independent relationships | BLOCKED | No relationship aggregate or direct-contact authority |
| Project participants | BLOCKED | No canonical Project participant registry |
| Conversation access | BLOCKED | No canonical Conversation/participant authorization |
| Message persistence | PARTIAL | Backend messages exist but remain request-keyed and under-authorized |
| External communication | BLOCKED | No consented channel capability or external-event contract in runtime |
| Relationship history | BLOCKED | Timeline/history ownership and finality remain fragmented |
| Multi-party property relationships | BLOCKED | Tenant/manager role and audience models are absent |
| Post-completion communication | BLOCKED | Retention, access, revocation, and follow-up policy are unresolved |
| Overall | BLOCKED | Chat Contacts cannot safely be adopted from current inbox rows |

## What Must Remain Blocked

- Creating contacts from inbox, message, quote, schedule, or emergency rows.
- Using phone, email, display name, address, or conversation ID as identity.
- Giving an unlinked Manual Customer authenticated chat.
- Inferring tenant, manager, homeowner, or business access from labels.
- Treating lead participation as permanent contact authority.
- Treating project completion or inbox archive as access policy.
- Grouping repeat customers by contact-value matching.
- Combining Conversations across projects without relationship authority.
- Auto-merging linked and Manual Customer identities.
- Rendering professional-recorded external contact as customer-authored chat.
- Adding contact storage before identity and relationship owners exist.

## Recommended Next Phase

**Relationship Communication Phase 2 - Contact Projection and Conversation
Access Contract**

Specification-only scope:

1. Define a backend-neutral read-only `relationshipContact` projection.
2. Define identity references without duplicating identity records.
3. Define lead-independent and project-independent relationship reasons.
4. Define communication capabilities: authenticated chat, external phone,
   email/SMS, internal note, or none.
5. Define Conversation membership and audience scopes.
6. Define active, closed, blocked, revoked, and archived distinctions.
7. Define post-completion follow-up and repeat-customer behavior.
8. Define tenant/property-manager multi-party examples.
9. Define provenance and warning behavior for legacy inbox rows.

It must not create UI, storage, routes, contacts, Conversations, participants,
or runtime adoption.

## Final Decision

Chat may eventually display contacts, but Chat must not own identity,
relationship membership, access, or history.

Contacts should be lead-independent. They may be project-independent when an
authoritative relationship exists, but workflow participation and project
history remain project-scoped.

The next safe step is a pure Relationship Contact projection and Conversation
access specification. Runtime Chat Contacts remain **BLOCKED**.

