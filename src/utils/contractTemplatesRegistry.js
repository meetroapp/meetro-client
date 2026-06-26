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

export const CONTRACT_TEMPLATE_REGISTRY = toRegistryMap([
  {
    id: "handyman_agreement",
    name: "Handyman Agreement",
    purpose: "General residential repair and maintenance work.",
    typicalUseCase:
      "Small to medium handyman projects where scope, payment, access, and completion expectations should be clear.",
    sections: [
      "Scope of Work",
      "Materials",
      "Schedule",
      "Payment Terms",
      "Customer Responsibilities",
      "Completion Terms",
      "Signatures",
    ],
  },
  {
    id: "kitchen_remodel_agreement",
    name: "Kitchen Remodel Agreement",
    purpose: "Residential kitchen renovation projects.",
    typicalUseCase:
      "Kitchen remodels involving cabinets, counters, tile, electrical, plumbing coordination, or staged completion.",
    sections: [
      "Scope of Work",
      "Materials",
      "Payment Terms",
      "Change Orders",
      "Completion Terms",
      "Signatures",
    ],
  },
  {
    id: "change_order",
    name: "Change Order",
    purpose: "Document scope, price, or schedule changes after approval.",
    typicalUseCase:
      "Work expands, materials change, hidden conditions are discovered, or the customer requests additional items.",
    sections: [
      "Original Scope Reference",
      "Requested Change",
      "Price Adjustment",
      "Schedule Impact",
      "Approval",
      "Signatures",
    ],
  },
  {
    id: "warranty_agreement",
    name: "Warranty Agreement",
    purpose: "Clarify workmanship or material warranty coverage.",
    typicalUseCase:
      "Projects where the professional needs to state what is covered, how long coverage lasts, and what is excluded.",
    sections: [
      "Covered Work",
      "Warranty Period",
      "Exclusions",
      "Customer Maintenance Responsibilities",
      "Claim Process",
      "Signatures",
    ],
  },
  {
    id: "property_management_service_agreement",
    name: "Property Management Service Agreement",
    purpose: "Recurring or unit-specific service work for managed properties.",
    typicalUseCase:
      "Property manager requests where access, tenant coordination, approvals, unit details, and documentation matter.",
    sections: [
      "Property / Unit Information",
      "Authorized Services",
      "Tenant Access",
      "Approval Limits",
      "Documentation Requirements",
      "Payment Terms",
      "Signatures",
    ],
  },
  {
    id: "emergency_service_authorization",
    name: "Emergency Service Authorization",
    purpose: "Authorize urgent work before full scope is known.",
    typicalUseCase:
      "Emergency calls where the professional needs permission to inspect, stabilize, and document urgent conditions.",
    sections: [
      "Emergency Description",
      "Authorization to Inspect",
      "Stabilization Scope",
      "Initial Cost Authorization",
      "Follow-up Recommendation",
      "Signatures",
    ],
  },
]);

export function getContractTemplates(filters = {}) {
  const id = normalizeRegistryKey(filters.id);

  return Object.values(CONTRACT_TEMPLATE_REGISTRY)
    .filter((template) => !id || template.id === id)
    .map(cloneValue);
}

export function getContractTemplate(templateId) {
  const definition = CONTRACT_TEMPLATE_REGISTRY[normalizeRegistryKey(templateId)];

  return definition ? cloneValue(definition) : null;
}

export function getContractTemplateReport() {
  const templates = Object.values(CONTRACT_TEMPLATE_REGISTRY);

  return {
    readOnly: true,
    templateCount: templates.length,
    templates: templates.map((template) => template.id),
    sectionCount: templates.reduce(
      (total, template) => total + template.sections.length,
      0
    ),
  };
}
