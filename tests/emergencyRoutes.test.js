import assert from "node:assert/strict";
import test from "node:test";

import {
  EMERGENCY_REQUEST_ROUTE_PAGE,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  buildEmergencyDraftRoute,
  buildEmergencyRequestRoute,
  parseEmergencyRequestRoute,
  replaceEmergencyRequestRoute,
  resolveLegacyEmergencyRoute,
} from "../src/utils/emergencyRoutes.js";

test("all legacy Emergency routes redirect to canonical destinations", () => {
  assert.deepEqual(LEGACY_EMERGENCY_ROUTE_REDIRECTS, {
    emergencyBusinessSelection: "emergency",
    emergencyBusinessSettings: "contractorProfile",
    emergencyStatus: "myRequests",
    emergencyDispatch: "contractorDashboard",
    emergencyCompletionActions: "contractorDashboard",
    emergencyOperationsCenter: "contractorDashboard",
    emergencyChat: "messagesInbox",
    emergencyComplete: "myRequests",
  });

  for (const [legacyRoute, canonicalRoute] of Object.entries(
    LEGACY_EMERGENCY_ROUTE_REDIRECTS
  )) {
    assert.equal(resolveLegacyEmergencyRoute(legacyRoute), canonicalRoute);
    assert.equal(
      resolveLegacyEmergencyRoute(`#${legacyRoute}?stale=true`),
      canonicalRoute
    );
  }
});

test("canonical and unrelated routes pass through the Emergency redirect policy", () => {
  for (const route of [
    "emergency",
    "emergencyRequest?requestId=41",
    "conversationThread?conversationId=9&returnPage=myRequests",
    "home",
  ]) {
    assert.equal(resolveLegacyEmergencyRoute(route), route);
  }
});

test("Emergency route parser accepts exact canonical identity", () => {
  assert.deepEqual(
    parseEmergencyRequestRoute(
      "#emergencyRequest?requestId=41"
    ),
    {
      page: "emergencyRequest",
      hasRequestId: true,
      requestId: 41,
      serviceSpecialty: "",
      valid: true,
    }
  );
});

test("Emergency route parser preserves blank new-draft route", () => {
  assert.deepEqual(
    parseEmergencyRequestRoute("emergencyRequest"),
    {
      page: "emergencyRequest",
      hasRequestId: false,
      requestId: null,
      serviceSpecialty: "",
      valid: true,
    }
  );
});

test("generic Emergency entry carries no fabricated specialty", () => {
  assert.equal(buildEmergencyDraftRoute(), "emergencyRequest");
  assert.equal(
    parseEmergencyRequestRoute("emergencyRequest").serviceSpecialty,
    ""
  );
});

test("Emergency route parser rejects malformed identity", () => {
  for (const route of [
    "emergencyRequest?requestId=",
    "emergencyRequest?requestId=0",
    "emergencyRequest?requestId=-1",
    "emergencyRequest?requestId=01",
    "emergencyRequest?requestId=1.2",
    "emergencyRequest?requestId=abc",
  ]) {
    const parsed = parseEmergencyRequestRoute(route);

    assert.equal(
      parsed.page,
      EMERGENCY_REQUEST_ROUTE_PAGE
    );
    assert.equal(parsed.hasRequestId, true);
    assert.equal(parsed.requestId, null);
    assert.equal(parsed.serviceSpecialty, "");
    assert.equal(parsed.valid, false);
  }
});

test("non-Emergency routes do not become Emergency identity", () => {
  assert.deepEqual(
    parseEmergencyRequestRoute("home?requestId=41"),
    {
      page: "home",
      hasRequestId: false,
      requestId: null,
      serviceSpecialty: "",
      valid: false,
    }
  );
});

test("Emergency route builder emits normalized exact IDs", () => {
  assert.equal(
    buildEmergencyRequestRoute(41),
    "emergencyRequest?requestId=41"
  );

  assert.equal(
    buildEmergencyRequestRoute("41"),
    "emergencyRequest?requestId=41"
  );

  assert.equal(
    buildEmergencyRequestRoute("invalid"),
    "emergencyRequest"
  );
});

test("Emergency new-draft routes carry only canonical specialty hints", () => {
  const specialties = [
    "emergency_plumbing",
    "emergency_electrical_service",
    "roof_leak_repair",
    "emergency_lockout",
    "handyman",
  ];

  for (const specialty of specialties) {
    const route = buildEmergencyDraftRoute(specialty);

    assert.equal(
      route,
      `emergencyRequest?serviceSpecialty=${specialty}`
    );
    assert.deepEqual(parseEmergencyRequestRoute(route), {
      page: "emergencyRequest",
      hasRequestId: false,
      requestId: null,
      serviceSpecialty: specialty,
      valid: true,
    });
  }
});

test("unsupported specialty hints are ignored without legacy normalization", () => {
  for (const specialty of [
    "locksmith",
    "storm_preparation",
    "electrical",
    "unknown",
  ]) {
    assert.equal(
      buildEmergencyDraftRoute(specialty),
      "emergencyRequest"
    );
    assert.equal(
      parseEmergencyRequestRoute(
        `emergencyRequest?serviceSpecialty=${specialty}`
      ).serviceSpecialty,
      ""
    );
  }
});

test("backend request identity remains distinct from specialty context", () => {
  assert.deepEqual(
    parseEmergencyRequestRoute(
      "emergencyRequest?requestId=41&serviceSpecialty=handyman"
    ),
    {
      page: "emergencyRequest",
      hasRequestId: true,
      requestId: 41,
      serviceSpecialty: "handyman",
      valid: true,
    }
  );
});

test("route replacement preserves path and query", () => {
  const calls = [];

  const route = replaceEmergencyRequestRoute(41, {
    location: {
      pathname: "/login",
      search: "?source=test",
    },
    history: {
      state: {
        preserved: true,
      },
      replaceState(...args) {
        calls.push(args);
      },
    },
  });

  assert.equal(
    route,
    "emergencyRequest?requestId=41"
  );

  assert.deepEqual(calls, [[
    {
      preserved: true,
    },
    "",
    "/login?source=test#emergencyRequest?requestId=41",
  ]]);
});
