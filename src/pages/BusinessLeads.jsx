import { useEffect, useState } from "react";
import BottomNav from "../components/BottomNav";
import SafeBackBar from "../components/SafeBackBar";
import { getLanguage, t } from "../utils/language";
import { purgeProfessionalLeadCaches } from "../utils/businessLeadSourceTruth";
import { isProfessionalSession } from "../utils/session";
import { authFetch } from "../utils/authFetch";
import { normalizeRequestConversations } from "../utils/requestCommunication";

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
    let active = true;
    async function loadOpportunities() {
      setStatus("loading");
      try {
        const result = await authFetch(
          "/professional-request-opportunities",
          { cache: "no-store" },
          setPage
        );
        if (!active) return;
        if (!result?.response?.ok) {
          setOpportunities([]);
          setStatus("unavailable");
          return;
        }
        const records = normalizeRequestConversations(result.data || {}, "business");
        if (!records) {
          setOpportunities([]);
          setStatus("unavailable");
          return;
        }
        setOpportunities(records);
        setStatus(records.length > 0 ? "ready" : "empty");
      } catch {
        if (active) {
          setOpportunities([]);
          setStatus("unavailable");
        }
      }
    }
    loadOpportunities();
    return () => {
      active = false;
    };
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
          {status === "ready"
            ? "Open requests matched to your services and service area."
            : t("professionalLeadsUnavailableSummary", language)}
        </p>
      </div>

      {status === "loading" ? (
        <section style={unavailableCard} role="status">Loading request opportunities…</section>
      ) : status === "unavailable" ? (
        <section style={unavailableCard} aria-labelledby="professional-leads-unavailable">
          <div style={stateIcon}>LEAD</div>
          <h2 id="professional-leads-unavailable" style={stateTitle}>Request opportunities unavailable</h2>
          <p style={stateText}>Meetro could not verify eligible requests. Try again.</p>
          <button style={primaryButton} onClick={() => setReloadKey((value) => value + 1)}>Try Again</button>
        </section>
      ) : status === "empty" ? (
        <section style={unavailableCard} role="status">
          <div style={stateIcon}>LEAD</div>
          <h2 style={stateTitle}>No matching requests</h2>
          <p style={stateText}>There are no open requests matching your services and service area.</p>
        </section>
      ) : (
        <section style={leadList} aria-label="Eligible request opportunities">
          {opportunities.map((opportunity) => (
            <article key={opportunity.id} style={leadCard}>
              <span style={leadStatus}>Open request</span>
              <h2 style={stateTitle}>{opportunity.project_title}</h2>
              <p style={stateText}>{opportunity.project_description}</p>
              <p style={leadMeta}>{opportunity.service_specialty || opportunity.request_category}</p>
              <button
                style={primaryButton}
                onClick={() => {
                  localStorage.setItem("activeAccountMode", "business");
                  setPage("messagesInbox");
                }}
              >
                Open Communication Center
              </button>
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

export default BusinessLeads;
