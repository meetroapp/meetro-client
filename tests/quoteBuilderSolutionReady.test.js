import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildQuoteCompositionInput,
  getSolutionReadyReviewElements,
} from "../src/utils/quoteBuilderIntelligenceBoundary.js";

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const ESTIMATE_ID = "22222222-2222-4222-8222-222222222222";

test("Solution Ready sends only Estimate identity plus separately explicit Quote inputs", () => {
  const input = buildQuoteCompositionInput({
    jobId: JOB_ID,
    estimateProposalId: ESTIMATE_ID,
    professionalInstructions: "Prepare the reviewed solution.",
    lineItems: [
      {
        description: "Customer-facing wall repair",
        quantity: "1",
        unitPrice: "2650",
        total: "",
      },
    ],
    materialRows: [
      {
        name: "Drywall",
        quantity: "1",
        cost: "700",
        effectiveUnitCostMinor: 70000,
        retailerReference: { retailer: "HOME_DEPOT" },
      },
    ],
    laborRows: [
      {
        description: "Installation",
        hours: "8",
        rate: "75",
        professionalOverride: { unitCostMinor: 195000 },
      },
    ],
    internalEstimate: {
      internalCost: { totalMinor: 265000 },
      suggestedSellingRange: { minimumMinor: 265000 },
      professionalSellingPriceMinor: 265000,
      estimatedCostMinor: 265000,
    },
    materialProvider: "Professional Provides",
    availability: "3–4 days",
  });

  assert.equal(input.estimateProposalId, ESTIMATE_ID);
  assert.deepEqual(input.pricingInputs, [
    {
      key: "service_0",
      classification: "LABOR_SERVICE",
      amountMinor: 265000,
      quantity: 1,
    },
  ]);
  assert.equal(input.terms.confirmedTotalMinor, 265000);

  const serialized = JSON.stringify(input);
  for (const forbidden of [
    "reviewedEstimate",
    "internalCost",
    "suggestedSellingRange",
    "retailerReference",
    "effectiveUnitCostMinor",
    "estimatedCostMinor",
    "professionalOverride",
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbidden));
  }
});

test("Internal material and labor costs never become Quote pricing inputs", () => {
  const input = buildQuoteCompositionInput({
    jobId: JOB_ID,
    lineItems: [],
    materialRows: [{ name: "Door", quantity: "1", cost: "450" }],
    laborRows: [{ description: "Installation", hours: "1", rate: "280" }],
    materialProvider: "Professional Provides",
  });

  assert.deepEqual(input.pricingInputs, []);
  assert.equal(input.terms.confirmedTotalMinor, undefined);
});

test("Solution Ready records only visibly presented server-owned Estimate element IDs", () => {
  const elements = getSolutionReadyReviewElements({
    materials: [
      { id: "wall_material", description: "Drywall" },
      { id: "", description: "Missing server identity" },
    ],
    labor: [{ id: "repair_labor", description: "Repair labor" }],
    assumptions: [{ id: "hidden_assumption", text: "Not presented" }],
    customerQuoteDraft: {
      id: "customer_quote_draft",
      customerWording: "Repair the wall.",
    },
  });

  assert.deepEqual(
    elements.map((item) => item.id),
    ["wall_material", "repair_labor", "customer_quote_draft"]
  );
});

test("QuoteBuilder preserves explicit Solution Ready, rejection, direct Prepare Quote, and canonical Draft handoff", () => {
  const source = readFileSync(
    new URL("../src/pages/QuoteBuilder.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /async function markEstimateSolutionReady/);
  assert.match(source, /estimateProposalId:\s*proposal\.proposalId/);
  assert.match(source, /action:\s*"ACCEPTED"/);
  assert.match(source, /action:\s*"REJECTED"/);
  assert.match(source, /id:\s*"quote"[\s\S]*prepareQuote/);
  assert.match(source, /applyConfirmedQuoteComposition/);

  const solutionReady = source.slice(
    source.indexOf("async function markEstimateSolutionReady"),
    source.indexOf("async function handleUseQuoteComposition")
  );
  assert.doesNotMatch(solutionReady, /setTotalOverride|setMaterialRows|setLaborRows|setRecommendedSolution|setNotes|setTerms|setTimeline/);
  assert.doesNotMatch(solutionReady, /suggestedSellingRange|professionalSellingPriceMinor|effectiveUnitCostMinor|professionalOverride/);
});

test("Solution Ready and Create Quote copy exists in every supported workflow locale", () => {
  const source = readFileSync(
    new URL("../src/utils/askMeetroWorkflowLanguage.js", import.meta.url),
    "utf8"
  );

  assert.equal((source.match(/\bsolutionReady:/g) || []).length, 4);
  assert.equal((source.match(/\bcreateQuote:/g) || []).length, 4);
});
