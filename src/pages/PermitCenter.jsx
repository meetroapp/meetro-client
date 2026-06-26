import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage } from "../utils/language";
import { getPermitCenterModel } from "../utils/permitCenterRegistry";

function PermitCenter({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";
  const model = getPermitCenterModel();

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title={isSpanish ? "Centro de permisos" : "Permit Center"}
        description={
          isSpanish
            ? "Consulta como Meetro separara permisos, inspecciones y cierre del trabajo completado."
            : "View how Meetro will separate permits, inspections, and closure from completed work."
        }
        categoryLabel={isSpanish ? "Cumplimiento del negocio" : "Business Compliance"}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div style={readOnlyCard}>
        <strong>{isSpanish ? "Solo lectura" : "Read-only preview"}</strong>
        <span>
          {isSpanish
            ? "Esta pagina no crea permisos, no agenda inspecciones y no modifica flujos."
            : "This page does not create permits, schedule inspections, or modify workflows."}
        </span>
      </div>

      <section style={messageCard}>
        <p style={messageTitle}>
          {isSpanish ? "Cumplimiento antes del cierre" : "Compliance Before Closure"}
        </p>
        <p style={messageText}>
          {isSpanish
            ? "Un trabajo completado puede tener obligaciones de permisos pendientes. El cierre del permiso es separado de la finalizacion del trabajo."
            : model.complianceMessage}
        </p>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Tipos de permisos MVP" : "MVP Permit Types"}
        </h2>
        <div style={permitGrid}>
          {model.permitTypes.map((permitType) => (
            <article key={permitType.id} style={permitCard}>
              <div style={cardHeader}>
                <h3 style={cardTitle}>{permitType.name}</h3>
                <span style={permitKey}>{permitType.id}</span>
              </div>
              <p style={bodyText}>{permitType.purpose}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Vista previa del ciclo" : "Permit Lifecycle Preview"}
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
          title={isSpanish ? "Registros de permisos" : "Permit Records"}
          fields={model.permitRecordFields}
        />
        <RecordSection
          title={isSpanish ? "Registros de inspeccion" : "Inspection Records"}
          fields={model.inspectionRecordFields}
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
  color: "#0f766e",
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
  border: "1px solid #ccfbf1",
  background: "#f0fdfa",
  marginBottom: "16px",
};

const messageTitle = {
  margin: "0 0 6px",
  color: "#0f766e",
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

const permitGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
  gap: "12px",
};

const permitCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gap: "9px",
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

const permitKey = {
  maxWidth: "48%",
  overflowWrap: "anywhere",
  padding: "5px 7px",
  borderRadius: "999px",
  background: "#ecfdf5",
  color: "#047857",
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
  background: "#0f766e",
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

const fieldList = {
  margin: 0,
  paddingLeft: "18px",
  color: "#334155",
  fontSize: "13px",
  lineHeight: 1.6,
};

export default PermitCenter;
