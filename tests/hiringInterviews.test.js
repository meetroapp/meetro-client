import test from "node:test";
import assert from "node:assert/strict";
import {
  cancelHiringInterview,
  completeHiringInterview,
  createHiringInterview,
  filterHiringInterviews,
  formatHiringInterviewSummary,
  getUpcomingHiringInterviews,
  hasValidHiringInterviewSchedule,
  getHiringInterviewStorageKey,
  normalizeHiringInterview,
  projectHiringInterviewNotification,
  readHiringInterviews,
  updateHiringInterview,
  validateHiringInterviewDraft,
} from "../src/utils/hiringInterviews.js";

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

const position = { id: "position-1", businessId: "business-1", title: "Painter" };
const applicant = { id: "applicant-1", businessId: "business-1", positionId: "position-1", name: "Alex" };
const validDraft = {
  businessId: "business-1",
  positionId: "position-1",
  applicantId: "applicant-1",
  interviewType: "phone",
  date: "2026-08-10",
  startTime: "10:00",
  endTime: "10:30",
  timezone: "America/New_York",
};
const options = { businessId: "business-1", accountMode: "business", position, applicant };

test("business user schedules one stable business-scoped interview", () => {
  const store = storage({ activeAccountMode: "business", businessId: "business-1" });
  const first = createHiringInterview(validDraft, { ...options, storage: store, idFactory: () => "interview-1", now: "2026-07-13T12:00:00Z" });
  const repeated = createHiringInterview(validDraft, { ...options, storage: store, idFactory: () => "interview-2" });
  assert.equal(first.ok, true);
  assert.equal(first.interview.id, "interview-1");
  assert.equal(first.interview.businessId, "business-1");
  assert.equal(first.interview.positionId, "position-1");
  assert.equal(first.interview.applicantId, "applicant-1");
  assert.equal(repeated.created, false);
  assert.equal(readHiringInterviews({ businessId: "business-1", storage: store }).filter((item) => item.id === "interview-1").length, 1);
});

test("reschedule preserves ID while cancel and complete remain hiring-only transitions", () => {
  const store = storage({ activeAccountMode: "business", businessId: "business-1" });
  createHiringInterview(validDraft, { ...options, storage: store, idFactory: () => "interview-1" });
  const rescheduled = updateHiringInterview("interview-1", { startTime: "11:00", endTime: "11:30" }, { ...options, storage: store });
  assert.equal(rescheduled.interview.id, "interview-1");
  assert.equal(rescheduled.interview.status, "rescheduled");
  assert.equal(cancelHiringInterview("interview-1", { ...options, storage: store }).interview.status, "cancelled");

  const secondStore = storage({ activeAccountMode: "business", businessId: "business-1" });
  createHiringInterview(validDraft, { ...options, storage: secondStore, idFactory: () => "interview-2" });
  const completed = completeHiringInterview("interview-2", { ...options, storage: secondStore });
  assert.equal(completed.interview.status, "completed");
  assert.equal(completed.interview.applicantStatus, undefined);
});

test("ownership and account mode validation fail closed without name matching", () => {
  const sameNameOtherBusiness = { ...applicant, id: "applicant-2", businessId: "business-2", name: "Alex" };
  assert.equal(validateHiringInterviewDraft(validDraft, { ...options, accountMode: "personal" }).valid, false);
  assert.equal(validateHiringInterviewDraft({ ...validDraft, applicantId: "applicant-2" }, { ...options, applicant: sameNameOtherBusiness }).errors.applicantId, "cross_business_applicant");
  assert.equal(validateHiringInterviewDraft(validDraft, { ...options, applicant: { ...applicant, positionId: "position-2" } }).errors.applicantId, "cross_position_applicant");
});

test("type and time validation follows explicit interview requirements", () => {
  assert.equal(validateHiringInterviewDraft({ ...validDraft, interviewType: "in_person", location: "" }, options).errors.location, "required");
  assert.equal(validateHiringInterviewDraft({ ...validDraft, interviewType: "video", meetingUrl: "" }, options).errors.meetingUrl, "required");
  assert.equal(validateHiringInterviewDraft({ ...validDraft, interviewType: "phone", location: "", meetingUrl: "" }, options).valid, true);
  assert.equal(validateHiringInterviewDraft({ ...validDraft, date: "invalid" }, options).errors.date, "invalid_date");
  assert.equal(validateHiringInterviewDraft({ ...validDraft, endTime: "09:00" }, options).errors.endTime, "end_before_start");
});

test("business stores stay isolated across account switching and malformed storage", () => {
  const store = storage({ activeAccountMode: "business", businessId: "business-1" });
  createHiringInterview(validDraft, { ...options, storage: store, idFactory: () => "interview-1" });
  store.setItem("businessId", "business-2");
  assert.equal(readHiringInterviews({ businessId: "business-2", storage: store }).some((item) => item.id === "interview-1"), false);
  store.setItem(getHiringInterviewStorageKey({ businessId: "business-2", storage: store }), "malformed");
  assert.deepEqual(readHiringInterviews({ businessId: "business-2", storage: store }), []);
  store.setItem("businessId", "business-1");
  assert.equal(readHiringInterviews({ businessId: "business-1", storage: store }).some((item) => item.id === "interview-1"), true);
});

test("filters and notification projection expose hiring metadata only", () => {
  const record = { ...validDraft, id: "interview-1", status: "scheduled", positionTitle: "Painter", conversationId: "hiring-conversation-1" };
  assert.equal(filterHiringInterviews([record], { applicantId: "applicant-1" }).length, 1);
  assert.equal(filterHiringInterviews([record], { applicantId: "other" }).length, 0);
  const notification = projectHiringInterviewNotification(record);
  assert.equal(notification.type, "hiring_interview_scheduled");
  assert.equal(notification.role, "applicant");
  assert.equal(notification.metadata.interviewId, "interview-1");
  assert.equal(notification.requestId, undefined);
  assert.equal(notification.appointmentId, undefined);
});

test("helpers do not mutate caller input", () => {
  const draft = { ...validDraft };
  const before = structuredClone(draft);
  validateHiringInterviewDraft(draft, options);
  assert.deepEqual(draft, before);
});

test("legacy fixtures remain readable and storage failures fail safely", () => {
  const qa = { businessId: "local-business", storage: storage(), environment: "development", qaMode: true };
  const first = readHiringInterviews(qa);
  const second = readHiringInterviews(qa);
  assert.equal(first.some((record) => record.id === "interview-maya-torres"), true);
  assert.deepEqual(second, first);
  const unavailable = { getItem() { throw new Error("unavailable"); }, setItem() { throw new Error("unavailable"); } };
  assert.deepEqual(readHiringInterviews({ businessId: "business-unknown", storage: unavailable }), []);
});

test("incomplete scheduled records require details and never invent date or time", () => {
  const legacy = normalizeHiringInterview({
    id: "legacy-incomplete",
    businessId: "business-1",
    positionId: "position-1",
    applicantId: "applicant-1",
    status: "scheduled",
    date: "",
    startTime: "",
  }, { now: "2026-07-13T12:00:00.000Z" });
  assert.equal(legacy.status, "scheduling_required");
  assert.equal(hasValidHiringInterviewSchedule(legacy), false);
  assert.equal(formatHiringInterviewSummary(legacy), "Scheduling details required");
  assert.deepEqual(getUpcomingHiringInterviews([legacy]), []);
});

test("valid scheduled interviews remain upcoming while completed and cancelled history stays readable", () => {
  const scheduled = normalizeHiringInterview({ ...validDraft, id: "scheduled-1", status: "scheduled" });
  const completed = normalizeHiringInterview({ ...validDraft, id: "completed-1", status: "completed" });
  const cancelled = normalizeHiringInterview({ ...validDraft, id: "cancelled-1", status: "cancelled" });
  assert.deepEqual(getUpcomingHiringInterviews([scheduled, completed, cancelled]).map((record) => record.id), ["scheduled-1"]);
  assert.notEqual(formatHiringInterviewSummary(completed), "Scheduling details required");
  assert.notEqual(formatHiringInterviewSummary(cancelled), "Scheduling details required");
});
