import WorkCenterBackButton from "./WorkCenterBackButton";

function LegacyWorkCenterReadOnlyPanel({
  title,
  records = [],
  onBack,
  backLabel = "Back to Work Center",
  compact = false,
}) {
  return (
    <section
      className="meetro-visual-surface"
      style={compact ? compactPanel : panel}
      aria-label={`${title} read-only compatibility records`}
    >
      {!compact && (
        <WorkCenterBackButton label={backLabel} onClick={onBack} />
      )}

      <div style={header}>
        <div>
          <span style={eyebrow}>Read-only</span>
          <h2 style={heading}>{title}</h2>
        </div>
        <span style={badge}>Compatibility records</span>
      </div>

      <p role="status" style={notice}>
        Browser-stored references remain visible here. They cannot update or override canonical
        lifecycle truth.
      </p>

      {records.length > 0 ? (
        <div style={list}>
          {records.map((record) => (
            <article key={record.id} style={recordCard}>
              <span style={recordSource}>{record.sourceLabel}</span>
              <strong style={recordTitle}>{record.title}</strong>
              {record.detail && <span style={recordDetail}>{record.detail}</span>}
            </article>
          ))}
        </div>
      ) : (
        <div className="meetro-visual-empty-state" style={empty}>
          No legacy reference records.
        </div>
      )}
    </section>
  );
}

const panel = {
  width: "100%",
  boxSizing: "border-box",
  padding: "18px",
  border: "1px solid #d9e1d5",
  borderRadius: "8px",
  background: "#ffffff",
};
const compactPanel = { ...panel, padding: "16px", marginBottom: "16px" };
const header = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
  marginBottom: "12px",
};
const eyebrow = {
  display: "block",
  marginBottom: "4px",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
};
const heading = { margin: 0, color: "#172317", fontSize: "22px", lineHeight: 1.25 };
const badge = {
  padding: "6px 9px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  background: "#f8fafc",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 800,
};
const notice = {
  margin: "0 0 16px",
  padding: "12px",
  border: "1px solid #fed7aa",
  borderRadius: "8px",
  background: "#fff7ed",
  color: "#7c2d12",
  lineHeight: 1.5,
};
const list = { display: "grid", gap: "10px" };
const recordCard = {
  minWidth: 0,
  display: "grid",
  gap: "4px",
  padding: "13px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  background: "#f8fafc",
};
const recordSource = { color: "#64748b", fontSize: "11px", fontWeight: 900 };
const recordTitle = { overflowWrap: "anywhere", color: "#172317", lineHeight: 1.35 };
const recordDetail = { overflowWrap: "anywhere", color: "#475569", lineHeight: 1.45 };
const empty = {
  padding: "20px 14px",
  border: "1px dashed #cbd5e1",
  borderRadius: "8px",
  color: "#64748b",
  textAlign: "center",
};

export default LegacyWorkCenterReadOnlyPanel;
