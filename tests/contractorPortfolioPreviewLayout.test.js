import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contractorDetailsSource = readFileSync(
  new URL("../src/pages/ContractorDetails.jsx", import.meta.url),
  "utf8"
);

function sourceBetween(startNeedle, endNeedle) {
  const start = contractorDetailsSource.indexOf(startNeedle);
  const end = contractorDetailsSource.indexOf(endNeedle, start);

  assert.notEqual(start, -1, `Missing source start: ${startNeedle}`);
  assert.notEqual(end, -1, `Missing source end: ${endNeedle}`);

  return contractorDetailsSource.slice(start, end);
}

const previewRenderBlock = sourceBetween(
  '{isSpanish ? "Vista previa del trabajo" : "Portfolio preview"}',
  '{isSpanish ? "Servicios ofrecidos" : "Services offered"}'
);

const previewStyleBlock = sourceBetween(
  "const portfolioPreviewStack = {",
  "const portfolioCard = {"
);

const galleryBlock = sourceBetween(
  'id="contractor-details-project-gallery"',
  '{isSpanish ? "Opciones existentes" : "Existing contact options"}'
);

test("contractor details portfolio preview uses bounded canonical media thumbnails", () => {
  assert.match(
    contractorDetailsSource,
    /const PORTFOLIO_PREVIEW_MAX_IMAGES = 5;/
  );
  assert.match(
    contractorDetailsSource,
    /const portfolioPreviewImages = portfolioProof\.mediaUrls\s*\.slice\(0, PORTFOLIO_PREVIEW_MAX_IMAGES\)/
  );
  assert.match(previewRenderBlock, /portfolioPreviewImages\.length > 0/);
  assert.match(previewRenderBlock, /portfolioPreviewImages\.map\(\(image\) =>/);
  assert.match(previewRenderBlock, /style=\{portfolioPreviewThumbFrame\}/);
  assert.match(previewRenderBlock, /style=\{portfolioPreviewThumbImage\}/);
  assert.doesNotMatch(previewRenderBlock, /portfolioProof\.featuredProject\?\.image_url/);
  assert.doesNotMatch(previewRenderBlock, /style=\{portfolioCoverWrap\}/);
  assert.doesNotMatch(previewRenderBlock, /style=\{portfolioCoverImage\}/);
});

test("portfolio preview thumbnails preserve aspect ratio cover clipping", () => {
  assert.match(previewStyleBlock, /display: "grid"/);
  assert.match(
    previewStyleBlock,
    /gridTemplateColumns: "repeat\(auto-fit, minmax\(132px, 148px\)\)"/
  );
  assert.match(previewStyleBlock, /justifyContent: "start"/);
  assert.match(previewStyleBlock, /maxWidth: "100%"/);
  assert.match(previewStyleBlock, /overflow: "hidden"/);
  assert.match(previewStyleBlock, /aspectRatio: "4 \/ 3"/);
  assert.match(previewStyleBlock, /borderRadius: "18px"/);
  assert.match(previewStyleBlock, /objectFit: "cover"/);
  assert.match(previewStyleBlock, /objectPosition: "center"/);
  assert.doesNotMatch(previewStyleBlock, /objectFit: "fill"/);
  assert.doesNotMatch(previewStyleBlock, /gridTemplateColumns: .*1fr/);
});

test("portfolio preview preserves canonical order and caps the row at five images", () => {
  const previewDataBlock = sourceBetween(
    "const portfolioPreviewProjectByUrl = new Map();",
    "const allowedForHomeownerContext ="
  );

  assert.match(
    previewDataBlock,
    /publicPortfolioProjects\.forEach\(\(project\) => \{/
  );
  assert.match(previewDataBlock, /getProjectImages\(project\)\.forEach/);
  assert.match(
    previewDataBlock,
    /portfolioProof\.mediaUrls\s*\.slice\(0, PORTFOLIO_PREVIEW_MAX_IMAGES\)/
  );
  assert.match(
    previewDataBlock,
    /portfolioProof\.mediaUrls\.length > PORTFOLIO_PREVIEW_MAX_IMAGES/
  );
});

test("view more photos remains centered and targets the existing gallery section", () => {
  assert.match(
    contractorDetailsSource,
    /function scrollToPortfolioGallery\(\) \{[\s\S]*scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/
  );
  assert.match(previewRenderBlock, /hasMorePortfolioPreviewImages &&/);
  assert.match(previewRenderBlock, /type="button"/);
  assert.match(previewRenderBlock, /style=\{portfolioPreviewMoreButton\}/);
  assert.match(previewRenderBlock, /onClick=\{scrollToPortfolioGallery\}/);
  assert.match(previewRenderBlock, /View more photos/);
  assert.match(
    contractorDetailsSource,
    /id="contractor-details-project-gallery"[\s\S]*<h2 style=\{sectionTitle\}>\{t\("projectGallery"\)\}<\/h2>/
  );
  assert.match(contractorDetailsSource, /justifySelf: "center"/);
});

test("existing full gallery card navigation stays isolated from preview styling", () => {
  assert.match(galleryBlock, /style=\{portfolioCoverWrap\}/);
  assert.match(galleryBlock, /style=\{portfolioCoverImage\}/);
  assert.match(galleryBlock, /setSelectedProject\(project\)/);
  assert.match(galleryBlock, /setActiveProjectImage\(projectImages\[0\] \|\| ""\)/);
  assert.match(galleryBlock, /style=\{portfolioOpenButton\}/);
  assert.match(galleryBlock, /t\("viewPortfolioWork"\)/);
});

test("preview images keep accessible alt text and lazy image loading", () => {
  assert.match(
    contractorDetailsSource,
    /const baseAlt = project\?\.title \|\| profileName \|\| t\("businessProfile"\);/
  );
  assert.match(previewRenderBlock, /alt=\{image.alt\}/);
  assert.match(previewRenderBlock, /loading="lazy"/);
});

test("portfolio preview does not introduce media ownership or persistence authority", () => {
  assert.doesNotMatch(previewRenderBlock, /fetch\(|authFetch|API_URL/);
  assert.doesNotMatch(previewRenderBlock, /localStorage|sessionStorage/);
  assert.doesNotMatch(previewRenderBlock, /FileReader|canvas|toDataURL|base64/i);
  assert.doesNotMatch(previewRenderBlock, /upload|setItem|persist/i);
  assert.doesNotMatch(previewRenderBlock, /setPage\(/);
  assert.doesNotMatch(previewRenderBlock, /https:\/\/getmeetro\.com|https:\/\/meetro/i);
});
