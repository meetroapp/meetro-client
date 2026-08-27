import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildQuickQuoteConversationProposal,
  quoteConversationProposalFingerprint,
} from "../src/utils/quickQuoteConversationDraft.js";
import {
  calculateQuoteDeposit,
  quoteCustomerPricingProjection,
  quoteDepositTerms,
} from "../src/utils/quotePricingPresentation.js";
import {
  buildBusinessDocumentSavePayload,
  restoreBusinessDocumentDraft,
} from "../src/utils/businessDocumentPersistence.js";
import { buildQuickQuoteDocumentModel } from "../src/utils/customerDocumentModel.js";
import { collectCustomerDocumentText } from "../src/utils/customerDocumentPdf.js";

const current = Object.freeze({
  customerName: "Meetro Stage B",
  projectDescription: "Customer concern remains separate.",
  recommendedSolution: "Repair the cabinet and damaged trim.",
  lineItems: [],
  materialItems: [],
  laborItems: [],
  totalOverride: "",
});

function proposal(instruction, baseline = current) {
  return buildQuickQuoteConversationProposal({ prompt: instruction, current: baseline });
}

test("comma, conjunction, sentence, and reversed pricing instructions preserve labor and materials", () => {
  for (const instruction of [
    "Labor 500, materials 180",
    "Labor is 500 and materials are 180",
    "Labor 500. Materials 180.",
    "Materials 180, labor 500",
  ]) {
    const result = proposal(instruction);
    assert.equal(result.patch.laborItems[0].total, "500", instruction);
    assert.equal(result.patch.materialItems[0].total, "180", instruction);
    assert.equal(result.pricing.total, 680, instruction);
    assert.deepEqual(result.unrecognizedSegments, [], instruction);
  }
});

test("one instruction preserves price, deposit, duration, and display preferences", () => {
  const result = proposal(
    "Labor 500, materials 180, 75 percent deposit, two-day job, and don't show the breakdown"
  );
  assert.equal(result.patch.laborItems[0].total, "500");
  assert.equal(result.patch.materialItems[0].total, "180");
  assert.equal(result.patch.depositMode, "PERCENT");
  assert.equal(result.patch.depositPercent, "75");
  assert.equal(result.patch.estimatedDuration, "2 day");
  assert.equal(result.patch.pricingDisplayMode, "TOTAL_ONLY");
  assert.equal(result.patch.materialsDisplayMode, "INCLUDED_IN_TOTAL");
  assert.equal(result.pricing.deposit.due, 510);
  assert.equal(result.pricing.deposit.remaining, 170);
  assert.deepEqual(result.unrecognizedSegments, []);
});

test("required natural display instructions are fully recognized without negation residue", () => {
  const cases = [
    ["Show labor and materials separately.", "SHOW_SEPARATELY"],
    ["Do not show materials separately.", "INCLUDED_IN_TOTAL"],
    ["Include materials in the total.", "INCLUDED_IN_TOTAL"],
  ];
  for (const [instruction, materialsDisplayMode] of cases) {
    const result = proposal(instruction);
    assert.equal(result.patch.materialsDisplayMode, materialsDisplayMode);
    assert.deepEqual(result.unrecognizedSegments, [], instruction);
  }
});

test("customer total, internal costs, deposit, duration, and hidden breakdown coexist", () => {
  const result = proposal(
    "Quote customer 680 total. Internally labor 500 and materials 180. Don't show the breakdown."
  );
  assert.equal(result.patch.totalOverride, "680");
  assert.equal(result.patch.laborItems[0].total, "500");
  assert.equal(result.patch.materialItems[0].total, "180");
  assert.equal(result.patch.pricingDisplayMode, "TOTAL_ONLY");
  assert.deepEqual(result.unrecognizedSegments, []);

  const combined = proposal(
    "Make the total 950, 50% deposit, two-day job, and do not show the breakdown."
  );
  assert.equal(combined.patch.totalOverride, "950");
  assert.equal(combined.patch.depositPercent, "50");
  assert.equal(combined.patch.estimatedDuration, "2 day");
  assert.equal(combined.patch.pricingDisplayMode, "TOTAL_ONLY");
  assert.deepEqual(combined.unrecognizedSegments, []);
});

test("natural total-only Quote does not invent a labor/material split", () => {
  const result = proposal(
    "Total project price 950, labor and standard materials included, 75% deposit, don't show the breakdown"
  );
  assert.equal(result.patch.totalOverride, "950");
  assert.equal(result.patch.pricingDisplayMode, "TOTAL_ONLY");
  assert.equal(result.patch.materialsDisplayMode, "INCLUDED_IN_TOTAL");
  assert.equal(Object.hasOwn(result.patch, "laborItems"), false);
  assert.equal(Object.hasOwn(result.patch, "materialItems"), false);
  assert.equal(result.pricing.total, 950);
  assert.equal(result.pricing.deposit.due, 712.5);
  assert.equal(result.pricing.deposit.remaining, 237.5);
});

test("recognized changes survive while unsupported segments are surfaced", () => {
  const result = proposal("Labor 500, materials 180, make it sparkle financially");
  assert.equal(result.patch.laborItems[0].total, "500");
  assert.equal(result.patch.materialItems[0].total, "180");
  assert.deepEqual(result.unrecognizedSegments, ["make it sparkle financially"]);
});

test("proposal creation is immutable, preserves unrelated scope, and has a stale baseline fingerprint", () => {
  const before = JSON.stringify(current);
  const result = proposal("Labor 500, materials 180");
  assert.equal(JSON.stringify(current), before);
  assert.equal(Object.hasOwn(result.patch, "recommendedSolution"), false);
  assert.equal(result.baselineFingerprint, quoteConversationProposalFingerprint(current));
  assert.notEqual(
    result.baselineFingerprint,
    quoteConversationProposalFingerprint({ ...current, recommendedSolution: "Changed while reviewing" })
  );
});

test("pricing display changes customer rows without deleting internal costing or changing total", () => {
  const base = {
    laborItems: [{ description: "Labor", total: "500" }],
    materialItems: [{ name: "Materials", total: "180" }],
  };
  const totalOnly = quoteCustomerPricingProjection({
    ...base,
    pricingDisplayMode: "TOTAL_ONLY",
    materialsDisplayMode: "INCLUDED_IN_TOTAL",
  });
  const categories = quoteCustomerPricingProjection({
    ...base,
    pricingDisplayMode: "CATEGORY_BREAKDOWN",
    materialsDisplayMode: "SHOW_SEPARATELY",
  });
  const detailed = quoteCustomerPricingProjection({
    ...base,
    pricingDisplayMode: "DETAILED_LINE_ITEMS",
    materialsDisplayMode: "SHOW_SEPARATELY",
  });
  assert.equal(totalOnly.total, 680);
  assert.equal(categories.total, 680);
  assert.equal(detailed.total, 680);
  assert.deepEqual(totalOnly.customerRows, []);
  assert.equal(totalOnly.internal.laborTotal, 500);
  assert.equal(totalOnly.internal.materialTotal, 180);
  assert.deepEqual(categories.customerRows.map((row) => row.description), ["Labor", "Materials"]);
  assert.deepEqual(detailed.customerRows.map((row) => row.description), ["Labor", "Materials"]);
});

test("materials modes distinguish inclusion, separate display, and customer-provided responsibility", () => {
  const base = {
    pricingDisplayMode: "TOTAL_ONLY",
    laborItems: [{ description: "Labor", total: "500" }],
    materialItems: [{ name: "Materials", total: "180" }],
  };
  const included = quoteCustomerPricingProjection({ ...base, materialsDisplayMode: "INCLUDED_IN_TOTAL" });
  const separate = quoteCustomerPricingProjection({ ...base, pricingDisplayMode: "CATEGORY_BREAKDOWN", materialsDisplayMode: "SHOW_SEPARATELY" });
  const customerProvides = quoteCustomerPricingProjection({ ...base, materialsDisplayMode: "CUSTOMER_PROVIDES" });
  assert.equal(included.inclusionNote, "Labor and standard materials included");
  assert.equal(separate.customerRows.some((row) => row.description === "Materials"), true);
  assert.equal(customerProvides.inclusionNote, "Customer to provide materials");
  assert.equal(customerProvides.total, 500);
  assert.equal(customerProvides.internal.materialTotal, 180);
  const parsed = proposal("Customer will provide materials, labor 500");
  assert.equal(parsed.patch.materialsDisplayMode, "CUSTOMER_PROVIDES");
  assert.equal(Object.hasOwn(parsed.patch, "materialItems"), false);
});

test("deposit options calculate safely without implying payment", () => {
  assert.deepEqual(calculateQuoteDeposit(680, { depositMode: "NONE" }), {
    valid: true, mode: "NONE", due: 0, remaining: 680,
  });
  assert.equal(calculateQuoteDeposit(680, { depositMode: "PERCENT", depositPercent: 25 }).due, 170);
  assert.equal(calculateQuoteDeposit(680, { depositMode: "PERCENT", depositPercent: 50 }).due, 340);
  assert.equal(calculateQuoteDeposit(680, { depositMode: "PERCENT", depositPercent: 75 }).due, 510);
  assert.equal(calculateQuoteDeposit(680, { depositMode: "PERCENT", depositPercent: 33.3 }).due, 226.44);
  assert.equal(calculateQuoteDeposit(680, { depositMode: "FIXED", depositFixedAmount: 200 }).due, 200);
  assert.equal(calculateQuoteDeposit(680, { depositMode: "PERCENT", depositPercent: 101 }).valid, false);
  assert.equal(calculateQuoteDeposit(680, { depositMode: "FIXED", depositFixedAmount: -1 }).valid, false);
  assert.equal(calculateQuoteDeposit(680, { depositMode: "FIXED", depositFixedAmount: 681 }).valid, false);
  assert.match(quoteDepositTerms({ depositMode: "PERCENT", depositPercent: 75 }, 680), /510\.00.*170\.00/);
});

test("total-only customer model and PDF text hide internal rows but show inclusion and deposit", () => {
  const pricing = quoteCustomerPricingProjection({
    pricingDisplayMode: "TOTAL_ONLY",
    materialsDisplayMode: "INCLUDED_IN_TOTAL",
    depositMode: "PERCENT",
    depositPercent: "75",
    totalOverride: "950",
    laborItems: [{ description: "Internal labor basis", total: "700" }],
    materialItems: [{ name: "Internal material basis", total: "250" }],
  });
  const model = buildQuickQuoteDocumentModel({
    customerName: "Customer",
    projectTitle: "Cabinet repair",
    recommendedSolution: "Repair the cabinet.",
    fixedPrice: true,
    lineItems: pricing.customerRows,
    total: pricing.total,
    pricingNote: pricing.inclusionNote,
    depositDue: pricing.deposit.due,
    remainingBalance: pricing.deposit.remaining,
    depositLabel: "75% deposit due on approval",
  }, { branding: { businessName: "Business" } });
  const text = collectCustomerDocumentText(model);
  assert.doesNotMatch(text, /Internal labor basis|Internal material basis/);
  assert.match(text, /Labor and standard materials included/);
  assert.match(text, /75% deposit due on approval/);
  assert.equal(model.totalMinor, 95000);
});

test("pricing and deposit settings survive JSON save and restore without schema authority", () => {
  const content = {
    customerName: "Customer",
    projectTitle: "Project",
    totalOverride: "950",
    pricingDisplayMode: "TOTAL_ONLY",
    materialsDisplayMode: "INCLUDED_IN_TOTAL",
    depositMode: "PERCENT",
    depositPercent: "75",
    depositFixedAmount: "",
    lineItems: [], materialItems: [], laborItems: [],
  };
  const payload = buildBusinessDocumentSavePayload({
    documentType: "quote", content, turns: [], manualOverrides: {}, photos: [],
  });
  const restored = restoreBusinessDocumentDraft({
    id: "11111111-1111-4111-8111-111111111111",
    documentType: "QUOTE",
    status: "WORKING_DRAFT",
    reference: "Q-TEST",
    version: 1,
    content: payload.content,
    workspace: payload.workspace,
    photos: [],
  });
  assert.equal(restored.content.pricingDisplayMode, "TOTAL_ONLY");
  assert.equal(restored.content.materialsDisplayMode, "INCLUDED_IN_TOTAL");
  assert.equal(restored.content.depositMode, "PERCENT");
  assert.equal(restored.content.depositPercent, "75");
});

test("workspace uses a presentation-only proposal and explicit Apply/Edit/Dismiss authority", () => {
  const source = readFileSync(
    new URL("../src/components/UnifiedBusinessDocumentWorkspace.jsx", import.meta.url),
    "utf8"
  );
  const proposalGate = source.slice(
    source.indexOf('resolution.capability === "DOCUMENT_MUTATION"'),
    source.indexOf("let turnId = existingId")
  );
  assert.match(proposalGate, /setPendingQuoteProposal/);
  assert.doesNotMatch(proposalGate, /setTurns|reconcileDocument|onApplyQuotePatch|saveDocument/);
  assert.match(source, /Nothing changes until you apply/);
  assert.match(source, />Apply</);
  assert.match(source, /\{editing \? "Review" : "Edit"\}/);
  assert.match(source, />Dismiss</);
  assert.match(source, /quoteConversationProposalFingerprint\(current\)/);
  assert.match(source, /quoteProposalApplyInFlightRef\.current/);
  assert.match(source, /The Quote remains unsaved/);
  assert.doesNotMatch(source.slice(source.indexOf("function applyQuoteProposal"), source.indexOf("function focusComposer")), /saveDocument|issueAndSend|createBusinessDocumentDraft|deliverBusinessDocumentDraft|recordPayment/i);
});
