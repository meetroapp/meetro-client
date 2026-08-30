const ROLE_PRIORITY = Object.freeze([
  "OWNER",
  "MANAGER",
  "BOOKKEEPER_FINANCE",
  "FIELD_EMPLOYEE",
]);

export const EMPLOYEE_APP_ROUTES = Object.freeze([
  "employeeHome",
  "employeeJobs",
  "employeeSchedule",
  "employeeTime",
  "employeeMessages",
  "employeeAlerts",
  "employeeProfile",
]);

const employeeRouteSet = new Set(EMPLOYEE_APP_ROUTES);
const bookkeeperRouteSet = new Set(["teamOperations", "bookkeeperProfile"]);

function pageName(route = "") {
  return String(route || "").split("?", 1)[0];
}

export function resolvePrimaryTeamExperience(authority = {}) {
  const active = (authority?.memberships || []).filter(
    (membership) => membership?.status === "ACTIVE"
  );
  const membership = ROLE_PRIORITY
    .map((role) => active.find((candidate) => candidate.role === role))
    .find(Boolean) || null;

  if (!membership) return { kind: "NONE", membership: null, landingRoute: "" };
  if (membership.role === "FIELD_EMPLOYEE") {
    return {
      kind: "FIELD_EMPLOYEE",
      membership,
      landingRoute: `employeeHome?businessId=${encodeURIComponent(membership.businessId)}`,
    };
  }
  if (membership.role === "BOOKKEEPER_FINANCE") {
    return {
      kind: "BOOKKEEPER_FINANCE",
      membership,
      landingRoute: `teamOperations?businessId=${encodeURIComponent(membership.businessId)}&view=timesheets`,
    };
  }
  return {
    kind: membership.role,
    membership,
    landingRoute: "businessDashboard",
  };
}

export function isEmployeeAppRoute(route = "") {
  return employeeRouteSet.has(pageName(route));
}

export function getRoleAwareRoute(route = "", experience = {}) {
  if (experience?.kind === "FIELD_EMPLOYEE") {
    return isEmployeeAppRoute(route) ? route : experience.landingRoute;
  }
  if (experience?.kind === "BOOKKEEPER_FINANCE") {
    return bookkeeperRouteSet.has(pageName(route)) ? route : experience.landingRoute;
  }
  return route;
}
