import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const standardSource = fs.readFileSync(
  new URL("../docs/KnowledgeBase/ADAPTIVE_LAYOUT_STANDARD.md", import.meta.url),
  "utf8"
);
const indexCssSource = fs.readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);
const bottomNavSource = fs.readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);

test("adaptive layout standard document defines desktop layout contracts", () => {
  assert.match(standardSource, /# Adaptive Layout Standard/);
  assert.match(standardSource, /Official Workspace Width/);
  assert.match(standardSource, /Official Spacing System/);
  assert.match(standardSource, /Card Spacing/);
  assert.match(standardSource, /Section Spacing/);
  assert.match(standardSource, /Grid Rules/);
  assert.match(standardSource, /Hosted Experience Positioning/);
  assert.match(standardSource, /Companion Positioning/);
  assert.match(standardSource, /Mobile Protection/);
});

test("shared adaptive layout tokens remain present in the global stylesheet", () => {
  const requiredTokens = [
    "--meetro-layout-sidebar-width: 284px",
    "--meetro-layout-content-max: 1120px",
    "--meetro-layout-wide-mid-max: 1280px",
    "--meetro-layout-wide-max: 1360px",
    "--meetro-layout-readable-mid-max: 920px",
    "--meetro-layout-readable-max: 960px",
    "--meetro-layout-form-max: 860px",
    "--meetro-layout-grid-gap-compact: 14px",
    "--meetro-layout-grid-gap: 16px",
    "--meetro-layout-section-gap: 24px",
    "--meetro-layout-card-padding: 18px",
    "--meetro-layout-card-radius: 24px",
    "--meetro-layout-hosted-width: 414px",
    "--meetro-layout-companion-width: 388px",
    "--meetro-layout-desktop-gutter: 32px",
  ];

  requiredTokens.forEach((token) => {
    assert.match(indexCssSource, new RegExp(token.replace(/[()]/g, "\\$&")));
  });
});

test("adaptive shells use shared width and spacing tokens instead of hard-coded desktop sizing", () => {
  assert.match(indexCssSource, /\.meetro-responsive-page[\s\S]*max-width: var\(--meetro-layout-content-max\) !important;/);
  assert.match(indexCssSource, /\.meetro-wide-page[\s\S]*max-width: var\(--meetro-layout-wide-mid-max\) !important;/);
  assert.match(indexCssSource, /\.meetro-readable-page,[\s\S]*\.meetro-form-page[\s\S]*max-width: var\(--meetro-layout-readable-mid-max\) !important;/);
  assert.match(indexCssSource, /\.meetro-form-page[\s\S]*max-width: var\(--meetro-layout-form-max\) !important;/);
  assert.match(indexCssSource, /\.meetro-responsive-grid[\s\S]*gap: var\(--meetro-layout-grid-gap-compact\);/);
  assert.match(indexCssSource, /gap: var\(--meetro-layout-grid-gap\);/);
  assert.match(indexCssSource, /\.meetro-wide-page[\s\S]*max-width: var\(--meetro-layout-wide-max\) !important;/);
});

test("hosted and companion desktop surfaces use the adaptive layout standard", () => {
  assert.match(bottomNavSource, /width: "calc\(var\(--meetro-sidebar-width, 284px\) - 36px\)"/);
  assert.match(bottomNavSource, /width: "min\(var\(--meetro-layout-hosted-width, 414px\), calc\(100vw - 40px\)\)"/);
  assert.match(bottomNavSource, /maxHeight: "min\(82dvh, var\(--meetro-layout-hosted-max-height, 720px\)\)"/);
  assert.match(indexCssSource, /width: min\(var\(--meetro-layout-companion-width\), calc\(100vw - var\(--meetro-sidebar-width, 0px\) - \(var\(--meetro-layout-desktop-gutter\) \* 2\)\)\) !important;/);
  assert.match(indexCssSource, /max-height: min\(82dvh, var\(--meetro-layout-companion-max-height\)\) !important;/);
});

test("adaptive layout standard explicitly protects mobile behavior", () => {
  assert.match(standardSource, /Phone remains the source of truth\./);
  assert.match(standardSource, /BottomNav behavior/);
  assert.match(standardSource, /Mobile route flow/);
  assert.match(standardSource, /Mobile safe-area handling/);
  assert.match(indexCssSource, /@media \(max-width: 1099px\)/);
  assert.match(bottomNavSource, /className="bottom-nav-dock"/);
  assert.match(bottomNavSource, /aria-label="Primary mobile navigation"/);
});
