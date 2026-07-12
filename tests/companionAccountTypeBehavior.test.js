import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  AI_BUTTON_POSITION_STORAGE_KEY,
  getAiButtonAccountBehavior,
  getProfessionalAiButtonPosition,
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

test("business Companion is fixed and ignores the homeowner stored position", () => {
  assert.deepEqual(getAiButtonAccountBehavior("business"), {
    draggable: false,
    persistPosition: false,
  });

  const storage = createMemoryStorage({
    [AI_BUTTON_POSITION_STORAGE_KEY]: JSON.stringify({ x: 20, y: 320 }),
  });
  const fixed = getProfessionalAiButtonPosition(viewport, options);
  assert.deepEqual(fixed, { x: 228, y: 614 });
  assert.deepEqual(
    resolveAiButtonPositionForAccount({
      accountMode: "business",
      storage,
      viewport,
      options,
    }),
    fixed
  );
});

test("account switching uses fixed business placement then restores personal placement", () => {
  const storage = createMemoryStorage({
    [AI_BUTTON_POSITION_STORAGE_KEY]: JSON.stringify({ x: 20, y: 320 }),
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

  assert.deepEqual(businessPosition, { x: 228, y: 614 });
  assert.deepEqual(personalPosition, { x: 20, y: 320 });
});

test("professional fixed placement respects safe areas and BottomNav clearance", () => {
  const fixed = getProfessionalAiButtonPosition(viewport, options);
  assert.equal(viewport.width - fixed.x - options.buttonSize, 36);
  assert.ok(fixed.y <= viewport.height - options.bottomClearance - options.buttonSize);
  assert.ok(fixed.x >= options.edgeMargin + viewport.safeAreaLeft);
});

test("MeetroAssistant disables professional pointer dragging without changing expansion flow", () => {
  const source = readFileSync(
    new URL("../src/components/MeetroAssistant.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /data-position-mode=\{launcherAccountBehavior\.draggable \? "draggable" : "fixed"\}/);
  assert.match(source, /if \(open \|\| !launcherAccountBehavior\.draggable\) return;/);
  assert.match(source, /if \(!launcherAccountBehavior\.draggable\) return;[\s\S]*function handleLauncherPointerUp/);
  assert.match(source, /window\.addEventListener\("accountModeChanged", handleAccountModeChange\)/);
  assert.match(source, /resolveAiButtonPositionForAccount\(\{[\s\S]*accountMode: roleMode/);
  assert.match(source, /ensureExpandedCompanionViewportSafety\(nextCompanionMode\)/);
  assert.match(source, /setCompanionMode\(nextCompanionMode\);[\s\S]*setOpen\(true\);/);
});
