import test from "node:test";
import assert from "node:assert/strict";

import { getWorkCenterPrimaryCtaLabel } from "../src/utils/workCenterCtaLabels.js";
import { t } from "../src/utils/language.js";
import { getWorkflowTitle } from "../src/utils/workflowTypes.js";

test("Work Center primary CTAs are verb-first in English", () => {
  assert.equal(
    getWorkCenterPrimaryCtaLabel("start_evaluation", "en"),
    "Record Evaluation Notes"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("create_proposal", "en"),
    "Prepare Proposal"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("open_conversation", "en"),
    "Continue Conversation"
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
  assert.equal(
    getWorkCenterPrimaryCtaLabel("complete_work", "en"),
    "Record Completion"
  );
});

test("Work Center primary CTAs preserve Spanish labels", () => {
  assert.equal(
    getWorkCenterPrimaryCtaLabel("start_evaluation", "es"),
    "Registrar notas de evaluación"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("create_proposal", "es"),
    "Preparar propuesta"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("open_conversation", "es"),
    "Continuar conversación"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("mark_en_route", "es"),
    "Marcar en camino"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("mark_arrived", "es"),
    "Marcar llegada"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("complete_work", "es"),
    "Registrar finalización"
  );
});

test("Work Center primary CTA labels fall back to English", () => {
  assert.equal(
    getWorkCenterPrimaryCtaLabel("close_job", "fr"),
    "Review Closure"
  );
});

test("Work Center close action language stays closure-specific", () => {
  assert.equal(
    getWorkCenterPrimaryCtaLabel("close_job", "en"),
    "Review Closure"
  );
  assert.equal(
    getWorkCenterPrimaryCtaLabel("close_job", "es"),
    "Revisar cierre"
  );
});

test("completion closure and history labels remain distinct", () => {
  assert.equal(t("universalCloseout", "en"), "Completion Sheet");
  assert.equal(t("completeCloseout", "en"), "Review Closure");
  assert.equal(t("yesCloseProject", "en"), "Yes, save to history");
  assert.equal(t("companionContextCompletionTitle", "en"), "Closure Review");
  assert.equal(
    getWorkflowTitle("workflow_completion_closeout", "en"),
    "Completion Record"
  );

  ["es", "fr", "pt-BR"].forEach((language) => {
    assert.ok(t("yesCloseProject", language));
    assert.notEqual(t("yesCloseProject", language), "yesCloseProject");
    assert.ok(t("companionContextCompletionTitle", language));
    assert.notEqual(
      t("companionContextCompletionTitle", language),
      "companionContextCompletionTitle"
    );
  });
});
