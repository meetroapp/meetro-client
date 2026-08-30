export function getSubscriptionPurchaseChannel({ nativeIos = false, plan = {}, storeProduct = null }) {
  const providerName = nativeIos ? "Apple" : "Stripe";
  const providerCode = nativeIos ? "APPLE_APP_STORE" : "STRIPE";
  const configured = plan.providers?.[providerCode]?.configured === true;
  const providerReady = nativeIos ? configured && Boolean(storeProduct) : configured;
  const trialOffered = nativeIos
    ? storeProduct?.trialEligible === true && Boolean(storeProduct?.introductoryOffer)
    : configured;

  return Object.freeze({
    providerName,
    providerCode,
    providerReady,
    trialOffered,
    eligibilityLabel: trialOffered
      ? "14 days free"
      : `Trial eligibility determined by ${providerName}`,
    unavailableLabel: nativeIos
      ? "Apple product configuration is required."
      : "Stripe TEST checkout is not configured in staging.",
    governanceLabel: `${providerName} governs trial dates and billing status. Access starts only after server verification.`,
  });
}

export function getSubscriptionPlanAction({
  qaAccess = false,
  entitled = false,
  subscription = null,
  planCode = "",
  providerReady = false,
  trialOffered = false,
  nativeIos = false,
}) {
  if (qaAccess && !subscription) {
    return Object.freeze({
      kind: "informational",
      label: "Plan available for subscription testing",
      enabled: false,
    });
  }

  if (subscription || entitled) {
    return Object.freeze({
      kind: "informational",
      label: subscription?.plan === planCode ? "Current plan" : "Plan comparison",
      enabled: false,
    });
  }

  return Object.freeze({
    kind: "purchase",
    label: trialOffered
      ? "Start 14-Day Free Trial"
      : nativeIos
      ? "Continue with Apple"
      : "Start on web",
    enabled: providerReady,
  });
}
