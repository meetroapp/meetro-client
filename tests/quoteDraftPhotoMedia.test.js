import assert from "node:assert/strict";
import test from "node:test";

import {
  QUOTE_DRAFT_PHOTO_MAX_COUNT,
  QUOTE_DRAFT_PHOTO_PURPOSE,
  cleanupQuoteDraftPhoto,
  isQuickQuoteDraftPhotoUploadEnabled,
  uploadQuoteDraftPhotos,
  validateQuoteDraftPhotoFiles,
} from "../src/utils/quoteDraftPhotoMedia.js";
import { BUSINESS_LOGO_PRODUCTION_API_ORIGIN } from "../src/utils/businessProfileLogo.js";
import { STAGING_MEDIA_API_ORIGIN } from "../src/utils/personalProfilePhoto.js";

function imageFile({
  name = "quote.jpg",
  type = "image/jpeg",
  size = 1024,
} = {}) {
  return new File(
    [new Uint8Array(size)],
    name,
    { type }
  );
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
        folder:
          "meetro/production/businesses/91/quote-drafts",
        allowedParameters: {
          signed: {
            allowed_formats: "jpg,jpeg,png,webp",
          },
        },
      },
    },
  };
}

function cloudinaryResponse(index = 1) {
  return {
    secure_url:
      `https://res.cloudinary.com/test-cloud/image/upload/v172000000${index}/meetro/production/businesses/91/quote-drafts/photo-${index}.jpg`,
    public_id:
      `meetro/production/businesses/91/quote-drafts/photo-${index}`,
    resource_type: "image",
    format: "jpg",
    bytes: 1024,
    width: 640,
    height: 480,
    version: 1720000000 + index,
    created_at: "2026-08-18T11:00:00.000Z",
  };
}

test("Quick Quote governed draft media is staging-safe and production-disabled by default", () => {
  assert.equal(
    isQuickQuoteDraftPhotoUploadEnabled({
      apiUrl: STAGING_MEDIA_API_ORIGIN,
      env: {},
    }),
    true
  );

  assert.equal(
    isQuickQuoteDraftPhotoUploadEnabled({
      apiUrl: STAGING_MEDIA_API_ORIGIN,
      env: {
        VITE_ENABLE_QUICK_QUOTE_DRAFT_MEDIA: "false",
      },
    }),
    false
  );

  assert.equal(
    isQuickQuoteDraftPhotoUploadEnabled({
      apiUrl: BUSINESS_LOGO_PRODUCTION_API_ORIGIN,
      env: {},
    }),
    false
  );

  assert.equal(
    isQuickQuoteDraftPhotoUploadEnabled({
      apiUrl: BUSINESS_LOGO_PRODUCTION_API_ORIGIN,
      env: {
        VITE_ENABLE_QUICK_QUOTE_DRAFT_MEDIA: "true",
      },
    }),
    true
  );
});

test("Quick Quote draft validation enforces governed type size and count", () => {
  assert.equal(
    validateQuoteDraftPhotoFiles([imageFile()]).ok,
    true
  );

  assert.equal(
    validateQuoteDraftPhotoFiles([
      imageFile({
        name: "quote.gif",
        type: "image/gif",
      }),
    ]).code,
    "QUOTE_DRAFT_PHOTO_FORMAT_INVALID"
  );

  assert.equal(
    validateQuoteDraftPhotoFiles([
      imageFile({
        size: 10 * 1024 * 1024 + 1,
      }),
    ]).code,
    "QUOTE_DRAFT_PHOTO_TOO_LARGE"
  );

  assert.equal(
    validateQuoteDraftPhotoFiles(
      [imageFile()],
      { existingCount: QUOTE_DRAFT_PHOTO_MAX_COUNT }
    ).code,
    "QUOTE_DRAFT_PHOTO_COUNT_EXCEEDED"
  );
});

test("Quick Quote photos use quote-draft-photo signatures and return business-owned metadata", async () => {
  const endpoints = [];
  const cloudinaryRequests = [];

  const result = await uploadQuoteDraftPhotos({
    files: [
      imageFile({ name: "first.jpg" }),
      imageFile({ name: "second.jpg" }),
    ],
    authFetchImpl: async (endpoint, options = {}) => {
      const payload = JSON.parse(options.body);

      endpoints.push({
        endpoint,
        payload,
      });

      assert.equal(
        endpoint,
        "/media/upload-signature"
      );
      assert.equal(
        payload.purpose,
        QUOTE_DRAFT_PHOTO_PURPOSE
      );

      return signatureResponse(endpoints.length);
    },
    fetchImpl: async (url, options) => {
      cloudinaryRequests.push({ url, options });

      return {
        ok: true,
        async json() {
          return cloudinaryResponse(
            cloudinaryRequests.length
          );
        },
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.photos.length, 2);

  assert.deepEqual(
    result.photos.map((photo) => photo.public_id),
    [
      "meetro/production/businesses/91/quote-drafts/photo-1",
      "meetro/production/businesses/91/quote-drafts/photo-2",
    ]
  );

  assert.equal(
    cloudinaryRequests[0].options.body.get("folder"),
    "meetro/production/businesses/91/quote-drafts"
  );
});

test("partial Quick Quote upload failure compensates by cleaning already-uploaded draft assets", async () => {
  let signatureCount = 0;
  let cloudinaryCount = 0;
  const cleanups = [];

  const result = await uploadQuoteDraftPhotos({
    files: [
      imageFile({ name: "first.jpg" }),
      imageFile({ name: "second.jpg" }),
    ],
    authFetchImpl: async (endpoint, options = {}) => {
      const payload = JSON.parse(options.body);

      if (
        endpoint ===
        "/media/quote-draft-photo/cleanup"
      ) {
        cleanups.push(payload);

        return {
          response: { ok: true },
          data: {
            success: true,
            code: "QUOTE_DRAFT_PHOTO_CLEANED",
          },
        };
      }

      signatureCount += 1;
      return signatureResponse(signatureCount);
    },
    fetchImpl: async () => {
      cloudinaryCount += 1;

      if (cloudinaryCount === 1) {
        return {
          ok: true,
          async json() {
            return cloudinaryResponse(1);
          },
        };
      }

      return {
        ok: false,
        async json() {
          return {};
        },
      };
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.code,
    "QUOTE_DRAFT_PHOTO_UPLOAD_FAILED"
  );

  assert.equal(cleanups.length, 1);
  assert.equal(
    cleanups[0].purpose,
    QUOTE_DRAFT_PHOTO_PURPOSE
  );
  assert.equal(
    cleanups[0].media.public_id,
    "meetro/production/businesses/91/quote-drafts/photo-1"
  );
});

test("explicit Quick Quote removal uses only the governed quote draft cleanup route", async () => {
  const calls = [];

  const removed = await cleanupQuoteDraftPhoto({
    media: cloudinaryResponse(1),
    authFetchImpl: async (endpoint, options = {}) => {
      calls.push({
        endpoint,
        payload: JSON.parse(options.body),
      });

      return {
        response: { ok: true },
        data: {
          success: true,
          code: "QUOTE_DRAFT_PHOTO_CLEANED",
        },
      };
    },
  });

  assert.equal(removed, true);
  assert.equal(
    calls[0].endpoint,
    "/media/quote-draft-photo/cleanup"
  );
  assert.equal(
    calls[0].payload.purpose,
    QUOTE_DRAFT_PHOTO_PURPOSE
  );
});
