function validateEngine(engine) {
  if (!engine || typeof engine !== "object") throw new TypeError("Intelligence engine must be an object.");
  if (!engine.id || typeof engine.id !== "string") throw new TypeError("Intelligence engine requires a stable id.");
  if (typeof engine.supports !== "function") throw new TypeError(`Intelligence engine ${engine.id} requires supports().`);
  if (typeof engine.collectContext !== "function") throw new TypeError(`Intelligence engine ${engine.id} requires collectContext().`);
}

export function createEngineRegistry(initialEngines = []) {
  const engines = new Map();

  const registry = {
    register(engine) {
      validateEngine(engine);
      if (engines.has(engine.id)) throw new Error(`Duplicate intelligence engine: ${engine.id}`);
      engines.set(engine.id, Object.freeze({ required: false, enabled: true, priority: 100, ...engine }));
      return registry;
    },
    get(id) {
      return engines.get(id) || null;
    },
    list() {
      return [...engines.values()].sort((left, right) => left.priority - right.priority);
    },
  };

  initialEngines.forEach((engine) => registry.register(engine));
  return registry;
}

export { validateEngine };
