import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getEligibleSpotlightBusinesses,
} from "../src/utils/localSpotlightVisibility.js";
import { fetchCanonicalSpotlightBusinesses } from "../src/utils/spotlightPortfolioDirectory.js";

const homeSource = readFileSync("src/pages/Home.jsx", "utf8");
const detailsSource = readFileSync("src/pages/ContractorDetails.jsx", "utf8");
const presentationSource = readFileSync(
  "src/components/PortfolioProjectPresentation.jsx",
  "utf8"
);
const slideshowSource = readFileSync(
  "src/components/SpotlightSlideshow.jsx",
  "utf8"
);

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  };
}

function publicProfile(id = 6) {
  return {
    id,
    business_name: "Handyman LLC",
    category: "Plumbing",
    phone: "",
    location: "Cape Coral",
    bio: "",
    image_url: "",
    service_area: "Cape Coral",
    business_hours: "",
    license_number: "",
    license_state: "",
    license_type: "",
    license_expiration: "",
    service_specialties: ["plumbing_repair"],
    available_now: true,
    dispatch_ready: false,
    show_business_address_public: false,
    username: "handyman",
  };
}

test("Spotlight loads the public directory and canonical public Portfolio without owner state", async () => {
  const calls = [];
  const projects = [
    {
      id: 6,
      contractor_id: 6,
      title: "Published proof",
      description: "Canonical public project",
      image_urls: ["https://img.test/one.jpg", "https://img.test/two.jpg"],
    },
  ];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.endsWith("/contractor-profiles")) {
      return jsonResponse(200, { profiles: [publicProfile()] });
    }
    if (url.endsWith("/contractor-projects/6")) {
      return jsonResponse(200, { projects });
    }
    return jsonResponse(404, {});
  };

  const result = await fetchCanonicalSpotlightBusinesses({
    apiUrl: "https://staging.example.test",
    fetchImpl,
    logger: { error() {} },
  });

  assert.deepEqual(calls, [
    "https://staging.example.test/contractor-profiles",
    "https://staging.example.test/contractor-projects/6",
  ]);
  assert.deepEqual(result.records[0].businessPortfolio, projects);
  assert.deepEqual(
    getEligibleSpotlightBusinesses(result.records, []).map((business) => business.id),
    [6]
  );
});

test("Draft and Archived owner records cannot enter Spotlight when absent from the public contract", async () => {
  const fetchImpl = async (url) =>
    url.endsWith("/contractor-profiles")
      ? jsonResponse(200, { profiles: [publicProfile()] })
      : jsonResponse(200, { projects: [] });

  const result = await fetchCanonicalSpotlightBusinesses({
    apiUrl: "https://staging.example.test",
    fetchImpl,
    logger: { error() {} },
  });

  assert.deepEqual(result.records[0].businessPortfolio, []);
  assert.deepEqual(getEligibleSpotlightBusinesses(result.records, []), []);
});

test("Spotlight routes the exact business identity into canonical Contractor Details", () => {
  assert.match(homeSource, /localStorage\.setItem\(\s*"selectedContractor"/);
  assert.match(homeSource, /setPage\("contractorDetails"\)/);
  assert.match(detailsSource, /`\$\{API_URL\}\/contractor-projects\/\$\{contractorId\}`/);
  assert.match(detailsSource, /String\(project\.id\) === String\(selectedProjectId\)/);
});

test("Spotlight cards and media state use exact canonical identities without shared advancement", () => {
  assert.match(
    homeSource,
    /key=\{getSpotlightBusinessIdentity\(business\.id\)\}/
  );
  assert.match(
    homeSource,
    /\.filter\(\(business\) => getSpotlightBusinessIdentity\(business\?\.id\)\)/
  );
  assert.match(
    homeSource,
    /getSpotlightPresentationIdentity\(\s*business\.id,\s*featuredProject\?\.id/
  );
  assert.match(homeSource, /key=\{presentationId\}/);
  assert.match(homeSource, /presentationId=\{presentationId\}/);
  assert.match(homeSource, /alignItems:\s*"stretch"/);
  assert.match(
    homeSource,
    /const spotlightHero = \{[\s\S]*height:\s*"clamp\(250px, 56vw, 292px\)"[\s\S]*minHeight:\s*"250px"/
  );
  assert.doesNotMatch(
    homeSource,
    /key=\{business\.id \|\| business\.name \|\| business\.business_name\}/
  );
  assert.doesNotMatch(slideshowSource, /setInterval|intervalMs/);
  assert.match(slideshowSource, /moveSpotlightSlideshowPosition/);
});

test("homeowner details reuse shared cards and exact-project read-only viewing", () => {
  assert.match(detailsSource, /<PortfolioProjectGrid/);
  assert.match(detailsSource, /<PortfolioProjectCard/);
  assert.match(detailsSource, /<PortfolioProjectView/);
  assert.match(detailsSource, /onView=\{\(exactProjectId\) => setSelectedProjectId\(exactProjectId\)\}/);
  assert.match(presentationSource, /getBusinessPortfolioProjectImages\(project\)/);
  assert.match(presentationSource, /\{safeIndex \+ 1\} of \{images\.length\}/);
});

test("homeowner Portfolio and Project View expose no owner authority", () => {
  const publicProjectViewCall = detailsSource.slice(
    detailsSource.indexOf("<PortfolioProjectView"),
    detailsSource.indexOf("/>", detailsSource.indexOf("<PortfolioProjectView"))
  );
  const publicPortfolio = detailsSource.slice(
    detailsSource.indexOf('id="contractor-details-project-gallery"'),
    detailsSource.indexOf('{isSpanish ? "Opciones existentes"')
  );

  assert.doesNotMatch(publicProjectViewCall, /onManage|managementContent/);
  assert.doesNotMatch(
    publicPortfolio,
    /Edit Portfolio|Edit Project|Add Project|Publish|Archive|Feature|Earlier|Later|Adopt/
  );
  assert.doesNotMatch(detailsSource, /my-contractor-projects/);
});

test("business trust remains business-level and the public empty state is truthful", () => {
  assert.match(detailsSource, /businessReviewTrust/);
  assert.match(presentationSource, /Business rating/);
  assert.doesNotMatch(presentationSource, /Project rating|project reviews|projectReviewCount/i);
  assert.match(
    detailsSource,
    /This business has not published any Portfolio projects yet\./
  );
});

test("shared presentation preserves accessible responsive Portfolio structure", () => {
  assert.match(presentationSource, /<article/);
  assert.match(presentationSource, /Previous photo for \$\{title\}/);
  assert.match(presentationSource, /Next photo for \$\{title\}/);
  assert.match(presentationSource, /aria-live="polite"/);
  assert.match(presentationSource, /repeat\(auto-fill, minmax\(min\(100%, 390px\), 1fr\)\)/);
  assert.match(presentationSource, /aspectRatio: "16 \/ 9"/);
});
