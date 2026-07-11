const DEFAULT_ENGINES = ["capability", "context", "knowledge"];

const CAPABILITY_FEATURES = new Set([
  "ask_meetro", "product_help", "help", "product_navigation", "workflow_explanation", "emergency",
  "quote_builder", "conversation", "community", "discover", "meetro_moments", "spotlight", "wonder_pass",
  "business_intelligence", "business_dashboard", "business_tools", "evaluation", "work_center", "current_jobs",
  "schedule", "active_work", "completion", "closure", "job_history", "messages", "customer_relationships",
  "business_profile", "hiring", "invoices", "invoice_builder", "documentation", "document_guidance", "onboarding",
]);

const FEATURE_ENGINES = Object.freeze({
  emergency: ["workflow", "relationship", "persistent_memory", "knowledge", "context"],
  product_help: ["knowledge", "context"],
  help: ["knowledge", "context"],
  workflow_explanation: ["workflow", "knowledge", "context"],
  quote_builder: ["workflow", "relationship", "persistent_memory", "business", "contracts", "knowledge", "context"],
  conversation: ["relationship", "memory", "persistent_memory", "workflow", "context"],
  community: ["community", "relationship", "persistent_memory", "business", "knowledge", "context"],
  discover: ["community", "relationship", "persistent_memory", "business", "knowledge", "context"],
  meetro_moments: ["community", "relationship", "persistent_memory", "knowledge", "context"],
  spotlight: ["community", "relationship", "knowledge", "context"],
  wonder_pass: ["community", "knowledge", "context"],
  local_services: ["community", "business", "context"],
  community_profile: ["community", "relationship", "context"],
  community_service_discovery: ["community", "relationship", "business", "context"],
  ask_meetro: ["capability", "context", "knowledge", "workflow", "relationship", "memory", "persistent_memory", "business", "community"],
  business_intelligence: ["business", "workflow", "relationship", "persistent_memory", "knowledge", "context"],
  business_dashboard: ["business", "workflow", "relationship", "persistent_memory", "knowledge", "context"],
  revenue: ["business", "workflow", "persistent_memory", "context"],
  evaluation: ["workflow", "persistent_memory", "business", "knowledge", "context"],
  work_center: ["workflow", "relationship", "persistent_memory", "business", "context", "knowledge"],
  current_jobs: ["workflow", "relationship", "persistent_memory", "business", "context", "knowledge"],
  schedule: ["workflow", "persistent_memory", "business", "context", "knowledge"],
  active_work: ["workflow", "persistent_memory", "business", "context", "knowledge"],
  completion: ["workflow", "relationship", "persistent_memory", "business", "context", "knowledge"],
  closure: ["workflow", "relationship", "persistent_memory", "business", "context", "knowledge"],
  job_history: ["workflow", "relationship", "persistent_memory", "business", "context", "knowledge"],
  messages: ["relationship", "memory", "persistent_memory", "context"],
  customer_relationships: ["relationship", "workflow", "persistent_memory", "business", "context"],
  business_profile: ["business", "persistent_memory", "knowledge", "context"],
  hiring: ["relationship", "memory", "knowledge", "context"],
  invoices: ["business", "workflow", "knowledge", "context"],
  payments: ["business", "workflow", "knowledge", "context"],
  documentation: ["workflow", "knowledge", "context"],
  document_guidance: ["workflow", "knowledge", "context"],
  permits: ["workflow", "knowledge", "context"],
  permit_center: ["workflow", "knowledge", "context"],
  inspection: ["workflow", "knowledge", "context"],
  inspections: ["workflow", "knowledge", "context"],
  compliance: ["workflow", "knowledge", "context"],
  privacy: ["knowledge", "context"],
  terms: ["knowledge", "context"],
  legal: ["knowledge", "context"],
  community_relationship: ["community", "relationship", "persistent_memory", "context"],
});

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function selectEngineIds(request = {}, registry) {
  const feature = normalize(request.feature);
  const capability = normalize(request.capability);
  const source = normalize(request.source?.page || request.source?.surface);
  const mapped = FEATURE_ENGINES[feature] || FEATURE_ENGINES[capability] || FEATURE_ENGINES[source];
  const ids = [...new Set([...(CAPABILITY_FEATURES.has(feature) ? ["capability"] : []), ...(mapped || DEFAULT_ENGINES)])];
  const selected = ids
    .map((id) => registry.get(id))
    .filter((engine) => engine && engine.enabled !== false && engine.supports(request) !== false)
    .sort((left, right) => left.priority - right.priority)
    .map((engine) => engine.id);
  if (selected.some((id) => !["context", "memory"].includes(id)) && registry.get("validation")) selected.push("validation");
  return [...new Set(selected)];
}

export { DEFAULT_ENGINES, FEATURE_ENGINES };
