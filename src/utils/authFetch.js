import API_URL from "../api";

export function clearMeetroSession() {
  const keysToRemove = [
    "token",
    "user",
    "userId",
    "userName",
    "userEmail",
    "userRole",
    "accountType",
    "activeAccountMode",
    "isProfessional",
    "hasBusinessProfile",
    "contractorProfileComplete",
    "pendingLoginData",
  ];

  keysToRemove.forEach((key) => localStorage.removeItem(key));
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
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  let data = {};

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
    handleAuthExpired(setPage);
  }

  return { response, data };
}
