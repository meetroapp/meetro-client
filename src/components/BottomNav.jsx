import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Keyboard } from "@capacitor/keyboard";
import { t } from "../utils/language";
import useLanguage from "../hooks/useLanguage";
import {
  getNotifications,
  saveNotifications,
} from "../utils/notifications";
import { openActiveEmergencyConversation } from "../utils/emergencyLifecycle";
import {
  getAccountModeForPage,
  getAuthenticatedIdentitySnapshot,
  subscribeAuthenticatedIdentity,
} from "../utils/session";
import {
  getConversationMetrics,
  getProfessionalWorkMetrics,
} from "../utils/dashboardMetrics";
import { glassActionMenu } from "../styles/liquidGlass";
import { canReadLegacyWorkflowStorage } from "../utils/clientWorkflowStoragePolicy";
import { getPrimaryNavigationOwner } from "../utils/primaryNavigationOwnership";
import {
  getAlertCountSnapshot,
  resetAlertCounts,
  setAlertCountIdentity,
  subscribeAlertCounts,
} from "../utils/alertCountCoordinator";
import MeetroIcon from "./MeetroIcon";
import { getCommunicationAttention } from "../utils/communicationAttention";
import {
  getWorkCenterTotalUnread,
} from "../utils/workCenterAlertAttention.js";

const EmbeddedProfile = lazy(() => import("../pages/Profile"));

function getAuthenticatedAlertCountIdentity(
  snapshot = getAuthenticatedIdentitySnapshot()
) {
  return snapshot?.status === "authenticated" &&
    typeof snapshot.userId === "string"
    ? snapshot.userId
    : "";
}

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
  const [authenticatedIdentitySnapshot, setAuthenticatedIdentitySnapshot] =
    useState(getAuthenticatedIdentitySnapshot);
  const alertCountIdentity = getAuthenticatedAlertCountIdentity(
    authenticatedIdentitySnapshot
  );
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
  const [alertCountSnapshot, setAlertCountSnapshot] = useState(
    getAlertCountSnapshot
  );
  const navTouchStartRef = useRef({ x: 0, y: 0, moved: false });

  useEffect(() => {
    return subscribeAuthenticatedIdentity(setAuthenticatedIdentitySnapshot);
  }, []);

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
    const handleAuthExpired = () => {
      resetAlertCounts();
      syncNav();
    };
    window.addEventListener("meetroAuthExpired", handleAuthExpired);

    return () => {
      window.removeEventListener("languageChanged", syncNav);
      window.removeEventListener("meetro-language-change", syncNav);
      window.removeEventListener("accountModeChanged", syncNav);
      window.removeEventListener("storage", syncNav);
      window.removeEventListener("meetroNotificationsUpdated", syncNav);
      window.removeEventListener("meetro-messages-updated", syncNav);
      window.removeEventListener("meetroAuthExpired", handleAuthExpired);
    };
  }, [currentPage]);

  useEffect(() => {
    setAlertCountIdentity(alertCountIdentity);
    const unsubscribe = subscribeAlertCounts(setAlertCountSnapshot);
    return unsubscribe;
  }, [alertCountIdentity]);

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
      setTimeout(() => {
        setKeyboardOpen(isEditableTarget(document.activeElement));
      }, 220);
    };

    const handleViewportResize = () => {
      if (!window.visualViewport) return;

      const heightDifference =
        window.innerHeight - window.visualViewport.height;
      const editableFocused = isEditableTarget(document.activeElement);

      if (editableFocused && heightDifference > 80) {
        setKeyboardOpen(true);
      } else if (!editableFocused) {
        setKeyboardOpen(false);
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
      } catch {
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

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;

    root.dataset.appKeyboard = keyboardOpen ? "open" : "closed";
    root.style.setProperty(
      "--meetro-bottom-nav-height",
      keyboardOpen
        ? "0px"
        : "calc(74px + env(safe-area-inset-bottom, 0px))"
    );

    return () => {
      delete root.dataset.appKeyboard;
      root.style.removeProperty("--meetro-bottom-nav-height");
    };
  }, [keyboardOpen]);

  const personalMobileNavItems = [
    {
      page: "home",
      aliases: ["home"],
      icon: "home",
      label: t("navigationHome", language),
      sub: t("dashboard"),
    },
    {
      page: "myRequests",
      aliases: ["myRequests", "projectDetails", "completedJobDetails"],
      icon: "workCenter",
      label: t("navigationWorkCenter", language),
      sub: t("navigationCurrentWork", language),
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
      label: t("navigationChat", language),
      sub: t("navigationCommunication", language),
    },
    {
      page: "meetroMoments",
      aliases: ["meetroMoments"],
      icon: "history",
      label: t("navigationMoments", language),
      sub: t("navigationHistory", language),
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "profile",
      label: t("navigationProfile", language),
      sub: t("account"),
    },
  ];

  const businessMobileNavItems = [
    {
      page: "businessDashboard",
      aliases: ["businessDashboard", "dashboard", "businessHome"],
      icon: "businessDashboard",
      label: t("navigationHome", language),
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
      label: t("navigationWorkCenter", language),
      sub: t("navigationOperations", language),
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
      label: t("navigationChat", language),
      sub: t("navigationCommunication", language),
    },
    {
      page: "meetroMoments",
      aliases: ["meetroMoments"],
      icon: "history",
      label: t("navigationMoments", language),
      sub: t("navigationHistory", language),
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "profile",
      label: t("navigationProfile", language),
      sub: t("account"),
    },
  ];

  const personalDesktopNavItems = [
    {
      page: "home",
      aliases: ["home"],
      icon: "home",
      label: t("navigationHome", language),
      sub: t("dashboard"),
    },
    {
      page: "myRequests",
      aliases: ["myRequests", "projectDetails", "completedJobDetails"],
      icon: "workCenter",
      label: t("navigationWorkCenter", language),
      sub: t("navigationCurrentWork", language),
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
      label: t("navigationCommunication", language),
      sub: t("navigationChat", language),
    },
    {
      page: "meetroMoments",
      aliases: ["meetroMoments"],
      icon: "history",
      label: "Meetro Moments",
      sub: t("navigationHomeStory", language),
    },
    {
      page: "discover",
      aliases: ["discover", "contractors", "contractorDetails"],
      icon: "discover",
      label: t("navigationCommunity", language),
      sub: t("navigationDiscover", language),
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "profile",
      label: t("navigationProfileAccount", language),
      sub: t("account"),
    },
  ];

  const businessDesktopNavItems = [
    {
      page: "businessDashboard",
      aliases: ["businessDashboard", "dashboard", "businessHome"],
      icon: "businessDashboard",
      label: t("navigationHome", language),
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
      label: t("navigationWorkCenter", language),
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
      label: t("navigationCommunication", language),
      sub: t("customers"),
    },
    {
      page: "meetroMoments",
      aliases: ["meetroMoments"],
      icon: "history",
      label: "Meetro Moments",
      sub: t("navigationBusinessHistory", language),
    },
    {
      page: "assetCenter",
      aliases: ["assetCenter"],
      icon: "assetHome",
      label: t("navigationProperties", language),
      sub: t("navigationRecords", language),
    },
    {
      page: "customerRelationshipsCenter",
      aliases: ["customerRelationshipsCenter"],
      icon: "people",
      label: t("navigationRelationships", language),
      sub: t("navigationCustomers", language),
    },
    {
      page: "discover",
      aliases: ["discover", "contractors", "contractorDetails"],
      icon: "discover",
      label: t("navigationCommunity", language),
      sub: t("navigationDiscover", language),
    },
    {
      page: "profile",
      aliases: ["profile", "businessProfile"],
      icon: "profile",
      label: t("navigationProfileAccount", language),
      sub: t("account"),
    },
  ];

  const businessDesktopShortcutItems = [
    {
      page: "quoteBuilder",
      shortcut: "quoteInvoice",
      icon: "quickQuote",
      label: t("desktopQuoteInvoice", language),
      sub: t("desktopQuoteInvoiceNote", language),
    },
    {
      page: "businessLeads",
      shortcut: "businessLeads",
      icon: "businessLeads",
      label: t("desktopBusinessLeads", language),
      sub: t("desktopBusinessLeadsNote", language),
    },
  ];

  useEffect(() => {
    let active = true;
    const run = () => {
      if (!active) return;
      setKeyboardOpen(false);
      setActiveMode(
        getAccountModeForPage(
          currentPage,
          localStorage.getItem("activeAccountMode") || "personal"
        )
      );
      setProfileContextCardOpen(false);
    };

    if (typeof queueMicrotask === "function") queueMicrotask(run);
    else Promise.resolve().then(run);

    return () => {
      active = false;
    };
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
  const primaryNavigationOwner = getPrimaryNavigationOwner(
    normalizedPage,
    activeMode
  );

  const canonicalCategoryUnreadCount = (category) => {
    if (alertCountSnapshot.identity !== alertCountIdentity) return 0;
    const count = alertCountSnapshot.response?.counts?.byCategory?.[category]?.unread;
    return Number.isSafeInteger(count) && count >= 0 ? count : 0;
  };

  const communicationAttention = getCommunicationAttention(
    alertCountSnapshot,
    alertCountIdentity
  );
  const communicationAlertCount = Math.max(
    canonicalCategoryUnreadCount("communication") + communicationAttention.teamUnread,
    canonicalCategoryUnreadCount("emergency"),
    getUnreadMessageCount()
  );
  const legacyWorkCenterAlertCount = Math.max(
    canonicalCategoryUnreadCount("evaluation"),
    canonicalCategoryUnreadCount("proposal"),
    canonicalCategoryUnreadCount("invoice"),
    canonicalCategoryUnreadCount("payment"),
    canonicalCategoryUnreadCount("schedule"),
    Math.max(
      0,
      canonicalCategoryUnreadCount("work") -
        communicationAttention.teamUnread
    ),
    canonicalCategoryUnreadCount("completion"),
    canonicalCategoryUnreadCount("review"),
    getAcceptedQuoteReadyCount(),
    getActiveEmergencyAlertCount()
  );

  const canonicalWorkCenterAlertCount =
    getWorkCenterTotalUnread(
      alertCountSnapshot,
      alertCountIdentity
    );

  const workCenterAlertCount =
    canonicalWorkCenterAlertCount === null
      ? legacyWorkCenterAlertCount
      : canonicalWorkCenterAlertCount;
  const leadsAlertCount =
    activeMode === "business" ? canonicalCategoryUnreadCount("request") : 0;
  const profileAlertCount =
    activeMode === "business"
      ? canonicalCategoryUnreadCount("business_verification")
      : 0;

  void notificationTick;
  const isLandscapeCompact =
    typeof window !== "undefined" &&
    window.matchMedia?.("(orientation: landscape) and (max-height: 500px)")?.matches;

  const isNavItemActive = (item) =>
    item.page === primaryNavigationOwner ||
    item.page === normalizedPage ||
    item.aliases?.includes(normalizedPage) ||
    (item.page === "businessLeads" && normalizedPage === "businessLeads");

  const getItemUnreadCount = (item) =>
    item.shortcut === "businessLeads"
      ? leadsAlertCount
      : item.page === "contractorDashboard"
      ? workCenterAlertCount
      : item.page === "myRequests"
      ? Math.max(workCenterAlertCount, canonicalCategoryUnreadCount("request"))
      : item.aliases?.some((alias) =>
          ["chat", "messages", "messagesInbox", "conversationThread"].includes(alias)
        )
      ? communicationAlertCount
      : item.page === "profile"
      ? profileAlertCount
      : 0;

  const getItemAccessibleLabel = (item) => `${item.label}. ${item.sub}`;

  const getItemBadgeText = (_item, unread) =>
    unread > 99 ? "99+" : String(unread);

  const shortcutReturnPage = [
    "contractorDashboard",
    "workCenter",
    "workDashboard",
    "schedule",
    "activeJobs",
  ].includes(normalizedPage)
    ? "workCenter"
    : normalizedPage || "businessDashboard";

  const prepareBusinessShortcut = (item) => {
    if (item.shortcut === "quoteInvoice") {
      localStorage.removeItem("selectedQuoteRequest");
      localStorage.removeItem("selectedQuoteForEdit");
      localStorage.removeItem("selectedWorkCenterRequest");
      localStorage.removeItem("selectedHomeownerRequest");
      localStorage.setItem("quoteBuilderSource", "desktop_sidebar_quote_invoice");
      localStorage.setItem("quoteBuilderReturnPage", shortcutReturnPage);
      localStorage.removeItem("invoiceBuilderSource");
      localStorage.removeItem("invoiceBuilderReturnPage");
    }
  };

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

    if (variant === "sidebar" && item.shortcut) {
      prepareBusinessShortcut(item);
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
    const badgeText = getItemBadgeText(item, unread);
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
          aria-label={getItemAccessibleLabel(item)}
          title={`${item.label} — ${item.sub}`}
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
            {unread > 0 && <span style={sidebarBadge}>{badgeText}</span>}
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
        aria-label={getItemAccessibleLabel(item)}
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

          {unread > 0 && <div style={badge}>{badgeText}</div>}
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
        aria-label={t("navigationPrimaryDesktop", language)}
      >
        <div style={sidebarBrand}>
          <div style={sidebarBrandMark} aria-hidden="true">M</div>
          <div style={sidebarBrandCopy}>
            <strong style={sidebarBrandTitle}>Meetro</strong>
            <span style={sidebarBrandSubtitle}>
              {activeMode === "business"
                ? t("business", language)
                : t("navigationCommunity", language)}
            </span>
          </div>
        </div>

        <div style={sidebarScrollArea}>
          <div style={sidebarNavList}>
            {desktopNavItems
              .filter((item) => item.page !== "profile")
              .map((item) => renderNavItem(item, "sidebar"))}
          </div>

          {activeMode === "business" && (
            <section
              style={sidebarShortcutGroup}
              aria-label={t("desktopBusinessShortcuts", language)}
            >
              <div style={sidebarShortcutHeading}>
                {t("desktopBusinessShortcuts", language)}
              </div>
              <div style={sidebarShortcutList}>
                {businessDesktopShortcutItems.map((item) =>
                  renderNavItem(item, "sidebar")
                )}
              </div>
            </section>
          )}

          {desktopNavItems
            .filter((item) => item.page === "profile")
            .map((item) => (
              <div key={`${item.page}-profile`} style={sidebarProfileGroup}>
                {renderNavItem(item, "sidebar")}
              </div>
            ))}
        </div>
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
        <>
          <div className="bottom-nav-content-spacer" aria-hidden="true" />
          <div
            className="bottom-nav-dock"
            data-language={language}
            style={navDock}
            role="navigation"
            aria-label={t("navigationPrimaryMobile", language)}
          >
            <div className="bottom-nav" style={isLandscapeCompact ? navWrapperLandscape : navWrapper}>
              <div className="bottom-nav-container" style={isLandscapeCompact ? navContainerLandscape : navContainer}>
                {mobileNavItems.map((item) => renderNavItem(item, "bottom"))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function DesktopProfileCard({ currentPage, onClose, position, setPage }) {
  const language = useLanguage();
  const openFromProfileCard = (pageName) => {
    onClose();
    setPage(pageName);
  };

  return (
    <>
      <button
        type="button"
        aria-label={t("navigationCloseProfileMenu", language)}
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

  #root[data-app-layout="tablet"] .desktop-sidebar,
  #root[data-app-layout="desktop"] .desktop-sidebar {
      display: flex;
  }

  #root[data-app-layout="tablet"] .desktop-profile-context-backdrop,
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

  #root[data-app-layout="tablet"] .desktop-profile-context-card,
  #root[data-app-layout="desktop"] .desktop-profile-context-card {
      display: block;
  }

  #root[data-app-layout="tablet"] .bottom-nav-content-spacer,
  #root[data-app-layout="desktop"] .bottom-nav-content-spacer,
  #root[data-app-layout="tablet"] .bottom-nav-dock,
  #root[data-app-layout="desktop"] .bottom-nav-dock {
      display: none !important;
  }

  #root[data-app-layout="tablet"] .app-page,
  #root[data-app-layout="tablet"] .page-shell,
  #root[data-app-layout="tablet"] .business-dashboard,
  #root[data-app-layout="tablet"] .contractor-dashboard,
  #root[data-app-layout="desktop"] .app-page,
  #root[data-app-layout="desktop"] .page-shell,
  #root[data-app-layout="desktop"] .business-dashboard,
  #root[data-app-layout="desktop"] .contractor-dashboard {
      --meetro-page-max-width: var(--meetro-workspace-max-width);
      --meetro-page-available-width: calc(100vw - var(--meetro-sidebar-width));
      --meetro-page-resolved-max-width: min(var(--meetro-page-max-width), var(--meetro-workspace-max-width));
      --meetro-page-inline-extra: max(0px, calc((var(--meetro-page-available-width) - var(--meetro-page-resolved-max-width)) / 2));
      width: min(var(--meetro-page-available-width), var(--meetro-page-resolved-max-width)) !important;
      max-width: var(--meetro-page-resolved-max-width) !important;
      margin-left: calc(var(--meetro-sidebar-width) + var(--meetro-page-inline-extra)) !important;
      margin-right: var(--meetro-page-inline-extra) !important;
      padding-bottom: max(32px, env(safe-area-inset-bottom, 0px)) !important;
  }

  #root[data-app-layout="tablet"] .meetro-responsive-page,
  #root[data-app-layout="desktop"] .meetro-responsive-page {
      --meetro-page-max-width: var(--meetro-layout-content-max);
  }

  #root[data-app-layout="tablet"] .meetro-readable-page,
  #root[data-app-layout="desktop"] .meetro-readable-page {
      --meetro-page-max-width: var(--meetro-layout-readable-max);
  }

  #root[data-app-layout="tablet"] .meetro-form-page,
  #root[data-app-layout="desktop"] .meetro-form-page {
      --meetro-page-max-width: var(--meetro-layout-form-max);
  }

  #root[data-app-layout="tablet"] .meetro-wide-page,
  #root[data-app-layout="desktop"] .meetro-wide-page {
      --meetro-page-max-width: var(--meetro-layout-wide-max);
  }

  #root[data-app-layout="tablet"] .messages-inbox-page,
  #root[data-app-layout="tablet"] .messages-relationship-identity-page,
  #root[data-app-layout="desktop"] .messages-inbox-page,
  #root[data-app-layout="desktop"] .messages-relationship-identity-page {
      --meetro-page-resolved-max-width: var(--meetro-page-available-width);
      --meetro-page-inline-extra: 0px;
  }

  #root[data-app-layout="tablet"] .desktop-sidebar-item:focus-visible,
  #root[data-app-layout="desktop"] .desktop-sidebar-item:focus-visible {
      outline: 3px solid rgba(31, 77, 52, 0.34);
      outline-offset: 3px;
    }

  #root[data-app-layout="tablet"] .desktop-profile-context-card button:focus-visible,
  #root[data-app-layout="desktop"] .desktop-profile-context-card button:focus-visible {
      outline: 3px solid rgba(31, 77, 52, 0.34);
      outline-offset: 3px;
    }

  #root[data-app-layout="tablet"] .desktop-profile-card-scroll .profile-embedded-content,
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

const sidebarScrollArea = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: "2px",
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

const sidebarShortcutGroup = {
  display: "grid",
  gap: "8px",
  marginTop: "14px",
  paddingTop: "14px",
  borderTop: "1px solid var(--meetro-color-line)",
};

const sidebarShortcutHeading = {
  color: "var(--meetro-color-forest)",
  fontSize: "11px",
  lineHeight: 1.2,
  fontWeight: "950",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "0 10px",
};

const sidebarShortcutList = {
  display: "grid",
  gap: "6px",
  minWidth: 0,
};

const sidebarProfileGroup = {
  marginTop: "14px",
  paddingTop: "14px",
  borderTop: "1px solid var(--meetro-color-line)",
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
  width: "auto",
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
