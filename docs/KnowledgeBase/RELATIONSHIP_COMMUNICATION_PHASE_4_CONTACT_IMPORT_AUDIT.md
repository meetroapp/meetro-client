# Relationship Communication Phase 4 Contact Import Architecture Audit

**Phase:** Relationship Communication Phase 4  
**Scope:** Architecture and ownership only  
**Runtime adoption:** BLOCKED  
**UI adoption:** BLOCKED

## Executive Summary

Contact import must be an intake and review process, not an identity or workflow
creation process.

An imported row is untrusted source data. It may become an **imported
relationship contact candidate** after parsing, normalization, provenance
capture, duplicate signaling, and review. It is not yet a Meetro User, Manual
Customer, Relationship Contact, Lead, Project participant, Conversation
participant, or communication recipient.

The candidate boundary is essential because the current architecture does not
provide production authorities for:

- imported identity creation;
- durable relationship ownership;
- contact-method consent;
- duplicate review and merge decisions;
- invitation and account linking;
- project participation;
- Conversation membership or access.

Chat may eventually display an approved Relationship Contact projection. Chat
must not import contacts, create identity, approve relationships, grant access,
or convert source rows into inbox entries.

## Governing Ownership

| Concern | Authoritative Owner | Import Responsibility |
| --- | --- | --- |
| Source parsing | Future Import service/process | Produce isolated preview records |
| Import provenance | Future Import authority | Preserve source, batch, row, business scope, and importer |
| User identity | Authentication/User authority | Never create or infer a User from imported values |
| Manual Customer identity | Customer onboarding | Accept a reviewed candidate as input to a separate creation command |
| Relationship identity/status | Relationship authority | Approve a durable relationship after review |
| Contact methods | Customer/contact authority | Validate and own normalized phone/email/address records |
| Consent | Consent authority | Verify channel, purpose, source, time, and current status |
| Duplicate resolution | Identity/customer reconciliation | Present candidates; never auto-merge |
| Project participation | Project aggregate | Add a participant through an explicit project command |
| Conversation access | Conversation authority | Grant membership and scope separately |
| Contact projection | Relationship Communication | Read approved authorities; never create them |
| Chat | Chat/Conversation presentation | Display only authorized contacts and actions |

## 1. What Is an Imported Contact?

An imported contact is a person- or organization-like source record supplied
by an external file, device export, business system export, or controlled batch
entry.

It is evidence about a possible contact, not a Meetro identity. Names, phone
numbers, email addresses, accounting IDs, property references, CRM IDs, and
source labels remain source-local values. None may become `userId`,
`manualCustomerId`, `projectId`, `relationshipContactId`, or `conversationId`.

An imported contact may be malformed, stale, duplicated, shared by a household,
associated with the wrong business, or lacking communication consent.

## 2. What Is an Imported Relationship Contact Candidate?

An imported relationship contact candidate is a sanitized, preview-only
projection created from one source record for review. It describes what the
source claims and what Meetro can safely evaluate without granting authority.

A future candidate contract should represent:

```text
import-session reference
owning-business scope
source type and source-local record reference
candidate contact type and role hints
display/name fields
organization and property hints
contact-method candidates
relationship and project hints
consent evidence as supplied by the source
duplicate and identity-match signals
provenance and warnings
review status
```

The import-session reference is not a production customer or relationship ID.
The candidate must remain distinguishable from the canonical
`relationshipContact` and `manualCustomerContext` contracts.

## 3. Import Sources

| Import Source | Supported Fields | Risks | Readiness |
| --- | --- | --- | --- |
| CSV | Mapped names, organization, phone, email, address, role tags, external references, notes | Arbitrary headers, encoding, formula injection, stale data, weak typing, missing consent | PARTIAL |
| Excel | CSV fields plus sheets, tables, dates, and source columns selected during mapping | Multiple sheets, formulas/macros, hidden data, date coercion, merged cells, sensitive columns | PARTIAL |
| Google Contacts export | Name components, labels, phones, emails, addresses, organization, notes | Labels are not Meetro roles; shared contacts; stale or duplicated values; consent absent | PARTIAL |
| iPhone contacts export | vCard names, phones, emails, organization, addresses, notes | Device privacy, duplicate cards, shared household values, unsupported custom fields, consent absent | PARTIAL |
| Android contacts export | vCard/CSV names, phones, emails, labels, organization, addresses | Vendor-specific formats, account duplicates, label drift, consent absent | PARTIAL |
| QuickBooks customers export | Customer/company label, billing contact, phone, email, address, customer reference | Accounting customer is not identity; companies and people may be conflated; billing use is not communication consent | PARTIAL |
| Property management software export | Tenant, owner, manager, vendor, property/unit, lease or external references, contact values | Sensitive tenancy data, role overlap, household duplicates, property-scoped visibility, stale occupancy, no Meetro access authority | PARTIAL |
| CRM export | Names, organizations, channels, external IDs, lifecycle tags, owner, notes, consent-like fields | Custom semantics, obsolete stages, cross-tenant leakage, unreliable consent, CRM lead status mistaken for Meetro authority | PARTIAL |
| Manual batch entry | Explicitly mapped names, type/role hints, contact values, source note, business scope | Human entry errors, duplicate creation, invented consent, identity promotion during entry | PARTIAL |

No source is runtime-ready. Readiness means the source can be represented as a
review candidate after source-specific mapping and sanitization, not that the
repository currently contains an importer.

## 4. Required Candidate Fields

The following information is required before a source row may enter review:

| Field/Concept | Requirement |
| --- | --- |
| Import session reference | Ephemeral or import-authority reference; never a customer identity |
| Owning business reference | Required tenant/business boundary |
| Source type | One approved import-source classification |
| Source record reference | Row/card/source-local reference for audit and error reporting |
| Imported-by reference | Authenticated professional responsible for the intake |
| Source-captured time | When Meetro received the source record |
| Candidate type | Person, organization, or unresolved; role remains a hint |
| Display evidence | Name, organization, or an explicit unresolved label |
| Provenance | Source, mapping version, source-local references, and trust warnings |
| Review status | Preview, needs review, rejected, or approved for an authority handoff |
| Warnings | Missing identity evidence, consent uncertainty, duplicates, or sensitive fields |

Approval for handoff additionally requires a valid destination authority and
review decision. It does not make the candidate a canonical record by itself.

## 5. Optional Candidate Fields

Optional source evidence may include:

- first, middle, last, preferred, and organization names;
- phone, SMS-capable phone, email, postal address, and language;
- job title, department, property, unit, or business role hints;
- source tags and source-local customer/contact/account IDs;
- relationship-reason hints;
- project or property references;
- notes that pass privacy and visibility review;
- source-provided consent status and evidence;
- invitation preference;
- candidate matches to existing identities;
- duplicate signals and reviewer notes.

Optional values remain evidence. Missing optional values must not be invented,
and present values must not be promoted to identity.

## 6. Tenant Imports

Tenant imports require the strongest role and visibility separation:

- each tenant remains a separate candidate, including members of one household;
- property and unit values are context, not identity;
- occupancy or lease data does not grant Project or Conversation access;
- tenant communication consent is independent of manager, owner, or household
  consent;
- tenant role must be confirmed by property/project authority;
- tenant-visible and manager-visible information must remain audience-scoped;
- move-out or stale occupancy data must be reviewable before relationship
  activation.

Tenant candidate intake is **PARTIAL**. Runtime use is **BLOCKED** until
property relationships, participant roles, consent, and scoped access exist.

## 7. Customer Imports

A customer import produces customer candidates, not Leads.

- QuickBooks or CRM customer status is source context only.
- A reviewed candidate may later be handed to Manual Customer onboarding.
- Customer onboarding creates `manualCustomerId`; import must not.
- One customer may have multiple projects, but import must not create or merge
  those projects.
- Repeat-customer status requires canonical identity and relationship history.
- Imported billing contact data does not prove communication consent.

Customer candidate intake is **PARTIAL**. Manual Customer and relationship
runtime authorities remain **BLOCKED**.

## 8. Vendor, Team, and Property-Manager Imports

### Vendors

Vendor imports may retain organization, representative, trade, and source
references. They cannot grant vendor visibility, project participation, Chat,
or business access. Vendor identity and relationship authority must approve
those separately.

### Team Members

An imported team-member row is only an invitation or identity-match candidate.
Business membership requires an authenticated User and an explicit business
membership command. Import cannot assign roles, internal notes, projects, or
Conversation access.

### Property Managers

Manager imports must preserve the managed-property scope and keep managers
distinct from tenants, owners, and vendors. A source role label does not prove
management authority. Manager access requires explicit property/project
membership and role-scoped visibility.

All three categories are **PARTIAL** for candidate representation and
**BLOCKED** for runtime authority.

## 9. Duplicate Detection

Duplicate detection must produce candidates for review, never automatic
matches or merges.

| Signal | Strength | Permitted Result |
| --- | --- | --- |
| Same source-local record ID within the same business/source | Strong source duplicate | Flag repeated import; do not merge canonical identity |
| Existing accepted account-link reference | Strong only when verified by the owning authority | Present authoritative link; block conflicting candidates |
| Same normalized phone or email | Medium | Duplicate candidate warning only |
| Same name and organization | Low/medium | Review signal only |
| Same name | Low | Warning only; never merge |
| Same property/unit or household contact | Low | Household/context warning only |
| Different linked users or businesses | Conflict | Block automated approval or merge |

Rules:

1. Duplicate matching is business-scoped.
2. Contact values are not identity.
3. Separate source records remain visible until a reviewer decides.
4. A reviewer may reject or route records, but merge authority belongs to
   identity/customer reconciliation.
5. Consent, history, projects, documents, and account links never move as a
   side effect of candidate review.
6. Cross-business matching must not expose another business's customer data.

## 10. Review Before Saving

Import requires a preview and review gate:

1. Select an approved source and owning business.
2. Parse in an isolated preview process.
3. Map source fields explicitly.
4. Sanitize files, formulas, notes, and unsupported values.
5. Normalize contact values for comparison without creating identity.
6. Classify person/organization and role hints.
7. Display provenance and unmapped fields.
8. Report validation, duplicate, privacy, and consent warnings.
9. Let a reviewer reject, defer, or approve a candidate for a named authority.
10. Record the review decision and source lineage through a future import
    authority.
11. Hand the approved candidate to Customer onboarding, Relationship,
    Invitation, or another appropriate authority through a separate command.

“Approve” must not mean “create everything.” There is no safe direct save from
an import candidate into Chat, Leads, Projects, Conversations, or access.

Rejected or failed imports must be independently removable without deleting
canonical customers, users, relationships, projects, or history.

## 11. Consent Limitations

Imported contact data does not establish Meetro consent.

- Consent defaults to unknown or unverified.
- A source opt-in field is evidence, not Meetro authority.
- Actionable consent requires channel, purpose, status, source, recorded time,
  and applicable ownership/policy evidence.
- Billing, tenancy, employment, business-card, or address-book presence does
  not authorize marketing, SMS, email, phone, or Chat.
- Consent is person- and channel-specific; it is not inherited across
  households, tenants, managers, companies, or shared contact values.
- Denied, revoked, missing, stale, or conflicting consent blocks the affected
  external capability while preserving the candidate.
- The import process cannot grant `authenticatedChat`.
- Legal sufficiency, retention, deletion, and regional policy require human
  and legal review before runtime implementation.

The safe capability default for every imported candidate is `none`.

## 12. What Imported Contacts Can and Cannot Do

### May Do During Architecture/Future Review

- remain visible in an isolated preview;
- preserve source provenance and source-local references;
- show normalized contact-method candidates;
- show duplicate and identity-match signals;
- show consent and privacy warnings;
- be rejected, deferred, or approved for a separate authority handoff;
- become an invitation target only after an approved authority creates the
  appropriate identity/relationship context.

### Must Not Do After Import Alone

- become a Meetro User or Manual Customer;
- become a Relationship Contact projection;
- become a Lead;
- create or join a Project;
- create a Conversation or inbox row;
- send or receive authenticated Chat;
- receive external communication without authoritative consent;
- grant project, property, business, or Conversation access;
- reopen completed work;
- merge with an existing identity;
- acquire history, documents, or workflow events.

Legacy inbox rows must not be auto-imported. They lack sufficient identity,
relationship, and access authority.

## 13. Future Invitation and Account Linking

The future conversion path must remain explicit:

1. Import candidate passes review.
2. An owning authority creates or selects a canonical Manual Customer,
   external organization, or existing User relationship.
3. Contact and consent authorities approve usable channels.
4. A separate invitation is created with business and intended-role scope.
5. The recipient authenticates or creates a User account.
6. The recipient explicitly accepts the invitation and account link.
7. Customer/account reconciliation records the reviewed link without replacing
   the original identity or history.
8. Project participation is granted separately when appropriate.
9. Conversation membership and audience scope are granted separately.
10. Relationship Contact and Chat projections consume the approved result.

Phone/email equality must never perform this conversion. Import provenance must
remain attached to the history of the candidate and any reviewed handoff.

## Security, Privacy, and Operational Requirements

Before implementation, the import architecture requires:

- file type, size, encoding, and malware controls;
- spreadsheet formula and macro neutralization;
- tenant/business isolation;
- authorization for import and review;
- sensitive-field minimization and redaction;
- encrypted transport and storage;
- preview retention and deletion policy;
- audit records for mapping, review, rejection, handoff, and linking;
- source-specific data retention and right-to-delete handling;
- rate, volume, timeout, and partial-failure handling;
- rollback limited to import artifacts, never canonical records;
- duplicate-review and account-link conflict controls;
- no contact content in diagnostic logs.

These requirements are unimplemented and require backend and security review.

## Readiness Matrix

| Area | Status | Notes |
| --- | --- | --- |
| Import Concept | READY | The candidate boundary, ownership, prohibited effects, and handoff model are defined |
| CSV/Excel | PARTIAL | Field mapping is feasible; parsing, sanitization, security, provenance, and review infrastructure are absent |
| Phone Contacts | PARTIAL | vCard/contact fields can become candidates; device access, privacy, duplication, and consent policy are unresolved |
| Tenant Imports | PARTIAL | Candidate and role-hint rules are defined; property membership and audience authority are absent |
| Customer Imports | PARTIAL | Candidate-to-onboarding handoff is defined; Manual Customer runtime authority is absent |
| Duplicate Review | PARTIAL | Signal strengths and no-auto-merge policy are defined; durable review and merge authority are absent |
| Consent Handling | BLOCKED | Imported consent is untrusted and no production consent authority or policy is verified |
| Account Linking | BLOCKED | Invitation, authenticated acceptance, conflict handling, revocation, and audit authority are absent |
| Runtime Adoption | BLOCKED | No importer, backend candidate authority, persistence, authorization, privacy review, or approved consumer exists |

## Phase 5 Recommendation

Phase 5 should be **Pure Contact Import Candidate Contract and Validation
Harness**.

It may define, without file access or persistence:

- import source, candidate status, review status, and warning registries;
- a pure import-candidate constructor;
- validation for business scope, source provenance, field mapping, source-local
  references, and candidate type;
- duplicate-signal classification without matching or merge;
- consent defaults and capability blocking;
- role-specific validation for tenants, customers, vendors, team members, and
  property managers;
- sanitized fixtures representing every audited source;
- deterministic tests for no identity promotion and no mutation.

Phase 5 must not parse real files, access device contacts, connect to Google,
QuickBooks, property software, or CRMs, persist candidates, create commands,
or adopt candidates into runtime.

**Import validation contract readiness:** READY for a pure characterization
contract only. Runtime import remains BLOCKED.

## Contacts UI Decision

Contacts UI and Import UI must remain **BLOCKED**.

A production design would prematurely choose identity, duplicate, consent,
review, account-link, and access behavior that does not yet have an
authoritative owner. At most, synthetic design research may depict a
non-actionable candidate review concept; it must not be connected to current
inbox, Leads, Projects, or Chat data.

## Core Domain Model Timing

`MEETRO_CORE_DOMAIN_MODEL.md` can and should follow this audit.

It should be created before backend schema, import parsers, import storage,
Contacts UI, or Phase 5 runtime proposals. It must define the distinct
lifecycles and cardinalities of:

- Import Candidate;
- Duplicate Candidate;
- User;
- Manual Customer;
- Business and business membership;
- Relationship;
- Contact Method;
- Consent Record;
- Invitation and Account Link;
- Project and Project Participant;
- Conversation and Conversation Participant;
- Relationship Contact projection;
- Relationship History projection.

The safest order is:

1. approve the core domain model;
2. create the Phase 5 pure candidate contract and validation harness against
   that model;
3. perform backend/security/privacy readiness audits;
4. consider source parsers and review UI only after authorities are approved.

## Final Decision

Imported contacts belong to an Import intake and review boundary feeding
Identity, Customer, Relationship, Consent, Invitation, Project, and
Conversation authorities. They do not belong to Chat, Leads, or Work Center.

The architecture is **READY** to specify a pure candidate validator. Source
integration is **PARTIAL**. Consent, account linking, Contacts UI, and runtime
adoption remain **BLOCKED**.
