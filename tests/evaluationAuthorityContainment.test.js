import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  completeCanonicalEvaluationDraft,
  isCanonicalQuoteCreationAvailable,
  loadCanonicalEvaluationForRecord,
  saveCanonicalEvaluationDraft,
} from "../src/utils/evaluationAuthorityController.js";
import {
  canonicalEvaluationFixture,
  ordinaryCanonicalEvaluationFixture,
} from "./canonicalEvaluation.test.js";

const root = join(import.meta.dirname, "..");
const dashboardSource = readFileSync(join(root, "src/pages/ContractorDashboard.jsx"), "utf8");
const leadsSource = readFileSync(join(root, "src/pages/BusinessLeads.jsx"), "utf8");
const controllerSource = readFileSync(join(root, "src/utils/evaluationAuthorityController.js"), "utf8");

function installBrowser(responses) {
  const calls = [];
  const prior = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, window: globalThis.window };
  globalThis.localStorage = {
    getItem(key) { return key === "token" ? "test-token" : null; },
    setItem() { throw new Error("canonical Evaluation attempted browser authority"); },
    removeItem() {},
  };
  globalThis.window = { dispatchEvent() {}, location: { hash: "" } };
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const next = responses.shift();
    return { ok: next.status >= 200 && next.status < 300, status: next.status, async json() { return next.body; } };
  };
  return { calls, restore() { Object.assign(globalThis, prior); } };
}

function form() {
  return {
    serviceType: "plumbing_repair",
    context: "emergency_request",
    evaluationTemplate: "plumbing_emergency",
    notes: "Supply connection inspected.",
    findings: "Connection seal failure.",
    findingRecords: [{ summary: "Seal failed.", severity: "high", customerShareable: true }],
    safetyNotes: "Supply isolated.",
    workItems: [{ title: "Replace seal and pressure test.", measurements: [], photos: [] }],
    photos: [],
  };
}

test("refresh, create, update, and completion use only canonical backend commands", async () => {
  const version1 = canonicalEvaluationFixture({ aggregate: { version: 1 } });
  const version2 = canonicalEvaluationFixture({ aggregate: { version: 2 } });
  const completed = canonicalEvaluationFixture({
    aggregate: { version: 3 },
    evaluation: {
      status: "completed",
      completedAt: "2026-08-01T12:05:00.000Z",
      capabilities: { canEditDraft: false, canComplete: false },
    },
  });
  const browser = installBrowser([
    { status: 200, body: { success: true, evaluations: [] } },
    { status: 200, body: { success: true, evaluations: [] } },
    { status: 201, body: { success: true, ...version1 } },
    { status: 200, body: { success: true, ...version2 } },
    { status: 200, body: { success: true, ...completed } },
  ]);
  const key = (() => {
    let value = 0;
    return (command) => `${command}-retry-${++value}`;
  })();
  try {
    const record = { emergencyRequestId: 91, relationshipId: 72 };
    assert.equal(await loadCanonicalEvaluationForRecord({ record }), null);
    const created = await saveCanonicalEvaluationDraft({ record, form: form(), createIdempotencyKey: key });
    assert.equal(created.aggregate.version, 1);
    const completedResult = await completeCanonicalEvaluationDraft({
      record,
      form: form(),
      currentEvaluation: created,
      createIdempotencyKey: key,
    });
    assert.equal(completedResult.evaluation.status, "completed");
    assert.equal(browser.calls.length, 5);
    assert.doesNotMatch(
      browser.calls.map((call) => call.url).join("\n"),
      /\/quotes|\/authorizations|\/start-work/i
    );
  } finally {
    browser.restore();
  }
});

test("ambiguous ordinary/project records and browser media fail before any API call", async () => {
  const browser = installBrowser([]);
  try {
    await assert.rejects(
      saveCanonicalEvaluationDraft({ record: { requestId: 9, relationshipId: 7 }, form: form() }),
      (error) => error.code === "EVALUATION_SOURCE_UNAVAILABLE"
    );
    await assert.rejects(
      saveCanonicalEvaluationDraft({
        record: { emergencyRequestId: 91 },
        form: { ...form(), photos: [{ id: "browser-photo" }] },
      }),
      (error) => error.code === "EVALUATION_MEDIA_UNSUPPORTED"
    );
    assert.equal(browser.calls.length, 0);
  } finally {
    browser.restore();
  }
});

test("ordinary Evaluation creation is available before a canonical Evaluation Visit", async () => {
  const fixture = ordinaryCanonicalEvaluationFixture({ aggregate: { version: 1 } });
  const ordinary = ordinaryCanonicalEvaluationFixture({
    aggregate: {
      version: 1,
      sourceContext: {
        ...fixture.aggregate.sourceContext,
        evaluationVisitId: null,
      },
    },
  });
  const jobId = ordinary.aggregate.sourceContext.jobId;
  const browser = installBrowser([
    { status: 200, body: { success: true, evaluations: [] } },
    { status: 201, body: { success: true, ...ordinary } },
  ]);
  try {
    const record = {
      source: "CANONICAL_BACKEND_READ",
      readOnly: true,
      lifecycleVerified: true,
      lifecycleContractVersion: 2,
      jobId,
      requestId: 41,
      relationshipId: 72,
    };
    const created = await saveCanonicalEvaluationDraft({
      record,
      form: form(),
      createIdempotencyKey: () => "evaluation-create-from-visit",
    });
    assert.equal(created.evaluation.id, ordinary.evaluation.id);
    assert.equal(JSON.parse(browser.calls[1].options.body).visitId, null);
    assert.doesNotMatch(browser.calls.map((call) => call.url).join("\n"), /visits|quotes|workstreams|payments|invoices/);
  } finally {
    browser.restore();
  }
});

test("production Evaluation path is guarded before both legacy writers and exposes no Quote authority", () => {
  assert.match(
    dashboardSource,
    /function saveEvaluationRecord[\s\S]*if \(!canReadLegacyWorkflowStorage\(\)\) \{[\s\S]*persistCanonicalEvaluation/
  );
  assert.match(
    dashboardSource,
    /const saveSarahPageEvaluationNotes[\s\S]*if \(!canReadLegacyWorkflowStorage\(\)\) \{[\s\S]*persistCanonicalEvaluation/
  );
  assert.match(dashboardSource, /loadCanonicalEvaluationForRecord/);
  assert.match(leadsSource, /buildCanonicalEvaluationRoute/);
  assert.match(
    leadsSource,
    /professional_arrived[\s\S]*work_in_progress[\s\S]*completed[\s\S]*Open Evaluation/
  );
  assert.doesNotMatch(controllerSource, /localStorage|sessionStorage|Date\.now|Math\.random/);
  assert.equal(isCanonicalQuoteCreationAvailable(), false);
  assert.doesNotMatch(controllerSource, /\/quotes|\/authorizations|\/start-work/);
});
