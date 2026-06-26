import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage, t } from "../utils/language";
import { getMaterialsLibrary } from "../utils/materialsLibraryRegistry";

function MaterialsLibrary({ setPage }) {
  const language = getLanguage();
  const materialGroups = getMaterialsLibrary();

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title={t("materialsLibrary", language)}
        description={t("materialsLibraryDescription", language)}
        categoryLabel={t("businessKnowledge", language)}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div style={readOnlyCard}>
        <strong>{t("readOnlyReference", language)}</strong>
        <span>{t("materialsLibraryReadOnlyText", language)}</span>
      </div>

      <div style={materialsGrid}>
        {materialGroups.map((group) => (
          <article key={group.serviceType} style={materialCard}>
            <div style={cardHeader}>
              <div>
                <p style={fieldLabel}>
                  {t("serviceType", language)}
                </p>
                <h2 style={serviceTitle}>{group.serviceLabel}</h2>
              </div>
              <span style={serviceKey}>{group.serviceType}</span>
            </div>

            <div>
              <p style={fieldLabel}>
                {t("commonMaterials", language)}
              </p>
              <ul style={materialsList}>
                {group.materials.map((material) => (
                  <li key={material}>{material}</li>
                ))}
              </ul>
            </div>

            {group.notes && (
              <div style={notesBox}>
                <p style={notesLabel}>{t("note", language)}</p>
                <p style={notesText}>{group.notes}</p>
              </div>
            )}
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
  color: "#0f766e",
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

const materialsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: "12px",
};

const materialCard = {
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

const serviceTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "17px",
  fontWeight: "950",
};

const serviceKey = {
  maxWidth: "48%",
  overflowWrap: "anywhere",
  padding: "5px 7px",
  borderRadius: "999px",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: "10px",
  fontWeight: "900",
};

const materialsList = {
  margin: 0,
  paddingLeft: "18px",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.6,
};

const notesBox = {
  padding: "11px",
  borderRadius: "14px",
  border: "1px solid #ccfbf1",
  background: "#f0fdfa",
};

const notesLabel = {
  margin: "0 0 5px",
  color: "#0f766e",
  fontSize: "11px",
  fontWeight: "950",
  textTransform: "uppercase",
};

const notesText = {
  margin: 0,
  color: "#334155",
  fontSize: "12px",
  lineHeight: 1.45,
  fontWeight: "750",
};

export default MaterialsLibrary;
