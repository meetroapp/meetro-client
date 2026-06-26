import test from "node:test";
import assert from "node:assert/strict";

import {
  getPricingForService,
  getPricingLibrary,
  getPricingLibraryReport,
  PRICING_GUIDANCE_DISCLAIMER,
  PRICING_LIBRARY_REGISTRY,
} from "../src/utils/pricingLibraryRegistry.js";

test("exports read-only pricing guidance for MVP service types", () => {
  const report = getPricingLibraryReport();

  assert.equal(report.readOnly, true);
  assert.equal(report.disclaimer, PRICING_GUIDANCE_DISCLAIMER);
  assert.ok(report.serviceTypes.includes("door_replacement"));
  assert.ok(report.serviceTypes.includes("drywall_repair"));
  assert.ok(report.serviceTypes.includes("cabinet_replacement"));
  assert.ok(report.serviceTypes.includes("tile_repair"));
  assert.ok(report.serviceTypes.includes("painting"));
  assert.ok(report.guidanceCount > report.serviceTypeCount);
});

test("lists Door Replacement pricing guidance", () => {
  const pricing = getPricingForService("door_replacement");

  assert.equal(pricing.serviceLabel, "Door Replacement");
  assert.equal(pricing.pricingModel, "Fixed labor range plus materials");
  assert.ok(pricing.guidance.includes("Labor range"));
  assert.ok(pricing.guidance.includes("Common material cost notes"));
  assert.ok(pricing.guidance.includes("Estimated time range"));
  assert.ok(pricing.guidance.includes("Pricing note"));
  assert.equal(pricing.disclaimer, PRICING_GUIDANCE_DISCLAIMER);
});

test("lists Drywall Repair pricing guidance", () => {
  const pricing = getPricingForService("drywall_repair");

  assert.equal(
    pricing.pricingModel,
    "Tiered by repair size and finish requirements"
  );
  assert.deepEqual(pricing.guidance, [
    "Small patch",
    "Medium repair",
    "Large repair",
    "Texture/paint note",
  ]);
});

test("lists Cabinet Replacement, Tile Repair, and Painting pricing guidance", () => {
  assert.deepEqual(getPricingForService("cabinet_replacement").guidance, [
    "Cabinet install labor",
    "Hardware/trim notes",
    "Sink cabinet note",
  ]);

  assert.deepEqual(getPricingForService("tile_repair").guidance, [
    "Per-square-foot labor note",
    "Grout/thinset note",
    "Minimum charge note",
  ]);

  assert.deepEqual(getPricingForService("painting").guidance, [
    "Room/area estimate note",
    "Prep/primer note",
    "Paint/material note",
  ]);
});

test("normalizes service lookups and fails safely for unknown services", () => {
  assert.equal(
    getPricingForService("Door Replacement").serviceType,
    "door_replacement"
  );
  assert.equal(getPricingForService("unknown_service"), null);
  assert.deepEqual(getPricingLibrary({ serviceType: "unknown_service" }), []);
});

test("registry definitions and read helpers are protected from caller mutation", () => {
  assert.throws(
    () => {
      PRICING_LIBRARY_REGISTRY.door_replacement.guidance.push("mutated");
    },
    {
      name: "TypeError",
    }
  );

  const pricing = getPricingForService("door_replacement");
  pricing.guidance.push("caller mutation");

  assert.ok(
    !getPricingForService("door_replacement").guidance.includes(
      "caller mutation"
    )
  );
});
