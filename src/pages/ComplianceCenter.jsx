import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage } from "../utils/language";
import { getComplianceCenterModel } from "../utils/complianceCenterRegistry";

function ComplianceCenter({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";
  const model = getComplianceCenterModel();

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title={isSpanish ? "Centro de cumplimiento" : "Compliance Center"}
        description={
          isSpanish
            ? "Consulta como Meetro separara trabajo completado, obligaciones y cierre."
            : "View how Meetro will separate completed work, obligations, and closure."
        }
        categoryLabel={isSpanish ? "Cumplimiento del negocio" : "Business Compliance"}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div style={readOnlyCard}>
        <strong>{isSpanish ? "Solo lectura" : "Read-only preview"}</strong>
        <span>
          {isSpanish
            ? "Esta pagina no crea obligaciones, no las satisface y no cierra trabajos."
            : "This page does not create obligations, satisfy obligations, or close jobs."}
        </span>
      </div>

      <section style={messageCard}>
        <p style={messageTitle}>
          {isSpanish ? "Cierre despues de cumplimiento" : "Closure After Compliance"}
        </p>
        <p style={messageText}>
          {isSpanish
            ? "La finalizacion documenta el trabajo realizado. Cumplimiento verifica obligaciones. El cierre debe ocurrir solo cuando las obligaciones requeridas estan satisfechas."
            : model.complianceMessage}
        </p>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Tipos de obligaciones MVP" : "MVP Obligation Types"}
        </h2>
        <div style={obligationGrid}>
          {model.obligations.map((obligation) => (
            <article key={obligation.id} style={obligationCard}>
              <div style={cardHeader}>
                <h3 style={cardTitle}>{obligation.name}</h3>
                <span style={obligationKey}>{obligation.id}</span>
              </div>
              <p style={bodyText}>{obligation.purpose}</p>
              <div>
                <p style={fieldLabel}>
                  {isSpanish ? "Evidencia futura" : "Future Evidence"}
                </p>
                <ul style={fieldList}>
                  {obligation.evidenceExamples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>
          {isSpanish
            ? "Vista previa del ciclo"
            : "Obligation Lifecycle Preview"}
        </h2>
        <ol style={lifecycleList}>
          {model.lifecycle.map((step, index) => (
            <li key={step} style={lifecycleItem}>
              <span style={stepNumber}>{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <div style={recordGrid}>
        <RecordSection
          title={isSpanish ? "Registros de cumplimiento" : "Compliance Records"}
          fields={model.complianceRecordFields}
        />
        <RecordSection
          title={isSpanish ? "Dependencias de cierre" : "Closure Dependencies"}
          fields={model.closureDependencies}
        />
      </div>

      <BottomNav setPage={setPage} currentPage="businessDashboard" />
    </div>
  );
}

function RecordSection({ title, fields }) {
  return (
    <section style={recordCard}>
      <h2 style={recordTitle}>{title}</h2>
      <ul style={fieldList}>
        {fields.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
    </section>
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
  color: "#4338ca",
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
  border: "1px solid #c7d2fe",
  background: "#eef2ff",
  marginBottom: "16px",
};

const messageTitle = {
  margin: "0 0 6px",
  color: "#4338ca",
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

const obligationGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
  gap: "12px",
};

const obligationCard = {
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

const obligationKey = {
  maxWidth: "48%",
  overflowWrap: "anywhere",
  padding: "5px 7px",
  borderRadius: "999px",
  background: "#eef2ff",
  color: "#3730a3",
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

const lifecycleList = {
  display: "grid",
  gap: "8px",
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const lifecycleItem = {
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
  background: "#4338ca",
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "950",
  flexShrink: 0,
};

const recordGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
  gap: "12px",
};

const recordCard = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const recordTitle = {
  margin: "0 0 8px",
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "950",
};

export default ComplianceCenter;
