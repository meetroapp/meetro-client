import {
  TEAM_EXPERIENCE_MODES,
} from "./teamRoleExperience.js";

export const TEAM_EXPERIENCE_MODE_CHANGED_EVENT =
  "meetroTeamExperienceModeChanged";

function browserStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function supportsPersonalWorkSwitch(experience = {}) {
  return ["FIELD_EMPLOYEE", "BOOKKEEPER_FINANCE"].includes(
    experience?.kind
  );
}

export function teamExperienceModeStorageKey(userId) {
  const id = String(userId || "").trim();
  return id ? `meetroTeamExperienceMode:${id}` : "";
}

export function readTeamExperienceMode(
  userId,
  experience = {},
  storage = browserStorage()
) {
  if (!supportsPersonalWorkSwitch(experience)) {
    return TEAM_EXPERIENCE_MODES.WORK;
  }

  const key = teamExperienceModeStorageKey(userId);

  if (!key || !storage) {
    return TEAM_EXPERIENCE_MODES.WORK;
  }

  try {
    return storage.getItem(key) ===
      TEAM_EXPERIENCE_MODES.PERSONAL
      ? TEAM_EXPERIENCE_MODES.PERSONAL
      : TEAM_EXPERIENCE_MODES.WORK;
  } catch {
    return TEAM_EXPERIENCE_MODES.WORK;
  }
}

export function requestTeamExperienceMode({
  userId,
  mode,
  storage = browserStorage(),
} = {}) {
  const key = teamExperienceModeStorageKey(userId);

  if (!key || !storage) return false;

  const normalizedMode =
    mode === TEAM_EXPERIENCE_MODES.PERSONAL
      ? TEAM_EXPERIENCE_MODES.PERSONAL
      : TEAM_EXPERIENCE_MODES.WORK;

  try {
    storage.setItem(key, normalizedMode);
  } catch {
    return false;
  }

  try {
    globalThis.window?.dispatchEvent(
      new CustomEvent(
        TEAM_EXPERIENCE_MODE_CHANGED_EVENT,
        {
          detail: {
            mode: normalizedMode,
          },
        }
      )
    );
  } catch {
    // Persistence still succeeds if event delivery is unavailable.
  }

  return true;
}
