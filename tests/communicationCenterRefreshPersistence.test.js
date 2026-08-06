import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CANONICAL_CONVERSATION_COMMUNICATION_SHELL,
  CONVERSATION_THREAD_TYPES,
  parseCanonicalConversationRoute,
} from "../src/utils/canonicalConversationMessaging.js";
import { shouldUseCommunicationCenterConversationRoute } from "../src/utils/communicationLayout.js";
import { getCanonicalConversationActionTarget } from "../src/utils/conversationActionRouting.js";

const messagesSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);
const canonicalOpenSource = messagesSource.slice(
  messagesSource.indexOf("function openConversation("),
  messagesSource.indexOf("const conversation = prepareConversation")
);
const splitSelectionSource = messagesSource.slice(
  messagesSource.indexOf("const activeSplitCanonicalConversationId ="),
  messagesSource.indexOf("const activeWorkspaceConversation =")
);
const splitCloseSource = messagesSource.slice(
  messagesSource.indexOf("const handleSplitThreadPageChange = useCallback("),
  messagesSource.indexOf("function getCanonicalEmergencyConversationId")
);

test("MessagesInbox has no executable reference to the removed canonical identity helper", () => {
  assert.doesNotMatch(messagesSource, /claimsCanonicalConversationIdentity/);
  assert.doesNotMatch(messagesSource, /function claimsCanonicalConversationIdentity/);
  assert.match(messagesSource, /function getConversationRecordProvenance\(record = \{\}\)/);
});

function getRecordProvenance(record = {}) {
  const canonicalTarget = getCanonicalConversationActionTarget(record, {
    returnPage: "messagesInbox",
  });

  if (canonicalTarget.ok) {
    return {
      type: "canonical",
      conversationId: canonicalTarget.conversationId,
    };
  }

  const threadType = String(record.threadType || "").trim();
  const conversationType = String(record.conversation_type || "").trim();

  if (
    threadType === CONVERSATION_THREAD_TYPES.LEGACY_QUOTE_REQUEST ||
    conversationType === CONVERSATION_THREAD_TYPES.LEGACY_QUOTE_REQUEST ||
    conversationType === "standard"
  ) {
    return {
      type: "legacy",
      conversationId: null,
    };
  }

  return {
    type: "unknown",
    conversationId: null,
  };
}

function resolveRefreshSelection({ route, records = [] }) {
  const parsed = parseCanonicalConversationRoute(route);
  const routedId =
    parsed.valid &&
    (parsed.returnPage === "messagesInbox" ||
      parsed.shell === CANONICAL_CONVERSATION_COMMUNICATION_SHELL)
      ? parsed.conversationId
      : null;

  if (routedId) {
    const canonicalMatch = records.find((record) => {
      const provenance = getRecordProvenance(record);

      return (
        provenance.type === "canonical" &&
        String(provenance.conversationId) === String(routedId)
      );
    });

    return canonicalMatch || null;
  }

  return null;
}

test("desktop canonical selection emits the governed Communication Center shell route", () => {
  const target = getCanonicalConversationActionTarget(
    {
      id: 91,
      conversationId: 91,
      canonicalConversationId: 91,
      threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
    },
    {
      returnPage: "messagesInbox",
      preferCommunicationCenterShell: true,
    }
  );
  const route = parseCanonicalConversationRoute(`#${target.route}`);

  assert.equal(
    target.route,
    "conversationThread?conversationId=91&returnPage=messagesInbox&shell=communicationCenter"
  );
  assert.equal(route.conversationId, 91);
  assert.equal(route.returnPage, "messagesInbox");
  assert.equal(route.shell, CANONICAL_CONVERSATION_COMMUNICATION_SHELL);
  assert.equal(
    shouldUseCommunicationCenterConversationRoute(route, {
      layoutMode: "desktop",
      contentWidth: 1200,
    }),
    true
  );
  assert.match(
    canonicalOpenSource,
    /preferCommunicationCenterShell: isSplitPane/
  );
  assert.match(
    canonicalOpenSource,
    /if \(isSplitPane\) \{\s*setPage\(canonicalTarget\.route\);/
  );
  assert.doesNotMatch(canonicalOpenSource, /setPage\("messagesInbox"\)/);
});

test("routed canonical identity wins over stale storage and same-name relationships", () => {
  const relationships = [
    {
      id: 91,
      participantName: "Liam Molina",
      canonicalConversationId: 91,
      threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
    },
    {
      id: 92,
      participantName: "Liam Molina",
      canonicalConversationId: 92,
      threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
    },
  ];
  const selected = resolveRefreshSelection({
    route:
      "#conversationThread?conversationId=91&returnPage=messagesInbox&shell=communicationCenter",
    records: relationships,
    storedId: "92",
  });

  assert.equal(selected.id, 91);
  assert.equal(selected.participantName, "Liam Molina");
  assert.match(
    splitSelectionSource,
    /getActiveSplitSelectionId\(\s*conversation,\s*activeSplitCanonicalConversationId,\s*activeCompatibilityConversationId/
  );
});

test("bare Messages inbox cannot restore a canonical API record from storage", () => {
  const selected = resolveRefreshSelection({
    route: "#messagesInbox",
    records: [
      {
        id: 92,
        canonicalConversationId: 92,
        threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
      },
    ],
    storedId: "92",
  });

  assert.equal(selected, null);
  assert.match(
    messagesSource,
    /if \(canonicalConversationId\) \{[\s\S]*provenance\.type === "canonical"[\s\S]*provenance\.conversationId/
  );
  assert.match(
    messagesSource,
    /return provenance\.type === "legacy"[\s\S]*legacyConversationId/
  );
});

test("a routed canonical id absent from the collection cannot substitute another row", () => {
  const selected = resolveRefreshSelection({
    route:
      "#conversationThread?conversationId=91&returnPage=messagesInbox&shell=communicationCenter",
    records: [
      {
        id: 92,
        canonicalConversationId: 92,
        threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
      },
    ],
    storedId: "92",
  });

  assert.equal(selected, null);
  assert.match(
    splitSelectionSource,
    /const routedSplitConversation =[\s\S]*activeRoutedConversationId &&[\s\S]*routedWorkspaceRecord &&[\s\S]*\? routedWorkspaceRecord\s*:\s*null/
  );
});

test("closing a canonical thread returns to neutral bare Messages without storage restoration", () => {
  assert.match(
    splitCloseSource,
    /if \(nextPage === "messagesInbox" && routedConversationId\) \{[\s\S]*setActiveSplitConversationId\(""\);[\s\S]*setActiveSplitCanonicalConversationId\(null\);[\s\S]*setPage\("messagesInbox"\)/
  );
  assert.equal(
    resolveRefreshSelection({
      route: "#messagesInbox",
      records: [
        {
          id: 91,
          canonicalConversationId: 91,
          threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
        },
      ],
      storedId: "91",
    }),
    null
  );
});

test("mobile canonical routing stays query-bearing and standalone", () => {
  const target = getCanonicalConversationActionTarget(
    { conversationId: 91 },
    {
      returnPage: "messagesInbox",
      preferCommunicationCenterShell: false,
    }
  );
  const route = parseCanonicalConversationRoute(`#${target.route}`);

  assert.equal(
    target.route,
    "conversationThread?conversationId=91&returnPage=messagesInbox"
  );
  assert.equal(route.conversationId, 91);
  assert.equal(route.shell, "");
  assert.equal(
    shouldUseCommunicationCenterConversationRoute(route, {
      layoutMode: "mobile",
      contentWidth: 390,
    }),
    false
  );
});

test("canonical Emergency selection uses the same governed route identity", () => {
  const target = getCanonicalConversationActionTarget(
    {
      id: 195,
      conversationId: 195,
      emergencyRequestId: 42,
      sourceType: "emergency",
      threadType: CONVERSATION_THREAD_TYPES.CANONICAL,
    },
    {
      returnPage: "messagesInbox",
      preferCommunicationCenterShell: true,
    }
  );
  const route = parseCanonicalConversationRoute(`#${target.route}`);

  assert.equal(route.conversationId, 195);
  assert.notEqual(route.conversationId, 42);
  assert.equal(route.shell, CANONICAL_CONVERSATION_COMMUNICATION_SHELL);
});

test("bare Messages does not treat a stored legacy id as selection authority", () => {
  const selected = resolveRefreshSelection({
    route: "#messagesInbox",
    records: [
      {
        id: "relationship-chat-7",
        conversation_type: "standard",
      },
    ],
    storedId: "relationship-chat-7",
  });

  assert.equal(selected, null);
});

test("routed canonical identity globally outranks a stale explicit legacy row", () => {
  const selected = resolveRefreshSelection({
    route:
      "#conversationThread?conversationId=91&returnPage=messagesInbox&shell=communicationCenter",
    records: [
      {
        id: "legacy-92",
        conversation_type: "standard",
        participantName: "Liam Molina",
        project_title: "Wrong relationship",
      },
      {
        id: 91,
        conversationId: 91,
        participantName: "Liam Molina",
        project_title: "Correct relationship",
      },
    ],
    storedId: "legacy-92",
  });

  assert.equal(selected.id, 91);
  assert.equal(selected.project_title, "Correct relationship");
});

test("missing routed canonical row cannot fall back to stored legacy selection", () => {
  const selected = resolveRefreshSelection({
    route:
      "#conversationThread?conversationId=91&returnPage=messagesInbox&shell=communicationCenter",
    records: [
      {
        id: "legacy-92",
        conversation_type: "standard",
      },
    ],
    storedId: "legacy-92",
  });

  assert.equal(selected, null);
});

test("canonical-capable incomplete records are not implicitly legacy", () => {
  const record = {
    id: 91,
    conversationId: 91,
  };

  assert.deepEqual(getRecordProvenance(record), {
    type: "canonical",
    conversationId: 91,
  });

  const selected = resolveRefreshSelection({
    route: "#messagesInbox",
    records: [record],
    storedId: "91",
  });

  assert.equal(selected, null);
});

test("unknown records fail closed instead of becoming legacy", () => {
  const record = {
    id: "unknown-7",
    participantName: "Liam Molina",
  };

  assert.deepEqual(getRecordProvenance(record), {
    type: "unknown",
    conversationId: null,
  });

  const selected = resolveRefreshSelection({
    route: "#messagesInbox",
    records: [record],
    storedId: "unknown-7",
  });

  assert.equal(selected, null);
});

test("presentation title and participant cannot substitute for canonical identity", () => {
  const selected = resolveRefreshSelection({
    route:
      "#conversationThread?conversationId=91&returnPage=messagesInbox&shell=communicationCenter",
    records: [
      {
        id: 92,
        conversationId: 92,
        participantName: "Liam Molina",
        project_title: "Door Repair",
      },
      {
        id: 91,
        conversationId: 91,
        participantName: "Liam Molina",
        project_title: "Door Repair",
      },
    ],
    storedId: "92",
  });

  assert.equal(selected.id, 91);
  assert.equal(selected.conversationId, 91);
});
