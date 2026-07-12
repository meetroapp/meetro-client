export const AI_BUTTON_POSITION_STORAGE_KEY = "meetroAiButtonPosition";
export const PROFESSIONAL_AI_BUTTON_POSITION_STORAGE_KEY =
  "meetroProfessionalAiButtonPosition";

export const AI_BUTTON_POSITION_STORAGE_KEYS = Object.freeze({
  personal: AI_BUTTON_POSITION_STORAGE_KEY,
  business: PROFESSIONAL_AI_BUTTON_POSITION_STORAGE_KEY,
});

export const AI_BUTTON_POSITION_DEFAULTS = Object.freeze({
  buttonSize: 52,
  edgeMargin: 12,
  bottomClearance: 94,
});

export const AI_BUTTON_ACCOUNT_BEHAVIORS = Object.freeze({
  personal: Object.freeze({ draggable: true, persistPosition: true }),
  business: Object.freeze({ draggable: true, persistPosition: true }),
});

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getAiButtonBounds(viewport = {}, options = {}) {
  const width = Math.max(0, toFiniteNumber(viewport.width));
  const height = Math.max(0, toFiniteNumber(viewport.height));
  const buttonSize = toFiniteNumber(
    options.buttonSize,
    AI_BUTTON_POSITION_DEFAULTS.buttonSize
  );
  const edgeMargin = toFiniteNumber(
    options.edgeMargin,
    AI_BUTTON_POSITION_DEFAULTS.edgeMargin
  );
  const bottomClearance = toFiniteNumber(
    options.bottomClearance,
    AI_BUTTON_POSITION_DEFAULTS.bottomClearance
  );
  const safeAreaLeft = Math.max(
    0,
    toFiniteNumber(options.safeAreaLeft, toFiniteNumber(viewport.safeAreaLeft, 0))
  );
  const safeAreaRight = Math.max(
    0,
    toFiniteNumber(options.safeAreaRight, toFiniteNumber(viewport.safeAreaRight, 0))
  );
  const safeAreaTop = Math.max(
    0,
    toFiniteNumber(options.safeAreaTop, toFiniteNumber(viewport.safeAreaTop, 0))
  );
  const horizontalLeftInset = edgeMargin + safeAreaLeft;
  const horizontalRightInset = edgeMargin + safeAreaRight;
  const topInset = edgeMargin + safeAreaTop;

  return {
    minX: horizontalLeftInset,
    maxX: Math.max(horizontalLeftInset, width - horizontalRightInset - buttonSize),
    minY: topInset,
    maxY: Math.max(edgeMargin, height - bottomClearance - buttonSize),
    buttonSize,
    edgeMargin,
    bottomClearance,
    safeAreaLeft,
    safeAreaRight,
    safeAreaTop,
  };
}

export function clampAiButtonPosition(position = {}, viewport = {}, options = {}) {
  const bounds = getAiButtonBounds(viewport, options);
  const x = toFiniteNumber(position.x, bounds.maxX);
  const y = toFiniteNumber(position.y, bounds.maxY);

  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
  };
}

export function snapAiButtonPosition(position = {}, viewport = {}, options = {}) {
  const bounds = getAiButtonBounds(viewport, options);
  const clamped = clampAiButtonPosition(position, viewport, options);
  const midpoint = (bounds.minX + bounds.maxX) / 2;

  return {
    x: clamped.x <= midpoint ? bounds.minX : bounds.maxX,
    y: clamped.y,
  };
}

export function getAiButtonAccountBehavior(accountMode = "personal") {
  return accountMode === "business"
    ? AI_BUTTON_ACCOUNT_BEHAVIORS.business
    : AI_BUTTON_ACCOUNT_BEHAVIORS.personal;
}

export function getAiButtonPositionStorageKey(accountMode = "personal") {
  return accountMode === "business"
    ? AI_BUTTON_POSITION_STORAGE_KEYS.business
    : AI_BUTTON_POSITION_STORAGE_KEYS.personal;
}

export function resolveAiButtonPositionForAccount({
  accountMode = "personal",
  storage = globalThis.localStorage,
  viewport = {},
  options = {},
} = {}) {
  return readStoredAiButtonPosition({
    storage,
    storageKey: getAiButtonPositionStorageKey(accountMode),
    viewport,
    options,
  });
}

export function isAiButtonPositionUsable(position = {}, viewport = {}, options = {}) {
  if (!position || typeof position !== "object") return false;
  if (!Number.isFinite(Number(position.x)) || !Number.isFinite(Number(position.y))) {
    return false;
  }

  const clamped = clampAiButtonPosition(position, viewport, options);
  return clamped.x === Number(position.x) && clamped.y === Number(position.y);
}

export function readStoredAiButtonPosition({
  storage = globalThis.localStorage,
  storageKey = AI_BUTTON_POSITION_STORAGE_KEY,
  viewport = {},
  options = {},
} = {}) {
  if (!storage) return null;

  try {
    const parsed = JSON.parse(
      storage.getItem(storageKey) || "null"
    );

    if (!isAiButtonPositionUsable(parsed, viewport, options)) return null;
    return clampAiButtonPosition(parsed, viewport, options);
  } catch {
    return null;
  }
}

export function writeStoredAiButtonPosition(position = {}, {
  storage = globalThis.localStorage,
  storageKey = AI_BUTTON_POSITION_STORAGE_KEY,
  viewport = {},
  options = {},
} = {}) {
  if (!storage) return null;

  const snapped = snapAiButtonPosition(position, viewport, options);
  storage.setItem(storageKey, JSON.stringify(snapped));
  return snapped;
}
