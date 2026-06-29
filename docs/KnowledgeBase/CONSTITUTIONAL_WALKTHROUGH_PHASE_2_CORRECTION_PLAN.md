# Constitutional Walkthrough Phase 2 Correction Plan

## 1. Executive Summary

This plan converts the Phase 1 Lanter Journey Audit into a TestFlight-safe correction sequence for calmness, language discipline, and truth cleanup. It is intentionally not an implementation plan for new features. It protects Meetro's constitutional identity by reducing drift before adding more product surface area.

The next work should strengthen what already exists:

- Make Meetro calmer by reducing visible cognitive weight.
- Make Meetro's language relationship-first, request-preparation-first, and promise-centered.
- Continue moving identity, lifecycle, metrics, and workflow truth into shared projections.

What should not happen yet:

- No new surfaces, tabs, centers, or feature areas.
- No storage migrations without a separate migration authority plan.
- No workflow writer migration inside a copy or polish task.
- No redesign of Work Center, Conversation, Companion, or Request Creation.
- No backend authority changes as part of TestFlight polish.

The Phase 1 file referenced by the task was not present at `docs/KnowledgeBase/CONSTITUTIONAL_WALKTHROUGH_PHASE_1_LANTER_AUDIT.md` during this review. This plan preserves the Phase 1 findings provided in the task brief and grounds the correction lanes in the current implementation files.

## Constitutional Sequencing

The correction plan must preserve constitutional order.

Corrections should be prioritized by dependency rather than visibility. Always prefer correcting the underlying constitutional cause before correcting the visible symptom.

The preferred order is:

1. Truth
   - Ownership
   - Projection
   - Identity
   - Lifecycle
2. Calmness
   - Cognitive weight
   - Repeated information
   - Unnecessary navigation
   - Visible complexity
3. Language
   - Wording
   - Companion tone
   - Workflow clarity
   - Relationship-first communication
4. Polish
   - Spacing
   - Typography
   - Animation
   - Visual refinement

Never recommend polishing a page whose constitutional truth is still incorrect. Never recommend simplifying language while ownership remains ambiguous.

The correction plan should strengthen the foundation before refining the experience.

## Constitutional Order of Correction

Every correction is ranked as one of:

**Foundation**

Must happen before other corrections.

Examples:

- Ownership
- Projection
- Lifecycle
- Relationship truth

**Stewardship**

Strengthens the Constitution.

Examples:

- Calmness
- Language
- Companion guidance
- Trust wording

**Refinement**

Improves experience after constitutional alignment.

Examples:

- Spacing
- Density
- Typography
- Animation
- Visual hierarchy

Future implementation should always complete Foundation before Stewardship, and Stewardship before Refinement.

## 2. Phase 1 Findings Preserved

Overall Constitutional Fidelity: **PARTIAL with DRIFT RISK**

Functional Readiness: **PARTIAL**

Strongest constitutional area: **One Truth. Many Perspectives.**

Highest drift risk: **simplicity, calmness, and cognitive weight**

Final determination preserved:

Meetro remains recognizable as a relationship-first product. The current architecture increasingly respects the Constitution: requests own work, conversations communicate, schedules plan, Work Center projects responsibility, and history preserves memory. The primary stewardship risk is not absence of truth. It is complexity obscuring truth.

## 3. Correction Lane 1 — Calmness / Cognitive Weight

| Area | Drift Evidence | Principle at Risk | Correction Direction | TestFlight Safety | Priority | Order |
| --- | --- | --- | --- | --- | --- | --- |
| Work Center density | `ContractorDashboard.jsx` contains many simultaneous responsibilities: evaluation, materials, schedule, quote history, active work, closure, revenue, warnings, and counts. | Clarity is respect. Views interpret work; views do not own work. | First verify Work Center projections are constitutionally correct; then reduce first-glance surfaces to the current promise: what needs attention now, what is scheduled, what is waiting, what is done. | Partial. Projection confirmation is safe; structural reorganization should wait. | HIGH | Foundation before Stewardship |
| Professional workflow weight | Professionals may see dashboard, leads, schedule, quotes, Work Center, closure, materials, and reports as competing responsibilities. | Technology helps professionals keep promises. | Confirm each view owns no workflow state; then make each surface answer one question. Leads: available opportunities. Work Center: current responsibility. Schedule: planned time. History: completed work. | Safe only if visible grouping changes after ownership is confirmed. | HIGH | Foundation before Stewardship |
| First-time setup/service selection | Setup and request category moments can still feel like configuring software instead of beginning a business relationship or request. | Simplicity is respect. Customers describe problems; businesses describe capabilities. | Confirm setup writes to shared business/request truth; then use promise-centered framing: "Choose the work your business can do" and "Describe what you need." | Safe for copy and helper text after shared truth is confirmed. Defer persistence or onboarding gate changes. | MEDIUM | Foundation before Stewardship |
| Request preparation continuity | `Assistant.jsx` prepares a request, but the action still uses the `aiHelp` key and the page can feel like an assistant feature instead of request preparation. | Preparation should feel more important than generation. | Confirm draft handoff remains the request truth; then frame the page as Meetro preparing a request for review before sending. | Safe for copy alignment only. Do not change routing or draft storage in this phase. | HIGH | Foundation before Stewardship |
| Repeated summaries in conversation/workflow cards | Conversation still has many cards, summaries, status labels, and document/workflow elements competing for attention. | Conversation communicates. Preview/review displays. Builders edit. | Confirm which card owns the current state; then suppress duplicate visible status language when one current-state card already communicates the truth. | Safe when limited to copy visibility and duplicate suppression after state ownership is clear. | MEDIUM | Foundation before Stewardship |
| Companion visible capabilities | `MeetroAssistant.jsx` still contains helper/tips language such as quick help, details/feedback, voice tips, and "Assistant Response" cleanup logic. | Companion serves the work. Work never serves Companion. | Confirm Companion context is grounded; then keep the default experience focused on current work, one observation, and intentional Ask Meetro. | Safe for visible wording and default visibility after context source is confirmed. | MEDIUM | Stewardship |
| Business Profile health/verification/actions | Business Profile now owns business identity correctly, but the amount of status information can feel dashboard-like. | Information lives where it naturally belongs. | Keep verification, services, setup review, and identity. Avoid adding operational health metrics that belong in Work Center. | Safe as a future audit; do not change now unless a metric is plainly misplaced. | LOW | Refinement after Foundation |

## 4. Correction Lane 2 — Language Discipline

| Area | Current Pattern | Constitutional Concern | Preferred Direction | Avoid | Priority | Order |
| --- | --- | --- | --- | --- | --- | --- |
| Ask Meetro primary action | `Assistant.jsx` renders `t("aiHelp")`; the visible English value is currently "Ask Meetro." | Key naming and implementation language still carry AI-first intent, even if visible copy is improved. | After request draft ownership is confirmed, visible copy should remain "Prepare Request" or "Ask Meetro" only when the user is truly asking Meetro. Internally, plan a later key cleanup. | Do not rename translation keys in a TestFlight copy patch unless all languages/tests are covered. | HIGH | Stewardship after Foundation |
| Assistant response labels | `MeetroAssistant.jsx` includes `assistantResponseLabel: "Assistant Response"` and cleanup logic that removes that phrase from output. | Makes technology visible and centers the assistant instead of the work. | "Meetro says", "Next", "I noticed", "Today’s focus", or "Recommendation" depending on context. | "Assistant Response", "Generated response", "AI answer", raw intent labels. | HIGH | Stewardship |
| Generic help prompts | "How can I help you today?", "Quick help", "Try asking Meetro...", "Details & feedback." | The Companion risks feeling like a help center instead of a lantern. | Contextual, work-first language: "I noticed", "Next", "Ask Meetro", "Review Insights." | Broad education, feature tours, helper tabs in the default Companion path. | MEDIUM | Stewardship |
| Workflow action labels | Some legacy labels still imply destination-first behavior, such as opening tools/pages instead of continuing work. | A button is a promise. | Confirm destination truth first; then use action-first labels: "Continue Conversation", "Review Proposal", "Continue Work", "Send Request", "Review Closure." | "Open page", "View feature", "Go to tool" where the workflow action is more specific. | MEDIUM | Foundation before Stewardship |
| Setup/service language | Business services can sound like categories instead of capabilities. | Businesses describe capabilities. | After shared service ownership is confirmed, use "Services Offered" and "Choose the work your business is qualified to perform." | "Categories" as the primary visible concept for business identity. | MEDIUM | Stewardship after Foundation |
| Completion/Closure language | Completion and closeout have historically been blended. | Completion is not Closure. | Confirm lifecycle truth first; then use "Completion recorded" for work done, "Closure review" for final obligations, and "History" after closure. | "Closeout" as a catch-all for completion, payment, receipt, and history. | HIGH | Foundation before Stewardship |
| Public trust language | Verification and trust labels must avoid overclaiming. | Verification supports trust. No page invents trust language. | Use projection-provided labels: verified, not verified, public trust summary, compact badge. | Hardcoded "trusted", "licensed", or "insured" unless projection data supports it. | MEDIUM | Stewardship after Foundation |

## 5. Correction Lane 3 — Legacy Truth Cleanup

| Area | Current Truth Location | Desired Truth Location | Risk | Safe First Step | Blocker | Order |
| --- | --- | --- | --- | --- | --- | --- |
| Conversation participant identity | `ConversationThread.jsx` still assembles many names, avatars, localStorage values, and emergency fallbacks before calling identity helpers. | `conversationIdentity.js`, backed by `businessIdentity.js` and person identity projections. | MEDIUM | Audit-only pass that lists every local identity fallback and classifies whether it belongs in the helper. | Requires careful emergency/hiring regression coverage before extraction. | Foundation |
| Conversation ownership/context | Conversation stores and reads many `selectedConversation`, `activeConversationName`, `conversationReturnPage`, and active request keys. | Request relationship projection and conversation registry should describe relationship context. | HIGH | Do not migrate yet. First document read/write responsibilities and identify keys that are compatibility-only. | Writer migration and backend authority are not ready for a copy-polish task. | Foundation |
| Professional work projection | `professionalLifecycleProjection.js` is now the desired read model, but Work Center still contains page-local calculations and fallback totals. | `professionalLifecycleProjection.js`, `workCenterSelectors.js`, and `dashboardMetrics.js`. | MEDIUM | Replace only duplicated visible counts with existing metrics helpers where behavior is unchanged. | Some Work Center counts answer different questions; collapsing them blindly would create false truth. | Foundation |
| Lead source truth | `businessLeadSourceTruth.js` now gates source truth and cache purge. | Shared homeowner request truth plus capability matching. | LOW/MEDIUM | Keep as-is; add future docs for retiring legacy cache keys after device stability. | Recent stability issues make additional cache migration risky before TestFlight proof. | Foundation |
| Business identity | `businessIdentity.js` is the desired owner and is used in Business Profile/Public surfaces. | `businessIdentity.js`. | LOW | Continue forbidding page-local business name/image/verification shaping in new work. | Existing pages may still contain compatibility shaping for public share records. | Foundation |
| Services offered | `businessServiceProfile.js` is the desired owner. | `businessServiceProfile.js` and service registry helpers. | LOW | Keep Business Profile and onboarding on shared data; do not add parallel category stores. | Later backend adoption may require a formal service profile authority contract. | Foundation |
| Portfolio proof | `businessPortfolioProof.js` is the desired projection. | Completed/public-safe history and portfolio storage through the proof projection. | LOW | Use proof projection anywhere public counts appear. | Review/rating authority may still be partly local. | Foundation |
| Completion vs Closure | Completion/closure truth spans Work Center, Conversation cards, CompletedJobDetails, and history helpers. | Closure aggregate/history authority documents and shared lifecycle helpers. | MEDIUM/HIGH | Audit lifecycle truth first. Language-only correction may follow only where ownership is already clear. Do not move closure authority yet. | Completion-history authority changes require separate adoption plan. | Foundation |

## 6. TestFlight-Safe Corrections

These corrections reduce drift while preserving behavior. They are ordered by constitutional dependency:

- Foundation: Use shared projection helpers for visible labels/counts only when the projection already exists and behavior does not change.
- Foundation: Add documentation-only audits before touching legacy storage keys.
- Foundation: Confirm Completion and Closure ownership before changing related language.
- Stewardship: Replace visible "Assistant Response" style labels with Meetro-first labels.
- Stewardship: Keep Ask Meetro request preparation language focused on "Describe, prepare, review, send."
- Stewardship: Remove or hide generic helper/tutorial language from default Companion paths when it is not the user's current work.
- Stewardship: Clarify Work Center headings and card labels so each area says what responsibility it represents, after projection truth is confirmed.
- Stewardship: Suppress duplicate visible summaries where another current-state card already communicates the same status, after state ownership is clear.
- Stewardship: Align service/category copy toward "Services Offered" and "work your business can perform."

These are TestFlight-safe because they:

- Reduce copy drift.
- Reduce visible complexity.
- Clarify next action.
- Preserve existing behavior.
- Do not alter ownership.
- Do not migrate storage.
- Do not change workflow authority.

## 7. Deferred Corrections

Defer corrections that require:

- Storage migration or deletion of legacy compatibility keys.
- Backend authority changes for request, conversation, completion, history, or services.
- Workflow writer migration.
- Large Work Center restructuring.
- New Learn/Tips, Insights Center, or Companion surfaces.
- Contact/runtime adoption.
- Completion-history authority changes.
- Replacing localStorage conversation context with canonical backend relationship context.
- Reworking closure aggregate ownership.
- Removing compatibility fallbacks before iPhone/TestFlight stability is proven.

Deferred does not mean unimportant. It means the correction touches authority, not presentation.

## 8. Constitutional Risk If Ignored

If Meetro keeps adding features before resolving calmness, language, and truth cleanup, the product will remain technically capable but emotionally less legible.

The risks:

- Work Center becomes a control panel instead of a promise-keeping workspace.
- Ask Meetro becomes an AI feature instead of the beginning of a prepared request.
- Companion becomes a help system instead of a lantern.
- Conversation begins owning relationship facts instead of revealing them.
- Legacy storage becomes perceived truth because it keeps surviving migrations.
- Completion and Closure blur again, weakening history.
- Users experience power as complexity rather than confidence.

The constitutional failure mode is subtle: Meetro would still function, but it would stop teaching users how Meetro thinks.

## 9. Recommended Phase 3

Recommended Phase 3: **Conversation identity projection cleanup audit**

Scope:

- Foundation-only audit and characterization.
- `ConversationThread.jsx` identity assembly.
- `conversationIdentity.js` fallback ownership.
- Emergency, hiring, standard work, homeowner, and professional conversation identity cases.
- Local compatibility keys that are identity inputs only.
- No routing changes.
- No storage changes.
- No workflow ownership changes.
- No broad refactor.
- No visible copy changes unless the audit finds a plainly incorrect identity label.

Why this should come first:

- It follows the constitutional order: Foundation before Stewardship.
- Conversation reveals relationships, so participant identity must be unquestionably grounded before language or calmness work.
- It protects homeowner/professional/emergency/hiring trust boundaries.
- It prepares later Companion and language corrections by ensuring Meetro speaks from the correct relationship truth.

After this foundation audit is complete, the next safe Stewardship task should be a warning-free language discipline patch for visible Companion and Ask Meetro copy.

Do not choose Work Center restructuring as Phase 3 yet. Work Center needs calmness, but it carries too much workflow responsibility to touch before foundation truth is confirmed.

## 10. Final Stewardship Note

Does this plan protect intention before implementation?

Yes. It separates constitutional correction from feature expansion and prevents the team from treating drift as merely visual polish.

Does this keep the Lantern lit?

Yes. The plan keeps the Companion and Ask Meetro pointed toward illumination, not control. It asks Meetro to speak less, speak more clearly, and stay close to the user's current work.

Would the Vision Keeper recognize the correction direction?

Yes. The direction preserves the central promise:

Relationships create communication. Communication creates understanding. Understanding creates decisions. Decisions create work. Work creates history. History strengthens relationships.

The next correction should not make Meetro bigger. It should make Meetro truer.
