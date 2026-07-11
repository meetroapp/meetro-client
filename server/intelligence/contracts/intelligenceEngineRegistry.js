export const INTELLIGENCE_ENGINE_REGISTRY_VERSION = "1.0";

export const INTELLIGENCE_ENGINE_NAMES = Object.freeze({
  intent: "intent",
  context: "context",
  sessionMemory: "session_memory",
  knowledge: "knowledge",
  capability: "capability",
  workflow: "workflow",
  relationship: "relationship",
  community: "community",
  business: "business",
  document: "document",
  portfolio: "portfolio",
  persistentMemory: "persistent_memory",
});

const CURRENT_ENGINE_REGISTRY = [
  {
    name: INTELLIGENCE_ENGINE_NAMES.intent,
    version: "1.0",
    executionOrder: 10,
    enabled: true,
  },
  {
    name: INTELLIGENCE_ENGINE_NAMES.context,
    version: "1.0",
    executionOrder: 20,
    enabled: true,
  },
  {
    name: INTELLIGENCE_ENGINE_NAMES.sessionMemory,
    version: "1.0",
    executionOrder: 30,
    enabled: true,
  },
  {
    name: INTELLIGENCE_ENGINE_NAMES.knowledge,
    version: "1.0",
    executionOrder: 90,
    enabled: true,
  },
  {
    name: INTELLIGENCE_ENGINE_NAMES.capability,
    version: "1.0",
    executionOrder: 100,
    enabled: true,
  },
  {
    name: INTELLIGENCE_ENGINE_NAMES.workflow,
    version: "1.0",
    executionOrder: 40,
    enabled: true,
  },
  {
    name: INTELLIGENCE_ENGINE_NAMES.relationship,
    version: "1.0",
    executionOrder: 50,
    enabled: true,
  },
  {
    name: INTELLIGENCE_ENGINE_NAMES.persistentMemory,
    version: "1.0",
    executionOrder: 60,
    enabled: true,
  },
  {
    name: INTELLIGENCE_ENGINE_NAMES.business,
    version: "1.0",
    executionOrder: 70,
    enabled: true,
  },
  {
    name: INTELLIGENCE_ENGINE_NAMES.community,
    version: "1.0",
    executionOrder: 80,
    enabled: true,
  },
];

const FUTURE_ENGINE_REGISTRY = [
  {
    name: INTELLIGENCE_ENGINE_NAMES.document,
    version: "future",
    executionOrder: 110,
    enabled: false,
  },
  {
    name: INTELLIGENCE_ENGINE_NAMES.portfolio,
    version: "future",
    executionOrder: 120,
    enabled: false,
  },
];

function cloneEngine(engine = {}) {
  return Object.freeze({ ...engine });
}

function sortByExecutionOrder(left, right) {
  return left.executionOrder - right.executionOrder;
}

export const INTELLIGENCE_ENGINE_REGISTRY = Object.freeze(
  [...CURRENT_ENGINE_REGISTRY, ...FUTURE_ENGINE_REGISTRY]
    .sort(sortByExecutionOrder)
    .map(cloneEngine)
);

export function getRegisteredIntelligenceEngines({ includeDisabled = true } = {}) {
  const engines = includeDisabled
    ? INTELLIGENCE_ENGINE_REGISTRY
    : INTELLIGENCE_ENGINE_REGISTRY.filter((engine) => engine.enabled);

  return engines.map((engine) => ({ ...engine }));
}

export function getEnabledIntelligenceEngines() {
  return getRegisteredIntelligenceEngines({ includeDisabled: false });
}

export function getIntelligenceEngineMetadata(name = "") {
  const engine = INTELLIGENCE_ENGINE_REGISTRY.find((entry) => entry.name === name);
  return engine ? { ...engine } : null;
}
