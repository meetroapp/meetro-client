import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexCssSource = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);
const bottomNavSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const businessDashboardSource = readFileSync(
  new URL("../src/pages/BusinessDashboard.jsx", import.meta.url),
  "utf8"
);
const contractorDetailsSource = readFileSync(
  new URL("../src/pages/ContractorDetails.jsx", import.meta.url),
  "utf8"
);
const projectGallerySource = readFileSync(
  new URL("../src/pages/ProjectGallery.jsx", import.meta.url),
  "utf8"
);
const portfolioPresentationSource = readFileSync(
  new URL("../src/components/PortfolioProjectPresentation.jsx", import.meta.url),
  "utf8"
);
const contractorProfileSource = readFileSync(
  new URL("../src/pages/ContractorProfile.jsx", import.meta.url),
  "utf8"
);
const profileSource = readFileSync(
  new URL("../src/pages/Profile.jsx", import.meta.url),
  "utf8"
);
const homeSource = readFileSync(
  new URL("../src/pages/Home.jsx", import.meta.url),
  "utf8"
);
const myRequestsSource = readFileSync(
  new URL("../src/pages/MyRequests.jsx", import.meta.url),
  "utf8"
);
const uploadSource = readFileSync(
  new URL("../src/pages/Upload.jsx", import.meta.url),
  "utf8"
);
const projectDetailsSource = readFileSync(
  new URL("../src/pages/ProjectDetails.jsx", import.meta.url),
  "utf8"
);
const completedJobDetailsSource = readFileSync(
  new URL("../src/pages/CompletedJobDetails.jsx", import.meta.url),
  "utf8"
);
const messagesInboxSource = readFileSync(
  new URL("../src/pages/MessagesInbox.jsx", import.meta.url),
  "utf8"
);
const adaptiveStandardSource = readFileSync(
  new URL("../docs/KnowledgeBase/ADAPTIVE_LAYOUT_STANDARD.md", import.meta.url),
  "utf8"
);

function sourceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);

  assert.notEqual(start, -1, `Missing source start: ${startNeedle}`);
  assert.notEqual(end, -1, `Missing source end: ${endNeedle}`);

  return source.slice(start, end);
}

const desktopShellBlock = sourceBetween(
  bottomNavSource,
  '#root[data-app-layout="desktop"] .app-page,',
  '#root[data-app-layout="desktop"] .desktop-sidebar-item:focus-visible'
);

test("shared desktop workspace maximum-width token and utility exist", () => {
  assert.match(indexCssSource, /--meetro-workspace-max-width: 1480px;/);
  assert.match(
    indexCssSource,
    /\.meetro-standard-workspace \{[\s\S]*width: 100%;[\s\S]*max-width: var\(--meetro-workspace-max-width\);[\s\S]*margin-left: auto;[\s\S]*margin-right: auto;/
  );
  assert.match(
    adaptiveStandardSource,
    /\| `--meetro-workspace-max-width` \| `1480px` \| Absolute standard workspace expansion limit/
  );
});

test("desktop app shell centers standard pages inside the post-sidebar region", () => {
  assert.match(desktopShellBlock, /--meetro-page-available-width: calc\(100vw - var\(--meetro-sidebar-width\)\);/);
  assert.match(
    desktopShellBlock,
    /--meetro-page-resolved-max-width: min\(var\(--meetro-page-max-width\), var\(--meetro-workspace-max-width\)\);/
  );
  assert.match(
    desktopShellBlock,
    /--meetro-page-inline-extra: max\(0px, calc\(\(var\(--meetro-page-available-width\) - var\(--meetro-page-resolved-max-width\)\) \/ 2\)\);/
  );
  assert.match(
    desktopShellBlock,
    /width: min\(var\(--meetro-page-available-width\), var\(--meetro-page-resolved-max-width\)\) !important;/
  );
  assert.match(desktopShellBlock, /max-width: var\(--meetro-page-resolved-max-width\) !important;/);
  assert.match(
    desktopShellBlock,
    /margin-left: calc\(var\(--meetro-sidebar-width\) \+ var\(--meetro-page-inline-extra\)\) !important;/
  );
  assert.match(desktopShellBlock, /margin-right: var\(--meetro-page-inline-extra\) !important;/);
  assert.doesNotMatch(desktopShellBlock, /width: calc\(100% - var\(--meetro-sidebar-width\)\) !important;/);
  assert.doesNotMatch(desktopShellBlock, /margin-right: 0 !important;/);
});

test("standard surface classes bind to shared page-width tokens", () => {
  assert.match(desktopShellBlock, /\.meetro-responsive-page[\s\S]*--meetro-page-max-width: var\(--meetro-layout-content-max\);/);
  assert.match(desktopShellBlock, /\.meetro-readable-page[\s\S]*--meetro-page-max-width: var\(--meetro-layout-readable-max\);/);
  assert.match(desktopShellBlock, /\.meetro-form-page[\s\S]*--meetro-page-max-width: var\(--meetro-layout-form-max\);/);
  assert.match(desktopShellBlock, /\.meetro-wide-page[\s\S]*--meetro-page-max-width: var\(--meetro-layout-wide-max\);/);
});

test("standard workspaces consume the shared desktop shell classes", () => {
  assert.match(contractorDetailsSource, /className="app-page meetro-readable-page meetro-visual-page"/);
  assert.match(projectGallerySource, /className="app-page meetro-responsive-page"/);
  assert.match(contractorProfileSource, /className="app-page business-profile-page meetro-readable-page"/);
  assert.match(profileSource, /: "app-page meetro-readable-page meetro-visual-page"/);
  assert.match(homeSource, /className="app-page meetro-responsive-page"/);
  assert.match(myRequestsSource, /className="app-page meetro-responsive-page meetro-visual-page"/);
  assert.match(uploadSource, /className="app-page request-help-page upload-page meetro-form-page meetro-visual-page"/);
  assert.match(projectDetailsSource, /className="app-page meetro-readable-page"/);
  assert.match(completedJobDetailsSource, /className="app-page meetro-readable-page"/);
});

test("Business Dashboard uses the centered shared workspace calculation", () => {
  assert.match(
    businessDashboardSource,
    /--meetro-dashboard-workspace-max: min\(var\(--meetro-layout-wide-mid-max\), var\(--meetro-workspace-max-width\)\);/
  );
  assert.match(
    businessDashboardSource,
    /--meetro-dashboard-workspace-extra: max\(0px, calc\(\(100vw - var\(--meetro-sidebar-width\) - var\(--meetro-dashboard-workspace-max\)\) \/ 2\)\);/
  );
  assert.match(
    businessDashboardSource,
    /margin-left: calc\(var\(--meetro-sidebar-width\) \+ var\(--meetro-dashboard-workspace-extra\)\) !important;/
  );
  assert.match(businessDashboardSource, /margin-right: var\(--meetro-dashboard-workspace-extra\) !important;/);
  assert.doesNotMatch(businessDashboardSource, /1228px/);
});

test("Communication Center split shell explicitly opts out of standard maximum width", () => {
  assert.match(messagesInboxSource, /className="app-page meetro-wide-page meetro-visual-page messages-inbox-page"/);
  assert.match(
    desktopShellBlock,
    /\.messages-inbox-page,[\s\S]*\.messages-relationship-identity-page \{[\s\S]*--meetro-page-resolved-max-width: var\(--meetro-page-available-width\);[\s\S]*--meetro-page-inline-extra: 0px;/
  );
});

test("tablet and phone containment remain governed by existing mobile rules", () => {
  assert.match(indexCssSource, /@media \(max-width: 1099px\)/);
  assert.match(
    indexCssSource,
    /\.app-page,[\s\S]*\.meetro-responsive-page,[\s\S]*\.meetro-readable-page,[\s\S]*\.meetro-form-page,[\s\S]*\.meetro-wide-page,[\s\S]*width: 100% !important;[\s\S]*max-width: 100% !important;/
  );
  assert.match(bottomNavSource, /#root\[data-app-layout="desktop"\] \.desktop-sidebar/);
  assert.match(bottomNavSource, /#root\[data-app-layout="desktop"\] \.bottom-nav-dock \{[\s\S]*display: none !important;/);
});

test("portfolio project media rules stay bounded and are not reverted", () => {
  assert.match(contractorDetailsSource, /PortfolioProjectCard/);
  assert.match(projectGallerySource, /PortfolioProjectCard/);
  assert.match(portfolioPresentationSource, /width: "100%"/);
  assert.match(portfolioPresentationSource, /aspectRatio: "16 \/ 9"/);
  assert.doesNotMatch(portfolioPresentationSource, /const cardMediaFrame = \{[\s\S]*height: "(?:180|250)px"/);
});

test("workspace width governance does not add state, route, or viewport polling authority", () => {
  for (const block of [desktopShellBlock, indexCssSource]) {
    assert.doesNotMatch(block, /localStorage|sessionStorage/);
    assert.doesNotMatch(block, /fetch\(|authFetch|API_URL/);
    assert.doesNotMatch(block, /addEventListener\("resize"|visualViewport|setInterval|setTimeout/);
    assert.doesNotMatch(block, /setPage\(|window\.location|route/);
  }
});
