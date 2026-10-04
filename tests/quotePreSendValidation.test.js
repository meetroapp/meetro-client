import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { validateQuotePreSend } from "../src/utils/quotePreSendValidation.js";

const VALID_QUOTE = Object.freeze({
  customerName: "Joe Jerez",
  projectTitle: "Replace damaged front door and trim",
  totalOverride: "1480.00",
  paymentTerms: "Balance due on completion",
  estimatedDuration: "Two working days",
});

function validate(overrides = {}) {
  return validateQuotePreSend({ ...VALID_QUOTE, ...overrides });
}

const workspace = readFileSync(
  new URL(
    "../src/components/UnifiedBusinessDocumentWorkspace.jsx",
    import.meta.url
  ),
  "utf8"
);

test("Quote with no deposit requirement passes pre-send validation", () => {
  const result = validate({
    depositRequired: "No",
    depositMode: "NONE",
  });

  assert.equal(result.ready, true);
  assert.deepEqual(result.blockingErrors, []);
  assert.deepEqual(result.warnings, []);
});

test("valid preset and custom percentage deposits pass", () => {
  for (const percent of [25, 50, 75, 12.5]) {
    const result = validate({
      depositRequired: "Yes",
      depositMode: "PERCENT",
      depositPercent: String(percent),
    });

    assert.equal(result.ready, true, `expected ${percent}% to pass`);
  }
});

test("percentage deposit of zero is blocked", () => {
  const result = validate({
    depositRequired: "Yes",
    depositMode: "PERCENT",
    depositPercent: "0",
  });

  assert.equal(result.ready, false);
  assert.equal(result.blockingErrors[0]?.code, "DEPOSIT_PERCENT_INVALID");
});

test("percentage deposit greater than 100 is blocked", () => {
  const result = validate({
    depositRequired: "Yes",
    depositMode: "PERCENT",
    depositPercent: "101",
  });

  assert.equal(result.ready, false);
  assert.equal(result.blockingErrors[0]?.code, "DEPOSIT_PERCENT_INVALID");
});

test("blank percentage uses the missing-deposit blocking message", () => {
  const result = validate({
    depositRequired: "Yes",
    depositMode: "PERCENT",
    depositPercent: "",
  });

  assert.equal(result.ready, false);
  assert.equal(result.blockingErrors[0]?.code, "DEPOSIT_VALUE_REQUIRED");
  assert.equal(
    result.blockingErrors[0]?.message,
    "A deposit is required for this Quote, but no deposit amount or percentage has been entered."
  );
});

test("nonnumeric percentage remains an invalid-value error", () => {
  const result = validate({
    depositRequired: "Yes",
    depositMode: "PERCENT",
    depositPercent: "abc",
  });

  assert.equal(result.ready, false);
  assert.equal(result.blockingErrors[0]?.code, "DEPOSIT_PERCENT_INVALID");
});

test("positive fixed deposit passes", () => {
  const result = validate({
    depositRequired: "Yes",
    depositMode: "FIXED",
    depositFixedAmount: "500",
  });

  assert.equal(result.ready, true);
});

test("blank fixed deposit uses the missing-deposit blocking message", () => {
  const result = validate({
    depositRequired: "Yes",
    depositMode: "FIXED",
    depositFixedAmount: "",
  });

  assert.equal(result.ready, false);
  assert.equal(result.blockingErrors[0]?.code, "DEPOSIT_VALUE_REQUIRED");
  assert.equal(
    result.blockingErrors[0]?.message,
    "A deposit is required for this Quote, but no deposit amount or percentage has been entered."
  );
});

test("zero fixed deposit is blocked", () => {
  const result = validate({
    depositRequired: "Yes",
    depositMode: "FIXED",
    depositFixedAmount: "0",
  });

  assert.equal(result.ready, false);
  assert.equal(result.blockingErrors[0]?.code, "DEPOSIT_FIXED_INVALID");
});

test("legacy required deposit without a value is blocked", () => {
  const result = validate({
    depositRequired: "Yes",
  });

  assert.equal(result.ready, false);
  assert.equal(result.blockingErrors[0]?.code, "DEPOSIT_VALUE_REQUIRED");
  assert.match(
    result.blockingErrors[0]?.message || "",
    /A deposit is required for this Quote/
  );
});

test("legacy required Quote with a valid fixed deposit remains compatible", () => {
  const result = validate({
    depositRequired: "Yes",
    depositAmount: "450",
  });

  assert.equal(result.ready, true);
});

test("invalid nonnumeric fixed deposit is blocked", () => {
  const result = validate({
    depositRequired: "Yes",
    depositMode: "FIXED",
    depositFixedAmount: "not-an-amount",
  });

  assert.equal(result.ready, false);
  assert.equal(result.blockingErrors[0]?.code, "DEPOSIT_FIXED_INVALID");
});

test("generalized Quote Safety blocks missing customer, project, scope, and placeholder scope", () => {
  assert.ok(validate({ customerName: "" }).blockingErrors.some((item) => item.code === "QUOTE_CUSTOMER_REQUIRED"));
  assert.ok(validate({ projectTitle: "", projectDescription: "" }).blockingErrors.some((item) => item.code === "QUOTE_PROJECT_REQUIRED"));
  assert.ok(validate({ totalOverride: "", lineItems: [] }).blockingErrors.some((item) => item.code === "QUOTE_SCOPE_REQUIRED"));
  assert.ok(validate({ projectTitle: "TBD" }).blockingErrors.some((item) => item.code === "QUOTE_SCOPE_PLACEHOLDER"));
});

test("commercial totals fail closed for malformed, zero, inconsistent, and excessive fixed deposit values", () => {
  assert.ok(validate({ totalOverride: "1.234" }).blockingErrors.some((item) => item.code === "QUOTE_TOTAL_INVALID"));
  assert.ok(validate({ totalOverride: "0" }).blockingErrors.some((item) => item.code === "QUOTE_TOTAL_REQUIRED"));
  assert.ok(validate({ totalOverride: "", lineItems: [{ description: "Replace door", total: "100" }], subtotal: "90" }).blockingErrors.some((item) => item.code === "QUOTE_TOTAL_INCONSISTENT"));
  assert.ok(validate({ depositMode: "FIXED", depositRequired: "Yes", depositFixedAmount: "2000" }).blockingErrors.some((item) => item.code === "DEPOSIT_EXCEEDS_QUOTE_TOTAL"));
});

test("contradictory structured deposit and payment terms are hard blockers", () => {
  const result = validate({
    depositMode: "PERCENT",
    depositRequired: "Yes",
    depositPercent: "75",
    paymentTerms: "A 50% deposit is due on approval",
  });
  assert.equal(result.ready, false);
  assert.ok(result.blockingErrors.some((item) => item.code === "DEPOSIT_TERMS_CONTRADICT"));
});

test("commercially useful omissions are advisory and do not make the result unready", () => {
  const result = validate({ paymentTerms: "", estimatedDuration: "" });
  assert.equal(result.ready, true);
  assert.deepEqual(result.warnings.map((item) => item.code), [
    "QUOTE_PAYMENT_TERMS_MISSING",
    "QUOTE_DURATION_MISSING",
  ]);
});

test("blockers and warnings remain separate in one validation result", () => {
  const result = validate({ customerName: "", paymentTerms: "", estimatedDuration: "" });
  assert.equal(result.ready, false);
  assert.ok(result.blockingErrors.some((item) => item.code === "QUOTE_CUSTOMER_REQUIRED"));
  assert.ok(result.warnings.some((item) => item.code === "QUOTE_PAYMENT_TERMS_MISSING"));
});

test("Quote Safety is isolated to governed send and does not gate Save Draft", () => {
  const sendStart = workspace.indexOf(
    "async function beginGovernedQuoteIssue()"
  );
  const sendEnd = workspace.indexOf(
    "async function confirmGovernedQuoteIssue()",
    sendStart
  );
  const sendHandler = workspace.slice(sendStart, sendEnd);

  assert.ok(sendStart >= 0);
  assert.ok(sendEnd > sendStart);
  assert.match(sendHandler, /validateQuotePreSend\(quote\)/);

  const saveStart = workspace.indexOf("async function saveDocument(");
  const saveEnd = workspace.indexOf("\n  async function ", saveStart + 1);
  const saveHandler = workspace.slice(
    saveStart,
    saveEnd > saveStart ? saveEnd : undefined
  );

  assert.ok(saveStart >= 0);
  assert.doesNotMatch(saveHandler, /validateQuotePreSend/);
});

test("governed Send Quote validates before canonical issue preparation", () => {
  const start = workspace.indexOf(
    "async function beginGovernedQuoteIssue()"
  );
  const end = workspace.indexOf(
    "async function confirmGovernedQuoteIssue()",
    start
  );
  const handler = workspace.slice(start, end);

  const safetyIndex = handler.indexOf("validateQuotePreSend(quote)");
  const savedCandidateIndex = handler.indexOf("const savedCandidate");

  assert.ok(safetyIndex >= 0);
  assert.ok(savedCandidateIndex > safetyIndex);
  assert.match(handler, /if \(!quoteSafety\.ready\)/);
  assert.match(handler, /setQuoteSafetyState\(\{ \.\.\.quoteSafety, canSendAnyway: false \}\)/);
});

test("blocking Quote Safety dialog gives no Send Anyway escape", () => {
  const start = workspace.indexOf(
    '{quoteSafetyState ? <WorkspaceDialog'
  );
  const end = workspace.indexOf(
    "{quoteIssueState &&",
    start
  );
  const dialog = workspace.slice(start, end);

  assert.ok(start >= 0);
  assert.ok(end > start);
  assert.match(dialog, /Quote needs attention/);
  assert.match(dialog, /Must correct/);
  assert.match(dialog, /Review before sending/);
  assert.match(dialog, /Go Back & Edit Quote/);
  assert.match(dialog, /quoteSafetyState\.canSendAnyway[\s\S]*Send Anyway/);
});

test("Go Back & Add Deposit opens and targets the Quote Deposit editor", () => {
  assert.match(
    workspace,
    /function returnToQuoteDeposit\(\) \{[\s\S]*setMobilePane\("conversation"\);[\s\S]*openManualEditor\("deposit"\)/
  );

  assert.match(
    workspace,
    /id="business-document-quote-deposit" data-quote-safety-field="deposit"/
  );

  assert.match(
    workspace,
    /depositInputRef[\s\S]*closest\("details"\)[\s\S]*pricingOptions\.open = true/
  );
});

test("first external Quote delivery requires safety while Invoice delivery does not", async () => {
  const {
    shouldValidateQuotePreSendForDelivery,
  } = await import("../src/utils/quotePreSendValidation.js");

  assert.equal(
    shouldValidateQuotePreSendForDelivery({
      documentType: "QUOTE",
      documentVersion: 1,
      deliveries: [],
    }),
    true
  );

  assert.equal(
    shouldValidateQuotePreSendForDelivery({
      documentType: "INVOICE",
      documentVersion: 1,
      deliveries: [],
    }),
    false
  );
});

test("exact previously delivered Quote version remains a copy operation", async () => {
  const {
    shouldValidateQuotePreSendForDelivery,
  } = await import("../src/utils/quotePreSendValidation.js");

  assert.equal(
    shouldValidateQuotePreSendForDelivery({
      documentType: "QUOTE",
      documentVersion: 4,
      deliveries: [
        {
          documentVersion: 4,
          state: "SENT",
        },
      ],
    }),
    false
  );
});

test("failed delivery never bypasses Quote Safety and current edits revalidate", async () => {
  const {
    shouldValidateQuotePreSendForDelivery,
  } = await import("../src/utils/quotePreSendValidation.js");

  assert.equal(
    shouldValidateQuotePreSendForDelivery({
      documentType: "QUOTE",
      documentVersion: 4,
      deliveries: [
        {
          documentVersion: 4,
          state: "FAILED",
        },
      ],
    }),
    true
  );

  assert.equal(
    shouldValidateQuotePreSendForDelivery({
      documentType: "QUOTE",
      documentVersion: 4,
      currentContentChanged: true,
      deliveries: [
        {
          documentVersion: 4,
          state: "SENT",
        },
      ],
    }),
    true
  );
});

test("already issued Quote remains immutable copy or delivery-retry authority", async () => {
  const {
    shouldValidateQuotePreSendForDelivery,
  } = await import("../src/utils/quotePreSendValidation.js");

  assert.equal(
    shouldValidateQuotePreSendForDelivery({
      documentType: "QUOTE",
      documentVersion: 9,
      issued: true,
      currentContentChanged: true,
      deliveries: [],
    }),
    false
  );
});

test("external Quick Quote gates before save, share, review, and final delivery", () => {
  const beginStart = workspace.indexOf(
    "function beginDelivery(channel)"
  );
  const beginEnd = workspace.indexOf(
    "async function beginGovernedQuoteIssue()",
    beginStart
  );
  const beginHandler = workspace.slice(beginStart, beginEnd);

  const safetyIndex = beginHandler.indexOf(
    "quoteSafetyAllowsDelivery(activeSaved"
  );
  const saveRequiredIndex = beginHandler.indexOf(
    'stage: "saveRequired"'
  );

  assert.ok(safetyIndex >= 0);
  assert.ok(saveRequiredIndex > safetyIndex);

  const reviewStart = workspace.indexOf(
    "function openDeliveryReview(channel, document, warningsAcknowledged = false)"
  );
  const reviewEnd = workspace.indexOf(
    "function beginDelivery(channel)",
    reviewStart
  );
  const reviewHandler = workspace.slice(reviewStart, reviewEnd);

  assert.match(
    reviewHandler,
    /quoteSafetyAllowsDelivery\(document, \{[\s\S]*warningsAcknowledged/
  );

  const shareStart = workspace.indexOf(
    "async function shareSavedDocument(document, warningsAcknowledged = false)"
  );
  const shareEnd = workspace.indexOf(
    "async function saveAndContinueDelivery()",
    shareStart
  );
  const shareHandler = workspace.slice(shareStart, shareEnd);

  assert.match(
    shareHandler,
    /quoteSafetyAllowsDelivery\(document, \{[\s\S]*onSendAnyway/
  );

  const sendStart = workspace.indexOf(
    "async function sendCurrentDelivery"
  );
  const sendEnd = workspace.indexOf(
    "async function createReviewedInvoice",
    sendStart
  );
  const sendHandler = workspace.slice(sendStart, sendEnd);

  const finalSafetyIndex = sendHandler.indexOf(
    "quoteSafetyAllowsDelivery(deliveryState.document"
  );
  const transportIndex = sendHandler.indexOf(
    "deliverBusinessDocumentDraft"
  );

  assert.ok(finalSafetyIndex >= 0);
  assert.ok(transportIndex > finalSafetyIndex);
});

test("governed Quote validates new drafts but bypasses already issued immutable Quote copies", () => {
  const start = workspace.indexOf(
    "async function beginGovernedQuoteIssue()"
  );
  const end = workspace.indexOf(
    "async function confirmGovernedQuoteIssue()",
    start
  );
  const handler = workspace.slice(start, end);

  assert.match(
    handler,
    /shouldValidateQuotePreSendForDelivery\(\{[\s\S]*issued: Boolean\(activeIssuedQuote\)/
  );

  assert.match(
    handler,
    /if \(quoteSafetyRequired\) \{[\s\S]*validateQuotePreSend\(quote\)/
  );
});

test("modified issued Quote cannot enter Save & Continue copy delivery", () => {
  const helperStart = workspace.indexOf(
    "function quoteSafetyAllowsDelivery("
  );
  const helperEnd = workspace.indexOf(
    "function openDeliveryReview(",
    helperStart
  );
  const helper = workspace.slice(helperStart, helperEnd);

  assert.ok(helperStart >= 0);
  assert.ok(helperEnd > helperStart);

  assert.match(
    helper,
    /activeIssuedQuote[\s\S]*currentContentChanged/
  );

  assert.match(
    helper,
    /This Quote has already been issued\. Changes cannot be sent as a copy\. Start a new Quote to make changes\./
  );

  assert.match(
    helper,
    /setDeliveryState\(null\);[\s\S]*return false;/
  );

  const beginStart = workspace.indexOf(
    "function beginDelivery(channel)"
  );
  const beginEnd = workspace.indexOf(
    "async function beginGovernedQuoteIssue()",
    beginStart
  );
  const beginHandler = workspace.slice(beginStart, beginEnd);

  assert.match(
    beginHandler,
    /currentContentChanged: activeDocument === "quote"/
  );

  const safetyIndex = beginHandler.indexOf(
    "quoteSafetyAllowsDelivery(activeSaved"
  );
  const saveRequiredIndex = beginHandler.indexOf(
    'stage: "saveRequired"'
  );

  assert.ok(safetyIndex >= 0);
  assert.ok(saveRequiredIndex > safetyIndex);
});
