export const WORK_CENTER_LIFECYCLE = Object.freeze([
  "Evaluation",
  "Quote & Approval",
  "Work Plan",
  "Start Work",
  "Work In Progress",
  "Complete Work",
  "Invoice & Closeout",
  "History",
]);

export const WORK_LEVEL_AUTHORITY_GAPS = Object.freeze([
  "WORK_LEVEL_START_AUTHORITY_GAP",
  "WORK_LEVEL_COMPLETION_AUTHORITY_GAP",
]);

const clean = (value) => typeof value === "string" ? value.trim() : "";
const list = (value) => Array.isArray(value) ? value : [];

function measurementText(measurement) {
  if (typeof measurement === "string") return clean(measurement);
  if (!measurement || typeof measurement !== "object") return "";
  const label = clean(measurement.label || measurement.name || measurement.dimension);
  const value = measurement.value ?? measurement.amount;
  const unit = clean(measurement.unit);
  return [label && `${label}:`, value, unit].filter((part) => part !== "" && part != null).join(" ");
}

export function buildEvaluationTruthProjection({ evaluation, structuredFindings = [] } = {}) {
  const content = evaluation?.evaluation?.content || evaluation?.content || {};
  const observations = clean(content.observations);
  const assessmentSummary = clean(content.diagnosisSummary);
  const narrativeFindings = clean(content.findings);
  const limitations = clean(content.limitations);
  const scopeRecommendations = clean(content.scopeRecommendations);
  const internalNotes = clean(content.internalNotes);
  const measurements = list(content.measurements).map(measurementText).filter(Boolean);
  const photoReferences = list(content.supportingMediaReferences).filter(Boolean);
  const findings = list(structuredFindings).map((finding) => ({
    id: finding?.id || null,
    statement: clean(finding?.statement),
    confirmationState: finding?.confirmationState || null,
  })).filter((finding) => finding.statement);
  const narrative = [observations, assessmentSummary, narrativeFindings, limitations]
    .find(Boolean) || "";
  return Object.freeze({
    hasEvaluationInformation: Boolean(
      narrative || scopeRecommendations || internalNotes || measurements.length || photoReferences.length
    ),
    hasStructuredFindings: findings.length > 0,
    observations,
    assessmentSummary,
    narrativeFindings,
    limitations,
    scopeRecommendations,
    internalNotes,
    measurements,
    photoReferences,
    structuredFindings: findings,
    narrativeReference: narrative,
  });
}

export function buildEvaluationAssistantProfessionalInput({
  evaluation,
  structuredFindings = [],
  recommendations = [],
  approvedQuote = null,
  preparation = null,
  workPlan = null,
  prompt = "",
  selectedPhotoSummary = "",
} = {}) {
  const truth = buildEvaluationTruthProjection({ evaluation, structuredFindings });
  const recommendationText = list(recommendations)
    .map((item) => clean(item?.statement || item?.description || item))
    .filter(Boolean);
  const notes = [
    truth.assessmentSummary && `Assessment summary: ${truth.assessmentSummary}`,
    truth.narrativeFindings && `Evaluation findings: ${truth.narrativeFindings}`,
    ...truth.structuredFindings.map((item, index) => `Structured finding ${index + 1}: ${item.statement}`),
    ...recommendationText.map((item, index) => `Recommendation ${index + 1}: ${item}`),
    truth.scopeRecommendations && `Scope / material recommendations: ${truth.scopeRecommendations}`,
    truth.limitations && `Limitations: ${truth.limitations}`,
    truth.internalNotes && `Internal evaluation notes: ${truth.internalNotes}`,
    ...list(approvedQuote?.scopeItems)
      .filter((item) => item?.includedInTotal === true)
      .map((item, index) => `Approved scope ${index + 1}: ${clean(item.description)}`)
      .filter((item) => !item.endsWith(": ")),
    ...list(preparation?.items)
      .map((item, index) => `Preparation item ${index + 1}: ${clean(item.description)} (${item.acquisitionState || "state unavailable"})`)
      .filter((item) => !item.includes(":  (")),
    ...list(workPlan?.workstreams).map((workstream, index) =>
      `Work state ${index + 1}: ${clean(workstream.title)} — ${workstream.status || workstream.state || "unavailable"}`
    ).filter((item) => !item.includes(":  —")),
    clean(selectedPhotoSummary) && `Selected photos: ${clean(selectedPhotoSummary)}`,
    clean(prompt) && `Professional request: ${clean(prompt)}`,
  ].filter(Boolean);
  return Object.freeze({
    observations: truth.observations || null,
    measurements: truth.measurements,
    notes: notes.join("\n") || null,
  });
}

export function selectApprovedQuote(quotes, preferredQuoteId = "") {
  const approved = list(quotes).filter(
    (quote) => quote?.status === "ISSUED" && quote?.decisionState === "APPROVED"
  );
  return approved.find((quote) => quote.id === preferredQuoteId) || approved[0] || null;
}

export function buildApprovedWorkProjection(quote) {
  if (!quote || quote.status !== "ISSUED" || quote.decisionState !== "APPROVED") return null;
  return Object.freeze({
    quoteId: quote.id,
    approvedVersion: quote.decisionVersion || quote.currentVersion,
    decidedAt: quote.decidedAt || null,
    scope: Object.freeze(list(quote.scopeItems)
      .filter((item) => item?.includedInTotal === true)
      .sort((left, right) => Number(left.sequence) - Number(right.sequence))
      .map((item) => Object.freeze({
        scopeItemId: item.scopeItemId,
        scopeItemRevision: item.scopeItemRevision,
        sequence: item.sequence,
        description: item.description,
        quantity: item.quantity,
        classification: item.classification,
        scopeSemantic: item.scopeSemantic,
        materialResponsibility: item.materialResponsibility,
        source: item.source,
      }))),
  });
}

export function deriveWorkExecutionMode({ plan, liveJob } = {}) {
  const workstreams = list(plan?.workstreams);
  const activities = workstreams.flatMap((workstream) => list(workstream.activities));
  const canonicalComplete = liveJob?.stage?.code === "JOB_COMPLETED" ||
    (workstreams.length > 0 && workstreams.every((workstream) =>
      ["DONE", "COMPLETED", "CLOSED"].includes(workstream.state) ||
      ["DONE", "COMPLETED"].includes(workstream.status)
    ));
  if (canonicalComplete) return "COMPLETED";
  const started = activities.some((activity) => ["IN_PROGRESS", "DONE", "COMPLETED"].includes(activity.status)) ||
    ["WORK_IN_PROGRESS", "WORK_STARTED"].includes(liveJob?.stage?.code);
  return started ? "IN_PROGRESS" : "PRE_WORK";
}

export function buildReadinessProjection({ approvedWork, preparation, schedule } = {}) {
  const preparationPlan = preparation?.exists === false ? null : preparation;
  const scheduleVisits = list(schedule?.visits || schedule);
  const scheduled = scheduleVisits.some((visit) => ["SCHEDULED", "STARTED", "COMPLETED"].includes(visit?.state));
  const depositState = preparationPlan?.deposit?.state || "UNAVAILABLE";
  const depositSatisfied = ["SATISFIED", "NOT_REQUIRED"].includes(depositState);
  const preparationReady = Boolean(preparationPlan) && preparationPlan.readiness?.workStartBlocked === false &&
    ["PLANNED", "READY"].includes(preparationPlan.readiness?.planningState);
  return Object.freeze({
    approvedScope: Boolean(approvedWork?.scope?.length),
    depositState,
    depositSatisfied,
    preparationReady,
    scheduled,
    readyToStart: Boolean(approvedWork?.scope?.length) && depositSatisfied && preparationReady && scheduled,
    label: Boolean(approvedWork?.scope?.length) && depositSatisfied && preparationReady && scheduled
      ? "Ready to Start"
      : "Not Ready Yet",
  });
}

function materialItemProjection(item) {
  return Object.freeze({
    id: item.id,
    description: clean(item.description),
    quantity: item.quantity,
    unit: clean(item.unit),
    acquisitionState: item.acquisitionState || null,
    preparationState: item.preparationState || null,
    readyForWorkStart: item.readyForWorkStart === true,
    requiredForWorkStart: item.requiredForWorkStart === true,
  });
}

function preparationSummaryLabel(state) {
  if (state === "READY") return "Ready";
  if (state === "IN_PROGRESS") return "In progress";
  if (state === "BLOCKED") return "Needs attention";
  return "Not started";
}

function itemCountLabel(items, emptyLabel) {
  if (items.length === 0) return emptyLabel;
  const ready = items.filter((item) => item.readyForWorkStart).length;
  if (ready === items.length) return `${items.length} ${items.length === 1 ? "item" : "items"} ready`;
  return `${ready} of ${items.length} ready`;
}

export function buildMaterialPreparationProjection(preparation) {
  const plan = preparation?.exists === false ? null : preparation;
  const items = list(plan?.items);
  const businessMaterials = items
    .filter((item) => item?.kind === "MATERIAL" && item?.providerResponsibility === "BUSINESS")
    .map(materialItemProjection);
  const customerSupplies = items
    .filter((item) => item?.kind === "MATERIAL" && item?.providerResponsibility === "CUSTOMER")
    .map(materialItemProjection);
  const preparationItems = items
    .filter((item) => item?.kind && item.kind !== "MATERIAL")
    .map(materialItemProjection);

  return Object.freeze({
    exists: Boolean(plan),
    businessMaterials: Object.freeze(businessMaterials),
    customerSupplies: Object.freeze(customerSupplies),
    preparationItems: Object.freeze(preparationItems),
    materialsSummary: plan ? itemCountLabel(businessMaterials, "No materials listed") : "Unavailable",
    customerSuppliesSummary: plan ? itemCountLabel(customerSupplies, "None required") : "Unavailable",
    preparationSummary: plan
      ? preparationSummaryLabel(plan.readiness?.preparationState)
      : "Unavailable",
  });
}

export function buildExecutionSafeViewModel({ approvedWork, plan, preparation, schedule, liveJob } = {}) {
  const mode = deriveWorkExecutionMode({ plan, liveJob });
  return Object.freeze({
    mode,
    approvedScope: list(approvedWork?.scope).map((item) => ({
      id: item.scopeItemId,
      sequence: item.sequence,
      description: item.description,
      quantity: item.quantity,
    })),
    preparation: preparation?.exists === false ? null : {
      planningState: preparation?.readiness?.planningState || null,
      acquisitionState: preparation?.readiness?.acquisitionState || null,
      preparationState: preparation?.readiness?.preparationState || null,
      workStartBlocked: preparation?.readiness?.workStartBlocked ?? null,
    },
    schedule: list(schedule?.visits || schedule).map((visit) => ({
      id: visit.id,
      state: visit.state,
      scheduledStartAt: visit.scheduledStartAt || null,
      scheduledEndAt: visit.scheduledEndAt || null,
    })),
    progress: list(plan?.workstreams).map((workstream) => ({
      id: workstream.id,
      title: workstream.title,
      state: workstream.state,
      status: workstream.status,
      activities: list(workstream.activities).map((activity) => ({
        id: activity.id,
        statement: activity.statement,
        status: activity.status,
        updatedAt: activity.updatedAt,
      })),
    })),
    authorityGaps: WORK_LEVEL_AUTHORITY_GAPS,
  });
}
