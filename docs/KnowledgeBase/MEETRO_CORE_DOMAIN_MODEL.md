# Meetro Core Domain Model

**Status:** Authoritative Knowledge Base foundation  
**Scope:** Product vision, domain ownership, identity boundaries, lifecycle, and
architecture rules  
**Runtime effect:** None

## 1. Meetro Vision

Meetro is an **AI-Powered Professional Operating Ecosystem** designed to help
professionals build, manage, and strengthen relationships through
communication, work execution, accountability, and shared history.

Meetro is not defined as:

- a contractor app;
- a CRM;
- a marketplace;
- a project management platform.

Meetro is relationship-centered and industry-independent. It may support
contractors, property management, transportation, cleaning, home health care,
automotive services, real estate, mobile services, professional services, and
future service industries without changing its core operating model.

## 2. Mission

Meetro helps professionals build, manage, and strengthen relationships through
communication, work execution, accountability, and shared history.

The goal is not merely to complete tasks. The goal is to help businesses
fulfill commitments, preserve trust, and create durable relationship memory.

## 3. Core Principles

### Relationship Principle

```text
Relationships create communication.
Communication creates understanding.
Understanding creates decisions.
Decisions create work.
Work creates history.
History strengthens relationships.
```

Projects, Conversations, Leads, Requests, and Work may begin and end.
Relationships may persist across all of them.

### Trust Principle

```text
Commitments create accountability.
Accountability creates trust.
Trust strengthens relationships.
Strong relationships create resilient businesses.
```

Meetro should make ownership and unresolved obligations visible. It must not
allow a completed task to hide an unfulfilled commitment.

### Outcome Principle

Customers do not merely buy tasks. They buy outcomes.

For example, installing solar panels may complete the physical task, while the
promised outcome may still require permits, inspection, corrections,
documentation, warranty registration, and final payment resolution.

Operations must therefore distinguish:

- task activity;
- work completion;
- obligation fulfillment;
- project closure;
- durable history.

### Ownership Principle

Every actionable commitment should eventually identify:

| Field | Meaning |
| --- | --- |
| Owner | The party responsible for the next step |
| Status | The current condition of the commitment |
| Evidence | The record supporting progress or fulfillment |
| Due date | When action or fulfillment is expected |
| Outcome | The result that defines success |

The central operational question is:

> Who owns the next step?

## 4. Relationship and Trust Flywheels

### Relationship Flywheel

```text
Relationship
  -> Communication
  -> Understanding
  -> Decision
  -> Work
  -> History
  -> Stronger Relationship
  -> Communication
```

### Trust Flywheel

```text
Commitment
  -> Ownership
  -> Accountability
  -> Outcome
  -> History
  -> Trust
  -> Stronger Relationship
  -> Future Opportunities
```

The flywheels are domain-spanning models, not single workflow records. No page,
Dashboard, Chat view, Work Center tab, or Project Folder owns them.

## 5. Universal Workflow

The universal Meetro workflow is:

```text
Request
  -> Information
  -> Decision
  -> Work
  -> Completion
  -> History
```

The evolved operational workflow is:

```text
Lead / Request
  -> Communication
  -> Understanding
  -> Appointment / Consultation, if needed
  -> Quote / Proposal, if needed
  -> Decision
  -> Commitment
  -> Work
  -> Completion
  -> Closure
  -> History
```

Appointment and Quote are conditional workflow stages. Information and
Understanding are not optional merely because those stages are skipped.

## 6. Completion and Closure

Completion and Closure are different states.

### Completion

Completion means the work has been performed or submitted as complete.

Examples:

- solar panels installed;
- roof installed;
- fence built;
- HVAC installed;
- requested service performed.

Completion may still require confirmation, evidence review, or an approved
exception before it becomes authoritative historical completion.

### Closure

Closure means all obligations associated with the commitment have been
fulfilled.

Examples:

- permit closed;
- final inspection passed;
- corrections completed;
- documentation delivered;
- warranty registered;
- final payment resolved;
- required customer or authority confirmation recorded.

### State Rule

A project may be:

| State | Meaning |
| --- | --- |
| In work | Service execution is active |
| Completion submitted | Work is represented as performed, but confirmation or obligations may remain |
| Completed | The approved completion condition has been met |
| Closure pending | Completed work still has open obligations |
| Closed | Required obligations have been fulfilled |
| Historical | Durable projection of what occurred, including unresolved or late-resolved obligations |

History must preserve both the completion event and the closure outcome.
History must not erase delayed permits, inspections, corrections, disputes,
payments, or warranties merely because physical work was completed.

## 7. The Six Core Domains

```text
Identity
  -> Relationships
  -> Communication
  -> Operations
  -> History
  -> Business Intelligence
```

These domains cooperate but do not replace one another.

| Domain | Primary Question | Owns |
| --- | --- | --- |
| Identity | Who is involved? | Users, Businesses, Manual Identities, Tenants, Property Managers, Team Members, Vendors |
| Relationships | Why are they connected? | Relationships, Membership, Invitations, Account Links, Relationship status and lifecycle |
| Communication | How do they communicate? | Conversations, Participants, Messages, access, audience, and communication channels |
| Operations | What work is being performed? | Leads, Requests, Information, Appointments, Consultations, Scheduling, Quotes, Decisions, Commitments, Work, Materials, Completion, Closure |
| History | What happened over time? | Workflow timeline, relationship memory, project memory, Project Folder records, historical projections |
| Business Intelligence | What can be learned from history? | Revenue, analytics, AI briefings, performance metrics, operational insights, relationship intelligence |

## 8. Identity Domain

### Responsibility

Identity owns stable representations of parties involved in Meetro.

### Core Entities

| Entity | Purpose | Key Boundary |
| --- | --- | --- |
| User | Authenticated person with a Meetro account | Authentication identity is not a role, relationship, Project, or Conversation |
| Business | Professional operating identity | Business membership and user identity remain distinct |
| Manual Identity / Manual Customer | Known non-user relationship participant | Must not be represented as a fake User |
| External Organization | Known organization without assumed Meetro account | Organization identity does not grant access |
| Tenant | Identity plus a tenant role supplied by relationship/property authority | Contact values do not establish tenancy |
| Property Manager | Identity plus managed-property scope | A role label does not grant visibility |
| Team Member | User plus approved Business membership | Import or contact presence does not grant membership |
| Vendor | Person or organization plus an approved vendor relationship | Vendor identity does not grant Project or Conversation access |

### Identity Rules

1. Identity is not inferred from name, title, phone, email, address, Project,
   Conversation, Schedule, Quote, or message values.
2. Contact methods are attributes/evidence, not identity.
3. One person may have multiple roles and relationships.
4. One identity may participate in many Projects and Conversations.
5. A Manual Customer is not a registered User.
6. Linking a Manual Customer to a User requires invitation, authenticated
   acceptance, reconciliation, and audit.
7. Identity merge is an explicit authority decision, never a display or import
   side effect.

## 9. Relationship Domain

### Responsibility

Relationships own the durable reason parties are connected.

### Core Entities

| Entity | Purpose |
| --- | --- |
| Relationship | Durable connection between identities or businesses |
| Relationship Membership | A party's role and status within a relationship |
| Relationship Contact projection | Read model showing an identity in an approved relationship context |
| Invitation | Request to establish or extend an authenticated relationship |
| Account Link | Accepted, auditable link between a non-user identity and User |
| Import Candidate | Untrusted source record awaiting review and authority handoff |
| Duplicate Candidate | Evidence that records may represent the same party; never an automatic merge |

### Relationship Rules

1. A Relationship may exist without a Lead.
2. A Relationship may exist without an active Project.
3. A Relationship may persist after Project completion or closure.
4. A Lead is a temporary operational state, not permanent relationship
   authority.
5. Project participation is a relationship reason, not the identity itself.
6. Repeat-customer status is a relationship projection across Projects.
7. Relationship status does not automatically grant Conversation access.
8. Relationship history persists according to approved retention and
   revocation policy.

### Contacts Principle

Contacts are not an address book. Contacts are relationship projections.

```text
Identity creates people.
Relationships connect people.
Communication enables interaction.
Projects occur inside relationships.
Chat displays contacts.
Chat does not own contacts.
```

### Contact Import Principle

Imported contacts create Relationship Contact Candidates.

Imported contacts do not create:

- Users;
- Manual Customers without Customer onboarding;
- Relationships;
- Leads;
- Projects;
- Conversations;
- authenticated Chat access;
- communication consent.

Imported candidates preserve source, provenance, supplied consent evidence,
duplicate signals, and relationship potential. They may later be routed to an
authoritative onboarding, invitation, or linking process.

## 10. Communication Domain

### Responsibility

Communication owns authorized interaction between relationship participants.

### Core Entities

| Entity | Purpose |
| --- | --- |
| Conversation | Communication context with explicit identity and scope |
| Conversation Participant | Identity, role, membership status, and audience scope |
| Message | Persisted communication with backend-owned sender and timestamp |
| Conversation Access | Allowed actions, visibility, status, and revocation |
| Communication Channel | Authenticated Chat or consented external channel |

### Communication Rules

1. A Conversation is not a Relationship.
2. A Conversation may be Project-scoped or Relationship-scoped.
3. Conversation access requires explicit participant authority.
4. A Project, Quote Request, message thread, or inbox row must not silently
   become Conversation identity.
5. Chat cannot create or merge identities.
6. Chat cannot create Relationships.
7. Chat cannot grant Conversation membership or capabilities.
8. Manual Customers cannot use authenticated Chat until account link and
   Conversation membership are approved.
9. External phone, SMS, and email require channel- and purpose-specific consent.
10. Closing a Conversation does not erase the Relationship or History.
11. Post-completion communication does not reopen Work automatically.

## 11. Operations Domain

### Responsibility

Operations owns temporary workflows that turn requests and understanding into
commitments, work, completion, and closure.

### Operational Aggregates and Modules

| Capability | Owner | Notes |
| --- | --- | --- |
| Lead / Request | Lead or Request workflow | Intake and opportunity state; not identity authority |
| Information gathering | Workflow-specific information owner | Required before informed decision |
| Appointment / Consultation | Scheduling | Conditional stage when evidence or consultation is needed |
| Quote / Proposal | Quotes | Proposal terms and lifecycle |
| Decision | Workflow decision authority | Accept, decline, revise, approve, or other explicit result |
| Commitment | Project/workflow aggregate | Promise, owner, due date, evidence requirement, and expected outcome |
| Work | Work execution | Active work state and execution evidence |
| Materials | Materials workflow | Requests, decisions, and fulfillment where applicable |
| Completion | Completion workflow / Project aggregate | Performed-work submission and approved completion transition |
| Closure | Closure obligation authority / Project aggregate | Resolves all required obligations |
| Work Center | Operational projection and command shell | Consumes owners; must not become every domain owner |

### Project

A Project is a temporary operational aggregate representing one body of work
inside a Relationship.

A Project should eventually coordinate:

- canonical Project identity;
- participant references and roles;
- workflow type;
- request and information context;
- appointments and consultations;
- quotes and decisions;
- commitments and obligations;
- work state;
- completion state;
- closure state;
- links to Communication and History;
- provenance and immutable events.

One Relationship may contain many Projects. A new Project does not require a
new customer identity or new Relationship.

### Commitment

A Commitment is an owned obligation within a Relationship or Project.

It should not be reduced to a status label. It requires:

- commitment identity;
- Project and Relationship context;
- responsible owner;
- promised outcome;
- status;
- due date when applicable;
- evidence requirements;
- completion condition;
- closure condition;
- history.

## 12. History Domain

### Responsibility

History owns durable, provenance-aware memory of what happened.

### Core Projections

| Projection | Purpose |
| --- | --- |
| Workflow Timeline | Immutable workflow events in canonical order |
| Relationship Memory | Cross-Project history between parties |
| Project Memory | Events, decisions, commitments, work, completion, and closure for one Project |
| Project Folder | Documents, evidence, operating records, and linked artifacts for one Project |
| Historical Records | Read projections for completed, closed, cancelled, or otherwise ended work |

### History Rules

1. History is not a local archive flag.
2. History is not owned by Work Center, Dashboard, Command Center, Chat, or
   Project Folder alone.
3. History derives from authoritative identity, relationship, communication,
   and workflow events.
4. Project Folder preserves artifacts but does not independently decide whether
   work is completed or closed.
5. Conversation contributes communication events but is not the complete
   Relationship history.
6. Unknown and incomplete legacy records remain visible with provenance
   warnings; they are not silently discarded or guessed.
7. Completion and Closure remain separate historical facts.
8. Corrections, reopened obligations, and late closure must append history
   rather than rewrite the past.

## 13. Business Intelligence Domain

### Responsibility

Business Intelligence derives learning from authoritative History.

### Capabilities

- revenue and financial projections;
- operational analytics;
- performance metrics;
- AI briefings;
- unresolved obligation detection;
- ownership and accountability insights;
- relationship health and risk;
- follow-up opportunities;
- repeat-customer opportunities;
- Project, service, and outcome trends.

### Intelligence Rules

1. Business Intelligence consumes domain facts; it does not own workflow
   transitions.
2. Dashboard is a projection, not an authority.
3. Command Center is an orchestrator, not Work Center or a domain owner.
4. Revenue and counts must derive from authoritative records and idempotent
   events, not page-local increments.
5. AI-generated conclusions must identify source evidence, uncertainty, and
   unresolved provenance.
6. AI must not silently create identity, consent, access, commitments, closure,
   or historical facts.

## 14. Core Entity Relationships

```text
User / Manual Identity / Business / External Organization
  -> participates in Relationship
  -> Relationship may contain many Projects
  -> Relationship may authorize many Conversations
  -> Project may authorize scoped Conversations
  -> Conversation contains Participants and Messages
  -> Project contains workflow state, Commitments, Completion, and Closure
  -> authoritative events create Project and Relationship History
  -> Business Intelligence derives insights from History
```

### Cardinality Rules

| Relationship | Rule |
| --- | --- |
| Identity to Relationship | One identity may participate in many Relationships |
| Relationship to Identity | One Relationship may include multiple identities or businesses |
| Relationship to Project | One Relationship may contain zero or many Projects |
| Project to Relationship | Each Project requires explicit Relationship context |
| Project to Participant | One Project may contain multiple role-scoped participants |
| Relationship to Conversation | One Relationship may authorize zero or many Conversations |
| Project to Conversation | One Project may link zero or many scoped Conversations |
| Conversation to Participant | One Conversation has explicit participants and audience |
| Project to Commitment | One Project may contain many owned commitments |
| Project to Completion | Completion transitions belong to one canonical Project |
| Project to Closure | Closure tracks the Project's required obligations |
| Identity to Account Link | A Manual Identity may have zero or one accepted active User link under policy |
| Relationship to History | History may span many Projects and Conversations |

## 15. Industry Models

### Property Management

```text
Property Manager <-> Tenant
  -> Communication
  -> Maintenance Request
  -> Work
  -> Completion
  -> Closure
  -> History
  -> Stronger Relationship
```

The manager/tenant Relationship exists before and after the maintenance
request. Property, unit, role, and audience scope must remain explicit.

### Contractor and Professional Services

```text
Customer <-> Professional
  -> Communication
  -> Consultation
  -> Quote
  -> Decision
  -> Commitment
  -> Work
  -> Completion
  -> Closure
  -> History
  -> Stronger Relationship
```

The Project may end. The Relationship remains.

### Repeat Customer

```text
One Customer Identity
  -> One Relationship
  -> Many Projects
```

Kitchen remodeling, fence repair, pressure washing, and maintenance are
separate Projects. They must not create duplicate customer identities merely
because they have separate Requests or Conversations.

## 16. Module Ownership Boundaries

| Module/Surface | Allowed Responsibility | Prohibited Authority |
| --- | --- | --- |
| Dashboard | Summaries, alerts, metrics, navigation | Workflow writes, identity, Completion, Closure, History ownership |
| Command Center | Cross-module orchestration and navigation | Domain persistence or Work Center replacement |
| Work Center | Operational projection and commands routed to owners | Owning Leads, Quotes, Scheduling, Completion, History, or Communication |
| Chat / Inbox | Communication presentation and authorized actions | Contact identity, Relationship creation, access grants, complete History |
| Project Folder | Project documents, evidence, and linked records | Independent Project, Completion, Closure, or History status |
| Profile | Identity presentation and approved self-management | Project or Relationship authority |
| Leads | Lead/Request workflow | Permanent Contact or customer identity |
| Scheduling | Appointment and schedule lifecycle | Project or customer identity |
| Quotes | Proposal lifecycle | Project identity, Communication access, or final Completion |
| Completion | Completion transition and evidence | Reporting counters or implicit Closure |
| History | Durable projections | Operational command authority |

## 17. Prohibited Substitutions

The following substitutions are architecturally invalid:

- phone or email as person identity;
- name or title matching as canonical identity;
- Request ID as Project ID without explicit authority;
- Conversation ID as Project ID;
- Quote Request ID as Conversation ID;
- Schedule ID as Project ID;
- inbox row as Contact;
- Lead as permanent Relationship;
- Project as Customer;
- Message as complete Relationship history;
- Chat access as proof of Relationship;
- Project membership as consent;
- imported contact as User or Manual Customer;
- completion submission as confirmed Completion;
- Completion as Closure;
- archive status as History authority;
- Project Folder as Project aggregate;
- Work Center as domain owner;
- Dashboard count as authoritative business fact;
- AI inference as canonical identity, consent, access, commitment, or outcome.

## 18. Relationship Intelligence

Future Meetro intelligence should help identify:

- at-risk Relationships;
- open Commitments;
- unresolved obligations;
- permit risks;
- inspection risks;
- warranty risks;
- tenant risks;
- communication gaps;
- unclear next-step ownership;
- follow-up opportunities;
- repeat-customer opportunities;
- completed-but-not-closed Projects.

Relationship Intelligence must strengthen human accountability. It should
explain what evidence supports an insight and what remains unknown.

## 19. Architecture Guardrails

1. Knowledge Base ownership rules override accidental implementation
   authority.
2. Workflow comes before features.
3. Information and Understanding come before Quote or Decision.
4. Homeowner/customer and professional responsibilities remain separate.
5. Domain events use canonical identity and provenance.
6. Read projections do not become write authorities.
7. Legacy data remains visible with warnings rather than being guessed or
   destructively migrated.
8. New domains must not be invented when an existing core domain owns the
   responsibility.
9. Storage keys and UI screens are implementation details, not domain
   boundaries.
10. Every migration must preserve user-visible behavior until authority,
    identity, parity, and rollback are proven.

## 20. Foundation Decisions

The following decisions are now authoritative:

| Decision | Status |
| --- | --- |
| Meetro is relationship-centered and industry-independent | APPROVED |
| Relationships persist beyond Leads, Projects, and Conversations | APPROVED |
| Identity, Relationship, Communication, Operations, History, and Business Intelligence are separate core domains | APPROVED |
| Contacts are Relationship projections | APPROVED |
| Chat does not own Contacts | APPROVED |
| Manual Customers are known participants, not Users | APPROVED |
| Imported contacts are candidates, not identities or workflow records | APPROVED |
| One customer may have many Projects | APPROVED |
| Completion and Closure are separate | APPROVED |
| Commitments require ownership, evidence, due date, status, and outcome | APPROVED |
| History is a durable cross-domain projection | APPROVED |
| Dashboard and Command Center are not domain authorities | APPROVED |
| AI derives insight but does not invent authority | APPROVED |

## 21. Deferred Product and Implementation Decisions

This specification does not choose:

- backend schemas or database tables;
- API routes;
- runtime identifiers;
- storage migrations;
- UI navigation or screen design;
- industry-specific closure obligations;
- legal consent policy;
- record-retention periods;
- duplicate merge authority implementation;
- invitation security implementation;
- exact relationship health scoring;
- automatic commitment creation;
- automatic Closure;
- runtime adoption order.

Those decisions require domain-specific contracts, parity validation, security
review, and human product approval.

## Final Statement

Meetro exists to preserve the connection between Relationships, Communication,
Understanding, Decisions, Work, Accountability, and History.

Projects organize work. Conversations organize communication. Leads organize
opportunities. None of them replaces the Relationship.

The enduring value of Meetro is the trusted history of commitments, outcomes,
and relationships over time.
