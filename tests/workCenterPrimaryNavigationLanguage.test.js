import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CONVERSATION_ACTION_STAGE,
  getConversationActionLabel,
} from "../src/utils/conversationActionLanguage.js";
import { t } from "../src/utils/language.js";

const dashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

function cardSource(key, nextKey) {
  const start = dashboardSource.indexOf(`key: "${key}"`);
  const end = nextKey
    ? dashboardSource.indexOf(`key: "${nextKey}"`, start)
    : dashboardSource.indexOf("  ];", start);
  assert.notEqual(start, -1, `missing ${key} Work Center card`);
  assert.notEqual(end, -1, `missing end of ${key} Work Center card`);
  return dashboardSource.slice(start, end);
}

const cards = {
  opportunities: cardSource("opportunities", "current"),
  current: cardSource("current", "schedule"),
  schedule: cardSource("schedule", "quotes"),
  quotes: cardSource("quotes", "history"),
  history: cardSource("history", "revenue"),
  revenue: cardSource("revenue"),
};

test("primary Work Center cards use the approved business-facing language", () => {
  assert.equal(t("workCenterOpportunitiesTitle", "en"), "Opportunities");
  assert.equal(t("workCenterNewRequestsThatNeedADecision", "en"), "New customer requests.");
  assert.equal(t("workCenterReview", "en"), "Review");
  assert.equal(t("workCenterCurrentJobsTitle", "en"), "Current Jobs");
  assert.equal(t("workCenterCurrentJobsTitle", "es"), "Trabajos actuales");
  assert.equal(t("workCenterCurrentJobsTitle", "fr"), "Travaux en cours");
  assert.equal(t("workCenterCurrentJobsTitle", "pt-BR"), "Trabalhos atuais");
  assert.equal(t("workCenterAcceptedWorkThatStillNeedsAction", "en"), "Jobs you're managing.");
  assert.equal(t("workCenterContinue", "en"), "Continue");
  assert.equal(t("workCenterScheduleTitle", "en"), "Schedule");
  assert.equal(t("workCenterUpcomingVisitsAndAppointments", "en"), "Visits and appointments.");
  assert.equal(t("workCenterViewSchedule", "en"), "View Schedule");
  assert.equal(t("workCenterQuotesTitle", "en"), "Quotes & Approvals");
  assert.equal(t("workCenterProposalsThatNeedReviewOrResponse", "en"), "Quotes waiting on action.");
  assert.equal(t("workCenterViewQuotes", "en"), "View Quotes");
  assert.equal(t("workCenterHistoryTitle", "en"), "Job History");
  assert.equal(t("workCenterClosedJobsAndSavedRecords", "en"), "Completed jobs.");
  assert.equal(t("workCenterViewJobHistory", "en"), "View History");
  assert.equal(t("workCenterRevenueTitle", "en"), "Revenue");
  assert.equal(t("workCenterPaymentsBalancesAndClosedJobs", "en"), "Money from completed work.");
  assert.equal(t("workCenterViewRevenue", "en"), "View Revenue");
});

test("primary navigation exposes one canonical Current Jobs card and suppresses the legacy Active Work duplicate", () => {
  const start = dashboardSource.indexOf("const workCenterPrimaryNavigationCards = [");
  const primaryCards = dashboardSource.slice(
    start,
    dashboardSource.indexOf("const workCenterLandingAlert", start)
  );
  assert.match(primaryCards, /key: "current"[\s\S]*workCenterActiveJobs\.length[\s\S]*openWorkCenterJobsPage\("current"\)/);
  assert.doesNotMatch(primaryCards, /key: "activeWork"/);
  assert.doesNotMatch(primaryCards, /openWorkTab\("active"\)/);
  assert.match(dashboardSource, /activeTab === "active"/);
});

test("primary Work Center card counts and destinations remain unchanged", () => {
  assert.match(cards.opportunities, /opportunitiesCount/);
  assert.match(cards.opportunities, /openWorkTab\("pending"\)/);
  assert.match(cards.current, /workCenterActiveJobs\.length/);
  assert.match(cards.current, /openWorkCenterJobsPage\("current"\)/);
  assert.match(cards.schedule, /serverScheduleSummary/);
  assert.match(cards.schedule, /professionalScheduleReadyCount/);
  assert.match(cards.schedule, /professionalScheduleWaitingCount/);
  assert.match(cards.schedule, /professionalScheduleChangeCount/);
  assert.match(cards.schedule, /professionalScheduleUpcomingCount/);
  assert.match(cards.schedule, /openWorkTab\("schedule"\)/);
  assert.match(cards.quotes, /quoteHistory\.length/);
  assert.match(cards.quotes, /openWorkTab\("quotes"\)/);
  assert.match(cards.history, /workCenterHistoryJobs\.length/);
  assert.match(cards.history, /openWorkCenterJobsPage\("history"\)/);
  assert.match(cards.revenue, /workCenterReadyToReview/);
  assert.match(cards.revenue, /openWorkTab\("revenue"\)/);
});

test("primary Work Center cards do not expose implementation terminology", () => {
  const start = dashboardSource.indexOf("const workCenterPrimaryNavigationCards = [");
  const primaryCards = dashboardSource.slice(
    start,
    dashboardSource.indexOf("const workCenterLandingAlert", start)
  );
  assert.doesNotMatch(
    primaryCards,
    /canonical|legacy|browser-stored|compatibility|payment authority|read-only|View references/i
  );
});

test("conversation relationship labels remain unchanged", () => {
  assert.equal(getConversationActionLabel(CONVERSATION_ACTION_STAGE.NEW, "en"), "Start Conversation");
  assert.equal(getConversationActionLabel(CONVERSATION_ACTION_STAGE.ACTIVE, "en"), "Continue Conversation");
  assert.equal(getConversationActionLabel(CONVERSATION_ACTION_STAGE.HISTORY, "en"), "Review Conversation");
});
