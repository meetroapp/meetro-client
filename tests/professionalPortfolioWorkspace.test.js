import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync("src/pages/ProjectGallery.jsx", "utf8");
const authority = readFileSync("src/utils/businessPortfolioAuthority.js", "utf8");

function sourceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  assert.notEqual(start, -1, `Missing source start: ${startNeedle}`);
  assert.notEqual(end, -1, `Missing source end: ${endNeedle}`);
  return source.slice(start, end);
}

test("owner workspace loads and reconciles canonical owner DTOs only", () => {
  assert.match(workspace, /"\/my-contractor-projects"/);
  assert.match(workspace, /BUSINESS_PORTFOLIO_LOADED/);
  assert.match(workspace, /setProjects\(projectsResult\.data\.projects\)/);
  assert.doesNotMatch(workspace, /getBusinessPortfolioProofProjection|readBusinessPortfolioStorage|persistBusinessPortfolioProjects/);
  assert.match(workspace, /useStorageFallback: false/);
});

test("all lifecycle and feature controls are gated by server action booleans", () => {
  for (const action of [
    "canAdoptAsDraft",
    "canEdit",
    "canPublish",
    "canArchive",
    "canFeature",
    "canUnfeature",
    "canReorder",
  ]) {
    assert.match(workspace, new RegExp(`isPortfolioActionAllowed\\(project, "${action}"\\)`));
  }
  assert.match(authority, /project\?\.actions\?\.\[action\] === true/);
});

test("new projects are saved as private Drafts without immediate-public claims", () => {
  const createBlock = sourceBetween(
    workspace,
    "async function handleCreateProject()",
    "async function handleSaveProjectEdit()"
  );
  assert.match(createBlock, /endpoint: "\/contractor-projects"/);
  assert.match(createBlock, /BUSINESS_PORTFOLIO_CREATED/);
  assert.match(createBlock, /publication_state === PORTFOLIO_PUBLICATION_STATE\.DRAFT/);
  assert.match(createBlock, /It is not public until you review and publish it/);
  assert.doesNotMatch(createBlock, /PUBLISHED|public immediately/);
  assert.match(workspace, /Saving creates a private Draft\. It does not publish the project\./);
});

test("existing project mutations carry expected version and conflicts reload canonical truth", () => {
  assert.match(workspace, /createExpectedVersionPayload\(editingProject\)/);
  assert.match(workspace, /createExpectedVersionPayload\(project\)/);
  assert.match(workspace, /createPortfolioReorderPayload\(profile\?\.id, orderedProjects\)/);
  assert.match(workspace, /isPortfolioVersionConflict\(result\)/);
  assert.match(workspace, /await refreshAfterVersionConflict\(\)/);
  assert.match(workspace, /await fetchCanonicalProjects\(\)/);
  assert.match(workspace, /review it before trying again/);
  assert.doesNotMatch(workspace, /PORTFOLIO_VERSION_CONFLICT[\s\S]*retry\(/i);
});

test("publication and published edits submit fresh certified privacy confirmation", () => {
  assert.match(authority, /"portfolio-publication-v1"/);
  assert.match(workspace, /privacy_confirmation: createPortfolioPrivacyConfirmation\(\)/);
  assert.match(workspace, /setPublishedEditPrivacyConfirmed\(false\)/);
  assert.match(workspace, /onMutation=\{\(\) => setPublishedEditPrivacyConfirmed\(false\)\}/);
  assert.match(
    workspace,
    /setEditTitle\(event\.target\.value\);\s*setPublishedEditPrivacyConfirmed\(false\)/
  );
  assert.match(
    workspace,
    /setEditDescription\(event\.target\.value\);\s*setPublishedEditPrivacyConfirmed\(false\)/
  );
  assert.match(workspace, /Published changes require fresh privacy confirmation/);
  for (const requiredCopy of [
    "customer identity",
    "exact customer or property address",
    "private communications",
    "pricing, commercial terms, invoices, or payments",
    "private findings or workflow records",
    "unauthorized job media",
    "other customer-identifying information",
  ]) {
    assert.match(workspace, new RegExp(requiredCopy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(workspace, /disabled=\{busy \|\| !privacyConfirmed\}/);
  assert.match(workspace, /Success is shown only after server confirmation/);
});

test("archive is a preserving lifecycle command and no permanent delete exists", () => {
  const archiveBlock = sourceBetween(
    workspace,
    "async function archiveProject(project)",
    "async function setFeaturedProject(project, featured)"
  );
  assert.match(archiveBlock, /\/archive/);
  assert.match(archiveBlock, /preserving the project record and its media/);
  assert.doesNotMatch(archiveBlock, /cleanupBusinessPortfolioMedia|delete|DELETE/);
  assert.doesNotMatch(workspace, /Delete Project|Permanently Delete/);
});

test("feature controls use Portfolio authority and make no Spotlight claim", () => {
  assert.match(workspace, /Feature Project/);
  assert.match(workspace, /Remove Featured Project/);
  assert.match(workspace, /featured \? "feature" : "unfeature"/);
  assert.match(workspace, /PORTFOLIO_PROJECT_FEATURED/);
  assert.match(workspace, /PORTFOLIO_PROJECT_UNFEATURED/);
  assert.doesNotMatch(workspace, /Spotlight|spotlightFeatured|featuredInSpotlight|useInSpotlight/);
});

test("project order persists through the server with accessible non-drag controls", () => {
  const reorderBlock = sourceBetween(
    workspace,
    "async function reorderProject(project, direction)",
    "if (loading)"
  );
  assert.match(reorderBlock, /"\/contractor-projects\/reorder"/);
  assert.match(reorderBlock, /method: "PUT"/);
  assert.match(reorderBlock, /PORTFOLIO_PROJECTS_REORDERED/);
  assert.match(workspace, /aria-label=\{`Move \$\{project\.title \|\| "project"\} earlier`\}/);
  assert.match(workspace, /aria-label=\{`Move \$\{project\.title \|\| "project"\} later`\}/);
  assert.match(workspace, /Project order saved and reconciled with the server/);
  assert.doesNotMatch(reorderBlock, /setProjects\(/);
});

test("governed media rules and canonical image order remain intact", () => {
  assert.match(workspace, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(workspace, /validateBusinessPortfolioFiles/);
  assert.match(workspace, /portfolio_media: portfolioMedia/);
  assert.match(workspace, /reorderBusinessPortfolioMedia/);
  assert.match(workspace, /uploadBusinessPortfolioFiles/);
  assert.match(workspace, /cleanupBusinessPortfolioMedia/);
  assert.match(workspace, /10 MB/);
  assert.match(workspace, /12 photos/);
});

test("business reviews and completed-job promotion remain separate", () => {
  assert.match(workspace, /Business reviews stay business-level/);
  assert.match(workspace, /Reviews are not repeated as project ratings/);
  assert.doesNotMatch(workspace, /mostRecentReview|reviewStorage|projectRating|project_rating/);
  assert.doesNotMatch(workspace, /addPhotosFromCompletedJobs|completed job/i);
});

test("workspace and dialogs preserve responsive and accessible containment", () => {
  assert.match(workspace, /className="app-page meetro-responsive-page"/);
  assert.match(workspace, /maxWidth: "1120px"/);
  assert.match(workspace, /overflowX: "hidden"/);
  assert.match(workspace, /width: "min\(100%, 680px\)"/);
  assert.match(workspace, /maxWidth: "100%"/);
  assert.match(workspace, /aria-modal="true"/);
  assert.match(workspace, /aria-labelledby="create-portfolio-project-title"/);
  assert.match(workspace, /aria-labelledby="edit-portfolio-project-title"/);
  assert.match(workspace, /aria-labelledby="publish-portfolio-project-title"/);
  assert.match(workspace, /aria-live="polite"/);
  assert.match(workspace, /minHeight: "44px"/);
});
