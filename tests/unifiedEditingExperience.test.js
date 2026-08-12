import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("unified editing foundation documents the temporary editor contract", () => {
  const doc = fs.readFileSync(
    "docs/KnowledgeBase/UNIFIED_EDITING_EXPERIENCE_FOUNDATION.md",
    "utf8"
  );

  assert.match(doc, /Workspaces own navigation/);
  assert.match(doc, /Objects open temporary editors/);
  assert.match(doc, /Editors preserve context/);
  assert.match(doc, /Business Profile -> Services Offered/);
  assert.match(doc, /Portfolio item editor/);
  assert.match(doc, /Business Hours editor/);
  assert.match(doc, /License Information editor/);
  assert.match(doc, /Work Center object editors/);
  assert.match(doc, /This foundation does not:[\s\S]*Change storage/);
  assert.match(doc, /This foundation does not:[\s\S]*Change lifecycle/);
});

test("Service Selector remains the reference viewport-owned editor pattern", () => {
  const selectorSource = fs.readFileSync(
    "src/components/ServiceSelectorSheet.jsx",
    "utf8"
  );
  const profileSource = fs.readFileSync("src/pages/ContractorProfile.jsx", "utf8");

  assert.match(selectorSource, /createPortal\(sheetNode, document\.body\)/);
  assert.match(selectorSource, /position: "fixed"/);
  assert.match(selectorSource, /scrollPositionRef/);
  assert.match(selectorSource, /window\.scrollTo\(scrollPosition\.x, scrollPosition\.y\)/);
  assert.match(selectorSource, /role="dialog"/);
  assert.match(selectorSource, /aria-modal="true"/);
  assert.match(selectorSource, /footerCancelButton/);
  assert.match(selectorSource, /footerDoneButton/);
  assert.match(profileSource, /placement="center"/);
  assert.match(
    profileSource,
    /doneLabel=\{onSave \? `\$\{t\("save"\)\}\$\{saving \? "…" : ""\}` : t\("done"\)\}/
  );
  assert.match(profileSource, /doneDisabled=\{saving\}/);
  assert.match(profileSource, /statusMessage=\{saving \? `\$\{t\("save"\)\}…` : saveError\}/);
});

test("Portfolio item editor follows the temporary editor contract", () => {
  const source = fs.readFileSync("src/pages/ProjectGallery.jsx", "utf8");

  assert.match(source, /import \{ createPortal \} from "react-dom"/);
  assert.match(source, /portfolioEditorScrollRef/);
  assert.match(source, /window\.scrollTo\(scrollPosition\.x, scrollPosition\.y\)/);
  assert.match(source, /function openPortfolioProjectEditor\(project\)/);
  assert.match(source, /function closePortfolioProjectEditor\(\)/);
  assert.match(source, /createPortal\(/);
  assert.match(source, /document\.body/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /style=\{editorBackdrop\}/);
  assert.match(source, /style=\{portfolioEditorSheet\}/);
  assert.match(source, /style=\{editorFooter\}/);
  assert.match(source, />Cancel<\/button>/);
  assert.match(source, /Save changes/);
  assert.doesNotMatch(source, /Back to Portfolio/);
  assert.doesNotMatch(source, /Volver al portafolio/);
  assert.doesNotMatch(source, /Edit Portfolio Item/);
  assert.doesNotMatch(source, /if \(editingProject\)[\s\S]*return \(/);
});

test("Portfolio Add Project opens as a temporary editor instead of an embedded form", () => {
  const source = fs.readFileSync("src/pages/ProjectGallery.jsx", "utf8");

  assert.match(source, /const \[creatingProject, setCreatingProject\] = useState\(false\)/);
  assert.match(source, /function openCreateProjectEditor\(\)/);
  assert.match(source, /function closeCreateProjectEditor\(\)/);
  assert.match(source, /setCreatingProject\(true\)/);
  assert.match(source, /setCreatingProject\(false\)/);
  assert.match(source, /creatingProject && typeof document !== "undefined" &&\s*createPortal\(/);
  assert.match(source, /aria-labelledby="create-portfolio-project-title"/);
  assert.match(source, /onClick=\{openCreateProjectEditor\}/);
  assert.match(source, /onClick=\{handleCreateProject\}/);
  assert.match(source, /Add governed Portfolio photos/);
  assert.match(source, /Save Draft/);
  assert.match(source, /portfolioEditorScrollRef/);
  assert.doesNotMatch(source, /openPhotos/);
  assert.doesNotMatch(source, /pendingCreatePhotoPickerRef/);

  const pageBodyBeforePortal = source.slice(
    source.indexOf("<BottomNav setPage={setPage} currentPage=\"projectGallery\" />"),
    source.indexOf("{editingProject && typeof document")
  );
  assert.match(pageBodyBeforePortal, /creatingProject/);

  const scrollPageBeforeBottomNav = source.slice(
    source.indexOf("{profile && ("),
    source.indexOf("<BottomNav setPage={setPage} currentPage=\"projectGallery\" />")
  );
  assert.doesNotMatch(scrollPageBeforeBottomNav, /style=\{uploadCard\}/);

  const actionGridBlock = source.slice(
    source.indexOf("<div style={portfolioActionGrid}>"),
    source.indexOf("<section style={contentSection}>")
  );
  assert.match(actionGridBlock, /Add Project Draft/);
  assert.doesNotMatch(actionGridBlock, /\{t\("addPhotos"\)\}/);
});

test("Portfolio hero keeps long business names subordinate to portfolio proof", () => {
  const source = fs.readFileSync("src/pages/ProjectGallery.jsx", "utf8");

  assert.match(source, /const heroIdentityBlock = \{/);
  assert.match(source, /minWidth: 0/);
  assert.match(source, /fontSize: "clamp\(21px, 6vw, 28px\)"/);
  assert.match(source, /overflowWrap: "break-word"/);
  assert.match(source, /const heroProofStack = \{/);
  assert.match(source, /flex: "0 0 auto"/);
  assert.match(source, /minWidth: "82px"/);

  const heroTitleBlock = source.slice(
    source.indexOf("const heroTitle = {"),
    source.indexOf("const heroSubtitle = {")
  );
  assert.doesNotMatch(heroTitleBlock, /fontSize: "28px"/);
});

test("Portfolio feature truth is server-owned and preview controls respect safe area", () => {
  const source = fs.readFileSync("src/pages/ProjectGallery.jsx", "utf8");

  const projectCardRenderBlock = source.slice(
    source.indexOf("<article\n                  key={project.id}"),
    source.indexOf("{coverImage ? (")
  );
  assert.doesNotMatch(projectCardRenderBlock, /meetro-selected-card/);
  assert.match(projectCardRenderBlock, /project\.is_featured \? projectCardFeatured/);
  assert.doesNotMatch(source, /useInSpotlight|featuredInSpotlight|spotlightFeatured/);

  const featuredStyleBlock = source.slice(
    source.indexOf("const projectCardFeatured = {"),
    source.indexOf("const coverImageWrap = {")
  );
  assert.match(featuredStyleBlock, /border: "1px solid rgba\(31,77,52,0\.38\)"/);
  assert.doesNotMatch(featuredStyleBlock, /0 0 0 4px/);
  assert.doesNotMatch(featuredStyleBlock, /border: "2px solid #5b3df5"/);

  assert.match(source, /const closePreviewBtn = \{[\s\S]*env\(safe-area-inset-top/);
  assert.match(source, /const closePreviewBtn = \{[\s\S]*env\(safe-area-inset-right/);
});
