import { useEffect, useRef, useState } from "react";
import { Keyboard } from "@capacitor/keyboard";
import { getLanguage, t } from "../utils/language";
import {
  getNotifications,
  getUnreadNotificationCount,
  saveNotifications,
} from "../utils/notifications";

function BottomNav({ setPage, currentPage = "" }) {
  const [language, updateLanguage] = useState(getLanguage());
  const [activeMode, setActiveMode] = useState(
    localStorage.getItem("activeAccountMode") || "personal"
  );
  const [notificationTick, setNotificationTick] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const navTouchStartRef = useRef({ x: 0, y: 0, moved: false });

  useEffect(() => {
    const syncNav = () => {
      updateLanguage(getLanguage());
      setActiveMode(localStorage.getItem("activeAccountMode") || "personal");
      setNotificationTick((tick) => tick + 1);
    };

    window.addEventListener("languageChanged", syncNav);
    window.addEventListener("meetro-language-change", syncNav);
    window.addEventListener("accountModeChanged", syncNav);
    window.addEventListener("storage", syncNav);
    window.addEventListener("meetroNotificationsUpdated", syncNav);
    window.addEventListener("meetro-messages-updated", syncNav);

    return () => {
      window.removeEventListener("languageChanged", syncNav);
      window.removeEventListener("meetro-language-change", syncNav);
      window.removeEventListener("accountModeChanged", syncNav);
      window.removeEventListener("storage", syncNav);
      window.removeEventListener("meetroNotificationsUpdated", syncNav);
      window.removeEventListener("meetro-messages-updated", syncNav);
    };
  }, []);

  useEffect(() => {
    let showListener;
    let hideListener;

    const isEditableTarget = (target) => {
      const tag = target?.tagName?.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        target?.isContentEditable
      );
    };

    const handleFocusIn = (event) => {
      if (isEditableTarget(event.target)) {
        setKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => setKeyboardOpen(false), 220);
    };

    const handleViewportResize = () => {
      if (!window.visualViewport) return;

      const heightDifference =
        window.innerHeight - window.visualViewport.height;

      if (heightDifference > 100) {
        setKeyboardOpen(true);
      }
    };

    const setupKeyboardListeners = async () => {
      try {
        showListener = await Keyboard.addListener("keyboardWillShow", () => {
          setKeyboardOpen(true);
        });

        hideListener = await Keyboard.addListener("keyboardWillHide", () => {
          setKeyboardOpen(false);
        });
      } catch (error) {
        // Browser fallback only.
      }
    };

    setupKeyboardListeners();

    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    window.visualViewport?.addEventListener("resize", handleViewportResize);

    return () => {
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
      showListener?.remove?.();
      hideListener?.remove?.();
    };
  }, []);

  const personalNavItems = [
    {
      page: "home",
      aliases: ["home"],
      icon: "🏠",
      label: t("home"),
      sub: t("dashboard"),
    },
    {
      page: "discover",
      aliases: ["discover"],
      icon: "🔎",
      label: t("discover"),
      sub: t("services"),
    },
    {
      page: "upload",
      aliases: ["upload"],
      icon: "➕",
      label: t("upload"),
      sub: t("project"),
    },
    {
      page: "messagesInbox",
      aliases: [
        "chat",
        "messages",
        "messagesInbox",
        "conversationThread",
        "conversation",
        "thread",
      ],
      icon: "💬",
      label: t("messages"),
      sub: t("chat"),
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "👤",
      label: t("profile"),
      sub: t("account"),
    },
  ];

  const businessNavItems = [
    {
       page: "businessDashboard",
      aliases: ["businessDashboard", "dashboard", "businessHome"],
      icon: "📊",
      label: t("dashboard"),
      sub: t("business"),
    },
    {
      page: "businessLeads",
      aliases: [
        "businessLeads",
        "leads",
        "leadInbox",
        "businessLeadInbox",
        "quoteRequests",
        "contractorRequests",
      ],
      icon: "📥",
      label: t("leads"),
      sub: t("openRequests"),
    },
    {
      page: "contractorDashboard",
      aliases: [
        "contractorDashboard",
        "workCenter",
        "workDashboard",
        "schedule",
        "activeJobs",
      ],
      icon: "🧰",
      label: "Work Center",
      sub: "Operations",
      center: true,
    },
    {
      page: "messagesInbox",
      aliases: [
        "messagesInbox",
        "messages",
        "chat",
        "conversationThread",
        "conversation",
        "thread",
      ],
      icon: "💬",
      label: t("messages"),
      sub: t("customers"),
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "👤",
      label: t("profile"),
      sub: t("account"),
    },
  ];

  useEffect(() => {
    setKeyboardOpen(false);
  }, [currentPage]);

  const navItems = activeMode === "business" ? businessNavItems : personalNavItems;
  const normalizedPage = currentPage || "";

  const operationsAlertCount =
    activeMode === "business"
      ? getUnreadNotificationCount("professional")
      : 0;

  void notificationTick;

  if (keyboardOpen) {
    return null;
  }

  return (
    <div style={navWrapper}>
      <div style={navContainer}>
        {navItems.map((item) => {
          const active =
  item.page === normalizedPage ||
  item.aliases?.includes(normalizedPage) ||
  (
    item.page === "businessLeads" &&
    normalizedPage === "businessLeads"
  );

          const unread =
            item.page === "contractorDashboard"
              ? operationsAlertCount
              : item.aliases?.some((alias) =>
                  ["chat", "messages", "messagesInbox", "conversationThread"].includes(alias)
                )
              ? Number(localStorage.getItem("mockUnreadMessages") || 0)
              : 0;

          const isCenterAction = activeMode === "business" && item.center;

          const handleNavPress = () => {
            if (item.page === "contractorDashboard") {
              const notifications = getNotifications();

              saveNotifications(
                notifications.map((notice) =>
                  notice.targetRole === "professional" ||
                  notice.targetRole === "all"
                    ? { ...notice, read: true }
                    : notice
                )
              );
            }

            setKeyboardOpen(false);
            document.activeElement?.blur?.();
            setPage(item.page);
          };

          return (
            <button
              key={item.page}
              type="button"
              onPointerDown={(event) => {
                navTouchStartRef.current = {
                  x: event.clientX || 0,
                  y: event.clientY || 0,
                  moved: false,
                };
              }}
              onPointerMove={(event) => {
                const start = navTouchStartRef.current;
                const dx = Math.abs((event.clientX || 0) - start.x);
                const dy = Math.abs((event.clientY || 0) - start.y);

                if (dx > 10 || dy > 10) {
                  navTouchStartRef.current.moved = true;
                }
              }}
              onPointerUp={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!navTouchStartRef.current.moved) {
                  handleNavPress();
                }
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              style={{
                ...navButton,
                ...(isCenterAction ? centerNavButton : {}),
                ...(active && !isCenterAction ? activeButton : {}),
                ...(active && isCenterAction ? centerNavButtonActive : {}),
                ...(isCenterAction && unread > 0 ? centerNavButtonAlert : {}),
              }}
            >
              <div
                style={{
                  ...iconWrap,
                  ...(isCenterAction ? centerIconWrap : {}),
                  ...(active && !isCenterAction ? activeIconWrap : {}),
                  ...(active && isCenterAction ? centerIconWrapActive : {}),
                  ...(isCenterAction && unread > 0 ? centerIconWrapAlert : {}),
                  position: "relative",
                }}
              >
                <span style={active ? activeIconText : iconText}>{item.icon}</span>

                {unread > 0 && <div style={badge}>{unread}</div>}
              </div>

              <span style={{ ...label, ...(active ? activeLabel : {}) }}>
                {item.label}
              </span>

              <span style={{ ...subLabel, ...(active ? activeSubLabel : {}) }}>
                {item.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const centerNavButton = {};

const centerNavButtonActive = {
  background: "rgba(124,58,237,0.08)",
  border: "1px solid rgba(124,58,237,0.18)",
  boxShadow: "0 10px 24px rgba(124,58,237,0.16)",
};

const centerNavButtonAlert = {
  filter: "drop-shadow(0 10px 18px rgba(249,115,22,0.22))",
};

const centerIconWrap = {
  width: "52px",
  height: "52px",
  borderRadius: "22px",
  background: "#f8f7ff",
  color: "#5b3df5",
  border: "1px solid #ede9fe",
  boxShadow: "0 10px 24px rgba(91,61,245,0.14)",
};

const centerIconWrapActive = {
  background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
  color: "white",
  border: "1px solid rgba(124,58,237,0.14)",
  boxShadow: "0 10px 22px rgba(124,58,237,0.24)",
};

const centerIconWrapAlert = {
  background: "#fff7ed",
  color: "#f97316",
  border: "1px solid #fed7aa",
  boxShadow: "0 10px 24px rgba(249,115,22,0.22)",
};

const navWrapper = {
  position: "fixed",
  bottom: "0px",
  left: "0",
  right: "0",
  width: "100%",
  maxWidth: "460px",
  margin: "0 auto",
  zIndex: 2147483000,
  pointerEvents: "auto",
  padding: "0 10px calc(4px + env(safe-area-inset-bottom))",
  boxSizing: "border-box",
};

const navContainer = {
  touchAction: "manipulation",
  WebkitTransform: "translateZ(0)",
  transform: "translateZ(0)",
  background: "rgba(255,255,255,0.96)",
  backdropFilter: "blur(24px)",
  border: "1px solid rgba(226,232,240,0.95)",
  borderRadius: "30px",
  padding: "9px 8px",
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  alignItems: "stretch",
  gap: "4px",
  pointerEvents: "auto",
  boxShadow:
    "0 18px 48px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.75)",
};

const navButton = {
  width: "100%",
  minWidth: 0,
  minHeight: "68px",
  border: "1px solid transparent",
  background: "transparent",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  padding: "10px 4px",
  borderRadius: "24px",
  cursor: "pointer",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  userSelect: "none",
  WebkitUserSelect: "none",
  pointerEvents: "auto",
  position: "relative",
  zIndex: 1,
  transition:
    "background 180ms ease, box-shadow 180ms ease, border 180ms ease",
};

const activeButton = {
  background: "#f1edff",
  border: "1px solid rgba(91,61,245,0.25)",
  
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
  color: "#475569",
  lineHeight: 1.1,
  marginTop: "1px",
  textAlign: "center",
};

const activeSubLabel = {
  color: "#7c5cff",
  fontWeight: "800",
};

export default BottomNav;
