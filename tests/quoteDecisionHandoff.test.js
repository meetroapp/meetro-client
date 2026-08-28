import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getAlertConversationActionTarget,
  getAlertPresentation,
  getAlertWorkCenterActionTarget,
} from "../src/utils/alertPresentation.js";
import { normalizeCanonicalAlertDestination } from "../src/utils/canonicalAlert.js";
import {
  buildProfessionalWorkCenterRoute,
  parseProfessionalWorkCenterRoute,
} from "../src/utils/professionalWorkCenterRoute.js";
import {
  deriveQuoteDepositPresentation,
  projectCanonicalQuoteDecisionEvents,
} from "../src/utils/quoteDecisionPresentation.js";
import {
  projectProfessionalQuoteDecisionAttentionList,
} from "../src/utils/professionalQuoteDecisionAttention.js";

const QUOTE_ID = "f08a4f3b-8a21-4da8-a6b0-4258f5a8df9b";
const JOB_ID = "072c8736-5d97-4253-ba3e-dd1bce281a20";

test("decision projection is chronological, durable-input-only, and deposit aware", () => {
  const delivery = {
    id: "canonical-message-7",
    type: "quote_shared",
    createdAt: "2026-08-27T21:37:30.000Z",
    reference: { type: "quote", quoteId: QUOTE_ID, jobId: JOB_ID },
    quoteShare: {
      quoteId: QUOTE_ID,
      jobId: JOB_ID,
      quoteNumber: "Q-0000001",
      businessStatus: "APPROVED",
      decidedAt: "2026-08-28T14:00:00.000Z",
      totalMinor: 68000,
      currency: "USD",
      customerTermsSnapshot: { paymentTerms: "75% deposit" },
    },
  };
  const timeline = projectCanonicalQuoteDecisionEvents([
    delivery,
    { id: "canonical-message-8", type: "text", createdAt: "2026-08-28T13:00:00.000Z" },
  ]);
  assert.deepEqual(timeline.map((item) => item.type), [
    "quote_shared",
    "text",
    "quote_decision",
  ]);
  assert.equal(timeline[2].quoteShare, delivery.quoteShare);
  assert.deepEqual(deriveQuoteDepositPresentation(delivery.quoteShare), {
    state: "DUE",
    percent: 75,
    dueMinor: 51000,
    remainingMinor: 17000,
  });
  assert.equal(projectCanonicalQuoteDecisionEvents([{ ...delivery, quoteShare: {
    ...delivery.quoteShare,
    businessStatus: "WAITING_ON_CUSTOMER",
    decidedAt: null,
  } }]).length, 1);

  const copiedDelivery = {
    ...delivery,
    id: "canonical-message-9",
    createdAt: "2026-08-28T15:00:00.000Z",
  };
  const copiedTimeline = projectCanonicalQuoteDecisionEvents([delivery, copiedDelivery]);
  assert.deepEqual(copiedTimeline.map((item) => item.type), [
    "quote_shared",
    "quote_decision",
    "quote_shared",
  ]);
  assert.equal(copiedTimeline.filter((item) => item.type === "quote_decision").length, 1);
});

test("professional attention carries validated resource identity to Conversation and Work Center", () => {
  const destination = normalizeCanonicalAlertDestination({
    type: "conversation",
    conversationId: 342,
    jobId: JOB_ID,
    quoteId: QUOTE_ID,
  });
  assert.deepEqual(destination, {
    type: "conversation",
    conversationId: 342,
    jobId: JOB_ID,
    quoteId: QUOTE_ID,
  });
  assert.equal(getAlertConversationActionTarget(destination).ok, true);
  assert.deepEqual(getAlertWorkCenterActionTarget(destination), {
    ok: true,
    route: `workCenter?jobId=${JOB_ID}&quoteId=${QUOTE_ID}`,
  });
  const route = buildProfessionalWorkCenterRoute({ jobId: JOB_ID, quoteId: QUOTE_ID });
  assert.deepEqual(parseProfessionalWorkCenterRoute(`#${route}`), {
    jobId: JOB_ID,
    quoteId: QUOTE_ID,
  });
  assert.equal(parseProfessionalWorkCenterRoute(`${route}&customer=Antony`), null);
});

test("approved alert presents canonical project, total, and deposit without URL data", () => {
  const presentation = getAlertPresentation({
    titleKey: "alerts.commercial.quoteApproved.title",
    messageKey: "alerts.commercial.quoteApproved.message",
    category: "proposal",
    priority: "high",
    state: { lifecycle: "active", isRead: false },
    payload: {
      shortPreview: "Inspect damaged cabinet door and trim",
      projectTitle: "Inspect damaged cabinet door and trim",
      customerLabel: "Antony Guzman",
      quoteNumber: "Q-0000001",
      quoteTotalMinor: 68000,
      currency: "USD",
      depositState: "DEPOSIT_DUE",
      depositDueMinor: 51000,
    },
    availableAt: "2026-08-28T14:00:00.000Z",
    destination: { type: "conversation", conversationId: 342, jobId: JOB_ID, quoteId: QUOTE_ID },
  }, "en");
  assert.equal(presentation.title, "Quote approved by customer");
  assert.equal(presentation.decisionFacts.projectTitle, "Inspect damaged cabinet door and trim");
  assert.equal(presentation.decisionFacts.total, "$680.00");
  assert.equal(presentation.decisionFacts.deposit, "$510.00");
});

test("Conversation and Work Center source use canonical decision truth without local authority", () => {
  const thread = readFileSync("src/pages/ConversationThread.jsx", "utf8");
  const event = readFileSync("src/components/ConversationQuoteDecisionEvent.jsx", "utf8");
  const workCenter = readFileSync("src/pages/ContractorDashboard.jsx", "utf8");
  assert.match(thread, /projectCanonicalQuoteDecisionEvents\(threadMessages\)/);
  assert.match(thread, /businessStatus === "WAITING_ON_CUSTOMER"/);
  assert.match(thread, /msg\.type === "quote_decision"/);
  assert.match(event, /data-quote-decision/);
  assert.doesNotMatch(event, /localStorage|sessionStorage|fetch\(/);
  assert.match(workCenter, /parseProfessionalWorkCenterRoute/);
  assert.match(workCenter, /isCanonicalWorkCenterEntry\(job\)/);
});

test("pre-existing approval projects into Alert Center from canonical reads without a backfill", () => {
  const quote = {
    id: QUOTE_ID,
    jobId: JOB_ID,
    classification: "APPROVED",
    customerDecision: "APPROVED",
    customer: { displayName: "Antony Guzman" },
    job: { title: "Inspect damaged cabinet door and trim" },
    totalMinor: 68000,
    currency: "USD",
    decidedAt: "2026-08-27T22:00:00.000Z",
  };
  const liveJob = {
    authoritySource: "CANONICAL_LIVE_JOB_READ",
    jobId: JOB_ID,
    stage: { code: "QUOTE_APPROVED_DEPOSIT_DUE", label: "75% deposit due" },
    nextAction: {
      description: "A 510.00 USD deposit is due before approved work can be scheduled.",
    },
  };
  const attention = projectProfessionalQuoteDecisionAttentionList({
    quotes: [quote],
    liveJobs: [liveJob],
  });
  assert.equal(attention.length, 1);
  assert.equal(attention[0].depositDue, true);
  assert.match(attention[0].nextAction, /510\.00 USD deposit is due/);
  assert.equal(attention[0].route, `workCenter?jobId=${JOB_ID}&quoteId=${QUOTE_ID}`);
  assert.deepEqual(projectProfessionalQuoteDecisionAttentionList({
    quotes: [quote],
    liveJobs: [liveJob],
    durableAlertQuoteIds: [QUOTE_ID],
  }), []);

  const notifications = readFileSync("src/pages/Notifications.jsx", "utf8");
  assert.match(notifications, /fetchProfessionalQuotes\(\{/);
  assert.match(notifications, /fetchCanonicalLiveJobProjection/);
  assert.match(notifications, /projectProfessionalQuoteDecisionAttentionList/);
  assert.doesNotMatch(notifications, /createAlert\(|localStorage|sessionStorage/);
});
