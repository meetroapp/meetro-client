export const ASSET_CATEGORY_IDS = Object.freeze({
  DOOR: "door",
  CABINET: "cabinet",
  WINDOW: "window",
  ROOF: "roof",
  HVAC: "hvac",
  APPLIANCE: "appliance",
  WATER_HEATER: "water_heater",
  ELECTRICAL_PANEL: "electrical_panel",
  FLOORING: "flooring",
  FENCE: "fence",
});

export const ASSET_SERVICE_IDS = Object.freeze({
  DOOR_REPLACEMENT: "door_replacement",
  CABINET_REPLACEMENT: "cabinet_replacement",
  WINDOW_REPLACEMENT: "window_replacement",
  ROOF_REPLACEMENT: "roof_replacement",
  HVAC_REPLACEMENT: "hvac_replacement",
  APPLIANCE_INSTALLATION: "appliance_installation",
  WATER_HEATER_REPLACEMENT: "water_heater_replacement",
  ELECTRICAL_PANEL_UPGRADE: "electrical_panel_upgrade",
  ELECTRICAL_REPAIR: "electrical_repair",
  FLOORING_INSTALLATION: "flooring_installation",
  TILE_INSTALLATION: "tile_installation",
  FENCE_REPAIR: "fence_repair",
});

const ASSET_ENGINE_MODEL = Object.freeze([
  "relationship",
  "request",
  "evaluation",
  "finding",
  "service",
  "asset",
  "proposal",
  "execution",
  "completion",
  "compliance",
  "closure",
  "history",
]);

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

function normalizeRegistryKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function toRegistryMap(definitions) {
  return deepFreeze(
    Object.fromEntries(definitions.map((definition) => [definition.id, definition]))
  );
}

function createIssue(code, message, field = "") {
  return { code, message, field };
}

function titleizeRegistryKey(value = "") {
  return String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const ASSET_CATEGORY_REGISTRY = toRegistryMap([
  {
    id: ASSET_CATEGORY_IDS.DOOR,
    label: "Door",
    description: "Exterior or interior door affected by a service.",
  },
  {
    id: ASSET_CATEGORY_IDS.CABINET,
    label: "Cabinet",
    description: "Cabinetry or cabinet components affected by a service.",
  },
  {
    id: ASSET_CATEGORY_IDS.WINDOW,
    label: "Window",
    description: "Window or window assembly affected by a service.",
  },
  {
    id: ASSET_CATEGORY_IDS.ROOF,
    label: "Roof",
    description: "Roof system or roof section affected by a service.",
  },
  {
    id: ASSET_CATEGORY_IDS.HVAC,
    label: "HVAC",
    description: "Heating, ventilation, or air conditioning equipment.",
  },
  {
    id: ASSET_CATEGORY_IDS.APPLIANCE,
    label: "Appliance",
    description: "Installed appliance affected by a service.",
  },
  {
    id: ASSET_CATEGORY_IDS.WATER_HEATER,
    label: "Water Heater",
    description: "Water heater equipment affected by a service.",
  },
  {
    id: ASSET_CATEGORY_IDS.ELECTRICAL_PANEL,
    label: "Electrical Panel",
    description: "Electrical panel or service equipment.",
  },
  {
    id: ASSET_CATEGORY_IDS.FLOORING,
    label: "Flooring",
    description: "Flooring surface or flooring system.",
  },
  {
    id: ASSET_CATEGORY_IDS.FENCE,
    label: "Fence",
    description: "Fence or fence section affected by a service.",
  },
]);

export const SERVICE_TO_ASSET_REGISTRY = toRegistryMap([
  {
    id: ASSET_SERVICE_IDS.DOOR_REPLACEMENT,
    serviceType: ASSET_SERVICE_IDS.DOOR_REPLACEMENT,
    assetCategory: ASSET_CATEGORY_IDS.DOOR,
  },
  {
    id: ASSET_SERVICE_IDS.CABINET_REPLACEMENT,
    serviceType: ASSET_SERVICE_IDS.CABINET_REPLACEMENT,
    assetCategory: ASSET_CATEGORY_IDS.CABINET,
  },
  {
    id: ASSET_SERVICE_IDS.WINDOW_REPLACEMENT,
    serviceType: ASSET_SERVICE_IDS.WINDOW_REPLACEMENT,
    assetCategory: ASSET_CATEGORY_IDS.WINDOW,
  },
  {
    id: ASSET_SERVICE_IDS.ROOF_REPLACEMENT,
    serviceType: ASSET_SERVICE_IDS.ROOF_REPLACEMENT,
    assetCategory: ASSET_CATEGORY_IDS.ROOF,
  },
  {
    id: ASSET_SERVICE_IDS.HVAC_REPLACEMENT,
    serviceType: ASSET_SERVICE_IDS.HVAC_REPLACEMENT,
    assetCategory: ASSET_CATEGORY_IDS.HVAC,
  },
  {
    id: ASSET_SERVICE_IDS.APPLIANCE_INSTALLATION,
    serviceType: ASSET_SERVICE_IDS.APPLIANCE_INSTALLATION,
    assetCategory: ASSET_CATEGORY_IDS.APPLIANCE,
  },
  {
    id: ASSET_SERVICE_IDS.WATER_HEATER_REPLACEMENT,
    serviceType: ASSET_SERVICE_IDS.WATER_HEATER_REPLACEMENT,
    assetCategory: ASSET_CATEGORY_IDS.WATER_HEATER,
  },
  {
    id: ASSET_SERVICE_IDS.ELECTRICAL_PANEL_UPGRADE,
    serviceType: ASSET_SERVICE_IDS.ELECTRICAL_PANEL_UPGRADE,
    assetCategory: ASSET_CATEGORY_IDS.ELECTRICAL_PANEL,
  },
  {
    id: ASSET_SERVICE_IDS.ELECTRICAL_REPAIR,
    serviceType: ASSET_SERVICE_IDS.ELECTRICAL_REPAIR,
    assetCategory: ASSET_CATEGORY_IDS.ELECTRICAL_PANEL,
  },
  {
    id: ASSET_SERVICE_IDS.FLOORING_INSTALLATION,
    serviceType: ASSET_SERVICE_IDS.FLOORING_INSTALLATION,
    assetCategory: ASSET_CATEGORY_IDS.FLOORING,
  },
  {
    id: ASSET_SERVICE_IDS.TILE_INSTALLATION,
    serviceType: ASSET_SERVICE_IDS.TILE_INSTALLATION,
    assetCategory: ASSET_CATEGORY_IDS.FLOORING,
  },
  {
    id: ASSET_SERVICE_IDS.FENCE_REPAIR,
    serviceType: ASSET_SERVICE_IDS.FENCE_REPAIR,
    assetCategory: ASSET_CATEGORY_IDS.FENCE,
  },
]);

export function getAssetCategories() {
  return Object.values(ASSET_CATEGORY_REGISTRY).map(cloneValue);
}

export function getAssetCategory(categoryId) {
  const category = ASSET_CATEGORY_REGISTRY[normalizeRegistryKey(categoryId)];
  return category ? cloneValue(category) : null;
}

export function getServiceAssetMapping(serviceType) {
  const serviceKey = normalizeRegistryKey(serviceType);
  const mapping = SERVICE_TO_ASSET_REGISTRY[serviceKey];
  return mapping ? cloneValue(mapping) : null;
}

export function getServiceAssetMappings(filters = {}) {
  const assetCategory = normalizeRegistryKey(filters.assetCategory);

  return Object.values(SERVICE_TO_ASSET_REGISTRY)
    .filter((mapping) => !assetCategory || mapping.assetCategory === assetCategory)
    .map(cloneValue);
}

export function resolveAssetCategoryForService(serviceType) {
  const serviceKey = normalizeRegistryKey(serviceType);
  const mapping = SERVICE_TO_ASSET_REGISTRY[serviceKey];

  if (!mapping) {
    return {
      found: false,
      serviceType: serviceKey,
      assetCategory: null,
      reason: "No asset category mapping is registered for this service.",
    };
  }

  return {
    found: true,
    serviceType: mapping.serviceType,
    assetCategory: mapping.assetCategory,
    mapping: cloneValue(mapping),
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getServiceKey(service = {}) {
  if (!isRecord(service)) return normalizeRegistryKey(service);

  return normalizeRegistryKey(
    service.sourceService ||
      service.serviceType ||
      service.serviceId ||
      service.id ||
      service.key ||
      service.title ||
      service.name
  );
}

function getFindingId(service = {}) {
  if (!isRecord(service)) return "";
  return service.sourceFindingId || service.findingId || service.findingType || "";
}

function getNestedValues(source = {}, paths = []) {
  return paths.flatMap((path) => {
    const value = path
      .split(".")
      .reduce((current, key) => (isRecord(current) ? current[key] : undefined), source);
    return asArray(value);
  });
}

function getRecommendedServices(jobRecord = {}) {
  return [
    ...asArray(jobRecord.serviceRecommendations),
    ...asArray(jobRecord.evaluation?.serviceRecommendations),
    ...asArray(jobRecord.history?.serviceRecommendations),
    ...asArray(jobRecord.history?.evaluation?.serviceRecommendations),
    ...asArray(jobRecord.schedule?.serviceRecommendations),
    ...asArray(jobRecord.schedule?.evaluation?.serviceRecommendations),
  ];
}

function getProposedServices(jobRecord = {}) {
  return [
    ...asArray(jobRecord.proposedServices),
    ...asArray(jobRecord.approvedServices),
    ...getNestedValues(jobRecord, [
      "proposal.services",
      "proposal.lineItems",
      "proposal.workItems",
      "quote.services",
      "quote.lineItems",
      "quote.workItems",
      "history.proposal.services",
      "history.proposal.lineItems",
      "history.quote.services",
      "history.quote.lineItems",
    ]),
  ];
}

function getCompletedServices(jobRecord = {}) {
  return [
    ...asArray(jobRecord.completedServices),
    ...getNestedValues(jobRecord, [
      "completion.completedServices",
      "completion.services",
      "completion.workItems",
      "history.completion.completedServices",
      "history.completion.services",
      "history.completion.workItems",
      "execution.completedServices",
      "execution.services",
      "schedule.completedServices",
      "schedule.workItems",
      "schedule.evaluation.workItems",
    ]),
  ];
}

function serviceSet(services = []) {
  return new Set(asArray(services).map(getServiceKey).filter(Boolean));
}

function hasApprovedStatus(record = {}) {
  const status = normalizeRegistryKey(
    record.status ||
      record.quoteStatus ||
      record.workflowStatus ||
      record.approvalStatus ||
      record.customerResponseStatus
  );
  return ["approved", "accepted", "customer_accepted", "quote_approved"].includes(status);
}

function hasCompletedStatus(record = {}) {
  const status = normalizeRegistryKey(record.status || record.workStatus || record.stage);
  return ["completed", "complete", "done", "closed"].includes(status);
}

function isClosedJob(jobRecord = {}) {
  const status = normalizeRegistryKey(
    jobRecord.status ||
      jobRecord.workflowStatus ||
      jobRecord.closureStatus ||
      jobRecord.history?.status ||
      jobRecord.history?.closureStatus ||
      jobRecord.schedule?.status ||
      jobRecord.schedule?.jobStage
  );
  return Boolean(
    ["closed", "history"].includes(status) ||
      jobRecord.closedAt ||
      jobRecord.closeDate ||
      jobRecord.history?.closedAt ||
      jobRecord.history?.closeDate ||
      jobRecord.schedule?.closedAt
  );
}

function isProposalApproved(jobRecord = {}) {
  return Boolean(
    hasApprovedStatus(jobRecord.proposal || {}) ||
      hasApprovedStatus(jobRecord.quote || {}) ||
      hasApprovedStatus(jobRecord.history?.proposal || {}) ||
      hasApprovedStatus(jobRecord.history?.quote || {}) ||
      jobRecord.proposalApproved === true ||
      jobRecord.approved === true
  );
}

function mergeServiceFacts(service = {}, jobRecord = {}) {
  const key = getServiceKey(service);
  const recommended = getRecommendedServices(jobRecord).find(
    (candidate) => getServiceKey(candidate) === key
  );
  const proposed = getProposedServices(jobRecord).find(
    (candidate) => getServiceKey(candidate) === key
  );
  const completed = getCompletedServices(jobRecord).find(
    (candidate) => getServiceKey(candidate) === key
  );

  return {
    ...(isRecord(recommended) ? recommended : {}),
    ...(isRecord(proposed) ? proposed : {}),
    ...(isRecord(completed) ? completed : {}),
    ...(isRecord(service) ? service : { serviceType: service }),
    serviceType: key,
  };
}

export function isServiceAssetEligible(service = {}, jobRecord = {}) {
  const serviceType = getServiceKey(service);
  const recommendedServices = serviceSet(getRecommendedServices(jobRecord));
  const proposedServices = serviceSet(getProposedServices(jobRecord));
  const completedServices = serviceSet(getCompletedServices(jobRecord));
  const resolution = resolveAssetCategoryForService(serviceType);
  const proposedService = getProposedServices(jobRecord).find(
    (candidate) => getServiceKey(candidate) === serviceType
  );
  const completedService = getCompletedServices(jobRecord).find(
    (candidate) => getServiceKey(candidate) === serviceType
  );

  const checks = {
    serviceMapped: resolution.found,
    recommended: recommendedServices.has(serviceType),
    proposed: proposedServices.has(serviceType),
    approved:
      isProposalApproved(jobRecord) ||
      service.approved === true ||
      hasApprovedStatus(service) ||
      hasApprovedStatus(proposedService || {}),
    completed:
      completedServices.has(serviceType) ||
      service.completed === true ||
      hasCompletedStatus(service) ||
      hasCompletedStatus(completedService || {}),
    closed: isClosedJob(jobRecord),
  };
  const missing = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  return {
    eligible: missing.length === 0,
    serviceType,
    assetCategory: resolution.assetCategory,
    checks,
    missing,
    reason:
      missing.length === 0
        ? "Service is asset eligible."
        : `Service is not asset eligible: ${missing.join(", ")}.`,
  };
}

export function getAssetEligibleServices(jobRecord = {}) {
  const recommendedServices = getRecommendedServices(jobRecord);
  const recommendedByService = new Map();

  recommendedServices.forEach((service) => {
    const key = getServiceKey(service);
    if (key && !recommendedByService.has(key)) {
      recommendedByService.set(key, service);
    }
  });

  return [...recommendedByService.values()]
    .map((service) => mergeServiceFacts(service, jobRecord))
    .filter((service) => isServiceAssetEligible(service, jobRecord).eligible)
    .map(cloneValue);
}

export function createAssetCandidatesFromClosedJob(jobRecord = {}) {
  const eligibleServices = getAssetEligibleServices(jobRecord);
  const customerId =
    jobRecord.customerId ||
    jobRecord.history?.customerId ||
    jobRecord.schedule?.customerId ||
    "";
  const jobId =
    jobRecord.jobId ||
    jobRecord.id ||
    jobRecord.history?.jobId ||
    jobRecord.schedule?.jobId ||
    jobRecord.requestId ||
    "";
  const sourceHistoryId = jobRecord.historyId || jobRecord.history?.id || "";
  const sourceEvaluationId =
    jobRecord.evaluationId ||
    jobRecord.evaluation?.id ||
    jobRecord.history?.evaluation?.id ||
    jobRecord.schedule?.evaluation?.id ||
    "";
  const sourceWorkflowId =
    jobRecord.sourceWorkflowId ||
    sourceHistoryId ||
    jobRecord.conversationId ||
    jobRecord.schedule?.scheduleId ||
    jobRecord.schedule?.id ||
    jobId;
  const installedDate =
    jobRecord.closedAt ||
    jobRecord.closeDate ||
    jobRecord.history?.closedAt ||
    jobRecord.history?.closeDate ||
    jobRecord.schedule?.closedAt ||
    "";
  const createdAssets = eligibleServices.map((service) =>
    createAssetRecord({
      sourceService: getServiceKey(service),
      name: service.assetName || service.name || service.title,
      customerId,
      jobId,
      sourceWorkflowId,
      installedDate,
      sourceFindingId: getFindingId(service),
      sourceEvaluationId,
      sourceHistoryId,
      metadata: {
        sourceFindingId: getFindingId(service),
        sourceEvaluationId,
        sourceHistoryId,
      },
    })
  );

  return {
    ok: createdAssets.every((result) => result.ok),
    assetCandidates: createdAssets
      .filter((result) => result.ok)
      .map((result) => result.asset),
    eligibleServices: eligibleServices.map(cloneValue),
    errors: createdAssets.flatMap((result) => result.errors),
  };
}

export function createAssetRecord(input = {}) {
  const source = isRecord(input) ? input : {};
  const sourceService = normalizeRegistryKey(
    source.sourceService || source.serviceType || source.service
  );
  const resolution = resolveAssetCategoryForService(sourceService);

  if (!resolution.found) {
    return {
      ok: false,
      asset: null,
      errors: [
        createIssue(
          "unknown-asset-service",
          "Service is not registered in the Asset Engine service-to-asset mapping.",
          "sourceService"
        ),
      ],
    };
  }

  const category = getAssetCategory(resolution.assetCategory);
  const customerId = source.customerId || "";
  const jobId = source.jobId || source.sourceWorkflowId || source.requestId || "";
  const sourceWorkflowId = source.sourceWorkflowId || jobId;
  const assetId =
    source.assetId ||
    `asset_${[customerId, jobId, sourceService, resolution.assetCategory]
      .map(normalizeRegistryKey)
      .filter(Boolean)
      .join("_")}`;

  return {
    ok: true,
    asset: {
      assetId,
      category: resolution.assetCategory,
      categoryLabel: category?.label || titleizeRegistryKey(resolution.assetCategory),
      name:
        source.name ||
        `${category?.label || titleizeRegistryKey(resolution.assetCategory)}`,
      sourceService,
      customerId,
      jobId,
      sourceWorkflowId,
      ...(source.sourceFindingId ? { sourceFindingId: source.sourceFindingId } : {}),
      ...(source.sourceEvaluationId
        ? { sourceEvaluationId: source.sourceEvaluationId }
        : {}),
      ...(source.sourceHistoryId ? { sourceHistoryId: source.sourceHistoryId } : {}),
      installedDate: source.installedDate || source.completedAt || "",
      createdAt: source.createdAt || new Date().toISOString(),
      metadata: isRecord(source.metadata) ? cloneValue(source.metadata) : {},
    },
    errors: [],
  };
}

export function createAssetRecordsFromServices(input = {}) {
  const source = isRecord(input) ? input : {};
  const services = Array.isArray(source.services) ? source.services : [];
  const createdAssets = services.map((service, index) => {
    const serviceRecord = isRecord(service) ? service : { serviceType: service };
    return createAssetRecord({
      ...serviceRecord,
      customerId: serviceRecord.customerId || source.customerId || "",
      jobId: serviceRecord.jobId || source.jobId || "",
      sourceWorkflowId:
        serviceRecord.sourceWorkflowId || source.sourceWorkflowId || source.jobId || "",
      installedDate: serviceRecord.installedDate || source.installedDate || "",
      assetId: serviceRecord.assetId || source.assetIds?.[index],
    });
  });

  return {
    ok: createdAssets.every((result) => result.ok),
    assets: createdAssets.filter((result) => result.ok).map((result) => result.asset),
    errors: createdAssets.flatMap((result) => result.errors),
  };
}

export function getAssetsForCustomer(assets = [], customerId = "") {
  const normalizedCustomerId = String(customerId || "");
  return (Array.isArray(assets) ? assets : [])
    .filter((asset) => asset.customerId === normalizedCustomerId)
    .map(cloneValue);
}

export function validateAssetScope(assets = []) {
  const records = Array.isArray(assets) ? assets : [];
  const errors = [];

  records.forEach((asset, index) => {
    if (!hasValue(asset.customerId)) {
      errors.push(
        createIssue(
          "missing-asset-customer",
          "Asset must retain customer scope.",
          `assets.${index}.customerId`
        )
      );
    }

    if (!hasValue(asset.jobId) && !hasValue(asset.sourceWorkflowId)) {
      errors.push(
        createIssue(
          "missing-asset-source-workflow",
          "Asset must retain job or source workflow scope.",
          `assets.${index}.jobId`
        )
      );
    }

    if (!hasValue(asset.sourceService)) {
      errors.push(
        createIssue(
          "missing-asset-source-service",
          "Asset must retain source service scope.",
          `assets.${index}.sourceService`
        )
      );
    }

    if (!ASSET_CATEGORY_REGISTRY[normalizeRegistryKey(asset.category)]) {
      errors.push(
        createIssue(
          "unknown-asset-category",
          "Asset category is not registered.",
          `assets.${index}.category`
        )
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getAssetEngineReport() {
  return {
    model: [...ASSET_ENGINE_MODEL],
    assetCategories: Object.values(ASSET_CATEGORY_IDS),
    assetCategoryCount: Object.keys(ASSET_CATEGORY_REGISTRY).length,
    serviceToAssetMappingCount: Object.keys(SERVICE_TO_ASSET_REGISTRY).length,
  };
}
