import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
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
      title: "Available Emergency Businesses",
      subtitle:
        "Call a nearby business first, confirm availability, then request dispatch tracking.",
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
      callNow: "Call Business",
      viewProfile: "View Profile",
      request: "Request Dispatch Tracking",
      rules: "What happens next?",
      step1:
        "Call the business first to explain the emergency.",
      step2:
        "Confirm they are available and ready to come.",
      step3:
        "Then request dispatch tracking inside Meetro.",
      step4:
        "After dispatch begins, you can track route status and receive updates.",
      agree: "I understand the emergency service rules",
    },
    es: {
      title: "Negocios de Emergencia Disponibles",
      subtitle:
        "Llama primero al negocio, confirma disponibilidad y luego solicita seguimiento de despacho.",
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
      callNow: "Llamar al Negocio",
      viewProfile: "Ver Perfil",
      request: "Solicitar Seguimiento",
      rules: "¿Qué sucede después?",
      step1:
        "Llama primero al negocio para explicar la emergencia.",
      step2:
        "Confirma que están disponibles y listos para ir.",
      step3:
        "Luego solicita seguimiento de despacho dentro de Meetro.",
      step4:
        "Después de iniciar el despacho, podrás ver la ruta y recibir actualizaciones.",
      agree: "Entiendo las reglas del servicio de emergencia",
    },
  };

  const t = text[language] || text.en;

  const businesses = [
    {
      id: 1,
      name: "Bgone Home Renovation",
      eta: "12",
      dispatchFee: "$95",
      cancellationFee: "$25",
      rating: "4.9",
      distance: "2.3 mi",
      phone:
        localStorage.getItem("businessEmergencyPhone") ||
        localStorage.getItem("businessPhone") ||
        localStorage.getItem("contractorPhone") ||
        "",
    },
    {
      id: 2,
      name: "Rapid Emergency Services",
      eta: "18",
      dispatchFee: "$89",
      cancellationFee: "$30",
      rating: "4.8",
      distance: "4.1 mi",
      phone: "",
    },
  ];

  function callBusiness(business) {
    const phone = String(business.phone || "").trim();

    if (!phone) {
      alert(
        language === "es"
          ? "Este negocio aún no agregó un teléfono de emergencia."
          : "This business has not added an emergency phone number yet."
      );
      return;
    }

    window.location.href = phone.startsWith("tel:")
      ? phone
      : `tel:${phone}`;
  }

  function viewBusinessProfile(business) {
    localStorage.setItem("selectedEmergencyBusiness", business.name);
    localStorage.setItem("selectedContractor", JSON.stringify({
      name: business.name,
      business_name: business.name,
      rating: business.rating,
      category: selectedService,
      emergencyDispatch: true,
    }));
    localStorage.setItem("contractorDetailsReturnPage", "emergency");
    setPage("contractorDetails");
  }

  function requestEmergency(business) {
    const currentUserKey =
      localStorage.getItem("userId") ||
      localStorage.getItem("userEmail") ||
      "guest";

    const emergencyRequestId = `emergency-${currentUserKey}-${Date.now()}`;
    const emergencyConversationId =
      `emergency-conversation-${emergencyRequestId}`;

    localStorage.setItem("activeEmergencyRequestId", emergencyRequestId);
    localStorage.setItem("emergencyRequestId", emergencyRequestId);
    localStorage.setItem("emergencyConversationId", emergencyConversationId);
    localStorage.removeItem("emergencyIssue");
    localStorage.removeItem("emergencyGateCode");
    localStorage.removeItem("emergencyEntryNotes");
    localStorage.removeItem("emergencyPetWarning");
    localStorage.removeItem("emergencyUrgency");
    localStorage.removeItem("emergencyPhotos");

    localStorage.setItem("selectedEmergencyBusiness", business.name);
    localStorage.setItem("businessName", business.name);
    localStorage.setItem("emergencyBusinessName", business.name);
    localStorage.setItem("emergencyBusinessPhone", business.phone || "");
    localStorage.setItem("emergencyDispatchFee", business.dispatchFee);
    localStorage.setItem(
      "emergencyCancellationFee",
      business.cancellationFee
    );

    localStorage.setItem(
      `meetro_emergency_business_${emergencyRequestId}`,
      JSON.stringify({
        id: business.id,
        name: business.name,
        rating: business.rating,
        distance: business.distance,
        eta: business.eta,
        phone: business.phone || "",
        dispatchFee: business.dispatchFee,
        cancellationFee: business.cancellationFee,
        selectedAt: new Date().toISOString(),
      })
    );

    setPage("emergencyRequest");
  }

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <div style={container}>
        <div style={heroCard}>
          <div style={heroBadge}>
            <MeetroIcon name="emergency" size={38} decorative />
          </div>

          <h1 style={title}>{selectedService}</h1>

          <p style={subtitle}>{t.subtitle}</p>

          <div style={liveRow}>
            <div style={livePill}><MeetroIcon name="location" size={14} decorative /> {t.area}</div>
            <div style={livePill}><MeetroIcon name="fastResponse" size={14} decorative /> {t.live}</div>
            <div style={livePill}><MeetroIcon name="dispatch" size={14} decorative /> {t.active}</div>
          </div>
        </div>

        {businesses.map((business) => (
          <div key={business.id} style={businessCard}>
            <div style={cardTopRow}>
              <div style={availableBanner}>{t.availableNow}</div>
              <div style={ratingBadge}>
                <MeetroIcon name="reviews" size={14} decorative /> {business.rating}
              </div>
            </div>

            <h2 style={businessName}>{business.name}</h2>

            <div style={etaBox}>
              <div>
                <span style={etaText}>{t.eta}</span>
                <div style={etaTime}>{business.eta} min</div>
              </div>

              <div style={distanceBox}>
                <MeetroIcon name="location" size={14} decorative /> {business.distance}
              </div>
            </div>

            <div style={pricingCard}>
              <div style={pricingRow}>
                <span>{t.dispatchFee}</span>
                <strong>{business.dispatchFee}</strong>
              </div>
            </div>

            <div style={trustSection}>
              <div style={trustBadge}><MeetroIcon name="verified" size={14} decorative /> {t.verified}</div>
              <div style={trustBadge}><MeetroIcon name="phone" size={14} decorative /> {t.accepting}</div>
              <div style={trustBadge}><MeetroIcon name="location" size={14} decorative /> {t.tonight}</div>
            </div>

            <div style={actionStack}>
              <button
                style={{
                  ...callButton,
                  opacity: business.phone ? 1 : 0.65,
                }}
                onClick={() => callBusiness(business)}
              >
                <MeetroIcon name="phone" size={16} decorative /> {business.phone ? t.callNow : language === "es" ? "Teléfono no agregado" : "Phone Not Added"}
              </button>

              <button
                style={profileButton}
                onClick={() => viewBusinessProfile(business)}
              >
                <MeetroIcon name="profile" size={16} decorative /> {t.viewProfile}
              </button>

              <button
                style={primaryButton}
                onClick={() => requestEmergency(business)}
              >
                <MeetroIcon name="dispatch" size={16} decorative /> {t.request}
              </button>
            </div>
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

          <div style={agreementBox}>
            <MeetroIcon name="selected" size={16} decorative /> {t.agree}
          </div>
        </div>
      </div>

      <BottomNav currentPage="emergency" setPage={setPage} />
    </div>
  );
}

const page = {
  minHeight: "100dvh",
  background:
    "linear-gradient(180deg, #eef2ff 0%, #ffffff 50%, #f5f3ff 100%)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 24px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
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

const cardTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "16px",
};

const ratingBadge = {
  background: "#fff7ed",
  color: "#9a3412",
  borderRadius: "999px",
  padding: "8px 12px",
  fontWeight: "900",
  fontSize: "12px",
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
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  marginBottom: "18px",
};

const distanceBox = {
  background: "#f8fafc",
  color: "#334155",
  borderRadius: "16px",
  padding: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
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

const actionStack = {
  display: "grid",
  gap: "10px",
};

const callButton = {
  width: "100%",
  padding: "18px",
  borderRadius: "20px",
  border: "none",
  background: "linear-gradient(135deg, #ef4444, #dc2626)",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 14px 28px rgba(239,68,68,0.22)",
};

const profileButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "20px",
  border: "1px solid rgba(148,163,184,0.24)",
  background: "#ffffff",
  color: "#334155",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

const primaryButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "20px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontSize: "15px",
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
