import { formatMessageTime } from "./displayTime.js";

export const HIRING_CONVERSATION_TYPES = Object.freeze([
  "hiring",
  "hiring_application",
  "job_inquiry",
  "applicant_message",
]);

export function isHiringConversationType(type = "") {
  return HIRING_CONVERSATION_TYPES.includes(String(type || "").trim());
}

const WORKFLOW_MESSAGE_TYPES_BLOCKED_IN_HIRING = Object.freeze([
  "schedule",
  "approval",
  "payment",
  "materials",
  "materials-list",
  "photoWorkflow",
  "workflow_materials_approval",
  "workflow_change_request",
  "materialsApprovalRequested",
]);

const WORKFLOW_CONTEXT_BLOCKED_IN_HIRING = Object.freeze([
  "appointment",
  "schedule",
  "work_scheduled",
  "customer_confirmation",
  "payment",
  "proposal",
  "approval",
  "materials",
  "completion",
  "closure",
  "emergency",
]);

export function isMessageAllowedInHiringConversation(message = {}) {
  const messageType = String(message.type || "").trim();
  const workflowType = String(message.workflowType || message.workflow_type || "").trim();
  const workflowSource = String(message.workflowSource || message.workflow_source || "").trim();
  const schedule = message.schedule;

  if (WORKFLOW_MESSAGE_TYPES_BLOCKED_IN_HIRING.includes(messageType)) {
    return false;
  }

  if (messageType.startsWith("workflow_")) {
    return false;
  }

  if (schedule || message.scheduleId || message.appointmentId) {
    return false;
  }

  const combinedWorkflowContext = `${workflowType} ${workflowSource}`.toLowerCase();

  if (
    WORKFLOW_CONTEXT_BLOCKED_IN_HIRING.some((blocked) =>
      combinedWorkflowContext.includes(blocked)
    )
  ) {
    return false;
  }

  return true;
}

export function filterHiringConversationMessages(messages = []) {
  if (!Array.isArray(messages)) return [];
  return messages.filter(isMessageAllowedInHiringConversation);
}

function readConversationRegistry(storage) {
  try {
    const records = JSON.parse(storage?.getItem?.("meetro_conversation_registry") || "[]");
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

export function resolveHiringConversation(context = {}, storage = globalThis.localStorage) {
  const businessId = String(context.businessId || "").trim();
  const positionId = String(context.positionId || "").trim();
  const applicantId = String(context.applicantId || "").trim();
  if (!businessId || !positionId || !applicantId) return null;
  const record = readConversationRegistry(storage).find((item) =>
    isHiringConversationType(item.conversation_type || item.type) &&
    String(item.businessId || "") === businessId &&
    String(item.positionId || item.jobId || "") === positionId &&
    String(item.applicantId || "") === applicantId
  );
  return record ? { ...record } : null;
}

export function upsertHiringInterviewMessage(interview = {}, storage = globalThis.localStorage) {
  const conversationId = String(interview.conversationId || "").trim();
  const interviewId = String(interview.id || "").trim();
  if (!storage || !conversationId || !interviewId) return null;
  const key = `meetro_conversation_${conversationId}`;
  let messages;
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    messages = Array.isArray(parsed) ? parsed : [];
  } catch {
    messages = [];
  }
  const statusTitle = interview.status === "cancelled"
    ? "Interview Cancelled"
    : interview.status === "completed"
    ? "Interview Completed"
    : interview.status === "rescheduled"
    ? "Interview Rescheduled"
    : "Interview Scheduled";
  const message = {
    id: `hiring-interview-${interviewId}`,
    type: "hiring-interview",
    sender: "system",
    senderRole: "system",
    workflowType: "hiring_interview",
    interviewId,
    businessId: interview.businessId,
    positionId: interview.positionId,
    applicantId: interview.applicantId,
    title: statusTitle,
    positionTitle: interview.positionTitle || interview.title,
    interviewDate: interview.date,
    startTime: interview.startTime,
    endTime: interview.endTime,
    interviewType: interview.interviewType,
    location: interview.location,
    meetingUrl: interview.meetingUrl,
    interviewStatus: interview.status,
    text: `${statusTitle}: ${interview.positionTitle || interview.title || "Hiring interview"}.`,
    time: formatMessageTime(new Date(interview.updatedAt || Date.now())),
    status: "delivered",
    createdAt: Date.parse(interview.createdAt || "") || Date.now(),
    updatedAt: interview.updatedAt || new Date().toISOString(),
  };
  const next = [message, ...messages.filter((item) => item.interviewId !== interviewId)];
  storage.setItem(key, JSON.stringify(next));
  globalThis.window?.dispatchEvent?.(new Event("meetro-messages-updated"));
  return { ...message };
}

function safeId(value = "") {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

export function buildHiringConversationId(context = {}) {
  const type = context.type || "hiring_application";
  const jobId = context.jobId || context.positionId || "position";
  const participant =
    context.applicantId ||
    context.userId ||
    context.businessId ||
    context.businessName ||
    "participant";

  return `hiring_${safeId(type)}_${safeId(jobId)}_${safeId(participant)}`;
}

export function buildHiringConversationRecord(context = {}) {
  const type = context.type || "hiring_application";
  const id = context.id || buildHiringConversationId({ ...context, type });
  const positionTitle =
    context.positionTitle || context.title || context.jobTitle || "Hiring Conversation";
  const participantName =
    context.applicantName ||
    context.participantName ||
    context.businessName ||
    "Hiring Contact";
  const businessName = context.businessName || "Business";

  return {
    id,
    type,
    conversation_type: type,
    project_title: positionTitle,
    project_description:
      context.lastMessage ||
      (context.source === "jobs_hiring"
        ? `Job inquiry for ${positionTitle}.`
        : `Hiring conversation for ${positionTitle}.`),
    homeowner_email: participantName,
    participantName,
    participantRole: context.participantRole || "applicant",
    businessId: context.businessId || "",
    businessName,
    positionId: context.positionId || context.jobId || "",
    jobId: context.jobId || context.positionId || "",
    positionTitle,
    applicantId: context.applicantId || "",
    applicantName: context.applicantName || participantName,
    source: context.source || "hiring_center",
    lastMessage:
      context.lastMessage ||
      (context.source === "jobs_hiring"
        ? "Job inquiry started."
        : "Hiring message started."),
    unreadCount: context.unreadCount || 0,
    unread: Boolean(context.unread),
    status: context.status || "New inquiry",
    location: context.location || "Hiring",
    saved_to_history: false,
    savedAt: context.savedAt || nowIso(),
    createdAt: context.createdAt || nowIso(),
  };
}

export function saveHiringConversation(context = {}, storage = globalThis.localStorage) {
  if (!storage) return buildHiringConversationRecord(context);

  const record = buildHiringConversationRecord(context);
  const registry = readConversationRegistry(storage);
  const nextRegistry = [
    record,
    ...registry.filter((item) => String(item.id) !== String(record.id)),
  ];

  storage.setItem("meetro_conversation_registry", JSON.stringify(nextRegistry));
  storage.setItem("activeConversationId", record.id);
  storage.setItem("activeConversationName", record.participantName || record.businessName);
  storage.setItem("meetroConversationType", record.conversation_type);
  storage.setItem("conversationReturnPage", context.returnPage || "messagesInbox");
  storage.setItem("selectedQuoteRequestId", record.id);
  storage.setItem("selectedMessageReceiverId", context.receiverId || "");
  storage.setItem("selectedConversation", JSON.stringify(record));
  storage.setItem("conversationBusinessName", record.businessName);
  storage.setItem(
    `meetro_conversation_meta_${record.id}`,
    JSON.stringify({
      conversationType: record.conversation_type,
      businessId: record.businessId,
      businessName: record.businessName,
      participantName: record.participantName,
      applicantName: record.applicantName,
      applicantId: record.applicantId,
      positionId: record.positionId,
      positionTitle: record.positionTitle,
      projectTitle: record.positionTitle,
      source: record.source,
      lastMessage: record.lastMessage,
      status: record.status,
      location: record.location,
      updatedAt: Date.now(),
    })
  );

  const existingMessages = (() => {
    try {
      const parsed = JSON.parse(storage.getItem(`meetro_conversation_${record.id}`) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  if (existingMessages.length === 0) {
    storage.setItem(
      `meetro_conversation_${record.id}`,
      JSON.stringify([
        {
          id: `hiring-starter-${Date.now()}`,
          type: "text",
          sender: "system",
          senderRole: "system",
          text: record.lastMessage,
          time: formatMessageTime(new Date()),
          status: "delivered",
          createdAt: Date.now(),
          workflowType: "hiring_context",
        },
      ])
    );
  }

  storage.setItem(
    "mockUnreadMessages",
    String(nextRegistry.filter((item) => item.unread).length)
  );
  globalThis.window?.dispatchEvent?.(new Event("meetro-messages-updated"));

  return record;
}
