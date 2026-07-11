import crypto from "node:crypto";
import { activeMemoryLifecycle } from "./memoryLifecycle.js";
import { authorizeMemoryScope } from "./memoryAuthorization.js";
import { evaluateMemoryWritePolicy } from "./memoryWritePolicy.js";

export async function createMemoryProposal({ repository, request, candidate = {}, now = () => new Date().toISOString() } = {}) {
  const authorization = authorizeMemoryScope({ request, ownerType: candidate.ownerType || "user", ownerId: candidate.ownerId, scope: candidate.scope });
  if (!authorization.ok) return authorization;
  const proposedAt = now();
  const proposal = { ...candidate, proposalId: `memory-proposal-${crypto.randomUUID()}`, status: "pending_confirmation", proposedAt };
  return { ok: true, proposal: await repository.createProposal(proposal) };
}

export async function confirmMemoryProposal({ repository, request, proposalId, now = () => new Date().toISOString() } = {}) {
  const proposal = await repository.getProposalById(proposalId);
  if (!proposal || proposal.status !== "pending_confirmation") return { ok: false, code: "proposal_not_confirmable" };
  const authorization = authorizeMemoryScope({ request, ownerType: proposal.ownerType || "user", ownerId: proposal.ownerId, scope: proposal.scope });
  if (!authorization.ok) return authorization;
  const recordedAt = now();
  const memory = {
    memoryId: `memory-${crypto.randomUUID()}`, ownerType: proposal.ownerType || "user", ownerId: proposal.ownerId,
    scope: authorization.scope, category: proposal.proposedCategory || proposal.category,
    key: proposal.proposedKey || proposal.key, value: structuredClone(proposal.proposedValue || proposal.value),
    summary: String(proposal.proposedSummary || proposal.summary || "").slice(0, 500),
    source: { type: "user_confirmed", sourceId: proposal.sourceReference || proposal.proposalId, createdFrom: "memory_proposal", recordedAt },
    consent: { status: "user_confirmed", recordedAt, method: "proposal_confirmation" },
    lifecycle: activeMemoryLifecycle({ now: recordedAt, expiresAt: proposal.expiresAt || null }),
    confidence: "confirmed", sensitivity: proposal.sensitivity || "standard", tags: [...new Set(proposal.tags || [])].slice(0, 12), version: 1,
  };
  const policy = evaluateMemoryWritePolicy(memory); if (!policy.ok) return policy;
  await repository.confirmProposal(proposalId, { confirmedAt: recordedAt, confirmedBy: request.userId });
  return { ok: true, memory: await repository.createMemory(memory) };
}

export async function rejectMemoryProposal({ repository, request, proposalId, reason = "user_rejected", now = () => new Date().toISOString() } = {}) {
  const proposal = await repository.getProposalById(proposalId);
  if (!proposal) return { ok: false, code: "proposal_not_found" };
  const authorization = authorizeMemoryScope({ request, ownerType: proposal.ownerType || "user", ownerId: proposal.ownerId, scope: proposal.scope });
  if (!authorization.ok) return authorization;
  return { ok: true, proposal: await repository.rejectProposal(proposalId, { rejectedAt: now(), rejectedBy: request.userId, reason: String(reason).slice(0, 120) }) };
}
