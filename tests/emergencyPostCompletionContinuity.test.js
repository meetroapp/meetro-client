import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { resolveWorkCenterLifecyclePresentation } from "../src/utils/workCenterLifecyclePresentation.js";

function emergency(stage, deposit) {
  return {
    sourceType: "emergency_request",
    stage: { code: stage, label: stage },
    nextAction: { code: "START_WORK", label: "Start Work" },
    responsibility: { label: "Professional" },
    deposit,
  };
}

test("NOT_REQUIRED Emergency deposit is not rendered as a completed payment stage", () => {
  const view = resolveWorkCenterLifecyclePresentation({
    sourceType: "emergency_request",
    liveJob: emergency("WORK_READY", { state: "NOT_REQUIRED" }),
  });
  assert.equal(view.currentStageKey, "work");
  assert.equal(view.stages.some((stage) => stage.key === "deposit"), false);
});

test("satisfied Emergency deposit remains a completed lifecycle stage", () => {
  const view = resolveWorkCenterLifecyclePresentation({
    sourceType: "emergency_request",
    liveJob: emergency("WORK_READY", { state: "SATISFIED" }),
  });
  const deposit = view.stages.find((stage) => stage.key === "deposit");
  assert.equal(deposit?.state, "complete");
});

test("Invoice approved-Quote rediscovery preserves Emergency source context", () => {
  const quoteRead = fs.readFileSync(new URL("../src/utils/canonicalQuoteRead.js", import.meta.url), "utf8");
  const invoiceRead = fs.readFileSync(new URL("../src/utils/invoiceReviewDraft.js", import.meta.url), "utf8");
  const builder = fs.readFileSync(new URL("../src/pages/QuoteBuilder.jsx", import.meta.url), "utf8");
  assert.match(quoteRead, /validateCanonicalQuotes\(value, \{ jobId, sourceContext \}/);
  assert.match(quoteRead, /validateCanonicalQuoteProjection\(quote, \{ sourceContext \}\)/);
  assert.match(invoiceRead, /validateCanonicalQuotes\(data\.quotes, \{ jobId, sourceContext \}\)/);
  assert.match(builder, /fetchCanonicalLiveJobProjection/);
  assert.match(builder, /sourceContext = live\.projection/);
});

test("Home uses canonical customer History when legacy workflow storage is disabled", () => {
  const api = fs.readFileSync(new URL("../src/utils/jobCompletionApi.js", import.meta.url), "utf8");
  const home = fs.readFileSync(new URL("../src/pages/Home.jsx", import.meta.url), "utf8");
  assert.match(api, /\/customer\/jobs\/history\?/);
  assert.match(home, /fetchCustomerJobHistoryList/);
  assert.match(home, /canonicalHistory: true/);
  assert.match(home, /function CanonicalHistoryDetailsSheet/);
  assert.equal((home.match(/<CanonicalHistoryDetailsSheet/g) || []).length, 2);
  assert.equal((home.match(/<CustomerCompletionHistory/g) || []).length, 1);
});
