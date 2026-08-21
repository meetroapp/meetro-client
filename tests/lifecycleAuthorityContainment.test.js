import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { t, translations } from "../src/utils/language.js";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const jobUpdate = read("src/pages/JobUpdate.jsx");
const changeOrder = read("src/pages/ChangeOrderRequest.jsx");
const quoteBuilder = read("src/pages/QuoteBuilder.jsx");
const invoiceBuilder = read("src/pages/InvoiceBuilder.jsx");
const documentWorkspace = read("src/components/UnifiedBusinessDocumentWorkspace.jsx");
const completionSheet = read("src/pages/CompletionSheet.jsx");
const completedJobDetails = read("src/pages/CompletedJobDetails.jsx");
const contractorDashboard = read("src/pages/ContractorDashboard.jsx");

const unavailableSurfaces = [
  jobUpdate,
  changeOrder,
  completionSheet,
  completedJobDetails,
];

test("Job Update preserves navigation without delivery or completion authority", () => {
  assert.match(jobUpdate, /jobUpdateUnavailableTitle/);
  assert.match(jobUpdate, /setPage\(returnPage\)/);
  assert.doesNotMatch(jobUpdate, /saveUpdate|jobUpdates|lastJobUpdate|meetroJobUpdated/);
  assert.doesNotMatch(jobUpdate, /Send Update|customer will receive|Work completed/i);
});

test("Change Order preserves request context without submission or message authority", () => {
  assert.match(changeOrder, /selectedChangeOrderRequest/);
  assert.match(changeOrder, /changeOrderUnavailableTitle/);
  assert.match(changeOrder, /returnToRequest/);
  assert.doesNotMatch(
    changeOrder,
    /submitChangeOrder|updateRequestById|appendTimelineEvent|addNotification|saveJobRecord|workflow_change_request/
  );
  assert.doesNotMatch(changeOrder, /Send Change Request|pending_professional_review/);
});

test("governed Quote and Invoice delivery cannot issue, accept, pay, complete, or close", () => {
  assert.match(quoteBuilder, /calculateCustomerTotal/);
  assert.match(quoteBuilder, /<UnifiedBusinessDocumentWorkspace/);
  assert.match(invoiceBuilder, /<QuoteBuilder setPage=\{setPage\} initialDocument="invoice"/);
  assert.match(documentWorkspace, /Save & Continue to Send/);
  assert.match(documentWorkspace, /Save & Continue to Share/);
  assert.match(documentWorkspace, /External share opened\. Meetro cannot confirm delivery/);
  assert.match(documentWorkspace, /Sending does not issue, accept, approve, pay, or close anything\./);
  assert.match(documentWorkspace, /No acceptance or payment was inferred\./);
  assert.match(documentWorkspace, /Payment and completion are not inferred\./);
  assert.match(quoteBuilder, /ContextualAskMeetro/);
  assert.match(quoteBuilder, /applyConfirmedQuoteComposition/);
  assert.doesNotMatch(
    quoteBuilder,
    /Professional-confirmed|confirmed materials|materiales confirmados|After reviewing|Después de revisar|before sending|antes de enviar/i
  );
  assert.doesNotMatch(quoteBuilder, /runAiQuoteHelp|generateAiDraft|sendQuote|saveDraftQuote/);
  assert.doesNotMatch(
    documentWorkspace,
    /\b(?:issueQuote|acceptQuote|approveQuote|markInvoicePaid|completePayment|completeJob|closeJob)\s*\(/
  );
});

test("Completion pages cannot create completion, customer confirmation, closure, or history", () => {
  assert.match(completionSheet, /completionRecordingUnavailableTitle/);
  assert.match(completedJobDetails, /completedJobDetailsUnavailable/);

  for (const source of [completionSheet, completedJobDetails]) {
    assert.doesNotMatch(
      source,
      /saveCompletion|confirmCompletion|closeAfterResolution|stillNeedsAttention|moveJobToHistory|updateProjectLifecycleState|createTimelineMomentFromClosedProject/
    );
    assert.doesNotMatch(source, /localStorage\.(?:setItem|removeItem)|sessionStorage\.(?:setItem|removeItem)/);
    assert.doesNotMatch(source, /workflow_completion_closeout|completionApprovedAt|status:\s*"(?:completed|closed|needs_resolution)"/);
  }
});

test("Contractor Dashboard cannot bypass completion and closure containment", () => {
  assert.match(contractorDashboard, /lifecycleDashboardActionUnavailable/);
  assert.match(contractorDashboard, /onAction:\s*\(\) => setPage\("completionSheet"\)/);
  assert.match(contractorDashboard, /const openCompletionFormForWorkCenterJob = \(\) => setPage\("completionSheet"\)/);
  assert.match(
    contractorDashboard,
    /workCenterHistoryTitle[\s\S]*lifecycleLegacyHistoryNotice[\s\S]*jobListGrid/
  );
  assert.doesNotMatch(contractorDashboard, /saveClosedJobToHistory|buildClosedJobHistoryRecord/);
  assert.doesNotMatch(
    contractorDashboard,
    /localStorage\.setItem\(\s*"completedProjects"|localStorage\.setItem\(\s*"lastCompletedProject"/
  );
  assert.doesNotMatch(contractorDashboard, /setOperationalActiveWorkStatus\(job,\s*"closed"\)/);
});

test("unavailable surfaces create no canonical-looking browser success", () => {
  for (const source of unavailableSurfaces) {
    assert.doesNotMatch(source, /localStorage\.(?:setItem|removeItem)|sessionStorage\.(?:setItem|removeItem)/);
    assert.doesNotMatch(
      source,
      /customer will receive|sent to customer|change order requested|job marked completed|saved to history|completion approved/i
    );
  }
});

test("containment copy resolves in EN, ES, FR, and PT-BR", () => {
  const keys = [
    "jobUpdateUnavailableTitle",
    "jobUpdateNoDeliveryNotice",
    "changeOrderUnavailableTitle",
    "changeOrderNoSubmissionNotice",
    "completionRecordingUnavailableTitle",
    "completionNoAuthorityNotice",
    "completedJobDetailsUnavailable",
    "completedHistoryNoMutationNotice",
    "lifecycleDashboardActionUnavailable",
    "lifecycleLegacyHistoryNotice",
    "quoteDraftHelpBody",
    "addPricingBeforeSendingQuote",
  ];

  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of keys) {
      assert.equal(typeof translations[language][key], "string");
      assert.ok(t(key, language).trim(), `${language} ${key} should resolve`);
      assert.notEqual(t(key, language), key);
    }
    assert.doesNotMatch(t("addPricingBeforeSendingQuote", language), /send|enviar|envoyer/i);
  }
});
