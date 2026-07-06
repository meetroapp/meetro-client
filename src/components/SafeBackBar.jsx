function SafeBackBar({
  setPage,
  fallback = "home",
  label = "← Back",
  compact = false,
}) {
  return (
    <div
      style={{
        position: "relative",
        top: "0",
        zIndex: 9999,
        padding: compact
          ? "calc(env(safe-area-inset-top) + 4px) 0 8px"
          : "calc(env(safe-area-inset-top) + 12px) 0 14px",
        background: "transparent",
        backdropFilter: "none",
        borderBottom: "none",
      }}
    >
      <button
        onClick={() => setPage(fallback)}
        style={{
          border: "none",
          background: "#eee7ff",
          padding: compact ? "8px 13px" : "10px 16px",
          borderRadius: "999px",
          boxShadow: "0 8px 20px rgba(31,77,52,0.12)",
          fontSize: compact ? "14px" : "16px",
          fontWeight: "600",
          color: "var(--meetro-color-forest, #1f4d34)",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    </div>
  );
}

export default SafeBackBar;
