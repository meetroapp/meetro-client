import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHiringConversationRecord,
  filterHiringConversationMessages,
  isHiringConversationType,
  isMessageAllowedInHiringConversation,
  saveHiringConversation,
  resolveHiringConversation,
  upsertHiringInterviewMessage,
} from "../src/utils/hiringConversations.js";

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

test("hiring conversation categories are classified separately", () => {
  assert.equal(isHiringConversationType("hiring"), true);
  assert.equal(isHiringConversationType("hiring_application"), true);
  assert.equal(isHiringConversationType("job_inquiry"), true);
  assert.equal(isHiringConversationType("applicant_message"), true);
  assert.equal(isHiringConversationType("emergency"), false);
  assert.equal(isHiringConversationType("standard"), false);
});

test("buildHiringConversationRecord preserves Jobs & Hiring message context", () => {
  const record = buildHiringConversationRecord({
    type: "hiring",
    jobId: "job-123",
    positionId: "position-123",
    positionTitle: "Field Handyman Helper",
    businessId: "business-1",
    businessName: "Bgone Home Renovation & Handyman Services",
    participantName: "Sarah Applicant",
    source: "jobs_hiring",
  });

  assert.equal(record.conversation_type, "hiring");
  assert.equal(record.jobId, "job-123");
  assert.equal(record.positionId, "position-123");
  assert.equal(record.positionTitle, "Field Handyman Helper");
  assert.equal(record.businessName, "Bgone Home Renovation & Handyman Services");
  assert.equal(record.participantName, "Sarah Applicant");
  assert.equal(record.source, "jobs_hiring");
});

test("buildHiringConversationRecord preserves applicant detail message context", () => {
  const record = buildHiringConversationRecord({
    type: "hiring_application",
    applicantId: "applicant-1",
    applicantName: "Sarah Applicant",
    positionId: "field-handyman-helper",
    positionTitle: "Field Handyman Helper",
    businessId: "business-1",
    businessName: "Bgone Home Renovation & Handyman Services",
    source: "hiring_center",
  });

  assert.equal(record.conversation_type, "hiring_application");
  assert.equal(record.applicantId, "applicant-1");
  assert.equal(record.applicantName, "Sarah Applicant");
  assert.equal(record.positionId, "field-handyman-helper");
  assert.equal(record.positionTitle, "Field Handyman Helper");
  assert.equal(record.businessId, "business-1");
  assert.equal(record.source, "hiring_center");
});

test("saveHiringConversation writes registry, active conversation, meta, and starter message", () => {
  const storage = createMemoryStorage();

  const record = saveHiringConversation(
    {
      type: "hiring_application",
      applicantId: "applicant-1",
      applicantName: "Sarah Applicant",
      positionId: "field-handyman-helper",
      positionTitle: "Field Handyman Helper",
      businessName: "Bgone Home Renovation & Handyman Services",
      source: "hiring_center",
    },
    storage
  );

  const registry = JSON.parse(storage.getItem("meetro_conversation_registry"));
  const meta = JSON.parse(storage.getItem(`meetro_conversation_meta_${record.id}`));
  const messages = JSON.parse(storage.getItem(`meetro_conversation_${record.id}`));

  assert.equal(storage.getItem("activeConversationId"), record.id);
  assert.equal(storage.getItem("meetroConversationType"), "hiring_application");
  assert.equal(registry[0].conversation_type, "hiring_application");
  assert.equal(registry[0].positionTitle, "Field Handyman Helper");
  assert.equal(registry[0].applicantName, "Sarah Applicant");
  assert.equal(meta.conversationType, "hiring_application");
  assert.equal(meta.positionTitle, "Field Handyman Helper");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].workflowType, "hiring_context");
});

test("saveHiringConversation reopens an existing applicant position thread without duplicating messages", () => {
  const storage = createMemoryStorage();

  const firstRecord = saveHiringConversation(
    {
      type: "hiring",
      userId: "sarah@example.com",
      applicantId: "sarah@example.com",
      applicantName: "Sarah Applicant",
      positionId: "field-handyman-helper",
      positionTitle: "Field Handyman Helper",
      businessName: "Bgone Home Renovation & Handyman Services",
      source: "community_hiring",
      lastMessage: "Sarah Applicant is interested in Field Handyman Helper.",
    },
    storage
  );
  const firstMessages = JSON.parse(
    storage.getItem(`meetro_conversation_${firstRecord.id}`)
  );

  const reopenedRecord = saveHiringConversation(
    {
      type: "hiring",
      userId: "sarah@example.com",
      applicantId: "sarah@example.com",
      applicantName: "Sarah Applicant",
      positionId: "field-handyman-helper",
      positionTitle: "Field Handyman Helper",
      businessName: "Bgone Home Renovation & Handyman Services",
      source: "community_hiring",
      lastMessage: "Sarah Applicant is interested in Field Handyman Helper.",
    },
    storage
  );
  const registry = JSON.parse(storage.getItem("meetro_conversation_registry"));
  const reopenedMessages = JSON.parse(
    storage.getItem(`meetro_conversation_${reopenedRecord.id}`)
  );

  assert.equal(reopenedRecord.id, firstRecord.id);
  assert.equal(registry.filter((item) => item.id === firstRecord.id).length, 1);
  assert.equal(reopenedMessages.length, firstMessages.length);
  assert.equal(storage.getItem("activeConversationId"), firstRecord.id);
});

test("hiring conversations reject work scheduling workflow cards", () => {
  const scheduleMessage = {
    id: "schedule-msg-1",
    type: "schedule",
    title: "Work Scheduled",
    workflowType: "work_scheduled",
    schedule: {
      id: "schedule-1",
      status: "work_scheduled",
      customerConfirmationStatus: "pending_customer_confirmation",
    },
  };

  assert.equal(isMessageAllowedInHiringConversation(scheduleMessage), false);
});

test("hiring conversations reject appointment reminders and project workflow actions", () => {
  const blockedMessages = [
    {
      id: "appointment-reminder-1",
      type: "system",
      workflowType: "appointment_reminders",
      appointmentId: "schedule-1",
    },
    {
      id: "approval-1",
      type: "approval",
      title: "Approval Requested",
    },
    {
      id: "materials-1",
      type: "materials-list",
      title: "Materials List",
    },
    {
      id: "workflow-1",
      type: "workflow_change_request",
      title: "Change Request",
    },
  ];

  blockedMessages.forEach((message) => {
    assert.equal(isMessageAllowedInHiringConversation(message), false);
  });
});

test("hiring message filter keeps hiring text and removes work scheduling leakage", () => {
  const messages = [
    {
      id: "hiring-text-1",
      type: "text",
      workflowType: "hiring_context",
      text: "I am interested in the Field Handyman Helper position.",
    },
    {
      id: "work-schedule-1",
      type: "schedule",
      title: "Work Scheduled",
      workflowType: "work_scheduled",
      scheduleId: "schedule-1",
    },
    {
      id: "hiring-text-2",
      type: "text",
      text: "I have transportation and can start this week.",
    },
  ];

  const filtered = filterHiringConversationMessages(messages);

  assert.deepEqual(
    filtered.map((message) => message.id),
    ["hiring-text-1", "hiring-text-2"]
  );
});

test("hiring interview card is linked by stable IDs and replaced on reschedule", () => {
  const storage = createMemoryStorage();
  const conversation = saveHiringConversation({
    type: "hiring_application",
    businessId: "business-1",
    positionId: "position-1",
    applicantId: "applicant-1",
    applicantName: "Alex Applicant",
    positionTitle: "Painter",
  }, storage);
  assert.equal(resolveHiringConversation({ businessId: "business-1", positionId: "position-1", applicantId: "applicant-1" }, storage).id, conversation.id);
  upsertHiringInterviewMessage({
    id: "interview-1",
    conversationId: conversation.id,
    businessId: "business-1",
    positionId: "position-1",
    applicantId: "applicant-1",
    positionTitle: "Painter",
    interviewType: "phone",
    date: "2026-08-10",
    startTime: "10:00",
    endTime: "10:30",
    status: "scheduled",
  }, storage);
  upsertHiringInterviewMessage({
    id: "interview-1",
    conversationId: conversation.id,
    businessId: "business-1",
    positionId: "position-1",
    applicantId: "applicant-1",
    positionTitle: "Painter",
    interviewType: "phone",
    date: "2026-08-11",
    startTime: "11:00",
    endTime: "11:30",
    status: "rescheduled",
  }, storage);
  const messages = JSON.parse(storage.getItem(`meetro_conversation_${conversation.id}`));
  const cards = messages.filter((item) => item.interviewId === "interview-1");
  assert.equal(cards.length, 1);
  assert.equal(cards[0].type, "hiring-interview");
  assert.equal(cards[0].workflowType, "hiring_interview");
  assert.equal(cards[0].interviewStatus, "rescheduled");
  assert.equal(cards[0].schedule, undefined);
  assert.equal(isMessageAllowedInHiringConversation(cards[0]), true);
});
