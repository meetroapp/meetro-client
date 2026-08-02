import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CONVERSATION_ACTION_STAGE,
  getConversationActionLabel,
} from "../src/utils/conversationActionLanguage.js";
import { t } from "../src/utils/language.js";

function readSource(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const actionLanguageSource = readSource(
  "../src/utils/conversationActionLanguage.js"
);
const myRequestsSource = readSource("../src/pages/MyRequests.jsx");
const emergencyDetailSource = readSource(
  "../src/components/EmergencyRelationshipDetail.jsx"
);
const projectDetailsSource = readSource(
  "../src/pages/ProjectDetails.jsx"
);
const completedJobSource = readSource(
  "../src/pages/CompletedJobDetails.jsx"
);
const emergencyCompletionSource = readSource(
  "../src/pages/EmergencyCompletionActions.jsx"
);
const quoteBuilderSource = readSource("../src/pages/QuoteBuilder.jsx");
const invoiceBuilderSource = readSource(
  "../src/pages/InvoiceBuilder.jsx"
);
const messagesSource = readSource("../src/pages/MessagesInbox.jsx");

test("conversation actions use one presentation-only three-stage standard", () => {
  assert.equal(
    getConversationActionLabel(CONVERSATION_ACTION_STAGE.NEW, "en"),
    "Start Conversation"
  );
  assert.equal(
    getConversationActionLabel(CONVERSATION_ACTION_STAGE.ACTIVE, "en"),
    "Continue Conversation"
  );
  assert.equal(
    getConversationActionLabel(CONVERSATION_ACTION_STAGE.HISTORY, "en"),
    "Review Conversation"
  );
  assert.doesNotMatch(
    actionLanguageSource,
    /authFetch|fetch\s*\(|localStorage|sessionStorage|setPage|conversationId|requestId|permission|workflow/
  );
});

test("active Emergency, Project, Quote, and Invoice actions continue the relationship", () => {
  assert.match(
    myRequestsSource,
    /HISTORY_EMERGENCY_SUMMARY_STATUSES\.includes\([\s\S]*CONVERSATION_ACTION_STAGE\.HISTORY[\s\S]*CONVERSATION_ACTION_STAGE\.ACTIVE/
  );
  assert.match(
    emergencyDetailSource,
    /detail\.completed[\s\S]*CONVERSATION_ACTION_STAGE\.HISTORY[\s\S]*CONVERSATION_ACTION_STAGE\.ACTIVE/
  );
  assert.match(
    projectDetailsSource,
    /CONVERSATION_ACTION_STAGE\.ACTIVE/
  );
  assert.match(quoteBuilderSource, /CONVERSATION_ACTION_STAGE\.ACTIVE/);
  assert.match(invoiceBuilderSource, /CONVERSATION_ACTION_STAGE\.ACTIVE/);
  assert.equal(t("openEmergencyChat", "en"), "Continue Conversation");
  assert.equal(
    t("emergencyOpenConversation", "en"),
    "Continue Conversation"
  );
  assert.equal(t("openProjectConversation", "en"), "Continue Conversation");
});

test("completed Emergency, Job History, and closed Project actions review history", () => {
  assert.match(
    completedJobSource,
    /CONVERSATION_ACTION_STAGE\.HISTORY/
  );
  assert.match(
    emergencyCompletionSource,
    /CONVERSATION_ACTION_STAGE\.HISTORY/
  );
  assert.equal(
    getConversationActionLabel(CONVERSATION_ACTION_STAGE.HISTORY, "es"),
    "Revisar conversación"
  );
});

test("new relationship entry points start a conversation", () => {
  assert.match(
    projectDetailsSource,
    /hasConversation[\s\S]*CONVERSATION_ACTION_STAGE\.ACTIVE[\s\S]*CONVERSATION_ACTION_STAGE\.NEW/
  );
  assert.match(messagesSource, /messagesStartConversation/);
  assert.equal(t("messagesStartConversation", "en"), "Start Conversation");
});

test("conversation routing and permission handlers remain unchanged", () => {
  assert.match(
    myRequestsSource,
    /buildCanonicalConversationRoute\(\s*emergencyRequest\.conversationId,\s*"myRequests"/
  );
  assert.match(
    quoteBuilderSource,
    /restoreConversationOriginContext\(setPage\)/
  );
  assert.match(
    invoiceBuilderSource,
    /restoreConversationOriginContext\(setPage\)/
  );
  assert.doesNotMatch(
    actionLanguageSource,
    /role|owner|authorization|route|mutation|status\s*=/
  );
});
