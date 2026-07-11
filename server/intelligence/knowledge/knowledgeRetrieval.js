import { authorityRank, canVerifyFacts } from "./knowledgeAuthority.js";
import { authorizeKnowledgeSource } from "./knowledgeConfidentiality.js";
import { KNOWLEDGE_LIMITS, isRepositoryRelativePath } from "./knowledgeContracts.js";
import { classifyKnowledgeFreshness, sourceIsActive } from "./knowledgeFreshness.js";
import { validateKnowledgeSource } from "./knowledgeSourceContract.js";

function words(value = "") {
  return new Set(String(value || "").toLowerCase().match(/[a-z0-9_]{3,}/g) || []);
}

function intersects(left, right) {
  let count = 0;
  left.forEach((item) => { if (right.has(item)) count += 1; });
  return count;
}

function relevance(source, query) {
  let score = 0;
  if (query.sourceId && source.sourceId === query.sourceId) score += 1000;
  if (source.domain === query.domain) score += 300;
  if ((source.subdomains || []).includes(query.domain)) score += 180;
  if (source.language === query.language) score += 60;
  if (query.productVersion && source.productVersion === query.productVersion) score += 80;
  const haystack = words([source.title, ...(source.tags || []), ...(source.subdomains || []), ...(source.headings || [])].join(" "));
  score += intersects(words(query.text), haystack) * 10;
  score += authorityRank(source.authority) * 20;
  const freshness = classifyKnowledgeFreshness(source, query.now);
  score += freshness === "current" ? 30 : freshness === "aging" ? 10 : freshness === "stale" ? -20 : -10;
  return score;
}

function safeSourceReference(source) {
  return {
    sourceId: source.sourceId,
    sourceType: source.sourceType,
    title: source.confidentiality === "restricted" ? "Restricted approved source" : source.title,
    domain: source.domain,
    authority: source.authority,
    confidentiality: source.confidentiality,
    version: source.version || null,
    effectiveAt: source.effectiveAt || null,
    updatedAt: source.updatedAt || null,
    ...(isRepositoryRelativePath(source.repositoryPath) && source.confidentiality !== "restricted" ? { repositoryPath: source.repositoryPath } : {}),
    citationLabel: source.citationLabel || source.title,
    excerptId: source.contentReference?.sectionId || null,
  };
}

function minimizeExcerpt(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, KNOWLEDGE_LIMITS.excerptCharacters);
}

function factsFrom(source) {
  if (!canVerifyFacts(source)) return [];
  return (source.facts || [])
    .filter((fact) => fact?.factId && fact.subject && fact.predicate && fact.value !== undefined)
    .map((fact) => ({ ...fact, sourceIds: [source.sourceId], status: "verified", confidence: source.authority === "authoritative" ? "high" : "medium" }));
}

function guidanceFrom(source) {
  const structured = (source.guidance || []).filter((item) => item?.code && item.summary).map((item) => ({
    code: item.code, summary: minimizeExcerpt(item.summary), sourceIds: [source.sourceId], authority: source.authority,
  }));
  if (structured.length) return structured;
  const excerpt = minimizeExcerpt(source.excerpt);
  return excerpt ? [{ code: `source_excerpt:${source.contentReference?.sectionId || source.sourceId}`, summary: excerpt, sourceIds: [source.sourceId], authority: source.authority }] : [];
}

export async function retrieveKnowledge({ repository, query, scope, now = Date.now() } = {}) {
  const discovered = (await repository.listSources({ domain: query.domain, language: query.language }))
    .filter((source) => validateKnowledgeSource(source).valid)
    .slice(0, KNOWLEDGE_LIMITS.consideredSources);
  const authorized = discovered.filter((source) => authorizeKnowledgeSource(source, scope));
  const eligible = authorized.filter((source) => sourceIsActive(source, { historical: scope.historical, now }));
  const matched = eligible
    .map((source) => ({ source, score: relevance(source, { ...query, now }) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.source.sourceId.localeCompare(b.source.sourceId));
  const selected = matched.slice(0, KNOWLEDGE_LIMITS.returnedSources).map((entry) => entry.source);
  const facts = selected.flatMap(factsFrom).slice(0, KNOWLEDGE_LIMITS.facts);
  const guidance = selected.flatMap(guidanceFrom).slice(0, KNOWLEDGE_LIMITS.guidance);
  return {
    discovered, authorized, matched: matched.map((entry) => entry.source), selected,
    sources: selected.map(safeSourceReference), facts, guidance,
    truncated: matched.length > selected.length || facts.length >= KNOWLEDGE_LIMITS.facts || guidance.length >= KNOWLEDGE_LIMITS.guidance,
  };
}
