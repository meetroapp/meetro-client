import assert from "node:assert/strict";
import test from "node:test";

import {
  EMERGENCY_ROUTE_MODE,
  buildEmergencyRequestRoute,
  createEmergencyRouteSessionController,
  ownEmergencyRequest,
  parseEmergencyRequestRoute,
  selectEmergencyRequestForRoute,
  settleEmergencyRouteOperation,
} from "../src/utils/emergencyRoutes.js";

function routeFor(requestId) {
  return parseEmergencyRequestRoute(
    `#${buildEmergencyRequestRoute(requestId)}`
  );
}

function newRequestRoute() {
  return parseEmergencyRequestRoute("#emergencyRequest");
}

function emergencyRequest(id, overrides = {}) {
  return {
    id,
    title: `Emergency ${id}`,
    description: `Canonical description ${id}`,
    serviceSpecialty: "emergency_plumbing",
    serviceDomain: "home_services",
    category: "home_repair",
    status: "draft",
    locationText: `${id} Example Street`,
    unitNumber: `Unit ${id}`,
    accessNotes: `Access note ${id}`,
    ...overrides,
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

async function applyOwnedOperation({
  controller,
  ownership,
  operation,
  onSuccess = () => {},
  onFailure = () => {},
}) {
  const outcome = await settleEmergencyRouteOperation(
    controller,
    ownership,
    operation
  );

  if (outcome.status === "fulfilled") {
    onSuccess(outcome.value);
  } else if (outcome.status === "rejected") {
    onFailure(outcome.error);
  }

  return outcome;
}

test("route events invalidate the prior epoch synchronously before old promises settle", async () => {
  const controller = createEmergencyRouteSessionController(routeFor(41));
  const ownershipA = controller.capture();
  const lateA = deferred();
  const applied = [];
  const settlement = applyOwnedOperation({
    controller,
    ownership: ownershipA,
    operation: lateA.promise,
    onSuccess: (value) => applied.push(value),
  });
  const epochA = controller.current().epoch;

  const sessionB = controller.transition(routeFor(42));

  assert.equal(sessionB.epoch, epochA + 1);
  assert.equal(controller.owns(ownershipA), false);

  lateA.resolve(emergencyRequest(41));

  assert.equal((await settlement).status, "stale");
  assert.deepEqual(applied, []);
});

test("request A becomes ineligible immediately and only request B can render", async () => {
  const controller = createEmergencyRouteSessionController(routeFor(41));
  const sessionA = controller.current();
  const ownedA = ownEmergencyRequest(
    sessionA,
    emergencyRequest(41)
  );
  const latePrimaryA = deferred();
  const primaryA = applyOwnedOperation({
    controller,
    ownership: controller.capture(),
    operation: latePrimaryA.promise,
  });

  assert.equal(
    selectEmergencyRequestForRoute(sessionA, ownedA)?.id,
    41
  );

  const sessionB = controller.transition(routeFor(42));
  const primaryB = deferred();
  const operationB = applyOwnedOperation({
    controller,
    ownership: controller.capture(),
    operation: primaryB.promise,
  });

  assert.equal(
    selectEmergencyRequestForRoute(sessionB, ownedA),
    null
  );

  latePrimaryA.resolve({ ok: true, emergencyRequest: emergencyRequest(41) });
  assert.equal((await primaryA).status, "stale");
  assert.equal(
    selectEmergencyRequestForRoute(sessionB, ownedA),
    null
  );

  primaryB.resolve({ ok: true, emergencyRequest: emergencyRequest(42) });
  const resultB = await operationB;
  const ownedB = ownEmergencyRequest(
    sessionB,
    resultB.value.emergencyRequest
  );

  assert.equal(resultB.status, "fulfilled");
  assert.equal(
    selectEmergencyRequestForRoute(sessionB, ownedB)?.id,
    42
  );
});

test("request A cannot render or provide relationship data in no-ID creation mode", () => {
  const controller = createEmergencyRouteSessionController(routeFor(41));
  const ownedA = ownEmergencyRequest(
    controller.current(),
    emergencyRequest(41, {
      status: "assigned",
      selectedProfessional: { businessName: "A Professional" },
      conversationId: 91,
      responses: [{ id: 81 }],
    })
  );

  const newSession = controller.transition(newRequestRoute());

  assert.equal(newSession.mode, EMERGENCY_ROUTE_MODE.NEW);
  assert.equal(newSession.requestId, null);
  assert.equal(
    selectEmergencyRequestForRoute(newSession, ownedA),
    null
  );
});

test("a malformed route invalidates A and requires no canonical ownership", () => {
  const controller = createEmergencyRouteSessionController(routeFor(41));
  const ownedA = ownEmergencyRequest(
    controller.current(),
    emergencyRequest(41)
  );
  let backendLoads = 0;
  const malformedSession = controller.transition(
    parseEmergencyRequestRoute(
      "#emergencyRequest?requestId=not-valid"
    )
  );

  if (malformedSession.mode === EMERGENCY_ROUTE_MODE.DETAIL) {
    backendLoads += 1;
  }

  assert.equal(malformedSession.mode, EMERGENCY_ROUTE_MODE.INVALID);
  assert.equal(controller.owns(ownedA.ownership), false);
  assert.equal(
    selectEmergencyRequestForRoute(malformedSession, ownedA),
    null
  );
  assert.equal(backendLoads, 0);
});

test("inconsistent direct route identities fail closed before detail ownership", () => {
  for (const requestId of [null, undefined, "abc", 0, -1]) {
    const controller = createEmergencyRouteSessionController({
      page: "emergencyRequest",
      hasRequestId: true,
      requestId,
      serviceSpecialty: "",
      valid: true,
    });
    const session = controller.current();
    const ownership = controller.capture();
    const ownedIdlessRequest = ownEmergencyRequest(
      session,
      emergencyRequest(null)
    );
    const ownedMalformedRequest = ownEmergencyRequest(
      session,
      emergencyRequest("abc")
    );

    assert.equal(session.mode, EMERGENCY_ROUTE_MODE.INVALID);
    assert.equal(session.requestId, null);
    assert.notEqual(ownership.mode, EMERGENCY_ROUTE_MODE.DETAIL);
    assert.equal(
      selectEmergencyRequestForRoute(
        session,
        ownedIdlessRequest
      ),
      null
    );
    assert.equal(
      selectEmergencyRequestForRoute(
        session,
        ownedMalformedRequest
      ),
      null
    );
  }

  const inconsistentDetailSession = Object.freeze({
    epoch: 9,
    mode: EMERGENCY_ROUTE_MODE.DETAIL,
    requestId: null,
  });
  const ownedIdlessRequest = ownEmergencyRequest(
    inconsistentDetailSession,
    emergencyRequest(null)
  );

  assert.equal(
    selectEmergencyRequestForRoute(
      inconsistentDetailSession,
      ownedIdlessRequest
    ),
    null
  );

  const wrongPageSession =
    createEmergencyRouteSessionController({
      page: "home",
      hasRequestId: true,
      requestId: 41,
      serviceSpecialty: "",
      valid: true,
    }).current();

  assert.equal(
    wrongPageSession.mode,
    EMERGENCY_ROUTE_MODE.INVALID
  );
  assert.equal(wrongPageSession.requestId, null);
});

test("late primary-load rejection after A to B cannot change B state", async () => {
  const controller = createEmergencyRouteSessionController(routeFor(41));
  const primaryA = deferred();
  const state = {
    requestId: 41,
    loading: true,
    data: null,
    error: "",
    navigations: [],
  };
  const settlement = applyOwnedOperation({
    controller,
    ownership: controller.capture(),
    operation: primaryA.promise,
    onFailure: (error) => {
      state.loading = false;
      state.data = null;
      state.error = error.message;
      state.navigations.push("recovery");
    },
  });

  const sessionB = controller.transition(routeFor(42));
  const requestB = emergencyRequest(42);
  state.requestId = 42;
  state.loading = true;
  state.data = requestB;
  state.error = "";

  primaryA.reject(new Error("Raw request A failure"));

  assert.equal((await settlement).status, "stale");
  assert.equal(controller.current(), sessionB);
  assert.deepEqual(state, {
    requestId: 42,
    loading: true,
    data: requestB,
    error: "",
    navigations: [],
  });
});

test("not-found and unauthorized B results never restore request A", async () => {
  for (const status of [403, 404]) {
    const controller = createEmergencyRouteSessionController(routeFor(41));
    const ownedA = ownEmergencyRequest(
      controller.current(),
      emergencyRequest(41)
    );
    const sessionB = controller.transition(routeFor(42));
    const failureB = deferred();
    const resultB = applyOwnedOperation({
      controller,
      ownership: controller.capture(),
      operation: failureB.promise,
    });

    assert.equal(
      selectEmergencyRequestForRoute(sessionB, ownedA),
      null
    );

    failureB.resolve({ ok: false, status, emergencyRequest: null });

    assert.deepEqual((await resultB).value, {
      ok: false,
      status,
      emergencyRequest: null,
    });
    assert.equal(
      selectEmergencyRequestForRoute(sessionB, ownedA),
      null
    );
  }
});

test("late response enrichment cannot restore A professional data under B", async () => {
  const controller = createEmergencyRouteSessionController(routeFor(41));
  const responseA = deferred();
  const appliedResponses = [];
  const settlement = applyOwnedOperation({
    controller,
    ownership: controller.capture(),
    operation: responseA.promise,
    onSuccess: (value) => appliedResponses.push(...value),
  });

  controller.transition(routeFor(42));
  responseA.resolve([
    { id: 7, professional: { businessName: "A Professional" } },
  ]);

  assert.equal((await settlement).status, "stale");
  assert.deepEqual(appliedResponses, []);
});

test("late conversation enrichment cannot restore A conversation under no-ID mode", async () => {
  const controller = createEmergencyRouteSessionController(routeFor(41));
  const conversationA = deferred();
  const appliedConversationIds = [];
  const settlement = applyOwnedOperation({
    controller,
    ownership: controller.capture(),
    operation: conversationA.promise,
    onSuccess: (value) => appliedConversationIds.push(value.id),
  });

  controller.transition(newRequestRoute());
  conversationA.resolve({ id: 99 });

  assert.equal((await settlement).status, "stale");
  assert.deepEqual(appliedConversationIds, []);
});

test("late draft mutation success cannot apply data or replace the newer route", async () => {
  const controller = createEmergencyRouteSessionController(routeFor(41));
  const mutationA = deferred();
  const state = { request: null, route: null, message: "" };
  const settlement = applyOwnedOperation({
    controller,
    ownership: controller.capture(),
    operation: mutationA.promise,
    onSuccess: (value) => {
      state.request = value.emergencyRequest;
      state.route = buildEmergencyRequestRoute(value.emergencyRequest.id);
      state.message = "Draft saved";
    },
  });

  controller.transition(routeFor(42));
  mutationA.resolve({ ok: true, emergencyRequest: emergencyRequest(41) });

  assert.equal((await settlement).status, "stale");
  assert.deepEqual(state, { request: null, route: null, message: "" });
});

test("late professional selection cannot navigate to request A conversation", async () => {
  const controller = createEmergencyRouteSessionController(routeFor(41));
  const selectionA = deferred();
  const navigations = [];
  const settlement = applyOwnedOperation({
    controller,
    ownership: controller.capture(),
    operation: selectionA.promise,
    onSuccess: (value) => navigations.push(value.conversation.id),
  });

  controller.transition(routeFor(42));
  selectionA.resolve({
    ok: true,
    emergencyRequest: emergencyRequest(41, { status: "assigned" }),
    conversation: { id: 73 },
  });

  assert.equal((await settlement).status, "stale");
  assert.deepEqual(navigations, []);
});

test("late mutation rejection cannot show an error on the newer route", async () => {
  const controller = createEmergencyRouteSessionController(routeFor(41));
  const mutationA = deferred();
  const errors = [];
  const settlement = applyOwnedOperation({
    controller,
    ownership: controller.capture(),
    operation: mutationA.promise,
    onFailure: (error) => errors.push(error.message),
  });

  controller.transition(routeFor(42));
  mutationA.reject(new Error("Request A failed"));

  assert.equal((await settlement).status, "stale");
  assert.deepEqual(errors, []);
});

test("late new-request creation success cannot replace or transition the active B route", async () => {
  const controller = createEmergencyRouteSessionController(
    newRequestRoute()
  );
  const creationA = deferred();
  const state = {
    activeRequestId: null,
    loadedRequest: null,
    replacedRoutes: [],
    safetyReviewStarted: false,
    successMessage: "",
  };
  const settlement = applyOwnedOperation({
    controller,
    ownership: controller.capture(),
    operation: creationA.promise,
    onSuccess: (value) => {
      const createdRequestId = value.emergencyRequest.id;
      const createdRoute = buildEmergencyRequestRoute(
        createdRequestId
      );
      const createdSession = controller.transition(
        parseEmergencyRequestRoute(createdRoute)
      );

      state.replacedRoutes.push(createdRoute);
      state.activeRequestId = createdSession.requestId;
      state.loadedRequest = value.emergencyRequest;
      state.safetyReviewStarted = true;
      state.successMessage = "Draft saved";
    },
  });

  const sessionB = controller.transition(routeFor(42));
  const requestB = emergencyRequest(42);
  state.activeRequestId = 42;
  state.loadedRequest = requestB;

  creationA.resolve({
    ok: true,
    emergencyRequest: emergencyRequest(77),
  });

  assert.equal((await settlement).status, "stale");
  assert.equal(controller.current(), sessionB);
  assert.deepEqual(state, {
    activeRequestId: 42,
    loadedRequest: requestB,
    replacedRoutes: [],
    safetyReviewStarted: false,
    successMessage: "",
  });
});

test("successful no-ID creation synchronizes ownership to the returned canonical ID", async () => {
  const controller = createEmergencyRouteSessionController(
    newRequestRoute()
  );
  const creation = deferred();
  const settlement = applyOwnedOperation({
    controller,
    ownership: controller.capture(),
    operation: creation.promise,
  });

  assert.equal(controller.current().mode, EMERGENCY_ROUTE_MODE.NEW);
  creation.resolve({ ok: true, emergencyRequest: emergencyRequest(77) });

  const creationResult = await settlement;
  const canonicalSession = controller.transition(routeFor(77));
  const ownedCreatedRequest = ownEmergencyRequest(
    canonicalSession,
    creationResult.value.emergencyRequest
  );
  const arbitraryRequest = ownEmergencyRequest(
    canonicalSession,
    emergencyRequest(78)
  );

  assert.equal(creationResult.status, "fulfilled");
  assert.equal(canonicalSession.mode, EMERGENCY_ROUTE_MODE.DETAIL);
  assert.equal(canonicalSession.requestId, 77);
  assert.equal(
    selectEmergencyRequestForRoute(
      canonicalSession,
      ownedCreatedRequest
    )?.id,
    77
  );
  assert.equal(
    selectEmergencyRequestForRoute(canonicalSession, arbitraryRequest),
    null
  );
  assert.equal(
    selectEmergencyRequestForRoute(
      controller.transition(newRequestRoute()),
      ownedCreatedRequest
    ),
    null
  );
});
