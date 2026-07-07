import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { buildCompanionContext } from "../intelligence/contextBuilder.js";
import { askCompanionGateway } from "../intelligence/gateway.js";
import { classifyCompanionIntent } from "../intelligence/intentEngine.js";
import { invokeProvider } from "../intelligence/providerAdapter.js";
import { createOpenAIProvider } from "../intelligence/providers/openaiProvider.js";
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

test("OpenAI provider uses official Responses API client and normalizes success", async () => {
  const calls = [];
  const provider = createOpenAIProvider({
    apiKey: "test-key",
    model: "test-model",
    client: {
      responses: {
        async create(payload) {
          calls.push(payload);
          return { output_text: "A normalized OpenAI answer." };
        },
      },
    },
  });

  const result = await provider.complete({
    messages: [
      { role: "system", content: "System prompt" },
      { role: "user", content: "{\"question\":\"What happens next?\"}" },
    ],
  });

  assert.equal(result.answer, "A normalized OpenAI answer.");
  assert.deepEqual(calls, [
    {
      model: "test-model",
      instructions: "System prompt",
      input: "{\"question\":\"What happens next?\"}",
      temperature: 0.2,
    },
  ]);
});

test("OpenAI provider handles invalid API key failures without exposing provider details", async () => {
  const provider = createOpenAIProvider({
    apiKey: "bad-key",
    client: {
      responses: {
        async create() {
          throw Object.assign(new Error("invalid_api_key"), { status: 401 });
        },
      },
    },
  });

  await assert.rejects(
    () => provider.complete({ messages: [{ role: "user", content: "Hello" }] }),
    (error) => {
      assert.equal(error.code, "provider_authentication_failed");
      assert.equal(error.status, 401);
      assert.doesNotMatch(error.message, /invalid_api_key/);
      return true;
    }
  );
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
    logger: null,
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
    logger: null,
  });

  assert.equal(result.success, false);
  assert.equal(result.intent, "explanation");
  assert.equal(result.provider, "openai");
  assert.equal(result.error.code, "provider_unavailable");
  assert.match(result.answer, /unavailable/i);
});

test("Gateway handles provider timeout with normalized fallback error", async () => {
  const result = await askCompanionGateway({
    user: { id: "user-1" },
    body: { question: "What happens next?", pageContext: "request_detail" },
    timeoutMs: 1,
    providers: {
      openai: {
        name: "openai",
        async complete() {
          return new Promise(() => {});
        },
      },
    },
    logger: null,
  });

  assert.equal(result.success, false);
  assert.equal(result.error.code, "provider_timeout");
  assert.equal(result.intent, "workflow_guidance");
  assert.match(result.answer, /longer than expected/i);
});

test("Gateway logs only safe operational metadata", async () => {
  const { provider } = mockProvider("Logged answer");
  const events = [];
  const logger = {
    info(message, event) {
      events.push({ message, event });
    },
  };

  const result = await askCompanionGateway({
    user: { id: "user-1" },
    body: {
      question: "What happens next?",
      context: {
        requestId: "req-logs",
        privateNotes: "do not log",
      },
    },
    providers: { openai: provider },
    logger,
  });

  assert.equal(result.success, true);
  assert.equal(events.length, 1);
  assert.equal(events[0].message, "meetro_intelligence_gateway");
  assert.deepEqual(Object.keys(events[0].event).sort(), [
    "intent",
    "provider",
    "requestId",
    "responseTimeMs",
    "success",
  ]);
  assert.equal(events[0].event.requestId, "req-logs");
  assert.equal(JSON.stringify(events[0]), JSON.stringify(events[0]).replace("do not log", ""));
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
    logger: null,
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
    { providers: { openai: provider }, logger: null }
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

test("Gateway remains provider independent while OpenAI stays behind provider boundary", () => {
  const gatewaySource = fs.readFileSync(
    new URL("../intelligence/gateway.js", import.meta.url),
    "utf8"
  );
  const adapterSource = fs.readFileSync(
    new URL("../intelligence/providerAdapter.js", import.meta.url),
    "utf8"
  );
  const providerSource = fs.readFileSync(
    new URL("../intelligence/providers/openaiProvider.js", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(gatewaySource, /from "openai"|responses\.create|OPENAI_API_KEY/);
  assert.match(adapterSource, /createProviderRegistry/);
  assert.match(providerSource, /from "openai"/);
  assert.match(providerSource, /responses\.create/);
  assert.match(providerSource, /OPENAI_API_KEY/);
  assert.match(providerSource, /OPENAI_MODEL/);
  assert.match(providerSource, /gpt-4\.1-mini/);
  assert.doesNotMatch(providerSource, /chat\/completions|chat\.completions/);
});
