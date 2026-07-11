import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { askCompanionGateway } from "../intelligence/gateway.js";
import {
  collectPlanningIntelligence,
  PLANNING_MODES,
  PLANNING_READINESS,
  planningEngine,
} from "../intelligence/planning/index.js";
import { createDefaultOrchestrationEngines } from "../intelligence/orchestrator/defaultEngines.js";
import { buildUnifiedContext } from "../intelligence/orchestrator/unifiedContextBuilder.js";

const recommendation = (overrides = {}) => ({
  recommendationId: "recommendation:decision:workflow.prepare_quote",
  title: "Prepare Quote",
  decisionId: "decision:workflow.prepare_quote",
  capabilityId: "workflow.prepare_quote",
  category: "workflow",
  priority: "high",
  supportingEngines: ["capability", "workflow"],
  supportingEvidence: ["workflow:one"],
  prerequisites: [],
  constraints: [],
  approvalRequired: true,
  requiresExplicitApproval: true,
  confidence: "high",
  blocked: false,
  ...overrides,
});

const context = (overrides = {}) => ({
  workflow: { workflowId: "wf", currentStage: "evaluation", blocked: false },
  capabilities: {
    selectedCapability: { capabilityId: "workflow.prepare_quote" },
    alternatives: [],
    requiredInputs: { missing: [] },
    execution: { performed: false, executableNow: false, requiresExplicitApproval: true },
  },
  validation: {
    status: "supported",
    overallConfidence: "high",
    responseConstraints: { clarificationRequired: false },
  },
  decision: {
    options: [{ optionId: "decision:workflow.prepare_quote", capabilityId: "workflow.prepare_quote" }],
    recommendedOption: "decision:workflow.prepare_quote",
    recommendationMode: "recommended",
  },
  recommendation: {
    recommendations: [recommendation()],
    highestPriority: "recommendation:decision:workflow.prepare_quote",
    deferredRecommendations: [],
    blockedRecommendations: [],
    recommendationMode: "recommended",
    confidence: "high",
    warnings: [],
  },
  ...overrides,
});

test("Planning engine is a required-compatible advisory engine after Recommendation", () => {
  assert.equal(planningEngine.id, "planning");
  assert.equal(planningEngine.priority, 140);
  assert.equal(typeof planningEngine.collectContext, "function");
});

test("Planning is required after Recommendation and appears once in Unified Context", () => {
  const engines = createDefaultOrchestrationEngines();
  const recommendationIndex = engines.findIndex((engine) => engine.id === "recommendation");
  const planningIndex = engines.findIndex((engine) => engine.id === "planning");
  assert.equal(engines[planningIndex].required, true);
  assert.equal(planningIndex > recommendationIndex, true);

  const unified = buildUnifiedContext([
    { section: "planning", priority: 140, data: { planningMode: "planned" } },
    { section: "planning", priority: 140, data: { planningMode: "blocked" } },
  ]);
  assert.deepEqual(unified.metadata.sections, ["planning"]);
  assert.deepEqual(unified.metadata.droppedSections, ["planning"]);
  assert.equal(unified.context.planning.planningMode, "planned");
});

test("Planning contracts centralize all modes and readiness states", () => {
  assert.deepEqual(PLANNING_MODES, ["planned", "deferred", "blocked", "clarification_required", "no_safe_plan", "no_action"]);
  assert.deepEqual(PLANNING_READINESS, ["ready", "partially_ready", "blocked", "awaiting_information", "awaiting_approval", "not_applicable"]);
});

test("validated recommendation becomes a structured approval-aware advisory plan", async () => {
  const result = await collectPlanningIntelligence({ collected: context() });
  const plan = result.primaryPlan;
  assert.equal(result.planningMode, "planned");
  assert.equal(result.readiness, "awaiting_approval");
  assert.equal(plan.planId, "plan:recommendation:decision:workflow.prepare_quote");
  assert.equal(plan.recommendationId, recommendation().recommendationId);
  assert.equal(plan.decisionId, recommendation().decisionId);
  assert.equal(plan.capabilityId, recommendation().capabilityId);
  assert.equal(plan.requiredApprovals[0].explicit, true);
  assert.equal(plan.executionAllowed, false);
  assert.equal(plan.executionPerformed, false);
  assert.equal(result.executionPerformed, false);
  assert.equal(plan.steps.every((step) => step.executionAllowed === false && step.executionPerformed === false), true);
});

test("plan and step identifiers and ordering are stable and deterministic", async () => {
  const first = await collectPlanningIntelligence({ collected: context() });
  const second = await collectPlanningIntelligence({ collected: context() });
  assert.deepEqual(first, second);
  assert.deepEqual(first.primaryPlan.steps.map((step) => step.order), [1, 2]);
  assert.deepEqual(first.primaryPlan.steps.map((step) => step.stepId), [
    "plan:recommendation:decision:workflow.prepare_quote:step:01:review",
    "plan:recommendation:decision:workflow.prepare_quote:step:02:approval",
  ]);
});

test("missing information and prerequisites remain explicit and prevent ready state", async () => {
  const c = context();
  c.capabilities.requiredInputs.missing = ["lineItems"];
  c.recommendation.recommendations[0].prerequisites = ["evaluation_saved"];
  const result = await collectPlanningIntelligence({ collected: c });
  assert.equal(result.readiness, "awaiting_information");
  assert.deepEqual(result.primaryPlan.missingInformation.map((item) => item.code), ["missing_input:lineitems"]);
  assert.deepEqual(result.primaryPlan.dependencies.map((item) => item.prerequisite), ["evaluation_saved"]);
  assert.equal(result.primaryPlan.steps[0].completionCondition, "verified_prerequisite:evaluation_saved");
});

test("plans can be ready, partially ready, awaiting information, awaiting approval, blocked, or not applicable", async () => {
  const ready = context();
  ready.recommendation.recommendations[0].approvalRequired = false;
  ready.recommendation.recommendations[0].requiresExplicitApproval = false;
  assert.equal((await collectPlanningIntelligence({ collected: ready })).readiness, "ready");

  const partial = context();
  partial.recommendation.recommendations[0].approvalRequired = false;
  partial.recommendation.recommendations[0].requiresExplicitApproval = false;
  partial.recommendation.recommendations[0].prerequisites = ["proposal_exists"];
  assert.equal((await collectPlanningIntelligence({ collected: partial })).readiness, "partially_ready");

  const blocked = context();
  blocked.validation.status = "blocked";
  blocked.decision.recommendationMode = "blocked";
  blocked.recommendation.recommendationMode = "blocked";
  blocked.recommendation.blockedRecommendations = [recommendation({ blocked: true })];
  blocked.recommendation.recommendations = [];
  assert.equal((await collectPlanningIntelligence({ collected: blocked })).readiness, "blocked");

  const noAction = context();
  noAction.recommendation.recommendationMode = "no_action";
  noAction.recommendation.recommendations = [];
  assert.equal((await collectPlanningIntelligence({ collected: noAction })).readiness, "not_applicable");
});

test("blocked and deferred recommendations preserve their states and ordering", async () => {
  const c = context();
  c.recommendation.recommendations = [];
  c.recommendation.recommendationMode = "deferred";
  c.recommendation.deferredRecommendations = [recommendation({ priority: "deferred" })];
  c.recommendation.blockedRecommendations = [recommendation({ blocked: true })];
  c.decision.recommendationMode = "alternative";
  const result = await collectPlanningIntelligence({ collected: c });
  assert.equal(result.planningMode, "deferred");
  assert.equal(result.primaryPlan, null);
  assert.equal(result.deferredPlans[0].planningMode, "deferred");
  assert.equal(result.blockedPlans[0].planningMode, "blocked");
});

test("clarification, no safe plan, and no action modes never invent plans", async () => {
  for (const [mode, expected] of [
    ["clarification_required", "clarification_required"],
    ["no_safe_recommendation", "no_safe_plan"],
    ["no_action", "no_action"],
  ]) {
    const c = context();
    c.recommendation.recommendationMode = mode;
    c.recommendation.recommendations = [];
    if (mode === "clarification_required") c.validation.responseConstraints.clarificationRequired = true;
    if (mode === "no_safe_recommendation") c.decision.recommendationMode = "no_safe_option";
    const result = await collectPlanningIntelligence({ collected: c });
    assert.equal(result.planningMode, expected);
    assert.equal(result.primaryPlan, null);
    assert.deepEqual(result.plans, []);
  }
});

test("Validation, Decision, and Capability authority fail closed", async () => {
  for (const status of ["conflicted", "insufficient_evidence", "stale_only"]) {
    const c = context();
    c.validation.status = status;
    assert.equal((await collectPlanningIntelligence({ collected: c })).planningMode, "no_safe_plan");
  }

  const unsupportedDecision = context();
  unsupportedDecision.decision.options = [];
  assert.equal((await collectPlanningIntelligence({ collected: unsupportedDecision })).planningMode, "no_safe_plan");

  const unsupportedCapability = context();
  unsupportedCapability.capabilities.selectedCapability.capabilityId = "workflow.other";
  assert.equal((await collectPlanningIntelligence({ collected: unsupportedCapability })).planningMode, "no_safe_plan");
});

test("Planning preserves recommendation priority and confidence without reprioritizing", async () => {
  const c = context();
  const second = recommendation({
    recommendationId: "recommendation:decision:workflow.review_proposal",
    decisionId: "decision:workflow.review_proposal",
    capabilityId: "workflow.review_proposal",
    title: "Review Proposal",
    priority: "low",
    approvalRequired: false,
    requiresExplicitApproval: false,
    confidence: "medium",
  });
  c.recommendation.recommendations.push(second);
  c.decision.options.push({ optionId: second.decisionId, capabilityId: second.capabilityId });
  c.capabilities.alternatives.push({ capabilityId: second.capabilityId });
  const result = await collectPlanningIntelligence({ collected: c });
  assert.deepEqual(result.plans.map((plan) => plan.recommendationId), [recommendation().recommendationId, second.recommendationId]);
  assert.deepEqual(result.plans.map((plan) => plan.priority), ["high", "low"]);
  assert.deepEqual(result.plans.map((plan) => plan.confidence), ["high", "medium"]);
});

test("Planning does not mutate intelligence source objects", async () => {
  const c = context({ memory: [{ value: "PRIVATE MEMORY" }], business: { private: "CUSTOMER RECORD" } });
  const before = structuredClone(c);
  await collectPlanningIntelligence({ collected: c });
  assert.deepEqual(c, before);
});

test("Planning logs metadata only", async () => {
  const logs = [];
  const c = context({ memory: [{ value: "PRIVATE MEMORY" }] });
  await collectPlanningIntelligence({
    request: { requestId: "request-one", message: "PRIVATE PROMPT" },
    collected: c,
    logger: { info(event, fields) { logs.push({ event, fields }); } },
  });
  const serialized = JSON.stringify(logs);
  assert.match(serialized, /planCount/);
  assert.doesNotMatch(serialized, /PRIVATE PROMPT|PRIVATE MEMORY|workflow:one|Prepare Quote/);
});

test("Planning source has no provider or product mutation boundary", () => {
  const directory = new URL("../intelligence/planning/", import.meta.url);
  const source = fs.readdirSync(directory)
    .filter((name) => name.endsWith(".js"))
    .map((name) => fs.readFileSync(new URL(name, directory), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /invokeProvider|openaiProvider|executePlan|runPlan|performStep|applyPlan|dispatchAction|commitAction|completePlan/);
  assert.doesNotMatch(source, /localStorage|fetch\(|\.save\(|\.send\(|\.create\(|\.update\(|\.delete\(/);
});

test("Gateway includes one immutable Planning section in one provider call", async () => {
  let calls = 0;
  let payload;
  const result = await askCompanionGateway({
    user: { id: "u", accountType: "professional" },
    body: { question: "How could I prepare this quote?", feature: "quote_builder" },
    backendContext: {
      permissions: ["quotes:write"],
      businessProfile: { id: "business-one" },
      relationship: { relationshipId: "relationship-one", customerId: "customer-one" },
      activeWorkflow: { workflowId: "wf", status: "evaluation", evaluationStatus: "saved" },
      capabilityInputs: { workflowId: "wf", customerId: "customer-one", lineItems: [{ id: "line-one" }] },
    },
    providers: { openai: { name: "openai", async complete(input) {
      calls += 1;
      payload = JSON.parse(input.messages[1].content);
      return { answer: "Review the advisory plan before taking action." };
    } } },
    logger: null,
  });
  assert.equal(calls, 1);
  assert.ok(payload.planning);
  assert.equal(payload.planning.executionPerformed, false);
  assert.equal(payload.unifiedContext.planning.executionPerformed, false);
  assert.equal(result.planning, undefined);
  assert.equal(result.provider, undefined);
});
