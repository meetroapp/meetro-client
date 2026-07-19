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
    source: "authenticated-backend-post",
    title: title || "Service Request",
    description,
    category: post.category || "handyman",
    location: post.location || "Local Area",
    request_photos: requestPhotos,
    photos: requestPhotos.map((photo) => photo?.secure_url).filter(Boolean),
    image_url: post.image_url || "",
    status: post.status || "open",
    createdAt: post.created_at || post.createdAt || "",
    viewedByBusinesses: [],
    quotesReceived: [],
    messagesCount: 0,
  };
}

export function normalizeAuthenticatedHomeownerPosts(posts = []) {
  if (!Array.isArray(posts)) return [];
  return posts.map(normalizeAuthenticatedHomeownerPost).filter(Boolean);
}
