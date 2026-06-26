import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage, t } from "../utils/language";
import { getContractTemplates } from "../utils/contractTemplatesRegistry";

function ContractTemplates({ setPage }) {
  const language = getLanguage();
  const templates = getContractTemplates();

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title={t("contractTemplates", language)}
        description={t("contractTemplatesDescription", language)}
        categoryLabel={t("businessDocuments", language)}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div style={readOnlyCard}>
        <strong>{t("readOnlyReference", language)}</strong>
        <span>{t("contractTemplatesReadOnlyText", language)}</span>
      </div>

      <div style={templateGrid}>
        {templates.map((template) => (
          <article key={template.id} style={templateCard}>
            <div style={cardHeader}>
              <div>
                <p style={fieldLabel}>
                  {t("templateName", language)}
                </p>
                <h2 style={templateTitle}>{template.name}</h2>
              </div>
              <span style={templateKey}>{template.id}</span>
            </div>

            <div style={infoPanel}>
              <p style={fieldLabel}>{t("purpose", language)}</p>
              <p style={bodyText}>{template.purpose}</p>
            </div>

            <div style={infoPanel}>
              <p style={fieldLabel}>
                {t("typicalUseCase", language)}
              </p>
              <p style={bodyText}>{template.typicalUseCase}</p>
            </div>

            <div>
              <p style={fieldLabel}>
                {t("keySectionsIncluded", language)}
              </p>
              <ul style={sectionList}>
                {template.sections.map((section) => (
                  <li key={section}>{section}</li>
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
  background: "#f8fafc",
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
  color: "#1d4ed8",
  fontSize: "11px",
  fontWeight: "950",
  textTransform: "uppercase",
};

const title = {
  margin: 0,
  fontSize: "23px",
  fontWeight: "950",
  color: "#0f172a",
  letterSpacing: 0,
};

const subtitle = {
  margin: "7px 0 0",
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const readOnlyCard = {
  display: "grid",
  gap: "4px",
  padding: "13px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: "12px",
  lineHeight: 1.45,
  marginBottom: "16px",
};

const templateGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
  gap: "12px",
};

const templateCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gap: "13px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const cardHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
};

const fieldLabel = {
  margin: "0 0 6px",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const templateTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "17px",
  fontWeight: "950",
};

const templateKey = {
  maxWidth: "48%",
  overflowWrap: "anywhere",
  padding: "5px 7px",
  borderRadius: "999px",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: "10px",
  fontWeight: "900",
};

const infoPanel = {
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

const sectionList = {
  margin: 0,
  paddingLeft: "18px",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.6,
};

export default ContractTemplates;
