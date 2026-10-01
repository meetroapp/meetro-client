import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { t } from "../src/utils/language.js";
import {
  PERSONAL_PROFILE_IMAGE_MAX_BYTES,
  PROFILE_PHOTO_DISPLAY_DEFAULT,
  STAGING_MEDIA_API_ORIGIN,
  constrainPersonalProfilePhotoDisplay,
  createTemporaryProfilePhotoPreview,
  getPersonalProfilePhotoDisplayStyle,
  isPersonalProfilePhotoUploadEnabled,
  normalizePersonalProfilePhotoDisplay,
  reportProfileMediaDiagnostic,
  savePersonalProfilePhotoDisplay,
  uploadPersonalProfilePhoto,
  validatePersonalProfileImageFile,
  validatePersonalProfilePhotoDisplay,
} from "../src/utils/personalProfilePhoto.js";
import {
  getStorageSafeAuthenticatedUser,
  reconcileAuthenticatedUser,
} from "../src/utils/personalProfile.js";

test("profile photo rollout enables staging and fails closed for production", () => {
  assert.equal(
    isPersonalProfilePhotoUploadEnabled({
      apiUrl: STAGING_MEDIA_API_ORIGIN,
      env: {},
    }),
    true
  );
  assert.equal(
    isPersonalProfilePhotoUploadEnabled({
      apiUrl: "https://athletic-rebirth-production-0a28.up.railway.app",
      env: {},
    }),
    false
  );
  assert.equal(
    isPersonalProfilePhotoUploadEnabled({
      apiUrl: "https://athletic-rebirth-production-0a28.up.railway.app",
      env: { VITE_ENABLE_PERSONAL_PROFILE_MEDIA: "true" },
    }),
    true
  );
  assert.equal(
    isPersonalProfilePhotoUploadEnabled({
      apiUrl: STAGING_MEDIA_API_ORIGIN,
      env: { VITE_ENABLE_PERSONAL_PROFILE_MEDIA: "false" },
    }),
    false
  );
});

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
  const diagnostics = [];
  const signatureFailure = await uploadPersonalProfilePhoto({
    file: imageFile(),
    authFetchImpl: async (endpoint) => {
      endpoints.push(endpoint);
      return { response: { ok: false }, data: {} };
    },
    fetchImpl: async () => { throw new Error("must not upload"); },
    onDiagnostic: (detail) => diagnostics.push(detail),
  });
  assert.equal(signatureFailure.ok, false);
  assert.deepEqual(endpoints, ["/media/upload-signature"]);
  assert.deepEqual(diagnostics, [{
    purpose: "personal_profile",
    stage: "signature",
    endpoint: "/media/upload-signature",
    status: 0,
    code: "MEDIA_SIGNATURE_REJECTED",
  }]);

  const uploadFailureEndpoints = [];
  const uploadDiagnostics = [];
  const uploadFailure = await uploadPersonalProfilePhoto({
    file: imageFile(),
    authFetchImpl: async (endpoint) => {
      uploadFailureEndpoints.push(endpoint);
      return signatureResponse();
    },
    fetchImpl: async () => ({ ok: false, status: 400, async json() { return {}; } }),
    onDiagnostic: (detail) => uploadDiagnostics.push(detail),
  });
  assert.equal(uploadFailure.ok, false);
  assert.deepEqual(uploadFailureEndpoints, ["/media/upload-signature"]);
  assert.deepEqual(uploadDiagnostics, [{
    purpose: "personal_profile",
    stage: "provider-upload",
    endpoint: "cloudinary-image-upload",
    status: 400,
    code: "MEDIA_PROVIDER_REQUEST_REJECTED",
  }]);
});

test("profile media diagnostics expose only normalized transaction evidence", () => {
  const originalError = console.error;
  const calls = [];
  console.error = (...args) => calls.push(args);
  try {
    reportProfileMediaDiagnostic({
      purpose: "personal_profile",
      stage: "signature",
      endpoint: "/media/upload-signature",
      status: 400,
      code: "MEDIA_PURPOSE_INVALID",
      signature: "must-not-appear",
      token: "must-not-appear",
      secure_url: "https://private.example.test/media.jpg",
    });
  } finally {
    console.error = originalError;
  }
  assert.equal(calls.length, 1);
  const serialized = JSON.stringify(calls[0]);
  assert.match(serialized, /personal_profile|signature|MEDIA_PURPOSE_INVALID/);
  assert.doesNotMatch(serialized, /must-not-appear|private\.example|secure_url|token/);
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
    profile_photo_display: {
      version: 1,
      focus_x: 0.25,
      focus_y: 0.4,
      zoom: 1.5,
    },
  };
  const safe = getStorageSafeAuthenticatedUser(user);
  assert.equal(safe.profile_photo_url, undefined);
  assert.equal(safe.profilePhoto, undefined);
  assert.equal(safe.profile_photo_display, undefined);
  const reconciled = reconcileAuthenticatedUser(user, storage);
  assert.equal(reconciled.user.profile_photo_url, user.profile_photo_url);
  assert.doesNotMatch(JSON.stringify(stored), /profile_photo|data:image|res\.cloudinary\.com/);
});

test("profile photo UI uses governed formats and no FileReader or personal photo storage write", () => {
  const source = readFileSync("src/pages/Profile.jsx", "utf8");
  assert.match(source, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.doesNotMatch(source, /new FileReader|readAsDataURL/);
  assert.doesNotMatch(source, /setItem\(getScopedProfilePhotoKey\("personal"/);
  assert.match(source, /isPersonalProfilePhotoUploadEnabled/);
  assert.match(source, /isBusinessLogoUploadEnabled/);
  assert.match(
    source,
    /activeMode === "business"\s*\? businessLogoUploadEnabled\s*:\s*personalProfilePhotoEnabled/
  );
  assert.match(source, /uploadPersonalProfilePhoto/);
  assert.match(source, /uploadBusinessProfileLogo/);
});


test("personal profile display model is bounded and produces reusable framing styles", () => {
  assert.deepEqual(
    normalizePersonalProfilePhotoDisplay(null),
    PROFILE_PHOTO_DISPLAY_DEFAULT
  );

  const display = {
    version: 1,
    focus_x: 0.25,
    focus_y: 0.7,
    zoom: 2,
  };

  assert.equal(
    validatePersonalProfilePhotoDisplay(display).ok,
    true
  );

  assert.deepEqual(
    normalizePersonalProfilePhotoDisplay(display),
    display
  );

  const style =
    getPersonalProfilePhotoDisplayStyle(display);

  assert.equal(style.position, "absolute");
  assert.equal(style.width, "200.000%");
  assert.equal(style.height, "200.000%");
  assert.equal(style.left, "50%");
  assert.equal(style.top, "50%");
  assert.equal(style.objectPosition, "50% 50%");
  assert.equal(
    style.transform,
    "translate(-25%, -70%)"
  );
  assert.equal(style.transformOrigin, "0 0");

  const runtimeCase =
    getPersonalProfilePhotoDisplayStyle({
      version: 1,
      focus_x: 0.48903125,
      focus_y: 0.611484375,
      zoom: 1.4,
    });

  assert.equal(
    runtimeCase.width,
    "140.000%"
  );

  assert.equal(
    runtimeCase.height,
    "140.000%"
  );

  assert.equal(
    runtimeCase.transform,
    "translate(-48.903125%, -61.1484375%)"
  );

  const constrainedAtDefault =
    constrainPersonalProfilePhotoDisplay({
      version: 1,
      focus_x: 0,
      focus_y: 1,
      zoom: 1,
    });

  assert.deepEqual(
    constrainedAtDefault,
    PROFILE_PHOTO_DISPLAY_DEFAULT
  );

  const constrainedAtTwo =
    constrainPersonalProfilePhotoDisplay({
      version: 1,
      focus_x: 0,
      focus_y: 1,
      zoom: 2,
    });

  assert.deepEqual(
    constrainedAtTwo,
    {
      version: 1,
      focus_x: 0.25,
      focus_y: 0.75,
      zoom: 2,
    }
  );

  for (const invalid of [
    { ...display, focus_x: -0.01 },
    { ...display, focus_y: 1.01 },
    { ...display, zoom: 0.99 },
    { ...display, zoom: 4.01 },
    { ...display, zoom: "2" },
    { ...display, extra: true },
  ]) {
    assert.equal(
      validatePersonalProfilePhotoDisplay(invalid).ok,
      false
    );
  }
});


test("personal profile focal renderer is pixel-size independent", () => {
  const display = {
    version: 1,
    focus_x: 0.43,
    focus_y: 0.61,
    zoom: 1.6,
  };

  const style =
    getPersonalProfilePhotoDisplayStyle(display);

  // Geometry contains only normalized percentages.
  // No Profile/Home pixel dimensions participate.
  assert.deepEqual(
    {
      width: style.width,
      height: style.height,
      left: style.left,
      top: style.top,
      transform: style.transform,
    },
    {
      width: "160.000%",
      height: "160.000%",
      left: "50%",
      top: "50%",
      transform: "translate(-43%, -61%)",
    }
  );

  const profileSource = readFileSync(
    "src/pages/Profile.jsx",
    "utf8"
  );

  const navSource = readFileSync(
    "src/components/BottomNav.jsx",
    "utf8"
  );

  assert.match(
    profileSource,
    /const homeownerAvatarViewport = \{[\s\S]*position: "relative"[\s\S]*overflow: "hidden"/
  );

  assert.match(
    profileSource,
    /const profilePhotoEditorPreview = \{[\s\S]*position: "relative"[\s\S]*overflow: "hidden"/
  );

  assert.match(
    navSource,
    /const sidebarPersonalPhotoWrap = \{[\s\S]*position: "relative"[\s\S]*overflow: "hidden"/
  );
});

test("personal profile display save uses only the governed framing endpoint and safe payload", async () => {
  const requests = [];

  const display = {
    version: 1,
    focus_x: 0.31,
    focus_y: 0.42,
    zoom: 1.75,
  };

  const result =
    await savePersonalProfilePhotoDisplay({
      display,
      authFetchImpl: async (endpoint, options) => {
        requests.push({ endpoint, options });

        return {
          response: { ok: true },
          data: {
            success: true,
            code: "PROFILE_DISPLAY_UPDATED",
            profile_photo_display: display,
            user: {
              id: 7,
              username: "Owner",
              profile_photo_url:
                cloudinaryResponse().secure_url,
              profile_photo_display: display,
            },
          },
        };
      },
    });

  assert.equal(result.ok, true);
  assert.deepEqual(result.display, display);
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].endpoint,
    "/auth/profile-photo/display"
  );
  assert.equal(requests[0].options.method, "PATCH");

  const payload = JSON.parse(
    requests[0].options.body
  );

  assert.deepEqual(payload, {
    purpose: "personal_profile",
    display,
  });

  assert.equal(
    Object.hasOwn(payload, "media"),
    false
  );
});

test("personal profile display save fails closed before network for malformed framing", async () => {
  let called = false;

  const result =
    await savePersonalProfilePhotoDisplay({
      display: {
        version: 1,
        focus_x: 2,
        focus_y: 0.5,
        zoom: 1,
      },
      authFetchImpl: async () => {
        called = true;
        throw new Error("must not be called");
      },
    });

  assert.equal(result.ok, false);
  assert.equal(called, false);
});

test("Profile owns the accessible personal photo adjust editor and applies saved framing", () => {
  const profile = readFileSync(
    "src/pages/Profile.jsx",
    "utf8"
  );

  assert.match(
    profile,
    /t\("adjustProfilePhoto"\)/
  );

  assert.match(
    profile,
    /role="dialog"[\s\S]*aria-modal="true"[\s\S]*profile-photo-adjust-title/
  );

  assert.match(
    profile,
    /type="range"[\s\S]*PROFILE_PHOTO_DISPLAY_MAX_ZOOM/
  );

  assert.match(
    profile,
    /onPointerDown=\{[\s\S]*handleProfilePhotoPointerDown/
  );

  assert.match(
    profile,
    /constrainPersonalProfilePhotoDisplay/
  );

  assert.match(
    profile,
    /savePersonalProfilePhotoDisplay/
  );

  assert.match(
    profile,
    /getPersonalProfilePhotoDisplayStyle\([\s\S]*profilePhotoDisplay/
  );

  assert.match(
    profile,
    /window\.dispatchEvent\([\s\S]*meetro-profile-photo-updated/
  );
});

test("desktop personal sidebar consumes the same canonical framing without local authority", () => {
  const nav = readFileSync(
    "src/components/BottomNav.jsx",
    "utf8"
  );

  assert.match(
    nav,
    /profile_photo_display/
  );

  assert.match(
    nav,
    /normalizePersonalProfilePhotoDisplay/
  );

  assert.match(
    nav,
    /getPersonalProfilePhotoDisplayStyle\([\s\S]*sidebarPersonalPhotoDisplay/
  );

  assert.doesNotMatch(
    nav,
    /localStorage\.setItem\([\s\S]*profile_photo_display/
  );
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
      "adjustProfilePhoto",
      "profilePhotoAdjustTitle",
      "profilePhotoAdjustHelp",
      "profilePhotoZoom",
      "profilePhotoReset",
      "profilePhotoPositionUpdated",
      "profilePhotoPositionSaveFailed",
    ]) {
      assert.ok(t(key, language), `${language} is missing ${key}`);
    }
  }
});


test("personal profile avatar visibly exposes add and change photo affordance", () => {
  const source = readFileSync("src/pages/Profile.jsx", "utf8");

  assert.match(source, /data-profile-photo-action=\{profilePhoto \? "change" : "add"\}/);
  assert.match(source, /const avatarEditBadge = \{/);
  assert.match(
    source,
    /profilePhoto \? \([\s\S]*name="editPortfolio"[\s\S]*\) : \([\s\S]*avatarAddPhotoPlus[\s\S]*>\+<\/span>/
  );

  assert.match(
    source,
    /const homeownerAvatarImage = \{[\s\S]*?objectFit: "cover"/
  );

  assert.match(
    source,
    /changeProfilePhoto[\s\S]*chooseProfilePhoto/
  );
});


test("personal desktop chrome uses the homeowner photo and removes the duplicate Home brand M", () => {
  const profile = readFileSync("src/pages/Profile.jsx", "utf8");
  const home = readFileSync("src/pages/Home.jsx", "utf8");
  const nav = readFileSync("src/components/BottomNav.jsx", "utf8");
  const businessDashboard = readFileSync(
    "src/pages/BusinessDashboard.jsx",
    "utf8"
  );

  assert.doesNotMatch(
    home,
    /<span className="home-dashboard-brand-mark" aria-hidden="true">M<\/span>/
  );

  assert.match(
    home,
    /<strong className="home-brand-main" style=\{brandMain\}>Meetro<\/strong>/
  );
  assert.match(
    home,
    /<small className="home-brand-badge" style=\{brandBadge\}>Community<\/small>/
  );

  assert.match(nav, /const \[sidebarPersonalPhoto, setSidebarPersonalPhoto\]/);
  assert.match(
    nav,
    /authFetch\(\s*"\/auth\/me",\s*\{ cache: "no-store" \},\s*setPage\s*\)/
  );
  assert.match(nav, /"meetro-profile-photo-updated"/);

  assert.match(
    nav,
    /activeMode === "personal" && sidebarPersonalPhoto \? \([\s\S]*src=\{sidebarPersonalPhoto\}[\s\S]*sidebarPersonalPhotoImage[\s\S]*getPersonalProfilePhotoDisplayStyle/
  );

  assert.match(
    nav,
    /const sidebarPersonalPhotoImage = \{[\s\S]*objectFit: "cover"[\s\S]*borderRadius: "999px"/
  );

  assert.match(
    nav,
    /\) : \(\s*"M"\s*\)/
  );

  assert.match(
    profile,
    /window\.dispatchEvent\(new Event\("meetro-profile-photo-updated"\)\)/
  );

  assert.match(
    businessDashboard,
    /<span className="home-dashboard-brand-mark" aria-hidden="true">M<\/span>/
  );
});
