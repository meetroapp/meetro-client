import test from "node:test";
import assert from "node:assert/strict";

import {
  getWorkCenterReadContractReport,
  WORK_CENTER_READ_CONTRACTS,
} from "../src/utils/workCenterSelectors.js";

function createStorage(seed = {}) {
  const data = new Map(
    Object.entries(seed).map(([key, value]) => [key, String(value)])
  );
  let writeCount = 0;

  return {
    get length() {
      return data.size;
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      writeCount += 1;
      data.set(key, String(value));
    },
    removeItem(key) {
      writeCount += 1;
      data.delete(key);
    },
    clear() {
      writeCount += 1;
      data.clear();
    },
    getWriteCount() {
      return writeCount;
    },
  };
}

test("freezes five projection-only ownership contracts", () => {
  assert.equal(WORK_CENTER_READ_CONTRACTS.length, 5);
  assert.deepEqual(
    WORK_CENTER_READ_CONTRACTS.map((contract) => contract.owner),
    ["Scheduling", "Quotes", "Work", "Completion", "Timeline"]
  );
});

test("reports selector counts without writing storage", () => {
  const previousStorage = globalThis.localStorage;
  const storage = createStorage({
    meetro_business_schedule: JSON.stringify([
      { id: "schedule-1", projectId: "project-1", status: "scheduled" },
    ]),
    workCenterQuoteHistory: JSON.stringify([
      { quoteId: "quote-1", projectId: "project-1", status: "sent" },
    ]),
  });
  globalThis.localStorage = storage;

  try {
    const report = getWorkCenterReadContractReport();

    assert.equal(report.contractCount, 5);
    assert.equal(
      report.contracts.find((contract) => contract.domain === "scheduling")
        .recordCount,
      1
    );
    assert.equal(
      report.contracts.find((contract) => contract.domain === "quotes")
        .recordCount,
      1
    );
    assert.equal(storage.getWriteCount(), 0);
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test("keeps every read contract explicitly unadopted", () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = createStorage();

  try {
    const report = getWorkCenterReadContractReport();

    report.contracts.forEach((contract) => {
      assert.equal(contract.authorityStatus, "projection-only");
      assert.equal(contract.adoptionStatus, "not-adopted");
      assert.equal(contract.consumer, "Work Center");
    });
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test("reports identity warnings without resolving by title", () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = createStorage({
    meetro_business_schedule: JSON.stringify([
      { id: "schedule-2", title: "Title only", status: "scheduled" },
    ]),
  });

  try {
    const report = getWorkCenterReadContractReport();
    const scheduling = report.contracts.find(
      (contract) => contract.domain === "scheduling"
    );

    assert.ok(
      scheduling.warningCodes.includes("generic-id-fallback") ||
        scheduling.warningCodes.includes("title-only-project-identity")
    );
  } finally {
    globalThis.localStorage = previousStorage;
  }
});

test("documents shell responsibilities separately from domain ownership", () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = createStorage();

  try {
    const report = getWorkCenterReadContractReport();

    assert.ok(report.shellResponsibilities.includes("selected project"));
    assert.ok(report.prohibitedDomainOwnership.includes("quote lifecycle"));
    assert.ok(
      report.prohibitedDomainOwnership.includes("completion persistence")
    );
  } finally {
    globalThis.localStorage = previousStorage;
  }
});
