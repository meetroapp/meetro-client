import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bottomNavSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
  "utf8"
);
const appSource = readFileSync(
  new URL("../src/App.jsx", import.meta.url),
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
const businessDashboardSource = readFileSync(
  new URL("../src/pages/BusinessDashboard.jsx", import.meta.url),
  "utf8"
);
const assetCenterSource = readFileSync(
  new URL("../src/pages/AssetCenter.jsx", import.meta.url),
  "utf8"
);
const customerRelationshipsCenterSource = readFileSync(
  new URL("../src/pages/CustomerRelationshipsCenter.jsx", import.meta.url),
  "utf8"
);
const contractorDashboardSource = readFileSync(
  new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
  "utf8"
);
const indexCssSource = readFileSync(
  new URL("../src/index.css", import.meta.url),
  "utf8"
);
const languageStandardSource = readFileSync(
  new URL("../docs/KnowledgeBase/MEETRO_LANGUAGE_STANDARD.md", import.meta.url),
  "utf8"
);
const sessionSource = readFileSync(
  new URL("../src/utils/session.js", import.meta.url),
  "utf8"
);

test("adaptive navigation keeps BottomNav for compact layouts and Sidebar for desktop", () => {
  assert.match(bottomNavSource, /className="bottom-nav-dock"/);
  assert.match(bottomNavSource, /aria-label=\{t\("navigationPrimaryMobile", language\)\}/);
  assert.match(bottomNavSource, /className="desktop-sidebar"/);
  assert.match(bottomNavSource, /aria-label=\{t\("navigationPrimaryDesktop", language\)\}/);
  assert.match(bottomNavSource, /\.desktop-sidebar \{\n\s+display: none;/);
  assert.match(bottomNavSource, /#root\[data-app-layout="desktop"\] \.desktop-sidebar \{/);
  assert.match(bottomNavSource, /#root\[data-app-layout="desktop"\] \.bottom-nav-dock \{/);
});

test("adaptive desktop navigation reuses the existing role-based destinations", () => {
  const personalDesktopBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const personalDesktopNavItems = ["),
    bottomNavSource.indexOf("const businessDesktopNavItems = [")
  );
  const businessDesktopBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const businessDesktopNavItems = ["),
    bottomNavSource.indexOf("useEffect(() => {\n    setKeyboardOpen")
  );

  for (const page of ["home", "myRequests", "messagesInbox", "meetroMoments", "discover", "profile"]) {
    assert.match(personalDesktopBlock, new RegExp(`page: "${page}"`));
  }

  for (const page of [
    "businessDashboard",
    "contractorDashboard",
    "messagesInbox",
    "meetroMoments",
    "assetCenter",
    "customerRelationshipsCenter",
    "discover",
    "profile",
  ]) {
    assert.match(businessDesktopBlock, new RegExp(`page: "${page}"`));
  }

  assert.match(personalDesktopBlock, /label: t\("navigationCommunication", language\)/);
  assert.match(personalDesktopBlock, /label: "Meetro Moments"/);
  assert.match(businessDesktopBlock, /label: t\("navigationCommunication", language\)/);
  assert.match(businessDesktopBlock, /label: "Meetro Moments"/);
  assert.doesNotMatch(businessDesktopBlock, /page: "businessLeads"/);
  assert.doesNotMatch(businessDesktopBlock, /page: "upload"/);
  assert.doesNotMatch(businessDesktopBlock, /page: "businessCommandCenter"/);
  assert.doesNotMatch(businessDesktopBlock, /page: "hiringCenter"/);
});

test("Community Discover is a shared destination and not an implicit role switch", () => {
  const businessDesktopBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const businessDesktopNavItems = ["),
    bottomNavSource.indexOf("useEffect(() => {\n    setKeyboardOpen")
  );
  const personalModeBlock = sessionSource.slice(
    sessionSource.indexOf("const personalModePages = new Set(["),
    sessionSource.indexOf("export function getAccountModeForPage")
  );

  assert.match(businessDesktopBlock, /page: "discover"/);
  assert.match(businessDesktopBlock, /label: t\("navigationCommunity", language\)/);
  assert.match(businessDesktopBlock, /sub: t\("navigationDiscover", language\)/);
  assert.doesNotMatch(personalModeBlock, /"discover"/);
});

test("mobile bottom navigation uses permanent platform destinations", () => {
  const personalMobileBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const personalMobileNavItems = ["),
    bottomNavSource.indexOf("const businessMobileNavItems = [")
  );
  const businessMobileBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const businessMobileNavItems = ["),
    bottomNavSource.indexOf("const personalDesktopNavItems = [")
  );

  for (const page of ["home", "myRequests", "messagesInbox", "meetroMoments", "profile"]) {
    assert.match(personalMobileBlock, new RegExp(`page: "${page}"`));
  }

  for (const label of [
    'label: t\\("navigationHome", language\\)',
    'label: t\\("navigationWorkCenter", language\\)',
    'label: t\\("navigationChat", language\\)',
    'label: t\\("navigationMoments", language\\)',
    'label: t\\("navigationProfile", language\\)',
  ]) {
    assert.match(personalMobileBlock, new RegExp(label));
  }

  for (const page of ["businessDashboard", "contractorDashboard", "messagesInbox", "meetroMoments", "profile"]) {
    assert.match(businessMobileBlock, new RegExp(`page: "${page}"`));
  }

  assert.doesNotMatch(personalMobileBlock, /page: "upload"/);
  assert.doesNotMatch(personalMobileBlock, /label: t\("upload"\)/);
  assert.doesNotMatch(personalMobileBlock, /page: "discover"/);
  assert.doesNotMatch(personalMobileBlock, /label: "Community"/);
  assert.doesNotMatch(businessMobileBlock, /page: "businessLeads"/);
  assert.doesNotMatch(businessMobileBlock, /label: t\("leads"\)/);
  assert.doesNotMatch(businessMobileBlock, /page: "discover"/);
  assert.doesNotMatch(businessMobileBlock, /label: "Community"/);
});

test("removed mobile nav actions remain reachable from their owning launch surfaces", () => {
  assert.match(homeSource, /onClick=\{\(\) => setPage\("upload"\)\}/);
  assert.match(homeSource, /t\("requestService"\)/);
  assert.match(businessDashboardSource, /setPage\("businessLeads"\)/);
  assert.match(businessDashboardSource, /text\.viewAllLeads/);
  assert.match(contractorDashboardSource, /setPage\("businessLeads"\)/);
});

test("navigation language standard documents short labels and full workspace titles", () => {
  assert.match(languageStandardSource, /Chat -> Communication Center/);
  assert.match(languageStandardSource, /Moments -> Meetro Moments/);
  assert.match(languageStandardSource, /Work -> Work Center/);
  assert.match(languageStandardSource, /Timeline -> Meetro Moments/);
  assert.match(languageStandardSource, /Request Service is an action/);
  assert.match(languageStandardSource, /Leads is an operational work queue/);
  assert.match(languageStandardSource, /Navigation is reserved for durable platform destinations/);
});

test("desktop sidebar and mobile dock share active state and navigation handlers", () => {
  assert.match(bottomNavSource, /const renderNavItem = \(item, variant = "bottom"\)/);
  assert.match(bottomNavSource, /const isNavItemActive = \(item\) =>/);
  assert.match(bottomNavSource, /const handleNavPress = \(item, variant = "bottom", event\) =>/);
  assert.match(bottomNavSource, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(bottomNavSource, /renderNavItem\(item, "sidebar"\)/);
  assert.match(bottomNavSource, /renderNavItem\(item, "bottom"\)/);
});

test("desktop Property and Relationships actions report their own active page state", () => {
  const businessDesktopBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const businessDesktopNavItems = ["),
    bottomNavSource.indexOf("useEffect(() => {\n    setKeyboardOpen")
  );

  assert.match(
    businessDesktopBlock,
    /page: "assetCenter"[\s\S]*aliases: \["assetCenter"\][\s\S]*label: t\("navigationProperties", language\)/
  );
  assert.match(
    businessDesktopBlock,
    /page: "customerRelationshipsCenter"[\s\S]*aliases: \["customerRelationshipsCenter"\][\s\S]*label: t\("navigationRelationships", language\)/
  );
  assert.match(assetCenterSource, /<BottomNav setPage=\{setPage\} currentPage="assetCenter" \/>/);
  assert.match(
    customerRelationshipsCenterSource,
    /<BottomNav setPage=\{setPage\} currentPage="customerRelationshipsCenter" \/>/
  );
  assert.doesNotMatch(assetCenterSource, /<BottomNav setPage=\{setPage\} currentPage="businessDashboard" \/>/);
  assert.doesNotMatch(
    customerRelationshipsCenterSource,
    /<BottomNav setPage=\{setPage\} currentPage="businessDashboard" \/>/
  );
  assert.match(appSource, /if \(page === "assetCenter"\) \{/);
  assert.match(appSource, /if \(page === "customerRelationshipsCenter"\) \{/);
});

test("desktop layout removes BottomNav reservation without changing mobile safe area rules", () => {
  assert.match(
    bottomNavSource,
    /padding: "5px 4px calc\(5px \+ env\(safe-area-inset-bottom\)\)"/
  );
  assert.match(
    bottomNavSource,
    /padding-bottom: max\(32px, env\(safe-area-inset-bottom, 0px\)\) !important;/
  );
  assert.match(indexCssSource, /--meetro-layout-sidebar-width: 284px/);
  assert.match(indexCssSource, /--meetro-sidebar-width: var\(--meetro-layout-sidebar-width\)/);
  assert.match(
    bottomNavSource,
    /width: calc\(100% - var\(--meetro-sidebar-width\)\) !important;/
  );
});

test("desktop navigation width supports full workspace labels", () => {
  assert.match(indexCssSource, /--meetro-layout-sidebar-width: 284px/);
  assert.match(bottomNavSource, /width: "calc\(var\(--meetro-sidebar-width, 284px\) - 36px\)"/);
  assert.match(bottomNavSource, /label: t\("navigationCommunication", language\)/);
  assert.match(bottomNavSource, /label: "Meetro Moments"/);
  assert.match(bottomNavSource, /label: t\("navigationProfileAccount", language\)/);
  assert.match(bottomNavSource, /whiteSpace: "normal"[\s\S]*textOverflow: "clip"/);
});

test("desktop Sidebar Profile opens a floating context card without replacing the workspace", () => {
  assert.match(bottomNavSource, /const \[profileContextCardOpen, setProfileContextCardOpen\] = useState\(false\)/);
  assert.match(
    bottomNavSource,
    /variant === "sidebar" && item\.page === "profile"[\s\S]*setProfileContextCardOpen\(\(open\) => !open\);[\s\S]*return;/
  );
  const profileOpenBranch = bottomNavSource.slice(
    bottomNavSource.indexOf('variant === "sidebar" && item.page === "profile"'),
    bottomNavSource.indexOf("setProfileContextCardOpen(false);")
  );
  assert.doesNotMatch(profileOpenBranch, /setPage\(/);
  assert.match(bottomNavSource, /aria-haspopup=\{item\.page === "profile" \? "dialog" : undefined\}/);
  assert.match(bottomNavSource, /<DesktopProfileCard[\s\S]*currentPage=\{normalizedPage\}/);
  assert.match(bottomNavSource, /className="desktop-profile-context-card"/);
  assert.match(bottomNavSource, /\.\.\.glassActionMenu/);
  assert.doesNotMatch(bottomNavSource, /desktop-profile-drawer|profileDrawer|aria-modal="true"/);
});

test("desktop hosted Profile card dismisses without route changes", () => {
  const profileOpenBranch = bottomNavSource.slice(
    bottomNavSource.indexOf('variant === "sidebar" && item.page === "profile"'),
    bottomNavSource.indexOf("setProfileContextCardOpen(false);")
  );
  assert.doesNotMatch(profileOpenBranch, /setPage\(/);
  assert.match(
    bottomNavSource,
    /if \(event\.key === "Escape"\) \{\s*setProfileContextCardOpen\(false\);/
  );
  assert.match(
    bottomNavSource,
    /className="desktop-profile-context-backdrop"[\s\S]*onClick=\{onClose\}/
  );
  assert.match(
    bottomNavSource,
    /style=\{profileContextCloseButton\}[\s\S]*onClick=\{onClose\}/
  );
});

test("mobile Profile page route remains available while desktop context card enhances Sidebar", () => {
  assert.match(
    appSource,
    /if \(page === "profile"\) \{\s*return withStartupChrome\(withAssistantLayer\(withSuspense\(<Profile setPage=\{setPage\} \/>\), page, setPage\), updateNotice\);/
  );
  assert.match(
    bottomNavSource,
    /onPointerUp=\{\(event\) => \{[\s\S]*handleNavPress\(item\);[\s\S]*\}\}/
  );
  assert.match(bottomNavSource, /className="bottom-nav-dock"/);
});

test("desktop profile context card hosts the existing Profile experience instead of a launcher", () => {
  assert.match(bottomNavSource, /const EmbeddedProfile = lazy\(\(\) => import\("\.\.\/pages\/Profile"\)\)/);
  assert.match(bottomNavSource, /className="desktop-profile-card-scroll"/);
  assert.match(bottomNavSource, /<Suspense fallback=\{<div style=\{profileCardLoading\}>\{t\("loading"\)\}<\/div>\}>/);
  assert.match(bottomNavSource, /<EmbeddedProfile[\s\S]*setPage=\{openFromProfileCard\}[\s\S]*embedded/);
  assert.match(bottomNavSource, /overflowY: "auto"/);
  assert.match(bottomNavSource, /maxHeight: "min\(82dvh, var\(--meetro-layout-hosted-max-height, 720px\)\)"/);
  assert.doesNotMatch(bottomNavSource, /function ProfileContextAction|<ProfileContextAction|label=\{t\("accountSettings"\)\}/);
  assert.match(profileSource, /function Profile\(\{ setPage, currentPage, embedded = false \}\)/);
  assert.match(profileSource, /const profileShellClassName = embedded[\s\S]*"profile-embedded-content"/);
  assert.match(profileSource, /const profileShellStyle = embedded \? embeddedPageWrapper : pageWrapper/);
  assert.match(profileSource, /\{!embedded && <BottomNav setPage=\{setPage\} currentPage="profile" \/>\}/);
});

test("hosted Profile actions still route to existing destinations instead of embedding them", () => {
  assert.match(
    bottomNavSource,
    /const openFromProfileCard = \(pageName\) => \{\s*onClose\(\);\s*setPage\(pageName\);/
  );
  assert.match(profileSource, /onClick=\{\(\) => setPage\("notifications"\)\}/);
  assert.match(profileSource, /setPage\("contractorProfile"\)/);
  assert.doesNotMatch(bottomNavSource, /<Notifications|<ContractorProfile|<Settings/);
});
