function ContractorJobAccepted({ setPage, language = "en" }) {
  const text = {
    en: {
      title: "Job Accepted",
      subtitle: "You accepted the emergency request.",
      job: "Emergency Plumbing Leak",
      customer: "Homeowner",
      location: "Cape Coral, FL",
      eta: "ETA: 12 minutes",
      next: "Next Step",
      nextText: "Open dispatch to start route tracking and customer communication.",
      dispatch: "Open Dispatch",
      dashboard: "Back to Dashboard",
    },
    es: {
      title: "Trabajo Aceptado",
      subtitle: "Aceptaste la solicitud de emergencia.",
      job: "Fuga de Plomería de Emergencia",
      customer: "Propietario",
      location: "Cape Coral, FL",
      eta: "Llegada: 12 minutos",
      next: "Próximo Paso",
      nextText: "Abre el servicio para iniciar la ruta y comunicación con el cliente.",
      dispatch: "Abrir Servicio",
      dashboard: "Regresar al Panel",
    },
  };

  const t = text[language] || text.en;

  return (
    <div style={page}>
      <div style={card}>
        <div style={successCircle}>✓</div>

        <h1 style={title}>{t.title}</h1>
        <p style={subtitle}>{t.subtitle}</p>

        <div style={jobCard}>
          <div style={badge}>🚨</div>

          <div>
            <strong style={jobTitle}>{t.job}</strong>
            <p style={detail}>{t.customer}</p>
            <p style={detail}>{t.location}</p>
            <p style={eta}>{t.eta}</p>
          </div>
        </div>

        <div style={nextCard}>
          <strong>{t.next}</strong>
          <p>{t.nextText}</p>
        </div>

        <button
          style={primaryButton}
          onClick={() => setPage("emergencyDispatch")}
        >
          {t.dispatch}
        </button>

        <button
          style={darkButton}
          onClick={() => setPage("contractorDashboard")}
        >
          {t.dashboard}
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
  paddingTop: "38px",
};

const successCircle = {
  width: "88px",
  height: "88px",
  borderRadius: "30px",
  margin: "0 auto 22px",
  background: "#10b981",
  color: "white",
  fontSize: "46px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 18px 40px rgba(16,185,129,0.28)",
};

const title = {
  fontSize: "33px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "8px",
};

const subtitle = {
  color: "#6b7280",
  fontSize: "16px",
  marginBottom: "24px",
};

const jobCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  display: "flex",
  gap: "14px",
  textAlign: "left",
  boxShadow: "0 16px 40px rgba(0,0,0,0.07)",
  marginBottom: "18px",
};

const badge = {
  width: "56px",
  height: "56px",
  borderRadius: "20px",
  background: "#fee2e2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  flexShrink: 0,
};

const jobTitle = {
  fontSize: "18px",
  color: "#111827",
};

const detail = {
  margin: "6px 0 0",
  color: "#6b7280",
};

const eta = {
  margin: "10px 0 0",
  color: "#5b3df5",
  fontWeight: "900",
};

const nextCard = {
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  textAlign: "left",
  color: "#374151",
  boxShadow: "0 12px 32px rgba(0,0,0,0.05)",
  marginBottom: "18px",
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

export default ContractorJobAccepted;
