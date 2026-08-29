import assert from "node:assert/strict";
import test from "node:test";

import {
  WorkPreparationApiError,
  createWorkPreparationIdempotencyKey,
  fetchWorkPreparation,
  materializeWorkPreparation,
  normalizeWorkPreparation,
  recordWorkPreparationEvent,
  recordWorkPreparationPurchase,
  reviseWorkPreparation,
} from "../src/utils/workPreparationApi.js";

const IDS = Object.freeze({
  job: "11111111-1111-4111-8111-111111111111",
  plan: "22222222-2222-4222-8222-222222222222",
  quote: "33333333-3333-4333-8333-333333333333",
  decision: "44444444-4444-4444-8444-444444444444",
  item: "55555555-5555-4555-8555-555555555555",
  scope: "66666666-6666-4666-8666-666666666666",
  purchase: "77777777-7777-4777-8777-777777777777",
  event: "88888888-8888-4888-8888-888888888888",
});
const NOW = "2026-08-28T15:00:00.000Z";

function item(overrides = {}) {
  return {
    id: IDS.item, sequence: 1, kind: "MATERIAL", description: "Approved flooring",
    quantity: 20, unit: "sq ft", providerResponsibility: "BUSINESS",
    commercialTreatment: "INCLUDED_IN_ACCEPTED_TOTAL", visibility: "CUSTOMER_VISIBLE",
    requiredForWorkStart: true, sourceLineage: "QUOTE_SCOPE_ITEM", sourceScopeItemId: IDS.scope,
    acquisitionState: "PURCHASED", preparationState: "NOT_STARTED", readyForWorkStart: false,
    internalEstimatedCostMinor: 15000, internalCostCurrency: "USD",
    purchase: { recordCount: 1, netQuantity: 20, internalCostMinor: 14000 },
    ...overrides,
  };
}

function plan(overrides = {}) {
  return {
    contractVersion: 1, exists: true, id: IDS.plan, jobId: IDS.job, relationshipId: 42,
    source: { quoteId: IDS.quote, issuedQuoteVersion: 3, approvedCustomerDecisionId: IDS.decision },
    currentVersion: 2, planningState: "PLANNED", workStartPolicy: "REQUIRED_ITEMS_READY",
    readiness: {
      planningState: "PLANNED", acquisitionState: "PURCHASED", preparationState: "NOT_STARTED",
      customerItemPending: false, workStartBlocked: true, requiredItemCount: 1,
      readyRequiredItemCount: 0, summary: "Required preparation remains.",
    },
    deposit: { state: "SATISFIED", commitmentLocked: false }, items: [item()],
    createdAt: NOW, updatedAt: NOW, internalNotes: "Business-only planning note.",
    purchaseSummary: { recordCount: 1, correctionCount: 0, internalCostMinor: 14000, currency: "USD" },
    safeNextActions: ["REVISE_PLAN", "RECORD_PURCHASE", "RECORD_PREPARATION", "RESOLVE_REQUIRED_PREPARATION"],
    ...overrides,
  };
}

function authResponse(data, status = 200) {
  return { response: { ok: status >= 200 && status < 300, status }, data };
}

test("strict professional projection preserves planning, acquisition, and preparation as distinct dimensions", () => {
  const normalized = normalizeWorkPreparation(plan(), { jobId: IDS.job });
  assert.equal(normalized.readiness.planningState, "PLANNED");
  assert.equal(normalized.items[0].acquisitionState, "PURCHASED");
  assert.equal(normalized.items[0].preparationState, "NOT_STARTED");
  assert.equal(normalized.items[0].readyForWorkStart, false);
  assert.equal(normalized.items[0].purchase.internalCostMinor, 14000);

  assert.equal(normalizeWorkPreparation({ contractVersion: 1, exists: false, jobId: IDS.job }, { jobId: IDS.job }).exists, false);
  assert.equal(normalizeWorkPreparation({ ...plan(), browserReady: true }, { jobId: IDS.job }), null);
  assert.equal(normalizeWorkPreparation(plan({ deposit: { state: "DUE", commitmentLocked: false } }), { jobId: IDS.job }), null);
  assert.equal(normalizeWorkPreparation(plan({ items: [item({ readyForWorkStart: true })] }), { jobId: IDS.job }).items[0].acquisitionState, "PURCHASED");
});

test("canonical deposit states are consumed exactly and never calculated from client amounts", () => {
  for (const state of ["DUE", "PARTIALLY_SATISFIED", "RECONCILIATION_REQUIRED"]) {
    const normalized = normalizeWorkPreparation(plan({
      deposit: { state, commitmentLocked: true },
      safeNextActions: ["REVISE_PLAN", "REVIEW_DEPOSIT"],
    }), { jobId: IDS.job });
    assert.equal(normalized.deposit.state, state);
    assert.equal(normalized.deposit.commitmentLocked, true);
  }
  for (const state of ["SATISFIED", "NOT_REQUIRED"]) {
    const normalized = normalizeWorkPreparation(plan({ deposit: { state, commitmentLocked: false } }), { jobId: IDS.job });
    assert.equal(normalized.deposit.state, state);
    assert.equal(normalized.deposit.commitmentLocked, false);
  }
});

test("business, customer, tool, equipment, preparation-task, and approval-required items stay distinct", () => {
  const itemIds = [
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", "ffffffff-ffff-4fff-8fff-ffffffffffff",
  ];
  const cases = [
    item(),
    item({ kind: "MATERIAL", providerResponsibility: "CUSTOMER", commercialTreatment: "CUSTOMER_SUPPLIED", internalEstimatedCostMinor: null, internalCostCurrency: null, acquisitionState: "CUSTOMER_ITEM_PENDING", purchase: { recordCount: 0, netQuantity: 0, internalCostMinor: 0 } }),
    item({ kind: "TOOL", providerResponsibility: "BUSINESS", commercialTreatment: "NOT_CUSTOMER_BILLABLE", acquisitionState: "READY" }),
    item({ kind: "EQUIPMENT", providerResponsibility: "BUSINESS", commercialTreatment: "NOT_CUSTOMER_BILLABLE", acquisitionState: "NOT_STARTED" }),
    item({ kind: "PREPARATION_TASK", providerResponsibility: "BUSINESS", commercialTreatment: "NOT_CUSTOMER_BILLABLE", acquisitionState: "NOT_REQUIRED", preparationState: "IN_PROGRESS" }),
    item({ kind: "MATERIAL", providerResponsibility: "BUSINESS", commercialTreatment: "APPROVAL_REQUIRED", acquisitionState: "NOT_STARTED" }),
  ];
  cases.forEach((candidate, index) => {
    const normalized = normalizeWorkPreparation(plan({ items: [{ ...candidate, id: itemIds[index] }] }), { jobId: IDS.job });
    assert.equal(normalized.items[0].kind, candidate.kind);
    assert.equal(normalized.items[0].providerResponsibility, candidate.providerResponsibility);
  });
});

test("dedicated no-store GET is the only materials read and does not materialize on view", async () => {
  const calls = [];
  const read = await fetchWorkPreparation({
    jobId: IDS.job,
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return authResponse({ success: true, code: "WORK_PREPARATION_NOT_MATERIALIZED", workPreparation: { contractVersion: 1, exists: false, jobId: IDS.job } });
    },
  });
  assert.equal(read.workPreparation.exists, false);
  assert.deepEqual(calls, [{ endpoint: `/jobs/${IDS.job}/work-preparation`, options: { method: "GET", cache: "no-store" } }]);
});

test("materialization uses approved-decision evidence and Idempotency-Key", async () => {
  const calls = [];
  const result = await materializeWorkPreparation({
    jobId: IDS.job, approvedCustomerDecisionId: IDS.decision,
    idempotencyKey: "work-preparation:materialize:fixed",
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return authResponse({ success: true, code: "WORK_PREPARATION_MATERIALIZED", workPreparation: plan(), replayed: false }, 201);
    },
  });
  assert.equal(result.workPreparation.id, IDS.plan);
  assert.equal(calls[0].endpoint, `/jobs/${IDS.job}/work-preparation/materialize`);
  assert.equal(calls[0].options.headers["Idempotency-Key"], "work-preparation:materialize:fixed");
  assert.deepEqual(JSON.parse(calls[0].options.body), { approvedCustomerDecisionId: IDS.decision });
});

test("revision sends a full bounded snapshot without browser-derived readiness", async () => {
  const calls = [];
  const revisionItem = {
    id: IDS.item, sequence: 1, kind: "MATERIAL", description: "Approved flooring",
    quantity: 20, unit: "sq ft", providerResponsibility: "BUSINESS",
    commercialTreatment: "INCLUDED_IN_ACCEPTED_TOTAL", visibility: "CUSTOMER_VISIBLE",
    requiredForWorkStart: true, internalEstimatedCostMinor: 15000, internalCostCurrency: "USD",
    sourceLineage: "QUOTE_SCOPE_ITEM", sourceScopeItemId: IDS.scope,
  };
  await reviseWorkPreparation({
    jobId: IDS.job, planId: IDS.plan, expectedVersion: 2, planningState: "PLANNED",
    workStartPolicy: "REQUIRED_ITEMS_READY", internalNotes: "Confirm delivery.", items: [revisionItem],
    idempotencyKey: "work-preparation:revise:fixed",
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return authResponse({ success: true, code: "WORK_PREPARATION_REVISED", workPreparation: plan({ internalNotes: "Confirm delivery." }) });
    },
  });
  const body = JSON.parse(calls[0].options.body);
  assert.equal(calls[0].endpoint, `/jobs/${IDS.job}/work-preparation/${IDS.plan}/revisions`);
  assert.deepEqual(body.items, [revisionItem]);
  for (const forbidden of ["acquisitionState", "preparationState", "readyForWorkStart", "depositSatisfied", "workStartAllowed"]) {
    assert.equal(Object.hasOwn(body, forbidden), false);
    assert.equal(Object.hasOwn(body.items[0], forbidden), false);
  }
});

test("purchase and preparation commands send exact authority inputs", async () => {
  const calls = [];
  await recordWorkPreparationPurchase({
    jobId: IDS.job, planId: IDS.plan, itemId: IDS.item, expectedVersion: 2,
    quantity: 20, unit: "sq ft", internalCostMinor: 14000, internalCostCurrency: "USD",
    vendor: "Supply Co", purchasedAt: NOW, externalReference: "PO-18", visibility: "BUSINESS_ONLY",
    idempotencyKey: "work-preparation:purchase:fixed",
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return authResponse({ success: true, code: "MATERIAL_PURCHASE_RECORDED", purchase: {
        id: IDS.purchase, planId: IDS.plan, planVersion: 2, itemId: IDS.item,
        quantity: 20, unit: "sq ft", internalCostMinor: 14000, internalCostCurrency: "USD",
        purchasedAt: NOW, visibility: "BUSINESS_ONLY", eventId: IDS.event,
      } }, 201);
    },
  });
  await recordWorkPreparationEvent({
    jobId: IDS.job, planId: IDS.plan, itemId: IDS.item, expectedVersion: 2,
    eventType: "MATERIAL_STAGED", visibility: "BUSINESS_ONLY", internalNote: null,
    idempotencyKey: "work-preparation:event:fixed",
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return authResponse({ success: true, code: "WORK_PREPARATION_EVENT_RECORDED", event: {
        id: IDS.event, planId: IDS.plan, planVersion: 2, itemId: IDS.item,
        eventType: "MATERIAL_STAGED", readinessDimension: "ACQUISITION",
        resultingReadinessState: "READY", visibility: "BUSINESS_ONLY",
      } }, 201);
    },
  });
  assert.equal(calls[0].endpoint, `/jobs/${IDS.job}/work-preparation/${IDS.plan}/items/${IDS.item}/purchases`);
  assert.equal(calls[1].endpoint, `/jobs/${IDS.job}/work-preparation/${IDS.plan}/events`);
  assert.equal(calls[1].options.headers["Idempotency-Key"], "work-preparation:event:fixed");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    itemId: IDS.item, expectedVersion: 2, eventType: "MATERIAL_STAGED",
    visibility: "BUSINESS_ONLY", customerVisibleNote: null, internalNote: null,
  });
});

test("invalid costs and failed authority responses fail closed", async () => {
  await assert.rejects(
    recordWorkPreparationPurchase({
      jobId: IDS.job, planId: IDS.plan, itemId: IDS.item, expectedVersion: 2,
      quantity: 1, unit: "each", internalCostMinor: 0, internalCostCurrency: "USD",
      purchasedAt: NOW, idempotencyKey: "work-preparation:purchase:invalid",
      authFetchImpl: async () => { throw new Error("must not call"); },
    }),
    (error) => error instanceof WorkPreparationApiError && error.code === "INVALID_MATERIAL_PURCHASE"
  );
  await assert.rejects(
    fetchWorkPreparation({
      jobId: IDS.job,
      authFetchImpl: async () => authResponse({ success: false, code: "WORK_PREPARATION_FORBIDDEN", message: "Forbidden" }, 403),
    }),
    (error) => error instanceof WorkPreparationApiError && error.code === "WORK_PREPARATION_FORBIDDEN"
  );
});

test("idempotency key generator is deterministic with an injected UUID provider", () => {
  assert.equal(
    createWorkPreparationIdempotencyKey("Record Purchase", { randomUUID: () => IDS.purchase }),
    `work-preparation:record-purchase:${IDS.purchase}`
  );
});
