import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("Spotlight does not hydrate public media from browser-local portfolio state", () => {
  const home = read("src/pages/Home.jsx");

  assert.match(home, /function getLocalSpotlightBusinesses\(\) \{\s*return \[\];\s*\}/);
  assert.doesNotMatch(home, /readAllBusinessPortfolioItems/);
  assert.doesNotMatch(home, /persistBusinessPortfolioProjects/);
});

test("Project Gallery does not publish or cache projects through localStorage", () => {
  const gallery = read("src/pages/ProjectGallery.jsx");

  assert.doesNotMatch(gallery, /persistBusinessPortfolioProjects/);
  assert.doesNotMatch(gallery, /persistPortfolioForSpotlight/);
  assert.doesNotMatch(gallery, /persistBusinessProfileShareRecord/);
  assert.match(gallery, /function toggleProjectSpotlight\(\) \{\s*setPhotoError/);
  assert.match(gallery, /function viewPublicPortfolio\(\) \{\s*setPhotoError/);
});

test("Business Profile proof does not read browser-local portfolio records", () => {
  const profile = read("src/pages/ContractorProfile.jsx");

  assert.doesNotMatch(profile, /readBusinessPortfolioStorage/);
  assert.match(profile, /const profilePortfolioProjects = \[\];/);
});

test("governed Personal Profile media path remains intact", () => {
  const profileMedia = read("src/utils/personalProfilePhoto.js");

  assert.match(profileMedia, /\/media\/upload-signature/);
  assert.match(profileMedia, /\/auth\/profile-photo/);
  assert.match(profileMedia, /VITE_ENABLE_PERSONAL_PROFILE_MEDIA/);
});

test("governed Business Logo media path remains logo-only", () => {
  const logoMedia = read("src/utils/businessProfileLogo.js");

  assert.match(logoMedia, /\/media\/upload-signature/);
  assert.match(logoMedia, /\/contractor-profile\/logo/);
  assert.match(logoMedia, /business-logo/);
  assert.match(logoMedia, /VITE_ENABLE_BUSINESS_LOGO_MEDIA/);
  assert.doesNotMatch(logoMedia, /business-cover|portfolio|message|moment/i);
});
