import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const designLanguagePath = new URL(
  "../docs/KnowledgeBase/MEETRO_DESIGN_LANGUAGE_STANDARD.md",
  import.meta.url
);

const designLanguageSource = fs.readFileSync(designLanguagePath, "utf8");

test("Meetro Design Language Standard document exists", () => {
  assert.ok(fs.existsSync(designLanguagePath), "Design Language Standard should exist");
  assert.match(designLanguageSource, /# Meetro Design Language Standard/);
  assert.match(designLanguageSource, /Status: Official Meetro visual reference/);
});

test("Design Language Standard preserves core visual sections", () => {
  [
    "Design Philosophy",
    "Typography",
    "Color Semantics",
    "Card Language",
    "Button Language",
    "Icons",
    "Empty States",
    "Status Language",
    "Motion",
    "Loading States",
    "Hosted Experiences",
    "Companion",
    "Desktop Design",
    "Mobile Design",
    "Accessibility",
    "Founder Principles",
  ].forEach((section) => {
    assert.match(designLanguageSource, new RegExp(`## .*${section}`));
  });
});

test("Design Language Standard protects hosted, Companion, desktop, and mobile rules", () => {
  assert.match(designLanguageSource, /Hosted experiences are temporary desktop surfaces/);
  assert.match(designLanguageSource, /Mobile should continue to use the canonical full-page flow/);
  assert.match(designLanguageSource, /The Companion is a presence, not a destination/);
  assert.match(designLanguageSource, /Presence[\s\S]*Workspace Guidance[\s\S]*Conversation/);
  assert.match(designLanguageSource, /Desktop should reveal context, not complexity/);
  assert.match(designLanguageSource, /Phone remains the primary experience/);
  assert.match(designLanguageSource, /BottomNav behavior/);
});

test("Design Language Standard remains constitutional and non-redesign oriented", () => {
  assert.match(designLanguageSource, /This is not a redesign/);
  assert.match(designLanguageSource, /This is not a new design system/);
  assert.match(designLanguageSource, /If any visual preference conflicts with the Meetro Constitution, the Constitution wins/);
  assert.match(designLanguageSource, /Do not change workflow ownership to satisfy visual preference/);
  assert.match(designLanguageSource, /The Design Language expresses the architecture visually/);
});
