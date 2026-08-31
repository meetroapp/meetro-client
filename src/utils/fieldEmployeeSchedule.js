import { getFormattingLocale } from "./localeFormat.js";

export const FIELD_EMPLOYEE_ACTIVE_VISIT_STATES = Object.freeze([
  "PROPOSED",
  "SCHEDULED",
  "STARTED",
]);

const ACTIVE_VISIT_STATES = new Set(FIELD_EMPLOYEE_ACTIVE_VISIT_STATES);
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function validTimeZone(value) {
  const timeZone = typeof value === "string" ? value.trim() : "";
  if (!timeZone) return "";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
    return timeZone;
  } catch {
    return "";
  }
}

function dateKeyParts(dateKey) {
  const match = String(dateKey || "").match(DATE_KEY_PATTERN);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day, date };
}

export function fieldScheduleDateKey(value, timeZone) {
  const canonicalTimeZone = validTimeZone(timeZone);
  const date = value instanceof Date ? value : new Date(value);
  if (!canonicalTimeZone || Number.isNaN(date.getTime())) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: canonicalTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const read = (type) => parts.find((part) => part.type === type)?.value || "";
    return `${read("year")}-${read("month")}-${read("day")}`;
  } catch {
    return "";
  }
}

export function addFieldScheduleDays(dateKey, days) {
  const parts = dateKeyParts(dateKey);
  if (!parts || !Number.isInteger(days)) return "";
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function fieldScheduleWeekStart(dateKey) {
  const parts = dateKeyParts(dateKey);
  if (!parts) return "";
  const mondayOffset = (parts.date.getUTCDay() + 6) % 7;
  return addFieldScheduleDays(dateKey, -mondayOffset);
}

export function buildFieldScheduleWeek(selectedDateKey, todayDateKey) {
  const weekStart = fieldScheduleWeekStart(selectedDateKey);
  if (!weekStart) return [];
  return Array.from({ length: 7 }, (_, index) => {
    const dateKey = addFieldScheduleDays(weekStart, index);
    return Object.freeze({
      dateKey,
      isSelected: dateKey === selectedDateKey,
      isToday: dateKey === todayDateKey,
    });
  });
}

export function shiftFieldScheduleWeek(selectedDateKey, direction) {
  if (![1, -1].includes(direction)) return selectedDateKey;
  return addFieldScheduleDays(selectedDateKey, direction * 7) || selectedDateKey;
}

export function resolveFieldScheduleTimeZone(schedule = [], businessTimeZone = "") {
  const canonicalBusinessTimeZone = validTimeZone(businessTimeZone);
  if (canonicalBusinessTimeZone) return canonicalBusinessTimeZone;
  for (const visit of Array.isArray(schedule) ? schedule : []) {
    const timeZone = validTimeZone(visit?.timeZone);
    if (timeZone) return timeZone;
  }
  return "UTC";
}

function hasEligibleAssignment(job) {
  return (Array.isArray(job?.assignments) ? job.assignments : []).some(
    (assignment) =>
      assignment?.state === "ACTIVE" &&
      (!assignment.memberStatus || assignment.memberStatus === "ACTIVE") &&
      (!assignment.memberRole || assignment.memberRole === "FIELD_EMPLOYEE")
  );
}

function normalizeVisit(visit, jobById) {
  const visitId = typeof visit?.visitId === "string" ? visit.visitId.trim() : "";
  const jobId = typeof visit?.jobId === "string" ? visit.jobId.trim() : "";
  const state = String(visit?.state || "").toUpperCase();
  const timeZone = validTimeZone(visit?.timeZone);
  const startsAt = typeof visit?.startsAt === "string" ? visit.startsAt : "";
  const startTime = Date.parse(startsAt);
  const dateKey = fieldScheduleDateKey(startsAt, timeZone);
  if (
    !visitId ||
    !jobId ||
    !ACTIVE_VISIT_STATES.has(state) ||
    !timeZone ||
    !Number.isFinite(startTime) ||
    !dateKey
  ) {
    return null;
  }
  const job = jobById.get(jobId) || null;
  const parsedEnd = visit?.endsAt ? Date.parse(visit.endsAt) : NaN;
  const endsAt = Number.isFinite(parsedEnd) && parsedEnd > startTime
    ? visit.endsAt
    : null;
  return Object.freeze({
    visitId,
    jobId,
    jobTitle: visit.jobTitle || job?.title || "",
    customerDisplayName: job?.customer?.displayName || "",
    purpose: visit.purpose || "",
    state,
    startsAt,
    endsAt,
    timeZone,
    location: visit.location || null,
    dateKey,
    startTime,
  });
}

export function reconcileFieldEmployeeSchedule({ jobs = [], schedule = [] } = {}) {
  const authorizedJobs = (Array.isArray(jobs) ? jobs : []).filter(
    (job) => typeof job?.id === "string" && job.id.trim()
  );
  const jobById = new Map(authorizedJobs.map((job) => [job.id, job]));
  const visits = (Array.isArray(schedule) ? schedule : [])
    .map((visit) => normalizeVisit(visit, jobById))
    .filter(Boolean)
    .sort((left, right) =>
      left.startTime - right.startTime || left.visitId.localeCompare(right.visitId)
    );
  const scheduledJobIds = new Set(visits.map((visit) => visit.jobId));
  const awaitingSchedule = authorizedJobs
    .filter(hasEligibleAssignment)
    .filter((job) => !scheduledJobIds.has(job.id));
  return Object.freeze({
    visits: Object.freeze(visits),
    awaitingSchedule: Object.freeze(awaitingSchedule),
  });
}

export function fieldScheduleVisitsForDay(visits = [], dateKey = "") {
  return (Array.isArray(visits) ? visits : [])
    .filter((visit) => visit?.dateKey === dateKey)
    .sort((left, right) =>
      left.startTime - right.startTime || left.visitId.localeCompare(right.visitId)
    );
}

function dateForFormatting(dateKey) {
  return dateKeyParts(dateKey)?.date || null;
}

export function formatFieldScheduleDate(dateKey, language, options) {
  const date = dateForFormatting(dateKey);
  if (!date) return "";
  return new Intl.DateTimeFormat(getFormattingLocale(language), {
    timeZone: "UTC",
    ...options,
  }).format(date);
}

export function formatFieldScheduleWeekRange(weekDays, language) {
  const first = dateForFormatting(weekDays?.[0]?.dateKey);
  const last = dateForFormatting(weekDays?.[6]?.dateKey);
  if (!first || !last) return "";
  const formatter = new Intl.DateTimeFormat(getFormattingLocale(language), {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
  return typeof formatter.formatRange === "function"
    ? formatter.formatRange(first, last)
    : `${formatter.format(first)} – ${formatter.format(last)}`;
}

export function formatFieldScheduleTimeRange(visit, language) {
  const timeZone = validTimeZone(visit?.timeZone);
  const start = new Date(visit?.startsAt || "");
  if (!timeZone || Number.isNaN(start.getTime())) return "";
  const formatter = new Intl.DateTimeFormat(getFormattingLocale(language), {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  const startLabel = formatter.format(start);
  if (!visit?.endsAt) return startLabel;
  const end = new Date(visit.endsAt);
  if (Number.isNaN(end.getTime())) return startLabel;
  return `${startLabel} – ${formatter.format(end)}`;
}
