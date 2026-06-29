import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GlobalInsightLayer, {
  getGlobalInsightLayerStyles,
  getNextSessionDismissed,
  shouldDismissInsightSwipe,
} from "../src/components/GlobalInsightLayer.js";
import {
  dismissRelationshipInsight,
  filterDismissedRelationshipInsights,
  getRelationshipInsights,
} from "../src/utils/relationshipInsights.js";
import { setRelationshipInsightsEnabled } from "../src/utils/relationshipInsightSettings.js";
import {
  buildInsightTestInsight,
  buildRelationshipInsightTestInsight,
  clearInsightTestDismissals,
  clearRelationshipInsightTestDismissals,
  dispatchInsightTest,
  getInsightTesterButtonGroups,
  INSIGHT_DISMISSAL_KEYS,
  INSIGHT_TEST_EVENT,
  RELATIONSHIP_INSIGHT_DISMISSAL_KEY,
  shouldRenderInsightTester,
  shouldRenderRelationshipInsightTester,
} from "../src/utils/relationshipInsightTester.js";

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
    removeItem(key) {
      data.delete(key);
    },
  };
}

test("repeat customer insight appears only when completed count is greater than one", () => {
  const oneProject = getRelationshipInsights({
    currentProject: { customerName: "Sarah Dommerich" },
    completedProjects: [{ customerName: "Sarah Dommerich", id: "job-1" }],
  });
  const repeat = getRelationshipInsights({
    currentProject: { customerName: "Sarah Dommerich" },
    completedProjects: [
      { customerName: "Sarah Dommerich", id: "job-1" },
      { customerName: "Sarah Dommerich", id: "job-2" },
    ],
  });

  assert.equal(oneProject.some((insight) => insight.id.startsWith("repeat-customer")), false);
  assert.equal(repeat.some((insight) => insight.id.startsWith("repeat-customer")), true);
});

test("first project insight appears only when completed count is exactly one", () => {
  const none = getRelationshipInsights({
    currentProject: { customerName: "Sarah Dommerich" },
    completedProjects: [],
  });
  const oneProject = getRelationshipInsights({
    currentProject: { customerName: "Sarah Dommerich" },
    completedProjects: [{ customerName: "Sarah Dommerich", id: "job-1" }],
  });

  assert.equal(none.some((insight) => insight.id.startsWith("first-project")), false);
  assert.equal(oneProject.some((insight) => insight.id.startsWith("first-project")), true);
});

test("relationship insights return none when grounded data is missing", () => {
  const insights = getRelationshipInsights({});

  assert.deepEqual(insights, []);
});

test("warranty reminder appears only within thirty days", () => {
  const now = "2026-06-26T12:00:00.000Z";
  const soon = getRelationshipInsights({
    now,
    currentProject: {
      projectId: "project-1",
      warrantyExpiration: "2026-07-12T12:00:00.000Z",
    },
  });
  const later = getRelationshipInsights({
    now,
    currentProject: {
      projectId: "project-2",
      warrantyExpiration: "2026-08-30T12:00:00.000Z",
    },
  });

  assert.equal(soon.some((insight) => insight.id.startsWith("warranty")), true);
  assert.equal(later.some((insight) => insight.id.startsWith("warranty")), false);
});

test("long-time-no-work insight appears only after 365 days", () => {
  const now = "2026-06-26T12:00:00.000Z";
  const old = getRelationshipInsights({
    now,
    currentProject: { customerName: "Sarah Dommerich" },
    completedProjects: [
      { customerName: "Sarah Dommerich", completedAt: "2025-05-20T12:00:00.000Z" },
    ],
  });
  const recent = getRelationshipInsights({
    now,
    currentProject: { customerName: "Sarah Dommerich" },
    completedProjects: [
      { customerName: "Sarah Dommerich", completedAt: "2026-01-20T12:00:00.000Z" },
    ],
  });

  assert.equal(old.some((insight) => insight.id.startsWith("long-time")), true);
  assert.equal(recent.some((insight) => insight.id.startsWith("long-time")), false);
});

test("relationship memory insight uses only supplied preferences", () => {
  const insights = getRelationshipInsights({
    currentProject: {
      customerName: "Sarah Dommerich",
      conversationId: "conversation-1",
      customerPreferences: "Prefers text before arrival.",
    },
  });
  const memory = insights.find((insight) => insight.id.startsWith("memory"));

  assert.equal(memory.message, "Prefers text before arrival.");
  assert.doesNotMatch(memory.message, /afternoon|gate|dog|parking/i);
});

test("dismissed insight does not reappear from persisted dismissal state", () => {
  const storage = makeStorage();
  const insights = [
    { id: "repeat-customer:sarah", message: "This is your second project together." },
  ];

  dismissRelationshipInsight("repeat-customer:sarah", storage);

  assert.deepEqual(filterDismissedRelationshipInsights(insights, storage), []);
});

test("GlobalInsightLayer renders nothing when relationship insights are disabled", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "personal",
  });
  setRelationshipInsightsEnabled(false, {
    storage,
    role: "personal",
    dispatchEvent: false,
  });

  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "home",
      storage,
      insights: [
        {
          id: "first-project:sarah",
          titleKey: "relationshipInsightFirstProjectTogether",
          messageKey: "relationshipInsightFirstProjectMessage",
          actionLabelKey: "viewHistory",
          actionType: "history",
        },
      ],
    })
  );

  assert.equal(markup, "");
});

test("GlobalInsightLayer renders a compact insight without blocking app flow", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "personal",
  });
  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "home",
      storage,
      insights: [
        {
          id: "first-project:sarah",
          icon: "customerRelationships",
          titleKey: "relationshipInsightFirstProjectTogether",
          messageKey: "relationshipInsightFirstProjectMessage",
          actionLabelKey: "viewHistory",
          actionType: "history",
        },
      ],
    })
  );

  assert.match(markup, /First Project Together/);
  assert.match(markup, /This is your first completed project together/);
  assert.match(markup, /View History/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /role="status"/);
  assert.doesNotMatch(markup, /role="dialog"/);
});

test("DEV relationship insight tester is not rendered in production mode", () => {
  assert.equal(shouldRenderRelationshipInsightTester({ DEV: false }), false);
  assert.equal(shouldRenderRelationshipInsightTester({ DEV: true }), true);
  assert.equal(shouldRenderInsightTester({ DEV: false }), false);
});

test("DEV insight tester renders relationship and commitment groups in development mode", () => {
  const groups = getInsightTesterButtonGroups();
  const relationship = groups.find((group) => group.key === "relationship");
  const commitment = groups.find((group) => group.key === "commitment");

  assert.equal(shouldRenderInsightTester({ DEV: true }), true);
  assert.ok(relationship.buttons.some(([type]) => type === "repeatCustomer"));
  assert.ok(commitment.buttons.some(([type]) => type === "commitmentUpcomingVisit"));
  assert.ok(commitment.buttons.some(([type]) => type === "commitmentNextClosure"));
});

test("DEV insight tester dispatches the shared test insight event", () => {
  const events = [];
  const win = {
    dispatchEvent(event) {
      events.push(event);
      return true;
    },
  };

  assert.equal(dispatchInsightTest("commitmentUpcomingVisit", { win }), true);
  assert.equal(events[0].type, INSIGHT_TEST_EVENT);
  assert.deepEqual(events[0].detail, { type: "commitmentUpcomingVisit" });
});

test("DEV relationship insight tester sample uses the real GlobalInsightLayer path", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "personal",
  });
  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "home",
      storage,
      devTestMode: true,
      insights: [buildRelationshipInsightTestInsight("repeatCustomer")],
    })
  );

  assert.match(markup, /Repeat Customer/);
  assert.match(markup, /This is your fourth project together/);
  assert.match(markup, /View History/);
});

test("DEV commitment insight tester sample uses the real GlobalInsightLayer path", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "business",
  });
  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "schedule",
      storage,
      devTestMode: true,
      insights: [buildInsightTestInsight("commitmentUpcomingVisit")],
    })
  );

  assert.match(markup, /Commitment/);
  assert.match(markup, /Your visit begins in 30 minutes/);
  assert.match(markup, /Review Schedule/);
});

test("Relationship Insights setting off prevents DEV test insight display", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "personal",
  });
  setRelationshipInsightsEnabled(false, {
    storage,
    role: "personal",
    dispatchEvent: false,
  });

  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "home",
      storage,
      devTestMode: true,
      insights: [buildRelationshipInsightTestInsight("warrantyReminder")],
    })
  );

  assert.equal(markup, "");
});

test("Clear Dismissals clears only Relationship Insight dismissal storage", () => {
  const storage = makeStorage({
    [RELATIONSHIP_INSIGHT_DISMISSAL_KEY]: JSON.stringify(["dev-relationship-insight:firstProject"]),
    "meetro.other.dismissed": JSON.stringify(["keep-me"]),
  });

  const clearedKey = clearRelationshipInsightTestDismissals({ storage, win: null });

  assert.equal(clearedKey, RELATIONSHIP_INSIGHT_DISMISSAL_KEY);
  assert.equal(storage.getItem(RELATIONSHIP_INSIGHT_DISMISSAL_KEY), null);
  assert.equal(storage.getItem("meetro.other.dismissed"), JSON.stringify(["keep-me"]));
});

test("Clear Insight Dismissals clears only insight dismissal keys", () => {
  const storage = makeStorage({
    [RELATIONSHIP_INSIGHT_DISMISSAL_KEY]: JSON.stringify(["dev-relationship-insight:firstProject"]),
    "meetro.other.dismissed": JSON.stringify(["keep-me"]),
  });

  const clearedKeys = clearInsightTestDismissals({ storage, win: null });

  assert.deepEqual(clearedKeys, INSIGHT_DISMISSAL_KEYS);
  assert.equal(storage.getItem(RELATIONSHIP_INSIGHT_DISMISSAL_KEY), null);
  assert.equal(storage.getItem("meetro.other.dismissed"), JSON.stringify(["keep-me"]));
});

test("GlobalInsightLayer renders safely with missing context", () => {
  const storage = makeStorage({
    userEmail: "sarah@example.com",
    activeAccountMode: "personal",
  });
  const markup = renderToStaticMarkup(
    React.createElement(GlobalInsightLayer, {
      currentPage: "home",
      storage,
    })
  );

  assert.equal(markup, "");
});

test("relationship insight swipe threshold supports left and right dismissal", () => {
  assert.equal(shouldDismissInsightSwipe(20, 95), true);
  assert.equal(shouldDismissInsightSwipe(95, 20), true);
  assert.equal(shouldDismissInsightSwipe(20, 60), false);
  assert.equal(shouldDismissInsightSwipe(Number.NaN, 95), false);
});

test("session dismissal prevents immediate route-change reappearance", () => {
  const dismissed = getNextSessionDismissed(new Set(), "memory:sarah:text-first");

  assert.equal(dismissed.has("memory:sarah:text-first"), true);
  assert.equal(
    [{ id: "memory:sarah:text-first" }, { id: "warranty:project-1" }].filter(
      (insight) => !dismissed.has(insight.id)
    ).length,
    1
  );
});

test("reduced-motion insight styles do not animate", () => {
  const styles = getGlobalInsightLayerStyles({
    currentPage: "conversationThread",
    keyboardActive: true,
    reducedMotion: true,
  });

  assert.equal(styles.card.transition, "none");
  assert.equal(styles.card.transform, "none");
  assert.match(styles.overlay.top, /48px/);
});

test("relationship insight overlay styles are viewport and safe-area constrained", () => {
  const styles = getGlobalInsightLayerStyles({
    currentPage: "home",
  });

  assert.match(styles.overlay.left, /safe-area-inset-left/);
  assert.match(styles.overlay.right, /safe-area-inset-right/);
  assert.match(styles.overlay.bottom, /safe-area-inset-bottom/);
  assert.equal(styles.overlay.overflowX, "hidden");
  assert.equal(styles.card.boxSizing, "border-box");
  assert.match(styles.card.width, /100%/);
});

test("relationship insights do not invent random values", () => {
  const insights = getRelationshipInsights({
    currentProject: { customerName: "Sarah Dommerich" },
    completedProjects: [{ customerName: "Sarah Dommerich", id: "job-1" }],
  });
  const text = JSON.stringify(insights);

  assert.doesNotMatch(text, /\$\d/);
  assert.doesNotMatch(text, /profit|revenue|points|streak|badge/i);
  assert.doesNotMatch(text, /\b\d{1,2}:\d{2}\b/);
});
