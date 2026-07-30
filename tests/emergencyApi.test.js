import assert from "node:assert/strict";
import test from "node:test";

import {
  EMERGENCY_API_ENDPOINTS,
  EMERGENCY_CLIENT_ERROR,
  EMERGENCY_DISPATCH_ACTIONS,
  cancelEmergencyRequest,
  createEmergencyDraft,
  getEmergencyRequests,
  getEmergencyRequest,
  listHomeownerEmergencyResponses,
  listProfessionalEmergencyOpportunities,
  normalizeEmergencyApiResult,
  normalizeEmergencyRequestId,
  normalizeEmergencyRequestSummary,
  normalizeEmergencyRequestsResult,
  prepareEmergencyRequest,
  respondToEmergencyOpportunity,
  saveEmergencySafetyAssessment,
  selectHomeownerEmergencyResponse,
  transitionEmergencyDispatch,
  updateEmergencyDraft,
} from "../src/utils/emergencyApi.js";

function canonicalResponse({
  status = 200,
  code = "EMERGENCY_REQUEST_FOUND",
  emergencyRequest = {
    id: 41,
    status: "draft",
  },
} = {}) {
  return {
    response: {
      ok: status >= 200 && status < 300,
      status,
    },
    data: {
      success: status >= 200 && status < 300,
      code,
      emergencyRequest,
    },
  };
}

function createTransport(result = canonicalResponse()) {
  const calls = [];

  return {
    calls,

    async authFetchImpl(endpoint, options, setPage) {
      calls.push({
        endpoint,
        options,
        setPage,
      });

      return result;
    },
  };
}

test("Emergency request identifiers accept only safe positive integers", () => {
  assert.equal(normalizeEmergencyRequestId(1), 1);
  assert.equal(normalizeEmergencyRequestId("41"), 41);
  assert.equal(
    normalizeEmergencyRequestId(
      String(Number.MAX_SAFE_INTEGER)
    ),
    Number.MAX_SAFE_INTEGER
  );

  for (const value of [
    0,
    -1,
    "",
    " ",
    "1.2",
    "01",
    "1x",
    null,
    undefined,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.equal(normalizeEmergencyRequestId(value), null);
  }
});

test("Emergency endpoint inventory matches the certified backend contract", () => {
  assert.equal(
    EMERGENCY_API_ENDPOINTS.createDraft,
    "/emergency-requests/drafts"
  );
  assert.equal(
    EMERGENCY_API_ENDPOINTS.requests,
    "/emergency-requests"
  );

  assert.equal(
    EMERGENCY_API_ENDPOINTS.request(41),
    "/emergency-requests/41"
  );

  assert.equal(
    EMERGENCY_API_ENDPOINTS.safetyAssessment(41),
    "/emergency-requests/41/safety-assessment"
  );

  assert.equal(
    EMERGENCY_API_ENDPOINTS.prepare(41),
    "/emergency-requests/41/prepare"
  );

  assert.equal(
    EMERGENCY_API_ENDPOINTS.cancel(41),
    "/emergency-requests/41/cancel"
  );

  assert.equal(
    EMERGENCY_API_ENDPOINTS.professionalOpportunities,
    "/professional-emergency-opportunities"
  );
  assert.equal(
    EMERGENCY_API_ENDPOINTS.professionalResponse(41),
    "/professional-emergency-opportunities/41/respond"
  );
  assert.equal(
    EMERGENCY_API_ENDPOINTS.responses(41),
    "/emergency-requests/41/responses"
  );
  assert.equal(
    EMERGENCY_API_ENDPOINTS.selectResponse(41, 51),
    "/emergency-requests/41/responses/51/select"
  );
});

function canonicalEmergencySummary(overrides = {}) {
  return {
    emergencyRequestId: 41,
    title: "Active pipe leak",
    serviceSpecialty: "emergency_plumbing",
    status: "ready_for_distribution",
    createdAt: "2026-07-29T14:00:00.000Z",
    requestedAt: "2026-07-29T14:02:00.000Z",
    assignedAt: null,
    enRouteAt: null,
    arrivedAt: null,
    workStartedAt: null,
    completedAt: null,
    cancelledAt: null,
    expiredAt: null,
    availableResponseCount: 0,
    hasSelectedProfessional: false,
    selectedProfessionalBusinessName: null,
    conversationAvailable: false,
    conversationId: null,
    ...overrides,
  };
}

test("Emergency collection uses authenticated GET with bounded default options", async () => {
  const transport = createTransport({
    response: { ok: true, status: 200 },
    data: {
      success: true,
      code: "EMERGENCY_REQUESTS_RETRIEVED",
      emergencyRequests: [],
    },
  });

  const result = await getEmergencyRequests(
    {},
    {
      authFetchImpl: transport.authFetchImpl,
    }
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.emergencyRequests, []);
  assert.deepEqual(transport.calls[0], {
    endpoint: "/emergency-requests?view=active&limit=25",
    options: {
      method: "GET",
      cache: "no-store",
    },
    setPage: undefined,
  });
});

test("Emergency collection serializes valid views and bounded limits", async () => {
  for (const [view, limit] of [
    ["active", 1],
    ["history", 25],
    ["all", 50],
  ]) {
    const transport = createTransport({
      response: { ok: true, status: 200 },
      data: {
        success: true,
        code: "EMERGENCY_REQUESTS_RETRIEVED",
        emergencyRequests: [],
      },
    });

    const result = await getEmergencyRequests(
      { view, limit },
      {
        authFetchImpl: transport.authFetchImpl,
      }
    );

    assert.equal(result.ok, true);
    assert.equal(
      transport.calls[0].endpoint,
      `/emergency-requests?view=${view}&limit=${limit}`
    );
  }
});

test("invalid Emergency collection options fail before transport", async () => {
  const transport = createTransport();

  for (const options of [
    { view: "unsupported" },
    { limit: 0 },
    { limit: -1 },
    { limit: 51 },
    { limit: "25" },
    { homeownerId: 99 },
    null,
  ]) {
    const result = await getEmergencyRequests(options, {
      authFetchImpl: transport.authFetchImpl,
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.equal(
      result.code,
      "EMERGENCY_REQUEST_LIST_INVALID"
    );
  }

  assert.equal(transport.calls.length, 0);
});

test("Emergency collection normalizes the dedicated privacy-safe summary", async () => {
  const summary = canonicalEmergencySummary({
    availableResponseCount: 2,
    hasSelectedProfessional: true,
    selectedProfessionalBusinessName:
      "Molina Home Services",
    conversationAvailable: true,
    conversationId: 201,
  });
  const transport = createTransport({
    response: { ok: true, status: 200 },
    data: {
      success: true,
      code: "EMERGENCY_REQUESTS_RETRIEVED",
      emergencyRequests: [summary],
    },
  });

  const result = await getEmergencyRequests(
    { view: "active", limit: 25 },
    {
      authFetchImpl: transport.authFetchImpl,
    }
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.emergencyRequests, [summary]);
  assert.deepEqual(
    Object.keys(result.emergencyRequests[0]),
    Object.keys(canonicalEmergencySummary())
  );
});

test("Emergency summary normalization rejects malformed identity, count, status, timestamps, and private fields", () => {
  for (const summary of [
    canonicalEmergencySummary({ emergencyRequestId: 0 }),
    canonicalEmergencySummary({
      emergencyRequestId: "not-an-id",
    }),
    canonicalEmergencySummary({
      availableResponseCount: -1,
    }),
    canonicalEmergencySummary({
      availableResponseCount: "2",
    }),
    canonicalEmergencySummary({
      status: "professional_selected",
    }),
    canonicalEmergencySummary({
      requestedAt: 1722261600000,
    }),
    canonicalEmergencySummary({
      requestedAt: "not-a-timestamp",
    }),
    canonicalEmergencySummary({
      locationText: "Private address",
    }),
    canonicalEmergencySummary({
      homeownerId: 99,
    }),
    canonicalEmergencySummary({
      relationshipId: 151,
    }),
    canonicalEmergencySummary({
      latestMessagePreview:
        "This field is not approved for Work Center.",
    }),
  ]) {
    assert.equal(
      normalizeEmergencyRequestSummary(summary),
      null
    );
  }
});

test("Emergency summary enrichment fails closed while preserving valid base card data", () => {
  for (const overrides of [
    {
      hasSelectedProfessional: true,
      selectedProfessionalBusinessName: 99,
      conversationAvailable: true,
      conversationId: "not-an-id",
    },
    {
      hasSelectedProfessional: true,
      selectedProfessionalBusinessName: "   ",
      conversationAvailable: true,
      conversationId: 0,
    },
    {
      hasSelectedProfessional: false,
      selectedProfessionalBusinessName:
        "Hidden responder",
      conversationAvailable: true,
      conversationId: 201,
    },
    {
      hasSelectedProfessional: true,
      selectedProfessionalBusinessName:
        "Molina Home Services",
      conversationAvailable: false,
      conversationId: 201,
    },
  ]) {
    const normalized =
      normalizeEmergencyRequestSummary(
        canonicalEmergencySummary(overrides)
      );

    assert.ok(normalized);
    assert.equal(
      normalized.emergencyRequestId,
      41
    );
    assert.equal(
      normalized.selectedProfessionalBusinessName,
      overrides.selectedProfessionalBusinessName ===
        "Molina Home Services"
        ? "Molina Home Services"
        : null
    );
    assert.equal(
      normalized.conversationAvailable,
      false
    );
    assert.equal(normalized.conversationId, null);
  }
});

test("Emergency summary exposes a conversation route identity only for a selected professional and valid availability pair", () => {
  const normalized =
    normalizeEmergencyRequestSummary(
      canonicalEmergencySummary({
        status: "assigned",
        hasSelectedProfessional: true,
        selectedProfessionalBusinessName:
          "  Molina Home Services  ",
        conversationAvailable: true,
        conversationId: 201,
      })
    );

  assert.equal(
    normalized.selectedProfessionalBusinessName,
    "Molina Home Services"
  );
  assert.equal(
    normalized.conversationAvailable,
    true
  );
  assert.equal(normalized.conversationId, 201);
});

test("one malformed Emergency summary invalidates the authoritative collection", () => {
  const result = normalizeEmergencyRequestsResult({
    response: { ok: true, status: 200 },
    data: {
      success: true,
      code: "EMERGENCY_REQUESTS_RETRIEVED",
      emergencyRequests: [
        canonicalEmergencySummary(),
        canonicalEmergencySummary({
          availableResponseCount: -1,
        }),
      ],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE
  );
  assert.deepEqual(result.emergencyRequests, []);
});

test("professional Emergency opportunities expose only the bounded public projection", async () => {
  const transport = createTransport({
    response: { ok: true, status: 200 },
    data: {
      success: true,
      code: "PROFESSIONAL_EMERGENCY_OPPORTUNITIES_FOUND",
      opportunities: [
        {
          id: 41,
          sourceType: "emergency",
          category: "home_repair",
          serviceDomain: "home_services",
          serviceSpecialty: "electrical",
          title: "Electrical Emergency",
          description: "Partial outage",
          status: "ready_for_distribution",
          requestedAt: "2026-07-27T12:00:00.000Z",
          createdAt: "2026-07-27T11:58:00.000Z",
          updatedAt: "2026-07-27T12:00:00.000Z",
          relationship: null,
          conversation: null,
          locationText: "Private address",
          accessNotes: "Private access",
          homeownerId: 8,
        },
      ],
    },
  });

  const result = await listProfessionalEmergencyOpportunities({
    authFetchImpl: transport.authFetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(result.opportunities.length, 1);
  assert.deepEqual(Object.keys(result.opportunities[0]), [
    "id",
    "sourceType",
    "category",
    "serviceDomain",
    "serviceSpecialty",
    "title",
    "description",
    "status",
    "requestedAt",
    "createdAt",
    "updatedAt",
    "relationship",
    "conversation",
  ]);
  assert.equal(
    Object.hasOwn(result.opportunities[0], "locationText"),
    false
  );
  assert.deepEqual(transport.calls[0], {
    endpoint: "/professional-emergency-opportunities",
    options: {
      method: "GET",
      cache: "no-store",
    },
    setPage: undefined,
  });
});

test("professional Emergency response is idempotent and sends no client-owned identity", async () => {
  const transport = createTransport({
    response: { ok: true, status: 200 },
    data: {
      success: true,
      code: "EMERGENCY_RESPONSE_ALREADY_EXISTS",
      created: false,
      relationship: {
        id: 51,
        emergencyRequestId: 41,
        status: "responded",
        conversationAvailable: false,
        createdAt: "2026-07-27T12:00:00.000Z",
        respondedAt: "2026-07-27T12:00:00.000Z",
      },
    },
  });

  const result = await respondToEmergencyOpportunity(41, {
    authFetchImpl: transport.authFetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(result.created, false);
  assert.equal(result.relationship.id, 51);
  assert.deepEqual(transport.calls[0], {
    endpoint: "/professional-emergency-opportunities/41/respond",
    options: {
      method: "POST",
      cache: "no-store",
      body: "{}",
    },
    setPage: undefined,
  });
});

test("homeowner response selection returns canonical conversation identity", async () => {
  const listTransport = createTransport({
    response: { ok: true, status: 200 },
    data: {
      success: true,
      emergencyRequest: {
        id: 41,
        status: "ready_for_distribution",
      },
      responses: [
        {
          id: 51,
          emergencyRequestId: 41,
          status: "responded",
          conversationAvailable: false,
          professional: {
            businessName: "Cape Electrical",
            category: "electrician",
            serviceSpecialties: ["electrical"],
            profileImageUrl: null,
            businessLogoUrl: null,
          },
        },
      ],
    },
  });
  const selectionTransport = createTransport({
    response: { ok: true, status: 200 },
    data: {
      success: true,
      alreadySelected: false,
      declinedResponseCount: 0,
      emergencyRequest: {
        id: 41,
        status: "assigned",
        assignedAt: "2026-07-27T12:10:00.000Z",
      },
      relationship: {
        id: 51,
        emergencyRequestId: 41,
        status: "active",
        acceptedAt: "2026-07-27T12:10:00.000Z",
        conversationAvailable: true,
      },
      conversation: {
        id: 61,
        relationshipId: 51,
        status: "active",
      },
    },
  });

  const listed = await listHomeownerEmergencyResponses(41, {
    authFetchImpl: listTransport.authFetchImpl,
  });
  const selected = await selectHomeownerEmergencyResponse(41, 51, {
    authFetchImpl: selectionTransport.authFetchImpl,
  });

  assert.equal(listed.ok, true);
  assert.equal(
    listed.responses[0].professional.businessName,
    "Cape Electrical"
  );
  assert.equal(selected.ok, true);
  assert.equal(selected.conversation.id, 61);
  assert.equal(
    selected.relationship.conversationAvailable,
    true
  );
  assert.deepEqual(selectionTransport.calls[0], {
    endpoint: "/emergency-requests/41/responses/51/select",
    options: {
      method: "POST",
      cache: "no-store",
      body: "{}",
    },
    setPage: undefined,
  });
});

test("dispatch transitions use the exact backend-authorized action endpoint", async () => {
  const transport = createTransport({
    response: { ok: true, status: 200 },
    data: {
      success: true,
      alreadyApplied: false,
      emergencyRequest: {
        id: 41,
        status: "professional_en_route",
        enRouteAt: "2026-07-27T12:20:00.000Z",
      },
      relationship: {
        id: 51,
        status: "active",
      },
      conversation: {
        id: 61,
        status: "active",
      },
    },
  });

  const result = await transitionEmergencyDispatch(
    41,
    EMERGENCY_DISPATCH_ACTIONS.MARK_EN_ROUTE,
    { authFetchImpl: transport.authFetchImpl }
  );

  assert.equal(result.ok, true);
  assert.equal(
    result.emergencyRequest.status,
    "professional_en_route"
  );
  assert.deepEqual(transport.calls[0], {
    endpoint: "/emergency-requests/41/en-route",
    options: {
      method: "POST",
      cache: "no-store",
      body: "{}",
    },
    setPage: undefined,
  });
});

test("unknown dispatch actions fail before authenticated transport execution", async () => {
  const transport = createTransport();
  const result = await transitionEmergencyDispatch(
    41,
    "accept_dispatch",
    { authFetchImpl: transport.authFetchImpl }
  );

  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    "INVALID_EMERGENCY_DISPATCH_ACTION"
  );
  assert.equal(transport.calls.length, 0);
});

test("canonical Emergency success responses preserve backend authority", () => {
  const result = normalizeEmergencyApiResult(
    canonicalResponse({
      status: 201,
      code: "EMERGENCY_DRAFT_CREATED",
      emergencyRequest: {
        id: 41,
        status: "draft",
      },
    })
  );

  assert.deepEqual(result, {
    ok: true,
    status: 201,
    code: "EMERGENCY_DRAFT_CREATED",
    message: "",
    emergencyRequest: {
      id: 41,
      status: "draft",
    },
    data: {
      success: true,
      code: "EMERGENCY_DRAFT_CREATED",
      emergencyRequest: {
        id: 41,
        status: "draft",
      },
    },
  });
});

test("backend failures preserve safe status, code, and message", () => {
  const result = normalizeEmergencyApiResult({
    response: {
      ok: false,
      status: 409,
    },
    data: {
      success: false,
      code: "EMERGENCY_REQUEST_SAFETY_BLOCKED",
      message:
        "This Emergency request cannot be prepared.",
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(
    result.code,
    "EMERGENCY_REQUEST_SAFETY_BLOCKED"
  );
  assert.equal(
    result.message,
    "This Emergency request cannot be prepared."
  );
  assert.equal(result.emergencyRequest, null);
});

test("successful HTTP responses without canonical request data fail closed", () => {
  const result = normalizeEmergencyApiResult({
    response: {
      ok: true,
      status: 200,
    },
    data: {
      success: true,
      code: "EMERGENCY_REQUEST_FOUND",
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 200);
  assert.equal(
    result.code,
    EMERGENCY_CLIENT_ERROR.INVALID_RESPONSE
  );
});

test("draft creation uses authenticated POST without inventing state", async () => {
  const transport = createTransport(
    canonicalResponse({
      status: 201,
      code: "EMERGENCY_DRAFT_CREATED",
    })
  );

  const payload = {
    category: "home_repair",
    serviceDomain: "home_services",
    serviceSpecialty: "emergency_electrical_service",
    title: "Partial outage",
    description: "Several rooms have no power.",
    locationText: "Cape Coral, FL",
    unitNumber: "",
    accessNotes: "Call before arrival.",
  };

  const result = await createEmergencyDraft(payload, {
    authFetchImpl: transport.authFetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "EMERGENCY_DRAFT_CREATED");

  assert.deepEqual(transport.calls, [{
    endpoint: "/emergency-requests/drafts",
    options: {
      method: "POST",
      cache: "no-store",
      body: JSON.stringify(payload),
    },
    setPage: undefined,
  }]);
});

test("owned request retrieval uses canonical GET identity", async () => {
  const transport = createTransport();

  const result = await getEmergencyRequest("41", {
    authFetchImpl: transport.authFetchImpl,
  });

  assert.equal(result.ok, true);

  assert.deepEqual(transport.calls, [{
    endpoint: "/emergency-requests/41",
    options: {
      method: "GET",
      cache: "no-store",
    },
    setPage: undefined,
  }]);
});

test("draft updates use PATCH and submit only caller-provided fields", async () => {
  const transport = createTransport({
    response: {
      ok: true,
      status: 200,
    },
    data: {
      success: true,
      code: "EMERGENCY_DRAFT_UPDATED",
      emergencyRequest: {
        id: 41,
        status: "draft",
        title: "Updated title",
      },
    },
  });

  const payload = {
    title: "Updated title",
  };

  const result = await updateEmergencyDraft(41, payload, {
    authFetchImpl: transport.authFetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "EMERGENCY_DRAFT_UPDATED");

  assert.deepEqual(transport.calls[0], {
    endpoint: "/emergency-requests/41",
    options: {
      method: "PATCH",
      cache: "no-store",
      body: JSON.stringify(payload),
    },
    setPage: undefined,
  });
});

test("safety assessment uses the governed assessment endpoint", async () => {
  const transport = createTransport({
    response: {
      ok: true,
      status: 200,
    },
    data: {
      success: true,
      code: "EMERGENCY_SAFETY_ASSESSMENT_SAVED",
      emergencyRequest: {
        id: 41,
        status: "draft",
        safetyAssessment: {
          disposition: "continue",
        },
      },
    },
  });

  const payload = {
    immediateDanger: false,
    medicalEmergency: false,
    fireOrSmoke: false,
    gasOdorOrSuspectedLeak: false,
    activeCrimeOrThreat: false,
    electricalImmediateHazard: false,
    structuralCollapseRisk: false,
    floodingOrWaterDamage: false,
    occupantsUnableToExit: false,
    emergencyServicesContacted: false,
    safeToRemainAtLocation: true,
    additionalSafetyContext: "",
  };

  const result = await saveEmergencySafetyAssessment(
    41,
    payload,
    {
      authFetchImpl: transport.authFetchImpl,
    }
  );

  assert.equal(result.ok, true);
  assert.equal(
    Object.hasOwn(payload, "noHazardsApply"),
    false
  );
  assert.equal(Object.hasOwn(payload, "noneApply"), false);

  assert.deepEqual(transport.calls[0], {
    endpoint:
      "/emergency-requests/41/safety-assessment",
    options: {
      method: "POST",
      cache: "no-store",
      body: JSON.stringify(payload),
    },
    setPage: undefined,
  });
});

test("all-false safety answers are transported unchanged without invented fields", async () => {
  const transport = createTransport({
    response: {
      ok: true,
      status: 200,
    },
    data: {
      success: true,
      code: "EMERGENCY_REQUEST_SAFETY_BLOCKED",
      emergencyRequest: {
        id: 41,
        status: "safety_blocked",
        safetyAssessment: {
          disposition: "leave_location",
        },
      },
    },
  });
  const payload = {
    immediateDanger: false,
    medicalEmergency: false,
    fireOrSmoke: false,
    gasOdorOrSuspectedLeak: false,
    activeCrimeOrThreat: false,
    electricalImmediateHazard: false,
    structuralCollapseRisk: false,
    floodingOrWaterDamage: false,
    occupantsUnableToExit: false,
    emergencyServicesContacted: false,
    safeToRemainAtLocation: false,
    additionalSafetyContext: "",
  };

  const result = await saveEmergencySafetyAssessment(41, payload, {
    authFetchImpl: transport.authFetchImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(result.code, "EMERGENCY_REQUEST_SAFETY_BLOCKED");
  assert.equal(result.emergencyRequest.status, "safety_blocked");
  assert.deepEqual(
    JSON.parse(transport.calls[0].options.body),
    payload
  );
  assert.equal(
    Object.hasOwn(payload, "noHazardsApply"),
    false
  );
  assert.equal(Object.hasOwn(payload, "noneApply"), false);
});

test("prepare and cancel use separate backend lifecycle commands", async () => {
  const prepareTransport = createTransport({
    response: {
      ok: true,
      status: 200,
    },
    data: {
      success: true,
      code: "EMERGENCY_REQUEST_PREPARED",
      emergencyRequest: {
        id: 41,
        status: "ready_for_distribution",
      },
    },
  });

  const cancelTransport = createTransport({
    response: {
      ok: true,
      status: 200,
    },
    data: {
      success: true,
      code: "EMERGENCY_REQUEST_CANCELLED",
      emergencyRequest: {
        id: 41,
        status: "cancelled",
      },
    },
  });

  const prepared = await prepareEmergencyRequest(41, {
    authFetchImpl: prepareTransport.authFetchImpl,
  });

  const cancelled = await cancelEmergencyRequest(41, {
    authFetchImpl: cancelTransport.authFetchImpl,
  });

  assert.equal(
    prepared.emergencyRequest.status,
    "ready_for_distribution"
  );
  assert.equal(
    cancelled.emergencyRequest.status,
    "cancelled"
  );

  assert.deepEqual(prepareTransport.calls[0], {
    endpoint: "/emergency-requests/41/prepare",
    options: {
      method: "POST",
      cache: "no-store",
    },
    setPage: undefined,
  });

  assert.deepEqual(cancelTransport.calls[0], {
    endpoint: "/emergency-requests/41/cancel",
    options: {
      method: "POST",
      cache: "no-store",
    },
    setPage: undefined,
  });
});

test("invalid IDs fail before authenticated transport execution", async () => {
  const transport = createTransport();

  for (const operation of [
    () =>
      getEmergencyRequest("invalid", {
        authFetchImpl: transport.authFetchImpl,
      }),
    () =>
      updateEmergencyDraft(0, {}, {
        authFetchImpl: transport.authFetchImpl,
      }),
    () =>
      saveEmergencySafetyAssessment("", {}, {
        authFetchImpl: transport.authFetchImpl,
      }),
    () =>
      prepareEmergencyRequest(null, {
        authFetchImpl: transport.authFetchImpl,
      }),
    () =>
      cancelEmergencyRequest(-1, {
        authFetchImpl: transport.authFetchImpl,
      }),
  ]) {
    const result = await operation();

    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.equal(
      result.code,
      EMERGENCY_CLIENT_ERROR.INVALID_REQUEST_ID
    );
  }

  assert.equal(transport.calls.length, 0);
});

test("transport failures return a stable non-authoritative failure", async () => {
  const result = await getEmergencyRequest(41, {
    authFetchImpl: async () => {
      throw new Error("simulated network failure");
    },
  });

  assert.deepEqual(result, {
    ok: false,
    status: 0,
    code: EMERGENCY_CLIENT_ERROR.NETWORK_FAILURE,
    message: "The Emergency service could not be reached.",
    emergencyRequest: null,
    data: {},
  });
});

test("missing authenticated transport fails closed", async () => {
  const result = await createEmergencyDraft(
    {},
    {
      authFetchImpl: null,
    }
  );

  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    EMERGENCY_CLIENT_ERROR.INVALID_TRANSPORT
  );
});
