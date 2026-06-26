import { useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import MeetroIcon from "../components/MeetroIcon";
import { getLanguage, t } from "../utils/language";
import {
  getNotifications as getMeetroNotifications,
  markAllNotificationsRead as markAllMeetroNotificationsRead,
  markNotificationRead as markMeetroNotificationRead,
} from "../utils/meetroNotifications";
import {
  getNotifications as getLegacyNotifications,
  markNotificationRead as markLegacyNotificationRead,
  saveNotifications as saveLegacyNotifications,
} from "../utils/notifications";
import {
  getNotificationCategory,
  getNotificationRoute,
  getRelativeNotificationTime,
  groupNotificationsByAge,
  sortNotificationsByAttention,
} from "../utils/notificationCenter";

function normalizeNotification(item = {}, source = "meetro") {
  const timestamp = item.timestamp || item.createdAt || new Date().toISOString();

  return {
    ...item,
    id: item.id || `${source}-${timestamp}`,
    source,
    timestamp,
    title: item.title || "Meetro notification",
    message: item.message || item.description || "",
    read: Boolean(item.read),
    unread: item.unread ?? !item.read,
  };
}

function getActiveRole() {
  return (localStorage.getItem("activeAccountMode") || "personal") === "business"
    ? "professional"
    : "homeowner";
}

function Notifications({ setPage }) {
  const [language, setLanguage] = useState(getLanguage());
  const [tick, setTick] = useState(0);
  const activeAccountMode = localStorage.getItem("activeAccountMode") || "personal";
  const activeRole = getActiveRole();

  useEffect(() => {
    const sync = () => {
      setLanguage(getLanguage());
      setTick((value) => value + 1);
    };

    window.addEventListener("languageChanged", sync);
    window.addEventListener("meetro-language-change", sync);
    window.addEventListener("meetro-notifications-updated", sync);
    window.addEventListener("meetroNotificationsUpdated", sync);

    return () => {
      window.removeEventListener("languageChanged", sync);
      window.removeEventListener("meetro-language-change", sync);
      window.removeEventListener("meetro-notifications-updated", sync);
      window.removeEventListener("meetroNotificationsUpdated", sync);
    };
  }, []);

  const notifications = useMemo(() => {
    void tick;

    const meetroItems = getMeetroNotifications(activeRole).map((item) =>
      normalizeNotification(item, "meetro")
    );
    const legacyItems = getLegacyNotifications()
      .filter((item) => {
        const targetRole = item.targetRole || item.role || "all";
        return targetRole === "all" || targetRole === activeRole;
      })
      .map((item) => normalizeNotification(item, "legacy"));

    const seen = new Set();
    return sortNotificationsByAttention([...meetroItems, ...legacyItems]).filter(
      (item) => {
        const key = `${item.source}:${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }
    );
  }, [activeRole, tick]);

  const groupedNotifications = groupNotificationsByAge(notifications);
  const unreadCount = notifications.filter((item) => item.unread || !item.read).length;

  function markRead(notification) {
    if (notification.source === "legacy") {
      markLegacyNotificationRead(notification.id);
    } else {
      markMeetroNotificationRead(notification.id);
    }
    setTick((value) => value + 1);
  }

  function markAllRead() {
    markAllMeetroNotificationsRead(activeRole);
    saveLegacyNotifications(
      getLegacyNotifications().map((item) => {
        const targetRole = item.targetRole || item.role || "all";
        if (targetRole !== "all" && targetRole !== activeRole) return item;
        return { ...item, read: true, unread: false, readAt: new Date().toISOString() };
      })
    );
    setTick((value) => value + 1);
  }

  function openNotification(notification) {
    markRead(notification);

    const route = getNotificationRoute(notification, activeAccountMode);
    Object.entries(route.context || {}).forEach(([key, value]) => {
      if (value) localStorage.setItem(key, String(value));
    });

    setPage(route.page);
  }

  const sections = [
    { key: "today", title: t("notificationsToday", language) },
    { key: "earlier", title: t("notificationsEarlier", language) },
    { key: "older", title: t("notificationsOlder", language) },
  ];

  return (
    <div className="app-page meetro-wide-page" style={pageWrapper}>
      <header style={header}>
        <p style={eyebrow}>{t("notificationsActivityCenter", language)}</p>
        <h1 style={title}>{t("notifications", language)}</h1>
        <p style={subtitle}>{t("notificationsSubtitle", language)}</p>
        {unreadCount > 0 && (
          <button type="button" style={markAllButton} onClick={markAllRead}>
            {t("notificationsMarkAllRead", language)}
          </button>
        )}
      </header>

      <div style={categoryRow} aria-label={t("notificationsCategories", language)}>
        {[
          ["projectUpdates", "workCenter"],
          ["messages", "messages"],
          ["quotes", "quote"],
          ["schedule", "schedule"],
          ["emergency", "emergency"],
          ["hiring", "businessLeads"],
          ["reviews", "reviews"],
          ["system", "settings"],
        ].map(([category, icon]) => (
          <span key={category} style={categoryChip}>
            <MeetroIcon name={icon} size={15} decorative />
            {t(`notificationCategory_${category}`, language)}
          </span>
        ))}
      </div>

      {notifications.length === 0 ? (
        <div style={emptyCard}>
          <MeetroIcon name="notifications" size={30} decorative />
          <h2 style={emptyTitle}>{t("notificationsEmptyTitle", language)}</h2>
          <p style={emptyText}>{t("notificationsEmptyText", language)}</p>
        </div>
      ) : (
        sections.map((section) => {
          const items = groupedNotifications[section.key] || [];
          if (items.length === 0) return null;

          return (
            <section key={section.key} style={groupSection}>
              <h2 style={groupTitle}>{section.title}</h2>
              <div style={list}>
                {items.map((notification) => (
                  <NotificationCard
                    key={`${notification.source}-${notification.id}`}
                    notification={notification}
                    language={language}
                    onOpen={() => openNotification(notification)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      <BottomNav setPage={setPage} currentPage="notifications" />
    </div>
  );
}

function NotificationCard({ notification, language, onOpen }) {
  const category = getNotificationCategory(notification);
  const unread = notification.unread || !notification.read;

  return (
    <button
      type="button"
      style={{
        ...card,
        ...(unread ? unreadCard : {}),
      }}
      onClick={onOpen}
    >
      <div style={iconWrap}>
        <MeetroIcon name={getCategoryIcon(category)} size={22} decorative />
      </div>
      <div style={cardBody}>
        <div style={cardTop}>
          <span style={categoryBadge}>
            {t(`notificationCategory_${category}`, language)}
          </span>
          <span style={timeText}>
            {getRelativeNotificationTime(notification.timestamp || notification.createdAt)}
          </span>
        </div>
        <strong style={cardTitle}>{notification.title}</strong>
        <span style={cardText}>{notification.message}</span>
      </div>
      {unread && <span style={unreadDot} aria-label={t("unread", language)} />}
    </button>
  );
}

function getCategoryIcon(category) {
  const icons = {
    projectUpdates: "workCenter",
    messages: "messages",
    quotes: "quote",
    schedule: "schedule",
    emergency: "emergency",
    hiring: "businessLeads",
    reviews: "reviews",
    system: "settings",
  };

  return icons[category] || "notifications";
}

const pageWrapper = {
  minHeight: "100vh",
  background: "#f4f3f8",
  padding: "calc(env(safe-area-inset-top) + 64px) 18px 120px",
  maxWidth: "840px",
  margin: "0 auto",
  boxSizing: "border-box",
};

const header = {
  marginBottom: "14px",
};

const eyebrow = {
  margin: "0 0 6px",
  color: "#5b35f5",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const title = {
  margin: "0 0 6px",
  color: "#111827",
  fontSize: "34px",
  lineHeight: 1,
  fontWeight: "950",
};

const subtitle = {
  margin: "0 0 12px",
  color: "#64748b",
  fontSize: "16px",
  lineHeight: 1.35,
  fontWeight: "750",
};

const markAllButton = {
  border: "1px solid #ddd6fe",
  borderRadius: "999px",
  background: "#ffffff",
  color: "#5b35f5",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
};

const categoryRow = {
  display: "flex",
  gap: "8px",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  padding: "2px 0 12px",
  marginBottom: "8px",
};

const categoryChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  flex: "0 0 auto",
  borderRadius: "999px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  color: "#334155",
  padding: "8px 10px",
  fontSize: "12px",
  fontWeight: "850",
};

const groupSection = {
  marginTop: "18px",
};

const groupTitle = {
  margin: "0 0 10px",
  color: "#111827",
  fontSize: "18px",
  fontWeight: "950",
};

const list = {
  display: "grid",
  gap: "10px",
};

const card = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "46px 1fr auto",
  gap: "12px",
  alignItems: "center",
  textAlign: "left",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  background: "#ffffff",
  padding: "13px",
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
  cursor: "pointer",
};

const unreadCard = {
  borderColor: "#c4b5fd",
  boxShadow: "0 12px 26px rgba(91,53,245,0.12)",
};

const iconWrap = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f5f3ff",
  color: "#5b35f5",
};

const cardBody = {
  display: "grid",
  gap: "4px",
  minWidth: 0,
};

const cardTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
};

const categoryBadge = {
  color: "#5b35f5",
  fontSize: "11px",
  fontWeight: "950",
  textTransform: "uppercase",
};

const timeText = {
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: "800",
  whiteSpace: "nowrap",
};

const cardTitle = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: "950",
  lineHeight: 1.2,
};

const cardText = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: 1.35,
};

const unreadDot = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  background: "#5b35f5",
};

const emptyCard = {
  display: "grid",
  justifyItems: "center",
  gap: "8px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "22px",
  padding: "28px 18px",
  textAlign: "center",
  color: "#5b35f5",
  boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
};

const emptyTitle = {
  margin: 0,
  color: "#111827",
  fontSize: "20px",
  fontWeight: "950",
};

const emptyText = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
  fontWeight: "750",
  lineHeight: 1.4,
};

export default Notifications;
