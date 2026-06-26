import test from "node:test";
import assert from "node:assert/strict";

import {
  BUSINESS_TOOL_STATUS,
  getBusinessToolAuditRows,
  getBusinessToolById,
  getBusinessToolStatusLabel,
} from "../src/utils/businessToolsRegistry.js";
import { t } from "../src/utils/language.js";

test("Business Tools audit registry includes every visible MVP card", () => {
  const ids = getBusinessToolAuditRows().map((tool) => tool.id);

  [
    "businessProfile",
    "availability",
    "professionalSetup",
    "customers",
    "portfolio",
    "hiringCenter",
    "assetCenter",
    "serviceEvaluations",
    "findingsLibrary",
    "knowledgeBase",
    "materialsLibrary",
    "pricingLibrary",
    "quickQuote",
    "quickInvoice",
    "contractTemplates",
    "reportsCenter",
    "permitCenter",
    "complianceCenter",
    "businessIntelligence",
    "aiHelp",
    "reviews",
    "settings",
    "legal",
    "subscription",
  ].forEach((id) => assert.ok(ids.includes(id), `${id} is missing`));
});

test("ready and read-only Business Tools cards have routes", () => {
  getBusinessToolAuditRows()
    .filter((tool) =>
      [BUSINESS_TOOL_STATUS.READY, BUSINESS_TOOL_STATUS.READ_ONLY, BUSINESS_TOOL_STATUS.PREVIEW].includes(tool.status)
    )
    .forEach((tool) => assert.ok(tool.route, `${tool.id} should have a route`));
});

test("Hiring Center sits between Portfolio and Quick Quote in the Business Tools registry", () => {
  const ids = getBusinessToolAuditRows().map((tool) => tool.id);

  assert.ok(ids.indexOf("portfolio") < ids.indexOf("hiringCenter"));
  assert.ok(ids.indexOf("hiringCenter") < ids.indexOf("quickQuote"));
});

test("coming soon Business Tools cards are explicitly non-routed", () => {
  getBusinessToolAuditRows()
    .filter((tool) => tool.status === BUSINESS_TOOL_STATUS.COMING_SOON)
    .forEach((tool) => assert.equal(tool.route, null));
});

test("Business Tools status labels are clear in English and Spanish", () => {
  assert.equal(getBusinessToolStatusLabel(BUSINESS_TOOL_STATUS.READY), "Ready");
  assert.equal(getBusinessToolStatusLabel(BUSINESS_TOOL_STATUS.READ_ONLY), "Read-only");
  assert.equal(getBusinessToolStatusLabel(BUSINESS_TOOL_STATUS.PREVIEW), "Preview");
  assert.equal(getBusinessToolStatusLabel(BUSINESS_TOOL_STATUS.COMING_SOON), "Coming Soon");
  assert.equal(getBusinessToolStatusLabel(BUSINESS_TOOL_STATUS.READY, "es"), "Listo");
  assert.equal(getBusinessToolStatusLabel(BUSINESS_TOOL_STATUS.READ_ONLY, "es"), "Solo lectura");
  assert.equal(getBusinessToolStatusLabel(BUSINESS_TOOL_STATUS.PREVIEW, "es"), "Vista previa");
  assert.equal(getBusinessToolStatusLabel(BUSINESS_TOOL_STATUS.COMING_SOON, "es"), "Próximamente");
});

test("Business Tools lookup fails safely for unknown cards", () => {
  assert.equal(getBusinessToolById("not_real"), null);
  assert.equal(getBusinessToolById("quickInvoice").route, "invoiceBuilder");
});

test("Business Tools v1.1 section labels exist in supported languages", () => {
  const keys = [
    "businessToolsDailyTools",
    "businessToolsDailyToolsSubtitle",
    "businessToolsBusinessRecords",
    "businessToolsBusinessRecordsSubtitle",
    "businessToolsGrowth",
    "businessToolsGrowthSubtitle",
    "businessToolsAdministration",
    "businessToolsAdministrationSubtitle",
  ];
  const languages = ["en", "es", "fr", "pt-BR"];

  for (const key of keys) {
    for (const language of languages) {
      assert.notEqual(t(key, language), key, `${key} missing for ${language}`);
    }
  }
});
