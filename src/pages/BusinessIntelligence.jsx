import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage } from "../utils/language";
import { getBusinessIntelligenceModel } from "../utils/businessIntelligenceRegistry";

function BusinessIntelligence({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";
  const model = getBusinessIntelligenceModel();

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title={isSpanish ? "Inteligencia del negocio" : "Business Intelligence"}
        description={
          isSpanish
            ? "Consulta como Meetro convertira evaluaciones, hallazgos, servicios e historial en conocimiento del negocio."
            : "View how Meetro will turn evaluations, findings, services, and history into business insight."
        }
        categoryLabel={isSpanish ? "Inteligencia del negocio" : "Business Intelligence"}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div style={readOnlyCard}>
        <strong>{isSpanish ? "Solo lectura" : "Read-only preview"}</strong>
        <span>
          {isSpanish
            ? "Esta pagina no calcula metricas, no genera reportes y no modifica datos de clientes."
            : "This page does not calculate metrics, generate reports, or modify customer data."}
        </span>
      </div>

      <section style={messageCard}>
        <p style={messageTitle}>
          {isSpanish ? "De trabajo a inteligencia" : "From Work to Intelligence"}
        </p>
        <p style={messageText}>
          {isSpanish
            ? "Meetro aprende de flujos completados. Las evaluaciones crean hallazgos. Los hallazgos crean recomendaciones. Los servicios aprobados crean ingresos. Los servicios completados crean historial. El historial crea inteligencia del negocio."
            : model.message}
        </p>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Cadena de inteligencia" : "Intelligence Chain"}
        </h2>
        <ol style={flowList}>
          {model.flow.map((step, index) => (
            <li key={step} style={flowItem}>
              <span style={stepNumber}>{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Categorias de insight MVP" : "MVP Insight Categories"}
        </h2>
        <div style={insightGrid}>
          {model.categories.map((category) => (
            <article key={category.id} style={insightCard}>
              <div style={cardHeader}>
                <h3 style={cardTitle}>{category.name}</h3>
                <span style={categoryKey}>{category.id}</span>
              </div>
              <p style={bodyText}>{category.purpose}</p>
              <div>
                <p style={fieldLabel}>
                  {isSpanish ? "Ejemplos futuros" : "Future Examples"}
                </p>
                <ul style={fieldList}>
                  {category.futureExamples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

const page = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  minHeight: "100vh",
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

const header = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  marginBottom: "14px",
};

const backBtn = {
  width: "auto",
  minWidth: "42px",
  height: "42px",
  padding: "0 12px",
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "22px",
  fontWeight: "900",
  cursor: "pointer",
  flexShrink: 0,
};

const eyebrow = {
  margin: "0 0 5px",
  color: "#6d28d9",
  fontSize: "11px",
  fontWeight: "950",
  textTransform: "uppercase",
};

const title = {
  margin: 0,
  fontSize: "23px",
  fontWeight: "950",
  color: "#0f172a",
  letterSpacing: 0,
};

const subtitle = {
  margin: "7px 0 0",
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: "700",
};

const readOnlyCard = {
  display: "grid",
  gap: "4px",
  padding: "13px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: "12px",
  lineHeight: 1.45,
  marginBottom: "12px",
};

const messageCard = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #ddd6fe",
  background: "#f5f3ff",
  marginBottom: "16px",
};

const messageTitle = {
  margin: "0 0 6px",
  color: "#6d28d9",
  fontSize: "13px",
  fontWeight: "950",
  textTransform: "uppercase",
};

const messageText = {
  margin: 0,
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.5,
  fontWeight: "800",
};

const section = {
  display: "grid",
  gap: "10px",
  marginBottom: "16px",
};

const sectionTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "17px",
  fontWeight: "950",
};

const flowList = {
  display: "grid",
  gap: "8px",
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const flowItem = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "11px",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "900",
};

const stepNumber = {
  width: "26px",
  height: "26px",
  borderRadius: "999px",
  background: "#6d28d9",
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "950",
  flexShrink: 0,
};

const insightGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
  gap: "12px",
};

const insightCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gap: "10px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
};

const cardTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "16px",
  fontWeight: "950",
};

const categoryKey = {
  maxWidth: "48%",
  overflowWrap: "anywhere",
  padding: "5px 7px",
  borderRadius: "999px",
  background: "#f5f3ff",
  color: "#6d28d9",
  fontSize: "10px",
  fontWeight: "900",
};

const bodyText = {
  margin: 0,
  color: "#334155",
  fontSize: "12px",
  lineHeight: 1.45,
  fontWeight: "750",
};

const fieldLabel = {
  margin: "0 0 6px",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const fieldList = {
  margin: 0,
  paddingLeft: "18px",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.6,
};

export default BusinessIntelligence;
