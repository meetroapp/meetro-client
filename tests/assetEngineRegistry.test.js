import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSET_CATEGORY_IDS,
  ASSET_CATEGORY_REGISTRY,
  ASSET_SERVICE_IDS,
  createAssetCandidatesFromClosedJob,
  createAssetRecord,
  createAssetRecordsFromServices,
  getAssetCategories,
  getAssetCategory,
  getAssetEngineReport,
  getAssetEligibleServices,
  getAssetsForCustomer,
  getServiceAssetMapping,
  getServiceAssetMappings,
  isServiceAssetEligible,
  resolveAssetCategoryForService,
  SERVICE_TO_ASSET_REGISTRY,
  validateAssetScope,
} from "../src/utils/assetEngineRegistry.js";

test("exports the MVP Asset Category registry", () => {
  assert.deepEqual(Object.values(ASSET_CATEGORY_IDS), [
    "door",
    "cabinet",
    "window",
    "roof",
    "hvac",
    "appliance",
    "water_heater",
    "electrical_panel",
    "flooring",
    "fence",
  ]);

  assert.deepEqual(
    getAssetCategories().map((category) => category.id),
    Object.values(ASSET_CATEGORY_IDS)
  );
});

test("maps services to expected asset categories", () => {
  assert.equal(
    resolveAssetCategoryForService(ASSET_SERVICE_IDS.DOOR_REPLACEMENT)
      .assetCategory,
    ASSET_CATEGORY_IDS.DOOR
  );
  assert.equal(
    getServiceAssetMapping("cabinet_replacement").assetCategory,
    ASSET_CATEGORY_IDS.CABINET
  );
  assert.deepEqual(
    getServiceAssetMappings({ assetCategory: "fence" }).map(
      (mapping) => mapping.serviceType
    ),
    [ASSET_SERVICE_IDS.FENCE_REPAIR]
  );
});

test("creates an Asset Record from a mapped service", () => {
  const result = createAssetRecord({
    assetId: "asset_front_entry_door",
    sourceService: "door_replacement",
    name: "Front Entry Door",
    customerId: "customer-sarah",
    jobId: "job-sarah-door",
    installedDate: "2026-06-19",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.asset, {
    assetId: "asset_front_entry_door",
    category: "door",
    categoryLabel: "Door",
    name: "Front Entry Door",
    sourceService: "door_replacement",
    customerId: "customer-sarah",
    jobId: "job-sarah-door",
    sourceWorkflowId: "job-sarah-door",
    installedDate: "2026-06-19",
    createdAt: result.asset.createdAt,
    metadata: {},
  });
  assert.equal(validateAssetScope([result.asset]).valid, true);
});

test("creates multiple assets for one customer", () => {
  const result = createAssetRecordsFromServices({
    customerId: "customer-sarah",
    jobId: "job-sarah-remodel",
    installedDate: "2026-06-19",
    services: [
      {
        serviceType: ASSET_SERVICE_IDS.CABINET_REPLACEMENT,
        name: "Sink Cabinet",
      },
      {
        serviceType: ASSET_SERVICE_IDS.APPLIANCE_INSTALLATION,
        name: "Dishwasher",
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.assets.map((asset) => asset.category),
    [ASSET_CATEGORY_IDS.CABINET, ASSET_CATEGORY_IDS.APPLIANCE]
  );
  assert.deepEqual(
    result.assets.map((asset) => asset.customerId),
    ["customer-sarah", "customer-sarah"]
  );
});

test("same service creates scoped assets for Sarah and William without leakage", () => {
  const sarah = createAssetRecord({
    sourceService: "door_replacement",
    customerId: "customer-sarah",
    jobId: "job-sarah-door",
    name: "Sarah Front Door",
  });
  const william = createAssetRecord({
    sourceService: "door_replacement",
    customerId: "customer-william",
    jobId: "job-william-door",
    name: "William Unit Door",
  });
  const allAssets = [sarah.asset, william.asset];

  assert.equal(sarah.ok, true);
  assert.equal(william.ok, true);
  assert.deepEqual(
    getAssetsForCustomer(allAssets, "customer-sarah").map((asset) => asset.name),
    ["Sarah Front Door"]
  );
  assert.deepEqual(
    getAssetsForCustomer(allAssets, "customer-william").map((asset) => asset.name),
    ["William Unit Door"]
  );
  assert.equal(
    getAssetsForCustomer(allAssets, "customer-sarah").some(
      (asset) => asset.customerId === "customer-william"
    ),
    false
  );
  assert.equal(
    getAssetsForCustomer(allAssets, "customer-william").some(
      (asset) => asset.customerId === "customer-sarah"
    ),
    false
  );
});

test("unknown services fail safely without inventing assets", () => {
  const resolution = resolveAssetCategoryForService("unknown_service");
  const asset = createAssetRecord({
    sourceService: "unknown_service",
    customerId: "customer-sarah",
    jobId: "job-unknown",
  });

  assert.deepEqual(resolution, {
    found: false,
    serviceType: "unknown_service",
    assetCategory: null,
    reason: "No asset category mapping is registered for this service.",
  });
  assert.equal(asset.ok, false);
  assert.equal(asset.asset, null);
  assert.deepEqual(asset.errors, [
    {
      code: "unknown-asset-service",
      message:
        "Service is not registered in the Asset Engine service-to-asset mapping.",
      field: "sourceService",
    },
  ]);
});

test("completed closed service creates an expected asset candidate", () => {
  const job = {
    id: "job-sarah-door",
    historyId: "history-sarah-door",
    customerId: "customer-sarah",
    status: "closed",
    closedAt: "2026-06-19",
    evaluation: {
      id: "evaluation-sarah-door",
      serviceRecommendations: [
        {
          id: ASSET_SERVICE_IDS.DOOR_REPLACEMENT,
          title: "Door Replacement",
          findingId: "finding-door-damage",
        },
      ],
    },
    quote: {
      status: "accepted",
      services: [{ serviceType: ASSET_SERVICE_IDS.DOOR_REPLACEMENT }],
    },
    completion: {
      completedServices: [{ serviceType: ASSET_SERVICE_IDS.DOOR_REPLACEMENT }],
    },
  };
  const result = createAssetCandidatesFromClosedJob(job);

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.assetCandidates.map((asset) => ({
      category: asset.category,
      customerId: asset.customerId,
      jobId: asset.jobId,
      sourceService: asset.sourceService,
      sourceFindingId: asset.sourceFindingId,
      sourceEvaluationId: asset.sourceEvaluationId,
      sourceHistoryId: asset.sourceHistoryId,
    })),
    [
      {
        category: "door",
        customerId: "customer-sarah",
        jobId: "job-sarah-door",
        sourceService: "door_replacement",
        sourceFindingId: "finding-door-damage",
        sourceEvaluationId: "evaluation-sarah-door",
        sourceHistoryId: "history-sarah-door",
      },
    ]
  );
});

test("recommended but not approved service does not create an asset candidate", () => {
  const job = {
    id: "job-rejected",
    customerId: "customer-sarah",
    status: "closed",
    evaluation: {
      serviceRecommendations: [{ id: ASSET_SERVICE_IDS.CABINET_REPLACEMENT }],
    },
    quote: {
      status: "rejected",
      services: [{ serviceType: ASSET_SERVICE_IDS.CABINET_REPLACEMENT }],
    },
    completion: {
      completedServices: [{ serviceType: ASSET_SERVICE_IDS.CABINET_REPLACEMENT }],
    },
  };

  assert.equal(
    isServiceAssetEligible(
      { serviceType: ASSET_SERVICE_IDS.CABINET_REPLACEMENT },
      job
    ).eligible,
    false
  );
  assert.deepEqual(createAssetCandidatesFromClosedJob(job).assetCandidates, []);
});

test("approved but incomplete service does not create an asset candidate", () => {
  const job = {
    id: "job-incomplete",
    customerId: "customer-sarah",
    status: "closed",
    evaluation: {
      serviceRecommendations: [{ id: ASSET_SERVICE_IDS.WINDOW_REPLACEMENT }],
    },
    quote: {
      status: "accepted",
      services: [{ serviceType: ASSET_SERVICE_IDS.WINDOW_REPLACEMENT }],
    },
    completion: {
      completedServices: [],
    },
  };
  const eligibility = isServiceAssetEligible(
    { serviceType: ASSET_SERVICE_IDS.WINDOW_REPLACEMENT },
    job
  );

  assert.equal(eligibility.eligible, false);
  assert.ok(eligibility.missing.includes("completed"));
  assert.deepEqual(getAssetEligibleServices(job), []);
});

test("unknown completed service fails safely in asset eligibility planning", () => {
  const job = {
    id: "job-unknown-service",
    customerId: "customer-sarah",
    status: "closed",
    evaluation: {
      serviceRecommendations: [{ id: "mold_remediation" }],
    },
    quote: {
      status: "accepted",
      services: [{ serviceType: "mold_remediation" }],
    },
    completion: {
      completedServices: [{ serviceType: "mold_remediation" }],
    },
  };
  const eligibility = isServiceAssetEligible({ serviceType: "mold_remediation" }, job);
  const result = createAssetCandidatesFromClosedJob(job);

  assert.equal(eligibility.eligible, false);
  assert.deepEqual(eligibility.assetCategory, null);
  assert.ok(eligibility.missing.includes("serviceMapped"));
  assert.deepEqual(result.assetCandidates, []);
  assert.deepEqual(result.errors, []);
});

test("multiple completed services create multiple asset candidates", () => {
  const job = {
    id: "job-sarah-remodel",
    customerId: "customer-sarah",
    status: "closed",
    evaluation: {
      id: "evaluation-sarah-remodel",
      serviceRecommendations: [
        { id: ASSET_SERVICE_IDS.CABINET_REPLACEMENT },
        { id: ASSET_SERVICE_IDS.APPLIANCE_INSTALLATION },
      ],
    },
    quote: {
      status: "accepted",
      services: [
        { serviceType: ASSET_SERVICE_IDS.CABINET_REPLACEMENT },
        { serviceType: ASSET_SERVICE_IDS.APPLIANCE_INSTALLATION },
      ],
    },
    completion: {
      completedServices: [
        { serviceType: ASSET_SERVICE_IDS.CABINET_REPLACEMENT },
        { serviceType: ASSET_SERVICE_IDS.APPLIANCE_INSTALLATION },
      ],
    },
  };

  assert.deepEqual(
    createAssetCandidatesFromClosedJob(job).assetCandidates.map(
      (asset) => asset.category
    ),
    ["cabinet", "appliance"]
  );
});

test("Sarah and William asset candidates remain scoped", () => {
  const sarah = createAssetCandidatesFromClosedJob({
    id: "job-sarah-door",
    customerId: "customer-sarah",
    status: "closed",
    evaluation: {
      serviceRecommendations: [{ id: ASSET_SERVICE_IDS.DOOR_REPLACEMENT }],
    },
    quote: {
      status: "accepted",
      services: [{ serviceType: ASSET_SERVICE_IDS.DOOR_REPLACEMENT }],
    },
    completion: {
      completedServices: [{ serviceType: ASSET_SERVICE_IDS.DOOR_REPLACEMENT }],
    },
  });
  const william = createAssetCandidatesFromClosedJob({
    id: "job-william-door",
    customerId: "customer-william",
    status: "closed",
    evaluation: {
      serviceRecommendations: [{ id: ASSET_SERVICE_IDS.DOOR_REPLACEMENT }],
    },
    quote: {
      status: "accepted",
      services: [{ serviceType: ASSET_SERVICE_IDS.DOOR_REPLACEMENT }],
    },
    completion: {
      completedServices: [{ serviceType: ASSET_SERVICE_IDS.DOOR_REPLACEMENT }],
    },
  });

  assert.deepEqual(
    sarah.assetCandidates.map((asset) => asset.customerId),
    ["customer-sarah"]
  );
  assert.deepEqual(
    william.assetCandidates.map((asset) => asset.customerId),
    ["customer-william"]
  );
  assert.equal(
    sarah.assetCandidates.some((asset) => asset.customerId === "customer-william"),
    false
  );
  assert.equal(
    william.assetCandidates.some((asset) => asset.customerId === "customer-sarah"),
    false
  );
});

test("closed kitchen remodel creates asset candidates from completed services", () => {
  const result = createAssetCandidatesFromClosedJob({
    id: "job-sarah-kitchen",
    historyId: "history-sarah-kitchen",
    customerId: "customer-sarah",
    status: "closed",
    evaluation: {
      id: "evaluation-sarah-kitchen",
      serviceRecommendations: [
        {
          id: ASSET_SERVICE_IDS.CABINET_REPLACEMENT,
          findingId: "finding_water_damaged_sink_cabinet",
        },
        {
          id: ASSET_SERVICE_IDS.TILE_INSTALLATION,
          findingId: "finding_backsplash_replacement_needed",
        },
        {
          id: ASSET_SERVICE_IDS.ELECTRICAL_REPAIR,
          findingId: "finding_outlet_not_functioning",
        },
      ],
    },
    quote: {
      status: "accepted",
      services: [
        { serviceType: ASSET_SERVICE_IDS.CABINET_REPLACEMENT },
        { serviceType: ASSET_SERVICE_IDS.TILE_INSTALLATION },
        { serviceType: ASSET_SERVICE_IDS.ELECTRICAL_REPAIR },
      ],
    },
    completion: {
      completedServices: [
        { serviceType: ASSET_SERVICE_IDS.CABINET_REPLACEMENT },
        { serviceType: ASSET_SERVICE_IDS.TILE_INSTALLATION },
        { serviceType: ASSET_SERVICE_IDS.ELECTRICAL_REPAIR },
      ],
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.assetCandidates.map((asset) => asset.category),
    ["cabinet", "flooring", "electrical_panel"]
  );
  assert.deepEqual(
    result.assetCandidates.map((asset) => asset.sourceFindingId),
    [
      "finding_water_damaged_sink_cabinet",
      "finding_backsplash_replacement_needed",
      "finding_outlet_not_functioning",
    ]
  );
});

test("registry definitions are immutable to callers and report foundation counts", () => {
  const category = getAssetCategory(ASSET_CATEGORY_IDS.DOOR);
  category.label = "Caller Mutation";

  const mapping = getServiceAssetMapping(ASSET_SERVICE_IDS.DOOR_REPLACEMENT);
  mapping.assetCategory = "caller_mutation";

  assert.equal(getAssetCategory(ASSET_CATEGORY_IDS.DOOR).label, "Door");
  assert.equal(
    getServiceAssetMapping(ASSET_SERVICE_IDS.DOOR_REPLACEMENT).assetCategory,
    ASSET_CATEGORY_IDS.DOOR
  );
  assert.equal(Object.isFrozen(ASSET_CATEGORY_REGISTRY), true);
  assert.equal(Object.isFrozen(SERVICE_TO_ASSET_REGISTRY), true);
  assert.deepEqual(getAssetEngineReport(), {
    model: [
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
    ],
    assetCategories: Object.values(ASSET_CATEGORY_IDS),
    assetCategoryCount: 10,
    serviceToAssetMappingCount: 12,
  });
});
