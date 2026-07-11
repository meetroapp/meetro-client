const DEFAULT_ENGINES = ["capability", "context", "knowledge"];

const FEATURE_ENGINES = Object.freeze({
  emergency: ["workflow", "relationship", "knowledge", "context"],
  quote_builder: ["workflow", "relationship", "business", "contracts", "context"],
  conversation: ["relationship", "memory", "workflow", "context"],
  community: ["community", "context"],
  ask_meetro: ["capability", "context", "knowledge", "workflow", "relationship", "memory"],
  business_intelligence: ["business", "workflow", "relationship", "context"],
  evaluation: ["workflow", "knowledge", "context"],
  work_center: ["workflow", "relationship", "context", "knowledge"],
  current_jobs: ["workflow", "relationship", "context", "knowledge"],
  schedule: ["workflow", "context", "knowledge"],
  active_work: ["workflow", "context", "knowledge"],
  completion: ["workflow", "relationship", "context", "knowledge"],
  closure: ["workflow", "relationship", "context", "knowledge"],
  job_history: ["workflow", "relationship", "context", "knowledge"],
  messages: ["relationship", "memory", "context"],
  customer_relationships: ["relationship", "workflow", "context"],
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
