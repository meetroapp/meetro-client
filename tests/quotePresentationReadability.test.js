import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildQuickQuoteConversationProposal } from "../src/utils/quickQuoteConversationDraft.js";
import { quoteCustomerPricingProjection } from "../src/utils/quotePricingPresentation.js";

const workspace = readFileSync(
  new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(
  new URL("../src/components/UnifiedBusinessDocumentWorkspace.css", import.meta.url),
  "utf8"
);

const proposalMarkup = workspace.slice(
  workspace.indexOf("function QuoteProposalReview"),
  workspace.indexOf("function SavedFilesDrawer")
);
const proposalStyles = styles.slice(
  styles.indexOf(".business-document-proposal {")
);
const previewStyles = styles.slice(
  styles.indexOf(".business-live-document {"),
  styles.indexOf(".business-document-actions {")
);

test("proposal review presents one semantic vertical hierarchy with one action set", () => {
  assert.equal((proposalMarkup.match(/>Proposed Quote changes</g) || []).length, 1);
  assert.equal((proposalMarkup.match(/Nothing changes until you apply\./g) || []).length, 1);
  assert.match(proposalMarkup, /QuoteProposalRows title="Pricing"/);
  assert.match(proposalMarkup, /QuoteProposalRows title="Customer Quote"/);
  assert.match(proposalMarkup, /QuoteProposalRows title="Payment"/);
  assert.match(proposalMarkup, /<strong>Not applied<\/strong>/);
  assert.match(proposalMarkup, />Apply<\/button>[\s\S]*\{editing \? "Review" : "Edit"\}<\/button>[\s\S]*>Dismiss<\/button>/);
  assert.equal((proposalMarkup.match(/>Apply<\/button>/g) || []).length, 1);
  assert.equal((proposalMarkup.match(/>Dismiss<\/button>/g) || []).length, 1);
});

test("proposal truth remains complete for the live R6H QA instruction", () => {
  const proposal = buildQuickQuoteConversationProposal({
    prompt: "Labor 500, materials 180, 75% deposit, don't show the breakdown.",
    current: { lineItems: [], laborItems: [], materialItems: [] },
  });
  const changes = new Map(proposal.recognizedChanges.map((change) => [change.field, change.value]));
  assert.equal(changes.get("laborItems"), 500);
  assert.equal(changes.get("materialItems"), 180);
  assert.equal(changes.get("calculatedTotal"), 680);
  assert.equal(changes.get("pricingDisplayMode"), "TOTAL_ONLY");
  assert.equal(changes.get("materialsDisplayMode"), "INCLUDED_IN_TOTAL");
  assert.equal(changes.get("depositPercent"), "75%");
  assert.equal(changes.get("depositDue"), 510);
  assert.equal(changes.get("remainingBalance"), 170);
});

test("proposal layout stays conversational and contains narrow widths", () => {
  assert.match(proposalStyles, /container-type:\s*inline-size/);
  assert.match(proposalStyles, /business-document-proposal-sections[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(proposalStyles, /business-document-proposal-section dl div[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.match(proposalStyles, /@container \(max-width: 280px\)/);
  assert.match(proposalStyles, /overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(proposalStyles, /auto-fit|minmax\(145px/);
});

test("customer preview has readable hierarchy, structured payment, and emphasized price", () => {
  assert.match(previewStyles, /business-document-copy p,[\s\S]*font-size:\s*13\.5px;[\s\S]*line-height:\s*1\.5/);
  assert.match(previewStyles, /business-document-meta dd[\s\S]*font-size:\s*13px/);
  assert.match(previewStyles, /business-document-table \.total strong[\s\S]*font-size:\s*18px/);
  assert.match(previewStyles, /business-document-payment-summary > div span[\s\S]*font-size:\s*13\.5px/);
  assert.match(workspace, /className="business-document-payment-summary"/);
  assert.match(workspace, /due on approval/);
  assert.match(workspace, /remaining<\/span>/);
  for (const label of ["Customer concern", "Scope of Work", "TOTAL PROJECT PRICE", "Payment Terms", "Estimated Duration", "Acceptance / Status"]) {
    assert.match(workspace, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("all pricing and materials modes preserve customer truth after visual changes", () => {
  const base = {
    laborItems: [{ description: "Internal Labor", total: "500" }],
    materialItems: [{ name: "Internal Materials", total: "180" }],
    depositMode: "PERCENT",
    depositPercent: "75",
  };
  const totalOnly = quoteCustomerPricingProjection({ ...base, pricingDisplayMode: "TOTAL_ONLY", materialsDisplayMode: "INCLUDED_IN_TOTAL" });
  const categories = quoteCustomerPricingProjection({ ...base, pricingDisplayMode: "CATEGORY_BREAKDOWN", materialsDisplayMode: "SHOW_SEPARATELY" });
  const detailed = quoteCustomerPricingProjection({ ...base, pricingDisplayMode: "DETAILED_LINE_ITEMS", materialsDisplayMode: "SHOW_SEPARATELY" });
  const customerProvides = quoteCustomerPricingProjection({ ...base, pricingDisplayMode: "TOTAL_ONLY", materialsDisplayMode: "CUSTOMER_PROVIDES" });

  assert.deepEqual(totalOnly.customerRows, []);
  assert.equal(totalOnly.total, 680);
  assert.equal(totalOnly.inclusionNote, "Labor and standard materials included");
  assert.equal(totalOnly.deposit.due, 510);
  assert.deepEqual(categories.customerRows.map((row) => row.description), ["Labor", "Materials"]);
  assert.deepEqual(detailed.customerRows.map((row) => row.description), ["Internal Labor", "Internal Materials"]);
  assert.equal(customerProvides.total, 500);
  assert.equal(customerProvides.inclusionNote, "Customer to provide materials");
});

test("proposal generation remains presentation-only before Apply", () => {
  const proposalGate = workspace.slice(
    workspace.indexOf('resolution.capability === "DOCUMENT_MUTATION"'),
    workspace.indexOf("let turnId = existingId")
  );
  assert.match(proposalGate, /setPendingQuoteProposal/);
  assert.doesNotMatch(proposalGate, /setTurns|reconcileDocument|onApplyQuotePatch|saveDocument/);
});
