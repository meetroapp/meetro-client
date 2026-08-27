import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(
  new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(
  new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url),
  "utf8"
);

function block(start, end) {
  return workspace.slice(workspace.indexOf(start), workspace.indexOf(end));
}

test("Job-linked Quote workspace exposes one reviewed business-facing send action", () => {
  assert.match(workspace, /Send Quote to Customer/);
  assert.match(workspace, /activeDocument === "quote" && documentJobIds\.quote/);
  assert.match(workspace, /beginGovernedQuoteIssue/);
  assert.match(workspace, /Review & Send Quote/);
  assert.match(workspace, /Review the details below before sending this quote to the customer/);
});

test("workspace re-reads the exact saved Quote without saving, then delegates governed send once", () => {
  const begin = block("async function beginGovernedQuoteIssue", "async function confirmGovernedQuoteIssue");
  const confirm = block("async function confirmGovernedQuoteIssue", "async function shareSavedDocument");
  assert.match(begin, /savedDocumentsRef\.current\.quote \|\| activeSaved/);
  assert.match(begin, /getBusinessDocumentDraft\(\{/);
  assert.ok(begin.indexOf("getBusinessDocumentDraft") < begin.indexOf("fetchWorkingQuoteReviewIdentity"));
  assert.doesNotMatch(begin, /ensureCurrentDocumentSaved|saveDocument\(|createBusinessDocumentDraft|updateBusinessDocumentDraft|initializeBusinessDocumentNumbering/);
  assert.match(begin, /document\.id.*document\.version/s);
  assert.match(begin, /createWorkingQuoteCommandKeys/);
  assert.match(begin, /workingQuoteSendReadiness/);
  assert.match(confirm, /issueAndSendWorkingQuote/);
  assert.match(confirm, /document: current\.document/);
  assert.match(confirm, /checkpoint: current\.checkpoint/);
  assert.match(confirm, /commandKeys: current\.commandKeys/);
  assert.match(confirm, /quoteIssueInFlightRef\.current/);
  assert.match(confirm, /finally[\s\S]*quoteIssueInFlightRef\.current = false/);
  assert.doesNotMatch(confirm, /approve|decline|payment|schedule|workstream|invoice|completeJob/);
});

test("review identity comes from the exact-version Working Quote authority projection, never draft labels", () => {
  const begin = block("async function beginGovernedQuoteIssue", "async function confirmGovernedQuoteIssue");
  assert.match(begin, /fetchWorkingQuoteReviewIdentity\(\{/);
  assert.match(begin, /document,/);
  assert.match(begin, /jobId: documentJobIds\.quote/);
  assert.doesNotMatch(begin, /customerName: (?:quote|document)/);
  assert.doesNotMatch(begin, /projectTitle: (?:quote|document)/);
  assert.doesNotMatch(begin, /fetchAuthorizedProfessionalJobs|findAuthorizedProfessionalJob/);
});

test("review dialog shows customer, project, Quote, version, and USD total in business language", () => {
  const dialog = block("function QuoteIssueReviewDialog", "function NumberingSetupDialog");
  for (const label of ["Customer", "Project", "Quote", "Version", "Total"]) {
    assert.match(dialog, new RegExp(`<dt>${label}</dt>`));
  }
  assert.match(dialog, /readiness\?\.customerName/);
  assert.match(dialog, /readiness\?\.projectTitle/);
  assert.match(dialog, /readiness\?\.documentNumber/);
  assert.match(dialog, /readiness\?\.documentVersion/);
  assert.match(dialog, /money\(readiness\?\.total\).*USD/);
  assert.match(dialog, /Once sent, this quote will be available for the customer to review and accept/);
  assert.match(dialog, /Sending the quote does not mean the customer has accepted it or made a payment/);
  assert.doesNotMatch(dialog, /canonical Draft|governed version|commercial offer|Canonical Quote|Exact issued version/);
});

test("dialog and handler share one fail-closed readiness gate while Cancel has no command authority", () => {
  const dialog = block("function QuoteIssueReviewDialog", "function NumberingSetupDialog");
  const confirm = block("async function confirmGovernedQuoteIssue", "async function shareSavedDocument");
  assert.match(dialog, /disabled: state\.busy \|\| readiness\?\.ready !== true/);
  assert.match(dialog, /label: "Cancel", onClick: onCancel/);
  assert.doesNotMatch(dialog, /issueAndSendWorkingQuote|authFetch|fetch\(/);
  assert.match(confirm, /current\?\.readiness\?\.ready !== true/);
  assert.match(confirm, /current\.identity\.jobId !== documentJobIds\.quote/);
  assert.match(styles, /business-document-confirm > footer button:disabled[^{]*\{[^}]*opacity:/);
});

test("saved review hydration cannot reuse the stale numbering warning or expose internal pricing", () => {
  const begin = block("async function beginGovernedQuoteIssue", "async function confirmGovernedQuoteIssue");
  const dialog = block("function QuoteIssueReviewDialog", "function NumberingSetupDialog");
  assert.doesNotMatch(begin, /Finish the one-time numbering setup/);
  assert.doesNotMatch(begin, /NUMBERING_SETUP_PENDING/);
  assert.doesNotMatch(dialog, /labor|materials|internal cost|deposit due/i);
});

test("post-save reference is retained synchronously for immediate review and restored drafts", () => {
  assert.match(workspace, /savedDocumentsRef\.current\[documentType\] = document;[\s\S]*setSavedDocuments/);
  assert.match(workspace, /savedDocumentsRef\.current\[type\] = document;[\s\S]*setSavedDocuments/);
  assert.match(workspace, /businessDocumentRestoredSnapshotFingerprint\(document\)/);
});

test("issued result is canonical server evidence, not browser-local lifecycle authority", () => {
  const confirm = block("async function confirmGovernedQuoteIssue", "async function shareSavedDocument");
  assert.match(confirm, /issuedQuote: result\.issuedQuote/);
  assert.match(confirm, /canonicalQuote: result\.canonicalQuote/);
  assert.match(confirm, /result\.delivery/);
  assert.doesNotMatch(confirm, /localStorage|sessionStorage|setItem|workflow_quote_sent/);
  assert.match(workspace, /Waiting for customer response/);
  assert.doesNotMatch(confirm, /customerDecision:\s*"APPROVED"/);
});

test("failure and success copy remain truthful without exposing orchestration terminology", () => {
  assert.match(workspace, /We couldn't prepare this quote for sending/);
  assert.match(workspace, /Nothing was sent\. Your saved quote is unchanged\./);
  assert.match(workspace, /errorCode: error\?\.code \|\| "WORKING_QUOTE_CANONICAL_ISSUE_FAILED"/);
  assert.match(workspace, /The quote could not be sent yet/);
  assert.match(workspace, /prepared successfully, but sending it to the customer needs to be retried/);
  assert.match(workspace, /Retry Sending/);
  assert.match(workspace, /Quote sent to customer/);
  assert.match(workspace, /has been sent to.*for review/);
});

test("working-document delivery remains separate for Invoice and non-Job documents", () => {
  assert.match(workspace, /<DeliveryMenu kind=\{activeDocument\}/);
  assert.match(workspace, /deliverBusinessDocumentDraft/);
  assert.match(workspace, /Sending does not issue, accept, approve, pay, or close anything/);
  assert.match(workspace, /Save keeps this private working document for your business\. It does not send or issue anything\./);
});
