import { capabilityEngineSupports, collectCapabilityIntelligence } from "../capability/capabilityEngine.js";
import { collectCommunityIntelligence, communityEngineSupports } from "../community/communityEngine.js";
import { businessEngineSupports, collectBusinessIntelligence } from "../business/businessEngine.js";
import { buildCompanionContextEngine } from "../context/companionContextEngine.js";
import { collectKnowledgeIntelligence, knowledgeEngineSupports } from "../knowledge/knowledgeEngine.js";
import {
  getSafeRecentCompanionMemory,
  resolveCompanionSessionMemory,
} from "../memory/companionSessionMemory.js";
import {
  collectPersistentMemoryContext,
  persistentMemoryEngineSupports,
} from "../memory/persistentMemoryEngine.js";
import { collectRelationshipIntelligence, relationshipEngineSupports } from "../relationship/relationshipEngine.js";
import { collectWorkflowIntelligence, workflowEngineSupports } from "../workflow/workflowEngine.js";
import { collectIntelligenceValidation } from "../validation/validationEngine.js";
import { collectDecisionIntelligence } from "../decision/decisionEngine.js";
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
    engine("knowledge", 95, async (request) => createEngineContextResult({
      section: "knowledge",
      priority: 95,
      data: await collectKnowledgeIntelligence({ request }),
    }), { supports: knowledgeEngineSupports }),
    engine("capability", 100, async (request, collected) => createEngineContextResult({
      section: "capabilities",
      priority: 100,
      data: await collectCapabilityIntelligence({ request, collected }),
    }), { supports: capabilityEngineSupports }),
    engine("workflow", 50, async (request, collected) => createEngineContextResult({
      section: "workflow",
      priority: 50,
      data: await collectWorkflowIntelligence({
        request,
        context: collected.context || {},
      }),
    }), { supports: workflowEngineSupports }),
    engine("relationship", 60, async (request, collected) => createEngineContextResult({
      section: "relationship",
      priority: 60,
      data: await collectRelationshipIntelligence({
        request,
        context: collected.context || {},
        workflow: collected.workflow || {},
      }),
    }), { supports: relationshipEngineSupports }),
    engine("persistent_memory", 65, async (request, collected) => createEngineContextResult({
      section: "persistentMemory",
      priority: 65,
      data: await collectPersistentMemoryContext({ request, collected }),
    }), { supports: persistentMemoryEngineSupports }),
    engine("business", 80, async (request, collected) => createEngineContextResult({
      section: "business",
      priority: 80,
      data: await collectBusinessIntelligence({ request, collected }),
    }), { supports: businessEngineSupports }),
    engine("community", 85, async (request, collected) => createEngineContextResult({
      section: "community",
      priority: 85,
      data: await collectCommunityIntelligence({ request, collected }),
    }), { supports: communityEngineSupports }),
    engine("contracts", 90, async () => createEngineContextResult({ section: "contracts", priority: 90, data: {} })),
    engine("validation", 110, async (request, collected) => createEngineContextResult({ section: "validation", priority: 110, data: await collectIntelligenceValidation({ request, collected }) }), { required: true }),
    engine("decision", 120, async (request, collected) => createEngineContextResult({ section: "decision", priority: 120, data: await collectDecisionIntelligence({ request, collected }) }), { required: true }),
  ];
}
