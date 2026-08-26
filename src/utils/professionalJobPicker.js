import { authFetch } from "./authFetch.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const JOB_KEYS = Object.freeze([
  "jobId",
  "title",
  "serviceDomain",
  "serviceSpecialty",
  "lifecycleStatus",
  "customerLabel",
  "city",
  "serviceArea",
  "sourceLabel",
]);

export class ProfessionalJobPickerError extends Error {
  constructor({
    status = 500,
    code = "PROFESSIONAL_JOBS_FAILED",
    message = "Eligible Jobs are temporarily unavailable.",
  } = {}) {
    super(message);
    this.name = "ProfessionalJobPickerError";
    this.status = status;
    this.code = code;
  }
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasExactKeys(value, expected) {
  return (
    isRecord(value) &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...expected].sort())
  );
}

function normalizedText(value, maximum, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= maximum ? normalized : null;
}

function normalizeJob(value) {
  if (!hasExactKeys(value, JOB_KEYS)) return null;
  const jobId = String(value.jobId || "").trim().toLowerCase();
  const title = normalizedText(value.title, 500);
  const serviceDomain = normalizedText(value.serviceDomain, 200, {
    nullable: true,
  });
  const serviceSpecialty = normalizedText(value.serviceSpecialty, 200, {
    nullable: true,
  });
  const customerLabel = normalizedText(value.customerLabel, 200);
  const city = normalizedText(value.city, 120, { nullable: true });
  const serviceArea = normalizedText(value.serviceArea, 260, {
    nullable: true,
  });
  const sourceLabel = normalizedText(value.sourceLabel, 120);

  if (
    !UUID_PATTERN.test(jobId) ||
    !title ||
    !customerLabel ||
    !sourceLabel ||
    value.lifecycleStatus !== "ACTIVE" ||
    (value.serviceDomain != null && !serviceDomain) ||
    (value.serviceSpecialty != null && !serviceSpecialty) ||
    (value.city != null && !city) ||
    (value.serviceArea != null && !serviceArea)
  ) {
    return null;
  }

  return Object.freeze({
    jobId,
    title,
    serviceDomain,
    serviceSpecialty,
    lifecycleStatus: "ACTIVE",
    customerLabel,
    city,
    serviceArea,
    sourceLabel,
  });
}

export function normalizeAuthorizedProfessionalJobs(value) {
  if (
    !hasExactKeys(value, ["success", "code", "jobs"]) ||
    value.success !== true ||
    value.code !== "PROFESSIONAL_JOBS_LOADED" ||
    !Array.isArray(value.jobs) ||
    value.jobs.length > 100
  ) {
    return null;
  }
  const jobs = value.jobs.map(normalizeJob);
  return jobs.some((job) => !job) ? null : Object.freeze(jobs);
}

export function filterAuthorizedProfessionalJobs(jobs, query) {
  const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
  if (!normalizedQuery) return Array.isArray(jobs) ? jobs : [];
  return (Array.isArray(jobs) ? jobs : []).filter((job) =>
    [
      job.title,
      job.customerLabel,
      job.serviceDomain,
      job.serviceSpecialty,
      job.city,
      job.serviceArea,
    ]
      .filter(Boolean)
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
  );
}

export function findAuthorizedProfessionalJob(jobs, jobId) {
  const normalizedJobId = String(jobId || "").trim().toLowerCase();
  if (!UUID_PATTERN.test(normalizedJobId) || !Array.isArray(jobs)) return null;
  return jobs.find((job) => job?.jobId === normalizedJobId) || null;
}

export async function fetchAuthorizedProfessionalJobs({
  setPage,
  authFetchImpl = authFetch,
} = {}) {
  const { response, data } = await authFetchImpl(
    "/professional/jobs",
    { method: "GET", cache: "no-store" },
    setPage
  );
  if (!response.ok) {
    throw new ProfessionalJobPickerError({
      status: response.status,
      code: data?.code,
      message: data?.message,
    });
  }
  const jobs = normalizeAuthorizedProfessionalJobs(data);
  if (!jobs) {
    throw new ProfessionalJobPickerError({
      status: 502,
      code: "INVALID_PROFESSIONAL_JOBS_RESPONSE",
      message: "The server returned an invalid eligible Job list.",
    });
  }
  return jobs;
}

export function buildQuickQuoteEstimateInput({
  jobId,
  professionalInput,
  professionalCategoryCosts = [],
} = {}) {
  const normalizedJobId = String(jobId || "").trim().toLowerCase();
  const exactProfessionalInput =
    typeof professionalInput === "string" ? professionalInput : "";
  if (!UUID_PATTERN.test(normalizedJobId) || !exactProfessionalInput.trim()) {
    throw new TypeError(
      "A canonical Job and exact professional input are required."
    );
  }
  if (
    !Array.isArray(professionalCategoryCosts) ||
    professionalCategoryCosts.length > 2
  ) {
    throw new TypeError("Professional category costs are invalid.");
  }
  const normalizedCategoryCosts = professionalCategoryCosts.map((item) => {
    const classification = String(item?.classification || "").trim().toUpperCase();
    const totalCostMinor = Number(item?.totalCostMinor);
    if (
      !["MATERIAL", "LABOR"].includes(classification) ||
      !Number.isSafeInteger(totalCostMinor) ||
      totalCostMinor < 0 ||
      Object.keys(item || {}).sort().join(",") !==
        "classification,totalCostMinor"
    ) {
      throw new TypeError("Professional category costs are invalid.");
    }
    return { classification, totalCostMinor };
  });
  if (
    new Set(normalizedCategoryCosts.map((item) => item.classification)).size !==
    normalizedCategoryCosts.length
  ) {
    throw new TypeError("Professional category costs must be unique.");
  }
  return Object.freeze({
    jobId: normalizedJobId,
    intent: "PREPARE_QUOTE",
    professionalInstructions: exactProfessionalInput,
    measurements: [],
    costInputs: [],
    professionalCategoryCosts: normalizedCategoryCosts,
    sellingPriceMinor: null,
    retailerQuery: null,
  });
}
