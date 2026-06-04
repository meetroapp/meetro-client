import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage } from "../utils/language";
import { addNotification } from "../utils/notifications";
import { updateRequestById, appendTimelineEvent } from "../utils/workflowTimeline";

function ChangeOrderRequest({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";

  const request = JSON.parse(
    localStorage.getItem("selectedChangeOrderRequest") || "null"
  );

  const [changeText, setChangeText] = useState("");
  const [urgency, setUrgency] = useState("normal");

  if (!request) {
    return (
      <div style={page}>
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
            ? "Cambio solicitado por el cliente"
            : "Customer requested project change",

        text: changeText.trim(),

        priority: urgency,

        status: "pending_review",

        createdAt: new Date().toISOString(),

        time: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      };

      localStorage.setItem(
        conversationKey,
        JSON.stringify([
          ...existingMessages,
          systemMessage
        ])
      );

      const recordKey = `meetro_job_record_${conversationId}`;

      const existingRecords = JSON.parse(
        localStorage.getItem(recordKey) || "[]"
      );

      const jobRecordItem = {
        id: `job-record-change-order-${Date.now()}`,
        conversationId,
        jobId: requestId,
        jobService: request.title || request.service || "Project",
        customer: request.homeownerName || "Customer",
        type: "change-order",
        workflowType: "changeOrderRequested",
        title: isSpanish
          ? "Cambio de proyecto solicitado"
          : "Project change requested",
        subtitle: changeText.trim(),
        text: changeText.trim(),
        urgency,
        status: "pending_professional_review",
        time: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
        savedAt: new Date().toISOString(),
        sharedWithHomeowner: true,
      };

      localStorage.setItem(
        recordKey,
        JSON.stringify([
          jobRecordItem,
          ...existingRecords
        ])
      );

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
      title: isSpanish ? "Cambio solicitado" : "Change order requested",
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
    <div style={page}>
      <button style={backButton} onClick={() => setPage("myRequests")}>
        ← {isSpanish ? "Volver" : "Back"}
      </button>

      <div style={heroCard}>
        <div style={heroIcon}>🔁</div>
        <p style={eyebrow}>
          {isSpanish ? "Cambio de proyecto" : "Project Change Order"}
        </p>
        <h1 style={heroTitle}>
          {request.title || request.service || "Project"}
        </h1>
        <p style={heroText}>
          {isSpanish
            ? "Describe el cambio que necesitas para que el profesional pueda revisar el alcance y ajustar la cotización si es necesario."
            : "Describe what changed so the professional can review the scope and adjust the quote if needed."}
        </p>
      </div>

      <div style={card}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Cambio solicitado" : "Requested Change"}
        </h2>

        <textarea
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
              : "A scope change may require a revised quote before the project continues."}
          </p>
        </div>

        <button
          style={{
            ...primaryButton,
            opacity: changeText.trim() ? 1 : 0.55,
          }}
          onClick={submitChangeOrder}
        >
          {isSpanish ? "Enviar cambio al profesional" : "Send Change to Professional"}
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage="home" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#f8f7ff",
  padding: "22px 18px 110px",
  boxSizing: "border-box",
};

const backButton = {
  border: "none",
  background: "white",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "900",
  color: "#5b3df5",
  marginBottom: "14px",
  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
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
  width: "100%",
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "18px",
  padding: "14px",
  fontWeight: "950",
};

export default ChangeOrderRequest;
