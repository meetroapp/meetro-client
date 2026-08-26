import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");

const conversation = read("src/pages/ConversationThread.jsx");
const visitCard = read("src/components/CanonicalConversationVisitCard.jsx");
const scheduleWorkspace = read("src/components/ProfessionalScheduleWorkspace.jsx");
const scheduleProjection = read("src/utils/professionalScheduleProjection.js");
const dashboard = read("src/pages/BusinessDashboard.jsx");
const workCenter = read("src/pages/ContractorDashboard.jsx");
const evaluation = read("src/components/CanonicalJobEvaluation.jsx");
const evaluationController = read("src/utils/evaluationAuthorityController.js");
const evaluationApi = read("src/utils/evaluationApi.js");

test("Conversation is the coordination origin for one Job-bound canonical Evaluation Visit", () => {
  assert.match(conversation, /canonicalConversationDetail\.relationship\.jobId/);
  assert.match(conversation, /Schedule Evaluation Visit/);
  assert.match(conversation, /<CanonicalConversationVisitCard/);
  assert.match(visitCard, /fetchCanonicalVisits[\s\S]*purpose: "EVALUATION"/);
  assert.match(visitCard, /data-canonical-visit-id/);
  assert.match(visitCard, /data-canonical-visit-version/);
  assert.match(visitCard, /data-canonical-visit-state/);
  assert.doesNotMatch(visitCard, /getBusinessSchedule|saveBusinessSchedule|localStorage|sessionStorage/);
});

test("customer alternate time and opposite-party approval use exact versioned Visit commands", () => {
  assert.match(visitCard, /command\("confirm"\)/);
  assert.match(visitCard, /"change-request"/);
  assert.match(visitCard, /visit: state\.visit/);
  assert.match(visitCard, /Approve Visit/);
  assert.match(visitCard, /Propose New Time/);
  assert.match(visitCard, /Approve New Time/);
  assert.match(visitCard, /STALE_VISIT_VERSION/);
  assert.doesNotMatch(visitCard, /message\.text|Tuesday works|chat.*state/i);
});

test("responsive Conversation render modes retain one canonical Visit identity", () => {
  assert.match(conversation, /"project-panel"[\s\S]*"inline"/);
  assert.match(visitCard, /data-visit-display-mode=\{displayMode\}/);
  assert.match(visitCard, /Keep Conversation Open/);
});

test("Schedule, Work Center, and Dashboard consume one shared classification contract", () => {
  assert.match(scheduleProjection, /needsScheduling/);
  assert.match(scheduleProjection, /waitingOnCustomer/);
  assert.match(scheduleProjection, /changeRequested/);
  assert.match(scheduleProjection, /today/);
  assert.match(scheduleProjection, /upcoming/);
  assert.match(scheduleWorkspace, /getProfessionalScheduleCounts/);
  assert.match(scheduleWorkspace, /Visits need scheduling/);
  assert.match(workCenter, /getProfessionalScheduleCounts/);
  assert.match(dashboard, /getProfessionalScheduleCounts/);
  assert.match(dashboard, /groupProfessionalSchedule/);
  assert.doesNotMatch(dashboard, /professionalMetrics\.scheduleItems/);
  assert.doesNotMatch(dashboard, /meetro_business_schedule/);
});

test("dashboard remains reminder-only and does not acquire Visit mutation authority", () => {
  assert.match(dashboard, /openWorkCenterSection\("schedule"/);
  assert.doesNotMatch(dashboard, /runCanonicalVisitCommand|\/jobs\/.*\/visits/);
  assert.match(dashboard, /Customer proposed a new time/);
  assert.match(dashboard, /visits need scheduling/);
});

test("Visit completion unlocks Evaluation provenance without creating downstream lifecycle state", () => {
  assert.match(evaluation, /Complete the evaluation visit before documenting the assessment/);
  assert.match(evaluation, /Evaluation Visit completed\. Document the Evaluation from this Visit/);
  assert.match(evaluationController, /visit\.state === "COMPLETED"/);
  assert.match(evaluationController, /visitId: completedVisit\.id/);
  assert.match(evaluationApi, /JSON\.stringify\(\{ visitId, content, expectedVersion: 0 \}\)/);
  assert.doesNotMatch(visitCard, /createQuote|issueQuote|payment|invoice|workstream/i);
  assert.doesNotMatch(evaluationController, /\/quotes|\/payments|\/invoices|\/workstreams/);
});

test("requester neutrality and address privacy remain presentation invariants", () => {
  assert.match(visitCard, /viewerRole === "professional" \|\| viewerRole === "business"/);
  assert.doesNotMatch(visitCard, /accountType|homeowner account|professional account/i);
  assert.match(visitCard, /Project service location/);
  assert.doesNotMatch(visitCard, /line1|unitNumber|accessNotes|service_address/);
  assert.doesNotMatch(dashboard, /visit\.location\.address|line1|unitNumber|accessNotes/);
});
