import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { t } from "../src/utils/language.js";

const homeSource = readFileSync(
  new URL("../src/pages/Home.jsx", import.meta.url),
  "utf8"
);
const slideshowSource = readFileSync(
  new URL("../src/components/SpotlightSlideshow.jsx", import.meta.url),
  "utf8"
);
const spotlightStandardUrl = new URL(
  "../docs/KnowledgeBase/SPOTLIGHT_EXPERIENCE_STANDARD.md",
  import.meta.url
);

test("Spotlight uses story-first language instead of directory language", () => {
  assert.equal(t("homeLocalServicesSpotlight", "en"), "Today's Spotlight");
  assert.equal(t("homeViewProfile", "en"), "Meet the Professional");
  assert.doesNotMatch(t("homeLocalServicesSubtitle", "en"), /trusted local professionals/i);
  assert.doesNotMatch(t("homeLocalServicesEmpty", "en"), /portfolio media/i);
  assert.match(t("homeSpotlightStoryBody", "en"), /life it makes possible/i);
  assert.match(t("homeSpotlightBusinessIntro", "en"), /professional who helped/i);
});

test("Spotlight card presents story before business relationship context", () => {
  const storyIndex = homeSource.indexOf("spotlightHeroCopy");
  const businessIndex = homeSource.indexOf("homeSpotlightBusinessIntro");

  assert.notEqual(storyIndex, -1, "Spotlight story copy is missing");
  assert.notEqual(businessIndex, -1, "Spotlight business intro is missing");
  assert.ok(
    storyIndex < businessIndex,
    "Spotlight should introduce the story before the professional"
  );
  assert.match(homeSource, /function getSpotlightStoryKey/);
  assert.match(homeSource, /function resolveSpotlightStoryKey/);
  assert.match(homeSource, /featuredProjectMediaUrls/);
  assert.ok(
    homeSource.indexOf("homeSpotlightStoryRelief") <
      homeSource.indexOf("homeSpotlightStoryKitchen"),
    "Repair and leak evidence should win before kitchen location evidence"
  );
  assert.match(homeSource, /homeSpotlightStoryKitchen/);
  assert.match(homeSource, /homeSpotlightStoryOutdoor/);
  assert.match(homeSource, /homeSpotlightStoryProtection/);
  assert.match(homeSource, /homeSpotlightStoryTrust/);
  assert.match(homeSource, /homeSpotlightStoryCommunity/);
});

test("Spotlight photography behaves like an emotional hero canvas", () => {
  assert.match(homeSource, /spotlightHeroOverlay/);
  assert.match(homeSource, /linear-gradient/);
  assert.match(slideshowSource, /objectFit:\s*"cover"/);
  assert.match(slideshowSource, /placeholderLabel = "Story preview"/);
});

test("Spotlight experience standard is documented", () => {
  assert.ok(existsSync(spotlightStandardUrl), "Spotlight standard document missing");
  const docSource = readFileSync(spotlightStandardUrl, "utf8");

  assert.match(docSource, /Story First/);
  assert.match(docSource, /Story And Photography Must Match/);
  assert.match(docSource, /Image\s+Headline\s+Caption\s+Professional\s+Action/);
  assert.match(docSource, /What became possible because this work was completed/);
  assert.match(docSource, /Meet the professional who helped make it possible/);
  assert.match(docSource, /Communication, Work, and Meetro Moments/);
  assert.match(docSource, /not a directory/i);
});
