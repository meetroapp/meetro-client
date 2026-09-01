export const SUBSCRIPTION_ENFORCEMENT_MODES = Object.freeze({
  NON_BLOCKING_ACCEPTANCE: "NON_BLOCKING_ACCEPTANCE",
  ENFORCED: "ENFORCED",
});

export function hasCanonicalBusinessAccess(state = {}) {
  if (state?.businessAccessActive === true) return true;
  if (state?.businessAccessActive === false) return false;
  return state?.entitled === true;
}

export function isNonBlockingAcceptanceState(state = {}) {
  return state?.subscriptionEnforcementMode ===
    SUBSCRIPTION_ENFORCEMENT_MODES.NON_BLOCKING_ACCEPTANCE;
}

export function shouldBlockProfessionalAccess(gate = {}) {
  return gate.status !== "idle" && gate.businessAccessActive !== true;
}
