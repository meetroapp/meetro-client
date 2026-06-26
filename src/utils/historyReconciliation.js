const COMPLETION_EVENT_TYPES = new Set([
  "WORKFLOW_COMPLETION_SUBMITTED",
  "WORKFLOW_COMPLETION_CONFIRMED",
]);

const STATUS_PRIORITY = Object.freeze({
  unknown: 0,
  completed: 1,
  submitted: 2,
  awaiting_confirmation: 3,
  confirmed: 4,
});

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function firstValue(...values) {
  return values.find(hasValue);
}

function stringValue(value) {
  return hasValue(value) ? String(value).trim() : "";
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      cloneValue(nestedValue),
    ])
  );
}

function normalizeTimestamp(value) {
  if (!hasValue(value)) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function unwrapEntry(entry, fallbackSource) {
  if (
    isRecord(entry) &&
    Object.prototype.hasOwnProperty.call(entry, "record")
  ) {
    return {
      record: isRecord(entry.record) ? entry.record : {},
      source: stringValue(entry.source) || fallbackSource,
    };
  }

  if (
    isRecord(entry) &&
    Object.prototype.hasOwnProperty.call(entry, "event")
  ) {
    return {
      record: isRecord(entry.event) ? entry.event : {},
      source: stringValue(entry.source) || fallbackSource,
    };
  }

  return {
    record: isRecord(entry) ? entry : {},
    source: fallbackSource,
  };
}

function getPayload(record) {
  return isRecord(record.payload) ? record.payload : {};
}

function getNestedCompletion(record) {
  if (isRecord(record.completion)) return record.completion;
  const payload = getPayload(record);
  return isRecord(payload.completion) ? payload.completion : {};
}

function getCompletionId(record) {
  const payload = getPayload(record);
  const completion = getNestedCompletion(record);
  const explicit = firstValue(
    record.completionId,
    record.completionRecordId,
    payload.completionId,
    payload.completionRecordId,
    completion.completionId,
    completion.completionRecordId
  );

  if (hasValue(explicit)) {
    return {
      value: stringValue(explicit),
      trust: "AUTHORITATIVE",
      source: "completion-identity",
    };
  }

  const legacyId = firstValue(completion.id, record.id);
  return hasValue(legacyId)
    ? {
        value: stringValue(legacyId),
        trust: "FALLBACK",
        source: "legacy-id",
      }
    : { value: "", trust: "MISSING", source: "unresolved" };
}

function getDirectProjectId(record) {
  const payload = getPayload(record);
  const completion = getNestedCompletion(record);
  return firstValue(
    record.projectId,
    record.project_id,
    payload.projectId,
    payload.project_id,
    completion.projectId,
    completion.project_id
  );
}

function getConversationId(record) {
  const payload = getPayload(record);
  const completion = getNestedCompletion(record);
  return stringValue(
    firstValue(
      record.conversationId,
      payload.conversationId,
      completion.conversationId
    )
  );
}

function getRequestId(record) {
  const payload = getPayload(record);
  const completion = getNestedCompletion(record);
  return stringValue(
    firstValue(
      record.requestId,
      record.quoteRequestId,
      payload.requestId,
      payload.quoteRequestId,
      completion.requestId,
      completion.quoteRequestId
    )
  );
}

function getContextId(record, fields) {
  return stringValue(firstValue(...fields.map((field) => record[field])));
}

function buildContextIndexes(projects, conversations) {
  const projectById = new Map();
  const projectByRequestId = new Map();
  const conversationById = new Map();

  projects.forEach((entry) => {
    const { record } = unwrapEntry(entry, "project");
    const projectId = getContextId(record, ["projectId", "project_id"]);
    const requestId = getContextId(record, [
      "requestId",
      "request_id",
      "quoteRequestId",
    ]);

    if (projectId && !projectById.has(projectId)) {
      projectById.set(projectId, record);
    }
    if (requestId && !projectByRequestId.has(requestId)) {
      projectByRequestId.set(requestId, record);
    }
  });

  conversations.forEach((entry) => {
    const { record } = unwrapEntry(entry, "conversation");
    const conversationId = getContextId(record, [
      "conversationId",
      "id",
    ]);

    if (conversationId && !conversationById.has(conversationId)) {
      conversationById.set(conversationId, record);
    }
  });

  return { projectById, projectByRequestId, conversationById };
}

function resolveProjectIdentity(record, indexes) {
  const directProjectId = stringValue(getDirectProjectId(record));
  const conversationId = getConversationId(record);
  const requestId = getRequestId(record);
  const warnings = [];
  const linkedValues = [];

  if (conversationId) {
    const conversation = indexes.conversationById.get(conversationId);
    const linkedProjectId = conversation
      ? getContextId(conversation, ["projectId", "project_id"])
      : "";
    if (linkedProjectId) linkedValues.push({
      value: linkedProjectId,
      source: "conversation-link",
    });
  }

  if (requestId) {
    const project = indexes.projectByRequestId.get(requestId);
    const linkedProjectId = project
      ? getContextId(project, ["projectId", "project_id"])
      : "";
    if (linkedProjectId) linkedValues.push({
      value: linkedProjectId,
      source: "request-project-link",
    });
  }

  const conflictingLink = linkedValues.find(
    (link) => directProjectId && link.value !== directProjectId
  );

  if (conflictingLink) {
    warnings.push({
      code: "conflicting-project-identity",
      message: "A linked context disagrees with the record projectId.",
      sources: ["record", conflictingLink.source],
    });
  }

  if (directProjectId) {
    return {
      value: directProjectId,
      trust: conflictingLink ? "CONFLICTING" : "AUTHORITATIVE",
      source: "record",
      warnings,
    };
  }

  const distinctLinkedValues = [
    ...new Set(linkedValues.map((link) => link.value)),
  ];

  if (distinctLinkedValues.length > 1) {
    return {
      value: "",
      trust: "CONFLICTING",
      source: "linked-context",
      warnings: [
        {
          code: "conflicting-linked-project-identity",
          message: "Request and conversation contexts identify different projects.",
          sources: linkedValues.map((link) => link.source),
        },
      ],
    };
  }

  if (linkedValues.length > 0) {
    return {
      value: linkedValues[0].value,
      trust: "INFERRED",
      source: linkedValues[0].source,
      warnings: [
        {
          code: "linked-project-identity",
          message: "projectId was supplied by an explicit legacy relationship.",
          sources: [linkedValues[0].source],
        },
      ],
    };
  }

  return {
    value: "",
    trust: "MISSING",
    source: "unresolved",
    warnings: [
      {
        code: "missing-project-identity",
        message: "No projectId or explicit project relationship is available.",
        sources: [],
      },
    ],
  };
}

function resolveCompletionDate(record) {
  const payload = getPayload(record);
  const completion = getNestedCompletion(record);
  const candidates = [
    ["recordedAt", record.recordedAt],
    ["completionDate", record.completionDate],
    ["completedAt", record.completedAt],
    ["payload.recordedAt", payload.recordedAt],
    ["payload.completedAt", payload.completedAt],
    ["completion.completedAt", completion.completedAt],
    ["createdAt", record.createdAt],
  ];

  for (const [source, value] of candidates) {
    const normalized = normalizeTimestamp(value);
    if (!normalized) continue;
    return {
      value: normalized,
      trust: source === "recordedAt" ? "AUTHORITATIVE" : "FALLBACK",
      source,
    };
  }

  return { value: "", trust: "MISSING", source: "unresolved" };
}

function resolveCustomer(record, project, conversation) {
  const payload = getPayload(record);
  const completion = getNestedCompletion(record);
  const value = firstValue(
    record.customer,
    record.customerName,
    record.homeownerName,
    completion.customer,
    completion.customerName,
    payload.customer,
    project?.customer,
    project?.customerName,
    project?.homeownerName,
    conversation?.customer,
    conversation?.customerName
  );

  return hasValue(value) ? String(value) : "";
}

function normalizeStatus(record) {
  const rawType = stringValue(
    firstValue(record.eventType, record.type, record.workflowType)
  ).toUpperCase();
  const rawStatus = stringValue(
    firstValue(
      record.completionStatus,
      record.status,
      getPayload(record).status
    )
  )
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  if (
    rawType === "WORKFLOW_COMPLETION_CONFIRMED" ||
    rawStatus === "confirmed"
  ) {
    return "confirmed";
  }
  if (
    rawStatus === "awaiting_customer_confirmation" ||
    rawStatus === "awaiting_confirmation"
  ) {
    return "awaiting_confirmation";
  }
  if (
    rawType === "WORKFLOW_COMPLETION_SUBMITTED" ||
    rawType === "WORKFLOW_COMPLETION_CLOSEOUT" ||
    rawStatus === "submitted"
  ) {
    return "submitted";
  }
  if (["completed", "complete", "closed"].includes(rawStatus)) {
    return "completed";
  }
  return "unknown";
}

function isCompletionWorkflowEvent(record) {
  const eventType = stringValue(
    firstValue(record.eventType, record.type, record.workflowType)
  ).toUpperCase();

  return (
    COMPLETION_EVENT_TYPES.has(eventType) ||
    eventType.includes("COMPLETION") ||
    hasValue(record.completionId) ||
    hasValue(getPayload(record).completionId) ||
    isRecord(record.completion) ||
    isRecord(getPayload(record).completion)
  );
}

function createCandidate({
  record,
  source,
  kind,
  sourceIndex,
  indexes,
}) {
  const completionIdentity = getCompletionId(record);
  const projectIdentity = resolveProjectIdentity(record, indexes);
  const completionDate = resolveCompletionDate(record);
  const conversationId = getConversationId(record);
  const project =
    indexes.projectById.get(projectIdentity.value) ||
    indexes.projectByRequestId.get(getRequestId(record));
  const conversation = indexes.conversationById.get(conversationId);
  const warnings = [...projectIdentity.warnings];

  if (!completionIdentity.value) {
    warnings.push({
      code: "missing-completion-identity",
      message: "No completionId or stable legacy completion record ID is available.",
      sources: [],
    });
  }
  if (!completionDate.value) {
    warnings.push({
      code: "missing-completion-date",
      message: "No valid completion timestamp is available.",
      sources: [],
    });
  }

  return {
    id: completionIdentity.value
      ? `history:${completionIdentity.value}`
      : `history:${source}:${sourceIndex}`,
    projectId: projectIdentity.value,
    completionId: completionIdentity.value,
    completionDate: completionDate.value,
    customer: resolveCustomer(record, project, conversation),
    status: normalizeStatus(record),
    provenance: {
      quality: "LOW",
      projectId: {
        trust: projectIdentity.trust,
        source: projectIdentity.source,
      },
      completionId: {
        trust: completionIdentity.trust,
        source: completionIdentity.source,
      },
      completionDate: {
        trust: completionDate.trust,
        source: completionDate.source,
      },
      warnings,
      duplicateCount: 0,
    },
    sourceRecords: [
      {
        source,
        kind,
        record: cloneValue(record),
      },
    ],
    sourceIndex,
  };
}

function getQuality(candidate) {
  const trusts = [
    candidate.provenance.projectId.trust,
    candidate.provenance.completionId.trust,
    candidate.provenance.completionDate.trust,
  ];

  if (trusts.includes("CONFLICTING") || trusts.includes("MISSING")) {
    return "LOW";
  }
  if (trusts.every((trust) => trust === "AUTHORITATIVE")) {
    return "HIGH";
  }
  return "MEDIUM";
}

function chooseStatus(first, second) {
  return STATUS_PRIORITY[second] > STATUS_PRIORITY[first] ? second : first;
}

function mergeCandidates(existing, candidate) {
  const warnings = [
    ...existing.provenance.warnings,
    ...candidate.provenance.warnings,
  ];
  const uniqueWarnings = warnings.filter(
    (warning, index, entries) =>
      entries.findIndex(
        (entry) =>
          entry.code === warning.code &&
          JSON.stringify(entry.sources) === JSON.stringify(warning.sources)
      ) === index
  );
  const merged = {
    ...existing,
    projectId: existing.projectId || candidate.projectId,
    completionDate: existing.completionDate || candidate.completionDate,
    customer: existing.customer || candidate.customer,
    status: chooseStatus(existing.status, candidate.status),
    provenance: {
      ...existing.provenance,
      warnings: uniqueWarnings,
      duplicateCount:
        existing.provenance.duplicateCount +
        candidate.sourceRecords.length,
    },
    sourceRecords: [
      ...existing.sourceRecords,
      ...candidate.sourceRecords,
    ],
  };

  if (
    existing.projectId &&
    candidate.projectId &&
    existing.projectId !== candidate.projectId
  ) {
    merged.provenance.projectId = {
      trust: "CONFLICTING",
      source: "duplicate-records",
    };
    merged.provenance.warnings.push({
      code: "duplicate-project-conflict",
      message: "Records sharing a completion identity identify different projects.",
      sources: existing.sourceRecords
        .concat(candidate.sourceRecords)
        .map((entry) => entry.source),
    });
  }

  merged.provenance.quality = getQuality(merged);
  return merged;
}

// Read-only Completion -> History projection. This utility reconciles legacy
// records for inspection only; it does not establish workflow authority.
export function reconcileHistory(input = {}) {
  const safeInput = isRecord(input) ? input : {};
  const completions = Array.isArray(safeInput.completions)
    ? safeInput.completions
    : [];
  const workflowEvents = Array.isArray(safeInput.workflowEvents)
    ? safeInput.workflowEvents
    : [];
  const projects = Array.isArray(safeInput.projects) ? safeInput.projects : [];
  const conversations = Array.isArray(safeInput.conversations)
    ? safeInput.conversations
    : [];
  const indexes = buildContextIndexes(projects, conversations);
  const candidates = [];

  completions.forEach((entry, index) => {
    const sourceEntry = unwrapEntry(entry, "completion");
    candidates.push(
      createCandidate({
        ...sourceEntry,
        kind: "completion",
        sourceIndex: candidates.length,
        indexes,
      })
    );
  });

  workflowEvents.forEach((entry) => {
    const sourceEntry = unwrapEntry(entry, "workflow-event");
    if (!isCompletionWorkflowEvent(sourceEntry.record)) return;
    candidates.push(
      createCandidate({
        ...sourceEntry,
        kind: "workflow-event",
        sourceIndex: candidates.length,
        indexes,
      })
    );
  });

  const reconciled = [];
  const completionIndexes = new Map();

  candidates.forEach((candidate) => {
    if (
      candidate.completionId &&
      completionIndexes.has(candidate.completionId)
    ) {
      const existingIndex = completionIndexes.get(candidate.completionId);
      reconciled[existingIndex] = mergeCandidates(
        reconciled[existingIndex],
        candidate
      );
      return;
    }

    candidate.provenance.quality = getQuality(candidate);
    if (candidate.completionId) {
      completionIndexes.set(candidate.completionId, reconciled.length);
    }
    reconciled.push(candidate);
  });

  return reconciled
    .sort((left, right) => {
      const leftTime = left.completionDate
        ? new Date(left.completionDate).getTime()
        : Number.NaN;
      const rightTime = right.completionDate
        ? new Date(right.completionDate).getTime()
        : Number.NaN;
      const leftHasTime = Number.isFinite(leftTime);
      const rightHasTime = Number.isFinite(rightTime);

      if (leftHasTime && rightHasTime && leftTime !== rightTime) {
        return rightTime - leftTime;
      }
      if (leftHasTime !== rightHasTime) return leftHasTime ? -1 : 1;
      return left.sourceIndex - right.sourceIndex;
    })
    .map(({ sourceIndex, ...historyRecord }) => historyRecord);
}
