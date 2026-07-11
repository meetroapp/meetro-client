const CLOSED = new Set(["closed", "closure_completed", "history", "archived"]);
const ACTIVE = new Set(["perform_work", "schedule_work", "active", "in_progress", "working", "started", "on_the_way", "arrived"]);
function date(value) { const time = Date.parse(value || ""); return Number.isFinite(time) ? time : null; }
function businessDay(value, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function buildBusinessWorkload({ workflows = [], typedRecords = [], now = Date.now(), timezone = "UTC" } = {}) {
  const day = businessDay(now, timezone);
  const schedules = typedRecords.filter((item) => item.kind === "schedule");
  const scheduledToday = schedules.filter((item) => item.scheduledAt && businessDay(item.scheduledAt, timezone) === day).length;
  const scheduledUpcoming = schedules.filter((item) => date(item.scheduledAt) > now).length;
  const overdueItems = [...workflows, ...schedules].filter((item) =>
    item.explicitOverdue
    || (date(item.dueAt) !== null && date(item.dueAt) < now)
    || (item.kind === "schedule" && date(item.scheduledAt) !== null && date(item.scheduledAt) < now && ["scheduled", "confirmed", "pending"].includes(item.status))
  ).length;
  return {
    totalOpenWorkflows: workflows.filter((item) => !CLOSED.has(item.status) && !item.closureRecorded).length,
    activeJobs: workflows.filter((item) => ACTIVE.has(item.stage) || ACTIVE.has(item.status)).length,
    activeEmergencyJobs: workflows.filter((item) => item.isEmergency && !item.closureRecorded).length,
    scheduledToday, scheduledUpcoming, overdueItems,
    completedNotClosed: workflows.filter((item) => item.completionRecorded && !item.closureRecorded).length,
    closedJobs: workflows.filter((item) => item.closureRecorded || CLOSED.has(item.status)).length,
  };
}
