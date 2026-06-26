import assert from "node:assert/strict";
import test from "node:test";
import {
  PUBLIC_BUSINESS_PROFILES_STORAGE_KEY,
  buildBusinessProfileShare,
  buildBusinessProfileUrl,
  getBusinessProfileShareId,
  persistBusinessProfileShareRecord,
} from "../src/utils/profileShare.js";

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

test("business profile share payload includes identity text and public URL", () => {
  const profile = {
    business_name: "Bgone Home Renovation",
    bio: "Roofing, home repairs, remodeling, and cleanup.",
    displayCategory: "Handyman",
    serviceArea: "Lee County",
  };

  const payload = buildBusinessProfileShare(profile, {
    baseUrl: "https://meetro.example/app",
    shareIntro:
      "View my Meetro business profile to see services, portfolio, reviews, and contact information.",
  });

  assert.equal(payload.title, "Bgone Home Renovation");
  assert.match(payload.text, /portfolio, reviews, and contact information/);
  assert.match(payload.text, /Roofing, home repairs/);
  assert.match(payload.text, /Handyman/);
  assert.match(payload.text, /Lee County/);
  assert.equal(
    payload.url,
    "https://meetro.example/app#contractorDetails?profileId=bgone-home-renovation"
  );
});

test("business profile share id and URL use the canonical contractorDetails route", () => {
  const profile = { id: "BGONE-123", business_name: "Bgone" };

  assert.equal(getBusinessProfileShareId(profile), "bgone-123");
  assert.equal(
    buildBusinessProfileUrl(profile, { baseUrl: "https://meetro.example" }),
    "https://meetro.example#contractorDetails?profileId=bgone-123"
  );
});

test("persistBusinessProfileShareRecord stores selected and public profile records", () => {
  const storage = createMemoryStorage();
  const profile = {
    business_name: "Cleaning Lady Services",
    category: "Cleaning",
  };

  const { profileId, publicRecord } = persistBusinessProfileShareRecord(
    profile,
    storage
  );
  const selectedContractor = JSON.parse(storage.getItem("selectedContractor"));
  const publicProfiles = JSON.parse(
    storage.getItem(PUBLIC_BUSINESS_PROFILES_STORAGE_KEY)
  );

  assert.equal(profileId, "cleaning-lady-services");
  assert.equal(publicRecord.publicProfileId, profileId);
  assert.equal(selectedContractor.publicProfileId, profileId);
  assert.equal(publicProfiles[profileId].business_name, "Cleaning Lady Services");
});
