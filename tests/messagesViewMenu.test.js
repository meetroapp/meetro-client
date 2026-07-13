import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { t } from "../src/utils/language.js";

const messagesSource = fs.readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);
const conversationThreadSource = fs.readFileSync(
  new URL("../src/pages/ConversationThread.jsx", import.meta.url),
  "utf8"
);
const indexCssSource = fs.readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);
const liquidGlassSource = fs.readFileSync(
  new URL("../src/styles/liquidGlass.js", import.meta.url),
  "utf8"
);
const relationshipIdentityPageSource = fs.readFileSync(
  new URL("../src/components/RelationshipIdentityPage.jsx", import.meta.url),
  "utf8"
);
const relationshipIdentityResolverSource = fs.readFileSync(
  new URL("../src/utils/relationshipIdentity.js", import.meta.url),
  "utf8"
);
const safeBackBarSource = fs.readFileSync(
  new URL("../src/components/SafeBackBar.jsx", import.meta.url),
  "utf8"
);

test("Messages hub uses section navigation and a popover start action", () => {
  assert.match(messagesSource, /const MESSAGE_SECTION_OPTIONS = \[/);
  assert.match(messagesSource, /\["conversations", "Conversations"\]/);
  assert.match(messagesSource, /\["contacts", "Contacts"\]/);
  assert.match(messagesSource, /\["hiring", "Hiring"\]/);
  assert.match(messagesSource, /\["emergency", "Emergency"\]/);
  assert.match(messagesSource, /messagesHubHeader/);
  assert.match(messagesSource, /messagesHubTitle/);
  assert.match(messagesSource, />Communication Center<\/h1>/);
  assert.doesNotMatch(messagesSource, />Messages<\/h1>/);
  assert.match(messagesSource, /<SafeBackBar[\s\S]*compact/);
  assert.match(safeBackBarSource, /compact = false/);
  assert.match(safeBackBarSource, /compact\s+\?\s+"calc\(env\(safe-area-inset-top\) \+ 4px\) 0 8px"/);
  assert.match(messagesSource, /function getMessageSearchPlaceholder\(\)/);
  assert.match(messagesSource, /if \(messageSection === "contacts"\) return "Search Contacts"/);
  assert.match(messagesSource, /if \(messageSection === "hiring"\) return "Search Applicants"/);
  assert.match(messagesSource, /if \(messageSection === "emergency"\) return "Search Emergency"/);
  assert.match(messagesSource, /placeholder=\{getMessageSearchPlaceholder\(\)\}/);
  assert.match(messagesSource, /const IconNewChat = \(\) =>/);
  assert.match(messagesSource, /aria-label=\{getHeaderActionLabel\(\)\}/);
  assert.match(messagesSource, /title=\{getHeaderActionLabel\(\)\}/);
  assert.match(messagesSource, /messageSection === "conversations"\s*\?\s*relationshipNewChatButton\s*:\s*relationshipAddButton/);
  assert.match(messagesSource, /<IconNewChat \/> : "\+"/);
  assert.match(messagesSource, /sectionActionLabel/);
  assert.match(messagesSource, /relationshipActionDropdown/);
  assert.match(messagesSource, /aria-label=\{getHeaderActionMenuLabel\(\)\}/);
  assert.match(messagesSource, /width: "min\(268px, calc\(100dvw - 40px\)\)"/);
  assert.match(messagesSource, /relationshipDropdownItemLabel/);
  assert.match(messagesSource, /setRelationshipViewMenuOpen\(false\)/);
  assert.doesNotMatch(messagesSource, /aria-label="Message filters"/);
  assert.doesNotMatch(messagesSource, /messageQuickFilters/);
  assert.doesNotMatch(messagesSource, /setMessageView/);
  assert.doesNotMatch(messagesSource, /meetroMessageView/);
});

test("Messages list rows receive saved profile photos before relationship grouping", () => {
  assert.match(messagesSource, /function applyLiveConversationAvatar/);
  assert.match(messagesSource, /getScopedProfilePhoto\("business", record\)/);
  assert.match(messagesSource, /getPersonalProfilePhotoForRecord\(record\)/);
  assert.match(messagesSource, /const liveIdentityQuotes = quotes\.map/);
  assert.match(messagesSource, /createRelationshipLayerModel\(liveIdentityQuotes/);
  assert.match(messagesSource, /src=\{relationship\.avatar\}/);
});

test("Messages sections keep contacts as a fixed relationship directory anchor", () => {
  assert.match(messagesSource, /const CONTACT_SECTION_OPTION = \["contacts", "Contacts"\]/);
  assert.match(messagesSource, /const COMMUNICATION_SECTION_OPTIONS = \[/);
  assert.match(messagesSource, /const MESSAGE_SECTION_OPTIONS = \[\n\s+CONTACT_SECTION_OPTION,\n\s+\.\.\.COMMUNICATION_SECTION_OPTIONS,/);
  assert.match(messagesSource, /\["conversations", "Conversations"\]/);
  assert.match(messagesSource, /\["hiring", "Hiring"\]/);
  assert.match(messagesSource, /\["emergency", "Emergency"\]/);
  assert.match(messagesSource, /aria-label="Communication Center navigation"/);
  assert.match(messagesSource, /aria-label="Open Contacts"/);
  assert.match(messagesSource, /contactsDirectoryTab/);
  assert.match(messagesSource, /aria-label="Communication contexts"/);
  assert.match(messagesSource, /COMMUNICATION_SECTION_OPTIONS\.map/);
  assert.match(messagesSource, /communicationSectionTabs/);
  assert.match(messagesSource, /normalizeMessageSection/);
  assert.match(messagesSource, /meetroMessageSection/);
  assert.match(messagesSource, /getMessageSectionRelationships\(\s*messageSection/);
  assert.match(messagesSource, /if \(section === "contacts"\) return inactiveContact/);
  assert.match(messagesSource, /if \(section === "hiring"\) return !inactiveContact && hiringConversation/);
  assert.match(messagesSource, /if \(section === "emergency"\) return !inactiveContact && emergencyConversation/);
  assert.match(messagesSource, /activeConversation &&/);
  assert.match(messagesSource, /if \(messageSection === "contacts" && !options\.fromStarter\) \{\n\s+openContactCard\(relationship\)/);
  assert.doesNotMatch(messagesSource, /COMMUNICATION_SECTION_OPTIONS = \[[\s\S]*\["contacts", "Contacts"\]/);
  assert.doesNotMatch(messagesSource, /getRelationshipViewRelationships/);
});

test("Messages adopts shared Liquid Glass visual primitives", () => {
  assert.match(liquidGlassSource, /export const glassSurface/);
  assert.match(liquidGlassSource, /export const glassPill/);
  assert.match(liquidGlassSource, /export const glassActionMenu/);
  assert.match(liquidGlassSource, /export const softPageSection/);
  assert.match(liquidGlassSource, /export const nativeContactRow/);
  assert.match(liquidGlassSource, /export const bottomActionBar/);
  assert.match(liquidGlassSource, /export const keyboardSafeFlowPage/);
  assert.match(messagesSource, /from "\.\.\/styles\/liquidGlass"/);
  assert.match(messagesSource, /\.\.\.glassNavigationSurface/);
  assert.match(messagesSource, /\.\.\.glassPill/);
  assert.match(messagesSource, /\.\.\.glassActionMenu/);
  assert.match(messagesSource, /\.\.\.nativeContactRow/);
  assert.match(messagesSource, /\.\.\.bottomActionBar/);
  assert.match(messagesSource, /\.\.\.keyboardSafeFlowPage/);
  assert.match(conversationThreadSource, /from "\.\.\/styles\/liquidGlass"/);
  assert.match(conversationThreadSource, /\.\.\.glassNavigationSurface/);
  assert.match(conversationThreadSource, /\.\.\.glassActionMenu/);
  assert.match(conversationThreadSource, /\.\.\.nativeContactRow/);
  assert.match(conversationThreadSource, /\.\.\.keyboardSafeFlowPage/);
});

test("Messages start actions stay simple and avoid architecture labels", () => {
  assert.match(messagesSource, /const CONVERSATION_SECTION_ACTIONS = \[/);
  assert.match(messagesSource, /\["chat", "New Conversation"\]/);
  assert.match(messagesSource, /\["group", "New Group Conversation"\]/);
  assert.match(messagesSource, /function getMessageSectionActions\(\)/);
  assert.match(messagesSource, /if \(messageSection === "conversations"\) return "New Conversation"/);
  assert.match(messagesSource, /if \(messageSection === "contacts"\) return "Add \/ Import"/);
  assert.match(messagesSource, /if \(messageSection === "hiring"\) return "Open Hiring Center"/);
  assert.match(messagesSource, /if \(messageSection === "emergency"\) return "Open Emergency"/);
  assert.match(messagesSource, /const relationshipNewChatButton = \{/);
  assert.doesNotMatch(messagesSource, /Create Relationship Space|Relationship Layer|Business DNA|Understanding Engine/);
  assert.doesNotMatch(messagesSource, /relationship space/i);
});

test("Communication naming keeps relationship intent distinct without changing routes", () => {
  assert.match(messagesSource, />Communication Center<\/h1>/);
  assert.match(messagesSource, /aria-label="Communication Center navigation"/);
  assert.match(messagesSource, /Search Conversations/);
  assert.match(messagesSource, /Hiring conversation started in Communication Center\./);
  assert.match(messagesSource, /Emergency conversation started in Communication Center\./);
  assert.match(messagesSource, /Conversation started in Communication Center\./);
  assert.match(messagesSource, /Start a conversation when communication is ready\./);
  assert.match(messagesSource, /setPage\("hiringCenter"\)/);
  assert.match(messagesSource, /if \(type === "chat"\)/);
  assert.match(messagesSource, /setConversationStarter\(createEmptyConversationStarter\("single"\)\)/);
  assert.match(messagesSource, /if \(type === "group"\)/);
  assert.match(messagesSource, /setConversationStarter\(createEmptyConversationStarter\("group"\)\)/);
  assert.doesNotMatch(messagesSource, />Messages<\/h1>/);
  assert.doesNotMatch(messagesSource, /New Chat|New Group Chat|Start a chat|Message Center|Threads|Feed|Posts/);
});

test("Messages Hiring stays communication-only and routes setup to Hiring Center", () => {
  const hiringActionsBlock = messagesSource.slice(
    messagesSource.indexOf("const HIRING_SECTION_ACTIONS"),
    messagesSource.indexOf("const EMERGENCY_SECTION_ACTIONS")
  );

  assert.match(hiringActionsBlock, /\["hiringCenter", "Open Hiring Center"\]/);
  assert.doesNotMatch(hiringActionsBlock, /Start Hiring Conversation|Add Applicant|\["hiring",/);
  assert.match(messagesSource, /if \(type === "hiringCenter"\)/);
  assert.match(messagesSource, /setPage\("hiringCenter"\)/);
  assert.match(messagesSource, /No hiring conversations yet/);
  assert.match(messagesSource, /Applicants will appear here after they contact you or you start a conversation from Hiring Center\./);
});

test("New conversation flow starts from contacts without an intermediate source form", () => {
  assert.match(messagesSource, /function createEmptyConversationStarter\(mode = "single"\)/);
  assert.match(messagesSource, /step: "select"/);
  assert.match(messagesSource, /source: "contacts"/);
  assert.match(messagesSource, /const \[conversationStarter, setConversationStarter\] = useState\(null\)/);
  assert.match(messagesSource, /if \(type === "chat"\)/);
  assert.match(messagesSource, /setConversationStarter\(createEmptyConversationStarter\("single"\)\)/);
  assert.match(messagesSource, /if \(type === "group"\)/);
  assert.match(messagesSource, /setConversationStarter\(createEmptyConversationStarter\("group"\)\)/);
  assert.doesNotMatch(messagesSource, /const CONVERSATION_SOURCE_OPTIONS/);
  assert.doesNotMatch(messagesSource, /chooseConversationSource/);
  assert.doesNotMatch(messagesSource, /moveConversationStarterToGroupSetup/);
  assert.doesNotMatch(messagesSource, /conversationStarter\.step === "source"/);
  assert.match(messagesSource, /conversationStarter\.step === "select"/);
  assert.doesNotMatch(messagesSource, /conversationStarter\.step === "groupSetup"/);
  assert.match(messagesSource, /conversationStarter\.mode === "group"[\s\S]*\? "New Group Conversation"[\s\S]*: "Choose Contacts"/);
  assert.match(messagesSource, /placeholder="Search contacts"/);
  assert.match(messagesSource, /conversationStarterToLabel/);
  assert.match(messagesSource, />To:<\/span>/);
  assert.match(messagesSource, /startContactFromConversationPicker/);
  assert.match(messagesSource, /returnToStarter: true/);
  assert.match(messagesSource, /relationshipCanOpenConversation\(relationship\)/);
  assert.match(messagesSource, /function startSelectedConversation\(\)/);
  assert.match(messagesSource, /const singleSelectionCanContinue =/);
  assert.match(messagesSource, /disabled=\{!singleSelectionCanContinue\}/);
  assert.match(messagesSource, /onClick=\{startSelectedConversation\}[\s\S]*Message/);
  assert.match(messagesSource, /openRelationshipConversation\(selectedRelationship, \{ fromStarter: true \}\)/);
  assert.match(messagesSource, /openRelationshipConversation\(relationship\)/);
  assert.match(messagesSource, /Group name optional/);
  assert.match(messagesSource, /Create Group/);
  assert.match(messagesSource, /startSelectedGroupConversation/);
  assert.doesNotMatch(messagesSource, /readyToMessage\s*\?\s*"Open"/);
});

test("Messages landing stays relationship-inbox first", () => {
  const headerIndex = messagesSource.indexOf("messagesHubHeader");
  const tabsIndex = messagesSource.indexOf('aria-label="Communication Center navigation"');
  const searchIndex = messagesSource.indexOf('id="messages-search"');
  const rowsIndex = messagesSource.indexOf("searchedVisibleQuotes.map");

  assert.ok(headerIndex > 0);
  assert.ok(tabsIndex > headerIndex);
  assert.ok(searchIndex > 0);
  assert.ok(searchIndex > tabsIndex);
  assert.ok(rowsIndex > searchIndex);
  assert.match(messagesSource, /getRelationshipPreviewText\(relationship\)/);
  assert.match(messagesSource, /Saved contact · Invite to Meetro/);
  assert.doesNotMatch(messagesSource, /messagesAttentionSummary|unreadHeroBadge|pageSubtitle|filterCards/);
  assert.doesNotMatch(messagesSource, /Revenue|dashboard summary|lead panel/i);
});

test("Messages Conversations excludes contact-only relationship placeholders", () => {
  assert.match(messagesSource, /function isRealConversationThread\(quote = \{\}\)/);
  assert.match(messagesSource, /function isContactOnlyConversationRecord\(quote = \{\}\)/);
  assert.match(messagesSource, /function hasInitializedConversationThread\(quote = \{\}, conversationId = ""\)/);
  assert.match(messagesSource, /function hasLocalConversationThread\(conversationId = ""\)/);
  assert.match(messagesSource, /if \(!isRealConversationThread\(quote\)\) return false/);
  assert.match(messagesSource, /quote\.contactImported === true && quote\.meetroAccountLinked !== true/);
  assert.match(messagesSource, /quote\.contactImported === true && quote\.savedToContacts === true/);
  assert.match(messagesSource, /statusText\.includes\("imported contact"\)/);
  assert.match(messagesSource, /statusText\.includes\("saved contact"\)/);
  assert.match(messagesSource, /statusText\.includes\("saved from conversation"\)/);
  assert.match(messagesSource, /statusText\.includes\("invite to meetro later"\)/);
  assert.match(messagesSource, /hasLocalConversationThread\(id\)/);
  assert.match(messagesSource, /\^\(relationship-chat\|conversation-group\|business_\|conversation-business\|emergency\|hiring\)/);
});

test("Messages blocks stale local rows when account connection is inactive", () => {
  assert.match(messagesSource, /getStoredAccountConnectionState/);
  assert.match(messagesSource, /getAccountConnectionStateFromAuthResult/);
  assert.match(messagesSource, /const \[accountConnectionState, setAccountConnectionState\]/);
  assert.match(messagesSource, /window\.addEventListener\(\n\s+"meetroAccountConnectionIssue"/);
  assert.match(messagesSource, /function shouldBlockMessagesForConnection\(state = \{\}\)/);
  assert.match(messagesSource, /if \(shouldBlockMessagesForConnection\(storedConnectionState\)\) \{/);
  assert.match(messagesSource, /setAccountConnectionState\(storedConnectionState\)/);
  assert.match(messagesSource, /setQuotes\(\[\]\)/);
  assert.match(messagesSource, /if \(shouldBlockMessagesForConnection\(resultConnectionState\)\) \{/);
  assert.match(messagesSource, /reason: "local_messages"/);
  assert.match(messagesSource, /if \(!accountConnectionState\.connected\) \{/);
  assert.match(messagesSource, /Communication Center account recovery/);
  assert.match(messagesSource, /Reconnect Account/);
});

test("Messages action cards and thread surfaces lock horizontal overflow", () => {
  assert.match(messagesSource, /messages-inbox-page/);
  assert.match(messagesSource, /messages-focused-flow-open/);
  assert.match(messagesSource, /document\.body\.classList\.add\("messages-focused-flow-open"\)/);
  assert.match(indexCssSource, /\.messages-focused-flow-open \.meetro-assistant-launcher/);
  assert.match(messagesSource, /overscrollBehaviorX: "none"/);
  assert.match(messagesSource, /const messageSectionNavigation = \{[\s\S]*gridTemplateColumns: "auto minmax\(0, 1fr\)"/);
  assert.match(messagesSource, /const communicationSectionTabs = \{[\s\S]*\.\.\.messageSectionTabs/);
  assert.match(messagesSource, /const messageSectionTabs = \{[\s\S]*overflowX: "auto"[\s\S]*WebkitOverflowScrolling: "touch"/);
  assert.match(messagesSource, /scrollPaddingBottom: "calc\(160px \+ env\(safe-area-inset-bottom, 0px\)\)"/);
  assert.match(messagesSource, /const relationshipPanel = \{\n\s+\.\.\.glassSurface,[\s\S]*width: "100%"/);
  assert.match(messagesSource, /const relationshipFieldGrid = \{\n\s+display: "grid",\n\s+gridTemplateColumns: "repeat\(auto-fit, minmax\(min\(180px, 100%\), 1fr\)\)"/);
  assert.match(messagesSource, /const conversationRow = \{\n\s+\.\.\.nativeContactRow,[\s\S]*width: "100%",\n\s+maxWidth: "100%",\n\s+minWidth: 0/);
  assert.match(conversationThreadSource, /const threadMenu = \{[\s\S]*width: "min\(250px, calc\(100vw - 32px\)\)"/);
  assert.match(conversationThreadSource, /const composer = \{[\s\S]*width: "100%"[\s\S]*overflowX: "hidden"/);
  assert.doesNotMatch(messagesSource, /width: "100vw"/);
  assert.doesNotMatch(conversationThreadSource, /overflowX: "auto"|width: "100vw"/);
});

test("Choose contact flow is a focused mobile page with keyboard-safe scrolling", () => {
  assert.match(messagesSource, /focusedConversationFlowOpen/);
  assert.match(messagesSource, /!\{?focusedConversationFlowOpen/);
  assert.match(messagesSource, /const focusedConversationPageWrapper = \{/);
  assert.match(messagesSource, /const conversationStarterPanel = \{[\s\S]*minHeight: "calc\(100dvh/);
  assert.match(messagesSource, /const conversationStarterSearchRow = \{[\s\S]*position: "sticky"/);
  assert.match(messagesSource, /const conversationStarterList = \{[\s\S]*maxHeight: "min\(54dvh, 430px\)"[\s\S]*overflowY: "auto"/);
  assert.match(messagesSource, /paddingBottom: "calc\(118px \+ env\(safe-area-inset-bottom, 0px\)\)"/);
  assert.match(messagesSource, /scrollPaddingBottom: "calc\(118px \+ env\(safe-area-inset-bottom, 0px\)\)"/);
  assert.match(messagesSource, /const conversationStarterFooterRow = \{\n\s+\.\.\.bottomActionBar,[\s\S]*position: "sticky"/);
  assert.match(messagesSource, /bottom: "calc\(78px \+ env\(safe-area-inset-bottom, 0px\)\)"/);
  assert.match(messagesSource, /const groupSelectionCanContinue =/);
  assert.match(messagesSource, /selectedConversationStarterRelationships\.filter\(relationshipCanOpenConversation\)\.length >= 2/);
  assert.match(messagesSource, /disabled=\{!groupSelectionCanContinue\}/);
  assert.match(messagesSource, /onClick=\{startSelectedGroupConversation\}[\s\S]*Create Group/);
  assert.match(messagesSource, /relationshipDisabledAction/);
});

test("Messages page wrappers initialize before relationship identity render can trip the route boundary", () => {
  const focusedWrapperIndex = messagesSource.indexOf(
    "const focusedConversationPageWrapper = {"
  );
  const identityWrapperIndex = messagesSource.indexOf(
    "const relationshipIdentityPageWrapper = {"
  );
  const identityWrapperBody = messagesSource.slice(
    identityWrapperIndex,
    messagesSource.indexOf("const splitPageWrapper = {")
  );

  assert.notEqual(focusedWrapperIndex, -1);
  assert.notEqual(identityWrapperIndex, -1);
  assert.ok(
    focusedWrapperIndex < identityWrapperIndex,
    "focusedConversationPageWrapper must be initialized before relationshipIdentityPageWrapper spreads it"
  );
  assert.match(identityWrapperBody, /\.\.\.focusedConversationPageWrapper/);
  assert.doesNotMatch(
    identityWrapperBody,
    /Cannot access 'focusedConversationPageWrapper' before initialization/
  );
});

test("Messages exposes Import Contacts as a reviewable relationship flow", () => {
  const conversationActionsBlock = messagesSource.slice(
    messagesSource.indexOf("const CONVERSATION_SECTION_ACTIONS"),
    messagesSource.indexOf("const CONTACTS_SECTION_ACTIONS")
  );
  const contactsActionsBlock = messagesSource.slice(
    messagesSource.indexOf("const CONTACTS_SECTION_ACTIONS"),
    messagesSource.indexOf("const HIRING_SECTION_ACTIONS")
  );

  assert.match(messagesSource, /if \(messageSection === "contacts"\) return CONTACTS_SECTION_ACTIONS/);
  assert.match(conversationActionsBlock, /\["chat", "New Conversation"\]/);
  assert.match(conversationActionsBlock, /\["group", "New Group Conversation"\]/);
  assert.doesNotMatch(conversationActionsBlock, /Import Contacts/);
  assert.match(contactsActionsBlock, /\["import", "Import Contacts"\]/);
  assert.doesNotMatch(contactsActionsBlock, /New Conversation|New Group Conversation/);
  assert.match(messagesSource, /Import Contacts/);
  assert.match(messagesSource, /Import from phone contacts/);
  assert.match(messagesSource, /Import from computer file/);
  assert.match(messagesSource, /Select contacts manually/);
  assert.match(messagesSource, /Select all contacts/);
  assert.match(messagesSource, /Review before importing/);
  assert.match(messagesSource, /Invite activates their Meetro participation later/);
  assert.match(messagesSource, /buildImportedContactRelationship/);
  assert.match(messagesSource, /setMessageSection\("contacts"\)/);
});

test("Messages keeps Saved Conversation History as secondary history, not a section primary action", () => {
  assert.match(messagesSource, /const SAVED_HISTORY_ACTION = \["savedHistory", "Saved Conversation History"\]/);
  assert.match(messagesSource, /aria-label="Communication Center secondary actions"/);
  assert.match(messagesSource, /style=\{savedHistorySecondaryButton\}/);
  assert.match(messagesSource, /openRelationshipAction\(\.\.\.SAVED_HISTORY_ACTION\)/);
  assert.match(messagesSource, /Conversations you save manually/);
  assert.doesNotMatch(messagesSource, /return \[\.\.CONVERSATION_SECTION_ACTIONS, SAVED_HISTORY_ACTION\]/);
  assert.doesNotMatch(messagesSource, /return \[\.\.CONTACTS_SECTION_ACTIONS, SAVED_HISTORY_ACTION\]/);
  assert.doesNotMatch(messagesSource, /return \[\.\.HIRING_SECTION_ACTIONS, SAVED_HISTORY_ACTION\]/);
  assert.doesNotMatch(messagesSource, /return \[\.\.EMERGENCY_SECTION_ACTIONS, SAVED_HISTORY_ACTION\]/);
});

test("Messages startup recovery paths do not reference undefined fallback state", () => {
  assert.match(messagesSource, /function readActiveEmergencyRecord\(\)/);
  assert.match(messagesSource, /const activeEmergencyRecord = readActiveEmergencyRecord\(\)/);
  assert.match(messagesSource, /setQuotes\(\[\]\)/);
  assert.match(messagesSource, /function shouldBlockMessagesForConnection\(state = \{\}\)/);
  assert.match(messagesSource, /setAccountConnectionState\(\{ connected: true, reason: "local_messages" \}\)/);
  assert.doesNotMatch(messagesSource, /demoQuotes/);
});

test("Messages opens imported inactive contacts as relationship identity before conversations", () => {
  assert.match(relationshipIdentityPageSource, /aria-label="Relationship Identity"/);
  assert.match(messagesSource, /import RelationshipIdentityPage/);
  assert.match(messagesSource, /import \{ resolveRelationshipIdentity \}/);
  assert.match(messagesSource, /const resolvedIdentity = resolveRelationshipIdentity/);
  assert.match(messagesSource, /<RelationshipIdentityPage/);
  assert.match(messagesSource, /Invite when you are ready to continue this relationship in Meetro\./);
  assert.match(messagesSource, /if \(activeContactCard\) \{\n\s+return \(/);
  assert.match(
    messagesSource,
    /className="app-page meetro-wide-page meetro-visual-page messages-relationship-identity-page messages-focused-flow-open"/
  );
  assert.match(messagesSource, /relationshipIdentityPageWrapper/);
  assert.match(messagesSource, /{renderContactCard\(activeContactCard\)}/);
  assert.match(messagesSource, /relationshipIdentityReturnScrollRef/);
  assert.match(messagesSource, /window\.scrollTo\(\{ top: returnScrollTop, left: 0, behavior: "auto" \}\)/);
  assert.match(messagesSource, /<BottomNav setPage=\{setPage\} currentPage="messagesInbox" \/>/);
  assert.doesNotMatch(messagesSource, /\{activeContactCard && renderContactCard\(activeContactCard\)\}/);
  assert.match(messagesSource, /Saved contact · Invite to Meetro/);
  assert.match(messagesSource, /isImportedInactiveRelationship\(relationship\)/);
  assert.match(messagesSource, /if \(messageSection === "contacts" && !options\.fromStarter\) \{\n\s+openContactCard\(relationship\)/);
  assert.match(messagesSource, /if \(isImportedInactiveRelationship\(relationship\)\) \{\n\s+openContactCard\(relationship\)/);
  assert.match(messagesSource, /openContactCard\(relationship\)/);
  assert.match(messagesSource, /contactImported: createsContactPlaceholder/);
  assert.match(messagesSource, /meetroAccountLinked: createsContactPlaceholder \? false : undefined/);
  assert.match(messagesSource, /function openLinkedRelationshipChat\(relationship\)/);
  assert.match(messagesSource, /const conversationId = getLinkedRelationshipConversationId\(relationship\)/);
  assert.match(messagesSource, /function getLinkedRelationshipConversationId\(relationship = \{\}\)/);
  assert.match(messagesSource, /record\.sourceConversationId/);
  assert.match(messagesSource, /function persistRelationshipConversationId\(relationship = \{\}, conversationId = ""\)/);
  assert.match(messagesSource, /function openConversationIdFast\(conversationId, conversationRecord = \{\}, options = \{\}\)/);
  assert.match(messagesSource, /openConversationIdFast\(conversationId, getConversationById\(conversationId\) \|\| getRelationshipContactRecord\(relationship\)\)/);
  assert.match(messagesSource, /if \(existingConversation\) return existingConversation/);
  assert.doesNotMatch(messagesSource, /resolvedIdentity\.displayName \|\|\s*Date\.now\(\)/);
  assert.match(messagesSource, /function createConversationFromRelationship\(relationship = \{\}\)/);
  assert.match(messagesSource, /Conversation started from this saved relationship\./);
  assert.match(messagesSource, /isLinked\s+\?\s+\[/);
  assert.match(messagesSource, /Meetro Chat/);
  assert.match(messagesSource, /Connected in Meetro\./);
  assert.match(messagesSource, /const contactTypeLabel = isProfessionalBusinessContact/);
  assert.match(messagesSource, /"Professional \/ Business"/);
  assert.match(messagesSource, /Edit \/ More/);
  assert.match(messagesSource, /Invite to Meetro/);
  assert.match(messagesSource, /label: "Text", onClick: \(\) => textRelationship\(relationship\)/);
  assert.match(messagesSource, /label: "Call", onClick: \(\) => callRelationship\(relationship\)/);
  assert.match(messagesSource, /label: "Email", onClick: \(\) => emailRelationship\(relationship\)/);
  assert.match(messagesSource, /label: "Edit Contact", onClick: \(\) => openEditContact\(relationship\)/);
  assert.doesNotMatch(messagesSource, /Send SMS \/ iPhone Message/);
  assert.match(relationshipIdentityPageSource, /identityFactLabel/);
  assert.match(relationshipIdentityPageSource, /identityFactValue/);
  assert.match(messagesSource, /getContactLocationFact/);
  assert.match(messagesSource, /label: "Address"/);
  assert.match(messagesSource, /label: "Service Area"/);
  assert.match(messagesSource, /locationContactRow/);
  assert.match(relationshipIdentityPageSource, /identityWide/);
  assert.match(relationshipIdentityPageSource, /gridColumn: "1 \/ -1"/);
  assert.match(relationshipIdentityPageSource, /whiteSpace: "pre-wrap"/);
  assert.match(relationshipIdentityPageSource, /wordBreak: "break-word"/);
  assert.match(relationshipIdentityPageSource, /alignItems: "stretch"/);
  assert.match(messagesSource, /title: "Notes"/);
  assert.match(messagesSource, /title: "Relationship Memory"/);
  assert.match(messagesSource, /function openRelationshipHistory\(relationship = \{\}, historyType = "work"\)/);
  assert.match(messagesSource, /meetroRelationshipHistoryContext/);
  assert.match(messagesSource, /setPage\(activeAccountMode === "business" \? "customerRelationshipsCenter" : "myRequests"\)/);
  assert.match(messagesSource, /No work history yet\./);
  assert.match(messagesSource, /No invoices yet\./);
  assert.match(messagesSource, /No documents yet\./);
  assert.doesNotMatch(messagesSource, /Address \/ service area/);
  assert.doesNotMatch(messagesSource, /Address \/ Service Area/);
  assert.match(messagesSource, /Copy invite link/);
  assert.match(conversationThreadSource, /threadRelationshipIdentity/);
  assert.match(conversationThreadSource, /<RelationshipIdentityPage/);
  assert.doesNotMatch(conversationThreadSource, /Project Details/);
});

test("Conversation thread hands work creation to owning workspaces", () => {
  assert.match(conversationThreadSource, /const openTenantTicketComposer = \(\) =>/);
  assert.match(conversationThreadSource, /openWorkCenterHandoff\("active"\)/);
  assert.match(conversationThreadSource, /openWorkCenterHandoff\("schedule"\)/);
  assert.match(conversationThreadSource, /openInvoiceBuilderHandoff\(\)/);
  assert.doesNotMatch(conversationThreadSource, /saveActiveWorkSnapshot\(\{/);
  assert.doesNotMatch(conversationThreadSource, /saveActiveJobSnapshot\(\{/);
  assert.doesNotMatch(conversationThreadSource, /source: "conversation_tenant_ticket"/);
  assert.doesNotMatch(conversationThreadSource, /Save as Schedule/);
  assert.match(conversationThreadSource, /<span>\{language === "es" \? "Continuar trabajo" : "Continue Work"\}<\/span>/);
  assert.match(conversationThreadSource, /onClick=\{openTenantTicketComposer\}/);
});

test("Emergency relationship rows open conversations and Messages restores saved chat history", () => {
  assert.match(messagesSource, /function renderConversationRow\(quote = \{\}, options = \{\}\)/);
  assert.match(messagesSource, /searchedVisibleQuotes\.map\(\(quote\) => renderConversationRow\(quote\)\)/);
  assert.match(messagesSource, /function conversationMatchesMessageSection\(quote = \{\}, section = "conversations"\)/);
  assert.match(messagesSource, /if \(section === "emergency"\) return isEmergencyConversationType\(quote\)/);
  assert.match(messagesSource, /function openConversationRow\(summaryOrRecord = \{\}, options = \{\}\)/);
  assert.match(messagesSource, /function stageConversationForThread\(quote = \{\}\)/);
  assert.match(messagesSource, /safeSetStorage\("selectedConversation", JSON\.stringify\(threadPayload\)\)/);
  assert.match(messagesSource, /setRelationshipViewMenuOpen\(false\);[\s\S]*setRelationshipActionMenuOpen\(false\);/);
  assert.match(messagesSource, /setActiveContactCardId\(""\);[\s\S]*setSavedHistoryOpen\(false\);/);
  assert.match(messagesSource, /preferSplitPane: isSplitPane && !options\.returnToSavedHistory/);
  assert.match(messagesSource, /forceRoute: !isSplitPane \|\| options\.returnToSavedHistory/);
  assert.match(messagesSource, /function openConversation\(quote, options = \{\}\)/);
  assert.match(messagesSource, /const conversation = prepareConversation\(quote, \{ updateList: false \}\);/);
  assert.doesNotMatch(messagesSource, /setPage\("conversationThread"\);\n\n\s+window\.setTimeout\(\(\) => \{\n\s+prepareConversation/);
  assert.match(messagesSource, /options\.preferSplitPane === true && !options\.forceRoute/);
  assert.match(messagesSource, /setActiveSplitConversationId\(""\);[\s\S]*setPage\("conversationThread"\)/);
  assert.match(messagesSource, /record\.conversationId,[\s\S]*record\.threadId,[\s\S]*record\.sourceConversationId,[\s\S]*record\.id,/);
  assert.match(messagesSource, /const appLayoutMetrics = useAppLayoutMetrics\(\)/);
  assert.match(messagesSource, /const isSplitPane = communicationLayout\.mode === "desktop"/);
  assert.match(messagesSource, /function readJsonArray\(key\)/);
  assert.match(messagesSource, /onClick=\{\(\) => openConversationRow\(conversation, options\)\}/);
  assert.match(messagesSource, /type="button"[\s\S]*onClick=\{\(\) => openConversationRow\(conversation, options\)\}/);
  assert.match(messagesSource, /touchAction: "manipulation"/);
  assert.match(messagesSource, /zIndex: 60/);
  assert.match(messagesSource, /statusChip === "Emergency" \? emergencyConversationRow/);
  assert.match(messagesSource, /const count = getMessageSectionCount\(key\)/);
  assert.match(messagesSource, /const SAVED_HISTORY_ACTION = \["savedHistory", "Saved Conversation History"\]/);
  assert.match(messagesSource, /const \[savedHistoryOpen, setSavedHistoryOpen\] = useState\(\s*localStorage\.getItem\("meetroMessagesOpenSavedHistory"\) === "true"\s*\)/);
  assert.match(messagesSource, /if \(type === "savedHistory"\)/);
  assert.match(messagesSource, /setSavedHistoryOpen\(true\)/);
  assert.match(messagesSource, /aria-label="Saved Conversation History"/);
  assert.match(messagesSource, /savedHistoryQuotes\.map/);
  assert.match(messagesSource, /!savedHistoryOpen && \(/);
});

test("Messages renders an adaptive workspace without changing mobile conversation routing", () => {
  assert.match(messagesSource, /const appLayoutMetrics = useAppLayoutMetrics\(\)/);
  assert.match(messagesSource, /const communicationLayout = getCommunicationLayout\(appLayoutMetrics\)/);
  assert.match(messagesSource, /const isSplitPane = communicationLayout\.mode === "desktop"/);
  assert.match(messagesSource, /const isWideWorkspace = communicationLayout\.columns === 3/);
  assert.doesNotMatch(messagesSource, /setIsSplitPane|setIsWideWorkspace/);
  assert.match(messagesSource, /const wideWorkspaceShell = \{/);
  assert.match(messagesSource, /gridTemplateColumns:\s*\n\s+"minmax\(280px, 0\.28fr\) minmax\(420px, 0\.44fr\) minmax\(280px, 0\.28fr\)"/);
  assert.match(messagesSource, /isWideWorkspace \? wideWorkspaceShell : \{\}/);
  assert.match(messagesSource, /isWideWorkspace && renderWorkspaceContextPanel\(\)/);
  assert.match(messagesSource, /function renderWorkspaceContextPanel\(\)/);
  assert.match(messagesSource, /aria-label="Relationship and project context"/);
  assert.match(messagesSource, /Context will appear here as this relationship develops\./);
  assert.match(messagesSource, /<ConversationThread[\s\S]*embedded/);
  assert.match(messagesSource, /preferSplitPane: isSplitPane && !options\.returnToSavedHistory/);
  assert.match(messagesSource, /forceRoute: !isSplitPane \|\| options\.returnToSavedHistory/);
  assert.match(messagesSource, /setPage\("conversationThread"\)/);
});

test("Messages desktop context panel exposes Communication Center context without owning work", () => {
  assert.match(messagesSource, /function getCommunicationIntent\(conversation = \{\}, relationship = null\)/);
  assert.match(messagesSource, /function getConversationAuthorityFacts\(conversation = \{\}, relationship = null\)/);
  assert.match(messagesSource, /function getRelationshipMemoryFacts\(conversation = \{\}, relationship = null\)/);
  assert.match(messagesSource, /label: "Intent"/);
  assert.match(messagesSource, /label: "Current status"/);
  assert.match(messagesSource, /label: "Current owner"/);
  assert.match(messagesSource, /label: "Next decision"/);
  assert.match(messagesSource, /<p style=\{workspaceContextEyebrow\}>Communication<\/p>/);
  assert.match(messagesSource, /<p style=\{workspaceContextEyebrow\}>Related work<\/p>/);
  assert.match(messagesSource, /<p style=\{workspaceContextEyebrow\}>Memory<\/p>/);
  assert.match(messagesSource, /Relationship memory will grow as work, decisions, and history accumulate\./);
  assert.match(messagesSource, /isWideWorkspace && renderWorkspaceContextPanel\(\)/);
  assert.match(messagesSource, /setPage\("contractorDashboard"\)/);
  assert.match(messagesSource, /setPage\("projectDetails"\)/);
  assert.doesNotMatch(messagesSource, /create.*Project.*Context|save.*Project.*Context|new.*WorkspaceContext/i);
});

test("Messages desktop relationship context panel is scroll-safe without clipping sections", () => {
  assert.match(messagesSource, /const workspaceContextPane = \{/);
  assert.match(messagesSource, /const workspaceContextPane = \{[\s\S]*minHeight: 0/);
  assert.match(messagesSource, /const workspaceContextPane = \{[\s\S]*height: "100%"/);
  assert.match(messagesSource, /const workspaceContextPane = \{[\s\S]*overflowY: "auto"/);
  assert.match(messagesSource, /const workspaceContextPane = \{[\s\S]*overflowX: "hidden"/);
  assert.match(messagesSource, /const workspaceContextPane = \{[\s\S]*padding: "16px 16px calc\(32px \+ env\(safe-area-inset-bottom, 0px\)\)"/);
  assert.match(messagesSource, /const workspaceContextPane = \{[\s\S]*scrollPaddingBottom: "calc\(96px \+ env\(safe-area-inset-bottom, 0px\)\)"/);
  assert.match(messagesSource, /const workspaceContextPane = \{[\s\S]*scrollbarGutter: "stable"/);
  assert.match(messagesSource, /<p style=\{workspaceContextEyebrow\}>Relationship<\/p>/);
  assert.match(messagesSource, /<p style=\{workspaceContextEyebrow\}>Contact<\/p>/);
  assert.match(messagesSource, /<p style=\{workspaceContextEyebrow\}>Communication<\/p>/);
  assert.match(messagesSource, /<p style=\{workspaceContextEyebrow\}>Related work<\/p>/);
  assert.match(messagesSource, /<p style=\{workspaceContextEyebrow\}>Memory<\/p>/);
});

test("Messages desktop relationship context panel uses flat rows instead of nested cards", () => {
  const factRowSource = messagesSource.slice(
    messagesSource.indexOf("const workspaceFactRow = {"),
    messagesSource.indexOf("const workspaceFactLabel = {")
  );

  assert.match(messagesSource, /const workspaceContextSection = \{/);
  assert.match(messagesSource, /const workspaceContextSection = \{[\s\S]*borderTop: "1px solid var\(--meetro-color-line/);
  assert.match(factRowSource, /gridTemplateColumns: "minmax\(84px, 0\.42fr\) minmax\(0, 1fr\)"/);
  assert.match(factRowSource, /padding: "7px 0"/);
  assert.match(factRowSource, /borderTop: "1px solid rgba\(78,68,55,0\.08\)"/);
  assert.doesNotMatch(factRowSource, /borderRadius/);
  assert.doesNotMatch(factRowSource, /background/);
  assert.doesNotMatch(messagesSource, /<section style=\{workspaceContextCard\} className="meetro-visual-surface">[\s\S]*<p style=\{workspaceContextEyebrow\}>Communication<\/p>/);
});

test("Messages desktop relationship panel containment preserves list thread and mobile flow", () => {
  assert.match(messagesSource, /const splitShell = \{[\s\S]*minBlockSize: 0/);
  assert.match(messagesSource, /const splitListPane = \{[\s\S]*height: "100%"/);
  assert.match(messagesSource, /const splitThreadPane = \{[\s\S]*height: "100%"/);
  assert.match(messagesSource, /isWideWorkspace && renderWorkspaceContextPanel\(\)/);
  assert.match(messagesSource, /isWideWorkspace \? wideWorkspaceShell : \{\}/);
  assert.match(messagesSource, /<ConversationThread[\s\S]*embedded/);
  assert.match(messagesSource, /forceRoute: !isSplitPane \|\| options\.returnToSavedHistory/);
});

test("ConversationThread renders local or empty messages before backend hydration", () => {
  const localLoadIndex = conversationThreadSource.indexOf("const localMessages = loadLocalMessages()");
  const backendFetchIndex = conversationThreadSource.indexOf("authFetch(\n            `/messages/${selectedQuoteRequestId}`");

  assert.match(conversationThreadSource, /const loadLocalMessages = \(\) =>/);
  assert.ok(localLoadIndex > 0);
  assert.ok(backendFetchIndex > localLoadIndex);
  assert.match(conversationThreadSource, /const canFetchBackendMessages =[\s\S]*\/\^\\d\+\$\/\.test\(String\(selectedQuoteRequestId\)\)/);
  assert.match(conversationThreadSource, /const fallbackMessages = isEmergencyThread \? \[\] : starterMessages/);
  assert.match(conversationThreadSource, /Read receipts and inbox refreshes must never block the active thread/);
});

test("Saved Conversation History is user-saved only and conversation menu owns the save action", () => {
  assert.match(messagesSource, /import \{[\s\S]*isConversationUserSavedToHistory[\s\S]*\} from "\.\.\/utils\/conversationUnread"/);
  assert.match(messagesSource, /function isSavedChatHistoryConversation\(quote = \{\}\) \{\s*return isConversationUserSavedToHistory\(quote\);\s*\}/);
  assert.doesNotMatch(messagesSource, /quote\.archived \|\|[\s\S]{0,120}meetro_conversation_saved_/);
  assert.match(messagesSource, /Conversations you save manually stay here for future reference\./);
  assert.match(messagesSource, /Conversations you save from the conversation menu will appear here\./);
  assert.match(conversationThreadSource, /saveConversationToUserHistory/);
  assert.match(conversationThreadSource, /Save Conversation to History/);
  assert.match(conversationThreadSource, /Saved to History/);
  assert.match(conversationThreadSource, /userSavedToHistory/);
});

test("Saved emergency history preview uses final workflow state before stale description", () => {
  assert.match(messagesSource, /function getConversationPreviewText\(conversation = \{\}\)/);
  assert.match(messagesSource, /function getResolvedConversationState\(quote = \{\}\)/);
  assert.match(messagesSource, /function isFinalConversationState\(quote = \{\}\)/);
  assert.match(messagesSource, /Completed emergency service/);
  assert.match(messagesSource, /Emergency conversation saved/);
  assert.match(messagesSource, /<p style=\{conversationRowPreview\}>\s*\{getConversationPreviewText\(conversation\)\}\s*<\/p>/);
  assert.doesNotMatch(messagesSource, /<p style=\{conversationRowPreview\}>\s*\{conversation\.lastMessage \|\|/);
});

test("ConversationThread opens a full-page relationship identity without leaving the thread", () => {
  assert.match(conversationThreadSource, /aria-label=\{t\("openRelationshipDetails", language\)\}/);
  assert.match(conversationThreadSource, /function openRelationshipDetails\(\)/);
  assert.match(conversationThreadSource, /setShowProfileCard\(true\)/);
  assert.match(conversationThreadSource, /relationshipIdentityType/);
  assert.match(conversationThreadSource, /onClick=\{openRelationshipDetails\}/);
  assert.match(conversationThreadSource, /setShowProfileCard\(false\)/);
  assert.match(conversationThreadSource, /profileOverlay = \{[\s\S]*position: "fixed"[\s\S]*overflowY: "auto"/);
  assert.match(conversationThreadSource, /<RelationshipIdentityPage/);
  assert.match(conversationThreadSource, /const threadRelationshipIdentity = resolveRelationshipIdentity/);
  assert.doesNotMatch(conversationThreadSource, /<div style=\{profileMiniCard\}>/);
  assert.match(relationshipIdentityPageSource, /maxWidth: "760px"/);
  assert.match(relationshipIdentityPageSource, /minHeight: "calc\(100dvh/);
  assert.match(relationshipIdentityPageSource, /function getIdentityIconKey/);
  assert.match(relationshipIdentityPageSource, /function IdentityIcon/);
  assert.match(relationshipIdentityPageSource, /function isImmediateRelationshipSection/);
  assert.match(relationshipIdentityPageSource, /showDeferredSections/);
  assert.match(relationshipIdentityPageSource, /requestAnimationFrame/);
  assert.match(relationshipIdentityPageSource, /visibleSections/);
  assert.match(relationshipIdentityPageSource, /identityHero|identityHeader/);
  assert.match(relationshipIdentityPageSource, /identityIconCapsule/);
  assert.match(relationshipIdentityPageSource, /identitySectionChevron/);
  assert.match(relationshipIdentityPageSource, /onClick=\{onClick\}/);
  assert.match(conversationThreadSource, /relationshipIdentityIntro/);
  assert.match(conversationThreadSource, /relationshipIdentityFactRows/);
  assert.match(conversationThreadSource, /viewRelationshipIdentity/);
  assert.match(conversationThreadSource, /function saveThreadRelationshipToContacts\(\)/);
  assert.match(conversationThreadSource, /Save to Contacts/);
  assert.match(conversationThreadSource, /Saved to Contacts/);
  assert.match(conversationThreadSource, /compactScopedContactRecord\(savedContactRecord\)/);
  assert.match(conversationThreadSource, /upsertProfileScopedContact\(compactSavedContactRecord/);
  assert.match(conversationThreadSource, /setSavedThreadContactSnapshot\(compactSavedContactRecord\)/);
  assert.match(conversationThreadSource, /business: "Professional \/ Business"/);
  assert.match(conversationThreadSource, /professional: "Professional \/ Business"/);
  assert.match(conversationThreadSource, /function getThreadContactScope\(\)/);
  assert.match(conversationThreadSource, /function recordMatchesThreadContactScope\(record = \{\}\)/);
  assert.match(conversationThreadSource, /recordMatchesThreadContactScope\(record\)/);
  assert.match(conversationThreadSource, /getThreadRelationshipLinkedId\(contactType\)/);
  assert.match(
    conversationThreadSource,
    /`saved-contact-\$\{normalizeSavedContactMatchKey\(contactProfileScopeKey\)\}-\$\{contactType\}-\$\{contactSeed\}`/
  );
  assert.match(conversationThreadSource, /relationshipScope: contactScope/);
  assert.match(conversationThreadSource, /accountMode: contactScope/);
  assert.match(conversationThreadSource, /contactProfileScopeKey/);
  assert.match(conversationThreadSource, /savedToContacts: true/);
  assert.match(conversationThreadSource, /sourceConversationId: conversationId/);
  assert.match(conversationThreadSource, /writeUnreadConversationCount\(updatedRegistry\)/);
  assert.match(messagesSource, /readProfileScopedContacts\(\{ profileScopeKey \}\)/);
  assert.match(conversationThreadSource, /relationshipMeetroStatus/);
  assert.match(conversationThreadSource, /relationshipMeetroLinked/);
  assert.match(conversationThreadSource, /relationshipMeetroChat/);
  assert.match(conversationThreadSource, /function textActiveContact\(\)/);
  assert.match(conversationThreadSource, /textActiveContact\(\)/);
  assert.match(conversationThreadSource, /function emailActiveContact\(\)/);
  assert.match(conversationThreadSource, /emailActiveContact\(\)/);
  assert.match(conversationThreadSource, /setShowThreadMenu\(true\)/);
  assert.match(conversationThreadSource, /Edit \/ More/);
  assert.match(conversationThreadSource, /relationshipContactLocationFact/);
  assert.match(conversationThreadSource, /relationshipServiceArea/);
  assert.match(conversationThreadSource, /relationshipIdentitySections/);
  assert.match(relationshipIdentityPageSource, /gridTemplateColumns: "repeat\(auto-fit, minmax\(min\(180px, 100%\), 1fr\)\)"/);
  assert.match(relationshipIdentityPageSource, /\.\.\.softPageSection/);
  assert.match(conversationThreadSource, /\.\.\.nativeContactRow/);
  assert.match(conversationThreadSource, /relationshipContactRows/);
  assert.match(conversationThreadSource, /relationshipCurrentWorkItems/);
  assert.match(conversationThreadSource, /relationshipCompletedWorkItems/);
  assert.match(conversationThreadSource, /relationshipInvoiceItems/);
  assert.match(conversationThreadSource, /relationshipDocumentItems/);
  assert.match(conversationThreadSource, /relationshipNotes/);
  assert.match(conversationThreadSource, /relationshipMemoryItems/);
  assert.match(conversationThreadSource, /relationshipNoCurrentWorkYet/);
  assert.match(conversationThreadSource, /relationshipMemoryWillGrow/);
});

test("ConversationThread relationship header avoids nested buttons", () => {
  const headerBlock = conversationThreadSource.slice(
    conversationThreadSource.indexOf("<div\n            style={headerIdentityButton}"),
    conversationThreadSource.indexOf("{hasActiveCallPhone && (")
  );

  assert.match(headerBlock, /role="button"/);
  assert.match(headerBlock, /tabIndex=\{0\}/);
  assert.match(headerBlock, /onKeyDown=\{\(event\) => \{/);
  assert.match(headerBlock, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.doesNotMatch(headerBlock, /<button\n\s+style=\{headerIdentityButton\}/);
  assert.match(headerBlock, /event\.stopPropagation\(\)/);
});

test("ConversationThread sends messages local-first before backend sync", () => {
  assert.match(conversationThreadSource, /const \[messageText, setMessageText\] = useState\(""\)/);
  assert.match(conversationThreadSource, /const sendMessage = \(textOverride = null\) =>/);
  assert.match(conversationThreadSource, /const text = textOverride \|\| messageText\.trim\(\)/);
  assert.match(conversationThreadSource, /setMessages\(\(prev\) => \{/);
  assert.match(conversationThreadSource, /localStorage\.setItem\(storageKey, JSON\.stringify\(nextMessages\)\)/);
  assert.match(conversationThreadSource, /Conversation local save failed; message remains visible/);
  assert.match(conversationThreadSource, /Conversation registry update failed; message remains visible/);
  assert.match(conversationThreadSource, /onKeyDown=\{\(e\) => \{[\s\S]*sendMessage\(\);/);
  assert.match(conversationThreadSource, /onClick=\{\(\) => sendMessage\(\)\}/);
  assert.match(conversationThreadSource, /setMessageText\(""\)/);
  assert.doesNotMatch(conversationThreadSource, /updateMessageStatus\(messageWithRole\.id, "failed", 0\)/);
});

test("Relationship identity opens on a fast path before inbox projections rebuild", () => {
  assert.match(messagesSource, /activeContactCardSnapshot/);
  assert.match(messagesSource, /setActiveContactCardSnapshot\(relationship\)/);
  assert.match(messagesSource, /if \(activeContactCard\) \{\n\s+return \(/);
  assert.match(messagesSource, /getActiveProfileScopeDescriptor/);
  assert.match(messagesSource, /activeContactProfileScope\.profileScopeKey/);
  assert.match(messagesSource, /const relationshipLayer = createRelationshipLayerModel/);
  assert.ok(
    messagesSource.indexOf("if (activeContactCard)") <
      messagesSource.indexOf("const relationshipLayer = createRelationshipLayerModel")
  );
});

test("Relationship identity resolver is the canonical source for avatar and action state", () => {
  assert.match(relationshipIdentityResolverSource, /export function resolveRelationshipIdentity/);
  assert.match(relationshipIdentityResolverSource, /const safeStorage = getSafeStorage\(storage\)/);
  assert.match(relationshipIdentityResolverSource, /getScopedProfilePhoto\("business", record, safeStorage\)/);
  assert.match(relationshipIdentityResolverSource, /getPersonalProfilePhotoForRecord\(record, safeStorage\)/);
  assert.match(relationshipIdentityResolverSource, /actionSet: meetroLinked \? "meetro-user" : "external-contact"/);
  assert.match(messagesSource, /const rowIdentity = resolveRelationshipIdentity/);
  assert.match(messagesSource, /rowIdentity\.avatar/);
  assert.match(conversationThreadSource, /threadRelationshipIdentity\.avatar/);
});

test("Relationship detail labels exist in supported languages", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    assert.notEqual(t("relationshipDetails", language), "relationshipDetails");
    assert.notEqual(t("viewRelationshipIdentity", language), "viewRelationshipIdentity");
    assert.notEqual(t("relationshipIdentityIntro", language), "relationshipIdentityIntro");
    assert.notEqual(t("relationshipContactInformation", language), "relationshipContactInformation");
    assert.notEqual(t("relationshipCurrentWork", language), "relationshipCurrentWork");
    assert.notEqual(t("relationshipJobHistory", language), "relationshipJobHistory");
    assert.notEqual(t("relationshipInvoiceHistory", language), "relationshipInvoiceHistory");
    assert.notEqual(t("relationshipDocuments", language), "relationshipDocuments");
    assert.notEqual(t("relationshipNotes", language), "relationshipNotes");
    assert.notEqual(t("relationshipNoNotesYet", language), "relationshipNoNotesYet");
    assert.notEqual(t("relationshipMemory", language), "relationshipMemory");
    assert.notEqual(t("relationshipType", language), "relationshipType");
    assert.notEqual(t("relationshipMeetroStatus", language), "relationshipMeetroStatus");
    assert.notEqual(t("relationshipMeetroLinked", language), "relationshipMeetroLinked");
    assert.notEqual(t("relationshipMeetroChat", language), "relationshipMeetroChat");
    assert.notEqual(t("relationshipMessage", language), "relationshipMessage");
    assert.notEqual(t("relationshipViewCurrentWork", language), "relationshipViewCurrentWork");
    assert.notEqual(t("relationshipServiceArea", language), "relationshipServiceArea");
  }
});
