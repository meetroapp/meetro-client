function WorkflowCardShell({ icon, title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 22,
        padding: 18,
        marginTop: 12,
        border: "1px solid rgba(31,77,52,0.15)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 22 }}>{icon}</div>

        <div
          style={{
            fontWeight: 800,
            fontSize: 16,
            color: "#111827",
          }}
        >
          {title}
        </div>
      </div>

      {children}
    </div>
  );
}

export default WorkflowCardShell;
