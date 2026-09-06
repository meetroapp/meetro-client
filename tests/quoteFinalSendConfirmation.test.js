import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(
  new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
  "utf8"
);

function block(startMarker, endMarker) {
  const start = workspace.indexOf(startMarker);
  const end = workspace.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `missing ${startMarker}`);
  assert.ok(end > start, `missing ${endMarker} after ${startMarker}`);
  return workspace.slice(start, end);
}

test("Quote final confirmation uses WorkspaceDialog and explicit customer-facing copy", () => {
  const dialog = block(
    "function QuoteFinalSendConfirmationDialog",
    "function QuoteIssueReviewDialog"
  );

  assert.match(dialog, /<WorkspaceDialog/);
  assert.match(dialog, /title="Send this Quote\?"/);
  assert.match(dialog, /label: "Cancel"/);
  assert.match(dialog, /"Send Quote"/);
  assert.match(dialog, /<dt>Customer<\/dt><dd>\{state\.customerName\}<\/dd>/);
  assert.match(dialog, /<dt>Quote<\/dt><dd>\{state\.quoteNumber\}<\/dd>/);
  assert.match(dialog, /<dt>Amount<\/dt><dd>\{money\(state\.amount\)\}<\/dd>/);
  assert.match(dialog, /<dt>Via<\/dt><dd>\{state\.via\}<\/dd>/);
  assert.match(dialog, /This will send this saved Quote to the customer\./);
  assert.doesNotMatch(dialog, /window\.confirm|>OK<|>Continue<|>Yes</);
});

test("email Quote review opens final confirmation without invoking transport", () => {
  const request = block(
    "function requestDeliverySend()",
    "function requestGovernedQuoteSend()"
  );

  assert.match(request, /if \(current\.documentType !== "quote"\)/);
  assert.match(request, /kind: "DELIVERY"/);
  assert.match(request, /customerName: current\.customerName/);
  assert.match(request, /quoteNumber: displayDocumentNumber\(current\.document\)/);
  assert.match(request, /amount: current\.total/);
  assert.match(request, /current\.channel === "EMAIL" \? "Email" : "Meetro Message"/);
  assert.match(request, /setQuoteFinalSendState\(confirmation\)/);
  assert.doesNotMatch(request, /deliverBusinessDocumentDraft|issueAndSendWorkingQuote/);
});

test("governed Meetro Quote review opens final confirmation from exact review authority", () => {
  const request = block(
    "function requestGovernedQuoteSend()",
    "function cancelQuoteFinalSend()"
  );

  assert.match(request, /current\?\.readiness\?\.ready !== true/);
  assert.match(request, /kind: "GOVERNED"/);
  assert.match(request, /documentId: current\.document\.id/);
  assert.match(request, /documentVersion: current\.document\.version/);
  assert.match(request, /commandKeys: current\.commandKeys/);
  assert.match(request, /customerName: current\.readiness\.customerName/);
  assert.match(request, /quoteNumber: current\.readiness\.documentNumber/);
  assert.match(request, /amount: current\.readiness\.total/);
  assert.match(request, /via: "Meetro Message"/);
  assert.doesNotMatch(request, /issueAndSendWorkingQuote/);
});

test("external Issue Quote stays issuance-only and does not claim customer transmission", () => {
  const request = block(
    "function requestGovernedQuoteSend()",
    "function cancelQuoteFinalSend()"
  );
  const externalBranch = request.slice(
    request.indexOf("if (externalCustomer)"),
    request.indexOf("const confirmation")
  );

  assert.match(externalBranch, /void confirmGovernedQuoteIssue\(\)/);
  assert.match(externalBranch, /return/);
  assert.doesNotMatch(externalBranch, /setQuoteFinalSendState/);
});

test("Cancel closes only final confirmation and preserves Delivery Review fields", () => {
  const cancel = block(
    "function cancelQuoteFinalSend()",
    "function closeQuoteIssueReview()"
  );

  assert.match(cancel, /if \(quoteFinalSendState\?\.busy\) return/);
  assert.match(cancel, /quoteFinalSendAuthorizationRef\.current = null/);
  assert.match(cancel, /setQuoteFinalSendState\(null\)/);
  assert.doesNotMatch(cancel, /setDeliveryState|setQuoteIssueState|deliverBusinessDocumentDraft|issueAndSendWorkingQuote/);
});

test("Send Quote has a synchronous one-flight guard and reaches one canonical send path", () => {
  const confirm = block(
    "async function confirmQuoteFinalSend()",
    "async function shareSavedDocument"
  );

  assert.match(confirm, /current\.busy/);
  assert.match(confirm, /quoteFinalSendInFlightRef\.current/);
  assert.match(confirm, /quoteFinalSendAuthorizationRef\.current !== current/);
  assert.match(confirm, /quoteFinalSendInFlightRef\.current = true/);
  assert.match(confirm, /state === current \? \{ \.\.\.state, busy: true \}/);
  assert.match(confirm, /if \(current\.kind === "GOVERNED"\)[\s\S]*await confirmGovernedQuoteIssue\(\)[\s\S]*else[\s\S]*await sendCurrentDelivery/);
  assert.match(confirm, /finally[\s\S]*quoteFinalSendAuthorizationRef\.current = null[\s\S]*quoteFinalSendInFlightRef\.current = false/);
  assert.doesNotMatch(confirm, /setTimeout|deliverBusinessDocumentDraft|issueAndSendWorkingQuote/);
});

test("canonical Quote transports fail closed without matching exact-version authorization", () => {
  const generic = block(
    "async function sendCurrentDelivery",
    "async function createReviewedInvoice"
  );
  const governed = block(
    "async function confirmGovernedQuoteIssue()",
    "function openExternalQuoteApproval()"
  );
  const authority = block(
    "function hasQuoteFinalSendAuthorization",
    "function requestDeliverySend()"
  );

  assert.match(generic, /deliveryState\.documentType === "quote"[\s\S]*!hasQuoteFinalSendAuthorization\("DELIVERY", deliveryState\)[\s\S]*return/);
  assert.match(governed, /!externalCustomer[\s\S]*!hasQuoteFinalSendAuthorization\("GOVERNED", current\)[\s\S]*return/);
  assert.match(authority, /authorization\.documentId === current\?\.document\?\.id/);
  assert.match(authority, /authorization\.documentVersion === current\?\.document\?\.version/);
  assert.match(authority, /authorization\.commandKeys === current\.commandKeys/);
  assert.match(authority, /authorization\.idempotencyKey === current\.idempotencyKey/);
});

test("Invoice Delivery Review continues directly through its existing send behavior", () => {
  const request = block(
    "function requestDeliverySend()",
    "function requestGovernedQuoteSend()"
  );

  assert.match(request, /if \(current\.documentType !== "quote"\) \{[\s\S]*void sendCurrentDelivery\(\{ retry: current\.failed \}\);[\s\S]*return;/);
  assert.doesNotMatch(request.slice(0, request.indexOf('kind: "DELIVERY"')), /setQuoteFinalSendState/);
});

test("resend and failed retry capture confirmation before preserving existing idempotency logic", () => {
  const request = block(
    "function requestDeliverySend()",
    "function requestGovernedQuoteSend()"
  );
  const send = block(
    "async function sendCurrentDelivery",
    "async function createReviewedInvoice"
  );

  assert.match(request, /retry: current\.failed === true/);
  assert.match(send, /const idempotencyKey = retry \? createBusinessDocumentSaveKey\(\) : deliveryState\.idempotencyKey/);
  assert.match(workspace, /state\.resend \? "Resend" : "Send"/);
  assert.match(workspace, /state\.failed \? `Retry/);
});

test("Quote Safety remains before final authorization and before both transports", () => {
  const begin = block(
    "async function beginGovernedQuoteIssue()",
    "async function confirmGovernedQuoteIssue()"
  );
  const generic = block(
    "async function sendCurrentDelivery",
    "async function createReviewedInvoice"
  );

  assert.match(begin, /validateQuotePreSend\(quote\)/);
  assert.match(begin, /serverSafety\.blockingErrors\.length/);
  assert.match(begin, /quoteSafetyContinuationRef\.current/);
  assert.match(workspace, /label: "Send Anyway"[\s\S]*onClick: acknowledgeQuoteSafetyWarnings/);
  assert.ok(generic.indexOf("quoteSafetyAllowsDelivery") < generic.indexOf("deliverBusinessDocumentDraft"));
  assert.match(governedTransport(), /quoteSafetyAcknowledgement: current\.quoteSafetyAcknowledgement/);
});

function governedTransport() {
  return block(
    "async function confirmGovernedQuoteIssue()",
    "function openExternalQuoteApproval()"
  );
}

test("Save, Preview, Download, and device Share do not open the final send confirmation", () => {
  const preview = block("async function previewActivePdf()", "async function downloadActivePdf()");
  const download = block("async function downloadActivePdf()", "function deliveryTotal");
  const share = block("async function shareSavedDocument", "async function saveAndContinueDelivery()");
  const save = block("async function saveDocument(", "async function restoreJobAnalysisPresentation");

  for (const handler of [preview, download, share, save]) {
    assert.doesNotMatch(handler, /setQuoteFinalSendState|requestDeliverySend|requestGovernedQuoteSend/);
  }
  assert.doesNotMatch(share, /deliverBusinessDocumentDraft|issueAndSendWorkingQuote/);
});

test("the underlying review is restored after Cancel and hidden while final confirmation is active", () => {
  assert.match(workspace, /deliveryState\?\.stage === "review" && !quoteFinalSendState \? <DeliveryReviewDialog/);
  assert.match(workspace, /quoteIssueState && !\["hydrating", "settled"\]\.includes\(quoteIssueState\.stage\) && !quoteFinalSendState \? <QuoteIssueReviewDialog/);
  assert.match(workspace, /quoteFinalSendState \? <QuoteFinalSendConfirmationDialog/);
  assert.match(workspace, /onSend=\{requestDeliverySend\}/);
  assert.match(workspace, /onConfirm=\{requestGovernedQuoteSend\}/);
});

test("successful Quote delivery retains canonical result while post-send authority refresh is pending", () => {
  const confirm = block(
    "async function confirmGovernedQuoteIssue()",
    "function openExternalQuoteApproval()"
  );
  const close = block(
    "function closeQuoteIssueReview()",
    "async function confirmQuoteFinalSend()"
  );

  assert.match(confirm, /stage: "success"/);
  assert.match(confirm, /busy: false/);
  assert.match(confirm, /issuedQuote: result\.issuedQuote/);
  assert.match(confirm, /delivery: result\.delivery/);
  assert.match(confirm, /result,/);
  assert.match(confirm, /finally[\s\S]*hydratePersistedQuoteAuthority\(current\.document\)/);
  assert.match(close, /current\?\.stage !== "success"/);
  assert.match(close, /persistedQuoteAuthority\.stage === "ready"/);
  assert.match(close, /persistedQuoteAuthority\.authority\?\.delivery\?\.existingDelivery/);
  assert.match(close, /refreshComplete \? null : \{ \.\.\.current, stage: "settled" \}/);
});

test("settled post-send authority remains actionable without reopening the success dialog", () => {
  const activeAuthority = block(
    "const activeTransientQuoteMatches",
    "const saveLabel"
  );

  assert.match(activeAuthority, /quoteIssueState\?\.result\?\.issuedQuote/);
  assert.match(activeAuthority, /quoteIssueState\?\.result\?\.deliveryEvidence/);
  assert.match(activeAuthority, /workingQuoteDeliveryPresentation\(\{/);
  assert.match(workspace, /!\["hydrating", "settled"\]\.includes\(quoteIssueState\.stage\)/);
  assert.match(workspace, /activeQuoteAuthorityPresentation\.actionLabel/);
  assert.match(workspace, /activeQuoteAuthorityPresentation\.actionDisabled/);
});

test("authority refresh replaces settled evidence atomically and genuine failure remains fail closed", () => {
  const hydrate = block(
    "async function hydratePersistedQuoteAuthority(document)",
    "function applyRestoredDocument"
  );

  assert.match(hydrate, /stage: "loading"/);
  assert.match(hydrate, /stage: "ready"[\s\S]*currentIssue\?\.stage === "settled"/);
  assert.match(hydrate, /stage: "error"[\s\S]*currentIssue\?\.stage === "settled"/);
  assert.match(hydrate, /Sending is unavailable until the status can be checked/);
});

test("unsaved customer-facing edits cannot resend the stale issued artifact", () => {
  const begin = block(
    "async function beginGovernedQuoteIssue()",
    "async function confirmGovernedQuoteIssue()"
  );

  assert.match(begin, /fingerprints\.quote === businessDocumentRestoredSnapshotFingerprint\(document\)/);
  assert.match(begin, /exactSavedContent: false/);
  assert.match(begin, /workingQuoteSendReadiness\(\{/);
  assert.match(begin, /deliveryIntent = \["DELIVERED", "APPROVED", "DECLINED"\]\.includes/);
  assert.ok(begin.indexOf("const exactSavedContent") < begin.indexOf("if (!exactSavedContent)"));
  assert.match(begin, /if \(!exactSavedContent\) \{[\s\S]*exactSavedContent: false[\s\S]*stage: "review"/);
});

test("successful resend still passes through the 90440 confirmation and one canonical COPY command", () => {
  const begin = block(
    "async function beginGovernedQuoteIssue()",
    "async function confirmGovernedQuoteIssue()"
  );
  const request = block(
    "function requestGovernedQuoteSend()",
    "function cancelQuoteFinalSend()"
  );
  const confirmFinal = block(
    "async function confirmQuoteFinalSend()",
    "async function shareSavedDocument"
  );

  assert.match(begin, /deliveryIntent === "COPY"/);
  assert.match(begin, /createWorkingQuoteCommandKeys\(\)/);
  assert.match(request, /setQuoteFinalSendState\(confirmation\)/);
  assert.match(confirmFinal, /await confirmGovernedQuoteIssue\(\)/);
  assert.match(confirmFinal, /quoteFinalSendInFlightRef\.current/);
  assert.match(workspace, /deliveryIntent: current\.deliveryIntent/);
});
