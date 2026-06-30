export const RELATIONSHIP_INSIGHTS_CHANGED_EVENT = "meetroRelationshipInsightsPreferenceChanged";

function safeStorage(storage = globalThis?.localStorage) {
  return storage || {
    getItem: () => null,
    setItem: () => {},
  };
}

export function getRelationshipInsightsPreferenceIdentity(storage = globalThis?.localStorage) {
  const store = safeStorage(storage);
  return (
    store.getItem("userId") ||
    store.getItem("userEmail") ||
    store.getItem("email") ||
    store.getItem("userName") ||
    "local"
  );
}

export function getRelationshipInsightsPreferenceKey({
  storage = globalThis?.localStorage,
  role,
} = {}) {
  const store = safeStorage(storage);
  const identity = String(getRelationshipInsightsPreferenceIdentity(store)).trim().toLowerCase() || "local";
  const mode = String(role || store.getItem("activeAccountMode") || "personal").trim().toLowerCase() || "personal";
  return `meetro.relationshipInsights.enabled:${identity}:${mode}`;
}

export function areRelationshipInsightsEnabled({
  storage = globalThis?.localStorage,
  role,
} = {}) {
  const store = safeStorage(storage);
  const scopedValue = store.getItem(getRelationshipInsightsPreferenceKey({ storage: store, role }));
  if (scopedValue === null || scopedValue === undefined || scopedValue === "") return true;
  return scopedValue !== "false";
}

export function setRelationshipInsightsEnabled(enabled, {
  storage = globalThis?.localStorage,
  role,
  dispatchEvent = true,
} = {}) {
  const store = safeStorage(storage);
  const key = getRelationshipInsightsPreferenceKey({ storage: store, role });
  const nextValue = enabled ? "true" : "false";
  store.setItem(key, nextValue);

  if (dispatchEvent && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(RELATIONSHIP_INSIGHTS_CHANGED_EVENT, {
        detail: { enabled: Boolean(enabled), key },
      })
    );
  }

  return { key, enabled: Boolean(enabled) };
}
