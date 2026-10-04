**Meetro R4.2 release certification — incomplete; do not release yet**

Date: September 12, 2026. All changes remain uncommitted. No push, staging deployment, production change, or real customer communication occurred.

The implemented Invoice/Communication/Ask fixes pass automated gates. **The full requested release is not certified:** the existing canonical Invoice schema and completion-review contract still require marketplace authority. An external business-origin Job cannot yet complete the canonical Invoice/payment lifecycle. Passing external UI fixtures is not evidence of that missing end-to-end capability.

1. **Exact client HEAD:** `dbd3f1b53b63c5ed2654f4f7aa176536102ae684`. Worktree: `/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5`. Before edits, HEAD and the nine specified modified files matched; the baseline was 185/185 tests, successful build, and clean diff check. The inherited uncommitted work was preserved.

2. **Exact server HEAD:** `632ea25f978fd1d37e2586dd643c152b7ad861d9`, in the isolated staging clone `/private/tmp/meetro-r4-2-release-server`, cloned from `https://github.com/meetroapp/metro-server.git`. Before cloning, the protected server's locally recorded `origin/staging` was `574f3f99e9290ca4f959ffc26e13d771e503400d` and its checkout HEAD was `377a3b852df8b2bee8459d87abdc334fd6727be1`. The fresh remote clone resolved to the newer SHA above. The protected client/server source checkouts and outer wrapper were not edited. No new migration was authored; existing migrations ran only in disposable localhost test databases.

3. **Modified files:** complete inventories appear below. The initial nine files are distinguished from files changed for this task. This report is an additional new file.

4. **Root causes:** Deposit continuation prepared a working Invoice without first checking the Job's canonical Invoice. Billing used draft-only `canIssue` to expose customer delivery, so an issued Invoice lost its Meetro action. Its PDF helper rebuilt a local document, and email used a mailto draft without making manual attachment clear. Payment history examined only Invoice payment events while the summary included pre-Invoice applied funds. Reminders were hidden without a conversation. Billing maintained a separate Ask shell. Two runtime presentation defects are described in items 8 and 13.

5. **Architecture:** Work Center retains Job operations. `resolveDepositInvoiceDestination()` performs an exact read from the Deposit continuation after Quote/deposit hydration. An existing Invoice must match Job and approved line-source identity; unavailable/ambiguous reads fail closed, with only canonical not-found allowing preparation. `switchDocument()` remains pure. `ProfessionalInvoiceWorkspace` owns canonical Invoice review/payment/delivery. The existing Invoice issue service now supports resend without another financial version or issuance. The shared server PDF renderer consumes an authorized canonical Invoice projection; no business-document copy is saved.

6. **Meetro-customer behavior preserved:** the Request → Response → Conversation → Evaluation → Quote approval → Deposit → Schedule → Work → Completion flow remains. Invoice preparation and PDF access do not complete the Job. The visible delivery action reads `fetchJobCompletionReview()` before Review, rechecks before sending, and the server verifies completion evidence. No Invoice action calls `completeCanonicalJob()`. No Invoice approval/acceptance lifecycle was added.

7. **External parity:** UI transport parity is improved, and the pre-Invoice external lifecycle was verified with the existing PostgreSQL suite. **Full external Invoice/payment parity remains unfinished.** See the capability audit and concrete contract gaps below; it would be incorrect to describe External Customer V1 as 100% business-complete.

8. **Communication Center crash:** `splitInboxHistoryButton` spread `savedHistorySecondaryButton` before the latter's module-level initialization. Runtime import threw `ReferenceError: Cannot access 'savedHistorySecondaryButton' before initialization`. Moving that declaration ahead of its use fixes loading without changing routing. The same ordering existed in the locally recorded `origin/staging` file; the live deployed staging bundle was not inspected. Runtime tests cover normal entry, a valid canonical conversation/Invoice route, exact customer Invoice rendering, missing/malformed Invoice routes, and conversation mismatch. Customer reads now verify both Job and conversation against the fetched Invoice.

9. **PDF behavior:** canonical business/customer views use authenticated `/professional/invoices/:invoiceId/customer-pdf` and `/customer/invoices/:invoiceId/customer-pdf`. Business reads bind the displayed version; customer PDFs use the actual internal canonical version without exposing command authority. The same server renderer supplies Preview, Download, and Device Share. Non-PDF responses are rejected, including text with a PDF MIME type. Existing saved-business-document governed email attachment transport is unchanged. Canonical Billing uses the honest **Download PDF + Open Email Draft** fallback: the user must add the downloaded attachment; Meetro does not claim external delivery. The client and isolated server changes must be reviewed/deployed together for the new canonical PDF endpoints.

10. **Send via Meetro:** visible for an exact canonical conversation, including already-issued/partially paid Invoices. Explicit Review and confirmation use the existing issue API with an idempotency key. A resend creates another governed `INVOICE_SHARED` message referencing the same Invoice; it preserves Invoice version, amounts, original issuance time, and the existing conversation. The customer card reaches the authorized Invoice/PDF. The real PostgreSQL test proves one Invoice, one issuance, zero fabricated Invoice payments, and one unchanged completion record after resend.

11. **Reminders:** Meetro reminders retain their existing governed API and retry identity. Without a conversation, the UI offers editable reminder text, Copy, email draft, and device share where available. These external actions make no financial or delivery-record mutation. Runtime tests verify unchanged paid/balance values and zero payment/send calls. End-to-end external Invoice reminders still depend on resolving the canonical external Invoice gap.

12. **Payment provenance:** `CanonicalInvoiceDetail` separates Invoice payment events from the canonical paid amount applied before the Invoice. The label is deliberately “Payments applied before Invoice,” with an explanation that this includes prior deposit/payment evidence; no Deposit ledger event is relabeled as an Invoice payment. With 51,000 minor units paid and no Invoice payment events, the UI shows the applied amount instead of “No Payments recorded yet.” Later Invoice payments remain separately listed. Summary balances remain canonical.

13. **Universal Ask:** Billing's Invoice-specific intelligence/review panel and handlers were removed. Billing supplies exact Invoice/Job/conversation context. Remaining `ContextualAskMeetro` entry points delegate to `UniversalAskMeetroEntry`, opening the existing `AskMeetroHost`; there is no local assistant composer. Existing owner media/proposal content is retained. “Send this Invoice” routes to the actual owner rather than adding an Ask sender. The real inline working-document owner remains in use. A further defect found during testing was that the hosted Invoice checked completion but omitted the alert; the same dialog element now renders in both hosted and direct views. Tests cover no-Job blocking and completed-Job governed email from the hosted owner. Named-person retrieval and physical voice behavior still need live QA.

14. **Exact automated results:**

| Gate | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| Full client `npm test` | 4,871 | 0 | 0 |
| Required five-file regression command, separately rerun | 185 | 0 | 0 |
| Focused server Invoice/PDF/delivery/reminder/approval tests | 50 | 0 | 0 |
| Disposable PostgreSQL Invoice integration test | 1 | 0 | 0 |
| Disposable PostgreSQL external execution suite, including its two scenarios | 3 | 0 | 0 |

The 185 tests are a subset of the full client suite. The client log contains no unhandled rejection, asynchronous-activity, or React act warnings. Red tests preceded changes; stale source-extraction/wording/harness assertions were updated to follow the actual owner instead of changing product behavior to satisfy them. The PostgreSQL Invoice fixture was updated to reference the existing canonical Quote approval required by current migrations. Test databases were local only; the temporary PostgreSQL instance was stopped after verification.

15. **Build:** `npm run build` passed. Existing >500 KB bundle warnings remain; the main App chunk decreased from the baseline 2,218.45 KB to 2,216.55 KB. No new bundle-size failure was introduced.

16. **Diff checks:** `git diff --check` passed in both isolated worktrees. No commits or pushes were made.

17. **Remaining physical/live QA:** Antony's actual staging Invoice/conversation must be checked after coordinated deployment; no live customer record was changed. Verify real PDF appearance and device download/share/email attachment on iPhone, iPad portrait/landscape, and web; Deposit independent scrolling and keyboard layout; customer receipt/reopening in Communication Center; actual partial payments and reminders with approved test accounts; Universal Ask named-record retrieval and voice → editable composer → manual Send; and the complete external lifecycle after its financial contracts are implemented. The automated fixtures are synthetic and are not certification of Antony's live data.

18. **Deferred work:** external canonical Invoice/completion/payment authority is a release blocker, not polish. A governed canonical Invoice email-attachment endpoint would replace the explicit manual-attachment fallback. New short UI strings need the existing locale dictionaries, and obsolete unreachable feature-specific assistant helper code can be removed in a later cleanup. No navigation redesign, production migration, account-link rewrite, or speculative financial schema change was performed.

**External-customer capability audit**

“Existing” means found in the current code and covered by the indicated automated workflows; it does not imply physical end-to-end launch certification.

| # | Capability | Audit result |
| --- | --- | --- |
| 1 | Create/find External Customer | Existing durable business contact and customer relationship controls. |
| 2 | Avoid duplicate customer records | Existing duplicate candidates, explicit selection, and relationship retry behavior. |
| 3 | New Job for existing customer | Existing new Quote with saved customer; business-document issuance creates its real Job. Dedicated relationship-page New Job action was not verified. |
| 4 | No marketplace Request for repeat project | Existing business-document Job origin; external PostgreSQL test retains null marketplace relationship. |
| 5 | Quote | Existing saved Quote owner. |
| 6 | Quote revision | Existing governed revision/approval authority; no replacement lifecycle introduced. |
| 7 | Issue Quote externally | Existing saved-document delivery/email and external approval contract. |
| 8 | Record external approval evidence | Verified in external PostgreSQL fixture. |
| 9 | Canonical Deposit requirement | Existing common Quote-approval source. |
| 10 | Create/send Deposit Request | Existing saved document and email transport; physical external delivery still unverified. |
| 11 | Deposit payment evidence | Verified through the external fixture's payment command. |
| 12 | Partial Deposit | Existing canonical API/client regression coverage. |
| 13 | Deposit satisfaction | Verified before external work activation. |
| 14 | Schedule work | Verified via approved-work visit and external confirmation. |
| 15 | Work activity | Verified via common preparation/execution authority. |
| 16 | Photos/documentation | Existing source-backed customer media/activity controls; physical photo lifecycle unverified. |
| 17 | Complete work/Job | External execution completion verified; legacy Job completion-review interoperability remains a blocker for final Invoice delivery. |
| 18 | Final Invoice preparation | Working document preparation exists; canonical Invoice creation for external Jobs is blocked by marketplace schema/queries. |
| 19 | Final Invoice delivery | Saved-document email/share exists; final external canonical Invoice path not complete. |
| 20 | Partial/full Invoice payments | Canonical ledger supports partial payments for supported Invoices; external canonical Invoice is unavailable. |
| 21 | Payment reminders | External UI Copy/email/share now exists; end-to-end external Invoice prerequisite is missing. |
| 22 | Paid/outstanding | Canonical display is preserved; external ledger lifecycle remains blocked. |
| 23 | Customer/Job history | Existing durable relationship activity/history; complete financial-history parity not certified. |
| 24 | Repeat Jobs | Existing customer can be reused in a new Quote without marketplace fabrication; full repeat-job financial workflow not certified. |
| 25 | Later account-link event | No history rewriting introduced; full later-account-link scenario not exercised or certified. |

**Concrete contracts that still need implementation**

- `canonical_invoices` still requires non-null marketplace `job_request_id` and `relationship_id`, with a composite FK to the marketplace Job shape. Its reads/creation also join `posts`, request relationships, and both marketplace participants. External Jobs correctly have a business-owned origin and must not be made to satisfy those joins with fake records.
- The common external execution path can complete real work, but the legacy completion-review service/client projection still assumes positive marketplace request/relationship IDs. Final delivery must recognize the common completed-work authority through the owning service without manufacturing marketplace completion.
- Canonical external issuance/payment reads and history need the same business contact/active CUSTOMER relationship authority, append-only payment evidence, idempotency, and origin validation. A reviewed additive contract/migration and external PostgreSQL lifecycle tests are needed before those endpoints can be certified.

Evidence: [Invoice schema](/private/tmp/meetro-r4-2-release-server/migrations/202608150004_create_canonical_invoice_payment_foundation.sql), [Invoice authority service](/private/tmp/meetro-r4-2-release-server/server/finance/invoicePaymentService.js), [business-origin Job foundation](/private/tmp/meetro-r4-2-release-server/server/workflow/jobFoundationService.js), [completion review](/private/tmp/meetro-r4-2-release-server/server/workflow/jobCompletionService.js), [client completion contract](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/jobCompletionApi.js), [external execution integration](/private/tmp/meetro-r4-2-release-server/test/externalApprovedWorkExecutionPostgres.test.js).

**Client modified-file inventory**

| File | Origin |
| --- | --- |
| [src/components/CanonicalInvoiceDetail.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/CanonicalInvoiceDetail.jsx) | This task |
| [src/components/CanonicalJobEvaluation.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/CanonicalJobEvaluation.jsx) | This task |
| [src/components/ContextualAskMeetro.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/ContextualAskMeetro.jsx) | This task |
| [src/components/DepositRequestWorkspace.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/DepositRequestWorkspace.jsx) | Inherited certified edits preserved; also reviewed/extended here |
| [src/components/ProfessionalInvoiceWorkspace.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/ProfessionalInvoiceWorkspace.jsx) | This task |
| [src/components/UnifiedBusinessDocumentWorkspace.css](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/UnifiedBusinessDocumentWorkspace.css) | Inherited certified edits preserved; also reviewed/extended here |
| [src/components/UnifiedBusinessDocumentWorkspace.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/UnifiedBusinessDocumentWorkspace.jsx) | Inherited certified edits preserved; also reviewed/extended here |
| [src/pages/CustomerInvoiceReviewRoute.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/pages/CustomerInvoiceReviewRoute.jsx) | This task |
| [src/pages/MessagesInbox.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/pages/MessagesInbox.jsx) | This task |
| [src/pages/QuoteBuilder.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/pages/QuoteBuilder.jsx) | Inherited certified edits preserved; also reviewed/extended here |
| [src/utils/askMeetro.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/askMeetro.js) | This task |
| [src/utils/invoicePaymentApi.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/invoicePaymentApi.js) | This task |
| [src/utils/invoiceShare.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/invoiceShare.js) | This task |
| [src/utils/quoteToInvoice.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/quoteToInvoice.js) | Inherited certified edits preserved; also reviewed/extended here |
| [tests/askMeetroAuthority.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/askMeetroAuthority.test.js) | This task |
| [tests/askMeetroWorkspace.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/askMeetroWorkspace.test.js) | This task |
| [tests/contextualAskMeetroIntegration.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/contextualAskMeetroIntegration.test.js) | This task |
| [tests/contextualMicrophone.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/contextualMicrophone.test.js) | This task |
| [tests/depositRequestWorkspace.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/depositRequestWorkspace.test.js) | Inherited certified edits preserved; also reviewed/extended here |
| [tests/invoicePaymentWorkspace.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/invoicePaymentWorkspace.test.js) | This task |
| [tests/invoiceShare.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/invoiceShare.test.js) | This task |
| [tests/ipadAppLayout.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/ipadAppLayout.test.js) | Inherited certified edits preserved; also reviewed/extended here |
| [tests/quoteMobileCompact.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/quoteMobileCompact.test.js) | This task |
| [tests/quoteWorkingSession.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/quoteWorkingSession.test.js) | This task |
| [tests/unifiedBusinessDocumentWorkspace.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/unifiedBusinessDocumentWorkspace.test.js) | Inherited certified edits preserved; also reviewed/extended here |
| [tests/unifiedInvoiceTabBootstrap.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/unifiedInvoiceTabBootstrap.test.js) | Inherited certified edits preserved; also reviewed/extended here |
| [tests/workCenterLifecycleUxIntegration.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/workCenterLifecycleUxIntegration.test.js) | This task |
| [tests/workingQuoteCanonicalIssueWorkspace.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/workingQuoteCanonicalIssueWorkspace.test.js) | This task |
| [src/components/InvoiceCompletionNotice.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/InvoiceCompletionNotice.jsx) | This task |
| [src/components/UniversalAskMeetroEntry.jsx](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/components/UniversalAskMeetroEntry.jsx) | This task |
| [src/utils/depositInstruction.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/depositInstruction.js) | This task |
| [src/utils/invoicePaymentProvenance.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/src/utils/invoicePaymentProvenance.js) | This task |
| [tests/depositInstruction.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/depositInstruction.test.js) | This task |
| [tests/releaseBillingRuntime.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/releaseBillingRuntime.test.js) | This task |
| [tests/releaseCommunicationRuntime.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/releaseCommunicationRuntime.test.js) | This task |
| [tests/releaseInvoiceBoundaries.test.js](/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5/tests/releaseInvoiceBoundaries.test.js) | This task |

**Server modified-file inventory**

| File | Origin |
| --- | --- |
| [server/finance/invoicePaymentService.js](/private/tmp/meetro-r4-2-release-server/server/finance/invoicePaymentService.js) | This task |
| [server/finance/invoicePayments.js](/private/tmp/meetro-r4-2-release-server/server/finance/invoicePayments.js) | This task |
| [test/invoicePaymentPostgres.test.js](/private/tmp/meetro-r4-2-release-server/test/invoicePaymentPostgres.test.js) | This task |
| [test/invoicePaymentRoutes.test.js](/private/tmp/meetro-r4-2-release-server/test/invoicePaymentRoutes.test.js) | This task |
| [server/finance/canonicalInvoicePdf.js](/private/tmp/meetro-r4-2-release-server/server/finance/canonicalInvoicePdf.js) | This task |
| [test/canonicalInvoicePdf.test.js](/private/tmp/meetro-r4-2-release-server/test/canonicalInvoicePdf.test.js) | This task |
| [test/invoiceDeliveryBoundary.test.js](/private/tmp/meetro-r4-2-release-server/test/invoiceDeliveryBoundary.test.js) | This task |

**Verification logs**

[Full client tests](/private/tmp/meetro-r42-client-final-tests.txt), [required 185-test gate](/private/tmp/meetro-r42-core-final-tests.txt), [production build](/private/tmp/meetro-r42-build-final.txt), [focused server tests](/private/tmp/meetro-r42-server-related.txt), [Invoice PostgreSQL integration](/private/tmp/meetro-postgres-tests.txt), [external execution PostgreSQL integration](/private/tmp/meetro-external-postgres.txt).
