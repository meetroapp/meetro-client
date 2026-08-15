import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { t, translations } from "../src/utils/language.js";

const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);
const contractorDashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

test("homeowner Work Center preserves the shared name and explains the next step", () => {
  assert.equal(t("myRequestsTitle", "en"), "Work Center");
  assert.equal(
    t("myRequestsPerspectiveTitle", "en"),
    "How we move forward together"
  );
  assert.match(myRequestsSource, /t\("myRequestsTitle", language\)/);
  assert.match(myRequestsSource, /t\("myRequestsSubtitle", language\)/);
  assert.match(myRequestsSource, /t\("myRequestsPerspectiveEyebrow", language\)/);
  assert.match(myRequestsSource, /t\("myRequestsPerspectiveTitle", language\)/);
  assert.match(myRequestsSource, /t\("myRequestsPerspectiveText", language\)/);
  assert.match(myRequestsSource, /getHomeownerWorkflowPresentation\(request, language\)/);
  assert.match(myRequestsSource, /t\("myRequestsWorkflow", language\)/);
  assert.match(myRequestsSource, /t\("myRequestsNextStep", language\)/);
  assert.match(myRequestsSource, /t\("myRequestsQuoteProposal", language\)/);
  assert.match(myRequestsSource, /t\("myRequestsScheduleVisit", language\)/);
  assert.match(myRequestsSource, /t\("myRequestsServiceHistory", language\)/);
});

test("professional Work Center preserves customer-work stages without becoming business-only", () => {
  assert.equal(t("workCenterDashboardTitle", "en"), "Work Center");
  assert.equal(
    t("workCenterProfessionalPerspectiveLine", "en"),
    "Customer work stays connected through requests, evaluations, quotes, schedule, active jobs, completion, and history."
  );
  assert.match(
    contractorDashboardSource,
    /translate\("workCenterDashboardTitle", activeLanguage\)/
  );
  assert.match(
    contractorDashboardSource,
    /translate\("workCenterPurposeStatement", activeLanguage\)/
  );
  assert.match(contractorDashboardSource, /workPlanCopy\.cardPurpose/);
  assert.match(contractorDashboardSource, /const workCenterPrimaryNavigationCards = \[/);
  assert.match(contractorDashboardSource, /translate\("workCenterOpportunitiesTitle"\)/);
  assert.match(contractorDashboardSource, /translate\("workCenterScheduleTitle"\)/);
  assert.match(contractorDashboardSource, /translate\("workCenterQuotesTitle"\)/);
  assert.match(contractorDashboardSource, /translate\("workCenterActiveWorkTitle"\)/);
  assert.match(contractorDashboardSource, /translate\("workCenterHistoryTitle"\)/);
  assert.match(contractorDashboardSource, /translate\("workCenterRevenueTitle"\)/);
});

test("Work Center empty states and continuation routes remain safe", () => {
  assert.match(myRequestsSource, /sortedRequests\.length === 0/);
  assert.match(myRequestsSource, /t\("myRequestsEmptyTitle", language\)/);
  assert.match(myRequestsSource, /t\("myRequestsEmptyText", language\)/);
  assert.match(myRequestsSource, /t\("myRequestsRequestHelp", language\)/);
  assert.match(myRequestsSource, /localStorage\.setItem\("conversationReturnPage", "myRequests"\)/);
  assert.match(myRequestsSource, /setPage\("conversationThread"\)/);
  assert.match(myRequestsSource, /onOpenConversation/);
  assert.match(contractorDashboardSource, /ui\("wcNoActiveWorkTitle"\)/);
  assert.match(contractorDashboardSource, /ui\("wcNoActiveWorkText"\)/);
  assert.match(contractorDashboardSource, /ui\("wcNoQuotesTitle"\)/);
  assert.match(contractorDashboardSource, /ui\("wcNoQuotesText"\)/);
});

test("Work Center wonder copy has language coverage across supported locales", () => {
  const keys = [
    "myRequestsTitle",
    "myRequestsSubtitle",
    "myRequestsPerspectiveEyebrow",
    "myRequestsPerspectiveTitle",
    "myRequestsPerspectiveText",
    "workCenterDashboardTitle",
    "workCenterPurposeStatement",
    "workCenterProfessionalPerspectiveLine",
  ];

  for (const key of keys) {
    for (const language of ["en", "es", "fr", "pt-BR"]) {
      assert.equal(typeof translations[language][key], "string", `${language} ${key}`);
      assert.ok(translations[language][key].trim(), `${language} ${key}`);
      assert.notEqual(t(key, language), key);
    }
  }
});

test("Work Center changes do not introduce role switching side effects", () => {
  assert.doesNotMatch(myRequestsSource, /setActiveAccountMode\("business"\)/);
  assert.doesNotMatch(contractorDashboardSource, /setActiveAccountMode\("personal"\)/);
});
