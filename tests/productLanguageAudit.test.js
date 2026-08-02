import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { t, translations } from "../src/utils/language.js";

const activeWorkflowFiles = [
  "../src/pages/Assistant.jsx",
  "../src/pages/Conversation.jsx",
  "../src/pages/Home.jsx",
  "../src/pages/ConversationThread.jsx",
  "../src/pages/ContractorDashboard.jsx",
  "../src/pages/ProjectDetails.jsx",
  "../src/pages/QuoteBuilder.jsx",
  "../src/pages/InvoiceBuilder.jsx",
  "../src/pages/MessagesInbox.jsx",
  "../src/pages/MyRequests.jsx",
  "../src/pages/QuoteRequests.jsx",
  "../src/pages/CompletedJobDetails.jsx",
  "../src/pages/BusinessDashboard.jsx",
  "../src/pages/BusinessLeads.jsx",
  "../src/pages/EmergencyCompletionActions.jsx",
  "../src/pages/MeetroJourney.jsx",
  "../src/components/EmergencyRelationshipDetail.jsx",
];

const activeWorkflowSource = activeWorkflowFiles
  .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
  .join("\n");

const languages = ["en", "es", "fr", "pt-BR"];

const actionFirstKeys = [
  "reviewJob",
  "viewDetails",
  "openConversation",
  "openChat",
  "openProjectConversation",
  "openScheduleAction",
  "openQuotesAction",
  "openActiveWorkAction",
  "openClosureCenterAction",
  "openHistoryAction",
  "viewRevenueSummaryAction",
  "closureCenterOpenRecord",
  "openProject",
  "viewSchedule",
  "openPendingReview",
  "viewCompletedRecord",
  "viewMyRequests",
  "wcViewProject",
  "wcViewDetails",
  "viewOpportunity",
  "viewOpportunities",
  "assistantActionOpenConversation",
  "assistantActionViewQuote",
  "assistantActionOpenSchedule",
  "assistantFieldActionOpenMessages",
  "assistantFieldActionOpenWorkCenter",
  "assistantFieldActionOpenSchedule",
  "assistantFieldActionOpenEvaluation",
  "assistantFieldActionOpenQuoteBuilder",
  "assistantFieldActionOpenActiveWork",
  "assistantFieldActionOpenCompletion",
  "assistantFieldActionOpenConversation",
  "assistantCompanionOpenWorkCenter",
];

test("audited workflow screens do not use legacy AI-first visible language", () => {
  assert.doesNotMatch(
    activeWorkflowSource,
    /Meetro AI|AI Help|AI Recommendation|AI answers|AI Quote Help|AI Invoice Help|AI Service Summary|AI workflow summary|AI Suggested|Sugerencia AI|seguimiento AI/
  );
});

test("audited workflow screens use action-first labels for major project actions", () => {
  assert.doesNotMatch(
    activeWorkflowSource,
    /Open Conversation|Open Chat|View Chat|Message Thread|View Quote|View Proposal|View Invoice|Open Work Center|Open Active Work|Open Schedule|Open Project/
  );
  assert.match(activeWorkflowSource, /assistantActionOpenConversation/);
  assert.match(activeWorkflowSource, /assistantCompanionOpenWorkCenter/);
  assert.match(activeWorkflowSource, /assistantActionOpenSchedule/);
  assert.match(activeWorkflowSource, /assistantProjectBriefNextStartWork/);
});

test("conversation action keys follow the relationship-state standard", () => {
  for (const language of languages) {
    assert.doesNotMatch(t("openConversation", language), /^(Open|View)\b/i);
    assert.doesNotMatch(t("openChat", language), /^(Open|View)\b/i);
    assert.doesNotMatch(t("openEmergencyChat", language), /^(Open|View)\b/i);
  }

  assert.equal(t("openConversation", "en"), "Continue Conversation");
  assert.equal(t("openChat", "en"), "Continue Conversation");
  assert.equal(t("openEmergencyChat", "en"), "Continue Conversation");
});

test("workflow language keys are translated for every supported language", () => {
  for (const key of actionFirstKeys) {
    for (const language of languages) {
      assert.equal(
        typeof translations[language][key],
        "string",
        `Missing ${language} translation for ${key}`
      );
      assert.ok(translations[language][key].trim(), `Empty ${language} translation for ${key}`);
      assert.notEqual(t(key, language), key, `${language} returned raw key ${key}`);
    }
  }
});

test("English workflow translations avoid destination-first action labels", () => {
  for (const key of actionFirstKeys) {
    assert.doesNotMatch(
      t(key, "en"),
      /^(Open|View)\b/,
      `${key} should describe the next action`
    );
  }
});
