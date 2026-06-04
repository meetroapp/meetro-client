import { canBusinessSeeCategory, inferEmergencyCategory } from "../utils/categoryRouting";
import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import { authFetch } from "../utils/authFetch";
import { getStoredHomeownerRequests } from "../utils/workflowTimeline";
import { getLanguage, t } from "../utils/language";

function BusinessDashboard({ setPage }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, updateLanguage] = useState(getLanguage());
  const [liveUnreadCount, setLiveUnreadCount] = useState(
    Number(localStorage.getItem("mockUnreadMessages") || 0)
  );

  const [availableNow, setAvailableNow] = useState(
    localStorage.getItem("meetroAvailableNow") === "true"
  );

  const businessName =
    localStorage.getItem("businessName") ||
    profile?.business_name ||
    t("yourBusiness");

  const businessCategory =
    localStorage.getItem("businessCategory") ||
    profile?.business_category ||
    localStorage.getItem("userRole") ||
    "professional";

  useEffect(() => {
    const syncAvailability = () => {
      setAvailableNow(localStorage.getItem("meetroAvailableNow") === "true");
    };

    window.addEventListener("meetroAvailabilityChanged", syncAvailability);
    window.addEventListener("storage", syncAvailability);

    return () => {
      window.removeEventListener("meetroAvailabilityChanged", syncAvailability);
      window.removeEventListener("storage", syncAvailability);
    };
  }, []);

  useEffect(() => {
    const syncUnreadMessages = () => {
      setLiveUnreadCount(
        Number(localStorage.getItem("mockUnreadMessages") || 0)
      );
    };

    syncUnreadMessages();

    window.addEventListener(
      "meetro-messages-updated",
      syncUnreadMessages
    );

    window.addEventListener("storage", syncUnreadMessages);

    const pollingInterval = setInterval(() => {
      if (!document.hidden) {
        syncUnreadMessages();
      }
    }, 7000);

    return () => {
      clearInterval(pollingInterval);

      window.removeEventListener(
        "meetro-messages-updated",
        syncUnreadMessages
      );

      window.removeEventListener(
        "storage",
        syncUnreadMessages
      );
    };
  }, []);


  useEffect(() => {
    const handleLanguageChange = () => updateLanguage(getLanguage());

    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("meetro-language-change", handleLanguageChange);
    window.addEventListener("meetroLanguageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      window.removeEventListener("meetro-language-change", handleLanguageChange);
      window.removeEventListener("meetroLanguageChanged", handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [language]);

  async function fetchProfile() {
    try {
      const result = await authFetch("/my-contractor-profile", {}, setPage);

      if (result?.data?.profile) {
        const backendProfile = result.data.profile;

        setProfile(backendProfile);

        localStorage.setItem(
          "contractorProfile",
          JSON.stringify({
            id: backendProfile.id,
            business_name: backendProfile.business_name || "",
            name: backendProfile.business_name || "",
            category: backendProfile.category || "",
            business_category: backendProfile.category || "",
            location: backendProfile.location || "",
            bio: backendProfile.bio || "",
            image_url: backendProfile.image_url || "",
            logo: backendProfile.image_url || "",
            rating: backendProfile.rating || "5.0",
            status: "active",
          })
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function formatCategory(value) {
    if (!value) return language === "es" ? "Profesional" : "Professional";

    return String(value)
      .replaceAll("_", " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  if (loading) {
    return <LoadingScreen text={t("loadingBusinessDashboard")} />;
  }

  const dashboardBusinessCategory =
    localStorage.getItem("businessCategory") || "";

  const dashboardEmergencyService =
    localStorage.getItem("selectedEmergencyService") || "";

  const dashboardEmergencyCategory =
    localStorage.getItem("selectedEmergencyCategory") ||
    inferEmergencyCategory(dashboardEmergencyService);

  const canDashboardSeeEmergency = canBusinessSeeCategory(
    dashboardBusinessCategory,
    dashboardEmergencyCategory
  );

  const dispatchStatus =
    localStorage.getItem("emergencyDispatchStatus") || "";

  const hasActiveEmergency =
    canDashboardSeeEmergency &&
    dashboardEmergencyService &&
    ["pending", "accepted", "enroute", "arrived", "started"].includes(
      dispatchStatus
    );

  const completedJobs = localStorage.getItem("completedJobsCount") || "1";
  const revenue = localStorage.getItem("totalJobRevenue") || "0";

  const getBusinessSchedule = () => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("meetro_business_schedule") || "[]"
      );

      if (Array.isArray(saved) && saved.length > 0) {
        return saved;
      }
    } catch {}

    return [];
  };

  const businessSchedule = getBusinessSchedule();
  const todayScheduleCount = businessSchedule.length;

  const homeownerRequests =
    getStoredHomeownerRequests();

  const quoteHistory = JSON.parse(
    localStorage.getItem("workCenterQuoteHistory") || "[]"
  );

  const activeProjectsCount = homeownerRequests.filter(
    (project) =>
      ["accepted", "scheduled", "active"].includes(project.status)
  ).length;

  const pendingQuotesCount = quoteHistory.filter(
    (quote) =>
      quote.status === "sent" ||
      quote.status === "quoted" ||
      !quote.status
  ).length;

  const quoteResponseAlertCount = quoteHistory.filter(
    (quote) =>
      !quote.movedToActiveAt &&
      (
        quote.status === "accepted" ||
        quote.status === "revision_requested"
      )
  ).length;

  const unreadMessages = liveUnreadCount ||
    localStorage.getItem("mockStandardUnreadMessages") || "0";

  const text = {
    en: {
      dashboard: "Business Dashboard",
      greeting: "Good morning",
      subtitle: "Your workday at a glance. Handle what matters first.",
      online: "Online",
      offline: "Offline",
      available: "Available now",
      notAvailable: "Not accepting jobs",
      emergency: "Emergency",
      needsAttention: "Needs attention",
      noEmergency: "No active emergencies",
      readyDispatch: "Ready to dispatch",
      messages: "Messages",
      unread: "Unread",
      todayJobs: "Today's Jobs",
      activeJobs: "Active Jobs",
      pendingQuotes: "Pending Quotes",
      todayRevenue: "Today's Revenue",
      quickActions: "Quick Actions",
      allTools: "All tools",
      workCenter: "Work Center",
      workSubtitle: "Active jobs, quotes, and work records.",
      openWorkCenter: "Open Work Center",
      newLeads: "New Leads Near You",
      viewAllLeads: "View all leads",
      upgradeTitle: "Unlock unlimited homeowner leads",
      upgradeText:
        "Priority placement, unlimited lead access, and verified business visibility.",
      upgrade: "Upgrade to Meetro Pro",
    },
    es: {
      dashboard: "Panel de Negocio",
      greeting: "Buenos días",
      subtitle: "Tu día de trabajo en un vistazo. Atiende lo más importante primero.",
      online: "En línea",
      offline: "Desconectado",
      available: "Disponible ahora",
      notAvailable: "No aceptando trabajos",
      emergency: "Emergencia",
      needsAttention: "Necesita atención",
      noEmergency: "Sin emergencias activas",
      readyDispatch: "Listo para despacho",
      messages: "Mensajes",
      unread: "Sin leer",
      todayJobs: "Trabajos de hoy",
      activeJobs: "Trabajos activos",
      pendingQuotes: "Cotizaciones pendientes",
      todayRevenue: "Ingresos de hoy",
      quickActions: "Acciones Rápidas",
      allTools: "Todas",
      workCenter: "Centro de Trabajo",
      workSubtitle: "Trabajos activos, cotizaciones e historial.",
      openWorkCenter: "Abrir Centro de Trabajo",
      newLeads: "Nuevas Oportunidades Cerca",
      viewAllLeads: "Ver todos",
      upgradeTitle: "Desbloquea clientes ilimitados",
      upgradeText:
        "Prioridad, acceso ilimitado a oportunidades y visibilidad verificada.",
      upgrade: "Actualizar a Meetro Pro",
    },
  }[language];

  return (
    <div style={pageWrapper}>
      <style>
        {`
          @keyframes pendingQuotePulse {
            0% {
              box-shadow: 0 0 16px rgba(251,191,36,0.18);
              transform: scale(1);
            }
            50% {
              box-shadow: 0 0 30px rgba(251,191,36,0.38);
              transform: scale(1.015);
            }
            100% {
              box-shadow: 0 0 16px rgba(251,191,36,0.18);
              transform: scale(1);
            }
          }
        `}
      </style>
      <div style={topBar}>
        <div style={brandWrap}>
          <span style={brandMain}>Meetro</span>
          <span style={brandBadge}>Business</span>
        </div>

        <button
          onClick={() => {
            localStorage.setItem("contractorProfileReturnPage", "businessDashboard");
            setPage("contractorProfile");
          }}
          style={profileMini}
        >
          {profile?.image_url ? (
            <img src={profile.image_url} alt={businessName} style={miniAvatar} />
          ) : (
            <span>👤</span>
          )}
        </button>
      </div>

      <div style={statusStrip}>
        <button
          style={statusItem}
          onClick={() => {
            const next = !availableNow;
            localStorage.setItem("meetroAvailableNow", next ? "true" : "false");
            setAvailableNow(next);
            window.dispatchEvent(new Event("meetroAvailabilityChanged"));
          }}
        >
          <span style={statusDot(availableNow)}></span>
          <div>
            <strong>{availableNow ? text.online : text.offline}</strong>
            <p>{availableNow ? text.available : text.notAvailable}</p>
          </div>
        </button>

        <button
          style={statusItem}
          onClick={() => setPage("emergencyOperationsCenter")}
        >
          <span style={statusIcon}>🚨</span>
          <div>
            <strong>{hasActiveEmergency ? `1 ${text.emergency}` : text.noEmergency}</strong>
            <p>{hasActiveEmergency ? text.needsAttention : text.readyDispatch}</p>
          </div>
        </button>

        <button style={statusItem} onClick={() => setPage("messagesInbox")}>
          <span style={statusIcon}>💬</span>
          <div>
            <strong>{text.messages}</strong>
            <p>
              {unreadMessages} {text.unread}
            </p>
          </div>
        </button>
      </div>

      <section style={heroCard}>
        <div style={heroHeader}>
          <div>
            <p style={eyebrow}>{text.dashboard}</p>

            <h1 style={heroTitle}>
              {text.greeting}, {businessName}! 👋
            </h1>

            <p style={heroSubtitle}>{text.subtitle}</p>
          </div>
        </div>

        <div style={glanceGrid}>
          <GlanceItem
            icon="📅"
            title={text.todayJobs}
            value={todayScheduleCount}
            note={
              language === "es"
                ? "Programados"
                : "Scheduled"
            }
          />

          <GlanceItem
            icon="✅"
            title={text.activeJobs}
            value={activeProjectsCount}
            note={
              language === "es"
                ? "En progreso"
                : "In progress"
            }
          />

          <div
            style={
              quoteResponseAlertCount > 0
                ? pendingQuoteGlowWrap
                : {}
            }
          >
            <GlanceItem
              icon="🧾"
              title={text.pendingQuotes}
              value={pendingQuotesCount}
              note={
                language === "es"
                  ? "Esperando respuesta"
                  : "Awaiting response"
              }
            />
          </div>

          <GlanceItem
            icon="💵"
            title={text.todayRevenue}
            value={`$${revenue}`}
            note={
              language === "es"
                ? "Hoy"
                : "Today"
            }
          />
        </div>
      </section>

      <section style={singleActionSection}>
        <button
          style={quoteActionButton}
          onClick={() => {
            localStorage.setItem("meetroCommandTool", "quotes");
            setPage("businessCommandCenter");
          }}
        >
          <div style={quoteActionIcon}>🧾</div>

          <div style={quoteActionContent}>
            <strong style={{ fontSize: "18px" }}>
              {language === "es"
                ? "Centro de Comando Empresarial"
                : "Business Command Center"}
            </strong>

            <span style={{ opacity: 0.82, lineHeight: "1.5" }}>
              {language === "es"
                ? "Herramientas empresariales con IA para operaciones y flujos futuros."
                : "AI-powered business tools for future operations workflows."}
            </span>
          </div>
        </button>
      </section>

      <section style={sectionCard}>
        <div style={sectionTop}>
          <div>
            <h2 style={sectionTitle}>
              {language === "es" ? "Próximo en agenda" : "Next Up Today"}
            </h2>
            <p style={sectionSub}>
              {language === "es"
                ? "Visitas, trabajos y citas que mueven el día."
                : "Visits, jobs, and appointments that move the day forward."}
            </p>
          </div>

          <button
            style={linkButton}
            onClick={() => {
              localStorage.setItem("meetroWorkCenterTab", "schedule");
              setPage("contractorDashboard");
            }}
          >
            {language === "es" ? "Ver agenda" : "View full schedule"} →
          </button>
        </div>

        <div style={activeWorkList}>
          {businessSchedule.length > 0 ? (
            businessSchedule.slice(0, 4).map((item) => (
              <WorkRow
                key={item.id}
                title={item.title}
                meta={item.location || (language === "es" ? "Ubicación del cliente" : "Customer location")}
                status={item.status || (language === "es" ? "Programado" : "Scheduled")}
                time={item.time}
                onClick={() => setPage("contractorDashboard")}
              />
            ))
          ) : (
            <div style={emptyScheduleCard}>
              <div style={emptyScheduleIcon}>📅</div>
              <div>
                <strong>
                  {language === "es" ? "No hay citas para hoy" : "No appointments scheduled today"}
                </strong>
                <p>
                  {language === "es"
                    ? "Cuando agregues una visita o trabajo, aparecerá aquí."
                    : "When you add a visit or job, it will appear here."}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section style={leadsCard}>
        <div style={sectionTop}>
          <h2 style={sectionTitle}>{text.newLeads}</h2>

          <button style={linkButton} onClick={() => setPage("businessLeads")}>
            {text.viewAllLeads} →
          </button>
        </div>

        <LeadCard
          category="Plumbing"
          title="Kitchen Sink Installation"
          location="Cape Coral, FL • 3 mi away"
          time="Posted 1h ago"
          setPage={setPage}
        />

        <LeadCard
          category="Electrical"
          title="Ceiling Fan Installation"
          location="Cape Coral, FL • 2 mi away"
          time="Posted 2h ago"
          setPage={setPage}
        />

        <LeadCard
          category="Roofing"
          title="Roof Inspection & Repair"
          location="Cape Coral, FL • 5 mi away"
          time="Posted 3h ago"
          setPage={setPage}
        />
      </section>

      <section style={upgradeCard}>
        <div style={upgradeIcon}>👑</div>

        <div>
          <span style={upgradeBadge}>Founding Pro</span>
          <h2 style={upgradeTitle}>{text.upgradeTitle}</h2>
          <p style={upgradeText}>{text.upgradeText}</p>
        </div>

        <button style={upgradeButton}>{text.upgrade}</button>
      </section>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

function GlanceItem({ icon, title, value, note }) {
  return (
    <div style={glanceItem}>
      <div style={glanceIcon}>{icon}</div>
      <span style={glanceTitle}>{title}</span>
      <strong style={glanceValue}>{value}</strong>
      <p style={glanceNote}>{note}</p>
    </div>
  );
}

function QuickAction({ icon, label, note, badge, onClick }) {
  return (
    <button style={quickAction} onClick={onClick}>
      <div style={quickIconWrap}>
        <span style={quickIcon}>{icon}</span>
        {badge && badge !== "0" && <span style={miniBadge}>{badge}</span>}
      </div>

      <strong>{label}</strong>
      <span>{note}</span>
    </button>
  );
}

function WorkMetric({ label, value }) {
  return (
    <div style={workMetric}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function WorkRow({ title, meta, status, time, onClick }) {
  return (
    <button style={workRow} onClick={onClick}>
      {time ? (
        <div style={scheduleTimeBadge}>
          <strong>{time}</strong>
          <span>Today</span>
        </div>
      ) : (
        <div style={workThumb}>🏠</div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{title}</strong>
        <p>{meta}</p>
      </div>

      <span style={workStatus}>{status}</span>
      <span style={chevron}>›</span>
    </button>
  );
}

function LeadCard({ category, title, location, time, setPage }) {
  return (
    <button
      onClick={() => {
        const lead = {
          id: Date.now(),
          title,
          category,
          location,
          posted: time,
          description: "Customer is requesting service assistance.",
          urgency: "New",
          verified: true,
        };

        localStorage.setItem("selectedQuoteRequest", JSON.stringify(lead));
        localStorage.setItem("selectedPostId", lead.id);
        localStorage.setItem("projectDetailsReturnPage", "businessDashboard");

        setPage("projectDetails");
      }}
      style={leadCard}
    >
      <div style={leadThumb}>🏠</div>

      <div style={{ flex: 1 }}>
        <span style={leadBadge}>{category}</span>
        <h3 style={leadTitle}>{title}</h3>
        <p style={leadMeta}>{location}</p>
        <p style={leadMeta}>{time}</p>
      </div>

      <span style={newBadge}>New</span>
    </button>
  );
}



const pendingQuoteGlowWrap = {
  borderRadius: "22px",
  boxShadow: "0 0 24px rgba(251,191,36,0.32)",
  animation: "pendingQuotePulse 2.4s ease-in-out infinite",
};

const pageWrapper = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #071225 0%, #0b1630 48%, #f5f7fb 48%)",
  padding: "22px 18px 150px",
  boxSizing: "border-box",
  color: "#111827",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "18px",
};

const brandWrap = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const brandMain = {
  fontSize: "30px",
  fontWeight: "900",
  color: "#7c5cff",
};

const brandBadge = {
  background: "rgba(124,92,255,0.15)",
  color: "#7c5cff",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "1px",
  textTransform: "uppercase",
};

const profileMini = {
  width: "50px",
  height: "50px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
  cursor: "pointer",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const miniAvatar = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const statusStrip = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "24px",
  padding: "12px",
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "8px",
  marginBottom: "16px",
  color: "white",
};

const statusItem = {
  border: "none",
  background: "transparent",
  color: "white",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  textAlign: "left",
  cursor: "pointer",
  padding: "8px",
};

const statusDot = (active) => ({
  width: "17px",
  height: "17px",
  borderRadius: "50%",
  background: active ? "#22c55e" : "#94a3b8",
  boxShadow: active ? "0 0 0 8px rgba(34,197,94,0.14)" : "none",
  flexShrink: 0,
});

const statusIcon = {
  fontSize: "24px",
  flexShrink: 0,
};

const heroCard = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
  color: "white",
  borderRadius: "30px",
  padding: "24px",
  marginBottom: "16px",
  boxShadow: "0 22px 55px rgba(0,0,0,0.22)",
  border: "1px solid rgba(255,255,255,0.12)",
};

const heroHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const eyebrow = {
  margin: 0,
  color: "#c7d2fe",
  fontWeight: "900",
  fontSize: "13px",
};

const heroTitle = {
  margin: "10px 0 10px",
  fontSize: "clamp(25px, 5vw, 34px)",
  lineHeight: 1.12,
  fontWeight: "900",
  color: "#e8efff",
};

const heroSubtitle = {
  margin: "0 0 18px",
  color: "#aebee3",
  lineHeight: 1.5,
};

const glanceGrid = {
  background: "rgba(255,255,255,0.08)",
  borderRadius: "24px",
  padding: "14px",
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "10px",
};

const glanceItem = {
  textAlign: "center",
  borderRight: "1px solid rgba(255,255,255,0.1)",
};

const glanceIcon = {
  fontSize: "24px",
  marginBottom: "6px",
};

const glanceTitle = {
  display: "block",
  fontSize: "12px",
  color: "#cbd5e1",
  fontWeight: "800",
};

const glanceValue = {
  display: "block",
  fontSize: "28px",
  color: "white",
  marginTop: "8px",
};

const glanceNote = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: "12px",
};

const singleActionSection = {
  marginBottom: "14px",
};

const quoteActionButton = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "linear-gradient(135deg, #111c36 0%, #172554 100%)",
  borderRadius: "24px",
  padding: "20px 22px",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "18px",
  cursor: "pointer",
  color: "white",
  boxShadow: "0 16px 40px rgba(15,23,42,0.28)",
};

const quoteActionIcon = {
  width: "56px",
  height: "56px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
  flexShrink: 0,
};


const quoteActionContent = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  textAlign: "left",
};


const sectionCard = {
  background: "white",
  borderRadius: "26px",
  padding: "18px",
  marginBottom: "16px",
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
};

const sectionTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "14px",
};

const sectionTitle = {
  margin: 0,
  fontSize: "22px",
  fontWeight: "900",
};

const sectionSub = {
  margin: "4px 0 0",
  color: "#667085",
  fontSize: "13px",
  fontWeight: "700",
};

const linkButton = {
  border: "none",
  background: "transparent",
  color: "#5b3df5",
  fontWeight: "900",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const quickGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
};

const quickAction = {
  minHeight: "96px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: "20px",
  padding: "12px 8px",
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  gap: "5px",
  cursor: "pointer",
};

const quickIconWrap = {
  position: "relative",
};

const quickIcon = {
  fontSize: "26px",
};

const miniBadge = {
  position: "absolute",
  top: "-8px",
  right: "-10px",
  background: "#ef4444",
  color: "white",
  fontSize: "11px",
  fontWeight: "900",
  borderRadius: "999px",
  padding: "3px 7px",
};

const workMetrics = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "8px",
  marginBottom: "12px",
};

const workMetric = {
  background: "#f8fafc",
  borderRadius: "18px",
  padding: "12px",
  textAlign: "center",
};

const activeWorkList = {
  display: "grid",
  gap: "8px",
};

const summaryOpenBtn = {
  width: "100%",
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  borderRadius: "18px",
  padding: "16px",
  color: "#334155",
  fontWeight: "800",
  textAlign: "center",
  cursor: "pointer",
};

const workRow = {
  width: "100%",
  border: "1px solid #eef2f7",
  background: "white",
  borderRadius: "18px",
  padding: "12px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  textAlign: "left",
  cursor: "pointer",
};

const workThumb = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "#eef2ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
};

const emptyScheduleCard = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: "20px",
  padding: "18px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  color: "#334155",
};

const emptyScheduleIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
};

const scheduleTimeBadge = {
  width: "70px",
  minWidth: "70px",
  borderRadius: "16px",
  background: "#f3f0ff",
  color: "#5b3df5",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 6px",
  lineHeight: 1.1,
};

const workStatus = {
  background: "#eef2ff",
  color: "#5b3df5",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
};

const chevron = {
  fontSize: "24px",
  color: "#94a3b8",
};

const leadsCard = {
  background: "white",
  borderRadius: "26px",
  padding: "18px",
  marginBottom: "16px",
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
};

const leadCard = {
  width: "100%",
  border: "none",
  background: "white",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "13px 0",
  borderBottom: "1px solid #eef2f7",
  textAlign: "left",
  cursor: "pointer",
};

const leadThumb = {
  width: "58px",
  height: "58px",
  borderRadius: "18px",
  background: "#f3f0ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
};

const leadBadge = {
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
};

const leadTitle = {
  margin: "6px 0 4px",
  fontSize: "16px",
};

const leadMeta = {
  margin: 0,
  color: "#667085",
  fontSize: "13px",
};

const newBadge = {
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "7px 10px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
};

const upgradeCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #8b5cf6 100%)",
  color: "white",
  borderRadius: "26px",
  padding: "20px",
  display: "flex",
  gap: "14px",
  alignItems: "center",
  boxShadow: "0 18px 40px rgba(91,61,245,0.22)",
};

const upgradeIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
};

const upgradeBadge = {
  background: "rgba(255,255,255,0.18)",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const upgradeTitle = {
  margin: "10px 0 6px",
  fontSize: "20px",
};

const upgradeText = {
  margin: 0,
  lineHeight: 1.45,
  opacity: 0.92,
  fontSize: "14px",
};

const upgradeButton = {
  border: "none",
  background: "white",
  color: "#5b3df5",
  padding: "13px 14px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginLeft: "auto",
  whiteSpace: "nowrap",
};

export default BusinessDashboard;
