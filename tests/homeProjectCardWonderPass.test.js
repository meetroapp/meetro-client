import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { t, translations } from "../src/utils/language.js";

const homeSource = readFileSync(
  new URL("../src/pages/Home.jsx", import.meta.url),
  "utf8"
);
const bottomNavSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);

test("Home renders My Projects with Active and History tabs", () => {
  assert.match(homeSource, /t\("homeMyProjects", language\)/);
  assert.match(homeSource, /t\("homeMyProjectsActive", language\)/);
  assert.match(homeSource, /t\("homeMyProjectsHistory", language\)/);
  assert.match(homeSource, /myProjectsTab === "active"/);
  assert.match(homeSource, /myProjectsTab === "history"/);
});

test("active project cards render a visible Next Step message", () => {
  assert.match(homeSource, /function ProjectCard\(\{ request, language, conversationEntry, onClick \}\)/);
  assert.match(homeSource, /const nextStepCopy = getHomeProjectNextStepCopy\(request, journey, language\)/);
  assert.match(homeSource, /style=\{projectNextStepPanel\}/);
  assert.match(homeSource, /t\("homeProjectNextStepLabel", language\)/);
  assert.match(homeSource, /\{nextStepCopy\}/);
});

test("Request Submitted projects render reassuring next-step copy", () => {
  assert.equal(t("requestSubmitted", "en"), "Request Submitted");
  assert.equal(
    t("homeProjectNextStepRequestSubmitted", "en"),
    "Your request has been received. Eligible professionals can review the details."
  );
  assert.match(homeSource, /stageKey === "request"/);
  assert.match(homeSource, /homeProjectNextStepRequestSubmitted/);
});

test("known active project statuses have homeowner-safe next-step copy", () => {
  const expectedKeys = [
    "homeProjectNextStepVisitScheduled",
    "homeProjectNextStepEvaluationComplete",
    "homeProjectNextStepQuoteReady",
    "homeProjectNextStepWorkScheduled",
    "homeProjectNextStepWorkInProgress",
    "homeProjectNextStepCompleted",
  ];

  for (const key of expectedKeys) {
    assert.equal(typeof translations.en[key], "string", `${key} should have English copy`);
    assert.ok(translations.en[key].trim(), `${key} should not be empty`);
    assert.match(homeSource, new RegExp(key));
  }
});

test("Home project entry uses canonical zero, one, and many routing", () => {
  assert.match(homeSource, /function openHomeownerProject\(request = \{\}\)/);
  assert.match(homeSource, /getConversationEntryForRequest\(request\)/);
  assert.match(homeSource, /stageHomeownerCanonicalConversation\(decision, request\)/);
  assert.match(homeSource, /setPage\("conversationThread"\)/);
  assert.match(homeSource, /setPage\("messagesInbox"\)/);
  assert.match(homeSource, /openRequestFromHome\(request\)/);
  assert.doesNotMatch(homeSource, /openWorkConversationForRequest/);
  assert.doesNotMatch(homeSource, /`request-\$\{Date\.now\(\)\}`/);
  assert.doesNotMatch(
    homeSource,
    /localStorage\.setItem\("meetroConversationType", "standard"\)/
  );
  assert.match(homeSource, /return t\("continueConversation", language\)/);
});

test("portrait and landscape project cards share the canonical entry decision", () => {
  const projectCardEntries = homeSource.match(
    /conversationEntry=\{getConversationEntryForRequest\(request\)\}/g
  );

  assert.ok(projectCardEntries);
  assert.equal(projectCardEntries.length, 3);
  assert.match(homeSource, /className="home-my-projects-portrait"/);
  assert.match(homeSource, /className="home-my-projects-landscape"/);
});

test("Home conversation activity language is neutral", () => {
  const activityKeys = [
    "homeConversationActivityTitle",
    "homeActiveConversationCount",
    "homeActiveConversationsCount",
    "homeConversationActivityText",
    "homeNoActiveConversations",
    "homeNoActiveConversationsText",
    "homeConversationActivityLoading",
    "homeConversationActivityUnavailable",
    "homeConversationActivityUnavailableText",
  ];

  assert.match(homeSource, /homeConversationActivityTitle/);
  assert.match(homeSource, /homeActiveConversationsCount/);
  assert.doesNotMatch(homeSource, /homeMessagesNeedAttentionText/);
  assert.doesNotMatch(homeSource, /homeMessagesAllCaughtUp/);
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    activityKeys.forEach((key) => {
      assert.equal(typeof translations[language][key], "string");
      assert.ok(translations[language][key].trim());
    });
  }
  assert.equal(t("homeActiveConversationsCount", "en", { count: 3 }), "3 active conversations");
});

test("History tab still renders completed and history content", () => {
  const historyBlock = homeSource.slice(
    homeSource.indexOf('{myProjectsTab === "active" ? ('),
    homeSource.indexOf('<div className="home-my-projects-landscape"')
  );

  assert.match(historyBlock, /historyRequests\.length > 0/);
  assert.match(historyBlock, /<HistoryRequestCard/);
  assert.match(historyBlock, /homeNoHistoryTitle/);
});

test("mobile bottom navigation does not introduce Community", () => {
  const personalMobileBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const personalMobileNavItems = ["),
    bottomNavSource.indexOf("const businessMobileNavItems = [")
  );
  const businessMobileBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const businessMobileNavItems = ["),
    bottomNavSource.indexOf("const personalDesktopNavItems = [")
  );

  assert.doesNotMatch(personalMobileBlock, /Community/);
  assert.doesNotMatch(businessMobileBlock, /Community/);
});
