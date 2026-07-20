import { normalizeAuthenticatedHomeownerPosts } from "./backendHomeownerRequests.js";

export const REQUEST_COLLECTION_STATUS = Object.freeze({
  LOADING: "loading",
  EMPTY: "empty",
  READY: "ready",
  UNAVAILABLE: "unavailable",
});

export function resolveHomeownerRequestCollection(result) {
  if (!result?.response?.ok) {
    return {
      status: REQUEST_COLLECTION_STATUS.UNAVAILABLE,
      records: [],
      code: result?.data?.code || "REQUESTS_FETCH_FAILED",
    };
  }

  const payload = result.data || {};
  const posts = Array.isArray(payload) ? payload : payload.posts;
  if (!Array.isArray(posts)) {
    return {
      status: REQUEST_COLLECTION_STATUS.UNAVAILABLE,
      records: [],
      code: "INVALID_REQUESTS_RESPONSE",
    };
  }

  const records = normalizeAuthenticatedHomeownerPosts(posts);
  return {
    status: records.length > 0
      ? REQUEST_COLLECTION_STATUS.READY
      : REQUEST_COLLECTION_STATUS.EMPTY,
    records,
    code: "",
  };
}

export function replaceCanonicalRequest(records = [], canonicalPost = {}) {
  if (!Array.isArray(records)) return [];
  const normalized = normalizeAuthenticatedHomeownerPosts([canonicalPost])[0];
  if (!normalized) return records.map((record) => ({ ...record }));

  return records.map((record) =>
    String(record.requestId || record.id) === String(normalized.requestId)
      ? normalized
      : { ...record }
  );
}
