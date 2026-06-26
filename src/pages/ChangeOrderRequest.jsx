import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage } from "../utils/language";
import { addNotification } from "../utils/notifications";
import { updateRequestById, appendTimelineEvent } from "../utils/workflowTimeline";
import { formatMessageTime } from "../utils/displayTime";
import { getJobRecord, saveJobRecord } from "../utils/workCenter";

function ChangeOrderRequest({ setPage }) {
  const placeholderStyle = `
    .meetro-change-order-textarea::placeholder {
      color: #475569;
      opacity: 1;
      font-weight: 700;
    }
  `;
  const language = getLanguage();
  const isSpanish = language === "es";

  const request = JSON.parse(
    localStorage.getItem("selectedChangeOrderRequest") || "null"
  );

  const [changeText, setChangeText] = useState("");
  const [urgency, setUrgency] = useState("normal");

  if (!request) {
    return (
      <div className="app-page meetro-form-page" style={page}>
      <style>{placeholderStyle}</style>
        <div style={card}>
          <h2>{isSpanish ? "No hay proyecto seleccionado" : "No project selected"}</h2>
          <button style={primaryButton} onClick={() => setPage("myRequests")}>
            {isSpanish ? "Volver" : "Go Back"}
          </button>
        </div>

        <BottomNav setPage={setPage} currentPage="home" />
      </div>
    );
  }

  const requestId = request.requestId || request.id;

  function submitChangeOrder() {
    if (!changeText.trim()) return;

    const changeOrder = {
      id: `change-order-${Date.now()}`,
      requestId,
      projectTitle: request.title || "Project",
      message: changeText.trim(),
      urgency,
      status: "pending_professional_review",
      createdAt: new Date().toISOString(),
    };

    updateRequestById(
      requestId,
      (item) => {
        return appendTimelineEvent(
          {
            ...item,
            changeOrders: [
              changeOrder,
              ...(Array.isArray(item.changeOrders)
                ? item.changeOrders
                : []),
            ],
            lastChangeOrderAt:
              new Date().toISOString(),
          },
          {
            type: "changeOrderRequested",
            label: "Change order requested",
            createdAt:
              new Date().toISOString(),
            changeOrderId:
              changeOrder.id,
            urgency,
          }
        );
      }
    );

    const conversationId =
      request.conversationId ||
      request.projectConversationId ||
      request.activeConversationId ||
      `project-${requestId}`;

    if (conversationId) {
      const conversationKey =
        `meetro_conversation_${conversationId}`;

      const existingMessages = JSON.parse(
        localStorage.getItem(conversationKey) || "[]"
      );

      const systemMessage = {
        id: `change-order-message-${Date.now()}`,
        sender: "me",
        senderRole: "homeowner",
        type: "workflow_change_request",

        title:
          isSpanish
            ? "Solicitud de cambio"
            : "Change Request",

        subtitle:
          urgency === "urgent"
            ? isSpanish
              ? "Cambio urgente solicitado"
              : "Urgent change requested"
            : isSpanish
            ? "¿Qué cambió? por el cliente"
            : "Customer requested a service change",

        text: changeText.trim(),

        priority: urgency,

        status: "pending_review",

        createdAt: new Date().toISOString(),

        time: formatMessageTime(new Date()),
      };

      localStorage.setItem(
        conversationKey,
        JSON.stringify([
          ...existingMessages,
          systemMessage
        ])
      );

      const existingRecords = getJobRecord(conversationId);

      const jobRecordItem = {
        id: `job-record-change-order-${Date.now()}`,
        conversationId,
        jobId: requestId,
        jobService: request.title || request.service || "Service",
        customer: request.homeownerName || "Customer",
        type: "change-order",
        workflowType: "changeOrderRequested",
        title: isSpanish
          ? "Cambio de servicio solicitado"
          : "Service change requested",
        subtitle: changeText.trim(),
        text: changeText.trim(),
        urgency,
        status: "pending_professional_review",
        time: formatMessageTime(new Date()),
        savedAt: new Date().toISOString(),
        sharedWithHomeowner: true,
      };

      saveJobRecord(conversationId, [
        jobRecordItem,
        ...existingRecords
      ]);

      localStorage.setItem(
        "lastSavedJobRecord",
        JSON.stringify(jobRecordItem)
      );

      window.dispatchEvent(
        new Event("meetroJobRecordUpdated")
      );

      window.dispatchEvent(
        new Event("meetro-messages-updated")
      );
    }

    addNotification({
      type: "change_order_requested",
      title: isSpanish ? "¿Qué cambió?" : "Change order requested",
      message: changeText.trim(),
      priority: urgency === "urgent" ? "high" : "normal",
      targetRole: "professional",
      requestId,
    });

    const acceptedBusiness =
      request.acceptedQuote ||
      request.selectedProfessionalRecord ||
      {};

    const businessName =
      acceptedBusiness.businessName ||
      request.selectedProfessional ||
      request.businessName ||
      "Professional";

    localStorage.setItem("activeConversationId", conversationId);
    localStorage.setItem("meetroConversationType", "standard");
    localStorage.setItem("conversationBusinessName", businessName);
    localStorage.setItem("activeConversationName", businessName);
    localStorage.setItem(
      "activeProjectTitle",
      request.title || request.service || "Project"
    );

    localStorage.setItem(
      "selectedContractor",
      JSON.stringify({
        name: businessName,
        business_name: businessName,
        logo:
          acceptedBusiness.businessLogo ||
          acceptedBusiness.logo ||
          acceptedBusiness.imageUrl ||
          acceptedBusiness.profileImage ||
          "",
        imageUrl:
          acceptedBusiness.businessLogo ||
          acceptedBusiness.logo ||
          acceptedBusiness.imageUrl ||
          acceptedBusiness.profileImage ||
          "",
        category: request.category || "",
        location: request.location || "",
      })
    );

    localStorage.removeItem("emergencyDispatchStatus");
    localStorage.removeItem("selectedEmergencyService");
    localStorage.removeItem("businessAcceptedEmergency");

    localStorage.setItem("conversationReturnPage", "myRequests");
    localStorage.setItem("activeWorkCenterTab", "active");

    setPage("conversationThread");
  }

  return (
    <div className="app-page meetro-form-page" style={page}>
      <style>{placeholderStyle}</style>
      <button style={backButton} onClick={() => setPage("myRequests")}>
        ←
      </button>

      <div style={heroCard}>
        <div style={heroIcon}>REV</div>
        <p style={eyebrow}>
          {isSpanish ? "Solicitud de cambio de servicio" : "Service Change Request"}
        </p>
        <h1 style={heroTitle}>
          {request.title || request.service || "Project"}
        </h1>
        <p style={heroText}>
          {isSpanish
            ? "Describe el cambio que necesitas para que el profesional pueda revisar el alcance y ajustar la cotización si es necesario."
            : "Tell the professional what changed so they can review the service and update the quote if needed."}
        </p>
      </div>

      <div style={card}>
        <h2 style={sectionTitle}>
          {isSpanish ? "¿Qué cambió?" : "What changed?"}
        </h2>

        <textarea
          className="meetro-change-order-textarea"
          style={textarea}
          value={changeText}
          onChange={(event) => setChangeText(event.target.value)}
          placeholder={
            isSpanish
              ? "Ejemplo: También quiero agregar el montaje de otro televisor..."
              : "Example: I also want to add mounting another TV..."
          }
        />

        <div style={urgencyGrid}>
          <button
            style={urgency === "normal" ? urgencyActive : urgencyButton}
            onClick={() => setUrgency("normal")}
          >
            {isSpanish ? "Normal" : "Normal"}
          </button>

          <button
            style={urgency === "urgent" ? urgencyActive : urgencyButton}
            onClick={() => setUrgency("urgent")}
          >
            {isSpanish ? "Urgente" : "Urgent"}
          </button>
        </div>

        <div style={noticeBox}>
          <strong>{isSpanish ? "Nota importante" : "Important note"}</strong>
          <p>
            {isSpanish
              ? "Un cambio de alcance puede requerir una cotización revisada antes de continuar."
              : "A service change may require a revised quote before work continues."}
          </p>
        </div>

        <button
          style={{
            ...primaryButton,
            opacity: 1,
          }}
          onClick={submitChangeOrder}
        >
          {isSpanish ? "Enviar solicitud de cambio" : "Send Change Request"}
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage="home" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#f8f7ff",
  padding:
    "calc(env(safe-area-inset-top) + 34px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  width: "100%",
  maxWidth: "760px",
  margin: "0 auto",
};

const backButton = {
  width: "44px",
  height: "44px",
  border: "none",
  borderRadius: "16px",
  background: "#ffffff",
  color: "#5b3df5",
  fontSize: "24px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "14px",
  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
  cursor: "pointer",
};

const heroCard = {
  background: "linear-gradient(135deg,#5b3df5,#8b5cf6)",
  color: "white",
  borderRadius: "30px",
  padding: "24px",
  marginBottom: "16px",
  boxShadow: "0 18px 42px rgba(91,61,245,0.26)",
};

const heroIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  marginBottom: "12px",
};

const eyebrow = {
  margin: 0,
  fontWeight: "900",
  opacity: 0.9,
};

const heroTitle = {
  margin: "8px 0",
  fontSize: "30px",
  lineHeight: 1.08,
};

const heroText = {
  margin: 0,
  lineHeight: 1.5,
  fontWeight: "700",
  opacity: 0.92,
};

const card = {
  background: "white",
  borderRadius: "26px",
  padding: "18px",
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
};

const sectionTitle = {
  margin: "0 0 12px",
  fontSize: "20px",
  fontWeight: "950",
  color: "#111827",
  opacity: 1,
};

const textarea = {
  width: "100%",
  minHeight: "150px",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "14px",
  fontSize: "16px",
  resize: "vertical",
  boxSizing: "border-box",
  outline: "none",
};

const urgencyGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  margin: "14px 0",
};

const urgencyButton = {
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
};

const urgencyActive = {
  ...urgencyButton,
  background: "#efe7ff",
  color: "#5b3df5",
  border: "1px solid #c4b5fd",
};

const noticeBox = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#7c2d12",
  borderRadius: "18px",
  padding: "12px",
  marginBottom: "14px",
};

const primaryButton = {
  background: "#5b3df5",
  color: "#ffffff",
  fontWeight: "900",

  width: "100%",
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: "950",
};

export default ChangeOrderRequest;
