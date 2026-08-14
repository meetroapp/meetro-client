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
  quotes: cardSource("quotes", "activeWork"),
  activeWork: cardSource("activeWork", "history"),
  history: cardSource("history", "revenue"),
  revenue: cardSource("revenue"),
};

test("primary Work Center cards use the approved business-facing language", () => {
  assert.equal(t("workCenterOpportunitiesTitle", "en"), "Opportunities");
  assert.equal(t("workCenterNewRequestsThatNeedADecision", "en"), "New customer requests that need your attention.");
  assert.equal(t("viewOpportunities", "en"), "Review Opportunities");
  assert.equal(t("workCenterCurrentJobsTitle", "en"), "Active Work");
  assert.equal(t("workCenterAcceptedWorkThatStillNeedsAction", "en"), "Jobs you're currently managing.");
  assert.equal(t("continueWork", "en"), "Continue Work");
  assert.equal(t("workCenterScheduleTitle", "en"), "Schedule");
  assert.equal(t("workCenterUpcomingVisitsAndAppointments", "en"), "Upcoming appointments and scheduled work.");
  assert.equal(t("workCenterViewSchedule", "en"), "View Schedule");
  assert.equal(t("workCenterQuotesTitle", "en"), "Quotes / Proposals");
  assert.equal(t("workCenterProposalsThatNeedReviewOrResponse", "en"), "Quotes and proposals you're preparing or waiting on.");
  assert.equal(t("workCenterViewQuotes", "en"), "View Quotes");
  assert.equal(t("workCenterActiveWorkTitle", "en"), "Active Work");
  assert.equal(t("workCenterOnSiteWorkThatNeedsAnUpdate", "en"), "Jobs currently in progress.");
  assert.equal(t("workCenterViewActiveWork", "en"), "View Active Work");
  assert.equal(t("workCenterHistoryTitle", "en"), "Job History");
  assert.equal(t("workCenterClosedJobsAndSavedRecords", "en"), "Completed and closed jobs.");
  assert.equal(t("workCenterViewJobHistory", "en"), "View Job History");
  assert.equal(t("workCenterRevenueTitle", "en"), "Revenue");
  assert.equal(t("workCenterPaymentsBalancesAndClosedJobs", "en"), "Earnings from completed work.");
  assert.equal(t("workCenterViewRevenue", "en"), "View Revenue");
});

test("primary Work Center card counts and destinations remain unchanged", () => {
  assert.match(cards.opportunities, /opportunitiesCount/);
  assert.match(cards.opportunities, /openWorkTab\("pending"\)/);
  assert.match(cards.current, /workCenterActiveJobs\.length/);
  assert.match(cards.current, /openWorkCenterJobsPage\("current"\)/);
  assert.match(cards.schedule, /upcomingScheduleCount/);
  assert.match(cards.schedule, /openWorkTab\("schedule"\)/);
  assert.match(cards.quotes, /quoteHistory\.length/);
  assert.match(cards.quotes, /openWorkTab\("quotes"\)/);
  assert.match(cards.activeWork, /activeJobs\.length/);
  assert.match(cards.activeWork, /openWorkTab\("active"\)/);
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
