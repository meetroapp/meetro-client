import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const publicSource = readFileSync("src/pages/ContractorDetails.jsx", "utf8");
const ownerSource = readFileSync("src/pages/ProjectGallery.jsx", "utf8");
const presentationSource = readFileSync(
  "src/components/PortfolioProjectPresentation.jsx",
  "utf8"
);

function sourceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(start, -1, `Missing source start: ${startNeedle}`);
  assert.notEqual(end, -1, `Missing source end: ${endNeedle}`);
  return source.slice(start, end);
}

const mediaPreview = sourceBetween(
  presentationSource,
  "function ProjectMediaPreview",
  "export function PortfolioProjectGrid"
);
const sharedCard = sourceBetween(
  presentationSource,
  "export function PortfolioProjectCard",
  "export function PortfolioProjectView"
);
const sharedProjectView = sourceBetween(
  presentationSource,
  "export function PortfolioProjectView",
  "const projectGrid ="
);
const publicPortfolio = sourceBetween(
  publicSource,
  'id="contractor-details-project-gallery"',
  '{isSpanish ? "Opciones existentes" : "Existing contact options"}'
);
const ownerNormalPortfolio = sourceBetween(
  ownerSource,
  '{workspaceMode === "portfolio" ? (',
  '<section style={heroCard} aria-label="Portfolio management summary">'
);
const ownerManagement = sourceBetween(
  ownerSource,
  '<section style={heroCard} aria-label="Portfolio management summary">',
  '<aside style={reviewSeparationCard}>'
);

test("public and owner surfaces use the same shared Portfolio project-card architecture", () => {
  assert.match(publicPortfolio, /<PortfolioProjectGrid/);
  assert.match(publicPortfolio, /<PortfolioProjectCard/);
  assert.match(ownerNormalPortfolio, /<PortfolioProjectGrid/);
  assert.match(ownerNormalPortfolio, /<PortfolioProjectCard/);
  assert.match(ownerManagement, /<PortfolioProjectCard/);
  assert.match(sharedCard, /ProjectMediaPreview/);
  assert.match(sharedCard, /Proof of work/);
  assert.match(sharedCard, /View Project/);
});

test("compact media stays fixed at 16:9 while canonical photos change", () => {
  assert.match(mediaPreview, /getBusinessPortfolioProjectImages\(project\)/);
  assert.match(presentationSource, /const cardMediaFrame = \{/);
  assert.match(presentationSource, /aspectRatio: "16 \/ 9"/);
  assert.match(presentationSource, /overflow: "hidden"/);
  assert.match(presentationSource, /objectFit: "cover"/);
  assert.doesNotMatch(mediaPreview, /images\.map[\s\S]*<img[\s\S]*cardMediaFrame/);
});

test("multi-photo cards expose truthful count, keyboard buttons, and wraparound navigation", () => {
  assert.match(mediaPreview, /const multiple = images\.length > 1/);
  assert.match(mediaPreview, /Previous photo for \$\{title\}/);
  assert.match(mediaPreview, /Next photo for \$\{title\}/);
  assert.match(mediaPreview, /\{safeIndex \+ 1\} of \{images\.length\}/);
  assert.match(mediaPreview, /current <= 0 \? images\.length - 1 : current - 1/);
  assert.match(mediaPreview, /current >= images\.length - 1 \? 0 : current \+ 1/);
  assert.match(mediaPreview, /type="button"/);
  assert.match(mediaPreview, /aria-live="polite"/);
});

test("one-photo and no-photo projects do not fabricate carousel state", () => {
  assert.match(mediaPreview, /\{multiple && \(/);
  assert.match(mediaPreview, /No project photos yet/);
  assert.match(mediaPreview, /const activeImage = images\[safeIndex\] \|\| ""/);
  assert.doesNotMatch(mediaPreview, /mock|placeholder\.com|unsplash/i);
});

test("View Project uses exact canonical identity and exposes all ordered media read-only", () => {
  assert.match(sharedCard, /const exactProjectId = String\(project\?\.id \|\| ""\)/);
  assert.match(sharedCard, /onClick=\{\(\) => onView\?\.\(exactProjectId\)\}/);
  assert.match(ownerSource, /String\(project\.id\) === String\(projectId\)/);
  assert.match(publicSource, /String\(project\.id\) === String\(selectedProjectId\)/);
  assert.match(sharedProjectView, /ProjectMediaPreview project=\{project\} expanded/);
  assert.match(mediaPreview, /images\.map\(\(url, index\) =>/);
  assert.match(mediaPreview, /aria-pressed=\{index === safeIndex\}/);
  assert.doesNotMatch(sharedProjectView, /authFetch|fetch\(|PUT|POST|DELETE|localStorage/);
});

test("thumbnail selection uses one consistent border representation", () => {
  assert.match(
    presentationSource,
    /const thumbnailButton = \{[^\n]*border: "2px solid transparent"/
  );
  assert.match(
    presentationSource,
    /const activeThumbnailButton = \{ border: "2px solid var\(--meetro-color-forest, #1f4d34\)"/
  );
  assert.doesNotMatch(presentationSource, /const activeThumbnailButton = \{[^\n]*borderColor:/);
});

test("public Portfolio and Project View expose no owner management authority", () => {
  assert.match(publicSource, /<PortfolioProjectView/);
  assert.doesNotMatch(publicPortfolio, /managementContent|Edit Project|Publish|Archive|Feature|Reorder/);
  const publicProjectViewCall = sourceBetween(
    publicSource,
    "<PortfolioProjectView",
    "/>"
  );
  assert.doesNotMatch(publicProjectViewCall, /onManage|managementContent/);
});

test("professional normal view has one management command and management remains separate", () => {
  assert.match(ownerNormalPortfolio, /<button[^>]*onClick=\{openPortfolioManagement\}>\s*Edit Portfolio\s*<\/button>/);
  assert.doesNotMatch(ownerNormalPortfolio, /managementContent|openPortfolioProjectEditor|archiveProject|setFeaturedProject|reorderProject/);
  assert.match(ownerManagement, /managementContent=/);
  assert.match(ownerManagement, /openPortfolioProjectEditor\(project\)/);
});

test("management controls remain gated by exact server action booleans", () => {
  for (const action of [
    "canAdoptAsDraft",
    "canEdit",
    "canPublish",
    "canFeature",
    "canUnfeature",
    "canArchive",
    "canReorder",
  ]) {
    assert.match(ownerManagement, new RegExp(`isPortfolioActionAllowed\\(project, "${action}"\\)`));
  }
});

test("review trust is labeled business-level and no project rating is fabricated", () => {
  assert.match(presentationSource, /Business rating/);
  assert.match(presentationSource, /reviewCount/);
  assert.match(publicSource, /data\.stats\?\.average_rating/);
  assert.match(publicSource, /data\.stats\?\.total_reviews/);
  assert.doesNotMatch(presentationSource, /Project rating|project reviews|projectRating|project_rating/i);
});

test("shared cards are compact two-column-ready and mobile overflow-safe", () => {
  assert.match(presentationSource, /repeat\(auto-fill, minmax\(min\(100%, 390px\), 1fr\)\)/);
  assert.match(presentationSource, /minWidth: 0/);
  assert.match(ownerSource, /maxWidth: "1180px"/);
  assert.match(ownerSource, /overflowX: "hidden"/);
  assert.match(publicSource, /maxWidth: "900px"/);
  assert.match(publicSource, /overflowX: "hidden"/);
});

test("presentation component introduces no Portfolio authority or unrelated Emergency change", () => {
  assert.doesNotMatch(presentationSource, /authFetch|fetch\(|API_URL|localStorage|sessionStorage/);
  assert.doesNotMatch(presentationSource, /publish|archive|feature|reorder|upload|delete/i);
  assert.doesNotMatch(presentationSource, /emergency/i);
});
