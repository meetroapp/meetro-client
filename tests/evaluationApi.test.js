import assert from "node:assert/strict";
import test from "node:test";

import {
  EvaluationApiError,
  completeEvaluation,
  createEvaluation,
  createOrdinaryJobEvaluation,
  createEvaluationIdempotencyKey,
  getEvaluation,
  listEvaluationsForEmergencyRequest,
  listEvaluationsForJob,
  updateEvaluationDraft,
} from "../src/utils/evaluationApi.js";
import {
  canonicalEvaluationFixture,
  ordinaryCanonicalEvaluationFixture,
} from "./canonicalEvaluation.test.js";

function installBrowser({ responses }) {
  const calls = [];
  const prior = {
    fetch: globalThis.fetch,
    localStorage: globalThis.localStorage,
    window: globalThis.window,
  };
  globalThis.localStorage = {
    getItem(key) { return key === "token" ? "test-token" : null; },
    removeItem() {},
  };
  globalThis.window = {
    dispatchEvent() {},
    location: { hash: "" },
  };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const item = responses.shift();
    return {
      ok: item.status >= 200 && item.status < 300,
      status: item.status,
      async json() { return item.body; },
    };
  };
  return {
    calls,
    restore() {
      globalThis.fetch = prior.fetch;
      globalThis.localStorage = prior.localStorage;
      globalThis.window = prior.window;
    },
  };
}

test("create, update, and completion send explicit commands, expected versions, and retry keys", async () => {
  const fixture = canonicalEvaluationFixture();
  const browser = installBrowser({ responses: [
    { status: 201, body: { success: true, ...fixture } },
    { status: 200, body: { success: true, ...fixture, aggregate: { ...fixture.aggregate, version: 3 } } },
    { status: 200, body: { success: true, ...fixture, aggregate: { ...fixture.aggregate, version: 4 } } },
  ] });
  try {
    await createEvaluation({
      sourceContext: fixture.aggregate.sourceContext,
      content: fixture.evaluation.content,
      idempotencyKey: "create-retry-key",
    });
    await updateEvaluationDraft({
      evaluationId: fixture.evaluation.id,
      expectedVersion: 2,
      content: fixture.evaluation.content,
      idempotencyKey: "update-retry-key",
    });
    await completeEvaluation({
      evaluationId: fixture.evaluation.id,
      expectedVersion: 3,
      idempotencyKey: "complete-retry-key",
    });
    assert.equal(browser.calls.length, 3);
    assert.match(browser.calls[0].url, /\/evaluations$/);
    assert.equal(browser.calls[0].options.method, "POST");
    assert.equal(browser.calls[0].options.headers["Idempotency-Key"], "create-retry-key");
    assert.deepEqual(JSON.parse(browser.calls[0].options.body), {
      sourceContext: fixture.aggregate.sourceContext,
      content: fixture.evaluation.content,
      expectedVersion: 0,
    });
    assert.equal(JSON.parse(browser.calls[1].options.body).expectedVersion, 2);
    assert.equal(browser.calls[2].options.method, "POST");
    assert.match(browser.calls[2].url, /\/complete$/);
    assert.deepEqual(JSON.parse(browser.calls[2].options.body), { expectedVersion: 3 });
    assert.ok(browser.calls.every((call) => call.options.headers.Authorization === "Bearer test-token"));
    assert.doesNotMatch(JSON.stringify(browser.calls), /actorUserId|ownerUserId|professionalUserId/);
  } finally {
    browser.restore();
  }
});

test("get and list reconstruct backend truth without unsupported calls", async () => {
  const fixture = canonicalEvaluationFixture();
  const browser = installBrowser({ responses: [
    { status: 200, body: { success: true, ...fixture } },
    { status: 200, body: { success: true, evaluations: [fixture] } },
  ] });
  try {
    const found = await getEvaluation({ evaluationId: fixture.evaluation.id });
    const list = await listEvaluationsForEmergencyRequest({ emergencyRequestId: 91 });
    assert.equal(found.evaluation.id, fixture.evaluation.id);
    assert.equal(list.length, 1);
    assert.match(browser.calls[0].url, /\/evaluations\/11111111-/);
    assert.match(browser.calls[1].url, /\/emergency-requests\/91\/evaluations$/);
    assert.ok(browser.calls.every((call) => call.options.method === "GET"));
  } finally {
    browser.restore();
  }
});

test("ordinary Job create and list use the existing job-scoped canonical routes", async () => {
  const fixture = ordinaryCanonicalEvaluationFixture({ aggregate: { version: 1 } });
  const jobId = fixture.aggregate.sourceContext.jobId;
  const browser = installBrowser({ responses: [
    { status: 201, body: { success: true, ...fixture } },
    { status: 200, body: { success: true, evaluations: [fixture] } },
  ] });
  try {
    await createOrdinaryJobEvaluation({
      jobId,
      content: fixture.evaluation.content,
      idempotencyKey: "ordinary-create-key",
    });
    const evaluations = await listEvaluationsForJob({ jobId });

    assert.equal(evaluations.length, 1);
    assert.match(browser.calls[0].url, new RegExp(`/jobs/${jobId}/evaluations$`));
    assert.equal(browser.calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(browser.calls[0].options.body), {
      content: fixture.evaluation.content,
      expectedVersion: 0,
    });
    assert.equal(Object.hasOwn(JSON.parse(browser.calls[0].options.body), "sourceContext"), false);
    assert.equal(browser.calls[1].options.method, "GET");
    assert.match(browser.calls[1].url, new RegExp(`/jobs/${jobId}/evaluations$`));
  } finally {
    browser.restore();
  }
});

test("stale, unavailable, invalid, and malformed responses fail closed", async () => {
  const fixture = canonicalEvaluationFixture();
  const browser = installBrowser({ responses: [
    { status: 409, body: { success: false, code: "STALE_EVALUATION_VERSION", message: "The Evaluation version is no longer current." } },
    { status: 503, body: { success: false, code: "DATABASE_UNAVAILABLE", message: "The service is temporarily unavailable." } },
    { status: 200, body: { success: true, ...fixture, confirmed: false } },
  ] });
  try {
    await assert.rejects(
      updateEvaluationDraft({ evaluationId: fixture.evaluation.id, expectedVersion: 2, content: fixture.evaluation.content, idempotencyKey: "stale-key" }),
      (error) => error instanceof EvaluationApiError && error.code === "STALE_EVALUATION_VERSION"
    );
    await assert.rejects(
      getEvaluation({ evaluationId: fixture.evaluation.id }),
      (error) => error.code === "DATABASE_UNAVAILABLE"
    );
    await assert.rejects(
      getEvaluation({ evaluationId: fixture.evaluation.id }),
      (error) => error.code === "INVALID_EVALUATION_RESPONSE"
    );
  } finally {
    browser.restore();
  }
});

test("idempotency keys are retry identities, not browser-authored Evaluation identities", () => {
  const value = createEvaluationIdempotencyKey("create", {
    randomUUID: () => "22222222-2222-4222-8222-222222222222",
  });
  assert.equal(value, "evaluation:create:22222222-2222-4222-8222-222222222222");
  assert.throws(
    () => createEvaluationIdempotencyKey("create", {}),
    (error) => error.code === "EVALUATION_IDEMPOTENCY_UNAVAILABLE"
  );
});
