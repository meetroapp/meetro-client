const STATUS_LABELS = Object.freeze({
  TRIAL: "Trial",
  ACTIVE: "Active",
  GRACE: "Payment issue",
  CANCELED_AT_PERIOD_END: "Active until period end",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
});

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function money(amountMinor, currency = "USD") {
  const amount = Number(amountMinor);
  if (!Number.isSafeInteger(amount) || amount < 0) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || "USD").toUpperCase(),
  }).format(amount / 100);
}

function fallbackPlanName(seatLimit) {
  if (seatLimit === 2) return "Starter";
  if (seatLimit === 5) return "Growth";
  if (seatLimit === 10) return "Professional";
  return "Business Plan";
}

function resolveUsedSeats(state = {}, subscription = {}) {
  const supplied = [
    state.activeProfessionalSeats,
    state.usedProfessionalSeats,
    subscription.activeProfessionalSeats,
    subscription.usedProfessionalSeats,
  ].map(positiveInteger).find(Boolean);

  // Until Employee/Team authority exists, the authenticated business owner is
  // the single professional seat represented by this subscription account.
  return supplied || (state.entitled === true ? 1 : null);
}

export function getBusinessPlanPresentation(state = {}) {
  const subscription = state?.subscription;
  if (state?.qaAccess && !subscription) {
    return Object.freeze({
      kind: "qa",
      eyebrow: "Business Plan",
      planName: "Staging QA Access",
      statusLabel: "Testing access",
      seatLabel: "This staging-only access cannot activate in production.",
      billingLabel: "No Apple or Stripe subscription is active.",
      manageLabel: "Plan details",
    });
  }

  if (!subscription) {
    return Object.freeze({
      kind: state?.applicable === true ? "required" : "unavailable",
      eyebrow: "Business Plan",
      planName: state?.applicable === true ? "Plan selection required" : "Plan status unavailable",
      statusLabel: state?.applicable === true ? "Professional access locked" : "Try again from Plan & Subscription",
      seatLabel: "",
      billingLabel: "",
      manageLabel: state?.applicable === true ? "Choose Plan" : "Plan & Subscription",
    });
  }

  const catalogPlan = (state.catalog || []).find(
    (plan) => plan.code === subscription.plan
  );
  const seatLimit =
    positiveInteger(subscription.seatLimit) ||
    positiveInteger(catalogPlan?.seatLimit);
  const usedSeats = resolveUsedSeats(state, subscription);
  const planName = catalogPlan?.name || fallbackPlanName(seatLimit);
  const trial = subscription.status === "TRIAL";
  const price = money(catalogPlan?.amountMinor, catalogPlan?.currency);

  return Object.freeze({
    kind: "subscription",
    eyebrow: "Business Plan",
    planName: trial ? `${planName} — Trial` : planName,
    statusLabel: STATUS_LABELS[subscription.status] || "Plan status unavailable",
    seatLabel:
      usedSeats && seatLimit
        ? `${usedSeats} of ${seatLimit} professional seats used`
        : seatLimit
        ? `Up to ${seatLimit} professional seats`
        : "",
    billingLabel: trial && price ? `Then ${price}/month` : "",
    manageLabel: "Manage Plan",
  });
}
