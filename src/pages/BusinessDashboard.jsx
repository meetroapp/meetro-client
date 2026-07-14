import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import MeetroIcon from "../components/MeetroIcon";
import { authFetch } from "../utils/authFetch";
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
import {
  getConversationMetrics,
  getProfessionalWorkMetrics,
} from "../utils/dashboardMetrics";
import { setBusinessAvailability } from "../utils/businessAvailability";
import {
  buildBusinessProfilePayloadFromCanonical,
  getConfirmedBusinessProfile,
} from "../utils/businessProfilePersistence";

function BusinessDashboard({ setPage }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, updateLanguage] = useState(getLanguage());
  const [liveUnreadCount, setLiveUnreadCount] = useState(
    getConversationMetrics({ role: "business" }).unreadConversationCount
  );

  const [availableNow, setAvailableNow] = useState(false);

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
  const professionalMetrics = getProfessionalWorkMetrics({
    homeownerRequests: liveHomeownerRequests,
    professional: professionalMatchProfile,
  });

  const matchingDashboardLeads = professionalMetrics.newLeads.slice(0, 3);

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
    const syncUnreadMessages = () => {
      setLiveUnreadCount(
        getConversationMetrics({ role: "business" }).unreadConversationCount
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
      const result = await authFetch(
        "/my-contractor-profile",
        { cache: "no-store" },
        setPage
      );

      if (result?.data?.profile) {
        const backendProfile = result.data.profile;

        setProfile(backendProfile);
        setAvailableNow(backendProfile.available_now === true);
        setBusinessAvailability(backendProfile.available_now === true);

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

  async function updateBusinessAvailability(nextValue) {
    if (!profile?.id) return;
    const result = await authFetch(
      `/contractor-profiles/${profile.id}`,
      {
        method: "PUT",
        body: JSON.stringify(
          buildBusinessProfilePayloadFromCanonical(profile, {
            available_now: nextValue,
          })
        ),
      },
      setPage
    );
    const confirmedProfile = getConfirmedBusinessProfile(result);
    if (!confirmedProfile) return;
    setProfile(confirmedProfile);
    setAvailableNow(confirmedProfile.available_now === true);
    setBusinessAvailability(confirmedProfile.available_now === true);
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

  const businessSchedule = professionalMetrics.scheduleItems;
  const todayScheduleCount = professionalMetrics.scheduledJobsCount;

  const homeownerRequests =
    getStoredHomeownerRequests();

  const activeProjectsCount = professionalMetrics.activeWorkCount;
  const pendingQuotesCount = professionalMetrics.pendingQuoteCount;
  const quoteResponseAlertCount = professionalMetrics.quoteResponseAlertCount;

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

  function openRelationshipConversation(record = {}, returnSection = "") {
    const conversationId =
      record.conversationId ||
      record.activeConversationId ||
      record.projectConversationId ||
      record.requestId ||
      record.projectId ||
      record.id ||
      "";

    if (!conversationId) return false;

    const requestId = record.requestId || record.projectId || record.id || conversationId;
    const participantName =
      record.customerName ||
      record.homeownerName ||
      record.customer ||
      record.username ||
      record.name ||
      t("customer");
    const projectTitle =
      record.projectTitle ||
      record.requestTitle ||
      record.title ||
      record.service ||
      record.category ||
      t("project");

    localStorage.setItem("selectedHomeownerRequestId", String(requestId));
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(record));
    localStorage.setItem("activeConversationId", String(conversationId));
    localStorage.setItem("activeConversationName", participantName);
    localStorage.setItem("meetroConversationType", "standard");
    localStorage.setItem("conversationReturnPage", "businessDashboard");
    localStorage.setItem("returnPage", "businessDashboard");
    if (returnSection) {
      localStorage.setItem("conversationReturnSection", returnSection);
    }
    localStorage.setItem(
      "selectedConversation",
      JSON.stringify({
        id: conversationId,
        type: "work",
        category: "work",
        participantName,
        homeownerName: participantName,
        businessName,
        projectTitle,
        requestId,
      })
    );
    setPage("conversationThread");
    return true;
  }

  function openFirstScheduledConversation() {
    const item = businessSchedule.find(
      (scheduleItem) =>
        scheduleItem?.conversationId ||
        scheduleItem?.activeConversationId ||
        scheduleItem?.projectConversationId
    );

    if (item && openRelationshipConversation(item, "schedule")) return;

    openWorkCenterSection("schedule", { filter: "today" });
  }

  function openFirstActiveProjectConversation() {
    const project = homeownerRequests.find((item) =>
      ["accepted", "scheduled", "active"].includes(String(item.status || "").toLowerCase())
    );

    if (project && openRelationshipConversation(project, "active")) return;

    openWorkCenterSection("active");
  }

  const unreadMessages = liveUnreadCount;

  const dashboardText = {
    en: {
      dashboard: "Business Dashboard",
      subtitle: "Handle what matters first.",
      online: "Online",
      offline: "Offline",
      available: "Available now",
      notAvailable: "Not accepting jobs",
      messages: "Communication",
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
      openBusinessTools: "Review Business Tools",
      nextUpToday: "Next Up Today",
      nextUpDescription: "Visits, jobs, and appointments that move the day forward.",
      viewFullSchedule: "Review Schedule",
      customerLocation: "Customer location",
      quickActions: "Quick Actions",
      allTools: "All tools",
      todayFocus: "Today's Focus",
      workTheSchedule: "Work the schedule",
      reviewOpportunities: "Review opportunities",
      nextAction: "Next Action",
      reviewPendingQuotes: "Review pending quotes",
      continueWork: "Continue Work",
      quickAccessTitle: "Quick Access",
      quickAccessHiring: "Hiring",
      quickAccessHiringNote: "Find & hire help",
      quickAccessQuoteBuilder: "Quote Builder",
      quickAccessQuoteBuilderNote: "Prepare quotes",
      quickAccessInvoiceBuilder: "Invoice Builder",
      quickAccessInvoiceBuilderNote: "Prepare invoices",
      quickAccessSchedule: "Schedule",
      quickAccessScheduleNote: "Review visits",
      quickAccessMessages: "Communication",
      quickAccessMessagesNote: "Customer conversations",
      quickAccessCustomers: "Customers",
      quickAccessCustomersNote: "Relationship list",
      quickAccessBusinessProfileNote: "Readiness and public presence",
      respondToMessages: "Respond to conversations",
      reviewTodayVisit: "Review today's visit",
      reviewBusinessReadiness: "Review business readiness",
      openNextAction: "Open next action",
      workCenter: "Work Center",
      workSubtitle: "Active jobs, quotes, and work records.",
      openWorkCenter: "Continue Work",
      newLeads: "New Leads Near You",
      viewAllLeads: "Review leads",
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
      messages: "Comunicación",
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
      businessToolsSubtitle: "Revisa tu negocio",
      businessToolsFeatures: ["Perfil", "Portafolio", "Precios", "Facturas", "Contratos", "Reportes"],
      openBusinessTools: "Revisar herramientas",
      nextUpToday: "Próximo en agenda",
      nextUpDescription: "Visitas, trabajos y citas que mueven el día.",
      viewFullSchedule: "Revisar agenda",
      customerLocation: "Ubicación del cliente",
      quickActions: "Acciones Rápidas",
      allTools: "Todas",
      todayFocus: "Enfoque de hoy",
      workTheSchedule: "Atender la agenda",
      reviewOpportunities: "Revisar oportunidades",
      nextAction: "Siguiente acción",
      reviewPendingQuotes: "Revisar cotizaciones",
      continueWork: "Continuar trabajo",
      quickAccessTitle: "Acceso rápido",
      quickAccessHiring: "Contratación",
      quickAccessHiringNote: "Encuentra ayuda",
      quickAccessQuoteBuilder: "Cotizaciones",
      quickAccessQuoteBuilderNote: "Preparar cotizaciones",
      quickAccessInvoiceBuilder: "Facturas",
      quickAccessInvoiceBuilderNote: "Preparar facturas",
      quickAccessSchedule: "Agenda",
      quickAccessScheduleNote: "Revisar visitas",
      quickAccessMessages: "Comunicación",
      quickAccessMessagesNote: "Conversaciones con clientes",
      quickAccessCustomers: "Clientes",
      quickAccessCustomersNote: "Lista de relaciones",
      quickAccessBusinessProfileNote: "Preparación y presencia pública",
      respondToMessages: "Responder conversaciones",
      reviewTodayVisit: "Revisar visita de hoy",
      reviewBusinessReadiness: "Revisar preparación del negocio",
      openNextAction: "Abrir siguiente acción",
      workCenter: "Centro de Trabajo",
      workSubtitle: "Trabajos activos, cotizaciones e historial.",
      openWorkCenter: "Continuar trabajo",
      newLeads: "Nuevas Oportunidades Cerca",
      viewAllLeads: "Revisar oportunidades",
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
      messages: "Communication",
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
      businessToolsSubtitle: "Examiner votre activité",
      businessToolsFeatures: ["Profil", "Portfolio", "Prix", "Factures", "Contrats", "Rapports"],
      openBusinessTools: "Examiner les outils",
      nextUpToday: "À venir aujourd’hui",
      nextUpDescription: "Visites, travaux et rendez-vous qui font avancer la journée.",
      viewFullSchedule: "Examiner le calendrier",
      customerLocation: "Adresse du client",
      quickActions: "Actions rapides",
      allTools: "Tous les outils",
      todayFocus: "Priorité du jour",
      workTheSchedule: "Traiter le calendrier",
      reviewOpportunities: "Examiner les prospects",
      nextAction: "Prochaine action",
      reviewPendingQuotes: "Examiner les devis",
      continueWork: "Continuer le travail",
      quickAccessTitle: "Accès rapide",
      quickAccessHiring: "Recrutement",
      quickAccessHiringNote: "Trouver de l’aide",
      quickAccessQuoteBuilder: "Créateur de devis",
      quickAccessQuoteBuilderNote: "Préparer des devis",
      quickAccessInvoiceBuilder: "Créateur de factures",
      quickAccessInvoiceBuilderNote: "Préparer des factures",
      quickAccessSchedule: "Calendrier",
      quickAccessScheduleNote: "Examiner les visites",
      quickAccessMessages: "Communication",
      quickAccessMessagesNote: "Conversations client",
      quickAccessCustomers: "Clients",
      quickAccessCustomersNote: "Liste des relations",
      quickAccessBusinessProfileNote: "Préparation et présence publique",
      respondToMessages: "Répondre aux conversations",
      reviewTodayVisit: "Revoir la visite du jour",
      reviewBusinessReadiness: "Revoir la préparation de l’activité",
      openNextAction: "Ouvrir la prochaine action",
      workCenter: "Centre de travail",
      workSubtitle: "Travaux actifs, devis et dossiers.",
      openWorkCenter: "Continuer le travail",
      newLeads: "Nouveaux prospects près de vous",
      viewAllLeads: "Examiner les prospects",
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
      messages: "Comunicação",
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
      businessToolsSubtitle: "Revise seu negócio",
      businessToolsFeatures: ["Perfil", "Portfólio", "Preços", "Faturas", "Contratos", "Relatórios"],
      openBusinessTools: "Revisar ferramentas",
      nextUpToday: "Próximos de hoje",
      nextUpDescription: "Visitas, trabalhos e compromissos que movem o dia.",
      viewFullSchedule: "Revisar agenda",
      customerLocation: "Local do cliente",
      quickActions: "Ações rápidas",
      allTools: "Todas as ferramentas",
      todayFocus: "Foco de hoje",
      workTheSchedule: "Cuidar da agenda",
      reviewOpportunities: "Revisar oportunidades",
      nextAction: "Próxima ação",
      reviewPendingQuotes: "Revisar orçamentos",
      continueWork: "Continuar trabalho",
      quickAccessTitle: "Acesso rápido",
      quickAccessHiring: "Contratação",
      quickAccessHiringNote: "Encontre ajuda",
      quickAccessQuoteBuilder: "Criador de orçamentos",
      quickAccessQuoteBuilderNote: "Preparar orçamentos",
      quickAccessInvoiceBuilder: "Criador de faturas",
      quickAccessInvoiceBuilderNote: "Preparar faturas",
      quickAccessSchedule: "Agenda",
      quickAccessScheduleNote: "Revisar visitas",
      quickAccessMessages: "Comunicação",
      quickAccessMessagesNote: "Conversas com clientes",
      quickAccessCustomers: "Clientes",
      quickAccessCustomersNote: "Lista de relações",
      quickAccessBusinessProfileNote: "Prontidão e presença pública",
      respondToMessages: "Responder conversas",
      reviewTodayVisit: "Revisar visita de hoje",
      reviewBusinessReadiness: "Revisar prontidão do negócio",
      openNextAction: "Abrir próxima ação",
      workCenter: "Centro de trabalho",
      workSubtitle: "Trabalhos ativos, orçamentos e registros.",
      openWorkCenter: "Continuar trabalho",
      newLeads: "Novas oportunidades perto de você",
      viewAllLeads: "Revisar oportunidades",
      upgradeTitle: "Desbloqueie oportunidades ilimitadas",
      upgradeText:
        "Prioridade, acesso ilimitado a oportunidades e visibilidade verificada.",
      upgrade: "Atualizar para Meetro Pro",
    },
  };
  const text = dashboardText[language] || dashboardText.en;
  const openBusinessProfile = () => {
    localStorage.setItem("contractorProfileReturnPage", "businessDashboard");
    setPage("contractorProfile");
  };
  const dashboardNextAction =
    unreadMessages > 0
      ? {
          label: text.respondToMessages,
          note: `${unreadMessages} ${text.unread}`,
          onClick: () => setPage("messagesInbox"),
        }
      : pendingQuotesCount > 0
      ? {
          label: text.reviewPendingQuotes,
          note: text.awaitingResponse,
          onClick: () =>
            openWorkCenterSection("quotes", {
              quoteStatusFilter:
                quoteResponseAlertCount > 0 ? "accepted" : undefined,
            }),
        }
      : todayScheduleCount > 0
      ? {
          label: text.reviewTodayVisit,
          note: text.scheduledToday,
          onClick: openFirstScheduledConversation,
        }
      : activeProjectsCount > 0
      ? {
          label: text.continueWork,
          note: text.inProgress,
          onClick: openFirstActiveProjectConversation,
        }
      : {
          label: text.reviewBusinessReadiness,
          note: availableNow ? text.available : text.notAvailable,
          onClick: openBusinessProfile,
        };
  const dashboardQuickAccessItems = [
    {
      key: "schedule",
      icon: "schedule",
      label: text.quickAccessSchedule,
      note: text.quickAccessScheduleNote,
      tone: "#0284c7",
      toneBg: "rgba(2,132,199,0.13)",
      onClick: () => openWorkCenterSection("schedule", { filter: "today" }),
    },
    {
      key: "messages",
      icon: "messages",
      label: text.quickAccessMessages,
      note: text.quickAccessMessagesNote,
      tone: "#1f4d34",
      toneBg: "rgba(31,77,52,0.12)",
      onClick: () => setPage("messagesInbox"),
    },
    {
      key: "hiring",
      icon: "hiringCenter",
      label: text.quickAccessHiring,
      note: text.quickAccessHiringNote,
      tone: "#1f4d34",
      toneBg: "rgba(31,77,52,0.12)",
      onClick: () => setPage("hiringCenter"),
    },
    {
      key: "quote-builder",
      icon: "quickQuote",
      label: text.quickAccessQuoteBuilder,
      note: text.quickAccessQuoteBuilderNote,
      tone: "#d97706",
      toneBg: "rgba(217,119,6,0.13)",
      onClick: () => setPage("quoteBuilder"),
    },
    {
      key: "invoice-builder",
      icon: "quickInvoice",
      label: text.quickAccessInvoiceBuilder,
      note: text.quickAccessInvoiceBuilderNote,
      tone: "#16a34a",
      toneBg: "rgba(22,163,74,0.13)",
      onClick: () => setPage("invoiceBuilder"),
    },
    {
      key: "business-profile",
      icon: "businessProfile",
      label: t("businessProfile", language),
      note: text.quickAccessBusinessProfileNote,
      tone: "#14351f",
      toneBg: "rgba(31,77,52,0.13)",
      onClick: openBusinessProfile,
    },
  ];

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

          .business-dashboard-quick-access {
            display: none;
          }

          .business-dashboard-community-entry {
            display: block;
          }

          .business-dashboard-quick-access-item:hover {
            background: rgba(31,77,52,0.06) !important;
          }

          .business-dashboard-quick-access-item:focus-visible {
            outline: 3px solid rgba(31,77,52,0.28);
            outline-offset: 2px;
          }

          @media (min-width: 1100px) {
            #root[data-app-layout="desktop"] .app-page.business-dashboard.meetro-wide-page {
              width: min(calc(100vw - var(--meetro-sidebar-width)), 1228px) !important;
              max-width: min(calc(100vw - var(--meetro-sidebar-width)), 1228px) !important;
              margin-left: var(--meetro-sidebar-width) !important;
              margin-right: auto !important;
              padding-top: clamp(24px, 2.8vw, 40px) !important;
              padding-left: clamp(24px, 3vw, 48px) !important;
              padding-right: clamp(24px, 3vw, 48px) !important;
            }

            .business-dashboard-content-lane {
              display: block !important;
              width: 100%;
              max-width: 1180px;
              margin: 0;
            }

            .business-dashboard-header-section {
              padding: 18px !important;
              margin-bottom: 18px !important;
              border-radius: 28px !important;
            }

            .business-dashboard-hero-card {
              padding: 18px !important;
              border-radius: 24px !important;
            }

            .business-dashboard-hero-card h1 {
              font-size: clamp(24px, 2.1vw, 30px) !important;
            }

            .business-dashboard-status-strip {
              margin-bottom: 14px !important;
            }

            .business-dashboard-today-focus {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              padding: 10px !important;
              margin-bottom: 10px !important;
            }

            .business-dashboard-hero-context,
            .business-dashboard-primary-action {
              display: flex !important;
            }

            .business-dashboard-quick-access {
              display: grid;
            }

            .business-dashboard-community-entry {
              display: none !important;
            }

            .business-dashboard-quick-access-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            }

            .business-dashboard-glance-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 10px !important;
            }

            .business-dashboard-main-grid {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr);
              gap: 18px;
              align-items: start;
            }

            .business-dashboard-primary-column,
            .business-dashboard-secondary-column {
              display: grid !important;
              gap: 18px;
              min-width: 0;
            }

            .business-dashboard-section-card,
            .business-dashboard-leads-card {
              margin-bottom: 0 !important;
              padding: 18px !important;
              border-radius: 22px !important;
            }

            .business-dashboard-tools-row {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr);
              gap: 18px;
              align-items: stretch;
              margin-top: 18px;
            }

            .business-dashboard-tools-section {
              margin-bottom: 0 !important;
            }

            .business-dashboard-tools-section > button,
            .business-dashboard-upgrade-card {
              min-height: 100%;
            }

            @media (min-width: 1100px) {
              .business-dashboard-quick-access-grid {
                grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
              }

              .business-dashboard-glance-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
              }

              .business-dashboard-main-grid {
                grid-template-columns: minmax(0, 1.08fr) minmax(300px, 0.92fr);
              }

              .business-dashboard-tools-row {
                grid-template-columns: minmax(0, 1.08fr) minmax(280px, 0.92fr);
              }
            }
          }
        `}
      </style>
      <div className="business-dashboard-content-lane" style={dashboardContentLane}>
        <section className="business-dashboard-header-section" style={dashboardHeaderSection}>
          <div style={topBar}>
            <div style={brandWrap}>
              <span style={brandMain}>Meetro</span>
              <span style={brandBadge}>Business</span>
            </div>

            <button
              onClick={() => {
                openBusinessProfile();
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

          <div className="business-dashboard-status-strip" style={statusStrip}>
            <button
              style={statusItem}
              onClick={() => updateBusinessAvailability(!availableNow)}
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

              <div
                className="business-dashboard-hero-context"
                style={heroDesktopContext}
                aria-label={text.dashboard}
              >
                <span style={heroContextPill}>{formatCategory(businessCategory)}</span>
                <span style={heroAvailabilityPill(availableNow)}>
                  {availableNow ? text.available : text.notAvailable}
                </span>
              </div>
            </div>

            <div className="business-dashboard-today-focus" style={todayFocusPanel}>
              <div style={todayFocusItem}>
                <span>{text.todayFocus}</span>
                <strong>
                  {todayScheduleCount > 0
                    ? text.workTheSchedule
                    : text.reviewOpportunities}
                </strong>
              </div>
              <div style={todayFocusItem}>
                <span>{text.nextAction}</span>
                <strong>
                  {pendingQuotesCount > 0
                    ? text.reviewPendingQuotes
                    : text.continueWork}
                </strong>
              </div>
            </div>

            <div
              className="business-dashboard-primary-action"
              style={primaryActionPanel}
            >
              <div style={primaryActionCopy}>
                <span style={primaryActionEyebrow}>{text.nextAction}</span>
                <strong style={primaryActionTitle}>{dashboardNextAction.label}</strong>
                <p style={primaryActionNote}>{dashboardNextAction.note}</p>
              </div>

              <button
                type="button"
                style={primaryActionButton}
                onClick={dashboardNextAction.onClick}
              >
                {text.openNextAction} →
              </button>
            </div>

            <section
              className="business-dashboard-quick-access"
              style={quickAccessPanel}
              aria-label={text.quickAccessTitle}
            >
              <div style={quickAccessHeader}>
                <span>{text.quickAccessTitle}</span>
              </div>

              <div className="business-dashboard-quick-access-grid" style={quickAccessGrid}>
                {dashboardQuickAccessItems.map((item) => (
                  <DashboardQuickAccessShortcut key={item.key} {...item} />
                ))}
              </div>
            </section>

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
                  onClick={openFirstScheduledConversation}
                />
              </div>

              <GlanceItem
                title={text.activeJobs}
                value={activeProjectsCount}
                note={text.inProgress}
                onClick={openFirstActiveProjectConversation}
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

        <section
          className="business-dashboard-community-entry"
          style={communityEntrySection}
        >
          <button
            type="button"
            style={communityEntryCard}
            onClick={() => setPage("discover")}
          >
            <span style={communityEntryIcon}>
              <MeetroIcon name="discover" size={24} decorative />
            </span>
            <span style={communityEntryCopy}>
              <strong style={communityEntryTitle}>
                {t("communityEntryTitle", language)}
              </strong>
              <span style={communityEntryText}>
                {t("communityEntryBusinessCopy", language)}
              </span>
            </span>
            <span style={communityEntryAction}>
              {t("communityOpenAction", language)} →
            </span>
          </button>
        </section>

        <div className="business-dashboard-main-grid" style={dashboardDesktopFlow}>
          <div className="business-dashboard-primary-column" style={dashboardDesktopFlow}>
            <section className="business-dashboard-section-card" style={sectionCard}>
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
                        onClick={() => {
                          if (openRelationshipConversation(item, "schedule")) return;
                          openWorkCenterSection("schedule", { filter: "today" });
                        }}
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
          </div>

          <div className="business-dashboard-secondary-column" style={dashboardDesktopFlow}>
            <section className="business-dashboard-leads-card" style={leadsCard}>
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
          </div>
        </div>

        <div className="business-dashboard-tools-row" style={dashboardDesktopFlow}>
          <section className="business-dashboard-tools-section" style={singleActionSection}>
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

          <section className="business-dashboard-upgrade-card" style={upgradeCard}>
            <div>
              <span style={upgradeBadge}>Founding Pro</span>
              <h2 style={upgradeTitle}>{text.upgradeTitle}</h2>
              <p style={upgradeText}>{text.upgradeText}</p>
            </div>
          </section>
        </div>
      </div>

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

function DashboardQuickAccessShortcut({ icon, label, note, tone, toneBg, onClick }) {
  return (
    <button
      type="button"
      className="business-dashboard-quick-access-item"
      style={quickAccessShortcut}
      onClick={onClick}
    >
      <span
        style={{
          ...quickAccessIcon,
          color: tone,
          background: toneBg,
        }}
        aria-hidden="true"
      >
        <MeetroIcon name={icon} size={19} decorative />
      </span>

      <span style={quickAccessCopy}>
        <strong>{label}</strong>
        <span>{note}</span>
      </span>
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

      <div style={workRowContent}>
        <strong style={workRowTitle}>{title}</strong>
        <p style={workRowMeta}>{meta}</p>
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

const dashboardContentLane = {
  display: "contents",
};

const dashboardDesktopFlow = {
  display: "contents",
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
  gap: "16px",
};

const heroDesktopContext = {
  display: "none",
  alignItems: "flex-end",
  justifyContent: "flex-start",
  flexDirection: "column",
  gap: "8px",
  flexShrink: 0,
  maxWidth: "260px",
};

const heroContextPill = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "100%",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.10)",
  color: "#dbeafe",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "900",
  lineHeight: 1,
  whiteSpace: "normal",
  textAlign: "right",
};

const heroAvailabilityPill = (available) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  maxWidth: "100%",
  borderRadius: "999px",
  border: available
    ? "1px solid rgba(34,197,94,0.34)"
    : "1px solid rgba(148,163,184,0.34)",
  background: available ? "rgba(34,197,94,0.16)" : "rgba(148,163,184,0.14)",
  color: available ? "#bbf7d0" : "#e2e8f0",
  padding: "7px 10px",
  fontSize: "12px",
  fontWeight: "950",
  lineHeight: 1,
  textAlign: "right",
});

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

const primaryActionPanel = {
  display: "none",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  marginBottom: "12px",
  padding: "12px 14px",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.14)",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.07))",
  color: "#ffffff",
};

const primaryActionCopy = {
  display: "grid",
  gap: "4px",
  minWidth: 0,
};

const primaryActionEyebrow = {
  color: "#bfdbfe",
  fontSize: "11px",
  fontWeight: "950",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const primaryActionTitle = {
  color: "#ffffff",
  fontSize: "16px",
  lineHeight: 1.2,
  fontWeight: "950",
};

const primaryActionNote = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "12px",
  lineHeight: 1.3,
  fontWeight: "800",
};

const primaryActionButton = {
  border: "1px solid rgba(255,255,255,0.20)",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.94)",
  color: "#312e81",
  padding: "10px 13px",
  fontSize: "13px",
  fontWeight: "950",
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 10px 22px rgba(15,23,42,0.16)",
};

const quickAccessPanel = {
  marginBottom: "12px",
  padding: "10px 12px",
  borderRadius: "20px",
  background: "rgba(255,255,255,0.94)",
  color: "#0f172a",
  border: "1px solid rgba(255,255,255,0.82)",
  boxShadow: "0 10px 24px rgba(15,23,42,0.10)",
};

const quickAccessHeader = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "8px",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: "950",
};

const quickAccessGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
  gap: "8px",
};

const quickAccessShortcut = {
  border: "none",
  background: "transparent",
  borderRadius: "16px",
  padding: "8px",
  display: "flex",
  alignItems: "center",
  gap: "9px",
  textAlign: "left",
  cursor: "pointer",
  minWidth: 0,
  fontFamily: "inherit",
  color: "#0f172a",
};

const quickAccessIcon = {
  width: "34px",
  height: "34px",
  borderRadius: "13px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const quickAccessCopy = {
  display: "grid",
  gap: "2px",
  minWidth: 0,
  lineHeight: 1.2,
  fontSize: "12px",
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

const communityEntrySection = {
  marginBottom: "18px",
};

const communityEntryCard = {
  width: "100%",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  borderRadius: "24px",
  background:
    "linear-gradient(135deg, var(--meetro-surface-paper, rgba(255,253,248,0.97)), var(--meetro-surface-sage, rgba(238,244,234,0.9)))",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
  padding: "16px",
  display: "grid",
  gridTemplateColumns: "48px 1fr",
  gap: "12px",
  alignItems: "center",
  textAlign: "left",
  color: "#0f172a",
  cursor: "pointer",
  boxSizing: "border-box",
};

const communityEntryIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "18px",
  background:
    "linear-gradient(135deg, var(--meetro-surface-sage, rgba(238,244,234,0.9)), var(--meetro-surface-warm, rgba(251,246,237,0.92)))",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "grid",
  placeItems: "center",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
};

const communityEntryCopy = {
  display: "grid",
  gap: "5px",
  minWidth: 0,
};

const communityEntryTitle = {
  color: "#111827",
  fontSize: "18px",
  lineHeight: 1.1,
  fontWeight: "950",
};

const communityEntryText = {
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.4,
  fontWeight: "700",
};

const communityEntryAction = {
  gridColumn: "1 / -1",
  justifySelf: "start",
  marginTop: "2px",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "14px",
  fontWeight: "950",
};

const singleActionSection = {
  marginTop: 0,
  marginBottom: "20px",
};

const quoteActionButton = {
  width: "100%",
  border: "1px solid rgba(31,77,52,0.28)",
  background:
    "linear-gradient(135deg, var(--meetro-surface-paper, rgba(255,253,248,0.98)) 0%, var(--meetro-surface-warm, rgba(251,246,237,0.92)) 44%, var(--meetro-surface-sage, rgba(238,244,234,0.9)) 100%)",
  borderRadius: "26px",
  padding: "20px",
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-start",
  gap: "16px",
  cursor: "pointer",
  color: "#111827",
  boxShadow:
    "0 18px 42px rgba(49,35,20,0.12), 0 1px 0 rgba(255,255,255,0.92) inset",
  textAlign: "left",
  boxSizing: "border-box",
  minWidth: 0,
};

const quoteActionIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "20px",
  background:
    "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
  flexShrink: 0,
  boxShadow: "0 14px 26px rgba(49,35,20,0.18)",
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
  color: "var(--meetro-color-coffee, #4a3428)",
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
  border: "1px solid rgba(31,77,52,0.16)",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.72))",
  color: "var(--meetro-color-forest, #1f4d34)",
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "11px",
  fontWeight: "900",
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const businessToolsCta = {
  marginTop: "4px",
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: "14px",
  fontWeight: "950",
};


const sectionCard = {
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  borderRadius: "26px",
  padding: "20px",
  marginBottom: "18px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
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
  color: "var(--meetro-color-forest, #1f4d34)",
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
  display: "grid",
  gridTemplateColumns: "70px minmax(0, 1fr) 18px",
  gridTemplateAreas: `
    "time content chevron"
    "time status chevron"
  `,
  alignItems: "center",
  columnGap: "12px",
  rowGap: "8px",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
  overflow: "hidden",
};

const workRowContent = {
  gridArea: "content",
  minWidth: 0,
  maxWidth: "100%",
  overflow: "hidden",
};

const workRowTitle = {
  display: "block",
  minWidth: 0,
  maxWidth: "100%",
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "900",
  lineHeight: 1.25,
  whiteSpace: "normal",
  wordBreak: "normal",
  overflowWrap: "break-word",
};

const workRowMeta = {
  margin: "4px 0 0",
  minWidth: 0,
  maxWidth: "100%",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: 1.35,
  whiteSpace: "normal",
  wordBreak: "normal",
  overflowWrap: "break-word",
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
  gridArea: "time",
  width: "70px",
  minWidth: "70px",
  borderRadius: "16px",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 6px",
  lineHeight: 1.1,
};

const workStatus = {
  gridArea: "status",
  justifySelf: "start",
  maxWidth: "100%",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "900",
  whiteSpace: "normal",
  wordBreak: "normal",
  overflowWrap: "break-word",
};

const chevron = {
  gridArea: "chevron",
  justifySelf: "end",
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
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  borderRadius: "26px",
  padding: "20px",
  marginBottom: "16px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
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
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "28px",
};

const leadBadge = {
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
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
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  padding: "7px 10px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
};

const upgradeCard = {
  background:
    "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "white",
  borderRadius: "26px",
  padding: "20px",
  display: "flex",
  gap: "14px",
  alignItems: "center",
  boxShadow: "0 18px 40px rgba(49,35,20,0.18)",
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
