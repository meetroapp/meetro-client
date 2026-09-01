import { isNonBlockingAcceptanceState } from "./subscriptionAccess.js";

export function getSubscriptionPurchaseChannel({ nativeIos = false, plan = {}, storeProduct = null }) {
  const providerName = nativeIos ? "Apple" : "Stripe";
  const providerCode = nativeIos ? "APPLE_APP_STORE" : "STRIPE";
  const configured = plan.providers?.[providerCode]?.configured === true;
  const providerReady = nativeIos ? configured && Boolean(storeProduct) : configured;

  return Object.freeze({
    providerName,
    providerCode,
    providerReady,
    eligibilityLabel: "Paid monthly plan",
    unavailableLabel: "Subscription purchasing is currently unavailable.",
    governanceLabel: "Paid subscription status is managed securely after purchase.",
  });
}

export function getSubscriptionPlanAction({
  entitled = false,
  businessAccessActive,
  subscriptionEnforcementMode,
  subscription = null,
  planCode = "",
  providerReady = false,
  nativeIos = false,
  businessTrialActive = false,
}) {
  const accessState = {
    entitled,
    businessAccessActive,
    subscriptionEnforcementMode,
  };
  if (isNonBlockingAcceptanceState(accessState) && !subscription) {
    return Object.freeze({
      kind: "informational",
      label: "View plan options",
      enabled: false,
    });
  }

  const canonicalAccessActive =
    businessAccessActive === true ||
    (businessAccessActive == null && entitled === true);
  if (subscription || (canonicalAccessActive && !businessTrialActive)) {
    return Object.freeze({
      kind: "informational",
      label: subscription?.plan === planCode ? "Current plan" : "Plan comparison",
      enabled: false,
    });
  }

  return Object.freeze({
    kind: "purchase",
    label: nativeIos
      ? "Continue with Apple"
      : "Continue with Stripe",
    enabled: providerReady,
  });
}
