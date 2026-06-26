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

export const BUSINESS_INTELLIGENCE_MESSAGE =
  "Meetro learns from completed workflows. Evaluations create findings. Findings create service recommendations. Approved services create revenue. Completed services create history. History creates business intelligence.";

export const BUSINESS_INTELLIGENCE_FLOW = deepFreeze([
  "Evaluations",
  "Findings",
  "Service Recommendations",
  "Approved Services",
  "Revenue",
  "Completed Services",
  "History",
  "Business Intelligence",
]);

export const BUSINESS_INTELLIGENCE_REGISTRY = toRegistryMap([
  {
    id: "revenue_insights",
    name: "Revenue Insights",
    purpose: "Shows how approved and completed services contribute to business revenue.",
    futureExamples: [
      "Revenue by service type",
      "Revenue by customer segment",
      "Revenue from approved recommendations",
      "Closed-job revenue trends",
    ],
  },
  {
    id: "service_performance",
    name: "Service Performance",
    purpose: "Shows which services are requested, recommended, approved, and completed most often.",
    futureExamples: [
      "Most requested services",
      "Most approved services",
      "Completion trends by service type",
      "Service mix over time",
    ],
  },
  {
    id: "findings_trends",
    name: "Findings Trends",
    purpose: "Shows what professionals commonly discover during evaluations.",
    futureExamples: [
      "Most common findings",
      "Most common recommended services",
      "Findings by service type",
      "Findings by property/customer",
    ],
  },
  {
    id: "materials_usage",
    name: "Materials Usage",
    purpose: "Shows which materials are commonly associated with completed services.",
    futureExamples: [
      "Materials by service type",
      "Materials by completed job",
      "Common material patterns",
      "Material assumptions by proposal",
    ],
  },
  {
    id: "customer_history_insights",
    name: "Customer History Insights",
    purpose: "Shows business patterns across customer relationships and closed history.",
    futureExamples: [
      "Repeat customers",
      "Customer service history",
      "Customer approval patterns",
      "Customer document history",
    ],
  },
  {
    id: "asset_history_insights",
    name: "Asset History Insights",
    purpose: "Shows trends tied to assets created or affected by completed services.",
    futureExamples: [
      "Assets by customer",
      "Service history by asset",
      "Warranty-linked assets",
      "Asset replacement trends",
    ],
  },
  {
    id: "permit_compliance_insights",
    name: "Permit / Compliance Insights",
    purpose: "Shows future patterns across permit, inspection, and closure obligations.",
    futureExamples: [
      "Open compliance obligations",
      "Permit closure trends",
      "Inspection outcomes",
      "Closure blockers by job type",
    ],
  },
  {
    id: "quote_to_approval_insights",
    name: "Quote-to-Approval Insights",
    purpose: "Shows how proposals move from recommendation to customer approval.",
    futureExamples: [
      "Quote approval rate",
      "Time to approval",
      "Approved vs. declined services",
      "Proposal value by service type",
    ],
  },
]);

export function getBusinessIntelligenceCategories(filters = {}) {
  const id = normalizeRegistryKey(filters.id);

  return Object.values(BUSINESS_INTELLIGENCE_REGISTRY)
    .filter((category) => !id || category.id === id)
    .map(cloneValue);
}

export function getBusinessIntelligenceCategory(categoryId) {
  const definition =
    BUSINESS_INTELLIGENCE_REGISTRY[normalizeRegistryKey(categoryId)];

  return definition ? cloneValue(definition) : null;
}

export function getBusinessIntelligenceModel() {
  return {
    readOnly: true,
    message: BUSINESS_INTELLIGENCE_MESSAGE,
    flow: [...BUSINESS_INTELLIGENCE_FLOW],
    categories: getBusinessIntelligenceCategories(),
  };
}

export function getBusinessIntelligenceReport() {
  const model = getBusinessIntelligenceModel();

  return {
    readOnly: model.readOnly,
    categoryCount: model.categories.length,
    categories: model.categories.map((category) => category.id),
    flowStepCount: model.flow.length,
    futureExampleCount: model.categories.reduce(
      (total, category) => total + category.futureExamples.length,
      0
    ),
  };
}
