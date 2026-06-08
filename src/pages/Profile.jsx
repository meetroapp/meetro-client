import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import { getLanguage, setLanguage, t } from "../utils/language";
import { authFetch, clearMeetroSession } from "../utils/authFetch";
import { isProfessionalSession, setActiveAccountMode } from "../utils/session";

function Profile({ setPage, currentPage }) {
  const [user, setUser] = useState(null);
  const [language, updateLanguage] = useState(getLanguage());
  const [activeSection, setActiveSection] = useState("account");
  const [activeMode, setActiveMode] = useState(
    localStorage.getItem("activeAccountMode") || "personal"
  );

  const currentPhotoKey =
    activeMode === "business"
      ? "meetroBusinessProfilePhoto"
      : "meetroPersonalProfilePhoto";

  const [profilePhoto, setProfilePhoto] = useState(
    localStorage.getItem(currentPhotoKey) || ""
  );

  useEffect(() => {
    const nextPhotoKey =
      activeMode === "business"
        ? "meetroBusinessProfilePhoto"
        : "meetroPersonalProfilePhoto";

    setProfilePhoto(localStorage.getItem(nextPhotoKey) || "");
  }, [activeMode]);

  const businessName = localStorage.getItem("businessName") || "";
  const businessCategory = localStorage.getItem("businessCategory") || "";
  const userName = localStorage.getItem("userName") || "";
  const userEmail = localStorage.getItem("userEmail") || "";

  const contractorProfileComplete =
    localStorage.getItem("contractorProfileComplete") === "true";

  const hasBusinessAccess =
    isProfessionalSession() ||
    contractorProfileComplete ||
    Boolean(localStorage.getItem("businessName")) ||
    Boolean(localStorage.getItem("businessCategory"));

  const isBusinessMode = activeMode === "business" && hasBusinessAccess;

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
    async function fetchUser() {
      try {
        const result = await authFetch(
          "/auth/me",
          {},
          setPage
        );

        if (!result.response?.ok) {
          setUser(null);
          return;
        }

        setUser(result.data?.user || null);
      } catch (error) {
        console.error(error);
      }
    }

    fetchUser();
  }, [language]);

  function handleProfilePhotoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const imageResult = reader.result;

      setProfilePhoto(imageResult);

      const photoKey =
        activeMode === "business"
          ? "meetroBusinessProfilePhoto"
          : "meetroPersonalProfilePhoto";

      localStorage.setItem(photoKey, imageResult);

      if (activeMode !== "business") {
        localStorage.setItem("meetroPersonalProfilePhoto", imageResult);
      }

      if (activeMode !== "business") {
        authFetch(
          "/auth/profile-photo",
          {
            method: "PUT",
            body: JSON.stringify({
              profile_photo_url: imageResult,
            }),
          },
          setPage
        )
          .then((result) => {
            const savedUrl =
              result?.user?.profile_photo_url || imageResult;

            localStorage.setItem("meetroPersonalProfilePhoto", savedUrl);
            setProfilePhoto(savedUrl);
          })
          .catch((error) => {
            console.error("Failed to save profile photo", error);
          });
      }

      window.dispatchEvent(
        new Event("meetro-profile-photo-updated")
      );
    };

    reader.readAsDataURL(file);
  }

  function handleLogout() {
    clearMeetroSession();

    window.location.hash = "login";

    window.location.reload();
  }

  function toggleLanguage() {
    const nextLanguage = language === "en" ? "es" : "en";
    setLanguage(nextLanguage);
    updateLanguage(nextLanguage);
  }

  function switchMode(mode) {
    if (mode === "business" && !hasBusinessAccess) {
      setActiveSection("professional");
      return;
    }

    setActiveAccountMode(mode);
    localStorage.setItem("meetroPreferredAccountMode", mode);
    setActiveMode(mode);

    const nextPage = mode === "business" ? "businessDashboard" : "home";

    window.location.hash = nextPage;
    window.dispatchEvent(new Event("accountModeChanged"));

    setPage(nextPage);
  }

  function openProfessionalPage(pageName) {
    if (!hasBusinessAccess) {
      setActiveSection("professional");
      return;
    }

    setPage(pageName);
  }

  function toggleSection(section) {
    setActiveSection(activeSection === section ? "" : section);
  }

  const displayName =
    isBusinessMode && businessName
      ? businessName
      : userName || user?.name || user?.email || userEmail || t("meetroAccount");

  const displayEmail = user?.email || userEmail || t("emailNotAvailable");

  return (
    <div style={pageWrapper}>
      <div style={heroCard}>
        <label style={avatarUploadWrap}>
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt="Profile"
              style={profileAvatarImage}
            />
          ) : (
            <div style={avatarCircle}>{isBusinessMode ? "🏢" : "👤"}</div>
          )}

          <div style={uploadPhotoBadge}>📷</div>

          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleProfilePhotoUpload}
          />
        </label>

        <h1 style={pageTitle}>{t("settings")}</h1>

        <h2 style={userNameStyle}>{displayName}</h2>

        <p style={accountText}>{displayEmail}</p>

        <span style={accountBadge}>
          {isBusinessMode ? t("businessMode") : t("personalMode")}
        </span>
      </div>

      <div style={modeCard}>
        <h2 style={sectionTitle}>{t("accountMode")}</h2>

        <div style={modeToggle}>
          <button
            onClick={() => switchMode("personal")}
            style={{
              ...modeButton,
              ...(activeMode === "personal" ? activeModeButton : {}),
            }}
          >
            🏠 {t("personal")}
          </button>

          <button
            onClick={() => switchMode("business")}
            style={{
              ...modeButton,
              ...(activeMode === "business" ? activeModeButton : {}),
              ...(!hasBusinessAccess ? disabledModeButton : {}),
            }}
          >
            🧰 {t("business")}
          </button>
        </div>

        {!hasBusinessAccess && (
          <p style={helperText}>{t("createBusinessProfileFirst")}</p>
        )}
      </div>

      <SettingsSection
        title={t("accountSettings")}
        icon="⚙️"
        open={activeSection === "account"}
        onClick={() => toggleSection("account")}
      >
        <SettingRow
          icon="🌐"
          label={t("language")}
          value={language === "en" ? t("english") : t("spanish")}
          onClick={toggleLanguage}
        />

        <SettingRow
          icon="🏠"
          label={t("dashboard")}
          value={t("open")}
          onClick={() => setPage(isBusinessMode ? "businessDashboard" : "home")}
        />

        <SettingRow
          icon="🔔"
          label={t("notifications")}
          value={t("comingSoon")}
          onClick={() => {}}
        />
      </SettingsSection>

      <SettingsSection
        title={t("security")}
        icon="🔐"
        open={activeSection === "security"}
        onClick={() => toggleSection("security")}
      >
        <SettingRow
          icon="🔢"
          label={t("twoFactorAuthentication")}
          value={t("recommended")}
          onClick={() => {}}
        />

        <SettingRow
          icon="😊"
          label={t("faceIdTouchId")}
          value={t("comingSoon")}
          onClick={() => {}}
        />

        <SettingRow
          icon="📱"
          label={t("trustedDevices")}
          value={t("comingSoon")}
          onClick={() => {}}
        />

        <SettingRow
          icon="🧾"
          label={t("backupCodes")}
          value={t("comingSoon")}
          onClick={() => {}}
        />
      </SettingsSection>

      <SettingsSection
        title={t("professionalAccess")}
        icon={hasBusinessAccess ? "💼" : "🔒"}
        open={activeSection === "professional"}
        onClick={() => toggleSection("professional")}
      >
        {!hasBusinessAccess ? (
          <div style={lockedProBox}>
            <div style={lockedIcon}>🔒</div>

            <h3 style={lockedTitle}>{t("professionalAccess")}</h3>

            <p style={lockedText}>
              Create your business profile to unlock leads, analytics, customer
              messaging, emergency jobs, project gallery, and contractor tools.
            </p>

            <button
              style={primaryButton}
              onClick={() => setPage("contractorProfile")}
            >
              {t("createBusinessProfile")}
            </button>
          </div>
        ) : (
          <>
            <SettingRow
              icon="🧰"
              label={t("businessProfile")}
              value={t("manage")}
              onClick={() => setPage("contractorProfile")}
            />

            <SettingRow
              icon="📥"
              label={t("leads")}
              value={t("open")}
              onClick={() => openProfessionalPage("discover")}
            />

            <SettingRow
              icon="💬"
              label={t("messages")}
              value={t("messages")}
              onClick={() => openProfessionalPage("messagesInbox")}
            />

            <SettingRow
              icon="📸"
              label={t("projectGallery")}
              value={language === "es" ? "Portafolio" : "Portfolio"}
              onClick={() => openProfessionalPage("projectGallery")}
            />

            <SettingRow
              icon="📊"
              label={t("analytics")}
              value={t("insights")}
              onClick={() => openProfessionalPage("businessDashboard")}
            />
          </>
        )}
      </SettingsSection>

      <SettingsSection
        title={t("aiAssistantSettings")}
        icon="🤖"
        open={activeSection === "ai"}
        onClick={() => toggleSection("ai")}
      >
        <SettingRow
          icon="💡"
          label={t("smartReplies")}
          value={t("comingSoon")}
          onClick={() => {}}
        />

        <SettingRow
          icon="📝"
          label={t("autoQuotes")}
          value={t("comingSoon")}
          onClick={() => {}}
        />

        <SettingRow
          icon="📍"
          label={t("leadSuggestions")}
          value={t("comingSoon")}
          onClick={() => {}}
        />
      </SettingsSection>

      <SettingsSection
        title={t("emergencyServices")}
        icon="🚨"
        open={activeSection === "emergency"}
        onClick={() => toggleSection("emergency")}
      >
        <SettingRow
          icon="🟢"
          label={t("availableNow")}
          value={t("comingSoon")}
          onClick={() => {}}
        />

        <SettingRow
          icon="📍"
          label={t("emergencyRadius")}
          value={t("comingSoon")}
          onClick={() => {}}
        />

        <SettingRow
          icon="⚡"
          label={t("priorityLeads")}
          value={t("comingSoon")}
          onClick={() => {}}
        />
      </SettingsSection>

      <SettingsSection
        title={t("helpAndSupport")}
        icon="❓"
        open={activeSection === "support"}
        onClick={() => toggleSection("support")}
      >
        <SettingRow
          icon="📩"
          label={t("contactSupport")}
          value={t("open")}
          onClick={() => {}}
        />

        <SettingRow
          icon="⚠️"
          label={t("reportIssue")}
          value={t("open")}
          onClick={() => {}}
        />

        <SettingRow
          icon="📘"
          label={t("termsPolicies")}
          value={t("open")}
          onClick={() => {}}
        />
      </SettingsSection>

      <div style={proCard}>
        <span style={proBadge}>{t("meetroPro")}</span>

        <h2 style={proTitle}>{t("growWithMeetro")}</h2>

        <p style={proText}>{t("meetroProSettingsText")}</p>

        <button style={proButton}>{t("upgradeToMeetroPro")}</button>
      </div>

      <div style={statusCard}>
        <h2 style={sectionTitle}>{t("accountStatus")}</h2>

        <p style={statusText}>{t("authenticatedAccount")}</p>

        <p style={mutedText}>
          {isBusinessMode
            ? t("professionalAccountText")
            : t("standardAccountText")}
        </p>
      </div>

      <button onClick={handleLogout} style={logoutButton}>
        {t("logout")}
      </button>

      <BottomNav setPage={setPage} currentPage="profile" />
    </div>
  );
}

function SettingsSection({ title, icon, open, onClick, children }) {
  return (
    <div style={sectionCard}>
      <button onClick={onClick} style={sectionHeader}>
        <span style={sectionHeaderLeft}>
          <span style={sectionIcon}>{icon}</span>
          <strong>{title}</strong>
        </span>

        <span style={chevron}>{open ? "⌃" : "⌄"}</span>
      </button>

      {open && <div style={sectionBody}>{children}</div>}
    </div>
  );
}

function SettingRow({ icon, label, value, onClick }) {
  return (
    <button onClick={onClick} style={settingRow}>
      <span style={settingLeft}>
        <span style={rowIcon}>{icon}</span>
        <span>{label}</span>
      </span>

      <strong style={settingValue}>{value}</strong>
    </button>
  );
}

const pageWrapper = {
  background: "#f5f5f7",
  minHeight: "100vh",
  padding: "calc(env(safe-area-inset-top) + 64px) 18px 160px",
  boxSizing: "border-box",
  color: "#111",
};

const heroCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #8b5cf6 100%)",
  color: "white",
  borderRadius: "30px",
  padding: "34px 22px",
  marginBottom: "20px",
  textAlign: "center",
  boxShadow: "0 18px 40px rgba(91,61,245,0.28)",
};


const avatarUploadWrap = {
  position: "relative",
  width: "120px",
  height: "120px",
  borderRadius: "999px",
  cursor: "pointer",
};

const profileAvatarImage = {
  width: "120px",
  height: "120px",
  borderRadius: "999px",
  objectFit: "cover",
  border: "4px solid rgba(255,255,255,0.22)",
  boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
};

const uploadPhotoBadge = {
  position: "absolute",
  right: "0px",
  bottom: "0px",
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  background: "#7c3aed",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: "700",
  border: "3px solid white",
  boxShadow: "0 8px 18px rgba(124,58,237,0.32)",
};

const avatarCircle = {
  width: "118px",
  height: "118px",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.18)",
  margin: "0 auto 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "52px",
};

const pageTitle = {
  fontSize: "42px",
  margin: "0 0 10px",
  color: "white",
};

const userNameStyle = {
  fontSize: "22px",
  margin: "0 0 8px",
  color: "white",
};

const accountText = {
  margin: "0 auto 16px",
  lineHeight: 1.5,
  opacity: 0.92,
  maxWidth: "320px",
};

const accountBadge = {
  display: "inline-block",
  background: "rgba(255,255,255,0.18)",
  padding: "9px 14px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "13px",
};

const modeCard = {
  background: "white",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "16px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const sectionTitle = {
  margin: "0 0 14px",
  fontSize: "22px",
  color: "#111",
};

const modeToggle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
};

const modeButton = {
  border: "none",
  background: "#f4f3f8",
  color: "#333",
  padding: "14px 10px",
  borderRadius: "16px",
  fontWeight: "900",
  cursor: "pointer",
};

const activeModeButton = {
  background: "#5b3df5",
  color: "white",
};

const disabledModeButton = {
  opacity: 0.85,
  cursor: "not-allowed",
};

const helperText = {
  color: "#666",
  fontSize: "14px",
  lineHeight: 1.5,
  margin: "12px 0 0",
  textAlign: "center",
};

const sectionCard = {
  background: "white",
  borderRadius: "24px",
  marginBottom: "14px",
  overflow: "hidden",
  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
};

const sectionHeader = {
  width: "100%",
  border: "none",
  background: "white",
  color: "#111",
  padding: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  fontSize: "18px",
};

const sectionHeaderLeft = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const sectionIcon = {
  fontSize: "26px",
};

const chevron = {
  fontSize: "26px",
  fontWeight: "900",
  color: "#111",
};

const sectionBody = {
  padding: "0 16px 16px",
};

const settingRow = {
  width: "100%",
  border: "none",
  background: "#f8f7ff",
  color: "#111",
  padding: "15px 16px",
  borderRadius: "16px",
  marginBottom: "10px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  fontSize: "15px",
  cursor: "pointer",
  textAlign: "left",
};

const settingLeft = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const rowIcon = {
  fontSize: "20px",
};

const settingValue = {
  color: "#5b3df5",
  whiteSpace: "nowrap",
};

const lockedProBox = {
  background: "#f8f7ff",
  borderRadius: "20px",
  padding: "22px",
  textAlign: "center",
};

const lockedIcon = {
  fontSize: "46px",
  marginBottom: "12px",
};

const lockedTitle = {
  margin: "0 0 10px",
  fontSize: "22px",
  color: "#111",
};

const lockedText = {
  margin: "0 0 18px",
  color: "#666",
  lineHeight: 1.6,
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

const proCard = {
  background: "linear-gradient(135deg, #5b3df5 0%, #8b5cf6 100%)",
  color: "white",
  borderRadius: "28px",
  padding: "24px",
  marginBottom: "16px",
  boxShadow: "0 18px 40px rgba(91,61,245,0.24)",
};

const proBadge = {
  background: "rgba(255,255,255,0.18)",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
};

const proTitle = {
  margin: "18px 0 8px",
  fontSize: "26px",
};

const proText = {
  lineHeight: 1.6,
  opacity: 0.92,
};

const proButton = {
  border: "none",
  background: "white",
  color: "#5b3df5",
  padding: "15px 18px",
  borderRadius: "18px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "14px",
};

const statusCard = {
  background: "white",
  borderRadius: "24px",
  padding: "20px",
  marginBottom: "18px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.07)",
};

const statusText = {
  margin: "0 0 8px",
  color: "#111",
  fontWeight: "bold",
};

const mutedText = {
  margin: 0,
  color: "#666",
  lineHeight: 1.5,
};

const logoutButton = {
  width: "100%",
  padding: "15px 24px",
  background: "#5b3df5",
  color: "white",
  border: "none",
  borderRadius: "16px",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  marginTop: "4px",
};

export default Profile;
