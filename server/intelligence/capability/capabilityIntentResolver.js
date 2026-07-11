const FEATURE_DEFAULTS = Object.freeze({
  product_help: "product.explain", help: "product.troubleshoot", product_navigation: "product.navigate",
  work_center: "workflow.identify_next_action", current_jobs: "workflow.review_active_work",
  evaluation: "workflow.prepare_evaluation", quote_builder: "workflow.prepare_quote",
  schedule: "workflow.prepare_schedule", active_work: "workflow.review_active_work",
  completion: "workflow.prepare_completion", closure: "workflow.review_closure", job_history: "workflow.review_history",
  messages: "communication.prepare_reply", conversation: "communication.prepare_reply",
  customer_relationships: "relationship.review_follow_up", emergency: "emergency.explain_status",
  business_intelligence: "business.review_health", business_dashboard: "business.review_health", business_tools: "business.review_priorities",
  community: "community.review_activity", discover: "community.review_activity", meetro_moments: "community.review_moments",
  spotlight: "community.review_spotlight", wonder_pass: "community.review_wonder_pass",
  hiring: "hiring.review_candidate_context", onboarding: "onboarding.explain_next_step",
  professional_onboarding: "onboarding.explain_next_step", business_profile: "settings.review_business_configuration",
  invoice_builder: "document.prepare_invoice", invoices: "document.prepare_invoice", documentation: "document.prepare_summary",
});

const PHRASES = Object.freeze([
  [/(explain|what).*(quote|proposal)/, "workflow.review_proposal", "explain_proposal"],
  [/(prepare|create|draft|build).*(quote|proposal)/, "workflow.prepare_quote", "prepare_customer_proposal"],
  [/(review|explain|show).*(invoice)/, "document.review_invoice", "review_invoice"],
  [/(prepare|create|draft).*(invoice)/, "document.prepare_invoice", "prepare_invoice_draft"],
  [/(draft|prepare|write).*(reply|message|response)/, "communication.prepare_reply", "prepare_reply"],
  [/(send|post|publish|approve|record payment|close (the )?job|change (the )?schedule)/, null, "execution_not_available"],
  [/(what happens next|next step|what should.*next)/, "workflow.identify_next_action", "identify_next_action"],
  [/(blocker|blocked|waiting on)/, "workflow.review_blockers", "review_blockers"],
  [/(business health|business doing|business priorities)/, "business.review_health", "review_business_health"],
  [/(moment)/, "community.review_moments", "review_moments"],
  [/(spotlight)/, "community.review_spotlight", "review_spotlight"],
  [/(wonder pass)/, "community.review_wonder_pass", "review_wonder_pass"],
]);

function normalize(value = "") { return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_"); }

export function resolveCapabilityIntent(request = {}, registry) {
  const explicit = String(request.capability || "").trim();
  if (explicit) {
    const capability = registry.getCapabilityById(explicit);
    return capability
      ? { intentId: `select_${explicit.replace(".", "_")}`, category: capability.category, requestedOutcome: explicit, capabilityId: explicit, confidence: "high", ambiguity: [], source: "validated_capability", feature: normalize(request.feature) }
      : { intentId: "unsupported_capability", category: "unsupported", requestedOutcome: "unsupported", capabilityId: null, confidence: "high", ambiguity: [], source: "rejected_capability", feature: normalize(request.feature), reasonCode: "unsupported_capability_id" };
  }
  const message = String(request.message || "").toLowerCase();
  for (const [pattern, capabilityId, requestedOutcome] of PHRASES) {
    if (!pattern.test(message)) continue;
    return { intentId: requestedOutcome, category: capabilityId ? registry.getCapabilityById(capabilityId)?.category || "unsupported" : "unsupported", requestedOutcome, capabilityId, confidence: "high", ambiguity: [], source: "user_request", feature: normalize(request.feature), reasonCode: capabilityId ? null : "execution_layer_not_available" };
  }
  if (/\binvoice\b/.test(message)) {
    return {
      intentId: "choose_invoice_intent", category: "review", requestedOutcome: "clarify_invoice_intent",
      capabilityId: "document.review_invoice", confidence: "medium",
      ambiguity: ["document.review_invoice", "document.prepare_invoice"], source: "user_request",
      feature: normalize(request.feature),
    };
  }
  const requestedFeature = normalize(request.feature);
  const feature = requestedFeature === "ask_meetro"
    ? normalize(request.source?.page || request.source?.surface || requestedFeature)
    : normalize(requestedFeature || request.source?.page || request.source?.surface);
  const capabilityId = FEATURE_DEFAULTS[feature];
  if (capabilityId) return { intentId: `feature_${feature}`, category: registry.getCapabilityById(capabilityId)?.category || "unsupported", requestedOutcome: capabilityId, capabilityId, confidence: "medium", ambiguity: [], source: "product_surface", feature };
  return { intentId: "unknown", category: "unsupported", requestedOutcome: "unknown", capabilityId: null, confidence: "low", ambiguity: [], source: "unknown", feature, reasonCode: "unsupported_intent" };
}
