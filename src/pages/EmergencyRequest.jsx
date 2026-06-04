import { useState, useEffect, useRef } from "react";

import BottomNav from "../components/BottomNav";

function EmergencyRequest({ setPage }) {
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en"
  );

  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguage(localStorage.getItem("language") || "en");
    };

    window.addEventListener(
      "languageChanged",
      handleLanguageChange
    );

    return () => {
      window.removeEventListener(
        "languageChanged",
        handleLanguageChange
      );
    };
  }, []);

const selectedService =
    localStorage.getItem("selectedEmergencyService") || "Emergency Help";

  const [issue, setIssue] = useState(
    localStorage.getItem("emergencyIssue") || ""
  );
  const [gateCode, setGateCode] = useState(
    localStorage.getItem("emergencyGateCode") || ""
  );
  const [entryNotes, setEntryNotes] = useState(
    localStorage.getItem("emergencyEntryNotes") || ""
  );
  const [petWarning, setPetWarning] = useState(
    localStorage.getItem("emergencyPetWarning") === "true"
  );
  const [urgency, setUrgency] = useState(
    localStorage.getItem("emergencyUrgency") || "urgent"
  );

  const sendRequestRef = useRef(null);

  function scrollToSendRequest() {
    setTimeout(() => {
      sendRequestRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
  }

  const text = {
    en: {
      title: "Request Emergency Help",
      subtitle: "Tell local pros what you need help with.",
      service: "Selected Service",
      issue: "What happened?",
      issuePlaceholder: "Example: Water leaking under sink, breaker keeps tripping...",
      access: "Access Info",
      gatePlaceholder: "Example: 4821",
      entryPlaceholder: "Example: Use side gate, call when outside...",
      petWarning: "Pet or safety warning",
      urgency: "Urgency Level",
      normal: "Today",
      urgent: "Urgent",
      critical: "Critical",
      upload: "Upload photos",
      uploadNote: "Photo upload coming soon",
      submit: "Send Request",
      back: "Back to Emergency",
    },
    es: {
      title: "Solicitar Ayuda de Emergencia",
      subtitle: "Dile a profesionales locales qué necesitas.",
      service: "Servicio Seleccionado",
      issue: "¿Qué pasó?",
      issuePlaceholder: "Ejemplo: Fuga debajo del fregadero, breaker fallando...",
      access: "Información de Acceso",
      gatePlaceholder: "Ejemplo: 4821",
      entryPlaceholder: "Ejemplo: Usa la puerta lateral, llama al llegar...",
      petWarning: "Advertencia de mascota o seguridad",
      urgency: "Nivel de Urgencia",
      normal: "Hoy",
      urgent: "Urgente",
      critical: "Crítico",
      upload: "Subir fotos",
      uploadNote: "Fotos próximamente",
      submit: "Enviar Solicitud",
      back: "Regresar a Emergencia",
    },
  };

  const t = text[language] || text.en;

  function saveUrgency(value) {
    setUrgency(value);
    localStorage.setItem("emergencyUrgency", value);
  }

  function submitRequest() {
    const currentUserKey =
      localStorage.getItem("userId") ||
      localStorage.getItem("userEmail") ||
      "guest";

    const emergencyConversationId = `emergency-active-request-${currentUserKey}`;

    localStorage.setItem("emergencyIssue", issue);
    localStorage.setItem("emergencyGateCode", gateCode);
    localStorage.setItem("emergencyEntryNotes", entryNotes);
    localStorage.setItem("emergencyPetWarning", petWarning ? "true" : "false");
    localStorage.setItem("emergencyUrgency", urgency);

    localStorage.setItem("activeConversationId", emergencyConversationId);
    localStorage.setItem("activeConversationName", selectedService);
    localStorage.setItem("meetroConversationType", "emergency");
    const emergencyCategory =
      selectedService.includes("Plumbing")
        ? "plumbing"
        : selectedService.includes("Electrical")
        ? "electrical"
        : selectedService.includes("Roof")
        ? "roofing"
        : selectedService.includes("Locksmith")
        ? "locksmith"
        : selectedService.includes("Storm")
        ? "storm"
        : "general";

    localStorage.setItem("selectedEmergencyCategory", emergencyCategory);

    localStorage.setItem("emergencyDispatchStatus", "pending");

    localStorage.setItem(
      `selectedEmergencyService_${currentUserKey}`,
      selectedService
    );

    localStorage.setItem(
      `meetro_emergency_conversation_meta_${currentUserKey}`,
      JSON.stringify({
        id: emergencyConversationId,
        type: "emergency",
        title: selectedService,
        issue,
        gateCode,
        entryNotes,
        petWarning,
        urgency,
        location: "Cape Coral",
        status: "pending",
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

    localStorage.removeItem("emergencyIssue");
    localStorage.removeItem("emergencyGateCode");
    localStorage.removeItem("emergencyEntryNotes");
    localStorage.removeItem("emergencyPetWarning");
    localStorage.removeItem("emergencyUrgency");

    setIssue("");
    setGateCode("");
    setEntryNotes("");
    setPetWarning(false);
    setUrgency("urgent");

    localStorage.setItem("meetroConversationType", "emergency");
    localStorage.setItem("conversationReturnPage", "home");
    localStorage.setItem("dispatchReturnPage", "conversationThread");

    setPage("conversationThread");
  }

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
          <div style={serviceBox}>{selectedService}</div>
        </div>

        <div style={section}>
          <label style={label}>{t.issue}</label>
          <textarea
            style={textarea}
            value={issue}
            onChange={(e) => {
              setIssue(e.target.value);
              localStorage.setItem("emergencyIssue", e.target.value);
            }}
            placeholder={t.issuePlaceholder}
          />
        </div>

        <div style={section}>
          <label style={label}>{t.access}</label>

          <input
            style={input}
            value={gateCode}
            onChange={(e) => {
              setGateCode(e.target.value);
              localStorage.setItem("emergencyGateCode", e.target.value);
            }}
            placeholder={t.gatePlaceholder}
          />

          <textarea
            style={{ ...textarea, minHeight: "90px", marginTop: "12px" }}
            value={entryNotes}
            onChange={(e) => {
              setEntryNotes(e.target.value);
              localStorage.setItem("emergencyEntryNotes", e.target.value);
            }}
            placeholder={t.entryPlaceholder}
          />

          <button
            style={petWarning ? activeWarningButton : warningButton}
            onClick={() => {
              const nextValue = !petWarning;
              setPetWarning(nextValue);
              localStorage.setItem("emergencyPetWarning", nextValue.toString());
            }}
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
              onClick={() => {
                saveUrgency("normal");
                scrollToSendRequest();
              }}
            >
              {t.normal}
            </button>

            <button
              style={urgency === "urgent" ? activeOptionButton : optionButton}
              onClick={() => {
                saveUrgency("urgent");
                scrollToSendRequest();
              }}
            >
              {t.urgent}
            </button>

            <button
              style={urgency === "critical" ? activeDangerButton : optionButton}
              onClick={() => {
                saveUrgency("critical");
                scrollToSendRequest();
              }}
            >
              {t.critical}
            </button>
          </div>
        </div>

        <div style={uploadBox}>
          <strong>{t.upload}</strong>
          <p>{t.uploadNote}</p>
        </div>

        <div ref={sendRequestRef} style={sendArea}>
          <button style={submitButton} onClick={submitRequest}>
            {t.submit}
          </button>
        </div>
         
             <button style={darkButton} onClick={() => setPage("emergency")}>
          {t.back}
        </button>
      </div>

      <BottomNav currentPage="emergency" setPage={setPage} />
    </div>
  );
}         

  const page = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: "24px 24px 210px",
  boxSizing: "border-box",
};

  const card = {
  maxWidth: "430px",
  margin: "0 auto",
  textAlign: "center",
  paddingTop: "24px",
  paddingBottom: "90px",
};

const backMini = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  border: "none",
  background: "white",
  fontSize: "24px",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  marginBottom: "28px",
};

const title = {
  fontSize: "30px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "8px",
};

const subtitle = {
  color: "#6b7280",
  fontSize: "16px",
  marginBottom: "28px",
};

const section = {
  marginBottom: "24px",
};

const label = {
  display: "block",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "12px",
};

const serviceBox = {
  background: "white",
  padding: "18px",
  borderRadius: "18px",
  color: "#5b3df5",
  fontWeight: "900",
  fontSize: "18px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const input = {
  width: "100%",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
};

const textarea = {
  width: "100%",
  minHeight: "120px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
  resize: "vertical",
};

const warningButton = {
  width: "100%",
  marginTop: "12px",
  padding: "15px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const activeWarningButton = {
  ...warningButton,
  background: "#fef3c7",
  border: "1px solid #fbbf24",
  color: "#92400e",
};

const urgencyGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "10px",
};

const sendArea = {
  scrollMarginBottom: "190px",
  marginTop: "20px",
};

const optionButton = {
  padding: "13px",
  borderRadius: "15px",
  border: "1px solid #e5e7eb",
  background: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const activeOptionButton = {
  ...optionButton,
  background: "#ede9fe",
  color: "#5b3df5",
  border: "1px solid #ddd6fe",
};

const activeDangerButton = {
  ...optionButton,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};

const uploadBox = {
  background: "white",
  padding: "24px",
  borderRadius: "20px",
  marginBottom: "20px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const submitButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontWeight: "900",
  fontSize: "16px",
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
  fontWeight: "900",
  fontSize: "15px",
  cursor: "pointer",
};

export default EmergencyRequest;
