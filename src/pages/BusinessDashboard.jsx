import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import LoadingScreen from "../components/LoadingScreen";
import { authFetch } from "../utils/authFetch";
import { getLanguage, t } from "../utils/language";

function BusinessDashboard({ setPage, currentPage }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, updateLanguage] = useState(getLanguage());

  const businessName =
    localStorage.getItem("businessName") ||
    profile?.business_name ||
    t("yourBusiness");

  const businessCategory =
    localStorage.getItem("businessCategory") ||
    profile?.business_category ||
    localStorage.getItem("userRole") ||
    "professional";

   const [availableNow, setAvailableNow] = useState(
   localStorage.getItem("meetroAvailableNow") === "true"
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
    const handleLanguageChange = () => {
      updateLanguage(getLanguage());
    };

    window.addEventListener("languageChanged", handleLanguageChange);

    return () => {
      window.removeEventListener("languageChanged", handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [language]);

  async function fetchProfile() {
    try {
      const result = await authFetch("/my-contractor-profile", {}, setPage);

      if (result?.data?.profile) {
        setProfile(result.data.profile);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function formatCategory(value) {
    if (!value) return t("professionalUser");

    const normalizedValue = String(value)
      .replaceAll("_", "")
      .replace(/\s+/g, "")
      .toLowerCase();

    const categoryMap = {
      professional: t("professionalUser"),
      contractor: t("contractor"),
      handyman: t("handyman"),
      plumbing: t("plumbing"),
      painting: t("painting"),
      electrical: t("electrical"),
      flooring: t("flooring"),
      roofing: t("roofing"),
      hvac: t("hvac"),
      landscaping: t("landscaping"),
      lawncare: t("lawnCare"),
      treeservice: t("treeService"),
      poolservice: t("poolService"),
      cleaning: t("cleaning"),
      pressurewashing: t("pressureWashing"),
      paversealing: t("paverSealing"),
      junkremoval: t("junkRemoval"),
      demolition: t("demolition"),
      drywall: t("drywall"),
      carpentry: t("carpentry"),
      doorswindows: t("doorsWindows"),
      fencing: t("fencing"),
      concrete: t("concrete"),
      tile: t("tile"),
      appliancerepair: t("applianceRepair"),
      pestcontrol: t("pestControl"),
      moving: t("moving"),
      realestate: t("realEstate"),
      homehealthcare: t("homeHealthCare"),
      automotiveservices: t("automotiveServices"),
      cardetailing: t("carDetailing"),
      mobileservices: t("mobileServices"),
      mechanic: t("mechanic"),
      privatetransportation: t("privateTransportation"),
      other: t("otherService"),
    };

    return (
      categoryMap[normalizedValue] ||
      String(value)
        .replaceAll("_", " ")
        .replace(/([A-Z])/g, " $1")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    );
  }

  if (loading) {
    return <LoadingScreen text={t("loadingBusinessDashboard")} />;
  }

  return (
    <div style={pageWrapper}>
      <div style={topBar}>
        <div style={brandWrap}>
          <span style={brandMain}>Meetro</span>
          <span style={brandBadge}>Community</span>
        </div>

        <button
          onClick={() => {
  localStorage.setItem(
    "contractorProfileReturnPage",
    "businessDashboard"
  );

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

      <div style={heroCard}>
        <div style={heroTop}>
          <div>
            <p style={eyebrow}>{t("businessDashboard")}</p>

            <h1 style={heroTitle}>
              {t("businessGreeting")}, {businessName}! 👋
            </h1>

            <p style={heroSubtitle}>{t("businessDashboardText")}</p>
          </div>

          <div style={statusPill}>
            {availableNow ? "🟢 " : "⚪ "}
            {availableNow ? t("availableNow") : "Inactive"}
           </div>
            <div style={statusPill}>
             {localStorage.getItem("meetroDispatchReady") === "true"
               ? "🚗 Dispatch Ready"
               : "🚫 Dispatch Offline"}
           </div>
        </div>

        <div style={statsGrid}>
          <StatCard          
            title={t("newLeads")}
            value="8"
            note={t("last24h")}
            icon="📥"
            onClick={() => setPage("businessLeads")}
          />

          <StatCard          
            title={t("messages")}
            value={localStorage.getItem("mockStandardUnreadMessages") || "0"}
            note={t("unread")}
            icon="💬"
            onClick={() => setPage("messagesInbox")} 
         />

          <StatCard          
            title={t("profileViews")}
            value="32"
            note={t("thisWeek")}
            icon="👁️"
            onClick={() => setPage("businessAnalytics")}
          />

          <StatCard
            title={t("profileScore")}
            value="92%"
            note={t("great")}
            icon="👑"
            onClick={() => setPage("contractorProfile")}
          />
                 
           <StatCard
             title="Emergency"
             value={localStorage.getItem("mockEmergencyRequests") || "0"}
              note="Pending Dispatch"
             icon="🚨"
             onClick={() => setPage("contractorDashboard")}
             />        

         </div>
      </div>

      <div style={profileCard}>
        {profile?.image_url ? (
          <img src={profile.image_url} alt={businessName} style={profileImage} />
        ) : (
          <div style={profilePlaceholder}>🏢</div>
        )}

        <div style={profileInfo}>
          <h2 style={profileTitle}>{businessName}</h2>

          <p style={profileText}>{formatCategory(businessCategory)}</p>

          <div style={profileProgressWrap}>
            <div style={progressTop}>
              <span>{t("profileCompletion")}</span>
              <strong>72%</strong>
            </div>

            <div style={progressBar}>
              <div style={progressFill}></div>
            </div>
          </div>

          <button
            onClick={() => setPage("contractorProfile")}
            style={primaryButton}
          >
            {profile ? t("editBusinessProfile") : t("createBusinessProfile")}
          </button>
        </div>
      </div>

      <div style={sectionHeader}>
        <h2 style={sectionTitle}>{t("newLeadsNearYou")}</h2>

        <button onClick={() => setPage("discover")} style={viewAllButton}>
          {t("viewAllLeads")}
        </button>
      </div>

      <div style={leadList}>
        <LeadCard
          category={t("plumbing")}
          title={t("leadKitchenSink")}
          location={t("leadCapeCoral3")}
          time={t("posted1hAgo")}
          setPage={setPage}
        />

        <LeadCard
          category={t("electrical")}
          title={t("leadCeilingFan")}
          location={t("leadCapeCoral2")}
          time={t("posted2hAgo")}
          setPage={setPage}
        />

        <LeadCard
          category={t("roofing")}
          title={t("leadRoofInspection")}
          location={t("leadCapeCoral5")}
          time={t("posted3hAgo")}
          setPage={setPage}
        />
      </div>

      <h2 style={sectionTitle}>{t("businessTools")}</h2>

       
            <div style={toolsGrid}>
        <ToolButton
          icon="🧾"
          label={t("quotes")}
          text={t("projectEstimates")}
          onClick={() => {
            localStorage.setItem("meetroCommandTool", "quotes");
            setPage("businessCommandCenter");
          }}
        />

        <ToolButton
          icon="📂"
          label={t("projects")}
          text={t("activeJobs")}
          onClick={() => {
            localStorage.setItem("meetroCommandTool", "jobs");
            setPage("businessCommandCenter");
          }}
        />

        <ToolButton
          icon="🏛️"
          label={t("permits")}
          text={t("projectTracking")}
          onClick={() => {
            localStorage.setItem("meetroCommandTool", "permits");
            setPage("businessCommandCenter");
          }}
        />

        <ToolButton
          icon="📐"
          label={t("designFiles")}
          text={t("layoutsPlans")}
          onClick={() => {
            localStorage.setItem("meetroCommandTool", "plans");
            setPage("businessCommandCenter");
          }}
        />

        <ToolButton
          icon="⏰"
          label={t("followUps")}
          text={t("projectReminders")}
          onClick={() => {
            localStorage.setItem("meetroCommandTool", "reminders");
            setPage("businessCommandCenter");
          }}
        />

        <ToolButton
          icon="👥"
          label={t("clients")}
          text={t("projectHistory")}
          onClick={() => {
            localStorage.setItem("meetroCommandTool", "customers");
            setPage("businessCommandCenter");
          }}
        />
      </div>

      <div style={upgradeCard}>
        <span style={upgradeBadge}>{t("foundingPro")}</span>

        <h2 style={upgradeTitle}>{t("unlockUnlimitedLeads")}</h2>

        <p style={upgradeText}>{t("meetroProText")}</p>

        <button style={upgradeButton}>{t("upgradeToMeetroPro")}</button>
      </div>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

function StatCard({ title, value, note, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={statCard}
    >
      <div style={statTop}>
        <span style={statTitle}>{title}</span>
        <span style={statIcon}>{icon}</span>
      </div>

      <h2 style={statValue}>{value}</h2>

      <p style={statNote}>{note}</p>
    </button>
  );
}

function LeadCard({
  category,
  title,
  location,
  time,
  setPage,
}) {
  return (
    <button
      onClick={() => {
        const lead = {
          id: Date.now(),
          title,
          category,
          location,
          posted: time,
          description:
            "Customer is requesting service assistance.",
          urgency: "New",
          verified: true,
        };

        localStorage.setItem(
          "selectedQuoteRequest",
          JSON.stringify(lead)
        );

        localStorage.setItem(
          "selectedPostId",
          lead.id
        );
        
        localStorage.setItem(
  "projectDetailsReturnPage",
  "businessDashboard"
);
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

      <span style={newBadge}>{t("new")}</span>
    </button>
  );
}

function ToolButton({ icon, label, text, onClick }) {
  return (
    <button onClick={onClick} style={toolButton}>
      <div style={toolIcon}>{icon}</div>

      <strong style={toolLabel}>{label}</strong>

      <span style={toolText}>{text}</span>
    </button>
  );
}

const pageWrapper = {
  background: "#f5f5f7",
  minHeight: "100vh",
  padding: "24px 18px 130px",
  boxSizing: "border-box",
  color: "#111",
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

const profileMini = {
  width: "48px",
  height: "48px",
  borderRadius: "18px",
  border: "none",
  background: "white",
  boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
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

const heroCard = {
  background:
    "linear-gradient(135deg, #071225 0%, #142a63 48%, #173b91 100%)",
  color: "white",
  borderRadius: "34px",
  padding: "26px 22px",
  marginBottom: "26px",
  boxShadow: "0 22px 55px rgba(15,23,42,0.26)",
};

const heroTop = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  alignItems: "flex-start",
};

const eyebrow = {
  margin: 0,
  color: "rgba(219,234,254,0.9)",
  fontWeight: "800",
  fontSize: "14px",
  letterSpacing: "0.4px",
};

const heroTitle = {
  margin: "16px 0 14px",
  fontSize: "clamp(24px, 5vw, 36px)",
  lineHeight: "1.12",
  letterSpacing: "-1.4px",
  fontWeight: "800",
  color: "#dbeafe",
  maxWidth: "820px",
};

const heroSubtitle = {
  margin: "0 0 10px",
  color: "#aebee3",
  lineHeight: 1.6,
  fontSize: "15px",
  maxWidth: "620px",
};

const statusPill = {
  background: "rgba(255,255,255,0.14)",
  color: "white",
  padding: "12px 16px",
  borderRadius: "999px",
  fontWeight: "900",
  whiteSpace: "nowrap",
  fontSize: "14px",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "18px",
  marginTop: "22px",
};

const statCard = {
  background: "rgba(255,255,255,0.12)",
  borderRadius: "26px",
  padding: "18px",
  backdropFilter: "blur(16px)",
  minHeight: "125px",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
};

const statTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  opacity: 0.95,
};

const statTitle = {
  fontSize: "18px",
  lineHeight: 1.35,
  color: "#cbd8f5",
  fontWeight: "500",
};

const statIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
};

const statValue = {
  margin: "24px 0 10px",
  fontSize: "42px",
  lineHeight: 1,
  color: "#e8efff",
  fontWeight: "700",
};

const statNote = {
  margin: 0,
  opacity: 0.78,
  fontSize: "17px",
  color: "#9fb0d8",
};

const profileCard = {
  background: "white",
  borderRadius: "28px",
  padding: "18px",
  display: "flex",
  gap: "16px",
  marginBottom: "26px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const profileImage = {
  width: "104px",
  height: "104px",
  borderRadius: "24px",
  objectFit: "cover",
};

const profilePlaceholder = {
  width: "104px",
  height: "104px",
  borderRadius: "24px",
  background: "#f3f0ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "42px",
};

const profileInfo = {
  flex: 1,
};

const profileTitle = {
  margin: 0,
  fontSize: "22px",
};

const profileText = {
  margin: "6px 0 12px",
  color: "#667085",
};

const profileProgressWrap = {
  marginBottom: "14px",
};

const progressTop = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "13px",
  marginBottom: "6px",
};

const progressBar = {
  height: "9px",
  borderRadius: "999px",
  background: "#eee",
  overflow: "hidden",
};

const progressFill = {
  width: "72%",
  height: "100%",
  background: "#5b3df5",
};

const primaryButton = {
  border: "none",
  background: "#5b3df5",
  color: "white",
  padding: "13px 16px",
  borderRadius: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
};

const sectionTitle = {
  margin: "0 0 12px",
  fontSize: "23px",
  color: "#111",
};

const viewAllButton = {
  border: "none",
  background: "transparent",
  color: "#5b3df5",
  fontWeight: "bold",
  cursor: "pointer",
};

const leadList = {
  background: "white",
  borderRadius: "24px",
  overflow: "hidden",
  marginBottom: "26px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
};

const leadCard = {
  width: "100%",
  border: "none",
  background: "white",
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "14px",
  borderBottom: "1px solid #eee",
  textAlign: "left",
  cursor: "pointer",
};

const leadThumb = {
  width: "72px",
  height: "72px",
  borderRadius: "16px",
  background: "#f3f0ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
};

const leadBadge = {
  background: "#f3f0ff",
  color: "#5b3df5",
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
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
  fontWeight: "bold",
  fontSize: "12px",
};

const toolsGrid = {
  background: "white",
  borderRadius: "24px",
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  overflow: "hidden",
  marginBottom: "26px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
};

const toolButton = {
  border: "none",
  background: "white",
  padding: "16px 8px",
  display: "grid",
  gap: "6px",
  justifyItems: "center",
  cursor: "pointer",
  borderRight: "1px solid #eee",
};

const toolIcon = {
  fontSize: "28px",
};

const toolLabel = {
  fontSize: "13px",
  textAlign: "center",
  lineHeight: 1.25,
};

const toolText = {
  color: "#667085",
  fontSize: "12px",
  textAlign: "center",
};

const upgradeCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #8b5cf6 100%)",
  color: "white",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 18px 40px rgba(91,61,245,0.24)",
};

const upgradeBadge = {
  background: "rgba(255,255,255,0.18)",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
};

const upgradeTitle = {
  margin: "18px 0 8px",
  fontSize: "26px",
};

const upgradeText = {
  lineHeight: 1.6,
  opacity: 0.92,
};

const upgradeButton = {
  border: "none",
  background: "white",
  color: "#5b3df5",
  padding: "15px 18px",
  borderRadius: "18px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "14px",
};

export default BusinessDashboard;
