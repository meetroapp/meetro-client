import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BUSINESS_LEADS_PAGE,
  CONVERSATION_THREAD_PAGE,
  getBusinessLeadConversationContext,
  stageBusinessLeadConversation,
} from "../src/utils/businessLeadConversationEntry.js";
import { CONVERSATION_THREAD_TYPES } from "../src/utils/canonicalConversationMessaging.js";

const leadsSource = readFileSync(
  new URL("../src/pages/BusinessLeads.jsx", import.meta.url),
  "utf8"
);
const threadSource = readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);
const coordinatorSource = readFileSync(
  new URL("../src/utils/professionalOpportunityCoordinator.js", import.meta.url),
  "utf8"
);
const canonicalSource = readFileSync(
  new URL("../src/utils/canonicalConversationMessaging.js", import.meta.url),
  "utf8"
);

function opportunity(overrides = {}) {
  return {
    id: 71,
    request_id: 71,
    conversation_id: 91,
    conversationId: 91,
    conversation_available: true,
    threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
    conversation_type: CONVERSATION_THREAD_TYPES.CANONICAL,
    project_title: "Repair entry door",
    project_description: "Replace the damaged entry door.",
    request_category: "handyman",
    service_domain: "home_services",
    service_specialty: "door_repair",
    status: "open",
    createdAt: "2026-07-22T12:00:00.000Z",
    updatedAt: "2026-07-22T13:00:00.000Z",
    request_photos: ["https://example.test/door.jpg"],
    ...overrides,
  };
}

function createMemoryStorage(initial = {}) {
  const values = new Map(
    Object.entries(initial).map(([key, value]) => [key, String(value)])
  );

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("valid canonical opportunity is actionable with separate identities", () => {
  const context = getBusinessLeadConversationContext(opportunity());

  assert.equal(context.conversationId, 91);
  assert.equal(context.requestId, 71);
  assert.equal(context.threadPayload.conversationId, 91);
  assert.equal(context.threadPayload.requestId, 71);
  assert.equal(context.conversationType, CONVERSATION_THREAD_TYPES.CANONICAL);
});

test("missing or malformed canonical conversation identity fails closed", () => {
  for (const conversationId of [
    undefined,
    null,
    0,
    -1,
    1.5,
    "00191",
    Number.NaN,
  ]) {
    assert.equal(
      getBusinessLeadConversationContext(
        opportunity({ conversationId, conversation_id: conversationId })
      ),
      null
    );
  }
});

test("request and alternate identifiers never substitute for conversation identity", () => {
  for (const identityOnly of [
    { request_id: 91 },
    { id: 91 },
    { quote_request_id: 91 },
    { relationship_id: 91 },
  ]) {
    assert.equal(
      getBusinessLeadConversationContext(
        opportunity({
          conversationId: null,
          conversation_id: null,
          request_id: undefined,
          id: undefined,
          ...identityOnly,
        })
      ),
      null
    );
  }
});

test("request identity, thread type, and explicit availability also fail closed", () => {
  assert.equal(
    getBusinessLeadConversationContext(opportunity({ request_id: null })),
    null
  );
  assert.equal(
    getBusinessLeadConversationContext(
      opportunity({ threadType: CONVERSATION_THREAD_TYPES.REQUEST_OPPORTUNITY })
    ),
    null
  );
  assert.equal(
    getBusinessLeadConversationContext(opportunity({ conversation_available: false })),
    null
  );
});

test("staging writes exact canonical identity and keeps request context separate", () => {
  const storage = createMemoryStorage({ selectedMessageReceiverId: "stale-participant" });
  const context = stageBusinessLeadConversation(opportunity(), storage);
  const selectedConversation = JSON.parse(storage.getItem("selectedConversation"));
  const selectedRequest = JSON.parse(storage.getItem("selectedQuoteRequest"));

  assert.equal(context.conversationId, 91);
  assert.equal(storage.getItem("activeConversationId"), "91");
  assert.equal(storage.getItem("selectedQuoteRequestId"), "71");
  assert.equal(selectedConversation.conversationId, 91);
  assert.equal(selectedConversation.requestId, 71);
  assert.deepEqual(selectedConversation, selectedRequest);
  assert.equal(storage.getItem("meetroConversationType"), "canonical_conversation");
  assert.equal(storage.getItem("selectedMessageReceiverId"), null);
});

test("staging preserves Business Leads return context and safe business viewer context", () => {
  const storage = createMemoryStorage();
  const context = stageBusinessLeadConversation(opportunity(), storage);
  const payload = JSON.parse(storage.getItem("selectedConversation"));

  assert.equal(BUSINESS_LEADS_PAGE, "businessLeads");
  assert.equal(CONVERSATION_THREAD_PAGE, "conversationThread");
  assert.equal(context.returnPage, BUSINESS_LEADS_PAGE);
  assert.equal(storage.getItem("conversationReturnPage"), BUSINESS_LEADS_PAGE);
  assert.equal(storage.getItem("returnPage"), BUSINESS_LEADS_PAGE);
  assert.equal(payload.accountMode, "business");
  assert.equal(payload.relationshipScope, "business");
});

test("staged payload keeps permitted request display fields and excludes internal identity", () => {
  const storage = createMemoryStorage();
  stageBusinessLeadConversation(
    opportunity({
      relationship_id: 501,
      contractor_id: 601,
      participant_id: 701,
      ranking: 1,
      fairness_data: { score: 99 },
      distribution_data: { cohort: "private" },
    }),
    storage
  );
  const payload = JSON.parse(storage.getItem("selectedConversation"));

  assert.equal(payload.project_title, "Repair entry door");
  assert.equal(payload.request_photos.length, 1);
  for (const privateField of [
    "relationship_id",
    "contractor_id",
    "participant_id",
    "ranking",
    "fairness_data",
    "distribution_data",
  ]) {
    assert.equal(Object.hasOwn(payload, privateField), false);
  }
});

test("multiple cards stage their own canonical conversations even for one request", () => {
  const storage = createMemoryStorage();
  const first = opportunity({ conversationId: 91, conversation_id: 91 });
  const second = opportunity({ conversationId: 92, conversation_id: 92 });

  stageBusinessLeadConversation(first, storage);
  assert.equal(storage.getItem("activeConversationId"), "91");

  stageBusinessLeadConversation(second, storage);
  const selected = JSON.parse(storage.getItem("selectedConversation"));
  assert.equal(storage.getItem("activeConversationId"), "92");
  assert.equal(selected.conversationId, 92);
  assert.equal(selected.requestId, 71);
});

test("later selection replaces all stale staged context deterministically", () => {
  const storage = createMemoryStorage({
    activeConversationId: "500",
    selectedConversation: JSON.stringify({ conversationId: 500, requestId: 400 }),
    selectedQuoteRequestId: "400",
    conversationReturnPage: "messagesInbox",
  });

  stageBusinessLeadConversation(
    opportunity({ request_id: 72, id: 72, conversationId: 93, conversation_id: 93 }),
    storage
  );
  const selected = JSON.parse(storage.getItem("selectedConversation"));

  assert.equal(storage.getItem("activeConversationId"), "93");
  assert.equal(storage.getItem("selectedQuoteRequestId"), "72");
  assert.equal(storage.getItem("conversationReturnPage"), "businessLeads");
  assert.equal(selected.conversationId, 93);
  assert.equal(selected.requestId, 72);
});

test("invalid opportunities are not staged", () => {
  const storage = createMemoryStorage({ activeConversationId: "500" });

  assert.equal(
    stageBusinessLeadConversation(opportunity({ conversationId: 0 }), storage),
    null
  );
  assert.equal(storage.getItem("activeConversationId"), "500");
});

test("Business Leads conditionally renders an accessible shared-route CTA", () => {
  assert.match(leadsSource, /getBusinessLeadConversationContext\(opportunity\)/);
  assert.match(leadsSource, /conversationContext \? \(/);
  assert.match(leadsSource, /type="button"/);
  assert.match(leadsSource, /aria-label=/);
  assert.match(leadsSource, /t\("openConversation", language\)/);
  assert.match(leadsSource, /getCanonicalConversationActionTarget/);
  assert.match(leadsSource, /setPage\(target\.route\)/);
  assert.match(leadsSource, /onClick=\{\(\) => openOpportunityConversation\(opportunity\)\}/);
});

test("non-conversation cards expose only the canonical pending-response command", () => {
  assert.match(
    leadsSource,
    /conversationContext \? \([\s\S]*opportunity\.responseSubmissionAvailable[\s\S]*professionalResponseSubmit/
  );
  assert.match(
    leadsSource,
    /professionalResponsePreselectionBoundary/
  );
});

test("Business Leads does not authorize, fetch, or send canonical messages", () => {
  assert.doesNotMatch(leadsSource, /authFetch|\/conversations\/|\/messages/);
  assert.match(coordinatorSource, /requestProfessionalOpportunities|professional-request-opportunities/);
  assert.match(canonicalSource, /permissions\.canSendMessages === true/);
  assert.match(threadSource, /canonicalConversationState\.canSendMessages !== true/);
  assert.match(threadSource, /`\/conversations\/\$\{canonicalConversationId\}`/);
  assert.match(threadSource, /`\/conversations\/\$\{canonicalConversationId\}\/messages`/);
});

test("existing request details remain on every Business Leads card", () => {
  assert.match(leadsSource, /opportunity\.project_title/);
  assert.match(leadsSource, /opportunity\.project_description/);
  assert.match(
    leadsSource,
    /opportunity\.service_specialty \|\| opportunity\.request_category/
  );
});
