import BottomNav from "../components/BottomNav";
function Favorites({ setPage, language = "en" }) {
  const text = {
    en: {
      title: "Favorite Professionals",
      subtitle: "Your saved contractors and local services.",
      empty: "No saved professionals yet.",
      back: "Back Home",
    },
    es: {
      title: "Profesionales Favoritos",
      subtitle: "Tus contratistas y servicios guardados.",
      empty: "Aún no tienes profesionales guardados.",
      back: "Regresar al Inicio",
    },
  };

  const t = text[language] || text.en;

  return (
    <div style={page}>
      <div style={card}>
        <h1 style={title}>{t.title}</h1>

        <p style={subtitle}>{t.subtitle}</p>

        <div style={emptyCard}>
          ⭐
          <p style={{ marginTop: 14 }}>{t.empty}</p>
        </div>

        <button style={button} onClick={() => setPage("home")}>
          {t.back}
        </button>
      </div>

      <BottomNav setPage={setPage} currentPage="home" />
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#f5f7fb",
  padding: "calc(env(safe-area-inset-top) + 64px) 24px 120px",
};

const card = {
  maxWidth: "430px",
  margin: "0 auto",
};

const title = {
  fontSize: "32px",
  fontWeight: "900",
  marginBottom: "10px",
  color: "#111827",
};

const subtitle = {
  color: "#6b7280",
  marginBottom: "24px",
  lineHeight: "1.5",
};

const emptyCard = {
  background: "white",
  borderRadius: "28px",
  padding: "50px 24px",
  textAlign: "center",
  fontSize: "20px",
  lineHeight: "1.3",
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  marginBottom: "24px",
};

const button = {
  width: "100%",
  padding: "16px",
  borderRadius: "18px",
  border: "none",
  background: "#5b3df5",
  color: "white",
  fontSize: "16px",
  fontWeight: "700",
};

export default Favorites;
