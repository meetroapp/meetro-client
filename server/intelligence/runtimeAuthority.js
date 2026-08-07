export const FRONTEND_INTELLIGENCE_RUNTIME_AUTHORITY = Object.freeze({
  status: "compatibility_reference_only",
  canonicalRepository: "meetro-server",
  canonicalModule: "server/intelligence",
  canonicalRoute: "POST /api/companion/ask",
  frontendRouteRegistrationEnabled: false,
  removalMilestone: "post-backend-operation-migration",
});

export function createFrontendIntelligenceRuntimeRetiredError() {
  return Object.assign(
    new Error(
      "Frontend Intelligence server execution is retired; use the canonical backend Gateway."
    ),
    { code: "FRONTEND_INTELLIGENCE_RUNTIME_RETIRED" }
  );
}
