import test from "node:test";
import assert from "node:assert/strict";

import {
  createIntelligenceEngineFailure,
  createIntelligenceEngineSuccess,
  INTELLIGENCE_ENGINE_CONTRACT_VERSION,
  isIntelligenceEngineResult,
} from "../intelligence/contracts/intelligenceEngineContract.js";

test("Intelligence Engine Contract creates a standard success result", () => {
  const result = createIntelligenceEngineSuccess({
    engine: "capability",
    data: { primaryCapabilities: ["carpentry"] },
    diagnostics: { confidence: 0.82 },
    warnings: ["partial_signal"],
  });

  assert.deepEqual(result, {
    ok: true,
    success: true,
    contractVersion: INTELLIGENCE_ENGINE_CONTRACT_VERSION,
    engine: "capability",
    data: { primaryCapabilities: ["carpentry"] },
    diagnostics: { confidence: 0.82 },
    warnings: ["partial_signal"],
  });
  assert.equal(isIntelligenceEngineResult(result), true);
});

test("Intelligence Engine Contract creates a standard failure result", () => {
  const result = createIntelligenceEngineFailure({
    engine: "workflow",
    code: "workflow_context_unavailable",
    message: "Workflow context was not available.",
    diagnostics: { contextBuilt: false },
    recoverable: false,
  });

  assert.deepEqual(result, {
    ok: false,
    success: false,
    contractVersion: INTELLIGENCE_ENGINE_CONTRACT_VERSION,
    engine: "workflow",
    data: {},
    diagnostics: { contextBuilt: false },
    recoverable: false,
    error: {
      code: "workflow_context_unavailable",
      message: "Workflow context was not available.",
    },
  });
  assert.equal(isIntelligenceEngineResult(result), true);
});

test("Intelligence Engine Contract defaults fail safely for incomplete inputs", () => {
  const success = createIntelligenceEngineSuccess({
    data: ["not an object"],
    diagnostics: "not an object",
    warnings: "not an array",
  });
  assert.equal(success.engine, "unknown_engine");
  assert.deepEqual(success.data, {});
  assert.deepEqual(success.diagnostics, {});
  assert.deepEqual(success.warnings, []);

  const failure = createIntelligenceEngineFailure({
    code: "",
    message: "",
    data: "not an object",
    recoverable: undefined,
  });
  assert.equal(failure.engine, "unknown_engine");
  assert.equal(failure.error.code, "engine_failure");
  assert.equal(failure.error.message, "The intelligence engine could not complete safely.");
  assert.equal(failure.recoverable, true);
  assert.equal(isIntelligenceEngineResult({ ok: true, success: true }), false);
});

