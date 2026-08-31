import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeSource = readFileSync("src/pages/Home.jsx", "utf8");
const slideshowSource = readFileSync(
  "src/components/SpotlightSlideshow.jsx",
  "utf8"
);

function sourceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("Spotlight keeps canonical identity, media, count, and profile routing", () => {
  assert.match(homeSource, /getBusinessIdentityProjection\(business/);
  assert.match(homeSource, /getBusinessPortfolioProofProjection\(business/);
  assert.match(homeSource, /const mediaUrls = featuredProjectMediaUrls\.length/);
  assert.match(homeSource, /t\("homePhotoCount", language, \{ count: mediaUrls\.length \}\)/);
  assert.match(homeSource, /localStorage\.setItem\(\s*"selectedContractor"/);
  assert.match(homeSource, /setPage\("contractorDetails"\)/);
});

test("Spotlight long business identity remains truthful and safely contained", () => {
  assert.match(homeSource, /const name = identity\.businessName/);
  assert.match(homeSource, /<strong style=\{spotlightName\} title=\{name\}>\{name\}<\/strong>/);
  assert.match(homeSource, /WebkitLineClamp: 2/);
  assert.match(homeSource, /overflowWrap: "anywhere"/);
  assert.doesNotMatch(homeSource, /name\.slice|businessName\.slice|truncate\(name/);
});

test("Spotlight hero and carousel are responsive without page-width expansion", () => {
  assert.match(homeSource, /width: "min\(84vw, 460px\)"/);
  assert.match(homeSource, /height: "clamp\(250px, 56vw, 292px\)"/);
  assert.match(homeSource, /@media \(max-width: 430px\)/);
  assert.match(homeSource, /width: min\(84vw, 360px\) !important/);
  assert.match(homeSource, /overflowX: "auto"/);
  assert.match(homeSource, /overscrollBehaviorX: "contain"/);
  assert.match(homeSource, /scrollSnapType: "x mandatory"/);
  assert.match(homeSource, /overflowX: "hidden"/);

  for (const viewportWidth of [390, 393, 430]) {
    const availableHomeWidth = viewportWidth - 40;
    const cardWidth = Math.min(viewportWidth * 0.84, 360);
    const heroHeight = Math.max(238, Math.min(viewportWidth * 0.64, 266));

    assert.ok(cardWidth <= availableHomeWidth, `${viewportWidth}px card fits Home`);
    assert.ok(heroHeight <= 266, `${viewportWidth}px hero remains bounded`);
    assert.ok(cardWidth - 108 > 200, `${viewportWidth}px story copy remains usable`);
  }
});

test("Spotlight presentation separates story copy from accessible controls", () => {
  assert.match(homeSource, /className="home-spotlight-story-title"/);
  assert.match(homeSource, /fontSize: "clamp\(1\.6rem, 4\.5vw, 2\.05rem\)"/);
  assert.match(homeSource, /left: "54px"/);
  assert.match(homeSource, /right: "54px"/);
  assert.match(slideshowSource, /className="spotlight-slide-control spotlight-slide-control-previous"/);
  assert.match(slideshowSource, /className="spotlight-slide-control spotlight-slide-control-next"/);
  assert.match(slideshowSource, /aria-label=\{previousLabel\}/);
  assert.match(slideshowSource, /aria-label=\{nextLabel\}/);
  assert.match(homeSource, /\.spotlight-slide-control:focus-visible/);
  assert.match(homeSource, /\.spotlight-slide-control:focus:not\(:focus-visible\)/);
});

test("Spotlight badges and missing-media placeholder stay canonical and legible", () => {
  assert.match(slideshowSource, /\{photoCountLabel\}/);
  assert.match(slideshowSource, /slideshowState\.counterLabel\.replace\("\/", " \/ "\)/);
  assert.match(slideshowSource, /aria-live="polite"/);
  assert.match(slideshowSource, /className="spotlight-placeholder"/);
  assert.match(slideshowSource, /var\(--meetro-surface-sage/);
  assert.doesNotMatch(slideshowSource, /setInterval|stock|unsplash/i);
});

test("Spotlight avatar preserves canonical URL with a safe initials fallback", () => {
  assert.match(homeSource, /const logoUrl = identity\.imageUrl \|\| getSpotlightAvatarUrl\(business\)/);
  assert.match(homeSource, /onError=\{\(\) => setFailedLogoUrl\(visibleLogoUrl\)\}/);
  assert.match(homeSource, /String\(name \|\| "M"\)\.charAt\(0\)\.toUpperCase\(\)/);
});

test("Spotlight hero uses a feathered central scrim without glassing the headline", () => {
  const overlay = sourceBetween(
    homeSource,
    "const spotlightHeroOverlay = {",
    "const spotlightHeroPlaceholderOverlay = {"
  );
  const title = sourceBetween(
    homeSource,
    "const spotlightStoryTitle = {",
    "const spotlightStoryTitlePlaceholder = {"
  );

  assert.match(overlay, /radial-gradient\(ellipse 82% 70% at 50% 73%/);
  assert.match(overlay, /linear-gradient\(0deg/);
  assert.doesNotMatch(title, /backdropFilter|WebkitBackdropFilter|background:/);
});

test("Spotlight glass treatment stays on functional overlays with opaque fallbacks", () => {
  const card = sourceBetween(
    homeSource,
    "const spotlightCard = {",
    "const spotlightHero = {"
  );
  const content = sourceBetween(
    homeSource,
    "const spotlightContent = {",
    "const spotlightBusinessIntro = {"
  );
  const controls = sourceBetween(
    slideshowSource,
    "const counterBadge = {",
    "const placeholder = {"
  );

  assert.match(controls, /blur\(14px\) saturate\(145%\)/);
  assert.match(controls, /inset 0 1px 0 rgba\(255,255,255,0\.48\)/);
  assert.match(controls, /background: "rgba\(17,34,25,0\.58\)"/);
  assert.doesNotMatch(card, /backdropFilter|WebkitBackdropFilter/);
  assert.doesNotMatch(content, /backdropFilter|WebkitBackdropFilter/);
  assert.match(homeSource, /@supports not \(\(backdrop-filter: blur\(1px\)\)/);
  assert.match(homeSource, /@media \(prefers-reduced-transparency: reduce\)/);
});

test("Spotlight story label shares the restrained capsule family", () => {
  assert.match(homeSource, /className=\{`home-spotlight-story-eyebrow\$\{hasSpotlightMedia/);
  assert.match(homeSource, /blur\(10px\) saturate\(125%\)/);
  assert.match(homeSource, /inset 0 1px 0 rgba\(255,255,255,0\.24\)/);
  assert.match(homeSource, /\.home-spotlight-story-eyebrow:not\(\.is-placeholder\)/);
  assert.match(homeSource, /const spotlightStoryEyebrowPlaceholder = \{[\s\S]*backdropFilter: "none"/);
});
