import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CANONICAL_CONVERSATION_COMMUNICATION_SHELL,
  parseCanonicalConversationRoute,
} from "../src/utils/canonicalConversationMessaging.js";
import {
  shouldUseCommunicationCenterConversationRoute,
} from "../src/utils/communicationLayout.js";
import {
  getCanonicalConversationActionId,
  getCanonicalConversationActionTarget,
} from "../src/utils/conversationActionRouting.js";

const readSource = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const routingSource = readSource("src/utils/conversationActionRouting.js");
const messagesInboxSource = readSource("src/pages/MessagesInbox.jsx");
const notificationsSource = readSource("src/pages/Notifications.jsx");
const homeSource = readSource("src/pages/Home.jsx");
const myRequestsSource = readSource("src/pages/MyRequests.jsx");
const projectDetailsSource = readSource("src/pages/ProjectDetails.jsx");
const completedJobDetailsSource = readSource(
  "src/pages/CompletedJobDetails.jsx"
);
const businessLeadsSource = readSource("src/pages/BusinessLeads.jsx");
const quoteBuilderSource = readSource("src/pages/QuoteBuilder.jsx");
const invoiceBuilderSource = readSource("src/pages/InvoiceBuilder.jsx");

function desktopSnapshot() {
  return { layoutMode: "desktop", contentWidth: 1200 };
}

function phoneSnapshot() {
  return { layoutMode: "mobile", contentWidth: 390 };
}

test("canonical conversation action routing is presentation-only and route-helper based", () => {
  assert.match(routingSource, /buildCanonicalConversationRoute/);
  assert.match(routingSource, /normalizeCanonicalConversationId/);
  assert.doesNotMatch(
    routingSource,
    /authFetch|fetch\s*\(|localStorage|sessionStorage|setInterval|setTimeout|setPage/
  );
});

test("Communication Center ordinary canonical records use exact canonical identity across layouts", () => {
  for (const record of [
    {
      threadType: "canonical_conversation",
      conversationId: 91,
      requestId: 701,
      relationshipId: 801,
    },
    {
      threadType: "canonical_conversation",
      conversation_id: "92",
      requestId: 702,
      relationshipId: 802,
      accountMode: "business",
    },
  ]) {
    const target = getCanonicalConversationActionTarget(record, {
      returnPage: "messagesInbox",
    });
    const route = parseCanonicalConversationRoute(`#${target.route}`);

    assert.equal(target.ok, true);
    assert.equal(route.valid, true);
    assert.equal(route.conversationId, target.conversationId);
    assert.equal(route.returnPage, "messagesInbox");
    assert.equal(
      shouldUseCommunicationCenterConversationRoute(route, desktopSnapshot()),
      true
    );
    assert.equal(
      shouldUseCommunicationCenterConversationRoute(route, phoneSnapshot()),
      false
    );
    assert.notEqual(route.conversationId, record.requestId);
    assert.notEqual(route.conversationId, record.relationshipId);
  }

  assert.match(
    messagesInboxSource,
    /getCanonicalConversationActionTarget\(quote,\s*\{\s*returnPage: "messagesInbox"/
  );
  assert.match(
    messagesInboxSource,
    /returnPage: "messagesInbox",\s*preferCommunicationCenterShell: isSplitPane/
  );
  assert.match(
    messagesInboxSource,
    /setActiveSplitCanonicalConversationId\(canonicalConversationId\)/
  );
  assert.match(
    messagesInboxSource,
    /if \(isSplitPane\) \{\s*setPage\(canonicalTarget\.route\);/
  );
});

test("Communication Center and Alert Center share one canonical route target contract", () => {
  assert.match(
    messagesInboxSource,
    /from "\.\.\/utils\/conversationActionRouting"/
  );
  assert.match(
    notificationsSource,
    /getAlertConversationActionTarget/
  );
  assert.doesNotMatch(
    notificationsSource,
    /conversationThread\?conversationId=|window\.location|location\.hash/
  );
});

test("active Emergency actions use the canonical conversation id and never the Emergency request id", () => {
  const target = getCanonicalConversationActionTarget(
    {
      emergencyRequestId: 42,
      requestId: 42,
      conversationId: 195,
    },
    {
      returnPage: "myRequests",
      preferCommunicationCenterShell: true,
    }
  );
  const route = parseCanonicalConversationRoute(`#${target.route}`);

  assert.equal(target.ok, true);
  assert.equal(target.conversationId, 195);
  assert.equal(route.conversationId, 195);
  assert.equal(route.returnPage, "myRequests");
  assert.equal(route.shell, CANONICAL_CONVERSATION_COMMUNICATION_SHELL);
  assert.equal(
    shouldUseCommunicationCenterConversationRoute(route, desktopSnapshot()),
    true
  );
  assert.equal(
    shouldUseCommunicationCenterConversationRoute(route, phoneSnapshot()),
    false
  );
  assert.equal(
    getCanonicalConversationActionTarget({ emergencyRequestId: 195 }).ok,
    false
  );
});

test("professional selected, work-started, and completed Emergency states keep their preserved conversation", () => {
  for (const status of [
    "assigned",
    "professional_selected",
    "professional_en_route",
    "professional_arrived",
    "work_in_progress",
    "completed",
  ]) {
    const target = getCanonicalConversationActionTarget({
      status,
      emergencyRequestId: 42,
      conversation_id: "196",
    });

    assert.equal(target.ok, true);
    assert.equal(target.conversationId, 196);
  }
});

test("standard project, quote, and invoice actions resolve the exact related thread", () => {
  assert.equal(
    getCanonicalConversationActionId({
      requestId: 71,
      projectId: 500,
      conversationId: "91",
    }),
    91
  );
  assert.equal(
    getCanonicalConversationActionId({
      quoteRequestId: 71,
      quoteId: 15,
      conversation_id: 92,
    }),
    92
  );
  assert.equal(
    getCanonicalConversationActionId({
      invoiceId: 33,
      jobId: 71,
      conversationId: 93,
    }),
    93
  );
});

test("Home My Projects Continue Conversation produces a restorable canonical route", () => {
  const target = getCanonicalConversationActionTarget(
    {
      requestId: 12,
      request_id: 12,
      relationshipId: 333,
      projectId: 444,
      jobId: 555,
      conversationId: "91",
    },
    {
      returnPage: "home",
      preferCommunicationCenterShell: true,
    }
  );
  const route = parseCanonicalConversationRoute(`#${target.route}`);

  assert.equal(target.ok, true);
  assert.equal(target.conversationId, 91);
  assert.equal(route.valid, true);
  assert.equal(route.conversationId, 91);
  assert.notEqual(route.conversationId, 12);
  assert.notEqual(route.conversationId, 333);
  assert.notEqual(route.conversationId, 444);
  assert.notEqual(route.conversationId, 555);
  assert.equal(route.returnPage, "home");
  assert.equal(route.shell, CANONICAL_CONVERSATION_COMMUNICATION_SHELL);
  assert.equal(
    target.route,
    "conversationThread?conversationId=91&returnPage=home&shell=communicationCenter"
  );
  assert.equal(
    shouldUseCommunicationCenterConversationRoute(route, desktopSnapshot()),
    true
  );
  assert.equal(
    shouldUseCommunicationCenterConversationRoute(route, phoneSnapshot()),
    false
  );
});

test("Home My Projects missing canonical identity fails without bare conversation navigation", () => {
  const target = getCanonicalConversationActionTarget(
    {
      requestId: 91,
      request_id: 91,
      relationshipId: 91,
      projectId: 91,
      jobId: 91,
    },
    {
      returnPage: "home",
      preferCommunicationCenterShell: true,
    }
  );

  assert.equal(target.ok, false);
  assert.equal(target.route, "");
  assert.equal(target.reason, "missing_canonical_conversation_id");
});

test("request-like and unsafe identities fail closed", () => {
  for (const record of [
    { requestId: 91 },
    { emergencyRequestId: 91 },
    { quoteRequestId: 91 },
    { jobId: 91 },
    { projectId: 91 },
    { businessId: 91 },
    { professionalId: 91 },
    { conversationId: "0091" },
    { conversationId: 0 },
    { conversationId: -1 },
    { conversationId: 1.25 },
  ]) {
    assert.equal(getCanonicalConversationActionTarget(record).ok, false);
  }
});

test("history review requires a preserved canonical conversation and does not create one", () => {
  assert.equal(
    getCanonicalConversationActionTarget({
      status: "completed",
      requestId: 71,
      projectId: 71,
    }).reason,
    "missing_canonical_conversation_id"
  );
  assert.match(
    completedJobDetailsSource,
    /Conversation history is unavailable until Meetro confirms the preserved conversation\./
  );
  assert.doesNotMatch(
    completedJobDetailsSource,
    /completedProject\?\.projectConversationId \|\|\s*requestId/
  );
});

test("outside conversation actions enter canonical routes with Communication Center shell eligibility", () => {
  assert.match(
    homeSource,
    /getCanonicalConversationActionTarget\(decision,\s*\{[\s\S]*returnPage:\s*"home"[\s\S]*preferCommunicationCenterShell:\s*true/
  );
  assert.match(
    homeSource,
    /setPage\(target\.route\)/
  );
  assert.doesNotMatch(
    homeSource,
    /setPage\("conversationThread"\)/
  );
  assert.match(
    myRequestsSource,
    /preferCommunicationCenterShell:\s*true/
  );
  assert.match(
    projectDetailsSource,
    /setPage\(target\.route\)/
  );
  assert.match(
    completedJobDetailsSource,
    /setPage\(target\.route\)/
  );
  assert.match(
    businessLeadsSource,
    /setPage\(target\.route\)/
  );
});

test("Start Conversation labels are not wired to request-id fallback creation", () => {
  assert.match(
    projectDetailsSource,
    /getCanonicalConversationActionId\(request\)/
  );
  assert.doesNotMatch(
    projectDetailsSource,
    /requestId \|\|\s*`request-\$\{Date\.now\(\)\}`/
  );
  assert.doesNotMatch(
    myRequestsSource,
    /request\.activeConversationId \|\|\s*requestId/
  );
});

test("Quote and Invoice builder return actions preserve existing origin recovery only", () => {
  assert.match(
    quoteBuilderSource,
    /restoreConversationOriginContext\(setPage\)/
  );
  assert.match(
    invoiceBuilderSource,
    /restoreConversationOriginContext\(setPage\)/
  );
  assert.doesNotMatch(
    quoteBuilderSource + invoiceBuilderSource,
    /setInterval|\/conversations\/.*messages|authFetch/
  );
});
