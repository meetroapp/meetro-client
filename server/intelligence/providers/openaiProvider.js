import OpenAI from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

function normalizeOpenAIError(error) {
  const status = error?.status || error?.response?.status;
  const code =
    status === 401 || status === 403
      ? "provider_authentication_failed"
      : "provider_failure";

  return Object.assign(new Error("OpenAI provider request failed"), {
    code,
    status,
  });
}

function getResponseText(response = {}) {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const output = Array.isArray(response.output) ? response.output : [];
  return output
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .map((content) => content.text || content.output_text || "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

function splitMessages(messages = []) {
  const systemMessage = messages.find((message) => message?.role === "system");
  const userMessages = messages.filter((message) => message?.role !== "system");

  return {
    instructions: String(systemMessage?.content || ""),
    input: userMessages
      .map((message) => String(message?.content || ""))
      .filter(Boolean)
      .join("\n\n"),
  };
}

export function createOpenAIProvider({
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
  client,
} = {}) {
  return {
    name: "openai",
    async complete({ messages = [] } = {}) {
      if (!apiKey) {
        throw Object.assign(new Error("OpenAI API key is not configured"), {
          code: "provider_unavailable",
        });
      }

      const openai = client || new OpenAI({ apiKey });
      const { instructions, input } = splitMessages(messages);

      try {
        const response = await openai.responses.create({
          model,
          instructions,
          input,
          temperature: 0.2,
        });

        return {
          answer: getResponseText(response),
          raw: response,
        };
      } catch (error) {
        throw normalizeOpenAIError(error);
      }
    },
  };
}

export const openaiProvider = createOpenAIProvider;

