import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REQUEST_COLLECTION_STATUS,
  replaceCanonicalRequest,
  resolveHomeownerRequestCollection,
} from "../src/utils/requestLifecycleState.js";
import {
  getRequestCommunicationEndpoint,
  normalizeRequestConversations,
} from "../src/utils/requestCommunication.js";

const homeSource = readFileSync(new URL("../src/pages/Home.jsx", import.meta.url), "utf8");
const myRequestsSource = readFileSync(new URL("../src/pages/MyRequests.jsx", import.meta.url), "utf8");
const messagesSource = readFileSync(new URL("../src/pages/MessagesInbox.jsx", import.meta.url), "utf8");
const threadSource = readFileSync(new URL("../src/pages/ConversationThread.jsx", import.meta.url), "utf8");
const businessLeadsSource = readFileSync(new URL("../src/pages/BusinessLeads.jsx", import.meta.url), "utf8");
const opportunityCoordinatorSource = readFileSync(new URL("../src/utils/professionalOpportunityCoordinator.js", import.meta.url), "utf8");

function post(overrides = {}) {
  return {
    id: 12,
    title: "Paint living room",
    description: "Two walls",
    category: "painting",
    request_category: "painting",
    service_domain: "home_services",
    service_specialty: "painting",
    location: "Cape Coral",
    status: "open",
    created_at: "2026-07-20T10:00:00.000Z",
    updated_at: "2026-07-20T10:00:00.000Z",
    request_photos: [],
    ...overrides,
  };
}

function homeownerConversation(overrides = {}) {
  return {
    conversation_id: 91,
    request_id: 12,
    request_title: "Paint living room",
    display: {
      name: "Cape Painting",
      image_url: "",
      category: "painting",
    },
    status: {
      value: "active",
      active: true,
      archived: false,
    },
    last_activity: "2026-07-20T10:00:00.000Z",
    last_message_preview: null,
    unread_count: 0,
    conversation_available: true,
    permissions: { canSendMessages: true },
    ...overrides,
  };
}

test("failed, malformed, empty, and populated request reads remain distinct", () => {
  assert.deepEqual(resolveHomeownerRequestCollection({
    response: { ok: false, status: 500 },
    data: { code: "POSTS_FETCH_FAILED" },
  }), {
    status: REQUEST_COLLECTION_STATUS.UNAVAILABLE,
    records: [],
    code: "POSTS_FETCH_FAILED",
  });
  assert.equal(
    resolveHomeownerRequestCollection({ response: { ok: true }, data: {} }).status,
    REQUEST_COLLECTION_STATUS.UNAVAILABLE
  );
  assert.equal(
    resolveHomeownerRequestCollection({ response: { ok: true }, data: { posts: [] } }).status,
    REQUEST_COLLECTION_STATUS.EMPTY
  );
  assert.equal(
    resolveHomeownerRequestCollection({ response: { ok: true }, data: { posts: [post()] } }).status,
    REQUEST_COLLECTION_STATUS.READY
  );
});

test("canonical edit and cancellation responses replace only the matching request", () => {
  const original = [post(), post({ id: 13, title: "Repair door" })];
  const replaced = replaceCanonicalRequest(original, post({ title: "Updated title", status: "cancelled" }));
  assert.equal(replaced[0].title, "Updated title");
  assert.equal(replaced[0].status, "cancelled");
  assert.equal(replaced[1].title, "Repair door");
  assert.notEqual(replaced[1], original[1]);
});

test("Communication uses account-correct authoritative messaging sources", () => {
  assert.equal(
    getRequestCommunicationEndpoint("personal"),
    "/conversations?perspective=homeowner"
  );
  assert.equal(
    getRequestCommunicationEndpoint("business"),
    "/professional-request-opportunities"
  );
  assert.deepEqual(
    normalizeRequestConversations(
      { conversations: [homeownerConversation()] },
      "personal"
    ).map((item) => item.id),
    [91]
  );
  assert.deepEqual(
    normalizeRequestConversations({ opportunities: [post()] }, "business").map((item) => item.id),
    [12]
  );
  assert.deepEqual(
    normalizeRequestConversations(
      {
        conversations: [homeownerConversation({
          status: { value: "closed", active: false, archived: false },
        })],
      },
      "personal"
    ).map(({ status, createdAt, updatedAt }) => ({ status, createdAt, updatedAt })),
    [{
      status: "closed",
      createdAt: "2026-07-20T10:00:00.000Z",
      updatedAt: "2026-07-20T10:00:00.000Z",
    }]
  );
  assert.equal(normalizeRequestConversations({}, "personal"), null);
});

test("request surfaces render unavailable states and owner mutations without local authority", () => {
  assert.match(homeSource, /REQUEST_COLLECTION_STATUS\.UNAVAILABLE/);
  assert.match(homeSource, /Requests unavailable/);
  assert.match(myRequestsSource, /`\/posts\/\$\{encodeURIComponent\(requestId\)\}`/);
  assert.match(myRequestsSource, /`\/posts\/\$\{encodeURIComponent\(pendingCancelId\)\}\/cancel`/);
  assert.match(myRequestsSource, /Request not changed/);
  assert.match(
    myRequestsSource,
    /request\.status === "cancelled" && canReadLegacyWorkflowStorage\(\)/
  );
  assert.match(myRequestsSource, /Restore is not available/);
  assert.match(myRequestsSource, /request\.conversation_available === true/);
  assert.match(myRequestsSource, /const submittedOnly = workflow\.key === "request"/);
  assert.match(myRequestsSource, /workflow\.key === "cancelled"[\s\S]*setPage\("upload"\)/);
  assert.doesNotMatch(messagesSource, /authFetch\("\/contractor-quote-requests"/);
  assert.match(messagesSource, /getRequestCommunicationEndpoint\(activeAccountMode\)/);
  assert.match(messagesSource, /rawStatus\.includes\("cancel"\)/);
  assert.match(messagesSource, /quote\.conversation_type === "request_opportunity"/);
  assert.match(messagesSource, /reason: "messages_unavailable"/);
  assert.match(threadSource, /isRequestOpportunityReadOnly/);
  assert.match(threadSource, /conversationOpportunityMessagingUnavailable/);
  assert.match(businessLeadsSource, /requestProfessionalOpportunities/);
  assert.doesNotMatch(businessLeadsSource, /authFetch/);
  assert.match(opportunityCoordinatorSource, /authFetch\([\s\S]*"\/professional-request-opportunities"/);
  assert.match(businessLeadsSource, /Request opportunities unavailable/);
  assert.doesNotMatch(businessLeadsSource, /getEligibleSharedProfessionalLeads/);
});
