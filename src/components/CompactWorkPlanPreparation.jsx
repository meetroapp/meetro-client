import { useState } from "react";
import { buildMaterialPreparationProjection } from "../utils/workCenterLifecycleUx.js";
import ProfessionalWorkPreparationWorkspace from "./ProfessionalWorkPreparationWorkspace.jsx";

function readableState(value, ready) {
  if (ready) return "Ready";
  const labels = {
    NOT_REQUIRED: "Not required",
    NOT_STARTED: "Not started",
    PARTIALLY_PURCHASED: "Partly ready",
    PURCHASED: "Purchased",
    CUSTOMER_ITEM_PENDING: "Waiting for customer",
    BLOCKED: "Needs attention",
    READY: "Ready",
    IN_PROGRESS: "In progress",
  };
  return labels[value] || "Status unavailable";
}

function quantityLabel(item) {
  return [item.quantity, item.unit].filter((value) => value !== "" && value != null).join(" ");
}

function SummaryButton({ id, title, summary, expanded, onClick }) {
  return (
    <button
      type="button"
      style={{ ...styles.summaryButton, ...(expanded ? styles.summaryButtonOpen : {}) }}
      aria-expanded={expanded}
      aria-controls={`${id}-details`}
      onClick={onClick}
    >
      <span style={styles.summaryCopy}><span style={styles.summaryTitle}>{title}</span><strong>{summary}</strong></span>
      <span aria-hidden="true" style={styles.chevron}>{expanded ? "−" : "+"}</span>
    </button>
  );
}

function ItemRows({ items, empty, stateField = "acquisitionState" }) {
  if (items.length === 0) return <p style={styles.empty}>{empty}</p>;
  return (
    <div style={styles.itemRows} role="list">
      {items.map((item) => (
        <div key={item.id} className="work-plan-material-item-row" style={styles.itemRow} role="listitem">
          <strong style={styles.itemDescription}>{item.description}</strong>
          <span style={styles.quantity}>{quantityLabel(item)}</span>
          <span style={styles.itemStatus}>{readableState(item[stateField], item.readyForWorkStart)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CompactWorkPlanPreparation({
  preparation,
  jobId,
  language = "en",
  setPage,
  onCanonicalChange,
  initialOpen = "",
  showManageControls = true,
}) {
  const projection = buildMaterialPreparationProjection(preparation);
  const [open, setOpen] = useState({
    materials: initialOpen === "materials",
    customer: initialOpen === "customer",
    preparation: initialOpen === "preparation",
  });
  const [manageOpen, setManageOpen] = useState(false);
  const toggle = (key) => setOpen((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div style={styles.section} data-materials-source="canonical-work-preparation" data-materials-model="existing-work-preparation">
      <div style={styles.summaryGrid} aria-label="Materials and preparation summaries">
        <SummaryButton id="work-plan-materials" title="Materials" summary={projection.materialsSummary} expanded={open.materials} onClick={() => toggle("materials")} />
        <SummaryButton id="work-plan-customer-supplies" title="Customer supplies" summary={projection.customerSuppliesSummary} expanded={open.customer} onClick={() => toggle("customer")} />
        <SummaryButton id="work-plan-preparation" title="Preparation" summary={projection.preparationSummary} expanded={open.preparation} onClick={() => toggle("preparation")} />
      </div>

      {open.materials && (
        <section id="work-plan-materials-details" style={styles.detail} aria-label="Materials details">
          <div className="work-plan-material-column-labels" style={styles.columnLabels} aria-hidden="true"><span>Item</span><span>Quantity</span><span>Status</span></div>
          <ItemRows items={projection.businessMaterials} empty="No business-supplied materials are listed." />
        </section>
      )}
      {open.customer && (
        <section id="work-plan-customer-supplies-details" style={styles.detail} aria-label="Customer supplies details">
          <ItemRows items={projection.customerSupplies} empty="No customer-supplied items are required." />
        </section>
      )}
      {open.preparation && (
        <section id="work-plan-preparation-details" style={styles.detail} aria-label="Preparation details">
          <ItemRows
            items={projection.preparationItems}
            empty={projection.preparationSummary === "Ready" ? "No additional preparation is required." : "No preparation tasks are listed."}
            stateField="preparationState"
          />
        </section>
      )}

      {projection.exists && showManageControls && (
        <div style={styles.manageArea}>
          <button
            type="button"
            style={styles.manageButton}
            aria-expanded={manageOpen}
            aria-controls="work-plan-preparation-controls"
            onClick={() => setManageOpen((current) => !current)}
          >
            {manageOpen ? "Hide preparation controls" : "View or edit preparation"}
          </button>
          {manageOpen && (
            <div id="work-plan-preparation-controls" style={styles.managePanel}>
              <ProfessionalWorkPreparationWorkspace
                jobId={jobId}
                language={language}
                setPage={setPage}
                embedded
                showDepositStatus={false}
                onCanonicalChange={onCanonicalChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  section: { display: "grid", gap: 10, minWidth: 0 },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 9, minWidth: 0 },
  summaryButton: { width: "100%", minWidth: 0, minHeight: 62, padding: "10px 12px", border: "1px solid #d8e2da", borderRadius: 10, background: "#f6f9f7", color: "#213d2c", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer" },
  summaryButtonOpen: { borderColor: "#7fa38a", background: "#eef6f0" },
  summaryCopy: { display: "grid", gap: 3, minWidth: 0 },
  summaryTitle: { color: "#5c6c62", fontSize: 12, fontWeight: 800, letterSpacing: ".03em", textTransform: "uppercase" },
  chevron: { flex: "0 0 auto", fontSize: 22, lineHeight: 1, color: "#3f654b" },
  detail: { minWidth: 0, padding: "4px 0 2px", overflow: "hidden" },
  columnLabels: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(70px, auto) minmax(90px, auto)", gap: 10, padding: "7px 10px", color: "#6a776e", fontSize: 12, fontWeight: 800 },
  itemRows: { display: "grid", minWidth: 0, borderTop: "1px solid #e0e7e2" },
  itemRow: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(70px, auto) minmax(90px, auto)", gap: 10, alignItems: "center", minWidth: 0, padding: "10px", borderBottom: "1px solid #e0e7e2", lineHeight: 1.35 },
  itemDescription: { minWidth: 0, overflowWrap: "anywhere" },
  quantity: { color: "#56665c", overflowWrap: "anywhere" },
  itemStatus: { color: "#285d39", fontWeight: 800, overflowWrap: "anywhere" },
  empty: { margin: 0, padding: "11px", color: "#5f6f65", background: "#f8faf8", borderRadius: 8 },
  manageArea: { display: "grid", justifyItems: "start", gap: 10 },
  manageButton: { minHeight: 44, padding: "8px 12px", border: "1px solid #8ea395", borderRadius: 8, background: "#fff", color: "#275039", fontWeight: 800, cursor: "pointer" },
  managePanel: { width: "100%", minWidth: 0, paddingTop: 4 },
};
