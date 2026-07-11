import { minimizeCommunityLocation } from "./communityLocation.js";
function text(value) { return value === undefined || value === null ? "" : String(value).trim(); }
function num(value) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0; }
function kind(source = "") {
  const value = source.toLowerCase();
  if (/moment/.test(value)) return "moment"; if (/spotlight/.test(value)) return "spotlight";
  if (/wonder/.test(value)) return "wonder_pass"; if (/profile/.test(value)) return "profile";
  if (/engagement|reaction|comment/.test(value)) return "engagement"; if (/relationship/.test(value)) return "relationship";
  if (/interest|discover|service/.test(value)) return "service_interest"; return "post";
}
export function normalizeCommunityRecord({ source = "", record = {}, resolution = {} } = {}) {
  const type = kind(source);
  return {
    source, kind: type, communityId: resolution.communityId,
    momentId: text(record.momentId || (type === "moment" ? record.id : "")),
    spotlightId: text(record.spotlightId || (type === "spotlight" ? record.id : "")),
    wonderPassId: text(record.wonderPassId || record.offerId || (type === "wonder_pass" ? record.id : "")),
    postId: text(record.postId || (type === "post" ? record.id : "")), profileId: text(record.profileId || (type === "profile" ? record.id : "")),
    professionalId: text(record.professionalId), businessId: text(record.businessId), relationshipId: text(record.relationshipId),
    conversationId: text(record.conversationId), engagementId: text(record.engagementId || record.reactionId || record.commentId),
    category: text(record.serviceCategoryId || record.categoryId || record.category || record.serviceCategory).toLowerCase(),
    status: text(record.status || record.state || "active").toLowerCase(),
    createdAt: text(record.createdAt || record.publishedAt), startsAt: text(record.startsAt || record.activeAt), expiresAt: text(record.expiresAt || record.endsAt),
    location: minimizeCommunityLocation(record, resolution),
    reactionCount: num(record.reactionCount || record.visibleReactionCount), commentCount: num(record.commentCount || record.visibleCommentCount),
    shareCount: num(record.shareCount || record.visibleShareCount), saveCount: record.savesPublic === true ? num(record.saveCount) : 0,
    redemptionCount: record.redemptionsAggregateAuthorized === true ? num(record.redemptionCount) : 0,
    serviceInterestCount: num(record.aggregateInterestCount || record.visibleInterestCount),
    linked: record.explicitlyLinked === true,
  };
}
