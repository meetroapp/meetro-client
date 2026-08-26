import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  loadCanonicalEvaluationForRecord,
  saveCanonicalEvaluationDraft,
} from "../src/utils/evaluationAuthorityController.js";
import { ordinaryCanonicalEvaluationFixture } from "./canonicalEvaluation.test.js";

const jobId = "66666666-6666-4666-8666-666666666666";
const ordinaryRecord = {
  source: "CANONICAL_BACKEND_READ",
  readOnly: true,
  lifecycleVerified: true,
  lifecycleContractVersion: 2,
  jobId,
  postId: 41,
  relationshipId: 72,
};

function ordinaryForm(overrides = {}) {
  return {
    observations: "Visible water damage is present around the cabinet base.",
    diagnosisSummary: "Material damage extent requires further evaluation.",
    limitations: "Cabinet wall remained closed.",
    internalNotes: "Synthetic QA only.",
    ...overrides,
  };
}

function installBrowser(responses) {
  const calls = [];
  const prior = {
    fetch: globalThis.fetch,
    localStorage: globalThis.localStorage,
    window: globalThis.window,
  };
  globalThis.localStorage = {
    getItem(key) { return key === "token" ? "test-token" : null; },
    setItem() { throw new Error("ordinary Evaluation attempted browser authority"); },
    removeItem() {},
  };
  globalThis.window = { dispatchEvent() {}, location: { hash: "" } };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const next = responses.shift();
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      async json() { return next.body; },
    };
  };
  return {
    calls,
    restore() { Object.assign(globalThis, prior); },
  };
}

test("ordinary canonical Evaluation reads no-Evaluation and existing-Evaluation states", async () => {
  const fixture = ordinaryCanonicalEvaluationFixture();
  const completedFixture = ordinaryCanonicalEvaluationFixture({
    aggregate: { version: 3 },
    evaluation: {
      status: "completed",
      completedAt: "2026-08-11T16:00:00.000Z",
      capabilities: { canEditDraft: false, canComplete: false },
    },
  });
  const browser = installBrowser([
    { status: 200, body: { success: true, evaluations: [] } },
    { status: 200, body: { success: true, evaluations: [fixture] } },
    { status: 200, body: { success: true, evaluations: [completedFixture] } },
  ]);
  try {
    assert.equal(
      await loadCanonicalEvaluationForRecord({ record: ordinaryRecord }),
      null
    );
    const existing = await loadCanonicalEvaluationForRecord({ record: ordinaryRecord });
    assert.equal(existing.evaluation.id, fixture.evaluation.id);
    assert.equal(existing.aggregate.sourceContext.jobId, jobId);
    const completed = await loadCanonicalEvaluationForRecord({ record: ordinaryRecord });
    assert.equal(completed.evaluation.status, "completed");
    assert.equal(completed.aggregate.version, 3);
    assert.ok(browser.calls.every((call) => call.options.method === "GET"));
    assert.ok(browser.calls.every((call) => call.url.endsWith(`/jobs/${jobId}/evaluations`)));
  } finally {
    browser.restore();
  }
});

test("ordinary canonical Evaluation creates and versions through backend commands only", async () => {
  const version1 = ordinaryCanonicalEvaluationFixture({ aggregate: { version: 1 } });
  const version2 = ordinaryCanonicalEvaluationFixture({
    aggregate: { version: 2 },
    evaluation: {
      content: {
        observations: "Updated professional observations.",
        findings: [],
        scopeRecommendations: [],
      },
    },
  });
  const browser = installBrowser([
    { status: 200, body: { success: true, evaluations: [] } },
    {
      status: 200,
      body: {
        success: true,
        visits: [{
          id: "99999999-9999-4999-8999-999999999999",
          jobId,
          purpose: "EVALUATION",
          state: "COMPLETED",
          currentVersion: 3,
          scheduledStartAt: "2026-08-25T14:00:00.000Z",
          scheduledEndAt: null,
          timeZone: "America/New_York",
          locationMode: "JOB_SERVICE_LOCATION",
          cancellationReason: null,
          cancelledAt: null,
          completedAt: "2026-08-25T15:00:00.000Z",
          evaluationId: null,
          workstreamIds: [],
          approvedQuoteDecisionEvidence: null,
          createdByParticipantId: "77777777-7777-4777-8777-777777777777",
          recordedByParticipantId: "77777777-7777-4777-8777-777777777777",
          createdAt: "2026-08-24T14:00:00.000Z",
          versionCreatedAt: "2026-08-25T15:00:00.000Z",
          actions: {
            canConfirm: false,
            canRequestChange: false,
            canReschedule: false,
            canCancel: false,
            canComplete: false,
          },
        }],
      },
    },
    { status: 201, body: { success: true, ...version1 } },
    { status: 200, body: { success: true, ...version2 } },
  ]);
  let keyIndex = 0;
  const createIdempotencyKey = (command) => `${command}-ordinary-${++keyIndex}`;
  try {
    const created = await saveCanonicalEvaluationDraft({
      record: ordinaryRecord,
      form: ordinaryForm(),
      createIdempotencyKey,
    });
    const updated = await saveCanonicalEvaluationDraft({
      record: ordinaryRecord,
      form: ordinaryForm({ observations: "Updated professional observations." }),
      currentEvaluation: created,
      createIdempotencyKey,
    });

    assert.equal(created.aggregate.version, 1);
    assert.equal(updated.aggregate.version, 2);
    assert.deepEqual(
      browser.calls.map((call) => call.options.method),
      ["GET", "GET", "POST", "PATCH"]
    );
    const createBody = JSON.parse(browser.calls[2].options.body);
    const updateBody = JSON.parse(browser.calls[3].options.body);
    assert.equal(createBody.visitId, "99999999-9999-4999-8999-999999999999");
    assert.deepEqual(createBody.content.findings, []);
    assert.deepEqual(createBody.content.scopeRecommendations, []);
    assert.equal(Object.hasOwn(createBody.content, "customerConcern"), false);
    assert.equal(updateBody.expectedVersion, 1);
    assert.equal(updateBody.content.observations, "Updated professional observations.");
    assert.doesNotMatch(
      browser.calls.map((call) => call.url).join("\n"),
      /findings|recommendations|workstreams|activities|obligations|quotes|schedule|completion|history|change-orders/i
    );
  } finally {
    browser.restore();
  }
});

test("missing Job identity and backend authority errors fail without false success", async () => {
  const noCalls = installBrowser([]);
  try {
    await assert.rejects(
      saveCanonicalEvaluationDraft({
        record: { ...ordinaryRecord, jobId: null },
        form: ordinaryForm(),
      }),
      (error) => error.code === "EVALUATION_SOURCE_UNAVAILABLE"
    );
    assert.equal(noCalls.calls.length, 0);
  } finally {
    noCalls.restore();
  }

  for (const status of [403, 404, 503]) {
    const browser = installBrowser([
      {
        status,
        body: {
          success: false,
          code:
            status === 403
              ? "EVALUATION_AUTHORITY_REQUIRED"
              : status === 404
                ? "EVALUATION_UNAVAILABLE"
                : "EVALUATION_READ_FAILED",
          message: "Canonical Evaluation is unavailable.",
        },
      },
    ]);
    try {
      await assert.rejects(
        loadCanonicalEvaluationForRecord({ record: ordinaryRecord }),
        (error) => error.status === status
      );
    } finally {
      browser.restore();
    }
  }
});

test("bounded component keeps concern read-only and uses canonical EFR commands", () => {
  const componentSource = readFileSync(
    new URL("../src/components/CanonicalJobEvaluation.jsx", import.meta.url),
    "utf8"
  );
  const dashboardSource = readFileSync(
    new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
    "utf8"
  );

  assert.match(componentSource, /getEfrCopy/);
  assert.match(componentSource, /copy\.customerConcern/);
  assert.match(componentSource, /copy\.customerDetails/);
  assert.match(componentSource, /copy\.startEvaluation/);
  assert.match(componentSource, /copy\.saveEvaluation/);
  assert.match(componentSource, /completeCanonicalEvaluationDraft/);
  assert.match(componentSource, /CanonicalFindingsPanel/);
  assert.doesNotMatch(componentSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(
    componentSource,
    /workflow_quote_sent|Quote command|Schedule command|Job Update|Change Order/
  );
  assert.match(
    dashboardSource,
    /isCanonicalReadOnlyJob[\s\S]*CanonicalJobEvaluation/
  );
});
