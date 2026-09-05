import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(
  new URL(
    "../src/components/UnifiedBusinessDocumentWorkspace.jsx",
    import.meta.url
  ),
  "utf8"
);

const pdfSource = readFileSync(
  new URL("../src/utils/customerDocumentPdf.js", import.meta.url),
  "utf8"
);

test("Live Quote Preview renders customer-facing Notes after the status summary", () => {
  const start = workspace.indexOf("function QuotePreview(");
  const end = workspace.indexOf(
    "const QUOTE_PROPOSAL_CUSTOMER_LABELS",
    start
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const preview = workspace.slice(start, end);

  const summaryIndex = preview.indexOf(
    'className="business-document-footer-grid"'
  );
  const notesIndex = preview.indexOf(
    'className="business-document-copy business-document-customer-notes"'
  );
  const agreementIndex = preview.indexOf(
    'className="business-document-agreement-preview"'
  );

  assert.ok(summaryIndex >= 0);
  assert.ok(notesIndex > summaryIndex);

  if (agreementIndex >= 0) {
    assert.ok(notesIndex < agreementIndex);
  }

  assert.match(
    preview,
    /\{quote\.notes \? <section[\s\S]*<h3>Notes<\/h3><p>\{quote\.notes\}<\/p>/
  );
});

test("customer PDF places Acceptance / Status before Notes with deliberate spacing", () => {
  const start = pdfSource.indexOf(
    "export function renderCustomerDocumentPdf("
  );
  const end = pdfSource.indexOf(
    "export function createCustomerDocumentPdfArtifact(",
    start
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const renderer = pdfSource.slice(start, end);

  const acceptanceIndex = renderer.indexOf(
    "section(copy.acceptance, readableStatus(model, copy));"
  );
  const spacingIndex = renderer.indexOf(
    "if (model.notes) y += 10;"
  );
  const notesIndex = renderer.indexOf(
    "section(copy.notes, model.notes);"
  );

  assert.ok(acceptanceIndex >= 0);
  assert.ok(spacingIndex > acceptanceIndex);
  assert.ok(notesIndex > spacingIndex);
});
