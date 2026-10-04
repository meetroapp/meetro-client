import BottomNav from "../components/BottomNav";
import FloatingBackButton from "../components/FloatingBackButton";
import { getLanguage, t } from "../utils/language";

function CompletionSheet({ setPage }) {
  const language = getLanguage();

  return (
    <div className="app-page meetro-form-page" style={page}>
      <FloatingBackButton onClick={() => setPage("contractorDashboard")} />

      <main style={card} aria-labelledby="completion-unavailable-title">
        <p style={eyebrow}>{t("lifecycleUnavailableEyebrow", language)}</p>
        <h1 id="completion-unavailable-title" style={title}>
          {t("completionRecordingUnavailableTitle", language)}
        </h1>
        <p style={body}>{t("completionRecordingUnavailableBody", language)}</p>

        <section style={summaryBox} aria-label={t("completionReadOnlySummaryTitle", language)}>
          <strong>{t("completionReadOnlySummaryTitle", language)}</strong>
          <p>{t("completionReadOnlySummaryBody", language)}</p>
        </section>

        <p role="status" style={notice}>
          {t("completionNoAuthorityNotice", language)}
        </p>

        <button type="button" style={primaryButton} onClick={() => setPage("contractorDashboard")}>
          {t("returnToWorkCenter", language)}
        </button>
      </main>

      <BottomNav setPage={setPage} currentPage="contractorDashboard" />
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
  maxWidth: "640px",
  margin: "70px auto 0",
  padding: "24px",
  border: "1px solid var(--meetro-color-line, #d9e1d5)",
  borderRadius: "8px",
  background: "#ffffff",
  boxShadow: "0 18px 44px rgba(15, 23, 42, 0.08)",
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
const summaryBox = {
  marginBottom: "16px",
  padding: "14px",
  border: "1px solid #d9e1d5",
  borderRadius: "8px",
  background: "#f8fafc",
  color: "#334155",
  lineHeight: 1.5,
};
const notice = {
  margin: "0 0 16px",
  padding: "12px",
  border: "1px solid #fed7aa",
  borderRadius: "8px",
  background: "#fff7ed",
  color: "#7c2d12",
  lineHeight: 1.5,
};
const primaryButton = {
  width: "100%",
  minHeight: "48px",
  border: "none",
  borderRadius: "8px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  padding: "12px 16px",
  fontWeight: "900",
  cursor: "pointer",
};

export default CompletionSheet;
