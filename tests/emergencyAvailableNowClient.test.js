import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

import {
  EMERGENCY_API_ENDPOINTS,
  listHomeownerAvailableEmergencyProfessionals,
  normalizeHomeownerAvailableEmergencyProfessionalsResult,
  selectHomeownerAvailableEmergencyProfessional,
} from "../src/utils/emergencyApi.js";

import {
  normalizeEmergencyRelationshipDetail,
} from "../src/utils/emergencyRelationshipDetail.js";

const availableNowSource = readFileSync(
  new URL(
    "../src/components/EmergencyAvailableNow.jsx",
    import.meta.url
  ),
  "utf8"
);

const emergencyRequestSource = readFileSync(
  new URL(
    "../src/pages/EmergencyRequest.jsx",
    import.meta.url
  ),
  "utf8"
);

function transport(result) {
  const calls = [];

  return {
    calls,

    async authFetchImpl(
      endpoint,
      options,
      setPage
    ) {
      calls.push({
        endpoint,
        options,
        setPage,
      });

      return result;
    },
  };
}

function discoveryResult(
  professionals = [
    {
      contractorProfileId: 80,
      businessName: "Cape Electrical",
      category: "electrical",
      serviceSpecialties: [
        "electrical",
      ],
      profileImageUrl:
        "https://example.test/profile.jpg",
      serviceArea: "Cape Coral",
      availableNow: true,
      dispatchReady: true,
      streetAddress:
        "MUST NOT REACH CLIENT PROJECTION",
      phone:
        "MUST NOT REACH CLIENT PROJECTION",
      relationshipId: 999,
      conversationId: 888,
    },
  ]
) {
  return {
    response: {
      ok: true,
      status: 200,
    },
    data: {
      success: true,
      code:
        "EMERGENCY_AVAILABLE_PROFESSIONALS_FOUND",
      emergencyRequest: {
        id: 41,
        status:
          "ready_for_distribution",
      },
      professionals,
    },
  };
}

function selectionResult() {
  return {
    response: {
      ok: true,
      status: 200,
    },
    data: {
      success: true,
      code:
        "EMERGENCY_AVAILABLE_PROFESSIONAL_SELECTED",
      alreadySelected: false,
      declinedResponseCount: 2,
      emergencyRequest: {
        id: 41,
        status: "assigned",
        assignedAt:
          "2026-09-22T03:00:00.000Z",
      },
      relationship: {
        id: 51,
        emergencyRequestId: 41,
        status: "active",
        acceptedAt:
          "2026-09-22T03:00:00.000Z",
        conversationAvailable: true,
      },
      conversation: {
        id: 61,
        relationshipId: 51,
        status: "active",
      },
    },
  };
}

test(
  "Available Now uses the exact certified homeowner endpoints",
  () => {
    assert.equal(
      EMERGENCY_API_ENDPOINTS
        .availableProfessionals(41),
      "/emergency-requests/41/available-professionals"
    );

    assert.equal(
      EMERGENCY_API_ENDPOINTS
        .selectAvailableProfessional(
          41,
          80
        ),
      "/emergency-requests/41/available-professionals/80/select"
    );
  }
);

test(
  "Available Now discovery keeps only the certified safe professional projection",
  () => {
    const result =
      normalizeHomeownerAvailableEmergencyProfessionalsResult(
        discoveryResult()
      );

    assert.equal(result.ok, true);

    assert.deepEqual(
      Object.keys(result.professionals[0]),
      [
        "contractorProfileId",
        "businessName",
        "category",
        "serviceSpecialties",
        "profileImageUrl",
        "serviceArea",
        "availableNow",
        "dispatchReady",
      ]
    );

    assert.deepEqual(
      result.professionals[0],
      {
        contractorProfileId: 80,
        businessName: "Cape Electrical",
        category: "electrical",
        serviceSpecialties: [
          "electrical",
        ],
        profileImageUrl:
          "https://example.test/profile.jpg",
        serviceArea: "Cape Coral",
        availableNow: true,
        dispatchReady: true,
      }
    );

    assert.doesNotMatch(
      JSON.stringify(
        result.professionals
      ),
      /streetAddress|phone|relationshipId|conversationId/
    );
  }
);

test(
  "Available Now discovery fails closed for false standing availability authority",
  () => {
    for (const professional of [
      {
        contractorProfileId: 80,
        businessName: "Not Available",
        category: "electrical",
        serviceSpecialties: [
          "electrical",
        ],
        profileImageUrl: null,
        serviceArea: "Cape Coral",
        availableNow: false,
        dispatchReady: true,
      },
      {
        contractorProfileId: 80,
        businessName: "Not Direct Select",
        category: "electrical",
        serviceSpecialties: [
          "electrical",
        ],
        profileImageUrl: null,
        serviceArea: "Cape Coral",
        availableNow: true,
        dispatchReady: false,
      },
    ]) {
      const result =
        normalizeHomeownerAvailableEmergencyProfessionalsResult(
          discoveryResult([
            professional,
          ])
        );

      assert.equal(result.ok, false);
      assert.deepEqual(
        result.professionals,
        []
      );
    }
  }
);

test(
  "Available Now discovery is authenticated read-only transport",
  async () => {
    const browser = transport(
      discoveryResult()
    );

    const result =
      await listHomeownerAvailableEmergencyProfessionals(
        41,
        {
          authFetchImpl:
            browser.authFetchImpl,
        }
      );

    assert.equal(result.ok, true);
    assert.equal(
      result.professionals[0]
        .contractorProfileId,
      80
    );

    assert.equal(
      browser.calls[0].endpoint,
      "/emergency-requests/41/available-professionals"
    );

    assert.equal(
      browser.calls[0].options.method,
      "GET"
    );

    assert.equal(
      browser.calls[0].options.cache,
      "no-store"
    );
  }
);

test(
  "direct Available Now selection reuses canonical Emergency assignment normalization",
  async () => {
    const browser = transport(
      selectionResult()
    );

    const result =
      await selectHomeownerAvailableEmergencyProfessional(
        41,
        80,
        {
          authFetchImpl:
            browser.authFetchImpl,
        }
      );

    assert.equal(result.ok, true);
    assert.equal(
      result.emergencyRequest.status,
      "assigned"
    );
    assert.equal(
      result.relationship.status,
      "active"
    );
    assert.equal(
      result.conversation.id,
      61
    );

    assert.deepEqual(
      browser.calls[0],
      {
        endpoint:
          "/emergency-requests/41/available-professionals/80/select",
        options: {
          method: "POST",
          cache: "no-store",
          body: "{}",
        },
        setPage: undefined,
      }
    );
  }
);

test(
  "direct-selected relationship does not require a fabricated professional response",
  () => {
    const detail =
      normalizeEmergencyRelationshipDetail({
        emergencyRequest: {
          id: 41,
          title:
            "Emergency electrical service",
          description:
            "Partial power outage.",
          serviceSpecialty:
            "electrical",
          serviceDomain:
            "home_services",
          category:
            "home_repair",
          status: "assigned",
          hasSelectedProfessional: true,
          selectedProfessionalBusinessName:
            "Cape Electrical",
          assignedAt:
            "2026-09-22T03:00:00.000Z",
        },
        responses: [],
        conversationId: 61,
        language: "en",
      });

    assert.ok(detail);
    assert.deepEqual(
      detail.responseCards,
      []
    );
    assert.equal(
      detail.selectedProfessional
        .displayName,
      "Cape Electrical"
    );
    assert.equal(
      detail.conversation.available,
      true
    );
    assert.equal(
      detail.conversation.id,
      61
    );
  }
);

test(
  "Available Now presentation remains separate from Professional Responses and owns no authority",
  () => {
    assert.match(
      availableNowSource,
      /Find Emergency Help/
    );
    assert.match(
      availableNowSource,
      /Available Now/
    );
    assert.match(
      availableNowSource,
      /Choose Professional/
    );
    assert.match(
      availableNowSource,
      /Professional Responses/
    );
    assert.match(
      availableNowSource,
      /does not mean they already responded or are on the way/
    );

    assert.doesNotMatch(
      availableNowSource,
      /fetch\(|authFetch|axios|localStorage|sessionStorage|relationshipId|conversationId/
    );
  }
);

test(
  "canonical Emergency Request owns Available Now discovery and direct selection without reviving legacy screens",
  () => {
    assert.match(
      emergencyRequestSource,
      /listHomeownerAvailableEmergencyProfessionals/
    );
    assert.match(
      emergencyRequestSource,
      /selectHomeownerAvailableEmergencyProfessional/
    );
    assert.match(
      emergencyRequestSource,
      /<EmergencyAvailableNow/
    );
    assert.match(
      emergencyRequestSource,
      /listHomeownerEmergencyResponses/
    );
    assert.match(
      emergencyRequestSource,
      /selectHomeownerEmergencyResponse/
    );

    assert.doesNotMatch(
      emergencyRequestSource,
      /setPage\("emergencyBusinessSelection"\)/
    );
    assert.doesNotMatch(
      emergencyRequestSource,
      /setPage\("emergencyStatus"\)/
    );
  }
);
