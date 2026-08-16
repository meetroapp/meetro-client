import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("four workflow surfaces expose contextual assistance without silent authority", () => {
  const upload = read("src/pages/Upload.jsx");
  const evaluation = read("src/components/CanonicalJobEvaluation.jsx");
  const dashboard = read("src/pages/ContractorDashboard.jsx");
  const quote = read("src/pages/QuoteBuilder.jsx");
  const invoice = read("src/components/ProfessionalInvoiceWorkspace.jsx");
  assert.match(upload, /pendingInterpretation/);
  assert.doesNotMatch(upload.slice(upload.indexOf("async function runInterpretation"), upload.indexOf("function updatePendingInterpretationField")), /applyJobRequestInterpretationPatch/);
  assert.match(evaluation, /ContextualAskMeetro/);
  assert.match(evaluation, /recordWorkflowReview/);
  assert.match(dashboard, /quoteBuilder\?jobId=/);
  assert.match(dashboard, /getAskMeetroWorkflowCopy\(activeLanguage\)\.estimate/);
  assert.match(quote, /getCanonicalJobIdFromRoute\(window\.location\.hash\)/);
  assert.match(quote, /canonicalJobIdPattern\.test\(jobId\)/);
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

test("Evaluation photo assistance uses confirmed lifecycle references only", () => {
  const evaluation = read("src/components/CanonicalJobEvaluation.jsx");
  const dashboard = read("src/pages/ContractorDashboard.jsx");

  assert.match(evaluation, /\/posts\/\$\{encodeURIComponent\(requestId\)\}\/lifecycle/);
  assert.match(evaluation, /data\?\.request_photos/);
  assert.match(evaluation, /photo\?\.reference_id/);
  assert.match(evaluation, /photo\?\.preview_url/);
  assert.match(evaluation, /selectedCanonicalPhotos\.map\(\(photo\) => photo\.referenceId\)/);
  assert.match(evaluation, /\{ photoReferenceIds \}/);
  assert.doesNotMatch(evaluation, /photoReferenceIds[^\n]*previewUrl/);
  assert.doesNotMatch(dashboard, /evaluationPhotos=\{getWorkCenterJobPhotos/);
});

test("Evaluation photo upload confirms canonical append and refresh before analysis", () => {
  const evaluation = read("src/components/CanonicalJobEvaluation.jsx");

  assert.match(evaluation, /createTemporaryRequestPhotoPreview/);
  assert.match(evaluation, /await uploadRequestPhotos\(\{/);
  assert.match(evaluation, /await appendHomeownerRequestPhoto\(command\)/);
  assert.match(evaluation, /expectedVersion: currentVersion/);
  assert.match(evaluation, /currentVersion = result\.requestVersion/);
  assert.doesNotMatch(evaluation, /currentVersion \+ 1/);
  assert.match(evaluation, /const refreshed = await fetchCanonicalPhotoLifecycle/);
  assert.match(evaluation, /setPhotoLifecycle\(\{ status: "ready", \.\.\.refreshed \}\)/);
  assert.match(evaluation, /pendingPhotos\.length > 0/);
  assert.match(evaluation, /selectedPhotoCount > 0/);
  assert.match(evaluation, /slice\(0, REQUEST_PHOTO_MAX_COUNT\)/);
});

test("Evaluation photo copy stays aligned across EN ES FR and PT-BR", () => {
  const source = read("src/utils/askMeetroWorkflowLanguage.js");
  for (const key of [
    "analyzePhoto",
    "selectPhoto",
    "selectPhotosHelp",
    "pendingPhotoHelp",
    "photoAuthorityUnavailable",
    "photoRefreshError",
  ]) {
    assert.equal((source.match(new RegExp(`\\b${key}:`, "g")) || []).length, 4);
  }
});
