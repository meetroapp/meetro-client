import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  AI_BUTTON_POSITION_STORAGE_KEY,
  PROFESSIONAL_AI_BUTTON_POSITION_STORAGE_KEY,
  getAiButtonAccountBehavior,
  getAiButtonPositionStorageKey,
  resolveAiButtonPositionForAccount,
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

const viewport = {
  width: 390,
  height: 844,
  safeAreaLeft: 0,
  safeAreaRight: 16,
  safeAreaTop: 8,
};
const options = {
  buttonSize: 126,
  edgeMargin: 20,
  bottomClearance: 104,
};

test("personal Companion remains draggable and position persistence remains enabled", () => {
  assert.deepEqual(getAiButtonAccountBehavior("personal"), {
    draggable: true,
    persistPosition: true,
  });

  const storage = createMemoryStorage();
  const saved = writeStoredAiButtonPosition(
    { x: 24, y: 320 },
    { storage, viewport, options }
  );
  assert.deepEqual(saved, { x: 20, y: 320 });
  assert.deepEqual(
    JSON.parse(storage.getItem(AI_BUTTON_POSITION_STORAGE_KEY)),
    saved
  );
  assert.deepEqual(
    resolveAiButtonPositionForAccount({
      accountMode: "personal",
      storage,
      viewport,
      options,
    }),
    saved
  );
});

test("business Companion remains draggable and persists to its own storage key", () => {
  assert.deepEqual(getAiButtonAccountBehavior("business"), {
    draggable: true,
    persistPosition: true,
  });

  const storage = createMemoryStorage({
    [AI_BUTTON_POSITION_STORAGE_KEY]: JSON.stringify({ x: 20, y: 320 }),
  });
  const saved = writeStoredAiButtonPosition(
    { x: 300, y: 410 },
    {
      storage,
      storageKey: getAiButtonPositionStorageKey("business"),
      viewport,
      options,
    }
  );
  assert.deepEqual(saved, { x: 228, y: 410 });
  assert.deepEqual(
    JSON.parse(storage.getItem(PROFESSIONAL_AI_BUTTON_POSITION_STORAGE_KEY)),
    saved
  );
  assert.deepEqual(
    JSON.parse(storage.getItem(AI_BUTTON_POSITION_STORAGE_KEY)),
    { x: 20, y: 320 }
  );
  assert.deepEqual(
    resolveAiButtonPositionForAccount({
      accountMode: "business",
      storage,
      viewport,
      options,
    }),
    saved
  );
});

test("account switching restores separate personal and professional positions", () => {
  const storage = createMemoryStorage({
    [AI_BUTTON_POSITION_STORAGE_KEY]: JSON.stringify({ x: 20, y: 320 }),
    [PROFESSIONAL_AI_BUTTON_POSITION_STORAGE_KEY]: JSON.stringify({
      x: 228,
      y: 410,
    }),
  });
  const businessPosition = resolveAiButtonPositionForAccount({
    accountMode: "business",
    storage,
    viewport,
    options,
  });
  const personalPosition = resolveAiButtonPositionForAccount({
    accountMode: "personal",
    storage,
    viewport,
    options,
  });

  assert.deepEqual(businessPosition, { x: 228, y: 410 });
  assert.deepEqual(personalPosition, { x: 20, y: 320 });
});

test("both account positions remain safe-area constrained", () => {
  for (const accountMode of ["personal", "business"]) {
    const storage = createMemoryStorage();
    const saved = writeStoredAiButtonPosition(
      { x: 999, y: 999 },
      {
        storage,
        storageKey: getAiButtonPositionStorageKey(accountMode),
        viewport,
        options,
      }
    );
    assert.deepEqual(saved, { x: 228, y: 614 });
    assert.equal(viewport.width - saved.x - options.buttonSize, 36);
    assert.ok(saved.y <= viewport.height - options.bottomClearance - options.buttonSize);
  }
});

test("MeetroAssistant keeps pointer dragging enabled in both modes without changing expansion flow", () => {
  const source = readFileSync(
    new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /data-position-mode="draggable"/);
  assert.match(source, /function handleLauncherPointerDown\(event\) \{\n\s+if \(open\) return;/);
  assert.doesNotMatch(source, /!launcherAccountBehavior\.draggable/);
  assert.doesNotMatch(source, /getProfessionalAiButtonPosition/);
  assert.match(source, /window\.addEventListener\("accountModeChanged", handleAccountModeChange\)/);
  assert.match(source, /window\.visualViewport\?\.addEventListener\("resize", handleViewportChange\)/);
  assert.match(source, /window\.visualViewport\?\.addEventListener\("scroll", handleViewportChange\)/);
  assert.match(source, /window\.visualViewport\?\.removeEventListener\("resize", handleViewportChange\)/);
  assert.match(source, /window\.visualViewport\?\.removeEventListener\("scroll", handleViewportChange\)/);
  assert.match(source, /resolveAiButtonPositionForAccount\(\{[\s\S]*accountMode: roleMode/);
  assert.match(source, /storageKey: getAiButtonPositionStorageKey\(roleMode\)/);
  assert.match(source, /ensureExpandedCompanionViewportSafety\(nextCompanionMode\)/);
  assert.match(source, /setCompanionMode\(nextCompanionMode\);[\s\S]*setOpen\(true\);/);
});
