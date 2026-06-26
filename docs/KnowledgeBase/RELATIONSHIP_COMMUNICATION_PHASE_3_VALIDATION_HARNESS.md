# Relationship Communication Phase 3 Validation Harness

## Status

**Phase:** Relationship Communication Phase 3  
**Type:** Pure architecture validation  
**Runtime adoption:** BLOCKED  
**UI, routing, storage, backend, writer, and Chat changes:** None

## Executive Summary

Phase 3 converts the Phase 2 Contact Projection and Conversation Access
specification into pure, non-persisting contract helpers, validators, and
sanitized fixtures.

The harness proves that Meetro can:

- shape a predictable `relationshipContact` read projection;
- shape a predictable `conversationAccess` read projection;
- validate identity separation;
- validate relationship reasons and lifecycle states;
- validate project and Conversation references;
- validate participant identity and membership evidence;
- validate audience and visibility separation;
- deny actionable communication when provenance is insufficient;
- retain unresolved legacy inbox rows without treating them as contacts;
- preserve post-completion relationship and Conversation state separately.

The harness does not create contacts, relationships, Conversations, access,
capabilities, projects, or identity. Runtime adoption remains **BLOCKED**.

## Files Created

### Contract Helpers

- `src/utils/relationshipContactContract.js`
- `src/utils/conversationAccessContract.js`

### Validators

- `src/utils/relationshipContactValidation.js`
- `src/utils/conversationAccessValidation.js`

### Fixtures and Tests

- `tests/fixtures/relationshipCommunicationFixtures.js`
- `tests/relationshipContactValidation.test.js`
- `tests/conversationAccessValidation.test.js`

## Contract Helper Strategy

The constructors normalize caller-supplied read shapes only.

They:

- preserve supplied values;
- deep-copy nested arrays and records;
- supply empty strings, arrays, or records for missing shape fields;
- produce deterministic output;
- never generate production IDs;
- never assign timestamps;
- never infer identity, project, Conversation, relationship, access, audience,
  actions, visibility, or capability;
- never access browser globals, storage, network, UI, or backend modules.

### Relationship Contact Helpers

`relationshipContactContract.js` exports:

- `createRelationshipIdentityRef(input)`
- `createRelationshipContact(input)`
- identity type constants;
- contact type constants;
- relationship reason constants;
- relationship status constants;
- communication capability constants;
- provenance trust constants;
- required-field constants.

### Conversation Access Helpers

`conversationAccessContract.js` exports:

- `createConversationParticipantRef(input)`
- `createConversationAccess(input)`
- access status constants;
- audience scope constants;
- allowed action constants;
- visibility field/value constants;
- required-field constants.

## Validation Return Shape

Both validators return:

```js
{
  valid,
  riskLevel,
  missingFields,
  warnings,
  blockers,
  projection
}
```

Risk values:

- `LOW`: structurally valid with authoritative evidence and no warnings;
- `MEDIUM`: structurally valid but intentionally incomplete or warning-bearing;
- `HIGH`: one or more blockers prevent safe use.

`valid` means the supplied read projection satisfies the pure contract. It
does not mean a backend created or authorized the record.

## Relationship Contact Validation

`validateRelationshipContact(input)` validates:

- all required projection fields;
- typed `identityRef`;
- projection identity separated from contact identity;
- approved contact type;
- approved relationship reasons;
- approved relationship status;
- project reference structure;
- project identity separated from contact identity;
- Conversation reference structure;
- Conversation access status and audience scope;
- approved communication capabilities;
- `none` exclusivity;
- blocked/revoked deny-by-default behavior;
- contact-type/reason alignment;
- tenant, property manager, and project-participant project evidence;
- repeat-customer multiple-project evidence;
- authoritative provenance for actionable capabilities;
- Manual Customer Chat prerequisites;
- authoritative project-independent relationship evidence;
- normalized UTC `lastInteractionAt`;
- structured provenance and warnings.

### Identity Separation

The validator prevents:

- `relationshipContactId` from becoming person/customer identity;
- project ID from becoming contact identity;
- display values from filling identity;
- unknown legacy identities from receiving actionable capabilities.

### Actionable Capability Rule

These capabilities are actionable:

- `authenticatedChat`;
- `externalPhone`;
- `externalSms`;
- `externalEmail`;
- `internalNote`.

They require authoritative:

- identity provenance;
- relationship provenance;
- capability provenance.

Complete-looking fields with fallback, inferred, conflicting, or missing
provenance remain blocked.

### Manual Customer Rule

A Manual Customer may have external-only capability when the projection
reports authoritative identity, relationship, and consent/capability evidence.

`authenticatedChat` additionally requires:

- a linked registered-user identity reference;
- explicit linked status;
- an active Conversation reference.

The validator does not create or approve either relationship.

### Legacy Inbox Rule

An unresolved legacy inbox row may remain visible as a read-only reconciliation
candidate when:

- identity type is `unknownLegacyIdentity`;
- communication capability is exactly `none`;
- provenance remains explicitly missing/inferred/fallback;
- a `legacy-inbox-row-not-contact` warning is retained.

This case is valid for read preservation and receives `MEDIUM` risk. It is not
a trusted contact and cannot communicate.

## Conversation Access Validation

`validateConversationAccess(input)` validates:

- required access fields;
- canonical Conversation and relationship IDs;
- project identity separation;
- approved access status;
- approved audience scope;
- participant identity references;
- participant roles and membership statuses;
- approved allowed actions;
- `none` exclusivity;
- deny-by-default for blocked, revoked, and pending access;
- no `sendMessage` on closed Conversations;
- authoritative provenance for `sendMessage`;
- canonical project requirement for project-scoped actions;
- complete visibility rules;
- tenant audience/visibility separation;
- property-manager audience/visibility separation;
- internal-note audience restrictions;
- authoritative project-independent relationship evidence;
- structured provenance and warnings.

### Access Does Not Grant Itself

The validator checks a supplied decision. It does not:

- create a Conversation;
- add participants;
- turn project membership into Chat access;
- reopen closed access;
- derive access from an inbox row;
- grant `sendMessage`;
- widen audience scope.

### Blocked and Revoked Access

Blocked, revoked, and pending-invite access must use:

```js
allowedActions: ["none"]
```

Any communication or project action under those states is a blocker.

### Post-Completion Separation

A completed relationship may reference a closed Conversation with limited
read actions.

The harness confirms that:

- relationship status and access status remain separate;
- closed access cannot send messages;
- completed project summary may remain readable when explicitly allowed;
- no action reopens completed work.

## Provenance Model

Initial trust values:

- `AUTHORITATIVE`;
- `INFERRED`;
- `FALLBACK`;
- `CONFLICTING`;
- `MISSING`.

### Contact Provenance Groups

- `identity`;
- `relationship`;
- `projects`;
- `conversations`;
- `capabilities`;
- `lastInteraction`.

### Access Provenance Groups

- `conversation`;
- `relationship`;
- `participants`;
- `audience`;
- `actions`;
- `visibility`.

Every group must declare a recognized trust value. Non-authoritative groups
produce warnings. Actionable capabilities and message sending apply stricter
field-specific blockers.

## Fixture Coverage

| Fixture | Primary rule characterized | Result |
| --- | --- | --- |
| Registered customer | Authoritative identity, project, Conversation, Chat capability | Valid |
| Manual customer | External-only communication without authenticated Chat | Valid |
| Business/professional | Project-independent authoritative business relationship | Valid |
| Tenant | Project membership and tenant-scoped Conversation reference | Valid |
| Property manager | Manager role and manager-scoped Conversation reference | Valid |
| Project participant | Project visibility without direct communication | Valid |
| Repeat customer | Stable identity across multiple separate projects | Valid |
| External contact | External identity and consented channel without Chat | Valid |
| Team member | Team relationship and internal communication scope | Valid |
| Vendor | Vendor identity, project role, and coordination scope | Valid |
| Legacy inbox row | Unresolved identity retained with `none` and warnings | Valid, medium risk |

The fixtures are synthetic and sanitized. They are test inputs, not contacts,
storage records, backend seeds, or production IDs.

## Test Coverage

Focused tests verify:

1. valid registered customer contact;
2. Manual Customer external-only capability;
3. Manual Customer cannot use authenticated Chat without link and active
   Conversation;
4. tenant audience separation;
5. property manager audience separation;
6. repeat customer with multiple projects;
7. post-completion relationship with closed Conversation;
8. blocked access prevents communication actions;
9. revoked access prevents communication actions;
10. legacy inbox row remains unresolved with `none`;
11. missing authoritative identity blocks actionable capability;
12. project-independent relationship/access requires explicit authority;
13. representative fixture coverage for all ten contact types;
14. identity and project separation;
15. participant identity requirements;
16. deterministic output;
17. no input mutation;
18. no localStorage or `window` access.

## Readiness Findings

### Ready

- Contract vocabularies can be represented in pure code.
- Constructors preserve shape without inference or generation.
- Contact and access decisions can be validated separately.
- Actionable capability can be separated from contact visibility.
- Manual Customer external-only status can be represented safely.
- Tenant and property-manager audiences can be kept separate.
- Repeat-customer identity can span distinct projects.
- Legacy inbox rows can remain visible without becoming contacts.
- Blocked/revoked states can deny actions deterministically.

### Partial

- The harness uses declared provenance but cannot verify backend authority.
- Participant roles are structurally validated, but no canonical role registry
  or membership backend exists.
- External capability provenance represents consent authority but does not
  establish legal or transport sufficiency.
- Post-completion read behavior can be characterized, but retention/follow-up
  policy is unresolved.

### Blocked

- Runtime contact identity and persistence.
- Runtime relationship creation and lookup.
- Canonical Project participant authority.
- Canonical Conversation creation and membership.
- Backend authorization of allowed actions.
- External contact method and consent persistence.
- Invitation/account-link authority.
- Tenant/property-manager property relationships.
- Team membership and vendor relationships.
- Repeat-customer grouping from production data.
- Contacts UI adoption.

## Readiness Matrix

| Area | Status | Notes |
| --- | --- | --- |
| Contact Contract | READY | Constants and deep-copy read-only constructors implement the Phase 2 shape |
| Access Contract | READY | Access, audience, participant, action, and visibility constructors are defined |
| Validation Harness | READY | Pure deterministic validators and sanitized fixture tests cover core rules |
| Manual Customers | PARTIAL | External-only and Chat-blocking rules validate; runtime identity/link/consent authority is absent |
| Tenants | PARTIAL | Role and audience separation validate; property membership authority is absent |
| Property Managers | PARTIAL | Manager scope validates; managed-property and participant authority is absent |
| Repeat Customers | PARTIAL | Multiple project references validate; authoritative cross-project grouping is absent |
| Legacy Inbox Rows | READY | Rows can remain unresolved with warnings and `none`, never as trusted contacts |
| Runtime Contacts | BLOCKED | No backend relationship, participant, consent, access, or projection authority |
| Overall | PARTIAL | Architecture validation is ready; production adoption is blocked |

## Remaining Runtime Blockers

1. Authoritative relationship identity.
2. Backend relationship persistence and business scoping.
3. Canonical Project aggregate and participant membership.
4. Canonical Conversation and participant authorization.
5. Contact method and consent authority.
6. Invitation and Manual Customer account linking.
7. Tenant/property manager property relationship.
8. Team membership and project assignment.
9. Vendor relationship and visibility policy.
10. Block/revocation authority and audit.
11. Post-completion retention and follow-up policy.
12. Repeat-customer cross-project relationship projection.
13. Safe import/reconciliation policy for external contact sources.
14. Production data contract and API.

## Phase 4 Recommendation

**Relationship Communication Phase 4 - Contact Import Architecture Audit**

Phase 4 should remain audit/specification-only.

It should define:

1. supported import sources, such as professional address book, CSV, external
   CRM, Manual Customer onboarding, and existing Meetro identities;
2. source provenance and owning-business scope;
3. preview-only import candidates;
4. identity matching prohibitions;
5. duplicate candidate signals without automatic merge;
6. contact-method normalization without identity promotion;
7. consent status and communication capability defaults;
8. existing-user invitation and account-link boundaries;
9. project/relationship creation boundaries;
10. import rejection, rollback, audit, and privacy requirements;
11. legacy inbox-row exclusion from automatic import;
12. backend prerequisites and security review.

Phase 4 must not:

- access device contacts;
- read files or external CRM data;
- create contacts or relationships;
- persist import candidates;
- auto-match by phone/email/name;
- grant capabilities;
- create Conversations;
- import into Chat;
- implement UI.

## `MEETRO_CORE_DOMAIN_MODEL.md` Timing

`MEETRO_CORE_DOMAIN_MODEL.md` should be created **after the Phase 4 Contact
Import Architecture Audit and before any backend schema or Contacts UI design
is approved**.

Reason:

- Phases 1 through 3 now define identity, relationship contact, project
  participation, Conversation access, capability, and history boundaries.
- Phase 4 must add import/source/reconciliation boundaries, which affect how
  external identities enter the model.
- Writing the core model before Phase 4 risks omitting import provenance,
  candidate identity, consent defaults, and duplicate review.
- Waiting until backend implementation would be too late; schema choices would
  begin defining the domain implicitly.

The core model should then define, at minimum:

- User;
- Business;
- Manual Customer;
- Relationship;
- Contact Method;
- Consent Record;
- Project;
- Project Participant;
- Conversation;
- Conversation Participant;
- Message;
- Workflow Event;
- Invitation;
- Account Link;
- Duplicate Candidate;
- Import Candidate;
- Relationship History projection.

It should explicitly define IDs, owners, cardinality, lifecycle, visibility,
and prohibited substitutions.

## Final Decision

The pure Contact and Conversation Access validation harness is **READY** for
architecture characterization.

It demonstrates that Meetro can safely distinguish:

- visible contact from actionable communication;
- relationship from project;
- relationship status from Conversation access;
- external communication from authenticated Chat;
- Manual Customer from linked user;
- tenant from property manager;
- repeat identity from repeated projects;
- legacy inbox candidate from trusted contact.

Runtime Contacts remain **BLOCKED**. The next safe step is a Contact Import
Architecture Audit, followed by the consolidated core domain model before
backend or UI adoption.

