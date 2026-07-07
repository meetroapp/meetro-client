import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bottomNavSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
  "utf8"
);
const discoverSource = readFileSync(
  new URL("../src/pages/Discover.jsx", import.meta.url),
  "utf8"
);
const jobsHiringSource = readFileSync(
  new URL("../src/pages/JobsHiring.jsx", import.meta.url),
  "utf8"
);
const contractorDetailsSource = readFileSync(
  new URL("../src/pages/ContractorDetails.jsx", import.meta.url),
  "utf8"
);
const uploadSource = readFileSync(
  new URL("../src/pages/Upload.jsx", import.meta.url),
  "utf8"
);
const visualConstitutionSource = readFileSync(
  new URL(
    "../docs/KnowledgeBase/MEETRO_COMMUNITY_VISUAL_CONSTITUTION.md",
    import.meta.url
  ),
  "utf8"
);

function assertIncludesTokens(source, tokens) {
  for (const token of tokens) {
    assert.match(source, new RegExp(token.replace(/[()]/g, "\\$&")));
  }
}

test("desktop sidebar adopts the warm Visual Constitution treatment", () => {
  const sidebarBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const desktopSidebar = {"),
    bottomNavSource.indexOf("const centerNavButton = {};")
  );

  assertIncludesTokens(sidebarBlock, [
    "var(--meetro-surface-paper)",
    "var(--meetro-surface-warm)",
    "var(--meetro-surface-sage)",
    "var(--meetro-color-line)",
    "var(--meetro-color-forest)",
    "var(--meetro-color-ink)",
    "var(--meetro-color-muted)",
    "var(--meetro-color-coffee)",
    "var(--meetro-color-wood)",
    "var(--meetro-gradient-community-action)",
    "var(--meetro-shadow-lifted)",
  ]);
  assert.match(sidebarBlock, /const sidebarNavButtonActive = \{/);
  assert.match(sidebarBlock, /background: "var\(--meetro-surface-sage\)"/);
  assert.doesNotMatch(sidebarBlock, /#5b3df5|#ede9fe|#eee7ff|#f5f3ff/);
});

test("Community ecosystem pages use shared visual classes and tokens", () => {
  assert.match(discoverSource, /meetro-wide-page meetro-visual-page/);
  assert.match(jobsHiringSource, /meetro-responsive-page meetro-visual-page/);
  assert.match(contractorDetailsSource, /meetro-readable-page meetro-visual-page/);
  assert.match(uploadSource, /meetro-form-page meetro-visual-page/);

  for (const source of [discoverSource, jobsHiringSource, contractorDetailsSource, uploadSource]) {
    assertIncludesTokens(source, [
      "var(--meetro-gradient-community-page)",
      "var(--meetro-surface-paper)",
      "var(--meetro-surface-sage)",
      "var(--meetro-color-line)",
      "var(--meetro-color-forest)",
      "var(--meetro-color-ink)",
      "var(--meetro-color-muted)",
      "var(--meetro-shadow-soft)",
    ]);
  }

  assert.match(discoverSource, /meetro-visual-hero/);
  assert.match(discoverSource, /meetro-visual-primary-button/);
  assert.match(jobsHiringSource, /meetro-visual-surface/);
  assert.match(jobsHiringSource, /meetro-visual-empty-state/);
  assert.match(contractorDetailsSource, /meetro-visual-surface/);
  assert.match(contractorDetailsSource, /meetro-visual-empty-state/);
  assert.match(uploadSource, /meetro-visual-surface/);
  assert.match(uploadSource, /meetro-visual-empty-state/);
});

test("Community connected routes and handoffs remain preserved", () => {
  assert.match(appSource, /if \(page === "discover"\)/);
  assert.match(appSource, /<Discover setPage=\{setPage\} \/>/);
  assert.match(appSource, /if \(page === "contractorDetails"\)/);
  assert.match(appSource, /<ContractorDetails setPage=\{setPage\} \/>/);
  assert.match(appSource, /if \(page === "jobsHiring"\)/);
  assert.match(appSource, /<JobsHiring setPage=\{setPage\} \/>/);
  assert.match(appSource, /if \(page === "upload"\)/);
  assert.match(appSource, /<Upload setPage=\{setPage\} \/>/);

  assert.match(discoverSource, /discoverMode === "businessDirectory" && renderBusinessesSection\(\)/);
  assert.match(discoverSource, /discoverMode === "spotlight" && renderSpotlightSection\(\)/);
  assert.match(discoverSource, /toggleCommunitySectionExpansion\("professionals"\)/);
  assert.match(discoverSource, /toggleCommunitySectionExpansion\("hiring"\)/);
  assert.match(discoverSource, /toggleCommunitySectionExpansion\("spotlight"\)/);
  assert.match(discoverSource, /setPage\("contractorDetails"\)/);
  assert.match(discoverSource, /setPage\("upload"\)/);
  assert.match(contractorDetailsSource, /setPage\("discover"\)/);
  assert.match(contractorDetailsSource, /setPage\("conversationThread"\)/);
  assert.match(jobsHiringSource, /setPage\("discover"\)/);
  assert.match(jobsHiringSource, /setPage\("conversationThread"\)/);
});

test("Community remains desktop/sidebar only and is not added to mobile bottom nav", () => {
  const personalMobileBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const personalMobileNavItems = ["),
    bottomNavSource.indexOf("const businessMobileNavItems = [")
  );
  const businessMobileBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const businessMobileNavItems = ["),
    bottomNavSource.indexOf("const personalDesktopNavItems = [")
  );
  const businessDesktopBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const businessDesktopNavItems = ["),
    bottomNavSource.indexOf("useEffect(() => {\n    setKeyboardOpen")
  );

  assert.doesNotMatch(personalMobileBlock, /page: "discover"/);
  assert.doesNotMatch(businessMobileBlock, /page: "discover"/);
  assert.match(businessDesktopBlock, /page: "discover"/);
  assert.match(businessDesktopBlock, /label: "Community"/);
  assert.match(businessDesktopBlock, /sub: "Discover"/);
});

test("Visual Constitution documents the Community ecosystem adoption pass", () => {
  assert.match(visualConstitutionSource, /Community Ecosystem Visual Adoption Pass/);
  assert.match(visualConstitutionSource, /left page of a warm notebook/);
  assert.match(visualConstitutionSource, /another room inside Community/);
  assert.match(visualConstitutionSource, /No routes changed/);
  assert.match(visualConstitutionSource, /No role behavior changed/);
});
