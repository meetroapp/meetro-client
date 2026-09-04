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
      capabilities: {
        canEditDraft: false,
        canComplete: false,
        canRevise: true,
      },
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

test("live-compatible linked draft hydrates canonical content and repeated reads stay read-only", async () => {
  const fixture = ordinaryCanonicalEvaluationFixture({
    aggregate: {
      version: 1,
      sourceContext: {
        type: "ordinary_job",
        jobId,
        requestId: 41,
        relationshipId: 72,
        evaluationVisitId: "76a1797d-e6f2-4ceb-989e-3a1c40a3240a",
      },
    },
    evaluation: {
      status: "draft",
      completedAt: null,
      content: {
        observations: "Water damage inside cabinet holding door, all 3 trims are also damage",
        diagnosisSummary: "Replacement of all water damage area and inspect for mold and drywall repair as needed",
        findings: [],
        scopeRecommendations: [],
      },
    },
  });
  const browser = installBrowser([
    { status: 200, body: { success: true, evaluations: [fixture] } },
    { status: 200, body: { success: true, evaluations: [fixture] } },
  ]);
  try {
    const first = await loadCanonicalEvaluationForRecord({ record: ordinaryRecord });
    const second = await loadCanonicalEvaluationForRecord({ record: ordinaryRecord });

    assert.equal(first.aggregate.version, 1);
    assert.equal(first.evaluation.status, "draft");
    assert.equal(first.evaluation.content.observations, fixture.evaluation.content.observations);
    assert.equal(first.evaluation.content.diagnosisSummary, fixture.evaluation.content.diagnosisSummary);
    assert.deepEqual(second, first);
    assert.deepEqual(browser.calls.map((call) => call.options.method), ["GET", "GET"]);
    assert.ok(browser.calls.every((call) => call.options.body == null));
  } finally {
    browser.restore();
  }
});

test("ordinary canonical Evaluation creates a pre-Visit draft and versions through backend commands only", async () => {
  const preVisitSourceContext = {
    type: "ordinary_job",
    jobId,
    requestId: 41,
    relationshipId: 72,
    evaluationVisitId: null,
  };
  const version1 = ordinaryCanonicalEvaluationFixture({
    aggregate: { version: 1, sourceContext: preVisitSourceContext },
  });
  const version2 = ordinaryCanonicalEvaluationFixture({
    aggregate: { version: 2, sourceContext: preVisitSourceContext },
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
    { status: 201, body: { success: true, ...version1 } },
    { status: 200, body: { success: true, ...version2 } },
  ]);
  let keyIndex = 0;
  const createIdempotencyKey = (command) => `${command}-ordinary-${++keyIndex}`;
  try {
    const created = await saveCanonicalEvaluationDraft({
      record: ordinaryRecord,
      form: ordinaryForm({
        observations: "",
        internalNotes: "Questions prepared before the Evaluation Visit.",
      }),
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
      ["GET", "POST", "PATCH"]
    );
    const createBody = JSON.parse(browser.calls[1].options.body);
    const updateBody = JSON.parse(browser.calls[2].options.body);
    assert.equal(createBody.visitId, null);
    assert.equal(createBody.content.observations, "");
    assert.equal(
      createBody.content.internalNotes,
      "Questions prepared before the Evaluation Visit."
    );
    assert.deepEqual(createBody.content.findings, []);
    assert.deepEqual(createBody.content.scopeRecommendations, []);
    assert.equal(Object.hasOwn(createBody.content, "customerConcern"), false);
    assert.equal(updateBody.expectedVersion, 1);
    assert.equal(updateBody.content.observations, "Updated professional observations.");
    assert.doesNotMatch(
      browser.calls.map((call) => call.url).join("\n"),
      /findings|recommendations|workstreams|activities|obligations|quotes|visits|schedule|completion|history|change-orders/i
    );
  } finally {
    browser.restore();
  }
});

test("completed ordinary Evaluation uses revision authority and saves a new completed version", async () => {
  const completed = ordinaryCanonicalEvaluationFixture({
    aggregate: { version: 3 },
    evaluation: {
      status: "completed",
      completedAt: "2026-09-04T20:00:00.000Z",
      capabilities: {
        canEditDraft: false,
        canComplete: false,
        canRevise: true,
      },
    },
  });

  const revised = ordinaryCanonicalEvaluationFixture({
    aggregate: { version: 4 },
    evaluation: {
      status: "completed",
      completedAt: "2026-09-04T20:00:00.000Z",
      capabilities: {
        canEditDraft: false,
        canComplete: false,
        canRevise: true,
      },
      content: {
        observations:
          "Customer added replacement of the damaged trim before Quote preparation.",
        findings: [],
        scopeRecommendations: [],
      },
    },
  });

  const browser = installBrowser([
    { status: 200, body: { success: true, ...revised } },
  ]);

  try {
    const result = await saveCanonicalEvaluationDraft({
      record: ordinaryRecord,
      form: ordinaryForm({
        observations:
          "Customer added replacement of the damaged trim before Quote preparation.",
      }),
      currentEvaluation: completed,
      createIdempotencyKey: (command) => `${command}-completed-evaluation`,
    });

    assert.equal(result.aggregate.version, 4);
    assert.equal(result.evaluation.status, "completed");
    assert.equal(
      result.evaluation.completedAt,
      "2026-09-04T20:00:00.000Z"
    );

    assert.equal(browser.calls.length, 1);
    assert.equal(browser.calls[0].options.method, "POST");
    assert.ok(
      browser.calls[0].url.endsWith(
        `/evaluations/${completed.evaluation.id}/revisions`
      )
    );

    const body = JSON.parse(browser.calls[0].options.body);

    assert.equal(body.expectedVersion, 3);
    assert.equal(
      body.content.observations,
      "Customer added replacement of the damaged trim before Quote preparation."
    );

    assert.doesNotMatch(
      browser.calls[0].url,
      /quotes|deposit|payment|schedule|visits|workstreams|invoices/i
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
  assert.doesNotMatch(componentSource, /if \(!form\.observations\.trim\(\)\)/);
  assert.match(componentSource, /Fill manually/);
  assert.match(componentSource, /copy\.saveEvaluation/);
  assert.match(componentSource, /copy\.saveUpdate/);
  assert.match(componentSource, /capabilities\?\.canRevise === true/);
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
  assert.match(componentSource, /Evaluation documentation not complete/);
  assert.match(componentSource, /Evaluation draft saved/);
  assert.match(componentSource, /Your latest Evaluation work is saved\. You can finish it now or return later\./);
  assert.match(componentSource, /Review Findings &amp; Recommendations/);
  assert.match(componentSource, /Continue Evaluation/);
  assert.match(componentSource, /Do this later/);
  assert.match(componentSource, /setDocumentationReminderDismissed\(true\)/);
  assert.doesNotMatch(componentSource, /Prepare Quote Directly|prepareQuoteDirectly/);
});
