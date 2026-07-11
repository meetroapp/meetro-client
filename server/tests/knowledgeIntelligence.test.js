import test from "node:test";
import assert from "node:assert/strict";

import {
  collectKnowledgeIntelligence,
  createInMemoryKnowledgeRepository,
  knowledgeEngine,
  KNOWLEDGE_LIMITS,
  validateKnowledgeSource,
} from "../intelligence/knowledge/index.js";
import { askCompanionGateway } from "../intelligence/gateway.js";

const NOW = Date.parse("2026-07-11T12:00:00.000Z");

function source(overrides = {}) {
  return {
    sourceId: "knowledge:workflow:closure-v1",
    sourceType: "workflow_standard",
    title: "Universal Workflow Standard",
    domain: "closure",
    subdomains: ["workflow", "completion"],
    authority: "authoritative",
    confidentiality: "public",
    status: "active",
    language: "en",
    version: "1.0",
    effectiveAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    expiresAt: null,
    repositoryPath: "docs/KnowledgeBase/MEETRO_UNIVERSAL_WORKFLOW_ENGINE.md",
    contentReference: { sectionId: "completion-closure", heading: "Completion and Closure" },
    tags: ["closure", "completion", "workflow"],
    facts: [{ factId: "fact:completion-distinct", subject: "completion", predicate: "distinct_from", value: "closure" }],
    guidance: [{ code: "completion_not_closure", summary: "Completion and Closure are separate lifecycle states." }],
    assertions: [{ topic: "closure_rule", value: "resolve obligations" }],
    ...overrides,
  };
}

function request({ repository, backendContext = {}, feature = "closure", message = "Explain closure", user = { id: "user-1" } } = {}) {
  return {
    requestId: "req-1", userId: user.id, user, feature, intent: "explanation", message,
    source: { page: feature }, repositories: repository ? { knowledge: repository } : {},
    backendContext,
  };
}

test("knowledge engine conforms to the shared executable interface", () => {
  assert.equal(knowledgeEngine.id, "knowledge");
  assert.equal(typeof knowledgeEngine.supports, "function");
  assert.equal(typeof knowledgeEngine.collectContext, "function");
});

test("data-less and unsupported requests return safe empty evidence", async () => {
  const empty = await collectKnowledgeIntelligence({ request: request() });
  assert.equal(empty.knowledgeStatus, "insufficient_evidence");
  assert.deepEqual(empty.sources, []);
  const unsupported = await collectKnowledgeIntelligence({ request: request({ feature: "unrelated_social" }) });
  assert.equal(unsupported.knowledgeStatus, "insufficient_evidence");
});

test("source contract enforces typed IDs, metadata, and repository-relative paths", () => {
  assert.equal(validateKnowledgeSource(source()).valid, true);
  assert.equal(validateKnowledgeSource(source({ sourceId: "bad", repositoryPath: "/private/file.md" })).valid, false);
  assert.equal(validateKnowledgeSource(source({ sourceType: "url", domain: "anything" })).valid, false);
  assert.equal(validateKnowledgeSource(source({ url: "https://unapproved.example" })).valid, false);
});

test("current authoritative source returns traced verified facts and guidance", async () => {
  const context = await collectKnowledgeIntelligence({ request: request({ repository: createInMemoryKnowledgeRepository([source()]) }), now: NOW });
  assert.equal(context.knowledgeStatus, "supported");
  assert.equal(context.confidence, "high");
  assert.deepEqual(context.facts[0].sourceIds, ["knowledge:workflow:closure-v1"]);
  assert.deepEqual(context.guidance[0].sourceIds, ["knowledge:workflow:closure-v1"]);
  assert.equal(context.sources[0].repositoryPath.startsWith("/"), false);
});

test("forged client domain and source authorization are ignored", async () => {
  const restricted = source({ sourceId: "knowledge:legal:private", domain: "terms", confidentiality: "restricted" });
  const context = await collectKnowledgeIntelligence({
    request: { ...request({ repository: createInMemoryKnowledgeRepository([restricted]), feature: "terms" }), body: { domain: "terms", authorizedKnowledgeSourceIds: [restricted.sourceId] } }, now: NOW,
  });
  assert.equal(context.knowledgeStatus, "unauthorized");
  assert.deepEqual(context.sources, []);
});

test("internal and exact restricted sources require backend authorization", async () => {
  const internal = source({ sourceId: "knowledge:workflow:internal", confidentiality: "internal" });
  const restricted = source({ sourceId: "knowledge:workflow:restricted", confidentiality: "restricted" });
  const repository = createInMemoryKnowledgeRepository([internal, restricted]);
  const denied = await collectKnowledgeIntelligence({ request: request({ repository }), now: NOW });
  assert.equal(denied.knowledgeStatus, "unauthorized");
  const allowed = await collectKnowledgeIntelligence({ request: request({ repository, backendContext: { allowInternalKnowledge: true, authorizedKnowledgeSourceIds: [restricted.sourceId] } }), now: NOW });
  assert.equal(allowed.sources.length, 2);
  assert.equal(allowed.sources.find((item) => item.sourceId === restricted.sourceId).repositoryPath, undefined);
});

test("prohibited and cross-scope sources never enter context", async () => {
  const sources = [
    source({ sourceId: "knowledge:workflow:prohibited", confidentiality: "prohibited" }),
    source({ sourceId: "knowledge:workflow:business", businessId: "business-2" }),
    source({ sourceId: "knowledge:workflow:relationship", relationshipId: "relationship-2" }),
    source({ sourceId: "knowledge:workflow:community", communityId: "community-2" }),
  ];
  const context = await collectKnowledgeIntelligence({ request: request({ repository: createInMemoryKnowledgeRepository(sources), backendContext: { authorizedBusinessIds: ["business-1"], authorizedRelationshipIds: ["relationship-1"], authorizedCommunityIds: ["community-1"] } }), now: NOW });
  assert.equal(context.knowledgeStatus, "unauthorized");
  assert.deepEqual(context.sources, []);
});

test("authority, domain, exact source, freshness, and ordering are deterministic", async () => {
  const repository = createInMemoryKnowledgeRepository([
    source({ sourceId: "knowledge:workflow:advisory", authority: "advisory", title: "Closure notes" }),
    source({ sourceId: "knowledge:workflow:other", domain: "workflow", title: "Generic workflow" }),
    source({ sourceId: "knowledge:workflow:exact", title: "Exact closure" }),
  ]);
  const context = await collectKnowledgeIntelligence({ request: request({ repository, backendContext: { knowledgeSourceId: "knowledge:workflow:exact" } }), now: NOW });
  assert.equal(context.sources[0].sourceId, "knowledge:workflow:exact");
  assert.equal(context.sources[0].authority, "authoritative");
});

test("expired and superseded sources are excluded unless historical access is trusted", async () => {
  const superseded = source({ sourceId: "knowledge:workflow:old", status: "superseded" });
  const expired = source({ sourceId: "knowledge:workflow:expired", expiresAt: "2026-07-01T00:00:00.000Z" });
  const repository = createInMemoryKnowledgeRepository([superseded, expired]);
  const current = await collectKnowledgeIntelligence({ request: request({ repository }), now: NOW });
  assert.deepEqual(current.sources, []);
  const historical = await collectKnowledgeIntelligence({ request: request({ repository, backendContext: { allowHistoricalKnowledge: true } }), now: NOW });
  assert.deepEqual(historical.sources.map((item) => item.sourceId), ["knowledge:workflow:old"]);
});

test("stale and unknown freshness lower confidence and produce safe status", async () => {
  const stale = source({ updatedAt: "2020-01-01T00:00:00.000Z" });
  const staleContext = await collectKnowledgeIntelligence({ request: request({ repository: createInMemoryKnowledgeRepository([stale]) }), now: NOW });
  assert.equal(staleContext.knowledgeStatus, "stale_only");
  assert.ok(staleContext.disclaimers.includes("stale_source_warning"));
  const unknown = source({ updatedAt: null, effectiveAt: null });
  const unknownContext = await collectKnowledgeIntelligence({ request: request({ repository: createInMemoryKnowledgeRepository([unknown]) }), now: NOW });
  assert.equal(unknownContext.confidence, "medium");
});

test("equal authoritative disagreement creates conflict and blocks definitive guidance", async () => {
  const repository = createInMemoryKnowledgeRepository([
    source({ sourceId: "knowledge:workflow:a", assertions: [{ topic: "closure_rule", value: "a" }] }),
    source({ sourceId: "knowledge:workflow:b", assertions: [{ topic: "closure_rule", value: "b" }] }),
  ]);
  const context = await collectKnowledgeIntelligence({ request: request({ repository }), now: NOW });
  assert.equal(context.knowledgeStatus, "conflicted");
  assert.equal(context.conflicts.length, 1);
  assert.deepEqual(context.facts, []);
  assert.deepEqual(context.guidance, []);
});

test("stronger authority prevents weaker disagreement from becoming an active conflict", async () => {
  const repository = createInMemoryKnowledgeRepository([
    source({ sourceId: "knowledge:workflow:a", assertions: [{ topic: "closure_rule", value: "a" }] }),
    source({ sourceId: "knowledge:workflow:b", authority: "advisory", assertions: [{ topic: "closure_rule", value: "b" }] }),
  ]);
  const context = await collectKnowledgeIntelligence({ request: request({ repository }), now: NOW });
  assert.equal(context.knowledgeStatus, "supported");
  assert.deepEqual(context.conflicts, []);
});

test("unverified facts are excluded and prose becomes bounded attributed guidance", async () => {
  const prose = "x".repeat(KNOWLEDGE_LIMITS.excerptCharacters + 500);
  const item = source({ authority: "advisory", facts: [{ factId: "unsafe", subject: "x", predicate: "is", value: "y" }], guidance: [], excerpt: prose });
  const context = await collectKnowledgeIntelligence({ request: request({ repository: createInMemoryKnowledgeRepository([item]) }), now: NOW });
  assert.deepEqual(context.facts, []);
  assert.equal(context.guidance[0].summary.length, KNOWLEDGE_LIMITS.excerptCharacters);
  assert.deepEqual(context.guidance[0].sourceIds, [item.sourceId]);
  assert.equal(JSON.stringify(context).includes(prose), false);
});

test("domain-based legal, permit, emergency, and safety disclaimers are deterministic", async () => {
  for (const [feature, code] of [["terms", "not_legal_advice"], ["permits", "verify_local_permit_requirements"], ["emergency", "verify_emergency_conditions"]]) {
    const item = source({ sourceId: `knowledge:${feature}:one`, domain: feature, sourceType: feature === "emergency" ? "emergency_guide" : feature === "permits" ? "permit_guide" : "legal_document" });
    const context = await collectKnowledgeIntelligence({ request: request({ repository: createInMemoryKnowledgeRepository([item]), feature }), now: NOW });
    assert.ok(context.disclaimers.includes(code));
  }
});

test("retrieval limits, stable citations, language, and product version warnings are enforced", async () => {
  const sources = Array.from({ length: KNOWLEDGE_LIMITS.returnedSources + 3 }, (_, index) => source({ sourceId: `knowledge:workflow:item-${index}`, productVersion: "1" }));
  const context = await collectKnowledgeIntelligence({ request: request({ repository: createInMemoryKnowledgeRepository(sources), backendContext: { productVersion: "2", language: "en" } }), now: NOW });
  assert.equal(context.sources.length, KNOWLEDGE_LIMITS.returnedSources);
  assert.equal(context.retrieval.truncated, true);
  assert.ok(context.warnings.includes("product_version_mismatch"));
  assert.ok(context.guidance.every((item) => item.sourceIds.every((id) => id.startsWith("knowledge:"))));
});

test("safe logging excludes source content, facts, titles, paths, prompts, and messages", async () => {
  const logs = [];
  await collectKnowledgeIntelligence({
    request: request({ repository: createInMemoryKnowledgeRepository([source({ title: "SECRET TITLE", excerpt: "SECRET EXCERPT" })]), message: "SECRET MESSAGE" }), now: NOW,
    logger: { info(event, fields) { logs.push({ event, fields }); }, warn(event, fields) { logs.push({ event, fields }); } },
  });
  const serialized = JSON.stringify(logs);
  assert.doesNotMatch(serialized, /SECRET|repositoryPath|facts|guidance|excerpt/);
  assert.match(serialized, /intelligence\.knowledge\.context_built/);
});

test("Gateway sends structured knowledge once and keeps it out of the UI response", async () => {
  let providerCalls = 0;
  let payload;
  const result = await askCompanionGateway({
    user: { id: "user-1" },
    body: { question: "Explain closure", feature: "closure" },
    repositories: { knowledge: createInMemoryKnowledgeRepository([source()]) },
    providers: { openai: { name: "openai", async complete(input) { providerCalls += 1; payload = JSON.parse(input.messages[1].content); return { answer: "Closure explained." }; } } },
    logger: null,
  });
  assert.equal(providerCalls, 1);
  assert.equal(payload.knowledge.knowledgeStatus, "supported");
  assert.match(JSON.stringify(payload.knowledge), /knowledge:workflow:closure-v1/);
  assert.equal(result.knowledge, undefined);
  assert.equal(result.provider, undefined);
});
