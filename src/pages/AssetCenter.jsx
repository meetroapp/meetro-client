import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage } from "../utils/language";

function AssetCenter({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";

  const copy = isSpanish
    ? {
        description:
          "Un espacio interno para conservar activos de clientes e historial de servicio verificados.",
        unavailable: "Los registros de activos aun no estan disponibles.",
        detail:
          "Los activos de clientes y el historial de servicio verificados apareceran aqui cuando este espacio este conectado a datos de produccion.",
        back: "Volver a Herramientas del negocio",
      }
    : {
        description:
          "An internal workspace for preserving verified customer assets and service history.",
        unavailable: "Asset records are not available yet.",
        detail:
          "Verified customer assets and service history will appear here after this workspace is connected to production data.",
        back: "Back to Business Tools",
      };

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title="Asset Center"
        description={copy.description}
        categoryLabel={isSpanish ? "Operaciones del negocio" : "Business Operations"}
        onBack={() => setPage("businessCommandCenter")}
      />

      <main style={workspace} aria-labelledby="asset-center-unavailable-title">
        <section style={unavailableCard} role="status">
          <h2 id="asset-center-unavailable-title" style={unavailableTitle}>
            {copy.unavailable}
          </h2>
          <p style={unavailableText}>{copy.detail}</p>
          <button
            type="button"
            style={backButton}
            onClick={() => setPage("businessCommandCenter")}
          >
            {copy.back}
          </button>
        </section>
      </main>

      <BottomNav setPage={setPage} currentPage="assetCenter" />
    </div>
  );
}

const page = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "100dvh",
  padding:
    "calc(env(safe-area-inset-top, 0px) + 50px) max(18px, env(safe-area-inset-right, 0px)) calc(env(safe-area-inset-bottom, 0px) + 96px) max(18px, env(safe-area-inset-left, 0px))",
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  boxSizing: "border-box",
  background: "#f8fafc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

const workspace = {
  width: "100%",
  maxWidth: "760px",
  minWidth: 0,
  margin: "24px auto 0",
};

const unavailableCard = {
  width: "100%",
  minWidth: 0,
  padding: "clamp(24px, 5vw, 40px)",
  borderRadius: "18px",
  border: "1px solid #d9e2d6",
  background: "#fffdf8",
  boxShadow: "0 14px 34px rgba(31, 77, 52, 0.08)",
  boxSizing: "border-box",
  textAlign: "center",
};

const unavailableTitle = {
  margin: 0,
  color: "var(--meetro-color-forest-deep, #14351f)",
  fontSize: "clamp(22px, 4vw, 30px)",
  lineHeight: 1.25,
  fontWeight: "900",
};

const unavailableText = {
  maxWidth: "580px",
  margin: "14px auto 0",
  color: "#5f6f62",
  fontSize: "16px",
  lineHeight: 1.6,
};

const backButton = {
  minWidth: "220px",
  minHeight: "48px",
  maxWidth: "100%",
  marginTop: "24px",
  padding: "13px 18px",
  borderRadius: "14px",
  border: "1px solid var(--meetro-color-forest, #1f4d34)",
  background: "var(--meetro-color-forest, #1f4d34)",
  color: "white",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer",
};

export default AssetCenter;
