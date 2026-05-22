function EmergencyStatus({ setPage, language = "en" }) {
  const selectedService =
    localStorage.getItem("selectedEmergencyService") || "Emergency Help";

  const text = {
    en: {
      title: "Request Sent",
      subtitle: "We found a nearby professional match.",
      service: "Requested Service",
      status: "Contractor match found",
      eta: "ETA: 12 minutes",
      contractor: "Nearby Contractor",
      rating: "4.9 rating",
      jobs: "128 completed jobs",
      distance: "2.4 miles away",
      message: "Message",
      call: "Call",
      accept: "Accept Match",
      accepted: "Match accepted",
      home: "Back Home",
      emergency: "Emergency Services",
      route: "Live Route",
      enRoute: "Professional en route",
    },
    es: {
      title: "Solicitud Enviada",
      subtitle: "Encontramos un profesional cercano disponible.",
      service: "Servicio Solicitado",
      status: "Contratista encontrado",
      eta: "Llegada: 12 minutos",
      contractor: "Contratista Cercano",
      rating: "Calificación 4.9",
      jobs: "128 trabajos completados",
      distance: "A 2.4 millas",
      message: "Mensaje",
      call: "Llamar",
      accept: "Aceptar",
      accepted: "Aceptado",
      home: "Regresar al Inicio",
      emergency: "Servicios de Emergencia",
      route: "Ruta en Vivo",
      enRoute: "Profesional en camino",
    },
  };

  const t = text[language] || text.en;

  function openEmergencyChat() {
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
    localStorage.setItem("conversationReturnPage", "emergencyStatus");
    localStorage.setItem("meetroConversationType", "emergency");

    setPage("conversationThread");
  }

  function acceptMatch() {
    localStorage.setItem("emergencyCustomerAcknowledged", "true");
    localStorage.setItem("emergencyDispatchStatus", "accepted");
    window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
  }

  return (
    <div style={page}>
      <style>
        {`
          @keyframes moveTruck {
            0% { transform: translateX(0); }
            50% { transform: translateX(145px); }
            100% { transform: translateX(0); }
          }

          @keyframes pulseDot {
            0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.35); }
            70% { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
            100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
          }
        `}
      </style>

      <div style={card}>
        <div style={successCircle}>✓</div>

        <h1 style={title}>{t.title}</h1>
        <p style={subtitle}>{t.subtitle}</p>

        <div style={statusCard}>
          <span style={label}>{t.service}</span>
          <strong style={service}>{selectedService}</strong>

          <div style={divider}></div>

          <div style={statusRow}>
            <span style={pulse}></span>
            <strong>{t.status}</strong>
          </div>

          <p style={eta}>{t.eta}</p>
        </div>

        <div style={routeCard}>
          <div style={routeHeader}>
            <span style={label}>{t.route}</span>
            <strong>{t.enRoute}</strong>
          </div>

          <div style={routeLine}>
            <span style={homeDot}>🏠</span>
            <span style={truck}>🚚</span>
            <span style={proDot}>🛠️</span>
          </div>
        </div>

        <div style={contractorCard}>
          <div style={contractorTop}>
            <div style={avatar}>BC</div>

            <div>
              <span style={label}>{t.contractor}</span>
              <strong style={contractorName}>
                Bgone Construction Cleanup
              </strong>

              <div style={metaRow}>
                <span>⭐ {t.rating}</span>
                <span>•</span>
                <span>{t.distance}</span>
              </div>
            </div>
          </div>

          <div style={statsBox}>
            <div style={statCard}>
              <span style={statNumber}>12</span>
              <span style={statLabel}>{t.eta}</span>
            </div>

            <div style={statCard}>
              <span style={statNumber}>128</span>
              <span style={statLabel}>{t.jobs}</span>
            </div>
          </div>

          <div style={actionGrid}>
            <button style={secondaryButton} onClick={openEmergencyChat}>
              {t.message}
            </button>

            <button style={secondaryButton}>
              {t.call}
            </button>
          </div>

          <button style={acceptButton} onClick={acceptMatch}>
            {t.accept}
          </button>
        </div>

        <button style={primaryButton} onClick={() => setPage("home")}>
          {t.home}
        </button>

        <button style={darkButton} onClick={() => setPage("emergency")}>
          {t.emergency}
        </button>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "linear-gradient(160deg, #eef2ff 0%, #ffffff 50%, #f5f3ff 100%)",
  padding: "24px",
  boxSizing: "border-box",
};

const card = {
  maxWidth: "430px",
  margin: "0 auto",
  textAlign: "center",
  paddingTop: "34px",
};

const successCircle = {
  width: "84px",
  height: "84px",
  borderRadius: "28px",
  margin: "0 auto 22px",
  background: "#10b981",
  color: "white",
  fontSize: "44px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 18px 40px rgba(16,185,129,0.28)",
};

const title = {
  fontSize: "32px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "8px",
};

const subtitle = {
  color: "#6b7280",
  fontSize: "16px",
  lineHeight: "1.5",
  marginBottom: "22px",
};

const statusCard = {
  background: "white",
  borderRadius: "26px",
  padding: "22px",
  textAlign: "left",
  boxShadow: "0 14px 36px rgba(0,0,0,0.06)",
  marginBottom: "16px",
};

const label = {
  display: "block",
  fontSize: "12px",
  fontWeight: "800",
  color: "#6b7280",
  marginBottom: "7px",
};

const service = {
  display: "block",
  fontSize: "17px",
  color: "#5b3df5",
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
};

const pulse = {
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  background: "#10b981",
  animation: "pulseDot 1.8s infinite",
};

const eta = {
  margin: "12px 0 0",
  color: "#047857",
  fontWeight: "900",
};

const routeCard = {
  background: "white",
  borderRadius: "26px",
  padding: "18px",
  textAlign: "left",
  boxShadow: "0 14px 36px rgba(0,0,0,0.06)",
  marginBottom: "16px",
};

const routeHeader = {
  marginBottom: "18px",
};

const routeLine = {
  height: "54px",
  position: "relative",
  borderRadius: "999px",
  background:
    "linear-gradient(90deg, #e0e7ff, #ede9fe, #dcfce7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 18px",
  overflow: "hidden",
};

const homeDot = {
  fontSize: "22px",
  zIndex: 2,
};

const proDot = {
  fontSize: "22px",
  zIndex: 2,
};

const truck = {
  position: "absolute",
  left: "70px",
  fontSize: "24px",
  animation: "moveTruck 3.2s ease-in-out infinite",
};

const contractorCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  textAlign: "left",
  boxShadow: "0 18px 44px rgba(91,61,245,0.12)",
  marginBottom: "20px",
  border: "1px solid rgba(91,61,245,0.08)",
};

const contractorTop = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
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

const contractorName = {
  display: "block",
  fontSize: "17px",
  color: "#111827",
  marginBottom: "6px",
};

const metaRow = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
  fontSize: "13px",
  color: "#6b7280",
  fontWeight: "700",
};

const statsBox = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
  marginBottom: "16px",
};

const statCard = {
  background: "#f9fafb",
  borderRadius: "18px",
  padding: "14px",
  textAlign: "center",
};

const statNumber = {
  display: "block",
  fontSize: "22px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "4px",
};

const statLabel = {
  fontSize: "13px",
  color: "#6b7280",
  fontWeight: "700",
  lineHeight: "1.3",
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "10px",
};

const secondaryButton = {
  padding: "13px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#111827",
  fontWeight: "900",
  cursor: "pointer",
};

const acceptButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "17px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
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
  fontWeight: "800",
  cursor: "pointer",
};

export default EmergencyStatus;
