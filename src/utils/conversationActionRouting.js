import {
  CANONICAL_CONVERSATION_COMMUNICATION_SHELL,
  buildCanonicalConversationRoute,
  normalizeCanonicalConversationId,
} from "./canonicalConversationMessaging.js";

const CANONICAL_CONVERSATION_ID_FIELDS = Object.freeze([
  "conversationId",
  "conversation_id",
  "canonicalConversationId",
  "canonical_conversation_id",
]);

function readCanonicalCandidates(source = {}) {
  if (!source || typeof source !== "object") return [source];

  return CANONICAL_CONVERSATION_ID_FIELDS.map((field) => source[field]);
}

export function getCanonicalConversationActionId(source = {}) {
  for (const value of readCanonicalCandidates(source)) {
    const conversationId = normalizeCanonicalConversationId(value);
    if (conversationId) return conversationId;
  }

  return null;
}

export function getCanonicalConversationActionTarget(
  source = {},
  {
    returnPage = "messagesInbox",
    preferCommunicationCenterShell = false,
  } = {}
) {
  const conversationId = getCanonicalConversationActionId(source);

  if (!conversationId) {
    return {
      ok: false,
      conversationId: null,
      route: "",
      reason: "missing_canonical_conversation_id",
    };
  }

  return {
    ok: true,
    conversationId,
    route: buildCanonicalConversationRoute(
      conversationId,
      returnPage,
      preferCommunicationCenterShell
        ? { shell: CANONICAL_CONVERSATION_COMMUNICATION_SHELL }
        : {}
    ),
    reason: "canonical_conversation_id",
  };
}

export function getCanonicalWorkCenterConversationActionTarget(source = {}) {
  const conversationId = normalizeCanonicalConversationId(
    source?.conversationId
  );

  return getCanonicalConversationActionTarget(
    conversationId ? { conversationId } : {},
    {
      returnPage: "workCenter",
      preferCommunicationCenterShell: true,
    }
  );
}
