import assert from "node:assert/strict";
import test from "node:test";

import {
  getHomeownerWorkflowPresentation,
  getHomeownerWorkflowTimeline,
  getHomeownerLifecycleStage,
  getAuthoritativeHomeownerRequestCounts,
  isRequestActiveForHomeowner,
  isRequestAvailableAsNewLead,
  isRequestVisibleToHomeowner,
} from "../src/utils/homeownerLifecycle.js";

test("open owner requests remain truthful without professional projection evidence", () => {
  const lifecycle = getHomeownerLifecycleStage({ status: "open" });
  const presentation = getHomeownerWorkflowPresentation({ status: "open" });

  assert.equal(lifecycle.stageLabel, "Request submitted");
  assert.doesNotMatch(lifecycle.nextStep, /professional|respond/i);
  assert.equal(presentation.statusLabel, "Request submitted");
});

test("request metrics render only explicit authoritative count fields", () => {
  assert.equal(getAuthoritativeHomeownerRequestCounts({ status: "open" }), null);
  assert.deepEqual(
    getAuthoritativeHomeownerRequestCounts({
      professional_view_count: 0,
      message_count: 2,
      quote_count: 1,
    }),
    { views: 0, messages: 2, quotes: 1 }
  );
});

test("homeowner workflow mirrors proposal sent as homeowner approval", () => {
  const presentation = getHomeownerWorkflowPresentation({
    status: "quoted",
    quotesReceived: [
      {
        quoteId: "quote-1",
        status: "sent",
        businessName: "Bgone Home Renovation",
        amount: 850,
      },
    ],
  });

  assert.equal(presentation.statusLabel, "Waiting for Your Approval");
  assert.equal(presentation.primaryActionLabel, "Approve Proposal");
  assert.equal(presentation.professionalName, "Bgone Home Renovation");
  assert.equal(presentation.amount, 850);
});

test("homeowner workflow mirrors active work statuses", () => {
  const onTheWay = getHomeownerWorkflowPresentation({ status: "on_the_way" });
  const arrived = getHomeownerWorkflowPresentation({ status: "arrived" });
  const working = getHomeownerWorkflowPresentation({ status: "working" });

  assert.equal(onTheWay.statusLabel, "Professional is on the way");
  assert.equal(arrived.statusLabel, "Professional has arrived");
  assert.equal(working.statusLabel, "Work in progress");
  assert.equal(onTheWay.primaryActionLabel, "Continue Conversation");
  assert.equal(arrived.primaryActionLabel, "Continue Conversation");
  assert.equal(working.primaryActionLabel, "Continue Conversation");
  assert.equal(working.primaryActionKey, "messageProfessional");
  assert.equal(
    getHomeownerWorkflowPresentation({ status: "completed" }).statusLabel,
    "Work completed — review details"
  );
});

test("homeowner workflow keeps completion review separate from closed history", () => {
  const completed = getHomeownerWorkflowPresentation({
    status: "completed",
    completionRecord: { notes: "Work finished" },
  });
  const closureCompleted = getHomeownerWorkflowPresentation({
    status: "closure_completed",
    completionRecord: { notes: "Work finished" },
  });
  const savedToHistory = getHomeownerWorkflowPresentation({
    status: "completed",
    savedToHistory: true,
  });

  assert.equal(completed.key, "completion");
  assert.equal(completed.primaryActionLabel, "Review Completion");
  assert.equal(closureCompleted.key, "history");
  assert.equal(closureCompleted.primaryActionLabel, "Review Record");
  assert.equal(savedToHistory.key, "history");
});

test("homeowner workflow timeline marks current stage", () => {
  const timeline = getHomeownerWorkflowTimeline({
    status: "quoted",
    quotesReceived: [{ quoteId: "quote-1", status: "sent" }],
  });

  const approval = timeline.find((item) => item.key === "approval");
  const request = timeline.find((item) => item.key === "request");

  assert.equal(approval.current, true);
  assert.equal(request.done, true);
});

test("older active requests stay homeowner-visible without date filtering", () => {
  const olderActiveRequest = {
    requestId: "request-old-active",
    title: "Garage opener install",
    status: "open",
    createdAt: "2025-01-15T12:00:00.000Z",
  };

  assert.equal(isRequestVisibleToHomeowner(olderActiveRequest), true);
  assert.equal(isRequestActiveForHomeowner(olderActiveRequest), true);
});

test("moved-on requests leave public new lead eligibility", () => {
  assert.equal(
    isRequestAvailableAsNewLead({
      requestId: "request-scheduled",
      status: "scheduled",
    }),
    false
  );
  assert.equal(
    isRequestAvailableAsNewLead({
      requestId: "request-closed",
      status: "closed",
    }),
    false
  );
  assert.equal(
    isRequestAvailableAsNewLead({
      requestId: "request-open",
      status: "open",
    }),
    true
  );
});
