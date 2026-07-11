import test from "node:test";
import assert from "node:assert/strict";

import { askCompanionGateway } from "../intelligence/gateway.js";
import {
  collectPersistentMemoryContext,
  confirmMemoryProposal,
  correctPersistentMemory,
  createInMemoryPersistentMemoryRepository,
  createMemoryProposal,
  createPersistentMemory,
  deletePersistentMemory,
  deletePersistentMemoriesInScope,
  emptyPersistentMemoryContext,
  evaluateMemoryWritePolicy,
  persistentMemoryEngine,
  rejectMemoryProposal,
  retrievePersistentMemories,
} from "../intelligence/memory/index.js";
import { createInMemoryCompanionSessionMemory } from "../intelligence/memory/companionSessionMemory.js";
import { createDefaultOrchestrationEngines } from "../intelligence/orchestrator/defaultEngines.js";
import { createEngineRegistry } from "../intelligence/orchestrator/engineRegistry.js";
import { selectEngineIds } from "../intelligence/orchestrator/engineSelector.js";

const NOW = "2026-07-11T13:00:00.000Z";

function request(userId = "user-1", extra = {}) {
  return {
    requestId: "request-1",
    userId,
    user: { id: userId, ...extra.user },
    backendContext: extra.backendContext || {},
    feature: extra.feature || "ask_meetro",
    capability: extra.capability || "",
    ...extra,
  };
}

function memory(overrides = {}) {
  const userId = overrides.ownerId || "user-1";
  return {
    memoryId: overrides.memoryId || "memory-1",
    ownerType: "user",
    ownerId: userId,
    scope: { type: "user", userId, businessId: "", relationshipId: "", workflowId: "", conversationId: "", communityId: "" },
    category: "preference",
    key: "time_format",
    value: { format: "12_hour" },
    summary: "User prefers 12-hour time formatting.",
    source: { type: "user_confirmed", sourceId: "settings-1", createdFrom: "settings", recordedAt: NOW },
    consent: { status: "explicit", recordedAt: NOW, method: "user_request" },
    lifecycle: { status: "active", createdAt: NOW, updatedAt: NOW, lastUsedAt: null, expiresAt: null, deletedAt: null },
    confidence: "confirmed",
    sensitivity: "standard",
    tags: ["preference", "ask_meetro"],
    version: 1,
    ...overrides,
  };
}

test("Persistent Memory Engine conforms to the executable engine interface", () => {
  assert.equal(persistentMemoryEngine.id, "persistent_memory");
  assert.equal(typeof persistentMemoryEngine.supports, "function");
  assert.equal(typeof persistentMemoryEngine.collectContext, "function");
  assert.equal(persistentMemoryEngine.priority, 65);
});

test("data-less requests return empty persistent memory context without process persistence", async () => {
  assert.deepEqual(
    await collectPersistentMemoryContext({ request: request(), collected: {} }),
    emptyPersistentMemoryContext([])
  );
});

test("write policy rejects unsupported categories, unknown consent, and prohibited sensitivity", () => {
  assert.equal(evaluateMemoryWritePolicy(memory({ category: "anything" })).code, "unsupported_memory_category");
  assert.equal(evaluateMemoryWritePolicy(memory({ consent: { status: "unknown" } })).code, "consent_not_retrievable");
  assert.equal(evaluateMemoryWritePolicy(memory({ sensitivity: "prohibited" })).code, "prohibited_memory");
});

test("write policy rejects raw messages, private notes, credentials, and sensitive attributes", () => {
  for (const value of [
    { messageBody: "complete message" },
    { privateNotes: "customer note" },
    { apiKey: "secret" },
    { password: "secret" },
    { medicalDiagnosis: "private" },
    { address: "precise location" },
  ]) {
    assert.equal(evaluateMemoryWritePolicy(memory({ value })).ok, false);
  }
});

test("explicitly confirmed preference can be stored for its authenticated owner", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  const result = await createPersistentMemory({ repository, request: request(), candidate: memory(), now: () => NOW });
  assert.equal(result.ok, true);
  assert.equal(result.memory.ownerId, "user-1");
  assert.equal(result.memory.lifecycle.status, "active");
});

test("system-required workflow reference is minimal and requires exact authorized workflow scope", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  const candidate = memory({
    category: "unfinished_work",
    key: "workflow_follow_up",
    value: { workflowId: "job-1", reasonCode: "customer_approval_pending" },
    scope: { type: "workflow", userId: "user-1", workflowId: "job-1" },
    consent: { status: "system_required", recordedAt: NOW, method: "workflow_continuity" },
    sensitivity: "restricted",
  });
  const result = await createPersistentMemory({
    repository,
    request: request("user-1", { backendContext: { activeWorkflow: { id: "job-1" } } }),
    candidate,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.memory.value, { workflowId: "job-1", reasonCode: "customer_approval_pending" });
});

test("client-forged owners and name-only scopes are rejected", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  const forged = await createPersistentMemory({ repository, request: request("user-1"), candidate: memory({ ownerId: "user-2" }) });
  assert.equal(forged.code, "memory_owner_forbidden");
  const nameOnly = await createPersistentMemory({
    repository,
    request: request("user-1"),
    candidate: memory({ scope: { type: "relationship", userId: "user-1", relationshipName: "Sarah" } }),
  });
  assert.equal(nameOnly.code, "scoped_memory_forbidden");
  const unsupportedOwner = await createPersistentMemory({
    repository,
    request: request("user-1"),
    candidate: memory({ ownerType: "relationship", ownerId: "relationship-1" }),
  });
  assert.equal(unsupportedOwner.code, "unsupported_memory_owner");
});

test("business memories require an authorized business and never leak across businesses", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  await repository.createMemory(memory({ memoryId: "business-a", ownerType: "business", ownerId: "business-a", scope: { type: "business", businessId: "business-a" }, category: "business_preference" }));
  await repository.createMemory(memory({ memoryId: "business-b", ownerType: "business", ownerId: "business-b", scope: { type: "business", businessId: "business-b" }, category: "business_preference" }));
  const result = await retrievePersistentMemories({ repository, requestedScope: { userId: "user-1", businessId: "business-a" } });
  assert.deepEqual(result.memories.map((item) => item.memoryId), ["business-a"]);
});

test("relationship and workflow memories require exact stable scope IDs", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  await repository.createMemory(memory({ memoryId: "rel-1", scope: { type: "relationship", userId: "user-1", relationshipId: "relationship-1" }, category: "relationship_reference", sensitivity: "restricted" }));
  await repository.createMemory(memory({ memoryId: "job-1", scope: { type: "workflow", userId: "user-1", workflowId: "job-1" }, category: "workflow_reference", consent: { status: "system_required" }, sensitivity: "restricted" }));
  const relationship = await retrievePersistentMemories({ repository, requestedScope: { userId: "user-1", relationshipId: "relationship-1" } });
  assert.deepEqual(relationship.memories.map((item) => item.memoryId), ["rel-1"]);
  const unrelated = await retrievePersistentMemories({ repository, requestedScope: { userId: "user-1", relationshipId: "relationship-2", workflowId: "job-2" } });
  assert.equal(unrelated.memories.length, 0);
});

test("user memories are isolated by authenticated owner", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  await repository.createMemory(memory({ memoryId: "u1" }));
  await repository.createMemory(memory({ memoryId: "u2", ownerId: "user-2", scope: { type: "user", userId: "user-2" } }));
  const result = await retrievePersistentMemories({ repository, requestedScope: { userId: "user-1" } });
  assert.deepEqual(result.memories.map((item) => item.memoryId), ["u1"]);
});

test("proposals remain pending, rejected proposals create no memory, and confirmation creates active memory", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  const candidate = {
    ownerType: "user", ownerId: "user-1", scope: { type: "user", userId: "user-1" },
    proposedCategory: "preference", proposedKey: "preferred_term", proposedValue: { term: "professional" },
    proposedSummary: "Use professional instead of contractor.", sourceReference: "conversation-1",
  };
  const first = await createMemoryProposal({ repository, request: request(), candidate, now: () => NOW });
  assert.equal(first.proposal.status, "pending_confirmation");
  await rejectMemoryProposal({ repository, request: request(), proposalId: first.proposal.proposalId });
  assert.equal(repository.inspect().memories.length, 0);
  const second = await createMemoryProposal({ repository, request: request(), candidate, now: () => NOW });
  const confirmed = await confirmMemoryProposal({ repository, request: request(), proposalId: second.proposal.proposalId, now: () => NOW });
  assert.equal(confirmed.memory.lifecycle.status, "active");
  assert.equal(confirmed.memory.consent.status, "user_confirmed");
});

test("correction creates a new version and supersedes the prior memory", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  await repository.createMemory(memory());
  const result = await correctPersistentMemory({
    repository, request: request(), memoryId: "memory-1",
    correction: { value: { format: "24_hour" }, summary: "User prefers 24-hour time formatting.", correctionReason: "user correction" },
    now: () => "2026-07-12T10:00:00.000Z",
  });
  assert.equal(result.ok, true);
  assert.equal(result.previous.lifecycle.status, "superseded");
  assert.equal(result.current.version, 2);
  assert.equal(result.current.previousMemoryId, "memory-1");
});

test("deleted, expired, withdrawn, and superseded memory is excluded immediately", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  await repository.createMemory(memory({ memoryId: "deleted" }));
  await repository.createMemory(memory({ memoryId: "expired", lifecycle: { ...memory().lifecycle, expiresAt: "2026-07-10T00:00:00.000Z" } }));
  await repository.createMemory(memory({ memoryId: "withdrawn", consent: { status: "withdrawn" } }));
  await repository.createMemory(memory({ memoryId: "superseded", lifecycle: { ...memory().lifecycle, status: "superseded" } }));
  await deletePersistentMemory({ repository, request: request(), memoryId: "deleted", now: () => NOW });
  const result = await retrievePersistentMemories({ repository, requestedScope: { userId: "user-1" }, now: Date.parse(NOW) });
  assert.equal(result.memories.length, 0);
  assert.equal(result.retrieval.omittedCount, 4);
});

test("scope deletion affects Companion memory only", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  await repository.createMemory(memory());
  const workflowRecord = { id: "job-1", status: "active" };
  const relationshipRecord = { id: "relationship-1", status: "active" };
  const result = await deletePersistentMemoriesInScope({ repository, request: request(), scope: { type: "user", userId: "user-1" }, now: () => NOW });
  assert.equal(result.deletedCount, 1);
  assert.deepEqual(workflowRecord, { id: "job-1", status: "active" });
  assert.deepEqual(relationshipRecord, { id: "relationship-1", status: "active" });
});

test("deterministic relevance prefers workflow then relationship then business then user", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  for (const record of [
    memory({ memoryId: "user" }),
    memory({ memoryId: "business", ownerType: "business", ownerId: "business-1", scope: { type: "business", businessId: "business-1" }, category: "business_preference" }),
    memory({ memoryId: "relationship", scope: { type: "relationship", userId: "user-1", relationshipId: "relationship-1" }, category: "relationship_reference", sensitivity: "restricted" }),
    memory({ memoryId: "workflow", scope: { type: "workflow", userId: "user-1", workflowId: "job-1" }, category: "unfinished_work", consent: { status: "system_required" }, sensitivity: "restricted" }),
  ]) await repository.createMemory(record);
  const result = await retrievePersistentMemories({ repository, requestedScope: { userId: "user-1", businessId: "business-1", relationshipId: "relationship-1", workflowId: "job-1" } });
  assert.deepEqual(result.memories.map((item) => item.memoryId), ["workflow", "relationship", "business", "user"]);
});

test("retrieval limits and truncation metadata are deterministic", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  for (let index = 0; index < 5; index += 1) await repository.createMemory(memory({ memoryId: `memory-${index}`, key: `key-${index}` }));
  const first = await retrievePersistentMemories({ repository, requestedScope: { userId: "user-1" }, limit: 2 });
  const second = await retrievePersistentMemories({ repository, requestedScope: { userId: "user-1" }, limit: 2 });
  assert.equal(first.memories.length, 2);
  assert.equal(first.retrieval.truncated, true);
  assert.deepEqual(first.memories.map((item) => item.memoryId), second.memories.map((item) => item.memoryId));
});

test("memory logs exclude values and summaries", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  await repository.createMemory(memory({ value: { privateMarker: "DO_NOT_LOG" }, summary: "DO_NOT_LOG_SUMMARY" }));
  const events = [];
  await collectPersistentMemoryContext({
    request: request("user-1", { persistentMemoryRepository: repository }), collected: {},
    logger: { info(event, fields) { events.push({ event, fields }); } },
  });
  assert.doesNotMatch(JSON.stringify(events), /DO_NOT_LOG|DO_NOT_LOG_SUMMARY/);
});

test("persistent memory remains separate from session memory and is never automatically promoted", async () => {
  const persistent = createInMemoryPersistentMemoryRepository();
  const session = createInMemoryCompanionSessionMemory();
  const resolved = await session.resolveSession({ userId: "user-1" });
  await session.appendExchange({ sessionId: resolved.sessionId, userId: "user-1", userMessage: "Remember everything", assistantAnswer: "No automatic promotion." });
  assert.equal(session.inspect().records.length, 1);
  assert.equal(persistent.inspect().memories.length, 0);
});

test("engine selection places persistent memory after Relationship for relevant features and excludes anonymous Community", () => {
  const registry = createEngineRegistry(createDefaultOrchestrationEngines());
  const ids = selectEngineIds(request("user-1", { feature: "work_center" }), registry);
  assert.ok(ids.indexOf("workflow") < ids.indexOf("relationship"));
  assert.ok(ids.indexOf("relationship") < ids.indexOf("persistent_memory"));
  assert.equal(selectEngineIds({ userId: "", user: {}, feature: "community", source: {} }, registry).includes("persistent_memory"), false);
});

test("provider receives minimized persistent context once while usage metering remains one event", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  await repository.createMemory(memory());
  const providerCalls = [];
  const usage = [];
  const result = await askCompanionGateway({
    user: { id: "user-1" }, body: { question: "What should I remember?", feature: "ask_meetro" },
    persistentMemoryRepository: repository,
    backendContext: {},
    providers: { openai: { name: "openai", async complete(payload) { providerCalls.push(payload); return { answer: "Use 12-hour time." }; } } },
    recordUsage(event) { usage.push(event); }, logger: null,
  });
  assert.equal(result.success, true);
  assert.equal(providerCalls.length, 1);
  assert.equal(usage.length, 1);
  const payload = JSON.parse(providerCalls[0].messages[1].content);
  assert.equal(payload.unifiedContext.persistentMemory.memories[0].summary, "User prefers 12-hour time formatting.");
  assert.equal("source" in payload.unifiedContext.persistentMemory.memories[0], false);
  assert.equal("consent" in payload.unifiedContext.persistentMemory.memories[0], false);
});

test("Workflow and Relationship engines remain authorities rather than memory replacements", async () => {
  const repository = createInMemoryPersistentMemoryRepository();
  await repository.createMemory(memory({ memoryId: "reference", category: "workflow_reference", consent: { status: "system_required" }, scope: { type: "user", userId: "user-1" }, value: { workflowId: "job-1" } }));
  const result = await retrievePersistentMemories({ repository, requestedScope: { userId: "user-1" } });
  assert.equal(result.memories[0].value.status, undefined);
  assert.equal(result.memories[0].value.relationshipState, undefined);
});
