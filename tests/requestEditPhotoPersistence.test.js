import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REQUEST_PHOTO_MAX_COUNT,
  validateRequestPhotoFiles,
} from "../src/utils/requestPhotoMedia.js";
import {
  REQUEST_EDIT_LEGACY_PHOTO_RESOLUTION_REQUIRED,
  buildRequestPhotoReplacementPayload,
  createLocalRequestPhotoItem,
  getPendingLocalRequestPhotoItems,
  hydrateRequestEditPhotos,
  removeRequestEditPhotoAt,
  reorderRequestEditPhotos,
  revokeLocalRequestEditPhotoPreviews,
} from "../src/utils/requestEditPhotoState.js";

const myRequestsPageSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);
const modificationPanelSource = readFileSync(
  new URL("../src/components/HomeownerRequestModificationPanel.jsx", import.meta.url),
  "utf8"
);
const editFormSource = readFileSync(
  new URL("../src/components/HomeownerRequestEditForm.jsx", import.meta.url),
  "utf8"
);
const myRequestsSource = `${myRequestsPageSource}\n${modificationPanelSource}\n${editFormSource}`;

function media(index = 1, overrides = {}) {
  return {
    purpose: "request-photo",
    public_id: `meetro/production/users/7/request-photos/photo-${index}`,
    secure_url:
      `https://res.cloudinary.com/test-cloud/image/upload/v172000000${index}/meetro/production/users/7/request-photos/photo-${index}.jpg`,
    resource_type: "image",
    format: "jpg",
    bytes: 1024 + index,
    width: 640,
    height: 480,
    version: 1720000000 + index,
    uploaded_at: "2026-07-19T18:00:00.000Z",
    created_by_user_id: 7,
    lifecycle_state: "attached",
    ...overrides,
  };
}

function imageFile({
  name = "request.jpg",
  type = "image/jpeg",
  size = 1024,
} = {}) {
  return new File([new Uint8Array(size)], name, { type });
}

test("Request Edit hydrates existing request_photos with full governed metadata", () => {
  const requestPhotos = [
    media(2, { display_order: 0, custom_trace: "preserved" }),
    media(1, { display_order: 1 }),
  ];
  const hydrated = hydrateRequestEditPhotos({
    request_photos: requestPhotos,
    photos: ["https://example.test/fallback.jpg"],
  });

  assert.equal(hydrated.length, 2);
  assert.deepEqual(
    hydrated.map((photo) => photo.media.public_id),
    [
      "meetro/production/users/7/request-photos/photo-2",
      "meetro/production/users/7/request-photos/photo-1",
    ]
  );
  assert.equal(hydrated[0].media.custom_trace, "preserved");
  assert.notEqual(hydrated[0].media, requestPhotos[0]);
  assert.equal(hydrated.some((photo) => photo.displayOnly), false);
});

test("Request Edit URL-only fallback photos remain display-only and are not promoted", () => {
  const hydrated = hydrateRequestEditPhotos({
    photos: ["https://example.test/legacy.jpg"],
    image_url: "https://example.test/legacy.jpg",
  });
  const replacement = buildRequestPhotoReplacementPayload(hydrated);

  assert.equal(hydrated.length, 1);
  assert.equal(hydrated[0].displayOnly, true);
  assert.equal(hydrated[0].media, undefined);
  assert.equal(replacement.ok, false);
  assert.equal(replacement.code, REQUEST_EDIT_LEGACY_PHOTO_RESOLUTION_REQUIRED);
  assert.equal(Object.hasOwn(replacement, "request_photos"), false);
});

test("Request Edit fails closed for mixed legacy plus local or canonical photos", () => {
  const legacy = hydrateRequestEditPhotos({
    photos: ["https://example.test/legacy.jpg"],
  })[0];
  const local = createLocalRequestPhotoItem({
    id: "preview-local",
    file: { name: "local.jpg", type: "image/jpeg", size: 1024 },
    url: "blob:local",
    revoke() {},
  });
  const canonical = hydrateRequestEditPhotos({
    request_photos: [media(4, { display_order: 0 })],
  })[0];

  const legacyPlusLocal = buildRequestPhotoReplacementPayload([legacy, local], {
    uploadedMediaByItemId: new Map([[local.id, media(5)]]),
  });
  const legacyPlusCanonical = buildRequestPhotoReplacementPayload([
    canonical,
    legacy,
  ]);

  assert.equal(legacyPlusLocal.ok, false);
  assert.equal(
    legacyPlusLocal.code,
    REQUEST_EDIT_LEGACY_PHOTO_RESOLUTION_REQUIRED
  );
  assert.equal(legacyPlusCanonical.ok, false);
  assert.equal(
    legacyPlusCanonical.code,
    REQUEST_EDIT_LEGACY_PHOTO_RESOLUTION_REQUIRED
  );
});

test("Request Edit explicit legacy removal allows empty or governed replacement", () => {
  const legacy = hydrateRequestEditPhotos({
    photos: ["https://example.test/legacy.jpg"],
  });
  const afterRemoval = removeRequestEditPhotoAt(legacy, 0);
  const emptyReplacement = buildRequestPhotoReplacementPayload(afterRemoval);
  const canonical = hydrateRequestEditPhotos({
    request_photos: [media(6, { display_order: 0 })],
  });
  const governedReplacement = buildRequestPhotoReplacementPayload(canonical);

  assert.deepEqual(afterRemoval, []);
  assert.equal(emptyReplacement.ok, true);
  assert.deepEqual(emptyReplacement.request_photos, []);
  assert.equal(governedReplacement.ok, true);
  assert.deepEqual(
    governedReplacement.request_photos.map((photo) => photo.media.public_id),
    ["meetro/production/users/7/request-photos/photo-6"]
  );
});

test("Request Edit builds complete ordered replacement payload from existing and uploaded photos", () => {
  const existing = hydrateRequestEditPhotos({
    request_photos: [media(1, { display_order: 0 })],
  });
  const local = createLocalRequestPhotoItem({
    id: "preview-2",
    file: { name: "second.jpg", type: "image/jpeg", size: 1024 },
    url: "blob:second",
    revoke() {},
  });

  const replacement = buildRequestPhotoReplacementPayload([...existing, local], {
    uploadedMediaByItemId: new Map([[local.id, media(2)]]),
  });

  assert.equal(replacement.ok, true);
  assert.deepEqual(
    replacement.request_photos.map((photo) => photo.media.public_id),
    [
      "meetro/production/users/7/request-photos/photo-1",
      "meetro/production/users/7/request-photos/photo-2",
    ]
  );
  assert.deepEqual(
    replacement.request_photos.map((photo) => photo.display_order),
    [0, 1]
  );
});

test("Request Edit remove, reorder, pending-local, and preview revoke helpers are deterministic", () => {
  let revoked = false;
  const first = createLocalRequestPhotoItem({
    id: "preview-1",
    file: { name: "first.jpg", type: "image/jpeg", size: 1024 },
    url: "blob:first",
    revoke() {
      revoked = true;
    },
  });
  const second = createLocalRequestPhotoItem({
    id: "preview-2",
    file: { name: "second.jpg", type: "image/jpeg", size: 1024 },
    url: "blob:second",
    revoke() {},
  });
  const existing = hydrateRequestEditPhotos({
    request_photos: [media(3, { display_order: 0 })],
  })[0];

  const reordered = reorderRequestEditPhotos([existing, first, second], 2, -1);
  assert.deepEqual(
    reordered.map((photo) => photo.id),
    [existing.id, second.id, first.id]
  );
  assert.deepEqual(
    removeRequestEditPhotoAt(reordered, 1).map((photo) => photo.id),
    [existing.id, first.id]
  );
  assert.deepEqual(
    getPendingLocalRequestPhotoItems(reordered).map((photo) => photo.id),
    [second.id, first.id]
  );

  revokeLocalRequestEditPhotoPreviews([first, existing]);
  assert.equal(revoked, true);
});

test("Request Edit fails closed when local photos lack uploaded governed metadata", () => {
  const local = createLocalRequestPhotoItem({
    id: "preview-1",
    file: { name: "first.jpg", type: "image/jpeg", size: 1024 },
    url: "blob:first",
    revoke() {},
  });
  const replacement = buildRequestPhotoReplacementPayload([local]);

  assert.equal(replacement.ok, false);
  assert.equal(replacement.code, "REQUEST_EDIT_PHOTO_METADATA_REQUIRED");
});

test("Request Edit enforces request-photo file constraints before upload", () => {
  assert.equal(validateRequestPhotoFiles([imageFile()]).ok, true);
  assert.equal(
    validateRequestPhotoFiles([imageFile({ type: "image/gif" })]).code,
    "REQUEST_PHOTO_FORMAT_INVALID"
  );
  assert.equal(
    validateRequestPhotoFiles([imageFile({ size: 10 * 1024 * 1024 + 1 })]).code,
    "REQUEST_PHOTO_TOO_LARGE"
  );
  assert.equal(
    validateRequestPhotoFiles([imageFile()], {
      existingCount: REQUEST_PHOTO_MAX_COUNT,
    }).code,
    "REQUEST_PHOTO_COUNT_EXCEEDED"
  );
});

test("My Requests edit uses the governed request-photo gate and disables deferred controls", () => {
  assert.match(myRequestsSource, /const requestPhotoUploadEnabled = isRequestPhotoUploadEnabled\(\);/);
  assert.match(
    myRequestsSource,
    /isFriendsAndFamilyMediaDeferred\(\) && !requestPhotoUploadEnabled/
  );
  assert.match(myRequestsSource, /disabled=\{addPhotosDisabled\}/);
  assert.match(myRequestsSource, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.doesNotMatch(myRequestsSource, /Photos coming soon/);
});

test("My Requests edit omits request_photos unless photos were intentionally changed", () => {
  const changeGuard = modificationPanelSource.indexOf("if (photosChanged) {");
  const replacementAssignment = modificationPanelSource.indexOf(
    "requestPhotos = replacement.request_photos;",
    changeGuard
  );
  const payloadBuild = modificationPanelSource.indexOf(
    "buildHomeownerRequestEditPayload({",
    replacementAssignment
  );

  assert.notEqual(changeGuard, -1);
  assert.notEqual(replacementAssignment, -1);
  assert.notEqual(payloadBuild, -1);
  assert.ok(changeGuard < replacementAssignment);
  assert.ok(replacementAssignment < payloadBuild);
});

test("My Requests edit uploads local photos before save and cleans only new uploads on rejection", () => {
  assert.match(modificationPanelSource, /await uploadRequestPhotos\(\{/);
  assert.match(modificationPanelSource, /uploaded = upload\.photos;/);
  assert.match(
    modificationPanelSource,
    /await cleanupMedia\(uploaded\)/
  );
  assert.doesNotMatch(
    modificationPanelSource,
    /cleanupMedia\(\s*photos/
  );
  assert.match(modificationPanelSource, /onRequestChanged\?\.\(result\.post\)/);
  assert.match(myRequestsPageSource, /replaceCanonicalRequest\(records, post\)/);
});

test("My Requests edit resolves legacy display-only photos before any upload", () => {
  const legacyCheck = modificationPanelSource.indexOf(
    "photos.some((photo) => photo?.displayOnly)"
  );
  const uploadCall = modificationPanelSource.indexOf("await uploadRequestPhotos({");

  assert.notEqual(legacyCheck, -1);
  assert.notEqual(uploadCall, -1);
  assert.ok(legacyCheck < uploadCall);
  assert.match(
    myRequestsSource,
    /REQUEST_EDIT_LEGACY_PHOTO_RESOLUTION_REQUIRED/
  );
  assert.match(editFormSource, /older photo/);
  assert.match(editFormSource, /before saving photo changes/);
});

test("My Requests edit does not create browser-local request-photo authority", () => {
  const editSection = modificationPanelSource.slice(
    modificationPanelSource.indexOf("async function saveEdit"),
    modificationPanelSource.indexOf("async function saveUpdate")
  );

  assert.doesNotMatch(editSection, /localStorage\.setItem/);
  assert.doesNotMatch(editSection, /readAsDataURL|FileReader/);
  assert.doesNotMatch(editSection, /upload_preset|api\.cloudinary\.com/);
  assert.doesNotMatch(editSection, /public_id:\s*`|public_id:\s*['"]/);
});
