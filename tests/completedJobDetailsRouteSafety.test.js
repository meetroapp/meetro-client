import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getDisplayPhotoUrl,
  getMomentPreviewPhotos,
  normalizeCompletedJobRecord,
} from "../src/utils/completedJobDetails.js";
import { t } from "../src/utils/language.js";

const pageSource = readFileSync(
  new URL("../src/pages/CompletedJobDetails.jsx", import.meta.url),
  "utf8"
);

test("completed history rejects absent, malformed, and stale records", () => {
  for (const value of [
    null,
    undefined,
    "record",
    42,
    true,
    [],
    {},
    { id: "" },
    { id: "stale" },
    { id: "stale", status: "active" },
  ]) {
    assert.equal(normalizeCompletedJobRecord(value), null);
  }
});

test("completed history accepts a supported record without mutating caller input", () => {
  const record = { id: "job-1", status: "completed", title: "Kitchen repair" };
  const normalized = normalizeCompletedJobRecord(record);

  assert.deepEqual(normalized, record);
  assert.notEqual(normalized, record);
  normalized.title = "Changed";
  assert.equal(record.title, "Kitchen repair");
});

test("Moment preview safely handles null, malformed, and missing media", () => {
  for (const moment of [null, undefined, {}, [], "moment", 12, true]) {
    assert.deepEqual(getMomentPreviewPhotos(moment), []);
  }
  assert.deepEqual(getMomentPreviewPhotos({ coverPhoto: {} }), []);
  assert.deepEqual(getMomentPreviewPhotos({ coverPhoto: 42 }), []);
  assert.equal(getDisplayPhotoUrl(null), "");
  assert.equal(getDisplayPhotoUrl([]), "");
});

test("Moment preview returns only valid unique media", () => {
  assert.deepEqual(
    getMomentPreviewPhotos(
      {
        coverPhoto: "/cover.jpg",
        afterPhotos: [{ url: "/after.jpg" }, "/cover.jpg", null],
        beforePhotos: [{ imageUrl: "/before.jpg" }],
      },
      [{ src: "/completion.jpg" }, { url: "" }, 10]
    ),
    [
      "/cover.jpg",
      { url: "/after.jpg" },
      { imageUrl: "/before.jpg" },
      { src: "/completion.jpg" },
    ]
  );
});

test("direct completed history route fails closed without browser-local authority", () => {
  assert.match(pageSource, /normalizeCompletedJobRecord\(completedRecord\)/);
  assert.match(pageSource, /completedJobDetailsUnavailable/);
  assert.match(pageSource, /completedHistoryNoMutationNotice/);
  assert.match(pageSource, /setPage\("contractorDashboard"\)/);
  assert.match(pageSource, /setPage\("home"\)/);
  assert.doesNotMatch(pageSource, /localStorage\.(?:getItem|setItem|removeItem)/);
  assert.doesNotMatch(pageSource, /saveProfessionalReview|moveJobToHistory|updateProjectLifecycleState/);
});

test("completed history unavailable copy exists in every public language", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    assert.notEqual(t("completedJobDetailsUnavailable", language), "completedJobDetailsUnavailable");
    assert.notEqual(t("completedJobDetailsUnavailableBody", language), "completedJobDetailsUnavailableBody");
    assert.notEqual(t("returnToWorkCenter", language), "returnToWorkCenter");
  }
});
