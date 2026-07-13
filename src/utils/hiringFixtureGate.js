export const HIRING_QA_BUSINESS_ID = "local-business";
export const HIRING_QA_STORAGE_KEY = "meetroHiringQaMode";

function text(value) {
  return String(value ?? "").trim();
}

export function isHiringQaFixtureEnabled(options = {}) {
  return (
    options.environment === "development" &&
    options.qaMode === true &&
    text(options.businessId) === HIRING_QA_BUSINESS_ID
  );
}

export function getRuntimeHiringQaOptions(storage = globalThis.localStorage, env = import.meta.env) {
  const development = Boolean(env?.DEV);
  let requested = false;

  if (development) {
    try {
      requested = storage?.getItem?.(HIRING_QA_STORAGE_KEY) === "true";
    } catch {
      requested = false;
    }
  }

  return {
    environment: development ? "development" : "production",
    qaMode: development && requested,
  };
}
