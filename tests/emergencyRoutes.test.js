import assert from "node:assert/strict";
import test from "node:test";

import {
  EMERGENCY_REQUEST_ROUTE_PAGE,
  buildEmergencyRequestRoute,
  parseEmergencyRequestRoute,
  replaceEmergencyRequestRoute,
} from "../src/utils/emergencyRoutes.js";

test("Emergency route parser accepts exact canonical identity", () => {
  assert.deepEqual(
    parseEmergencyRequestRoute(
      "#emergencyRequest?requestId=41"
    ),
    {
      page: "emergencyRequest",
      hasRequestId: true,
      requestId: 41,
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
      valid: true,
    }
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
