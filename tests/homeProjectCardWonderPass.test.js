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
  assert.match(homeSource, /function ProjectCard\(\{ request, language, onClick \}\)/);
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

test("Continue Conversation still routes through the existing chat thread path", () => {
  assert.match(homeSource, /function openHomeownerProject\(request = \{\}\)/);
  assert.match(homeSource, /openWorkConversationForRequest\(request\)/);
  assert.match(homeSource, /localStorage\.setItem\("conversationReturnPage", "home"\)/);
  assert.match(homeSource, /setPage\("conversationThread"\)/);
  assert.match(homeSource, /return t\("continueConversation", language\)/);
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
