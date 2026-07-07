import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  getEnabledIntelligenceEngines,
  getIntelligenceEngineMetadata,
  getRegisteredIntelligenceEngines,
  INTELLIGENCE_ENGINE_NAMES,
  INTELLIGENCE_ENGINE_REGISTRY,
  INTELLIGENCE_ENGINE_REGISTRY_VERSION,
} from "../intelligence/contracts/intelligenceEngineRegistry.js";

test("Intelligence Engine Registry reflects the current orchestration order", () => {
  assert.equal(INTELLIGENCE_ENGINE_REGISTRY_VERSION, "1.0");

  const enabled = getEnabledIntelligenceEngines();
  assert.deepEqual(
    enabled.map((engine) => engine.name),
    [
      INTELLIGENCE_ENGINE_NAMES.intent,
      INTELLIGENCE_ENGINE_NAMES.context,
      INTELLIGENCE_ENGINE_NAMES.sessionMemory,
      INTELLIGENCE_ENGINE_NAMES.knowledge,
      INTELLIGENCE_ENGINE_NAMES.capability,
      INTELLIGENCE_ENGINE_NAMES.workflow,
      INTELLIGENCE_ENGINE_NAMES.relationship,
      INTELLIGENCE_ENGINE_NAMES.community,
    ]
  );
  assert.deepEqual(
    enabled.map((engine) => engine.executionOrder),
    [10, 20, 30, 40, 50, 60, 70, 80]
  );
  assert.equal(enabled.every((engine) => engine.version === "1.0" && engine.enabled === true), true);
});

test("Intelligence Engine Registry includes disabled future extension points", () => {
  const registered = getRegisteredIntelligenceEngines();
  const future = registered.filter((engine) => !engine.enabled);

  assert.deepEqual(
    future.map((engine) => engine.name),
    [
      INTELLIGENCE_ENGINE_NAMES.business,
      INTELLIGENCE_ENGINE_NAMES.document,
      INTELLIGENCE_ENGINE_NAMES.portfolio,
      INTELLIGENCE_ENGINE_NAMES.persistentMemory,
    ]
  );
  assert.equal(future.every((engine) => engine.version === "future"), true);
});

test("Intelligence Engine Registry enables Community metadata after Relationship without execution wiring", () => {
  const community = getIntelligenceEngineMetadata(INTELLIGENCE_ENGINE_NAMES.community);
  assert.deepEqual(community, {
    name: INTELLIGENCE_ENGINE_NAMES.community,
    version: "1.0",
    executionOrder: 80,
    enabled: true,
  });

  const relationship = getIntelligenceEngineMetadata(INTELLIGENCE_ENGINE_NAMES.relationship);
  assert.equal(relationship.executionOrder < community.executionOrder, true);

  const orchestratorSource = fs.readFileSync(
    new URL("../intelligence/orchestrator/companionOrchestrator.js", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(orchestratorSource, /buildCompanionCommunityIntelligence|companionCommunityEngine/);
});

test("Intelligence Engine Registry exposes metadata without becoming an execution path", () => {
  const workflow = getIntelligenceEngineMetadata(INTELLIGENCE_ENGINE_NAMES.workflow);
  assert.deepEqual(workflow, {
    name: INTELLIGENCE_ENGINE_NAMES.workflow,
    version: "1.0",
    executionOrder: 60,
    enabled: true,
  });

  assert.equal(getIntelligenceEngineMetadata("unknown"), null);
  assert.equal("execute" in workflow, false);
  assert.equal("handler" in workflow, false);
  assert.equal("run" in workflow, false);
});

test("Intelligence Engine Registry read helpers return copies", () => {
  const registered = getRegisteredIntelligenceEngines();
  registered[0].name = "mutated";

  assert.equal(INTELLIGENCE_ENGINE_REGISTRY[0].name, INTELLIGENCE_ENGINE_NAMES.intent);
  assert.equal(getRegisteredIntelligenceEngines()[0].name, INTELLIGENCE_ENGINE_NAMES.intent);
});
