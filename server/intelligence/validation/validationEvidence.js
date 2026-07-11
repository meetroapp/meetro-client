import { VALIDATION_LIMITS } from "./validationContracts.js";

function confidence(value) {
  if (["high", "medium", "low"].includes(value)) return value;
  if (typeof value === "number") return value >= 0.8 ? "high" : value >= 0.5 ? "medium" : "low";
  return null;
}

export function assessEngines(collected = {}) {
  const ids = ["workflow", "relationship", "persistentMemory", "business", "community", "knowledge", "capabilities", "contracts"];
  return Object.fromEntries(ids.map((id) => {
    const data = collected[id];
    const present = Boolean(data && typeof data === "object" && Object.keys(data).length);
    return [id === "capabilities" ? "capability" : id, { present, confidence: present ? confidence(data.confidenceLevel || data.confidence || data.businessHealth?.confidence) : null, relevant: present, warnings: Array.isArray(data?.warnings) ? data.warnings.slice(0, 8) : [] }];
  }));
}

export function buildValidationEvidence(collected = {}) {
  const evidence = [];
  const add = (engineId, evidenceType, sourceId, topic, freshness = "unknown", level = "medium") => {
    if (!sourceId) return;
    evidence.push({ evidenceId: `${engineId}:${topic}:${sourceId}`, engineId, evidenceType, sourceId, topic, authority: "authoritative", freshness, confidence: level });
  };
  add("workflow", "workflow_record", collected.workflow?.workflowId, "workflow_stage", "current", collected.workflow?.confidenceLevel);
  add("relationship", "relationship_record", collected.relationship?.relationshipId, "relationship_continuity", "current", collected.relationship?.confidenceLevel);
  add("business", "business_scope", collected.business?.businessId, "business_operations", "current", collected.business?.confidence);
  add("community", "community_scope", collected.community?.communityId, "community_activity", "current", collected.community?.confidence);
  for (const source of collected.knowledge?.sources || []) add("knowledge", "knowledge_source", source.sourceId, "verified_knowledge", collected.knowledge?.freshness?.classification, collected.knowledge?.confidence);
  if (collected.capabilities?.selectedCapability?.capabilityId) add("capability", "capability_definition", collected.capabilities.selectedCapability.capabilityId, "capability_selection", "current", collected.capabilities.confidence);
  return [...new Map(evidence.map((item) => [item.evidenceId, item])).values()].sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)).slice(0, VALIDATION_LIMITS.evidence);
}

