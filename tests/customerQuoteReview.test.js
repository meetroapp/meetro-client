import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { customerQuoteLanguage } from "../src/utils/customerQuoteLanguage.js";

const componentSource = readFileSync(
  new URL("../src/components/CustomerQuoteReviewPanel.jsx", import.meta.url),
  "utf8"
);
const projectSource = readFileSync(
  new URL("../src/pages/ProjectDetails.jsx", import.meta.url),
  "utf8"
);

test("customer Quote review exposes list, detail, lineage, and terminal business states", () => {
  assert.match(componentSource, /customerQuotesTitle/);
  assert.match(componentSource, /customerQuoteReview/);
  assert.match(componentSource, /customerQuoteStatusWaiting/);
  assert.match(componentSource, /customerQuoteStatusApproved/);
  assert.match(componentSource, /customerQuoteStatusDeclined/);
  assert.match(componentSource, /customerQuoteLineageOriginal/);
  assert.match(componentSource, /customerQuoteLineageRevised/);
  assert.match(componentSource, /customerQuoteLineageAdditional/);
  assert.match(componentSource, /quote\.scopeItems/);
  assert.match(componentSource, /quote\.conditions/);
  assert.match(componentSource, /quote\.exclusions/);
});

test("decision controls require pending server actions and an explicit confirmation", () => {
  assert.match(
    componentSource,
    /quote\.businessStatus === "WAITING_ON_CUSTOMER"[\s\S]*quote\.actions\.canApprove \|\| quote\.actions\.canDecline/
  );
  assert.match(componentSource, /role="alertdialog"/);
  assert.match(componentSource, /aria-modal="true"/);
  assert.match(componentSource, /customerQuoteApproveConfirmBody/);
  assert.match(componentSource, /customerQuoteDeclineConfirmBody/);
  assert.match(componentSource, /expectedIssuedVersion: quote\.decisionCommandVersion/);
  assert.match(componentSource, /isCustomerQuoteDecisionConflict/);
  assert.match(componentSource, /await onReload\?\.\(quote\.quoteId\)/);
});

test("review remains on the exact canonical Job and local legacy data cannot grant Quote authority", () => {
  assert.match(
    projectSource,
    /fetchHomeownerRequestModification\(\{ requestId, setPage \}\)[\s\S]*fetchCustomerJobQuotes\(\{ jobId, setPage \}\)/
  );
  assert.match(
    projectSource,
    /fetchCustomerQuoteDetail\(\{[\s\S]*quoteId,[\s\S]*jobId: customerQuoteDiscovery\.jobId/
  );
  assert.match(projectSource, /<CustomerQuoteReviewPanel/);
  assert.match(projectSource, /onCloseReview=\{\(\) => setSelectedCustomerQuoteId\(""\)\}/);
  assert.doesNotMatch(componentSource, /localStorage|sessionStorage/);
  assert.doesNotMatch(componentSource, /Send in Meetro|Copy Quote|navigator\.share|download/i);
});

test("all customer Quote copy is complete in EN, ES, FR, and PT-BR", () => {
  const languages = ["en", "es", "fr", "pt-BR"];
  const englishKeys = Object.keys(customerQuoteLanguage.en).sort();
  for (const language of languages) {
    assert.deepEqual(Object.keys(customerQuoteLanguage[language]).sort(), englishKeys);
    for (const key of englishKeys) {
      assert.equal(typeof customerQuoteLanguage[language][key], "string");
      assert.notEqual(customerQuoteLanguage[language][key].trim(), "");
    }
  }
});

test("customer Quote controls and dialog preserve mobile and accessibility safeguards", () => {
  const minHeight44Count = (componentSource.match(/minHeight: 44/g) || []).length;
  assert.ok(minHeight44Count >= 5);
  assert.match(componentSource, /aria-labelledby="customer-quotes-title"/);
  assert.match(componentSource, /aria-live="polite"/);
  assert.match(componentSource, /role=\{commandState === "error" \? "alert" : "status"\}/);
  assert.match(componentSource, /width: "min\(100%, 440px\)"/);
  assert.match(componentSource, /flexWrap: "wrap"/);
  assert.match(componentSource, /maxHeight: "calc\(100dvh - 36px\)"/);
});
