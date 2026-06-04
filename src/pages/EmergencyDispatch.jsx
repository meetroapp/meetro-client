import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage, t } from "../utils/language";

function EmergencyDispatch({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());

  const [dispatchStatus, setDispatchStatus] = useState(
    localStorage.getItem("activeJobStatus") ||
    localStorage.getItem("emergencyDispatchStatus") ||
    ""
  );

  const selectedService =
    localStorage.getItem("activeJobService") ||
    localStorage.getItem("selectedEmergencyService") ||
    t("emergencyHelp");

  const professionalName =
    localStorage.getItem("businessName") ||
    (language === "es" ? "Profesional" : "Professional");

  useEffect(() => {
    const updateLanguage = () => {
      setLanguage(getLanguage());
    };

    const syncEmergency = () => {
      setDispatchStatus(
        localStorage.getItem("emergencyDispatchStatus") || ""
      );
    };

    window.addEventListener(
      "meetroEmergencyConversationUpdated",
      syncEmergency
    );

    window.addEventListener(
      "meetro-language-change",
      updateLanguage
    );

    return () => {
      window.removeEventListener(
        "meetroEmergencyConversationUpdated",
        syncEmergency
      );

      window.removeEventListener(
        "meetro-language-change",
        updateLanguage
      );
    };
  }, []);

  function updateStatus(status) {
    localStorage.setItem("emergencyDispatchStatus", status);
    localStorage.setItem("activeJobStatus", status);

    window.dispatchEvent(new Event("meetroDispatchStatusChanged"));
    window.dispatchEvent(new Event("meetroEmergencyConversationUpdated"));
    window.dispatchEvent(new Event("meetro-messages-updated"));

    setDispatchStatus(status);
  }

  function openEmergencyChat() {
    const conversationId =
      localStorage.getItem("activeConversationId");

    localStorage.setItem(
      "meetroConversationType",
      "emergency"
    );

    localStorage.setItem(
      "conversationReturnPage",
      "emergencyDispatch"
    );

    if (conversationId) {
      setPage("conversationThread");
    }
  }

  function goBack() {
    const returnPage =
      localStorage.getItem("dispatchReturnPage") ||
      "conversationThread";

    setPage(returnPage);
  }

  function completeService() {
    updateStatus("completed");

    localStorage.setItem("activeJobStatus", "completed");
    localStorage.setItem("emergencyDispatchStatus", "completed");
    localStorage.setItem("businessAcceptedEmergency", "false");
    localStorage.setItem("emergencyNeedsReview", "true");
    localStorage.setItem("emergencyCompletedAt", new Date().toISOString());

    window.dispatchEvent(
      new Event("meetroEmergencyConversationUpdated")
    );

    localStorage.setItem(
      "activeCompletionJob",
      JSON.stringify({
        service:
          localStorage.getItem("activeJobService") ||
          localStorage.getItem("selectedEmergencyService") ||
          "Emergency Service",
        location: "Cape Coral, FL",
        amount: "250",
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      })
    );

    localStorage.setItem(
      "emergencyNeedsReview",
      "true"
    );

    localStorage.setItem(
      "emergencyCompletedAt",
      new Date().toISOString()
    );

    localStorage.setItem("completionService", selectedService || "Emergency Service");
    localStorage.setItem("completionLocation", localStorage.getItem("activeJobLocation") || "");
    localStorage.setItem("completionSource", "emergency");
    setPage("completionSheet");
  }

  const statusMap = {
    accepted: {
      title:
        language === "es"
          ? "Solicitud aceptada"
          : "Request Accepted",
      icon: "✅",
      subtitle:
        language === "es"
          ? "Comienza navegación."
          : "Start navigation.",
    },

    enroute: {
      title:
        language === "es"
          ? "En camino"
          : "On the Way",
      icon: "🚐",
      subtitle:
        language === "es"
          ? "Conduciendo al cliente."
          : "Driving to customer.",
    },

    arrived: {
      title:
        language === "es"
          ? "Llegó"
          : "Arrived",
      icon: "📍",
      subtitle:
        language === "es"
          ? "Llegaste a la ubicación."
          : "Arrived at location.",
    },

    started: {
      title:
        language === "es"
          ? "Trabajo iniciado"
          : "Job Started",
      icon: "🛠️",
      subtitle:
        language === "es"
          ? "Trabajo en progreso."
          : "Work in progress.",
    },

    completed: {
      title:
        language === "es"
          ? "Trabajo completado"
          : "Job Completed",
      icon: "🎉",
      subtitle:
        language === "es"
          ? "Servicio terminado."
          : "Service finished.",
    },
  };

  const current =
    statusMap[dispatchStatus] ||
    statusMap.accepted;

  return (
    <div style={page}>
      <div style={card}>

        <button
          style={dispatchBackBtn}
          onClick={goBack}
        >
          ← {language === "es"
            ? "Volver al centro de trabajo"
            : "Back to Work Center"}
        </button>
        <div style={missionHeader}>
          <div style={iconBox}>
            {current.icon}
          </div>

          <div>
            <div style={missionEyebrow}>
              {language === "es" ? "Vista en vivo" : "Live Emergency View"}
            </div>

            <h1 style={title}>
              {current.title}
            </h1>
          </div>
        </div>

        <p style={subtitle}>
          {current.subtitle}
        </p>

        <div style={statusTimeline}>
          {[
            ["accepted", language === "es" ? "Aceptado" : "Accepted"],
            ["enroute", language === "es" ? "En camino" : "On the way"],
            ["arrived", language === "es" ? "Llegó" : "Arrived"],
            ["started", language === "es" ? "Trabajando" : "Working"],
            ["completed", language === "es" ? "Completado" : "Completed"],
          ].map(([status, label]) => {
            const order = ["accepted", "enroute", "arrived", "started", "completed"];
            const active = order.indexOf(status) <= order.indexOf(dispatchStatus);

            return (
              <div key={status} style={active ? statusStepActive : statusStep}>
                <span style={active ? statusDotActive : statusDot}></span>
                {label}
              </div>
            );
          })}
        </div>

        <div style={liveRouteCard}>
          <div style={routeTop}>
            <div>
              <strong>{language === "es" ? "Ruta en vivo" : "Live Route"}</strong>
              <p>{language === "es" ? "Profesional → Cliente" : "Professional → Customer"}</p>
            </div>

            <span style={etaPill}>ETA 10m</span>
          </div>

          <div style={routeMap}>
            <div style={routeLine}></div>
            <div style={routeVan}>🚐</div>
            <div style={routePin}>📍</div>
          </div>
        </div>

        <div style={jobCard}>
          <strong>
            {selectedService}
          </strong>

          <p>
            {professionalName}
          </p>
        </div>

        <div style={dispatchActionStack}>
          <button
            style={messageButton}
            onClick={openEmergencyChat}
          >
            💬 {language === "es" ? "Volver al chat" : "Back to Chat"}
          </button>

        {dispatchStatus === "accepted" && (
          <button
            style={primaryButton}
            onClick={() =>
              updateStatus("enroute")
            }
          >
            {language === "es"
              ? "Comenzar ruta"
              : "Start Route"}
          </button>
        )}

        {dispatchStatus === "enroute" && (
          <button
            style={primaryButton}
            onClick={() =>
              updateStatus("arrived")
            }
          >
            {language === "es"
              ? "Marcar Llegada"
              : "Mark Arrived"}
          </button>
        )}

        {dispatchStatus === "arrived" && (
          <button
            style={primaryButton}
            onClick={() =>
              updateStatus("started")
            }
          >
            {language === "es"
              ? "Iniciar Trabajo"
              : "Start Job"}
          </button>
        )}

        {dispatchStatus === "started" && (
          <button
            style={completeButton}
            onClick={completeService}
          >
            ✅ {language === "es"
              ? "Completar Servicio"
              : "Complete Service"}
          </button>
        )}
        </div>
      </div>

      <BottomNav
        setPage={setPage}
        currentPage="emergency"
      />
    </div>
  );
}

const page={
minHeight:"100vh",
background:"#f5f7fb",
padding:"24px 24px 190px"
};


const dispatchBackBtn={
width:"100%",
padding:"14px",
border:"1px solid #fecaca",
borderRadius:"18px",
background:"#fff7f7",
color:"#b91c1c",
fontWeight:"900",
marginBottom:"16px",
cursor:"pointer"
};

const card={
maxWidth:"430px",
margin:"0 auto"
};


const missionHeader={
display:"flex",
alignItems:"center",
gap:"14px",
marginBottom:"14px"
};

const missionEyebrow={
fontSize:"12px",
fontWeight:"900",
color:"#dc2626",
textTransform:"uppercase",
letterSpacing:"0.5px"
};

const iconBox={
width:"72px",
height:"72px",
borderRadius:"30px",
background:"#eef2ff",
fontSize:"34px",
display:"flex",
alignItems:"center",
justifyContent:"center",
margin:"0"
};

const title={
fontSize:"30px",
fontWeight:"900",
textAlign:"left"
};

const subtitle={
textAlign:"left",
color:"#666",
marginBottom:"20px"
};


const liveRouteCard={
background:"#ffffff",
border:"1px solid rgba(239,68,68,0.14)",
borderRadius:"28px",
padding:"18px",
marginBottom:"18px",
boxShadow:"0 14px 34px rgba(239,68,68,0.08)"
};

const routeTop={
display:"flex",
alignItems:"center",
justifyContent:"space-between",
gap:"12px",
marginBottom:"14px"
};

const etaPill={
background:"#fef2f2",
color:"#dc2626",
borderRadius:"999px",
padding:"8px 12px",
fontWeight:"900",
fontSize:"12px"
};

const routeMap={
height:"150px",
borderRadius:"24px",
background:"linear-gradient(135deg,#fff7f7,#ffffff)",
position:"relative",
overflow:"hidden"
};

const routeLine={
position:"absolute",
left:"16%",
right:"16%",
top:"50%",
height:"5px",
borderRadius:"999px",
background:"linear-gradient(90deg,#fca5a5,#ef4444)"
};

const routeVan={
position:"absolute",
left:"13%",
top:"38%",
fontSize:"30px"
};

const routePin={
position:"absolute",
right:"13%",
top:"38%",
fontSize:"30px"
};


const statusTimeline={
display:"flex",
gap:"8px",
overflowX:"auto",
marginBottom:"18px",
paddingBottom:"2px"
};

const statusStep={
display:"flex",
alignItems:"center",
gap:"6px",
whiteSpace:"nowrap",
fontSize:"11px",
fontWeight:"900",
color:"#9ca3af",
background:"#ffffff",
border:"1px solid #e5e7eb",
borderRadius:"999px",
padding:"8px 11px"
};

const statusStepActive={
...statusStep,
color:"#dc2626",
border:"1px solid rgba(239,68,68,0.18)",
background:"#fff7f7"
};

const statusDot={
width:"7px",
height:"7px",
borderRadius:"999px",
background:"#d1d5db"
};

const statusDotActive={
...statusDot,
background:"#ef4444",
boxShadow:"0 0 0 4px rgba(239,68,68,0.10)"
};

const jobCard={
background:"white",
padding:"20px",
borderRadius:"24px",
marginBottom:"20px"
};


const dispatchActionStack={
display:"grid",
gap:"12px",
marginTop:"12px"
};

const messageButton={
width:"100%",
padding:"16px",
border:"none",
borderRadius:"18px",
background:"#111827",
color:"white",
fontWeight:"900",
marginBottom:"12px"
};

const primaryButton={
width:"100%",
padding:"16px",
border:"none",
borderRadius:"18px",
background:"#5b3df5",
color:"white",
fontWeight:"900"
};

const completeButton={
width:"100%",
padding:"16px",
border:"none",
borderRadius:"18px",
background:"#10b981",
color:"white",
fontWeight:"900"
};

export default EmergencyDispatch;
