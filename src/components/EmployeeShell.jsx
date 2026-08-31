import { useEffect, useState } from "react";
import MeetroIcon from "./MeetroIcon";
import useLanguage from "../hooks/useLanguage";
import { t } from "../utils/language";
import {
  getAlertCountSnapshot,
  setAlertCountIdentity,
  subscribeAlertCounts,
} from "../utils/alertCountCoordinator";
import {
  getAuthenticatedIdentitySnapshot,
  subscribeAuthenticatedIdentity,
} from "../utils/session";
import { formatAttentionCount, getCommunicationAttention } from "../utils/communicationAttention";
import "../styles/employeeShell.css";

const EMPLOYEE_NAV_ITEMS = Object.freeze([
  { route: "employeeHome", labelKey: "fieldNavHome", icon: "home" },
  { route: "employeeJobs", labelKey: "fieldNavMyJobs", icon: "businessTools" },
  { route: "employeeSchedule", labelKey: "fieldNavSchedule", icon: "schedule" },
  { route: "employeeTime", labelKey: "fieldNavTime", icon: "jobHistory" },
  { route: "employeeMessages", labelKey: "fieldNavMessages", icon: "messages" },
  { route: "employeeAlerts", labelKey: "fieldNavAlerts", icon: "notifications" },
  { route: "employeeProfile", labelKey: "fieldNavProfile", icon: "profile" },
]);

function routeFor(item, membership) {
  const query = new URLSearchParams({
    businessId: String(membership?.businessId || ""),
    ...(item.query || {}),
  });

  return `${item.route}?${query.toString()}`;
}

export default function EmployeeShell({
  membership,
  currentPage,
  setPage,
  title,
  description,
  children,
  navigation = EMPLOYEE_NAV_ITEMS,
  roleLabel,
  brandLabel,
  accessLabel,
  navigationLocked = false,
  navigationLockReason = "",
}) {
  const language = useLanguage();
  const employeeNavigationLabel = t("fieldEmployeeNavigation", language);
  const [identitySnapshot, setIdentitySnapshot] = useState(getAuthenticatedIdentitySnapshot);
  const [alertSnapshot, setAlertSnapshot] = useState(getAlertCountSnapshot);
  const alertIdentity = identitySnapshot?.status === "authenticated"
    ? String(identitySnapshot.userId || "")
    : "";
  const attention = getCommunicationAttention(alertSnapshot, alertIdentity);
  const alertUnread = alertSnapshot.identity === alertIdentity
    ? alertSnapshot.response?.counts?.unread || 0
    : 0;

  useEffect(() => subscribeAuthenticatedIdentity(setIdentitySnapshot), []);
  useEffect(() => {
    setAlertCountIdentity(alertIdentity);
    return subscribeAlertCounts(setAlertSnapshot);
  }, [alertIdentity]);

  const unreadByRoute = {
    employeeMessages: attention.unread,
    employeeAlerts: alertUnread,
  };

  return (
    <div
      className="employee-shell"
      data-team-role={membership?.role || "FIELD_EMPLOYEE"}
    >
      <aside
        className="employee-shell__rail"
        data-scroll-region="employee-navigation"
        aria-label={employeeNavigationLabel}
      >
        <div className="employee-shell__brand">
          <span
            className="employee-shell__brand-mark"
            aria-hidden="true"
          >
            M
          </span>

          <div className="employee-shell__brand-copy">
            <strong>Meetro</strong>
            <small>{brandLabel || t("fieldBrand", language)}</small>
          </div>
        </div>

        <p className="employee-shell__business">
          {membership?.businessName || t("fieldYourBusiness", language)}
        </p>

        <EmployeeNav
          navigation={navigation}
          membership={membership}
          currentPage={currentPage}
          setPage={setPage}
          language={language}
          navigationLocked={navigationLocked}
          navigationLockReason={navigationLockReason}
          unreadByRoute={unreadByRoute}
        />
      </aside>

      <div
        className="employee-shell__main"
        data-scroll-region="employee-workspace"
      >
        <header className="employee-shell__header">
          <div className="employee-shell__header-copy">
            <p>{roleLabel || t("fieldEmployeeRole", language)}</p>
            <h1>{title}</h1>
            {description && <span>{description}</span>}
          </div>

          <div className="employee-shell__header-actions">
            <span className="employee-shell__access">
              <MeetroIcon
                name="customerRelationships"
                size={17}
                decorative
              />
              {accessLabel || t("fieldTeamAccess", language)}
            </span>
            {navigationLocked ? (
              <span
                id="employee-navigation-lock-reason"
                className="employee-shell__navigation-lock"
                role="status"
              >
                {navigationLockReason}
              </span>
            ) : null}
          </div>
        </header>

        <main className="employee-shell__content">
          {children}
        </main>
      </div>

      <nav
        className="employee-shell__mobile-nav"
        aria-label={employeeNavigationLabel}
        aria-describedby={navigationLocked ? "employee-navigation-lock-reason" : undefined}
      >
        <EmployeeNav
          navigation={navigation}
          membership={membership}
          currentPage={currentPage}
          setPage={setPage}
          language={language}
          mobile
          navigationLocked={navigationLocked}
          navigationLockReason={navigationLockReason}
          unreadByRoute={unreadByRoute}
        />
      </nav>
    </div>
  );
}

function EmployeeNav({
  navigation,
  membership,
  currentPage,
  setPage,
  language,
  mobile = false,
  navigationLocked = false,
  navigationLockReason = "",
  unreadByRoute = {},
}) {
  return (
    <div
      className={
        mobile
          ? "employee-shell__nav employee-shell__nav--mobile"
          : "employee-shell__nav"
      }
      style={
        mobile
          ? { "--employee-nav-count": navigation.length }
          : undefined
      }
      aria-disabled={navigationLocked}
      aria-describedby={navigationLocked ? "employee-navigation-lock-reason" : undefined}
    >
      {navigation.map((item) => {
        const active = currentPage === item.route;
        const unread = Number(unreadByRoute[item.route]) || 0;

        return (
          <button
            type="button"
            key={item.route}
            className={active ? "is-active" : ""}
            aria-current={active ? "page" : undefined}
            aria-disabled={navigationLocked}
            disabled={navigationLocked}
            title={navigationLocked ? navigationLockReason : undefined}
            onClick={() =>
              !navigationLocked && setPage(routeFor(item, membership))
            }
          >
            <MeetroIcon
              name={item.icon}
              size={mobile ? 18 : 20}
              decorative
            />
            <strong>
              {item.labelKey
                ? t(item.labelKey, language)
                : item.label}
            </strong>
            {unread > 0 ? (
              <span
                className="employee-shell__nav-badge"
                aria-label={`${formatAttentionCount(unread)} unread`}
              >
                {formatAttentionCount(unread)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
