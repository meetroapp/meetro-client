import { Buffer } from "node:buffer";
import { KNOWLEDGE_ENGINE_ID, KNOWLEDGE_ENGINE_PRIORITY, KNOWLEDGE_LIMITS, emptyKnowledgeContext } from "./knowledgeContracts.js";
import { resolveKnowledgeDomain, isSupportedKnowledgeDomain } from "./knowledgeDomains.js";
import { buildKnowledgeDisclaimers } from "./knowledgeDisclaimers.js";
import { classifyKnowledgeFreshness } from "./knowledgeFreshness.js";
import { detectKnowledgeConflicts } from "./knowledgeConflicts.js";
import { knowledgeLog } from "./knowledgeLogging.js";
import { resolveKnowledgeRepository } from "./knowledgeRepository.js";
import { retrieveKnowledge } from "./knowledgeRetrieval.js";
import { resolveKnowledgeScope } from "./knowledgeScopeResolver.js";

function overallFreshness(sources, now) {
  const states = sources.map((source) => classifyKnowledgeFreshness(source, now));
  if (states.includes("stale")) return "stale";
  if (states.includes("aging")) return "aging";
  if (states.length && states.every((item) => item === "current")) return "current";
  return "unknown";
}

function confidenceFor({ selected, conflicts, freshness }) {
  if (!selected.length || conflicts.length || freshness === "stale") return "low";
  if (selected.some((source) => source.authority === "authoritative") && freshness === "current") return "high";
  return "medium";
}

function statusFor({ selected, facts, guidance, conflicts, freshness, unauthorized }) {
  if (conflicts.length) return "conflicted";
  if (!selected.length) return unauthorized ? "unauthorized" : "insufficient_evidence";
  if (freshness === "stale") return "stale_only";
  if (!facts.length && !guidance.length) return "insufficient_evidence";
  return "supported";
}

export function knowledgeEngineSupports(request = {}) {
  return isSupportedKnowledgeDomain(resolveKnowledgeDomain(request));
}

export async function collectKnowledgeIntelligence({ request = {}, logger = null, now = Date.now() } = {}) {
  const startedAt = Date.now();
  const domain = resolveKnowledgeDomain(request);
  const scope = resolveKnowledgeScope(request);
  const query = { domain, intent: request.intent || "reasoning", language: scope.language, productVersion: scope.productVersion, text: request.message || "", sourceId: request.backendContext?.knowledgeSourceId || null };
  knowledgeLog(logger, "info", "intelligence.knowledge.started", { requestId: request.requestId, domain });
  if (!isSupportedKnowledgeDomain(domain)) return emptyKnowledgeContext({ domain, intent: query.intent, language: query.language });
  const repository = resolveKnowledgeRepository(request);
  if (!repository) return emptyKnowledgeContext({ domain, intent: query.intent, language: query.language });
  try {
    const result = await retrieveKnowledge({ repository, query, scope, now });
    const conflicts = detectKnowledgeConflicts(result.selected);
    const freshness = overallFreshness(result.selected, now);
    const unauthorized = result.discovered.length > 0 && result.authorized.length === 0;
    const status = statusFor({ selected: result.selected, facts: result.facts, guidance: result.guidance, conflicts, freshness, unauthorized });
    const confidence = confidenceFor({ selected: result.selected, conflicts, freshness });
    const context = {
      query,
      knowledgeStatus: status,
      sources: result.sources,
      facts: conflicts.length ? [] : result.facts,
      guidance: conflicts.length ? [] : result.guidance,
      conflicts,
      freshness: {
        classification: freshness,
        oldestSourceUpdatedAt: result.selected.map((item) => item.updatedAt).filter(Boolean).sort()[0] || null,
        staleSourceCount: result.selected.filter((item) => classifyKnowledgeFreshness(item, now) === "stale").length,
      },
      retrieval: {
        consideredSources: result.discovered.length, authorizedSources: result.authorized.length,
        matchedSources: result.matched.length, returnedSources: result.selected.length, truncated: result.truncated,
      },
      confidence,
      disclaimers: buildKnowledgeDisclaimers({ domain, status, conflicts, freshness }),
      warnings: [...new Set([
        conflicts.length ? "active_source_conflict" : null,
        freshness === "stale" ? "stale_source_warning" : null,
        query.productVersion && result.selected.some((item) => item.productVersion && item.productVersion !== query.productVersion) ? "product_version_mismatch" : null,
      ].filter(Boolean))],
    };
    if (Buffer.byteLength(JSON.stringify(context)) > KNOWLEDGE_LIMITS.serializedBytes) {
      context.guidance = context.guidance.slice(0, 2);
      context.facts = context.facts.slice(0, 4);
      context.retrieval.truncated = true;
    }
    await repository.recordRetrievalUsage?.({ requestId: request.requestId, domain, knowledgeStatus: status, returnedSourceCount: context.sources.length });
    knowledgeLog(logger, "info", "intelligence.knowledge.context_built", {
      requestId: request.requestId, domain, consideredSourceCount: result.discovered.length,
      authorizedSourceCount: result.authorized.length, matchedSourceCount: result.matched.length,
      returnedSourceCount: result.selected.length, conflictCount: conflicts.length,
      knowledgeStatus: status, confidence, truncated: context.retrieval.truncated, elapsedMs: Date.now() - startedAt,
    });
    return context;
  } catch {
    knowledgeLog(logger, "warn", "intelligence.knowledge.failed", { requestId: request.requestId, domain, elapsedMs: Date.now() - startedAt });
    return emptyKnowledgeContext({ domain, intent: query.intent, language: query.language, status: "unknown" });
  }
}

export const knowledgeEngine = Object.freeze({
  id: KNOWLEDGE_ENGINE_ID,
  priority: KNOWLEDGE_ENGINE_PRIORITY,
  supports: knowledgeEngineSupports,
  async collectContext(request) {
    return { section: "knowledge", priority: KNOWLEDGE_ENGINE_PRIORITY, data: await collectKnowledgeIntelligence({ request }) };
  },
});

