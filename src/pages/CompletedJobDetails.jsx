import BottomNav from "../components/BottomNav";
import { getLanguage, t } from "../utils/language";
import { normalizeCompletedJobRecord } from "../utils/completedJobDetails";

function CompletedJobDetails({ setPage, completedRecord = null }) {
  const language = getLanguage();
  const referenceRecord = normalizeCompletedJobRecord(completedRecord);

  return (
    <div className="app-page meetro-readable-page" style={page}>
      <main style={card} aria-labelledby="completed-record-unavailable-title">
        <p style={eyebrow}>{t("lifecycleUnavailableEyebrow", language)}</p>
        <h1 id="completed-record-unavailable-title" style={title}>
          {t("completedJobDetailsUnavailable", language)}
        </h1>
        <p style={body}>{t("completedJobDetailsUnavailableBody", language)}</p>

        {referenceRecord && (
          <section style={referenceBox} aria-label={t("lifecycleLegacyReference", language)}>
            <span style={referenceLabel}>{t("lifecycleLegacyReference", language)}</span>
            <strong>{referenceRecord.title || referenceRecord.service || t("lifecycleProjectFallback", language)}</strong>
            <p>{t("completedHistoryLocalNotice", language)}</p>
          </section>
        )}

        <p role="status" style={notice}>
          {t("completedHistoryNoMutationNotice", language)}
        </p>

        <div style={actions}>
          <button type="button" style={primaryButton} onClick={() => setPage("contractorDashboard")}>
            {t("returnToWorkCenter", language)}
          </button>
          <button type="button" style={secondaryButton} onClick={() => setPage("home")}>
            {t("backHome", language)}
          </button>
        </div>
      </main>

      <BottomNav setPage={setPage} currentPage="home" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "var(--meetro-surface-sage, #eef4ea)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 28px) max(18px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
};
const card = {
  width: "min(100%, 680px)",
  margin: "64px auto 0",
  padding: "24px",
  border: "1px solid var(--meetro-color-line, #d9e1d5)",
  borderRadius: "8px",
  background: "#ffffff",
  boxShadow: "0 18px 44px rgba(15, 23, 42, 0.08)",
  boxSizing: "border-box",
};
const eyebrow = {
  margin: "0 0 8px",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase",
};
const title = { margin: "0 0 10px", color: "#111827", fontSize: "28px", lineHeight: 1.15 };
const body = { margin: "0 0 18px", color: "#475569", fontWeight: "700", lineHeight: 1.55 };
const referenceBox = {
  display: "grid",
  gap: "6px",
  marginBottom: "16px",
  padding: "14px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  background: "#f8fafc",
  color: "#334155",
};
const referenceLabel = { color: "#64748b", fontSize: "12px", fontWeight: "800" };
const notice = {
  margin: "0 0 16px",
  padding: "12px",
  border: "1px solid #fed7aa",
  borderRadius: "8px",
  background: "#fff7ed",
  color: "#7c2d12",
  lineHeight: 1.5,
};
const actions = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" };
const primaryButton = {
  minHeight: "48px",
  border: "none",
  borderRadius: "8px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  padding: "12px 16px",
  fontWeight: "900",
  cursor: "pointer",
};
const secondaryButton = {
  ...primaryButton,
  border: "1px solid #d9e1d5",
  background: "#ffffff",
  color: "var(--meetro-color-forest, #1f4d34)",
};

export default CompletedJobDetails;
