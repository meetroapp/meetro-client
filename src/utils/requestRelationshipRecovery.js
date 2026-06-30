import { getRequestProfessionalRelationshipSignals } from "./professionalLifecycleProjection.js";

const RECOVERY_SOURCE_KEYS = Object.freeze([
  ["meetro_business_schedule", "schedule"],
  ["workCenterQuoteHistory", "quote"],
  ["meetroQuoteHistory", "quote"],
  ["quoteHistory", "quote"],
  ["meetro_conversation_registry", "conversation"],
  ["acceptedBusinessLeads", "acceptedLead"],
  ["acceptedLeads", "acceptedLead"],
  ["workCenterAcceptedLeads", "acceptedLead"],
]);

const ACCEPTED_QUOTE_STATUSES = new Set([
  "accepted",
  "approved",
  "quote_approved",
  "proposal_approved",
]);

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function normalize(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeName(value = "") {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function safeReadArray(storage, key) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function isDev() {
  try {
    return Boolean(import.meta?.env?.DEV);
  } catch {
    return false;
  }
}

function requestIds(request = {}) {
  return [
    request.requestId,
    request.id,
    request.projectId,
    request.conversationId,
    request.quoteId,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function requestTitle(request = {}) {
  return normalizeName(request.title || request.projectTitle || request.service || request.category);
}

function recordIds(record = {}) {
  return [
    record.requestId,
    record.id,
    record.projectId,
    record.conversationId,
    record.quoteId,
    record.selectedHomeownerRequestId,
    record.homeownerRequestId,
    record.sourceRequestId,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function matchesRequest(record = {}, request = {}) {
  const ids = new Set(requestIds(request));
  if (ids.size > 0 && recordIds(record).some((id) => ids.has(id))) return true;

  const title = requestTitle(request);
  const recordTitle = normalizeName(
    record.title || record.projectTitle || record.project_title || record.service
  );

  return Boolean(title && recordTitle && title === recordTitle);
}

function createCandidate(record = {}, source = "") {
  const id = firstValue(
    record.businessId,
    record.professionalId,
    record.contractorId,
    record.assignedProfessionalId,
    record.selectedBusinessId,
    record.acceptedByBusinessId,
    record.matchedBusinessId,
    record.providerId,
    record.acceptedProfessionalId,
    record.selectedProfessionalId,
    record.acceptedByProfessionalId
  );
  const name = firstValue(
    record.businessName,
    record.professionalName,
    record.assignedProfessionalName,
    record.assignedProfessional,
    record.selectedProfessional,
    record.providerName
  );

  if (!id && !name) return null;

  return {
    id: String(id || "").trim(),
    name: String(name || "").trim(),
    source,
  };
}

function collectRequestCandidates(request = {}) {
  const candidates = [];

  const acceptedQuote = request.acceptedQuote || {};
  const acceptedQuoteStatus = normalize(
    acceptedQuote.status || acceptedQuote.quoteStatus || request.quoteStatus || request.proposalStatus
  );
  if (
    acceptedQuote &&
    typeof acceptedQuote === "object" &&
    (ACCEPTED_QUOTE_STATUSES.has(acceptedQuoteStatus) || acceptedQuote.businessId || acceptedQuote.professionalId)
  ) {
    const candidate = createCandidate(acceptedQuote, "acceptedQuote");
    if (candidate) candidates.push(candidate);
  }

  if (Array.isArray(request.quotesReceived)) {
    request.quotesReceived.forEach((quote) => {
      const status = normalize(quote?.status || quote?.quoteStatus);
      if (!ACCEPTED_QUOTE_STATUSES.has(status)) return;
      const candidate = createCandidate(quote, "acceptedQuote");
      if (candidate) candidates.push(candidate);
    });
  }

  [
    request.lifecycleMeta,
    request.relationship,
    request.selectedProfessionalRecord,
    request.assignedProfessionalRecord,
  ].forEach((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return;
    const candidate = createCandidate(record, "requestMetadata");
    if (candidate) candidates.push(candidate);
  });

  return candidates;
}

function collectStorageCandidates(request = {}, storage = getStorage()) {
  if (!storage) return [];

  const arrayCandidates = RECOVERY_SOURCE_KEYS.flatMap(([key, source]) =>
    safeReadArray(storage, key)
      .filter((record) => matchesRequest(record, request))
      .map((record) => createCandidate(record, source))
      .filter(Boolean)
  );

  const objectCandidates = [
    ["selectedActiveProject", "workCenter"],
    ["activeWorkSnapshot", "workCenter"],
  ].flatMap(([key, source]) => {
    try {
      const parsed = JSON.parse(storage?.getItem?.(key) || "null");
      const record = parsed?.project || parsed;
      if (!record || typeof record !== "object" || Array.isArray(record)) return [];
      if (!matchesRequest(record, request)) return [];
      const candidate = createCandidate(record, source);
      return candidate ? [candidate] : [];
    } catch {
      return [];
    }
  });

  const activeWorkRecord = {
    requestId: storage?.getItem?.("activeWorkRequestId") || "",
    conversationId: storage?.getItem?.("activeWorkConversationId") || "",
    businessId: storage?.getItem?.("activeWorkBusinessId") || "",
    professionalId: storage?.getItem?.("activeWorkProfessionalId") || "",
    businessName: storage?.getItem?.("activeWorkBusinessName") || "",
    professionalName: storage?.getItem?.("activeWorkProfessionalName") || "",
  };
  const activeWorkCandidate =
    matchesRequest(activeWorkRecord, request) && createCandidate(activeWorkRecord, "workCenter");

  return [
    ...arrayCandidates,
    ...objectCandidates,
    ...(activeWorkCandidate ? [activeWorkCandidate] : []),
  ];
}

function resolveSingleCandidate(candidates = []) {
  const withIds = candidates.filter((candidate) => candidate.id);
  if (withIds.length > 0) {
    const ids = [...new Set(withIds.map((candidate) => normalize(candidate.id)).filter(Boolean))];
    if (ids.length !== 1) return { ambiguous: true };
    const matching = withIds.filter((candidate) => normalize(candidate.id) === ids[0]);
    return {
      candidate: {
        id: matching[0].id,
        name: firstValue(...matching.map((candidate) => candidate.name)),
        source: [...new Set(matching.map((candidate) => candidate.source).filter(Boolean))].join("+"),
      },
    };
  }

  const names = [...new Set(candidates.map((candidate) => normalizeName(candidate.name)).filter(Boolean))];
  if (names.length === 0) return {};
  if (names.length !== 1) return { ambiguous: true };

  const matching = candidates.filter((candidate) => normalizeName(candidate.name) === names[0]);
  return {
    candidate: {
      id: "",
      name: matching[0].name,
      source: [...new Set(matching.map((candidate) => candidate.source).filter(Boolean))].join("+"),
    },
  };
}

function warnAmbiguousRecovery(request = {}, candidates = []) {
  if (!isDev()) return;
  try {
    console.warn("Meetro relationship recovery skipped ambiguous request.", {
      requestId: request.requestId || request.id || "",
      title: request.title || request.projectTitle || "",
      candidates,
    });
  } catch {
    // Dev-only warning should never affect startup or hydration.
  }
}

function applyCandidate(request = {}, candidate = {}, now = new Date().toISOString()) {
  const next = { ...request };
  let changed = false;
  const setIfMissing = (key, value) => {
    if (!value || next[key]) return;
    next[key] = value;
    changed = true;
  };

  if (candidate.id) {
    setIfMissing("businessId", candidate.id);
    setIfMissing("professionalId", candidate.id);
    setIfMissing("assignedProfessionalId", candidate.id);
    setIfMissing("acceptedByBusinessId", candidate.id);
    setIfMissing("selectedBusinessId", candidate.id);
    setIfMissing("acceptedProfessionalId", candidate.id);
  }

  if (candidate.name) {
    setIfMissing("selectedProfessional", candidate.name);
    setIfMissing("assignedProfessionalName", candidate.name);
    setIfMissing("businessName", candidate.name);
  }

  setIfMissing("relationshipRecoveredAt", now);
  setIfMissing("relationshipRecoverySource", candidate.source || "relatedData");

  return { request: next, changed };
}

export function recoverRequestRelationships(requests = [], options = {}) {
  const sourceRequests = Array.isArray(requests) ? requests : [];
  const storage = options.storage ?? getStorage();
  const now = options.now || new Date().toISOString();
  let changed = false;

  const recovered = sourceRequests.map((request) => {
    if (!request || typeof request !== "object" || Array.isArray(request)) return request;

    const signals = getRequestProfessionalRelationshipSignals(request);
    const hasCanonicalRelationship = Boolean(
      request.businessId ||
        request.professionalId ||
        request.assignedProfessionalId ||
        request.acceptedByBusinessId ||
        request.selectedBusinessId ||
        request.acceptedProfessionalId
    );
    const candidates = [
      ...collectRequestCandidates(request),
      ...collectStorageCandidates(request, storage),
    ];

    if (candidates.length === 0) return request;

    if (signals.connected && hasCanonicalRelationship) return request;

    const result = resolveSingleCandidate(candidates);
    if (result.ambiguous) {
      warnAmbiguousRecovery(request, candidates);
      return request;
    }

    if (!result.candidate) return request;

    const applied = applyCandidate(request, result.candidate, now);
    if (applied.changed) changed = true;
    return applied.request;
  });

  return { requests: recovered, changed };
}

export function recoverStoredRequestRelationships(options = {}) {
  const storage = options.storage ?? getStorage();
  if (!storage) return { requests: [], changed: false };

  const requests = safeReadArray(storage, "homeownerRequests");
  const result = recoverRequestRelationships(requests, { ...options, storage });
  if (result.changed) {
    try {
      storage.setItem("homeownerRequests", JSON.stringify(result.requests));
    } catch {
      return { ...result, changed: false };
    }
  }
  return result;
}
