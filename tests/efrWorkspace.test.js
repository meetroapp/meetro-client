import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getEfrCopy } from "../src/utils/efrLanguage.js";

const files = [
  "../src/components/CanonicalJobEvaluation.jsx",
  "../src/components/CanonicalFindingsPanel.jsx",
  "../src/components/CanonicalRecommendationsPanel.jsx",
  "../src/components/CustomerProjectAssessment.jsx",
];

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("EFR workspace uses server-owned actions and canonical refetch", () => {
  const evaluation = source(files[0]);
  const findings = source(files[1]);
  const recommendations = source(files[2]);
  assert.match(evaluation, /COMPLETE_EVALUATION/);
  assert.match(findings, /REVIEW_FINDINGS/);
  assert.match(findings, /REVIEW_RECOMMENDATIONS/);
  assert.match(findings, /CREATE_QUOTE/);
  assert.match(findings, /loadCanonicalFindingsForEvaluation/);
  assert.match(recommendations, /loadCanonicalRecommendationsForFinding/);
  assert.doesNotMatch(
    `${evaluation}\n${findings}\n${recommendations}`,
    /localStorage|sessionStorage|workflow_quote_sent|optimistic/i
  );
});

test("customer Project Journey consumes only exact canonical Job EFR", () => {
  const projectDetails = source("../src/pages/ProjectDetails.jsx");
  const customer = source("../src/components/CustomerProjectAssessment.jsx");
  assert.match(projectDetails, /CustomerProjectAssessment/);
  assert.match(projectDetails, /jobId=\{requestModificationState\.jobId\}/);
  assert.match(customer, /fetchCustomerEfr/);
  assert.match(customer, /data-customer-efr-status/);
  assert.doesNotMatch(
    customer,
    /localStorage|sessionStorage|internalNotes|internalCost|costBasis|integrityHash|idempotencyKey/
  );
});

test("EFR controls meet the compact 44px contract and expose semantic headings", () => {
  for (const path of files) {
    const value = source(path);
    assert.match(value, /minHeight:\s*44/);
    assert.doesNotMatch(value, /whiteSpace:\s*["']nowrap/);
  }
  assert.match(source(files[0]), /aria-labelledby="canonical-job-evaluation-title"/);
  assert.match(source(files[1]), /aria-labelledby="canonical-findings-title"/);
  assert.match(source(files[3]), /aria-labelledby="customer-project-assessment-title"/);
});

test("all active EFR copy is available in EN, ES, FR, and PT-BR", () => {
  for (const language of ["en", "es", "fr", "pt-BR"]) {
    const copy = getEfrCopy(language);
    for (const key of [
      "evaluation",
      "whatFound",
      "whatRecommend",
      "addFinding",
      "addRecommendation",
      "prepareQuote",
      "professionalFound",
      "professionalRecommends",
      "assessmentUnavailable",
    ]) {
      assert.equal(typeof copy[key], "string");
      assert.ok(copy[key].trim().length > 0);
    }
  }
});
