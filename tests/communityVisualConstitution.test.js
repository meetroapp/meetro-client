import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const visualConstitutionPath = new URL(
  "../docs/KnowledgeBase/MEETRO_COMMUNITY_VISUAL_CONSTITUTION.md",
  import.meta.url
);
const indexCssPath = new URL("../src/index.css", import.meta.url);

const visualConstitutionSource = fs.readFileSync(visualConstitutionPath, "utf8");
const indexCssSource = fs.readFileSync(indexCssPath, "utf8");

const purpleRetirementFiles = [
  "../src/pages/Login.jsx",
  "../src/pages/Home.jsx",
  "../src/pages/Profile.jsx",
  "../src/pages/BusinessDashboard.jsx",
  "../src/pages/BusinessAnalytics.jsx",
  "../src/pages/QuoteRequests.jsx",
  "../src/pages/ConversationThread.jsx",
  "../src/pages/MessagesInbox.jsx",
  "../src/pages/MyRequests.jsx",
  "../src/pages/ProjectDetails.jsx",
  "../src/pages/CompletionSheet.jsx",
  "../src/pages/ContractorDashboard.jsx",
  "../src/components/BottomNav.jsx",
  "../src/components/ServiceSelectorSheet.jsx",
  "../src/components/SafeBackBar.jsx",
  "../src/components/RouteErrorBoundary.jsx",
];

const legacyPurplePattern =
  /#5b3df5|#7c3aed|#8b5cf6|#4f46e5|#6366f1|rgba\(91,\s*61,\s*245|rgba\(124,\s*58,\s*237|rgba\(139,\s*92,\s*246|linear-gradient\([^;\n]*(#5b3df5|#7c3aed|#8b5cf6|#4f46e5|#6366f1)/;

test("Meetro Community Visual Constitution exists with required sections", () => {
  assert.ok(fs.existsSync(visualConstitutionPath));
  assert.match(visualConstitutionSource, /# Meetro Community Visual Constitution/);
  assert.match(visualConstitutionSource, /Status: Official visual identity foundation/);

  [
    "Visual Philosophy",
    "Emotional Design Principles",
    "Primary Color Palette",
    "Secondary Palette",
    "Background Colors",
    "Surface Colors",
    "Button Standards",
    "Card Standards",
    "Photography Standards",
    "Typography Standards",
    "Spacing Standards",
    "Corner Radius Standards",
    "Shadow Standards",
    "Icon Standards",
    "Hero Section Standards",
    "Empty State Standards",
    "Accessibility Notes",
    "Examples of Good Consistency",
    "Examples of Future Improvements",
    "Visual Do / Don't",
  ].forEach((section) => {
    assert.match(visualConstitutionSource, new RegExp(`## .*${section}`));
  });
});

test("visual constitution audits the required major Meetro surfaces", () => {
  [
    "Welcome Experience",
    "Home",
    "Community",
    "Businesses",
    "Hiring",
    "Spotlight",
    "Communication Center",
    "Homeowner Work Center",
    "Professional Work Center",
    "Meetro Moments",
    "Companion",
  ].forEach((surface) => {
    assert.match(visualConstitutionSource, new RegExp(surface));
  });
});

test("shared visual identity tokens exist in the global stylesheet", () => {
  [
    "--meetro-color-forest: #1f4d34",
    "--meetro-color-forest-deep: #14351f",
    "--meetro-color-sage: #dfe8d8",
    "--meetro-color-sage-soft: #eef4ea",
    "--meetro-color-cream: #fbf6ed",
    "--meetro-color-paper: #fffdf8",
    "--meetro-color-wood: #b7791f",
    "--meetro-color-coffee: #4a3428",
    "--meetro-color-charcoal: #172317",
    "--meetro-color-charcoal-soft: #273326",
    "--meetro-gradient-community-page",
    "--meetro-gradient-community-hero",
    "--meetro-gradient-community-action",
    "--meetro-gradient-selected-control",
    "--meetro-surface-paper",
    "--meetro-surface-warm",
    "--meetro-surface-sage",
    "--meetro-shadow-soft",
    "--meetro-shadow-lifted",
  ].forEach((token) => {
    assert.match(indexCssSource, new RegExp(token.replace(/[()]/g, "\\$&")));
  });
});

test("visual constitution documents purple retirement and interaction hierarchy", () => {
  [
    "Purple Retirement Rule",
    "Forest moves work forward",
    "Charcoal marks the current selection",
    "Amber communicates pending guidance",
    "Red communicates emergency",
    "Companion ambient presence",
    "premium, founding, or experimental accents",
  ].forEach((phrase) => {
    assert.match(visualConstitutionSource, new RegExp(phrase));
  });
});

test("visual constitution documents the public Welcome page standard", () => {
  [
    "Public Welcome Page Standard",
    "philosophy before features",
    "Meetro Community as the canonical public name",
    "guidance, presence, language, and light",
    "cartoon face or mascot",
    "generic marketplace, SaaS launch, category-first, AI-first",
  ].forEach((phrase) => {
    assert.match(visualConstitutionSource, new RegExp(phrase));
  });
});

test("audited core surfaces no longer use legacy purple as interaction styling", () => {
  purpleRetirementFiles.forEach((filePath) => {
    const source = fs.readFileSync(new URL(filePath, import.meta.url), "utf8");
    assert.doesNotMatch(source, legacyPurplePattern, filePath);
  });
});

test("selected and primary interaction tokens use charcoal and forest systems", () => {
  const selectedSources = [
    fs.readFileSync(new URL("../src/pages/Login.jsx", import.meta.url), "utf8"),
    fs.readFileSync(new URL("../src/components/BottomNav.jsx", import.meta.url), "utf8"),
    fs.readFileSync(new URL("../src/components/ServiceSelectorSheet.jsx", import.meta.url), "utf8"),
  ].join("\n");

  assert.match(selectedSources, /var\(--meetro-gradient-selected-control|var\(--meetro-color-charcoal/);
  assert.match(selectedSources, /var\(--meetro-color-forest/);
  assert.match(indexCssSource, /--meetro-gradient-selected-control/);
});

test("shared selected-card utilities use the warm community visual system", () => {
  assert.match(indexCssSource, /\.meetro-selected-card[\s\S]*var\(--meetro-color-forest\)/);
  assert.match(indexCssSource, /\.meetro-selected-card[\s\S]*var\(--meetro-surface-sage\)/);
  assert.match(indexCssSource, /\.meetro-selected-card-soft[\s\S]*var\(--meetro-surface-sage\)/);
  assert.match(indexCssSource, /\.meetro-selected-badge[\s\S]*var\(--meetro-color-forest\)/);
});

test("visual utility classes are available without changing routes or workflows", () => {
  [
    ".meetro-visual-page",
    ".meetro-visual-surface",
    ".meetro-visual-hero",
    ".meetro-visual-primary-button",
    ".meetro-visual-empty-state",
  ].forEach((className) => {
    assert.match(indexCssSource, new RegExp(className.replace(".", "\\.")));
  });

  assert.match(visualConstitutionSource, /Do not change workflow ownership/);
  assert.match(visualConstitutionSource, /Changing navigation or route structure/);
  assert.match(visualConstitutionSource, /You are home/);
});
