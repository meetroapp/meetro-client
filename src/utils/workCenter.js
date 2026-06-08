export function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

export function getBusinessSchedule() {
  return safeJsonParse(
    localStorage.getItem("meetro_business_schedule"),
    []
  );
}

export function saveBusinessSchedule(schedule = []) {
  localStorage.setItem(
    "meetro_business_schedule",
    JSON.stringify(Array.isArray(schedule) ? schedule : [])
  );

  window.dispatchEvent(new Event("meetro-workcenter-updated"));
}

export function getQuoteHistory() {
  return safeJsonParse(
    localStorage.getItem("workCenterQuoteHistory"),
    []
  );
}

export function saveQuoteHistory(quotes = []) {
  localStorage.setItem(
    "workCenterQuoteHistory",
    JSON.stringify(Array.isArray(quotes) ? quotes : [])
  );

  window.dispatchEvent(new Event("meetro-workcenter-updated"));
}

export function getConversationMeta(conversationId) {
  if (!conversationId) return {};

  return safeJsonParse(
    localStorage.getItem(`meetro_conversation_meta_${conversationId}`),
    {}
  );
}

export function saveConversationMeta(conversationId, meta = {}) {
  if (!conversationId) return;

  localStorage.setItem(
    `meetro_conversation_meta_${conversationId}`,
    JSON.stringify(meta || {})
  );

  window.dispatchEvent(new Event("meetro-workcenter-updated"));
}

export function getJobRecord(conversationId) {
  if (!conversationId) return [];

  return safeJsonParse(
    localStorage.getItem(`meetro_job_record_${conversationId}`),
    []
  );
}

export function saveJobRecord(conversationId, records = []) {
  if (!conversationId) return;

  localStorage.setItem(
    `meetro_job_record_${conversationId}`,
    JSON.stringify(Array.isArray(records) ? records : [])
  );

  window.dispatchEvent(new Event("meetro-workcenter-updated"));
}


export function getSelectedActiveProject() {
  return safeJsonParse(
    localStorage.getItem("selectedActiveProject"),
    null
  );
}

export function saveSelectedActiveProject(project = null) {
  if (!project) return;

  localStorage.setItem(
    "selectedActiveProject",
    JSON.stringify(project)
  );

  window.dispatchEvent(new Event("meetro-workcenter-updated"));
}

export function clearSelectedActiveProject() {
  localStorage.removeItem("selectedActiveProject");

  window.dispatchEvent(new Event("meetro-workcenter-updated"));
}

export function getActiveJobSnapshot(fallbackConversationId = "") {
  return {
    id:
      localStorage.getItem("activeJobId") ||
      fallbackConversationId ||
      "",
    conversationId:
      localStorage.getItem("activeConversationId") ||
      fallbackConversationId ||
      "",
    status: localStorage.getItem("activeJobStatus") || "",
    service:
      localStorage.getItem("activeJobService") ||
      localStorage.getItem("activeWorkService") ||
      "",
    customer: localStorage.getItem("activeJobCustomer") || "",
    eta: localStorage.getItem("activeJobEta") || "",
    location:
      localStorage.getItem("activeJobLocation") ||
      localStorage.getItem("activeCustomerLocation") ||
      localStorage.getItem("projectLocation") ||
      "",
  };
}

export function saveActiveJobSnapshot(job = {}) {
  if (job.id) localStorage.setItem("activeJobId", String(job.id));
  if (job.conversationId) {
    localStorage.setItem("activeConversationId", String(job.conversationId));
  }
  if (job.status) localStorage.setItem("activeJobStatus", String(job.status));
  if (job.service) localStorage.setItem("activeJobService", String(job.service));
  if (job.customer) localStorage.setItem("activeJobCustomer", String(job.customer));
  if (job.eta) localStorage.setItem("activeJobEta", String(job.eta));
  if (job.location) localStorage.setItem("activeJobLocation", String(job.location));

  window.dispatchEvent(new Event("meetro-workcenter-updated"));
}

export function clearActiveJobSnapshot() {
  [
    "activeJobStatus",
    "activeJobService",
    "activeJobEta",
    "activeJobId",
    "activeJobCustomer",
    "activeJobLocation",
  ].forEach((key) => localStorage.removeItem(key));

  window.dispatchEvent(new Event("meetro-workcenter-updated"));
}
