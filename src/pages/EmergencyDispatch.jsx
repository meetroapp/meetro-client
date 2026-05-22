import { useEffect, useState } from "react";

function EmergencyDispatch({ setPage, language = "en" }) {
  const selectedService =
    localStorage.getItem("selectedEmergencyService") || "Emergency Help";

  const [step, setStep] = useState(3);
  const [jobStarted, setJobStarted] = useState(false);
  const [jobSeconds, setJobSeconds] = useState(0);

  useEffect(() => {
    if (jobStarted) return;

    const timer = setInterval(() => {
      setStep((current) => {
        if (current >= 5) return 5;
        return current + 1;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [jobStarted]);

  useEffect(() => {
    if (!jobStarted) return;

    const timer = setInterval(() => {
      setJobSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [jobStarted]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const text = {
    en: {
      title: jobStarted
        ? "Job In Progress"
        : step >= 5
        ? "Contractor Arrived"
        : "Contractor En Route",
      subtitle: jobStarted
        ? "Your professional has started working on the service request."
        : step >= 5
        ? "Your matched professional has arrived at your location."
        : "Your matched professional is heading to your location.",
      contractor: "Bgone Construction Cleanup",
      eta: jobStarted ? "Work Timer" : "ETA",
      etaTime: jobStarted
        ? formatTime(jobSeconds)
        : step >= 5
        ? "Arrived"
        : step >= 4
        ? "3 min"
        : "12 min",
      status: jobStarted
        ? "Work active"
        : step >= 5
        ? "Arrived"
        : step >= 4
        ? "Arriving soon"
        : "On the way",
      message: "Message",
      call: "Call",
      tracking: jobStarted
        ? "Work progress tracking active"
        : "Live route tracking coming soon",
      update1: "Request accepted",
      update2: "Contractor assigned",
      update3: "Contractor en route",
      update4: "Arriving soon",
      update5: "Contractor arrived",
      update6: "Job started",
      startJob: "Start Job",
      trackWork: "Track Work",
      completeService: "Complete Service",
      progressTitle: "Work Progress",
      progress1: "Issue reviewed",
      progress2: "Work area checked",
      progress3: "Repair in progress",
      materials: "Materials / Notes",
      materialsNote: "Contractor can add materials and photos later.",
      home: "Back to Dashboard",
    },
    es: {
      title: jobStarted
        ? "Trabajo en Progreso"
        : step >= 5
        ? "Contratista Llegó"
        : "Contratista en Camino",
      subtitle: jobStarted
        ? "Tu profesional comenzó a trabajar en la solicitud."
        : step >= 5
        ? "Tu profesional asignado llegó a tu ubicación."
        : "Tu profesional asignado va hacia tu ubicación.",
      contractor: "Bgone Construction Cleanup",
      eta: jobStarted ? "Tiempo de Trabajo" : "Llegada",
      etaTime: jobStarted
        ? formatTime(jobSeconds)
        : step >= 5
        ? "Llegó"
        : step >= 4
        ? "3 min"
        : "12 min",
      status: jobStarted
        ? "Trabajo activo"
        : step >= 5
        ? "Llegó"
        : step >= 4
        ? "Llegando pronto"
        : "En camino",
      message: "Mensaje",
      call: "Llamar",
      tracking: jobStarted
        ? "Seguimiento del trabajo activo"
        : "Rastreo de ruta en vivo próximamente",
      update1: "Solicitud aceptada",
      update2: "Contratista asignado",
      update3: "Contratista en camino",
      update4: "Llegando pronto",
      update5: "Contratista llegó",
      update6: "Trabajo comenzado",
      startJob: "Comenzar Trabajo",
      trackWork: "Seguir Trabajo",
      completeService: "Completar Servicio",
      progressTitle: "Progreso del Trabajo",
      progress1: "Problema revisado",
      progress2: "Área de trabajo verificada",
      progress3: "Reparación en progreso",
      materials: "Materiales / Notas",
      materialsNote: "El contratista podrá agregar materiales y fotos luego.",
      home: "Volver al Panel",
    },
  };

  const t = text[language] || text.en;

  return (
    <div style={page}>
      <style>
        {`
          @keyframes moveTruck {
            0% { right: 68px; top: 58px; }
            50% { right: 135px; top: 83px; }
            100% { right: 68px; top: 58px; }
          }
        `}
      </style>

      <div style={card}>
        <div style={mapMock}>
          <div style={routeLine}></div>
          <div style={homePin}>🏠</div>
          <div style={jobStarted ? workerPin : truckPin}>
            {jobStarted ? "🛠️" : step >= 5 ? "📍" : "🚐"}
          </div>
          <div style={trackingPill}>{t.tracking}</div>
        </div>

        <h1 style={title}>{t.title}</h1>
        <p style={subtitle}>{t.subtitle}</p>

        <div style={dispatchCard}>
          <div style={contractorTop}>
            <div style={avatar}>BC</div>

            <div>
              <strong style={contractorName}>{t.contractor}</strong>
              <p style={serviceText}>{selectedService}</p>
            </div>
          </div>

          <div style={etaBox}>
            <div>
              <span style={label}>{t.eta}</span>
              <strong style={etaTime}>{t.etaTime}</strong>
            </div>

            <div>
              <span style={label}>Status</span>
              <strong style={statusText}>{t.status}</strong>
            </div>
          </div>

          <div style={actionGrid}>
            <button
              style={secondaryButton}
              onClick={() => {
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
  localStorage.setItem("conversationReturnPage", "contractorDashboard");
  localStorage.setItem("meetroConversationType", "emergency");
  localStorage.setItem("emergencyDispatchStatus", "accepted");

  window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));

  setPage("conversationThread");
}}
            >
              {t.message}
            </button>

            <button style={primaryButton}>{t.call}</button>
          </div>
        </div>

        <div style={timeline}>
          <div style={timelineItem}>✅ {t.update1}</div>
          <div style={timelineItem}>✅ {t.update2}</div>
          <div style={timelineItem}>🟢 {t.update3}</div>

          {step >= 4 && <div style={timelineItem}>🚐 {t.update4}</div>}
          {step >= 5 && <div style={timelineItem}>📍 {t.update5}</div>}
          {jobStarted && <div style={timelineItem}>🛠️ {t.update6}</div>}
        </div>

        {step >= 5 && !jobStarted && (
          <div style={arrivalActions}>
            <button
              style={startButton}
              onClick={() => {
                setJobStarted(true);
                setJobSeconds(0);
              }}
            >
              {t.startJob}
            </button>

            <button style={trackButton}>{t.trackWork}</button>
          </div>
        )}

        {jobStarted && (
          <div style={workCard}>
            <h3 style={workTitle}>{t.progressTitle}</h3>

            <div style={workItem}>✅ {t.progress1}</div>
            <div style={workItem}>✅ {t.progress2}</div>
            <div style={workItem}>🟢 {t.progress3}</div>

            <div style={materialsBox}>
              <strong>{t.materials}</strong>
              <span>{t.materialsNote}</span>
            </div>

            <button
              style={completeButton}
              onClick={() => {
  localStorage.setItem("emergencyDispatchStatus", "completed");
  setPage("businessDashboard");
}}
            >
              {t.completeService}
            </button>
          </div>
        )}

        <button style={homeButton} onClick={() => setPage("businessDashboard")}>      
          {t.home}
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

const mapMock = {
  height: "220px",
  borderRadius: "30px",
  background:
    "linear-gradient(135deg, #dbeafe 0%, #eef2ff 45%, #f5f3ff 100%)",
  position: "relative",
  overflow: "hidden",
  marginBottom: "24px",
  boxShadow: "0 18px 44px rgba(91,61,245,0.14)",
};

const routeLine = {
  position: "absolute",
  width: "230px",
  height: "4px",
  background: "#5b3df5",
  top: "105px",
  left: "92px",
  transform: "rotate(-18deg)",
  borderRadius: "999px",
};

const homePin = {
  position: "absolute",
  left: "62px",
  bottom: "54px",
  fontSize: "34px",
};

const truckPin = {
  position: "absolute",
  right: "68px",
  top: "58px",
  fontSize: "36px",
  animation: "moveTruck 4s ease-in-out infinite",
};

const workerPin = {
  position: "absolute",
  left: "82px",
  bottom: "72px",
  fontSize: "38px",
};

const trackingPill = {
  position: "absolute",
  left: "18px",
  right: "18px",
  bottom: "16px",
  padding: "12px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.9)",
  textAlign: "center",
  fontWeight: "900",
  color: "#5b3df5",
};

const title = {
  fontSize: "31px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "8px",
};

const subtitle = {
  color: "#6b7280",
  fontSize: "16px",
  lineHeight: "1.5",
  marginBottom: "20px",
};

const dispatchCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 16px 40px rgba(0,0,0,0.07)",
  marginBottom: "18px",
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
};

const contractorName = {
  fontSize: "17px",
  color: "#111827",
};

const serviceText = {
  margin: "5px 0 0",
  color: "#6b7280",
  fontSize: "14px",
};

const etaBox = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "16px",
};

const label = {
  display: "block",
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "800",
  marginBottom: "5px",
};

const etaTime = {
  fontSize: "24px",
  color: "#111827",
};

const statusText = {
  fontSize: "18px",
  color: "#047857",
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const secondaryButton = {
  padding: "14px",
  borderRadius: "17px",
  border: "1px solid #e5e7eb",
  background: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const primaryButton = {
  padding: "14px",
  borderRadius: "17px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const timeline = {
  background: "white",
  borderRadius: "26px",
  padding: "18px",
  display: "grid",
  gap: "12px",
  boxShadow: "0 12px 32px rgba(0,0,0,0.05)",
  marginBottom: "18px",
};

const timelineItem = {
  fontWeight: "800",
  color: "#111827",
};

const arrivalActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginBottom: "16px",
};

const startButton = {
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#10b981",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const trackButton = {
  padding: "15px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const workCard = {
  background: "white",
  borderRadius: "28px",
  padding: "22px",
  boxShadow: "0 16px 40px rgba(0,0,0,0.07)",
  marginBottom: "18px",
};

const workTitle = {
  margin: "0 0 16px",
  fontSize: "20px",
  fontWeight: "900",
  color: "#111827",
};

const workItem = {
  padding: "12px 0",
  borderBottom: "1px solid #f3f4f6",
  fontWeight: "800",
  color: "#111827",
};

const materialsBox = {
  marginTop: "16px",
  background: "#f9fafb",
  borderRadius: "20px",
  padding: "16px",
  display: "grid",
  gap: "6px",
  color: "#374151",
};

const completeButton = {
  width: "100%",
  marginTop: "16px",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const homeButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#111827",
  color: "white",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

export default EmergencyDispatch;
