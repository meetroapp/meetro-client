import test from "node:test";
import assert from "node:assert/strict";

import { askCompanionGateway } from "../intelligence/gateway.js";
import { createDefaultOrchestrationEngines } from "../intelligence/orchestrator/defaultEngines.js";
import { createEngineRegistry } from "../intelligence/orchestrator/engineRegistry.js";
import { selectEngineIds } from "../intelligence/orchestrator/engineSelector.js";
import { buildUnifiedContext } from "../intelligence/orchestrator/unifiedContextBuilder.js";
import { collectWorkflowIntelligence, workflowEngineSupports } from "../intelligence/workflow/workflowEngine.js";
import { STAGE_ALIASES } from "../intelligence/workflow/workflowStageMap.js";

function request(body = {}, backendContext = {}) {
  return {
    feature: body.feature || "ask_meetro",
    source: body.source || {},
    body,
    user: { id: "user-1" },
    projectId: body.projectId || "",
    conversationId: body.conversationId || "",
    backendContext,
    repositories: {},
  };
}

async function collect(body, backendContext, context = {}) {
  return collectWorkflowIntelligence({ request: request(body, backendContext), context });
}

test("Workflow Engine conforms to the executable engine interface", () => {
  const engine = createDefaultOrchestrationEngines().find((item) => item.id === "workflow");
  assert.equal(engine.id, "workflow");
  assert.equal(typeof engine.supports, "function");
  assert.equal(typeof engine.collectContext, "function");
  assert.equal(workflowEngineSupports({ feature: "work_center", source: {} }), true);
});

test("canonical workflow status aliases are unique and proposal-specific acceptance stays contextual", async () => {
  const aliases = Object.values(STAGE_ALIASES).flat();
  assert.equal(new Set(aliases).size, aliases.length);

  const requestAccepted = await collect(
    { requestId: "request-accepted" },
    { serviceRequests: [{ requestId: "request-accepted", status: "accepted" }] }
  );
  assert.equal(requestAccepted.currentStage, "communication");

  const proposalAccepted = await collect(
    { jobId: "job-proposal-accepted" },
    { proposals: [{ jobId: "job-proposal-accepted", proposalId: "p-accepted", proposalStatus: "accepted" }] }
  );
  assert.equal(proposalAccepted.currentStage, "payment_deposit");
});

test("data-less and unsupported workflow requests return empty context safely", async () => {
  assert.deepEqual(await collect({ feature: "ask_meetro" }, {}), {});
  assert.equal(workflowEngineSupports({ feature: "community", source: {} }), false);
});

test("standard and emergency workflows resolve by stable IDs", async () => {
  const standard = await collect(
    { projectId: "project-1" },
    { standardJobs: [{ projectId: "project-1", jobId: "job-1", status: "in_progress" }] }
  );
  assert.equal(standard.workflowType, "standard_job");
  assert.equal(standard.workflowId, "project-1");
  assert.equal(standard.currentStage, "perform_work");

  const emergency = await collect(
    { emergencyRequestId: "emergency-1" },
    { emergencyJobs: [{ emergencyRequestId: "emergency-1", jobId: "job-e1", status: "arrived" }] }
  );
  assert.equal(emergency.workflowType, "emergency_job");
  assert.equal(emergency.currentStage, "perform_work");
});

test("conversation-linked workflows resolve without customer-name matching", async () => {
  const linked = await collect(
    { conversationId: "conversation-1", feature: "conversation" },
    { standardJobs: [{ jobId: "job-1", conversationId: "conversation-1", status: "proposal_sent" }] }
  );
  assert.equal(linked.workflowId, "job-1");
  assert.equal(linked.currentStage, "customer_approval");

  const nameOnly = await collect(
    { customerId: "Sarah" },
    { standardJobs: [{ jobId: "job-sarah", customerName: "Sarah", status: "in_progress" }, { jobId: "job-william", customerName: "William", status: "completed" }] }
  );
  assert.deepEqual(nameOnly, {});
});

test("stable identifiers isolate records belonging to different customers", async () => {
  const result = await collect(
    { jobId: "job-sarah" },
    { standardJobs: [
      { jobId: "job-sarah", customerId: "sarah", status: "proposal_sent" },
      { jobId: "job-william", customerId: "william", status: "completed", privateNotes: "must not leak" },
    ] }
  );
  assert.equal(result.workflowId, "job-sarah");
  assert.equal(result.currentStage, "customer_approval");
  assert.doesNotMatch(JSON.stringify(result), /william|must not leak/i);
});

test("evaluation and proposal states produce deterministic next actions", async () => {
  const evaluation = await collect(
    { jobId: "job-eval" },
    { evaluations: [{ jobId: "job-eval", evaluationId: "eval-1", evaluationStatus: "evaluation_complete" }] }
  );
  assert.equal(evaluation.currentStage, "evaluation");
  assert.equal(evaluation.nextAction.action, "create_proposal");
  assert.equal(evaluation.waitingOn, "professional");

  const proposal = await collect(
    { jobId: "job-proposal" },
    { proposals: [{ jobId: "job-proposal", proposalId: "proposal-1", proposalStatus: "proposal_sent" }] }
  );
  assert.equal(proposal.currentStage, "customer_approval");
  assert.equal(proposal.nextAction.action, "wait_for_customer_approval");
  assert.equal(proposal.waitingOn, "customer");
});

test("approval and payment evidence lead to deposit or work scheduling", async () => {
  const depositDue = await collect(
    { jobId: "job-deposit" },
    { standardJobs: [{ jobId: "job-deposit", status: "approved", depositRequired: true, depositStatus: "pending", proposalId: "p1" }] }
  );
  assert.equal(depositDue.currentStage, "payment_deposit");
  assert.equal(depositDue.nextAction.action, "collect_deposit");
  assert.equal(depositDue.waitingOn, "customer");

  const paid = await collect(
    { jobId: "job-paid" },
    { standardJobs: [{ jobId: "job-paid", status: "deposit_received", depositRequired: true, depositPaid: true, proposalId: "p2" }] }
  );
  assert.equal(paid.nextAction.action, "schedule_work");
  assert.equal(paid.waitingOn, "professional");
});

test("scheduled and active work produce operational next actions", async () => {
  const scheduled = await collect(
    { jobId: "job-scheduled" },
    { standardJobs: [{ jobId: "job-scheduled", status: "work_scheduled" }] }
  );
  assert.equal(scheduled.nextAction.action, "mark_on_the_way");

  const active = await collect(
    { jobId: "job-active" },
    { standardJobs: [{ jobId: "job-active", status: "in_progress" }] }
  );
  assert.equal(active.nextAction.action, "continue_work");
  assert.equal(active.waitingOn, "professional");
});

test("work completion without a completion record requires explicit recording", async () => {
  const result = await collect(
    { jobId: "job-complete" },
    { standardJobs: [{ jobId: "job-complete", status: "work_completed" }] }
  );
  assert.equal(result.currentStage, "completion");
  assert.equal(result.completion.completionRecorded, false);
  assert.equal(result.completion.closureRecorded, false);
  assert.equal(result.nextAction.action, "record_completion");
});

test("completion remains open while financial and operational obligations are unresolved", async () => {
  const result = await collect(
    { jobId: "job-open" },
    { completions: [{
      jobId: "job-open",
      completionId: "completion-1",
      status: "completed",
      paymentRequired: true,
      paymentStatus: "pending",
      permitRequired: true,
      permitStatus: "pending",
      inspectionRequired: true,
      inspectionStatus: "pending",
    }] }
  );
  assert.equal(result.completion.workCompleted, true);
  assert.equal(result.completion.closureRecorded, false);
  assert.equal(result.completion.historyEligible, false);
  assert.equal(result.blocked, true);
  assert.ok(result.blockers.some((item) => item.code === "required_payment_unpaid"));
  assert.ok(result.blockers.some((item) => item.code === "required_permit_unresolved"));
  assert.ok(result.blockers.some((item) => item.code === "required_inspection_unresolved"));
});

test("required invoice, receipt, and customer confirmation remain explicit closure blockers", async () => {
  const result = await collect(
    { jobId: "job-documents" },
    { completions: [{
      jobId: "job-documents",
      completionId: "completion-documents",
      status: "completed",
      invoiceRequired: true,
      receiptRequired: true,
      customerConfirmationRequired: true,
      customerConfirmationStatus: "pending",
    }] }
  );
  assert.equal(result.obligations.invoice, "missing");
  assert.equal(result.obligations.receipt, "missing");
  assert.equal(result.obligations.customerConfirmation, "pending");
  assert.ok(result.blockers.some((item) => item.code === "required_invoice_missing"));
  assert.ok(result.blockers.some((item) => item.code === "required_receipt_missing"));
  assert.ok(result.blockers.some((item) => item.code === "customer_confirmation_missing"));
});

test("optional permits are not required and closed normalized history is finished", async () => {
  const result = await collect(
    { jobId: "job-history" },
    { jobHistory: [{
      jobId: "job-history",
      status: "closed",
      completedAt: "2026-01-01",
      closedAt: "2026-01-02",
      readOnlyHistory: true,
      permitRequired: false,
      inspectionRequired: false,
    }] }
  );
  assert.equal(result.currentStage, "job_history");
  assert.equal(result.obligations.permits, "not_required");
  assert.equal(result.obligations.inspection, "not_required");
  assert.equal(result.nextAction.action, "no_action");
  assert.equal(result.completion.finished, true);
});

test("closed source without normalized history requires reconciliation", async () => {
  const result = await collect(
    { jobId: "job-closed" },
    { closures: [{ jobId: "job-closed", status: "closed", completionId: "c1", completedAt: "2026-01-01", closedAt: "2026-01-02" }] }
  );
  assert.equal(result.currentStage, "closure");
  assert.equal(result.nextAction.action, "reconcile_job_history");
  assert.equal(result.waitingOn, "system");
  assert.equal(result.completion.historyEligible, true);
  assert.ok(result.blockers.some((item) => item.code === "history_normalization_missing"));
});

test("contradictory records lower confidence without crashing", async () => {
  const result = await collect(
    { jobId: "job-conflict" },
    { standardJobs: [{ jobId: "job-conflict", status: "in_progress", readOnlyHistory: true, savedToHistory: true }] }
  );
  assert.equal(result.confidenceLevel, "low");
  assert.ok(result.warnings.some((warning) => /remains active/i.test(warning)));
  assert.equal(result.blocked, true);
});

test("closure with an unresolved required permit reports contradiction and is not history eligible", async () => {
  const result = await collect(
    { jobId: "job-invalid-closure" },
    { closures: [{
      jobId: "job-invalid-closure",
      status: "closed",
      completionId: "completion-invalid",
      completedAt: "2026-01-01",
      closedAt: "2026-01-02",
      permitRequired: true,
      permitStatus: "pending",
    }] }
  );
  assert.equal(result.confidenceLevel, "low");
  assert.equal(result.completion.historyEligible, false);
  assert.ok(result.warnings.some((warning) => /required permit/i.test(warning)));
});

test("workflow context minimizes evidence and excludes sensitive raw fields", async () => {
  const result = await collect(
    { jobId: "job-private" },
    { standardJobs: [{
      jobId: "job-private",
      status: "proposal_sent",
      proposalId: "proposal-private",
      privateNotes: "secret note",
      address: "private address",
      paymentCredentials: "card-secret",
      conversationHistory: ["private message"],
    }] }
  );
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /secret note|private address|card-secret|private message/);
  assert.ok(result.evidence.length <= 6);
});

test("workflow context reaches unified provider context with one provider call and one usage record", async () => {
  let providerCalls = 0;
  const usage = [];
  let providerPayload;
  const result = await askCompanionGateway({
    user: { id: "user-1" },
    body: { question: "What happens next?", jobId: "job-provider", feature: "work_center" },
    backendContext: { standardJobs: [{ jobId: "job-provider", status: "proposal_sent", proposalId: "proposal-1" }] },
    providers: { openai: { name: "openai", async complete(payload) { providerCalls += 1; providerPayload = JSON.parse(payload.messages[1].content); return { answer: "Wait for approval." }; } } },
    recordUsage(event) { usage.push(event); },
    logger: null,
  });
  assert.equal(result.success, true);
  assert.equal(providerCalls, 1);
  assert.equal(usage.length, 1);
  assert.equal(providerPayload.unifiedContext.workflow.currentStage, "customer_approval");
  assert.equal("workflow" in result, false);
});

test("workflow selection covers operational surfaces and excludes unsupported knowledge fallback", () => {
  const registry = createEngineRegistry(createDefaultOrchestrationEngines());
  for (const feature of ["emergency", "quote_builder", "evaluation", "work_center", "current_jobs", "schedule", "active_work", "completion", "closure", "job_history", "business_intelligence"]) {
    assert.ok(selectEngineIds({ feature, source: {} }, registry).includes("workflow"), feature);
  }
  assert.equal(selectEngineIds({ feature: "community", source: {} }, registry).includes("workflow"), false);
  assert.deepEqual(selectEngineIds({ feature: "unknown", source: {} }, registry), ["context"]);
});

test("Unified Context Builder preserves structured workflow output", () => {
  const unified = buildUnifiedContext([{ section: "workflow", priority: 50, data: { currentStage: "completion", blockers: [] } }]);
  assert.deepEqual(unified.context.workflow, { currentStage: "completion", blockers: [] });
});
