import crypto from "node:crypto";

const DEFAULT_MEMORY_TTL_MS = 30 * 60 * 1000;
const DEFAULT_MEMORY_WINDOW = 6;

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function makeId(prefix = "companion-session") {
  const random =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex");
  return `${prefix}-${random}`;
}

function cleanText(value, limit = 1200) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, limit);
}

function getUserId(user = {}) {
  return cleanText(user.id || user.userId || user.sub || user.email, 240);
}

function getLinkedRequestId(context = {}) {
  return cleanText(
    context?.workflow?.activeRequestId ||
      context?.workflow?.activeProjectId ||
      context?.workflow?.conversationId,
    240
  );
}

function getLinkedJobId(context = {}) {
  return cleanText(context?.workflow?.activeJobId, 240);
}

function isExpired(session = {}, now = Date.now()) {
  const expiresAt = Date.parse(session.expiresAt || "");
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

function normalizeSessionRecord(record = {}) {
  return {
    id: cleanText(record.id, 240),
    sessionId: cleanText(record.sessionId, 240),
    userId: cleanText(record.userId, 240),
    role: cleanText(record.role, 40),
    sourcePage: cleanText(record.sourcePage, 160),
    linkedRequestId: cleanText(record.linkedRequestId, 240),
    linkedJobId: cleanText(record.linkedJobId, 240),
    userMessage: cleanText(record.userMessage),
    assistantAnswer: cleanText(record.assistantAnswer),
    intent: cleanText(record.intent, 80),
    status: cleanText(record.status, 80),
    errorCode: cleanText(record.errorCode, 120),
    createdAt: cleanText(record.createdAt, 80),
    expiresAt: cleanText(record.expiresAt, 80),
  };
}

function compactRecord(record = {}) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export function createInMemoryCompanionSessionMemory({
  ttlMs = DEFAULT_MEMORY_TTL_MS,
  memoryWindow = DEFAULT_MEMORY_WINDOW,
  now = () => Date.now(),
} = {}) {
  const sessions = new Map();
  const records = [];

  function pruneExpired() {
    const currentTime = now();

    for (const [sessionId, session] of sessions.entries()) {
      if (isExpired(session, currentTime)) {
        sessions.delete(sessionId);
      }
    }

    for (let index = records.length - 1; index >= 0; index -= 1) {
      if (isExpired(records[index], currentTime) || !sessions.has(records[index].sessionId)) {
        records.splice(index, 1);
      }
    }
  }

  return {
    async resolveSession({ requestedSessionId = "", userId = "" } = {}) {
      pruneExpired();
      const requested = cleanText(requestedSessionId, 240);
      const existing = requested ? sessions.get(requested) : null;

      if (existing && existing.userId === userId && !isExpired(existing, now())) {
        return { sessionId: existing.sessionId, created: false };
      }

      const createdAt = nowIso(now());
      const expiresAt = nowIso(now() + ttlMs);
      const sessionId = makeId();
      sessions.set(sessionId, {
        sessionId,
        userId,
        createdAt,
        expiresAt,
      });

      return { sessionId, created: true };
    },

    async getRecentExchanges({ sessionId = "", userId = "", limit = memoryWindow } = {}) {
      pruneExpired();
      const session = sessions.get(cleanText(sessionId, 240));

      if (!session || session.userId !== userId || isExpired(session, now())) {
        return [];
      }

      return records
        .filter((record) => record.sessionId === session.sessionId && record.userId === userId)
        .slice(-Math.max(0, Math.min(limit, memoryWindow)))
        .map((record) => normalizeSessionRecord(record));
    },

    async appendExchange(record = {}) {
      pruneExpired();
      const normalized = normalizeSessionRecord(record);
      const session = sessions.get(normalized.sessionId);

      if (!session || session.userId !== normalized.userId || isExpired(session, now())) {
        return { ok: false, code: "session_not_found" };
      }

      const createdAt = normalized.createdAt || nowIso(now());
      const expiresAt = normalized.expiresAt || session.expiresAt || nowIso(now() + ttlMs);
      records.push(
        compactRecord({
          ...normalized,
          id: normalized.id || makeId("companion-memory"),
          createdAt,
          expiresAt,
        })
      );

      return { ok: true };
    },

    inspect() {
      pruneExpired();
      return {
        sessions: Array.from(sessions.values()),
        records: records.map((record) => ({ ...record })),
      };
    },
  };
}

export const defaultCompanionSessionMemory = createInMemoryCompanionSessionMemory();

export async function resolveCompanionSessionMemory({
  memoryRepository = defaultCompanionSessionMemory,
  body = {},
  user = {},
} = {}) {
  const userId = getUserId(user);
  const requestedSessionId = cleanText(body.companionSessionId || body.sessionId, 240);

  return memoryRepository.resolveSession({
    requestedSessionId,
    userId,
  });
}

export async function getSafeRecentCompanionMemory({
  memoryRepository = defaultCompanionSessionMemory,
  sessionId = "",
  user = {},
  limit = DEFAULT_MEMORY_WINDOW,
} = {}) {
  const userId = getUserId(user);
  const exchanges = await memoryRepository.getRecentExchanges({
    sessionId,
    userId,
    limit,
  });

  return exchanges.map((exchange) =>
    compactRecord({
      role: exchange.role,
      userMessage: exchange.userMessage,
      assistantAnswer: exchange.assistantAnswer,
      intent: exchange.intent,
      status: exchange.status,
      errorCode: exchange.errorCode,
    })
  );
}

export async function appendCompanionSessionMemory({
  memoryRepository = defaultCompanionSessionMemory,
  sessionId = "",
  user = {},
  context = {},
  userMessage = "",
  assistantAnswer = "",
  intent = "",
  status = "success",
  errorCode = "",
} = {}) {
  const userId = getUserId(user);

  if (!sessionId || !userId) {
    return { ok: false, code: "missing_session_or_user" };
  }

  return memoryRepository.appendExchange({
    sessionId,
    userId,
    role: cleanText(user.role || user.userRole || context?.user?.role, 40),
    sourcePage: cleanText(context?.source?.page, 160),
    linkedRequestId: getLinkedRequestId(context),
    linkedJobId: getLinkedJobId(context),
    userMessage,
    assistantAnswer,
    intent,
    status,
    errorCode,
  });
}

export function getCompanionMemoryUserId(user = {}) {
  return getUserId(user);
}
