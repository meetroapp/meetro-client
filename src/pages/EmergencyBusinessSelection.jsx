import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage } from "../utils/language";

function EmergencyBusinessSelection({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());

  useEffect(() => {
    const sync = () => {
      setLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", sync);
    window.addEventListener("meetro-language-change", sync);
    window.addEventListener("meetroLanguageChanged", sync);

    return () => {
      window.removeEventListener("languageChanged", sync);
      window.removeEventListener("meetro-language-change", sync);
      window.removeEventListener("meetroLanguageChanged", sync);
    };
  }, []);

  const selectedService =
    localStorage.getItem("selectedEmergencyService") ||
    "Emergency Plumbing";

  const text = {
    en: {
      title: "Emergency Help Available",
      subtitle:
        "Available professionals near you are ready to respond.",
      live: "Live Availability",
      active: "Emergency Dispatch Active",
      area: "Serving Cape Coral",
      availableNow: "AVAILABLE NOW",
      eta: "Can respond in about",
      minutes: "12 minutes",
      dispatchFee: "Dispatch Fee",
      cancellationFee: "Cancel After Dispatch",
      verified: "Verified Emergency Professional",
      accepting: "Accepting Emergency Calls",
      tonight: "Serving Your Area Tonight",
      request: "Request Emergency Service",
      rules: "What happens next?",
      step1:
        "Your request is sent directly to this business.",
      step2:
        "The professional may begin dispatch immediately after accepting.",
      step3:
        "You will receive live status updates after dispatch begins.",
      step4:
        "Cancellation after dispatch will charge the listed cancellation fee.",
      agree: "I understand the emergency service rules",
    },
    es: {
      title: "Ayuda de Emergencia Disponible",
      subtitle:
        "Profesionales disponibles cerca de ti están listos para responder.",
      live: "Disponibilidad en Vivo",
      active: "Despacho de Emergencia Activo",
      area: "Sirviendo Cape Coral",
      availableNow: "DISPONIBLE AHORA",
      eta: "Puede responder en aproximadamente",
      minutes: "12 minutos",
      dispatchFee: "Tarifa de Despacho",
      cancellationFee: "Cancelar Después del Despacho",
      verified: "Profesional de Emergencia Verificado",
      accepting: "Aceptando Llamadas de Emergencia",
      tonight: "Sirviendo Tu Área Esta Noche",
      request: "Solicitar Servicio de Emergencia",
      rules: "¿Qué sucede después?",
      step1:
        "Tu solicitud se envía directamente a este negocio.",
      step2:
        "El profesional puede comenzar el despacho inmediatamente después de aceptar.",
      step3:
        "Recibirás actualizaciones en vivo después de iniciar el despacho.",
      step4:
        "Cancelar después del despacho cobrará la tarifa de cancelación indicada.",
      agree: "Entiendo las reglas del servicio de emergencia",
    },
  };

  const t = text[language] || text.en;

  const businesses = [
    {
      id: 1,
      name: "Bgone Home Renovation",
      eta: "12",
      dispatchFee: "$35",
      cancellationFee: "$25",
      rating: "4.9",
    },
    {
      id: 2,
      name: "Rapid Emergency Services",
      eta: "18",
      dispatchFee: "$40",
      cancellationFee: "$30",
      rating: "4.8",
    },
  ];

  function requestEmergency(business) {
    localStorage.setItem("selectedEmergencyBusiness", business.name);
    localStorage.setItem("businessName", business.name);
    localStorage.setItem("emergencyDispatchFee", business.dispatchFee);
    localStorage.setItem(
      "emergencyCancellationFee",
      business.cancellationFee
    );

    setPage("emergencyRequest");
  }

  return (
    <div style={page}>
      <div style={container}>
        <div style={heroCard}>
          <div style={heroBadge}>🚨</div>

          <h1 style={title}>{selectedService}</h1>

          <p style={subtitle}>{t.subtitle}</p>

          <div style={liveRow}>
            <div style={livePill}>📍 {t.area}</div>
            <div style={livePill}>⚡ {t.live}</div>
            <div style={livePill}>🚐 {t.active}</div>
          </div>
        </div>

        {businesses.map((business) => (
          <div key={business.id} style={businessCard}>
            <div style={availableBanner}>{t.availableNow}</div>

            <div style={etaBox}>
              <span style={etaText}>{t.eta}</span>
              <div style={etaTime}>{business.eta} min</div>
            </div>

            <h2 style={businessName}>{business.name}</h2>

            <div style={pricingCard}>
              <div style={pricingRow}>
                <span>{t.dispatchFee}</span>
                <strong>{business.dispatchFee}</strong>
              </div>

              <div style={pricingDivider}></div>

              <div style={pricingRow}>
                <span>{t.cancellationFee}</span>
                <strong>{business.cancellationFee}</strong>
              </div>
            </div>

            <div style={trustSection}>
              <div style={trustBadge}>✅ {t.verified}</div>
              <div style={trustBadge}>🚐 {t.accepting}</div>
              <div style={trustBadge}>📍 {t.tonight}</div>
              <div style={trustBadge}>⭐ {business.rating} Rating</div>
            </div>

            <button
              style={primaryButton}
              onClick={() => requestEmergency(business)}
            >
              {t.request}
            </button>
          </div>
        ))}

        <div style={rulesCard}>
          <h3 style={rulesTitle}>{t.rules}</h3>

          <div style={rulesList}>
            <div style={ruleItem}>1. {t.step1}</div>
            <div style={ruleItem}>2. {t.step2}</div>
            <div style={ruleItem}>3. {t.step3}</div>
            <div style={ruleItem}>4. {t.step4}</div>
          </div>

          <div style={agreementBox}>☑ {t.agree}</div>
        </div>
      </div>

      <BottomNav currentPage="emergency" setPage={setPage} />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #eef2ff 0%, #ffffff 50%, #f5f3ff 100%)",
  padding: "24px 20px 190px",
  boxSizing: "border-box",
};

const container = {
  maxWidth: "460px",
  margin: "0 auto",
};

const heroCard = {
  background: "white",
  borderRadius: "30px",
  padding: "28px",
  marginBottom: "20px",
  boxShadow: "0 18px 44px rgba(91,61,245,0.12)",
  textAlign: "center",
};

const heroBadge = {
  width: "82px",
  height: "82px",
  borderRadius: "28px",
  background: "#ef4444",
  margin: "0 auto 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "38px",
  boxShadow: "0 18px 40px rgba(239,68,68,0.25)",
};

const title = {
  fontSize: "30px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "10px",
};

const subtitle = {
  color: "#667085",
  lineHeight: "1.5",
  marginBottom: "18px",
};

const liveRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  justifyContent: "center",
};

const livePill = {
  background: "#f3f4f6",
  padding: "10px 14px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
  color: "#374151",
};

const businessCard = {
  background: "white",
  borderRadius: "30px",
  padding: "24px",
  marginBottom: "20px",
  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
};

const availableBanner = {
  background: "#dcfce7",
  color: "#166534",
  borderRadius: "999px",
  padding: "10px 16px",
  fontWeight: "900",
  display: "inline-block",
  marginBottom: "18px",
  fontSize: "12px",
};

const etaBox = {
  marginBottom: "18px",
};

const etaText = {
  display: "block",
  color: "#667085",
  fontWeight: "800",
  marginBottom: "8px",
};

const etaTime = {
  fontSize: "34px",
  fontWeight: "900",
  color: "#111827",
};

const businessName = {
  fontSize: "24px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "18px",
};

const pricingCard = {
  background: "#f8fafc",
  borderRadius: "20px",
  padding: "18px",
  marginBottom: "18px",
};

const pricingRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: "800",
  color: "#111827",
};

const pricingDivider = {
  height: "1px",
  background: "#e5e7eb",
  margin: "14px 0",
};

const trustSection = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "22px",
};

const trustBadge = {
  background: "#ecfdf5",
  color: "#166534",
  padding: "8px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
};

const primaryButton = {
  width: "100%",
  padding: "18px",
  borderRadius: "20px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const rulesCard = {
  background: "white",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
};

const rulesTitle = {
  fontSize: "22px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "18px",
};

const rulesList = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  marginBottom: "20px",
};

const ruleItem = {
  color: "#475467",
  lineHeight: "1.5",
  fontWeight: "700",
};

const agreementBox = {
  background: "#eef2ff",
  color: "#3730a3",
  padding: "16px",
  borderRadius: "18px",
  fontWeight: "900",
  textAlign: "center",
};

export default EmergencyBusinessSelection;
