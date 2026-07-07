import {
  normalizeCompanionError,
  orchestrateCompanionAsk,
  recordCompanionUsage,
  validateCredits,
  validateMembership,
  validatePermissions,
  validateUsageLimit,
} from "./orchestrator/companionOrchestrator.js";

export {
  recordCompanionUsage,
  validateCredits,
  validateMembership,
  validatePermissions,
  validateUsageLimit,
};

export async function askCompanionGateway(options = {}) {
  try {
    return await orchestrateCompanionAsk(options);
  } catch (error) {
    return {
      ...normalizeCompanionError(error, "reasoning"),
      requestId: "companion-request",
    };
  }
}
