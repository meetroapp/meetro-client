import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getHomeownerWorkflowPresentation,
} from "../src/utils/homeownerLifecycle.js";
import {
  moveJobToHistory,
  updateProjectLifecycleState,
} from "../src/utils/projectLifecycleSync.js";
import {
  getActiveWorkItems,
  getCompletedWorkItems,
  getQuoteItems,
  getScheduleItems,
  getWorkCenterSummary,
} from "../src/utils/workCenterSelectors.js";
import { getBusinessSchedule } from "../src/utils/workCenter.js";
import {
  recoverRequestRelationships,
  recoverStoredRequestRelationships,
} from "../src/utils/requestRelationshipRecovery.js";
import { getStoredHomeownerRequests } from "../src/utils/workflowTimeline.js";
import { getEligibleSharedProfessionalLeads } from "../src/utils/businessLeadSourceTruth.js";

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed).map(([key, value]) => [key, String(value)]));

  return {
    get length() {
      return data.size;
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    dump() {
      return Object.fromEntries(data.entries());
    },
  };
}

function withStorage(storage, callback) {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = storage;

  try {
    return callback();
  } finally {
    globalThis.localStorage = previousStorage;
  }
}

function readArray(storage, key) {
  return JSON.parse(storage.getItem(key) || "[]");
}

test("proposal approval syncs Home, Messages registry, and Work Center quote state", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-proposal",
        conversationId: "conversation-proposal",
        title: "Kitchen remodel",
        status: "quoted",
        quotesReceived: [
          {
            quoteId: "quote-proposal",
            status: "approved",
            amount: 5800,
            businessName: "BGONE",
          },
        ],
      },
    ]),
    workCenterQuoteHistory: JSON.stringify([
      {
        quoteId: "quote-proposal",
        requestId: "request-proposal",
        conversationId: "conversation-proposal",
        status: "accepted",
        amount: 5800,
      },
    ]),
    meetro_conversation_registry: JSON.stringify([
      {
        id: "conversation-proposal",
        requestId: "request-proposal",
        project_title: "Kitchen remodel",
        status: "proposal_sent",
      },
    ]),
  });

  updateProjectLifecycleState(
    { requestId: "request-proposal", conversationId: "conversation-proposal" },
    "quote_approved",
    {
      workflowStatus: "quote_approved",
      statusLabel: "Proposal approved",
      lastMessage: "Proposal approved",
    },
    { storage }
  );

  withStorage(storage, () => {
    const homeownerRequest = readArray(storage, "homeownerRequests")[0];
    const homeownerPresentation = getHomeownerWorkflowPresentation(homeownerRequest);
    const conversation = readArray(storage, "meetro_conversation_registry")[0];
    const summary = getWorkCenterSummary();

    assert.equal(homeownerPresentation.statusLabel, "Payment / Deposit needed");
    assert.equal(conversation.workflowStatus, "quote_approved");
    assert.equal(conversation.lastMessage, "Proposal approved");
    assert.equal(summary.quoteResponseAlertCount, 1);
  });
});

test("active work syncs Home, Conversation registry, and Work Center active queue", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-active",
        conversationId: "conversation-active",
        title: "Door repair",
        status: "work_scheduled",
        selectedBusinessId: "business-1",
      },
    ]),
    businessId: "business-1",
    meetro_business_schedule: JSON.stringify([
      {
        scheduleId: "schedule-active",
        requestId: "request-active",
        conversationId: "conversation-active",
        status: "work_scheduled",
      },
    ]),
    meetro_conversation_registry: JSON.stringify([
      {
        id: "conversation-active",
        requestId: "request-active",
        status: "work_scheduled",
      },
    ]),
  });

  updateProjectLifecycleState(
    { requestId: "request-active", conversationId: "conversation-active" },
    "arrived",
    {
      statusLabel: "Arrived",
      lastMessage: "Professional arrived",
    },
    { storage }
  );

  withStorage(storage, () => {
    const homeownerRequest = readArray(storage, "homeownerRequests")[0];
    const homeownerPresentation = getHomeownerWorkflowPresentation(homeownerRequest);
    const conversation = readArray(storage, "meetro_conversation_registry")[0];
    const activeItems = getActiveWorkItems();

    assert.equal(homeownerPresentation.statusLabel, "Professional has arrived");
    assert.equal(conversation.workflowStatus, "arrived");
    assert.equal(conversation.lastMessage, "Professional arrived");
    assert.ok(
      activeItems.some((item) => item.requestId === "request-active" && item.normalizedStatus === "arrived")
    );
  });
});

test("accepted homeowner request leaves leads and appears in Work Center", () => {
  const storage = createStorage({
    businessName: "QA Field Services",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-accepted",
        conversationId: "conversation-accepted",
        title: "Garage opener install",
        category: "garageDoorOpenerInstallation",
        status: "accepted",
        selectedProfessional: "QA Field Services",
      },
    ]),
  });

  withStorage(storage, () => {
    const activeItems = getActiveWorkItems();

    assert.ok(
      activeItems.some(
        (item) =>
          item.requestId === "request-accepted" &&
          item.selectorMeta.source === "homeownerRequests"
      )
    );
  });
});

test("scheduled homeowner request projects into Work Center Schedule and dashboard schedule", () => {
  const storage = createStorage({
    businessId: "business-1",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-scheduled-projection",
        conversationId: "conversation-scheduled-projection",
        title: "Kitchen faucet repair",
        customerName: "William Molina",
        status: "scheduled",
        assignedProfessionalId: "business-1",
        appointmentDate: "2026-07-01",
        appointmentTime: "12:00 PM",
        location: "123 Main St",
      },
    ]),
    meetro_business_schedule: JSON.stringify([]),
  });

  withStorage(storage, () => {
    const selectorSchedule = getScheduleItems();
    const dashboardSchedule = getBusinessSchedule();

    assert.equal(selectorSchedule.length, 1);
    assert.equal(selectorSchedule[0].requestId, "request-scheduled-projection");
    assert.equal(selectorSchedule[0].selectorMeta.source, "homeownerRequests");
    assert.equal(dashboardSchedule.length, 1);
    assert.equal(dashboardSchedule[0].title, "Kitchen faucet repair");
    assert.equal(dashboardSchedule[0].date, "2026-07-01");
  });
});

test("relationship recovery backfills assigned business from schedule linked to request", () => {
  const storage = createStorage({
    businessId: "business-schedule",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-recover-schedule",
        conversationId: "conversation-recover-schedule",
        title: "Recover scheduled work",
        status: "scheduled",
        appointmentDate: "2026-07-10",
      },
    ]),
    meetro_business_schedule: JSON.stringify([
      {
        scheduleId: "schedule-recover",
        requestId: "request-recover-schedule",
        businessId: "business-schedule",
        status: "scheduled",
      },
    ]),
  });

  withStorage(storage, () => {
    const recovered = getStoredHomeownerRequests()[0];
    const activeItems = getActiveWorkItems();
    const scheduleItems = getScheduleItems();

    assert.equal(recovered.businessId, "business-schedule");
    assert.equal(recovered.acceptedByBusinessId, "business-schedule");
    assert.equal(recovered.relationshipRecoverySource, "schedule");
    assert.ok(activeItems.some((item) => item.requestId === "request-recover-schedule"));
    assert.ok(scheduleItems.some((item) => item.requestId === "request-recover-schedule"));
  });
});

test("relationship recovery backfills assigned business from conversation linked to request", () => {
  const storage = createStorage({
    businessId: "business-conversation",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-recover-conversation",
        conversationId: "conversation-recover-conversation",
        title: "Recover conversation work",
        status: "accepted",
      },
    ]),
    meetro_conversation_registry: JSON.stringify([
      {
        id: "conversation-recover-conversation",
        requestId: "request-recover-conversation",
        businessId: "business-conversation",
        workflowStatus: "accepted",
      },
    ]),
  });

  withStorage(storage, () => {
    const recovered = getStoredHomeownerRequests()[0];
    const activeItems = getActiveWorkItems();

    assert.equal(recovered.businessId, "business-conversation");
    assert.equal(recovered.relationshipRecoverySource, "conversation");
    assert.ok(activeItems.some((item) => item.requestId === "request-recover-conversation"));
  });
});

test("relationship recovery backfills assigned business from accepted quote history", () => {
  const storage = createStorage({
    businessId: "business-quote",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-recover-quote",
        conversationId: "conversation-recover-quote",
        title: "Recover quote work",
        status: "proposal_approved",
      },
    ]),
    workCenterQuoteHistory: JSON.stringify([
      {
        quoteId: "quote-recover",
        requestId: "request-recover-quote",
        businessId: "business-quote",
        status: "approved",
        amount: 1250,
      },
    ]),
  });

  withStorage(storage, () => {
    const recovered = getStoredHomeownerRequests()[0];
    const quoteItems = getQuoteItems();

    assert.equal(recovered.businessId, "business-quote");
    assert.equal(recovered.relationshipRecoverySource, "quote");
    assert.ok(quoteItems.some((item) => item.requestId === "request-recover-quote"));
  });
});

test("relationship recovery backfills assigned business from accepted lead metadata", () => {
  const storage = createStorage({
    businessId: "business-lead",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-recover-lead",
        title: "Recover accepted lead",
        status: "accepted",
      },
    ]),
    acceptedBusinessLeads: JSON.stringify([
      {
        requestId: "request-recover-lead",
        businessId: "business-lead",
        status: "accepted",
      },
    ]),
  });

  withStorage(storage, () => {
    const recovered = getStoredHomeownerRequests()[0];
    const activeItems = getActiveWorkItems();

    assert.equal(recovered.businessId, "business-lead");
    assert.equal(recovered.relationshipRecoverySource, "acceptedLead");
    assert.ok(activeItems.some((item) => item.requestId === "request-recover-lead"));
  });
});

test("relationship recovery refuses ambiguous business matches", () => {
  const storage = createStorage({
    businessId: "business-a",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-ambiguous-recovery",
        title: "Ambiguous repair",
        status: "accepted",
      },
    ]),
    meetro_business_schedule: JSON.stringify([
      {
        requestId: "request-ambiguous-recovery",
        businessId: "business-a",
      },
    ]),
    meetro_conversation_registry: JSON.stringify([
      {
        requestId: "request-ambiguous-recovery",
        businessId: "business-b",
      },
    ]),
  });

  withStorage(storage, () => {
    const recovered = recoverStoredRequestRelationships({
      storage,
      now: "2026-06-28T12:00:00.000Z",
    });
    const request = recovered.requests[0];

    assert.equal(recovered.changed, false);
    assert.equal(request.businessId, undefined);
    assert.equal(getActiveWorkItems().length, 0);
  });
});

test("relationship recovery does not reopen completed or closed requests into active work", () => {
  const storage = createStorage({
    businessId: "business-history",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-recover-history",
        title: "Recover completed work",
        status: "closed",
      },
    ]),
    meetro_business_schedule: JSON.stringify([
      {
        requestId: "request-recover-history",
        businessId: "business-history",
        status: "closed",
      },
    ]),
  });

  withStorage(storage, () => {
    const recovered = getStoredHomeownerRequests()[0];

    assert.equal(recovered.businessId, "business-history");
    assert.equal(getActiveWorkItems().length, 0);
    assert.ok(
      getCompletedWorkItems().some((item) => item.requestId === "request-recover-history")
    );
  });
});

test("relationship recovery does not recreate stale leads for recovered work", () => {
  const storage = createStorage({
    businessId: "business-no-lead",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-recover-no-lead",
        title: "Recover active work only",
        category: "garageDoorOpenerInstallation",
        status: "accepted",
      },
    ]),
    acceptedBusinessLeads: JSON.stringify([
      {
        requestId: "request-recover-no-lead",
        businessId: "business-no-lead",
      },
    ]),
  });

  withStorage(storage, () => {
    const requests = getStoredHomeownerRequests();
    const leads = getEligibleSharedProfessionalLeads(
      requests,
      { businessId: "business-no-lead", serviceSpecialties: ["garage_door_opener_installation"] },
      { storage }
    );

    assert.equal(leads.length, 0);
    assert.ok(
      getActiveWorkItems().some((item) => item.requestId === "request-recover-no-lead")
    );
  });
});

test("relationship recovery is idempotent", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-idempotent-recovery",
        title: "Idempotent repair",
        status: "accepted",
      },
    ]),
    meetro_conversation_registry: JSON.stringify([
      {
        requestId: "request-idempotent-recovery",
        businessId: "business-idempotent",
      },
    ]),
  });

  const first = recoverRequestRelationships(readArray(storage, "homeownerRequests"), {
    storage,
    now: "2026-06-28T12:00:00.000Z",
  });
  const second = recoverRequestRelationships(first.requests, {
    storage,
    now: "2026-06-29T12:00:00.000Z",
  });

  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.deepEqual(second.requests, first.requests);
});

test("proposal homeowner request projects into Work Center Quotes", () => {
  const storage = createStorage({
    businessId: "business-1",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-proposal-projection",
        conversationId: "conversation-proposal-projection",
        title: "Drywall patch",
        status: "proposal_sent",
        acceptedByBusinessId: "business-1",
        quotesReceived: [
          {
            quoteId: "quote-proposal-projection",
            status: "sent",
            amount: 350,
          },
        ],
      },
    ]),
    workCenterQuoteHistory: JSON.stringify([]),
  });

  withStorage(storage, () => {
    const quoteItems = getQuoteItems();

    assert.equal(quoteItems.length, 1);
    assert.equal(quoteItems[0].requestId, "request-proposal-projection");
    assert.equal(quoteItems[0].quoteId, "quote-proposal-projection");
    assert.equal(quoteItems[0].selectorMeta.source, "homeownerRequests");
  });
});

test("work progress states project into Active Work without returning to Leads", () => {
  const storage = createStorage({
    businessId: "business-1",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-arrived-projection",
        conversationId: "conversation-arrived-projection",
        title: "Door repair",
        status: "arrived",
        assignedProfessionalId: "business-1",
      },
      {
        requestId: "request-started-projection",
        conversationId: "conversation-started-projection",
        title: "Painting",
        status: "work_started",
        assignedProfessionalId: "business-1",
      },
    ]),
  });

  withStorage(storage, () => {
    const activeIds = getActiveWorkItems().map((item) => item.requestId);

    assert.ok(activeIds.includes("request-arrived-projection"));
    assert.ok(activeIds.includes("request-started-projection"));
  });
});

test("ContractorDashboard projects homeowner work into active jobs", () => {
  const source = readFileSync(
    new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /isRequestProfessionalWork/);
  assert.match(source, /projectedActiveRequestJobs/);
  assert.match(source, /isRequestConnectedToProfessional/);
  assert.match(source, /source: "homeownerRequests"/);
  assert.match(source, /\.\.\.projectedActiveRequestJobs/);
});

test("assigned homeowner request appears in Work Center without message or schedule", () => {
  const storage = createStorage({
    businessId: "business-assigned",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-assigned-no-side-effects",
        title: "Garage opener install",
        status: "open",
        assignedProfessionalId: "business-assigned",
      },
    ]),
  });

  withStorage(storage, () => {
    const activeItems = getActiveWorkItems();

    assert.equal(activeItems.length, 1);
    assert.equal(activeItems[0].requestId, "request-assigned-no-side-effects");
    assert.equal(activeItems[0].selectorMeta.source, "homeownerRequests");
    assert.equal(getScheduleItems().length, 0);
  });
});

test("conversation metadata alone does not create professional work ownership", () => {
  const storage = createStorage({
    businessId: "business-owner",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-message-only",
        conversationId: "conversation-message-only",
        title: "Message-only request",
        status: "open",
        messagesCount: 3,
      },
    ]),
  });

  withStorage(storage, () => {
    assert.equal(getActiveWorkItems().length, 0);
    assert.equal(getScheduleItems().length, 0);
  });
});

test("schedule metadata alone does not create professional work ownership", () => {
  const storage = createStorage({
    businessId: "business-owner",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-schedule-only",
        title: "Schedule-only request",
        status: "scheduled",
        appointmentDate: "2026-07-02",
      },
    ]),
  });

  withStorage(storage, () => {
    assert.equal(getActiveWorkItems().length, 0);
    assert.equal(getScheduleItems().length, 0);
    assert.equal(getBusinessSchedule().length, 0);
  });
});

test("schedule acceptance updates stage without creating ownership", () => {
  const storage = createStorage({
    businessId: "business-owner",
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-owned-schedule",
        title: "Owned scheduled request",
        status: "scheduled",
        acceptedByBusinessId: "business-owner",
        appointmentDate: "2026-07-03",
        scheduleStatus: "accepted",
      },
    ]),
  });

  withStorage(storage, () => {
    const activeItems = getActiveWorkItems();
    const scheduleItems = getScheduleItems();

    assert.equal(activeItems.length, 1);
    assert.equal(scheduleItems.length, 1);
    assert.equal(scheduleItems[0].requestId, "request-owned-schedule");
  });
});

test("completed closeout moves project to history and removes active Work Center state", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-closed",
        conversationId: "conversation-closed",
        title: "Cabinet repair",
        status: "completed",
      },
    ]),
    completedProjects: JSON.stringify([]),
    meetro_business_schedule: JSON.stringify([
      {
        scheduleId: "schedule-closed",
        requestId: "request-closed",
        conversationId: "conversation-closed",
        status: "completed",
      },
    ]),
    meetro_conversation_registry: JSON.stringify([
      {
        id: "conversation-closed",
        requestId: "request-closed",
        status: "completed",
      },
    ]),
    activeWorkRequestId: "request-closed",
    activeWorkConversationId: "conversation-closed",
    activeWorkStatus: "completed",
  });

  moveJobToHistory(
    {
      requestId: "request-closed",
      conversationId: "conversation-closed",
      title: "Cabinet repair",
    },
    { closedAt: "2026-06-27T12:00:00.000Z" },
    { storage }
  );

  withStorage(storage, () => {
    const homeownerRequest = readArray(storage, "homeownerRequests")[0];
    const homeownerPresentation = getHomeownerWorkflowPresentation(homeownerRequest);
    const conversation = readArray(storage, "meetro_conversation_registry")[0];

    assert.equal(homeownerPresentation.key, "history");
    assert.equal(conversation.workflowStatus, "closed");
    assert.equal(getActiveWorkItems().length, 0);
    assert.equal(getCompletedWorkItems().length, 1);
    assert.equal(getCompletedWorkItems()[0].status, "closed");
  });
});

test("completion review stays actionable until closure moves it to history", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-completion-review",
        conversationId: "conversation-completion-review",
        title: "Door alignment",
        status: "completed",
        completionRecord: { notes: "Adjusted hinges and latch." },
      },
    ]),
    completedProjects: JSON.stringify([]),
    meetro_business_schedule: JSON.stringify([
      {
        scheduleId: "schedule-completion-review",
        requestId: "request-completion-review",
        conversationId: "conversation-completion-review",
        status: "completed",
      },
    ]),
  });

  withStorage(storage, () => {
    const homeownerPresentation = getHomeownerWorkflowPresentation(
      readArray(storage, "homeownerRequests")[0]
    );
    const completedItems = getCompletedWorkItems();

    assert.equal(homeownerPresentation.key, "completion");
    assert.equal(homeownerPresentation.primaryActionLabel, "Review Completion");
    assert.equal(getActiveWorkItems().length, 0);
    assert.equal(completedItems.length, 1);
    assert.equal(completedItems[0].requestId, "request-completion-review");
    assert.equal(completedItems[0].status, "completed");
  });
});

test("closed records preserve invoice and receipt fields in history", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([]),
    completedProjects: JSON.stringify([
      {
        requestId: "request-receipt-history",
        conversationId: "conversation-receipt-history",
        title: "Kitchen sink repair",
        status: "closed",
        invoiceId: "invoice-42",
        invoiceTotal: 425,
        receiptId: "receipt-42",
        receiptUrl: "/receipts/receipt-42.pdf",
        paymentStatus: "paid",
      },
    ]),
  });

  withStorage(storage, () => {
    const historyItem = getCompletedWorkItems()[0];

    assert.equal(getActiveWorkItems().length, 0);
    assert.equal(historyItem.status, "closed");
    assert.equal(historyItem.invoiceId, "invoice-42");
    assert.equal(historyItem.receiptId, "receipt-42");
    assert.equal(historyItem.receiptUrl, "/receipts/receipt-42.pdf");
    assert.equal(historyItem.paymentStatus, "paid");
  });
});

test("closed emergency state is not surfaced as active in Work Center or Messages", () => {
  const messagesSource = readFileSync(
    new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
    "utf8"
  );
  const storage = createStorage({
    activeEmergencyRecord: JSON.stringify({
      id: "emergency-closed",
      conversationId: "emergency-conversation-closed",
      status: "closed",
      service: "Emergency Plumbing",
    }),
    emergencyDispatchStatus: "closed",
    "meetro_conversation_emergency-conversation-closed": JSON.stringify([
      { id: "message-1", text: "Closed", type: "system" },
    ]),
  });

  withStorage(storage, () => {
    assert.equal(getActiveWorkItems().length, 0);
  });

  assert.match(messagesSource, /!\["cancelled", "closed", "archived"\]\.includes\(emergencyStatus\)/);
});
