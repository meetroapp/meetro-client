import { useEffect, useState } from "react";

function WelcomeIntro({ setPage, language = "en" }) {
  const [show, setShow] = useState(false);

  const text = {
    en: {
      badge: "Meetro Community",
      title: "Your local community hub",
      subtitle:
        "Connect with neighbors, trusted services, local businesses, and nearby help — all in one smart place.",
      button: "Enter Meetro",
      small: "Built for homeowners, professionals, and local communities.",
    },
    es: {
      badge: "Meetro Community",
      title: "Tu centro comunitario local",
      subtitle:
        "Conecta con vecinos, servicios confiables, negocios locales y ayuda cercana — todo en un solo lugar inteligente.",
      button: "Entrar a Meetro",
      small: "Creado para dueños de casa, profesionales y comunidades locales.",
    },
  };

  const t = text[language] || text.en;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 180);

    return () => clearTimeout(timer);
  }, []);

  const enterApp = () => {
    localStorage.setItem("onboardingComplete", "true");
    setPage("home");
  };

  return (
    <div style={page}>
      <style>
        {`
          @keyframes floatLogo {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
        `}
      </style>

      <div
        style={{
          ...card,
          opacity: show ? 1 : 0,
          transform: show
            ? "translateY(0) scale(1)"
            : "translateY(30px) scale(0.96)",
        }}
      >
        <div style={logoCircle}>M</div>

        <div style={badge}>{t.badge}</div>

        <h1 style={title}>{t.title}</h1>

        <p style={subtitle}>{t.subtitle}</p>

        <button style={button} onClick={enterApp}>
          {t.button}
        </button>

        <p style={small}>{t.small}</p>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "linear-gradient(160deg, #eef2ff 0%, #ffffff 42%, #f5f3ff 100%)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "24px",
  boxSizing: "border-box",
};

const card = {
  width: "100%",
  maxWidth: "430px",
  background: "rgba(255,255,255,0.94)",
  borderRadius: "36px",
  padding: "42px 28px",
  boxShadow: "0 25px 65px rgba(91,61,245,0.18)",
  textAlign: "center",
  transition: "all 700ms cubic-bezier(0.22, 1, 0.36, 1)",
  border: "1px solid rgba(91,61,245,0.10)",
  backdropFilter: "blur(14px)",
};

const logoCircle = {
  width: "92px",
  height: "92px",
  borderRadius: "30px",
  margin: "0 auto 24px",
  background:
    "linear-gradient(135deg, #5b3df5 0%, #7c4dff 45%, #9b6dff 100%)",
  color: "white",
  fontSize: "44px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 18px 40px rgba(91,61,245,0.35)",
  animation: "floatLogo 3s ease-in-out infinite",
};

const badge = {
  display: "inline-block",
  padding: "8px 15px",
  borderRadius: "999px",
  background: "#f1efff",
  color: "#5b3df5",
  fontSize: "13px",
  fontWeight: "800",
  marginBottom: "16px",
};

const title = {
  fontSize: "34px",
  lineHeight: "1.05",
  margin: "0 0 14px",
  color: "#111827",
  fontWeight: "900",
};

const subtitle = {
  fontSize: "16px",
  lineHeight: "1.55",
  color: "#4b5563",
  margin: "0 auto 28px",
  maxWidth: "350px",
};

const button = {
  width: "100%",
  border: "none",
  borderRadius: "20px",
  padding: "16px",
  background: "#5b3df5",
  color: "white",
  fontSize: "17px",
  fontWeight: "800",
  cursor: "pointer",
  boxShadow: "0 14px 28px rgba(91,61,245,0.3)",
};

const small = {
  marginTop: "20px",
  fontSize: "13px",
  color: "#6b7280",
  lineHeight: "1.4",
};

export default WelcomeIntro;
