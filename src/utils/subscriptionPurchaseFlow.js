const MIN_APPLE_JWS_LENGTH = 100;

function purchaseFlowError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isCompactJws(value) {
  if (typeof value !== "string" || value.length < MIN_APPLE_JWS_LENGTH) return false;
  const segments = value.split(".");
  return segments.length === 3 && segments.every((segment) => segment.length > 0);
}

export function extractAppleSubscriptionEvidence(record) {
  if (!record || typeof record !== "object") {
    throw purchaseFlowError(
      "STOREKIT_PURCHASE_RESPONSE_INVALID",
      "Apple returned an invalid subscription response."
    );
  }

  if (!isCompactJws(record.signedTransactionInfo)) {
    throw purchaseFlowError(
      "STOREKIT_SIGNED_TRANSACTION_REQUIRED",
      "Apple did not return valid signed transaction evidence."
    );
  }

  if (record.signedRenewalInfo != null && !isCompactJws(record.signedRenewalInfo)) {
    throw purchaseFlowError(
      "STOREKIT_SIGNED_RENEWAL_INVALID",
      "Apple returned invalid signed renewal evidence."
    );
  }

  return Object.freeze({
    signedTransactionInfo: record.signedTransactionInfo,
    ...(record.signedRenewalInfo
      ? { signedRenewalInfo: record.signedRenewalInfo }
      : {}),
  });
}

export async function completeStoreKitPurchase({ purchase, verify, refresh }) {
  const result = await purchase();

  if (result?.state === "cancelled" || result?.state === "pending") {
    return Object.freeze({ state: result.state });
  }
  if (result?.state !== "verified") {
    throw purchaseFlowError(
      "STOREKIT_PURCHASE_RESPONSE_INVALID",
      "Apple returned an invalid subscription response."
    );
  }

  const evidence = extractAppleSubscriptionEvidence(result);
  await verify(evidence);
  const subscriptionState = await refresh();
  return Object.freeze({ state: "verified", subscriptionState });
}

export async function completeStoreKitRestore({ restore, verify, refresh }) {
  const result = await restore();
  if (!result || !Array.isArray(result.transactions)) {
    throw purchaseFlowError(
      "STOREKIT_RESTORE_RESPONSE_INVALID",
      "Apple returned an invalid restore response."
    );
  }

  const evidenceList = result.transactions.map(extractAppleSubscriptionEvidence);
  for (const evidence of evidenceList) {
    await verify(evidence);
  }
  const subscriptionState = await refresh();
  return Object.freeze({
    state: "restored",
    count: result.transactions.length,
    subscriptionState,
  });
}
