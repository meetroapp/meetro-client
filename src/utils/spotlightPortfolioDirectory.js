import {
  DISCOVER_DIRECTORY_STATUS,
  fetchDiscoverDirectory,
} from "./discoverDirectoryState.js";

function withPublicPortfolio(profile = {}, projects = []) {
  return Object.freeze({
    ...profile,
    businessPortfolio: Object.freeze([...projects]),
  });
}

async function fetchPublicPortfolio({ apiUrl, contractorId, fetchImpl, signal }) {
  const response = await fetchImpl(
    `${String(apiUrl || "").replace(/\/+$/, "")}/contractor-projects/${encodeURIComponent(
      contractorId
    )}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    }
  );

  if (!response.ok) return [];

  const payload = await response.json();
  return Array.isArray(payload?.projects)
    ? payload.projects.filter(
        (project) => project && typeof project === "object" && !Array.isArray(project)
      )
    : [];
}

export async function fetchCanonicalSpotlightBusinesses({
  apiUrl,
  fetchImpl = fetch,
  signal,
  logger = console,
} = {}) {
  const directory = await fetchDiscoverDirectory({
    apiUrl,
    fetchImpl,
    signal,
    logger,
  });

  if (!directory || directory.status !== DISCOVER_DIRECTORY_STATUS.RESULTS) {
    return directory;
  }

  try {
    const records = await Promise.all(
      directory.records.map(async (profile) => {
        const projects = await fetchPublicPortfolio({
          apiUrl,
          contractorId: profile.id,
          fetchImpl,
          signal,
        });

        return withPublicPortfolio(profile, projects);
      })
    );

    return Object.freeze({
      status: directory.status,
      records: Object.freeze(records),
      errorCode: directory.errorCode,
    });
  } catch (error) {
    if (error?.name === "AbortError") return null;

    logger?.error?.("Spotlight public Portfolio request failed", {
      errorCode: "PUBLIC_PORTFOLIO_REQUEST_FAILED",
    });

    return Object.freeze({
      status: DISCOVER_DIRECTORY_STATUS.FAILED,
      records: Object.freeze([]),
      errorCode: "PUBLIC_PORTFOLIO_REQUEST_FAILED",
    });
  }
}
