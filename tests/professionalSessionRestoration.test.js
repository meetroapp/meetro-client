import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync("src/App.jsx", "utf8");
const dashboardSource = fs.readFileSync("src/pages/BusinessDashboard.jsx", "utf8");
const profileSource = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");

test("professional onboarding routing uses explicit backend ownership before legacy cache", () => {
  const gateStart = appSource.indexOf("const hasRequiredProfessionalSetupData");
  const gateEnd = appSource.indexOf("const shouldRouteToProfessionalOnboarding", gateStart);
  const gate = appSource.slice(gateStart, gateEnd);

  assert.ok(gateStart > -1 && gateEnd > gateStart);
  assert.ok(
    gate.indexOf("getExplicitBusinessProfileOwnership") <
      gate.indexOf("readBusinessServiceProfile")
  );
  assert.match(gate, /if \(explicitOwnership !== undefined\) return explicitOwnership/);
});

test("dashboard profile loading and failure never masquerade as onboarding", () => {
  const fetchStart = dashboardSource.indexOf("async function fetchProfile");
  const updateStart = dashboardSource.indexOf(
    "async function updateBusinessAvailability",
    fetchStart
  );
  const fetchBlock = dashboardSource.slice(fetchStart, updateStart);

  assert.match(fetchBlock, /setLoading\(true\)/);
  assert.match(fetchBlock, /setProfileLoadFailed\(false\)/);
  assert.match(fetchBlock, /setProfileLoadFailed\(true\)/);
  assert.doesNotMatch(fetchBlock, /professionalOnboarding/);
  assert.match(dashboardSource, /profileLoadFailed \|\| !profile/);
  assert.match(dashboardSource, /onClick=\{fetchProfile\}/);
});

test("Business Dashboard and Business Profile hydrate from the same authenticated endpoint", () => {
  const canonicalRead = /"\/my-contractor-profile",\s*\{ cache: "no-store" \}/;

  assert.match(dashboardSource, canonicalRead);
  assert.match(profileSource, canonicalRead);
  assert.match(dashboardSource, /profile\?\.business_name/);
  assert.match(dashboardSource, /profile\?\.business_category \|\|\s*profile\?\.category/);
});

test("Business Profile request failure preserves business mode and renders retry state", () => {
  const fetchStart = profileSource.indexOf("async function fetchMyProfile");
  const fillStart = profileSource.indexOf("function fillForm", fetchStart);
  const fetchBlock = profileSource.slice(fetchStart, fillStart);

  assert.match(fetchBlock, /setProfileLoadFailed\(false\)/);
  assert.match(fetchBlock, /setProfileLoadFailed\(true\)/);
  assert.doesNotMatch(fetchBlock, /setActiveAccountMode\("personal"\)/);
  assert.doesNotMatch(profileSource, /function lockBusinessAccess/);
  assert.match(profileSource, /profileLoadFailed \|\| !profile/);
  assert.match(profileSource, /onClick=\{fetchMyProfile\}/);
});
