export const INDUSTRIES = Object.freeze({
  HANDYMAN: "handyman",
  MECHANIC: "mechanic",
  HEALTHCARE: "healthcare",
});

export const BUSINESS_TYPES = Object.freeze({
  HANDYMAN: "handyman",
  MECHANIC: "mechanic",
  HEALTHCARE: "healthcare",
});

export const SERVICE_TYPE_IDS = Object.freeze({
  GENERAL_HANDYMAN: "general_handyman",
  DOOR_REPAIR: "door_repair",
  DOOR_REPLACEMENT: "door_replacement",
  DRYWALL_REPAIR: "drywall_repair",
  PAINTING: "painting",
  CABINET_REPAIR: "cabinet_repair",
  WINDOW_REPAIR: "window_repair",
  TILE_REPAIR: "tile_repair",
  FENCE_REPAIR: "fence_repair",
  APPLIANCE_INSTALLATION: "appliance_installation",
  GENERAL_MAINTENANCE: "general_maintenance",
  BRAKE_SERVICE: "brake_service",
  PATIENT_INTAKE: "patient_intake",
});

export const CONTEXT_IDS = Object.freeze({
  HOMEOWNER: "homeowner",
  PROPERTY_MANAGEMENT: "property_management",
  COMMERCIAL: "commercial",
  INSURANCE: "insurance",
  WARRANTY: "warranty",
  RETAIL_CUSTOMER: "retail_customer",
  HEALTHCARE: "healthcare",
});

export const EVALUATION_TEMPLATE_IDS = Object.freeze({
  GENERAL_HANDYMAN_HOMEOWNER: "general_handyman_homeowner",
  DOOR_REPAIR_HOMEOWNER: "door_repair_homeowner",
  DOOR_REPLACEMENT_HOMEOWNER: "door_replacement_homeowner",
  DOOR_REPLACEMENT_PROPERTY_MANAGEMENT:
    "door_replacement_property_management",
  DRYWALL_REPAIR_PROPERTY_MANAGEMENT:
    "drywall_repair_property_management",
  BRAKE_SERVICE_RETAIL_CUSTOMER: "brake_service_retail_customer",
  PATIENT_INTAKE_HEALTHCARE: "patient_intake_healthcare",
});

const UNIVERSAL_WORKFLOW_PHASES = Object.freeze([
  "request",
  "evaluation",
  "recommendation",
  "approval",
  "execution",
  "completion",
  "closure",
  "history",
]);

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
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function toRegistryMap(definitions) {
  return deepFreeze(
    Object.fromEntries(definitions.map((definition) => [definition.id, definition]))
  );
}

export const SERVICE_TYPE_REGISTRY = toRegistryMap([
  {
    id: SERVICE_TYPE_IDS.GENERAL_HANDYMAN,
    label: "General Handyman",
    industry: INDUSTRIES.HANDYMAN,
    businessType: BUSINESS_TYPES.HANDYMAN,
  },
  {
    id: SERVICE_TYPE_IDS.DOOR_REPAIR,
    label: "Door Repair",
    industry: INDUSTRIES.HANDYMAN,
    businessType: BUSINESS_TYPES.HANDYMAN,
  },
  {
    id: SERVICE_TYPE_IDS.DOOR_REPLACEMENT,
    label: "Door Replacement",
    industry: INDUSTRIES.HANDYMAN,
    businessType: BUSINESS_TYPES.HANDYMAN,
  },
  {
    id: SERVICE_TYPE_IDS.DRYWALL_REPAIR,
    label: "Drywall Repair",
    industry: INDUSTRIES.HANDYMAN,
    businessType: BUSINESS_TYPES.HANDYMAN,
  },
  {
    id: SERVICE_TYPE_IDS.PAINTING,
    label: "Painting",
    industry: INDUSTRIES.HANDYMAN,
    businessType: BUSINESS_TYPES.HANDYMAN,
  },
  {
    id: SERVICE_TYPE_IDS.CABINET_REPAIR,
    label: "Cabinet Repair",
    industry: INDUSTRIES.HANDYMAN,
    businessType: BUSINESS_TYPES.HANDYMAN,
  },
  {
    id: SERVICE_TYPE_IDS.WINDOW_REPAIR,
    label: "Window Repair",
    industry: INDUSTRIES.HANDYMAN,
    businessType: BUSINESS_TYPES.HANDYMAN,
  },
  {
    id: SERVICE_TYPE_IDS.TILE_REPAIR,
    label: "Tile Repair",
    industry: INDUSTRIES.HANDYMAN,
    businessType: BUSINESS_TYPES.HANDYMAN,
  },
  {
    id: SERVICE_TYPE_IDS.FENCE_REPAIR,
    label: "Fence Repair",
    industry: INDUSTRIES.HANDYMAN,
    businessType: BUSINESS_TYPES.HANDYMAN,
  },
  {
    id: SERVICE_TYPE_IDS.APPLIANCE_INSTALLATION,
    label: "Appliance Installation",
    industry: INDUSTRIES.HANDYMAN,
    businessType: BUSINESS_TYPES.HANDYMAN,
  },
  {
    id: SERVICE_TYPE_IDS.GENERAL_MAINTENANCE,
    label: "General Maintenance",
    industry: INDUSTRIES.HANDYMAN,
    businessType: BUSINESS_TYPES.HANDYMAN,
  },
  {
    id: SERVICE_TYPE_IDS.BRAKE_SERVICE,
    label: "Brake Service",
    industry: INDUSTRIES.MECHANIC,
    businessType: BUSINESS_TYPES.MECHANIC,
  },
  {
    id: SERVICE_TYPE_IDS.PATIENT_INTAKE,
    label: "Patient Intake",
    industry: INDUSTRIES.HEALTHCARE,
    businessType: BUSINESS_TYPES.HEALTHCARE,
  },
]);

export const CONTEXT_REGISTRY = toRegistryMap([
  {
    id: CONTEXT_IDS.HOMEOWNER,
    label: "Homeowner",
    appliesTo: [INDUSTRIES.HANDYMAN],
  },
  {
    id: CONTEXT_IDS.PROPERTY_MANAGEMENT,
    label: "Property Management",
    appliesTo: [INDUSTRIES.HANDYMAN],
  },
  {
    id: CONTEXT_IDS.COMMERCIAL,
    label: "Commercial",
    appliesTo: [INDUSTRIES.HANDYMAN],
  },
  {
    id: CONTEXT_IDS.INSURANCE,
    label: "Insurance",
    appliesTo: [INDUSTRIES.HANDYMAN],
  },
  {
    id: CONTEXT_IDS.WARRANTY,
    label: "Warranty",
    appliesTo: [INDUSTRIES.HANDYMAN],
  },
  {
    id: CONTEXT_IDS.RETAIL_CUSTOMER,
    label: "Retail Customer",
    appliesTo: [INDUSTRIES.MECHANIC],
  },
  {
    id: CONTEXT_IDS.HEALTHCARE,
    label: "Healthcare",
    appliesTo: [INDUSTRIES.HEALTHCARE],
  },
]);

export const EVALUATION_TEMPLATE_REGISTRY = toRegistryMap([
  {
    id: EVALUATION_TEMPLATE_IDS.GENERAL_HANDYMAN_HOMEOWNER,
    serviceType: SERVICE_TYPE_IDS.GENERAL_HANDYMAN,
    context: CONTEXT_IDS.HOMEOWNER,
    workflowPhase: "evaluation",
    requirementRefs: ["scope_summary", "photos_optional", "access_notes"],
    requirements: [
      "Customer concern",
      "Existing condition",
      "Photos",
      "Measurements if needed",
      "Materials needed",
      "Recommended next step",
    ],
  },
  {
    id: EVALUATION_TEMPLATE_IDS.DOOR_REPAIR_HOMEOWNER,
    serviceType: SERVICE_TYPE_IDS.DOOR_REPAIR,
    context: CONTEXT_IDS.HOMEOWNER,
    workflowPhase: "evaluation",
    requirementRefs: [
      "door_issue_summary",
      "hardware_condition",
      "photos_optional",
    ],
    requirements: [
      "Door issue",
      "Door type",
      "Frame condition",
      "Hinge/hardware condition",
      "Photos",
      "Materials needed",
      "Recommended repair",
    ],
  },
  {
    id: EVALUATION_TEMPLATE_IDS.DOOR_REPLACEMENT_HOMEOWNER,
    serviceType: SERVICE_TYPE_IDS.DOOR_REPLACEMENT,
    context: CONTEXT_IDS.HOMEOWNER,
    workflowPhase: "evaluation",
    requirementRefs: [
      "door_measurements",
      "frame_condition",
      "photos",
      "finish_preferences",
    ],
    requirements: [
      "Door width",
      "Door height",
      "Door type",
      "Frame condition",
      "Hardware condition",
      "Before photos",
      "Materials needed",
      "Recommended solution",
    ],
  },
  {
    id: EVALUATION_TEMPLATE_IDS.DOOR_REPLACEMENT_PROPERTY_MANAGEMENT,
    serviceType: SERVICE_TYPE_IDS.DOOR_REPLACEMENT,
    context: CONTEXT_IDS.PROPERTY_MANAGEMENT,
    workflowPhase: "evaluation",
    requirementRefs: [
      "door_measurements",
      "frame_condition",
      "photos",
      "unit_number",
      "tenant_access_notes",
      "property_manager_approval_notes",
    ],
    requirements: [
      "Door width",
      "Door height",
      "Door type",
      "Frame condition",
      "Hardware condition",
      "Unit number",
      "Tenant access notes",
      "Before photos",
      "Materials needed",
      "Recommended solution",
      "Property manager approval notes",
    ],
  },
  {
    id: EVALUATION_TEMPLATE_IDS.DRYWALL_REPAIR_PROPERTY_MANAGEMENT,
    serviceType: SERVICE_TYPE_IDS.DRYWALL_REPAIR,
    context: CONTEXT_IDS.PROPERTY_MANAGEMENT,
    workflowPhase: "evaluation",
    requirementRefs: [
      "damage_area",
      "moisture_or_leak_source",
      "photos",
      "unit_number",
      "tenant_access_notes",
      "property_manager_approval_notes",
    ],
    requirements: [
      "Unit number",
      "Damage location",
      "Damage size",
      "Moisture present",
      "Texture type",
      "Paint match needed",
      "Before photos",
      "Materials needed",
      "Tenant access notes",
    ],
  },
  {
    id: EVALUATION_TEMPLATE_IDS.BRAKE_SERVICE_RETAIL_CUSTOMER,
    serviceType: SERVICE_TYPE_IDS.BRAKE_SERVICE,
    context: CONTEXT_IDS.RETAIL_CUSTOMER,
    workflowPhase: "evaluation",
    requirementRefs: [
      "vehicle_identity",
      "symptoms",
      "mileage",
      "warning_lights",
    ],
    requirements: [
      "Vehicle identity",
      "Symptoms",
      "Mileage",
      "Warning lights",
      "Recommended service",
    ],
  },
  {
    id: EVALUATION_TEMPLATE_IDS.PATIENT_INTAKE_HEALTHCARE,
    serviceType: SERVICE_TYPE_IDS.PATIENT_INTAKE,
    context: CONTEXT_IDS.HEALTHCARE,
    workflowPhase: "evaluation",
    requirementRefs: [
      "patient_identity",
      "reason_for_visit",
      "symptoms",
      "clinical_triage_notes",
    ],
    requirements: [
      "Patient identity",
      "Reason for visit",
      "Symptoms",
      "Clinical triage notes",
      "Recommended next step",
    ],
  },
]);

export function getUniversalWorkflowPhases() {
  return [...UNIVERSAL_WORKFLOW_PHASES];
}

export function getServiceTypes(filters = {}) {
  const industry = normalizeRegistryKey(filters.industry);
  const businessType = normalizeRegistryKey(filters.businessType);

  return Object.values(SERVICE_TYPE_REGISTRY)
    .filter((serviceType) => !industry || serviceType.industry === industry)
    .filter(
      (serviceType) => !businessType || serviceType.businessType === businessType
    )
    .map(cloneValue);
}

export function getContexts(filters = {}) {
  const industry = normalizeRegistryKey(filters.industry);

  return Object.values(CONTEXT_REGISTRY)
    .filter(
      (context) => !industry || context.appliesTo.includes(industry)
    )
    .map(cloneValue);
}

export function getEvaluationTemplates(filters = {}) {
  const serviceType = normalizeRegistryKey(filters.serviceType);
  const context = normalizeRegistryKey(filters.context);

  return Object.values(EVALUATION_TEMPLATE_REGISTRY)
    .filter((template) => !serviceType || template.serviceType === serviceType)
    .filter((template) => !context || template.context === context)
    .map(cloneValue);
}

export function getServiceType(serviceType) {
  const definition = SERVICE_TYPE_REGISTRY[normalizeRegistryKey(serviceType)];
  return definition ? cloneValue(definition) : null;
}

export function getContext(context) {
  const definition = CONTEXT_REGISTRY[normalizeRegistryKey(context)];
  return definition ? cloneValue(definition) : null;
}

export function getEvaluationTemplate(templateId) {
  const definition =
    EVALUATION_TEMPLATE_REGISTRY[normalizeRegistryKey(templateId)];
  return definition ? cloneValue(definition) : null;
}

export function resolveEvaluationTemplate(selection = {}) {
  const serviceType = normalizeRegistryKey(selection.serviceType);
  const context = normalizeRegistryKey(selection.context);
  const template = Object.values(EVALUATION_TEMPLATE_REGISTRY).find(
    (candidate) =>
      candidate.serviceType === serviceType && candidate.context === context
  );

  if (!template) {
    return {
      found: false,
      serviceType,
      context,
      evaluationTemplate: null,
      reason: "No evaluation template is registered for this service/context pair.",
    };
  }

  return {
    found: true,
    serviceType,
    context,
    evaluationTemplate: template.id,
    template: cloneValue(template),
  };
}

export function getEvaluationRegistryReport() {
  const serviceTypeIds = Object.keys(SERVICE_TYPE_REGISTRY);
  const contextIds = Object.keys(CONTEXT_REGISTRY);
  const templates = Object.values(EVALUATION_TEMPLATE_REGISTRY);
  const templatePairs = templates.map((template) => ({
    serviceType: template.serviceType,
    context: template.context,
    evaluationTemplate: template.id,
  }));

  return {
    workflowModel: {
      universal: true,
      phases: getUniversalWorkflowPhases(),
      mandatoryPhase: "evaluation",
    },
    serviceTypeCount: serviceTypeIds.length,
    contextCount: contextIds.length,
    evaluationTemplateCount: templates.length,
    serviceTypes: serviceTypeIds,
    contexts: contextIds,
    templatePairs,
  };
}

export function getServiceEvaluationCatalog(filters = {}) {
  const serviceTypes = getServiceTypes(filters);
  const groupedByIndustry = new Map();

  serviceTypes.forEach((serviceType) => {
    const industryContexts = getContexts({ industry: serviceType.industry });
    const templates = getEvaluationTemplates({
      serviceType: serviceType.id,
    }).map((template) => {
      const context = getContext(template.context);

      return {
        key: template.id,
        context: template.context,
        contextLabel: context?.label || template.context,
        requirements: [...(template.requirements || [])],
      };
    });

    if (!groupedByIndustry.has(serviceType.industry)) {
      groupedByIndustry.set(serviceType.industry, {
        industry: serviceType.industry,
        businessType: serviceType.businessType,
        label: serviceType.industry
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        services: [],
      });
    }

    groupedByIndustry.get(serviceType.industry).services.push({
      id: serviceType.id,
      label: serviceType.label,
      businessType: serviceType.businessType,
      supportedContexts: industryContexts.map((context) => ({
        id: context.id,
        label: context.label,
      })),
      templates,
    });
  });

  return Array.from(groupedByIndustry.values()).map(cloneValue);
}
