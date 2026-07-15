import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyBusinessIdentityFields,
  getBusinessIdentityProjection,
} from "../src/utils/businessIdentity.js";
import { getBusinessVerificationProjection } from "../src/utils/businessVerification.js";
import { getSpotlightAvatarUrl } from "../src/utils/localSpotlightVisibility.js";
import { t } from "../src/utils/language.js";

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed).map(([key, value]) => [key, String(value)]));

  return {
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

test("business identity projection keeps Business Profile and Public Profile facts aligned", () => {
  const storage = createStorage({
    contractorProfile: JSON.stringify({
      id: "business-1",
      business_name: "BGONE Home Renovation",
      serviceSpecialties: ["garage_door_opener_installation", "drywall_repair"],
      serviceArea: "Lee County",
      image_url: "profile-photo.jpg",
      logo: "logo.jpg",
      business_verified: true,
    }),
    businessName: "Legacy Business Name",
  });

  const profileIdentity = getBusinessIdentityProjection({}, { storage });
  const publicRecord = applyBusinessIdentityFields({}, { storage });
  const publicIdentity = getBusinessIdentityProjection(publicRecord, { storage });

  assert.equal(profileIdentity.businessName, "BGONE Home Renovation");
  assert.equal(publicIdentity.businessName, profileIdentity.businessName);
  assert.equal(publicIdentity.imageUrl, profileIdentity.imageUrl);
  assert.equal(publicIdentity.servicesSummary, profileIdentity.servicesSummary);
  assert.equal(publicIdentity.verificationStatus, "verified");
  assert.equal(publicIdentity.verification.verificationLabel, "Verified Business");
  assert.equal(publicIdentity.publicTrustSummary, profileIdentity.publicTrustSummary);
});

test("business verification projection normalizes public-safe trust layers", () => {
  const verified = getBusinessVerificationProjection(
    {
      businessName: "Verified Pro",
      business_verified: true,
      licensedInsured: true,
      totalReviews: 3,
    },
    { translate: t }
  );
  const pending = getBusinessVerificationProjection(
    {
      businessName: "Pending Pro",
    },
    { translate: t }
  );

  assert.equal(verified.status, "verified");
  assert.equal(verified.verificationLabel, "Verified Business");
  assert.equal(verified.compactBadgeText, "Verified");
  assert.equal(verified.credentialsLabel, "Credentials provided");
  assert.equal(verified.layers.identity.complete, true);
  assert.equal(verified.layers.business.complete, true);
  assert.equal(verified.layers.credentials.complete, true);
  assert.equal(verified.layers.reputation.complete, true);

  assert.equal(pending.status, "not_verified");
  assert.equal(pending.verificationLabel, "Not verified");
  assert.equal(pending.publicTrustSummary, "Business verification is not completed yet.");
  assert.equal(pending.layers.business.complete, false);
});

test("portfolio and spotlight cards use the same business identity image fallback", () => {
  const storage = createStorage({
    contractorProfile: JSON.stringify({
      id: "business-portfolio",
      business_name: "River City Handyman",
      logo: "logo-fallback.jpg",
      ownerAvatar: "owner.jpg",
    }),
  });
  const portfolioRecord = applyBusinessIdentityFields(
    {
      businessPortfolio: [{ id: "project-1", title: "Door Repair" }],
    },
    { storage }
  );

  assert.equal(portfolioRecord.businessName, "River City Handyman");
  assert.equal(portfolioRecord.imageUrl, "logo-fallback.jpg");
  assert.equal(getSpotlightAvatarUrl(portfolioRecord), "logo-fallback.jpg");
});

test("business identity image fallback prefers profile photo, then logo, then owner avatar, then initials", () => {
  assert.equal(
    getBusinessIdentityProjection({
      businessName: "Priority Business",
      image_url: "profile.jpg",
      logo: "logo.jpg",
      ownerAvatar: "owner.jpg",
    }).imageUrl,
    "profile.jpg"
  );
  assert.equal(
    getBusinessIdentityProjection({
      businessName: "Logo Business",
      logo: "logo.jpg",
      ownerAvatar: "owner.jpg",
    }).imageUrl,
    "logo.jpg"
  );
  const ownerFallback = getBusinessIdentityProjection({
    businessName: "Owner Business",
    ownerAvatar: "owner.jpg",
  });

  assert.equal(ownerFallback.imageUrl, "owner.jpg");
  assert.equal(getBusinessIdentityProjection({ businessName: "No Image LLC" }).initials, "NI");
});

test("business-facing screens use the shared business identity projection helper", () => {
  const files = [
    "src/pages/ContractorProfile.jsx",
    "src/pages/ContractorDetails.jsx",
    "src/pages/ProjectGallery.jsx",
    "src/pages/Home.jsx",
    "src/pages/ConversationThread.jsx",
    "src/pages/QuoteBuilder.jsx",
  ];

  files.forEach((file) => {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(
      source,
      /businessIdentity|getBusinessIdentityProjection|applyBusinessIdentityFields|conversationIdentity|getBusinessConversationIdentity/
    );
  });
});

test("business-facing trust surfaces use the shared verification projection", () => {
  const files = [
    "src/pages/ContractorProfile.jsx",
    "src/pages/ContractorDetails.jsx",
    "src/pages/ProjectGallery.jsx",
    "src/utils/businessIdentity.js",
  ];

  files.forEach((file) => {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /businessVerification|getBusinessVerificationProjection|verification\./);
  });

  const discoverSource = readFileSync(
    new URL("../src/pages/Discover.jsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    discoverSource,
    /businessVerification|getBusinessVerificationProjection|verification\./
  );

  const quoteSource = readFileSync(new URL("../src/pages/QuoteBuilder.jsx", import.meta.url), "utf8");
  const invoiceSource = readFileSync(new URL("../src/pages/InvoiceBuilder.jsx", import.meta.url), "utf8");

  assert.doesNotMatch(quoteSource, /Verified Business|verifiedBusiness|licensedInsured/);
  assert.doesNotMatch(invoiceSource, /Verified Business|verifiedBusiness|licensedInsured/);
});
