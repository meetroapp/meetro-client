import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
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
      window.removeEventListener("meetro-language-change", handleLanguageChange);
      window.removeEventListener("meetroLanguageChanged", handleLanguageChange);
    };
  }, []);

 const text = {
    en: {
      title: "Emergency Help",
      subtitle: "Emergency request delivery is not available right now.",
      available: "Requests unavailable",
      request: "Unavailable",
      safety: "If anyone is in immediate danger, contact local emergency services now.",
      back: "Back Home",
      services: [
        {
          icon: "plumbing",
          name: "Emergency Plumbing",
          note: "Leaks, clogs, broken pipes",
        },
        {
          icon: "electrical",
          name: "Emergency Electrical",
          note: "Power issues, outlets, breakers",
        },
        {
          icon: "home",
          name: "Roof Leak Repair",
          note: "Storm leaks, roof damage",
        },
        {
          icon: "lock",
          name: "Locksmith",
          note: "Lockouts, rekeys, broken locks",
        },
        {
          icon: "warning",
          name: "Storm Prep Help",
          note: "Shutters, sandbags, cleanup prep",
        },
        {
          icon: "emergency",
          name: "Other Emergency",
          note: "Describe your issue and connect with available professionals",
        },
      ],
    },
    es: {
      title: "Ayuda de Emergencia",
      subtitle: "El envio de solicitudes de emergencia no esta disponible en este momento.",
      available: "Solicitudes no disponibles",
      request: "No disponible",
      safety: "Si alguien esta en peligro inmediato, comunicate ahora con los servicios de emergencia locales.",
      back: "Regresar al Inicio",
      services: [
        {
          icon: "plumbing",
          name: "Plomería de Emergencia",
          note: "Fugas, drenajes tapados, tuberías rotas",
        },
        {
          icon: "electrical",
          name: "Electricista de Emergencia",
          note: "Problemas eléctricos, enchufes, breakers",
        },
        {
          icon: "home",
          name: "Reparación de Techo",
          note: "Goteras, daños por tormenta",
        },
        {
          icon: "lock",
          name: "Cerrajero",
          note: "Cerraduras, llaves, bloqueos",
        },
        {
          icon: "warning",
          name: "Preparación para Tormentas",
          note: "Shutters, sacos de arena, preparación de limpieza",
        },
        {
          icon: "emergency",
          name: "Otra Emergencia",
          note: "Describe tu problema y conéctate con profesionales disponibles",
        },
      ],
    },
  };

  const t = text[language] || text.en;

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <div style={card}>
        <div style={topBar}>
          <button style={backMini} onClick={() => setPage("home")}>
            ←
          </button>

          <div style={pill}>
            <MeetroIcon name="emergency" size={16} decorative /> {t.available}
          </div>
        </div>

        <h1 style={title}>{t.title}</h1>
        <p style={subtitle}>{t.subtitle}</p>
        <p style={safetyNotice} role="status">{t.safety}</p>

        <div style={grid}>
          {t.services.map((service, index) => (
            <div key={index} style={serviceCard}>
              <div style={serviceTop}>
                <div style={iconBox}>
                  <MeetroIcon name={service.icon} size={30} decorative />
                </div>

                <div>
                  <strong style={serviceName}>{service.name}</strong>
                  <p style={serviceNote}>{service.note}</p>
                </div>
              </div>

              <button
                type="button"
                style={{ ...primaryButton, ...disabledButton }}
                disabled
                aria-disabled="true"
              >
                {t.request}
              </button>
            </div>
          ))}
        </div>

        <button style={button} onClick={() => setPage("home")}>
          {t.back}
        </button>
      </div>

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
  maxWidth: "430px",
  margin: "0 auto",
};

const topBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "24px",
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
};

const pill = {
  padding: "10px 14px",
  borderRadius: "999px",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: "13px",
  fontWeight: "800",
};

const title = {
  fontSize: "32px",
  fontWeight: "900",
  marginBottom: "8px",
  color: "#111827",
  textAlign: "center",
};

const subtitle = {
  color: "#6b7280",
  marginBottom: "22px",
  lineHeight: "1.5",
  fontSize: "16px",
  textAlign: "center",
};

const safetyNotice = {
  margin: "0 0 22px",
  padding: "14px 16px",
  border: "1px solid #fecaca",
  borderRadius: "14px",
  background: "#fff7f7",
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "800",
  lineHeight: 1.5,
  textAlign: "center",
};

const disabledButton = {
  background: "#e5e7eb",
  color: "#6b7280",
  cursor: "not-allowed",
  boxShadow: "none",
};

const grid = {
  display: "grid",
  gap: "16px",
  marginBottom: "24px",
};

const serviceCard = {
  background: "white",
  borderRadius: "26px",
  padding: "20px",
  boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
};

const serviceTop = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "18px",
};

const iconBox = {
  width: "48px",
  height: "48px",
  borderRadius: "18px",
  background: "#f1efff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  flexShrink: 0,
};

const serviceName = {
  fontSize: "16px",
  color: "#111827",
};

const serviceNote = {
  margin: "5px 0 0",
  fontSize: "13px",
  color: "#6b7280",
  lineHeight: "1.35",
};

const primaryButton = {
  width: "100%",
  padding: "12px",
  borderRadius: "16px",
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontWeight: "800",
  cursor: "pointer",
};

const button = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#111827",
  color: "white",
  fontSize: "16px",
  fontWeight: "800",
  cursor: "pointer",
};

export default Emergency;
