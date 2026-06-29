import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  BUSINESS_PORTFOLIO_STORAGE_KEY,
  getBusinessPortfolioProjectStableId,
  getBusinessPortfolioProjectImages,
  normalizeBusinessPortfolioProjects,
  persistBusinessPortfolioProjects,
  readAllBusinessPortfolioItems,
  readBusinessPortfolioStorage,
} from "../src/utils/businessPortfolioStorage.js";
import { getBusinessPortfolioProofProjection } from "../src/utils/businessPortfolioProof.js";
import { saveProfessionalReview } from "../src/utils/reviewStorage.js";

function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

test("normalizes Business Portfolio project images from image_urls", () => {
  assert.deepEqual(
    getBusinessPortfolioProjectImages({
      image_url: "https://example.com/logo-or-cover.jpg",
      image_urls: [
        "https://example.com/kitchen-1.jpg",
        "https://example.com/kitchen-2.jpg",
      ],
    }),
    [
      "https://example.com/kitchen-1.jpg",
      "https://example.com/kitchen-2.jpg",
    ]
  );
});

test("normalizes portfolio projects with contractor identity", () => {
  const projects = normalizeBusinessPortfolioProjects(
    {
      id: "contractor-1",
      business_name: "BGone Construction",
    },
    [
      {
        title: "Kitchen Service",
        description: "Replaced Kitchen faucet and drain",
        image_urls: ["https://example.com/kitchen.jpg"],
      },
    ]
  );

  assert.deepEqual(projects, [
    {
      title: "Kitchen Service",
      description: "Replaced Kitchen faucet and drain",
      image_url: "https://example.com/kitchen.jpg",
      image_urls: ["https://example.com/kitchen.jpg"],
      id: "contractor-1-kitchen-service-https-example-com-kitchen-jpg",
      localId: "contractor-1-kitchen-service-https-example-com-kitchen-jpg",
      businessId: "contractor-1",
      businessName: "BGone Construction",
      contractorId: "contractor-1",
      contractorName: "BGone Construction",
      spotlightFeatured: false,
    },
  ]);
});

test("persists Business Portfolio projects into the shared contractorProjects key", () => {
  const storage = createMemoryStorage({
    [BUSINESS_PORTFOLIO_STORAGE_KEY]: JSON.stringify([
      {
        id: "other-project",
        businessId: "other-business",
        image_url: "https://example.com/other.jpg",
      },
    ]),
  });

  const saved = persistBusinessPortfolioProjects(
    {
      id: "contractor-1",
      business_name: "BGone Construction",
    },
    [
      {
        title: "Kitchen Service",
        image_urls: [
          "https://example.com/kitchen-1.jpg",
          "https://example.com/kitchen-2.jpg",
        ],
      },
    ],
    { storage }
  );

  assert.equal(saved.length, 1);
  assert.deepEqual(
    readBusinessPortfolioStorage(storage).map((project) => project.image_url),
    ["https://example.com/kitchen-1.jpg", "https://example.com/other.jpg"]
  );
});

test("preserves Spotlight feature preference when portfolio projects refresh", () => {
  const storage = createMemoryStorage({
    [BUSINESS_PORTFOLIO_STORAGE_KEY]: JSON.stringify([
      {
        id: "project-1",
        title: "Kitchen Service",
        image_url: "https://example.com/old.jpg",
        spotlightFeatured: true,
      },
    ]),
  });

  persistBusinessPortfolioProjects(
    {
      id: "contractor-1",
      business_name: "BGone Construction",
    },
    [
      {
        id: "project-1",
        title: "Kitchen Service",
        image_urls: ["https://example.com/new.jpg"],
      },
    ],
    { storage }
  );

  assert.equal(readBusinessPortfolioStorage(storage)[0].spotlightFeatured, true);
});

test("portfolio proof projection counts only public-safe portfolio projects", () => {
  const proof = getBusinessPortfolioProofProjection(
    {
      id: "business-1",
      businessName: "Proof Business",
      businessPortfolio: [
        {
          id: "public-1",
          title: "Kitchen Remodel",
          image_urls: ["https://example.com/kitchen-1.jpg"],
          spotlightFeatured: true,
        },
        {
          id: "private-1",
          title: "Private Job",
          image_urls: ["https://example.com/private.jpg"],
          private: true,
        },
        {
          id: "draft-1",
          title: "Draft Job",
          image_urls: ["https://example.com/draft.jpg"],
          status: "draft",
        },
      ],
      portfolioImages: ["https://example.com/standalone.jpg"],
    },
    { storage: createMemoryStorage() }
  );

  assert.equal(proof.projectCount, 1);
  assert.equal(proof.featuredProjectCount, 1);
  assert.equal(proof.featuredProject.title, "Kitchen Remodel");
  assert.deepEqual(proof.mediaUrls, [
    "https://example.com/kitchen-1.jpg",
    "https://example.com/standalone.jpg",
  ]);
});

test("portfolio proof projection includes grounded review stats", () => {
  const storage = createMemoryStorage();
  saveProfessionalReview(
    {
      professionalId: "business-review",
      professionalName: "Review Business",
      rating: 5,
      comment: "Great work.",
      jobId: "job-1",
    },
    storage
  );

  const proof = getBusinessPortfolioProofProjection(
    {
      id: "business-review",
      businessName: "Review Business",
      businessPortfolio: [
        {
          id: "public-1",
          title: "Door Repair",
          image_url: "https://example.com/door.jpg",
        },
      ],
    },
    { storage }
  );

  assert.equal(proof.projectCount, 1);
  assert.equal(proof.reviewCount, 1);
  assert.equal(proof.averageRating, "5.0");
  assert.equal(proof.mostRecentReview.comment, "Great work.");
});

test("creates a stable local project id when backend id is missing", () => {
  assert.equal(
    getBusinessPortfolioProjectStableId(
      { id: "contractor-1" },
      {
        title: "Kitchen Service",
        created_at: "2026-06-20",
        image_url: "https://example.com/kitchen.jpg",
      },
      0
    ),
    "contractor-1-kitchen-service-2026-06-20-https-example-com-kitchen-jpg"
  );
});

test("restores Spotlight feature preference for backend projects without stable ids", () => {
  const storage = createMemoryStorage();
  const profile = {
    id: "contractor-1",
    business_name: "BGone Construction",
  };
  const firstLoadProjects = [
    {
      title: "Kitchen Service",
      created_at: "2026-06-20",
      image_url: "https://example.com/kitchen.jpg",
      image_urls: ["https://example.com/kitchen.jpg"],
      spotlightFeatured: true,
    },
  ];

  persistBusinessPortfolioProjects(profile, firstLoadProjects, { storage });

  const reloadedProjects = persistBusinessPortfolioProjects(
    profile,
    [
      {
        title: "Kitchen Service",
        created_at: "2026-06-20",
        image_url: "https://example.com/kitchen.jpg",
        image_urls: ["https://example.com/kitchen.jpg"],
      },
    ],
    { storage }
  );

  assert.equal(reloadedProjects[0].spotlightFeatured, true);
  assert.equal(readBusinessPortfolioStorage(storage)[0].spotlightFeatured, true);
});

test("reads shared portfolio buckets with source labels for Spotlight", () => {
  const storage = createMemoryStorage({
    [BUSINESS_PORTFOLIO_STORAGE_KEY]: JSON.stringify([
      {
        title: "Kitchen Service",
        image_urls: ["https://example.com/kitchen.jpg"],
      },
    ]),
  });

  assert.deepEqual(readAllBusinessPortfolioItems(storage), [
    {
      title: "Kitchen Service",
      image_urls: ["https://example.com/kitchen.jpg"],
      __spotlightPortfolioSource: "contractorProjects",
    },
  ]);
});

test("portfolio public surfaces use the shared proof projection", () => {
  const files = [
    "src/pages/ProjectGallery.jsx",
    "src/pages/ContractorDetails.jsx",
    "src/pages/Home.jsx",
  ];

  files.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /getBusinessPortfolioProofProjection/);
  });
});
