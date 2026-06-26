import test from "node:test";
import assert from "node:assert/strict";
import {
  getProfessionalReviews,
  getProfessionalReviewStats,
  saveProfessionalReview,
} from "../src/utils/reviewStorage.js";

function createStorage() {
  const data = new Map();

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

test("saves homeowner review metadata for a professional portfolio", () => {
  const storage = createStorage();

  saveProfessionalReview(
    {
      professionalId: "business_1",
      professionalName: "Bgone Home Renovation",
      customerDisplayName: "Sarah Dommerich",
      rating: 5,
      comment: "Fast and professional.",
      service: "Emergency Plumbing",
      jobId: "job_1",
      source: "job_completion_review",
      createdAt: "2026-06-20T12:00:00.000Z",
    },
    storage
  );

  const reviews = getProfessionalReviews(
    { professionalId: "business_1" },
    storage
  );

  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].customerDisplayName, "Sarah");
  assert.equal(reviews[0].service, "Emergency Plumbing");
  assert.equal(reviews[0].comment, "Fast and professional.");
});

test("deduplicates repeated job reviews and updates rating stats", () => {
  const storage = createStorage();
  const review = {
    professionalId: "business_1",
    professionalName: "Bgone Home Renovation",
    customerDisplayName: "Sarah",
    rating: 4,
    comment: "Good work.",
    service: "Door Repair",
    jobId: "job_1",
    source: "job_completion_review",
  };

  saveProfessionalReview(review, storage);
  saveProfessionalReview({ ...review, rating: 5, comment: "Great work." }, storage);

  const reviews = getProfessionalReviews(
    { professionalId: "business_1" },
    storage
  );
  const stats = getProfessionalReviewStats(reviews);

  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].rating, 5);
  assert.equal(reviews[0].comment, "Great work.");
  assert.deepEqual(stats, {
    averageRating: "5.0",
    totalReviews: 1,
  });
});

test("keeps reviews scoped to the correct business", () => {
  const storage = createStorage();

  saveProfessionalReview(
    {
      professionalId: "sarah_business",
      professionalName: "Sarah Services",
      customerDisplayName: "William",
      rating: 5,
      comment: "Sarah-only review.",
      jobId: "job_sarah",
    },
    storage
  );

  saveProfessionalReview(
    {
      professionalId: "william_business",
      professionalName: "William Services",
      customerDisplayName: "Sarah",
      rating: 3,
      comment: "William-only review.",
      jobId: "job_william",
    },
    storage
  );

  assert.equal(
    getProfessionalReviews({ professionalId: "sarah_business" }, storage)[0]
      .comment,
    "Sarah-only review."
  );
  assert.equal(
    getProfessionalReviews({ professionalId: "william_business" }, storage)[0]
      .comment,
    "William-only review."
  );
});
