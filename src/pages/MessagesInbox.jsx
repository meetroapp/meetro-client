import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import SafeBackBar from "../components/SafeBackBar";
import LoadingScreen from "../components/LoadingScreen";
import { authFetch } from "../utils/authFetch";
import { isProfessionalSession } from "../utils/session";
import { getLanguage, t } from "../utils/language";


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

  return list.filter(
    (item) => !deletedIds.includes(item.id)
  );
}

function getConversationRegistry() {
  try {
    return JSON.parse(
      localStorage.getItem("meetro_conversation_registry") || "[]"
    );
  } catch {
    return [];
  }
}

function saveConversationRegistryItem(item) {
  const registry = getConversationRegistry();

  const normalized = {
    id: String(item.id),
    project_title: item.project_title || item.name || "Conversation",
    project_description:
      item.project_description || item.lastMessage || "Tap to open conversation",
    homeowner_email: item.homeowner_email || item.customer || item.name || "Contact",
    location: item.location || "Saved Contact",
    status: item.saved_to_history
      ? "Saved History"
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


function MessagesInbox({ setPage, currentPage }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, updateLanguage] = useState(getLanguage());
  const [messageView, setMessageViewState] = useState(
    localStorage.getItem("meetroMessageView") || "active"
  );

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

  const activeJobId =
    localStorage.getItem("activeJobId");

  const emergencyConversationId = `emergency-active-request-${currentUserKey}`;

  const emergencySaved =
    localStorage.getItem(`meetro_conversation_${emergencyConversationId}`) ||
    localStorage.getItem(`meetro_emergency_conversation_meta_${currentUserKey}`);

  if (!emergencySaved) return null;

  const emergencyService =
    localStorage.getItem(`selectedEmergencyService_${currentUserKey}`) ||
    localStorage.getItem("activeJobService") ||
    localStorage.getItem("selectedEmergencyService") ||
    (isSpanish ? "Emergencia" : "Emergency Request");

  return {
    id: emergencyConversationId,
    project_title: emergencyService,
    project_description: isSpanish
      ? "Conversación de emergencia activa guardada."
      : "Saved active emergency conversation.",
    homeowner_email: isSpanish ? "Cliente de Emergencia" : "Emergency Client",
    location: "Cape Coral",
    status: isSpanish ? "emergencia" : "emergency",
    unread:
      localStorage.getItem(`meetro_conversation_read_${emergencyConversationId}`) !==
      "true",
    conversation_type: "emergency",
  };
}

  function mergeEmergencyConversation(list) {
    const emergencyConversation = getEmergencyConversation();

    if (!emergencyConversation) return list;

    const withoutDuplicate = list.filter(
      (item) => String(item.id) !== "emergency-active-request"
    );

    return [emergencyConversation, ...withoutDuplicate];
  }

  useEffect(() => {
    const handleLanguageChange = () => {
      updateLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", handleLanguageChange);
    window.addEventListener("meetroLanguageChanged", handleLanguageChange);
    window.addEventListener("meetro-language-change", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
      window.removeEventListener("meetroLanguageChanged", handleLanguageChange);
      window.removeEventListener("meetro-language-change", handleLanguageChange);
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
    const activeQuotes = quotes.filter((quote) => !quote.saved_to_history);
  const savedQuotes = quotes.filter((quote) => quote.saved_to_history);
  const visibleQuotes = messageView === "saved" ? savedQuotes : activeQuotes;

  const unreadCount = visibleQuotes.filter((quote) => quote.unread).length;

    localStorage.setItem("mockUnreadMessages", String(unreadCount));

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
        saved_to_history:
          item.saved_to_history ||
          localStorage.getItem(`meetro_conversation_saved_${item.id}`) === "true",
        status:
          item.saved_to_history ||
          localStorage.getItem(`meetro_conversation_saved_${item.id}`) === "true"
            ? isSpanish
              ? "Historial guardado"
              : "Saved History"
            : item.status,
      }));

      const localBusinessConversations = Object.keys(localStorage)
        .filter((key) => key.startsWith("meetro_conversation_business_"))
        .map((key) => {
          const id = key.replace("meetro_conversation_", "");
          const meta = JSON.parse(
            localStorage.getItem(`meetro_conversation_meta_${id}`) || "{}"
          );

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
              localStorage.getItem(`meetro_conversation_read_${id}`) === "false",
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

  function openConversation(quote) {
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

    localStorage.setItem(`meetro_conversation_read_${quote.id}`, "true");

    const updatedQuotes = quotes.map((item) =>
      item.id === quote.id ? { ...item, unread: false } : item
    );

    setQuotes(updatedQuotes);

    const unreadCount = updatedQuotes.filter((item) => item.unread).length;

    localStorage.setItem("mockUnreadMessages", String(unreadCount));

    window.dispatchEvent(new Event("storage"));

    localStorage.setItem("selectedQuoteRequestId", String(quote.id));
    localStorage.setItem("selectedQuoteRequest", JSON.stringify(quote));
    localStorage.setItem("selectedMessageReceiverId", quote.homeowner_id || "");
    localStorage.setItem("conversationReturnPage", "messagesInbox");
    localStorage.setItem("activeConversationId", String(quote.id));

    localStorage.setItem(
      "activeConversationName",
      quote.project_title ||
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

    setPage("conversationThread");
  }

  const activeQuotes = quotes.filter((quote) => !quote.saved_to_history);
  const savedQuotes = quotes.filter((quote) => quote.saved_to_history);
  const visibleQuotes = messageView === "saved" ? savedQuotes : activeQuotes;

  const unreadCount = visibleQuotes.filter((quote) => quote.unread).length;

  const emergencyCount = quotes.filter(
    (quote) => quote.conversation_type === "emergency"
  ).length;

  if (loading) {
    return <LoadingScreen text={t("loadingMessages")} />;
  }

  return (
    <div style={{ ...pageWrapper, paddingTop: "calc(env(safe-area-inset-top) + 64px)" }}>
      <SafeBackBar setPage={setPage} fallback="businessDashboard" label="← Back to Dashboard" />

      <div style={heroCard}>
        <div>
          <p style={eyebrow}>
            {isSpanish ? "Centro de Clientes" : "Customer Center"}
          </p>

          <h1 style={pageTitle}>{t("messages")}</h1>

          <p style={pageSubtitle}>{t("messagesInboxSubtitle")}</p>
        </div>

        {unreadCount > 0 && (
          <div style={unreadHeroBadge}>
            <div style={unreadNumber}>{unreadCount}</div>

            <span style={unreadLabel}>
              {isSpanish ? "sin leer" : "unread"}
            </span>
          </div>
        )}
      </div>

      <div style={summaryGrid}>
        <div style={summaryCard}>
          <strong>{activeQuotes.length}</strong>
          <span>{isSpanish ? "Activos" : "Active"}</span>
        </div>

        <div style={summaryCard}>
          <strong>{unreadCount}</strong>
          <span>{isSpanish ? "Sin leer" : "Unread"}</span>
        </div>

        <div style={summaryCard}>
          <strong>{savedQuotes.length}</strong>
          <span>{isSpanish ? "Historial" : "Saved"}</span>
        </div>
      </div>

      <div style={messageTabs}>
        <button
          style={{
            ...messageTab,
            ...(messageView === "active" ? activeMessageTab : {}),
          }}
          onClick={() => setMessageView("active")}
        >
          {isSpanish ? "Activos" : "Active Messages"}
        </button>

        <button
          style={{
            ...messageTab,
            ...(messageView === "saved" ? activeMessageTab : {}),
          }}
          onClick={() => setMessageView("saved")}
        >
          💾 {isSpanish ? "Historial guardado" : "Saved History"}
        </button>
      </div>

      {visibleQuotes.length === 0 && (
        <div style={emptyCard}>
          <div style={emptyIcon}>💬</div>

          <h2 style={emptyTitle}>{t("noMessagesYet")}</h2>

          <p style={emptyText}>{t("noMessagesInboxText")}</p>
        </div>
      )}

      <div style={conversationList}>
        {visibleQuotes.map((quote) => (
          <div
            key={quote.id}
            onClick={() => openConversation(quote)}
            role="button"
            tabIndex={0}
            style={{
              ...conversationCard,
              ...(quote.unread ? unreadConversationCard : {}),
              ...(quote.conversation_type === "emergency"
                ? emergencyConversationCard
                : {}),
              ...(quote.saved_to_history ? savedHistoryCard : {}),
            }}
          >
            <div
              style={{
                ...avatarCircle,
                ...(quote.unread ? unreadAvatar : {}),
                ...(quote.conversation_type === "emergency"
                  ? emergencyAvatar
                  : {}),
              }}
            >
              {quote.conversation_type === "emergency"
                ? "🚨"
                : (quote.homeowner_email || "H").charAt(0).toUpperCase()}
            </div>

            <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
              <div style={topRow}>
                <h2
                  style={{
                    ...conversationTitle,
                    fontWeight: quote.unread ? "900" : "800",
                  }}
                >
                  {quote.project_title || t("projectConversation")}
                </h2>

                <div style={rightStack}>
                  <span style={timeText}>{t("recent")}</span>

                  {quote.unread && <span style={unreadDot}></span>}

                  <button
                    onClick={(e)=>deleteConversation(e,quote.id)}
                    style={{
                      border:"none",
                      background:"transparent",
                      cursor:"pointer",
                      fontSize:"18px",
                      color:"#ef4444",
                      padding:"4px"
                    }}
                  >
                    🗑️
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

              <div style={bottomRow}>
                <span style={locationBadge}>
                  📍 {quote.location || t("location")}
                </span>

                <span
                  style={{
                    ...statusBadge,
                    ...(quote.unread ? unreadStatusBadge : {}),
                    ...(quote.conversation_type === "emergency"
                      ? emergencyStatusBadge
                      : {}),
                    ...(quote.saved_to_history ? savedHistoryBadge : {}),
                  }}
                >
                  {quote.status || t("new")}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>


        <BottomNav setPage={setPage} currentPage="messagesInbox" />
    </div>
  );
}

const pageWrapper = {
  background:
    "radial-gradient(circle at top left, #eef0ff 0%, transparent 32%), linear-gradient(to bottom, #f7f7fb, #eef0f7)",
  minHeight: "100vh",
  padding: "calc(env(safe-area-inset-top) + 64px) 18px 170px",
  boxSizing: "border-box",
  color: "#111827",
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
  background:
    "linear-gradient(135deg, #111b46 0%, #263b92 45%, #5b3df5 100%)",
  borderRadius: "30px",
  padding: "22px",
  marginBottom: "16px",
  color: "white",
  boxShadow: "0 22px 55px rgba(35,54,139,0.30)",
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  alignItems: "flex-start",
};

const eyebrow = {
  margin: 0,
  color: "#c8d4ee",
  fontWeight: "900",
  fontSize: "13px",
  letterSpacing: "0.4px",
};

const pageTitle = {
  fontSize: "34px",
  margin: "10px 0 8px",
  color: "#eef4ff",
  lineHeight: 1,
  fontWeight: "800",
};

const pageSubtitle = {
  color: "#c8d4ee",
  margin: 0,
  fontSize: "15px",
  lineHeight: 1.5,
};

const unreadHeroBadge = {
  minWidth: "78px",
  height: "78px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.14)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
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

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginBottom: "18px",
};

const summaryCard = {
  background: "white",
  borderRadius: "20px",
  padding: "14px 8px",
  textAlign: "center",
  display: "grid",
  gap: "4px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
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
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  marginBottom: "16px",
};

const messageTab = {
  border: "1px solid rgba(91,61,245,0.14)",
  background: "#ffffff",
  color: "#5b3df5",
  borderRadius: "18px",
  padding: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const activeMessageTab = {
  background: "linear-gradient(135deg, #7357ff, #5b3df5)",
  color: "#ffffff",
  boxShadow: "0 10px 24px rgba(91,61,245,0.18)",
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

const unreadConversationCard = {
  border: "2px solid #d9d0ff",
  background: "#f8f6ff",
};

const emergencyConversationCard = {
  border: "2px solid rgba(239,68,68,0.25)",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,241,242,0.95))",
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

const unreadAvatar = {
  background: "#5b3df5",
  color: "white",
};

const emergencyAvatar = {
  background: "#fee2e2",
  color: "#dc2626",
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
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

export default MessagesInbox;
