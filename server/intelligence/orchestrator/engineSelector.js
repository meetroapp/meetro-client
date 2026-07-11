const DEFAULT_ENGINES = ["capability", "context", "knowledge"];

const FEATURE_ENGINES = Object.freeze({
  emergency: ["workflow", "knowledge", "context"],
  quote_builder: ["workflow", "business", "contracts", "context"],
  conversation: ["relationship", "memory", "context"],
  community: ["community", "relationship", "context"],
  ask_meetro: ["capability", "context", "knowledge", "workflow", "relationship", "memory"],
  business_intelligence: ["business", "workflow", "context"],
});

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function selectEngineIds(request = {}, registry) {
  const feature = normalize(request.feature);
  const capability = normalize(request.capability);
  const source = normalize(request.source?.page || request.source?.surface);
  const mapped = FEATURE_ENGINES[feature] || FEATURE_ENGINES[capability] || FEATURE_ENGINES[source];
  const ids = [...new Set(mapped || DEFAULT_ENGINES)];

  return ids
    .map((id) => registry.get(id))
    .filter((engine) => engine && engine.enabled !== false && engine.supports(request) !== false)
    .sort((left, right) => left.priority - right.priority)
    .map((engine) => engine.id);
}

export { DEFAULT_ENGINES, FEATURE_ENGINES };
