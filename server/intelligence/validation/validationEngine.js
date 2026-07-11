import { VALIDATION_ENGINE_ID, VALIDATION_ENGINE_PRIORITY, VALIDATION_LIMITS, emptyValidationContext } from "./validationContracts.js";
import { VALIDATION_AUTHORITY_MATRIX } from "./validationAuthorityMatrix.js";
import { detectScopeConflicts, detectValidationContradictions } from "./validationContradictions.js";
import { assessEngines, buildValidationEvidence } from "./validationEvidence.js";
import { validationLog } from "./validationLogging.js";
import { resolveValidationPolicy } from "./validationResponsePolicy.js";

function agreements(collected = {}) {
  const values = [];
  const action = collected.workflow?.nextAction?.action;
  const capabilityId = collected.capabilities?.selectedCapability?.capabilityId;
  if (action && capabilityId && ((action === "create_proposal" && capabilityId === "workflow.prepare_quote") || (action === "record_completion" && capabilityId === "workflow.prepare_completion"))) values.push({ topic: "next_action", engineIds: ["workflow", "capability"], normalizedValue: action, strength: "strong" });
  if (collected.knowledge?.knowledgeStatus === "supported" && collected.capabilities?.selectedCapability?.domain === "knowledge") values.push({ topic: "knowledge_support", engineIds: ["knowledge", "capability"], normalizedValue: "supported", strength: "strong" });
  return values.sort((a, b) => a.topic.localeCompare(b.topic)).slice(0, VALIDATION_LIMITS.agreements);
}

export function validationEngineSupports(collected = {}) {
  return ["workflow", "relationship", "persistentMemory", "business", "community", "knowledge", "capabilities", "contracts"].some((key) => collected[key] && Object.keys(collected[key]).length);
}

export async function collectIntelligenceValidation({ request = {}, collected = {}, logger = null } = {}) {
  const startedAt = Date.now();
  validationLog(logger, "info", "intelligence.validation.started", { requestId: request.requestId });
  const snapshot = structuredClone(collected);
  const engineAssessment = assessEngines(snapshot);
  if (!Object.values(engineAssessment).some((item) => item.present)) return emptyValidationContext();
  const evidenceItems = buildValidationEvidence(snapshot);
  const contradictions = detectValidationContradictions(snapshot).slice(0, VALIDATION_LIMITS.contradictions);
  const scopeConflicts = detectScopeConflicts(snapshot);
  const staleEvidence = evidenceItems.filter((item) => ["stale", "expired"].includes(item.freshness));
  const missingEvidence = [];
  if (snapshot.capabilities?.selectedCapability && !snapshot.capabilities?.evidence?.length) missingEvidence.push("capability_support");
  if (snapshot.knowledge?.facts?.some((fact) => !fact.sourceIds?.length)) missingEvidence.push("knowledge_source_ids");
  const agreementItems = agreements(snapshot);
  const policy = resolveValidationPolicy({ assessed: engineAssessment, contradictions, staleEvidence, missingEvidence, scopeConflicts, collected: snapshot });
  const result = {
    ...policy,
    engineAssessment,
    authorityMatrixVersion: "1.0",
    evidence: {
      supportingEngineIds: [...new Set(evidenceItems.map((item) => item.engineId))].sort(),
      supportingSourceIds: [...new Set(evidenceItems.filter((item) => item.engineId === "knowledge").map((item) => item.sourceId))].sort(),
      supportingRecordIds: [...new Set(evidenceItems.filter((item) => item.engineId !== "knowledge").map((item) => item.sourceId))].sort(),
      references: evidenceItems,
      unsupportedClaims: [...missingEvidence],
    },
    agreements: agreementItems, contradictions, staleEvidence, missingEvidence, scopeConflicts,
    authorityConflicts: contradictions.filter((item) => item.authoritativeEngineId && !VALIDATION_AUTHORITY_MATRIX[item.topic]),
    warnings: [...new Set([...contradictions.map((item) => item.code), ...scopeConflicts.map((item) => item.code)])].slice(0, VALIDATION_LIMITS.warnings),
    metadata: { truncated: contradictions.length >= VALIDATION_LIMITS.contradictions || evidenceItems.length >= VALIDATION_LIMITS.evidence },
  };
  validationLog(logger, "info", "intelligence.validation.completed", { requestId: request.requestId, status: result.status, overallConfidence: result.overallConfidence, responseMode: result.responseMode, assessedEngineCount: Object.values(engineAssessment).filter((item) => item.present).length, agreementCount: agreementItems.length, contradictionCount: contradictions.length, criticalContradictionCount: contradictions.filter((item) => item.severity === "critical").length, missingEvidenceCount: missingEvidence.length, staleEvidenceCount: staleEvidence.length, clarificationRequired: result.responseConstraints.clarificationRequired, escalationRequired: result.responseConstraints.escalationRequired, elapsedMs: Date.now() - startedAt });
  return result;
}

export const validationEngine = Object.freeze({ id: VALIDATION_ENGINE_ID, priority: VALIDATION_ENGINE_PRIORITY, supports: () => true, async collectContext(request, collected = {}) { return { section: "validation", priority: VALIDATION_ENGINE_PRIORITY, data: await collectIntelligenceValidation({ request, collected }) }; } });
