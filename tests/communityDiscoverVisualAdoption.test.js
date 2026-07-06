import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const discoverSource = readFileSync(
  new URL("../src/pages/Discover.jsx", import.meta.url),
  "utf8"
);
const bottomNavSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const visualConstitutionSource = readFileSync(
  new URL(
    "../docs/KnowledgeBase/MEETRO_COMMUNITY_VISUAL_CONSTITUTION.md",
    import.meta.url
  ),
  "utf8"
);

test("Community Discover adopts the shared Visual Constitution classes", () => {
  const expectedClasses = [
    "meetro-visual-page",
    "meetro-visual-hero",
    "meetro-visual-surface",
    "meetro-visual-primary-button",
    "meetro-visual-empty-state",
  ];

  for (const className of expectedClasses) {
    assert.match(discoverSource, new RegExp(className));
  }
});

test("Community Discover uses warm Meetro tokens instead of legacy purple surfaces", () => {
  const expectedTokens = [
    "var(--meetro-gradient-community-page)",
    "var(--meetro-gradient-community-hero)",
    "var(--meetro-gradient-community-action)",
    "var(--meetro-surface-paper)",
    "var(--meetro-surface-warm)",
    "var(--meetro-surface-sage)",
    "var(--meetro-color-forest)",
    "var(--meetro-color-forest-deep)",
    "var(--meetro-color-wood)",
    "var(--meetro-color-coffee)",
    "var(--meetro-color-muted)",
    "var(--meetro-color-line)",
    "var(--meetro-shadow-soft)",
  ];

  for (const token of expectedTokens) {
    assert.match(discoverSource, new RegExp(token.replace(/[()]/g, "\\$&")));
  }

  const communityStyleBlock = discoverSource.slice(
    discoverSource.indexOf("const businessDirectoryCard = {"),
    discoverSource.indexOf("export default Discover;")
  );

  assert.doesNotMatch(communityStyleBlock, /#5b35f5|#4f46e5|#ede9fe|#eee7ff|#f5f3ff/);
  assert.doesNotMatch(communityStyleBlock, /rgba\(91,\s*53,\s*245/);
});

test("Community visual adoption preserves progressive discovery destinations", () => {
  assert.match(discoverSource, /useState\("communityHub"\)/);
  assert.match(discoverSource, /communityBusinessPreview\.map\(\(business\) => renderBusinessCard\(business\)\)/);
  assert.match(discoverSource, /hiringPreviewJobs\.map\(\(job\) => renderHiringPreviewCard\(job\)\)/);
  assert.match(discoverSource, /style=\{communitySpotlightCard\}/);
  assert.match(discoverSource, /onClick=\{\(\) => openCommunitySection\("businessDirectory"\)\}/);
  assert.match(discoverSource, /onClick=\{\(\) => setPage\("jobsHiring"\)\}/);
  assert.match(discoverSource, /onClick=\{\(\) => openCommunitySection\("spotlight"\)\}/);
});

test("Community remains a shared destination without mobile bottom navigation ownership", () => {
  const personalMobileBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const personalMobileNavItems = ["),
    bottomNavSource.indexOf("const businessMobileNavItems = [")
  );
  const businessMobileBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const businessMobileNavItems = ["),
    bottomNavSource.indexOf("const personalDesktopNavItems = [")
  );

  assert.doesNotMatch(personalMobileBlock, /page: "discover"/);
  assert.doesNotMatch(businessMobileBlock, /page: "discover"/);
});

test("Visual Constitution documents the Community Discover adoption pass", () => {
  assert.match(visualConstitutionSource, /Community Discover Visual Adoption Pass/);
  assert.match(visualConstitutionSource, /Who can I trust\?/);
  assert.match(visualConstitutionSource, /No Community architecture changed/);
  assert.match(visualConstitutionSource, /No role behavior changed/);
});
