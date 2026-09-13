# R5.2 Language and navigation recovery certification

Work performed only in `/private/tmp/meetro-universal-deposit-r4-2d-client-fc3b4d5`. The original repository was not modified. The user confirmed R5.1 physical QA passed; this task preserves that implementation.

## Existing owners and recovered entry points

- **Job History:** `ProfessionalJobHistoryWorkspace` inside `ContractorDashboard`, existing application page `contractorDashboard` / alias `workCenter`, presentation tab `jobHistory`. Existing `openWorkCenterJobsPage("history")` performs the navigation. The history owner still receives `professionalJobHistorySource`, loaded by `fetchProfessionalJobHistory` from `GET /professional/jobs/history`; detail reads remain under `GET /professional/jobs/:jobId/history`.
- **Revenue:** the existing `revenue` tab of `ContractorDashboard` renders **ProfessionalInvoiceWorkspace**, titled Invoices & Payments. Its summary/records continue to come from `fetchProfessionalInvoiceWorkspace`, `GET /professional/invoices/workspace?limit=50`. Individual Invoice reads and all explicit payment actions remain with that same component and API. This task does not rename, duplicate, or replace the workspace.
- **Work Center:** Search's existing toggle now reads **Filter & Views**, with accessible name **Filter and views**. The existing native select has two optgroups: **Job stage** (All Active Jobs plus the seven existing stages) and **Work Center Views** (Job History and Revenue). Choosing a stage retains the existing filter setter and predicate. Choosing History calls the existing history opener; Revenue calls `openWorkTab("revenue")`. View choices close the toggle and do not become lifecycle stages or overwrite the stage filter.
- **Business Dashboard:** a Revenue `GlanceItem` in the existing At a Glance area shows **Revenue**, **View Revenue**, and **View revenue and payment activity**. It calls the existing `openWorkCenterSection("revenue")`. That helper writes the existing presentation-tab keys and navigates to `contractorDashboard`, resolving to exactly the same Revenue owner. Those navigation keys are not financial/workflow truth.
- No existing trusted dashboard-safe revenue amount was present. **No dollar amount is shown**, no financial source was added, and no Quote value, unpaid Invoice, deposit obligation, local amount, or Active Job card is summed for this entry.
- No existing filter/sliders semantic icon was found. The control uses its clear text label instead of the previous settings glyph; no icon/menu framework was added. It remains at least 48px high and wraps only at natural word boundaries.

## Language decisions

The changed presentation strings use the existing language registry/helpers with EN, ES, FR, and PT-BR coverage. New labels are registered through `workCenterPresentationLanguage`; the label adapter only receives system labels. It never receives customer names, job/service descriptions, concerns, Quote content, or other authored text.

- Professional actor code `PROFESSIONAL` displays **You** on the professional Work Center; `CUSTOMER` displays **Customer**. A label reading “Professional” without that code is insufficient to claim “You”; unknown responsibility retains its supplied label or Unavailable.
- **Awaiting Response is retained.** The existing predicate proves an open opportunity with a submitted professional response, pending relationship, and unavailable submission. These fields do not explicitly certify the next waiting party. No predicate/count/routing change was made merely to support a stronger label.
- The ready-for-completion message describes finished work awaiting explicit Job completion. No client state, completion command, Invoice gate, or history rule changed.
- The normal app-authored Work Center copy audited here no longer exposes **canonical**, **Current lifecycle stage**, **canonical Job completion**, or **closeout**. Lifecycle CSS classes, data attributes, code symbols, tests, and diagnostics remain technical. User-authored content is not censored or translated.
- Normal headings now use **Job progress**, **Job stage**, **Filter by stage**, and **Next up**. The seven internal stages remain Evaluation, Quote, Deposit, Schedule, Work Plan, Complete Job, Invoice, in their original order. Their visible labels are localized.
- Deposit errors explain the missing approved Quote/deposit; no permission, validation, or delivery behavior was loosened. Invoice wording uses payment records rather than payment evidence while retaining the distinction between earlier applied payments and Invoice payments. Materials/preparation text explains the required action rather than the internal model. Completion confirmation and success copy omit “operational Job.”

## Complete changed/localized English copy inventory

The following table includes new wording and existing English wording newly connected to localization. Each registry entry has ES, FR, and PT-BR equivalents.

| Registry key | English presentation |
| --- | --- |
| wc52quoteReference | This quote preview is read-only. Open the Quote to make changes. |
| wc52priorPayments | Payments applied before Invoice |
| wc52priorPaymentsHelp | Includes earlier deposit and payment records, separate from the Invoice payments below. |
| wc52subtitle | Manage new opportunities and keep active jobs moving. |
| wc52filterViews | Filter & Views |
| wc52filterAccessible | Filter and views |
| wc52filterStage | Filter by stage |
| wc52jobStage | Job stage |
| wc52views | Work Center Views |
| wc52all | All Active Jobs |
| wc52history | Job History |
| wc52revenue | Revenue |
| wc52revenueHelp | View revenue and payment activity |
| wc52viewRevenue | View Revenue |
| wc52activeJobs | Active Jobs |
| wc52search | Search active jobs |
| wc52searchPlaceholder | Search customers or jobs… |
| wc52noMatch | No jobs match this view |
| wc52noMatchHelp | Try another search or choose a different stage. |
| wc52opportunities | Opportunities |
| wc52opportunitiesHelp | Review and respond to customer requests. |
| wc52viewOpportunities | View Opportunities |
| wc52new | New |
| wc52awaiting | Awaiting Response |
| wc52scheduled | Scheduled |
| wc52notScheduled | Not scheduled |
| wc52location | Customer location |
| wc52nextStep | Next step |
| wc52nextUp | Next up |
| wc52you | You |
| wc52customer | Customer |
| wc52unavailable | Unavailable |
| wc52progress | Job progress |
| wc52progressCount | {count} of 7 completed |
| wc52approvedSchedule | Approved — ready to schedule |
| wc52scheduleJob | Schedule this job |
| wc52readyComplete | Work finished — ready to complete the job |
| wc52invoiceGate | Complete this job first. Then you can prepare the final invoice. |
| wc52quoteGate | Complete Evaluation before preparing a Quote. |
| wc52depositSummary | Review the deposit required for the approved Quote. |
| wc52depositGate | The deposit becomes available after Quote approval. |
| wc52scheduleGate | Resolve the deposit requirement before scheduling. |
| wc52workPlanGate | Confirm the schedule before preparing the Work Plan. |
| wc52completeSummary | Review the work, then choose Complete Job. |
| wc52jobComplete | This job is complete. |
| wc52completeGate | Finish the Work Plan before completing this job. |
| wc52depositUnavailable | Deposit details are not available yet. |
| wc52depositCustomerCreated | Customer created. Approve a Quote with a deposit before sending this request. |
| wc52depositSendLocked | To send this request, first approve a Quote with an unpaid deposit. |
| wc52depositPdfLocked | To create a PDF, first approve a Quote with an unpaid deposit. |
| wc52quoteAccess | You cannot view Quotes with this account. |
| wc52visitChange | Customer proposed a new time. Approve it or suggest a change. |
| wc52evaluationSaved | Evaluation saved. |
| wc52evaluationComplete | Evaluation completed. |
| wc52evaluationNotice | Evaluation saved. Quote and authorization are not available here yet. |
| wc52evaluation | Evaluation |
| wc52quote | Quote |
| wc52deposit | Deposit |
| wc52schedule | Schedule |
| wc52workPlan | Work Plan |
| wc52completeJob | Complete Job |
| wc52invoice | Invoice |
| Invoice.summary | Create invoices and track payments for each job. |
| Invoice.loading | Loading invoice details... |
| Preparation.emptyBody | Create a plan from the approved Quote. Nothing is created until you choose Create plan. |
| Preparation.depositLocked | Resolve the required deposit before recording purchases or preparation. |
| Preparation.depositOpen | You can record purchases and preparation. |
| Preparation.refreshed | Details refreshed. |
| Completion.confirmBody | This marks the job complete. You can prepare the invoice next. |
| Completion.completedBody | This job is complete. Its details are saved in Job History. |

## Production files changed — 15

- `src/components/CanonicalInvoiceDetail.jsx`
- `src/components/CanonicalJobVisits.jsx`
- `src/components/CanonicalQuotesPanel.jsx`
- `src/components/CompactCurrentJobHeader.jsx`
- `src/components/DepositRequestWorkspace.jsx`
- `src/components/WorkCenterLifecycle.jsx`
- `src/index.css`
- `src/pages/BusinessDashboard.jsx`
- `src/pages/ContractorDashboard.jsx`
- `src/utils/invoicePaymentLanguage.js`
- `src/utils/jobCompletionLanguage.js`
- `src/utils/language.js`
- `src/utils/workCenterPresentation.js`
- `src/utils/workCenterPresentationLanguage.js`
- `src/utils/workPreparationLanguage.js`

## Test files changed — 15

- `tests/browser/workCenterPhysicalLayout.mjs`
- `tests/buttonTruth.test.js`
- `tests/depositRequestWorkspace.test.js`
- `tests/helpers/workCenterPolishFixture.js`
- `tests/homeDashboardRedesign.test.js`
- `tests/meetroDepositRequestFlow.test.js`
- `tests/workCenterLanguageViews.test.js`
- `tests/workCenterLifecycleUxIntegration.test.js`
- `tests/workCenterPersistentContext.test.js`
- `tests/workCenterR5LifecyclePresentation.test.js`
- `tests/workCenterResponsiveCapability.test.js`
- `tests/workCenterResponsivePolish.test.js`
- `tests/workCenterVisualFidelity.test.js`
- `tests/workCenterWonderPass.test.js`
- `tests/workPreparationWorkspace.test.js`

`workCenterLanguageViews.test.js` adds nine behavioral/render/registry tests: complete localization, actor-code safety, system-label boundaries, stage/view grouping, existing navigation handlers, a dashboard Revenue entry without an amount, search/toggle handlers, unchanged search/stage intersection, and rendered plain-language/stage-gate preservation. Existing tests were adjusted for localized presentation without removing their authority assertions. The mounted Business Dashboard test now clicks Revenue and verifies the existing tab/page destination and GET-only reads.

## Validation

- Focused: **393/393 passed**, no failures/skips.
- Full `npm test`: **4921/4921 passed**, no failures/skips (4912 baseline + nine tests).
- `npm run build:staging`: **passed**, with the existing large-chunk advisory.
- `git diff --check`: **passed**.
- Browser matrix: **375, 393, 430, 768, 820, 834, 1024, 1180px**, in **EN, ES, FR, PT-BR**, in **Chrome and WebKit**: **64 viewport/language/engine cases passed**.
- Browser checks retain the actual existing sidebar width contract, query-container ancestry, 4+3 labels, safe-area opening, 62px Ask dock, 6px clearance, stable card geometry through touch/pressed states and five scroll offsets. They verify the Filter & Views touch target and select containment, intact CTA/stage/control words, and no overflow with the pre-existing global overflow mask temporarily removed.
- Production-derived layout fixtures include the real toolbar/menu JSX, label registry, page/sidebar styles, Revenue entry markup, and fonts. Navigation text in the shell is simplified; safe-area values are simulated. They are not a claim of native-device physical QA or a complete authenticated browser session. The native select uses the platform's standard option presentation.

Focused command:

```sh
node --test tests/workCenter*.test.js tests/homeDashboardRedesign.test.js tests/buttonTruth.test.js tests/depositRequestWorkspace.test.js tests/meetroDepositRequestFlow.test.js tests/workPreparationWorkspace.test.js tests/jobCompletion*.test.js tests/invoicePayment*.test.js tests/companionAccountTypeBehavior.test.js tests/ipadAppLayout.test.js
```

Logs: `/tmp/meetro-r52-focused.log`, `/tmp/meetro-r52-full.log`, `/tmp/meetro-r52-build.log`.
Browser evidence: `/tmp/meetro-r52-layout-en/`, `/tmp/meetro-r52-layout-es/`, `/tmp/meetro-r52-layout-fr/`, `/tmp/meetro-r52-layout-pt-BR/`.
The reusable browser script accepts `PLAYWRIGHT_MODULE`, `BROWSER_ENGINE`, optional `BROWSER_EXECUTABLE`, `R52_LANGUAGE`, and `R51_OUTPUT_DIR`.

## Preservation

Byte comparisons against the R5.1 snapshot confirm the opportunity predicates, seven-stage resolver, current-job read/identity helper, canonical live-job parser, Job completion API, Invoice/payment API, and payment provenance/calculations were not changed. Job History and Revenue owning components and their data sources are unchanged. No new history/revenue model, store, page, aggregator, or server implementation was introduced. The only R5.1 CSS delta is the Filter & Views button's size/text wrapping; sidebar, dock, top-spacing, hover, and card rules are unchanged.

**No server changes. No commit, push, deployment, reset, clean, or stash.** No new native build was installed. R5.2 physical QA can now check the wording and recovered navigation on the devices.
