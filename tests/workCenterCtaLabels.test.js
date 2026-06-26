import test from "node:test";
import assert from "node:assert/strict";

import { getWorkCenterPrimaryCtaLabel } from "../src/utils/workCenterCtaLabels.js";

test("Work Center primary CTAs are verb-first in English", () => {
  assert.equal(
    getWorkCenterPrimaryCtaLabel("start_evaluation", "en"),
    "Record Evaluation Notes"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("mark_en_route", "en"),
    "Mark On The Way"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("mark_arrived", "en"),
    "Mark Arrived"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("create_receipt", "en"),
    "Create Receipt"
  );
});

test("Work Center primary CTAs preserve Spanish labels", () => {
  assert.equal(
    getWorkCenterPrimaryCtaLabel("start_evaluation", "es"),
    "Registrar notas de evaluación"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("mark_en_route", "es"),
    "Marcar en camino"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("mark_arrived", "es"),
    "Marcar llegada"
  );
});

test("Work Center primary CTA labels fall back to English", () => {
  assert.equal(
    getWorkCenterPrimaryCtaLabel("close_job", "fr"),
    "Close Job"
  );
});
