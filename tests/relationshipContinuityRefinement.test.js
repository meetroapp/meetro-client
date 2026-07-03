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
const messagesInboxSource = fs.readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);
const relationshipIdentitySource = fs.readFileSync(
  new URL("../src/utils/relationshipIdentity.js", import.meta.url),
  "utf8"
);
const conversationIdentitySource = fs.readFileSync(
  new URL("../src/utils/conversationIdentity.js", import.meta.url),
  "utf8"
);

function sourceBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} not found`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} not found after ${startMarker}`);
  return source.slice(start, end);
}

test("homeowner chat surfaces do not expose the professional schedule action", () => {
  const overflowScheduleBlock = sourceBlock(
    conversationThreadSource,
    "{currentViewerRole === \"business\" && (\n                <button\n                  style={threadMenuBtn}",
    "<div style={menuSection}>"
  );
  const attachScheduleBlock = sourceBlock(
    conversationThreadSource,
    "{currentViewerRole === \"business\" && (\n\t                        <button style={menuActionPrimary} onClick={openChatScheduleModal}>",
    "<button style={menuActionPrimary} onClick={openTenantTicketComposer}>"
  );

  assert.match(overflowScheduleBlock, /openChatScheduleModal\(\)/);
  assert.match(overflowScheduleBlock, /Schedule/);
  assert.match(attachScheduleBlock, /openChatScheduleModal/);
  assert.match(attachScheduleBlock, /Review Schedule/);
  assert.match(conversationThreadSource, /Scheduling is managed by the professional/);
});

test("schedule handoff keeps Schedule as the visit owner and labels the return action safely", () => {
  const scheduleReturnBlock = sourceBlock(
    contractorDashboardSource,
    "{evaluationTarget.conversationId && (",
    "{linkedJobQuote && ("
  );

  assert.match(scheduleReturnBlock, /localStorage\.setItem\("conversationReturnSection", "schedule"\)/);
  assert.match(scheduleReturnBlock, /setPage\("conversationThread"\)/);
  assert.match(scheduleReturnBlock, /Send to Customer/);
  assert.doesNotMatch(scheduleReturnBlock, /Continue Conversation/);
  assert.match(contractorDashboardSource, /async function shareExternalScheduleVisit/);
  assert.match(contractorDashboardSource, /Share\.share/);
  assert.match(contractorDashboardSource, /sms:\$\{encodeURIComponent\(phone\)\}/);
});

test("save to contacts writes scoped relationship aliases for business and personal modes", () => {
  const saveContactBlock = sourceBlock(
    conversationThreadSource,
    "function saveThreadRelationshipToContacts() {",
    "const activeProjectStageText = String("
  );

  assert.match(saveContactBlock, /const contactScope = getThreadContactScope\(\)/);
  assert.match(saveContactBlock, /const contactProfileId = getThreadContactProfileId\(\)/);
  assert.match(saveContactBlock, /const contactProfileScopeKey = getThreadContactProfileScopeKey\(\)/);
  assert.match(saveContactBlock, /relationship_scope: contactScope/);
  assert.match(saveContactBlock, /account_mode: contactScope/);
  assert.match(saveContactBlock, /ownerProfileId: contactProfileId/);
  assert.match(saveContactBlock, /ownerProfileScopeKey: contactProfileScopeKey/);
  assert.match(saveContactBlock, /contactProfileScopeKey/);
  assert.match(saveContactBlock, /businessId: linkedId/);
  assert.match(saveContactBlock, /professionalId: linkedId/);
  assert.match(saveContactBlock, /providerId: linkedId/);
  assert.match(saveContactBlock, /customerId: linkedId/);
  assert.match(saveContactBlock, /homeownerId: linkedId/);
  assert.match(saveContactBlock, /userId: linkedId/);
  assert.match(saveContactBlock, /businessPhone: activeCallPhone/);
  assert.match(saveContactBlock, /customerPhone: activeCallPhone/);
  assert.match(saveContactBlock, /businessEmail: relationshipContactEmail/);
  assert.match(saveContactBlock, /customerEmail: relationshipContactEmail/);
});

test("save to contacts matches only the active profile scope", () => {
  assert.match(conversationThreadSource, /function getThreadContactProfileId\(\)/);
  assert.match(conversationThreadSource, /function getThreadContactProfileScopeKey\(\)/);
  assert.match(conversationThreadSource, /function getSavedContactProfileScopeKey\(record = \{\}\)/);
  assert.match(conversationThreadSource, /record\.contactProfileScopeKey/);
  assert.match(conversationThreadSource, /record\.ownerProfileScopeKey/);
  assert.match(conversationThreadSource, /record\.profileScopeKey/);
  assert.match(
    conversationThreadSource,
    /if \(!recordScope \|\| recordScope !== targetScope\) return false;/
  );
  assert.match(
    conversationThreadSource,
    /return recordProfileScopeKey === targetProfileScopeKey;/
  );
  assert.match(
    conversationThreadSource,
    /`saved-contact-\$\{normalizeSavedContactMatchKey\(contactProfileScopeKey\)\}-\$\{contactType\}-\$\{contactSeed\}`/
  );
});

test("relationship identity avatars do not come from generic project or request image fields", () => {
  const rowAvatarBlock = sourceBlock(
    messagesInboxSource,
    "function getExplicitConversationAvatar(record = {}) {",
    "function applyLiveConversationAvatar"
  );

  assert.doesNotMatch(relationshipIdentitySource, /record\.(imageUrl|image_url|photoUrl|photo_url)/);
  assert.doesNotMatch(conversationIdentitySource, /source\.(imageUrl|image_url|photoUrl|photo_url)/);
  assert.doesNotMatch(rowAvatarBlock, /record\.(imageUrl|image_url|photoUrl|photo_url)/);
  assert.match(relationshipIdentitySource, /getScopedProfilePhoto\("business", record, safeStorage\)/);
  assert.match(relationshipIdentitySource, /getPersonalProfilePhotoForRecord\(record, safeStorage\)/);
});

test("business can edit an existing schedule card through the same visit id", () => {
  assert.match(conversationThreadSource, /const getScheduleMessageVisitId = \(message = \{\}\) =>/);
  assert.match(conversationThreadSource, /message\?\.schedule\?\.visitId/);
  assert.match(conversationThreadSource, /const editScheduleFromMessage = \(scheduleMessage = \{\}\) => \{/);
  assert.match(conversationThreadSource, /localStorage\.setItem\("meetroScheduleEditId", scheduleId\)/);
  assert.match(conversationThreadSource, /localStorage\.setItem\("activeWorkScheduleId", scheduleId\)/);
  assert.match(conversationThreadSource, /onClick=\{\(\) => editScheduleFromMessage\(appointmentDetails\)\}/);
});

test("schedule updates resend a replacement card without creating a duplicate visit", () => {
  assert.match(contractorDashboardSource, /const isScheduleUpdate = Boolean\(editingScheduleId && existingVisit\)/);
  assert.match(contractorDashboardSource, /id: editingScheduleId \|\| `schedule-\$\{Date\.now\(\)\}`/);
  assert.match(contractorDashboardSource, /newVisit\.visitId = newVisit\.visitId \|\| newVisit\.id/);
  assert.match(contractorDashboardSource, /workflowType: isWorkSchedule[\s\S]*"appointment_updated"[\s\S]*"appointment_scheduled"/);
  assert.match(contractorDashboardSource, /const replacedScheduleMessageIds = \[\]/);
  assert.match(contractorDashboardSource, /isOutdated: true/);
  assert.match(contractorDashboardSource, /confirmationStatus: "replaced"/);
  assert.match(contractorDashboardSource, /replacedByScheduleMessageId: scheduleMessageId/);
  assert.match(contractorDashboardSource, /JSON\.stringify\(\[\.\.\.updatedExistingMessages, scheduleMessage\]\)/);
  assert.doesNotMatch(contractorDashboardSource, /if \(!editingScheduleId && conversationId\) \{/);
});

test("schedule edit handoff preserves relationship and conversation linkage", () => {
  assert.match(contractorDashboardSource, /localStorage\.getItem\("meetroScheduleEditId"\)/);
  assert.match(contractorDashboardSource, /startEditScheduleVisit\(visit\)/);
  assert.match(contractorDashboardSource, /relationshipId: item\.relationshipId \|\| item\.relationship_id \|\| ""/);
  assert.match(contractorDashboardSource, /customerAccountId:[\s\S]*item\.customerAccountId[\s\S]*item\.customerId[\s\S]*item\.homeownerId/);
  assert.match(contractorDashboardSource, /externalContactId:[\s\S]*item\.externalContactId[\s\S]*item\.manualCustomerContactId[\s\S]*item\.contactId/);
  assert.match(contractorDashboardSource, /businessId: item\.businessId \|\| item\.business_id \|\| ""/);
  assert.match(contractorDashboardSource, /scheduleDedupeKey: item\.scheduleDedupeKey \|\| ""/);
});
