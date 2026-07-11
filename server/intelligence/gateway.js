import { classifyCompanionIntent } from "./intentEngine.js";
import { orchestrateCompanionAsk } from "./orchestrator/companionOrchestrator.js";

function hasAuthenticatedUser(user = {}) {
  return Boolean(user?.id || user?.userId || user?.email);
}

export function validateCredits() {
  return { ok: true, remaining: null, stub: true };
}

export function validateUsageLimit() {
  return { ok: true, remaining: null, stub: true };
}

export function recordCompanionUsage() {
  return { ok: true, stub: true };
}

export function validateMembership({ user = {} } = {}) {
  return user.membershipStatus && user.membershipStatus !== "active"
    ? { ok: false, code: "membership_inactive" }
    : { ok: true };
}

export function validatePermissions({ user = {} } = {}) {
  return hasAuthenticatedUser(user)
    ? { ok: true }
    : { ok: false, code: "missing_authentication" };
}

export function normalizeCompanionError(error, intent = "reasoning") {
  const code = error?.code || "provider_failure";
  const messages = {
    invalid_request: "Ask Meetro needs a question before it can help.",
    missing_authentication: "Please sign in to ask Meetro.",
    membership_inactive: "Your Meetro membership must be active to ask Meetro.",
    usage_limit_reached: "Ask Meetro is available again after your current usage window resets.",
    required_engine_failure: "Ask Meetro could not safely prepare the information needed for that request.",
    provider_timeout: "Ask Meetro is taking longer than expected. Please try again.",
    provider_unavailable: "Ask Meetro is unavailable right now. Please try again soon.",
    provider_authentication_failed: "Ask Meetro is unavailable right now. Please try again soon.",
    provider_failure: "Ask Meetro could not complete that request right now.",
  };
  const message = messages[code] || messages.provider_failure;
  return { answer: message, intent, success: false, errorCode: code, error: { code, message } };
}

async function safeRecordUsage(recordUsage, event, diagnostics) {
  try {
    await recordUsage(event);
    diagnostics.usageRecorded = true;
  } catch {
    // Metering failures remain internal and do not expose infrastructure details.
  }
}

function safeQuestion(body = {}) {
  return String(body.question || body.prompt || body.message || "").trim();
}

export async function askCompanionGateway(options = {}) {
  const {
    body = {},
    user = {},
    usageMeter = {},
    validateUsageLimit: validateUsageLimitOverride,
    recordUsage: recordUsageOverride,
    onDiagnostics,
  } = options;
  const question = safeQuestion(body);
  const intent = question ? classifyCompanionIntent(question) : "reasoning";
  const checkUsageLimit = validateUsageLimitOverride || usageMeter.validateUsageLimit || validateUsageLimit;
  const recordUsage = recordUsageOverride || usageMeter.recordUsage || recordCompanionUsage;
  const diagnostics = {
    requestId: "companion-request",
    intent,
    usageRecorded: false,
    providerCalled: false,
    contextBuilt: false,
    memoryRead: false,
    memoryWritten: false,
  };

  const checks = [
    !question ? { ok: false, code: "invalid_request" } : { ok: true },
    validatePermissions({ user, body }),
  ];

  for (const check of checks) {
    if (!check.ok) {
      const response = { ...normalizeCompanionError({ code: check.code }, intent), requestId: diagnostics.requestId };
      await safeRecordUsage(recordUsage, {
        userId: user?.id || user?.userId || "",
        requestId: diagnostics.requestId,
        intent,
        success: false,
        blocked: true,
        errorCode: response.errorCode,
      }, diagnostics);
      onDiagnostics?.({ ...diagnostics, errorCode: response.errorCode });
      return response;
    }
  }

  const usage = await checkUsageLimit({ user, body });
  const membership = validateMembership({ user, body });
  const credits = validateCredits({ user, body, intent });
  const blocked = !usage.ok ? usage : !membership.ok ? membership : !credits.ok ? credits : null;
  if (blocked) {
    const response = {
      ...normalizeCompanionError({ code: blocked.code || "usage_limit_reached" }, intent),
      requestId: diagnostics.requestId,
    };
    await safeRecordUsage(recordUsage, {
      userId: user?.id || user?.userId || "",
      requestId: diagnostics.requestId,
      intent,
      success: false,
      blocked: true,
      errorCode: response.errorCode,
    }, diagnostics);
    onDiagnostics?.({ ...diagnostics, errorCode: response.errorCode });
    return response;
  }

  try {
    const result = await orchestrateCompanionAsk({
      ...options,
      intent,
      onDiagnostics(orchestrationDiagnostics) {
        Object.assign(diagnostics, orchestrationDiagnostics);
      },
    });
    diagnostics.requestId = result.requestId;
    await safeRecordUsage(recordUsage, {
      userId: user?.id || user?.userId || "",
      requestId: result.requestId,
      companionSessionId: result.companionSessionId || "",
      intent,
      success: true,
      blocked: false,
    }, diagnostics);
    onDiagnostics?.({ ...diagnostics });
    return result;
  } catch (error) {
    const response = {
      ...normalizeCompanionError(error, intent),
      requestId: diagnostics.requestId,
      ...(diagnostics.companionSessionId ? { companionSessionId: diagnostics.companionSessionId } : {}),
    };
    await safeRecordUsage(recordUsage, {
      userId: user?.id || user?.userId || "",
      requestId: response.requestId,
      companionSessionId: response.companionSessionId || "",
      intent,
      success: false,
      blocked: false,
      errorCode: response.errorCode,
    }, diagnostics);
    onDiagnostics?.({ ...diagnostics, errorCode: response.errorCode });
    return response;
  }
}
