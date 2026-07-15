import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DISCOVER_DIRECTORY_STATUS,
  createInitialDiscoverDirectoryState,
  createLoadingDiscoverDirectoryState,
  fetchDiscoverDirectory,
  parseDiscoverDirectoryPayload,
} from "../src/utils/discoverDirectoryState.js";
import { t } from "../src/utils/language.js";

const discoverSource = readFileSync(
  new URL("../src/pages/Discover.jsx", import.meta.url),
  "utf8"
);

function response(status, payload, jsonError = null) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      if (jsonError) throw jsonError;
      return payload;
    },
  };
}

const silentLogger = Object.freeze({ error() {} });

const canonicalProfile = Object.freeze({
  id: 7,
  business_name: "Canonical Repairs",
  category: "handyman",
  service_area: "Lee County",
  service_specialties: ["door_repair"],
  available_now: false,
  dispatch_ready: false,
  show_business_address_public: false,
});

test("initial and loading states cannot masquerade as confirmed empty", () => {
  assert.equal(createInitialDiscoverDirectoryState().status, DISCOVER_DIRECTORY_STATUS.IDLE);
  assert.equal(createLoadingDiscoverDirectoryState().status, DISCOVER_DIRECTORY_STATUS.LOADING);
  assert.notEqual(createInitialDiscoverDirectoryState().status, DISCOVER_DIRECTORY_STATUS.EMPTY);
  assert.notEqual(createLoadingDiscoverDirectoryState().status, DISCOVER_DIRECTORY_STATUS.EMPTY);
});

test("valid results and confirmed empty are distinguished", () => {
  const populated = parseDiscoverDirectoryPayload({ profiles: [canonicalProfile] });
  const empty = parseDiscoverDirectoryPayload({ profiles: [] });
  assert.equal(populated.status, DISCOVER_DIRECTORY_STATUS.RESULTS);
  assert.equal(populated.records[0].business_name, "Canonical Repairs");
  assert.equal(empty.status, DISCOVER_DIRECTORY_STATUS.EMPTY);
  assert.deepEqual(empty.records, []);
});

test("canonical projection omits unsupported rating, verification, review, and distance fields", () => {
  const result = parseDiscoverDirectoryPayload({
    profiles: [{
      ...canonicalProfile,
      rating: "5.0",
      verified: true,
      reviewCount: 99,
      distance: "Nearby",
      availability: "Available today",
    }],
  });
  assert.equal(result.status, DISCOVER_DIRECTORY_STATUS.RESULTS);
  for (const field of ["rating", "verified", "reviewCount", "distance", "availability"] ) {
    assert.equal(Object.hasOwn(result.records[0], field), false, field);
  }
});

test("unauthorized, unavailable, non-OK, network, and malformed responses remain distinct", async () => {
  const cases = [
    [response(401, {}), DISCOVER_DIRECTORY_STATUS.UNAUTHORIZED],
    [response(403, {}), DISCOVER_DIRECTORY_STATUS.UNAUTHORIZED],
    [response(404, {}), DISCOVER_DIRECTORY_STATUS.UNAVAILABLE],
    [response(501, {}), DISCOVER_DIRECTORY_STATUS.UNAVAILABLE],
    [response(500, {}), DISCOVER_DIRECTORY_STATUS.FAILED],
    [response(200, { profiles: "not-an-array" }), DISCOVER_DIRECTORY_STATUS.FAILED],
    [response(200, null, new Error("invalid json")), DISCOVER_DIRECTORY_STATUS.FAILED],
  ];
  for (const [fetchResponse, expectedStatus] of cases) {
    const result = await fetchDiscoverDirectory({
      apiUrl: "https://api.example.test",
      fetchImpl: async () => fetchResponse,
      logger: silentLogger,
    });
    assert.equal(result.status, expectedStatus);
    assert.notEqual(result.status, DISCOVER_DIRECTORY_STATUS.EMPTY);
  }
  const network = await fetchDiscoverDirectory({
    apiUrl: "https://api.example.test",
    fetchImpl: async () => {
      throw new Error("offline");
    },
    logger: silentLogger,
  });
  assert.equal(network.status, DISCOVER_DIRECTORY_STATUS.FAILED);
  assert.equal(network.errorCode, "NETWORK_FAILURE");
});

test("retry can recover without retaining stale authority", async () => {
  const responses = [
    response(503, {}),
    response(200, { profiles: [canonicalProfile] }),
    response(200, { profiles: [] }),
  ];
  const fetchImpl = async () => responses.shift();
  const request = () => fetchDiscoverDirectory({
    apiUrl: "https://api.example.test",
    fetchImpl,
    logger: silentLogger,
  });
  const failed = await request();
  const recovered = await request();
  const confirmedEmpty = await request();
  assert.equal(failed.status, DISCOVER_DIRECTORY_STATUS.FAILED);
  assert.deepEqual(failed.records, []);
  assert.equal(recovered.status, DISCOVER_DIRECTORY_STATUS.RESULTS);
  assert.equal(confirmedEmpty.status, DISCOVER_DIRECTORY_STATUS.EMPTY);
});

test("Discover uses the public directory and cannot project device-local businesses", () => {
  assert.match(discoverSource, /fetchDiscoverDirectory/);
  assert.match(discoverSource, /DISCOVER_DIRECTORY_STATUS/);
  assert.doesNotMatch(discoverSource, /authFetch\(\s*["']\/posts["']/);
  assert.doesNotMatch(discoverSource, /meetroBusinesses|businessRating|getLocalContractorProfile|getSavedBusinesses/);
  assert.doesNotMatch(discoverSource, /["']5\.0["']/);
  assert.doesNotMatch(discoverSource, /getBusinessVerificationProjection|getBusinessPortfolioProofProjection/);
});

test("Discover renders truthful source states and retry without losing search state", () => {
  assert.match(discoverSource, /createInitialDiscoverDirectoryState/);
  assert.match(discoverSource, /createLoadingDiscoverDirectoryState/);
  for (const status of [
    "RESULTS",
    "EMPTY",
    "UNAUTHORIZED",
    "FAILED",
    "UNAVAILABLE",
  ]) {
    assert.match(discoverSource, new RegExp(`DISCOVER_DIRECTORY_STATUS\\.${status}`));
  }
  assert.match(discoverSource, /retryDiscoverDirectory/);
  assert.match(discoverSource, /value=\{searchQuery\}/);
  assert.match(discoverSource, /communityDirectoryFilteredEmptyTitle/);
});

test("malformed and request failures log only safe diagnostic context", async () => {
  const calls = [];
  const logger = { error(message, context) { calls.push([message, context]); } };
  const privatePayload = { profiles: "invalid", secret: "must-not-be-logged" };

  await fetchDiscoverDirectory({
    apiUrl: "https://api.example.test",
    fetchImpl: async () => response(200, privatePayload),
    logger,
  });

  assert.deepEqual(calls, [[
    "Discover directory request failed",
    { errorCode: "MALFORMED_RESPONSE", status: 200 },
  ]]);
  assert.doesNotMatch(JSON.stringify(calls), /must-not-be-logged/);
});

test("truthful directory states are localized in every supported public language", () => {
  const keys = [
    "communityDirectoryLoadingTitle",
    "communityDirectoryEmptyTitle",
    "communityDirectoryFilteredEmptyTitle",
    "communityDirectoryUnauthorizedTitle",
    "communityDirectoryFailedTitle",
    "communityDirectoryUnavailableTitle",
    "communityDirectoryRetry",
    "communitySpotlightUnavailableTitle",
  ];

  for (const language of ["en", "es", "fr", "pt"]) {
    for (const key of keys) {
      assert.notEqual(t(key, language), key, `${language}:${key}`);
    }
  }
});
