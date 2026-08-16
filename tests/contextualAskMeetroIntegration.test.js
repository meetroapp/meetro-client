import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("four workflow surfaces expose contextual assistance without silent authority", () => {
  const upload = read("src/pages/Upload.jsx");
  const evaluation = read("src/components/CanonicalJobEvaluation.jsx");
  const quote = read("src/pages/QuoteBuilder.jsx");
  const invoice = read("src/components/ProfessionalInvoiceWorkspace.jsx");
  assert.match(upload, /pendingInterpretation/);
  assert.doesNotMatch(upload.slice(upload.indexOf("async function runInterpretation"), upload.indexOf("function updatePendingInterpretationField")), /applyJobRequestInterpretationPatch/);
  assert.match(evaluation, /ContextualAskMeetro/);
  assert.match(evaluation, /recordWorkflowReview/);
  assert.match(quote, /applyConfirmedQuoteComposition/);
  assert.match(invoice, /canonicalFinancialTruth/);
  for (const source of [evaluation, quote, invoice]) assert.match(source, /directMutationAllowed|recordWorkflowReview|recordQuoteCompositionReview/);
});

test("contextual assistant copy covers EN ES FR and PT-BR", () => {
  const source = read("src/utils/askMeetroWorkflowLanguage.js");
  for (const locale of ["en", "es", "fr", "pt-BR"]) assert.match(source, new RegExp(`(?:^|\\n)  ["']?${locale}`));
  assert.match(source, /Nothing changes until you choose an action/);
});

test("contextual controls and workflow actions preserve 44px minimum targets", () => {
  const panel = read("src/components/ContextualAskMeetro.jsx");
  const evaluation = read("src/components/CanonicalJobEvaluation.jsx");
  const invoice = read("src/components/ProfessionalInvoiceWorkspace.jsx");
  assert.match(panel, /minHeight: 44/);
  assert.match(panel, /width: 44, height: 44/);
  assert.match(evaluation, /minHeight: 44/);
  assert.match(invoice, /minHeight: 44/);
});
