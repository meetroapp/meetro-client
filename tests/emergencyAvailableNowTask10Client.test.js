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

const emergencyRelationshipSource = source(
  "../src/components/EmergencyRelationshipDetail.jsx"
);

const globalStylesSource = source(
  "../src/index.css"
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


test(
  "Find Help positions Available Now at the viewport once per ready-for-distribution entry",
  () => {
    assert.match(
      emergencyRequestSource,
      /findHelpSectionRef/
    );

    assert.match(
      emergencyRequestSource,
      /findHelpScrollKeyRef/
    );

    assert.match(
      emergencyRequestSource,
      /canonicalRequestId[\s\S]*shouldLoadAvailableNow[\s\S]*findHelpSectionRef\.current[\s\S]*scrollIntoView/
    );

    assert.match(
      emergencyRequestSource,
      /ready_for_distribution/
    );

    assert.match(
      emergencyRequestSource,
      /scrollMarginTop/
    );
  }
);


test(
  "Emergency Find Help uses the real post-sidebar Meetro workspace and preserves native phone classification",
  () => {
    const emergencyCssStart =
      globalStylesSource.indexOf(
        "Emergency Find Help responsive presentation"
      );

    const emergencyCssEnd =
      globalStylesSource.indexOf(
        ".meetro-selected-card {",
        emergencyCssStart
      );

    assert.ok(
      emergencyCssStart >= 0,
      "Emergency responsive CSS marker must exist"
    );

    assert.ok(
      emergencyCssEnd > emergencyCssStart,
      "Emergency responsive CSS block must have a bounded end"
    );

    const emergencyResponsiveStyles =
      globalStylesSource.slice(
        emergencyCssStart,
        emergencyCssEnd
      );

    assert.match(
      emergencyRequestSource,
      /meetro-wide-page emergency-page emergency-find-help-page/
    );

    assert.match(
      emergencyRequestSource,
      /app-page meetro-form-page/
    );

    assert.match(
      emergencyRequestSource,
      /emergency-find-help-main/
    );

    assert.match(
      emergencyRequestSource,
      /emergency-find-help-layout/
    );

    assert.match(
      emergencyRelationshipSource,
      /emergency-find-help-relationship/
    );

    assert.match(
      emergencyResponsiveStyles,
      /container-type:\s*inline-size/
    );

    assert.match(
      emergencyResponsiveStyles,
      /container-name:\s*emergency-find-help/
    );

    assert.match(
      emergencyResponsiveStyles,
      /@container emergency-find-help \(min-width:\s*700px\)/
    );

    assert.match(
      emergencyResponsiveStyles,
      /#root:not\(\[data-app-layout="mobile"\]\)[\s\S]*\.emergency-find-help-layout/
    );

    assert.match(
      emergencyResponsiveStyles,
      /@container emergency-find-help \(min-width:\s*900px\)/
    );

    assert.match(
      emergencyResponsiveStyles,
      /#root\[data-app-layout="desktop"\]/
    );

    assert.match(
      emergencyResponsiveStyles,
      /flex:\s*1\.25 1 0/
    );

    assert.doesNotMatch(
      emergencyResponsiveStyles,
      /max-width:\s*1180px/
    );

    assert.doesNotMatch(
      emergencyResponsiveStyles,
      /@media\s*\(min-width:\s*900px\)/
    );

    assert.doesNotMatch(
      emergencyResponsiveStyles,
      /data-app-layout="tablet"\]\[data-app-orientation="landscape"/
    );
  }
);


test(
  "Emergency Find Help top half uses current Meetro icons, semantic tokens, and compact 44px actions",
  () => {
    assert.match(
      availableNowSource,
      /import MeetroIcon from "\.\/MeetroIcon"/
    );

    assert.match(
      availableNowSource,
      /name="availableNow"/
    );

    assert.match(
      availableNowSource,
      /name="location"/
    );

    assert.match(
      availableNowSource,
      /name="customerRelationships"/
    );

    assert.match(
      availableNowSource,
      /gridTemplateColumns:\s*"minmax\(0, \.9fr\) minmax\(0, 1\.1fr\)"/
    );

    assert.match(
      availableNowSource,
      /minHeight:\s*"44px"/
    );

    assert.match(
      availableNowSource,
      /var\(--meetro-color-forest, #0B5D3B\)/
    );

    assert.match(
      availableNowSource,
      /var\(--meetro-color-purple, #8B5CF6\)/
    );

    assert.match(
      emergencyRequestSource,
      /import MeetroIcon from "\.\.\/components\/MeetroIcon"/
    );

    assert.match(
      emergencyRequestSource,
      /details:\s*"messages"/
    );

    assert.match(
      emergencyRequestSource,
      /safety:\s*"trust"/
    );

    assert.match(
      emergencyRequestSource,
      /find:\s*"availableNow"/
    );

    assert.match(
      emergencyRequestSource,
      /connected:\s*"fastResponse"/
    );

    assert.match(
      emergencyRequestSource,
      /gridTemplateColumns:\s*"repeat\(4, minmax\(0, 1fr\)\)"/
    );

    assert.match(
      emergencyRequestSource,
      /calc\(96px \+ env\(safe-area-inset-bottom/
    );
  }
);


test(
  "compact Emergency timeline CSS remains scoped to Find Help",
  () => {
    const emergencyCssStart =
      globalStylesSource.indexOf(
        "Emergency Find Help responsive presentation"
      );

    const emergencyCssEnd =
      globalStylesSource.indexOf(
        ".meetro-selected-card {",
        emergencyCssStart
      );

    assert.ok(emergencyCssStart >= 0);
    assert.ok(emergencyCssEnd > emergencyCssStart);

    const emergencyResponsiveStyles =
      globalStylesSource.slice(
        emergencyCssStart,
        emergencyCssEnd
      );

    assert.match(
      emergencyResponsiveStyles,
      /\.emergency-find-help-page[\s\S]*\.emergency-timeline-grid/
    );

    assert.doesNotMatch(
      emergencyResponsiveStyles,
      /(?:^|\n)\.emergency-timeline-grid\s*\{/
    );

    assert.match(
      emergencyResponsiveStyles,
      /#root\[data-app-layout="mobile"\][\s\S]*\.emergency-find-help-page[\s\S]*\.emergency-timeline-grid/
    );
  }
);
