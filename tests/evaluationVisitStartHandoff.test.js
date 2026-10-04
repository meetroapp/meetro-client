import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  clearPendingEvaluationVisitHandoff,
  createEvaluationVisitHandoff,
  EVALUATION_VISIT_HANDOFF_EVENT,
  readPendingEvaluationVisitHandoff,
  requestEvaluationVisitHandoff,
} from "../src/utils/evaluationVisitHandoff.js";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const conversation = read("src/components/CanonicalConversationVisitCard.jsx");
const jobVisits = read("src/components/CanonicalJobVisits.jsx");
const schedule = read("src/components/ProfessionalScheduleWorkspace.jsx");
const workCenter = read("src/pages/ContractorDashboard.jsx");
const evaluation = read("src/components/CanonicalJobEvaluation.jsx");

const ids = Object.freeze({
  job: "11111111-1111-4111-8111-111111111111",
  visit: "22222222-2222-4222-8222-222222222222",
});

function startedVisit(overrides = {}) {
  return {
    id: ids.visit,
    currentVersion: 3,
    state: "STARTED",
    purpose: "EVALUATION",
    ...overrides,
  };
}

function fakeWindow() {
  const values = new Map();
  const dispatched = [];
  class FakeCustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  }
  return {
    CustomEvent: FakeCustomEvent,
    dispatched,
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
    dispatchEvent(event) {
      dispatched.push(event);
      return true;
    },
  };
}

test("only an exact STARTED Evaluation Visit creates a scoped handoff", () => {
  const intent = createEvaluationVisitHandoff({
    jobId: ids.job,
    visit: startedVisit(),
    source: "conversation",
  });
  assert.deepEqual(intent, {
    jobId: ids.job,
    visitId: ids.visit,
    currentVersion: 3,
    state: "STARTED",
    purpose: "EVALUATION",
    source: "conversation",
    token: `${ids.job}:${ids.visit}:3`,
  });

  for (const visit of [
    startedVisit({ state: "SCHEDULED" }),
    startedVisit({ state: "COMPLETED" }),
    startedVisit({ state: "CANCELLED" }),
    startedVisit({ purpose: "APPROVED_WORK" }),
    startedVisit({ currentVersion: 0 }),
  ]) {
    assert.equal(
      createEvaluationVisitHandoff({
        jobId: ids.job,
        visit,
        source: "conversation",
      }),
      null
    );
  }
});

test("successful handoff persists only canonical identity and dispatches once", () => {
  const windowObject = fakeWindow();
  const intent = requestEvaluationVisitHandoff(
    {
      jobId: ids.job,
      visit: startedVisit(),
      source: "professional-schedule",
    },
    { windowObject }
  );

  assert.equal(windowObject.dispatched.length, 1);
  assert.equal(windowObject.dispatched[0].type, EVALUATION_VISIT_HANDOFF_EVENT);
  assert.deepEqual(windowObject.dispatched[0].detail, intent);
  assert.deepEqual(
    readPendingEvaluationVisitHandoff({ windowObject }),
    intent
  );
  assert.deepEqual(Object.keys(intent).sort(), [
    "currentVersion",
    "jobId",
    "purpose",
    "source",
    "state",
    "token",
    "visitId",
  ]);

  clearPendingEvaluationVisitHandoff({ windowObject });
  assert.equal(readPendingEvaluationVisitHandoff({ windowObject }), null);
});

test("failed or non-STARTED outcomes cannot dispatch a handoff", () => {
  const windowObject = fakeWindow();
  assert.equal(
    requestEvaluationVisitHandoff(
      {
        jobId: ids.job,
        visit: startedVisit({ state: "SCHEDULED" }),
        source: "job-overview",
      },
      { windowObject }
    ),
    null
  );
  assert.equal(windowObject.dispatched.length, 0);
  assert.equal(readPendingEvaluationVisitHandoff({ windowObject }), null);
});

test("Conversation starts first, then hands the same Job and Visit to Work Center", () => {
  assert.match(conversation, /const updated = await runCanonicalVisitCommand/);
  assert.match(conversation, /commandName === "start"/);
  assert.match(conversation, /jobId,[\s\S]*visit: updated,[\s\S]*source: "conversation"/);
  assert.match(conversation, /if \(handoff\) setPage\("workCenter"\)/);
  assert.match(conversation, /VISIT_START_ACKNOWLEDGMENT_REQUIRED[\s\S]*await command\("start", null, true\)/);
});

test("Work Center and Schedule use the same STARTED handoff helper", () => {
  assert.match(jobVisits, /const updated = await runCanonicalVisitCommand/);
  assert.match(jobVisits, /visit: updated,[\s\S]*source: "job-overview"/);
  assert.match(schedule, /editor\.mode === "start"[\s\S]*visit: updated,[\s\S]*source: "professional-schedule"/);
  assert.match(schedule, /acknowledgeScheduleVariance: true[\s\S]*visit: updated/);
});

test("Work Center consumes the exact canonical Job and auto-opens Evaluation", () => {
  assert.match(workCenter, /EVALUATION_VISIT_HANDOFF_EVENT/);
  assert.match(workCenter, /String\(job\?\.jobId \|\| ""\) === pendingEvaluationVisitHandoff\.jobId/);
  assert.match(workCenter, /setSelectedWorkCenterJob\(exactJob\)/);
  assert.match(workCenter, /projectedJobId !== evaluationVisitHandoffFocus\.jobId/);
  assert.match(workCenter, /canonicalEvaluationHandoffIsCurrent/);
  assert.match(workCenter, /evaluation-start:\$\{evaluationVisitHandoffFocus\.token\}/);
  assert.match(workCenter, /canonical-job-evaluation-title/);
  assert.match(workCenter, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(workCenter, /focus\(\{ preventScroll: true \}\)/);
  assert.match(evaluation, /tabIndex=\{-1\}/);
  assert.match(evaluation, /scrollMarginTop: 88/);
});

test("Start handoff does not chain completion or create lifecycle records", () => {
  const handoffSource = read("src/utils/evaluationVisitHandoff.js");
  assert.doesNotMatch(
    handoffSource,
    /runCanonicalVisitCommand|saveCanonicalEvaluationDraft|createOrdinaryJobEvaluation|completeCanonicalEvaluationDraft|submitCanonicalFinding|submitCanonicalRecommendation|createQuote|issueQuote/
  );
  for (const source of [conversation, jobVisits, schedule]) {
    const calls = source.match(/requestEvaluationVisitHandoff\(\{[\s\S]{0,240}?\}\);/g) || [];
    assert.ok(calls.length > 0);
    calls.forEach((call) => {
      assert.doesNotMatch(call, /complete|EvaluationDraft|Finding|Recommendation|Quote/);
    });
  }
});

test("opening Evaluation remains read-only until an explicit professional action", () => {
  assert.match(evaluation, /Evaluation Visit in progress\. Document the assessment as you work\./);
  assert.match(evaluation, /ContextualAskMeetro/);
  assert.match(evaluation, /Fill manually/);
  assert.match(evaluation, /What did you find\?/);
  assert.match(evaluation, /What do you recommend\?/);
  assert.doesNotMatch(
    evaluation,
    /useEffect\([\s\S]{0,900}?saveCanonicalEvaluationDraft/
  );
});
