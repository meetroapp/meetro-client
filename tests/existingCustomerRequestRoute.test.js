import assert from "node:assert/strict";
import test from "node:test";

import {
  applyExistingCustomerRequestAuthority,
  buildExistingCustomerRequestRoute,
  readExistingCustomerRequestRoute,
} from "../src/utils/existingCustomerRequestRoute.js";

const RELATIONSHIP_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("Request New Work route carries exact prior relationship identity", () => {
  const route =
    buildExistingCustomerRequestRoute({
      meetroRelationshipId: RELATIONSHIP_ID,
      businessName: "BGone Construction",
    });

  const state =
    readExistingCustomerRequestRoute(
      `#${route}`
    );

  assert.equal(state.active, true);
  assert.equal(state.valid, true);
  assert.equal(
    state.meetroRelationshipId,
    RELATIONSHIP_ID
  );
  assert.equal(
    state.professionalName,
    "BGone Construction"
  );
});

test("ordinary Request Service route has no repeat-work authority", () => {
  const state =
    readExistingCustomerRequestRoute(
      "#upload"
    );

  assert.equal(state.active, false);
  assert.equal(
    state.meetroRelationshipId,
    null
  );
});

test("malformed repeat-work relationship fails closed", () => {
  const state =
    readExistingCustomerRequestRoute(
      "#upload?requestOrigin=existing_customer_request&sourceMeetroRelationshipId=request-123"
    );

  assert.equal(state.active, true);
  assert.equal(state.valid, false);
  assert.equal(
    state.meetroRelationshipId,
    null
  );
});

test("repeat-work payload sends only server-verifiable relationship authority", () => {
  const routeState =
    readExistingCustomerRequestRoute(
      `#${buildExistingCustomerRequestRoute({
        meetroRelationshipId:
          RELATIONSHIP_ID,
        businessName:
          "BGone Construction",
      })}`
    );

  const payload =
    applyExistingCustomerRequestAuthority(
      {
        title: "New kitchen work",
        description:
          "A completely new project.",
        category: "handyman",
        direct_request: true,
        direct_request_source:
          "legacy_hire_again",
        direct_professional_name:
          "Wrong client value",
        direct_conversation_id:
          "old-conversation",
        target_contractor_profile_id: 999,
        target_professional_user_id: 998,
      },
      routeState
    );

  assert.equal(
    payload.request_origin,
    "existing_customer_request"
  );
  assert.equal(
    payload.source_meetro_relationship_id,
    RELATIONSHIP_ID
  );

  assert.equal(
    payload.direct_request,
    undefined
  );
  assert.equal(
    payload.direct_request_source,
    undefined
  );
  assert.equal(
    payload.direct_professional_name,
    undefined
  );
  assert.equal(
    payload.direct_conversation_id,
    undefined
  );
  assert.equal(
    payload.target_contractor_profile_id,
    undefined
  );
  assert.equal(
    payload.target_professional_user_id,
    undefined
  );
});

test("ordinary payload cannot retain stale repeat-work authority", () => {
  const payload =
    applyExistingCustomerRequestAuthority(
      {
        title: "Ordinary request",
        request_origin:
          "existing_customer_request",
        source_meetro_relationship_id:
          RELATIONSHIP_ID,
      },
      {
        active: false,
        valid: true,
      }
    );

  assert.equal(
    payload.request_origin,
    undefined
  );
  assert.equal(
    payload.source_meetro_relationship_id,
    undefined
  );
});

test("active invalid repeat-work authority cannot be submitted", () => {
  assert.throws(
    () =>
      applyExistingCustomerRequestAuthority(
        {
          title: "Blocked request",
        },
        {
          active: true,
          valid: false,
          meetroRelationshipId: null,
        }
      ),
    /could not be verified/
  );
});
