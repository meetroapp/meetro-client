import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { askCompanionGateway } from "../intelligence/gateway.js";
import { createEngineRegistry } from "../intelligence/orchestrator/engineRegistry.js";
import { selectEngineIds } from "../intelligence/orchestrator/engineSelector.js";
import { createEngineContextResult } from "../intelligence/orchestrator/orchestrationContracts.js";
import { buildUnifiedContext } from "../intelligence/orchestrator/unifiedContextBuilder.js";

function contextEngine(id, priority, data = {}, options = {}) {
  return {
    id,
    priority,
    required: options.required === true,
    enabled: true,
    supports: options.supports || (() => true),
    async collectContext() {
      if (options.failure) throw Object.assign(new Error("private engine failure"), { code: options.code || "engine_failure" });
      return createEngineContextResult({ section: options.section || id, priority, data });
    },
  };
}

function completeAskRegistry(overrides = {}) {
  const definitions = [
    contextEngine("context", 10, { user: { id: "server-user" } }, { required: true }),
    contextEngine("memory", 20, []),
    contextEngine("knowledge", 30, { principles: ["trust"] }),
    contextEngine("capability", 40, { primaryCapabilities: ["carpentry"] }, { section: "capabilities" }),
    contextEngine("workflow", 50, { currentStage: "evaluation" }),
    contextEngine("relationship", 60, { relationshipType: "homeowner_professional" }),
  ].map((engine) => overrides[engine.id] || engine);
  return createEngineRegistry(definitions);
}

test("executable engine registry validates engines and rejects duplicate IDs", () => {
  assert.throws(() => createEngineRegistry([{ id: "bad" }]), /supports/);
  assert.throws(
    () => createEngineRegistry([contextEngine("context", 10), contextEngine("context", 20)]),
    /Duplicate intelligence engine/
  );
});

test("engine selection is centralized, deterministic, deduplicated, and safely falls back", () => {
  const registry = createEngineRegistry([
    contextEngine("capability", 30),
    contextEngine("context", 10),
    contextEngine("knowledge", 20),
    contextEngine("workflow", 40),
  ]);

  assert.deepEqual(selectEngineIds({ feature: "unknown", source: {} }, registry), ["context", "knowledge", "capability"]);
  assert.deepEqual(
    selectEngineIds({ feature: "emergency", source: {} }, registry),
    ["context", "knowledge", "workflow"]
  );
});

test("unified context excludes empty values, preserves order, and protects system context", () => {
  const result = buildUnifiedContext([
    createEngineContextResult({ section: "workflow", priority: 30, data: { stage: "quote" } }),
    createEngineContextResult({ section: "memory", priority: 20, data: [] }),
    createEngineContextResult({ section: "context", priority: 10, data: { accountType: "standard" } }),
    createEngineContextResult({ section: "context", priority: 40, data: { overwritten: true } }),
    createEngineContextResult({ section: "system", priority: 1, data: { prompt: "untrusted" } }),
  ]);

  assert.deepEqual(Object.keys(result.context), ["context", "workflow"]);
  assert.equal("memory" in result.context, false);
  assert.equal("system" in result.context, false);
  assert.equal(result.context.context.overwritten, undefined);
  assert.deepEqual(result.metadata.droppedSections, ["system", "context"]);
});

test("optional engine failure is isolated and provider receives unified context", async () => {
  const calls = [];
  const registry = completeAskRegistry({
    knowledge: contextEngine("knowledge", 30, {}, { failure: true }),
  });
  const result = await askCompanionGateway({
    user: { id: "user-1" },
    body: { question: "What happens next?" },
    engineRegistry: registry,
    providers: {
      openai: {
        name: "openai",
        async complete(payload) {
          calls.push(payload);
          return { answer: "Continue safely." };
        },
      },
    },
    logger: null,
  });

  assert.equal(result.success, true);
  assert.equal(calls.length, 1);
  const payload = JSON.parse(calls[0].messages[1].content);
  assert.deepEqual(payload.unifiedContext.context.user, { id: "server-user" });
  assert.equal("knowledge" in payload.unifiedContext, false);
  assert.equal("provider" in result, false);
  assert.equal("unifiedContext" in result, false);
});

test("required engine failure prevents provider execution and records failed usage", async () => {
  let providerCalled = false;
  const usage = [];
  const registry = completeAskRegistry({
    context: contextEngine("context", 10, {}, { required: true, failure: true, code: "context_unavailable" }),
  });
  const result = await askCompanionGateway({
    user: { id: "user-1" },
    body: { question: "What happens next?" },
    engineRegistry: registry,
    providers: {
      openai: {
        async complete() {
          providerCalled = true;
          return { answer: "Must not run" };
        },
      },
    },
    recordUsage(event) {
      usage.push(event);
    },
    logger: null,
  });

  assert.equal(providerCalled, false);
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "context_unavailable");
  assert.equal(usage.length, 1);
  assert.equal(usage[0].success, false);
});

test("Gateway delegates provider work and does not build context or invoke providers directly", () => {
  const gateway = fs.readFileSync(new URL("../intelligence/gateway.js", import.meta.url), "utf8");
  assert.match(gateway, /orchestrateCompanionAsk/);
  assert.doesNotMatch(gateway, /invokeProvider|buildCompanionContextEngine|collectContext/);
});

test("structured orchestration logs exclude prompts, messages, and private context", async () => {
  const events = [];
  await askCompanionGateway({
    user: { id: "user-1" },
    body: { question: "PRIVATE MESSAGE", metadata: { privateNotes: "PRIVATE NOTE" } },
    engineRegistry: completeAskRegistry(),
    providers: { openai: { name: "openai", async complete() { return { answer: "ok" }; } } },
    logger: {
      info(event, fields) { events.push({ event, fields }); },
      warn(event, fields) { events.push({ event, fields }); },
    },
  });

  assert.ok(events.some((entry) => entry.event === "intelligence.orchestration.completed"));
  assert.doesNotMatch(JSON.stringify(events), /PRIVATE MESSAGE|PRIVATE NOTE/);
});
