const SOURCES = Object.freeze([
  "moments", "spotlights", "wonderPasses", "communityPosts", "visibleProfiles",
  "professionalProfiles", "communityEngagement", "communityRelationships", "serviceInterests",
]);
const METHODS = Object.freeze([
  "getCommunityRecords", "getMomentRecords", "getSpotlightRecords", "getWonderPassRecords",
  "getVisibleProfileRecords", "getCommunityEngagementRecords", "getCommunityRelationshipRecords",
]);
function text(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function list(value) { return Array.isArray(value) ? value : []; }
function communityId(record = {}) { return text(record.communityId || record.community_id || record.serviceAreaId || record.service_area_id); }
function flatten(value, source) {
  if (Array.isArray(value)) return value.map((record) => ({ source, record }));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([name, records]) => list(records).map((record) => ({ source: name, record })));
}
export async function resolveCommunitySource({ request = {} } = {}) {
  const authorized = [...new Set([
    ...list(request.backendContext?.authorizedCommunityIds), ...list(request.user?.authorizedCommunityIds),
    request.user?.communityId, request.backendContext?.communityId, request.backendContext?.community?.communityId,
    request.backendContext?.publicCommunityId,
  ].map(text).filter(Boolean))];
  if (!authorized.length) return null;
  const trusted = text(request.backendContext?.communityId || request.backendContext?.community?.communityId || request.backendContext?.publicCommunityId);
  const id = trusted && authorized.includes(trusted) ? trusted : authorized.length === 1 ? authorized[0] : "";
  if (!id) return null;
  const candidates = SOURCES.flatMap((source) => list(request.backendContext?.[source]).map((record) => ({ source, record })));
  for (const method of METHODS) {
    if (typeof request.repositories?.[method] !== "function") continue;
    candidates.push(...flatten(await request.repositories[method]({ user: request.user, communityId: id }), method));
  }
  return {
    communityId: id,
    source: request.backendContext?.publicCommunityId === id ? "public_community_scope" : "authorized_community_scope",
    records: candidates.filter(({ record }) => communityId(record) === id),
    member: list(request.backendContext?.authorizedCommunityIds).map(text).includes(id) || list(request.user?.authorizedCommunityIds).map(text).includes(id),
    publicScope: request.backendContext?.publicCommunityId === id,
  };
}
export { communityId as getRecordCommunityId };
