import MeetroIcon from "./MeetroIcon";
import useLanguage from "../hooks/useLanguage";
import { t } from "../utils/language";
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
}) {
  const language = useLanguage();
  const employeeNavigationLabel = t("fieldEmployeeNavigation", language);

  return (
    <div
      className="employee-shell"
      data-team-role={membership?.role || "FIELD_EMPLOYEE"}
    >
      <aside
        className="employee-shell__rail"
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
        />
      </aside>

      <div className="employee-shell__main">
        <header className="employee-shell__header">
          <div className="employee-shell__header-copy">
            <p>{roleLabel || t("fieldEmployeeRole", language)}</p>
            <h1>{title}</h1>
            {description && <span>{description}</span>}
          </div>

          <span className="employee-shell__access">
            <MeetroIcon
              name="customerRelationships"
              size={17}
              decorative
            />
            {accessLabel || t("fieldTeamAccess", language)}
          </span>
        </header>

        <main className="employee-shell__content">
          {children}
        </main>
      </div>

      <nav
        className="employee-shell__mobile-nav"
        aria-label={employeeNavigationLabel}
      >
        <EmployeeNav
          navigation={navigation}
          membership={membership}
          currentPage={currentPage}
          setPage={setPage}
          language={language}
          mobile
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
    >
      {navigation.map((item) => {
        const active = currentPage === item.route;

        return (
          <button
            type="button"
            key={item.route}
            className={active ? "is-active" : ""}
            aria-current={active ? "page" : undefined}
            onClick={() =>
              setPage(routeFor(item, membership))
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
          </button>
        );
      })}
    </div>
  );
}
