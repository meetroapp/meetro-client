const DENIED = new Set(["private", "hidden", "deleted", "blocked", "archived"]);
function status(record = {}) { return String(record.visibility || record.visibilityStatus || record.privacy || "public").trim().toLowerCase(); }
export function evaluateCommunityVisibility(record = {}, { member = false, publicScope = false, relationshipIds = [] } = {}) {
  const visibility = status(record);
  const contradictory = (visibility === "public" && (record.private === true || record.hidden === true)) || (record.public === true && DENIED.has(visibility));
  if (contradictory) return { visible: false, warning: "visibility_conflict" };
  if (record.blocked === true || record.isBlocked === true || record.blockedByCurrentUser === true || record.muted === true || record.excluded === true || record.deleted === true || record.archived === true || DENIED.has(visibility)) return { visible: false };
  if (visibility === "public") return { visible: member || publicScope };
  if (visibility === "community") return { visible: member };
  if (["connections", "relationship"].includes(visibility)) {
    const id = String(record.relationshipId || "");
    return { visible: Boolean(id && relationshipIds.includes(id)) };
  }
  if (visibility === "business") return { visible: record.businessAuthorized === true };
  return { visible: false, warning: "unsupported_visibility" };
}
