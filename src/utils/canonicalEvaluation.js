import {
  CANONICAL_COMMERCIAL_AUTHORITY_SOURCE,
  CANONICAL_COMMERCIAL_OWNING_ENGINE,
  validateCanonicalCommercialAuthorityProjection,
} from "./canonicalCommercialAuthority.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTENT_KEYS = Object.freeze([
  "serviceType",
  "evaluationContext",
  "templateKey",
  "observations",
  "measurements",
  "findings",
  "diagnosisSummary",
  "limitations",
  "scopeRecommendations",
  "relevantConditions",
  "supportingMediaReferences",
  "internalNotes",
]);

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function canonicalUuid(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return UUID_PATTERN.test(normalized) ? normalized : "";
}

function canonicalTimestamp(value, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function boundedText(value, maximum, { nullable = false } = {}) {
  if (nullable && value == null) return null;
  if (typeof value !== "string" || value.length > maximum) return null;
  return value;
}

function normalizeMeasurements(value) {
  if (!Array.isArray(value) || value.length > 50) return null;
  const allowed = new Set(["label", "value", "unit", "notes"]);
  const output = [];
  for (const item of value) {
    if (!isPlainObject(item) || Object.keys(item).some((key) => !allowed.has(key))) {
      return null;
    }
    const label = boundedText(item.label, 200);
    const measuredValue = boundedText(item.value, 200);
    const unit = boundedText(item.unit, 80, { nullable: true });
    const notes = boundedText(item.notes, 500);
    if (!label || !measuredValue || unit === null && item.unit != null || notes == null) {
      return null;
    }
    output.push({ label, value: measuredValue, unit, notes });
  }
  return output;
}

function normalizeFindings(value) {
  if (!Array.isArray(value) || value.length > 50) return null;
  const allowed = new Set(["summary", "severity", "customerShareable"]);
  const severities = new Set(["informational", "low", "moderate", "high", "critical"]);
  const output = [];
  for (const item of value) {
    if (!isPlainObject(item) || Object.keys(item).some((key) => !allowed.has(key))) {
      return null;
    }
    const summary = boundedText(item.summary, 1000);
    const severity = boundedText(item.severity, 40);
    if (!summary || !severities.has(severity) || typeof item.customerShareable !== "boolean") {
      return null;
    }
    output.push({ summary, severity, customerShareable: item.customerShareable });
  }
  return output;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value) || value.length > 50) return null;
  const output = value.map((item) => boundedText(item, 1000));
  return output.some((item) => !item) ? null : output;
}

function normalizeContent(value) {
  if (
    !isPlainObject(value) ||
    Object.keys(value).length !== CONTENT_KEYS.length ||
    Object.keys(value).some((key) => !CONTENT_KEYS.includes(key))
  ) return null;

  const serviceType = boundedText(value.serviceType, 120, { nullable: true });
  const evaluationContext = boundedText(value.evaluationContext, 120, { nullable: true });
  const templateKey = boundedText(value.templateKey, 160, { nullable: true });
  const observations = boundedText(value.observations, 5000);
  const measurements = normalizeMeasurements(value.measurements);
  const findings = normalizeFindings(value.findings);
  const diagnosisSummary = boundedText(value.diagnosisSummary, 5000);
  const limitations = boundedText(value.limitations, 5000);
  const scopeRecommendations = normalizeStringArray(value.scopeRecommendations);
  const relevantConditions = normalizeStringArray(value.relevantConditions);
  const internalNotes = boundedText(value.internalNotes, 5000);
  if (
    serviceType === null && value.serviceType != null ||
    evaluationContext === null && value.evaluationContext != null ||
    templateKey === null && value.templateKey != null ||
    observations == null ||
    !measurements ||
    !findings ||
    diagnosisSummary == null ||
    limitations == null ||
    !scopeRecommendations ||
    !relevantConditions ||
    internalNotes == null ||
    !Array.isArray(value.supportingMediaReferences) ||
    value.supportingMediaReferences.length > 0
  ) return null;

  return {
    serviceType,
    evaluationContext,
    templateKey,
    observations,
    measurements,
    findings,
    diagnosisSummary,
    limitations,
    scopeRecommendations,
    relevantConditions,
    supportingMediaReferences: [],
    internalNotes,
  };
}

export function validateCanonicalEvaluationProjection(value) {
  const authority = validateCanonicalCommercialAuthorityProjection(value);
  if (!authority.ok || authority.value.aggregate.type !== "evaluation") return null;
  if (!isPlainObject(value.evaluation)) return null;

  const evaluation = value.evaluation;
  const id = canonicalUuid(evaluation.id);
  const createdAt = canonicalTimestamp(evaluation.createdAt);
  const updatedAt = canonicalTimestamp(evaluation.updatedAt);
  const completedAt = canonicalTimestamp(evaluation.completedAt, { nullable: true });
  const content = normalizeContent(evaluation.content);
  const capabilities = evaluation.capabilities;
  const traceability = evaluation.traceability;
  const expectedCapabilityKeys = [
    "canEditDraft",
    "canComplete",
    "canRevise",
    "canShareWithCustomer",
    "quoteReady",
    "authorizationAvailable",
    "startWorkAvailable",
  ];
  if (
    !id ||
    id !== authority.value.aggregate.id ||
    !["draft", "completed"].includes(evaluation.status) ||
    !createdAt ||
    !updatedAt ||
    (evaluation.completedAt != null && !completedAt) ||
    (evaluation.status === "draft" && completedAt != null) ||
    (evaluation.status === "completed" && !completedAt) ||
    !content ||
    !isPlainObject(capabilities) ||
    Object.keys(capabilities).length !== expectedCapabilityKeys.length ||
    expectedCapabilityKeys.some((key) => typeof capabilities[key] !== "boolean") ||
    capabilities.canRevise ||
    capabilities.canShareWithCustomer ||
    capabilities.quoteReady ||
    capabilities.authorizationAvailable ||
    capabilities.startWorkAvailable ||
    !isPlainObject(traceability) ||
    traceability.governingCharterId !== "MC-WORKFLOW-001C" ||
    traceability.governingProgramId !== "MC-WORKFLOW-001D" ||
    traceability.foundationMilestoneId !== "MC-WORKFLOW-002A" ||
    traceability.capabilityMilestoneId !== "MC-WORKFLOW-002B" ||
    traceability.certificationTarget !== "MC-WORKFLOW-002R"
  ) return null;

  return {
    authoritySource: CANONICAL_COMMERCIAL_AUTHORITY_SOURCE,
    confirmed: true,
    aggregate: authority.value.aggregate,
    evaluation: {
      id,
      status: evaluation.status,
      createdAt,
      updatedAt,
      completedAt,
      content,
      capabilities: { ...capabilities },
      traceability: { ...traceability },
    },
  };
}

export function getCanonicalEvaluationSourceContext(record = {}) {
  if (!isPlainObject(record)) return null;
  const schedule = isPlainObject(record.schedule) ? record.schedule : {};
  const emergencyRequestId = positiveInteger(
    record.emergencyRequestId ?? schedule.emergencyRequestId
  );
  const relationshipId = positiveInteger(
    record.relationshipId ?? schedule.relationshipId
  );
  if (!emergencyRequestId) return null;
  return {
    type: "emergency_request",
    emergencyRequestId,
    relationshipId,
  };
}

export function buildCanonicalEvaluationRoute(emergencyRequestId) {
  const normalized = positiveInteger(emergencyRequestId);
  return normalized
    ? `workCenter?panel=evaluation&emergencyRequestId=${normalized}`
    : null;
}

export function parseCanonicalEvaluationRoute(route = "") {
  const normalized = String(route || "").replace(/^#/, "");
  const [page, query = ""] = normalized.split("?");
  if (!['workCenter', 'contractorDashboard'].includes(page)) return null;
  const params = new URLSearchParams(query);
  if (params.get("panel") !== "evaluation") return null;
  const emergencyRequestId = positiveInteger(params.get("emergencyRequestId"));
  return emergencyRequestId
    ? { emergencyRequestId, relationshipId: null }
    : null;
}

function normalizedWorkItems(form) {
  return Array.isArray(form?.workItems) ? form.workItems : [];
}

export function buildCanonicalEvaluationContent(form = {}) {
  const workItems = normalizedWorkItems(form);
  const measurements = [];
  const recommendations = [];
  const conditions = [];
  for (const workItem of workItems) {
    const title = String(workItem?.title || "").trim();
    if (title) recommendations.push(title.slice(0, 1000));
    for (const measurement of Array.isArray(workItem?.measurements) ? workItem.measurements : []) {
      const label = String(measurement?.label || "").trim();
      const feet = String(measurement?.feet || "").trim();
      const inches = String(measurement?.inches || "").trim();
      const rawValue = measurement?.unit === "feet_inches"
        ? [feet && `${feet} ft`, inches && `${inches} in`].filter(Boolean).join(" ")
        : String(measurement?.value || "").trim();
      if (!label || !rawValue) continue;
      measurements.push({
        label: label.slice(0, 200),
        value: rawValue.slice(0, 200),
        unit: measurement?.unit === "feet_inches"
          ? null
          : String(measurement?.unit || "").trim().slice(0, 80) || null,
        notes: String(measurement?.quantity || "").trim().slice(0, 500),
      });
    }
    const safety = String(workItem?.safetyNotes || "").trim();
    if (safety) conditions.push(safety.slice(0, 1000));
  }

  const findingRecords = Array.isArray(form.findingRecords) ? form.findingRecords : [];
  const findings = findingRecords
    .map((finding) => ({
      summary: String(finding?.summary || finding?.finding || finding?.title || "").trim().slice(0, 1000),
      severity: ["informational", "low", "moderate", "high", "critical"].includes(finding?.severity)
        ? finding.severity
        : "informational",
      customerShareable: finding?.customerShareable === true,
    }))
    .filter((finding) => finding.summary);
  const findingNotes = String(form.findings || "").trim();
  if (findings.length === 0 && findingNotes) {
    findings.push({
      summary: findingNotes.slice(0, 1000),
      severity: "informational",
      customerShareable: false,
    });
  }
  const safetyNotes = String(form.safetyNotes || "").trim();
  if (safetyNotes) conditions.push(safetyNotes.slice(0, 1000));

  const internalNotes = [
    form.materialsNeeded && `Materials: ${form.materialsNeeded}`,
    form.laborNotes && `Labor: ${form.laborNotes}`,
    form.photoNotes && `Media notes: ${form.photoNotes}`,
  ].filter(Boolean).join("\n").slice(0, 5000);

  return {
    serviceType: String(form.serviceType || "").trim().slice(0, 120) || null,
    evaluationContext: String(form.context || "").trim().slice(0, 120) || null,
    templateKey: String(form.evaluationTemplate || "").trim().slice(0, 160) || null,
    observations: String(form.notes || "").trim().slice(0, 5000),
    measurements: measurements.slice(0, 50),
    findings: findings.slice(0, 50),
    diagnosisSummary: findingNotes.slice(0, 5000),
    limitations: "",
    scopeRecommendations: recommendations.slice(0, 50),
    relevantConditions: conditions.slice(0, 50),
    supportingMediaReferences: [],
    internalNotes,
  };
}

export function canonicalEvaluationContentToForm(evaluation, fallback = {}) {
  const canonical = validateCanonicalEvaluationProjection(evaluation);
  if (!canonical) return null;
  const content = canonical.evaluation.content;
  return {
    ...fallback,
    serviceType: content.serviceType || "",
    context: content.evaluationContext || "",
    evaluationTemplate: content.templateKey,
    notes: content.observations,
    findings: content.diagnosisSummary,
    findingRecords: content.findings.map((finding) => ({ ...finding })),
    safetyNotes: content.relevantConditions.join("\n"),
    workItems: content.scopeRecommendations.map((title, index) => ({
      id: `presentation-${index + 1}`,
      title,
      photos: [],
      measurements: content.measurements.map((measurement, measurementIndex) => ({
        id: `presentation-${index + 1}-${measurementIndex + 1}`,
        ...measurement,
        quantity: measurement.notes || "",
      })),
      materials: [],
      safetyNotes: "",
    })),
    materialsNeeded: "",
    laborNotes: "",
    photoNotes: "",
    photos: [],
    nextStep: "quote",
  };
}

export const CANONICAL_EVALUATION_OWNING_ENGINE =
  CANONICAL_COMMERCIAL_OWNING_ENGINE;
