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
