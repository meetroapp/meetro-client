function FloatingBackButton({ onClick, label }) {
  return (
    <button style={backButton} onClick={onClick}>
      <span style={arrow}>←</span>
      {label && <span style={text}>{label}</span>}
    </button>
  );
}

const backButton = {
  position: "fixed",
  top: "22px",
  left: "22px",
  zIndex: 999,
  pointerEvents: "auto",
  width: "52px",
  height: "52px",
  borderRadius: "18px",
  border: "none",
  background: "rgba(255,255,255,0.92)",
  color: "#111827",
  fontWeight: "900",
  fontSize: "24px",
  boxShadow: "0 10px 28px rgba(15,23,42,0.14)",
  backdropFilter: "blur(14px)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  marginBottom: "0px",
};

const arrow = {
  lineHeight: 1,
};

const text = {
  fontSize: "14px",
  fontWeight: "900",
};

export default FloatingBackButton;


