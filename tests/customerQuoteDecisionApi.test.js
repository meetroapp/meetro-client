import test from "node:test";
import assert from "node:assert/strict";

import {
  createCustomerQuoteDecisionKey,
  CustomerQuoteDecisionError,
  decideCustomerQuote,
  isCustomerQuoteDecisionConflict,
} from "../src/utils/customerQuoteDecisionApi.js";

const QUOTE_ID = "decf3f61-acd2-4756-b5fa-8d610eb9b8d0";

test("approve and decline use exact commands, issued version, and retry identity", async () => {
  for (const action of ["approve", "decline"]) {
    const calls = [];
    const result = await decideCustomerQuote({
      quoteId: QUOTE_ID,
      action,
      expectedIssuedVersion: 7,
      idempotencyKey: `customer-quote:${action}:test-key`,
      authFetchImpl: async (...args) => {
        calls.push(args);
        return {
          response: { ok: true, status: 200 },
          data: { success: true, code: "QUOTE_CUSTOMER_DECISION_RECORDED" },
        };
      },
    });
    assert.deepEqual(result, {
      quoteId: QUOTE_ID,
      decision: action === "approve" ? "APPROVED" : "DECLINED",
      saved: true,
    });
    assert.deepEqual(calls, [[
      `/quotes/${QUOTE_ID}/${action}`,
      {
        method: "POST",
        cache: "no-store",
        headers: { "Idempotency-Key": `customer-quote:${action}:test-key` },
        body: JSON.stringify({ expectedIssuedVersion: 7 }),
      },
      undefined,
    ]]);
  }
});

test("idempotency keys require governed browser randomness", () => {
  assert.equal(
    createCustomerQuoteDecisionKey("approve", { randomUUID: () => "uuid" }),
    "customer-quote:approve:uuid"
  );
  assert.throws(
    () => createCustomerQuoteDecisionKey("approve", null),
    (error) =>
      error instanceof CustomerQuoteDecisionError &&
      error.code === "CUSTOMER_QUOTE_DECISION_IDEMPOTENCY_UNAVAILABLE"
  );
});

test("stale and terminal conflicts are classified for canonical reload", async () => {
  for (const code of [
    "ISSUED_QUOTE_VERSION_REQUIRED",
    "QUOTE_DECISION_FINAL",
    "STALE_QUOTE_VERSION",
  ]) {
    await assert.rejects(
      decideCustomerQuote({
        quoteId: QUOTE_ID,
        action: "approve",
        expectedIssuedVersion: 7,
        idempotencyKey: `customer-quote:approve:${code}`,
        authFetchImpl: async () => ({
          response: { ok: false, status: 409 },
          data: { success: false, code, message: "Conflict" },
        }),
      }),
      (error) => isCustomerQuoteDecisionConflict(error)
    );
  }
  assert.equal(
    isCustomerQuoteDecisionConflict({ status: 403, code: "CUSTOMER_QUOTE_AUTHORITY_REQUIRED" }),
    false
  );
});

test("invalid commands and unexpected success payloads fail closed", async () => {
  await assert.rejects(
    decideCustomerQuote({
      quoteId: QUOTE_ID,
      action: "revise",
      expectedIssuedVersion: 7,
      idempotencyKey: "customer-quote:revise:test",
    }),
    (error) => error.code === "INVALID_CUSTOMER_QUOTE_DECISION"
  );
  await assert.rejects(
    decideCustomerQuote({
      quoteId: QUOTE_ID,
      action: "decline",
      expectedIssuedVersion: 7,
      idempotencyKey: "customer-quote:decline:test",
      authFetchImpl: async () => ({
        response: { ok: true, status: 200 },
        data: { success: true, code: "UNEXPECTED_CODE" },
      }),
    }),
    (error) => error.code === "UNEXPECTED_CODE"
  );
});
