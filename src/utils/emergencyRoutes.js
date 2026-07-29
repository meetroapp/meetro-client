import { normalizeEmergencyRequestId } from "./emergencyApi.js";
import { normalizeCanonicalEmergencySpecialty } from "./emergencySpecialties.js";

export const EMERGENCY_REQUEST_ROUTE_PAGE = "emergencyRequest";
export const EMERGENCY_REQUEST_ROUTE_PARAM = "requestId";
export const EMERGENCY_SPECIALTY_ROUTE_PARAM = "serviceSpecialty";

function cleanRouteValue(value) {
  return String(value ?? "").replace(/^#/, "").trim();
}

export function parseEmergencyRequestRoute(routeValue = "") {
  const route = cleanRouteValue(routeValue);
  const queryIndex = route.indexOf("?");
  const page = queryIndex >= 0 ? route.slice(0, queryIndex) : route;
  const query = queryIndex >= 0 ? route.slice(queryIndex + 1) : "";

  if (page !== EMERGENCY_REQUEST_ROUTE_PAGE) {
    return {
      page,
      hasRequestId: false,
      requestId: null,
      serviceSpecialty: "",
      valid: false,
    };
  }

  const params = new URLSearchParams(query);
  const hasRequestId = params.has(EMERGENCY_REQUEST_ROUTE_PARAM);
  const requestId = hasRequestId
    ? normalizeEmergencyRequestId(
        params.get(EMERGENCY_REQUEST_ROUTE_PARAM)
      )
    : null;
  const serviceSpecialty = normalizeCanonicalEmergencySpecialty(
    params.get(EMERGENCY_SPECIALTY_ROUTE_PARAM)
  );

  return {
    page,
    hasRequestId,
    requestId,
    serviceSpecialty,
    valid: !hasRequestId || Boolean(requestId),
  };
}

export function buildEmergencyDraftRoute(serviceSpecialty) {
  const canonicalSpecialty =
    normalizeCanonicalEmergencySpecialty(serviceSpecialty);

  if (!canonicalSpecialty) {
    return EMERGENCY_REQUEST_ROUTE_PAGE;
  }

  const params = new URLSearchParams({
    [EMERGENCY_SPECIALTY_ROUTE_PARAM]: canonicalSpecialty,
  });

  return `${EMERGENCY_REQUEST_ROUTE_PAGE}?${params.toString()}`;
}

export function buildEmergencyRequestRoute(emergencyRequestId) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return EMERGENCY_REQUEST_ROUTE_PAGE;
  }

  const params = new URLSearchParams({
    [EMERGENCY_REQUEST_ROUTE_PARAM]: String(normalizedId),
  });

  return `${EMERGENCY_REQUEST_ROUTE_PAGE}?${params.toString()}`;
}

export function replaceEmergencyRequestRoute(
  emergencyRequestId,
  {
    location = globalThis.location,
    history = globalThis.history,
  } = {}
) {
  const route = buildEmergencyRequestRoute(emergencyRequestId);

  if (
    !location ||
    !history ||
    typeof history.replaceState !== "function"
  ) {
    return route;
  }

  const pathname = String(location.pathname || "");
  const search = String(location.search || "");

  history.replaceState(
    history.state ?? null,
    "",
    `${pathname}${search}#${route}`
  );

  return route;
}
