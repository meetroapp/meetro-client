import BottomNav from "../components/BottomNav";
import { getLanguage, t } from "../utils/language";
import { restoreConversationOriginContext } from "../utils/conversationOrigin";

function readSelectedRequest() {
  try {
    return JSON.parse(localStorage.getItem("selectedChangeOrderRequest") || "null");
  } catch {
    return null;
  }
}

function ChangeOrderRequest({ setPage }) {
  const language = getLanguage();
  const request = readSelectedRequest();

  const returnToRequest = () => {
    if (restoreConversationOriginContext(setPage)) return;
    setPage("myRequests");
  };

  return (
    <div className="app-page meetro-form-page" style={page}>
      <button type="button" style={backButton} onClick={returnToRequest} aria-label={t("back", language)}>
        <span aria-hidden="true">&#8592;</span>
      </button>

      <main style={card} aria-labelledby="change-order-unavailable-title">
        <p style={eyebrow}>{t("lifecycleUnavailableEyebrow", language)}</p>
        <h1 id="change-order-unavailable-title" style={title}>
          {t("changeOrderUnavailableTitle", language)}
        </h1>
        <p style={body}>{t("changeOrderUnavailableBody", language)}</p>

        {request && (
          <section style={contextBox} aria-label={t("lifecycleReferenceDetails", language)}>
            <span style={contextLabel}>{t("lifecycleReferenceDetails", language)}</span>
            <strong>{request.title || request.service || t("lifecycleProjectFallback", language)}</strong>
          </section>
        )}

        <p role="status" style={notice}>
          {t("changeOrderNoSubmissionNotice", language)}
        </p>

        <button type="button" style={primaryButton} onClick={returnToRequest}>
          {t("returnToRequests", language)}
        </button>
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

const backButton = {
  width: "44px",
  height: "44px",
  border: "1px solid #d9e1d5",
  borderRadius: "8px",
  background: "#ffffff",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "22px",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const card = {
  maxWidth: "620px",
  margin: "24px auto 0",
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

const title = { margin: "0 0 10px", color: "#111827", fontSize: "28px", lineHeight: 1.15 };
const body = { margin: "0 0 18px", color: "#475569", fontWeight: "700", lineHeight: 1.55 };
const contextBox = {
  display: "grid",
  gap: "4px",
  marginBottom: "16px",
  padding: "14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
};
const contextLabel = { color: "#64748b", fontSize: "12px", fontWeight: "800" };
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

export default ChangeOrderRequest;
