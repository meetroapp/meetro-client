function text(value) { return value === undefined || value === null ? "" : String(value).trim(); }
export function minimizeCommunityLocation(record = {}, resolution = {}) {
  return {
    communityId: resolution.communityId,
    serviceAreaId: text(record.serviceAreaId || resolution.serviceAreaId),
    city: text(record.city || record.serviceCity),
    region: text(record.region || record.state || record.serviceRegion),
    ...(record.neighborhoodPublic === true && record.neighborhoodId ? { neighborhoodId: text(record.neighborhoodId) } : {}),
  };
}
