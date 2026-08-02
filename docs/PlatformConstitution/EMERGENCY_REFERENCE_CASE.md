# Emergency as a Constitutional Reference Case

**Constitutional status:** REVISED FREEZE CANDIDATE

**Document freeze:** NOT YET AUTHORIZED

**Reference status:** EVIDENCE ONLY — NOT A UNIVERSAL IMPLEMENTATION

**Ratification status:** NOT AUTHORIZED

**Runtime adoption:** NOT AUTHORIZED

## Purpose and Limit

The Emergency subsystem is the most developed current example of several
candidate Platform Constitution principles. It tests whether the constitution
can describe a real, safety-relevant workflow without copying feature details
into universal law.

Emergency is not the Platform Constitution. Its statuses, endpoints, schemas,
screens, and service structure are not mandatory patterns for other domains.
The examples below demonstrate evidence and debt only. The independent Meetro
Constitution review remains a separate gate.

## Evidence Classification

- **Constitutional evidence** demonstrates a candidate universal principle
  through bounded, inspected behavior.
- **Reference implementation evidence** shows one domain-specific way to meet a
  principle without making that design universally mandatory.
- **Feature-specific behavior** remains Emergency product vocabulary and does
  not become constitutional law.
- **Known debt** records a conflict or missing proof and authorizes no remedy.

## Reference Map

| Emergency evidence | Classification | Candidate platform principle | Demonstrated strength | Limit or unresolved debt |
| --- | --- | --- | --- | --- |
| Authenticated owner-scoped create, get, update, and collection behavior | Constitutional evidence | Canonical truth, ownership, authentication, authorization | Owner identity is derived by server authority and bounded projections preserve base records | Legacy browser-authoritative Emergency paths remain in client source and are not canonical |
| Server-created draft and normalized owner projection | Constitutional evidence | Initial-state and projection integrity | Draft state and response shape are not invented by the display | Route-level reauthorization and malformed-data fail-closed behavior remain mandatory |
| Transactional safety assessment and `safety_blocked` outcome | Feature-specific behavior demonstrating constitutional evidence | Lifecycle integrity, transactions, privacy | Safety outcome is bound to canonical request identity and can truthfully block preparation | Emergency safety vocabulary does not become universal lifecycle law |
| Explicit preparation to `ready_for_distribution` | Feature-specific behavior | Transition governance and authoritative time | Distribution readiness follows an authorized command | The status name is Emergency-specific |
| Read-only professional opportunity collection | Reference implementation evidence | Reads remain reads; privacy by bounded projection | Opportunity observation is separated from response mutation and excludes owner-private detail | Ordinary opportunities have a separately recorded command/read conflict |
| Explicit professional response with eligibility and uniqueness checks | Reference implementation evidence | Authorization, idempotency, durable uniqueness | Participation is deliberate, authority-scoped, and duplicate-constrained | Create and reload hydration required joint certification |
| Owner-scoped response awareness collection | Constitutional evidence | Privacy, projections, relationship truth | Homeowner awareness is derived for the exact request | Declined, withdrawn, closed, mismatched, and cross-owner identities must remain excluded |
| Selection transaction establishes one active relationship and canonical conversation | Reference implementation evidence | Transactions, relationship authority, atomic event boundary | Multi-record relationship truth is committed together | Article X.5 governs atomic event observability; this domain implementation does not prescribe a platform storage pattern |
| Conversation identity bound to the active relationship | Constitutional evidence | Identity, relationship, and conversation authority | Conversation identity derives from authoritative relationship truth | Opaque route identity must be reauthorized and is never access authority |
| Dispatch commands advance canonical status and timestamps | Reference implementation evidence | Lifecycle integrity, invalid-transition safety, idempotency | Source/target conditions, locks, timestamps, and repeat handling reduce contradiction | Cancellation eligibility is misaligned with the current state machine |
| Six-stage normalized timeline | Reference implementation evidence | Timeline is a projection | Reached, current, and future presentation does not gain lifecycle authority | UI tests do not establish universal event/history authority |
| Staging commit, target, health, bundle, authentication, and scenario evidence | Constitutional evidence | Certification, provenance, environment isolation | Evidence types and target identity are separately recorded | Production migration and artifact-pair facts remain unresolved where evidence was not authorized or available |

## Pinned Evidence

| Evidence subject | Exact evidence | Classification |
| --- | --- | --- |
| Response awareness truth | Backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef`, owner/professional Emergency collection and participation hydration paths reviewed under `MC-EMERGENCY-001F-1-R2`; frontend `1467b03eb07a7c2d8ede4d0f9827a8601fb39a1e` | Constitutional evidence and reference implementation evidence |
| Participation reload hydration | `MC-EMERGENCY-001F-1-R2` records the backend collection correction and strict frontend hydration behavior across reload | Reference implementation evidence |
| Homeowner/professional isolation | Authenticated staging certification under `MC-EMERGENCY-001F-1-R2-AS` exercised the two account roles against the same staging pair without treating one browser projection as the other role's authority | Constitutional evidence |
| Certified staging provenance | Frontend commit `1467b03eb07a7c2d8ede4d0f9827a8601fb39a1e`, Vercel deployment `dpl_ZJPoXL8E5Hbw7rwjkTS7ed37E2PS`; backend commit `4a8b97d5054e550dffde2817b0d86c369d4c07ef`, Railway deployment `ac7e0a34-e76c-4c10-ade8-1c7b1b28ec5b` | Constitutional evidence |
| Cancellation mismatch | Backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef`, `server/emergency/emergencyRequestService.js:cancelEmergencyRequest`; guard values `assigned`, `in_service`, `resolved` do not cover current `professional_en_route`, `professional_arrived`, and `completed` values | Known debt, PCR-014 |
| Legacy browser lifecycle routes | Frontend baseline `src/App.jsx` registers `emergencyDispatch` and `emergencyOperationsCenter`; `src/pages/EmergencyDispatch.jsx` and `src/utils/emergencyLifecycle.js` retain browser-local lifecycle behavior | Known debt, PCR-008 |
| Production migration state | `MC-EMERGENCY-001F-2` records the production ledger state as `UNKNOWN`; no production database read was authorized, and source/health cannot substitute for ledger proof | Known debt, PCR-015 |
| Production artifact-pair mismatch | `MC-EMERGENCY-001F-2` records that the certified frontend/backend staging pair was not the complete active production pair | Known debt, PCR-016 |

The milestone records above are evidence references only. They do not authorize
staging or production access, authenticated testing, database inspection,
migration, deployment, or Emergency mutation.

## End-to-End Authority Narrative

1. The authenticated homeowner owns a canonical Emergency request.
2. Draft input remains draft until an authorized server transition validates
   and persists the next state.
3. Safety evidence may block progression without creating a professional
   relationship.
4. Preparation makes the request distributable; a read-only opportunity
   projection does not create participation.
5. A professional explicitly responds. Eligibility, uniqueness, and response
   identity are enforced at the server boundary.
6. The owner explicitly selects a response. Selection atomically establishes
   the active relationship, resolves competing active outcomes, assigns the
   request, and resolves one canonical conversation.
7. The same transaction that commits a material transition must also commit
   the canonical event or durable intent required for observation under
   Article X.5. Emergency is an example of the rule's domain effect, not a
   universal schema prescription.
8. Authorized dispatch commands advance through explicit states with canonical
   timestamps.
9. Cards, conversation detail, and timelines project those facts without
   gaining write authority.

This narrative illustrates Articles II through XIV. It does not prove that all
Emergency routes, client surfaces, legacy artifacts, notifications, media, or
operational processes comply.

## Privacy Reference

Owner collections and professional opportunity surfaces illustrate bounded
projection: a consumer receives only fields required for its purpose. Selected
professional business name and opaque conversation routing value may be
projected to the owner only when derived from the exact active Emergency
relationship. Missing related data must preserve the base request rather than
substitute hidden or competing identity.

This is evidence for minimization, not permission to expose location, unit,
access notes, safety context, contact information, raw internal IDs, message
text, unread state, or hidden responder identity in other projections.

## Known Reference Debt

1. Legacy browser-authored Emergency lifecycle and routing artifacts coexist
   with the canonical flow (PCR-008).
2. Post-assignment cancellation checks use superseded statuses and require a
   separately authorized contract correction (PCR-014).
3. Notification, device registration, and universal attention authority do not
   yet exist (PCR-004 through PCR-006).
4. Canonical event and platform-wide timeline authority remain separate future
   governance questions (PCR-003 and PCR-012).
5. Historical evidence is commit- and environment-specific (PCR-009).
6. Production migration state is unknown where ledger access was not
   authorized (PCR-015).
7. The complete certified frontend/backend pair was not proven active in
   production (PCR-016).

These debts belong in compliance and contradiction records. They do not weaken
the candidate principles and do not authorize remediation in this revision.

## Reuse Rule

Future governed-subsystem reviews MAY cite Emergency as an architectural
example. They MUST establish their own canonical owner, identity, lifecycle,
transaction, relationship, privacy, event, notification, certification, and
deployment contracts. Copying Emergency labels or code does not establish
compliance.
