# External Customer canonical authority certification

**Result: the external completion/Invoice authority blocker is resolved in isolated code and verified locally. No commit, push, deployment, production migration, or real customer message/email was performed. Physical release QA remains pending.**

This report supersedes the external-authority blocker described in `R4_2_RELEASE_CERTIFICATION.md`; the earlier release changes remain uncommitted and preserved.

1. **Exact root cause.** Completion review/commands, Workstream creation, Work Plan reads, Invoice Job/context reads, ready-to-Invoice projections, and customer-history queries required marketplace `posts`/request-relationship joins. Client completion, Work Plan, and Invoice contracts rejected null request IDs. Invoice persistence required non-null marketplace IDs; issuance required a Conversation and message. Effective billing scope read only authenticated customer decisions. External Work completion also advertised Invoice preparation before canonical Job completion.

2. **Client files changed in this finish task.**

- [src/utils/businessJobAuthority.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/businessJobAuthority.js)
- [src/utils/jobCompletionApi.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/jobCompletionApi.js)
- [src/utils/invoicePaymentApi.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/invoicePaymentApi.js)
- [src/utils/workPlanApi.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/workPlanApi.js)
- [src/utils/businessCustomerRelationshipsApi.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/businessCustomerRelationshipsApi.js)
- [src/components/ProfessionalInvoiceWorkspace.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/ProfessionalInvoiceWorkspace.jsx)
- [src/components/ProfessionalWorkPlanWorkspace.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/ProfessionalWorkPlanWorkspace.jsx)
- [src/pages/CustomerRelationshipsCenter.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/pages/CustomerRelationshipsCenter.jsx)
- [tests/jobCompletionApi.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/jobCompletionApi.test.js)
- [tests/invoicePaymentApi.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/invoicePaymentApi.test.js)
- [tests/releaseBillingRuntime.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/releaseBillingRuntime.test.js)
- [tests/jobCompletionUx.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/jobCompletionUx.test.js)
- [tests/workCenterLifecycleUxIntegration.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/workCenterLifecycleUxIntegration.test.js)
- [tests/askMeetroWorkspace.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/askMeetroWorkspace.test.js)

3. **Server files changed in this finish task.**

- [server/relationships/businessJobAuthority.js](/private/tmp/meetro-r4-2-release-server/server/relationships/businessJobAuthority.js)
- [server/workflow/jobCompletionService.js](/private/tmp/meetro-r4-2-release-server/server/workflow/jobCompletionService.js)
- [server/workflow/jobFoundationService.js](/private/tmp/meetro-r4-2-release-server/server/workflow/jobFoundationService.js)
- [server/workflow/workstreamService.js](/private/tmp/meetro-r4-2-release-server/server/workflow/workstreamService.js)
- [server/workflow/workPlanService.js](/private/tmp/meetro-r4-2-release-server/server/workflow/workPlanService.js)
- [server/workflow/liveJobProjectionService.js](/private/tmp/meetro-r4-2-release-server/server/workflow/liveJobProjectionService.js)
- [server/finance/invoicePaymentService.js](/private/tmp/meetro-r4-2-release-server/server/finance/invoicePaymentService.js)
- [server/finance/invoicePayments.js](/private/tmp/meetro-r4-2-release-server/server/finance/invoicePayments.js)
- [server/finance/externalInvoiceCommunicationService.js](/private/tmp/meetro-r4-2-release-server/server/finance/externalInvoiceCommunicationService.js)
- [server/relationships/businessCustomerRelationshipService.js](/private/tmp/meetro-r4-2-release-server/server/relationships/businessCustomerRelationshipService.js)
- [migrations/202609120001_generalize_business_job_invoice_completion.sql](/private/tmp/meetro-r4-2-release-server/migrations/202609120001_generalize_business_job_invoice_completion.sql)
- [migrations/README.md](/private/tmp/meetro-r4-2-release-server/migrations/README.md)
- [test/externalCanonicalFinishPostgres.test.js](/private/tmp/meetro-r4-2-release-server/test/externalCanonicalFinishPostgres.test.js)
- [test/externalInvoiceCommunication.test.js](/private/tmp/meetro-r4-2-release-server/test/externalInvoiceCommunication.test.js)
- [test/invoicePaymentRoutes.test.js](/private/tmp/meetro-r4-2-release-server/test/invoicePaymentRoutes.test.js)
- [test/jobCompletionServicePostgres.test.js](/private/tmp/meetro-r4-2-release-server/test/jobCompletionServicePostgres.test.js)
- [test/helpers/externalLifecycleFixture.js](/private/tmp/meetro-r4-2-release-server/test/helpers/externalLifecycleFixture.js)
- [test/businessCustomerRelationshipActivity.test.js](/private/tmp/meetro-r4-2-release-server/test/businessCustomerRelationshipActivity.test.js)

Migration-inventory assertions were advanced to the additive 85-file inventory. Historical migration files and their certified checksums remain unchanged. These inventory-only test changes are listed in the complete inventory below. The older marketplace completion integration fixture was brought up to current migration counts, completed-Evaluation provenance, and governed Quote delivery before customer approval; its lifecycle assertions were retained.

4. **Authority model before/after.**

| Path | Authority now accepted | Request / marketplace relationship |
|---|---|---|
| Marketplace | Existing request, selection, relationship, participant and role checks | Required, as before |
| External business customer | Business-owned Job; exact contractor profile, Contact, active CUSTOMER role, durable customer relationship, matching Job customer-party record, real professional participant and active PRIMARY_PROFESSIONAL role | Both explicitly null |

External projections add `authority.kind = BUSINESS_CUSTOMER` with the exact contractor profile, Contact, and customer relationship IDs. Validators require this complete alternative shape; null marketplace IDs alone remain invalid. External Invoice authority must match its customer-party record. Existing marketplace response shapes remain unchanged.

5. **External operation without requestId.** The server resolves the legitimate `business_document` Job and durable customer relationship directly. It never supplies a substitute request ID. The additive Invoice migration retains the marketplace composite foreign key, adds a direct exact-Job foreign key and origin guard, and permits null marketplace fields only for the business-customer origin. New external Invoice scope rows also bind an exact immutable common Quote approval through a composite foreign key and an external-evidence guard.

6. **No fabricated marketplace authority.** PostgreSQL checks prove that the external Job retains null marketplace request/relationship IDs; only the real professional participant exists; no homeowner account, customer participant, customer decision, customer lifecycle grant, Conversation, or customer alert is created. The synthetic account count remains unchanged throughout completion, Invoice, email/reminder, payments, and repeat Job operations. Cross-Job approval reuse, mismatched customer relationships, a wrong owner, and an ended CUSTOMER role fail closed.

7. **Completion behavior.** External Workstream commands and Work Plan reads use legitimate business-owner authority. Completion review requires exact approved Work and canonical completed execution commands, with outstanding-work checks. Review/Confirm invokes the existing `completeJob` command with exact Job ID, expected version, and idempotency key; it appends canonical completion evidence. External live navigation now leads from completed Work to the existing completion review, then to Invoice preparation after canonical Job completion. No client status mutation or financial inference is used. Browser-runtime tests exercise the same confirmation component for both customer origins.

8. **Invoice behavior.** Completed external Jobs appear in the existing Invoice workspace. Approved scope comes from the common Quote approval registry, preserving authenticated marketplace approvals and exact external evidence. The database scenario verifies:

| Amount | Verified value |
|---|---:|
| Approved Quote / Invoice total | $680.00 |
| Deposit applied before Invoice | $510.00 |
| Balance due | $170.00 |
| Invoice payment rows at creation | 0 |

External Review/Confirm issues the same canonical Invoice with external transport provenance and no Meetro message. The canonical PDF, Invoice number, version, scope, and financial state are reused by preview, download, email, device share, and copy actions.

9. **Duplicate prevention.** One canonical Invoice per Job remains enforced by the unique Job constraint, transactional Job locking, and command idempotency. Exact-Job reads reopen the existing Invoice. A second creation attempt returns `INVOICE_ALREADY_EXISTS`; the existing Deposit-to-Invoice client destination resolver remains in place. Issuance, resend, email retry, and payment replay tests preserve their original owner identity.

10. **Deposit/payment provenance.** Applicable Deposit evidence binds to the effective approved Quote/version. Creating or issuing the Invoice does not fabricate an Invoice payment receipt. Real Invoice payments of $50 and $120 then produce paid/applied totals of $560 and $680, with balances of $120 and $0. Only those two actual Invoice payments enter the Invoice payment ledger. Customer history separately displays Deposit receipt evidence and Invoice payment evidence. Completion records remain independent and unchanged.

11. **Reminder and delivery parity.** Preview/Download and Device Share reuse the canonical server PDF. External Email PDF and Email reminder resolve the recipient from the authorized business Contact on the server; clients cannot supply recipient, provider, financial state, or Job authority fields. A separate version-bound communication record tracks REQUESTING, DELIVERY_REQUESTED, or FAILED, with idempotency and immutable attempt identity. Provider acceptance is reported as delivery requested, not confirmed inbox delivery. Tests inspect actual PDF bytes supplied as an attachment, verify replay and failure behavior, reject reminders for paid Invoices, and prove that reminders leave Invoice balances, payment evidence and completion evidence unchanged. External UI exposes no Send via Meetro button without a real Conversation. Email provider configuration remains an operational prerequisite for real email.

12. **Meetro-user non-regression and history.** Existing marketplace authority queries and customer-facing command boundaries remain in place. Real PostgreSQL integrations for marketplace Invoice/payment, Work completion, and Job completion/history pass. Both previously covered external execution modes also pass. Durable customer history now includes business-origin completed Jobs, exact approved Quotes, canonical Invoices, Deposits and payment receipts. A repeat Quote materializes another real Job under the same customer relationship without copying or changing the earlier history. Customer account linking does not cause this code to rewrite Job origin, approvals, or prior financial evidence.

13. **Exact test totals.**

| Verification | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Full client suite, all existing test files | 4,880 | 0 | 0 |
| Required five-file release regression subset | 185 | 0 | 0 |
| Full server suite | 2,380 | 0 | 70 |
| External canonical finish PostgreSQL integration | 19 | 0 | 0 |
| Existing external execution PostgreSQL integration | 3 | 0 | 0 |
| Marketplace Invoice/payment PostgreSQL integration | 1 | 0 | 0 |
| Marketplace Job completion/history PostgreSQL integration | 1 | 0 | 0 |
| Marketplace atomic Work completion PostgreSQL integration | 1 | 0 | 0 |

The 185 client checks are a subset, not additional unique tests. The general server command intentionally skips opt-in database tests without their database environment variables. The five relevant integration files were then run separately against fresh, guarded localhost databases: **25 database checks passed**. Other opt-in database suites were not activated. This exceeds the prior reported 4,871-client / 54-server baseline without claiming that skipped cases ran.

RED evidence captured the external completion 404, marketplace-bound Workstream rejection, strict client contract failures, and missing external email service before their fixes. The final client run used the same full test-file set with `--test-concurrency=4 --test-timeout=60000` after an earlier default-concurrency run stalled in the Vite Communication Center harness. A Quote/Ask runtime assertion now waits for the launcher transition instead of assuming it completes within 25ms. The passing full client log has no unhandled rejection, asynchronous-activity, or React act warnings.

14. **Build result.** `npm run build` PASS. Vite retains its pre-existing large-chunk warning; no build errors.

15. **Diff checks and isolation.** `git diff --check` PASS in both isolated repositories; additional whitespace checks cover new untracked source/migration files. Client HEAD remains `dbd3f1b53b63c5ed2654f4f7aa176536102ae684`; server HEAD remains `632ea25f978fd1d37e2586dd643c152b7ad861d9`. Protected working repositories were not edited. Migration 85 ran only in disposable localhost databases. No historical migration was edited.

16. **Remaining physical QA.** On an authorized staging installation, apply/replay the migration and run an actual External Customer through Review/Confirm completion, Invoice reopen, PDF preview/download, real mailbox attachment receipt, native Device Share on supported iPhone/iPad/desktop targets, partial/full payment, reminder failure/retry, customer history and a repeat Job. Also verify a real later customer-account link preserves prior history. Provider tests used an injected fake provider and actual PDF rendering; they did not send real email or certify inbox receipt/native OS behavior. This report certifies local implementation and automated behavior, not deployment or those physical checks.

17. **NO COMMIT / NO PUSH.** All changes remain reviewable and uncommitted in the established `/private/tmp` repositories. No production/main operation, reset, clean, stash, force push, audit fix, or customer communication was performed.

**Evidence logs**

- [meetro-external-finish-red.txt](/private/tmp/meetro-external-finish-red.txt)
- [meetro-external-client-red.txt](/private/tmp/meetro-external-client-red.txt)
- [meetro-external-email-red.txt](/private/tmp/meetro-external-email-red.txt)
- [meetro-external-client-cert-bounded.txt](/private/tmp/meetro-external-client-cert-bounded.txt)
- [meetro-external-core-cert.txt](/private/tmp/meetro-external-core-cert.txt)
- [meetro-external-server-cert.txt](/private/tmp/meetro-external-server-cert.txt)
- [meetro-external-finish-cert.txt](/private/tmp/meetro-external-finish-cert.txt)
- [meetro-external-original-cert.txt](/private/tmp/meetro-external-original-cert.txt)
- [meetro-marketplace-invoice-final.txt](/private/tmp/meetro-marketplace-invoice-final.txt)
- [meetro-marketplace-completion-final3.txt](/private/tmp/meetro-marketplace-completion-final3.txt)
- [meetro-marketplace-work-final.txt](/private/tmp/meetro-marketplace-work-final.txt)
- [meetro-external-build-cert.txt](/private/tmp/meetro-external-build-cert.txt)

**Complete current uncommitted inventory** (includes preserved earlier R4.2 changes)

**Client**

- [src/components/CanonicalInvoiceDetail.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/CanonicalInvoiceDetail.jsx)
- [src/components/CanonicalJobEvaluation.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/CanonicalJobEvaluation.jsx)
- [src/components/ContextualAskMeetro.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/ContextualAskMeetro.jsx)
- [src/components/DepositRequestWorkspace.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/DepositRequestWorkspace.jsx)
- [src/components/ProfessionalInvoiceWorkspace.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/ProfessionalInvoiceWorkspace.jsx)
- [src/components/ProfessionalWorkPlanWorkspace.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/ProfessionalWorkPlanWorkspace.jsx)
- [src/components/UnifiedBusinessDocumentWorkspace.css](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/UnifiedBusinessDocumentWorkspace.css)
- [src/components/UnifiedBusinessDocumentWorkspace.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/UnifiedBusinessDocumentWorkspace.jsx)
- [src/pages/CustomerInvoiceReviewRoute.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/pages/CustomerInvoiceReviewRoute.jsx)
- [src/pages/CustomerRelationshipsCenter.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/pages/CustomerRelationshipsCenter.jsx)
- [src/pages/MessagesInbox.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/pages/MessagesInbox.jsx)
- [src/pages/QuoteBuilder.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/pages/QuoteBuilder.jsx)
- [src/utils/askMeetro.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/askMeetro.js)
- [src/utils/businessCustomerRelationshipsApi.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/businessCustomerRelationshipsApi.js)
- [src/utils/invoicePaymentApi.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/invoicePaymentApi.js)
- [src/utils/invoiceShare.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/invoiceShare.js)
- [src/utils/jobCompletionApi.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/jobCompletionApi.js)
- [src/utils/quoteToInvoice.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/quoteToInvoice.js)
- [src/utils/workPlanApi.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/workPlanApi.js)
- [tests/askMeetroAuthority.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/askMeetroAuthority.test.js)
- [tests/askMeetroWorkspace.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/askMeetroWorkspace.test.js)
- [tests/contextualAskMeetroIntegration.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/contextualAskMeetroIntegration.test.js)
- [tests/contextualMicrophone.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/contextualMicrophone.test.js)
- [tests/depositRequestWorkspace.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/depositRequestWorkspace.test.js)
- [tests/invoicePaymentApi.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/invoicePaymentApi.test.js)
- [tests/invoicePaymentWorkspace.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/invoicePaymentWorkspace.test.js)
- [tests/invoiceShare.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/invoiceShare.test.js)
- [tests/ipadAppLayout.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/ipadAppLayout.test.js)
- [tests/jobCompletionApi.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/jobCompletionApi.test.js)
- [tests/jobCompletionUx.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/jobCompletionUx.test.js)
- [tests/quoteMobileCompact.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/quoteMobileCompact.test.js)
- [tests/quoteWorkingSession.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/quoteWorkingSession.test.js)
- [tests/unifiedBusinessDocumentWorkspace.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/unifiedBusinessDocumentWorkspace.test.js)
- [tests/unifiedInvoiceTabBootstrap.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/unifiedInvoiceTabBootstrap.test.js)
- [tests/workCenterLifecycleUxIntegration.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/workCenterLifecycleUxIntegration.test.js)
- [tests/workingQuoteCanonicalIssueWorkspace.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/workingQuoteCanonicalIssueWorkspace.test.js)
- [R4_2_RELEASE_CERTIFICATION.md](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/R4_2_RELEASE_CERTIFICATION.md)
- [src/components/InvoiceCompletionNotice.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/InvoiceCompletionNotice.jsx)
- [src/components/UniversalAskMeetroEntry.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/UniversalAskMeetroEntry.jsx)
- [src/utils/businessJobAuthority.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/businessJobAuthority.js)
- [src/utils/depositInstruction.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/depositInstruction.js)
- [src/utils/invoicePaymentProvenance.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/invoicePaymentProvenance.js)
- [tests/depositInstruction.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/depositInstruction.test.js)
- [tests/releaseBillingRuntime.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/releaseBillingRuntime.test.js)
- [tests/releaseCommunicationRuntime.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/releaseCommunicationRuntime.test.js)
- [tests/releaseInvoiceBoundaries.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/releaseInvoiceBoundaries.test.js)
**Server**

- [migrations/README.md](/private/tmp/meetro-r4-2-release-server/migrations/README.md)
- [server/finance/invoicePaymentService.js](/private/tmp/meetro-r4-2-release-server/server/finance/invoicePaymentService.js)
- [server/finance/invoicePayments.js](/private/tmp/meetro-r4-2-release-server/server/finance/invoicePayments.js)
- [server/relationships/businessCustomerRelationshipService.js](/private/tmp/meetro-r4-2-release-server/server/relationships/businessCustomerRelationshipService.js)
- [server/workflow/jobCompletionService.js](/private/tmp/meetro-r4-2-release-server/server/workflow/jobCompletionService.js)
- [server/workflow/jobFoundationService.js](/private/tmp/meetro-r4-2-release-server/server/workflow/jobFoundationService.js)
- [server/workflow/liveJobProjectionService.js](/private/tmp/meetro-r4-2-release-server/server/workflow/liveJobProjectionService.js)
- [server/workflow/workPlanService.js](/private/tmp/meetro-r4-2-release-server/server/workflow/workPlanService.js)
- [server/workflow/workstreamService.js](/private/tmp/meetro-r4-2-release-server/server/workflow/workstreamService.js)
- [test/approvedWorkExecutionAuthorityMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/approvedWorkExecutionAuthorityMigration.test.js)
- [test/approvedWorkVisitActivationMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/approvedWorkVisitActivationMigration.test.js)
- [test/askMeetroWorkflowMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/askMeetroWorkflowMigration.test.js)
- [test/businessContactMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/businessContactMigration.test.js)
- [test/businessCustomerRelationshipActivity.test.js](/private/tmp/meetro-r4-2-release-server/test/businessCustomerRelationshipActivity.test.js)
- [test/businessCustomerRelationshipMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/businessCustomerRelationshipMigration.test.js)
- [test/businessPortfolioAuthorityMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/businessPortfolioAuthorityMigration.test.js)
- [test/customerPartyMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/customerPartyMigration.test.js)
- [test/efrActivationMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/efrActivationMigration.test.js)
- [test/evaluationRemoteProvenanceMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/evaluationRemoteProvenanceMigration.test.js)
- [test/evaluationVisitActivationMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/evaluationVisitActivationMigration.test.js)
- [test/evaluationVisitAuthorityNegotiationMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/evaluationVisitAuthorityNegotiationMigration.test.js)
- [test/helpers/externalLifecycleFixture.js](/private/tmp/meetro-r4-2-release-server/test/helpers/externalLifecycleFixture.js)
- [test/invoicePaymentMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/invoicePaymentMigration.test.js)
- [test/invoicePaymentPostgres.test.js](/private/tmp/meetro-r4-2-release-server/test/invoicePaymentPostgres.test.js)
- [test/invoicePaymentRoutes.test.js](/private/tmp/meetro-r4-2-release-server/test/invoicePaymentRoutes.test.js)
- [test/jobCompletionMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/jobCompletionMigration.test.js)
- [test/jobCompletionServicePostgres.test.js](/private/tmp/meetro-r4-2-release-server/test/jobCompletionServicePostgres.test.js)
- [test/migrationInventoryGovernance.test.js](/private/tmp/meetro-r4-2-release-server/test/migrationInventoryGovernance.test.js)
- [test/ordinaryEvaluationFindingMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/ordinaryEvaluationFindingMigration.test.js)
- [test/preWorkDepositPaymentMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/preWorkDepositPaymentMigration.test.js)
- [test/quickQuoteAnalysisContinuationReviewMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/quickQuoteAnalysisContinuationReviewMigration.test.js)
- [test/quickQuotePhotoAssistReviewMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/quickQuotePhotoAssistReviewMigration.test.js)
- [test/quoteBusinessDocumentBridgeMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/quoteBusinessDocumentBridgeMigration.test.js)
- [test/quoteCompositionFeedbackMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/quoteCompositionFeedbackMigration.test.js)
- [test/quoteCustomerTermsMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/quoteCustomerTermsMigration.test.js)
- [test/quoteDeliveryMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/quoteDeliveryMigration.test.js)
- [test/quoteFoundationMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/quoteFoundationMigration.test.js)
- [test/recommendationFoundationMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/recommendationFoundationMigration.test.js)
- [test/visitFoundationMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/visitFoundationMigration.test.js)
- [test/visitStartAuthorityMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/visitStartAuthorityMigration.test.js)
- [test/workPlanActivationMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/workPlanActivationMigration.test.js)
- [test/workPreparationAuthorityMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/workPreparationAuthorityMigration.test.js)
- [test/workstreamFoundationMigration.test.js](/private/tmp/meetro-r4-2-release-server/test/workstreamFoundationMigration.test.js)
- [migrations/202609120001_generalize_business_job_invoice_completion.sql](/private/tmp/meetro-r4-2-release-server/migrations/202609120001_generalize_business_job_invoice_completion.sql)
- [server/finance/canonicalInvoicePdf.js](/private/tmp/meetro-r4-2-release-server/server/finance/canonicalInvoicePdf.js)
- [server/finance/externalInvoiceCommunicationService.js](/private/tmp/meetro-r4-2-release-server/server/finance/externalInvoiceCommunicationService.js)
- [server/relationships/businessJobAuthority.js](/private/tmp/meetro-r4-2-release-server/server/relationships/businessJobAuthority.js)
- [test/canonicalInvoicePdf.test.js](/private/tmp/meetro-r4-2-release-server/test/canonicalInvoicePdf.test.js)
- [test/externalCanonicalFinishPostgres.test.js](/private/tmp/meetro-r4-2-release-server/test/externalCanonicalFinishPostgres.test.js)
- [test/externalInvoiceCommunication.test.js](/private/tmp/meetro-r4-2-release-server/test/externalInvoiceCommunication.test.js)
- [test/invoiceDeliveryBoundary.test.js](/private/tmp/meetro-r4-2-release-server/test/invoiceDeliveryBoundary.test.js)
