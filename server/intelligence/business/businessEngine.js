import { BUSINESS_CONTEXT_LIMITS, BUSINESS_ENGINE_ID, BUSINESS_ENGINE_PRIORITY, emptyBusinessContext } from "./businessContracts.js";
import { buildBusinessBottlenecks } from "./businessBottlenecks.js";
import { evaluateBusinessConfidence } from "./businessConfidence.js";
import { deduplicateBusinessRecords } from "./businessDeduplication.js";
import { buildBusinessFinancialSignals } from "./businessFinancialSignals.js";
import { classifyBusinessHealth } from "./businessHealth.js";
import { normalizeBusinessRecord } from "./businessNormalizer.js";
import { buildBusinessPipeline } from "./businessPipeline.js";
import { buildBusinessPriorities } from "./businessPriorities.js";
import { buildBusinessResponsibility } from "./businessResponsibility.js";
import { buildBusinessScheduling } from "./businessScheduling.js";
import { resolveBusinessSource } from "./businessSourceResolver.js";
import { buildBusinessTrends } from "./businessTrends.js";
import { buildBusinessWorkload } from "./businessWorkload.js";

function capacityPreference(persistentMemory = {}) {
  const memory = (persistentMemory.memories || []).find((item) =>
    item.scope === "business" && item.category === "business_preference" && item.key === "scheduling_capacity"
  );
  const value = memory?.value?.capacity;
  return ["available", "medium", "busy", "full"].includes(value) ? value : null;
}

function workflowHealth(workflows = []) {
  return {
    blocked: workflows.filter((item) => item.blockers.length > 0).length,
    completionBacklog: workflows.filter((item) => ["completed", "work_completed"].includes(item.status) && !item.completionRecorded).length,
    closureBacklog: workflows.filter((item) => item.completionRecorded && !item.closureRecorded).length,
    historyReconciliationBacklog: workflows.filter((item) => item.closureRecorded && !item.historyRecorded).length,
  };
}

function safeEvidence({ workload, pipeline, responsibility, health }) {
  return [
    { type: "workflow_count", count: workload.totalOpenWorkflows },
    { type: "active_job_count", count: workload.activeJobs },
    { type: "closure_backlog", count: health.closureBacklog },
    { type: "proposal_pipeline", count: pipeline.proposalsDraft + pipeline.proposalsSent },
    { type: "waiting_on_professional", count: responsibility.waitingOnProfessional },
  ].filter((item) => item.count > 0).slice(0, BUSINESS_CONTEXT_LIMITS.evidence);
}

export function businessEngineSupports(request = {}) {
  const role = String(request.user?.accountType || request.user?.role || request.user?.userRole || "").toLowerCase();
  const professional = ["professional", "business", "contractor"].includes(role) || request.user?.isProfessional === true;
  const ids = request.backendContext?.authorizedBusinessIds || request.user?.authorizedBusinessIds || [];
  return Boolean(request.userId && (professional || request.user?.businessId || request.backendContext?.businessId || ids.length));
}

export async function collectBusinessIntelligence({ request = {}, collected = {}, logger = null, now = Date.now() } = {}) {
  const startedAt = Date.now();
  logger?.info?.("intelligence.business.started", { requestId: request.requestId });
  try {
    const resolution = await resolveBusinessSource({ request });
    if (!resolution || !resolution.records.length) return emptyBusinessContext();
    logger?.info?.("intelligence.business.scope_resolved", { requestId: request.requestId, businessId: resolution.businessId });
    const normalized = resolution.records.map(normalizeBusinessRecord);
    const { workflows, typedRecords, warnings: dedupeWarnings } = deduplicateBusinessRecords(normalized);
    const timezone = request.backendContext?.businessTimezone || request.backendContext?.businessProfile?.timezone || "UTC";
    const workload = buildBusinessWorkload({ workflows, typedRecords, now, timezone });
    const pipeline = buildBusinessPipeline({ workflows, typedRecords });
    const responsibility = buildBusinessResponsibility(workflows);
    const health = workflowHealth(workflows);
    const { signals: financialSignals, warnings: financialWarnings } = buildBusinessFinancialSignals(typedRecords);
    const scheduling = buildBusinessScheduling({ workload, pipeline, typedRecords, capacityDefault: capacityPreference(collected.persistentMemory) });
    const bottlenecks = buildBusinessBottlenecks({ workload, pipeline, responsibility, workflowHealth: health, financialSignals, scheduling });
    const priorities = buildBusinessPriorities(bottlenecks);
    const warnings = [...new Set([...dedupeWarnings, ...financialWarnings])];
    const confidence = evaluateBusinessConfidence({
      recordCount: normalized.length,
      warnings,
      missingTimestamps: normalized.filter((item) => !item.createdAt && !item.updatedAt && !item.scheduledAt).length,
    });
    const businessHealth = classifyBusinessHealth({ workload, responsibility, workflowHealth: health, scheduling, evidenceCount: normalized.length });
    businessHealth.confidence = confidence === "low" ? "low" : businessHealth.confidence;
    const context = {
      businessId: resolution.businessId,
      source: resolution.source,
      businessHealth,
      workload,
      pipeline,
      responsibility,
      workflowHealth: health,
      financialSignals,
      scheduling,
      bottlenecks,
      priorities,
      trends: buildBusinessTrends(normalized),
      evidence: safeEvidence({ workload, pipeline, responsibility, health }),
      warnings,
      metadata: { timezone, truncated: false },
    };
    logger?.info?.("intelligence.business.context_built", {
      requestId: request.requestId, businessId: resolution.businessId, workflowCount: workflows.length,
      bottleneckCount: bottlenecks.length, priorityCount: priorities.length,
      healthClassification: businessHealth.classification, confidence: businessHealth.confidence,
      truncated: false, elapsedMs: Date.now() - startedAt,
    });
    return context;
  } catch {
    logger?.warn?.("intelligence.business.failed", { requestId: request.requestId, elapsedMs: Date.now() - startedAt });
    return emptyBusinessContext();
  }
}

export const businessEngine = Object.freeze({
  id: BUSINESS_ENGINE_ID, priority: BUSINESS_ENGINE_PRIORITY,
  supports: businessEngineSupports,
  async collectContext(request, collected = {}) {
    return { section: "business", priority: BUSINESS_ENGINE_PRIORITY, data: await collectBusinessIntelligence({ request, collected }) };
  },
});
