import { ASSET_CATEGORY_IDS } from "./assetEngineRegistry.js";

export const ASSET_CENTER_STATUSES = Object.freeze({
  ACTIVE: "active",
  NEEDS_ATTENTION: "needs_attention",
  REPAIRED: "repaired",
  REPLACED: "replaced",
  RETIRED: "retired",
  UNKNOWN: "unknown",
});

const ASSET_STATUS_LABELS = Object.freeze({
  [ASSET_CENTER_STATUSES.ACTIVE]: "Active",
  [ASSET_CENTER_STATUSES.NEEDS_ATTENTION]: "Needs Attention",
  [ASSET_CENTER_STATUSES.REPAIRED]: "Repaired",
  [ASSET_CENTER_STATUSES.REPLACED]: "Replaced",
  [ASSET_CENTER_STATUSES.RETIRED]: "Retired",
  [ASSET_CENTER_STATUSES.UNKNOWN]: "Unknown",
});

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function deepFreeze(value) {
  if (!isRecord(value) && !Array.isArray(value)) return value;

  Object.freeze(value);
  Object.values(value).forEach((nestedValue) => {
    if (
      (isRecord(nestedValue) || Array.isArray(nestedValue)) &&
      !Object.isFrozen(nestedValue)
    ) {
      deepFreeze(nestedValue);
    }
  });

  return value;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      cloneValue(nestedValue),
    ])
  );
}

function normalizeRegistryKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toRegistryMap(definitions) {
  return deepFreeze(
    Object.fromEntries(definitions.map((definition) => [definition.id, definition]))
  );
}

export const ASSET_CENTER_FUTURE_CAPABILITIES = deepFreeze([
  "Warranty Tracking",
  "Permit Tracking",
  "Maintenance Plans",
  "Asset Intelligence",
]);

export const ASSET_CENTER_ACTIVITY_TYPES = deepFreeze([
  "Evaluation recorded",
  "Finding identified",
  "Recommendation created",
  "Service completed",
  "Completion report created",
]);

export const ASSET_CENTER_REGISTRY = toRegistryMap([
  {
    id: "asset_sarah_kitchen_sink_cabinet",
    customerId: "customer_sarah",
    customerName: "Sarah Johnson",
    propertyId: "property_sarah_123_main",
    propertyLabel: "123 Main Street",
    assetType: ASSET_CATEGORY_IDS.CABINET,
    assetName: "Kitchen Sink Cabinet",
    locationLabel: "Kitchen",
    status: ASSET_CENTER_STATUSES.REPLACED,
    sourceJobId: "job_sarah_cabinet_replacement",
    sourceEvaluationId: "evaluation_sarah_kitchen_cabinet",
    lastServiceLabel: "Cabinet Replacement",
    lastActivityAt: "2026-06-18",
    findings: [
      {
        id: "finding_sarah_water_damage",
        name: "Water Damage Present",
        date: "2026-06-18",
        sourceEvaluationId: "evaluation_sarah_kitchen_cabinet",
        relatedRecommendationId: "recommendation_sarah_cabinet_replacement",
      },
      {
        id: "finding_sarah_mold_present",
        name: "Mold Present",
        date: "2026-06-18",
        sourceEvaluationId: "evaluation_sarah_kitchen_cabinet",
        relatedRecommendationId: "recommendation_sarah_mold_remediation",
      },
      {
        id: "finding_sarah_cabinet_base_deteriorated",
        name: "Cabinet Base Deteriorated",
        date: "2026-06-18",
        sourceEvaluationId: "evaluation_sarah_kitchen_cabinet",
        relatedRecommendationId: "recommendation_sarah_cabinet_replacement",
      },
    ],
    recommendations: [
      {
        id: "recommendation_sarah_cabinet_replacement",
        serviceName: "Cabinet Replacement",
        reason: "Cabinet base deterioration and water damage.",
        sourceFindingId: "finding_sarah_cabinet_base_deteriorated",
        status: "completed",
      },
      {
        id: "recommendation_sarah_mold_remediation",
        serviceName: "Mold Remediation",
        reason: "Mold was identified during evaluation.",
        sourceFindingId: "finding_sarah_mold_present",
        status: "recommended",
      },
    ],
    completedServices: [
      {
        id: "service_sarah_cabinet_replacement",
        serviceName: "Cabinet Replacement",
        completionDate: "2026-06-18",
        status: "completed",
        sourceJobId: "job_sarah_cabinet_replacement",
      },
    ],
    documents: [
      { id: "doc_sarah_evaluation", name: "Evaluation Report", type: "evaluation_report", viewOnly: true },
      { id: "doc_sarah_quote", name: "Quote", type: "quote", viewOnly: true },
      { id: "doc_sarah_invoice", name: "Invoice", type: "invoice", viewOnly: true },
      { id: "doc_sarah_completion", name: "Completion Report", type: "completion_report", viewOnly: true },
    ],
    photos: [
      { id: "photo_sarah_evaluation", name: "Evaluation Photos", group: "evaluation", viewOnly: true },
      { id: "photo_sarah_before", name: "Before Photos", group: "before", viewOnly: true },
      { id: "photo_sarah_completion", name: "Completion Photos", group: "completion", viewOnly: true },
      { id: "photo_sarah_after", name: "After Photos", group: "after", viewOnly: true },
    ],
    timeline: [
      { id: "timeline_sarah_evaluation", label: "Evaluation recorded", date: "2026-06-18", sourceEvaluationId: "evaluation_sarah_kitchen_cabinet" },
      { id: "timeline_sarah_finding", label: "Finding identified", date: "2026-06-18", sourceFindingId: "finding_sarah_water_damage" },
      { id: "timeline_sarah_recommendation", label: "Recommendation created", date: "2026-06-18", sourceRecommendationId: "recommendation_sarah_cabinet_replacement" },
      { id: "timeline_sarah_proposal", label: "Proposal approved", date: "2026-06-18", sourceJobId: "job_sarah_cabinet_replacement" },
      { id: "timeline_sarah_service", label: "Service completed", date: "2026-06-18", sourceServiceId: "service_sarah_cabinet_replacement" },
      { id: "timeline_sarah_completion", label: "Completion report created", date: "2026-06-18", sourceJobId: "job_sarah_cabinet_replacement" },
      { id: "timeline_sarah_closure", label: "Closure completed", date: "2026-06-19", sourceJobId: "job_sarah_cabinet_replacement" },
    ],
  },
  {
    id: "asset_william_front_entry_door",
    customerId: "customer_william",
    customerName: "William",
    propertyId: "property_william_unit_204",
    propertyLabel: "Unit 204",
    assetType: ASSET_CATEGORY_IDS.DOOR,
    assetName: "Front Entry Door",
    locationLabel: "Front Entry",
    status: ASSET_CENTER_STATUSES.REPAIRED,
    sourceJobId: "job_william_door_repair",
    sourceEvaluationId: "evaluation_william_front_door",
    lastServiceLabel: "Door Repair",
    lastActivityAt: "2026-06-19",
    findings: [
      {
        id: "finding_william_frame_damage",
        name: "Frame Damage Present",
        date: "2026-06-19",
        sourceEvaluationId: "evaluation_william_front_door",
        relatedRecommendationId: "recommendation_william_door_repair",
      },
      {
        id: "finding_william_hardware_worn",
        name: "Hardware Worn",
        date: "2026-06-19",
        sourceEvaluationId: "evaluation_william_front_door",
        relatedRecommendationId: "recommendation_william_hardware_repair",
      },
    ],
    recommendations: [
      {
        id: "recommendation_william_door_repair",
        serviceName: "Door Repair",
        reason: "Frame damage affected door operation.",
        sourceFindingId: "finding_william_frame_damage",
        status: "completed",
      },
      {
        id: "recommendation_william_hardware_repair",
        serviceName: "Hardware Repair",
        reason: "Hardware wear was documented during evaluation.",
        sourceFindingId: "finding_william_hardware_worn",
        status: "completed",
      },
    ],
    completedServices: [
      {
        id: "service_william_door_repair",
        serviceName: "Door Repair",
        completionDate: "2026-06-19",
        status: "completed",
        sourceJobId: "job_william_door_repair",
      },
    ],
    documents: [
      { id: "doc_william_evaluation", name: "Evaluation Report", type: "evaluation_report", viewOnly: true },
      { id: "doc_william_quote", name: "Quote", type: "quote", viewOnly: true },
      { id: "doc_william_invoice", name: "Invoice", type: "invoice", viewOnly: true },
      { id: "doc_william_completion", name: "Completion Report", type: "completion_report", viewOnly: true },
      { id: "doc_william_permit", name: "Permit Report", type: "permit_report", viewOnly: true },
    ],
    photos: [
      { id: "photo_william_evaluation", name: "Evaluation Photos", group: "evaluation", viewOnly: true },
      { id: "photo_william_before", name: "Before Photos", group: "before", viewOnly: true },
      { id: "photo_william_completion", name: "Completion Photos", group: "completion", viewOnly: true },
      { id: "photo_william_after", name: "After Photos", group: "after", viewOnly: true },
    ],
    timeline: [
      { id: "timeline_william_evaluation", label: "Evaluation recorded", date: "2026-06-19", sourceEvaluationId: "evaluation_william_front_door" },
      { id: "timeline_william_finding", label: "Finding identified", date: "2026-06-19", sourceFindingId: "finding_william_frame_damage" },
      { id: "timeline_william_recommendation", label: "Recommendation created", date: "2026-06-19", sourceRecommendationId: "recommendation_william_door_repair" },
      { id: "timeline_william_proposal", label: "Proposal approved", date: "2026-06-19", sourceJobId: "job_william_door_repair" },
      { id: "timeline_william_service", label: "Service completed", date: "2026-06-19", sourceServiceId: "service_william_door_repair" },
      { id: "timeline_william_completion", label: "Completion report created", date: "2026-06-19", sourceJobId: "job_william_door_repair" },
    ],
  },
  {
    id: "asset_jack_hvac_system",
    customerId: "customer_jack_lindstrom",
    customerName: "Jack Lindstrom",
    propertyId: "property_jack_office",
    propertyLabel: "Jack Lindstrom Office",
    assetType: ASSET_CATEGORY_IDS.HVAC,
    assetName: "HVAC System",
    locationLabel: "Roof Access / Mechanical Area",
    status: ASSET_CENTER_STATUSES.NEEDS_ATTENTION,
    sourceJobId: "job_jack_hvac_evaluation",
    sourceEvaluationId: "evaluation_jack_hvac",
    lastServiceLabel: "HVAC Evaluation",
    lastActivityAt: "2026-06-19",
    findings: [
      {
        id: "finding_jack_hvac_noise",
        name: "Abnormal System Noise",
        date: "2026-06-19",
        sourceEvaluationId: "evaluation_jack_hvac",
        relatedRecommendationId: "recommendation_jack_hvac_service",
      },
      {
        id: "finding_jack_filter_restricted",
        name: "Filter Airflow Restricted",
        date: "2026-06-19",
        sourceEvaluationId: "evaluation_jack_hvac",
        relatedRecommendationId: "recommendation_jack_filter_service",
      },
    ],
    recommendations: [
      {
        id: "recommendation_jack_hvac_service",
        serviceName: "HVAC Service",
        reason: "System noise requires service review.",
        sourceFindingId: "finding_jack_hvac_noise",
        status: "recommended",
      },
      {
        id: "recommendation_jack_filter_service",
        serviceName: "Filter Replacement",
        reason: "Restricted airflow was documented.",
        sourceFindingId: "finding_jack_filter_restricted",
        status: "recommended",
      },
    ],
    completedServices: [
      {
        id: "service_jack_hvac_evaluation",
        serviceName: "HVAC Evaluation",
        completionDate: "2026-06-19",
        status: "completed",
        sourceJobId: "job_jack_hvac_evaluation",
      },
    ],
    documents: [
      { id: "doc_jack_evaluation", name: "Evaluation Report", type: "evaluation_report", viewOnly: true },
      { id: "doc_jack_quote", name: "Quote", type: "quote", viewOnly: true },
      { id: "doc_jack_completion", name: "Completion Report", type: "completion_report", viewOnly: true },
    ],
    photos: [
      { id: "photo_jack_evaluation", name: "Evaluation Photos", group: "evaluation", viewOnly: true },
      { id: "photo_jack_before", name: "Before Photos", group: "before", viewOnly: true },
      { id: "photo_jack_completion", name: "Completion Photos", group: "completion", viewOnly: true },
    ],
    timeline: [
      { id: "timeline_jack_evaluation", label: "Evaluation recorded", date: "2026-06-19", sourceEvaluationId: "evaluation_jack_hvac" },
      { id: "timeline_jack_finding", label: "Finding identified", date: "2026-06-19", sourceFindingId: "finding_jack_hvac_noise" },
      { id: "timeline_jack_recommendation", label: "Recommendation created", date: "2026-06-19", sourceRecommendationId: "recommendation_jack_hvac_service" },
      { id: "timeline_jack_service", label: "Service completed", date: "2026-06-19", sourceServiceId: "service_jack_hvac_evaluation" },
      { id: "timeline_jack_completion", label: "Completion report created", date: "2026-06-19", sourceJobId: "job_jack_hvac_evaluation" },
    ],
  },
]);

export function getAssetStatusLabel(status) {
  return ASSET_STATUS_LABELS[normalizeRegistryKey(status)] || ASSET_STATUS_LABELS.unknown;
}

export function sortAssetTimeline(timeline = []) {
  return [...timeline]
    .map(cloneValue)
    .sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
}

export function getAssetById(assetId) {
  const asset = ASSET_CENTER_REGISTRY[normalizeRegistryKey(assetId)];
  return asset ? cloneValue(asset) : null;
}

export function getAssetCenterAssets(filters = {}) {
  const customerId = normalizeRegistryKey(filters.customerId);
  const assetType = normalizeRegistryKey(filters.assetType);

  return Object.values(ASSET_CENTER_REGISTRY)
    .filter((asset) => !customerId || asset.customerId === customerId)
    .filter((asset) => !assetType || asset.assetType === assetType)
    .map(cloneValue);
}

export function getAssetsByCustomerId(customerId) {
  return getAssetCenterAssets({ customerId });
}

export function groupFindingsByAsset(assets = getAssetCenterAssets()) {
  return Object.fromEntries(
    assets.map((asset) => [
      asset.id,
      {
        assetId: asset.id,
        assetName: asset.assetName,
        customerId: asset.customerId,
        findings: cloneValue(asset.findings || []),
      },
    ])
  );
}

export function validateAssetLineage(asset = {}) {
  const errors = [];
  const findingIds = new Set((asset.findings || []).map((finding) => finding.id));
  const recommendationIds = new Set(
    (asset.recommendations || []).map((recommendation) => recommendation.id)
  );

  [
    "id",
    "customerId",
    "sourceJobId",
    "sourceEvaluationId",
    "assetType",
    "assetName",
  ].forEach((field) => {
    if (!asset[field]) errors.push({ field, message: "Asset lineage field is required." });
  });

  (asset.findings || []).forEach((finding) => {
    if (finding.sourceEvaluationId !== asset.sourceEvaluationId) {
      errors.push({
        field: "findings",
        message: `${finding.id} is not linked to this asset evaluation.`,
      });
    }
    if (
      finding.relatedRecommendationId &&
      !recommendationIds.has(finding.relatedRecommendationId)
    ) {
      errors.push({
        field: "findings",
        message: `${finding.id} references a missing recommendation.`,
      });
    }
  });

  (asset.recommendations || []).forEach((recommendation) => {
    if (recommendation.sourceFindingId && !findingIds.has(recommendation.sourceFindingId)) {
      errors.push({
        field: "recommendations",
        message: `${recommendation.id} references a missing finding.`,
      });
    }
  });

  (asset.completedServices || []).forEach((service) => {
    if (service.sourceJobId !== asset.sourceJobId) {
      errors.push({
        field: "completedServices",
        message: `${service.id} is not linked to this asset source job.`,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getRecentAssetActivity(assets = getAssetCenterAssets()) {
  return assets
    .flatMap((asset) =>
      sortAssetTimeline(asset.timeline || []).map((event) => ({
        ...event,
        assetId: asset.id,
        assetName: asset.assetName,
        customerId: asset.customerId,
        customerName: asset.customerName,
      }))
    )
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 8);
}

export function getAssetCenterModel() {
  const assets = getAssetCenterAssets();

  return {
    readOnly: true,
    purpose:
      "Asset Center shows what Meetro knows about assets because of past work.",
    assets,
    recentActivity: getRecentAssetActivity(assets),
    findingsByAsset: groupFindingsByAsset(assets),
    futureCapabilities: [...ASSET_CENTER_FUTURE_CAPABILITIES],
  };
}

export function getAssetCenterReport() {
  const assets = getAssetCenterAssets();

  return {
    readOnly: true,
    assetCount: assets.length,
    assets: assets.map((asset) => asset.id),
    customerIds: [...new Set(assets.map((asset) => asset.customerId))],
    validLineage: assets.every((asset) => validateAssetLineage(asset).valid),
    findingsCount: assets.reduce(
      (total, asset) => total + (asset.findings || []).length,
      0
    ),
    recommendationCount: assets.reduce(
      (total, asset) => total + (asset.recommendations || []).length,
      0
    ),
  };
}
