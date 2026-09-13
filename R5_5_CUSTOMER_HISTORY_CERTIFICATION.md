# MEETRO R5.5 — Customer History Certification

Candidate roots:

- Client: `/private/tmp/meetro-r55-client-20260913`
- Server: `/private/tmp/meetro-r55-server-20260913`
- Frozen R5.4C client remained unchanged: `/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5`

## Authority and continuity

1. **Data owner:** the authenticated, contractor-owned `business_customer_relationships` record is the Customer History owner. Its current Contact is read from `business_contacts`. History is projected by the owner-scoped `GET /business-customer-relationships/:relationshipId/activity` endpoint.
2. **Job-to-customer linkage:** `business_customer_relationships(contractor_profile_id, business_contact_id, id)` → the exact same three-column tuple on `job_customer_parties` → `jobs.id`. No display field participates.
3. **Why history may be empty:** no exact `job_customer_parties` row exists for that Job and tuple, or the caller selected a different durable relationship. The previous Job projection did find linked Jobs, but a business-origin Job without a marketplace post could display the generic title `Job`.
4. **Corrections required:** client and server. The client needed stable interaction ownership, navigation continuity, Customer History presentation, and responsive containment. The server read projection needed canonical Visit/Schedule and work-performed activity plus the governed business-document Job title. No mutation authority changed.
5. **Meetro customer behavior:** a marketplace-origin Job appears when an exact `job_customer_parties` record already links it to the business Contact and relationship. The current schema intentionally gives an ordinary marketplace Job no business Contact identity, and no governed mapping exists from a homeowner user ID to a private business Contact. Existing unlinked marketplace Jobs therefore remain truthfully unlinked.
6. **External customer behavior:** a business document can carry an explicit business Contact and relationship. `materializeBusinessDocumentJob` copies both durable IDs onto the Job and inserts the exact `job_customer_parties` row, so the Job appears automatically without a Meetro customer account or fabricated marketplace identity.
7. **Repeat Jobs:** reusing the existing customer on each new business document reuses its durable Contact/relationship tuple. Each materialized Job gets its own Job ID and party row and appears under the same Customer History.
8. **Active Jobs:** an exact linked Job without canonical completion evidence is presented in Active Jobs.
9. **Completed Jobs:** an exact linked Job with `canonical_job_completion_records` evidence is presented in Completed Jobs and remains discoverable after closure.
10. **Quote linkage:** `canonical_quote_customer_parties` must match the contractor, Contact, relationship, Quote, and Job. The current canonical Quote version and exact-version customer decision/approval remain the authorities.
11. **Invoice linkage:** `canonical_invoice_customer_parties` must match the contractor, Contact, relationship, Invoice, and Job. The latest canonical Invoice version remains the financial state authority.
12. **Deposit/payment linkage:** the exact party-linked Job scopes `canonical_pre_work_deposit_obligations`, latest deposit versions, `canonical_pre_work_payment_receipts`, and `canonical_invoice_payments`. Customer History only reads these records.
13. **Visit/Schedule and work linkage:** the exact party-linked Job scopes `canonical_visits` plus the latest `canonical_visit_versions`, and `canonical_work_activities` plus their latest activity/workstream versions.
14. **Documents/photos:** Quote and Invoice documents retain their exact Job and canonical document parent. Photos remain governed attached request photos under the exact linked Job; working-draft and inferred media remain excluded.

The safe bounded follow-up for old marketplace Jobs would require a persistent, explicitly confirmed mapping between the authenticated homeowner identity and the professional's private business Contact/relationship, followed by an idempotent exact-Job link command. That mapping does not exist today. No names, email addresses, phone numbers, titles, or approximate matching were used, and no reconciliation or backfill was run.

## iPad interaction and navigation

15. **Scroll-collapse root cause:** `CustomerRelationshipsCenter` built `loadInitialWorkspace` from the `setPage` prop. `App` supplies a new `setPage` function identity on parent renders, so viewport/layout renders changed the loader identity, reran the mount effect, set the workspace to loading, and restored the initial detail (usually `null`). There was no parent-card, backdrop, event-bubbling, pointer-capture, or unstable-key close handler.
16. **Fix:** a ref retains the latest `setPage`; one stable `navigate` callback owns navigation. Initial loading is therefore independent of parent callback identity. Monotonic request IDs also reject stale detail/activity responses. Only Back, another customer selection, or an explicit route can change the selected identity. The page is a bounded `100dvh` vertical scroll surface with `touch-action: pan-y`, contained overscroll, hidden horizontal overflow, momentum scrolling, and safe bottom clearance.
17. **Identity stability:** tests prove selection survives pointer down/move/up, repeated scrolling, parent rerender with a different `setPage` identity, resize, orientation change, tab changes, and narrow/wide/narrow viewport transitions without a relationship refetch. Back closes the detail, deliberate selection opens another customer, and the exact Job route stores customer context for return.

## Responsive results

18. **iPhone:** widths 375, 390, 430, 600, and 700 passed in Chromium and WebKit. Detail uses one column, long customer/Job names wrap, tabs remain reachable in their own contained strip, actions are at least 44px, the page has 96px BottomNav clearance, and there is no page-level horizontal overflow.
19. **iPad:** widths 768, 820, 900, and 1024 passed, including portrait/landscape swaps and constrained lanes. The fixed sidebar is shown, BottomNav is hidden, the detail remains selected and scrollable, tabs stay inside the content lane, and text is not clipped.
20. **Desktop/web:** widths 1180, 1366, and 1512 passed. The existing fixed sidebar and post-sidebar workspace lane remain in use; the mobile dock is hidden and the content caps at 980px.

## Files changed

21. **Production files:**

Client:

- `src/components/BottomNav.jsx`
- `src/components/UnifiedBusinessDocumentWorkspace.jsx`
- `src/pages/BusinessCommandCenter.jsx`
- `src/pages/ContractorDashboard.jsx`
- `src/pages/CustomerRelationshipsCenter.jsx`
- `src/utils/businessCustomerRelationshipsApi.js`
- `src/utils/businessDocumentCustomerLanguage.js`
- `src/utils/businessIntelligenceRegistry.js`
- `src/utils/businessToolsRegistry.js`
- `src/utils/customerRelationshipsLanguage.js`
- `src/utils/customerRelationshipsWorkspace.js`
- `src/utils/language.js`
- `src/utils/localizationContract.js`
- `src/utils/meetroIconRegistry.js`
- `src/utils/messagesWorkflowLanguage.js`
- `src/utils/professionalWorkCenterRoute.js`

Server:

- `server/relationships/businessCustomerRelationshipService.js`

22. **Tests changed:**

Client:

- `tests/adaptiveNavigation.test.js`
- `tests/browser/customerHistoryFixture.html`
- `tests/browser/customerHistoryHarness.jsx`
- `tests/browser/customerHistoryPhysicalLayout.mjs`
- `tests/customerHistoryContinuity.test.js`
- `tests/customerRelationshipsTruth.test.js`
- `tests/localizationContract.test.js`
- `tests/quoteInvoiceMobileFlow.test.js`

Server:

- `test/businessCustomerRelationshipActivity.test.js`
- `test/businessCustomerRelationshipMediaActivity.test.js`
- `test/customerHistoryContinuity.test.js`
- `test/subscriptionFoundation.test.js` (made the existing 14-day trial fixture relative to test time so it cannot expire on the wall clock)

## Automated certification

23. **Focused tests:** client 55/55 passed; server 42/42 passed. The server total includes all 16 required Customer History authority fixtures.
24. **Chromium:** 12/12 responsive interaction widths passed with the production layout coordinator.
25. **WebKit:** 12/12 responsive interaction widths passed with the production layout coordinator.
26. **Full client:** 4,944/4,944 passed; 0 failed, 0 skipped.
27. **Full server:** 2,467 total; 2,396 passed, 0 failed, 71 database-dependent skips.
28. **Builds:** `npm run build` and `npm run build:staging` passed; each transformed 704 modules. Vite retained its existing large-chunk warning.
29. **Diff checks:** `git diff --check` passed in both isolated candidates.
30. **Migration:** none created or run.
31. **Release actions:** no commit, push, deployment, TestFlight build, or protected-repository edit was performed.

## Remaining physical gate

Automated physical-equivalent QA is complete. Real-device QA is still required before release approval: iPhone, iPad portrait, and iPad landscape. The blocking gesture is: open Customers → open a customer → scroll repeatedly → confirm the same customer remains open.
