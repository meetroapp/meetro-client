import assert from "node:assert/strict";
import test from "node:test";

import {
  getPersonalProfilePhotoForRecord,
  getScopedProfilePhoto,
  getScopedProfilePhotoKey,
  isSameStoredUserProfile,
} from "../src/utils/profilePhotoScoping.js";
import { resolveRelationshipIdentity } from "../src/utils/relationshipIdentity.js";

function createMemoryStorage(seed = {}) {
  const store = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

test("business profile logos are scoped by active business identity", () => {
  const storage = createMemoryStorage({
    businessName: "BGONE Home Renovation",
    businessCategory: "handyman",
  });
  const bgoneProfile = {
    id: "bgone-business",
    business_name: "BGONE Home Renovation",
    category: "handyman",
  };
  const cleaningProfile = {
    id: "cleaning-lady-business",
    business_name: "Cleaning Lady",
    category: "cleaning",
  };

  storage.setItem(
    getScopedProfilePhotoKey("business", bgoneProfile, storage),
    "bgone-logo.png"
  );

  assert.equal(getScopedProfilePhoto("business", bgoneProfile, storage), "bgone-logo.png");
  assert.equal(getScopedProfilePhoto("business", cleaningProfile, storage), "");
});

test("legacy business logo is ignored when stored contractor profile belongs to another account", () => {
  const storage = createMemoryStorage({
    businessName: "Cleaning Lady",
    businessCategory: "cleaning",
    contractorProfile: JSON.stringify({
      id: "bgone-business",
      businessName: "BGONE Home Renovation",
      image_url: "bgone-logo.png",
    }),
    meetroBusinessProfilePhoto: "bgone-global-logo.png",
  });

  assert.equal(
    getScopedProfilePhoto(
      "business",
      {
        id: "cleaning-lady-business",
        business_name: "Cleaning Lady",
        category: "cleaning",
      },
      storage
    ),
    ""
  );
});

test("personal profile photo does not fall back to business logo", () => {
  const storage = createMemoryStorage({
    userId: "user-1",
    userEmail: "user@example.com",
    meetroBusinessProfilePhoto: "bgone-global-logo.png",
  });

  assert.equal(getScopedProfilePhoto("personal", {}, storage), "");
});

test("personal profile photo falls back to the saved user record only for matching users", () => {
  const storage = createMemoryStorage({
    userId: "maggie-1",
    userEmail: "maggie@example.com",
    user: JSON.stringify({
      id: "maggie-1",
      email: "maggie@example.com",
      profile_photo_url: "maggie-profile.jpg",
    }),
  });

  assert.equal(
    getScopedProfilePhoto("personal", {}, storage),
    "maggie-profile.jpg"
  );
  assert.equal(
    isSameStoredUserProfile({ homeowner_email: "maggie@example.com" }, storage),
    true
  );
  assert.equal(
    getPersonalProfilePhotoForRecord({ homeowner_email: "maggie@example.com" }, storage),
    "maggie-profile.jpg"
  );
  assert.equal(
    getPersonalProfilePhotoForRecord({ homeowner_email: "ada@example.com" }, storage),
    ""
  );
});

test("standard Meetro user photos resolve from saved profile aliases used by chat surfaces", () => {
  const storage = createMemoryStorage({
    userId: "user-42",
    userEmail: "maggie@example.com",
    user: JSON.stringify({
      id: "user-42",
      email: "maggie@example.com",
      profile_photo_url: "maggie-saved-profile.jpg",
    }),
  });
  const chatRecord = {
    professionalUserId: "user-42",
    professionalEmail: "maggie@example.com",
    professionalName: "Maggie Customer",
    meetroAccountLinked: true,
  };

  assert.equal(isSameStoredUserProfile(chatRecord, storage), true);
  assert.equal(
    getPersonalProfilePhotoForRecord(chatRecord, storage),
    "maggie-saved-profile.jpg"
  );

  const customerIdentity = resolveRelationshipIdentity({
    record: chatRecord,
    viewerRole: "business",
    typeLabel: "Customer",
    isLinked: true,
    storage,
  });

  assert.equal(customerIdentity.avatar, "maggie-saved-profile.jpg");

  const professionalIdentity = resolveRelationshipIdentity({
    record: chatRecord,
    viewerRole: "business",
    typeLabel: "Professional",
    isLinked: true,
    storage,
  });

  assert.equal(professionalIdentity.avatar, "maggie-saved-profile.jpg");

  const homeownerViewingProfessional = resolveRelationshipIdentity({
    record: {
      homeowner_id: "user-42",
      businessName: "Reliable Electric",
    },
    viewerRole: "homeowner",
    typeLabel: "Professional",
    isLinked: true,
    storage,
  });

  assert.equal(homeownerViewingProfessional.avatar, "");
});

test("conversation row identity does not derive avatars or initials from generic relationship labels", () => {
  const businessIdentity = resolveRelationshipIdentity({
    relationship: {
      name: "Relationship",
      initials: "R",
      typeLabel: "Business",
    },
    record: {
      businessName: "BGone Handyman",
      businessProfilePhoto: "bgone-logo.jpg",
      project_title: "Emergency Plumbing",
    },
    viewerRole: "homeowner",
    typeLabel: "Business",
  });

  assert.equal(businessIdentity.displayName, "BGone Handyman");
  assert.equal(businessIdentity.avatar, "bgone-logo.jpg");
  assert.equal(businessIdentity.initials, "BH");

  const titleFallbackIdentity = resolveRelationshipIdentity({
    relationship: {
      name: "Relationship",
      initials: "R",
      typeLabel: "Business",
    },
    record: {
      project_title: "Emergency Plumbing",
    },
    viewerRole: "homeowner",
    typeLabel: "Business",
  });

  assert.equal(titleFallbackIdentity.displayName, "Emergency Plumbing");
  assert.equal(titleFallbackIdentity.initials, "EP");
});

test("business profile photo can recover from provider aliases without leaking to other businesses", () => {
  const storage = createMemoryStorage({
    businessName: "BGONE Home Renovation",
    businessCategory: "handyman",
    contractorProfile: JSON.stringify({
      id: "bgone-business",
      businessName: "BGONE Home Renovation",
      category: "handyman",
      image_url: "bgone-logo.png",
    }),
  });

  assert.equal(
    getScopedProfilePhoto(
      "business",
      { providerName: "BGONE Home Renovation" },
      storage
    ),
    "bgone-logo.png"
  );
  assert.equal(
    getScopedProfilePhoto(
      "business",
      { providerName: "Reliable Electric" },
      storage
    ),
    ""
  );
});
