export const BUSINESS_AVAILABILITY_STORAGE_KEY = "meetroAvailableNow";
export const BUSINESS_AVAILABILITY_CHANGED_EVENT = "meetroAvailabilityChanged";

function getDefaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function getDefaultEventTarget() {
  try {
    return globalThis.window;
  } catch {
    return undefined;
  }
}

export function readBusinessAvailability(storage = getDefaultStorage()) {
  try {
    return storage?.getItem(BUSINESS_AVAILABILITY_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setBusinessAvailability(
  nextValue,
  {
    storage = getDefaultStorage(),
    eventTarget = getDefaultEventTarget(),
  } = {}
) {
  const normalizedValue = Boolean(nextValue);

  try {
    storage?.setItem(
      BUSINESS_AVAILABILITY_STORAGE_KEY,
      normalizedValue ? "true" : "false"
    );
  } catch {
    // Availability should fail closed without taking down the app.
  }

  try {
    if (typeof Event === "function") {
      eventTarget?.dispatchEvent?.(new Event(BUSINESS_AVAILABILITY_CHANGED_EVENT));
    } else {
      eventTarget?.dispatchEvent?.({ type: BUSINESS_AVAILABILITY_CHANGED_EVENT });
    }
  } catch {
    // Some test/WebView contexts may not support browser Event construction.
  }

  return normalizedValue;
}
