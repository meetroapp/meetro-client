import crypto from "node:crypto";

function clone(value) { return structuredClone(value); }
function id(prefix) { return `${prefix}-${crypto.randomUUID()}`; }

export function createInMemoryPersistentMemoryRepository({ now = () => Date.now() } = {}) {
  const memories = new Map();
  const proposals = new Map();
  const usages = [];
  return {
    isTestAdapter: true,
    async createMemory(memory) {
      const record = clone({ ...memory, memoryId: memory.memoryId || id("memory") });
      memories.set(record.memoryId, record); return clone(record);
    },
    async getMemoryById(memoryId) { return memories.has(memoryId) ? clone(memories.get(memoryId)) : null; },
    async listMemories() { return [...memories.values()].map(clone); },
    async updateMemory(memoryId, changes) {
      const current = memories.get(memoryId); if (!current) return null;
      const updated = clone({ ...current, ...changes }); memories.set(memoryId, updated); return clone(updated);
    },
    async correctMemory(memoryId, replacement) {
      const current = memories.get(memoryId); if (!current) return null;
      memories.set(memoryId, clone({ ...current, lifecycle: { ...current.lifecycle, status: "superseded", updatedAt: new Date(now()).toISOString() } }));
      const next = clone({ ...replacement, memoryId: replacement.memoryId || id("memory") }); memories.set(next.memoryId, next);
      return { previous: clone(memories.get(memoryId)), current: clone(next) };
    },
    async deleteMemory(memoryId, deletion) {
      const current = memories.get(memoryId); if (!current) return null;
      const deleted = clone({ ...current, lifecycle: { ...current.lifecycle, status: "deleted", deletedAt: deletion.deletedAt, updatedAt: deletion.deletedAt }, deletion: clone(deletion) });
      memories.set(memoryId, deleted); return clone(deleted);
    },
    async deleteMemories(predicate, deletion) {
      const deleted = [];
      for (const memory of memories.values()) if (predicate(memory)) deleted.push(await this.deleteMemory(memory.memoryId, deletion));
      return deleted;
    },
    async purgeDeletedMemories(predicate = () => true) {
      let count = 0; for (const [key, memory] of memories) if (memory.lifecycle?.status === "deleted" && predicate(memory)) { memories.delete(key); count += 1; }
      return { purgedCount: count };
    },
    async expireMemory(memoryId, expiredAt) { return this.updateMemory(memoryId, { lifecycle: { ...memories.get(memoryId)?.lifecycle, status: "expired", updatedAt: expiredAt } }); },
    async recordMemoryUsage(memoryId, usage) { usages.push({ memoryId, ...clone(usage) }); return { ok: true }; },
    async createProposal(proposal) { const record = clone({ ...proposal, proposalId: proposal.proposalId || id("memory-proposal") }); proposals.set(record.proposalId, record); return clone(record); },
    async getProposalById(proposalId) { return proposals.has(proposalId) ? clone(proposals.get(proposalId)) : null; },
    async confirmProposal(proposalId, confirmation) { const current = proposals.get(proposalId); if (!current) return null; const next = clone({ ...current, status: "confirmed", confirmation }); proposals.set(proposalId, next); return clone(next); },
    async rejectProposal(proposalId, reason) { const current = proposals.get(proposalId); if (!current) return null; const next = clone({ ...current, status: "rejected", rejection: reason }); proposals.set(proposalId, next); return clone(next); },
    inspect() { return { memories: [...memories.values()].map(clone), proposals: [...proposals.values()].map(clone), usages: clone(usages) }; },
  };
}

export function createProductionMemoryRepositoryAdapter(adapter = {}) {
  return Object.freeze({ ...adapter, adapterType: "production" });
}
