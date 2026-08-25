import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchCustomerJobQuotes,
  normalizeCustomerJobQuotes,
} from "../src/utils/customerJobQuotesApi.js";

const IDS = Object.freeze({
  job: "60000000-0000-4000-8000-000000000006",
  quote: "10000000-0000-4000-8000-000000000001",
  additional: "20000000-0000-4000-8000-000000000002",
});

function quote(overrides = {}) {
  return {
    quoteId: IDS.quote,
    jobId: IDS.job,
    businessStatus: "WAITING_ON_CUSTOMER",
    status: "ISSUED",
    customerDecision: null,
    totalMinor: 265000,
    currency: "USD",
    lineageLabel: "Original",
    createdAt: "2026-08-10T12:00:00.000Z",
    updatedAt: "2026-08-13T12:00:00.000Z",
    issuedAt: "2026-08-12T12:00:00.000Z",
    decidedAt: null,
    actions: {
      canViewQuote: true,
      canApprove: true,
      canDecline: true,
    },
    ...overrides,
  };
}

function payload(overrides = {}) {
  return {
    success: true,
    code: "CUSTOMER_JOB_QUOTES_LOADED",
    job: {
      id: IDS.job,
      requestId: 16,
      title: "Synthetic sink repair",
      service: "Handyman",
      issuerName: "All Handyman Services",
    },
    quotes: [quote()],
    pagination: { limit: 25, hasMore: false, nextCursor: null },
    ...overrides,
  };
}

test("strict discovery adapter accepts the exact customer allowlisted contract", () => {
  const normalized = normalizeCustomerJobQuotes(payload(), { jobId: IDS.job });
  assert.equal(normalized.source, "CUSTOMER_JOB_QUOTES");
  assert.equal(normalized.job.id, IDS.job);
  assert.equal(normalized.job.issuerName, "All Handyman Services");
  assert.equal(normalized.quotes[0].quoteId, IDS.quote);
  assert.equal(normalized.quotes[0].actions.canApprove, true);
  assert.equal(Object.isFrozen(normalized.quotes), true);
});

test("issued, Approved, Declined, and lineage truth remain independent", () => {
  const normalized = normalizeCustomerJobQuotes(payload({
    quotes: [
      quote(),
      quote({
        quoteId: IDS.additional,
        businessStatus: "APPROVED",
        customerDecision: "APPROVED",
        lineageLabel: "Additional",
        decidedAt: "2026-08-13T13:00:00.000Z",
        actions: {
          canViewQuote: true,
          canApprove: false,
          canDecline: false,
        },
      }),
    ],
  }), { jobId: IDS.job });
  assert.deepEqual(normalized.quotes.map(({ quoteId, businessStatus }) => ({
    quoteId,
    businessStatus,
  })), [
    { quoteId: IDS.quote, businessStatus: "WAITING_ON_CUSTOMER" },
    { quoteId: IDS.additional, businessStatus: "APPROVED" },
  ]);
});

test("Drafts, mismatched identity, duplicates, unknown fields, and private fields fail closed", () => {
  const invalidPayloads = [
    payload({ privateField: "must-not-pass" }),
    payload({ job: { ...payload().job, id: IDS.additional } }),
    payload({ quotes: [quote({ jobId: IDS.additional })] }),
    payload({ quotes: [quote({ status: "DRAFT", issuedAt: null })] }),
    payload({ quotes: [quote({ internalMaterialCostMinor: 1000 })] }),
    payload({ quotes: [quote(), quote()] }),
    payload({ quotes: [quote({
      businessStatus: "APPROVED",
      customerDecision: "APPROVED",
      decidedAt: "2026-08-13T13:00:00.000Z",
    })] }),
  ];
  invalidPayloads.forEach((value) => {
    assert.equal(normalizeCustomerJobQuotes(value, { jobId: IDS.job }), null);
  });
});

test("transport uses normal authenticated GET with exact Job and opaque cursor", async () => {
  const calls = [];
  const normalized = await fetchCustomerJobQuotes({
    jobId: IDS.job,
    limit: 25,
    cursor: "opaque.cursor/value",
    authFetchImpl: async (...args) => {
      calls.push(args);
      return {
        response: { ok: true, status: 200 },
        data: payload({
          pagination: { limit: 25, hasMore: true, nextCursor: "next-opaque" },
        }),
      };
    },
  });
  assert.deepEqual(calls, [[
    `/customer/jobs/${IDS.job}/quotes?limit=25&cursor=${encodeURIComponent("opaque.cursor/value")}`,
    { method: "GET", cache: "no-store" },
    undefined,
  ]]);
  assert.equal(normalized.pagination.nextCursor, "next-opaque");
});

test("invalid input, transport failures, and malformed deployed truth never fall back locally", async () => {
  await assert.rejects(
    fetchCustomerJobQuotes({ jobId: "not-a-job" }),
    (error) => error.code === "INVALID_CUSTOMER_JOB_QUOTES_READ"
  );
  await assert.rejects(
    fetchCustomerJobQuotes({
      jobId: IDS.job,
      authFetchImpl: async () => ({
        response: { ok: false, status: 404 },
        data: {
          success: false,
          code: "CUSTOMER_JOB_QUOTES_UNAVAILABLE",
          message: "Unavailable",
        },
      }),
    }),
    (error) =>
      error.status === 404 && error.code === "CUSTOMER_JOB_QUOTES_UNAVAILABLE"
  );
  await assert.rejects(
    fetchCustomerJobQuotes({
      jobId: IDS.job,
      authFetchImpl: async () => ({
        response: { ok: true, status: 200 },
        data: payload({ quotes: [quote({ grantId: "private" })] }),
      }),
    }),
    (error) => error.code === "INVALID_CUSTOMER_JOB_QUOTES_RESPONSE"
  );
});
