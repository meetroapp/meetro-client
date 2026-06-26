import assert from "node:assert/strict";
import test from "node:test";

import {
  getHomeownerWorkflowPresentation,
  getHomeownerWorkflowTimeline,
} from "../src/utils/homeownerLifecycle.js";

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
