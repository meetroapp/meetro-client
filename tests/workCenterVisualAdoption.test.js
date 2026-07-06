import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);
const contractorDashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

test("homeowner Work Center adopts Meetro Community visual constitution classes", () => {
  assert.match(myRequestsSource, /meetro-responsive-page meetro-visual-page/);
  assert.match(myRequestsSource, /className="meetro-visual-hero"/);
  assert.match(myRequestsSource, /meetro-visual-surface/);
  assert.match(myRequestsSource, /meetro-visual-empty-state/);
  assert.match(myRequestsSource, /meetro-visual-primary-button/);
});

test("professional Work Center adopts Meetro Community visual constitution classes", () => {
  assert.match(contractorDashboardSource, /meetro-wide-page meetro-visual-page/);
  assert.match(contractorDashboardSource, /work-center-dashboard-hero meetro-visual-hero/);
  assert.match(contractorDashboardSource, /meetro-visual-surface/);
  assert.match(contractorDashboardSource, /meetro-visual-empty-state/);
  assert.match(contractorDashboardSource, /meetro-visual-primary-button/);
});

test("Work Center visual pass uses approved shared visual tokens", () => {
  const requiredTokens = [
    "--meetro-gradient-community-page",
    "--meetro-gradient-community-action",
    "--meetro-color-forest",
    "--meetro-color-forest-deep",
    "--meetro-color-sage",
    "--meetro-color-paper",
    "--meetro-color-wood",
    "--meetro-color-line",
    "--meetro-surface-paper",
    "--meetro-surface-warm",
    "--meetro-shadow-soft",
    "--meetro-shadow-lifted",
  ];

  const combinedSource = `${myRequestsSource}\n${contractorDashboardSource}`;

  for (const token of requiredTokens) {
    assert.match(combinedSource, new RegExp(token.replace(/-/g, "\\-")));
  }
});

test("Work Center visual adoption preserves routing and conversation continuity", () => {
  assert.match(myRequestsSource, /setPage\("conversationThread"\)/);
  assert.match(myRequestsSource, /localStorage\.setItem\("conversationReturnPage", "myRequests"\)/);
  assert.match(myRequestsSource, /setPage\("upload"\)/);
  assert.match(contractorDashboardSource, /setPage\("conversationThread"\)/);
  assert.match(contractorDashboardSource, /localStorage\.setItem\("conversationReturnPage", "workCenter"\)/);
  assert.match(contractorDashboardSource, /setPage\("quoteBuilder"\)/);
  assert.match(contractorDashboardSource, /setPage\("businessLeads"\)/);
});

test("Work Center visual adoption does not introduce role switching", () => {
  assert.doesNotMatch(myRequestsSource, /setActiveAccountMode\("business"\)/);
  assert.doesNotMatch(contractorDashboardSource, /setActiveAccountMode\("personal"\)/);
});
