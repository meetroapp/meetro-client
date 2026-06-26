import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRequestMatchingFields,
  enrichRequestWithMatchingFields,
  inferRequestSpecialty,
} from "../src/utils/requestMatchingFields.js";

test("infers home-service specialties for homeowner-created requests", () => {
  assert.equal(
    inferRequestSpecialty({ title: "Front door replacement" }),
    "door_replacement"
  );
  assert.equal(inferRequestSpecialty({ title: "Door repair needed" }), "door_repair");
  assert.equal(inferRequestSpecialty({ description: "Paint living room" }), "painting");
  assert.equal(inferRequestSpecialty({ description: "Drywall patch" }), "drywall");
  assert.equal(inferRequestSpecialty({ issue: "Kitchen plumbing leak" }), "plumbing");
  assert.equal(inferRequestSpecialty({ issue: "Outlet not working" }), "electrical");
  assert.equal(inferRequestSpecialty({ title: "Tile repair" }), "tile");
  assert.equal(inferRequestSpecialty({ title: "Cabinet replacement" }), "cabinetry");
  assert.equal(inferRequestSpecialty({ title: "Flooring installation" }), "flooring");
  assert.equal(inferRequestSpecialty({ title: "Pressure washing driveway" }), "pressure_washing");
  assert.equal(
    inferRequestSpecialty({ title: "Appliance installation" }),
    "appliance_installation"
  );
});

test("infers property, healthcare, and transportation specialties safely", () => {
  assert.equal(
    inferRequestSpecialty({ title: "Tenant maintenance ticket for Unit 204" }),
    "tenant_ticket"
  );
  assert.equal(
    inferRequestSpecialty({ title: "Rental maintenance for unit turn" }),
    "rental_maintenance"
  );
  assert.equal(inferRequestSpecialty({ title: "Nursing support needed" }), "nursing");
  assert.equal(inferRequestSpecialty({ title: "Caregiver for senior care" }), "senior_care");
  assert.equal(inferRequestSpecialty({ title: "Home health visit" }), "home_health");
  assert.equal(
    inferRequestSpecialty({ title: "Private transportation to appointment" }),
    "private_transportation"
  );
});

test("builds consistent request matching fields without changing display category", () => {
  const fields = buildRequestMatchingFields({
    title: "Paint the living room",
    category: "Painting",
  });

  assert.equal(fields.category, "Painting");
  assert.equal(fields.requestCategory, "painting");
  assert.equal(fields.request_category, "painting");
  assert.equal(fields.serviceSpecialty, "painting");
  assert.equal(fields.service_specialty, "painting");
  assert.equal(fields.serviceDomain, "home_services");
  assert.equal(fields.service_domain, "home_services");
});

test("unknown request types fail closed and do not default to handyman", () => {
  const fields = buildRequestMatchingFields({
    title: "Mystery future service",
    category: "unknown_future_service",
  });

  assert.equal(fields.requestCategory, "unknown_future_service");
  assert.equal(fields.serviceSpecialty, "");
  assert.equal(fields.serviceDomain, "");
});

test("explicit unknown domains fail closed even when category text exists", () => {
  const fields = buildRequestMatchingFields({
    title: "Paint one room",
    category: "painting",
    serviceDomain: "mystery_domain",
  });

  assert.equal(fields.requestCategory, "painting");
  assert.equal(fields.serviceSpecialty, "painting");
  assert.equal(fields.serviceDomain, "");
});

test("enriches request records with camelCase and snake_case matching fields", () => {
  const enriched = enrichRequestWithMatchingFields({
    id: "request-1",
    title: "Install appliance",
  });

  assert.equal(enriched.id, "request-1");
  assert.equal(enriched.requestCategory, "appliance_installation");
  assert.equal(enriched.request_category, "appliance_installation");
  assert.equal(enriched.serviceSpecialty, "appliance_installation");
  assert.equal(enriched.service_specialty, "appliance_installation");
  assert.equal(enriched.serviceDomain, "home_services");
  assert.equal(enriched.service_domain, "home_services");
});

