const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function getFetch(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    throw Object.assign(new Error("OpenAI provider requires fetch"), {
      code: "provider_unavailable",
    });
  }

  return fetchImpl;
}

export function createOpenAIProvider({
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
  fetchImpl = globalThis.fetch,
} = {}) {
  return {
    name: "openai",
    async complete({ messages = [] } = {}) {
      if (!apiKey) {
        throw Object.assign(new Error("OpenAI API key is not configured"), {
          code: "provider_unavailable",
        });
      }

      const fetchClient = getFetch(fetchImpl);
      const response = await fetchClient("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        throw Object.assign(new Error(`OpenAI provider failed with ${response.status}`), {
          code: "provider_failure",
          status: response.status,
        });
      }

      const data = await response.json();
      return {
        answer: data?.choices?.[0]?.message?.content || "",
        raw: data,
      };
    },
  };
}

export const openaiProvider = createOpenAIProvider;

