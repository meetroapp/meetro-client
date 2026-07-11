function recordTime(record = {}) { return record.createdAt || record.requestedAt || record.relationshipSince || record.completedAt || record.closedAt || record.updatedAt || record.lastInteractionAt || ""; }

export function classifyRelationshipContinuity(records = [], activity = {}, relationshipType = "") {
  const dates = records.map((entry) => recordTime(entry.record)).filter((value) => Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(a) - Date.parse(b));
  const first = dates[0] || "";
  const latest = dates.at(-1) || "";
  const age = first && latest ? Math.max(0, Math.floor((Date.parse(latest) - Date.parse(first)) / 86_400_000)) : null;
  const summary = activity.summary || {};
  const hasActive = summary.activeRequests > 0 || summary.activeEmergencies > 0 || activity.facts?.jobs?.some((entry) => /active|in_progress|working|started|scheduled/.test(String(entry.record?.status || "").toLowerCase()));
  let classification = "unknown";
  if (relationshipType === "conversation_only" && !summary.totalRequests && !summary.completedJobs) classification = "conversation_only";
  else if (summary.closedJobs > 0 && hasActive) classification = "returning_customer";
  else if (hasActive) classification = summary.totalRequests === 1 && (activity.facts?.jobs?.length || 0) === 0 ? "first_time_customer" : "active_customer";
  else if (summary.closedJobs > 0 || summary.completedJobs > 0) classification = "past_customer";
  else if (summary.totalRequests === 1 || summary.openConversations === 1) classification = "first_time_customer";
  else if (records.length) classification = "new_relationship";
  return { classification, firstKnownInteractionAt: first, latestKnownInteractionAt: latest, relationshipAgeDays: age };
}
