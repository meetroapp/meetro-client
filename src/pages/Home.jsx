import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage, setLanguage, t } from "../utils/language";
import { isProfessionalSession, setActiveAccountMode } from "../utils/session";

function Home({ setPage }) {
  const [language, updateLanguage] = useState(getLanguage());
  const [activeMode, setActiveMode] = useState(
    localStorage.getItem("activeAccountMode") || "personal"
  );

  const businessName = localStorage.getItem("businessName") || "";
  const businessCategory = localStorage.getItem("businessCategory") || "";
  const userName =
    localStorage.getItem("userName") ||
    localStorage.getItem("userEmail") ||
    t("there");

  const hasBusinessAccess =
    isProfessionalSession() ||
    Boolean(businessName) ||
    Boolean(businessCategory);

  const isBusinessMode = activeMode === "business" && hasBusinessAccess;

  const homeownerRequests = JSON.parse(
    localStorage.getItem("homeownerRequests") || "[]"
  ).filter((request) => request && request.status !== "closed");

  const activeHomeownerRequests = homeownerRequests.filter(
    (request) =>
      request.status !== "completed" &&
      request.status !== "cancelled" &&
      request.status !== "closed"
  );

  const completedHomeownerRequests = homeownerRequests.filter(
    (request) => request.status === "completed"
  );
  const conversationRegistry = JSON.parse(
    localStorage.getItem("meetro_conversation_registry") || "[]"
  );

  const unreadWorkflowMessages = conversationRegistry.filter((conversation) => {
    const conversationId =
      conversation?.conversationId || conversation?.id || "";

    return (
      conversationId &&
      localStorage.getItem(
        `meetro_conversation_read_${conversationId}`
      ) !== "true"
    );
  });

  const workflowSchedules = JSON.parse(
    localStorage.getItem("meetro_business_schedule") || "[]"
  );

  const activeEmergencyStatus =
    localStorage.getItem("emergencyDispatchStatus") || "";


  useEffect(() => {
    const handleLanguageChange = () => updateLanguage(getLanguage());

    const handleModeChange = () => {
      setActiveMode(localStorage.getItem("activeAccountMode") || "personal");
    };

    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("meetro-language-change", handleLanguageChange);
    window.addEventListener("accountModeChanged", handleModeChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      window.removeEventListener("meetro-language-change", handleLanguageChange);
      window.removeEventListener("accountModeChanged", handleModeChange);
    };
  }, []);

  function toggleLanguage() {
    const nextLanguage = language === "en" ? "es" : "en";
    setLanguage(nextLanguage);
    updateLanguage(nextLanguage);
  }

  function switchMode(mode) {
    if (mode === "business" && !hasBusinessAccess) {
      setPage("contractorProfile");
      return;
    }

    setActiveAccountMode(mode);
    setActiveMode(mode);

    if (mode === "business") {
      setPage("businessDashboard");
    }
  }

  if (isBusinessMode) {
    return (
      <div style={pageWrapper}>
        <TopBar language={language} toggleLanguage={toggleLanguage} />

        <div style={businessHero}>
          <p style={eyebrow}>{t("businessDashboard")}</p>

          <h1 style={businessTitle}>{t("businessGreeting")}! 👋</h1>

          <p style={businessText}>{t("businessDashboardText")}</p>

          <div style={statsGrid}>
            <StatCard title={t("newLeads")} value="8" note={t("last24h")} />
            <StatCard title={t("messages")} value="5" note={t("unread")} />
            <StatCard title={t("profileViews")} value="32" note={t("thisWeek")} />
            <StatCard title={t("profileScore")} value="92%" note={t("great")} />
          </div>
        </div>

        <div style={modeCard}>
          <h2 style={sectionTitle}>{businessName || t("yourBusiness")}</h2>
          <p style={mutedText}>{businessCategory || t("professionalUser")}</p>

          <button style={primaryButton} onClick={() => setPage("businessDashboard")}>
            {t("open")} {t("businessDashboard")}
          </button>

          <button style={secondaryButton} onClick={() => switchMode("personal")}>
            {t("personalMode")}
          </button>
        </div>

        <h2 style={sectionTitle}>{t("businessTools")}</h2>

        <div style={toolGrid}>
          <ToolCard
            icon="📥"
            title={t("leads")}
            text={t("openRequests")}
            onClick={() => setPage("businessLeads")}
          />

          <ToolCard
            icon="💬"
            title={t("messages")}
            text={t("customers")}
            onClick={() => setPage("messagesInbox")}
          />

          <ToolCard
            icon="▧"
            title={t("gallery")}
            text={t("portfolio")}
            onClick={() => {
              localStorage.setItem("projectDetailsReturnPage", "businessDashboard");
              localStorage.setItem("projectGalleryReturnPage", "projectDetails");
              setPage("projectDetails");
            }}
          />

          <ToolCard
            icon="👤"
            title={t("businessProfile")}
            text={t("manage")}
            onClick={() => setPage("contractorProfile")}
          />
        </div>

        <BottomNav setPage={setPage} currentPage="businessDashboard" />
      </div>
    );
  }

  return (
    <div style={pageWrapper}>
      <TopBar language={language} toggleLanguage={toggleLanguage} />

      <div style={heroCard}>
        <p style={eyebrow}>{t("home")}</p>

        <h1 style={heroTitle}>
          {t("homeGreeting")}, {userName}! 👋
        </h1>

        <p style={heroText}>{t("homeQuestion")}</p>

        <button style={mainButton} onClick={() => setPage("upload")}>
          + {t("postAProject")}
        </button>
      </div>

      {(() => {
        const emergencyStatus =
          localStorage.getItem("emergencyDispatchStatus") || "";

        const emergencyNeedsReview =
          localStorage.getItem("emergencyNeedsReview") === "true";

        const selectedEmergencyService =
          localStorage.getItem("selectedEmergencyService") || "";

        const shouldShowEmergencyCard =
          emergencyStatus &&
          !["cancelled", "closed"].includes(emergencyStatus) &&
          (emergencyStatus !== "completed" || emergencyNeedsReview);

        if (!shouldShowEmergencyCard) return null;

        const translatedEmergencyService =
          language === "es"
            ? selectedEmergencyService
                ?.replace("Emergency Plumbing", "Plomería de Emergencia")
                ?.replace("Emergency Electrical", "Electricista de Emergencia")
                ?.replace("Roof Leak Repair", "Reparación de Techo")
                ?.replace("Locksmith", "Cerrajero")
                ?.replace("Storm Prep Help", "Preparación para Tormentas")
                ?.replace("Other Emergency", "Otra Emergencia")
            : selectedEmergencyService;

        const translatedEmergencyStatus =
          language === "es"
            ? emergencyStatus
                ?.replace("pending", "pendiente")
                ?.replace("accepted", "aceptado")
                ?.replace("enroute", "en camino")
                ?.replace("arrived", "llegó")
                ?.replace("started", "iniciado")
                ?.replace("completed", "completado")
            : emergencyStatus;

        const isCompletedReview =
          emergencyStatus === "completed" && emergencyNeedsReview;

        return (
          <div style={activeEmergencyCard}>
            <div style={activeEmergencyTop}>
              <div style={activeEmergencyIcon}>
                {isCompletedReview ? "⭐" : "🚨"}
              </div>

              <div>
                <strong style={activeEmergencyTitle}>
                  {isCompletedReview
                    ? language === "es"
                      ? "Servicio completado"
                      : "Service completed"
                    : language === "es"
                    ? "Emergencia activa"
                    : "Active emergency"}
                </strong>

                <p style={activeEmergencyText}>
                  {translatedEmergencyService || t("emergencyHelp")} •{" "}
                  {translatedEmergencyStatus}
                </p>
              </div>
            </div>

            <button
              style={activeEmergencyButton}
              onClick={() =>
                isCompletedReview
                  ? setPage("emergencyComplete")
                  : setPage("emergencyStatus")
              }
            >
              {isCompletedReview
                ? language === "es"
                  ? "Calificar profesional"
                  : "Rate professional"
                : language === "es"
                ? "Ver progreso"
                : "View progress"}
            </button>
          </div>
        );
      })()}

      <section style={ecosystemSection}>
        <div style={compactHeaderRow}>
          <div>
            <p style={eyebrow}>
              {t("homeJobStatus")}
            </p>
            <h2 style={compactSectionTitle}>
              {t("homeTodaySummary")}
            </h2>
          </div>

          <button style={compactViewButton} onClick={() => setPage("messagesInbox")}>
            {t("homeViewAll")}
          </button>
        </div>

        <div style={compactSummaryGrid}>
          <div style={compactSummaryCard}>
            <span style={compactSummaryIcon}>🧰</span>
            <strong style={compactSummaryValue}>
              {activeHomeownerRequests.length || 0}
            </strong>
            <p style={compactSummaryLabel}>
              {t("homeJobs")}
            </p>
          </div>

          <div style={compactSummaryCard}>
            <span style={compactSummaryIcon}>📅</span>
            <strong style={compactSummaryValue}>
              {workflowSchedules.length || 0}
            </strong>
            <p style={compactSummaryLabel}>
              {t("homeSchedule")}
            </p>
          </div>

          <div style={compactSummaryCard}>
            <span style={compactSummaryIcon}>🚨</span>
            <strong style={compactSummaryValue}>
              {activeEmergencyStatus ? 1 : 0}
            </strong>
            <p style={compactSummaryLabel}>
              {t("homeUrgent")}
            </p>
          </div>

          <div style={compactSummaryCard}>
            <span style={compactSummaryIcon}>💬</span>
            <strong style={compactSummaryValue}>
              {unreadWorkflowMessages.length || 0}
            </strong>
            <p style={compactSummaryLabel}>
              {t("homeChat")}
            </p>
          </div>
        </div>
      </section>



        <div style={quickGrid}>
  <QuickCard
    icon="🔎"
    title={t("findContractors")}
    text={t("findContractorsText")}
    onClick={() => {
      localStorage.setItem(
        "activeDiscoverMode",
        "businessDirectory"
      );

      setPage("discover");
    }}
  />

        <QuickCard
          icon="📸"
          title={t("uploadProject")}
          text={t("uploadProjectText")}
          onClick={() => setPage("upload")}
        />

        <QuickCard
          icon="💬"
          title={t("messages")}
          text={t("projectReplies")}
          onClick={() => setPage("messagesInbox")}
          />

        <QuickCard
          icon="🤖"
          title={t("aiHelp")}
          text={t("assistantSubtitle")}
          onClick={() => setPage("assistant")}
        />

        <QuickCard
          icon="🚨"
title={
  language === "es"
    ? "Ayuda de Emergencia"
    : "Emergency Help"
}
text={
  language === "es"
    ? "Ayuda urgente para el hogar cuando necesitas apoyo rápido."
    : "Urgent home service help when you need fast support."
}
onClick={() => setPage("emergency")}
/>
      </div>

      <div style={sectionHeader}>
        <h2 style={sectionTitle}>{t("myActiveProjects")}</h2>

        <button style={textButton} onClick={() => setPage("myRequests")}>
          {t("viewAll")}
        </button>
      </div>

      {activeHomeownerRequests.length > 0 ? (
        <div style={projectList}>
          {activeHomeownerRequests.map((request) => (
            <ProjectCard
              key={request.requestId || request.id || request.createdAt}
              request={request}
              language={language}
              onClick={() => {
                localStorage.setItem(
                  "selectedHomeownerRequestId",
                  request.requestId || request.id
                );
                setPage("myRequests");
              }}
            />
          ))}
        </div>
      ) : (
        <div style={emptyCard}>
          <h3 style={emptyTitle}>{t("noActiveProjectYet")}</h3>
          <p style={mutedText}>{t("postFirstProjectText")}</p>

          <button style={primaryButton} onClick={() => setPage("upload")}>
            {t("postAProject")}
          </button>
        </div>
      )}

      {completedHomeownerRequests.length > 0 && (
        <>
          <div style={sectionHeader}>
            <h2 style={sectionTitle}>
              {language === "es"
                ? "Historial de Proyectos"
                : "Project History"}
            </h2>

            <button
              style={textButton}
              onClick={() => setPage("myRequests")}
            >
              {t("viewAll")}
            </button>
          </div>

          <div style={projectHistoryList}>
            {completedHomeownerRequests
              .slice()
              .reverse()
              .slice(0, 3)
              .map((request) => (
                <div
                  key={request.requestId || request.id}
                  style={historyCard}
                  onClick={() => {
                    localStorage.setItem(
                      "lastCompletedProject",
                      JSON.stringify(request)
                    );

                    localStorage.setItem(
                      "completedJobViewMode",
                      "homeowner"
                    );

                    setPage("completedJobDetails");
                  }}
                >
                  <div style={historyTop}>
                    <div>
                      <div style={historyBadge}>
                        ✅ {language === "es"
                          ? "Completado"
                          : "Completed"}
                      </div>

                      <h3 style={historyTitle}>
                        {request.title ||
                          request.category ||
                          "Home Project"}
                      </h3>

                      <p style={historyContractor}>
                        {request.selectedProfessional ||
                          request.acceptedQuote?.businessName ||
                          "Professional"}
                      </p>
                    </div>

                    <strong style={historyAmount}>
                      $
                      {request.revenue ||
                        request.acceptedQuote?.amount ||
                        request.quoteAmount ||
                        0}
                    </strong>
                  </div>

                  <div style={historyBottom}>
                    <span>
                      {request.reviewSubmitted
                        ? `⭐ ${t("reviewSubmitted")}`
                        : "⭐ Review Pending"}
                    </span>

                    <button
                      style={historyButton}
                      onClick={(e) => {
                        e.stopPropagation();

                        localStorage.setItem(
                          "selectedHomeownerRequestId",
                          request.requestId || request.id
                        );

                        setPage("myRequests");
                      }}
                    >
                      {language === "es"
                        ? "Ver Proyecto"
                        : "View Project"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      <h2 style={sectionTitle}>{t("recommendedNearYou")}</h2>

  <div style={proList}>

{JSON.parse(
  localStorage.getItem("meetroBusinesses") || "[]"
)
.filter(
  (business) =>
    business &&
    business.name &&
    business.status !== "closed"
)
.map((business) => (
  <ProCard
    key={business.id || business.name}
    name={business.name}

    category={
      business.category
        ? business.category
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : t("professionalUser")
    }

    location={
      business.location ||
      (language === "es"
        ? "Ubicación pendiente"
        : "Location pending")
    }

    onClick={() => {
      localStorage.setItem(
        "selectedContractor",
        JSON.stringify(business)
      );

      setPage("contractorDetails");
    }}
  />
))}

{JSON.parse(
  localStorage.getItem("meetroBusinesses") || "[]"
)
.filter(
  (business) =>
    business &&
    business.name &&
    business.status !== "closed"
).length === 0 && (

<div style={emptyCard}>
  <h3 style={emptyTitle}>
    {language === "es"
      ? "No hay negocios todavía"
      : "No businesses yet"}
  </h3>

  <p style={mutedText}>
    {language === "es"
      ? "Los negocios aparecerán aquí cuando creen su perfil."
      : "Businesses will appear here once profiles are created."}
  </p>
</div>

)}

</div>


      {hasBusinessAccess && (
        <div style={modeCard}>
          <h2 style={sectionTitle}>{t("businessMode")}</h2>

          <p style={mutedText}>{t("professionalAccountText")}</p>

          <button style={primaryButton} onClick={() => switchMode("business")}>
            {t("switchToBusinessMode")}
          </button>
        </div>
      )}

      <BottomNav setPage={setPage} currentPage="home" />
    </div>
  );
}

function TopBar({ language, toggleLanguage }) {
  return (
    <div style={topBar}>
      <div style={brandWrap}>
        <span style={brandMain}>Meetro</span>
        <span style={brandBadge}>Community</span>
      </div>

      <button style={languageButton} onClick={toggleLanguage}>
        🌐 {t("language")}{" "}
        <strong>{language === "en" ? t("english") : t("spanish")}</strong>
      </button>
    </div>
  );
}

function StatCard({ title, value, note }) {
  return (
    <div style={statCard}>
      <p style={statTitle}>{title}</p>
      <h2 style={statValue}>{value}</h2>
      <p style={statNote}>{note}</p>
    </div>
  );
}

function QuickCard({ icon, title, text, onClick }) {
  return (
    <button style={quickCard} onClick={onClick}>
      <div style={quickIcon}>{icon}</div>
      <h3 style={quickTitle}>{title}</h3>
      <p style={quickText}>{text}</p>
    </button>
  );
}

function ToolCard({ icon, title, text, onClick }) {
  return (
    <button style={toolCard} onClick={onClick}>
      <div style={toolIcon}>{icon}</div>
      <h3 style={toolTitle}>{title}</h3>
      <p style={toolText}>{text}</p>
    </button>
  );
}

function ProjectCard({ request, language, onClick }) {
  const status = request.status || "pending";

  const createdDate = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString(
        language === "es" ? "es-US" : "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      )
    : language === "es"
    ? "Fecha pendiente"
    : "Date pending";

  const statusLabel =
    language === "es"
      ? status
          .replace("pending", "Esperando cotizaciones")
          .replace("Awaiting Quotes", "Esperando cotizaciones")
          .replace("viewed", "Visto por profesionales")
          .replace("quoted", "Cotización recibida")
          .replace("messaged", "Mensaje recibido")
          .replace("accepted", "Profesional aceptado")
          .replace("scheduled", "Programado")
          .replace("active", "En progreso")
      : status
          .replace("pending", "Awaiting quotes")
          .replace("Awaiting Quotes", "Awaiting quotes")
          .replace("viewed", "Viewed by professionals")
          .replace("quoted", "Quote received")
          .replace("messaged", "Message received")
          .replace("accepted", "Professional accepted")
          .replace("scheduled", "Scheduled")
          .replace("active", "In progress");

  const viewsCount = Array.isArray(request.viewedByBusinesses)
    ? request.viewedByBusinesses.length
    : request.viewedByBusinesses || 0;

  const quotesCount = Array.isArray(request.quotesReceived)
    ? request.quotesReceived.length
    : request.quotesReceived || 0;

  const hasNewQuote = quotesCount > 0;

  return (
    <button style={projectCard} onClick={onClick}>
      <div style={projectTopRow}>
        <div style={{ flex: 1 }}>
          <div style={projectCategoryTag}>
            {request.category || (language === "es" ? "Proyecto" : "Project")}
          </div>

          <h3 style={projectTitle}>
            {request.title ||
              request.category ||
              (language === "es" ? "Proyecto del hogar" : "Home Project")}
          </h3>

          <p style={projectStatus}>{statusLabel}</p>
        </div>

        <span style={projectBadge}>
          <span style={projectBadgeDot}></span>
          {language === "es" ? "Activo" : "Active"}
        </span>
      </div>

      <p style={projectDescription}>
        {request.description ||
          (language === "es"
            ? "Solicitud enviada. Esperando actividad profesional."
            : "Request posted. Waiting for professional activity.")}
      </p>

      <div style={projectStats}>
        <div style={{ ...projectStatChip, ...projectStatViews }}>
          <span style={projectStatIcon}>👁️</span>
          <div>
            <strong style={projectStatNumber}>{viewsCount}</strong>
            <span style={projectStatLabel}>{language === "es" ? "Vistas" : "Views"}</span>
          </div>
        </div>

        <div style={{ ...projectStatChip, ...projectStatMessages }}>
          <span style={projectStatIcon}>💬</span>
          <div>
            <strong style={projectStatNumber}>{request.messagesCount || 0}</strong>
            <span style={projectStatLabel}>{language === "es" ? "Mensajes" : "Messages"}</span>
          </div>
        </div>

        <div
          style={{
            ...projectStatChip,
            ...projectStatQuotes,
            ...(hasNewQuote ? projectStatQuoteAlert : {}),
          }}
        >
          <span style={projectStatIcon}>💵</span>
          <div>
            <strong style={projectStatNumber}>{quotesCount}</strong>
            <span style={projectStatLabel}>
              {language === "es" ? "Cotizaciones" : "Quotes"}
            </span>
            {hasNewQuote && (
              <small style={projectQuoteAlertText}>
                {language === "es" ? "Nueva cotización" : "New quote"}
              </small>
            )}
          </div>
        </div>
      </div>

      <div style={projectProgressBar}>
        <div style={projectProgressFill}></div>
      </div>

      <div style={projectFooter}>
        <span style={projectFooterItem}>
          <span style={projectFooterIcon}>↗</span>
          {language === "es" ? "Seguimiento activo" : "Tracking active"}
        </span>

        <span style={projectFooterItem}>
          <span style={projectFooterIcon}>📅</span>
          <span>
            <strong>{language === "es" ? "Flujo iniciado" : "Workflow started"}</strong>
            <small style={projectFooterDate}>{createdDate}</small>
          </span>
        </span>
      </div>
    </button>
  );
}

function ProCard({ name, category, location, onClick }) {
  return (
    <button style={proCard} onClick={onClick}>
      <div style={proAvatar}>🏢</div>

      <div style={{ flex: 1 }}>
        <h3 style={proName}>{name}</h3>
        <p style={proMeta}>{category}</p>
        <p style={proMeta}>📍 {location}</p>
      </div>

      <span style={ratingBadge}>⭐ 4.9</span>
    </button>
  );
}

const pageWrapper = {
  background: "linear-gradient(to bottom, #f7f7fb 0%, #f2f3f8 100%)",
  minHeight: "100vh",
  padding: "24px 18px 130px",
  boxSizing: "border-box",
  color: "#111",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "22px",
  gap: "12px",
};

const brandWrap = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const brandMain = {
  fontSize: "22px",
  fontWeight: "900",
  color: "#5b3df5",
  letterSpacing: "-1px",
};

const brandBadge = {
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "1px",
  textTransform: "uppercase",
};

const languageButton = {
  border: "none",
  background: "white",
  color: "#111",
  padding: "11px 14px",
  borderRadius: "18px",
  fontWeight: "700",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  cursor: "pointer",
};

const heroCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #8b5cf6 100%)",
  color: "white",
  borderRadius: "28px",
  padding: "24px 20px",
  marginBottom: "14px",
  boxShadow: "0 16px 34px rgba(91,61,245,0.24)",
};

const businessHero = {
  background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
  color: "white",
  borderRadius: "32px",
  padding: "30px 24px",
  marginBottom: "22px",
  boxShadow: "0 18px 40px rgba(15,23,42,0.24)",
};

const eyebrow = {
  margin: 0,
  opacity: 0.9,
  fontWeight: "900",
};

const heroTitle = {
  margin: "8px 0",
  fontSize: "25px",
  lineHeight: 1.12,
};

const businessTitle = {
  margin: "12px 0",
  fontSize: "34px",
  lineHeight: 1.15,
  textAlign: "center",
};

const heroText = {
  margin: "0 0 16px",
  fontSize: "18px",
  lineHeight: 1.38,
  opacity: 0.95,
};

const businessText = {
  margin: "0 auto 22px",
  fontSize: "17px",
  lineHeight: 1.6,
  opacity: 0.95,
  textAlign: "center",
  maxWidth: "620px",
};

const mainButton = {
  border: "none",
  background: "white",
  color: "#5b3df5",
  padding: "15px 20px",
  borderRadius: "18px",
  fontWeight: "900",
  fontSize: "16px",
  cursor: "pointer",
};

 const activeEmergencyCard = {
  background: "linear-gradient(135deg, #fee2e2, #fff7ed)",
  border: "1px solid #fecaca",
  borderRadius: "22px",
  padding: "14px",
  marginBottom: "10px",
  boxShadow: "0 10px 24px rgba(239,68,68,0.1)",
};

const activeEmergencyTop = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  marginBottom: "10px",
};

const activeEmergencyIcon = {
  width: "44px",
  height: "44px",
  borderRadius: "16px",
  background: "#ef4444",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "21px",
};

const activeEmergencyTitle = {
  display: "block",
  fontSize: "17px",
  fontWeight: "900",
  color: "#991b1b",
};

const activeEmergencyText = {
  margin: "4px 0 0",
  color: "#7f1d1d",
  fontWeight: "700",
  fontSize: "16px",
};

const activeEmergencyButton = {
  width: "100%",
  padding: "13px",
  borderRadius: "16px",
  border: "none",
  background: "#ef4444",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

const quickGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "18px",
};

const quickCard = {
  border: "none",
  background: "white",
  borderRadius: "20px",
  padding: "14px",
  textAlign: "left",
  boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
  cursor: "pointer",
};

const quickIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  background: "#f3f0ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "21px",
  marginBottom: "9px",
};

const quickTitle = {
  margin: "0 0 4px",
  fontSize: "16px",
  color: "#111",
};

const quickText = {
  margin: 0,
  color: "#666",
  fontSize: "14px",
  lineHeight: 1.4,
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
};

const sectionTitle = {
  margin: "0 0 12px",
  fontSize: "24px",
  color: "#111",
};

const textButton = {
  border: "none",
  background: "transparent",
  color: "#5b3df5",
  fontWeight: "900",
  cursor: "pointer",
};

const emptyCard = {
  background: "white",
  borderRadius: "26px",
  padding: "24px",
  marginBottom: "24px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const emptyTitle = {
  margin: "0 0 8px",
  color: "#111",
};

const mutedText = {
  margin: "0 0 16px",
  color: "#666",
  lineHeight: 1.5,
};

const primaryButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  padding: "14px 18px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const secondaryButton = {
  border: "none",
  background: "#eee7ff",
  color: "#5b3df5",
  padding: "14px 18px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
  marginTop: "10px",
};

const projectList = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "16px",
};

const projectCard = {
  width: "100%",
  textAlign: "left",
  border: "1px solid rgba(124,58,237,.12)",
  background: "linear-gradient(135deg,#ffffff,#fcfbff)",
  borderRadius: "20px",
  padding: "16px",
  boxShadow: "0 8px 18px rgba(15,23,42,.04)",
  cursor: "pointer",
};

const projectTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "10px",
};

const projectTitle = {
  margin: "12px 0 4px",
  color: "#111827",
  fontSize: "17px",
  fontWeight: "950",
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
};

const projectStatus = {
  margin: 0,
  color: "#5b3df5",
  fontSize: "13px",
  fontWeight: "950",
};

const projectBadge = {
  background: "#ecfdf5",
  color: "#047857",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const projectBadgeDot = {
  width: "7px",
  height: "7px",
  borderRadius: "999px",
  background: "#10b981",
};

const projectCategoryTag = {
  display: "inline-flex",
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: "900",
  marginBottom: "8px",
  textTransform: "capitalize",
};

const projectDescription = {
  margin: "8px 0 0",
  color: "#4b5563",
  fontSize: "12px",
  lineHeight: 1.35,
  minHeight: "28px",
};

const projectStats = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "8px",
  marginTop: "12px",
  marginBottom: "8px",
};

const projectStatChip = {
  borderRadius: "14px",
  padding: "8px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  minHeight: "50px",
  boxShadow: "0 3px 10px rgba(91,61,245,0.03)",
};

const projectStatViews = {
  background: "linear-gradient(135deg, #faf7ff, #ffffff)",
  border: "1.5px solid #ddd6fe",
  color: "#5b3df5",
};

const projectStatMessages = {
  background: "linear-gradient(135deg, #f0f9ff, #ffffff)",
  border: "1.5px solid #bfdbfe",
  color: "#1d4ed8",
};

const projectStatQuotes = {
  background: "linear-gradient(135deg, #f0fdf4, #ffffff)",
  border: "1.5px solid #bbf7d0",
  color: "#047857",
};

const projectStatQuoteAlert = {
  background: "linear-gradient(135deg,#f5f3ff,#ffffff)",
  border: "2px solid #8b5cf6",
  color: "#5b3df5",
  boxShadow: "0 0 0 4px rgba(91,61,245,0.10), 0 0 30px rgba(91,61,245,0.35)",
};

const projectQuoteAlertText = {
  display: "block",
  marginTop: "4px",
  color: "#5b3df5",
  fontSize: "11px",
  fontWeight: "900",
};

const projectStatIcon = {
  width: "22px",
  height: "22px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(91,61,245,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  flexShrink: 0,
};

const projectStatNumber = {
  display: "block",
  fontSize: "12px",
  lineHeight: 1,
  fontWeight: "950",
};

const projectStatLabel = {
  display: "block",
  marginTop: "1px",
  fontSize: "9px",
  fontWeight: "800",
};

const projectProgressBar = {
  height: "5px",
  background: "#eef2ff",
  borderRadius: "999px",
  overflow: "hidden",
  marginBottom: "7px",
};

const projectProgressFill = {
  width: "22%",
  height: "100%",
  background: "linear-gradient(90deg, #5b3df5, #8b5cf6)",
  borderRadius: "999px",
};

const projectFooter = {
  borderTop: "1px solid #f3f4f6",
  paddingTop: "8px",
  color: "#4f46e5",
  fontWeight: "900",
  fontSize: "11px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "6px",
  flexWrap: "nowrap",
};

const projectFooterItem = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  whiteSpace: "nowrap",
};

const projectFooterIcon = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: "#f8f7ff",
  border: "1px solid #ede9fe",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  flexShrink: 0,
};

const projectFooterDate = {
  display: "block",
  marginTop: "2px",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "800",
};

const projectHistoryList = {
  display: "grid",
  gap: "14px",
  marginBottom: "26px",
};

const historyCard = {
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
  cursor: "pointer",
  display: "grid",
  gap: "14px",
};

const historyTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
};

const historyBadge = {
  display: "inline-flex",
  background: "#dcfce7",
  color: "#166534",
  borderRadius: "999px",
  padding: "6px 12px",
  fontWeight: "900",
  fontSize: "12px",
  marginBottom: "10px",
};

const historyTitle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: "900",
  color: "#111827",
};

const historyContractor = {
  margin: "6px 0 0",
  color: "#64748b",
  fontWeight: "700",
};

const historyAmount = {
  color: "#15803d",
  fontSize: "22px",
  fontWeight: "900",
};

const historyBottom = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  color: "#64748b",
  fontWeight: "800",
};

const historyButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  borderRadius: "14px",
  padding: "10px 14px",
  fontWeight: "900",
  cursor: "pointer",
};

const proList = {
  display: "grid",
  gap: "14px",
  marginBottom: "24px",
};

const proCard = {
  border: "none",
  background: "white",
  borderRadius: "24px",
  padding: "16px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const proAvatar = {
  width: "46px",
  height: "46px",
  borderRadius: "18px",
  background: "#f3f0ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const proName = {
  margin: "0 0 4px",
  fontSize: "17px",
  color: "#111",
};

const proMeta = {
  margin: 0,
  color: "#666",
  fontSize: "16px",
};

const ratingBadge = {
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "8px 10px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
};

const modeCard = {
  background: "white",
  borderRadius: "26px",
  padding: "22px",
  marginBottom: "24px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
  marginTop: "22px",
};

const statCard = {
  background: "rgba(255,255,255,0.12)",
  borderRadius: "22px",
  padding: "20px",
  textAlign: "center",
};

const statTitle = {
  margin: 0,
  color: "white",
  opacity: 0.92,
};

const statValue = {
  margin: "14px 0 6px",
  fontSize: "34px",
  color: "white",
};

const statNote = {
  margin: 0,
  color: "white",
  opacity: 0.78,
};

const ecosystemSection = {
  marginTop: "14px",
  marginBottom: "18px",
};

const sectionHeaderRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "14px",
};

const ecosystemGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const compactHeaderRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "8px",
};

const compactSectionTitle = {
  margin: "0",
  fontSize: "18px",
  fontWeight: "950",
  color: "#17132a",
};

const compactViewButton = {
  border: "none",
  borderRadius: "999px",
  padding: "9px 14px",
  background: "#efe7ff",
  color: "#6d28d9",
  fontSize: "12px",
  fontWeight: "900",
  cursor: "pointer",
};

const compactSummaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "8px",
};

const compactSummaryCard = {
  background: "rgba(255,255,255,0.92)",
  borderRadius: "14px",
  padding: "8px 6px",
  textAlign: "center",
  border: "1px solid rgba(124, 58, 237, 0.09)",
  boxShadow: "0 6px 16px rgba(91, 33, 182, 0.05)",
};

const compactSummaryIcon = {
  width: "26px",
  height: "26px",
  margin: "0 auto 5px",
  borderRadius: "10px",
  background: "#f1e8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
};

const compactSummaryValue = {
  display: "block",
  fontSize: "17px",
  fontWeight: "950",
  color: "#17132a",
  lineHeight: "1",
};

const compactSummaryLabel = {
  margin: "5px 0 0",
  fontSize: "11px",
  fontWeight: "800",
  color: "#6b6478",
};

const summaryCard = {
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  border: "1px solid rgba(124, 58, 237, 0.12)",
  boxShadow: "0 14px 34px rgba(91, 33, 182, 0.08)",
};

const summaryRow = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
};

const summaryIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "16px",
  background: "#f1e8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  flexShrink: 0,
};

const summaryTitle = {
  display: "block",
  fontSize: "15px",
  fontWeight: "900",
  color: "#17132a",
};

const summaryText = {
  margin: "4px 0 0",
  fontSize: "13px",
  lineHeight: "1.45",
  color: "#6b6478",
};

const summaryDivider = {
  height: "1px",
  background: "rgba(124, 58, 237, 0.1)",
  margin: "14px 0",
};

const summaryButton = {
  width: "100%",
  marginTop: "16px",
  border: "none",
  borderRadius: "16px",
  padding: "14px",
  background: "#6d4aff",
  color: "white",
  fontWeight: "900",
  fontSize: "14px",
  cursor: "pointer",
};

const ecosystemCard = {
  border: "1px solid rgba(124, 58, 237, 0.14)",
  background: "linear-gradient(180deg, #ffffff 0%, #faf7ff 100%)",
  borderRadius: "22px",
  padding: "16px",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 14px 34px rgba(91, 33, 182, 0.09)",
};

const ecosystemCardTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "12px",
};

const ecosystemIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "16px",
  background: "#f1e8ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const ecosystemBadge = {
  fontSize: "11px",
  fontWeight: "800",
  color: "#6d28d9",
  background: "#efe7ff",
  padding: "6px 9px",
  borderRadius: "999px",
};

const ecosystemTitle = {
  display: "block",
  fontSize: "15px",
  fontWeight: "900",
  color: "#17132a",
  marginBottom: "6px",
};

const ecosystemText = {
  margin: 0,
  fontSize: "12.5px",
  lineHeight: "1.45",
  color: "#6b6478",
};

const toolGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const toolCard = {
  border: "none",
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  textAlign: "center",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
  cursor: "pointer",
};

const toolIcon = {
  fontSize: "22px",
  marginBottom: "8px",
};

const toolTitle = {
  margin: "0 0 4px",
  color: "#111",
};

const toolText = {
  margin: 0,
  color: "#666",
};

export default Home;
