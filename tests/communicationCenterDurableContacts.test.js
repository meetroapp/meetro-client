import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const messagesSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);
const apiSource = readFileSync(
  new URL("../src/utils/businessContactsApi.js", import.meta.url),
  "utf8"
);
const messagesLanguageSource = readFileSync(
  new URL("../src/utils/messagesWorkflowLanguage.js", import.meta.url),
  "utf8"
);

test("Communication Center loads durable business Contacts alongside unchanged conversations", () => {
  assert.match(messagesSource, /listBusinessContacts\(\{/);
  assert.match(messagesSource, /messageSection === "contacts" \? contactStatusFilter : "ACTIVE"/);
  assert.match(messagesSource, /status,/);
  assert.match(messagesSource, /messageSection === "contacts" \? searchQuery : ""/);
  assert.match(messagesSource, /const liveIdentityQuotes = quotes\.map/);
  assert.match(messagesSource, /contactsForCurrentWorkspace\.map\(projectBusinessContactRecord\)/);
});

test("Contacts default to ACTIVE and expose a bounded ARCHIVED directory", () => {
  assert.match(messagesSource, /useState\("ACTIVE"\)/);
  assert.match(messagesSource, /\["ACTIVE", "messagesActiveContacts"\]/);
  assert.match(messagesSource, /\["ARCHIVED", "messagesArchivedContacts"\]/);
  assert.match(messagesSource, /aria-pressed=\{contactStatusFilter === status\}/);
  assert.match(messagesSource, /onClick=\{\(\) => setContactStatusFilter\(status\)\}/);
  assert.match(messagesSource, /setActiveDurableBusinessContacts\(contacts\)/);
  assert.match(messagesSource, /activeContactRelationshipLayer\.relationships/);
  assert.match(messagesSource, /contactStatusFilter, messageSection, searchQuery/);
  assert.match(apiSource, /status = "ACTIVE"/);
  assert.match(apiSource, /contact\?\.status === requestedStatus/);
});

test("archived Contact detail remains readable without another Archive action", () => {
  assert.match(messagesSource, /record\.durableBusinessContact && record\.archived/);
  assert.match(messagesSource, /Archived business Contact/);
  assert.match(messagesSource, /record\.durableBusinessContact && !record\.archived[\s\S]*Archive Contact/);
  assert.doesNotMatch(apiSource, /unarchive|restoreBusinessContact|deleteBusinessContact/);
});

test("Saved Conversation History is conversation-scoped and placed before lists", () => {
  assert.match(
    messagesSource,
    /const savedHistoryVisible =\s*messageSection === "conversations" && savedHistoryOpen;/
  );
  assert.match(
    messagesSource,
    /messageSection === "conversations" && !savedHistoryVisible/
  );
  assert.match(messagesSource, /data-conversation-history-navigation="true"/);
  assert.match(messagesSource, /\{savedHistoryVisible && \(/);
  assert.doesNotMatch(messagesSource, /\{savedHistoryOpen && \(/);
  assert.ok(
    messagesSource.indexOf('data-conversation-history-navigation="true"') <
      messagesSource.indexOf("<div style={conversationList}>")
  );
});

test("Import Contacts describes durable Contacts rather than relationships", () => {
  assert.match(
    messagesLanguageSource,
    /Import creates a saved business Contact\. You can invite them to Meetro separately\./
  );
  assert.doesNotMatch(messagesLanguageSource, /relationship placeholder/i);
  assert.match(
    messagesSource,
    /<p style=\{filterEyebrow\}>\{t\("messagesSectionContacts", language\)\}<\/p>[\s\S]*messagesImportDescription/
  );
  assert.doesNotMatch(messagesSource, /Review these relationship placeholders/);
});

test("new manual Contacts use governed create and role assignment without registry persistence", () => {
  const durableBranch = messagesSource.match(
    /if \(createsContactPlaceholder\) \{[\s\S]*?return;\n\s{4}\}\n\s{4}const relationshipType/
  )?.[0] || "";
  assert.match(durableBranch, /createBusinessContactWithRole\(\{/);
  assert.match(durableBranch, /privateNote: relationshipComposer\.note\.trim\(\)/);
  assert.match(durableBranch, /partyType: relationshipComposer\.partyType/);
  assert.doesNotMatch(durableBranch, /saveConversationRegistryItem/);
  assert.doesNotMatch(durableBranch, /setQuotes/);
});

test("durable Contact edits retain UUID and optimistic version authority", () => {
  assert.match(messagesSource, /contactId: contactEditDraft\.contactId/);
  assert.match(messagesSource, /expectedVersion: contactEditDraft\.version/);
  assert.match(messagesSource, /reconcileBusinessContactRoles\(\{/);
  assert.match(messagesSource, /BUSINESS_CONTACT_VERSION_CONFLICT/);
  assert.match(messagesSource, /latest saved version was reloaded/);
});

test("role editing is multi-select and role removal uses the end-role API", () => {
  assert.match(messagesSource, /BUSINESS_CONTACT_ROLES\.map\(\(role\) =>/);
  assert.match(messagesSource, /type="checkbox"[\s\S]*toggleContactEditRole\(role\)/);
  assert.match(apiSource, /\/roles\/\$\{encodeURIComponent\(text\(roleId\)\)\}\/end/);
  assert.doesNotMatch(apiSource, /method:\s*"DELETE"/);
});

test("archive preserves server history and no destructive Contact delete exists", () => {
  assert.match(messagesSource, /archiveBusinessContact\(\{/);
  assert.match(messagesSource, /History was preserved/);
  assert.match(apiSource, /\/archive`/);
  assert.doesNotMatch(apiSource, /deleteBusinessContact/);
});

test("Contact import uses durable idempotent creation and keeps partial failures visible", () => {
  const importBlock = messagesSource.match(
    /async function saveContactImport\(\) \{[\s\S]*?\n\s{2}\}\n\n\s{2}function upsertDurableBusinessContact/
  )?.[0] || "";
  assert.match(importBlock, /importBusinessContacts\(\{/);
  assert.match(importBlock, /importFailures: result\.failures/);
  assert.match(importBlock, /Failed Contacts remain below for review and retry/);
  assert.match(importBlock, /describeBusinessContactDuplicateCandidates/);
  assert.match(messagesSource, /Nothing was merged/);
  assert.doesNotMatch(importBlock, /saveConversationRegistryItem/);
});

test("saved Contact presentation never claims invitation or matching means linked", () => {
  assert.match(messagesSource, /Saved business Contact · Meetro account not linked/);
  assert.match(apiSource, /meetroAccountLinked: false/);
  assert.match(apiSource, /conversation_type: "standard"/);
  assert.doesNotMatch(apiSource, /request_relationship|\/jobs|\/quotes|\/users|\/conversations/);
});

test("durable Contact controls expose truthful accessible loading and saving states", () => {
  assert.match(messagesSource, /role="status" aria-live="polite"/);
  assert.match(messagesSource, /Loading saved business Contacts/);
  assert.match(messagesSource, /disabled=\{businessContactSaving\}/);
  assert.match(messagesSource, /businessContactSaving \? "Saving…"/);
});
