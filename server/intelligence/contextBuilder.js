import { buildCompanionContextEngine } from "./context/companionContextEngine.js";

export function buildCompanionContext(options = {}) {
  return buildCompanionContextEngine(options);
}
