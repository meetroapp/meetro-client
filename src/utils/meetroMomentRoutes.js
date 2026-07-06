export const MEETRO_MOMENTS_PAGE = "meetroMoments";
export const MEETRO_MOMENT_DETAILS_PAGE = "meetroMomentDetails";

export function normalizeMeetroMomentRoute(route = "") {
  return String(route || "")
    .replace(/^#/, "")
    .split("?")[0]
    .replace(/^\/+/, "");
}

export function getMeetroMomentRouteId(route = "") {
  const cleanRoute = normalizeMeetroMomentRoute(route);

  if (!cleanRoute.startsWith("moments/")) return "";

  const rawId = cleanRoute.slice("moments/".length);

  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
}

export function getMeetroMomentRoutePage(route = "") {
  const cleanRoute = normalizeMeetroMomentRoute(route);

  if (cleanRoute === "moments") return MEETRO_MOMENTS_PAGE;
  if (cleanRoute.startsWith("moments/")) return MEETRO_MOMENT_DETAILS_PAGE;

  return "";
}

export function getMeetroMomentHashRoute(momentId = "") {
  const cleanMomentId = String(momentId || "").trim();
  if (!cleanMomentId) return "";
  return `/moments/${encodeURIComponent(cleanMomentId)}`;
}
