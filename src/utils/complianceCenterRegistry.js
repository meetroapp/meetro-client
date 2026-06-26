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

export const COMPLIANCE_LIFECYCLE = deepFreeze([
  "Obligation Identified",
  "Required Evidence Collected",
  "Reviewed",
  "Satisfied",
  "Job Closure Allowed",
]);

export const COMPLIANCE_RECORD_FIELDS = deepFreeze([
  "Obligation type",
  "Status",
  "Required evidence",
  "Responsible party",
]);

export const COMPLIANCE_CLOSURE_DEPENDENCIES = deepFreeze([
  "Permit must be closed",
  "Inspection must pass",
  "Customer must sign off",
  "Required photos must be attached",
]);

export const COMPLIANCE_CENTER_MESSAGE =
  "Completion documents work performed. Compliance verifies obligations. Closure should happen only when required obligations are satisfied.";

export const COMPLIANCE_OBLIGATION_REGISTRY = toRegistryMap([
  {
    id: "permit_closure",
    name: "Permit Closure",
    purpose: "Confirms required permits have reached a closed status.",
    evidenceExamples: ["Permit closed status", "Permit number", "Municipal confirmation"],
  },
  {
    id: "inspection_passed",
    name: "Inspection Passed",
    purpose: "Confirms required inspection obligations passed.",
    evidenceExamples: ["Inspection result", "Inspector notes", "Inspection date"],
  },
  {
    id: "customer_signoff",
    name: "Customer Signoff",
    purpose: "Confirms the customer accepted the completed work.",
    evidenceExamples: ["Customer approval", "Signature", "Completion acknowledgement"],
  },
  {
    id: "tenant_confirmation",
    name: "Tenant Confirmation",
    purpose: "Confirms tenant access, work status, or unit-specific acceptance.",
    evidenceExamples: ["Tenant note", "Access confirmation", "Unit confirmation"],
  },
  {
    id: "property_manager_approval",
    name: "Property Manager Approval",
    purpose: "Confirms property manager approval for managed property work.",
    evidenceExamples: ["Manager approval", "Approval note", "Authorization record"],
  },
  {
    id: "warranty_registration",
    name: "Warranty Registration",
    purpose: "Confirms applicable product or workmanship warranty steps are documented.",
    evidenceExamples: ["Warranty number", "Registration proof", "Coverage terms"],
  },
  {
    id: "required_photos",
    name: "Required Photos",
    purpose: "Confirms required visual documentation is attached.",
    evidenceExamples: ["Before photos", "After photos", "Condition photos"],
  },
  {
    id: "completion_report",
    name: "Completion Report",
    purpose: "Confirms final work documentation has been prepared.",
    evidenceExamples: ["Completion notes", "Completed work summary", "Timeline"],
  },
  {
    id: "certificate_documentation",
    name: "Certificate / Documentation",
    purpose: "Confirms required certificates or formal documents are collected.",
    evidenceExamples: ["Certificate", "Compliance document", "Closeout package"],
  },
]);

export function getComplianceObligations(filters = {}) {
  const id = normalizeRegistryKey(filters.id);

  return Object.values(COMPLIANCE_OBLIGATION_REGISTRY)
    .filter((obligation) => !id || obligation.id === id)
    .map(cloneValue);
}

export function getComplianceObligation(obligationId) {
  const definition =
    COMPLIANCE_OBLIGATION_REGISTRY[normalizeRegistryKey(obligationId)];

  return definition ? cloneValue(definition) : null;
}

export function getComplianceCenterModel() {
  return {
    readOnly: true,
    purpose:
      "Compliance Center will organize closure obligations, required evidence, review status, and responsible parties.",
    complianceMessage: COMPLIANCE_CENTER_MESSAGE,
    obligations: getComplianceObligations(),
    lifecycle: [...COMPLIANCE_LIFECYCLE],
    complianceRecordFields: [...COMPLIANCE_RECORD_FIELDS],
    closureDependencies: [...COMPLIANCE_CLOSURE_DEPENDENCIES],
  };
}

export function getComplianceCenterReport() {
  const model = getComplianceCenterModel();

  return {
    readOnly: model.readOnly,
    obligationCount: model.obligations.length,
    obligations: model.obligations.map((obligation) => obligation.id),
    lifecycleStepCount: model.lifecycle.length,
    closureDependencyCount: model.closureDependencies.length,
  };
}
