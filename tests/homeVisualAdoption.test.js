import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeSource = readFileSync(
  new URL("../src/pages/Home.jsx", import.meta.url),
  "utf8"
);
const visualConstitutionSource = readFileSync(
  new URL(
    "../docs/KnowledgeBase/MEETRO_COMMUNITY_VISUAL_CONSTITUTION.md",
    import.meta.url
  ),
  "utf8"
);

test("Home adopts the Meetro Community Visual Constitution tokens", () => {
  const expectedTokens = [
    "var(--meetro-gradient-community-page)",
    "var(--meetro-surface-paper)",
    "var(--meetro-surface-warm)",
    "var(--meetro-surface-sage)",
    "var(--meetro-color-forest)",
    "var(--meetro-color-wood)",
    "var(--meetro-color-muted)",
    "var(--meetro-color-line)",
    "var(--meetro-shadow-soft)",
    "var(--meetro-gradient-community-action)",
  ];

  for (const token of expectedTokens) {
    assert.match(homeSource, new RegExp(token.replace(/[()]/g, "\\$&")));
  }
});

test("Home visual adoption preserves protected navigation and workflow hooks", () => {
  assert.match(homeSource, /home-community-entry/);
  assert.match(homeSource, /setPage\("discover"\)/);
  assert.match(homeSource, /getCanonicalConversationActionTarget\(decision/);
  assert.match(homeSource, /setPage\(target\.route\)/);
  assert.match(homeSource, /t\("continueConversation", language\)/);
  assert.match(homeSource, /t\("homeMyProjects", language\)/);
  assert.match(homeSource, /myProjectsTab === "history"/);
});

test("Visual Constitution documents the Home adoption pass as scoped visual work", () => {
  assert.match(visualConstitutionSource, /Home Visual Adoption Pass/);
  assert.match(visualConstitutionSource, /front porch/i);
  assert.match(visualConstitutionSource, /No Home architecture/);
  assert.match(visualConstitutionSource, /No navigation/);
});
