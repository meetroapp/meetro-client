import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contractorDashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

test("Work Center Revenue does not include the old oversized workflow hero copy", () => {
  assert.equal(contractorDashboardSource.includes("Review performance"), false);
  assert.equal(contractorDashboardSource.includes("viewRevenueSummaryAction"), false);
});

test("Work Center Revenue keeps a compact metrics entry point", () => {
  assert.equal(contractorDashboardSource.includes('activeTab === "revenue"'), true);
  assert.equal(contractorDashboardSource.includes("revenueGrid"), true);
  assert.equal(contractorDashboardSource.includes("revenueMiniCard"), true);
});
