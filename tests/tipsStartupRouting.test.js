import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { t } from "../src/utils/language.js";

test("Guide overlay does not auto-launch tips during startup", () => {
  const source = fs.readFileSync("src/components/GuideOverlay.jsx", "utf8");

  assert.doesNotMatch(source, /setShowPrompt\(true\)/);
  assert.doesNotMatch(source, /showPrompt/);
  assert.doesNotMatch(source, /localStorage\.getItem\(getPromptStorageKey\(\)\) === "true"/);
  assert.match(source, /window\.addEventListener\("meetroStartTour"/);
});

test("startup routes tips explicitly and ignores stale tour routes", () => {
  const source = fs.readFileSync("src/App.jsx", "utf8");

  assert.match(source, /"tips", "learn-meetro", "meetroJourney"/);
  assert.match(source, /routedHash && routedHash !== "tour"/);
  assert.match(source, /page === "meetroJourney" \|\| page === "tips" \|\| page === "learn-meetro"/);
  assert.match(source, /shouldRouteToProfessionalOnboarding\("businessDashboard"\)/);
});

test("profile opens optional Learn Meetro instead of launching a mandatory tour", () => {
  const source = fs.readFileSync("src/pages/Profile.jsx", "utf8");

  assert.match(source, /function openMeetroTips/);
  assert.match(source, /setPage\("meetroJourney"\)/);
  assert.match(source, /label=\{t\("learnMeetro"\)\}/);
  assert.doesNotMatch(source, /label=\{t\("startMeetroTour"\)\}/);
  assert.doesNotMatch(source, /new CustomEvent\("meetroStartTour"/);
});

test("tour language is reframed as optional tips", () => {
  assert.equal(t("meetroTour", "en"), "Meetro Tips");
  assert.equal(t("startMeetroTour", "en"), "Learn Meetro");
  assert.equal(t("learnMeetro", "en"), "Learn Meetro");
  assert.doesNotMatch(t("guidePromptTitle", "en"), /tour/i);

  for (const language of ["en", "es", "fr", "pt-BR"]) {
    assert.notEqual(t("learnMeetro", language), "learnMeetro");
    assert.doesNotMatch(t("startMeetroTour", language), /tour/i);
  }
});
