import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  fetchQaWorkflowRecords,
  hydrateQaWorkflowRecords,
  isQaWorkflowHydrationEnabled,
} from "../src/utils/qaWorkflowHydration.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const dashboardSource = fs.readFileSync(
  path.join(testDirectory, "../src/pages/ContractorDashboard.jsx"),
  "utf8"
);

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    writes,
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      writes.push([key, String(value)]);
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("Contractor Dashboard has no QA workflow import or execution path", () => {
  assert.doesNotMatch(dashboardSource, /qaWorkflowHydration/);
  assert.doesNotMatch(dashboardSource, /fetchQaWorkflowRecords/);
  assert.doesNotMatch(dashboardSource, /hydrateQaWorkflowRecords/);
  assert.doesNotMatch(dashboardSource, /\/qa\/workflows/);
});

test("QA workflow capability is enabled only by an explicit development environment", () => {
  assert.equal(isQaWorkflowHydrationEnabled({ DEV: true }), true);
  assert.equal(isQaWorkflowHydrationEnabled({ DEV: false }), false);
  assert.equal(isQaWorkflowHydrationEnabled({ PROD: true }), false);
  assert.equal(isQaWorkflowHydrationEnabled({}), false);
});

test("production fetch bypasses QA endpoints before reading session state", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Production must not request QA workflows");
  };
  globalThis.localStorage = createStorage({
    token: "development-only-token",
    isProfessional: "true",
  });

  try {
    const result = await fetchQaWorkflowRecords({ env: { DEV: false, PROD: true } });
    assert.equal(result, null);
    assert.equal(fetchCalls, 0);
    assert.deepEqual(globalThis.localStorage.writes, []);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});

test("production hydration cannot write QA workflow state", () => {
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = createStorage();

  try {
    const result = hydrateQaWorkflowRecords(
      { customers: [{ customerName: "QA record", activeWorkflow: { service: "Test" } }] },
      { env: { DEV: false, PROD: true } }
    );
    assert.deepEqual(result, { hydrated: false, customers: [] });
    assert.deepEqual(globalThis.localStorage.writes, []);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});

test("development tooling can explicitly fetch normalized QA workflow records", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const calls = [];
  globalThis.localStorage = createStorage({
    token: "development-only-token",
    isProfessional: "true",
  });
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          customers: [{
            customerName: "Development QA",
            activeWorkflow: { service: "Development workflow" },
          }],
        };
      },
    };
  };

  try {
    const result = await fetchQaWorkflowRecords({ env: { DEV: true } });
    assert.equal(result.customers.length, 1);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/qa\/workflows$/);
    assert.equal(calls[0].options.headers.Authorization, "Bearer development-only-token");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});
