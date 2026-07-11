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
      INTELLIGENCE_ENGINE_NAMES.workflow,
      INTELLIGENCE_ENGINE_NAMES.relationship,
      INTELLIGENCE_ENGINE_NAMES.persistentMemory,
      INTELLIGENCE_ENGINE_NAMES.business,
      INTELLIGENCE_ENGINE_NAMES.community,
      INTELLIGENCE_ENGINE_NAMES.knowledge,
      INTELLIGENCE_ENGINE_NAMES.capability,
    ]
  );
  assert.deepEqual(
    enabled.map((engine) => engine.executionOrder),
    [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  );
  assert.equal(enabled.every((engine) => engine.version === "1.0" && engine.enabled === true), true);
});

test("Intelligence Engine Registry includes disabled future extension points", () => {
  const registered = getRegisteredIntelligenceEngines();
  const future = registered.filter((engine) => !engine.enabled);

  assert.deepEqual(
    future.map((engine) => engine.name),
    [
      INTELLIGENCE_ENGINE_NAMES.document,
      INTELLIGENCE_ENGINE_NAMES.portfolio,
    ]
  );
  assert.equal(future.every((engine) => engine.version === "future"), true);
});

test("Intelligence Engine Registry enables Community metadata after Relationship", () => {
  const community = getIntelligenceEngineMetadata(INTELLIGENCE_ENGINE_NAMES.community);
  assert.deepEqual(community, {
    name: INTELLIGENCE_ENGINE_NAMES.community,
    version: "1.0",
    executionOrder: 80,
    enabled: true,
  });

  const relationship = getIntelligenceEngineMetadata(INTELLIGENCE_ENGINE_NAMES.relationship);
  const persistentMemory = getIntelligenceEngineMetadata(INTELLIGENCE_ENGINE_NAMES.persistentMemory);
  const business = getIntelligenceEngineMetadata(INTELLIGENCE_ENGINE_NAMES.business);
  assert.deepEqual(persistentMemory, {
    name: INTELLIGENCE_ENGINE_NAMES.persistentMemory,
    version: "1.0",
    executionOrder: 60,
    enabled: true,
  });
  assert.equal(relationship.executionOrder < persistentMemory.executionOrder, true);
  assert.deepEqual(business, {
    name: INTELLIGENCE_ENGINE_NAMES.business,
    version: "1.0",
    executionOrder: 70,
    enabled: true,
  });
  assert.equal(persistentMemory.executionOrder < business.executionOrder, true);
  assert.equal(business.executionOrder < community.executionOrder, true);

  const gatewaySource = fs.readFileSync(new URL("../intelligence/gateway.js", import.meta.url), "utf8");
  assert.doesNotMatch(gatewaySource, /buildCompanionCommunityIntelligence|companionCommunityEngine/);
});

test("Intelligence Engine Registry exposes metadata without becoming an execution path", () => {
  const workflow = getIntelligenceEngineMetadata(INTELLIGENCE_ENGINE_NAMES.workflow);
  assert.deepEqual(workflow, {
    name: INTELLIGENCE_ENGINE_NAMES.workflow,
    version: "1.0",
    executionOrder: 40,
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
