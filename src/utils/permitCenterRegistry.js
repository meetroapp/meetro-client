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

export const PERMIT_LIFECYCLE = deepFreeze([
  "Permit Required",
  "Permit Submitted",
  "Permit Approved",
  "Work Performed",
  "Inspection Scheduled",
  "Inspection Passed",
  "Permit Closed",
  "Job Closure",
]);

export const PERMIT_RECORD_FIELDS = deepFreeze([
  "Permit Number",
  "Permit Type",
  "Municipality",
  "Status",
]);

export const INSPECTION_RECORD_FIELDS = deepFreeze([
  "Scheduled",
  "Passed",
  "Failed",
]);

export const CLOSURE_DEPENDENCIES = deepFreeze([
  "Permit Closed",
  "Inspection Passed",
  "Documentation Complete",
]);

export const PERMIT_CENTER_MESSAGE =
  "A completed job may still have outstanding permit obligations. Permit closure is separate from work completion.";

export const PERMIT_TYPE_REGISTRY = toRegistryMap([
  {
    id: "building_permit",
    name: "Building Permit",
    purpose: "Structural, remodeling, or construction work that requires local approval.",
  },
  {
    id: "electrical_permit",
    name: "Electrical Permit",
    purpose: "Electrical installation, repair, panel, circuit, or safety-related work.",
  },
  {
    id: "plumbing_permit",
    name: "Plumbing Permit",
    purpose: "Water, drain, fixture, gas, or plumbing system work that requires approval.",
  },
  {
    id: "mechanical_permit",
    name: "Mechanical Permit",
    purpose: "HVAC, ventilation, mechanical system, or equipment replacement work.",
  },
  {
    id: "roofing_permit",
    name: "Roofing Permit",
    purpose: "Roof repair, replacement, structural decking, or exterior envelope work.",
  },
  {
    id: "solar_permit",
    name: "Solar Permit",
    purpose: "Solar panel, inverter, battery, or related electrical installation work.",
  },
]);

export function getPermitTypes(filters = {}) {
  const id = normalizeRegistryKey(filters.id);

  return Object.values(PERMIT_TYPE_REGISTRY)
    .filter((permitType) => !id || permitType.id === id)
    .map(cloneValue);
}

export function getPermitType(permitTypeId) {
  const definition = PERMIT_TYPE_REGISTRY[normalizeRegistryKey(permitTypeId)];

  return definition ? cloneValue(definition) : null;
}

export function getPermitCenterModel() {
  return {
    readOnly: true,
    purpose:
      "Permit Center will organize permit obligations, inspection records, and closure dependencies.",
    complianceMessage: PERMIT_CENTER_MESSAGE,
    permitTypes: getPermitTypes(),
    lifecycle: [...PERMIT_LIFECYCLE],
    permitRecordFields: [...PERMIT_RECORD_FIELDS],
    inspectionRecordFields: [...INSPECTION_RECORD_FIELDS],
    closureDependencies: [...CLOSURE_DEPENDENCIES],
  };
}

export function getPermitCenterReport() {
  const model = getPermitCenterModel();

  return {
    readOnly: model.readOnly,
    permitTypeCount: model.permitTypes.length,
    permitTypes: model.permitTypes.map((permitType) => permitType.id),
    lifecycleStepCount: model.lifecycle.length,
    closureDependencyCount: model.closureDependencies.length,
  };
}
