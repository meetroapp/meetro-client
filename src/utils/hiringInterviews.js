import {
  HIRING_APPLICANTS,
  HIRING_INTERVIEWS,
  HIRING_POSITIONS,
} from "../data/hiringData.js";
import { HIRING_POSITIONS_STORAGE_KEY } from "./hiringCenterRegistry.js";

const STORE_PREFIX = "meetroHiringInterviews";
export const HIRING_INTERVIEW_STATUSES = Object.freeze([
  "scheduled",
  "rescheduled",
  "completed",
  "cancelled",
  "no_show",
]);
export const HIRING_INTERVIEW_TYPES = Object.freeze(["in_person", "phone", "video"]);

function text(value) {
  return String(value ?? "").trim();
}

function clone(record) {
  return record ? { ...record } : null;
}

function safeStorage(options = {}) {
  if (options.storage) return options.storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function readArray(storage, key) {
  if (!storage) return [];
  try {
    const value = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function businessKey(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "unscoped";
}

export function getActiveHiringBusinessId(options = {}) {
  const storage = safeStorage(options);
  try {
    return text(
      options.businessId ||
        storage?.getItem?.("businessId") ||
        storage?.getItem?.("contractorId") ||
        "local-business"
    );
  } catch {
    return text(options.businessId || "local-business");
  }
}

export function getHiringInterviewStorageKey(options = {}) {
  return `${STORE_PREFIX}:${businessKey(getActiveHiringBusinessId(options))}`;
}

function normalizeStatus(value) {
  const status = text(value).toLowerCase().replace(/\s+/g, "_");
  return HIRING_INTERVIEW_STATUSES.includes(status) ? status : "scheduled";
}

export function normalizeHiringInterview(record = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  return {
    ...record,
    id: text(record.id),
    businessId: text(record.businessId || record.business_id),
    positionId: text(record.positionId || record.position_id),
    applicantId: text(record.applicantId || record.applicant_id),
    conversationId: text(record.conversationId || record.conversation_id),
    title: text(record.title || record.positionTitle || "Interview"),
    interviewType: HIRING_INTERVIEW_TYPES.includes(record.interviewType)
      ? record.interviewType
      : HIRING_INTERVIEW_TYPES.includes(record.type)
      ? record.type
      : "phone",
    date: text(record.date || record.interviewDate),
    startTime: text(record.startTime || record.start_time),
    endTime: text(record.endTime || record.end_time),
    timezone: text(record.timezone || record.timeZone || "America/New_York"),
    location: text(record.location),
    meetingUrl: text(record.meetingUrl || record.meeting_url),
    notes: text(record.notes),
    status: normalizeStatus(record.status),
    createdAt: text(record.createdAt || record.created_at) || now,
    updatedAt: text(record.updatedAt || record.updated_at) || now,
    createdBy: text(record.createdBy || record.created_by),
    cancelledAt: text(record.cancelledAt || record.cancelled_at),
    completedAt: text(record.completedAt || record.completed_at),
    applicantName: text(record.applicantName),
    positionTitle: text(record.positionTitle),
  };
}

function getPositions(storage) {
  return [...HIRING_POSITIONS, ...readArray(storage, HIRING_POSITIONS_STORAGE_KEY)];
}

function resolvePosition(positionId, storage, supplied) {
  if (supplied && text(supplied.id) === text(positionId)) return supplied;
  return getPositions(storage).find((position) => text(position.id) === text(positionId)) || null;
}

function resolveApplicant(applicantId, supplied) {
  if (supplied && text(supplied.id) === text(applicantId)) return supplied;
  return HIRING_APPLICANTS.find((applicant) => text(applicant.id) === text(applicantId)) || null;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(value))) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTime(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text(value));
}

function validMeetingUrl(value) {
  try {
    const url = new URL(text(value));
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function validateHiringInterviewDraft(draft = {}, options = {}) {
  const storage = safeStorage(options);
  const businessId = getActiveHiringBusinessId({ ...options, businessId: draft.businessId });
  const errors = {};
  let storedAccountMode;
  try {
    storedAccountMode = storage?.getItem?.("activeAccountMode") || "";
  } catch {
    storedAccountMode = "";
  }
  const accountMode = text(options.accountMode || storedAccountMode || "business");
  const position = resolvePosition(draft.positionId, storage, options.position);
  const applicant = resolveApplicant(draft.applicantId, options.applicant);

  if (accountMode !== "business") errors.accountMode = "business_account_required";
  if (!text(draft.businessId)) errors.businessId = "required";
  if (!text(draft.positionId)) errors.positionId = "required";
  if (!text(draft.applicantId)) errors.applicantId = "required";
  if (!position) errors.positionId = "unknown_position";
  if (!applicant) errors.applicantId = "unknown_applicant";
  if (position && text(position.businessId) !== businessId) errors.positionId = "cross_business_position";
  if (applicant && text(applicant.businessId) !== businessId) errors.applicantId = "cross_business_applicant";
  if (applicant && text(applicant.positionId) !== text(draft.positionId)) errors.applicantId = "cross_position_applicant";
  if (!HIRING_INTERVIEW_TYPES.includes(draft.interviewType)) errors.interviewType = "required";
  if (!validDate(draft.date)) errors.date = "invalid_date";
  if (!validTime(draft.startTime)) errors.startTime = "invalid_time";
  if (!validTime(draft.endTime)) errors.endTime = "invalid_time";
  if (validTime(draft.startTime) && validTime(draft.endTime) && draft.endTime <= draft.startTime) {
    errors.endTime = "end_before_start";
  }
  if (draft.interviewType === "in_person" && !text(draft.location)) errors.location = "required";
  if (draft.interviewType === "video" && !text(draft.meetingUrl)) errors.meetingUrl = "required";
  if (draft.interviewType === "video" && text(draft.meetingUrl) && !validMeetingUrl(draft.meetingUrl)) errors.meetingUrl = "invalid_url";

  return { valid: Object.keys(errors).length === 0, errors, position: clone(position), applicant: clone(applicant) };
}

function fixtureInterviewsForBusiness(businessId) {
  return HIRING_INTERVIEWS
    .filter((record) => text(record.businessId) === businessId)
    .map((record) => normalizeHiringInterview(record));
}

export function readHiringInterviews(options = {}) {
  const storage = safeStorage(options);
  const businessId = getActiveHiringBusinessId(options);
  if (!businessId || businessId === "unscoped") return [];
  const stored = readArray(storage, getHiringInterviewStorageKey({ ...options, businessId }))
    .map((record) => normalizeHiringInterview(record))
    .filter((record) => record.businessId === businessId);
  const byId = new Map(stored.map((record) => [record.id, record]));
  fixtureInterviewsForBusiness(businessId).forEach((record) => {
    if (!byId.has(record.id)) byId.set(record.id, record);
  });
  return [...byId.values()].map(clone);
}

function writeInterviews(records, options = {}) {
  const storage = safeStorage(options);
  const businessId = getActiveHiringBusinessId(options);
  const safeRecords = records
    .filter((record) => record.businessId === businessId)
    .map((record) => normalizeHiringInterview(record));
  try {
    storage?.setItem?.(getHiringInterviewStorageKey({ ...options, businessId }), JSON.stringify(safeRecords));
  } catch {
    return safeRecords.map(clone);
  }
  return safeRecords.map(clone);
}

function generatedId(options = {}) {
  if (typeof options.idFactory === "function") return text(options.idFactory());
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `hiring-interview-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function duplicateInterview(records, draft) {
  return records.find((record) =>
    [record.businessId, record.positionId, record.applicantId, record.date, record.startTime, record.interviewType]
      .every((value, index) => value === [draft.businessId, draft.positionId, draft.applicantId, draft.date, draft.startTime, draft.interviewType][index]) &&
    !["cancelled", "completed", "no_show"].includes(record.status)
  );
}

export function createHiringInterview(draft = {}, options = {}) {
  const businessId = getActiveHiringBusinessId({ ...options, businessId: draft.businessId });
  const normalizedDraft = { ...draft, businessId };
  const validation = validateHiringInterviewDraft(normalizedDraft, options);
  if (!validation.valid) return { ok: false, errors: validation.errors, interview: null, created: false };
  const existing = readHiringInterviews({ ...options, businessId });
  const duplicate = duplicateInterview(existing, normalizedDraft);
  if (duplicate) return { ok: true, errors: {}, interview: clone(duplicate), created: false };
  const now = options.now || new Date().toISOString();
  const interview = normalizeHiringInterview({
    ...normalizedDraft,
    id: text(draft.id) || generatedId(options),
    title: text(draft.title) || `Interview · ${validation.position.title}`,
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
    createdBy: text(draft.createdBy || options.createdBy),
    applicantName: validation.applicant.name,
    positionTitle: validation.position.title,
  }, { now });
  writeInterviews([interview, ...existing.filter((item) => item.id !== interview.id)], { ...options, businessId });
  return { ok: true, errors: {}, interview: clone(interview), created: true };
}

export function updateHiringInterview(interviewId, changes = {}, options = {}) {
  const businessId = getActiveHiringBusinessId(options);
  const existing = readHiringInterviews({ ...options, businessId });
  const current = existing.find((record) => record.id === interviewId);
  if (!current || ["completed", "cancelled", "no_show"].includes(current.status)) {
    return { ok: false, errors: { status: "inactive_interview" }, interview: null };
  }
  const draft = { ...current, ...changes, id: current.id, businessId: current.businessId };
  const validation = validateHiringInterviewDraft(draft, options);
  if (!validation.valid) return { ok: false, errors: validation.errors, interview: null };
  const scheduleChanged = ["date", "startTime", "endTime", "timezone", "interviewType", "location", "meetingUrl"]
    .some((field) => text(draft[field]) !== text(current[field]));
  const interview = normalizeHiringInterview({
    ...draft,
    status: scheduleChanged ? "rescheduled" : current.status,
    createdAt: current.createdAt,
    updatedAt: options.now || new Date().toISOString(),
  });
  writeInterviews(existing.map((record) => record.id === interviewId ? interview : record), { ...options, businessId });
  return { ok: true, errors: {}, interview: clone(interview) };
}

function transitionInterview(interviewId, status, timestampField, options = {}) {
  const businessId = getActiveHiringBusinessId(options);
  const existing = readHiringInterviews({ ...options, businessId });
  const current = existing.find((record) => record.id === interviewId);
  if (!current || ["completed", "cancelled", "no_show"].includes(current.status)) {
    return { ok: false, interview: null };
  }
  const now = options.now || new Date().toISOString();
  const interview = normalizeHiringInterview({ ...current, status, [timestampField]: now, updatedAt: now });
  writeInterviews(existing.map((record) => record.id === interviewId ? interview : record), { ...options, businessId });
  return { ok: true, interview: clone(interview) };
}

export function cancelHiringInterview(interviewId, options = {}) {
  return transitionInterview(interviewId, "cancelled", "cancelledAt", options);
}

export function completeHiringInterview(interviewId, options = {}) {
  return transitionInterview(interviewId, "completed", "completedAt", options);
}

export function resolveHiringInterviewStatus(interview = {}) {
  return normalizeStatus(interview.status);
}

export function filterHiringInterviews(interviews = [], filters = {}) {
  return interviews.filter((record) =>
    (!filters.businessId || record.businessId === filters.businessId) &&
    (!filters.positionId || record.positionId === filters.positionId) &&
    (!filters.applicantId || record.applicantId === filters.applicantId) &&
    (!filters.status || (Array.isArray(filters.status) ? filters.status : [filters.status]).includes(record.status))
  ).map(clone);
}

export function formatHiringInterviewSummary(interview = {}) {
  const date = validDate(interview.date)
    ? new Date(`${interview.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "Date pending";
  const time = [text(interview.startTime), text(interview.endTime)].filter(Boolean).join("–") || "Time pending";
  return `${date} · ${time}`;
}

export function projectHiringInterviewNotification(interview = {}) {
  const eventType = interview.status === "cancelled"
    ? "hiring_interview_cancelled"
    : interview.status === "rescheduled"
    ? "hiring_interview_rescheduled"
    : "hiring_interview_scheduled";
  return {
    type: eventType,
    role: "applicant",
    title: interview.status === "cancelled" ? "Interview Cancelled" : interview.status === "rescheduled" ? "Interview Rescheduled" : "Interview Scheduled",
    message: `${interview.positionTitle || interview.title} · ${formatHiringInterviewSummary(interview)}`,
    conversationId: interview.conversationId,
    dedupeKey: `${eventType}:${interview.id}`,
    metadata: {
      interviewId: interview.id,
      businessId: interview.businessId,
      positionId: interview.positionId,
      applicantId: interview.applicantId,
      conversationType: "hiring_application",
    },
  };
}
