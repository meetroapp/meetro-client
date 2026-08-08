import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const uploadSource = readFileSync(
  new URL("../src/pages/Upload.jsx", import.meta.url),
  "utf8"
);

test("Request Help uses a desktop workspace shell with one sidebar offset", () => {
  assert.match(
    uploadSource,
    /className="app-page request-help-page upload-page meetro-form-page meetro-visual-page"/
  );
  assert.match(uploadSource, /const requestHelpLayoutStyles = `/);
  assert.match(
    uploadSource,
    /#root\[data-app-layout="desktop"\] \.app-page\.request-help-page\.meetro-form-page/
  );
  assert.match(uploadSource, /contain: none !important;/);
  assert.match(
    uploadSource,
    /width: calc\(100vw - var\(--meetro-sidebar-width\)\) !important;/
  );
  assert.match(
    uploadSource,
    /margin-left: var\(--meetro-sidebar-width\) !important;/
  );
  assert.equal(
    (uploadSource.match(/margin-left: var\(--meetro-sidebar-width\) !important;/g) || [])
      .length,
    1
  );
});

test("Request Help keeps the conversational workspace centered in the available workspace", () => {
  assert.match(uploadSource, /className="request-help-content-lane"/);
  assert.match(uploadSource, /className="job-request-conversation-workspace"/);
  assert.match(
    uploadSource,
    /maxWidth: "min\(1120px, 100%\)"/
  );
  assert.match(
    uploadSource,
    /max-width: min\(1120px, 100%\) !important;/
  );
  assert.match(
    uploadSource,
    /grid-template-columns: minmax\(0, 1\.45fr\) minmax\(300px, 0\.8fr\);/
  );
  assert.match(uploadSource, /margin-left: auto !important;/);
  assert.match(uploadSource, /margin-right: auto !important;/);
});

test("Request Help preserves mobile padding and bottom navigation clearance", () => {
  assert.match(uploadSource, /@media \(max-width: 1099px\)/);
  assert.match(
    uploadSource,
    /padding-left: max\(18px, env\(safe-area-inset-left, 0px\)\) !important;/
  );
  assert.match(
    uploadSource,
    /padding-right: max\(18px, env\(safe-area-inset-right, 0px\)\) !important;/
  );
  assert.match(
    uploadSource,
    /padding-bottom: calc\(168px \+ env\(safe-area-inset-bottom, 0px\)\) !important;/
  );
  assert.match(uploadSource, /\.request-help-manual-form \{/);
  assert.match(uploadSource, /scroll-margin-bottom: calc\(176px \+ env\(safe-area-inset-bottom, 0px\)\);/);
  assert.match(uploadSource, /const requestActionBar = \{[\s\S]*position: "relative"/);
  assert.match(uploadSource, /<BottomNav setPage=\{setPage\} currentPage="upload" \/>/);
});

test("Request Help layout keeps governed media behind the request-photo policy", () => {
  assert.match(uploadSource, /isFriendsAndFamilyMediaDeferred\(\)/);
  assert.match(uploadSource, /isRequestPhotoUploadEnabled\(\)/);
  assert.match(uploadSource, /disabled=\{mediaUploadDeferred \|\| uploading \|\| creating\}/);
  assert.match(uploadSource, /uploadRequestPhotos/);
  assert.match(uploadSource, /requestPhotoPayload,/);
  assert.match(uploadSource, /setDraftSubmissionSnapshot\(/);
  assert.match(uploadSource, /setDraftUploadedMedia\(current, uploadedRequestPhotos\.photos\)/);
  assert.match(
    uploadSource,
    /governedUploadEnabled: requestPhotoUploadEnabled/
  );
  assert.doesNotMatch(uploadSource, /upload_preset/);
  assert.doesNotMatch(uploadSource, /api\.cloudinary\.com/);
});

test("Request Help reads selected files before clearing the file input", () => {
  const handlerStart = uploadSource.indexOf("function handleImageUpload(event)");
  const filesRead = uploadSource.indexOf(
    "const files = Array.from(event.target.files || []);",
    handlerStart
  );
  const inputClear = uploadSource.indexOf("event.target.value = \"\";", filesRead);

  assert.notEqual(handlerStart, -1);
  assert.notEqual(filesRead, -1);
  assert.notEqual(inputClear, -1);
  assert.ok(filesRead < inputClear);
});

test("Request Help exposes bounded photo reorder controls", () => {
  assert.match(uploadSource, /reorderDraftPhotos/);
  assert.match(uploadSource, /moveSelectedRequestPhoto\(index, -1\)/);
  assert.match(uploadSource, /moveSelectedRequestPhoto\(index, 1\)/);
  assert.match(uploadSource, /disabled=\{index === 0\}/);
  assert.match(uploadSource, /disabled=\{index === projectPhotos\.length - 1\}/);
  assert.match(uploadSource, /height: "44px"/);
});

test("Request Help exposes semantic labels, status messages, and mobile touch targets", () => {
  assert.match(uploadSource, /<form[\s\S]*onSubmit=\{handleCreatePost\}/);
  assert.match(uploadSource, /<h1 style=\{requestPageTitle\}>/);
  assert.match(uploadSource, /htmlFor="request-service-search"/);
  assert.match(uploadSource, /htmlFor="job-request-category"/);
  assert.match(uploadSource, /const broadCategorySelect = \{[\s\S]*width: "100%"[\s\S]*minHeight: "48px"/);
  assert.match(uploadSource, /htmlFor="request-title"/);
  assert.match(uploadSource, /htmlFor="request-description"/);
  assert.match(uploadSource, /htmlFor="request-location"/);
  assert.match(uploadSource, /aria-invalid=\{Boolean\(fieldErrors\.title\)\}/);
  assert.match(uploadSource, /role="alert" aria-live="assertive"/);
  assert.match(uploadSource, /const changeServiceButton = \{[\s\S]*minHeight: "44px"/);
  assert.match(uploadSource, /const removePhotoButton = \{[\s\S]*width: "44px"[\s\S]*height: "44px"/);
});

test("Request Help accepts only canonical backend success and blocks duplicate taps", () => {
  assert.match(uploadSource, /if \(submissionAttemptRef\.current\) return;/);
  assert.match(uploadSource, /submissionAttemptRef\.current = true;/);
  assert.match(uploadSource, /getCanonicalJobRequestPost\(result\)/);
  assert.match(uploadSource, /"Idempotency-Key": submissionIntentKey/);
  assert.match(uploadSource, /if \(canonicalPost\)/);
  assert.doesNotMatch(uploadSource, /data\.post\.id \|\| Date\.now\(\)/);
  assert.doesNotMatch(uploadSource, /localStorage\.setItem\(\s*["']homeownerRequests["']/);
  assert.doesNotMatch(uploadSource, /localDemoSafe/);
});

test("Request Help validates location and matching metadata before upload", () => {
  const validationPosition = uploadSource.indexOf("validateRequestHelpSubmission({");
  const uploadPosition = uploadSource.indexOf("await uploadRequestPhotos({");

  assert.notEqual(validationPosition, -1);
  assert.notEqual(uploadPosition, -1);
  assert.ok(validationPosition < uploadPosition);
  assert.match(uploadSource, /serviceDomain: selectedService\?\.serviceDomain/);
  assert.match(uploadSource, /serviceSpecialty: selectedService\?\.serviceSpecialty/);
  assert.match(uploadSource, /id="request-location"/);
  assert.match(uploadSource, /maxLength=\{500\}/);
});
