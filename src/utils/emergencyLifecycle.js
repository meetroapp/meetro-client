import {
  saveActiveJobSnapshot,
  saveConversationMeta,
} from "./workCenter";
import { t } from "./language";
import { createNotification } from "./meetroNotifications";
import { formatMessageTime } from "./displayTime.js";
import { canReadLegacyWorkflowStorage } from "./clientWorkflowStoragePolicy.js";

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "");
  } catch {
    return fallback;
  }
}

export function openActiveEmergencyConversation(
  setPage,
  returnPage = "messagesInbox"
) {
  if (!canReadLegacyWorkflowStorage()) return false;

  const activeRecord = readJson("activeEmergencyRecord", {});
  const requestId =
    activeRecord.id ||
    localStorage.getItem("activeEmergencyRequestId") ||
    localStorage.getItem("emergencyRequestId") ||
    "";
  const conversationId =
    activeRecord.conversationId ||
    localStorage.getItem("emergencyConversationId") ||
    (requestId ? `emergency-conversation-${requestId}` : "");

  if (!conversationId) return false;

  localStorage.setItem("activeConversationId", String(conversationId));
  localStorage.setItem("selectedQuoteRequestId", String(conversationId));
  localStorage.setItem("meetroConversationType", "emergency");
  localStorage.setItem("conversationReturnPage", returnPage);
  localStorage.setItem(
    "activeConversationName",
    activeRecord.service ||
      activeRecord.title ||
      localStorage.getItem("selectedEmergencyService") ||
      "Emergency Service"
  );
  setPage("conversationThread");
  return true;
}

export function transitionEmergencyStatus(nextStatus, details = {}) {
  if (!canReadLegacyWorkflowStorage()) return null;

  const activeRecord = readJson("activeEmergencyRecord", {});
  const requestId =
    activeRecord.id ||
    localStorage.getItem("activeEmergencyRequestId") ||
    localStorage.getItem("emergencyRequestId") ||
    "";
  const conversationId =
    activeRecord.conversationId ||
    localStorage.getItem("emergencyConversationId") ||
    (requestId ? `emergency-conversation-${requestId}` : "");
  const updatedAt = new Date().toISOString();
  const statusPreview = {
    accepted: ` ${t("dispatchAccepted")}`,
    enroute: ` ${t("professionalOnTheWay")}`,
    arrived: ` ${t("professionalArrived")}`,
    started: ` ${t("workStarted")}`,
    completed: ` ${t("emergencyCompleted")}`,
  }[nextStatus] || nextStatus;
  const statusChanged = activeRecord.status !== nextStatus;

  const nextRecord = {
    ...activeRecord,
    id: requestId || activeRecord.id,
    conversationId,
    status: nextStatus,
    service:
      details.service ||
      activeRecord.service ||
      activeRecord.title ||
      localStorage.getItem("selectedEmergencyService") ||
      "Emergency Service",
    title:
      activeRecord.title ||
      details.service ||
      activeRecord.service ||
      "Emergency Service",
    location:
      details.location ||
      activeRecord.location ||
      localStorage.getItem("emergencyLocation") ||
      "",
    customerName:
      details.customerName ||
      activeRecord.customerName ||
      localStorage.getItem("emergencyCustomerName") ||
      "",
    businessName:
      details.businessName ||
      activeRecord.businessName ||
      localStorage.getItem("emergencyBusinessName") ||
      localStorage.getItem("businessName") ||
      "Professional",
    updatedAt,
    ...(nextStatus === "completed" && !activeRecord.completedAt
      ? { completedAt: updatedAt }
      : {}),
  };

  localStorage.setItem("emergencyDispatchStatus", nextStatus);
  localStorage.setItem("activeJobStatus", nextStatus);
  localStorage.setItem("activeEmergencyRecord", JSON.stringify(nextRecord));

  if (conversationId) {
    localStorage.setItem("emergencyConversationId", conversationId);
    localStorage.setItem("activeConversationId", conversationId);
    localStorage.setItem("meetroConversationType", "emergency");
  }

  saveActiveJobSnapshot({
    id: requestId,
    conversationId,
    status: nextStatus,
    service: nextRecord.service,
    location: nextRecord.location,
    customer: nextRecord.customerName,
  });

  if (nextRecord.id) {
    localStorage.setItem(
      `meetro_emergency_record_${nextRecord.id}`,
      JSON.stringify(nextRecord)
    );
  }

  if (conversationId && statusChanged && statusPreview) {
    const messageKey = `meetro_conversation_${conversationId}`;
    const messages = readJson(messageKey, []);

    localStorage.setItem(
      messageKey,
      JSON.stringify([
        ...messages,
        {
          id: `emergency-status-${nextStatus}-${Date.now()}`,
          type: "system",
          sender: "business",
          senderRole: "business",
          role: "business",
          authorRole: "business",
          senderType: "business",
          fromBusiness: true,
          fromCustomer: false,
          workflowType: "emergency_status",
          emergencyStatus: nextStatus,
          text: statusPreview,
          time: formatMessageTime(new Date()),
          status: "sent",
          createdAt: Date.now(),
        },
      ])
    );
  }

  if (statusChanged && statusPreview) {
    createNotification({
      type: "emergency_status_update",
      title: t("emergencyDispatch"),
      message: statusPreview,
      role: "homeowner",
      requestId,
      conversationId,
      emergencyId: requestId,
      dedupeKey: `emergency_status:${requestId || conversationId}:${nextStatus}`,
    });
  }

  if (conversationId) {
    const lastTime = formatMessageTime(new Date());

    saveConversationMeta(conversationId, {
      lastMessage: statusPreview,
      lastTime,
      updatedAt: Date.now(),
      activeJobId: requestId,
      activeJobService: nextRecord.service,
      activeJobStatus: nextStatus,
      activeJobCustomer: nextRecord.customerName,
      location: nextRecord.location,
    });

    const registry = readJson("meetro_conversation_registry", []);
    const existingItem = registry.find(
      (item) => String(item.id) === String(conversationId)
    );
    const registryItem = {
      ...(existingItem || {}),
      id: conversationId,
      project_title: nextRecord.service,
      project_description: statusPreview,
      homeowner_email: nextRecord.customerName || "Emergency Customer",
      location: nextRecord.location || "Emergency Service Location",
      status: nextStatus,
      unread: statusChanged ? true : existingItem?.unread ?? false,
      conversation_type: "emergency",
      saved_to_history: false,
      savedAt: updatedAt,
    };

    localStorage.setItem(
      "meetro_conversation_registry",
      JSON.stringify([
        registryItem,
        ...registry.filter(
          (item) => String(item.id) !== String(conversationId)
        ),
      ])
    );

    if (statusChanged) {
      localStorage.setItem(
        `meetro_conversation_read_${conversationId}`,
        "false"
      );
    }
  }

  if (nextStatus === "accepted") {
    localStorage.setItem("businessAcceptedEmergency", "true");
    localStorage.setItem(
      "activeProfessionalId",
      nextRecord.businessName || "Professional"
    );
  }

  if (nextStatus === "completed") {
    localStorage.setItem(
      "emergencyCompletedAt",
      nextRecord.completedAt || updatedAt
    );
  }

  window.dispatchEvent(new Event("meetroDispatchStatusChanged"));
  window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
  window.dispatchEvent(new Event("meetro-messages-updated"));

  return nextRecord;
}
