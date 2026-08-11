export function normalizeRequestLifecycleFoundation(payload = {}) {
  const lifecycle = payload?.lifecycle;
  if (!lifecycle || typeof lifecycle !== "object" || Array.isArray(lifecycle)) {
    return null;
  }

  const contractVersion = Number(lifecycle.contractVersion || 1);
  const reportedConcerns = Array.isArray(lifecycle.reportedConcerns)
    ? lifecycle.reportedConcerns
        .filter((concern) => concern && typeof concern === "object" && concern.id)
        .map((concern) => ({
          id: String(concern.id),
          originalText: String(concern.originalText || "").trim(),
          reportedAt: concern.reportedAt || "",
          sequence: Number(concern.sequence || 0),
          clarifications: Array.isArray(concern.clarifications)
            ? concern.clarifications
                .filter((item) => item && typeof item === "object" && item.id)
                .map((item) => ({
                  id: String(item.id),
                  semantics: String(item.semantics || "").trim(),
                  text: String(item.text || "").trim(),
                  createdAt: item.createdAt || "",
                }))
            : [],
        }))
        .filter((concern) => concern.originalText)
    : [];

  const participants = Array.isArray(lifecycle.participants)
    ? lifecycle.participants
        .filter((participant) => participant && typeof participant === "object" && participant.id)
        .map((participant) => ({
          id: String(participant.id),
          displayName: String(participant.displayName || "").trim(),
          roles: Array.isArray(participant.roles)
            ? participant.roles
                .filter((assignment) => assignment?.active === true && assignment.role)
                .map((assignment) => String(assignment.role))
            : [],
        }))
    : [];

  return {
    requestId: lifecycle.requestId,
    contractVersion,
    legacy: lifecycle.legacy === true || contractVersion !== 2,
    job: lifecycle.job && typeof lifecycle.job === "object"
      ? {
          id: String(lifecycle.job.id || ""),
          requestRelationshipId: lifecycle.job.requestRelationshipId,
        }
      : null,
    reportedConcerns,
    participants,
  };
}

export function getParticipantRoleLabelKey(role) {
  const keys = {
    CUSTOMER_REPRESENTATIVE: "lifecycleRoleCustomerRepresentative",
    SITE_OCCUPANT: "lifecycleRoleSiteOccupant",
    PRIMARY_PROFESSIONAL: "lifecycleRolePrimaryProfessional",
    SPECIALIST: "lifecycleRoleSpecialist",
  };
  return keys[String(role || "").trim().toUpperCase()] || "";
}
