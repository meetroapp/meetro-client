import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const conversationThreadSource = fs.readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);
const contractorDashboardSource = fs.readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);

test("chat schedule handoff is role-safe and does not send homeowners to business scheduling", () => {
  assert.match(conversationThreadSource, /const openChatScheduleModal = \(\) => \{/);
  assert.match(conversationThreadSource, /if \(currentViewerRole !== "business"\) \{/);
  assert.match(conversationThreadSource, /Scheduling is managed by the professional/);
  assert.match(conversationThreadSource, /textareaRef\.current\?\.focus\?\.\(\)/);
  assert.match(conversationThreadSource, /handOffChatScheduleToWorkCenter\(\)/);
  assert.doesNotMatch(
    conversationThreadSource,
    /const openChatScheduleModal = \(\) => \{\s*if \(isHiringThread\) return;\s*openWorkCenterHandoff\("schedule"\);/
  );
});

test("business chat scheduling hands Schedule the active relationship context", () => {
  assert.match(conversationThreadSource, /const getChatScheduleHandoffContext = \(\) => \{/);
  assert.match(conversationThreadSource, /relationshipId/);
  assert.match(conversationThreadSource, /customerAccountId/);
  assert.match(conversationThreadSource, /externalContactId/);
  assert.match(conversationThreadSource, /businessId/);
  assert.match(conversationThreadSource, /conversationId,/);
  assert.match(conversationThreadSource, /activeAccountMode/);
  assert.match(conversationThreadSource, /activeRole: currentViewerRole/);
  assert.match(conversationThreadSource, /localStorage\.setItem\("meetroAssistantSchedulePrefill", JSON\.stringify\(handoff\)\)/);
  assert.match(conversationThreadSource, /localStorage\.setItem\("activeWorkConversationId", conversationId\)/);
});

test("Work Center Add Visit consumes chat prefill and saves one linked visit", () => {
  assert.match(contractorDashboardSource, /contextSource: prefill\.contextSource \|\| current\.contextSource \|\| "conversation"/);
  assert.match(contractorDashboardSource, /relationshipId:\s*prefill\.relationshipId/);
  assert.match(contractorDashboardSource, /customerAccountId:\s*prefill\.customerAccountId/);
  assert.match(contractorDashboardSource, /externalContactId:\s*prefill\.externalContactId/);
  assert.match(contractorDashboardSource, /businessId:\s*prefill\.businessId/);
  assert.match(contractorDashboardSource, /businessName:\s*prefill\.businessName/);
  assert.match(contractorDashboardSource, /scheduleDedupeKey/);
  assert.match(contractorDashboardSource, /This visit is already saved for this customer/);
  assert.match(contractorDashboardSource, /relationshipId,/);
  assert.match(contractorDashboardSource, /customerAccountId,/);
  assert.match(contractorDashboardSource, /externalContactId,/);
  assert.match(contractorDashboardSource, /businessId,/);
});

test("saved linked visits auto-send schedule cards and external visits use share", () => {
  assert.match(contractorDashboardSource, /if \(isLinkedMeetroScheduleCustomer\(newVisit\)\) \{/);
  assert.match(contractorDashboardSource, /sendScheduleVisitToMeetroChat\(newVisit\)/);
  assert.match(contractorDashboardSource, /openScheduleDeliveryChoice\(newVisit\)/);
  assert.match(contractorDashboardSource, /function sendScheduleVisitToMeetroChat\(visit = \{\}\) \{/);
  assert.match(contractorDashboardSource, /scheduleId: visit\.id/);
  assert.match(contractorDashboardSource, /visitId: visit\.visitId \|\| visit\.id/);
  assert.match(contractorDashboardSource, /relationshipId: visit\.relationshipId \|\| ""/);
  assert.match(contractorDashboardSource, /customerAccountId: visit\.customerAccountId \|\| ""/);
  assert.match(contractorDashboardSource, /externalContactId: visit\.externalContactId \|\| ""/);
  assert.match(contractorDashboardSource, /Share by Text \/ iOS Message/);
  assert.match(contractorDashboardSource, /async function shareExternalScheduleVisit/);
  assert.match(contractorDashboardSource, /Share\.share/);
  assert.match(contractorDashboardSource, /sms:\$\{encodeURIComponent\(phone\)\}/);
  assert.match(contractorDashboardSource, /MEETRO_PUBLIC_INVITE_LINK/);
});

test("customer schedule acceptance advances the visit toward evaluation", () => {
  assert.match(conversationThreadSource, /workflowStage:[\s\S]*"visit_scheduled"/);
  assert.match(conversationThreadSource, /workflowStatus:[\s\S]*"visit_scheduled"/);
  assert.match(conversationThreadSource, /nextAction:[\s\S]*"record_evaluation"/);
  assert.match(conversationThreadSource, /evaluationStatus:[\s\S]*"ready_after_visit"/);
});
