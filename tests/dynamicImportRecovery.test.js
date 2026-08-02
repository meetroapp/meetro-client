import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DYNAMIC_IMPORT_RELOAD_COOLDOWN_MS,
  DYNAMIC_IMPORT_RELOAD_GUARD_KEY,
  attemptDynamicImportRecovery,
  isDynamicImportFailure,
} from "../src/utils/dynamicImportRecovery.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("recognizes the authenticated Home stale-module failure without matching ordinary fetch errors", () => {
  assert.equal(
    isDynamicImportFailure(
      new TypeError(
        "Failed to fetch dynamically imported module: https://example.test/assets/Home-old.js"
      )
    ),
    true
  );
  assert.equal(isDynamicImportFailure(new Error("Request failed with status 503")), false);
});

test("stale-module recovery reloads once and preserves all existing storage values", () => {
  const storage = createStorage({ token: "authenticated-session" });
  let reloads = 0;

  const recovered = attemptDynamicImportRecovery(
    new TypeError("Failed to fetch dynamically imported module: /assets/Home-old.js"),
    {
      storage,
      now: 1_000,
      reload: () => {
        reloads += 1;
      },
    }
  );

  assert.equal(recovered, true);
  assert.equal(reloads, 1);
  assert.equal(storage.getItem("token"), "authenticated-session");
  assert.equal(storage.getItem(DYNAMIC_IMPORT_RELOAD_GUARD_KEY), "1000");
});

test("a repeated stale-module failure stays in the error boundary instead of reloading in a loop", () => {
  const storage = createStorage({
    [DYNAMIC_IMPORT_RELOAD_GUARD_KEY]: "1000",
  });
  let reloads = 0;

  const recovered = attemptDynamicImportRecovery(
    new Error("ChunkLoadError: Loading chunk Home failed"),
    {
      storage,
      now: 1_000 + DYNAMIC_IMPORT_RELOAD_COOLDOWN_MS - 1,
      reload: () => {
        reloads += 1;
      },
    }
  );

  assert.equal(recovered, false);
  assert.equal(reloads, 0);
});

test("unrelated exceptions and unavailable session storage remain fail-closed", () => {
  const throwingStorage = {
    getItem() {
      throw new Error("storage unavailable");
    },
  };
  let reloads = 0;

  assert.equal(
    attemptDynamicImportRecovery(new Error("render failed"), {
      storage: createStorage(),
      reload: () => {
        reloads += 1;
      },
    }),
    false
  );
  assert.equal(
    attemptDynamicImportRecovery(
      new Error("Failed to fetch dynamically imported module: /assets/Home-old.js"),
      {
        storage: throwingStorage,
        reload: () => {
          reloads += 1;
        },
      }
    ),
    false
  );
  assert.equal(
    attemptDynamicImportRecovery(
      new Error("Failed to fetch dynamically imported module: /assets/Home-old.js"),
      {
        storage: undefined,
        reload: () => {
          reloads += 1;
        },
      }
    ),
    false
  );
  assert.equal(reloads, 0);
});

test("RouteErrorBoundary keeps the existing fallback and invokes only bounded dynamic-import recovery", () => {
  const source = readFileSync(
    new URL("../src/components/RouteErrorBoundary.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /attemptDynamicImportRecovery\(error\)/);
  assert.match(source, /<RouteErrorFallback/);
  assert.doesNotMatch(source, /localStorage\.clear|sessionStorage\.clear/);
});
