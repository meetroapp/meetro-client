import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveCommunicationEmergencyContext } from "../src/utils/communicationWorkspaceState.js";

const messagesSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);
const sectionSwitchSource = messagesSource.slice(
  messagesSource.indexOf("const setMessageSection = (section) =>"),
  messagesSource.indexOf("const setRelationshipView = (view) =>")
);
const workspaceTransitionSource = sectionSwitchSource.slice(
  0,
  sectionSwitchSource.indexOf("useEffect(() =>")
);
const routeSelectionSource = messagesSource.slice(
  messagesSource.indexOf("const unsuppressedRoutedConversationId ="),
  messagesSource.indexOf("const [activeRelationshipId")
);
const splitSelectionSource = messagesSource.slice(
  messagesSource.indexOf("const activeSplitCanonicalConversationId ="),
  messagesSource.indexOf("const activeWorkspaceConversation =")
);
const emergencyContextCleanupSource = messagesSource.slice(
  messagesSource.indexOf("const accountModeChanged ="),
  messagesSource.indexOf("function getRegistryConversationsForList()")
);
const emergencyContextRenderSource = messagesSource.slice(
  messagesSource.indexOf("const eligibleActiveEmergencyContext ="),
  messagesSource.indexOf("const activeWorkspaceRelationship =")
);

function resolveEmergencyContextFromRegistry({
  context,
  workspace = "emergency",
  selectedConversationId = 195,
  registry = [],
}) {
  const activeConversation = registry.find(
    (record) =>
      record.conversationId === selectedConversationId &&
      record.conversation_type === "emergency" &&
      record.provenance === "canonical" &&
      record.eligible === true
  );

  return resolveCommunicationEmergencyContext(context, {
    activeWorkspace: workspace,
    activeConversationId: selectedConversationId,
    activeConversation,
    getConversationId: (record) => record.conversationId,
    isCanonicalRecord: (record) => record.provenance === "canonical",
    isEligible: (record) => record.eligible === true,
  });
}

test("MessagesInbox derives validated active workspace and in-memory search from the reducer", () => {
  assert.match(messagesSource, /useReducer\(\s*communicationWorkspaceReducer/);
  assert.match(
    messagesSource,
    /const messageSection =\s*routeDerivedWorkspace \|\| communicationWorkspaceState\.activeWorkspace/
  );
  assert.match(
    messagesSource,
    /getCommunicationWorkspaceMemory\(\s*communicationWorkspaceState,\s*messageSection\s*\)\.searchQuery/
  );
  assert.match(
    messagesSource,
    /type: COMMUNICATION_WORKSPACE_ACTIONS\.SET_SEARCH,\s*workspace: messageSection,\s*searchQuery: search/
  );
  assert.doesNotMatch(
    messagesSource,
    /useState\(\s*routedConversationId \|\| localStorage\.getItem\("activeConversationId"\)/
  );
});

test("one production transition plan coordinates selection restoration and pane invalidation", () => {
  assert.match(
    workspaceTransitionSource,
    /const transition = planCommunicationWorkspaceTransition\(\s*communicationWorkspaceState,\s*section,\s*quotes/
  );
  assert.match(workspaceTransitionSource, /if \(!transition\.valid\) return/);
  assert.match(
    workspaceTransitionSource,
    /const nextSection = transition\.activeWorkspace/
  );
  assert.match(
    workspaceTransitionSource,
    /const restorableRecord = isSplitPane\s*\? transition\.selectedRecord\s*:\s*null/
  );
});

test("workspace switching clears the prior center and relationship context synchronously", () => {
  assert.match(
    workspaceTransitionSource,
    /setActiveSplitConversationId\(""\);\s*setActiveSplitCanonicalConversationId\(null\)/
  );
  assert.match(workspaceTransitionSource, /setActiveEmergencyContext\(null\)/);
  assert.match(workspaceTransitionSource, /setCompactContextOpen\(false\)/);
  assert.match(workspaceTransitionSource, /setActiveRelationshipId\(""\)/);
  assert.match(workspaceTransitionSource, /setActiveContactCardId\(""\)/);
  assert.match(workspaceTransitionSource, /setActiveContactCardSnapshot\(null\)/);
});

test("already-read restoration requires exact canonical provenance, workspace eligibility, and numeric count", () => {
  assert.match(
    workspaceTransitionSource,
    /getUnreadCount: \(record\) => record\.unread_count/
  );
  assert.match(
    workspaceTransitionSource,
    /isCanonicalRecord: \(record\) =>\s*getConversationRecordProvenance\(record\)\.type === "canonical"/
  );
  assert.match(
    workspaceTransitionSource,
    /isCommunicationRecordEligibleForWorkspace\(record, section\)[\s\S]*conversationMatchesMessageSection\(record, section\)/
  );
  assert.doesNotMatch(workspaceTransitionSource, /quotes\s*\[\s*0\s*\]/);
});

test("the active center pane can resolve only from the active workspace registry", () => {
  assert.match(
    splitSelectionSource,
    /searchedVisibleQuotes\.find\(isActiveSplitConversation\)[\s\S]*sectionConversationQuotes\.find\(isActiveSplitConversation\)/
  );
  assert.doesNotMatch(
    splitSelectionSource,
    /liveIdentityQuotes\.find\(isActiveSplitConversation\)/
  );
  assert.doesNotMatch(splitSelectionSource, /liveIdentityQuotes\s*\[/);
});

test("Emergency relationship context requires the exact active eligible registry record", () => {
  const context = {
    conversationId: 195,
    detail: {
      type: "emergency",
      customerName: "Private Customer",
      address: "Private Address",
      requestDetails: "Private Work Details",
    },
  };
  const activeRecord = {
    conversationId: 195,
    conversation_type: "emergency",
    provenance: "canonical",
    eligible: true,
  };

  assert.equal(
    resolveEmergencyContextFromRegistry({
      context,
      registry: [activeRecord],
    }),
    context
  );
  assert.equal(
    resolveEmergencyContextFromRegistry({ context, registry: [] }),
    null
  );
  assert.equal(
    resolveEmergencyContextFromRegistry({
      context,
      registry: [{ ...activeRecord, eligible: false }],
    }),
    null
  );
  assert.equal(
    resolveEmergencyContextFromRegistry({
      context,
      workspace: "conversations",
      registry: [activeRecord],
    }),
    null
  );
  assert.equal(
    resolveEmergencyContextFromRegistry({
      context,
      selectedConversationId: 196,
      registry: [{ ...activeRecord, conversationId: 196 }],
    }),
    null
  );
  assert.equal(
    resolveEmergencyContextFromRegistry({
      context,
      registry: [
        {
          ...activeRecord,
          conversation_type: "standard",
        },
      ],
    }),
    null
  );
});

test("registry invalidation removes stale Emergency PII and replacement context is exact", () => {
  const staleContext = {
    conversationId: 195,
    detail: {
      type: "emergency",
      customerName: "Stale Customer",
      address: "Stale Address",
      requestDetails: "Stale Work Details",
    },
  };
  const replacementContext = {
    conversationId: 196,
    detail: {
      type: "emergency",
      customerName: "Replacement Customer",
    },
  };
  const replacementRecord = {
    conversationId: 196,
    conversation_type: "emergency",
    provenance: "canonical",
    eligible: true,
  };
  const invalidated = resolveEmergencyContextFromRegistry({
    context: staleContext,
    registry: [],
  });
  const staleAgainstReplacement = resolveEmergencyContextFromRegistry({
    context: staleContext,
    selectedConversationId: 196,
    registry: [replacementRecord],
  });
  const replacement = resolveEmergencyContextFromRegistry({
    context: replacementContext,
    selectedConversationId: 196,
    registry: [replacementRecord],
  });

  assert.equal(invalidated, null);
  assert.equal(staleAgainstReplacement, null);
  assert.equal(replacement, replacementContext);
  assert.doesNotMatch(
    JSON.stringify([invalidated, staleAgainstReplacement, replacement]),
    /Stale Customer|Stale Address|Stale Work Details/
  );
});

test("MessagesInbox clears only the observed stale Emergency context without route or read authority", () => {
  assert.match(
    emergencyContextCleanupSource,
    /messageSection === "emergency" && selectedCanonicalConversationId[\s\S]*quotes\.find\(\(record\) =>[\s\S]*provenance\.type === "canonical"[\s\S]*provenance\.conversationId === selectedCanonicalConversationId/
  );
  assert.match(
    emergencyContextCleanupSource,
    /resolveCommunicationEmergencyContext\([\s\S]*activeConversation: activeRegistryConversation/
  );
  assert.match(
    emergencyContextCleanupSource,
    /setActiveEmergencyContext\(\(current\) =>[\s\S]*current === activeEmergencyContext \? null : current/
  );
  assert.doesNotMatch(
    emergencyContextCleanupSource,
    /setPage|mark(?:Canonical)?ConversationRead|markAlertsResolved|markVisibleMessagesRead|authFetch|fetch\s*\(/
  );
});

test("Emergency context rendering requires both active panes and uses only the eligible context", () => {
  assert.match(
    emergencyContextRenderSource,
    /activeSplitConversation && activeWorkspaceConversation[\s\S]*resolveCommunicationEmergencyContext/
  );
  assert.match(
    emergencyContextRenderSource,
    /activeWorkspace: messageSection[\s\S]*activeConversationId: activeSplitCanonicalConversationId[\s\S]*activeConversation: activeSplitConversation/
  );
  assert.match(
    messagesSource,
    /detail=\{eligibleActiveEmergencyContext\.detail\}/
  );
  assert.doesNotMatch(
    messagesSource,
    /detail=\{activeEmergencyContext\.detail\}/
  );
});

test("deep-link workspace inference requires an exact canonical registry record", () => {
  assert.match(
    routeSelectionSource,
    /const provenance = getConversationRecordProvenance\(record\)[\s\S]*provenance\.type === "canonical"[\s\S]*provenance\.conversationId === unsuppressedRoutedConversationId/
  );
  assert.match(
    routeSelectionSource,
    /const activeRoutedConversationId = routeDerivedWorkspace\s*\? unsuppressedRoutedConversationId\s*:\s*""/
  );
  assert.match(
    splitSelectionSource,
    /activeRoutedConversationId &&[\s\S]*routedWorkspaceRecord &&[\s\S]*getCommunicationWorkspaceForConversation\(routedWorkspaceRecord, \{[\s\S]*includeHistory: false[\s\S]*\}\) === routeDerivedWorkspace[\s\S]*\? routedWorkspaceRecord\s*:\s*null/
  );
  assert.doesNotMatch(
    splitSelectionSource,
    /threadType: CONVERSATION_THREAD_TYPES\.CANONICAL/
  );
});

test("invalid routed identity cannot fall back to local canonical or compatibility selection", () => {
  assert.match(
    splitSelectionSource,
    /activeRoutedConversationId \|\|\s*\(routedConversationId \? null : selectedSplitCanonicalConversationId\)/
  );
  assert.match(
    splitSelectionSource,
    /const activeCompatibilityConversationId = routedConversationId\s*\? ""\s*:\s*activeSplitConversationId/
  );
});

test("workspace switching contains read, Alert, reply, and message authority", () => {
  assert.doesNotMatch(
    workspaceTransitionSource,
    /mark(?:Canonical)?ConversationRead|markAlertsResolved|markVisibleMessagesRead/
  );
  assert.doesNotMatch(workspaceTransitionSource, /unread\s*:\s*false/);
  assert.doesNotMatch(workspaceTransitionSource, /send|reply|createMessage/i);
});

test("safe restoration reuses the exact existing canonical Communication Center route", () => {
  assert.match(
    workspaceTransitionSource,
    /getCanonicalConversationActionTarget\(restorableRecord, \{[\s\S]*returnPage: "messagesInbox"[\s\S]*preferCommunicationCenterShell: true/
  );
  assert.match(
    workspaceTransitionSource,
    /setActiveSplitConversationId\(String\(restoredTarget\.conversationId\)\)[\s\S]*setActiveSplitCanonicalConversationId\(restoredTarget\.conversationId\)[\s\S]*setPage\(restoredTarget\.route\)/
  );
  assert.doesNotMatch(workspaceTransitionSource, /Date\.now|Math\.random/);
});

test("route suppression remains active until the routed identity actually changes", () => {
  assert.match(
    sectionSwitchSource,
    /String\(suppressedRoutedConversationIdRef\.current \|\| ""\) !==[\s\S]*String\(routedConversationId \|\| ""\)[\s\S]*suppressedRoutedConversationIdRef\.current = ""/
  );
  assert.doesNotMatch(
    workspaceTransitionSource,
    /suppressedRoutedConversationIdRef\.current = ""/
  );
});

test("canonical, compatibility, and relationship selections use distinct identity fields", () => {
  assert.match(
    messagesSource,
    /kind: COMMUNICATION_SELECTION_KINDS\.CANONICAL_CONVERSATION,\s*conversationId: canonicalConversationId/
  );
  assert.match(
    messagesSource,
    /kind: COMMUNICATION_SELECTION_KINDS\.COMPATIBILITY_CONVERSATION,\s*compatibilityId: String\(conversation\.id\)/
  );
  assert.match(
    messagesSource,
    /kind: COMMUNICATION_SELECTION_KINDS\.RELATIONSHIP,\s*relationshipId: String\(relationship\.id \|\| ""\)/
  );
});

test("Contacts activation stays deliberate and never resumes a conversation automatically", () => {
  const contactReturnSource = messagesSource.slice(
    messagesSource.indexOf("if (createsContactPlaceholder)"),
    messagesSource.indexOf("function updateTicketComposer")
  );

  assert.match(contactReturnSource, /setMessageSection\("contacts"\)/);
  assert.doesNotMatch(contactReturnSource, /openConversation\(/);
});

test("the split pane renders workspace-specific truthful landing content", () => {
  assert.match(messagesSource, /function getWorkspaceLandingText\(\)/);
  assert.match(messagesSource, /messageSection === "contacts"[\s\S]*messagesNoContactsText/);
  assert.match(messagesSource, /messageSection === "hiring"[\s\S]*messagesNoHiringConversationsText/);
  assert.match(messagesSource, /messageSection === "emergency"[\s\S]*messagesNoEmergencyConversationsText/);
  assert.match(messagesSource, /messageSection === "history"[\s\S]*messagesSavedHistoryDescription/);
  assert.match(messagesSource, /\{getWorkspaceLandingText\(\)\}/);
});

test("History remains state-only while the existing Saved History footer and visible tabs remain", () => {
  assert.doesNotMatch(
    messagesSource.slice(
      messagesSource.indexOf("const COMMUNICATION_SECTION_OPTIONS"),
      messagesSource.indexOf("function normalizeRelationshipView")
    ),
    /\["history"/
  );
  assert.match(messagesSource, /messagesSavedHistoryTitle/);
  assert.match(messagesSource, /savedHistorySecondaryButton/);
});
