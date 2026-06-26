# Work Center + Matching QA Handoff

Date: 2026-06-21

## Scope

This handoff summarizes the matching/eligibility foundation and Work Center polish completed for the current TestFlight readiness pass. No new runtime behavior is introduced by this document.

## Matching / Eligibility Milestones Completed

- Added shared frontend lead eligibility behavior that requires both service/domain/specialty eligibility and service-area eligibility before local lead visibility.
- Added backend contract utilities for service-domain/category/specialty matching, service-area matching, and combined lead eligibility.
- Documented the lead eligibility contract in `LEAD_ELIGIBILITY_MATCHING_CONTRACT.md`.
- Added frontend/backend parity coverage for unsafe routing scenarios.
- Expanded specialty-level matching foundations for home services, healthcare, property management, and transportation.
- Updated onboarding/request/profile foundations so selected or inferred specialties can be preserved and displayed.
- Added scenario coverage for unsafe lead exposure, including healthcare-to-handyman blocks, unknown request fail-closed behavior, tenant ticket gating, and coordinate/radius area checks.

## Work Center Workflow Polish Completed

- Current Jobs list status now uses the same resolved workflow status source as the open job hub.
- Proposal Sent state now clearly shows:
  - Current Status: Waiting for customer approval
  - Next Action: Customer reviews and approves the proposal
  - Primary Button: Open Conversation
  - Secondary action: Record Approval Manually
- Completed Evaluation Notes now default to read-only supporting documentation once proposal/workflow progress moves past Evaluation, with explicit Edit Evaluation available.
- Job-launched Quote, Invoice/Receipt, and Completion screens now use clearer return labels such as Back to Work Center or Back to Sarah Job when context is available.
- Supporting Records are collapsed by default, marked read-only, and styled as secondary to the current workflow step.
- Work Center primary CTA labels are normalized to verb-first wording, including Mark On The Way, Mark Arrived, Create Receipt, and Send Receipt.

## Current Test / Build Status

- `npm test`: passing at last verification, 531 tests.
- `npm run build`: passing at last verification.
- Known non-blocking warning: Vite still reports large chunks over 500 kB after minification.

## Remaining Non-Blocking Gaps

- Matching is still frontend/local plus backend contract foundation; real backend lead distribution is not wired yet.
- Location matching supports city/zip and coordinate/radius foundations, but does not include geocoding, maps, or live GPS permission flows.
- Work Center workflow state helpers still live largely inside `ContractorDashboard.jsx`; future extraction would make broader regression coverage cleaner.
- Some older Work Center/legacy paths remain in the file and should be handled carefully to avoid reviving duplicate workflow surfaces.
- Large bundle warning remains a future performance/code-splitting task, not a current functional blocker.

## Recommended Next TestFlight-Focused Task

Run a role-based TestFlight smoke pass on a real iPhone or iPhone simulator:

1. Professional: open Work Center, Current Jobs, Sarah job hub, Proposal Sent, Supporting Records, Quote/Invoice/Completion return paths.
2. Homeowner: create a request, confirm active request visibility, view messages, review quote, and confirm service history stays homeowner-scoped.
3. Matching safety: seed or create healthcare, unknown, tenant ticket, and home-service requests; confirm wrong-domain professionals do not see them.
4. Mobile polish: check safe area, BottomNav clearance, keyboard behavior, and no horizontal shifting on the touched Work Center and builder screens.

Recommended follow-up file if issues are found: a short `TESTFLIGHT_SMOKE_QA_2026_06_21.md` with pass/fail notes by role and screen.
