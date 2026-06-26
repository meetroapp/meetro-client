const GLOBAL_REVIEW_KEY = "meetroProfessionalReviews";

function safeReadArray(storage, key) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteArray(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeId(value = "") {
  return normalizeText(value).toLowerCase();
}

export function getFirstName(displayName = "") {
  const cleanName = normalizeText(displayName);
  if (!cleanName) return "Customer";
  return cleanName.split(/\s+/)[0] || cleanName;
}

export function getProfessionalReviewKey(review = {}) {
  const professionalId = normalizeId(review.professionalId);
  const jobId = normalizeId(review.jobId || review.requestId);
  const source = normalizeId(review.source);

  if (professionalId && jobId) {
    return `${professionalId}:${jobId}:${source || "review"}`;
  }

  return normalizeId(
    review.id ||
      [
        review.professionalName,
        review.customerDisplayName,
        review.service,
        review.comment || review.review,
        review.createdAt,
      ].join(":")
  );
}

export function normalizeProfessionalReview(review = {}) {
  const professionalName = normalizeText(
    review.professionalName || review.businessName || review.contractorName
  );
  const customerDisplayName = getFirstName(
    review.customerDisplayName ||
      review.customerName ||
      review.homeownerName ||
      review.reviewerName ||
      review.reviewer_email
  );
  const service = normalizeText(
    review.service || review.projectTitle || review.jobTitle || review.category
  );
  const comment = normalizeText(
    review.comment || review.review || review.review_text || review.text
  );
  const createdAt = review.createdAt || review.created_at || new Date().toISOString();
  const professionalId = normalizeText(
    review.professionalId ||
      review.businessId ||
      review.contractorId ||
      review.contractor_id ||
      professionalName
  );

  return {
    id: normalizeText(review.id) || getProfessionalReviewKey({
      ...review,
      professionalId,
      professionalName,
      customerDisplayName,
      service,
      comment,
      createdAt,
    }),
    professionalId,
    professionalName,
    customerDisplayName,
    rating: Number(review.rating || 0),
    comment,
    service,
    jobId: normalizeText(review.jobId || review.requestId || review.projectId),
    requestId: normalizeText(review.requestId || review.jobId || review.projectId),
    createdAt,
    source: normalizeText(review.source) || "homeowner_review",
  };
}

export function getProfessionalReviews(identifier = {}, storage = globalThis.localStorage) {
  if (!storage) return [];

  const professionalId = normalizeId(identifier.professionalId || identifier.id);
  const professionalName = normalizeId(
    identifier.professionalName || identifier.businessName || identifier.name
  );

  const globalReviews = safeReadArray(storage, GLOBAL_REVIEW_KEY);
  const legacyKeys = [
    identifier.professionalId || identifier.id,
    identifier.professionalName || identifier.businessName || identifier.name,
  ]
    .filter(Boolean)
    .map((value) => `meetroReviews_${value}`);

  const legacyReviews = legacyKeys.flatMap((key) => safeReadArray(storage, key));
  const seen = new Set();

  return [...globalReviews, ...legacyReviews]
    .map(normalizeProfessionalReview)
    .filter((review) => {
      const reviewProfessionalId = normalizeId(review.professionalId);
      const reviewProfessionalName = normalizeId(review.professionalName);
      const matches =
        !professionalId && !professionalName
          ? true
          : (professionalId && reviewProfessionalId === professionalId) ||
            (professionalName && reviewProfessionalName === professionalName);

      if (!matches) return false;

      const key = getProfessionalReviewKey(review);
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export function getProfessionalReviewStats(reviews = []) {
  const validReviews = reviews.filter((review) => Number(review.rating) > 0);
  const totalReviews = validReviews.length;
  const averageRating =
    totalReviews > 0
      ? (
          validReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
          totalReviews
        ).toFixed(1)
      : "";

  return {
    averageRating,
    totalReviews,
  };
}

export function saveProfessionalReview(review = {}, storage = globalThis.localStorage) {
  if (!storage) return null;

  const normalizedReview = normalizeProfessionalReview(review);
  const existingReviews = safeReadArray(storage, GLOBAL_REVIEW_KEY).map(
    normalizeProfessionalReview
  );
  const newKey = getProfessionalReviewKey(normalizedReview);
  const dedupedReviews = existingReviews.filter(
    (item) => getProfessionalReviewKey(item) !== newKey
  );
  const nextReviews = [normalizedReview, ...dedupedReviews];

  safeWriteArray(storage, GLOBAL_REVIEW_KEY, nextReviews);

  if (normalizedReview.professionalId) {
    const professionalReviews = nextReviews.filter(
      (item) => normalizeId(item.professionalId) === normalizeId(normalizedReview.professionalId)
    );

    safeWriteArray(
      storage,
      `meetroReviews_${normalizedReview.professionalId}`,
      professionalReviews
    );
  }

  return normalizedReview;
}

