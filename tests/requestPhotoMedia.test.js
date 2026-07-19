import assert from "node:assert/strict";
import test from "node:test";

import {
  REQUEST_PHOTO_MAX_COUNT,
  isRequestPhotoUploadEnabled,
  uploadRequestPhotos,
  validateRequestPhotoFiles,
} from "../src/utils/requestPhotoMedia.js";
import { BUSINESS_LOGO_PRODUCTION_API_ORIGIN } from "../src/utils/businessProfileLogo.js";
import { STAGING_MEDIA_API_ORIGIN } from "../src/utils/personalProfilePhoto.js";

function imageFile({
  name = "request.jpg",
  type = "image/jpeg",
  size = 1024,
} = {}) {
  return new File([new Uint8Array(size)], name, { type });
}

function signatureResponse(index = 1) {
  return {
    response: { ok: true },
    data: {
      success: true,
      code: "MEDIA_UPLOAD_SIGNATURE_CREATED",
      upload: {
        cloudName: "test-cloud",
        apiKey: "test-key",
        timestamp: 1720000000 + index,
        signature: `signed-${index}`,
        folder: "meetro/production/users/7/request-photos",
        allowedParameters: {
          signed: { allowed_formats: "jpg,jpeg,png,webp" },
        },
      },
    },
  };
}

function cloudinaryResponse(index = 1) {
  return {
    secure_url:
      `https://res.cloudinary.com/test-cloud/image/upload/v172000000${index}/meetro/production/users/7/request-photos/photo-${index}.jpg`,
    public_id: `meetro/production/users/7/request-photos/photo-${index}`,
    resource_type: "image",
    format: "jpg",
    bytes: 1024,
    width: 640,
    height: 480,
    version: 1720000000 + index,
    created_at: "2026-07-19T18:00:00.000Z",
  };
}

test("request-photo rollout is staging-safe and production-disabled by default", () => {
  assert.equal(
    isRequestPhotoUploadEnabled({
      apiUrl: STAGING_MEDIA_API_ORIGIN,
      env: {},
    }),
    true
  );
  assert.equal(
    isRequestPhotoUploadEnabled({
      apiUrl: STAGING_MEDIA_API_ORIGIN,
      env: { VITE_ENABLE_REQUEST_PHOTO_MEDIA: "false" },
    }),
    false
  );
  assert.equal(
    isRequestPhotoUploadEnabled({
      apiUrl: BUSINESS_LOGO_PRODUCTION_API_ORIGIN,
      env: {},
    }),
    false
  );
  assert.equal(
    isRequestPhotoUploadEnabled({
      apiUrl: BUSINESS_LOGO_PRODUCTION_API_ORIGIN,
      env: { VITE_ENABLE_REQUEST_PHOTO_MEDIA: "true" },
    }),
    true
  );
});

test("request-photo validation rejects unsupported, oversized, and excess files", () => {
  assert.equal(validateRequestPhotoFiles([imageFile()]).ok, true);
  assert.equal(
    validateRequestPhotoFiles([imageFile({ name: "request.gif", type: "image/gif" })]).code,
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

test("request-photo uploads request signatures and returns safe Cloudinary metadata", async () => {
  const endpoints = [];
  const cloudinaryRequests = [];
  const result = await uploadRequestPhotos({
    files: [imageFile({ name: "first.jpg" }), imageFile({ name: "second.jpg" })],
    authFetchImpl: async (endpoint, options = {}) => {
      endpoints.push({ endpoint, payload: JSON.parse(options.body) });
      assert.equal(endpoint, "/media/upload-signature");
      assert.equal(endpoints.at(-1).payload.purpose, "request-photo");
      return signatureResponse(endpoints.length);
    },
    fetchImpl: async (url, options) => {
      cloudinaryRequests.push({ url, options });
      return {
        ok: true,
        async json() {
          return cloudinaryResponse(cloudinaryRequests.length);
        },
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.photos.length, 2);
  assert.deepEqual(
    result.photos.map((photo) => photo.public_id),
    [
      "meetro/production/users/7/request-photos/photo-1",
      "meetro/production/users/7/request-photos/photo-2",
    ]
  );
  assert.equal(cloudinaryRequests[0].options.body.get("folder"), "meetro/production/users/7/request-photos");
});

test("request-photo upload failure cleans already uploaded assets", async () => {
  const endpoints = [];
  const result = await uploadRequestPhotos({
    files: [imageFile({ name: "first.jpg" }), imageFile({ name: "second.jpg" })],
    authFetchImpl: async (endpoint, options = {}) => {
      endpoints.push({ endpoint, payload: JSON.parse(options.body) });
      if (endpoint === "/media/request-photo/cleanup") {
        return {
          response: { ok: true },
          data: { success: true, code: "REQUEST_PHOTO_CLEANED" },
        };
      }
      return signatureResponse(endpoints.length);
    },
    fetchImpl: async () => {
      if (endpoints.length === 1) {
        return { ok: true, async json() { return cloudinaryResponse(1); } };
      }
      return { ok: false, async json() { return {}; } };
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "REQUEST_PHOTO_UPLOAD_FAILED");
  const cleanup = endpoints.find((item) => item.endpoint === "/media/request-photo/cleanup");
  assert.equal(cleanup.payload.purpose, "request-photo");
  assert.equal(
    cleanup.payload.media.public_id,
    "meetro/production/users/7/request-photos/photo-1"
  );
});
