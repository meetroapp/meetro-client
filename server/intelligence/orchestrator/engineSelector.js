const DEFAULT_ENGINES = ["capability", "context", "knowledge"];

const FEATURE_ENGINES = Object.freeze({
  emergency: ["workflow", "relationship", "persistent_memory", "knowledge", "context"],
  quote_builder: ["workflow", "relationship", "persistent_memory", "business", "contracts", "context"],
  conversation: ["relationship", "memory", "persistent_memory", "workflow", "context"],
  community: ["community", "context"],
  ask_meetro: ["capability", "context", "knowledge", "workflow", "relationship", "memory", "persistent_memory"],
  business_intelligence: ["business", "workflow", "relationship", "persistent_memory", "context"],
  evaluation: ["workflow", "persistent_memory", "knowledge", "context"],
  work_center: ["workflow", "relationship", "persistent_memory", "context", "knowledge"],
  current_jobs: ["workflow", "relationship", "persistent_memory", "context", "knowledge"],
  schedule: ["workflow", "persistent_memory", "context", "knowledge"],
  active_work: ["workflow", "persistent_memory", "context", "knowledge"],
  completion: ["workflow", "relationship", "persistent_memory", "context", "knowledge"],
  closure: ["workflow", "relationship", "persistent_memory", "context", "knowledge"],
  job_history: ["workflow", "relationship", "persistent_memory", "context", "knowledge"],
  messages: ["relationship", "memory", "persistent_memory", "context"],
  customer_relationships: ["relationship", "workflow", "persistent_memory", "context"],
  hiring: ["relationship", "memory", "context"],
  community_relationship: ["community", "relationship", "context"],
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
