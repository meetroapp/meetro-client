import { buildCompanionCapabilities } from "../capability/companionCapabilityEngine.js";
import { buildCompanionCommunityIntelligence } from "../community/companionCommunityEngine.js";
import { buildCompanionContextEngine } from "../context/companionContextEngine.js";
import { buildCompanionKnowledge } from "../knowledge/companionKnowledgeEngine.js";
import {
  getSafeRecentCompanionMemory,
  resolveCompanionSessionMemory,
} from "../memory/companionSessionMemory.js";
import { buildCompanionRelationship } from "../relationship/companionRelationshipEngine.js";
import { buildCompanionWorkflow } from "../workflow/companionWorkflowEngine.js";
import { createEngineContextResult } from "./orchestrationContracts.js";

function engine(id, priority, collectContext, options = {}) {
  return {
    id,
    priority,
    enabled: options.enabled !== false,
    required: options.required === true,
    supports: options.supports || (() => true),
    collectContext,
  };
}

export function createDefaultOrchestrationEngines() {
  return [
    engine("context", 10, async (request) => {
      const data = await buildCompanionContextEngine({
        body: request.body,
        user: request.user,
        backendContext: request.backendContext,
        repositories: request.repositories,
      });
      return createEngineContextResult({ section: "context", priority: 10, data });
    }, { required: true }),
    engine("memory", 20, async (request) => {
      const session = await resolveCompanionSessionMemory({
        memoryRepository: request.memoryRepository,
        body: request.body,
        user: request.user,
      });
      const data = await getSafeRecentCompanionMemory({
        memoryRepository: request.memoryRepository,
        sessionId: session.sessionId,
        user: request.user,
      });
      return createEngineContextResult({
        section: "memory",
        priority: 20,
        data,
        metadata: { companionSessionId: session.sessionId },
      });
    }),
    engine("knowledge", 30, async (request, collected) => {
      const result = buildCompanionKnowledge({
        userMessage: request.message,
        intent: request.intent,
        context: collected.context || {},
      });
      return createEngineContextResult({
        section: "knowledge",
        priority: 30,
        data: result.packet,
        metadata: result.diagnostics,
      });
    }),
    engine("capability", 40, async (request, collected) => createEngineContextResult({
      section: "capabilities",
      priority: 40,
      data: buildCompanionCapabilities({
        userMessage: request.message,
        intent: request.intent,
        context: collected.context || {},
        knowledge: collected.knowledge || {},
      }),
    })),
    engine("workflow", 50, async (request, collected) => createEngineContextResult({
      section: "workflow",
      priority: 50,
      data: buildCompanionWorkflow({
        user: request.user,
        intent: request.intent,
        context: collected.context || {},
        knowledge: collected.knowledge || {},
        capabilities: collected.capabilities || {},
      }),
    })),
    engine("relationship", 60, async (request, collected) => createEngineContextResult({
      section: "relationship",
      priority: 60,
      data: buildCompanionRelationship({
        user: request.user,
        intent: request.intent,
        context: collected.context || {},
        workflow: collected.workflow || {},
        knowledge: collected.knowledge || {},
        memory: collected.memory || [],
      }),
    })),
    engine("community", 70, async (request, collected) => {
      const result = buildCompanionCommunityIntelligence({
        intent: request.intent,
        userMessage: request.message,
        capabilities: collected.capabilities || {},
        workflow: collected.workflow || {},
        relationship: collected.relationship || {},
        source: request.source,
      });
      return createEngineContextResult({ section: "community", priority: 70, data: result.data, metadata: result.diagnostics });
    }),
    engine("business", 80, async () => createEngineContextResult({ section: "business", priority: 80, data: {} })),
    engine("contracts", 90, async () => createEngineContextResult({ section: "contracts", priority: 90, data: {} })),
  ];
}
