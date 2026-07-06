import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const interactionStandardPath = new URL(
  "../docs/KnowledgeBase/MEETRO_INTERACTION_STANDARD.md",
  import.meta.url
);

const interactionStandardSource = fs.readFileSync(interactionStandardPath, "utf8");

test("Meetro Interaction Standard document exists", () => {
  assert.ok(fs.existsSync(interactionStandardPath), "Interaction Standard should exist");
  assert.match(interactionStandardSource, /# Meetro Interaction Standard/);
  assert.match(interactionStandardSource, /Status: Official Meetro behavioral reference/);
});

test("Interaction Standard preserves core behavioral sections", () => {
  [
    "Interaction Philosophy",
    "The Law of Guided Interaction",
    "Hosted Experiences",
    "Navigation",
    "Confirmations",
    "System Actions",
    "Companion",
    "Forms",
    "Feedback",
    "Empty States",
    "Desktop Interaction",
    "Mobile Interaction",
    "Accessibility",
    "Error Recovery",
    "Founder Principles",
  ].forEach((section) => {
    assert.match(interactionStandardSource, new RegExp(`## .*${section}`));
  });
});

test("Interaction Standard protects guided native system action behavior", () => {
  assert.match(interactionStandardSource, /Law of Guided Interaction/);
  assert.match(interactionStandardSource, /Users should understand what will happen before Meetro invokes a native operating system action/);
  assert.match(interactionStandardSource, /A file picker will open/);
  assert.match(interactionStandardSource, /The first use may request microphone permission/);
  assert.match(interactionStandardSource, /Do not silently trigger native dialogs when user expectation is unclear/);
});

test("Interaction Standard documents hosted and Companion interaction rules", () => {
  assert.match(interactionStandardSource, /Hosted experiences are temporary surfaces/);
  assert.match(interactionStandardSource, /Outside click closes/);
  assert.match(interactionStandardSource, /Escape closes/);
  assert.match(interactionStandardSource, /Return to originating workspace/);
  assert.match(interactionStandardSource, /The Companion is a presence, not a destination/);
  assert.match(interactionStandardSource, /Never interrupting active work/);
});

test("Interaction Standard preserves desktop and mobile philosophy", () => {
  assert.match(interactionStandardSource, /Desktop should communicate capability without clutter/);
  assert.match(interactionStandardSource, /Desktop should feel like the same Meetro with more context available/);
  assert.match(interactionStandardSource, /Phone remains the canonical interaction model/);
  assert.match(interactionStandardSource, /Mobile remains the baseline/);
  assert.match(interactionStandardSource, /Do not introduce new workflows to satisfy interaction preference/);
});
