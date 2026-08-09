import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { calculateInvoiceTotals } from "../src/utils/invoiceCalculations.js";
import { normalizePricingModel } from "../src/utils/pricingCalculations.js";
import {
  BUSINESS_TOOL_STATUS,
  getBusinessToolAuditRows,
  getBusinessToolById,
} from "../src/utils/businessToolsRegistry.js";
import {
  validateHiringPositionDraft,
  normalizeHiringPositionDraft,
} from "../src/utils/hiringCenterRegistry.js";

const readSource = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const sources = {
  app: readSource("src/App.jsx"),
  header: readSource("src/components/BusinessToolsPageHeader.jsx"),
  dashboard: readSource("src/pages/BusinessDashboard.jsx"),
  tools: readSource("src/pages/BusinessCommandCenter.jsx"),
  availability: readSource("src/pages/BusinessAvailability.jsx"),
  hiring: readSource("src/pages/HiringCenter.jsx"),
  pricing: readSource("src/pages/PricingLibrary.jsx"),
  quote: readSource("src/pages/QuoteBuilder.jsx"),
  invoice: readSource("src/pages/InvoiceBuilder.jsx"),
  reports: readSource("src/pages/ReportsCenter.jsx"),
  leads: readSource("src/pages/BusinessLeads.jsx"),
  intelligence: readSource("src/pages/BusinessIntelligence.jsx"),
  compliance: readSource("src/pages/ComplianceCenter.jsx"),
  profile: readSource("src/pages/ContractorProfile.jsx"),
  portfolio: readSource("src/pages/ProjectGallery.jsx"),
  serviceTypes: readSource("src/pages/ServiceTypesEvaluations.jsx"),
  assetCenter: readSource("src/pages/AssetCenter.jsx"),
  doc: readSource("docs/KnowledgeBase/BUSINESS_OPERATIONS_DISTRICT_WONDER_PASS.md"),
};

test("Business Operations district uses Community visual constitution classes", () => {
  assert.match(sources.header, /meetro-visual-hero/);
  assert.match(sources.tools, /meetro-visual-page/);
  assert.match(sources.tools, /meetro-visual-surface/);
  assert.match(sources.availability, /meetro-visual-page/);
  assert.match(sources.availability, /meetro-visual-primary-button/);
  assert.match(sources.hiring, /meetro-visual-page/);
  assert.match(sources.pricing, /meetro-visual-surface/);
  assert.match(sources.reports, /meetro-visual-surface/);
  assert.match(sources.intelligence, /meetro-visual-surface/);
});

test("Business Operations primary actions use forest operational styling", () => {
  [
    sources.dashboard,
    sources.tools,
    sources.availability,
    sources.leads,
    sources.profile,
    sources.portfolio,
    sources.compliance,
  ].forEach((source) => {
    assert.match(source, /var\(--meetro-gradient-community-action/);
    assert.match(source, /var\(--meetro-color-forest/);
  });

  assert.match(sources.quote, /var\(--meetro-color-forest/);
  assert.match(sources.quote, /quoteSavingDeliveryUnavailable/);
  assert.match(sources.invoice, /var\(--meetro-color-forest/);
  assert.match(sources.invoice, /Invoice saving and delivery are not available yet\./);
});

test("Business Operations removes legacy purple primary treatments", () => {
  const districtSource = [
    sources.dashboard,
    sources.tools,
    sources.availability,
    sources.hiring,
    sources.pricing,
    sources.quote,
    sources.invoice,
    sources.reports,
    sources.leads,
    sources.intelligence,
    sources.compliance,
    sources.profile,
    sources.portfolio,
  ].join("\n");

  assert.doesNotMatch(districtSource, /linear-gradient\([^;\n]*(#5b3df5|#7c3aed|#4f46e5|#4338ca)/);
  assert.doesNotMatch(districtSource, /background:\s*"#5b3df5"/);
  assert.doesNotMatch(districtSource, /background:\s*"#4338ca"/);
});

test("Business Operations routes remain existing app destinations", () => {
  [
    "businessCommandCenter",
    "businessAvailability",
    "hiringCenter",
    "pricingLibrary",
    "quoteBuilder",
    "invoiceBuilder",
    "contractTemplates",
    "reportsCenter",
    "businessIntelligence",
    "businessLeads",
    "contractorProfile",
    "projectGallery",
  ].forEach((route) => {
    assert.match(sources.app, new RegExp(`if \\(page === "${route}"\\)`));
  });

  assert.equal(getBusinessToolById("quickQuote").route, "quoteBuilder");
  assert.equal(getBusinessToolById("quickInvoice").route, "invoiceBuilder");
  assert.equal(getBusinessToolById("availability").route, "businessAvailability");
  assert.ok(
    getBusinessToolAuditRows().every((tool) =>
      tool.status === BUSINESS_TOOL_STATUS.COMING_SOON ? tool.route === null : true
    )
  );
});

test("Business logic utilities preserve pricing, invoice, hiring, and availability behavior", () => {
  const pricingTotal = normalizePricingModel({
    laborPricingType: "flat_fee",
    laborFee: 250,
    materialCost: 100,
    discount: 25,
    tax: 15,
  });
  assert.equal(pricingTotal.customerTotal, 340);

  const invoiceTotals = calculateInvoiceTotals({
    lineItems: [{ description: "Repair", quantity: 2, unitPrice: 75 }],
    laborPricingType: "flat_fee",
    laborFee: 100,
    materials: 50,
    tax: 15,
  });
  assert.equal(invoiceTotals.totalDue, 165);

  assert.equal(
    validateHiringPositionDraft({
      title: "Apprentice",
      description: "Help with field work",
      serviceArea: "Cape Coral",
      employmentType: "Contract",
    }, { requireOwnership: false }).valid,
    true
  );
  assert.equal(
    normalizeHiringPositionDraft({
      title: "Apprentice",
      description: "Help with field work",
      serviceArea: "Cape Coral",
    }).status,
    "Draft"
  );

  assert.match(sources.availability, /readBusinessAvailability/);
  assert.match(sources.availability, /setBusinessAvailability/);
  assert.match(sources.availability, /meetroDispatchReady/);
});

test("Business Operations Wonder Pass is documented as recommendations only", () => {
  assert.match(sources.doc, /Business Operations District Wonder Pass/);
  assert.match(sources.doc, /different rooms inside the same professional\s+workshop/);
  assert.match(sources.doc, /Do not change backend behavior/);
  assert.match(sources.doc, /Do not change pricing calculations/);
  assert.match(sources.doc, /Do not change invoice calculations/);
  assert.match(sources.doc, /Do not change language\.js/);
  assert.match(sources.doc, /Future passes should continue/);
});
