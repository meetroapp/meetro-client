import { CAPABILITY_CATEGORIES, CAPABILITY_MODES, CAPABILITY_RISKS } from "./capabilityContracts.js";
import { CAPABILITY_DEFINITIONS } from "./capabilityDefinitions.js";

export function validateCapabilityDefinition(value = {}) {
  const errors = [];
  if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(value.capabilityId || "")) errors.push("invalid_capability_id");
  if (!value.name || !value.domain) errors.push("missing_identity");
  if (!CAPABILITY_CATEGORIES.includes(value.category)) errors.push("invalid_category");
  if (!CAPABILITY_MODES.includes(value.executionMode)) errors.push("invalid_execution_mode");
  if (!CAPABILITY_RISKS.includes(value.riskLevel)) errors.push("invalid_risk_level");
  for (const field of ["supportedRoles", "requiredScopes", "requiredPermissions", "requiredInputs", "optionalInputs", "prerequisites", "supportedFeatures", "supportingEngines"]) {
    if (!Array.isArray(value[field])) errors.push(`invalid_${field}`);
  }
  if (!["active", "planned", "deprecated", "disabled", "restricted"].includes(value.status)) errors.push("invalid_status");
  return { valid: errors.length === 0, errors };
}

export function createCapabilityRegistry(definitions = CAPABILITY_DEFINITIONS) {
  const entries = new Map();
  for (const definition of definitions) {
    const validation = validateCapabilityDefinition(definition);
    if (!validation.valid) throw new TypeError(`Invalid capability ${definition.capabilityId || "unknown"}: ${validation.errors.join(",")}`);
    if (entries.has(definition.capabilityId)) throw new Error(`Duplicate capability: ${definition.capabilityId}`);
    entries.set(definition.capabilityId, Object.freeze(structuredClone(definition)));
  }
  return Object.freeze({
    listCapabilities(query = {}) {
      return [...entries.values()].filter((item) => !query.domain || item.domain === query.domain).sort((a, b) => a.capabilityId.localeCompare(b.capabilityId)).map((item) => structuredClone(item));
    },
    getCapabilityById(capabilityId) { const item = entries.get(capabilityId); return item ? structuredClone(item) : null; },
    findCapabilitiesByIntent(intent = {}) { return [...entries.values()].filter((item) => item.supportedFeatures.includes(intent.feature) || item.capabilityId === intent.capabilityId).sort((a, b) => a.capabilityId.localeCompare(b.capabilityId)).map((item) => structuredClone(item)); },
    validateCapability: validateCapabilityDefinition,
  });
}

export const capabilityRegistry = createCapabilityRegistry();
