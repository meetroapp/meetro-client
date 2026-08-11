const CONTAINED_LEGACY_SURFACES = new Set([
  "schedule",
  "quotes",
  "active",
  "completed",
  "materials",
  "records",
  "revenue",
]);

export const WORK_CENTER_LEGACY_AUTHORITY_POLICY = Object.freeze({
  scheduling: Object.freeze({
    authority: "UNAVAILABLE",
    storage: Object.freeze(["meetro_business_schedule"]),
  }),
  paymentDeposit: Object.freeze({
    authority: "UNAVAILABLE",
    storage: Object.freeze(["workCenterQuoteHistory", "meetroQuoteHistory", "quoteHistory"]),
  }),
  quote: Object.freeze({
    authority: "READ_ONLY",
    storage: Object.freeze(["workCenterQuoteHistory", "meetroQuoteHistory", "quoteHistory"]),
  }),
  activeWork: Object.freeze({
    authority: "READ_ONLY",
    storage: Object.freeze([
      "activeWorkSnapshot",
      "activeJobSnapshot",
      "activeWorkStatus",
      "activeJobStatus",
    ]),
  }),
  completion: Object.freeze({
    authority: "UNAVAILABLE",
    storage: Object.freeze(["meetro_job_record_*", "projectTimeline"]),
  }),
  history: Object.freeze({
    authority: "READ_ONLY",
    storage: Object.freeze(["meetro_job_record_*", "projectTimeline"]),
  }),
  jobUpdate: Object.freeze({ authority: "UNAVAILABLE", storage: Object.freeze([]) }),
  changeOrder: Object.freeze({
    authority: "UNAVAILABLE",
    storage: Object.freeze(["selectedChangeOrderRequest"]),
  }),
  invoicePdf: Object.freeze({ authority: "UNAVAILABLE", storage: Object.freeze([]) }),
  emergency: Object.freeze({ authority: "SEPARATE", storage: Object.freeze([]) }),
});

export function isLegacyWorkCenterCommandSurfaceContained(surface) {
  return CONTAINED_LEGACY_SURFACES.has(String(surface || ""));
}

export function selectCanonicalWorkCenterTruth({ canonical = null, legacy = null } = {}) {
  if (canonical) {
    return {
      record: canonical,
      authority: "CANONICAL_READ",
      readOnly: true,
      ignoredLegacyConflict: Boolean(legacy),
    };
  }

  if (legacy) {
    return {
      record: legacy,
      authority: "LEGACY_COMPATIBILITY",
      readOnly: true,
      ignoredLegacyConflict: false,
    };
  }

  return null;
}

function firstText(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isEmergencyReference(record = {}) {
  return Boolean(
    record.emergencyRequestId ||
      record.isEmergency ||
      String(record.sourceType || record.type || "").toLowerCase() === "emergency"
  );
}

export function buildLegacyWorkCenterReferences(surface, records = []) {
  const source = Array.isArray(records) ? records : [];
  const seen = new Set();

  return source.flatMap((record, index) => {
    if (!record || typeof record !== "object") return [];

    const id = String(
      record.id ||
        record.jobId ||
        record.quoteId ||
        record.scheduleId ||
        record.requestId ||
        `${surface || "legacy"}-${index}`
    );
    if (seen.has(id)) return [];
    seen.add(id);

    const title =
      firstText(record, [
        "projectTitle",
        "requestTitle",
        "title",
        "service",
        "category",
        "customerName",
        "customer",
      ]) || "Legacy Work Center record";
    const detail = firstText(record, [
      "customerName",
      "homeownerName",
      "customer",
      "location",
      "address",
      "description",
    ]);

    return [
      {
        id,
        title,
        detail: detail === title ? "" : detail,
        authority: "LEGACY_COMPATIBILITY",
        readOnly: true,
        sourceLabel: isEmergencyReference(record)
          ? "Emergency compatibility reference"
          : "Legacy compatibility reference",
      },
    ];
  });
}
