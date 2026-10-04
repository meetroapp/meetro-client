import assert from "node:assert/strict";
import test from "node:test";
import { assistantQuoteContextFromRoute, isAssistantQuoteAction, resolveAssistantQuoteNavigation } from "../src/utils/assistantQuoteNavigation.js";
import { buildSavedQuoteRoute } from "../src/utils/savedQuoteRoute.js";

const JOB = "11111111-1111-4111-8111-111111111111";
const DRAFT = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const resolve = (action, context = {}, intent = "CONTINUE") => resolveAssistantQuoteNavigation({ action, context, intent });

test("only explicit standalone-new intent authorizes the generic Quote route", () => {
  assert.deepEqual(resolve({}, {}, "GENERIC_NEW"), { kind: "GENERIC_NEW", route: "quoteBuilder?new=1", reason: "EXPLICIT_STANDALONE_NEW" });
  assert.equal(resolve({ target: "quoteBuilder?new=1" }).kind, "BLOCKED_AMBIGUOUS");
  assert.equal(resolve({}, {}, "unknown").kind, "BLOCKED_AMBIGUOUS");
});

for (const [name, identity] of [
  ["draftId", { draftId: DRAFT }], ["workingDraftId", { workingDraftId: DRAFT }],
  ["existingQuote.workingDraftId", { existingQuote: { workingDraftId: DRAFT } }],
]) {
  test(`${name} opens an exact external saved Quote without a Job`, () => {
    for (const input of [resolve(identity), resolve({}, identity)]) {
      assert.equal(input.kind, "EXACT_SAVED_QUOTE");
      assert.equal(input.route, buildSavedQuoteRoute({ draftId: DRAFT }));
    }
  });
}

test("exact draft and canonical Job identities retain both governed route parameters", () => {
  const navigation = resolve({ workingDraftId: DRAFT, canonicalJobId: JOB });
  assert.equal(navigation.kind, "EXACT_SAVED_QUOTE");
  assert.equal(navigation.route, buildSavedQuoteRoute({ jobId: JOB, draftId: DRAFT }));
});

test("explicit canonical Job identity alone uses existing Job Quote protection", () => {
  for (const identity of [{ jobId: JOB }, { canonicalJobId: JOB }]) {
    assert.equal(resolve(identity).kind, "EXACT_JOB_CONTEXT");
    assert.equal(resolve(identity).route, buildSavedQuoteRoute({ jobId: JOB }));
  }
});

for (const field of ["requestId", "conversationId", "activeWorkRequestId", "projectId", "activeJobId", "selectedJobId", "selectedQuoteRequestId", "quoteId", "canonicalQuoteId", "scheduleId", "customerName"]) {
  test(`${field} is not promoted to Job or working-draft authority even when UUID-shaped`, () => {
    for (const navigation of [resolve({ [field]: JOB }), resolve({}, { [field]: JOB })]) {
      assert.equal(navigation.kind, "BLOCKED_AMBIGUOUS");
      assert.equal(navigation.route, "");
    }
  });
}

test("malformed and conflicting exact identities fail closed rather than falling back to a different document", () => {
  for (const navigation of [
    resolve({ draftId: "legacy-42", jobId: JOB }), resolve({ draftId: DRAFT, jobId: "legacy-42" }),
    resolve({ draftId: DRAFT, workingDraftId: OTHER }), resolve({ jobId: JOB }, { canonicalJobId: OTHER }),
    resolve({ target: `quoteBuilder?draftId=${DRAFT}` }, { draftId: OTHER }),
    resolve({ target: "quoteBuilder?draftId=" }, { jobId: JOB }), resolve({ jobId: 42 }),
  ]) {
    assert.equal(navigation.kind, "BLOCKED_AMBIGUOUS");
    assert.equal(navigation.route, "");
  }
});

test("contradictory generic-new and workflow payloads cannot clear context", () => {
  for (const action of [{ requestId: JOB }, { request: { id: JOB } }, { draftId: DRAFT }, { jobId: JOB }, { quoteId: JOB }]) {
    assert.equal(resolve(action, {}, "GENERIC_NEW").kind, "BLOCKED_AMBIGUOUS");
  }
  assert.equal(resolve({}, { projectId: JOB }, "GENERIC_NEW").kind, "BLOCKED_AMBIGUOUS");
});

test("exact Quote route identities use existing parsing contracts; other routes grant no Quote authority", () => {
  const route = buildSavedQuoteRoute({ jobId: JOB, draftId: DRAFT });
  assert.deepEqual(assistantQuoteContextFromRoute(`#${route}`), { jobId: JOB, draftId: DRAFT });
  assert.equal(resolve({ target: route }).route, route);
  for (const route of [`invoiceBuilder?jobId=${JOB}`, `projectDetails?projectId=${JOB}`, `quoteBuilder?jobId=invalid&draftId=${DRAFT}`, "quoteBuilder?new=1"]) {
    assert.deepEqual(assistantQuoteContextFromRoute(route), {});
  }
  assert.equal(isAssistantQuoteAction({ target: "quoteBuilder?jobId=invalid" }), true);
  assert.equal(isAssistantQuoteAction({ target: "invoiceBuilder" }), false);
});

test("strict standalone-new intent accepts complete English and Spanish commands", async () => {
  const { isExplicitStandaloneNewQuoteIntent } = await import("../src/utils/assistantQuoteNavigation.js");
  for (const question of ["New Quote", "Create a new quote", "Start a new quote", "New standalone quote", "  Please create a new quote!  ", "Nueva cotización", "Crear una nueva cotización", "Iniciar una nueva cotización", "Nueva cotización independiente", "Cotización nueva, por favor."]) {
    assert.equal(isExplicitStandaloneNewQuoteIntent(question), true, question);
  }
});

test("strict standalone-new intent rejects contextual, negative, quoted and compound commands", async () => {
  const { isExplicitStandaloneNewQuoteIntent } = await import("../src/utils/assistantQuoteNavigation.js");
  for (const question of ["Create a new quote from this request", "Create a quote for this Job", "New quote for this project", "Continue this quote", "Revise the current quote", "New quote after the evaluation", "New quote for the scheduled visit", "Create a new quote from the schedule", "Nueva cotización para este proyecto", "Crear una nueva cotización desde esta solicitud", "Nueva cotización después de la visita", "Do not create a new quote", 'Explain "New Quote"', "New Quote and open the request", "", null]) {
    assert.equal(isExplicitStandaloneNewQuoteIntent(question), false, String(question));
  }
});
