import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BUSINESS_LOGO_PRODUCTION_API_ORIGIN,
  isBusinessLogoUploadEnabled,
  uploadBusinessProfileLogo,
  validateBusinessLogoFile,
} from "../src/utils/businessProfileLogo.js";
import { STAGING_MEDIA_API_ORIGIN } from "../src/utils/personalProfilePhoto.js";

function imageFile({
  name = "logo.jpg",
  type = "image/jpeg",
  size = 1024,
} = {}) {
  const bytes = new Uint8Array(size);
  return new File([bytes], name, { type });
}

function signatureResponse() {
  return {
    response: { ok: true },
    data: {
      success: true,
      code: "MEDIA_UPLOAD_SIGNATURE_CREATED",
      upload: {
        cloudName: "test-cloud",
        apiKey: "test-key",
        timestamp: 1720000000,
        signature: "signed",
        folder: "meetro/production/businesses/logos/91",
        allowedParameters: {
          signed: { allowed_formats: "jpg,jpeg,png,webp" },
        },
      },
    },
  };
}

function cloudinaryResponse() {
  return {
    secure_url:
      "https://res.cloudinary.com/test-cloud/image/upload/v1720000000/meetro/production/businesses/logos/91/logo.jpg",
    public_id: "meetro/production/businesses/logos/91/logo",
    resource_type: "image",
    format: "jpg",
    bytes: 1024,
    width: 640,
    height: 640,
    version: 1720000000,
    created_at: "2026-07-19T12:00:00.000Z",
  };
}

test("business logo rollout is staging-safe and production-disabled by default", () => {
  assert.equal(
    isBusinessLogoUploadEnabled({
      apiUrl: STAGING_MEDIA_API_ORIGIN,
      env: {},
    }),
    true
  );
  assert.equal(
    isBusinessLogoUploadEnabled({
      apiUrl: STAGING_MEDIA_API_ORIGIN,
      env: { VITE_ENABLE_BUSINESS_LOGO_MEDIA: "false" },
    }),
    false
  );
  assert.equal(
    isBusinessLogoUploadEnabled({
      apiUrl: BUSINESS_LOGO_PRODUCTION_API_ORIGIN,
      env: {},
    }),
    false
  );
  assert.equal(
    isBusinessLogoUploadEnabled({
      apiUrl: BUSINESS_LOGO_PRODUCTION_API_ORIGIN,
      env: { VITE_ENABLE_BUSINESS_LOGO_MEDIA: "true" },
    }),
    true
  );
});

test("business logo validation rejects unsupported and oversized images before requests", () => {
  assert.equal(validateBusinessLogoFile(imageFile()).ok, true);
  assert.equal(
    validateBusinessLogoFile(imageFile({ name: "logo.gif", type: "image/gif" })).code,
    "BUSINESS_LOGO_FORMAT_INVALID"
  );
  assert.equal(
    validateBusinessLogoFile(imageFile({ size: 10 * 1024 * 1024 + 1 })).code,
    "BUSINESS_LOGO_TOO_LARGE"
  );
});

test("business logo upload persists only after backend confirmation and refresh", async () => {
  const endpoints = [];
  const authFetchImpl = async (endpoint, options = {}) => {
    endpoints.push({ endpoint, options });
    if (endpoint === "/media/upload-signature") {
      const payload = JSON.parse(options.body);
      assert.equal(payload.purpose, "business-logo");
      assert.equal(payload.fileName, "logo.jpg");
      return signatureResponse();
    }
    if (endpoint === "/contractor-profile/logo") {
      const payload = JSON.parse(options.body);
      assert.equal(payload.purpose, "business-logo");
      assert.equal(payload.media.public_id, cloudinaryResponse().public_id);
      return {
        response: { ok: true },
        data: {
          success: true,
          code: "BUSINESS_LOGO_UPDATED",
          profile: { id: 91, image_url: payload.media.secure_url },
        },
      };
    }
    assert.equal(endpoint, "/my-contractor-profile");
    return {
      response: { ok: true },
      data: {
        profile: {
          id: 91,
          business_name: "Trusted Home Services",
          image_url: cloudinaryResponse().secure_url,
        },
      },
    };
  };
  const cloudinaryRequests = [];
  const result = await uploadBusinessProfileLogo({
    file: imageFile(),
    authFetchImpl,
    fetchImpl: async (url, options) => {
      cloudinaryRequests.push({ url, options });
      return { ok: true, async json() { return cloudinaryResponse(); } };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.profile.image_url, cloudinaryResponse().secure_url);
  assert.deepEqual(endpoints.map((item) => item.endpoint), [
    "/media/upload-signature",
    "/contractor-profile/logo",
    "/my-contractor-profile",
  ]);
  assert.equal(cloudinaryRequests.length, 1);
  assert.match(cloudinaryRequests[0].url, /^https:\/\/api\.cloudinary\.com\/v1_1\/test-cloud\/image\/upload$/);
  assert.equal(cloudinaryRequests[0].options.body.get("folder"), "meetro/production/businesses/logos/91");
});

test("business logo failures stop before backend profile mutation when upload fails", async () => {
  const endpoints = [];
  const result = await uploadBusinessProfileLogo({
    file: imageFile(),
    authFetchImpl: async (endpoint) => {
      endpoints.push(endpoint);
      return signatureResponse();
    },
    fetchImpl: async () => ({ ok: false, async json() { return {}; } }),
  });
  assert.equal(result.ok, false);
  assert.deepEqual(endpoints, ["/media/upload-signature"]);
});

test("Business Profile logo UI uses governed upload and no local media authority", () => {
  const source = readFileSync("src/pages/ContractorProfile.jsx", "utf8");
  assert.match(source, /uploadBusinessProfileLogo/);
  assert.match(source, /isBusinessLogoUploadEnabled/);
  assert.match(source, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.doesNotMatch(source, /readAsDataURL|new FileReader/);
  assert.doesNotMatch(source, /setImageUrl\(""\)/);
});

test("shared Profile business mode uses the governed Business Logo authority", () => {
  const source = readFileSync("src/pages/Profile.jsx", "utf8");
  assert.match(source, /isBusinessLogoUploadEnabled/);
  assert.match(source, /uploadBusinessProfileLogo/);
  assert.match(source, /validateBusinessLogoFile/);
  assert.match(source, /setBusinessProfile\(result\.profile\)/);
  assert.match(source, /setProfilePhoto\(result\.profile\.image_url\)/);
  assert.doesNotMatch(source, /readAsDataURL|new FileReader/);
});
