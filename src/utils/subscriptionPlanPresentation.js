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
    unavailableLabel: nativeIos
      ? "Apple product configuration is required."
      : "Stripe TEST checkout is not configured in staging.",
    governanceLabel: `${providerName} governs paid billing status after server verification. Meetro governs the initial Business Trial.`,
  });
}

export function getSubscriptionPlanAction({
  qaAccess = false,
  entitled = false,
  subscription = null,
  planCode = "",
  providerReady = false,
  nativeIos = false,
  businessTrialActive = false,
}) {
  if (qaAccess && !subscription) {
    return Object.freeze({
      kind: "informational",
      label: "Plan available for subscription testing",
      enabled: false,
    });
  }

  if (subscription || (entitled && !businessTrialActive)) {
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
