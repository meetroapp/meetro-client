import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import { getLanguage, t } from "../utils/language";

function Chat({ setPage, currentPage }) {
  const [loading, setLoading] = useState(true);
  const [language, updateLanguage] = useState(getLanguage());

  const conversations = [
    {
      id: 1,
      quoteRequestId: 1,
      receiverId: 101,
      name: "Elite Home Services",
      projectTitle: t("bathroomRemodel"),
      location: "Fort Myers",
      message: t("estimateTomorrow"),
      time: t("twoMinutesAgo"),
      unread: true,
    },
    {
      id: 2,
      quoteRequestId: 2,
      receiverId: 102,
      name: "Rapid Repair Pros",
      projectTitle: t("outletRepair"),
      location: "Cape Coral",
      message: t("thanksPhotos"),
      time: t("oneHourAgo"),
      unread: false,
    },
    {
      id: 3,
      quoteRequestId: 3,
      receiverId: 103,
      name: "Luxury Outdoor Living",
      projectTitle: t("paverSealingProject"),
      location: "Naples",
      message: t("quoteReady"),
      time: t("threeHoursAgo"),
      unread: true,
    },
  ];

  useEffect(() => {
    const handleLanguageChange = () => {
      updateLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, [language]);

  function openConversation(conversation) {
    localStorage.setItem(
      "selectedQuoteRequestId",
      conversation.quoteRequestId
    );

    localStorage.setItem(
      "selectedMessageReceiverId",
      conversation.receiverId
    );

    localStorage.setItem(
      "selectedQuoteRequest",
      JSON.stringify({
        id: conversation.quoteRequestId,
        project_title: conversation.projectTitle,
        project_description: conversation.message,
        location: conversation.location,
        business_name: conversation.name,
      })
    );

    setPage("conversationThread");
  }

  if (loading) {
    return <LoadingScreen text={t("myMessages")} />;
  }

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <h1 style={heroTitle}>{t("myMessages")}</h1>
        <p style={heroSubtitle}>{t("chatSubtitle")}</p>
      </div>

      <div style={conversationGrid}>
        {conversations.length === 0 ? (
          <div style={emptyCard}>
            <h2 style={emptyTitle}>{t("noMessagesYet")}</h2>
            <p style={emptyText}>{t("noMessagesText")}</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => openConversation(conversation)}
              style={conversationCard}
            >
              <div style={avatarCircle}>
                {conversation.name.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <div style={topRow}>
                  <h2 style={conversationTitle}>{conversation.name}</h2>
                  <span style={timeText}>{conversation.time}</span>
                </div>

                <p style={projectText}>{conversation.projectTitle}</p>
                <p style={messageText}>{conversation.message}</p>
              </div>

              {conversation.unread && <div style={unreadDot}></div>}
            </button>
          ))
        )}
      </div>

      <BottomNav setPage={setPage} currentPage="chat" />
    </div>
  );
}

const pageWrapper = {
  background: "#f5f5f7",
  minHeight: "100vh",
  padding: "calc(env(safe-area-inset-top) + 64px) 18px 120px",
  boxSizing: "border-box",
  color: "#111",
};

const heroCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #7b61ff 100%)",
  borderRadius: "30px",
  padding: "30px 24px",
  marginBottom: "28px",
  color: "white",
  boxShadow: "0 18px 40px rgba(91,61,245,0.28)",
};

const heroTitle = {
  margin: 0,
  fontSize: "40px",
};

const heroSubtitle = {
  marginTop: "12px",
  lineHeight: 1.6,
  opacity: 0.92,
};

const conversationGrid = {
  display: "grid",
  gap: "18px",
};

const conversationCard = {
  background: "white",
  border: "none",
  borderRadius: "24px",
  padding: "18px",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  cursor: "pointer",
  textAlign: "left",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const avatarCircle = {
  width: "58px",
  height: "58px",
  borderRadius: "20px",
  background: "#f3f0ff",
  color: "#5b3df5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
  fontSize: "24px",
  flexShrink: 0,
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const conversationTitle = {
  margin: 0,
  color: "#111",
  fontSize: "20px",
};

const projectText = {
  marginTop: "6px",
  marginBottom: 0,
  color: "#5b3df5",
  fontWeight: "bold",
  fontSize: "14px",
};

const timeText = {
  color: "#888",
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const messageText = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#666",
  lineHeight: 1.5,
};

const unreadDot = {
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  background: "#5b3df5",
  flexShrink: 0,
};

const emptyCard = {
  background: "white",
  borderRadius: "24px",
  padding: "34px 20px",
  textAlign: "center",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const emptyTitle = {
  margin: "0 0 10px",
  fontSize: "24px",
  fontWeight: "900",
};

const emptyText = {
  margin: 0,
  color: "#666",
  fontSize: "16px",
  lineHeight: 1.5,
};

export default Chat;
