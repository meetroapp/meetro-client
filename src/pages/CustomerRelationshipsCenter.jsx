import BottomNav from "../components/BottomNav";
import BusinessToolsPageHeader from "../components/BusinessToolsPageHeader";
import { getLanguage } from "../utils/language";
import { getCustomerRelationshipsCenterModel } from "../utils/customerRelationshipsRegistry";

function CustomerRelationshipsCenter({ setPage }) {
  const language = getLanguage();
  const isSpanish = language === "es";
  const model = getCustomerRelationshipsCenterModel();

  return (
    <div className="app-page meetro-responsive-page" style={page}>
      <BusinessToolsPageHeader
        title={isSpanish ? "Relaciones con clientes" : "Customer Relationships"}
        description={
          isSpanish
            ? "Consulta con quien haces negocio, historial de comunicacion y relacion sin mezclarlo con trabajo activo."
            : "View who you do business with, communication history, and relationship history without mixing in active work execution."
        }
        categoryLabel={isSpanish ? "Operaciones del negocio" : "Business Operations"}
        onBack={() => setPage("businessCommandCenter")}
      />

      <div style={readOnlyCard}>
        <strong>{isSpanish ? "Solo lectura" : "Read-only foundation"}</strong>
        <span>
          {isSpanish
            ? "Esta pagina no edita clientes, no agenda trabajos y no cambia flujos."
            : "This page does not edit customers, schedule work, or change workflows."}
        </span>
      </div>

      <section style={principleCard}>
        <p style={principleTitle}>
          {isSpanish ? "Relaciones sobreviven trabajos" : "Relationships Survive Jobs"}
        </p>
        <ol style={principleList}>
          {model.principle.map((step, index) => (
            <li key={`${step}-${index}`} style={principleItem}>
              <span style={stepNumber}>{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>{isSpanish ? "Clientes" : "Customers"}</h2>
        <div style={relationshipGrid}>
          {model.relationships.map((relationship) => (
            <article key={relationship.id} style={relationshipCard}>
              <div style={cardHeader}>
                <div>
                  <p style={fieldLabel}>{isSpanish ? "Nombre" : "Name"}</p>
                  <h3 style={customerName}>{relationship.name}</h3>
                </div>
                <span style={statusBadge}>{relationship.relationshipStatus}</span>
              </div>

              <div style={statsGrid}>
                <Stat
                  label={isSpanish ? "Activos" : "Active Jobs"}
                  value={relationship.activeJobsCount}
                />
                <Stat
                  label={isSpanish ? "Cerrados" : "Closed Jobs"}
                  value={relationship.closedJobsCount}
                />
                <Stat
                  label={isSpanish ? "Ultima actividad" : "Last Activity"}
                  value={relationship.lastActivityDate}
                />
              </div>

              <SummaryBlock
                title={
                  isSpanish
                    ? "Historial de comunicacion"
                    : "Communication History"
                }
                items={[
                  `${isSpanish ? "Conversaciones" : "Conversations"}: ${relationship.communicationSummary.conversations}`,
                  `${isSpanish ? "Mensajes" : "Messages"}: ${relationship.communicationSummary.messages}`,
                  `${isSpanish ? "Ultimo contacto" : "Last contact"}: ${relationship.communicationSummary.lastContact}`,
                ]}
              />

              <SummaryBlock
                title={isSpanish ? "Historial de trabajo" : "Work History"}
                items={[
                  `${isSpanish ? "Trabajos completados" : "Completed jobs"}: ${relationship.workSummary.completedJobs}`,
                  `${isSpanish ? "Trabajos activos" : "Active jobs"}: ${relationship.workSummary.activeJobs}`,
                  `${isSpanish ? "Proyectos totales" : "Total projects"}: ${relationship.workSummary.totalProjects}`,
                ]}
              />

              <div>
                <p style={fieldLabel}>
                  {isSpanish ? "Historial de relación" : "Relationship History"}
                </p>
                <ol style={timelineList}>
                  {relationship.timeline.map((event, index) => (
                    <li key={`${relationship.id}-${event}`} style={timelineItem}>
                      <span style={timelineDot}>{index + 1}</span>
                      <span>{event}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={section}>
        <h2 style={sectionTitle}>
          {isSpanish ? "Futuras secciones" : "Future Sections"}
        </h2>
        <div style={placeholderGrid}>
          {model.futureSections.map((sectionName) => (
            <div key={sectionName} style={placeholderCard}>
              <strong>{sectionName}</strong>
              <span>{isSpanish ? "Próximamente" : "Coming soon"}</span>
            </div>
          ))}
        </div>
      </section>

      <BottomNav setPage={setPage} currentPage="customerRelationshipsCenter" />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={statCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryBlock({ title, items }) {
  return (
    <div style={summaryBlock}>
      <p style={fieldLabel}>{title}</p>
      <ul style={summaryList}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
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

const principleCard = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #ccfbf1",
  background: "#f0fdfa",
  marginBottom: "16px",
};

const principleTitle = {
  margin: "0 0 10px",
  color: "#0f766e",
  fontSize: "13px",
  fontWeight: "950",
  textTransform: "uppercase",
};

const principleList = {
  display: "grid",
  gap: "8px",
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const principleItem = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px",
  borderRadius: "13px",
  background: "#ffffff",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "900",
};

const stepNumber = {
  width: "24px",
  height: "24px",
  borderRadius: "999px",
  background: "#0f766e",
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
  fontWeight: "950",
  flexShrink: 0,
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

const relationshipGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))",
  gap: "12px",
};

const relationshipCard = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "grid",
  gap: "12px",
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

const fieldLabel = {
  margin: "0 0 6px",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "900",
  textTransform: "uppercase",
};

const customerName = {
  margin: 0,
  color: "#0f172a",
  fontSize: "17px",
  fontWeight: "950",
};

const statusBadge = {
  maxWidth: "48%",
  overflowWrap: "anywhere",
  padding: "5px 7px",
  borderRadius: "999px",
  background: "#ecfdf5",
  color: "#047857",
  fontSize: "10px",
  fontWeight: "900",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 90px), 1fr))",
  gap: "8px",
};

const statCard = {
  display: "grid",
  gap: "5px",
  padding: "10px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#334155",
  fontSize: "11px",
  fontWeight: "850",
};

const summaryBlock = {
  padding: "10px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const summaryList = {
  margin: 0,
  paddingLeft: "18px",
  color: "#334155",
  fontSize: "12px",
  lineHeight: 1.55,
};

const timelineList = {
  display: "grid",
  gap: "7px",
  margin: 0,
  padding: 0,
  listStyle: "none",
};

const timelineItem = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  color: "#334155",
  fontSize: "12px",
  fontWeight: "850",
};

const timelineDot = {
  width: "22px",
  height: "22px",
  borderRadius: "999px",
  background: "#e0f2fe",
  color: "#0369a1",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  fontWeight: "950",
  flexShrink: 0,
};

const placeholderGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  gap: "10px",
};

const placeholderCard = {
  display: "grid",
  gap: "5px",
  padding: "12px",
  borderRadius: "14px",
  border: "1px dashed #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: "12px",
};

export default CustomerRelationshipsCenter;
