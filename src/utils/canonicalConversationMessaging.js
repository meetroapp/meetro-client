import { normalizeQuoteDeliverySnapshot } from "./quoteDeliveryApi.js";
import { normalizeInvoiceDeliverySnapshot } from "./invoicePaymentApi.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CONVERSATION_THREAD_TYPES = Object.freeze({
  CANONICAL: "canonical_conversation",
  LEGACY_QUOTE_REQUEST: "legacy_quote_request",
  REQUEST_OPPORTUNITY: "request_opportunity",
});

export const CANONICAL_MESSAGE_MAX_LENGTH = 5000;
export const CANONICAL_CONVERSATION_ROUTE_PAGE = "conversationThread";
export const CANONICAL_CONVERSATION_ROUTE_PARAM = "conversationId";
export const CANONICAL_CONVERSATION_RETURN_PARAM = "returnPage";
export const CANONICAL_CONVERSATION_SHELL_PARAM = "shell";
export const CANONICAL_CONVERSATION_INVOICE_PARAM = "invoiceId";
export const CANONICAL_CONVERSATION_VISIT_PARAM = "visitId";
export const CANONICAL_CONVERSATION_COMMUNICATION_SHELL =
  "communicationCenter";

export function normalizeCanonicalConversationId(value) {
  if (Number.isSafeInteger(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value;

  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeRouteId(value) {
  const normalized = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(normalized)) return null;
  return normalizeCanonicalConversationId(Number(normalized));
}

export function parseCanonicalConversationRoute(routeValue = "") {
  const route = String(routeValue || "").replace(/^#/, "").trim();
  const queryIndex = route.indexOf("?");
  const page = queryIndex >= 0 ? route.slice(0, queryIndex) : route;
  const query = queryIndex >= 0 ? route.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(query);
  const conversationId = normalizeRouteId(
    params.get(CANONICAL_CONVERSATION_ROUTE_PARAM)
  );
  const returnPage = String(
    params.get(CANONICAL_CONVERSATION_RETURN_PARAM) || ""
  ).trim();
  const shell = String(
    params.get(CANONICAL_CONVERSATION_SHELL_PARAM) || ""
  ).trim();
  const invoiceId = String(
    params.get(CANONICAL_CONVERSATION_INVOICE_PARAM) || ""
  ).trim().toLowerCase();
  const visitId = String(
    params.get(CANONICAL_CONVERSATION_VISIT_PARAM) || ""
  ).trim().toLowerCase();

  return {
    page,
    conversationId,
    returnPage,
    shell,
    invoiceId: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(invoiceId)
      ? invoiceId
      : null,
    ...(UUID_PATTERN.test(visitId) ? { visitId } : {}),
    valid:
      page === CANONICAL_CONVERSATION_ROUTE_PAGE &&
      Boolean(conversationId),
  };
}

export function buildCanonicalConversationRoute(
  conversationId,
  returnPage = "messagesInbox",
  options = {}
) {
  const normalizedId = normalizeCanonicalConversationId(conversationId);
  if (!normalizedId) return CANONICAL_CONVERSATION_ROUTE_PAGE;

  const params = new URLSearchParams({
    [CANONICAL_CONVERSATION_ROUTE_PARAM]: String(normalizedId),
  });
  const normalizedReturnPage = String(returnPage || "").trim();

  if (normalizedReturnPage) {
    params.set(
      CANONICAL_CONVERSATION_RETURN_PARAM,
      normalizedReturnPage
    );
  }

  if (
    options?.shell === CANONICAL_CONVERSATION_COMMUNICATION_SHELL
  ) {
    params.set(
      CANONICAL_CONVERSATION_SHELL_PARAM,
      CANONICAL_CONVERSATION_COMMUNICATION_SHELL
    );
  }

  const invoiceId = String(options?.invoiceId || "").trim().toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(invoiceId)) {
    params.set(CANONICAL_CONVERSATION_INVOICE_PARAM, invoiceId);
  }

  const visitId = String(options?.visitId || "").trim().toLowerCase();
  if (UUID_PATTERN.test(visitId)) {
    params.set(CANONICAL_CONVERSATION_VISIT_PARAM, visitId);
  }

  return `${CANONICAL_CONVERSATION_ROUTE_PAGE}?${params.toString()}`;
}

export function getOpportunityThreadIdentity(record = {}) {
  const conversationId = normalizeCanonicalConversationId(
    record.conversation_id
  );
  const requestId = record.request_id ?? record.id ?? null;

  return {
    threadType: conversationId
      ? CONVERSATION_THREAD_TYPES.CANONICAL
      : CONVERSATION_THREAD_TYPES.REQUEST_OPPORTUNITY,
    conversationId,
    requestId,
  };
}

export function normalizeCanonicalConversationDetail(payload = {}, expectedId) {
  const conversationId = normalizeCanonicalConversationId(
    payload?.conversation?.id
  );
  const normalizedExpectedId = normalizeCanonicalConversationId(expectedId);

  if (
    payload?.success !== true ||
    !conversationId ||
    !normalizedExpectedId ||
    conversationId !== normalizedExpectedId ||
    typeof payload?.conversation?.status !== "string"
  ) {
    return null;
  }

  const conversationType =
    payload.conversation.type === "emergency"
      ? "emergency"
      : "request";
  const workflow =
    payload.workflow &&
    typeof payload.workflow === "object" &&
    !Array.isArray(payload.workflow)
      ? payload.workflow
      : {};
  const allowedActions = Array.isArray(workflow.allowedActions)
    ? workflow.allowedActions.filter(
        (action) => typeof action === "string" && action.trim()
      )
    : [];
  const permissions =
    payload.permissions &&
    typeof payload.permissions === "object" &&
    !Array.isArray(payload.permissions)
      ? payload.permissions
      : {};
  const rawRelationship =
    payload.relationship &&
    typeof payload.relationship === "object"
      ? payload.relationship
      : {};
  const relationship = conversationType === "request"
    ? {
        id: normalizeCanonicalConversationId(rawRelationship.id),
        requestId: normalizeCanonicalConversationId(rawRelationship.requestId),
        jobId: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          String(rawRelationship.jobId || "").trim()
        )
          ? String(rawRelationship.jobId).trim().toLowerCase()
          : null,
        title: String(rawRelationship.title || "").trim(),
      }
    : rawRelationship;
  const location =
    conversationType === "emergency" &&
    payload.location &&
    typeof payload.location === "object" &&
    !Array.isArray(payload.location)
      ? {
          locationText: String(payload.location.locationText || "").trim(),
          unitNumber: String(payload.location.unitNumber || "").trim(),
          accessNotes: String(payload.location.accessNotes || "").trim(),
        }
      : null;

  return {
    conversationId,
    type: conversationType,
    status: payload.conversation.status,
    canSendMessages: permissions.canSendMessages === true,
    participants:
      payload.participants && typeof payload.participants === "object"
        ? payload.participants
        : {},
    relationship,
    emergencyRequestId:
      conversationType === "emergency"
        ? normalizeCanonicalConversationId(
            relationship.emergencyRequestId
          )
        : null,
    workflow: {
      status:
        typeof workflow.status === "string"
          ? workflow.status
          : null,
      assignedAt: workflow.assignedAt || null,
      enRouteAt: workflow.enRouteAt || null,
      arrivedAt: workflow.arrivedAt || null,
      workStartedAt: workflow.workStartedAt || null,
      completedAt: workflow.completedAt || null,
      allowedActions,
    },
    permissions: {
      canRead: permissions.canRead === true,
      canSendMessages: permissions.canSendMessages === true,
      canManageWorkflow: permissions.canManageWorkflow === true,
      canMarkEnRoute: permissions.canMarkEnRoute === true,
      canMarkArrived: permissions.canMarkArrived === true,
      canStartWork: permissions.canStartWork === true,
      canCompleteWork: permissions.canCompleteWork === true,
    },
    location,
  };
}

export function normalizeCanonicalMessage(message = {}, viewerRole = "homeowner") {
  const backendId = normalizeCanonicalConversationId(message.id);
  const content = message.content;

  if (
    !backendId ||
    !content ||
    typeof content !== "object" ||
    typeof message?.sender?.isViewer !== "boolean"
  ) {
    return null;
  }

  const contentType =
    typeof content.type === "string" && content.type ? content.type : "text";
  const workflowType =
    typeof message?.workflow?.type === "string" ? message.workflow.type : "";
  const workflowStatus =
    typeof message?.workflow?.status === "string" ? message.workflow.status : "";
  const isQuoteShared =
    contentType === "quote_shared" || workflowType === "QUOTE_SHARED";
  const isInvoiceShared =
    contentType === "invoice_shared" || workflowType === "INVOICE_SHARED";
  const isPaymentLifecycle = ["payment_request", "payment_received"].includes(contentType) &&
    ["PAYMENT_REQUEST", "PAYMENT_RECEIVED"].includes(workflowType);
  let quoteShare = null;
  let invoiceShare = null;
  let paymentLifecycle = null;
  let reference = null;

  if (isQuoteShared) {
    const quoteId = String(message?.reference?.quoteId || "").trim().toLowerCase();
    const jobId = String(message?.reference?.jobId || "").trim().toLowerCase();
    const referenceKeys = message?.reference && typeof message.reference === "object"
      ? Object.keys(message.reference).sort()
      : [];
    quoteShare = normalizeQuoteDeliverySnapshot(message?.workflow?.payload, {
      quoteId,
      jobId,
    });
    if (
      contentType !== "quote_shared" ||
      workflowType !== "QUOTE_SHARED" ||
      workflowStatus !== "SENT" ||
      JSON.stringify(referenceKeys) !== JSON.stringify(["jobId", "quoteId", "type"]) ||
      message.reference.type !== "quote" ||
      !quoteShare
    ) return null;
    reference = Object.freeze({ type: "quote", quoteId, jobId });
  }

  if (isInvoiceShared) {
    const invoiceId = String(message?.reference?.invoiceId || "").trim().toLowerCase();
    const jobId = String(message?.reference?.jobId || "").trim().toLowerCase();
    const referenceKeys = message?.reference && typeof message.reference === "object"
      ? Object.keys(message.reference).sort()
      : [];
    invoiceShare = normalizeInvoiceDeliverySnapshot(message?.workflow?.payload, {
      invoiceId,
      jobId,
    });
    if (
      contentType !== "invoice_shared" ||
      workflowType !== "INVOICE_SHARED" ||
      workflowStatus !== "SENT" ||
      JSON.stringify(referenceKeys) !== JSON.stringify(["invoiceId", "jobId", "type"]) ||
      message.reference.type !== "invoice" ||
      !invoiceShare
    ) return null;
    reference = Object.freeze({ type: "invoice", invoiceId, jobId });
  }

  if (isPaymentLifecycle) {
    const payload = message?.workflow?.payload;
    const quoteId = String(message?.reference?.quoteId || "").trim().toLowerCase();
    const jobId = String(message?.reference?.jobId || "").trim().toLowerCase();
    const integer = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
    const requiredMinor = integer(payload?.requiredMinor);
    const receivedMinor = integer(payload?.receivedMinor);
    const remainingMinor = integer(payload?.remainingMinor);
    const quoteTotalMinor = integer(payload?.quoteTotalMinor);
    const balanceRemainingMinor = integer(payload?.balanceRemainingMinor);
    const depositRequestBindingPresent = [
      payload?.depositRequestDocumentId,
      payload?.depositRequestReference,
      payload?.paymentRequirementId,
    ].some((value) => value != null);
    const validDepositRequestBinding = !depositRequestBindingPresent || (
      UUID_PATTERN.test(String(payload?.depositRequestDocumentId || "")) &&
      UUID_PATTERN.test(String(payload?.paymentRequirementId || "")) &&
      typeof payload?.depositRequestReference === "string" &&
      /^WDR-[A-Z0-9]{8}$/.test(payload.depositRequestReference)
    );
    const referenceKeys = message?.reference && typeof message.reference === "object"
      ? Object.keys(message.reference).sort()
      : [];
    const validState = contentType === "payment_request"
      ? payload?.state === "PAYMENT_REQUIRED" && workflowType === "PAYMENT_REQUEST" && payload?.payment == null
      : ["PARTIALLY_RECEIVED", "DEPOSIT_RECEIVED"].includes(payload?.state) &&
        workflowType === "PAYMENT_RECEIVED" && typeof payload?.payment?.receiptId === "string";
    if (!payload || workflowStatus !== "SENT" || message.reference?.type !== "payment" ||
        JSON.stringify(referenceKeys) !== JSON.stringify(["jobId", "quoteId", "type"]) ||
        payload.schemaVersion !== 1 || payload.quoteId !== quoteId || payload.jobId !== jobId ||
        !Number.isSafeInteger(payload.issuedQuoteVersion) || payload.issuedQuoteVersion < 1 ||
        !validState || !/^[A-Z]{3}$/.test(payload.currency || "") ||
        !validDepositRequestBinding ||
        [requiredMinor, receivedMinor, remainingMinor, quoteTotalMinor, balanceRemainingMinor].includes(null) ||
        receivedMinor + remainingMinor !== requiredMinor) return null;
    paymentLifecycle = Object.freeze({
      ...payload,
      quoteTotalMinor,
      requiredMinor,
      receivedMinor,
      remainingMinor,
      balanceRemainingMinor,
    });
    reference = Object.freeze({ type: "payment", quoteId, jobId });
  }

  const isViewer = message?.sender?.isViewer === true;
  const senderRole = isViewer
    ? viewerRole
    : viewerRole === "business"
    ? "homeowner"
    : "business";
  const delegatedDisplayName =
    typeof message?.delegatedAuthor?.displayName === "string"
      ? message.delegatedAuthor.displayName.trim()
      : "";
  const delegatedAuthor =
    message?.delegatedAuthor?.type === "FIELD_EMPLOYEE" &&
    message?.delegatedAuthor?.role === "FIELD_EMPLOYEE" &&
    delegatedDisplayName
      ? Object.freeze({
          type: "FIELD_EMPLOYEE",
          displayName: delegatedDisplayName,
          role: "FIELD_EMPLOYEE",
        })
      : null;

  const normalized = {
    id: `canonical-message-${backendId}`,
    backendId,
    type: contentType,
    sender: isViewer ? "me" : "them",
    senderRole,
    text: typeof content.text === "string" ? content.text : "",
    imageUrl: typeof content.imageUrl === "string" ? content.imageUrl : null,
    workflowType,
    workflowStatus,
    workflowPayload:
      quoteShare || invoiceShare || paymentLifecycle || (message?.workflow?.payload && typeof message.workflow.payload === "object"
        ? message.workflow.payload
        : {}),
    status: "delivered",
    createdAt: message.createdAt || null,
    time: message.createdAt || "",
    unsent: false,
  };
  if (quoteShare) {
    normalized.quoteShare = quoteShare;
    normalized.reference = reference;
  }
  if (invoiceShare) {
    normalized.invoiceShare = invoiceShare;
    normalized.reference = reference;
  }
  if (paymentLifecycle) {
    normalized.paymentLifecycle = paymentLifecycle;
    normalized.reference = reference;
  }
  if (delegatedAuthor) {
    normalized.delegatedAuthor = delegatedAuthor;
  }
  return normalized;
}

export function normalizeCanonicalMessageCollection(
  payload = {},
  expectedConversationId,
  viewerRole = "homeowner"
) {
  const responseConversationId = normalizeCanonicalConversationId(
    payload.conversationId
  );
  const normalizedExpectedId = normalizeCanonicalConversationId(
    expectedConversationId
  );

  if (
    payload.success !== true ||
    !responseConversationId ||
    responseConversationId !== normalizedExpectedId ||
    !Array.isArray(payload.messages)
  ) {
    return null;
  }

  const messages = payload.messages.map((message) =>
    normalizeCanonicalMessage(message, viewerRole)
  );

  return messages.every(Boolean) ? messages : null;
}

function normalizeCanonicalMessagePagination(pagination) {
  if (
    !pagination ||
    typeof pagination !== "object" ||
    Array.isArray(pagination) ||
    typeof pagination.hasMore !== "boolean"
  ) {
    return null;
  }

  return { hasMore: pagination.hasMore };
}

export function getCanonicalVisibleMessageWatermark(conversationId, messages) {
  if (!Array.isArray(messages)) return null;
  if (messages.length === 0) return null;

  const backendMessageIds = [];
  const uniqueMessageIds = new Set();

  for (const message of messages) {
    const messageId = normalizeCanonicalConversationId(message?.backendId);

    if (!messageId || uniqueMessageIds.has(messageId)) return null;
    uniqueMessageIds.add(messageId);
    backendMessageIds.push(messageId);
  }

  return `${conversationId}:${Math.max(...backendMessageIds)}`;
}

export function getCanonicalVisibleMessageBoundary(conversationId, messages) {
  const routeId = normalizeCanonicalConversationId(conversationId);
  if (!routeId || !Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  const backendMessageIds = [];
  const uniqueMessageIds = new Set();

  for (const message of messages) {
    const messageId = normalizeCanonicalConversationId(message?.backendId);

    if (!messageId || uniqueMessageIds.has(messageId)) return null;
    uniqueMessageIds.add(messageId);
    backendMessageIds.push(messageId);
  }

  const lastVisibleMessageId = Math.max(...backendMessageIds);

  return {
    conversationId: routeId,
    lastVisibleMessageId,
    watermark: `${routeId}:${lastVisibleMessageId}`,
  };
}

export function buildCanonicalConversationReadSnapshot({
  threadType,
  routeConversationId,
  messageConversationId,
  routeGeneration,
  hydrationGeneration,
  messages,
  pagination,
} = {}) {
  const routeId = normalizeCanonicalConversationId(routeConversationId);
  const messageId = normalizeCanonicalConversationId(messageConversationId);
  const normalizedPagination = normalizeCanonicalMessagePagination(pagination);

  if (
    threadType !== CONVERSATION_THREAD_TYPES.CANONICAL ||
    !routeId ||
    messageId !== routeId ||
    !Number.isSafeInteger(routeGeneration) ||
    routeGeneration < 1 ||
    !Number.isSafeInteger(hydrationGeneration) ||
    hydrationGeneration < 1 ||
    !normalizedPagination ||
    normalizedPagination.hasMore !== false
  ) {
    return null;
  }

  const boundary = getCanonicalVisibleMessageBoundary(routeId, messages);
  if (!boundary) return null;

  return {
    conversationId: routeId,
    routeGeneration,
    hydrationGeneration,
    lastVisibleMessageId: boundary.lastVisibleMessageId,
    watermark: boundary.watermark,
    pagination: normalizedPagination,
  };
}

export function getCanonicalConversationReadCandidate({
  threadType,
  routeConversationId,
  detailConversationId,
  routeGeneration,
  hydrationGeneration,
  messagesPhase,
  visibleMessages,
  snapshot,
} = {}) {
  const routeId = normalizeCanonicalConversationId(routeConversationId);
  const detailId = normalizeCanonicalConversationId(detailConversationId);

  if (
    threadType !== CONVERSATION_THREAD_TYPES.CANONICAL ||
    !routeId ||
    detailId !== routeId ||
    !Number.isSafeInteger(hydrationGeneration) ||
    hydrationGeneration < 1 ||
    messagesPhase !== "ready" ||
    !snapshot ||
    snapshot.conversationId !== routeId ||
    snapshot.routeGeneration !== routeGeneration ||
    snapshot.hydrationGeneration !== hydrationGeneration ||
    snapshot.pagination?.hasMore !== false
  ) {
    return null;
  }

  const boundary = getCanonicalVisibleMessageBoundary(
    routeId,
    visibleMessages
  );
  if (
    !boundary ||
    boundary.watermark !== snapshot.watermark ||
    boundary.lastVisibleMessageId !== snapshot.lastVisibleMessageId
  ) {
    return null;
  }

  return {
    conversationId: routeId,
    routeGeneration,
    hydrationGeneration,
    lastVisibleMessageId: boundary.lastVisibleMessageId,
    watermark: boundary.watermark,
  };
}

export function createCanonicalConversationReadAttemptState(
  routeGeneration = 0,
  hydrationGeneration = 0
) {
  return {
    routeGeneration:
      Number.isSafeInteger(routeGeneration) && routeGeneration >= 0
        ? routeGeneration
        : 0,
    hydrationGeneration:
      Number.isSafeInteger(hydrationGeneration) && hydrationGeneration >= 0
        ? hydrationGeneration
        : 0,
    attemptedWatermark: null,
    inFlightWatermark: null,
    inFlightHydrationGeneration: null,
    confirmedWatermark: null,
    scheduledWatermark: null,
  };
}

export function canScheduleCanonicalConversationReadAttempt(state, candidate) {
  return Boolean(
    state &&
      candidate &&
      state.routeGeneration === candidate.routeGeneration &&
      state.hydrationGeneration === candidate.hydrationGeneration &&
      Number.isSafeInteger(candidate.lastVisibleMessageId) &&
      candidate.lastVisibleMessageId > 0 &&
      typeof candidate.watermark === "string" &&
      candidate.watermark &&
      !state.scheduledWatermark &&
      !state.inFlightWatermark &&
      state.attemptedWatermark !== candidate.watermark &&
      state.confirmedWatermark !== candidate.watermark
  );
}

export function beginCanonicalConversationReadAttempt(state, candidate) {
  if (
    !state ||
    !candidate ||
    state.routeGeneration !== candidate.routeGeneration ||
    state.hydrationGeneration !== candidate.hydrationGeneration ||
    !Number.isSafeInteger(candidate.lastVisibleMessageId) ||
    candidate.lastVisibleMessageId <= 0 ||
    typeof candidate.watermark !== "string" ||
    !candidate.watermark ||
    state.inFlightWatermark ||
    state.attemptedWatermark === candidate.watermark ||
    state.confirmedWatermark === candidate.watermark
  ) {
    return { started: false, state };
  }

  return {
    started: true,
    state: {
      ...state,
      attemptedWatermark: candidate.watermark,
      inFlightWatermark: candidate.watermark,
      inFlightHydrationGeneration: candidate.hydrationGeneration,
    },
  };
}

export function settleCanonicalConversationReadAttempt(
  state,
  { routeGeneration, hydrationGeneration, watermark, succeeded } = {}
) {
  if (
    !state ||
    state.routeGeneration !== routeGeneration ||
    state.inFlightWatermark !== watermark
  ) {
    return state;
  }

  const exactHydration =
    state.inFlightHydrationGeneration === hydrationGeneration &&
    state.hydrationGeneration === hydrationGeneration;

  return {
    ...state,
    inFlightWatermark: null,
    inFlightHydrationGeneration: null,
    confirmedWatermark:
      succeeded && exactHydration ? watermark : state.confirmedWatermark,
  };
}

const SUPPORTED_LEGACY_CONVERSATION_TYPES = new Set([
  CONVERSATION_THREAD_TYPES.LEGACY_QUOTE_REQUEST,
  "standard",
  "hiring",
  "hiring_application",
  "job_inquiry",
  "applicant_message",
]);

export function isSupportedLegacyConversationThread({
  conversationId,
  threadType,
  record,
} = {}) {
  const normalizedConversationId = String(conversationId ?? "").trim();
  const normalizedThreadType = String(threadType ?? "").trim();
  const recordId = String(record?.id ?? record?.conversationId ?? "").trim();
  const recordThreadType = String(record?.threadType ?? "").trim();
  const recordConversationType = String(record?.conversation_type ?? "").trim();
  const explicitRecordType = recordThreadType || recordConversationType;

  return Boolean(
    normalizedConversationId &&
      recordId === normalizedConversationId &&
      SUPPORTED_LEGACY_CONVERSATION_TYPES.has(normalizedThreadType) &&
      SUPPORTED_LEGACY_CONVERSATION_TYPES.has(explicitRecordType) &&
      normalizedThreadType === explicitRecordType
  );
}

export function createCanonicalConversationReadCoordinator({
  scheduleFrame,
  cancelFrame,
  markRead,
  refreshCounts,
  isCurrent,
} = {}) {
  if (
    typeof scheduleFrame !== "function" ||
    typeof cancelFrame !== "function" ||
    typeof markRead !== "function" ||
    typeof refreshCounts !== "function" ||
    typeof isCurrent !== "function"
  ) {
    throw new TypeError("Canonical conversation read coordinator dependencies are required.");
  }

  let state = createCanonicalConversationReadAttemptState();
  let scheduledFrame = null;

  const clearScheduledState = (candidate) => {
    if (
      state.routeGeneration === candidate.routeGeneration &&
      state.hydrationGeneration === candidate.hydrationGeneration &&
      state.scheduledWatermark === candidate.watermark
    ) {
      state = { ...state, scheduledWatermark: null };
    }
  };

  const cancelScheduled = (candidate = null) => {
    if (
      !scheduledFrame ||
      (candidate &&
        (scheduledFrame.candidate.routeGeneration !== candidate.routeGeneration ||
          scheduledFrame.candidate.hydrationGeneration !==
            candidate.hydrationGeneration ||
          scheduledFrame.candidate.watermark !== candidate.watermark))
    ) {
      return false;
    }

    const pending = scheduledFrame;
    scheduledFrame = null;
    cancelFrame(pending.frameId);
    clearScheduledState(pending.candidate);
    return true;
  };

  const reset = (routeGeneration = 0, hydrationGeneration = 0) => {
    cancelScheduled();
    state = createCanonicalConversationReadAttemptState(
      routeGeneration,
      hydrationGeneration
    );
  };

  const invalidateHydration = (routeGeneration, hydrationGeneration) => {
    cancelScheduled();
    if (
      Number.isSafeInteger(routeGeneration) &&
      routeGeneration >= 0 &&
      Number.isSafeInteger(hydrationGeneration) &&
      hydrationGeneration >= 0
    ) {
      state = {
        ...state,
        routeGeneration,
        hydrationGeneration,
        scheduledWatermark: null,
      };
    }
  };

  const schedule = (candidate) => {
    if (!canScheduleCanonicalConversationReadAttempt(state, candidate)) {
      return false;
    }

    state = { ...state, scheduledWatermark: candidate.watermark };

    let frameId;
    try {
      frameId = scheduleFrame(async () => {
        if (
          !scheduledFrame ||
          scheduledFrame.frameId !== frameId ||
          scheduledFrame.candidate.routeGeneration !== candidate.routeGeneration ||
          scheduledFrame.candidate.hydrationGeneration !==
            candidate.hydrationGeneration ||
          scheduledFrame.candidate.watermark !== candidate.watermark
        ) {
          return;
        }

        scheduledFrame = null;
        clearScheduledState(candidate);
        if (!isCurrent(candidate)) return;

        const attempt = beginCanonicalConversationReadAttempt(state, candidate);
        state = attempt.state;
        if (!attempt.started) return;

        let succeeded;
        try {
          const result = await markRead(
            candidate.conversationId,
            candidate.lastVisibleMessageId
          );
          succeeded =
            normalizeCanonicalConversationId(result?.conversationId) ===
              candidate.conversationId &&
            normalizeCanonicalConversationId(result?.acknowledgedMessageId) ===
              candidate.lastVisibleMessageId;
        } catch {
          succeeded = false;
        }

        const stillCurrent = isCurrent(candidate);

        state = settleCanonicalConversationReadAttempt(state, {
          routeGeneration: candidate.routeGeneration,
          hydrationGeneration: candidate.hydrationGeneration,
          watermark: candidate.watermark,
          succeeded: succeeded && stillCurrent,
        });

        if (succeeded && stillCurrent) {
          try {
            await refreshCounts();
          } catch {
            // Alert-count refresh failure does not change confirmed read authority.
          }
        }
      });
    } catch {
      clearScheduledState(candidate);
      return false;
    }

    scheduledFrame = { candidate, frameId };
    return true;
  };

  return {
    cancelScheduled,
    getState: () => ({ ...state }),
    invalidateHydration,
    reset,
    schedule,
  };
}

export function validateCanonicalMessageText(value) {
  if (typeof value !== "string") {
    return { valid: false, code: "MESSAGE_TEXT_REQUIRED", text: "" };
  }

  const text = value.trim();
  if (!text) {
    return { valid: false, code: "MESSAGE_TEXT_REQUIRED", text: "" };
  }
  if (text.length > CANONICAL_MESSAGE_MAX_LENGTH) {
    return { valid: false, code: "MESSAGE_TEXT_TOO_LONG", text };
  }

  return { valid: true, code: "", text };
}

export function buildCanonicalMessagePayload(text) {
  return { message_text: text };
}
