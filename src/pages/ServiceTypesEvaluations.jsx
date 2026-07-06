import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage } from "../utils/language";
import { getServiceEvaluationCatalog } from "../utils/evaluationTemplateRegistry";

function ServiceTypesEvaluations({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";
  const catalog = getServiceEvaluationCatalog();

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title={
          isSpanish
            ? "Tipos de servicio y evaluaciones"
            : "Service Types & Evaluations"
        }
        description={
          isSpanish
            ? "Consulta los servicios, contextos y requisitos de documentacion que Meetro entiende durante la evaluacion."
            : "View the services, contexts, and documentation requirements Meetro understands during Evaluation."
        }
        categoryLabel={isSpanish ? "Conocimiento del negocio" : "Business Knowledge"}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div style={readOnlyCard}>
        <strong>{isSpanish ? "Solo lectura" : "Read-only reference"}</strong>
        <span>
          {isSpanish
            ? "Esta pagina muestra las definiciones actuales. No cambia flujos, plantillas ni evaluaciones guardadas."
            : "This page shows current definitions. It does not change workflows, templates, or saved evaluations."}
        </span>
      </div>

      <div style={industryStack}>
        {catalog.map((industryGroup) => (
          <section key={industryGroup.industry} style={industrySection}>
            <div style={industryHeader}>
              <p style={industryKicker}>
                {isSpanish ? "Categoria / industria" : "Business category / industry"}
              </p>
              <h2 style={industryTitle}>{industryGroup.label}</h2>
            </div>

            <div style={serviceGrid}>
              {industryGroup.services.map((service) => (
                <article key={service.id} style={serviceCard}>
                  <div style={serviceTop}>
                    <div>
                      <p style={fieldLabel}>
                        {isSpanish ? "Tipo de servicio" : "Service Type"}
                      </p>
                      <h3 style={serviceTitle}>{service.label}</h3>
                    </div>
                    <span style={serviceKey}>{service.id}</span>
                  </div>

                  <div style={contextBlock}>
                    <p style={fieldLabel}>
                      {isSpanish ? "Contextos soportados" : "Supported Contexts"}
                    </p>
                    <div style={pillWrap}>
                      {service.supportedContexts.map((context) => (
                        <span key={context.id} style={pill}>
                          {context.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={templateStack}>
                    {service.templates.length > 0 ? (
                      service.templates.map((template) => (
                        <div key={template.key} style={templatePanel}>
                          <p style={fieldLabel}>
                            {isSpanish ? "Plantilla" : "Template"}
                          </p>
                          <p style={templateKey}>{template.key}</p>
                          <p style={templateContext}>
                            {isSpanish ? "Contexto" : "Context"}:{" "}
                            <strong>{template.contextLabel}</strong>
                          </p>

                          <p style={requirementsTitle}>
                            {isSpanish
                              ? "Documentacion recomendada"
                              : "Recommended documentation"}
                          </p>
                          <ul style={requirementsList}>
                            {template.requirements.map((requirement) => (
                              <li key={requirement}>{requirement}</li>
                            ))}
                          </ul>
                        </div>
                      ))
                    ) : (
                      <div style={emptyTemplate}>
                        {isSpanish
                          ? "No hay una plantilla especifica registrada todavia. La evaluacion usa notas generales."
                          : "No specific template is registered yet. Evaluation uses general notes."}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

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
  color: "var(--meetro-color-coffee, #4a3428)",
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
  marginBottom: "16px",
};

const industryStack = {
  display: "grid",
  gap: "16px",
};

const industrySection = {
  display: "grid",
  gap: "10px",
};

const industryHeader = {
  display: "grid",
  gap: "2px",
};

const industryKicker = {
  margin: 0,
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const industryTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "18px",
  fontWeight: "950",
};

const serviceGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: "12px",
};

const serviceCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gap: "13px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const serviceTop = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
};

const fieldLabel = {
  margin: "0 0 5px",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const serviceTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "17px",
  fontWeight: "950",
};

const serviceKey = {
  maxWidth: "48%",
  overflowWrap: "anywhere",
  padding: "5px 7px",
  borderRadius: "999px",
  background: "#f1f5f9",
  color: "#475569",
  fontSize: "10px",
  fontWeight: "900",
};

const contextBlock = {
  display: "grid",
  gap: "3px",
};

const pillWrap = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
};

const pill = {
  padding: "6px 8px",
  borderRadius: "999px",
  background: "var(--meetro-surface-sage, rgba(238,244,234,0.9))",
  color: "var(--meetro-color-forest, #1f4d34)",
  fontSize: "11px",
  fontWeight: "900",
};

const templateStack = {
  display: "grid",
  gap: "10px",
};

const templatePanel = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #dbeafe",
  background: "#f8fbff",
};

const templateKey = {
  margin: 0,
  color: "#1e293b",
  fontSize: "12px",
  fontWeight: "900",
  overflowWrap: "anywhere",
};

const templateContext = {
  margin: "6px 0 0",
  color: "#475569",
  fontSize: "12px",
};

const requirementsTitle = {
  margin: "12px 0 6px",
  color: "#0f172a",
  fontSize: "12px",
  fontWeight: "950",
};

const requirementsList = {
  margin: 0,
  paddingLeft: "18px",
  color: "#334155",
  fontSize: "12px",
  lineHeight: 1.55,
};

const emptyTemplate = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.45,
  fontWeight: "800",
};

export default ServiceTypesEvaluations;
