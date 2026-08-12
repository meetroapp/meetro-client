export function normalizeAuthenticatedHomeownerPost(post = {}) {
  if (!post || typeof post !== "object" || Array.isArray(post)) return null;

  const requestId = post.id ?? post.requestId;
  const title = String(post.title || post.project_title || "").trim();
  const description = String(
    post.description || post.project_description || ""
  ).trim();
  if (!requestId || (!title && !description)) return null;

  const requestPhotos = Array.isArray(post.request_photos)
    ? post.request_photos.map((photo) => ({ ...photo }))
    : [];

  return {
    id: requestId,
    requestId,
    lifecycleContractVersion: Number(post.lifecycle_contract_version || 1),
    modificationVersion: Number(post.modification_version || 1),
    source: "authenticated-backend-post",
    title: title || "Service Request",
    description,
    category: post.category || "handyman",
    request_category: post.request_category || "",
    service_domain: post.service_domain || "",
    service_specialty: post.service_specialty || "",
    location: post.location || "",
    locationIntakeMode: post.location_intake_mode || "",
    locationNormalizationStatus:
      post.location_normalization_status || "legacy_unclassified",
    serviceAddressLine1: post.service_address_line1 || "",
    serviceCity: post.service_city || "",
    serviceRegion: post.service_region || "",
    servicePostalCode: post.service_postal_code || "",
    serviceCountryCode: post.service_country_code || "",
    discoveryAreaLabel: post.discovery_area_label || "",
    unitNumber: post.unit_number || "",
    accessNotes: post.access_notes || "",
    request_photos: requestPhotos,
    photos: requestPhotos.map((photo) => photo?.secure_url).filter(Boolean),
    image_url: post.image_url || "",
    status: post.status || "open",
    createdAt: post.created_at || post.createdAt || "",
    updatedAt: post.updated_at || post.updatedAt || "",
    cancelledAt: post.cancelled_at || post.cancelledAt || "",
    viewedByBusinesses: [],
    quotesReceived: [],
    messagesCount: 0,
  };
}

export function normalizeAuthenticatedHomeownerPosts(posts = []) {
  if (!Array.isArray(posts)) return [];
  return posts.map(normalizeAuthenticatedHomeownerPost).filter(Boolean);
}
