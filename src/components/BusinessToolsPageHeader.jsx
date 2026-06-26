import { getLanguage, t } from "../utils/language";

function BusinessToolsPageHeader({
  title,
  description,
  onBack,
  categoryLabel,
  backLabel,
}) {
  const language = getLanguage();

  return (
    <header className="business-tools-page-header" style={header}>
      <button type="button" style={backButton} onClick={onBack}>
        ← {backLabel || t("backToBusinessTools", language)}
      </button>

      <div style={copyBlock}>
        <p style={eyebrow}>{categoryLabel || t("businessTools", language)}</p>
        <h1 style={titleStyle}>{title}</h1>
        {description && <p style={descriptionStyle}>{description}</p>}
      </div>
    </header>
  );
}

const header = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: "12px",
  marginBottom: "16px",
  boxSizing: "border-box",
};

const backButton = {
  alignSelf: "flex-start",
  width: "auto",
  maxWidth: "100%",
  minHeight: "42px",
  padding: "0 12px",
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "#ffffff",
  color: "#334155",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
  whiteSpace: "normal",
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "none",
};

const copyBlock = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "grid",
  gap: "6px",
};

const eyebrow = {
  margin: 0,
  color: "#4f46e5",
  fontSize: "0.75rem",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "none",
};

const titleStyle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "clamp(2rem, 9vw, 3.4rem)",
  lineHeight: 1.03,
  letterSpacing: 0,
  maxWidth: "100%",
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "none",
};

const descriptionStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: "1rem",
  lineHeight: 1.42,
  maxWidth: "70ch",
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "none",
};

export default BusinessToolsPageHeader;
