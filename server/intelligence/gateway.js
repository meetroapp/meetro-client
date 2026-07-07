import { buildCompanionContext } from "./contextBuilder.js";
import { classifyCompanionIntent } from "./intentEngine.js";
import { invokeProvider } from "./providerAdapter.js";
import { getCompanionSystemPrompt } from "./prompts/companionSystemPrompt.js";

function hasAuthenticatedUser(user = {}) {
  return Boolean(user?.id || user?.userId || user?.email);
}

export function validateCredits() {
  return { ok: true, remaining: null, stub: true };
}

export function validateMembership({ user = {} } = {}) {
  if (user.membershipStatus && user.membershipStatus !== "active") {
    return { ok: false, code: "membership_inactive" };
  }

  return { ok: true };
}

export function validatePermissions({ user = {} } = {}) {
  if (!hasAuthenticatedUser(user)) {
    return { ok: false, code: "missing_authentication" };
  }

  return { ok: true };
}

function normalizeError(error, intent = "reasoning", provider = "openai") {
  const code = error?.code || "provider_failure";
  const messages = {
    invalid_request: "Ask Meetro needs a question before it can help.",
    missing_authentication: "Please sign in to ask Meetro.",
    membership_inactive: "Your Meetro membership must be active to ask Meetro.",
    provider_timeout: "Ask Meetro is taking longer than expected. Please try again.",
    provider_unavailable: "Ask Meetro is unavailable right now. Please try again soon.",
    provider_failure: "Ask Meetro could not complete that request right now.",
  };

  return {
    answer: messages[code] || messages.provider_failure,
    intent,
    provider,
    success: false,
    error: {
      code,
      message: messages[code] || messages.provider_failure,
    },
  };
}

function buildMessages({ question, context, language, intent }) {
  return [
    {
      role: "system",
      content: getCompanionSystemPrompt(language),
    },
    {
      role: "user",
      content: JSON.stringify({
        question,
        intent,
        context,
      }),
    },
  ];
}

export async function askCompanionGateway({
  body = {},
  user = {},
  providerName = "openai",
  providers,
  timeoutMs,
} = {}) {
  const question = String(body.question || body.prompt || body.message || "").trim();
  const intent = classifyCompanionIntent(question);

  if (!question) {
    return normalizeError({ code: "invalid_request" }, intent, providerName);
  }

  const permission = validatePermissions({ user, body });
  if (!permission.ok) return normalizeError({ code: permission.code }, intent, providerName);

  const membership = validateMembership({ user, body });
  if (!membership.ok) return normalizeError({ code: membership.code }, intent, providerName);

  const credits = validateCredits({ user, body, intent });
  if (!credits.ok) return normalizeError({ code: credits.code }, intent, providerName);

  const context = buildCompanionContext({ body, user });
  const messages = buildMessages({
    question,
    context,
    language: context.language || body.language || "en",
    intent,
  });

  try {
    const result = await invokeProvider({
      providerName,
      providers,
      messages,
      timeoutMs,
    });

    return {
      answer: result.answer,
      intent,
      provider: result.provider || providerName,
      success: true,
      context,
    };
  } catch (error) {
    return normalizeError(error, intent, providerName);
  }
}

