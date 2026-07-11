export const KNOWLEDGE_ENGINE_ID = "knowledge";
export const KNOWLEDGE_ENGINE_PRIORITY = 95;

export const KNOWLEDGE_STATUS = Object.freeze([
  "supported", "partially_supported", "conflicted", "insufficient_evidence",
  "unauthorized", "stale_only", "unknown",
]);

export const KNOWLEDGE_LIMITS = Object.freeze({
  consideredSources: 100,
  returnedSources: 5,
  facts: 12,
  guidance: 8,
  excerpts: 5,
  excerptCharacters: 600,
  serializedBytes: 24_000,
});

export function emptyKnowledgeContext({ domain = "unknown", intent = "reasoning", language = "en", status = "insufficient_evidence" } = {}) {
  return {
    query: { domain, intent, language, productVersion: null },
    knowledgeStatus: status,
    sources: [], facts: [], guidance: [], conflicts: [],
    freshness: { classification: "unknown", oldestSourceUpdatedAt: null, staleSourceCount: 0 },
    retrieval: { consideredSources: 0, authorizedSources: 0, matchedSources: 0, returnedSources: 0, truncated: false },
    confidence: "low",
    disclaimers: status === "insufficient_evidence" ? ["insufficient_verified_knowledge"] : [],
    warnings: [],
  };
}

export function isRepositoryRelativePath(value = "") {
  return typeof value === "string" && value.length > 0 && !value.startsWith("/") && !value.includes("..") && !/^[a-z]+:\/\//i.test(value);
}

