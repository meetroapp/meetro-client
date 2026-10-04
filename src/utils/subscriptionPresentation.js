import {
  hasCanonicalBusinessAccess,
  isNonBlockingAcceptanceState,
} from "./subscriptionAccess.js";

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

function fallbackPlanName(seatLimit) {
  if (seatLimit === 2) return "Starter";
  if (seatLimit === 5) return "Growth";
  if (seatLimit === 10) return "Professional";
  return "Business Plan";
}

function dateLabel(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  return supplied || (hasCanonicalBusinessAccess(state) ? 1 : null);
}

export function getBusinessPlanPresentation(state = {}) {
  const subscription = state?.subscription;
  const businessTrial = state?.businessTrial;
  const complimentaryAccess = state?.complimentaryAccess;

  const complimentaryActive =
    !subscription &&
    state?.complimentaryEntitlementActive === true &&
    complimentaryAccess?.status === "ACTIVE" &&
    complimentaryAccess?.entitled === true;

  if (complimentaryActive) {
    const seatLimit = positiveInteger(complimentaryAccess.seatLimit);
    const isStarter =
      complimentaryAccess.grantType === "TESTFLIGHT_STARTER" &&
      complimentaryAccess.plan === "COMMUNITY_2_USER_MONTHLY" &&
      seatLimit === 2;
    const isFull =
      complimentaryAccess.grantType === "FULL_COMPLIMENTARY" &&
      complimentaryAccess.plan === "COMMUNITY_10_USER_MONTHLY" &&
      seatLimit === 10;

    if (isStarter || isFull) {
      return Object.freeze({
        kind: "complimentary",
        eyebrow: "Business Plan",
        planName: isFull
          ? "Full Complimentary Access"
          : "Complimentary Starter",
        statusLabel: "Active · $0",
        seatLabel: `${seatLimit} professional seats included`,
        billingLabel: isFull
          ? "Permanent complimentary access. No subscription payment is required."
          : "Complimentary tester access. No subscription payment is required while this access is active.",
        manageLabel: "Plan & Subscription",
      });
    }
  }

  if (!subscription && businessTrial?.status === "ACTIVE") {
    const remaining = positiveInteger(businessTrial.daysRemaining);
    const ends = dateLabel(businessTrial.endsAt);
    return Object.freeze({
      kind: "trial",
      eyebrow: "Business Plan",
      planName: "Meetro Business Trial",
      statusLabel: remaining ? `${remaining} ${remaining === 1 ? "day" : "days"} remaining` : "Active",
      seatLabel: "Full professional access during your trial.",
      billingLabel: ends ? `Trial ends ${ends}. Choose a paid plan any time.` : "Choose a paid plan any time.",
      manageLabel: "View Plans",
    });
  }

  if (
    !subscription &&
    hasCanonicalBusinessAccess(state) &&
    isNonBlockingAcceptanceState(state)
  ) {
    return Object.freeze({
      kind: "access",
      eyebrow: "Business Plan",
      planName: "Business access",
      statusLabel: "Active",
      seatLabel: "Professional access is available.",
      billingLabel: "Choose a business plan when you are ready.",
      manageLabel: "View Plans",
    });
  }

  if (!subscription) {
    const trialEnded = businessTrial?.status === "EXPIRED" || businessTrial?.status === "CONVERTED";
    return Object.freeze({
      kind: state?.applicable === true ? "required" : "unavailable",
      eyebrow: "Business Plan",
      planName: state?.applicable === true ? (trialEnded ? "Business Trial ended" : "Plan selection required") : "Plan status unavailable",
      statusLabel: state?.applicable === true ? "Choose a paid plan to continue" : "Try again from Plan & Subscription",
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

  return Object.freeze({
    kind: "subscription",
    eyebrow: "Business Plan",
    planName,
    statusLabel: STATUS_LABELS[subscription.status] || "Plan status unavailable",
    seatLabel:
      usedSeats && seatLimit
        ? `${usedSeats} of ${seatLimit} professional seats used`
        : seatLimit
        ? `Up to ${seatLimit} professional seats`
        : "",
    billingLabel: "",
    manageLabel: "Manage Plan",
  });
}
