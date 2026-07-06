function WorkflowStatusPill({
  label,
  background = "rgba(31, 77, 52, 0.15)",
  color = "var(--meetro-color-forest, #1f4d34)",
  border = "1px solid rgba(31, 77, 52, 0.35)",
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
