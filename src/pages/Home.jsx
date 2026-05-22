import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage, setLanguage, t } from "../utils/language";

function Home({ setPage }) {
  const [language, updateLanguage] = useState(getLanguage());
  const [activeMode, setActiveMode] = useState(
    localStorage.getItem("activeAccountMode") || "personal"
  );

  const userRole = localStorage.getItem("userRole") || "standard";
  const accountType = localStorage.getItem("accountType") || "homeowner";
  const businessName = localStorage.getItem("businessName") || "";
  const businessCategory = localStorage.getItem("businessCategory") || "";
  const userName =
    localStorage.getItem("userName") ||
    localStorage.getItem("userEmail") ||
    t("there");

  const hasBusinessAccess =
    accountType === "professional" ||
    userRole === "professional" ||
    userRole === "contractor" ||
    businessName ||
    businessCategory;

  const isBusinessMode = activeMode === "business" && hasBusinessAccess;

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

    localStorage.setItem("activeAccountMode", mode);
    setActiveMode(mode);
    window.dispatchEvent(new Event("accountModeChanged"));

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
            onClick={() => setPage("projectGallery")}
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

      <div style={quickGrid}>
        <QuickCard
          icon="🔎"
          title={t("findContractors")}
          text={t("findContractorsText")}
          onClick={() => setPage("discover")}
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
  title="Emergency Help"
  text="Urgent home service help when you need fast support."
  onClick={() => setPage("emergency")}
/>
      </div>

      <div style={sectionHeader}>
        <h2 style={sectionTitle}>{t("myActiveProjects")}</h2>

        <button style={textButton} onClick={() => setPage("upload")}>
          {t("viewAll")}
        </button>
      </div>

      <div style={emptyCard}>
        <h3 style={emptyTitle}>{t("noActiveProjectYet")}</h3>
        <p style={mutedText}>{t("postFirstProjectText")}</p>

        <button style={primaryButton} onClick={() => setPage("upload")}>
          {t("postAProject")}
        </button>
      </div>

      <h2 style={sectionTitle}>{t("recommendedNearYou")}</h2>

      <div style={proList}>
        <ProCard
          name="Elite Home Services"
          category={t("generalContractor")}
          location="Fort Myers"
          onClick={() => setPage("contractorProfile")}
        />

        <ProCard
          name="Rapid Repair Pros"
          category={t("handyman")}
          location="Cape Coral"
          onClick={() => setPage("contractorProfile")}
        />

        <ProCard
          name="Luxury Outdoor Living"
          category={t("paverSealing")}
          location="Naples"
          onClick={() => setPage("contractorProfile")}
        />
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
  fontSize: "30px",
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
  borderRadius: "32px",
  padding: "30px 24px",
  marginBottom: "22px",
  boxShadow: "0 18px 40px rgba(91,61,245,0.28)",
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
  margin: "12px 0",
  fontSize: "36px",
  lineHeight: 1.15,
};

const businessTitle = {
  margin: "12px 0",
  fontSize: "34px",
  lineHeight: 1.15,
  textAlign: "center",
};

const heroText = {
  margin: "0 0 22px",
  fontSize: "18px",
  lineHeight: 1.5,
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

const quickGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
  marginBottom: "24px",
};

const quickCard = {
  border: "none",
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  textAlign: "left",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
  cursor: "pointer",
};

const quickIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  background: "#f3f0ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  marginBottom: "12px",
};

const quickTitle = {
  margin: "0 0 6px",
  fontSize: "18px",
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
  width: "58px",
  height: "58px",
  borderRadius: "18px",
  background: "#f3f0ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px",
};

const proName = {
  margin: "0 0 4px",
  fontSize: "17px",
  color: "#111",
};

const proMeta = {
  margin: 0,
  color: "#666",
  fontSize: "13px",
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
  fontSize: "30px",
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
