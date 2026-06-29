import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  getBusinessProofMetrics,
  getConversationMetrics,
  getHomeownerRequestMetrics,
  getProfessionalWorkMetrics,
} from "../src/utils/dashboardMetrics.js";
import { enrichRequestWithMatchingFields } from "../src/utils/requestMatchingFields.js";
import { buildProfessionalSpecialtyProfile } from "../src/utils/professionalOnboardingSpecialties.js";

function createStorage(seed = {}) {
  const data = new Map(
    Object.entries(seed).map(([key, value]) => [key, String(value)])
  );

  return {
    get length() {
      return data.size;
    },
    key(index) {
      return [...data.keys()][index] ?? null;
    },
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

function withStorage(seed, callback) {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = createStorage(seed);

  try {
    return callback(globalThis.localStorage);
  } finally {
    globalThis.localStorage = previousStorage;
  }
}

function professional() {
  return {
    ...buildProfessionalSpecialtyProfile({
      selectedSpecialties: ["garage_door_opener_installation"],
    }),
    businessServiceSpecialties: ["garage_door_opener_installation"],
    serviceZipCodes: "33904",
  };
}

function request(fields = {}) {
  return enrichRequestWithMatchingFields({
    requestId: fields.requestId,
    title: fields.title || "Garage opener install",
    category: fields.category || "garage_door_opener_installation",
    serviceCategory: fields.serviceCategory || "garage_door_opener_installation",
    status: fields.status || "open",
    zip: "33904",
    ...fields,
  });
}

test("business proof metrics share portfolio service review and rating counts", () => {
  const metrics = getBusinessProofMetrics(
    {
      id: "business-1",
      businessName: "Molina Services",
      businessServiceSpecialties: ["garage_door_opener_installation", "drywall_repair"],
      businessPortfolio: [
        {
          id: "project-1",
          title: "Garage Opener",
          image_url: "https://example.com/opener.jpg",
          spotlightFeatured: true,
        },
        {
          id: "project-private",
          title: "Private Job",
          image_url: "https://example.com/private.jpg",
          private: true,
        },
      ],
    },
    {
      reviews: [
        { id: "review-1", rating: 5 },
        { id: "review-2", rating: 4 },
      ],
    }
  );

  assert.equal(metrics.completedProjectCount, 1);
  assert.equal(metrics.featuredProjectCount, 1);
  assert.equal(metrics.portfolioMediaCount, 1);
  assert.equal(metrics.serviceCount, 2);
  assert.equal(metrics.reviewCount, 2);
  assert.equal(metrics.rating, "4.5");
});

test("professional metrics keep leads schedule active quote and history counts aligned", () => {
  withStorage(
    {
      homeownerRequests: JSON.stringify([
        request({ requestId: "new-1", status: "open" }),
        request({
          requestId: "accepted-1",
          status: "accepted",
          businessId: "business-1",
          acceptedByBusinessId: "business-1",
        }),
        request({
          requestId: "scheduled-1",
          status: "scheduled",
          businessId: "business-1",
          acceptedByBusinessId: "business-1",
          schedule: { date: "2026-07-01", time: "12:00 PM" },
        }),
        request({
          requestId: "closed-1",
          status: "closed",
          businessId: "business-1",
          acceptedByBusinessId: "business-1",
        }),
      ]),
      workCenterQuoteHistory: JSON.stringify([
        { quoteId: "quote-1", projectId: "project-1", status: "sent" },
        { quoteId: "quote-2", projectId: "project-2", status: "accepted" },
      ]),
      completedProjects: JSON.stringify([
        { id: "completed-1", projectId: "project-completed", status: "closed" },
      ]),
      meetro_business_schedule: JSON.stringify([
        { id: "schedule-1", projectId: "project-schedule", status: "scheduled" },
      ]),
      activeWorkRequestId: "active-1",
      activeWorkStatus: "active",
      activeWorkService: "Garage opener install",
    },
    () => {
      const metrics = getProfessionalWorkMetrics({
        homeownerRequests: [
          request({ requestId: "new-1", status: "open" }),
        ],
        professional: professional(),
      });

      assert.equal(metrics.newLeadCount, 1);
      assert.equal(metrics.scheduledJobsCount, metrics.scheduleItems.length);
      assert.ok(metrics.scheduledJobsCount >= 1);
      assert.ok(metrics.activeWorkCount >= 1);
      assert.equal(metrics.pendingQuoteCount, 1);
      assert.equal(metrics.quoteResponseAlertCount, 1);
      assert.ok(metrics.completedJobsCount >= 1);
    }
  );
});

test("homeowner and conversation metrics expose shared request and unread counts", () => {
  withStorage(
    {
      "meetro_conversation_read_conv-1_homeowner": "false",
      "meetro_conversation_read_conv-2_homeowner": "true",
    },
    () => {
      const homeowner = getHomeownerRequestMetrics({
        requests: [
          { requestId: "active-1", status: "accepted" },
          { requestId: "closed-1", status: "closed" },
        ],
        history: [{ id: "history-1" }],
      });
      const conversations = getConversationMetrics({
        role: "homeowner",
        registry: [
          { id: "conv-1", unread: false },
          { id: "conv-2", unread: true },
        ],
      });

      assert.equal(homeowner.activeRequestsCount, 1);
      assert.equal(homeowner.completedRequestsCount, 1);
      assert.equal(conversations.unreadConversationCount, 1);
      assert.equal(conversations.conversationCount, 2);
    }
  );
});

test("audited count surfaces use shared metrics projections", () => {
  const sources = [
    "../src/pages/Home.jsx",
    "../src/pages/BusinessDashboard.jsx",
    "../src/pages/ContractorDashboard.jsx",
    "../src/pages/MessagesInbox.jsx",
    "../src/components/BottomNav.jsx",
  ].map((sourcePath) =>
    fs.readFileSync(new URL(sourcePath, import.meta.url), "utf8")
  );

  sources.forEach((source) => {
    assert.match(source, /dashboardMetrics/);
  });
});

test("Work Center mission counts use shared professional metrics", () => {
  const source = fs.readFileSync(
    new URL("../src/pages/ContractorDashboard.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /const professionalWorkMetrics = getProfessionalWorkMetrics/);
  assert.match(source, /professionalWorkMetrics\.newLeadCount/);
  assert.match(source, /professionalWorkMetrics\.scheduleItems\.filter/);
  assert.match(source, /professionalWorkMetrics\.pendingQuoteCount/);
  assert.match(source, /professionalWorkMetrics\.quoteResponseAlertCount/);
  assert.match(source, /const activeWorkCount = professionalWorkMetrics\.activeWorkCount/);
  assert.match(source, /professionalWorkMetrics\.completedJobsCount/);
  assert.doesNotMatch(
    source,
    /const activeWorkCount = Math\.max\(\s*activeJobs\.length/
  );
});

test("Discover business cards use shared public proof metrics", () => {
  const source = fs.readFileSync(
    new URL("../src/pages/Discover.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /getBusinessPortfolioProofProjection/);
  assert.match(source, /const portfolioProof = getBusinessPortfolioProofProjection/);
  assert.match(source, /portfolioProof\.averageRating \|\| t\("discoverRatingPending"/);
  assert.match(source, /reviewCount: proof\.reviewCount/);
});
