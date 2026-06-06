function SafeBackBar({ setPage, fallback = "home", label = "← Back" }) {
  return (
    <div
      style={{
        position: "relative",
        top: "0",
        zIndex: 9999,
        padding: "calc(env(safe-area-inset-top) + 12px) 0 14px",
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
          padding: "10px 16px",
          borderRadius: "999px",
          boxShadow: "0 8px 20px rgba(91,61,245,0.12)",
          fontSize: "16px",
          fontWeight: "600",
          color: "#5b3df5",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    </div>
  );
}

export default SafeBackBar;
