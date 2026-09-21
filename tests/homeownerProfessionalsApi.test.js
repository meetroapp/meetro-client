import assert from "node:assert/strict";
import test from "node:test";

import {
  HomeownerProfessionalsApiError,
  createHomeownerProfessionalCommandKey,
  listHomeownerProfessionals,
  normalizeHomeownerProfessionalsResponse,
  removeHomeownerSavedProfessional,
  saveHomeownerProfessional,
} from "../src/utils/homeownerProfessionalsApi.js";

const RELATIONSHIP_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const SAVED_ID =
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function response() {
  return {
    success: true,
    code: "HOMEOWNER_PROFESSIONALS_LISTED",
    workedWith: [
      {
        meetroRelationshipId: RELATIONSHIP_ID,
        contractorProfileId: 80,
        professionalUserId: 9,
        businessName: "BGone Construction",
        category: "Handyman",
        imageUrl: "",
        establishedAt:
          "2026-09-16T10:00:00.000Z",
        lastSelectedAt:
          "2026-09-18T10:00:00.000Z",
        requestCount: 2,
        jobCount: 2,
        saved: true,
      },
    ],
    saved: [
      {
        savedProfessionalId: SAVED_ID,
        contractorProfileId: 80,
        professionalUserId: 9,
        businessName: "BGone Construction",
        category: "Handyman",
        imageUrl: "",
        savedAt:
          "2026-09-19T10:00:00.000Z",
        workedWith: true,
      },
    ],
  };
}

test("canonical My Professionals keeps Worked With and Saved independent", () => {
  const normalized =
    normalizeHomeownerProfessionalsResponse(
      response()
    );

  assert.equal(
    normalized.workedWith.length,
    1
  );

  assert.equal(
    normalized.saved.length,
    1
  );

  assert.equal(
    normalized.workedWith[0]
      .meetroRelationshipId,
    RELATIONSHIP_ID
  );

  assert.equal(
    normalized.saved[0]
      .savedProfessionalId,
    SAVED_ID
  );

  assert.equal(
    normalized.workedWith[0].saved,
    true
  );

  assert.equal(
    normalized.saved[0].workedWith,
    true
  );
});

test("My Professionals GET uses only canonical authenticated endpoint", async () => {
  const calls = [];

  const result =
    await listHomeownerProfessionals({
      fetcher: async (
        path,
        options
      ) => {
        calls.push({
          path,
          options,
        });

        return {
          response: {
            ok: true,
            status: 200,
          },
          data: response(),
        };
      },
    });

  assert.deepEqual(
    calls.map((call) => call.path),
    ["/my-professionals"]
  );

  assert.equal(
    calls[0].options.method,
    "GET"
  );

  assert.equal(
    calls[0].options.cache,
    "no-store"
  );

  assert.equal(
    result.workedWith[0].businessName,
    "BGone Construction"
  );
});

test("malformed My Professionals response fails closed", () => {
  assert.throws(
    () =>
      normalizeHomeownerProfessionalsResponse({
        success: true,
        workedWith: {},
        saved: [],
      }),
    HomeownerProfessionalsApiError
  );

  assert.throws(
    () =>
      normalizeHomeownerProfessionalsResponse({
        success: true,
        workedWith: [
          {
            meetroRelationshipId:
              "request-123",
            contractorProfileId: 80,
            professionalUserId: 9,
            businessName: "Unsafe",
            requestCount: 1,
            jobCount: 1,
            saved: false,
          },
        ],
        saved: [],
      }),
    HomeownerProfessionalsApiError
  );
});

test("Saved state alone does not manufacture Worked With authority", () => {
  const normalized =
    normalizeHomeownerProfessionalsResponse({
      success: true,
      workedWith: [],
      saved: [
        {
          savedProfessionalId: SAVED_ID,
          contractorProfileId: 81,
          professionalUserId: 10,
          businessName: "Saved Only",
          category: "Electrical",
          imageUrl: "",
          savedAt:
            "2026-09-19T10:00:00.000Z",
          workedWith: false,
        },
      ],
    });

  assert.equal(
    normalized.workedWith.length,
    0
  );

  assert.equal(
    normalized.saved.length,
    1
  );

  assert.equal(
    normalized.saved[0].workedWith,
    false
  );
});

test("Saved Professional command keys use exact UUID identity", () => {
  const key =
    createHomeownerProfessionalCommandKey({
      randomUUID: () =>
        "CCCCCCCC-CCCC-4CCC-8CCC-CCCCCCCCCCCC",
    });

  assert.equal(
    key,
    "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
  );
});

test("Save Professional uses canonical command endpoint and idempotency header", async () => {
  const calls = [];

  const result =
    await saveHomeownerProfessional({
      contractorProfileId: 80,
      commandKey:
        "11111111-1111-4111-8111-111111111111",
      fetcher: async (
        path,
        options
      ) => {
        calls.push({
          path,
          options,
        });

        return {
          response: {
            ok: true,
            status: 201,
          },
          data: {
            success: true,
            code:
              "HOMEOWNER_PROFESSIONAL_SAVED",
            savedProfessional: {
              savedProfessionalId:
                SAVED_ID,
              contractorProfileId: 80,
              businessName:
                "BGone Construction",
              category: "Handyman",
              imageUrl: "",
              status: "SAVED",
              savedAt:
                "2026-09-21T10:00:00.000Z",
              removedAt: null,
              version: 1,
            },
          },
        };
      },
    });

  assert.equal(
    calls.length,
    1
  );

  assert.equal(
    calls[0].path,
    "/my-professionals/80/save"
  );

  assert.equal(
    calls[0].options.method,
    "POST"
  );

  assert.equal(
    calls[0].options.headers[
      "Idempotency-Key"
    ],
    "11111111-1111-4111-8111-111111111111"
  );

  assert.equal(
    result.status,
    "SAVED"
  );
});

test("Remove Saved uses canonical command endpoint without changing Worked With authority", async () => {
  const calls = [];

  const result =
    await removeHomeownerSavedProfessional({
      contractorProfileId: 80,
      commandKey:
        "22222222-2222-4222-8222-222222222222",
      fetcher: async (
        path,
        options
      ) => {
        calls.push({
          path,
          options,
        });

        return {
          response: {
            ok: true,
            status: 200,
          },
          data: {
            success: true,
            code:
              "HOMEOWNER_PROFESSIONAL_REMOVED",
            savedProfessional: {
              savedProfessionalId:
                SAVED_ID,
              contractorProfileId: 80,
              businessName:
                "BGone Construction",
              category: "Handyman",
              imageUrl: "",
              status: "REMOVED",
              savedAt:
                "2026-09-19T10:00:00.000Z",
              removedAt:
                "2026-09-21T10:00:00.000Z",
              version: 2,
            },
          },
        };
      },
    });

  assert.equal(
    calls[0].path,
    "/my-professionals/80/remove"
  );

  assert.equal(
    result.status,
    "REMOVED"
  );

  const directory =
    normalizeHomeownerProfessionalsResponse(
      response()
    );

  assert.equal(
    directory.workedWith.length,
    1,
    "Saved mutation does not erase durable Worked With authority"
  );
});
