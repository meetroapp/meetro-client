import test from "node:test";
import assert from "node:assert/strict";

import { askCompanionGateway } from "../intelligence/gateway.js";
import {
  buildBusinessFinancialSignals,
  buildBusinessPriorities,
  buildBusinessScheduling,
  buildBusinessTrends,
  businessEngine,
  classifyBusinessHealth,
  collectBusinessIntelligence,
  deduplicateBusinessRecords,
  normalizeBusinessRecord,
  resolveBusinessSource,
} from "../intelligence/business/index.js";
import { createDefaultOrchestrationEngines } from "../intelligence/orchestrator/defaultEngines.js";
import { createEngineRegistry } from "../intelligence/orchestrator/engineRegistry.js";
import { selectEngineIds } from "../intelligence/orchestrator/engineSelector.js";

const NOW = Date.parse("2026-07-11T16:00:00.000Z");
const BUSINESS = "business-1";

function request(overrides = {}) {
  return {
    requestId: "request-1",
    userId: "professional-1",
    user: { id: "professional-1", accountType: "professional", businessId: BUSINESS },
    feature: "business_intelligence",
    capability: "",
    backendContext: { authorizedBusinessIds: [BUSINESS], businessId: BUSINESS, businessTimezone: "America/New_York" },
    repositories: {},
    ...overrides,
  };
}

function record(overrides = {}) {
  return { businessId: BUSINESS, jobId: "job-1", status: "active", createdAt: "2026-07-10T12:00:00.000Z", ...overrides };
}

async function context(backend = {}, overrides = {}) {
  const req = request({
    ...overrides,
    backendContext: { ...request().backendContext, ...backend },
  });
  return collectBusinessIntelligence({ request: req, collected: overrides.collected || {}, now: NOW });
}

test("Business Engine conforms to the shared executable engine interface", () => {
  assert.equal(businessEngine.id, "business");
  assert.equal(businessEngine.priority, 80);
  assert.equal(typeof businessEngine.supports, "function");
  assert.equal(typeof businessEngine.collectContext, "function");
});

test("data-less and unscoped requests return empty context safely", async () => {
  assert.deepEqual(await collectBusinessIntelligence({ request: request({ backendContext: {} }) }), {});
  assert.deepEqual(await collectBusinessIntelligence({ request: request() }), {});
});

test("authorized scope resolves and client-forged business IDs are ignored", async () => {
  const req = request({ businessId: "forged-business", body: { businessId: "forged-business" }, backendContext: { authorizedBusinessIds: [BUSINESS], businessId: BUSINESS, workflowRecords: [record()] } });
  const resolution = await resolveBusinessSource({ request: req });
  assert.equal(resolution.businessId, BUSINESS);
  assert.equal(resolution.records.length, 1);
});

test("name-only business matching is rejected", async () => {
  const req = request({ user: { id: "professional-1", accountType: "professional" }, backendContext: { businessName: "Example Business", workflowRecords: [{ businessName: "Example Business", jobId: "job-1" }] } });
  assert.equal(await resolveBusinessSource({ request: req }), null);
});

test("cross-business records and same customer across businesses remain isolated", async () => {
  const result = await context({ workflowRecords: [record({ jobId: "a", customerId: "customer-1" }), record({ businessId: "business-2", jobId: "b", customerId: "customer-1" })] });
  assert.equal(result.workload.totalOpenWorkflows, 1);
  assert.equal(JSON.stringify(result).includes("customer-1"), false);
});

test("standard lifecycle, completion, Closure, and history records deduplicate by stable job ID", async () => {
  const normalized = [
    normalizeBusinessRecord({ source: "workflowRecords", record: record({ jobId: "job-1", status: "active" }) }),
    normalizeBusinessRecord({ source: "completions", record: record({ jobId: "job-1", completionId: "completion-1", status: "completed" }) }),
    normalizeBusinessRecord({ source: "closures", record: record({ jobId: "job-1", closureId: "closure-1", status: "closed" }) }),
    normalizeBusinessRecord({ source: "jobHistory", record: record({ jobId: "job-1", historyId: "history-1", status: "history" }) }),
  ];
  const result = deduplicateBusinessRecords(normalized);
  assert.equal(result.workflows.length, 1);
  assert.equal(result.workflows[0].completionRecorded, true);
  assert.equal(result.workflows[0].closureRecorded, true);
  assert.equal(result.workflows[0].historyRecorded, true);
});

test("emergency lifecycle is counted once across active and completion representations", async () => {
  const result = await context({
    emergencyRequests: [record({ jobId: "emergency-job", emergencyRequestId: "emergency-1", status: "active" })],
    completions: [record({ jobId: "emergency-job", emergencyRequestId: "emergency-1", completionId: "completion-1", status: "completed" })],
  });
  assert.equal(result.workload.totalOpenWorkflows, 1);
  assert.equal(result.workload.activeEmergencyJobs, 1);
});

test("active jobs, scheduled today, upcoming work, and explicit overdue evidence count correctly", async () => {
  const result = await context({
    workflowRecords: [record({ jobId: "active-1", status: "in_progress" })],
    scheduleRecords: [
      record({ jobId: "today", scheduleId: "schedule-today", scheduledAt: "2026-07-11T18:00:00.000Z", status: "scheduled" }),
      record({ jobId: "future", scheduleId: "schedule-future", scheduledAt: "2026-07-13T18:00:00.000Z", status: "scheduled" }),
      record({ jobId: "overdue", scheduleId: "schedule-overdue", dueAt: "2026-07-10T18:00:00.000Z", status: "scheduled" }),
    ],
  });
  assert.equal(result.workload.activeJobs, 1);
  assert.equal(result.workload.scheduledToday, 1);
  assert.equal(result.workload.scheduledUpcoming, 2);
  assert.equal(result.workload.overdueItems, 1);
});

test("old records are not overdue without explicit due or schedule evidence", async () => {
  const result = await context({ workflowRecords: [record({ createdAt: "2020-01-01T00:00:00.000Z", status: "active" })] });
  assert.equal(result.workload.overdueItems, 0);
});

test("evaluation and proposal pipeline states aggregate deterministically", async () => {
  const result = await context({
    evaluations: [record({ evaluationId: "evaluation-1", status: "evaluation_pending" })],
    proposals: [
      record({ proposalId: "proposal-draft", jobId: "job-draft", status: "draft", amount: 100 }),
      record({ proposalId: "proposal-sent", jobId: "job-sent", status: "sent", amount: 200 }),
      record({ proposalId: "proposal-approved", jobId: "job-approved", status: "approved", amount: 300 }),
    ],
  });
  assert.equal(result.pipeline.pendingEvaluations, 1);
  assert.equal(result.pipeline.proposalsDraft, 1);
  assert.equal(result.pipeline.proposalsSent, 1);
  assert.equal(result.pipeline.awaitingCustomerApproval, 1);
  assert.equal(result.pipeline.approvedNotScheduled, 1);
});

test("waiting responsibility and blockers aggregate from trusted workflow evidence", async () => {
  const result = await context({ workflowRecords: [
    record({ jobId: "customer", waitingOn: "customer" }),
    record({ jobId: "professional", waitingOn: "professional", blockers: [{ code: "missing_evaluation" }] }),
    record({ jobId: "system", waitingOn: "system" }),
    record({ jobId: "third", waitingOn: "third_party" }),
  ] });
  assert.deepEqual(result.responsibility, { waitingOnCustomer: 1, waitingOnProfessional: 1, waitingOnSystem: 1, waitingOnThirdParty: 1 });
  assert.equal(result.workflowHealth.blocked, 1);
});

test("Completion backlog, Closure backlog, and history reconciliation stay distinct", async () => {
  const result = await context({ workflowRecords: [
    record({ jobId: "missing-completion", status: "work_completed" }),
    record({ jobId: "missing-closure", completionId: "completion-2", status: "completed" }),
    record({ jobId: "missing-history", completionId: "completion-3", closureId: "closure-3", status: "closed" }),
  ] });
  assert.equal(result.workflowHealth.completionBacklog, 1);
  assert.equal(result.workflowHealth.closureBacklog, 1);
  assert.equal(result.workflowHealth.historyReconciliationBacklog, 1);
});

test("financial signals separate proposal, approved, invoiced, and recorded revenue", () => {
  const typed = [
    normalizeBusinessRecord({ source: "proposals", record: record({ proposalId: "p1", status: "sent", amount: 100, currency: "USD" }) }),
    normalizeBusinessRecord({ source: "proposals", record: record({ proposalId: "p2", status: "approved", amount: 200, currency: "USD" }) }),
    normalizeBusinessRecord({ source: "invoices", record: record({ invoiceId: "i1", status: "sent", amount: 300, recordedRevenue: 300, currency: "USD" }) }),
    normalizeBusinessRecord({ source: "invoices", record: record({ invoiceId: "i2", status: "paid", amount: 400, recordedRevenue: 400, currency: "USD" }) }),
  ];
  const result = buildBusinessFinancialSignals(typed).signals;
  assert.equal(result.proposedValue, 100);
  assert.equal(result.approvedValue, 200);
  assert.equal(result.invoicedValue, 700);
  assert.equal(result.recordedRevenue, 400);
});

test("unpaid invoice and proposal value are never counted as collected revenue", async () => {
  const result = await context({
    proposals: [record({ proposalId: "proposal-1", status: "sent", amount: 5000, recordedRevenue: 5000 })],
    invoices: [record({ invoiceId: "invoice-1", status: "sent", amount: 5000, recordedRevenue: 5000 })],
  });
  assert.equal(result.financialSignals.recordedRevenue, null);
  assert.equal(result.financialSignals.proposedValue, 5000);
  assert.equal(result.financialSignals.unresolvedInvoiceCount, 1);
});

test("trusted recorded payment revenue remains separate and unchanged", async () => {
  const result = await context({ payments: [record({ paymentId: "payment-1", status: "recorded", recordedRevenue: 275, currency: "USD" })] });
  assert.equal(result.financialSignals.recordedRevenue, 275);
  assert.equal(result.financialSignals.proposedValue, null);
  assert.equal(result.financialSignals.invoicedValue, null);
});

test("mixed currencies warn and suppress aggregate currency", async () => {
  const result = await context({ proposals: [record({ proposalId: "p1", status: "sent", amount: 1, currency: "USD" }), record({ proposalId: "p2", jobId: "j2", status: "sent", amount: 1, currency: "EUR" })] });
  assert.ok(result.warnings.includes("mixed_currency"));
  assert.equal(result.financialSignals.currency, undefined);
  assert.equal(result.businessHealth.confidence, "low");
});

test("schedule conflicts require explicit overlap evidence and capacity is deterministic", () => {
  const typedRecords = [
    normalizeBusinessRecord({ source: "scheduleRecords", record: record({ scheduleId: "a", scheduledAt: "2026-07-11T14:00:00Z", endAt: "2026-07-11T16:00:00Z" }) }),
    normalizeBusinessRecord({ source: "scheduleRecords", record: record({ scheduleId: "b", scheduledAt: "2026-07-11T15:00:00Z", endAt: "2026-07-11T17:00:00Z" }) }),
  ];
  const result = buildBusinessScheduling({ workload: { activeEmergencyJobs: 0, scheduledToday: 2, scheduledUpcoming: 0, overdueItems: 0, totalOpenWorkflows: 1 }, pipeline: { approvedNotScheduled: 0 }, typedRecords });
  assert.equal(result.conflicts, 1);
  assert.equal(result.capacity, "full");
  const unknown = buildBusinessScheduling({ workload: { activeEmergencyJobs: 0, scheduledToday: 0, scheduledUpcoming: 0, overdueItems: 0, totalOpenWorkflows: 0 }, pipeline: { approvedNotScheduled: 0 }, typedRecords: [] });
  assert.equal(unknown.conflicts, 0);
  assert.equal(unknown.capacity, "unknown");
});

test("approved scoped Persistent Memory may provide capacity but not operational facts", async () => {
  const result = await context({ workflowRecords: [record()] }, {
    collected: { persistentMemory: { memories: [{ scope: "business", category: "business_preference", key: "scheduling_capacity", value: { capacity: "busy", activeJobs: 99 } }] } },
  });
  assert.equal(result.scheduling.capacity, "busy");
  assert.notEqual(result.workload.activeJobs, 99);
});

test("health classifier supports unknown, underutilized, healthy, busy, overloaded, and blocked", () => {
  const base = { workload: { totalOpenWorkflows: 1, activeJobs: 1, scheduledToday: 0, activeEmergencyJobs: 0, overdueItems: 0 }, responsibility: { waitingOnProfessional: 0 }, workflowHealth: { blocked: 0 }, scheduling: { capacity: "available" } };
  assert.equal(classifyBusinessHealth({ ...base, evidenceCount: 0 }).classification, "unknown");
  assert.equal(classifyBusinessHealth({ ...base, workload: { ...base.workload, totalOpenWorkflows: 0 }, evidenceCount: 1 }).classification, "underutilized");
  assert.equal(classifyBusinessHealth({ ...base, evidenceCount: 1 }).classification, "healthy");
  assert.equal(classifyBusinessHealth({ ...base, workload: { ...base.workload, activeJobs: 3 }, evidenceCount: 3 }).classification, "busy");
  assert.equal(classifyBusinessHealth({ ...base, workload: { ...base.workload, overdueItems: 2 }, evidenceCount: 3 }).classification, "overloaded");
  assert.equal(classifyBusinessHealth({ ...base, workflowHealth: { blocked: 2 }, evidenceCount: 3 }).classification, "blocked");
});

test("emergency and professional-owned priorities are deterministic and deduplicated", () => {
  const result = buildBusinessPriorities([
    { code: "emergency_overload", severity: "high", actor: "professional", count: 2, label: "Emergency" },
    { code: "professional_response_backlog", severity: "medium", actor: "professional", count: 3, label: "Respond" },
    { code: "professional_response_backlog", severity: "medium", actor: "professional", count: 3, label: "Respond" },
    { code: "proposal_approval_backlog", severity: "medium", actor: "customer", count: 3, label: "Waiting" },
  ]);
  assert.deepEqual(result.map((item) => item.code), ["respond_to_active_emergency", "respond_to_customer", "review_proposal_backlog"]);
});

test("normal customer waiting is not automatically a bottleneck or overdue", async () => {
  const result = await context({ workflowRecords: [record({ waitingOn: "customer", status: "pending_customer_response" })] });
  assert.equal(result.workload.overdueItems, 0);
  assert.equal(result.bottlenecks.some((item) => item.actor === "customer"), false);
});

test("trends require sufficient timestamped evidence", () => {
  assert.deepEqual(buildBusinessTrends([record()]), { workload: "insufficient_data", emergencyActivity: "insufficient_data", proposalActivity: "insufficient_data" });
});

test("contradictory active and closed representations lower confidence", async () => {
  const result = await context({
    workflowRecords: [record({ jobId: "conflict", status: "active" })],
    closures: [record({ jobId: "conflict", closureId: "closure-conflict", status: "closed" })],
  });
  assert.ok(result.warnings.includes("lifecycle_status_conflict"));
  assert.equal(result.businessHealth.confidence, "low");
  assert.equal(result.workload.closedJobs, 1);
});

test("private records and financial credentials are excluded from context and logs", async () => {
  const events = [];
  const result = await collectBusinessIntelligence({
    request: request({ backendContext: { ...request().backendContext, workflowRecords: [record({ customerName: "PRIVATE CUSTOMER", privateNotes: "PRIVATE NOTE", messageBody: "PRIVATE MESSAGE", bankAccount: "PRIVATE BANK" })] } }),
    logger: { info(event, fields) { events.push({ event, fields }); }, warn(event, fields) { events.push({ event, fields }); } }, now: NOW,
  });
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE CUSTOMER|PRIVATE NOTE|PRIVATE MESSAGE|PRIVATE BANK/);
  assert.doesNotMatch(JSON.stringify(events), /PRIVATE CUSTOMER|PRIVATE NOTE|PRIVATE MESSAGE|PRIVATE BANK/);
});

test("source records, schedules, invoices, payments, and revenue remain immutable", async () => {
  const backend = { workflowRecords: [record()], scheduleRecords: [record({ scheduleId: "s1", scheduledAt: "2026-07-12T00:00:00Z" })], invoices: [record({ invoiceId: "i1", status: "sent", amount: 100 })], payments: [record({ paymentId: "pay1", status: "recorded", recordedRevenue: 100 })] };
  const before = structuredClone(backend);
  await context(backend);
  assert.deepEqual(backend, before);
});

test("Business engine selection follows Persistent Memory and excludes anonymous Community", () => {
  const registry = createEngineRegistry(createDefaultOrchestrationEngines());
  const ids = selectEngineIds(request({ feature: "work_center" }), registry);
  assert.ok(ids.indexOf("persistent_memory") < ids.indexOf("business"));
  assert.equal(selectEngineIds({ userId: "", user: {}, feature: "community", source: {} }, registry).includes("business"), false);
});

test("Business context reaches Unified Context with one provider call and one usage event", async () => {
  const calls = []; const usage = [];
  const result = await askCompanionGateway({
    user: { id: "professional-1", accountType: "professional", businessId: BUSINESS },
    body: { question: "What needs attention?", feature: "business_intelligence" },
    backendContext: { authorizedBusinessIds: [BUSINESS], businessId: BUSINESS, workflowRecords: [record({ status: "in_progress" })] },
    providers: { openai: { name: "openai", async complete(payload) { calls.push(payload); return { answer: "Review active work." }; } } },
    recordUsage(event) { usage.push(event); }, logger: null,
  });
  assert.equal(result.success, true);
  assert.equal(calls.length, 1);
  assert.equal(usage.length, 1);
  const payload = JSON.parse(calls[0].messages[1].content);
  assert.equal(payload.unifiedContext.business.businessId, BUSINESS);
  assert.equal("provider" in result, false);
});
