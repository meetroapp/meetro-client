import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage, t } from "../utils/language";
import {
  getReportTypes,
  REPORT_STATUS,
} from "../utils/reportsCenterRegistry";

function ReportsCenter({ setPage }) {
  const language = getLanguage();
  const reports = getReportTypes();

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title={t("reportsCenter", language)}
        description={t("reportsCenterDescription", language)}
        categoryLabel={t("businessDocuments", language)}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div style={readOnlyCard}>
        <strong>{t("readOnlyReference", language)}</strong>
        <span>{t("reportsCenterReadOnlyText", language)}</span>
      </div>

      <div style={reportsGrid}>
        {reports.map((report) => {
          const isAvailable =
            report.status === REPORT_STATUS.AVAILABLE_FROM_JOB_HISTORY;

          return (
            <article key={report.id} style={reportCard}>
              <div style={cardHeader}>
                <div>
                  <p style={fieldLabel}>
                    {t("reportName", language)}
                  </p>
                  <h2 style={reportTitle}>{report.name}</h2>
                </div>
                <span
                  style={{
                    ...statusBadge,
                    ...(isAvailable ? availableBadge : plannedBadge),
                  }}
                >
                  {report.status}
                </span>
              </div>

              <div style={infoPanel}>
                <p style={fieldLabel}>{t("purpose", language)}</p>
                <p style={bodyText}>{report.purpose}</p>
              </div>

              <div>
                <p style={fieldLabel}>{t("includes", language)}</p>
                <ul style={includesList}>
                  {report.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
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
  color: "#4338ca",
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

const reportsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
  gap: "12px",
};

const reportCard = {
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

const reportTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "17px",
  fontWeight: "950",
};

const statusBadge = {
  maxWidth: "48%",
  overflowWrap: "anywhere",
  padding: "5px 7px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: "900",
};

const availableBadge = {
  background: "#ecfdf5",
  color: "#047857",
};

const plannedBadge = {
  background: "#eef2ff",
  color: "#3730a3",
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

const includesList = {
  margin: 0,
  paddingLeft: "18px",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.6,
};

export default ReportsCenter;
