import { t } from "../utils/language";

function BottomNav({ setPage, currentPage }) {

  const userRole =
    localStorage.getItem("userRole") || "standard";

  const userAccountType =
    localStorage.getItem("accountType") || "homeowner";

  const professionalRoles = [
    "professional",
    "contractor",
    "handyman",
    "painting",
    "plumbing",
    "electrical",
    "flooring",
    "roofing",
    "hvac",
    "landscaping",
    "lawnCare",
    "treeService",
    "poolService",
    "cleaning",
    "pressureWashing",
    "paverSealing",
    "junkRemoval",
    "demolition",
    "drywall",
    "carpentry",
    "doorsWindows",
    "fencing",
    "concrete",
    "tile",
    "applianceRepair",
    "pestControl",
    "moving",
    "realEstate",
    "homeHealthCare",
    "distribution",
    "other",
  ];

  const isProfessional =
  userAccountType === "professional" ||
  professionalRoles.includes(userRole);

  const customerNav = [
    {
      page: "home",
      icon: "🏠",
      label: t("home"),
      subtitle: t("dashboard"),
    },
    {
      page: "upload",
      icon: "➕",
      label: t("postAProject"),
      subtitle: t("requestHelp"),
      featured: true,
    },
    {
      page: "chat",
      icon: "💬",
      label: t("messages"),
      subtitle: t("projectReplies"),
    },
    {
      page: "assistant",
      icon: "✨",
      label: t("aiHelp"),
      subtitle: t("assistantSubtitle"),
    },
    {
      page: "profile",
      icon: "👤",
      label: t("profile"),
      subtitle: t("account"),
    },
  ];

  const professionalNav = [
    {
      page: "home",
      icon: "📊",
      label: t("dashboard"),
      subtitle: t("business"),
    },
    {
      page: "discover",
      icon: "🔎",
      label: t("leads"),
      subtitle: t("openRequests"),
      featured: true,
    },
    {
      page: "chat",
      icon: "💬",
      label: t("messages"),
      subtitle: t("customers"),
    },
    {
      page: "projectGallery",
      icon: "🖼️",
      label: t("gallery"),
      subtitle: t("portfolio"),
    },
    {
      page: "profile",
      icon: "👤",
      label: t("profile"),
      subtitle: t("business"),
    },
  ];

  const navItems = isProfessional
    ? professionalNav
    : customerNav;

  const navItem = (item) => {
    const isActive = currentPage === item.page;

    return (
      <button
        key={item.page}
        onClick={() => setPage(item.page)}
        style={{
          border: "none",
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          color: isActive ? "#111" : "#777",
          cursor: "pointer",
          flex: 1,
          padding: "8px 4px",
        }}
      >
        <div
          style={{
            width: item.featured ? "58px" : "50px",
            height: item.featured ? "58px" : "50px",
            borderRadius: item.featured ? "20px" : "18px",
            background:
              isActive || item.featured
                ? "linear-gradient(135deg,#5b3df5 0%,#7b61ff 100%)"
                : "white",
            color:
              isActive || item.featured
                ? "white"
                : "#777",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: item.featured ? "28px" : "24px",
            transition: "all 0.25s ease",
            transform: isActive
              ? "translateY(-2px) scale(1.05)"
              : "scale(1)",
            boxShadow:
              isActive || item.featured
                ? "0 10px 24px rgba(91,61,245,0.28)"
                : "0 4px 10px rgba(0,0,0,0.05)",
          }}
        >
          {item.icon}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: isActive ? "#5b3df5" : "#111",
              lineHeight: 1.1,
            }}
          >
            {item.label}
          </span>

          <span
            style={{
              fontSize: "10px",
              color: "#777",
              lineHeight: 1.1,
            }}
          >
            {item.subtitle}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div style={navWrapper}>
      {navItems.map((item) => navItem(item))}
    </div>
  );
}

const navWrapper = {
  position: "fixed",
  bottom: 0,
  left: "50%",
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: "430px",
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  padding: "10px 8px 14px",
  boxSizing: "border-box",
  borderTop: "1px solid #eee",
  zIndex: 100,
  boxShadow: "0 -8px 30px rgba(0,0,0,0.08)",
};

export default BottomNav;
