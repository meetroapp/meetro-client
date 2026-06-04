function WorkflowStatusPill({
  label,
  background = "rgba(139, 92, 246, 0.15)",
  color = "#8b5cf6",
  border = "1px solid rgba(139, 92, 246, 0.35)",
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background,
        color,
        border,
      }}
    >
      {label}
    </div>
  );
}

export default WorkflowStatusPill;
