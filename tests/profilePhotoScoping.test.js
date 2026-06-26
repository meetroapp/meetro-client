import assert from "node:assert/strict";
import test from "node:test";

import {
  getScopedProfilePhoto,
  getScopedProfilePhotoKey,
} from "../src/utils/profilePhotoScoping.js";

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
