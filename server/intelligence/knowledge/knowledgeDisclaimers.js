const DOMAIN_CODES = Object.freeze({
  legal: "not_legal_advice", terms: "not_legal_advice", privacy: "not_legal_advice",
  permits: "verify_local_permit_requirements", emergency: "verify_emergency_conditions",
  inspection: "professional_inspection_recommended", safety: "professional_inspection_recommended",
  payments: "not_financial_advice", business_operations: "not_financial_advice",
});

export function buildKnowledgeDisclaimers({ domain, status, conflicts = [], freshness = "unknown" } = {}) {
  return [...new Set([
    DOMAIN_CODES[domain],
    conflicts.length ? "source_conflict_present" : null,
    freshness === "stale" ? "stale_source_warning" : null,
    status === "insufficient_evidence" ? "insufficient_verified_knowledge" : null,
  ].filter(Boolean))];
}

