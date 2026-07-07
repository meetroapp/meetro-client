export { handleCompanionAsk } from "./companionController.js";
export { COMPANION_ASK_ROUTE, registerCompanionRoutes } from "./companionRoutes.js";
export { buildCompanionContext } from "./contextBuilder.js";
export {
  askCompanionGateway,
  validateCredits,
  validateMembership,
  validatePermissions,
} from "./gateway.js";
export { classifyCompanionIntent } from "./intentEngine.js";
export { invokeProvider } from "./providerAdapter.js";
export { getCompanionSystemPrompt } from "./prompts/companionSystemPrompt.js";
