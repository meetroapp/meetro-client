import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  getAccountModeForPage,
  syncAccountModeForPage,
} from "../src/utils/session.js";
import { t } from "../src/utils/language.js";
import {
  getCommunityDiscoveryInterestsFromTaxonomy,
  resolveCommunityDiscoveryInterestForSearch,
  searchCommunityTaxonomyAliases,
} from "../src/utils/communityTaxonomy.js";

const discoverSource = readFileSync(
  new URL("../src/pages/Discover.jsx", import.meta.url),
  "utf8"
);
const bottomNavSource = readFileSync(
  new URL("../src/components/BottomNav.jsx", import.meta.url),
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
const duplicateCommunityPageUrl = new URL(
  "../src/pages/Community.jsx",
  import.meta.url
);

function installStorage() {
  const store = new Map();

  global.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  global.window = {
    dispatchEvent: () => true,
  };
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };

  return store;
}

test("professional Community navigation does not switch to standard mode", () => {
  installStorage();
  localStorage.setItem("isProfessional", "true");
  localStorage.setItem("accountType", "professional");
  localStorage.setItem("userRole", "handyman");
  localStorage.setItem("businessCategory", "handyman");
  localStorage.setItem("activeAccountMode", "business");

  assert.equal(getAccountModeForPage("discover", "business"), "business");
  assert.equal(syncAccountModeForPage("discover"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "business");
  assert.equal(localStorage.getItem("accountType"), "professional");
  assert.equal(localStorage.getItem("userRole"), "handyman");
});

test("standard Community navigation remains standard", () => {
  installStorage();
  localStorage.setItem("accountType", "homeowner");
  localStorage.setItem("userRole", "homeowner");
  localStorage.setItem("activeAccountMode", "personal");

  assert.equal(getAccountModeForPage("discover", "personal"), "personal");
  assert.equal(syncAccountModeForPage("discover"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "personal");
  assert.equal(localStorage.getItem("accountType"), "homeowner");
  assert.equal(localStorage.getItem("userRole"), "homeowner");
});

test("Community landing renders human Community copy and progressive preview sections", () => {
  assert.match(discoverSource, /useState\("communityHub"\)/);
  assert.doesNotMatch(discoverSource, /localStorage\.getItem\("activeDiscoverMode"\)/);
  assert.match(discoverSource, /const renderCommunityHub = \(\) =>/);
  assert.match(discoverSource, /t\("communityTitle", language\)/);
  assert.match(discoverSource, /t\("communityGuideQuestion", language\)/);
  assert.match(discoverSource, /t\("communitySubtitle", language\)/);
  assert.equal(t("communityTitle", "en"), "Community");
  assert.equal(
    t("communityGuideQuestion", "en"),
    "What would you like to discover today?"
  );
  assert.equal(
    t("communitySubtitle", "en"),
    "Explore the people, opportunities, and stories that make your community stronger."
  );
  assert.doesNotMatch(discoverSource, /without changing your account mode/);
  assert.match(discoverSource, /t\("communityBusinessesTitle", language\)/);
  assert.match(discoverSource, /t\("communityBusinessesCopy", language\)/);
  assert.equal(t("communityBusinessesTitle", "en"), "Businesses");
  assert.equal(
    t("communityBusinessesCopy", "en"),
    "Discover people and businesses ready to help your community."
  );
  assert.match(discoverSource, /t\("communityHiringTitle", language\)/);
  assert.match(discoverSource, /t\("communityHiringCopy", language\)/);
  assert.equal(t("communityHiringTitle", "en"), "Hiring");
  assert.equal(
    t("communityHiringCopy", "en"),
    "Find your next teammate, opportunity, or collaboration."
  );
  assert.match(discoverSource, /t\("communitySpotlightTitle", language\)/);
  assert.match(discoverSource, /t\("communitySpotlightCopy", language\)/);
  assert.equal(t("communitySpotlightTitle", "en"), "Spotlight");
  assert.equal(t("communitySpotlightCopy", "en"), "Discover today’s featured community story.");
  assert.match(discoverSource, /style=\{communityPreviewStack\}/);
  assert.match(discoverSource, /\.\.\.communityPreviewSection/);
  assert.match(discoverSource, /style=\{communityBusinessPreviewGrid\}/);
  assert.match(discoverSource, /style=\{communityWarmEmptyCard\}/);
  assert.match(discoverSource, /style=\{communityHiringGrid\}/);
  assert.match(discoverSource, /style=\{communitySpotlightCard\}/);
  assert.match(discoverSource, /style=\{communitySpotlightCue\}/);
  assert.match(discoverSource, /style=\{communitySpotlightMeta\}/);
});

test("Community preview actions expand progressively without route changes", () => {
  const hubBlock = discoverSource.slice(
    discoverSource.indexOf("const renderCommunityHub = () =>"),
    discoverSource.indexOf("const renderSpotlightSection = () =>")
  );

  assert.match(discoverSource, /const COMMUNITY_PREVIEW_LIMIT = 3/);
  assert.match(discoverSource, /const COMMUNITY_SPOTLIGHT_PREVIEW_LIMIT = 1/);
  assert.match(discoverSource, /expandedCommunitySections/);
  assert.match(discoverSource, /toggleCommunitySectionExpansion/);
  assert.match(discoverSource, /setExpandedCommunitySections\(collapsedCommunitySections\)/);
  assert.match(hubBlock, /toggleCommunitySectionExpansion\("professionals"\)/);
  assert.match(hubBlock, /toggleCommunitySectionExpansion\("spotlight"\)/);
  assert.doesNotMatch(hubBlock, /openCommunitySection\("businessDirectory"\)/);
  assert.doesNotMatch(hubBlock, /setPage\("jobsHiring"\)/);
  assert.doesNotMatch(hubBlock, /openCommunitySection\("spotlight"\)/);
  assert.doesNotMatch(discoverSource, /IntersectionObserver|onscroll|onScroll|infinite/i);
  assert.equal(t("communityExploreMoreProfessionals", "en"), "Explore More Professionals");
  assert.equal(t("communityShowFewerProfessionals", "en"), "Show Fewer Professionals");
  assert.equal(t("communityExploreMoreOpportunities", "en"), "Explore More Opportunities");
  assert.equal(t("communityShowFewerOpportunities", "en"), "Show Fewer Opportunities");
  assert.equal(t("communityExploreMoreStories", "en"), "Explore More Stories");
  assert.equal(t("communityShowFewerStories", "en"), "Show Fewer Stories");
});

test("Community Discovery Bar renders search, interests, and first-visit prompt", () => {
  assert.match(discoverSource, /const \[selectedDiscoveryInterests, setSelectedDiscoveryInterests\] = useState/);
  assert.match(discoverSource, /meetroCommunityDiscoveryInterests/);
  assert.match(discoverSource, /meetroCommunityDiscoveryInterestsSeen/);
  assert.match(discoverSource, /getCommunityDiscoveryInterestsFromTaxonomy/);
  assert.doesNotMatch(discoverSource, /const discoveryInterests = \[/);
  const discoveryInterests = getCommunityDiscoveryInterestsFromTaxonomy({
    translate: (_key, fallback) => fallback,
  });
  assert.ok(discoveryInterests.find((interest) => interest.id === "home_services"));
  assert.ok(discoveryInterests.find((interest) => interest.id === "property_management"));
  assert.ok(discoveryInterests.find((interest) => interest.id === "marketing"));
  assert.ok(discoveryInterests.find((interest) => interest.id === "healthcare"));
  assert.ok(discoveryInterests.find((interest) => interest.id === "transportation"));
  assert.equal(discoveryInterests.some((interest) => interest.id === "hiring"), false);
  assert.equal(
    discoveryInterests.some((interest) => /hiring/i.test(interest.label)),
    false
  );
  assert.match(discoverSource, /const renderDiscoveryBar = \(\) =>/);
  const discoveryBarBlock = discoverSource.slice(
    discoverSource.indexOf("const renderDiscoveryBar = () =>"),
    discoverSource.indexOf("const renderCommunityHub = () =>")
  );
  assert.match(discoverSource, /position: "sticky"/);
  assert.match(discoverSource, /top: "calc\(env\(safe-area-inset-top, 0px\) \+ 10px\)"/);
  assert.match(discoverSource, /WebkitBackdropFilter: "blur\(16px\)"/);
  assert.match(discoverSource, /flexWrap: "nowrap"/);
  assert.match(discoverSource, /overflowX: "auto"/);
  assert.match(discoverSource, /minHeight: "42px"/);
  assert.match(discoverSource, /t\("communityDiscoverySearchPlaceholder", language\)/);
  assert.match(discoverSource, /getDiscoveryContext/);
  assert.match(discoverSource, /communityDiscoveryContext/);
  assert.match(discoverSource, /aria-live="polite"/);
  assert.match(discoverSource, /gap: "20px"/);
  assert.match(discoverSource, /marginTop: "2px"/);
  assert.match(discoverSource, /aria-pressed=\{selected\}/);
  assert.match(discoverSource, /toggleDiscoveryInterest\(interest\.id\)/);
  assert.match(discoverSource, /skipDiscoveryInterests/);
  assert.doesNotMatch(discoveryBarBlock, /communityInterestMore/);
  assert.doesNotMatch(discoveryBarBlock, /communityInterestMore", language/);
  assert.doesNotMatch(discoveryBarBlock, /jobsHiringTitle|communityHiringTitle/);
  assert.doesNotMatch(discoverSource, /scrollTo\(/);
  assert.equal(
    t("communityDiscoverySearchPlaceholder", "en"),
    "Search professionals, businesses, specialties, or services..."
  );
  assert.equal(t("communityDiscoveryContextExploring", "en"), "Exploring {interest}");
  assert.match(
    t("communityDiscoveryContextSingleCopy", "en"),
    /related to \{interest\}/
  );
  assert.equal(t("communityInterestPromptTitle", "en"), "What interests you most?");
  assert.equal(t("communityInterestSkip", "en"), "Skip for now");
});

test("Community discovery search filters verified business data without reviving local hiring records", () => {
  assert.match(discoverSource, /function businessMatchesSearch\(business = \{\}, query = ""\)/);
  assert.match(discoverSource, /services\.shortSummary/);
  assert.match(discoverSource, /services\.publicSummary/);
  assert.match(discoverSource, /\.\.\.services\.serviceIds/);
  assert.match(discoverSource, /\.\.\.services\.categories/);
  assert.match(discoverSource, /\.\.\.services\.displayLabels/);
  assert.match(discoverSource, /\.\.\.services\.capabilities/);
  assert.match(discoverSource, /\.\.\.services\.matchingKeywords/);
  assert.match(discoverSource, /searchRequestServices\(query/);
  assert.match(discoverSource, /searchCommunityTaxonomyAliases\(query\)/);
  assert.match(discoverSource, /resolveCommunityDiscoveryInterestForSearch\(searchQuery\)/);
  assert.match(discoverSource, /saveDiscoveryInterests\(\[taxonomyMatch\.ecosystemId\]\)/);
  assert.match(discoverSource, /ecosystem\.label/);
  assert.match(discoverSource, /\.\.\.ecosystem\.aliases/);
  assert.doesNotMatch(discoverSource, /OpenAI|providerAdapter|companion\/ask|\/api\/companion/i);
  assert.equal(searchCommunityTaxonomyAliases("SEO")[0]?.id, "marketing");
  assert.equal(searchCommunityTaxonomyAliases("taxes")[0]?.id, "financial");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("SEO")?.ecosystemId, "marketing");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("taxes")?.ecosystemId, "financial");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("kitchen remodel")?.ecosystemId, "home_services");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("cabinets")?.ecosystemId, "home_services");
  assert.equal(resolveCommunityDiscoveryInterestForSearch("unknown community phrase"), null);
  assert.match(discoverSource, /communitySearchBusinesses = searchQuery\.trim\(\)/);
  assert.match(discoverSource, /businesses\.filter\(\(business\) => businessMatchesSearch\(business, searchQuery\)\)/);
  assert.doesNotMatch(discoverSource, /getHiringLocalJobOpenings|communitySearchHiringJobs|jobMatchesSearch/);
  assert.match(discoverSource, /spotlightMatchesSearch\(searchTerm\)/);
  assert.match(discoverSource, /getCommunitySectionOrder\("businesses"\)/);
  assert.match(discoverSource, /getCommunitySectionOrder\("hiring"\)/);
  assert.match(discoverSource, /getCommunitySectionOrder\("spotlight"\)/);
  assert.match(discoverSource, /orderByDiscoveryInterests/);
  assert.match(discoverSource, /transition: "opacity 160ms ease/);
});

test("Community discovery keeps one destination and supports Companion handoff", () => {
  assert.match(discoverSource, /window\.addEventListener\("meetro:community-discovery"/);
  assert.match(discoverSource, /meetroCommunityDiscoveryQuery/);
  assert.match(discoverSource, /setSearchQuery\(String\(detail\.query\)\)/);
  assert.match(discoverSource, /saveDiscoveryInterests\(validInterestIds\)/);
  assert.match(discoverSource, /selectedDiscoveryInterests\[0\] === taxonomyMatch\.ecosystemId/);
  assert.match(discoverSource, /copy: t\(copyKey, language\)/);
  assert.match(discoverSource, /discoverMode === "businessDirectory" && renderBusinessesSection\(\)/);
  assert.match(discoverSource, /discoverMode === "spotlight" && renderSpotlightSection\(\)/);
  assert.match(discoverSource, /discoverMode === "communityHub"/);
  assert.match(discoverSource, /renderCommunityHub\(\)/);
  assert.doesNotMatch(discoverSource, /setPage\("jobsHiring"\)/);
});

test("Businesses preview reuses existing business cards and full Businesses page remains unchanged", () => {
  const hubBlock = discoverSource.slice(
    discoverSource.indexOf("const renderCommunityHub = () =>"),
    discoverSource.indexOf("const renderSpotlightSection = () =>")
  );
  const businessesBlock = discoverSource.slice(
    discoverSource.indexOf("const renderBusinessesSection = () =>"),
    discoverSource.indexOf("return (\n    <div className=\"app-page meetro-wide-page meetro-visual-page\"")
  );

  assert.match(discoverSource, /const renderBusinessCard = \(business\) =>/);
  assert.match(hubBlock, /communityBusinessPreview\.map\(\(business\) => renderBusinessCard\(business\)\)/);
  assert.doesNotMatch(hubBlock, /marketplaceBusinesses\.map/);
  assert.match(businessesBlock, /marketplaceBusinesses\.map/);
  assert.match(businessesBlock, /renderBusinessCard\(business\)/);
  assert.match(
    discoverSource,
    /discoverMode === "businessDirectory" && renderBusinessesSection\(\)/
  );
  assert.match(discoverSource, /renderCommunityHub\(\)/);
});

test("Community Hiring remains visible but does not render local opportunities as shared truth", () => {
  assert.match(discoverSource, /t\("communityHiringTitle", language\)/);
  assert.match(discoverSource, /t\("hiringOperationsUnavailable", language\)/);
  assert.match(discoverSource, /t\("hiringOpportunitiesTruthDescription", language\)/);
  assert.doesNotMatch(discoverSource, /getHiringLocalJobOpenings|getLocalizedHiringJobDisplay/);
  assert.doesNotMatch(discoverSource, /renderHiringPreviewCard|renderCommunityHiringOpportunityDetails/);
});

test("Community cannot create local hiring conversations or notifications", () => {
  assert.doesNotMatch(discoverSource, /saveHiringConversation|expressHiringInterest/);
  assert.doesNotMatch(discoverSource, /createNotification|community_hiring_interest/);
});

test("Hiring and Spotlight previews are lightweight and Phase 5A safe", () => {
  assert.match(discoverSource, /COMMUNITY_SPOTLIGHT_PREVIEW_LIMIT/);
  assert.match(discoverSource, /communitySpotlightStories\.map/);
  assert.match(discoverSource, /t\("hiringOperationsUnavailable", language\)/);
  assert.match(discoverSource, /t\("hiringOpportunitiesTruthDescription", language\)/);
  assert.match(discoverSource, /t\("communitySpotlightEyebrow", language\)/);
  assert.match(discoverSource, /t\("communitySpotlightStoryTitle", language\)/);
  assert.match(discoverSource, /t\("communitySpotlightCue", language\)/);
  assert.match(discoverSource, /t\("communitySpotlightStoryFallbackMeta", language\)/);
  assert.equal(t("communitySpotlightEyebrow", "en"), "Today’s Spotlight");
  assert.equal(t("communitySpotlightStoryTitle", "en"), "Trusted work is already shaping your community.");
  assert.equal(t("communitySpotlightCue", "en"), "Meet the professional who helped make it possible.");
  assert.match(t("communitySpotlightStoryFallbackMeta", "en"), /does not require media uploads/);
  assert.doesNotMatch(discoverSource, /createObjectURL|FileReader|input type="file"/);
});

test("Spotlight destination is editorial discovery without social or Moments behavior", () => {
  const spotlightBlock = discoverSource.slice(
    discoverSource.indexOf("const renderSpotlightSection = () =>"),
    discoverSource.indexOf("const renderBusinessesSection = () =>")
  );

  assert.match(spotlightBlock, /t\("communityTitle", language\)/);
  assert.match(spotlightBlock, /t\("communitySpotlightPageTitle", language\)/);
  assert.match(spotlightBlock, /t\("communitySpotlightPageSubtitle", language\)/);
  assert.match(spotlightBlock, /t\("communitySpotlightFeaturedEyebrow", language\)/);
  assert.match(spotlightBlock, /t\("communitySpotlightWarmupEyebrow", language\)/);
  assert.match(spotlightBlock, /t\("communitySpotlightWarmupCue", language\)/);
  assert.match(spotlightBlock, /t\("communitySpotlightPrincipleTitle", language\)/);
  assert.match(spotlightBlock, /t\("communitySpotlightPrincipleText", language\)/);
  assert.equal(t("communitySpotlightPageTitle", "en"), "Stories Behind Trusted Work");
  assert.equal(
    t("communitySpotlightPageSubtitle", "en"),
    "Discover the professionals, relationships, and local work helping your community feel more connected."
  );
  assert.equal(t("communitySpotlightFeaturedEyebrow", "en"), "Featured Community Story");
  assert.equal(t("communitySpotlightWarmupEyebrow", "en"), "Spotlight Is Warming Up");
  assert.equal(
    t("communitySpotlightWarmupCue", "en"),
    "Meaningful local stories will appear here as Meetro grows."
  );
  assert.equal(t("communitySpotlightPrincipleTitle", "en"), "Spotlight is discovery, not preservation.");
  assert.match(t("communitySpotlightPrincipleText", "en"), /Meetro Moments preserves completed accomplishments/);
  assert.doesNotMatch(spotlightBlock, /\b(feed|post|posts|social|like|comment|share|followers|hashtags)\b/i);
  assert.doesNotMatch(spotlightBlock, /renderBusinessCard\(business\)/);
});

test("Community preview empty states feel alive without promising unavailable data", () => {
  assert.match(discoverSource, /t\("communityBusinessesEmptyTitle", language\)/);
  assert.match(discoverSource, /t\("communityBusinessesEmptyText", language\)/);
  assert.match(discoverSource, /t\("communitySpotlightStoryFallbackTitle", language\)/);
  assert.match(discoverSource, /t\("communitySpotlightStoryFallbackText", language\)/);
  assert.equal(t("communityBusinessesEmptyTitle", "en"), "Local businesses will appear here as Meetro grows.");
  assert.equal(
    t("communityBusinessesEmptyText", "en"),
    "Soon, this space will introduce trusted professionals serving your community."
  );
  assert.equal(t("communitySpotlightStoryFallbackTitle", "en"), "Spotlight stories are beginning here.");
  assert.equal(
    t("communitySpotlightStoryFallbackText", "en"),
    "As trusted work grows, this space will introduce the people, relationships, and care behind it."
  );
});

test("Community preview layout remains responsive and mobile safe", () => {
  assert.match(
    discoverSource,
    /gridTemplateColumns: "repeat\(auto-fit, minmax\(min\(100%, 280px\), 1fr\)\)"/
  );
  assert.match(
    discoverSource,
    /gridTemplateColumns: "repeat\(auto-fit, minmax\(min\(100%, 220px\), 1fr\)\)"/
  );
  assert.match(
    discoverSource,
    /paddingBottom: "calc\(96px \+ env\(safe-area-inset-bottom\)\)"/
  );
});

test("Home renders a phone-first Explore Community entry that opens Community", () => {
  assert.match(homeSource, /className="home-community-entry"/);
  assert.match(homeSource, /t\("communityEntryTitle", language\)/);
  assert.match(homeSource, /t\("communityEntryHomeCopy", language\)/);
  assert.match(homeSource, /t\("communityOpenAction", language\)/);
  assert.equal(t("communityEntryTitle", "en"), "Explore Community");
  assert.equal(
    t("communityEntryHomeCopy", "en"),
    "Discover trusted businesses, opportunities, and local stories around you."
  );
  assert.equal(t("communityOpenAction", "en"), "Open Community");
  assert.match(homeSource, /onClick=\{\(\) => setPage\("discover"\)\}/);
  assert.match(
    homeSource,
    /\.home-community-entry \{\s*display: none !important;/
  );
});

test("iPhone Community certification keeps one shared destination for both role entry surfaces", () => {
  assert.match(homeSource, /className="home-community-entry"/);
  assert.match(homeSource, /onClick=\{\(\) => setPage\("discover"\)\}/);
  assert.match(businessDashboardSource, /className="business-dashboard-community-entry"/);
  assert.match(businessDashboardSource, /t\("communityEntryTitle", language\)/);
  assert.match(businessDashboardSource, /t\("communityEntryBusinessCopy", language\)/);
  assert.match(businessDashboardSource, /t\("communityOpenAction", language\)/);
  assert.match(businessDashboardSource, /onClick=\{\(\) => setPage\("discover"\)\}/);
  assert.match(discoverSource, /function Discover\(\{ setPage, currentPage \}\)/);
  assert.match(discoverSource, /useState\("communityHub"\)/);
  assert.equal(existsSync(duplicateCommunityPageUrl), false);
});

test("iPhone Community certification preserves account role from entry to destination", () => {
  installStorage();
  localStorage.setItem("accountType", "homeowner");
  localStorage.setItem("userRole", "homeowner");
  localStorage.setItem("activeAccountMode", "personal");

  assert.equal(getAccountModeForPage("discover", "personal"), "personal");
  assert.equal(syncAccountModeForPage("discover"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "personal");
  assert.equal(localStorage.getItem("accountType"), "homeowner");
  assert.equal(localStorage.getItem("userRole"), "homeowner");

  installStorage();
  localStorage.setItem("isProfessional", "true");
  localStorage.setItem("accountType", "professional");
  localStorage.setItem("userRole", "handyman");
  localStorage.setItem("businessCategory", "handyman");
  localStorage.setItem("activeAccountMode", "business");

  assert.equal(getAccountModeForPage("discover", "business"), "business");
  assert.equal(syncAccountModeForPage("discover"), true);
  assert.equal(localStorage.getItem("activeAccountMode"), "business");
  assert.equal(localStorage.getItem("accountType"), "professional");
  assert.equal(localStorage.getItem("userRole"), "handyman");
});

test("desktop navigation keeps Community label readable and role-aware", () => {
  const personalMobileBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const personalMobileNavItems = ["),
    bottomNavSource.indexOf("const businessMobileNavItems = [")
  );
  const businessMobileBlock = bottomNavSource.slice(
    bottomNavSource.indexOf("const businessMobileNavItems = ["),
    bottomNavSource.indexOf("const personalDesktopNavItems = [")
  );

  assert.match(bottomNavSource, /label: "Community"/);
  assert.match(bottomNavSource, /sub: "Discover"/);
  assert.match(bottomNavSource, /whiteSpace: "normal"[\s\S]*textOverflow: "clip"/);
  assert.doesNotMatch(personalMobileBlock, /page: "discover"/);
  assert.doesNotMatch(personalMobileBlock, /label: "Community"/);
  assert.doesNotMatch(businessMobileBlock, /page: "discover"/);
  assert.doesNotMatch(businessMobileBlock, /label: "Community"/);
});
