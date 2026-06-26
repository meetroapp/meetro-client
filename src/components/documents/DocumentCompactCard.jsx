import MeetroIcon from "../MeetroIcon";

function money(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "";
  return number.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function DocumentCompactCard({
  type = "quote",
  title = "",
  name = "",
  total = "",
  status = "",
  language = "en",
  onPreview,
  primaryAction,
  secondaryAction,
}) {
  const typeLabel =
    type === "invoice"
      ? language === "es" ? "Factura" : "Invoice"
      : type === "receipt"
      ? language === "es" ? "Recibo" : "Receipt"
      : language === "es" ? "Cotización" : "Quote";

  return (
    <div style={card}>
      <div style={topRow}>
        <span style={pill}>{typeLabel}</span>
        {status && <span style={statusBadge}>{status}</span>}
      </div>

      <strong style={titleStyle}>{title || typeLabel}</strong>
      {name && <span style={muted}>{name}</span>}

      <div style={totalRow}>
        <span>{language === "es" ? "Total" : "Total"}</span>
        <strong>{money(total) || total || "—"}</strong>
      </div>

      <div style={actions}>
        <button type="button" style={primaryButton} onClick={onPreview}>
          <MeetroIcon name="openExternal" size={15} decorative />
          {language === "es" ? "Vista previa" : "Preview"}
        </button>
        {primaryAction}
        {secondaryAction}
      </div>
    </div>
  );
}

const card = {
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(15, 23, 42, 0.1)",
  borderRadius: 18,
  background: "#fff",
  padding: 14,
  display: "grid",
  gap: 10,
  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.08)",
};

const topRow = { display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" };
const pill = { fontSize: 12, fontWeight: 800, color: "#2563eb", background: "#eff6ff", borderRadius: 999, padding: "5px 9px" };
const statusBadge = { fontSize: 12, fontWeight: 800, color: "#166534", background: "#dcfce7", borderRadius: 999, padding: "5px 9px" };
const titleStyle = { fontSize: 16, lineHeight: 1.25, color: "#0f172a" };
const muted = { fontSize: 13, color: "#64748b" };
const totalRow = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 14, color: "#334155" };
const actions = { display: "flex", flexWrap: "wrap", gap: 8 };
const primaryButton = {
  border: 0,
  borderRadius: 12,
  padding: "10px 12px",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 800,
  display: "inline-flex",
  gap: 7,
  alignItems: "center",
  cursor: "pointer",
};
