import { authFetch } from "./authFetch.js";

async function subscriptionRequest(path, options = {}, setPage) {
  const { response, data } = await authFetch(path, options, setPage);
  if (!response?.ok || data?.success !== true) {
    const error = new Error(data?.message || "Subscription information is unavailable.");
    error.code = data?.code || "SUBSCRIPTION_REQUEST_FAILED";
    error.status = response?.status || 0;
    throw error;
  }
  return data;
}

export function fetchProfessionalSubscription(setPage) {
  return subscriptionRequest("/subscriptions/me", { method: "GET" }, setPage);
}

export function verifyProfessionalSubscription(evidence, setPage, { restore = false } = {}) {
  return subscriptionRequest(
    restore ? "/subscriptions/apple/restore" : "/subscriptions/apple/verify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signedTransactionInfo: evidence?.signedTransactionInfo,
        ...(evidence?.signedRenewalInfo ? { signedRenewalInfo: evidence.signedRenewalInfo } : {}),
      }),
    },
    setPage
  );
}

export function createStripeSubscriptionCheckout(planCode, setPage) {
  return subscriptionRequest("/subscriptions/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planCode }),
  }, setPage);
}

export function manageProfessionalSubscription(setPage) {
  return subscriptionRequest("/subscriptions/manage", { method: "POST" }, setPage);
}
