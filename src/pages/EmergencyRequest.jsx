import { useEffect, useState } from "react";

import BottomNav from "../components/BottomNav";

function EmergencyRequest({ setPage }) {
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en"
  );

  useEffect(() => {
    const handleLanguageChange = () => {
      setLanguage(localStorage.getItem("language") || "en");
    };

    window.addEventListener("languageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);

  const text = {
    en: {
      title: "Emergency requests are unavailable",
      detail:
        "Meetro Community cannot send or dispatch emergency requests right now.",
      safety:
        "If anyone is in immediate danger, contact local emergency services now.",
      back: "Back to Emergency Help",
      home: "Back Home",
    },
    es: {
      title: "Las solicitudes de emergencia no estan disponibles",
      detail:
        "Meetro Community no puede enviar ni despachar solicitudes de emergencia en este momento.",
      safety:
        "Si alguien esta en peligro inmediato, comunicate ahora con los servicios de emergencia locales.",
      back: "Regresar a Ayuda de Emergencia",
      home: "Regresar al Inicio",
    },
  };

  const copy = text[language] || text.en;

  return (
    <div className="app-page meetro-form-page" style={page}>
      <main style={card} aria-labelledby="emergency-unavailable-title">
        <button
          type="button"
          style={backMini}
          onClick={() => setPage("emergency")}
          aria-label={copy.back}
        >
          ←
        </button>

        <div style={notice} role="status">
          <h1 id="emergency-unavailable-title" style={title}>
            {copy.title}
          </h1>
          <p style={detail}>{copy.detail}</p>
          <p style={safety}>{copy.safety}</p>
        </div>

        <button
          type="button"
          style={primaryButton}
          onClick={() => setPage("emergency")}
        >
          {copy.back}
        </button>

        <button
          type="button"
          style={secondaryButton}
          onClick={() => setPage("home")}
        >
          {copy.home}
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
    "calc(env(safe-area-inset-top, 0px) + 24px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
};

const card = {
  width: "100%",
  maxWidth: "430px",
  margin: "0 auto",
  paddingTop: "24px",
  paddingBottom: "90px",
  boxSizing: "border-box",
};

const backMini = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#111827",
  fontSize: "24px",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  marginBottom: "28px",
};

const notice = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "20px",
  padding: "28px 24px",
  textAlign: "center",
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const title = {
  margin: "0 0 12px",
  color: "#111827",
  fontSize: "30px",
  lineHeight: 1.2,
  fontWeight: "900",
};

const detail = {
  margin: "0",
  color: "#4b5563",
  fontSize: "16px",
  lineHeight: 1.6,
};

const safety = {
  margin: "18px 0 0",
  color: "#991b1b",
  fontSize: "15px",
  lineHeight: 1.55,
  fontWeight: "800",
};

const primaryButton = {
  width: "100%",
  minHeight: "48px",
  marginTop: "20px",
  padding: "14px 16px",
  borderRadius: "16px",
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const secondaryButton = {
  ...primaryButton,
  marginTop: "12px",
  border: "1px solid #cbd5e1",
  background: "white",
  color: "var(--meetro-color-forest, #1f4d34)",
};

export default EmergencyRequest;
