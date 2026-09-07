export function getWorkCenterAccordionStateKey(jobIdentity, sectionId) {
  const jobKey = String(jobIdentity || "").trim();
  const sectionKey = String(sectionId || "").trim();
  return jobKey && sectionKey ? `${jobKey}:${sectionKey}` : "";
}

export function getPersistedWorkCenterAccordionOpen(state, key) {
  if (!key || !Object.prototype.hasOwnProperty.call(state || {}, key)) {
    return undefined;
  }
  return Boolean(state[key]);
}

export function persistWorkCenterAccordionOpen(state, key, open) {
  if (!key || state?.[key] === Boolean(open)) return state || {};
  return {
    ...(state || {}),
    [key]: Boolean(open),
  };
}
