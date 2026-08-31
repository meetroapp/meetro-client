import MeetroIcon from "./MeetroIcon";
import "../styles/employeeShell.css";

const EMPLOYEE_NAV_ITEMS = Object.freeze([
  { route: "employeeHome", label: "Home", icon: "home" },
  { route: "employeeJobs", label: "My Jobs", icon: "businessTools" },
  { route: "employeeSchedule", label: "Schedule", icon: "schedule" },
  { route: "employeeTime", label: "Time", icon: "jobHistory" },
  { route: "employeeMessages", label: "Messages", icon: "messages" },
  { route: "employeeAlerts", label: "Alerts", icon: "notifications" },
  { route: "employeeProfile", label: "Profile", icon: "profile" },
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
  roleLabel = "Field Employee",
  brandLabel = "Field",
  accessLabel = "Team access",
}) {
  return (
    <div
      className="employee-shell"
      data-team-role={membership?.role || "FIELD_EMPLOYEE"}
    >
      <aside
        className="employee-shell__rail"
        aria-label="Employee navigation"
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
            <small>{brandLabel}</small>
          </div>
        </div>

        <p className="employee-shell__business">
          {membership?.businessName || "Your business"}
        </p>

        <EmployeeNav
          navigation={navigation}
          membership={membership}
          currentPage={currentPage}
          setPage={setPage}
        />
      </aside>

      <div className="employee-shell__main">
        <header className="employee-shell__header">
          <div className="employee-shell__header-copy">
            <p>{roleLabel}</p>
            <h1>{title}</h1>
            {description && <span>{description}</span>}
          </div>

          <span className="employee-shell__access">
            <MeetroIcon
              name="customerRelationships"
              size={17}
              decorative
            />
            {accessLabel}
          </span>
        </header>

        <main className="employee-shell__content">
          {children}
        </main>
      </div>

      <nav
        className="employee-shell__mobile-nav"
        aria-label="Employee navigation"
      >
        <EmployeeNav
          navigation={navigation}
          membership={membership}
          currentPage={currentPage}
          setPage={setPage}
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
            <strong>{item.label}</strong>
          </button>
        );
      })}
    </div>
  );
}
