import assert from "node:assert/strict";
import test from "node:test";

import {
  CustomerEfrError,
  fetchCustomerEfr,
  validateCustomerEfrProjection,
} from "../src/utils/customerEfrApi.js";

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const FINDING_ID = "22222222-2222-4222-8222-222222222222";
const RECOMMENDATION_ID = "33333333-3333-4333-8333-333333333333";

function projection(overrides = {}) {
  return {
    jobId: JOB_ID,
    requestId: 14,
    relationshipId: 340,
    evaluation: {
      status: "COMPLETE",
      completedAt: "2026-08-15T12:00:00.000Z",
      startedAt: "2026-08-15T10:00:00.000Z",
      updatedAt: "2026-08-15T12:00:00.000Z",
    },
    findings: [{
      id: FINDING_ID,
      statement: "Drainage requires attention.",
      state: "NEEDS_ATTENTION",
      createdAt: "2026-08-15T12:10:00.000Z",
      updatedAt: "2026-08-15T12:10:00.000Z",
    }],
    recommendations: [{
      id: RECOMMENDATION_ID,
      findingId: FINDING_ID,
      statement: "Replace the failed drainage component.",
      state: "RECOMMENDED",
      createdAt: "2026-08-15T12:20:00.000Z",
      updatedAt: "2026-08-15T12:20:00.000Z",
    }],
    ...overrides,
  };
}

function installBrowser(body) {
  const prior = {
    fetch: globalThis.fetch,
    localStorage: globalThis.localStorage,
    window: globalThis.window,
  };
  const calls = [];
  globalThis.localStorage = {
    getItem(key) { return key === "token" ? "test-token" : null; },
    setItem() { throw new Error("customer EFR attempted browser authority"); },
    removeItem() {},
  };
  globalThis.window = { dispatchEvent() {}, location: { hash: "" } };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, async json() { return body; } };
  };
  return {
    calls,
    restore() { Object.assign(globalThis, prior); },
  };
}

test("customer EFR validator accepts only exact customer-safe Job truth", () => {
  const valid = validateCustomerEfrProjection(projection(), { jobId: JOB_ID });
  assert.equal(valid.jobId, JOB_ID);
  assert.equal(valid.findings[0].state, "NEEDS_ATTENTION");
  assert.equal(valid.recommendations[0].state, "RECOMMENDED");
  assert.equal(
    validateCustomerEfrProjection(projection({ internalCosts: 99 }), { jobId: JOB_ID }),
    null
  );
  assert.equal(
    validateCustomerEfrProjection(projection({ jobId: "44444444-4444-4444-8444-444444444444" }), { jobId: JOB_ID }),
    null
  );
  assert.equal(
    validateCustomerEfrProjection(projection({
      recommendations: [{ ...projection().recommendations[0], margin: 0.4 }],
    }), { jobId: JOB_ID }),
    null
  );
});

test("customer EFR uses one authenticated no-store staging API read", async () => {
  const browser = installBrowser({ success: true, projectAssessment: projection() });
  try {
    const result = await fetchCustomerEfr({ jobId: JOB_ID });
    assert.equal(result.requestId, 14);
    assert.deepEqual(browser.calls, [{
      url: `https://athletic-rebirth-staging.up.railway.app/customer/jobs/${JOB_ID}/project-assessment`,
      options: {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
      },
    }]);
  } finally {
    browser.restore();
  }
});

test("unsafe customer EFR response fails closed", async () => {
  const browser = installBrowser({
    success: true,
    projectAssessment: projection({ professionalInternalNotes: "sentinel" }),
  });
  try {
    await assert.rejects(
      fetchCustomerEfr({ jobId: JOB_ID }),
      (error) => error instanceof CustomerEfrError && error.code === "UNSAFE_CUSTOMER_EFR_RESPONSE"
    );
  } finally {
    browser.restore();
  }
});
