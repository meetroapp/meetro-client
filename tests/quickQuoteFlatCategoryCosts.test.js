import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  extractProfessionalCategoryCostCandidates,
} from "../src/utils/quickQuoteProfessionalCategoryCosts.js";
import {
  buildQuickQuoteEstimateInput,
} from "../src/utils/professionalJobPicker.js";

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const builder = readFileSync(
  new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
  "utf8"
);
const conversation = readFileSync(
  new URL("../src/components/QuickQuoteConversation.jsx", import.meta.url),
  "utf8"
);
const styles = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);

test("explicit professional flat totals become confirmation candidates in minor units", () => {
  const input = [
    "Purchase materials $40",
    "Labor $260.00",
    "Repair wall inside closet.",
  ].join("\n");

  assert.deepEqual(extractProfessionalCategoryCostCandidates(input), {
    costs: [
      { classification: "MATERIAL", totalCostMinor: 4000 },
      { classification: "LABOR", totalCostMinor: 26000 },
    ],
    conflicts: [],
  });
});

test("confirmed category costs preserve exact text and never create Quote pricing state", () => {
  const professionalInput =
    "  Materials total $40. Labor total $260.00. Repair wall.  ";
  const categoryCosts = [
    { classification: "MATERIAL", totalCostMinor: 4000 },
    { classification: "LABOR", totalCostMinor: 26000 },
  ];

  const input = buildQuickQuoteEstimateInput({
    jobId: JOB_ID,
    professionalInput,
    professionalCategoryCosts: categoryCosts,
  });

  assert.equal(input.professionalInstructions, professionalInput);
  assert.deepEqual(input.professionalCategoryCosts, categoryCosts);
  assert.deepEqual(input.costInputs, []);
  assert.equal(input.sellingPriceMinor, null);
  for (const forbidden of [
    "pricingInputs",
    "totalOverride",
    "lineItems",
    "canonicalCandidate",
  ]) {
    assert.equal(Object.hasOwn(input, forbidden), false);
  }
});

test("conflicting repeated category totals fail closed for professional clarification", () => {
  assert.deepEqual(
    extractProfessionalCategoryCostCandidates(
      "Materials $40 total. Materials $55 total. Labor $260 total."
    ),
    {
      costs: [{ classification: "LABOR", totalCostMinor: 26000 }],
      conflicts: ["MATERIAL"],
    }
  );
});

test("Internal Estimate confirmation and private category presentation are explicit", () => {
  assert.match(conversation, /costConfirmation/);
  assert.match(conversation, /copy\.costsFromDetails/);
  assert.match(conversation, /copy\.confirmAmounts/);
  assert.match(builder, /professionalCategoryCosts/);
  assert.match(builder, /copy\.professionalMaterialsTotal/);
  assert.match(builder, /copy\.professionalLaborTotal/);
  assert.match(builder, /copy\.materialsNotItemized/);
  assert.match(builder, /copy\.laborNotItemized/);
  assert.match(builder, /copy\.internalCostSummary/);
  assert.match(builder, /copy\.customerQuotePricingSeparate/);
});

test("flat-total presentation does not render category amounts as rates, hours, or quantities", () => {
  const start = builder.indexOf("function EstimateAssistantResult");
  const end = builder.indexOf("const page =", start);
  const resultView = builder.slice(start, end);
  assert.match(resultView, /professionalCategoryCosts/);
  assert.doesNotMatch(resultView, /professionalCategoryCosts[\s\S]{0,200}(?:unitCostMinor|hoursPerWorker|crewCount)/);
});

test("Confirm amounts keeps a readable full-width touch target", () => {
  const rule = styles.match(
    /\.quick-quote-cost-confirmation\s*>\s*\.quick-quote-primary-action\s*\{([^}]*)\}/
  );

  assert.ok(rule, "expected a cost-confirmation primary-action rule");
  assert.match(rule[1], /display:\s*inline-flex/);
  assert.match(rule[1], /align-items:\s*center/);
  assert.match(rule[1], /justify-content:\s*center/);
  assert.match(rule[1], /box-sizing:\s*border-box/);
  assert.match(rule[1], /inline-size:\s*100%/);
  assert.match(rule[1], /max-inline-size:\s*100%/);
  assert.match(rule[1], /min-height:\s*(?:4[4-9]|[5-9][0-9])px/);
  assert.match(rule[1], /padding:\s*12px\s+18px/);
  assert.match(rule[1], /text-align:\s*center/);
});
