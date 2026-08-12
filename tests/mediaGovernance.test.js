import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("Spotlight does not hydrate public media from browser-local portfolio state", () => {
  const home = read("src/pages/Home.jsx");
  const canonicalDirectory = read("src/utils/spotlightPortfolioDirectory.js");

  assert.match(home, /fetchCanonicalSpotlightBusinesses/);
  assert.match(canonicalDirectory, /fetchDiscoverDirectory/);
  assert.match(canonicalDirectory, /\/contractor-projects\/\$\{encodeURIComponent\(/);
  assert.doesNotMatch(home, /readAllBusinessPortfolioItems/);
  assert.doesNotMatch(home, /persistBusinessPortfolioProjects/);
  assert.doesNotMatch(home, /meetroSpotlightPortfolioFetchCache/);
  assert.doesNotMatch(canonicalDirectory, /localStorage|sessionStorage|my-contractor-projects/);
});

test("Project Gallery does not publish or cache projects through localStorage", () => {
  const gallery = read("src/pages/ProjectGallery.jsx");

  assert.doesNotMatch(gallery, /persistBusinessPortfolioProjects/);
  assert.doesNotMatch(gallery, /persistPortfolioForSpotlight/);
  assert.doesNotMatch(gallery, /persistBusinessProfileShareRecord/);
  assert.doesNotMatch(gallery, /toggleProjectSpotlight|viewPublicPortfolio/);
  assert.match(gallery, /isPortfolioActionAllowed/);
  assert.match(gallery, /\/my-contractor-projects/);
  assert.doesNotMatch(gallery, /readBusinessPortfolioStorage|readAllBusinessPortfolioItems/);
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

test("governed Request Help media path uses request-photo only", () => {
  const requestMedia = read("src/utils/requestPhotoMedia.js");
  const upload = read("src/pages/Upload.jsx");

  assert.match(requestMedia, /REQUEST_PHOTO_PURPOSE = "request-photo"/);
  assert.match(requestMedia, /VITE_ENABLE_REQUEST_PHOTO_MEDIA/);
  assert.match(requestMedia, /\/media\/upload-signature/);
  assert.match(requestMedia, /\/media\/request-photo\/cleanup/);
  assert.match(upload, /uploadRequestPhotos/);
  assert.match(upload, /requestPhotoPayload,/);
  assert.match(upload, /setDraftSubmissionSnapshot\(/);
  assert.match(upload, /setDraftUploadedMedia\(current, uploadedRequestPhotos\.photos\)/);
  assert.match(upload, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.doesNotMatch(upload, /image_url: projectPhotos|image_url: imageUrl/);
  assert.doesNotMatch(upload, /readAsDataURL|new FileReader/);
  assert.doesNotMatch(requestMedia, /business-cover|portfolio|message|moment|spotlight/i);
});
