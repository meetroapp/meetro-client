import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GlobalInsightLayer, {
  getGlobalInsightLayerStyles,
  isClosureCommitmentInsight,
  prepareReviewProjectNavigation,
  shouldRenderInsightOnPage,
} from "../src/components/GlobalInsightLayer.js";
import { getCommitmentInsights } from "../src/utils/commitmentInsights.js";
import {
  buildGlobalInsightContextFromStorage,
  filterDisplayableInsights,
  getGlobalInsights,
  getTopInsight,
  normalizeInsightContext,
  prioritizeInsights,
} from "../src/utils/insightEngine.js";
import { dismissRelationshipInsight } from "../src/utils/relationshipInsights.js";
import { setRelationshipInsightsEnabled } from "../src/utils/relationshipInsightSettings.js";
import {
  dispatchWorkflowInsightEvent,
  WORKFLOW_INSIGHT_EVENT,
  WORKFLOW_INSIGHT_EVENT_TYPES,
} from "../src/utils/workflowInsightEvents.js";

function makeStorage(initial = {}) {
  const data = new Map(
    Object.entries(initial).map(([key, value]) => [key, String(value)])
  );

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

test("upcoming visit insight appears only within sixty minutes", () => {
  const now = "2026-06-27T12:00:00.000Z";
  const soon = getCommitmentInsights({
    now,
    schedules: [
      {
        projectId: "project-1",
        scheduledStartAt: "2026-06-27T12:45:00.000Z",
        status: "scheduled",
      },
    ],
  });
  const later = getCommitmentInsights({
    now,
    schedules: [
      {
        projectId: "project-2",
        scheduledStartAt: "2026-06-27T13:30:00.000Z",
        status: "scheduled",
      },
    ],
  });

  assert.equal(soon.some((insight) => insight.id.startsWith("commitment:upcoming-visit")), true);
  assert.equal(later.some((insight) => insight.id.startsWith("commitment:upcoming-visit")), false);
});

test("upcoming visit insight ignores completed and cancelled appointments", () => {
  const insights = getCommitmentInsights({
    now: "2026-06-27T12:00:00.000Z",
    schedules: [
      {
        projectId: "completed",
        scheduledStartAt: "2026-06-27T12:20:00.000Z",
        status: "completed",
      },
      {
        projectId: "cancelled",
        scheduledStartAt: "2026-06-27T12:30:00.000Z",
        status: "cancelled",
      },
    ],
  });

  assert.equal(insights.some((insight) => insight.id.startsWith("commitment:upcoming-visit")), false);
});

test("awaiting confirmation appears only with grounded pending state", () => {
  const pending = getCommitmentInsights({
    currentProject: {
      projectId: "project-1",
      conversationId: "conversation-1",
      status: "awaiting confirmation",
    },
  });
  const vague = getCommitmentInsights({
    currentProject: {
      projectId: "project-2",
      status: "scheduled",
    },
  });

  assert.equal(pending.some((insight) => insight.id.startsWith("commitment:awaiting-confirmation")), true);
  assert.equal(vague.some((insight) => insight.id.startsWith("commitment:awaiting-confirmation")), false);
});

test("ready next step appears for saved evaluation before proposal", () => {
  const insights = getCommitmentInsights({
    currentProject: {
      projectId: "project-1",
      evaluationSaved: true,
    },
  });

  assert.equal(insights.some((insight) => insight.id === "commitment:next-step:proposal:project-1"), true);
});

test("ready next step appears for approved proposal before payment", () => {
  const insights = getCommitmentInsights({
    currentProject: {
      projectId: "project-1",
      proposalApproved: true,
      paymentRecorded: false,
    },
  });

  assert.equal(insights.some((insight) => insight.id === "commitment:next-step:payment:project-1"), true);
});

test("ready next step appears for completed work before closure", () => {
  const insights = getCommitmentInsights({
    currentProject: {
      projectId: "project-1",
      workCompleted: true,
      closureRecorded: false,
    },
  });

  assert.equal(insights.some((insight) => insight.id === "commitment:next-step:closure:project-1"), true);
});

test("commitment insights return none when state is unclear", () => {
  const insights = getCommitmentInsights({
    currentProject: {
      projectId: "project-1",
      status: "active",
    },
  });

  assert.deepEqual(insights, []);
});

test("commitment insight outranks relationship insight", () => {
  const insights = getGlobalInsights({
    now: "2026-06-27T12:00:00.000Z",
    currentProject: { customerName: "Sarah Dommerich" },
    completedProjects: [{ customerName: "Sarah Dommerich", id: "job-1" }],
    schedules: [
      {
        projectId: "project-1",
        scheduledStartAt: "2026-06-27T12:20:00.000Z",
        status: "scheduled",
      },
    ],
  });

  assert.equal(insights[0].type, "commitment");
  assert.equal(insights[0].id.startsWith("commitment:upcoming-visit"), true);
});

test("GlobalInsightLayer renders commitment insight through the same overlay", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "business",
  });
  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "schedule",
      storage,
      insights: [
        {
          id: "commitment:awaiting-confirmation:project-1",
          type: "commitment",
          priority: "high",
          titleKey: "commitmentInsightTitle",
          messageKey: "commitmentInsightAwaitingVisitConfirmation",
          message: "Customer is waiting for visit confirmation.",
          actionLabelKey: "openConversation",
          actionType: "conversation",
          relatedId: "conversation-1",
        },
      ],
    })
  );

  assert.match(markup, /Commitment/);
  assert.match(markup, /Customer is waiting for visit confirmation/);
  assert.match(markup, /Continue Conversation/);
  assert.match(markup, />Hide</);
  assert.match(markup, /role="status"/);
});

test("completed-work closure insight renders as a compact non-blocking banner", () => {
  const closureInsight = {
    id: "commitment:next-step:closure:project-1",
    type: "commitment",
    priority: "high",
    titleKey: "commitmentInsightTitle",
    messageKey: "commitmentInsightWorkClosureNext",
    message: "Work is completed. Closure is the next step.",
    actionLabelKey: "reviewProject",
    actionType: "reviewProject",
    record: { id: "project-1", status: "completed" },
  };
  const styles = getGlobalInsightLayerStyles({
    currentPage: "conversationThread",
    insight: closureInsight,
  });

  assert.match(styles.overlay.bottom, /safe-area-inset-bottom/);
  assert.equal(styles.overlay.justifyContent, "flex-end");
  assert.equal(styles.card.width, "min(320px, 100%)");
  assert.equal(styles.card.padding, "8px 10px");
  assert.equal(styles.card.borderRadius, "12px");
  assert.equal(isClosureCommitmentInsight(closureInsight), true);

  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "conversationThread",
      storage: makeStorage({
        userEmail: "sarah@example.com",
        activeAccountMode: "business",
      }),
      insights: [closureInsight],
    })
  );

  assert.match(markup, /Work is completed\. Closure is the next step\./);
  assert.match(markup, /Review Project/);
  assert.match(markup, />Hide</);
  assert.match(markup, /data-insight-presentation="compact-closure"/);
  assert.match(markup, /width:min\(320px, 100%\)/);
  assert.doesNotMatch(markup, /role="dialog"/);
});

test("completed-work closure insight is not rendered as a large centered overlay", () => {
  const closureInsight = {
    id: "commitment:next-step:closure:project-1",
    type: "commitment",
    messageKey: "commitmentInsightWorkClosureNext",
    actionType: "reviewProject",
  };
  const styles = getGlobalInsightLayerStyles({
    currentPage: "home",
    insight: closureInsight,
  });

  assert.equal(styles.overlay.justifyContent, "flex-end");
  assert.equal(styles.card.width, "min(320px, 100%)");
  assert.equal(styles.card.padding, "8px 10px");
  assert.notEqual(styles.card.width, "min(720px, 100%)");
});

test("Business Dashboard suppresses completed-work closure insight", () => {
  const closureInsight = {
    id: "commitment:next-step:closure:project-1",
    type: "commitment",
    priority: "high",
    titleKey: "commitmentInsightTitle",
    messageKey: "commitmentInsightWorkClosureNext",
    message: "Work is completed. Closure is the next step.",
    actionLabelKey: "reviewProject",
    actionType: "reviewProject",
    record: { id: "project-1", status: "completed" },
  };
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "business",
  });
  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "businessDashboard",
      storage,
      insights: [closureInsight],
    })
  );

  assert.equal(shouldRenderInsightOnPage(closureInsight, "businessDashboard"), false);
  assert.equal(markup, "");
});

test("Review Project insight navigation stores a safe target before routing", () => {
  const storage = makeStorage();
  const result = prepareReviewProjectNavigation(
    {
      actionType: "reviewProject",
      record: { id: "project-1", status: "completed" },
    },
    storage
  );

  assert.deepEqual(result, { ok: true, page: "completedJobDetails" });
  assert.match(storage.getItem("lastCompletedProject"), /"id":"project-1"/);
});

test("Review Project insight fails gracefully when the review target is missing", () => {
  const storage = makeStorage();
  const result = prepareReviewProjectNavigation(
    {
      actionType: "reviewProject",
      relatedId: "project-1",
    },
    storage
  );

  assert.deepEqual(result, { ok: false, reason: "missing-review-target" });
  assert.equal(storage.getItem("lastCompletedProject"), null);
});

test("commitment insights do not invent random facts", () => {
  const insights = getCommitmentInsights({
    currentProject: {
      projectId: "project-1",
      evaluationSaved: true,
    },
  });
  const text = JSON.stringify(insights);

  assert.doesNotMatch(text, /\$\d/);
  assert.doesNotMatch(text, /profit|revenue|traffic|miles|points|streak|badge/i);
  assert.doesNotMatch(text, /Sarah|William|BGONE/);
});

test("critical insight outranks high medium and low", () => {
  const ordered = prioritizeInsights([
    { id: "low", type: "relationship", priority: "low" },
    { id: "critical", type: "relationship", priority: "critical" },
    { id: "medium", type: "commitment", priority: "medium" },
    { id: "high", type: "commitment", priority: "high" },
  ]);

  assert.deepEqual(ordered.map((insight) => insight.id), ["critical", "high", "medium", "low"]);
});

test("normalizeInsightContext handles missing context safely", () => {
  assert.deepEqual(normalizeInsightContext(), {
    page: "unknown",
    currentPage: "unknown",
    intent: "unknown",
    role: "unknown",
    isWorkingContext: false,
    isSettingsContext: false,
    isCustomerContext: false,
  });
});

test("normalizeInsightContext maps known routes to page and intent", () => {
  assert.equal(normalizeInsightContext({ currentPage: "conversationThread", role: "business" }).page, "conversation");
  assert.equal(normalizeInsightContext({ currentPage: "conversationThread", role: "business" }).intent, "communicate");
  assert.equal(normalizeInsightContext({ currentPage: "schedule" }).intent, "schedule");
  assert.equal(normalizeInsightContext({ currentPage: "completedJobDetails" }).page, "reviewProject");
  assert.equal(normalizeInsightContext({ currentPage: "quoteBuilder" }).intent, "quote");
  assert.equal(normalizeInsightContext({ currentPage: "invoiceBuilder" }).intent, "invoice");
  assert.equal(normalizeInsightContext({ currentPage: "profile", role: "personal" }).role, "homeowner");
  assert.equal(normalizeInsightContext({ currentPage: "profile" }).isSettingsContext, true);
});

test("high commitment outranks medium relationship", () => {
  const ordered = prioritizeInsights([
    { id: "relationship", type: "relationship", priority: "medium" },
    { id: "commitment", type: "commitment", priority: "high" },
  ]);

  assert.equal(ordered[0].id, "commitment");
});

test("page relevance can change ordering for matching priorities", () => {
  const ordered = prioritizeInsights(
    [
      {
        id: "relationship",
        type: "relationship",
        priority: "medium",
        actionType: "history",
      },
      {
        id: "commitment:next-step:proposal:project-1",
        type: "commitment",
        priority: "medium",
        actionType: "reviewProject",
      },
    ],
    { currentPage: "reviewProject" }
  );

  assert.equal(ordered[0].id, "commitment:next-step:proposal:project-1");
});

test("conversation context favors communication and customer insights", () => {
  const ordered = prioritizeInsights(
    [
      {
        id: "relationship:history",
        type: "relationship",
        priority: "medium",
        actionType: "history",
      },
      {
        id: "relationship:customer-preference",
        type: "relationship",
        category: "customerPreference",
        priority: "medium",
        contextTags: ["conversation"],
        intentTags: ["communicate"],
      },
    ],
    { currentPage: "conversationThread" }
  );

  assert.equal(ordered[0].id, "relationship:customer-preference");
});

test("schedule context favors upcoming visit insights", () => {
  const ordered = prioritizeInsights(
    [
      { id: "relationship", type: "relationship", priority: "medium" },
      {
        id: "commitment:upcoming-visit:project-1",
        type: "commitment",
        priority: "medium",
        actionType: "schedule",
        contextTags: ["schedule"],
        intentTags: ["schedule"],
      },
    ],
    { currentPage: "schedule" }
  );

  assert.equal(ordered[0].id, "commitment:upcoming-visit:project-1");
});

test("reviewProject context favors next workflow step insights", () => {
  const ordered = prioritizeInsights(
    [
      { id: "relationship", type: "relationship", priority: "medium" },
      {
        id: "commitment:next-step:closure:project-1",
        type: "commitment",
        priority: "medium",
        actionType: "reviewProject",
        contextTags: ["reviewProject"],
        intentTags: ["close"],
      },
    ],
    { currentPage: "completedJobDetails" }
  );

  assert.equal(ordered[0].id, "commitment:next-step:closure:project-1");
});

test("quoteBuilder context favors proposal related insights", () => {
  const ordered = prioritizeInsights(
    [
      { id: "relationship", type: "relationship", priority: "medium" },
      {
        id: "commitment:next-step:proposal:project-1",
        type: "commitment",
        priority: "medium",
        actionType: "reviewProject",
        contextTags: ["quoteBuilder", "quote"],
        intentTags: ["quote"],
      },
    ],
    { currentPage: "quoteBuilder" }
  );

  assert.equal(ordered[0].id, "commitment:next-step:proposal:project-1");
});

test("invoiceBuilder context favors payment and invoice related insights", () => {
  const ordered = prioritizeInsights(
    [
      { id: "relationship", type: "relationship", priority: "medium" },
      {
        id: "commitment:next-step:payment:project-1",
        type: "commitment",
        priority: "medium",
        actionType: "reviewProject",
        contextTags: ["invoiceBuilder", "invoice"],
        intentTags: ["invoice"],
      },
    ],
    { currentPage: "invoiceBuilder" }
  );

  assert.equal(ordered[0].id, "commitment:next-step:payment:project-1");
});

test("profile and settings suppress non-critical insights", () => {
  const ordered = prioritizeInsights(
    [
      { id: "medium", type: "relationship", priority: "medium" },
      { id: "high", type: "commitment", priority: "high" },
    ],
    { currentPage: "profile" }
  );

  assert.deepEqual(ordered, []);
  assert.equal(
    prioritizeInsights([{ id: "critical", priority: "critical" }], { currentPage: "settings" })[0].id,
    "critical"
  );
});

test("critical insight still wins regardless of page relevance", () => {
  const ordered = prioritizeInsights(
    [
      {
        id: "medium-schedule",
        type: "commitment",
        priority: "medium",
        actionType: "schedule",
        contextTags: ["schedule"],
        intentTags: ["schedule"],
      },
      {
        id: "critical",
        type: "relationship",
        priority: "critical",
      },
    ],
    { currentPage: "schedule" }
  );

  assert.equal(ordered[0].id, "critical");
});

test("passive insights are filtered unless explicitly allowed", () => {
  const passive = [{ id: "passive", type: "relationship", priority: "passive" }];

  assert.deepEqual(filterDisplayableInsights(passive), []);
  assert.equal(filterDisplayableInsights(passive, { allowPassiveInsights: true }).length, 1);
});

test("expired and out-of-window insights are filtered", () => {
  const now = "2026-06-27T12:00:00.000Z";
  const insights = [
    { id: "expired", priority: "high", expiresAt: "2026-06-27T11:59:00.000Z" },
    { id: "too-early", priority: "high", displayAfter: "2026-06-27T12:30:00.000Z" },
    { id: "too-late", priority: "high", displayUntil: "2026-06-27T11:30:00.000Z" },
    { id: "eligible", priority: "high", displayAfter: "2026-06-27T11:30:00.000Z" },
  ];

  assert.deepEqual(
    filterDisplayableInsights(insights, { now }).map((insight) => insight.id),
    ["eligible"]
  );
});

test("missing priority defaults safely below medium", () => {
  const ordered = prioritizeInsights([
    { id: "missing", type: "relationship" },
    { id: "medium", type: "relationship", priority: "medium" },
  ]);

  assert.equal(ordered[0].id, "medium");
});

test("dismissed top insight is skipped before overlay selection", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "business",
  });
  dismissRelationshipInsight("critical", storage);
  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "schedule",
      storage,
      insights: [
        {
          id: "critical",
          type: "commitment",
          priority: "critical",
          titleKey: "commitmentInsightTitle",
          message: "Hidden critical insight.",
          actionLabelKey: "openSchedule",
        },
        {
          id: "visible",
          type: "commitment",
          priority: "high",
          titleKey: "commitmentInsightTitle",
          message: "Visible high insight.",
          actionLabelKey: "openSchedule",
        },
      ],
    })
  );

  assert.doesNotMatch(markup, /Hidden critical insight/);
  assert.match(markup, /Visible high insight/);
});

test("GlobalInsightLayer displays only the top eligible insight", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "business",
  });
  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "schedule",
      storage,
      insights: [
        {
          id: "top",
          type: "commitment",
          priority: "high",
          titleKey: "commitmentInsightTitle",
          message: "Top commitment.",
          actionLabelKey: "openSchedule",
        },
        {
          id: "second",
          type: "relationship",
          priority: "medium",
          titleKey: "relationshipInsightTitle",
          message: "Second relationship.",
          actionLabelKey: "hide",
        },
      ],
    })
  );

  assert.match(markup, /Top commitment/);
  assert.doesNotMatch(markup, /Second relationship/);
});

test("disabled setting still renders no prioritized insight", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "business",
  });
  setRelationshipInsightsEnabled(false, { storage, role: "business", dispatchEvent: false });

  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "schedule",
      storage,
      insights: [
        {
          id: "critical",
          type: "commitment",
          priority: "critical",
          titleKey: "commitmentInsightTitle",
          message: "Critical commitment.",
          actionLabelKey: "openSchedule",
        },
      ],
    })
  );

  assert.equal(markup, "");
});

test("getTopInsight is deterministic and uses no random facts", () => {
  const first = getTopInsight({
    now: "2026-06-27T12:00:00.000Z",
    currentPage: "schedule",
    schedules: [
      {
        projectId: "project-1",
        scheduledStartAt: "2026-06-27T12:20:00.000Z",
        status: "scheduled",
      },
    ],
  });
  const second = getTopInsight({
    now: "2026-06-27T12:00:00.000Z",
    currentPage: "schedule",
    schedules: [
      {
        projectId: "project-1",
        scheduledStartAt: "2026-06-27T12:20:00.000Z",
        status: "scheduled",
      },
    ],
  });

  assert.deepEqual(first, second);
  assert.doesNotMatch(JSON.stringify(first), /random|points|streak|badge/i);
});

test("evaluation workflow event refresh exposes proposal next-step insight", () => {
  const events = [];
  const storage = makeStorage({
    selectedConversation: JSON.stringify({
      projectId: "project-1",
      evaluationSaved: true,
    }),
  });
  const dispatched = dispatchWorkflowInsightEvent(WORKFLOW_INSIGHT_EVENT_TYPES.EVALUATION_SAVED, {
    detail: { projectId: "project-1" },
    win: {
      dispatchEvent(event) {
        events.push(event);
        return true;
      },
    },
  });
  const top = getTopInsight(buildGlobalInsightContextFromStorage({ storage }));

  assert.equal(dispatched, true);
  assert.equal(events[0].type, WORKFLOW_INSIGHT_EVENT);
  assert.equal(events[0].detail.type, WORKFLOW_INSIGHT_EVENT_TYPES.EVALUATION_SAVED);
  assert.equal(top.id, "commitment:next-step:proposal:project-1");
});

test("proposal approval workflow event refresh exposes payment next-step insight", () => {
  const storage = makeStorage({
    selectedConversation: JSON.stringify({
      projectId: "project-1",
      proposalApproved: true,
      paymentRecorded: false,
    }),
  });
  dispatchWorkflowInsightEvent(WORKFLOW_INSIGHT_EVENT_TYPES.PROPOSAL_APPROVED, {
    win: { dispatchEvent: () => true },
  });
  const top = getTopInsight(buildGlobalInsightContextFromStorage({ storage }));

  assert.equal(top.id, "commitment:next-step:payment:project-1");
});

test("work completion workflow event refresh exposes closure next-step insight", () => {
  const storage = makeStorage({
    selectedConversation: JSON.stringify({
      projectId: "project-1",
      workCompleted: true,
      closureRecorded: false,
    }),
  });
  dispatchWorkflowInsightEvent(WORKFLOW_INSIGHT_EVENT_TYPES.WORK_COMPLETED, {
    win: { dispatchEvent: () => true },
  });
  const top = getTopInsight(buildGlobalInsightContextFromStorage({ storage }));

  assert.equal(top.id, "commitment:next-step:closure:project-1");
});

test("project closure removes commitment insight", () => {
  const storage = makeStorage({
    selectedConversation: JSON.stringify({
      projectId: "project-1",
      workCompleted: true,
      closureRecorded: true,
    }),
  });
  dispatchWorkflowInsightEvent(WORKFLOW_INSIGHT_EVENT_TYPES.PROJECT_CLOSED, {
    win: { dispatchEvent: () => true },
  });
  const insights = getGlobalInsights(buildGlobalInsightContextFromStorage({ storage }));

  assert.equal(insights.some((insight) => insight.id === "commitment:next-step:closure:project-1"), false);
});

test("relationship insight becomes eligible after closure updates history", () => {
  const storage = makeStorage({
    selectedConversation: JSON.stringify({
      projectId: "project-1",
      customerName: "Sarah Dommerich",
      closed: true,
    }),
    completedProjects: JSON.stringify([
      {
        id: "history-1",
        projectId: "project-1",
        customerName: "Sarah Dommerich",
        completedAt: "2026-06-27T12:00:00.000Z",
      },
    ]),
  });
  dispatchWorkflowInsightEvent(WORKFLOW_INSIGHT_EVENT_TYPES.PROJECT_CLOSED, {
    win: { dispatchEvent: () => true },
  });
  const insights = getGlobalInsights(buildGlobalInsightContextFromStorage({ storage }));

  assert.equal(insights.some((insight) => insight.id === "first-project:sarah-dommerich"), true);
});

test("duplicate workflow events do not duplicate generated insights", () => {
  const storage = makeStorage({
    selectedConversation: JSON.stringify({
      projectId: "project-1",
      proposalApproved: true,
      paymentRecorded: false,
    }),
  });
  const win = { dispatchEvent: () => true };

  dispatchWorkflowInsightEvent(WORKFLOW_INSIGHT_EVENT_TYPES.PROPOSAL_APPROVED, { win });
  dispatchWorkflowInsightEvent(WORKFLOW_INSIGHT_EVENT_TYPES.PROPOSAL_APPROVED, { win });

  const ids = getGlobalInsights(buildGlobalInsightContextFromStorage({ storage })).map(
    (insight) => insight.id
  );
  assert.equal(
    ids.filter((id) => id === "commitment:next-step:payment:project-1").length,
    1
  );
});
