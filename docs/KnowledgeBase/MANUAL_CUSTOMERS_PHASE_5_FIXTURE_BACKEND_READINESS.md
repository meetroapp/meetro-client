# Manual Customers Phase 5 Fixture and Backend Readiness Audit

## Scope

This audit characterizes representative Manual Customer contexts against the
Phase 4 pure contract and compares that contract with the backend evidence
available inside `meetro-client`.

It does not:

- create runtime fixtures;
- create or migrate backend tables;
- generate production IDs;
- persist Manual Customers or projects;
- implement onboarding, invitations, links, merges, or UI;
- connect Manual Customers to Work Center or workflow writers.

## Executive Finding

The Phase 4 contract is sufficient to describe and validate representative
Manual Customer and Manual Project scenarios. It correctly keeps:

- customer identity separate from contact values;
- customer identity separate from project identity;
- one customer related to multiple projects;
- duplicate candidates separate until human review;
- registered-account links separate from Manual Customer identity;
- consent completeness separate from identity completeness;
- structural validity separate from authoritative provenance.

The documented backend is not ready to persist or authorize those contexts.
No verified backend source or schema evidence establishes:

- a Manual Customer table or equivalent aggregate;
- a canonical workflow Project table;
- project participants;
- customer contact and consent records;
- duplicate-review or merge records;
- invitations and account links;
- a Conversation participant model.

Manual Customer fixture characterization is **READY**. Backend adoption remains
**BLOCKED**.

## Evidence Boundary

Backend conclusions use the existing Knowledge Base source and database audits:

- `BACKEND_SOURCE_INVENTORY.md`
- `BACKEND_MESSAGE_ROUTE_AUTHORITY_AUDIT.md`
- `BACKEND_DATABASE_RELATIONSHIP_AUDIT.md`
- `BACKEND_MESSAGE_IDENTITY_AUTHORITY_CONTRACT.md`

Those documents inspected the public `metro-server` source and clearly
separate source evidence from unknown production database reality.

This phase did not access another repository or a live database. Unknown
production objects remain unknown rather than being classified as absent.

## Representative Fixture Model

A representative fixture is a sanitized, non-production input describing:

```text
Manual Customer context
+ one or more Manual Project contexts
+ optional duplicate candidates
+ optional account-link state
+ expected validation findings
```

Fixtures must use explicit synthetic IDs. They must not derive
`manualCustomerId` or `projectId` from a phone, email, name, address, schedule,
quote, request, Conversation, or generic record ID.

## Fixture Coverage Matrix

| Fixture | Customer shape | Project shape | Expected result | Status |
| --- | --- | --- | --- | --- |
| Complete external customer | One customer, one consented contact, one standard project, authoritative provenance | Distinct customer/project/professional IDs | Structurally valid, low contract risk | READY |
| Missing Manual Customer ID | Contact and display fields exist, identity absent | Project may contain source-local IDs | Block customer and participation; do not promote contact or schedule ID | READY |
| Missing project ID | Complete customer identity | Project data has quote/schedule/request IDs only | Block workflow participation; preserve source evidence | READY |
| Shared display name | Two customers share a name and have different contacts | Separate projects | Low-confidence duplicate signal only; no review requirement or merge | READY |
| Shared email | Two customer IDs share normalized email | Separate or unknown projects | Duplicate candidate requiring review; no merge | READY |
| Shared phone/SMS | Two customer IDs share normalized number | Separate or household-related projects | Duplicate candidate requiring review; no merge | READY |
| Multiple projects per customer | One `manualCustomerId` | Two distinct `projectId` values | Preserve one customer with separate project memberships and histories | READY |
| Missing consent | Actionable phone/email exists; consent evidence incomplete | Project otherwise complete | Block actionable communication, not customer identity preservation | READY |
| Denied/revoked consent | Contact remains recorded with denied/revoked status | Existing project remains | Block actionable use; retain consent provenance and project history | READY |
| Invitation pending | Customer is `invited`, no `linkedUserId` | Project-scoped invitation expected externally | Preserve Manual Customer; do not claim authenticated chat | PARTIAL |
| Linked account | Status `linked`, explicit distinct `linkedUserId` | Existing Manual Project remains | Validate shape; preserve both identities | PARTIAL |
| Wrong-status linked user | `linkedUserId` exists under `invited`, `unlinked`, or `revoked` | Any | Block as link-state conflict | READY |
| Conflicting linked accounts | Duplicate candidates reference different registered users | One or more projects | Block merge/link automation and require authority review | PARTIAL |
| Conflicting business ownership | Same customer candidate appears under different business owners | Projects belong to different businesses | Do not expose, merge, or link across business boundaries | BLOCKED |
| Tenant and property manager | Tenant and manager are distinct people with distinct roles/contact consent | Both may participate in one property project | Require separate identities and explicit project memberships | PARTIAL |
| Repeat customer | Existing Manual Customer returns for a new job | New distinct project | Reuse customer only through authoritative lookup; never through name/contact alone | PARTIAL |

`READY` means the Phase 4 pure contract can represent or reject the scenario
deterministically. It does not mean runtime support exists.

## Core Fixture Scenarios

### Complete Manual Customer

Required characteristics:

- explicit synthetic `manualCustomerId`;
- `customerType: "manual"` or `"external"`;
- owning business and authenticated creator;
- onboarding and persistence provenance;
- at least one structured contact method when communication is expected;
- granted consent evidence for actionable contact;
- explicit account-link status;
- one distinct Manual Project context.

This fixture proves contract completeness only. It does not prove backend
authorization.

### Duplicate Name

Two records may share `displayName`.

Expected behavior:

- preserve both IDs;
- create at most a low-confidence name signal;
- do not require merge solely because names match;
- do not move projects, communication, history, or documents.

### Shared Phone or Email

Two records may share a normalized phone, SMS number, or email because of:

- a household;
- a property office;
- a property manager;
- a shared business mailbox;
- recycled contact information;
- data-entry error.

Expected behavior:

- produce a duplicate-review candidate;
- keep `autoMerge: false`;
- display business scope and provenance during future review;
- keep all project memberships attached to their original identities.

### Multiple Projects

One Manual Customer may participate in multiple jobs.

Expected relationship:

```text
manualCustomerId
  -> projectId A
  -> projectId B
```

Each project retains its own:

- workflow type and status;
- professional participant;
- scheduling, quote, work, invoice, completion, and history records;
- communication access and visibility;
- project documents.

One project ID must never be reused as customer identity or as another
project's identity.

### Missing Consent

Missing consent does not erase the Manual Customer or project.

It blocks:

- actionable phone, SMS, or email use;
- invitation delivery through that channel;
- claims that external communication was authorized.

It does not authorize the validator to invent a consent timestamp or source.

### Account Link

Representative states:

- `unlinked`: no linked user;
- `invited`: invitation exists outside this contract, no accepted user link;
- `linked`: explicit distinct `linkedUserId`;
- `revoked`: no active linked-user authority.

The fixture must preserve the Manual Customer after linking. Historical
professional-recorded actions remain externally sourced and are not rewritten
as registered-user actions.

## Tenant and Property Manager Scenario

Tenant and property manager are roles, not interchangeable identity types.

A safe representative property workflow may contain:

```text
Property Project
  - professional participant
  - property manager participant
  - tenant participant
  - optional owner/customer participant
```

Required distinctions:

- each person or organization has its own identity;
- each role is project-scoped;
- a property address is not participant identity;
- manager contact values are not tenant identity;
- tenant consent does not grant manager consent, or vice versa;
- chat access follows explicit project/Conversation membership;
- internal property-management notes are not automatically tenant-visible;
- completion and post-project communication visibility require policy.

The current `manualProjectContext` has one `manualCustomerId` and one
`participantRole`. It can characterize one participant membership at a time,
but a multi-party property project requires a backend participant collection
or equivalent relationship.

Classification: **PARTIAL** at contract level and **BLOCKED** for runtime.

## Backend Customer Requirements

The backend needs a customer identity authority or equivalent aggregate with:

| Requirement | Purpose | Current evidence | Status |
| --- | --- | --- | --- |
| Immutable Manual Customer ID | Stable external-customer identity | No source/schema evidence | MISSING |
| Owning business | Prevent cross-business exposure and collisions | No customer relationship evidence | MISSING |
| Created-by user | Creation provenance | Authenticated users exist, but no customer creation path | PARTIAL |
| Customer type | Distinguish external/manual from registered user | No customer model | MISSING |
| Display attributes | Presentation without identity substitution | Present ad hoc in frontend records | PARTIAL |
| Contact-method records | Structured protected contact data | No source/schema evidence | MISSING |
| Contact provenance | Who supplied or verified a method | No source/schema evidence | MISSING |
| Created/updated timestamps | Persistence authority | Generic backend timestamps exist elsewhere | PARTIAL |
| Duplicate candidate state | Human-reviewable reconciliation | No source/schema evidence | MISSING |
| Merge aliases/audit | Preserve retired IDs and history | No source/schema evidence | MISSING |

A `users` row is not a Manual Customer substitute. A quote request, message
receiver, schedule row, or contact value is also insufficient.

## Backend Project Participation Requirements

The backend needs:

- canonical workflow Project identity;
- project owner/business relationship;
- project participants;
- participant identity type;
- participant role;
- membership state and timestamps;
- project source and workflow type;
- one authoritative customer-to-project relationship;
- support for multiple participants in property workflows;
- authorization rules for every project-scoped read and write.

Current backend evidence includes `quote_requests` and
`contractor_projects`. Existing audits conclude:

- quote-request identity is not project identity;
- `contractor_projects` appears to represent portfolio/gallery projects;
- no canonical workflow Project table is verified;
- no Project/Conversation or participant relationship is verified.

Status: **BLOCKED**.

## Backend Consent Requirements

Consent requires a durable record, not a Boolean on a customer row.

Minimum evidence:

- consent ID;
- customer ID;
- contact-method ID or defined scope;
- status;
- purpose/channel;
- source;
- recorded-by actor;
- recorded-at authority;
- effective and revoked times;
- optional evidence reference;
- immutable history of state changes;
- owning-business scope;
- retention and visibility policy.

The Phase 4 validator checks only a minimum supplied shape:
`status`, `recordedAt`, and `source`.

No backend consent table, route, policy, or audit trail is verified.

Status: **BLOCKED**.

## Backend Invitation and Account-Link Requirements

An invitation/link authority needs:

- invitation ID;
- project ID;
- Manual Customer/participant ID;
- intended role;
- declared delivery channel;
- signed single-use token;
- created-by identity;
- expiry and revocation;
- authenticated accepting user;
- explicit acceptance and visibility consent;
- wrong-account and duplicate-account review;
- accepted project membership;
- linked-user ID;
- immutable link/unlink/revoke events;
- idempotency.

Copied invitation text and matching email/phone values do not satisfy these
requirements.

No verified backend invitation, participant-link, or conversion model exists.

Status: **BLOCKED**.

## Backend Readiness Matrix

| Area | Status | Evidence |
| --- | --- | --- |
| Authenticated users | PARTIAL | JWT user identity exists; role/membership mapping remains limited |
| Manual Customer identity | BLOCKED | No verified aggregate, route, table, or uniqueness authority |
| Business ownership | BLOCKED | No customer-to-business authority or constraints |
| Canonical Project identity | BLOCKED | No verified workflow Project aggregate |
| Project participation | BLOCKED | No participant registry or role/membership authority |
| Contact methods | BLOCKED | No structured protected contact authority |
| Consent | BLOCKED | No record, policy, history, or enforcement evidence |
| Duplicate review | BLOCKED | No candidate/review/merge audit authority |
| Invitations | BLOCKED | No signed project-scoped invitation authority |
| Account links | BLOCKED | No accepted membership/link/revocation authority |
| Conversation participants | BLOCKED | No verified Conversation model or participant checks |
| Additive schema feasibility | PARTIAL | PostgreSQL can likely support additions; production schema is unverified |
| Overall backend readiness | BLOCKED | Core identity and authorization relationships are absent or unverified |

## Required Backend Objects

The contract can be satisfied by tables or equivalent authoritative
relationships. The required capabilities are:

1. Manual Customer identity and business ownership.
2. Structured contact methods.
3. Consent evidence and state history.
4. Canonical Projects.
5. Project participants and roles.
6. Duplicate candidates and human decisions.
7. Merge aliases and audit.
8. Invitations and accepted account links.
9. Conversations and authorized participants.
10. Project/Conversation relationship.

This audit does not choose table names, key types, API routes, or migration
technology.

## Safest Backend Sequence

No implementation should begin before a read-only production schema snapshot.

The safest planning order is:

1. Verify production schema, key types, constraints, indexes, and row counts.
2. Confirm customer onboarding and project aggregate ownership.
3. Define business-scoped Manual Customer identity.
4. Define canonical Project and participant relationships.
5. Approve contact, consent, retention, and visibility policy.
6. Define duplicate review and merge audit policy.
7. Define invitation, account-link, and revocation security.
8. Define Conversation access from project/relationship membership.
9. Plan additive nullable schema and compatibility responses.
10. Add backend contract tests before frontend adoption.

## Phase 5 Decision

Representative fixture coverage is **READY** for pure characterization.

Manual Customer backend readiness is **BLOCKED**. The existing backend evidence
does not support safe identity creation, project participation, consent,
invitation, account linking, or relationship authorization.

The next Manual Customer work should remain audit/specification-only until
production schema evidence and product policy decisions exist.

## Recommended Next Manual Customer Phase

**Manual Customers Phase 6 - Multi-Participant Relationship and Backend
Authority Specification**

It should:

- define a backend-neutral customer/project participant contract;
- cover tenant, property manager, owner, professional, and linked user roles;
- define business scoping and authorization;
- define contact/consent references without storing contact values in identity;
- define invitation/link state transitions;
- define duplicate-review and merge authority;
- map required capabilities against verified production schema evidence.

It must not implement schema, routes, storage, UI, or runtime adoption.

