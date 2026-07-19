/* global process */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

import {
  getMediaDeferredCopy,
  guardFriendsAndFamilyMediaUpload,
  isFriendsAndFamilyMediaDeferred,
} from "../src/utils/mediaDeferral.js";

const repoRoot = process.cwd();

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function listSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) return listSourceFiles(absolutePath);
    if (!entry.endsWith(".jsx") && !entry.endsWith(".js")) return [];
    if (entry.includes(".bak") || entry.includes(".backup")) return [];

    return [absolutePath];
  });
}

test("Friends and Family media deferral is enabled outside local development", () => {
  assert.equal(isFriendsAndFamilyMediaDeferred({ DEV: false }), true);
  assert.equal(isFriendsAndFamilyMediaDeferred({ DEV: undefined }), true);
  assert.equal(isFriendsAndFamilyMediaDeferred({ DEV: true }), false);

  const english = getMediaDeferredCopy("en");
  const spanish = getMediaDeferredCopy("es");

  assert.equal(english.title, "Photos coming soon");
  assert.match(english.detail, /Friends & Family/);
  assert.equal(spanish.title, "Fotos próximamente");
});

test("job photo picker preserves deferral unless a governed upload is enabled", () => {
  const pickerContents = read("src/utils/cameraPhotoPicker.js");

  assert.match(pickerContents, /governedUploadEnabled = false/);
  assert.match(
    pickerContents,
    /!governedUploadEnabled && isFriendsAndFamilyMediaDeferred\(\)/
  );
});

test("media deferral guard clears selected files and reports deferred state", () => {
  const event = {
    target: {
      value: "unsafe-photo.jpg",
    },
  };
  let notice = "";

  const allowed = guardFriendsAndFamilyMediaUpload({
    event,
    env: { DEV: false },
    onDeferred: (message) => {
      notice = message;
    },
  });

  assert.equal(allowed, false);
  assert.equal(event.target.value, "");
  assert.match(notice, /Photos coming soon/);

  assert.equal(
    guardFriendsAndFamilyMediaUpload({ env: { DEV: true } }),
    true
  );
});

test("protected media upload surfaces render a deferred state for real-user builds", () => {
  const protectedSurfaces = [
    "src/pages/Upload.jsx",
    "src/pages/MyRequests.jsx",
    "src/pages/ContractorProfile.jsx",
    "src/pages/ProjectGallery.jsx",
    "src/pages/ConversationThread.jsx",
    "src/pages/CompletionSheet.jsx",
    "src/pages/ContractorDashboard.jsx",
    "src/pages/CompletedJobDetails.jsx",
  ];

  for (const surface of protectedSurfaces) {
    const contents = read(surface);
    const isGovernedBusinessLogoSurface = surface === "src/pages/ContractorProfile.jsx";
    const isGovernedRequestPhotoSurface = surface === "src/pages/Upload.jsx";

    if (isGovernedBusinessLogoSurface) {
      assert.match(contents, /isBusinessLogoUploadEnabled/);
    } else if (isGovernedRequestPhotoSurface) {
      assert.match(contents, /isRequestPhotoUploadEnabled/);
    } else {
      assert.match(
        contents,
        /isFriendsAndFamilyMediaDeferred/,
        `${surface} should detect Friends & Family media deferral`
      );
    }
    assert.match(
      contents,
      /guardFriendsAndFamilyMediaUpload|getMediaDeferredNotice|getMediaDeferredCopy/,
      `${surface} should block or report deferred media before persistence`
    );
    assert.match(
      contents,
      /disabled=\{mediaUploadDeferred\}|disabled=\{uploading \|\| mediaUploadDeferred\}|disabled=\{mediaUploadDeferred \|\| uploading \|\| creating\}/,
      `${surface} should disable real-user upload controls`
    );
  }
});

test("Profile authorizes only governed personal uploads and keeps business media deferred", () => {
  const contents = read("src/pages/Profile.jsx");
  assert.match(contents, /uploadPersonalProfilePhoto/);
  assert.match(contents, /isPersonalProfilePhotoUploadEnabled/);
  assert.match(
    contents,
    /activeMode === "business" \|\| !personalProfilePhotoEnabled/
  );
  assert.match(contents, /disabled=\{mediaUploadDeferred \|\| profilePhotoUploading\}/);
  assert.match(contents, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.doesNotMatch(contents, /readAsDataURL|new FileReader/);
});

test("live unsafe media writers are guarded before Friends and Family release", () => {
  const dangerousMediaPatterns =
    /api\.cloudinary\.com|upload_preset|URL\.createObjectURL\(file\)|readAsDataURL\(/;
  const sourceFiles = listSourceFiles(join(repoRoot, "src"));
  const unguarded = [];

  for (const absolutePath of sourceFiles) {
    const contents = readFileSync(absolutePath, "utf8");
    if (!dangerousMediaPatterns.test(contents)) continue;

    const isGuarded =
      contents.includes("guardFriendsAndFamilyMediaUpload") ||
      contents.includes("isFriendsAndFamilyMediaDeferred");

    const isGovernedPersonalProfileUpload =
      relative(repoRoot, absolutePath) === "src/utils/personalProfilePhoto.js" &&
      contents.includes("/media/upload-signature") &&
      contents.includes("/auth/profile-photo");

    const isGovernedBusinessLogoUpload =
      relative(repoRoot, absolutePath) === "src/utils/businessProfileLogo.js" &&
      contents.includes("/media/upload-signature") &&
      contents.includes("/contractor-profile/logo") &&
      contents.includes("business-logo");

    if (!isGuarded && !isGovernedPersonalProfileUpload && !isGovernedBusinessLogoUpload) {
      unguarded.push(relative(repoRoot, absolutePath));
    }
  }

  assert.deepEqual(unguarded, []);
});

test("legacy unsigned Cloudinary handlers are removed from client source", () => {
  const sourceFiles = listSourceFiles(join(repoRoot, "src"));
  const unsignedWriters = sourceFiles
    .filter((absolutePath) => {
      const contents = readFileSync(absolutePath, "utf8");
      return contents.includes("upload_preset") || contents.includes("djcw4tk28");
    })
    .map((absolutePath) => relative(repoRoot, absolutePath));

  assert.deepEqual(unsignedWriters, []);
});

test("native and fallback photo picker refuses media in real-user builds", () => {
  const pickerContents = read("src/utils/cameraPhotoPicker.js");

  assert.match(pickerContents, /isFriendsAndFamilyMediaDeferred/);
  assert.match(pickerContents, /getMediaDeferredNotice/);
  assert.match(pickerContents, /return \{ deferred: true \}/);
});
