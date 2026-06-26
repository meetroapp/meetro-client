import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import SafeBackBar from "../components/SafeBackBar";
import LoadingScreen from "../components/LoadingScreen";
import MeetroIcon from "../components/MeetroIcon";
import ConversationThread from "./ConversationThread";
import { authFetch } from "../utils/authFetch";
import { getDashboardPageForAccountMode } from "../utils/session";
import { getLanguage, t } from "../utils/language";
import { formatMessageTime } from "../utils/displayTime";
import {
  getActiveJobSnapshot,
  getConversationMeta,
} from "../utils/workCenter";
import {
  getConversationRegistry as readConversationRegistry,
  isConversationUnreadForRole,
  markConversationRead,
  writeUnreadConversationCount,
} from "../utils/conversationUnread";
import { isHiringConversationType } from "../utils/hiringConversations";


function getDeletedConversationIds() {
  try {
    return JSON.parse(
      localStorage.getItem("deletedConversationIds") || "[]"
    );
  } catch {
    return [];
  }
}

function filterDeletedConversations(list) {
  const deletedIds = getDeletedConversationIds();

  return list.filter((item) => {
    if (item.conversation_type === "emergency" && !item.saved_to_history) {
      return true;
    }

    return !deletedIds.includes(item.id);
  });
}

function getConversationRegistry() {
  return readConversationRegistry();
}

function saveConversationRegistryItem(item) {
  const registry = getConversationRegistry();

  const normalized = {
    ...item,
    id: String(item.id),
    project_title: item.project_title || item.name || "Conversation",
    project_description:
      item.project_description || item.lastMessage || "Tap to open conversation",
    homeowner_email: item.homeowner_email || item.customer || item.name || "Contact",
    location: item.location || "Saved Contact",
    status: item.saved_to_history
      ? t("savedHistory")
      : item.status || "Message",
    unread: item.unread ?? false,
    conversation_type: item.conversation_type || "standard",
    saved_to_history:
      item.saved_to_history ||
      localStorage.getItem(`meetro_conversation_saved_${item.id}`) === "true" ||
      false,
    savedAt: item.savedAt || new Date().toISOString(),
  };

  const withoutDuplicate = registry.filter(
    (entry) => String(entry.id) !== String(normalized.id)
  );

  const updated = [normalized, ...withoutDuplicate];

  localStorage.setItem(
    "meetro_conversation_registry",
    JSON.stringify(updated)
  );
  writeUnreadConversationCount(updated);

  window.dispatchEvent(new Event("meetro-messages-updated"));
}

function dedupeConversations(list) {
  const seen = new Set();

  return list.filter((item) => {
    const id = String(item.id || "");

    if (!id || seen.has(id)) return false;

    seen.add(id);
    return true;
  });
}

function normalizeMessageSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


function MessagesInbox({ setPage, currentPage }) {
  const activeJobSnapshot = getActiveJobSnapshot();

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, updateLanguage] = useState(getLanguage());
  const [activeAccountMode, setActiveAccountMode] = useState(
    localStorage.getItem("activeAccountMode") || "personal"
  );
  const [isSplitPane, setIsSplitPane] = useState(false);
  const [activeSplitConversationId, setActiveSplitConversationId] = useState(
    localStorage.getItem("activeConversationId") || ""
  );
  const [messageView, setMessageViewState] = useState(
    localStorage.getItem("meetroMessageView") === "active"
      ? "all"
      : localStorage.getItem("meetroMessageView") || "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  const setMessageView = (view) => {
    localStorage.setItem("meetroMessageView", view);
    setMessageViewState(view);
  };

  const isSpanish = language === "es";

   function getEmergencyConversation() {
  const currentUserKey =
    localStorage.getItem("userId") ||
    localStorage.getItem("userEmail") ||
    "guest";

  let activeEmergencyRecord = {};

  try {
    activeEmergencyRecord = JSON.parse(
      localStorage.getItem("activeEmergencyRecord") || "{}"
    );
  } catch {
    activeEmergencyRecord = {};
  }

  const emergencyConversationId =
    activeEmergencyRecord.conversationId ||
    localStorage.getItem("emergencyConversationId") ||
    `emergency-active-request-${currentUserKey}`;

  const emergencySaved =
    localStorage.getItem(`meetro_conversation_${emergencyConversationId}`) ||
    localStorage.getItem(`meetro_emergency_conversation_meta_${currentUserKey}`);

  const emergencyStatus =
    activeEmergencyRecord.status ||
    localStorage.getItem("emergencyDispatchStatus") ||
    "";
  const emergencyArchived =
    localStorage.getItem(
      `meetro_conversation_saved_${emergencyConversationId}`
    ) === "true";

  const hasActiveEmergency =
    Boolean(emergencySaved || activeEmergencyRecord.id) &&
    !emergencyArchived &&
    !["cancelled", "closed", "archived"].includes(emergencyStatus);

  if (!hasActiveEmergency) return null;

  const conversationMeta = getConversationMeta(emergencyConversationId);
  const savedMessages = (() => {
    try {
      return JSON.parse(
        localStorage.getItem(`meetro_conversation_${emergencyConversationId}`) ||
          "[]"
      );
    } catch {
      return [];
    }
  })();
  const latestMessage = savedMessages[savedMessages.length - 1];
  const latestMessageText =
    latestMessage?.title ||
    latestMessage?.text ||
    conversationMeta.lastMessage ||
    "";

  const emergencyService =
    activeEmergencyRecord.service ||
    activeEmergencyRecord.title ||
    localStorage.getItem(`selectedEmergencyService_${currentUserKey}`) ||
    activeJobSnapshot?.service ||
    localStorage.getItem("activeJobService") ||
    localStorage.getItem("selectedEmergencyService") ||
    (isSpanish ? "Emergencia" : "Emergency Request");

  return {
    id: emergencyConversationId,
    project_title: emergencyService,
    project_description:
      latestMessageText ||
      activeEmergencyRecord.issue ||
      activeEmergencyRecord.project_description ||
      (isSpanish
        ? "Conversación de emergencia activa guardada."
        : "Saved active emergency conversation."),
    homeowner_email:
      activeEmergencyRecord.customerName ||
      activeEmergencyRecord.customer ||
      (isSpanish ? "Cliente de Emergencia" : "Emergency Client"),
    location:
      activeEmergencyRecord.location ||
      localStorage.getItem("emergencyLocation") ||
      "Emergency Service Location",
    status:
      emergencyStatus ||
      (isSpanish ? "emergencia" : "emergency"),
    unread:
      isConversationUnreadForRole(emergencyConversationId, undefined, false),
    conversation_type: "emergency",
    saved_to_history: false,
  };
}

  function mergeEmergencyConversation(list) {
    const emergencyConversation = getEmergencyConversation();

    if (!emergencyConversation) return list;

    const withoutDuplicate = list.filter(
      (item) =>
        String(item.id) !== String(emergencyConversation.id) &&
        !String(item.id).startsWith("emergency-active-request-")
    );

    return [emergencyConversation, ...withoutDuplicate];
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 900px)");
    const updateSplitPane = () => setIsSplitPane(mediaQuery.matches);

    updateSplitPane();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateSplitPane);
      return () => mediaQuery.removeEventListener("change", updateSplitPane);
    }

    mediaQuery.addListener(updateSplitPane);
    return () => mediaQuery.removeListener(updateSplitPane);
  }, []);

  useEffect(() => {
    const handleLanguageChange = () => {
      updateLanguage(getLanguage());
    };
    const handleAccountModeChange = () => {
      setActiveAccountMode(localStorage.getItem("activeAccountMode") || "personal");
    };

    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("meetroLanguageChanged", handleLanguageChange);
    window.addEventListener("meetro-language-change", handleLanguageChange);
    window.addEventListener("accountModeChanged", handleAccountModeChange);
    window.addEventListener("storage", handleAccountModeChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      window.removeEventListener("meetroLanguageChanged", handleLanguageChange);
      window.removeEventListener("meetro-language-change", handleLanguageChange);
      window.removeEventListener("accountModeChanged", handleAccountModeChange);
      window.removeEventListener("storage", handleAccountModeChange);
    };
  }, []);

  useEffect(() => {
    fetchConversations();

    const refreshMessages = () => {
      fetchConversations();
    };

    window.addEventListener("focus", refreshMessages);
    window.addEventListener("storage", refreshMessages);
    window.addEventListener("meetro-messages-updated", refreshMessages);
    window.addEventListener(
      "meetroEmergencyConversationUpdated",
      refreshMessages
    );

    const pollingInterval = setInterval(() => {
      if (!document.hidden) {
        refreshMessages();
      }
    }, 7000);

    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener("focus", refreshMessages);
      window.removeEventListener("storage", refreshMessages);
      window.removeEventListener("meetro-messages-updated", refreshMessages);
      window.removeEventListener(
        "meetroEmergencyConversationUpdated",
        refreshMessages
      );
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    const unreadCount = quotes.filter((quote) => quote.unread).length;

    writeUnreadConversationCount(quotes);

    window.dispatchEvent(new Event("storage"));
  }, [quotes]);

  async function fetchConversations() {
    try {
      const readConversationIds = JSON.parse(
        localStorage.getItem("readConversationIds") || "[]"
      );

      const result = await authFetch("/contractor-quote-requests", {}, setPage);

      let nextQuotes = [];

      if (result) {
        const incomingQuotes = result.data.quotes || [];

        if (incomingQuotes.length > 0) {
          nextQuotes = incomingQuotes.map((quote, index) => ({
            ...quote,
            conversation_type: quote.conversation_type || "standard",
            unread:
              index < 2 && !readConversationIds.includes(String(quote.id)),
          }));
        }
      }

      const registryConversations = getConversationRegistry().map((item) => ({
        ...item,
        unread: isConversationUnreadForRole(item.id, undefined, item.unread),
        saved_to_history:
          item.saved_to_history ||
          localStorage.getItem(`meetro_conversation_saved_${item.id}`) === "true",
        status:
          item.saved_to_history ||
          localStorage.getItem(`meetro_conversation_saved_${item.id}`) === "true"
            ? isSpanish
              ? "Historial guardado"
              : t("savedHistory")
            : item.status,
      }));

      const localBusinessConversations = Object.keys(localStorage)
        .filter((key) => key.startsWith("meetro_conversation_business_"))
        .map((key) => {
          const id = key.replace("meetro_conversation_", "");
          const meta = getConversationMeta(id);

          return {
            id,
            project_title:
              meta.activeJobService ||
              meta.projectTitle ||
              localStorage.getItem("conversationBusinessName") ||
              t("projectConversation"),
            project_description:
              meta.lastMessage ||
              t("tapOpenConversation"),
            location:
              meta.location ||
              t("location"),
            status: "Message",
            conversation_type: "standard",
            unread:
              isConversationUnreadForRole(id, undefined, false),
          };
        });

      setQuotes(
        filterDeletedConversations(
          dedupeConversations(
            mergeEmergencyConversation([
              ...registryConversations,
              ...nextQuotes,
              ...localBusinessConversations,
            ])
          )
        )
      );
    } catch (error) {
      console.error(error);
      setQuotes(filterDeletedConversations(mergeEmergencyConversation(demoQuotes)));
    } finally {
      setLoading(false);
    }
  }

  function deleteConversation(e, quoteId) {
    e.stopPropagation();

    const confirmed = window.confirm(
      language === "es"
        ? "¿Eliminar esta conversación?"
        : "Delete this conversation?"
    );

    if (!confirmed) return;

    const deletedIds = getDeletedConversationIds();

    localStorage.setItem(
      "deletedConversationIds",
      JSON.stringify([...new Set([...deletedIds, quoteId])])
    );

    const updatedQuotes =
      quotes.filter((q) => q.id !== quoteId);

    setQuotes(updatedQuotes);

    localStorage.removeItem(
      `meetro_conversation_${quoteId}`
    );

    localStorage.removeItem(
      `meetro_conversation_meta_${quoteId}`
    );

    const registry = getConversationRegistry();

    localStorage.setItem(
      "meetro_conversation_registry",
      JSON.stringify(
        registry.filter((item) => String(item.id) !== String(quoteId))
      )
    );

    window.dispatchEvent(
      new Event("meetro-messages-updated")
    );
  }

  function prepareConversation(quote) {
    const readConversationIds = JSON.parse(
      localStorage.getItem("readConversationIds") || "[]"
    );

    if (!readConversationIds.includes(String(quote.id))) {
      readConversationIds.push(String(quote.id));

      localStorage.setItem(
        "readConversationIds",
        JSON.stringify(readConversationIds)
      );
    }

    const updatedQuotes = quotes.map((item) =>
      String(item.id) === String(quote.id)
        ? { ...item, unread: false }
        : item
    );

    setQuotes(updatedQuotes);
    markConversationRead(quote.id, quote);

    localStorage.setItem("selectedQuoteRequestId", String(quote.id));
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(quote));
    localStorage.setItem("selectedMessageReceiverId", quote.homeowner_id || "");
    localStorage.setItem("conversationReturnPage", "messagesInbox");
    localStorage.setItem("activeConversationId", String(quote.id));

    localStorage.setItem(
      "activeConversationName",
      isHiringConversation(quote)
        ? quote.applicantName ||
          quote.participantName ||
          quote.businessName ||
          quote.homeowner_email ||
          "Hiring Contact"
        : quote.project_title ||
        quote.business_name ||
        quote.homeowner_email ||
        "Conversation"
    );

    localStorage.setItem(
      "meetroConversationType",
      quote.conversation_type || "standard"
    );

    saveConversationRegistryItem({
      ...quote,
      id: quote.id,
      project_title:
        quote.project_title ||
        quote.business_name ||
        quote.homeowner_email ||
        "Conversation",
      project_description:
        quote.project_description ||
        "Saved conversation for future communication.",
      homeowner_email:
        quote.homeowner_email ||
        quote.business_name ||
        "Contact",
      conversation_type: quote.conversation_type || "standard",
      unread: false,
      saved_to_history:
        quote.saved_to_history ||
        localStorage.getItem(`meetro_conversation_saved_${quote.id}`) === "true",
    });
  }

  function openConversation(quote) {
    prepareConversation(quote);

    if (isSplitPane) {
      setActiveSplitConversationId(String(quote.id));
      return;
    }

    setPage("conversationThread");
  }

  const isHiringConversation = (quote) =>
    isHiringConversationType(quote.conversation_type || quote.type);
  const isEmergencyConversationType = (quote) =>
    quote.conversation_type === "emergency";
  const isWorkConversation = (quote) =>
    !quote.saved_to_history &&
    !isEmergencyConversationType(quote) &&
    !isHiringConversation(quote);
  const activeQuotes = quotes.filter((quote) => !quote.saved_to_history);
  const workQuotes = quotes.filter(isWorkConversation);
  const emergencyQuotes = quotes.filter(isEmergencyConversationType);
  const hiringQuotes = quotes.filter(isHiringConversation);
  const savedQuotes = quotes.filter((quote) => quote.saved_to_history);

  const activeUnreadCount = activeQuotes.filter((quote) => quote.unread).length;
  const savedUnreadCount = savedQuotes.filter((quote) => quote.unread).length;
  const unreadCount = activeUnreadCount + savedUnreadCount;

  const filterCards = [
    {
      key: "all",
      label: isSpanish ? "Todos" : "All",
      count: activeQuotes.length,
      helper: isSpanish ? "Todas las conversaciones activas" : "All active conversations",
    },
    {
      key: "work",
      label: isSpanish ? "Trabajo" : "Work",
      count: workQuotes.length,
      helper: isSpanish ? "Clientes, cotizaciones y servicios" : "Customers, quotes, and services",
    },
    {
      key: "emergency",
      label: isSpanish ? "Emergencia" : "Emergency",
      count: emergencyQuotes.length,
      helper: isSpanish ? "Despachos urgentes separados" : "Urgent dispatches kept separate",
    },
    {
      key: "hiring",
      label: isSpanish ? "Contratación" : "Hiring",
      count: hiringQuotes.length,
      helper: isSpanish ? "Solicitantes y consultas de empleo" : "Applicants and job inquiries",
    },
  ];

  function getWorkflowStatusLabel(quote) {
    if (quote.saved_to_history) return t("savedHistory");
    if (isHiringConversation(quote)) {
      return quote.status || (isSpanish ? "Nueva consulta" : "New inquiry");
    }
    if (quote.conversation_type === "emergency") {
      return isSpanish ? "Emergencia activa" : "Active emergency";
    }

    const rawStatus = String(quote.status || quote.workflow_status || "").toLowerCase();
    const description = String(quote.project_description || "").toLowerCase();

    if (rawStatus.includes("confirmed") || description.includes("confirmed")) {
      return t("appointmentConfirmed");
    }

    if (
      rawStatus.includes("schedule") ||
      rawStatus.includes("appointment") ||
      description.includes("appointment") ||
      description.includes("scheduled")
    ) {
      return isSpanish ? "Cita programada" : "Appointment Scheduled";
    }

    if (rawStatus.includes("quote") || description.includes("quote")) {
      return isSpanish ? "Cotización en revisión" : "Quote in Review";
    }

    if (rawStatus.includes("completion") || rawStatus.includes("completed")) {
      return isSpanish ? "Revisión de finalización" : "Completion Review";
    }

    if (rawStatus.includes("closure") || rawStatus.includes("closed")) {
      return isSpanish ? "Cierre pendiente" : "Closure Pending";
    }

    if (quote.unread) return t("messageNeedsAttention");

    return isSpanish ? "Comunicación activa" : "Active Communication";
  }

  function getConversationWorkflowLabel(quote) {
    if (quote.saved_to_history) return t("messageLabelCompleted");
    if (isEmergencyConversationType(quote)) return t("messageLabelEmergency");
    if (isHiringConversation(quote)) return t("messageLabelHiring");

    const status = String(quote.status || quote.workflow_status || "").toLowerCase();
    const description = String(quote.project_description || quote.lastMessage || "").toLowerCase();
    const title = String(quote.project_title || quote.projectTitle || "").toLowerCase();
    const combined = `${status} ${description} ${title}`;

    if (combined.includes("quote") || combined.includes("proposal")) {
      return t("messageLabelQuote");
    }

    if (
      combined.includes("schedule") ||
      combined.includes("appointment") ||
      combined.includes("visit")
    ) {
      return t("messageLabelSchedule");
    }

    return t("messageLabelProject");
  }

  function getConversationParticipantName(quote = {}) {
    if (isHiringConversation(quote)) {
      return (
        quote.applicantName ||
        quote.participantName ||
        quote.businessName ||
        quote.business_name ||
        quote.homeowner_email ||
        t("hiring")
      );
    }

    if (isEmergencyConversationType(quote)) {
      return (
        quote.customerName ||
        quote.customer ||
        quote.homeowner_email ||
        t("emergency")
      );
    }

    return (
      quote.homeowner_email ||
      quote.homeownerName ||
      quote.customerName ||
      quote.customer ||
      quote.professionalName ||
      quote.businessName ||
      quote.business_name ||
      t("conversation")
    );
  }

  function getConversationPriority(quote = {}) {
    const status = String(quote.status || quote.workflow_status || "").toLowerCase();
    const description = String(quote.project_description || quote.lastMessage || "").toLowerCase();
    const combined = `${status} ${description}`;

    if (quote.unread) return 0;
    if (isEmergencyConversationType(quote) && !quote.saved_to_history) return 1;
    if (
      combined.includes("quote") ||
      combined.includes("proposal") ||
      combined.includes("approval") ||
      combined.includes("decision")
    ) {
      return 2;
    }
    if (
      combined.includes("schedule") ||
      combined.includes("appointment") ||
      combined.includes("confirm")
    ) {
      return 3;
    }
    if (
      combined.includes("active") ||
      combined.includes("progress") ||
      combined.includes("work")
    ) {
      return 4;
    }
    if (isHiringConversation(quote)) return 5;
    if (quote.saved_to_history) return 7;
    return 6;
  }

  function getConversationSortTime(quote = {}) {
    const value =
      quote.lastTime ||
      quote.lastMessageAt ||
      quote.updatedAt ||
      quote.savedAt ||
      quote.createdAt ||
      "";
    const time = value ? new Date(value).getTime() : 0;

    return Number.isFinite(time) ? time : 0;
  }

  function sortConversationsByAttention(list) {
    return list
      .slice()
      .sort((left, right) => {
        const priorityDelta =
          getConversationPriority(left) - getConversationPriority(right);

        if (priorityDelta !== 0) return priorityDelta;

        return getConversationSortTime(right) - getConversationSortTime(left);
      });
  }

  function getConversationNextStep(quote) {
    if (quote.saved_to_history) return t("messageNextStepSaved");
    if (isHiringConversation(quote)) {
      return isSpanish
        ? "Responder sobre la posición"
        : "Reply about this position";
    }
    if (quote.conversation_type === "emergency") return t("messageNextStepEmergency");
    if (quote.unread) return t("messageNextStepReply");

    const status = getWorkflowStatusLabel(quote).toLowerCase();

    if (status.includes("appointment") || status.includes("cita")) {
      return t("messageNextStepAppointment");
    }

    if (status.includes("quote") || status.includes("cotización")) {
      return t("messageNextStepQuote");
    }

    if (status.includes("completion") || status.includes("finalización")) {
      return t("messageNextStepCompletion");
    }

    if (status.includes("closure") || status.includes("cierre")) {
      return t("messageNextStepClosure");
    }

    return t("messageNextStepOpen");
  }

  function getConversationDisplayTime(quote = {}) {
    return (
      formatMessageTime(
        quote.lastTime ||
          quote.lastMessageAt ||
          quote.updatedAt ||
          quote.savedAt ||
          quote.createdAt
      ) || t("open")
    );
  }

  function getConversationSearchText(quote = {}) {
    const typeLabels = [
      isHiringConversation(quote) ? t("hiring") : "",
      isEmergencyConversationType(quote) ? t("emergency") : "",
      isWorkConversation(quote) ? t("work") : "",
      quote.saved_to_history ? t("savedHistory") : "",
      "quote",
      "proposal",
      "project",
      "service",
      "customer",
      "professional",
      "emergency",
      "hiring",
    ];

    return normalizeMessageSearchText(
      [
        quote.homeowner_email,
        quote.homeownerName,
        quote.homeowner_name,
        quote.customerName,
        quote.customer,
        quote.participantName,
        quote.participant_name,
        quote.applicantName,
        quote.applicant_name,
        quote.professionalName,
        quote.professional_name,
        quote.businessName,
        quote.business_name,
        quote.companyName,
        quote.company_name,
        quote.project_title,
        quote.projectTitle,
        quote.positionTitle,
        quote.position_title,
        quote.serviceType,
        quote.service_type,
        quote.service,
        quote.category,
        quote.project_description,
        quote.lastMessage,
        quote.last_message,
        quote.snippet,
        quote.status,
        quote.workflow_status,
        quote.conversation_type,
        quote.type,
        quote.source,
        quote.location,
        getConversationParticipantName(quote),
        getConversationWorkflowLabel(quote),
        getWorkflowStatusLabel(quote),
        getConversationNextStep(quote),
        ...typeLabels,
      ].filter(Boolean).join(" ")
    );
  }

  function getEmptyMessageCopy() {
    if (messageView === "work") {
      return {
        title: isSpanish ? "No hay mensajes de trabajo" : "No work messages yet",
        text: isSpanish
          ? "Las conversaciones de clientes, servicios y cotizaciones aparecerán aquí."
          : "Customer, service, and quote conversations will appear here.",
      };
    }

    if (messageView === "emergency") {
      return {
        title: isSpanish ? "No hay mensajes de emergencia" : "No emergency messages",
        text: isSpanish
          ? "Los despachos de emergencia permanecerán separados aquí."
          : "Emergency dispatch conversations will stay separated here.",
      };
    }

    if (messageView === "hiring") {
      return {
        title: isSpanish ? "No hay mensajes de contratación" : "No hiring messages yet",
        text: isSpanish
          ? "Las consultas de empleo y solicitantes aparecerán aquí."
          : "Job inquiries and applicant messages will appear here.",
      };
    }

    return {
      title: t("messagesCaughtUpTitle"),
      text: t("messagesCaughtUpText"),
    };
  }

  const visibleQuotes =
    messageView === "work"
      ? workQuotes
      : messageView === "emergency"
      ? emergencyQuotes
      : messageView === "hiring"
      ? hiringQuotes
      : activeQuotes;
  const prioritizedVisibleQuotes = sortConversationsByAttention(visibleQuotes);
  const emptyCopy = getEmptyMessageCopy();
  const normalizedSearchQuery = normalizeMessageSearchText(searchQuery);
  const searchedVisibleQuotes = normalizedSearchQuery
    ? prioritizedVisibleQuotes.filter((quote) =>
        getConversationSearchText(quote).includes(normalizedSearchQuery)
      )
    : prioritizedVisibleQuotes;
  const activeSplitConversation = searchedVisibleQuotes.find(
    (quote) => String(quote.id) === String(activeSplitConversationId)
  );

  if (loading) {
    return <LoadingScreen text={t("loadingMessages")} />;
  }

  return (
    <div
      className="app-page meetro-wide-page"
      style={{
        ...pageWrapper,
        ...(isSplitPane ? splitPageWrapper : {}),
        paddingTop: "calc(env(safe-area-inset-top) + 64px)",
      }}
    >
      <SafeBackBar
        setPage={setPage}
        fallback={getDashboardPageForAccountMode(activeAccountMode)}
        label={`← ${t("backToDashboard")}`}
      />

      <div style={heroCard}>
        <div>
          <h1 style={pageTitle}>{t("messages")}</h1>

          <p style={pageSubtitle}>
            {unreadCount > 0
              ? t("messagesAttentionSummary").replace("{count}", unreadCount)
              : t("messagesInboxSubtitle")}
          </p>
        </div>

        {unreadCount > 0 && (
          <div style={unreadHeroBadge}>
            <div style={unreadNumber}>{unreadCount}</div>

            <span style={unreadLabel}>
              {t("unread").toLowerCase()}
            </span>
          </div>
        )}
      </div>

      <div style={filterHeader}>
        <p style={filterEyebrow}>{t("conversationFilters")}</p>
        <h2 style={filterTitle}>{t("communicationCenterTitle")}</h2>
      </div>

      <div style={searchWrap}>
        <label style={searchLabel} htmlFor="messages-search">
          <MeetroIcon name="discover" size={18} decorative />
          <input
            id="messages-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("messagesSearchPlaceholder")}
            style={searchInput}
          />
        </label>

        {searchQuery && (
          <button
            type="button"
            style={searchClearButton}
            onClick={() => setSearchQuery("")}
            aria-label={t("messagesSearchClear")}
          >
            ×
          </button>
        )}
      </div>

      <div style={messageTabs}>
        {filterCards.map((filter) => (
          <button
            key={filter.key}
            style={{
              ...messageTab,
              ...(messageView === filter.key ? activeMessageTab : {}),
            }}
            onClick={() => setMessageView(filter.key)}
          >
            <strong>{filter.label}</strong>
            <span style={messageTabCount}>{filter.count}</span>
            <small>{filter.helper}</small>
          </button>
        ))}
      </div>

      <div style={isSplitPane ? splitShell : undefined}>
        <div style={isSplitPane ? splitListPane : undefined}>
          {searchedVisibleQuotes.length === 0 && (
            <div style={emptyCard}>
              <div style={emptyIcon}>MSG</div>

              <h2 style={emptyTitle}>
                {normalizedSearchQuery ? t("messagesNoSearchResults") : emptyCopy.title}
              </h2>

              <p style={emptyText}>
                {normalizedSearchQuery ? t("messagesNoSearchResultsText") : emptyCopy.text}
              </p>
            </div>
          )}

          <div style={conversationList}>
            {searchedVisibleQuotes.map((quote) => (
              <div
                key={quote.id}
                onClick={() => openConversation(quote)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openConversation(quote);
                  }
                }}
                role="button"
                tabIndex={0}
                style={{
                  ...conversationCard,
                  ...(isSplitPane ? splitConversationCard : {}),
                  ...(quote.unread ? unreadConversationCard : {}),
                  ...(quote.conversation_type === "emergency"
                    ? emergencyConversationCard
                    : {}),
                  ...(isHiringConversation(quote) ? hiringConversationCard : {}),
                  ...(quote.saved_to_history ? savedHistoryCard : {}),
                  ...(isSplitPane &&
                  String(activeSplitConversationId) === String(quote.id)
                    ? activeSplitConversationCard
                    : {}),
                }}
              >
                <div
                  style={{
                    ...avatarCircle,
                    ...(isSplitPane ? splitAvatarCircle : {}),
                    ...(quote.unread ? unreadAvatar : {}),
                    ...(quote.conversation_type === "emergency"
                      ? emergencyAvatar
                      : {}),
                    ...(isHiringConversation(quote) ? hiringAvatar : {}),
                  }}
                >
                  {quote.conversation_type === "emergency"
                    ? ""
                    : isHiringConversation(quote)
                    ? "H"
                    : (quote.homeowner_email || "H").charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
	                  <div style={topRow}>
	                    <div style={conversationHeading}>
	                      <span style={participantName}>
	                        {getConversationParticipantName(quote)}
	                      </span>
	                      <h2
	                        style={{
	                          ...conversationTitle,
	                          ...(isSplitPane ? splitConversationTitle : {}),
	                          fontWeight: quote.unread ? "900" : "800",
	                        }}
	                      >
	                        {isHiringConversation(quote)
	                          ? quote.positionTitle || quote.project_title || t("conversation")
	                          : quote.project_title || t("projectConversation")}
	                      </h2>
	                    </div>

                    <div style={rightStack}>
                      <span style={timeText}>{getConversationDisplayTime(quote)}</span>

                      {quote.unread && <span style={unreadDot}></span>}

                      <button
                        onClick={(e)=>deleteConversation(e,quote.id)}
                        aria-label={
                          isSpanish ? "Eliminar conversación" : "Delete conversation"
                        }
                        title={
                          isSpanish ? "Eliminar conversación" : "Delete conversation"
                        }
                        style={{
                          border:"none",
                          background:"transparent",
                          cursor:"pointer",
                          fontSize:"18px",
                          color:"#ef4444",
                          padding:"4px"
                        }}
                      >
                        
                      </button>

                    </div>
                  </div>

                  <p
                    style={{
                      ...previewText,
                      fontWeight: quote.unread ? "800" : "500",
                      color: quote.unread ? "#374151" : "#667085",
                    }}
                  >
                    {quote.project_description || t("tapOpenConversation")}
                  </p>

                  <div style={workflowSummaryBox}>
                    <div style={workflowSummaryRow}>
                      <span>{t("currentStatus")}</span>
                      <strong>{getWorkflowStatusLabel(quote)}</strong>
                    </div>

                    <div style={workflowSummaryRow}>
                      <span>
                        {isHiringConversation(quote)
                          ? isSpanish
                            ? "Posición"
                            : "Position"
                          : t("service")}
                      </span>
                      <strong>
                        {isHiringConversation(quote)
                          ? quote.positionTitle || quote.project_title || t("conversation")
                          : quote.project_title || t("conversation")}
                      </strong>
                    </div>

                    <div style={workflowSummaryRow}>
                      <span>{t("nextStep")}</span>
                      <strong>{getConversationNextStep(quote)}</strong>
                    </div>
                  </div>

                  <div style={bottomRow}>
                    <span style={locationBadge}>
                       {quote.location || t("location")}
                    </span>

	                    <span
	                      style={{
	                        ...statusBadge,
                        ...(quote.unread ? unreadStatusBadge : {}),
                        ...(quote.conversation_type === "emergency"
                          ? emergencyStatusBadge
                          : {}),
                        ...(isHiringConversation(quote)
                          ? hiringStatusBadge
                          : {}),
                        ...(quote.saved_to_history ? savedHistoryBadge : {}),
	                      }}
	                    >
	                      {getConversationWorkflowLabel(quote)}
	                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isSplitPane && (
          <div style={splitThreadPane}>
            {activeSplitConversation ? (
              <ConversationThread
                embedded
                setPage={(nextPage) => {
                  if (nextPage === "messagesInbox" || nextPage === "conversationThread") {
                    setActiveSplitConversationId("");
                    return;
                  }

                  setPage(nextPage);
                }}
              />
            ) : (
              <div style={splitPlaceholder}>
                <div style={splitPlaceholderIcon}>MSG</div>
                <h2 style={splitPlaceholderTitle}>{t("communicationCenterTitle")}</h2>
                <p style={splitPlaceholderText}>
                  {isSpanish
                    ? "Selecciona una conversación para ver mensajes, tarjetas de flujo y próximos pasos."
                    : "Select a conversation to view messages, workflow cards, and next steps."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>


        <BottomNav setPage={setPage} currentPage="messagesInbox" />
    </div>
  );
}

const pageWrapper = {
  background:
    "radial-gradient(circle at top left, #eef0ff 0%, transparent 32%), linear-gradient(to bottom, #f7f7fb, #eef0f7)",
  minHeight: "100vh",
  padding:
    "calc(env(safe-area-inset-top) + 64px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  color: "#111827",
  width: "100%",
  maxWidth: "920px",
  margin: "0 auto",
};

const splitPageWrapper = {
  maxWidth: "1360px",
};

const splitShell = {
  display: "grid",
  gridTemplateColumns: "minmax(320px, 0.42fr) minmax(0, 0.58fr)",
  gap: "18px",
  alignItems: "stretch",
  height: "min(760px, calc(100dvh - 330px))",
  minHeight: "540px",
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
};

const splitListPane = {
  minWidth: 0,
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: "4px",
  WebkitOverflowScrolling: "touch",
};

const splitThreadPane = {
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  overflow: "hidden",
  borderRadius: "30px",
  background: "rgba(255,255,255,0.82)",
  boxShadow: "0 18px 44px rgba(15,23,42,0.08)",
};

const splitPlaceholder = {
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "28px",
  borderRadius: "30px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(248,250,252,0.92))",
  border: "1px solid rgba(226,232,240,0.95)",
  color: "#475569",
};

const splitPlaceholderIcon = {
  width: "72px",
  height: "72px",
  borderRadius: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#ede9ff",
  fontSize: "34px",
  marginBottom: "16px",
};

const splitPlaceholderTitle = {
  margin: "0 0 8px",
  color: "#111827",
  fontSize: "26px",
  lineHeight: 1.1,
};

const splitPlaceholderText = {
  margin: 0,
  maxWidth: "420px",
  lineHeight: 1.55,
  fontWeight: "700",
};

const backButton = {
  border: "none",
  background: "#eee7ff",
  color: "#5b3df5",
  padding: "10px 14px",
  borderRadius: "999px",
  fontWeight: "900",
  marginBottom: "18px",
  cursor: "pointer",
  boxShadow: "0 8px 22px rgba(91,61,245,0.12)",
};

const heroCard = {
  background: "rgba(255,255,255,0.84)",
  border: "1px solid rgba(226,232,240,0.92)",
  borderRadius: "22px",
  padding: "16px",
  marginBottom: "12px",
  color: "#111827",
  boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "center",
};

const eyebrow = {
  margin: 0,
  color: "#c8d4ee",
  fontWeight: "900",
  fontSize: "13px",
  letterSpacing: "0.4px",
};

const pageTitle = {
  fontSize: "28px",
  margin: "0 0 5px",
  color: "#111827",
  lineHeight: 1.05,
  fontWeight: "950",
};

const pageSubtitle = {
  color: "#64748b",
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.42,
  fontWeight: "750",
};

const unreadHeroBadge = {
  minWidth: "62px",
  height: "54px",
  borderRadius: "18px",
  background: "#5b3df5",
  color: "#ffffff",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "2px",
  boxShadow: "0 10px 24px rgba(91,61,245,0.20)",
};

const unreadNumber = {
  fontSize: "22px",
  fontWeight: "900",
  lineHeight: 1,
};

const unreadLabel = {
  fontSize: "10px",
  fontWeight: "700",
  opacity: 0.82,
  letterSpacing: "0.4px",
  textTransform: "uppercase",
};

const emptyCard = {
  background: "white",
  borderRadius: "28px",
  padding: "34px 22px",
  textAlign: "center",
  boxShadow: "0 14px 36px rgba(0,0,0,0.07)",
};

const emptyIcon = {
  fontSize: "52px",
  marginBottom: "12px",
};

const emptyTitle = {
  color: "#111827",
  marginTop: 0,
};

const emptyText = {
  color: "#667085",
  marginBottom: 0,
  lineHeight: 1.5,
};


const messageTabs = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
  gap: "10px",
  marginBottom: "12px",
};

const searchWrap = {
  position: "relative",
  marginBottom: "12px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const searchLabel = {
  width: "100%",
  minHeight: "48px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  border: "1px solid rgba(148,163,184,0.32)",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.94)",
  padding: "0 44px 0 14px",
  boxSizing: "border-box",
  color: "#64748b",
  boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
};

const searchInput = {
  width: "100%",
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#111827",
  fontSize: "15px",
  fontWeight: "750",
};

const searchClearButton = {
  position: "absolute",
  top: "50%",
  right: "10px",
  transform: "translateY(-50%)",
  width: "30px",
  height: "30px",
  border: "none",
  borderRadius: "999px",
  background: "#f1f5f9",
  color: "#475569",
  fontSize: "20px",
  fontWeight: "900",
  lineHeight: 1,
  cursor: "pointer",
};

const filterHeader = {
  margin: "4px 0 10px",
};

const filterEyebrow = {
  margin: 0,
  color: "#5b3df5",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.35px",
  textTransform: "uppercase",
};

const filterTitle = {
  margin: "4px 0 0",
  color: "#111827",
  fontSize: "22px",
  lineHeight: 1.15,
};

const messageTab = {
  border: "1px solid rgba(91,61,245,0.14)",
  background: "#ffffff",
  color: "#5b3df5",
  borderRadius: "18px",
  padding: "12px 10px",
  fontWeight: "900",
  cursor: "pointer",
  position: "relative",
  display: "grid",
  gap: "4px",
  textAlign: "left",
};

const activeMessageTab = {
  background: "linear-gradient(135deg, #7357ff, #5b3df5)",
  color: "#ffffff",
  boxShadow: "0 10px 24px rgba(91,61,245,0.18)",
};

const messageTabCount = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  justifySelf: "start",
  minWidth: "28px",
  height: "24px",
  padding: "0 8px",
  borderRadius: "999px",
  background: "rgba(91,61,245,0.1)",
  color: "inherit",
  fontSize: "12px",
  fontWeight: "900",
};

const savedHistoryCard = {
  border: "2px solid rgba(16,185,129,0.24)",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(240,253,244,0.96))",
};

const savedHistoryBadge = {
  background: "#ecfdf5",
  color: "#047857",
  border: "1px solid rgba(16,185,129,0.18)",
};

const conversationList = {
  display: "grid",
  gap: "14px",
};

const conversationCard = {
  width: "100%",
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  background: "rgba(255,255,255,0.94)",
  border: "1px solid rgba(255,255,255,0.8)",
  borderRadius: "26px",
  padding: "18px",
  cursor: "pointer",
  boxShadow: "0 14px 34px rgba(0,0,0,0.07)",
  textAlign: "left",
};

const splitConversationCard = {
  padding: "14px",
  borderRadius: "22px",
  gap: "12px",
};

const activeSplitConversationCard = {
  border: "2px solid rgba(91,61,245,0.36)",
  background: "linear-gradient(135deg,#ffffff,#f8f6ff)",
  boxShadow: "0 14px 34px rgba(91,61,245,0.13)",
};

const unreadConversationCard = {
  border: "2px solid #d9d0ff",
  background: "#f8f6ff",
};

const emergencyConversationCard = {
  border: "2px solid rgba(239,68,68,0.25)",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,241,242,0.95))",
};

const hiringConversationCard = {
  border: "2px solid rgba(79,70,229,0.20)",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(238,242,255,0.95))",
};

const avatarCircle = {
  width: "56px",
  height: "56px",
  borderRadius: "18px",
  background: "#ede9ff",
  color: "#5b3df5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  fontSize: "20px",
  flexShrink: 0,
};

const splitAvatarCircle = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  fontSize: "18px",
};

const unreadAvatar = {
  background: "#5b3df5",
  color: "white",
};

const emergencyAvatar = {
  background: "#fee2e2",
  color: "#dc2626",
};

const hiringAvatar = {
  background: "#e0e7ff",
  color: "#4338ca",
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
};

const conversationHeading = {
  minWidth: 0,
  display: "grid",
  gap: "3px",
};

const participantName = {
  color: "#334155",
  fontSize: "13px",
  fontWeight: "950",
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const rightStack = {
  display: "grid",
  gap: "6px",
  justifyItems: "end",
};

const conversationTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  lineHeight: 1.2,
};

const splitConversationTitle = {
  fontSize: "17px",
};

const timeText = {
  color: "#888",
  fontSize: "12px",
  whiteSpace: "nowrap",
  fontWeight: "800",
};

const unreadDot = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  background: "#ff3b5c",
  boxShadow: "0 4px 10px rgba(255,59,92,0.35)",
};

const previewText = {
  marginTop: "8px",
  marginBottom: "14px",
  lineHeight: 1.5,
};

const workflowSummaryBox = {
  display: "grid",
  gap: "8px",
  background: "#f8fafc",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: "18px",
  padding: "12px",
  marginBottom: "14px",
};

const workflowSummaryRow = {
  display: "grid",
  gap: "3px",
};

const bottomRow = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const locationBadge = {
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
};

const statusBadge = {
  background: "#e8fff0",
  color: "#12a150",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px",
  textTransform: "capitalize",
};

const unreadStatusBadge = {
  background: "#ffedf2",
  color: "#ff3b5c",
};

const emergencyStatusBadge = {
  background: "rgba(239,68,68,0.12)",
  color: "#dc2626",
  border: "1px solid rgba(239,68,68,0.18)",
};

const hiringStatusBadge = {
  background: "rgba(79,70,229,0.12)",
  color: "#4338ca",
  border: "1px solid rgba(79,70,229,0.18)",
};

export default MessagesInbox;
