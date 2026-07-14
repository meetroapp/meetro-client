import { authFetch } from "./authFetch.js";

export const PERSONAL_PROFILE_ENDPOINT = "/auth/profile";

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function reconcileAuthenticatedUser(user, storage = globalThis.localStorage) {
  if (!isRecord(user) || !user.id || !String(user.username || "").trim()) {
    return { ok: false, user: null };
  }

  const canonicalUser = { ...user, username: String(user.username).trim() };
  storage?.setItem?.("user", JSON.stringify(canonicalUser));
  storage?.setItem?.("userId", String(canonicalUser.id));
  storage?.setItem?.("userName", canonicalUser.username);
  if (canonicalUser.email) {
    storage?.setItem?.("userEmail", String(canonicalUser.email));
  }

  return { ok: true, user: canonicalUser };
}

export async function updatePersonalProfile({
  username,
  authFetchImpl = authFetch,
  storage = globalThis.localStorage,
  setPage,
} = {}) {
  const cleanUsername = String(username || "").trim();
  if (!cleanUsername) {
    return { ok: false, code: "PROFILE_NAME_REQUIRED", user: null };
  }

  try {
    const result = await authFetchImpl(
      PERSONAL_PROFILE_ENDPOINT,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername }),
      },
      setPage
    );
    const user = result?.data?.user;
    if (
      !result?.response?.ok ||
      result?.data?.success !== true ||
      result?.data?.code !== "PROFILE_UPDATED" ||
      !isRecord(user)
    ) {
      return {
        ok: false,
        code: result?.data?.code || "PROFILE_UPDATE_FAILED",
        user: null,
      };
    }

    const reconciled = reconcileAuthenticatedUser(user, storage);
    if (!reconciled.ok) {
      return { ok: false, code: "PROFILE_UPDATE_FAILED", user: null };
    }

    return { ok: true, code: "PROFILE_UPDATED", user: reconciled.user };
  } catch {
    return { ok: false, code: "PROFILE_UPDATE_FAILED", user: null };
  }
}
