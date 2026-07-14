import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildBusinessProfilePayload,
  buildBusinessProfilePayloadFromCanonical,
  getConfirmedBusinessProfile,
} from "../src/utils/businessProfilePersistence.js";

test("business profile payload projects every supported editor field without mutating input", () => {
  const fields = {
    businessName: "  Trusted Home Services  ",
    category: "Home Services",
    phone: "555-0100",
    bio: "Repairs",
    imageUrl: "https://example.test/logo.png",
    streetAddress: "100 Main Street",
    addressLine2: "Suite 2",
    businessCity: "Orlando",
    businessState: "FL",
    businessPostalCode: "32801",
    country: "US",
    serviceArea: "Greater Orlando",
    showBusinessAddressPublic: false,
    businessHours: "Monday-Friday 8-5",
    licenseNumber: "LIC-100",
    licenseState: "FL",
    licenseType: "Contractor",
    licenseExpiration: "2027-12-31",
    serviceSpecialties: ["door_repair_replacement", "door_repair_replacement"],
    availableNow: true,
    dispatchReady: false,
  };
  const before = structuredClone(fields);
  const payload = buildBusinessProfilePayload(fields);

  assert.deepEqual(fields, before);
  assert.equal(payload.business_name, "Trusted Home Services");
  assert.equal(payload.location, "Greater Orlando");
  assert.deepEqual(payload.service_specialties, ["door_repair_replacement"]);
  assert.equal(payload.available_now, true);
});

test("dashboard availability updates preserve the complete canonical profile payload", () => {
  const profile = {
    id: 7,
    business_name: "Trusted Home Services",
    category: "Home Services",
    service_specialties: ["door_repair_replacement"],
    available_now: false,
    dispatch_ready: true,
  };
  const payload = buildBusinessProfilePayloadFromCanonical(profile, {
    available_now: true,
  });

  assert.equal(payload.business_name, "Trusted Home Services");
  assert.deepEqual(payload.service_specialties, ["door_repair_replacement"]);
  assert.equal(payload.available_now, true);
  assert.equal(payload.dispatch_ready, true);
});

test("legacy canonical location is preserved as service area during reconciliation", () => {
  const payload = buildBusinessProfilePayloadFromCanonical({
    id: "profile-legacy",
    business_name: "Legacy Services",
    category: "handyman",
    location: "Lee County",
  });

  assert.equal(payload.location, "Lee County");
  assert.equal(payload.service_area, "Lee County");
});

test("public address setting controls the canonical location projection", () => {
  const payload = buildBusinessProfilePayload({
    businessName: "Business",
    category: "Home Services",
    streetAddress: "100 Main Street",
    businessCity: "Orlando",
    businessState: "FL",
    country: "US",
    serviceArea: "Greater Orlando",
    showBusinessAddressPublic: true,
  });

  assert.equal(payload.location, "100 Main Street, Orlando, FL, US");
});

test("only an explicit successful canonical backend response can confirm a profile save", () => {
  const profile = { id: 7, business_name: "Trusted Home Services" };
  const confirmed = getConfirmedBusinessProfile({
    response: { ok: true },
    data: { success: true, code: "BUSINESS_PROFILE_UPDATED", profile },
  });

  assert.equal(confirmed, profile);
  assert.equal(
    getConfirmedBusinessProfile({ response: { ok: false }, data: { profile } }),
    null
  );
  assert.equal(
    getConfirmedBusinessProfile({
      response: { ok: true },
      data: { success: true, code: "UNKNOWN", profile },
    }),
    null
  );
});

test("Business Profile contains no browser-local persistence authority for editable fields", () => {
  const source = readFileSync("src/pages/ContractorProfile.jsx", "utf8");

  assert.match(source, /getConfirmedBusinessProfile\(result\)/);
  assert.match(source, /projectConfirmedBusinessProfile\(savedProfile\)/);
  assert.doesNotMatch(source, /mergeStoredAddressFields|mergeStoredBusinessDetailFields/);
  assert.doesNotMatch(source, /persistBusinessAddressFields|persistBusinessDetailFields/);
  assert.doesNotMatch(source, /saveBusinessToDirectory/);
  assert.doesNotMatch(source, /localStorage\.setItem\("businessCountry"/);
  assert.doesNotMatch(source, /hasRequiredAddressFields/);
  assert.match(source, /!businessName\.trim\(\) \|\| !category\.trim\(\)/);
  assert.match(
    source,
    /setServiceArea\(existingProfile\.service_area \|\| existingProfile\.location \|\| ""\)/
  );
  assert.match(source, /"\/my-contractor-profile",\s*\{ cache: "no-store" \}/);
});
