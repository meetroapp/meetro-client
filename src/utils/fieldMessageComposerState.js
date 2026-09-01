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

export function createFieldMessageComposerState({ selectedJobId = "", audience = "" } = {}) {
  return Object.freeze({
    selectedJobId: String(selectedJobId || "").trim(),
    audience: normalizeFieldMessageAudience(audience),
    drafts: {},
  });
}

export function reduceFieldMessageComposerState(current, action = {}) {
  const state = current || createFieldMessageComposerState();

  if (action.type === "select_audience") {
    const audience = normalizeFieldMessageAudience(action.audience, "");
    return audience && state.selectedJobId
      ? { ...state, audience }
      : state;
  }

  if (action.type === "select_job") {
    const selectedJobId = String(action.jobId || "").trim();
    return selectedJobId ? { ...state, selectedJobId } : state;
  }

  if (action.type === "reconcile_jobs") {
    const jobIds = Array.isArray(action.jobIds)
      ? action.jobIds.map((jobId) => String(jobId || "").trim()).filter(Boolean)
      : [];
    if (jobIds.includes(state.selectedJobId)) return state;
    return {
      ...state,
      selectedJobId: jobIds[0] || "",
      audience: FIELD_MESSAGE_AUDIENCE.TEAM,
    };
  }

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
