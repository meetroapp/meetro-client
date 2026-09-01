export const FIELD_MESSAGE_AUDIENCE = Object.freeze({
  TEAM: "team",
  CUSTOMER: "customer",
});

const validAudiences = new Set(Object.values(FIELD_MESSAGE_AUDIENCE));

export function normalizeFieldMessageAudience(value, fallback = FIELD_MESSAGE_AUDIENCE.TEAM) {
  return validAudiences.has(value) ? value : fallback;
}

export function getFieldMessageDraftKey(jobId, audience) {
  const normalizedJobId = String(jobId || "").trim();
  const normalizedAudience = normalizeFieldMessageAudience(audience, "");
  return normalizedJobId && normalizedAudience
    ? `${normalizedJobId}:${normalizedAudience}`
    : "";
}

export function resolveFieldMessageRoute(hash = "", eligibleJobIds = []) {
  const normalizedJobIds = Array.isArray(eligibleJobIds)
    ? eligibleJobIds.map((jobId) => String(jobId || "").trim()).filter(Boolean)
    : [];
  let requestedJobId = "";
  let requestedAudience = "";

  try {
    const query = String(hash || "").split("?")[1] || "";
    const params = new URLSearchParams(query);
    requestedJobId = String(params.get("jobId") || "").trim();
    requestedAudience = normalizeFieldMessageAudience(params.get("audience"), "");
  } catch {
    // Invalid route input falls through to the private Team default.
  }

  const requestedJobIsEligible = normalizedJobIds.includes(requestedJobId);
  const selectedJobId = requestedJobIsEligible
    ? requestedJobId
    : normalizedJobIds[0] || "";
  const hasExplicitDestination = Boolean(
    requestedJobIsEligible && requestedAudience
  );

  return Object.freeze({
    requestedJobId,
    requestedAudience,
    selectedJobId,
    audience: hasExplicitDestination
      ? requestedAudience
      : FIELD_MESSAGE_AUDIENCE.TEAM,
    hasExplicitDestination,
  });
}

export function isExplicitFieldMessageAudienceActivation({
  targetAudience,
  pointerAudience = "",
  clickDetail = 0,
} = {}) {
  const target = normalizeFieldMessageAudience(targetAudience, "");
  if (!target) return false;
  if (Number(clickDetail) === 0) return true;
  return normalizeFieldMessageAudience(pointerAudience, "") === target;
}

export function createFieldMessageComposerState() {
  return Object.freeze({
    drafts: {},
  });
}

export function reduceFieldMessageComposerState(current, action = {}) {
  const state = current || createFieldMessageComposerState();

  if (action.type === "update_draft") {
    const key = getFieldMessageDraftKey(action.jobId, action.audience);
    if (!key) return state;
    return {
      ...state,
      drafts: {
        ...state.drafts,
        [key]: String(action.value ?? ""),
      },
    };
  }

  return state;
}

export function getFieldMessageSendAuthority(audience) {
  return normalizeFieldMessageAudience(audience, "") === FIELD_MESSAGE_AUDIENCE.CUSTOMER
    ? FIELD_MESSAGE_AUDIENCE.CUSTOMER
    : FIELD_MESSAGE_AUDIENCE.TEAM;
}
