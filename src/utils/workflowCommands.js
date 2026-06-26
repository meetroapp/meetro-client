import { getProjectIdentity } from "./projectIdentity";

// Compatibility command layer between current client storage and future
// canonical backend project aggregates. These commands write only append-only
// bridge records and do not replace or modify any existing workflow storage.

export const PROJECT_LINKS_STORAGE_KEY = "meetroProjectLinks";
export const PROJECT_TIMELINE_STORAGE_KEY = "meetroProjectTimelineEvents";
export const PROJECT_CONTEXTS_STORAGE_KEY = "meetroProjectContexts";

function getStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function createWarning(code, message, source = "workflowCommands") {
  return { code, message, source };
}

function normalizeRequiredId(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function cloneMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return { ...metadata };
}

function commandResult({ ok, projectId = "", warnings = [], record = null }) {
  return {
    ok,
    projectId,
    warnings: warnings.map((warning) => ({ ...warning })),
    record,
  };
}

function validateProjectId(projectId) {
  const normalizedProjectId = normalizeRequiredId(projectId);
  const identity = getProjectIdentity({ projectId: normalizedProjectId });

  if (!identity.projectId) {
    return commandResult({
      ok: false,
      warnings: [
        createWarning(
          "project-id-required",
          "A non-empty projectId is required; no command record was written."
        ),
      ],
    });
  }

  return commandResult({
    ok: true,
    projectId: identity.projectId,
    warnings: identity.warnings,
  });
}

function readNamespace(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || "[]");

    if (Array.isArray(value)) {
      return { records: value, warnings: [] };
    }

    return {
      records: [],
      warnings: [
        createWarning(
          "invalid-command-namespace",
          `${key} did not contain an array; the command was not written.`,
          key
        ),
      ],
    };
  } catch {
    return {
      records: [],
      warnings: [
        createWarning(
          "unreadable-command-namespace",
          `${key} could not be read; the command was not written.`,
          key
        ),
      ],
    };
  }
}

function createCommandRecord(commandType, projectId, fields = {}) {
  const createdAt = new Date().toISOString();

  return {
    commandId: `${commandType}-${createdAt}-${Math.random()
      .toString(36)
      .slice(2, 10)}`,
    commandType,
    projectId,
    ...fields,
    createdAt,
  };
}

function appendCommandRecord(storageKey, record, warnings = []) {
  const storage = getStorage();

  if (!storage) {
    return commandResult({
      ok: false,
      projectId: record.projectId,
      warnings: [
        ...warnings,
        createWarning(
          "storage-unavailable",
          "Command storage is unavailable; the command record was not written.",
          storageKey
        ),
      ],
    });
  }

  const namespace = readNamespace(storage, storageKey);

  if (namespace.warnings.length > 0) {
    return commandResult({
      ok: false,
      projectId: record.projectId,
      warnings: [...warnings, ...namespace.warnings],
    });
  }

  try {
    storage.setItem(
      storageKey,
      JSON.stringify([...namespace.records, record])
    );

    return commandResult({
      ok: true,
      projectId: record.projectId,
      warnings,
      record: { ...record },
    });
  } catch {
    return commandResult({
      ok: false,
      projectId: record.projectId,
      warnings: [
        ...warnings,
        createWarning(
          "command-write-failed",
          "The command record could not be written.",
          storageKey
        ),
      ],
    });
  }
}

function appendLinkCommand(commandType, projectId, fields, metadata) {
  const validation = validateProjectId(projectId);
  if (!validation.ok) return validation;

  const record = createCommandRecord(commandType, validation.projectId, {
    ...fields,
    metadata: cloneMetadata(metadata),
  });

  return appendCommandRecord(
    PROJECT_LINKS_STORAGE_KEY,
    record,
    validation.warnings
  );
}

export function createProjectContext({
  projectId,
  requestId,
  source,
  metadata,
} = {}) {
  const validation = validateProjectId(projectId);
  if (!validation.ok) return validation;

  const record = createCommandRecord(
    "createProjectContext",
    validation.projectId,
    {
      requestId: normalizeRequiredId(requestId),
      source: normalizeRequiredId(source),
      metadata: cloneMetadata(metadata),
    }
  );

  return appendCommandRecord(
    PROJECT_CONTEXTS_STORAGE_KEY,
    record,
    validation.warnings
  );
}

export function linkQuoteToProject({
  projectId,
  quoteRequestId,
  quoteId,
  metadata,
} = {}) {
  return appendLinkCommand(
    "linkQuoteToProject",
    projectId,
    {
      quoteRequestId: normalizeRequiredId(quoteRequestId),
      quoteId: normalizeRequiredId(quoteId),
    },
    metadata
  );
}

export function linkConversationToProject({
  projectId,
  conversationId,
  metadata,
} = {}) {
  return appendLinkCommand(
    "linkConversationToProject",
    projectId,
    { conversationId: normalizeRequiredId(conversationId) },
    metadata
  );
}

export function linkScheduleToProject({
  projectId,
  scheduleId,
  metadata,
} = {}) {
  return appendLinkCommand(
    "linkScheduleToProject",
    projectId,
    { scheduleId: normalizeRequiredId(scheduleId) },
    metadata
  );
}

export function activateProjectWork({ projectId, jobId, metadata } = {}) {
  return appendLinkCommand(
    "activateProjectWork",
    projectId,
    { jobId: normalizeRequiredId(jobId) },
    metadata
  );
}

export function appendProjectTimelineEvent({ projectId, event } = {}) {
  const validation = validateProjectId(projectId);
  if (!validation.ok) return validation;

  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return commandResult({
      ok: false,
      projectId: validation.projectId,
      warnings: [
        ...validation.warnings,
        createWarning(
          "timeline-event-required",
          "A timeline event object is required; no command record was written."
        ),
      ],
    });
  }

  const record = createCommandRecord(
    "appendProjectTimelineEvent",
    validation.projectId,
    {
      event: { ...event },
    }
  );

  return appendCommandRecord(
    PROJECT_TIMELINE_STORAGE_KEY,
    record,
    validation.warnings
  );
}

export function completeProject({
  projectId,
  completionId,
  metadata,
} = {}) {
  return appendLinkCommand(
    "completeProject",
    projectId,
    { completionId: normalizeRequiredId(completionId) },
    metadata
  );
}

export function resolveLegacyProjectIdentity(record) {
  const identity = getProjectIdentity(record);

  if (!identity.projectId) {
    return commandResult({
      ok: false,
      warnings: identity.warnings,
    });
  }

  return commandResult({
    ok: true,
    projectId: identity.projectId,
    warnings: identity.warnings,
    record: {
      projectId: identity.projectId,
      identitySource: identity.identitySource,
      originalRecord: record && typeof record === "object" ? { ...record } : null,
    },
  });
}
