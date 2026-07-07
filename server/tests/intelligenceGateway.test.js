import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { buildCompanionContext } from "../intelligence/contextBuilder.js";
import { askCompanionGateway } from "../intelligence/gateway.js";
import { classifyCompanionIntent } from "../intelligence/intentEngine.js";
import { invokeProvider } from "../intelligence/providerAdapter.js";
import { handleCompanionAsk } from "../intelligence/companionController.js";
import {
  COMPANION_ASK_ROUTE,
  registerCompanionRoutes,
} from "../intelligence/companionRoutes.js";

function mockProvider(answer = "I can help using the visible request context.") {
  const calls = [];

  return {
    provider: {
      name: "openai",
      async complete(payload) {
        calls.push(payload);
        return { answer };
      },
    },
    calls,
  };
}

test("Intent Engine classifies Companion requests", () => {
  assert.equal(classifyCompanionIntent("Open my messages"), "navigation");
  assert.equal(classifyCompanionIntent("What happens next with this request?"), "workflow_guidance");
  assert.equal(classifyCompanionIntent("Explain this quote status"), "explanation");
  assert.equal(classifyCompanionIntent("Compare these options"), "reasoning");
});

test("Context Builder assembles verified visible request context only", () => {
  const context = buildCompanionContext({
    user: { id: "user-1", accountType: "personal", language: "en" },
    body: {
      pageContext: "request_detail",
      context: {
        requestId: "req-1",
        projectId: "project-1",
        conversationId: "thread-1",
        status: "scheduled",
        nextStep: "Prepare for the visit.",
        serviceType: "Cleaning",
        rolePerspective: "homeowner",
        quoteStatus: "accepted",
        scheduleStatus: "confirmed",
        privateNotes: "hidden",
        internalAdminNote: "hidden",
      },
    },
  });

  assert.deepEqual(context, {
    pageContext: "request_detail",
    accountType: "personal",
    language: "en",
    relationshipPerspective: "homeowner",
    request: {
      pageContext: "request_detail",
      requestId: "req-1",
      projectId: "project-1",
      conversationId: "thread-1",
      status: "scheduled",
      nextStep: "Prepare for the visit.",
      serviceType: "Cleaning",
      rolePerspective: "homeowner",
      quoteStatus: "accepted",
      scheduleStatus: "confirmed",
    },
    visibleWorkflowStatus: "scheduled",
  });
  assert.equal("privateNotes" in context.request, false);
  assert.equal("internalAdminNote" in context.request, false);
});

test("Provider Adapter invokes mocked OpenAI provider through abstraction", async () => {
  const { provider, calls } = mockProvider("Gateway answer");
  const result = await invokeProvider({
    providerName: "openai",
    providers: { openai: provider },
    messages: [{ role: "user", content: "Hello" }],
  });

  assert.equal(result.provider, "openai");
  assert.equal(result.answer, "Gateway answer");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].messages, [{ role: "user", content: "Hello" }]);
});

test("Gateway receives request and returns normalized provider response", async () => {
  const { provider, calls } = mockProvider("Visible next step: prepare for the visit.");
  const result = await askCompanionGateway({
    user: { id: "user-1", accountType: "personal" },
    body: {
      question: "What happens next?",
      pageContext: "request_detail",
      context: {
        requestId: "req-1",
        projectId: "project-1",
        status: "scheduled",
        nextStep: "Prepare for the visit.",
      },
    },
    providers: { openai: provider },
  });

  assert.equal(result.success, true);
  assert.equal(result.answer, "Visible next step: prepare for the visit.");
  assert.equal(result.intent, "workflow_guidance");
  assert.equal(result.provider, "openai");
  assert.equal(result.context.request.requestId, "req-1");
  assert.equal(calls.length, 1);
  assert.match(calls[0].messages[0].content, /Ask Meetro/);
});

test("Gateway handles provider failure with normalized fallback error", async () => {
  const result = await askCompanionGateway({
    user: { id: "user-1" },
    body: { question: "Explain this status", pageContext: "request_detail" },
    providers: {
      openai: {
        name: "openai",
        async complete() {
          throw Object.assign(new Error("Provider down"), { code: "provider_unavailable" });
        },
      },
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.intent, "explanation");
  assert.equal(result.provider, "openai");
  assert.equal(result.error.code, "provider_unavailable");
  assert.match(result.answer, /unavailable/i);
});

test("Gateway rejects missing authentication before provider invocation", async () => {
  let invoked = false;
  const result = await askCompanionGateway({
    body: { question: "What happens next?" },
    providers: {
      openai: {
        name: "openai",
        async complete() {
          invoked = true;
          return { answer: "Should not run" };
        },
      },
    },
  });

  assert.equal(invoked, false);
  assert.equal(result.success, false);
  assert.equal(result.error.code, "missing_authentication");
});

test("Companion Controller exposes POST /api/companion/ask contract shape", async () => {
  const { provider } = mockProvider("Controller answer");
  let statusCode = 0;
  let payload = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      payload = value;
      return value;
    },
  };

  await handleCompanionAsk(
    {
      user: { id: "user-1" },
      body: { question: "Explain this request", pageContext: "request_detail" },
    },
    res,
    { providers: { openai: provider } }
  );

  assert.equal(statusCode, 200);
  assert.equal(payload.answer, "Controller answer");
  assert.equal(payload.intent, "explanation");
  assert.equal(payload.provider, "openai");
});

test("Companion route registers POST /api/companion/ask through the Gateway controller", () => {
  let routePath = "";
  let routeHandler = null;
  const app = {
    post(path, handler) {
      routePath = path;
      routeHandler = handler;
    },
  };

  registerCompanionRoutes(app);

  assert.equal(COMPANION_ASK_ROUTE, "/api/companion/ask");
  assert.equal(routePath, "/api/companion/ask");
  assert.equal(typeof routeHandler, "function");
});

test("Existing frontend integration does not call OpenAI directly", () => {
  const assistantSource = fs.readFileSync(
    new URL("../../src/components/MeetroAssistant.jsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(assistantSource, /api\.openai\.com|OPENAI_API_KEY|chat\.completions/);
});
