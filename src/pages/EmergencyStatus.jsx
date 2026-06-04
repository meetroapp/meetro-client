import { useEffect, useState } from "react";
import { getLanguage } from "../utils/language";
import BottomNav from "../components/BottomNav";

function EmergencyStatus({ setPage }) {
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

  const selectedService =
    localStorage.getItem("selectedEmergencyService") || "Emergency Help";

  const businessName =
    localStorage.getItem("businessName") ||
    (language === "es" ? "Profesional" : "Professional");

  const text = {
    en: {
      title: "Request Sent",
      pendingSubtitle: "We are looking for an available professional.",
      activeSubtitle: "Your emergency service is active.",
      service: "Requested Service",
      route: "Live Route",
      assigned: "Assigned Professional",
      rating: "4.9 rating",
      nearby: "Nearby professional",
      verified: "Verified Pro",
      response: "Fast response",
      dispatchReady: "Dispatch Ready",
      message: "Message",
      call: "Call",
      cancel: "Cancel Request",
      backHome: "Back to Chat",
      emergencyServices: "Emergency Services",
      rate: "Rate Professional",
      pendingTitle: "Looking for an available professional",
      pendingText:
        "Your request was sent. You will see updates once a business accepts.",
      status: {
        pending: "Waiting for professional",
        accepted: "Professional assigned",
        enroute: "Professional en route",
        arrived: "Professional arrived",
        started: "Job started",
        completed: "Completed",
        cancelled: "Cancelled",
        closed: "Request closed",
      },
      routeText: {
        pending: "Waiting for dispatch",
        accepted: "Professional assigned",
        enroute: "On the way",
        arrived: "Arrived",
        started: "Work in progress",
        completed: "Service completed",
        cancelled: "Request cancelled",
      },
      reassurance: {
        pending: "We are looking for an available professional for your request.",
        accepted:
          "A professional accepted your request and is preparing to help.",
        enroute: "Your professional is on the way to your location.",
        arrived: "Your professional has arrived at the property.",
        started: "Emergency service is currently in progress.",
        completed: "Your emergency request was completed.",
        cancelled: "This emergency request was cancelled.",
      },
    },
    es: {
      title: "Solicitud Enviada",
      pendingSubtitle: "Estamos buscando un profesional disponible.",
      activeSubtitle: "Tu servicio de emergencia está activo.",
      service: "Servicio Solicitado",
      route: "Ruta en Vivo",
      assigned: "Profesional Asignado",
      rating: "Calificación 4.9",
      nearby: "Profesional cercano",
      verified: "Profesional verificado",
      response: "Respuesta rápida",
      dispatchReady: "Listo para despacho",
      message: "Mensaje",
      call: "Llamar",
      cancel: "Cancelar Solicitud",
      backHome: "Regresar al Inicio",
      emergencyServices: "Servicios de Emergencia",
      rate: "Calificar Profesional",
      pendingTitle: "Buscando profesional disponible",
      pendingText:
        "Tu solicitud fue enviada. Verás actualizaciones cuando un negocio acepte.",
      status: {
        pending: "Esperando profesional",
        accepted: "Profesional asignado",
        enroute: "Profesional en camino",
        arrived: "Profesional llegó",
        started: "Trabajo iniciado",
        completed: "Completado",
        cancelled: "Cancelado",
        closed: "Solicitud cerrada",
      },
      routeText: {
        pending: "Esperando despacho",
        accepted: "Profesional asignado",
        enroute: "En camino",
        arrived: "Llegó",
        started: "Trabajo en progreso",
        completed: "Servicio completado",
        cancelled: "Solicitud cancelada",
      },
      reassurance: {
        pending: "Estamos buscando un profesional disponible para tu solicitud.",
        accepted:
          "Un profesional aceptó tu solicitud y se está preparando para ayudarte.",
        enroute: "Tu profesional está en camino a tu ubicación.",
        arrived: "Tu profesional ha llegado a la propiedad.",
        started: "El servicio de emergencia está en progreso.",
        completed: "Tu solicitud de emergencia fue completada.",
        cancelled: "Esta solicitud de emergencia fue cancelada.",
      },
    },
  };

  const t = text[language] || text.en;

  const serviceLabel =
    language === "es"
      ? selectedService
          ?.replace("Emergency Plumbing", "Plomería de Emergencia")
          ?.replace("Emergency Electrical", "Electricista de Emergencia")
          ?.replace("Roof Leak Repair", "Reparación de Techo")
          ?.replace("Locksmith", "Cerrajero")
          ?.replace("Storm Prep Help", "Preparación para Tormentas")
          ?.replace("Other Emergency", "Otra Emergencia")
      : selectedService;

  const showPending = dispatchStatus === "pending";
  const showLive = dispatchStatus !== "pending" && dispatchStatus !== "cancelled";
  const isCompleted = dispatchStatus === "completed";
  const isClosed = dispatchStatus === "closed";

  const statusLabel = t.status[dispatchStatus] || t.status.pending;
  const routeLabel = t.routeText[dispatchStatus] || "";
  const reassuranceMessage =
    t.reassurance[dispatchStatus] || t.reassurance.pending;

  const statusIcon =
    dispatchStatus === "pending"
      ? "⏳"
      : dispatchStatus === "completed"
      ? "✅"
      : dispatchStatus === "cancelled"
      ? "✕"
      : dispatchStatus === "started"
      ? "🛠️"
      : "🚨";

  const routeIcon =
    dispatchStatus === "completed"
      ? "✅"
      : dispatchStatus === "started"
      ? "🛠️"
      : dispatchStatus === "arrived"
      ? "📍"
      : "🚚";

  function getPrimaryStat() {
    if (dispatchStatus === "accepted" || dispatchStatus === "enroute") {
      return {
        value: "12",
        label: language === "es" ? "Llegada estimada" : "ETA: 12 minutes",
      };
    }

    if (dispatchStatus === "arrived") {
      return {
        value: "📍",
        label: language === "es" ? "Profesional llegó" : "Professional arrived",
      };
    }

    if (dispatchStatus === "started") {
      return {
        value: "🛠️",
        label: language === "es" ? "Trabajo en progreso" : "Job in progress",
      };
    }

    if (dispatchStatus === "completed") {
      return {
        value: "✅",
        label: language === "es" ? "Servicio completado" : "Service completed",
      };
    }

    return {
      value: "⏳",
      label: language === "es" ? "Esperando" : "Waiting",
    };
  }

  function openEmergencyChat() {
    const currentUserKey =
      localStorage.getItem("userId") ||
      localStorage.getItem("userEmail") ||
      "guest";

    const emergencyConversationId = `emergency-active-request-${currentUserKey}`;

    localStorage.setItem("activeConversationId", emergencyConversationId);
    localStorage.setItem("activeConversationName", selectedService);
    localStorage.setItem("conversationReturnPage", "emergencyStatus");
    localStorage.setItem("meetroConversationType", "emergency");

    setPage("conversationThread");
  }

  function cancelRequest() {
    localStorage.setItem("emergencyDispatchStatus", "cancelled");
    window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
    setPage("home");
  }

  if (isClosed) {
    return (
      <div style={page}>
        <div style={card}>
          <div style={heroIcon}>✅</div>

          <h1 style={title}>
            {language === "es" ? "Solicitud cerrada" : "Request closed"}
          </h1>

          <p style={subtitle}>
            {language === "es"
              ? "Esta emergencia ya fue cerrada."
              : "This emergency request has already been closed."}
          </p>

          <button style={primaryButton} onClick={openEmergencyChat}>
            {t.backHome}
          </button>
        </div>

        <BottomNav currentPage="home" setPage={setPage} />
      </div>
    );
  }

  const primaryStat = getPrimaryStat();

  return (
    <div style={page}>
      <style>
        {`
          @keyframes pulseDot {
            0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.35); }
            70% { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
            100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
          }
        `}
      </style>

      <div style={card}>
        <div style={heroIcon}>{statusIcon}</div>

        <h1 style={title}>{t.title}</h1>

        <p style={subtitle}>
          {showPending ? t.pendingSubtitle : t.activeSubtitle}
        </p>

        <div style={statusCard}>
          <span style={label}>{t.service}</span>
          <strong style={service}>{serviceLabel}</strong>

          <div style={divider}></div>

          <div style={statusRow}>
            <span style={pulse}></span>
            <strong>{statusLabel}</strong>
          </div>

          {(dispatchStatus === "accepted" || dispatchStatus === "enroute") && (
            <p style={greenText}>
              {language === "es" ? "Llegada estimada: 12 minutos" : "ETA: 12 minutes"}
            </p>
          )}

          {dispatchStatus === "arrived" && (
            <p style={greenText}>
              {language === "es"
                ? "El profesional ha llegado"
                : "Your professional has arrived"}
            </p>
          )}

          {dispatchStatus === "started" && (
            <p style={greenText}>
              {language === "es" ? "El trabajo está en progreso" : "Job in progress"}
            </p>
          )}
        </div>

        {showPending && (
          <div style={panel}>
            <div style={largeIcon}>🔎</div>
            <h2 style={panelTitle}>{t.pendingTitle}</h2>
            <p style={panelText}>{t.pendingText}</p>

            <button style={dangerButton} onClick={cancelRequest}>
              {t.cancel}
            </button>
          </div>
        )}

        {showLive && (
          <>
            <div style={routeCard}>
              <span style={label}>{t.route}</span>
              <strong style={routeTitle}>{routeLabel}</strong>

              <div style={routeLine}>
                <span style={routeDot}>🏠</span>
                <span style={routeDot}>{routeIcon}</span>
                <span style={routeDot}>🛠️</span>
              </div>
            </div>

            <div style={proCard}>
              <div style={proTop}>
                <div style={avatar}>
                  {businessName
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div>
                  <span style={label}>{t.assigned}</span>
                  <strong style={proName}>{businessName}</strong>

                  <div style={metaRow}>
                    <span>⭐ {t.rating}</span>
                    <span>•</span>
                    <span>{t.nearby}</span>
                  </div>

                  <div style={trustRow}>
                    <span style={trustBadge}>✅ {t.verified}</span>
                    <span style={trustBadge}>⚡ {t.response}</span>
                    <span style={trustBadge}>🚐 {t.dispatchReady}</span>
                  </div>
                </div>
              </div>

              <div style={statsBox}>
                <div style={statCard}>
                  <span style={statNumber}>{primaryStat.value}</span>
                  <span style={statLabel}>{primaryStat.label}</span>
                </div>

                <div style={statCard}>
                  <span style={statNumber}>⚡</span>
                  <span style={statLabel}>
                    {language === "es" ? "Respuesta rápida" : "Fast Response"}
                  </span>
                </div>
              </div>

              <div style={actionGrid}>
                <button style={secondaryButton} onClick={openEmergencyChat}>
                  {t.message}
                </button>

                <button style={secondaryButton}>{t.call}</button>
              </div>

              <div
                style={{
                  ...statusPill,
                  ...(dispatchStatus === "started" ? activePill : {}),
                  ...(dispatchStatus === "completed" ? completedPill : {}),
                }}
              >
                ✅ {statusLabel}
              </div>

              <div style={reassuranceNote}>{reassuranceMessage}</div>

              {!isCompleted && (
                <button style={dangerButton} onClick={cancelRequest}>
                  {t.cancel}
                </button>
              )}
            </div>
          </>
        )}

        {isCompleted && localStorage.getItem("emergencyNeedsReview") === "true" && (
          <button
            style={primaryButton}
            onClick={() => setPage("emergencyComplete")}
          >
            {t.rate}
          </button>
        )}

        <button style={primaryButton} onClick={openEmergencyChat}>
          {t.backHome}
        </button>

        <button style={darkButton} onClick={() => setPage("emergency")}>
          {t.emergencyServices}
        </button>
      </div>

      <BottomNav currentPage="emergency" setPage={setPage} />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #eef2ff 0%, #ffffff 55%, #f5f3ff 100%)",
  padding: "24px 20px 190px",
  boxSizing: "border-box",
};

const card = {
  maxWidth: "430px",
  margin: "0 auto",
  textAlign: "center",
  paddingTop: "28px",
};

const heroIcon = {
  width: "82px",
  height: "82px",
  borderRadius: "28px",
  margin: "0 auto 22px",
  background: "#10b981",
  color: "white",
  fontSize: "38px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 18px 45px rgba(16,185,129,0.22)",
};

const title = {
  fontSize: "32px",
  fontWeight: "900",
  color: "#111827",
  margin: "0 0 8px",
};

const subtitle = {
  color: "#667085",
  fontSize: "16px",
  lineHeight: 1.5,
  margin: "0 0 24px",
};

const statusCard = {
  background: "white",
  borderRadius: "26px",
  padding: "24px",
  textAlign: "left",
  boxShadow: "0 18px 44px rgba(15,23,42,0.07)",
  marginBottom: "16px",
};

const label = {
  display: "block",
  fontSize: "12px",
  fontWeight: "900",
  color: "#667085",
  marginBottom: "8px",
};

const service = {
  display: "block",
  color: "#5b3df5",
  fontSize: "18px",
  fontWeight: "900",
};

const divider = {
  height: "1px",
  background: "#e5e7eb",
  margin: "18px 0",
};

const statusRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#111827",
  fontSize: "18px",
};

const pulse = {
  width: "13px",
  height: "13px",
  borderRadius: "50%",
  background: "#10b981",
  animation: "pulseDot 1.8s infinite",
};

const greenText = {
  margin: "16px 0 0",
  color: "#047857",
  fontWeight: "900",
  fontSize: "17px",
};

const panel = {
  background: "white",
  borderRadius: "28px",
  padding: "28px 22px",
  boxShadow: "0 18px 44px rgba(91,61,245,0.12)",
  marginBottom: "20px",
};

const largeIcon = {
  fontSize: "44px",
  marginBottom: "14px",
};

const panelTitle = {
  margin: "0 0 10px",
  fontSize: "22px",
  color: "#111827",
};

const panelText = {
  color: "#667085",
  lineHeight: 1.5,
  marginBottom: "18px",
};

const routeCard = {
  background: "white",
  borderRadius: "26px",
  padding: "20px",
  textAlign: "left",
  boxShadow: "0 18px 44px rgba(15,23,42,0.07)",
  marginBottom: "16px",
};

const routeTitle = {
  display: "block",
  fontSize: "18px",
  marginBottom: "18px",
};

const routeLine = {
  height: "56px",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #e0e7ff, #ede9fe, #dcfce7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 22px",
};

const routeDot = {
  fontSize: "22px",
};

const proCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  textAlign: "left",
  boxShadow: "0 18px 44px rgba(91,61,245,0.12)",
  marginBottom: "20px",
};

const proTop = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  marginBottom: "18px",
};

const avatar = {
  width: "58px",
  height: "58px",
  borderRadius: "20px",
  background: "#5b3df5",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "18px",
  flexShrink: 0,
};

const proName = {
  display: "block",
  color: "#111827",
  fontSize: "17px",
  fontWeight: "900",
  lineHeight: 1.35,
  marginBottom: "8px",
};

const metaRow = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
  color: "#667085",
  fontWeight: "800",
  fontSize: "13px",
  marginBottom: "10px",
};

const trustRow = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const trustBadge = {
  background: "#ecfdf5",
  color: "#166534",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
};

const statsBox = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
  marginBottom: "16px",
};

const statCard = {
  background: "#f8fafc",
  borderRadius: "18px",
  padding: "16px 12px",
  textAlign: "center",
};

const statNumber = {
  display: "block",
  fontSize: "26px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "5px",
};

const statLabel = {
  color: "#667085",
  fontWeight: "900",
  fontSize: "12px",
  lineHeight: 1.35,
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "12px",
};

const secondaryButton = {
  padding: "13px",
  borderRadius: "16px",
  border: "1px solid #d0d5dd",
  background: "white",
  color: "#111827",
  fontWeight: "900",
  cursor: "pointer",
};

const statusPill = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  fontWeight: "900",
  textAlign: "center",
  boxSizing: "border-box",
  marginBottom: "12px",
};

const activePill = {
  background: "#e0f2fe",
  color: "#075985",
  border: "1px solid #bae6fd",
};

const completedPill = {
  background: "#e0e7ff",
  color: "#3730a3",
  border: "1px solid #c7d2fe",
};

const reassuranceNote = {
  background: "#f8fafc",
  color: "#475569",
  padding: "13px",
  borderRadius: "14px",
  fontSize: "13px",
  fontWeight: "800",
  lineHeight: 1.45,
  marginBottom: "12px",
};

const dangerButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "17px",
  border: "none",
  background: "#ef4444",
  color: "white",
  fontWeight: "900",
  fontSize: "15px",
  cursor: "pointer",
};

const primaryButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginBottom: "12px",
};

const darkButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#111827",
  color: "white",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

export default EmergencyStatus;
