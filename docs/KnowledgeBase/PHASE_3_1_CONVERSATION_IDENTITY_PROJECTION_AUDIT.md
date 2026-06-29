# Phase 3.1 Conversation Identity Projection Audit

## 1. Executive Summary

Overall finding: **PARTIAL alignment with Foundation risk.**

Conversation identity is moving toward the correct constitutional shape. `conversationIdentity.js` exists as a shared projection helper, `MessagesInbox.jsx` uses it directly for preview identity, and `MeetroAssistant.jsx` uses it for conversation labels. `ConversationThread.jsx` also calls the helper, but still assembles many customer, business, emergency, hiring, request, and localStorage inputs locally before projection.

Highest identity ownership risk: **ConversationThread local identity assembly and selected-context writes.**

The thread currently gathers participant names, avatars, locations, business names, phone numbers, emergency names, hiring names, selected request records, selected conversation records, and return-page context inside the page. Some of these are valid compatibility inputs. Some are display fallbacks. Some are close to relationship context ownership and should not be expanded until authority is clearer.

Best-aligned area: **MessagesInbox participant projection.**

Inbox cards call `getConversationParticipantIdentity()` for display and `applyConversationIdentity()` during handoff. This is closest to the desired model: Inbox interprets a conversation record rather than owning participant identity.

Recommended next step: **Conversation identity projection implementation cleanup.**

This should be a narrow Foundation implementation that moves display-only identity input normalization behind existing projection helpers, without changing routing, storage, writers, lifecycle, or visible UI.

TestFlight safety: **Safe only if scoped to display projection cleanup.**

Do not migrate keys, remove fallbacks, change conversation writers, or alter emergency/hiring routing in this phase.

Note: The Phase 1 audit file referenced by the task was not present at `docs/KnowledgeBase/CONSTITUTIONAL_WALKTHROUGH_PHASE_1_LANTER_AUDIT.md` during this audit. This document preserves the Phase 1 findings represented in `CONSTITUTIONAL_WALKTHROUGH_PHASE_2_CORRECTION_PLAN.md`.

## 2. Constitutional Gate

Does conversation currently reveal relationship identity without owning it?

**Partial.**

Conversation mostly reveals relationship identity through projection helpers, but `ConversationThread.jsx` still performs significant local identity assembly before invoking those helpers. The helper is not yet the single input-normalization boundary. Conversation also writes selected request, selected conversation, active conversation, active project, and return-page context for downstream screens. Those writes may be necessary compatibility behavior today, but they sit near the boundary where conversation can start acting like it owns relationship context.

Constitutional interpretation:

- Chat displays communication.
- Chat may interpret relationship context.
- Chat should not own relationship identity, access, or lifecycle.
- The request/relationship record should own work identity.
- The conversation registry should describe conversation context.
- The projection helper should resolve display identity.

## 3. Identity Ownership Map

| Surface | Identity Shown | Current Source | Desired Source | Risk | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Messages Inbox preview | Other participant name, avatar/initials, emergency/hiring/work label | `getConversationParticipantIdentity()` and `applyConversationIdentity()` using conversation record | `conversationIdentity.js` projection from conversation registry/request context | LOW | Preserve pattern. Avoid adding page-local fallback chains. |
| Conversation Thread header | Customer or business name, avatar, project/context label | Local assembly from registry, meta, selected conversation, selected request, active job, emergency record, localStorage, then `getPersonConversationIdentity()` / `getBusinessConversationIdentity()` | A single conversation participant projection helper that accepts normalized registry/request/emergency/hiring context | MEDIUM/HIGH | Move display-only merge logic behind helper in Phase 3.2. Do not change keys or writers. |
| Emergency conversation header | Emergency service, customer/business identity, emergency status | `activeEmergencyRecord`, `emergencyCustomerName`, `emergencyBusinessName`, selected emergency keys, active job snapshot, local status | Emergency record for emergency facts; conversation identity projection for participant identity; type badge separate | MEDIUM | Keep emergency as type/context, not identity. Do not let emergency label replace customer/business identity. |
| Hiring conversation header | Applicant/business name, position title, hiring badge | Registry/meta fields plus local fallbacks, with hiring message filtering | Hiring conversation record for hiring context; conversation identity projection for participant identity | MEDIUM | Keep hiring badge separate from identity. Move applicant/business fallback normalization into projection helper or a hiring-specific input adapter. |
| Standard work conversation | Business/customer identity, project title, request context | Selected request, selected quote request, selected conversation, registry, meta, active project keys | Request relationship truth plus conversation registry display context | MEDIUM | Treat selected request records as compatibility inputs, not authority. |
| Companion / Lantern | Conversation label and selected conversation target | `getConversationParticipantIdentity()` for latest conversation label; direct localStorage reads for active conversation/request context | Shared conversation projection plus selected context adapter | MEDIUM | Keep Companion read-only. Move active conversation display label behind projection before language polish. |
| Project Details handoff from Conversation | Project title, professional name, selected request/conversation payload | ConversationThread writes selected request/context keys | Request/review context should be owned by request/project projection | HIGH if expanded | Keep current compatibility writes for now. Audit writer ownership before any migration. |

## 4. ConversationThread Findings

| Finding | Evidence | Classification | Constitutional Risk | Recommendation |
| --- | --- | --- | --- | --- |
| Thread imports projection helpers but not the general participant wrapper | Imports `getBusinessConversationIdentity` and `getPersonConversationIdentity` directly. | Projection helper output | LOW | Acceptable today, but Phase 3.2 should prefer one participant-level resolver where possible. |
| Conversation id comes from `activeConversationId` with demo fallback | `conversationId = localStorage.getItem("activeConversationId") || "demo-homeowner-1"` | Compatibility fallback | MEDIUM | Keep for now. Do not let demo fallback become authority. Future cleanup should isolate demo/test defaults. |
| Selected business is read from `selectedContractor` | Used to seed business name, category, location, avatar/logo. | Compatibility/display fallback | MEDIUM | Move selected contractor interpretation behind projection helper or adapter. Do not delete key. |
| Conversation type is read from `meetroConversationType` | Drives emergency/hiring/standard branching. | Active context signal | MEDIUM | Keep as type context. It should not own identity. |
| Emergency record influences identity and status | `activeEmergencyRecord` supplies service, customer, business, phone, status. | Mixed: canonical emergency context plus display fallback | MEDIUM/HIGH | Emergency facts may remain emergency-owned, but participant identity should still project through shared identity rules. |
| Customer identity is assembled locally from registry, meta, selected conversation, selected quote request, selected homeowner request, active job, and localStorage | `conversationCustomerIdentity`, `requestCustomerIdentity`, `linkedCustomerIdentity`, `resolvedCustomerIdentity`. | Local projection assembly | HIGH | Phase 3.2 should move this merge into a helper such as `buildConversationIdentityInput()` or extend `conversationIdentity.js`. |
| Business identity is assembled locally before calling projection | Uses emergency record, registry, meta, selected conversation, selected contractor, `conversationBusinessName`, and `businessName`. | Local projection assembly | MEDIUM/HIGH | Move business input normalization behind helper. Preserve fallback order in tests. |
| Phone resolution is local and role-aware | Customer private phone and business phone are resolved in the thread. | Access/contact display boundary | MEDIUM | Keep behavior stable. Future contact projection should separate call availability from visual identity. |
| Header labels branch for emergency, hiring, and standard conversations | Uses type-specific labels and context. | Display projection | LOW/MEDIUM | Safe if type remains badge/context only. Avoid type becoming identity. |
| ConversationThread writes selected request and selected conversation context when opening Project Details | Writes `selectedHomeownerRequest`, `selectedQuoteRequest`, `activeConversationId`, `activeConversationName`, `activeProjectTitle`, `selectedConversation`, return keys. | Compatibility writer / ownership risk | HIGH | Do not change in Phase 3.2. Document writer authority separately before migration. |
| Conversation registry is updated from thread messages | Thread saves registry item with homeowner email/name, location, type, hiring context. | Sync risk | HIGH | Treat as existing compatibility sync. Do not expand. Future writer audit should decide registry authority. |

## 5. MessagesInbox Findings

| Finding | Evidence | Classification | Constitutional Risk | Recommendation |
| --- | --- | --- | --- | --- |
| Inbox imports shared identity helpers | Uses `applyConversationIdentity` and `getConversationParticipantIdentity`. | Projection helper output | LOW | Preserve. This is the desired pattern. |
| Inbox prepares selected conversation handoff | `prepareConversation()` projects quote, marks read, writes selected request/conversation keys, sets active conversation id/name/type. | Compatibility handoff | MEDIUM | Keep for now. Future work should distinguish handoff context from authority. |
| Inbox preview identity uses participant projection directly | Card render calls `getConversationParticipantIdentity()` for avatar/name/initials. | Projection helper output | LOW | This should be the model for Thread. |
| Emergency and hiring labels are separate card styling/status branches | Emergency/hiring affect card color, status label, and tab grouping. | Type display projection | LOW | Keep type badges separate from identity. |
| Inbox creates/saves normalized registry items | `saveConversationRegistryItem()` writes registry fields and unread counts. | Compatibility writer | MEDIUM/HIGH | Do not migrate in this phase. Registry write authority needs separate audit. |
| Inbox emergency conversation can be synthesized from active emergency data | `getEmergencyConversation()` builds an emergency conversation entry from active emergency record/status. | Compatibility projection/sync | MEDIUM | Keep while emergency storage remains local. Future work should ensure emergency record, not Inbox, owns emergency identity. |

## 6. conversationIdentity.js Findings

| Responsibility | Current Behavior | Should Own? | Missing Input? | Recommendation |
| --- | --- | --- | --- | --- |
| Person display name fallback | Resolves customer/homeowner/participant/applicant fields and falls back to `Customer`. | Yes, for display projection. | It does not receive all Thread registry/meta/request sources directly unless page merges them first. | Add an input-adapter helper rather than expanding page logic. |
| Person avatar fallback | Resolves profile/customer/homeowner/avatar fields. | Yes, for display projection. | Same: Thread currently pre-combines sources. | Keep fallback order centralized. |
| Business identity projection | Delegates to `businessIdentity.js` and preserves business profile photo/logo/owner avatar order. | Yes, as projection. | Needs normalized source object from Thread. | Preserve `businessIdentity.js` as business truth projection. |
| Conversation type badge | Maps emergency/hiring type to badge without changing identity. | Yes. | Type variants from hiring utility are broader than simple string includes. | Consider using `isHiringConversationType()` in future helper if safe. |
| Participant selection by viewer role | Homeowner sees business; professional sees person. | Yes. | Role naming varies: `business`, `professional`, `homeowner`, `personal`. | Normalize viewer role inside helper or adapter. |
| Storage fallback | Business projection is called with `useStorageFallback: false` by default through conversation helper. | Yes. | None. This is good. | Keep conversation projection from silently reading global business identity unless explicitly requested. |
| Authority boundary | Helper does not write and does not mutate workflow. | Yes. | It lacks a high-level "conversation context to identity" adapter. | Phase 3.2 should add/extend a pure adapter, not a writer. |

## 7. Emergency / Hiring / Work Conversation Findings

| Conversation Type | Identity Source | Type Label Source | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| Standard work | Registry/meta/request/selected conversation merged in Thread; Inbox uses projection directly. | `meetroConversationType` or default `standard`; workflow status labels in Inbox. | MEDIUM | Move Thread display merge behind projection helper. Keep request relationship as ownership source. |
| Emergency | `activeEmergencyRecord`, emergency local keys, active job snapshot, registry/meta, projection helper. | `meetroConversationType`, active emergency status, emergency lifecycle. | MEDIUM/HIGH | Emergency type should add urgency/status, not replace participant identity. Future adapter should keep emergency fact source separate from participant projection. |
| Hiring | Registry/meta applicant and business fields plus hiring utility filters. | `isHiringConversationType()` and hiring conversation record. | MEDIUM | Hiring badge and position context should remain separate from applicant/business identity. |
| Completed/history conversation | Registry saved state and completed job handoff keys. | `saved_to_history`, return page, completed job context. | MEDIUM | Preserve historical conversation access. Do not let history conversation reopen active workflow ownership. |

## 8. Companion / Lantern Identity Findings

| Surface | Current Identity Source | Risk | Recommendation |
| --- | --- | --- | --- |
| Latest conversation label | `getConversationParticipantIdentity()` on latest registry item. | LOW | Good alignment. Preserve. |
| Selected context | Direct localStorage reads for `selectedHomeownerRequestId`, `activeConversationId`, quote/request ids, schedule ids. | MEDIUM | Accept as navigation context for now. Do not let Companion write relationship truth. |
| Emergency context | Reads active emergency record/status and conversation type to decide emergency assistant context. | MEDIUM | Keep emergency observation scoped. Future identity display should rely on conversation projection. |
| Action execution | Writes active conversation/request keys before navigation. | MEDIUM/HIGH | Treat as compatibility navigation handoff, not identity authority. Do not expand without writer audit. |
| Companion page context | `companionContext.js` maps current page to high-level work context. | LOW | Good: this is guidance context, not identity ownership. |

## 9. Legacy Keys Register

| Key | Read Location | Write Location | Classification | Risk | Future Action |
| --- | --- | --- | --- | --- | --- |
| `activeConversationId` | ConversationThread, MessagesInbox, MeetroAssistant, conversationOrigin, emergencyLifecycle, workCenter, notification helpers | MessagesInbox, ConversationThread, emergencyLifecycle, MyRequests, CompletedJobDetails, MeetroAssistant, other entry points | Active navigation/context | MEDIUM | Keep for now. Move display resolution behind projection helper; migrate only after backend authority. |
| `activeConversationName` | ConversationThread, conversationOrigin, emergencyLifecycle, account cleanup | MessagesInbox, ConversationThread, emergencyLifecycle, MyRequests, CompletedJobDetails | Display fallback / navigation context | MEDIUM | Keep for compatibility. Do not treat as canonical identity. |
| `conversationBusinessName` | ConversationThread, MessagesInbox, ContractorDetails, ChangeOrderRequest | ContractorDetails, ChangeOrderRequest, other handoffs | Display fallback | MEDIUM | Move behind business conversation projection as fallback only. |
| `meetroConversationType` | ConversationThread, MessagesInbox, MeetroAssistant, emergencyLifecycle, conversationOrigin | MessagesInbox, ConversationThread, emergencyLifecycle, hiringConversations, MyRequests, other entry points | Type context | MEDIUM | Keep. Normalize through helper; ensure type badge stays separate from identity. |
| `selectedConversation` | ConversationThread, conversationOrigin, relationshipInsights | ConversationThread, MyRequests, CompletedJobDetails, conversationOrigin | Compatibility context bundle | HIGH | Document only. Do not migrate before writer authority audit. |
| `selectedQuoteRequest` | ConversationThread, MeetroAssistant, relationshipInsights | MessagesInbox, ConversationThread, MyRequests, CompletedJobDetails, MeetroAssistant | Compatibility request context | HIGH | Keep. Prefer request relationship truth when available. |
| `selectedQuoteRequestId` | MessagesInbox, ConversationThread, MeetroAssistant, emergencyLifecycle | MessagesInbox, emergencyLifecycle, MyRequests, MeetroAssistant | Navigation/request id context | MEDIUM | Keep. Do not use as participant identity by itself. |
| `selectedHomeownerRequest` | ConversationThread, MeetroAssistant, relationshipInsights | ConversationThread, MyRequests, CompletedJobDetails, MeetroAssistant | Compatibility request context | HIGH | Keep. Future projection should read request truth through one adapter. |
| `selectedHomeownerRequestId` | ConversationThread, MessagesInbox, MeetroAssistant, MyRequests, notification helpers | ConversationThread, MyRequests, CompletedJobDetails, MeetroAssistant, notifications | Request relationship context | MEDIUM/HIGH | Keep. Future authority belongs to request lifecycle, not conversation. |
| `selectedContractor` | ConversationThread, ContractorDetails, profile sharing | ContractorDetails, profileShare, Contractors | Business display fallback | MEDIUM | Keep as public-profile handoff fallback. Prefer `businessIdentity.js` for display. |
| `meetro_conversation_registry` | MessagesInbox, ConversationThread, MeetroAssistant, conversationUnread, emergencyLifecycle, BottomNav | MessagesInbox, ConversationThread, emergencyLifecycle, hiringConversations, CompletedJobDetails, QA seed | Conversation registry / compatibility index | HIGH | Do not migrate in Phase 3.2. Needs registry authority audit. |
| `meetro_conversation_meta_{conversationId}` | ConversationThread, workCenter, MessagesInbox | workCenter `saveConversationMeta`, ConversationThread via registry/meta workflows | Conversation metadata | MEDIUM/HIGH | Keep. Future helper should consume it as input, not writer authority. |
| `activeEmergencyRecord` | ConversationThread, MessagesInbox, MeetroAssistant, emergencyLifecycle, emergency pages, BottomNav, Work Center selectors | emergencyLifecycle, emergency pages | Emergency context source | MEDIUM/HIGH | Keep. Emergency owns emergency facts; projection owns display identity. |
| `emergencyCustomerName` | ConversationThread, MeetroAssistant, emergencyLifecycle | Emergency request/lifecycle paths | Emergency display fallback | MEDIUM | Keep until emergency record authority is complete. |
| `emergencyBusinessName` | ConversationThread, emergencyLifecycle, emergency pages | Emergency request/lifecycle paths | Emergency display fallback | MEDIUM | Keep until emergency record authority is complete. |
| `selectedEmergencyBusiness` | ConversationThread, emergency pages | Emergency request/business selection paths | Emergency business fallback | MEDIUM | Keep. Prefer emergency record/business identity projection. |
| `emergencyBusinessPhone`, `businessEmergencyPhone` | ConversationThread | Emergency/business setup paths | Contact fallback | MEDIUM | Future contact projection should own call availability. |
| `conversationBusinessPhone` | ConversationThread | Handoff flows | Contact fallback | MEDIUM | Keep. Do not mix with visual identity projection. |
| `businessPhone`, `contractorPhone` | ConversationThread, business/profile flows | Business profile/session flows | Business contact fallback | MEDIUM | Business identity/contact projection should own later. |
| `meetroHomeownerPrivatePhone:{key}` | ConversationThread | Profile/account phone flows | Private contact data | HIGH privacy | Keep scoped. Do not expose outside relationship conversation. |
| `meetroHomeownerPrivatePhone`, `homeownerPrivatePhone` | ConversationThread | Profile/account phone flows | Legacy private contact fallback | HIGH privacy | Keep only behind scoped match. Later move to contact projection. |
| `activeProjectTitle` | ConversationThread, handoff flows | ConversationThread, ChangeOrderRequest | Display/navigation context | MEDIUM | Keep as fallback only. Request/project title should own canonical title. |
| `activeCustomerLocation`, `projectLocation` | ConversationThread, workCenter, selectors | Work/project/schedule flows | Display/location fallback | MEDIUM | Keep until request/schedule location projection is centralized. |
| `conversationReturnPage`, `returnPage`, `projectDetailsReturnPage` | ConversationThread, conversationOrigin, emergencyLifecycle, MyRequests | ConversationThread, MessagesInbox, emergencyLifecycle, MyRequests, CompletedJobDetails | Navigation return context | LOW/MEDIUM | Keep. Not identity. Avoid mixing with participant truth. |
| `selectedMessageReceiverId` | ConversationThread, MessagesInbox | MessagesInbox, ContractorDetails | Message recipient context | MEDIUM | Keep. Future messaging authority should own. |
| `businessName`, `companyName` | ConversationThread, session, identity fallback | session/profile flows | Business identity fallback | MEDIUM | Prefer `businessIdentity.js` projection. Do not use as conversation authority when request/registry has business identity. |
| `homeownerName`, `userName` | ConversationThread, session | session/profile flows | Person display fallback | MEDIUM | Prefer person profile/request identity where available. |

## 10. Sync vs Projection Risks

- `ConversationThread.jsx` saves conversation registry items derived from current thread state. This is sync behavior, not pure projection.
- `MessagesInbox.jsx` normalizes and saves registry items during conversation open. This helps continuity but means Inbox participates in context persistence.
- `ConversationThread.jsx` writes selected request and selected conversation payloads before opening Project Details. This is a compatibility handoff but sits close to project/review ownership.
- `MeetroAssistant.jsx` writes active conversation/request context when executing actions. This is navigation handoff behavior, but it must remain read-guidance-first and not become relationship authority.
- Emergency conversation entries can be synthesized from active emergency storage. That is acceptable while local emergency storage remains source of truth, but it should be documented as emergency projection, not conversation ownership.
- Hiring conversation utility writes registry and active conversation keys. This is a specialized writer and should not be generalized without a writer authority audit.

## 11. TestFlight-Safe Follow-Up

Safe follow-ups:

- Add a pure adapter helper that accepts registry, meta, selected conversation, selected request, emergency record, and viewer role, then returns a normalized input for `conversationIdentity.js`.
- Replace local display-only customer/business fallback chains in `ConversationThread.jsx` with that adapter.
- Preserve every current key, fallback, and display result during the first implementation.
- Add characterization tests for standard, emergency, hiring, homeowner view, professional view, missing-avatar, logo fallback, and initials fallback.
- Add tests proving Inbox and Thread receive the same projected participant identity for the same conversation record.
- Add tests proving emergency/hiring badges do not change participant identity.
- Keep phone/call availability separate from avatar/name projection unless a contact projection helper already exists.

These are safe because they:

- Do not change storage.
- Do not change writers.
- Do not change routing.
- Do not change lifecycle.
- Only move display resolution behind existing helpers.
- Preserve behavior.

## 12. Deferred Follow-Up

Defer:

- Removing or renaming any localStorage key.
- Migrating selected conversation/request handoff keys.
- Changing conversation registry write authority.
- Moving emergency record authority.
- Changing hiring conversation writer behavior.
- Replacing local conversation context with backend relationship registry.
- Changing call/contact permission behavior.
- Changing Project Details handoff or Review Project routing.
- Altering lifecycle, closure, history, or work ownership.
- Broad refactor of `ConversationThread.jsx`.

These require storage migration, backend authority, writer migration, relationship registry changes, lifecycle authority changes, or broad regression risk.

## 13. Recommended Phase 3.2

Recommended: **Conversation identity projection implementation cleanup**

Reason:

Foundation before Stewardship. This audit found that shared projection helpers exist and are used, but `ConversationThread.jsx` still builds identity locally before projection. The next constitutional step is not language polish. It is moving display-only identity normalization behind a pure projection adapter while preserving behavior.

Phase 3.2 should explicitly exclude:

- Storage migration.
- Writer migration.
- Routing changes.
- Lifecycle changes.
- Emergency ownership changes.
- Hiring ownership changes.
- Visual redesign.
- Companion language polish.

## 14. Final Stewardship Determination

Does this audit protect truth before calmness?

**Yes.** It identifies the remaining Foundation boundary before recommending language or visual simplification.

Does this preserve relationship identity?

**Yes, if Phase 3.2 remains narrow.** Conversation should reveal the relationship through shared identity projection, not rebuild it from scattered page state.

Does this keep the Lantern lit?

**Yes.** The Companion can guide only if it speaks from the correct relationship identity. This audit protects that ground.

Would the Vision Keeper recognize the correction direction?

**Yes.** The direction is constitutional: Conversation does not create relationships. Conversation reveals relationships.

The next step should make that truth simpler in code without making the product larger.
