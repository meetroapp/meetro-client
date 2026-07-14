import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("My Requests does not create local quote approval state", () => {
  assert.doesNotMatch(myRequestsSource, /setAcceptQuoteId|acceptQuoteId/);
  assert.doesNotMatch(myRequestsSource, /Confirm Acceptance|Confirmar Aceptaci/);
  assert.doesNotMatch(myRequestsSource, /type:\s*"quote_accepted"/);
  assert.doesNotMatch(myRequestsSource, /type:\s*"quoteAccepted"/);
  assert.doesNotMatch(myRequestsSource, /stageAcceptedQuoteForWork/);
  assert.doesNotMatch(myRequestsSource, /saveActiveWorkSnapshot|saveActiveJobSnapshot/);
  assert.doesNotMatch(myRequestsSource, /source:\s*"my_requests_quote_acceptance"/);
  assert.doesNotMatch(myRequestsSource, /nextAction:\s*"move_to_active"/);
});

test("My Requests does not create local scheduling or calendar workflow state", () => {
  assert.doesNotMatch(myRequestsSource, /setNextStepsQuoteId|nextStepsQuoteId/);
  assert.doesNotMatch(myRequestsSource, /Coordinate Scheduling|Coordinar programaci/);
  assert.doesNotMatch(myRequestsSource, /Service Scheduled|Servicio programado/);
  assert.doesNotMatch(myRequestsSource, /Confirm appointment|Confirmar cita/);
  assert.doesNotMatch(myRequestsSource, /Request different time|Pedir otro horario/);
  assert.doesNotMatch(myRequestsSource, /updateLinkedAppointmentStatus/);
  assert.doesNotMatch(myRequestsSource, /updateConversationScheduleMessage/);
  assert.doesNotMatch(myRequestsSource, /localStorage\.setItem\("meetro_business_schedule"/);
  assert.doesNotMatch(myRequestsSource, /type:\s*"appointment_confirmed"/);
  assert.doesNotMatch(myRequestsSource, /type:\s*"appointment_change_requested"/);
});

test("My Requests presents approval and scheduling as unavailable until backend authority exists", () => {
  assert.match(myRequestsSource, /Quote approval and scheduling are not available yet\./);
  assert.match(
    myRequestsSource,
    /Meetro does not yet save or share approvals or scheduling in production\./
  );
  assert.match(myRequestsSource, /getTruthfulWorkflowRequest/);
  assert.match(myRequestsSource, /hasUnsupportedApprovalOrSchedule/);
  assert.match(myRequestsSource, /workflowUnavailableCard/);
  assert.match(myRequestsSource, /quoteUnavailableNotice/);
});

test("My Requests sanitizes stale browser-local approved and scheduled records before presentation", () => {
  assert.match(myRequestsSource, /const UNSUPPORTED_WORKFLOW_STATUSES = new Set/);
  assert.match(myRequestsSource, /"accepted"/);
  assert.match(myRequestsSource, /"quote_approved"/);
  assert.match(myRequestsSource, /"scheduled"/);
  assert.match(myRequestsSource, /acceptedQuote: null/);
  assert.match(myRequestsSource, /scheduledAt: null/);
  assert.match(myRequestsSource, /linkedAppointment: null/);
  assert.match(myRequestsSource, /status: "pending"/);
});

test("My Requests preserves request viewing, quote review, conversation, and routing", () => {
  assert.match(myRequestsSource, /function openRequestConversation/);
  assert.match(myRequestsSource, /setPage\("conversationThread"\)/);
  assert.match(myRequestsSource, /quoteReview/);
  assert.match(myRequestsSource, /getQuoteTotal/);
  assert.match(myRequestsSource, /getQuoteScopeText/);
  assert.match(myRequestsSource, /getQuotePdfUrl/);
  assert.match(myRequestsSource, /className=\{`meetro-visual-surface/);
  assert.match(myRequestsSource, /<BottomNav/);
  assert.match(appSource, /"myRequests"/);
});
