import assert from "node:assert/strict";
import test from "node:test";
import { filterWorkCenterSources, getWorkCenterSource, getWorkCenterSourceCopy } from "../src/utils/workCenterSourcePresentation.js";

const ordinary = Object.freeze({ source: "CANONICAL_BACKEND_READ", requestId: 24, relationshipId: 8 });
const emergency = Object.freeze({ source_type: "emergency_request", requestId: null, emergencyRequestId: 24, relationshipId: 9 });
const external = Object.freeze({ authority: { kind: "BUSINESS_CUSTOMER" }, requestId: null, relationshipId: null });
const jobs = Object.freeze([ordinary, emergency, external]);

test("All retains both sources and unrelated sources without changing records", () => {
  assert.deepEqual(filterWorkCenterSources(jobs), jobs);
  assert.equal(filterWorkCenterSources(jobs)[1], emergency);
  assert.equal(emergency.requestId, null);
});
test("Job Requests excludes Emergency and external business jobs", () => {
  assert.deepEqual(filterWorkCenterSources(jobs, "request"), [ordinary]);
});
test("Emergency uses exact source identity rather than numeric ID or title", () => {
  assert.deepEqual(filterWorkCenterSources(jobs, "emergency"), [emergency]);
  assert.equal(getWorkCenterSource({ ...ordinary, title: "Emergency leak" }), "request");
  assert.equal(getWorkCenterSource({ emergencyRequestId: 24 }), "unknown");
});
test("explicit canonical source takes precedence over compatibility request IDs", () => {
  assert.equal(getWorkCenterSource({ ...emergency, requestId: 24 }), "emergency");
  assert.equal(getWorkCenterSource({ ...ordinary, source_type: "business_document" }), "unknown");
});
test("existing Evaluation source context retains Emergency identity", () => {
  assert.equal(getWorkCenterSource({ aggregate: { sourceContext: { type: "emergency_request", emergencyRequestId: 24 } } }), "emergency");
});
test("source identity remains stable through every lifecycle and payment status", () => {
  for (const status of ["assigned", "professional_en_route", "professional_arrived", "evaluation", "quote", "awaiting_approval", "deposit", "work_in_progress", "completed", "PARTIALLY_PAID", "PAID"]) {
    assert.equal(getWorkCenterSource({ ...emergency, status }), "emergency");
    assert.equal(getWorkCenterSource({ ...ordinary, status }), "request");
  }
});
test("normal and Emergency source labels are explicit and localized", () => {
  assert.equal(getWorkCenterSourceCopy().requestBadge, "Job Request");
  assert.equal(getWorkCenterSourceCopy().emergency, "Emergency");
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    assert.ok(getWorkCenterSourceCopy(language).label);
    assert.ok(getWorkCenterSourceCopy(language).unknown);
  }
});
