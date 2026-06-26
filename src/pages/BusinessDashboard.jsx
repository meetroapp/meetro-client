import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import MeetroIcon from "../components/MeetroIcon";
import { authFetch } from "../utils/authFetch";
import { getBusinessSchedule, getQuoteHistory } from "../utils/workCenter";
import { getStoredHomeownerRequests } from "../utils/workflowTimeline";
import { getLanguage, t } from "../utils/language";
import { openActiveEmergencyConversation } from "../utils/emergencyLifecycle";
import { getNotifications } from "../utils/notifications";
import {
  getStoredProfessionalMatchProfile,
  inferRequestCategory,
} from "../utils/professionalRequestMatching";
import { canProfessionalSeeLocalLead } from "../utils/localLeadVisibility";
import { formatDashboardScheduleItem } from "../utils/businessDashboardScheduleLabels";

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
  const professionalMatchProfile = {
    ...getStoredProfessionalMatchProfile(),
    businessCategory,
    category: businessCategory,
  };

  const liveHomeownerRequests = getStoredHomeownerRequests();

  const matchingDashboardLeads = liveHomeownerRequests
    .filter((request) => {
      const status = String(request.status || "open").toLowerCase();

      if (
        status.includes("accepted") ||
        status.includes("completed") ||
        status.includes("cancelled")
      ) {
        return false;
      }

      return canProfessionalSeeLocalLead(professionalMatchProfile, request);
    })
    .slice(0, 3);

  const formatLeadTitle = (request) =>
    request.title ||
    request.project_title ||
    request.category ||
    request.serviceCategory ||
    t("dashboardNewRequest");

  const formatLeadLocation = (request) =>
    request.location ||
    request.city ||
    request.address ||
    t("locationPending");

  const formatLeadCategory = (request) =>
    formatCategory(
      inferRequestCategory(request)
    );


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

  const dashboardEmergencyRecord = (() => {
    try {
      return JSON.parse(
        localStorage.getItem("activeEmergencyRecord") || "{}"
      );
    } catch {
      return {};
    }
  })();

  const dashboardEmergencyService =
    dashboardEmergencyRecord.service ||
    dashboardEmergencyRecord.title ||
    localStorage.getItem("selectedEmergencyService") ||
    "";

  const dashboardEmergencyCategory =
    localStorage.getItem("selectedEmergencyCategory") ||
    inferRequestCategory({ service: dashboardEmergencyService });

  const canDashboardSeeEmergency = canProfessionalSeeLocalLead(
    professionalMatchProfile,
    {
      ...dashboardEmergencyRecord,
      category: dashboardEmergencyCategory,
      service: dashboardEmergencyService,
      type: "emergency",
      isEmergency: true,
    }
  );

  const dispatchStatus =
    dashboardEmergencyRecord.status ||
    localStorage.getItem("emergencyDispatchStatus") || "";

  const hasActiveEmergency =
    canDashboardSeeEmergency &&
    dashboardEmergencyService &&
    ["pending", "accepted", "enroute", "arrived", "started", "completed"].includes(
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

  const quoteHistory = getQuoteHistory();

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

  const scheduleResponseAlertCount = getNotifications().filter(
    (notice) =>
      !notice.read &&
      (notice.targetRole === "professional" || notice.targetRole === "all") &&
      ["appointment_confirmed", "appointment_change_requested", "schedule_response"].includes(
        notice.type
      )
  ).length;

  function openWorkCenterSection(section, options = {}) {
    localStorage.setItem("meetroWorkCenterTab", section);
    localStorage.setItem("activeWorkCenterTab", section);

    if (options.filter) {
      localStorage.setItem("workCenterScheduleFilter", options.filter);
    } else if (section === "schedule") {
      localStorage.removeItem("workCenterScheduleFilter");
    }

    if (options.quoteStatusFilter) {
      localStorage.setItem("quoteStatusFilter", options.quoteStatusFilter);
    }

    setPage("contractorDashboard");
  }

  const unreadMessages = liveUnreadCount ||
    localStorage.getItem("mockStandardUnreadMessages") || "0";

  const dashboardText = {
    en: {
      dashboard: "Business Dashboard",
      subtitle: "Handle what matters first.",
      online: "Online",
      offline: "Offline",
      available: "Available now",
      notAvailable: "Not accepting jobs",
      messages: "Messages",
      unread: "Unread",
      todayJobs: "Today's Jobs",
      activeJobs: "Active Jobs",
      pendingQuotes: "Pending Quotes",
      scheduledToday: "Scheduled today",
      inProgress: "In progress",
      awaitingResponse: "Awaiting response",
      businessToolsDescription:
        "Profile, availability, service areas, portfolio, reviews, settings, and business support.",
      businessToolsTitle: "Business Tools",
      businessToolsSubtitle: "Run Your Business",
      businessToolsFeatures: ["Profile", "Portfolio", "Pricing", "Invoices", "Contracts", "Reports"],
      openBusinessTools: "Open Business Tools",
      nextUpToday: "Next Up Today",
      nextUpDescription: "Visits, jobs, and appointments that move the day forward.",
      viewFullSchedule: "View full schedule",
      customerLocation: "Customer location",
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
      subtitle: "Atiende primero lo más importante.",
      online: "En línea",
      offline: "Desconectado",
      available: "Disponible ahora",
      notAvailable: "No aceptando trabajos",
      messages: "Mensajes",
      unread: "Sin leer",
      todayJobs: "Trabajos de hoy",
      activeJobs: "Trabajos activos",
      pendingQuotes: "Cotizaciones pendientes",
      scheduledToday: "Programados hoy",
      inProgress: "En progreso",
      awaitingResponse: "Esperando respuesta",
      businessToolsDescription:
        "Perfil, disponibilidad, zonas de servicio, portafolio, reseñas, configuración y soporte del negocio.",
      businessToolsTitle: "Herramientas del Negocio",
      businessToolsSubtitle: "Administra tu negocio",
      businessToolsFeatures: ["Perfil", "Portafolio", "Precios", "Facturas", "Contratos", "Reportes"],
      openBusinessTools: "Abrir Herramientas",
      nextUpToday: "Próximo en agenda",
      nextUpDescription: "Visitas, trabajos y citas que mueven el día.",
      viewFullSchedule: "Ver agenda",
      customerLocation: "Ubicación del cliente",
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
    fr: {
      dashboard: "Tableau de bord",
      subtitle: "Traitez d’abord ce qui compte.",
      online: "En ligne",
      offline: "Hors ligne",
      available: "Disponible maintenant",
      notAvailable: "N’accepte pas de travaux",
      messages: "Messages",
      unread: "Non lus",
      todayJobs: "Travaux du jour",
      activeJobs: "Travaux actifs",
      pendingQuotes: "Devis en attente",
      scheduledToday: "Planifiés aujourd’hui",
      inProgress: "En cours",
      awaitingResponse: "En attente de réponse",
      businessToolsDescription:
        "Profil, disponibilité, zones de service, portfolio, avis, paramètres et support professionnel.",
      businessToolsTitle: "Outils professionnels",
      businessToolsSubtitle: "Gérer votre activité",
      businessToolsFeatures: ["Profil", "Portfolio", "Prix", "Factures", "Contrats", "Rapports"],
      openBusinessTools: "Ouvrir les outils",
      nextUpToday: "À venir aujourd’hui",
      nextUpDescription: "Visites, travaux et rendez-vous qui font avancer la journée.",
      viewFullSchedule: "Voir le calendrier",
      customerLocation: "Adresse du client",
      quickActions: "Actions rapides",
      allTools: "Tous les outils",
      workCenter: "Centre de travail",
      workSubtitle: "Travaux actifs, devis et dossiers.",
      openWorkCenter: "Ouvrir le centre de travail",
      newLeads: "Nouveaux prospects près de vous",
      viewAllLeads: "Voir tous les prospects",
      upgradeTitle: "Débloquez des prospects illimités",
      upgradeText:
        "Placement prioritaire, accès illimité aux prospects et visibilité vérifiée.",
      upgrade: "Passer à Meetro Pro",
    },
    "pt-BR": {
      dashboard: "Painel do negócio",
      subtitle: "Cuide primeiro do que importa.",
      online: "Online",
      offline: "Offline",
      available: "Disponível agora",
      notAvailable: "Não aceitando trabalhos",
      messages: "Mensagens",
      unread: "Não lidas",
      todayJobs: "Trabalhos de hoje",
      activeJobs: "Trabalhos ativos",
      pendingQuotes: "Orçamentos pendentes",
      scheduledToday: "Agendados hoje",
      inProgress: "Em andamento",
      awaitingResponse: "Aguardando resposta",
      businessToolsDescription:
        "Perfil, disponibilidade, áreas atendidas, portfólio, avaliações, configurações e suporte do negócio.",
      businessToolsTitle: "Ferramentas do negócio",
      businessToolsSubtitle: "Gerencie seu negócio",
      businessToolsFeatures: ["Perfil", "Portfólio", "Preços", "Faturas", "Contratos", "Relatórios"],
      openBusinessTools: "Abrir Ferramentas",
      nextUpToday: "Próximos de hoje",
      nextUpDescription: "Visitas, trabalhos e compromissos que movem o dia.",
      viewFullSchedule: "Ver agenda",
      customerLocation: "Local do cliente",
      quickActions: "Ações rápidas",
      allTools: "Todas as ferramentas",
      workCenter: "Centro de trabalho",
      workSubtitle: "Trabalhos ativos, orçamentos e registros.",
      openWorkCenter: "Abrir Centro de trabalho",
      newLeads: "Novas oportunidades perto de você",
      viewAllLeads: "Ver todas",
      upgradeTitle: "Desbloqueie oportunidades ilimitadas",
      upgradeText:
        "Prioridade, acesso ilimitado a oportunidades e visibilidade verificada.",
      upgrade: "Atualizar para Meetro Pro",
    },
  };
  const text = dashboardText[language] || dashboardText.en;

  return (
    <div className="app-page business-dashboard meetro-wide-page" style={pageWrapper}>
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
      <section style={dashboardHeaderSection}>
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
              <span style={profileInitial}>
                {String(businessName || "B").charAt(0).toUpperCase()}
              </span>
            )}
          </button>
        </div>

        {hasActiveEmergency && (
          <div
            style={emergencyChatBanner}
            role="button"
            tabIndex={0}
            onClick={() =>
              openActiveEmergencyConversation(setPage, "businessDashboard")
            }
          >
            <div>
              <strong style={emergencyChatTitle}>
                <span style={emergencyAlertMark}>!</span>
                {t("emergencyNeedsAttention")}
              </strong>
              <p style={emergencyChatText}>{dashboardEmergencyService}</p>
            </div>

            <button
              style={emergencyChatButton}
              onClick={(event) => {
                event.stopPropagation();
                openActiveEmergencyConversation(setPage, "businessDashboard")
              }}
            >
              {t("openEmergencyChat")}
            </button>
          </div>
        )}

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

          <button style={statusItem} onClick={() => setPage("messagesInbox")}>
            <span style={messageIcon} aria-hidden="true">
              <span style={messageIconLine} />
            </span>
            <div>
              <strong>{text.messages}</strong>
              <p>
                {unreadMessages} {text.unread}
              </p>
            </div>
          </button>
        </div>

        <section className="business-dashboard-hero-card" style={heroCard}>
          <div style={heroHeader}>
            <div>
              <h1 style={heroTitle}>{text.dashboard}</h1>

              <p style={heroSubtitle}>{text.subtitle}</p>
              <p style={businessNameLine}>{businessName}</p>
            </div>
          </div>

          <div style={todayFocusPanel}>
            <div style={todayFocusItem}>
              <span>{language === "es" ? "Enfoque de hoy" : "Today's Focus"}</span>
              <strong>
                {todayScheduleCount > 0
                  ? language === "es"
                    ? "Atender la agenda"
                    : "Work the schedule"
                  : language === "es"
                  ? "Revisar oportunidades"
                  : "Review opportunities"}
              </strong>
            </div>
            <div style={todayFocusItem}>
              <span>{language === "es" ? "Siguiente acción" : "Next Action"}</span>
              <strong>
                {pendingQuotesCount > 0
                  ? language === "es"
                    ? "Revisar cotizaciones"
                    : "Review pending quotes"
                  : language === "es"
                  ? "Abrir Work Center"
                  : "Open Work Center"}
              </strong>
            </div>
          </div>

          <div className="business-dashboard-glance-grid" style={glanceGrid}>
            <div
              style={
                scheduleResponseAlertCount > 0
                  ? pendingQuoteGlowWrap
                  : {}
              }
            >
              <GlanceItem
                title={text.todayJobs}
                value={todayScheduleCount}
                note={
                  scheduleResponseAlertCount > 0
                    ? language === "es"
                      ? "Respuesta de cita"
                      : "Appointment response"
                    : text.scheduledToday
                }
                onClick={() => openWorkCenterSection("schedule", { filter: "today" })}
              />
            </div>

            <GlanceItem
              title={text.activeJobs}
              value={activeProjectsCount}
              note={text.inProgress}
              onClick={() => openWorkCenterSection("active")}
            />

            <div
              style={
                quoteResponseAlertCount > 0
                  ? pendingQuoteGlowWrap
                  : {}
              }
            >
              <GlanceItem
                title={text.pendingQuotes}
                value={pendingQuotesCount}
                note={text.awaitingResponse}
                onClick={() =>
                  openWorkCenterSection("quotes", {
                    quoteStatusFilter: quoteResponseAlertCount > 0 ? "accepted" : undefined,
                  })
                }
              />
            </div>
          </div>
        </section>
      </section>

      <section style={sectionCard}>
        <div style={sectionTop}>
          <div>
            <h2 style={sectionTitle}>
              {text.nextUpToday}
            </h2>
            <p style={sectionSub}>{text.nextUpDescription}</p>
          </div>

          <button
            style={linkButton}
            onClick={() => {
              openWorkCenterSection("schedule", { filter: "today" });
            }}
          >
            {text.viewFullSchedule} →
          </button>
        </div>

        <div style={activeWorkList}>
          {businessSchedule.length > 0 ? (
            businessSchedule.slice(0, 4).map((item) => {
              const scheduleItem = formatDashboardScheduleItem(item, language);

              return (
                <WorkRow
                  key={item.id}
                  title={scheduleItem.title}
                  meta={
                    scheduleItem.meta ||
                    text.customerLocation
                  }
                  status={scheduleItem.status}
                  time={scheduleItem.time}
                  dateLabel={scheduleItem.dateLabel}
                  onClick={() => openWorkCenterSection("schedule", { filter: "today" })}
                />
              );
            })
          ) : (
            <div style={emptyScheduleCard}>
              <div>
                <strong>{t("businessNoAppointmentsToday")}</strong>
                <p>{t("businessNoAppointmentsTodayText")}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section style={leadsCard}>
        <div style={sectionTop}>
          <h2 style={sectionTitle}>{text.newLeads}</h2>

          <button
            style={linkButton}
            onClick={() => openWorkCenterSection("pending")}
          >
            {text.viewAllLeads} →
          </button>
        </div>

        {matchingDashboardLeads.length > 0 ? (
          matchingDashboardLeads.map((request) => (
            <LeadCard
              key={request.id || request.requestId || formatLeadTitle(request)}
              request={request}
              category={formatLeadCategory(request)}
              title={formatLeadTitle(request)}
              location={formatLeadLocation(request)}
              time={request.posted || request.date || t("dashboardRecentlyPosted")}
              setPage={setPage}
              openWorkCenterSection={openWorkCenterSection}
            />
          ))
        ) : (
          <div style={emptyLeadsState}>
            <strong>{t("dashboardNoNewLeads")}</strong>

            <p>{t("dashboardNoNewLeadsText")}</p>
          </div>
        )}
      </section>

      <section style={singleActionSection}>
        <button
          style={quoteActionButton}
          onClick={() => setPage("businessCommandCenter")}
        >
          <div style={quoteActionIcon}>
            <MeetroIcon name="businessTools" size={34} decorative />
          </div>

          <div style={quoteActionContent}>
            <span style={quoteActionEyebrow}>{text.businessToolsSubtitle}</span>

            <strong style={{ fontSize: "18px" }}>
              {text.businessToolsTitle}
            </strong>

            <span style={{ opacity: 0.82, lineHeight: "1.5" }}>
              {text.businessToolsDescription}
            </span>

            <div style={businessToolsFeatureList} aria-hidden="true">
              {text.businessToolsFeatures.map((feature) => (
                <span key={feature} style={businessToolsFeatureChip}>
                  {feature}
                </span>
              ))}
            </div>

            <span style={businessToolsCta}>
              {text.openBusinessTools} →
            </span>
          </div>
        </button>
      </section>

      <section style={upgradeCard}>
        <div>
          <span style={upgradeBadge}>Founding Pro</span>
          <h2 style={upgradeTitle}>{text.upgradeTitle}</h2>
          <p style={upgradeText}>{text.upgradeText}</p>
        </div>
      </section>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

function GlanceItem({ title, value, note, onClick }) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      style={{
        ...glanceItem,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <span style={glanceTitle}>{title}</span>
      <strong style={glanceValue}>{value}</strong>
      <p style={glanceNote}>{note}</p>
    </Component>
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

function WorkRow({ title, meta, status, time, dateLabel, onClick }) {
  return (
    <button style={workRow} onClick={onClick}>
      {time ? (
        <div style={scheduleTimeBadge}>
          <strong>{time}</strong>
          <span>{dateLabel}</span>
        </div>
      ) : (
        <div style={workThumb}>—</div>
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

function LeadCard({ request, category, title, location, time, openWorkCenterSection }) {
  return (
    <button
      onClick={() => {
        const lead = {
          ...request,
          id: request.id || request.requestId,
          requestId: request.requestId || request.id,
          title,
          category,
          location,
          posted: time,
          description:
            request.description ||
            request.project_description ||
            request.service ||
            "",
          urgency: request.urgency || "New",
          verified: request.verified ?? true,
        };

        // preserved selectedActiveProject
        localStorage.removeItem("lastCompletedProject");
        localStorage.removeItem("selectedHomeownerRequestId");
        localStorage.removeItem("selectedWorkCenterRequest");
        localStorage.removeItem("activeWorkCenterQuoteRequestId");

        localStorage.setItem("selectedPostId", lead.id || lead.requestId);

        localStorage.setItem("selectedQuoteRequest", JSON.stringify(lead));
        localStorage.setItem("projectDetailsReturnPage", "businessDashboard");
        localStorage.setItem("selectedWorkCenterRequest", JSON.stringify(lead));

        localStorage.setItem("leadWorkflowStage", "project_review");
        localStorage.setItem("leadWorkflowIntent", "review_contact_schedule");

        openWorkCenterSection("pending");
      }}
      style={leadCard}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
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
  borderRadius: "20px",
  padding: "1px",
  boxShadow: "0 0 18px rgba(251,191,36,0.22)",
  animation: "pendingQuotePulse 2.4s ease-in-out infinite",
};

const pageWrapper = {
  minHeight: "100dvh",
  background: "#f5f7fb",
  padding:
    "calc(env(safe-area-inset-top) + 64px) max(18px, env(safe-area-inset-right)) calc(68px + env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left))",
  boxSizing: "border-box",
  color: "#111827",
  maxWidth: "100%",
  overflowX: "hidden",
};

const dashboardHeaderSection = {
  background:
    "linear-gradient(180deg, #071225 0%, #0b1630 100%)",
  borderRadius: "32px",
  padding: "16px",
  marginBottom: "20px",
  boxShadow: "0 18px 45px rgba(15,23,42,0.18)",
  boxSizing: "border-box",
  overflow: "hidden",
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

const profileInitial = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#ffffff",
};

const statusStrip = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "24px",
  padding: "12px",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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

const messageIcon = {
  width: "28px",
  height: "28px",
  borderRadius: "9px",
  border: "1px solid rgba(255,255,255,0.32)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "900",
  flexShrink: 0,
};

const messageIconLine = {
  width: "12px",
  height: "8px",
  border: "1.5px solid currentColor",
  borderRadius: "4px",
};

const heroCard = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
  color: "white",
  borderRadius: "30px",
  padding: "20px",
  marginBottom: 0,
  boxShadow: "0 14px 34px rgba(0,0,0,0.16)",
  border: "1px solid rgba(255,255,255,0.12)",
  overflow: "hidden",
  isolation: "isolate",
};

const heroHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const heroTitle = {
  margin: "0 0 8px",
  fontSize: "clamp(25px, 5vw, 34px)",
  lineHeight: 1.12,
  fontWeight: "900",
  color: "#e8efff",
};

const heroSubtitle = {
  margin: "0 0 5px",
  color: "#aebee3",
  lineHeight: 1.5,
};

const businessNameLine = {
  margin: "0 0 18px",
  color: "#e2e8f0",
  fontSize: "13px",
  fontWeight: "800",
};

const todayFocusPanel = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
  gap: "10px",
  padding: "12px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.16)",
  marginBottom: "16px",
};

const todayFocusItem = {
  display: "grid",
  gap: "5px",
  minWidth: 0,
  color: "#ffffff",
};

const glanceGrid = {
  display: "grid",
  gap: "14px",
};

const glanceItem = {
  textAlign: "left",
  background: "#ffffff",
  border: "1px solid rgba(226,232,240,0.88)",
  borderRadius: "18px",
  padding: "14px",
  boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
  width: "100%",
  minWidth: 0,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const glanceTitle = {
  display: "block",
  fontSize: "13px",
  color: "#475569",
  fontWeight: "800",
};

const glanceValue = {
  display: "block",
  fontSize: "28px",
  color: "#111827",
  marginTop: "6px",
};

const glanceNote = {
  margin: "5px 0 0",
  color: "#475569",
  fontSize: "12px",
};

const singleActionSection = {
  marginTop: 0,
  marginBottom: "20px",
};

const quoteActionButton = {
  width: "100%",
  border: "1px solid rgba(124,92,255,0.42)",
  background:
    "linear-gradient(135deg, #ffffff 0%, #f8f7ff 44%, #eef2ff 100%)",
  borderRadius: "26px",
  padding: "20px",
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-start",
  gap: "16px",
  cursor: "pointer",
  color: "#111827",
  boxShadow:
    "0 18px 42px rgba(79,70,229,0.18), 0 1px 0 rgba(255,255,255,0.92) inset",
  textAlign: "left",
  boxSizing: "border-box",
  minWidth: 0,
};

const quoteActionIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "20px",
  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
  flexShrink: 0,
  boxShadow: "0 14px 26px rgba(79,70,229,0.28)",
};


const quoteActionContent = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  textAlign: "left",
  minWidth: 0,
  flex: 1,
};

const quoteActionEyebrow = {
  color: "#4f46e5",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const businessToolsFeatureList = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "2px",
  maxWidth: "100%",
};

const businessToolsFeatureChip = {
  border: "1px solid rgba(79,70,229,0.16)",
  background: "rgba(255,255,255,0.72)",
  color: "#4338ca",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "11px",
  fontWeight: "900",
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const businessToolsCta = {
  marginTop: "4px",
  color: "#312e81",
  fontSize: "14px",
  fontWeight: "950",
};


const sectionCard = {
  background: "white",
  borderRadius: "26px",
  padding: "20px",
  marginBottom: "18px",
  border: "1px solid rgba(203,213,225,0.95)",
  boxShadow: "0 18px 42px rgba(15,23,42,0.10)",
};

const sectionTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
  minWidth: 0,
  marginBottom: "14px",
};

const sectionTitle = {
  margin: 0,
  fontSize: "22px",
  fontWeight: "950",
  color: "#0f172a",
  opacity: 1,
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
  background: "linear-gradient(135deg,#ffffff,#fbfdff)",
  borderRadius: "20px",
  padding: "14px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  textAlign: "left",
  cursor: "pointer",
};

const emergencyChatBanner = {
  display: "grid",
  gap: "14px",
  marginBottom: "18px",
  padding: "18px",
  borderRadius: "24px",
  background: "linear-gradient(135deg, #991b1b, #ef4444)",
  color: "#ffffff",
  boxShadow: "0 18px 38px rgba(220,38,38,0.25)",
  cursor: "pointer",
};

const emergencyChatTitle = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  fontSize: "19px",
  fontWeight: "900",
};

const emergencyAlertMark = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  border: "2px solid rgba(255,255,255,0.9)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const emergencyChatText = {
  margin: "5px 0 0",
  opacity: 0.9,
  fontWeight: "700",
};

const emergencyChatButton = {
  minHeight: "48px",
  border: "none",
  borderRadius: "16px",
  background: "#ffffff",
  color: "#991b1b",
  fontWeight: "900",
  cursor: "pointer",
};

const workThumb = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  color: "#64748b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
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
  flexShrink: 0,
};

const chevron = {
  fontSize: "24px",
  color: "#475569",
};

const emptyLeadsState = {
  padding: "18px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  color: "#1f2937",
  fontSize: "15px",
  fontWeight: "800",
  lineHeight: 1.5,
};

const leadsCard = {
  background: "white",
  borderRadius: "26px",
  padding: "20px",
  marginBottom: "16px",
  border: "1px solid rgba(203,213,225,0.95)",
  boxShadow: "0 18px 42px rgba(15,23,42,0.10)",
};

const leadCard = {
  width: "100%",
  border: "1px solid #eef2f7",
  background: "linear-gradient(135deg,#ffffff,#fbfdff)",
  borderRadius: "20px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
  padding: "14px",
  marginTop: "10px",
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

export default BusinessDashboard;
