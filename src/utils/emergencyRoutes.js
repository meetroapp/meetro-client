import { normalizeEmergencyRequestId } from "./emergencyApi.js";
import { normalizeCanonicalEmergencySpecialty } from "./emergencySpecialties.js";

export const EMERGENCY_REQUEST_ROUTE_PAGE = "emergencyRequest";
export const EMERGENCY_REQUEST_ROUTE_PARAM = "requestId";
export const EMERGENCY_SPECIALTY_ROUTE_PARAM = "serviceSpecialty";
export const EMERGENCY_ROUTE_MODE = Object.freeze({
  NEW: "new",
  DETAIL: "detail",
  INVALID: "invalid",
});

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

function getEmergencyRouteMode(route) {
  if (
    !route ||
    route.page !== EMERGENCY_REQUEST_ROUTE_PAGE ||
    route.valid !== true
  ) {
    return EMERGENCY_ROUTE_MODE.INVALID;
  }

  const normalizedRequestId =
    normalizeEmergencyRequestId(route.requestId);

  if (route.hasRequestId === true) {
    return normalizedRequestId
      ? EMERGENCY_ROUTE_MODE.DETAIL
      : EMERGENCY_ROUTE_MODE.INVALID;
  }

  const explicitlyHasNoRequestId =
    route.hasRequestId === false &&
    cleanRouteValue(route.requestId) === "";

  return explicitlyHasNoRequestId
    ? EMERGENCY_ROUTE_MODE.NEW
    : EMERGENCY_ROUTE_MODE.INVALID;
}

export function createEmergencyRouteSession(route, epoch = 0) {
  const normalizedEpoch = Number.isSafeInteger(epoch) && epoch >= 0
    ? epoch
    : 0;
  const normalizedRequestId =
    normalizeEmergencyRequestId(route?.requestId);
  const mode = getEmergencyRouteMode(route);

  return Object.freeze({
    epoch: normalizedEpoch,
    mode,
    requestId:
      mode === EMERGENCY_ROUTE_MODE.DETAIL
        ? normalizedRequestId
        : null,
    route: Object.freeze({ ...(route || {}) }),
  });
}

export function advanceEmergencyRouteSession(currentSession, route) {
  return createEmergencyRouteSession(
    route,
    (currentSession?.epoch ?? -1) + 1
  );
}

export function captureEmergencyRouteOwnership(session) {
  return Object.freeze({
    epoch: session?.epoch ?? -1,
    mode: session?.mode ?? EMERGENCY_ROUTE_MODE.INVALID,
    requestId: normalizeEmergencyRequestId(session?.requestId),
  });
}

export function isEmergencyRouteOwnershipCurrent(
  session,
  ownership
) {
  return Boolean(
    session &&
      ownership &&
      session.epoch === ownership.epoch &&
      session.mode === ownership.mode &&
      session.requestId === ownership.requestId
  );
}

export function createEmergencyRouteSessionController(initialRoute) {
  let currentSession = createEmergencyRouteSession(initialRoute);

  return Object.freeze({
    current() {
      return currentSession;
    },
    transition(route) {
      currentSession = advanceEmergencyRouteSession(
        currentSession,
        route
      );
      return currentSession;
    },
    capture() {
      return captureEmergencyRouteOwnership(currentSession);
    },
    owns(ownership) {
      return isEmergencyRouteOwnershipCurrent(
        currentSession,
        ownership
      );
    },
  });
}

export async function settleEmergencyRouteOperation(
  controller,
  ownership,
  operation
) {
  try {
    const value = await operation;

    return controller.owns(ownership)
      ? { status: "fulfilled", value, error: null }
      : { status: "stale", value: null, error: null };
  } catch (error) {
    return controller.owns(ownership)
      ? { status: "rejected", value: null, error }
      : { status: "stale", value: null, error: null };
  }
}

export function ownEmergencyRequest(session, emergencyRequest) {
  if (
    !emergencyRequest ||
    typeof emergencyRequest !== "object"
  ) {
    return null;
  }

  return Object.freeze({
    emergencyRequest,
    ownership: captureEmergencyRouteOwnership(session),
  });
}

export function selectEmergencyRequestForRoute(
  session,
  ownedEmergencyRequest
) {
  const sessionRequestId = normalizeEmergencyRequestId(
    session?.requestId
  );

  if (
    session?.mode !== EMERGENCY_ROUTE_MODE.DETAIL ||
    !sessionRequestId ||
    !isEmergencyRouteOwnershipCurrent(
      session,
      ownedEmergencyRequest?.ownership
    )
  ) {
    return null;
  }

  const emergencyRequest = ownedEmergencyRequest?.emergencyRequest;
  const emergencyRequestId = normalizeEmergencyRequestId(
    emergencyRequest?.id ??
      emergencyRequest?.emergencyRequestId ??
      emergencyRequest?.emergency_request_id
  );

  return emergencyRequestId &&
    emergencyRequestId === sessionRequestId
    ? emergencyRequest
    : null;
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
