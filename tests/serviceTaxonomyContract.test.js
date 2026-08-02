import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getProfessionalCapabilityCategories } from "../src/utils/professionalCapabilityLibrary.js";
import { getRequestIntelligenceServices } from "../src/utils/requestIntelligence.js";
import { getSupportedRequestHelpServices } from "../src/utils/requestHelpSubmission.js";

const BACKEND_PROFESSIONAL_IDS_SHA256 =
  "3dac392bf7acb2b3442ab8b7edf643cf58a38341d15c1294951d344d076770ee";
const BACKEND_REQUEST_IDS_SHA256 =
  "3263c95c42b2711991109003429884397bf766b0a46e6b69852675fda22a94fa";

const categories = getProfessionalCapabilityCategories();
const rawProfessionalServices = categories.flatMap((category) =>
  category.specialties.map((specialty) => ({
    id: specialty.id,
    label: specialty.label,
    domain: category.industry,
    family: category.id,
  }))
);
const professionalServiceIds = [
  ...new Set(rawProfessionalServices.map((service) => service.id)),
];
const requestServices = getSupportedRequestHelpServices(
  getRequestIntelligenceServices((_key) => _key)
);
const requestServiceIds = requestServices.map((service) => service.serviceId);

function checksum(values) {
  return createHash("sha256")
    .update([...values].sort().join("\n"))
    .digest("hex");
}

test("frontend professional and homeowner request IDs match the backend contract", () => {
  assert.equal(professionalServiceIds.length, 265);
  assert.equal(requestServiceIds.length, 246);
  assert.equal(checksum(professionalServiceIds), BACKEND_PROFESSIONAL_IDS_SHA256);
  assert.equal(checksum(requestServiceIds), BACKEND_REQUEST_IDS_SHA256);
  assert.equal(new Set(requestServiceIds).size, requestServiceIds.length);
  assert.ok(requestServiceIds.every((id) => professionalServiceIds.includes(id)));
});

test("every Request Help option carries its exact canonical matching ID", () => {
  requestServices.forEach((service) => {
    assert.match(service.serviceId, /^[a-z0-9_]+$/);
    assert.equal(service.canonicalRequestCategory, service.serviceId, service.serviceId);
  });

  for (const serviceId of [
    "indoor_air_quality",
    "tree_trimming",
    "medical_facility_cleaning",
  ]) {
    const service = requestServices.find((item) => item.serviceId === serviceId);
    assert.ok(service, serviceId);
    assert.equal(service.canonicalRequestCategory, serviceId);
  }
});

test("professional-only marketing services are explicitly excluded from Request Help", () => {
  const marketingIds = categories
    .filter((category) => category.industry === "marketing")
    .flatMap((category) => category.specialties.map((specialty) => specialty.id));

  assert.equal(new Set(marketingIds).size, 19);
  marketingIds.forEach((serviceId) => {
    assert.equal(professionalServiceIds.includes(serviceId), true, serviceId);
    assert.equal(requestServiceIds.includes(serviceId), false, serviceId);
  });
  assert.equal(professionalServiceIds.length - requestServiceIds.length, 19);
});

test("shared capability memberships never conflict on canonical label or domain", () => {
  const occurrences = Object.groupBy(rawProfessionalServices, (service) => service.id);
  const sharedIds = Object.entries(occurrences).filter(([, services]) => services.length > 1);

  assert.equal(rawProfessionalServices.length, 280);
  assert.equal(sharedIds.length, 15);
  sharedIds.forEach(([serviceId, services]) => {
    assert.equal(new Set(services.map((service) => service.label)).size, 1, serviceId);
    assert.equal(new Set(services.map((service) => service.domain)).size, 1, serviceId);
  });
});

test("Upload sends canonical request identity separately from display grouping", () => {
  const uploadSource = readFileSync(
    new URL("../src/pages/Upload.jsx", import.meta.url),
    "utf8"
  );

  assert.match(
    uploadSource,
    /requestCategory:\s*selectedCanonicalService\.canonicalRequestCategory/
  );
  assert.match(
    uploadSource,
    /request_category:\s*selectedCanonicalService\.canonicalRequestCategory/
  );
  assert.match(uploadSource, /service_specialty: selectedCanonicalService\.serviceId/);
});
