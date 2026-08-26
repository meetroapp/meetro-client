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

test("Job-linked Quote workspace exposes one reviewed governed Issue & Send action", () => {
  assert.match(workspace, /Issue & Send Quote/);
  assert.match(workspace, /activeDocument === "quote" && documentJobIds\.quote/);
  assert.match(workspace, /beginGovernedQuoteIssue/);
  assert.match(workspace, /Review Issue & Send Quote/);
  assert.match(workspace, /Exact saved version/);
  assert.match(workspace, /Issuance creates the customer-facing commercial offer/);
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

test("issued result is canonical server evidence, not browser-local lifecycle authority", () => {
  const confirm = block("async function confirmGovernedQuoteIssue", "async function shareSavedDocument");
  assert.match(confirm, /result\.issuedQuote\.currentVersion/);
  assert.match(confirm, /result\.delivery/);
  assert.doesNotMatch(confirm, /localStorage|sessionStorage|setItem|workflow_quote_sent/);
  assert.match(workspace, /Waiting for customer decision/);
  assert.doesNotMatch(confirm, /customerDecision:\s*"APPROVED"/);
});

test("failure copy distinguishes bridge or issue failure from post-issue delivery retry", () => {
  assert.match(workspace, /The Quote remains issued as version/);
  assert.match(workspace, /retrying will not reissue it/);
  assert.match(workspace, /Retry Delivery/);
  assert.match(workspace, /Commercial issuance succeeded/);
  assert.match(workspace, /Nothing was issued or sent/);
});

test("working-document delivery remains separate for Invoice and non-Job documents", () => {
  assert.match(workspace, /<DeliveryMenu kind=\{activeDocument\}/);
  assert.match(workspace, /deliverBusinessDocumentDraft/);
  assert.match(workspace, /Sending does not issue, accept, approve, pay, or close anything/);
  assert.match(workspace, /Save keeps this private working document for your business\. It does not send or issue anything\./);
});
