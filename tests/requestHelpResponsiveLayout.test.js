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

test("Request Help keeps the form centered in the available workspace", () => {
  assert.match(uploadSource, /className="request-help-content-lane"/);
  assert.match(
    uploadSource,
    /maxWidth: "var\(--meetro-layout-form-max, 860px\)"/
  );
  assert.match(
    uploadSource,
    /max-width: min\(var\(--meetro-layout-form-max, 860px\), 100%\) !important;/
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
    /padding-bottom: calc\(88px \+ env\(safe-area-inset-bottom, 0px\)\) !important;/
  );
  assert.match(uploadSource, /<BottomNav setPage=\{setPage\} currentPage="upload" \/>/);
});

test("Request Help layout keeps governed media behind the request-photo policy", () => {
  assert.match(uploadSource, /isFriendsAndFamilyMediaDeferred\(\)/);
  assert.match(uploadSource, /isRequestPhotoUploadEnabled\(\)/);
  assert.match(uploadSource, /disabled=\{mediaUploadDeferred \|\| uploading \|\| creating\}/);
  assert.match(uploadSource, /uploadRequestPhotos/);
  assert.match(uploadSource, /request_photos: requestPhotoPayload/);
  assert.doesNotMatch(uploadSource, /upload_preset/);
  assert.doesNotMatch(uploadSource, /api\.cloudinary\.com/);
});
