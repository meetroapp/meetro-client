import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PreWorkDepositApiError,
  confirmProfessionalPreWorkDepositReceived,
  createPreWorkDepositPaymentKey,
  fetchProfessionalPreWorkDeposit,
  majorAmountToMinor,
  normalizeExternalPaymentMethod,
  normalizePreWorkDeposit,
} from "../src/utils/preWorkDepositApi.js";

const ids = Object.freeze({
  job: "11111111-1111-4111-8111-111111111111",
  quote: "22222222-2222-4222-8222-222222222222",
  decision: "33333333-3333-4333-8333-333333333333",
  obligation: "44444444-4444-4444-8444-444444444444",
  receipt: "55555555-5555-4555-8555-555555555555",
  allocation: "66666666-6666-4666-8666-666666666666",
});

function deposit(overrides = {}) {
  return {
    contractVersion: 1,
    jobId: ids.job,
    quoteId: ids.quote,
    issuedQuoteVersion: 2,
    customerDecisionId: ids.decision,
    obligationId: ids.obligation,
    materialized: true,
    state: "DUE",
    schedulingLocked: true,
    currency: "USD",
    quoteTotalMinor: 68000,
    requiredMinor: 51000,
    appliedMinor: 0,
    remainingMinor: 51000,
    depositRule: {
      type: "PERCENT",
      percentBasisPoints: 7500,
      fixedMinor: null,
    },
    latestVersion: 1,
    paymentHistory: [],
    ...overrides,
  };
}

function paymentHistory(overrides = {}) {
  return {
    receiptId: ids.receipt,
    grossAmountMinor: 20000,
    currency: "USD",
    evidenceSource: "MANUAL_EXTERNAL",
    normalizedMethod: "VENMO",
    displayMethod: null,
    externalReference: null,
    receivedAt: "2026-08-28T15:00:00.000Z",
    allocatedMinor: 20000,
    reversedMinor: 0,
    netAppliedMinor: 20000,
    unappliedMinor: 0,
    ...overrides,
  };
}

test("canonical deposit normalization covers due, partial, satisfied, no-deposit, and reconciliation truth", () => {
  const due = normalizePreWorkDeposit(deposit(), { jobId: ids.job, quoteId: ids.quote });
  assert.equal(due.state, "DUE");
  assert.equal(due.remainingMinor, 51000);

  const reconciliation = normalizePreWorkDeposit(deposit({
    obligationId: null,
    materialized: false,
    latestVersion: null,
  }), { jobId: ids.job, quoteId: ids.quote });
  assert.equal(reconciliation.materialized, false);

  const partial = normalizePreWorkDeposit(deposit({
    state: "PARTIALLY_SATISFIED",
    appliedMinor: 20000,
    remainingMinor: 31000,
    latestVersion: 2,
    paymentHistory: [paymentHistory()],
  }));
  assert.equal(partial.appliedMinor, 20000);
  assert.equal(partial.paymentHistory[0].netAppliedMinor, 20000);

  const satisfied = normalizePreWorkDeposit(deposit({
    state: "SATISFIED",
    schedulingLocked: false,
    appliedMinor: 51000,
    remainingMinor: 0,
    latestVersion: 3,
  }));
  assert.equal(satisfied.schedulingLocked, false);

  const none = normalizePreWorkDeposit(deposit({
    obligationId: null,
    materialized: false,
    state: "NOT_REQUIRED",
    schedulingLocked: false,
    requiredMinor: 0,
    appliedMinor: 0,
    remainingMinor: 0,
    depositRule: null,
    latestVersion: null,
  }));
  assert.equal(none.state, "NOT_REQUIRED");

  const unverified = normalizePreWorkDeposit(deposit({
    obligationId: null,
    materialized: false,
    state: "TERMS_UNVERIFIED",
    requiredMinor: null,
    appliedMinor: 0,
    remainingMinor: null,
    depositRule: null,
    latestVersion: null,
  }));
  assert.equal(unverified.state, "TERMS_UNVERIFIED");
  assert.equal(unverified.schedulingLocked, true);
});

test("malformed balance, scheduling lock, identity, and reversal-adjusted history fail closed", () => {
  assert.equal(normalizePreWorkDeposit(deposit({ remainingMinor: 50000 })), null);
  assert.equal(normalizePreWorkDeposit(deposit({ schedulingLocked: false })), null);
  assert.equal(normalizePreWorkDeposit(deposit({ jobId: ids.quote }), { jobId: ids.job }), null);
  assert.equal(normalizePreWorkDeposit(deposit({
    state: "PARTIALLY_SATISFIED",
    appliedMinor: 19000,
    remainingMinor: 32000,
    paymentHistory: [paymentHistory({ reversedMinor: 1000, netAppliedMinor: 20000 })],
  })), null);
});

test("read uses one authenticated no-store GET and preserves reconciliation status", async () => {
  const calls = [];
  const result = await fetchProfessionalPreWorkDeposit({
    jobId: ids.job,
    quoteId: ids.quote,
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return {
        response: { ok: true, status: 200 },
        data: {
          success: true,
          code: "PRE_WORK_DEPOSIT_RECONCILIATION_REQUIRED",
          deposit: deposit({ obligationId: null, materialized: false, latestVersion: null }),
        },
      };
    },
  });
  assert.equal(result.reconciliationRequired, true);
  assert.deepEqual(calls, [{
    endpoint: `/jobs/${ids.job}/pre-work-deposit`,
    options: { method: "GET", cache: "no-store" },
  }]);
});

test("payment command sends only bounded evidence with an idempotency key and adopts server result", async () => {
  const calls = [];
  const result = await confirmProfessionalPreWorkDepositReceived({
    jobId: ids.job,
    amountMinor: 20000,
    currency: "USD",
    normalizedMethod: "COMMUNITY_CREDIT_UNION_APP",
    displayMethod: "Community credit union app",
    externalReference: "Receipt 41",
    receivedAt: "2026-08-28T15:00:00.000Z",
    expectedVersion: 1,
    idempotencyKey: "pre-work-deposit:payment:fixed-command",
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return {
        response: { ok: true, status: 201 },
        data: {
          success: true,
          code: "PRE_WORK_DEPOSIT_PAYMENT_CONFIRMED",
          payment: {
            receiptId: ids.receipt,
            allocationId: ids.allocation,
            evidenceSource: "MANUAL_EXTERNAL",
            grossAmountMinor: 20000,
            allocatedMinor: 20000,
            unappliedMinor: 0,
            currency: "USD",
            receivedAt: "2026-08-28T15:00:00.000Z",
          },
          deposit: deposit({
            state: "PARTIALLY_SATISFIED",
            appliedMinor: 20000,
            remainingMinor: 31000,
            latestVersion: 2,
            paymentHistory: [paymentHistory({
              normalizedMethod: "COMMUNITY_CREDIT_UNION_APP",
              displayMethod: "Community credit union app",
              externalReference: "Receipt 41",
            })],
          }),
        },
      };
    },
  });
  assert.equal(result.deposit.state, "PARTIALLY_SATISFIED");
  assert.equal(result.deposit.remainingMinor, 31000);
  assert.equal(calls[0].endpoint, `/jobs/${ids.job}/pre-work-deposit/payments`);
  assert.equal(calls[0].options.headers["Idempotency-Key"], "pre-work-deposit:payment:fixed-command");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    amountMinor: 20000,
    currency: "USD",
    normalizedMethod: "COMMUNITY_CREDIT_UNION_APP",
    displayMethod: "Community credit union app",
    externalReference: "Receipt 41",
    receivedAt: "2026-08-28T15:00:00.000Z",
    expectedVersion: 1,
  });
  for (const forbidden of ["depositSatisfied", "state", "appliedTotal", "remainingTotal", "requiredDeposit", "quoteTotal", "schedulingAllowed"]) {
    assert.equal(Object.hasOwn(JSON.parse(calls[0].options.body), forbidden), false);
  }
});

test("overpayment remains visible as server-returned received, applied, and unapplied evidence", async () => {
  const result = await confirmProfessionalPreWorkDepositReceived({
    jobId: ids.job,
    amountMinor: 20000,
    currency: "USD",
    normalizedMethod: "CHECK",
    receivedAt: "2026-08-28T15:00:00.000Z",
    expectedVersion: 2,
    idempotencyKey: "pre-work-deposit:payment:overpayment",
    authFetchImpl: async () => ({
      response: { ok: true, status: 201 },
      data: {
        success: true,
        code: "PRE_WORK_DEPOSIT_PAYMENT_CONFIRMED",
        payment: {
          receiptId: ids.receipt,
          allocationId: ids.allocation,
          evidenceSource: "MANUAL_EXTERNAL",
          grossAmountMinor: 20000,
          allocatedMinor: 10000,
          unappliedMinor: 10000,
          currency: "USD",
          receivedAt: "2026-08-28T15:00:00.000Z",
        },
        deposit: deposit({
          state: "SATISFIED",
          schedulingLocked: false,
          appliedMinor: 51000,
          remainingMinor: 0,
          latestVersion: 3,
        }),
      },
    }),
  });
  assert.equal(result.payment.grossAmountMinor, 20000);
  assert.equal(result.payment.allocatedMinor, 10000);
  assert.equal(result.payment.unappliedMinor, 10000);
});

test("payment input helpers support common and business-defined methods without floating-point writes", () => {
  assert.equal(majorAmountToMinor("510.00"), 51000);
  assert.equal(majorAmountToMinor("0"), null);
  assert.equal(majorAmountToMinor("12.345"), null);
  assert.deepEqual(normalizeExternalPaymentMethod({ method: "VENMO" }), {
    normalizedMethod: "VENMO",
    displayMethod: null,
  });
  assert.deepEqual(normalizeExternalPaymentMethod({ method: "OTHER", customMethod: "Community credit union app" }), {
    normalizedMethod: "COMMUNITY_CREDIT_UNION_APP",
    displayMethod: "Community credit union app",
  });
  assert.equal(normalizeExternalPaymentMethod({ method: "OTHER", customMethod: "   " }), null);
  assert.equal(
    createPreWorkDepositPaymentKey({ randomUUID: () => "77777777-7777-4777-8777-777777777777" }),
    "pre-work-deposit:payment:77777777-7777-4777-8777-777777777777"
  );
});

test("command failure remains explicit and cannot manufacture success", async () => {
  await assert.rejects(
    confirmProfessionalPreWorkDepositReceived({
      jobId: ids.job,
      amountMinor: 20000,
      currency: "USD",
      normalizedMethod: "CASH",
      receivedAt: "2026-08-28T15:00:00.000Z",
      expectedVersion: 1,
      idempotencyKey: "pre-work-deposit:payment:failure",
      authFetchImpl: async () => ({
        response: { ok: false, status: 409 },
        data: { code: "PRE_WORK_DEPOSIT_VERSION_CONFLICT", message: "Deposit changed." },
      }),
    }),
    (error) => error instanceof PreWorkDepositApiError &&
      error.code === "PRE_WORK_DEPOSIT_VERSION_CONFLICT"
  );
});

test("professional deposit UI keeps payment evidence, scheduling, and later finance boundaries explicit", () => {
  const component = readFileSync(
    new URL("../src/components/ProfessionalDepositCard.jsx", import.meta.url),
    "utf8"
  );
  const visits = readFileSync(
    new URL("../src/components/CanonicalJobVisits.jsx", import.meta.url),
    "utf8"
  );
  for (const copy of [
    "Deposit due",
    "Deposit partially received",
    "Deposit received",
    "Deposit record needs confirmation",
    "Confirm Deposit Received",
    "Confirm Payment Received",
    "Payment history",
    "Applied to deposit",
    "Unapplied",
  ]) {
    assert.match(component, new RegExp(copy));
  }
  assert.match(component, /fetchProfessionalPreWorkDeposit/);
  assert.match(component, /read\?\.reconciliationRequired/);
  assert.match(component, /expectedVersion: deposit\.latestVersion/);
  assert.match(component, /formOpen &&/);
  assert.match(component, /Cancel/);
  assert.doesNotMatch(component, /localStorage|sessionStorage|IndexedDB/);
  assert.doesNotMatch(component, /customer_terms_snapshot|paymentTerms/);
  assert.match(visits, /authority\.state === "LOCKED"/);
  assert.match(visits, /Deposit required before scheduling/);
  assert.match(visits, /authority\.actions\.canPropose === true/);
});
