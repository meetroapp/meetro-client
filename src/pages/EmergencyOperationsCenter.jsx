import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage } from "../utils/language";
import { saveActiveJobSnapshot } from "../utils/workCenter";

function EmergencyOperationsCenter({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());
  const [dispatchStatus, setDispatchStatus] = useState(
    localStorage.getItem("emergencyDispatchStatus") || "pending"
  );

  useEffect(() => {
    const sync = () => {
      setLanguage(getLanguage());
      setDispatchStatus(
        localStorage.getItem("emergencyDispatchStatus") || "pending"
      );
    };

    window.addEventListener("languageChanged", sync);
    window.addEventListener("meetro-language-change", sync);
    window.addEventListener("meetroLanguageChanged", sync);
    window.addEventListener("meetroEmergencyConversationUpdated", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener("languageChanged", sync);
      window.removeEventListener("meetro-language-change", sync);
      window.removeEventListener("meetroLanguageChanged", sync);
      window.removeEventListener("meetroEmergencyConversationUpdated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const text = {
    en: {
      title: "Emergency Operations",
      subtitle: "Manage the live emergency response from one command screen.",
      activeEmergency: "Active Emergency",
      customer: "Customer",
      service: "Service",
      location: "Location",
      dispatchFee: "Dispatch Fee",
      cancellationFee: "Cancellation Fee",
      status: "Current Status",
      message: "Message Customer",
      call: "Call Customer",
      accept: "Accept Dispatch",
      onWay: "On The Way",
      arrived: "Arrived",
      start: "Start Job",
      complete: "Complete Job",
      back: "Back to Dashboard",
      notes: "Customer Notes",
      access: "Access Info",
      pet: "Pet Warning",
      noNotes: "No notes provided",
      noAccess: "No access notes provided",
      noPet: "No pet warning",
    },
    es: {
      title: "Operaciones de Emergencia",
      subtitle: "Administra la respuesta de emergencia desde una sola pantalla.",
      activeEmergency: "Emergencia Activa",
      customer: "Cliente",
      service: "Servicio",
      location: "Ubicación",
      dispatchFee: "Tarifa de Despacho",
      cancellationFee: "Tarifa de Cancelación",
      status: "Estado Actual",
      message: "Mensaje al Cliente",
      call: "Llamar al Cliente",
      accept: "Aceptar Despacho",
      onWay: "En Camino",
      arrived: "Llegué",
      start: "Iniciar Trabajo",
      complete: "Completar Trabajo",
      back: "Regresar al Dashboard",
      notes: "Notas del Cliente",
      access: "Información de Acceso",
      pet: "Advertencia de Mascotas",
      noNotes: "No hay notas",
      noAccess: "No hay notas de acceso",
      noPet: "No hay advertencia de mascotas",
    },
  };

  const t = text[language] || text.en;

  const selectedService =
    localStorage.getItem("selectedEmergencyService") ||
    (language === "es" ? "Servicio de Emergencia" : "Emergency Service");

  const issue =
    localStorage.getItem("emergencyIssue") || t.noNotes;

  const access =
    localStorage.getItem("emergencyEntryNotes") ||
    localStorage.getItem("emergencyGateCode") ||
    t.noAccess;

  const pet =
    localStorage.getItem("emergencyPetWarning") || t.noPet;

  const dispatchFee =
    localStorage.getItem("emergencyDispatchFee") || "$35";

  const cancellationFee =
    localStorage.getItem("emergencyCancellationFee") || "$25";

  const customerName =
    localStorage.getItem("emergencyCustomerName") ||
    localStorage.getItem("userName") ||
    "Homeowner";

  const location =
    localStorage.getItem("emergencyLocation") || "Cape Coral, FL";

  const statusLabels = {
    pending: language === "es" ? "Esperando aceptación" : "Waiting for acceptance",
    accepted: language === "es" ? "Aceptado" : "Accepted",
    enroute: language === "es" ? "En camino" : "On the way",
    arrived: language === "es" ? "Llegó" : "Arrived",
    started: language === "es" ? "Trabajo iniciado" : "Job started",
    completed: language === "es" ? "Completado" : "Completed",
    cancelled: language === "es" ? "Cancelado" : "Cancelled",
  };

  function updateStatus(nextStatus) {
    saveActiveJobSnapshot({
      status: nextStatus,
      service: selectedService,
      location,
      customer: customerName,
    });

    localStorage.setItem("emergencyDispatchStatus", nextStatus);
    localStorage.setItem("activeJobStatus", nextStatus);

    if (nextStatus === "accepted") {
      localStorage.setItem("businessAcceptedEmergency", "true");
      localStorage.setItem(
        "activeProfessionalId",
        localStorage.getItem("businessName") || "Professional"
      );
    }

    if (nextStatus === "completed") {
      localStorage.setItem("emergencyNeedsReview", "true");
      localStorage.setItem("emergencyCompletedAt", new Date().toISOString());
    }

    window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
    setDispatchStatus(nextStatus);
  }

  function openEmergencyChat() {
    const currentUserKey =
      localStorage.getItem("userId") ||
      localStorage.getItem("userEmail") ||
      "guest";

    const emergencyConversationId = `emergency-active-request-${currentUserKey}`;

    localStorage.setItem("activeConversationId", emergencyConversationId);
    localStorage.setItem("activeConversationName", selectedService);
    localStorage.setItem("conversationReturnPage", "emergencyOperationsCenter");
    localStorage.setItem("meetroConversationType", "emergency");

    setPage("conversationThread");
  }

  return (
    <div style={page}>
      <div style={container}>
        <div style={topBar}>
          <button style={backMini} onClick={() => setPage("businessDashboard")}>
            ←
          </button>

          <div style={livePill}>🚨 {t.activeEmergency}</div>
        </div>

        <div style={heroCard}>
          <div style={heroIcon}>🚨</div>

          <h1 style={title}>{t.title}</h1>
          <p style={subtitle}>{t.subtitle}</p>

          <div style={statusPill}>
            {t.status}: {statusLabels[dispatchStatus] || statusLabels.pending}
          </div>
        </div>

        <div style={infoCard}>
          <h2 style={sectionTitle}>{t.activeEmergency}</h2>

          <div style={infoGrid}>
            <div style={infoBox}>
              <span>{t.customer}</span>
              <strong>{customerName}</strong>
            </div>

            <div style={infoBox}>
              <span>{t.service}</span>
              <strong>{selectedService}</strong>
            </div>

            <div style={infoBox}>
              <span>{t.location}</span>
              <strong>{location}</strong>
            </div>

            <div style={infoBox}>
              <span>{t.dispatchFee}</span>
              <strong>{dispatchFee}</strong>
            </div>

            <div style={infoBox}>
              <span>{t.cancellationFee}</span>
              <strong>{cancellationFee}</strong>
            </div>
          </div>
        </div>

        <div style={notesCard}>
          <h2 style={sectionTitle}>{t.notes}</h2>

          <div style={noteItem}>
            <span>{t.notes}</span>
            <p>{issue}</p>
          </div>

          <div style={noteItem}>
            <span>{t.access}</span>
            <p>{access}</p>
          </div>

          <div style={noteItem}>
            <span>{t.pet}</span>
            <p>{pet}</p>
          </div>
        </div>

        <div style={actionCard}>
          <h2 style={sectionTitle}>{t.status}</h2>

          <div style={actionGrid}>
            <button
              style={dispatchStatus === "accepted" ? activeButton : actionButton}
              onClick={() => updateStatus("accepted")}
            >
              {t.accept}
            </button>

            <button
              style={dispatchStatus === "enroute" ? activeButton : actionButton}
              onClick={() => updateStatus("enroute")}
            >
              {t.onWay}
            </button>

            <button
              style={dispatchStatus === "arrived" ? activeButton : actionButton}
              onClick={() => updateStatus("arrived")}
            >
              {t.arrived}
            </button>

            <button
              style={dispatchStatus === "started" ? activeButton : actionButton}
              onClick={() => updateStatus("started")}
            >
              {t.start}
            </button>
          </div>

          <button style={completeButton} onClick={() => updateStatus("completed")}>
            {t.complete}
          </button>
        </div>

        <div style={communicationGrid}>
          <button style={secondaryButton} onClick={openEmergencyChat}>
            {t.message}
          </button>

          <button style={secondaryButton}>{t.call}</button>
        </div>

        <button style={darkButton} onClick={() => setPage("businessDashboard")}>
          {t.back}
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #fff1f2 0%, #ffffff 48%, #eef2ff 100%)",
  padding: "24px 20px 190px",
  boxSizing: "border-box",
};

const container = {
  maxWidth: "460px",
  margin: "0 auto",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const backMini = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  border: "none",
  background: "white",
  fontSize: "22px",
  fontWeight: "900",
  boxShadow: "0 8px 22px rgba(0,0,0,0.08)",
  cursor: "pointer",
};

const livePill = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: "11px 15px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "13px",
};

const heroCard = {
  background: "white",
  borderRadius: "30px",
  padding: "28px",
  textAlign: "center",
  boxShadow: "0 18px 44px rgba(239,68,68,0.12)",
  marginBottom: "18px",
};

const heroIcon = {
  width: "78px",
  height: "78px",
  borderRadius: "28px",
  background: "#ef4444",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "36px",
  margin: "0 auto 18px",
};

const title = {
  fontSize: "32px",
  fontWeight: "900",
  color: "#111827",
  margin: "0 0 8px",
};

const subtitle = {
  color: "#667085",
  lineHeight: 1.5,
  marginBottom: "18px",
};

const statusPill = {
  background: "#fef2f2",
  color: "#991b1b",
  padding: "13px",
  borderRadius: "18px",
  fontWeight: "900",
};

const infoCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
  marginBottom: "18px",
};

const sectionTitle = {
  fontSize: "21px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "16px",
};

const infoGrid = {
  display: "grid",
  gap: "12px",
};

const infoBox = {
  background: "#f8fafc",
  borderRadius: "18px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const notesCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
  marginBottom: "18px",
};

const noteItem = {
  background: "#f8fafc",
  borderRadius: "18px",
  padding: "14px",
  marginBottom: "12px",
};

const actionCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
  marginBottom: "18px",
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "12px",
};

const actionButton = {
  padding: "15px",
  borderRadius: "18px",
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#111827",
  fontWeight: "900",
  cursor: "pointer",
};

const activeButton = {
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const completeButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#10b981",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const communicationGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "14px",
};

const secondaryButton = {
  padding: "15px",
  borderRadius: "18px",
  border: "1px solid #e5e7eb",
  background: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const darkButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#111827",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

export default EmergencyOperationsCenter;
