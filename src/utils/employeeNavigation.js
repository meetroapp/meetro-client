export function shouldShowEmployeeMobileNavigation(view = "home") {
  return String(view || "home").trim().toLowerCase() !== "messages";
}

export function getEmployeeShellHeaderMode(view = "home") {
  return String(view || "home").trim().toLowerCase() === "messages"
    ? "suppressed"
    : "standard";
}

export function getEmployeeMessagesBackRoute(businessId) {
  return `employeeHome?businessId=${encodeURIComponent(String(businessId || ""))}`;
}
