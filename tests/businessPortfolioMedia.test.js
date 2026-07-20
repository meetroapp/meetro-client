import test from "node:test";
import assert from "node:assert/strict";

import {
  BUSINESS_PORTFOLIO_MAX_COUNT,
  cleanupBusinessPortfolioMedia,
  createBusinessPortfolioPreview,
  getBusinessPortfolioEditorMedia,
  isBusinessPortfolioMediaEnabled,
  reorderBusinessPortfolioMedia,
  requestBusinessPortfolioSignature,
  toBusinessPortfolioPersistenceItem,
  uploadBusinessPortfolioFiles,
  validateBusinessPortfolioFiles,
} from "../src/utils/businessPortfolioMedia.js";

function file(name = "project.png", type = "image/png", size = 1024) {
  return { name, type, size };
}

function media(index = 1) {
  return {
    secure_url: `https://res.cloudinary.com/test/image/upload/v1/project-${index}.png`,
    public_id: `meetro/production/businesses/91/portfolio/project-${index}`,
    resource_type: "image",
    format: "png",
    bytes: 1024,
    width: 640,
    height: 480,
    version: index,
  };
}

test("Business Portfolio feature gate is staging-default and production-explicit", () => {
  assert.equal(isBusinessPortfolioMediaEnabled({
    apiUrl: "https://athletic-rebirth-staging.up.railway.app",
    env: {},
  }), true);
  assert.equal(isBusinessPortfolioMediaEnabled({
    apiUrl: "https://athletic-rebirth-production-0a28.up.railway.app",
    env: {},
  }), false);
  assert.equal(isBusinessPortfolioMediaEnabled({
    apiUrl: "https://athletic-rebirth-production-0a28.up.railway.app",
    env: { VITE_ENABLE_BUSINESS_PORTFOLIO_MEDIA: "true" },
  }), true);
});

test("Business Portfolio validates supported files, limits, and caller immutability", () => {
  const source = [file()];
  assert.equal(validateBusinessPortfolioFiles(source).ok, true);
  assert.deepEqual(source, [file()]);
  assert.equal(validateBusinessPortfolioFiles([file("bad.gif", "image/gif")]).ok, false);
  assert.equal(validateBusinessPortfolioFiles([file("large.png", "image/png", 11 * 1024 * 1024)]).ok, false);
  assert.equal(validateBusinessPortfolioFiles(
    [file()],
    { existingCount: BUSINESS_PORTFOLIO_MAX_COUNT }
  ).code, "BUSINESS_PORTFOLIO_MEDIA_COUNT_EXCEEDED");
});

test("Business Portfolio reorder and removal helpers preserve deterministic order", () => {
  const source = [{ key: "a" }, { key: "b" }, { key: "c" }];
  const reordered = reorderBusinessPortfolioMedia(source, 2, 0);
  assert.deepEqual(reordered.map((item) => item.key), ["c", "a", "b"]);
  assert.deepEqual(source.map((item) => item.key), ["a", "b", "c"]);

  const revoked = [];
  const preview = createBusinessPortfolioPreview(file(), {
    createObjectURL: () => "blob:test",
    revokeObjectURL: (url) => revoked.push(url),
  });
  assert.equal(preview.url, "blob:test");
  preview.revoke();
  preview.revoke();
  assert.deepEqual(revoked, ["blob:test"]);
});

test("Business Portfolio editor restores canonical and legacy backend media", () => {
  const canonical = getBusinessPortfolioEditorMedia({
    portfolio_media: [media(1), { legacy_url: "https://legacy.test/photo.jpg" }],
  });
  assert.equal(canonical[0].media.public_id, media(1).public_id);
  assert.equal(canonical[1].legacyUrl, "https://legacy.test/photo.jpg");
  assert.deepEqual(
    canonical.map((item) => toBusinessPortfolioPersistenceItem(item)),
    [media(1), { legacy_url: "https://legacy.test/photo.jpg" }]
  );
});

test("Business Portfolio signature uses the exact governed purpose", async () => {
  const calls = [];
  const signature = await requestBusinessPortfolioSignature({
    file: file(),
    authFetchImpl: async (path, options) => {
      calls.push({ path, body: JSON.parse(options.body) });
      return {
        response: { ok: true },
        data: {
          success: true,
          code: "MEDIA_UPLOAD_SIGNATURE_CREATED",
          upload: { signature: "signed" },
        },
      };
    },
  });
  assert.equal(signature.signature, "signed");
  assert.deepEqual(calls, [{
    path: "/media/upload-signature",
    body: {
      purpose: "business-portfolio",
      fileName: "project.png",
      contentType: "image/png",
      fileSizeBytes: 1024,
    },
  }]);
});

test("Business Portfolio upload cleans completed assets when a later upload fails", async () => {
  const cleanupCalls = [];
  let cloudinaryCall = 0;
  const result = await uploadBusinessPortfolioFiles({
    files: [file("one.png"), file("two.png")],
    authFetchImpl: async (path, options) => {
      if (path === "/media/upload-signature") {
        return {
          response: { ok: true },
          data: {
            success: true,
            code: "MEDIA_UPLOAD_SIGNATURE_CREATED",
            upload: {
              cloudName: "test",
              apiKey: "public",
              timestamp: 1,
              signature: "signed",
              folder: "meetro/production/businesses/91/portfolio",
              allowedParameters: { signed: {} },
            },
          },
        };
      }
      cleanupCalls.push(JSON.parse(options.body).media.public_id);
      return {
        response: { ok: true },
        data: { success: true, code: "BUSINESS_PORTFOLIO_MEDIA_CLEANED" },
      };
    },
    fetchImpl: async () => {
      cloudinaryCall += 1;
      if (cloudinaryCall === 2) return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => media(1) };
    },
  });
  assert.equal(result.ok, false);
  assert.deepEqual(cleanupCalls, [media(1).public_id]);
});

test("Business Portfolio cleanup sends only governed metadata", async () => {
  const calls = [];
  const cleaned = await cleanupBusinessPortfolioMedia({
    media: media(1),
    authFetchImpl: async (path, options) => {
      calls.push({ path, body: JSON.parse(options.body) });
      return {
        response: { ok: true },
        data: { success: true, code: "BUSINESS_PORTFOLIO_MEDIA_CLEANED" },
      };
    },
  });
  assert.equal(cleaned, true);
  assert.equal(calls[0].body.purpose, "business-portfolio");
  assert.equal(calls[0].body.media.public_id, media(1).public_id);
});
