const INACTIVE_STATUS_TOKENS = new Set([
  "inactive",
  "disabled",
  "deactivated",
  "suspended",
  "closed",
]);

const DISCONNECTED_STATUS_TOKENS = new Set([
  "disconnected",
  "unlinked",
  "revoked",
  "not_connected",
]);

const SESSION_ERROR_TOKENS = new Set([
  "invalid_token",
  "missing_token",
  "no_token_provided",
  "token_expired",
  "session_expired",
  "login_expired",
  "unauthorized",
]);

function getDefaultStorage() {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

function normalizeToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readJson(value, fallback = {}) {
  try {
    const parsed = JSON.parse(value || "null");
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function storageGet(storage, key) {
  try {
    return storage?.getItem?.(key) ?? "";
  } catch {
    return "";
  }
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value) !== "");
}

function firstBooleanLike(...values) {
  const value = firstPresent(...values);
  if (value === undefined || value === null || String(value) === "") return undefined;
  if (typeof value === "boolean") return value;

  const normalized = normalizeToken(value);
  if (["true", "yes", "active", "connected", "1"].includes(normalized)) return true;
  if (["false", "no", "inactive", "disabled", "disconnected", "0"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function state(reason, overrides = {}) {
  const defaults = {
    missing_token: {
      title: "Sign in to continue",
      message: "Messages needs a current Meetro login before it can load conversations.",
      requiresLogin: true,
    },
    session_stale: {
      title: "Session expired",
      message: "Your Meetro session needs to be refreshed. Log in again to continue.",
      requiresLogin: true,
    },
    account_inactive: {
      title: "Account inactive",
      message: "Messages needs an active Meetro account before it can load conversations.",
      requiresLogin: false,
    },
    account_disconnected: {
      title: "Account disconnected",
      message: "Reconnect your Meetro account before opening or sending messages.",
      requiresLogin: true,
    },
    account_access_blocked: {
      title: "Account connection needs attention",
      message: "Meetro could not confirm account access for Messages. Reconnect before continuing.",
      requiresLogin: true,
    },
    messages_unavailable: {
      title: "Messages unavailable",
      message: "Meetro could not verify your account connection. Try again after reconnecting.",
      requiresLogin: false,
    },
    connected: {
      title: "Account connected",
      message: "",
      requiresLogin: false,
    },
  };

  return {
    connected: reason === "connected",
    reason,
    ...(defaults[reason] || defaults.messages_unavailable),
    ...overrides,
  };
}

export function getAccountConnectionStateFromUser(user = {}, options = {}) {
  const storage = options.storage || getDefaultStorage();
  const token = firstPresent(options.token, storageGet(storage, "token"));

  if (options.requireToken !== false && !token) {
    return state("missing_token");
  }

  const statusToken = normalizeToken(
    firstPresent(
      user.accountStatus,
      user.account_status,
      user.accountState,
      user.account_state,
      user.status,
      user.userStatus,
      user.user_status,
      storageGet(storage, "accountStatus"),
      storageGet(storage, "meetroAccountStatus")
    )
  );

  const activeFlag = firstBooleanLike(
    user.active,
    user.isActive,
    user.is_active,
    user.accountActive,
    user.account_active,
    storageGet(storage, "accountActive"),
    storageGet(storage, "meetroAccountActive")
  );
  const connectedFlag = firstBooleanLike(
    user.connected,
    user.isConnected,
    user.is_connected,
    user.accountConnected,
    user.account_connected,
    storageGet(storage, "accountConnected"),
    storageGet(storage, "meetroAccountConnected")
  );

  if (INACTIVE_STATUS_TOKENS.has(statusToken) || activeFlag === false) {
    return state("account_inactive", {
      status: statusToken || "inactive",
    });
  }

  if (DISCONNECTED_STATUS_TOKENS.has(statusToken) || connectedFlag === false) {
    return state("account_disconnected", {
      status: statusToken || "disconnected",
    });
  }

  return state("connected");
}

export function getStoredAccountConnectionState(storage = getDefaultStorage()) {
  const user = readJson(storageGet(storage, "user"), {});

  return getAccountConnectionStateFromUser(user, {
    storage,
    token: storageGet(storage, "token"),
  });
}

function responseText(data = {}) {
  return [
    data.code,
    data.error,
    data.message,
    data.reason,
    data.status,
  ]
    .filter(Boolean)
    .map(normalizeToken)
    .join(" ");
}

export function getAccountConnectionStateFromAuthResult(result = {}) {
  const status = Number(result?.response?.status || 0);
  const data = result?.data || {};
  const text = responseText(data);

  if (status === 401 || [...SESSION_ERROR_TOKENS].some((token) => text.includes(token))) {
    return state("session_stale");
  }

  if (
    text.includes("inactive") ||
    text.includes("disabled") ||
    text.includes("deactivated") ||
    text.includes("suspended")
  ) {
    return state("account_inactive", {
      status: text,
    });
  }

  if (
    text.includes("disconnected") ||
    text.includes("unlinked") ||
    text.includes("revoked") ||
    text.includes("not_connected")
  ) {
    return state("account_disconnected", {
      status: text,
    });
  }

  if (status === 403) {
    return state("account_access_blocked", {
      status: text || "forbidden",
    });
  }

  if (status >= 500) {
    return state("messages_unavailable", {
      status: text || "server_error",
      requiresLogin: false,
    });
  }

  return state("connected");
}

export function getAccountConnectionStateFromLoginData(data = {}, fallbackEmail = "") {
  const user = data.user || {};

  return getAccountConnectionStateFromUser(
    {
      ...user,
      email: user.email || fallbackEmail,
    },
    {
      token: data.token || "",
      requireToken: true,
    }
  );
}
