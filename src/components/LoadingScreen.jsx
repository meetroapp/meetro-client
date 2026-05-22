function LoadingScreen({ text = "Loading..." }) {
  return (
    <div style={wrapper}>
      <div style={logoCircle}>M</div>

      <h2 style={title}>Meetro</h2>

      <p style={subtitle}>{text}</p>

      <div style={dots}>
        <span style={dot}></span>
        <span style={dot}></span>
        <span style={dot}></span>
      </div>
    </div>
  );
}

const wrapper = {
  minHeight: "100vh",
  background: "#f5f5f7",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "#111",
  padding: "30px",
  boxSizing: "border-box",
};

const logoCircle = {
  width: "72px",
  height: "72px",
  borderRadius: "24px",
  background: "#5b3df5",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
  fontWeight: "bold",
  boxShadow: "0 12px 28px rgba(91,61,245,0.35)",
};

const title = {
  marginTop: "18px",
  marginBottom: "6px",
  fontSize: "34px",
  color: "#111",
};

const subtitle = {
  margin: 0,
  color: "#666",
  fontSize: "16px",
};

const dots = {
  display: "flex",
  gap: "8px",
  marginTop: "18px",
};

const dot = {
  width: "9px",
  height: "9px",
  borderRadius: "50%",
  background: "#5b3df5",
};

export default LoadingScreen;
