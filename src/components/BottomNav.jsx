import { useEffect, useRef, useState } from "react";
import { Keyboard } from "@capacitor/keyboard";
import { getLanguage, t } from "../utils/language";
import {
  getNotifications,
  getUnreadNotificationCount,
  saveNotifications,
} from "../utils/notifications";
import { openActiveEmergencyConversation } from "../utils/emergencyLifecycle";
import { getAccountModeForPage } from "../utils/session";
import {
  getConversationMetrics,
  getProfessionalWorkMetrics,
} from "../utils/dashboardMetrics";
import MeetroIcon from "./MeetroIcon";

function getUnreadMessageCount() {
  try {
    const registry = JSON.parse(
      localStorage.getItem("meetro_conversation_registry") || "[]"
    );

    if (Array.isArray(registry)) {
      return getConversationMetrics({ registry }).unreadConversationCount;
    }
  } catch {
    // Fall back to the legacy cached count.
  }

  return Number(localStorage.getItem("mockUnreadMessages") || 0);
}

function hasUnreadEmergencyConversation() {
  try {
    const registry = JSON.parse(
      localStorage.getItem("meetro_conversation_registry") || "[]"
    );

    return registry.some(
      (item) => item.conversation_type === "emergency" && item.unread
    );
  } catch {
    return false;
  }
}

function getWorkCenterAlertDestination() {
  const notifications = getNotifications().filter(
    (notice) =>
      !notice.read &&
      (notice.targetRole === "professional" || notice.targetRole === "all")
  );

  let quoteHistory = [];
  try {
    quoteHistory = JSON.parse(localStorage.getItem("workCenterQuoteHistory") || "[]");
  } catch {
    quoteHistory = [];
  }

  const hasAcceptedQuote = Array.isArray(quoteHistory) &&
    quoteHistory.some(
      (quote) =>
        !quote.movedToActiveAt &&
        ["accepted", "approved", "quote_approved"].includes(
          String(quote.status || quote.quoteStatus || "").toLowerCase()
        )
    );

  if (
    hasAcceptedQuote ||
    notifications.some((notice) => notice.type === "quote_accepted")
  ) {
    return { tab: "quotes", quoteStatusFilter: "accepted" };
  }

  if (
    notifications.some((notice) =>
      ["appointment_confirmed", "appointment_change_requested", "schedule_response"].includes(
        notice.type
      )
    )
  ) {
    return { tab: "schedule" };
  }

  if (
    notifications.some((notice) =>
      ["completion_pending", "closure_pending", "completion_confirmed"].includes(
        notice.type
      )
    )
  ) {
    return { tab: "completed" };
  }

  if (
    notifications.some((notice) =>
      ["active_work_update", "materials_update", "work_update"].includes(notice.type)
    )
  ) {
    return { tab: "active" };
  }

  if (
    notifications.some((notice) =>
      ["new_lead", "new_opportunity", "quote_request"].includes(notice.type)
    )
  ) {
    return { tab: "pending" };
  }

  return { tab: "pending" };
}

function getAcceptedQuoteReadyCount() {
  try {
    return getProfessionalWorkMetrics().quoteResponseAlertCount;
  } catch {
    return 0;
  }
}

function getActiveEmergencyAlertCount() {
  try {
    const activeRecord = JSON.parse(
      localStorage.getItem("activeEmergencyRecord") || "{}"
    );
    const status =
      activeRecord.status ||
      localStorage.getItem("emergencyDispatchStatus") ||
      "";

    return ["pending", "accepted", "enroute", "arrived", "started"].includes(
      String(status).toLowerCase()
    )
      ? 1
      : 0;
  } catch {
    return 0;
  }
}

function BottomNav({ setPage, currentPage = "" }) {
  const [language, updateLanguage] = useState(getLanguage());
  const [activeMode, setActiveMode] = useState(
    getAccountModeForPage(
      currentPage,
      localStorage.getItem("activeAccountMode") || "personal"
    )
  );
  const [notificationTick, setNotificationTick] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const navTouchStartRef = useRef({ x: 0, y: 0, moved: false });

  useEffect(() => {
    const syncNav = () => {
      updateLanguage(getLanguage());
      setActiveMode(
        getAccountModeForPage(
          currentPage,
          localStorage.getItem("activeAccountMode") || "personal"
        )
      );
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
  }, [currentPage]);

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
      icon: "home",
      label: t("home"),
      sub: t("dashboard"),
    },
    {
      page: "discover",
      aliases: ["discover"],
      icon: "discover",
      label: t("discover"),
      sub: t("services"),
    },
    {
      page: "upload",
      aliases: ["upload"],
      icon: "request",
      label: t("upload"),
      sub: t("request"),
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
      icon: "messages",
      label: t("messages"),
      sub: t("chat"),
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "profile",
      label: t("profile"),
      sub: t("account"),
    },
  ];

  const businessNavItems = [
    {
      page: "businessDashboard",
      aliases: ["businessDashboard", "dashboard", "businessHome"],
      icon: "businessDashboard",
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
      icon: "businessLeads",
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
      icon: "workCenter",
      label: t("workCenter"),
      sub: t("operations"),
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
      icon: "messages",
      label: t("messages"),
      sub: t("customers"),
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "profile",
      label: t("profile"),
      sub: t("account"),
    },
  ];

  useEffect(() => {
    setKeyboardOpen(false);
    setActiveMode(
      getAccountModeForPage(
        currentPage,
        localStorage.getItem("activeAccountMode") || "personal"
      )
    );
  }, [currentPage]);

  const navItems = activeMode === "business" ? businessNavItems : personalNavItems;
  const normalizedPage = currentPage || "";

  const operationsAlertCount =
    activeMode === "business"
      ? Math.max(
          getUnreadNotificationCount("professional"),
          getAcceptedQuoteReadyCount(),
          getActiveEmergencyAlertCount()
        )
      : 0;

  void notificationTick;

  if (keyboardOpen) {
    return null;
  }

  const isLandscapeCompact =
    typeof window !== "undefined" &&
    window.matchMedia?.("(orientation: landscape) and (max-height: 500px)")?.matches;

  return (
    <div className="bottom-nav-dock" style={navDock}>
      <div className="bottom-nav" style={isLandscapeCompact ? navWrapperLandscape : navWrapper}>
        <div className="bottom-nav-container" style={isLandscapeCompact ? navContainerLandscape : navContainer}>
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
              ? getUnreadMessageCount()
              : 0;

          const isCenterAction = activeMode === "business" && item.center;

          const handleNavPress = () => {
            if (item.page === "home") {
              window.dispatchEvent(new Event("meetroHomeResetToLanding"));
            }

            if (item.page === "contractorDashboard") {
              localStorage.removeItem("meetroWorkCenterTab");
              localStorage.removeItem("activeWorkCenterTab");
              localStorage.removeItem("workCenterScheduleFilter");
              localStorage.removeItem("conversationReturnSection");
              localStorage.removeItem("quoteStatusFilter");
              window.dispatchEvent(new Event("meetroWorkCenterResetToLanding"));

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

            if (
              activeMode === "business" &&
              item.page === "messagesInbox" &&
              hasUnreadEmergencyConversation() &&
              openActiveEmergencyConversation(setPage, normalizedPage)
            ) {
              return;
            }

            setKeyboardOpen(false);
            document.activeElement?.blur?.();
            setPage(item.page);
          };

          return (
            <button
              key={item.page}
              type="button"
              className={`bottom-nav-item${active ? " active" : ""}`}
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
                ...(isLandscapeCompact ? navButtonLandscape : {}),
                ...(isCenterAction ? centerNavButton : {}),
                ...(active && !isCenterAction ? activeButton : {}),
                ...(active && isCenterAction ? centerNavButtonActive : {}),
                ...(isCenterAction && unread > 0 ? centerNavButtonAlert : {}),
                ...(active && isLandscapeCompact ? activeButtonLandscape : {}),
              }}
            >
              <div
                className="bottom-nav-icon"
                style={{
                  ...iconWrap,
                  ...(isLandscapeCompact ? iconWrapLandscape : {}),
                  ...(isCenterAction ? centerIconWrap : {}),
                  ...(active && !isCenterAction ? activeIconWrap : {}),
                  ...(active && isCenterAction ? centerIconWrapActive : {}),
                  ...(isCenterAction && unread > 0 ? centerIconWrapAlert : {}),
                  ...(isCenterAction && isLandscapeCompact ? centerIconWrapLandscape : {}),
                  position: "relative",
                }}
              >
                <MeetroIcon
                  name={item.icon}
                  size={isCenterAction ? 28 : 24}
                  decorative
                  style={active ? activeIconText : iconText}
                />

                {unread > 0 && <div style={badge}>{unread}</div>}
              </div>

              <span className="bottom-nav-label" style={{ ...label, ...(isLandscapeCompact ? labelLandscape : {}), ...(active ? activeLabel : {}) }}>
                {item.label}
              </span>

              <span className="bottom-nav-subtitle" style={{ ...subLabel, ...(isLandscapeCompact ? subLabelLandscape : {}), ...(active ? activeSubLabel : {}) }}>
                {item.sub}
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}

const centerNavButton = {};

const centerNavButtonActive = {
  background: "rgba(124,58,237,0.10)",
  border: "1px solid transparent",
  boxShadow: "none",
};

const centerNavButtonAlert = {
  filter: "drop-shadow(0 10px 18px rgba(249,115,22,0.22))",
};

const centerIconWrap = {
  width: "30px",
  height: "30px",
  borderRadius: "10px",
  fontSize: "18px",
  background: "transparent",
  color: "#5b3df5",
  border: "none",
  boxShadow: "none",
};

const centerIconWrapLandscape = {
  width: "24px",
  height: "24px",
  borderRadius: "10px",
  fontSize: "14px",
  boxShadow: "none",
};

const centerIconWrapActive = {
  background: "transparent",
  color: "#4f2df3",
  border: "none",
  boxShadow: "none",
};

const centerIconWrapAlert = {
  background: "#fff7ed",
  color: "#f97316",
  border: "1px solid #fed7aa",
  boxShadow: "0 10px 24px rgba(249,115,22,0.22)",
};

const navDock = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflowX: "hidden",
  zIndex: 9999,
  pointerEvents: "none",
};

const navWrapper = {
  pointerEvents: "auto",
  width: "100%",
  maxWidth: "100%",
  margin: 0,
  display: "flex",
  alignItems: "stretch",
  justifyContent: "space-around",
  padding: "5px 4px calc(5px + env(safe-area-inset-bottom))",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.98)",
  backdropFilter: "blur(16px)",
  borderRadius: 0,
  boxShadow: "0 -1px 8px rgba(15,23,42,0.10)",
};

const navWrapperLandscape = {
  ...navWrapper,
  width: "100%",
  padding: "3px 4px calc(3px + env(safe-area-inset-bottom))",
};

const navContainer = {
  touchAction: "manipulation",
  WebkitTransform: "translateZ(0)",
  transform: "translateZ(0)",
  width: "100%",
  background: "transparent",
  border: "none",
  borderRadius: 0,
  padding: "0",
  display: "flex",
  alignItems: "stretch",
  justifyContent: "space-around",
  gap: "0",
  pointerEvents: "auto",
  boxSizing: "border-box",
};

const navContainerLandscape = {
  ...navContainer,
  padding: "0",
  gap: "0",
};

const navButton = {
  flex: 1,
  minWidth: 0,
  minHeight: "50px",
  border: "1px solid transparent",
  background: "transparent",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "2px",
  padding: "3px 2px",
  borderRadius: "10px",
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

const navButtonLandscape = {
  minHeight: "40px",
  padding: "2px",
  borderRadius: "10px",
};

const activeButton = {
  minHeight: "50px",
  padding: "3px 2px",
  transform: "none",
  background: "rgba(91,61,245,0.12)",
  color: "#4f2df3",
  border: "1px solid transparent",
  boxShadow: "none",
};

const activeButtonLandscape = {
  minHeight: "40px",
  padding: "2px",
  transform: "none",
};

const iconWrap = {
  width: "30px",
  height: "30px",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  background: "transparent",
  color: "#182235",
  transition: "180ms ease",
};

const iconWrapLandscape = {
  width: "24px",
  height: "24px",
  borderRadius: "10px",
  fontSize: "14px",
  boxShadow: "none",
};

const activeIconWrap = {
  background: "transparent",
  color: "#4f2df3",
  boxShadow: "none",
};

const iconText = {
  lineHeight: 1,
};

const activeIconText = {
  lineHeight: 1,
  transform: "none",
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

const labelLandscape = {
  fontSize: "10px",
  lineHeight: 1.05,
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

const subLabelLandscape = {
  fontSize: "8px",
  lineHeight: 1,
};

const activeSubLabel = {
  color: "#7c5cff",
  fontWeight: "800",
};

export default BottomNav;
