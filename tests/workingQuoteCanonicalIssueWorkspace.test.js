import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(
  new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
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

test("workspace saves first, then delegates bridge, issue, and exact canonical delivery to one bounded orchestrator", () => {
  const begin = block("async function beginGovernedQuoteIssue", "async function confirmGovernedQuoteIssue");
  const confirm = block("async function confirmGovernedQuoteIssue", "async function shareSavedDocument");
  assert.match(begin, /ensureCurrentDocumentSaved\("quote"\)/);
  assert.match(begin, /document\.id.*document\.version/s);
  assert.match(begin, /createWorkingQuoteCommandKeys/);
  assert.match(confirm, /issueAndSendWorkingQuote/);
  assert.match(confirm, /document: current\.document/);
  assert.match(confirm, /checkpoint: current\.checkpoint/);
  assert.match(confirm, /commandKeys: current\.commandKeys/);
  assert.match(confirm, /quoteIssueInFlightRef\.current/);
  assert.match(confirm, /finally[\s\S]*quoteIssueInFlightRef\.current = false/);
  assert.doesNotMatch(confirm, /approve|decline|payment|schedule|workstream|invoice|completeJob/);
});

test("review identity comes from the exact authorized Job projection, never draft labels", () => {
  const begin = block("async function beginGovernedQuoteIssue", "async function confirmGovernedQuoteIssue");
  assert.match(begin, /fetchAuthorizedProfessionalJobs\(\{ setPage \}\)/);
  assert.match(begin, /findAuthorizedProfessionalJob\([\s\S]*documentJobIds\.quote/);
  assert.match(begin, /customerName: authorizedJob\.customerLabel/);
  assert.match(begin, /projectTitle: authorizedJob\.title/);
  assert.match(begin, /jobId: authorizedJob\.jobId/);
  assert.doesNotMatch(begin, /customerName: (?:quote|document)/);
  assert.doesNotMatch(begin, /projectTitle: (?:quote|document)/);
});

test("review dialog shows customer, project, Quote, version, and USD total in business language", () => {
  const dialog = block("function QuoteIssueReviewDialog", "function NumberingSetupDialog");
  for (const label of ["Customer", "Project", "Quote", "Version", "Total"]) {
    assert.match(dialog, new RegExp(`<dt>${label}</dt>`));
  }
  assert.match(dialog, /state\.identity\?\.customerName/);
  assert.match(dialog, /state\.identity\?\.projectTitle/);
  assert.match(dialog, /displayDocumentNumber\(state\.document\)/);
  assert.match(dialog, /state\.document\?\.version/);
  assert.match(dialog, /money\(state\.total\).*USD/);
  assert.match(dialog, /Once sent, this quote will be available for the customer to review and accept/);
  assert.match(dialog, /Sending the quote does not mean the customer has accepted it or made a payment/);
  assert.doesNotMatch(dialog, /canonical Draft|governed version|commercial offer|Canonical Quote|Exact issued version/);
});

test("confirmation fails closed without authoritative identity and Cancel has no command authority", () => {
  const dialog = block("function QuoteIssueReviewDialog", "function NumberingSetupDialog");
  const confirm = block("async function confirmGovernedQuoteIssue", "async function shareSavedDocument");
  assert.match(dialog, /disabled: state\.busy \|\| !state\.document \|\| !state\.identity/);
  assert.match(dialog, /label: "Cancel", onClick: onCancel/);
  assert.doesNotMatch(dialog, /issueAndSendWorkingQuote|authFetch|fetch\(/);
  assert.match(confirm, /current\.identity\.jobId !== documentJobIds\.quote/);
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
