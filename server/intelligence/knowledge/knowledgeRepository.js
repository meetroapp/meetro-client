import { validateKnowledgeSource } from "./knowledgeSourceContract.js";

function clone(value) { return structuredClone(value); }

export function createInMemoryKnowledgeRepository(sources = []) {
  const records = [...new Map(
    sources.filter((source) => validateKnowledgeSource(source).valid).map((source) => [source.sourceId, clone(source)])
  ).values()];
  return Object.freeze({
    async listSources() { return records.map(clone); },
    async getSourceById(sourceId) { const source = records.find((item) => item.sourceId === sourceId); return source ? clone(source) : null; },
    async searchSources() { return records.map(clone); },
    async listFacts() { return []; },
    async getExcerpts() { return []; },
    async recordRetrievalUsage() {},
  });
}

export function resolveKnowledgeRepository(request = {}) {
  const repository = request.repositories?.knowledge || request.backendContext?.knowledgeRepository;
  return repository && typeof repository.listSources === "function" ? repository : null;
}
