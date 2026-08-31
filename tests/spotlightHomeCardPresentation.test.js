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
  assert.match(homeSource, /width: min\(88vw, 374px\) !important/);
  assert.match(homeSource, /overflowX: "auto"/);
  assert.match(homeSource, /overscrollBehaviorX: "contain"/);
  assert.match(homeSource, /scrollSnapType: "x mandatory"/);
  assert.match(homeSource, /overflowX: "hidden"/);

  for (const viewportWidth of [390, 393, 430]) {
    const availableHomeWidth = viewportWidth - 40;
    const cardWidth = Math.min(viewportWidth * 0.88, 374);
    const heroHeight = Math.max(238, Math.min(viewportWidth * 0.64, 266));

    assert.ok(cardWidth <= availableHomeWidth, `${viewportWidth}px card fits Home`);
    assert.ok(heroHeight <= 266, `${viewportWidth}px hero remains bounded`);
    assert.ok(cardWidth - 108 > 200, `${viewportWidth}px story copy remains usable`);
  }
});

test("Spotlight presentation separates story copy from accessible controls", () => {
  assert.match(homeSource, /className="home-spotlight-story-title"/);
  assert.match(homeSource, /fontSize: "clamp\(1\.7rem, 4\.5vw, 2\.15rem\)"/);
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

  assert.match(overlay, /radial-gradient\(ellipse 78% 64% at 50% 67%/);
  assert.match(overlay, /linear-gradient\(90deg/);
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

  assert.match(controls, /blur\(16px\) saturate\(155%\)/);
  assert.match(controls, /inset 0 1px 0 rgba\(255,255,255,0\.68\)/);
  assert.match(controls, /background: "rgba\(255,255,255,0\.22\)"/);
  assert.doesNotMatch(card, /backdropFilter|WebkitBackdropFilter/);
  assert.doesNotMatch(content, /backdropFilter|WebkitBackdropFilter/);
  assert.match(homeSource, /@supports not \(\(backdrop-filter: blur\(1px\)\)/);
  assert.match(homeSource, /@media \(prefers-reduced-transparency: reduce\)/);
});

test("Spotlight story label shares the restrained capsule family", () => {
  assert.match(homeSource, /className=\{`home-spotlight-story-eyebrow\$\{hasSpotlightMedia/);
  assert.match(homeSource, /blur\(12px\) saturate\(140%\)/);
  assert.match(homeSource, /inset 0 1px 0 rgba\(255,255,255,0\.52\)/);
  assert.match(homeSource, /\.home-spotlight-story-eyebrow:not\(\.is-placeholder\)/);
  assert.match(homeSource, /const spotlightStoryEyebrowPlaceholder = \{[\s\S]*backdropFilter: "none"/);
});

test("Spotlight professional identity is left aligned with separate truthful proof", () => {
  const identity = sourceBetween(
    homeSource,
    '<div className="home-spotlight-business-row"',
    '<p style={spotlightDescription}>'
  );

  assert.match(identity, /<strong style=\{spotlightName\} title=\{name\}>\{name\}<\/strong>/);
  assert.match(identity, /<span style=\{spotlightCategory\} title=\{category\}>\{category\}<\/span>/);
  assert.match(identity, /className="home-spotlight-trust-line"/);
  assert.match(identity, /\{relationshipLine\}/);
  assert.match(homeSource, /const spotlightBusinessRow = \{[\s\S]*alignItems: "flex-start"/);
  assert.match(homeSource, /const spotlightName = \{[\s\S]*var\(--meetro-color-forest\)/);
});

test("Spotlight CTA is a full-width bottom action with unchanged routing", () => {
  const button = sourceBetween(
    homeSource,
    "const spotlightButton = {",
    "const spotlightButtonArrow = {"
  );

  assert.match(button, /width: "100%"/);
  assert.match(button, /minHeight: "50px"/);
  assert.match(button, /borderRadius: "15px"/);
  assert.match(button, /gridTemplateColumns: "24px minmax\(0, 1fr\) 24px"/);
  assert.match(button, /justifySelf: "stretch"/);
  assert.match(homeSource, /<span style=\{spotlightButtonArrow\} aria-hidden="true">→<\/span>/);
  assert.match(homeSource, /onClick=\{onViewProfile\}/);
  assert.match(homeSource, /setPage\("contractorDetails"\)/);
});

test("Home help cards preserve behavior in a responsive grounded layout", () => {
  const help = sourceBetween(
    homeSource,
    '<section style={quickHelpSection}>',
    '<section style={messagesCompactSection}>'
  );

  assert.match(help, /className="home-help-action-grid"/);
  assert.equal((help.match(/className="home-help-action-card"/g) || []).length, 3);
  assert.match(help, /onClick=\{\(\) => setPage\("upload"\)\}/);
  assert.match(help, /openActiveEmergencyFromHome\(activeEmergencyInfo\.isCompletedReview\)/);
  assert.match(help, /setPage\("emergency"\)/);
  assert.match(help, /window\.dispatchEvent\(new Event\("meetro:assistant:open"\)\)/);
  assert.match(homeSource, /gridTemplateColumns: "repeat\(3, minmax\(0, 1fr\)\)"/);
  assert.match(homeSource, /@media \(max-width: 600px\)[\s\S]*\.home-help-action-grid[\s\S]*grid-template-columns: 1fr !important/);
  assert.match(homeSource, /\.home-help-action-card:focus-visible/);
  assert.match(homeSource, /min-height: 64px !important/);
});
