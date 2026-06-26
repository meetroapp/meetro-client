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

export const RELATIONSHIP_PRINCIPLE = deepFreeze([
  "Relationships",
  "Communication",
  "Understanding",
  "Decisions",
  "Work",
  "History",
  "Relationships",
]);

export const RELATIONSHIP_TIMELINE_TEMPLATE = deepFreeze([
  "Customer created",
  "Conversation started",
  "Evaluation completed",
  "Proposal approved",
  "Work completed",
  "Referral received",
]);

export const FUTURE_RELATIONSHIP_SECTIONS = deepFreeze([
  "Properties",
  "Assets",
  "Referrals",
  "Customer Insights",
]);

export const CUSTOMER_RELATIONSHIP_REGISTRY = toRegistryMap([
  {
    id: "sarah",
    name: "Sarah",
    relationshipStatus: "Active customer",
    activeJobsCount: 1,
    closedJobsCount: 1,
    lastActivityDate: "2026-06-19",
    communicationSummary: {
      conversations: 2,
      messages: 14,
      lastContact: "2026-06-19",
    },
    workSummary: {
      completedJobs: 1,
      activeJobs: 1,
      totalProjects: 2,
    },
    timeline: [
      "Customer created",
      "Conversation started",
      "Evaluation completed",
      "Proposal approved",
      "Work completed",
    ],
  },
  {
    id: "william",
    name: "William",
    relationshipStatus: "Active customer",
    activeJobsCount: 1,
    closedJobsCount: 1,
    lastActivityDate: "2026-06-19",
    communicationSummary: {
      conversations: 2,
      messages: 12,
      lastContact: "2026-06-19",
    },
    workSummary: {
      completedJobs: 1,
      activeJobs: 1,
      totalProjects: 2,
    },
    timeline: [
      "Customer created",
      "Conversation started",
      "Evaluation completed",
      "Proposal approved",
      "Work completed",
    ],
  },
  {
    id: "jack_lindstrom",
    name: "Jack Lindstrom",
    relationshipStatus: "Prospective relationship",
    activeJobsCount: 0,
    closedJobsCount: 0,
    lastActivityDate: "2026-06-19",
    communicationSummary: {
      conversations: 1,
      messages: 3,
      lastContact: "2026-06-19",
    },
    workSummary: {
      completedJobs: 0,
      activeJobs: 0,
      totalProjects: 0,
    },
    timeline: [
      "Customer created",
      "Conversation started",
    ],
  },
]);

export function getCustomerRelationships(filters = {}) {
  const id = normalizeRegistryKey(filters.id);

  return Object.values(CUSTOMER_RELATIONSHIP_REGISTRY)
    .filter((relationship) => !id || relationship.id === id)
    .map(cloneValue);
}

export function getCustomerRelationship(customerId) {
  const definition =
    CUSTOMER_RELATIONSHIP_REGISTRY[normalizeRegistryKey(customerId)];

  return definition ? cloneValue(definition) : null;
}

export function getCustomerRelationshipsCenterModel() {
  return {
    readOnly: true,
    principle: [...RELATIONSHIP_PRINCIPLE],
    timelineTemplate: [...RELATIONSHIP_TIMELINE_TEMPLATE],
    futureSections: [...FUTURE_RELATIONSHIP_SECTIONS],
    relationships: getCustomerRelationships(),
  };
}

export function getCustomerRelationshipsReport() {
  const model = getCustomerRelationshipsCenterModel();

  return {
    readOnly: model.readOnly,
    relationshipCount: model.relationships.length,
    customers: model.relationships.map((relationship) => relationship.id),
    activeJobsCount: model.relationships.reduce(
      (total, relationship) => total + relationship.activeJobsCount,
      0
    ),
    closedJobsCount: model.relationships.reduce(
      (total, relationship) => total + relationship.closedJobsCount,
      0
    ),
    futureSectionCount: model.futureSections.length,
  };
}
