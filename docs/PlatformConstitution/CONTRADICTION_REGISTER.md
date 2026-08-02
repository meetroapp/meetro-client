# Constitutional Contradiction Register

**Constitutional status:** REVISED FREEZE CANDIDATE

**Document freeze:** NOT YET AUTHORIZED

**Ratification status:** NOT AUTHORIZED

**Runtime adoption:** NOT AUTHORIZED

This register records confirmed current conflicts and material authority gaps
found during assembly. It is evidence, not constitutional text. Proposed
articles and invariants do not become runtime requirements until ratified and
separately adopted. Milestone names below are planning identifiers only and do
not authorize implementation.

## Classification

- **Confirmed conflict:** inspected behavior contradicts a proposed durable
  rule.
- **Authority gap:** the platform lacks a canonical owner or persistence
  contract required to prove the rule.
- **Fragmentation debt:** overlapping projections or local implementations can
  disagree because no canonical shared contract is enforced.
- **Evidence gap:** existing artifacts cannot prove the required fact.

## Register

### PCR-001 — Read Path Materializes Relationships and Conversations

- **Classification:** Confirmed conflict
- **Affected articles/invariants:** Articles III, V, VI, X, XII, XIX;
  Invariants 6, 7, 8; Derived Compliance Test CT-001
- **Current behavior:** The ordinary professional opportunity collection route
  invokes `materializeProfessionalOpportunities`. Its service transaction can
  create or activate request relationships and ensure conversations while
  processing a GET request.
- **Evidence:** backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef`:
  `index.js` route `GET /professional-request-opportunities` calls
  `materializeProfessionalOpportunities`; the function in
  `server/requests/professionalOpportunityService.js` begins a transaction and
  performs relationship/conversation materialization.
- **Constitutional issue:** Observation conceals authoritative relationship and
  conversation mutation. Repeated reads acquire command semantics.
- **Risk:** Retry, polling, refresh, or indexing behavior can create domain
  records, blur audit provenance, and couple opportunity visibility to
  mutation availability.
- **Accountable owner:** Request Lifecycle Domain Steward
- **Interim mitigation:** Treat the route as mutating in certification and do
  not broaden polling or reuse until a command/read boundary is approved.
- **Future milestone:** `MC-PLATFORM-ADOPTION-001 — Opportunity Command Separation`
- **Launch impact:** Review required; potentially blocking for consumers that
  assume safe repeated reads.

### PCR-002 — Browser-Local Conversation Read and Unread Authority

- **Classification:** Confirmed conflict
- **Affected articles/invariants:** Articles II, III, IX, XIII, XIV;
  Invariants 2, 11, 12, 14, 15, 24
- **Current behavior:** Conversation read flags, mock unread totals, saved
  history, and parts of the conversation registry are authored in localStorage
  and consumed by inbox and navigation projections.
- **Evidence:** frontend baseline and inspected working tree:
  `src/utils/conversationUnread.js` functions
  `isConversationUnreadForRole`, `writeUnreadConversationCount`, and
  `setConversationUnread`; `src/components/BottomNav.jsx`; and
  `src/pages/MessagesInbox.jsx`.
- **Constitutional issue:** Device-local projection state can appear to be
  canonical attention or read truth and can diverge across users, modes,
  sessions, and devices.
- **Risk:** False badges, missing attention, account contamination, and
  non-recoverable cross-device state.
- **Accountable owner:** Communication Domain Steward
- **Interim mitigation:** Treat these values as non-authoritative display hints
  and do not claim delivery or read certification from them.
- **Future milestone:** `MC-PLATFORM-ADOPTION-002 — Canonical Conversation Attention`
- **Launch impact:** Nonblocking only where the UI truthfully identifies the
  limitation; blocking for authoritative read-receipt claims.

### PCR-003 — Client-Authored Workflow Event Semantics

- **Classification:** Confirmed conflict
- **Affected articles/invariants:** Articles II, III, V, VI, X, XII, XIV;
  Invariants 2, 8, 9, 15, 18, 24
- **Current behavior:** The workflow-event write route accepts client-supplied
  workflow type, status, label, and payload for quote-scoped records rather
  than deriving one canonical event from an authoritative transition envelope.
- **Evidence:** backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef`:
  `index.js` route `POST /workflow-events` accepts `workflowType`,
  `workflowStatus`, `workflowPayload`, and `eventLabel`, then inserts those
  client-supplied values into `workflow_events`.
- **Constitutional issue:** Event chronology can be authored independently of
  the lifecycle authority it purports to describe.
- **Risk:** Fabricated or contradictory timelines, duplicate interpretations,
  weak provenance, and replay ambiguity.
- **Accountable owner:** Workflow Platform Steward
- **Interim mitigation:** Limit consumers to documented scope and do not reuse
  these records as universal lifecycle authority.
- **Future milestone:** `MC-PLATFORM-EVENT-001 — Canonical Workflow Event Authority`
- **Launch impact:** Blocking for universal event or timeline adoption;
  bounded legacy use requires explicit certification.

### PCR-004 — No Canonical Notification Authority

- **Classification:** Authority gap
- **Affected articles/invariants:** Articles III, XII, XIII, XIV, XIX;
  Invariants 7, 14, 17, 23
- **Current behavior:** Notification preferences are browser-local, notification
  utility operations are dormant or no-op, and the Notifications page reports
  unavailability. No inspected backend notification record or issuance
  contract supplies canonical activity truth.
- **Evidence:** `src/utils/meetroNotifications.js`; `src/utils/notifications.js`;
  `src/pages/Notifications.jsx`; inspected backend routes and schemas
- **Constitutional issue:** The platform cannot prove issuance, delivery,
  dismissal, read state, deduplication, or recovery for notifications.
- **Risk:** Any UI that infers notification truth from local flags would
  fabricate authority and fail across devices.
- **Accountable owner:** Notification Platform Steward, currently unassigned
- **Interim mitigation:** Preserve the truthful unavailable state and prevent
  dormant utilities from being presented as certified notification behavior.
- **Future milestone:** `MC-PLATFORM-NOTIFICATION-001 — Notification Authority Contract`
- **Launch impact:** Nonblocking while notifications remain unavailable;
  blocking before enabling notification claims.

### PCR-005 — No Canonical Device Registration and Delivery Contract

- **Classification:** Authority gap
- **Affected articles/invariants:** Articles VII, VIII, IX, XIII, XVII, XVIII;
  Invariants 5, 12, 16, 17, 21, 22
- **Current behavior:** Inspected source acknowledges future push-provider work
  but contains no approved device registration ownership, revocation,
  environment isolation, or delivery evidence contract.
- **Evidence:** notification and push-related client comments and utilities;
  inspected backend routes, services, schemas, and environment governance docs
- **Constitutional issue:** A device token cannot yet be bound, revoked,
  isolated, or audited as canonical owner-scoped data.
- **Risk:** Cross-account delivery, stale devices, production/staging leakage,
  secret exposure, and false delivery status.
- **Accountable owner:** Security and Notification Platform Stewards
- **Interim mitigation:** Do not enable push issuance or represent device
  delivery as available.
- **Future milestone:** `MC-PLATFORM-DEVICE-001 — Governed Device Registration`
- **Launch impact:** Blocking for push notification launch; otherwise deferred.

### PCR-006 — Fragmented Attention and Badge Computation

- **Classification:** Fragmentation debt
- **Affected articles/invariants:** Articles II, III, XIII, XIV, XIX;
  Invariants 7, 12, 14, 15, 24
- **Current behavior:** Work Center, Messages, dashboard metrics, navigation,
  notification utilities, and browser flags independently compute or display
  attention signals.
- **Evidence:** `src/components/BottomNav.jsx`; `src/pages/MessagesInbox.jsx`;
  Business Dashboard and Work Center source; notification utility modules
- **Constitutional issue:** The same underlying condition can be duplicated,
  omitted, or assigned inconsistent urgency across projections.
- **Risk:** Alert fatigue, missed action, contradictory badges, and difficult
  recovery after refresh or account-mode change.
- **Accountable owner:** Platform Experience Steward
- **Interim mitigation:** Keep each indicator bounded to its proven source and
  avoid aggregating browser-authored values as canonical totals.
- **Future milestone:** `MC-PLATFORM-ATTENTION-001 — Shared Attention Projection`
- **Launch impact:** Requires subsystem-specific truth review; not universally
  launch-blocking without a false or safety-critical claim.

### PCR-007 — Notification Metadata and Local Scaffolding Can Influence Routing

- **Classification:** Confirmed conflict
- **Affected articles/invariants:** Articles III, VIII, IX, XIII, XVIII;
  Invariants 5, 12, 13, 14, 24
- **Current behavior:** Dormant notification and navigation scaffolding includes
  local metadata and route/context handling without a canonical notification
  authority or universal target reauthorization contract.
- **Evidence:** frontend baseline:
  `src/utils/notificationCenter.js:getNotificationRoute` derives local route
  context from notification metadata; the inspected baseline contains no
  active canonical notification-authority import that can vouch for that
  metadata.
- **Constitutional issue:** Untrusted or stale projection metadata may select a
  destination even though it cannot authorize access to the target.
- **Risk:** Confused-deputy navigation, stale context, cross-account leakage, or
  false action state if the scaffolding is activated without hardening.
- **Accountable owner:** Navigation and Security Stewards
- **Interim mitigation:** Keep the feature unavailable; require every future
  destination to resolve canonical identity and reauthorize on load.
- **Future milestone:** `MC-PLATFORM-NOTIFICATION-002 — Governed Notification Routing`
- **Launch impact:** Blocking before notification routing activation.

### PCR-008 — Legacy Emergency Browser Lifecycle Remains Reachable in Source

- **Classification:** Confirmed conflict
- **Affected articles/invariants:** Articles II, III, V, VI, IX, XIV, XIX;
  Invariants 2, 13, 15, 19, 20, 24; Derived Compliance Test CT-001
- **Current behavior:** Legacy Emergency dispatch utilities and pages still read
  and write localStorage lifecycle, relationship, conversation, and completion
  projections alongside the newer authoritative Emergency services.
- **Evidence:** frontend baseline `src/App.jsx` directly registers
  `emergencyDispatch` and `emergencyOperationsCenter` routes;
  `src/pages/EmergencyDispatch.jsx` and `src/utils/emergencyLifecycle.js`
  contain the browser-local lifecycle implementation.
- **Constitutional issue:** A second browser-authored lifecycle can disagree
  with canonical server state and blur which route is authoritative.
- **Risk:** Stale transitions, fabricated completion, wrong conversation
  context, and unsafe direct-route behavior.
- **Accountable owner:** Emergency Domain Steward
- **Interim mitigation:** Keep authoritative certification scoped to the
  canonical Emergency routes and explicitly identify legacy paths.
- **Future milestone:** `MC-EMERGENCY-LEGACY-001 — Legacy Lifecycle Retirement`
- **Launch impact:** Potentially blocking if a production navigation path can
  enter the browser-authoritative flow.

### PCR-009 — Incomplete Historical Deployment Provenance

- **Classification:** Evidence gap
- **Affected articles/invariants:** Articles XVI, XVII, XVIII, XX;
  Invariants 16, 17, 23; Derived Compliance Tests CT-002 and CT-003
- **Current behavior:** Current health and staging workflows can report source
  provenance, but older certification and deployment records include unknown or
  stale commit identities and cannot all be reconciled to exact artifacts.
- **Evidence:** repository certification, deployment, correction-plan, and
  production-readiness documents
- **Constitutional issue:** Historical statements may be mistaken for proof of
  the currently deployed artifact.
- **Risk:** False certification inheritance, incorrect rollback selection, and
  environment drift.
- **Accountable owner:** Release Steward
- **Interim mitigation:** Require fresh commit, artifact, target, and health
  evidence for every current certification; label historical unknowns.
- **Future milestone:** `MC-PLATFORM-PROVENANCE-001 — Deployment Evidence Ledger`
- **Launch impact:** Blocking whenever exact candidate identity is required and
  cannot be proved.

### PCR-010 — Media Authority Is Not Yet Universal

- **Classification:** Fragmentation debt
- **Affected articles/invariants:** Articles II, III, IV, VII, IX, X, XVII,
  XIX; Invariants 1, 8, 11, 17, 21, 22, 24
- **Current behavior:** Governed media flows coexist with browser-local media
  projections, public or arbitrary URL handling, and feature-specific cleanup
  semantics identified in the media truth audit.
- **Evidence:** media architecture and truth-audit documents; client upload and
  profile media source; backend media services and route contracts
- **Constitutional issue:** Media ownership, authorization, retention, deletion,
  and projection guarantees differ by subsystem.
- **Risk:** Orphaned objects, unauthorized exposure, false upload success, and
  inconsistent rollback or cleanup.
- **Accountable owner:** Media Platform Steward
- **Interim mitigation:** Preserve governed flows and certify each media surface
  against its exact contract; do not infer universal compliance.
- **Future milestone:** `MC-PLATFORM-MEDIA-001 — Universal Media Authority Review`
- **Launch impact:** Depends on the surface; privacy or ownership gaps are
  launch-blocking.

### PCR-011 — Contact and Relationship Directory Uses Browser Authority

- **Classification:** Confirmed conflict
- **Affected articles/invariants:** Articles II, III, IV, VII, VIII, IX, X,
  XIX; Invariants 1, 2, 4, 5, 8, 11, 12, 24
- **Current behavior:** Manual and imported contact records and relationship
  projections are saved through client storage paths without approved
  owner-scoped backend contact CRUD, encryption, blind-index, or invitation
  authority.
- **Evidence:** `src/pages/MessagesInbox.jsx`; contact-import utilities;
  relationship architecture documents; MC-CONTACT boundary findings
- **Constitutional issue:** Private contact PII and lifecycle labels can be
  authored locally and cannot survive or reconcile authoritatively across
  sessions and devices.
- **Risk:** PII exposure, false persistence, duplicate identity, fabricated
  invitation state, and cross-account contamination.
- **Accountable owner:** Contact Domain and Security/Privacy Stewards
- **Interim mitigation:** Keep MC-CONTACT paused at the approved encryption and
  key-management boundary; do not silently upload legacy local contacts.
- **Future milestone:** `MC-CONTACT-001 — Authoritative Relationship Directory`
- **Launch impact:** Blocking for claims of authoritative external-contact
  persistence or invitation lifecycle.

### PCR-012 — Timeline and History Remain Partly Locally Authored

- **Classification:** Fragmentation debt
- **Affected articles/invariants:** Articles II, III, V, XII, XIV, XIX;
  Invariants 2, 7, 15, 18, 24; Derived Compliance Test CT-001
- **Current behavior:** Multiple pages and utilities construct timeline,
  completion, saved-history, quote-history, and work-stage records from
  localStorage or UI-specific status mappings in addition to canonical server
  projections.
- **Evidence:** Timeline and Moments architecture documents; Work Center,
  conversation, quote, completion, and navigation source
- **Constitutional issue:** Chronology can become a second lifecycle engine and
  may fabricate timestamps, status, or completion not tied to canonical events.
- **Risk:** Conflicting user history, future stages shown as reached, false
  persistence, and difficult audit or recovery.
- **Accountable owner:** Workflow Platform and Experience Stewards
- **Interim mitigation:** Treat locally assembled history as a presentation
  projection only; require canonical status and timestamp evidence for material
  claims.
- **Future milestone:** `MC-PLATFORM-TIMELINE-001 — Canonical Chronology Projection`
- **Launch impact:** Blocking where local chronology claims completion,
  payment, safety, or other material workflow truth.

### PCR-013 — Production-Unavailable Direct Request Is Presented as an Action

- **Classification:** Confirmed conflict
- **Affected articles/invariants:** Articles II, III, V, VIII, IX, XVI, XIX;
  Invariants 2, 12, 13, 19, 23, 24; Derived Compliance Test CT-002
- **Current behavior:** Profile “Hire Again” writes browser-local
  `directRequestMode`; Request Help converts it into a `direct_request`
  submission, while the authoritative request lifecycle rejects that contract
  with `DIRECT_REQUEST_UNAVAILABLE`.
- **Evidence:** frontend baseline `src/pages/Profile.jsx` writes
  `directRequestMode`; `src/pages/Upload.jsx` submits `post_type` as
  `direct_request`; backend
  `4a8b97d5054e550dffde2817b0d86c369d4c07ef`
  `server/requests/requestLifecycle.js` returns
  `DIRECT_REQUEST_UNAVAILABLE`.
- **Constitutional issue:** Production presentation offers a path whose
  authoritative contract explicitly cannot succeed, and local mode state
  attempts to select unsupported lifecycle semantics.
- **Risk:** Predictable user failure, stale mode leakage, misleading action
  availability, and pressure to fabricate or bypass backend success.
- **Accountable owner:** Request Lifecycle and Relationship Domain Stewards
- **Interim mitigation:** Preserve the backend fail-closed rejection and treat
  the entry point as an explicit launch decision; do not add local success or
  backend simulation.
- **Future milestone:** `MC-DIRECT-REQUEST-001 — Direct Request Product Contract`
- **Launch impact:** Launch-blocking while the unsupported action remains
  reachable without truthful interception or an approved supported redirect.

### PCR-014 — Emergency Cancellation Guard Uses Superseded Statuses

- **Classification:** Confirmed conflict
- **Affected articles/invariants:** Articles II, V, VI, IX, XIV, XIX;
  Invariants 2, 8, 9, 13, 15, 24
- **Current behavior:** The canonical Emergency lifecycle includes
  `professional_en_route`, `professional_arrived`, and `completed`, but the
  cancellation guard blocks only `assigned`, `in_service`, and `resolved`.
- **Evidence:** backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef`:
  `server/emergency/emergencyRequestService.js:cancelEmergencyRequest` compares
  the current status with `assigned`, `in_service`, and `resolved`; the same
  service declares and serializes the newer dispatch statuses.
- **Constitutional issue:** A command guard is not aligned with the lifecycle it
  governs and can authorize cancellation after later authoritative stages.
- **Risk:** Contradictory terminal truth, invalid post-selection cancellation,
  and loss of reliable dispatch chronology.
- **Accountable owner:** Emergency Domain Steward
- **Interim mitigation:** Treat cancellation after relationship selection as
  uncertified and do not broaden the route pending an explicitly authorized
  lifecycle-contract correction.
- **Future milestone:** `MC-EMERGENCY-CANCEL-001 — Cancellation Contract Alignment`
- **Launch impact:** Requires an explicit production decision before the
  affected cancellation path can be certified.

### PCR-015 — Production Migration State Is Unknown

- **Classification:** Evidence gap
- **Affected articles/invariants:** Articles XVI, XVII, XVIII, XX;
  Invariants 16, 17, 23; Derived Compliance Tests CT-002 and CT-003
- **Current behavior:** Source and staging evidence identify candidate
  migrations, but the production migration ledger was not read under the
  approved review boundary. Health and commit identity cannot prove schema
  application.
- **Evidence:** `MC-EMERGENCY-001F-2` production-readiness review records the
  production migration state as unknown because no production database access
  was authorized; repository migration presence and health output are not
  ledger evidence.
- **Constitutional issue:** A production schema claim lacks environment-specific
  evidence and cannot inherit truth from source or staging.
- **Risk:** Runtime/schema mismatch, false certification, and unsafe rollback
  assumptions.
- **Accountable owner:** Release and Database Stewards
- **Interim mitigation:** Preserve `UNKNOWN`; do not infer, execute, or inspect a
  production migration without separate authorization and evidence custody.
- **Future milestone:** `MC-PLATFORM-PROVENANCE-002 — Production Migration Evidence`
- **Launch impact:** Blocking wherever the unproved migration is required by the
  active artifact.

### PCR-016 — Certified Frontend and Backend Were Not the Active Production Pair

- **Classification:** Confirmed conflict
- **Affected articles/invariants:** Articles XVI, XVII, XVIII, XX;
  Invariants 16, 17, 23; Derived Compliance Tests CT-002 and CT-003
- **Current behavior:** The backend candidate became active while the frontend
  candidate certified with it in staging was not the active production
  frontend. A health check for one artifact cannot certify the cross-repository
  production pair.
- **Evidence:** `MC-EMERGENCY-001F-2` records the mismatch. The exact certified
  staging pair was frontend
  `1467b03eb07a7c2d8ede4d0f9827a8601fb39a1e` on Vercel deployment
  `dpl_ZJPoXL8E5Hbw7rwjkTS7ed37E2PS` and backend
  `4a8b97d5054e550dffde2817b0d86c369d4c07ef` on Railway deployment
  `ac7e0a34-e76c-4c10-ade8-1c7b1b28ec5b`. Exact production-pair deployment
  evidence was not present in the approved review record.
- **Constitutional issue:** Certification provenance did not match the complete
  active production artifact pair.
- **Risk:** False release inheritance, incompatible transport behavior, and an
  unreliable rollback target.
- **Accountable owner:** Release Steward
- **Interim mitigation:** Preserve the mismatch as unresolved and require one
  exact frontend/backend/target evidence set before any production pair is
  certified.
- **Future milestone:** `MC-PLATFORM-PROVENANCE-003 — Artifact-Pair Certification`
- **Launch impact:** Blocking for production certification of the affected pair.

## Evidence Pinning Standard

Each register claim is pinned to the strongest available evidence: immutable
commit plus path and function or route; immutable deployment identity; or a
named governed review record that explicitly preserves an unavailable fact as
unknown. Absence claims are bounded to the inspected commit and inventory.
Working-tree evidence is labeled as such and is not presented as deployed
truth. A future milestone identifier is planning metadata, never evidence of a
fix or authorization to act.

## Pinned Evidence Index

| Register item | Reproducible evidence boundary |
| --- | --- |
| PCR-001 | Backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef`, `index.js` route `GET /professional-request-opportunities`, `server/requests/professionalOpportunityService.js:materializeProfessionalOpportunities` |
| PCR-002 | Frontend baseline `3ad8f48f35c7b81f7851fc040e19a33c5147b091`, `src/utils/conversationUnread.js:isConversationUnreadForRole`, `writeUnreadConversationCount`, `setConversationUnread`; `src/components/BottomNav.jsx:getUnreadMessageCount`; inspected `src/pages/MessagesInbox.jsx` working tree explicitly remains uncommitted evidence |
| PCR-003 | Backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef`, `index.js` route `POST /workflow-events` and its direct `INSERT INTO workflow_events` |
| PCR-004 | Frontend baseline `3ad8f48f35c7b81f7851fc040e19a33c5147b091`, `src/utils/meetroNotifications.js:getNotifications`, `createNotification`, and `upsertNotification`; `src/utils/notifications.js`; `src/pages/Notifications.jsx` unavailable state; backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef` route/schema inventory contains no canonical notification record contract |
| PCR-005 | Frontend baseline notification utilities above and backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef` route/service/schema inventory contain no device-registration ownership, revocation, or delivery-evidence contract; this is an absence claim bounded to those commits |
| PCR-006 | Frontend baseline `src/components/BottomNav.jsx:getUnreadMessageCount`, `getWorkCenterAlertDestination`, `getActiveEmergencyAlertCount`; `src/pages/BusinessDashboard.jsx`; `src/pages/MyRequests.jsx`; and the browser-local notification utilities |
| PCR-007 | Frontend baseline `src/utils/notificationCenter.js:getNotificationRoute`; route selection reads `notification.metadata` identifiers without a canonical notification-authority source in the inspected baseline |
| PCR-008 | Frontend baseline `src/App.jsx` registrations for `emergencyDispatch` and `emergencyOperationsCenter`; `src/pages/EmergencyDispatch.jsx`; `src/utils/emergencyLifecycle.js` |
| PCR-009 | `docs/KnowledgeBase/RuntimeEvidence/DEPLOYMENT_PARITY_REPORT_V1.md`, `docs/KnowledgeBase/BACKEND_STAGING_TRUST_VERIFICATION.md`, and `docs/KnowledgeBase/RAILWAY_STAGING_TRUST_VERIFICATION.md`; each record remains limited to its named candidate and target |
| PCR-010 | `docs/Architecture/media/MEDIA_UPLOAD_TRUTH_AUDIT.md`, including its surface inventory and explicit browser-local/no-canonical-API findings |
| PCR-011 | Inspected uncommitted frontend working tree `src/pages/MessagesInbox.jsx:saveConversationRegistryItem`, `saveContactImport`, and `saveRelationshipComposer`; the approved `MC-CONTACT-001` encryption/key-management boundary records that no authoritative contact backend may yet be introduced |
| PCR-012 | `docs/KnowledgeBase/COMPLETION_HISTORY_PHASE_1_AUDIT.md` current-writer inventory; `docs/KnowledgeBase/CONVERSATION_TIMELINE_PLAN.md`; frontend baseline `src/pages/MyRequests.jsx` browser history writers |
| PCR-013 | Frontend baseline `src/pages/Profile.jsx` `directRequestMode` write and `src/pages/Upload.jsx` `direct_request` payload; backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef`, `server/requests/requestLifecycle.js` rejection `DIRECT_REQUEST_UNAVAILABLE` |
| PCR-014 | Backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef`, `server/emergency/emergencyRequestService.js:cancelEmergencyRequest` and the status declarations in that same service |
| PCR-015 | `MC-EMERGENCY-001F-2` production-readiness review: production migration-ledger state is `UNKNOWN` because production database access was not authorized |
| PCR-016 | `MC-EMERGENCY-001F-2`; certified staging pair frontend `1467b03eb07a7c2d8ede4d0f9827a8601fb39a1e` / `dpl_ZJPoXL8E5Hbw7rwjkTS7ed37E2PS` and backend `4a8b97d5054e550dffde2817b0d86c369d4c07ef` / `ac7e0a34-e76c-4c10-ade8-1c7b1b28ec5b` |

## Register Summary

| Count | Value |
| --- | ---: |
| Total contradictions and gaps | 16 |
| Confirmed conflicts | 9 |
| Authority gaps | 2 |
| Fragmentation debt | 3 |
| Evidence gaps | 2 |

The register is intentionally not a remediation backlog authorization. Each
future milestone requires separate scope, boundary, review, implementation,
certification, and release approval.
