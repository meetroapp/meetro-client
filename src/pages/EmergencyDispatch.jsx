import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import { getLanguage, t } from "../utils/language";
import {
  getActiveJobSnapshot,
} from "../utils/workCenter";
import { transitionEmergencyStatus } from "../utils/emergencyLifecycle";
import { formatMessageTime } from "../utils/displayTime";
import { normalizePricingModel } from "../utils/pricingCalculations";

function EmergencyDispatch({ setPage }) {
  const activeJobSnapshot = getActiveJobSnapshot();

  const activeEmergencyRecord = (() => {
    try {
      return JSON.parse(localStorage.getItem("activeEmergencyRecord") || "{}");
    } catch {
      return {};
    }
  })();

  const [language, setLanguage] = useState(getLanguage());

  const [dispatchStatus, setDispatchStatus] = useState(
    activeEmergencyRecord.status ||
    activeJobSnapshot?.status ||
    localStorage.getItem("activeJobStatus") ||
    localStorage.getItem("emergencyDispatchStatus") ||
    ""
  );

  const selectedService =
    activeEmergencyRecord.service ||
    activeEmergencyRecord.title ||
    activeJobSnapshot?.service ||
    localStorage.getItem("activeJobService") ||
    localStorage.getItem("selectedEmergencyService") ||
    t("emergencyHelp");

  const professionalName =
    activeEmergencyRecord.businessName ||
    localStorage.getItem("emergencyBusinessName") ||
    localStorage.getItem("selectedEmergencyBusiness") ||
    localStorage.getItem("businessName") ||
    (language === "es" ? "Profesional" : "Professional");

  useEffect(() => {
    const updateLanguage = () => {
      setLanguage(getLanguage());
    };

    const syncEmergency = () => {
      let currentRecord = {};

      try {
        currentRecord = JSON.parse(
          localStorage.getItem("activeEmergencyRecord") || "{}"
        );
      } catch {
        currentRecord = {};
      }

      setDispatchStatus(
        currentRecord.status ||
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
    transitionEmergencyStatus(status, {
      service: selectedService,
      businessName: professionalName,
      location:
        activeJobSnapshot?.location ||
        localStorage.getItem("activeJobLocation") ||
        localStorage.getItem("emergencyLocation") ||
        "",
    });

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

  function completeService() {
    updateStatus("completed");
    const emergencyPricing = normalizePricingModel({
      laborPricingType: "flat_fee",
      laborFee: activeEmergencyRecord.laborFee || activeEmergencyRecord.amount || "250",
      laborHours: activeEmergencyRecord.laborHours || "",
      materials: activeEmergencyRecord.materialsTotal || activeEmergencyRecord.materialCost || "0",
    });

    localStorage.setItem(
      "activeCompletionJob",
      JSON.stringify({
        service:
          activeEmergencyRecord.service ||
          activeEmergencyRecord.title ||
          activeJobSnapshot?.service ||
          localStorage.getItem("activeJobService") ||
          localStorage.getItem("selectedEmergencyService") ||
          "Emergency Service",
        location: "Cape Coral, FL",
        amount: String(emergencyPricing.customerTotal),
        laborPricingType: emergencyPricing.laborPricingType,
        laborFee: String(emergencyPricing.laborTotal),
        laborHours: activeEmergencyRecord.laborHours || "",
        materials: String(emergencyPricing.materialsTotal),
        date: new Date().toLocaleDateString(),
        time: formatMessageTime(new Date()),
      })
    );

    localStorage.setItem("completionService", selectedService || "Emergency Service");
    localStorage.setItem(
      "completionLocation",
      activeJobSnapshot?.location ||
      localStorage.getItem("activeJobLocation") ||
      ""
    );
    localStorage.setItem("completionSource", "emergency");
    setPage("completionSheet");
  }

  const statusMap = {
    accepted: {
      title:
        language === "es"
          ? "Solicitud aceptada"
          : "Request Accepted",
      icon: "selected",
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
      icon: "onTheWay",
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
      icon: "arrived",
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
      icon: "activeWork",
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
      icon: "completion",
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
    <div className="app-page meetro-readable-page" style={page}>
      <div style={card}>
        <div style={missionHeader}>
          <div style={iconBox}>
            <MeetroIcon name={current.icon} size={42} decorative />
          </div>

          <div>
            <div style={missionEyebrow}>
              {t("liveEmergencyView")}
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
            ["accepted", t("accepted")],
            ["enroute", t("onTheWay")],
            ["arrived", t("arrived")],
            ["started", t("working")],
            ["completed", t("completed")],
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
              <strong>{t("liveRoute")}</strong>
              <p>{t("professionalToCustomer")}</p>
            </div>

            <span style={etaPill}>ETA 10m</span>
          </div>

          <div style={routeMap}>
            <div style={routeLine}></div>
            <div style={routeVan}>
              <MeetroIcon name="onTheWay" size={24} decorative />
            </div>
            <div style={routePin}>
              <MeetroIcon name="location" size={24} decorative />
            </div>
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
            style={dispatchBackBtn}
            onClick={openEmergencyChat}
          >
            ← {t("backToChat")}
          </button>

        {dispatchStatus === "accepted" && (
          <button
            style={primaryButton}
            onClick={() =>
              updateStatus("enroute")
            }
          >
            {t("startRoute")}
          </button>
        )}

        {dispatchStatus === "enroute" && (
          <button
            style={primaryButton}
            onClick={() =>
              updateStatus("arrived")
            }
          >
            {t("markArrived")}
          </button>
        )}

        {dispatchStatus === "arrived" && (
          <button
            style={primaryButton}
            onClick={() =>
              updateStatus("started")
            }
          >
            {t("startJob")}
          </button>
        )}

        {dispatchStatus === "started" && (
          <button
            style={completeButton}
            onClick={completeService}
          >
            <MeetroIcon name="completion" size={18} decorative /> {t("completeService")}
          </button>
        )}
        </div>
      </div>

      <BottomNav
        setPage={setPage}
        currentPage="emergencyDispatch"
      />
    </div>
  );
}

const page={
minHeight: "100dvh",
background:"#f5f7fb",
padding:
"calc(env(safe-area-inset-top, 0px) + 24px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))"
};


const dispatchBackBtn={
width:"100%",
padding:"16px",
border:"1px solid #fecaca",
borderRadius:"18px",
background:"#fff7f7",
color:"#b91c1c",
fontWeight:"900",
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
