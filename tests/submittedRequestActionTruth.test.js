import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getHomeownerLifecycleStage,
  getHomeownerWorkflowPresentation,
} from "../src/utils/homeownerLifecycle.js";

const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);

const homeownerLifecycleSource = readFileSync(
  new URL("../src/utils/homeownerLifecycle.js", import.meta.url),
  "utf8"
);

const workflowHubBlock = myRequestsSource.slice(
  myRequestsSource.indexOf("function HomeownerWorkflowHub("),
  myRequestsSource.indexOf("function EmergencyRequestCard(")
);

function hasCanonicalConversation(request = {}) {
  return Boolean(
    request.conversation_available === true &&
      (request.conversationId || request.conversation_id)
  );
}

function resolvePrimaryActionState(request = {}) {
  const workflow = getHomeownerWorkflowPresentation(request, "en");
  const primaryIsConversation =
    workflow.primaryActionKey === "messageProfessional";
  const submittedOnly = workflow.key === "request";
  const hasAuthoritativeConversation =
    !submittedOnly && hasCanonicalConversation(request);

  return {
    workflow,
    submittedOnly,
    primaryIsConversation,
    hasAuthoritativeConversation,
    showPrimaryAction:
      !submittedOnly &&
      (!primaryIsConversation || hasAuthoritativeConversation),
    showSecondaryConversation:
      !submittedOnly &&
      !primaryIsConversation &&
      hasAuthoritativeConversation,
  };
}

test("submitted-only standard request keeps guidance visible but hides Continue Request", () => {
  const lifecycle = getHomeownerLifecycleStage({ status: "open" }, "en");
  const result = resolvePrimaryActionState({ status: "open" });

  assert.equal(result.workflow.key, "request");
  assert.equal(result.workflow.primaryActionLabel, "Continue Request");
  assert.equal(result.submittedOnly, true);
  assert.equal(result.showPrimaryAction, false);
  assert.match(lifecycle.nextStep, /No action is needed right now/);
  assert.doesNotMatch(
    workflowHubBlock,
    /workflow\.key === "request"[\s\S]{0,500}workflow\.primaryActionLabel/
  );
  assert.match(workflowHubBlock, /\{showPrimaryAction && <button/);
});

test("selected or expanded submitted request cannot override submitted-only truth", () => {
  const selectedSubmittedRequest = {
    status: "open",
    selectedProfessional: "Handyman LLC",
    selectedProfessionalId: 42,
    relationshipId: 77,
    conversation_available: true,
    conversationId: 91,
    conversation_id: 91,
  };
  const result = resolvePrimaryActionState(selectedSubmittedRequest);

  assert.equal(result.workflow.key, "request");
  assert.equal(result.workflow.professionalName, "Handyman LLC");
  assert.equal(result.submittedOnly, true);
  assert.equal(result.hasAuthoritativeConversation, false);
  assert.equal(result.showPrimaryAction, false);
  assert.equal(result.showSecondaryConversation, false);
  assert.match(
    workflowHubBlock,
    /const hasAuthoritativeConversation = Boolean\(\s*!submittedOnly &&[\s\S]*getCanonicalConversationActionTarget\(request\)\.ok/
  );
});

test("later workflow states keep their existing valid actions", () => {
  const scenarios = [
    [{ appointmentDate: "2026-08-03T12:00:00.000Z" }, "visit", "Review Schedule"],
    [
      { projectTimeline: [{ type: "evaluation_completed" }] },
      "evaluation",
      "Review Details",
    ],
    [
      { quotesReceived: [{ quoteId: "q1", status: "draft" }] },
      "proposal",
      "Review Proposal",
    ],
    [
      { quotesReceived: [{ quoteId: "q1", status: "sent" }] },
      "approval",
      "Approve Proposal",
    ],
    [{ acceptedQuote: { amount: 500 } }, "payment", "Review Payment Details"],
    [
      {
        status: "working",
        conversation_available: true,
        conversationId: 91,
      },
      "progress",
      "Continue Conversation",
    ],
    [{ status: "completed" }, "completion", "Review Completion"],
    [{ status: "closed" }, "history", "Review Record"],
  ];

  for (const [request, key, label] of scenarios) {
    const result = resolvePrimaryActionState(request);

    assert.equal(result.workflow.key, key);
    assert.equal(result.workflow.primaryActionLabel, label);
    assert.equal(result.showPrimaryAction, true);
  }
});

test("submitted-only request handling does not substitute conversation routing", () => {
  assert.match(workflowHubBlock, /const submittedOnly = workflow\.key === "request"/);
  assert.match(
    workflowHubBlock,
    /const showPrimaryAction =\s*!submittedOnly &&/
  );
  assert.match(
    workflowHubBlock,
    /!hideCommunicationAction && !submittedOnly && !primaryIsConversation && hasAuthoritativeConversation/
  );
  assert.doesNotMatch(
    workflowHubBlock,
    /submittedOnly[\s\S]{0,240}(openRequestConversation|conversationThread|messagesInbox)/
  );
});

test("workflow hub remains presentation-only and adds no lifecycle authority", () => {
  assert.match(homeownerLifecycleSource, /action: "Continue Request"/);
  assert.doesNotMatch(
    workflowHubBlock,
    /authFetch|fetch\s*\(|localStorage|sessionStorage|createConversation|sendMessage|selectProfessional|advanceWorkflow/
  );
  assert.doesNotMatch(workflowHubBlock, /status\s*=/);
});
