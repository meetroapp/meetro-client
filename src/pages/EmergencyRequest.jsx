import { useState } from "react";

function EmergencyRequest({ setPage, language = "en", selectedService }) {
  const [issue, setIssue] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [petWarning, setPetWarning] = useState(false);
  const [urgency, setUrgency] = useState("urgent");

  const text = {
    en: {
      title: "Request Emergency Help",
      subtitle: "Tell local pros what you need help with.",
      service: "Selected Service",
      issue: "What happened?",
      issuePlaceholder: "Example: Water leaking under sink, breaker keeps tripping...",
      access: "Access Info",
      gateCode: "Gate / Access Code",
      gatePlaceholder: "Example: 4821",
      entryNotes: "Entry Notes",
      entryPlaceholder: "Example: Use side gate, call when outside...",
      petWarning: "Pet or safety warning",
      urgency: "Urgency Level",
      normal: "Today",
      urgent: "Urgent",
      critical: "Critical",
      photos: "Upload photos",
      photosNote: "Photo upload coming soon",
      submit: "Send Request",
      back: "Back to Emergency",
    },
    es: {
      title: "Pedir Ayuda de Emergencia",
      subtitle: "Dile a los profesionales locales qué necesitas.",
      service: "Servicio Seleccionado",
      issue: "¿Qué pasó?",
      issuePlaceholder: "Ejemplo: Agua saliendo debajo del fregadero, breaker fallando...",
      access: "Información de Acceso",
      gateCode: "Código de Entrada",
      gatePlaceholder: "Ejemplo: 4821",
      entryNotes: "Notas de Entrada",
      entryPlaceholder: "Ejemplo: Use la puerta lateral, llame al llegar...",
      petWarning: "Advertencia de mascota o seguridad",
      urgency: "Nivel de Urgencia",
      normal: "Hoy",
      urgent: "Urgente",
      critical: "Crítico",
      photos: "Subir fotos",
      photosNote: "Subida de fotos próximamente",
      submit: "Enviar Solicitud",
      back: "Regresar a Emergencia",
    },
  };

  const t = text[language] || text.en;

  const submitRequest = () => {
    localStorage.setItem("emergencyIssue", issue);
    localStorage.setItem("emergencyGateCode", gateCode);
    localStorage.setItem("emergencyEntryNotes", entryNotes);
    localStorage.setItem("emergencyPetWarning", petWarning ? "true" : "false");
    localStorage.setItem("emergencyUrgency", urgency);

const currentUserKey =
  localStorage.getItem("userId") ||
  localStorage.getItem("userEmail") ||
  "guest";

const emergencyConversationId = `emergency-active-request-${currentUserKey}`;

const emergencyService =
  localStorage.getItem(`selectedEmergencyService_${currentUserKey}`) ||
  localStorage.getItem("selectedEmergencyService") ||
  "Emergency Request";

localStorage.setItem("activeConversationId", emergencyConversationId);
localStorage.setItem("activeConversationName", emergencyService);
localStorage.setItem("meetroConversationType", "emergency");

localStorage.setItem(
  `selectedEmergencyService_${currentUserKey}`,
  emergencyService
);

localStorage.setItem(
  `meetro_emergency_conversation_meta_${currentUserKey}`,
  JSON.stringify({
    id: emergencyConversationId,
    type: "emergency",
    title: emergencyService,
    location: "Cape Coral",
    status: "emergency",
    createdAt: new Date().toISOString(),
  })
);

const starterMessages = [
  {
    id: Date.now(),
    type: "text",
    sender: "me",
    text:
      issue.trim() ||
      (language === "es"
        ? "Solicitud de emergencia enviada."
        : "Emergency request submitted."),
    time: new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
    status: "sent",
    seenAt: "",
    unsent: false,
    createdAt: Date.now(),
  },
];

localStorage.setItem(
  `meetro_conversation_${emergencyConversationId}`,
  JSON.stringify(starterMessages)
);

localStorage.setItem(
  `meetro_conversation_read_${emergencyConversationId}`,
  "false"
);

window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));

    setPage("emergencyStatus");
  };

  return (
    <div style={page}>
      <div style={card}>
        <button style={backMini} onClick={() => setPage("emergency")}>
          ←
        </button>

        <h1 style={title}>{t.title}</h1>
        <p style={subtitle}>{t.subtitle}</p>

        <div style={section}>
          <label style={label}>{t.service}</label>
          <div style={serviceBox}>{selectedService || "Emergency Help"}</div>
        </div>

        <div style={section}>
          <label style={label}>{t.issue}</label>
          <textarea
            style={textarea}
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder={t.issuePlaceholder}
          />
        </div>

        <div style={section}>
          <label style={label}>{t.access}</label>

          <input
            style={input}
            value={gateCode}
            onChange={(e) => setGateCode(e.target.value)}
            placeholder={t.gatePlaceholder}
          />

          <textarea
            style={{ ...textarea, minHeight: "90px", marginTop: "12px" }}
            value={entryNotes}
            onChange={(e) => setEntryNotes(e.target.value)}
            placeholder={t.entryPlaceholder}
          />

          <button
            style={petWarning ? activeWarningButton : warningButton}
            onClick={() => setPetWarning(!petWarning)}
          >
            {petWarning ? "⚠️ " : "🐶 "}
            {t.petWarning}
          </button>
        </div>

        <div style={section}>
          <label style={label}>{t.urgency}</label>

          <div style={urgencyGrid}>
            <button
              style={urgency === "normal" ? activeOptionButton : optionButton}
              onClick={() => setUrgency("normal")}
            >
              {t.normal}
            </button>

            <button
              style={urgency === "urgent" ? activeOptionButton : optionButton}
              onClick={() => setUrgency("urgent")}
            >
              {t.urgent}
            </button>

            <button
              style={urgency === "critical" ? optionButtonDanger : optionButton}
              onClick={() => setUrgency("critical")}
            >
              {t.critical}
            </button>
          </div>
        </div>

        <div style={photoBox}>
          <strong>{t.photos}</strong>
          <span>{t.photosNote}</span>
        </div>

        <button style={submitButton} onClick={submitRequest}>
          {t.submit}
        </button>

        <button style={backButton} onClick={() => setPage("emergency")}>
          {t.back}
        </button>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: "22px",
  boxSizing: "border-box",
};

const card = {
  maxWidth: "430px",
  margin: "0 auto",
};

const backMini = {
  width: "44px",
  height: "44px",
  borderRadius: "16px",
  border: "none",
  background: "white",
  fontSize: "22px",
  fontWeight: "800",
  boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
  cursor: "pointer",
  marginBottom: "22px",
};

const title = {
  fontSize: "31px",
  fontWeight: "900",
  marginBottom: "8px",
  color: "#111827",
};

const subtitle = {
  color: "#6b7280",
  marginBottom: "24px",
  lineHeight: "1.5",
  fontSize: "16px",
};

const section = {
  marginBottom: "20px",
};

const label = {
  display: "block",
  fontSize: "14px",
  fontWeight: "800",
  color: "#111827",
  marginBottom: "9px",
};

const serviceBox = {
  background: "white",
  padding: "16px",
  borderRadius: "18px",
  fontWeight: "800",
  color: "#5b3df5",
  boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
};

const input = {
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "15px 16px",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const textarea = {
  width: "100%",
  minHeight: "120px",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "16px",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
  resize: "vertical",
  fontFamily: "inherit",
};

const warningButton = {
  width: "100%",
  marginTop: "12px",
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#111827",
  fontWeight: "800",
  cursor: "pointer",
};

const activeWarningButton = {
  width: "100%",
  marginTop: "12px",
  padding: "14px",
  borderRadius: "18px",
  border: "none",
  background: "#fef3c7",
  color: "#92400e",
  fontWeight: "900",
  cursor: "pointer",
};

const urgencyGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "10px",
};

const optionButton = {
  padding: "13px 8px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "white",
  fontWeight: "800",
  cursor: "pointer",
};

const activeOptionButton = {
  padding: "13px 8px",
  borderRadius: "16px",
  border: "none",
  background: "#ede9fe",
  color: "#5b3df5",
  fontWeight: "900",
  cursor: "pointer",
};

const optionButtonDanger = {
  padding: "13px 8px",
  borderRadius: "16px",
  border: "none",
  background: "#fee2e2",
  color: "#b91c1c",
  fontWeight: "900",
  cursor: "pointer",
};

const photoBox = {
  background: "white",
  borderRadius: "22px",
  padding: "20px",
  display: "grid",
  gap: "6px",
  color: "#111827",
  boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
  marginBottom: "20px",
};

const submitButton = {
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

const backButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#111827",
  color: "white",
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer",
};

export default EmergencyRequest;
