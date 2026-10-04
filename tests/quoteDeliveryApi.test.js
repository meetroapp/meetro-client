import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createQuoteDeliveryIdempotencyKey,
  fetchProfessionalQuoteDelivery,
  normalizeProfessionalQuoteDelivery,
  normalizeQuoteDeliveryEvidence,
  sendProfessionalQuoteInMeetro,
} from "../src/utils/quoteDeliveryApi.js";

const QUOTE_ID = "decf3f61-acd2-4756-b5fa-8d610eb9b8d0";
const JOB_ID = "7e742dc1-e2a2-49c6-a493-11e351c80d54";
const CUSTOMER_TERMS = Object.freeze({
  schemaVersion: 1,
  paymentTerms: "75% deposit",
  estimatedDuration: "",
  customerNotes: "Labor and standard materials included",
  agreement: Object.freeze({
    exclusions: Object.freeze([]),
    additionalWorkTerms: "",
    hiddenConditionsTerms: "",
    diagnosticTerms: "",
    customerResponsibilities: "",
    warrantyTerms: "",
    cancellationTerms: "",
    acceptanceTerms: "",
    preauthorizedAdditionalWorkLimit: "",
  }),
});

function payload(overrides = {}) {
  return {
    success: true,
    code: "PROFESSIONAL_QUOTE_DELIVERY_LOADED",
    delivery: {
      quoteId: QUOTE_ID,
      jobId: JOB_ID,
      expectedIssuedVersion: 3,
      messageType: "QUOTE_SHARED",
      snapshot: {
        schemaVersion: 1,
        quoteId: QUOTE_ID,
        jobId: JOB_ID,
        lineageLabel: "Original",
        businessStatus: "APPROVED",
        totalMinor: 92000,
        currency: "USD",
        scopeItems: [{ description: "Replace disposal", quantity: 1, amountMinor: 92000 }],
        conditions: ["Valid for 30 days"],
        exclusions: [{ description: "Permit fees", quantity: 1 }],
        issuedAt: "2026-08-14T14:00:00.000Z",
        decidedAt: "2026-08-14T16:00:00.000Z",
        business: { displayName: "Handyman LLC" },
        job: { title: "Kitchen repair", service: "handyman" },
        customerTermsSnapshot: CUSTOMER_TERMS,
      },
      actions: { canSendInMeetro: true },
      conversation: { id: 17 },
      existingDelivery: null,
      ...overrides,
    },
  };
}

function evidence(overrides = {}) {
  return {
    success: true,
    code: "QUOTE_SENT_IN_MEETRO",
    delivery: {
      messageId: 71,
      conversationId: 17,
      quoteId: QUOTE_ID,
      jobId: JOB_ID,
      messageType: "QUOTE_SHARED",
      state: "SENT_IN_MEETRO",
      sentAt: "2026-08-15T12:00:00.000Z",
      replayed: false,
      ...overrides,
    },
  };
}

test("strict professional delivery projection accepts only exact customer-safe truth", () => {
  const delivery = normalizeProfessionalQuoteDelivery(payload(), {
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
  });
  assert.equal(delivery.quoteId, QUOTE_ID);
  assert.equal(delivery.jobId, JOB_ID);
  assert.equal(delivery.expectedIssuedVersion, 3);
  assert.equal(delivery.canSendInMeetro, true);
  assert.equal(delivery.conversationId, 17);
  assert.equal(delivery.existingDelivery, null);
  assert.equal(delivery.snapshot.totalMinor, 92000);
  assert.equal(delivery.snapshot.customerTermsSnapshot.paymentTerms, "75% deposit");
  assert.equal(Object.isFrozen(delivery.snapshot.customerTermsSnapshot.agreement), true);
  assert.equal(JSON.stringify(delivery).includes("materialsSubtotalMinor"), false);

  const leaking = payload();
  leaking.delivery.snapshot.scopeItems[0].materialCostMinor = 41000;
  assert.equal(normalizeProfessionalQuoteDelivery(leaking, {
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
  }), null);
  assert.equal(normalizeProfessionalQuoteDelivery(payload({ quoteId: crypto.randomUUID() }), {
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
  }), null);

  const unsafeTerms = payload();
  unsafeTerms.delivery.snapshot.customerTermsSnapshot = {
    ...CUSTOMER_TERMS,
    internalApproval: "private",
  };
  assert.equal(normalizeProfessionalQuoteDelivery(unsafeTerms, {
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
  }), null);
});

test("delivery read uses exact authenticated route and fails unsafe responses closed", async () => {
  const calls = [];
  const delivery = await fetchProfessionalQuoteDelivery({
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
    authFetchImpl: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return { response: { ok: true, status: 200 }, data: payload() };
    },
  });
  assert.equal(delivery.source, "PROFESSIONAL_QUOTE_DELIVERY");
  assert.deepEqual(calls, [{
    endpoint: `/professional/quotes/${QUOTE_ID}/delivery`,
    options: { method: "GET", cache: "no-store" },
  }]);

  await assert.rejects(() => fetchProfessionalQuoteDelivery({
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
    authFetchImpl: async () => ({
      response: { ok: true, status: 200 },
      data: { ...payload(), internalNotes: "private" },
    }),
  }), { code: "UNSAFE_PROFESSIONAL_QUOTE_DELIVERY_RESPONSE" });
});

test("send command uses exact version and caller-owned retry key without optimistic authority", async () => {
  const delivery = normalizeProfessionalQuoteDelivery(payload(), {
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
  });
  const calls = [];
  const authFetchImpl = async (endpoint, options) => {
    calls.push({ endpoint, options });
    return { response: { ok: true, status: 201 }, data: evidence({ replayed: calls.length > 1 }) };
  };
  const key = createQuoteDeliveryIdempotencyKey(() => "11111111-1111-4111-8111-111111111111");
  const first = await sendProfessionalQuoteInMeetro({ delivery, idempotencyKey: key, authFetchImpl });
  const replay = await sendProfessionalQuoteInMeetro({ delivery, idempotencyKey: key, authFetchImpl });
  assert.equal(first.messageId, replay.messageId);
  assert.equal(replay.replayed, true);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.endpoint, `/professional/quotes/${QUOTE_ID}/send-in-meetro`);
    assert.equal(call.options.headers["Idempotency-Key"], key);
    assert.deepEqual(JSON.parse(call.options.body), {
      expectedIssuedVersion: 3,
      deliveryIntent: "INITIAL",
    });
  }
});

test("already-delivered read evidence completes recovery without another POST", async () => {
  const recoveredEvidence = evidence({ replayed: true }).delivery;
  const delivery = normalizeProfessionalQuoteDelivery(
    payload({ existingDelivery: recoveredEvidence }),
    { quoteId: QUOTE_ID, jobId: JOB_ID }
  );
  let calls = 0;
  const result = await sendProfessionalQuoteInMeetro({
    delivery,
    idempotencyKey: "quote-delivery-new-browser-key",
    authFetchImpl: async () => {
      calls += 1;
      throw new Error("an already-delivered Quote must not POST again");
    },
  });
  assert.equal(result.messageId, 71);
  assert.equal(result.replayed, true);
  assert.equal(calls, 0);
});

test("explicit COPY posts the same exact version, preserves replay identity, and permits a fresh deliberate command", async () => {
  const recoveredEvidence = evidence({ replayed: true }).delivery;
  const delivery = normalizeProfessionalQuoteDelivery(
    payload({ existingDelivery: recoveredEvidence }),
    { quoteId: QUOTE_ID, jobId: JOB_ID }
  );
  const calls = [];
  const authFetchImpl = async (endpoint, options) => {
    calls.push({ endpoint, options });
    const key = options.headers["Idempotency-Key"];
    return {
      response: { ok: true, status: calls.length === 1 ? 201 : 200 },
      data: evidence({
        messageId: key.endsWith("222222222222") ? 72 : 73,
        replayed: calls.length === 2,
      }),
    };
  };
  const firstKey = "quote-delivery-11111111-1111-4111-8111-111111111111";
  const secondKey = "quote-delivery-22222222-2222-4222-8222-222222222222";
  const first = await sendProfessionalQuoteInMeetro({
    delivery,
    deliveryIntent: "COPY",
    idempotencyKey: firstKey,
    authFetchImpl,
  });
  const replay = await sendProfessionalQuoteInMeetro({
    delivery,
    deliveryIntent: "COPY",
    idempotencyKey: firstKey,
    authFetchImpl,
  });
  const second = await sendProfessionalQuoteInMeetro({
    delivery,
    deliveryIntent: "COPY",
    idempotencyKey: secondKey,
    authFetchImpl,
  });
  assert.equal(first.messageId, replay.messageId);
  assert.equal(replay.replayed, true);
  assert.notEqual(second.messageId, first.messageId);
  for (const call of calls) {
    assert.equal(call.endpoint, `/professional/quotes/${QUOTE_ID}/send-in-meetro`);
    assert.deepEqual(JSON.parse(call.options.body), {
      expectedIssuedVersion: 3,
      deliveryIntent: "COPY",
    });
  }
});

test("COPY fails client-side without exact prior delivery and performs no write", async () => {
  const delivery = normalizeProfessionalQuoteDelivery(payload(), {
    quoteId: QUOTE_ID,
    jobId: JOB_ID,
  });
  let calls = 0;
  await assert.rejects(() => sendProfessionalQuoteInMeetro({
    delivery,
    deliveryIntent: "COPY",
    idempotencyKey: "quote-delivery-copy-without-prior",
    authFetchImpl: async () => {
      calls += 1;
    },
  }), { code: "INVALID_QUOTE_DELIVERY" });
  assert.equal(calls, 0);
});

test("delivery evidence requires exact Quote, Job, Conversation and canonical state", () => {
  const expected = { quoteId: QUOTE_ID, jobId: JOB_ID, conversationId: 17 };
  assert.equal(normalizeQuoteDeliveryEvidence(evidence(), expected).messageId, 71);
  assert.equal(normalizeQuoteDeliveryEvidence(evidence({ conversationId: 18 }), expected), null);
  assert.equal(normalizeQuoteDeliveryEvidence(evidence({ state: "DELIVERED" }), expected), null);
});

test("UI retains one retry key after ambiguity, blocks concurrent taps, and hides Draft delivery", () => {
  const source = readFileSync("src/components/QuoteDeliveryActions.jsx", "utf8");
  assert.match(source, /if \(!pendingKeyRef\.current\)[\s\S]*createQuoteDeliveryIdempotencyKey/);
  assert.match(source, /await sendProfessionalQuoteInMeetro[\s\S]*pendingKeyRef\.current = ""/);
  assert.match(source, /if \(sendPendingRef\.current \|\| pending \|\| !delivery\.canSendInMeetro\) return/);
  assert.match(source, /setCopyConfirmation\(confirmation\)/);
  assert.match(source, /handleSend\("COPY"\)/);
  assert.match(source, /quoteDeliveryAlreadyAcceptedMessage/);
  assert.match(source, /sendPendingRef\.current = true[\s\S]*finally[\s\S]*sendPendingRef\.current = false/);
  assert.match(source, /if \(quoteStatus !== "ISSUED"\) return null/);
  assert.doesNotMatch(source, /workflow_quote_sent|localStorage|sessionStorage/);
});
