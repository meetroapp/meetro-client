export function buildCommunityEngagement(records = [], domains = {}) {
  const events = records.filter((item) => item.kind === "engagement");
  const eventCount = events.reduce((sum, item) => sum + item.reactionCount + item.commentCount + item.shareCount + item.saveCount, 0);
  return { totalVisibleInteractions: domains.moments.interactionCount + domains.spotlight.interactionCount + domains.wonderPass.interactionCount + eventCount, momentInteractions: domains.moments.interactionCount, spotlightInteractions: domains.spotlight.interactionCount, wonderPassInteractions: domains.wonderPass.interactionCount, trend: "insufficient_data" };
}
