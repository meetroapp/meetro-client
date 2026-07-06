import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage } from "../utils/language";
import { transitionEmergencyStatus } from "../utils/emergencyLifecycle";

function EmergencyOperationsCenter({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());
  const [dispatchStatus, setDispatchStatus] = useState(
    localStorage.getItem("emergencyDispatchStatus") || "pending"
  );

  const [dispatchReady, setDispatchReady] = useState(
    localStorage.getItem("meetroDispatchReady") === "true"
  );

  const [operationDispatchFee, setOperationDispatchFee] = useState(
    localStorage.getItem("meetroEmergencyDispatchFee") ||
      localStorage.getItem("emergencyDispatchFee") ||
      "$35"
  );

  const [operationResponseTime, setOperationResponseTime] = useState(
    localStorage.getItem("meetroEmergencyResponseTime") || "15-30 min"
  );

  const [operationRadius, setOperationRadius] = useState(
    localStorage.getItem("meetroEmergencyRadius") || "15 miles"
  );

  useEffect(() => {
    const sync = () => {
      setLanguage(getLanguage());
      setDispatchStatus(
        localStorage.getItem("emergencyDispatchStatus") || "pending"
      );
      setDispatchReady(localStorage.getItem("meetroDispatchReady") === "true");
      setOperationDispatchFee(
        localStorage.getItem("meetroEmergencyDispatchFee") ||
          localStorage.getItem("emergencyDispatchFee") ||
          "$35"
      );
      setOperationResponseTime(
        localStorage.getItem("meetroEmergencyResponseTime") || "15-30 min"
      );
      setOperationRadius(
        localStorage.getItem("meetroEmergencyRadius") || "15 miles"
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
      dailyControls: "Daily Dispatch Controls",
      dispatchReady: "Dispatch Ready",
      dispatchReadyHelp:
        "Use this when your business is actively accepting emergency dispatches today.",
      ready: "Ready",
      off: "Off",
      responseTime: "Response Time",
      radius: "Current Radius",
      saveOperations: "Save Operations",
      operationsSaved: "Emergency operations saved.",
      incomingDispatches: "Incoming Dispatches",
      activeDispatches: "Active Dispatches",
      emergencyHistory: "Emergency History",
      emergencyRevenue: "Emergency Revenue",
      profileReminder:
        "Emergency Profile is customer-facing. Emergency Operations is for daily business controls.",
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
      dailyControls: "Controles Diarios de Despacho",
      dispatchReady: "Listo para Despacho",
      dispatchReadyHelp:
        "Usa esto cuando tu negocio esté aceptando despachos de emergencia hoy.",
      ready: "Listo",
      off: "Apagado",
      responseTime: "Tiempo de Respuesta",
      radius: "Radio Actual",
      saveOperations: "Guardar Operaciones",
      operationsSaved: "Operaciones de emergencia guardadas.",
      incomingDispatches: "Despachos Entrantes",
      activeDispatches: "Despachos Activos",
      emergencyHistory: "Historial de Emergencias",
      emergencyRevenue: "Ingresos de Emergencia",
      profileReminder:
        "El Perfil de Emergencia es para el cliente. Operaciones de Emergencia es para controles diarios del negocio.",
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

  const dispatchFee = operationDispatchFee;

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

  function saveOperations() {
    localStorage.setItem("meetroDispatchReady", dispatchReady ? "true" : "false");
    localStorage.setItem("meetroEmergencyDispatchFee", operationDispatchFee);
    localStorage.setItem("meetroEmergencyResponseTime", operationResponseTime);
    localStorage.setItem("meetroEmergencyRadius", operationRadius);

    // Keep old key in sync for any existing emergency cards still reading it.
    localStorage.setItem("emergencyDispatchFee", operationDispatchFee);

    window.dispatchEvent(new Event("meetroDispatchReadyChanged"));
    window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));

    alert(t.operationsSaved);
  }

  function getActiveEmergencyRecord() {
    try {
      return JSON.parse(localStorage.getItem("activeEmergencyRecord") || "{}");
    } catch {
      return {};
    }
  }

  function updateStatus(nextStatus) {
    const activeRecord = getActiveEmergencyRecord();
    transitionEmergencyStatus(nextStatus, {
      service: activeRecord.service || selectedService,
      location: activeRecord.location || location,
      customerName: activeRecord.customerName || customerName,
      businessName:
        activeRecord.businessName ||
        localStorage.getItem("emergencyBusinessName") ||
        localStorage.getItem("businessName") ||
        "Professional",
    });
    setDispatchStatus(nextStatus);
  }

  function completeEmergency() {
    const activeRecord = getActiveEmergencyRecord();

    updateStatus("completed");
    localStorage.setItem(
      "completionService",
      activeRecord.service || activeRecord.title || selectedService
    );
    localStorage.setItem(
      "completionLocation",
      activeRecord.location || location || ""
    );
    localStorage.setItem("completionSource", "emergency");
    setPage("completionSheet");
  }

  function openEmergencyChat() {
    const currentUserKey =
      localStorage.getItem("userId") ||
      localStorage.getItem("userEmail") ||
      "guest";

    const activeRecord = getActiveEmergencyRecord();

    const emergencyConversationId =
      activeRecord.conversationId ||
      localStorage.getItem("emergencyConversationId") ||
      `emergency-active-request-${currentUserKey}`;

    localStorage.setItem("emergencyConversationId", emergencyConversationId);
    localStorage.setItem("activeConversationId", emergencyConversationId);
    localStorage.setItem("activeConversationName", selectedService);
    localStorage.setItem("conversationReturnPage", "emergencyOperationsCenter");
    localStorage.setItem("meetroConversationType", "emergency");

    setPage("conversationThread");
  }

  return (
    <div className="app-page meetro-wide-page" style={page}>
      <div style={container}>
        <div style={topBar}>
          <button style={backMini} onClick={() => setPage("businessDashboard")}>
            ←
          </button>

          <div style={livePill}> {t.activeEmergency}</div>
        </div>

        <div style={heroCard}>
          <div style={heroIcon}>SOS</div>

          <h1 style={title}>{t.title}</h1>
          <p style={subtitle}>{t.subtitle}</p>

          <div style={statusPill}>
            {t.status}: {statusLabels[dispatchStatus] || statusLabels.pending}
          </div>
        </div>

        <div style={operationsCard}>
          <h2 style={sectionTitle}>{t.dailyControls}</h2>

          <div style={readyRow}>
            <div>
              <strong style={readyTitle}>{t.dispatchReady}</strong>
              <p style={readyHelp}>{t.dispatchReadyHelp}</p>
            </div>

            <button
              style={{
                ...readyButton,
                background: dispatchReady ? "#16a34a" : "#e5e7eb",
                color: dispatchReady ? "white" : "#111827",
              }}
              onClick={() => setDispatchReady(!dispatchReady)}
            >
              {dispatchReady ? t.ready : t.off}
            </button>
          </div>

          <div style={fieldGrid}>
            <label style={fieldLabel}>
              {t.dispatchFee}
              <input
                style={fieldInput}
                value={operationDispatchFee}
                onChange={(event) => setOperationDispatchFee(event.target.value)}
                placeholder="$35"
              />
            </label>

            <label style={fieldLabel}>
              {t.responseTime}
              <input
                style={fieldInput}
                value={operationResponseTime}
                onChange={(event) => setOperationResponseTime(event.target.value)}
                placeholder="15-30 min"
              />
            </label>

            <label style={fieldLabel}>
              {t.radius}
              <input
                style={fieldInput}
                value={operationRadius}
                onChange={(event) => setOperationRadius(event.target.value)}
                placeholder="15 miles"
              />
            </label>
          </div>

          <button style={saveButton} onClick={saveOperations}>
            {t.saveOperations}
          </button>
        </div>

        <div style={summaryGrid}>
          <div style={summaryBox}>
            <span>{t.incomingDispatches}</span>
            <strong>0</strong>
          </div>

          <div style={summaryBox}>
            <span>{t.activeDispatches}</span>
            <strong>{dispatchStatus === "completed" ? "0" : "1"}</strong>
          </div>

          <div style={summaryBox}>
            <span>{t.emergencyHistory}</span>
            <strong>{localStorage.getItem("emergencyCompletedAt") ? "1" : "0"}</strong>
          </div>

          <div style={summaryBox}>
            <span>{t.emergencyRevenue}</span>
            <strong>$0</strong>
          </div>
        </div>

        <div style={operationsNote}>{t.profileReminder}</div>

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

          <button style={completeButton} onClick={completeEmergency}>
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
  minHeight: "100dvh",
  background: "linear-gradient(180deg, #fff1f2 0%, #ffffff 48%, var(--meetro-surface-sage, #eef4ea) 100%)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 24px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
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

const operationsCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
  marginBottom: "18px",
};

const readyRow = {
  background: "#f8fafc",
  borderRadius: "20px",
  padding: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  marginBottom: "16px",
};

const readyTitle = {
  display: "block",
  fontSize: "16px",
  color: "#111827",
  marginBottom: "4px",
};

const readyHelp = {
  margin: 0,
  color: "#667085",
  fontSize: "13px",
  lineHeight: 1.45,
};

const readyButton = {
  border: "none",
  borderRadius: "999px",
  padding: "12px 17px",
  fontWeight: "900",
  cursor: "pointer",
  minWidth: "82px",
};

const fieldGrid = {
  display: "grid",
  gap: "12px",
};

const fieldLabel = {
  display: "grid",
  gap: "7px",
  color: "#475569",
  fontWeight: "900",
  fontSize: "13px",
};

const fieldInput = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "14px",
  background: "#f8fafc",
  fontSize: "15px",
  color: "#111827",
  outline: "none",
};

const saveButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#111827",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "16px",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "18px",
};

const summaryBox = {
  background: "white",
  borderRadius: "22px",
  padding: "16px",
  boxShadow: "0 14px 34px rgba(15,23,42,0.07)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const operationsNote = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  borderRadius: "20px",
  padding: "14px",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: 1.45,
  marginBottom: "18px",
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
  background: "var(--meetro-color-forest, #1f4d34)",
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
