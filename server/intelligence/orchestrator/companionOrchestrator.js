import { appendCompanionSessionMemory, defaultCompanionSessionMemory } from "../memory/companionSessionMemory.js";
import { invokeProvider } from "../providerAdapter.js";
import { getCompanionSystemPrompt } from "../prompts/companionSystemPrompt.js";
import { createDefaultOrchestrationEngines } from "./defaultEngines.js";
import { createEngineRegistry } from "./engineRegistry.js";
import { selectEngineIds } from "./engineSelector.js";
import { normalizeOrchestrationRequest, createOrchestrationError } from "./orchestrationContracts.js";
import { createOrchestrationLogger } from "./orchestrationLogger.js";
import { buildUnifiedContext } from "./unifiedContextBuilder.js";

const ENGINE_STAGES = [
  ["context", "memory"],
  ["workflow"],
  ["relationship"],
  ["persistent_memory"],
  ["business"],
  ["community", "contracts"],
  ["knowledge"],
  ["capability"],
  ["validation"],
  ["decision"],
  ["recommendation"],
];

function getRequestId(context = {}, fallback = "companion-request") {
  return context?.workflow?.activeRequestId || context?.workflow?.activeProjectId || context?.workflow?.conversationId || fallback;
}

function buildProviderMessages(request, unifiedContext) {
  return [
    { role: "system", content: getCompanionSystemPrompt(unifiedContext.context?.language || "en") },
    {
      role: "user",
      content: JSON.stringify({
        question: request.message,
        intent: request.intent,
        unifiedContext,
        context: unifiedContext.context || {},
        memory: unifiedContext.memory || [],
        knowledge: unifiedContext.knowledge || {},
        capabilities: unifiedContext.capabilities || {},
        workflow: unifiedContext.workflow || {},
        relationship: unifiedContext.relationship || {},
        validation: unifiedContext.validation || {},
        decision: unifiedContext.decision || {},
        recommendation: unifiedContext.recommendation || {},
        ...unifiedContext,
      }),
    },
  ];
}

async function runSelectedEngines({ request, registry, selectedIds, logger, diagnostics }) {
  const outputs = [];
  const collected = {};

  for (const stage of ENGINE_STAGES) {
    const engines = stage.filter((id) => selectedIds.includes(id)).map((id) => registry.get(id));
    if (!engines.length) continue;

    const settled = await Promise.allSettled(
      engines.map(async (engine) => {
        const startedAt = Date.now();
        const result = await engine.collectContext(request, Object.freeze({ ...collected }));
        logger.info("intelligence.engine.completed", {
          requestId: request.requestId,
          engine: engine.id,
          elapsedMs: Date.now() - startedAt,
        });
        return { engine, result };
      })
    );

    settled.forEach((entry, index) => {
      const engine = engines[index];
      if (entry.status === "rejected") {
        diagnostics.failedEngines.push(engine.id);
        logger.warn("intelligence.engine.failed", {
          requestId: request.requestId,
          engine: engine.id,
          required: engine.required,
          errorCode: entry.reason?.code || "engine_failure",
        });
        if (engine.required) {
          throw createOrchestrationError(
            entry.reason?.code || "required_engine_failure",
            "A required intelligence engine could not complete safely."
          );
        }
        return;
      }

      const result = entry.value.result;
      if (!result?.section) {
        if (engine.required) throw createOrchestrationError("required_engine_failure");
        return;
      }
      outputs.push(result);
      collected[result.section] = result.data;
      diagnostics.successfulEngines.push(engine.id);
      if (result.metadata?.companionSessionId) diagnostics.companionSessionId = result.metadata.companionSessionId;
    });
  }

  return outputs;
}

export async function orchestrateCompanionAsk({
  body = {},
  user = {},
  requestId = "companion-request",
  intent = "reasoning",
  providerName = "openai",
  providers,
  timeoutMs,
  logger = console,
  backendContext = {},
  repositories = {},
  memoryRepository = defaultCompanionSessionMemory,
  persistentMemoryRepository,
  engineRegistry,
  onDiagnostics,
} = {}) {
  const startedAt = Date.now();
  const log = createOrchestrationLogger(logger);
  const request = {
    ...normalizeOrchestrationRequest({
      body,
      user,
      requestId,
      backendContext,
      repositories,
      memoryRepository,
      persistentMemoryRepository,
    }),
    intent,
  };
  const registry = engineRegistry || createEngineRegistry(createDefaultOrchestrationEngines());
  const selectedEngines = selectEngineIds(request, registry);
  const diagnostics = {
    requestId,
    intent,
    success: false,
    selectedEngines,
    successfulEngines: [],
    failedEngines: [],
    providerCalled: false,
    companionSessionId: "",
    contextBuilt: false,
    memoryRead: false,
    memoryWritten: false,
  };

  log.info("intelligence.orchestration.started", { requestId, feature: request.feature, capability: request.capability });
  log.info("intelligence.engines.selected", { requestId, selectedEngines });

  try {
    const engineResults = await runSelectedEngines({ request, registry, selectedIds: selectedEngines, logger: log, diagnostics });
    const unified = buildUnifiedContext(engineResults);
    diagnostics.contextBuilt = Boolean(unified.context.context);
    diagnostics.memoryRead = selectedEngines.includes("memory") && !diagnostics.failedEngines.includes("memory");
    const resolvedRequestId = getRequestId(unified.context.context, requestId);
    diagnostics.requestId = resolvedRequestId;
    log.info("intelligence.context.built", {
      requestId: resolvedRequestId,
      sections: unified.metadata.sections,
      truncated: unified.metadata.truncated,
      byteLength: unified.metadata.byteLength,
    });

    diagnostics.providerCalled = true;
    const providerResult = await invokeProvider({
      providerName,
      providers,
      messages: buildProviderMessages(request, unified.context),
      timeoutMs,
    });

    const response = {
      answer: providerResult.answer,
      requestId: resolvedRequestId,
      intent,
      ...(diagnostics.companionSessionId ? { companionSessionId: diagnostics.companionSessionId } : {}),
      success: true,
    };

    if (diagnostics.companionSessionId) {
      try {
        await appendCompanionSessionMemory({
          memoryRepository,
          sessionId: diagnostics.companionSessionId,
          user,
          context: unified.context.context || {},
          userMessage: request.message,
          assistantAnswer: response.answer,
          intent,
          status: "success",
        });
        diagnostics.memoryWritten = true;
      } catch {
        // Memory continuity is optional and cannot invalidate a provider response.
      }
    }

    diagnostics.success = true;
    log.info("intelligence.orchestration.completed", {
      requestId: resolvedRequestId,
      feature: request.feature,
      capability: request.capability,
      selectedEngines,
      successfulEngines: diagnostics.successfulEngines,
      failedEngines: diagnostics.failedEngines,
      provider: providerResult.provider || providerName,
      success: true,
      elapsedMs: Date.now() - startedAt,
    });
    onDiagnostics?.({ ...diagnostics });
    return response;
  } catch (error) {
    diagnostics.errorCode = error?.code || "provider_failure";
    log.warn("intelligence.orchestration.failed", {
      requestId: diagnostics.requestId,
      feature: request.feature,
      capability: request.capability,
      selectedEngines,
      successfulEngines: diagnostics.successfulEngines,
      failedEngines: diagnostics.failedEngines,
      providerCalled: diagnostics.providerCalled,
      errorCode: diagnostics.errorCode,
      success: false,
      elapsedMs: Date.now() - startedAt,
    });
    if (diagnostics.companionSessionId) {
      try {
        await appendCompanionSessionMemory({
          memoryRepository,
          sessionId: diagnostics.companionSessionId,
          user,
          context: {},
          userMessage: request.message,
          assistantAnswer: "",
          intent,
          status: "error",
          errorCode: diagnostics.errorCode,
        });
        diagnostics.memoryWritten = true;
      } catch {
        // Failure memory is best effort and remains user-scoped.
      }
    }
    onDiagnostics?.({ ...diagnostics });
    throw error;
  }
}
