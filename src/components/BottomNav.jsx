function BottomNav({ setPage, currentPage }) {
  const navItem = (page, icon) => {
    const isActive = currentPage === page;

    return (
      <button
        onClick={() => setPage(page)}
        style={{
          border: "none",
          background: isActive ? "#5b3df5" : "transparent",
          color: isActive ? "white" : "#777",
          fontSize: "22px",
          width: "48px",
          height: "48px",
          borderRadius: "18px",
          cursor: "pointer",
        }}
      >
        {icon}
      </button>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "430px",
        background: "white",
        display: "flex",
        justifyContent: "space-around",
        padding: "12px 0",
        borderTop: "1px solid #ddd",
        zIndex: 9999,
      }}
    >
      {navItem("home", "🏠")}
      {navItem("assistant", "✨")}
      {navItem("chat", "💬")}
      {navItem("upload", "➕")}
      {navItem("discover", "🔍")}
      {navItem("profile", "👤")}
    </div>
  );
}

export default BottomNav;
