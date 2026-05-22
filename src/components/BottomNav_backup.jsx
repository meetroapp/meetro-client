import { useEffect, useState } from "react";
import { getLanguage, t } from "../utils/language";

function BottomNav({ setPage, currentPage }) {
  const [language, updateLanguage] = useState(getLanguage());
  const [activeMode, setActiveMode] = useState(
    localStorage.getItem("activeAccountMode") || "personal"
  );

  useEffect(() => {
    const syncNav = () => {
      updateLanguage(getLanguage());
      setActiveMode(localStorage.getItem("activeAccountMode") || "personal");
    };

    window.addEventListener("languageChanged", syncNav);
    window.addEventListener("meetro-language-change", syncNav);
    window.addEventListener("accountModeChanged", syncNav);
    window.addEventListener("storage", syncNav);

    return () => {
      window.removeEventListener("languageChanged", syncNav);
      window.removeEventListener("meetro-language-change", syncNav);
      window.removeEventListener("accountModeChanged", syncNav);
      window.removeEventListener("storage", syncNav);
    };
  }, []);

  const messagePages = [
    "chat",
    "messages",
    "messagesInbox",
    "conversationThread",
    "conversation",
    "thread",
  ];

  const personalNavItems = [
    {
      page: "home",
      icon: "🏠",
      label: t("home"),
      sub: t("dashboard"),
    },
    {
      page: "discover",
      icon: "🔎",
      label: t("discover"),
      sub: t("services"),
    },
    {
      page: "upload",
      icon: "➕",
      label: t("upload"),
      sub: t("project"),
    },
    {
      page: "chat",
      icon: "💬",
      label: t("messages"),
      sub: t("chat"),
      group: "messages",
    },
    {
      page: "profile",
      icon: "👤",
      label: t("profile"),
      sub: t("account"),
    },
  ];

  const businessNavItems = [
    {
      page: "businessDashboard",
      icon: "📊",
      label: t("dashboard"),
      sub: t("business"),
    },
    {
    page: "businessLeads",
    aliases: ["businessLeads", "leads"],
    icon: "📥",
    label: t("leads"),
    sub: t("openRequests"),
    },
    {
      page: "messagesInbox",
      icon: "💬",
      label: t("messages"),
      sub: t("customers"),
      group: "messages",
    },
    {
      page: "projectGallery",
      icon: "▧",
      label: t("gallery"),
      sub: t("portfolio"),
    },
    {
      page: "profile",
      icon: "👤",
      label: t("profile"),
      sub: t("account"),
    },
  ];

  const navItems =
    activeMode === "business"
      ? businessNavItems
      : personalNavItems;

  const isMessagesPage = messagePages.includes(currentPage);

  return (
    <div style={navWrapper}>
      <div style={navContainer}>
        {navItems.map((item) => {

        const normalizedPage = currentPage || "";

const active =
  normalizedPage === item.page ||
  item.aliases?.includes(normalizedPage) ||
  (item.page === "businessLeads" && normalizedPage === "businessLeads") ||
  (item.group === "messages" && isMessagesPage);

          const unread =
            item.group === "messages"
              ? Number(localStorage.getItem("mockUnreadMessages") || 0)
              : 0;

          return (
            <button
              key={item.page}
              onClick={() => setPage(item.page)}
              style={{
                ...navButton,
                ...(active ? activeButton : {}),
              }}
            >
              <div
                style={{
                  ...iconWrap,
                  ...(active ? activeIconWrap : {}),
                  position: "relative",
                }}
              >
                <span style={active ? activeIconText : iconText}>
                  {item.icon}
                </span>

                {unread > 0 && (
                  <div style={badge}>
                    {unread}
                  </div>
                )}
              </div>

              <span
                style={{
                  ...label,
                  ...(active ? activeLabel : {}),
                }}
              >
                {item.label}
              </span>

              <span
                style={{
                  ...subLabel,
                  ...(active ? activeSubLabel : {}),
                }}
              >
                {item.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const navWrapper = {
  position: "fixed",
  bottom: "0",
  left: "50%",
  transform: "translateX(-50%)",
  width: "100%",
  maxWidth: "460px",
  zIndex: 1000,
  padding: "0 10px 12px",
  boxSizing: "border-box",
};

const navContainer = {
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(24px)",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: "30px",
  padding: "9px 8px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow:
    "0 18px 48px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.75)",
};

const navButton = {
  flex: 1,
  border: "1px solid transparent",
  background: "transparent",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  padding: "8px 4px",
  borderRadius: "24px",
  cursor: "pointer",
  transition:
    "background 180ms ease, transform 180ms ease, box-shadow 180ms ease, border 180ms ease",
};

const activeButton = {
  background: "#f1edff",
  border: "1px solid rgba(91,61,245,0.25)",
  transform: "translateY(-4px)",
  boxShadow:
    "0 12px 28px rgba(91,61,245,0.22), inset 0 1px 0 rgba(255,255,255,0.85)",
};

const iconWrap = {
  width: "40px",
  height: "40px",
  borderRadius: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  background: "#f8fafc",
  color: "#475569",
  transition: "180ms ease",
};

const activeIconWrap = {
  background: "linear-gradient(135deg, #7c5cff, #5b3df5)",
  color: "#ffffff",
  boxShadow:
    "0 10px 24px rgba(91,61,245,0.35), 0 0 0 5px rgba(91,61,245,0.10)",
};

const iconText = {
  lineHeight: 1,
};

const activeIconText = {
  lineHeight: 1,
  transform: "scale(1.08)",
};

const badge = {
  position: "absolute",
  top: "-4px",
  right: "-5px",
  minWidth: "18px",
  height: "18px",
  borderRadius: "999px",
  background: "#ff3b5c",
  color: "white",
  fontSize: "10px",
  fontWeight: "900",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 5px",
  boxShadow: "0 4px 12px rgba(255,59,92,0.35)",
};

const label = {
  fontSize: "11px",
  fontWeight: "900",
  color: "#334155",
  lineHeight: 1,
};

const activeLabel = {
  color: "#5b3df5",
};

const subLabel = {
  fontSize: "9px",
  color: "#94a3b8",
  lineHeight: 1.1,
  marginTop: "1px",
  textAlign: "center",
};

const activeSubLabel = {
  color: "#7c5cff",
  fontWeight: "800",
};

export default BottomNav;
