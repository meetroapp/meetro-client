import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import SafeBackBar from "../components/SafeBackBar";
import { getLanguage, t } from "../utils/language";
import { purgeProfessionalLeadCaches } from "../utils/businessLeadSourceTruth";
import { isProfessionalSession } from "../utils/session";

function BusinessLeads({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());
  const isProfessional = isProfessionalSession();

  useEffect(() => {
    purgeProfessionalLeadCaches();

    const handleLanguageChange = () => setLanguage(getLanguage());
    window.addEventListener("languageChanged", handleLanguageChange);

    return () => window.removeEventListener("languageChanged", handleLanguageChange);
  }, []);

  if (!isProfessional) {
    return (
      <div className="app-page meetro-responsive-page" style={pageWrapper}>
        <div style={lockedCard}>
          <div style={stateIcon}>LOCK</div>
          <h1 style={stateTitle}>{t("professionalLeadsAccessRequired", language)}</h1>
          <p style={stateText}>{t("professionalLeadsAccessRequiredText", language)}</p>
          <button style={primaryButton} onClick={() => setPage("profile")}>
            {t("professionalLeadsReviewProfile", language)}
          </button>
        </div>

        <SafeBackBar setPage={setPage} fallback="businessDashboard" />
        <BottomNav setPage={setPage} currentPage="businessLeads" />
      </div>
    );
  }

  return (
    <div className="app-page meetro-responsive-page" style={pageWrapper}>
      <div style={heroCard}>
        <h1 style={heroTitle}>{t("businessLeads", language)}</h1>
        <p style={heroText}>{t("professionalLeadsUnavailableSummary", language)}</p>
      </div>

      <section style={unavailableCard} aria-labelledby="professional-leads-unavailable">
        <div style={stateIcon}>LEAD</div>
        <h2 id="professional-leads-unavailable" style={stateTitle}>
          {t("professionalLeadsUnavailable", language)}
        </h2>
        <p style={stateText}>{t("professionalLeadsUnavailableText", language)}</p>
      </section>

      <SafeBackBar setPage={setPage} fallback="businessDashboard" />
      <BottomNav setPage={setPage} currentPage="businessLeads" />
    </div>
  );
}

const pageWrapper = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(31,77,52,0.12) 0%, transparent 32%), linear-gradient(to bottom, var(--meetro-surface-warm, #fbf6ed), var(--meetro-surface-sage, #eef4ea))",
  padding:
    "calc(env(safe-area-inset-top) + 64px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
  color: "#111827",
  overflowX: "hidden",
  width: "100%",
  maxWidth: "1040px",
  margin: "0 auto",
};

const heroCard = {
  background:
    "linear-gradient(135deg, var(--meetro-color-forest-deep, #14351f) 0%, var(--meetro-color-forest, #1f4d34) 58%, var(--meetro-color-coffee, #4a3428) 100%)",
  borderRadius: "30px",
  padding: "22px",
  color: "white",
  marginBottom: "18px",
  boxShadow: "var(--meetro-shadow-lifted, 0 24px 70px rgba(49,35,20,0.14))",
  maxWidth: "100%",
  minWidth: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

const heroTitle = {
  margin: "0 0 8px",
  fontSize: "30px",
  lineHeight: 1.05,
  overflowWrap: "break-word",
};

const heroText = {
  margin: 0,
  lineHeight: 1.5,
  opacity: 0.92,
  fontSize: "16px",
  overflowWrap: "break-word",
};

const unavailableCard = {
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  borderRadius: "28px",
  padding: "34px 22px",
  textAlign: "center",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
};

const lockedCard = {
  ...unavailableCard,
  marginTop: "60px",
};

const stateIcon = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "18px",
  fontWeight: 900,
};

const stateTitle = {
  margin: "18px 0 8px",
};

const stateText = {
  color: "#6b7280",
  lineHeight: 1.5,
  maxWidth: "620px",
  margin: "0 auto",
};

const primaryButton = {
  border: "none",
  background:
    "var(--meetro-gradient-community-action, linear-gradient(135deg, #14351f, #1f4d34))",
  color: "white",
  borderRadius: "18px",
  padding: "15px 18px",
  marginTop: "18px",
  minHeight: "44px",
  fontWeight: 900,
  cursor: "pointer",
};

export default BusinessLeads;
