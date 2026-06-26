import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateDistanceMiles,
  getServiceAreaMatchSummary,
  matchesServiceArea,
} from "../src/utils/serviceAreaMatching.js";

test("matches the same zip using current fallback fields", () => {
  assert.equal(
    matchesServiceArea(
      { serviceZipCodes: "33904, 33914" },
      { zip: "33904" }
    ),
    true
  );
});

test("matches the same city using current fallback fields", () => {
  const summary = getServiceAreaMatchSummary(
    { serviceCities: ["Cape Coral", "Fort Myers"] },
    { city: "cape coral" }
  );

  assert.equal(summary.matched, true);
  assert.equal(summary.reason, "city_match");
});

test("blocks different city and zip fallback locations", () => {
  const summary = getServiceAreaMatchSummary(
    { serviceZipCodes: "33904", serviceCities: "Cape Coral" },
    { zip: "33101", city: "Miami" }
  );

  assert.equal(summary.matched, false);
  assert.equal(summary.reason, "location_mismatch");
});

test("matches coordinates within service radius", () => {
  const summary = getServiceAreaMatchSummary(
    {
      lat: 26.5629,
      lng: -81.9495,
      serviceRadiusMiles: 15,
    },
    {
      latitude: 26.6406,
      longitude: -81.8723,
    }
  );

  assert.equal(summary.matched, true);
  assert.equal(summary.method, "coordinates");
  assert.ok(summary.distanceMiles > 0);
  assert.ok(summary.distanceMiles <= 15);
});

test("blocks coordinates outside service radius", () => {
  const summary = getServiceAreaMatchSummary(
    {
      latitude: 26.5629,
      longitude: -81.9495,
      service_radius_miles: 5,
    },
    {
      lat: 25.7617,
      lng: -80.1918,
    }
  );

  assert.equal(summary.matched, false);
  assert.equal(summary.reason, "coordinate_radius_miss");
  assert.ok(summary.distanceMiles > 5);
});

test("missing location fails closed for marketplace exposure", () => {
  const summary = getServiceAreaMatchSummary(
    { serviceZipCodes: "33904" },
    { title: "Door repair" }
  );

  assert.equal(summary.matched, false);
  assert.equal(summary.reason, "missing_location");
  assert.equal(matchesServiceArea({}, { city: "Cape Coral" }), false);
});

test("explicit local demo safe records can bypass missing location", () => {
  const summary = getServiceAreaMatchSummary(
    { businessCategory: "handyman" },
    { title: "Demo request", localDemoSafe: true }
  );

  assert.equal(summary.matched, true);
  assert.equal(summary.reason, "local_demo_safe");
});

test("distance calculation is deterministic and uses miles", () => {
  const distance = calculateDistanceMiles(
    { latitude: 26.5629, longitude: -81.9495 },
    { latitude: 26.6406, longitude: -81.8723 }
  );

  assert.ok(distance > 6);
  assert.ok(distance < 8);
});

