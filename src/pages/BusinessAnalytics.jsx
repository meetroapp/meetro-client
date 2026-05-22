import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage, t } from "../utils/language";

function BusinessAnalytics({ setPage, currentPage }) {
  const [language, updateLanguage] = useState(getLanguage());

  const businessName =
    localStorage.getItem("businessName") || t("yourBusiness");

  const businessCategory =
    localStorage.getItem("businessCategory") || "professional";

  const isSpanish = language === "es";

  const text = {
    backToDashboard: isSpanish ? "Volver al Panel" : "Back to Dashboard",
    analytics: isSpanish ? "Analíticas" : "Analytics",
    subtitle: isSpanish
      ? `Resumen de rendimiento para ${businessName}.`
      : `Performance overview for ${businessName}.`,
    live: isSpanish ? "En Vivo" : "Live",
    profileViews: isSpanish ? "Visitas del Perfil" : "Profile Views",
    leadsReceived: isSpanish ? "Clientes Recibidos" : "Leads Received",
    responseRate: isSpanish ? "Tasa de Respuesta" : "Response Rate",
    quoteValue: isSpanish ? "Valor Estimado" : "Estimated Value",
    weeklyPerformance: isSpanish ? "Rendimiento Semanal" : "Weekly Performance",
    leadSources: isSpanish ? "Fuentes de Clientes" : "Lead Sources",
    topServices: isSpanish ? "Servicios Principales" : "Top Services",
    insights: isSpanish ? "Estadísticas" : "Insights",
    profileStrength: isSpanish ? "Fuerza del Perfil" : "Profile Strength",
    messageSpeed: isSpanish ? "Velocidad de Respuesta" : "Response Speed",
    closeRate: isSpanish ? "Conversión" : "Close Rate",
    thisWeek: isSpanish ? "Esta Semana" : "This Week",
    lastWeek: isSpanish ? "Semana Pasada" : "Last Week",
    excellent: isSpanish ? "Excelente" : "Excellent",
    good: isSpanish ? "Bueno" : "Good",
    improve: isSpanish ? "Mejorar" : "Improve",
    recommendedAction: isSpanish ? "Acción Recomendada" : "Recommended Action",
    uploadMorePhotos: isSpanish
      ? "Sube más fotos a tu galería para aumentar la confianza."
      : "Upload more project photos to increase customer trust.",
    fasterReplies: isSpanish
      ? "Responde rápido a nuevos clientes para mejorar tu posición."
      : "Reply quickly to new leads to improve your ranking.",
    category: isSpanish ? "Categoría" : "Category",
    activeBusiness: isSpanish ? "Negocio Activo" : "Active Business",
  };

  useEffect(() => {
    const handleLanguageChange = () => {
      updateLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);

  const weeklyData = [
    { label: isSpanish ? "Lun" : "Mon", value: 22 },
    { label: isSpanish ? "Mar" : "Tue", value: 35 },
    { label: isSpanish ? "Mié" : "Wed", value: 28 },
    { label: isSpanish ? "Jue" : "Thu", value: 44 },
    { label: isSpanish ? "Vie" : "Fri", value: 39 },
    { label: isSpanish ? "Sáb" : "Sat", value: 52 },
    { label: isSpanish ? "Dom" : "Sun", value: 31 },
  ];

  const topServices = [
    {
      name: t("plumbing"),
      percent: 84,
    },
    {
      name: t("electrical"),
      percent: 72,
    },
    {
      name: t("drywall"),
      percent: 61,
    },
  ];

  return (
    <div style={pageWrapper}>
      <button
        onClick={() => setPage("businessDashboard")}
        style={backButton}
      >
        ← {text.backToDashboard}
      </button>

      <div style={heroCard}>
        <div style={heroTop}>
          <div>
            <p style={eyebrow}>{text.activeBusiness}</p>

            <h1 style={heroTitle}>{text.analytics}</h1>

            <p style={heroSubtitle}>{text.subtitle}</p>
          </div>

          <div style={liveBadge}>🟢 {text.live}</div>
        </div>

        <div style={businessMeta}>
          <span>{businessName}</span>
          <span>•</span>
          <span>{text.category}: {businessCategory}</span>
        </div>
      </div>

      <div style={statsGrid}>
        <MetricCard
          icon="👁️"
          title={text.profileViews}
          value="326"
          note={`+18% ${text.thisWeek}`}
        />

        <MetricCard
          icon="📥"
          title={text.leadsReceived}
          value="42"
          note={`+9 ${text.thisWeek}`}
        />

        <MetricCard
          icon="⚡"
          title={text.responseRate}
          value="94%"
          note={text.excellent}
        />

        <MetricCard
          icon="💰"
          title={text.quoteValue}
          value="$4.8k"
          note={text.thisWeek}
        />
      </div>

      <div style={card}>
        <div style={sectionHeader}>
          <div>
            <p style={miniLabel}>{text.thisWeek}</p>
            <h2 style={sectionTitle}>{text.weeklyPerformance}</h2>
          </div>

          <span style={positiveBadge}>+24%</span>
        </div>

        <div style={barChart}>
          {weeklyData.map((item) => (
            <div key={item.label} style={barItem}>
              <div style={barTrack}>
                <div
                  style={{
                    ...barFill,
                    height: `${item.value}%`,
                  }}
                ></div>
              </div>

              <span style={barLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={sectionHeader}>
          <div>
            <p style={miniLabel}>{text.leadSources}</p>
            <h2 style={sectionTitle}>{text.topServices}</h2>
          </div>

          <span style={softBadge}>{text.good}</span>
        </div>

        <div style={serviceList}>
          {topServices.map((service) => (
            <div key={service.name} style={serviceRow}>
              <div style={{ flex: 1 }}>
                <div style={serviceTop}>
                  <strong>{service.name}</strong>
                  <span>{service.percent}%</span>
                </div>

                <div style={serviceTrack}>
                  <div
                    style={{
                      ...serviceFill,
                      width: `${service.percent}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={insightGrid}>
        <InsightCard
          icon="👑"
          title={text.profileStrength}
          value="92%"
          status={text.excellent}
        />

        <InsightCard
          icon="⏱️"
          title={text.messageSpeed}
          value="8 min"
          status={text.good}
        />

        <InsightCard
          icon="🎯"
          title={text.closeRate}
          value="38%"
          status={text.improve}
        />
      </div>

      <div style={recommendationCard}>
        <div style={recommendIcon}>🤖</div>

        <div>
          <p style={miniLabel}>{text.recommendedAction}</p>

          <h2 style={recommendTitle}>{text.insights}</h2>

          <p style={recommendText}>{text.uploadMorePhotos}</p>

          <p style={recommendText}>{text.fasterReplies}</p>
        </div>
      </div>

      <BottomNav setPage={setPage} currentPage={currentPage} />
    </div>
  );
}

function MetricCard({ icon, title, value, note }) {
  return (
    <div style={metricCard}>
      <div style={metricTop}>
        <span style={metricIcon}>{icon}</span>
      </div>

      <h2 style={metricValue}>{value}</h2>

      <p style={metricTitle}>{title}</p>

      <span style={metricNote}>{note}</span>
    </div>
  );
}

function InsightCard({ icon, title, value, status }) {
  return (
    <div style={insightCard}>
      <div style={insightIcon}>{icon}</div>

      <h3 style={insightValue}>{value}</h3>

      <p style={insightTitle}>{title}</p>

      <span style={insightStatus}>{status}</span>
    </div>
  );
}

const pageWrapper = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, #eef0ff 0%, transparent 32%), linear-gradient(to bottom, #f7f7fb, #eef0f7)",
  padding: "24px 18px 130px",
  boxSizing: "border-box",
  color: "#111827",
};

const backButton = {
  border: "none",
  background: "#eee7ff",
  color: "#5b3df5",
  padding: "11px 16px",
  borderRadius: "999px",
  fontWeight: "900",
  marginBottom: "18px",
  cursor: "pointer",
  boxShadow: "0 8px 22px rgba(91,61,245,0.12)",
};

const heroCard = {
  background:
    "linear-gradient(135deg, #111b46 0%, #263b92 45%, #5b3df5 100%)",
  borderRadius: "34px",
  padding: "26px",
  color: "white",
  marginBottom: "18px",
  boxShadow: "0 24px 60px rgba(35,54,139,0.32)",
};

const heroTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
};

const eyebrow = {
  margin: 0,
  opacity: 0.82,
  fontWeight: "900",
  fontSize: "13px",
  letterSpacing: "0.4px",
};

const heroTitle = {
  margin: "10px 0",
  fontSize: "42px",
  lineHeight: 1,
};

const heroSubtitle = {
  margin: 0,
  lineHeight: 1.5,
  opacity: 0.92,
  fontSize: "16px",
};

const liveBadge = {
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "999px",
  padding: "10px 14px",
  fontWeight: "900",
  whiteSpace: "nowrap",
};

const businessMeta = {
  marginTop: "22px",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  opacity: 0.9,
  fontWeight: "800",
  fontSize: "14px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "14px",
  marginBottom: "18px",
};

const metricCard = {
  background: "white",
  borderRadius: "26px",
  padding: "18px",
  boxShadow: "0 14px 34px rgba(0,0,0,0.07)",
};

const metricTop = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "12px",
};

const metricIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "16px",
  background: "#f1edff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const metricValue = {
  margin: 0,
  fontSize: "33px",
  color: "#111827",
};

const metricTitle = {
  margin: "6px 0",
  color: "#4b5563",
  fontWeight: "800",
};

const metricNote = {
  color: "#16a34a",
  fontWeight: "900",
  fontSize: "13px",
};

const card = {
  background: "white",
  borderRadius: "28px",
  padding: "20px",
  marginBottom: "18px",
  boxShadow: "0 14px 34px rgba(0,0,0,0.07)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "16px",
};

const miniLabel = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: "900",
};

const sectionTitle = {
  margin: "4px 0 0",
  color: "#111827",
  fontSize: "23px",
};

const positiveBadge = {
  background: "#dcfce7",
  color: "#16a34a",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
};

const softBadge = {
  background: "#f1edff",
  color: "#5b3df5",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
};

const barChart = {
  height: "180px",
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  alignItems: "end",
  gap: "10px",
};

const barItem = {
  height: "100%",
  display: "grid",
  gridTemplateRows: "1fr auto",
  gap: "8px",
  alignItems: "end",
};

const barTrack = {
  height: "100%",
  background: "#f1edff",
  borderRadius: "999px",
  display: "flex",
  alignItems: "end",
  overflow: "hidden",
};

const barFill = {
  width: "100%",
  background: "linear-gradient(180deg, #7b61ff, #5b3df5)",
  borderRadius: "999px",
};

const barLabel = {
  textAlign: "center",
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "900",
};

const serviceList = {
  display: "grid",
  gap: "16px",
};

const serviceRow = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const serviceTop = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "8px",
  color: "#111827",
};

const serviceTrack = {
  height: "10px",
  background: "#f1edff",
  borderRadius: "999px",
  overflow: "hidden",
};

const serviceFill = {
  height: "100%",
  background: "linear-gradient(90deg, #5b3df5, #7b61ff)",
  borderRadius: "999px",
};

const insightGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginBottom: "18px",
};

const insightCard = {
  background: "white",
  borderRadius: "24px",
  padding: "16px 8px",
  textAlign: "center",
  boxShadow: "0 12px 30px rgba(0,0,0,0.06)",
};

const insightIcon = {
  fontSize: "25px",
};

const insightValue = {
  margin: "10px 0 4px",
  fontSize: "22px",
  color: "#111827",
};

const insightTitle = {
  margin: 0,
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "800",
};

const insightStatus = {
  marginTop: "9px",
  display: "inline-block",
  background: "#f1edff",
  color: "#5b3df5",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
};

const recommendationCard = {
  background: "white",
  borderRadius: "28px",
  padding: "20px",
  display: "flex",
  gap: "14px",
  boxShadow: "0 14px 34px rgba(0,0,0,0.07)",
};

const recommendIcon = {
  width: "54px",
  height: "54px",
  minWidth: "54px",
  borderRadius: "18px",
  background: "#f1edff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
};

const recommendTitle = {
  margin: "4px 0 8px",
  color: "#111827",
};

const recommendText = {
  margin: "0 0 8px",
  color: "#4b5563",
  lineHeight: 1.5,
};

export default BusinessAnalytics;
