import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Keyboard } from "@capacitor/keyboard";
import { t } from "../utils/language";
import useLanguage from "../hooks/useLanguage";
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
import { glassActionMenu } from "../styles/liquidGlass";
import { canReadLegacyWorkflowStorage } from "../utils/clientWorkflowStoragePolicy";
import MeetroIcon from "./MeetroIcon";

const EmbeddedProfile = lazy(() => import("../pages/Profile"));

function getUnreadMessageCount() {
  if (!canReadLegacyWorkflowStorage()) return 0;
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
  if (!canReadLegacyWorkflowStorage()) return false;
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
  if (!canReadLegacyWorkflowStorage()) return { tab: "pending" };
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
  if (!canReadLegacyWorkflowStorage()) return 0;
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
  const language = useLanguage();
  const [activeMode, setActiveMode] = useState(
    getAccountModeForPage(
      currentPage,
      localStorage.getItem("activeAccountMode") || "personal"
    )
  );
  const [notificationTick, setNotificationTick] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [profileContextCardOpen, setProfileContextCardOpen] = useState(false);
  const [profileContextCardPosition, setProfileContextCardPosition] = useState({
    top: 96,
    left: 224,
  });
  const navTouchStartRef = useRef({ x: 0, y: 0, moved: false });

  useEffect(() => {
    const syncNav = () => {
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

  const personalMobileNavItems = [
    {
      page: "home",
      aliases: ["home"],
      icon: "home",
      label: t("home"),
      sub: t("dashboard"),
    },
    {
      page: "myRequests",
      aliases: ["myRequests", "projectDetails", "completedJobDetails"],
      icon: "workCenter",
      label: "Work",
      sub: "Center",
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
      label: "Chat",
      sub: "Center",
    },
    {
      page: "meetroMoments",
      aliases: ["meetroMoments"],
      icon: "history",
      label: "Moments",
      sub: "History",
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "profile",
      label: t("profile"),
      sub: t("account"),
    },
  ];

  const businessMobileNavItems = [
    {
      page: "businessDashboard",
      aliases: ["businessDashboard", "dashboard", "businessHome"],
      icon: "businessDashboard",
      label: t("home"),
      sub: t("business"),
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
      label: "Work",
      sub: "Center",
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
      label: "Chat",
      sub: "Center",
    },
    {
      page: "meetroMoments",
      aliases: ["meetroMoments"],
      icon: "history",
      label: "Moments",
      sub: "Legacy",
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "profile",
      label: t("profile"),
      sub: t("account"),
    },
  ];

  const personalDesktopNavItems = [
    {
      page: "home",
      aliases: ["home"],
      icon: "home",
      label: t("home"),
      sub: t("dashboard"),
    },
    {
      page: "myRequests",
      aliases: ["myRequests", "projectDetails", "completedJobDetails"],
      icon: "workCenter",
      label: "Work Center",
      sub: "Current Work",
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
      label: "Communication",
      sub: "Chat",
    },
    {
      page: "meetroMoments",
      aliases: ["meetroMoments"],
      icon: "history",
      label: "Meetro Moments",
      sub: "Home Story",
    },
    {
      page: "discover",
      aliases: ["discover", "contractors", "contractorDetails"],
      icon: "discover",
      label: "Community",
      sub: "Discover",
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "profile",
      label: "Profile / Account",
      sub: t("account"),
    },
  ];

  const businessDesktopNavItems = [
    {
      page: "businessDashboard",
      aliases: ["businessDashboard", "dashboard", "businessHome"],
      icon: "businessDashboard",
      label: t("home"),
      sub: t("business"),
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
      label: "Work Center",
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
      label: "Communication",
      sub: t("customers"),
    },
    {
      page: "meetroMoments",
      aliases: ["meetroMoments"],
      icon: "history",
      label: "Meetro Moments",
      sub: "Business Legacy",
    },
    {
      page: "assetCenter",
      aliases: ["assetCenter"],
      icon: "assetHome",
      label: "Properties",
      sub: "Records",
    },
    {
      page: "customerRelationshipsCenter",
      aliases: ["customerRelationshipsCenter"],
      icon: "people",
      label: "Relationships",
      sub: "Customers",
    },
    {
      page: "discover",
      aliases: ["discover", "contractors", "contractorDetails"],
      icon: "discover",
      label: "Community",
      sub: "Discover",
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "profile",
      label: "Profile / Account",
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
    setProfileContextCardOpen(false);
  }, [currentPage]);

  useEffect(() => {
    if (!profileContextCardOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setProfileContextCardOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileContextCardOpen]);

  const mobileNavItems = activeMode === "business" ? businessMobileNavItems : personalMobileNavItems;
  const desktopNavItems = activeMode === "business" ? businessDesktopNavItems : personalDesktopNavItems;
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
  const isLandscapeCompact =
    typeof window !== "undefined" &&
    window.matchMedia?.("(orientation: landscape) and (max-height: 500px)")?.matches;

  const isNavItemActive = (item) =>
    item.page === normalizedPage ||
    item.aliases?.includes(normalizedPage) ||
    (item.page === "businessLeads" && normalizedPage === "businessLeads");

  const getItemUnreadCount = (item) =>
    item.page === "contractorDashboard"
      ? operationsAlertCount
      : item.aliases?.some((alias) =>
          ["chat", "messages", "messagesInbox", "conversationThread"].includes(alias)
        )
      ? getUnreadMessageCount()
      : 0;

  const handleNavPress = (item, variant = "bottom", event) => {
    if (item.page === "home") {
      window.dispatchEvent(new Event("meetroHomeResetToLanding"));
    }

    if (variant === "sidebar" && item.page === "profile") {
      setKeyboardOpen(false);
      document.activeElement?.blur?.();
      const rect = event?.currentTarget?.getBoundingClientRect?.();

      if (rect) {
        const cardHeight = 700;
        const cardWidth = 430;
        setProfileContextCardPosition({
          top: Math.max(
            18,
            Math.min(rect.top - 8, window.innerHeight - cardHeight - 18)
          ),
          left: Math.min(rect.right + 12, window.innerWidth - cardWidth - 18),
        });
      }

      setProfileContextCardOpen((open) => !open);
      return;
    }

    setProfileContextCardOpen(false);

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
          notice.targetRole === "professional" || notice.targetRole === "all"
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

  const renderNavItem = (item, variant = "bottom") => {
    const active =
      isNavItemActive(item) ||
      (variant === "sidebar" && item.page === "profile" && profileContextCardOpen);
    const unread = getItemUnreadCount(item);
    const isCenterAction = activeMode === "business" && item.center;

    if (variant === "sidebar") {
      return (
        <button
          key={item.page}
          type="button"
          className={`desktop-sidebar-item${active ? " active" : ""}`}
          aria-current={active ? "page" : undefined}
          aria-haspopup={item.page === "profile" ? "dialog" : undefined}
          aria-expanded={item.page === "profile" ? profileContextCardOpen : undefined}
          onClick={(event) => handleNavPress(item, "sidebar", event)}
          style={{
            ...sidebarNavButton,
            ...(active ? sidebarNavButtonActive : {}),
          }}
        >
          <span
            className="desktop-sidebar-icon"
            style={{
              ...sidebarIconWrap,
              ...(active ? sidebarIconWrapActive : {}),
              position: "relative",
            }}
            aria-hidden="true"
          >
            <MeetroIcon
              name={item.icon}
              size={22}
              decorative
              style={active ? activeIconText : iconText}
            />
            {unread > 0 && <span style={sidebarBadge}>{unread}</span>}
          </span>

          <span style={sidebarLabelStack}>
            <span style={{ ...sidebarLabel, ...(active ? sidebarLabelActive : {}) }}>
              {item.label}
            </span>
            <span style={{ ...sidebarSubLabel, ...(active ? sidebarSubLabelActive : {}) }}>
              {item.sub}
            </span>
          </span>
        </button>
      );
    }

    return (
      <button
        key={item.page}
        type="button"
        className={`bottom-nav-item${active ? " active" : ""}`}
        aria-current={active ? "page" : undefined}
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
            handleNavPress(item);
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

        <span
          className="bottom-nav-label"
          style={{
            ...label,
            ...(isLandscapeCompact ? labelLandscape : {}),
            ...(active ? activeLabel : {}),
          }}
        >
          {item.label}
        </span>

        <span
          className="bottom-nav-subtitle"
          style={{
            ...subLabel,
            ...(isLandscapeCompact ? subLabelLandscape : {}),
            ...(active ? activeSubLabel : {}),
          }}
        >
          {item.sub}
        </span>
      </button>
    );
  };

  return (
    <>
      <style>{adaptiveNavigationStyles}</style>

      <nav
        className="desktop-sidebar"
        data-language={language}
        style={desktopSidebar}
        aria-label="Primary desktop navigation"
      >
        <div style={sidebarBrand}>
          <div style={sidebarBrandMark} aria-hidden="true">M</div>
          <div style={sidebarBrandCopy}>
            <strong style={sidebarBrandTitle}>Meetro</strong>
            <span style={sidebarBrandSubtitle}>
              {activeMode === "business" ? t("business") : "Community"}
            </span>
          </div>
        </div>

        <div style={sidebarNavList}>{desktopNavItems.map((item) => renderNavItem(item, "sidebar"))}</div>
      </nav>

      {profileContextCardOpen && (
        <DesktopProfileCard
          currentPage={normalizedPage}
          onClose={() => setProfileContextCardOpen(false)}
          position={profileContextCardPosition}
          setPage={setPage}
        />
      )}

      {!keyboardOpen && (
        <div
          className="bottom-nav-dock"
          data-language={language}
          style={navDock}
          role="navigation"
          aria-label="Primary mobile navigation"
        >
          <div className="bottom-nav" style={isLandscapeCompact ? navWrapperLandscape : navWrapper}>
            <div className="bottom-nav-container" style={isLandscapeCompact ? navContainerLandscape : navContainer}>
              {mobileNavItems.map((item) => renderNavItem(item, "bottom"))}
            </div>
          </div>
      </div>
      )}
    </>
  );
}

function DesktopProfileCard({ currentPage, onClose, position, setPage }) {
  const openFromProfileCard = (pageName) => {
    onClose();
    setPage(pageName);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close profile menu"
        className="desktop-profile-context-backdrop"
        style={profileContextBackdrop}
        onClick={onClose}
      />
      <aside
        className="desktop-profile-context-card"
        role="dialog"
        aria-labelledby="desktop-profile-context-title"
        style={{
          ...profileContextCard,
          top: position.top,
          left: position.left,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={profileContextHeader}>
          <div>
            <p style={profileContextEyebrow}>{t("profile")}</p>
            <h2 id="desktop-profile-context-title" style={profileContextTitle}>
              {t("profile")}
            </h2>
          </div>
          <button
            type="button"
            style={profileContextCloseButton}
            onClick={onClose}
            aria-label={t("close")}
          >
            ×
          </button>
        </div>

        <div className="desktop-profile-card-scroll" style={profileCardScroll}>
          <Suspense fallback={<div style={profileCardLoading}>{t("loading")}</div>}>
            <EmbeddedProfile
              setPage={openFromProfileCard}
              currentPage={currentPage || "profile"}
              embedded
            />
          </Suspense>
        </div>
      </aside>
    </>
  );
}

const adaptiveNavigationStyles = `
  .desktop-sidebar {
    display: none;
  }

  .desktop-profile-context-backdrop,
  .desktop-profile-context-card {
    display: none;
  }

  #root[data-app-layout="desktop"] .desktop-sidebar {
      display: flex;
  }

  #root[data-app-layout="desktop"] .desktop-profile-context-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: block;
      width: 100%;
      max-width: 100vw;
      overflow: hidden;
      border: none;
      background: rgba(15,23,42,0.01);
      cursor: default;
  }

  #root[data-app-layout="desktop"] .desktop-profile-context-card {
      display: block;
  }

  #root[data-app-layout="desktop"] .bottom-nav-dock {
      display: none !important;
  }

  #root[data-app-layout="desktop"] .app-page,
  #root[data-app-layout="desktop"] .page-shell,
  #root[data-app-layout="desktop"] .business-dashboard,
  #root[data-app-layout="desktop"] .contractor-dashboard {
      width: calc(100% - var(--meetro-sidebar-width)) !important;
      max-width: calc(100vw - var(--meetro-sidebar-width)) !important;
      margin-left: var(--meetro-sidebar-width) !important;
      margin-right: 0 !important;
      padding-bottom: max(32px, env(safe-area-inset-bottom, 0px)) !important;
  }

  #root[data-app-layout="desktop"] .meetro-responsive-page,
  #root[data-app-layout="desktop"] .meetro-readable-page,
  #root[data-app-layout="desktop"] .meetro-form-page,
  #root[data-app-layout="desktop"] .meetro-wide-page {
      max-width: calc(100vw - var(--meetro-sidebar-width)) !important;
  }

  #root[data-app-layout="desktop"] .desktop-sidebar-item:focus-visible {
      outline: 3px solid rgba(31, 77, 52, 0.34);
      outline-offset: 3px;
    }

  #root[data-app-layout="desktop"] .desktop-profile-context-card button:focus-visible {
      outline: 3px solid rgba(31, 77, 52, 0.34);
      outline-offset: 3px;
    }

  #root[data-app-layout="desktop"] .desktop-profile-card-scroll .profile-embedded-content {
      max-width: none !important;
      margin-left: 0 !important;
      width: 100% !important;
  }
`;

const desktopSidebar = {
  position: "fixed",
  top: "18px",
  left: "18px",
  bottom: "18px",
  width: "calc(var(--meetro-sidebar-width, 284px) - 36px)",
  zIndex: 9998,
  flexDirection: "column",
  gap: "18px",
  padding: "16px",
  boxSizing: "border-box",
  borderRadius: "28px",
  background:
    "linear-gradient(180deg, var(--meetro-surface-paper), var(--meetro-surface-warm))",
  border: "1px solid var(--meetro-color-line)",
  boxShadow: "var(--meetro-shadow-lifted)",
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  overflow: "hidden",
};

const sidebarBrand = {
  display: "grid",
  gridTemplateColumns: "42px minmax(0, 1fr)",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
};

const sidebarBrandMark = {
  width: "42px",
  height: "42px",
  borderRadius: "16px",
  display: "grid",
  placeItems: "center",
  background: "var(--meetro-gradient-community-action)",
  color: "#fffdf8",
  fontSize: "18px",
  fontWeight: "950",
  boxShadow: "0 14px 30px rgba(31,77,52,0.22)",
};

const sidebarBrandCopy = {
  display: "grid",
  gap: "2px",
  minWidth: 0,
};

const sidebarBrandTitle = {
  color: "var(--meetro-color-ink)",
  fontSize: "18px",
  lineHeight: 1,
  fontWeight: "950",
};

const sidebarBrandSubtitle = {
  color: "var(--meetro-color-muted)",
  fontSize: "11px",
  lineHeight: 1.2,
  fontWeight: "850",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const sidebarNavList = {
  display: "grid",
  gap: "8px",
  minWidth: 0,
};

const sidebarNavButton = {
  width: "100%",
  minWidth: 0,
  border: "1px solid transparent",
  background: "transparent",
  borderRadius: "18px",
  padding: "10px",
  display: "grid",
  gridTemplateColumns: "38px minmax(0, 1fr)",
  alignItems: "center",
  gap: "10px",
  color: "var(--meetro-color-ink)",
  cursor: "pointer",
  textAlign: "left",
  WebkitTapHighlightColor: "transparent",
  transition: "background 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
};

const sidebarNavButtonActive = {
  background: "var(--meetro-surface-sage)",
  border: "1px solid rgba(31,77,52,0.18)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72), 0 10px 24px rgba(31,77,52,0.08)",
};

const sidebarIconWrap = {
  width: "38px",
  height: "38px",
  borderRadius: "15px",
  display: "grid",
  placeItems: "center",
  color: "var(--meetro-color-muted)",
  background: "var(--meetro-surface-paper)",
  border: "1px solid var(--meetro-color-line)",
};

const sidebarIconWrapActive = {
  color: "var(--meetro-color-forest)",
  background: "var(--meetro-surface-paper)",
  border: "1px solid rgba(31,77,52,0.20)",
};

const sidebarLabelStack = {
  display: "grid",
  gap: "3px",
  minWidth: 0,
};

const sidebarLabel = {
  color: "var(--meetro-color-ink)",
  fontSize: "14px",
  lineHeight: 1.1,
  fontWeight: "950",
  whiteSpace: "normal",
  overflow: "visible",
  textOverflow: "clip",
};

const sidebarLabelActive = {
  color: "var(--meetro-color-forest)",
};

const sidebarSubLabel = {
  color: "var(--meetro-color-muted)",
  fontSize: "11px",
  lineHeight: 1.15,
  fontWeight: "780",
  whiteSpace: "normal",
  overflow: "visible",
  textOverflow: "clip",
};

const sidebarSubLabelActive = {
  color: "var(--meetro-color-coffee)",
};

const sidebarBadge = {
  position: "absolute",
  top: "-5px",
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

const profileContextBackdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  width: "100%",
  maxWidth: "100vw",
  overflow: "hidden",
  border: "none",
  background: "rgba(15,23,42,0.01)",
  cursor: "default",
};

const profileContextCard = {
  ...glassActionMenu,
  position: "fixed",
  zIndex: 10001,
  width: "min(var(--meetro-layout-hosted-width, 414px), calc(100vw - 40px))",
  maxWidth: "calc(100vw - 40px)",
  maxHeight: "min(82dvh, var(--meetro-layout-hosted-max-height, 720px))",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  overflowY: "hidden",
  overflowX: "hidden",
  borderRadius: "28px",
  padding: "0",
  boxSizing: "border-box",
  overscrollBehavior: "contain",
};

const profileContextHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "14px 14px 10px 18px",
  borderBottom: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-paper)",
};

const profileContextEyebrow = {
  margin: "0 0 3px",
  color: "var(--meetro-color-wood)",
  fontSize: "11px",
  lineHeight: 1,
  fontWeight: "950",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const profileContextTitle = {
  margin: 0,
  color: "var(--meetro-color-ink)",
  fontSize: "18px",
  lineHeight: 1.05,
  fontWeight: "950",
};

const profileContextCloseButton = {
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  border: "1px solid var(--meetro-color-line)",
  background: "var(--meetro-surface-sage)",
  color: "var(--meetro-color-ink)",
  fontSize: "25px",
  lineHeight: 1,
  fontWeight: "800",
  cursor: "pointer",
};

const profileCardScroll = {
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
  background: "var(--meetro-gradient-community-page)",
  padding: "16px 16px 18px",
  boxSizing: "border-box",
};

const profileCardLoading = {
  minHeight: "240px",
  display: "grid",
  placeItems: "center",
  color: "var(--meetro-color-muted)",
  fontSize: "14px",
  fontWeight: "850",
};

const centerNavButton = {};

const centerNavButtonActive = {
  background: "var(--meetro-surface-sage)",
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
  color: "var(--meetro-color-forest, #1f4d34)",
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
  background: "rgba(31,77,52,0.12)",
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
  color: "var(--meetro-color-forest, #1f4d34)",
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
