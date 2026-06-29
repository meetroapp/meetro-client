import assert from "node:assert/strict";
import test from "node:test";

import { getStoredHomeownerRequests } from "../src/utils/workflowTimeline.js";

function createStorage(seed = {}) {
  const store = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

function withStorage(storage, callback) {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = storage;

  try {
    return callback();
  } finally {
    globalThis.localStorage = previousStorage;
  }
}

test("homeowner request storage restores older active records from backup without duplicates", () => {
  const storage = createStorage({
    homeownerRequests: JSON.stringify([
      {
        requestId: "request-recent",
        title: "Recent faucet leak",
        status: "open",
      },
    ]),
    meetroHomeownerRequestsBackup: JSON.stringify([
      {
        requestId: "request-recent",
        title: "Recent faucet leak",
        status: "open",
      },
      {
        requestId: "request-old-active",
        title: "Older garage opener install",
        status: "open",
        createdAt: "2025-01-15T12:00:00.000Z",
      },
    ]),
  });

  withStorage(storage, () => {
    const requests = getStoredHomeownerRequests();

    assert.deepEqual(
      requests.map((request) => request.requestId),
      ["request-recent", "request-old-active"]
    );

    const restoredPrimary = JSON.parse(storage.getItem("homeownerRequests"));
    assert.equal(restoredPrimary.length, 2);
  });
});
