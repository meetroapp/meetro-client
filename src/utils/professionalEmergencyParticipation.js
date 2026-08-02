const NON_ACTIONABLE_PARTICIPATION_STATES = new Set([
  "pending",
  "active",
  "declined",
  "withdrawn",
  "closed",
  "unknown",
]);

export function resolveProfessionalEmergencyResponsePresentation({
  participation = null,
  localState = {},
} = {}) {
  const localPhase = localState?.phase || "";
  const localPending = localPhase === "loading";
  const localConfirmed = localPhase === "ready";
  const hydratedState = participation?.state || "";
  const hydratedConfirmed = NON_ACTIONABLE_PARTICIPATION_STATES.has(
    hydratedState
  );
  const confirmed = localConfirmed || hydratedConfirmed;
  const pendingParticipation =
    hydratedState === "pending" ||
    (localConfirmed && localState.participationState === "pending");

  let labelKey = "emergencyRespond";
  if (localPending) {
    labelKey = "emergencyResponding";
  } else if (localConfirmed) {
    labelKey = localState.created
      ? "emergencyResponseSent"
      : "emergencyResponseAlreadySent";
  } else if (hydratedState === "pending") {
    labelKey = "emergencyResponseSent";
  } else if (hydratedConfirmed) {
    labelKey = "emergencyResponseAlreadySent";
  }

  return {
    actionDisabled: localPending || confirmed,
    confirmed,
    labelKey,
    pendingParticipation,
  };
}
