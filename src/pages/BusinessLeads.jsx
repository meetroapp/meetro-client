import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import SafeBackBar from "../components/SafeBackBar";
import { getLanguage, t } from "../utils/language";
import { purgeProfessionalLeadCaches } from "../utils/businessLeadSourceTruth";
import { isProfessionalSession } from "../utils/session";
import { PROFESSIONAL_OPPORTUNITY_STATUS } from "../utils/professionalOpportunityState";
import {
  PROFESSIONAL_OPPORTUNITY_PHASE,
  requestProfessionalOpportunities,
  subscribeProfessionalOpportunities,
} from "../utils/professionalOpportunityCoordinator";

function BusinessLeads({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());
  const [status, setStatus] = useState("loading");
  const [opportunities, setOpportunities] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const isProfessional = isProfessionalSession();

  useEffect(() => {
    purgeProfessionalLeadCaches();

    const handleLanguageChange = () => setLanguage(getLanguage());
    window.addEventListener("languageChanged", handleLanguageChange);

    return () => window.removeEventListener("languageChanged", handleLanguageChange);
  }, []);

  useEffect(() => {
    if (!isProfessional) return;

    const unsubscribe = subscribeProfessionalOpportunities((snapshot) => {
      if (
        snapshot.phase === PROFESSIONAL_OPPORTUNITY_PHASE.LOADING &&
        snapshot.updatedAt === 0
      ) {
        setStatus(PROFESSIONAL_OPPORTUNITY_STATUS.LOADING);
        return;
      }

      setOpportunities(snapshot.records);
      setStatus(snapshot.status);
    });

    requestProfessionalOpportunities({
      caller: "BusinessLeads",
      trigger: reloadKey > 0 ? "manual-retry" : "mount",
      force: reloadKey > 0,
      setPage,
    });

    return unsubscribe;
  }, [isProfessional, reloadKey, setPage]);

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
        <p style={heroText}>
          {status === PROFESSIONAL_OPPORTUNITY_STATUS.READY
            ? "Open requests matched to your services and service area."
            : status === PROFESSIONAL_OPPORTUNITY_STATUS.EMPTY
              ? "Authorized request matching is active."
              : t("professionalLeadsUnavailableSummary", language)}
        </p>
      </div>

      {status === PROFESSIONAL_OPPORTUNITY_STATUS.LOADING ? (
        <section style={unavailableCard} role="status">Loading request opportunities…</section>
      ) : status === PROFESSIONAL_OPPORTUNITY_STATUS.UNAVAILABLE ? (
        <section style={unavailableCard} aria-labelledby="professional-leads-unavailable">
          <div style={stateIcon}>LEAD</div>
          <h2 id="professional-leads-unavailable" style={stateTitle}>Request opportunities unavailable</h2>
          <p style={stateText}>Meetro could not verify eligible requests. Try again.</p>
          <button style={primaryButton} onClick={() => setReloadKey((value) => value + 1)}>Try Again</button>
        </section>
      ) : status === PROFESSIONAL_OPPORTUNITY_STATUS.EMPTY ? (
        <section style={unavailableCard} role="status">
          <div style={stateIcon}>LEAD</div>
          <h2 style={stateTitle}>No matching requests are available right now.</h2>
          <p style={stateText}>Meetro checked open requests against your saved services and service area.</p>
        </section>
      ) : (
        <section style={leadList} aria-label="Eligible request opportunities">
          {opportunities.map((opportunity) => (
            <article key={opportunity.id} style={leadCard}>
              <span style={leadStatus}>Open request</span>
              <h2 style={stateTitle}>{opportunity.project_title}</h2>
              <p style={stateText}>{opportunity.project_description}</p>
              <p style={leadMeta}>{opportunity.service_specialty || opportunity.request_category}</p>
              <p style={leadReviewNote}>Request review only. Response and messaging are not available yet.</p>
            </article>
          ))}
        </section>
      )}

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

const leadList = {
  display: "grid",
  gap: "14px",
};

const leadCard = {
  ...unavailableCard,
  textAlign: "left",
};

const leadStatus = {
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
};

const leadMeta = {
  color: "#4b5563",
  fontWeight: 800,
  margin: "12px 0 0",
};

const leadReviewNote = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 700,
  margin: "14px 0 0",
};

export default BusinessLeads;
