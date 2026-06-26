import MeetroIcon from "../MeetroIcon";
import { t } from "../../utils/language";

function formatAmount(value) {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const numeric = Number(trimmed.replace(/[$,+\s]/g, ""));
    if (!Number.isFinite(numeric)) return trimmed;
    const prefix = trimmed.startsWith("+") ? "+" : trimmed.startsWith("-") ? "-" : "";
    return `${prefix}${Math.abs(numeric).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    })}`;
  }

  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";

  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function getDocumentTypeLabel(documentType, language) {
  const normalizedType = String(documentType || "").toLowerCase();

  if (normalizedType === "invoice") return t("documentInvoice", language);
  if (normalizedType === "receipt") return t("documentReceipt", language);
  if (normalizedType === "changeorder" || normalizedType === "change_order") {
    return t("documentChangeOrder", language);
  }
  if (normalizedType === "completion") return t("documentCompletion", language);

  return t("documentQuote", language);
}

export default function UniversalDocumentCard({
  documentType = "quote",
  projectTitle = "",
  amount = "",
  status = "",
  language = "en",
  reviewProjectAction,
  icon = "legal",
}) {
  const typeLabel = getDocumentTypeLabel(documentType, language);
  const displayAmount = formatAmount(amount);
  const buttonAction = typeof reviewProjectAction === "function" ? reviewProjectAction : null;

  return (
    <div style={card}>
      <div style={documentTopRow}>
        <span style={documentPill}>
          <MeetroIcon name={icon} size={14} decorative /> {typeLabel}
        </span>
      </div>

      <strong style={documentTitle}>{projectTitle || typeLabel}</strong>

      {displayAmount ? <div style={documentAmount}>{displayAmount}</div> : null}

      {status ? <div style={documentStatus}>{status}</div> : null}

      {buttonAction ? (
        <button
          type="button"
          style={previewButton}
          onClick={(event) => {
            event.stopPropagation();
            buttonAction(event);
          }}
        >
          {t("reviewProject", language)} →
        </button>
      ) : null}
    </div>
  );
}

const card = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(15, 23, 42, 0.1)",
  borderRadius: 18,
  background: "#fff",
  padding: 14,
  display: "grid",
  gap: 10,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const documentTopRow = {
  display: "flex",
  justifyContent: "flex-start",
};

const documentPill = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12,
  fontWeight: 900,
  color: "#2563eb",
  background: "#eff6ff",
  borderRadius: 999,
  padding: "5px 9px",
  maxWidth: "100%",
};

const documentTitle = {
  fontSize: 17,
  lineHeight: 1.2,
  color: "#0f172a",
  overflowWrap: "anywhere",
};

const documentAmount = {
  fontSize: 21,
  fontWeight: 900,
  lineHeight: 1,
  color: "#0f172a",
};

const documentStatus = {
  width: "100%",
  borderRadius: 14,
  background: "#ecfdf5",
  color: "#166534",
  padding: "8px 10px",
  fontWeight: 700,
  fontSize: 14,
  boxSizing: "border-box",
  overflowWrap: "anywhere",
};

const previewButton = {
  border: "none",
  borderRadius: 12,
  padding: "10px 12px",
  width: "100%",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  textAlign: "left",
};
