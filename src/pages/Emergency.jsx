import { useEffect, useState } from "react";

import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import { EMERGENCY_SERVICE_OPTIONS } from "../utils/emergencySpecialties";
import { getLanguage } from "../utils/language";

function Emergency({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());

  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("meetro-language-change", handleLanguageChange);
    window.addEventListener("meetroLanguageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      window.removeEventListener(
        "meetro-language-change",
        handleLanguageChange
      );
      window.removeEventListener(
        "meetroLanguageChanged",
        handleLanguageChange
      );
    };
  }, []);

  const text = {
    en: {
      title: "Emergency Help",
      subtitle:
        "Create a private request, complete the safety review, and connect with a compatible professional.",
      status: "Emergency requests available",
      safety:
        "If anyone is in immediate danger, call 911 or contact local emergency services now.",
      limitation:
        "Meetro connects service requests with professionals. It does not replace 911 or local emergency responders.",
      start: "Start Emergency Draft",
      back: "Back Home",
    },
    es: {
      title: "Ayuda de Emergencia",
      subtitle:
        "Crea una solicitud privada, completa la revisión de seguridad y conéctate con un profesional compatible.",
      status: "Solicitudes de emergencia disponibles",
      safety:
        "Si alguien está en peligro inmediato, llama al 911 o comunícate ahora con los servicios de emergencia locales.",
      limitation:
        "Meetro conecta solicitudes de servicio con profesionales. No reemplaza al 911 ni a los servicios de emergencia locales.",
      start: "Comenzar Borrador",
      back: "Regresar al Inicio",
    },
  };

  const copy = text[language] || text.en;

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <main style={card} aria-labelledby="emergency-help-title">
        <div style={topBar}>
          <button
            type="button"
            style={backMini}
            onClick={() => setPage("home")}
            aria-label={copy.back}
          >
            ←
          </button>

          <div style={pill}>
            <MeetroIcon name="emergency" size={16} decorative />
            {copy.status}
          </div>
        </div>

        <h1 id="emergency-help-title" style={title}>
          {copy.title}
        </h1>

        <p style={subtitle}>{copy.subtitle}</p>

        <div style={safetyNotice} role="alert">
          {copy.safety}
        </div>

        <div style={limitationNotice} role="status">
          {copy.limitation}
        </div>

        <div style={grid}>
          {EMERGENCY_SERVICE_OPTIONS.map((service) => (
            <article key={service.value} style={serviceCard}>
              <div style={serviceTop}>
                <div style={iconBox}>
                  <MeetroIcon
                    name={service.icon}
                    size={30}
                    decorative
                  />
                </div>

                <div>
                  <strong style={serviceName}>
                    {service.label[language] || service.label.en}
                  </strong>
                  <p style={serviceNote}>
                    {service.description[language] ||
                      service.description.en}
                  </p>
                </div>
              </div>

              <button
                type="button"
                style={primaryButton}
                onClick={() => setPage("emergencyRequest")}
              >
                {copy.start}
              </button>
            </article>
          ))}
        </div>

        <button
          type="button"
          style={homeButton}
          onClick={() => setPage("home")}
        >
          {copy.back}
        </button>
      </main>

      <BottomNav currentPage="emergency" setPage={setPage} />
    </div>
  );
}

const page = {
  minHeight: "100dvh",
  background: "#f5f7fb",
  padding:
    "calc(env(safe-area-inset-top) + 64px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
};

const card = {
  width: "100%",
  maxWidth: "430px",
  margin: "0 auto",
};

const topBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "24px",
};

const backMini = {
  width: "44px",
  height: "44px",
  flexShrink: 0,
  borderRadius: "16px",
  border: "none",
  background: "white",
  color: "#111827",
  fontSize: "22px",
  fontWeight: "800",
  boxShadow: "0 8px 22px rgba(0,0,0,0.06)",
  cursor: "pointer",
};

const pill = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  padding: "10px 14px",
  borderRadius: "999px",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: "13px",
  fontWeight: "800",
};

const title = {
  margin: "0 0 8px",
  color: "#111827",
  fontSize: "32px",
  lineHeight: 1.15,
  fontWeight: "900",
  textAlign: "center",
};

const subtitle = {
  margin: "0 0 20px",
  color: "#6b7280",
  fontSize: "16px",
  lineHeight: 1.55,
  textAlign: "center",
};

const safetyNotice = {
  marginBottom: "12px",
  padding: "15px 16px",
  border: "1px solid #fecaca",
  borderRadius: "14px",
  background: "#fff7f7",
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: 1.5,
  textAlign: "center",
};

const limitationNotice = {
  marginBottom: "22px",
  padding: "15px 16px",
  border: "1px solid #dbeafe",
  borderRadius: "14px",
  background: "#eff6ff",
  color: "#1e3a8a",
  fontSize: "14px",
  lineHeight: 1.5,
  textAlign: "center",
};

const grid = {
  display: "grid",
  gap: "16px",
  marginBottom: "24px",
};

const serviceCard = {
  minWidth: 0,
  padding: "20px",
  borderRadius: "26px",
  background: "white",
  boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
};

const serviceTop = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  minWidth: 0,
  marginBottom: "18px",
};

const iconBox = {
  width: "48px",
  height: "48px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "18px",
  background: "#f1efff",
};

const serviceName = {
  color: "#111827",
  fontSize: "16px",
};

const serviceNote = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: 1.4,
};

const primaryButton = {
  width: "100%",
  minHeight: "48px",
  padding: "12px 16px",
  border: "none",
  borderRadius: "16px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontSize: "16px",
  fontWeight: "800",
  cursor: "pointer",
};

const homeButton = {
  ...primaryButton,
  background: "#111827",
};

export default Emergency;
