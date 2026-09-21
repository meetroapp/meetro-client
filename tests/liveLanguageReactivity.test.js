import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getLanguage,
  setLanguage,
  subscribeLanguage,
} from "../src/utils/language.js";

const read = (path) =>
  readFileSync(
    new URL(`../${path}`, import.meta.url),
    "utf8"
  );

const activeLanguageSurfaces = [
  "src/pages/Home.jsx",
  "src/pages/Discover.jsx",
  "src/pages/Profile.jsx",
  "src/pages/ContractorDetails.jsx",
  "src/pages/MessagesInbox.jsx",
  "src/pages/ConversationThread.jsx",
  "src/pages/Upload.jsx",
  "src/pages/ProjectDetails.jsx",
  "src/pages/MyRequests.jsx",
];

test("active homeowner and Communication surfaces use the canonical live language subscription", () => {
  for (const path of activeLanguageSurfaces) {
    const source = read(path);

    assert.match(
      source,
      /useLanguage\(\)/,
      `${path} must subscribe to canonical live language`
    );

    assert.doesNotMatch(
      source,
      /useState\s*\(\s*getLanguage\s*\(\s*\)\s*\)/,
      `${path} must not keep a one-time language mirror`
    );
  }
});

test("Profile language selection writes canonical language without maintaining a second local mirror", () => {
  const source = read("src/pages/Profile.jsx");
  const start = source.indexOf("function handleLanguageSelect");
  const end = source.indexOf(
    "function updateAssistantVoicePreference",
    start
  );
  const block = source.slice(start, end);

  assert.ok(start >= 0);
  assert.ok(end > start);
  assert.match(block, /setLanguage\(nextLanguage\)/);
  assert.doesNotMatch(block, /updateLanguage/);
});

test("language changes never reload the Communication conversation projection", () => {
  const source = read("src/pages/MessagesInbox.jsx");

  assert.doesNotMatch(
    source,
    /\[activeAccountMode,\s*language\]/
  );

  assert.match(
    source,
    /\}, \[activeAccountMode\]\);/
  );
});

test("Profile translation changes do not refetch authenticated profile data", () => {
  const source = read("src/pages/Profile.jsx");

  assert.doesNotMatch(
    source,
    /\[activeMode,\s*language,\s*setPage\]/
  );

  assert.match(
    source,
    /\[activeMode,\s*setPage\]/
  );
});

test("setLanguage synchronously notifies canonical subscribers without a page refresh", () => {
  const previousStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  const storage = new Map();

  globalThis.localStorage = {
    getItem: (key) =>
      storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) =>
      storage.set(key, String(value)),
    removeItem: (key) =>
      storage.delete(key),
  };

  if (previousWindow !== undefined) {
    delete globalThis.window;
  }

  let notifications = 0;

  const unsubscribe = subscribeLanguage(() => {
    notifications += 1;
  });

  try {
    setLanguage("es");
    assert.equal(getLanguage(), "es");
    assert.equal(notifications, 1);

    setLanguage("fr");
    assert.equal(getLanguage(), "fr");
    assert.equal(notifications, 2);
  } finally {
    unsubscribe();

    if (previousStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = previousStorage;
    }

    if (previousWindow !== undefined) {
      globalThis.window = previousWindow;
    }
  }
});
