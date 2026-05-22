import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";

function MessagesInbox({ setPage, currentPage }) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, updateLanguage] = useState(getLanguage());

  const isSpanish = language === "es";

  const demoQuotes = [
    {
      id: 1,
      project_title: isSpanish
        ? "Reparación de Llave de Cocina"
        : "Kitchen Faucet Repair",
      project_description: isSpanish
        ? "Cliente necesita reemplazar una llave con fuga."
        : "Customer needs help replacing a leaking faucet.",
      homeowner_email: "Sarah",
      location: "Cape Coral",
      status: isSpanish ? "nuevo" : "new",
      unread: true,
      conversation_type: "standard",
    },
    {
      id: 2,
      project_title: isSpanish ? "Parche de Drywall" : "Drywall Patch",
      project_description: isSpanish
        ? "Necesita reparación de drywall después de trabajo de plomería."
        : "Needs drywall repair after plumbing work.",
      homeowner_email: "Michael",
      location: "Fort Myers",
      status: isSpanish ? "nuevo" : "new",
      unread: true,
      conversation_type: "standard",
    },
    {
      id: 3,
      project_title: isSpanish
        ? "Instalación de Abanico"
        : "Ceiling Fan Install",
      project_description: isSpanish
        ? "Necesita instalar un abanico en la sala."
        : "Needs a ceiling fan installed in the living room.",
      homeowner_email: "David",
      location: "Naples",
      status: isSpanish ? "cotizado" : "quoted",
      unread: false,
      conversation_type: "standard",
    },
  ];

   function getEmergencyConversation() {
  const currentUserKey =
    localStorage.getItem("userId") ||
    localStorage.getItem("userEmail") ||
    "guest";

  const emergencyConversationId = `emergency-active-request-${currentUserKey}`;

  const emergencySaved =
    localStorage.getItem(`meetro_conversation_${emergencyConversationId}`) ||
    localStorage.getItem(`meetro_emergency_conversation_meta_${currentUserKey}`);

  if (!emergencySaved) return null;

  const emergencyService =
    localStorage.getItem(`selectedEmergencyService_${currentUserKey}`) ||
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
    window.addEventListener(
      "meetroEmergencyConversationUpdated",
      refreshMessages
    );

    return () => {
      window.removeEventListener("focus", refreshMessages);
      window.removeEventListener("storage", refreshMessages);
      window.removeEventListener(
        "meetroEmergencyConversationUpdated",
        refreshMessages
      );
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    const unreadCount = quotes.filter((quote) => quote.unread).length;

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

      if (!result) {
        nextQuotes = demoQuotes.map((quote) => ({
          ...quote,
          unread:
            quote.unread && !readConversationIds.includes(String(quote.id)),
        }));
      } else {
        const incomingQuotes = result.data.quotes || [];

        if (incomingQuotes.length > 0) {
          nextQuotes = incomingQuotes.map((quote, index) => ({
            ...quote,
            conversation_type: quote.conversation_type || "standard",
            unread:
              index < 2 && !readConversationIds.includes(String(quote.id)),
          }));
        } else {
          nextQuotes = demoQuotes.map((quote) => ({
            ...quote,
            unread:
              quote.unread && !readConversationIds.includes(String(quote.id)),
          }));
        }
      }

      setQuotes(mergeEmergencyConversation(nextQuotes));
    } catch (error) {
      console.error(error);
      setQuotes(mergeEmergencyConversation(demoQuotes));
    } finally {
      setLoading(false);
    }
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

    setPage("conversationThread");
  }

  const unreadCount = quotes.filter((quote) => quote.unread).length;

  const emergencyCount = quotes.filter(
    (quote) => quote.conversation_type === "emergency"
  ).length;

  if (loading) {
    return <LoadingScreen text={t("loadingMessages")} />;
  }

  return (
    <div style={pageWrapper}>
      <button
  onClick={() => {
    const accountType = localStorage.getItem("accountType") || "standard";
    const userRole = localStorage.getItem("userRole") || "standard";

    const isBusinessUser =
      accountType !== "standard" ||
      ["professional", "contractor", "business"].includes(userRole);

    setPage(isBusinessUser ? "businessDashboard" : "home");
  }}
  style={backButton}
>
        ← {t("backToDashboard")}
      </button>

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
          <strong>{quotes.length}</strong>
          <span>{isSpanish ? "Conversaciones" : "Conversations"}</span>
        </div>

        <div style={summaryCard}>
          <strong>{unreadCount}</strong>
          <span>{isSpanish ? "Sin leer" : "Unread"}</span>
        </div>

        <div style={summaryCard}>
          <strong>{emergencyCount}</strong>
          <span>{isSpanish ? "Emergencia" : "Emergency"}</span>
        </div>
      </div>

      {quotes.length === 0 && (
        <div style={emptyCard}>
          <div style={emptyIcon}>💬</div>

          <h2 style={emptyTitle}>{t("noMessagesYet")}</h2>

          <p style={emptyText}>{t("noMessagesInboxText")}</p>
        </div>
      )}

      <div style={conversationList}>
        {quotes.map((quote) => (
          <button
            key={quote.id}
            onClick={() => openConversation(quote)}
            style={{
              ...conversationCard,
              ...(quote.unread ? unreadConversationCard : {}),
              ...(quote.conversation_type === "emergency"
                ? emergencyConversationCard
                : {}),
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
                  }}
                >
                  {quote.status || t("new")}
                </span>
              </div>
            </div>
          </button>
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
  padding: "22px 18px 120px",
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
  borderRadius: "32px",
  padding: "26px",
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
  fontSize: "40px",
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
