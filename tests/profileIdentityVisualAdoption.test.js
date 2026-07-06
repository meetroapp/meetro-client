import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profileSource = readFileSync(
  new URL("../src/pages/Profile.jsx", import.meta.url),
  "utf8"
);

const constitutionSource = readFileSync(
  new URL("../docs/KnowledgeBase/MEETRO_COMMUNITY_VISUAL_CONSTITUTION.md", import.meta.url),
  "utf8"
);

test("Profile adopts the Meetro visual constitution without changing the hosted/mobile architecture", () => {
  assert.match(
    profileSource,
    /const profileShellClassName = embedded[\s\S]*"app-page meetro-readable-page meetro-visual-page"/
  );
  assert.match(profileSource, /className="meetro-visual-hero"/);
  assert.match(profileSource, /className="meetro-visual-surface"/);
  assert.match(profileSource, /className="meetro-visual-primary-button"/);
  assert.match(profileSource, /className="meetro-visual-empty-state"/);
  assert.match(profileSource, /function Profile\(\{ setPage, currentPage, embedded = false \}\)/);
  assert.match(profileSource, /\{!embedded && <BottomNav setPage=\{setPage\} currentPage="profile" \/>\}/);
});

test("Profile business mode is identity-first while preserving the existing routes and actions", () => {
  const businessHeroIndex = profileSource.indexOf(
    '<section className="meetro-visual-hero" style={businessIdentityHero}>'
  );
  const businessBranch = profileSource.slice(businessHeroIndex);

  assert.match(profileSource, /<section className="meetro-visual-hero" style=\{businessIdentityHero\}>/);
  assert.match(profileSource, /label=\{t\("businessProfile"\)\}/);
  assert.match(profileSource, /label="Meetro Moments"/);
  assert.match(profileSource, /label=\{t\("aiBusinessHelp"\)\}/);
  assert.match(profileSource, /setPage\("contractorProfile"\)/);
  assert.match(profileSource, /setPage\("meetroMoments"\)/);
  assert.match(profileSource, /window\.dispatchEvent\(new Event\("meetro:assistant:open"\)\)/);
  assert.ok(
    businessBranch.indexOf('<SettingsGroup title={t("business")} icon="businessTools">') <
      businessBranch.indexOf('<SettingsGroup title={t("account")} icon="profile">'),
    "business identity surfaces should appear before account/settings controls"
  );
});

test("Profile Identity Wonder Pass is documented in the visual constitution knowledge base", () => {
  assert.match(constitutionSource, /### Profile Identity Wonder Pass/);
  assert.match(constitutionSource, /Profile answers: "Who am I becoming in this community\?"/);
  assert.match(constitutionSource, /Identity comes before settings\./);
});
