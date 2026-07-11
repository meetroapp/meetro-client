export const KNOWLEDGE_DOMAINS = Object.freeze([
  "product", "workflow", "relationship", "business_operations", "community", "service",
  "evaluation", "emergency", "completion", "closure", "job_history", "documentation",
  "quotes", "invoices", "payments", "scheduling", "permits", "inspection", "compliance",
  "privacy", "terms", "safety", "onboarding", "hiring", "wonder_pass", "moments",
  "spotlight", "ask_meetro", "architecture",
]);

const FEATURE_DOMAINS = Object.freeze({
  ask_meetro: "ask_meetro", emergency: "emergency", evaluation: "evaluation",
  product_help: "product", help: "product", workflow_explanation: "workflow",
  quote_builder: "quotes", invoices: "invoices", payments: "payments", schedule: "scheduling",
  completion: "completion", closure: "closure", job_history: "job_history", hiring: "hiring",
  privacy: "privacy", terms: "terms", legal: "terms", permits: "permits", inspection: "inspection",
  compliance: "compliance", safety: "safety", documentation: "documentation", service: "service",
  document_guidance: "documentation", permit_center: "permits", inspections: "inspection",
  community: "community", discover: "community", meetro_moments: "moments", spotlight: "spotlight",
  wonder_pass: "wonder_pass", onboarding: "onboarding", business_intelligence: "business_operations",
  business_dashboard: "business_operations", work_center: "workflow", current_jobs: "workflow",
});

function normalize(value = "") {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function resolveKnowledgeDomain(request = {}) {
  const trusted = normalize(request.backendContext?.knowledgeDomain);
  if (KNOWLEDGE_DOMAINS.includes(trusted)) return trusted;
  const feature = normalize(request.feature);
  return FEATURE_DOMAINS[feature] || FEATURE_DOMAINS[normalize(request.source?.page)] || "unknown";
}

export function isSupportedKnowledgeDomain(domain = "") {
  return KNOWLEDGE_DOMAINS.includes(normalize(domain));
}
