import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage, t } from "../utils/language";
import {
  getPricingLibrary,
  PRICING_GUIDANCE_DISCLAIMER,
} from "../utils/pricingLibraryRegistry";

function PricingLibrary({ setPage }) {
  const language = getLanguage();
  const pricingGroups = getPricingLibrary();

  return (
    <div className="app-page meetro-responsive-page meetro-visual-page" style={page}>
      <BusinessToolsPageHeader
        title={t("pricingLibrary", language)}
        description={t("pricingLibraryDescription", language)}
        categoryLabel={t("businessKnowledge", language)}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div className="meetro-visual-surface" style={readOnlyCard}>
        <strong>{t("readOnlyReference", language)}</strong>
        <span>{t("pricingLibraryReadOnlyText", language)}</span>
      </div>

      <div className="meetro-visual-surface" style={disclaimerCard}>
        {language === "en" ? PRICING_GUIDANCE_DISCLAIMER : t("pricingGuidanceDisclaimer", language)}
      </div>

      <div style={pricingGrid}>
        {pricingGroups.map((group) => (
          <article key={group.serviceType} className="meetro-visual-surface" style={pricingCard}>
            <div style={cardHeader}>
              <div>
                <p style={fieldLabel}>
                  {t("serviceType", language)}
                </p>
                <h2 style={serviceTitle}>{group.serviceLabel}</h2>
              </div>
              <span style={serviceKey}>{group.serviceType}</span>
            </div>

            <div style={summaryGrid}>
              <div style={summaryItem}>
                <p style={fieldLabel}>
                  {t("pricingModel", language)}
                </p>
                <p style={bodyText}>{group.pricingModel}</p>
              </div>
              <div style={summaryItem}>
                <p style={fieldLabel}>
                  {t("laborAssumption", language)}
                </p>
                <p style={bodyText}>{group.laborAssumption}</p>
              </div>
              <div style={summaryItem}>
                <p style={fieldLabel}>
                  {t("materialNote", language)}
                </p>
                <p style={bodyText}>{group.materialNote}</p>
              </div>
              <div style={summaryItem}>
                <p style={fieldLabel}>
                  {t("estimateNote", language)}
                </p>
                <p style={bodyText}>{group.estimateNote}</p>
              </div>
            </div>

            <div>
              <p style={fieldLabel}>
                {t("guidance", language)}
              </p>
              <ul style={guidanceList}>
                {group.guidance.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

const page = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "100vh",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 50px) max(18px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 96px) max(18px, env(safe-area-inset-left, 0px))",
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  boxSizing: "border-box",
  background: "var(--meetro-surface-warm, #fbf6ed)",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const header = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  marginBottom: "14px",
};

const backBtn = {
  width: "auto",
  minWidth: "42px",
  height: "42px",
  padding: "0 12px",
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "22px",
  fontWeight: "900",
  cursor: "pointer",
  flexShrink: 0,
};

const eyebrow = {
  margin: "0 0 5px",
  color: "var(--meetro-color-coffee, #4a3428)",
  fontSize: "11px",
  fontWeight: "950",
  textTransform: "uppercase",
};

const title = {
  margin: 0,
  fontSize: "23px",
  fontWeight: "950",
  color: "var(--meetro-color-forest-deep, #14351f)",
  letterSpacing: 0,
};

const subtitle = {
  margin: "7px 0 0",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const readOnlyCard = {
  display: "grid",
  gap: "4px",
  padding: "13px",
  borderRadius: "14px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-ink, #172317)",
  fontSize: "12px",
  lineHeight: 1.45,
  marginBottom: "10px",
};

const disclaimerCard = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #fed7aa",
  background: "var(--meetro-surface-warm, rgba(251,246,237,0.92))",
  color: "var(--meetro-color-coffee, #4a3428)",
  fontSize: "12px",
  lineHeight: 1.45,
  fontWeight: "850",
  marginBottom: "16px",
};

const pricingGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
  gap: "16px",
};

const pricingCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gap: "13px",
  padding: "18px",
  borderRadius: "16px",
  border: "1px solid var(--meetro-color-line, rgba(78,68,55,0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49,35,20,0.08))",
};

const cardHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
};

const fieldLabel = {
  margin: "0 0 6px",
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const serviceTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: "17px",
  fontWeight: "950",
};

const serviceKey = {
  maxWidth: "48%",
  overflowWrap: "anywhere",
  padding: "5px 7px",
  borderRadius: "999px",
  background: "#fff7ed",
  color: "#9a3412",
  fontSize: "10px",
  fontWeight: "900",
};

const summaryGrid = {
  display: "grid",
  gap: "9px",
};

const summaryItem = {
  padding: "10px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const bodyText = {
  margin: 0,
  color: "#334155",
  fontSize: "12px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const guidanceList = {
  margin: 0,
  paddingLeft: "18px",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.6,
};

export default PricingLibrary;
