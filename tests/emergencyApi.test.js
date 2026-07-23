import assert from "node:assert/strict";
import test from "node:test";

import {
  EMERGENCY_API_ENDPOINTS,
  EMERGENCY_CLIENT_ERROR,
  cancelEmergencyRequest,
  createEmergencyDraft,
  getEmergencyRequest,
  normalizeEmergencyApiResult,
  normalizeEmergencyRequestId,
  prepareEmergencyRequest,
  saveEmergencySafetyAssessment,
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
    serviceDomain: "electrical",
    serviceSpecialty: "emergency_wiring",
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
