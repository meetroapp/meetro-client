import test from "node:test";
import assert from "node:assert/strict";

import {
  canProfessionalReceiveRequest,
  getRequestMatchSummary,
} from "../src/utils/professionalRequestMatching.js";
import { canProfessionalServeArea } from "../src/utils/serviceAreaMatching.js";
import {
  canProfessionalReceiveLead,
  getLeadEligibilitySummary,
} from "../src/utils/leadEligibility.js";
import {
  attachSpotlightPortfolioMedia,
  buildSpotlightProfessionalProfile,
  getSpotlightBusinessInclusionSummary,
  getEligibleSpotlightBusinesses,
  getSpotlightFeaturedProject,
  getSpotlightMediaForBusiness,
  getSpotlightMediaUrls,
  getSpotlightMediaSourceSummary,
  getNextSpotlightSlideshowIndex,
  getSpotlightRequestContexts,
  getSpotlightShowcaseMediaUrls,
  getSpotlightSlideshowFrame,
  isNoContextSpotlightSafeBusiness,
} from "../src/utils/localSpotlightVisibility.js";

test("no-context spotlight shows only home-service professionals with portfolio media", () => {
  const businesses = [
    {
      id: "demo-handyman",
      name: "Demo Handyman",
      category: "handyman",
      localDemoSafe: true,
      portfolioImages: ["https://example.com/demo-handyman.jpg"],
    },
    {
      id: "real-handyman",
      name: "Real Handyman",
      category: "handyman",
      portfolioImages: ["https://example.com/real-handyman.jpg"],
    },
    {
      id: "demo-nurse",
      name: "Demo Nurse",
      category: "nursing",
      localDemoSafe: true,
      portfolioImages: ["https://example.com/demo-nurse.jpg"],
    },
    {
      id: "demo-transport",
      name: "Demo Transport",
      category: "private_transportation",
      localDemoSafe: true,
      portfolioImages: ["https://example.com/demo-transport.jpg"],
    },
    {
      id: "demo-handyman-no-media",
      name: "Demo Handyman No Media",
      category: "handyman",
      localDemoSafe: true,
    },
  ];

  const eligible = getEligibleSpotlightBusinesses(businesses, []);

  assert.deepEqual(
    eligible.map((business) => business.id),
    ["demo-handyman", "real-handyman"]
  );
});

test("real request-context spotlight still uses strict lead eligibility", () => {
  const contexts = getSpotlightRequestContexts([
    {
      title: "Interior painting",
      category: "painting",
      zip: "33904",
    },
  ]);

  const businesses = [
    {
      id: "eligible-painter",
      name: "Eligible Painter",
      category: "painting",
      serviceZipCodes: "33904",
      portfolioImages: ["https://example.com/painter.jpg"],
    },
    {
      id: "wrong-area-painter",
      name: "Wrong Area Painter",
      category: "painting",
      serviceZipCodes: "33101",
    },
    {
      id: "wrong-domain-nurse",
      name: "Wrong Domain Nurse",
      category: "nursing",
      serviceZipCodes: "33904",
      localDemoSafe: true,
    },
  ];

  const eligible = getEligibleSpotlightBusinesses(businesses, contexts);

  assert.deepEqual(
    eligible.map((business) => business.id),
    ["eligible-painter"]
  );
});

test("no-context spotlight does not require area or lead eligibility", () => {
  const bgone = {
    id: "bgone-construction",
    name: "BGone Construction",
    category: "handyman",
    portfolioImages: ["https://example.com/bgone.jpg"],
  };

  assert.deepEqual(
    getEligibleSpotlightBusinesses([bgone], []).map((business) => business.id),
    ["bgone-construction"]
  );

  assert.deepEqual(
    getEligibleSpotlightBusinesses(
      [bgone],
      getSpotlightRequestContexts([
        {
          title: "Door repair",
          category: "doorRepair",
          zip: "33904",
        },
      ])
    ).map((business) => business.id),
    []
  );
});

test("no-context inclusion uses media and no-context rule even when area and lead diagnostics fail", () => {
  const bgone = {
    id: "bgone-construction",
    name: "BGone Construction",
    category: "handyman",
    portfolioImages: ["https://example.com/bgone.jpg"],
  };
  const profile = buildSpotlightProfessionalProfile(bgone);
  const diagnosticRequest = {
    title: "Door repair",
    category: "doorRepair",
    zip: "33904",
  };
  const inclusion = getSpotlightBusinessInclusionSummary(bgone, []);

  assert.equal(getSpotlightMediaUrls(bgone).length > 0, true);
  assert.equal(profile.serviceDomain, "home_services");
  assert.equal(getRequestMatchSummary(profile, diagnosticRequest).checks.specialtyMatched, true);
  assert.equal(canProfessionalServeArea(profile, diagnosticRequest), false);
  assert.equal(canProfessionalReceiveLead(profile, diagnosticRequest), false);
  assert.equal(isNoContextSpotlightSafeBusiness(bgone), true);
  assert.equal(inclusion.included, true);
  assert.deepEqual(
    getEligibleSpotlightBusinesses([bgone], []).map((business) => business.id),
    ["bgone-construction"]
  );
});

test("spotlight request contexts do not invent a generic request fallback", () => {
  assert.deepEqual(getSpotlightRequestContexts([], []), []);
});

test("spotlight media reads existing business portfolio and gallery fields", () => {
  const urls = getSpotlightMediaUrls({
    portfolio: [
      {
        title: "Door project",
        image_url: "https://example.com/door-cover.jpg",
        image_urls: [
          "https://example.com/door-before.jpg",
          "https://example.com/door-after.jpg",
        ],
      },
    ],
    gallery: [{ url: "https://example.com/gallery.jpg" }],
    photos: ["https://example.com/photo.jpg"],
    portfolioImages: ["https://example.com/portfolio-image.jpg"],
    businessPortfolio: [
      { photos: [{ src: "https://example.com/business-photo.jpg" }] },
    ],
    media: [{ secure_url: "https://example.com/media.jpg" }],
    images: JSON.stringify(["https://example.com/json-image.jpg"]),
    imageUrl: "https://example.com/cover.jpg",
    logo: "https://example.com/logo.jpg",
  });

  assert.deepEqual(urls, [
    "https://example.com/business-photo.jpg",
    "https://example.com/gallery.jpg",
    "https://example.com/photo.jpg",
    "https://example.com/door-before.jpg",
    "https://example.com/door-after.jpg",
    "https://example.com/portfolio-image.jpg",
    "https://example.com/media.jpg",
    "https://example.com/json-image.jpg",
    "https://example.com/cover.jpg",
    "https://example.com/logo.jpg",
  ]);
});

test("spotlight media prefers portfolio project images before logo and cover", () => {
  const urls = getSpotlightMediaUrls({
    logo: "https://example.com/logo.jpg",
    coverImage: "https://example.com/cover.jpg",
    businessPortfolio: [
      {
        title: "Kitchen Service",
        image_url: "https://example.com/project-cover.jpg",
        image_urls: [
          "https://example.com/project-1.jpg",
          "https://example.com/project-2.jpg",
        ],
      },
    ],
  });

  assert.deepEqual(urls.slice(0, 3), [
    "https://example.com/project-1.jpg",
    "https://example.com/project-2.jpg",
    "https://example.com/cover.jpg",
  ]);
  assert.equal(urls.at(-2), "https://example.com/cover.jpg");
  assert.equal(urls.at(-1), "https://example.com/logo.jpg");
});

test("getSpotlightMediaForBusiness returns project photos before logo", () => {
  assert.deepEqual(
    getSpotlightMediaForBusiness({
      logo: "https://example.com/logo.jpg",
      businessPortfolio: [
        {
          image_url: "https://example.com/project-cover.jpg",
          image_urls: [
            "https://example.com/project-1.jpg",
            "https://example.com/project-2.jpg",
          ],
        },
      ],
    }).slice(0, 3),
    [
      "https://example.com/project-1.jpg",
      "https://example.com/project-2.jpg",
      "https://example.com/logo.jpg",
    ]
  );
});

test("getSpotlightMediaForBusiness returns multiple project photos across projects", () => {
  assert.deepEqual(
    getSpotlightMediaForBusiness({
      projects: [
        {
          title: "Kitchen Service",
          image_urls: [
            "https://example.com/kitchen-1.jpg",
            "https://example.com/kitchen-2.jpg",
          ],
        },
        {
          title: "Drain replacement",
          image_url: "https://example.com/drain.jpg",
        },
      ],
    }),
    [
      "https://example.com/kitchen-1.jpg",
      "https://example.com/kitchen-2.jpg",
      "https://example.com/drain.jpg",
    ]
  );
});

test("getSpotlightMediaForBusiness prefers projects marked for Spotlight", () => {
  assert.deepEqual(
    getSpotlightMediaForBusiness({
      businessPortfolio: [
        {
          title: "Recent project",
          image_url: "https://example.com/recent.jpg",
        },
        {
          title: "Featured kitchen",
          spotlightFeatured: true,
          image_urls: [
            "https://example.com/featured-1.jpg",
            "https://example.com/featured-2.jpg",
          ],
        },
      ],
    }).slice(0, 3),
    [
      "https://example.com/featured-1.jpg",
      "https://example.com/featured-2.jpg",
      "https://example.com/recent.jpg",
    ]
  );
});

test("getSpotlightMediaForBusiness excludes logo and placeholder URLs from work photos", () => {
  assert.deepEqual(
    getSpotlightMediaForBusiness({
      businessPortfolio: [
        {
          image_urls: [
            "https://example.com/bgone-logo.jpg",
            "https://example.com/upload-placeholder.jpg",
            "https://example.com/real-project.jpg",
          ],
        },
      ],
      logo: "https://example.com/bgone-logo.jpg",
    }),
    ["https://example.com/real-project.jpg", "https://example.com/bgone-logo.jpg"]
  );
});

test("getSpotlightMediaForBusiness excludes editor and screenshot URLs from work photos", () => {
  assert.deepEqual(
    getSpotlightMediaForBusiness({
      businessPortfolio: [
        {
          image_urls: [
            "https://example.com/portfolio-editor-top.png",
            "https://example.com/Screenshot-2026-06-20.png",
            "https://example.com/kitchen-project-photo.jpg",
          ],
        },
      ],
    }),
    ["https://example.com/kitchen-project-photo.jpg"]
  );
});

test("getSpotlightMediaForBusiness uses logo as fallback only", () => {
  assert.deepEqual(
    getSpotlightMediaForBusiness({
      logo: "https://example.com/logo.jpg",
    }),
    ["https://example.com/logo.jpg"]
  );
});

test("spotlight showcase uses portfolio photos before cover and logo fallback", () => {
  const urls = getSpotlightShowcaseMediaUrls({
    logo: "https://example.com/logo.jpg",
    coverImage: "https://example.com/cover.jpg",
    businessPortfolio: [
      {
        title: "Kitchen Service",
        image_url: "https://example.com/project-cover.jpg",
        image_urls: [
          "https://example.com/project-1.jpg",
          "https://example.com/project-2.jpg",
        ],
      },
    ],
  });

  assert.deepEqual(urls, [
    "https://example.com/project-1.jpg",
    "https://example.com/project-2.jpg",
    "https://example.com/cover.jpg",
    "https://example.com/logo.jpg",
  ]);
});

test("spotlight showcase falls back to logo only when no work media exists", () => {
  assert.deepEqual(
    getSpotlightShowcaseMediaUrls({
      logo: "https://example.com/logo.jpg",
    }),
    ["https://example.com/logo.jpg"]
  );
});

test("spotlight media falls back to cover fields and removes duplicates", () => {
  const urls = getSpotlightMediaUrls({
    coverImage: "https://example.com/cover.jpg",
    image_url: "https://example.com/cover.jpg",
    logo: "https://example.com/logo.jpg",
  });

  assert.deepEqual(urls, [
    "https://example.com/cover.jpg",
    "https://example.com/logo.jpg",
  ]);
});

test("spotlight slideshow frame returns the active image and count label", () => {
  assert.deepEqual(
    getSpotlightSlideshowFrame(
      [
        "https://example.com/first.jpg",
        "https://example.com/second.jpg",
        "https://example.com/third.jpg",
      ],
      4
    ),
    {
      url: "https://example.com/second.jpg",
      index: 1,
      count: 3,
      label: "2/3",
      hasMultiple: true,
    }
  );

  assert.deepEqual(getSpotlightSlideshowFrame([], 0), {
    url: "",
    index: 0,
    count: 0,
    label: "",
    hasMultiple: false,
  });
});

test("spotlight slideshow next index advances and loops", () => {
  assert.equal(getNextSpotlightSlideshowIndex(0, 5), 1);
  assert.equal(getNextSpotlightSlideshowIndex(1, 5), 2);
  assert.equal(getNextSpotlightSlideshowIndex(4, 5), 0);
  assert.equal(getNextSpotlightSlideshowIndex(8, 5), 4);
});

test("spotlight slideshow next index stays inactive for one or zero images", () => {
  assert.equal(getNextSpotlightSlideshowIndex(0, 1), 0);
  assert.equal(getNextSpotlightSlideshowIndex(0, 0), 0);
});

test("spotlight uses Business Portfolio project images before a company logo", () => {
  const bgone = {
    id: "bgone-construction",
    name: "BGone Construction",
    category: "handyman",
    logo: "https://example.com/bgone-logo.jpg",
    image_url: "https://example.com/bgone-logo.jpg",
    businessPortfolio: [
      {
        title: "Kitchen Service",
        description: "Replaced Kitchen faucet and drain",
        image_urls: [
          "https://example.com/kitchen-faucet-1.jpg",
          "https://example.com/kitchen-faucet-2.jpg",
        ],
      },
      {
        title: "Additional portfolio project",
        image_url: "https://example.com/second-project.jpg",
      },
    ],
  };

  assert.deepEqual(getSpotlightShowcaseMediaUrls(bgone).slice(0, 3), [
    "https://example.com/kitchen-faucet-1.jpg",
    "https://example.com/kitchen-faucet-2.jpg",
    "https://example.com/second-project.jpg",
  ]);
  assert.equal(getSpotlightShowcaseMediaUrls(bgone).at(-1), "https://example.com/bgone-logo.jpg");
  assert.equal(getSpotlightMediaUrls(bgone)[0], "https://example.com/kitchen-faucet-1.jpg");
  assert.deepEqual(getSpotlightFeaturedProject(bgone), bgone.businessPortfolio[0]);
});

test("spotlight attaches existing portfolio bucket media by business name", () => {
  const [bgone] = attachSpotlightPortfolioMedia(
    [
      {
        id: "bgone-construction",
        name: "BGone Construction",
        category: "handyman",
        localDemoSafe: true,
      },
    ],
    [
      {
        businessName: "BGone Construction",
        title: "Bathroom remodel",
        image_urls: [
          "https://example.com/bgone-before.jpg",
          "https://example.com/bgone-after.jpg",
        ],
      },
    ]
  );

  assert.deepEqual(getSpotlightMediaUrls(bgone), [
    "https://example.com/bgone-before.jpg",
    "https://example.com/bgone-after.jpg",
  ]);
});

test("spotlight attaches local contractorProjects to the active profile owner even with display-name drift", () => {
  const [bgone] = attachSpotlightPortfolioMedia(
    [
      {
        id: "contractor-profile-id",
        name: "Bgone Home Renovation",
        category: "handyman",
        localProfileOwner: true,
      },
    ],
    [
      {
        __spotlightPortfolioSource: "contractorProjects",
        businessId: "different-server-business-id",
        businessName: "BGone Construction Cleanup LLC",
        title: "Kitchen Service",
        description: "Replaced Kitchen faucet and drain",
        image_urls: [
          "https://example.com/kitchen-service-1.jpg",
          "https://example.com/kitchen-service-2.jpg",
        ],
      },
    ]
  );

  assert.deepEqual(getSpotlightShowcaseMediaUrls(bgone).slice(0, 2), [
    "https://example.com/kitchen-service-1.jpg",
    "https://example.com/kitchen-service-2.jpg",
  ]);
  assert.equal(getSpotlightFeaturedProject(bgone).title, "Kitchen Service");
  assert.deepEqual(getSpotlightMediaSourceSummary(bgone), {
    logoImageCount: 0,
    coverImageCount: 0,
    galleryImageCount: 0,
    portfolioImageCount: 0,
    projectCount: 1,
    projectImageCount: 2,
  });
});

test("spotlight media source summary traces logo, cover, gallery, portfolio, and project counts", () => {
  const summary = getSpotlightMediaSourceSummary({
    logo: "https://example.com/logo.jpg",
    coverImage: "https://example.com/cover.jpg",
    gallery: ["https://example.com/gallery.jpg"],
    portfolioImages: ["https://example.com/portfolio.jpg"],
    businessPortfolio: [
      {
        image_urls: [
          "https://example.com/project-1.jpg",
          "https://example.com/project-2.jpg",
        ],
      },
    ],
  });

  assert.deepEqual(summary, {
    logoImageCount: 1,
    coverImageCount: 1,
    galleryImageCount: 1,
    portfolioImageCount: 1,
    projectCount: 1,
    projectImageCount: 2,
  });
});

test("spotlight attaches unscoped local portfolio media only for a single business", () => {
  const [singleBusiness] = attachSpotlightPortfolioMedia(
    [{ id: "bgone-construction", name: "BGone Construction", category: "handyman" }],
    [{ image_url: "https://example.com/local-profile-photo.jpg" }]
  );

  assert.deepEqual(getSpotlightMediaUrls(singleBusiness), [
    "https://example.com/local-profile-photo.jpg",
  ]);

  const multipleBusinesses = attachSpotlightPortfolioMedia(
    [
      { id: "bgone-construction", name: "BGone Construction", category: "handyman" },
      { id: "other-business", name: "Other Business", category: "painting" },
    ],
    [{ image_url: "https://example.com/unscoped-photo.jpg" }]
  );

  assert.deepEqual(multipleBusinesses.map(getSpotlightMediaUrls), [[], []]);
});

test("spotlight attaches unscoped portfolio media to the active local profile owner", () => {
  const businesses = attachSpotlightPortfolioMedia(
    [
      {
        id: "bgone-construction",
        name: "BGone Construction",
        category: "handyman",
        localProfileOwner: true,
      },
      {
        id: "other-business",
        name: "Other Business",
        category: "painting",
      },
    ],
    [
      {
        title: "Kitchen Service",
        image_urls: [
          "https://example.com/kitchen-service-1.jpg",
          "https://example.com/kitchen-service-2.jpg",
        ],
      },
    ]
  );

  assert.deepEqual(businesses.map(getSpotlightMediaUrls), [
    [
      "https://example.com/kitchen-service-1.jpg",
      "https://example.com/kitchen-service-2.jpg",
    ],
    [],
  ]);
});

test("BGone-style spotlight profile passes request, area, and lead eligibility when scoped safely", () => {
  const bgone = buildSpotlightProfessionalProfile({
    id: "bgone-construction",
    name: "BGone Construction",
    category: "handyman",
    serviceZipCodes: "33904",
    localDemoSafe: true,
  });
  const request = {
    title: "Door repair",
    category: "doorRepair",
    zip: "33904",
  };
  const requestMatch = getRequestMatchSummary(bgone, request);
  const eligibility = getLeadEligibilitySummary(bgone, request);

  assert.equal(requestMatch.checks.domainMatched, true);
  assert.equal(requestMatch.checks.categoryMatched, true);
  assert.equal(canProfessionalReceiveRequest(bgone, request), true);
  assert.equal(canProfessionalServeArea(bgone, request), true);
  assert.equal(canProfessionalReceiveLead(bgone, request), true);
  assert.equal(eligibility.eligible, true);
});

test("BGone diagnostic: professional portfolio record is included in no-context Spotlight when local profile owned", () => {
  const portfolioPageProjects = [
    {
      id: "project-kitchen-service",
      title: "Kitchen Service",
      description: "Cabinet and fixture work",
      image_url: "https://example.com/bgone-kitchen-1.jpg",
      image_urls: [
        "https://example.com/bgone-kitchen-1.jpg",
        "https://example.com/bgone-kitchen-2.jpg",
      ],
    },
    {
      id: "project-water-pipe",
      title: "Service call fix broken water pipe",
      description: "Emergency water pipe repair",
      image_url: "https://example.com/bgone-pipe-1.jpg",
      image_urls: [
        "https://example.com/bgone-pipe-1.jpg",
        "https://example.com/bgone-pipe-2.jpg",
      ],
    },
  ];
  const [spotlightRecord] = attachSpotlightPortfolioMedia(
    [
      {
        id: "bgone-construction",
        name: "BGone Construction",
        business_name: "BGone Construction",
        category: "handyman",
        businessCategory: "handyman",
        serviceZipCodes: "33904",
        localProfileOwner: true,
      },
    ],
    portfolioPageProjects
  );
  const profile = buildSpotlightProfessionalProfile(spotlightRecord);
  const request = {
    title: "Door repair",
    category: "doorRepair",
    zip: "33904",
  };
  const diagnostic = {
    businessName: spotlightRecord.name,
    sameObjectSource: false,
    portfolioSource: "contractor-projects mirrored into contractorProjects",
    hasPortfolioMedia: getSpotlightMediaUrls(spotlightRecord).length > 0,
    canProfessionalReceiveRequest: canProfessionalReceiveRequest(profile, request),
    canProfessionalServeArea: canProfessionalServeArea(profile, request),
    canProfessionalReceiveLead: canProfessionalReceiveLead(profile, request),
    includedInSpotlight:
      getEligibleSpotlightBusinesses([spotlightRecord], []).length === 1,
    noContextSpotlightSafe: isNoContextSpotlightSafeBusiness(spotlightRecord),
  };

  assert.deepEqual(diagnostic, {
    businessName: "BGone Construction",
    sameObjectSource: false,
    portfolioSource: "contractor-projects mirrored into contractorProjects",
    hasPortfolioMedia: true,
    canProfessionalReceiveRequest: true,
    canProfessionalServeArea: true,
    canProfessionalReceiveLead: true,
    includedInSpotlight: true,
    noContextSpotlightSafe: true,
  });
});
