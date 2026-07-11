import { buildCompanionCapabilities } from "./companionCapabilityEngine.js";
import { CAPABILITY_ENGINE_ID, CAPABILITY_ENGINE_PRIORITY, emptyCapabilityContext } from "./capabilityContracts.js";
import { evaluateCapabilityAuthorization } from "./capabilityAuthorization.js";
import { resolveCapabilityIntent } from "./capabilityIntentResolver.js";
import { capabilityLog } from "./capabilityLogging.js";
import { buildCapabilityNextStep } from "./capabilityNextStep.js";
import { capabilityRegistry } from "./capabilityRegistry.js";
import { evaluateCapabilityInputs, evaluateCapabilityPrerequisites } from "./capabilityRequirements.js";

function availability(capability) {
  if (capability.status === "planned" || capability.status === "disabled") return "unavailable";
  if (capability.status === "restricted") return "restricted";
  if (capability.status === "deprecated") return "unavailable";
  return "active";
}

function determineStatus(capability, authorization, prerequisites, inputs) {
  const available = availability(capability);
  if (available !== "active") return available;
  if (authorization.permissionStatus !== "allowed") return "restricted";
  if (prerequisites.missing.length) return "blocked";
  if (inputs.missing.length || inputs.invalid.length) return "available_with_missing_inputs";
  return "available";
}

function alternativesFor(intent, registry, selectedId) {
  const candidates = registry.findCapabilitiesByIntent(intent)
    .filter((item) => item.capabilityId !== selectedId && item.status === "active")
    .slice(0, 3)
    .map((item) => ({ capabilityId: item.capabilityId, label: item.name, mode: item.executionMode }));
  return [...new Map(candidates.map((item) => [item.capabilityId, item])).values()];
}

export function capabilityEngineSupports(request = {}, registry = capabilityRegistry) {
  if (resolveCapabilityIntent(request, registry).capabilityId) return true;
  const legacy = buildCompanionCapabilities({ userMessage: request.message, intent: request.intent });
  return legacy.primaryCapabilities.length > 0;
}

export async function collectCapabilityIntelligence({ request = {}, collected = {}, registry = capabilityRegistry, logger = null } = {}) {
  const startedAt = Date.now();
  const legacy = buildCompanionCapabilities({ userMessage: request.message, intent: request.intent, context: collected.context || {}, knowledge: collected.knowledge || {} });
  capabilityLog(logger, "info", "intelligence.capability.started", { requestId: request.requestId });
  const intent = resolveCapabilityIntent(request, registry);
  if (!intent.capabilityId) {
    const empty = emptyCapabilityContext(intent.reasonCode || "unsupported_intent");
    empty.intent = { intentId: intent.intentId, category: intent.category, confidence: intent.confidence, source: intent.source };
    return { ...empty, ...legacy };
  }
  const capability = registry.getCapabilityById(intent.capabilityId);
  if (!capability) return { ...emptyCapabilityContext("capability_not_available"), ...legacy };
  const authorization = evaluateCapabilityAuthorization({ capability, request, collected });
  const prerequisites = evaluateCapabilityPrerequisites(capability, authorization, collected);
  const requiredInputs = evaluateCapabilityInputs(capability, request, collected);
  const evaluatedStatus = determineStatus(capability, authorization, prerequisites, requiredInputs);
  const status = intent.ambiguity?.length > 1 && ["available", "available_with_missing_inputs"].includes(evaluatedStatus)
    ? "ambiguous"
    : evaluatedStatus;
  const explicitAlternatives = (intent.ambiguity || []).filter((id) => id !== capability.capabilityId).map((id) => registry.getCapabilityById(id)).filter(Boolean).map((item) => ({ capabilityId: item.capabilityId, label: item.name, mode: item.executionMode }));
  const alternatives = [...new Map([...explicitAlternatives, ...alternativesFor(intent, registry, capability.capabilityId)].map((item) => [item.capabilityId, item])).values()].slice(0, 3);
  const highImpact = capability.riskLevel === "high_impact" || capability.executionMode === "user_approved";
  const result = {
    intent: { intentId: intent.intentId, category: intent.category, confidence: intent.confidence, source: intent.source },
    requestedOutcome: { code: intent.requestedOutcome, label: capability.name, mode: capability.executionMode },
    selectedCapability: {
      capabilityId: capability.capabilityId, name: capability.name, domain: capability.domain,
      status, executionMode: capability.executionMode, riskLevel: capability.riskLevel,
      version: capability.version,
    },
    alternatives,
    authorization,
    prerequisites,
    requiredInputs,
    supportingEngines: [...capability.supportingEngines],
    nextStep: status === "ambiguous"
      ? { code: intent.intentId, type: "request_confirmation", actor: "user", approvalRequired: false, label: "Choose whether to review the existing invoice or prepare a new draft." }
      : buildCapabilityNextStep({ capability, authorization, prerequisites, inputs: requiredInputs, status }),
    clarification: status === "ambiguous" ? { required: true, code: intent.intentId } : { required: false, code: null },
    execution: { performed: false, executableNow: false, requiresExplicitApproval: highImpact, executionCapabilityId: null },
    status,
    confidence: authorization.permissionStatus === "allowed" && intent.confidence === "high" ? "high" : status === "restricted" ? "low" : "medium",
    evidence: [
      collected.workflow?.workflowId ? { type: "workflow_scope", present: true } : null,
      collected.relationship?.relationshipId ? { type: "relationship_scope", present: true } : null,
      collected.knowledge?.knowledgeStatus ? { type: "knowledge_status", value: collected.knowledge.knowledgeStatus } : null,
    ].filter(Boolean),
    warnings: [
      capability.status === "deprecated" ? `replacement:${capability.replacementCapabilityId || "none"}` : null,
      highImpact ? "separate_explicit_approval_required" : null,
    ].filter(Boolean),
    ...legacy,
  };
  capabilityLog(logger, "info", "intelligence.capability.context_built", {
    requestId: request.requestId, intentId: intent.intentId, capabilityId: capability.capabilityId,
    status, category: capability.category, riskLevel: capability.riskLevel,
    missingInputCount: requiredInputs.missing.length, blockedPrerequisiteCount: prerequisites.missing.length,
    alternativeCount: alternatives.length, confidence: result.confidence, elapsedMs: Date.now() - startedAt,
  });
  return result;
}

export const capabilityEngine = Object.freeze({
  id: CAPABILITY_ENGINE_ID,
  priority: CAPABILITY_ENGINE_PRIORITY,
  supports: capabilityEngineSupports,
  async collectContext(request, collected = {}) {
    return { section: "capabilities", priority: CAPABILITY_ENGINE_PRIORITY, data: await collectCapabilityIntelligence({ request, collected }) };
  },
});
