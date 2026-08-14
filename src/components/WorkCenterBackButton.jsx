function WorkCenterBackButton({ label, onClick }) {
  return (
    <button
      type="button"
      className="work-center-back-control"
      style={backButton}
      onClick={onClick}
    >
      <span aria-hidden="true" style={arrow}>←</span>
      <span>{label}</span>
    </button>
  );
}

const backButton = {
  minHeight: "44px",
  maxWidth: "100%",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "12px",
  padding: "9px 14px",
  border: "1px solid var(--meetro-color-line, #cbd5c7)",
  borderRadius: "12px",
  background: "var(--meetro-surface-paper, #ffffff)",
  color: "var(--meetro-color-forest, #1f4d34)",
  boxShadow: "0 4px 14px rgba(23, 35, 23, 0.08)",
  fontSize: "14px",
  fontWeight: 850,
  lineHeight: 1.2,
  textAlign: "left",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  cursor: "pointer",
  boxSizing: "border-box",
};

const arrow = {
  flex: "0 0 auto",
  fontSize: "18px",
  lineHeight: 1,
};

export default WorkCenterBackButton;
