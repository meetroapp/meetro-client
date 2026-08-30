export const CANONICAL_ALERT_CATEGORIES = Object.freeze([
  "communication",
  "emergency",
  "request",
  "evaluation",
  "proposal",
  "invoice",
  "payment",
  "schedule",
  "work",
  "completion",
  "review",
  "business_verification",
  "system",
]);

export const CANONICAL_ALERT_PRIORITIES = Object.freeze([
  "critical",
  "high",
  "normal",
  "informational",
]);

export const CANONICAL_ALERT_LIFECYCLES = Object.freeze([
  "active",
  "dismissed",
  "resolved",
  "expired",
  "archived",
]);

const ALERT_CATEGORY_SET = new Set(CANONICAL_ALERT_CATEGORIES);
const ALERT_PRIORITY_SET = new Set(CANONICAL_ALERT_PRIORITIES);
const ALERT_LIFECYCLE_SET = new Set(CANONICAL_ALERT_LIFECYCLES);
const CANONICAL_CURSOR_MAX_LENGTH = 1024;
const LOCALIZATION_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, keys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function copyJsonValue(value, ancestors = new WeakSet()) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return { valid: true, value };
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { valid: true, value }
      : { valid: false, value: null };
  }

  if (!isPlainObject(value) || ancestors.has(value)) {
    return { valid: false, value: null };
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some(
      (key) =>
        typeof key !== "string" ||
        key === "__proto__" ||
        key === "constructor" ||
        key === "prototype" ||
        !descriptors[key]?.enumerable ||
        !Object.hasOwn(descriptors[key], "value")
    )
  ) {
    return { valid: false, value: null };
  }

  ancestors.add(value);
  const copy = {};
  try {
    for (const key of keys) {
      const normalized = copyJsonValue(descriptors[key].value, ancestors);
      if (!normalized.valid) return normalized;
      copy[key] = normalized.value;
    }
  } finally {
    ancestors.delete(value);
  }
  return { valid: true, value: copy };
}

function normalizeRequiredToken(value) {
  return typeof value === "string" &&
    value.length > 0 &&
    LOCALIZATION_KEY_PATTERN.test(value)
    ? value
    : null;
}

function normalizeCanonicalTimestamp(value, { required = false } = {}) {
  if (value === null) return required ? null : null;
  if (typeof value !== "string" || value.length === 0) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    return null;
  }
  return value;
}

function normalizeOptionalTimestamp(value) {
  if (value === null) return { valid: true, value: null };
  const timestamp = normalizeCanonicalTimestamp(value);
  return timestamp
    ? { valid: true, value: timestamp }
    : { valid: false, value: null };
}

function normalizePositiveNumericIdentity(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function normalizeCanonicalAlertId(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? value : null;
}

export function normalizeCanonicalAlertDestination(value) {
  if (!isPlainObject(value) || typeof value.type !== "string") return null;

  const numericDestinations = {
    emergency_request: "emergencyRequestId",
    request: "requestId",
    project: "requestId",
    business_profile: "businessProfileId",
    review: "reviewId",
  };

  if (value.type === "conversation") {
    const basic = hasExactKeys(value, ["type", "conversationId"]);
    const workContext = hasExactKeys(value, [
      "type",
      "conversationId",
      "jobId",
      "quoteId",
    ]);
    if (!basic && !workContext) return null;
    const conversationId = normalizePositiveNumericIdentity(value.conversationId);
    if (!conversationId) return null;
    if (basic) return { type: value.type, conversationId };
    if (
      typeof value.jobId !== "string" ||
      typeof value.quoteId !== "string" ||
      !UUID_PATTERN.test(value.jobId) ||
      !UUID_PATTERN.test(value.quoteId)
    ) return null;
    return {
      type: value.type,
      conversationId,
      jobId: value.jobId.toLowerCase(),
      quoteId: value.quoteId.toLowerCase(),
    };
  }

  if (value.type === "job") {
    if (!hasExactKeys(value, ["type", "jobId"])) return null;
    if (typeof value.jobId !== "string" || !UUID_PATTERN.test(value.jobId)) {
      return null;
    }
    return { type: value.type, jobId: value.jobId.toLowerCase() };
  }

  const jobResourceDestinations = {
    visit: "visitId",
    quote: "quoteId",
    invoice: "invoiceId",
  };
  const resourceField = jobResourceDestinations[value.type];
  if (resourceField) {
    if (!hasExactKeys(value, ["type", "jobId", resourceField])) return null;
    if (
      typeof value.jobId !== "string" ||
      typeof value[resourceField] !== "string" ||
      !UUID_PATTERN.test(value.jobId) ||
      !UUID_PATTERN.test(value[resourceField])
    ) {
      return null;
    }
    return {
      type: value.type,
      jobId: value.jobId.toLowerCase(),
      [resourceField]: value[resourceField].toLowerCase(),
    };
  }
  const numericField = numericDestinations[value.type];
  if (numericField) {
    if (!hasExactKeys(value, ["type", numericField])) return null;
    const identity = normalizePositiveNumericIdentity(value[numericField]);
    return identity ? { type: value.type, [numericField]: identity } : null;
  }

  if (value.type === "evaluation") {
    if (!hasExactKeys(value, ["type", "evaluationId"])) return null;
    if (
      typeof value.evaluationId !== "string" ||
      !UUID_PATTERN.test(value.evaluationId)
    ) {
      return null;
    }
    return { type: value.type, evaluationId: value.evaluationId };
  }

  if (value.type === "notifications") {
    return hasExactKeys(value, ["type"]) ? { type: value.type } : null;
  }

  return null;
}

function normalizeCanonicalAlertState(value, readAt) {
  if (
    !hasExactKeys(value, [
      "lifecycle",
      "isRead",
      "isDismissed",
      "isResolved",
      "isExpired",
      "isArchived",
    ]) ||
    !ALERT_LIFECYCLE_SET.has(value.lifecycle) ||
    [
      value.isRead,
      value.isDismissed,
      value.isResolved,
      value.isExpired,
      value.isArchived,
    ].some((flag) => typeof flag !== "boolean") ||
    value.isRead !== (readAt !== null) ||
    value.isDismissed !== (value.lifecycle === "dismissed") ||
    value.isResolved !== (value.lifecycle === "resolved") ||
    value.isExpired !== (value.lifecycle === "expired") ||
    value.isArchived !== (value.lifecycle === "archived")
  ) {
    return null;
  }

  return {
    lifecycle: value.lifecycle,
    isRead: value.isRead,
    isDismissed: value.isDismissed,
    isResolved: value.isResolved,
    isExpired: value.isExpired,
    isArchived: value.isArchived,
  };
}

export function normalizeCanonicalAlert(value) {
  if (!isPlainObject(value)) return null;

  const id = normalizeCanonicalAlertId(value.id);
  const titleKey = normalizeRequiredToken(value.titleKey);
  const messageKey = normalizeRequiredToken(value.messageKey);
  const destination = normalizeCanonicalAlertDestination(value.destination);
  const payload = copyJsonValue(value.payload);
  const availableAt = normalizeCanonicalTimestamp(value.availableAt, {
    required: true,
  });
  const createdAt = normalizeCanonicalTimestamp(value.createdAt, {
    required: true,
  });
  const updatedAt = normalizeCanonicalTimestamp(value.updatedAt, {
    required: true,
  });
  const optionalTimestamps = [
    "readAt",
    "dismissedAt",
    "resolvedAt",
    "expiresAt",
    "archivedAt",
  ];
  const timestamps = {};
  for (const field of optionalTimestamps) {
    const normalized = normalizeOptionalTimestamp(value[field]);
    if (!normalized.valid) return null;
    timestamps[field] = normalized.value;
  }
  const state = normalizeCanonicalAlertState(value.state, timestamps.readAt);

  if (
    !id ||
    !ALERT_CATEGORY_SET.has(value.category) ||
    !ALERT_PRIORITY_SET.has(value.priority) ||
    !titleKey ||
    !messageKey ||
    !payload.valid ||
    !state ||
    !availableAt ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    category: value.category,
    priority: value.priority,
    titleKey,
    messageKey,
    payload: payload.value,
    destination,
    state,
    availableAt,
    createdAt,
    updatedAt,
    ...timestamps,
  };
}

function normalizeSuccessEnvelope(value, expectedCode) {
  return isPlainObject(value) &&
    value.success === true &&
    value.code === expectedCode
    ? true
    : false;
}

function normalizeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function normalizeAlertListResponse(value) {
  if (
    !normalizeSuccessEnvelope(value, "ALERTS_RETRIEVED") ||
    !Array.isArray(value.alerts) ||
    !isPlainObject(value.pagination)
  ) {
    return null;
  }

  const alerts = value.alerts.map(normalizeCanonicalAlert);
  if (alerts.some((alert) => !alert)) return null;

  const { limit, hasMore, nextCursor } = value.pagination;
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    typeof hasMore !== "boolean" ||
    (hasMore &&
      (typeof nextCursor !== "string" ||
        nextCursor.length < 1 ||
        nextCursor.length > CANONICAL_CURSOR_MAX_LENGTH)) ||
    (!hasMore && nextCursor !== null)
  ) {
    return null;
  }

  return {
    success: true,
    code: value.code,
    alerts,
    pagination: { limit, hasMore, nextCursor },
  };
}

export function normalizeAlertCountsResponse(value) {
  if (
    !normalizeSuccessEnvelope(value, "ALERT_COUNTS_RETRIEVED") ||
    !isPlainObject(value.counts) ||
    !isPlainObject(value.counts.byCategory)
  ) {
    return null;
  }

  const active = normalizeCount(value.counts.active);
  const unread = normalizeCount(value.counts.unread);
  if (active === null || unread === null) return null;

  const byCategory = {};
  for (const [category, counts] of Object.entries(value.counts.byCategory)) {
    if (!ALERT_CATEGORY_SET.has(category) || !isPlainObject(counts)) return null;
    const categoryActive = normalizeCount(counts.active);
    const categoryUnread = normalizeCount(counts.unread);
    if (categoryActive === null || categoryUnread === null) return null;
    byCategory[category] = {
      active: categoryActive,
      unread: categoryUnread,
    };
  }

  return {
    success: true,
    code: value.code,
    counts: { active, unread, byCategory },
  };
}

export function normalizeAlertReadAllResponse(value) {
  if (!normalizeSuccessEnvelope(value, "ALERTS_MARKED_READ")) return null;
  const markedReadCount = normalizeCount(value.markedReadCount);
  const cutoffAt = normalizeCanonicalTimestamp(value.cutoffAt, {
    required: true,
  });
  if (markedReadCount === null || !cutoffAt) return null;
  return {
    success: true,
    code: value.code,
    markedReadCount,
    cutoffAt,
  };
}

export function normalizeAlertMutationResponse(value, expectedCode) {
  if (!normalizeSuccessEnvelope(value, expectedCode)) return null;
  const alert = normalizeCanonicalAlert(value.alert);
  return alert
    ? { success: true, code: value.code, alert }
    : null;
}
