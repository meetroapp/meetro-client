import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "@babel/parser";
import { parseUserScheduleTime } from "../src/utils/assistantScheduleTime.js";
import * as navigation from "../src/utils/assistantQuoteNavigation.js";
import { clearGenericNewQuoteContext } from "../src/utils/newQuoteCustomerSetup.js";
import { getFieldAssistantSuggestions, getFieldProductivityResponse } from "../src/utils/fieldProductivityAssistant.js";

const JOB = "11111111-1111-4111-8111-111111111111";
const DRAFT = "22222222-2222-4222-8222-222222222222";
const source = readFileSync(new URL("../src/components/MeetroAssistant.jsx", import.meta.url), "utf8");
const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
const component = ast.program.body.find((node) => node.type === "FunctionDeclaration" && node.id.name === "MeetroAssistant");
const declarations = [...ast.program.body, ...component.body.body];
const names = ["safeJson", "getQuoteHistory", "getQuoteStatus", "getHomeownerQuotes", "getHomeownerAppointment", "getRequestPhotoCount", "getProfessionalRequestContext", "isServiceRequestAssistantPage", "getServiceRequestContext", "getServiceRequestGuidanceResponse", "formatAssistantDate", "parseAssistantScheduleDate", "parseAssistantScheduleTime", "parseAssistantScheduleLocation", "parseAssistantScheduleNotes", "detectScheduleCreationIntent", "getScheduleCreationResponse", "getSelectedContext", "makeResponse", "makeAssistantAction", "makeRequestAssistantAction", "getEvaluationToQuoteResponse", "getVoiceResponse", "detectAssistantActionIntent", "navigateAssistantQuote", "handleQuickAction", "handleVoiceAction"];
const code = names.map((name) => {
  const node = declarations.find((node) => node.type === "FunctionDeclaration" && node.id.name === name);
  assert.ok(node, name);
  return source.slice(node.start, node.end);
}).join("\n");
const targetsNode = declarations.find((node) => node.type === "VariableDeclaration" && node.declarations.some((item) => item.id.name === "actionTargets"));
const targetsCode = source.slice(targetsNode.start, targetsNode.end);

// Run the real payload builders and navigation handlers, with only UI/storage
// and network ports substituted. No navigation logic is reimplemented here.
function harness({ route = "#businessDashboard", currentPage = "businessDashboard", requestDetail = null, legacy = true, seed = {} } = {}) {
  const data = new Map(Object.entries(seed));
  const mutations = [], routes = [], state = { open: true, answer: "" }, network = [];
  const localStorage = {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => { data.set(key, String(value)); mutations.push(["set", key]); },
    removeItem: (key) => { data.delete(key); mutations.push(["remove", key]); },
  };
  const noNetwork = (...args) => { network.push(args); assert.fail("navigation must not create/save documents or allocate numbers"); };
  const scope = {
    ...navigation, clearGenericNewQuoteContext: () => clearGenericNewQuoteContext(localStorage),
    localStorage, window: { location: { hash: route } }, currentPage, language: "en",
    readRequestCompanionContext: () => requestDetail, canReadLegacyWorkflowStorage: () => legacy,
    parseUserScheduleTime, getUpcomingAppointments: () => [], getUnreadConversationCount: () => 0,
    isLegacyWorkflowStorageKey: () => true,
    getFieldProductivityResponse: (options) => getFieldProductivityResponse({ ...options, storage: localStorage }),
    t: (key) => key, assistantCopy: { en: { actions: { quoteBuilder: "New Quote" }, actionRoutingReady: "Ready", professionalActionUnavailable: "Business only" } },
    stopAssistantVoiceResponse() {}, setOpen: (value) => { state.open = value; },
    setVoiceAnswer: (value) => { state.answer = value; }, setVoiceActions: (value) => { state.actions = value; }, setVoiceStatusChip() {},
    setPage: (route) => routes.push(route), authFetch: noNetwork, fetch: noNetwork,
    createBusinessDocumentDraft: noNetwork, updateBusinessDocumentDraft: noNetwork, initializeBusinessDocumentNumbering: noNetwork,
  };
  const handlers = new Function(...Object.keys(scope), `${targetsCode}\n${code}\nreturn { ${names.join(",")} };`)(...Object.values(scope));
  return { ...handlers, data, mutations, routes, state, network };
}

const stale = {
  selectedQuoteRequest: '{"title":"Existing request"}', selectedQuoteForEdit: '{"quoteId":"legacy"}',
  selectedWorkCenterRequest: '{"id":"work"}', selectedHomeownerRequest: '{"id":"home"}',
  activeJobId: JOB, activeWorkRequestId: JOB, selectedQuoteRequestId: "legacy-request",
};

test("the live Assistant quick Quote action clears stale hints and opens generic New Quote", () => {
  const h = harness({ seed: stale, currentPage: "contractorDashboard" });
  h.handleQuickAction("quoteBuilder");
  assert.deepEqual(h.routes, ["quoteBuilder?new=1"]);
  for (const key of ["selectedQuoteRequest", "selectedQuoteForEdit", "selectedWorkCenterRequest", "selectedHomeownerRequest"]) assert.equal(h.data.has(key), false);
  assert.equal(h.data.get("quoteBuilderReturnPage"), "contractorDashboard");
  assert.equal(h.data.get("activeJobId"), JOB);
  assert.equal(h.state.open, false);
  assert.equal(h.network.length, 0);
});

test("explicit typed/voice New Quote commands produce and execute standalone-new intent", () => {
  for (const command of ["New Quote", "create a new quote", "create a quote", "nueva cotización"]) {
    const h = harness({ seed: stale });
    const response = h.detectAssistantActionIntent(command, "business", "en");
    assert.ok(response, command);
    assert.equal(response.actions[0].quoteIntent, "GENERIC_NEW");
    h.handleVoiceAction(response.actions[0]);
    assert.deepEqual(h.routes, ["quoteBuilder?new=1"]);
    assert.equal(h.data.has("selectedQuoteRequest"), false);
    assert.equal(h.network.length, 0);
  }
});

test("contextual voice commands cannot accidentally inherit standalone-new intent", () => {
  for (const command of ["create a quote for this job", "create a new quote from this request", "draft the existing proposal"]) {
    const h = harness({ seed: stale });
    const action = h.detectAssistantActionIntent(command, "business", "en").actions[0];
    assert.equal(action.quoteIntent, "CONTINUE");
    h.handleVoiceAction(action);
    assert.deepEqual(h.routes, []);
    assert.deepEqual(h.mutations, []);
    assert.match(h.state.answer, /Open the exact Job or saved Quote first/);
  }
});

test("request Quote payloads preserve exact governed fields without promoting their request ID", () => {
  for (const [context, expected] of [
    [{ workingDraftId: DRAFT }, `quoteBuilder?draftId=${DRAFT}`],
    [{ existingQuote: { workingDraftId: DRAFT }, canonicalJobId: JOB }, `quoteBuilder?jobId=${JOB}&draftId=${DRAFT}`],
    [{ canonicalJobId: JOB }, `quoteBuilder?jobId=${JOB}`],
  ]) {
    const h = harness({ seed: stale, currentPage: "projectDetails" });
    const action = h.makeRequestAssistantAction("createQuote", "en", { ...context, requestId: "old-request", request: { id: "old-request" } });
    assert.equal(action.quoteIntent, "CONTINUE");
    h.handleVoiceAction(action);
    assert.deepEqual(h.routes, [expected]);
    assert.equal(h.data.get("selectedQuoteRequest"), stale.selectedQuoteRequest);
    assert.deepEqual(h.mutations, [["set", "quoteBuilderReturnPage"]]);
    assert.equal(h.network.length, 0);
  }
});

test("ambiguous live request continuation preserves all workflow storage and stays in the Assistant", () => {
  const h = harness({ seed: stale });
  const action = h.makeRequestAssistantAction("createQuote", "en", { requestId: JOB, conversationId: JOB, request: { id: JOB, projectId: JOB, quoteId: DRAFT } });
  // Exercise the guard before any of handleVoiceAction's legacy context writes.
  h.handleVoiceAction({ ...action, workCenterSection: "quotes", schedulePrefill: { scheduleId: JOB } });
  assert.deepEqual([...h.data], Object.entries(stale));
  assert.deepEqual(h.mutations, []);
  assert.deepEqual(h.routes, []);
  assert.equal(h.state.open, true);
  assert.match(h.state.answer, /Your current work is still open/);
  assert.equal(h.network.length, 0);
});

test("evaluation-language Quote actions require actual governed authority, not a verbal visit", () => {
  const h = harness({ seed: stale });
  const response = h.getEvaluationToQuoteResponse("I visited the customer and need to create a quote", "business", "en");
  const action = response.actions.find(navigation.isAssistantQuoteAction);
  assert.equal(action.quoteIntent, "CONTINUE");
  h.handleVoiceAction(action);
  assert.deepEqual(h.routes, []);
  assert.deepEqual(h.mutations, []);
  assert.equal(h.network.length, 0);
});

test("current Quote continuation uses the exact active route while Work Center legacy context blocks", () => {
  for (const [context, expected] of [
    [{ stage: "quote", page: "quoteBuilder", quoteNavigationContext: { draftId: DRAFT } }, `quoteBuilder?draftId=${DRAFT}`],
    [{ stage: "quote", page: "quoteBuilder", quoteNavigationContext: { jobId: JOB } }, `quoteBuilder?jobId=${JOB}`],
    [{ stage: "quote", page: "contractorDashboard", project: { id: JOB, quoteId: DRAFT } }, null],
  ]) {
    const h = harness({ seed: stale });
    const action = getFieldAssistantSuggestions(context, "en").find(navigation.isAssistantQuoteAction);
    assert.equal(action.quoteIntent, "CONTINUE");
    h.handleVoiceAction(action);
    assert.deepEqual(h.routes, expected ? [expected] : []);
    assert.equal(h.data.get("selectedQuoteRequest"), stale.selectedQuoteRequest);
    assert.equal(h.network.length, 0);
  }
});

test("field response threads only the explicit route context into its continuation action", () => {
  const storage = { getItem: (key) => ({ activeAccountMode: "business", activeJobId: JOB, activeWorkRequestId: JOB, activeWorkStatus: "quote" })[key] || null };
  for (const [quoteNavigationContext, expected] of [[{}, "BLOCKED_AMBIGUOUS"], [{ draftId: DRAFT }, "EXACT_SAVED_QUOTE"]]) {
    const response = getFieldProductivityResponse({ question: "what next", currentPage: "quoteBuilder", language: "en", storage, quoteNavigationContext });
    const action = response.actions.find(navigation.isAssistantQuoteAction);
    assert.equal(navigation.resolveAssistantQuoteNavigation({ action, context: action.quoteContext }).kind, expected);
  }
});

test("getSelectedContext gives legacy IDs no canonical Job semantics even when UUID-shaped", () => {
  const h = harness({ seed: stale, requestDetail: { projectId: JOB, requestId: JOB } });
  const context = h.getSelectedContext();
  assert.equal(context.canonicalJobId, "");
  assert.equal(context.workingDraftId, "");
  assert.equal(Object.hasOwn(context, "selectedJobId"), false);
  assert.equal(context.selectedProjectId, JOB);
  assert.equal(navigation.resolveAssistantQuoteNavigation({ context }).kind, "BLOCKED_AMBIGUOUS");
});

test("getSelectedContext obtains explicit identity only from the governed Quote route even with legacy reads disabled", () => {
  for (const legacy of [true, false]) {
    const h = harness({ route: `#quoteBuilder?jobId=${JOB}&draftId=${DRAFT}`, legacy, seed: stale });
    const context = h.getSelectedContext();
    assert.equal(context.canonicalJobId, JOB);
    assert.equal(context.workingDraftId, DRAFT);
    assert.deepEqual(h.mutations, []);
  }
});

test("the live voice-response chain threads the active exact Quote route to the field continuation", () => {
  const h = harness({ route: `#quoteBuilder?draftId=${DRAFT}`, seed: stale, currentPage: "quoteBuilder" });
  const response = h.getVoiceResponse("what next", "business", "en", {}, "quoteBuilder");
  const action = response.actions.find(navigation.isAssistantQuoteAction);
  assert.deepEqual(action.quoteContext, { draftId: DRAFT });
  h.handleVoiceAction(action);
  assert.deepEqual(h.routes, [`quoteBuilder?draftId=${DRAFT}`]);
  assert.equal(h.data.get("selectedQuoteRequest"), stale.selectedQuoteRequest);
});

test("the live voice-response chain allows New Quote without treating stale storage as continuation authority", () => {
  const h = harness({ seed: stale });
  const response = h.getVoiceResponse("New Quote", "business", "en", {}, "businessDashboard");
  h.handleVoiceAction(response.actions[0]);
  assert.deepEqual(h.routes, ["quoteBuilder?new=1"]);
  assert.equal(h.data.has("selectedQuoteRequest"), false);
});

test("bare Quote creation inside a workflow keeps continuation intent; explicit New Quote remains available", () => {
  for (const [command, expected] of [["create a quote", []], ["New Quote", ["quoteBuilder?new=1"]]]) {
    const h = harness({ currentPage: "contractorDashboard", seed: stale });
    const response = h.getVoiceResponse(command, "business", "en", {}, "contractorDashboard");
    h.handleVoiceAction(response.actions[0]);
    assert.deepEqual(h.routes, expected);
    assert.equal(h.network.length, 0);
  }
});

for (const [page, command] of [["projectDetails", "New Quote"], ["myRequests", "Create a new quote"], ["projectDetails", "Start a new quote"], ["myRequests", "New standalone quote"], ["projectDetails", "Crear una nueva cotización"]]) {
  test(`${page}: strict standalone '${command}' precedes live request guidance`, () => {
    for (const requestDetail of [null, { pageContext: "request_detail", requestId: JOB, projectId: JOB, title: "Existing request", status: "Under review" }]) {
      const h = harness({ seed: stale, currentPage: page, requestDetail });
      const contextual = h.getServiceRequestGuidanceResponse(command, "business", "en", page);
      assert.ok(contextual, "the actual request responder would otherwise consume the command");
      const response = h.getVoiceResponse(command, "business", "en", {}, page);
      assert.equal(response.intent, "open_quote_builder");
      const action = response.actions.find(navigation.isAssistantQuoteAction);
      assert.equal(action.quoteIntent, "GENERIC_NEW");
      h.handleVoiceAction(action);
      assert.deepEqual(h.routes, ["quoteBuilder?new=1"]);
      for (const key of ["selectedQuoteRequest", "selectedQuoteForEdit", "selectedWorkCenterRequest", "selectedHomeownerRequest"]) assert.equal(h.data.has(key), false);
      assert.equal(h.data.get("quoteBuilderReturnPage"), page);
      assert.equal(h.network.length, 0);
    }
  });
}

for (const command of ["Create a new quote from this request", "Create a quote for this Job", "New quote for this project", "Continue this quote", "Revise the current quote"]) {
  test(`projectDetails: '${command}' retains live request continuation and never opens generic Quote`, () => {
    const h = harness({ seed: stale, currentPage: "projectDetails" });
    const response = h.getVoiceResponse(command, "business", "en", {}, "projectDetails");
    assert.equal(response.intent, "request_create_quote");
    const action = response.actions.find(navigation.isAssistantQuoteAction);
    assert.equal(action.quoteIntent, "CONTINUE");
    h.handleVoiceAction(action);
    assert.deepEqual(h.routes, []);
    assert.deepEqual(h.mutations, []);
    assert.deepEqual([...h.data], Object.entries(stale));
    assert.match(h.state.answer, /Open the exact Job or saved Quote first/);
    assert.equal(h.network.length, 0);
  });
}

test("exact governed Job and saved draft voice continuations remain exact after standalone precedence", () => {
  for (const route of [`quoteBuilder?jobId=${JOB}`, `quoteBuilder?jobId=${JOB}&draftId=${DRAFT}`]) {
    const h = harness({ route: `#${route}`, currentPage: "quoteBuilder", seed: stale });
    const response = h.getVoiceResponse("Continue this quote", "business", "en", {}, "quoteBuilder");
    const action = response.actions.find(navigation.isAssistantQuoteAction);
    assert.equal(action.quoteIntent, "CONTINUE");
    h.handleVoiceAction(action);
    assert.deepEqual(h.routes, [route]);
    assert.equal(h.data.get("selectedQuoteRequest"), stale.selectedQuoteRequest);
    assert.equal(h.network.length, 0);
  }
});

test("real evaluation and schedule responders retain precedence for contextual language", () => {
  for (const [command, expected] of [["I visited the customer and need a quote", "evaluation_to_quote_guidance"], ["Create a new quote after the evaluation", "schedule_creation_missing_details"], ["Schedule a visit for this quote", "schedule_creation_missing_details"]]) {
    const h = harness({ currentPage: "projectDetails", seed: stale });
    const response = h.getVoiceResponse(command, "business", "en", {}, "projectDetails");
    assert.equal(response.intent, expected);
    const action = response.actions.find(navigation.isAssistantQuoteAction) || response.actions[0];
    h.handleVoiceAction(action);
    assert.ok(h.routes.every((route) => route !== "quoteBuilder?new=1"));
    assert.equal(h.data.get("selectedQuoteRequest"), stale.selectedQuoteRequest);
    assert.equal(h.network.length, 0);
  }
});
