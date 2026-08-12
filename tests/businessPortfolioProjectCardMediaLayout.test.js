import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contractorDetailsSource = readFileSync(
  new URL("../src/pages/ContractorDetails.jsx", import.meta.url),
  "utf8"
);
const projectGallerySource = readFileSync(
  new URL("../src/pages/ProjectGallery.jsx", import.meta.url),
  "utf8"
);

function sourceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);

  assert.notEqual(start, -1, `Missing source start: ${startNeedle}`);
  assert.notEqual(end, -1, `Missing source end: ${endNeedle}`);

  return source.slice(start, end);
}

const publicPreviewBlock = sourceBetween(
  contractorDetailsSource,
  '{isSpanish ? "Vista previa del trabajo" : "Portfolio preview"}',
  '{isSpanish ? "Servicios ofrecidos" : "Services offered"}'
);
const publicProjectGalleryBlock = sourceBetween(
  contractorDetailsSource,
  'id="contractor-details-project-gallery"',
  '{isSpanish ? "Opciones existentes" : "Existing contact options"}'
);
const publicProjectCardMediaFrame = sourceBetween(
  contractorDetailsSource,
  "const portfolioCoverWrap = {",
  "const portfolioCoverImage = {"
);
const publicProjectCardImageStyle = sourceBetween(
  contractorDetailsSource,
  "const portfolioCoverImage = {",
  "const portfolioPhotoBadge = {"
);
const ownerPortfolioProjectsBlock = sourceBetween(
  projectGallerySource,
  'id="portfolio-projects-heading"',
  "<aside style={reviewSeparationCard}>"
);
const ownerProjectCardMediaFrame = sourceBetween(
  projectGallerySource,
  "const coverImageWrap = {",
  "const coverImageStyle = {"
);
const ownerProjectCardImageStyle = sourceBetween(
  projectGallerySource,
  "const coverImageStyle = {",
  "const photoCountBadge = {"
);

test("public upper portfolio preview remains the bounded thumbnail renderer", () => {
  assert.match(contractorDetailsSource, /const PORTFOLIO_PREVIEW_MAX_IMAGES = 5;/);
  assert.match(publicPreviewBlock, /portfolioPreviewImages\.map\(\(image\) =>/);
  assert.match(publicPreviewBlock, /style=\{portfolioPreviewThumbFrame\}/);
  assert.match(publicPreviewBlock, /style=\{portfolioPreviewThumbImage\}/);
  assert.doesNotMatch(publicPreviewBlock, /style=\{portfolioCoverWrap\}/);
  assert.doesNotMatch(publicPreviewBlock, /style=\{portfolioCoverImage\}/);
});

test("public lower Business Portfolio cards use bounded aspect-ratio media", () => {
  assert.match(publicProjectGalleryBlock, /const coverImage = projectImages\[0\];/);
  assert.match(publicProjectGalleryBlock, /style=\{portfolioCoverWrap\}/);
  assert.match(publicProjectGalleryBlock, /style=\{portfolioCoverImage\}/);
  assert.match(publicProjectCardMediaFrame, /width: "min\(320px, calc\(100% - 32px\)\)"/);
  assert.match(publicProjectCardMediaFrame, /aspectRatio: "16 \/ 9"/);
  assert.match(publicProjectCardMediaFrame, /overflow: "hidden"/);
  assert.match(publicProjectCardMediaFrame, /borderRadius: "18px"/);
  assert.doesNotMatch(publicProjectCardMediaFrame, /\bheight:/);
  assert.match(publicProjectCardImageStyle, /objectFit: "cover"/);
  assert.match(publicProjectCardImageStyle, /objectPosition: "center"/);
});

test("owner Portfolio project cards use the same bounded media contract", () => {
  assert.match(ownerPortfolioProjectsBlock, /const coverImage = projectImages\[0\];/);
  assert.match(ownerPortfolioProjectsBlock, /style=\{coverImageWrap\}/);
  assert.match(ownerPortfolioProjectsBlock, /style=\{coverImageStyle\}/);
  assert.match(ownerProjectCardMediaFrame, /width: "min\(320px, calc\(100% - 36px\)\)"/);
  assert.match(ownerProjectCardMediaFrame, /aspectRatio: "16 \/ 9"/);
  assert.match(ownerProjectCardMediaFrame, /overflow: "hidden"/);
  assert.match(ownerProjectCardMediaFrame, /borderRadius: "22px"/);
  assert.doesNotMatch(ownerProjectCardMediaFrame, /\bheight:/);
  assert.match(ownerProjectCardImageStyle, /objectFit: "cover"/);
  assert.match(ownerProjectCardImageStyle, /objectPosition: "center"/);
});

test("project details and actions remain directly attached to project card media", () => {
  assert.match(
    publicProjectGalleryBlock,
    /style=\{portfolioCoverImage\}[\s\S]*<div style=\{portfolioContent\}>/
  );
  assert.match(publicProjectGalleryBlock, /style=\{portfolioPhotoBadge\}/);
  assert.match(publicProjectGalleryBlock, /setSelectedProject\(project\)/);
  assert.match(publicProjectGalleryBlock, /setActiveProjectImage\(projectImages\[0\] \|\| ""\)/);
  assert.match(publicProjectGalleryBlock, /t\("viewPortfolioWork"\)/);

  assert.match(
    ownerPortfolioProjectsBlock,
    /style=\{coverImageStyle\}[\s\S]*<div style=\{projectContent\}>/
  );
  assert.match(ownerPortfolioProjectsBlock, /style=\{photoCountBadge\}/);
  assert.match(ownerPortfolioProjectsBlock, /openPortfolioProjectEditor\(project\)/);
  assert.match(ownerPortfolioProjectsBlock, /setFeaturedProject\(project, true\)/);
  assert.match(ownerPortfolioProjectsBlock, /isPortfolioActionAllowed\(project, "canEdit"\)/);
  assert.match(ownerPortfolioProjectsBlock, /Feature Project/);
  assert.doesNotMatch(ownerPortfolioProjectsBlock, /Spotlight/);
});

test("project card media correction does not introduce portfolio authority", () => {
  for (const block of [
    publicProjectGalleryBlock,
    publicProjectCardMediaFrame,
    publicProjectCardImageStyle,
    ownerPortfolioProjectsBlock,
    ownerProjectCardMediaFrame,
    ownerProjectCardImageStyle,
  ]) {
    assert.doesNotMatch(block, /fetch\(|authFetch|API_URL/);
    assert.doesNotMatch(block, /localStorage|sessionStorage/);
    assert.doesNotMatch(block, /FileReader|canvas|toDataURL|base64/i);
    assert.doesNotMatch(block, /upload|setItem|persist/i);
    assert.doesNotMatch(block, /https:\/\/getmeetro\.com|https:\/\/meetro/i);
  }
});
