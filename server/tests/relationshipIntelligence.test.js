import test from "node:test";
import assert from "node:assert/strict";

import { askCompanionGateway } from "../intelligence/gateway.js";
import { createDefaultOrchestrationEngines } from "../intelligence/orchestrator/defaultEngines.js";
import { createEngineRegistry } from "../intelligence/orchestrator/engineRegistry.js";
import { selectEngineIds } from "../intelligence/orchestrator/engineSelector.js";
import { buildUnifiedContext } from "../intelligence/orchestrator/unifiedContextBuilder.js";
import { collectRelationshipIntelligence, relationshipEngineSupports } from "../intelligence/relationship/relationshipEngine.js";

function makeRequest(body = {}, backendContext = {}, user = {}) {
  return {
    feature: body.feature || "ask_meetro",
    source: body.source || {},
    body,
    user: { id: "professional-1", accountType: "professional", businessId: "business-1", ...user },
    projectId: body.projectId || "",
    conversationId: body.conversationId || "",
    backendContext,
    repositories: {},
  };
}

async function collect(body, backendContext, workflow = {}, user = {}) {
  return collectRelationshipIntelligence({ request: makeRequest(body, backendContext, user), workflow });
}

const parties = { customerId: "customer-1", professionalId: "professional-1", businessId: "business-1" };

test("Relationship Engine conforms to executable engine interface", () => {
  const engine = createDefaultOrchestrationEngines().find((item) => item.id === "relationship");
  assert.equal(engine.id, "relationship");
  assert.equal(typeof engine.supports, "function");
  assert.equal(typeof engine.collectContext, "function");
  assert.equal(relationshipEngineSupports({ feature: "messages", body: {}, source: {} }), true);
});

test("unsupported and data-less relationship requests return empty context", async () => {
  assert.deepEqual(await collect({ feature: "ask_meetro" }, {}), {});
  assert.equal(relationshipEngineSupports({ feature: "community", body: {}, source: {} }), false);
});

test("relationship resolves by explicit relationship and conversation IDs", async () => {
  const backend = {
    relationships: [{ relationshipId: "relationship-1", ...parties, type: "standard_service" }],
    conversations: [{ id: "conversation-1", relationshipId: "relationship-1", ...parties, status: "active" }],
  };
  const explicit = await collect({ relationshipId: "relationship-1" }, backend);
  assert.equal(explicit.relationshipId, "relationship-1");
  assert.equal(explicit.communication.conversationId, "conversation-1");
  const conversation = await collect({ conversationId: "conversation-1", feature: "conversation" }, backend);
  assert.equal(conversation.relationshipId, "relationship-1");
});

test("relationship resolves through job, request, and emergency stable IDs", async () => {
  const backend = {
    standardJobs: [{ jobId: "job-1", relationshipId: "relationship-1", ...parties, status: "in_progress" }],
    serviceRequests: [{ requestId: "request-1", relationshipId: "relationship-1", ...parties, status: "open" }],
    emergencyRequests: [{ emergencyRequestId: "emergency-1", relationshipId: "relationship-1", ...parties, status: "active", source: "emergency" }],
  };
  assert.equal((await collect({ jobId: "job-1" }, backend)).relationshipId, "relationship-1");
  assert.equal((await collect({ requestId: "request-1" }, backend)).relationshipId, "relationship-1");
  assert.equal((await collect({ emergencyRequestId: "emergency-1", feature: "emergency" }, backend)).relationshipType, "emergency_service");
});

test("name-only matching is rejected and similar customer names stay isolated", async () => {
  const backend = { relationships: [
    { relationshipId: "relationship-sarah-1", customerId: "customer-sarah-1", customerName: "Sarah", businessId: "business-1", professionalId: "professional-1" },
    { relationshipId: "relationship-sarah-2", customerId: "customer-sarah-2", customerName: "Sarah", businessId: "business-1", professionalId: "professional-1" },
  ] };
  assert.deepEqual(await collect({ customerName: "Sarah" }, backend), {});
  const result = await collect({ relationshipId: "relationship-sarah-1" }, backend);
  assert.equal(result.parties.customerId, "customer-sarah-1");
  assert.doesNotMatch(JSON.stringify(result), /customer-sarah-2/);
});

test("same customer remains isolated across businesses and professionals", async () => {
  const backend = { relationships: [
    { relationshipId: "relationship-a", customerId: "customer-1", businessId: "business-1", professionalId: "professional-1" },
    { relationshipId: "relationship-b", customerId: "customer-1", businessId: "business-2", professionalId: "professional-2" },
  ] };
  const result = await collect({ relationshipId: "relationship-a" }, backend);
  assert.deepEqual(result.parties, parties);
  assert.doesNotMatch(JSON.stringify(result), /business-2|professional-2/);
});

test("forged party identifiers cannot select another authenticated user's relationship", async () => {
  const result = await collect(
    { relationshipId: "relationship-other", customerId: "customer-other", businessId: "business-other" },
    { relationships: [{ relationshipId: "relationship-other", customerId: "customer-other", professionalId: "professional-other", businessId: "business-other" }] }
  );
  assert.deepEqual(result, {});

  const homeowner = await collect(
    { relationshipId: "relationship-other-homeowner", customerId: "customer-other" },
    { relationships: [{ relationshipId: "relationship-other-homeowner", customerId: "customer-other", professionalId: "professional-1", businessId: "business-1" }] },
    {},
    { id: "customer-1", accountType: "standard", businessId: "" }
  );
  assert.deepEqual(homeowner, {});
});

test("continuity distinguishes first-time, returning, active, and conversation-only relationships", async () => {
  const first = await collect({ relationshipId: "r-first" }, { relationships: [{ relationshipId: "r-first", ...parties }], serviceRequests: [{ relationshipId: "r-first", requestId: "req-first", ...parties, status: "open" }] });
  assert.equal(first.customerContinuity.classification, "first_time_customer");

  const returning = await collect({ relationshipId: "r-return" }, { relationships: [{ relationshipId: "r-return", ...parties }], jobHistory: [{ relationshipId: "r-return", jobId: "job-old", ...parties, status: "closed", completedAt: "2026-01-01", closedAt: "2026-01-02", readOnlyHistory: true }], serviceRequests: [{ relationshipId: "r-return", requestId: "req-new", ...parties, status: "open" }] });
  assert.equal(returning.customerContinuity.classification, "returning_customer");

  const active = await collect({ relationshipId: "r-active" }, { relationships: [{ relationshipId: "r-active", ...parties }], standardJobs: [{ relationshipId: "r-active", jobId: "job-active", ...parties, status: "in_progress" }] });
  assert.equal(active.customerContinuity.classification, "active_customer");

  const conversationOnly = await collect({ conversationId: "conversation-only", feature: "conversation" }, { conversations: [{ id: "conversation-only", ...parties, status: "active" }] });
  assert.equal(conversationOnly.customerContinuity.classification, "conversation_only");
});

test("activity counts deduplicate completion/history and emergency records", async () => {
  const result = await collect({ relationshipId: "r-counts" }, {
    relationships: [{ relationshipId: "r-counts", ...parties }],
    completions: [{ relationshipId: "r-counts", jobId: "job-1", completionId: "completion-1", ...parties, status: "completed" }],
    jobHistory: [{ relationshipId: "r-counts", jobId: "job-1", ...parties, status: "closed", readOnlyHistory: true }],
    emergencyRequests: [{ relationshipId: "r-counts", emergencyRequestId: "emergency-1", ...parties, status: "completed" }],
    emergencyJobs: [{ relationshipId: "r-counts", emergencyRequestId: "emergency-1", jobId: "emergency-job-1", ...parties, status: "closed" }],
  });
  assert.equal(result.activitySummary.completedJobs, 2);
  assert.equal(result.activitySummary.closedJobs, 2);
  assert.equal(result.activitySummary.emergencyJobs, 1);
});

test("activity summary counts active requests, proposals, invoices, and conversations", async () => {
  const result = await collect({ relationshipId: "r-activity" }, {
    relationships: [{ relationshipId: "r-activity", ...parties }],
    serviceRequests: [{ relationshipId: "r-activity", requestId: "request-1", ...parties, status: "open" }],
    proposals: [{ relationshipId: "r-activity", proposalId: "proposal-1", jobId: "job-1", ...parties, proposalStatus: "proposal_sent" }],
    invoices: [{ relationshipId: "r-activity", invoiceId: "invoice-1", jobId: "job-1", ...parties, invoiceStatus: "sent", paymentStatus: "pending" }],
    conversations: [{ id: "conversation-activity", relationshipId: "r-activity", ...parties, status: "active" }],
  });
  assert.equal(result.activitySummary.activeRequests, 1);
  assert.equal(result.activitySummary.openProposals, 1);
  assert.equal(result.activitySummary.unpaidInvoices, 1);
  assert.equal(result.activitySummary.openConversations, 1);
});

test("current engagement prioritizes active emergency and active work over history", async () => {
  const emergency = await collect({ relationshipId: "r-engagement" }, {
    relationships: [{ relationshipId: "r-engagement", ...parties }],
    emergencyRequests: [{ relationshipId: "r-engagement", emergencyRequestId: "emergency-active", ...parties, status: "active" }],
    standardJobs: [{ relationshipId: "r-engagement", jobId: "job-active", ...parties, status: "in_progress" }],
    jobHistory: [{ relationshipId: "r-engagement", jobId: "job-old", ...parties, status: "closed", readOnlyHistory: true }],
  });
  assert.equal(emergency.currentEngagement.requestId, "emergency-active");

  const work = await collect({ relationshipId: "r-work" }, { relationships: [{ relationshipId: "r-work", ...parties }], standardJobs: [{ relationshipId: "r-work", jobId: "job-active", ...parties, status: "in_progress" }], jobHistory: [{ relationshipId: "r-work", jobId: "job-old", ...parties, status: "closed", readOnlyHistory: true }] });
  assert.equal(work.currentEngagement.workflowId, "job-active");
});

test("communication direction and response ownership use metadata without message bodies", async () => {
  const incoming = await collect({ conversationId: "conversation-incoming", feature: "conversation" }, { conversations: [{ id: "conversation-incoming", ...parties, lastSenderId: "customer-1", unreadCount: 1, lastMessageAt: "2026-07-11T12:00:00.000Z", messageBody: "private body", attachments: ["private"] }] });
  assert.equal(incoming.communication.lastDirection, "customer_to_professional");
  assert.equal(incoming.communication.responseState, "awaiting_professional_response");
  assert.equal(incoming.nextRelationshipAction.action, "respond_to_customer");
  assert.doesNotMatch(JSON.stringify(incoming), /private body|attachments/);

  const outgoing = await collect({ conversationId: "conversation-outgoing", feature: "conversation" }, { conversations: [{ id: "conversation-outgoing", ...parties, lastSenderId: "professional-1", responsePending: true }] });
  assert.equal(outgoing.communication.responseState, "awaiting_customer_response");
});

test("follow-ups require explicit evidence and never invent overdue state", async () => {
  const result = await collect({ relationshipId: "r-followup" }, { relationships: [{ relationshipId: "r-followup", ...parties, followUpPending: true, followUpActor: "professional" }] });
  assert.equal(result.followUps.length, 1);
  assert.equal(result.followUps[0].dueAt, null);
  assert.equal("overdue" in result.followUps[0], false);

  const none = await collect({ relationshipId: "r-none" }, { relationships: [{ relationshipId: "r-none", ...parties }] });
  assert.deepEqual(none.followUps, []);
});

test("relationship action complements trusted Workflow Intelligence", async () => {
  const result = await collect({ relationshipId: "r-workflow" }, { relationships: [{ relationshipId: "r-workflow", ...parties }] }, { workflowId: "job-1", currentStage: "customer_approval", waitingOn: "customer", nextAction: { action: "wait_for_customer_approval", actor: "customer" }, completion: { finished: false } });
  assert.equal(result.nextRelationshipAction.action, "wait_for_customer_approval");
  assert.equal(result.nextRelationshipAction.actor, "customer");
});

test("identity contradictions lower confidence and do not merge disputed content", async () => {
  const result = await collect({ relationshipId: "r-conflict" }, { relationships: [{ relationshipId: "r-conflict", ...parties }], conversations: [{ id: "conversation-conflict", relationshipId: "r-conflict", customerId: "customer-other", professionalId: "professional-1", businessId: "business-1", privateNotes: "disputed secret" }] });
  assert.equal(result.confidenceLevel, "low");
  assert.ok(result.warnings.length > 0);
  assert.doesNotMatch(JSON.stringify(result), /customer-other|disputed secret/);
});

test("relationship context excludes private and sensitive fields", async () => {
  const result = await collect({ relationshipId: "r-private" }, { relationships: [{ relationshipId: "r-private", ...parties, privateNotes: "secret", address: "private address", phone: "555-private", email: "private@example.com", medicalInformation: "private health", personality: "inferred" }] });
  assert.doesNotMatch(JSON.stringify(result), /secret|private address|555-private|private@example|private health|personality/i);
  assert.equal("trustScore" in result, false);
  assert.equal("loyaltyScore" in result, false);
  assert.equal("sentiment" in result, false);
});

test("relationship context reaches Unified Context with one provider call and unchanged usage", async () => {
  let providerCalls = 0;
  const usage = [];
  let payload;
  const result = await askCompanionGateway({
    user: { id: "professional-1", accountType: "professional", businessId: "business-1" },
    body: { question: "What should I follow up on?", relationshipId: "r-provider", feature: "messages" },
    backendContext: { relationships: [{ relationshipId: "r-provider", ...parties }], conversations: [{ id: "conversation-provider", relationshipId: "r-provider", ...parties, lastSenderId: "customer-1", unreadCount: 1 }] },
    providers: { openai: { name: "openai", async complete(input) { providerCalls += 1; payload = JSON.parse(input.messages[1].content); return { answer: "Respond to the customer." }; } } },
    recordUsage(event) { usage.push(event); },
    logger: null,
  });
  assert.equal(result.success, true);
  assert.equal(providerCalls, 1);
  assert.equal(usage.length, 1);
  assert.equal(payload.unifiedContext.relationship.nextRelationshipAction.action, "respond_to_customer");
  assert.equal("relationship" in result, false);
});

test("relationship engine selection covers scoped surfaces without anonymous Community", () => {
  const registry = createEngineRegistry(createDefaultOrchestrationEngines());
  for (const feature of ["ask_meetro", "conversation", "messages", "customer_relationships", "work_center", "current_jobs", "emergency", "quote_builder", "completion", "closure", "job_history", "business_intelligence", "hiring", "community_relationship"]) {
    const request = { feature, source: {}, body: feature === "community_relationship" ? { relationshipId: "r1" } : {} };
    assert.ok(selectEngineIds(request, registry).includes("relationship"), feature);
  }
  assert.equal(selectEngineIds({ feature: "community", source: {}, body: {} }, registry).includes("relationship"), false);
});

test("Unified Context Builder preserves structured relationship context", () => {
  const unified = buildUnifiedContext([{ section: "relationship", priority: 60, data: { relationshipState: "active", followUps: [] } }]);
  assert.deepEqual(unified.context.relationship, { relationshipState: "active", followUps: [] });
});
