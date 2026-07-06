import { isProfessionalSession } from "../utils/session";
function Welcome({ setPage }) {
  const userRole = localStorage.getItem("userRole");
  const businessName = localStorage.getItem("businessName");
  const userEmail = localStorage.getItem("userEmail");

  const isProfessional =
    isProfessionalSession();

  return (
    <div style={pageWrapper}>
      <div style={card}>
        <div style={logoCircle}>M</div>

        <h1 style={title}>Welcome to Meetro</h1>

        <p style={subtitle}>
          {isProfessional
            ? "Your professional business account is ready."
            : "Your local community account is ready."}
        </p>

        <div style={infoBox}>
          <p style={infoText}>
            <strong>Account Type:</strong>{" "}
            {isProfessional ? "Professional" : "Standard User"}
          </p>

          {businessName && (
            <p style={infoText}>
              <strong>Business:</strong> {businessName}
            </p>
          )}

          {userEmail && (
            <p style={infoText}>
              <strong>Email:</strong> {userEmail}
            </p>
          )}
        </div>

        <button
          onClick={() => {
            if (isProfessional) {
              setPage("businessDashboard");
            } else {
              setPage("home");
            }
          }}
          style={primaryButton}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

const pageWrapper = {
  minHeight: "100vh",
  background: "#f5f5f7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  boxSizing: "border-box",
};

const card = {
  width: "100%",
  maxWidth: "430px",
  background: "white",
  borderRadius: "32px",
  padding: "32px 24px",
  textAlign: "center",
  boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
};

const logoCircle = {
  width: "86px",
  height: "86px",
  borderRadius: "28px",
  background: "linear-gradient(135deg, var(--meetro-color-forest, #1f4d34), #7b61ff)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "42px",
  fontWeight: "bold",
  margin: "0 auto 24px",
  boxShadow: "0 14px 30px rgba(31,77,52,0.3)",
};

const title = {
  margin: 0,
  color: "#111",
  fontSize: "36px",
  lineHeight: 1.1,
};

const subtitle = {
  marginTop: "14px",
  marginBottom: "24px",
  color: "#666",
  fontSize: "17px",
  lineHeight: 1.6,
};

const infoBox = {
  background: "#f5f5f7",
  borderRadius: "22px",
  padding: "16px",
  textAlign: "left",
  marginBottom: "24px",
};

const infoText = {
  margin: "8px 0",
  color: "#333",
  fontSize: "15px",
  lineHeight: 1.5,
};

const primaryButton = {
  width: "100%",
  padding: "17px",
  border: "none",
  borderRadius: "18px",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontWeight: "bold",
  fontSize: "17px",
  cursor: "pointer",
};

export default Welcome;
