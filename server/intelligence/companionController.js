import {
  createFrontendIntelligenceRuntimeRetiredError,
} from "./runtimeAuthority.js";

export async function handleCompanionAsk() {
  throw createFrontendIntelligenceRuntimeRetiredError();
}
