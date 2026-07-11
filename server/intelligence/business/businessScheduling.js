function time(value) { const parsed = Date.parse(value || ""); return Number.isFinite(parsed) ? parsed : null; }
export function buildBusinessScheduling({ workload = {}, pipeline = {}, typedRecords = [], capacityDefault = null } = {}) {
  const schedules = typedRecords.filter((item) => item.kind === "schedule");
  let conflicts = schedules.filter((item) => item.explicitConflict).length;
  for (let left = 0; left < schedules.length; left += 1) for (let right = left + 1; right < schedules.length; right += 1) {
    const aStart = time(schedules[left].scheduledAt); const aEnd = time(schedules[left].endAt);
    const bStart = time(schedules[right].scheduledAt); const bEnd = time(schedules[right].endAt);
    if (aStart !== null && aEnd !== null && bStart !== null && bEnd !== null && aStart < bEnd && bStart < aEnd) conflicts += 1;
  }
  let capacity = "unknown";
  if (capacityDefault && ["available", "medium", "busy", "full"].includes(capacityDefault)) capacity = capacityDefault;
  else if (conflicts > 0 || workload.activeEmergencyJobs > 1) capacity = "full";
  else if (workload.scheduledToday >= 4) capacity = "busy";
  else if (workload.scheduledToday > 0 || workload.scheduledUpcoming > 0) capacity = "medium";
  else if (schedules.length || workload.totalOpenWorkflows > 0) capacity = "available";
  return { capacity, scheduledToday: workload.scheduledToday, conflicts, overdueVisits: workload.overdueItems, unscheduledApprovedWork: pipeline.approvedNotScheduled };
}
