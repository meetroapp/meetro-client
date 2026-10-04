import assert from "node:assert/strict";
import test from "node:test";

import {
  completeStoreKitPurchase,
  completeStoreKitRestore,
  extractAppleSubscriptionEvidence,
} from "../src/utils/subscriptionPurchaseFlow.js";
import { getSubscriptionPlanAction } from "../src/utils/subscriptionPlanPresentation.js";
import { getBusinessPlanPresentation } from "../src/utils/subscriptionPresentation.js";

const TRANSACTION_JWS = `${"a".repeat(48)}.${"b".repeat(48)}.${"c".repeat(48)}`;
const RENEWAL_JWS = `${"d".repeat(48)}.${"e".repeat(48)}.${"f".repeat(48)}`;

test("server-derived Business Trial states never fabricate client eligibility", () => {
  const active = getBusinessPlanPresentation({
    applicable: true,
    entitled: true,
    businessTrial: {
      source: "MEETRO_SERVER",
      status: "ACTIVE",
      daysRemaining: 3,
      endsAt: "2026-09-04T12:00:00.000Z",
    },
  });
  assert.equal(active.kind, "trial");
  assert.equal(active.statusLabel, "3 days remaining");

  const expired = getBusinessPlanPresentation({
    applicable: true,
    entitled: false,
    businessTrial: { source: "MEETRO_SERVER", status: "EXPIRED" },
  });
  assert.equal(expired.kind, "required");
  assert.equal(expired.planName, "Business Trial ended");

  const missing = getBusinessPlanPresentation({ applicable: true, entitled: false });
  assert.equal(missing.kind, "required");
  assert.equal(missing.statusLabel, "Choose a paid plan to continue");

  const noEntitlement = getSubscriptionPlanAction({
    entitled: false,
    providerReady: true,
  });
  assert.equal(noEntitlement.kind, "purchase");
  assert.equal(noEntitlement.enabled, true);
});

test("signed purchase and restore evidence accept only the normalized StoreKit bridge contract", () => {
  assert.deepEqual(
    extractAppleSubscriptionEvidence({ signedTransactionInfo: TRANSACTION_JWS }),
    { signedTransactionInfo: TRANSACTION_JWS }
  );
  assert.deepEqual(
    extractAppleSubscriptionEvidence({
      productId: "com.meetro.business.starter.monthly",
      signedTransactionInfo: TRANSACTION_JWS,
      signedRenewalInfo: RENEWAL_JWS,
    }),
    {
      signedTransactionInfo: TRANSACTION_JWS,
      signedRenewalInfo: RENEWAL_JWS,
    }
  );
});

test("verified purchase evidence reaches server verification before subscription refresh", async () => {
  const calls = [];
  const result = await completeStoreKitPurchase({
    purchase: async () => {
      calls.push("purchase");
      return { state: "verified", signedTransactionInfo: TRANSACTION_JWS };
    },
    verify: async (evidence) => {
      calls.push("verify");
      assert.equal(evidence.signedTransactionInfo, TRANSACTION_JWS);
      return { success: true, entitled: true };
    },
    refresh: async () => {
      calls.push("refresh");
      return { entitled: true };
    },
  });

  assert.deepEqual(calls, ["purchase", "verify", "refresh"]);
  assert.equal(result.state, "verified");
  assert.deepEqual(result.subscriptionState, { entitled: true });
});

test("restore forwards each verified current-entitlement JWS before refreshing", async () => {
  const calls = [];
  const result = await completeStoreKitRestore({
    restore: async () => ({
      transactions: [
        { productId: "starter", signedTransactionInfo: TRANSACTION_JWS },
        { productId: "growth", signedTransactionInfo: RENEWAL_JWS },
      ],
    }),
    verify: async (evidence) => calls.push(evidence.signedTransactionInfo),
    refresh: async () => {
      calls.push("refresh");
      return { entitled: true };
    },
  });

  assert.equal(result.count, 2);
  assert.deepEqual(calls, [TRANSACTION_JWS, RENEWAL_JWS, "refresh"]);
});

test("missing JWS and malformed purchase responses fail closed", async () => {
  for (const response of [
    { state: "verified" },
    { state: "verified", signedTransactionInfo: "not-a-jws" },
    { state: "unexpected", signedTransactionInfo: TRANSACTION_JWS },
    null,
  ]) {
    let verified = false;
    let refreshed = false;
    await assert.rejects(
      completeStoreKitPurchase({
        purchase: async () => response,
        verify: async () => { verified = true; },
        refresh: async () => { refreshed = true; },
      }),
      /invalid subscription response|valid signed transaction evidence/
    );
    assert.equal(verified, false);
    assert.equal(refreshed, false);
  }
});

test("provider cancellation and pending state never request server entitlement", async () => {
  for (const state of ["cancelled", "pending"]) {
    let verified = false;
    let refreshed = false;
    const result = await completeStoreKitPurchase({
      purchase: async () => ({ state }),
      verify: async () => { verified = true; },
      refresh: async () => { refreshed = true; },
    });
    assert.equal(result.state, state);
    assert.equal(verified, false);
    assert.equal(refreshed, false);
  }
});

test("provider failure and server verification rejection do not refresh entitlement", async () => {
  let verified = false;
  let refreshed = false;
  await assert.rejects(
    completeStoreKitPurchase({
      purchase: async () => { throw new Error("provider unavailable"); },
      verify: async () => { verified = true; },
      refresh: async () => { refreshed = true; },
    }),
    /provider unavailable/
  );
  assert.equal(verified, false);
  assert.equal(refreshed, false);

  await assert.rejects(
    completeStoreKitPurchase({
      purchase: async () => ({
        state: "verified",
        signedTransactionInfo: TRANSACTION_JWS,
      }),
      verify: async () => { throw new Error("server verification rejected"); },
      refresh: async () => { refreshed = true; },
    }),
    /server verification rejected/
  );
  assert.equal(refreshed, false);
});

test("malformed restore results and restore transactions fail before verification or refresh", async () => {
  for (const restoreResult of [
    null,
    {},
    { transactions: [{}] },
    {
      transactions: [
        { signedTransactionInfo: TRANSACTION_JWS },
        {},
      ],
    },
  ]) {
    let verified = false;
    let refreshed = false;
    await assert.rejects(
      completeStoreKitRestore({
        restore: async () => restoreResult,
        verify: async () => { verified = true; },
        refresh: async () => { refreshed = true; },
      }),
      /invalid restore response|valid signed transaction evidence/
    );
    assert.equal(verified, false);
    assert.equal(refreshed, false);
  }
});
