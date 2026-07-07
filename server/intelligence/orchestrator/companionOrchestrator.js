import { buildCompanionCapabilities } from "../capability/companionCapabilityEngine.js";
import { buildCompanionContextEngine } from "../context/companionContextEngine.js";
import { classifyCompanionIntent } from "../intentEngine.js";
import { buildCompanionKnowledge } from "../knowledge/companionKnowledgeEngine.js";
import {
  appendCompanionSessionMemory,
  defaultCompanionSessionMemory,
  getSafeRecentCompanionMemory,
  resolveCompanionSessionMemory,
} from "../memory/companionSessionMemory.js";
import { invokeProvider } from "../providerAdapter.js";
import { getCompanionSystemPrompt } from "../prompts/companionSystemPrompt.js";
import { buildCompanionRelationship } from "../relationship/companionRelationshipEngine.js";
import { buildCompanionWorkflow } from "../workflow/companionWorkflowEngine.js";

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

export function normalizeCompanionError(error, intent = "reasoning") {
  const code = error?.code || "provider_failure";
  const messages = {
    invalid_request: "Ask Meetro needs a question before it can help.",
    missing_authentication: "Please sign in to ask Meetro.",
    membership_inactive: "Your Meetro membership must be active to ask Meetro.",
    usage_limit_reached: "Ask Meetro is available again after your current usage window resets.",
    provider_timeout: "Ask Meetro is taking longer than expected. Please try again.",
    provider_unavailable: "Ask Meetro is unavailable right now. Please try again soon.",
    provider_authentication_failed: "Ask Meetro is unavailable right now. Please try again soon.",
    provider_failure: "Ask Meetro could not complete that request right now.",
  };

  return {
    answer: messages[code] || messages.provider_failure,
    intent,
    success: false,
    errorCode: code,
    error: {
      code,
      message: messages[code] || messages.provider_failure,
    },
  };
}

function getSafeRequestId(context = {}) {
  return (
    context?.workflow?.activeRequestId ||
    context?.workflow?.activeProjectId ||
    context?.workflow?.conversationId ||
    "companion-request"
  );
}

function logGatewayEvent(logger, event = {}) {
  if (!logger || typeof logger.info !== "function") return;

  const level = event.success ? "info" : "warn";
  const log =
    typeof logger[level] === "function"
      ? logger[level].bind(logger)
      : logger.info.bind(logger);
  log("meetro_intelligence_gateway", event);
}

function buildProviderMessages({
  question,
  context,
  memory = [],
  knowledge = {},
  capabilities = {},
  workflow = {},
  relationship = {},
  language,
  intent,
}) {
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
        memory,
        knowledge,
        capabilities,
        workflow,
        relationship,
      }),
    },
  ];
}

async function safeRecordUsage(recordUsage, event = {}, diagnostics) {
  try {
    await recordUsage(event);
    diagnostics.usageRecorded = true;
  } catch {
    // Usage recording must not leak errors into the user-facing Companion path.
  }
}

async function safeAppendMemory(options = {}, diagnostics) {
  try {
    await appendCompanionSessionMemory(options);
    diagnostics.memoryWritten = true;
  } catch {
    // Session continuity must never break the Companion response path.
  }
}

function publishDiagnostics(onDiagnostics, diagnostics = {}) {
  if (typeof onDiagnostics === "function") {
    onDiagnostics({ ...diagnostics });
  }
}

function blockedResponse({ code, intent, requestId, recordUsage, user, diagnostics, companionSessionId = "" }) {
  const response = {
    ...normalizeCompanionError({ code }, intent),
    requestId,
    ...(companionSessionId ? { companionSessionId } : {}),
  };

  return safeRecordUsage(
    recordUsage,
    {
      userId: user?.id || user?.userId || "",
      requestId,
      companionSessionId,
      intent,
      success: false,
      blocked: true,
      errorCode: response.errorCode,
    },
    diagnostics
  ).then(() => response);
}

export async function orchestrateCompanionAsk({
  body = {},
  user = {},
  providerName = "openai",
  providers,
  timeoutMs,
  logger = console,
  backendContext = {},
  repositories = {},
  memoryRepository = defaultCompanionSessionMemory,
  usageMeter = {},
  validateUsageLimit: validateUsageLimitOverride,
  recordUsage: recordUsageOverride,
  onDiagnostics,
} = {}) {
  const startedAt = Date.now();
  const question = String(body.question || body.prompt || body.message || "").trim();
  const checkUsageLimit =
    validateUsageLimitOverride ||
    usageMeter.validateUsageLimit ||
    validateUsageLimit;
  const recordUsage =
    recordUsageOverride ||
    usageMeter.recordUsage ||
    recordCompanionUsage;
  const diagnostics = {
    requestId: "companion-request",
    intent: "reasoning",
    success: false,
    errorCode: "",
    contextBuilt: false,
    memoryRead: false,
    memoryWritten: false,
    knowledgeBuilt: false,
    knowledgeItemCount: 0,
    knowledgeCategories: [],
    capabilityBuilt: false,
    primaryCapabilityCount: 0,
    supportingCapabilityCount: 0,
    capabilityConfidence: 0,
    workflowBuilt: false,
    currentStage: "",
    guidanceCategory: "",
    missingPrerequisiteCount: 0,
    workflowConfidence: 0,
    relationshipBuilt: false,
    relationshipType: "",
    communicationPosture: "",
    trustBoundary: "",
    relationshipConfidence: 0,
    usageRecorded: false,
    providerCalled: false,
  };

  // Extension points for future intelligence modules:
  // Knowledge Engine, Capability Engine, Workflow Engine, Relationship Engine,
  // Business Intelligence Engine, and Community Intelligence Engine.

  let context = null;
  let intent = "reasoning";
  let requestId = "companion-request";
  let companionSessionId = "";

  try {
    if (!question) {
      const response = await blockedResponse({
        code: "invalid_request",
        intent,
        requestId,
        recordUsage,
        user,
        diagnostics,
      });
      diagnostics.errorCode = response.errorCode;
      publishDiagnostics(onDiagnostics, diagnostics);
      return response;
    }

    const permission = validatePermissions({ user, body });
    if (!permission.ok) {
      const response = await blockedResponse({
        code: permission.code,
        intent,
        requestId,
        recordUsage,
        user,
        diagnostics,
      });
      diagnostics.errorCode = response.errorCode;
      publishDiagnostics(onDiagnostics, diagnostics);
      return response;
    }

    const usageLimit = await checkUsageLimit({ user, body });
    if (!usageLimit.ok) {
      const response = await blockedResponse({
        code: usageLimit.code || "usage_limit_reached",
        intent,
        requestId,
        recordUsage,
        user,
        diagnostics,
      });
      diagnostics.errorCode = response.errorCode;
      publishDiagnostics(onDiagnostics, diagnostics);
      return response;
    }

    intent = classifyCompanionIntent(question);
    diagnostics.intent = intent;

    const membership = validateMembership({ user, body });
    if (!membership.ok) {
      const response = await blockedResponse({
        code: membership.code,
        intent,
        requestId,
        recordUsage,
        user,
        diagnostics,
      });
      diagnostics.errorCode = response.errorCode;
      publishDiagnostics(onDiagnostics, diagnostics);
      return response;
    }

    const credits = validateCredits({ user, body, intent });
    if (!credits.ok) {
      const response = await blockedResponse({
        code: credits.code,
        intent,
        requestId,
        recordUsage,
        user,
        diagnostics,
      });
      diagnostics.errorCode = response.errorCode;
      publishDiagnostics(onDiagnostics, diagnostics);
      return response;
    }

    context = await buildCompanionContextEngine({
      body,
      user,
      backendContext,
      repositories,
    });
    diagnostics.contextBuilt = true;
    requestId = getSafeRequestId(context);
    diagnostics.requestId = requestId;

    const session = await resolveCompanionSessionMemory({
      memoryRepository,
      body,
      user,
    });
    companionSessionId = session.sessionId;
    const memory = await getSafeRecentCompanionMemory({
      memoryRepository,
      sessionId: companionSessionId,
      user,
    });
    diagnostics.memoryRead = true;

    const knowledgeResult = buildCompanionKnowledge({
      userMessage: question,
      intent,
      context,
    });
    const knowledge = knowledgeResult.packet;
    diagnostics.knowledgeBuilt = true;
    diagnostics.knowledgeItemCount = knowledgeResult.diagnostics.knowledgeItemCount;
    diagnostics.knowledgeCategories = knowledgeResult.diagnostics.knowledgeCategories;

    const capabilities = buildCompanionCapabilities({
      userMessage: question,
      intent,
      context,
      knowledge,
    });
    diagnostics.capabilityBuilt = true;
    diagnostics.primaryCapabilityCount = capabilities.primaryCapabilities.length;
    diagnostics.supportingCapabilityCount = capabilities.supportingCapabilities.length;
    diagnostics.capabilityConfidence = capabilities.confidence;

    const workflow = buildCompanionWorkflow({
      user,
      intent,
      context,
      knowledge,
      capabilities,
    });
    diagnostics.workflowBuilt = true;
    diagnostics.currentStage = workflow.currentStage;
    diagnostics.guidanceCategory = workflow.guidanceCategory;
    diagnostics.missingPrerequisiteCount = workflow.missingPrerequisites.length;
    diagnostics.workflowConfidence = workflow.confidence;

    const relationship = buildCompanionRelationship({
      user,
      intent,
      context,
      workflow,
      knowledge,
      memory,
    });
    diagnostics.relationshipBuilt = true;
    diagnostics.relationshipType = relationship.relationshipType;
    diagnostics.communicationPosture = relationship.communicationPosture;
    diagnostics.trustBoundary = relationship.trustBoundary;
    diagnostics.relationshipConfidence = relationship.confidence;

    const messages = buildProviderMessages({
      question,
      context,
      memory,
      knowledge,
      capabilities,
      workflow,
      relationship,
      language: context.language || "en",
      intent,
    });

    diagnostics.providerCalled = true;
    const result = await invokeProvider({
      providerName,
      providers,
      messages,
      timeoutMs,
    });

    const response = {
      answer: result.answer,
      requestId,
      intent,
      companionSessionId,
      success: true,
    };
    diagnostics.success = true;
    logGatewayEvent(logger, {
      requestId,
      provider: result.provider || providerName,
      responseTimeMs: Date.now() - startedAt,
      success: true,
      intent,
    });
    await safeRecordUsage(
      recordUsage,
      {
        userId: user?.id || user?.userId || "",
        requestId,
        companionSessionId,
        intent,
        success: true,
        blocked: false,
      },
      diagnostics
    );
    await safeAppendMemory(
      {
        memoryRepository,
        sessionId: companionSessionId,
        user,
        context,
        userMessage: question,
        assistantAnswer: result.answer,
        intent,
        status: "success",
      },
      diagnostics
    );
    publishDiagnostics(onDiagnostics, diagnostics);
    return response;
  } catch (error) {
    const response = {
      ...normalizeCompanionError(error, intent),
      requestId,
      ...(companionSessionId ? { companionSessionId } : {}),
    };
    diagnostics.success = false;
    diagnostics.errorCode = response.errorCode;
    logGatewayEvent(logger, {
      requestId,
      provider: providerName,
      responseTimeMs: Date.now() - startedAt,
      success: false,
      intent,
      errorCode: response.error.code,
    });
    await safeRecordUsage(
      recordUsage,
      {
        userId: user?.id || user?.userId || "",
        requestId,
        companionSessionId,
        intent,
        success: false,
        blocked: false,
        errorCode: response.errorCode,
      },
      diagnostics
    );
    if (companionSessionId) {
      await safeAppendMemory(
        {
          memoryRepository,
          sessionId: companionSessionId,
          user,
          context: context || {},
          userMessage: question,
          assistantAnswer: response.answer,
          intent,
          status: "error",
          errorCode: response.errorCode,
        },
        diagnostics
      );
    }
    publishDiagnostics(onDiagnostics, diagnostics);
    return response;
  }
}
