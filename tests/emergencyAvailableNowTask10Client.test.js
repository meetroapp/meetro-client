import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(
    new URL(path, import.meta.url),
    "utf8"
  );
}

const availableNowSource = source(
  "../src/components/EmergencyAvailableNow.jsx"
);

const emergencyRequestSource = source(
  "../src/pages/EmergencyRequest.jsx"
);

const contractorDetailsSource = source(
  "../src/pages/ContractorDetails.jsx"
);

const availabilitySource = source(
  "../src/pages/BusinessAvailability.jsx"
);

const dashboardSource = source(
  "../src/pages/BusinessDashboard.jsx"
);

const legacySettingsSource = source(
  "../src/pages/EmergencyBusinessSettings.jsx"
);

test(
  "Available Now exposes View Profile separately from Choose Professional",
  () => {
    assert.match(
      availableNowSource,
      /onViewProfile/
    );

    assert.match(
      availableNowSource,
      /View Profile/
    );

    assert.match(
      availableNowSource,
      /Choose Professional/
    );

    assert.doesNotMatch(
      availableNowSource,
      /authFetch|fetch\(|localStorage/
    );
  }
);

test(
  "Emergency profile handoff uses exact profileId and preserves the Emergency request route",
  () => {
    assert.match(
      emergencyRequestSource,
      /contractorDetails\?profileId=/
    );

    assert.match(
      emergencyRequestSource,
      /returnPage=/
    );

    assert.doesNotMatch(
      emergencyRequestSource,
      /localStorage/
    );

    assert.match(
      emergencyRequestSource,
      /buildEmergencyRequestRoute\(\s*canonicalRequestId/
    );

    assert.match(
      emergencyRequestSource,
      /onViewProfile/
    );
  }
);

test(
  "Contractor Details accepts a canonical Emergency request return route",
  () => {
    assert.match(
      contractorDetailsSource,
      /parseEmergencyRequestRoute/
    );

    assert.match(
      contractorDetailsSource,
      /getLinkedReturnPage/
    );

    assert.match(
      contractorDetailsSource,
      /emergencyReturn\.valid/
    );

    assert.match(
      contractorDetailsSource,
      /emergencyReturn\.hasRequestId/
    );

    assert.match(
      contractorDetailsSource,
      /setPage\(returnPage\)/
    );
  }
);

test(
  "Availability screen uses Business Profile as Available Now and direct-selection authority",
  () => {
    assert.match(
      availabilitySource,
      /"\/my-contractor-profile"/
    );

    assert.match(
      availabilitySource,
      /buildBusinessProfilePayloadFromCanonical/
    );

    assert.match(
      availabilitySource,
      /available_now/
    );

    assert.match(
      availabilitySource,
      /dispatch_ready/
    );

    assert.match(
      availabilitySource,
      /Allow Direct Emergency Selection/
    );

    assert.match(
      availabilitySource,
      /readBusinessAvailability/
    );

    assert.doesNotMatch(
      availabilitySource,
      /useState\(\s*readBusinessAvailability/
    );

    assert.doesNotMatch(
      availabilitySource,
      /setAvailableNow\(\s*readBusinessAvailability/
    );

    assert.doesNotMatch(
      availabilitySource,
      /localStorage\.getItem\(\s*"meetroDispatchReady"/
    );
  }
);

test(
  "Business Dashboard restores and writes canonical dispatch_ready",
  () => {
    assert.match(
      dashboardSource,
      /backendProfile\.dispatch_ready === true/
    );

    assert.match(
      dashboardSource,
      /updateDispatchReady/
    );

    assert.match(
      dashboardSource,
      /dispatch_ready:\s*nextValue/
    );

    assert.match(
      dashboardSource,
      /Allow Direct Emergency Selection/
    );
  }
);

test(
  "legacy Emergency settings remain isolated compatibility state",
  () => {
    assert.match(
      legacySettingsSource,
      /businessEmergencyDispatchFee/
    );

    assert.doesNotMatch(
      availabilitySource,
      /EmergencyBusinessSettings/
    );

    assert.doesNotMatch(
      dashboardSource,
      /EmergencyBusinessSettings/
    );
  }
);
