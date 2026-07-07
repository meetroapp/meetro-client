import { createOpenAIProvider } from "./providers/openaiProvider.js";

function withTimeout(promise, timeoutMs) {
  if (!timeoutMs) return promise;

  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        Object.assign(new Error("Intelligence provider timed out"), {
          code: "provider_timeout",
        })
      );
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeout,
  ]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export function createProviderRegistry(overrides = {}) {
  return {
    openai: createOpenAIProvider(),
    ...overrides,
  };
}

export async function invokeProvider({
  providerName = "openai",
  providers,
  messages,
  timeoutMs = 12000,
} = {}) {
  const registry = providers || createProviderRegistry();
  const provider = registry[providerName];

  if (!provider || typeof provider.complete !== "function") {
    throw Object.assign(new Error(`Unknown intelligence provider: ${providerName}`), {
      code: "provider_unavailable",
    });
  }

  const result = await withTimeout(provider.complete({ messages }), timeoutMs);

  return {
    provider: provider.name || providerName,
    answer: result?.answer || "",
    raw: result?.raw,
  };
}
