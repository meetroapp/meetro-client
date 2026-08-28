import assert from "node:assert/strict";
import test from "node:test";

import {
  createProfessionalQuotesSourceState,
  fetchProfessionalQuotes,
  normalizeProfessionalQuotes,
  reduceProfessionalQuotesSourceState,
} from "../src/utils/professionalQuotesProjection.js";

const IDS = Object.freeze({
  quote: "10000000-0000-4000-8000-000000000001",
  parent: "20000000-0000-4000-8000-000000000002",
  job: "30000000-0000-4000-8000-000000000003",
});

function quote(overrides = {}) {
  return {
    id: IDS.quote,
    jobId: IDS.job,
    classification: "DRAFT",
    status: "DRAFT",
    customerDecision: null,
    totalMinor: 12500,
    currency: "USD",
    lineageType: null,
    lineageLabel: "Original",
    parentQuoteId: null,
    customer: { displayName: "QA Customer" },
    job: { title: "Synthetic sink repair", service: "Plumbing" },
    createdAt: "2026-08-10T12:00:00.000Z",
    updatedAt: "2026-08-13T12:00:00.000Z",
    issuedAt: null,
    decidedAt: null,
    lastActivityAt: "2026-08-13T12:00:00.000Z",
    actions: { canViewQuote: true, canContinueDraft: true, canViewJob: true },
    ...overrides,
  };
}

function payload(overrides = {}) {
  return {
    success: true,
    code: "PROFESSIONAL_QUOTES_LOADED",
    classification: "all",
    summary: { drafts: 1, deliveryPending: 0, waitingOnCustomer: 0, approved: 0, declined: 0 },
    quotes: [quote()],
    pagination: { limit: 50, hasMore: false, nextCursor: null },
    ...overrides,
  };
}

test("strict adapter accepts only the certified canonical Quote summary contract", () => {
  const normalized = normalizeProfessionalQuotes(payload());
  assert.equal(normalized.source, "PROFESSIONAL_QUOTES");
  assert.equal(normalized.quotes[0].classification, "DRAFT");
  assert.equal(normalized.quotes[0].customer.displayName, "QA Customer");
  assert.equal(normalized.quotes[0].actions.canContinueDraft, true);
  assert.equal(Object.isFrozen(normalized.quotes), true);
});

test("status, decision, and lineage truth are validated without collapsing records", () => {
  const approved = quote({
    classification: "APPROVED",
    status: "ISSUED",
    customerDecision: "APPROVED",
    issuedAt: "2026-08-11T12:00:00.000Z",
    decidedAt: "2026-08-12T12:00:00.000Z",
    actions: { canViewQuote: true, canContinueDraft: false, canViewJob: true },
  });
  const additional = quote({
    id: "40000000-0000-4000-8000-000000000004",
    lineageType: "SUPPLEMENTAL_QUOTE",
    lineageLabel: "Additional",
    parentQuoteId: IDS.parent,
  });
  const normalized = normalizeProfessionalQuotes(payload({
    summary: { drafts: 1, deliveryPending: 0, waitingOnCustomer: 0, approved: 1, declined: 0 },
    quotes: [additional, approved],
  }));
  assert.deepEqual(normalized.quotes.map(({ classification }) => classification), ["DRAFT", "APPROVED"]);
  assert.equal(normalized.quotes[0].lineageLabel, "Additional");
  assert.equal(normalized.quotes[1].status, "ISSUED");
});

test("issued delivery-pending remains distinct from delivered waiting-on-customer", () => {
  const issuedAt = "2026-08-11T12:00:00.000Z";
  const normalized = normalizeProfessionalQuotes(payload({
    summary: { drafts: 0, deliveryPending: 1, waitingOnCustomer: 1, approved: 0, declined: 0 },
    quotes: [
      quote({
        classification: "DELIVERY_PENDING",
        status: "ISSUED",
        issuedAt,
        actions: { canViewQuote: true, canContinueDraft: false, canViewJob: true },
      }),
      quote({
        id: "60000000-0000-4000-8000-000000000006",
        classification: "WAITING_ON_CUSTOMER",
        status: "ISSUED",
        issuedAt,
        actions: { canViewQuote: true, canContinueDraft: false, canViewJob: true },
      }),
    ],
  }));
  assert.deepEqual(
    normalized.quotes.map(({ classification }) => classification),
    ["DELIVERY_PENDING", "WAITING_ON_CUSTOMER"]
  );
});

test("unknown, private, malformed, and customer-only authority fails closed", () => {
  const invalidPayloads = [
    payload({ privateField: "no" }),
    payload({ quotes: [quote({ customerEmail: "private@example.com" })] }),
    payload({ quotes: [quote({ customer: { displayName: "QA", phone: "555" } })] }),
    payload({ quotes: [quote({ actions: { canViewQuote: true, canContinueDraft: true, canViewJob: true, canApprove: true } })] }),
    payload({ quotes: [quote({ classification: "APPROVED", status: "ISSUED" })] }),
    payload({ quotes: [quote({ lineageType: "SUPPLEMENTAL_QUOTE", lineageLabel: "Additional" })] }),
  ];
  invalidPayloads.forEach((value) => assert.equal(normalizeProfessionalQuotes(value), null));
});

test("transport uses normal authenticated GET and preserves opaque cursor exactly", async () => {
  const calls = [];
  const cursor = "opaque.cursor/value";
  const normalized = await fetchProfessionalQuotes({
    classification: "all",
    limit: 50,
    cursor,
    authFetchImpl: async (...args) => {
      calls.push(args);
      return {
        response: { ok: true, status: 200 },
        data: payload({ pagination: { limit: 50, hasMore: true, nextCursor: "next-opaque" } }),
      };
    },
  });
  assert.deepEqual(calls, [[
    `/professional/quotes?classification=all&limit=50&cursor=${encodeURIComponent(cursor)}`,
    { method: "GET", cache: "no-store" },
    undefined,
  ]]);
  assert.equal(normalized.pagination.nextCursor, "next-opaque");
});

test("transport and malformed canonical responses produce unavailable errors", async () => {
  await assert.rejects(
    fetchProfessionalQuotes({
      authFetchImpl: async () => ({
        response: { ok: false, status: 503 },
        data: { success: false, code: "PROFESSIONAL_QUOTES_FAILED", message: "Unavailable" },
      }),
    }),
    (error) => error.status === 503 && error.code === "PROFESSIONAL_QUOTES_FAILED"
  );
  await assert.rejects(
    fetchProfessionalQuotes({
      authFetchImpl: async () => ({ response: { ok: true, status: 200 }, data: payload({ rawRows: [] }) }),
    }),
    (error) => error.status === 502 && error.code === "INVALID_PROFESSIONAL_QUOTES_RESPONSE"
  );
});

test("source state distinguishes loading, confirmed refresh, append, and unavailable", () => {
  const initial = reduceProfessionalQuotesSourceState(
    createProfessionalQuotesSourceState(),
    { type: "load" }
  );
  assert.equal(initial.status, "loading");
  const firstPage = normalizeProfessionalQuotes(payload({
    pagination: { limit: 50, hasMore: true, nextCursor: "opaque-page-2" },
  }));
  const confirmed = reduceProfessionalQuotesSourceState(initial, {
    type: "success",
    quotes: firstPage,
  });
  assert.equal(confirmed.status, "confirmed");
  assert.equal(reduceProfessionalQuotesSourceState(confirmed, { type: "load" }).refreshing, true);
  assert.equal(reduceProfessionalQuotesSourceState(confirmed, { type: "load-more" }).loadingMore, true);
  const secondPage = normalizeProfessionalQuotes(payload({
    quotes: [quote({ id: "50000000-0000-4000-8000-000000000005" })],
  }));
  const appended = reduceProfessionalQuotesSourceState(confirmed, {
    type: "append",
    quotes: secondPage,
  });
  assert.equal(appended.confirmed.quotes.length, 2);
  const unavailable = reduceProfessionalQuotesSourceState(initial, {
    type: "failure",
    message: "Unavailable",
  });
  assert.equal(unavailable.status, "error");
  assert.equal(unavailable.confirmed, null);
});
