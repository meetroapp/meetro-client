import { useState } from "react";

function ContractorDashboard({ setPage, language = "en" }) {
  const [available, setAvailable] = useState(true);

  const userRole =
    localStorage.getItem("userRole") ||
    localStorage.getItem("businessCategory") ||
    "contractor";

  const text = {
    en: {
      title: "Contractor Dashboard",
      subtitle: "Manage emergency requests and active jobs.",
      available: "Available Now",
      unavailable: "Offline",
      earnings: "Today's Earnings",
      requests: "Matching Emergency Requests",
      noRequests: "No emergency requests matching your service right now.",
      activeJobs: "Active Jobs",
      eta: "12 min away",
      accept: "Accept",
      decline: "Decline",
      activeJob: "Kitchen Leak Repair",
      customer: "Homeowner",
      inProgress: "Job In Progress",
      openDispatch: "Open Dispatch",
      completedToday: "Completed Today",
      jobsCompleted: "3 jobs completed",
      back: "Back",
    },

    es: {
      title: "Panel del Contratista",
      subtitle: "Administra solicitudes de emergencia y trabajos activos.",
      available: "Disponible Ahora",
      unavailable: "Desconectado",
      earnings: "Ganancias de Hoy",
      requests: "Solicitudes de Emergencia Relacionadas",
      noRequests: "No hay solicitudes de emergencia para tu servicio ahora.",
      activeJobs: "Trabajos Activos",
      eta: "A 12 min",
      accept: "Aceptar",
      decline: "Rechazar",
      activeJob: "Reparación de Fuga de Cocina",
      customer: "Propietario",
      inProgress: "Trabajo en Progreso",
      openDispatch: "Abrir Servicio",
      completedToday: "Completados Hoy",
      jobsCompleted: "3 trabajos completados",
      back: "Regresar",
    },
  };

  const t = text[language] || text.en;

  const emergencyRequests = [
    {
      id: 1,
      icon: "🚰",
      title: "Emergency Plumbing Leak",
      titleEs: "Fuga de Plomería de Emergencia",
      location: "Cape Coral, FL",
      category: "plumbing",
      matchRoles: ["plumbing", "plumber", "contractor", "handyman"],
      priority: "High",
    },
    {
      id: 2,
      icon: "⚡",
      title: "Emergency Electrical Issue",
      titleEs: "Problema Eléctrico de Emergencia",
      location: "Cape Coral, FL",
      category: "electrical",
      matchRoles: ["electrical", "electrician", "contractor"],
      priority: "High",
    },
    {
      id: 3,
      icon: "🏠",
      title: "Roof Leak Repair",
      titleEs: "Reparación de Goteras",
      location: "Fort Myers, FL",
      category: "roofing",
      matchRoles: ["roofing", "roofer", "contractor", "handyman"],
      priority: "Urgent",
    },
    {
      id: 4,
      icon: "🌪️",
      title: "Storm Prep Help",
      titleEs: "Preparación para Tormentas",
      location: "Cape Coral, FL",
      category: "stormPrep",
      matchRoles: [
        "roofing",
        "handyman",
        "contractor",
        "cleaning",
        "treeService",
        "junkRemoval",
        "pressureWashing",
      ],
      priority: "Urgent",
    },
    {
      id: 5,
      icon: "🔑",
      title: "Locksmith Needed",
      titleEs: "Se Necesita Cerrajero",
      location: "Cape Coral, FL",
      category: "locksmith",
      matchRoles: ["locksmith"],
      priority: "Normal",
    },
  ];

  const normalizedRole = String(userRole).toLowerCase();

  const matchingRequests = emergencyRequests.filter((request) =>
    request.matchRoles
      .map((role) => role.toLowerCase())
      .includes(normalizedRole)
  );

  const getRequestTitle = (request) => {
    return language === "es" ? request.titleEs : request.title;
  };

  return (
    <div style={page}>
      <div style={header}>
        <button onClick={() => setPage("businessDashboard")} style={backButton}>
          ←
        </button>

        <div style={{ flex: 1 }}>
          <h1 style={title}>{t.title}</h1>

          <p style={subtitle}>{t.subtitle}</p>
        </div>

        <button
          style={available ? availableButton : offlineButton}
          onClick={() => setAvailable(!available)}
        >
          {available ? t.available : t.unavailable}
        </button>
      </div>

      <div style={rolePill}>
        {language === "es" ? "Servicio:" : "Service:"} {userRole}
      </div>

      <div style={earningsCard}>
        <span style={earningsLabel}>{t.earnings}</span>

        <strong style={earningsAmount}>$1,240</strong>

        <div style={jobsCompleted}>{t.jobsCompleted}</div>
      </div>

      <div style={section}>
        <h2 style={sectionTitle}>{t.requests}</h2>

        {matchingRequests.length === 0 ? (
          <div style={emptyCard}>
            <div style={emptyIcon}>📭</div>
            <strong>{t.noRequests}</strong>
          </div>
        ) : (
          <div style={requestList}>
            {matchingRequests.map((request) => (
              <div key={request.id} style={requestCard}>
                <div style={requestTop}>
                  <div style={emergencyBadge}>{request.icon}</div>

                  <div style={{ flex: 1 }}>
                    <strong style={requestTitle}>
                      {getRequestTitle(request)}
                    </strong>

                    <p style={requestLocation}>{request.location}</p>
                  </div>

                  <span style={priorityPill}>{request.priority}</span>
                </div>

                <div style={requestInfo}>{t.eta}</div>

                <div style={buttonGrid}>
                  <button
                    style={acceptButton}
                    onClick={() => {
                      localStorage.setItem(
                        "selectedEmergencyService",
                        getRequestTitle(request)
                      );
                      setPage("contractorJobAccepted");
                    }}
                  >
                    {t.accept}
                  </button>

                  <button style={declineButton}>{t.decline}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={section}>
        <h2 style={sectionTitle}>{t.activeJobs}</h2>

        <div style={activeCard}>
          <div>
            <strong style={activeTitle}>{t.activeJob}</strong>

            <p style={activeCustomer}>{t.customer}</p>
          </div>

          <div style={progressPill}>{t.inProgress}</div>

          <button
            style={dispatchButton}
            onClick={() => setPage("emergencyDispatch")}
          >
            {t.openDispatch}
          </button>
        </div>
      </div>

            <div style={section}>
        <h2 style={sectionTitle}>Business Command Center</h2>

        <div style={activeCard}>
          <div>
            <strong style={activeTitle}>Meetro Pro Tools</strong>

            <p style={activeCustomer}>
              AI quotes, permits, reminders, open jobs, floor plans, and customer tracking.
            </p>
          </div>

          <div style={progressPill}>7-day trial</div>

          <button
            style={dispatchButton}
            onClick={() => setPage("businessCommandCenter")}
          >
            Open Center
          </button>
        </div>
      </div>

      <div style={section}>
        <h2 style={sectionTitle}>{t.completedToday}</h2>

        <div style={miniStats}>
          <div style={miniCard}>
            <strong style={miniNumber}>3</strong>
            <span>Completed</span>
          </div>

          <div style={miniCard}>
            <strong style={miniNumber}>4.9★</strong>
            <span>Rating</span>
          </div>

          <div style={miniCard}>
            <strong style={miniNumber}>98%</strong>
            <span>Response</span>
          </div>
        </div>
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

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  marginBottom: "16px",
};

const backButton = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  border: "none",
  background: "white",
  fontSize: "24px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
};

const title = {
  fontSize: "31px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "8px",
};

const subtitle = {
  color: "#6b7280",
  lineHeight: "1.5",
};

const availableButton = {
  border: "none",
  background: "#10b981",
  color: "white",
  padding: "12px 16px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const offlineButton = {
  border: "none",
  background: "#ef4444",
  color: "white",
  padding: "12px 16px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const rolePill = {
  width: "fit-content",
  background: "white",
  color: "#5b3df5",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: "900",
  boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
  marginBottom: "18px",
};

const earningsCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #7c5cff 100%)",
  borderRadius: "30px",
  padding: "26px",
  color: "white",
  marginBottom: "24px",
  boxShadow: "0 18px 44px rgba(91,61,245,0.25)",
  textAlign: "center",
};

const earningsLabel = {
  display: "block",
  opacity: 0.8,
  marginBottom: "10px",
};

const earningsAmount = {
  fontSize: "42px",
  fontWeight: "900",
};

const jobsCompleted = {
  marginTop: "12px",
  opacity: 0.9,
};

const section = {
  marginBottom: "24px",
};

const sectionTitle = {
  fontSize: "20px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "14px",
  textAlign: "center",
};

const requestList = {
  display: "grid",
  gap: "16px",
};

const requestCard = {
  background: "white",
  borderRadius: "26px",
  padding: "20px",
  boxShadow: "0 14px 36px rgba(0,0,0,0.06)",
};

const requestTop = {
  display: "flex",
  gap: "14px",
  alignItems: "center",
  marginBottom: "14px",
};

const emergencyBadge = {
  width: "54px",
  height: "54px",
  borderRadius: "18px",
  background: "#fee2e2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
};

const requestTitle = {
  fontSize: "17px",
  color: "#111827",
};

const requestLocation = {
  margin: "5px 0 0",
  color: "#6b7280",
};

const priorityPill = {
  background: "#fef3c7",
  color: "#92400e",
  padding: "8px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
};

const requestInfo = {
  marginBottom: "16px",
  fontWeight: "900",
  color: "#5b3df5",
  textAlign: "center",
};

const buttonGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const acceptButton = {
  padding: "14px",
  borderRadius: "18px",
  border: "none",
  background: "#10b981",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const declineButton = {
  padding: "14px",
  borderRadius: "18px",
  border: "none",
  background: "#ef4444",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const emptyCard = {
  background: "white",
  borderRadius: "26px",
  padding: "34px 20px",
  textAlign: "center",
  boxShadow: "0 14px 36px rgba(0,0,0,0.06)",
  color: "#6b7280",
};

const emptyIcon = {
  fontSize: "38px",
  marginBottom: "10px",
};

const activeCard = {
  background: "white",
  borderRadius: "26px",
  padding: "20px",
  display: "grid",
  gap: "14px",
  boxShadow: "0 14px 36px rgba(0,0,0,0.06)",
};

const activeTitle = {
  fontSize: "17px",
  color: "#111827",
};

const activeCustomer = {
  margin: "5px 0 0",
  color: "#6b7280",
};

const progressPill = {
  background: "#ede9fe",
  color: "#5b3df5",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: "900",
  width: "fit-content",
};

const dispatchButton = {
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const miniStats = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "10px",
};

const miniCard = {
  background: "white",
  borderRadius: "22px",
  padding: "18px",
  textAlign: "center",
  boxShadow: "0 12px 28px rgba(0,0,0,0.05)",
};

const miniNumber = {
  display: "block",
  fontSize: "24px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "6px",
};

export default ContractorDashboard;
