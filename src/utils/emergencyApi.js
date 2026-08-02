import { authFetch } from "./authFetch.js";
import {
  isSupportedEmergencySummaryStatus,
} from "./emergencySummary.js";

export const EMERGENCY_API_ENDPOINTS = Object.freeze({
  createDraft: "/emergency-requests/drafts",
  requests: "/emergency-requests",
  professionalOpportunities:
    "/professional-emergency-opportunities",
  professionalResponse: (emergencyRequestId) =>
    `/professional-emergency-opportunities/${emergencyRequestId}/respond`,
  request: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}`,
  responses: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}/responses`,
  selectResponse: (emergencyRequestId, relationshipId) =>
    `/emergency-requests/${emergencyRequestId}/responses/${relationshipId}/select`,
  safetyAssessment: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}/safety-assessment`,
  prepare: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}/prepare`,
  cancel: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}/cancel`,
  markEnRoute: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}/en-route`,
  markArrived: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}/arrived`,
  startWork: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}/start`,
  completeWork: (emergencyRequestId) =>
    `/emergency-requests/${emergencyRequestId}/complete`,
});

export const EMERGENCY_DISPATCH_ACTIONS = Object.freeze({
  MARK_EN_ROUTE: "mark_en_route",
  MARK_ARRIVED: "mark_arrived",
  START_WORK: "start_work",
  COMPLETE_WORK: "complete_work",
});

const EMERGENCY_DISPATCH_ENDPOINT_BY_ACTION = Object.freeze({
  [EMERGENCY_DISPATCH_ACTIONS.MARK_EN_ROUTE]:
    EMERGENCY_API_ENDPOINTS.markEnRoute,
  [EMERGENCY_DISPATCH_ACTIONS.MARK_ARRIVED]:
    EMERGENCY_API_ENDPOINTS.markArrived,
  [EMERGENCY_DISPATCH_ACTIONS.START_WORK]:
    EMERGENCY_API_ENDPOINTS.startWork,
  [EMERGENCY_DISPATCH_ACTIONS.COMPLETE_WORK]:
    EMERGENCY_API_ENDPOINTS.completeWork,
});

export const EMERGENCY_CLIENT_ERROR = Object.freeze({
  INVALID_REQUEST_ID: "INVALID_EMERGENCY_REQUEST_ID",
  INVALID_TRANSPORT: "INVALID_EMERGENCY_TRANSPORT",
  NETWORK_FAILURE: "EMERGENCY_NETWORK_FAILURE",
  INVALID_RESPONSE: "INVALID_EMERGENCY_RESPONSE",
});

const PROFESSIONAL_EMERGENCY_PARTICIPATION_STATES = new Set([
  "pending",
  "active",
  "declined",
  "withdrawn",
  "closed",
]);

const UNKNOWN_PROFESSIONAL_EMERGENCY_PARTICIPATION = Object.freeze({
  state: "unknown",
});

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeEmergencyRequestId(value) {
  const normalized = String(value ?? "").trim();

  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function buildEmergencyClientFailure({
  code,
  message,
  status = 0,
  data = {},
} = {}) {
  return {
    ok: false,
    status,
    code: String(code || EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE),
    message: String(
      message || "The Emergency request could not be processed."
    ),
    emergencyRequest: null,
    data: isRecord(data) ? data : {},
  };
}

function normalizeTransportResult(result, failureMessage) {
  const response = result?.response;
  const data = isRecord(result?.data) ? result.data : {};
  const status = Number(response?.status || 0);

  if (!response || typeof response.ok !== "boolean") {
    return {
      ok: false,
      status,
      code: EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE,
      message: "The Emergency service returned an invalid response.",
      data,
    };
  }

  if (!response.ok || data.success === false) {
    return {
      ok: false,
      status,
      code: String(
        data.code ||
          data.error ||
          EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE
      ),
      message: String(data.message || failureMessage),
      data,
    };
  }

  if (data.success !== true) {
    return {
      ok: false,
      status,
      code: EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE,
      message: failureMessage,
      data,
    };
  }

  return {
    ok: true,
    status,
    code: cleanText(data.code),
    message: cleanText(data.message),
    data,
  };
}

export function normalizeEmergencyApiResult(result) {
  const response = result?.response;
  const data = isRecord(result?.data) ? result.data : {};
  const status = Number(response?.status || 0);
  const emergencyRequest = isRecord(data.emergencyRequest)
    ? data.emergencyRequest
    : null;

  if (!response || typeof response.ok !== "boolean") {
    return buildEmergencyClientFailure({
      code: EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE,
      message: "The Emergency service returned an invalid response.",
      status,
      data,
    });
  }

  if (!response.ok || data.success === false) {
    return buildEmergencyClientFailure({
      code:
        data.code ||
        data.error ||
        EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE,
      message:
        data.message ||
        "The Emergency request could not be processed.",
      status,
      data,
    });
  }

  if (data.success !== true || !emergencyRequest) {
    return buildEmergencyClientFailure({
      code: EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE,
      message:
        "The Emergency service did not return a canonical request.",
      status,
      data,
    });
  }

  return {
    ok: true,
    status,
    code: String(data.code || ""),
    message: String(data.message || ""),
    emergencyRequest,
    data,
  };
}

async function executeEmergencyRequest({
  endpoint,
  method = "GET",
  body,
  authFetchImpl = authFetch,
  setPage,
  normalizeResult = normalizeEmergencyApiResult,
}) {
  if (typeof authFetchImpl !== "function") {
    return buildEmergencyClientFailure({
      code: EMERGENCY_CLIENT_ERROR.INVALID_TRANSPORT,
      message: "The authenticated Emergency transport is unavailable.",
    });
  }

  const options = {
    method,
    cache: "no-store",
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  try {
    const result = await authFetchImpl(endpoint, options, setPage);
    return normalizeResult(result);
  } catch {
    return buildEmergencyClientFailure({
      code: EMERGENCY_CLIENT_ERROR.NETWORK_FAILURE,
      message: "The Emergency service could not be reached.",
    });
  }
}

function invalidEmergencyRequestIdResult() {
  return buildEmergencyClientFailure({
    code: EMERGENCY_CLIENT_ERROR.INVALID_REQUEST_ID,
    message: "A valid Emergency request ID is required.",
    status: 400,
  });
}

function invalidEmergencyRelationshipIdResult() {
  return buildEmergencyClientFailure({
    code: "INVALID_EMERGENCY_RELATIONSHIP_ID",
    message: "A valid Emergency response ID is required.",
    status: 400,
  });
}

const EMERGENCY_SUMMARY_FIELDS = Object.freeze([
  "emergencyRequestId",
  "title",
  "serviceSpecialty",
  "status",
  "createdAt",
  "requestedAt",
  "assignedAt",
  "enRouteAt",
  "arrivedAt",
  "workStartedAt",
  "completedAt",
  "cancelledAt",
  "expiredAt",
  "availableResponseCount",
  "hasSelectedProfessional",
  "selectedProfessionalBusinessName",
  "conversationAvailable",
  "conversationId",
]);

function normalizeNullableTimestamp(value) {
  if (value === undefined || value === null || value === "") {
    return {
      valid: true,
      value: null,
    };
  }

  if (
    typeof value !== "string" ||
    !value.trim() ||
    !Number.isFinite(Date.parse(value))
  ) {
    return {
      valid: false,
      value: null,
    };
  }

  return {
    valid: true,
    value: value.trim(),
  };
}

export function normalizeEmergencyRequestSummary(record) {
  if (
    !isRecord(record) ||
    Object.keys(record).some(
      (field) => !EMERGENCY_SUMMARY_FIELDS.includes(field)
    )
  ) {
    return null;
  }

  const emergencyRequestId = normalizeEmergencyRequestId(
    record.emergencyRequestId
  );
  const title = cleanText(record.title);
  const serviceSpecialty = cleanText(
    record.serviceSpecialty
  );
  const status = cleanText(record.status);
  const availableResponseCount =
    record.availableResponseCount;
  const createdAt = normalizeNullableTimestamp(
    record.createdAt
  );
  const timestampFields = [
    "requestedAt",
    "assignedAt",
    "enRouteAt",
    "arrivedAt",
    "workStartedAt",
    "completedAt",
    "cancelledAt",
    "expiredAt",
  ];
  const timestamps = Object.fromEntries(
    timestampFields.map((field) => [
      field,
      normalizeNullableTimestamp(record[field]),
    ])
  );
  const hasSelectedProfessional =
    record.hasSelectedProfessional;
  const selectedProfessionalBusinessName =
    hasSelectedProfessional === true &&
    typeof record.selectedProfessionalBusinessName ===
      "string"
      ? cleanText(
          record.selectedProfessionalBusinessName
        ) || null
      : null;
  const approvedConversationId =
    hasSelectedProfessional === true &&
    record.conversationAvailable === true
      ? normalizeEmergencyRequestId(
          record.conversationId
        )
      : null;

  if (
    !emergencyRequestId ||
    !title ||
    !serviceSpecialty ||
    !isSupportedEmergencySummaryStatus(status) ||
    !createdAt.valid ||
    !createdAt.value ||
    !Number.isSafeInteger(availableResponseCount) ||
    availableResponseCount < 0 ||
    typeof hasSelectedProfessional !== "boolean" ||
    Object.values(timestamps).some(
      (timestamp) => !timestamp.valid
    )
  ) {
    return null;
  }

  return {
    emergencyRequestId,
    title,
    serviceSpecialty,
    status,
    createdAt: createdAt.value,
    ...Object.fromEntries(
      Object.entries(timestamps).map(([field, timestamp]) => [
        field,
        timestamp.value,
      ])
    ),
    availableResponseCount,
    hasSelectedProfessional,
    selectedProfessionalBusinessName,
    conversationAvailable:
      approvedConversationId !== null,
    conversationId: approvedConversationId,
  };
}

export function normalizeEmergencyRequestsResult(result) {
  const normalized = normalizeTransportResult(
    result,
    "Emergency requests could not be loaded."
  );
  const source = normalized.data?.emergencyRequests;

  if (!normalized.ok || !Array.isArray(source)) {
    return {
      ...normalized,
      ok: false,
      emergencyRequests: [],
    };
  }

  const emergencyRequests = source
    .map(normalizeEmergencyRequestSummary)
    .filter(Boolean);

  if (emergencyRequests.length !== source.length) {
    return {
      ...normalized,
      ok: false,
      code: EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE,
      message:
        "The Emergency request collection was invalid.",
      emergencyRequests: [],
    };
  }

  return {
    ...normalized,
    emergencyRequests,
  };
}

function normalizeEmergencyRequestListOptions(options = {}) {
  if (!isRecord(options)) return null;

  const allowedFields = new Set(["view", "limit"]);
  if (
    Object.keys(options).some(
      (field) => !allowedFields.has(field)
    )
  ) {
    return null;
  }

  const view =
    options.view === undefined || options.view === ""
      ? "active"
      : options.view;
  const limit =
    options.limit === undefined || options.limit === ""
      ? 25
      : options.limit;

  if (
    !["active", "history", "all"].includes(view) ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    return null;
  }

  return {
    view,
    limit,
  };
}

export function getEmergencyRequests(
  options = {},
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedOptions =
    normalizeEmergencyRequestListOptions(options);

  if (!normalizedOptions) {
    return Promise.resolve(
      buildEmergencyClientFailure({
        code: "EMERGENCY_REQUEST_LIST_INVALID",
        message:
          "The Emergency request list options are invalid.",
        status: 400,
      })
    );
  }

  const params = new URLSearchParams({
    view: normalizedOptions.view,
    limit: String(normalizedOptions.limit),
  });

  return executeEmergencyRequest({
    endpoint: `${EMERGENCY_API_ENDPOINTS.requests}?${params.toString()}`,
    method: "GET",
    authFetchImpl,
    setPage,
    normalizeResult: normalizeEmergencyRequestsResult,
  });
}

export function normalizeProfessionalEmergencyOpportunitiesResult(
  result
) {
  const normalized = normalizeTransportResult(
    result,
    "Emergency opportunities could not be loaded."
  );
  const source = normalized.data?.opportunities;

  if (!normalized.ok || !Array.isArray(source)) {
    return {
      ...normalized,
      ok: false,
      opportunities: [],
    };
  }

  const opportunities = source
    .map((record) => {
      if (!isRecord(record)) return null;

      const id = normalizeEmergencyRequestId(record.id);
      const title = cleanText(record.title);
      const description = cleanText(record.description);
      const serviceDomain = cleanText(record.serviceDomain);
      const serviceSpecialty = cleanText(record.serviceSpecialty);

      if (
        !id ||
        record.sourceType !== "emergency" ||
        !title ||
        !description ||
        !serviceDomain ||
        !serviceSpecialty
      ) {
        return null;
      }

      return {
        id,
        sourceType: "emergency",
        category: cleanText(record.category),
        serviceDomain,
        serviceSpecialty,
        title,
        description,
        status: cleanText(record.status),
        requestedAt: record.requestedAt || null,
        createdAt: record.createdAt || null,
        updatedAt: record.updatedAt || null,
        participation: normalizeProfessionalEmergencyParticipation(
          record.participation
        ),
        relationship: null,
        conversation: null,
      };
    })
    .filter(Boolean);

  if (opportunities.length !== source.length) {
    return {
      ...normalized,
      ok: false,
      code: EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE,
      message:
        "The Emergency opportunity response was invalid.",
      opportunities: [],
    };
  }

  return {
    ...normalized,
    opportunities,
  };
}

export function normalizeProfessionalEmergencyParticipation(value) {
  if (value === undefined || value === null) return null;

  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    typeof value.state !== "string" ||
    !PROFESSIONAL_EMERGENCY_PARTICIPATION_STATES.has(value.state)
  ) {
    return { ...UNKNOWN_PROFESSIONAL_EMERGENCY_PARTICIPATION };
  }

  return { state: value.state };
}

export function normalizeProfessionalEmergencyResponseResult(result) {
  const normalized = normalizeTransportResult(
    result,
    "The Emergency response could not be created."
  );
  const relationship = normalized.data?.relationship;
  const relationshipId = normalizeEmergencyRequestId(
    relationship?.id
  );
  const emergencyRequestId = normalizeEmergencyRequestId(
    relationship?.emergencyRequestId
  );

  if (
    !normalized.ok ||
    !isRecord(relationship) ||
    !relationshipId ||
    !emergencyRequestId
  ) {
    return {
      ...normalized,
      ok: false,
      relationship: null,
      created: false,
    };
  }

  return {
    ...normalized,
    created: normalized.data.created === true,
    relationship: {
      id: relationshipId,
      emergencyRequestId,
      status: cleanText(relationship.status),
      conversationAvailable:
        relationship.conversationAvailable === true,
      createdAt: relationship.createdAt || null,
      respondedAt: relationship.respondedAt || null,
    },
  };
}

export function normalizeHomeownerEmergencyResponsesResult(result) {
  const normalized = normalizeTransportResult(
    result,
    "Emergency responses could not be loaded."
  );
  const source = normalized.data?.responses;
  const requestId = normalizeEmergencyRequestId(
    normalized.data?.emergencyRequest?.id
  );

  if (!normalized.ok || !requestId || !Array.isArray(source)) {
    return {
      ...normalized,
      ok: false,
      emergencyRequest: null,
      responses: [],
    };
  }

  const responses = source
    .map((response) => {
      if (!isRecord(response) || !isRecord(response.professional)) {
        return null;
      }

      const id = normalizeEmergencyRequestId(response.id);
      const responseRequestId = normalizeEmergencyRequestId(
        response.emergencyRequestId
      );

      if (!id || responseRequestId !== requestId) return null;

      return {
        id,
        emergencyRequestId: responseRequestId,
        status: cleanText(response.status),
        respondedAt: response.respondedAt || null,
        createdAt: response.createdAt || null,
        acceptedAt: response.acceptedAt || null,
        declinedAt: response.declinedAt || null,
        withdrawnAt: response.withdrawnAt || null,
        closedAt: response.closedAt || null,
        conversationAvailable:
          response.conversationAvailable === true,
        professional: {
          businessName: cleanText(
            response.professional.businessName
          ),
          category: cleanText(response.professional.category),
          serviceSpecialties: Array.isArray(
            response.professional.serviceSpecialties
          )
            ? response.professional.serviceSpecialties
                .filter((value) => typeof value === "string")
                .map((value) => value.trim())
                .filter(Boolean)
            : [],
          profileImageUrl:
            cleanText(response.professional.profileImageUrl) ||
            null,
          businessLogoUrl:
            cleanText(response.professional.businessLogoUrl) ||
            null,
        },
      };
    })
    .filter(Boolean);

  if (responses.length !== source.length) {
    return {
      ...normalized,
      ok: false,
      code: EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE,
      message: "The Emergency response list was invalid.",
      emergencyRequest: null,
      responses: [],
    };
  }

  return {
    ...normalized,
    emergencyRequest: {
      id: requestId,
      status: cleanText(
        normalized.data.emergencyRequest.status
      ),
    },
    responses,
  };
}

export function normalizeEmergencySelectionResult(result) {
  const normalized = normalizeTransportResult(
    result,
    "The Emergency professional could not be selected."
  );
  const emergencyRequest = normalized.data?.emergencyRequest;
  const relationship = normalized.data?.relationship;
  const conversation = normalized.data?.conversation;
  const requestId = normalizeEmergencyRequestId(
    emergencyRequest?.id
  );
  const relationshipId = normalizeEmergencyRequestId(
    relationship?.id
  );
  const conversationId = normalizeEmergencyRequestId(
    conversation?.id
  );

  if (
    !normalized.ok ||
    !requestId ||
    !relationshipId ||
    !conversationId
  ) {
    return {
      ...normalized,
      ok: false,
      emergencyRequest: null,
      relationship: null,
      conversation: null,
    };
  }

  return {
    ...normalized,
    alreadySelected:
      normalized.data.alreadySelected === true,
    declinedResponseCount: Number(
      normalized.data.declinedResponseCount || 0
    ),
    emergencyRequest: {
      id: requestId,
      status: cleanText(emergencyRequest.status),
      assignedAt: emergencyRequest.assignedAt || null,
      updatedAt: emergencyRequest.updatedAt || null,
    },
    relationship: {
      id: relationshipId,
      emergencyRequestId: normalizeEmergencyRequestId(
        relationship.emergencyRequestId
      ),
      status: cleanText(relationship.status),
      acceptedAt: relationship.acceptedAt || null,
      conversationAvailable:
        relationship.conversationAvailable === true,
    },
    conversation: {
      id: conversationId,
      relationshipId: normalizeEmergencyRequestId(
        conversation.relationshipId
      ),
      status: cleanText(conversation.status),
    },
  };
}

export function normalizeEmergencyDispatchResult(result) {
  const normalized = normalizeTransportResult(
    result,
    "The Emergency dispatch transition could not be completed."
  );
  const emergencyRequest = normalized.data?.emergencyRequest;
  const conversation = normalized.data?.conversation;
  const requestId = normalizeEmergencyRequestId(
    emergencyRequest?.id
  );
  const conversationId = normalizeEmergencyRequestId(
    conversation?.id
  );

  if (!normalized.ok || !requestId || !conversationId) {
    return {
      ...normalized,
      ok: false,
      emergencyRequest: null,
      relationship: null,
      conversation: null,
    };
  }

  return {
    ...normalized,
    alreadyApplied:
      normalized.data.alreadyApplied === true,
    emergencyRequest: {
      id: requestId,
      status: cleanText(emergencyRequest.status),
      assignedAt: emergencyRequest.assignedAt || null,
      enRouteAt: emergencyRequest.enRouteAt || null,
      arrivedAt: emergencyRequest.arrivedAt || null,
      workStartedAt: emergencyRequest.workStartedAt || null,
      completedAt: emergencyRequest.completedAt || null,
      updatedAt: emergencyRequest.updatedAt || null,
    },
    relationship: isRecord(normalized.data.relationship)
      ? {
          id: normalizeEmergencyRequestId(
            normalized.data.relationship.id
          ),
          status: cleanText(
            normalized.data.relationship.status
          ),
        }
      : null,
    conversation: {
      id: conversationId,
      status: cleanText(conversation.status),
      updatedAt: conversation.updatedAt || null,
    },
  };
}

export function createEmergencyDraft(
  payload,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.createDraft,
    method: "POST",
    body: payload,
    authFetchImpl,
    setPage,
  });
}

export function listProfessionalEmergencyOpportunities({
  authFetchImpl = authFetch,
  setPage,
} = {}) {
  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.professionalOpportunities,
    method: "GET",
    authFetchImpl,
    setPage,
    normalizeResult:
      normalizeProfessionalEmergencyOpportunitiesResult,
  });
}

export function respondToEmergencyOpportunity(
  emergencyRequestId,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint:
      EMERGENCY_API_ENDPOINTS.professionalResponse(normalizedId),
    method: "POST",
    body: {},
    authFetchImpl,
    setPage,
    normalizeResult:
      normalizeProfessionalEmergencyResponseResult,
  });
}

export function getEmergencyRequest(
  emergencyRequestId,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.request(normalizedId),
    method: "GET",
    authFetchImpl,
    setPage,
  });
}

export function listHomeownerEmergencyResponses(
  emergencyRequestId,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.responses(normalizedId),
    method: "GET",
    authFetchImpl,
    setPage,
    normalizeResult:
      normalizeHomeownerEmergencyResponsesResult,
  });
}

export function selectHomeownerEmergencyResponse(
  emergencyRequestId,
  relationshipId,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedRequestId =
    normalizeEmergencyRequestId(emergencyRequestId);
  const normalizedRelationshipId =
    normalizeEmergencyRequestId(relationshipId);

  if (!normalizedRequestId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  if (!normalizedRelationshipId) {
    return Promise.resolve(
      invalidEmergencyRelationshipIdResult()
    );
  }

  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.selectResponse(
      normalizedRequestId,
      normalizedRelationshipId
    ),
    method: "POST",
    body: {},
    authFetchImpl,
    setPage,
    normalizeResult: normalizeEmergencySelectionResult,
  });
}

export function updateEmergencyDraft(
  emergencyRequestId,
  payload,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.request(normalizedId),
    method: "PATCH",
    body: payload,
    authFetchImpl,
    setPage,
  });
}

export function saveEmergencySafetyAssessment(
  emergencyRequestId,
  payload,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint:
      EMERGENCY_API_ENDPOINTS.safetyAssessment(normalizedId),
    method: "POST",
    body: payload,
    authFetchImpl,
    setPage,
  });
}

export function prepareEmergencyRequest(
  emergencyRequestId,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.prepare(normalizedId),
    method: "POST",
    authFetchImpl,
    setPage,
  });
}

export function cancelEmergencyRequest(
  emergencyRequestId,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  return executeEmergencyRequest({
    endpoint: EMERGENCY_API_ENDPOINTS.cancel(normalizedId),
    method: "POST",
    authFetchImpl,
    setPage,
  });
}

export function transitionEmergencyDispatch(
  emergencyRequestId,
  action,
  {
    authFetchImpl = authFetch,
    setPage,
  } = {}
) {
  const normalizedId =
    normalizeEmergencyRequestId(emergencyRequestId);
  const endpointBuilder =
    EMERGENCY_DISPATCH_ENDPOINT_BY_ACTION[action];

  if (!normalizedId) {
    return Promise.resolve(invalidEmergencyRequestIdResult());
  }

  if (typeof endpointBuilder !== "function") {
    return Promise.resolve(
      buildEmergencyClientFailure({
        code: "INVALID_EMERGENCY_DISPATCH_ACTION",
        message:
          "The Emergency dispatch action is not authorized.",
        status: 400,
      })
    );
  }

  return executeEmergencyRequest({
    endpoint: endpointBuilder(normalizedId),
    method: "POST",
    body: {},
    authFetchImpl,
    setPage,
    normalizeResult: normalizeEmergencyDispatchResult,
  });
}
