import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  COMMUNICATION_SELECTION_KINDS,
  COMMUNICATION_WORKSPACE_ACTIONS,
  VALID_COMMUNICATION_WORKSPACES,
  communicationWorkspaceReducer,
  createInitialCommunicationWorkspaceState,
  getCommunicationWorkspaceForConversation,
  getCommunicationWorkspaceMemory,
  isCommunicationRecordEligibleForWorkspace,
  normalizeCommunicationSelection,
  normalizeCommunicationWorkspace,
  planCommunicationWorkspaceTransition,
  resolveCommunicationEmergencyContext,
  resolveRestorableCommunicationSelection,
} from "../src/utils/communicationWorkspaceState.js";

const workspaceStateSource = readFileSync(
  new URL("../src/utils/communicationWorkspaceState.js", import.meta.url),
  "utf8"
);

function reduce(state, action) {
  return communicationWorkspaceReducer(state, action);
}

function rememberCanonical(state, workspace, conversationId) {
  return reduce(state, {
    type: COMMUNICATION_WORKSPACE_ACTIONS.REMEMBER_SELECTION,
    workspace,
    selection: {
      kind: COMMUNICATION_SELECTION_KINDS.CANONICAL_CONVERSATION,
      conversationId,
    },
  });
}

function canonicalOptions(workspace) {
  return {
    getRecordId: (record) => record.conversationId,
    getUnreadCount: (record) => record.unread_count,
    isCanonicalRecord: (record) => record.provenance === "canonical",
    isEligible: (record) =>
      record.authorized !== false &&
      record.privacyEligible !== false &&
      isCommunicationRecordEligibleForWorkspace(record, workspace),
  };
}

function emergencyContextOptions(overrides = {}) {
  const activeConversation = {
    conversationId: 195,
    conversation_type: "emergency",
    provenance: "canonical",
    authorized: true,
    ...overrides.activeConversation,
  };

  return {
    activeWorkspace: "emergency",
    activeConversationId: 195,
    activeConversation,
    getConversationId: (record) => record.conversationId,
    isCanonicalRecord: (record) => record.provenance === "canonical",
    isEligible: (record) => record.authorized === true,
    ...overrides,
  };
}

test("initial state validates the active workspace and represents all permanent workspaces", () => {
  const state = createInitialCommunicationWorkspaceState();
  const invalid = createInitialCommunicationWorkspaceState({
    activeWorkspace: "unknown",
  });

  assert.deepEqual(VALID_COMMUNICATION_WORKSPACES, [
    "conversations",
    "history",
    "hiring",
    "emergency",
    "contacts",
  ]);
  assert.equal(state.activeWorkspace, "conversations");
  assert.equal(invalid.activeWorkspace, "conversations");
  assert.deepEqual(Object.keys(state.workspaces), VALID_COMMUNICATION_WORKSPACES);
  assert.equal(normalizeCommunicationWorkspace("all"), "conversations");
  assert.equal(normalizeCommunicationWorkspace("savedHistory"), "history");
});

test("unknown actions and invalid target workspaces leave state unchanged", () => {
  const state = createInitialCommunicationWorkspaceState({
    activeWorkspace: "hiring",
  });

  assert.equal(reduce(state, { type: "unknown" }), state);
  assert.equal(
    reduce(state, {
      type: COMMUNICATION_WORKSPACE_ACTIONS.ACTIVATE,
      workspace: "invalid",
    }),
    state
  );
  assert.equal(
    reduce(state, {
      type: COMMUNICATION_WORKSPACE_ACTIONS.SET_SEARCH,
      workspace: "invalid",
      searchQuery: "must not leak",
    }),
    state
  );
});

test("search state remains independent for Conversations, Hiring, Emergency, and Contacts", () => {
  let state = createInitialCommunicationWorkspaceState();
  const searches = {
    conversations: "kitchen",
    hiring: "electrician",
    emergency: "water leak",
    contacts: "Molina",
  };

  for (const [workspace, searchQuery] of Object.entries(searches)) {
    state = reduce(state, {
      type: COMMUNICATION_WORKSPACE_ACTIONS.SET_SEARCH,
      workspace,
      searchQuery,
    });
  }

  for (const [workspace, searchQuery] of Object.entries(searches)) {
    assert.equal(
      getCommunicationWorkspaceMemory(state, workspace).searchQuery,
      searchQuery
    );
  }
  assert.equal(getCommunicationWorkspaceMemory(state, "history").searchQuery, "");
});

test("typed selections and filters are isolated without mutating prior state", () => {
  const initial = createInitialCommunicationWorkspaceState();
  const withConversation = rememberCanonical(initial, "conversations", 91);
  const withRelationship = reduce(withConversation, {
    type: COMMUNICATION_WORKSPACE_ACTIONS.REMEMBER_SELECTION,
    workspace: "contacts",
    selection: {
      kind: COMMUNICATION_SELECTION_KINDS.RELATIONSHIP,
      relationshipId: "relationship-7",
    },
  });
  const final = reduce(withRelationship, {
    type: COMMUNICATION_WORKSPACE_ACTIONS.SET_FILTERS,
    workspace: "contacts",
    filters: { type: "professional" },
  });

  assert.equal(
    getCommunicationWorkspaceMemory(initial, "conversations").selectedRecord,
    null
  );
  assert.deepEqual(
    getCommunicationWorkspaceMemory(final, "conversations").selectedRecord,
    { kind: "canonical_conversation", conversationId: 91 }
  );
  assert.deepEqual(
    getCommunicationWorkspaceMemory(final, "contacts").selectedRecord,
    { kind: "relationship", relationshipId: "relationship-7" }
  );
  assert.deepEqual(getCommunicationWorkspaceMemory(final, "contacts").filters, {
    type: "professional",
  });
});

test("selection validation keeps canonical and noncanonical identity fields distinct", () => {
  assert.deepEqual(
    normalizeCommunicationSelection({
      kind: "canonical_conversation",
      conversationId: 91,
    }),
    { kind: "canonical_conversation", conversationId: 91 }
  );
  assert.deepEqual(
    normalizeCommunicationSelection({
      kind: "compatibility_conversation",
      compatibilityId: "91",
    }),
    { kind: "compatibility_conversation", compatibilityId: "91" }
  );
  assert.deepEqual(
    normalizeCommunicationSelection({ kind: "contact", contactId: "c-2" }),
    { kind: "contact", contactId: "c-2" }
  );
  assert.equal(
    normalizeCommunicationSelection({
      kind: "canonical_conversation",
      compatibilityId: "91",
    }),
    null
  );
});

test("canonical selection authority requires exact own data properties without coercion", () => {
  const inheritedKind = Object.create({ kind: "canonical_conversation" });
  inheritedKind.conversationId = 91;
  const inheritedId = Object.create({ conversationId: 91 });
  inheritedId.kind = "canonical_conversation";
  const bothInherited = Object.create({
    kind: "canonical_conversation",
    conversationId: 91,
  });
  const arbitraryPrototype = Object.create({ arbitrary: true });
  arbitraryPrototype.kind = "canonical_conversation";
  arbitraryPrototype.conversationId = 91;
  let kindGetterReads = 0;
  const getterKind = { conversationId: 91 };
  Object.defineProperty(getterKind, "kind", {
    get() {
      kindGetterReads += 1;
      return "canonical_conversation";
    },
  });
  let idGetterReads = 0;
  const getterId = { kind: "canonical_conversation" };
  Object.defineProperty(getterId, "conversationId", {
    get() {
      idGetterReads += 1;
      return 91;
    },
  });

  for (const selection of [
    { kind: "canonical_conversation", conversationId: "91" },
    { kind: "canonical_conversation", conversationId: "001" },
    inheritedKind,
    inheritedId,
    bothInherited,
    getterKind,
    getterId,
    arbitraryPrototype,
  ]) {
    assert.equal(normalizeCommunicationSelection(selection), null);
  }

  assert.equal(kindGetterReads, 0);
  assert.equal(idGetterReads, 0);
});

test("null-prototype selections with own data are accepted while class instances fail closed", () => {
  const nullPrototypeSelection = Object.create(null);
  Object.defineProperties(nullPrototypeSelection, {
    kind: {
      configurable: true,
      enumerable: true,
      value: "canonical_conversation",
      writable: true,
    },
    conversationId: {
      configurable: true,
      enumerable: true,
      value: 91,
      writable: true,
    },
  });

  class Selection {
    constructor() {
      this.kind = "canonical_conversation";
      this.conversationId = 91;
    }
  }

  assert.deepEqual(normalizeCommunicationSelection(nullPrototypeSelection), {
    kind: "canonical_conversation",
    conversationId: 91,
  });
  assert.equal(normalizeCommunicationSelection(new Selection()), null);
});

test("selection normalization does not mutate input or cross identity domains", () => {
  const canonical = {
    kind: "canonical_conversation",
    conversationId: 91,
  };
  const compatibility = {
    kind: "compatibility_conversation",
    compatibilityId: "91",
  };
  const canonicalSnapshot = structuredClone(canonical);
  const compatibilitySnapshot = structuredClone(compatibility);

  assert.deepEqual(normalizeCommunicationSelection(canonical), canonical);
  assert.deepEqual(
    normalizeCommunicationSelection(compatibility),
    compatibility
  );
  assert.deepEqual(canonical, canonicalSnapshot);
  assert.deepEqual(compatibility, compatibilitySnapshot);
  assert.equal(
    normalizeCommunicationSelection({
      kind: "canonical_conversation",
      compatibilityId: "91",
    }),
    null
  );
});

test("noncanonical selection identities also require own data properties", () => {
  for (const [kind, field] of [
    ["compatibility_conversation", "compatibilityId"],
    ["relationship", "relationshipId"],
    ["contact", "contactId"],
  ]) {
    const inheritedKind = Object.create({ kind });
    inheritedKind[field] = "record-91";
    const inheritedIdentity = Object.create({ [field]: "record-91" });
    inheritedIdentity.kind = kind;
    const getterIdentity = { kind };
    Object.defineProperty(getterIdentity, field, {
      get() {
        throw new Error("selection accessor must not execute");
      },
    });

    assert.equal(normalizeCommunicationSelection(inheritedKind), null);
    assert.equal(normalizeCommunicationSelection(inheritedIdentity), null);
    assert.equal(normalizeCommunicationSelection(getterIdentity), null);
  }
});

test("malformed, unsafe, bare, and unknown selections fail closed", () => {
  let valueOfReads = 0;
  const coercibleId = {
    valueOf() {
      valueOfReads += 1;
      return 91;
    },
  };

  for (const selection of [
    { kind: "canonical_conversation", conversationId: 0 },
    { kind: "canonical_conversation", conversationId: -1 },
    { kind: "canonical_conversation", conversationId: "01" },
    { kind: "canonical_conversation", conversationId: "1.5" },
    { kind: "canonical_conversation", conversationId: 1.5 },
    { kind: "canonical_conversation", conversationId: Number.MAX_SAFE_INTEGER + 1 },
    { kind: "canonical_conversation", conversationId: null },
    { kind: "canonical_conversation", conversationId: undefined },
    { kind: "canonical_conversation", conversationId: NaN },
    { kind: "canonical_conversation", conversationId: Infinity },
    { kind: "canonical_conversation", conversationId: coercibleId },
    { kind: "canonical_conversation", conversationId: [] },
    { kind: "canonical_conversation", id: 91 },
    { kind: "relationship", relationshipId: "" },
    { kind: "relationship", relationshipId: { id: 91 } },
    { kind: "contact", contactId: false },
    { kind: "compatibility_conversation", compatibilityId: -1 },
    { kind: "unknown", id: "91" },
    null,
  ]) {
    assert.equal(normalizeCommunicationSelection(selection), null);
  }
  assert.equal(valueOfReads, 0);
});

test("record eligibility is exclusive and unknown provenance does not broaden into Conversations", () => {
  const fixtures = [
    [{ conversation_type: "canonical_conversation" }, "conversations"],
    [{ conversation_type: "request_opportunity" }, "conversations"],
    [{ conversation_type: "standard" }, "conversations"],
    [{ conversation_type: "hiring_application" }, "hiring"],
    [{ sourceType: "emergency" }, "emergency"],
    [{ recordKind: "relationship" }, "contacts"],
    [{ conversation_type: "canonical_conversation", archived: true }, "history"],
  ];

  for (const [record, workspace] of fixtures) {
    assert.equal(getCommunicationWorkspaceForConversation(record), workspace);
    for (const candidate of VALID_COMMUNICATION_WORKSPACES) {
      assert.equal(
        isCommunicationRecordEligibleForWorkspace(record, candidate),
        candidate === workspace
      );
    }
  }
  assert.equal(getCommunicationWorkspaceForConversation({}), null);
  assert.equal(getCommunicationWorkspaceForConversation(null), null);
  assert.equal(getCommunicationWorkspaceForConversation([]), null);
  assert.equal(
    getCommunicationWorkspaceForConversation({ conversation_type: "unknown" }),
    null
  );
  assert.equal(
    getCommunicationWorkspaceForConversation(
      {
        conversation_type: "emergency",
        saved_to_history: true,
      },
      { includeHistory: false }
    ),
    "emergency"
  );
});

test("Emergency classification requires exact conversation source or type evidence", () => {
  let typeGetterReads = 0;
  const getterBackedType = {};
  Object.defineProperty(getterBackedType, "conversation_type", {
    get() {
      typeGetterReads += 1;
      return "emergency";
    },
  });
  const fixtures = [
    [{ conversation_type: "emergency" }, "emergency"],
    [{ sourceType: "emergency" }, "emergency"],
    [{ source: { type: "emergency" } }, "emergency"],
    [
      { conversation_type: "standard", emergencyRequestId: 6 },
      "conversations",
    ],
    [
      { conversation_type: "hiring_application", emergencyRequestId: 6 },
      "hiring",
    ],
    [{ emergencyRequestId: 6 }, null],
    [{ emergency_request_id: 6 }, null],
    [
      { conversation_type: "request_opportunity", emergencyRequestId: 6 },
      "conversations",
    ],
    [
      {
        conversation_type: "hiring_application",
        sourceType: "emergency",
      },
      "emergency",
    ],
    [{ title: "Emergency plumbing conversation" }, null],
    [{ urgency: "emergency", priority: "urgent" }, null],
    [{ source: { isEmergency: true } }, null],
    [{ conversation_type: { valueOf: () => "emergency" } }, null],
    [{ sourceType: { toString: () => "emergency" } }, null],
    [Object.create({ conversation_type: "emergency" }), null],
    [getterBackedType, null],
    [{ conversation_type: "standard", emergency_request_id: "6" }, "conversations"],
  ];

  for (const [record, expectedWorkspace] of fixtures) {
    assert.equal(
      getCommunicationWorkspaceForConversation(record),
      expectedWorkspace
    );
  }
  assert.equal(typeGetterReads, 0);
});

test("ordinary records cannot enter the Emergency projection through request identity or display data", () => {
  for (const record of [
    {
      conversation_type: "standard",
      conversationId: 91,
      emergencyRequestId: 6,
    },
    {
      conversation_type: "canonical_conversation",
      emergency_request_id: 6,
      badge: "Emergency",
    },
    {
      conversation_type: "request_opportunity",
      requestId: 6,
      preview: "Emergency help requested",
    },
  ]) {
    assert.equal(
      isCommunicationRecordEligibleForWorkspace(record, "emergency"),
      false
    );
  }
});

test("Emergency context resolves only for the exact active eligible canonical registry record", () => {
  const context = {
    conversationId: 195,
    detail: {
      type: "emergency",
      customerName: "Private Customer",
      address: "Private Address",
      requestDetails: "Private Work Details",
    },
  };

  assert.equal(
    resolveCommunicationEmergencyContext(context, emergencyContextOptions()),
    context
  );
  assert.equal(
    resolveCommunicationEmergencyContext(context, emergencyContextOptions({
      activeConversation: null,
    })),
    null
  );
  assert.equal(
    resolveCommunicationEmergencyContext(context, emergencyContextOptions({
      activeWorkspace: "conversations",
    })),
    null
  );
  assert.equal(
    resolveCommunicationEmergencyContext(context, emergencyContextOptions({
      activeConversationId: 196,
    })),
    null
  );
  assert.equal(
    resolveCommunicationEmergencyContext(context, emergencyContextOptions({
      activeConversation: { conversationId: 195, conversation_type: "standard", provenance: "canonical", authorized: true },
    })),
    null
  );
  assert.equal(
    resolveCommunicationEmergencyContext(context, emergencyContextOptions({
      activeConversation: { conversationId: 195, conversation_type: "emergency", provenance: "compatibility", authorized: true },
    })),
    null
  );
  assert.equal(
    resolveCommunicationEmergencyContext(context, emergencyContextOptions({
      isEligible: () => false,
    })),
    null
  );
});

test("stale Emergency PII fails closed on registry loss, mismatch, or replacement", () => {
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
  const replacementOptions = emergencyContextOptions({
    activeConversationId: 196,
    activeConversation: {
      conversationId: 196,
      conversation_type: "emergency",
      provenance: "canonical",
      authorized: true,
    },
  });

  assert.equal(
    resolveCommunicationEmergencyContext(staleContext, emergencyContextOptions({
      activeConversation: null,
    })),
    null
  );
  assert.equal(
    resolveCommunicationEmergencyContext(staleContext, replacementOptions),
    null
  );
  assert.equal(
    resolveCommunicationEmergencyContext(replacementContext, replacementOptions),
    replacementContext
  );
  assert.doesNotMatch(
    JSON.stringify(
      resolveCommunicationEmergencyContext(staleContext, replacementOptions)
    ),
    /Stale Customer|Stale Address|Stale Work Details/
  );
});

test("Emergency context identity does not coerce numeric strings or execute accessors", () => {
  let contextIdReads = 0;
  const getterContext = {
    detail: { type: "emergency" },
  };
  Object.defineProperty(getterContext, "conversationId", {
    get() {
      contextIdReads += 1;
      return 195;
    },
  });

  assert.equal(
    resolveCommunicationEmergencyContext(
      {
        conversationId: "195",
        detail: { type: "emergency" },
      },
      emergencyContextOptions()
    ),
    null
  );
  assert.equal(
    resolveCommunicationEmergencyContext(getterContext, emergencyContextOptions()),
    null
  );
  assert.equal(contextIdReads, 0);
});

test("only an exact eligible canonical record with numeric unread_count zero may restore", () => {
  const state = rememberCanonical(
    createInitialCommunicationWorkspaceState(),
    "emergency",
    195
  );
  const records = [
    {
      conversationId: 194,
      conversation_type: "emergency",
      provenance: "canonical",
      unread_count: 0,
    },
    {
      conversationId: 195,
      conversation_type: "emergency",
      provenance: "canonical",
      unread_count: 0,
    },
  ];

  assert.equal(
    resolveRestorableCommunicationSelection(
      state,
      "emergency",
      records,
      canonicalOptions("emergency")
    ),
    records[1]
  );
});

test("missing, malformed, negative, and positive unread counts all fail closed", () => {
  const state = rememberCanonical(
    createInitialCommunicationWorkspaceState(),
    "hiring",
    12
  );

  for (const unread_count of [undefined, null, "0", -1, 1, 4, NaN]) {
    assert.equal(
      resolveRestorableCommunicationSelection(
        state,
        "hiring",
        [
          {
            conversationId: 12,
            conversation_type: "hiring",
            provenance: "canonical",
            unread_count,
          },
        ],
        canonicalOptions("hiring")
      ),
      null
    );
  }
});

test("absent, wrong-workspace, unauthorized, privacy-mismatched, and unknown records do not restore", () => {
  const state = rememberCanonical(
    createInitialCommunicationWorkspaceState(),
    "emergency",
    12
  );
  const unsafeRecords = [
    { conversationId: 13, conversation_type: "emergency", provenance: "canonical", unread_count: 0 },
    { conversationId: 12, conversation_type: "standard", provenance: "canonical", unread_count: 0 },
    { conversationId: 12, conversation_type: "emergency", provenance: "canonical", unread_count: 0, authorized: false },
    { conversationId: 12, conversation_type: "emergency", provenance: "canonical", unread_count: 0, privacyEligible: false },
    { conversationId: 12, conversation_type: "emergency", provenance: "unknown", unread_count: 0 },
  ];

  for (const record of unsafeRecords) {
    assert.equal(
      resolveRestorableCommunicationSelection(
        state,
        "emergency",
        [record],
        canonicalOptions("emergency")
      ),
      null
    );
  }
});

test("compatibility selection can never be restored as canonical", () => {
  const state = reduce(createInitialCommunicationWorkspaceState(), {
    type: COMMUNICATION_WORKSPACE_ACTIONS.REMEMBER_SELECTION,
    workspace: "conversations",
    selection: {
      kind: COMMUNICATION_SELECTION_KINDS.COMPATIBILITY_CONVERSATION,
      compatibilityId: "legacy-12",
    },
  });

  assert.equal(
    resolveRestorableCommunicationSelection(
      state,
      "conversations",
      [{ conversationId: 12, conversation_type: "standard", unread_count: 0 }],
      canonicalOptions("conversations")
    ),
    null
  );
});

test("the production transition plan restores only target memory and invalidates every dependent pane", () => {
  let state = rememberCanonical(
    createInitialCommunicationWorkspaceState(),
    "conversations",
    91
  );
  state = rememberCanonical(state, "hiring", 12);
  const hiringRecord = {
    conversationId: 12,
    conversation_type: "hiring_application",
    provenance: "canonical",
    unread_count: 0,
  };
  const transition = planCommunicationWorkspaceTransition(
    state,
    "hiring",
    [
      {
        conversationId: 91,
        conversation_type: "canonical_conversation",
        provenance: "canonical",
        unread_count: 0,
      },
      hiringRecord,
    ],
    canonicalOptions("hiring")
  );

  assert.equal(transition.valid, true);
  assert.equal(transition.activeWorkspace, "hiring");
  assert.equal(transition.selectedRecord, hiringRecord);
  assert.equal(transition.clearConversation, true);
  assert.equal(transition.clearContext, true);
  assert.equal(transition.clearEmergencyContext, true);
  assert.equal(transition.closeCompactContext, true);
  assert.equal(
    getCommunicationWorkspaceMemory(state, "conversations").selectedRecord
      .conversationId,
    91
  );
});

test("every visible workspace switch uses the same clearing contract and target-only memory", () => {
  let state = createInitialCommunicationWorkspaceState();
  state = rememberCanonical(state, "conversations", 21);
  state = rememberCanonical(state, "hiring", 22);
  state = rememberCanonical(state, "emergency", 23);
  state = reduce(state, {
    type: COMMUNICATION_WORKSPACE_ACTIONS.REMEMBER_SELECTION,
    workspace: "contacts",
    selection: {
      kind: COMMUNICATION_SELECTION_KINDS.CONTACT,
      contactId: "contact-24",
    },
  });

  const cases = [
    ["conversations", "hiring", 22, "hiring_application"],
    ["conversations", "emergency", 23, "emergency"],
    ["hiring", "conversations", 21, "canonical_conversation"],
  ];

  for (const [from, target, conversationId, conversation_type] of cases) {
    const sourceState = reduce(state, {
      type: COMMUNICATION_WORKSPACE_ACTIONS.ACTIVATE,
      workspace: from,
    });
    const targetRecord = {
      conversationId,
      conversation_type,
      provenance: "canonical",
      unread_count: 0,
    };
    const transition = planCommunicationWorkspaceTransition(
      sourceState,
      target,
      [targetRecord],
      canonicalOptions(target)
    );

    assert.equal(transition.activeWorkspace, target);
    assert.equal(transition.selectedRecord, targetRecord);
    assert.deepEqual(
      {
        clearConversation: transition.clearConversation,
        clearContext: transition.clearContext,
        clearEmergencyContext: transition.clearEmergencyContext,
        closeCompactContext: transition.closeCompactContext,
      },
      {
        clearConversation: true,
        clearContext: true,
        clearEmergencyContext: true,
        closeCompactContext: true,
      }
    );
  }

  const contactsTransition = planCommunicationWorkspaceTransition(
    reduce(state, {
      type: COMMUNICATION_WORKSPACE_ACTIONS.ACTIVATE,
      workspace: "emergency",
    }),
    "contacts",
    [{ recordKind: "contact", contactId: "contact-24" }],
    canonicalOptions("contacts")
  );

  assert.equal(contactsTransition.activeWorkspace, "contacts");
  assert.equal(contactsTransition.selectedRecord, null);
  assert.equal(contactsTransition.clearEmergencyContext, true);
  assert.deepEqual(
    getCommunicationWorkspaceMemory(state, "contacts").selectedRecord,
    { kind: "contact", contactId: "contact-24" }
  );
});

test("workspace transitions land safely instead of selecting the first unread or wrong-workspace row", () => {
  const state = rememberCanonical(
    createInitialCommunicationWorkspaceState(),
    "hiring",
    12
  );
  const transition = planCommunicationWorkspaceTransition(
    state,
    "hiring",
    [
      { conversationId: 11, conversation_type: "hiring", provenance: "canonical", unread_count: 0 },
      { conversationId: 12, conversation_type: "hiring", provenance: "canonical", unread_count: 1 },
      { conversationId: 12, conversation_type: "emergency", provenance: "canonical", unread_count: 0 },
    ],
    canonicalOptions("hiring")
  );

  assert.equal(transition.selectedRecord, null);
  assert.equal(transition.clearConversation, true);
  assert.equal(transition.clearContext, true);
});

test("invalid transition targets fail without clearing current presentation state", () => {
  const state = createInitialCommunicationWorkspaceState({
    activeWorkspace: "emergency",
  });
  const transition = planCommunicationWorkspaceTransition(
    state,
    "unknown",
    [],
    canonicalOptions("unknown")
  );

  assert.deepEqual(transition, {
    valid: false,
    activeWorkspace: "emergency",
    selectedRecord: null,
    clearConversation: false,
    clearContext: false,
    clearEmergencyContext: false,
    closeCompactContext: false,
  });
});

test("workspace state remains React, browser, routing, transport, and read-authority independent", () => {
  assert.doesNotMatch(workspaceStateSource, /from ["']react|ConversationThread/);
  assert.doesNotMatch(workspaceStateSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(workspaceStateSource, /authFetch|fetch\s*\(/);
  assert.doesNotMatch(workspaceStateSource, /window\.|document\.|URLSearchParams/);
  assert.doesNotMatch(
    workspaceStateSource,
    /mark(?:Canonical)?ConversationRead|markAlertsResolved|Alert API/
  );
});
