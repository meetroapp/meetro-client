import test from "node:test";
import assert from "node:assert/strict";
import {
  getNotificationCategory,
  getNotificationRoute,
  groupNotificationsByAge,
  sortNotificationsByAttention,
} from "../src/utils/notificationCenter.js";
import {
  getNotifications,
  getUnreadNotificationCount,
  upsertNotification,
} from "../src/utils/meetroNotifications.js";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test("notification categories separate project, message, quote, emergency, hiring, review, and system alerts", () => {
  assert.equal(getNotificationCategory({ type: "work_update" }), "projectUpdates");
  assert.equal(getNotificationCategory({ type: "unread_message" }), "messages");
  assert.equal(getNotificationCategory({ type: "quote_sent" }), "quotes");
  assert.equal(getNotificationCategory({ type: "appointment_confirmed" }), "schedule");
  assert.equal(getNotificationCategory({ type: "emergency_update" }), "emergency");
  assert.equal(getNotificationCategory({ type: "hiring_application" }), "hiring");
  assert.equal(getNotificationCategory({ type: "hiring_interview_scheduled" }), "hiring");
  assert.equal(getNotificationCategory({ type: "review_reminder" }), "reviews");
  assert.equal(getNotificationCategory({ type: "maintenance_notice" }), "system");
});

test("notification routes open the existing destination for each workflow type", () => {
  assert.equal(
    getNotificationRoute({ type: "quote_sent", requestId: "req-1" }).page,
    "conversationThread"
  );
  assert.equal(
    getNotificationRoute({ type: "quote_sent", requestId: "req-1" }).context.activeConversationId,
    "req-1"
  );
  assert.equal(
    getNotificationRoute({ type: "unread_message", conversationId: "conv-1" }).page,
    "conversationThread"
  );
  assert.equal(
    getNotificationRoute({ type: "emergency_update", emergencyId: "em-1" }).page,
    "emergencyStatus"
  );
  assert.equal(
    getNotificationRoute({ type: "hiring_application" }, "business").page,
    "messagesInbox"
  );
  assert.equal(
    getNotificationRoute({ type: "hiring_application" }, "business").context
      .meetroMessageSection,
    "hiring"
  );
  assert.equal(
    getNotificationRoute({ type: "review_reminder", requestId: "req-1" }).page,
    "completedJobDetails"
  );
});

test("notifications sort unread first and group by age", () => {
  const now = new Date("2026-06-25T12:00:00.000Z");
  const notifications = [
    { id: "old", read: true, timestamp: "2026-06-20T12:00:00.000Z" },
    { id: "today-read", read: true, timestamp: "2026-06-25T09:00:00.000Z" },
    { id: "today-unread", read: false, timestamp: "2026-06-25T08:00:00.000Z" },
  ];

  assert.equal(sortNotificationsByAttention(notifications)[0].id, "today-unread");

  const groups = groupNotificationsByAge(notifications, now);
  assert.deepEqual(
    groups.today.map((item) => item.id),
    ["today-read", "today-unread"]
  );
  assert.deepEqual(
    groups.older.map((item) => item.id),
    ["old"]
  );
});

test("browser-local notification records and writes remain dormant", () => {
  const previousStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  globalThis.localStorage = createStorage();
  globalThis.window = { dispatchEvent() {} };
  try {
    localStorage.setItem(
      "meetro_notifications",
      JSON.stringify([{ id: "stale", type: "hiring_interview_rescheduled", read: false }])
    );
    const base = {
      type: "hiring_interview_rescheduled",
      role: "applicant",
      title: "Interview Rescheduled",
      conversationId: "hiring-conversation-1",
      dedupeKey: "hiring_interview_rescheduled:interview-1",
      metadata: { interviewId: "interview-1", positionId: "position-1", applicantId: "applicant-1" },
    };
    upsertNotification({ ...base, message: "First time" });
    upsertNotification({ ...base, message: "Updated time" });
    const records = JSON.parse(localStorage.getItem("meetro_notifications"));
    assert.deepEqual(records, [
      { id: "stale", type: "hiring_interview_rescheduled", read: false },
    ]);
    assert.deepEqual(getNotifications(), []);
    assert.equal(getUnreadNotificationCount(), 0);
  } finally {
    globalThis.localStorage = previousStorage;
    globalThis.window = previousWindow;
  }
});
