import API_URL from "../api.js";
import { getAccountConnectionStateFromAuthResult } from "./accountConnection.js";
import { clearAccountWorkflowData } from "./accountStorage.js";

export function clearMeetroSession() {
  clearAccountWorkflowData();

  const keysToRemove = [
    "token",
    "user",
    "userId",
    "userName",
    "userEmail",
    "userRole",
    "accountType",
    "isProfessional",
    "hasBusinessProfile",
    "contractorProfileComplete",
    "businessName",
    "businessCategory",
    "accountStatus",
    "accountActive",
    "accountConnected",
    "activeAccountMode",
    "meetroPreferredAccountMode",
    "firstLogin",
    "pendingLoginData",
    "pendingTwoFactorSession",
    "contractorProfile",
    "meetroDispatchReady",
  ];

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export function announceAccountConnectionIssue(detail = {}) {
  window.dispatchEvent(
    new CustomEvent("meetroAccountConnectionIssue", {
      detail,
    })
  );
}

export function handleAuthExpired(setPage) {
  clearMeetroSession();

  window.dispatchEvent(
    new CustomEvent("meetroAuthExpired", {
      detail: {
        title: "Session expired",
        message: "Please log in again to continue.",
        type: "auth",
      },
    })
  );

  window.location.hash = "login";

  if (typeof setPage === "function") {
    setPage("login");
  }
}

export async function authFetch(endpoint, options = {}, setPage) {
  const {
    skipAuthExpirationHandling = false,
    ...requestOptions
  } = options;
  const token = localStorage.getItem("token");

  if (!token) {
    handleAuthExpired(setPage);

    return {
      response: {
        ok: false,
        status: 401,
      },
      data: {
        error: "No token provided",
      },
    };
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...(requestOptions.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  const authError =
    response.status === 401 ||
    data.error === "Invalid token" ||
    data.error === "No token provided" ||
    data.message === "Invalid token" ||
    data.message === "No token provided";

  if (authError) {
    if (!skipAuthExpirationHandling) {
      handleAuthExpired(setPage);
    }
  } else {
    const accountConnectionState =
      getAccountConnectionStateFromAuthResult({ response, data });

    if (!accountConnectionState.connected) {
      announceAccountConnectionIssue(accountConnectionState);
    }
  }

  return { response, data };
}
