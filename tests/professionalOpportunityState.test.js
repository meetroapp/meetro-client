import assert from "node:assert/strict";
import test from "node:test";

import {
  PROFESSIONAL_OPPORTUNITY_STATUS,
  resolveProfessionalOpportunityCollection,
} from "../src/utils/professionalOpportunityState.js";

const opportunity = (overrides = {}) => ({
  id: 41,
  request_id: 41,
  title: "Paint living room",
  description: "Two walls",
  service_domain: "home_services",
  service_specialty: "painting",
  status: "open",
  ...overrides,
});

test("authoritative opportunities distinguish failure, malformed, empty, and ready", () => {
  assert.equal(resolveProfessionalOpportunityCollection({ response: { ok: false } }).status, PROFESSIONAL_OPPORTUNITY_STATUS.UNAVAILABLE);
  assert.equal(resolveProfessionalOpportunityCollection({ response: { ok: true }, data: {} }).status, PROFESSIONAL_OPPORTUNITY_STATUS.UNAVAILABLE);
  assert.equal(resolveProfessionalOpportunityCollection({ response: { ok: true }, data: { opportunities: [] } }).status, PROFESSIONAL_OPPORTUNITY_STATUS.EMPTY);
  assert.equal(resolveProfessionalOpportunityCollection({ response: { ok: true }, data: { opportunities: [opportunity()] } }).status, PROFESSIONAL_OPPORTUNITY_STATUS.READY);
});

test("authoritative opportunities deduplicate only by canonical request id", () => {
  const collection = resolveProfessionalOpportunityCollection({
    response: { ok: true },
    data: { opportunities: [opportunity(), opportunity({ description: "Updated projection" })] },
  });

  assert.equal(collection.records.length, 1);
  assert.equal(collection.records[0].request_id, 41);
  assert.equal(collection.records[0].project_description, "Updated projection");
});
