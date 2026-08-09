import BottomNav from "../components/BottomNav";
import FloatingBackButton from "../components/FloatingBackButton";
import { getLanguage, t } from "../utils/language";
import { getActiveJobSnapshot } from "../utils/workCenter";

function JobUpdate({ setPage }) {
  const language = getLanguage();
  const activeJobSnapshot = getActiveJobSnapshot();
  const returnPage = localStorage.getItem("returnPage") || "contractorDashboard";
  const jobName =
    activeJobSnapshot?.service ||
    localStorage.getItem("activeJobService") ||
    t("lifecycleJobFallback", language);
  const customer =
    activeJobSnapshot?.customer ||
    localStorage.getItem("activeJobCustomer") ||
    t("customer", language);

  return (
    <div className="app-page meetro-form-page" style={page}>
      <FloatingBackButton onClick={() => setPage(returnPage)} />

      <main style={card} aria-labelledby="job-update-unavailable-title">
        <p style={eyebrow}>{t("lifecycleUnavailableEyebrow", language)}</p>
        <h1 id="job-update-unavailable-title" style={title}>
          {t("jobUpdateUnavailableTitle", language)}
        </h1>
        <p style={subtitle}>{t("jobUpdateUnavailableBody", language)}</p>

        <section style={contextBox} aria-label={t("lifecycleReferenceDetails", language)}>
          <span style={contextLabel}>{t("lifecycleReferenceDetails", language)}</span>
          <strong>{jobName}</strong>
          <span>{customer}</span>
        </section>

        <p role="status" style={notice}>
          {t("jobUpdateNoDeliveryNotice", language)}
        </p>

        <button type="button" style={primaryButton} onClick={() => setPage(returnPage)}>
          {t("returnToWorkCenter", language)}
        </button>
      </main>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "var(--meetro-surface-sage, #eef4ea)",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 28px) max(20px, env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) max(20px, env(safe-area-inset-left, 0px))",
  boxSizing: "border-box",
};

const card = {
  maxWidth: "520px",
  margin: "70px auto 0",
  background: "white",
  border: "1px solid var(--meetro-color-line, #d9e1d5)",
  borderRadius: "8px",
  padding: "24px",
  boxShadow: "0 18px 44px rgba(15, 23, 42, 0.08)",
};

const eyebrow = {
  margin: "0 0 8px",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const title = {
  fontSize: "28px",
  lineHeight: 1.15,
  margin: "0 0 10px",
  color: "#111827",
};

const subtitle = {
  color: "#475569",
  fontWeight: "700",
  lineHeight: 1.55,
  margin: "0 0 20px",
};

const contextBox = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  marginBottom: "16px",
};

const contextLabel = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "800",
};

const notice = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: "8px",
  color: "#7c2d12",
  lineHeight: 1.5,
  padding: "12px",
  margin: "0 0 16px",
};

const primaryButton = {
  width: "100%",
  minHeight: "48px",
  padding: "12px 16px",
  borderRadius: "8px",
  border: "none",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
};

export default JobUpdate;
