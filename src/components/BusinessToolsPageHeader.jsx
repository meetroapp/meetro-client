import { t } from "../utils/language";
import useLanguage from "../hooks/useLanguage";

function BusinessToolsPageHeader({
  title,
  description,
  onBack,
  categoryLabel,
  backLabel,
}) {
  const language = useLanguage();

  return (
    <header className="business-tools-page-header meetro-visual-hero" style={header}>
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
  marginBottom: "22px",
  boxSizing: "border-box",
  padding: "clamp(18px, 4vw, 28px)",
  borderRadius: "28px",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  background:
    "linear-gradient(135deg, var(--meetro-surface-paper, rgba(255,253,248,0.94)), var(--meetro-surface-sage, rgba(238,244,234,0.9)))",
};

const backButton = {
  alignSelf: "flex-start",
  width: "auto",
  maxWidth: "100%",
  minHeight: "42px",
  padding: "0 12px",
  borderRadius: "14px",
  border: "1px solid var(--meetro-color-line, rgba(78, 68, 55, 0.12))",
  background: "var(--meetro-surface-paper, rgba(255,253,248,0.94))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "var(--meetro-shadow-soft, 0 16px 38px rgba(49, 35, 20, 0.08))",
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
  color: "var(--meetro-color-coffee, #4a3428)",
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
  color: "var(--meetro-color-forest-deep, #14351f)",
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
  color: "var(--meetro-color-muted, #65705f)",
  fontSize: "1rem",
  lineHeight: 1.42,
  maxWidth: "70ch",
  overflowWrap: "normal",
  wordBreak: "normal",
  hyphens: "none",
};

export default BusinessToolsPageHeader;
