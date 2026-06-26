import test from "node:test";
import assert from "node:assert/strict";

import {
  BUSINESS_INTELLIGENCE_MESSAGE,
  BUSINESS_INTELLIGENCE_REGISTRY,
  getBusinessIntelligenceCategory,
  getBusinessIntelligenceCategories,
  getBusinessIntelligenceModel,
  getBusinessIntelligenceReport,
} from "../src/utils/businessIntelligenceRegistry.js";

test("exports read-only MVP business intelligence categories", () => {
  const report = getBusinessIntelligenceReport();

  assert.equal(report.readOnly, true);
  assert.deepEqual(report.categories, [
    "revenue_insights",
    "service_performance",
    "findings_trends",
    "materials_usage",
    "customer_history_insights",
    "asset_history_insights",
    "permit_compliance_insights",
    "quote_to_approval_insights",
  ]);
  assert.equal(report.categoryCount, 8);
  assert.ok(report.futureExampleCount > report.categoryCount);
});

test("describes the future intelligence chain from workflows to insight", () => {
  const model = getBusinessIntelligenceModel();

  assert.equal(model.message, BUSINESS_INTELLIGENCE_MESSAGE);
  assert.deepEqual(model.flow, [
    "Evaluations",
    "Findings",
    "Service Recommendations",
    "Approved Services",
    "Revenue",
    "Completed Services",
    "History",
    "Business Intelligence",
  ]);
});

test("lists Findings Trends purpose and future examples", () => {
  const category = getBusinessIntelligenceCategory("findings_trends");

  assert.equal(category.name, "Findings Trends");
  assert.equal(
    category.purpose,
    "Shows what professionals commonly discover during evaluations."
  );
  assert.deepEqual(category.futureExamples, [
    "Most common findings",
    "Most common recommended services",
    "Findings by service type",
    "Findings by property/customer",
  ]);
});

test("normalizes category lookups and fails safely for unknown categories", () => {
  assert.equal(
    getBusinessIntelligenceCategory("Quote-to-Approval Insights").id,
    "quote_to_approval_insights"
  );
  assert.equal(getBusinessIntelligenceCategory("unknown_category"), null);
  assert.deepEqual(
    getBusinessIntelligenceCategories({ id: "unknown_category" }),
    []
  );
});

test("registry definitions and model helpers are protected from caller mutation", () => {
  assert.throws(
    () => {
      BUSINESS_INTELLIGENCE_REGISTRY.findings_trends.futureExamples.push(
        "mutated"
      );
    },
    {
      name: "TypeError",
    }
  );

  const model = getBusinessIntelligenceModel();
  model.flow.push("caller mutation");
  model.categories[0].name = "caller mutation";

  assert.ok(
    !getBusinessIntelligenceModel().flow.includes("caller mutation")
  );
  assert.equal(
    getBusinessIntelligenceCategory("revenue_insights").name,
    "Revenue Insights"
  );
});
