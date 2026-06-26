import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCustomerTotal,
  calculateLaborTotal,
  calculateMaterialsTotal,
  normalizeLaborPricingType,
  normalizePricingModel,
} from "../src/utils/pricingCalculations.js";

test("flat fee labor total uses labor fee", () => {
  assert.equal(
    calculateLaborTotal({ laborPricingType: "flat_fee", laborFee: "450" }),
    450
  );
});

test("hourly labor total uses hours times rate", () => {
  assert.equal(
    calculateLaborTotal({ laborPricingType: "hourly", laborHours: "3.5", laborRate: "80" }),
    280
  );
});

test("known labor pricing labels normalize to shared types", () => {
  assert.equal(normalizeLaborPricingType("Flat Fee"), "flat_fee");
  assert.equal(normalizeLaborPricingType("Fixed Price"), "flat_fee");
  assert.equal(normalizeLaborPricingType("Materials + Labor"), "hourly");
});

test("materials total supports line item quantities and unit prices", () => {
  assert.equal(
    calculateMaterialsTotal({
      materialLineItems: [
        { quantity: 2, unitPrice: 35 },
        { quantity: "1", cost: "15" },
      ],
    }),
    85
  );
});

test("customer total combines labor materials fees discount and tax", () => {
  assert.equal(
    calculateCustomerTotal({
      laborPricingType: "flat_fee",
      laborFee: 250,
      materials: 75,
      serviceFee: 25,
      discount: 20,
      tax: 8,
    }),
    338
  );
});

test("legacy records infer flat-fee labor from total minus materials", () => {
  const pricing = normalizePricingModel({
    total: 560,
    materials: 310,
    laborHours: 4,
  });

  assert.equal(pricing.laborPricingType, "flat_fee");
  assert.equal(pricing.laborTotal, 250);
  assert.equal(pricing.materialsTotal, 310);
  assert.equal(pricing.customerTotal, 560);
  assert.equal(pricing.legacyLaborInferred, true);
});
