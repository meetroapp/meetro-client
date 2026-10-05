let hostedProfileReturnPage = "";
let hostedProfileReopenPage = "";

function normalizePage(pageName) {
  const value = String(pageName || "").trim();
  if (!value || value.length > 300) return "";
  if (value === "profile" || value === "connectedServices") return "";
  return value;
}

/**
 * Presentation-only transient return context for the desktop/tablet hosted
 * Profile card. This is deliberately process-memory only:
 * - no localStorage
 * - no sessionStorage
 * - no URL authority
 * - no authentication or account authority
 *
 * A refresh or direct Connected Services entry therefore falls back to the
 * normal full Profile route.
 */
export function stageHostedProfileReturn(pageName) {
  const page = normalizePage(pageName);
  if (!page) {
    clearHostedProfileReturn();
    return false;
  }

  hostedProfileReturnPage = page;
  hostedProfileReopenPage = "";
  return true;
}

export function prepareHostedProfileReturn() {
  const page = normalizePage(hostedProfileReturnPage);
  if (!page) {
    clearHostedProfileReturn();
    return "";
  }

  hostedProfileReopenPage = page;
  return page;
}

export function consumeHostedProfileReopen(pageName) {
  const page = String(pageName || "").trim();
  if (!page || page !== hostedProfileReopenPage) return false;

  clearHostedProfileReturn();
  return true;
}

export function clearHostedProfileReturn() {
  hostedProfileReturnPage = "";
  hostedProfileReopenPage = "";
}
