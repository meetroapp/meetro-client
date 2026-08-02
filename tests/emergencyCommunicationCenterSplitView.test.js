import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCanonicalConversationRoute,
  normalizeCanonicalConversationDetail,
  parseCanonicalConversationRoute,
} from "../src/utils/canonicalConversationMessaging.js";
import {
  getCommunicationLayout,
  shouldUseCommunicationCenterConversationRoute,
} from "../src/utils/communicationLayout.js";

const readSource = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const appSource = readSource("src/App.jsx");
const inboxSource = readSource("src/pages/MessagesInbox.jsx");
const openConversationSource = inboxSource.slice(
  inboxSource.indexOf("function openConversation("),
  inboxSource.indexOf("function openConversationRow")
);
const openConversationIdFastSource = inboxSource.slice(
  inboxSource.indexOf("function openConversationIdFast("),
  inboxSource.indexOf("function createConversationFromRelationship")
);
const threadSource = readSource("src/pages/ConversationThread.jsx");
const detailSource = readSource(
  "src/components/EmergencyRelationshipDetail.jsx"
);
const contextPanelSource = detailSource.slice(
  detailSource.indexOf("export function EmergencyConversationContextPanel"),
  detailSource.indexOf("function EmergencyRelationshipDetail")
);

function desktopSnapshot(contentWidth = 1100) {
  return {
    layoutMode: "desktop",
    contentWidth,
  };
}

function emergencyDetail() {
  return {
    success: true,
    conversation: {
      id: 195,
      type: "emergency",
      status: "active",
    },
    participants: {
      viewer: { role: "homeowner" },
      homeowner: { displayName: "Homeowner" },
      business: {
        name: "Cape Electrical",
        category: "electrician",
      },
    },
    relationship: {
      id: 81,
      emergencyRequestId: 42,
      title: "Electrical Emergency",
      source: {
        type: "emergency",
        id: 42,
        title: "Electrical Emergency",
        serviceDomain: "home_services",
        serviceSpecialty: "electrical",
      },
    },
    workflow: {
      status: "professional_arrived",
      assignedAt: "2026-08-02T10:00:00.000Z",
      enRouteAt: "2026-08-02T10:10:00.000Z",
      arrivedAt: "2026-08-02T10:30:00.000Z",
      workStartedAt: null,
      completedAt: null,
      allowedActions: [],
    },
    permissions: {
      canRead: true,
      canSendMessages: true,
      canManageWorkflow: false,
    },
    location: {
      locationText: "101 Test Ave",
      unitNumber: "Unit 2",
      accessNotes: "Call at gate",
    },
  };
}

test("canonical conversation routes from Messages use the Communication Center shell on desktop", () => {
  const route = parseCanonicalConversationRoute(
    `#${buildCanonicalConversationRoute(195, "messagesInbox")}`
  );

  assert.equal(
    shouldUseCommunicationCenterConversationRoute(
      route,
      desktopSnapshot()
    ),
    true
  );
  assert.match(
    appSource,
    /useCommunicationCenterShell[\s\S]*<MessagesInbox[\s\S]*<ConversationThread/
  );
});

test("phone routes preserve the standalone stacked conversation", () => {
  const route = parseCanonicalConversationRoute(
    `#${buildCanonicalConversationRoute(195, "messagesInbox")}`
  );

  assert.equal(
    shouldUseCommunicationCenterConversationRoute(route, {
      layoutMode: "mobile",
      contentWidth: 390,
    }),
    false
  );
  assert.match(
    threadSource,
    /emergencyContextMode = "stacked"/
  );
});

test("non-Communication return routes remain standalone", () => {
  const route = parseCanonicalConversationRoute(
    `#${buildCanonicalConversationRoute(195, "myRequests")}`
  );

  assert.equal(
    shouldUseCommunicationCenterConversationRoute(
      route,
      desktopSnapshot()
    ),
    false
  );
});

test("existing adaptive layout signal controls the three-column workspace", () => {
  assert.equal(getCommunicationLayout(desktopSnapshot(1039)).columns, 2);
  assert.equal(getCommunicationLayout(desktopSnapshot(1040)).columns, 3);
  assert.match(
    inboxSource,
    /data-communication-columns=\{isWideWorkspace \? "three" : isSplitPane \? "two" : "one"\}/
  );
});

test("Emergency row selection retains the left list and activates the embedded thread", () => {
  assert.match(
    inboxSource,
    /if \(canonicalEmergencyId\)[\s\S]*setActiveSplitConversationId\(String\(canonicalEmergencyId\)\)[\s\S]*buildCanonicalConversationRoute/
  );
  assert.match(
    inboxSource,
    /<div style=\{isSplitPane \? splitListPane : undefined\}>[\s\S]*<ConversationThread[\s\S]*embedded/
  );
});

test("desktop Emergency click never sets standalone conversationThread", () => {
  const canonicalEmergencyBlock = openConversationSource.match(
    /if \(canonicalEmergencyId\)[\s\S]*?\n\s*return;\n\s*}\n\n\s*const conversation/s
  );

  assert.match(
    openConversationSource,
    /if \(canonicalEmergencyId\)[\s\S]*setActiveSplitConversationId/
  );
  assert.match(
    openConversationSource,
    /if \(canonicalEmergencyId\)[\s\S]*setPage\("messagesInbox"\)/
  );
  assert.ok(
    !canonicalEmergencyBlock ||
      !canonicalEmergencyBlock[0].includes('setPage("conversationThread")'),
    "canonical Emergency open branch does not write conversationThread"
  );
  assert.match(
    openConversationSource,
    /if \(isSplitPane\)[\s\S]*setPage\("messagesInbox"\)/
  );
  assert.match(
    openConversationSource,
    /safeSetStorage\("activeConversationId", String\(canonicalEmergencyId\)\)/
  );
});

test("desktop Emergency hash navigation does not write legacy plain #conversationThread", () => {
  const emergencyConversationHash = buildCanonicalConversationRoute(
    195,
    "messagesInbox"
  );

  assert.ok(
    emergencyConversationHash.startsWith("conversationThread")
  );
  assert.ok(
    emergencyConversationHash.includes("conversationId=195")
  );
  assert.ok(
    emergencyConversationHash !== "conversationThread"
  );
});

test("saved-history canonical Emergency rows stay in split view on desktop", () => {
  assert.match(
    inboxSource,
    /const isEmergencyCanonicalThread = Boolean[\s\S]*getCanonicalEmergencyConversationId\(conversation\)/
  );
  assert.match(
    inboxSource,
    /preferSplitPane: isSplitPane && \(!savedHistory \|\| isEmergencyCanonicalThread\)/
  );
  assert.match(
    inboxSource,
    /forceRoute: !isSplitPane && !isEmergencyCanonicalThread/
  );
});

test("desktop canonical Emergency selection resolves by canonicalConversationId only", () => {
  assert.match(
    inboxSource,
    /function getCanonicalEmergencyConversationId\([\s\S]*?const isEmergencySource =/m
  );
  assert.match(
    inboxSource,
    /return String\([\s\S]*normalizeCanonicalConversationId\([\s\S]*quote\?\.conversationId \|\| quote\?\.conversation_id \|\| quote\?\.id/m
  );
  assert.doesNotMatch(
    inboxSource,
    /quote\.request_id\s*\?\s*quote\.request_id/s
  );
});

test("wide workspace renders the canonical Emergency context in the existing right pane", () => {
  assert.match(
    inboxSource,
    /\{isWideWorkspace && renderWorkspaceContextPanel\(\)\}/
  );
  assert.match(
    inboxSource,
    /data-emergency-context-panel="canonical"[\s\S]*EmergencyConversationContextPanel/
  );
});

test("expanded Emergency context is suppressed in the center only when the side panel is active", () => {
  assert.match(
    threadSource,
    /const emergencyContextInSidePanel =[\s\S]*emergencyContextMode === "panel"/
  );
  assert.match(
    threadSource,
    /emergencyPanelExpanded && !emergencyContextInSidePanel/
  );
});

test("narrow Emergency thread keeps Review Details and Hide behavior", () => {
  assert.match(
    threadSource,
    /!emergencyContextInSidePanel && \([\s\S]*conversationHideDetails[\s\S]*conversationReviewDetails/
  );
  assert.match(
    threadSource,
    /data-emergency-thread-context=\{[\s\S]*"side-panel" : "stacked"/
  );
});

test("Emergency context renders through one responsive destination at a time", () => {
  assert.match(
    inboxSource,
    /emergencyContextMode=\{isWideWorkspace \? "panel" : "stacked"\}/
  );
  assert.match(
    inboxSource,
    /!activeEmergencyContextMatchesConversation && \([\s\S]*compactContextToggle/
  );
});

test("right context uses canonical identity, status, timeline, location, access, and next-step helpers", () => {
  for (const token of [
    "participants.business",
    "participants.homeowner",
    "getEmergencyWorkCenterStatusLabel",
    "getEmergencyRelationshipNextStep",
    "EmergencyTimeline",
    "location.locationText",
    "location.unitNumber",
    "location.accessNotes",
  ]) {
    assert.match(contextPanelSource, new RegExp(token.replace(".", "\\.")));
  }
});

test("canonical request identity remains distinct from conversation routing identity", () => {
  const normalized = normalizeCanonicalConversationDetail(
    emergencyDetail(),
    195
  );

  assert.equal(normalized.conversationId, 195);
  assert.equal(normalized.emergencyRequestId, 42);
  assert.notEqual(
    normalized.conversationId,
    normalized.emergencyRequestId
  );
});

test("direct canonical route recovery does not depend on selectedConversation storage", () => {
  assert.match(
    inboxSource,
    /const routedSplitConversation =[\s\S]*canonicalRouteContext\.conversationId[\s\S]*CONVERSATION_THREAD_TYPES\.CANONICAL/
  );
  assert.doesNotMatch(
    appSource.slice(
      appSource.indexOf('if (page === "conversationThread")'),
      appSource.indexOf('if (page === "businessDashboard")')
    ),
    /selectedConversation/
  );
});

test("Emergency context projection performs no fetch and creates no browser authority", () => {
  assert.doesNotMatch(
    contextPanelSource,
    /authFetch|fetch\(|localStorage|sessionStorage|setItem\(|removeItem\(/
  );
});

test("ConversationThread remains the only Emergency refresh owner", () => {
  assert.doesNotMatch(inboxSource, /createEmergencyRefreshCoordinator/);
  assert.equal(
    (threadSource.match(/createEmergencyRefreshCoordinator\(\{/g) || [])
      .length,
    1
  );
});

test("right Emergency context is read-only and contains no workflow mutation controls", () => {
  assert.doesNotMatch(
    contextPanelSource,
    /transitionEmergency|MARK_EN_ROUTE|MARK_ARRIVED|START_WORK|COMPLETE_WORK|Record Payment|Create Proposal|Close Job/
  );
  assert.doesNotMatch(contextPanelSource, /onClick=/);
});

test("ordinary split-view selection behavior remains available", () => {
  assert.match(
    inboxSource,
    /const shouldUseSplitPane =[\s\S]*options\.preferSplitPane === true[\s\S]*if \(shouldUseSplitPane\)[\s\S]*setActiveSplitConversationId/
  );
});

test("Emergency fast-open path also guards split behavior on desktop", () => {
  assert.match(
    openConversationIdFastSource,
    /isSplitPane[\s\S]*options\.preferSplitPane === true[\s\S]*isEmergencyConversationType\(stagedConversation\)/
  );
});

test("Hiring conversations retain their existing unavailable-state boundary", () => {
  assert.match(
    threadSource,
    /if \(isHiringThread\) \{[\s\S]*<HiringUnavailableState/
  );
});

test("message search and composer remain inside the thread for embedded and stacked layouts", () => {
  assert.match(threadSource, /threadSearchInputRef/);
  assert.match(threadSource, /className="chat-composer message-composer"/);
  assert.match(threadSource, /const canUseMessageComposer =/);
});

test("Communication Center containment and account-mode scoping remain in place", () => {
  assert.match(inboxSource, /overflowX: "hidden"/);
  assert.match(inboxSource, /overscrollBehaviorX: "none"/);
  assert.match(
    inboxSource,
    /activeAccountMode === "business" \? "business" : "homeowner"/
  );
});

  test("embedded thread receives canonicalConversationId override from split selection", () => {
    assert.match(
      inboxSource,
      /<ConversationThread[\s\S]*canonicalConversationId=\{activeSplitCanonicalConversationId\}/
    );
    assert.match(
      threadSource,
      /function ConversationThreadInner\(\{\s*[\s\S]*canonicalConversationId: canonicalConversationIdOverride,[\s\S]*\}/
  );
  assert.match(
    threadSource,
    /const forcedCanonicalConversationId = normalizeCanonicalConversationId\(\s*canonicalConversationIdOverride\s*\)/
  );
  assert.match(
    threadSource,
      /const canonicalConversationId = forcedCanonicalConversationId \|\|/
    );
  });

  test("embedded canonical split path stores numeric emergency IDs", () => {
    assert.match(
      inboxSource,
      /function getCanonicalEmergencyConversationId\(quote = \{\}\) \{[\s\S]*?const isEmergencySource =[\s\S]*?return normalizeCanonicalConversationId\([\s\S]*quote\?\.conversationId \|\| quote\?\.conversation_id \|\| quote\?\.id\s*\);/,
      "getCanonicalEmergencyConversationId now stores normalized numeric conversation IDs"
    );

    assert.match(
      openConversationSource,
      /setActiveSplitCanonicalConversationId\(canonicalEmergencyId\);/
    );

    assert.match(
      openConversationIdFastSource,
      /setActiveSplitCanonicalConversationId\([\s\S]*?getCanonicalEmergencyConversationId\(stagedConversation\)[\s\S]*?: null/,
      "openConversationIdFast should clear canonical id with null"
    );
  });

test("Emergency canonical hydration never uses requestId in embedded split path", () => {
  assert.match(
    openConversationSource,
    /const canonicalEmergencyId = getCanonicalEmergencyConversationId\(quote\);/
  );
  assert.doesNotMatch(
    openConversationSource,
    /quote\.request_id/
  );
  assert.match(
    inboxSource,
    /function getCanonicalEmergencyConversationId\([\s\S]*?const isEmergencySource[\s\S]*quote\?\.conversationId \|\| quote\?\.conversation_id \|\| quote\?\.id/s
  );
  assert.match(
    openConversationIdFastSource,
    /setActiveSplitCanonicalConversationId\([\s\S]*getCanonicalEmergencyConversationId\(stagedConversation\)/
  );
});

  test("embedded split clears stale emergency identity when switching away from canonical rows", () => {
    const nonCanonicalSplitBlock = openConversationSource.match(
      /if \(isSplitPane\)[\s\S]*?setActiveSplitConversationId\(String\(conversation\.id\)\);[\s\S]*?setActiveSplitCanonicalConversationId\(null\);/
    );
    assert.ok(nonCanonicalSplitBlock, "non-emergency split branch clears canonical split id");

    const routeBackClearBlock = inboxSource.match(
      /const handleSplitThreadPageChange = useCallback\([\s\S]*?if \(nextPage === "messagesInbox" \|\| nextPage === "conversationThread"\) \{[\s\S]*?setActiveSplitCanonicalConversationId\(null\);/
    );
    assert.ok(routeBackClearBlock, "split close callback clears canonical split id");
  });

test("embedded canonical thread receives a stable navigation callback", () => {
  const callbackSource = inboxSource.slice(
    inboxSource.indexOf("const handleSplitThreadPageChange = useCallback("),
    inboxSource.indexOf("function getCanonicalEmergencyConversationId")
  );
  const embeddedThreadSource = inboxSource.slice(
    inboxSource.indexOf("{activeSplitConversation ? ("),
    inboxSource.indexOf("{isWideWorkspace && renderWorkspaceContextPanel()}")
  );

  assert.match(callbackSource, /\[routedConversationId, setPage\]/);
  assert.doesNotMatch(
    callbackSource,
    /activeEmergencyContext|activeSplitConversation|quotes/
  );
  assert.match(
    embeddedThreadSource,
    /setPage=\{handleSplitThreadPageChange\}/
  );
  assert.doesNotMatch(embeddedThreadSource, /setPage=\{\(nextPage\) =>/);
});

test("same embedded conversation remains mounted while parent context refreshes", () => {
  const embeddedThreadSource = inboxSource.slice(
    inboxSource.indexOf("{activeSplitConversation ? ("),
    inboxSource.indexOf("{isWideWorkspace && renderWorkspaceContextPanel()}")
  );

  assert.doesNotMatch(embeddedThreadSource, /<ConversationThread[\s\S]*?key=/);
  assert.match(
    embeddedThreadSource,
    /canonicalConversationId=\{activeSplitCanonicalConversationId\}/
  );
  assert.match(
    embeddedThreadSource,
    /onCanonicalEmergencyContextChange=\{[\s\S]*handleCanonicalEmergencyContextChange/
  );
});

test("canonical conversation switches reset loading without resetting stable refreshes", () => {
  assert.match(
    threadSource,
    /const canonicalRouteChanged =[\s\S]*canonicalConversationIdentityRef\.current !==[\s\S]*canonicalConversationId/
  );
  assert.match(
    threadSource,
    /if \(canonicalRouteChanged\) \{[\s\S]*setMessages\(\[\]\)[\s\S]*setCanonicalMessagesPhase\("loading"\)/
  );
  assert.doesNotMatch(
    threadSource,
    /else if \(isCanonicalThread\)[\s\S]{0,300}setCanonicalMessagesPhase\("loading"\)/
  );
});

test("standalone and phone canonical thread ownership remain unchanged", () => {
  assert.match(appSource, /<ConversationThread setPage=\{setPage\} \/>/);
  assert.match(threadSource, /emergencyContextMode = "stacked"/);
  assert.match(
    threadSource,
    /createEmergencyRefreshCoordinator\(\{[\s\S]*load: loadMessages/
  );
  assert.doesNotMatch(inboxSource, /\/conversations\/\$\{[^}]+\}\/messages/);
});
