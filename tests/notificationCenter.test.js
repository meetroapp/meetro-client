import test from "node:test";
import assert from "node:assert/strict";
import {
  getNotificationCategory,
  getNotificationRoute,
  groupNotificationsByAge,
  sortNotificationsByAttention,
} from "../src/utils/notificationCenter.js";

test("notification categories separate project, message, quote, emergency, hiring, review, and system alerts", () => {
  assert.equal(getNotificationCategory({ type: "work_update" }), "projectUpdates");
  assert.equal(getNotificationCategory({ type: "unread_message" }), "messages");
  assert.equal(getNotificationCategory({ type: "quote_sent" }), "quotes");
  assert.equal(getNotificationCategory({ type: "appointment_confirmed" }), "schedule");
  assert.equal(getNotificationCategory({ type: "emergency_update" }), "emergency");
  assert.equal(getNotificationCategory({ type: "hiring_application" }), "hiring");
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
