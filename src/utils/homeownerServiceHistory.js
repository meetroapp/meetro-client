function safeReadArray(storage, key) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeReadObject(storage, key) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function text(value = "") {
  return String(value || "").trim();
}

function normalized(value = "") {
  return text(value).toLowerCase();
}

function firstValue(...values) {
  return values.find((value) => text(value) !== "") || "";
}

function readStorageKeys(storage) {
  if (!storage) return [];

  if (typeof storage.length === "number" && typeof storage.key === "function") {
    return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      Boolean
    );
  }

  if (storage._data && typeof storage._data === "object") {
    return Object.keys(storage._data);
  }

  return [];
}

export function getCurrentHomeownerIdentity(storage = globalThis.localStorage) {
  if (!storage) return {};

  const user = safeReadObject(storage, "user");
  return {
    id: text(storage.getItem("userId") || user.id || user.userId),
    email: normalized(storage.getItem("userEmail") || user.email),
    name: normalized(
      storage.getItem("userName") ||
        user.username ||
        user.name ||
        storage.getItem("homeownerName")
    ),
  };
}

export function isClosedServiceStatus(status = "") {
  return [
    "closed",
    "closure_completed",
    "closure complete",
    "closure verified",
    "history",
  ].includes(normalized(status));
}

function getRecordHomeownerIdentity(record = {}) {
  const customer = record.customer || {};
  const request = record.request || {};
  const schedule = record.schedule || {};
  const quote = record.quote || record.proposal || record.acceptedQuote || {};

  return {
    id: text(
      record.homeownerId ||
        record.homeowner_id ||
        record.customerId ||
        record.customer_id ||
        request.homeownerId ||
        request.customerId ||
        schedule.customerId ||
        quote.homeownerId ||
        quote.customerId
    ),
    email: normalized(
      record.homeownerEmail ||
        record.homeowner_email ||
        record.customerEmail ||
        request.homeownerEmail ||
        request.customerEmail ||
        schedule.customerEmail ||
        quote.homeownerEmail ||
        quote.homeowner_email
    ),
    name: normalized(
      record.homeownerName ||
        record.customerName ||
        record.customer ||
        customer.name ||
        request.homeownerName ||
        request.customerName ||
        schedule.customerName ||
        quote.homeownerName ||
        quote.customerName ||
        quote.homeowner_email
    ),
  };
}

export function recordMatchesHomeowner(record = {}, identity = {}) {
  const currentId = text(identity.id);
  const currentEmail = normalized(identity.email);
  const currentName = normalized(identity.name);
  const recordIdentity = getRecordHomeownerIdentity(record);
  const hasCurrentIdentity = Boolean(currentId || currentEmail || currentName);
  const hasRecordIdentity = Boolean(
    recordIdentity.id || recordIdentity.email || recordIdentity.name
  );

  if (!hasCurrentIdentity) return true;
  if (!hasRecordIdentity) return false;

  return (
    (currentId && recordIdentity.id && currentId === recordIdentity.id) ||
    (currentEmail && recordIdentity.email && currentEmail === recordIdentity.email) ||
    (currentName && recordIdentity.name && currentName === recordIdentity.name)
  );
}

function getHistoryIdentity(record = {}) {
  return firstValue(
    record.historyId,
    record.completionId,
    record.closureId,
    record.jobId,
    record.projectId,
    record.requestId,
    record.id,
    record.scheduleId,
    record.quoteId,
    record.conversationId,
    [record.title, record.customerName || record.customer, record.closedAt || record.completedAt]
      .filter(Boolean)
      .join(":")
  );
}

function getReviewForHistory(record = {}, reviews = []) {
  const recordJobIds = [
    record.jobId,
    record.requestId,
    record.id,
    record.projectId,
    record.scheduleId,
  ]
    .filter(Boolean)
    .map(String);
  const recordService = normalized(record.title || record.service || record.category);

  return reviews.find((review) => {
    const reviewJobId = text(review.jobId || review.requestId);
    const reviewService = normalized(review.service);
    return (
      (reviewJobId && recordJobIds.includes(reviewJobId)) ||
      (reviewService && recordService && reviewService === recordService)
    );
  });
}

export function normalizeHomeownerServiceHistoryRecord(
  record = {},
  { source = "", reviews = [] } = {}
) {
  const schedule = record.schedule || {};
  const quote = record.quote || record.proposal || record.acceptedQuote || {};
  const completion = record.completion || {};
  const payments = record.payments || {};
  const review = getReviewForHistory(record, reviews);
  const finalAmount = firstValue(
    record.finalTotal,
    record.revenue,
    record.amount,
    record.quoteAmount,
    quote.total,
    quote.amount,
    quote.quoteTotal,
    schedule.paymentAmount
  );

  return {
    ...record,
    historyId: getHistoryIdentity(record),
    source,
    status: firstValue(record.status, record.closureStatus, schedule.status, "closed"),
    title: firstValue(
      record.title,
      record.jobTitle,
      record.service,
      record.category,
      schedule.title,
      quote.service,
      quote.project_title,
      "Completed Service"
    ),
    professionalName: firstValue(
      record.professionalName,
      record.businessName,
      record.selectedProfessional,
      quote.businessName,
      quote.contractorName,
      schedule.businessName,
      "Professional"
    ),
    completedAt: firstValue(
      record.closedAt,
      record.closeDate,
      record.completedAt,
      completion.completedAt,
      schedule.closedAt,
      schedule.completedAt,
      record.createdAt
    ),
    finalAmount,
    paymentStatus: firstValue(
      record.paymentStatus,
      payments.paymentStatus,
      quote.paymentStatus,
      schedule.paymentStatus,
      finalAmount ? "paid" : ""
    ),
    review,
    reviewSubmitted: Boolean(record.reviewSubmitted || review),
  };
}

export function getHomeownerServiceHistory(storage = globalThis.localStorage) {
  if (!storage) return [];

  const homeownerIdentity = getCurrentHomeownerIdentity(storage);
  const reviews = safeReadArray(storage, "meetroProfessionalReviews");
  const completedProjects = safeReadArray(storage, "completedProjects");
  const homeownerRequests = safeReadArray(storage, "homeownerRequests").filter(
    (record) =>
      isClosedServiceStatus(record.status) ||
      isClosedServiceStatus(record.closureStatus)
  );
  const schedules = safeReadArray(storage, "meetro_business_schedule").filter(
    (record) =>
      isClosedServiceStatus(record.status) ||
      isClosedServiceStatus(record.workStatus) ||
      isClosedServiceStatus(record.jobStage) ||
      isClosedServiceStatus(record.closureStatus)
  );
  const jobRecords = readStorageKeys(storage)
    .filter((key) => key.startsWith("meetro_job_record_"))
    .flatMap((key) =>
      safeReadArray(storage, key)
        .filter(
          (record) =>
            isClosedServiceStatus(record.status) ||
            isClosedServiceStatus(record.stage) ||
            isClosedServiceStatus(record.closureStatus)
        )
        .map((record) => ({ ...record, conversationId: key.replace("meetro_job_record_", "") }))
    );

  const sources = [
    ...completedProjects.map((record) => ({ record, source: "completedProjects" })),
    ...homeownerRequests.map((record) => ({ record, source: "homeownerRequests" })),
    ...schedules.map((record) => ({ record, source: "meetro_business_schedule" })),
    ...jobRecords.map((record) => ({ record, source: "meetro_job_record" })),
  ];
  const seen = new Set();

  return sources
    .filter(({ record }) => recordMatchesHomeowner(record, homeownerIdentity))
    .map(({ record, source }) =>
      normalizeHomeownerServiceHistoryRecord(record, { source, reviews })
    )
    .filter((record) => {
      const key = normalized(record.historyId);
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.completedAt || b.closedAt || 0) -
        new Date(a.completedAt || a.closedAt || 0)
    );
}
