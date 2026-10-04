export const STAGING_API_URL = "https://athletic-rebirth-staging.up.railway.app";
export const PRODUCTION_API_URL =
  "https://athletic-rebirth-production-0a28.up.railway.app";

function normalizeApiUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeEnvironmentName(value) {
  return String(value || "").trim().toLowerCase();
}

export function resolveApiUrl(env = import.meta.env || {}) {
  const explicitApiUrl = normalizeApiUrl(env?.VITE_API_URL);
  if (explicitApiUrl) return explicitApiUrl;

  const mode = normalizeEnvironmentName(env?.MODE);
  const appEnvironment = normalizeEnvironmentName(env?.VITE_APP_ENV || mode);

  if (["staging", "qa", "testflight", "ios-qa"].includes(appEnvironment)) {
    return STAGING_API_URL;
  }

  if (appEnvironment === "development" || env?.DEV === true) {
    return STAGING_API_URL;
  }

  if (appEnvironment === "production" || (env?.PROD === true && mode !== "staging")) {
    return PRODUCTION_API_URL;
  }

  return STAGING_API_URL;
}

const API_URL = resolveApiUrl(import.meta.env);

export default API_URL;
