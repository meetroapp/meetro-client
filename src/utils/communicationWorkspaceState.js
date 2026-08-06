import { isHiringConversationType } from "./hiringConversations.js";

export const VALID_COMMUNICATION_WORKSPACES = Object.freeze([
  "conversations",
  "history",
  "hiring",
  "emergency",
  "contacts",
]);

export const COMMUNICATION_WORKSPACES = VALID_COMMUNICATION_WORKSPACES;

export const COMMUNICATION_SELECTION_KINDS = Object.freeze({
  CANONICAL_CONVERSATION: "canonical_conversation",
  COMPATIBILITY_CONVERSATION: "compatibility_conversation",
  RELATIONSHIP: "relationship",
  CONTACT: "contact",
});

export const COMMUNICATION_WORKSPACE_ACTIONS = Object.freeze({
  ACTIVATE: "activate",
  SET_SEARCH: "set_search",
  SET_FILTERS: "set_filters",
  REMEMBER_SELECTION: "remember_selection",
  CLEAR_SELECTION: "clear_selection",
});

const WORKSPACE_SET = new Set(VALID_COMMUNICATION_WORKSPACES);
const CONVERSATION_WORKSPACE_TYPES = new Set([
  "canonical_conversation",
  "legacy_quote_request",
  "request_opportunity",
  "standard",
]);
const COMMUNICATION_SELECTION_KIND_SET = new Set(
  Object.values(COMMUNICATION_SELECTION_KINDS)
);

function isSelectionRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function readOwnDataProperty(value, property) {
  if (!value || typeof value !== "object") return null;

  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, property);

    return descriptor && Object.hasOwn(descriptor, "value")
      ? { value: descriptor.value }
      : null;
  } catch {
    return null;
  }
}

function readOwnNormalizedToken(value, properties) {
  for (const property of properties) {
    const field = readOwnDataProperty(value, property);
    if (!field) continue;
    if (typeof field.value !== "string") return "";

    const normalized = field.value.trim().toLowerCase();
    if (normalized) return normalized;
  }

  return "";
}

function normalizeOpaqueId(value) {
  if (Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized || null;
}

function normalizeCanonicalConversationId(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function isValidCommunicationWorkspace(value) {
  return WORKSPACE_SET.has(String(value || "").trim());
}

export function normalizeCommunicationWorkspace(value) {
  const normalized = String(value || "conversations").trim();

  if (normalized === "all" || normalized === "work") {
    return "conversations";
  }
  if (normalized === "savedHistory") return "history";

  return isValidCommunicationWorkspace(normalized)
    ? normalized
    : "conversations";
}

export function getCommunicationWorkspaceForConversation(
  record = {},
  { includeHistory = true } = {}
) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return null;
  }

  const recordKind = readOwnNormalizedToken(record, ["recordKind", "kind"]);
  if (recordKind === "contact" || recordKind === "relationship") {
    return "contacts";
  }

  if (
    includeHistory &&
    (record.archived === true ||
      record.saved_to_history === true ||
      record.userSavedToHistory === true ||
      record.user_saved_to_history === true)
  ) {
    return "history";
  }

  const type = readOwnNormalizedToken(record, [
    "conversation_type",
    "threadType",
    "type",
  ]);
  const directSourceType = readOwnNormalizedToken(record, ["sourceType"]);
  const source = readOwnDataProperty(record, "source")?.value;
  const sourceType =
    directSourceType || readOwnNormalizedToken(source, ["type"]);

  if (type === "emergency" || sourceType === "emergency") {
    return "emergency";
  }

  if (isHiringConversationType(type)) return "hiring";
  if (CONVERSATION_WORKSPACE_TYPES.has(type)) return "conversations";

  return null;
}

export function isCommunicationRecordEligibleForWorkspace(
  record,
  workspace
) {
  if (!record || !isValidCommunicationWorkspace(workspace)) return false;
  return getCommunicationWorkspaceForConversation(record) === workspace;
}

function createWorkspaceMemory() {
  return Object.freeze({
    selectedRecord: null,
    searchQuery: "",
    filters: Object.freeze({}),
  });
}

export function createInitialCommunicationWorkspaceState({
  activeWorkspace = "conversations",
} = {}) {
  return Object.freeze({
    activeWorkspace: normalizeCommunicationWorkspace(activeWorkspace),
    workspaces: Object.freeze(
      Object.fromEntries(
        VALID_COMMUNICATION_WORKSPACES.map((workspace) => [
          workspace,
          createWorkspaceMemory(),
        ])
      )
    ),
  });
}

export const createCommunicationWorkspaceState =
  createInitialCommunicationWorkspaceState;

export function getCommunicationWorkspaceMemory(state, workspace) {
  const key = normalizeCommunicationWorkspace(workspace);
  return state?.workspaces?.[key] || createWorkspaceMemory();
}

function replaceWorkspaceMemory(state, workspace, replacement) {
  const current = getCommunicationWorkspaceMemory(state, workspace);

  return Object.freeze({
    ...state,
    workspaces: Object.freeze({
      ...state.workspaces,
      [workspace]: Object.freeze({
        ...current,
        ...replacement,
      }),
    }),
  });
}

export function normalizeCommunicationSelection(value) {
  if (!isSelectionRecord(value)) return null;

  const kindField = readOwnDataProperty(value, "kind");
  const kind = kindField?.value;
  if (typeof kind !== "string" || !COMMUNICATION_SELECTION_KIND_SET.has(kind)) {
    return null;
  }

  if (kind === COMMUNICATION_SELECTION_KINDS.CANONICAL_CONVERSATION) {
    const conversationId = normalizeCanonicalConversationId(
      readOwnDataProperty(value, "conversationId")?.value
    );
    return conversationId ? Object.freeze({ kind, conversationId }) : null;
  }

  if (kind === COMMUNICATION_SELECTION_KINDS.COMPATIBILITY_CONVERSATION) {
    const compatibilityId = normalizeOpaqueId(
      readOwnDataProperty(value, "compatibilityId")?.value
    );
    return compatibilityId ? Object.freeze({ kind, compatibilityId }) : null;
  }

  if (kind === COMMUNICATION_SELECTION_KINDS.RELATIONSHIP) {
    const relationshipId = normalizeOpaqueId(
      readOwnDataProperty(value, "relationshipId")?.value
    );
    return relationshipId ? Object.freeze({ kind, relationshipId }) : null;
  }

  if (kind === COMMUNICATION_SELECTION_KINDS.CONTACT) {
    const contactId = normalizeOpaqueId(
      readOwnDataProperty(value, "contactId")?.value
    );
    return contactId ? Object.freeze({ kind, contactId }) : null;
  }

  return null;
}

export function resolveCommunicationEmergencyContext(
  context,
  {
    activeWorkspace,
    activeConversationId,
    activeConversation,
    getConversationId = (record) => record?.conversationId,
    isCanonicalRecord = () => false,
    isEligible = () => false,
  } = {}
) {
  if (
    activeWorkspace !== "emergency" ||
    !activeConversation ||
    typeof activeConversation !== "object" ||
    Array.isArray(activeConversation)
  ) {
    return null;
  }

  const detail = readOwnDataProperty(context, "detail")?.value;
  const detailType = readOwnDataProperty(detail, "type")?.value;
  if (detailType !== "emergency") return null;

  const selectedConversationId = normalizeCanonicalConversationId(
    activeConversationId
  );
  const contextConversationId = normalizeCanonicalConversationId(
    readOwnDataProperty(context, "conversationId")?.value
  );
  const recordConversationId = normalizeCanonicalConversationId(
    getConversationId(activeConversation)
  );

  if (
    !selectedConversationId ||
    contextConversationId !== selectedConversationId ||
    recordConversationId !== selectedConversationId ||
    !isCanonicalRecord(activeConversation) ||
    !isEligible(activeConversation) ||
    getCommunicationWorkspaceForConversation(activeConversation, {
      includeHistory: false,
    }) !== "emergency"
  ) {
    return null;
  }

  return context;
}

export function communicationWorkspaceReducer(state, action = {}) {
  const current = state || createInitialCommunicationWorkspaceState();
  const requestedWorkspace =
    action.workspace === undefined
      ? current.activeWorkspace
      : String(action.workspace || "").trim();

  if (!isValidCommunicationWorkspace(requestedWorkspace)) return current;

  if (action.type === COMMUNICATION_WORKSPACE_ACTIONS.ACTIVATE) {
    if (requestedWorkspace === current.activeWorkspace) return current;
    return Object.freeze({
      ...current,
      activeWorkspace: requestedWorkspace,
    });
  }

  if (action.type === COMMUNICATION_WORKSPACE_ACTIONS.SET_SEARCH) {
    return replaceWorkspaceMemory(current, requestedWorkspace, {
      searchQuery: String(action.searchQuery || ""),
    });
  }

  if (action.type === COMMUNICATION_WORKSPACE_ACTIONS.SET_FILTERS) {
    const filters =
      action.filters &&
      typeof action.filters === "object" &&
      !Array.isArray(action.filters)
        ? Object.freeze({ ...action.filters })
        : Object.freeze({});
    return replaceWorkspaceMemory(current, requestedWorkspace, { filters });
  }

  if (action.type === COMMUNICATION_WORKSPACE_ACTIONS.REMEMBER_SELECTION) {
    const selectedRecord = normalizeCommunicationSelection(action.selection);
    if (!selectedRecord) return current;
    return replaceWorkspaceMemory(current, requestedWorkspace, {
      selectedRecord,
    });
  }

  if (action.type === COMMUNICATION_WORKSPACE_ACTIONS.CLEAR_SELECTION) {
    return replaceWorkspaceMemory(current, requestedWorkspace, {
      selectedRecord: null,
    });
  }

  return current;
}

export function resolveRestorableCommunicationSelection(
  state,
  workspace,
  records = [],
  {
    getRecordId = (record) => record?.conversationId,
    getUnreadCount = (record) => record?.unreadCount,
    isCanonicalRecord = () => false,
    isEligible = () => false,
  } = {}
) {
  if (!isValidCommunicationWorkspace(workspace) || !Array.isArray(records)) {
    return null;
  }

  const selected = getCommunicationWorkspaceMemory(
    state,
    workspace
  ).selectedRecord;
  if (
    selected?.kind !==
    COMMUNICATION_SELECTION_KINDS.CANONICAL_CONVERSATION
  ) {
    return null;
  }

  const record = records.find(
    (candidate) =>
      normalizeCanonicalConversationId(getRecordId(candidate)) ===
      selected.conversationId
  );
  if (!record || !isCanonicalRecord(record) || !isEligible(record)) return null;

  const unreadCount = getUnreadCount(record);
  if (!Number.isSafeInteger(unreadCount) || unreadCount !== 0) return null;

  return record;
}

export function planCommunicationWorkspaceTransition(
  state,
  targetWorkspace,
  records = [],
  options = {}
) {
  if (!isValidCommunicationWorkspace(targetWorkspace)) {
    return Object.freeze({
      valid: false,
      activeWorkspace: state?.activeWorkspace || "conversations",
      selectedRecord: null,
      clearConversation: false,
      clearContext: false,
      clearEmergencyContext: false,
      closeCompactContext: false,
    });
  }

  return Object.freeze({
    valid: true,
    activeWorkspace: targetWorkspace,
    selectedRecord: resolveRestorableCommunicationSelection(
      state,
      targetWorkspace,
      records,
      options
    ),
    clearConversation: true,
    clearContext: true,
    clearEmergencyContext: true,
    closeCompactContext: true,
  });
}
