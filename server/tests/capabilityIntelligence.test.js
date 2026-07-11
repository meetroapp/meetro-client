import test from "node:test";
import assert from "node:assert/strict";

import { askCompanionGateway } from "../intelligence/gateway.js";
import {
  CAPABILITY_DEFINITIONS,
  capabilityEngine,
  capabilityRegistry,
  collectCapabilityIntelligence,
  createCapabilityRegistry,
  validateCapabilityDefinition,
} from "../intelligence/capability/index.js";

function request(overrides = {}) {
  return {
    requestId: "request-1", userId: "user-1", user: { id: "user-1", accountType: "professional" },
    feature: "ask_meetro", source: {}, message: "What happens next?", intent: "workflow_guidance",
    capability: "", backendContext: {}, body: {}, ...overrides,
  };
}

function collected(overrides = {}) {
  return {
    context: { user: { id: "user-1", accountType: "professional" }, professional: { businessName: "Business" } },
    workflow: { workflowId: "workflow-1", currentStage: "evaluation", completedStages: ["relationship", "communication", "schedule", "evaluation"], nextAction: { action: "create_proposal" }, blockers: [], completion: {} },
    relationship: { relationshipId: "relationship-1", customerId: "customer-1", conversationId: "conversation-1" },
    business: { businessId: "business-1" }, community: { communityId: "community-1" },
    knowledge: { knowledgeStatus: "supported" }, persistentMemory: { memories: [] }, ...overrides,
  };
}

test("Capability Engine conforms to executable contract and registry is deterministic", () => {
  assert.equal(capabilityEngine.id, "capability");
  assert.equal(typeof capabilityEngine.supports, "function");
  assert.equal(typeof capabilityEngine.collectContext, "function");
  const ids = capabilityRegistry.listCapabilities().map((item) => item.capabilityId);
  assert.deepEqual(ids, [...ids].sort());
  assert.ok(ids.includes("workflow.prepare_quote"));
  assert.ok(ids.includes("community.review_wonder_pass"));
});

test("registry rejects duplicate and invalid definitions", () => {
  assert.throws(() => createCapabilityRegistry([CAPABILITY_DEFINITIONS[0], CAPABILITY_DEFINITIONS[0]]), /Duplicate capability/);
  assert.equal(validateCapabilityDefinition({ capabilityId: "bad" }).valid, false);
  assert.throws(() => createCapabilityRegistry([{ capabilityId: "admin.root" }]), /Invalid capability/);
});

test("data-less and unsupported requests return structured unsupported context", async () => {
  const result = await collectCapabilityIntelligence({ request: request({ userId: "", user: {}, feature: "social", message: "hello" }), collected: {} });
  assert.equal(result.status, "unsupported");
  assert.equal(result.selectedCapability, null);
  assert.equal(result.execution.performed, false);
});

test("explicit valid capability resolves while unsupported and administrative injection fail closed", async () => {
  const valid = await collectCapabilityIntelligence({ request: request({ capability: "workflow.explain_state" }), collected: collected() });
  assert.equal(valid.selectedCapability.capabilityId, "workflow.explain_state");
  const unsupported = await collectCapabilityIntelligence({ request: request({ capability: "administrative.grant_access", body: { role: "administrator" } }), collected: collected() });
  assert.equal(unsupported.status, "unsupported");
  assert.equal(unsupported.reasonCode, "unsupported_capability_id");
});

test("professional capability denies standard users and ignores client role forgery", async () => {
  const result = await collectCapabilityIntelligence({
    request: request({ capability: "workflow.prepare_quote", user: { id: "user-1", accountType: "standard" }, body: { role: "professional", permissions: ["quotes:write"] }, backendContext: { permissions: ["quotes:write"], capabilityInputs: { lineItems: [{ amount: 1 }] } } }),
    collected: collected(),
  });
  assert.equal(result.authorization.role, "standard");
  assert.equal(result.authorization.roleAllowed, false);
  assert.equal(result.status, "restricted");
});

test("business, relationship, workflow, conversation, and community scopes require trusted evidence", async () => {
  const cases = [
    ["business.review_health", "business"], ["relationship.explain_context", "relationship"],
    ["workflow.explain_state", "workflow"], ["communication.prepare_reply", "conversation"],
    ["community.review_activity", "community"],
  ];
  for (const [capability, scope] of cases) {
    const result = await collectCapabilityIntelligence({ request: request({ capability, body: { [`${scope}Id`]: "forged" } }), collected: { context: {} } });
    assert.ok(result.authorization.missingScopes.includes(scope), capability);
    assert.equal(result.status, "restricted");
  }
});

test("permissions come from server context and client permission injection is ignored", async () => {
  const denied = await collectCapabilityIntelligence({ request: request({ capability: "workflow.prepare_quote", body: { permissions: ["quotes:write"] }, backendContext: { capabilityInputs: { lineItems: [1] } } }), collected: collected() });
  assert.ok(denied.authorization.missingPermissions.includes("quotes:write"));
  const allowed = await collectCapabilityIntelligence({ request: request({ capability: "workflow.prepare_quote", backendContext: { permissions: ["quotes:write"], capabilityInputs: { lineItems: [1] }, customerId: "customer-1" } }), collected: collected() });
  assert.equal(allowed.authorization.permissionStatus, "allowed");
});

test("quote preparation reports inputs and evaluation prerequisite deterministically", async () => {
  const ready = await collectCapabilityIntelligence({ request: request({ message: "Prepare a quote", backendContext: { permissions: ["quotes:write"], customerId: "customer-1", capabilityInputs: { lineItems: [{ description: "labor" }] } } }), collected: collected() });
  assert.equal(ready.selectedCapability.capabilityId, "workflow.prepare_quote");
  assert.equal(ready.status, "available");
  assert.deepEqual(ready.requiredInputs.missing, []);
  const blocked = await collectCapabilityIntelligence({ request: request({ capability: "workflow.prepare_quote", backendContext: { permissions: ["quotes:write"] } }), collected: collected({ workflow: { workflowId: "workflow-1", currentStage: "schedule", completedStages: [], blockers: [] } }) });
  assert.ok(blocked.prerequisites.missing.includes("evaluation_saved"));
  assert.equal(blocked.status, "blocked");
});

test("proposal approval, completion, and knowledge prerequisites use existing engines", async () => {
  const schedule = await collectCapabilityIntelligence({ request: request({ capability: "workflow.prepare_schedule", backendContext: { permissions: ["schedule:write"], capabilityInputs: { date: "2026-07-12", time: "10:00" } } }), collected: collected({ workflow: { workflowId: "workflow-1", currentStage: "proposal", completedStages: ["evaluation"], blockers: [], completion: {} } }) });
  assert.ok(schedule.prerequisites.missing.includes("proposal_approved"));
  const completion = await collectCapabilityIntelligence({ request: request({ capability: "workflow.prepare_completion" }), collected: collected({ workflow: { workflowId: "workflow-1", currentStage: "perform_work", completedStages: [], blockers: [], completion: { workCompleted: false } } }) });
  assert.ok(completion.prerequisites.missing.includes("work_completed"));
  const knowledge = await collectCapabilityIntelligence({ request: request({ capability: "knowledge.retrieve_verified" }), collected: collected({ knowledge: { knowledgeStatus: "insufficient_evidence" } }) });
  assert.ok(knowledge.prerequisites.missing.includes("knowledge_supported"));
});

test("explain, prepare, review, draft, and mutation intents remain distinct", async () => {
  const explain = await collectCapabilityIntelligence({ request: request({ message: "Explain this quote" }), collected: collected() });
  const prepare = await collectCapabilityIntelligence({ request: request({ message: "Prepare a quote" }), collected: collected() });
  const reviewInvoice = await collectCapabilityIntelligence({ request: request({ message: "Review this invoice" }), collected: collected() });
  const draftReply = await collectCapabilityIntelligence({ request: request({ message: "Draft a reply" }), collected: collected() });
  const sendReply = await collectCapabilityIntelligence({ request: request({ message: "Send this reply now" }), collected: collected() });
  assert.equal(explain.selectedCapability.capabilityId, "workflow.review_proposal");
  assert.equal(prepare.selectedCapability.capabilityId, "workflow.prepare_quote");
  assert.equal(reviewInvoice.selectedCapability.capabilityId, "document.review_invoice");
  assert.equal(draftReply.selectedCapability.capabilityId, "communication.prepare_reply");
  assert.equal(sendReply.status, "unsupported");
  assert.equal(sendReply.reasonCode, "execution_layer_not_available");
});

test("missing inputs, optional inputs, supporting engines, and next steps are explicit", async () => {
  const result = await collectCapabilityIntelligence({ request: request({ capability: "document.prepare_invoice", backendContext: { permissions: ["invoices:write"] } }), collected: collected() });
  assert.ok(result.requiredInputs.missing.includes("lineItems"));
  assert.ok(result.requiredInputs.optional.includes("dueDate"));
  assert.deepEqual(result.supportingEngines, ["workflow", "business", "knowledge"]);
  assert.equal(result.nextStep.type, "collect_input");
});

test("ambiguous invoice intent prefers review and returns a bounded clarification", async () => {
  const result = await collectCapabilityIntelligence({ request: request({ message: "Help me with this invoice" }), collected: collected() });
  assert.equal(result.status, "ambiguous");
  assert.equal(result.selectedCapability.capabilityId, "document.review_invoice");
  assert.ok(result.alternatives.some((item) => item.capabilityId === "document.prepare_invoice"));
  assert.deepEqual(result.clarification, { required: true, code: "choose_invoice_intent" });
  assert.equal(result.execution.performed, false);
});

test("planned, deprecated, disabled, and high-impact capabilities remain unavailable or approval-bound", async () => {
  const base = { ...CAPABILITY_DEFINITIONS[0], capabilityId: "test.future", name: "Future", supportedFeatures: ["test"] };
  for (const status of ["planned", "disabled", "deprecated"]) {
    const registry = createCapabilityRegistry([{ ...base, status, replacementCapabilityId: status === "deprecated" ? "product.explain" : null }]);
    const result = await collectCapabilityIntelligence({ request: request({ capability: "test.future" }), collected: collected(), registry });
    assert.equal(result.status, "unavailable");
    if (status === "deprecated") assert.ok(result.warnings.includes("replacement:product.explain"));
  }
  const registry = createCapabilityRegistry([{ ...base, status: "active", executionMode: "user_approved", riskLevel: "high_impact" }]);
  const result = await collectCapabilityIntelligence({ request: request({ capability: "test.future" }), collected: collected(), registry });
  assert.equal(result.execution.performed, false);
  assert.equal(result.execution.executableNow, false);
  assert.equal(result.execution.requiresExplicitApproval, true);
});

test("capability evaluation performs no mutations", async () => {
  const state = collected();
  const before = structuredClone(state);
  await collectCapabilityIntelligence({ request: request({ capability: "workflow.prepare_quote", backendContext: { permissions: ["quotes:write"] } }), collected: state });
  assert.deepEqual(state, before);
});

test("safe logs exclude messages, private inputs, drafts, and customer names", async () => {
  const logs = [];
  await collectCapabilityIntelligence({
    request: request({ message: "Prepare a quote SECRET MESSAGE", capability: "workflow.prepare_quote", backendContext: { capabilityInputs: { privateDraft: "SECRET DRAFT" } } }), collected: collected(),
    logger: { info(event, fields) { logs.push({ event, fields }); }, warn(event, fields) { logs.push({ event, fields }); } },
  });
  assert.doesNotMatch(JSON.stringify(logs), /SECRET|privateDraft|customer-1/);
  assert.match(JSON.stringify(logs), /intelligence\.capability\.context_built/);
});

test("Gateway packages proposal once, preserves usage, and exposes no capability internals", async () => {
  let calls = 0; let payload; const usage = [];
  const result = await askCompanionGateway({
    user: { id: "user-1", accountType: "professional", permissions: ["quotes:write"] },
    body: { question: "Prepare a quote", feature: "quote_builder" },
    backendContext: {
      authorizedBusinessIds: ["business-1"], authorizedRelationshipIds: ["relationship-1"], customerId: "customer-1",
      permissions: ["quotes:write"], capabilityInputs: { lineItems: [{ description: "labor" }] },
      activeWorkflow: { workflowId: "workflow-1", status: "evaluation", evaluationStatus: "saved" },
      relationship: { relationshipId: "relationship-1" }, businessProfile: { businessName: "Business" },
    },
    providers: { openai: { name: "openai", async complete(input) { calls += 1; payload = JSON.parse(input.messages[1].content); return { answer: "Review the quote draft before any action." }; } } },
    recordUsage(event) { usage.push(event); }, logger: null,
  });
  assert.equal(calls, 1);
  assert.equal(usage.length, 1);
  assert.equal(payload.capabilities.selectedCapability.capabilityId, "workflow.prepare_quote");
  assert.equal(payload.capabilities.execution.performed, false);
  assert.equal(result.capabilities, undefined);
  assert.equal(result.provider, undefined);
});
