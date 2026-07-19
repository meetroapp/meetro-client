import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { t } from "../src/utils/language.js";
import {
  PERSONAL_PROFILE_IMAGE_MAX_BYTES,
  createTemporaryProfilePhotoPreview,
  uploadPersonalProfilePhoto,
  validatePersonalProfileImageFile,
} from "../src/utils/personalProfilePhoto.js";
import {
  getStorageSafeAuthenticatedUser,
  reconcileAuthenticatedUser,
} from "../src/utils/personalProfile.js";

function imageFile({
  name = "portrait.jpg",
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
        folder: "meetro/production/users/7/profile",
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
      "https://res.cloudinary.com/test-cloud/image/upload/v1720000000/meetro/production/users/7/profile/avatar.jpg",
    public_id: "meetro/production/users/7/profile/avatar",
    resource_type: "image",
    format: "jpg",
    bytes: 1024,
    width: 640,
    height: 640,
    version: 1720000000,
    created_at: "2026-07-19T12:00:00.000Z",
  };
}

test("personal profile file validation rejects unsupported and oversized images before requests", () => {
  assert.equal(validatePersonalProfileImageFile(imageFile()).ok, true);
  assert.equal(
    validatePersonalProfileImageFile(imageFile({ name: "photo.gif", type: "image/gif" })).code,
    "PROFILE_IMAGE_FORMAT_INVALID"
  );
  assert.equal(
    validatePersonalProfileImageFile(
      imageFile({ size: PERSONAL_PROFILE_IMAGE_MAX_BYTES + 1 })
    ).code,
    "PROFILE_IMAGE_TOO_LARGE"
  );
});

test("temporary profile previews revoke object URLs exactly once", () => {
  const calls = [];
  const preview = createTemporaryProfilePhotoPreview(imageFile(), {
    createObjectURL() { calls.push("create"); return "blob:temporary"; },
    revokeObjectURL(url) { calls.push(`revoke:${url}`); },
  });
  assert.equal(preview.url, "blob:temporary");
  preview.revoke();
  preview.revoke();
  assert.deepEqual(calls, ["create", "revoke:blob:temporary"]);
});

test("signed upload persists only validated Cloudinary metadata and refreshes canonical user", async () => {
  const requests = [];
  const authFetchImpl = async (endpoint, options = {}) => {
    requests.push({ endpoint, options });
    if (endpoint === "/media/upload-signature") return signatureResponse();
    if (endpoint === "/auth/profile-photo") {
      const payload = JSON.parse(options.body);
      assert.equal(payload.purpose, "personal_profile");
      assert.equal(payload.media.public_id, cloudinaryResponse().public_id);
      return {
        response: { ok: true },
        data: {
          success: true,
          code: "PROFILE_IMAGE_UPDATED",
          user: { id: 7, username: "Owner", profile_photo_url: payload.media.secure_url },
        },
      };
    }
    assert.equal(endpoint, "/auth/me");
    return {
      response: { ok: true },
      data: {
        user: { id: 7, username: "Owner", profile_photo_url: cloudinaryResponse().secure_url },
      },
    };
  };
  const cloudinaryRequests = [];
  const result = await uploadPersonalProfilePhoto({
    file: imageFile(),
    authFetchImpl,
    fetchImpl: async (url, options) => {
      cloudinaryRequests.push({ url, options });
      return { ok: true, async json() { return cloudinaryResponse(); } };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(requests.map((item) => item.endpoint).join(","), [
    "/media/upload-signature",
    "/auth/profile-photo",
    "/auth/me",
  ].join(","));
  assert.equal(cloudinaryRequests.length, 1);
  assert.match(cloudinaryRequests[0].url, /^https:\/\/api\.cloudinary\.com\/v1_1\/test-cloud\/image\/upload$/);
  assert.equal(cloudinaryRequests[0].options.body.get("file").name, "portrait.jpg");
  assert.equal(cloudinaryRequests[0].options.body.get("api_key"), "test-key");
  assert.equal(cloudinaryRequests[0].options.body.get("signature"), "signed");
});

test("signature or Cloudinary failure stops persistence and retains existing canonical state", async () => {
  const endpoints = [];
  const signatureFailure = await uploadPersonalProfilePhoto({
    file: imageFile(),
    authFetchImpl: async (endpoint) => {
      endpoints.push(endpoint);
      return { response: { ok: false }, data: {} };
    },
    fetchImpl: async () => { throw new Error("must not upload"); },
  });
  assert.equal(signatureFailure.ok, false);
  assert.deepEqual(endpoints, ["/media/upload-signature"]);

  const uploadFailureEndpoints = [];
  const uploadFailure = await uploadPersonalProfilePhoto({
    file: imageFile(),
    authFetchImpl: async (endpoint) => {
      uploadFailureEndpoints.push(endpoint);
      return signatureResponse();
    },
    fetchImpl: async () => ({ ok: false, async json() { return {}; } }),
  });
  assert.equal(uploadFailure.ok, false);
  assert.deepEqual(uploadFailureEndpoints, ["/media/upload-signature"]);
});

test("authenticated user cache excludes profile image authority and base64 values", () => {
  const stored = [];
  const storage = {
    length: 0,
    key() { return null; },
    setItem(key, value) { stored.push([key, value]); },
    removeItem() {},
  };
  const user = {
    id: 7,
    username: "Owner",
    email: "owner@example.test",
    profile_photo_url: cloudinaryResponse().secure_url,
    profilePhoto: "data:image/jpeg;base64,unsafe",
  };
  const safe = getStorageSafeAuthenticatedUser(user);
  assert.equal(safe.profile_photo_url, undefined);
  assert.equal(safe.profilePhoto, undefined);
  const reconciled = reconcileAuthenticatedUser(user, storage);
  assert.equal(reconciled.user.profile_photo_url, user.profile_photo_url);
  assert.doesNotMatch(JSON.stringify(stored), /profile_photo|data:image|res\.cloudinary\.com/);
});

test("profile photo UI uses governed formats and no FileReader or personal photo storage write", () => {
  const source = readFileSync("src/pages/Profile.jsx", "utf8");
  assert.match(source, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.doesNotMatch(source, /new FileReader|readAsDataURL/);
  assert.doesNotMatch(source, /setItem\(getScopedProfilePhotoKey\("personal"/);
});

test("profile image states are localized in all supported public languages", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    for (const key of [
      "changeProfilePhoto",
      "chooseProfilePhoto",
      "uploadingProfilePhoto",
      "profilePhotoUpdated",
      "invalidProfileImageFormat",
      "profileImageTooLarge",
      "profileImageUploadFailed",
      "profileImageSaveFailed",
    ]) {
      assert.ok(t(key, language), `${language} is missing ${key}`);
    }
  }
});
