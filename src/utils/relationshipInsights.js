function firstValue(...values) {
  return values.find((value) => String(value || "").trim()) || "";
}

function safeJsonFromStorage(storage, key, fallback) {
  try {
    const value = JSON.parse(storage.getItem(key) || "");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function readArray(storage, keys = []) {
  return keys.flatMap((key) => {
    const value = safeJsonFromStorage(storage, key, []);
    if (Array.isArray(value)) return value;
    return value && typeof value === "object" ? [value] : [];
  });
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeIdentity(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isProvided(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return normalizeText(value) !== "";
}

function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return firstValue(item?.label, item?.title, item?.name, item?.description, item?.note, item?.value);
      })
      .filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, itemValue]) => isProvided(itemValue))
      .map(([key, itemValue]) => {
        if (typeof itemValue === "boolean") return key;
        if (typeof itemValue === "string") return itemValue;
        return firstValue(itemValue?.label, itemValue?.title, itemValue?.description, itemValue?.note, key);
      })
      .filter(Boolean);
  }
  return normalizeText(value)
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCustomerName(record = {}) {
  return firstValue(
    record.customerName,
    record.homeownerName,
    record.clientName,
    record.customer,
    record.userName
  );
}

function getConversationId(record = {}) {
  return firstValue(
    record.conversationId,
    record.activeConversationId,
    record.projectConversationId,
    record.threadId
  );
}

function getProjectId(record = {}) {
  return firstValue(record.projectId, record.requestId, record.jobId, record.id);
}

function getCompletedDate(record = {}) {
  return firstValue(
    record.completedAt,
    record.completedDate,
    record.closedAt,
    record.dateCompleted,
    record.date,
    record.updatedAt
  );
}

function getWarrantyExpiration(record = {}) {
  const warranty = record.warranty || record.warrantyRecord || {};
  return firstValue(
    record.warrantyExpiration,
    record.warrantyExpiresAt,
    record.warrantyEndDate,
    record.warrantyExpirationDate,
    warranty.expiration,
    warranty.expiresAt,
    warranty.endDate
  );
}

function parseDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function daysBetween(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

function ordinalProjectCount(count) {
  if (count === 2) return "second";
  if (count === 3) return "third";
  if (count === 4) return "fourth";
  return `${count}th`;
}

function getRelationshipMemory(record = {}) {
  return firstValue(
    record.customerPreferences,
    record.communicationPreference,
    record.contactPreference,
    record.appointmentPreference,
    record.requestedNotice,
    record.propertyNotes,
    record.accessNotes,
    record.petNotes,
    record.gateCode,
    record.parkingNotes
  );
}

function insightBase({
  id,
  type = "relationship",
  priority = "medium",
  icon = "customerRelationships",
  titleKey = "relationshipInsightTitle",
  actionLabelKey = "hide",
  actionType = "dismiss",
  relatedId = "",
  messageKey = "",
  message = "",
  record = null,
}) {
  return {
    id,
    type,
    priority,
    icon,
    titleKey,
    messageKey,
    message,
    actionLabelKey,
    actionType,
    relatedId,
    record,
  };
}

export function buildRelationshipInsightContextFromStorage({
  storage = globalThis?.localStorage,
  currentPage = "",
} = {}) {
  const store = storage || { getItem: () => null };
  const currentProject =
    safeJsonFromStorage(store, "selectedConversation", null) ||
    safeJsonFromStorage(store, "selectedHomeownerRequest", null) ||
    safeJsonFromStorage(store, "selectedQuoteRequest", null) ||
    safeJsonFromStorage(store, "lastCompletedProject", null);
  const completedProjects = readArray(store, ["completedProjects", "meetroCompletedProjects"]);
  const completedHomeownerRequests = readArray(store, ["homeownerRequests"]).filter((request) =>
    /completed|closed|history/i.test(String(request?.status || ""))
  );

  return {
    role: store.getItem("activeAccountMode") === "business" ? "business" : "personal",
    currentPage,
    currentProject,
    completedProjects: [...completedProjects, ...completedHomeownerRequests],
  };
}

export function getDismissedRelationshipInsightIds(storage = globalThis?.localStorage) {
  const store = storage || { getItem: () => null };
  const value = safeJsonFromStorage(store, "meetro.relationshipInsights.dismissed", []);
  return Array.isArray(value) ? value : [];
}

export function dismissRelationshipInsight(id, storage = globalThis?.localStorage) {
  if (!id || !storage?.setItem) return [];
  const dismissed = new Set(getDismissedRelationshipInsightIds(storage));
  dismissed.add(id);
  const nextDismissed = [...dismissed];
  storage.setItem("meetro.relationshipInsights.dismissed", JSON.stringify(nextDismissed));
  return nextDismissed;
}

export function filterDismissedRelationshipInsights(insights = [], storage = globalThis?.localStorage) {
  const dismissed = new Set(getDismissedRelationshipInsightIds(storage));
  return insights.filter((insight) => !dismissed.has(insight.id));
}

export function getRelationshipInsights(context = {}) {
  const now = parseDate(context.now) || new Date();
  const currentProject = context.currentProject || {};
  const completedProjects = Array.isArray(context.completedProjects) ? context.completedProjects : [];
  const currentCustomer = firstValue(context.customerName, getCustomerName(currentProject));
  const currentCustomerKey = normalizeIdentity(currentCustomer);
  const insights = [];

  if (
    !currentCustomerKey &&
    completedProjects.length === 0 &&
    !isProvided(getRelationshipMemory(currentProject)) &&
    !isProvided(getWarrantyExpiration(currentProject))
  ) {
    return [];
  }

  const matchingCompleted = currentCustomerKey
    ? completedProjects.filter((record) => normalizeIdentity(getCustomerName(record)) === currentCustomerKey)
    : [];

  if (currentCustomerKey && matchingCompleted.length === 1) {
    insights.push(
      insightBase({
        id: `first-project:${currentCustomerKey}`,
        titleKey: "relationshipInsightFirstProjectTogether",
        messageKey: "relationshipInsightFirstProjectMessage",
        message: "This is your first completed project together.",
        actionLabelKey: "viewHistory",
        actionType: "history",
        relatedId: currentCustomerKey,
        record: matchingCompleted[0],
      })
    );
  }

  if (currentCustomerKey && matchingCompleted.length > 1) {
    insights.push(
      insightBase({
        id: `repeat-customer:${currentCustomerKey}:${matchingCompleted.length}`,
        titleKey: "relationshipInsightRepeatCustomer",
        messageKey: "relationshipInsightRepeatCustomerMessage",
        message: `This is your ${ordinalProjectCount(matchingCompleted.length)} project together.`,
        actionLabelKey: "viewHistory",
        actionType: "history",
        relatedId: currentCustomerKey,
        record: matchingCompleted[0],
      })
    );
  }

  const datedCompleted = matchingCompleted
    .map((record) => ({ record, date: parseDate(getCompletedDate(record)) }))
    .filter((item) => item.date)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const lastCompleted = datedCompleted[0];
  if (lastCompleted && daysBetween(lastCompleted.date, now) > 365) {
    insights.push(
      insightBase({
        id: `long-time:${currentCustomerKey}:${lastCompleted.date.toISOString().slice(0, 10)}`,
        titleKey: "relationshipInsightTitle",
        messageKey: "relationshipInsightLongTimeMessage",
        message: "It has been over a year since your last completed project.",
        actionLabelKey: "viewHistory",
        actionType: "history",
        relatedId: currentCustomerKey,
        record: lastCompleted.record,
      })
    );
  }

  const warrantyCandidates = [currentProject, ...completedProjects]
    .map((record) => ({ record, expiration: parseDate(getWarrantyExpiration(record)) }))
    .filter((item) => item.expiration);
  const warrantySoon = warrantyCandidates.find((item) => {
    const daysUntil = daysBetween(now, item.expiration);
    return daysUntil >= 0 && daysUntil <= 30;
  });
  if (warrantySoon) {
    insights.push(
      insightBase({
        id: `warranty:${getProjectId(warrantySoon.record) || warrantySoon.expiration.toISOString().slice(0, 10)}`,
        priority: "high",
        icon: "shield",
        titleKey: "relationshipInsightWarrantyReminder",
        messageKey: "relationshipInsightWarrantySoonMessage",
        message: "Warranty expires soon.",
        actionLabelKey: "reviewProject",
        actionType: "reviewProject",
        relatedId: getProjectId(warrantySoon.record),
        record: warrantySoon.record,
      })
    );
  }

  const memoryItems = toList(getRelationshipMemory(currentProject));
  if (memoryItems.length > 0) {
    const memory = memoryItems[0];
    insights.push(
      insightBase({
        id: `memory:${currentCustomerKey || normalizeIdentity(getProjectId(currentProject))}:${normalizeIdentity(memory)}`,
        icon: "people",
        titleKey: "relationshipInsightCustomerPreference",
        messageKey: "relationshipInsightCustomerPreferenceMessage",
        message: memory,
        actionLabelKey: getConversationId(currentProject) ? "message" : "hide",
        actionType: getConversationId(currentProject) ? "conversation" : "dismiss",
        relatedId: getConversationId(currentProject) || getProjectId(currentProject),
        record: currentProject,
      })
    );
  }

  return insights;
}
