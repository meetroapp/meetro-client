import test from "node:test";
import assert from "node:assert/strict";

import {
  AI_BUTTON_POSITION_STORAGE_KEY,
  clampAiButtonPosition,
  isAiButtonPositionUsable,
  readStoredAiButtonPosition,
  snapAiButtonPosition,
  writeStoredAiButtonPosition,
} from "../src/utils/aiButtonPosition.js";

function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

test("clamps AI button inside visible screen and above BottomNav", () => {
  assert.deepEqual(
    clampAiButtonPosition(
      { x: 999, y: 999 },
      { width: 390, height: 844 },
      { buttonSize: 52, edgeMargin: 12, bottomClearance: 94 }
    ),
    { x: 326, y: 698 }
  );

  assert.deepEqual(
    clampAiButtonPosition(
      { x: -20, y: -30 },
      { width: 390, height: 844 },
      { buttonSize: 52, edgeMargin: 12, bottomClearance: 94 }
    ),
    { x: 12, y: 12 }
  );
});

test("clamps AI button inside mobile safe-area insets on both docked sides", () => {
  assert.deepEqual(
    clampAiButtonPosition(
      { x: -40, y: 220 },
      { width: 390, height: 844, safeAreaLeft: 24, safeAreaRight: 16 },
      { buttonSize: 126, edgeMargin: 12, bottomClearance: 94 }
    ),
    { x: 36, y: 220 }
  );

  assert.deepEqual(
    clampAiButtonPosition(
      { x: 999, y: 220 },
      { width: 390, height: 844, safeAreaLeft: 24, safeAreaRight: 16 },
      { buttonSize: 126, edgeMargin: 12, bottomClearance: 94 }
    ),
    { x: 236, y: 220 }
  );
});

test("snapped AI button respects right safe-area inset", () => {
  assert.deepEqual(
    snapAiButtonPosition(
      { x: 300, y: 300 },
      { width: 390, height: 844, safeAreaRight: 20 },
      { buttonSize: 126, edgeMargin: 12, bottomClearance: 94 }
    ),
    { x: 232, y: 300 }
  );
});

test("Ask Meetro launcher margin is symmetrical at 18px on left and right", () => {
  const options = { buttonSize: 126, edgeMargin: 18, bottomClearance: 94 };

  assert.deepEqual(
    snapAiButtonPosition(
      { x: 20, y: 280 },
      { width: 390, height: 844 },
      options
    ),
    { x: 18, y: 280 }
  );

  assert.deepEqual(
    snapAiButtonPosition(
      { x: 320, y: 280 },
      { width: 390, height: 844 },
      options
    ),
    { x: 246, y: 280 }
  );
});

test("Ask Meetro right dock keeps visual margin outside safe-area inset", () => {
  assert.deepEqual(
    snapAiButtonPosition(
      { x: 320, y: 280 },
      { width: 390, height: 844, safeAreaLeft: 0, safeAreaRight: 20 },
      { buttonSize: 126, edgeMargin: 18, bottomClearance: 94 }
    ),
    { x: 226, y: 280 }
  );
});

test("snaps AI button to the nearest horizontal edge while keeping vertical position", () => {
  assert.deepEqual(
    snapAiButtonPosition(
      { x: 90, y: 250 },
      { width: 390, height: 844 },
      { buttonSize: 52, edgeMargin: 12, bottomClearance: 94 }
    ),
    { x: 12, y: 250 }
  );

  assert.deepEqual(
    snapAiButtonPosition(
      { x: 310, y: 250 },
      { width: 390, height: 844 },
      { buttonSize: 52, edgeMargin: 12, bottomClearance: 94 }
    ),
    { x: 326, y: 250 }
  );
});

test("stored AI button position resets when off-screen", () => {
  const storage = createMemoryStorage({
    [AI_BUTTON_POSITION_STORAGE_KEY]: JSON.stringify({ x: 340, y: 780 }),
  });

  assert.equal(
    readStoredAiButtonPosition({
      storage,
      viewport: { width: 390, height: 844 },
      options: { buttonSize: 52, edgeMargin: 12, bottomClearance: 94 },
    }),
    null
  );
});

test("writes snapped AI button position to local storage", () => {
  const storage = createMemoryStorage();

  const saved = writeStoredAiButtonPosition(
    { x: 280, y: 320 },
    {
      storage,
      viewport: { width: 390, height: 844 },
      options: { buttonSize: 52, edgeMargin: 12, bottomClearance: 94 },
    }
  );

  assert.deepEqual(saved, { x: 326, y: 320 });
  assert.deepEqual(
    JSON.parse(storage.getItem(AI_BUTTON_POSITION_STORAGE_KEY)),
    { x: 326, y: 320 }
  );
  assert.equal(
    isAiButtonPositionUsable(saved, { width: 390, height: 844 }, {
      buttonSize: 52,
      edgeMargin: 12,
      bottomClearance: 94,
    }),
    true
  );
});
