import test from "node:test";
import assert from "node:assert/strict";
import { askCompanionGateway } from "../intelligence/gateway.js";
import { collectIntelligenceValidation, validationEngine, VALIDATION_AUTHORITY_MATRIX } from "../intelligence/validation/index.js";

const base = () => ({
  workflow: { workflowId: "wf-1", currentStage: "evaluation", nextAction: { action: "create_proposal" }, blocked: false, blockers: [], confidenceLevel: "high", completion: {} },
  relationship: { relationshipId: "rel-1", confidenceLevel: "high" },
  knowledge: { knowledgeStatus: "supported", confidence: "high", freshness: { classification: "current" }, sources: [{ sourceId: "knowledge:one" }], facts: [], disclaimers: [] },
  capabilities: { selectedCapability: { capabilityId: "workflow.prepare_quote", domain: "workflow", riskLevel: "standard" }, status: "available", confidence: "high", authorization: { permissionStatus: "allowed" }, prerequisites: { missing: [] }, evidence: [{ type: "workflow_scope" }], execution: { performed: false, executableNow: false } },
});

test("validation engine contract and authority matrix are deterministic", () => {
  assert.equal(validationEngine.id, "validation");
  assert.equal(VALIDATION_AUTHORITY_MATRIX.workflow_stage, "workflow");
  assert.equal(VALIDATION_AUTHORITY_MATRIX.verified_knowledge, "knowledge");
});

test("empty context fails safely with confidence withheld", async () => {
  const result = await collectIntelligenceValidation({ collected: {} });
  assert.equal(result.status, "insufficient_evidence");
  assert.equal(result.overallConfidence, "withheld");
});

test("matching workflow and capability produce traceable agreement", async () => {
  const result = await collectIntelligenceValidation({ collected: base() });
  assert.equal(result.status, "supported");
  assert.equal(result.responseMode, "definitive");
  assert.equal(result.agreements[0].topic, "next_action");
  assert.ok(result.evidence.supportingRecordIds.includes("wf-1"));
  assert.ok(result.evidence.supportingSourceIds.includes("knowledge:one"));
});

test("capability prerequisite and authorization conflicts withhold confidence", async () => {
  const context = base(); context.workflow.blocked = true; context.capabilities.authorization.permissionStatus = "denied";
  const result = await collectIntelligenceValidation({ collected: context });
  assert.ok(result.contradictions.some((item) => item.code === "capability_prerequisite_conflict"));
  assert.ok(result.contradictions.some((item) => item.code === "capability_authorization_conflict"));
  assert.equal(result.overallConfidence, "withheld");
});

test("knowledge conflicts and unexpected execution block unsafe certainty", async () => {
  const context = base(); context.knowledge.knowledgeStatus = "conflicted"; context.capabilities.selectedCapability.riskLevel = "high_impact"; context.capabilities.execution.performed = true;
  const result = await collectIntelligenceValidation({ collected: context });
  assert.equal(result.status, "blocked");
  assert.equal(result.responseConstraints.mayUseDefinitiveLanguage, false);
  assert.ok(result.responseConstraints.blockedTopics.includes("execution"));
});

test("stale evidence qualifies response and ambiguity requires clarification", async () => {
  const stale = base(); stale.knowledge.freshness.classification = "stale";
  assert.equal((await collectIntelligenceValidation({ collected: stale })).responseMode, "qualified");
  const ambiguous = base(); ambiguous.capabilities.status = "ambiguous"; ambiguous.capabilities.clarification = { required: true };
  assert.equal((await collectIntelligenceValidation({ collected: ambiguous })).responseMode, "clarification_required");
});

test("scope and community privacy conflicts are surfaced without merging", async () => {
  const context = base(); context.workflow.businessId = "b-1"; context.business = { businessId: "b-2" }; context.community = { communityId: "c-1", trustScore: 99 };
  const result = await collectIntelligenceValidation({ collected: context });
  assert.equal(result.scopeConflicts.length, 1);
  assert.ok(result.contradictions.some((item) => item.code === "community_privacy_conflict"));
  assert.equal(result.responseMode, "blocked");
});

test("legal and emergency uncertainty preserves disclaimers and escalation", async () => {
  const context = base(); context.knowledge = { query: { domain: "emergency" }, knowledgeStatus: "insufficient_evidence", confidence: "low", disclaimers: ["verify_emergency_conditions"], sources: [] };
  const result = await collectIntelligenceValidation({ collected: context });
  assert.equal(result.responseMode, "escalation_required");
  assert.ok(result.responseConstraints.disclaimerCodes.includes("verify_emergency_conditions"));
});

test("validation does not mutate engine outputs or log private context", async () => {
  const context = base(); context.memory = [{ answer: "SECRET" }]; const before = structuredClone(context); const logs = [];
  await collectIntelligenceValidation({ collected: context, request: { requestId: "r-1", message: "PRIVATE" }, logger: { info(event, fields) { logs.push({ event, fields }); } } });
  assert.deepEqual(context, before);
  assert.doesNotMatch(JSON.stringify(logs), /SECRET|PRIVATE|knowledge:one/);
});

test("Gateway sends validation once and keeps it out of UI response", async () => {
  let calls = 0; let payload; const usage = [];
  const result = await askCompanionGateway({ user: { id: "u-1", accountType: "standard" }, body: { question: "What happens next?", feature: "ask_meetro" }, backendContext: { activeWorkflow: { workflowId: "wf-1", status: "evaluation", evaluationStatus: "saved" } }, providers: { openai: { name: "openai", async complete(input) { calls += 1; payload = JSON.parse(input.messages[1].content); return { answer: "Review the next step." }; } } }, recordUsage(event) { usage.push(event); }, logger: null });
  assert.equal(calls, 1); assert.equal(usage.length, 1);
  assert.ok(payload.validation.responseConstraints);
  assert.equal(result.validation, undefined);
});

